import type { DenomId } from './types'
import { denom } from '../data/denominations'
import { PRODUCTS } from '../data/products'
import { formatBS, formatDotNumber } from '../utils/money'
import { UNITS } from './worksheet'

/**
 * บิงโกเงินทอง (เกมพิมพ์เล่นทั้งห้อง)
 *
 * ครูอ่านโจทย์เรื่องเงินทีละข้อ นักเรียนคิดแล้วหาคำตอบบนการ์ด 5×5 (ช่องกลางฟรี)
 * - คำตอบเป็นจำนวนเงิน 1–99 บาท สตางค์เป็น 0 25 50 75 ไม่ซ้ำกันในชุด
 * - โจทย์สร้างย้อนจากคำตอบ (รู้คำตอบก่อนแล้วแต่งโจทย์) เฉลยจึงถูกเสมอ
 * - บนการ์ด คำตอบเขียนบางช่องแบบใช้จุด บางช่องแบบบาทสตางค์ ฝึกอ่านสองแบบ
 * - ตั้งเลข "ชุดที่" ได้ ชุดเดิมพิมพ์ซ้ำได้การ์ดและลำดับโจทย์เดิม
 */

export const GRID = 5
export const CELLS = GRID * GRID
export const FREE = Math.floor(CELLS / 2)
/** จำนวนคำตอบในชุด (มากกว่าช่องบนการ์ด แต่ละใบจึงต่างกัน) */
export const POOL = 36

type Rng = () => number

