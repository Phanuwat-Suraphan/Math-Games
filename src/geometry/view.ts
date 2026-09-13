/**
 * มุมมองของกระดาษ ว่าตอนนี้มองเห็นส่วนไหนอยู่และขยายเท่าไร
 *
 * ทำไมต้องซูม
 *
 * จุดที่ส่วนโค้งสองเส้นตัดกันมักเป็นมุมแหลม ๆ ที่เส้นสองเส้นเฉียดกัน
 * บนจอแท็บเล็ต จุดแบบนั้นเล็กกว่าปลายนิ้วเด็กเสียอีก
 * และตอนครูสาธิตหน้าห้อง มุมที่วัดได้ 43 กับ 45 องศาดูเหมือนกันหมดถ้าไม่ขยาย
 *
 * ทุกอย่างในไฟล์นี้คิดด้วยพิกัดของกระดาษ ไม่ใช่พิกเซลบนจอ
 * ตำแหน่ง x กับ y คือมุมบนซ้ายของกรอบที่มองเห็น ส่วน scale คือกี่เท่าของขนาดจริง
 * การวาดทั้งหมดจึงไม่ต้องรู้เรื่องซูมเลย มีแค่ viewBox ของ SVG ที่เปลี่ยนไป
 */

import type { Point } from './geo'

export interface View {
  scale: number
  x: number
  y: number
}

/** ย่อได้ครึ่งเดียวก็พอเห็นกระดาษทั้งแผ่นแล้ว ขยายสี่เท่าพอสำหรับจุดตัดที่เล็กที่สุด */
export const MIN_SCALE = 0.5
export const MAX_SCALE = 4

/** เผื่อให้เลื่อนเลยขอบกระดาษได้นิดหน่อย จะได้วาดชิดขอบได้ถนัด */
export const PAN_MARGIN = 60

export const DEFAULT_VIEW: View = { scale: 1, x: 0, y: 0 }

export function clampScale(scale: number): number {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale))
}

/** ขนาดของกรอบที่มองเห็น หน่วยเป็นพิกัดกระดาษ */
export function visibleSize(view: View, paperWidth: number, paperHeight: number) {
  return { width: paperWidth / view.scale, height: paperHeight / view.scale }
}

/**
 * ดึงมุมมองให้ยังเห็นกระดาษอยู่
 *
 * ตอนย่อจนกระดาษเล็กกว่ากรอบ ให้จัดกึ่งกลางแทนการปล่อยให้เลื่อนไปไหนก็ได้
 * เพราะกระดาษที่ลอยไปอยู่มุมจอเป็นสิ่งที่เด็กแก้กลับเองไม่ได้
 */
export function clampView(view: View, paperWidth: number, paperHeight: number): View {
  const scale = clampScale(view.scale)
  const { width, height } = visibleSize({ ...view, scale }, paperWidth, paperHeight)

  const fit = (position: number, visible: number, paper: number): number => {
    if (visible >= paper) return (paper - visible) / 2
    return Math.min(paper - visible + PAN_MARGIN, Math.max(-PAN_MARGIN, position))
  }

  return {
    scale,
    x: fit(view.x, width, paperWidth),
    y: fit(view.y, height, paperHeight),
  }
}

/**
 * ซูมโดยตรึงจุดหนึ่งไว้กับที่
 *
 * จุดที่ตรึงคือจุดใต้ปลายนิ้วหรือใต้เคอร์เซอร์ ไม่ใช่กึ่งกลางจอ
 * ถ้าซูมเข้ากลางจอเสมอ สิ่งที่เด็กเล็งอยู่จะหลุดออกนอกจอทุกครั้งที่ซูม
 */
export function zoomAt(
  view: View,
  factor: number,
  focus: Point,
  paperWidth: number,
  paperHeight: number,
): View {
  const next = clampScale(view.scale * factor)
  const ratio = view.scale / next
  return clampView(
    {
      scale: next,
      x: focus.x - (focus.x - view.x) * ratio,
      y: focus.y - (focus.y - view.y) * ratio,
    },
    paperWidth,
    paperHeight,
  )
}

/** เลื่อนกระดาษไปตามระยะที่ลาก หน่วยเป็นพิกัดกระดาษ */
export function panBy(
  view: View,
  dx: number,
  dy: number,
  paperWidth: number,
  paperHeight: number,
): View {
  return clampView({ scale: view.scale, x: view.x + dx, y: view.y + dy }, paperWidth, paperHeight)
}

/** ค่า viewBox ของ SVG ที่ตรงกับมุมมองนี้ */
export function viewBoxOf(view: View, paperWidth: number, paperHeight: number): string {
  const { width, height } = visibleSize(view, paperWidth, paperHeight)
  return `${view.x.toFixed(2)} ${view.y.toFixed(2)} ${width.toFixed(2)} ${height.toFixed(2)}`
}

/**
 * แปลงตำแหน่งบนจอเป็นพิกัดกระดาษ
 *
 * รับเป็นสัดส่วนของกรอบ (0 ถึง 1) ไม่ใช่พิกเซล ฟังก์ชันนี้จึงไม่ต้องรู้จัก DOM
 * และชุดทดสอบเรียกได้โดยไม่ต้องมีเบราว์เซอร์
 */
export function screenToPaper(
  view: View,
  fractionX: number,
  fractionY: number,
  paperWidth: number,
  paperHeight: number,
): Point {
  const { width, height } = visibleSize(view, paperWidth, paperHeight)
  return { x: view.x + fractionX * width, y: view.y + fractionY * height }
}

/** มุมมองที่ทำให้จุดกระดาษจุดหนึ่ง ไปอยู่ตรงสัดส่วนที่กำหนดบนจอพอดี */
export function viewPlacing(
  scale: number,
  paperPoint: Point,
  fractionX: number,
  fractionY: number,
  paperWidth: number,
  paperHeight: number,
): View {
  const view = { scale: clampScale(scale), x: 0, y: 0 }
  const { width, height } = visibleSize(view, paperWidth, paperHeight)
  return clampView(
    {
      scale: view.scale,
      x: paperPoint.x - fractionX * width,
      y: paperPoint.y - fractionY * height,
    },
    paperWidth,
    paperHeight,
  )
}

/** ข้อความเปอร์เซ็นต์สำหรับแสดงบนปุ่ม */
export function zoomLabel(view: View): string {
  return `${Math.round(view.scale * 100)}%`
}
