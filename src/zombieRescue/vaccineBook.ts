/**
 * สมุดวัคซีน: สติกเกอร์สูตรคูณ 50 ข้อ (แม่ 2 3 4 5 10 คูณ 1–10)
 *
 * ทำไมต้องมี
 *
 * เกมกระดานกับโหมดฝึกบอกแค่ว่า "ข้อนี้ถูกไหม" แต่ไม่จำว่าเด็กคล่องข้อไหนแล้ว
 * สมุดนี้จำทีละข้อของสูตรคูณ ข้อไหนตอบถูก 2 ครั้งติดกัน ซอมบี้ในช่องนั้นหายป่วย ได้สติกเกอร์ถาวร
 * ข้อที่ตอบผิดครั้งล่าสุดขึ้นเป็น "ข้อที่ยังพลาด" แล้วโหมดฝึกหยิบข้อพวกนี้มาฝึกก่อน
 *
 * กฎที่ห้ามแก้
 * · สติกเกอร์ที่ได้แล้วไม่หาย แม้ตอบผิดทีหลัง (เด็ก ป.2 เสียของแล้วท้อ)
 *   ข้อนั้นจะกลับไปอยู่ใน "ข้อที่ยังพลาด" แทน จนตอบถูกอีกครั้ง
 * · 7 × 3 กับ 3 × 7 เป็นคนละช่อง เพราะช่องบอกจำนวนกลุ่ม (groups) กับแม่ (each) ตามโจทย์จริง
 *   และเขียนเรียง กลุ่ม × แม่ แบบเดียวกับโจทย์ในเกม เด็กจึงเห็นข้อเดียวกันเป็นตัวเลขชุดเดียวกัน
 */

import { PRACTICE_LENGTH, TABLES, practiceFromPairs } from './questions'
import type { Question, Rng, Table } from './questions'

export const STREAK_TO_CURE = 2
export const FACT_COUNT = TABLES.length * 10

export interface FactEntry {
  /** ตอบถูกรวม */
  r: number
  /** ตอบผิดรวม */
  w: number
  /** ถูกติดกันล่าสุด (ผิดแล้วกลับเป็น 0) */
  s: number
  /** ได้สติกเกอร์แล้ว */
  got: boolean
}

export interface VaccineBook {
  facts: Record<string, FactEntry>
}

export type FactStatus = 'new' | 'trying' | 'weak' | 'cured'

export const emptyBook = (): VaccineBook => ({ facts: {} })

export const factKey = (each: number, groups: number): string => `${each}x${groups}`

const EMPTY: FactEntry = { r: 0, w: 0, s: 0, got: false }

export function entryOf(book: VaccineBook, each: number, groups: number): FactEntry {
  return book.facts[factKey(each, groups)] ?? EMPTY
}

/** ข้อนี้อยู่ในสมุดไหม (แม่ 2 3 4 5 10 และ 1–10 กลุ่ม) */
export function isBookFact(each: number, groups: number): boolean {
  return (TABLES as number[]).includes(each) && Number.isInteger(groups) && groups >= 1 && groups <= 10
}

export interface NoteResult {
  book: VaccineBook
  /** เพิ่งได้สติกเกอร์ของข้อนี้ในครั้งนี้ */
  newSticker: boolean
}

/** จดผลหนึ่งข้อลงสมุด ข้อที่อยู่นอกสมุดคืนสมุดเดิม */
export function noteAnswer(book: VaccineBook, q: Pick<Question, 'each' | 'groups'>, correct: boolean): NoteResult {
  if (!isBookFact(q.each, q.groups)) return { book, newSticker: false }
  const before = entryOf(book, q.each, q.groups)
  const s = correct ? before.s + 1 : 0
  const got = before.got || s >= STREAK_TO_CURE
  const entry: FactEntry = { r: before.r + (correct ? 1 : 0), w: before.w + (correct ? 0 : 1), s, got }
  return { book: { facts: { ...book.facts, [factKey(q.each, q.groups)]: entry } }, newSticker: got && !before.got }
}

