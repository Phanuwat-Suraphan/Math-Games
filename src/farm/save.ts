/**
 * รหัสฟาร์ม — ย้ายฟาร์มข้ามเครื่องโดยไม่ต้องมีเซิร์ฟเวอร์
 *
 * ทำไมต้องมีตั้งแต่เวอร์ชันแรก ไม่ใช่ค่อยเพิ่มทีหลัง
 *
 * ข้อมูลของเกมนี้เก็บใน localStorage ซึ่งผูกกับเบราว์เซอร์บนเครื่องนั้น ๆ
 * เครื่องที่โรงเรียนใช้ร่วมกัน เด็กอาจไม่ได้เครื่องเดิมในคาบหน้า
 *
 * โหมดอื่นของเกมเสียหายไม่มาก หอคอยกับสนามรบตายแล้วเริ่มใหม่เป็นกติกาของมันอยู่แล้ว
 * แต่ฟาร์มที่เด็กสร้างมาสามคาบแล้วหายไป คือความเสียหายที่แก้ไม่ได้
 * และเป็นความเสียหายที่เด็กไม่ได้ทำอะไรผิดเลย
 *
 * รหัสนี้เป็นข้อความล้วนที่คัดลอกไปวางได้ ไม่มีการเข้ารหัสลับ
 * ตั้งใจให้เป็นแบบนั้น เพราะถ้าเด็กหรือครูอยากแก้ตัวเลขในนั้นก็แก้ได้
 * ซึ่งไม่ใช่ปัญหาสำหรับเกมที่ไม่มีการแข่งขันและไม่มีอะไรให้โกง
 * มีแค่ตัวตรวจความถูกต้องท้ายรหัส เพื่อจับรหัสที่คัดลอกมาไม่ครบ
 * ซึ่งเป็นสิ่งที่เกิดขึ้นจริงบ่อยกว่าการตั้งใจแก้มาก
 */

import { hashSeed } from '../math/rng'
import { ANIMALS, BUILDINGS, CROPS, PLOT_SIZES, RECIPES, RESOURCES } from './types'
import type { AnimalId, CraftOrder, CropId, FarmState, Grade, ResourceId } from './types'
import { productKey } from './engine'

/**
 * คำนำหน้ารหัส บอกรุ่นของรูปแบบ
 *
 * DOME1 คือรุ่นก่อนมีโรงแปรรูป DOME2 เพิ่มจำนวนโรงแปรรูปกับงานที่สั่งค้างไว้
 * ตัวอ่านรับได้ทั้งสองรุ่น รหัสรุ่นเก่าจะได้ฟาร์มที่ยังไม่มีโรงแปรรูป
 * ซึ่งถูกต้องตามความจริง เพราะตอนที่บันทึกรหัสนั้นยังไม่มีระบบนี้
 *
 * ที่ต้องรับรุ่นเก่าด้วย เพราะรหัสฟาร์มคือสิ่งเดียวที่กันไม่ให้ฟาร์มของเด็กหาย
 * การทำให้รหัสที่จดไว้เมื่อสัปดาห์ก่อนใช้ไม่ได้ คือการทำลายสิ่งที่มันมีไว้ป้องกันพอดี
 */
const PREFIX = 'DOME2'
const LEGACY_PREFIX = 'DOME1'

/** ตัวคั่นสามชั้น เลือกอักขระที่ไม่มีในตัวเลขและไม่ถูกโปรแกรมแชตตัดทิ้ง */
const SECTION = '~'
const FIELD = '.'
const RECORD = ','
const PART = ':'

/** ลำดับของสิ่งต่าง ๆ ในรหัส เปลี่ยนลำดับเมื่อไรรหัสเก่าจะอ่านไม่ออก */
const CROP_ORDER: readonly CropId[] = CROPS.map((crop) => crop.id)
const ANIMAL_ORDER: readonly AnimalId[] = ANIMALS.map((animal) => animal.id)
const BUILDING_ORDER: readonly string[] = BUILDINGS.map((building) => building.id)
const RECIPE_ORDER: readonly string[] = RECIPES.map((recipe) => recipe.id)
const RESOURCE_ORDER: readonly ResourceId[] = RESOURCES.map((resource) => resource.id)

/**
 * รหัสของของในคลัง
 *
 * พืชใช้ดัชนีของตัวเอง ส่วนผลผลิตจากสัตว์ใช้ดัชนีที่ต่อจากพืช
 * จึงไม่ต้องเก็บชื่อยาว ๆ อย่าง product-chicken ลงในรหัส
 */
function stockIndex(key: string): number {
  const crop = CROP_ORDER.indexOf(key as CropId)
  if (crop >= 0) return crop
  const animal = ANIMAL_ORDER.findIndex((id) => productKey(id) === key)
  if (animal >= 0) return CROP_ORDER.length + animal
  return -1
}

