import type { Difficulty, Grade, QuestionType } from '../types'

/**
 * ช่วงตัวเลขของโจทย์แต่ละชนิดในแต่ละระดับความยาก
 *
 * ทุกค่าอยู่ในไฟล์นี้ไฟล์เดียว ปรับความยากของทั้งเกมได้จากที่นี่
 * ห้ามเขียนช่วงตัวเลขลงในตัวสร้างโจทย์โดยตรง
 *
 * ระดับชั้นไม่ได้ผูกกับความยากแบบตายตัว — ป.4 เล่นระดับ hard ได้
 * ระดับชั้นใช้ปรับ "ขนาดตัวเลข" เท่านั้น ผ่าน gradeScale
 */

export interface NumberRange {
  min: number
  max: number
}

export interface OperandConfig {
  /** ช่วงของตัวตั้ง */
  left: NumberRange
  /** ช่วงของตัวกระทำ */
  right: NumberRange
  /** จำนวนพจน์ในโจทย์ 2 = a+b, 3 = a+b+c */
  terms?: number
}

export const DIFFICULTY_ORDER: Difficulty[] = ['easy', 'medium', 'hard', 'expert']

export function difficultyRank(difficulty: Difficulty): number {
  const index = DIFFICULTY_ORDER.indexOf(difficulty)
  return index < 0 ? 0 : index
}

/** ขยับความยากทีละขั้น ไม่ให้กระโดดข้ามระดับ */
export function shiftDifficulty(
  difficulty: Difficulty,
  steps: number,
): Difficulty {
  const next = difficultyRank(difficulty) + Math.sign(steps) * Math.min(1, Math.abs(steps))
  const clamped = Math.max(0, Math.min(DIFFICULTY_ORDER.length - 1, next))
  return DIFFICULTY_ORDER[clamped] as Difficulty
}

/**
 * ตัวคูณขนาดตัวเลขตามระดับชั้น
 * ป.6 เจอตัวเลขใหญ่กว่า ป.4 ในโจทย์ระดับความยากเดียวกัน
 */
export const GRADE_SCALE: Record<Grade, number> = { 4: 1, 5: 1.4, 6: 1.8 }

export function scaleRange(range: NumberRange, grade: Grade): NumberRange {
  const scale = GRADE_SCALE[grade] ?? 1
  return {
    min: Math.max(1, Math.round(range.min * scale)),
    max: Math.max(2, Math.round(range.max * scale)),
  }
}

type OperandTable = Record<Difficulty, OperandConfig>

export const ADDITION_RANGES: OperandTable = {
  easy: { left: { min: 10, max: 99 }, right: { min: 10, max: 99 }, terms: 2 },
  medium: { left: { min: 100, max: 499 }, right: { min: 100, max: 499 }, terms: 2 },
  hard: { left: { min: 1000, max: 4999 }, right: { min: 1000, max: 4999 }, terms: 2 },
  expert: { left: { min: 1000, max: 4999 }, right: { min: 500, max: 2999 }, terms: 3 },
}

export const SUBTRACTION_RANGES: OperandTable = {
  easy: { left: { min: 20, max: 99 }, right: { min: 10, max: 60 }, terms: 2 },
  medium: { left: { min: 200, max: 999 }, right: { min: 100, max: 500 }, terms: 2 },
  hard: { left: { min: 2000, max: 9999 }, right: { min: 1000, max: 4999 }, terms: 2 },
  expert: { left: { min: 3000, max: 9999 }, right: { min: 500, max: 2999 }, terms: 3 },
}

export const MULTIPLICATION_RANGES: OperandTable = {
  easy: { left: { min: 2, max: 9 }, right: { min: 2, max: 9 }, terms: 2 },
  medium: { left: { min: 11, max: 39 }, right: { min: 3, max: 19 }, terms: 2 },
  hard: { left: { min: 100, max: 299 }, right: { min: 11, max: 49 }, terms: 2 },
  expert: { left: { min: 200, max: 899 }, right: { min: 21, max: 79 }, terms: 2 },
}

