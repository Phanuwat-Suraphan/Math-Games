import type { Difficulty } from './level'

export type MathOperation = 'add' | 'subtract' | 'multiply' | 'divide'

export interface Question {
  id: string
  prompt: string
  operation: MathOperation
  difficulty: Difficulty
  answer: number
  choices: number[]
  explanation: string
}
