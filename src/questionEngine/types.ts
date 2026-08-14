import type { SkillId } from '../types/stats'

/**
 * โมเดลของโจทย์ที่ Question Engine สร้างขึ้น
 *
 * แยกจาก types/question.ts เดิมของ Part 1 ที่เป็นคลังโจทย์แบบเขียนมือ
 * ตัวใหม่รองรับหลายชนิดโจทย์ ระดับชั้น และข้อมูลประกอบสำหรับวิเคราะห์
 */

export type QuestionType =
  | 'addition'
  | 'subtraction'
  | 'multiplication'
  | 'division'
  | 'fractions'
  | 'decimals'
  | 'percentages'
  | 'geometry'
  | 'wordProblems'

export type Difficulty = 'easy' | 'medium' | 'hard' | 'expert'

export type Grade = 4 | 5 | 6

/** โจทย์มาจากไหน เตรียมรองรับโจทย์ที่ครูสร้างเองในอนาคต */
export type QuestionSource = 'generated' | 'curated'

export interface Choice {
  id: string
  text: string
}

export interface QuestionMetadata {
  operation?: string
  numberRange?: { min: number; max: number }
  /** โจทย์บวกข้อนี้ต้องทดหรือไม่ */
  carries?: boolean
  /** โจทย์ลบข้อนี้ต้องยืมหรือไม่ */
  borrows?: boolean
  decimalPlaces?: number
  fractionType?: string
  geometryShape?: string
  /** จำนวนขั้นตอนที่ต้องคิด ใช้วัดความยากจริงของโจทย์ */
  steps?: number
}

export interface Question {
  id: string
  type: QuestionType
  grade: Grade
  difficulty: Difficulty

  prompt: string
  choices: Choice[]
  /** เก็บเป็นข้อความเสมอ เพื่อให้เศษส่วนกับทศนิยมเทียบกันได้แบบเดียวกัน */
  correctAnswer: string
  explanation: string
  hint?: string

  skill: SkillId
  source: QuestionSource
  tags: string[]
  metadata: QuestionMetadata
}

export interface QuestionResult {
  questionId: string
  correct: boolean
  selectedAnswer: string
  correctAnswer: string
  /** เวลาที่ใช้ตอบ หน่วยมิลลิวินาที */
  timeSpent: number
  skill: SkillId
  type: QuestionType
  difficulty: Difficulty
  /** เปิดคำใบ้ก่อนตอบหรือไม่ ใช้ดูว่าเด็กพึ่งคำใบ้มากแค่ไหน */
  usedHint: boolean
  timestamp: string
}

export interface GenerateOptions {
  type: QuestionType
  grade: Grade
  difficulty: Difficulty
  /** ระบุเพื่อให้สร้างโจทย์ชุดเดิมซ้ำได้ */
  seed?: string
}

/** ตัวสร้างโจทย์หนึ่งชนิด รับตัวสุ่มเข้ามาเพื่อให้ทดสอบซ้ำได้ */
export interface GeneratorContext {
  grade: Grade
  difficulty: Difficulty
  rng: import('../math/rng').Rng
}

export interface QuestionSession {
  sessionId: string
  stageId: string
  questions: Question[]
  currentIndex: number
  results: QuestionResult[]
  startedAt: string
  completedAt?: string
}

export interface SessionSummary {
  total: number
  correct: number
  wrong: number
  accuracy: number
  averageTimeMs: number
  bestStreak: number
  hintsUsed: number
  score: number
  stars: number
}
