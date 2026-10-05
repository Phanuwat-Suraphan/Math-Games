import type { ChoiceQ, Difficulty, SortQ } from '../engine/types'
import { ALL_DENOM_IDS, decompose, sumDenoms } from '../data/denominations'
import { KID_NAMES } from '../data/products'
import { commas, compareMoney, formatBS, formatDot, splitSatang, toSatang } from '../utils/money'
import { chance, int, pick, sample, shuffle, uid } from '../utils/random'
import { bahtRange, hint, randomSatangPart } from './common'
import { explainCount, randomPile } from './counting'

/**
 * ด่าน 4: การเปรียบเทียบจำนวนเงิน (MONEY BATTLE)
 * กติกา: 1) เทียบบาทก่อน 2) ถ้าบาทเท่ากันจึงเทียบสตางค์
 */

const SIGN_WORD = { '>': 'มากกว่า', '<': 'น้อยกว่า', '=': 'เท่ากับ' } as const

export function explainCompare(a: number, b: number, aLabel: string, bLabel: string): string[] {
  const A = splitSatang(a)
  const B = splitSatang(b)
  const lines = [`ขั้นที่ 1 เทียบบาทก่อน: ${commas(A.baht)} บาท กับ ${commas(B.baht)} บาท`]
  if (A.baht !== B.baht) {
    lines.push(`${commas(A.baht)} ${A.baht > B.baht ? 'มากกว่า' : 'น้อยกว่า'} ${commas(B.baht)} จึงไม่ต้องดูสตางค์`)
  } else {
    lines.push('บาทเท่ากัน จึงไปขั้นที่ 2')
    lines.push(`ขั้นที่ 2 เทียบสตางค์: ${A.satang} สตางค์ กับ ${B.satang} สตางค์`)
  }
  const sign = compareMoney(a, b)
  lines.push(`ดังนั้น ${aLabel} ${SIGN_WORD[sign]} ${bLabel} (${sign})`)
  return lines
}

function closePair(d: Difficulty): [number, number] {
  const [lo, hi] = bahtRange(d)
  const roll = int(1, 10)
  // ประมาณ 2 ใน 10 ข้อเป็น "เท่ากับ"
  if (roll <= 2) {
    const v = toSatang(int(lo, hi), randomSatangPart(d))
    return [v, v]
  }
  // ระดับ 2–3: บาทเท่ากันแต่สตางค์ต่างกัน
  if (d >= 2 && roll <= 6) {
    const baht = int(lo, hi)
    const [s1, s2] = sample([0, 25, 50, 75], 2)
    return [toSatang(baht, s1), toSatang(baht, s2)]
  }
  // บาทต่างกัน ระดับ 3 ให้ตัวเลขคล้ายกัน เช่น 345 กับ 354
  const a = int(lo, hi)
  let b = int(lo, hi)
  if (d === 3) {
    const digits = String(a).split('')
    b = Number(shuffle(digits).join('')) || a + 1
  }
  if (a === b) b = a + int(1, 9)
  // ใส่สตางค์มากกว่าให้ฝั่งที่บาทน้อยกว่า เพื่อดักคนที่ดูสตางค์ก่อนบาท
  const [s1, s2] = [randomSatangPart(d), randomSatangPart(d)].sort((x, y) => x - y)
  return a < b ? [toSatang(a, s2), toSatang(b, s1)] : [toSatang(a, s1), toSatang(b, s2)]
}

/** MONEY BATTLE: เลือก มากกว่า น้อยกว่า หรือ เท่ากับ */
export function generateCompareMoneyQuestion(d: Difficulty): ChoiceQ {
  const [a, b] = closePair(d)
  // ระดับ 3 ผสมรูปแบบการเขียน: ฝั่งหนึ่งบาท–สตางค์ อีกฝั่งแบบใช้จุด
  const mixed = d === 3 || (d === 2 && chance(0.3))
  const aLabel = formatBS(a)
  const bLabel = mixed ? formatDot(b) : formatBS(b)
  const sign = compareMoney(a, b)
  const answer = sign === '>' ? 'gt' : sign === '<' ? 'lt' : 'eq'

  return {
    id: uid(),
    gen: 'compare',
    kind: 'choice',
    skill: 'compare',
    difficulty: d,
    title: 'เงินทางซ้ายเป็นอย่างไรเมื่อเทียบกับทางขวา?',
    layout: 'compare',
    visual: { type: 'pair', a, b, aLabel, bLabel },
    options: [
      { id: 'gt', label: 'มากกว่า', symbol: '>' },
      { id: 'lt', label: 'น้อยกว่า', symbol: '<' },
      { id: 'eq', label: 'เท่ากับ', symbol: '=' },
    ],
    answer,
    npc: 'fox',
    hint: hint(
      'เทียบ "บาท" ก่อนเสมอ ถ้าบาทเท่ากันค่อยเทียบ "สตางค์"',
      'แยกบาทกับสตางค์ของทั้งสองจำนวน',
      [`บาททางซ้าย ${commas(splitSatang(a).baht)} บาท ทางขวา ${commas(splitSatang(b).baht)} บาท`],
      { type: 'rules', items: [`ซ้าย: ${formatBS(a)}`, `ขวา: ${formatBS(b)}`] },
    ),
    explain: explainCompare(a, b, aLabel, bLabel),
  }
}

