/**
 * กฎของร้านค้า กระเป๋าของ และการสวมใส่
 *
 * ทุกฟังก์ชันเป็นฟังก์ชันบริสุทธิ์: รับ Player เข้ามา คืน Player ใหม่ออกไป
 * ไม่แก้ของเดิม และไม่แตะ localStorage เอง
 *
 * ทำไมต้องบริสุทธิ์: การซื้อของเกี่ยวกับเหรียญซึ่งเป็นทรัพย์สินของเด็ก
 * ถ้าตรรกะกระจายอยู่ในหน้าจอ จะมีทางที่หักเหรียญสองครั้ง
 * หรือหักแล้วของไม่เข้ากระเป๋า ซึ่งเด็กจะเสียของโดยไม่รู้ตัว
 * รวมไว้ที่เดียวแล้วทดสอบให้ครบจึงปลอดภัยกว่ามาก
 */

import { getItem } from '../data/items'
import type { EquipSlot, Item, TotalStats } from '../types/item'
import type { Player } from '../types/player'

/** ค่าที่ไม่มีของสวมเลย */
export const EMPTY_STATS: TotalStats = {
  attack: 0,
  defense: 0,
  maxHp: 0,
  expBonusPercent: 0,
  coinBonusPercent: 0,
}

/** ช่องสวมใส่ทั้งหมด เรียงตามลำดับที่แสดงบนหน้าจอ */
export const EQUIP_SLOTS: EquipSlot[] = ['weapon', 'armor', 'accessory', 'pet']

/** ของชิ้นนี้สวมได้ไหม (ของใช้แล้วหมดสวมไม่ได้) */
export function isEquippable(item: Item): item is Item & { kind: EquipSlot } {
  return item.kind !== 'consumable'
}

/** จำนวนของชิ้นนี้ที่มีอยู่ในกระเป๋า */
export function countOf(player: Player, itemId: string): number {
  return player.inventory?.[itemId] ?? 0
}

/** มีของชิ้นนี้อยู่ไหม (นับของที่สวมอยู่ด้วย) */
export function owns(player: Player, itemId: string): boolean {
  if (countOf(player, itemId) > 0) return true
  return Object.values(player.equipped ?? {}).includes(itemId)
}

/**
 * เหตุผลที่ซื้อไม่ได้ คืน null ถ้าซื้อได้
 * แยกออกมาเพื่อให้หน้าจอบอกเด็กได้ว่าติดตรงไหน ไม่ใช่แค่ปุ่มเทา ๆ กดไม่ได้
 */
export function buyBlockedReason(player: Player, itemId: string): string | null {
  const item = getItem(itemId)
  if (!item) return 'ไม่พบของชิ้นนี้'

  if (item.requiredLevel && player.level < item.requiredLevel) {
    return `ต้องถึงเลเวล ${item.requiredLevel} ก่อน`
  }
  if (player.coins < item.price) {
    return `ยังขาดอีก ${item.price - player.coins} เหรียญ`
  }
  // ของสวมใส่ซื้อซ้ำไม่ได้ เพราะสวมได้ทีละชิ้นอยู่แล้ว ซื้อซ้ำคือเสียเหรียญเปล่า
  if (item.kind !== 'consumable' && owns(player, itemId)) {
    return 'มีของชิ้นนี้แล้ว'
  }
  return null
}

export function canBuy(player: Player, itemId: string): boolean {
  return buyBlockedReason(player, itemId) === null
}

/**
 * ซื้อของหนึ่งชิ้น
 * คืน null ถ้าซื้อไม่ได้ เพื่อให้ผู้เรียกแยกกรณีสำเร็จกับล้มเหลวได้ชัด
 */
export function buyItem(player: Player, itemId: string): Player | null {
  const item = getItem(itemId)
  if (!item) return null
  if (!canBuy(player, itemId)) return null

  return {
    ...player,
    coins: player.coins - item.price,
    inventory: {
      ...player.inventory,
      [itemId]: countOf(player, itemId) + 1,
    },
    updatedAt: new Date().toISOString(),
  }
}

/**
 * สวมของหนึ่งชิ้น
 *
 * ของที่สวมอยู่เดิมในช่องเดียวกันจะถูกถอดกลับเข้ากระเป๋าอัตโนมัติ
 * ถ้าไม่คืนกลับ เด็กจะเสียของเก่าไปเฉย ๆ ตอนลองของใหม่
 */
