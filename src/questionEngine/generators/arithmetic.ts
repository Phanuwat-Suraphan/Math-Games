import {
  ADDITION_RANGES,
  DIVISION_RANGES,
  MULTIPLICATION_RANGES,
  SUBTRACTION_RANGES,
  scaleRange,
} from '../difficulty/config'
import {
  additionDistractors,
  divisionDistractors,
  multiplicationDistractors,
  subtractionDistractors,
  type DistractorSeed,
} from '../distractors'
import type { GeneratorContext } from '../types'

/**
 * ตัวสร้างโจทย์สี่ชนิดพื้นฐาน: บวก ลบ คูณ หาร
 *
 * แต่ละตัวคืนแค่ส่วนประกอบของโจทย์ (ตัวโจทย์ คำตอบ เฉลย ตัวเลือกลวง)
 * ส่วนการประกอบเป็น Question และการสลับตัวเลือกทำที่ index.ts ที่เดียว
 */

export interface GeneratedCore {
  prompt: string
  correctAnswer: string
  explanation: string
  hint: string
  distractors: DistractorSeed[]
  metadata: Record<string, unknown>
  tags: string[]
}

/** ใส่ลูกน้ำคั่นหลักพัน เด็กอ่านเลขหลักหมื่นได้ง่ายขึ้น */
function formatNumber(value: number): string {
  return value.toLocaleString('en-US')
}

/** โจทย์บวกข้อนี้ต้องทดหรือไม่ ใช้เลือกคำใบ้ให้ตรงกับสิ่งที่เด็กต้องระวัง */
function hasCarry(left: number, right: number): boolean {
  const a = String(left).split('').reverse()
  const b = String(right).split('').reverse()
  let carry = 0
  for (let index = 0; index < Math.max(a.length, b.length); index += 1) {
    const sum = Number(a[index] ?? 0) + Number(b[index] ?? 0) + carry
    if (sum >= 10) return true
    carry = 0
  }
  return false
}

function hasBorrow(left: number, right: number): boolean {
  const a = String(left).split('').reverse()
  const b = String(right).split('').reverse()
  let borrow = 0
  for (let index = 0; index < a.length; index += 1) {
    const digitA = Number(a[index] ?? 0) - borrow
    const digitB = Number(b[index] ?? 0)
    if (digitA < digitB) return true
    borrow = 0
  }
  return false
}

export function generateAddition(context: GeneratorContext): GeneratedCore {
  const { rng, grade, difficulty } = context
  const config = ADDITION_RANGES[difficulty]
  const left = scaleRange(config.left, grade)
  const right = scaleRange(config.right, grade)
  const terms = config.terms ?? 2

  const values: number[] = [rng.int(left.min, left.max), rng.int(right.min, right.max)]
  if (terms >= 3) values.push(rng.int(right.min, Math.max(right.min, Math.floor(right.max / 2))))

  const answer = values.reduce((sum, value) => sum + value, 0)
  const prompt = `${values.map(formatNumber).join(' + ')} = ?`

  const a = values[0] as number
  const b = values[1] as number
  const carries = hasCarry(a, b)

  return {
    prompt,
    correctAnswer: String(answer),
    explanation:
      terms >= 3
        ? `บวกทีละคู่: ${formatNumber(a)} + ${formatNumber(b)} = ${formatNumber(a + b)} แล้วบวก ${formatNumber(values[2] as number)} ได้ ${formatNumber(answer)}`
        : `${formatNumber(a)} + ${formatNumber(b)} = ${formatNumber(answer)}`,
    hint: carries
      ? 'บวกหลักหน่วยก่อน ถ้าได้เกิน 9 ให้ทดไปหลักถัดไปด้วยนะ'
      : 'บวกทีละหลักจากขวาไปซ้าย ข้อนี้ไม่ต้องทด',
    distractors: additionDistractors(a, b, answer, rng),
    metadata: {
      operation: 'add',
      operands: values,
      numberRange: { min: left.min, max: left.max },
      carries,
      steps: terms - 1,
    },
    tags: ['addition', carries ? 'carrying' : 'no-carrying', `grade${grade}`],
  }
}

