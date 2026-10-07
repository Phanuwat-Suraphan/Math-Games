/**
 * กาดรักษ์โลก ป.3 : เปลี่ยนขยะให้เป็นเงิน เปลี่ยนเงินให้เป็นไอเดีย
 *
 * ชุดกิจกรรมเล่นจริงในห้องเรียน (ครูพิมพ์สื่อจากหน้า #/kad)
 * วงจร: เก็บขยะ → คัดแยก → ขาย → ได้เงิน → ซื้ออุปกรณ์ → สร้างสินค้า → ตั้งราคา → ขาย → ได้เงิน → ลงทุนรอบใหม่
 *
 * เงินทั้งหมดเก็บเป็น "สตางค์" จำนวนเต็ม เหมือนส่วนอื่นของ MONEY HERO
 */

export interface TrashType {
  id: string
  name: string
  /** หน่วยนับ */
  unit: string
  /** ราคารับซื้อเริ่มต้น (สตางค์ ต่อ 1 หน่วย) ครูแก้ได้ */
  price: number
  hint: string
}

export const TRASH: TrashType[] = [
  { id: 'bottle', name: 'ขวดพลาสติก', unit: 'ขวด', price: 100, hint: 'ล้างสะอาด แกะฉลาก' },
  { id: 'can', name: 'กระป๋อง', unit: 'ใบ', price: 200, hint: 'บีบให้แบน' },
  { id: 'box', name: 'กล่องกระดาษ', unit: 'กล่อง', price: 300, hint: 'พับให้แบน' },
  { id: 'paper', name: 'กระดาษใช้แล้ว', unit: 'ปึก', price: 200, hint: 'มัดเป็นปึก 10 แผ่น' },
  { id: 'cap', name: 'ฝาขวด', unit: 'ฝา', price: 50, hint: 'เก็บรวมใส่ถุง' },
  { id: 'jar', name: 'ขวดแชมพู/ภาชนะพลาสติก', unit: 'ชิ้น', price: 100, hint: 'ล้างสะอาด' },
]

export interface Product {
  id: string
  name: string
  material: string
  /** ราคาขายจำลอง (บาท) ต่ำสุด–สูงสุด */
  min: number
  max: number
}

export const PRODUCTS: Product[] = [
  { id: 'pot', name: 'กระถางต้นไม้', material: 'ขวดพลาสติก', min: 15, max: 25 },
  { id: 'vase', name: 'แจกันดอกไม้', material: 'ขวดพลาสติก', min: 10, max: 20 },
  { id: 'pencil', name: 'กระปุกใส่ดินสอ', material: 'กระป๋อง/ขวด', min: 10, max: 15 },
  { id: 'piggy', name: 'กระปุกออมสิน', material: 'ขวดพลาสติก', min: 15, max: 20 },
  { id: 'mobile', name: 'โมบายแขวน', material: 'ฝาขวด + เชือก', min: 10, max: 20 },
  { id: 'frame', name: 'กรอบรูป', material: 'กระดาษลัง', min: 15, max: 15 },
  { id: 'notebook', name: 'สมุดรีไซเคิล', material: 'กระดาษใช้แล้ว', min: 10, max: 15 },
  { id: 'bag', name: 'ถุงกระดาษ', material: 'กระดาษเหลือใช้', min: 5, max: 10 },
  { id: 'match', name: 'เกมจับคู่', material: 'กล่องกระดาษ', min: 10, max: 20 },
  { id: 'dice', name: 'เกมทอยลูกเต๋า', material: 'กล่องเหลือใช้', min: 15, max: 25 },
  { id: 'animal', name: 'งานประดิษฐ์สัตว์', material: 'กล่อง/กระดาษ', min: 10, max: 20 },
  { id: 'tag', name: 'ป้ายชื่อกระถาง', material: 'ไม้ไอศกรีม/กระดาษ', min: 5, max: 5 },
]

export function priceRange(p: Product): string {
  return p.min === p.max ? `${p.min} บาท` : `${p.min}–${p.max} บาท`
}

export interface Shop {
  id: string
  letter: string
  name: string
  thai: string
  icon: string
  /** สินค้าเด่นของร้าน */
  products: string[]
  color: string
  soft: string
}

