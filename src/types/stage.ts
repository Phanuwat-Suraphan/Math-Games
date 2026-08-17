import type { SkillId } from './stats'

export type StageDifficulty = 'easy' | 'medium' | 'hard' | 'boss'

/**
 * กิจกรรมของด่าน
 *
 * เพิ่มมาแก้ปัญหาที่ทุกด่านทำอย่างเดียวกันหมดจนน่าเบื่อ
 *   quiz   ตอบคำถามแบบเดิม
 *   puzzle แก้ปริศนา คำตอบเป็นกุญแจไปทำอย่างอื่นต่อ
 *   battle ต่อสู้กับมอนสเตอร์ ใช้คณิตศาสตร์เป็นพลังโจมตี
 */
export type StageActivity = 'quiz' | 'puzzle' | 'battle' | 'minigame'

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

  /** ประเภทโจทย์ของด่านนี้ Question Engine ใช้ค่านี้เลือกตัวสร้างโจทย์ */
  questionTypes: SkillId[]
  /** ช่วงตัวเลขที่ใช้สร้างโจทย์ */
  numberRange: { min: number; max: number }
  /**
   * ระดับชั้นของเนื้อหา คุมขนาดตัวเลขเท่านั้น ไม่ได้คุมความยาก
   * ถ้าไม่กำหนด questionService จะเดาจากลำดับของโลก
   */
  grade?: 4 | 5 | 6

  isBoss: boolean

  /**
   * ด่านนี้ให้เด็กทำอะไร ถ้าไม่ระบุจะเป็นการตอบคำถามตามปกติ
   * สลับชนิดกิจกรรมระหว่างด่าน เพื่อไม่ให้เล่นแล้วรู้สึกซ้ำ
   */
  activity?: StageActivity

  /**
   * ด่านนี้ให้เด็กพิมพ์คำตอบเอง แทนการเลือกจากตัวเลือกสี่ตัว
   *
   * ใช้กับด่านระดับยากท้าย ๆ ของแต่ละโลก เพราะเป็นด่านที่เด็กควรคิดได้เองแล้ว
   * และเป็นจุดที่การเดาจากตัวเลือกจะบดบังว่าเด็กเข้าใจจริงหรือยัง
   *
   * ยังมีปุ่ม "ขอดูตัวเลือกช่วย" ให้กดเสมอ ด่านนี้จึงไม่มีทางตัน
   */
  typedAnswers?: boolean
  /** ชนิดปริศนาของด่านแบบ puzzle */
  puzzleKind?: string
  /** ชนิดมินิเกมของด่านแบบ minigame เช่น จับคู่ โยงเส้น ลากวาง รับของ */
  minigameKind?: string

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
