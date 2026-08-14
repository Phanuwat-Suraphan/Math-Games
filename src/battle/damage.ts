import { DIFFICULTY_BONUS } from '../questionEngine/difficulty/config'
import type { Difficulty } from '../questionEngine/types'

/**
 * การคำนวณดาเมจในการต่อสู้
 *
 * หลักการออกแบบ: พลังโจมตีต้องมาจาก "การแก้โจทย์ได้" เป็นหลัก
 * โบนัสอื่น ๆ (คอมโบ คริติคอล) เป็นของแถม ไม่ใช่ตัวตัดสินผลแพ้ชนะ
 * ถ้าโชคมีน้ำหนักมากกว่าความรู้ เด็กจะเรียนรู้ว่าไม่ต้องคิดก็ชนะได้
 */

export const BATTLE_CONFIG = {
  /** พลังโจมตีพื้นฐานของผู้เล่น ก่อนบวกโบนัสใด ๆ */
  basePlayerAttack: 12,
  /** พลังป้องกันเริ่มต้นของผู้เล่น */
  basePlayerDefense: 5,

  /** โบนัสดาเมจตามความยากของโจทย์ ใช้ตารางเดียวกับระบบคะแนนของ Part 4 */
  difficultyBonus: DIFFICULTY_BONUS,

  /**
   * โบนัสคอมโบเป็นร้อยละ ตอบถูกติดกันยิ่งแรง
   * จำกัดเพดานไว้ไม่ให้คอมโบยาวทำให้เกมจบเร็วเกินไป
   */
  comboBonusPercentPerStep: 5,
  maxComboBonusPercent: 20,

  /** โอกาสคริติคอลพื้นฐาน */
  baseCriticalChance: 0.1,
  /** โจทย์ยากเพิ่มโอกาสคริติคอล — ให้รางวัลกับการกล้าทำข้อยาก */
  criticalChanceByDifficulty: {
    easy: 0,
    medium: 0,
    hard: 0.05,
    expert: 0.1,
  } as Record<Difficulty, number>,
  criticalMultiplier: 2,

  /** ดาเมจขั้นต่ำ ต้องไม่เป็นศูนย์หรือติดลบ ไม่งั้นการต่อสู้จะไม่จบ */
  minimumDamage: 1,

  /** โอกาสที่มอนสเตอร์จะโจมตีกลับเมื่อผู้เล่นตอบผิด */
  monsterAttackChance: 0.8,

  /** ฟื้นพลังชีวิตเมื่อตอบถูกในข้อที่เป็นข้อฟื้นพลัง */
  healPerHealQuestion: 15,
  /** ทุก ๆ กี่ข้อจะมีข้อฟื้นพลังหนึ่งข้อ */
  healQuestionInterval: 5,
} as const

export interface PlayerDamageInput {
  attackPower: number
  difficulty: Difficulty
  /** จำนวนตอบถูกติดต่อกัน "ก่อน" ข้อนี้ */
  combo: number
  monsterDefense: number
  isCritical: boolean
}

export interface DamageBreakdown {
  /** ดาเมจสุดท้ายที่เป้าหมายได้รับ */
  damage: number
  baseDamage: number
  difficultyBonus: number
  comboBonus: number
  criticalBonus: number
  defenseReduction: number
  isCritical: boolean
}

/**
 * พลังโจมตีของผู้เล่นตามเลเวล
 *
 * อยู่ที่ไฟล์นี้เพราะทั้งเครื่องยนต์การต่อสู้และตัวคำนวณจำนวนโจทย์ต้องใช้
 * ถ้าสองที่คิดคนละสูตร จำนวนโจทย์จะไม่พอฆ่ามอนสเตอร์
 *
 * เลเวลช่วยเพิ่มพลังเล็กน้อยเท่านั้น ไม่มากจนโจทย์หมดความสำคัญ
 */
export function attackPowerOf(level: number): number {
  return BATTLE_CONFIG.basePlayerAttack + Math.floor(Math.max(1, level) / 2)
}

/** โบนัสคอมโบเป็นร้อยละ จากจำนวนตอบถูกติดกันก่อนหน้านี้ */
export function comboBonusPercent(combo: number): number {
  const steps = Math.max(0, Math.floor(combo))
  return Math.min(
    BATTLE_CONFIG.maxComboBonusPercent,
    steps * BATTLE_CONFIG.comboBonusPercentPerStep,
  )
}

