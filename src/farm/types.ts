/**
 * ชนิดข้อมูลและค่าคงที่ของ "โดมสีเขียว"
 *
 * ต่อจาก Safe Zone Guardians เด็กเข้าโดมได้แล้ว หน้าที่จึงเปลี่ยนจาก
 * การเอาตัวรอดเข้ามา เป็นการทำให้โดมอยู่รอดและเปิดรับคนข้างนอกเพิ่มได้
 *
 * หัวใจของการออกแบบอยู่ที่เรื่องเวลา เกมต้นแบบทั้งสามเกม (Stardew Valley,
 * Heartopia, Fallout Shelter) เดินด้วยนาฬิกาจริง ซึ่งใช้กับคาบเรียนไม่ได้
 * เพราะพืชที่ใช้เวลาสี่ชั่วโมงคือพืชที่เด็กไม่มีวันได้เก็บเกี่ยว
 *
 * ที่นี่วันเดินด้วย "สมุดบัญชี" คือเด็กต้องคำนวณสรุปของวันนั้นให้เสร็จ
 * วันถึงจะผ่านไป และตัวเลขที่คำนวณได้คือตัวเลขที่ถูกนำไปใช้จริง
 * ไม่ใช่โจทย์ที่แปะไว้เฉย ๆ แล้วเกมคิดเองอยู่ข้างหลัง
 */

/** ระดับชั้นที่เลือกตอนเริ่ม ใช้กำหนดขนาดตัวเลขและชนิดโจทย์ในสมุดบัญชี */
export type Grade = 4 | 5 | 6

/** แรงที่มีในหนึ่งวัน ใช้กับการรดน้ำ ปลูก และให้อาหารสัตว์ */
export const ENERGY_PER_DAY = 12

/**
 * โบนัสแรงเมื่อปิดสมุดบัญชีถูกทุกช่องตั้งแต่ครั้งแรก
 *
 * เป็นรางวัลเดียวในเกมที่ให้กับ "ความแม่นยำ" ไม่ใช่ความขยัน
 * ตั้งใจให้เห็นชัดว่าคิดเลขให้ถูกแล้วได้เล่นมากขึ้นจริง
 */
export const ENERGY_BONUS_PERFECT_LEDGER = 3

/** ค่าใช้แรงของแต่ละการกระทำ */
export const ENERGY_COST = {
  plant: 1,
  water: 1,
  feed: 1,
  harvest: 0,
} as const

/** ขนาดตารางของแปลงหนึ่งแปลง คิดเป็นช่องปลูก */
export interface PlotSize {
  cols: number
  rows: number
}

/** จำนวนแปลงสูงสุดที่เปิดได้ */
export const MAX_PLOTS = 6

/**
 * ขนาดของแปลงแต่ละแปลงตามลำดับที่ปลดล็อก
 *
 * ตั้งใจให้ขนาดไม่ซ้ำกันและมีคู่ที่ "พื้นที่กับเส้นรอบรูปสวนกัน"
 * เช่น 4x6 (พื้นที่ 24 รั้ว 20) กับ 5x5 (พื้นที่ 25 รั้ว 20)
 * และ 6x8 (พื้นที่ 48 รั้ว 28) กับ 5x10 (พื้นที่ 50 รั้ว 30)
 * เพื่อให้คำถามเรื่องพื้นที่กับเส้นรอบรูปมีของจริงให้เทียบ ไม่ใช่โจทย์ลอย ๆ
 */
export const PLOT_SIZES: readonly PlotSize[] = [
  { cols: 4, rows: 4 },
  { cols: 4, rows: 6 },
  { cols: 5, rows: 5 },
  { cols: 6, rows: 6 },
  { cols: 6, rows: 8 },
  { cols: 5, rows: 10 },
]

/** ราคาปลดล็อกแปลงถัดไป นับตามจำนวนแปลงที่มีอยู่แล้ว */
export const PLOT_UNLOCK_COST: readonly number[] = [0, 220, 480, 900, 1_500, 2_400]

export type CropId = 'tomato' | 'lettuce' | 'corn' | 'wheat' | 'pumpkin'

export interface Crop {
  id: CropId
  name: string
  emoji: string
  /** จำนวนวันที่ต้องรดน้ำครบถึงจะเก็บเกี่ยวได้ */
  growDays: number
  /** ราคาเมล็ดต่อหนึ่งช่องปลูก */
  seedCost: number
  /** ราคาขายผลผลิตต่อหนึ่งช่องปลูก */
  sellPrice: number
  /** สีของต้นตอนโตเต็มที่ ใช้วาดฉาก */
  color: string
  /** สีของผล ใช้วาดตอนพร้อมเก็บเกี่ยว */
  fruitColor: string
}

