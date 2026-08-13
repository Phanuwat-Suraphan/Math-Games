import {
  ANSWER_REWARD,
  HP_CONFIG,
  MAX_RECENT_ATTEMPTS,
  applyReplayMultiplier,
  getStreakReward,
  type StreakReward,
} from '../data/rewards'
import { getNextStage, getStagesByWorld } from '../data/stages'
import { getWorld } from '../data/worlds'
import type { Player } from '../types/player'
import type { Stage, StageProgress, StageResult } from '../types/stage'
import type { QuestionAttempt, SkillId } from '../types/stats'
import { addExp } from '../utils/experience'
import {
  createEmptyStageProgress,
  getStageProgress,
  resolveUnlockedWorlds,
  summarizeAttempt,
} from '../utils/stageSystem'
import { recordSkillAttempt } from '../utils/statistics'

/**
 * ฟังก์ชันทั้งหมดในไฟล์นี้เป็น pure function
 * รับ Player เข้ามาแล้วคืน Player ชุดใหม่เสมอ ไม่แก้ไขข้อมูลเดิมและไม่แตะ localStorage
 * ทำให้ทดสอบได้ง่ายและใช้ซ้ำได้ในทุก Part
 */

const MAX_COINS = 9_999_999

export function getCoins(player: Player): number {
  return player.coins
}

/** เพิ่มเหรียญ ป้องกันค่าติดลบและค่าเกินขอบเขต */
export function addCoins(player: Player, amount: number): Player {
  const safeAmount = Math.max(0, Math.floor(amount))
  if (safeAmount === 0) return player

  return { ...player, coins: Math.min(MAX_COINS, player.coins + safeAmount) }
}

/** หักเหรียญ เหรียญจะไม่ติดลบเด็ดขาด */
export function removeCoins(player: Player, amount: number): Player {
  const safeAmount = Math.max(0, Math.floor(amount))
  if (safeAmount === 0) return player

  return { ...player, coins: Math.max(0, player.coins - safeAmount) }
}

/** เช็คว่าเหรียญพอหรือไม่ เตรียมไว้ให้ระบบร้านค้าใน Part ถัดไป */
export function canAfford(player: Player, price: number): boolean {
  return player.coins >= Math.max(0, Math.floor(price))
}

/** ลดพลังชีวิต ไม่ต่ำกว่า 0 */
export function damagePlayer(player: Player, amount: number): Player {
  const safeAmount = Math.max(0, Math.floor(amount))
  if (safeAmount === 0) return player

  return { ...player, hp: Math.max(0, player.hp - safeAmount) }
}

/** ฟื้นพลังชีวิต ไม่เกินค่าสูงสุด */
export function healPlayer(player: Player, amount: number): Player {
  const safeAmount = Math.max(0, Math.floor(amount))
  if (safeAmount === 0) return player

  return { ...player, hp: Math.min(player.maxHp, player.hp + safeAmount) }
}

function pushRecentAttempt(
  player: Player,
  attempt: QuestionAttempt,
): QuestionAttempt[] {
  const next = [...player.recentAttempts, attempt]
  return next.length > MAX_RECENT_ATTEMPTS
    ? next.slice(next.length - MAX_RECENT_ATTEMPTS)
    : next
}

export interface AnswerInput {
  questionId: string
  stageId: string
  skill: SkillId
  isCorrect: boolean
  timeMs: number
  /** เล่นด่านที่เคยผ่านแล้วซ้ำ รางวัลจะถูกลดลงตาม configuration */
  isReplay: boolean
  answeredAt?: string
}

export interface AnswerOutcome {
  player: Player
  gainedExp: number
  gainedCoins: number
  streakBonus: StreakReward | null
  levelsGained: number
  newLevel: number
  hpDelta: number
  currentStreak: number
  bestStreak: number
  isNewBestStreak: boolean
}

/**
 * บันทึกผลการตอบหนึ่งข้อ และให้รางวัลตามผลลัพธ์
 * ครอบคลุม: สถิติรวม สถิติรายทักษะ ประวัติการตอบ streak EXP เหรียญ และพลังชีวิต
 */
