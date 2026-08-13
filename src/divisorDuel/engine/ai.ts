import { calculateDamage } from './damage'
import { detectDeadHand, desperateStrikePower, rawMagicPower } from './deadHand'
import type { HandCard } from './deck'
import type { EquationSlot } from './equation'
import { getTargets, type GameState, type TargetOption } from './game'

/**
 * คู่ต่อสู้คอมพิวเตอร์
 *
 * วิธีคิด: ลองประกอบสมการทุกแบบที่ทำได้จากการ์ดในมือ (จำกัดไม่เกิน 3 พจน์
 * เพื่อให้คำนวณเร็วพอสำหรับเล่นบนมือถือ) แล้วเลือกแผนที่ทำดาเมจได้มากที่สุด
 *
 * ระดับความยากคุมด้วยการสุ่มเลือกจากอันดับต้น ๆ แทนที่จะเอาอันดับ 1 เสมอ
 * ระดับง่ายจึงเล่นพลาดบ้าง เหมาะกับเด็กที่เพิ่งเริ่ม
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

const SEARCH_LIMIT = 4000

interface Candidate {
  slots: EquationSlot[]
  bracket: AiPlan['bracket']
  power: number
}

function numberSlot(card: HandCard & { kind: 'number' }): EquationSlot {
  return { cardId: card.uid, kind: 'number', value: card.value }
}

function operatorSlot(card: HandCard & { kind: 'operator' }): EquationSlot {
  return { cardId: card.uid, kind: 'operator', symbol: card.symbol }
}

function applyOp(left: number, symbol: string, right: number): number {
  if (symbol === '+') return left + right
  if (symbol === '-') return left - right
  return left * right
}

/** ประกอบสมการที่เป็นไปได้ทั้งหมด พร้อมคำนวณพลังโจมตี */
function buildCandidates(hand: readonly HandCard[]): Candidate[] {
  const numbers = hand.filter(
    (card): card is HandCard & { kind: 'number' } => card.kind === 'number',
  )
  const operators = hand.filter(
    (card): card is HandCard & { kind: 'operator' } => card.kind === 'operator',
  )
  const gauntlet = hand.find((card) => card.kind === 'bracket')

  const candidates: Candidate[] = []

  // สมการพจน์เดียว: ใช้ตัวเลขใบเดียว
  for (const card of numbers) {
    candidates.push({ slots: [numberSlot(card)], bracket: null, power: card.value })
  }

  // สองพจน์: a ? b
  for (const a of numbers) {
    for (const b of numbers) {
      if (a.uid === b.uid) continue
      for (const op of operators) {
        if (candidates.length > SEARCH_LIMIT) break
        candidates.push({
          slots: [numberSlot(a), operatorSlot(op), numberSlot(b)],
          bracket: null,
          power: applyOp(a.value, op.symbol, b.value),
        })
      }
    }
  }

  // สามพจน์: a ? b ? c ทั้งแบบมีและไม่มีวงเล็บคร่อมสองตัวแรก
  for (const a of numbers) {
    for (const b of numbers) {
      if (b.uid === a.uid) continue
      for (const c of numbers) {
        if (c.uid === a.uid || c.uid === b.uid) continue
        for (const op1 of operators) {
          for (const op2 of operators) {
            if (op1.uid === op2.uid) continue
            if (candidates.length > SEARCH_LIMIT) break

            const slots = [
              numberSlot(a),
              operatorSlot(op1),
              numberSlot(b),
              operatorSlot(op2),
              numberSlot(c),
            ]

            // ลำดับมาตรฐาน คูณก่อนบวกลบ
            let plain: number
            if (op1.symbol === '*') {
              plain = applyOp(applyOp(a.value, '*', b.value), op2.symbol, c.value)
            } else if (op2.symbol === '*') {
              plain = applyOp(a.value, op1.symbol, applyOp(b.value, '*', c.value))
            } else {
              plain = applyOp(applyOp(a.value, op1.symbol, b.value), op2.symbol, c.value)
            }
            candidates.push({ slots, bracket: null, power: plain })

            // ใส่วงเล็บคร่อมสองพจน์แรก ถ้ามีการ์ดถุงมือ
            if (gauntlet) {
              candidates.push({
                slots,
                bracket: { cardId: gauntlet.uid, startTerm: 0, endTerm: 1 },
                power: applyOp(
                  applyOp(a.value, op1.symbol, b.value),
                  op2.symbol,
                  c.value,
                ),
              })
              candidates.push({
                slots,
                bracket: { cardId: gauntlet.uid, startTerm: 1, endTerm: 2 },
                power: applyOp(
                  a.value,
                  op1.symbol,
                  applyOp(b.value, op2.symbol, c.value),
                ),
              })
            }
          }
        }
      }
    }
  }

  return candidates
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
  const passive =
    player.heroId === 'knight-commander-valerius'
      ? ('precisionStrike' as const)
      : player.heroId === 'lich-queen-morwenna'
        ? ('soulSiphon' as const)
        : null

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
