/**
 * ชนิดข้อมูลกลางของ MONEY HERO
 *
 * เงินทุกจำนวนในเกมเก็บเป็น "สตางค์จำนวนเต็ม" เสมอ
 * เช่น 25.50 บาท เก็บเป็น 2550 ห้ามเก็บเป็นทศนิยม
 * เพราะ 0.1 + 0.2 ของ JavaScript ไม่ได้ 0.3 พอดี
 */

/** ทักษะ 9 ด้านที่คุณครูเห็นในแผงสถิติ */
export type Skill =
  | 'notes'
  | 'count'
  | 'dot'
  | 'compare'
  | 'exchange'
  | 'addsub'
  | 'muldiv'
  | 'word'
  | 'ledger'

export type Difficulty = 1 | 2 | 3

export type StepId = 'learn' | 'practice' | 'mission' | 'boss'

export type DenomId =
  | 's25'
  | 's50'
  | 'b1'
  | 'b2'
  | 'b5'
  | 'b10'
  | 'b20'
  | 'b50'
  | 'b100'
  | 'b500'
  | 'b1000'

export type NpcId = 'hero' | 'rabbit' | 'fox' | 'bear' | 'owl'

export type Op = '+' | '-' | '×' | '÷'

/* ------------------------------------------------------------------ */
/* ภาพประกอบ                                                          */
/* ------------------------------------------------------------------ */

export interface CalcRow {
  op?: Op
  /** จำนวนเงินเป็นสตางค์ หรือจำนวนนับธรรมดาเมื่อ plain = true */
  value: number
  plain?: boolean
}

export interface BarPart {
  label: string
  value?: number
  unknown?: boolean
}

export interface LedgerRow {
  day: number
  month: string
  year: number
  item: string
  type: 'in' | 'out'
  /** สตางค์ */
  amount: number
}

export interface LedgerSheet {
  owner: string
  /** เงินยกมาก่อนแถวแรก เป็นสตางค์ */
  start: number
  rows: LedgerRow[]
}

export interface ProductItem {
  id: string
  name: string
  emoji: string
  /** สตางค์ */
  price: number
}

export type Visual =
  | { type: 'money'; items: DenomId[]; caption?: string }
  | { type: 'gallery' }
  | { type: 'split'; value: number }
  | { type: 'calc'; rows: CalcRow[]; result?: number; hideResult?: boolean }
  | {
      type: 'bar'
      mode: 'join' | 'separate' | 'compare' | 'equal'
      parts: BarPart[]
      total: BarPart
      /** จำนวนช่องเท่า ๆ กัน (ใช้กับคูณ หาร) */
      count?: number
    }
  | { type: 'ledger'; sheet: LedgerSheet; showBalance?: boolean }
  | { type: 'exchange'; left: DenomId[]; right: DenomId[] }
  | { type: 'products'; items: ProductItem[] }
  | { type: 'big'; text: string; sub?: string }
  | { type: 'rules'; items: string[] }
  | { type: 'pair'; a: number; b: number; aLabel?: string; bLabel?: string }

export interface Hint {
  /** ระดับ 1 บอกแนวทาง ห้ามเฉลย */
  text: string
  /** ระดับ 2 แสดงภาพ */
  visual?: Visual
  visualNote: string
  /** ระดับ 3 แสดงวิธีคิดบางส่วน */
  partial: string[]
}

/* ------------------------------------------------------------------ */
/* คำถาม                                                               */
/* ------------------------------------------------------------------ */

export interface QBase {
  id: string
  /** ชื่อตัวสร้างโจทย์ ใช้สร้างโจทย์ใหม่แบบเดียวกันเมื่อฝึกข้อที่เคยผิด */
  gen: string
  skill: Skill
  difficulty: Difficulty
  /** คำสั่งสั้น ๆ */
  title: string
  /** เรื่องราวประกอบ (ถ้ามี) */
  story?: string
  visual?: Visual
  hint: Hint
  /** วิธีคิดทีละขั้น แสดงหลังตอบ */
  explain: string[]
  npc?: NpcId
}

export interface ChoiceOption {
  id: string
  label: string
  money?: DenomId[]
  /** สัญลักษณ์ตัวใหญ่ เช่น > < = + − */
  symbol?: string
}

export interface ChoiceQ extends QBase {
  kind: 'choice'
  layout: 'grid' | 'list' | 'compare' | 'ops'
  options: ChoiceOption[]
  answer: string
}

