import type { Rng } from '../math/rng'
import { addFractions, formatFraction, simplifyFraction, type Fraction } from '../math/fractions'
import { addDecimals, roundTo } from '../math/decimals'

/**
 * ตัวเลือกลวง
 *
 * หลักคิด: ตัวเลือกที่ผิดต้องมาจาก "ความผิดพลาดที่เด็กมักทำจริง"
 * ไม่ใช่สุ่มตัวเลขมั่ว ๆ
 *
 * เหตุผลทางการศึกษา: ถ้าตัวเลือกลวงเป็น 917 กับ −82 เด็กตัดทิ้งได้ทันที
 * โดยไม่ต้องคิดเลข ข้อนั้นจึงไม่ได้วัดอะไร แต่ถ้าตัวเลือกลวงคือคำตอบที่ได้
 * จากการลืมทด เด็กที่ลืมทดจริงจะเลือกข้อนั้น แล้วครูจะรู้ว่าต้องสอนอะไรซ้ำ
 */

/** ที่มาของตัวเลือกลวงแต่ละตัว เก็บไว้เพื่อวิเคราะห์ว่าเด็กพลาดแบบไหน */
export type DistractorStrategy =
  | 'forgotCarry'
  | 'forgotBorrow'
  | 'offByOne'
  | 'placeValue'
  | 'wrongOperation'
  | 'signError'
  | 'nearMiss'
  | 'digitSwap'
  | 'addedDenominators'
  | 'unsimplified'
  | 'decimalPlace'
  | 'perimeterAreaSwap'
  | 'forgotHalf'
  | 'percentBase'

export interface DistractorSeed {
  value: string
  strategy: DistractorStrategy
}

/** สลับตัวเลขสองหลักที่ติดกัน เช่น 431 → 413 */
function swapDigits(value: number, rng: Rng): number | null {
  const text = String(Math.abs(Math.trunc(value)))
  if (text.length < 2) return null

  const index = rng.int(0, text.length - 2)
  const chars = text.split('')
  const a = chars[index] as string
  const b = chars[index + 1] as string
  if (a === b) return null

  chars[index] = b
  chars[index + 1] = a
  const swapped = Number(chars.join(''))
  return swapped === Math.abs(value) ? null : Math.sign(value || 1) * swapped
}

/** ตัวเลือกลวงสำหรับโจทย์บวก */
export function additionDistractors(
  left: number,
  right: number,
  answer: number,
  rng: Rng,
): DistractorSeed[] {
  const seeds: DistractorSeed[] = []

  // ลืมทด: บวกทีละหลักโดยไม่ยกทดไปหลักถัดไป
  const noCarry = addWithoutCarry(left, right)
  if (noCarry !== answer) seeds.push({ value: String(noCarry), strategy: 'forgotCarry' })

  // ทดเกินไปหนึ่ง
  seeds.push({ value: String(answer + 10), strategy: 'placeValue' })
  seeds.push({ value: String(answer - 10), strategy: 'placeValue' })
  seeds.push({ value: String(answer + 1), strategy: 'offByOne' })
  seeds.push({ value: String(answer - 1), strategy: 'offByOne' })

  // ใช้ผิดเครื่องหมาย
  const subtracted = Math.abs(left - right)
  if (subtracted !== answer && subtracted > 0) {
    seeds.push({ value: String(subtracted), strategy: 'wrongOperation' })
  }

  const swapped = swapDigits(answer, rng)
  if (swapped !== null) seeds.push({ value: String(swapped), strategy: 'digitSwap' })

  return seeds
}

/** บวกทีละหลักแบบไม่ทด — จำลองความผิดพลาดที่พบบ่อยที่สุดของการบวก */
function addWithoutCarry(left: number, right: number): number {
  const a = String(Math.abs(left)).split('').reverse()
  const b = String(Math.abs(right)).split('').reverse()
  const length = Math.max(a.length, b.length)

  let result = ''
  for (let index = length - 1; index >= 0; index -= 1) {
    const digitA = Number(a[index] ?? 0)
    const digitB = Number(b[index] ?? 0)
    // เก็บเฉพาะหลักหน่วยของผลบวกแต่ละหลัก ทิ้งตัวทด
    result += String((digitA + digitB) % 10)
  }
  return Number(result) || 0
}

export function subtractionDistractors(
  left: number,
  right: number,
  answer: number,
  rng: Rng,
): DistractorSeed[] {
  const seeds: DistractorSeed[] = []

  // ลืมยืม: หลักไหนลบไม่ได้ก็กลับเอาตัวมากลบตัวน้อยแทน
  const noBorrow = subtractWithoutBorrow(left, right)
  if (noBorrow !== answer) seeds.push({ value: String(noBorrow), strategy: 'forgotBorrow' })

  seeds.push({ value: String(answer + 10), strategy: 'placeValue' })
  seeds.push({ value: String(answer - 10), strategy: 'placeValue' })
  seeds.push({ value: String(answer + 1), strategy: 'offByOne' })

  const added = left + right
  seeds.push({ value: String(added), strategy: 'wrongOperation' })

  const swapped = swapDigits(answer, rng)
  if (swapped !== null) seeds.push({ value: String(swapped), strategy: 'digitSwap' })

  return seeds
}

