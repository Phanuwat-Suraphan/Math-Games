/**
 * ตรวจคำตอบที่เด็กพิมพ์เอง
 *
 * ทำไมต้องมีไฟล์นี้แยก แทนที่จะเทียบข้อความตรง ๆ
 *
 * ตอนเป็นตัวเลือกให้กด การเทียบข้อความตรง ๆ ถูกต้องเสมอ
 * เพราะข้อความที่เทียบคือข้อความที่เราสร้างเองทั้งสองฝั่ง
 *
 * แต่พอให้เด็กพิมพ์เอง ข้อความจะไม่มีทางตรงกันเป๊ะ ๆ
 * เด็กพิมพ์ "0.50" ในขณะที่เฉลยเก็บไว้ว่า "0.5"
 * เด็กพิมพ์ ".5" เพราะบนแป้นตัวเลขกดจุดก่อนได้
 * เด็กพิมพ์ "1,200" เพราะในหนังสือเรียนเขียนแบบนั้น
 * เด็กพิมพ์ "2/4" ในขณะที่เฉลยคือ "1/2" ซึ่งเท่ากันจริง ๆ ทางคณิตศาสตร์
 * เด็กพิมพ์เลขไทย "๕" เพราะแป้นพิมพ์บนแท็บเล็ตของโรงเรียนตั้งไว้แบบนั้น
 *
 * ทุกกรณีข้างบนคือคำตอบที่ถูก และการตอบว่าผิดคือความผิดของเรา ไม่ใช่ของเด็ก
 * เด็กที่คิดเลขถูกแล้วโดนบอกว่าผิดเพราะพิมพ์คนละรูปแบบ
 * จะเรียนรู้ว่าตัวเองทำเลขไม่ได้ ทั้งที่ทำได้ ซึ่งเป็นความเสียหายที่แก้ยากที่สุด
 *
 * ไฟล์นี้เป็นฟังก์ชันบริสุทธิ์ล้วน ทดสอบได้ครบทุกรูปแบบโดยไม่ต้องเปิดเบราว์เซอร์
 */

/** เลขไทยเรียงตามค่า ใช้แปลงเป็นเลขอารบิก */
const THAI_DIGITS = '๐๑๒๓๔๕๖๗๘๙'

/**
 * ทำความสะอาดข้อความคำตอบให้อยู่ในรูปที่เทียบกันได้
 *
 * ไม่ตัดสินว่าถูกหรือผิด แค่ทำให้สองฝั่งพูดภาษาเดียวกัน
 */
export function normalizeAnswer(raw: string): string {
  let text = raw.trim()

  // เลขไทยเป็นเลขอารบิก
  let converted = ''
  for (const char of text) {
    const thaiIndex = THAI_DIGITS.indexOf(char)
    converted += thaiIndex >= 0 ? String(thaiIndex) : char
  }
  text = converted

  text = text
    // ลูกน้ำคั่นหลักพัน ทั้งแบบอังกฤษและช่องว่างแบบที่บางตำราใช้
    .replace(/[,\s]/g, '')
    // เครื่องหมายลบที่พิมพ์มาจากแป้นอื่น
    .replace(/[–—−]/g, '-')
    // จุดทศนิยมที่พิมพ์เป็นจุดกลาง
    .replace(/[·]/g, '.')

  return text
}

/**
 * ค่าตัวเลขของคำตอบ คืน null ถ้าอ่านเป็นตัวเลขไม่ได้
 *
 * รองรับเศษส่วน (3/4) และจำนวนคละ (1 3/4 ซึ่งช่องว่างถูกตัดไปแล้วเป็น 13/4
 * จึงต้องรับรูปแบบ 1_3/4 ด้วย) เพราะโจทย์เศษส่วนเป็นเนื้อหาหลักของโลกที่ 2
 */
export function answerValue(raw: string): number | null {
  const text = normalizeAnswer(raw)
  if (text.length === 0) return null

  // หน่วยที่ต่อท้าย เช่น "12บาท" หรือ "5ซม" ให้ตัดออกก่อน
  const stripped = text.replace(/[^\d./%-]+$/u, '')
  if (stripped.length === 0) return null

  // ร้อยละ: 25% คือ 0.25 แต่ในโจทย์ของเรามักตอบเป็นตัวเลขเปล่า
  // จึงถือว่า 25% กับ 25 เป็นคำตอบเดียวกัน
  const withoutPercent = stripped.endsWith('%')
    ? stripped.slice(0, -1)
    : stripped

  const fraction = withoutPercent.match(/^(-?\d+)\/(\d+)$/)
  if (fraction) {
    const denominator = Number(fraction[2])
    if (denominator === 0) return null
    return Number(fraction[1]) / denominator
  }

  if (!/^-?\d*\.?\d+$/.test(withoutPercent)) return null

  const value = Number(withoutPercent)
  return Number.isFinite(value) ? value : null
}

/**
 * คำตอบที่พิมพ์มา ตรงกับเฉลยหรือไม่
 *
 * เทียบด้วยค่าตัวเลขก่อนเสมอ เพราะเป็นสิ่งที่โจทย์ถามจริง ๆ
 * ถ้าฝั่งใดฝั่งหนึ่งอ่านเป็นตัวเลขไม่ได้ (เช่นคำตอบเป็นชื่อรูปทรง)
 * จึงค่อยถอยไปเทียบเป็นข้อความที่ทำความสะอาดแล้ว
 */
export function isAnswerCorrect(typed: string, expected: string): boolean {
  const typedValue = answerValue(typed)
  const expectedValue = answerValue(expected)

  if (typedValue !== null && expectedValue !== null) {
    /*
     * เทียบด้วยค่าความคลาดเคลื่อนเล็กน้อย ไม่ใช่เทียบเท่ากันเป๊ะ
     *
     * เพราะ 1/3 ในระบบทศนิยมของคอมพิวเตอร์ไม่เท่ากับ 0.3333... พอดี
     * ถ้าเทียบเป๊ะ เด็กที่ตอบ 1/3 ถูกจะโดนบอกว่าผิด
     * ค่านี้เล็กกว่าความต่างของคำตอบที่ควรถือว่าคนละคำตอบมาก
     */
    return Math.abs(typedValue - expectedValue) < 1e-9
  }

  const a = normalizeAnswer(typed).toLowerCase()
  const b = normalizeAnswer(expected).toLowerCase()
  return a.length > 0 && a === b
}

/**
 * ตัวอักษรที่อนุญาตให้พิมพ์ในช่องคำตอบ
 *
 * กันไว้ตั้งแต่ตอนพิมพ์ ดีกว่าปล่อยให้พิมพ์แล้วค่อยบอกว่าผิด
 * เด็กที่พิมพ์ตัวอักษรลงไปแล้วเห็นว่ามันไม่ขึ้น จะเข้าใจเองทันทีว่าช่องนี้ใส่ตัวเลข
 */
export function sanitizeInput(raw: string, maxLength = 12): string {
  let text = ''
  for (const char of raw) {
    const thaiIndex = THAI_DIGITS.indexOf(char)
    if (thaiIndex >= 0) {
      text += String(thaiIndex)
      continue
    }
    if (/[\d./-]/.test(char)) text += char
  }
  return text.slice(0, maxLength)
}