export function equipItem(player: Player, itemId: string): Player | null {
  const item = getItem(itemId)
  if (!item || !isEquippable(item)) return null
  if (countOf(player, itemId) < 1) return null

  const slot = item.kind
  const previous = player.equipped?.[slot]

  const inventory = { ...player.inventory }
  inventory[itemId] = countOf(player, itemId) - 1
  if (inventory[itemId] <= 0) delete inventory[itemId]
  if (previous) inventory[previous] = (inventory[previous] ?? 0) + 1

  return {
    ...player,
    inventory,
    equipped: { ...player.equipped, [slot]: itemId },
    updatedAt: new Date().toISOString(),
  }
}

/** ถอดของในช่องหนึ่งกลับเข้ากระเป๋า */
export function unequipSlot(player: Player, slot: EquipSlot): Player | null {
  const itemId = player.equipped?.[slot]
  if (!itemId) return null

  const equipped = { ...player.equipped }
  delete equipped[slot]

  return {
    ...player,
    inventory: { ...player.inventory, [itemId]: countOf(player, itemId) + 1 },
    equipped,
    updatedAt: new Date().toISOString(),
  }
}

/**
 * ใช้ของที่ใช้แล้วหมด
 *
 * ถ้าพลังชีวิตเต็มอยู่แล้วจะไม่ให้ใช้ เพราะของจะหายไปโดยไม่ได้อะไรเลย
 * เด็กกดพลาดได้ง่ายมาก การกันไว้ตรงนี้ยุติธรรมกว่าปล่อยให้เสียของ
 */
export function useConsumable(
  player: Player,
  itemId: string,
  maxHp: number,
): Player | null {
  const item = getItem(itemId)
  if (!item || item.kind !== 'consumable') return null
  if (countOf(player, itemId) < 1) return null
  if (!item.healAmount) return null
  if (player.hp >= maxHp) return null

  const inventory = { ...player.inventory }
  inventory[itemId] = countOf(player, itemId) - 1
  if (inventory[itemId] <= 0) delete inventory[itemId]

  return {
    ...player,
    hp: Math.min(maxHp, player.hp + item.healAmount),
    inventory,
    updatedAt: new Date().toISOString(),
  }
}

/** รวมค่าจากของที่สวมอยู่ทั้งหมด */
export function totalStats(player: Player): TotalStats {
  const total = { ...EMPTY_STATS }

  for (const slot of EQUIP_SLOTS) {
    const itemId = player.equipped?.[slot]
    if (!itemId) continue
    const item = getItem(itemId)
    if (!item) continue

    total.attack += item.stats.attack ?? 0
    total.defense += item.stats.defense ?? 0
    total.maxHp += item.stats.maxHp ?? 0
    total.expBonusPercent += item.stats.expBonusPercent ?? 0
    total.coinBonusPercent += item.stats.coinBonusPercent ?? 0
  }

  return total
}

/**
 * พลังชีวิตสูงสุดจริง = ค่าพื้นฐาน + โบนัสจากเกราะ
 *
 * ต้องคำนวณทุกครั้งจากของที่สวมอยู่ ห้ามบวกเข้า maxHp ที่บันทึกไว้
 * ไม่งั้นตอนถอดเกราะออก maxHp จะไม่ลดกลับ และจะบวกซ้ำทุกครั้งที่สวมใหม่
 * จนพลังชีวิตพองขึ้นเรื่อย ๆ อย่างไม่มีที่สิ้นสุด
 */
export function effectiveMaxHp(player: Player): number {
  return player.maxHp + totalStats(player).maxHp
}

/**
 * พลังโจมตีจริงของผู้เล่น = พลังตามเลเวล + พลังจากอาวุธและสัตว์เลี้ยง
 * และพลังป้องกันจริง = ค่าพื้นฐาน + เกราะ
 *
 * รับค่าพื้นฐานเข้ามาเป็นพารามิเตอร์ ไม่ import จากโมดูลต่อสู้
 * เพื่อไม่ให้เกิดวงอ้อมระหว่างระบบของกับระบบต่อสู้
 */
export function attackWithGear(player: Player, baseAttack: number): number {
  return baseAttack + totalStats(player).attack
}

export function defenseWithGear(player: Player, baseDefense: number): number {
  return baseDefense + totalStats(player).defense
}

/** คูณโบนัสร้อยละกับรางวัลที่ได้ ปัดลงเสมอเพื่อไม่ให้ได้เกินจริง */
export function applyBonusPercent(amount: number, bonusPercent: number): number {
  if (amount <= 0) return amount
  return Math.floor(amount * (1 + Math.max(0, bonusPercent) / 100))
}
