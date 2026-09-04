/**
 * องค์ประกอบของสนามรบ — ต้นไม้ พุ่ม หิน ดอกไม้ และทางเดิน
 *
 * ทำไมสนามเดิมถึงว่างเปล่า และทำไมถึงต้องแก้
 *
 * พื้นสนามเดิมเป็นสีไล่จากฟ้าลงมาเขียว บวกเส้นตารางจาง ๆ เท่านั้น
 * ซึ่งอ่านง่ายมากและไม่มีอะไรมารบกวนสายตา แต่ก็ไม่มีอะไรให้ดูเลยด้วย
 * เด็กที่เล่นสามรอบติดจะเห็นพื้นเดิมเป๊ะทั้งสามรอบ ทั้งที่ทุกอย่างอื่นเปลี่ยนหมด
 *
 * ไฟล์นี้เติมของลงบนพื้น โดยมีข้อบังคับที่ห้ามละเมิดสามข้อ
 *
 * หนึ่ง ของทุกชิ้นต้องจางกว่ามอนและตัวละครชัดเจน
 * สนามนี้เด็กต้องอ่านออกภายในเสี้ยววินาทีว่าอะไรคือมอนที่กำลังวิ่งมาชน
 * ของประดับที่เข้มพอ ๆ กับมอน จะทำให้เด็กตายเพราะมองผิด
 * ซึ่งเป็นการลงโทษเด็กสำหรับสิ่งที่คนวาดฉากทำ ไม่ใช่สิ่งที่เด็กทำ
 *
 * สอง ต้องสุ่มจาก seed ของรอบนั้น ไม่ใช่ Math.random
 * เพราะ draw ถูกเรียกหกสิบครั้งต่อวินาที ถ้าสุ่มใหม่ทุกเฟรม
 * ต้นไม้จะกระพริบย้ายที่ตลอดเวลา ที่นี่จึงคำนวณครั้งเดียวต่อหนึ่ง seed แล้วเก็บไว้
 *
 * สาม ห้ามวางของทับกลางสนาม
 * ตรงกลางคือจุดที่ตัวละครเกิดและเป็นที่ที่การต่อสู้หนาแน่นที่สุด
 * ของประดับตรงนั้นจะกลายเป็นสิ่งรบกวนตลอดเกม ไม่ใช่แค่ตอนเดินผ่าน
 */

import { createRng } from '../math/rng'
import { ARENA_HEIGHT, ARENA_WIDTH } from './types'

/** ของหนึ่งชิ้นที่วางอยู่บนพื้นสนาม */
export interface Prop {
  kind: 'tree' | 'bush' | 'rock' | 'flower' | 'grass'
  x: number
  y: number
  /** ตัวคูณขนาด ทำให้ของชนิดเดียวกันไม่เท่ากันเป๊ะทุกต้น */
  scale: number
  /** สีของใบหรือกลีบ เลือกไว้ตั้งแต่ตอนสุ่ม จะได้ไม่เปลี่ยนทุกเฟรม */
  tint: string
}

export interface Scenery {
  props: Prop[]
  /** จุดควบคุมของทางเดินดิน วาดเป็นเส้นโค้งกว้าง ๆ */
  path: { x: number; y: number }[]
  /** ยอดเขาไกล ๆ ที่ขอบบนของสนาม */
  hills: { x: number; y: number; r: number }[]
}

/**
 * รัศมีรอบจุดเกิดของตัวละครที่ห้ามวางของประดับ
 *
 * ตัวละครเกิดกลางสนามพอดี และการต่อสู้จะหนาแน่นแถวนั้นตลอดเกม
 */
const SAFE_RADIUS = 120

const LEAF_TINTS = ['#5ba85f', '#4e9a56', '#69b96b', '#3f8a4c']
const FLOWER_TINTS = ['#f9a8d4', '#fde68a', '#fca5a5', '#c4b5fd', '#fff']

/**
 * ของประดับกินที่ตรงกลางไหม
 *
 * วัดจากจุดเกิดของตัวละคร ซึ่งอยู่กลางสนามพอดี
 */
