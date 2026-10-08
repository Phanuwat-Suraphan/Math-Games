import type { NpcId } from './types'
import { explainAdd, explainSub } from '../generators/common'
import { formatBS } from '../utils/money'
import { earn } from './ledger'
import type { Player } from './progress'

/**
 * วางแผนใช้เงิน: เพื่อนขอให้ช่วยจัดงาน มีงบจำกัด และของที่ต้องมีให้ครบ
 *   1. เลือกของให้ครบตามรายการ (เกมไม่บอกยอดรวม เด็กต้องคิดเอง)
 *   2. คิดยอดรวม · ถ้าเกินงบต้องกลับไปเปลี่ยนของ
 *   3. คิดเงินที่เหลือจากงบ
 * เงินทั้งหมดเป็นสตางค์ (จำนวนเต็ม)
 */

export interface PlanItem {
  id: string
  name: string
  icon: string
  price: number
  cat: string
}

export interface PlanEvent {
  id: string
  npc: NpcId
  icon: string
  title: string
  story: string
  budget: number
  /** หมวด → จำนวนอย่างที่ต้องมีอย่างน้อย */
  needs: Record<string, number>
  catNames: Record<string, string>
  items: PlanItem[]
  /** ราคามีสตางค์ (ช่องคำตอบมีช่องสตางค์) */
  satang: boolean
  done: string
}

const item = (id: string, icon: string, name: string, baht: number, cat: string): PlanItem => ({ id, icon, name, price: Math.round(baht * 100), cat })