export const SHOPS: Shop[] = [
  { id: 'garden', letter: 'A', name: 'Green Garden', thai: 'ร้านสวนสีเขียว', icon: '🌱', products: ['pot', 'tag', 'vase'], color: '#2f9e44', soft: '#e3f9e5' },
  { id: 'stationery', letter: 'B', name: 'Eco Stationery', thai: 'ร้านเครื่องเขียนรักษ์โลก', icon: '✏️', products: ['pencil', 'notebook'], color: '#1c7ed6', soft: '#e3f1ff' },
  { id: 'art', letter: 'C', name: 'Eco Art', thai: 'ร้านศิลปะรักษ์โลก', icon: '🎨', products: ['frame', 'mobile', 'animal'], color: '#e8590c', soft: '#fff0e3' },
  { id: 'game', letter: 'D', name: 'Recycle Toy', thai: 'ร้านของเล่นรีไซเคิล', icon: '🎲', products: ['dice', 'match'], color: '#7048e8', soft: '#efeaff' },
  { id: 'gift', letter: 'E', name: 'Green Gift', thai: 'ร้านของขวัญรักษ์โลก', icon: '🎁', products: ['bag', 'piggy'], color: '#d6336c', soft: '#ffe8f0' },
]

/** เงินจำลองของกาด (สตางค์) — ออกแบบใหม่ทั้งหมด ไม่เลียนแบบเงินไทยจริง */
export interface EcoMoney {
  value: number
  kind: 'coin' | 'note'
  label: string
  color: string
  dark: string
  motif: 'leaf' | 'recycle' | 'tree' | 'flower' | 'drop' | 'sun' | 'bee' | 'bird'
}

export const ECO_MONEY: EcoMoney[] = [
  { value: 50, kind: 'coin', label: '50 สตางค์', color: '#d9a066', dark: '#8a5a2b', motif: 'recycle' },
  { value: 100, kind: 'coin', label: '1 บาท', color: '#9be15d', dark: '#3f8a1f', motif: 'leaf' },
  { value: 200, kind: 'coin', label: '2 บาท', color: '#74c0fc', dark: '#1c6fb8', motif: 'drop' },
  { value: 500, kind: 'coin', label: '5 บาท', color: '#ffd43b', dark: '#b07d00', motif: 'sun' },
  { value: 1000, kind: 'coin', label: '10 บาท', color: '#f783ac', dark: '#a61e4d', motif: 'flower' },
  { value: 2000, kind: 'note', label: '20 บาท', color: '#63e6be', dark: '#087f5b', motif: 'tree' },
  { value: 5000, kind: 'note', label: '50 บาท', color: '#ffa94d', dark: '#c2410c', motif: 'bee' },
  { value: 10000, kind: 'note', label: '100 บาท', color: '#b197fc', dark: '#5f3dc4', motif: 'bird' },
]

export interface Mission {
  id: string
  icon: string
  name: string
  task: string
  color: string
}

export const MISSIONS: Mission[] = [
  { id: 'recycler', icon: '🌱', name: 'นักรีไซเคิล', task: 'คัดแยกขยะถูกประเภท และขายให้ธนาคารขยะได้ครบทุกชนิด', color: '#2f9e44' },
  { id: 'seller', icon: '💰', name: 'นักค้าขาย', task: 'ขายสินค้าของกลุ่มได้อย่างน้อย 3 ชิ้น', color: '#f08c00' },
  { id: 'quick', icon: '🧮', name: 'คิดเงินไว', task: 'รวมราคาสินค้าหลายชิ้นได้ถูกต้อง 5 ครั้ง', color: '#1c7ed6' },
  { id: 'open', icon: '🏪', name: 'เปิดร้าน', task: 'จัดร้าน ติดป้ายร้าน และติดราคาสินค้าทุกชิ้น', color: '#7048e8' },
  { id: 'change', icon: '💵', name: 'คำนวณเงินทอน', task: 'ทอนเงินลูกค้าได้ถูกต้อง 5 ครั้ง', color: '#0ca678' },
  { id: 'profit', icon: '📈', name: 'หากำไร', task: 'คำนวณ รายได้ − ต้นทุน = กำไร ของกลุ่มได้ถูกต้อง', color: '#e8590c' },
  { id: 'giveback', icon: '🌳', name: 'คืนกำไรให้โลก', task: 'นำกำไรบางส่วนไปลงทุนใหม่ ออม หรือบริจาคกองทุนต้นไม้', color: '#5c940d' },
]

