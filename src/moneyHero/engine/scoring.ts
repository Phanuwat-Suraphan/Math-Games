/**
 * ระบบคะแนน MONEY HERO
 *
 * ได้คะแนนจาก: ตอบถูก · ตอบต่อเนื่อง · ใช้เวลาน้อย · ผ่านภารกิจ · ไม่ใช้ตัวช่วย
 * ไม่หักคะแนนเมื่อตอบผิด (ห้ามลงโทษเด็กอย่างรุนแรง)
 */

export interface AnswerScoreInput {
  correct: boolean
  /** ตอบครั้งที่เท่าไรของข้อนี้ (1 = ครั้งแรก) */
  attempt: number
  /** จำนวนข้อที่ถูกติดกันก่อนข้อนี้ */
  streak: number
  ms: number
  hintsUsed: number
}

export interface AnswerScore {
  exp: number
  coins: number
  bonuses: string[]
}

export const FAST_MS = 20000

export function scoreAnswer(input: AnswerScoreInput): AnswerScore {
  if (!input.correct) return { exp: 0, coins: 0, bonuses: [] }
  const bonuses: string[] = []
  let exp = input.attempt === 1 ? 10 : input.attempt === 2 ? 5 : 2
  let coins = input.attempt === 1 ? 2 : 1

  if (input.streak >= 2) {
    const bonus = Math.min(input.streak, 5)
    exp += bonus
    bonuses.push(`ตอบถูกต่อเนื่อง +${bonus}`)
    if (input.streak >= 4) coins += 1
  }
  if (input.ms < FAST_MS && input.attempt === 1) {
    exp += 3
    bonuses.push('คิดไว +3')
  }
  if (input.hintsUsed === 0 && input.attempt === 1) {
    exp += 3
    bonuses.push('คิดเองไม่ใช้ตัวช่วย +3')
  }
  return { exp, coins, bonuses }
}

/** ดาวของด่าน คิดจากสัดส่วนข้อที่ถูกในครั้งแรก ผ่านด่านแล้วได้อย่างน้อย 1 ดาวเสมอ */
export function starsFor(accuracy: number): 1 | 2 | 3 {
  if (accuracy >= 0.9) return 3
  if (accuracy >= 0.7) return 2
  return 1
}

/** รางวัลเมื่อผ่านด่าน */
export function levelReward(stars: number, firstClear: boolean): { exp: number; coins: number } {
  const exp = 50 + stars * 20
  const coins = 10 + stars * 5
  return firstClear ? { exp, coins } : { exp: Math.round(exp / 2), coins: Math.round(coins / 2) }
}

/** บอสผ่านเมื่อตอบถูก (ภายใน 2 ครั้ง) อย่างน้อย 60% */
export const BOSS_PASS = 0.6

/** เลเวลของผู้เล่นจาก EXP ทุก 250 EXP ขึ้น 1 เลเวล */
export function playerLevel(exp: number): { level: number; into: number; need: number } {
  const step = 250
  return { level: Math.floor(exp / step) + 1, into: exp % step, need: step }
}
