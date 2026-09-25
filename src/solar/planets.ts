/**
 * ข้อมูลดาวเคราะห์ทั้งแปดดวงของยานสำรวจระบบสุริยะ
 *
 * ข้อมูลแบ่งเป็นสองชุดที่ตั้งใจแยกกันชัด ๆ
 *
 * ชุดแรกคือ "ค่าจริง" ใช้สร้างโจทย์และแสดงบนการ์ดข้อมูล
 * ค่าเหล่านี้มาจากหน้าข้อมูลดาวเคราะห์ของ NASA (Planetary Fact Sheet
 * และหน้าของดาวแต่ละดวง) ปัดให้อ่านง่ายแต่ไม่ได้แต่งขึ้นเอง
 * เพราะเด็กจะเอาตัวเลขในเกมไปเทียบกับหนังสือเรียนวิทยาศาสตร์
 * ถ้าไม่ตรงกัน เด็กจะเชื่อหนังสือ แล้วเลิกเชื่อโจทย์ในเกมทั้งชุด
 *
 * ชุดที่สองคือ "ค่าสำหรับวาด" (sceneOrbit และ sceneRadius)
 * ระบบสุริยะจริงวาดตามสัดส่วนบนจอไม่ได้เลย ถ้าดาวเนปจูนอยู่ขอบจอ
 * โลกจะเป็นจุดเล็กกว่าหนึ่งพิกเซลและอยู่ชิดดวงอาทิตย์จนแยกไม่ออก
 * ค่าชุดนี้จึงบีบระยะและขยายขนาดให้มองเห็นทุกดวง โดยยังรักษาลำดับไว้ครบ
 * คือดวงที่ไกลกว่าอยู่ไกลกว่า และดวงที่ใหญ่กว่าใหญ่กว่า
 * หน้าจอต้องบอกเด็กเสมอว่าภาพไม่ใช่สัดส่วนจริง
 *
 * สิ่งเดียวที่ไม่ได้บีบคือความเร็วในการโคจร ทุกดวงใช้คาบการโคจรจริง
 * เด็กจึงเห็นด้วยตาว่าดาวพุธวิ่งรอบไปหลายรอบแล้ว ดาวเนปจูนยังแทบไม่ขยับ
 * ซึ่งเป็นสิ่งที่วิทยาศาสตร์ ป.4 ให้เปรียบเทียบคาบการโคจรจากแบบจำลอง
 *
 * ข้อควรระวัง: จำนวนดวงจันทร์เปลี่ยนได้ทุกปีเมื่อมีการค้นพบดวงใหม่
 * ตัวเลขในไฟล์นี้เป็นจำนวนที่ได้รับการยืนยันราวปี 2025
 * (ดาวเสาร์ 274 ดวงหลังการประกาศเดือนมีนาคม 2025, ดาวยูเรนัส 29 ดวงหลังเดือนสิงหาคม 2025)
 * หนังสือเรียนที่พิมพ์ก่อนหน้านั้นจะเขียนน้อยกว่านี้ ซึ่งไม่ได้ผิด แค่เก่ากว่า
 * การ์ดข้อมูลบอกเด็กเรื่องนี้ตรง ๆ เพราะมันคือบทเรียนที่ดีว่าวิทยาศาสตร์ไม่หยุดนิ่ง
 */

export type PlanetId =
  | 'mercury'
  | 'venus'
  | 'earth'
  | 'mars'
  | 'jupiter'
  | 'saturn'
  | 'uranus'
  | 'neptune'

/** ปีที่นับจำนวนดวงจันทร์ แสดงบนการ์ดข้อมูลคู่กับตัวเลข */
export const MOON_COUNT_YEAR = 2025

/** แถบสีตามละติจูด ใช้กับดาวแก๊สที่มีเมฆเป็นริ้ว */
export interface PlanetBand {
  /** ไซน์ของละติจูด −1 คือขั้วใต้ 1 คือขั้วเหนือ */
  lat: number
  /** ความหนาของแถบ เป็นสัดส่วนของรัศมี */
  width: number
  color: string
}

