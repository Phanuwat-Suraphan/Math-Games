import type { ShipLook } from '../solar/render'

/**
 * อู่ต่อยาน · สีของยานที่เด็กเลือกเอง
 *
 * ยานลำเดียวกับที่บินอยู่ในฉากสามมิติ เปลี่ยนสีแล้วเห็นผลทันที
 * เพื่อนร่วมทางที่นั่งไปด้วยอยู่ใน companions.ts
 * ของแต่งไม่มีผลกับคะแนนหรือความยาก เป็นความเป็นเจ้าของล้วน ๆ
 */

export type ShipColorId = 'red' | 'pink' | 'mint' | 'purple' | 'gold'

export interface ShipColor extends ShipLook {
  id: ShipColorId
  name: string
}

export const SHIP_COLORS: readonly ShipColor[] = [
  { id: 'red', name: 'แดงจรวดจริง', fin: '#ef4444', bodyTop: '#ffffff', bodyBottom: '#b8c4dc', window: '#38bdf8' },
  { id: 'pink', name: 'ชมพูสตรอว์เบอร์รี', fin: '#f472b6', bodyTop: '#fff1f7', bodyBottom: '#f9a8d4', window: '#a78bfa' },
  { id: 'mint', name: 'เขียวมินต์', fin: '#10b981', bodyTop: '#f0fdf4', bodyBottom: '#86efac', window: '#38bdf8' },
  { id: 'purple', name: 'ม่วงกาแล็กซี', fin: '#8b5cf6', bodyTop: '#f5f3ff', bodyBottom: '#c4b5fd', window: '#fcd34d' },
  { id: 'gold', name: 'ทองดาวฤกษ์', fin: '#f59e0b', bodyTop: '#fffbeb', bodyBottom: '#fcd34d', window: '#38bdf8' },
]

export const DEFAULT_COLOR: ShipColorId = 'red'

export function isShipColorId(value: unknown): value is ShipColorId {
  return typeof value === 'string' && SHIP_COLORS.some((color) => color.id === value)
}

export function shipColor(id: ShipColorId): ShipColor {
  return SHIP_COLORS.find((color) => color.id === id) ?? (SHIP_COLORS[0] as ShipColor)
}