/** โจทย์หารกำหนดที่ "ตัวหาร" กับ "ผลหาร" แล้วคูณกลับ เพื่อให้ลงตัวเสมอ */
export const DIVISION_RANGES: OperandTable = {
  easy: { left: { min: 2, max: 9 }, right: { min: 2, max: 9 }, terms: 2 },
  medium: { left: { min: 3, max: 12 }, right: { min: 4, max: 20 }, terms: 2 },
  hard: { left: { min: 6, max: 25 }, right: { min: 10, max: 40 }, terms: 2 },
  expert: { left: { min: 12, max: 40 }, right: { min: 20, max: 60 }, terms: 2 },
}

/** ตัวส่วนที่ใช้ในโจทย์เศษส่วน เลือกจากตัวเลขที่เด็กคุ้นเคย */
export const FRACTION_DENOMINATORS: Record<Difficulty, number[]> = {
  easy: [2, 3, 4, 5, 6, 8, 10],
  medium: [3, 4, 5, 6, 8, 9, 10, 12],
  hard: [4, 6, 7, 8, 9, 10, 12, 15, 16],
  expert: [6, 7, 8, 9, 11, 12, 14, 15, 16, 18, 20],
}

export const DECIMAL_CONFIG: Record<
  Difficulty,
  { places: number; whole: NumberRange }
> = {
  easy: { places: 1, whole: { min: 1, max: 20 } },
  medium: { places: 2, whole: { min: 1, max: 50 } },
  hard: { places: 2, whole: { min: 10, max: 200 } },
  expert: { places: 3, whole: { min: 10, max: 500 } },
}

/** ร้อยละที่คำนวณในใจได้ในระดับง่าย และซับซ้อนขึ้นตามระดับ */
export const PERCENT_VALUES: Record<Difficulty, number[]> = {
  easy: [10, 20, 25, 50],
  medium: [5, 10, 15, 20, 25, 40, 50, 75],
  hard: [12, 18, 24, 35, 45, 60, 80],
  expert: [7, 13, 17, 23, 37, 43, 65, 85],
}

export const PERCENT_BASES: Record<Difficulty, NumberRange> = {
  easy: { min: 20, max: 200 },
  medium: { min: 40, max: 800 },
  hard: { min: 100, max: 2000 },
  expert: { min: 200, max: 5000 },
}

export const GEOMETRY_RANGES: Record<Difficulty, NumberRange> = {
  easy: { min: 2, max: 12 },
  medium: { min: 4, max: 25 },
  hard: { min: 8, max: 60 },
  expert: { min: 12, max: 120 },
}

/** โบนัสคะแนนตามความยาก ใช้ทั้งการคิดคะแนนและพลังโจมตีใน Battle ของ Part 5 */
export const DIFFICULTY_BONUS: Record<Difficulty, number> = {
  easy: 0,
  medium: 5,
  hard: 10,
  expert: 20,
}

/**
 * โทษเมื่อเปิดคำใบ้
 * ตั้งเป็นศูนย์ตั้งใจ เพราะเป้าหมายคือให้เด็กกล้าขอความช่วยเหลือ
 * ไม่ใช่กลัวเสียคะแนนจนเดามั่ว
 */
export const HINT_PENALTY = { exp: 0, coins: 0 } as const

/** ทักษะที่ผูกกับโจทย์แต่ละชนิด */
export const TYPE_TO_SKILL = {
  addition: 'addition',
  subtraction: 'subtraction',
  multiplication: 'multiplication',
  division: 'division',
  fractions: 'fractions',
  decimals: 'decimals',
  percentages: 'percentages',
  geometry: 'geometry',
  wordProblems: 'wordProblems',
} as const satisfies Record<QuestionType, string>
