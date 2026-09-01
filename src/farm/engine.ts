/**
 * ตรรกะของฟาร์มในโดม
 *
 * ไฟล์นี้ไม่รู้จัก React และไม่รู้จักผืนผ้าใบ รู้แค่ว่าฟาร์มมีอะไรอยู่บ้าง
 * ทำอะไรได้บ้าง และวันหนึ่งผ่านไปแล้วตัวเลขเปลี่ยนเป็นเท่าไร
 *
 * สิ่งที่ตั้งใจให้อยู่ในนี้ทั้งหมดคือ "กฎของโลก" ส่วนการถามเด็กว่าคำตอบเท่าไร
 * อยู่ที่ ledger.ts เพราะสองเรื่องนี้เปลี่ยนด้วยเหตุผลคนละอย่างกัน
 * กฎของโลกเปลี่ยนเมื่อปรับสมดุลเกม ส่วนคำถามเปลี่ยนเมื่อปรับให้เข้ากับหลักสูตร
 */

import {
  ANIMALS,
  BUILDINGS,
  CROPS,
  ENERGY_COST,
  KITCHEN_CAPACITY,
  KITCHEN_COST,
  ENERGY_PER_DAY,
  FEED_PRICE,
  MAX_PLOTS,
  PLOT_SIZES,
  PLOT_UNLOCK_COST,
  RESOURCES,
  STARTING_COINS,
  STARTING_FAMILIES,
  STARTING_FEED,
  STARTING_RESOURCE_RATIO,
  RECIPES,
  craftKey,
  findAnimal,
  findBuilding,
  findCrop,
  findRecipe,
} from './types'
import type {
  AnimalId,
  CropId,
  FarmState,
  Grade,
  Plot,
  ResourceId,
} from './types'
import { marketPrice } from './market'

/**
 * ผลของการสั่งงานหนึ่งครั้ง
 *
 * คืนเหตุผลเป็นข้อความไทยที่เอาไปแสดงให้เด็กอ่านได้เลย
 * ไม่ใช่รหัสข้อผิดพลาดที่ต้องมีตารางแปลอีกที เพราะทุกเหตุผลในเกมนี้
 * เป็นเรื่องที่เด็กแก้ได้เอง เช่นเงินไม่พอหรือแรงหมด ไม่ใช่ความผิดพลาดของระบบ
 */
export type ActionResult = { ok: true } | { ok: false; reason: string }

const OK: ActionResult = { ok: true }

function fail(reason: string): ActionResult {
  return { ok: false, reason }
}

/**
 * ผลผลิตหนึ่งต้นแปลงเป็นอาหารของโดมได้กี่กิโลกรัม
 *
 * ตัวเลขนี้คือตัวที่กำหนดว่า "ฟาร์มต้องใหญ่แค่ไหนถึงจะเลี้ยงโดมได้"
 * เคยตั้งไว้ 45 ซึ่งผลจากการจำลองคือแปลงแรกทั้งแปลงเลี้ยงคนได้ไม่พอกินด้วยซ้ำ
 * ผลผลิตทุกชิ้นจึงต้องเข้าคลังอาหารหมด ไม่เหลือขาย แล้วไม่มีเงินซื้อเมล็ดรอบต่อไป
 * ฟาร์มตันถาวรตั้งแต่วันที่ห้าโดยที่เด็กไม่ได้ทำอะไรผิดเลย
 *
 * ที่ 90 กิโลกรัม แปลงแรกเลี้ยงโดมได้ราวหนึ่งในสามของผลผลิต
 * ที่เหลือขายได้ ซึ่งทำให้ "จะขายหรือจะเก็บ" เป็นทางเลือกจริง ไม่ใช่ทางเดียว
 */
export const FOOD_PER_PRODUCE = 90

/** สร้างฟาร์มใหม่ */
export function createFarm(seed: string, grade: Grade): FarmState {
  const resources = {} as Record<ResourceId, number>
  for (const spec of RESOURCES) {
    resources[spec.id] = Math.round(spec.capacity * STARTING_RESOURCE_RATIO)
  }

  return {
    seed,
    grade,
    day: 1,
    energy: ENERGY_PER_DAY,
    coins: STARTING_COINS,
    families: STARTING_FAMILIES,
    plots: [{ size: PLOT_SIZES[0] as Plot['size'], planting: null }],
    herds: [],
    feed: STARTING_FEED,
    buildings: { solar: 1, purifier: 1, scrubber: 1 },
    kitchens: 0,
    crafting: [],
    resources,
    stock: {},
    perfectDays: 0,
    ledgerAnswered: 0,
    ledgerCorrect: 0,
  }
}