/** จุดบนผิวดาว เช่น ทวีป จุดแดงใหญ่ หรือขั้วน้ำแข็ง หมุนไปพร้อมดาว */
export interface PlanetSpot {
  /** ละติจูด หน่วยเรเดียน */
  lat: number
  /** ลองจิจูด หน่วยเรเดียน */
  lon: number
  /** ขนาด เป็นสัดส่วนของรัศมี */
  size: number
  color: string
}

/** วงแหวนหนึ่งชั้น รัศมีเป็นสัดส่วนของรัศมีดาว */
export interface PlanetRing {
  inner: number
  outer: number
  color: string
  alpha: number
}

export interface Planet {
  id: PlanetId
  /** ชื่อไทยที่ใช้ในประโยค เช่น "ดาวพฤหัสบดี" */
  name: string
  /** ชื่อภาษาอังกฤษ แสดงตัวเล็กใต้ชื่อไทย เผื่อเด็กเจอในหนังสือหรือคลิป */
  english: string
  /** ลำดับจากดวงอาทิตย์ 1–8 */
  order: number

  /* ---------- ค่าจริง ---------- */

  /** ระยะห่างเฉลี่ยจากดวงอาทิตย์ หน่วยกิโลเมตร (ครบทุกหลัก ใช้ฝึกค่าประจำหลัก) */
  distanceKm: number
  /** เส้นผ่านศูนย์กลางที่เส้นศูนย์สูตร หน่วยกิโลเมตร */
  diameterKm: number
  /** เวลาที่โคจรรอบดวงอาทิตย์ครบหนึ่งรอบ หน่วยวันของโลก */
  orbitDays: number
  /** เวลาที่หมุนรอบตัวเองครบหนึ่งรอบ หน่วยชั่วโมง ติดลบคือหมุนกลับทิศกับโลก */
  spinHours: number
  /** อุณหภูมิเฉลี่ย องศาเซลเซียส */
  meanTempC: number
  /** จำนวนดวงจันทร์ที่ได้รับการยืนยันราวปี MOON_COUNT_YEAR */
  moons: number
  /**
   * น้ำหนักเมื่อชั่งบนดาวดวงนี้ เป็นกี่เท่าของตอนชั่งบนโลก หน่วยเป็นทศนิยมหนึ่งตำแหน่งคูณสิบ
   *
   * เก็บเป็นจำนวนเต็มคูณสิบ (เช่น 0.4 เก็บเป็น 4) เพื่อให้โจทย์คำนวณด้วยจำนวนเต็มล้วน
   * การคูณทศนิยมในคอมพิวเตอร์ได้ 0.30000000000000004 แทน 0.3
   * ถ้าเอาค่านั้นไปเทียบกับคำตอบของเด็ก เด็กที่คิดถูกจะถูกบอกว่าผิด
   */
  gravityTenths: number
  /** ความเอียงของแกนหมุน หน่วยองศา ใช้เอียงวงแหวน */
  tiltDeg: number
  /** ลองจิจูดเฉลี่ยในวันที่ 1 มกราคม 2000 หน่วยองศา ใช้วางดาวให้ตรงตำแหน่งจริงของวันนี้ */
  longitudeJ2000: number

  /** เกร็ดความรู้ที่แสดงบนการ์ดและบนตราประทับ */
  facts: string[]

  /* ---------- ค่าสำหรับวาด ---------- */

  sceneOrbit: number
  sceneRadius: number
  color: string
  /** สีด้านที่หันเข้าหาแสงมากที่สุด */
  highlight: string
  bands?: PlanetBand[]
  spots?: PlanetSpot[]
  rings?: PlanetRing[]
  /** สีขอบบรรยากาศบาง ๆ รอบดาว ไม่ใส่คือไม่มีบรรยากาศให้เห็น */
  atmosphere?: string
}