export interface AmountQ extends QBase {
  kind: 'amount'
  /** bs = ช่องบาทกับช่องสตางค์, dot = เขียนแบบใช้จุด, baht = บาทอย่างเดียว */
  input: 'bs' | 'dot' | 'baht'
  answer: number
}

export interface NumberQ extends QBase {
  kind: 'number'
  unit: string
  answer: number
}

export interface PayRule {
  minPieces?: number
  maxPieces?: number
  exclude?: DenomId[]
  label?: string
}

export interface PayQ extends QBase {
  kind: 'pay'
  /** pay = จ่ายเงินซื้อของ, exchange = แลกเงิน, make = สร้างจำนวนเงินหลายแบบ */
  mode: 'pay' | 'exchange' | 'make'
  target: number
  tray: DenomId[]
  /** เงินที่นำมาแลก (โหมด exchange) */
  give?: DenomId[]
  rule?: PayRule
  /** โหมด make: ต้องหาให้ได้กี่แบบ */
  ways?: number
  /** ตัวอย่างคำตอบที่ถูกหนึ่งแบบ ใช้ในคำอธิบายและบอตทดสอบ */
  sample: DenomId[][]
  product?: { name: string; emoji: string }
}

export interface MatchSide {
  label: string
  money?: DenomId[]
}

export interface MatchQ extends QBase {
  kind: 'match'
  pairs: { id: string; left: MatchSide; right: MatchSide }[]
  /** ลำดับการแสดงฝั่งขวา (สับไว้ตั้งแต่ตอนสร้างโจทย์ ไม่สุ่มใหม่ตอนวาดจอ) */
  rightOrder: string[]
}

export interface SortQ extends QBase {
  kind: 'sort'
  order: 'asc' | 'desc'
  items: { id: string; value: number; label: string; money?: DenomId[] }[]
}

export interface ShopQ extends QBase {
  kind: 'shop'
  products: ProductItem[]
  pick: number
  /** มีเงินอยู่เท่าไร ถ้ามีจะถามเงินเหลือต่อ (สตางค์) */
  budget?: number
}

export type WordStep = 'given' | 'asked' | 'op' | 'calc' | 'check'

export interface WordQ extends QBase {
  kind: 'word'
  steps: WordStep[]
  given: { options: string[]; answer: number }
  asked: { options: string[]; answer: number }
  op: Op
  /** ตัวเลขที่ใช้คำนวณ (สตางค์ หรือจำนวนนับ ตาม plainSecond) */
  a: number
  b: number
  /** b เป็นจำนวนนับ ไม่ใช่เงิน (ใช้กับคูณ หาร) */
  bPlain: boolean
  answer: number
  check: string
}

export interface LedgerQ extends QBase {
  kind: 'ledger'
  sheet: LedgerSheet
}

export type Question =
  | ChoiceQ
  | AmountQ
  | NumberQ
  | PayQ
  | MatchQ
  | SortQ
  | ShopQ
  | WordQ
  | LedgerQ

/* ------------------------------------------------------------------ */
/* คำตอบของผู้เล่น                                                     */
/* ------------------------------------------------------------------ */

export type Response =
  | { kind: 'choice'; id: string }
  | { kind: 'amount'; baht: string; satang: string; dot: string }
  | { kind: 'number'; value: string }
  | { kind: 'pay'; combos: DenomId[][] }
  | { kind: 'match'; pairs: Record<string, string> }
  | { kind: 'sort'; order: string[] }
  | { kind: 'shop'; picked: string[]; totalBaht: string; totalSatang: string; changeBaht: string; changeSatang: string }
  | { kind: 'word'; calc: string; calcSatang: string }
  | { kind: 'ledger'; cells: { income: string; expense: string }[] }

export interface CheckResult {
  correct: boolean
  /** คำแนะนำเฉพาะจุดที่พลาด เช่น "จำนวนบาทถูกแล้ว ลองดูสตางค์" */
  feedback?: string
  /** คำอธิบายที่สร้างจากคำตอบจริง (เช่น ร้านค้าที่เด็กเลือกของเอง) */
  explain?: string[]
  /** ตำแหน่งที่ผิด (เช่นแถวในสมุดบัญชี หรือคู่ที่จับผิด) */
  wrongKeys?: string[]
}
