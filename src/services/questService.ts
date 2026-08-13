import {
  DAILY_QUESTS,
  DAILY_QUEST_COUNT,
  QUESTS,
  getQuest,
} from '../data/quests'
import type { Player } from '../types/player'
import type {
  Quest,
  QuestProgress,
  QuestRequirement,
  QuestView,
} from '../types/quest'
import type { SkillId } from '../types/stats'
import { getTotalStars } from '../utils/stageSystem'
import { calculateAccuracy } from '../utils/statistics'
import { addExp } from '../utils/experience'
import { addCoins } from './rewardService'

/**
 * ระบบภารกิจ ทุกฟังก์ชันเป็น pure function เช่นเดียวกับ rewardService
 * รางวัลทั้งหมดจ่ายผ่าน rewardService และ experience ของ Part 2 ไม่สร้างระบบซ้ำ
 */

/** เงื่อนไขที่นับจากเหตุการณ์ระหว่างเล่น ต้องใช้ตัวนับของภารกิจ */
const COUNTER_BASED: ReadonlySet<QuestRequirement['type']> = new Set([
  'answerCorrect',
  'answerSkill',
  'bestStreak',
])

export function createQuestProgress(quest: Quest): QuestProgress {
  return {
    questId: quest.id,
    counters: quest.requirements.map(() => 0),
    completed: false,
    claimed: false,
  }
}

export function getQuestProgress(player: Player, quest: Quest): QuestProgress {
  const existing = player.questProgress[quest.id]
  if (!existing) return createQuestProgress(quest)

  // เผื่อกรณีจำนวนเงื่อนไขของภารกิจถูกแก้ไขภายหลัง
  if (existing.counters.length !== quest.requirements.length) {
    const counters = quest.requirements.map(
      (_, index) => existing.counters[index] ?? 0,
    )
    return { ...existing, counters }
  }

  return existing
}

/** วัดค่าที่ผู้เล่นทำได้ของเงื่อนไขหนึ่งข้อ */
export function measureRequirement(
  player: Player,
  progress: QuestProgress,
  requirement: QuestRequirement,
  index: number,
): number {
  switch (requirement.type) {
    case 'answerCorrect':
    case 'answerSkill':
    case 'bestStreak':
      return Math.max(0, progress.counters[index] ?? 0)

    case 'accuracy':
      return calculateAccuracy(player.correctAnswers, player.totalQuestions)

    case 'collectCoins':
      return player.coins

    case 'earnStars':
      return getTotalStars(player)

    case 'completeStage': {
      if (!requirement.stageId) return 0
      const stage = player.stageProgress[requirement.stageId]
      return stage?.completed ? 1 : 0
    }

    default:
      return 0
  }
}

function isRequirementMet(
  player: Player,
  progress: QuestProgress,
  requirement: QuestRequirement,
  index: number,
): boolean {
  return (
    measureRequirement(player, progress, requirement, index) >=
    requirement.target
  )
}

export function isQuestComplete(
  player: Player,
  quest: Quest,
  progress: QuestProgress,
): boolean {
  return quest.requirements.every((requirement, index) =>
    isRequirementMet(player, progress, requirement, index),
  )
}

/** สร้างข้อมูลภารกิจพร้อมความคืบหน้าสำหรับแสดงผล */
export function buildQuestView(player: Player, quest: Quest): QuestView {
  const progress = getQuestProgress(player, quest)
  const measured = quest.requirements.map((requirement, index) =>
    measureRequirement(player, progress, requirement, index),
  )

  const ratios = quest.requirements.map((requirement, index) => {
    const target = Math.max(1, requirement.target)
    return Math.min(1, (measured[index] ?? 0) / target)
  })
  const percent =
    ratios.length === 0
      ? 0
      : Math.round(
          (ratios.reduce((sum, ratio) => sum + ratio, 0) / ratios.length) * 100,
        )

  const isCompleted = progress.completed || isQuestComplete(player, quest, progress)

  return {
    quest,
    progress,
    measured,
    percent,
    isCompleted,
    isClaimed: progress.claimed,
    canClaim: isCompleted && !progress.claimed,
  }
}