function stockKeyAt(index: number): string | null {
  if (index < 0) return null
  if (index < CROP_ORDER.length) return CROP_ORDER[index] ?? null
  const animal = ANIMAL_ORDER[index - CROP_ORDER.length]
  return animal ? productKey(animal) : null
}

function checksum(payload: string): string {
  return hashSeed(payload).toString(36).slice(0, 6)
}

/** ย่อฟาร์มเป็นข้อความหนึ่งบรรทัด */
export function encodeFarm(farm: FarmState): string {
  const head = [
    farm.grade,
    farm.day,
    farm.energy,
    farm.coins,
    farm.families,
    farm.feed,
    farm.perfectDays,
    farm.ledgerAnswered,
    farm.ledgerCorrect,
    farm.kitchens,
  ].join(FIELD)

  const plots = farm.plots
    .map((plot) => {
      const sizeIndex = PLOT_SIZES.findIndex(
        (size) => size.cols === plot.size.cols && size.rows === plot.size.rows,
      )
      const crop = plot.planting ? CROP_ORDER.indexOf(plot.planting.crop) : -1
      const watered = plot.planting?.watered ?? 0
      const today = plot.planting?.wateredToday ? 1 : 0
      return [sizeIndex, crop, watered, today].join(PART)
    })
    .join(RECORD)

  const herds = farm.herds
    .map((herd) =>
      [ANIMAL_ORDER.indexOf(herd.animal), herd.count, herd.fedToday ? 1 : 0].join(PART),
    )
    .join(RECORD)

  const buildings = BUILDING_ORDER.map((id) => farm.buildings[id] ?? 0).join(FIELD)
  const resources = RESOURCE_ORDER.map((id) => farm.resources[id] ?? 0).join(FIELD)

  const stock = Object.entries(farm.stock)
    .filter(([, amount]) => amount > 0)
    .map(([key, amount]) => [stockIndex(key), amount].join(PART))
    .filter((entry) => !entry.startsWith('-1'))
    .join(RECORD)

  // seed อยู่ท้ายสุดเพราะเป็นข้อความอิสระ ถ้าอยู่กลางจะทำให้แยกส่วนยาก
  const crafting = farm.crafting
    .filter((order) => order.units > 0 && RECIPE_ORDER.includes(order.recipe))
    .map((order) => [RECIPE_ORDER.indexOf(order.recipe), order.units].join(PART))
    .join(RECORD)

  const payload = [
    head,
    plots,
    herds,
    buildings,
    resources,
    stock,
    crafting,
    safeSeed(farm.seed),
  ].join(SECTION)
  return `${PREFIX}${SECTION}${payload}${SECTION}${checksum(payload)}`
}

/** ตัดอักขระที่จะทำให้รหัสแยกส่วนผิดออกจาก seed */
function safeSeed(seed: string): string {
  const cleaned = seed.replace(/[^A-Za-z0-9-]/g, '')
  return cleaned.length > 0 ? cleaned.slice(0, 24) : 'farm'
}

export type DecodeResult =
  | { ok: true; farm: FarmState }
  | { ok: false; reason: string }

function toInt(text: string | undefined, fallback = 0): number {
  const value = Number.parseInt((text ?? '').trim(), 10)
  return Number.isFinite(value) ? value : fallback
}

/**
 * อ่านรหัสกลับเป็นฟาร์ม
 *
 * ทุกเส้นทางที่ผิดพลาดต้องคืนข้อความไทยที่บอกว่าให้ทำอะไรต่อ
 * ไม่ใช่โยน error ออกไปให้หน้าจอขาว เพราะคนที่วางรหัสผิดคือครูหรือเด็ก
 * ไม่ใช่โปรแกรมเมอร์ที่จะไปอ่าน stack trace ได้
 */
