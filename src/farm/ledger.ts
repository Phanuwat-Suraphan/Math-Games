/**
 * สมุดบัญชีฟาร์ม — ตัวที่ทำให้วันผ่านไป
 *
 * นี่คือหัวใจของการออกแบบทั้งเกม จึงขออธิบายยาวหน่อย
 *
 * ในเกมต้นแบบ (Stardew Valley, Heartopia, Fallout Shelter) วันผ่านไปด้วยนาฬิกา
 * ผู้เล่นรอ แล้ววันใหม่ก็มา ซึ่งใช้กับคาบเรียนไม่ได้ เพราะพืชที่ใช้เวลาสี่ชั่วโมง
 * คือพืชที่เด็กไม่มีวันได้เก็บเกี่ยว และเพราะการรอคือเวลาที่ว่างเปล่า
 *
 * ที่นี่วันผ่านไปเมื่อ "ปิดบัญชี" ของวันนั้นได้ครบ
 * แต่สิ่งที่สำคัญกว่าคือ ตัวเลขในสมุดบัญชีไม่ใช่โจทย์ที่แปะไว้เฉย ๆ
 * มันคือตัวเลขจริงของฟาร์มวันนั้น และเป็นตัวเลขที่ถูกนำไปใช้ต่อจริง ๆ
 *
 * ความต่างระหว่างสองอย่างนี้คือความต่างระหว่าง
 * "ตอบโจทย์ให้ถูกก่อนถึงจะได้เล่นต่อ" กับ "คิดเลขคือการเล่น"
 * อย่างแรกสอนเด็กว่าคณิตศาสตร์เป็นภาษีที่ต้องจ่าย
 * อย่างหลังคือสิ่งที่ Heartopia ทำได้ดีโดยไม่ต้องมีโจทย์สักข้อ
 *
 * กติกาสำคัญอีกข้อ: ตอบผิดแล้วเกมยังใช้ค่าที่ถูกเสมอ ไม่ใช่ค่าที่เด็กตอบ
 * เพราะการเอาคำตอบผิดไปใช้จริง เท่ากับลงโทษสองครั้งสำหรับความผิดพลาดครั้งเดียว
 * และทำให้ฟาร์มของเด็กที่ยังคิดไม่คล่องพังลงเรื่อย ๆ จนเลิกอยากเล่น
 * สิ่งที่ตอบถูกแล้วได้คือแรงเพิ่มในวันรุ่งขึ้น ซึ่งเป็นรางวัล ไม่ใช่การไม่ถูกลงโทษ
 */

import {
  BUILDINGS,
  ENERGY_BONUS_PERFECT_LEDGER,
  ENERGY_PER_DAY,
  FEED_PRICE,
  KITCHEN_COST,
  RESOURCES,
  craftKey,
  findAnimal,
  findCrop,
  findRecipe,
  findResource,
} from './types'
import { marketPrice } from './market'
import { applyEvent, eventForDay } from './events'
import type { DailyEvent } from './events'
import type { AnimalId, CropId, FarmState, ResourceId } from './types'
import {
  FOOD_PER_PRODUCE,
  dailyConsumption,
  dailyProduction,
  isReady,
  nextPlotCost,
  plotCells,
  productKey,
  tightestResource,
} from './engine'

/**
 * ความจุขั้นต่ำของถังที่จะเอามาออกโจทย์ ป.4/8
 *
 * ตัวชี้วัดระบุว่าเป็นจำนวนนับที่มากกว่า 100,000 จึงต้องกรองด้วยตัวเลขนี้
 * ไม่ใช่เลือกถังไหนก็ได้ที่มีอยู่
 */
const UNKNOWN_MIN_CAPACITY = 100_000

/** แปลงหนึ่งแปลงที่ถึงเวลาเก็บเกี่ยวเมื่อปิดวัน */
export interface HarvestPlan {
  plotIndex: number
  crop: CropId
  cols: number
  rows: number
  /** จำนวนต้นที่เก็บได้ เท่ากับ cols คูณ rows */
  count: number
}

/** การแบ่งอาหารให้สัตว์หนึ่งฝูง */
export interface FeedPlan {
  animal: AnimalId
  herdCount: number
  /** อาหารที่เหลืออยู่ตอนถึงคิวของฝูงนี้ */
  available: number
  /** กินตัวละกี่กิโลกรัมต่อวัน */
  perAnimal: number
  /** อาหารเท่านี้เลี้ยงได้มากที่สุดกี่ตัว คือผลหาร */
  capacity: number
  /** เศษที่เหลือจากการหาร */
  remainder: number
  /** เลี้ยงจริงกี่ตัว เท่ากับจำนวนที่น้อยกว่าระหว่างฝูงกับที่เลี้ยงได้ */
  fed: number
  /** อาหารที่เหลือส่งต่อให้ฝูงถัดไปหรือเก็บไว้พรุ่งนี้ */
  leftover: number
  /** ผลผลิตที่ได้ */
  produced: number
}

/** งานแปรรูปหนึ่งชุดที่จะเสร็จเมื่อปิดวัน */
export interface CraftPlan {
  recipe: string
  units: number
  inputPerUnit: number
  /** วัตถุดิบที่ใช้ไปทั้งหมด เท่ากับจำนวนชิ้นคูณอัตราส่วน */
  inputsUsed: number
  /** ราคาวัตถุดิบต่อชิ้นในวันนี้ */
  inputPrice: number
  /** ถ้าขายวัตถุดิบสดจะได้กี่บาท */
  rawValue: number
  /** ขายผลิตภัณฑ์ได้กี่บาท */
  craftValue: number
  /** แปรรูปแล้วได้เพิ่มกี่บาท */
  gain: number
}

