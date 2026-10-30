import type { Skill } from '../engine/types'
import { formatBS, formatDot } from '../utils/money'

/**
 * เกมกระดาน "ตะลุยเมืองเงิน ป.3" สำหรับพิมพ์เล่นจริงในห้องเรียน
 *
 * ผู้เล่นเดินบนถนน 40 ช่องจากบ้านไปธนาคาร ซื้อของตามบัตรรายการให้ครบ
 * ตอบภารกิจคณิตเพื่อรับเงิน ออมเงิน แลกเงิน และจดรายรับรายจ่ายทุกครั้ง
 * จบเกมนับดาว: ของครบ เงินเหลือ สมุดบัญชีถูกต้อง
 *
 * เงินทั้งหมดเป็นสตางค์ (จำนวนเต็ม) เหมือนส่วนอื่นของเกม
 */

export type ShopId = 'market' | 'stationery' | 'snack' | 'toy' | 'food' | 'icecream'

export interface BoardItem {
  id: string
  name: string
  emoji: string
  /** ราคาต่อหน่วย (สตางค์) */
  price: number
  unit: string
}

export interface BoardShop {
  id: ShopId
  name: string
  /** ชื่อสั้นบนช่องกระดาน */
  short: string
  icon: string
  color: string
  light: string
  items: BoardItem[]
}

const B = (baht: number, satang = 0) => baht * 100 + satang

export const BOARD_SHOPS: BoardShop[] = [
  {
    id: 'market',
    name: 'ตลาดสด',
    short: 'ตลาดสด',
    icon: '🥬',
    color: '#2f9e44',
    light: '#d3f9d8',
    items: [
      { id: 'egg', name: 'ไข่ไก่', emoji: '🥚', price: B(5), unit: 'ฟอง' },
      { id: 'banana', name: 'กล้วยหอม', emoji: '🍌', price: B(12), unit: 'หวี' },
      { id: 'corn', name: 'ข้าวโพด', emoji: '🌽', price: B(15), unit: 'ฝัก' },
      { id: 'carrot', name: 'แครอท', emoji: '🥕', price: B(8), unit: 'หัว' },
    ],
  },
  {
    id: 'stationery',
    name: 'ร้านเครื่องเขียน',
    short: 'เครื่องเขียน',
    icon: '✏️',
    color: '#1c7ed6',
    light: '#d0ebff',
    items: [
      { id: 'pencil', name: 'ดินสอ', emoji: '✏️', price: B(6), unit: 'แท่ง' },
      { id: 'eraser', name: 'ยางลบ', emoji: '🧽', price: B(5), unit: 'ก้อน' },
      { id: 'notebook', name: 'สมุด', emoji: '📒', price: B(18), unit: 'เล่ม' },
      { id: 'crayon', name: 'สีเทียน', emoji: '🖍️', price: B(35), unit: 'กล่อง' },
    ],
  },
  {
    id: 'snack',
    name: 'ร้านขนม',
    short: 'ร้านขนม',
    icon: '🍪',
    color: '#e8590c',
    light: '#ffe8cc',
    items: [
      { id: 'cookie', name: 'คุกกี้', emoji: '🍪', price: B(12), unit: 'ถุง' },
      { id: 'bread', name: 'ขนมปัง', emoji: '🍞', price: B(20), unit: 'ถุง' },
      { id: 'milk', name: 'นม', emoji: '🥛', price: B(12, 50), unit: 'กล่อง' },
      { id: 'candy', name: 'ลูกอม', emoji: '🍬', price: B(2, 50), unit: 'เม็ด' },
    ],
  },
  {
    id: 'toy',
    name: 'ร้านของเล่น',
    short: 'ของเล่น',
    icon: '🧸',
    color: '#7048e8',
    light: '#e5dbff',
    items: [
      { id: 'ball', name: 'ลูกบอล', emoji: '⚽', price: B(45), unit: 'ลูก' },
      { id: 'kite', name: 'ว่าว', emoji: '🪁', price: B(39), unit: 'ตัว' },
      { id: 'car', name: 'รถของเล่น', emoji: '🚗', price: B(55), unit: 'คัน' },
      { id: 'teddy', name: 'ตุ๊กตาหมี', emoji: '🧸', price: B(60), unit: 'ตัว' },
    ],
  },
  {
    id: 'food',
    name: 'ร้านอาหาร',
    short: 'ร้านอาหาร',
    icon: '🍛',
    color: '#c92a2a',
    light: '#ffe3e3',
    items: [
      { id: 'friedrice', name: 'ข้าวผัด', emoji: '🍛', price: B(35), unit: 'จาน' },
      { id: 'noodle', name: 'ก๋วยเตี๋ยว', emoji: '🍜', price: B(30), unit: 'ชาม' },
      { id: 'chicken', name: 'ข้าวมันไก่', emoji: '🍗', price: B(40), unit: 'จาน' },
      { id: 'juice', name: 'น้ำผลไม้', emoji: '🧃', price: B(15), unit: 'กล่อง' },
    ],
  },
  {
    id: 'icecream',
    name: 'ร้านไอศกรีม',
    short: 'ไอศกรีม',
    icon: '🍦',
    color: '#d6336c',
    light: '#ffdeeb',
    items: [
      { id: 'shaved', name: 'น้ำแข็งใส', emoji: '🍧', price: B(10), unit: 'ถ้วย' },
      { id: 'cone', name: 'ไอศกรีมโคน', emoji: '🍦', price: B(17, 50), unit: 'อัน' },
      { id: 'cup', name: 'ไอศกรีมถ้วย', emoji: '🍨', price: B(25), unit: 'ถ้วย' },
      { id: 'smoothie', name: 'น้ำปั่น', emoji: '🥤', price: B(20), unit: 'แก้ว' },
    ],
  },
]

