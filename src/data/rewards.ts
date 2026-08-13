/**
 * ศูนย์รวมค่าคงที่ของระบบรางวัลทั้งหมด
 * ปรับสมดุลเกมได้จากไฟล์นี้ไฟล์เดียว ห้ามใส่ตัวเลขเหล่านี้ลงใน component
 */

/** รางวัลต่อการตอบถูกหนึ่งข้อ */
export const ANSWER_REWARD = {
  exp: 10,
  coins: 5,
} as const

/** ค่าความเสียหายและการฟื้นฟูพลังชีวิต */
export const HP_CONFIG = {
  /** ตอบผิดเสียพลังชีวิตเล็กน้อย ไม่ให้เด็กรู้สึกถูกลงโทษหนัก */
  wrongAnswerDamage: 5,
  /** ฟื้นพลังชีวิตเมื่อเล่นจบด่าน */
  questCompleteHeal: 10,
  defaultMaxHp: 100,
} as const

export interface StreakReward {
  streak: number
  coins: number
  message: string
}

/**
 * โบนัสเมื่อตอบถูกติดต่อกัน
 * ให้ทุกครั้งที่ streak เป็นจำนวนเท่าของเกณฑ์สูงสุดที่ทำได้ เช่น เกณฑ์ 10 จะได้อีกครั้งที่ streak 20
 */
export const STREAK_REWARDS: StreakReward[] = [
  { streak: 3, coins: 2, message: 'ต่อเนื่อง 3 ข้อ! เก่งมาก' },
  { streak: 5, coins: 5, message: 'ต่อเนื่อง 5 ข้อ! สุดยอด' },
  { streak: 10, coins: 10, message: 'ต่อเนื่อง 10 ข้อ! ไฟลุกเลย' },
]

/**
 * ตัวคูณรางวัลเมื่อเล่นด่านที่เคยผ่านแล้วซ้ำ
 * ป้องกันการเก็บรางวัลไม่จำกัดจากด่านเดิม แต่ยังให้เด็กกลับมาฝึกซ้ำได้
 * ตัวอย่าง: ด่านที่ให้ 50 EXP / 20 เหรียญ เมื่อเล่นซ้ำจะเหลือ 10 EXP / 4 เหรียญ
 */
export const REPLAY_REWARD_MULTIPLIER = 0.2

/** จำนวนประวัติการตอบล่าสุดที่เก็บไว้ในข้อมูลผู้เล่น */
export const MAX_RECENT_ATTEMPTS = 50

export function applyReplayMultiplier(amount: number, isReplay: boolean): number {
  if (!isReplay) return Math.max(0, Math.floor(amount))
  return Math.max(0, Math.floor(amount * REPLAY_REWARD_MULTIPLIER))
}

/**
 * หาโบนัส streak ที่ควรได้ ณ ค่า streak ปัจจุบัน
 * คืน null เมื่อยังไม่ถึงเกณฑ์ใด ๆ
 */
export function getStreakReward(streak: number): StreakReward | null {
  if (streak <= 0) return null

  // เรียงจากเกณฑ์สูงไปต่ำ เพื่อให้ streak 10 ได้โบนัสก้อนใหญ่แทนก้อนเล็ก
  const sorted = [...STREAK_REWARDS].sort((a, b) => b.streak - a.streak)

  for (const reward of sorted) {
    if (streak === reward.streak) return reward
  }

  // เลยเกณฑ์สูงสุดแล้ว ให้โบนัสซ้ำทุก ๆ ช่วงของเกณฑ์สูงสุด
  const highest = sorted[0]
  if (highest && streak > highest.streak && streak % highest.streak === 0) {
    return { ...highest, message: `ต่อเนื่อง ${streak} ข้อ! ไฟลุกเลย` }
  }

  return null
}
