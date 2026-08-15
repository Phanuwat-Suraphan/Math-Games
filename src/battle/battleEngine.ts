import { getMonster } from '../data/monsters'
import { createRng } from '../math/rng'
import { checkAnswer } from '../questionEngine'
import type { Difficulty, Question, QuestionResult } from '../questionEngine/types'
import type {
  BattleLogEntry,
  BattleMonster,
  BattlePlayer,
  BattleState,
  BossPhase,
  Monster,
} from '../types/battle'
import {
  BATTLE_CONFIG,
  applyDamage,
  attackPowerOf,
  calculateMonsterDamage,
  calculatePlayerDamage,
  criticalChance,
  healUp,
  isHealQuestion,
  type DamageBreakdown,
} from './damage'

/**
 * เครื่องยนต์การต่อสู้
 *
 * ทุกฟังก์ชันเป็น pure function คืนสถานะชุดใหม่เสมอ เหมือน rewardService ของ Part 2
 * จึงทดสอบการต่อสู้ทั้งเกมได้โดยไม่ต้องมี React และไม่ต้องเปิดเบราว์เซอร์
 *
 * การไหลของสถานะ
 *   intro → question → feedback → question → … → victory / defeat
 *                          ↘ phase_transition ↗   (เฉพาะบอส)
 *   ทุกสถานะกด paused ได้ และกลับมาที่เดิมได้
 */

const MAX_LOG = 30

function pushLog(log: BattleLogEntry[], entry: BattleLogEntry): BattleLogEntry[] {
  const next = [...log, entry]
  return next.length > MAX_LOG ? next.slice(next.length - MAX_LOG) : next
}

export interface CreateBattleInput {
  stageId: string
  monsterId: string
  questions: Question[]
  player: {
    id: string
    name: string
    avatar: string
    level: number
    hp: number
    maxHp: number
    /**
     * พลังโจมตีและพลังป้องกันที่รวมของสวมใส่มาแล้ว
     *
     * ผู้เรียกเป็นคนคำนวณให้ ไม่ใช่ให้เครื่องยนต์ไปอ่านของในกระเป๋าเอง
     * เพราะเครื่องยนต์ต่อสู้ไม่ควรรู้จักระบบร้านค้าเลย
     * ถ้าไม่ส่งมา จะใช้ค่าที่คิดจากเลเวลอย่างเดียวตามเดิม
     */
    attackPower?: number
    defense?: number
  }
  /** ระบุเพื่อให้ผลการสุ่ม (คริติคอล/มอนสเตอร์โจมตี) ซ้ำเดิมได้ตอนทดสอบ */
  seed?: string
}

function toBattleMonster(monster: Monster): BattleMonster {
  return {
    monsterId: monster.id,
    name: monster.name,
    thaiName: monster.thaiName,
    type: monster.type,
    avatar: monster.avatar,
    hp: monster.hp,
    maxHp: monster.hp,
    shield: monster.shield ?? 0,
    attack: monster.attack,
    defense: monster.defense,
    phaseIndex: 0,
  }
}

export function createBattle(input: CreateBattleInput): BattleState {
  const monster = getMonster(input.monsterId)
  if (!monster) {
    throw new Error(`ไม่พบมอนสเตอร์: ${input.monsterId}`)
  }

  const player: BattlePlayer = {
    id: input.player.id,
    name: input.player.name,
    avatar: input.player.avatar,
    level: input.player.level,
    hp: input.player.hp,
    maxHp: input.player.maxHp,
    shield: 0,
    attackPower: input.player.attackPower ?? attackPowerOf(input.player.level),
    defense: input.player.defense ?? BATTLE_CONFIG.basePlayerDefense,
  }

  return {
    /*
     * รหัสการต่อสู้เป็นตัวตั้งของการสุ่มทั้งหมดในรอบนี้ (คริติคอล การโจมตีกลับ)
     * ถ้าระบุ seed มาจะได้รหัสเดิม ผลการสุ่มจึงซ้ำเดิม ทำให้ทดสอบได้แน่นอน
     * ถ้าไม่ระบุจะใช้เวลาปัจจุบัน แต่ละรอบจึงไม่เหมือนกัน
     */
    battleId: `battle-${input.stageId}-${input.seed ?? Date.now().toString(36)}`,
    stageId: input.stageId,
    player,
    monster: toBattleMonster(monster),
    status: 'intro',
    questions: input.questions,
    questionIndex: 0,
    results: [],
    combo: 0,
    maxCombo: 0,
    damageDealt: 0,
    damageTaken: 0,
    log: [
      {
        text: `${monster.thaiName} ปรากฏตัว! แก้โจทย์ให้ถูกเพื่อโจมตี`,
        tone: 'system',
      },
    ],
    rewardCommitted: false,
    startedAt: new Date().toISOString(),
  }
}

