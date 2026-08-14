import { calculateDamage, type HeroPassive } from './damage'
import type { HandCard } from './deck'
import { toDisplayString, type BracketPair, type EquationSlot } from './equation'
import { getTargets, type GameState, type TargetOption } from './game'

/**
 * ระบบแนะนำสมการ
 *
 * ใช้เครื่องคิดชุดเดียวกับคู่ต่อสู้คอมพิวเตอร์ เพื่อไม่ให้คำแนะนำที่เด็กได้
 * อ่อนหรือแรงกว่าที่ AI เล่นจริง
 *
 * แนวคิดการสอน: คำใบ้แบ่งเป็นชั้น ไม่เฉลยรวดเดียว
 *
 *   ชั้นที่ 1  บอกแค่ "เป้าหมาย" ว่าต้องหาผลลัพธ์ที่หารด้วยเท่าไรลงตัว
 *             และมือนี้ทำได้จริงกี่วิธี — เด็กยังต้องคิดเอง
 *   ชั้นที่ 2  เฉลยสมการให้ดู พร้อมบอกว่าทำไมถึงหารลงตัว
 *
 * ครูดูได้จากสรุปท้ายเกมว่าเด็กเปิดคำใบ้ชั้นไหนไปกี่ครั้ง
 */

export interface Suggestion {
  slots: EquationSlot[]
  bracket: BracketPair | null
  target: { kind: 'guard' | 'hero'; index: number; name: string; divisor: number }
  power: number
  damage: number
  isCritical: boolean
  /** สมการในรูปข้อความ เช่น (5 + 2) × 10 */
  display: string
  /** ใช้การ์ดกี่ใบ (รวมเครื่องหมายและถุงมือ) */
  cardCount: number
}

export interface SuggestOptions {
  /** จำกัดเฉพาะเป้าหมายที่เด็กเลือกไว้ ถ้าไม่ระบุจะดูทุกเป้าหมายที่ตีได้ */
  target?: { kind: 'guard' | 'hero'; index: number } | null
  /** เอาผลลัพธ์กี่ข้อ */
  limit?: number
  /** เอาเฉพาะสมการที่หารลงตัว */
  criticalOnly?: boolean
}

/** สมการหนึ่งแบบที่ประกอบได้จากการ์ดในมือ ยังไม่ผูกกับเป้าหมาย */
export interface Candidate {
  slots: EquationSlot[]
  bracket: BracketPair | null
  power: number
}

/** กันเครื่องค้างบนมือถือเวลามือมีการ์ดเยอะ */
const SEARCH_LIMIT = 4000

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

/**
 * ประกอบสมการที่เป็นไปได้ทั้งหมดจากการ์ดในมือ พร้อมคำนวณพลังโจมตี
 *
 * จำกัดไม่เกิน 3 พจน์ เพราะมือมีการ์ด 5 ใบ สมการ 3 พจน์ต้องใช้ 5 ใบพอดี
 * (เลข-เครื่องหมาย-เลข-เครื่องหมาย-เลข) จึงเป็นเพดานจริงของเกมอยู่แล้ว
 */
export function buildCandidates(hand: readonly HandCard[]): Candidate[] {
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

  // สามพจน์: a ? b ? c ทั้งแบบมีและไม่มีวงเล็บ
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

            // ใส่วงเล็บได้เมื่อมีการ์ดถุงมือ — จุดสำคัญของบทเรียนเรื่องระคน
            if (gauntlet) {
              candidates.push({
                slots,
                bracket: { cardId: gauntlet.uid, startTerm: 0, endTerm: 1 },
                power: applyOp(applyOp(a.value, op1.symbol, b.value), op2.symbol, c.value),
              })
              candidates.push({
                slots,
                bracket: { cardId: gauntlet.uid, startTerm: 1, endTerm: 2 },
                power: applyOp(a.value, op1.symbol, applyOp(b.value, op2.symbol, c.value)),
              })
            }
          }
        }
      }
    }
  }

  return candidates
}

/** ความสามารถติดตัวของฮีโร่ที่กำลังเล่นอยู่ */
export function passiveOf(heroId: string): HeroPassive {
  if (heroId === 'knight-commander-valerius') return 'precisionStrike'
  if (heroId === 'lich-queen-morwenna') return 'soulSiphon'
  return null
}

function bracketToPair(bracket: BracketPair | null): BracketPair[] {
  return bracket ? [bracket] : []
}

/**
 * เรียงสมการที่ดีที่สุดให้เด็กดู
 *
 * เรียงตามดาเมจมากไปน้อย ถ้าดาเมจเท่ากันเอาสมการที่ใช้การ์ดน้อยกว่าขึ้นก่อน
 * เพราะอ่านง่ายกว่าและเหลือการ์ดไว้ใช้เทิร์นหน้า
 */