const DEG = Math.PI / 180

export const PLANETS: readonly Planet[] = [
  {
    id: 'mercury',
    name: 'ดาวพุธ',
    english: 'Mercury',
    order: 1,
    distanceKm: 57_909_227,
    diameterKm: 4_879,
    orbitDays: 88,
    spinHours: 1_408,
    meanTempC: 167,
    moons: 0,
    gravityTenths: 4,
    tiltDeg: 0,
    longitudeJ2000: 252.25,
    facts: [
      'เล็กที่สุดและอยู่ใกล้ดวงอาทิตย์ที่สุด',
      'โคจรเร็วที่สุด รอบดวงอาทิตย์ครบหนึ่งรอบในเวลาเพียง 88 วัน',
      'ไม่มีอากาศห่อหุ้ม กลางวันจึงร้อนจัด กลางคืนหนาวจัด',
    ],
    sceneOrbit: 5.2,
    sceneRadius: 0.36,
    color: '#8c8279',
    highlight: '#c9bfb4',
    spots: [
      { lat: 0.4, lon: 0.5, size: 0.22, color: '#6f665f' },
      { lat: -0.3, lon: 2.1, size: 0.28, color: '#756c64' },
      { lat: 0.1, lon: 4.0, size: 0.18, color: '#6a615a' },
    ],
  },
  {
    id: 'venus',
    name: 'ดาวศุกร์',
    english: 'Venus',
    order: 2,
    distanceKm: 108_209_475,
    diameterKm: 12_104,
    orbitDays: 225,
    spinHours: -5_832,
    meanTempC: 464,
    moons: 0,
    gravityTenths: 9,
    tiltDeg: 177,
    longitudeJ2000: 181.98,
    facts: [
      'ร้อนที่สุดในระบบสุริยะ ร้อนกว่าดาวพุธทั้งที่อยู่ไกลดวงอาทิตย์กว่า เพราะอากาศหนาทึบกักความร้อนไว้',
      'หมุนรอบตัวเองกลับทิศกับโลก ดวงอาทิตย์บนดาวศุกร์จึงขึ้นทางทิศตะวันตก',
      'คนไทยเรียกว่าดาวประกายพรึกเมื่อเห็นตอนเช้ามืด และดาวประจำเมืองเมื่อเห็นตอนหัวค่ำ',
    ],
    sceneOrbit: 7.3,
    sceneRadius: 0.62,
    color: '#d9b77e',
    highlight: '#f6e2b8',
    bands: [
      { lat: 0.35, width: 0.22, color: '#e8cf9e' },
      { lat: -0.25, width: 0.3, color: '#c9a56c' },
    ],
    atmosphere: '#ffe7b0',
  },
  {
    id: 'earth',
    name: 'โลก',
    english: 'Earth',
    order: 3,
    distanceKm: 149_598_262,
    diameterKm: 12_756,
    orbitDays: 365,
    spinHours: 24,
    meanTempC: 15,
    moons: 1,
    gravityTenths: 10,
    tiltDeg: 23.4,
    longitudeJ2000: 100.46,
    facts: [
      'ดาวเคราะห์ดวงเดียวที่เรารู้ว่ามีสิ่งมีชีวิต',
      'พื้นผิวราว 3 ใน 4 ส่วนเป็นน้ำ มองจากอวกาศจึงเห็นเป็นสีฟ้า',
      'แสงจากดวงอาทิตย์ใช้เวลาเดินทางมาถึงโลกประมาณ 8 นาที',
    ],
    sceneOrbit: 9.6,
    sceneRadius: 0.66,
    color: '#2f6fd6',
    highlight: '#8cc4ff',
    // ทวีปวาดเป็นก้อนกลมซ้อนกันหลายก้อน ไม่ได้ตั้งใจให้ตรงแผนที่จริง แค่ให้รู้ว่าเป็นโลกที่มีแผ่นดิน
    spots: [
      { lat: 0.75, lon: 0.1, size: 0.34, color: '#3f9b4f' },
      { lat: 0.5, lon: 0.35, size: 0.4, color: '#4aa65a' },
      { lat: 0.2, lon: 0.7, size: 0.3, color: '#b89a5c' },
      { lat: -0.2, lon: 0.9, size: 0.32, color: '#3f9b4f' },
      { lat: -0.55, lon: 1.05, size: 0.26, color: '#4aa65a' },
      { lat: 0.6, lon: 2.3, size: 0.44, color: '#4d9d4a' },
      { lat: 0.35, lon: 2.75, size: 0.4, color: '#b89a5c' },
      { lat: 0.1, lon: 3.1, size: 0.3, color: '#4aa65a' },
      { lat: -0.45, lon: 3.9, size: 0.3, color: '#b89a5c' },
      { lat: -0.3, lon: 4.3, size: 0.28, color: '#4aa65a' },
      { lat: 0.9, lon: 5.2, size: 0.3, color: '#3f9b4f' },
      { lat: 1.35, lon: 0, size: 0.42, color: '#f2f6ff' },
      { lat: -1.35, lon: 2, size: 0.46, color: '#f2f6ff' },
    ],
    atmosphere: '#9fd2ff',
  },
  {
    id: 'mars',
    name: 'ดาวอังคาร',
    english: 'Mars',
    order: 4,
    distanceKm: 227_943_824,
    diameterKm: 6_792,
    orbitDays: 687,
    spinHours: 24.6,
    meanTempC: -65,
    moons: 2,
    gravityTenths: 4,
    tiltDeg: 25.2,
    longitudeJ2000: 355.45,
    facts: [
      'ได้ชื่อว่าดาวเคราะห์สีแดง เพราะดินและหินมีสนิมเหล็กปนอยู่มาก',
      'มีภูเขาไฟโอลิมปัสซึ่งสูงที่สุดในระบบสุริยะ สูงกว่ายอดเขาเอเวอเรสต์ราวสองเท่าครึ่ง',
      'มีดวงจันทร์ 2 ดวง ชื่อโฟบอสกับดีมอส',
    ],
    sceneOrbit: 12.1,
    sceneRadius: 0.48,
    color: '#c1542f',
    highlight: '#f0936b',
    spots: [
      { lat: 1.35, lon: 0, size: 0.36, color: '#f3ece6' },
      { lat: 0.2, lon: 1.2, size: 0.34, color: '#8e3a22' },
      { lat: -0.3, lon: 3.4, size: 0.4, color: '#9a4126' },
    ],
  },
  {
    id: 'jupiter',
    name: 'ดาวพฤหัสบดี',
    english: 'Jupiter',
    order: 5,
    distanceKm: 778_340_821,
    diameterKm: 142_984,
    orbitDays: 4_333,
    spinHours: 9.9,
    meanTempC: -110,
    moons: 95,
    gravityTenths: 24,
    tiltDeg: 3.1,
    longitudeJ2000: 34.4,
    facts: [
      'ใหญ่ที่สุดในระบบสุริยะ ถ้าเป็นลูกบอลกลวงจะใส่โลกได้มากกว่า 1,300 ใบ',
      'จุดแดงใหญ่คือพายุหมุนที่ใหญ่กว่าโลกทั้งใบ และพัดมาหลายร้อยปีแล้ว',
      'หมุนรอบตัวเองเร็วที่สุด หนึ่งวันบนดาวพฤหัสบดียาวไม่ถึง 10 ชั่วโมง',
    ],
    sceneOrbit: 19.5,
    sceneRadius: 1.75,
    color: '#c9a27c',
    highlight: '#f1dcc0',
    bands: [
      { lat: 0.62, width: 0.14, color: '#a57a57' },
      { lat: 0.34, width: 0.16, color: '#b88259' },
      { lat: 0.1, width: 0.12, color: '#ecd9bf' },
      { lat: -0.14, width: 0.16, color: '#a6714d' },
      { lat: -0.42, width: 0.14, color: '#b88f6a' },
      { lat: -0.68, width: 0.12, color: '#9c7657' },
    ],
    spots: [{ lat: -0.36, lon: 1.2, size: 0.2, color: '#c0553a' }],
  },
  {
    id: 'saturn',
    name: 'ดาวเสาร์',
    english: 'Saturn',
    order: 6,
    distanceKm: 1_426_666_422,
    diameterKm: 120_536,
    orbitDays: 10_759,
    spinHours: 10.7,
    meanTempC: -140,
    moons: 274,
    gravityTenths: 9,
    tiltDeg: 26.7,
    longitudeJ2000: 49.94,
    facts: [
      'มีวงแหวนที่เห็นชัดที่สุด ทำจากก้อนน้ำแข็งและหินนับล้านก้อน',
      'เบากว่าน้ำเมื่อเทียบขนาดเท่ากัน ถ้ามีอ่างน้ำใหญ่พอ ดาวเสาร์จะลอยน้ำได้',
      'มีดวงจันทร์มากที่สุดในระบบสุริยะ และยังค้นพบดวงใหม่เพิ่มเรื่อย ๆ',
    ],
    sceneOrbit: 26,
    sceneRadius: 1.45,
    color: '#d7bf8a',
    highlight: '#f6e7c1',
    bands: [
      { lat: 0.55, width: 0.14, color: '#c3a66e' },
      { lat: 0.22, width: 0.14, color: '#e6d3a4' },
      { lat: -0.12, width: 0.16, color: '#c7a973' },
      { lat: -0.48, width: 0.14, color: '#bfa06a' },
    ],
    rings: [
      { inner: 1.25, outer: 1.5, color: '#8a7a5e', alpha: 0.45 },
      { inner: 1.52, outer: 1.95, color: '#e3d1a6', alpha: 0.85 },
      // ช่องว่างระหว่างสองวงคือช่องแคสสินี ซึ่งเห็นได้แม้ด้วยกล้องโทรทรรศน์ขนาดเล็ก
      { inner: 2.02, outer: 2.3, color: '#c9b68c', alpha: 0.7 },
    ],
  },
  {
    id: 'uranus',
    name: 'ดาวยูเรนัส',
    english: 'Uranus',
    order: 7,
    distanceKm: 2_870_658_186,
    diameterKm: 51_118,
    orbitDays: 30_687,
    spinHours: -17.2,
    meanTempC: -195,
    moons: 29,
    gravityTenths: 9,
    tiltDeg: 97.8,
    longitudeJ2000: 313.23,
    facts: [
      'หมุนรอบตัวเองแบบนอนตะแคง แกนหมุนเอียงเกือบ 98 องศา',
      'เป็นดาวเคราะห์ดวงแรกที่ค้นพบด้วยกล้องโทรทรรศน์ เมื่อปี ค.ศ. 1781',
      'มีสีฟ้าอมเขียวเพราะแก๊สมีเทนในบรรยากาศ',
    ],
    sceneOrbit: 31.8,
    sceneRadius: 1.05,
    color: '#7fd4dc',
    highlight: '#c9f3f5',
    rings: [{ inner: 1.55, outer: 1.75, color: '#b8e3e8', alpha: 0.35 }],
    atmosphere: '#bff6fb',
  },
  {
    id: 'neptune',
    name: 'ดาวเนปจูน',
    english: 'Neptune',
    order: 8,
    distanceKm: 4_498_396_441,
    diameterKm: 49_528,
    orbitDays: 60_190,
    spinHours: 16.1,
    meanTempC: -200,
    moons: 16,
    gravityTenths: 11,
    tiltDeg: 28.3,
    longitudeJ2000: 304.88,
    facts: [
      'อยู่ไกลดวงอาทิตย์ที่สุด โคจรครบหนึ่งรอบใช้เวลาประมาณ 165 ปีของโลก',
      'มีลมแรงที่สุดในระบบสุริยะ เร็วกว่า 2,000 กิโลเมตรต่อชั่วโมง',
      'นักคณิตศาสตร์คำนวณตำแหน่งได้ก่อน แล้วจึงส่องกล้องเจอจริงเมื่อปี ค.ศ. 1846',
    ],
    sceneOrbit: 37,
    sceneRadius: 1.02,
    color: '#3f68d8',
    highlight: '#94b4ff',
    bands: [
      { lat: 0.3, width: 0.12, color: '#5a82e6' },
      { lat: -0.35, width: 0.1, color: '#3558bf' },
    ],
    spots: [{ lat: -0.35, lon: 2.4, size: 0.18, color: '#243f8f' }],
    atmosphere: '#a9c6ff',
  },
]

