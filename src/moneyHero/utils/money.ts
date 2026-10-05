/**
 * คณิตศาสตร์ของเงิน ทำงานกับ "สตางค์จำนวนเต็ม" อย่างเดียว
 *
 * 100 สตางค์ = 1 บาท
 * 25.50 บาท = 2550 สตางค์
 *
 * ทุกฟังก์ชันในไฟล์นี้ไม่ใช้ทศนิยมของ JavaScript ในการคำนวณเลย
 * ทศนิยมปรากฏเฉพาะตอน "แสดงผล" ซึ่งสร้างจากการหารเอาส่วนและเศษแบบจำนวนเต็ม
 */

export const SATANG_PER_BAHT = 100

/** รวมบาทกับสตางค์เป็นสตางค์ */
export function toSatang(baht: number, satang = 0): number {
  if (!Number.isInteger(baht) || !Number.isInteger(satang)) {
    throw new Error(`toSatang ต้องได้จำนวนเต็ม แต่ได้ ${baht}, ${satang}`)
  }
  return baht * SATANG_PER_BAHT + satang
}

/** แยกสตางค์กลับเป็นบาทกับสตางค์ */
export function splitSatang(value: number): { baht: number; satang: number } {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`จำนวนเงินต้องเป็นสตางค์จำนวนเต็มที่ไม่ติดลบ แต่ได้ ${value}`)
  }
  return { baht: Math.floor(value / SATANG_PER_BAHT), satang: value % SATANG_PER_BAHT }
}

/** ใส่จุลภาคคั่นหลักพัน 1125 → "1,125" */
export function commas(n: number): string {
  const negative = n < 0
  const digits = String(Math.abs(Math.trunc(n)))
  let out = ''
  for (let i = 0; i < digits.length; i += 1) {
    const fromRight = digits.length - i
    out += digits[i]
    if (fromRight > 1 && fromRight % 3 === 1) out += ','
  }
  return negative ? `-${out}` : out
}

/** สตางค์สองหลักเสมอ 5 → "05" */
export function twoDigits(n: number): string {
  return n < 10 ? `0${n}` : String(n)
}

/**
 * แบบบาท–สตางค์
 * 112550 → "1,125 บาท 50 สตางค์"
 * 10000  → "100 บาท"
 * 50     → "50 สตางค์"
 */
export function formatBS(value: number): string {
  const { baht, satang } = splitSatang(value)
  if (baht === 0 && satang === 0) return '0 บาท'
  if (satang === 0) return `${commas(baht)} บาท`
  if (baht === 0) return `${satang} สตางค์`
  return `${commas(baht)} บาท ${satang} สตางค์`
}

/** แบบใช้จุด ไม่มีคำว่าบาท 2550 → "25.50" */
export function formatDotNumber(value: number): string {
  const { baht, satang } = splitSatang(value)
  return `${commas(baht)}.${twoDigits(satang)}`
}

/** แบบใช้จุด 2550 → "25.50 บาท" */
export function formatDot(value: number): string {
  return `${formatDotNumber(value)} บาท`
}

/** บาทล้วน ใช้กับราคาที่ไม่มีสตางค์ 2500 → "25 บาท" */
export function formatBaht(value: number): string {
  return formatBS(value)
}

export type DotParse =
  | { ok: true; value: number }
  | {
      ok: false
      reason: 'empty' | 'format' | 'noDot' | 'satangDigits' | 'commaPlace'
    }

/**
 * อ่านจำนวนเงินแบบใช้จุดที่เด็กพิมพ์
 *
 * ยอมรับ "25.50", "1,125.50", "1125.50", "25.50 บาท"
 * ไม่ยอมรับ "25.5" (สตางค์ต้องมี 2 หลัก) และ "25" (ต้องมีจุด)
 * เพราะด่านนี้สอนรูปแบบการเขียนโดยเฉพาะ
 */
export function parseDot(text: string): DotParse {
  const cleaned = text.replace(/บาท/g, '').replace(/\s+/g, '').trim()
  if (cleaned === '') return { ok: false, reason: 'empty' }
  if (!/^[0-9,]*\.?[0-9]*$/.test(cleaned)) return { ok: false, reason: 'format' }

  const parts = cleaned.split('.')
  if (parts.length === 1) return { ok: false, reason: 'noDot' }
  if (parts.length !== 2) return { ok: false, reason: 'format' }

  const [bahtText, satangText] = parts
  if (satangText.length !== 2) return { ok: false, reason: 'satangDigits' }
  if (bahtText.includes(',') && !/^\d{1,3}(,\d{3})+$/.test(bahtText)) {
    return { ok: false, reason: 'commaPlace' }
  }
  const bahtDigits = bahtText.replace(/,/g, '')
  if (bahtDigits === '') return { ok: false, reason: 'format' }

  const baht = Number.parseInt(bahtDigits, 10)
  const satang = Number.parseInt(satangText, 10)
  if (!Number.isFinite(baht) || !Number.isFinite(satang)) {
    return { ok: false, reason: 'format' }
  }
  return { ok: true, value: toSatang(baht, satang) }
}

/** อ่านจำนวนเต็มที่เด็กพิมพ์ ยอมให้มีจุลภาค ช่องว่างถือเป็น 0 ถ้า emptyAsZero */
export function parseWhole(text: string, emptyAsZero = false): number | null {
  const cleaned = text.replace(/,/g, '').replace(/\s+/g, '')
  if (cleaned === '') return emptyAsZero ? 0 : null
  if (!/^\d+$/.test(cleaned)) return null
  return Number.parseInt(cleaned, 10)
}

/* ------------------------------------------------------------------ */
/* การคำนวณ (สตางค์ล้วน)                                               */
/* ------------------------------------------------------------------ */

export function addMoney(...values: number[]): number {
  return values.reduce((sum, v) => sum + v, 0)
}

export function subtractMoney(a: number, b: number): number {
  if (b > a) throw new Error('ผลลบติดลบ ไม่ควรเกิดในโจทย์ ป.3')
  return a - b
}

export function multiplyMoney(value: number, times: number): number {
  if (!Number.isInteger(times)) throw new Error('ตัวคูณต้องเป็นจำนวนนับ')
  return value * times
}

/** หารเท่า ๆ กัน ต้องลงตัวเป็นสตางค์ ถ้าไม่ลงตัวถือว่าโจทย์ผิด */
export function divideMoney(value: number, parts: number): number {
  if (!Number.isInteger(parts) || parts <= 0) throw new Error('ตัวหารต้องเป็นจำนวนนับ')
  if (value % parts !== 0) {
    throw new Error(`${value} สตางค์ หารด้วย ${parts} ไม่ลงตัว`)
  }
  return value / parts
}

/** เปรียบเทียบ: คืน '>' '<' หรือ '=' */
export function compareMoney(a: number, b: number): '>' | '<' | '=' {
  if (a > b) return '>'
  if (a < b) return '<'
  return '='
}
