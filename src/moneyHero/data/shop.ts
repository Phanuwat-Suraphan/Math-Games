/**
 * ร้านของฮีโร่: ใช้เหรียญที่สะสมได้ซื้อของแต่งตัวและสัตว์เลี้ยง
 * ราคาเป็น "เหรียญ" ของเกม (1 เหรียญ ≈ 1 บาท) เด็กได้ฝึกเทียบราคากับเงินที่มี และคิดเงินที่เหลือ
 */

export type ShopSlot = 'hat' | 'face' | 'pet'

export interface ShopItem {
  id: string
  slot: ShopSlot
  name: string
  price: number
  icon: string
}

export const SHOP_ITEMS: ShopItem[] = [
  { id: 'hat-flower', slot: 'hat', name: 'ดอกไม้ติดผม', price: 10, icon: '🌸' },
  { id: 'hat-cap', slot: 'hat', name: 'หมวกแก๊ปสีแดง', price: 15, icon: '🧢' },
  { id: 'hat-party', slot: 'hat', name: 'หมวกปาร์ตี้', price: 20, icon: '🥳' },
  { id: 'hat-grad', slot: 'hat', name: 'หมวกบัณฑิต', price: 40, icon: '🎓' },
  { id: 'hat-crown', slot: 'hat', name: 'มงกุฎทองคำ', price: 60, icon: '👑' },
  { id: 'face-round', slot: 'face', name: 'แว่นกลมนักคิด', price: 15, icon: '👓' },
  { id: 'face-sun', slot: 'face', name: 'แว่นกันแดดเท่ ๆ', price: 25, icon: '🕶️' },
  { id: 'pet-chick', slot: 'pet', name: 'ลูกเจี๊ยบ', price: 30, icon: '🐥' },
  { id: 'pet-kitten', slot: 'pet', name: 'ลูกแมวส้ม', price: 45, icon: '🐱' },
  { id: 'pet-puppy', slot: 'pet', name: 'ลูกหมา', price: 45, icon: '🐶' },
  { id: 'pet-piggy', slot: 'pet', name: 'หมูออมสิน', price: 50, icon: '🐷' },
]

export function shopItem(id: string | undefined): ShopItem | undefined {
  return id ? SHOP_ITEMS.find((i) => i.id === id) : undefined
}

/** ของที่สวมอยู่ (ช่องละชิ้น) */
export type Wear = Partial<Record<ShopSlot, string>>
