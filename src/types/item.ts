/**
 * ของที่ซื้อ สวมใส่ และใช้ได้ในเกม
 *
 * ทำไมต้องมี: ก่อนหน้านี้เด็กได้เหรียญจากทุกด่าน แต่ไม่มีที่ใช้เลย
 * เหรียญที่ใช้ไม่ได้ไม่ต่างจากตัวเลขที่ขึ้นไปเรื่อย ๆ ซึ่งไม่จูงใจ
 * เมื่อมีของให้ซื้อ การกลับไปเล่นด่านเก่าซ้ำจึงมีเหตุผล
 * และการเลือกว่าจะซื้ออะไรก่อนก็เป็นการตัดสินใจของเด็กเอง
 */

export type ItemKind = 'weapon' | 'armor' | 'accessory' | 'pet' | 'consumable'

/**
 * ระดับความหายาก คุมทั้งราคาและสีกรอบบนหน้าจอ
 * เด็กจำสีได้เร็วกว่าอ่านตัวเลข จึงใช้สีเป็นภาษาหลัก
 */
export type ItemRarity = 'common' | 'rare' | 'epic' | 'legendary'

/**
 * ค่าที่ของชิ้นหนึ่งเพิ่มให้
 *
 * ทุกค่าเป็นบวกเสมอ ไม่มีของที่ลดค่าอะไรลง
 * เพราะเป้าหมายคือให้เด็กอยากลองของใหม่ ไม่ใช่กลัวว่าจะเลือกผิด
 */
export interface ItemStats {
  /** เพิ่มพลังโจมตีในการต่อสู้ */
  attack?: number
  /** ลดความเสียหายที่ได้รับ */
  defense?: number
  /** เพิ่มพลังชีวิตสูงสุด */
  maxHp?: number
  /** เพิ่ม EXP ที่ได้เป็นร้อยละ */
  expBonusPercent?: number
  /** เพิ่มเหรียญที่ได้เป็นร้อยละ */
  coinBonusPercent?: number
}

export interface Item {
  id: string
  name: string
  description: string
  kind: ItemKind
  rarity: ItemRarity
  price: number
  stats: ItemStats
  /** ชื่อภาพ SVG ประจำของชิ้นนี้ */
  art: string
  /**
   * เงื่อนไขปลดล็อกในร้าน
   * ของแรง ๆ ต้องเล่นถึงระดับหนึ่งก่อน ไม่ใช่ซื้อได้ตั้งแต่ด่านแรกถ้าเก็บเงินพอ
   */
  requiredLevel?: number
  /** ของใช้แล้วหมด ฟื้นพลังชีวิตเท่านี้ */
  healAmount?: number
}

/** ช่องสวมใส่ ของหนึ่งชนิดสวมได้ทีละชิ้น */
export type EquipSlot = 'weapon' | 'armor' | 'accessory' | 'pet'

export type Equipment = Partial<Record<EquipSlot, string>>

/** ผลรวมค่าที่ได้จากของที่สวมอยู่ทั้งหมด */
export interface TotalStats {
  attack: number
  defense: number
  maxHp: number
  expBonusPercent: number
  coinBonusPercent: number
}