/** โอกาสคริติคอลของโจทย์ระดับหนึ่ง */
export function criticalChance(difficulty: Difficulty): number {
  return (
    BATTLE_CONFIG.baseCriticalChance +
    (BATTLE_CONFIG.criticalChanceByDifficulty[difficulty] ?? 0)
  )
}

/**
 * ดาเมจที่ผู้เล่นทำใส่มอนสเตอร์เมื่อตอบถูก
 *
 * ลำดับการคิด: (พลังโจมตี + โบนัสความยาก) แล้วบวกโบนัสคอมโบเป็นร้อยละ
 * ถ้าคริติคอลคูณสอง สุดท้ายค่อยหักพลังป้องกันของมอนสเตอร์
 * หักพลังป้องกันทีหลังเพื่อไม่ให้มอนสเตอร์ป้องกันสูงกลายเป็นอมตะ
 */
export function calculatePlayerDamage(input: PlayerDamageInput): DamageBreakdown {
  const attack = Math.max(0, Math.floor(input.attackPower))
  const bonus = BATTLE_CONFIG.difficultyBonus[input.difficulty] ?? 0

  const beforeCombo = attack + bonus
  const percent = comboBonusPercent(input.combo)
  const comboBonus = Math.floor((beforeCombo * percent) / 100)

  const beforeCritical = beforeCombo + comboBonus
  const criticalBonus = input.isCritical
    ? beforeCritical * (BATTLE_CONFIG.criticalMultiplier - 1)
    : 0

  const raw = beforeCritical + criticalBonus
  const defense = Math.max(0, Math.floor(input.monsterDefense))
  const afterDefense = raw - defense

  return {
    damage: Math.max(BATTLE_CONFIG.minimumDamage, afterDefense),
    baseDamage: attack,
    difficultyBonus: bonus,
    comboBonus,
    criticalBonus,
    // รายงานเท่าที่หักได้จริง ไม่รวมส่วนที่ถูกดันขึ้นเป็นดาเมจขั้นต่ำ
    defenseReduction: Math.min(defense, Math.max(0, raw - BATTLE_CONFIG.minimumDamage)),
    isCritical: input.isCritical,
  }
}

/** ดาเมจที่มอนสเตอร์ทำใส่ผู้เล่น */
export function calculateMonsterDamage(
  monsterAttack: number,
  playerDefense: number,
  multiplier = 1,
): number {
  const attack = Math.max(0, Math.floor(monsterAttack)) * multiplier
  const defense = Math.max(0, Math.floor(playerDefense))
  return Math.max(BATTLE_CONFIG.minimumDamage, Math.floor(attack - defense))
}

export interface AbsorbResult {
  shield: number
  hp: number
  shieldAbsorbed: number
  hpLost: number
}

/**
 * รับดาเมจเข้าโล่ก่อน ส่วนที่เหลือค่อยเข้าพลังชีวิต
 * ใช้ได้ทั้งกับผู้เล่นและมอนสเตอร์ จึงไม่มีสูตรซ้ำสองที่
 */
export function applyDamage(
  hp: number,
  shield: number,
  damage: number,
): AbsorbResult {
  const incoming = Math.max(0, Math.floor(damage))
  const currentShield = Math.max(0, Math.floor(shield))

  const shieldAbsorbed = Math.min(currentShield, incoming)
  const throughToHp = incoming - shieldAbsorbed
  const nextHp = Math.max(0, Math.floor(hp) - throughToHp)

  return {
    shield: currentShield - shieldAbsorbed,
    hp: nextHp,
    shieldAbsorbed,
    hpLost: Math.floor(hp) - nextHp,
  }
}

/** ฟื้นพลังชีวิต ไม่เกินค่าสูงสุด */
export function healUp(hp: number, maxHp: number, amount: number): number {
  return Math.min(Math.floor(maxHp), Math.floor(hp) + Math.max(0, Math.floor(amount)))
}

/** ข้อนี้เป็นข้อฟื้นพลังหรือไม่ นับจากลำดับข้อ เริ่มที่ 0 */
export function isHealQuestion(questionIndex: number): boolean {
  const interval = BATTLE_CONFIG.healQuestionInterval
  return questionIndex > 0 && (questionIndex + 1) % interval === 0
}
