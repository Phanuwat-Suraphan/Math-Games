import type { SkillId } from './stats'

export type QuestType = 'story' | 'practice' | 'daily' | 'challenge'

/** จัดกลุ่มให้ Quest Log แสดงเป็นหมวด */
export type QuestCategory = 'main' | 'side' | 'daily'

/**
 * ชนิดของเงื่อนไขภารกิจ
 * เพิ่มชนิดใหม่ได้โดยเติมที่นี่แล้วเขียนวิธีวัดใน questService.measureRequirement
 */
export type QuestRequirementType =
  | 'answerCorrect'
  | 'answerSkill'
  | 'accuracy'
  | 'completeStage'
  | 'bestStreak'
  | 'collectCoins'
  | 'earnStars'

export interface QuestRequirement {
  type: QuestRequirementType
  /** ค่าที่ต้องทำให้ถึง */
  target: number
  /** ใช้กับ answerSkill */
  skill?: SkillId
  /** ใช้กับ completeStage */
  stageId?: string
  label: string
}

export interface Quest {
  id: string
  title: string
  description: string

  worldId: string
  stageId?: string

  type: QuestType
  category: QuestCategory

  npcId?: string
  dialogue?: string

  requirements: QuestRequirement[]
  reward: {
    exp: number
    coins: number
  }
}

/** ความคืบหน้าของภารกิจที่บันทึกไว้ในข้อมูลผู้เล่น */
export interface QuestProgress {
  questId: string
  /** ตัวนับของแต่ละเงื่อนไข เรียงตรงกับ requirements */
  counters: number[]
  completed: boolean
  claimed: boolean
  completedAt?: string
  claimedAt?: string
}

/** สถานะภารกิจประจำวัน รีเซ็ตเมื่อขึ้นวันใหม่ */
export interface DailyQuestState {
  /** วันที่ในรูปแบบ YYYY-MM-DD ตามเวลาเครื่องผู้เล่น */
  date: string
  questIds: string[]
}

/** ข้อมูลภารกิจพร้อมความคืบหน้า สำหรับแสดงผลใน UI */
export interface QuestView {
  quest: Quest
  progress: QuestProgress
  /** ค่าที่ทำได้จริงของแต่ละเงื่อนไข */
  measured: number[]
  percent: number
  isCompleted: boolean
  isClaimed: boolean
  canClaim: boolean
}