/** ดวงอาทิตย์ ไม่ได้เป็นดาวเคราะห์ จึงแยกไว้ต่างหาก และไม่มีโจทย์ประจำดาว */
export const SUN = {
  name: 'ดวงอาทิตย์',
  english: 'Sun',
  sceneRadius: 2.7,
  facts: [
    'ดวงอาทิตย์เป็นดาวฤกษ์ ส่องแสงได้เอง ส่วนดาวเคราะห์สะท้อนแสงของดวงอาทิตย์',
    'กว้างกว่าโลกประมาณ 109 เท่า',
    'ดาวเคราะห์ทั้งแปดดวงโคจรรอบดวงอาทิตย์ไปในทิศทางเดียวกัน',
  ],
} as const

/** แถบดาวเคราะห์น้อยระหว่างดาวอังคารกับดาวพฤหัสบดี หน่วยเดียวกับ sceneOrbit */
export const ASTEROID_BELT = { inner: 14.4, outer: 16.6 } as const

/** ดวงจันทร์ของโลก วาดดวงเดียวเพราะเป็นดวงเดียวที่เด็กรู้จักและเห็นได้ทุกคืน */
export const EARTH_MOON = {
  name: 'ดวงจันทร์',
  sceneOrbit: 1.25,
  sceneRadius: 0.18,
  orbitDays: 27.3,
  distanceKm: 384_400,
} as const