export function recordAnswer(player: Player, input: AnswerInput): AnswerOutcome {
  const answeredAt = input.answeredAt ?? new Date().toISOString()
  const timeMs = Math.max(0, Math.round(input.timeMs))

  let next: Player = {
    ...player,
    totalQuestions: player.totalQuestions + 1,
    correctAnswers: player.correctAnswers + (input.isCorrect ? 1 : 0),
    wrongAnswers: player.wrongAnswers + (input.isCorrect ? 0 : 1),
    statistics: recordSkillAttempt(
      player.statistics,
      input.skill,
      input.isCorrect,
      answeredAt,
    ),
    recentAttempts: pushRecentAttempt(player, {
      questionId: input.questionId,
      skill: input.skill,
      stageId: input.stageId,
      isCorrect: input.isCorrect,
      timeMs,
      answeredAt,
    }),
  }

  if (!input.isCorrect) {
    const before = next.hp
    next = damagePlayer(next, HP_CONFIG.wrongAnswerDamage)

    return {
      player: { ...next, currentStreak: 0 },
      gainedExp: 0,
      gainedCoins: 0,
      streakBonus: null,
      levelsGained: 0,
      newLevel: next.level,
      hpDelta: next.hp - before,
      currentStreak: 0,
      bestStreak: next.bestStreak,
      isNewBestStreak: false,
    }
  }

  const currentStreak = player.currentStreak + 1
  const isNewBestStreak = currentStreak > player.bestStreak
  const bestStreak = Math.max(player.bestStreak, currentStreak)

  const gainedExp = applyReplayMultiplier(ANSWER_REWARD.exp, input.isReplay)
  const streakBonus = getStreakReward(currentStreak)
  const streakCoins = streakBonus
    ? applyReplayMultiplier(streakBonus.coins, input.isReplay)
    : 0
  const gainedCoins =
    applyReplayMultiplier(ANSWER_REWARD.coins, input.isReplay) + streakCoins

  next = { ...next, currentStreak, bestStreak }
  next = addCoins(next, gainedCoins)

  const expResult = addExp(next, gainedExp)

  return {
    player: expResult.player,
    gainedExp,
    gainedCoins,
    streakBonus: streakCoins > 0 ? streakBonus : null,
    levelsGained: expResult.levelsGained,
    newLevel: expResult.newLevel,
    hpDelta: 0,
    currentStreak,
    bestStreak,
    isNewBestStreak,
  }
}

export interface StageInput {
  stage: Stage
  correctAnswers: number
  totalQuestions: number
  /** EXP และเหรียญที่ได้รับระหว่างตอบคำถาม ใช้แสดงในหน้าผลลัพธ์ให้ตรงกับที่ได้จริง */
  expFromAnswers: number
  coinsFromAnswers: number
  completedAt?: string
}

export interface StageOutcome {
  player: Player
  result: StageResult
  levelsGained: number
  newLevel: number
  healedHp: number
}

/**
 * ปิดจบด่าน
 * ครอบคลุม: ตรวจเกณฑ์ผ่าน คำนวณดาว บันทึกสถิติที่ดีที่สุด ให้โบนัส ฟื้นพลังชีวิต
 * ปลดล็อกด่านถัดไป และตรวจว่าพิชิตโลกครบจนปลดล็อกโลกใหม่หรือยัง
 *
 * ด่านที่เคยผ่านแล้วจะได้รางวัลตาม replayReward ไม่ใช่รางวัลเต็ม
 */
