import type { Player } from '../types/player'

export const MAX_LEVEL = 99

/**
 * เส้นโค้ง EXP ปรับได้จากที่เดียว
 * required(L) = base + linear × (L−1) + quadratic × (L−1)(L−2) / 2
 * ค่าเริ่มต้นให้ผลลัพธ์: Lv.1 = 100, Lv.2 = 150, Lv.3 = 225, Lv.4 = 325, Lv.5 = 450
 */
export const EXP_CURVE = {
  base: 100,
  linear: 50,
  quadratic: 25,
} as const

/** EXP ที่ต้องใช้เพื่อเลื่อนจากเลเวลที่ระบุไปเลเวลถัดไป */
export function getRequiredExp(level: number): number {
  const safeLevel = Math.max(1, Math.floor(level))
  const step = safeLevel - 1
  return (
    EXP_CURVE.base +
    EXP_CURVE.linear * step +
    (EXP_CURVE.quadratic * step * (step - 1)) / 2
  )
}

/** EXP สะสมทั้งหมดที่ต้องใช้เพื่อไปถึงเลเวลที่ระบุ (เลเวล 1 = 0) */
export function getCumulativeExpForLevel(level: number): number {
  const safeLevel = Math.min(MAX_LEVEL, Math.max(1, Math.floor(level)))
  let total = 0
  for (let current = 1; current < safeLevel; current += 1) {
    total += getRequiredExp(current)
  }
  return total
}

export interface LevelFromExp {
  level: number
  /** EXP ที่เหลืออยู่ในเลเวลนั้น */
  exp: number
}

/** แปลง EXP สะสมทั้งหมดเป็นเลเวล ใช้ทั้งตอนคำนวณและตอนตรวจสอบข้อมูลที่โหลดมา */
export function calculateLevel(totalExp: number): LevelFromExp {
  let remaining = Math.max(0, Math.floor(totalExp))
  let level = 1

  while (level < MAX_LEVEL && remaining >= getRequiredExp(level)) {
    remaining -= getRequiredExp(level)
    level += 1
  }

  if (level >= MAX_LEVEL) {
    return { level: MAX_LEVEL, exp: 0 }
  }

  return { level, exp: remaining }
}

/** EXP สะสมทั้งหมดของผู้เล่น (ใช้แสดงผลและตรวจสอบความถูกต้องของข้อมูล) */
export function getTotalExp(player: Pick<Player, 'level' | 'exp'>): number {
  return getCumulativeExpForLevel(player.level) + Math.max(0, player.exp)
}

export interface ExpProgress {
  level: number
  exp: number
  required: number
  percent: number
  remaining: number
  isMaxLevel: boolean
}

export function getExpProgress(
  player: Pick<Player, 'level' | 'exp'>,
): ExpProgress {
  const level = Math.min(MAX_LEVEL, Math.max(1, Math.floor(player.level)))
  const exp = Math.max(0, Math.floor(player.exp))
  const required = getRequiredExp(level)
  const isMaxLevel = level >= MAX_LEVEL

  return {
    level,
    exp,
    required,
    percent: isMaxLevel ? 100 : Math.min(100, Math.round((exp / required) * 100)),
    remaining: isMaxLevel ? 0 : Math.max(0, required - exp),
    isMaxLevel,
  }
}

export interface ExpGainResult {
  level: number
  exp: number
  levelsGained: number
}

/**
 * คำนวณเลเวลใหม่หลังได้รับ EXP
 * รองรับการได้รับ EXP ก้อนใหญ่จนเลื่อนหลายเลเวลในครั้งเดียว โดยไม่รีเซ็ต EXP ผิดพลาด
 */
export function applyExpGain(
  currentLevel: number,
  currentExp: number,
  gainedExp: number,
): ExpGainResult {
  const startLevel = Math.min(MAX_LEVEL, Math.max(1, Math.floor(currentLevel)))

  if (startLevel >= MAX_LEVEL) {
    return { level: MAX_LEVEL, exp: 0, levelsGained: 0 }
  }

  const totalExp =
    getCumulativeExpForLevel(startLevel) +
    Math.max(0, Math.floor(currentExp)) +
    Math.max(0, Math.floor(gainedExp))

  const next = calculateLevel(totalExp)

  return {
    level: next.level,
    exp: next.exp,
    levelsGained: Math.max(0, next.level - startLevel),
  }
}

export interface AddExpResult {
  player: Player
  levelsGained: number
  newLevel: number
  gainedExp: number
}

/** เพิ่ม EXP ให้ผู้เล่นและคืนผู้เล่นชุดใหม่ (ไม่แก้ไขข้อมูลเดิมโดยตรง) */
export function addExp(player: Player, amount: number): AddExpResult {
  const gainedExp = Math.max(0, Math.floor(amount))
  const gain = applyExpGain(player.level, player.exp, gainedExp)

  return {
    player: { ...player, level: gain.level, exp: gain.exp },
    levelsGained: gain.levelsGained,
    newLevel: gain.level,
    gainedExp,
  }
}