/** จำนวนช่องปลูกของแปลงหนึ่งแปลง คือคำตอบของโจทย์การคูณในสมุดบัญชี */
export function plotCells(plot: Plot): number {
  return plot.size.cols * plot.size.rows
}

/** ความยาวรั้วรอบแปลง ใช้กับโจทย์เส้นรอบรูป */
export function plotFence(plot: Plot): number {
  return (plot.size.cols + plot.size.rows) * 2
}

/* ------------------------------------------------------------------ *
 * การสั่งงานระหว่างวัน
 * ------------------------------------------------------------------ */

/** ราคาปลดล็อกแปลงถัดไป คืน null เมื่อเปิดครบแล้ว */
export function nextPlotCost(farm: FarmState): number | null {
  if (farm.plots.length >= MAX_PLOTS) return null
  return PLOT_UNLOCK_COST[farm.plots.length] ?? null
}

export function unlockPlot(farm: FarmState): ActionResult {
  const cost = nextPlotCost(farm)
  if (cost === null) return fail('เปิดแปลงครบทุกแปลงแล้ว')
  if (farm.coins < cost) return fail(`ต้องมี ${cost} เหรียญ ตอนนี้มี ${farm.coins}`)

  farm.coins -= cost
  farm.plots.push({ size: PLOT_SIZES[farm.plots.length] as Plot['size'], planting: null })
  return OK
}

/** ราคาเมล็ดที่ต้องจ่ายเพื่อปลูกเต็มแปลง */
export function seedCostFor(plot: Plot, cropId: CropId): number {
  return plotCells(plot) * findCrop(cropId).seedCost
}

export function plantPlot(farm: FarmState, index: number, cropId: CropId): ActionResult {
  const plot = farm.plots[index]
  if (!plot) return fail('ไม่มีแปลงนี้')
  if (plot.planting) return fail('แปลงนี้ปลูกอยู่แล้ว')
  if (farm.energy < ENERGY_COST.plant) return fail('แรงหมดแล้ว ปิดวันเพื่อพักก่อน')

  const cost = seedCostFor(plot, cropId)
  if (farm.coins < cost) return fail(`เมล็ดเต็มแปลงราคา ${cost} เหรียญ ตอนนี้มี ${farm.coins}`)

  farm.coins -= cost
  farm.energy -= ENERGY_COST.plant
  /*
   * ปลูกแล้วนับว่ารดน้ำวันแรกให้เลย
   *
   * ไม่ได้ใจดีเฉย ๆ แต่เพราะถ้าไม่นับ เด็กต้องเสียแรงสองหน่วยในวันเดียว
   * เพื่อเริ่มแปลงหนึ่งแปลง ซึ่งกินแรงของทั้งวันไปกับการเริ่มต้นอย่างเดียว
   */
  plot.planting = { crop: cropId, watered: 1, wateredToday: true }
  return OK
}

export function waterPlot(farm: FarmState, index: number): ActionResult {
  const plot = farm.plots[index]
  if (!plot) return fail('ไม่มีแปลงนี้')
  if (!plot.planting) return fail('แปลงนี้ยังไม่ได้ปลูกอะไร')
  if (plot.planting.wateredToday) return fail('แปลงนี้รดน้ำไปแล้ววันนี้')
  if (isReady(plot)) return fail('แปลงนี้โตเต็มที่แล้ว รอเก็บเกี่ยวตอนปิดวัน')
  if (farm.energy < ENERGY_COST.water) return fail('แรงหมดแล้ว ปิดวันเพื่อพักก่อน')

  farm.energy -= ENERGY_COST.water
  plot.planting.wateredToday = true
  plot.planting.watered += 1
  return OK
}

/** แปลงนี้โตพอเก็บเกี่ยวแล้วหรือยัง */
export function isReady(plot: Plot): boolean {
  if (!plot.planting) return false
  return plot.planting.watered >= findCrop(plot.planting.crop).growDays
}

export function buyAnimal(farm: FarmState, id: AnimalId, count: number): ActionResult {
  if (count <= 0) return fail('ต้องซื้ออย่างน้อยหนึ่งตัว')
  const animal = findAnimal(id)
  const cost = animal.cost * count
  if (farm.coins < cost) return fail(`ราคา ${cost} เหรียญ ตอนนี้มี ${farm.coins}`)

  farm.coins -= cost
  const herd = farm.herds.find((entry) => entry.animal === id)
  if (herd) herd.count += count
  else farm.herds.push({ animal: id, count, fedToday: false })
  return OK
}

