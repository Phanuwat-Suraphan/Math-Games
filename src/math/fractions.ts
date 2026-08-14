/**
 * เศษส่วน — คำนวณด้วยจำนวนเต็มล้วน
 *
 * ห้ามคำนวณเศษส่วนผ่านทศนิยม เพราะ 1/3 กลายเป็น 0.333… แล้วเทียบกันไม่ตรง
 * ทุกฟังก์ชันในไฟล์นี้ทำงานกับตัวเศษและตัวส่วนที่เป็นจำนวนเต็มเสมอ
 */

export interface Fraction {
  numerator: number
  denominator: number
}

/** จำนวนคละ เช่น 2 1/3 */
export interface MixedNumber {
  whole: number
  numerator: number
  denominator: number
}

export class FractionError extends Error {}

export function gcd(a: number, b: number): number {
  let x = Math.abs(Math.trunc(a))
  let y = Math.abs(Math.trunc(b))
  while (y !== 0) {
    const temp = y
    y = x % y
    x = temp
  }
  return x
}

export function lcm(a: number, b: number): number {
  const divisor = gcd(a, b)
  if (divisor === 0) return 0
  return Math.abs((Math.trunc(a) / divisor) * Math.trunc(b))
}

export function isValidFraction(value: unknown): value is Fraction {
  if (typeof value !== 'object' || value === null) return false
  const fraction = value as Fraction
  return (
    Number.isInteger(fraction.numerator) &&
    Number.isInteger(fraction.denominator) &&
    fraction.denominator !== 0
  )
}

/**
 * สร้างเศษส่วน พร้อมจัดรูปให้เครื่องหมายลบอยู่ที่ตัวเศษเสมอ
 * ตัวส่วนเป็นศูนย์ถือเป็นความผิดพลาดของผู้เรียกใช้ จึงโยน error ทันที
 * ไม่ปล่อยผ่านให้กลายเป็น Infinity แล้วไปโผล่เป็นโจทย์เสียให้เด็กเห็น
 */
export function makeFraction(numerator: number, denominator: number): Fraction {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator)) {
    throw new FractionError('เศษส่วนต้องเป็นจำนวนจริง')
  }
  if (Math.trunc(denominator) === 0) {
    throw new FractionError('ตัวส่วนเป็นศูนย์ไม่ได้')
  }

  const n = Math.trunc(numerator)
  const d = Math.trunc(denominator)
  return d < 0 ? { numerator: -n, denominator: -d } : { numerator: n, denominator: d }
}

/** ทอนเศษส่วนให้เป็นรูปอย่างต่ำ เช่น 2/4 → 1/2 */
export function simplifyFraction(fraction: Fraction): Fraction {
  const safe = makeFraction(fraction.numerator, fraction.denominator)
  if (safe.numerator === 0) return { numerator: 0, denominator: 1 }

  const divisor = gcd(safe.numerator, safe.denominator)
  return {
    numerator: safe.numerator / divisor,
    denominator: safe.denominator / divisor,
  }
}

export function addFractions(a: Fraction, b: Fraction): Fraction {
  const left = makeFraction(a.numerator, a.denominator)
  const right = makeFraction(b.numerator, b.denominator)
  return simplifyFraction({
    numerator:
      left.numerator * right.denominator + right.numerator * left.denominator,
    denominator: left.denominator * right.denominator,
  })
}

export function subtractFractions(a: Fraction, b: Fraction): Fraction {
  const right = makeFraction(b.numerator, b.denominator)
  return addFractions(a, { numerator: -right.numerator, denominator: right.denominator })
}

export function multiplyFractions(a: Fraction, b: Fraction): Fraction {
  const left = makeFraction(a.numerator, a.denominator)
  const right = makeFraction(b.numerator, b.denominator)
  return simplifyFraction({
    numerator: left.numerator * right.numerator,
    denominator: left.denominator * right.denominator,
  })
}

export function divideFractions(a: Fraction, b: Fraction): Fraction {
  const right = makeFraction(b.numerator, b.denominator)
  if (right.numerator === 0) {
    throw new FractionError('หารด้วยเศษส่วนที่เท่ากับศูนย์ไม่ได้')
  }
  return multiplyFractions(a, {
    numerator: right.denominator,
    denominator: right.numerator,
  })
}

/** คืน -1 เมื่อ a น้อยกว่า b, 0 เมื่อเท่ากัน, 1 เมื่อ a มากกว่า */
export function compareFractions(a: Fraction, b: Fraction): -1 | 0 | 1 {
  const left = makeFraction(a.numerator, a.denominator)
  const right = makeFraction(b.numerator, b.denominator)

  // คูณไขว้ ตัวส่วนเป็นบวกเสมอหลัง makeFraction จึงไม่ต้องกลับเครื่องหมาย
  const leftValue = left.numerator * right.denominator
  const rightValue = right.numerator * left.denominator

  if (leftValue < rightValue) return -1
  if (leftValue > rightValue) return 1
  return 0
}

export function fractionsEqual(a: Fraction, b: Fraction): boolean {
  return compareFractions(a, b) === 0
}

export function fractionToDecimal(fraction: Fraction): number {
  const safe = makeFraction(fraction.numerator, fraction.denominator)
  return safe.numerator / safe.denominator
}

export function isProperFraction(fraction: Fraction): boolean {
  const safe = makeFraction(fraction.numerator, fraction.denominator)
  return Math.abs(safe.numerator) < safe.denominator
}

export function isImproperFraction(fraction: Fraction): boolean {
  const safe = makeFraction(fraction.numerator, fraction.denominator)
  return Math.abs(safe.numerator) >= safe.denominator
}

/** เศษเกิน → จำนวนคละ เช่น 7/3 → 2 1/3 */
export function toMixedNumber(fraction: Fraction): MixedNumber {
  const safe = simplifyFraction(fraction)
  const sign = safe.numerator < 0 ? -1 : 1
  const absNumerator = Math.abs(safe.numerator)

  const whole = Math.floor(absNumerator / safe.denominator)
  const remainder = absNumerator % safe.denominator

  return {
    whole: sign * whole,
    numerator: remainder,
    denominator: safe.denominator,
  }
}

/** จำนวนคละ → เศษเกิน */
export function fromMixedNumber(mixed: MixedNumber): Fraction {
  const sign = mixed.whole < 0 ? -1 : 1
  const absWhole = Math.abs(Math.trunc(mixed.whole))
  return makeFraction(
    sign * (absWhole * Math.trunc(mixed.denominator) + Math.trunc(mixed.numerator)),
    mixed.denominator,
  )
}

/** ข้อความสำหรับแสดงบนหน้าจอ เช่น 3/4 หรือ 5 (เมื่อหารลงตัว) */
export function formatFraction(fraction: Fraction): string {
  const safe = simplifyFraction(fraction)
  if (safe.denominator === 1) return String(safe.numerator)
  return `${safe.numerator}/${safe.denominator}`
}

/** ข้อความแบบจำนวนคละ เช่น 2 1/3 */
export function formatMixedNumber(fraction: Fraction): string {
  const safe = simplifyFraction(fraction)
  if (safe.denominator === 1) return String(safe.numerator)
  if (isProperFraction(safe)) return formatFraction(safe)

  const mixed = toMixedNumber(safe)
  if (mixed.numerator === 0) return String(mixed.whole)
  return `${mixed.whole} ${mixed.numerator}/${mixed.denominator}`
}
