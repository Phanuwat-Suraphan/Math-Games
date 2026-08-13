import { DECK_COMPOSITION } from '../rules'
import type { NumberTier, OperatorSymbol } from '../types'

/** การ์ดหนึ่งใบที่อยู่ในมือผู้เล่นจริง ๆ มี id ไม่ซ้ำเพราะมีหลายใบที่ค่าเท่ากัน */
export type HandCard =
  | {
      uid: string
      kind: 'number'
      value: number
      tier: NumberTier
      label: string
    }
  | {
      uid: string
      kind: 'operator'
      symbol: Exclude<OperatorSymbol, '(' | ')'>
      label: string
    }
  | {
      uid: string
      kind: 'bracket'
      label: string
    }

const TIER_BY_VALUE = (value: number): NumberTier => {
  if (value >= 50) return 'void'
  if (value >= 20) return 'legendary'
  if (value >= 10) return 'advanced'
  return 'basic'
}

const OPERATOR_LABEL: Record<string, string> = {
  '+': '+',
  '-': '−',
  '*': '×',
  '()': '( )',
}

/** สร้างกองการ์ดตามสัดส่วนที่กำหนดใน DECK_COMPOSITION */
export function buildDeck(): HandCard[] {
  const deck: HandCard[] = []
  let counter = 0

  for (const [rawValue, count] of Object.entries(DECK_COMPOSITION.numbers)) {
    const value = Number(rawValue)
    for (let index = 0; index < count; index += 1) {
      counter += 1
      deck.push({
        uid: `n${value}-${counter}`,
        kind: 'number',
        value,
        tier: TIER_BY_VALUE(value),
        label: String(value),
      })
    }
  }

  for (const [symbol, count] of Object.entries(DECK_COMPOSITION.operators)) {
    for (let index = 0; index < count; index += 1) {
      counter += 1
      const label = OPERATOR_LABEL[symbol] ?? symbol

      if (symbol === '()') {
        deck.push({ uid: `b-${counter}`, kind: 'bracket', label })
      } else {
        deck.push({
          uid: `o${symbol}-${counter}`,
          kind: 'operator',
          symbol: symbol as Exclude<OperatorSymbol, '(' | ')'>,
          label,
        })
      }
    }
  }

  return deck
}

/** สับกอง ใช้ Fisher–Yates รับฟังก์ชันสุ่มจากภายนอกได้เพื่อให้ทดสอบซ้ำได้ */
export function shuffle<T>(items: readonly T[], random: () => number = Math.random): T[] {
  const result = items.slice()
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1))
    const a = result[i]
    const b = result[j]
    if (a !== undefined && b !== undefined) {
      result[i] = b
      result[j] = a
    }
  }
  return result
}

export interface DrawResult {
  hand: HandCard[]
  drawPile: HandCard[]
  discardPile: HandCard[]
}

/**
 * จั่วการ์ดให้ครบตามจำนวน
 * ถ้ากองหมด จะเอากองทิ้งมาสับใหม่เป็นกองจั่ว เกมจึงเล่นต่อได้ไม่มีสะดุด
 */
export function drawCards(
  hand: HandCard[],
  drawPile: HandCard[],
  discardPile: HandCard[],
  count: number,
  random: () => number = Math.random,
): DrawResult {
  const nextHand = [...hand]
  let pile = [...drawPile]
  let discard = [...discardPile]

  for (let index = 0; index < count; index += 1) {
    if (pile.length === 0) {
      if (discard.length === 0) break
      pile = shuffle(discard, random)
      discard = []
    }

    const card = pile.shift()
    if (card) nextHand.push(card)
  }

  return { hand: nextHand, drawPile: pile, discardPile: discard }
}

export function countNumbers(hand: readonly HandCard[]): number {
  return hand.filter((card) => card.kind === 'number').length
}

/** นับเฉพาะเครื่องหมายคำนวณ ไม่นับถุงมือ เพราะถุงมืออย่างเดียวสร้างสมการไม่ได้ */
export function countOperators(hand: readonly HandCard[]): number {
  return hand.filter((card) => card.kind === 'operator').length
}

export function countBrackets(hand: readonly HandCard[]): number {
  return hand.filter((card) => card.kind === 'bracket').length
}
