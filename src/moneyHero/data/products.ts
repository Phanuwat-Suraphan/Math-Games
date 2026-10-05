/**
 * สินค้าในเมืองเงินทอง
 * ราคาเป็นช่วง "บาท" ที่สมจริง ตัวสร้างโจทย์สุ่มราคาในช่วงนี้
 * satang = true แปลว่าราคามีสตางค์ได้ (25, 50, 75)
 */
export interface ProductDef {
  id: string
  name: string
  emoji: string
  min: number
  max: number
  satang: boolean
  shop: 'market' | 'super' | 'stationery' | 'food' | 'toy'
}

export const PRODUCTS: ProductDef[] = [
  { id: 'candy', name: 'ลูกอม', emoji: '🍬', min: 1, max: 5, satang: true, shop: 'super' },
  { id: 'milk', name: 'นม', emoji: '🥛', min: 10, max: 25, satang: true, shop: 'super' },
  { id: 'bread', name: 'ขนมปัง', emoji: '🍞', min: 15, max: 45, satang: true, shop: 'super' },
  { id: 'juice', name: 'น้ำผลไม้', emoji: '🧃', min: 10, max: 30, satang: true, shop: 'super' },
  { id: 'cookie', name: 'คุกกี้', emoji: '🍪', min: 12, max: 39, satang: true, shop: 'super' },
  { id: 'icecream', name: 'ไอศกรีม', emoji: '🍦', min: 10, max: 35, satang: true, shop: 'super' },
  { id: 'egg', name: 'ไข่ไก่', emoji: '🥚', min: 4, max: 6, satang: true, shop: 'market' },
  { id: 'apple', name: 'แอปเปิล', emoji: '🍎', min: 8, max: 25, satang: true, shop: 'market' },
  { id: 'banana', name: 'กล้วยหอม', emoji: '🍌', min: 5, max: 20, satang: true, shop: 'market' },
  { id: 'corn', name: 'ข้าวโพด', emoji: '🌽', min: 10, max: 25, satang: true, shop: 'market' },
  { id: 'carrot', name: 'แครอท', emoji: '🥕', min: 5, max: 15, satang: true, shop: 'market' },
  { id: 'pencil', name: 'ดินสอ', emoji: '✏️', min: 3, max: 12, satang: true, shop: 'stationery' },
  { id: 'notebook', name: 'สมุด', emoji: '📒', min: 12, max: 45, satang: true, shop: 'stationery' },
  { id: 'crayon', name: 'สีเทียน', emoji: '🖍️', min: 25, max: 89, satang: true, shop: 'stationery' },
  { id: 'eraser', name: 'ยางลบ', emoji: '🧽', min: 3, max: 10, satang: true, shop: 'stationery' },
  { id: 'ruler', name: 'ไม้บรรทัด', emoji: '📏', min: 8, max: 20, satang: true, shop: 'stationery' },
  { id: 'rice', name: 'ข้าวกล่อง', emoji: '🍱', min: 35, max: 65, satang: false, shop: 'food' },
  { id: 'noodle', name: 'ก๋วยเตี๋ยว', emoji: '🍜', min: 30, max: 60, satang: false, shop: 'food' },
  { id: 'friedrice', name: 'ข้าวผัด', emoji: '🍛', min: 35, max: 60, satang: false, shop: 'food' },
  { id: 'teddy', name: 'ตุ๊กตาหมี', emoji: '🧸', min: 120, max: 399, satang: true, shop: 'toy' },
  { id: 'ball', name: 'ลูกบอล', emoji: '⚽', min: 89, max: 299, satang: true, shop: 'toy' },
  { id: 'kite', name: 'ว่าว', emoji: '🪁', min: 45, max: 150, satang: true, shop: 'toy' },
  { id: 'car', name: 'รถของเล่น', emoji: '🚗', min: 75, max: 250, satang: true, shop: 'toy' },
  { id: 'book', name: 'หนังสือนิทาน', emoji: '📚', min: 59, max: 189, satang: true, shop: 'stationery' },
  { id: 'bag', name: 'กระเป๋านักเรียน', emoji: '🎒', min: 250, max: 890, satang: false, shop: 'toy' },
  { id: 'shoes', name: 'รองเท้า', emoji: '👟', min: 290, max: 990, satang: false, shop: 'toy' },
  { id: 'bike', name: 'จักรยาน', emoji: '🚲', min: 1500, max: 4500, satang: false, shop: 'toy' },
]

export function productsOf(shop: ProductDef['shop']): ProductDef[] {
  return PRODUCTS.filter((p) => p.shop === shop)
}

/** ชื่อเด็กในโจทย์ (ชื่อสมมติ) */
export const KID_NAMES = [
  'น้องมะลิ',
  'ต้นกล้า',
  'ใบเตย',
  'ภูผา',
  'ข้าวหอม',
  'พลอย',
  'ก้อง',
  'ฟ้าใส',
  'นะโม',
  'ปุยฝ้าย',
  'ขนุน',
  'ส้มโอ',
]

export const THAI_MONTHS = [
  'มกราคม',
  'กุมภาพันธ์',
  'มีนาคม',
  'เมษายน',
  'พฤษภาคม',
  'มิถุนายน',
  'กรกฎาคม',
  'สิงหาคม',
  'กันยายน',
  'ตุลาคม',
  'พฤศจิกายน',
  'ธันวาคม',
]
