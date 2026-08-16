import type { Equipment } from './item'
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

  /**
   * ของในกระเป๋า นับเป็นจำนวนชิ้นต่อรหัสของ
   * ของที่สวมอยู่จะไม่อยู่ในนี้ ย้ายไปอยู่ใน equipped แทน
   * เพื่อไม่ให้นับซ้ำสองที่แล้วสวมของชิ้นเดียวกันได้สองครั้ง
   */
  /**
   * ธงเรื่องที่ได้มาแล้ว เก็บเป็นรายการรหัส ไม่ใช่ตัวเลขความคืบหน้า
   * เพื่อให้เพิ่มเส้นทางแยกได้ในอนาคตโดยไม่ต้องแก้โครงสร้าง
   */
  storyFlags: string[]

  inventory: Record<string, number>
  /** ของที่สวมอยู่ ช่องละหนึ่งชิ้น */
  equipped: Equipment
  /**
   * ดาวตีบวกของแต่ละชิ้น นับแยกตามรหัสของ
   *
   * เก็บแยกจาก inventory เพราะดาวติดอยู่กับ "ชนิดของ" ไม่ใช่ตัวชิ้น
   * ถอดออกใส่เข้าหรือซื้อใหม่ ดาวก็ยังอยู่
   * ถ้าผูกกับตัวชิ้น เด็กจะเสียดาวทั้งหมดตอนเผลอถอดของ ซึ่งไม่ยุติธรรม
   */
  upgrades: Record<string, number>
  /** ตัวละครที่ปลดล็อกแล้ว */
  ownedAvatars: string[]
  /**
   * พลังถาวรที่ซื้อไว้ ติดตัวไปทุกรอบของสนามรบ
   *
   * แยกจาก upgrades เพราะคนละเรื่องกัน
   * upgrades ผูกกับของที่ต้องมีและต้องสวม ส่วนพลังถาวรไม่ต้องมีอะไรก่อน
   */
  perks: Record<string, number>

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
  /** ราคาปลดล็อก 0 = เลือกได้ตั้งแต่แรก */
  price: number
  /** ต้องถึงเลเวลนี้ก่อนจึงจะซื้อได้ */
  requiredLevel?: number
}

export type AvatarAccent = 'ember' | 'arcane' | 'leaf' | 'gold' | 'sky' | 'rose'

export interface GameSettings {
  soundEnabled: boolean
  musicEnabled: boolean
  animationsEnabled: boolean
}