export function suggestEquations(
  state: GameState,
  options: SuggestOptions = {},
): Suggestion[] {
  const limit = options.limit ?? 3
  const player = state.players[state.turn]
  const passive = passiveOf(player.heroId)

  let targets: TargetOption[] = getTargets(state).filter((t) => t.isAttackable)
  if (options.target) {
    const picked = targets.filter(
      (t) => t.kind === options.target!.kind && t.index === options.target!.index,
    )
    // เป้าหมายที่เลือกไว้อาจตายไปแล้ว ถ้าหาไม่เจอก็ดูทุกเป้าหมายแทน
    if (picked.length > 0) targets = picked
  }

  if (targets.length === 0) return []

  const found: Suggestion[] = []
  // สมการหลายแบบให้ผลลัพธ์หน้าตาเหมือนกัน เอามาแสดงซ้ำก็รกเปล่า ๆ
  const seen = new Set<string>()

  for (const candidate of buildCandidates(player.hand)) {
    for (const target of targets) {
      const result = calculateDamage({
        power: candidate.power,
        divisor: target.divisor,
        comboStreak: player.comboStreak,
        passive,
      })

      if (options.criticalOnly && !result.isCritical) continue
      if (result.damage <= 0) continue

      const display = toDisplayString({
        slots: candidate.slots,
        brackets: bracketToPair(candidate.bracket),
      })

      const key = `${target.kind}:${target.index}:${display}`
      if (seen.has(key)) continue
      seen.add(key)

      found.push({
        slots: candidate.slots,
        bracket: candidate.bracket,
        target: {
          kind: target.kind,
          index: target.index,
          name: target.name,
          divisor: target.divisor,
        },
        power: candidate.power,
        damage: result.damage,
        isCritical: result.isCritical,
        display,
        cardCount: candidate.slots.length + (candidate.bracket ? 1 : 0),
      })
    }
  }

  found.sort((a, b) => b.damage - a.damage || a.cardCount - b.cardCount)
  return found.slice(0, limit)
}

export interface HintSummary {
  targetName: string
  divisor: number
  /** มือนี้ทำ Critical Hit ใส่เป้าหมายนี้ได้ไหม */
  hasCritical: boolean
  /** ทำได้กี่วิธี (นับสมการที่หน้าตาต่างกัน) */
  criticalCount: number
  /** ต้องใช้การ์ดอย่างน้อยกี่ใบถึงจะหารลงตัว */
  fewestCards: number | null
  /** ตัวอย่างผลลัพธ์ที่หารด้วยเกราะลงตัว เอาไว้ชี้ทางโดยไม่เฉลยสมการ */
  targetPowers: number[]
  /**
   * จำนวนผลลัพธ์ที่หารลงตัวทั้งหมด อาจมากกว่าความยาวของ targetPowers
   * หน้าจอต้องบอกเด็กด้วยว่ายังมีค่าอื่นอีก ไม่งั้นจะเข้าใจผิดว่ามีแค่นี้
   */
  targetPowerCount: number
  /** ดาเมจสูงสุดที่ทำได้ ถ้าไม่มีทางหารลงตัวเลย */
  bestDamage: number
}

/**
 * คำใบ้ชั้นที่ 1 — บอกทิศทาง ไม่เฉลย
 *
 * ตั้งใจไม่คืน slots ออกไป เพื่อไม่ให้หน้าจอเผลอเอาไปเฉลยตั้งแต่ชั้นแรก
 */
export function summarizeHint(
  state: GameState,
  target?: { kind: 'guard' | 'hero'; index: number } | null,
): HintSummary | null {
  const all = suggestEquations(state, { target, limit: Number.MAX_SAFE_INTEGER })
  if (all.length === 0) return null

  const first = all[0]!
  const crits = all.filter((s) => s.isCritical)

  // ตัวอย่างผลลัพธ์ที่หารลงตัว เรียงจากน้อยไปมาก เอาแค่ 4 ตัวพอเป็นแนวทาง
  const powers = [...new Set(crits.map((s) => s.power))].sort((a, b) => a - b)

  return {
    targetName: first.target.name,
    divisor: first.target.divisor,
    hasCritical: crits.length > 0,
    criticalCount: crits.length,
    fewestCards: crits.length > 0 ? Math.min(...crits.map((s) => s.cardCount)) : null,
    targetPowers: powers.slice(0, 4),
    targetPowerCount: powers.length,
    bestDamage: first.damage,
  }
}
