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

export type WeaponId =
  | 'sword'
  | 'fire'
  | 'lightning'
  | 'ice'
  | 'orbit'
  | 'poison'
  | 'boomerang'

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

/**
 * ร่างสมบูรณ์ของอาวุธ
 *
 * เงื่อนไขสามข้อ: อาวุธเต็มระดับ + มีสกิลคู่ควบครบชั้น + เปิดหีบจากบอส
 *
 * ทำไมต้องมีสามข้อ ไม่ใช่ข้อเดียว
 * ถ้าอัปอาวุธเต็มแล้วได้เลย มันก็แค่ระดับที่หกที่ได้มาเองโดยไม่ต้องคิด
 * การบังคับให้มีสกิลคู่ควบด้วย ทำให้เด็กต้อง "วางแผนตั้งแต่ต้นรอบ"
 * ว่าจะไปทางไหน แล้วเก็บสกิลที่ตรงทางนั้น ไม่ใช่กดมั่วทุกใบที่โผล่มา
 * ส่วนหีบจากบอสทำให้มีเป้าหมายที่ต้องออกไปสู้ ไม่ใช่หนีอย่างเดียวจนจบ
 *
 * สกิลคู่ควบของแต่ละอาวุธตั้งใจให้ไม่ซ้ำกันเลย
 * เพราะถ้าซ้ำ เด็กจะเก็บสกิลตัวเดียวแล้วได้ร่างสมบูรณ์พร้อมกันหมด
 * ซึ่งทำลายการตัดสินใจที่เป็นหัวใจของระบบนี้ไปเลย
 */
