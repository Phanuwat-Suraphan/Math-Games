import type { DenomId } from '../engine/types'

/**
 * เงินไทย 11 ชนิดที่เรียนใน ป.3
 * value เป็นสตางค์ เช่น เหรียญ 1 บาท = 100
 *
 * image: ใส่รูปจริงไว้ที่ public/money-hero/money/<id>.png
 * ถ้ายังไม่มีไฟล์ เกมจะวาดเหรียญหรือธนบัตรด้วย SVG แทนอัตโนมัติ
 */
export interface Denomination {
  id: DenomId
  value: number
  kind: 'coin' | 'note'
  /** ชื่อเต็ม เช่น "เหรียญ 25 สตางค์" */
  name: string
  /** ตัวเลขบนเงิน */
  face: string
  /** หน่วยบนเงิน */
  unit: 'สตางค์' | 'บาท'
  /** สีหลักและสีขอบ */
  color: string
  edge: string
  ink: string
  /** ขนาดเหรียญ (มม. ของจริงโดยประมาณ) ใช้ย่อขยายภาพให้สัดส่วนใกล้ของจริง */
  size: number
  colorName: string
}

export const DENOMINATIONS: Denomination[] = [
  {
    id: 's25',
    value: 25,
    kind: 'coin',
    name: 'เหรียญ 25 สตางค์',
    face: '25',
    unit: 'สตางค์',
    color: '#e8b273',
    edge: '#b7793b',
    ink: '#6b3d12',
    size: 16,
    colorName: 'สีทองแดง',
  },
  {
    id: 's50',
    value: 50,
    kind: 'coin',
    name: 'เหรียญ 50 สตางค์',
    face: '50',
    unit: 'สตางค์',
    color: '#e9a96a',
    edge: '#a9652c',
    ink: '#5e3410',
    size: 18,
    colorName: 'สีทองแดง',
  },
  {
    id: 'b1',
    value: 100,
    kind: 'coin',
    name: 'เหรียญ 1 บาท',
    face: '1',
    unit: 'บาท',
    color: '#e6eaf0',
    edge: '#9aa4b2',
    ink: '#3b4554',
    size: 20,
    colorName: 'สีเงิน',
  },
  {
    id: 'b2',
    value: 200,
    kind: 'coin',
    name: 'เหรียญ 2 บาท',
    face: '2',
    unit: 'บาท',
    color: '#f6d365',
    edge: '#c99a1c',
    ink: '#6a4d00',
    size: 21.75,
    colorName: 'สีทอง',
  },
  {
    id: 'b5',
    value: 500,
    kind: 'coin',
    name: 'เหรียญ 5 บาท',
    face: '5',
    unit: 'บาท',
    color: '#e3e7ee',
    edge: '#c27a45',
    ink: '#3b4554',
    size: 24,
    colorName: 'สีเงินขอบทองแดง',
  },
  {
    id: 'b10',
    value: 1000,
    kind: 'coin',
    name: 'เหรียญ 10 บาท',
    face: '10',
    unit: 'บาท',
    color: '#f3c84b',
    edge: '#c3cad6',
    ink: '#6a4d00',
    size: 26,
    colorName: 'สีทองขอบเงิน',
  },
  {
    id: 'b20',
    value: 2000,
    kind: 'note',
    name: 'ธนบัตร 20 บาท',
    face: '20',
    unit: 'บาท',
    color: '#5cbf7a',
    edge: '#2f8a4c',
    ink: '#0f4a22',
    size: 0,
    colorName: 'สีเขียว',
  },
  {
    id: 'b50',
    value: 5000,
    kind: 'note',
    name: 'ธนบัตร 50 บาท',
    face: '50',
    unit: 'บาท',
    color: '#5aa3e8',
    edge: '#2a6fb5',
    ink: '#0c3766',
    size: 0,
    colorName: 'สีฟ้า',
  },
  {
    id: 'b100',
    value: 10000,
    kind: 'note',
    name: 'ธนบัตร 100 บาท',
    face: '100',
    unit: 'บาท',
    color: '#ef6b6b',
    edge: '#b93a3a',
    ink: '#5c1010',
    size: 0,
    colorName: 'สีแดง',
  },
  {
    id: 'b500',
    value: 50000,
    kind: 'note',
    name: 'ธนบัตร 500 บาท',
    face: '500',
    unit: 'บาท',
    color: '#a77be0',
    edge: '#6d43a8',
    ink: '#2e0f5c',
    size: 0,
    colorName: 'สีม่วง',
  },
  {
    id: 'b1000',
    value: 100000,
    kind: 'note',
    name: 'ธนบัตร 1,000 บาท',
    face: '1,000',
    unit: 'บาท',
    color: '#b9a48a',
    edge: '#7d6a52',
    ink: '#3a2c1b',
    size: 0,
    colorName: 'สีเทาน้ำตาล',
  },
]

