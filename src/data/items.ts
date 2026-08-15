/**
 * คลังของทั้งหมดในเกม
 *
 * หลักการตั้งราคา: ของชิ้นแรกของแต่ละช่องต้องซื้อได้ภายในไม่กี่ด่าน
 * เด็กจะได้เห็นว่าเหรียญมีประโยชน์จริงตั้งแต่เนิ่น ๆ
 * ส่วนของระดับตำนานตั้งใจให้แพงมาก เป็นเป้าหมายระยะยาว
 *
 * ของทุกชิ้นเพิ่มค่าอย่างเดียว ไม่มีชิ้นไหนลดค่าอะไรลง
 * เพราะถ้ามีของที่ "ซื้อแล้วแย่ลง" เด็กจะกลัวการทดลอง
 * ซึ่งตรงข้ามกับสิ่งที่อยากให้เกิดในเกมเรียนรู้
 */

import type { Item } from '../types/item'

export const ITEMS: Item[] = [
  // ---------- อาวุธ เพิ่มพลังโจมตีตอนต่อสู้ ----------
  {
    id: 'w-pencil',
    name: 'ดินสอนักคำนวณ',
    description: 'ดินสอธรรมดาที่ถูกลับจนแหลม ใช้ชี้คำตอบได้แม่นขึ้น',
    kind: 'weapon',
    rarity: 'common',
    price: 60,
    stats: { attack: 3 },
    art: 'pencil',
  },
  {
    id: 'w-ruler',
    name: 'ไม้บรรทัดเหล็ก',
    description: 'ตีเส้นตรงได้ และตีมอนสเตอร์ได้ด้วย',
    kind: 'weapon',
    rarity: 'rare',
    price: 220,
    stats: { attack: 7 },
    art: 'ruler',
    requiredLevel: 3,
  },
  {
    id: 'w-compass',
    name: 'วงเวียนต้องมนต์',
    description: 'วาดวงกลมสมบูรณ์แบบ และปล่อยคลื่นพลังเป็นวงออกไป',
    kind: 'weapon',
    rarity: 'epic',
    price: 620,
    stats: { attack: 13, expBonusPercent: 5 },
    art: 'compass',
    requiredLevel: 6,
  },
  {
    id: 'w-infinity',
    name: 'ปากกาอนันต์',
    description: 'เขียนตัวเลขได้ไม่มีวันหมด พลังของมันก็เช่นกัน',
    kind: 'weapon',
    rarity: 'legendary',
    price: 1500,
    stats: { attack: 22, expBonusPercent: 10 },
    art: 'infinityPen',
    requiredLevel: 10,
  },

  // ---------- เกราะ ลดความเสียหายและเพิ่มพลังชีวิต ----------
  {
    id: 'a-notebook',
    name: 'สมุดกันกระแทก',
    description: 'สมุดหนาเล่มโต กันการโจมตีได้ดีอย่างน่าประหลาด',
    kind: 'armor',
    rarity: 'common',
    price: 70,
    stats: { defense: 2, maxHp: 10 },
    art: 'notebook',
  },
  {
    id: 'a-abacus',
    name: 'เกราะลูกคิด',
    description: 'ลูกคิดโบราณร้อยเป็นแผง เลื่อนรับแรงกระแทกได้',
    kind: 'armor',
    rarity: 'rare',
    price: 260,
    stats: { defense: 5, maxHp: 25 },
    art: 'abacus',
    requiredLevel: 4,
  },
  {
    id: 'a-crystal',
    name: 'เกราะคริสตัลความรู้',
    description: 'เศษคริสตัลที่หายไป เปล่งแสงป้องกันรอบตัว',
    kind: 'armor',
    rarity: 'epic',
    price: 700,
    stats: { defense: 9, maxHp: 45 },
    art: 'crystalArmor',
    requiredLevel: 7,
  },

  // ---------- เครื่องประดับ เน้นโบนัสรางวัล ----------
  {
    id: 'c-clover',
    name: 'จี้สามใบเถา',
    description: 'พกไว้แล้วเก็บเหรียญได้มากขึ้นนิดหน่อย',
    kind: 'accessory',
    rarity: 'common',
    price: 90,
    stats: { coinBonusPercent: 10 },
    art: 'clover',
  },
  {
    id: 'c-hourglass',
    name: 'นาฬิกาทรายนักคิด',
    description: 'ทรายไหลช้าลง ทำให้มีเวลาคิดและได้ EXP มากขึ้น',
    kind: 'accessory',
    rarity: 'rare',
    price: 300,
    stats: { expBonusPercent: 15 },
    art: 'hourglass',
    requiredLevel: 5,
  },
  {
    id: 'c-goldstar',
    name: 'ดาวทองของครู',
    description: 'ดาวที่ครูให้เมื่อทำได้ดีมาก เพิ่มทั้ง EXP และเหรียญ',
    kind: 'accessory',
    rarity: 'epic',
    price: 850,
    stats: { expBonusPercent: 15, coinBonusPercent: 20 },
    art: 'goldStar',
    requiredLevel: 8,
  },

  // ---------- สัตว์เลี้ยง เดินตามและช่วยสู้ ----------
  {
    id: 'p-slime',
    name: 'สไลม์น้อย',
    description: 'สไลม์ที่เชื่องแล้ว ชอบกลืนตัวเลขที่ตอบถูก',
    kind: 'pet',
    rarity: 'common',
    price: 150,
    stats: { attack: 2, coinBonusPercent: 5 },
    art: 'petSlime',
    requiredLevel: 2,
  },
  {
    id: 'p-owl',
    name: 'นกฮูกนักคิด',
    description: 'จ้องโจทย์เงียบ ๆ แล้วส่งเสียงเมื่อเห็นทางแก้',
    kind: 'pet',
    rarity: 'rare',
    price: 420,
    stats: { attack: 4, expBonusPercent: 10 },
    art: 'petOwl',
    requiredLevel: 5,
  },
  {
    id: 'p-dragon',
    name: 'ลูกมังกรเลข',
    description: 'ลูกมังกรที่ฟักจากไข่ในถ้ำ พ่นไฟเป็นรูปตัวเลข',
    kind: 'pet',
    rarity: 'legendary',
    price: 1800,
    stats: { attack: 10, maxHp: 30, expBonusPercent: 10, coinBonusPercent: 10 },
    art: 'petDragon',
    requiredLevel: 12,
  },

  // ---------- ของใช้แล้วหมด ----------
  {
    id: 'u-potion',
    name: 'ยาฟื้นพลังเล็ก',
    description: 'ดื่มแล้วฟื้นพลังชีวิต 30 หน่วย ใช้ได้ครั้งเดียว',
    kind: 'consumable',
    rarity: 'common',
    price: 40,
    stats: {},
    art: 'potion',
    healAmount: 30,
  },
  {
    id: 'u-bigpotion',
    name: 'ยาฟื้นพลังใหญ่',
    description: 'ฟื้นพลังชีวิต 80 หน่วย เก็บไว้ใช้ตอนสู้บอส',
    kind: 'consumable',
    rarity: 'rare',
    price: 110,
    stats: {},
    art: 'bigPotion',
    healAmount: 80,
    requiredLevel: 4,
  },
]

const BY_ID = new Map(ITEMS.map((item) => [item.id, item]))

export function getItem(itemId: string): Item | undefined {
  return BY_ID.get(itemId)
}

export const ITEM_IDS = ITEMS.map((item) => item.id)

/** ชื่อไทยของแต่ละช่องสวมใส่ ใช้บนหน้าจอ */
export const SLOT_LABEL: Record<string, string> = {
  weapon: 'อาวุธ',
  armor: 'เกราะ',
  accessory: 'เครื่องประดับ',
  pet: 'สัตว์เลี้ยง',
  consumable: 'ของใช้',
}

/** สีประจำระดับความหายาก ใช้เป็นคลาส Tailwind */
export const RARITY_STYLE: Record<string, { border: string; text: string; label: string }> = {
  common: { border: 'border-slate-400/50', text: 'text-slate-200', label: 'ธรรมดา' },
  rare: { border: 'border-sky-400/60', text: 'text-sky-200', label: 'หายาก' },
  epic: { border: 'border-violet-400/60', text: 'text-violet-200', label: 'ยอดเยี่ยม' },
  legendary: { border: 'border-gold-400/70', text: 'text-gold-200', label: 'ตำนาน' },
}
