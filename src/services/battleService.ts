import { getMonster, pickMonsterForStage } from '../data/monsters'
import { generateUniqueQuestions } from '../questionEngine'
import { bestStreakOf } from '../questionEngine/session'
import type { Question } from '../questionEngine/types'
import type { BattleHistoryEntry, BattleState, BattleStatistics } from '../types/battle'
import type { Player } from '../types/player'
import type { Stage } from '../types/stage'
import { calculateAccuracy } from '../utils/statistics'
import {
  createBattle,
  difficultyForBattle,
  isBattleOver,
} from '../battle/battleEngine'
import { BATTLE_CONFIG, attackPowerOf, calculatePlayerDamage } from '../battle/damage'
import {
  attackWithGear,
  defenseWithGear,
  effectiveMaxHp,
} from './inventoryService'
import {
  buildSessionConfig,
  resolveDifficulty,
  resolveGrade,
  resolveQuestionTypes,
} from './questionService'
import { distributeTypes } from '../questionEngine/session'
import { createRng } from '../math/rng'

/**
 * ตัวเชื่อมการต่อสู้เข้ากับระบบเดิม
 *
 * การต่อสู้ไม่สร้างโจทย์เอง ไม่คำนวณรางวัลเอง ไม่บันทึกความคืบหน้าเอง
 * แต่เรียกใช้ Question Engine (Part 4) และส่งผลกลับไปให้
 * rewardService (Part 2) กับ stageSystem (Part 3) เป็นคนจัดการ
 */

export const MAX_BATTLE_HISTORY = 20

/**
 * จำนวนโจทย์ในหนึ่งการต่อสู้
 *
 * ต้องคำนวณจากสูตรดาเมจจริง ไม่ใช่เดาเป็นตัวเลขกลม ๆ
 * เพราะถ้าโจทย์ไม่พอ เด็กที่ตอบถูกทุกข้อจะยังแพ้ ซึ่งเป็นประสบการณ์ที่แย่ที่สุด
 *
 * คิดแบบระมัดระวัง: ไม่นับคริติคอล ไม่นับโบนัสคอมโบ
 * แล้วเผื่อข้อสำหรับตอบผิดอีกครึ่งหนึ่ง
 */
export function battleQuestionCount(stage: Stage, attackPower: number): number {
  const monster = pickMonsterForStage(stage)
  const difficulty = resolveDifficulty(stage)

  const perHit = calculatePlayerDamage({
    attackPower,
    difficulty,
    combo: 0,
    monsterDefense: monster.defense,
    isCritical: false,
  }).damage

  const totalHp = monster.hp + (monster.shield ?? 0)
  const hitsNeeded = Math.ceil(totalHp / Math.max(1, perHit))

  // เผื่อข้อที่ตอบผิดอีก 50% แล้วบวกอีก 2 ข้อกันเหนียว
  const withMargin = Math.ceil(hitsNeeded * 1.5) + 2

  return Math.max(stage.questionCount, withMargin)
}

export { attackPowerOf } from '../battle/damage'

/** สร้างชุดโจทย์สำหรับการต่อสู้ ใช้กติกาการกระจายชนิดเดียวกับด่านปกติ */
export function createBattleQuestions(
  stage: Stage,
  attackPower: number,
  seed?: string,
): Question[] {
  const config = buildSessionConfig(stage, seed)
  const count = battleQuestionCount(stage, attackPower)
  const plan = createRng(seed).shuffle(distributeTypes(config.questionTypes, count))

  return generateUniqueQuestions(count, (index) => ({
    type: plan[index] ?? resolveQuestionTypes(stage)[0]!,
    grade: resolveGrade(stage),
    difficulty: resolveDifficulty(stage),
    seed,
  }))
}

export interface StartBattleInput {
  player: Player
  stage: Stage
  seed?: string
}

export function startStageBattle(input: StartBattleInput): BattleState {
  const monster = pickMonsterForStage(input.stage)
  const attackPower = attackWithGear(input.player, attackPowerOf(input.player.level))
  const questions = createBattleQuestions(input.stage, attackPower, input.seed)

  return createBattle({
    stageId: input.stage.id,
    monsterId: monster.id,
    questions,
    player: {
      id: input.player.id,
      name: input.player.name,
      avatar: input.player.avatar,
      level: input.player.level,
      hp: input.player.hp,
      // เกราะเพิ่มพลังชีวิตสูงสุด จึงต้องใช้ค่าที่รวมของแล้วในการต่อสู้ด้วย
      maxHp: effectiveMaxHp(input.player),
      // ของที่สวมอยู่ต้องมีผลจริง ไม่งั้นซื้ออาวุธไปก็ไม่ต่างอะไร
      attackPower,
      defense: defenseWithGear(input.player, BATTLE_CONFIG.basePlayerDefense),
    },
    seed: input.seed,
  })
}

