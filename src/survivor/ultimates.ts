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

export type UltimateKind =
  | 'sweep'
  | 'meteor'
  | 'dash'
  | 'shield'
  | 'freeze'
  | 'harvest'
  | 'echo'
  | 'gravity'
  | 'mend'
  | 'blitz'

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

  /*
   * สี่ตัวล่างนี้เพิ่มทีหลัง เพื่อให้มีวิธีเล่นให้ลองมากขึ้น
   *
   * ยึดหลักเดิมทุกข้อ: ต้องช่วยตอนกำลังจะแย่ได้จริง
   * และต้องไม่ซ้ำกับของที่มีอยู่แล้วในแง่ของ "แก้ปัญหาอะไร"
   *   คลื่นเสียง  แผ่ไปไกลกว่าตวัดพายุมาก แต่แรงน้อยกว่า
   *   แรงโน้มถ่วง รวบมอนที่กระจายอยู่มาไว้ที่เดียวแล้วเก็บทีเดียว
   *   ยาฟื้นฟู    ตัวเดียวที่ซื้อ "เวลา" ตรง ๆ ไม่ได้ซื้อด้วยการฆ่า
   *   รัวดาบ     เก็บตัวที่ประชิดที่สุดทีละตัว เหมาะกับตอนโดนไล่ติดหลัง
   */
  musician: {
    id: 'musician',
    name: 'คลื่นเสียงกัมปนาท',
    description: 'ปล่อยคลื่นเสียงเป็นวงขยายออกไปเรื่อย ๆ ตีทุกตัวที่คลื่นผ่าน',
    short: 'กวาดได้ไกลทั้งสนาม',
    kind: 'echo',
    color: '#38bdf8',
    icon: 'note',
    cost: BASE_COST,
    duration: 2.4,
  },
  astronomer: {
    id: 'astronomer',
    name: 'แรงโน้มถ่วง',
    description: 'ดูดมอนทั้งสนามเข้ามารวมกัน แล้วระเบิดใส่ทีเดียว',
    short: 'รวบทั้งฝูงมาเก็บทีเดียว',
    kind: 'gravity',
    color: '#a78bfa',
    icon: 'star',
    cost: BASE_COST + 6,
    duration: 2,
  },
  healer: {
    id: 'healer',
    name: 'ยาฟื้นฟู',
    description: 'ฟื้นเลือดจนเต็ม ผลักมอนรอบตัวออกไป และอยู่ยงสักพัก',
    short: 'ฟื้นเลือดเต็มและรอดจากวงล้อม',
    kind: 'mend',
    color: '#4ade80',
    icon: 'heart',
    cost: BASE_COST + 4,
    duration: 0,
  },
  athlete: {
    id: 'athlete',
    name: 'รัวหมัดสายฟ้า',
    description: 'พุ่งเข้าใส่ตัวที่ใกล้ที่สุดรัว ๆ ตีแรงมากทุกครั้ง',
    short: 'เก็บตัวที่ประชิดทีละตัว',
    kind: 'blitz',
    color: '#fb7185',
    icon: 'bolt',
    cost: BASE_COST - 4,
    duration: 1.8,
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