export interface Evolution {
  name: string
  description: string
  /** สกิลติดตัวที่ต้องมีก่อน */
  requiresSkill: string
  /** ต้องมีสกิลนั้นกี่ชั้น */
  requiresStacks: number
  /** ชื่อสกิลที่แสดงให้เด็กอ่าน ไม่ต้องไปเปิดตารางเอง */
  requiresLabel: string
  stats: WeaponLevel
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
  evolution: Evolution
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
    evolution: {
      name: 'ดาบอนันต์',
      description: 'วงฟันกว้างขึ้นมากและแรงขึ้นเท่าตัว กวาดทั้งฝูงในครั้งเดียว',
      requiresSkill: 'power',
      requiresStacks: 2,
      requiresLabel: 'พลังโจมตี 2 ชั้น',
      stats: { damage: 98, interval: 0.32, range: 172, count: 1 },
    },
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
    evolution: {
      name: 'อุกกาบาตเพลิง',
      description: 'ระเบิดวงใหญ่กว่าเดิมมาก ไฟไหม้นานขึ้นและลามหนักขึ้น',
      requiresSkill: 'rapid',
      requiresStacks: 2,
      requiresLabel: 'ยิงไว 2 ชั้น',
      stats: { damage: 100, interval: 0.62, range: 118, count: 4 },
    },
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
    evolution: {
      name: 'สายฟ้าลูกโซ่',
      description: 'กระโดดต่อได้ถึงสิบตัว ครอบคลุมเกือบทั้งสนาม',
      requiresSkill: 'reach',
      requiresStacks: 2,
      requiresLabel: 'ระยะเอื้อม 2 ชั้น',
      stats: { damage: 104, interval: 0.7, range: 360, count: 10 },
    },
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
    evolution: {
      name: 'พายุน้ำแข็ง',
      description: 'ยิงเป็นชุดหกนัด และแช่แข็งได้นานกว่าเดิมเท่าตัว',
      requiresSkill: 'multishot',
      requiresStacks: 2,
      requiresLabel: 'กระสุนแตก 2 ชั้น',
      stats: { damage: 60, interval: 0.5, range: 460, count: 6 },
    },
  },

  /*
   * สามชิ้นล่างนี้เพิ่มทีหลัง เพื่อให้แต่ละรอบเล่นไม่เหมือนกัน
   *
   * ถือพร้อมกันได้แค่สี่ชิ้นเหมือนเดิม แต่ตอนนี้มีให้เลือกเจ็ดแบบ
   * การเลือกอาวุธจึงกลายเป็นการตัดสินใจจริง ไม่ใช่เก็บให้ครบทุกชิ้น
   *
   * ทั้งสามชิ้นตั้งใจให้ "ยิงคนละแบบ" กับสี่ชิ้นเดิม ไม่ใช่แค่ตัวเลขต่างกัน
   *   ดาบเดิมฟันรอบตัว · ไฟยิงแล้วระเบิด · ไฟฟ้ากระโดดต่อ · น้ำแข็งยิงหลายนัด
   *   โล่หมุนอยู่กับตัวตลอดเวลา ไม่ต้องเล็งและไม่มีจังหวะรอ
   *   แอ่งพิษวางพื้นที่ทิ้งไว้ ตีของที่เดินผ่านทีหลัง
   *   บูมเมอแรงตีสองรอบต่อการยิงหนึ่งครั้ง ขาไปกับขากลับ
   */
  {
    id: 'orbit',
    name: 'โล่หมุน',
    description: 'โล่ลอยหมุนรอบตัวตลอดเวลา ชนตัวไหนก็ตีตัวนั้น',
    playstyle: 'ไม่ต้องเล็ง ป้องกันรอบตัวตลอด เหมาะตอนโดนรุม',
    color: '#38bdf8',
    icon: 'shield',
    /*
     * range คือรัศมีวงโคจร ส่วน count คือจำนวนโล่
     *
     * ความเสียหายต่อครั้งต่ำกว่าอาวุธอื่นมาก เพราะมันตีได้ตลอดเวลา
     * โดยไม่ต้องรอจังหวะและไม่ต้องหันหน้าไปทางไหนเลย
     * ถ้าตั้งให้แรงเท่าอาวุธที่ต้องเล็ง มันจะกลายเป็นอาวุธที่ดีที่สุดโดยไม่มีข้อเสีย
     */
    /*
     * วงโคจรเล็กกว่าที่ตั้งไว้ตอนแรกมาก
     *
     * ครั้งแรกตั้งไว้ที่ 72–96 แล้ววัดได้ว่าตอนมอนประชิดตัว (ห่างราว 30)
     * โล่ทำความเสียหายเป็น "ศูนย์" เพราะมอนไปกองอยู่ข้างในวง
     * ส่วนโล่หมุนอยู่ข้างนอก ไม่เคยแตะกันเลยสักครั้ง
     *
     * แปลว่ามันใช้ไม่ได้เลยในจังหวะที่ต้องใช้มากที่สุด คือตอนโดนรุม
     * ซึ่งขัดกับคำอธิบายของอาวุธชิ้นนี้เองที่บอกว่า "เหมาะตอนโดนรุม"
     *
     * ลดลงรอบแรกเหลือ 44–64 ก็ยังเป็นศูนย์อยู่ดี เพราะโล่กวาดได้เฉพาะ
     * แถบแคบ ๆ รอบเส้นวงโคจร ส่วนมอนที่ประชิดตัวอยู่ลึกเข้าไปข้างใน
     * จึงต้องดึงวงเข้ามาชิดตัวจริง ๆ ให้มันกวาดโซนที่มอนมากองอยู่
     */
    levels: [
      { damage: 10, interval: 0.6, range: 30, count: 2 },
      { damage: 14, interval: 0.55, range: 34, count: 2 },
      { damage: 18, interval: 0.5, range: 38, count: 3 },
      { damage: 24, interval: 0.45, range: 42, count: 3 },
      { damage: 31, interval: 0.4, range: 46, count: 4 },
    ],
    evolution: {
      name: 'วงแหวนนิรันดร์',
      description: 'โล่หกใบหมุนเร็วขึ้นและกว้างขึ้น กลายเป็นกำแพงรอบตัว',
      requiresSkill: 'armor',
      requiresStacks: 2,
      requiresLabel: 'เกราะ 2 ชั้น',
      stats: { damage: 46, interval: 0.28, range: 62, count: 6 },
    },
  },
  {
    id: 'poison',
    name: 'แอ่งพิษ',
    description: 'โยนขวดยาลงพื้น เกิดเป็นแอ่งที่กัดทุกตัวที่เดินผ่าน',
    playstyle: 'วางดักทางที่มอนจะเดินมา ต้องคิดล่วงหน้า',
    color: '#4ade80',
    icon: 'flask',
    /*
     * range คือรัศมีแอ่ง ส่วน count คือจำนวนแอ่งที่โยนต่อครั้ง
     * damage คือความเสียหายต่อวินาทีของแอ่ง ไม่ใช่ต่อครั้งที่โดน
     */
    /*
     * ลดความแรงลงราวครึ่งหนึ่งจากที่ตั้งไว้ครั้งแรก
     *
     * วัดแล้วพบว่าตอนมอนรุมประชิด มันทำได้ 1,709 ต่อวินาที
     * เทียบกับดาบซึ่งเป็นอาวุธประชิดโดยตรงที่ทำได้ 915
     * อาวุธที่แค่โยนทิ้งไว้แล้วเดินหนีไม่ควรแรงกว่าอาวุธที่ต้องเข้าไปยืนสู้
     */
    levels: [
      { damage: 9, interval: 2.4, range: 62, count: 1 },
      { damage: 12, interval: 2.2, range: 68, count: 1 },
      { damage: 16, interval: 2, range: 74, count: 2 },
      { damage: 21, interval: 1.85, range: 80, count: 2 },
      { damage: 27, interval: 1.7, range: 88, count: 3 },
    ],
    evolution: {
      name: 'บึงมรณะ',
      description: 'แอ่งใหญ่ขึ้นมากและอยู่ได้นานกว่าเดิม ครองพื้นที่ไว้ได้ทั้งมุม',
      requiresSkill: 'bloom',
      requiresStacks: 2,
      requiresLabel: 'ระเบิดลูกโซ่ 2 ชั้น',
      stats: { damage: 52, interval: 1.3, range: 132, count: 3 },
    },
  },
  {
    id: 'boomerang',
    name: 'บูมเมอแรง',
    description: 'ขว้างออกไปแล้ววนกลับมา ตีได้ทั้งขาไปและขากลับ',
    playstyle: 'ทะลุได้หลายตัว คุ้มที่สุดตอนมอนเรียงเป็นแถว',
    color: '#fbbf24',
    icon: 'boomerang',
    levels: [
      { damage: 18, interval: 1.15, range: 260, count: 1 },
      { damage: 25, interval: 1.05, range: 280, count: 1 },
      { damage: 33, interval: 0.95, range: 300, count: 2 },
      { damage: 44, interval: 0.85, range: 320, count: 2 },
      { damage: 58, interval: 0.75, range: 350, count: 2 },
    ],
    evolution: {
      name: 'จักรสุริยะ',
      description: 'ขว้างสามใบพร้อมกัน ทะลุไม่จำกัด และบินไกลกว่าเดิมมาก',
      requiresSkill: 'pierce',
      requiresStacks: 2,
      requiresLabel: 'ทะลุทะลวง 2 ชั้น',
      stats: { damage: 104, interval: 0.55, range: 460, count: 3 },
    },
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

/**
 * ค่าที่ใช้จริงตอนนี้ นับร่างสมบูรณ์ด้วย
 *
 * ร่างสมบูรณ์ไม่ได้เปลี่ยนเป็นอาวุธคนละไอดี แต่ใช้ไอดีเดิมแล้วสลับชุดค่า
 *
 * ที่เลือกทำแบบนี้เพราะวิธีการโจมตีของแต่ละอาวุธไม่ได้เปลี่ยนไป
 * ดาบอนันต์ก็ยังฟันเป็นวง สายฟ้าลูกโซ่ก็ยังกระโดดต่อ
 * ถ้าแยกเป็นไอดีใหม่ ตรรกะการยิงทุกก้อนจะต้องรู้จักชื่อเพิ่มอีกสี่ชื่อ
 * ซึ่งเป็นที่ที่พลาดได้ง่ายมากโดยไม่ได้อะไรกลับมาเลย
 */
export function activeStats(
  id: string,
  level: number,
  evolved: boolean,
): WeaponLevel | undefined {
  if (evolved) return getWeapon(id)?.evolution.stats
  return weaponStats(id, level)
}

/** ชื่อที่แสดงบนหน้าจอ เปลี่ยนเป็นชื่อร่างสมบูรณ์เมื่อสมบูรณ์แล้ว */
export function weaponDisplayName(id: string, evolved: boolean): string {
  const weapon = getWeapon(id)
  if (!weapon) return id
  return evolved ? weapon.evolution.name : weapon.name
}

/** อาวุธชิ้นแรกที่ทุกคนได้ตั้งแต่เริ่ม */
export const STARTING_WEAPON: WeaponId = 'sword'

/** จำนวนอาวุธที่ถือพร้อมกันได้ */
export const MAX_WEAPON_SLOTS = 4
