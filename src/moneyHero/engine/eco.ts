import type { AmountQ, CalcRow, NpcId } from './types'
import { CLASS_GOALS, TRASH, classProgress, defaultPrices, type TrashPrices } from '../kad/kadData'
import { formatBS } from '../utils/money'
import { int, pick, shuffle } from '../utils/random'

/**
 * โหมด "กาดรักษ์โลก" ในเกม: หนึ่งวันเล่นครบวงจร
 * เลือกสินค้า → คัดแยกขยะ → ขายขยะให้ธนาคาร → ซื้ออุปกรณ์ → ทำสินค้า → ตั้งราคา
 * → ขายให้ลูกค้าและทอนเงิน → คิดกำไร → แบ่งกำไร (ลงทุน / ออม / บริจาค / ซื้อของให้เพื่อน)
 *
 * ทุกโจทย์คำนวณสร้างเป็น Question ปกติ จึงใช้ตัวเดินโจทย์เดิม (มีตัวช่วย วิธีคิด และนับลงสถิติทักษะ)
 * ตรรกะอยู่ไฟล์นี้ล้วน ๆ ชุดทดสอบสุ่มตรวจได้หลายพันวัน
 */

/* ------------------------------------------------------------------ */
/* ถังคัดแยก                                                            */
/* ------------------------------------------------------------------ */

export type BinId = 'plastic' | 'metal' | 'paper'

export const BINS: { id: BinId; name: string; color: string }[] = [
  { id: 'plastic', name: 'พลาสติก', color: '#1c7ed6' },
  { id: 'metal', name: 'โลหะ', color: '#f59f00' },
  { id: 'paper', name: 'กระดาษ', color: '#2f9e44' },
]

export const TRASH_BIN: Record<string, BinId> = {
  bottle: 'plastic',
  jar: 'plastic',
  cap: 'plastic',
  can: 'metal',
  box: 'paper',
  paper: 'paper',
}

export function trashName(id: string): string {
  return TRASH.find((t) => t.id === id)?.name ?? id
}

export function trashUnit(id: string): string {
  return TRASH.find((t) => t.id === id)?.unit ?? 'ชิ้น'
}

/* ------------------------------------------------------------------ */
/* สูตรสินค้า                                                           */
/* ------------------------------------------------------------------ */

export interface Material {
  name: string
  icon: string
  /** สตางค์ */
  price: number
}

export interface Recipe {
  /** ตรงกับ id สินค้าในชุดกาดรักษ์โลก (ใช้ภาพ ProductArt) */
  id: string
  name: string
  unit: string
  /** ขยะที่ต้องเก็บไว้ทำสินค้า */
  uses: Record<string, number>
  /** อุปกรณ์ที่ต้องซื้อ */
  buy: Material[]
  /** ทำได้กี่ชิ้น */
  makes: number
  /** ราคาขายให้เลือก (บาท) */
  prices: number[]
}

export const RECIPES: Recipe[] = [
  {
    id: 'pot',
    name: 'กระถางต้นไม้',
    unit: 'ใบ',
    uses: { bottle: 2 },
    buy: [
      { name: 'ดินปลูก', icon: '🟫', price: 500 },
      { name: 'ต้นกล้า', icon: '🌱', price: 600 },
    ],
    makes: 2,
    prices: [15, 20, 25],
  },
  {
    id: 'pencil',
    name: 'กระปุกใส่ดินสอ',
    unit: 'ใบ',
    uses: { can: 2 },
    buy: [
      { name: 'กระดาษสี', icon: '🎨', price: 400 },
      { name: 'กาว', icon: '🧴', price: 600 },
    ],
    makes: 2,
    prices: [10, 12, 15],
  },
  {
    id: 'notebook',
    name: 'สมุดรีไซเคิล',
    unit: 'เล่ม',
    uses: { paper: 2 },
    buy: [
      { name: 'เชือก', icon: '🧵', price: 300 },
      { name: 'ปกสี', icon: '📘', price: 500 },
    ],
    makes: 2,
    prices: [10, 12, 15],
  },
  {
    id: 'piggy',
    name: 'กระปุกออมสิน',
    unit: 'ใบ',
    uses: { bottle: 1, cap: 4 },
    buy: [{ name: 'สีชมพู', icon: '🖌️', price: 700 }],
    makes: 1,
    prices: [15, 18, 20],
  },
]

