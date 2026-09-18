/**
 * รูปจากแบบฝึกที่วางลงกระดาษ
 *
 * ครูส่วนใหญ่มีโจทย์อยู่ในหนังสือแบบฝึกหัดอยู่แล้ว การให้ก็อปรูปมาวาง
 * แล้ววัดด้วยครึ่งวงกลมบนจอ ทำให้ของบนเว็บต่อกับสิ่งที่ใช้สอนจริงในห้องได้ทันที
 *
 * ไฟล์นี้เก็บเฉพาะการคิดขนาด ไม่แตะ React และไม่แตะ canvas
 * ชุดทดสอบจึงตรวจได้ว่ารูปไม่มีทางยืดผิดสัดส่วน ซึ่งถ้าเกิดขึ้นจะทำให้มุมที่วัดได้ผิดไปด้วย
 */

export interface Box {
  width: number
  height: number
}

/**
 * ด้านยาวสุดของรูปที่เก็บลงเครื่อง
 *
 * รูปจากกล้องมือถือกว้างสามสี่พันพิกเซล ถ้าเก็บทั้งดุ้นลงที่เก็บของเบราว์เซอร์
 * จะเต็มโควตาตั้งแต่รูปที่สอง แล้วงานทั้งกระดาษจะบันทึกอัตโนมัติไม่ได้อีกเลย
 */
export const MAX_PHOTO_SIDE = 1280

/** คุณภาพตอนบีบเป็น JPEG พอให้เส้นในหนังสือยังคม */
export const PHOTO_QUALITY = 0.82

/** สัดส่วนของกระดาษที่รูปใหม่จะกินตอนวางครั้งแรก */
export const PHOTO_SHARE = 0.55

/** ไฟล์นี้เป็นรูปภาพหรือไม่ */
export function isImageType(type: string): boolean {
  return typeof type === 'string' && type.startsWith('image/')
}

/**
 * ย่อให้ด้านยาวสุดไม่เกินที่กำหนด โดยคงสัดส่วนเดิม
 * รูปที่เล็กอยู่แล้วไม่ถูกขยาย เพราะการขยายมีแต่ทำให้เบลอและไฟล์ใหญ่ขึ้นเปล่า ๆ
 */
export function shrinkTo(width: number, height: number, maxSide = MAX_PHOTO_SIDE): Box {
  if (width <= 0 || height <= 0) return { width: 1, height: 1 }
  const longest = Math.max(width, height)
  if (longest <= maxSide) return { width: Math.round(width), height: Math.round(height) }
  const factor = maxSide / longest
  return {
    width: Math.max(1, Math.round(width * factor)),
    height: Math.max(1, Math.round(height * factor)),
  }
}

/** ขนาดตอนวางลงกระดาษครั้งแรก ให้พอดีตาและยังเหลือที่ว่างให้วาดข้าง ๆ */
export function fitOnPaper(
  width: number,
  height: number,
  paperWidth: number,
  paperHeight: number,
  share = PHOTO_SHARE,
): Box {
  if (width <= 0 || height <= 0) return { width: 1, height: 1 }
  const factor = Math.min((paperWidth * share) / width, (paperHeight * share) / height)
  return { width: width * factor, height: height * factor }
}

/** ขนาดข้อมูลโดยประมาณของ data URL หน่วยเป็นไบต์ */
export function approxBytes(dataUrl: string): number {
  const comma = dataUrl.indexOf(',')
  if (comma < 0) return 0
  /* base64 สี่ตัวอักษรแทนข้อมูลสามไบต์ */
  return Math.round(((dataUrl.length - comma - 1) * 3) / 4)
}