/** เริ่มการต่อสู้จริงหลังจบฉากเปิด */
export function beginBattle(state: BattleState): BattleState {
  if (state.status !== 'intro') return state
  return { ...state, status: 'question' }
}

export function currentQuestion(state: BattleState): Question | null {
  return state.questions[state.questionIndex] ?? null
}

/** เฟสของบอสตามพลังชีวิตที่เหลือ */
export function resolvePhase(state: BattleState): { index: number; phase: BossPhase | null } {
  const monster = getMonster(state.monster.monsterId)
  const phases = monster?.phases
  if (!phases || phases.length === 0) return { index: 0, phase: null }

  const percent = (state.monster.hp / Math.max(1, state.monster.maxHp)) * 100

  // หาเฟสที่ต่ำที่สุดที่ผ่านเกณฑ์แล้ว เฟสเรียงจากมากไปน้อย
  let index = 0
  for (let i = 0; i < phases.length; i += 1) {
    if (percent <= (phases[i] as BossPhase).hpThresholdPercent) index = i
  }
  return { index, phase: phases[index] ?? null }
}

/** ความยากที่ควรใช้กับข้อถัดไป เฟสบอสมีสิทธิ์ยกระดับความยาก */
export function difficultyForBattle(
  state: BattleState,
  fallback: Difficulty,
): Difficulty {
  const { phase } = resolvePhase(state)
  return phase?.difficulty ?? fallback
}

export interface AttackInput {
  selectedAnswer: string
  timeSpent: number
  usedHint?: boolean
  answeredAt?: string
}

export interface AttackOutcome {
  state: BattleState
  correct: boolean
  /** รายละเอียดดาเมจที่ผู้เล่นทำ มีเฉพาะเมื่อตอบถูก */
  playerDamage: DamageBreakdown | null
  /** ดาเมจที่ผู้เล่นได้รับจากมอนสเตอร์ */
  monsterDamage: number
  healed: number
  /** เข้าเฟสใหม่ของบอสหรือไม่ */
  enteredPhase: BossPhase | null
}

/**
 * ตอบโจทย์หนึ่งข้อ แล้วคำนวณผลทั้งรอบ
 *
 * ตอบถูก  → โจมตีมอนสเตอร์ คอมโบเพิ่ม
 * ตอบผิด  → คอมโบขาด และมอนสเตอร์มีโอกาสโจมตีกลับ
 *
 * ไม่มีการโจมตีของมอนสเตอร์เมื่อผู้เล่นตอบถูก เพื่อให้เด็กรู้สึกว่า
 * "คิดถูก = ปลอดภัย" ซึ่งเป็นข้อความที่เราอยากให้เด็กได้รับ
 */