/** ทรัพยากรหนึ่งอย่างเมื่อจบวัน */
export interface ResourcePlan {
  id: ResourceId
  before: number
  production: number
  consumption: number
  /** ค่าที่ถูกต้องก่อนตัดที่ศูนย์และเพดาน ใช้เป็นคำตอบของโจทย์ */
  raw: number
  /** ค่าที่เก็บจริงหลังตัดที่ศูนย์และเพดานแล้ว */
  after: number
}

export interface DayPlan {
  day: number
  /** เหตุการณ์ของวันนี้ ตัวเลขในแผนนี้ผ่านผลของเหตุการณ์มาแล้ว */
  event: DailyEvent
  harvests: HarvestPlan[]
  crafts: CraftPlan[]
  /** ผลผลิตพืชที่จะเข้าคลัง รวมตามชนิด */
  cropYield: { crop: CropId; count: number }[]
  feeding: FeedPlan[]
  feedLeftover: number
  resources: ResourcePlan[]
  /** ทรัพยากรที่ตึงที่สุด ใช้ทำแถวพยากรณ์ */
  tightest: ResourceId
  /** ทรัพยากรที่ตึงที่สุดจะอยู่ได้อีกกี่วันหลังจบวันนี้ */
  daysLeft: number
}

/**
 * คำนวณว่าเมื่อปิดวันแล้วจะเกิดอะไรขึ้น
 *
 * ฟังก์ชันนี้ไม่แก้ค่าอะไรในฟาร์มเลย ตั้งใจให้เป็นแบบนั้น
 * เพราะต้องเรียกได้สองครั้งโดยได้ผลเหมือนกัน ครั้งแรกเพื่อสร้างโจทย์
 * ครั้งที่สองเพื่อนำไปใช้จริง ถ้าฟังก์ชันนี้แก้ค่าไปด้วย
 * การเรียกสองครั้งจะได้คนละคำตอบ แล้วโจทย์กับผลลัพธ์จะไม่ตรงกัน
 */
export function planDay(farm: FarmState): DayPlan {
  const harvests: HarvestPlan[] = []
  farm.plots.forEach((plot, index) => {
    if (!plot.planting || !isReady(plot)) return
    harvests.push({
      plotIndex: index,
      crop: plot.planting.crop,
      cols: plot.size.cols,
      rows: plot.size.rows,
      count: plotCells(plot),
    })
  })

  const yieldMap = new Map<CropId, number>()
  for (const harvest of harvests) {
    yieldMap.set(harvest.crop, (yieldMap.get(harvest.crop) ?? 0) + harvest.count)
  }

  // อาหารสัตว์ถูกแบ่งไปทีละฝูงตามลำดับที่ซื้อมา ถุงเดียวกันใช้ร่วมกันทั้งฟาร์ม
  const feeding: FeedPlan[] = []
  let feedLeft = farm.feed
  for (const herd of farm.herds) {
    const animal = findAnimal(herd.animal)
    const capacity = Math.floor(feedLeft / animal.feedPerDay)
    const remainder = feedLeft % animal.feedPerDay
    const fed = Math.min(capacity, herd.count)
    const leftover = feedLeft - fed * animal.feedPerDay
    feeding.push({
      animal: herd.animal,
      herdCount: herd.count,
      available: feedLeft,
      perAnimal: animal.feedPerDay,
      capacity,
      remainder,
      fed,
      leftover,
      produced: fed * animal.yieldPerDay,
    })
    feedLeft = leftover
  }

  const crafts: CraftPlan[] = farm.crafting
    .filter((order) => order.units > 0)
    .map((order) => {
      const recipe = findRecipe(order.recipe)
      const inputsUsed = order.units * recipe.inputPerUnit
      const inputPrice = marketPrice(farm, recipe.input)
      const rawValue = inputsUsed * inputPrice
      const craftValue = order.units * recipe.price
      return {
        recipe: order.recipe,
        units: order.units,
        inputPerUnit: recipe.inputPerUnit,
        inputsUsed,
        inputPrice,
        rawValue,
        craftValue,
        gain: craftValue - rawValue,
      }
    })

  /*
   * เหตุการณ์ของวันนี้มีผลกับตัวเลขของวันนี้เท่านั้น
   *
   * ตั้งใจไม่ให้ไปแตะ dailyProduction กับ dailyConsumption ที่เป็นอัตราปกติ
   * เพราะสองตัวนั้นถูกใช้คำนวณว่า "ของจะพอใช้อีกกี่วัน" ซึ่งเป็นการพยากรณ์
   * การพยากรณ์ต้องอยู่บนอัตราปกติ ไม่ใช่บนเหตุการณ์ของวันเดียว
   * ไม่งั้นตัวเลขวันที่เหลือจะกระโดดไปมาทุกวันจนเด็กวางแผนอะไรไม่ได้เลย
   *
   * ผลคือเหตุการณ์กลายเป็น "ส่วนต่างจากที่คาดไว้" ซึ่งเป็นที่มาของความลุ้น
   * และเป็นตัวเลขที่เด็กเห็นได้ในสมุดบัญชีของวันนั้นตรง ๆ
   */
  const event = eventForDay(farm)
  const adjusted = applyEvent(event, dailyProduction(farm), dailyConsumption(farm))
  const production = adjusted.production
  const consumption = adjusted.consumption
  const resources: ResourcePlan[] = RESOURCES.map((spec) => {
    const before = farm.resources[spec.id]
    const raw = before + production[spec.id] - consumption[spec.id]
    return {
      id: spec.id,
      before,
      production: production[spec.id],
      consumption: consumption[spec.id],
      raw,
      after: Math.max(0, Math.min(spec.capacity, raw)),
    }
  })

  const tightest = tightestResource(farm)
  const tightestPlan = resources.find((entry) => entry.id === tightest)
  const net = production[tightest] - consumption[tightest]
  const daysLeft =
    net >= 0 ? Infinity : Math.floor((tightestPlan?.after ?? 0) / -net)

  return {
    day: farm.day,
    event,
    harvests,
    crafts,
    cropYield: [...yieldMap.entries()].map(([crop, count]) => ({ crop, count })),
    feeding,
    feedLeftover: feedLeft,
    resources,
    tightest,
    daysLeft,
  }
}