function subtractWithoutBorrow(left: number, right: number): number {
  const a = String(Math.abs(left)).split('').reverse()
  const b = String(Math.abs(right)).split('').reverse()

  let result = ''
  for (let index = a.length - 1; index >= 0; index -= 1) {
    const digitA = Number(a[index] ?? 0)
    const digitB = Number(b[index] ?? 0)
    result += String(Math.abs(digitA - digitB))
  }
  return Number(result) || 0
}

export function multiplicationDistractors(
  left: number,
  right: number,
  answer: number,
  rng: Rng,
): DistractorSeed[] {
  const seeds: DistractorSeed[] = []

  // คลาดไปหนึ่งรอบของแม่สูตรคูณ
  seeds.push({ value: String(answer + left), strategy: 'offByOne' })
  seeds.push({ value: String(answer - left), strategy: 'offByOne' })
  if (right > 1) seeds.push({ value: String(answer + right), strategy: 'offByOne' })

  // วางหลักผิดตอนคูณหลายหลัก
  seeds.push({ value: String(answer * 10), strategy: 'placeValue' })
  if (answer % 10 === 0) {
    seeds.push({ value: String(answer / 10), strategy: 'placeValue' })
  }

  const added = left + right
  if (added !== answer) seeds.push({ value: String(added), strategy: 'wrongOperation' })

  const swapped = swapDigits(answer, rng)
  if (swapped !== null) seeds.push({ value: String(swapped), strategy: 'digitSwap' })

  return seeds
}

export function divisionDistractors(
  dividend: number,
  divisor: number,
  answer: number,
  rng: Rng,
): DistractorSeed[] {
  const seeds: DistractorSeed[] = []

  seeds.push({ value: String(answer + 1), strategy: 'offByOne' })
  seeds.push({ value: String(answer - 1), strategy: 'offByOne' })
  seeds.push({ value: String(answer * 10), strategy: 'placeValue' })

  // สลับตัวตั้งกับตัวหาร
  if (divisor !== 0 && dividend !== 0) {
    seeds.push({ value: String(divisor), strategy: 'wrongOperation' })
  }
  const multiplied = dividend * divisor
  seeds.push({ value: String(multiplied), strategy: 'wrongOperation' })
  seeds.push({ value: String(dividend - divisor), strategy: 'wrongOperation' })

  const swapped = swapDigits(answer, rng)
  if (swapped !== null) seeds.push({ value: String(swapped), strategy: 'digitSwap' })

  return seeds
}

/**
 * ตัวเลือกลวงของเศษส่วน
 * ความผิดพลาดอันดับหนึ่งคือบวกตัวส่วนเข้าด้วยกัน เช่น 1/4 + 2/4 = 3/8
 */
export function fractionDistractors(
  a: Fraction,
  b: Fraction,
  answer: Fraction,
): DistractorSeed[] {
  const seeds: DistractorSeed[] = []
  const answerText = formatFraction(answer)

  // บวกทั้งตัวเศษและตัวส่วน
  const denominatorSum = a.denominator + b.denominator
  if (denominatorSum !== 0) {
    const wrong = formatFraction({
      numerator: a.numerator + b.numerator,
      denominator: denominatorSum,
    })
    if (wrong !== answerText) {
      seeds.push({ value: wrong, strategy: 'addedDenominators' })
    }
  }

  // ไม่ทอนให้เป็นรูปอย่างต่ำ
  const raw = {
    numerator: a.numerator * b.denominator + b.numerator * a.denominator,
    denominator: a.denominator * b.denominator,
  }
  const rawText = `${raw.numerator}/${raw.denominator}`
  if (rawText !== answerText && raw.denominator !== 0) {
    seeds.push({ value: rawText, strategy: 'unsimplified' })
  }

  // คลาดที่ตัวเศษหนึ่งหน่วย
  const simplified = simplifyFraction(answer)
  for (const delta of [1, -1]) {
    const near = formatFraction({
      numerator: simplified.numerator + delta,
      denominator: simplified.denominator,
    })
    if (near !== answerText) seeds.push({ value: near, strategy: 'nearMiss' })
  }

  // ใช้ผิดเครื่องหมาย
  const opposite = addFractions(a, { numerator: -b.numerator, denominator: b.denominator })
  const oppositeText = formatFraction(opposite)
  if (oppositeText !== answerText) {
    seeds.push({ value: oppositeText, strategy: 'wrongOperation' })
  }

  return seeds
}

