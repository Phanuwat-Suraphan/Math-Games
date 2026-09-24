/**
 * ⚡ ซอมบี้บุก! โหมดท้าเวลา 60 วินาที ฝึกความคล่องสูตรคูณ
 *
 * ทำไมต้องมี
 *
 * เกมกระดานกับโหมดฝึกให้เวลาคิดไม่จำกัด ซึ่งเหมาะกับตอนเพิ่งเรียน
 * แต่เป้าของสูตรคูณ ป.2 คือตอบได้เร็วโดยไม่ต้องนับทีละกลุ่ม โหมดนี้จึงนับเวลาและนับจำนวนที่ตอบถูก
 * ตอบผิดไม่เสียอะไรนอกจากเวลา (เห็นเฉลยแล้วไปตัวต่อไป) เด็กจึงไม่กลัวที่จะลอง
 *
 * กฎที่ห้ามแก้
 * · โจทย์เป็นคู่ในสมุดวัคซีนเสมอ (แม่ 2 3 4 5 10 คูณ 1–10) ผลจึงจดลงสมุดได้ทุกข้อ
 * · ไม่ถามข้อเดิมติดกันสองครั้ง
 * · สถิติดีสุดเก็บแยกตามแม่ เพราะแม่ 10 ง่ายกว่าแม่ 3 มาก เอามาเทียบกันไม่ได้
 */

import { TABLES } from './questions'
import type { Rng, Table } from './questions'

export const RUSH_SECONDS = 60
export type RushTable = Table | 'mix'
export const RUSH_TABLES: RushTable[] = [...TABLES, 'mix']

export interface RushFact {
  each: Table
  groups: number
}

/** ดาวตามจำนวนที่รักษาได้ใน 60 วินาที (ตอบได้ราว 1 ข้อทุก 4 วินาทีคือคล่องแล้ว) */
export const RUSH_STAR_AT = [5, 10, 15] as const

export function rushStars(cured: number): number {
  return RUSH_STAR_AT.filter((n) => cured >= n).length
}

/** เหรียญ: 2 ข้อต่อ 1 เหรียญ ได้ดาวครบบวก 3 ไม่เกิน 15 ต่อรอบ */
export function rushReward(cured: number): number {
  const c = Math.max(0, Math.floor(cured))
  return Math.min(15, Math.floor(c / 2) + (rushStars(c) === 3 ? 3 : 0))
}

/**
 * สำรับโจทย์: สับทุกข้อของแม่ที่เลือก ถามจนหมดแล้วสับใหม่
 * ข้อแรกของสำรับใหม่ต้องไม่ใช่ข้อสุดท้ายของสำรับเก่า
 * คืนฟังก์ชันที่เรียกทีละครั้งได้ข้อถัดไปไม่รู้จบ
 */
export function rushDeck(table: RushTable, rng: Rng): () => RushFact {
  const all: RushFact[] = (table === 'mix' ? TABLES : [table]).flatMap((each) =>
    Array.from({ length: 10 }, (_, i) => ({ each, groups: i + 1 })),
  )
  let pile: RushFact[] = []
  let last: RushFact | null = null
  const shuffle = () => {
    const out = all.slice()
    for (let i = out.length - 1; i > 0; i -= 1) {
      const j = Math.floor(rng() * (i + 1))
      ;[out[i], out[j]] = [out[j], out[i]]
    }
    if (last && out.length > 1 && out[0].each === last.each && out[0].groups === last.groups) {
      ;[out[0], out[1]] = [out[1], out[0]]
    }
    return out
  }
  return () => {
    if (pile.length === 0) pile = shuffle()
    const next = pile.shift() as RushFact
    last = next
    return next
  }
}

/** สถิติดีสุดแยกตามแม่ อ่านจากข้อมูลที่เก็บไว้ ค่าเสียถูกทิ้ง */
export type RushBest = Partial<Record<string, number>>

export function parseRushBest(raw: unknown): RushBest {
  const out: RushBest = {}
  if (typeof raw !== 'object' || raw === null) return out
  for (const t of RUSH_TABLES) {
    const v = (raw as Record<string, unknown>)[String(t)]
    if (typeof v === 'number' && Number.isFinite(v) && v > 0) out[String(t)] = Math.min(999, Math.floor(v))
  }
  return out
}

/** บันทึกผลรอบใหม่ คืนสถิติใหม่และบอกว่าทำลายสถิติเดิมไหม */
export function withRushResult(best: RushBest, table: RushTable, cured: number): { best: RushBest; record: boolean } {
  const key = String(table)
  const old = best[key] ?? 0
  if (cured <= old) return { best, record: false }
  return { best: { ...best, [key]: cured }, record: cured > 0 }
}
