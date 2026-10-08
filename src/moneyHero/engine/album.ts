import type { DenomId } from './types'
import { classifier, denom, ALL_DENOM_IDS } from '../data/denominations'
import { shuffle } from '../utils/random'
import { earn } from './ledger'
import type { Player } from './progress'

/**
 * สมุดสะสมเงินไทย: การ์ดเงิน 11 ชนิด (เหรียญ 6 · ธนบัตร 5)
 * แต่ละการ์ดมีเรื่องน่ารู้ และคำถาม "ลองแลก" ตอบถูกได้สติกเกอร์ของการ์ดนั้น
 */

export interface AlbumCard {
  id: DenomId
  facts: string[]
  /** คำถามแลกเงิน: แลก from เป็น to ได้กี่เหรียญ/ใบ */
  swaps: [DenomId, DenomId][]
}

export const ALBUM: AlbumCard[] = [
  { id: 's25', facts: ['เหรียญที่เล็กที่สุด', '4 เหรียญรวมกันเป็น 1 บาท', 'มักได้รับตอนทอนเงินที่มีสตางค์'], swaps: [['b1', 's25'], ['s50', 's25']] },
  { id: 's50', facts: ['ใหญ่กว่าเหรียญ 25 สตางค์นิดหนึ่ง', '2 เหรียญรวมกันเป็น 1 บาท', '50 สตางค์ = ครึ่งบาท'], swaps: [['b1', 's50'], ['b2', 's50']] },
  { id: 'b1', facts: ['1 บาท = 100 สตางค์', 'ใช้บ่อยตอนซื้อขนมชิ้นเล็ก ๆ'], swaps: [['b2', 'b1'], ['b5', 'b1'], ['b10', 'b1']] },
  { id: 'b2', facts: ['เหรียญ 1 บาท 2 เหรียญ = เหรียญ 2 บาท 1 เหรียญ', 'ดูสีให้ดี จะได้ไม่สับสนกับเหรียญ 1 บาท'], swaps: [['b10', 'b2'], ['b20', 'b2']] },
  { id: 'b5', facts: ['เหรียญ 1 บาท 5 เหรียญ = เหรียญ 5 บาท 1 เหรียญ', 'ใหญ่กว่าเหรียญ 2 บาท'], swaps: [['b10', 'b5'], ['b20', 'b5'], ['b50', 'b5']] },
  { id: 'b10', facts: ['เหรียญที่ใหญ่ที่สุด มีสองสีในเหรียญเดียว', 'เหรียญ 5 บาท 2 เหรียญ = เหรียญ 10 บาท', 'เป็นเหรียญที่มีค่ามากที่สุด'], swaps: [['b20', 'b10'], ['b50', 'b10'], ['b100', 'b10']] },
  { id: 'b20', facts: ['เป็นธนบัตรที่มีค่าน้อยที่สุด', 'เหรียญ 10 บาท 2 เหรียญ = ธนบัตร 20 บาท 1 ใบ'], swaps: [['b20', 'b10'], ['b20', 'b5'], ['b100', 'b20']] },
  { id: 'b50', facts: ['20 + 20 + 10 = 50 บาท', 'ธนบัตร 50 บาท 2 ใบ = 100 บาท'], swaps: [['b50', 'b10'], ['b100', 'b50']] },
  { id: 'b100', facts: ['ธนบัตร 20 บาท 5 ใบ = 100 บาท', '100 บาท = 10,000 สตางค์'], swaps: [['b100', 'b20'], ['b100', 'b50'], ['b500', 'b100']] },
  { id: 'b500', facts: ['ธนบัตร 100 บาท 5 ใบ = 500 บาท', 'ใช้ตอนซื้อของที่ราคาสูง'], swaps: [['b500', 'b100'], ['b1000', 'b500']] },
  { id: 'b1000', facts: ['เป็นธนบัตรที่มีค่ามากที่สุด', 'ธนบัตร 500 บาท 2 ใบ = 1,000 บาท'], swaps: [['b1000', 'b500'], ['b1000', 'b100']] },
]

export function albumCard(id: DenomId): AlbumCard {
  return ALBUM.find((c) => c.id === id) ?? ALBUM[0]
}

export interface AlbumQuestion {
  text: string
  answer: number
  options: number[]
  /** คำใบ้เมื่อตอบผิด */
  hint: string
}

/** คำถามลองแลกของการ์ด (index เลือกคำถามข้อไหน ถ้าไม่ระบุสุ่ม) */
export function albumQuestion(id: DenomId, index?: number): AlbumQuestion {
  const card = albumCard(id)
  const [from, to] = card.swaps[index ?? Math.floor(Math.random() * card.swaps.length)]
  const a = denom(from)
  const b = denom(to)
  const answer = a.value / b.value
  const unit = classifier(to)
  const near = [answer - 1, answer + 1, answer * 2, answer + 2, Math.max(1, answer - 2), answer + 5]
  const wrong = Array.from(new Set(near.filter((n) => n > 0 && n !== answer))).slice(0, 2)
  return {
    text: `${a.name} 1 ${classifier(from)} แลกเป็น${b.name}ได้กี่${unit}?`,
    answer,
    options: shuffle([answer, ...wrong]),
    hint: `${a.name} มีค่า ${a.value >= 100 ? `${a.value / 100} บาท` : `${a.value} สตางค์`} · ${b.name} มีค่า ${b.value >= 100 ? `${b.value / 100} บาท` : `${b.value} สตางค์`} ลองนับเพิ่มทีละ ${b.face} ${b.unit}`,
  }
}

export const STICKER_COINS = 3

/** ติดสติกเกอร์ของการ์ด (ครั้งแรกได้เหรียญรางวัล ลงสมุดบัญชี) */
export function addSticker(p: Player, id: DenomId): Player {
  const album = p.album ?? []
  if (album.includes(id)) return p
  return earn({ ...p, album: [...album, id] }, STICKER_COINS, 'สติกเกอร์สมุดสะสมเงิน', '📒')
}

export function albumComplete(p: Player): boolean {
  return ALL_DENOM_IDS.every((id) => (p.album ?? []).includes(id))
}