/** วงจรกิจกรรม */
export const CYCLE: { icon: string; label: string }[] = [
  { icon: '🧺', label: 'เก็บขยะ' },
  { icon: '♻️', label: 'คัดแยก' },
  { icon: '🏦', label: 'ขาย' },
  { icon: '💰', label: 'ได้เงิน' },
  { icon: '🛒', label: 'ซื้ออุปกรณ์' },
  { icon: '✂️', label: 'สร้างสินค้า' },
  { icon: '🏷️', label: 'ตั้งราคา' },
  { icon: '🛍️', label: 'ขาย' },
  { icon: '🪙', label: 'ได้เงิน' },
  { icon: '🌱', label: 'ลงทุนรอบใหม่' },
]

/** เป้าหมายของทั้งห้อง: ยอดขายรวมถึงเท่าไรปลดล็อกอะไร (บาท) */
export const CLASS_GOALS: { at: number; icon: string; label: string }[] = [
  { at: 100, icon: '🌳', label: 'ปลดล็อกต้นไม้ 1 ต้น' },
  { at: 200, icon: '🪴', label: 'ปลดล็อกกระถางใหม่' },
  { at: 300, icon: '🏡', label: 'ปลดล็อกพื้นที่สวน' },
]

/** ทางเลือกใช้กำไร */
export const PROFIT_USES: { icon: string; label: string }[] = [
  { icon: '🌱', label: 'ลงทุนทำของเพิ่ม' },
  { icon: '🎁', label: 'ซื้อของให้กลุ่ม' },
  { icon: '💰', label: 'เก็บออม' },
  { icon: '❤️', label: 'บริจาคกองทุนต้นไม้' },
]

/* ------------------------------------------------------------------ */
/* คณิตศาสตร์ของกาด                                                    */
/* ------------------------------------------------------------------ */

/** ราคาขยะที่ครูแก้ไว้ (สตางค์) ไม่มีก็ใช้ค่าเริ่มต้น */
export type TrashPrices = Record<string, number>

export function defaultPrices(): TrashPrices {
  return Object.fromEntries(TRASH.map((t) => [t.id, t.price]))
}

/** ใบรับซื้อขยะ: จำนวนแต่ละชนิด → เงินแต่ละบรรทัดและรวม (สตางค์) */
export function trashPayout(counts: Record<string, number>, prices: TrashPrices = defaultPrices()): { lines: { id: string; count: number; each: number; total: number }[]; total: number } {
  const lines = TRASH.filter((t) => (counts[t.id] ?? 0) > 0).map((t) => {
    const count = Math.max(0, Math.floor(counts[t.id] ?? 0))
    const each = prices[t.id] ?? t.price
    return { id: t.id, count, each, total: count * each }
  })
  return { lines, total: lines.reduce((s, l) => s + l.total, 0) }
}

/** สรุปกำไร: รายได้ − ต้นทุน (ติดลบ = ขาดทุน) */
export function profitOf(income: number, cost: number): { profit: number; word: 'กำไร' | 'ขาดทุน' | 'เท่าทุน' } {
  const profit = income - cost
  return { profit, word: profit > 0 ? 'กำไร' : profit < 0 ? 'ขาดทุน' : 'เท่าทุน' }
}

/** เป้าหมายของห้องที่ปลดล็อกแล้ว และเป้าถัดไป */
export function classProgress(totalBaht: number): { unlocked: number; next: (typeof CLASS_GOALS)[number] | null; need: number } {
  const unlocked = CLASS_GOALS.filter((g) => totalBaht >= g.at).length
  const next = CLASS_GOALS[unlocked] ?? null
  return { unlocked, next, need: next ? next.at - totalBaht : 0 }
}

/* ------------------------------------------------------------------ */
/* แดชบอร์ดตลาดนัด (ครูจดเงินของแต่ละกลุ่มระหว่างเล่นจริง)              */
/* ------------------------------------------------------------------ */

/** ชนิดรายการ: ขายขยะ / ขายสินค้า = รายรับ · ซื้ออุปกรณ์ = รายจ่าย (ต้นทุน) · อื่น ๆ */
export type KadEntryKind = 'trash' | 'sale' | 'buy' | 'in' | 'out'

