/**
 * หน้าตาน่ารักของดาวในฉากสามมิติ (เปิดเฉพาะในภารกิจแปดดาว)
 *
 * หน้าหันเข้าหากล้องเสมอเหมือนสติกเกอร์แปะบนลูกบอล ไม่ได้หมุนไปกับผิวดาว
 * ถ้าหน้าหมุนตามผิว ดาวจะหันหลังให้เด็กครึ่งเวลา และดาวที่หมุนเร็วอย่างดาวพฤหัสบดีจะดูเวียนหัว
 *
 * ทุกขนาดคิดเป็นสัดส่วนของรัศมีดาวบนจอ ใช้แค่ arc กับ ellipse
 * ซึ่งชุดทดสอบการวาดตรวจรัศมีติดลบได้ครบ
 */

export type FaceMood = 'happy' | 'wow' | 'sleep'

const TAU = Math.PI * 2
const INK = '#1b1537'

/** ดาวที่เล็กกว่านี้บนจอ หน้าจะเล็กจนกลายเป็นจุดสกปรก ไม่วาดดีกว่า */
export const FACE_MIN_RADIUS = 7

/**
 * กะพริบตาไหม ณ เวลานี้
 * แต่ละดวงกะพริบไม่พร้อมกัน ดูเหมือนมีชีวิตมากกว่ากะพริบพร้อมกันทั้งระบบสุริยะ
 */
export function isBlinking(now: number, order: number, reduceMotion: boolean): boolean {
  if (reduceMotion) return false
  const period = 4.6
  const t = (now / 1000 + order * 0.83) % period
  return t < 0.14
}

export interface FaceStyle {
  mood: FaceMood
  blink: boolean
  /** มิลลิวินาทีของนาฬิกาจริง ใช้ขยับตัว z ของดาวที่หลับ */
  now: number
  reduceMotion: boolean
  pixelRatio: number
}

export function drawFace(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, style: FaceStyle): void {
  const r = Math.max(0, radius)
  if (r < FACE_MIN_RADIUS * style.pixelRatio) return
  const line = Math.max(style.pixelRatio, r * 0.055)

  ctx.save()
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  // แก้มแดง
  ctx.fillStyle = 'rgba(255, 128, 160, 0.5)'
  for (const side of [-1, 1]) {
    ctx.beginPath()
    ctx.ellipse(x + side * r * 0.5, y + r * 0.2, r * 0.14, r * 0.085, 0, 0, TAU)
    ctx.fill()
  }

  // ตา
  const eyeY = y - r * 0.06
  const eyeGap = r * 0.3
  ctx.strokeStyle = INK
  ctx.fillStyle = INK
  ctx.lineWidth = line
  if (style.mood === 'sleep' || style.blink) {
    // ตาปิดเป็นเส้นโค้งคว่ำ ดูหลับสบาย ไม่ใช่ตาเศร้า
    for (const side of [-1, 1]) {
      ctx.beginPath()
      ctx.arc(x + side * eyeGap, eyeY - r * 0.04, r * 0.09, 0.15 * Math.PI, 0.85 * Math.PI)
      ctx.stroke()
    }
  } else {
    const eye = style.mood === 'wow' ? r * 0.13 : r * 0.105
    for (const side of [-1, 1]) {
      const eyeX = x + side * eyeGap
      ctx.fillStyle = INK
      ctx.beginPath()
      ctx.ellipse(eyeX, eyeY, eye * 0.86, eye, 0, 0, TAU)
      ctx.fill()
      // ประกายในตา สองจุดทำให้ตาดูวาวแบบการ์ตูน
      ctx.fillStyle = '#ffffff'
      ctx.beginPath()
      ctx.arc(eyeX - eye * 0.28, eyeY - eye * 0.36, eye * 0.36, 0, TAU)
      ctx.fill()
      ctx.beginPath()
      ctx.arc(eyeX + eye * 0.3, eyeY + eye * 0.32, eye * 0.15, 0, TAU)
      ctx.fill()
    }
  }

  // ปาก
  const mouthY = y + r * 0.2
  ctx.strokeStyle = INK
  ctx.fillStyle = INK
  if (style.mood === 'wow') {
    ctx.beginPath()
    ctx.ellipse(x, mouthY + r * 0.02, r * 0.11, r * 0.1, 0, 0, TAU)
    ctx.fill()
    ctx.fillStyle = '#ff7a98'
    ctx.beginPath()
    ctx.ellipse(x, mouthY + r * 0.07, r * 0.065, r * 0.04, 0, 0, TAU)
    ctx.fill()
  } else if (style.mood === 'sleep') {
    ctx.lineWidth = line * 0.9
    ctx.beginPath()
    ctx.ellipse(x, mouthY, r * 0.04, r * 0.05, 0, 0, TAU)
    ctx.stroke()
  } else {
    // ปากแมว ω สองโค้งติดกัน
    ctx.lineWidth = line
    for (const side of [-1, 1]) {
      ctx.beginPath()
      ctx.arc(x + side * r * 0.07, mouthY - r * 0.03, r * 0.07, 0.1 * Math.PI, 0.9 * Math.PI)
      ctx.stroke()
    }
  }

  ctx.restore()

  if (style.mood === 'sleep') drawSnore(ctx, x, y, r, style)
}

/** ตัว z ลอยขึ้นจากดาวที่ยังหลับ บอกเด็กว่า "ยังไม่มีใครมาปลุกดวงนี้" */
function drawSnore(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, style: FaceStyle): void {
  const size = Math.max(9 * style.pixelRatio, r * 0.42)
  ctx.save()
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  for (let index = 0; index < 3; index += 1) {
    const rise = style.reduceMotion ? index / 3 : (style.now / 2400 + index / 3) % 1
    ctx.globalAlpha = style.reduceMotion ? 0.85 - index * 0.2 : Math.sin(rise * Math.PI) * 0.9
    ctx.fillStyle = '#e0f2fe'
    ctx.font = `800 ${Math.round(size * (0.7 + rise * 0.5))}px sans-serif`
    ctx.fillText('z', x + r * (0.75 + rise * 0.5), y - r * (0.55 + rise * 0.9))
  }
  ctx.restore()
}
