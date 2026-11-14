import type { Player } from './progress'

/**
 * ภาพปริศนา: ภาพพิกเซลน่ารัก 10×10 (วาดเอง)
 *
 * - ในเกม: ตอบถูกแต่ละข้อ ภาพค่อย ๆ เผยทีละส่วน ครบแล้วทายว่าเป็นภาพอะไร เก็บเข้าสมุดภาพ
 * - บนกระดาษ: ระบายสีตามคำตอบ แต่ละช่องมีโจทย์เงินสั้น ๆ คำตอบบอกว่าต้องระบายสีอะไร
 *
 * ภาพเก็บเป็นตัวอักษรแถวละ 10 ตัว: 0 = พื้นขาว (ไม่ต้องระบาย) 1–9 = สีตาม PALETTE
 */

export const SIZE = 10

export interface PaletteColor {
  /** ชื่อสีภาษาไทยสำหรับเด็ก */
  name: string
  hex: string
}

export const PALETTE: Record<number, PaletteColor> = {
  1: { name: 'ชมพู', hex: '#f6a5c0' },
  2: { name: 'ดำ', hex: '#2b2b2b' },
  3: { name: 'เหลือง', hex: '#f7d046' },
  4: { name: 'แดง', hex: '#e5484d' },
  5: { name: 'เขียว', hex: '#46a758' },
  6: { name: 'ฟ้า', hex: '#4aa3df' },
  7: { name: 'น้ำตาล', hex: '#a0663a' },
  8: { name: 'ส้ม', hex: '#f39237' },
}

export interface Picture {
  id: string
  /** ชื่อภาพ (คำตอบตอนทาย) */
  name: string
  emoji: string
  rows: string[]
}

export const PICTURES: Picture[] = [
  {
    id: 'piggy',
    name: 'ลูกหมูออมสิน',
    emoji: '🐷',
    rows: ['0000000000', '0110000110', '0111111110', '1112112111', '1111111111', '1114444111', '1114224111', '0111111110', '0110000110', '0000000000'],
  },
  {
    id: 'heart',
    name: 'หัวใจ',
    emoji: '❤️',
    rows: ['0000000000', '0044004400', '0414444440', '0444444440', '0442442440', '0044224400', '0004444000', '0000440000', '0000000000', '0000000000'],
  },
  {
    id: 'coin',
    name: 'เหรียญยิ้ม',
    emoji: '🪙',
    rows: ['0003333000', '0033333300', '0333333330', '3332332333', '3333333333', '3323333233', '0332222330', '0333333330', '0033333300', '0003333000'],
  },
  {
    id: 'icecream',
    name: 'ไอศกรีม',
    emoji: '🍦',
    rows: ['0001111000', '0011111100', '0111111110', '0112112110', '0111441110', '0888888880', '0088888800', '0008888000', '0000880000', '0000000000'],
  },
  {
    id: 'house',
    name: 'บ้าน',
    emoji: '🏠',
    rows: ['0000440000', '0004444000', '0044444400', '0444444440', '4444444444', '0333333330', '0363333630', '0333773330', '0333773330', '5555555555'],
  },
  {
    id: 'cat',
    name: 'แมวเหมียว',
    emoji: '🐱',
    rows: ['0800000080', '0880000880', '0888888880', '0828888280', '0888888880', '0888118880', '0888228880', '0088888800', '0008888000', '0000000000'],
  },
  {
    id: 'star',
    name: 'ดาว',
    emoji: '⭐',
    rows: ['0000330000', '0000330000', '0003333000', '3333333333', '0332332330', '0033333300', '0033333300', '0333003330', '0330000330', '0000000000'],
  },
  {
    id: 'frog',
    name: 'กบน้อย',
    emoji: '🐸',
    rows: ['0000000000', '0550000550', '5225005225', '5555555555', '5555555555', '5544444455', '0555555550', '0055555500', '0550000550', '0000000000'],
  },
]

export function picture(id: string): Picture | undefined {
  return PICTURES.find((p) => p.id === id)
}

/** สีของช่อง (0 = ขาว) */
export function cellColor(pic: Picture, i: number): number {
  return Number(pic.rows[Math.floor(i / SIZE)][i % SIZE])
}

/** ช่องที่ต้องระบายสี */
export function coloredCells(pic: Picture): number[] {
  const out: number[] = []
  for (let i = 0; i < SIZE * SIZE; i += 1) if (cellColor(pic, i) !== 0) out.push(i)
  return out
}

/** สีที่ใช้ในภาพ เรียงตามรหัส */
export function colorsUsed(pic: Picture): number[] {
  return Array.from(new Set(coloredCells(pic).map((i) => cellColor(pic, i)))).sort((a, b) => a - b)
}

type Rng = () => number

