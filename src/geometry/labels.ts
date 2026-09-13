/**
 * ป้ายตัวเลขบนรูป และการลากหลบ
 *
 * ปัญหาที่แก้
 *
 * รูปที่วาดติดกันหลายรูป ป้ายบอกความยาวกับป้ายบอกมุมจะไปกองทับกัน
 * และทับเส้นที่เด็กเพิ่งวาดจนมองไม่เห็นว่าเส้นลากไปถึงไหน
 * ป้ายที่วางตายตัวจึงใช้ไม่ได้กับงานจริง ต้องขยับหลบได้
 *
 * แต่ขยับได้ไม่จำกัดก็ใช้ไม่ได้เหมือนกัน
 * ป้าย "3.5 ซม." ที่ลอยอยู่กลางกระดาษ ไม่มีใครรู้ว่ามันบอกความยาวของด้านไหน
 * จึงมีเชือกล่ามไว้ ลากได้ไกลสุดเท่าที่ยังเห็นได้ว่ามันเป็นของใคร
 * และมีเส้นประลากจากที่เดิมไปหาป้าย เพื่อบอกว่าป้ายนี้เป็นของตรงนั้น
 */

import { distance, midpoint } from './geo'
import type { Point } from './geo'

export interface LabelOffset {
  x: number
  y: number
}

export const NO_OFFSET: LabelOffset = { x: 0, y: 0 }

/** ลากป้ายหนีได้ไกลสุดเท่านี้ ประมาณหนึ่งเซนติเมตรครึ่งบนกระดาษ */
export const LABEL_LEASH = 64

/** ระยะที่ถือว่าป้ายถูกลากออกมาแล้ว ต้องลากเส้นประไปหา */
export const LEADER_MIN = 12

export type LabelOffsets = Record<string, LabelOffset>

/** ชื่อเรียกป้ายแต่ละอัน ต้องไม่ซ้ำกันข้ามรูปและข้ามชนิดป้าย */
export function labelKey(shapeId: string, role: string, index = 0): string {
  return `${shapeId}:${role}:${index}`
}

export function offsetOf(offsets: LabelOffsets, key: string): LabelOffset {
  return offsets[key] ?? NO_OFFSET
}

/** ดึงป้ายกลับเข้าเชือก ถ้าลากออกไปไกลกว่าที่อนุญาต */
export function clampLeash(offset: LabelOffset, max = LABEL_LEASH): LabelOffset {
  const away = Math.hypot(offset.x, offset.y)
  if (away <= max || away === 0) return offset
  const ratio = max / away
  return { x: offset.x * ratio, y: offset.y * ratio }
}

/** ขยับป้ายหนึ่งอัน คืนตารางใหม่ ไม่แก้ของเดิม */
export function moveLabel(
  offsets: LabelOffsets,
  key: string,
  offset: LabelOffset,
  max = LABEL_LEASH,
): LabelOffsets {
  return { ...offsets, [key]: clampLeash(offset, max) }
}

/** ป้ายนี้ถูกลากออกมาจากที่เดิมแล้วหรือยัง */
export function isMoved(offset: LabelOffset): boolean {
  return Math.hypot(offset.x, offset.y) >= LEADER_MIN
}

/**
 * ที่วางป้ายความยาวของด้านหนึ่ง
 *
 * เลื่อนออกจากเส้นเล็กน้อยเสมอ ไม่วางทับกลางเส้นเหมือนเดิม
 * ด้านของรูปปิดจะเลื่อนออกด้านนอกรูป ส่วนเส้นเดี่ยวเลื่อนขึ้นด้านบน
 * แค่นี้ก็แก้ปัญหาป้ายบังเส้นไปได้เกือบหมดโดยที่เด็กไม่ต้องลากเอง
 */
export function edgeLabelAnchor(a: Point, b: Point, away: Point | null, gap = 18): Point {
  const middle = midpoint(a, b)

  if (away && distance(middle, away) > 0.001) {
    const dx = middle.x - away.x
    const dy = middle.y - away.y
    const length = Math.hypot(dx, dy)
    return { x: middle.x + (dx / length) * gap, y: middle.y + (dy / length) * gap }
  }

  /* เส้นเดี่ยวไม่มีข้างในข้างนอก ใช้แนวตั้งฉากที่ชี้ขึ้นบนจอ */
  const dx = b.x - a.x
  const dy = b.y - a.y
  const length = Math.hypot(dx, dy)
  if (length === 0) return { x: middle.x, y: middle.y - gap }
  const normal = { x: dy / length, y: -dx / length }
  const sign = normal.y > 0 ? -1 : 1
  return { x: middle.x + normal.x * gap * sign, y: middle.y + normal.y * gap * sign }
}