function tooCentral(x: number, y: number): boolean {
  const dx = x - ARENA_WIDTH / 2
  const dy = y - ARENA_HEIGHT / 2
  return dx * dx + dy * dy < SAFE_RADIUS * SAFE_RADIUS
}

/**
 * สุ่มองค์ประกอบของสนามหนึ่งชุด
 *
 * จำนวนของแต่ละชนิดตั้งไว้ตายตัว ไม่ได้สุ่มจำนวนด้วย
 * เพราะถ้าสุ่มจำนวนด้วย จะมี seed ที่ได้สนามโล่งกว่าเพื่อนอย่างเห็นได้ชัด
 * ซึ่งเป็นความต่างที่ไม่ได้ทำให้สนุกขึ้น มีแต่ทำให้บาง seed ดูเหมือนยังโหลดไม่เสร็จ
 */
export function buildScenery(seed: string): Scenery {
  const rng = createRng(`arena-${seed}`)

  const props: Prop[] = []
  const place = (kind: Prop['kind'], count: number, tints: readonly string[]) => {
    let guard = 0
    let placed = 0
    while (placed < count && guard < count * 40) {
      guard += 1
      const x = rng.int(24, ARENA_WIDTH - 24)
      const y = rng.int(70, ARENA_HEIGHT - 20)
      if (tooCentral(x, y)) continue
      props.push({
        kind,
        x,
        y,
        scale: 0.75 + rng.next() * 0.5,
        tint: tints[rng.int(0, tints.length - 1)] ?? tints[0] ?? '#5ba85f',
      })
      placed += 1
    }
  }

  place('tree', 7, LEAF_TINTS)
  place('bush', 11, LEAF_TINTS)
  place('rock', 8, ['#9ca3af', '#a8a29e', '#8b8f96'])
  place('flower', 16, FLOWER_TINTS)
  place('grass', 22, ['#67a95f'])

  /*
   * เรียงตามแกน y เพื่อให้ของที่อยู่ใกล้กว่าถูกวาดทับของที่อยู่ไกลกว่า
   * เป็นกฎเดียวกับที่ใช้กับมอน ทำให้ฉากทั้งฉากอ่านเป็นระนาบเดียวกัน
   */
  props.sort((a, b) => a.y - b.y)

  const path = [
    { x: -40, y: rng.int(180, 300) },
    { x: ARENA_WIDTH * 0.3, y: rng.int(150, 420) },
    { x: ARENA_WIDTH * 0.7, y: rng.int(150, 420) },
    { x: ARENA_WIDTH + 40, y: rng.int(240, 420) },
  ]

  const hills: Scenery['hills'] = []
  for (let i = 0; i < 7; i += 1) {
    hills.push({
      x: (ARENA_WIDTH / 6) * i + rng.int(-30, 30),
      y: rng.int(52, 68),
      r: rng.int(46, 78),
    })
  }

  return { props, path, hills }
}

/*
 * เก็บสนามที่สุ่มไว้แล้ว คีย์ด้วย seed
 *
 * draw ถูกเรียกหกสิบครั้งต่อวินาที การสุ่มใหม่ทุกเฟรมนอกจากจะเปลืองแล้ว
 * ยังทำให้ต้นไม้ย้ายที่ทุกเฟรมจนกลายเป็นภาพสั่น
 *
 * เก็บแค่ไม่กี่ชุดล่าสุดพอ เพราะเด็กหนึ่งคนเล่นทีละรอบ
 */
const CACHE = new Map<string, Scenery>()
const CACHE_LIMIT = 4

export function sceneryFor(seed: string): Scenery {
  const cached = CACHE.get(seed)
  if (cached) return cached

  const built = buildScenery(seed)
  if (CACHE.size >= CACHE_LIMIT) {
    const oldest = CACHE.keys().next().value
    if (oldest !== undefined) CACHE.delete(oldest)
  }
  CACHE.set(seed, built)
  return built
}