export function recipeById(id: string): Recipe {
  return RECIPES.find((r) => r.id === id) ?? RECIPES[0]
}

export function recipeCost(r: Recipe): number {
  return r.buy.reduce((s, m) => s + m.price, 0)
}

/* ------------------------------------------------------------------ */
/* หนึ่งวันของกาด                                                       */
/* ------------------------------------------------------------------ */

export interface EcoDay {
  recipe: Recipe
  /** กองขยะที่ต้องคัดแยก (สลับแล้ว) */
  pile: string[]
  /** ขยะที่เก็บไว้ทำสินค้า */
  keep: Record<string, number>
  /** ขยะที่ขายให้ธนาคาร */
  sell: Record<string, number>
  /** เงินที่ได้จากการขายขยะ (สตางค์) */
  payout: number
  /** เงินลงทุนที่ยกมาจากวันก่อน (สตางค์) */
  start: number
  /** ค่าอุปกรณ์ (สตางค์) */
  cost: number
}

export function countOf(list: readonly string[]): Record<string, number> {
  const out: Record<string, number> = {}
  for (const id of list) out[id] = (out[id] ?? 0) + 1
  return out
}

export function payoutOf(sell: Record<string, number>, prices: TrashPrices = defaultPrices()): number {
  return Object.entries(sell).reduce((s, [id, n]) => s + n * (prices[id] ?? 0), 0)
}

/** กองขยะมีของพอทำสินค้า และขายส่วนที่เหลือได้เงินพอซื้ออุปกรณ์ (มีเงินเหลืออย่างน้อย 2 บาท) */
export function makeDay(recipe: Recipe, start = 0, prices: TrashPrices = defaultPrices()): EcoDay {
  const cost = recipeCost(recipe)
  const keep = { ...recipe.uses }
  const sellList: string[] = []
  const ids = TRASH.map((t) => t.id)
  const extras = int(4, 6)
  for (let i = 0; i < extras; i += 1) sellList.push(pick(ids))
  // เติมกล่องกระดาษ (ราคาดี) จนเงินพอ
  let guard = 0
  while (start + payoutOf(countOf(sellList), prices) < cost + 200 && guard < 20) {
    sellList.push(pick(['box', 'can', 'box']))
    guard += 1
  }
  const keepList = Object.entries(keep).flatMap(([id, n]) => Array.from({ length: n }, () => id))
  const sell = countOf(sellList)
  return { recipe, pile: shuffle([...keepList, ...sellList]), keep, sell, payout: payoutOf(sell, prices), start, cost }
}

/* ------------------------------------------------------------------ */
/* ลูกค้า                                                               */
/* ------------------------------------------------------------------ */

export interface Customer {
  npc: NpcId
  name: string
  /** อยากซื้อกี่ชิ้น */
  want: number
  /** ราคาสูงสุดที่ยอมจ่าย (บาท) */
  max: number
}

const SHOPPERS: { npc: NpcId; name: string }[] = [
  { npc: 'rabbit', name: 'กระต่าย' },
  { npc: 'fox', name: 'จิ้งจอก' },
  { npc: 'owl', name: 'นกฮูก' },
  { npc: 'bear', name: 'ลุงหมี' },
]

/** ลูกค้า 3 คน: ยอมจ่ายสูงสุดต่างกัน (ราคาถูก/กลาง/แพง) ตั้งราคาแพงไปจะขายได้น้อยลง */
export function makeCustomers(recipe: Recipe): Customer[] {
  const people = shuffle(SHOPPERS).slice(0, 3)
  const caps = shuffle([recipe.prices[0], recipe.prices[1], recipe.prices[recipe.prices.length - 1]])
  return people.map((p, i) => ({ ...p, want: recipe.makes > 1 && caps[i] === recipe.prices[recipe.prices.length - 1] ? 2 : 1, max: caps[i] }))
}

