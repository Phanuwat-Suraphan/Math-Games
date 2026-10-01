/**
 * 🌞 ภารกิจประจำวัน: วันละ 5 ข้อ ทำทุกวันได้ 🔥 ไฟต่อเนื่อง
 *
 * ทำไมต้องมี
 *
 * สูตรคูณจำได้ดีที่สุดเมื่อฝึกสั้น ๆ แต่ทุกวัน มากกว่าฝึกนาน ๆ ทีละครั้ง
 * ภารกิจนี้จึงสั้นมาก (5 ข้อ ไม่ถึง 3 นาที) หยิบข้อที่ยังพลาดในสมุดวัคซีนมาก่อน
 * และนับวันที่ทำต่อเนื่อง ให้เด็กอยากกลับมาเล่นพรุ่งนี้
 *
 * กฎที่ห้ามแก้
 * · วันหนึ่งได้โจทย์ชุดเดียว (สุ่มจากวันที่) เปิดซ้ำก็ได้ชุดเดิม จะกดเริ่มใหม่หาข้อง่ายไม่ได้
 * · นับวันตามเวลาในเครื่อง (เวลาไทยของเด็ก) ไม่ใช่ UTC
 * · ขาดไปวันเดียวไฟเริ่มนับใหม่ แต่สถิติไฟยาวที่สุดเก็บไว้เสมอ ไม่ลงโทษเพิ่ม
 */

import { practiceFromPairs } from './questions'
import type { Question, Rng, Table } from './questions'
import { allFacts, weakFacts } from './vaccineBook'
import type { BookFact, VaccineBook } from './vaccineBook'

export const DAILY_LENGTH = 5
/** จำนวนวันย้อนหลังที่เก็บไว้วาดปฏิทินตราประทับ */
export const DAILY_HISTORY = 14

export interface DailyState {
  /** วันล่าสุดที่ทำภารกิจสำเร็จ YYYY-MM-DD */
  last: string
  streak: number
  best: number
  /** วันที่ทำสำเร็จ (ไม่เกิน DAILY_HISTORY วันล่าสุด) */
  days: string[]
}

export const emptyDaily = (): DailyState => ({ last: '', streak: 0, best: 0, days: [] })

/** วันที่ตามเวลาในเครื่อง YYYY-MM-DD */
export function dayKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** วันก่อนหน้าของ key (คิดเป็นวันตามปฏิทิน ไม่สนเวลาออมแสง) */
export function prevDay(key: string): string {
  const [y, m, d] = key.split('-').map(Number)
  return dayKey(new Date(y, m - 1, d - 1))
}

export const doneToday = (state: DailyState, today: string): boolean => state.last === today

/** ไฟที่ยังติดอยู่ ณ วันนี้ (ถ้าเมื่อวานไม่ได้ทำและวันนี้ยังไม่ได้ทำ ไฟดับเป็น 0) */
export function liveStreak(state: DailyState, today: string): number {
  return state.last === today || state.last === prevDay(today) ? state.streak : 0
}

/** บันทึกว่าวันนี้ทำภารกิจสำเร็จ (ทำซ้ำในวันเดียวกันไม่นับเพิ่ม) */
export function completeDaily(state: DailyState, today: string): DailyState {
  if (state.last === today) return state
  const streak = state.last === prevDay(today) ? state.streak + 1 : 1
  const days = [...state.days.filter((d) => d !== today), today].sort().slice(-DAILY_HISTORY)
  return { last: today, streak, best: Math.max(state.best, streak), days }
}

/** เหรียญของภารกิจวันนี้: 5 + โบนัสไฟต่อเนื่อง (ไม่เกิน 7) */
export const dailyReward = (streak: number): number => 5 + Math.min(7, Math.max(0, streak))

/** ตัวสุ่มจากวันที่ วันเดียวกันได้ชุดเดียวกันเสมอ */
export function dayRng(key: string): Rng {
  let a = 0
  for (const ch of key) a = (Math.imul(a, 31) + ch.charCodeAt(0)) >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * โจทย์ 5 ข้อของวันนี้: ข้อที่ยังพลาดก่อน แล้วข้อที่กำลังฝึก แล้วข้อใหม่ แล้วข้อที่คล่องแล้ว (ทบทวน)
 * ข้อที่ 5 เป็นข้อหา □ (ถ้ามีอย่างน้อย 2 กลุ่ม) เพื่อฝึกคิดย้อนกลับทุกวัน
 */
export function dailySet(book: VaccineBook, today: string): Question[] {
  const rng = dayRng(today)
  const shuffle = <T>(list: T[]): T[] => {
    const out = list.slice()
    for (let i = out.length - 1; i > 0; i -= 1) {
      const j = Math.floor(rng() * (i + 1))
      ;[out[i], out[j]] = [out[j], out[i]]
    }
    return out
  }
  const facts = allFacts(book)
  const order: BookFact[] = [
    ...weakFacts(book),
    ...shuffle(facts.filter((f) => f.status === 'trying')),
    ...shuffle(facts.filter((f) => f.status === 'new')),
    ...shuffle(facts.filter((f) => f.status === 'cured')),
  ]
  const chosen: BookFact[] = []
  for (const f of order) {
    if (chosen.length >= DAILY_LENGTH) break
    if (!chosen.includes(f)) chosen.push(f)
  }
  return practiceFromPairs(
    shuffle(chosen).map((f): [Table, number] => [f.each, f.groups]),
    rng,
  )
}

/** อ่านสถานะที่เก็บไว้ ค่าเสียถูกทิ้ง */
export function parseDaily(raw: unknown): DailyState {
  const out = emptyDaily()
  if (typeof raw !== 'object' || raw === null) return out
  const r = raw as Record<string, unknown>
  const isDay = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)
  const n = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.min(9999, Math.floor(v))) : 0)
  if (isDay(r.last)) out.last = r.last
  out.streak = out.last ? n(r.streak) : 0
  out.best = Math.max(n(r.best), out.streak)
  if (Array.isArray(r.days)) out.days = [...new Set(r.days.filter(isDay))].sort().slice(-DAILY_HISTORY)
  return out
}

/** วันในปฏิทินตราประทับ: DAILY_HISTORY วันล่าสุดจนถึงวันนี้ */
export function calendarDays(today: string): string[] {
  const out = [today]
  while (out.length < DAILY_HISTORY) out.unshift(prevDay(out[0]))
  return out
}
