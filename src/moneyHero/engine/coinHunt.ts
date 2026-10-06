import type { DenomId } from './types'
import { denom } from '../data/denominations'
import { formatBS } from '../utils/money'
import { int, pick, shuffle } from '../utils/random'

/**
 * มินิเกม AR ล่าเหรียญ: เหรียญและธนบัตรลอยอยู่รอบตัว (ผ่านกล้อง หรือฉากการ์ตูน)
 * เด็กต้องแตะเก็บให้ได้จำนวนเงิน "พอดี" ตามโจทย์
 *
 * ทุกรอบสร้างจาก "ชุดคำตอบ" ก่อน แล้วค่อยเติมตัวหลอก จึงมีทางเก็บได้พอดีเสมอ
 * ตรรกะอยู่ไฟล์นี้ล้วน ๆ (ไม่แตะหน้าจอ) ชุดทดสอบจึงสุ่มตรวจได้หลายพันรอบ
 */

export interface HuntLevel {
  name: string
  /** ชนิดเงินที่ลอยอยู่ในรอบนี้ */
  allowed: DenomId[]
  /** จำนวนชิ้นในชุดคำตอบ */
  pieces: [number, number]
  /** จำนวนตัวหลอก */
  decoys: [number, number]
}

export const HUNT_LEVELS: HuntLevel[] = [
  { name: 'เหรียญบาท', allowed: ['b1', 'b2', 'b5', 'b10'], pieces: [2, 3], decoys: [3, 4] },
  { name: 'เหรียญและธนบัตร 20', allowed: ['b1', 'b2', 'b5', 'b10', 'b20'], pieces: [3, 4], decoys: [3, 5] },
  { name: 'มีสตางค์ด้วย', allowed: ['s25', 's50', 'b1', 'b2', 'b5', 'b10'], pieces: [3, 4], decoys: [4, 5] },
  { name: 'ธนบัตรหลายแบบ', allowed: ['b5', 'b10', 'b20', 'b50', 'b100'], pieces: [3, 5], decoys: [4, 5] },
  { name: 'รวมทุกอย่าง', allowed: ['s25', 's50', 'b1', 'b5', 'b10', 'b20', 'b50', 'b100'], pieces: [4, 5], decoys: [4, 6] },
]

export const HUNT_ROUNDS = HUNT_LEVELS.length

/** รางวัลต่อรอบที่ทำได้พอดี */
export const HUNT_REWARD = { exp: 15, coins: 5 }

export interface HuntRound {
  round: number
  target: number
  /** ของที่ลอยอยู่ (เรียงแบบสุ่ม) */
  spawns: DenomId[]
  /** ตำแหน่งใน spawns ของชุดคำตอบหนึ่งชุด (ใช้ให้บอตทดสอบและคำใบ้) */
  solution: number[]
}

export function makeRound(round: number): HuntRound {
  const lv = HUNT_LEVELS[Math.max(0, Math.min(HUNT_LEVELS.length - 1, round))]
  const answer: DenomId[] = Array.from({ length: int(lv.pieces[0], lv.pieces[1]) }, () => pick(lv.allowed))
  const target = answer.reduce((s, id) => s + denom(id).value, 0)
  const decoys: DenomId[] = Array.from({ length: int(lv.decoys[0], lv.decoys[1]) }, () => pick(lv.allowed))
  // จำตำแหน่งของชุดคำตอบหลังสลับ
  const tagged = shuffle([...answer.map((id) => ({ id, ans: true })), ...decoys.map((id) => ({ id, ans: false }))])
  return {
    round,
    target,
    spawns: tagged.map((t) => t.id),
    solution: tagged.flatMap((t, i) => (t.ans ? [i] : [])),
  }
}

export interface HuntCheck {
  ok: boolean
  total: number
  /** บวก = เกิน, ลบ = ยังขาด */
  diff: number
  message: string
}

export function checkHunt(target: number, picked: readonly DenomId[]): HuntCheck {
  const total = picked.reduce((s, id) => s + denom(id).value, 0)
  const diff = total - target
  if (diff === 0) return { ok: true, total, diff, message: `พอดี ${formatBS(target)} เป๊ะ!` }
  if (picked.length === 0) return { ok: false, total, diff, message: 'ยังไม่ได้เก็บเงินเลย แตะเหรียญที่ลอยอยู่ได้เลย' }
  return diff > 0
    ? { ok: false, total, diff, message: `เกินมา ${formatBS(diff)} ลองคืนบางชิ้นดูนะ` }
    : { ok: false, total, diff, message: `ยังขาดอีก ${formatBS(-diff)} เก็บเพิ่มอีกนิด` }
}