export function boardShop(id: ShopId): BoardShop {
  return BOARD_SHOPS.find((s) => s.id === id)!
}

export function boardItem(id: string): { item: BoardItem; shop: BoardShop } {
  for (const shop of BOARD_SHOPS) {
    const item = shop.items.find((i) => i.id === id)
    if (item) return { item, shop }
  }
  throw new Error(`ไม่มีสินค้า ${id}`)
}

/* ------------------------------------------------------------------ */
/* ช่องบนกระดาน                                                          */
/* ------------------------------------------------------------------ */

export type SpaceKind = 'home' | 'bank' | 'quest' | 'luck' | 'shop' | 'save' | 'exchange' | 'bus' | 'work'

export interface SpaceInfo {
  icon: string
  name: string
  color: string
  light: string
  /** กติกาสั้น ๆ ของช่อง */
  rule: string
  /** คำอธิบายสั้นมากสำหรับแถบคำอธิบายบนกระดาน */
  short: string
}

export const SPACE_INFO: Record<SpaceKind, SpaceInfo> = {
  home: { icon: '🏠', name: 'บ้าน', color: '#f08c00', light: '#fff3bf', rule: 'จุดเริ่ม · วนกลับมาถึงบ้านรับค่าขนม 20 บาท', short: 'รับค่าขนม 20 บาท' },
  bank: { icon: '🏦', name: 'ธนาคาร', color: '#2b8a3e', light: '#b2f2bb', rule: 'เส้นชัย · ซื้อของครบแล้วจบเกม ถ้ายังไม่ครบ กลับไปบ้านเล่นรอบใหม่', short: 'เส้นชัย' },
  quest: { icon: '⭐', name: 'ภารกิจคณิต', color: '#e67700', light: '#fff9db', rule: 'จั่วการ์ดภารกิจ ตอบถูกรับเงินตามการ์ด', short: 'ตอบถูก รับเงินตามการ์ด' },
  luck: { icon: '🎁', name: 'โชคดี', color: '#d6336c', light: '#fff0f6', rule: 'จั่วการ์ดโชคดี แล้วทำตามการ์ด', short: 'จั่วการ์ด แล้วทำตาม' },
  shop: { icon: '🏪', name: 'ร้านค้า', color: '#495057', light: '#f1f3f5', rule: 'ซื้อของจากร้านนี้ได้ จ่ายเงินและรับเงินทอนให้ถูก', short: 'ซื้อของจากร้านนี้' },
  save: { icon: '🐷', name: 'ออมสิน', color: '#1c7ed6', light: '#e7f5ff', rule: 'ฝากเงินออมได้ ออมตั้งแต่ 10 บาท ได้ดาวนักออม 1 ดวง', short: 'ออม 10 บาทขึ้นไป ได้ 1 ดาว' },
  exchange: { icon: '🔄', name: 'แลกเงิน', color: '#7048e8', light: '#f3f0ff', rule: 'แลกเงินกับนายธนาคาร นับให้ดูว่าเท่ากัน ได้รางวัล 2 บาท', short: 'แลกถูก ได้ 2 บาท' },
  bus: { icon: '🚌', name: 'รถเมล์', color: '#e8590c', light: '#fff4e6', rule: 'จ่ายค่ารถ 5 บาท เพื่อไปร้านข้างหน้าที่ใกล้ที่สุดได้ทันที (ไม่ขึ้นก็ได้)', short: 'จ่าย 5 บาท ไปร้านถัดไป' },
  work: { icon: '🧹', name: 'ทำงานพิเศษ', color: '#0ca678', light: '#e6fcf5', rule: 'ช่วยงานในตลาด ได้ค่าจ้าง 15 บาท', short: 'ได้ค่าจ้าง 15 บาท' },
}