export function completeStage(player: Player, input: StageInput): StageOutcome {
  const { stage } = input
  const completedAt = input.completedAt ?? new Date().toISOString()

  const previous = getStageProgress(player, stage.id)
  const wasCompleted = previous.completed
  const isFirstClear = !wasCompleted

  const attempt = summarizeAttempt(
    stage,
    input.correctAnswers,
    input.totalQuestions,
  )

  // ให้รางวัลเต็มเฉพาะครั้งแรกที่ผ่านเกณฑ์ ครั้งต่อ ๆ ไปใช้รางวัลเล่นซ้ำ
  const reward =
    attempt.isPassed && isFirstClear ? stage.firstClearReward : stage.replayReward
  // ถ้ายังไม่ผ่านเกณฑ์ ก็ยังได้รางวัลปลอบใจเล็กน้อย เด็กจะได้ไม่รู้สึกว่าเสียเวลาเปล่า
  const bonusExp = attempt.isPassed ? reward.exp : Math.floor(reward.exp * 0.25)
  const bonusCoins = attempt.isPassed
    ? reward.coins
    : Math.floor(reward.coins * 0.25)

  const hpBefore = player.hp
  let next = healPlayer(player, HP_CONFIG.questCompleteHeal)
  next = addCoins(next, bonusCoins)

  const stars = Math.max(previous.stars, attempt.stars)
  const bestScore = Math.max(previous.bestScore, input.correctAnswers)
  const bestAccuracy = Math.max(previous.bestAccuracy, attempt.accuracy)
  const isNewBest =
    attempt.accuracy > previous.bestAccuracy || attempt.stars > previous.stars

  const nextProgress: StageProgress = {
    ...createEmptyStageProgress(stage.id),
    attempts: previous.attempts + 1,
    bestScore,
    bestAccuracy,
    stars,
    completed: wasCompleted || attempt.isPassed,
    mastered: stars >= 3,
    firstCompletedAt:
      previous.firstCompletedAt ?? (attempt.isPassed ? completedAt : undefined),
    lastPlayedAt: completedAt,
  }

  next = {
    ...next,
    completedStages:
      nextProgress.completed && !next.completedStages.includes(stage.id)
        ? [...next.completedStages, stage.id]
        : next.completedStages,
    stageProgress: { ...next.stageProgress, [stage.id]: nextProgress },
  }

  // ตรวจการปลดล็อกหลังบันทึกความคืบหน้าแล้ว
  const nextStage = getNextStage(stage)
  const unlockedStageId =
    attempt.isPassed && isFirstClear && nextStage ? nextStage.id : undefined

  const worldStages = getStagesByWorld(stage.worldId)
  const isWorldComplete =
    worldStages.length > 0 &&
    worldStages.every((item) => getStageProgress(next, item.id).completed)

  const unlockedWorlds = resolveUnlockedWorlds(next)
  const newWorldId = unlockedWorlds.find(
    (worldId) => !player.unlockedWorlds.includes(worldId),
  )
  next = { ...next, unlockedWorlds }

  const expResult = addExp(next, bonusExp)
  const healedHp = expResult.player.hp - hpBefore

  return {
    player: expResult.player,
    result: {
      worldId: stage.worldId,
      stageId: stage.id,
      totalQuestions: input.totalQuestions,
      correctAnswers: input.correctAnswers,
      accuracy: attempt.accuracy,
      expFromAnswers: input.expFromAnswers,
      coinsFromAnswers: input.coinsFromAnswers,
      bonusExp,
      bonusCoins,
      isFirstClear: isFirstClear && attempt.isPassed,
      isPassed: attempt.isPassed,
      stars: attempt.stars,
      previousStars: previous.stars,
      isNewBest,
      isMastered: nextProgress.mastered,
      hpHealed: healedHp,
      unlockedStageId,
      unlockedWorldId: newWorldId && getWorld(newWorldId) ? newWorldId : undefined,
      isWorldComplete,
      completedQuestIds: [],
    },
    levelsGained: expResult.levelsGained,
    newLevel: expResult.newLevel,
    healedHp,
  }
}

/** ด่านนี้เคยผ่านแล้วหรือยัง ใช้ตัดสินอัตรารางวัลตั้งแต่ข้อแรก */
export function isReplayOf(player: Player, stageId: string): boolean {
  return getStageProgress(player, stageId).completed
}
