import type { SkillId } from './stats'

export type MathOperation = 'add' | 'subtract' | 'multiply' | 'divide'

/** ระดับความยากของโจทย์ในคลัง แยกจากระดับความยากของด่าน */
export type Difficulty = 'easy' | 'normal' | 'hard' | 'boss'

export interface Question {
  id: string
  prompt: string
  operation: MathOperation
  difficulty: Difficulty
  answer: number
  choices: number[]
  explanation: string
  /** ระบุทักษะเองได้ เช่น โจทย์ปัญหาที่ใช้การบวกแต่ต้องนับเป็น wordProblems */
  skill?: SkillId
}