/** เรียงลำดับจำนวนเงิน */
export function generateSortMoneyQuestion(d: Difficulty): SortQ {
  const n = d === 1 ? 3 : d === 2 ? 4 : 5
  const [lo, hi] = bahtRange(d)
  const values = new Set<number>()
  if (d >= 2) {
    // ใส่จำนวนที่บาทเท่ากัน 2 ตัว ให้ต้องดูสตางค์
    const baht = int(lo, hi)
    values.add(toSatang(baht, 25))
    values.add(toSatang(baht, 75))
  }
  let guard = 0
  while (values.size < n && guard < 200) {
    values.add(toSatang(int(lo, hi), randomSatangPart(d)))
    guard += 1
  }
  const order = pick(['asc', 'desc'] as const)
  const items = shuffle(Array.from(values)).map((v, i) => ({
    id: `s${i}`,
    value: v,
    label: d === 3 && i % 2 === 1 ? formatDot(v) : formatBS(v),
  }))
  const sorted = items.slice().sort((x, y) => (order === 'asc' ? x.value - y.value : y.value - x.value))

  return {
    id: uid(),
    gen: 'sortMoney',
    kind: 'sort',
    skill: 'compare',
    difficulty: d,
    title: order === 'asc' ? 'เรียงจำนวนเงินจาก "น้อย" ไป "มาก"' : 'เรียงจำนวนเงินจาก "มาก" ไป "น้อย"',
    order,
    items,
    npc: 'fox',
    hint: hint(
      'ดูจำนวนบาทของทุกตัวก่อน ตัวไหนบาทเท่ากันค่อยดูสตางค์',
      'เขียนทุกตัวเป็นบาทกับสตางค์',
      [`ตัวแรกคือ ${sorted[0].label}`],
      { type: 'rules', items: items.map((it) => `${it.label} = ${formatBS(it.value)}`) },
    ),
    explain: [
      'เทียบบาทก่อน ถ้าบาทเท่ากันจึงเทียบสตางค์',
      sorted.map((it) => it.label).join(order === 'asc' ? ' < ' : ' > '),
    ],
  }
}

/** ใครมีเงินมากกว่า (นับกองเงินแล้วเทียบ) */
export function generateWhoHasMoreQuestion(d: Difficulty): ChoiceQ {
  const [n1, n2] = sample(KID_NAMES, 2)
  const pileA = randomPile(d)
  let pileB = randomPile(d)
  // บางครั้งให้เท่ากัน โดยใช้เงินต่างชนิดแต่มีค่าเท่ากัน
  if (chance(0.15)) {
    const biggest = pileA[0]
    const other = decompose(sumDenoms(pileA), ALL_DENOM_IDS.filter((id) => id !== biggest), 12)
    if (other) pileB = other
  }
  const a = sumDenoms(pileA)
  const b = sumDenoms(pileB)
  const sign = compareMoney(a, b)
  const answer = sign === '>' ? 'a' : sign === '<' ? 'b' : 'eq'
  return {
    id: uid(),
    gen: 'whoMore',
    kind: 'choice',
    skill: 'compare',
    difficulty: d,
    title: 'ใครมีเงินมากกว่า?',
    layout: 'list',
    options: [
      { id: 'a', label: n1, money: pileA },
      { id: 'b', label: n2, money: pileB },
      { id: 'eq', label: 'มีเงินเท่ากัน', symbol: '=' },
    ],
    answer,
    npc: 'fox',
    hint: hint(
      'นับเงินของแต่ละคนก่อน แล้วค่อยเทียบ',
      `เงินของ${n1}`,
      [`${n1} มี ${formatBS(a)}`],
      { type: 'money', items: pileA },
    ),
    explain: [
      `${n1}: ${explainCount(pileA).slice(-1)[0]}`,
      `${n2}: ${explainCount(pileB).slice(-1)[0]}`,
      ...explainCompare(a, b, n1, n2).slice(-1),
    ],
  }
}
