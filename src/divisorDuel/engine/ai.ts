import { calculateDamage } from './damage'
import { detectDeadHand, desperateStrikePower, rawMagicPower } from './deadHand'
import type { HandCard } from './deck'
import type { EquationSlot } from './equation'
import { getTargets, type GameState, type TargetOption } from './game'
import { buildCandidates, passiveOf, type Candidate } from './suggest'

/**
 * คู่ต่อสู้คอมพิวเตอร์
 *
 * วิธีคิด: ลองประกอบสมการทุกแบบที่ทำได้จากการ์ดในมือ (จำกัดไม่เกิน 3 พจน์
 * เพื่อให้คำนวณเร็วพอสำหรับเล่นบนมือถือ) แล้วเลือกแผนที่ทำดาเมจได้มากที่สุด
 *
 * ระดับความยากคุมด้วยการสุ่มเลือกจากอันดับต้น ๆ แทนที่จะเอาอันดับ 1 เสมอ
 * ระดับง่ายจึงเล่นพลาดบ้าง เหมาะกับเด็กที่เพิ่งเริ่ม
 *
 * ตัวประกอบสมการอยู่ใน suggest.ts เพราะระบบแนะนำสมการใช้ชุดเดียวกัน
 * ถ้าแยกกันเมื่อไร คำแนะนำที่เด็กได้จะไม่ตรงกับที่ AI เล่นจริง
 */

export type AiLevel = 'easy' | 'normal' | 'hard'

export interface AiPlan {
  /** ลำดับการ์ดที่จะวางเป็นสมการ */
  slots: EquationSlot[]
  bracket: { cardId: string; startTerm: number; endTerm: number } | null
  target: { kind: 'guard' | 'hero'; index: number }
  power: number
  expectedDamage: number
  isCritical: boolean
  /** วิธีพิเศษเมื่อเจอมือตาย */
  fallback: 'none' | 'rawMagic' | 'desperateStrike' | 'tacticalReset'
  /** ตัวเลขที่เลือกใช้ในกรณี Raw Magic */
  rawMagicCards?: [string, string]
}

function scoreAgainstTarget(
  candidate: Candidate,
  target: TargetOption,
  comboStreak: number,
  passive: Parameters<typeof calculateDamage>[0]['passive'],
): number {
  const result = calculateDamage({
    power: candidate.power,
    divisor: target.divisor,
    comboStreak,
    passive,
  })

  // ตีให้ล้มพอดีดีกว่าตีเกินไปมาก จึงหักคะแนนดาเมจส่วนเกิน
  const overkill = Math.max(0, result.damage - target.hp)
  return result.damage - overkill * 0.5
}

export function planTurn(state: GameState, level: AiLevel = 'normal'): AiPlan {
  const player = state.players[state.turn]
  const targets = getTargets(state).filter((target) => target.isAttackable)
  const deadHand = detectDeadHand(player.hand)

  const fallbackTarget = targets[0] ?? {
    kind: 'guard' as const,
    index: 0,
    divisor: 1,
    hp: 0,
  }

  // จัดการกรณีมือตายก่อน
  if (deadHand === 'tacticalReset') {
    return {
      slots: [],
      bracket: null,
      target: { kind: fallbackTarget.kind, index: fallbackTarget.index },
      power: 0,
      expectedDamage: 0,
      isCritical: false,
      fallback: 'tacticalReset',
    }
  }

  if (deadHand === 'rawMagicGathering') {
    const numbers = player.hand.filter(
      (card): card is HandCard & { kind: 'number' } => card.kind === 'number',
    )
    let best = { damage: -1, power: 0, pair: null as [string, string] | null, target: fallbackTarget }

    for (let i = 0; i < numbers.length; i += 1) {
      for (let j = i + 1; j < numbers.length; j += 1) {
        const first = numbers[i]!
        const second = numbers[j]!
        const power = rawMagicPower(first.value, second.value)
        for (const target of targets) {
          const damage = calculateDamage({
            power,
            divisor: target.divisor,
            comboStreak: player.comboStreak,
            passive: null,
          }).damage
          if (damage > best.damage) {
            best = { damage, power, pair: [first.uid, second.uid], target }
          }
        }
      }
    }

    return {
      slots: [],
      bracket: null,
      target: { kind: best.target.kind, index: best.target.index },
      power: best.power,
      expectedDamage: Math.max(0, best.damage),
      isCritical: false,
      fallback: 'rawMagic',
      rawMagicCards: best.pair ?? undefined,
    }
  }

  if (deadHand === 'desperateStrike') {
    const only = player.hand.find(
      (card): card is HandCard & { kind: 'number' } => card.kind === 'number',
    )
    const power = only ? desperateStrikePower(only.value) : 0
    let best = { damage: -1, target: fallbackTarget }

    for (const target of targets) {
      const damage = calculateDamage({
        power,
        divisor: target.divisor,
        comboStreak: player.comboStreak,
        passive: null,
      }).damage
      if (damage > best.damage) best = { damage, target }
    }

    return {
      slots: [],
      bracket: null,
      target: { kind: best.target.kind, index: best.target.index },
      power,
      expectedDamage: Math.max(0, best.damage),
      isCritical: false,
      fallback: 'desperateStrike',
    }
  }

  // กรณีปกติ: หาสมการที่ดีที่สุด
  const passive = passiveOf(player.heroId)
  const candidates = buildCandidates(player.hand)
  const scored: { plan: AiPlan; score: number }[] = []

  for (const candidate of candidates) {
    for (const target of targets) {
      const score = scoreAgainstTarget(candidate, target, player.comboStreak, passive)
      const result = calculateDamage({
        power: candidate.power,
        divisor: target.divisor,
        comboStreak: player.comboStreak,
        passive,
      })

      scored.push({
        score,
        plan: {
          slots: candidate.slots,
          bracket: candidate.bracket,
          target: { kind: target.kind, index: target.index },
          power: candidate.power,
          expectedDamage: result.damage,
          isCritical: result.isCritical,
          fallback: 'none',
        },
      })
    }
  }

  scored.sort((a, b) => b.score - a.score)

  if (scored.length === 0) {
    return {
      slots: [],
      bracket: null,
      target: { kind: fallbackTarget.kind, index: fallbackTarget.index },
      power: 0,
      expectedDamage: 0,
      isCritical: false,
      fallback: 'tacticalReset',
    }
  }

  // ระดับง่ายเลือกจากอันดับกว้างขึ้น จึงเล่นพลาดได้บ้าง
  const poolSize =
    level === 'hard' ? 1 : level === 'normal' ? Math.min(3, scored.length) : Math.min(12, scored.length)
  const pick = scored[Math.floor(Math.random() * poolSize)] ?? scored[0]!

  return pick.plan
}