/* ------------------------------------------------------------------ *
 * โจทย์ในสมุดบัญชี
 * ------------------------------------------------------------------ */

export interface LedgerField {
  key: string
  label: string
  answer: number
  unit: string
}

export type LedgerKind =
  | 'harvest'
  | 'feed'
  | 'craft'
  | 'resource'
  | 'forecast'
  | 'percent'
  | 'average'
  | 'build'
  | 'unknown'

/** ตัวเลือกหนึ่งอันในแถวสร้างโจทย์เอง ป้ายกำกับคือเรื่องราว ค่าคือตัวเลขจริง */
export interface BuilderOption {
  key: string
  label: string
  value: number
}

/**
 * แถวที่เด็กสร้างโจทย์ของตัวเอง ตามตัวชี้วัด ป.4/12
 *
 * ทำไมต้องมีแถวแบบนี้ในฟาร์มด้วย ทั้งที่ Safe Zone มีภารกิจสร้างโจทย์อยู่แล้ว
 *
 * เพราะภารกิจนั้นตอบได้ครั้งเดียวต่อการเล่นหนึ่งรอบ
 * แผงคุณครูต้องเห็นอย่างน้อยสามข้อถึงจะตัดสินได้ว่าเด็กผ่านตัวชี้วัดหรือยัง
 * แปลว่าครูต้องให้เด็กเล่น Safe Zone จบสามรอบ เพื่อวัดตัวชี้วัดเดียว
 * ซึ่งไม่มีคาบเรียนไหนทำได้ ตัวชี้วัดข้อนี้จึงกลายเป็นข้อที่วัดไม่ได้จริง
 *
 * ที่นี่เด็กสร้างโจทย์ใหม่ได้ทุกวันที่เก็บเกี่ยว จากตัวเลขของฟาร์มตัวเอง
 * และเป็นตัวเลขจริงทั้งหมด ไม่ใช่ตัวเลขที่แต่งขึ้นมาให้เลือก
 */
export interface BuilderSpec {
  /** เงินที่โดมมีอยู่จริงตอนนี้ ใช้เป็นตัวตั้งของโจทย์ */
  coins: number
  /** เลือกว่าจะขายอะไร ค่าคือเงินที่จะได้จริงตามราคาตลาดวันนี้ */
  sell: BuilderOption[]
  /** เลือกว่าจะเอาเงินไปซื้ออะไร ค่าคือราคาจริงของสิ่งนั้น */
  spend: BuilderOption[]
}

/**
 * คำตอบของโจทย์ที่เด็กสร้างเอง
 *
 * บวกก่อนลบเสมอ และตัวเลือกฝั่งจ่ายทุกอันถูกคัดมาให้ไม่เกินเงินตั้งต้นบวกรายรับที่น้อยที่สุด
 * จึงไม่มีทางที่เด็กจะเลือกชุดที่ได้คำตอบติดลบ ซึ่งเป็นจำนวนที่ ป.4 ยังไม่เรียน
 * และเป็นความผิดของคนออกแบบโจทย์ ไม่ใช่ของเด็กที่เลือก
 */
export function builderAnswer(spec: BuilderSpec, sell: number, spend: number): number {
  return spec.coins + sell - spend
}

export interface LedgerRow {
  id: string
  kind: LedgerKind
  /** ตัวชี้วัดที่แถวนี้ฝึก แสดงให้ครูเห็นได้ */
  skill: string
  prompt: string
  fields: LedgerField[]
  /** วิธีคิดทีละขั้น แสดงเมื่อตอบผิด */
  working: string[]
  /**
   * มีเฉพาะแถวชนิด build
   *
   * แถวนี้ไม่มีคำตอบตายตัวใน fields เพราะคำตอบขึ้นกับสิ่งที่เด็กเลือก
   * หน้าจอจึงต้องคิดคำตอบเองด้วย builderAnswer หลังเด็กเลือกครบ
   */
  builder?: BuilderSpec
}

/**
 * ทรัพยากรที่โจทย์สองขั้นตอนจะถามในวันนั้น
 *
 * มีสองเป้าหมายที่ขัดกันเอง และต้องได้ทั้งคู่
 *
 * เป้าหมายแรก วันที่มีเหตุการณ์แตะทรัพยากรตัวไหน ควรได้คำนวณตัวนั้น
 * ตอนแรกปล่อยให้เหตุการณ์กับโจทย์เลือกกันคนละที ผลคือแทบไม่เคยตรงกัน
 * วันที่คลื่นความร้อนทำให้ใช้น้ำมากขึ้น โจทย์กลับไปถามเรื่องอากาศ
 * เหตุการณ์จึงยังแยกขาดจากคณิตศาสตร์ ต่างกันแค่คราวนี้ตัวเลขขยับจริง
 *
 * เป้าหมายที่สอง ต้องไม่ถามทรัพยากรเดิมซ้ำ ๆ ติดกัน
 * เพราะแถวที่หน้าตาเหมือนกันเป๊ะติดกัน เด็กจะเลิกอ่านโจทย์แล้วทำตามรูปแบบ
 * ซึ่งไม่ใช่การคิด เป้าหมายนี้มีมาก่อน และชุดทดสอบเฝ้าไว้อยู่แล้ว
 *
 * ทางออกคือยึดเหตุการณ์เป็นหลัก เว้นแต่จะไปซ้ำกับที่ถามไปเมื่อวาน
 * แล้วจึงหมุนตามเลขวันแทน มองย้อนหลังชั้นเดียวพอ ไม่ต้องไล่ตั้งแต่วันแรก
 */
