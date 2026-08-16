/**
 * พลังถาวร ซื้อครั้งเดียวแล้วติดตัวไปทุกรอบ
 *
 * ทำไมต้องมี (จากการศึกษาเกมแนวเอาชีวิตรอด)
 * เกมแนวนี้ตายบ่อยมากโดยธรรมชาติ ถ้ารอบที่ตายไม่เหลืออะไรเลย
 * เด็กจะรู้สึกว่าเสียเวลาเปล่าและเลิกเล่นหลังตายสองสามครั้ง
 * ระบบสะสมข้ามรอบทำให้ "รอบที่ตาย" กลายเป็น "รอบที่เก็บเงินได้"
 * ซึ่งเปลี่ยนความรู้สึกหลังตายทั้งหมด จากล้มเหลวเป็นความคืบหน้า
 *
 * หลักการตั้งค่า
 *
 * 1. ทีละชั้นต้องเล็ก แต่รวมกันแล้วต้องรู้สึกได้จริง
 *    ถ้าชั้นเดียวเปลี่ยนเกมทันที เด็กที่ยังไม่ได้ซื้อจะเล่นไม่ไหวเลย
 *    ซึ่งกลายเป็นกำแพงที่ต้องจ่ายเงินผ่าน ไม่ใช่ตัวช่วย
 *
 * 2. ไม่มีพลังไหนที่ทำให้ทักษะไม่สำคัญ
 *    ทุกอย่างในนี้ช่วยให้ "อยู่ได้นานขึ้น" ไม่ใช่ "ชนะแทนเด็ก"
 *    คนที่เดินหลบเก่งยังต้องเก่งกว่าคนที่ซื้อครบแต่เดินไม่เป็นอยู่ดี
 *
 * 3. ราคาผูกกับรายได้จริง เล่นสนามรบสามนาทีได้ราว 150–250 เหรียญ
 *    ชั้นแรกของทุกอย่างจึงซื้อได้ในรอบเดียว เพื่อให้เห็นผลทันทีตั้งแต่ต้น
 */

export interface Perk {
  id: string
  name: string
  description: string
  /** ซื้อได้สูงสุดกี่ชั้น */
  maxLevel: number
  /** ราคาชั้นแรก ชั้นถัดไปแพงขึ้นตามตัวคูณด้านล่าง */
  basePrice: number
  /** ตัวคูณราคาต่อชั้น */
  priceGrowth: number
  icon: string
  /** ข้อความบอกผลของหนึ่งชั้น ใช้แสดงบนการ์ด */
  perLevel: string
}

export const PERKS: Perk[] = [
  {
    id: 'vigor',
    name: 'ร่างกายแข็งแรง',
    description: 'พลังชีวิตเริ่มต้นสูงขึ้น ทนการโดนรุมได้นานขึ้น',
    perLevel: 'พลังชีวิต +14',
    maxLevel: 5,
    basePrice: 120,
    priceGrowth: 1.6,
    icon: 'heart',
  },
  {
    id: 'might',
    name: 'พลังติดตัว',
    description: 'อาวุธทุกชิ้นแรงขึ้นตั้งแต่วินาทีแรกของรอบ',
    perLevel: 'ความเสียหาย +8%',
    maxLevel: 5,
    basePrice: 150,
    priceGrowth: 1.65,
    icon: 'sword',
  },
  {
    id: 'boots',
    name: 'รองเท้าวิเศษ',
    description: 'เดินเร็วขึ้นตั้งแต่เริ่ม หลบง่ายขึ้นตลอดรอบ',
    perLevel: 'ความเร็ว +4%',
    maxLevel: 5,
    basePrice: 140,
    priceGrowth: 1.6,
    icon: 'star',
  },
  {
    id: 'training',
    name: 'ฝึกฝนมาก่อน',
    description: 'เริ่มรอบด้วยดาบที่อัประดับมาแล้ว ช่วงต้นรอบจึงไม่อืด',
    perLevel: 'ดาบเริ่มต้น +1 ระดับ',
    maxLevel: 3,
    basePrice: 260,
    priceGrowth: 2,
    icon: 'flame',
  },
  {
    id: 'lodestone',
    name: 'หินดูดคริสตัล',
    description: 'เก็บคริสตัลได้ไกลขึ้น ไม่ต้องเดินย้อนกลับไปเก็บ',
    perLevel: 'ระยะดูด +30%',
    maxLevel: 4,
    basePrice: 110,
    priceGrowth: 1.55,
    icon: 'coin',
  },
  {
    id: 'phoenix',
    name: 'ขนนกฟีนิกซ์',
    description: 'ล้มแล้วลุกได้หนึ่งครั้งต่อรอบ พร้อมผลักมอนรอบตัวกระเด็นออกไป',
    perLevel: 'ฟื้นคืนชีพ 1 ครั้งต่อรอบ',
    maxLevel: 1,
    basePrice: 900,
    priceGrowth: 1,
    icon: 'shield',
  },
]

const PERK_BY_ID = new Map(PERKS.map((perk) => [perk.id, perk]))

export function getPerk(id: string): Perk | undefined {
  return PERK_BY_ID.get(id)
}

/**
 * ราคาของชั้นถัดไป คืน null ถ้าเต็มแล้ว
 *
 * คิดจากชั้นปัจจุบันเสมอ ไม่เก็บตารางราคาไว้ล่วงหน้า
 * เพราะตารางที่เขียนมือจะเพี้ยนจากสูตรทันทีที่มีคนแก้ตัวเลขใดตัวเลขหนึ่ง
 */
export function perkCost(id: string, level: number): number | null {
  const perk = getPerk(id)
  if (!perk) return null
  if (level >= perk.maxLevel) return null

  return Math.round(perk.basePrice * Math.pow(perk.priceGrowth, level))
}
