import {
  ANSWER_REWARD,
  HP_CONFIG,
  MAX_RECENT_ATTEMPTS,
  applyReplayMultiplier,
  getStreakReward,
  type StreakReward,
} from '../data/rewards'
import type { Level, LevelResult } from '../types/level'
import type { Player } from '../types/player'
import type { QuestionAttempt, SkillId } from '../types/stats'
import { addExp } from '../utils/experience'
import { calculateAccuracy, recordSkillAttempt } from '../utils/statistics'

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
  levelId: string
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
      levelId: input.levelId,
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

export interface QuestInput {
  level: Level
  correctAnswers: number
  totalQuestions: number
  /** EXP และเหรียญที่ได้รับระหว่างตอบคำถาม ใช้แสดงในหน้ารางวัลให้ตรงกับที่ได้จริง */
  expFromAnswers: number
  coinsFromAnswers: number
  completedAt?: string
}

export interface QuestOutcome {
  player: Player
  result: LevelResult
  levelsGained: number
  newLevel: number
  healedHp: number
}

/**
 * ปิดจบด่าน: ให้โบนัส ฟื้นพลังชีวิต บันทึกสถิติด่าน และตรวจการเลื่อนเลเวล
 * ด่านที่เคยผ่านแล้วจะได้รางวัลตามอัตราการเล่นซ้ำ ไม่ใช่รางวัลเต็ม
 */
export function completeQuest(
  player: Player,
  input: QuestInput,
): QuestOutcome {
  const { level } = input
  const completedAt = input.completedAt ?? new Date().toISOString()
  const previousRecord = player.levelRecords[level.id]
  const isFirstClear = !previousRecord || previousRecord.completions === 0

  const bonusExp = applyReplayMultiplier(level.reward.exp, !isFirstClear)
  const bonusCoins = applyReplayMultiplier(level.reward.coins, !isFirstClear)
  const accuracy = calculateAccuracy(input.correctAnswers, input.totalQuestions)

  const hpBefore = player.hp
  let next = healPlayer(player, HP_CONFIG.questCompleteHeal)
  next = addCoins(next, bonusCoins)

  next = {
    ...next,
    completedLevels: next.completedLevels.includes(level.id)
      ? next.completedLevels
      : [...next.completedLevels, level.id],
    levelRecords: {
      ...next.levelRecords,
      [level.id]: {
        completions: (previousRecord?.completions ?? 0) + 1,
        bestCorrect: Math.max(
          previousRecord?.bestCorrect ?? 0,
          input.correctAnswers,
        ),
        bestAccuracy: Math.max(previousRecord?.bestAccuracy ?? 0, accuracy),
        lastPlayedAt: completedAt,
      },
    },
  }

  const expResult = addExp(next, bonusExp)

  return {
    player: expResult.player,
    result: {
      worldId: level.worldId,
      levelId: level.id,
      totalQuestions: input.totalQuestions,
      correctAnswers: input.correctAnswers,
      expFromAnswers: input.expFromAnswers,
      coinsFromAnswers: input.coinsFromAnswers,
      bonusExp,
      bonusCoins,
      isFirstClear,
      accuracy,
      hpHealed: expResult.player.hp - hpBefore,
    },
    levelsGained: expResult.levelsGained,
    newLevel: expResult.newLevel,
    healedHp: expResult.player.hp - hpBefore,
  }
}

/** ด่านนี้เคยผ่านแล้วหรือยัง ใช้ตัดสินอัตรารางวัลตั้งแต่ข้อแรก */
export function isReplayOf(player: Player, levelId: string): boolean {
  const record = player.levelRecords[levelId]
  return Boolean(record && record.completions > 0)
}
