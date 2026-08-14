import { createRng } from '../math/rng'
import { calculateStageStars } from '../utils/stageSystem'
import { calculateAccuracy } from '../utils/statistics'
import { DIFFICULTY_BONUS, difficultyRank, shiftDifficulty } from './difficulty/config'
import { checkAnswer, generateUniqueQuestions } from './index'
import type {
  Difficulty,
  Grade,
  Question,
  QuestionResult,
  QuestionSession,
  QuestionType,
  SessionSummary,
} from './types'

/**
 * ชุดโจทย์ของด่านหนึ่งครั้ง
 *
 * ทุกฟังก์ชันเป็น pure function คืนสถานะชุดใหม่เสมอ
 * เหมือน rewardService ของ Part 2 จึงทดสอบได้โดยไม่ต้องมี React
 */

export interface SessionConfig {
  stageId: string
  questionTypes: QuestionType[]
  grade: Grade
  difficulty: Difficulty
  questionCount: number
  /** เปิดให้ความยากขยับตามผลการตอบระหว่างเล่น */
  adaptive?: boolean
  seed?: string
}

/**
 * กระจายชนิดโจทย์ให้สมดุล
 *
 * ถ้าสุ่มชนิดโจทย์อิสระทุกข้อ ด่านที่มี 4 ชนิดอาจออกมาเป็นการคูณ 10 ข้อรวด
 * ซึ่งไม่ตรงกับที่ด่านตั้งใจจะฝึก จึงต้องแบ่งโควตาก่อนแล้วค่อยสลับลำดับ
 */
export function distributeTypes(
  types: readonly QuestionType[],
  count: number,
): QuestionType[] {
  if (types.length === 0) return []

  const result: QuestionType[] = []
  const base = Math.floor(count / types.length)
  const remainder = count % types.length

  types.forEach((type, index) => {
    const quota = base + (index < remainder ? 1 : 0)
    for (let i = 0; i < quota; i += 1) result.push(type)
  })

  return result.slice(0, count)
}

export function createSession(config: SessionConfig): QuestionSession {
  const count = Math.max(1, Math.floor(config.questionCount))
  const plan = distributeTypes(config.questionTypes, count)

  // สลับลำดับชนิดโจทย์ เด็กจะได้ไม่เจอการบวกติดกันทั้งหมดแล้วค่อยเป็นการลบ
  const shuffled = shuffleWithSeed(plan, config.seed)

  const questions = generateUniqueQuestions(count, (index) => ({
    type: shuffled[index] ?? (config.questionTypes[0] as QuestionType),
    grade: config.grade,
    difficulty: config.difficulty,
    seed: config.seed,
  }))

  return {
    sessionId: `session-${config.stageId}-${Date.now().toString(36)}`,
    stageId: config.stageId,
    questions,
    currentIndex: 0,
    results: [],
    startedAt: new Date().toISOString(),
  }
}

function shuffleWithSeed<T>(items: T[], seed?: string): T[] {
  return createRng(seed).shuffle(items)
}

export function currentQuestion(session: QuestionSession): Question | null {
  return session.questions[session.currentIndex] ?? null
}

export function isSessionComplete(session: QuestionSession): boolean {
  return session.currentIndex >= session.questions.length
}

export interface AnswerInput {
  selectedAnswer: string
  timeSpent: number
  usedHint?: boolean
  answeredAt?: string
}

export interface AnswerOutcome {
  session: QuestionSession
  result: QuestionResult
  correct: boolean
}

/** บันทึกคำตอบหนึ่งข้อแล้วเลื่อนไปข้อถัดไป */
export function answerCurrent(
  session: QuestionSession,
  input: AnswerInput,
): AnswerOutcome | null {
  const question = currentQuestion(session)
  if (!question) return null

  const correct = checkAnswer(question, input.selectedAnswer)

  const result: QuestionResult = {
    questionId: question.id,
    correct,
    selectedAnswer: input.selectedAnswer,
    correctAnswer: question.correctAnswer,
    timeSpent: Math.max(0, Math.round(input.timeSpent)),
    skill: question.skill,
    type: question.type,
    difficulty: question.difficulty,
    usedHint: input.usedHint === true,
    timestamp: input.answeredAt ?? new Date().toISOString(),
  }

  const nextIndex = session.currentIndex + 1
  const results = [...session.results, result]

  return {
    correct,
    result,
    session: {
      ...session,
      currentIndex: nextIndex,
      results,
      completedAt:
        nextIndex >= session.questions.length ? result.timestamp : session.completedAt,
    },
  }
}

/** จำนวนตอบถูกติดต่อกันสูงสุดในชุดนี้ */
export function bestStreakOf(results: readonly QuestionResult[]): number {
  let best = 0
  let current = 0
  for (const result of results) {
    current = result.correct ? current + 1 : 0
    if (current > best) best = current
  }
  return best
}

