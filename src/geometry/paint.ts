/**
 * ถังสีสำหรับระบายรูปที่ปิดแล้ว
 *
 * เด็กที่วาดเสร็จอยากระบายสีเป็นเรื่องปกติ แต่ที่สำคัญกว่านั้นคือ
 * ครูใช้สีอธิบายได้ เช่น ระบายสามเหลี่ยมสองรูปคนละสีเพื่อให้เห็นว่า
 * สี่เหลี่ยมหนึ่งรูปแบ่งได้เป็นสามเหลี่ยมสองรูป ซึ่งเป็นวิธีอธิบาย
 * ผลรวมมุมภายในที่ใช้กันทั้งเล่ม
 *
 * แยกเป็นไฟล์ล้วน ๆ ไม่แตะ React ชุดทดสอบจึงเรียกได้ตรง ๆ
 */

import { distance, polygonArea } from './geo'
import type { Point } from './geo'
import { isInsidePolygon } from './shapes'
import type { CircleShape, PolygonShape, Shape } from './shapes'

/** ค่าที่แปลว่า "ไม่ระบาย" ตรงกับคำเดียวกันใน SVG จึงส่งลงหน้าจอได้เลย */
export const NO_FILL = 'none'

export interface FillChoice {
  value: string
  label: string
}

/**
 * สีระบายเป็นโทนพาสเทลอ่อนทั้งชุด
 *
 * ตั้งใจให้อ่อนกว่าสีดินสอมาก เพราะเส้นขอบรูปกับตัวเลขบอกมุม
 * ต้องอ่านออกทับสีที่ระบายไปแล้ว ถ้าใช้สีเข้มเด็กจะระบายทับงานตัวเองจนหาย
 */
export const FILL_COLORS: FillChoice[] = [
  { value: '#fecdd3', label: 'ชมพู' },
  { value: '#ddd6fe', label: 'ม่วง' },
  { value: '#bfdbfe', label: 'ฟ้า' },
  { value: '#bbf7d0', label: 'เขียว' },
  { value: '#fef08a', label: 'เหลือง' },
  { value: '#fed7aa', label: 'ส้ม' },
]

/** รูปที่มีข้างในให้ระบายได้ */
export type FillableShape = PolygonShape | CircleShape

/** ระบายรูปนี้ได้ไหม ต้องเป็นรูปที่ปิดแล้วเท่านั้น */
export function canFill(shape: Shape): shape is FillableShape {
  if (shape.kind === 'circle') return true
  return shape.kind === 'polygon' && shape.closed && shape.points.length >= 3
}

/** สีที่ระบายอยู่ตอนนี้ รูปที่ระบายไม่ได้ถือว่าไม่มีสี */
export function fillOf(shape: Shape): string {
  return canFill(shape) ? shape.fill : NO_FILL
}

/** เนื้อที่ข้างในรูป ใช้ตัดสินว่าจิ้มโดนช่องไหนตอนรูปซ้อนกัน */
function insideArea(shape: FillableShape): number {
  return shape.kind === 'circle'
    ? Math.PI * shape.radius * shape.radius
    : polygonArea(shape.points)
}

/** จุดนี้อยู่ข้างในรูปนี้ไหม นับเฉพาะเนื้อข้างใน ไม่นับเส้นขอบ */
export function isInsideShape(shape: Shape, p: Point): boolean {
  if (!canFill(shape)) return false
  return shape.kind === 'circle'
    ? distance(p, shape.center) <= shape.radius
    : isInsidePolygon(p, shape.points)
}

/**
 * หารูปที่ควรโดนระบายเมื่อจิ้มที่จุดนี้
 *
 * เลือกรูปที่เล็กที่สุดในบรรดารูปที่ครอบจุดนั้นอยู่ ไม่ใช่รูปบนสุดแบบเครื่องมืออื่น
 * เพราะเวลาแบ่งสี่เหลี่ยมเป็นสามเหลี่ยมสองรูป สามเหลี่ยมจะอยู่ข้างในสี่เหลี่ยมพอดี
 * ถ้าเลือกรูปบนสุด เด็กจะจิ้มสามเหลี่ยมแล้วสี่เหลี่ยมทั้งรูปเปลี่ยนสีแทน
 */
export function findFillTarget(shapes: Shape[], p: Point): FillableShape | null {
  let best: FillableShape | null = null
  let bestArea = Infinity
  for (const shape of shapes) {
    if (!isInsideShape(shape, p)) continue
    const area = insideArea(shape as FillableShape)
    /* เท่ากันให้รูปที่วาดทีหลังชนะ เพราะมันคือรูปที่เด็กเพิ่งมองเห็นอยู่ข้างบน */
    if (area <= bestArea) {
      best = shape as FillableShape
      bestArea = area
    }
  }
  return best
}

/** คืนรูปเดิมที่เปลี่ยนสีระบายแล้ว รูปที่ระบายไม่ได้คืนตัวเดิมไปเลย */
export function paintShape(shape: Shape, fill: string): Shape {
  if (!canFill(shape)) return shape
  return { ...shape, fill }
}

/** ชื่อสีไว้พูดกับเด็ก */
export function fillName(value: string): string {
  if (value === NO_FILL) return 'ลบสีออก'
  return FILL_COLORS.find((choice) => choice.value === value)?.label ?? 'สีที่เลือก'
}
