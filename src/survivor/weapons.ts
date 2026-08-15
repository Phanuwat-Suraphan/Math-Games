/**
 * อาวุธสี่แบบ แต่ละแบบอัปเกรดได้ห้าระดับ
 *
 * หลักการออกแบบ: อาวุธต้อง "เล่นต่างกันจริง" ไม่ใช่ต่างแค่ตัวเลข
 * ถ้าทุกอันคือกระสุนที่บินไปข้างหน้าโดยเปลี่ยนแค่สีกับความแรง
 * เด็กจะเลือกอันไหนก็ได้เพราะไม่รู้สึกต่าง
 *
 *   ดาบ        ฟันเป็นวงรอบตัว ระยะสั้น โดนทุกตัวที่อยู่ในวง
 *              เหมาะตอนโดนรุม แต่ต้องกล้าเข้าใกล้
 *   เวทไฟ      ลูกไฟบินไปแล้วระเบิด โดนเป็นวงกว้าง และติดไฟต่อเนื่อง
 *              เหมาะกับมอนที่มาเป็นฝูง
 *   เวทไฟฟ้า   ฟาดทันทีไม่ต้องรอกระสุนบิน แล้วกระโดดต่อไปตัวถัดไป
 *              เหมาะกับมอนที่กระจายตัว ไม่ต้องเล็ง
 *   เวทน้ำแข็ง  ยิงเกล็ดน้ำแข็งที่ทำให้มอนเดินช้าลง
 *              ความเสียหายน้อยแต่ทำให้เอาตัวรอดง่ายขึ้นมาก
 *
 * แต่ละระดับต้องรู้สึกได้ทันทีที่อัป ไม่ใช่ขยับทีละหนึ่งเปอร์เซ็นต์
 */

export type WeaponId = 'sword' | 'fire' | 'lightning' | 'ice'

/** ค่าประจำอาวุธหนึ่งระดับ */
export interface WeaponLevel {
  /** ความเสียหายต่อครั้ง */
  damage: number
  /** วินาทีระหว่างการโจมตีแต่ละครั้ง */
  interval: number
  /** ระยะทำการ ความหมายต่างกันตามชนิดอาวุธ */
  range: number
  /** จำนวนเป้าหมายหรือจำนวนนัด ความหมายต่างกันตามชนิดอาวุธ */
  count: number
}

export interface Weapon {
  id: WeaponId
  name: string
  description: string
  /** คำอธิบายสั้นว่าเล่นยังไง แสดงตอนเลือกอาวุธใหม่ */
  playstyle: string
  color: string
  icon: string
  levels: WeaponLevel[]
}

export const MAX_WEAPON_LEVEL = 5

export const WEAPONS: Weapon[] = [
  {
    id: 'sword',
    name: 'ดาบ',
    description: 'ฟันเป็นวงรอบตัว โดนทุกตัวที่อยู่ในระยะ',
    playstyle: 'ระยะสั้น ต้องเข้าใกล้ แต่โดนหลายตัวพร้อมกัน',
    color: '#e2e8f0',
    icon: 'sword',
    levels: [
      { damage: 14, interval: 0.75, range: 86, count: 1 },
      { damage: 20, interval: 0.68, range: 96, count: 1 },
      { damage: 28, interval: 0.6, range: 106, count: 1 },
      { damage: 38, interval: 0.52, range: 118, count: 1 },
      { damage: 52, interval: 0.45, range: 130, count: 1 },
    ],
  },
  {
    id: 'fire',
    name: 'เวทไฟ',
    description: 'ลูกไฟระเบิดเป็นวง และทำให้มอนติดไฟต่อเนื่อง',
    playstyle: 'แรงกับฝูงมอน ยิ่งมอนเยอะยิ่งคุ้ม',
    color: '#f97316',
    icon: 'flame',
    levels: [
      { damage: 16, interval: 1.5, range: 46, count: 1 },
      { damage: 22, interval: 1.35, range: 54, count: 1 },
      { damage: 30, interval: 1.2, range: 62, count: 2 },
      { damage: 40, interval: 1.05, range: 70, count: 2 },
      { damage: 54, interval: 0.9, range: 80, count: 3 },
    ],
  },
  {
    id: 'lightning',
    name: 'เวทไฟฟ้า',
    description: 'ฟาดใส่ทันที แล้วกระโดดต่อไปยังมอนตัวถัดไป',
    playstyle: 'ไม่ต้องเล็ง โดนทันที เหมาะกับมอนที่กระจายตัว',
    color: '#38bdf8',
    icon: 'star',
    levels: [
      { damage: 18, interval: 1.6, range: 190, count: 2 },
      { damage: 24, interval: 1.45, range: 210, count: 3 },
      { damage: 32, interval: 1.3, range: 230, count: 4 },
      { damage: 42, interval: 1.15, range: 250, count: 5 },
      { damage: 56, interval: 1.0, range: 280, count: 6 },
    ],
  },
  {
    id: 'ice',
    name: 'เวทน้ำแข็ง',
    description: 'เกล็ดน้ำแข็งทำให้มอนที่โดนเดินช้าลง',
    playstyle: 'ความเสียหายน้อย แต่ทำให้เอาตัวรอดง่ายขึ้นมาก',
    color: '#67e8f9',
    icon: 'shield',
    levels: [
      { damage: 9, interval: 1.1, range: 340, count: 1 },
      { damage: 12, interval: 1.0, range: 360, count: 2 },
      { damage: 16, interval: 0.9, range: 380, count: 2 },
      { damage: 21, interval: 0.8, range: 400, count: 3 },
      { damage: 28, interval: 0.7, range: 420, count: 4 },
    ],
  },
]

const WEAPON_BY_ID = new Map(WEAPONS.map((weapon) => [weapon.id, weapon]))

export function getWeapon(id: string): Weapon | undefined {
  return WEAPON_BY_ID.get(id as WeaponId)
}

/**
 * ค่าของอาวุธที่ระดับหนึ่ง
 *
 * ระดับนับจาก 1 ไม่ใช่ 0 เพราะเป็นตัวเลขที่เด็กเห็นบนหน้าจอ
 * ระดับที่เกินเพดานจะถูกหนีบลงมา ไม่คืน undefined
 * ให้ผู้เรียกไม่ต้องเช็คทุกจุด
 */
export function weaponStats(id: string, level: number): WeaponLevel | undefined {
  const weapon = getWeapon(id)
  if (!weapon) return undefined
  const index = Math.min(weapon.levels.length, Math.max(1, level)) - 1
  return weapon.levels[index]
}

/** อาวุธชิ้นแรกที่ทุกคนได้ตั้งแต่เริ่ม */
export const STARTING_WEAPON: WeaponId = 'sword'

/** จำนวนอาวุธที่ถือพร้อมกันได้ */
export const MAX_WEAPON_SLOTS = 4
