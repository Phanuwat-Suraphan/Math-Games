import type { DailyQuestState, QuestProgress } from './quest'
import type { StageProgress } from './stage'
import type { PlayerStatistics, QuestionAttempt } from './stats'

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

  /** รหัสด่านที่ผ่านเกณฑ์แล้ว */
  completedStages: string[]
  /** ความคืบหน้ารายด่าน รวมคะแนนดีที่สุดและดาว */
  stageProgress: Record<string, StageProgress>
  /** โลกที่เปิดให้เล่นแล้ว */
  unlockedWorlds: string[]

  questProgress: Record<string, QuestProgress>
  dailyQuests: DailyQuestState

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
