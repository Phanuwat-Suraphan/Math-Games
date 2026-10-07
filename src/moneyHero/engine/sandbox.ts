import type { DenomId } from './types'
import { ALL_DENOM_IDS, classifier, countDenoms, decompose, denom, sumDenoms } from '../data/denominations'

/**
 * โต๊ะนับเงิน (เล่นอิสระ): วางเงินแล้วดูยอดรวม แยกนับตามชนิด และจัดให้เหลือน้อยชิ้นที่สุด
 */

export const SANDBOX_MAX = 60

export interface SandboxGroup {
  id: DenomId
  count: number
  subtotal: number
  /** "ธนบัตร 100 บาท 2 ใบ" */
  label: string
}

export function summarize(ids: readonly DenomId[]): { total: number; groups: SandboxGroup[] } {
  const groups: SandboxGroup[] = []
  for (const [id, count] of countDenoms(ids)) {
    const d = denom(id)
    groups.push({ id, count, subtotal: d.value * count, label: `${d.name} ${count} ${classifier(id)}` })
  }
  return { total: sumDenoms(ids), groups }
}

/** แลกให้เหลือจำนวนชิ้นน้อยที่สุด (เงินไทยใช้วิธีหยิบค่ามากก่อนได้เสมอ) */
export function fewestPieces(total: number): DenomId[] {
  return decompose(total, ALL_DENOM_IDS, 200) ?? []
}
