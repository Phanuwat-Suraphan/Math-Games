/**
 * ทศนิยม — คำนวณด้วยจำนวนเต็มแล้วค่อยเลื่อนจุด
 *
 * JavaScript คำนวณทศนิยมแบบ floating point ทำให้ 0.1 + 0.2 ได้
 * 0.30000000000000004 ถ้าเอาค่านี้ไปเป็นคำตอบ เด็กจะเจอตัวเลือกประหลาด
 * และตรวจคำตอบไม่ผ่านทั้งที่คิดถูก
 *
 * วิธีแก้: คูณให้เป็นจำนวนเต็มก่อนคำนวณ แล้วหารกลับตอนท้าย
 */

/** จำนวนตำแหน่งทศนิยมของค่าหนึ่ง */
export function decimalPlaces(value: number): number {
  if (!Number.isFinite(value)) return 0
  // ใช้รูปข้อความเพื่อเลี่ยงความคลาดเคลื่อนของ floating point
  const text = String(value)

  const exponent = text.indexOf('e-')
  if (exponent >= 0) {
    const digitsBefore = text.slice(0, exponent).split('.')[1]?.length ?? 0
    return digitsBefore + Number(text.slice(exponent + 2))
  }

  const dot = text.indexOf('.')
  return dot < 0 ? 0 : text.length - dot - 1
}

/** ยกทศนิยมขึ้นเป็นจำนวนเต็ม เช่น scaleToInt(1.25, 2) = 125 */
function scaleToInt(value: number, places: number): number {
  return Math.round(value * 10 ** places)
}

/** ปัดให้เหลือทศนิยมตามจำนวนตำแหน่งที่กำหนด */
export function roundTo(value: number, places = 2): number {
  if (!Number.isFinite(value)) return 0
  const safePlaces = Math.max(0, Math.min(10, Math.trunc(places)))
  const factor = 10 ** safePlaces
  // บวกค่าเล็กมากเพื่อกันกรณี 1.005 ที่เก็บจริงเป็น 1.00499999…
  return Math.round((value + Number.EPSILON * Math.sign(value || 1)) * factor) / factor
}

export function addDecimals(a: number, b: number): number {
  const places = Math.max(decimalPlaces(a), decimalPlaces(b))
  return (scaleToInt(a, places) + scaleToInt(b, places)) / 10 ** places
}

export function subtractDecimals(a: number, b: number): number {
  const places = Math.max(decimalPlaces(a), decimalPlaces(b))
  return (scaleToInt(a, places) - scaleToInt(b, places)) / 10 ** places
}

export function multiplyDecimals(a: number, b: number): number {
  const placesA = decimalPlaces(a)
  const placesB = decimalPlaces(b)
  return (
    (scaleToInt(a, placesA) * scaleToInt(b, placesB)) / 10 ** (placesA + placesB)
  )
}

export function divideDecimals(a: number, b: number, places = 4): number {
  if (b === 0) {
    throw new Error('หารด้วยศูนย์ไม่ได้')
  }
  const shared = Math.max(decimalPlaces(a), decimalPlaces(b))
  const result = scaleToInt(a, shared) / scaleToInt(b, shared)
  return roundTo(result, places)
}

/** คืน -1 เมื่อ a น้อยกว่า b, 0 เมื่อเท่ากัน, 1 เมื่อ a มากกว่า */
export function compareDecimals(a: number, b: number): -1 | 0 | 1 {
  const places = Math.max(decimalPlaces(a), decimalPlaces(b))
  const left = scaleToInt(a, places)
  const right = scaleToInt(b, places)

  if (left < right) return -1
  if (left > right) return 1
  return 0
}

export function decimalsEqual(a: number, b: number): boolean {
  return compareDecimals(a, b) === 0
}

/**
 * ข้อความสำหรับแสดงบนหน้าจอ
 * บังคับจำนวนตำแหน่งได้ เพื่อให้ 1.5 กับ 1.50 แสดงเป็นแบบเดียวกันทั้งข้อ
 */
export function formatDecimal(value: number, places?: number): string {
  if (!Number.isFinite(value)) return '0'
  if (places === undefined) {
    return String(roundTo(value, 4))
  }
  return roundTo(value, places).toFixed(Math.max(0, Math.min(10, places)))
}

/** ค่าประจำหลักของทศนิยม ใช้สอนเรื่องหลักส่วนสิบ ส่วนร้อย */
export const DECIMAL_PLACE_NAMES = ['ส่วนสิบ', 'ส่วนร้อย', 'ส่วนพัน'] as const

export function getDecimalPlaceName(place: number): string {
  return DECIMAL_PLACE_NAMES[place - 1] ?? `ทศนิยมตำแหน่งที่ ${place}`
}

/** ตัวเลขที่อยู่ในหลักทศนิยมตำแหน่งที่กำหนด เช่น digitAtPlace(3.47, 2) = 7 */
export function digitAtPlace(value: number, place: number): number {
  const safePlace = Math.max(1, Math.trunc(place))
  const scaled = Math.abs(scaleToInt(value, safePlace))
  return scaled % 10
}