export interface BoardSpace {
  no: number
  kind: SpaceKind
  shop?: ShopId
}

const SEQUENCE: (SpaceKind | ShopId)[] = [
  'home', 'quest', 'market', 'luck', 'stationery', 'save', 'quest', 'snack', 'exchange', 'quest',
  'toy', 'luck', 'food', 'quest', 'bus', 'icecream', 'work', 'quest', 'luck', 'market',
  'save', 'quest', 'stationery', 'exchange', 'luck', 'snack', 'quest', 'toy', 'bus', 'quest',
  'food', 'luck', 'save', 'icecream', 'quest', 'exchange', 'luck', 'quest', 'luck', 'bank',
]

export const BOARD_SPACES: BoardSpace[] = SEQUENCE.map((k, i) =>
  BOARD_SHOPS.some((s) => s.id === k) ? { no: i + 1, kind: 'shop', shop: k as ShopId } : { no: i + 1, kind: k as SpaceKind },
)

export const SPACES_PER_ROW = 10

/** ตำแหน่งกลางช่อง บนกระดานขนาด 1400 × 990 (ถนนคดไปมา 4 แถว เริ่มซ้ายล่าง จบซ้ายบน) */
export function spaceCenter(index: number): { x: number; y: number } {
  const row = Math.floor(index / SPACES_PER_ROW)
  const col = index % SPACES_PER_ROW
  const x = 115 + (row % 2 === 0 ? col : SPACES_PER_ROW - 1 - col) * 130
  const y = 830 - row * 210
  return { x, y }
}

export const BOARD_W = 1400
export const BOARD_H = 990
/** ตำแหน่งรอยต่อของกระดานสองแผ่น */
export const BOARD_SEAM = 700

/* ------------------------------------------------------------------ */
/* เงินตั้งต้นและบัตรรายการซื้อของ                                        */
/* ------------------------------------------------------------------ */

/** เงินตั้งต้นของผู้เล่นแต่ละคน: [มูลค่า (สตางค์), จำนวน] */
export const START_MONEY: [number, number][] = [
  [B(50), 1],
  [B(20), 2],
  [B(5), 1],
  [B(1), 5],
]

export function startTotal(): number {
  return START_MONEY.reduce((s, [v, n]) => s + v * n, 0)
}

export interface ShoppingList {
  no: number
  title: string
  emoji: string
  lines: { item: string; qty: number }[]
}

export const SHOPPING_LISTS: ShoppingList[] = [
  { no: 1, title: 'ปิกนิกที่สวน', emoji: '🧺', lines: [{ item: 'banana', qty: 1 }, { item: 'bread', qty: 1 }, { item: 'juice', qty: 2 }] },
  { no: 2, title: 'เตรียมเปิดเทอม', emoji: '🎒', lines: [{ item: 'notebook', qty: 2 }, { item: 'pencil', qty: 2 }, { item: 'cookie', qty: 1 }] },
  { no: 3, title: 'ของขวัญวันเกิดเพื่อน', emoji: '🎂', lines: [{ item: 'teddy', qty: 1 }, { item: 'cup', qty: 1 }, { item: 'milk', qty: 1 }] },
  { no: 4, title: 'ทำอาหารกับแม่', emoji: '🍳', lines: [{ item: 'egg', qty: 4 }, { item: 'carrot', qty: 2 }, { item: 'milk', qty: 2 }] },
  { no: 5, title: 'วันกีฬาสี', emoji: '🏅', lines: [{ item: 'ball', qty: 1 }, { item: 'smoothie', qty: 2 }, { item: 'bread', qty: 1 }] },
  { no: 6, title: 'วาดภาพส่งคุณครู', emoji: '🎨', lines: [{ item: 'crayon', qty: 1 }, { item: 'eraser', qty: 1 }, { item: 'cone', qty: 2 }] },
  { no: 7, title: 'มื้อกลางวันกับครอบครัว', emoji: '🍽️', lines: [{ item: 'chicken', qty: 1 }, { item: 'shaved', qty: 2 }, { item: 'corn', qty: 2 }] },
  { no: 8, title: 'เที่ยวงานวัด', emoji: '🎡', lines: [{ item: 'kite', qty: 1 }, { item: 'candy', qty: 4 }, { item: 'noodle', qty: 1 }] },
]