function makeRng(seed: number): Rng {
  let a = (seed * 7919 + 101) >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const int = (r: Rng, min: number, max: number) => min + Math.floor(r() * (max - min + 1))
const pick = <T>(r: Rng, xs: readonly T[]): T => xs[Math.floor(r() * xs.length)]

function shuffle<T>(r: Rng, xs: readonly T[]): T[] {
  const a = xs.slice()
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(r() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export interface Call {
  /** คำตอบ (สตางค์) */
  answer: number
  /** โจทย์ที่ครูอ่าน */
  text: string
  kind: 'change' | 'add' | 'times' | 'count' | 'read'
}

/** เขียนจำนวนเงินเป็นชุดเงิน (แตกให้น้อยชิ้นที่สุด) เช่น ธนบัตร 20 บาท 1 ใบ เหรียญ 5 บาท 1 เหรียญ */
const COUNT_UNITS: DenomId[] = ['b50', 'b20', 'b10', 'b5', 'b2', 'b1', 's50', 's25']

export function moneyWords(v: number): string {
  let left = v
  const parts: string[] = []
  for (const id of COUNT_UNITS) {
    const d = denom(id)
    const n = Math.floor(left / d.value)
    if (n === 0) continue
    left -= n * d.value
    parts.push(`${d.name} ${n} ${d.kind === 'coin' ? 'เหรียญ' : 'ใบ'}`)
  }
  return parts.join(' ')
}

/** สินค้าที่ราคาจริงอยู่ในช่วงนี้ (ไม่มีใช้คำว่า "ของ") โจทย์จึงสมจริง ไม่มีลูกอมราคา 33 บาท */
function itemFor(r: Rng, price: number): string {
  const baht = price / 100
  const fit = PRODUCTS.filter((p) => baht >= p.min && baht <= p.max)
  return fit.length > 0 ? pick(r, fit).name : 'ของ'
}

function makeCall(r: Rng, answer: number): Call {
  const kinds: Call['kind'][] = ['change', 'add', 'count', 'read']
  // คูณได้เมื่อคำตอบแบ่งเป็นราคาต่อชิ้นได้ลงตัวเป็นบาท
  const times = [2, 3, 4, 5].filter((k) => answer % (k * 100) === 0 && answer / k >= 200)
  if (times.length > 0) kinds.push('times', 'times')
  const kind = pick(r, kinds)
  if (kind === 'change') {
    const pay = [2000, 5000, 10000].find((x) => x >= answer + 100)
    if (pay === undefined) return { answer, kind: 'count', text: `${moneyWords(answer)} รวมเป็นเงินเท่าไร` }
    const price = pay - answer
    return { answer, kind, text: `ซื้อ${itemFor(r, price)}ราคา ${formatBS(price)} จ่ายด้วยธนบัตร ${pay / 100} บาท ได้เงินทอนเท่าไร` }
  }
  if (kind === 'add') {
    const a = Math.max(25, Math.round((answer * (0.25 + r() * 0.5)) / 25) * 25)
    const b = answer - a
    if (b < 25) return { answer, kind: 'read', text: `${formatBS(answer)} เขียนแบบใช้จุดได้เท่าไร` }
    return { answer, kind, text: `มีเงิน ${formatBS(a)} ได้เพิ่มอีก ${formatBS(b)} รวมเป็นเงินเท่าไร` }
  }
  if (kind === 'times') {
    const k = pick(r, times)
    const each = answer / k
    const name = itemFor(r, each)
    const unit = UNITS[name] ?? 'ชิ้น'
    return { answer, kind, text: `${name}ราคา${unit}ละ ${formatBS(each)} ซื้อ ${k} ${unit} ต้องจ่ายเงินเท่าไร` }
  }
  if (kind === 'count') return { answer, kind, text: `${moneyWords(answer)} รวมเป็นเงินเท่าไร` }
  return { answer, kind: 'read', text: `${formatBS(answer)} เขียนแบบใช้จุดได้เท่าไร` }
}

export interface BingoSet {
  seed: number
  /** ลำดับโจทย์ที่ครูอ่าน */
  calls: Call[]
}

export function buildBingo(seed: number): BingoSet {
  const r = makeRng(seed)
  const used = new Set<number>()
  const answers: number[] = []
  while (answers.length < POOL) {
    const v = int(r, 2, 99) * 100 + pick(r, [0, 0, 25, 50, 75])
    if (used.has(v)) continue
    used.add(v)
    answers.push(v)
  }
  return { seed, calls: shuffle(r, answers).map((a) => makeCall(r, a)) }
}

export interface BingoCell {
  /** สตางค์ (null = ช่องฟรี) */
  value: number | null
  /** ข้อความบนการ์ด */
  label: string
}

/** การ์ดใบที่ n (เริ่ม 1) ของชุด: เลือก 24 คำตอบจากชุด วางสุ่ม ช่องกลางฟรี */
export function bingoCard(set: BingoSet, n: number): BingoCell[] {
  const r = makeRng(set.seed * 1000 + n * 37)
  const picks = shuffle(
    r,
    set.calls.map((c) => c.answer),
  ).slice(0, CELLS - 1)
  const cells: BingoCell[] = []
  let k = 0
  for (let i = 0; i < CELLS; i += 1) {
    if (i === FREE) {
      cells.push({ value: null, label: 'ฟรี' })
      continue
    }
    const v = picks[k]
    k += 1
    cells.push({ value: v, label: r() < 0.5 ? formatDotNumber(v) : formatBS(v) })
  }
  return cells
}

/** แถวที่ชนะได้: 5 แถว 5 หลัก 2 แนวทแยง */
export const LINES: number[][] = [
  ...Array.from({ length: GRID }, (_, row) => Array.from({ length: GRID }, (_, c) => row * GRID + c)),
  ...Array.from({ length: GRID }, (_, col) => Array.from({ length: GRID }, (_, rr) => rr * GRID + col)),
  Array.from({ length: GRID }, (_, i) => i * GRID + i),
  Array.from({ length: GRID }, (_, i) => i * GRID + (GRID - 1 - i)),
]

/** การ์ดได้บิงโก (ครบหนึ่งแถว) เมื่ออ่านโจทย์ถึงข้อที่เท่าไร (เริ่ม 1) null = ไม่ครบเลย */
export function winAt(set: BingoSet, card: BingoCell[]): number | null {
  const when = new Map<number, number>()
  set.calls.forEach((c, i) => when.set(c.answer, i + 1))
  let best: number | null = null
  for (const line of LINES) {
    let last = 0
    let ok = true
    for (const i of line) {
      const v = card[i].value
      if (v === null) continue
      const t = when.get(v)
      if (t === undefined) {
        ok = false
        break
      }
      last = Math.max(last, t)
    }
    if (ok && (best === null || last < best)) best = last
  }
  return best
}