export interface Sale {
  customer: Customer
  qty: number
  /** ราคารวม จ่ายมา ทอน (สตางค์) */
  total: number
  paid: number
  change: number
}

export interface Serve {
  customer: Customer
  /** sold = ซื้อ, pricey = แพงไป, soldout = ของหมด */
  result: 'sold' | 'pricey' | 'soldout'
  sale?: Sale
}

/** ลูกค้าจ่ายด้วยธนบัตร/เหรียญใบเดียวที่พอและมากกว่าราคา (ต้องมีเงินทอนเสมอ) */
export function payWith(total: number): number {
  for (const v of [1000, 2000, 5000, 10000, 50000]) if (v > total) return v
  return Math.ceil((total + 1) / 10000) * 10000
}

export function serveCustomers(customers: readonly Customer[], priceBaht: number, stock: number): Serve[] {
  let left = stock
  return customers.map((c) => {
    if (priceBaht > c.max) return { customer: c, result: 'pricey' }
    if (left <= 0) return { customer: c, result: 'soldout' }
    const qty = Math.min(c.want, left)
    left -= qty
    const total = qty * priceBaht * 100
    const paid = payWith(total)
    return { customer: c, result: 'sold', sale: { customer: c, qty, total, paid, change: paid - total } }
  })
}

/* ------------------------------------------------------------------ */
/* โจทย์ (ใช้กับตัวเดินโจทย์เดิม)                                        */
/* ------------------------------------------------------------------ */

let seq = 0
function qid(): string {
  seq += 1
  return `eco-${Date.now().toString(36)}-${seq}`
}

function amountQ(q: Omit<AmountQ, 'id' | 'kind' | 'difficulty' | 'input'> & { answer: number }): AmountQ {
  return { ...q, id: qid(), kind: 'amount', difficulty: 1, input: q.answer % 100 === 0 ? 'baht' : 'bs' }
}

/** ขายขยะ: จำนวน × ราคา แต่ละชนิด แล้วรวม */
export function sellQuestion(day: EcoDay, prices: TrashPrices = defaultPrices()): AmountQ {
  const lines = TRASH.filter((t) => (day.sell[t.id] ?? 0) > 0).map((t) => ({ t, n: day.sell[t.id], each: prices[t.id] ?? t.price }))
  const rows: CalcRow[] = lines.map((l, i) => ({ value: l.n * l.each, op: i === 0 ? undefined : '+' }))
  const sub = lines.map((l) => `${l.t.name} ${l.n} ${l.t.unit} × ${formatBS(l.each)} = ${formatBS(l.n * l.each)}`)
  return amountQ({
    gen: 'eco-sell',
    skill: 'muldiv',
    title: 'ธนาคารขยะรับซื้อขยะที่เหลือ หนูจะได้เงินรวมเท่าไร?',
    story: lines.map((l) => `${l.t.name} ${l.n} ${l.t.unit} (${l.t.unit}ละ ${formatBS(l.each)})`).join(' · '),
    visual: { type: 'calc', rows, hideResult: true },
    answer: day.payout,
    npc: 'bear',
    hint: {
      text: 'คูณจำนวนกับราคาของขยะแต่ละชนิดก่อน แล้วนำมาบวกกัน',
      visualNote: 'เงินของขยะแต่ละชนิด',
      partial: sub.slice(0, 2),
      visual: { type: 'calc', rows, hideResult: true },
    },
    explain: [...sub, `รวม ${lines.map((l) => formatBS(l.n * l.each)).join(' + ')} = ${formatBS(day.payout)}`],
  })
}