export const PLANET_IDS: readonly PlanetId[] = PLANETS.map((planet) => planet.id)

export function isPlanetId(value: unknown): value is PlanetId {
  return typeof value === 'string' && (PLANET_IDS as readonly string[]).includes(value)
}

export function getPlanet(id: PlanetId): Planet {
  const planet = PLANETS.find((candidate) => candidate.id === id)
  // ไม่มีทางเกิดตราบที่ PlanetId กับ PLANETS ตรงกัน แต่คืนโลกดีกว่าทำให้หน้าจอพัง
  return planet ?? (PLANETS[2] as Planet)
}

/** ระยะจากดวงอาทิตย์ ปัดเป็นล้านกิโลเมตร */
export function distanceMillionKm(planet: Planet): number {
  return Math.round(planet.distanceKm / 1_000_000)
}

/** คาบการโคจรเป็นปีของโลก ปัดเป็นจำนวนเต็ม ใช้กับดาวที่โคจรนานกว่าหนึ่งปี */
export function orbitYears(planet: Planet): number {
  return Math.round(planet.orbitDays / 365.25)
}

/** ความเอียงของแกนเป็นเรเดียน */
export function tiltRadians(planet: Planet): number {
  return planet.tiltDeg * DEG
}

/** ใส่ลูกน้ำคั่นหลักพัน เขียนเองแทน toLocaleString เพื่อให้ได้ผลเดียวกันทุกเครื่อง */
export function formatNumber(value: number): string {
  const negative = value < 0
  const [whole, fraction] = Math.abs(value).toString().split('.')
  const grouped = (whole ?? '0').replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return `${negative ? '−' : ''}${grouped}${fraction ? `.${fraction}` : ''}`
}
