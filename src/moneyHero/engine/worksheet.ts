import type { DenomId, Skill } from './types'
import type { Player } from './progress'
import { SKILLS } from '../data/characters'
import { DENOMINATIONS, denom, sortDenomsDesc, sumDenoms } from '../data/denominations'
import { PRODUCTS } from '../data/products'
import { formatBS, formatDotNumber, splitSatang, commas } from '../utils/money'
import { weakSkills } from './progress'
import { testSkillPercent } from './report'

/**
 * ใบงานซ่อมเสริมรายทักษะ (พิมพ์ A4)
 *
 * - สร้างโจทย์แบบเติมคำตอบสำหรับกระดาษ 9 ทักษะ เงินเก็บเป็นสตางค์จำนวนเต็มเสมอ
 * - ใช้ตัวสุ่มแยกของตัวเองแบบตั้ง seed ได้ "ชุดที่" เดียวกันพิมพ์ซ้ำได้โจทย์และเฉลยเดิม
 *   และไม่ไปรบกวนตัวสุ่มของเกม
 * - เฉลยคำนวณจากตัวเลขชุดเดียวกับโจทย์ จึงตรงกันเสมอ
 */

export interface SheetTable {
  head: string[]
  rows: string[][]
}

export interface SheetItem {
  skill: Skill
  /** โจทย์ ช่องว่างใช้ ............ */
  text: string
  money?: DenomId[]
  table?: SheetTable
  /** มีที่ว่างให้แสดงวิธีทำ */
  work?: boolean
  /** เฉลย */
  answer: string
  /** ค่าตัวเลขของเฉลย (สตางค์ หรือจำนวนนับ) ใช้ตรวจในชุดทดสอบ */
  value?: number
}

export type SheetLevel = 1 | 2

type Rng = () => number