function spotlightOf(farm: FarmState, day: number): ResourceId | null {
  const event = eventForDay({ ...farm, day })
  return event.production?.id ?? event.consumption?.id ?? null
}

function rotationOf(day: number): ResourceId {
  const spec = RESOURCES[(day - 1) % RESOURCES.length]
  return (spec ?? RESOURCES[0]).id
}

function focusResourceFor(farm: FarmState, day: number): ResourceId {
  /*
   * ไล่จากวันแรกขึ้นมา เพราะการตัดสินของวันนี้ขึ้นกับที่ถามไปเมื่อวานจริง ๆ
   * ไม่ใช่ขึ้นกับเหตุการณ์ของเมื่อวาน สองอย่างนี้ไม่เหมือนกัน
   * เมื่อวานอาจโดนสลับไปหมุนตามเลขวันแล้วก็ได้ ถ้าตัวมันเองไปซ้ำกับวันก่อนหน้า
   * เขียนครั้งแรกโดยมองย้อนแค่เหตุการณ์ของเมื่อวาน แล้วยังถามน้ำสองวันติดอยู่ดี
   */
  let previous: ResourceId | null = null
  let current: ResourceId = rotationOf(1)
  for (let step = 1; step <= day; step += 1) {
    const spotlight = spotlightOf(farm, step)
    current =
      spotlight && spotlight !== previous ? spotlight : rotationOf(step)
    if (current === previous) current = rotationOf(step + 1)
    previous = current
  }
  return current
}

function withCommas(value: number): string {
  return value.toLocaleString('en-US')
}

/**
 * สร้างแถวคำถามจากแผนของวันนั้น
 *
 * แถวจะมีเฉพาะเรื่องที่เกิดขึ้นจริงในวันนั้น ไม่ใช่โจทย์สุ่มมาแปะ
 * ถ้าวันนี้ไม่ได้เก็บเกี่ยวก็ไม่มีแถวเก็บเกี่ยว ถ้าไม่มีสัตว์ก็ไม่มีแถวอาหารสัตว์
 * ผลคือเด็กที่ทำอะไรเยอะในวันนั้น จะได้คิดเลขเยอะกว่า ซึ่งยุติธรรมและสมเหตุสมผล
 */