/**
 * รายการพืช
 *
 * ราคาตั้งไว้ให้ "พืชที่รอนานกว่าได้กำไรต่อวันดีกว่า" เล็กน้อย
 * เพื่อให้การเลือกปลูกเป็นการตัดสินใจจริง ไม่ใช่มีคำตอบเดียวที่ถูกเสมอ
 * แต่ไม่ให้ต่างกันมากจนพืชระยะสั้นกลายเป็นตัวเลือกที่ผิดเสมอ
 * เพราะเด็กที่เหลือเวลาอีกสองวันในคาบ ควรยังมีอะไรให้ปลูกได้
 */
export const CROPS: readonly Crop[] = [
  {
    id: 'tomato',
    name: 'มะเขือเทศ',
    emoji: '🍅',
    growDays: 2,
    seedCost: 4,
    sellPrice: 16,
    color: '#3f7d3f',
    fruitColor: '#e14434',
  },
  {
    id: 'lettuce',
    name: 'ผักกาด',
    emoji: '🥬',
    growDays: 3,
    seedCost: 6,
    sellPrice: 30,
    color: '#4f9e4f',
    fruitColor: '#7fd07f',
  },
  {
    id: 'corn',
    name: 'ข้าวโพด',
    emoji: '🌽',
    growDays: 4,
    seedCost: 8,
    sellPrice: 44,
    color: '#4a8c3a',
    fruitColor: '#f2c23e',
  },
  {
    id: 'wheat',
    name: 'ข้าวสาลี',
    emoji: '🌾',
    growDays: 5,
    seedCost: 10,
    sellPrice: 60,
    color: '#9aa03c',
    fruitColor: '#e8c86a',
  },
  {
    id: 'pumpkin',
    name: 'ฟักทอง',
    emoji: '🎃',
    growDays: 6,
    seedCost: 14,
    sellPrice: 84,
    color: '#3d7a44',
    fruitColor: '#e8862c',
  },
]

export function findCrop(id: CropId): Crop {
  const found = CROPS.find((crop) => crop.id === id)
  if (!found) throw new Error(`ไม่รู้จักพืช: ${id}`)
  return found
}

export type AnimalId = 'chicken' | 'goat' | 'fish'

export interface Animal {
  id: AnimalId
  name: string
  emoji: string
  /** ชื่อผลผลิต ใช้ในข้อความและในสมุดบัญชี */
  productName: string
  productEmoji: string
  /** อาหารที่ต้องใช้ต่อหนึ่งตัวต่อหนึ่งวัน หน่วยกิโลกรัม */
  feedPerDay: number
  /** ผลผลิตต่อหนึ่งตัวต่อหนึ่งวัน เมื่อได้อาหารครบ */
  yieldPerDay: number
  /** ราคาขายผลผลิตต่อชิ้น */
  productPrice: number
  /** ราคาซื้อสัตว์หนึ่งตัว */
  cost: number
  color: string
}

/**
 * รายการสัตว์
 *
 * ตัวเลขอาหารตั้งใจไม่ให้หารลงตัวกับถุงอาหารมาตรฐานเสมอไป
 * เพราะ "เศษ" คือสิ่งที่อยากให้เด็กเจอ และเศษที่เหลือเก็บไว้พรุ่งนี้ได้จริง
 * ทำให้เศษมีความหมายในเกม ไม่ใช่ตัวเลขที่ห้อยอยู่ท้ายคำตอบเฉย ๆ
 */
export const ANIMALS: readonly Animal[] = [
  {
    id: 'chicken',
    name: 'ไก่',
    emoji: '🐔',
    productName: 'ไข่',
    productEmoji: '🥚',
    feedPerDay: 3,
    yieldPerDay: 1,
    productPrice: 9,
    cost: 120,
    color: '#e8e2d4',
  },
  {
    id: 'goat',
    name: 'แพะ',
    emoji: '🐐',
    productName: 'นม',
    productEmoji: '🥛',
    feedPerDay: 7,
    yieldPerDay: 2,
    productPrice: 16,
    cost: 260,
    color: '#cbc3b4',
  },
  {
    id: 'fish',
    name: 'ปลาในบ่อ',
    emoji: '🐟',
    productName: 'ปลา',
    productEmoji: '🐠',
    feedPerDay: 2,
    yieldPerDay: 1,
    productPrice: 11,
    cost: 90,
    color: '#7fb7d8',
  },
]