/** ซื้ออุปกรณ์: รวมราคาอุปกรณ์ */
export function costQuestion(recipe: Recipe): AmountQ {
  const cost = recipeCost(recipe)
  const rows: CalcRow[] = recipe.buy.map((m, i) => ({ value: m.price, op: i === 0 ? undefined : '+' }))
  const many = recipe.buy.length > 1
  return amountQ({
    gen: 'eco-cost',
    skill: 'addsub',
    title: many ? `ซื้ออุปกรณ์ทำ${recipe.name} รวมต้องจ่ายเท่าไร?` : `ซื้ออุปกรณ์ทำ${recipe.name} ต้องจ่ายเท่าไร?`,
    story: recipe.buy.map((m) => `${m.icon} ${m.name} ${formatBS(m.price)}`).join(' · '),
    visual: { type: 'calc', rows, hideResult: true },
    answer: cost,
    npc: 'bear',
    hint: {
      text: many ? 'นำราคาอุปกรณ์ทุกอย่างมาบวกกัน' : 'ดูราคาของอุปกรณ์ที่ต้องซื้อ',
      visualNote: 'ราคาอุปกรณ์',
      partial: [recipe.buy.map((m) => formatBS(m.price)).join(' + ')],
      visual: { type: 'calc', rows, hideResult: true },
    },
    explain: [`${recipe.buy.map((m) => formatBS(m.price)).join(' + ')} = ${formatBS(cost)}`, `ต้นทุนของ${recipe.name}คือ ${formatBS(cost)}`],
  })
}

/** มีเงินเท่านี้ จ่ายค่าอุปกรณ์แล้วเหลือเท่าไร */
export function leftQuestion(have: number, cost: number): AmountQ {
  const left = have - cost
  return amountQ({
    gen: 'eco-left',
    skill: 'addsub',
    title: `มีเงิน ${formatBS(have)} จ่ายค่าอุปกรณ์ ${formatBS(cost)} จะเหลือเงินเท่าไร?`,
    visual: { type: 'calc', rows: [{ value: have }, { value: cost, op: '-' }], hideResult: true },
    answer: left,
    npc: 'bear',
    hint: {
      text: 'เงินที่มี − เงินที่จ่าย = เงินที่เหลือ',
      visualNote: 'ตั้งลบ',
      partial: [`${formatBS(have)} − ${formatBS(cost)}`],
      visual: { type: 'calc', rows: [{ value: have }, { value: cost, op: '-' }], hideResult: true },
    },
    explain: [`${formatBS(have)} − ${formatBS(cost)} = ${formatBS(left)}`],
  })
}

/** ขายของ: ราคารวม แล้วทอนเงิน */
export function changeQuestion(sale: Sale, recipe: Recipe, priceBaht: number): AmountQ {
  const multi = sale.qty > 1
  const price = priceBaht * 100
  return amountQ({
    gen: 'eco-change',
    skill: 'word',
    title: 'ต้องทอนเงินลูกค้าเท่าไร?',
    story: `${sale.customer.name}ซื้อ${recipe.name} ${sale.qty} ${recipe.unit}${multi ? ` ${recipe.unit}ละ ${formatBS(price)}` : ` ราคา ${formatBS(price)}`} จ่ายเงินมา ${formatBS(sale.paid)}`,
    visual: { type: 'calc', rows: [{ value: sale.paid }, { value: sale.total, op: '-' }], hideResult: true },
    answer: sale.change,
    npc: sale.customer.npc,
    hint: {
      text: multi ? 'หาราคารวมก่อน (จำนวน × ราคา) แล้วนำเงินที่ลูกค้าจ่ายลบราคารวม' : 'เงินที่ลูกค้าจ่าย − ราคาสินค้า = เงินทอน',
      visualNote: 'เงินที่จ่าย − ราคารวม',
      partial: multi ? [`ราคารวม ${sale.qty} × ${formatBS(price)} = ${formatBS(sale.total)}`] : [`${formatBS(sale.paid)} − ${formatBS(sale.total)}`],
    },
    explain: [
      ...(multi ? [`ราคารวม ${sale.qty} × ${formatBS(price)} = ${formatBS(sale.total)}`] : []),
      `เงินทอน ${formatBS(sale.paid)} − ${formatBS(sale.total)} = ${formatBS(sale.change)}`,
    ],
  })
}

