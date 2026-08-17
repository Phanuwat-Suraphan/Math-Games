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
  /*
   * เงื่อนไขที่วัดจากสมุดสถิติ
   *
   * ต่างจากกลุ่มข้างบนตรงที่ไม่ต้องมีตัวนับของภารกิจเอง
   * เพราะสมุดสถิติเก็บค่าสะสมไว้ให้แล้ว การวัดจึงเป็นการอ่านค่าตรง ๆ
   * ข้อดีที่สำคัญกว่านั้นคือ ภารกิจที่เพิ่มทีหลังจะนับผลงานที่เด็กทำไว้แล้วด้วย
   * ไม่ใช่เริ่มนับศูนย์ทั้งที่เคยล้มบอสไปห้าสิบตัวแล้ว
   */
  | 'survivorTime'
  | 'survivorKills'
  | 'survivorBossKills'
  | 'survivorEvolutions'
  | 'duelWins'
  | 'duelPlays'
  | 'towerFloor'
  /* เงื่อนไขที่วัดจากของที่สะสมไว้ */
  | 'perkLevels'
  | 'upgradeStars'
  | 'ownAvatars'

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
