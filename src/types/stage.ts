import type { SkillId } from './stats'

export type StageDifficulty = 'easy' | 'medium' | 'hard' | 'boss'

/**
 * สถานะของด่านที่ผู้เล่นเห็นบนแผนที่
 * IN_PROGRESS = เคยลองแล้วแต่ยังไม่ผ่านเกณฑ์
 * MASTERED = ผ่านด้วยดาวสูงสุด
 */
export type StageStatus =
  | 'LOCKED'
  | 'AVAILABLE'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'MASTERED'

export interface StageReward {
  exp: number
  coins: number
}

export interface Stage {
  id: string
  worldId: string
  /** กลุ่มของด่านบนแผนที่ ใช้แบ่งเส้นทางให้เด็กเห็นว่าเดินทางไปถึงไหนแล้ว */
  regionId: string

  name: string
  description: string
  emoji: string

  order: number
  difficulty: StageDifficulty

  questionCount: number
  /** เกณฑ์ผ่านเป็นร้อยละ กำหนดรายด่านได้ ไม่ hard-code ในโค้ด */
  passingScore: number

  firstClearReward: StageReward
  replayReward: StageReward

  /** ด่านที่ต้องผ่านก่อน ถ้าไม่ระบุแปลว่าเล่นได้ทันที */
  requiredStageId?: string

  /** ประเภทโจทย์ของด่านนี้ Part 4 จะนำไปใช้กับ Question Engine */
  questionTypes: SkillId[]
  /** ช่วงตัวเลขที่ใช้สร้างโจทย์ */
  numberRange: { min: number; max: number }

  isBoss: boolean

  /** บทพูดของ NPC ก่อนเริ่มด่าน */
  npcId?: string
  questIntro?: string
}

/** ความคืบหน้าของผู้เล่นในแต่ละด่าน */
export interface StageProgress {
  stageId: string
  attempts: number
  bestScore: number
  bestAccuracy: number
  stars: number
  completed: boolean
  mastered: boolean
  firstCompletedAt?: string
  lastPlayedAt?: string
}

/** ผลการเล่นหนึ่งครั้ง ส่งไปแสดงในหน้า Stage Result */
export interface StageResult {
  worldId: string
  stageId: string

  totalQuestions: number
  correctAnswers: number
  accuracy: number

  expFromAnswers: number
  coinsFromAnswers: number
  bonusExp: number
  bonusCoins: number

  isFirstClear: boolean
  isPassed: boolean
  stars: number
  previousStars: number
  isNewBest: boolean
  isMastered: boolean

  hpHealed: number

  /** ด่านที่เพิ่งปลดล็อกจากการผ่านครั้งนี้ */
  unlockedStageId?: string
  /** โลกที่เพิ่งปลดล็อก */
  unlockedWorldId?: string
  isWorldComplete: boolean

  /** ภารกิจที่เพิ่งทำสำเร็จจากการเล่นครั้งนี้ */
  completedQuestIds: string[]
}