export function buildLedger(farm: FarmState, plan: DayPlan): LedgerRow[] {
  const rows: LedgerRow[] = []

  // ---- เก็บเกี่ยว: การคูณ ----
  for (const harvest of plan.harvests.slice(0, 2)) {
    const crop = findCrop(harvest.crop)
    rows.push({
      id: `harvest-${harvest.plotIndex}`,
      kind: 'harvest',
      skill: 'การคูณ · พื้นที่',
      prompt: `แปลงที่ ${harvest.plotIndex + 1} ปลูก${crop.name} เต็มแปลงขนาด ${harvest.cols} × ${harvest.rows} ช่อง วันนี้เก็บได้กี่ต้น`,
      fields: [
        { key: 'count', label: 'จำนวนต้นที่เก็บได้', answer: harvest.count, unit: 'ต้น' },
      ],
      working: [
        `แปลงกว้าง ${harvest.cols} ช่อง ยาว ${harvest.rows} ช่อง`,
        `${harvest.cols} × ${harvest.rows} = ${harvest.count} ต้น`,
      ],
    })
  }

  // ---- อาหารสัตว์: การหารและเศษ ----
  for (const feed of plan.feeding) {
    if (feed.available <= 0 || feed.herdCount <= 0) continue
    const animal = findAnimal(feed.animal)
    rows.push({
      id: `feed-${feed.animal}`,
      kind: 'feed',
      skill: 'การหารและเศษ',
      prompt: `อาหารสัตว์เหลือ ${withCommas(feed.available)} กิโลกรัม ${animal.name}กินวันละตัวละ ${feed.perAnimal} กิโลกรัม อาหารเท่านี้เลี้ยง${animal.name}ได้มากที่สุดกี่ตัว และเหลือเศษกี่กิโลกรัม`,
      fields: [
        { key: 'capacity', label: `เลี้ยง${animal.name}ได้`, answer: feed.capacity, unit: 'ตัว' },
        { key: 'remainder', label: 'เหลือเศษ', answer: feed.remainder, unit: 'กก.' },
      ],
      working: [
        `${withCommas(feed.available)} ÷ ${feed.perAnimal} = ${feed.capacity} เศษ ${feed.remainder}`,
        `แปลว่าเลี้ยงได้ ${feed.capacity} ตัว และเหลืออาหาร ${feed.remainder} กิโลกรัม`,
        feed.capacity < feed.herdCount
          ? `ฝูงมี ${feed.herdCount} ตัว อาหารไม่พอ วันนี้จึงมี ${feed.herdCount - feed.capacity} ตัวที่ยังไม่ได้กิน`
          : `ฝูงมี ${feed.herdCount} ตัว อาหารพอทุกตัว`,
      ],
    })
  }

  /*
   * ---- โรงแปรรูป: กำไรขาดทุน ----
   *
   * นี่คือแถวที่ตรงกับหัวใจของบทเรียนมากที่สุด และเป็นแถวเดียวที่ตอบได้
   * แล้วเด็กจะ "อยากทำอีก" เพราะเห็นกับตาว่าการคำนวณทำให้ได้เงินเพิ่มเท่าไร
   *
   * ข้ามแถวไปเลยถ้าแปรรูปแล้วขาดทุน ซึ่งไม่ควรเกิดกับราคาชุดปัจจุบัน
   * แต่ถ้าวันหนึ่งมีคนปรับราคาจนขาดทุนจริง คำตอบจะติดลบ
   * แล้วช่องกรอกที่รับเฉพาะตัวเลขจะทำให้ปิดวันไม่ได้ตลอดกาล
   * เคยเกิดมาแล้วกับแถวทรัพยากร จึงกันไว้ตั้งแต่ต้นในแถวนี้
   */
  for (const craft of plan.crafts.slice(0, 2)) {
    if (craft.gain <= 0) continue
    const recipe = findRecipe(craft.recipe)
    const crop = findCrop(recipe.input)
    rows.push({
      id: `craft-${craft.recipe}`,
      kind: 'craft',
      skill: 'การคูณ · กำไรขาดทุน',
      prompt: `วันนี้แปรรูป${crop.name}เป็น${recipe.name} ${craft.units} ชิ้น ใช้${crop.name}ชิ้นละ ${craft.inputPerUnit} ผล · ถ้าขาย${crop.name}สดวันนี้ได้ผลละ ${withCommas(craft.inputPrice)} บาท แต่${recipe.name}ขายได้ชิ้นละ ${withCommas(recipe.price)} บาท`,
      fields: [
        { key: 'inputs', label: `ใช้${crop.name}ไปทั้งหมด`, answer: craft.inputsUsed, unit: 'ผล' },
        { key: 'gain', label: 'แปรรูปแล้วได้เงินเพิ่ม', answer: craft.gain, unit: 'บาท' },
      ],
      working: [
        `ใช้วัตถุดิบ · ${craft.units} × ${craft.inputPerUnit} = ${withCommas(craft.inputsUsed)} ผล`,
        `ขายสด · ${withCommas(craft.inputsUsed)} × ${withCommas(craft.inputPrice)} = ${withCommas(craft.rawValue)} บาท`,
        `แปรรูป · ${craft.units} × ${withCommas(recipe.price)} = ${withCommas(craft.craftValue)} บาท`,
        `ได้เพิ่ม · ${withCommas(craft.craftValue)} − ${withCommas(craft.rawValue)} = ${withCommas(craft.gain)} บาท`,
      ],
    })
  }

  /*
   * ---- ทรัพยากรโดม: โจทย์สองขั้นตอน ----
   *
   * เลือกมาวันละอย่างเดียว หมุนเวียนไปตามเลขวัน แทนที่จะถามทั้งสี่อย่างทุกวัน
   * เพราะสี่แถวที่หน้าตาเหมือนกันเป๊ะติดกัน เด็กจะเลิกอ่านโจทย์ตั้งแต่แถวที่สอง
   * แล้วทำตามรูปแบบไปเรื่อย ๆ ซึ่งไม่ใช่การคิด
   */
  const focusId = focusResourceFor(farm, farm.day)
  const focus = plan.resources.find((entry) => entry.id === focusId)
  if (focus) {
    const spec = findResource(focus.id)
    /*
     * ถ้าเหตุการณ์ของวันนี้ไปแตะทรัพยากรตัวนี้ ให้บอกไว้ในวิธีคิดด้วย
     *
     * เพราะเด็กที่จำได้ว่าเมื่อวานผลิตไฟได้เท่าไร แล้ววันนี้เลขไม่ตรง
     * จะสรุปว่าตัวเองจำผิดหรือเกมคำนวณผิด ทั้งที่ทั้งสองอย่างไม่จริง
     * บรรทัดเดียวที่โยงเรื่องเข้ากับตัวเลข ทำให้ความประหลาดใจกลายเป็นความเข้าใจ
     */
    const touched =
      plan.event.production?.id === focus.id || plan.event.consumption?.id === focus.id
    const eventNote = touched
      ? [`${plan.event.emoji} ${plan.event.title} · ${plan.event.effect}`]
      : []
    const available = focus.before + focus.production
    const lead = `เมื่อเช้าโดมมี${spec.name} ${withCommas(focus.before)} ${spec.unit} วันนี้ผลิตเพิ่มได้ ${withCommas(focus.production)} ${spec.unit} และต้องใช้ ${withCommas(focus.consumption)} ${spec.unit}`

    /*
     * ถามคนละคำถามเมื่อทรัพยากรไม่พอ
     *
     * ปกติถามว่า "สิ้นวันจะเหลือเท่าไร" ซึ่งใช้ได้ตราบใดที่ยังเหลือ
     * แต่วันที่ใช้มากกว่าที่มี คำตอบจะติดลบ ซึ่งเป็นปัญหาสองชั้นพร้อมกัน
     * ชั้นแรก ป.4 ยังไม่เรียนจำนวนเต็มลบ ชั้นที่สองหนักกว่า คือช่องกรอกคำตอบ
     * รับเฉพาะตัวเลข เด็กจึงพิมพ์คำตอบที่ถูกไม่ได้เลย แล้วปิดวันไม่ได้ตลอดกาล
     * เกมค้างถาวรโดยที่เด็กไม่ได้ทำอะไรผิด
     *
     * ถามว่า "ขาดอยู่เท่าไร" แทน ได้คำตอบที่เป็นจำนวนนับ ยังเป็นการลบสองขั้นเหมือนเดิม
     * และตรงกับสิ่งที่เด็กต้องรู้จริง ๆ ในสถานการณ์นั้นมากกว่าด้วย
     */
    if (focus.raw >= 0) {
      rows.push({
        id: `resource-${focus.id}`,
        kind: 'resource',
        skill: 'โจทย์ปัญหาสองขั้นตอน · จำนวนนับหลักหมื่นขึ้นไป',
        prompt: `${lead} สิ้นวันจะเหลือเท่าไร`,
        fields: [
          { key: 'after', label: `${spec.name}คงเหลือ`, answer: focus.raw, unit: spec.unit },
        ],
        working: [
          ...eventNote,
          `ขั้นที่ 1 · ${withCommas(focus.before)} + ${withCommas(focus.production)} = ${withCommas(available)}`,
          `ขั้นที่ 2 · ${withCommas(available)} − ${withCommas(focus.consumption)} = ${withCommas(focus.raw)}`,
        ],
      })
    } else {
      rows.push({
        id: `resource-${focus.id}`,
        kind: 'resource',
        skill: 'โจทย์ปัญหาสองขั้นตอน · จำนวนนับหลักหมื่นขึ้นไป',
        prompt: `${lead} วันนี้${spec.name}ไม่พอ ขาดอยู่กี่${spec.unit}`,
        fields: [
          { key: 'short', label: `${spec.name}ที่ขาด`, answer: -focus.raw, unit: spec.unit },
        ],
        working: [
          ...eventNote,
          `ขั้นที่ 1 · ${withCommas(focus.before)} + ${withCommas(focus.production)} = ${withCommas(available)}`,
          `ขั้นที่ 2 · ${withCommas(focus.consumption)} − ${withCommas(available)} = ${withCommas(-focus.raw)}`,
          `แปลว่าต้องผลิต${spec.name}เพิ่มอีกวันละ ${withCommas(-focus.raw)} ${spec.unit} ถึงจะพอ`,
        ],
      })
    }
  }

  /*
   * ---- พยากรณ์: การหาร ----
   *
   * แถวนี้โผล่เฉพาะตอนที่มีทรัพยากรตึงจริง ๆ ซึ่งเป็นตอนที่คำถาม
   * "เราจะอยู่ได้อีกกี่วัน" มีความหมาย ถ้าถามทุกวันตอนที่ทุกอย่างยังเหลือเฟือ
   * มันจะกลายเป็นโจทย์ประจำที่ตอบแล้วไม่มีอะไรเกิดขึ้น
   */
  if (Number.isFinite(plan.daysLeft) && plan.daysLeft <= 12) {
    const spec = findResource(plan.tightest)
    const tight = plan.resources.find((entry) => entry.id === plan.tightest)
    const net = (tight?.consumption ?? 0) - (tight?.production ?? 0)
    rows.push({
      id: `forecast-${plan.tightest}`,
      kind: 'forecast',
      skill: 'การหาร · การประมาณค่า',
      prompt: `สิ้นวันนี้โดมจะเหลือ${spec.name} ${withCommas(tight?.after ?? 0)} ${spec.unit} และขาดวันละ ${withCommas(net)} ${spec.unit} ถ้าไม่ทำอะไรเลย จะอยู่ได้อีกกี่วัน`,
      fields: [
        { key: 'days', label: 'อยู่ได้อีก', answer: plan.daysLeft, unit: 'วัน' },
      ],
      working: [
        `${withCommas(tight?.after ?? 0)} ÷ ${withCommas(net)} = ${plan.daysLeft} วัน (ปัดลง เพราะวันที่ไม่เต็มวันก็ยังไม่ครบวัน)`,
      ],
    })
  }

  // ---- ป.6 ร้อยละของมูลค่าที่เพิ่มขึ้นจากการแปรรูป ----
  const firstCraft = plan.crafts.find((entry) => entry.gain > 0 && entry.rawValue > 0)
  if (farm.grade >= 6 && firstCraft) {
    const recipe = findRecipe(firstCraft.recipe)
    rows.push({
      id: `craft-percent-${firstCraft.recipe}`,
      kind: 'percent',
      skill: 'ร้อยละ · มูลค่าเพิ่ม',
      prompt: `${recipe.name}ชุดนี้ ถ้าขายวัตถุดิบสดได้ ${withCommas(firstCraft.rawValue)} บาท แต่แปรรูปแล้วขายได้ ${withCommas(firstCraft.craftValue)} บาท มูลค่าเพิ่มขึ้นร้อยละเท่าไร (ปัดเป็นจำนวนเต็ม)`,
      fields: [
        {
          key: 'percent',
          label: 'มูลค่าเพิ่มขึ้นร้อยละ',
          answer: Math.round((firstCraft.gain / firstCraft.rawValue) * 100),
          unit: '%',
        },
      ],
      working: [
        `ส่วนที่เพิ่ม · ${withCommas(firstCraft.craftValue)} − ${withCommas(firstCraft.rawValue)} = ${withCommas(firstCraft.gain)} บาท`,
        `เทียบกับของเดิม · ${withCommas(firstCraft.gain)} ÷ ${withCommas(firstCraft.rawValue)} × 100 = ${Math.round((firstCraft.gain / firstCraft.rawValue) * 100)}%`,
      ],
    })
  }

  // ---- ป.6 เพิ่มร้อยละของถัง ----
  if (farm.grade >= 6 && focus) {
    const spec = findResource(focus.id)
    const percent = Math.round((focus.after / spec.capacity) * 100)
    rows.push({
      id: `percent-${focus.id}`,
      kind: 'percent',
      skill: 'ร้อยละ',
      prompt: `ถัง${spec.name}จุได้เต็มที่ ${withCommas(spec.capacity)} ${spec.unit} สิ้นวันนี้มีอยู่ ${withCommas(focus.after)} ${spec.unit} คิดเป็นร้อยละเท่าไรของถัง (ปัดเป็นจำนวนเต็ม)`,
      fields: [{ key: 'percent', label: 'เต็มถังร้อยละ', answer: percent, unit: '%' }],
      working: [
        `${withCommas(focus.after)} ÷ ${withCommas(spec.capacity)} × 100 = ${percent}%`,
      ],
    })
  }

  // ---- ป.5 ขึ้นไป เพิ่มค่าเฉลี่ยผลผลิตเมื่อมีสัตว์ที่ให้ผลผลิตแล้ว ----
  const produced = plan.feeding.reduce((total, entry) => total + entry.produced, 0)
  const fedAnimals = plan.feeding.reduce((total, entry) => total + entry.fed, 0)
  if (farm.grade >= 5 && produced > 0 && fedAnimals > 1 && produced % fedAnimals === 0) {
    rows.push({
      id: 'average-product',
      kind: 'average',
      skill: 'ค่าเฉลี่ย',
      prompt: `วันนี้สัตว์ที่ได้กินอาหาร ${fedAnimals} ตัว ให้ผลผลิตรวม ${produced} ชิ้น เฉลี่ยแล้วตัวละกี่ชิ้น`,
      fields: [{ key: 'average', label: 'เฉลี่ยตัวละ', answer: produced / fedAnimals, unit: 'ชิ้น' }],
      working: [`${produced} ÷ ${fedAnimals} = ${produced / fedAnimals} ชิ้นต่อตัว`],
    })
  }

  /*
   * ---- ป.4/8 หาค่าตัวไม่ทราบค่าในประโยคสัญลักษณ์ ----
   *
   * ทำไมต้องมีแถวนี้ ทั้งที่ Safe Zone มีภารกิจปรับสมดุลอากาศอยู่แล้ว
   *
   * ด้วยเหตุผลเดียวกับแถวสร้างโจทย์เอง ภารกิจนั้นตอบได้ครั้งเดียวต่อการเล่นหนึ่งรอบ
   * ครูจึงต้องให้เด็กเล่นจบสามรอบเพื่อวัดตัวชี้วัดเดียว ซึ่งไม่มีคาบไหนทำได้
   * ตอนแก้ปัญหานี้ให้ ป.4/12 รอบก่อน มองข้ามไปว่า ป.4/8 เป็นแบบเดียวกันเป๊ะ
   *
   * ความจุถังของโดมเป็นตัวเลขที่เหมาะกับตัวชี้วัดนี้พอดี
   * เพราะถังไฟฟ้าจุ 160,000 และถังน้ำจุ 120,000 ซึ่งเกินหนึ่งแสน
   * ตรงกับข้อความของตัวชี้วัดที่ระบุว่า "จำนวนนับที่มากกว่า 100,000"
   *
   * จึงใช้เฉพาะถังที่จุเกินหนึ่งแสนจริง ๆ ไม่รวมถังอากาศที่จุ 90,000
   * และถังอาหารที่จุ 6,000 ทั้งสองถังนั้นเป็นโจทย์ลบที่ถูกต้องอยู่แล้ว
   * แต่ไม่ใช่โจทย์ของตัวชี้วัดข้อนี้ และแผงคุณครูจะนับให้เป็นข้อของ ป.4/8
   * ซึ่งกลายเป็นการรายงานให้ครูผิด ไม่ใช่แค่โจทย์ที่ง่ายไปหน่อย
   *
   * ใช้ถังคนละใบกับแถวสองขั้นตอนข้างบน เพื่อไม่ให้ถามเรื่องถังใบเดียวกันสองรอบในวันเดียว
   */
  const bigTanks = plan.resources.filter(
    (entry) => findResource(entry.id).capacity > UNKNOWN_MIN_CAPACITY,
  )
  const preferred = bigTanks[farm.day % Math.max(1, bigTanks.length)]
  const tank =
    preferred && focus && preferred.id === focus.id && bigTanks.length > 1
      ? bigTanks[(farm.day + 1) % bigTanks.length]
      : preferred
  if (tank) {
    const spec = findResource(tank.id)
    const room = spec.capacity - tank.after
    // ถังที่เต็มพอดีจะได้โจทย์ที่คำตอบเป็นศูนย์ ซึ่งถูกแต่ไม่ได้ฝึกอะไร
    if (room > 0) {
      rows.push({
        id: `unknown-${tank.id}`,
        kind: 'unknown',
        skill: 'หาค่าตัวไม่ทราบค่าในประโยคสัญลักษณ์',
        prompt: `ถัง${spec.name}ของโดมจุได้เต็มที่ ${withCommas(spec.capacity)} ${spec.unit} สิ้นวันนี้มีอยู่ ${withCommas(tank.after)} ${spec.unit} ต้องเติมอีกกี่${spec.unit}ถึงจะเต็มถัง`,
        fields: [
          { key: 'room', label: `${spec.name}ที่ต้องเติมเพิ่ม`, answer: room, unit: spec.unit },
        ],
        working: [
          `เขียนเป็นประโยคสัญลักษณ์ · [ ? ] + ${withCommas(tank.after)} = ${withCommas(spec.capacity)}`,
          `หาตัวที่ไม่รู้ค่าด้วยการลบ · ${withCommas(spec.capacity)} − ${withCommas(tank.after)} = ${withCommas(room)}`,
        ],
      })
    }
  }

  // ---- ป.4/12 เด็กสร้างโจทย์สองขั้นตอนของตัวเอง ----
  const builder = buildBuilderSpec(farm, plan)
  if (builder) {
    rows.push({
      id: 'build-own',
      kind: 'build',
      skill: 'สร้างโจทย์ปัญหาสองขั้นตอนพร้อมหาคำตอบ',
      prompt: `วันนี้โดมมีเงิน ${withCommas(builder.coins)} บาท เลือกว่าจะขายอะไรและจะเอาเงินไปซื้ออะไร นั่นคือโจทย์ของหนูเอง แล้วหาคำตอบว่าสุดท้ายจะเหลือเงินกี่บาท`,
      // แถวนี้ไม่มีคำตอบตายตัว หน้าจอคิดเองจาก builder หลังเด็กเลือกครบ
      fields: [],
      working: [
        'ขั้นที่ 1 · เงินที่มี บวก เงินที่ขายได้',
        'ขั้นที่ 2 · เอาผลลัพธ์ ลบ ราคาของที่ซื้อ',
      ],
      builder,
    })
  }

  return rows
}