export const ENTRY_KINDS: { id: KadEntryKind; icon: string; label: string; sign: 1 | -1 }[] = [
  { id: 'trash', icon: '♻️', label: 'ขายขยะ', sign: 1 },
  { id: 'sale', icon: '🛍️', label: 'ขายสินค้า', sign: 1 },
  { id: 'buy', icon: '🛒', label: 'ซื้ออุปกรณ์', sign: -1 },
  { id: 'in', icon: '➕', label: 'รายรับอื่น', sign: 1 },
  { id: 'out', icon: '➖', label: 'รายจ่ายอื่น', sign: -1 },
]

export interface KadEntry {
  at: number
  kind: KadEntryKind
  /** สตางค์ (บวกเสมอ เครื่องหมายดูจากชนิด) */
  amount: number
  note?: string
}

export interface KadGroup {
  id: string
  name: string
  icon: string
  color: string
  /** เงินตั้งต้น (สตางค์) */
  start: number
  entries: KadEntry[]
}

export const START_MONEY = 10000

export function defaultGroups(): KadGroup[] {
  return SHOPS.map((s) => ({ id: s.id, name: s.name, icon: s.icon, color: s.color, start: START_MONEY, entries: [] }))
}

export function kindOf(id: KadEntryKind) {
  return ENTRY_KINDS.find((k) => k.id === id) ?? ENTRY_KINDS[0]
}

export interface GroupSummary {
  /** รายรับรวม / รายจ่ายรวม */
  income: number
  expense: number
  /** ขายขยะ / ขายสินค้า (รายได้) / ซื้ออุปกรณ์ (ต้นทุน) */
  trash: number
  sales: number
  cost: number
  /** กำไร = รายได้จากการขายสินค้า − ต้นทุน */
  profit: number
  /** เงินคงเหลือ = เงินตั้งต้น + รายรับ − รายจ่าย */
  balance: number
}

export function groupSummary(g: KadGroup): GroupSummary {
  const sum = (k: KadEntryKind) => g.entries.filter((e) => e.kind === k).reduce((s, e) => s + e.amount, 0)
  const trash = sum('trash')
  const sales = sum('sale')
  const cost = sum('buy')
  const income = trash + sales + sum('in')
  const expense = cost + sum('out')
  return { income, expense, trash, sales, cost, profit: sales - cost, balance: g.start + income - expense }
}

/** ยอดขายสินค้ารวมทั้งห้อง (สตางค์) ใช้ปลดล็อกต้นไม้ */
export function classSales(groups: readonly KadGroup[]): number {
  return groups.reduce((s, g) => s + groupSummary(g).sales, 0)
}

/** เงินทอน และทอนด้วยเงินจำลองของกาดให้น้อยชิ้นที่สุด */
export function changeFor(price: number, paid: number): { ok: boolean; change: number; short: number; pieces: EcoMoney[] } {
  if (paid < price) return { ok: false, change: 0, short: price - paid, pieces: [] }
  let left = paid - price
  const change = left
  const pieces: EcoMoney[] = []
  for (const m of [...ECO_MONEY].sort((a, b) => b.value - a.value)) {
    while (left >= m.value) {
      pieces.push(m)
      left -= m.value
    }
  }
  return { ok: left === 0, change, short: 0, pieces }
}

/** ซ่อมข้อมูลแดชบอร์ดที่โหลดมา (ข้อมูลเสียให้กลับเป็นค่าเริ่มต้น) */
export function parseGroups(text: string | null): KadGroup[] {
  try {
    const raw = JSON.parse(text ?? 'null') as KadGroup[] | null
    if (!Array.isArray(raw) || raw.length === 0) return defaultGroups()
    const list = raw
      .filter((g) => g && typeof g.id === 'string' && typeof g.name === 'string')
      .map((g) => ({
        id: g.id,
        name: g.name.slice(0, 30),
        icon: typeof g.icon === 'string' ? g.icon : '🏪',
        color: typeof g.color === 'string' ? g.color : '#2f9e44',
        start: Number.isFinite(g.start) && g.start >= 0 ? Math.round(g.start) : START_MONEY,
        entries: (Array.isArray(g.entries) ? g.entries : []).filter(
          (e) => e && ENTRY_KINDS.some((k) => k.id === e.kind) && Number.isFinite(e.amount) && e.amount > 0,
        ),
      }))
    return list.length > 0 ? list : defaultGroups()
  } catch {
    return defaultGroups()
  }
}