/** ตัวเลือกลวงของทศนิยม เน้นความผิดพลาดเรื่องตำแหน่งจุด */
export function decimalDistractors(
  left: number,
  right: number,
  answer: number,
  places: number,
): DistractorSeed[] {
  const seeds: DistractorSeed[] = []

  seeds.push({ value: String(roundTo(answer * 10, places + 1)), strategy: 'decimalPlace' })
  seeds.push({ value: String(roundTo(answer / 10, places + 1)), strategy: 'decimalPlace' })

  // ลืมเรียงจุดทศนิยมให้ตรงกันก่อนบวก
  const misaligned = roundTo(addDecimals(left, right * 10), places + 1)
  if (misaligned !== answer) {
    seeds.push({ value: String(misaligned), strategy: 'decimalPlace' })
  }

  const step = 10 ** -places
  seeds.push({ value: String(roundTo(answer + step, places)), strategy: 'nearMiss' })
  seeds.push({ value: String(roundTo(answer - step, places)), strategy: 'nearMiss' })
  seeds.push({ value: String(roundTo(answer + 1, places)), strategy: 'offByOne' })

  return seeds
}

export function percentageDistractors(
  percent: number,
  base: number,
  answer: number,
): DistractorSeed[] {
  const seeds: DistractorSeed[] = []

  // เอาฐานลบด้วยร้อยละตรง ๆ
  seeds.push({ value: String(roundTo(base - percent, 2)), strategy: 'percentBase' })
  // ลืมหารด้วย 100
  seeds.push({ value: String(roundTo(base * percent, 2)), strategy: 'decimalPlace' })
  // คิดส่วนที่เหลือแทนส่วนที่ถาม
  seeds.push({ value: String(roundTo(base - answer, 2)), strategy: 'percentBase' })
  seeds.push({ value: String(roundTo(answer * 10, 2)), strategy: 'decimalPlace' })
  seeds.push({ value: String(roundTo(answer / 10, 2)), strategy: 'decimalPlace' })

  return seeds
}

export function geometryDistractors(
  answer: number,
  alternative: number,
  strategy: DistractorStrategy,
): DistractorSeed[] {
  const seeds: DistractorSeed[] = []

  if (alternative !== answer) {
    seeds.push({ value: String(alternative), strategy })
  }
  seeds.push({ value: String(roundTo(answer * 2, 2)), strategy: 'forgotHalf' })
  seeds.push({ value: String(roundTo(answer / 2, 2)), strategy: 'forgotHalf' })
  seeds.push({ value: String(roundTo(answer + 1, 2)), strategy: 'offByOne' })
  seeds.push({ value: String(roundTo(answer - 1, 2)), strategy: 'offByOne' })

  return seeds
}

/**
 * เลือกตัวเลือกลวงมาใช้จริง
 *
 * ตัดตัวที่ซ้ำกับคำตอบ ซ้ำกันเอง หรือเป็นค่าที่เป็นไปไม่ได้ทิ้ง
 * ถ้ายังไม่พอ ค่อยเติมด้วยค่าที่ใกล้เคียงคำตอบ ไม่ใช่สุ่มมั่ว
 */
export function selectDistractors(
  seeds: DistractorSeed[],
  correctAnswer: string,
  count: number,
  rng: Rng,
  options: { allowNegative?: boolean; fallbackStep?: number } = {},
): DistractorSeed[] {
  const allowNegative = options.allowNegative ?? false
  const step = options.fallbackStep ?? 1

  const seen = new Set<string>([correctAnswer])
  const chosen: DistractorSeed[] = []

  const isUsable = (value: string): boolean => {
    if (seen.has(value)) return false
    if (value.length === 0 || value === 'NaN' || value.includes('Infinity')) return false

    // ค่าที่เป็นตัวเลขล้วนต้องไม่ติดลบ ถ้าโจทย์ระดับนี้ยังไม่สอนจำนวนลบ
    if (!value.includes('/')) {
      const numeric = Number(value)
      if (!Number.isFinite(numeric)) return false
      if (!allowNegative && numeric < 0) return false
    } else {
      if (!allowNegative && value.trimStart().startsWith('-')) return false
      // ตัวส่วนเป็นศูนย์ห้ามหลุดไปถึงเด็กเด็ดขาด
      if (/\/\s*0+$/.test(value)) return false
    }
    return true
  }

  for (const seed of rng.shuffle(seeds)) {
    if (chosen.length >= count) break
    if (!isUsable(seed.value)) continue
    seen.add(seed.value)
    chosen.push(seed)
  }

  // เติมให้ครบด้วยค่าที่ขยับจากคำตอบทีละขั้น
  const numericAnswer = Number(correctAnswer)
  if (chosen.length < count && Number.isFinite(numericAnswer)) {
    let offset = step
    let guard = 0
    while (chosen.length < count && guard < 100) {
      guard += 1
      for (const sign of [1, -1]) {
        if (chosen.length >= count) break
        const candidate = String(roundTo(numericAnswer + sign * offset, 4))
        if (!isUsable(candidate)) continue
        seen.add(candidate)
        chosen.push({ value: candidate, strategy: 'nearMiss' })
      }
      offset += step
    }
  }

  return chosen
}