export function listTotal(list: ShoppingList): number {
  return list.lines.reduce((s, l) => s + boardItem(l.item).item.price * l.qty, 0)
}

/* ------------------------------------------------------------------ */
/* การ์ดภารกิจคณิต (สร้างจากตัวเลขที่กำหนด ผลเหมือนเดิมทุกครั้งที่พิมพ์)       */
/* ------------------------------------------------------------------ */

export type QuestKind = 'count' | 'change' | 'add' | 'compare' | 'exchange' | 'muldiv' | 'dot' | 'ledger'

export interface QuestCard {
  no: number
  kind: QuestKind
  skill: Skill
  text: string
  answer: string
  /** รางวัลเมื่อตอบถูก (สตางค์) */
  reward: number
  /** ตัวเลขที่ใช้สร้างการ์ด (ชุดทดสอบคำนวณคำตอบใหม่จากค่านี้) */
  data: number[]
}

export const QUEST_KIND_INFO: Record<QuestKind, { name: string; skill: Skill; reward: number }> = {
  count: { name: 'นับเงิน', skill: 'count', reward: B(5) },
  exchange: { name: 'แลกเงิน', skill: 'exchange', reward: B(5) },
  compare: { name: 'เปรียบเทียบเงิน', skill: 'compare', reward: B(5) },
  dot: { name: 'เขียนจำนวนเงิน', skill: 'dot', reward: B(5) },
  add: { name: 'รวมเงิน', skill: 'addsub', reward: B(10) },
  change: { name: 'เงินทอน', skill: 'word', reward: B(10) },
  muldiv: { name: 'คูณ หาร เงิน', skill: 'muldiv', reward: B(10) },
  ledger: { name: 'รายรับรายจ่าย', skill: 'ledger', reward: B(10) },
}

/** ชื่อเงินจำลองตามมูลค่า (ตรงกับชุดเงินจำลองที่พิมพ์) */
export function pieceName(value: number): { name: string; unit: string } {
  if (value < 100) return { name: `เหรียญ ${value} สตางค์`, unit: 'เหรียญ' }
  if (value <= 1000) return { name: `เหรียญ ${value / 100} บาท`, unit: 'เหรียญ' }
  return { name: `ธนบัตร ${value / 100} บาท`, unit: 'ใบ' }
}

const COUNT_SETS: [number, number][][] = [
  [[B(50), 1], [B(10), 2], [50, 1]],
  [[B(100), 1], [B(20), 1], [B(5), 3]],
  [[B(20), 3], [B(2), 4], [B(1), 2]],
  [[B(50), 2], [B(10), 1], [50, 3]],
]

const CHANGE_SETS: [string, number][] = [
  ['corn', B(20)],
  ['kite', B(50)],
  ['milk', B(20)],
  ['chicken', B(100)],
]

const ADD_SETS: [string, string][] = [
  ['notebook', 'juice'],
  ['ball', 'cookie'],
  ['cone', 'bread'],
  ['crayon', 'banana'],
]

const COMPARE_SETS: [string, number, string, number][] = [
  ['ต้นกล้า', 85, 'ใบเตย', 58],
  ['ภูผา', 64, 'พลอย', 92],
  ['ก้อง', 120, 'ฟ้าใส', 75],
  ['นะโม', 49, 'ข้าวหอม', 103],
]

const EXCHANGE_SETS: [number, number][] = [
  [B(100), B(20)],
  [B(50), B(10)],
  [B(20), B(5)],
  [B(10), 50],
]

/** คูณ: [สินค้า, จำนวน] · หาร: [เงินรวม (บาท), จำนวนคน] (บาทล้วน ตัวคูณ/ตัวหารหลักเดียว ตามหลักสูตร ป.3) */
const MUL_SETS: [string, number][] = [
  ['pencil', 4],
  ['shaved', 3],
]
const DIV_SETS: [number, number][] = [
  [48, 4],
  [75, 5],
]

const DOT_SETS: [number, 'write' | 'read'][] = [
  [B(45, 50), 'write'],
  [B(128, 25), 'write'],
  [B(30, 75), 'read'],
  [B(9, 50), 'read'],
]