export function buyFeed(farm: FarmState, kilograms: number): ActionResult {
  if (kilograms <= 0) return fail('ต้องซื้ออย่างน้อยหนึ่งกิโลกรัม')
  const cost = kilograms * FEED_PRICE
  if (farm.coins < cost) return fail(`ราคา ${cost} เหรียญ ตอนนี้มี ${farm.coins}`)

  farm.coins -= cost
  farm.feed += kilograms
  return OK
}

export function buyBuilding(farm: FarmState, id: string): ActionResult {
  const building = findBuilding(id)
  if (farm.coins < building.cost) {
    return fail(`ราคา ${building.cost} เหรียญ ตอนนี้มี ${farm.coins}`)
  }
  farm.coins -= building.cost
  farm.buildings[id] = (farm.buildings[id] ?? 0) + 1
  return OK
}

/**
 * ลบของที่เหลือศูนย์ออกจากคลัง
 *
 * ไม่ใช่เรื่องความสะอาดของข้อมูลอย่างเดียว แต่เป็นเรื่องของรหัสฟาร์ม
 * ถ้าปล่อยให้มีของที่จำนวนเป็นศูนย์ค้างอยู่ รหัสจะไม่เก็บมันไว้ (เพราะไม่มีของ)
 * แล้วพอวางรหัสกลับเข้ามา สถานะจะไม่เหมือนเดิมเป๊ะ ซึ่งจับได้ยากมาก
 * เพราะเกมยังเล่นต่อได้ปกติทุกอย่าง ต่างกันแค่คีย์ที่มองไม่เห็น
 */
function pruneStock(farm: FarmState, key: string): void {
  if ((farm.stock[key] ?? 0) <= 0) delete farm.stock[key]
}

/** ขายของในคลัง คืนจำนวนเหรียญที่ได้ */
export function sellStock(farm: FarmState, key: string, amount: number): ActionResult {
  const have = farm.stock[key] ?? 0
  if (amount <= 0) return fail('ต้องขายอย่างน้อยหนึ่งชิ้น')
  if (have < amount) return fail(`มีอยู่แค่ ${have} ชิ้น`)

  farm.stock[key] = have - amount
  pruneStock(farm, key)
  farm.coins += amount * marketPrice(farm, key)
  return OK
}

/** ราคาขายต่อชิ้นของของในคลัง */
export function unitPrice(key: string): number {
  const crop = CROPS.find((entry) => entry.id === key)
  if (crop) return crop.sellPrice
  const animal = ANIMALS.find((entry) => productKey(entry.id) === key)
  if (animal) return animal.productPrice
  return 0
}

/** รหัสของผลผลิตจากสัตว์ แยกจากรหัสตัวสัตว์เอง */
export function productKey(id: AnimalId): string {
  return `product-${id}`
}

/**
 * ส่งผลผลิตเข้าคลังอาหารของโดม
 *
 * นี่คือจุดที่ฟาร์มกับโดมมาบรรจบกัน และเป็นการตัดสินใจที่มีน้ำหนักที่สุดในเกม
 * ผลผลิตชิ้นเดียวกันจะ "ขายเป็นเงิน" หรือ "เก็บเป็นอาหาร" ก็ได้ แต่เลือกได้อย่างเดียว
 * เงินทำให้ฟาร์มโตเร็วขึ้น อาหารทำให้คนในโดมอยู่ได้นานขึ้น
 * ถ้าไม่มีทางเลือกนี้ การปลูกผักจะไม่เกี่ยวอะไรกับโดมเลย
 */
export function depositFood(farm: FarmState, key: string, amount: number): ActionResult {
  const have = farm.stock[key] ?? 0
  if (amount <= 0) return fail('ต้องส่งอย่างน้อยหนึ่งชิ้น')
  if (have < amount) return fail(`มีอยู่แค่ ${have} ชิ้น`)

  const spec = RESOURCES.find((entry) => entry.id === 'food')
  if (!spec) return fail('ไม่พบคลังอาหาร')

  farm.stock[key] = have - amount
  pruneStock(farm, key)
  farm.resources.food = Math.min(spec.capacity, farm.resources.food + amount * FOOD_PER_PRODUCE)
  return OK
}

/* ------------------------------------------------------------------ *
 * โดม
 * ------------------------------------------------------------------ */

/** ไฟไม่พอจนเครื่องกรองน้ำและเครื่องฟอกอากาศทำงานได้ไม่เต็มที่ */
export function isBrownout(farm: FarmState): boolean {
  return farm.resources.power <= 0
}