/**
 * คะแนนรวมของชุด
 *
 * ความถูกต้องมีน้ำหนักมากที่สุดโดยตั้งใจ ส่วนโบนัสความเร็วให้แค่เล็กน้อย
 * เพราะไม่ต้องการให้เด็กที่คิดช้าแต่คิดถูกรู้สึกว่าตัวเองเสียเปรียบ
 */
export const SCORE_CONFIG = {
  perCorrect: 100,
  difficultyBonus: DIFFICULTY_BONUS,
  streakBonusPerStep: 10,
  /** โบนัสความเร็วสูงสุดต่อข้อ คิดเป็นแค่ 10% ของคะแนนตอบถูก */
  maxSpeedBonus: 10,
  /** ตอบเร็วกว่านี้ถือว่าเร็วสุด หน่วยมิลลิวินาที */
  fastThresholdMs: 5000,
  /** ช้ากว่านี้ไม่ได้โบนัสความเร็ว แต่ไม่ถูกหักคะแนน */
  slowThresholdMs: 30000,
} as const

export function calculateScore(results: readonly QuestionResult[]): number {
  let score = 0
  let streak = 0

  for (const result of results) {
    if (!result.correct) {
      streak = 0
      continue
    }

    streak += 1
    score += SCORE_CONFIG.perCorrect
    score += SCORE_CONFIG.difficultyBonus[result.difficulty]
    score += Math.min(5, streak - 1) * SCORE_CONFIG.streakBonusPerStep

    // โบนัสความเร็วลดหลั่นจากเร็วสุดไปช้าสุด ไม่มีการหักคะแนนเมื่อช้า
    const span = SCORE_CONFIG.slowThresholdMs - SCORE_CONFIG.fastThresholdMs
    const over = Math.max(0, result.timeSpent - SCORE_CONFIG.fastThresholdMs)
    const ratio = Math.max(0, 1 - over / span)
    score += Math.round(SCORE_CONFIG.maxSpeedBonus * ratio)
  }

  return score
}

export function summarizeSession(session: QuestionSession): SessionSummary {
  const results = session.results
  const total = results.length
  const correct = results.filter((result) => result.correct).length
  const accuracy = calculateAccuracy(correct, total)

  const totalTime = results.reduce((sum, result) => sum + result.timeSpent, 0)

  return {
    total,
    correct,
    wrong: total - correct,
    accuracy,
    averageTimeMs: total === 0 ? 0 : Math.round(totalTime / total),
    bestStreak: bestStreakOf(results),
    hintsUsed: results.filter((result) => result.usedHint).length,
    score: calculateScore(results),
    stars: calculateStageStars(accuracy),
  }
}

/**
 * ปรับความยากระหว่างเล่น
 *
 * ตอบถูกติดกัน 3 ข้อ → ยากขึ้นหนึ่งขั้น
 * ตอบผิดติดกัน 3 ข้อ → ง่ายลงหนึ่งขั้น
 *
 * ขยับได้ทีละขั้นเท่านั้น เพื่อไม่ให้เด็กเจอโจทย์กระโดดจนตกใจ
 * และไม่ให้ง่ายลงเร็วจนรู้สึกว่าเกมดูถูก
 */
export const ADAPTIVE_CONFIG = {
  raiseAfterCorrect: 3,
  lowerAfterWrong: 3,
} as const

export function nextDifficulty(
  current: Difficulty,
  results: readonly QuestionResult[],
): Difficulty {
  const recent = results.slice(-Math.max(ADAPTIVE_CONFIG.raiseAfterCorrect, ADAPTIVE_CONFIG.lowerAfterWrong))
  if (recent.length === 0) return current

  const lastCorrect = results.slice(-ADAPTIVE_CONFIG.raiseAfterCorrect)
  if (
    lastCorrect.length === ADAPTIVE_CONFIG.raiseAfterCorrect &&
    lastCorrect.every((result) => result.correct)
  ) {
    return shiftDifficulty(current, 1)
  }

  const lastWrong = results.slice(-ADAPTIVE_CONFIG.lowerAfterWrong)
  if (
    lastWrong.length === ADAPTIVE_CONFIG.lowerAfterWrong &&
    lastWrong.every((result) => !result.correct)
  ) {
    return shiftDifficulty(current, -1)
  }

  return current
}

/** ความยากขยับไปกี่ขั้นจากจุดเริ่มต้น ใช้แสดงให้ครูดูว่าเด็กไปถึงระดับไหน */
export function difficultyDelta(from: Difficulty, to: Difficulty): number {
  return difficultyRank(to) - difficultyRank(from)
}