const LEDGER_SETS: [number, number, string][] = [
  [80, 20, 'notebook'],
  [50, 15, 'cup'],
  [65, 20, 'ball'],
  [100, 10, 'chicken'],
]

function qtyText(item: BoardItem, n: number): string {
  return `${item.name} ${n} ${item.unit}`
}

export function buildQuestCards(): QuestCard[] {
  const cards: Omit<QuestCard, 'no'>[] = []
  const add = (kind: QuestKind, text: string, answer: string, data: number[]) =>
    cards.push({ kind, skill: QUEST_KIND_INFO[kind].skill, text, answer, reward: QUEST_KIND_INFO[kind].reward, data })

  for (const set of COUNT_SETS) {
    const total = set.reduce((s, [v, n]) => s + v * n, 0)
    const parts = set.map(([v, n]) => `${pieceName(v).name} ${n} ${pieceName(v).unit}`).join(' ')
    add('count', `มี${parts} รวมเป็นเงินเท่าไร`, formatBS(total), set.flat())
  }
  for (const [id, paid] of CHANGE_SETS) {
    const { item } = boardItem(id)
    add('change', `ซื้อ${item.name} 1 ${item.unit} ราคา ${formatBS(item.price)} จ่ายด้วย${pieceName(paid).name} 1 ${pieceName(paid).unit} ได้เงินทอนเท่าไร`, formatBS(paid - item.price), [item.price, paid])
  }
  for (const [a, b] of ADD_SETS) {
    const x = boardItem(a).item
    const y = boardItem(b).item
    add('add', `ซื้อ${x.name} ราคา ${formatBS(x.price)} และ${y.name} ราคา ${formatBS(y.price)} รวมต้องจ่ายเท่าไร`, formatBS(x.price + y.price), [x.price, y.price])
  }
  for (const [n1, m1, n2, m2] of COMPARE_SETS) {
    const more = m1 > m2 ? n1 : n2
    add('compare', `${n1}มีเงิน ${m1} บาท ${n2}มีเงิน ${m2} บาท ใครมีเงินมากกว่า และมากกว่ากี่บาท`, `${more} มากกว่า ${Math.abs(m1 - m2)} บาท`, [m1, m2])
  }
  for (const [from, to] of EXCHANGE_SETS) {
    add('exchange', `${pieceName(from).name} 1 ${pieceName(from).unit} แลกเป็น${pieceName(to).name}ได้กี่${pieceName(to).unit}`, `${from / to} ${pieceName(to).unit}`, [from, to])
  }
  for (const [id, n] of MUL_SETS) {
    const { item } = boardItem(id)
    add('muldiv', `ซื้อ${qtyText(item, n)} ราคา${item.unit}ละ ${formatBS(item.price)} ต้องจ่ายเงินเท่าไร`, formatBS(item.price * n), [item.price, n])
  }
  for (const [total, n] of DIV_SETS) {
    add('muldiv', `แบ่งเงิน ${total} บาท ให้เพื่อน ${n} คนเท่า ๆ กัน ได้คนละกี่บาท`, `${total / n} บาท`, [B(total), n])
  }
  for (const [v, mode] of DOT_SETS) {
    if (mode === 'write') add('dot', `${formatBS(v)} เขียนแบบใช้จุดได้อย่างไร`, formatDot(v), [v, 0])
    else add('dot', `${formatDot(v)} คือกี่บาทกี่สตางค์`, formatBS(v), [v, 1])
  }
  for (const [start, income, id] of LEDGER_SETS) {
    const { item } = boardItem(id)
    add('ledger', `มีเงิน ${start} บาท ได้ค่าขนมเพิ่ม ${income} บาท แล้วซื้อ${item.name} ราคา ${formatBS(item.price)} เหลือเงินเท่าไร`, formatBS(B(start + income) - item.price), [B(start), B(income), item.price])
  }
  // สลับลำดับแบบคงที่ ให้การ์ดชนิดเดียวกันไม่เรียงติดกันเวลาพิมพ์
  const order: Omit<QuestCard, 'no'>[] = []
  const kinds = Array.from(new Set(cards.map((c) => c.kind)))
  for (let i = 0; order.length < cards.length; i += 1) {
    for (const k of kinds) {
      const c = cards.filter((x) => x.kind === k)[i]
      if (c) order.push(c)
    }
  }
  return order.map((c, i) => ({ ...c, no: i + 1 }))
}

