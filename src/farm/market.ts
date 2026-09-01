/**
 * ราคาตลาดที่เปลี่ยนไปทุกวัน
 *
 * ทำไมต้องให้ราคาขึ้นลง
 *
 * ถ้าราคาคงที่ตลอด การขายจะไม่มีอะไรให้ตัดสินใจเลย เห็นของก็กดขาย
 * พอราคาขึ้นลง เด็กต้องเทียบราคาวันนี้กับราคาปกติก่อน ซึ่งเป็นการเปรียบเทียบจริง
 * และเป็นฐานของเรื่องร้อยละใน ป.6 ที่ถามว่า "แพงขึ้นกี่เปอร์เซ็นต์"
 *
 * ทำไมเฉพาะพืชสด ไม่รวมของแปรรูป
 *
 * ตั้งใจให้ของแปรรูปราคานิ่ง เพื่อให้เห็นด้วยตัวเองว่าการแปรรูปไม่ได้เพิ่มแค่มูลค่า
 * แต่ลดความเสี่ยงด้วย ซึ่งเป็นเรื่องจริงของเกษตรกรและเป็นบทเรียนที่ติดตัวไปได้
 * ไม่ต้องอธิบายเป็นคำ เด็กจะเห็นเองจากตัวเลขบนจอ
 *
 * ค่าเฉลี่ยของตัวคูณเท่ากับหนึ่งพอดี จึงไม่ทำให้เศรษฐกิจของเกมเฟ้อหรือฝืด
 */

import { createRng } from '../math/rng'
import { ANIMALS, CROPS, RECIPES, craftKey, findCrop } from './types'
import type { FarmState } from './types'

/**
 * ตัวคูณราคาที่เป็นไปได้
 *
 * เลือกให้ผลรวมหารด้วยจำนวนแล้วได้หนึ่งพอดี (6.0 ÷ 6 = 1.0)
 * และเลือกให้เป็นทศนิยมหนึ่งตำแหน่ง เพราะราคาที่ได้ต้องอ่านง่าย
 * ไม่ใช่เลขที่ต้องปัดจนเด็กสงสัยว่าทำไมคูณแล้วไม่ตรง
 */
const MULTIPLIERS = [0.8, 0.9, 1.0, 1.0, 1.1, 1.2] as const

/** ตัวคูณราคาของพืชหนึ่งชนิดในวันหนึ่ง */
export function priceMultiplier(farm: FarmState, cropId: string): number {
  const rng = createRng(`farm-price-${farm.seed}-${farm.day}-${cropId}`)
  return rng.pick(MULTIPLIERS)
}

/**
 * ราคาขายของหนึ่งชิ้นในวันนี้
 *
 * ปัดเป็นจำนวนเต็มเสมอ เพราะเงินในเกมนี้ไม่มีสตางค์
 * และเพราะราคาที่มีทศนิยมทำให้โจทย์การคูณในสมุดบัญชียากขึ้นโดยไม่ได้ตั้งใจ
 */
export function marketPrice(farm: FarmState, key: string): number {
  const crop = CROPS.find((entry) => entry.id === key)
  if (crop) return Math.round(crop.sellPrice * priceMultiplier(farm, crop.id))

  const recipe = RECIPES.find((entry) => craftKey(entry.id) === key)
  if (recipe) return recipe.price

  // ผลผลิตจากสัตว์ราคานิ่งเหมือนของแปรรูป เพราะไม่ได้ขึ้นกับฤดูเก็บเกี่ยว
  const animal = ANIMALS.find((entry) => `product-${entry.id}` === key)
  if (animal) return animal.productPrice

  return 0
}

/** ราคาปกติของของหนึ่งชิ้น ใช้เทียบให้เห็นว่าวันนี้แพงขึ้นหรือถูกลง */
export function basePrice(key: string): number {
  const crop = CROPS.find((entry) => entry.id === key)
  if (crop) return crop.sellPrice
  const recipe = RECIPES.find((entry) => craftKey(entry.id) === key)
  if (recipe) return recipe.price
  const animal = ANIMALS.find((entry) => `product-${entry.id}` === key)
  if (animal) return animal.productPrice
  return 0
}

/** ราคาวันนี้ต่างจากราคาปกติกี่เปอร์เซ็นต์ ค่าบวกคือแพงขึ้น */
export function priceChangePercent(farm: FarmState, key: string): number {
  const base = basePrice(key)
  if (base === 0) return 0
  return Math.round(((marketPrice(farm, key) - base) / base) * 100)
}

/** พืชที่วันนี้ราคาดีที่สุด ใช้บอกใบ้ให้เด็กสังเกตราคาก่อนขาย */
export function bestPricedCrop(farm: FarmState): { id: string; percent: number } {
  let best = { id: findCrop('tomato').id as string, percent: -100 }
  for (const crop of CROPS) {
    const percent = priceChangePercent(farm, crop.id)
    if (percent > best.percent) best = { id: crop.id, percent }
  }
  return best
}