const BY_ID = new Map<DenomId, Denomination>(DENOMINATIONS.map((d) => [d.id, d]))

export function denom(id: DenomId): Denomination {
  const found = BY_ID.get(id)
  if (!found) throw new Error(`ไม่รู้จักเงินชนิด ${id}`)
  return found
}

export const ALL_DENOM_IDS: DenomId[] = DENOMINATIONS.map((d) => d.id)
export const COIN_IDS: DenomId[] = DENOMINATIONS.filter((d) => d.kind === 'coin').map((d) => d.id)
export const NOTE_IDS: DenomId[] = DENOMINATIONS.filter((d) => d.kind === 'note').map((d) => d.id)

/** มูลค่ารวมของเงินหลายชิ้น (สตางค์) */
export function sumDenoms(ids: readonly DenomId[]): number {
  return ids.reduce((sum, id) => sum + denom(id).value, 0)
}

/** เรียงจากค่ามากไปน้อย ใช้จัดกองเงินให้นับง่าย */
export function sortDenomsDesc(ids: readonly DenomId[]): DenomId[] {
  return ids.slice().sort((a, b) => denom(b).value - denom(a).value)
}

/** นับจำนวนแต่ละชนิด {b100: 2, b5: 1} */
export function countDenoms(ids: readonly DenomId[]): Map<DenomId, number> {
  const counts = new Map<DenomId, number>()
  for (const id of sortDenomsDesc(ids)) counts.set(id, (counts.get(id) ?? 0) + 1)
  return counts
}

/** กุญแจของชุดเงิน ไม่สนลำดับ ใช้ตรวจว่า "แบบเดียวกัน" หรือไม่ */
export function comboKey(ids: readonly DenomId[]): string {
  return sortDenomsDesc(ids).join('+')
}

/**
 * แตกจำนวนเงินเป็นเงินชนิดที่อนุญาต
 * ใช้วิธีค้นหาย้อนกลับ จึงหาคำตอบเจอแม้ greedy จะพลาด
 * คืน null ถ้าทำไม่ได้
 */
export function decompose(
  target: number,
  allowed: readonly DenomId[],
  maxPieces = 30,
): DenomId[] | null {
  const ordered = sortDenomsDesc(Array.from(new Set(allowed)))
  const result: DenomId[] = []

  function search(remaining: number, start: number): boolean {
    if (remaining === 0) return true
    if (result.length >= maxPieces) return false
    for (let i = start; i < ordered.length; i += 1) {
      const value = denom(ordered[i]).value
      if (value > remaining) continue
      result.push(ordered[i])
      if (search(remaining - value, i)) return true
      result.pop()
    }
    return false
  }

  return search(target, 0) ? result : null
}

/** คำอธิบายกองเงิน "ธนบัตร 100 บาท 2 ใบ, เหรียญ 5 บาท 1 เหรียญ" */
export function describeDenoms(ids: readonly DenomId[]): string {
  const parts: string[] = []
  for (const [id, n] of countDenoms(ids)) {
    const d = denom(id)
    parts.push(`${d.name} ${n} ${d.kind === 'coin' ? 'เหรียญ' : 'ใบ'}`)
  }
  return parts.join(', ')
}

/** ลักษณะนาม */
export function classifier(id: DenomId): 'เหรียญ' | 'ใบ' {
  return denom(id).kind === 'coin' ? 'เหรียญ' : 'ใบ'
}
