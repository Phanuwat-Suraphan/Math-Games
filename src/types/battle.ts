import type { Difficulty, Question, QuestionResult } from '../questionEngine/types'

/** ระบบต่อสู้ — โมเดลข้อมูลทั้งหมด */

export type MonsterType = 'normal' | 'elite' | 'mini_boss' | 'boss'

export interface Monster {
  id: string
  name: string
  /** ชื่อไทยที่เด็กอ่านเข้าใจ */
  thaiName: string
  type: MonsterType

  level: number
  hp: number
  attack: number
  defense: number

  /** เกราะที่ต้องทำลายก่อนถึงจะทำดาเมจเข้าตัวได้ */
  shield?: number

  description: string
  avatar: string

  rewards: { exp: number; coins: number }

  /** บอสเท่านั้น: โจทย์แต่ละเฟสจะยากขึ้น */
  phases?: BossPhase[]
  /** ท่าไม้ตายของบอส */
  specialAttack?: { name: string; multiplier: number }
}

export interface BossPhase {
  /** เข้าเฟสนี้เมื่อ HP เหลือไม่เกินร้อยละเท่าไร */
  hpThresholdPercent: number
  name: string
  message: string
  difficulty: Difficulty
}

export interface BattlePlayer {
  id: string
  name: string
  avatar: string
  level: number

  hp: number
  maxHp: number
  shield: number

  attackPower: number
  defense: number
}

export interface BattleMonster {
  monsterId: string
  name: string
  thaiName: string
  type: MonsterType
  avatar: string

  hp: number
  maxHp: number
  shield: number
  attack: number
  defense: number

  /** ลำดับเฟสของบอส เริ่มที่ 0 */
  phaseIndex: number
}

/**
 * สถานะของการต่อสู้
 *
 * ใช้ค่าสถานะเดียว (status) แทนการมีธง boolean หลายตัว
 * เพราะธงหลายตัวจะขัดกันเองได้ เช่น isPaused กับ isVictory เป็นจริงพร้อมกัน
 */
export type BattleStatus =
  | 'intro'
  | 'question'
  | 'feedback'
  | 'phase_transition'
  | 'victory'
  | 'defeat'
  | 'paused'

export interface BattleLogEntry {
  text: string
  tone: 'player' | 'monster' | 'system' | 'critical'
}

export interface BattleState {
  battleId: string
  stageId: string

  player: BattlePlayer
  monster: BattleMonster

  status: BattleStatus
  /** สถานะก่อนกดหยุดชั่วคราว ใช้กลับไปที่เดิมเมื่อเล่นต่อ */
  statusBeforePause?: BattleStatus

  questions: Question[]
  questionIndex: number
  results: QuestionResult[]

  combo: number
  maxCombo: number

  damageDealt: number
  damageTaken: number

  log: BattleLogEntry[]

  /**
   * กันการรับรางวัลซ้ำ ตั้งเป็น true เมื่อจ่ายรางวัลไปแล้ว
   * จำเป็นเพราะผู้เล่นอาจกดปุ่มรัว หรือหน้าจอ re-render
   */
  rewardCommitted: boolean

  startedAt: string
  endedAt?: string
}

export interface BattleHistoryEntry {
  battleId: string
  stageId: string
  monsterId: string
  result: 'victory' | 'defeat'
  accuracy: number
  maxCombo: number
  damageDealt: number
  damageTaken: number
  startedAt: string
  endedAt: string
}

/** สถิติการต่อสู้สะสมของผู้เล่น */
export interface BattleStatistics {
  battleCount: number
  victories: number
  defeats: number
  bestCombo: number
  highestDamage: number
  bossesDefeated: number
}
