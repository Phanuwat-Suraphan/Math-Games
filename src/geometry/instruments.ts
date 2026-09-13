/**
 * ขนาดของอุปกรณ์บนกระดาษ
 *
 * ทำไมไม้บรรทัดกับครึ่งวงกลม "ย่อขยาย" คนละแบบกัน
 *
 * ครึ่งวงกลมวัดมุม ขยายได้อิสระ เพราะมุมไม่ขึ้นกับขนาด
 * ครึ่งวงกลมอันใหญ่กับอันเล็กวัดมุม 60 องศาได้เท่ากันเป๊ะ
 * อันใหญ่อ่านง่ายบนจอโปรเจกเตอร์ อันเล็กไม่บังงานตอนกระดาษแน่น
 *
 * ไม้บรรทัดต่างออกไปสิ้นเชิง ถ้าขยายทั้งอันแบบเดียวกัน
 * ขีดเซนติเมตรบนไม้บรรทัดจะไม่ตรงกับเซนติเมตรบนกระดาษอีกต่อไป
 * เด็กจะวัดได้ 4 ซม. จากเส้นที่ยาว 3 ซม. จริง ๆ แล้วจดลงสมุดไปทั้งอย่างนั้น
 * ความผิดพลาดแบบนี้ไม่มีอะไรบนจอบอกเลยว่าผิด
 *
 * ไม้บรรทัดจึง "ย่อขยาย" ด้วยการเปลี่ยนความยาวของไม้ ไม่ใช่เปลี่ยนมาตราส่วน
 * ยาวขึ้นคือมีขีดมากขึ้น ไม่ใช่ขีดห่างขึ้น
 */

import { PX_PER_CM } from './geo'
import type { Point } from './geo'

/** รัศมีของครึ่งวงกลม ตั้งแต่ 3 ถึง 8 เซนติเมตร */
export const PROTRACTOR_MIN = 120
export const PROTRACTOR_MAX = 320
export const PROTRACTOR_DEFAULT = 200

/** ความยาวไม้บรรทัด ตั้งแต่ 5 ถึง 30 เซนติเมตร */
export const RULER_MIN_CM = 5
export const RULER_MAX_CM = 30
export const RULER_DEFAULT_CM = 20

export function clampProtractorRadius(radius: number): number {
  return Math.min(PROTRACTOR_MAX, Math.max(PROTRACTOR_MIN, radius))
}

/** ความยาวไม้บรรทัด ปัดเป็นครึ่งเซนติเมตรให้อ่านเป็นตัวเลขกลม ๆ ได้ */
export function clampRulerLength(lengthCm: number): number {
  const snapped = Math.round(lengthCm * 2) / 2
  return Math.min(RULER_MAX_CM, Math.max(RULER_MIN_CM, snapped))
}

/** รัศมีใหม่ของครึ่งวงกลม เมื่อลากปุ่มขยายไปอยู่ที่ตำแหน่งหนึ่ง */
export function protractorRadiusFromPointer(center: Point, pointer: Point): number {
  return clampProtractorRadius(Math.hypot(pointer.x - center.x, pointer.y - center.y))
}

/**
 * ความยาวใหม่ของไม้บรรทัด เมื่อลากปุ่มที่ปลายไม้
 *
 * ใช้เงาของปลายนิ้วที่ตกลงบนแนวไม้บรรทัด ไม่ใช่ระยะตรงจากจุดศูนย์
 * นิ้วที่เลื่อนออกนอกแนวไม้เล็กน้อยจึงไม่ทำให้ไม้ยืดเกินจริง
 */
export function rulerLengthFromPointer(
  origin: Point,
  rotation: number,
  pointer: Point,
): number {
  const radian = (rotation * Math.PI) / 180
  /* ทิศของไม้บรรทัด แกน y ของ SVG ชี้ลง จึงกลับเครื่องหมายของ sin */
  const along = { x: Math.cos(radian), y: -Math.sin(radian) }
  const reach = (pointer.x - origin.x) * along.x + (pointer.y - origin.y) * along.y
  return clampRulerLength(reach / PX_PER_CM)
}

/**
 * ตัวคูณขนาดของขีดและตัวเลขบนครึ่งวงกลม
 *
 * ขีดที่ยาวเท่าเดิมบนครึ่งวงกลมอันใหญ่จะดูเหมือนขนแมวเส้นเล็ก ๆ
 * ส่วนบนอันเล็กจะยาวจนขีดชนกันเป็นแถบทึบ ทุกอย่างจึงต้องโตตามรัศมี
 * แต่ไม่ปล่อยให้เล็กหรือใหญ่เกินไปจนอ่านไม่ออก
 */
export function scaleUnit(radius: number, base = PROTRACTOR_DEFAULT): number {
  return Math.min(1.5, Math.max(0.72, radius / base))
}