export function findAnimal(id: AnimalId): Animal {
  const found = ANIMALS.find((animal) => animal.id === id)
  if (!found) throw new Error(`ไม่รู้จักสัตว์: ${id}`)
  return found
}

/** ราคาอาหารสัตว์ต่อหนึ่งกิโลกรัม */
export const FEED_PRICE = 2

/** ทรัพยากรสี่อย่างของโดม ยืมโครงมาจาก Fallout Shelter */
export type ResourceId = 'power' | 'water' | 'air' | 'food'

export interface ResourceSpec {
  id: ResourceId
  name: string
  emoji: string
  unit: string
  /** ความจุถังสูงสุด */
  capacity: number
  /** ใช้ต่อหนึ่งครอบครัวต่อหนึ่งวัน */
  perFamily: number
  color: string
}

/**
 * ทรัพยากรของโดม
 *
 * ตัวเลขเลือกให้อยู่ในหลักหมื่นถึงหลักแสน ตรงกับตัวชี้วัด ป.4
 * ที่ว่าด้วยจำนวนนับมากกว่า 100,000 และเลือกให้หารด้วยจำนวนคนแล้ว
 * ได้เลขที่คิดในใจไหว ไม่ใช่ทศนิยมยาวเหยียดที่ต้องพึ่งเครื่องคิดเลข
 */
export const RESOURCES: readonly ResourceSpec[] = [
  {
    id: 'power',
    name: 'ไฟฟ้า',
    emoji: '⚡',
    unit: 'หน่วย',
    capacity: 160_000,
    perFamily: 1_800,
    color: '#f2c23e',
  },
  {
    id: 'water',
    name: 'น้ำ',
    emoji: '💧',
    unit: 'ลิตร',
    capacity: 120_000,
    perFamily: 1_300,
    color: '#3fa9d8',
  },
  {
    id: 'air',
    name: 'อากาศ',
    emoji: '💨',
    unit: 'หน่วย',
    capacity: 90_000,
    perFamily: 1_000,
    color: '#8fd4e8',
  },
  /*
   * อาหารใช้หน่วยเล็กกว่าอีกสามอย่างมาก และตั้งใจให้เป็นแบบนั้น
   *
   * ไฟ น้ำ และอากาศ เป็นตัวเลขหลักหมื่นถึงหลักแสน ซึ่งตรงกับตัวชี้วัด ป.4
   * เรื่องจำนวนนับที่มากกว่า 100,000 ส่วนอาหารเป็นหลักพัน
   * เพราะอาหารต้องเทียบกับผลผลิตจากแปลงได้ด้วยหัว ไม่ใช่ด้วยเครื่องคิดเลข
   * ผักหนึ่งต้นได้อาหาร 45 กิโลกรัม แปลง 4 คูณ 4 จึงได้ 720 กิโลกรัม
   * ซึ่งเป็นตัวเลขที่เด็กเห็นแล้วรู้ทันทีว่าเลี้ยงคนได้กี่วัน
   */
  {
    id: 'food',
    name: 'อาหาร',
    emoji: '🍲',
    unit: 'กิโลกรัม',
    capacity: 6_000,
    perFamily: 25,
    color: '#e8862c',
  },
]

export function findResource(id: ResourceId): ResourceSpec {
  const found = RESOURCES.find((resource) => resource.id === id)
  if (!found) throw new Error(`ไม่รู้จักทรัพยากร: ${id}`)
  return found
}

/** อาคารที่ผลิตทรัพยากรให้โดม */
export interface Building {
  id: string
  name: string
  emoji: string
  produces: ResourceId
  /** ผลิตได้ต่อวันเมื่อมีไฟพอ */
  output: number
  /** ไฟที่ต้องใช้ในการเดินเครื่อง หน่วยต่อวัน */
  powerDraw: number
  cost: number
  color: string
}

/**
 * อาคาร
 *
 * เครื่องปั่นไฟไม่กินไฟ อาคารอื่นกินไฟหมด นี่คือลูกโซ่แบบ Fallout Shelter
 * ที่ทำให้ไฟฟ้าเป็นฐานของทุกอย่าง ไฟไม่พอแล้วน้ำกับอากาศผลิตได้ไม่เต็มที่
 * ซึ่งเป็นเหตุผลที่ทำให้ตัวเลขบนมาตรวัดมีความหมายจริง ไม่ใช่แค่แถบสี่แถบ
 */