/** กำไร = รายได้ − ต้นทุน (ขาดทุนก็ถามว่าขาดทุนเท่าไร) */
export function profitQuestion(income: number, cost: number): AmountQ | null {
  const profit = income - cost
  if (profit === 0) return null
  const gain = profit > 0
  const [a, b] = gain ? [income, cost] : [cost, income]
  return amountQ({
    gen: 'eco-profit',
    skill: 'addsub',
    title: gain ? `ขายสินค้าได้ ${formatBS(income)} ต้นทุน ${formatBS(cost)} ได้กำไรเท่าไร?` : `ขายสินค้าได้ ${formatBS(income)} แต่ต้นทุน ${formatBS(cost)} ขาดทุนเท่าไร?`,
    story: gain ? 'กำไร = รายได้ − ต้นทุน' : 'ขาดทุน = ต้นทุน − รายได้ (รายได้น้อยกว่าต้นทุน)',
    visual: { type: 'calc', rows: [{ value: a }, { value: b, op: '-' }], hideResult: true },
    answer: Math.abs(profit),
    npc: 'owl',
    hint: {
      text: gain ? 'รายได้ − ต้นทุน = กำไร' : 'ต้นทุน − รายได้ = ขาดทุน',
      visualNote: 'ตั้งลบ',
      partial: [`${formatBS(a)} − ${formatBS(b)}`],
    },
    explain: [`${formatBS(a)} − ${formatBS(b)} = ${formatBS(Math.abs(profit))}`, gain ? `ได้กำไร ${formatBS(profit)} 🎉` : `ขาดทุน ${formatBS(-profit)} รอบหน้าลองตั้งราคาใหม่นะ`],
  })
}

/* ------------------------------------------------------------------ */
/* ใช้กำไร และบันทึกของผู้เล่น                                           */
/* ------------------------------------------------------------------ */

export type ProfitUse = 'invest' | 'gift' | 'save' | 'donate'

export const PROFIT_PLAN: { id: ProfitUse; icon: string; label: string; note: string }[] = [
  { id: 'invest', icon: '🌱', label: 'ลงทุนรอบใหม่', note: 'เป็นทุนของวันพรุ่งนี้' },
  { id: 'save', icon: '💰', label: 'เก็บออม', note: 'หยอดกระปุกออมสินเป็นเหรียญ' },
  { id: 'donate', icon: '❤️', label: 'บริจาคกองทุนต้นไม้', note: 'ช่วยรดน้ำต้นไม้ของเมือง' },
  { id: 'gift', icon: '🎁', label: 'ซื้อของให้เพื่อน', note: 'แบ่งปันให้เพื่อนในเมือง' },
]

export type Allocation = Record<ProfitUse, number>

export function emptyAlloc(): Allocation {
  return { invest: 0, gift: 0, save: 0, donate: 0 }
}

export function allocTotal(a: Allocation): number {
  return a.invest + a.gift + a.save + a.donate
}

export interface EcoRecord {
  days: number
  /** ยอดขายสินค้าสะสม (สตางค์) ทำให้ต้นไม้โต */
  sales: number
  donated: number
  saved: number
  gifted: number
  /** ทุนที่ยกไปวันถัดไป */
  invest: number
  bestProfit: number
}

export function emptyEco(): EcoRecord {
  return { days: 0, sales: 0, donated: 0, saved: 0, gifted: 0, invest: 0, bestProfit: 0 }
}

export function recordEcoDay(rec: EcoRecord, day: { sales: number; profit: number; alloc: Allocation }): EcoRecord {
  return {
    days: rec.days + 1,
    sales: rec.sales + day.sales,
    donated: rec.donated + day.alloc.donate,
    saved: rec.saved + day.alloc.save,
    gifted: rec.gifted + day.alloc.gift,
    invest: day.alloc.invest,
    bestProfit: Math.max(rec.bestProfit, day.profit),
  }
}

/** รางวัลจบวัน (เหรียญในเกม และ EXP) */
export const ECO_REWARD = { coins: 5, exp: 40 }

/** ต้นไม้ของผู้เล่น: 0 ต้นกล้า → 1 ต้นไม้ → 2 กระถางดอกไม้ → 3 สวน */
export function ecoStage(rec: EcoRecord): { stage: number; next: (typeof CLASS_GOALS)[number] | null; need: number } {
  const p = classProgress(Math.floor(rec.sales / 100))
  return { stage: p.unlocked, next: p.next, need: p.need }
}
