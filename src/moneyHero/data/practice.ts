/**
 * ลานฝึกยิงลูกโป่ง (ขั้น PRACTICE)
 * หนึ่งข้อหลัก = ลูกโป่งหนึ่งลูก
 *   ถูกตั้งแต่ครั้งแรก → ลูกโป่งแตกได้ดาว ⭐ (นับเป็นคอมโบ และช่วยให้ได้ดาวตอนจบด่าน)
 *   ถูกครั้งที่ 2     → ลูกโป่งแตก 👍
 *   ผิดครบ 2 ครั้ง    → ลูกโป่งลอยหนีไป (ไม่ลงโทษ เดี๋ยวมีข้อแบบเดียวกันให้ฝึกอีก)
 * ข้อฝึกซ้ำที่เพิ่มต่อท้ายไม่เพิ่มลูกโป่ง
 */

export type Balloon = 'star' | 'pop' | 'away'

/** สีลูกโป่ง (สีตัว, สีเข้ม) วนตามลำดับ */
export const BALLOON_COLORS: readonly (readonly [string, string])[] = [
  ['#ff8fab', '#e64980'],
  ['#74c0fc', '#1c7ed6'],
  ['#ffd43b', '#f08c00'],
  ['#8ce99a', '#2f9e44'],
  ['#b197fc', '#7048e8'],
  ['#ffa94d', '#e8590c'],
]

export function advanceBalloons(list: readonly Balloon[], correct: boolean, attempt: number, retry: boolean): Balloon[] {
  if (retry) return list.slice()
  if (correct) return [...list, attempt === 1 ? 'star' : 'pop']
  if (attempt >= 2) return [...list, 'away']
  return list.slice()
}

/** คอมโบปัจจุบัน = ลูกโป่งดาวติดกันล่าสุด */
export function comboOf(list: readonly Balloon[]): number {
  let n = 0
  for (let i = list.length - 1; i >= 0 && list[i] === 'star'; i -= 1) n += 1
  return n
}

/** คำพูดของโค้ช ตามสถานการณ์ล่าสุด (nudge = เพิ่งตอบผิดครั้งแรก) */
export function coachLine(list: readonly Balloon[], total: number, nudge: boolean): string {
  const stars = list.filter((b) => b === 'star').length
  if (list.length >= total) {
    if (stars === total) return 'ได้ดาวครบทุกลูก! พร้อมไปภารกิจแล้ว ⭐'
    return 'ฝึกครบแล้ว! ไปลุยภารกิจในเมืองกันเลย'
  }
  if (nudge) return 'เกือบแล้ว! อ่านโจทย์อีกที แล้วลองใหม่นะ'
  const last = list[list.length - 1]
  if (last === 'away') return 'ไม่เป็นไรนะ เดี๋ยวมีข้อแบบนี้ให้ฝึกอีกครั้ง'
  const combo = comboOf(list)
  if (combo >= 3) return `คอมโบ ${combo}! ไฟลุกเลย 🔥`
  if (last === 'star') return 'ถูกตั้งแต่ครั้งแรก ได้ดาว ⭐ เลย!'
  if (last === 'pop') return 'ถูกแล้ว! ข้อหน้าลองให้ถูกตั้งแต่ครั้งแรกนะ'
  return 'ตอบถูกแล้วลูกโป่งจะแตก ถูกตั้งแต่ครั้งแรกได้ดาว ⭐'
}
