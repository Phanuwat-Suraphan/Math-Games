import type { AmountQ, ChoiceQ, DenomId, Difficulty, NumberQ } from '../engine/types'
import {
  ALL_DENOM_IDS,
  classifier,
  countDenoms,
  denom,
  sortDenomsDesc,
  sumDenoms,
} from '../data/denominations'
import { commas, formatBS } from '../utils/money'
import { int, pick, shuffle, uid } from '../utils/random'
import { hint } from './common'

/**
 * ด่าน 2: การบอกจำนวนเงินเป็นบาทและสตางค์ (MONEY COUNT)
 */

/** สุ่มกองเงินตามระดับความยาก */
export function randomPile(d: Difficulty): DenomId[] {
  const pools: Record<Difficulty, DenomId[]> = {
    1: ['s50', 'b1', 'b2', 'b5', 'b10', 'b20'],
    2: ['s25', 's50', 'b1', 'b2', 'b5', 'b10', 'b20', 'b50', 'b100'],
    3: ALL_DENOM_IDS,
  }
  const n = d === 1 ? int(3, 4) : d === 2 ? int(4, 6) : int(5, 7)
  const pile: DenomId[] = []
  for (let i = 0; i < n; i += 1) pile.push(pick(pools[d]))
  // ระดับง่าย: ให้มีสตางค์ไม่เกิน 1 เหรียญ เพื่อไม่ต้องทด
  if (d === 1) {
    let seen = false
    for (let i = 0; i < pile.length; i += 1) {
      if (denom(pile[i]).value < 100) {
        if (seen) pile[i] = 'b1'
        seen = true
      }
    }
  }
  return sortDenomsDesc(pile)
}

/** คำอธิบายการนับทีละกลุ่ม พร้อมผลรวมสะสม */
export function explainCount(pile: DenomId[]): string[] {
  const lines = ['นับจากเงินที่มีค่ามากที่สุดก่อน']
  let running = 0
  for (const [id, n] of countDenoms(pile)) {
    const d = denom(id)
    const subtotal = d.value * n
    running += subtotal
    lines.push(`${d.name} ${n} ${classifier(id)} = ${formatBS(subtotal)} → รวมเป็น ${formatBS(running)}`)
  }
  const satangTotal = pile.filter((id) => denom(id).value < 100).reduce((s, id) => s + denom(id).value, 0)
  if (satangTotal >= 100) {
    lines.push(`สตางค์ครบ 100 สตางค์ = 1 บาท จึงรวมเข้ากับบาท`)
  }
  lines.push(`ทั้งหมด ${formatBS(sumDenoms(pile))}`)
  return lines
}

/** นับเงินจากภาพแล้วเขียนเป็นบาทและสตางค์ */
export function generateCountingMoneyQuestion(d: Difficulty): AmountQ {
  const pile = randomPile(d)
  const total = sumDenoms(pile)
  const steps = explainCount(pile)
  return {
    id: uid(),
    gen: 'countMoney',
    kind: 'amount',
    input: 'bs',
    skill: 'count',
    difficulty: d,
    title: 'นับเงินทั้งหมด ได้กี่บาทกี่สตางค์?',
    visual: { type: 'money', items: shuffle(pile) },
    answer: total,
    npc: 'rabbit',
    hint: hint(
      'จัดเงินเรียงจากค่ามากไปน้อย แล้วนับต่อไปเรื่อย ๆ',
      'เรียงเงินให้แล้ว ลองนับต่อจากซ้ายไปขวา',
      steps.slice(0, Math.min(3, steps.length - 1)),
      { type: 'money', items: pile, caption: 'เรียงจากค่ามากไปน้อย' },
    ),
    explain: steps,
  }
}

/** กองไหนมีเงินตามจำนวนที่กำหนด */
export function generateCountChoiceQuestion(d: Difficulty): ChoiceQ {
  const piles: DenomId[][] = []
  const totals = new Set<number>()
  let guard = 0
  while (piles.length < 3 && guard < 200) {
    guard += 1
    const pile = randomPile(d)
    const total = sumDenoms(pile)
    if (totals.has(total)) continue
    totals.add(total)
    piles.push(pile)
  }
  if (piles.length < 3) throw new Error('สร้างกองเงินไม่ครบ')
  const answerIndex = int(0, 2)
  const target = sumDenoms(piles[answerIndex])
  const options = piles.map((pile, i) => ({ id: `p${i}`, label: `กองที่ ${i + 1}`, money: pile }))

  return {
    id: uid(),
    gen: 'countChoice',
    kind: 'choice',
    skill: 'count',
    difficulty: d,
    title: `กองไหนมีเงิน ${formatBS(target)}?`,
    layout: 'list',
    options,
    answer: `p${answerIndex}`,
    npc: 'rabbit',
    hint: hint(
      'นับเงินทีละกอง แล้วเทียบกับจำนวนที่โจทย์บอก',
      'เงินที่ต้องการ',
      [`กองที่ 1 มี ${formatBS(sumDenoms(piles[0]))}`],
      { type: 'big', text: formatBS(target) },
    ),
    explain: piles.map((pile, i) => `กองที่ ${i + 1} มี ${formatBS(sumDenoms(pile))}${i === answerIndex ? ' ✔' : ''}`),
  }
}

/** เงินชนิดเดียวหลายชิ้น เป็นเงินเท่าไร */
export function generateRepeatCountQuestion(d: Difficulty): NumberQ {
  const pool: DenomId[] =
    d === 1 ? ['b1', 'b2', 'b5', 'b10'] : d === 2 ? ['b5', 'b10', 'b20', 'b50'] : ['b20', 'b50', 'b100', 'b500']
  const id = pick(pool)
  const n = d === 1 ? int(2, 6) : d === 2 ? int(3, 9) : int(4, 12)
  const each = denom(id).value / 100
  const total = each * n
  const items: DenomId[] = Array.from({ length: n }, () => id)
  return {
    id: uid(),
    gen: 'repeatCount',
    kind: 'number',
    unit: 'บาท',
    skill: 'count',
    difficulty: d,
    title: `${denom(id).name} ${n} ${classifier(id)} เป็นเงินกี่บาท?`,
    visual: { type: 'money', items },
    answer: total,
    npc: 'rabbit',
    hint: hint(
      `นับเพิ่มทีละ ${each}`,
      'ลองนับทีละชิ้น',
      [`${each}, ${each * 2}, ${each * 3}, ...`],
      { type: 'money', items },
    ),
    explain: [
      `นับเพิ่มทีละ ${commas(each)}: ${Array.from({ length: n }, (_, i) => commas(each * (i + 1))).join(', ')}`,
      `หรือคิดแบบคูณ: ${commas(each)} × ${n} = ${commas(total)} บาท`,
    ],
  }
}
