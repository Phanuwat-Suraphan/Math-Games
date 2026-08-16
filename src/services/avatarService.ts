/**
 * ระบบซื้อและเปลี่ยนตัวละคร
 *
 * ทำไมการซื้อตัวละครถึงมีความหมาย ไม่ใช่แค่เปลี่ยนรูป
 * เพราะตัวละครแต่ละตัวมีสกิลวิเศษของตัวเองในสนามรบตัวเลข
 * (ดู src/survivor/ultimates.ts) การซื้อตัวใหม่จึงเท่ากับเปิดวิธีเล่นใหม่
 *
 * นี่เป็นหลักที่ได้จากการศึกษาเกมที่มีตัวละครให้ปลดล็อก
 * ตัวละครที่ต่างกันแค่รูปคือของสะสม ซึ่งเด็กเบื่อเร็วมาก
 * แต่ตัวละครที่เล่นต่างกันจริงคือเหตุผลที่จะกลับมาเล่นซ้ำ
 *
 * ของที่สวมอยู่ ดาวตีบวก และความคืบหน้าทั้งหมดใช้ร่วมกันทุกตัวละคร
 * เปลี่ยนตัวละครจึงไม่เสียอะไรเลย เด็กจะได้กล้าลองตัวใหม่
 * ถ้าเปลี่ยนแล้วต้องเริ่มสะสมใหม่ จะไม่มีใครกล้าเปลี่ยนหลังจากซื้อแล้ว
 */

import { AVATARS, DEFAULT_AVATAR_ID, getAvatar } from '../data/avatars'
import type { Avatar, Player } from '../types/player'

/** ตัวละครที่ผู้เล่นคนนี้ปลดล็อกแล้ว */
export function ownedAvatarIds(player: Player): string[] {
  const owned = player.ownedAvatars ?? []

  /*
   * ตัวที่ใช้อยู่ต้องนับว่าเป็นของตัวเองเสมอ
   * กันกรณีข้อมูลเก่าหรือข้อมูลเพี้ยนที่ทำให้เด็กใช้ตัวละครที่ระบบบอกว่าไม่มี
   * ซึ่งจะกลายเป็นสภาพที่ออกจากไม่ได้ คือใช้อยู่แต่เลือกซ้ำไม่ได้
   */
  const all = new Set([...owned, player.avatar])
  return AVATARS.filter((avatar) => all.has(avatar.id)).map((avatar) => avatar.id)
}

export function ownsAvatar(player: Player, avatarId: string): boolean {
  return ownedAvatarIds(player).includes(avatarId)
}

/**
 * เหตุผลที่ซื้อตัวละครนี้ไม่ได้ คืน null ถ้าซื้อได้
 * แยกออกมาเพื่อให้หน้าจอบอกเด็กได้ว่าติดตรงไหน
 */
export function buyAvatarBlockedReason(player: Player, avatarId: string): string | null {
  const avatar = AVATARS.find((entry) => entry.id === avatarId)
  if (!avatar) return 'ไม่พบตัวละครนี้'
  if (ownsAvatar(player, avatarId)) return 'มีตัวละครนี้แล้ว'

  if (avatar.requiredLevel && player.level < avatar.requiredLevel) {
    return `ต้องถึงเลเวล ${avatar.requiredLevel} ก่อน`
  }
  if (player.coins < avatar.price) {
    return `ยังขาดอีก ${avatar.price - player.coins} เหรียญ`
  }
  return null
}

export function canBuyAvatar(player: Player, avatarId: string): boolean {
  return buyAvatarBlockedReason(player, avatarId) === null
}

/**
 * ซื้อตัวละครหนึ่งตัว แล้วเปลี่ยนไปใช้ทันที
 *
 * เปลี่ยนให้เลยโดยไม่ต้องกดอีกครั้ง เพราะเด็กที่เพิ่งจ่ายเหรียญไป
 * ย่อมอยากลองตัวที่เพิ่งซื้อทันที การบังคับให้กดอีกทีเป็นขั้นตอนที่ไม่จำเป็น
 * และเสี่ยงที่เด็กจะไม่รู้ว่าต้องกดอะไรต่อ แล้วคิดว่าซื้อแล้วไม่ได้อะไร
 */
export function buyAvatar(player: Player, avatarId: string): Player | null {
  const avatar = AVATARS.find((entry) => entry.id === avatarId)
  if (!avatar) return null
  if (!canBuyAvatar(player, avatarId)) return null

  return {
    ...player,
    coins: player.coins - avatar.price,
    avatar: avatarId,
    ownedAvatars: [...ownedAvatarIds(player), avatarId],
    updatedAt: new Date().toISOString(),
  }
}

/** เปลี่ยนไปใช้ตัวละครที่มีอยู่แล้ว คืน null ถ้ายังไม่มีตัวนั้น */
export function selectAvatar(player: Player, avatarId: string): Player | null {
  if (!ownsAvatar(player, avatarId)) return null
  if (player.avatar === avatarId) return null

  return { ...player, avatar: avatarId, updatedAt: new Date().toISOString() }
}

/** ตัวละครที่ใช้อยู่ */
export function currentAvatar(player: Player): Avatar {
  return getAvatar(player.avatar || DEFAULT_AVATAR_ID)
}