export const BUILDINGS: readonly Building[] = [
  {
    id: 'solar',
    name: 'แผงโซลาร์',
    emoji: '🔆',
    produces: 'power',
    output: 5_000,
    powerDraw: 0,
    cost: 450,
    color: '#3c5a8a',
  },
  {
    id: 'purifier',
    name: 'โรงกรองน้ำ',
    emoji: '🚰',
    produces: 'water',
    output: 4_000,
    powerDraw: 700,
    cost: 520,
    color: '#2f7f9e',
  },
  {
    id: 'scrubber',
    name: 'เครื่องฟอกอากาศ',
    emoji: '🌀',
    produces: 'air',
    output: 3_500,
    powerDraw: 600,
    cost: 480,
    color: '#5aa0b0',
  },
]

export function findBuilding(id: string): Building {
  const found = BUILDINGS.find((building) => building.id === id)
  if (!found) throw new Error(`ไม่รู้จักอาคาร: ${id}`)
  return found
}

/** สถานะช่องปลูกหนึ่งช่อง */
export interface Planting {
  crop: CropId
  /** จำนวนวันที่รดน้ำครบแล้ว เท่ากับ growDays เมื่อไรคือเก็บเกี่ยวได้ */
  watered: number
  /** วันนี้รดน้ำไปแล้วหรือยัง รีเซ็ตทุกเช้า */
  wateredToday: boolean
}

/** แปลงหนึ่งแปลง */
export interface Plot {
  size: PlotSize
  /**
   * ปลูกอะไรอยู่ null คือแปลงว่าง
   *
   * ทั้งแปลงปลูกพืชชนิดเดียวกันหมด ไม่ได้แยกทีละช่อง
   * ตั้งใจแบบนี้เพราะโจทย์ที่อยากได้คือ "แปลง 6 คูณ 8 ได้กี่ต้น"
   * ถ้าปลูกคละชนิดในแปลงเดียว การนับจะกลายเป็นการนับทีละช่องแทนการคูณ
   */
  planting: Planting | null
}

/** ฝูงสัตว์หนึ่งชนิด */
export interface Herd {
  animal: AnimalId
  count: number
  /** วันนี้ได้อาหารครบหรือยัง */
  fedToday: boolean
}

/** สินค้าในคลังที่รอขาย */
export type StockKey = CropId | 'egg' | 'milk' | 'fishmeat'

export interface FarmState {
  seed: string
  grade: Grade
  /** วันที่เท่าไรแล้ว เริ่มที่ 1 */
  day: number
  energy: number
  coins: number
  /** จำนวนครอบครัวในโดม เพิ่มขึ้นเมื่อผู้เล่นเลือกเปิดประตูรับคน */
  families: number
  plots: Plot[]
  herds: Herd[]
  /** อาหารสัตว์คงเหลือ หน่วยกิโลกรัม รวมเศษที่เหลือจากเมื่อวาน */
  feed: number
  /** อาคารที่สร้างแล้ว นับเป็นจำนวนหลังต่อรหัสอาคาร */
  buildings: Record<string, number>
  /** ทรัพยากรคงเหลือในถัง */
  resources: Record<ResourceId, number>
  /** ของในคลังที่รอขาย */
  stock: Record<string, number>
  /** จำนวนวันที่ปิดสมุดบัญชีได้ถูกทุกช่องตั้งแต่ครั้งแรก */
  perfectDays: number
  /** จำนวนช่องในสมุดบัญชีที่เคยตอบ และที่ตอบถูกครั้งแรก ใช้สรุปให้ครูดู */
  ledgerAnswered: number
  ledgerCorrect: number
}

/** จำนวนครอบครัวที่โดมมีตอนเริ่มเกม */
export const STARTING_FAMILIES = 6

/**
 * เงินตั้งต้น
 *
 * ต้องพอปลูกเต็มแปลงแรกด้วยพืชที่แพงที่สุด แล้วยังเหลือติดกระเป๋า
 * เคยตั้งไว้ 260 ซึ่งพอปลูกได้พอดีเป๊ะแล้วเหลือ 20 เหรียญ
 * ผลจากการจำลองคือถ้าเด็กเลือกส่งผลผลิตเข้าคลังอาหารแทนการขาย
 * จะไม่มีเงินซื้อเมล็ดรอบต่อไปเลย แล้วฟาร์มตันถาวรตั้งแต่วันที่ห้า
 * ซึ่งเป็นการลงโทษการตัดสินใจที่เกมเองก็บอกว่าเป็นทางเลือกที่ถูกต้อง
 */
export const STARTING_COINS = 400

/** อาหารสัตว์ตั้งต้น */
export const STARTING_FEED = 0

/** ทรัพยากรตั้งต้น ตั้งไว้ที่ราวสามในสี่ของถัง ให้พอมีเวลาตั้งตัว */
export const STARTING_RESOURCE_RATIO = 0.75