/** โดมใช้ทรัพยากรวันละเท่าไร */
export function dailyConsumption(farm: FarmState): Record<ResourceId, number> {
  const result = {} as Record<ResourceId, number>
  for (const spec of RESOURCES) {
    result[spec.id] = spec.perFamily * farm.families
  }

  // อาคารทุกหลังกินไฟ ยกเว้นแผงโซลาร์ซึ่งเป็นตัวผลิตไฟเอง
  for (const building of BUILDINGS) {
    const count = farm.buildings[building.id] ?? 0
    result.power += building.powerDraw * count
  }
  return result
}

/**
 * โดมผลิตทรัพยากรได้วันละเท่าไร
 *
 * อาหารไม่ได้ผลิตเอง มาจากผลผลิตที่ผู้เล่นเลือกส่งเข้าคลังเท่านั้น
 * ตั้งใจให้เป็นแบบนั้น เพราะอาหารคือทรัพยากรที่ผูกฟาร์มเข้ากับโดม
 * ถ้าโดมผลิตอาหารเองได้ด้วย การปลูกผักจะกลายเป็นกิจกรรมข้าง ๆ ที่ไม่จำเป็น
 */
export function dailyProduction(farm: FarmState): Record<ResourceId, number> {
  const result = { power: 0, water: 0, air: 0, food: 0 } as Record<ResourceId, number>
  const brownout = isBrownout(farm)

  for (const building of BUILDINGS) {
    const count = farm.buildings[building.id] ?? 0
    if (count === 0) continue
    /*
     * ไฟดับแล้วเครื่องอื่นทำงานได้ครึ่งเดียว ไม่ใช่หยุดสนิท
     *
     * Fallout Shelter ให้หยุดสนิท ซึ่งทำให้ฟื้นตัวยากมากเมื่อพลาดไปแล้ว
     * ครึ่งเดียวยังกดดันพอที่จะรู้สึก แต่ยังเหลือทางกลับมาให้เด็กเสมอ
     */
    const rate = brownout && building.powerDraw > 0 ? 0.5 : 1
    result[building.produces] += Math.floor(building.output * count * rate)
  }
  return result
}

/** ทรัพยากรนี้จะพอใช้อีกกี่วัน คำนวณจากยอดสุทธิของวันนี้ */
export function daysRemaining(farm: FarmState, id: ResourceId): number {
  const net = dailyProduction(farm)[id] - dailyConsumption(farm)[id]
  if (net >= 0) return Infinity
  return Math.floor(farm.resources[id] / -net)
}

/** ทรัพยากรที่น้อยที่สุดเมื่อวัดเป็นจำนวนวันที่เหลือ */
export function tightestResource(farm: FarmState): ResourceId {
  let worst: ResourceId = 'food'
  let worstDays = Infinity
  for (const spec of RESOURCES) {
    const days = daysRemaining(farm, spec.id)
    if (days < worstDays) {
      worstDays = days
      worst = spec.id
    }
  }
  return worst
}

/**
 * รับครอบครัวใหม่เข้าโดม
 *
 * เป้าหมายของเกมทั้งเกม และเป็นสิ่งเดียวที่ทำให้เกมยากขึ้น
 * ตั้งใจไม่ห้ามแม้ทรัพยากรจะตึง เพราะการห้ามเท่ากับเกมตัดสินใจแทนเด็ก
 * สิ่งที่เกมทำได้คือบอกตัวเลขให้ครบก่อน แล้วให้เด็กเลือกเอง
 */
export function acceptFamily(farm: FarmState): ActionResult {
  farm.families += 1
  return OK
}

/** ทรัพยากรตัวไหนอยู่ในเกณฑ์เตือน (เหลือน้อยกว่าเจ็ดวัน) */
export function isCritical(farm: FarmState, id: ResourceId): boolean {
  return daysRemaining(farm, id) < 7
}

/* ------------------------------------------------------------------ *
 * โรงแปรรูป
 * ------------------------------------------------------------------ */

/** ทำได้กี่ชิ้นต่อวันตามจำนวนโรงแปรรูปที่มี */
export function craftCapacity(farm: FarmState): number {
  return farm.kitchens * KITCHEN_CAPACITY
}

/** วันนี้สั่งแปรรูปไปแล้วกี่ชิ้น */
export function craftedToday(farm: FarmState): number {
  return farm.crafting.reduce((total, order) => total + order.units, 0)
}

