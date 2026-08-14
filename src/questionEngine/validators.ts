import { DIFFICULTY_ORDER } from './difficulty/config'
import type { Difficulty, Question, QuestionType } from './types'
import { SKILL_IDS } from '../data/skills'

/**
 * ด่านสุดท้ายก่อนโจทย์ไปถึงเด็ก
 *
 * ตัวสร้างโจทย์อาจพลาดได้จากการสุ่มที่คาดไม่ถึง ไฟล์นี้จึงตรวจซ้ำทุกข้อ
 * โจทย์ที่ไม่ผ่านจะถูกสร้างใหม่ ไม่ปล่อยให้เด็กเห็นโจทย์เสียเด็ดขาด
 */

const VALID_TYPES: QuestionType[] = [
  'addition', 'subtraction', 'multiplication', 'division',
  'fractions', 'decimals', 'percentages', 'geometry', 'wordProblems',
]

export interface ValidationResult {
  valid: boolean
  errors: string[]
}

/** ค่าที่แสดงบนตัวเลือกต้องอ่านออกและเป็นตัวเลขที่มีอยู่จริง */
function isSaneAnswerText(text: string): boolean {
  if (typeof text !== 'string') return false
  const trimmed = text.trim()
  if (trimmed.length === 0 || trimmed.length > 40) return false
  if (/NaN|Infinity|undefined|null/.test(trimmed)) return false

  // เศษส่วน: ตัวส่วนต้องไม่เป็นศูนย์
  if (trimmed.includes('/')) {
    const parts = trimmed.split('/')
    if (parts.length !== 2) return false
    const numerator = Number(parts[0])
    const denominator = Number(parts[1])
    return Number.isFinite(numerator) && Number.isFinite(denominator) && denominator !== 0
  }

  return Number.isFinite(Number(trimmed))
}

export function validateQuestion(question: Question): ValidationResult {
  const errors: string[] = []

  if (!question || typeof question !== 'object') {
    return { valid: false, errors: ['ไม่ใช่ข้อมูลโจทย์'] }
  }

  if (typeof question.id !== 'string' || question.id.length === 0) {
    errors.push('ไม่มีรหัสโจทย์')
  }
  if (typeof question.prompt !== 'string' || question.prompt.trim().length === 0) {
    errors.push('ไม่มีตัวโจทย์')
  }
  if (typeof question.explanation !== 'string' || question.explanation.trim().length === 0) {
    errors.push('ไม่มีคำอธิบายเฉลย')
  }

  if (!VALID_TYPES.includes(question.type)) {
    errors.push(`ชนิดโจทย์ไม่ถูกต้อง: ${String(question.type)}`)
  }
  if (!DIFFICULTY_ORDER.includes(question.difficulty)) {
    errors.push(`ระดับความยากไม่ถูกต้อง: ${String(question.difficulty)}`)
  }
  if (![4, 5, 6].includes(question.grade)) {
    errors.push(`ระดับชั้นไม่ถูกต้อง: ${String(question.grade)}`)
  }
  if (!SKILL_IDS.includes(question.skill)) {
    errors.push(`ทักษะไม่ถูกต้อง: ${String(question.skill)}`)
  }

  if (!isSaneAnswerText(question.correctAnswer)) {
    errors.push(`คำตอบไม่ถูกต้อง: ${String(question.correctAnswer)}`)
  }

  if (!Array.isArray(question.choices) || question.choices.length < 2) {
    errors.push('ตัวเลือกน้อยเกินไป')
    return { valid: false, errors }
  }

  const texts = question.choices.map((choice) => choice.text)

  for (const text of texts) {
    if (!isSaneAnswerText(text)) {
      errors.push(`ตัวเลือกไม่ถูกต้อง: ${String(text)}`)
    }
  }

  if (new Set(texts).size !== texts.length) {
    errors.push('มีตัวเลือกซ้ำกัน')
  }

  if (!texts.includes(question.correctAnswer)) {
    errors.push('คำตอบที่ถูกไม่อยู่ในตัวเลือก')
  }

  const ids = question.choices.map((choice) => choice.id)
  if (new Set(ids).size !== ids.length) {
    errors.push('รหัสตัวเลือกซ้ำกัน')
  }

  return { valid: errors.length === 0, errors }
}

/** ระดับความยากที่ระบบรองรับ ใช้กันค่าที่หลุดมาจากข้อมูลด่าน */
export function isValidDifficulty(value: unknown): value is Difficulty {
  return typeof value === 'string' && DIFFICULTY_ORDER.includes(value as Difficulty)
}

export function isValidQuestionType(value: unknown): value is QuestionType {
  return typeof value === 'string' && VALID_TYPES.includes(value as QuestionType)
}
