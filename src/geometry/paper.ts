/**
 * ขนาดกระดาษวาด
 *
 * กระดาษเดิมกว้าง 25 สูง 17 เซนติเมตร ซึ่งเล็กกว่ากระดาษ A4 ที่ใช้กันจริงในห้องเรียน
 * งานที่ต้องวาดเส้นร่างหลายเส้นอย่างการแบ่งครึ่งมุมหรือสร้างรูปหลายเหลี่ยม
 * จึงเต็มกระดาษตั้งแต่ยังไม่เสร็จ
 *
 * ขนาดคิดเป็นพิกเซลของผืนวาด โดยหนึ่งเซนติเมตรเท่ากับ PX_PER_CM เสมอ
 * กระดาษที่ใหญ่ขึ้นจึงแปลว่ามีที่วาดมากขึ้นจริง ไม่ใช่แค่ขยายภาพให้ทุกอย่างโตตาม
 */

import { PX_PER_CM } from './geo'

export interface PaperSize {
  id: string
  label: string
  /** ขนาดจริงเป็นเซนติเมตร ใช้แสดงให้ครูเลือก */
  cm: string
  width: number
  height: number
}

const sheet = (id: string, label: string, wideCm: number, tallCm: number): PaperSize => ({
  id,
  label,
  cm: `${wideCm}×${tallCm} ซม.`,
  width: Math.round(wideCm * PX_PER_CM),
  height: Math.round(tallCm * PX_PER_CM),
})

/**
 * ขนาดเดิมอยู่หัวแถวและเป็นค่าตั้งต้น
 * งานที่บันทึกไว้ก่อนหน้านี้ทุกชิ้นวางอยู่บนขนาดนี้ ถ้าเปลี่ยนค่าตั้งต้น
 * งานเก่าจะเปิดมาแล้วอยู่ผิดที่ทันทีโดยที่ครูไม่ได้สั่งอะไรเลย
 */
export const PAPER_SIZES: PaperSize[] = [
  sheet('wide', 'มาตรฐาน', 25, 17),
  sheet('a4', 'A4 แนวนอน', 29.7, 21),
  sheet('a4tall', 'A4 แนวตั้ง', 21, 29.7),
  sheet('huge', 'ใหญ่พิเศษ', 40, 28),
]

export function findPaperSize(id: string): PaperSize {
  return PAPER_SIZES.find((size) => size.id === id) ?? PAPER_SIZES[0]
}