/* ------------------------------------------------------------------ */
/* การ์ดโชคดี                                                            */
/* ------------------------------------------------------------------ */

export interface LuckCard {
  no: number
  icon: string
  text: string
  /** เงินที่ได้ (+) หรือจ่าย (−) เป็นสตางค์ */
  money: number
  /** ดาวน้ำใจ/นักออมที่ได้ */
  star: number
}

const LUCK: Omit<LuckCard, 'no'>[] = [
  { icon: '🍽️', text: 'ช่วยแม่ล้างจาน ได้ค่าขนม 10 บาท', money: B(10), star: 0 },
  { icon: '🏆', text: 'ได้รางวัลเรียนดี รับ 20 บาท', money: B(20), star: 0 },
  { icon: '🥬', text: 'ปลูกผักขาย ได้เงิน 15 บาท', money: B(15), star: 0 },
  { icon: '♻️', text: 'ขายขวดพลาสติกให้ธนาคารขยะ ได้ 12 บาท 50 สตางค์', money: B(12, 50), star: 0 },
  { icon: '👵', text: 'ยายให้เงิน 50 บาท แบ่งใส่ออมสินครึ่งหนึ่ง ได้ดาวนักออม 1 ดวง', money: B(50), star: 1 },
  { icon: '💧', text: 'ลืมกระติกน้ำ ต้องซื้อน้ำดื่ม จ่าย 7 บาท', money: -B(7), star: 0 },
  { icon: '🛺', text: 'นั่งรถสองแถวไปบ้านเพื่อน จ่ายค่ารถ 8 บาท', money: -B(8), star: 0 },
  { icon: '💡', text: 'ช่วยประหยัดไฟที่บ้าน แม่ให้รางวัล 5 บาท', money: B(5), star: 0 },
  { icon: '🤝', text: 'บริจาคช่วยผู้ประสบภัย 5 บาท ได้ดาวน้ำใจ 1 ดวง', money: -B(5), star: 1 },
  { icon: '✏️', text: 'ซื้อดินสอให้เพื่อนที่ลืมมา จ่าย 6 บาท ได้ดาวน้ำใจ 1 ดวง', money: -B(6), star: 1 },
  { icon: '🎲', text: 'คืนเงินที่เก็บได้ให้คุณครู ได้คำชม ทอยลูกเต๋าอีกครั้ง', money: 0, star: 1 },
  { icon: '🏃', text: 'รีบไปร้านขนมที่ใกล้ที่สุดข้างหน้า (เดินไปช่องนั้นได้เลย)', money: 0, star: 0 },
  { icon: '🔙', text: 'ลืมของไว้ที่ร้าน ถอยหลัง 2 ช่อง', money: 0, star: 0 },
  { icon: '🧮', text: 'นับเงินในมือให้นายธนาคารดู ถ้านับถูก ได้ 5 บาท', money: B(5), star: 0 },
  { icon: '🔄', text: 'แลกธนบัตร 20 บาท เป็นเหรียญ 5 บาท บอกให้ถูกว่าได้กี่เหรียญ (ตอบถูกได้ 2 บาท)', money: B(2), star: 0 },
  { icon: '🐷', text: 'ถ้ามีเงินออมอยู่แล้ว ธนาคารให้โบนัส 5 บาท (ถ้ายังไม่มี ฝากออมได้เลย)', money: B(5), star: 0 },
]

export const LUCK_CARDS: LuckCard[] = LUCK.map((c, i) => ({ ...c, no: i + 1 }))

/* ------------------------------------------------------------------ */
/* นับดาวตอนจบเกม                                                        */
/* ------------------------------------------------------------------ */

export const SCORE_RULES = [
  { icon: '🛒', text: 'ซื้อของในบัตรรายการได้ รายการละ 3 ดาว', max: 9 },
  { icon: '💰', text: 'เงินเหลือรวมเงินออม ทุก 10 บาท = 1 ดาว', max: null },
  { icon: '📒', text: 'สมุดบัญชีมียอดคงเหลือตรงกับเงินในมือ 3 ดาว', max: 3 },
  { icon: '🌟', text: 'ดาวน้ำใจและดาวนักออมจากการ์ดและช่องออมสิน', max: null },
  { icon: '🏁', text: 'ซื้อครบและถึงธนาคารเป็นคนแรก 3 ดาว', max: 3 },
] as const

/** ดาวจากเงินเหลือ (ปัดลง) */
export function moneyStars(leftSatang: number): number {
  return Math.floor(Math.max(0, leftSatang) / B(10))
}
