export const BASE_EXP_REQUIREMENT = 100
export const EXP_REQUIREMENT_STEP = 50
export const MAX_LEVEL = 99

export const EXP_PER_CORRECT_ANSWER = 10
export const COINS_PER_CORRECT_ANSWER = 5

/** EXP ที่ต้องใช้เพื่อเลื่อนจากเลเวลนี้ไปเลเวลถัดไป: Lv.1 = 100, Lv.2 = 150, Lv.3 = 200 */
export function expRequiredForLevel(level: number): number {
  const safeLevel = Math.max(1, Math.floor(level))
  return BASE_EXP_REQUIREMENT + (safeLevel - 1) * EXP_REQUIREMENT_STEP
}

export interface ExpProgress {
  level: number
  exp: number
  required: number
  percent: number
  isMaxLevel: boolean
}

export function getExpProgress(level: number, exp: number): ExpProgress {
  const required = expRequiredForLevel(level)
  const isMaxLevel = level >= MAX_LEVEL
  const safeExp = Math.max(0, exp)
  const percent = isMaxLevel
    ? 100
    : Math.min(100, Math.round((safeExp / required) * 100))

  return { level, exp: safeExp, required, percent, isMaxLevel }
}

export interface ExpGainResult {
  level: number
  exp: number
  levelsGained: number
}

/** คำนวณเลเวลใหม่หลังได้รับ EXP รองรับการเลื่อนหลายเลเวลติดกัน */
export function applyExpGain(
  currentLevel: number,
  currentExp: number,
  gainedExp: number,
): ExpGainResult {
  let level = Math.max(1, Math.floor(currentLevel))
  let exp = Math.max(0, Math.floor(currentExp)) + Math.max(0, Math.floor(gainedExp))
  let levelsGained = 0

  while (level < MAX_LEVEL && exp >= expRequiredForLevel(level)) {
    exp -= expRequiredForLevel(level)
    level += 1
    levelsGained += 1
  }

  if (level >= MAX_LEVEL) {
    level = MAX_LEVEL
    exp = 0
  }

  return { level, exp, levelsGained }
}
