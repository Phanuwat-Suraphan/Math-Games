/**
 * 📺 ทั้งห้องเรียน: ครูเปิดขึ้นจอใหญ่ ทั้งห้องช่วยกันตอบ ครูกดบันทึกว่าห้องตอบถูกไหม
 *
 * ทำไมแยกจากโหมดอื่น
 *
 * คำตอบในโหมดนี้เป็นของทั้งห้อง ไม่ใช่ของเด็กคนใดคนหนึ่ง
 * จึงไม่จดลงสมุดวัคซีน ไม่ส่งแผงคุณครู และไม่ให้เหรียญ (ไม่งั้นบัญชีบนเครื่องครูจะได้ผลของทั้งห้อง)
 *
 * กฎที่ห้ามแก้
 * · โจทย์เป็นคู่ในสมุดวัคซีนเสมอ ภาพเฉลยจึงวาดเป็นกลุ่มได้ทุกข้อ
 * · ในหนึ่งรอบไม่ถามข้อเดิมซ้ำ ถ้าขอจำนวนข้อมากกว่าที่แม่นั้นมี ให้ได้เท่าที่มี
 * · ภาพกลุ่มวาดได้ไม่เกิน 30 ชิ้น (กฎเดียวกับโจทย์ในเกม) เกินกว่านั้นใช้การบวกซ้ำแทน
 */

import { MAX_DRAWN, TABLES } from './questions'
import type { QVisual, Rng } from './questions'
import { rushDeck } from './rush'
import type { RushFact, RushTable } from './rush'

export const CLASS_COUNTS = [10, 20] as const
/** เวลาคิดก่อนเฉลยอัตโนมัติ (0 = ไม่จับเวลา ครูกดเฉลยเอง) */
export const CLASS_THINK = [0, 5, 10, 15] as const

/** ชุดโจทย์หนึ่งรอบ ไม่ซ้ำกัน */
export function buildClassSet(table: RushTable, count: number, rng: Rng): RushFact[] {
  const size = (table === 'mix' ? TABLES.length : 1) * 10
  const next = rushDeck(table, rng)
  return Array.from({ length: Math.max(1, Math.min(size, Math.floor(count))) }, () => next())
}

/** ภาพเฉลย: groups กลุ่ม กลุ่มละ each ถ้าชิ้นเยอะเกินให้เป็นการบวกซ้ำ */
export function classVisual(fact: RushFact): QVisual {
  if (fact.groups * fact.each <= MAX_DRAWN) return { kind: 'groups', groups: fact.groups, each: fact.each, item: 'Z' }
  return { kind: 'add', addend: fact.each, times: fact.groups }
}

export interface ClassResult {
  fact: RushFact
  correct: boolean
}

/** ดาวของทั้งห้อง: ถูก 60% ขึ้นไปได้ 1 ดวง 80% ได้ 2 ดวง ถูกหมดได้ 3 ดวง */
export function classStars(results: ClassResult[]): number {
  if (results.length === 0) return 0
  const ratio = results.filter((r) => r.correct).length / results.length
  return ratio === 1 ? 3 : ratio >= 0.8 ? 2 : ratio >= 0.6 ? 1 : 0
}

/** ข้อที่ห้องยังพลาด (ไม่ซ้ำ) ไว้เล่นรอบซ่อม */
export function classMissed(results: ClassResult[]): RushFact[] {
  const out: RushFact[] = []
  for (const r of results) {
    if (!r.correct && !out.some((f) => f.each === r.fact.each && f.groups === r.fact.groups)) out.push(r.fact)
  }
  return out
}