/** ภารกิจที่ยังต้องติดตามความคืบหน้า (ยังไม่รับรางวัล) */
function getTrackedQuests(player: Player): Quest[] {
  const dailyIds = new Set(player.dailyQuests.questIds)
  const daily = DAILY_QUESTS.filter((quest) => dailyIds.has(quest.id))

  return [...QUESTS, ...daily].filter(
    (quest) => !player.questProgress[quest.id]?.claimed,
  )
}

export interface AnswerQuestInput {
  skill: SkillId
  isCorrect: boolean
  currentStreak: number
}

export interface QuestAdvanceResult {
  player: Player
  /** ภารกิจที่เพิ่งครบเงื่อนไขจากการกระทำครั้งนี้ */
  newlyCompleted: Quest[]
}

function commitProgress(
  player: Player,
  updates: Record<string, QuestProgress>,
  completedAt: string,
): QuestAdvanceResult {
  const newlyCompleted: Quest[] = []
  const nextProgress = { ...player.questProgress }

  for (const [questId, progress] of Object.entries(updates)) {
    const quest = getQuest(questId)
    if (!quest) continue

    const wasCompleted = player.questProgress[questId]?.completed ?? false
    const nowCompleted = isQuestComplete(player, quest, progress)

    nextProgress[questId] = {
      ...progress,
      completed: nowCompleted,
      completedAt: nowCompleted ? (progress.completedAt ?? completedAt) : undefined,
    }

    if (nowCompleted && !wasCompleted) newlyCompleted.push(quest)
  }

  return {
    player: { ...player, questProgress: nextProgress },
    newlyCompleted,
  }
}

/** อัปเดตตัวนับของภารกิจหลังผู้เล่นตอบคำถามหนึ่งข้อ */
export function advanceQuestsOnAnswer(
  player: Player,
  input: AnswerQuestInput,
  now = new Date().toISOString(),
): QuestAdvanceResult {
  const updates: Record<string, QuestProgress> = {}

  for (const quest of getTrackedQuests(player)) {
    const progress = getQuestProgress(player, quest)
    const counters = [...progress.counters]
    let changed = false

    quest.requirements.forEach((requirement, index) => {
      if (!COUNTER_BASED.has(requirement.type)) return

      if (requirement.type === 'bestStreak') {
        const best = Math.max(counters[index] ?? 0, input.currentStreak)
        if (best !== counters[index]) {
          counters[index] = best
          changed = true
        }
        return
      }

      if (!input.isCorrect) return

      if (
        requirement.type === 'answerSkill' &&
        requirement.skill !== input.skill
      ) {
        return
      }

      counters[index] = (counters[index] ?? 0) + 1
      changed = true
    })

    if (changed) updates[quest.id] = { ...progress, counters }
  }

  return commitProgress(player, updates, now)
}

/**
 * ตรวจภารกิจใหม่หลังเหตุการณ์ที่ไม่ใช่การตอบคำถาม เช่น ผ่านด่าน หรือได้เหรียญ
 * ไม่แตะตัวนับ แต่คำนวณสถานะสำเร็จใหม่จากสถานะผู้เล่นปัจจุบัน
 */
export function refreshQuestCompletion(
  player: Player,
  now = new Date().toISOString(),
): QuestAdvanceResult {
  const updates: Record<string, QuestProgress> = {}

  for (const quest of getTrackedQuests(player)) {
    updates[quest.id] = getQuestProgress(player, quest)
  }

  return commitProgress(player, updates, now)
}

export interface ClaimResult {
  player: Player
  claimed: boolean
  exp: number
  coins: number
  levelsGained: number
  newLevel: number
  reason?: string
}

/**
 * รับรางวัลภารกิจ
 * ป้องกันการรับซ้ำโดยตรวจธง claimed ก่อนจ่ายรางวัลเสมอ
 */