export function answerAndAttack(
  state: BattleState,
  input: AttackInput,
): AttackOutcome | null {
  // ตอบได้เฉพาะตอนกำลังทำโจทย์ กันการยิงซ้ำตอนหยุดเกม เปลี่ยนเฟส หรือจบแล้ว
  if (state.status !== 'question' && state.status !== 'feedback') return null

  const question = currentQuestion(state)
  if (!question) return null

  const correct = checkAnswer(question, input.selectedAnswer)
  const answeredAt = input.answeredAt ?? new Date().toISOString()

  // สุ่มจากรหัสการต่อสู้กับลำดับข้อ ผลจึงซ้ำเดิมได้เมื่อทดสอบ
  const rng = createRng(`${state.battleId}:${state.questionIndex}`)

  const result: QuestionResult = {
    questionId: question.id,
    correct,
    selectedAnswer: input.selectedAnswer,
    correctAnswer: question.correctAnswer,
    timeSpent: Math.max(0, Math.round(input.timeSpent)),
    skill: question.skill,
    type: question.type,
    difficulty: question.difficulty,
    usedHint: input.usedHint === true,
    timestamp: answeredAt,
  }

  let next: BattleState = {
    ...state,
    results: [...state.results, result],
    questionIndex: state.questionIndex + 1,
    status: 'feedback',
  }

  let playerDamage: DamageBreakdown | null = null
  let monsterDamage = 0
  let healed = 0
  let enteredPhase: BossPhase | null = null

  if (correct) {
    const combo = state.combo + 1
    const isCritical = rng.next() < criticalChance(question.difficulty)

    playerDamage = calculatePlayerDamage({
      attackPower: state.player.attackPower,
      difficulty: question.difficulty,
      combo: state.combo,
      monsterDefense: state.monster.defense,
      isCritical,
    })

    const hit = applyDamage(state.monster.hp, state.monster.shield, playerDamage.damage)

    next = {
      ...next,
      combo,
      maxCombo: Math.max(state.maxCombo, combo),
      damageDealt: state.damageDealt + playerDamage.damage,
      monster: { ...next.monster, hp: hit.hp, shield: hit.shield },
    }

    next.log = pushLog(next.log, {
      text: isCritical
        ? `💥 คริติคอล! คณิตศาสตร์ของหนูสร้างพลังโจมตี ${playerDamage.damage} แต้ม`
        : `✨ ตอบถูก! โจมตี ${playerDamage.damage} แต้ม`,
      tone: isCritical ? 'critical' : 'player',
    })

    if (hit.shieldAbsorbed > 0 && hit.shield === 0) {
      next.log = pushLog(next.log, {
        text: `🛡️ เกราะของ${state.monster.thaiName}แตกแล้ว!`,
        tone: 'system',
      })
    }

    if (combo >= 2) {
      next.log = pushLog(next.log, { text: `🔥 คอมโบ x${combo}`, tone: 'player' })
    }

    // ข้อฟื้นพลัง: ตอบถูกในข้อที่กำหนดจะได้พลังชีวิตคืน
    if (isHealQuestion(state.questionIndex)) {
      const before = next.player.hp
      const after = healUp(before, next.player.maxHp, BATTLE_CONFIG.healPerHealQuestion)
      healed = after - before
      if (healed > 0) {
        next = { ...next, player: { ...next.player, hp: after } }
        next.log = pushLog(next.log, { text: `❤️ ฟื้นพลังชีวิต +${healed}`, tone: 'system' })
      }
    }
  } else {
    next = { ...next, combo: 0 }
    next.log = pushLog(next.log, {
      text: '💪 ยังไม่ถูก ไม่เป็นไร ตั้งหลักแล้วลุยข้อต่อไป',
      tone: 'system',
    })

    // มอนสเตอร์ไม่ได้โจมตีทุกครั้ง เพื่อไม่ให้เด็กที่ยังไม่คล่องแพ้เร็วเกินไป
    if (rng.next() < BATTLE_CONFIG.monsterAttackChance) {
      const monster = getMonster(state.monster.monsterId)
      const useSpecial =
        monster?.specialAttack !== undefined && state.combo === 0 && rng.next() < 0.25
      const multiplier = useSpecial ? (monster?.specialAttack?.multiplier ?? 1) : 1

      monsterDamage = calculateMonsterDamage(
        state.monster.attack,
        state.player.defense,
        multiplier,
      )

      const hit = applyDamage(next.player.hp, next.player.shield, monsterDamage)
      next = {
        ...next,
        damageTaken: state.damageTaken + hit.hpLost,
        player: { ...next.player, hp: hit.hp, shield: hit.shield },
      }

      next.log = pushLog(next.log, {
        text: useSpecial
          ? `🔥 ${state.monster.thaiName}ใช้${monster?.specialAttack?.name}! หนูเสียพลังชีวิต ${monsterDamage}`
          : `${state.monster.thaiName}โจมตีกลับ ${monsterDamage} แต้ม`,
        tone: 'monster',
      })
    }
  }

  // ตรวจการเปลี่ยนเฟสของบอสหลังหักพลังชีวิตแล้ว
  const phaseInfo = resolvePhase(next)
  if (phaseInfo.index > next.monster.phaseIndex && phaseInfo.phase) {
    enteredPhase = phaseInfo.phase
    next = {
      ...next,
      monster: { ...next.monster, phaseIndex: phaseInfo.index },
      status: 'phase_transition',
    }
    next.log = pushLog(next.log, { text: phaseInfo.phase.message, tone: 'system' })
  }

  return {
    state: settleOutcome(next),
    correct,
    playerDamage,
    monsterDamage,
    healed,
    enteredPhase,
  }
}

