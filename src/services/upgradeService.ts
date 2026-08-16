/**
 * ระบบตีบวกของสวมใส่
 *
 * ปัญหาที่แก้: เดิมของทุกชิ้นมีค่าตายตัว พอซื้อของระดับถัดไปได้
 * ของชิ้นเก่ากลายเป็นขยะทันที เหรียญที่ลงไปกับมันสูญเปล่าทั้งหมด
 * และเมื่อซื้อของครบทุกชิ้นแล้ว เหรียญก็ไม่มีที่ใช้อีกเลย
 * ซึ่งย้อนกลับไปเป็นปัญหาเดิมที่ระบบร้านค้าตั้งใจแก้ตั้งแต่แรก
 *
 * ตอนนี้ของทุกชิ้นตีบวกได้ถึงห้าดาว เหรียญจึงมีที่ใช้เสมอ
 * และของชิ้นแรกที่เด็กซื้อยังใช้ได้ยาว ไม่ใช่ของที่ต้องทิ้ง
 *
 * หลักการที่ยึด (จากการศึกษาเกมที่ทำระบบนี้ได้ดี)
 *
 * 1. ไม่มีการสุ่ม ตีบวกแล้วขึ้นแน่นอน
 *    เกมหลายเกมให้ตีบวกแล้วมีโอกาสล้มเหลว ซึ่งสร้างความตื่นเต้นกับผู้ใหญ่
 *    แต่กับเด็กมันคือการเสียเหรียญที่หามาด้วยการตอบโจทย์ถูกไปเปล่า ๆ
 *    ซึ่งสอนผิดเรื่องโดยตรง คือสอนว่าความพยายามไม่ได้ผลตอบแทนที่แน่นอน
 *
 * 2. ราคาขึ้นเร็วกว่าค่าที่ได้
 *    ทำให้การกระจายตีบวกหลายชิ้นคุ้มกว่าการทุ่มชิ้นเดียวจนสุด
 *    เด็กจึงได้ฝึกคิดเรื่องการจัดสรรทรัพยากร ซึ่งเป็นคณิตศาสตร์ในตัวมันเอง
 *
 * 3. บอกราคาและผลที่จะได้ล่วงหน้าเสมอ ไม่มีอะไรซ่อน
 */

import { getItem } from '../data/items'
import type { Item, ItemStats } from '../types/item'
import type { Player } from '../types/player'

/** ดาวสูงสุดที่ตีบวกได้ */
export const MAX_STARS = 5

/** ค่าที่เพิ่มขึ้นต่อหนึ่งดาว คิดเป็นสัดส่วนของค่าพื้นฐาน */
const STAT_PER_STAR = 0.35

/** ดาวของของชิ้นหนึ่ง */
export function starsOf(player: Player, itemId: string): number {
  const stars = player.upgrades?.[itemId] ?? 0
  return Math.max(0, Math.min(MAX_STARS, Math.floor(stars)))
}

/**
 * ค่าของของชิ้นหนึ่งเมื่อนับดาวแล้ว
 *
 * ปัดขึ้นเสมอสำหรับค่าที่ไม่เป็นศูนย์
 * เพราะของราคาถูกที่มีค่าพื้นฐานแค่ 2 ถ้าปัดลงจะไม่ขึ้นเลยในดาวแรก ๆ
 * แล้วเด็กจะรู้สึกว่าจ่ายเหรียญไปแล้วไม่มีอะไรเกิดขึ้น
 */
export function statsWithStars(item: Item, stars: number): ItemStats {
  if (stars <= 0) return item.stats

  const scale = 1 + STAT_PER_STAR * stars
  const grow = (value: number | undefined): number | undefined => {
    if (!value) return value
    return Math.ceil(value * scale)
  }

  return {
    attack: grow(item.stats.attack),
    defense: grow(item.stats.defense),
    maxHp: grow(item.stats.maxHp),
    expBonusPercent: grow(item.stats.expBonusPercent),
    coinBonusPercent: grow(item.stats.coinBonusPercent),
  }
}

/**
 * ราคาตีบวกจากดาวปัจจุบันไปอีกหนึ่งดาว
 *
 * คืน null ถ้าตีบวกต่อไม่ได้แล้ว
 * ผูกกับราคาของชิ้นนั้นโดยตรง ของแรงจึงตีบวกแพงกว่าของอ่อนเสมอ
 * ถ้าใช้ราคาคงที่ทุกชิ้น การตีบวกของถูกจะคุ้มเกินไปจนไม่มีใครซื้อของแพง
 */
export function upgradeCost(itemId: string, stars: number): number | null {
  const item = getItem(itemId)
  if (!item) return null
  if (stars >= MAX_STARS) return null

  return Math.round(item.price * 0.55 * Math.pow(1.75, stars))
}

/**
 * เหตุผลที่ตีบวกไม่ได้ คืน null ถ้าตีบวกได้
 * แยกออกมาเพื่อให้หน้าจอบอกเด็กได้ว่าติดตรงไหน ไม่ใช่แค่ปุ่มเทา ๆ
 */
export function upgradeBlockedReason(player: Player, itemId: string): string | null {
  const item = getItem(itemId)
  if (!item) return 'ไม่พบของชิ้นนี้'
  if (item.kind === 'consumable') return 'ของใช้แล้วหมดตีบวกไม่ได้'

  const stars = starsOf(player, itemId)
  if (stars >= MAX_STARS) return 'ตีบวกสุดแล้ว'

  // ต้องมีของอยู่จริง ไม่ว่าจะสวมอยู่หรืออยู่ในกระเป๋า
  const inBag = (player.inventory?.[itemId] ?? 0) > 0
  const worn = Object.values(player.equipped ?? {}).includes(itemId)
  if (!inBag && !worn) return 'ต้องมีของชิ้นนี้ก่อน'

  const cost = upgradeCost(itemId, stars)
  if (cost === null) return 'ตีบวกสุดแล้ว'
  if (player.coins < cost) return `ยังขาดอีก ${cost - player.coins} เหรียญ`

  return null
}

export function canUpgrade(player: Player, itemId: string): boolean {
  return upgradeBlockedReason(player, itemId) === null
}

/**
 * ตีบวกหนึ่งดาว
 * คืน null ถ้าทำไม่ได้ เพื่อให้ผู้เรียกแยกกรณีสำเร็จกับล้มเหลวได้ชัด
 */
export function upgradeItem(player: Player, itemId: string): Player | null {
  if (!canUpgrade(player, itemId)) return null

  const stars = starsOf(player, itemId)
  const cost = upgradeCost(itemId, stars)
  if (cost === null) return null

  return {
    ...player,
    coins: player.coins - cost,
    upgrades: { ...player.upgrades, [itemId]: stars + 1 },
    updatedAt: new Date().toISOString(),
  }
}