/**
 * โจทย์เพิ่มเติมเมื่อเข้าเฟสใหม่ของบอส
 * เฟสหลังโจทย์ยากขึ้น จึงต้องสร้างใหม่ ไม่ใช้ชุดเดิมที่สร้างไว้ตั้งแต่ต้น
 */
export function questionsForCurrentPhase(
  state: BattleState,
  stage: Stage,
  count: number,
  seed?: string,
): Question[] {
  const difficulty = difficultyForBattle(state, resolveDifficulty(stage))
  const types = resolveQuestionTypes(stage)
  const plan = distributeTypes(types, count)

  return generateUniqueQuestions(count, (index) => ({
    type: plan[index] ?? types[0]!,
    grade: resolveGrade(stage),
    difficulty,
    seed,
  }))
}

export interface BattleSummary {
  won: boolean
  totalQuestions: number
  correctAnswers: number
  accuracy: number
  maxCombo: number
  damageDealt: number
  damageTaken: number
  /** รางวัลจากมอนสเตอร์ จ่ายเฉพาะตอนชนะ */
  monsterExp: number
  monsterCoins: number
}

export function summarizeBattle(state: BattleState): BattleSummary {
  const total = state.results.length
  const correct = state.results.filter((result) => result.correct).length
  const monster = getMonster(state.monster.monsterId)
  const won = state.status === 'victory'

  return {
    won,
    totalQuestions: total,
    correctAnswers: correct,
    accuracy: calculateAccuracy(correct, total),
    maxCombo: state.maxCombo,
    damageDealt: state.damageDealt,
    damageTaken: state.damageTaken,
    monsterExp: won ? (monster?.rewards.exp ?? 0) : 0,
    monsterCoins: won ? (monster?.rewards.coins ?? 0) : 0,
  }
}

/** บันทึกประวัติการต่อสู้ เก็บจำกัดจำนวนไม่ให้ข้อมูลโตไม่สิ้นสุด */
export function appendHistory(
  history: readonly BattleHistoryEntry[],
  state: BattleState,
): BattleHistoryEntry[] {
  if (!isBattleOver(state)) return [...history]

  const summary = summarizeBattle(state)
  const entry: BattleHistoryEntry = {
    battleId: state.battleId,
    stageId: state.stageId,
    monsterId: state.monster.monsterId,
    result: state.status === 'victory' ? 'victory' : 'defeat',
    accuracy: summary.accuracy,
    maxCombo: state.maxCombo,
    damageDealt: state.damageDealt,
    damageTaken: state.damageTaken,
    startedAt: state.startedAt,
    endedAt: state.endedAt ?? new Date().toISOString(),
  }

  const next = [...history, entry]
  return next.length > MAX_BATTLE_HISTORY
    ? next.slice(next.length - MAX_BATTLE_HISTORY)
    : next
}

export function createEmptyBattleStatistics(): BattleStatistics {
  return {
    battleCount: 0,
    victories: 0,
    defeats: 0,
    bestCombo: 0,
    highestDamage: 0,
    bossesDefeated: 0,
  }
}

export function updateBattleStatistics(
  statistics: BattleStatistics,
  state: BattleState,
): BattleStatistics {
  if (!isBattleOver(state)) return statistics

  const won = state.status === 'victory'
  const monster = getMonster(state.monster.monsterId)
  const isBoss = monster?.type === 'boss' || monster?.type === 'mini_boss'

  return {
    battleCount: statistics.battleCount + 1,
    victories: statistics.victories + (won ? 1 : 0),
    defeats: statistics.defeats + (won ? 0 : 1),
    bestCombo: Math.max(statistics.bestCombo, state.maxCombo),
    highestDamage: Math.max(statistics.highestDamage, state.damageDealt),
    bossesDefeated: statistics.bossesDefeated + (won && isBoss ? 1 : 0),
  }
}

/** จำนวนตอบถูกติดกันสูงสุดในการต่อสู้ ใช้ค่าเดียวกับระบบชุดโจทย์ */
export function battleBestStreak(state: BattleState): number {
  return bestStreakOf(state.results)
}
