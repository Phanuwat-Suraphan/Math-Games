import { RULES, getComboTier, type ComboTier } from '../rules'

/**
 * การคำนวณดาเมจ ตามหน้ากติกาของเกม
 *
 *   Critical Hit  — พลังโจมตี ÷ เกราะ ลงตัว (เศษ 0) → ดาเมจ = พลังโจมตีเต็มจำนวน
 *   Blocked       — มีเศษเหลือ → ดาเมจ = พลังโจมตี − (เศษ × 10)  ติดลบปัดเป็น 0
 *
 * ตัวอย่างจากหน้ากติกา: โจมตี 25 ใส่เกราะ 7
 *   25 ÷ 7 = 3 เศษ 4  →  25 − (4 × 10) = −15  →  0
 */

export type HeroPassive = 'precisionStrike' | 'soulSiphon' | null

export interface DamageInput {
  power: number
  divisor: number
  /** จำนวน Critical Hit ติดต่อกันก่อนหน้านี้ */
  comboStreak: number
  /** ความสามารถติดตัวของฮีโร่ที่โจมตี */
  passive?: HeroPassive
}

export interface DamageResult {
  /** ดาเมจสุดท้ายที่เป้าหมายได้รับ */
  damage: number
  isCritical: boolean
  quotient: number
  remainder: number

  /** ดาเมจก่อนบวกโบนัสต่าง ๆ */
  baseDamage: number
  /** โทษจากเศษที่เหลือ */
  remainderPenalty: number
  /** โบนัสจากความสามารถฮีโร่ */
  passiveBonus: number
  /** โบนัสจากคอมโบ */
  comboBonus: number
  comboTier: ComboTier | null
  /** ค่าคอมโบหลังการโจมตีครั้งนี้ */
  nextComboStreak: number
}

export function calculateDamage(input: DamageInput): DamageResult {
  const power = Math.floor(input.power)
  const divisor = Math.max(1, Math.floor(input.divisor))
  const passive = input.passive ?? null

  // พลังโจมตีติดลบหรือศูนย์ ไม่ทำอะไรเลย และคอมโบขาด
  if (power <= 0) {
    return {
      damage: 0,
      isCritical: false,
      quotient: 0,
      remainder: 0,
      baseDamage: 0,
      remainderPenalty: 0,
      passiveBonus: 0,
      comboBonus: 0,
      comboTier: null,
      nextComboStreak: 0,
    }
  }

  const quotient = Math.floor(power / divisor)
  const remainder = power % divisor
  const isCritical = remainder === 0

  let baseDamage: number
  let remainderPenalty = 0
  let passiveBonus = 0

  if (isCritical) {
    baseDamage = power
    if (passive === 'precisionStrike') {
      passiveBonus = RULES.precisionStrikeBonus
    }
  } else if (passive === 'soulSiphon') {
    // Morwenna: ไม่โดนโทษจากเศษ แต่เอาค่าเศษไปเพิ่มดาเมจแทน
    baseDamage = power
    passiveBonus = remainder
  } else {
    remainderPenalty = remainder * RULES.remainderPenaltyMultiplier
    baseDamage = Math.max(0, power - remainderPenalty)
  }

  // คอมโบนับเฉพาะ Critical Hit ติดต่อกัน
  const nextComboStreak = isCritical ? input.comboStreak + 1 : 0
  const comboTier = isCritical ? getComboTier(nextComboStreak) : null

  const beforeCombo = baseDamage + passiveBonus
  const comboBonus = comboTier
    ? Math.floor((beforeCombo * comboTier.bonusPercent) / 100)
    : 0

  return {
    damage: Math.max(0, beforeCombo + comboBonus),
    isCritical,
    quotient,
    remainder,
    baseDamage,
    remainderPenalty,
    passiveBonus,
    comboBonus,
    comboTier,
    nextComboStreak,
  }
}

/** คำอธิบายการคำนวณทีละขั้น สำหรับแสดงให้เด็กเห็นว่าเลขมาจากไหน */
export function explainDamage(
  input: DamageInput,
  result: DamageResult,
): string[] {
  const lines: string[] = []
  const { power, divisor } = input

  if (power <= 0) {
    return ['พลังโจมตีต้องมากกว่า 0 ถึงจะทำดาเมจได้']
  }

  lines.push(
    `${power} ÷ ${divisor} = ${result.quotient} เศษ ${result.remainder}`,
  )

  if (result.isCritical) {
    lines.push(`หารลงตัว! Critical Hit → ดาเมจเต็ม ${power}`)
  } else if (result.passiveBonus > 0 && result.remainderPenalty === 0) {
    lines.push(`ดูดกลืนเศษวิญญาณ: ไม่โดนโทษ แถมได้เศษ ${result.remainder} เพิ่ม`)
  } else {
    lines.push(
      `มีเศษ ${result.remainder} → ${power} − (${result.remainder} × ${RULES.remainderPenaltyMultiplier}) = ${power - result.remainderPenalty}`,
    )
    if (result.baseDamage === 0) {
      lines.push('ติดลบจึงปัดเป็น 0 — คราวหน้าลองหาสมการที่หารลงตัวนะ')
    }
  }

  if (result.passiveBonus > 0 && result.isCritical) {
    lines.push(`คมดาบไร้ที่ติ: +${result.passiveBonus}`)
  }
  if (result.comboTier) {
    lines.push(
      `${result.comboTier.emoji} ${result.comboTier.label} +${result.comboTier.bonusPercent}% = +${result.comboBonus}`,
    )
  }

  lines.push(`รวมดาเมจ ${result.damage}`)
  return lines
}
