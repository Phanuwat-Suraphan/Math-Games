/**
 * ตรวจท่า "จีบนิ้ว" จากจุดสำคัญของมือ 21 จุด (รูปแบบเดียวกับ MediaPipe Hands)
 *   0 = ข้อมือ · 4 = ปลายนิ้วโป้ง · 8 = ปลายนิ้วชี้ · 9 = โคนนิ้วกลาง
 *
 * วัดระยะปลายนิ้วโป้ง–ปลายนิ้วชี้ หารด้วยขนาดฝ่ามือ (ข้อมือ–โคนนิ้วกลาง)
 * จึงใช้ได้ทั้งมือที่อยู่ใกล้และไกลกล้อง
 * มีช่วงกันสั่น (hysteresis): ต้องชิดกว่า PINCH_ON ถึงนับว่าจีบ และต้องห่างเกิน PINCH_OFF ถึงนับว่าปล่อย
 * ตรรกะล้วน ไม่แตะกล้องหรือหน้าจอ ชุดทดสอบจึงตรวจได้
 */

export interface Landmark {
  x: number
  y: number
  z?: number
}

export const PINCH_ON = 0.32
export const PINCH_OFF = 0.48
/** ต้องจีบค้างอย่างน้อยกี่เฟรมจึงนับ (กันกระพริบ) */
export const PINCH_FRAMES = 2

function dist(a: Landmark, b: Landmark): number {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

/** ระยะนิ้วโป้ง–นิ้วชี้ เทียบกับขนาดฝ่ามือ (0 = แตะกัน) */
export function pinchRatio(lm: readonly Landmark[]): number {
  if (lm.length < 10) return Infinity
  const palm = dist(lm[0], lm[9])
  if (palm <= 1e-6) return Infinity
  return dist(lm[4], lm[8]) / palm
}

/** ตำแหน่งตัวชี้ = กึ่งกลางระหว่างปลายนิ้วโป้งกับปลายนิ้วชี้ (พิกัด 0–1 ของภาพกล้อง) */
export function cursorOf(lm: readonly Landmark[]): { x: number; y: number } {
  return { x: (lm[4].x + lm[8].x) / 2, y: (lm[4].y + lm[8].y) / 2 }
}

/** ความคืบหน้าการจีบ 0–1 (ไว้ทำวงแหวนหดบนตัวชี้) */
export function pinchProgress(ratio: number): number {
  if (!Number.isFinite(ratio)) return 0
  const t = (PINCH_OFF + 0.25 - ratio) / (PINCH_OFF + 0.25 - PINCH_ON)
  return Math.max(0, Math.min(1, t))
}

export type PinchEvent = 'down' | 'up' | null

/** ตัวจับจังหวะจีบ/ปล่อย ส่ง 'down' ครั้งเดียวต่อการจีบหนึ่งครั้ง */
export class PinchDetector {
  pinched = false
  private streak = 0

  update(ratio: number): PinchEvent {
    if (!this.pinched) {
      this.streak = ratio < PINCH_ON ? this.streak + 1 : 0
      if (this.streak >= PINCH_FRAMES) {
        this.pinched = true
        this.streak = 0
        return 'down'
      }
      return null
    }
    if (ratio > PINCH_OFF) {
      this.pinched = false
      this.streak = 0
      return 'up'
    }
    return null
  }

  /** มือหายไปจากกล้อง: ถือว่าปล่อย */
  lost(): PinchEvent {
    this.streak = 0
    if (!this.pinched) return null
    this.pinched = false
    return 'up'
  }
}

/**
 * แปลงพิกัดในภาพกล้อง (0–1) เป็นพิกัดบนจอ เมื่อวิดีโอแสดงแบบ object-fit: cover
 * mirror = กล้องหน้า (ภาพกลับซ้ายขวาเหมือนกระจก)
 */
export function videoToScreen(
  p: { x: number; y: number },
  video: { w: number; h: number },
  box: { left: number; top: number; w: number; h: number },
  mirror: boolean,
): { x: number; y: number } {
  if (video.w <= 0 || video.h <= 0) return { x: box.left + box.w / 2, y: box.top + box.h / 2 }
  const scale = Math.max(box.w / video.w, box.h / video.h)
  const dw = video.w * scale
  const dh = video.h * scale
  const ox = (box.w - dw) / 2
  const oy = (box.h - dh) / 2
  const nx = mirror ? 1 - p.x : p.x
  return { x: box.left + ox + nx * dw, y: box.top + oy + p.y * dh }
}

/** เลือกเป้าหมายใกล้ตัวชี้ที่สุดในรัศมีที่กำหนด (จุดศูนย์กลางของแต่ละชิ้น) */
export function nearestTarget<T extends { x: number; y: number }>(point: { x: number; y: number }, targets: readonly T[], radius: number): T | null {
  let best: T | null = null
  let bestD = radius
  for (const t of targets) {
    const d = Math.hypot(t.x - point.x, t.y - point.y)
    if (d <= bestD) {
      best = t
      bestD = d
    }
  }
  return best
}