export function decodeFarm(code: string): DecodeResult {
  const trimmed = code.trim()
  if (trimmed.length === 0) return { ok: false, reason: 'ยังไม่ได้วางรหัสฟาร์ม' }

  const sections = trimmed.split(SECTION)
  const legacy = sections[0] === LEGACY_PREFIX
  if (sections[0] !== PREFIX && !legacy) {
    return { ok: false, reason: 'นี่ไม่ใช่รหัสฟาร์มของโดมสีเขียว ลองคัดลอกใหม่อีกครั้ง' }
  }

  // รุ่นเก่ามีเจ็ดส่วน รุ่นใหม่มีแปดส่วน นับรวมคำนำหน้ากับเลขตรวจสอบแล้วต่างกันหนึ่ง
  const expected = legacy ? 9 : 10
  if (sections.length !== expected) {
    return { ok: false, reason: 'รหัสไม่ครบ อาจคัดลอกมาไม่หมด ลองคัดลอกทั้งบรรทัดอีกครั้ง' }
  }

  const payload = sections.slice(1, expected - 1).join(SECTION)
  if (checksum(payload) !== sections[expected - 1]) {
    return { ok: false, reason: 'รหัสนี้ดูเหมือนถูกแก้หรือคัดลอกมาไม่ครบ ตัวเลขท้ายรหัสไม่ตรงกัน' }
  }

  const head = (sections[1] ?? '').split(FIELD)
  const grade = toInt(head[0], 4)
  if (grade !== 4 && grade !== 5 && grade !== 6) {
    return { ok: false, reason: 'ระดับชั้นในรหัสไม่ถูกต้อง' }
  }

  const plots = (sections[2] ?? '')
    .split(RECORD)
    .filter((entry) => entry.length > 0)
    .map((entry) => {
      const parts = entry.split(PART)
      const size = PLOT_SIZES[toInt(parts[0])] ?? PLOT_SIZES[0]
      const cropIndex = toInt(parts[1], -1)
      const crop = CROP_ORDER[cropIndex]
      return {
        size: size as FarmState['plots'][number]['size'],
        planting: crop
          ? { crop, watered: toInt(parts[2]), wateredToday: toInt(parts[3]) === 1 }
          : null,
      }
    })
  if (plots.length === 0) {
    return { ok: false, reason: 'รหัสนี้ไม่มีแปลงปลูกเลย ซึ่งเป็นไปไม่ได้' }
  }

  const herds = (sections[3] ?? '')
    .split(RECORD)
    .filter((entry) => entry.length > 0)
    .map((entry) => {
      const parts = entry.split(PART)
      const animal = ANIMAL_ORDER[toInt(parts[0])]
      return animal
        ? { animal, count: Math.max(0, toInt(parts[1])), fedToday: toInt(parts[2]) === 1 }
        : null
    })
    .filter((herd): herd is NonNullable<typeof herd> => herd !== null)

  const buildingValues = (sections[4] ?? '').split(FIELD)
  const buildings: Record<string, number> = {}
  BUILDING_ORDER.forEach((id, index) => {
    buildings[id] = Math.max(0, toInt(buildingValues[index]))
  })

  const resourceValues = (sections[5] ?? '').split(FIELD)
  const resources = {} as Record<ResourceId, number>
  RESOURCE_ORDER.forEach((id, index) => {
    const spec = RESOURCES[index]
    const capacity = spec ? spec.capacity : 0
    resources[id] = Math.max(0, Math.min(capacity, toInt(resourceValues[index])))
  })

  const stock: Record<string, number> = {}
  for (const entry of (sections[6] ?? '').split(RECORD)) {
    if (entry.length === 0) continue
    const parts = entry.split(PART)
    const key = stockKeyAt(toInt(parts[0], -1))
    const amount = Math.max(0, toInt(parts[1]))
    if (key && amount > 0) stock[key] = amount
  }

  const crafting: CraftOrder[] = legacy
    ? []
    : (sections[7] ?? '')
        .split(RECORD)
        .filter((entry) => entry.length > 0)
        .map((entry) => {
          const parts = entry.split(PART)
          const recipe = RECIPE_ORDER[toInt(parts[0], -1)]
          return recipe ? { recipe, units: Math.max(0, toInt(parts[1])) } : null
        })
        .filter((order): order is CraftOrder => order !== null && order.units > 0)

  return {
    ok: true,
    farm: {
      seed: sections[legacy ? 7 : 8] || 'farm',
      grade: grade as Grade,
      day: Math.max(1, toInt(head[1], 1)),
      energy: Math.max(0, toInt(head[2])),
      coins: Math.max(0, toInt(head[3])),
      families: Math.max(1, toInt(head[4], 1)),
      plots,
      herds,
      feed: Math.max(0, toInt(head[5])),
      buildings,
      /*
       * ลำดับคีย์ต้องตรงกับ createFarm เป๊ะ
       *
       * ชุดทดสอบเทียบฟาร์มด้วย JSON.stringify ซึ่งสนใจลำดับคีย์ด้วย
       * ตอนแรกเผลอวางสองคีย์นี้ไว้ท้ายสุด ข้อมูลตรงกันทุกช่องแต่เทสต์ไม่ผ่าน
       * ซึ่งดูเหมือนเทสต์จุกจิกเกินไป แต่จริง ๆ แล้วมันจับสิ่งที่ควรจับพอดี
       * คือตัวสร้างฟาร์มสองทางที่เริ่มไม่เหมือนกัน ซึ่งวันหนึ่งจะกลายเป็นบั๊กจริง
       */
      kitchens: Math.max(0, toInt(head[9])),
      crafting,
      resources,
      stock,
      perfectDays: Math.max(0, toInt(head[6])),
      ledgerAnswered: Math.max(0, toInt(head[7])),
      ledgerCorrect: Math.max(0, toInt(head[8])),
    },
  }
}