/**
 * สร้างตัวเลือกให้เด็กประกอบเป็นโจทย์ของตัวเอง
 *
 * คืน null เมื่อวันนั้นไม่มีอะไรให้ขาย หรือไม่มีอะไรที่ซื้อไหว
 * ซึ่งถูกต้องตามความจริง ดีกว่าแต่งตัวเลือกปลอมขึ้นมาให้ครบ
 * เพราะทั้งแถวนี้มีค่าก็เพราะตัวเลขในนั้นเป็นของฟาร์มเด็กจริง ๆ
 */
function buildBuilderSpec(farm: FarmState, plan: DayPlan): BuilderSpec | null {
  const sell: BuilderOption[] = []

  for (const entry of plan.cropYield) {
    const crop = findCrop(entry.crop)
    const value = entry.count * marketPrice(farm, entry.crop)
    if (value > 0) {
      sell.push({
        key: `crop-${entry.crop}`,
        label: `ขาย${crop.name}ที่เก็บได้วันนี้ ${withCommas(entry.count)} ต้น`,
        value,
      })
    }
  }

  for (const entry of plan.feeding) {
    if (entry.produced <= 0) continue
    const animal = findAnimal(entry.animal)
    const value = entry.produced * animal.productPrice
    sell.push({
      key: `animal-${entry.animal}`,
      label: `ขาย${animal.productName}ที่ได้วันนี้ ${withCommas(entry.produced)} ชิ้น`,
      value,
    })
  }

  // ต้องมีอย่างน้อยสองทางเลือก ไม่งั้นไม่ใช่การสร้างโจทย์ เป็นการอ่านโจทย์ที่เกมเขียนไว้
  if (sell.length < 2) return null

  const cheapestSale = Math.min(...sell.map((option) => option.value))
  const budget = farm.coins + cheapestSale

  /*
   * ราคาทุกอันในฝั่งจ่ายเป็นราคาจริงที่กดซื้อได้ในเกม
   *
   * ที่ต้องเป็นราคาจริง เพราะโจทย์ข้อนี้ไม่ได้จบที่คำตอบ
   * เด็กที่คิดออกว่าขายอันไหนแล้วซื้ออาคารได้พอดี จะเดินไปกดซื้อจริงในวันรุ่งขึ้น
   * ถ้าราคาในโจทย์กับราคาในร้านไม่ตรงกัน สิ่งที่เด็กคิดถูกจะกลายเป็นสิ่งที่ใช้ไม่ได้
   */
  const candidates: BuilderOption[] = [
    { key: 'feed', label: `ซื้ออาหารสัตว์ 20 กิโลกรัม`, value: 20 * FEED_PRICE },
    { key: 'feed-big', label: `ซื้ออาหารสัตว์ 60 กิโลกรัม`, value: 60 * FEED_PRICE },
  ]

  const plotCost = nextPlotCost(farm)
  if (plotCost !== null && plotCost > 0) {
    candidates.push({ key: 'plot', label: 'เปิดแปลงปลูกใหม่อีกหนึ่งแปลง', value: plotCost })
  }
  if (farm.kitchens === 0) {
    candidates.push({ key: 'kitchen', label: 'สร้างโรงแปรรูป', value: KITCHEN_COST })
  }
  for (const building of BUILDINGS) {
    candidates.push({ key: `building-${building.id}`, label: `สร้าง${building.name}`, value: building.cost })
  }

  const spend = candidates.filter((option) => option.value <= budget).slice(0, 4)
  if (spend.length < 2) return null

  return { coins: farm.coins, sell: sell.slice(0, 4), spend }
}

