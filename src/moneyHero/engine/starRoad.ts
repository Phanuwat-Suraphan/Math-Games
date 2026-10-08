import { shopItem } from '../data/shop'
import { earn } from './ledger'
import { totalStars, type Player } from './progress'
import { stageStars } from './stages'

/**
 * ถนนดาว: ดาวทั้งหมด (ด่านหลัก + ด่านย่อย) พาเดินไปเปิดหีบสมบัติ
 * ด่านหลัก 13 ด่าน × 3 ดาว = 39 · ด่านย่อย 26 ด่าน × 3 ดาว = 78 · รวม 117 ดาว
 * หีบให้เหรียญ บางหีบมีของแต่งตัวหรือสัตว์เลี้ยงฟรี (ถ้ามีของชิ้นนั้นแล้ว ได้เหรียญแทนครึ่งราคา)
 */

export const MAX_STARS = 117

export interface Chest {
  /** ดาวที่ต้องมีจึงเปิดได้ */
  at: number
  coins: number
  /** ของในร้านที่ได้ฟรี */
  gift?: string
}

export const CHESTS: Chest[] = [
  { at: 3, coins: 15 },
  { at: 8, coins: 20, gift: 'face-round' },
  { at: 15, coins: 30 },
  { at: 24, coins: 30, gift: 'hat-party' },
  { at: 36, coins: 40 },
  { at: 50, coins: 50, gift: 'pet-chick' },
  { at: 66, coins: 60 },
  { at: 84, coins: 70, gift: 'face-star' },
  { at: 100, coins: 80 },
  { at: 117, coins: 100, gift: 'hat-wizard' },
]

/** ดาวทั้งหมดของผู้เล่น */
export function allStars(p: Player): number {
  return totalStars(p) + stageStars(p)
}

export type ChestState = 'opened' | 'ready' | 'locked'

export function chestState(p: Player, chest: Chest): ChestState {
  if ((p.chests ?? []).includes(chest.at)) return 'opened'
  return allStars(p) >= chest.at ? 'ready' : 'locked'
}

export function readyChests(p: Player): Chest[] {
  return CHESTS.filter((c) => chestState(p, c) === 'ready')
}

/** หีบถัดไปที่ยังไม่ถึง และต้องเก็บดาวอีกกี่ดวง */
export function nextChest(p: Player): { chest: Chest; need: number } | null {
  const stars = allStars(p)
  const chest = CHESTS.find((c) => c.at > stars)
  return chest ? { chest, need: chest.at - stars } : null
}

export interface ChestReward {
  coins: number
  /** ของที่ได้จริง (ไม่มีถ้ามีอยู่แล้ว) */
  item?: string
  /** เหรียญชดเชยเมื่อมีของชิ้นนั้นแล้ว */
  bonus: number
}

export function chestReward(p: Player, chest: Chest): ChestReward {
  const gift = shopItem(chest.gift)
  if (!gift) return { coins: chest.coins, bonus: 0 }
  if (p.owned.includes(gift.id)) return { coins: chest.coins, bonus: Math.round(gift.price / 2) }
  return { coins: chest.coins, item: gift.id, bonus: 0 }
}

/** เปิดหีบ: ได้เหรียญ (ลงสมุดบัญชี) และของฟรี · หีบที่ยังล็อกหรือเปิดแล้วไม่เปลี่ยนอะไร */
export function openChest(p: Player, at: number): { player: Player; reward: ChestReward } | null {
  const chest = CHESTS.find((c) => c.at === at)
  if (!chest || chestState(p, chest) !== 'ready') return null
  const reward = chestReward(p, chest)
  let next = earn(p, reward.coins + reward.bonus, `หีบสมบัติดาว ${chest.at} ดวง`, '🧰')
  next = { ...next, chests: [...(p.chests ?? []), chest.at] }
  if (reward.item) {
    const item = shopItem(reward.item)!
    next = {
      ...next,
      owned: [...next.owned, item.id],
      // ของที่ได้ฟรีสวมให้เลยถ้าช่องนั้นยังว่าง
      wear: next.wear[item.slot] ? next.wear : { ...next.wear, [item.slot]: item.id },
      // ได้ของที่ตั้งเป้าออมไว้ ไม่ต้องออมต่อ
      goal: next.goal === item.id ? undefined : next.goal,
    }
  }
  return { player: next, reward }
}