export function claimQuestReward(
  player: Player,
  questId: string,
  now = new Date().toISOString(),
): ClaimResult {
  const quest = getQuest(questId)
  if (!quest) {
    return {
      player,
      claimed: false,
      exp: 0,
      coins: 0,
      levelsGained: 0,
      newLevel: player.level,
      reason: 'ไม่พบภารกิจนี้',
    }
  }

  const progress = getQuestProgress(player, quest)

  if (progress.claimed) {
    return {
      player,
      claimed: false,
      exp: 0,
      coins: 0,
      levelsGained: 0,
      newLevel: player.level,
      reason: 'รับรางวัลภารกิจนี้ไปแล้ว',
    }
  }

  if (!isQuestComplete(player, quest, progress)) {
    return {
      player,
      claimed: false,
      exp: 0,
      coins: 0,
      levelsGained: 0,
      newLevel: player.level,
      reason: 'ยังทำภารกิจนี้ไม่ครบ',
    }
  }

  const withCoins = addCoins(player, quest.reward.coins)
  const expResult = addExp(withCoins, quest.reward.exp)

  const nextPlayer: Player = {
    ...expResult.player,
    questProgress: {
      ...expResult.player.questProgress,
      [quest.id]: {
        ...progress,
        completed: true,
        completedAt: progress.completedAt ?? now,
        claimed: true,
        claimedAt: now,
      },
    },
  }

  return {
    player: nextPlayer,
    claimed: true,
    exp: quest.reward.exp,
    coins: quest.reward.coins,
    levelsGained: expResult.levelsGained,
    newLevel: expResult.newLevel,
  }
}

/** วันที่ปัจจุบันในรูปแบบ YYYY-MM-DD ตามเวลาเครื่องผู้เล่น */
export function getTodayKey(date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/** สุ่มแบบคงที่ตามวันที่ เพื่อให้ภารกิจของวันนั้นไม่เปลี่ยนเมื่อรีเฟรชหน้า */
function hashDate(dateKey: string): number {
  let hash = 0
  for (let index = 0; index < dateKey.length; index += 1) {
    hash = (hash * 31 + dateKey.charCodeAt(index)) % 100_000
  }
  return hash
}

export function pickDailyQuestIds(dateKey: string): string[] {
  if (DAILY_QUESTS.length === 0) return []

  const count = Math.min(DAILY_QUEST_COUNT, DAILY_QUESTS.length)
  const start = hashDate(dateKey) % DAILY_QUESTS.length
  const picked: string[] = []

  for (let offset = 0; offset < count; offset += 1) {
    const quest = DAILY_QUESTS[(start + offset) % DAILY_QUESTS.length]
    if (quest) picked.push(quest.id)
  }

  return picked
}

export interface DailyRefreshResult {
  player: Player
  didReset: boolean
}

/**
 * ตรวจว่าขึ้นวันใหม่หรือยัง ถ้าใช่ให้แจกภารกิจประจำวันชุดใหม่และล้างความคืบหน้าเดิม
 * เรียกตอนโหลดเกมและก่อนแสดง Quest Log
 */
export function ensureDailyQuests(
  player: Player,
  today = getTodayKey(),
): DailyRefreshResult {
  if (player.dailyQuests.date === today) {
    return { player, didReset: false }
  }

  const questIds = pickDailyQuestIds(today)
  const nextProgress = { ...player.questProgress }

  // ล้างความคืบหน้าของภารกิจประจำวันทุกตัว แล้วเริ่มนับใหม่
  for (const quest of DAILY_QUESTS) {
    delete nextProgress[quest.id]
  }
  for (const questId of questIds) {
    const quest = DAILY_QUESTS.find((item) => item.id === questId)
    if (quest) nextProgress[quest.id] = createQuestProgress(quest)
  }

  return {
    player: {
      ...player,
      questProgress: nextProgress,
      dailyQuests: { date: today, questIds },
    },
    didReset: true,
  }
}

export interface QuestLogSections {
  main: QuestView[]
  side: QuestView[]
  daily: QuestView[]
  claimableCount: number
}

export function buildQuestLog(player: Player): QuestLogSections {
  const dailyIds = new Set(player.dailyQuests.questIds)

  const views = [
    ...QUESTS,
    ...DAILY_QUESTS.filter((quest) => dailyIds.has(quest.id)),
  ].map((quest) => buildQuestView(player, quest))

  return {
    main: views.filter((view) => view.quest.category === 'main'),
    side: views.filter((view) => view.quest.category === 'side'),
    daily: views.filter((view) => view.quest.category === 'daily'),
    claimableCount: views.filter((view) => view.canClaim).length,
  }
}