function makeRng(seed: number): Rng {
  let a = (seed * 2654435761) >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function shuffle<T>(r: Rng, xs: readonly T[]): T[] {
  const a = xs.slice()
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(r() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/* ------------------------------------------------------------------ */
/* ในเกม: ตอบถูกแล้วภาพเผยทีละส่วน                                        */
/* ------------------------------------------------------------------ */

/** จำนวนข้อต่อหนึ่งภาพ */
export const PUZZLE_QUESTIONS = 8

/**
 * ลำดับการเผยช่อง (คงที่ต่อภาพ ภาพเดิมเผยแบบเดิม)
 * เผยทุกช่องรวมพื้นขาว ไม่ใช่เฉพาะช่องสี ไม่อย่างนั้นเด็กเห็นรูปทรงของภาพตั้งแต่ยังไม่ได้ตอบ
 */
export function revealOrder(pic: Picture): number[] {
  const seed = Array.from(pic.id).reduce((h, ch) => (Math.imul(h, 31) + ch.charCodeAt(0)) >>> 0, 7)
  return shuffle(
    makeRng(seed),
    Array.from({ length: SIZE * SIZE }, (_, i) => i),
  )
}

/** ตอบถูกไปกี่ข้อแล้ว → เผยกี่ช่อง (ครบทุกข้อ = เผยครบทุกช่อง) */
export function revealedCount(_pic: Picture, correct: number, total = PUZZLE_QUESTIONS): number {
  const n = SIZE * SIZE
  if (correct <= 0) return 0
  if (correct >= total) return n
  return Math.ceil((n * correct) / total)
}

/** ตัวเลือกตอนทายภาพ: ชื่อจริง + ชื่อหลอก 2 ชื่อ (ลำดับคงที่ต่อภาพ) */
export function guessChoices(pic: Picture): string[] {
  const seed = pic.id.length * 97 + pic.rows.join('').length
  const r = makeRng(seed)
  const others = shuffle(
    r,
    PICTURES.filter((p) => p.id !== pic.id).map((p) => p.name),
  ).slice(0, 2)
  return shuffle(r, [pic.name, ...others])
}

/** ภาพถัดไปที่ยังไม่ได้สะสม (ครบแล้ววนกลับภาพแรก) */
export function nextPicture(p: Player): Picture {
  const have = new Set(p.puzzles ?? [])
  return PICTURES.find((x) => !have.has(x.id)) ?? PICTURES[0]
}

export function collectPicture(p: Player, id: string): Player {
  if (!picture(id) || (p.puzzles ?? []).includes(id)) return p
  return { ...p, puzzles: [...(p.puzzles ?? []), id] }
}

export function repairPuzzles(raw: unknown): string[] | undefined {
  if (!Array.isArray(raw)) return undefined
  const ids = raw.filter((x): x is string => typeof x === 'string' && !!picture(x))
  return ids.length > 0 ? Array.from(new Set(ids)) : undefined
}

/** รางวัลเมื่อเผยภาพครบ */
export const PUZZLE_COINS = 15

/* ------------------------------------------------------------------ */
/* บนกระดาษ: ระบายสีตามคำตอบ                                             */
/* ------------------------------------------------------------------ */

export interface ColourCell {
  color: number
  /** โจทย์ในช่อง (null = พื้นขาว ไม่ต้องระบาย) */
  expr: string | null
  /** คำตอบ (บาท) */
  answer: number | null
}

export interface ColourSheet {
  pic: Picture
  /** สี → คำตอบ (บาท) */
  legend: { color: number; answer: number }[]
  cells: ColourCell[]
}

export type ColourLevel = 1 | 2

/** สร้างโจทย์ที่ได้คำตอบ n บาท (จำนวนเต็ม) */
function exprFor(r: Rng, n: number, level: ColourLevel): string {
  const kinds = ['+', '−']
  const facs = [2, 3, 4, 5].filter((k) => n % k === 0 && n / k >= 2)
  if (level === 2 && facs.length > 0) kinds.push('×', '×')
  const k = kinds[Math.floor(r() * kinds.length)]
  if (k === '+') {
    const a = 1 + Math.floor(r() * (n - 1))
    return `${a} + ${n - a}`
  }
  if (k === '−') {
    const b = 1 + Math.floor(r() * (level === 1 ? 10 : 25))
    return `${n + b} − ${b}`
  }
  const f = facs[Math.floor(r() * facs.length)]
  return `${n / f} × ${f}`
}

/** ใบระบายสีของภาพหนึ่ง: แต่ละสีมีคำตอบไม่ซ้ำกัน (เป็นจำนวนเงินบาท) */
export function colourSheet(pic: Picture, seed: number, level: ColourLevel): ColourSheet {
  const r = makeRng(seed * 131 + pic.id.length)
  const pool = level === 1 ? [5, 8, 10, 12, 15, 20, 9, 7] : [12, 15, 18, 20, 24, 25, 30, 16]
  const answers = shuffle(r, pool)
  const legend = colorsUsed(pic).map((color, i) => ({ color, answer: answers[i] }))
  const byColor = new Map(legend.map((l) => [l.color, l.answer]))
  const cells: ColourCell[] = []
  for (let i = 0; i < SIZE * SIZE; i += 1) {
    const color = cellColor(pic, i)
    if (color === 0) {
      cells.push({ color, expr: null, answer: null })
      continue
    }
    const answer = byColor.get(color)!
    cells.push({ color, expr: exprFor(r, answer, level), answer })
  }
  return { pic, legend, cells }
}