/* ------------------------------------------------------------------ *
 * ปิดวัน
 * ------------------------------------------------------------------ */

/**
 * นำแผนของวันไปใช้จริง แล้วขึ้นวันใหม่
 *
 * ค่าที่ใช้มาจาก plan เสมอ ไม่ได้มาจากคำตอบของเด็ก
 * ดูเหตุผลในคำอธิบายหัวไฟล์
 */
export function closeDay(farm: FarmState, plan: DayPlan, perfect: boolean): void {
  for (const harvest of plan.harvests) {
    const plot = farm.plots[harvest.plotIndex]
    if (plot) plot.planting = null
    farm.stock[harvest.crop] = (farm.stock[harvest.crop] ?? 0) + harvest.count
  }

  for (const craft of plan.crafts) {
    const key = craftKey(craft.recipe)
    farm.stock[key] = (farm.stock[key] ?? 0) + craft.units
  }
  farm.crafting = []

  plan.feeding.forEach((entry, index) => {
    const herd = farm.herds[index]
    if (herd) herd.fedToday = entry.fed >= herd.count
    if (entry.produced > 0) {
      const key = productKey(entry.animal)
      farm.stock[key] = (farm.stock[key] ?? 0) + entry.produced
    }
  })
  farm.feed = plan.feedLeftover

  for (const entry of plan.resources) {
    farm.resources[entry.id] = entry.after
  }

  // เช้าวันใหม่ ทุกแปลงยังไม่ได้รดน้ำ
  for (const plot of farm.plots) {
    if (plot.planting) plot.planting.wateredToday = false
  }

  farm.day += 1
  farm.energy = ENERGY_PER_DAY + (perfect ? ENERGY_BONUS_PERFECT_LEDGER : 0)
  if (perfect) farm.perfectDays += 1
}

/*
 * เหตุการณ์ประจำวันอยู่ใน events.ts
 *
 * ย้ายออกไปเพราะทั้ง engine และไฟล์นี้ต้องใช้ ถ้าอยู่ที่นี่ engine จะนำเข้าไม่ได้
 * ตอนย้ายเคยใส่บรรทัดส่งต่อชื่อไว้ที่นี่ด้วย เพื่อให้หน้าจอที่เคยนำเข้าจากที่นี่
 * ไม่ต้องแก้ แต่ผลคือมีสองทางไปหาของชิ้นเดียวกัน ซึ่งไม่มีใครได้อะไรเพิ่ม
 * จึงเอาออก แล้วให้หน้าจอนำเข้าจาก events.ts ตรง ๆ
 */


/** อาหารที่ผลผลิตหนึ่งชิ้นแปลงเป็นได้ ใช้แสดงในหน้าจอ */
export { FOOD_PER_PRODUCE }
