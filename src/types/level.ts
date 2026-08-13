import type { MathOperation } from './question'

export type Difficulty = 'easy' | 'normal' | 'hard' | 'boss'

export interface LevelReward {
  exp: number
  coins: number
}

export interface Level {
  id: string
  worldId: string
  order: number
  name: string
  description: string
  emoji: string
  difficulty: Difficulty
  questionCount: number
  operations: MathOperation[]
  /** ช่วงค่าตัวเลขที่ใช้สร้างโจทย์สำรอง เมื่อคลังโจทย์มีไม่พอ */
  maxOperand: number
  reward: LevelReward
  isBoss: boolean
}

export interface LevelResult {
  worldId: string
  levelId: string
  totalQuestions: number
  correctAnswers: number
  expFromAnswers: number
  coinsFromAnswers: number
  bonusExp: number
  bonusCoins: number
  isFirstClear: boolean
  /** ร้อยละความแม่นยำของการเล่นครั้งนี้ */
  accuracy: number
  /** พลังชีวิตที่ฟื้นได้จริงเมื่อจบด่าน */
  hpHealed: number
}
