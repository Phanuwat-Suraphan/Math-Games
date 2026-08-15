/**
 * สกิลวิเศษประจำตัวละคร
 *
 * ทำไมต้องผูกกับตัวละคร ไม่ใช่ให้เลือกเองตอนเล่น
 * เพราะเดิมตัวละครที่เด็กเลือกไม่มีผลอะไรกับการเล่นเลย เป็นแค่รูป
 * พอผูกสกิลวิเศษเข้ากับตัวละคร การเลือกตัวละครจึงกลายเป็นการตัดสินใจจริง
 * และเด็กมีเหตุผลที่จะกลับไปลองตัวอื่นที่ยังไม่เคยเล่น
 *
 * หลักการออกแบบ: ทุกสกิลต้องช่วย "ตอนกำลังจะแย่" ได้จริง
 * เกมนี้ตายจากการโดนรุม สกิลที่แค่เพิ่มความแรงเฉย ๆ จึงไม่ช่วยอะไร
 * ทุกอันในนี้จึงต้องตอบโจทย์ข้อใดข้อหนึ่ง คือเคลียร์ฝูงที่รุมอยู่
 * หรือทำให้รอดจากการรุมนั้นไปได้
 *
 * ชาร์จด้วยการล้มมอน ไม่ใช่ด้วยเวลา
 * เพราะถ้าชาร์จด้วยเวลา คนที่วิ่งหนีอย่างเดียวก็ได้ใช้เท่ากับคนที่สู้
 * ซึ่งขัดกับทิศทางของเกมทั้งเกมที่พยายามให้รางวัลกับการกล้าเข้าไปสู้
 */

export type UltimateKind = 'sweep' | 'meteor' | 'dash' | 'shield' | 'freeze' | 'harvest'

export interface Ultimate {
  id: string
  name: string
  description: string
  /** คำอธิบายสั้นสำหรับหน้าจอเลือกตัวละคร */
  short: string
  kind: UltimateKind
  color: string
  icon: string
  /** ต้องล้มมอนกี่ตัวจึงจะเต็ม */
  cost: number
  /** วินาทีที่ผลคงอยู่ 0 = ออกฤทธิ์ทันทีครั้งเดียว */
  duration: number
}

/** จำนวนมอนที่ต้องล้มเพื่อชาร์จเต็มหนึ่งครั้ง ใช้เป็นค่ากลาง */
const BASE_COST = 30

export const ULTIMATES: Record<string, Ultimate> = {
  warrior: {
    id: 'warrior',
    name: 'ตวัดพายุ',
    description: 'ฟันเป็นวงมหึมารอบตัวสามครั้งติด กวาดทุกอย่างที่รุมอยู่',
    short: 'เคลียร์ฝูงที่รุมรอบตัว',
    kind: 'sweep',
    color: '#e2e8f0',
    icon: 'sword',
    cost: BASE_COST,
    duration: 0.9,
  },
  mage: {
    id: 'mage',
    name: 'อุกกาบาตถล่ม',
    description: 'เรียกอุกกาบาตตกทั่วสนาม ระเบิดต่อเนื่องทุกมุมจอ',
    short: 'ถล่มทั้งสนามพร้อมกัน',
    kind: 'meteor',
    color: '#f97316',
    icon: 'flame',
    cost: BASE_COST,
    duration: 1.6,
  },
  explorer: {
    id: 'explorer',
    name: 'ลมกรด',
    description: 'วิ่งเร็วขึ้นเกือบเท่าตัวและไม่เจ็บเลย 6 วินาที',
    short: 'หนีออกจากวงล้อมได้ทันที',
    kind: 'dash',
    color: '#4ade80',
    icon: 'star',
    cost: BASE_COST,
    duration: 6,
  },
  inventor: {
    id: 'inventor',
    name: 'โล่พลังงาน',
    description: 'ไม่เจ็บ 6 วินาที และเผามอนที่เข้ามาใกล้ตัวตลอดเวลานั้น',
    short: 'ยืนสู้กลางวงได้โดยไม่เจ็บ',
    kind: 'shield',
    color: '#38bdf8',
    icon: 'shield',
    cost: BASE_COST,
    duration: 6,
  },
  scientist: {
    id: 'scientist',
    name: 'หยุดเวลา',
    description: 'มอนทั้งสนามเกือบหยุดนิ่ง 6 วินาที เดินออกได้สบาย ๆ',
    short: 'หยุดมอนทั้งสนาม',
    kind: 'freeze',
    color: '#a78bfa',
    icon: 'exp',
    cost: BASE_COST,
    duration: 6,
  },
  adventurer: {
    id: 'adventurer',
    name: 'ขุมทรัพย์',
    description: 'ดูดคริสตัลทั้งสนามเข้ามา และฟื้นเลือดครึ่งหนึ่ง',
    short: 'เลเวลพุ่งและฟื้นเลือด',
    kind: 'harvest',
    color: '#fbbf24',
    icon: 'coin',
    cost: BASE_COST,
    duration: 0,
  },
}

/**
 * สกิลวิเศษของอวตารหนึ่งตัว
 *
 * อวตารที่ไม่มีในตารางจะได้ของนักผจญภัย ไม่ใช่ undefined
 * เพราะการไม่มีสกิลวิเศษเลยแปลว่าปุ่มบนหน้าจอกดไม่ได้ตลอดทั้งรอบ
 * ซึ่งเด็กจะคิดว่าเกมพัง ไม่ใช่คิดว่าตัวละครตัวนี้ไม่มีสกิล
 */
export function ultimateFor(avatarId: string): Ultimate {
  return ULTIMATES[avatarId] ?? ULTIMATES.adventurer
}

export const ULTIMATE_IDS = Object.keys(ULTIMATES)