/**
 * ตัดสินผลการต่อสู้
 *
 * มอนสเตอร์หมดพลัง → ชนะ
 * ผู้เล่นหมดพลัง → แพ้
 * โจทย์หมดแต่มอนสเตอร์ยังอยู่ → ถือว่ายังไม่ชนะ ให้ลองใหม่ได้
 */
function settleOutcome(state: BattleState): BattleState {
  if (state.monster.hp <= 0) {
    return {
      ...state,
      status: 'victory',
      endedAt: new Date().toISOString(),
      log: pushLog(state.log, {
        text: `🎉 เอาชนะ${state.monster.thaiName}ได้แล้ว!`,
        tone: 'system',
      }),
    }
  }

  if (state.player.hp <= 0) {
    return {
      ...state,
      status: 'defeat',
      endedAt: new Date().toISOString(),
      log: pushLog(state.log, {
        text: '🌟 ทุกการต่อสู้ทำให้เราเก่งขึ้น ลองใหม่อีกครั้งนะ',
        tone: 'system',
      }),
    }
  }

  if (state.questionIndex >= state.questions.length) {
    return {
      ...state,
      status: 'defeat',
      endedAt: new Date().toISOString(),
      log: pushLog(state.log, {
        text: 'โจทย์หมดแล้วแต่ยังล้มมอนสเตอร์ไม่ได้ ลองอีกครั้งนะ',
        tone: 'system',
      }),
    }
  }

  return state
}

/** ปิดฉากเปลี่ยนเฟสแล้วกลับไปทำโจทย์ต่อ */
export function continueAfterPhase(state: BattleState): BattleState {
  if (state.status !== 'phase_transition') return state
  return { ...state, status: 'question' }
}

/** ปิดหน้าผลการตอบแล้วไปข้อถัดไป */
export function continueToNextQuestion(state: BattleState): BattleState {
  if (state.status !== 'feedback') return state
  return { ...state, status: 'question' }
}

export function pauseBattle(state: BattleState): BattleState {
  if (state.status === 'paused') return state
  if (state.status === 'victory' || state.status === 'defeat') return state
  return { ...state, status: 'paused', statusBeforePause: state.status }
}

export function resumeBattle(state: BattleState): BattleState {
  if (state.status !== 'paused') return state
  return {
    ...state,
    status: state.statusBeforePause ?? 'question',
    statusBeforePause: undefined,
  }
}

/** เริ่มการต่อสู้ใหม่ด้วยโจทย์ชุดใหม่ รางวัลของรอบเดิมไม่ถูกนับ */
export function restartBattle(
  state: BattleState,
  questions: Question[],
  playerHp: number,
): BattleState {
  const monster = getMonster(state.monster.monsterId)
  if (!monster) return state

  return {
    ...state,
    battleId: `battle-${state.stageId}-${Date.now().toString(36)}`,
    player: { ...state.player, hp: playerHp, shield: 0 },
    monster: toBattleMonster(monster),
    status: 'intro',
    questions,
    questionIndex: 0,
    results: [],
    combo: 0,
    maxCombo: 0,
    damageDealt: 0,
    damageTaken: 0,
    log: [{ text: 'เริ่มการต่อสู้ใหม่ สู้ ๆ นะ!', tone: 'system' }],
    rewardCommitted: false,
    startedAt: new Date().toISOString(),
    endedAt: undefined,
  }
}

export function isBattleOver(state: BattleState): boolean {
  return state.status === 'victory' || state.status === 'defeat'
}

/**
 * ทำเครื่องหมายว่าจ่ายรางวัลแล้ว
 * คืน null ถ้าจ่ายไปแล้ว เพื่อให้ผู้เรียกรู้ว่าห้ามจ่ายซ้ำ
 */
export function commitReward(state: BattleState): BattleState | null {
  if (state.rewardCommitted) return null
  if (state.status !== 'victory') return null
  return { ...state, rewardCommitted: true }
}