export const PLAN_EVENTS: PlanEvent[] = [
  {
    id: 'rabbit-party',
    npc: 'rabbit',
    icon: '🎂',
    title: 'ปาร์ตี้วันเกิดน้องกระต่าย',
    story: 'พรุ่งนี้วันเกิดฉัน! ช่วยซื้อเค้ก 1 อย่าง ขนม 2 อย่าง และของตกแต่ง 1 อย่าง งบ 100 บาทนะ',
    budget: 10000,
    needs: { cake: 1, snack: 2, deco: 1 },
    catNames: { cake: 'เค้ก', snack: 'ขนม', deco: 'ของตกแต่ง' },
    items: [
      item('cake-choc', '🎂', 'เค้กช็อกโกแลต', 45, 'cake'),
      item('cupcake', '🧁', 'คัพเค้ก', 30, 'cake'),
      item('cake-fruit', '🍰', 'เค้กผลไม้', 55, 'cake'),
      item('cookie', '🍪', 'คุกกี้', 12, 'snack'),
      item('donut', '🍩', 'โดนัท', 15, 'snack'),
      item('popcorn', '🍿', 'ป๊อปคอร์น', 10, 'snack'),
      item('candy', '🍬', 'ลูกอม', 8, 'snack'),
      item('balloon', '🎈', 'ลูกโป่ง', 10, 'deco'),
      item('flags', '🎏', 'ธงราว', 20, 'deco'),
      item('hats', '🥳', 'หมวกปาร์ตี้', 25, 'deco'),
    ],
    satang: false,
    done: 'ปาร์ตี้สนุกมาก! ขอบคุณที่ช่วยวางแผนนะ',
  },
  {
    id: 'fox-picnic',
    npc: 'fox',
    icon: '🧺',
    title: 'ปิกนิกกับจิ้งจอก',
    story: 'ไปปิกนิกกัน! ต้องมีเครื่องดื่ม 2 อย่าง อาหาร 1 อย่าง และผลไม้ 1 อย่าง งบ 70 บาท',
    budget: 7000,
    needs: { drink: 2, food: 1, fruit: 1 },
    catNames: { drink: 'เครื่องดื่ม', food: 'อาหาร', fruit: 'ผลไม้' },
    items: [
      item('orange', '🧃', 'น้ำส้ม', 12, 'drink'),
      item('milk', '🥛', 'นม', 10, 'drink'),
      item('water', '💧', 'น้ำเปล่า', 7, 'drink'),
      item('sandwich', '🥪', 'แซนด์วิช', 25, 'food'),
      item('onigiri', '🍙', 'ข้าวปั้น', 18, 'food'),
      item('chicken', '🍗', 'ไก่ทอด', 30, 'food'),
      item('melon', '🍉', 'แตงโม', 20, 'fruit'),
      item('banana', '🍌', 'กล้วย', 12, 'fruit'),
      item('grape', '🍇', 'องุ่น', 28, 'fruit'),
    ],
    satang: false,
    done: 'อิ่มอร่อยทุกคนเลย ปิกนิกครั้งนี้ดีที่สุด!',
  },
  {
    id: 'bear-trip',
    npc: 'bear',
    icon: '🚌',
    title: 'ทัศนศึกษากับลุงหมี',
    story: 'ไปทัศนศึกษา! เตรียมอาหารกลางวัน เครื่องดื่ม ขนม และเครื่องเขียน อย่างละ 1 งบ 100 บาท',
    budget: 10000,
    needs: { lunch: 1, drink: 1, snack: 1, tool: 1 },
    catNames: { lunch: 'อาหารกลางวัน', drink: 'เครื่องดื่ม', snack: 'ขนม', tool: 'เครื่องเขียน' },
    items: [
      item('bento', '🍱', 'ข้าวกล่อง', 35.5, 'lunch'),
      item('noodle', '🍜', 'ก๋วยเตี๋ยว', 30, 'lunch'),
      item('pizza', '🍕', 'พิซซ่า', 42.5, 'lunch'),
      item('tea', '🧋', 'ชานมเย็น', 15.5, 'drink'),
      item('juice', '🧃', 'น้ำผลไม้', 12.5, 'drink'),
      item('water2', '💧', 'น้ำเปล่า', 7, 'drink'),
      item('bread', '🍞', 'ขนมปัง', 9.5, 'snack'),
      item('cookie2', '🍪', 'คุกกี้', 12, 'snack'),
      item('fries', '🍟', 'มันฝรั่งทอด', 18.5, 'snack'),
      item('notebook', '📒', 'สมุดจด', 15, 'tool'),
      item('crayon', '🖍️', 'ดินสอสี', 25.5, 'tool'),
      item('lens', '🔍', 'แว่นขยาย', 32, 'tool'),
    ],
    satang: true,
    done: 'ทริปนี้ได้ความรู้เพียบ แถมใช้เงินคุ้มค่าด้วย!',
  },
  {
    id: 'owl-books',
    npc: 'owl',
    icon: '📚',
    title: 'งานหนังสือของนกฮูก',
    story: 'ไปงานหนังสือกัน! เลือกหนังสือ 2 เล่ม และของใช้ 1 อย่าง งบ 200 บาท ระวังเกินงบนะ',
    budget: 20000,
    needs: { book: 2, tool: 1 },
    catNames: { book: 'หนังสือ', tool: 'ของใช้' },
    items: [
      item('tale', '📕', 'นิทานภาพ', 65, 'book'),
      item('comic', '📗', 'การ์ตูนความรู้', 79.5, 'book'),
      item('animal', '📘', 'หนังสือภาพสัตว์', 89, 'book'),
      item('space', '📙', 'หนังสือดาราศาสตร์', 95.5, 'book'),
      item('mark', '🔖', 'ที่คั่นหนังสือ', 12.5, 'tool'),
      item('pen', '🖊️', 'ปากกาสี', 18, 'tool'),
      item('sticker', '✨', 'สติกเกอร์', 15.5, 'tool'),
    ],
    satang: true,
    done: 'ได้หนังสือดี ๆ มาอ่านแล้ว ขอบคุณนะ!',
  },
]

export function planEvent(id: string): PlanEvent | undefined {
  return PLAN_EVENTS.find((e) => e.id === id)
}

export function cartItems(event: PlanEvent, cart: readonly string[]): PlanItem[] {
  return cart.map((id) => event.items.find((i) => i.id === id)).filter((i): i is PlanItem => !!i)
}