export function buyKitchen(farm: FarmState): ActionResult {
  if (farm.coins < KITCHEN_COST) {
    return fail(`โรงแปรรูปราคา ${KITCHEN_COST} เหรียญ ตอนนี้มี ${farm.coins}`)
  }
  farm.coins -= KITCHEN_COST
  farm.kitchens += 1
  return OK
}

/** ทำผลิตภัณฑ์ตามสูตรนี้ได้มากที่สุดกี่ชิ้นจากของที่มีในคลัง */
export function craftableUnits(farm: FarmState, recipeId: string): number {
  const recipe = findRecipe(recipeId)
  const have = farm.stock[recipe.input] ?? 0
  const byStock = Math.floor(have / recipe.inputPerUnit)
  const byCapacity = craftCapacity(farm) - craftedToday(farm)
  return Math.max(0, Math.min(byStock, byCapacity))
}

/**
 * สั่งแปรรูป
 *
 * ตัดวัตถุดิบออกจากคลังทันทีที่สั่ง ไม่ได้รอไปตัดตอนปิดวัน
 * เพราะถ้ารอ ผู้เล่นจะสั่งแปรรูปแล้วเอาวัตถุดิบชุดเดิมไปขายหรือส่งเข้าคลังอาหารได้อีก
 * แล้วตอนปิดวันงานจะทำไม่สำเร็จโดยที่ผู้เล่นไม่รู้ว่าทำอะไรผิด
 */
export function startCraft(
  farm: FarmState,
  recipeId: string,
  units: number,
): ActionResult {
  if (units <= 0) return fail('ต้องแปรรูปอย่างน้อยหนึ่งชิ้น')
  if (farm.kitchens === 0) return fail('ยังไม่มีโรงแปรรูป ต้องสร้างก่อน')
  if (farm.energy < ENERGY_COST.craft) return fail('แรงหมดแล้ว ปิดวันเพื่อพักก่อน')

  const recipe = findRecipe(recipeId)
  const free = craftCapacity(farm) - craftedToday(farm)
  if (units > free) {
    return fail(`วันนี้โรงแปรรูปทำได้อีก ${free} ชิ้น`)
  }

  const need = units * recipe.inputPerUnit
  const have = farm.stock[recipe.input] ?? 0
  if (have < need) {
    return fail(
      `ต้องใช้${findCrop(recipe.input).name} ${need} ชิ้น ตอนนี้มี ${have}`,
    )
  }

  farm.stock[recipe.input] = have - need
  pruneStock(farm, recipe.input)
  farm.energy -= ENERGY_COST.craft

  const existing = farm.crafting.find((order) => order.recipe === recipeId)
  if (existing) existing.units += units
  else farm.crafting.push({ recipe: recipeId, units })
  return OK
}

/**
 * ยกเลิกงานแปรรูปที่สั่งไว้ คืนวัตถุดิบให้ครบ
 *
 * มีไว้เพราะการกดผิดหนึ่งครั้งไม่ควรทำให้เสียผลผลิตทั้งแปลง
 * แรงที่ใช้ไปแล้วไม่คืน เพราะเป็นเวลาที่ใช้ไปจริง
 */
export function cancelCraft(farm: FarmState, recipeId: string): ActionResult {
  const index = farm.crafting.findIndex((order) => order.recipe === recipeId)
  if (index < 0) return fail('วันนี้ไม่ได้สั่งแปรรูปสูตรนี้ไว้')

  const order = farm.crafting[index]
  if (!order) return fail('วันนี้ไม่ได้สั่งแปรรูปสูตรนี้ไว้')

  const recipe = findRecipe(order.recipe)
  farm.stock[recipe.input] =
    (farm.stock[recipe.input] ?? 0) + order.units * recipe.inputPerUnit
  farm.crafting.splice(index, 1)
  return OK
}

/** สูตรที่ทำได้ตอนนี้ ใช้จัดลำดับให้หน้าจอแสดงสูตรที่พร้อมทำก่อน */
export function readyRecipes(farm: FarmState): string[] {
  return RECIPES.filter((recipe) => craftableUnits(farm, recipe.id) > 0).map(
    (recipe) => recipe.id,
  )
}

/** ส่วนต่างของการแปรรูปหนึ่งชุด เทียบกับการขายวัตถุดิบสด */
export function craftGain(farm: FarmState, recipeId: string, units: number): number {
  const recipe = findRecipe(recipeId)
  const rawValue = units * recipe.inputPerUnit * marketPrice(farm, recipe.input)
  return units * recipe.price - rawValue
}

export { craftKey }
