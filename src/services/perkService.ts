/**
 * ระบบซื้อพลังถาวร
 *
 * แยกจาก inventoryService เพราะเป็นคนละเรื่องกันโดยสิ้นเชิง
 * ของสวมใส่มีจำนวนชิ้น สวมได้ ถอดได้ และมีช่องจำกัด
 * ส่วนพลังถาวรซื้อแล้วติดตัวตลอดไป ไม่มีการถอดและไม่มีช่อง
 * การยัดสองเรื่องนี้ไว้ในบริการเดียวกันจะทำให้ทุกฟังก์ชันต้องเช็คว่า
 * ตอนนี้กำลังพูดถึงของแบบไหน ซึ่งเป็นที่มาของความผิดพลาดที่หายาก
 */

import { PERKS, getPerk, perkCost } from '../data/perks'
import type { Player } from '../types/player'

/** ชั้นของพลังถาวรตัวหนึ่ง */
export function perkLevel(player: Player, perkId: string): number {
  const perk = getPerk(perkId)
  if (!perk) return 0

  const level = player.perks?.[perkId] ?? 0
  return Math.max(0, Math.min(perk.maxLevel, Math.floor(level)))
}

/** ชั้นของทุกตัว ใช้ส่งเข้าเครื่องยนต์เกม */
export function allPerkLevels(player: Player): Record<string, number> {
  const levels: Record<string, number> = {}
  for (const perk of PERKS) {
    const level = perkLevel(player, perk.id)
    if (level > 0) levels[perk.id] = level
  }
  return levels
}

/**
 * เหตุผลที่ซื้อไม่ได้ คืน null ถ้าซื้อได้
 * แยกออกมาเพื่อให้หน้าจอบอกเด็กได้ว่าติดตรงไหน ไม่ใช่แค่ปุ่มเทา ๆ
 */
export function perkBlockedReason(player: Player, perkId: string): string | null {
  const perk = getPerk(perkId)
  if (!perk) return 'ไม่พบพลังนี้'

  const level = perkLevel(player, perkId)
  if (level >= perk.maxLevel) return 'เต็มแล้ว'

  const cost = perkCost(perkId, level)
  if (cost === null) return 'เต็มแล้ว'
  if (player.coins < cost) return `ยังขาดอีก ${cost - player.coins} เหรียญ`

  return null
}

export function canBuyPerk(player: Player, perkId: string): boolean {
  return perkBlockedReason(player, perkId) === null
}

/**
 * ซื้อพลังถาวรหนึ่งชั้น
 * คืน null ถ้าซื้อไม่ได้ เพื่อให้ผู้เรียกแยกกรณีสำเร็จกับล้มเหลวได้ชัด
 */
export function buyPerk(player: Player, perkId: string): Player | null {
  if (!canBuyPerk(player, perkId)) return null

  const level = perkLevel(player, perkId)
  const cost = perkCost(perkId, level)
  if (cost === null) return null

  return {
    ...player,
    coins: player.coins - cost,
    perks: { ...player.perks, [perkId]: level + 1 },
    updatedAt: new Date().toISOString(),
  }
}

/** ลงทุนไปกับพลังถาวรทั้งหมดกี่เหรียญแล้ว ใช้แสดงความคืบหน้า */
export function totalInvested(player: Player): number {
  let total = 0
  for (const perk of PERKS) {
    const level = perkLevel(player, perk.id)
    for (let step = 0; step < level; step += 1) {
      total += perkCost(perk.id, step) ?? 0
    }
  }
  return total
}