export function cartTotal(event: PlanEvent, cart: readonly string[]): number {
  return cartItems(event, cart).reduce((s, i) => s + i.price, 0)
}

/** หมวดที่ยังเลือกไม่ครบ: หมวด → ยังขาดอีกกี่อย่าง */
export function missingNeeds(event: PlanEvent, cart: readonly string[]): Record<string, number> {
  const have: Record<string, number> = {}
  for (const i of cartItems(event, cart)) have[i.cat] = (have[i.cat] ?? 0) + 1
  const out: Record<string, number> = {}
  for (const [cat, n] of Object.entries(event.needs)) if ((have[cat] ?? 0) < n) out[cat] = n - (have[cat] ?? 0)
  return out
}

export function needsMet(event: PlanEvent, cart: readonly string[]): boolean {
  return Object.keys(missingNeeds(event, cart)).length === 0
}

/** แผนที่ถูกที่สุดที่ครบตามรายการ (ใช้ตรวจว่าทุกงานทำได้จริงในงบ) */
export function cheapestPlan(event: PlanEvent): string[] {
  const out: string[] = []
  for (const [cat, n] of Object.entries(event.needs)) {
    out.push(
      ...event.items
        .filter((i) => i.cat === cat)
        .sort((a, b) => a.price - b.price)
        .slice(0, n)
        .map((i) => i.id),
    )
  }
  return out
}

/** วิธีคิดยอดรวม และเงินที่เหลือ (แสดงเมื่อตอบผิดครบ 2 ครั้ง) */
export function explainTotal(event: PlanEvent, cart: readonly string[]): string[] {
  const items = cartItems(event, cart)
  const prices = items.map((i) => i.price)
  const lines = items.map((i) => `${i.icon} ${i.name} ${formatBS(i.price)}`)
  if (event.satang) lines.push(...explainAdd(prices))
  else lines.push(`${prices.map((p) => p / 100).join(' + ')} = ${formatBS(cartTotal(event, cart))}`)
  return lines
}

export function explainLeft(event: PlanEvent, total: number): string[] {
  const left = event.budget - total
  const lines = [`งบ ${formatBS(event.budget)} − ใช้ไป ${formatBS(total)}`]
  if (event.satang) lines.push(...explainSub(event.budget, total))
  lines.push(`เหลือ ${formatBS(left)}`)
  return lines
}

/** ดาว: ไม่เกินงบเลย และคิดถูกตั้งแต่ครั้งแรกทั้งสองข้อ = 3 ดาว */
export function planStars(mistakes: number, overBudget: number): 1 | 2 | 3 {
  const slips = mistakes + overBudget
  if (slips === 0) return 3
  if (slips <= 2) return 2
  return 1
}

export interface PlanRecord {
  /** ดาวที่ดีที่สุดของแต่ละงาน */
  best: Record<string, number>
  /** จัดงานสำเร็จกี่ครั้ง */
  done: number
}

export function emptyPlan(): PlanRecord {
  return { best: {}, done: 0 }
}

export function planReward(stars: number, firstClear: boolean): number {
  const coins = 6 + stars * 3
  return firstClear ? coins : Math.round(coins / 2)
}

/** บันทึกผลการจัดงาน ให้เหรียญรางวัล (ลงสมุดบัญชี) */
export function recordPlan(p: Player, eventId: string, stars: number): Player {
  const rec = { ...emptyPlan(), ...(p.plan ?? {}) }
  const before = rec.best[eventId] ?? 0
  const event = planEvent(eventId)
  const next: Player = { ...p, plan: { best: { ...rec.best, [eventId]: Math.max(before, stars) }, done: rec.done + 1 } }
  return earn(next, planReward(stars, before === 0), `จัดงาน: ${event?.title ?? eventId}`, event?.icon ?? '🎉')
}

/** จำนวนงานที่เคยจัดสำเร็จ (ไม่นับซ้ำ) */
export function plannedEvents(p: Player): number {
  return Object.values(p.plan?.best ?? {}).filter((s) => s > 0).length
}