function makeRng(seed: number): Rng {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const BLANK = '............'

function int(r: Rng, min: number, max: number): number {
  return min + Math.floor(r() * (max - min + 1))
}

function pick<T>(r: Rng, xs: readonly T[]): T {
  return xs[Math.floor(r() * xs.length)]
}

/** จำนวนเงินสุ่ม (สตางค์) บาทในช่วงที่กำหนด สตางค์เป็น 0 25 50 75 */
function amount(r: Rng, minBaht: number, maxBaht: number, satang = true): number {
  return int(r, minBaht, maxBaht) * 100 + (satang ? pick(r, [0, 25, 50, 75]) : 0)
}

/** อ่านแบบบาทสตางค์สำหรับใส่ในประโยค */
function bs(v: number): string {
  return formatBS(v)
}

function dot(v: number): string {
  return `${formatDotNumber(v)} บาท`
}

/** ลักษณนามของสินค้า (ไม่มีในรายการใช้ "ชิ้น") */
const UNITS: Record<string, string> = {
  ลูกอม: 'เม็ด',
  นม: 'กล่อง',
  ขนมปัง: 'ถุง',
  น้ำผลไม้: 'กล่อง',
  คุกกี้: 'ถุง',
  ไอศกรีม: 'แท่ง',
  ไข่ไก่: 'ฟอง',
  แอปเปิล: 'ผล',
  กล้วยหอม: 'ลูก',
  ข้าวโพด: 'ฝัก',
  แครอท: 'หัว',
  ดินสอ: 'แท่ง',
  สมุด: 'เล่ม',
  สีเทียน: 'กล่อง',
  ยางลบ: 'ก้อน',
  ไม้บรรทัด: 'อัน',
  ข้าวกล่อง: 'กล่อง',
  ก๋วยเตี๋ยว: 'ชาม',
  ข้าวผัด: 'จาน',
  ว่าว: 'ตัว',
  ลูกบอล: 'ลูก',
}

/* ------------------------------------------------------------------ */
/* ตัวสร้างโจทย์รายทักษะ                                                  */
/* ------------------------------------------------------------------ */

type Gen = (r: Rng, level: SheetLevel) => SheetItem

const GEN: Record<Skill, Gen> = {
  notes: (r, level) => {
    const pool = level === 1 ? DENOMINATIONS.filter((d) => d.value <= 10000) : DENOMINATIONS
    const d = pick(r, pool)
    if (d.kind === 'note' && r() < 0.5) {
      return { skill: 'notes', text: `ธนบัตรในภาพมีค่า ${BLANK} บาท และเป็นธนบัตร${BLANK}`, money: [d.id], answer: `${commas(d.value / 100)} บาท · ${d.colorName}`, value: d.value }
    }
    return { skill: 'notes', text: `${d.kind === 'coin' ? 'เหรียญ' : 'ธนบัตร'}ในภาพมีค่าเท่าใด ตอบ ${BLANK}`, money: [d.id], answer: bs(d.value), value: d.value }
  },

  count: (r, level) => {
    const pool: DenomId[] = level === 1 ? ['s50', 'b1', 'b2', 'b5', 'b10', 'b20'] : ['s25', 's50', 'b1', 'b2', 'b5', 'b10', 'b20', 'b50', 'b100']
    const n = level === 1 ? int(r, 3, 4) : int(r, 4, 6)
    const ids = sortDenomsDesc(Array.from({ length: n }, () => pick(r, pool)))
    const v = sumDenoms(ids)
    return { skill: 'count', text: `เงินในภาพรวมเป็นเงิน ${BLANK} บาท ${BLANK} สตางค์`, money: ids, answer: bs(v), value: v }
  },

  dot: (r, level) => {
    const v = amount(r, 1, level === 1 ? 99 : 999)
    if (r() < 0.5) {
      return { skill: 'dot', text: `${bs(v)} เขียนแบบใช้จุดได้ ${BLANK} บาท`, answer: dot(v), value: v }
    }
    return { skill: 'dot', text: `${dot(v)} อ่านว่า ${BLANK} บาท ${BLANK} สตางค์`, answer: bs(v), value: v }
  },

  compare: (r, level) => {
    const a = amount(r, 5, level === 1 ? 60 : 500)
    const kind = int(r, 0, 2)
    const b = kind === 0 ? a : kind === 1 ? a + pick(r, [25, 50, 75, 100, 500]) : Math.max(25, a - pick(r, [25, 50, 75, 100, 500]))
    const sym = a > b ? '>' : a < b ? '<' : '='
    // ข้างหนึ่งเขียนแบบบาทสตางค์ อีกข้างแบบใช้จุด ฝึกอ่านสองแบบ
    const left = r() < 0.5 ? bs(a) : dot(a)
    const right = left.includes('.') ? bs(b) : dot(b)
    return { skill: 'compare', text: `เติมเครื่องหมาย > < หรือ =   ${left}  ( ${'      '} )  ${right}`, answer: sym, value: a - b }
  },

  exchange: (r, level) => {
    const kind = int(r, 0, 2)
    if (kind === 0) {
      // ธนบัตรแลกเหรียญหรือธนบัตรย่อย
      const pairs: [DenomId, DenomId][] = level === 1 ? [['b20', 'b5'], ['b20', 'b10'], ['b50', 'b10'], ['b100', 'b20'], ['b10', 'b1'], ['b10', 'b2']] : [['b100', 'b5'], ['b500', 'b100'], ['b1000', 'b100'], ['b500', 'b20'], ['b100', 'b2'], ['b1000', 'b50']]
      const [big, small] = pick(r, pairs)
      const n = denom(big).value / denom(small).value
      return { skill: 'exchange', text: `${denom(big).name} 1 ${denom(big).kind === 'coin' ? 'เหรียญ' : 'ใบ'} แลกเป็น${denom(small).name}ได้ ${BLANK} ${denom(small).kind === 'coin' ? 'เหรียญ' : 'ใบ'}`, answer: `${n} ${denom(small).kind === 'coin' ? 'เหรียญ' : 'ใบ'}`, value: n }
    }
    if (kind === 1) {
      const coin = pick(r, ['s25', 's50'] as DenomId[])
      const baht = int(r, 1, level === 1 ? 3 : 10)
      const n = (baht * 100) / denom(coin).value
      return { skill: 'exchange', text: `เงิน ${baht} บาท แลกเป็น${denom(coin).name}ได้ ${BLANK} เหรียญ`, answer: `${n} เหรียญ`, value: n }
    }
    const coin = pick(r, ['s25', 's50', 'b2', 'b5'] as DenomId[])
    const n = int(r, 2, level === 1 ? 8 : 20)
    const v = n * denom(coin).value
    return { skill: 'exchange', text: `${denom(coin).name} ${n} เหรียญ รวมเป็นเงิน ${BLANK}`, answer: bs(v), value: v }
  },

  addsub: (r, level) => {
    const a = amount(r, level === 1 ? 10 : 50, level === 1 ? 90 : 900)
    const b = amount(r, 5, level === 1 ? 60 : 500)
    if (r() < 0.5) return { skill: 'addsub', text: `${formatDotNumber(a)} + ${formatDotNumber(b)} = ${BLANK} บาท`, answer: dot(a + b), value: a + b, work: true }
    const [x, y] = a >= b ? [a, b] : [b, a]
    return { skill: 'addsub', text: `${formatDotNumber(x)} − ${formatDotNumber(y)} = ${BLANK} บาท`, answer: dot(x - y), value: x - y, work: true }
  },

  muldiv: (r, level) => {
    if (r() < 0.5) {
      const p = pick(
        r,
        PRODUCTS.filter((x) => x.max <= (level === 1 ? 25 : 90)),
      )
      const price = int(r, p.min, p.max) * 100
      const n = int(r, 2, level === 1 ? 5 : 9)
      const unit = UNITS[p.name] ?? 'ชิ้น'
      return { skill: 'muldiv', text: `${p.name}ราคา${unit}ละ ${bs(price)} ซื้อ ${n} ${unit} ต้องจ่ายเงิน ${BLANK} บาท`, answer: bs(price * n), value: price * n, work: true }
    }
    const k = int(r, 2, level === 1 ? 5 : 9)
    const each = int(r, 2, level === 1 ? 20 : 120) * 100
    return { skill: 'muldiv', text: `แบ่งเงิน ${bs(each * k)} ให้เพื่อน ${k} คน คนละเท่า ๆ กัน จะได้คนละ ${BLANK} บาท`, answer: bs(each), value: each, work: true }
  },

  word: (r, level) => {
    if (r() < 0.5) {
      const [p1, p2] = (() => {
        const xs = PRODUCTS.filter((x) => x.max <= 60)
        const a = pick(r, xs)
        let b = pick(r, xs)
        while (b.id === a.id) b = pick(r, xs)
        return [a, b]
      })()
      const a = amount(r, p1.min, p1.max)
      const b = amount(r, p2.min, p2.max)
      const pay = [2000, 5000, 10000, 50000].find((x) => x >= a + b + (level === 1 ? 0 : 500)) ?? 100000
      const change = pay - a - b
      return {
        skill: 'word',
        text: `มะลิมีเงิน ${bs(pay)} ซื้อ${p1.name}ราคา ${dot(a)} และ${p2.name}ราคา ${dot(b)} มะลิจะเหลือเงิน ${BLANK} บาท`,
        answer: `${bs(change)} (${formatDotNumber(pay)} − ${formatDotNumber(a)} − ${formatDotNumber(b)})`,
        value: change,
        work: true,
      }
    }
    const perDay = int(r, 3, level === 1 ? 10 : 25) * 100
    const days = int(r, 4, level === 1 ? 7 : 15)
    const saved = perDay * days
    const price = Math.max(100, saved - int(r, 1, Math.max(1, saved / 100 - 1)) * 100)
    return {
      skill: 'word',
      text: `ข้าวหอมออมเงินวันละ ${bs(perDay)} เป็นเวลา ${days} วัน แล้วนำไปซื้อของราคา ${bs(price)} ข้าวหอมจะเหลือเงิน ${BLANK} บาท`,
      answer: `${bs(saved - price)} (${perDay / 100} × ${days} = ${commas(saved / 100)} แล้ว ${commas(saved / 100)} − ${commas(price / 100)})`,
      value: saved - price,
      work: true,
    }
  },

  ledger: (r, level) => {
    const start = int(r, 2, level === 1 ? 10 : 30) * 1000
    const items: [string, 'in' | 'out'][] = [
      ['แม่ให้เงิน', 'in'],
      ['ขายของเล่นเก่า', 'in'],
      ['ซื้อสมุด', 'out'],
      ['ซื้อขนม', 'out'],
      ['ค่ารถ', 'out'],
      ['ช่วยงานบ้านได้เงิน', 'in'],
    ]
    const n = level === 1 ? 3 : 4
    let bal = start
    const rows: string[][] = []
    const used = new Set<string>()
    let guard = 0
    while (rows.length < n && guard < 50) {
      guard += 1
      const it = pick(r, items)
      if (used.has(it[0])) continue
      // รายจ่ายไม่เกินเงินที่มี (เหลืออย่างน้อย 1 บาท)
      const max = it[1] === 'out' ? Math.min(Math.floor(bal / 100) - 1, 60) : 80
      if (max < 5) continue
      used.add(it[0])
      const v = amount(r, 5, max, level === 2)
      if (it[1] === 'out' && v >= bal) continue
      bal += it[1] === 'in' ? v : -v
      rows.push([`${rows.length + 1}`, it[0], it[1] === 'in' ? formatDotNumber(v) : '', it[1] === 'out' ? formatDotNumber(v) : ''])
    }
    return {
      skill: 'ledger',
      text: `บัญชีของภูผา มีเงินยกมา ${dot(start)} เมื่อจบรายการทั้งหมด ภูผามีเงินคงเหลือ ${BLANK} บาท`,
      table: { head: ['ที่', 'รายการ', 'รายรับ (บาท)', 'รายจ่าย (บาท)'], rows },
      answer: dot(bal),
      value: bal,
      work: true,
    }
  },
}

export interface WorksheetOptions {
  skills: Skill[]
  perSkill: number
  level: SheetLevel
  /** ชุดที่ (ตัวเลข) ชุดเดียวกันได้โจทย์เดิม */
  seed: number
}

/** สร้างโจทย์เรียงตามทักษะ ข้อในทักษะเดียวกันไม่ซ้ำกัน */
export function buildWorksheet(o: WorksheetOptions): SheetItem[] {
  const r = makeRng(o.seed * 9973 + o.level * 131 + 17)
  const out: SheetItem[] = []
  for (const s of SKILLS.filter((x) => o.skills.includes(x))) {
    const seen = new Set<string>()
    let guard = 0
    while (out.filter((i) => i.skill === s).length < o.perSkill && guard < o.perSkill * 30) {
      guard += 1
      const item = GEN[s](r, o.level)
      // โจทย์ "เงินในภาพ" ใช้ข้อความเดียวกัน ต่างกันที่ภาพ จึงดูทั้งข้อความ ภาพ และตาราง
      const key = JSON.stringify([item.text, item.money ?? [], item.table ?? null])
      if (seen.has(key)) continue
      seen.add(key)
      out.push(item)
    }
  }
  return out
}

/** ทักษะที่นักเรียนควรซ่อม: ทักษะที่อ่อนในเกม และทักษะที่หลังเรียน (หรือก่อนเรียน) ต่ำกว่าเกณฑ์ */
export function remedialSkills(p: Player, passPercent: number): Skill[] {
  const test = p.postTest ?? p.preTest
  return SKILLS.filter((s) => {
    if (weakSkills(p).includes(s)) return true
    const v = testSkillPercent(test, s)
    return v !== null && v < passPercent
  })
}

/** seed ของใบงานรายบุคคล: ชุดที่ + รหัสนักเรียน (คนละชุดโจทย์ ไม่ลอกกัน แต่พิมพ์ซ้ำได้เหมือนเดิม) */
export function studentSeed(base: number, id: string): number {
  let h = base >>> 0
  for (let i = 0; i < id.length; i += 1) h = (Math.imul(h, 31) + id.charCodeAt(i)) >>> 0
  return h
}

/** ตรวจว่าเงินที่แสดงเป็นบาทสตางค์ไม่ติดลบ (ใช้ในชุดทดสอบ) */
export function validAmount(v: number): boolean {
  const { satang } = splitSatang(v)
  return Number.isInteger(v) && v >= 0 && satang % 25 === 0
}