export function generateSubtraction(context: GeneratorContext): GeneratedCore {
  const { rng, grade, difficulty } = context
  const config = SUBTRACTION_RANGES[difficulty]
  const leftRange = scaleRange(config.left, grade)
  const rightRange = scaleRange(config.right, grade)

  const left = rng.int(leftRange.min, leftRange.max)
  // ตัวลบต้องไม่มากกว่าตัวตั้ง ระดับประถมยังไม่เจอคำตอบติดลบ
  const maxRight = Math.min(rightRange.max, left - 1)
  const right = rng.int(Math.min(rightRange.min, maxRight), Math.max(1, maxRight))

  const answer = left - right
  const borrows = hasBorrow(left, right)

  return {
    prompt: `${formatNumber(left)} − ${formatNumber(right)} = ?`,
    correctAnswer: String(answer),
    explanation: `${formatNumber(left)} − ${formatNumber(right)} = ${formatNumber(answer)}`,
    hint: borrows
      ? 'หลักไหนลบไม่ได้ ให้ยืมจากหลักถัดไปทางซ้าย 1 มาก่อน'
      : 'ลบทีละหลักจากขวาไปซ้าย ข้อนี้ไม่ต้องยืม',
    distractors: subtractionDistractors(left, right, answer, rng),
    metadata: {
      operation: 'subtract',
      operands: [left, right],
      numberRange: { min: leftRange.min, max: leftRange.max },
      borrows,
      steps: 1,
    },
    tags: ['subtraction', borrows ? 'borrowing' : 'no-borrowing', `grade${grade}`],
  }
}

export function generateMultiplication(context: GeneratorContext): GeneratedCore {
  const { rng, grade, difficulty } = context
  const config = MULTIPLICATION_RANGES[difficulty]
  const leftRange = scaleRange(config.left, grade)
  const rightRange = config.right

  const left = rng.int(leftRange.min, leftRange.max)
  const right = rng.int(rightRange.min, rightRange.max)
  const answer = left * right

  // แยกคูณเป็นหลักสิบกับหลักหน่วย เป็นวิธีที่สอนในห้องเรียน
  const tens = Math.floor(right / 10) * 10
  const ones = right % 10
  const canSplit = tens > 0 && ones > 0

  return {
    prompt: `${formatNumber(left)} × ${formatNumber(right)} = ?`,
    correctAnswer: String(answer),
    explanation: canSplit
      ? `แยกคิด ${formatNumber(left)} × ${tens} = ${formatNumber(left * tens)} และ ${formatNumber(left)} × ${ones} = ${formatNumber(left * ones)} รวมกันได้ ${formatNumber(answer)}`
      : `${formatNumber(left)} × ${formatNumber(right)} = ${formatNumber(answer)}`,
    hint: canSplit
      ? `ลองแยก ${formatNumber(right)} เป็น ${tens} กับ ${ones} แล้วคูณทีละส่วน`
      : 'นึกถึงสูตรคูณแม่ที่เกี่ยวข้องดูนะ',
    distractors: multiplicationDistractors(left, right, answer, rng),
    metadata: {
      operation: 'multiply',
      operands: [left, right],
      numberRange: { min: leftRange.min, max: leftRange.max },
      steps: canSplit ? 2 : 1,
    },
    tags: ['multiplication', `grade${grade}`],
  }
}

/**
 * โจทย์หาร — สร้างจากตัวหารกับผลหารแล้วคูณกลับ
 * วิธีนี้ทำให้หารลงตัวเสมอ ไม่มีทางหลุดเป็นโจทย์มีเศษโดยไม่ตั้งใจ
 */
export function generateDivision(context: GeneratorContext): GeneratedCore {
  const { rng, grade, difficulty } = context
  const config = DIVISION_RANGES[difficulty]
  const divisorRange = config.left
  const quotientRange = scaleRange(config.right, grade)

  const divisor = rng.int(divisorRange.min, divisorRange.max)
  const quotient = rng.int(quotientRange.min, quotientRange.max)
  const dividend = divisor * quotient

  return {
    prompt: `${formatNumber(dividend)} ÷ ${formatNumber(divisor)} = ?`,
    correctAnswer: String(quotient),
    explanation: `${formatNumber(dividend)} ÷ ${formatNumber(divisor)} = ${formatNumber(quotient)} เพราะ ${formatNumber(divisor)} × ${formatNumber(quotient)} = ${formatNumber(dividend)}`,
    hint: `ลองคิดกลับกันว่า ${formatNumber(divisor)} คูณด้วยอะไรถึงได้ ${formatNumber(dividend)}`,
    distractors: divisionDistractors(dividend, divisor, quotient, rng),
    metadata: {
      operation: 'divide',
      operands: [dividend, divisor],
      numberRange: { min: quotientRange.min, max: quotientRange.max },
      steps: 1,
    },
    tags: ['division', 'exact-division', `grade${grade}`],
  }
}
