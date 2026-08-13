/** ทักษะทางคณิตศาสตร์ที่เกมติดตามความก้าวหน้า ครอบคลุมทุกโลกตั้งแต่ World 1–6 */
export type SkillId =
  | 'addition'
  | 'subtraction'
  | 'multiplication'
  | 'division'
  | 'fractions'
  | 'decimals'
  | 'percentages'
  | 'geometry'
  | 'wordProblems'

export interface SkillStatistic {
  attempts: number
  correct: number
  /** ร้อยละ 0–100 เก็บทศนิยม 1 ตำแหน่ง คำนวณใหม่ทุกครั้งที่บันทึก */
  accuracy: number
  lastPlayedAt?: string
}

export type PlayerStatistics = Record<SkillId, SkillStatistic>

/** บันทึกการตอบรายข้อ เก็บแบบจำกัดจำนวนเพื่อไม่ให้ localStorage โตไม่สิ้นสุด */
export interface QuestionAttempt {
  questionId: string
  skill: SkillId
  levelId: string
  isCorrect: boolean
  /** เวลาที่ใช้ตอบ หน่วยมิลลิวินาที */
  timeMs: number
  answeredAt: string
}

/** สถิติของแต่ละด่าน ใช้ตัดสินว่าเป็นการเล่นครั้งแรกหรือเล่นซ้ำ */
export interface LevelRecord {
  completions: number
  bestCorrect: number
  bestAccuracy: number
  lastPlayedAt: string
}