export function statusOf(entry: FactEntry): FactStatus {
  if (entry.w > 0 && entry.s === 0) return 'weak'
  if (entry.got) return 'cured'
  if (entry.r + entry.w > 0) return 'trying'
  return 'new'
}

export interface BookFact {
  each: Table
  groups: number
  entry: FactEntry
  status: FactStatus
}

/** ทุกข้อในสมุด เรียงตามแม่ แล้วตามจำนวนกลุ่ม */
export function allFacts(book: VaccineBook): BookFact[] {
  return TABLES.flatMap((each) =>
    Array.from({ length: 10 }, (_, i) => {
      const entry = entryOf(book, each, i + 1)
      return { each, groups: i + 1, entry, status: statusOf(entry) }
    }),
  )
}

export function curedCount(book: VaccineBook, table?: Table): number {
  return allFacts(book).filter((f) => f.entry.got && (table === undefined || f.each === table)).length
}

/** ข้อที่ตอบผิดครั้งล่าสุด ผิดบ่อยที่สุดขึ้นก่อน */
export function weakFacts(book: VaccineBook): BookFact[] {
  return allFacts(book)
    .filter((f) => f.status === 'weak')
    .sort((a, b) => b.entry.w - b.entry.r - (a.entry.w - a.entry.r) || a.each - b.each || a.groups - b.groups)
}

/**
 * ชุดฝึกข้อที่ยังพลาด 10 ข้อ
 * ข้อที่ยังพลาดก่อน แล้วข้อที่ลองแล้วแต่ยังไม่ได้สติกเกอร์ แล้วข้อที่ยังไม่เคยเจอ
 * ถ้ายังไม่ครบ (ได้สติกเกอร์เกือบหมดแล้ว) เติมด้วยข้อสุ่มจากทั้งสมุด
 */
export function buildFocusSet(book: VaccineBook, rng: Rng): Question[] {
  const shuffle = <T>(list: T[]): T[] => {
    const out = list.slice()
    for (let i = out.length - 1; i > 0; i -= 1) {
      const j = Math.floor(rng() * (i + 1))
      ;[out[i], out[j]] = [out[j], out[i]]
    }
    return out
  }
  const facts = allFacts(book)
  const weak = weakFacts(book)
  const trying = shuffle(facts.filter((f) => f.status === 'trying'))
  const fresh = shuffle(facts.filter((f) => f.status === 'new'))
  const rest = shuffle(facts.filter((f) => f.status === 'cured'))
  const chosen: BookFact[] = []
  for (const f of [...weak, ...trying, ...fresh, ...rest]) {
    if (chosen.length >= PRACTICE_LENGTH) break
    if (!chosen.includes(f)) chosen.push(f)
  }
  return practiceFromPairs(
    shuffle(chosen).map((f): [Table, number] => [f.each, f.groups]),
    rng,
  )
}

/** อ่านสมุดจากข้อมูลที่เก็บไว้ ข้อมูลเสียทิ้งทีละช่อง ไม่ทิ้งทั้งเล่ม */
export function parseBook(raw: unknown): VaccineBook {
  const book = emptyBook()
  if (typeof raw !== 'object' || raw === null) return book
  const facts = (raw as { facts?: unknown }).facts
  if (typeof facts !== 'object' || facts === null) return book
  const count = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.min(99999, Math.floor(v))) : 0)
  for (const each of TABLES) {
    for (let groups = 1; groups <= 10; groups += 1) {
      const key = factKey(each, groups)
      const item = (facts as Record<string, unknown>)[key]
      if (typeof item !== 'object' || item === null) continue
      const e = item as Record<string, unknown>
      const entry: FactEntry = { r: count(e.r), w: count(e.w), s: count(e.s), got: e.got === true }
      if (entry.r + entry.w > 0 || entry.got) book.facts[key] = entry
    }
  }
  return book
}
