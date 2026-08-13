import { SKILL_IDS } from '../data/skills'
import type {
  PlayerStatistics,
  SkillId,
  SkillStatistic,
} from '../types/stats'

export const MAX_STARS = 5

/** เกณฑ์ดาว เรียงจากสูงไปต่ำ ปรับได้จากที่นี่ */
export const STAR_THRESHOLDS: { minAccuracy: number; stars: number }[] = [
  { minAccuracy: 90, stars: 5 },
  { minAccuracy: 80, stars: 4 },
  { minAccuracy: 70, stars: 3 },
  { minAccuracy: 60, stars: 2 },
  { minAccuracy: 0, stars: 1 },
]

/** คำนวณร้อยละความแม่นยำ ป้องกันการหารด้วยศูนย์ */
export function calculateAccuracy(correct: number, total: number): number {
  if (total <= 0) return 0
  const safeCorrect = Math.max(0, Math.min(correct, total))
  return Math.round((safeCorrect / total) * 1000) / 10
}

export function createEmptySkillStatistic(): SkillStatistic {
  return { attempts: 0, correct: 0, accuracy: 0 }
}

export function createEmptyStatistics(): PlayerStatistics {
  const statistics = {} as PlayerStatistics
  for (const id of SKILL_IDS) {
    statistics[id] = createEmptySkillStatistic()
  }
  return statistics
}

/**
 * บันทึกผลการตอบหนึ่งข้อลงในทักษะที่เกี่ยวข้อง
 * สะสมต่อจากค่าเดิมเสมอ ไม่เขียนทับข้อมูลเก่า
 */
export function recordSkillAttempt(
  statistics: PlayerStatistics,
  skill: SkillId,
  isCorrect: boolean,
  timestamp: string,
): PlayerStatistics {
  const previous = statistics[skill] ?? createEmptySkillStatistic()
  const attempts = previous.attempts + 1
  const correct = previous.correct + (isCorrect ? 1 : 0)

  return {
    ...statistics,
    [skill]: {
      attempts,
      correct,
      accuracy: calculateAccuracy(correct, attempts),
      lastPlayedAt: timestamp,
    },
  }
}

/** จำนวนดาวจากความแม่นยำ คืน null เมื่อยังไม่เคยฝึกทักษะนั้น */
export function getStarRating(statistic: SkillStatistic): number | null {
  if (statistic.attempts <= 0) return null

  for (const threshold of STAR_THRESHOLDS) {
    if (statistic.accuracy >= threshold.minAccuracy) return threshold.stars
  }

  return 1
}

export interface OverallAccuracy {
  totalQuestions: number
  correctAnswers: number
  accuracy: number
  hasData: boolean
}

export function getOverallAccuracy(
  totalQuestions: number,
  correctAnswers: number,
): OverallAccuracy {
  return {
    totalQuestions,
    correctAnswers,
    accuracy: calculateAccuracy(correctAnswers, totalQuestions),
    hasData: totalQuestions > 0,
  }
}

/** ทักษะที่ควรชวนไปฝึกต่อ = ทักษะที่เคยฝึกแล้วและมีความแม่นยำต่ำที่สุด */
export function getSkillToPractice(
  statistics: PlayerStatistics,
): SkillId | null {
  let target: SkillId | null = null
  let lowest = Number.POSITIVE_INFINITY

  for (const id of SKILL_IDS) {
    const statistic = statistics[id]
    if (!statistic || statistic.attempts < 3) continue
    if (statistic.accuracy < lowest) {
      lowest = statistic.accuracy
      target = id
    }
  }

  return target
}
