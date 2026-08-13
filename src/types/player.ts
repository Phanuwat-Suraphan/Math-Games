import type {
  LevelRecord,
  PlayerStatistics,
  QuestionAttempt,
} from './stats'

export interface Player {
  id: string
  name: string
  avatar: string

  level: number
  /** EXP ที่สะสมอยู่ในเลเวลปัจจุบัน (ไม่ใช่ EXP สะสมทั้งหมด) */
  exp: number
  coins: number
  hp: number
  maxHp: number

  totalQuestions: number
  correctAnswers: number
  wrongAnswers: number

  currentStreak: number
  bestStreak: number

  completedLevels: string[]
  /** สถิติรายด่าน ใช้แยกการเล่นครั้งแรกออกจากการเล่นซ้ำ */
  levelRecords: Record<string, LevelRecord>

  statistics: PlayerStatistics
  /** ประวัติการตอบล่าสุด เก็บจำกัดจำนวนตาม MAX_RECENT_ATTEMPTS */
  recentAttempts: QuestionAttempt[]

  createdAt: string
  updatedAt: string
}

export interface Avatar {
  id: string
  name: string
  emoji: string
  description: string
  accent: AvatarAccent
}

export type AvatarAccent = 'ember' | 'arcane' | 'leaf' | 'gold' | 'sky' | 'rose'

export interface GameSettings {
  soundEnabled: boolean
  musicEnabled: boolean
  animationsEnabled: boolean
}
