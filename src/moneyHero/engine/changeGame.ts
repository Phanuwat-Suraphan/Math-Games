import type { DenomId, NpcId } from './types'
import { PRODUCTS } from '../kad/kadData'
import { decompose, denom, sumDenoms } from '../data/denominations'
import { formatBS } from '../utils/money'
import { int, pick } from '../utils/random'

/**
 * มินิเกม "ร้านทอนไว": ลูกค้ามาซื้อของที่แผงกาด จ่ายเงินมา เด็กแตะเงินในลิ้นชักให้ทอนพอดี
 * ระดับเพิ่มขึ้นตามจำนวนลูกค้าที่บริการถูกติดกัน
 *   ระดับ 1 ทอนไม่เกิน 20 บาท (เหรียญบาท) · ระดับ 2 ทอนด้วยธนบัตร 20/50 ได้
 *   ระดับ 3 ซื้อ 2 ชิ้น หรือราคามีสตางค์ (ทอนด้วยเหรียญ 50 สตางค์)
 * ตรรกะล้วน ชุดทดสอบสุ่มตรวจได้
 */

export const CHANGE_TRAY: DenomId[] = ['s50', 'b1', 'b2', 'b5', 'b10', 'b20', 'b50', 'b100']

/** โหมดท้าเวลา (วินาที) และจำนวนลูกค้าในโหมดฝึก */
export const TIMED_SECONDS = 60
export const PRACTICE_CUSTOMERS = 8

const SHOPPERS: { npc: NpcId; name: string }[] = [
  { npc: 'rabbit', name: 'กระต่าย' },
  { npc: 'fox', name: 'จิ้งจอก' },
  { npc: 'bear', name: 'ลุงหมี' },
  { npc: 'owl', name: 'นกฮูก' },
]

export interface Order {
  npc: NpcId
  name: string
  product: string
  productName: string
  qty: number
  /** ราคาต่อชิ้น ราคารวม เงินที่จ่าย และเงินทอน (สตางค์) */
  price: number
  total: number
  paid: number
  change: number
  /** ธนบัตร/เหรียญที่ลูกค้าจ่ายมา */
  paidWith: DenomId[]
  /** ตัวอย่างการทอนที่ถูกหนึ่งแบบ (น้อยชิ้นที่สุด) */
  solution: DenomId[]
}

export function levelFor(streak: number): 1 | 2 | 3 {
  return streak >= 6 ? 3 : streak >= 3 ? 2 : 1
}

/** ลูกค้าจ่ายด้วยธนบัตร/เหรียญใบเดียวที่มากกว่าราคา (เลือกใบที่ไม่ใหญ่เกินไป) */
function payNote(total: number, level: 1 | 2 | 3): DenomId {
  const options: DenomId[] = level === 1 ? ['b10', 'b20', 'b50'] : ['b20', 'b50', 'b100']
  const ok = options.filter((id) => denom(id).value > total)
  // เลือกใบที่เล็กที่สุดที่พอ บางครั้งเลือกใบถัดไปให้ต้องทอนมากขึ้น
  if (ok.length === 0) return 'b100'
  return level > 1 && ok.length > 1 && int(0, 2) === 0 ? ok[1] : ok[0]
}

export function makeOrder(level: 1 | 2 | 3, avoid?: NpcId): Order {
  const who = pick(SHOPPERS.filter((s) => s.npc !== avoid))
  const product = pick(PRODUCTS)
  const qty = level === 3 && int(0, 1) === 1 ? 2 : 1
  let priceBaht = int(product.min, product.max)
  if (level === 1) priceBaht = Math.min(priceBaht, 18)
  // ระดับ 3 บางข้อราคามีสตางค์ (ครึ่งบาท)
  const price = priceBaht * 100 + (level === 3 && qty === 1 && int(0, 1) === 1 ? 50 : 0)
  const total = price * qty
  const note = payNote(total, level)
  const paid = denom(note).value
  const change = paid - total
  const solution = decompose(change, CHANGE_TRAY, 20) ?? []
  return {
    npc: who.npc,
    name: who.name,
    product: product.id,
    productName: product.name,
    qty,
    price,
    total,
    paid,
    change,
    paidWith: [note],
    solution,
  }
}

export interface ChangeCheck {
  ok: boolean
  /** บวก = ทอนเกิน ลบ = ทอนขาด */
  diff: number
  message: string
}

export function checkChange(order: Order, given: readonly DenomId[]): ChangeCheck {
  const sum = sumDenoms(given)
  const diff = sum - order.change
  if (diff === 0) return { ok: true, diff, message: `ทอน ${formatBS(order.change)} พอดี ขอบใจนะ!` }
  if (given.length === 0) return { ok: false, diff, message: 'ยังไม่ได้หยิบเงินทอนเลย แตะเงินในลิ้นชักได้เลย' }
  return diff > 0
    ? { ok: false, diff, message: `ทอนเกินไป ${formatBS(diff)} ลองเอาบางชิ้นคืน` }
    : { ok: false, diff, message: `ยังทอนขาดอีก ${formatBS(-diff)}` }
}

/** คะแนนต่อลูกค้า: 10 + โบนัสคอมโบ (ติดกันยิ่งมากยิ่งได้มาก สูงสุด +10) */
export function serveScore(combo: number): number {
  return 10 + Math.min(10, combo * 2)
}

/** รางวัลเหรียญในเกมจากคะแนนรอบหนึ่ง (กันปั๊มเหรียญ: สูงสุด 12 เหรียญต่อรอบ) */
export function roundCoins(served: number): number {
  return Math.min(12, served)
}

/** ดาวของรอบ */
export function roundStars(served: number, mode: 'timed' | 'practice', mistakes: number): number {
  if (mode === 'practice') return mistakes === 0 ? 3 : mistakes <= 2 ? 2 : 1
  return served >= 10 ? 3 : served >= 6 ? 2 : served >= 1 ? 1 : 0
}
