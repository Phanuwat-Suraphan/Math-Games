/**
 * โจทย์ของยานสำรวจระบบสุริยะ
 *
 * แต่ละช่วงของการเดินทางมีโจทย์สองชนิดที่ทำหน้าที่ต่างกัน
 *
 *   พิกัดปลายทาง  ศูนย์บัญชาการบอกใบ้ว่าต้องไปดาวดวงไหน เด็กต้องถอดใบ้เอง
 *                 แล้วเลือกดาวในฉากสามมิติ ใบ้ส่วนใหญ่ต้องคิดเลขก่อนถึงจะรู้คำตอบ
 *                 เช่น "ดาวเคราะห์ลำดับที่ 12 ÷ 4 นับจากดวงอาทิตย์"
 *   โจทย์ประจำดาว  เมื่อไปถึง ต้องแก้โจทย์ที่สร้างจากข้อมูลจริงของดาวดวงนั้น
 *                 เพื่อรับตราประทับ ตัวเลขทุกตัวมาจาก planets.ts ไม่ได้แต่งขึ้น
 *
 * กฎที่ห้ามพังเด็ดขาด ชุดทดสอบตรวจทุกข้อ
 *
 * หนึ่ง ใบ้พิกัดทุกข้อต้องชี้ดาวได้ดวงเดียว
 *       "ดาวที่มีวงแหวน" ฟังดูดี แต่ดาวเคราะห์ชั้นนอกมีวงแหวนทั้งสี่ดวง
 *       เด็กที่ตอบดาวพฤหัสบดีตอบถูกตามความจริง แต่เกมจะบอกว่าผิด
 *       จึงเก็บใบ้ไว้เป็นเงื่อนไขที่ตรวจกับดาวทุกดวงได้ (clueMatches)
 *       ไม่ได้เก็บเป็นข้อความลอย ๆ
 *
 * สอง คำตอบทุกข้อเป็นจำนวนนับ ไม่ติดลบ ไม่มีเศษทศนิยมค้าง
 *       โจทย์ทศนิยมใช้ค่าที่เก็บเป็นจำนวนเต็มคูณสิบ จึงไม่มีทางได้ 0.30000000000000004
 *
 * สาม คำตอบที่ต้องปัดเศษ ต้องไม่คาบเส้นครึ่ง
 *       3.5 ปัดได้ 4 ตามกฎ แต่เด็กที่ตอบ 3 แค่ปัดพลาดหลักเดียว ไม่ได้ไม่เข้าใจ
 *       โจทย์ที่ลงโทษความพลาดระดับนั้นวัดความรอบคอบ ไม่ได้วัดความเข้าใจ
 *
 * ระดับความยาก
 *   1 นักบินฝึกหัด     บวก ลบ ค่าประจำหลัก คูณเลขหลักเดียว
 *   2 นักบินอวกาศ      คูณ หาร ปัดเศษ
 *   3 ผู้บัญชาการยาน   ทศนิยม โจทย์สองขั้นตอน คูณเลขสองหลัก
 */

import { createRng } from '../math/rng'
import type { Rng } from '../math/rng'
import type { SkillId } from '../types/stats'
import {
  PLANETS,
  distanceMillionKm,
  formatNumber,
  getPlanet,
  orbitYears,
} from './planets'
import type { Planet, PlanetId } from './planets'

export type Tier = 1 | 2 | 3

export const TIERS: readonly { tier: Tier; name: string; note: string; icon: string }[] = [
  { tier: 1, name: 'นักบินฝึกหัด', note: 'บวก ลบ ค่าประจำหลัก คูณเลขหลักเดียว', icon: '🧑‍🚀' },
  { tier: 2, name: 'นักบินอวกาศ', note: 'คูณ หาร และการปัดเศษ', icon: '🚀' },
  { tier: 3, name: 'ผู้บัญชาการยาน', note: 'ทศนิยม โจทย์สองขั้นตอน คูณเลขสองหลัก', icon: '🛸' },
]

export function isTier(value: unknown): value is Tier {
  return value === 1 || value === 2 || value === 3
}

/* ------------------------------------------------------------------ *
 * ประโยคสัญลักษณ์ที่ใช้ซ่อนตัวเลขในใบ้
 * ------------------------------------------------------------------ */

export interface Expression {
  text: string
  value: number
  skill: SkillId
  /** วิธีคิดทีละขั้น ใช้เป็นคำใบ้เมื่อเด็กเลือกผิด */
  steps: string[]
}

/** ตัวประกอบของจำนวนที่ไม่ใช่ 1 และตัวมันเอง ใช้ทำโจทย์คูณ */
function factorPairs(value: number): [number, number][] {
  const pairs: [number, number][] = []
  for (let a = 2; a * a <= value; a += 1) {
    if (value % a === 0) pairs.push([a, value / a])
  }
  return pairs
}

/**
 * เขียนจำนวนหนึ่งให้เป็นประโยคสัญลักษณ์ตามระดับความยาก
 *
 * ผลลัพธ์ต้องเท่ากับ value เสมอ และทุกตัวในประโยคต้องเป็นจำนวนนับ
 * ชุดทดสอบคำนวณประโยคที่ได้ซ้ำอีกรอบเพื่อยืนยัน
 */
export function makeExpression(value: number, tier: Tier, rng: Rng): Expression {
  if (tier === 1) {
    if (value > 2 && rng.chance(0.5)) {
      const a = rng.int(1, value - 1)
      const b = value - a
      return {
        text: `${a} + ${b}`,
        value,
        skill: 'addition',
        steps: [`${a} + ${b} = ${value}`],
      }
    }
    const b = rng.int(1, 9)
    const a = value + b
    return {
      text: `${a} − ${b}`,
      value,
      skill: 'subtraction',
      steps: [`${a} − ${b} = ${value}`],
    }
  }

  if (tier === 2) {
    const pairs = factorPairs(value)
    if (pairs.length > 0 && rng.chance(0.5)) {
      const [a, b] = rng.pick(pairs)
      const [left, right] = rng.chance(0.5) ? [a, b] : [b, a]
      return {
        text: `${left} × ${right}`,
        value,
        skill: 'multiplication',
        steps: [`${left} × ${right} = ${value}`],
      }
    }
    const divisor = rng.int(2, 9)
    return {
      text: `${formatNumber(value * divisor)} ÷ ${divisor}`,
      value,
      skill: 'division',
      steps: [`${formatNumber(value * divisor)} ÷ ${divisor} = ${formatNumber(value)}`],
    }
  }

  // ระดับ 3 สองขั้นตอน ใส่วงเล็บให้เห็นชัดว่าต้องทำส่วนไหนก่อน
  if (value > 1) {
    const extra = rng.int(1, Math.min(9, value - 1))
    const base = value - extra
    const divisor = rng.int(2, 9)
    return {
      text: `(${formatNumber(base * divisor)} ÷ ${divisor}) + ${extra}`,
      value,
      skill: 'division',
      steps: [
        `ทำในวงเล็บก่อน ${formatNumber(base * divisor)} ÷ ${divisor} = ${formatNumber(base)}`,
        `แล้วบวก ${formatNumber(base)} + ${extra} = ${formatNumber(value)}`,
      ],
    }
  }
  const extra = rng.int(1, 9)
  const divisor = rng.int(2, 9)
  const base = value + extra
  return {
    text: `(${base * divisor} ÷ ${divisor}) − ${extra}`,
    value,
    skill: 'division',
    steps: [
      `ทำในวงเล็บก่อน ${base * divisor} ÷ ${divisor} = ${base}`,
      `แล้วลบ ${base} − ${extra} = ${value}`,
    ],
  }
}

/* ------------------------------------------------------------------ *
 * ใบ้พิกัดปลายทาง
 * ------------------------------------------------------------------ */

export type ClueKind =
  | 'order'
  | 'edge'
  | 'between'
  | 'size'
  | 'moons'
  | 'moonRange'
  | 'periodDays'
  | 'periodYears'
  | 'distance'
  | 'feature'

export interface NavClue {
  kind: ClueKind
  target: PlanetId
  /** ประโยคที่ศูนย์บัญชาการพูด ต่อท้ายคำว่า "ปลายทางคือ" */
  text: string
  /** คำใบ้ที่ขึ้นเมื่อเลือกผิดครั้งแรก */
  hint: string
  skill: SkillId
  /** ค่าที่ใช้ตรวจกับดาวทุกดวงว่าตรงใบ้ไหม */
  value: number
  min?: number
  max?: number
}

/** จุดเด่นที่มีดาวดวงเดียวในระบบสุริยะ ใช้กับระดับ 1 */
const FEATURES: Record<PlanetId, { text: string; hint: string }> = {
  mercury: {
    text: 'ดาวเคราะห์ที่โคจรรอบดวงอาทิตย์เร็วที่สุด',
    hint: 'ดาวที่อยู่ใกล้ดวงอาทิตย์ที่สุดโคจรเร็วที่สุด ลองเร่งเวลาดูว่าดวงไหนวิ่งรอบไวที่สุด',
  },
  venus: {
    text: 'ดาวเคราะห์ที่ร้อนที่สุดในระบบสุริยะ',
    hint: 'ไม่ใช่ดวงที่ใกล้ดวงอาทิตย์ที่สุด แต่เป็นดวงถัดมาซึ่งมีอากาศหนาทึบกักความร้อนไว้',
  },
  earth: {
    text: 'ดาวเคราะห์ที่เราอาศัยอยู่',
    hint: 'บ้านของเราเอง ดาวสีฟ้าลำดับที่ 3 นับจากดวงอาทิตย์',
  },
  mars: {
    text: 'ดาวเคราะห์สีแดง',
    hint: 'ดาวที่ดินมีสนิมเหล็ก อยู่ถัดจากโลกออกไป',
  },
  jupiter: {
    text: 'ดาวเคราะห์ที่มีจุดแดงใหญ่ซึ่งเป็นพายุยักษ์',
    hint: 'พายุนี้อยู่บนดาวเคราะห์ที่ใหญ่ที่สุด',
  },
  saturn: {
    text: 'ดาวเคราะห์ที่มีวงแหวนเห็นชัดที่สุด',
    hint: 'ดาวเคราะห์ชั้นนอกมีวงแหวนทุกดวง แต่มีดวงเดียวที่วงแหวนกว้างและสว่างจนเห็นได้ชัด',
  },
  uranus: {
    text: 'ดาวเคราะห์ที่หมุนรอบตัวเองแบบนอนตะแคง',
    hint: 'ดูวงแหวนบาง ๆ ของดาวสีฟ้าอมเขียว มันตั้งขึ้นแทนที่จะนอนราบ',
  },
  neptune: {
    text: 'ดาวเคราะห์ที่อยู่ไกลดวงอาทิตย์ที่สุดและมีลมแรงที่สุด',
    hint: 'ดาวสีน้ำเงินเข้มดวงสุดท้าย วงโคจรนอกสุด',
  },
}

/** ลำดับขนาดจากใหญ่ไปเล็ก 1 คือใหญ่ที่สุด */
export function sizeRank(planet: Planet): number {
  return PLANETS.filter((other) => other.diameterKm > planet.diameterKm).length + 1
}

/** ระยะจากดวงอาทิตย์ปัดเป็นหลักสิบล้าน หน่วยล้านกิโลเมตร */
export function distanceTensOfMillions(planet: Planet): number {
  return Math.round(planet.distanceKm / 10_000_000) * 10
}

/** ดาวดวงนี้ตรงกับใบ้หรือไม่ ใช้ทั้งตอนตัดสินคำตอบและในชุดทดสอบ */
export function clueMatches(clue: NavClue, planet: Planet): boolean {
  switch (clue.kind) {
    case 'order':
    case 'edge':
    case 'between':
      return planet.order === clue.value
    case 'size':
      return sizeRank(planet) === clue.value
    case 'moons':
      return planet.moons === clue.value
    case 'moonRange':
      return planet.moons > (clue.min ?? Infinity) && planet.moons < (clue.max ?? -Infinity)
    case 'periodDays':
      return planet.orbitDays < 1_000 && planet.orbitDays === clue.value
    case 'periodYears':
      return planet.orbitDays >= 1_000 && orbitYears(planet) === clue.value
    case 'distance':
      return distanceTensOfMillions(planet) === clue.value
    case 'feature':
      return planet.id === clue.target
  }
}

/** ดาวทุกดวงที่ตรงกับใบ้ ใบ้ที่ดีต้องได้ดวงเดียวเสมอ */
export function clueCandidates(clue: NavClue): PlanetId[] {
  return PLANETS.filter((planet) => clueMatches(clue, planet)).map((planet) => planet.id)
}

type ClueBuilder = (planet: Planet, tier: Tier, rng: Rng) => NavClue | null

const orderClue: ClueBuilder = (planet, tier, rng) => {
  const expression = makeExpression(planet.order, tier, rng)
  return {
    kind: 'order',
    target: planet.id,
    text: `ดาวเคราะห์ลำดับที่ ${expression.text} นับจากดวงอาทิตย์`,
    hint: `${expression.steps.join(' แล้ว ')} ลองนับวงโคจรจากดวงอาทิตย์ออกมา ${planet.order} วง`,
    skill: expression.skill,
    value: planet.order,
  }
}

const edgeClue: ClueBuilder = (planet) => {
  if (planet.order !== 1 && planet.order !== PLANETS.length) return null
  const nearest = planet.order === 1
  return {
    kind: 'edge',
    target: planet.id,
    text: nearest
      ? 'ดาวเคราะห์ที่อยู่ใกล้ดวงอาทิตย์ที่สุด'
      : 'ดาวเคราะห์ที่อยู่ไกลดวงอาทิตย์ที่สุด',
    hint: nearest ? 'ดูวงโคจรที่อยู่ในสุด ติดกับดวงอาทิตย์' : 'ดูวงโคจรที่อยู่นอกสุด',
    skill: 'wordProblems',
    value: planet.order,
  }
}

const betweenClue: ClueBuilder = (planet) => {
  const inner = PLANETS.find((other) => other.order === planet.order - 1)
  const outer = PLANETS.find((other) => other.order === planet.order + 1)
  if (!inner || !outer) return null
  return {
    kind: 'between',
    target: planet.id,
    text: `ดาวเคราะห์ที่อยู่ระหว่าง${inner.name}กับ${outer.name}`,
    hint: `หา${inner.name}กับ${outer.name}ให้เจอก่อน ดาวที่ต้องการอยู่วงโคจรตรงกลางพอดี`,
    skill: 'wordProblems',
    value: planet.order,
  }
}

const sizeClue: ClueBuilder = (planet, tier, rng) => {
  const rank = sizeRank(planet)
  if (tier === 1) {
    if (rank === 1) {
      return {
        kind: 'size',
        target: planet.id,
        text: 'ดาวเคราะห์ที่ใหญ่ที่สุด',
        hint: 'ดูดาวที่ดวงโตที่สุดในภาพ ตรงนี้ภาพไม่ได้หลอก เพราะลำดับขนาดยังถูกต้อง',
        skill: 'wordProblems',
        value: rank,
      }
    }
    if (rank === PLANETS.length) {
      return {
        kind: 'size',
        target: planet.id,
        text: 'ดาวเคราะห์ที่เล็กที่สุด',
        hint: 'ดาวดวงเล็กที่สุดอยู่ใกล้ดวงอาทิตย์มาก',
        skill: 'wordProblems',
        value: rank,
      }
    }
    return null
  }
  const expression = makeExpression(rank, tier === 3 ? 2 : 1, rng)
  return {
    kind: 'size',
    target: planet.id,
    text: `ดาวเคราะห์ที่ใหญ่เป็นอันดับ ${expression.text} (นับจากดวงใหญ่ที่สุดเป็นอันดับ 1)`,
    hint: `${expression.steps.join(' แล้ว ')} แตะดาวแต่ละดวงเพื่อดูแถบเทียบขนาดจริง แล้วนับจากดวงที่ใหญ่ที่สุด`,
    skill: expression.skill,
    value: rank,
  }
}

const moonsClue: ClueBuilder = (planet, tier, rng) => {
  // จำนวนดวงจันทร์ที่ซ้ำกับดาวดวงอื่น (ดาวพุธกับดาวศุกร์ไม่มีทั้งคู่) ใช้เป็นใบ้ไม่ได้
  const unique = PLANETS.filter((other) => other.moons === planet.moons).length === 1
  if (!unique) return null
  if (tier === 1) {
    if (planet.moons > 20) return null
    return {
      kind: 'moons',
      target: planet.id,
      text: `ดาวเคราะห์ที่มีดวงจันทร์ ${planet.moons} ดวง`,
      hint: 'แตะดาวแต่ละดวงเพื่อดูการ์ดข้อมูล ในการ์ดบอกจำนวนดวงจันทร์ไว้',
      skill: 'wordProblems',
      value: planet.moons,
    }
  }
  const expression = makeExpression(planet.moons, tier, rng)
  return {
    kind: 'moons',
    target: planet.id,
    text: `ดาวเคราะห์ที่มีดวงจันทร์ ${expression.text} ดวง`,
    hint: `${expression.steps.join(' แล้ว ')} จากนั้นแตะดาวทีละดวงเพื่อดูจำนวนดวงจันทร์`,
    skill: expression.skill,
    value: planet.moons,
  }
}

/**
 * จำนวนกลม ๆ ในช่วงที่กำหนด ลองหลักสิบก่อน แล้วหลักห้า ถ้าไม่มีจริง ๆ ค่อยใช้ขอบช่วง
 * low = true เอาตัวที่น้อยที่สุดในช่วง, false เอาตัวที่มากที่สุด
 */
function roundNumberBetween(lowest: number, highest: number, low: boolean): number {
  for (const step of [10, 5]) {
    const value = low ? Math.ceil(lowest / step) * step : Math.floor(highest / step) * step
    if (value >= lowest && value <= highest) return value
  }
  return low ? lowest : highest
}

/**
 * ใบ้แบบช่วง เช่น "มีดวงจันทร์มากกว่า 20 ดวงแต่น้อยกว่า 30 ดวง"
 *
 * ขอบล่างต้องไม่น้อยกว่าจำนวนของดาวดวงที่มีดวงจันทร์น้อยกว่าถัดลงไป
 * และขอบบนต้องไม่มากกว่าดาวดวงที่มีมากกว่าถัดขึ้นไป ไม่งั้นช่วงจะครอบดาวสองดวง
 * ภายในขอบนั้นเลือกเลขกลม ๆ ที่ทำให้ช่วงกว้างที่สุด เด็กจะได้เปรียบเทียบจริง
 * ไม่ใช่แค่จับคู่ตัวเลขที่เห็นในการ์ด
 */
const moonRangeClue: ClueBuilder = (planet, tier) => {
  // ดาวที่มีดวงจันทร์ไม่ถึงสิบดวง ช่วงที่ได้จะแคบจนเป็นประโยคแปลก ๆ เช่น "มากกว่า 0 แต่น้อยกว่า 2"
  if (tier === 1 || planet.moons < 10) return null
  const others = PLANETS.filter((other) => other.id !== planet.id).map((other) => other.moons)
  const below = Math.max(...others.filter((count) => count < planet.moons))
  const above = Math.min(...others.filter((count) => count > planet.moons))
  if (!Number.isFinite(below)) return null

  const min = roundNumberBetween(below, planet.moons - 1, true)
  const max = Number.isFinite(above) ? roundNumberBetween(planet.moons + 1, above, false) : null

  return {
    kind: 'moonRange',
    target: planet.id,
    text:
      max === null
        ? `ดาวเคราะห์ที่มีดวงจันทร์มากกว่า ${formatNumber(min)} ดวง`
        : `ดาวเคราะห์ที่มีดวงจันทร์มากกว่า ${formatNumber(min)} ดวง แต่น้อยกว่า ${formatNumber(max)} ดวง`,
    hint: 'แตะดาวทีละดวงดูจำนวนดวงจันทร์ แล้วเทียบกับทั้งสองตัวเลขในใบ้ ต้องผ่านทั้งสองเงื่อนไข',
    skill: 'wordProblems',
    value: planet.moons,
    min,
    max: max ?? Number.MAX_SAFE_INTEGER,
  }
}

const periodClue: ClueBuilder = (planet, tier, rng) => {
  if (tier === 1) return null
  if (planet.orbitDays < 1_000) {
    const expression = tier === 3 ? makeExpression(planet.orbitDays, 2, rng) : null
    const amount = expression ? expression.text : formatNumber(planet.orbitDays)
    return {
      kind: 'periodDays',
      target: planet.id,
      text: `ดาวเคราะห์ที่โคจรรอบดวงอาทิตย์ครบ 1 รอบ ใช้เวลาประมาณ ${amount} วันของโลก`,
      hint: `${expression ? `${expression.steps.join(' แล้ว ')} ` : ''}ดาวที่อยู่ใกล้ดวงอาทิตย์โคจรครบรอบเร็วกว่าดาวที่อยู่ไกล`,
      skill: expression?.skill ?? 'wordProblems',
      value: planet.orbitDays,
    }
  }
  const years = orbitYears(planet)
  const expression = tier === 3 ? makeExpression(years, 2, rng) : null
  const amount = expression ? expression.text : formatNumber(years)
  return {
    kind: 'periodYears',
    target: planet.id,
    text: `ดาวเคราะห์ที่โคจรรอบดวงอาทิตย์ครบ 1 รอบ ใช้เวลาประมาณ ${amount} ปีของโลก`,
    hint: `${expression ? `${expression.steps.join(' แล้ว ')} ` : ''}ยิ่งอยู่ไกลดวงอาทิตย์ ยิ่งใช้เวลาโคจรนาน`,
    skill: expression?.skill ?? 'wordProblems',
    value: years,
  }
}

const distanceClue: ClueBuilder = (planet, tier) => {
  if (tier === 1) return null
  const value = distanceTensOfMillions(planet)
  return {
    kind: 'distance',
    target: planet.id,
    text: `ดาวเคราะห์ที่อยู่ห่างดวงอาทิตย์ประมาณ ${formatNumber(value)} ล้านกิโลเมตร (ปัดเป็นหลักสิบล้าน)`,
    hint: 'การ์ดข้อมูลของดาวแต่ละดวงบอกระยะห่างเต็มทุกหลัก ลองปัดเป็นหลักสิบล้านแล้วเทียบดู',
    skill: 'wordProblems',
    value,
  }
}

const featureClue: ClueBuilder = (planet, tier) => {
  if (tier !== 1) return null
  const feature = FEATURES[planet.id]
  return {
    kind: 'feature',
    target: planet.id,
    text: feature.text,
    hint: feature.hint,
    skill: 'wordProblems',
    value: planet.order,
  }
}

const CLUE_BUILDERS: readonly ClueBuilder[] = [
  orderClue,
  edgeClue,
  betweenClue,
  sizeClue,
  moonsClue,
  moonRangeClue,
  periodClue,
  distanceClue,
  featureClue,
]

/**
 * ใบ้ทุกแบบที่ใช้กับดาวดวงนี้ได้ในระดับนี้
 * ตัดใบ้ที่ชี้ได้มากกว่าหนึ่งดวงทิ้งตั้งแต่ตรงนี้ เผื่อวันหน้ามีคนแก้ข้อมูลดาวแล้วทำให้ซ้ำ
 */
export function clueOptions(planetId: PlanetId, tier: Tier, seed: string): NavClue[] {
  const planet = getPlanet(planetId)
  return CLUE_BUILDERS.map((build, index) =>
    build(planet, tier, createRng(`solar-clue-${seed}-${planetId}-${tier}-${index}`)),
  ).filter((clue): clue is NavClue => {
    if (!clue) return false
    const candidates = clueCandidates(clue)
    return candidates.length === 1 && candidates[0] === planetId
  })
}

/**
 * เลือกใบ้หนึ่งข้อ
 *
 * ใบ้แบบนับลำดับมีให้ทุกดาว ใบ้แบบอื่นมีเฉพาะบางดวง
 * ถ้าสุ่มเท่ากันหมด ใบ้นับลำดับจะออกบ่อยเกินไปจนเด็กจำวิธีได้แล้วเลิกอ่านใบ้
 * จึงให้น้ำหนักใบ้นับลำดับน้อยกว่าเมื่อมีใบ้แบบอื่นให้เลือก
 */
export function buildClue(planetId: PlanetId, tier: Tier, seed: string): NavClue {
  const options = clueOptions(planetId, tier, seed)
  const rng = createRng(`solar-clue-pick-${seed}-${planetId}-${tier}`)
  const others = options.filter((clue) => clue.kind !== 'order')
  const order = options.find((clue) => clue.kind === 'order')
  if (order && (others.length === 0 || rng.chance(0.3))) return order
  if (others.length > 0) return rng.pick(others)
  // ไม่มีทางมาถึงตรงนี้ เพราะใบ้นับลำดับใช้ได้กับทุกดาวในทุกระดับ
  return orderClue(getPlanet(planetId), tier, rng) as NavClue
}

/* ------------------------------------------------------------------ *
 * โจทย์ประจำดาว
 * ------------------------------------------------------------------ */

/** รูปแบบการแสดงคำตอบ ปี ค.ศ. ไม่มีลูกน้ำ เลขโดดเป็นตัวเดียว */
export type AnswerFormat = 'number' | 'year' | 'digit'

export interface PlanetQuestion {
  /** ชนิดของโจทย์ ใช้บันทึกสถิติ */
  kind: string
  planet: PlanetId
  text: string
  answer: number
  choices: number[]
  /** หน่วยที่ต่อท้ายตัวเลือก */
  unit: string
  format: AnswerFormat
  skill: SkillId
  /** วิธีคิดทีละขั้น แสดงหลังตอบถูก และบรรทัดแรกใช้เป็นคำใบ้หลังตอบผิดสองครั้ง */
  steps: string[]
}

interface QuestionDraft {
  kind: string
  text: string
  answer: number
  unit: string
  format?: AnswerFormat
  skill: SkillId
  steps: string[]
  /** ตัวเลือกลวงที่มาจากความผิดพลาดที่เด็กทำจริง */
  distractors: number[]
}

type QuestionBuilder = (planet: Planet, tier: Tier, rng: Rng) => QuestionDraft | null

/** เลขโดดในหลักที่กำหนด 0 = หลักหน่วย */
function digitAt(value: number, power: number): number {
  return Math.floor(value / 10 ** power) % 10
}

/**
 * ลบแบบลืมยืม คือเอาเลขมากลบเลขน้อยในแต่ละหลักโดยไม่สนว่าตัวไหนอยู่บน
 * เป็นความผิดพลาดที่พบบ่อยที่สุดของการลบที่ต้องยืม จึงเป็นตัวลวงที่ดีที่สุด
 */
export function subtractWithoutBorrow(a: number, b: number): number {
  let result = 0
  let place = 1
  let left = a
  let right = b
  while (left > 0 || right > 0) {
    result += Math.abs((left % 10) - (right % 10)) * place
    left = Math.floor(left / 10)
    right = Math.floor(right / 10)
    place *= 10
  }
  return result
}

/** ส่วนเศษอยู่ห่างจากครึ่งพอให้ปัดได้โดยไม่คาบเส้น */
function safelyRoundable(value: number): boolean {
  const fraction = value - Math.floor(value)
  return Math.abs(fraction - 0.5) > 0.15
}

/** ปัดเป็นหลักพัน ใช้กับเส้นผ่านศูนย์กลาง */
function roundThousands(value: number): number {
  return Math.round(value / 1_000) * 1_000
}

const PLACE_NAMES = [
  'หน่วย',
  'สิบ',
  'ร้อย',
  'พัน',
  'หมื่น',
  'แสน',
  'ล้าน',
  'สิบล้าน',
  'ร้อยล้าน',
  'พันล้าน',
]

const digitPlace: QuestionBuilder = (planet, tier, rng) => {
  if (tier !== 1) return null
  const powers = [5, 6, 7, 8, 9].filter((power) => 10 ** power <= planet.distanceKm)
  const power = rng.pick(powers)
  const answer = digitAt(planet.distanceKm, power)
  const name = PLACE_NAMES[power] as string
  return {
    kind: 'digit-place',
    text: `${planet.name}อยู่ห่างดวงอาทิตย์เฉลี่ย ${formatNumber(planet.distanceKm)} กิโลเมตร เลขโดดในหลัก${name}คือเลขอะไร`,
    answer,
    unit: '',
    format: 'digit',
    skill: 'addition',
    steps: [
      `นับหลักจากขวาไปซ้าย: หน่วย สิบ ร้อย พัน หมื่น แสน ล้าน สิบล้าน ร้อยล้าน พันล้าน`,
      `หลัก${name}ของ ${formatNumber(planet.distanceKm)} คือ ${answer}`,
    ],
    // หลักข้าง ๆ คือตัวที่เด็กนับพลาดไปหนึ่งช่อง
    distractors: [
      digitAt(planet.distanceKm, power - 1),
      digitAt(planet.distanceKm, power + 1),
      digitAt(planet.distanceKm, power - 2),
    ],
  }
}

const distanceGap: QuestionBuilder = (planet, tier) => {
  if (tier === 3) return null
  const other = getPlanet(planet.id === 'earth' ? 'mars' : 'earth')
  const a = distanceMillionKm(planet)
  const b = distanceMillionKm(other)
  const farther = a > b
  const answer = Math.abs(a - b)
  const big = Math.max(a, b)
  const small = Math.min(a, b)
  return {
    kind: 'distance-gap',
    text: `${planet.name}อยู่ห่างดวงอาทิตย์ประมาณ ${formatNumber(a)} ล้านกิโลเมตร ส่วน${other.name}อยู่ห่างประมาณ ${formatNumber(b)} ล้านกิโลเมตร ${planet.name}อยู่${farther ? 'ไกล' : 'ใกล้'}ดวงอาทิตย์กว่า${other.name}กี่ล้านกิโลเมตร`,
    answer,
    unit: 'ล้านกิโลเมตร',
    skill: 'subtraction',
    steps: [`ระยะที่ต่างกัน = ${formatNumber(big)} − ${formatNumber(small)} = ${formatNumber(answer)}`],
    distractors: [a + b, subtractWithoutBorrow(big, small), answer + 10, answer - 10, answer + 100],
  }
}

const moonCompare: QuestionBuilder = (planet, tier, rng) => {
  if (planet.moons === 0 || tier === 3) return null
  // ระดับ 2 ตัดคู่ที่ต่างกันแค่หลักหน่วยทิ้ง เช่นโลกกับดาวอังคาร ซึ่งง่ายเกินระดับ
  const partners = PLANETS.filter(
    (candidate) =>
      candidate.id !== planet.id &&
      candidate.moons > 0 &&
      (tier === 1 || Math.abs(candidate.moons - planet.moons) >= 10),
  )
  if (partners.length === 0) return null
  const other = rng.pick(partners)
  const total = tier === 1 && rng.chance(0.5)
  const big = Math.max(planet.moons, other.moons)
  const small = Math.min(planet.moons, other.moons)
  const bigName = planet.moons >= other.moons ? planet.name : other.name
  const intro = `${planet.name}มีดวงจันทร์ ${formatNumber(planet.moons)} ดวง ${other.name}มีดวงจันทร์ ${formatNumber(other.moons)} ดวง`

  if (total) {
    const answer = planet.moons + other.moons
    return {
      kind: 'moon-total',
      text: `${intro} ดาวสองดวงนี้มีดวงจันทร์รวมกันกี่ดวง`,
      answer,
      unit: 'ดวง',
      skill: 'addition',
      steps: [`${formatNumber(planet.moons)} + ${formatNumber(other.moons)} = ${formatNumber(answer)}`],
      distractors: [big - small, answer + 10, answer - 10, answer + 1],
    }
  }
  const answer = big - small
  return {
    kind: 'moon-gap',
    text: `${intro} ${bigName}มีดวงจันทร์มากกว่ากี่ดวง`,
    answer,
    unit: 'ดวง',
    skill: 'subtraction',
    steps: [`${formatNumber(big)} − ${formatNumber(small)} = ${formatNumber(answer)}`],
    distractors: [big + small, subtractWithoutBorrow(big, small), answer + 10, answer - 1],
  }
}

const venusDayYear: QuestionBuilder = (planet, tier) => {
  if (planet.id !== 'venus' || tier === 3) return null
  const day = Math.round(Math.abs(planet.spinHours) / 24)
  const year = planet.orbitDays
  const answer = day - year
  return {
    kind: 'venus-day-year',
    text: `หนึ่งวันของดาวศุกร์ (หมุนรอบตัวเองครบ 1 รอบ) ยาวประมาณ ${day} วันของโลก แต่หนึ่งปีของดาวศุกร์ (โคจรรอบดวงอาทิตย์ครบ 1 รอบ) ยาวประมาณ ${year} วันของโลก หนึ่งวันยาวกว่าหนึ่งปีกี่วัน`,
    answer,
    unit: 'วัน',
    skill: 'subtraction',
    steps: [`${day} − ${year} = ${answer}`, 'ดาวศุกร์จึงเป็นดาวที่หนึ่งวันยาวกว่าหนึ่งปี'],
    distractors: [subtractWithoutBorrow(day, year), day + year, answer + 10, answer - 10],
  }
}

/** อุณหภูมิเฉลี่ยที่เป็นบวก เทียบได้โดยไม่ต้องใช้จำนวนลบซึ่งยังไม่ได้เรียน */
const hotter: QuestionBuilder = (planet, tier, rng) => {
  if (tier === 3 || planet.meanTempC <= 0) return null
  const others = PLANETS.filter(
    (other) => other.id !== planet.id && other.meanTempC > 0,
  )
  const other = rng.pick(others)
  const hot = planet.meanTempC > other.meanTempC ? planet : other
  const cool = hot === planet ? other : planet
  const answer = hot.meanTempC - cool.meanTempC
  return {
    kind: 'hotter',
    text: `อุณหภูมิเฉลี่ยของ${planet.name}ประมาณ ${planet.meanTempC} องศาเซลเซียส ของ${other.name}ประมาณ ${other.meanTempC} องศาเซลเซียส ${hot.name}ร้อนกว่ากี่องศาเซลเซียส`,
    answer,
    unit: 'องศาเซลเซียส',
    skill: 'subtraction',
    steps: [`${hot.meanTempC} − ${cool.meanTempC} = ${answer}`],
    distractors: [
      subtractWithoutBorrow(hot.meanTempC, cool.meanTempC),
      hot.meanTempC + cool.meanTempC,
      answer + 10,
      answer - 10,
    ],
  }
}

function multiplierFor(tier: Tier, rng: Rng): number {
  if (tier === 1) return rng.int(2, 3)
  if (tier === 2) return rng.int(4, 9)
  return rng.int(11, 19)
}

const yearTimes: QuestionBuilder = (planet, tier, rng) => {
  const times = multiplierFor(tier, rng)
  const inner = planet.orbitDays < 1_000
  const length = inner ? planet.orbitDays : orbitYears(planet)
  const unit = inner ? 'วัน' : 'ปี'
  const answer = length * times
  const text = inner
    ? planet.id === 'earth'
      ? `โลกโคจรรอบดวงอาทิตย์ครบ 1 รอบใช้เวลาประมาณ ${length} วัน โลกโคจรครบ ${times} รอบ จะใช้เวลากี่วัน`
      : `หนึ่งปีของ${planet.name} (โคจรรอบดวงอาทิตย์ครบ 1 รอบ) ยาวประมาณ ${length} วันของโลก ${planet.name}โคจรครบ ${times} รอบ จะใช้เวลากี่วันของโลก`
    : `${planet.name}โคจรรอบดวงอาทิตย์ครบ 1 รอบใช้เวลาประมาณ ${length} ปีของโลก ถ้าโคจรครบ ${times} รอบ จะใช้เวลากี่ปีของโลก`
  return {
    kind: 'year-times',
    text,
    answer,
    unit,
    skill: 'multiplication',
    steps: [`${formatNumber(length)} × ${times} = ${formatNumber(answer)}`],
    distractors: [length * (times + 1), length * (times - 1), length + times, answer + 10, answer - 10],
  }
}

const orbitsIn: QuestionBuilder = (planet, tier, rng) => {
  if (tier === 1) return null
  if (planet.orbitDays < 1_000) {
    const times = tier === 2 ? rng.int(2, 9) : rng.int(10, 16)
    const total = planet.orbitDays * times
    return {
      kind: 'orbits-in',
      text:
        planet.id === 'earth'
          ? `โลกโคจรรอบดวงอาทิตย์ครบ 1 รอบใช้เวลาประมาณ 365 วัน ถ้าผ่านไป ${formatNumber(total)} วัน โลกจะโคจรได้กี่รอบ`
          : `${planet.name}โคจรรอบดวงอาทิตย์ครบ 1 รอบใช้เวลาประมาณ ${planet.orbitDays} วันของโลก ถ้าผ่านไป ${formatNumber(total)} วันของโลก ${planet.name}จะโคจรได้กี่รอบ`,
      answer: times,
      unit: 'รอบ',
      skill: 'division',
      steps: [`${formatNumber(total)} ÷ ${planet.orbitDays} = ${times}`],
      distractors: [times + 1, times - 1, times + 2, times * 10],
    }
  }
  // ดาวชั้นนอกที่หนึ่งรอบยาวจนคนทั้งชีวิตเห็นได้ไม่กี่รอบ ใช้เป็นโจทย์อายุ
  const years = orbitYears(planet)
  const maxTimes = Math.floor(96 / years)
  if (maxTimes < 2) return null
  const times = rng.int(2, maxTimes)
  const age = years * times
  const person = age >= 60 ? 'คุณยาย' : age >= 40 ? 'คุณลุง' : 'พี่สาว'
  return {
    kind: 'planet-age',
    text: `${person}อายุ ${age} ปี ถ้านับอายุเป็นปีของ${planet.name} (1 ปีของ${planet.name}ยาวประมาณ ${years} ปีของโลก) ${person}จะอายุกี่ปี`,
    answer: times,
    unit: 'ปี',
    skill: 'division',
    steps: [`${age} ÷ ${years} = ${times}`],
    distractors: [times + 1, times - 1, age - years, times + 2],
  }
}

/** คู่ดาวที่เส้นผ่านศูนย์กลางปัดเป็นหลักพันแล้วหารกันลงตัว */
function exactSizePairs(): [Planet, Planet][] {
  const pairs: [Planet, Planet][] = []
  for (const big of PLANETS) {
    for (const small of PLANETS) {
      const a = roundThousands(big.diameterKm)
      const b = roundThousands(small.diameterKm)
      if (a > b && a % b === 0 && a / b >= 2) pairs.push([big, small])
    }
  }
  return pairs
}

const sizeTimes: QuestionBuilder = (planet, tier, rng) => {
  if (tier === 1) return null
  if (tier === 2) {
    const pairs = exactSizePairs().filter(([big, small]) => big.id === planet.id || small.id === planet.id)
    if (pairs.length === 0) return null
    const [big, small] = rng.pick(pairs)
    const a = roundThousands(big.diameterKm)
    const b = roundThousands(small.diameterKm)
    const answer = a / b
    return {
      kind: 'size-times',
      text: `${big.name}กว้างประมาณ ${formatNumber(a)} กิโลเมตร ${small.name}กว้างประมาณ ${formatNumber(b)} กิโลเมตร ${big.name}กว้างเป็นกี่เท่าของ${small.name}`,
      answer,
      unit: 'เท่า',
      skill: 'division',
      steps: [`${formatNumber(a)} ÷ ${formatNumber(b)} = ${answer}`],
      distractors: [answer + 1, answer - 1, answer * 10, answer + 2],
    }
  }
  const partners = PLANETS.filter((other) => {
    if (other.id === planet.id) return false
    const big = Math.max(roundThousands(other.diameterKm), roundThousands(planet.diameterKm))
    const small = Math.min(roundThousands(other.diameterKm), roundThousands(planet.diameterKm))
    const ratio = big / small
    return ratio >= 1.5 && safelyRoundable(ratio)
  })
  if (partners.length === 0) return null
  const other = rng.pick(partners)
  const [big, small] =
    other.diameterKm > planet.diameterKm ? [other, planet] : [planet, other]
  const a = roundThousands(big.diameterKm)
  const b = roundThousands(small.diameterKm)
  const answer = Math.round(a / b)
  return {
    kind: 'size-round',
    text: `${big.name}กว้างประมาณ ${formatNumber(a)} กิโลเมตร ${small.name}กว้างประมาณ ${formatNumber(b)} กิโลเมตร ${big.name}กว้างเป็นประมาณกี่เท่าของ${small.name} (ตอบเป็นจำนวนเต็มที่ใกล้ที่สุด)`,
    answer,
    unit: 'เท่า',
    skill: 'division',
    steps: [
      `${formatNumber(a)} ÷ ${formatNumber(b)} ได้ประมาณ ${(a / b).toFixed(1)}`,
      `ปัดเป็นจำนวนเต็มที่ใกล้ที่สุดได้ ${answer}`,
    ],
    distractors: [answer + 1, answer - 1, answer * 10, answer + 2],
  }
}

const travelDays: QuestionBuilder = (planet, tier, rng) => {
  if (tier === 1 || planet.id === 'earth') return null
  const here = distanceMillionKm(planet)
  const earth = distanceMillionKm(getPlanet('earth'))
  const gap = Math.abs(here - earth)

  if (tier === 2) {
    const span = Math.round(gap / 10) * 10
    const speeds = [2, 4, 5, 10].filter((speed) => span % speed === 0)
    const speed = rng.pick(speeds)
    const answer = span / speed
    return {
      kind: 'travel-days',
      text: `ยานของเราบินได้วันละ ${speed} ล้านกิโลเมตร ถ้าบินเป็นเส้นตรงจากวงโคจรของโลกไปถึงวงโคจรของ${planet.name} ระยะทางประมาณ ${formatNumber(span)} ล้านกิโลเมตร จะใช้เวลากี่วัน`,
      answer,
      unit: 'วัน',
      skill: 'division',
      steps: [`${formatNumber(span)} ÷ ${speed} = ${formatNumber(answer)}`],
      distractors: [span * speed, answer + 10, answer - 10, answer + 1],
    }
  }

  // ระดับ 3 ให้ระยะจากดวงอาทิตย์ของทั้งสองดวง เด็กต้องลบก่อนแล้วค่อยหาร (สองขั้นตอน)
  const speeds = [2, 3, 4, 5, 6, 7, 8, 9].filter((speed) => gap % speed === 0)
  if (speeds.length === 0) return null
  const speed = rng.pick(speeds)
  const answer = gap / speed
  const big = Math.max(here, earth)
  const small = Math.min(here, earth)
  return {
    kind: 'travel-two-step',
    text: `โลกอยู่ห่างดวงอาทิตย์ประมาณ ${formatNumber(earth)} ล้านกิโลเมตร ${planet.name}อยู่ห่างประมาณ ${formatNumber(here)} ล้านกิโลเมตร ถ้ายานบินเป็นเส้นตรงจากวงโคจรของโลกไปวงโคจรของ${planet.name} ด้วยความเร็ววันละ ${speed} ล้านกิโลเมตร จะใช้เวลากี่วัน`,
    answer,
    unit: 'วัน',
    skill: 'wordProblems',
    steps: [
      `ขั้นที่ 1 หาระยะทาง ${formatNumber(big)} − ${formatNumber(small)} = ${formatNumber(gap)} ล้านกิโลเมตร`,
      `ขั้นที่ 2 หาเวลา ${formatNumber(gap)} ÷ ${speed} = ${formatNumber(answer)} วัน`,
    ],
    distractors: [
      Math.round((here + earth) / speed),
      Math.round(here / speed),
      answer + 10,
      answer - 1,
    ],
  }
}

/** ระยะจากโลกถึงดวงจันทร์ ปัดเป็นหลักพัน */
const MOON_KM = 384_000

const moonTrip: QuestionBuilder = (planet, tier, rng) => {
  if (planet.id !== 'earth' || tier === 1) return null
  if (tier === 2) {
    const speed = rng.pick([4_000, 6_000, 8_000, 12_000, 16_000])
    const answer = MOON_KM / speed
    return {
      kind: 'moon-trip',
      text: `ดวงจันทร์อยู่ห่างโลกประมาณ ${formatNumber(MOON_KM)} กิโลเมตร ถ้ายานบินได้ชั่วโมงละ ${formatNumber(speed)} กิโลเมตร จะใช้เวลากี่ชั่วโมงจึงถึงดวงจันทร์`,
      answer,
      unit: 'ชั่วโมง',
      skill: 'division',
      steps: [`${formatNumber(MOON_KM)} ÷ ${formatNumber(speed)} = ${answer}`],
      distractors: [answer * 10, answer + 10, answer - 8, answer + 2],
    }
  }
  const speed = rng.pick([2_000, 4_000, 8_000])
  const hours = MOON_KM / speed
  const answer = hours / 24
  return {
    kind: 'moon-trip-days',
    text: `ดวงจันทร์อยู่ห่างโลกประมาณ ${formatNumber(MOON_KM)} กิโลเมตร ถ้ายานบินได้ชั่วโมงละ ${formatNumber(speed)} กิโลเมตร จะใช้เวลากี่วันจึงถึงดวงจันทร์ (1 วัน = 24 ชั่วโมง)`,
    answer,
    unit: 'วัน',
    skill: 'wordProblems',
    steps: [
      `ขั้นที่ 1 หาเวลาเป็นชั่วโมง ${formatNumber(MOON_KM)} ÷ ${formatNumber(speed)} = ${hours} ชั่วโมง`,
      `ขั้นที่ 2 เปลี่ยนเป็นวัน ${hours} ÷ 24 = ${answer} วัน`,
    ],
    distractors: [hours, answer + 1, answer * 2, answer + 3],
  }
}

/**
 * ตาชั่งแบบสปริงบนดาวดวงอื่น
 *
 * ใช้คำว่า "ตาชั่งจะอ่านได้" ไม่ใช่ "หนักเท่าไร" โดยตั้งใจ
 * เพราะมวลของตัวเราไม่เปลี่ยน ที่เปลี่ยนคือแรงที่ดาวดึงตัวเราลงบนตาชั่ง
 * ประโยคนี้ถูกทั้งในวิชาคณิตศาสตร์และวิทยาศาสตร์ ครูจึงเอาไปต่อยอดได้
 */
const weighIn: QuestionBuilder = (planet, tier, rng) => {
  if (planet.id === 'earth') {
    if (tier === 1) return null
    const weight = rng.pick([24, 30, 36, 42, 48])
    const answer = weight / 6
    return {
      kind: 'moon-weight',
      text: `บนดวงจันทร์ ตาชั่งแบบสปริงจะอ่านได้ประมาณ 1 ใน 6 ของตอนชั่งบนโลก ถ้าชั่งบนโลกได้ ${weight} กิโลกรัม เมื่อไปชั่งบนดวงจันทร์ ตาชั่งจะอ่านได้ประมาณกี่กิโลกรัม`,
      answer,
      unit: 'กิโลกรัม',
      skill: 'fractions',
      steps: [`1 ใน 6 ของ ${weight} คือ ${weight} ÷ 6 = ${answer}`],
      distractors: [weight * 6, weight - 6, answer + 1, answer + 2],
    }
  }
  if (tier !== 3) return null
  const tenths = planet.gravityTenths
  const weights = [20, 25, 30, 35, 40, 45, 50].filter((weight) => (weight * tenths) % 10 === 0)
  const weight = rng.pick(weights)
  const answer = (weight * tenths) / 10
  const factor = `${Math.floor(tenths / 10)}.${tenths % 10}`
  return {
    kind: 'weigh-in',
    text: `ถ้าชั่งน้ำหนักบนโลกได้ ${weight} กิโลกรัม เมื่อเอาตาชั่งเครื่องเดิมไปชั่งบน${planet.name} ตาชั่งจะอ่านได้ประมาณ ${factor} เท่าของบนโลก ตาชั่งจะอ่านได้กี่กิโลกรัม`,
    answer,
    unit: 'กิโลกรัม',
    skill: 'decimals',
    steps: [`${weight} × ${factor} = ${answer}`],
    distractors: [weight * tenths, weight, answer + 1, answer + 10],
  }
}

/** แสงเดินทางได้ราว 300,000 กิโลเมตรต่อวินาที หรือราว 18 ล้านกิโลเมตรต่อนาที */
const LIGHT_MILLION_KM_PER_MINUTE = 18

const lightMinutes: QuestionBuilder = (planet, tier) => {
  if (tier !== 3) return null
  const distance = distanceMillionKm(planet)
  const exact = distance / LIGHT_MILLION_KM_PER_MINUTE
  if (!safelyRoundable(exact)) return null
  const answer = Math.round(exact)
  return {
    kind: 'light-minutes',
    text: `แสงเดินทางได้ประมาณนาทีละ ${LIGHT_MILLION_KM_PER_MINUTE} ล้านกิโลเมตร ${planet.name}อยู่ห่างดวงอาทิตย์ประมาณ ${formatNumber(distance)} ล้านกิโลเมตร แสงจากดวงอาทิตย์ใช้เวลาเดินทางไปถึง${planet.name}ประมาณกี่นาที (ตอบเป็นจำนวนเต็มที่ใกล้ที่สุด)`,
    answer,
    unit: 'นาที',
    skill: 'division',
    steps: [
      `${formatNumber(distance)} ÷ ${LIGHT_MILLION_KM_PER_MINUTE} ได้ประมาณ ${exact.toFixed(1)}`,
      `ปัดเป็นจำนวนเต็มที่ใกล้ที่สุดได้ ${formatNumber(answer)} นาที`,
    ],
    distractors: [answer + 1, answer - 1, answer * 10, answer + 10],
  }
}

const spinCount: QuestionBuilder = (planet, tier, rng) => {
  const hours = Math.round(Math.abs(planet.spinHours))
  if (hours <= 48) {
    if (tier !== 2) return null
    const times = rng.int(2, 9)
    const total = hours * times
    return {
      kind: 'spin-count',
      text:
        planet.id === 'earth'
          ? `โลกหมุนรอบตัวเองครบ 1 รอบใช้เวลาประมาณ ${hours} ชั่วโมง ใน ${total} ชั่วโมง โลกหมุนรอบตัวเองได้กี่รอบ`
          : `หนึ่งวันของ${planet.name} (หมุนรอบตัวเองครบ 1 รอบ) ยาวประมาณ ${hours} ชั่วโมง ใน ${total} ชั่วโมง ${planet.name}หมุนรอบตัวเองได้กี่รอบ`,
      answer: times,
      unit: 'รอบ',
      skill: 'division',
      steps: [`${total} ÷ ${hours} = ${times}`],
      distractors: [times + 1, times - 1, total - hours, times + 2],
    }
  }
  // ดาวที่หมุนช้ามาก (ดาวพุธ ดาวศุกร์) นับเป็นวันของโลกแล้วใช้เป็นโจทย์คูณ
  if (tier === 3) return null
  const days = Math.round(hours / 24)
  const times = tier === 1 ? rng.int(2, 3) : rng.int(4, 9)
  const answer = days * times
  return {
    kind: 'slow-spin',
    text: `${planet.name}หมุนรอบตัวเองช้ามาก หมุนครบ 1 รอบใช้เวลาประมาณ ${days} วันของโลก ถ้าหมุนครบ ${times} รอบ จะใช้เวลากี่วันของโลก`,
    answer,
    unit: 'วัน',
    skill: 'multiplication',
    steps: [`${days} × ${times} = ${formatNumber(answer)}`],
    distractors: [days * (times + 1), days + times, answer + 10, answer - 10],
  }
}

const olympus: QuestionBuilder = (planet, tier) => {
  if (planet.id !== 'mars' || tier === 3) return null
  if (tier === 1) {
    return {
      kind: 'olympus-km',
      text: 'ภูเขาไฟโอลิมปัสบนดาวอังคารสูงประมาณ 22 กิโลเมตร ยอดเขาเอเวอเรสต์บนโลกสูงประมาณ 9 กิโลเมตร ภูเขาไฟโอลิมปัสสูงกว่ากี่กิโลเมตร',
      answer: 13,
      unit: 'กิโลเมตร',
      skill: 'subtraction',
      steps: ['22 − 9 = 13'],
      distractors: [31, 17, 12, 14],
    }
  }
  const mountain = 21_900
  const everest = 8_849
  const answer = mountain - everest
  return {
    kind: 'olympus-m',
    text: `ภูเขาไฟโอลิมปัสบนดาวอังคารสูงประมาณ ${formatNumber(mountain)} เมตร ยอดเขาเอเวอเรสต์บนโลกสูง ${formatNumber(everest)} เมตร ภูเขาไฟโอลิมปัสสูงกว่ากี่เมตร`,
    answer,
    unit: 'เมตร',
    skill: 'subtraction',
    steps: [`${formatNumber(mountain)} − ${formatNumber(everest)} = ${formatNumber(answer)}`],
    distractors: [
      subtractWithoutBorrow(mountain, everest),
      mountain + everest,
      answer + 1_000,
      answer - 100,
    ],
  }
}

/**
 * ดาวแก๊สเป็นลูกบอลกลวงแล้วใส่โลกได้กี่ใบ (อัตราส่วนปริมาตรจาก NASA)
 * ดาวพฤหัสบดี 1,321 · ดาวเสาร์ 764 · ดาวยูเรนัส 63 · ดาวเนปจูน 58
 */
const EARTHS_INSIDE: Partial<Record<PlanetId, number>> = {
  jupiter: 1_321,
  saturn: 764,
  uranus: 63,
  neptune: 58,
}

const bigBall: QuestionBuilder = (planet, tier) => {
  if (tier === 3) return null
  const count = EARTHS_INSIDE[planet.id]
  if (count === undefined) return null
  const partnerId: PlanetId =
    planet.id === 'jupiter'
      ? 'saturn'
      : planet.id === 'saturn'
        ? 'jupiter'
        : planet.id === 'uranus'
          ? 'neptune'
          : 'uranus'
  const partner = getPlanet(partnerId)
  const partnerCount = EARTHS_INSIDE[partnerId] as number
  // ระดับ 1 ใช้ตัวเลขที่ปัดเป็นหลักสิบแล้ว ระดับ 2 ใช้ตัวเลขเต็มซึ่งต้องยืมหลายหลัก
  const round = (value: number): number => (tier === 1 && value > 100 ? Math.round(value / 10) * 10 : value)
  const a = round(count)
  const b = round(partnerCount)
  const big = Math.max(a, b)
  const small = Math.min(a, b)
  const bigName = a >= b ? planet.name : partner.name
  const answer = big - small
  return {
    kind: 'big-ball',
    text: `ถ้าดาวเป็นลูกบอลกลวง ${planet.name}จะใส่โลกได้ประมาณ ${formatNumber(a)} ใบ ${partner.name}ใส่ได้ประมาณ ${formatNumber(b)} ใบ ${bigName}ใส่โลกได้มากกว่ากี่ใบ`,
    answer,
    unit: 'ใบ',
    skill: 'subtraction',
    steps: [`${formatNumber(big)} − ${formatNumber(small)} = ${formatNumber(answer)}`],
    distractors: [subtractWithoutBorrow(big, small), big + small, answer + 10, answer - 1],
  }
}

/** ปีที่ค้นพบดาวชั้นนอกสองดวงที่มองด้วยตาเปล่าไม่เห็น */
const DISCOVERED: Partial<Record<PlanetId, number>> = {
  uranus: 1781,
  neptune: 1846,
}

const discovery: QuestionBuilder = (planet, tier, rng) => {
  const found = DISCOVERED[planet.id]
  if (found === undefined || tier === 3) return null
  const years = orbitYears(planet)
  const laps = tier === 1 ? 1 : planet.id === 'uranus' ? rng.int(2, 3) : 1
  const answer = found + years * laps
  const lapText = laps === 1 ? 'ครบ 1 รอบ' : `ครบ ${laps} รอบ`
  return {
    kind: 'discovery',
    text: `${planet.name}ถูกค้นพบในปี ค.ศ. ${found} และโคจรรอบดวงอาทิตย์ครบ 1 รอบใช้เวลาประมาณ ${years} ปี นับจากวันที่ค้นพบ ${planet.name}จะโคจร${lapText}ในปี ค.ศ. ใด`,
    answer,
    unit: '',
    format: 'year',
    skill: laps === 1 ? 'addition' : 'wordProblems',
    steps:
      laps === 1
        ? [`${found} + ${years} = ${answer}`]
        : [`ขั้นที่ 1 ${years} × ${laps} = ${years * laps} ปี`, `ขั้นที่ 2 ${found} + ${years * laps} = ${answer}`],
    distractors: [found + years * (laps + 1), found + years + 10, answer - 10, found - years],
  }
}

const QUESTION_BUILDERS: readonly QuestionBuilder[] = [
  digitPlace,
  distanceGap,
  moonCompare,
  venusDayYear,
  hotter,
  yearTimes,
  orbitsIn,
  sizeTimes,
  travelDays,
  moonTrip,
  weighIn,
  lightMinutes,
  spinCount,
  olympus,
  bigBall,
  discovery,
]

/**
 * ต่อตัวลวงจนครบสี่ตัวเลือก
 *
 * ตัวลวงที่ใช้ไม่ได้ถูกทิ้งไป (ติดลบ ซ้ำกับคำตอบ ซ้ำกันเอง หรือไม่ใช่จำนวนเต็ม)
 * ถ้าเหลือไม่ถึงสามตัว เติมด้วยตัวเลขใกล้ ๆ คำตอบ
 * เลขโดดต้องอยู่ในช่วง 0–9 เท่านั้น ไม่งั้นตัวเลือกจะบอกใบ้ว่าตัวไหนผิดแน่ ๆ
 */
function finishChoices(draft: QuestionDraft, rng: Rng): number[] {
  const digit = draft.format === 'digit'
  const usable = (value: number): boolean =>
    Number.isInteger(value) &&
    value !== draft.answer &&
    (digit ? value >= 0 && value <= 9 : value > 0)

  const chosen: number[] = []
  for (const value of draft.distractors) {
    if (usable(value) && !chosen.includes(value)) chosen.push(value)
    if (chosen.length === 3) break
  }

  const step = digit ? 1 : draft.answer >= 1_000 ? 100 : draft.answer >= 100 ? 10 : 1
  const fallbacks = digit
    ? rng.shuffle([0, 1, 2, 3, 4, 5, 6, 7, 8, 9])
    : rng.shuffle([1, -1, 2, -2, 3, -3, 4, 5]).map((offset) => draft.answer + offset * step)
  for (const value of fallbacks) {
    if (chosen.length === 3) break
    if (usable(value) && !chosen.includes(value)) chosen.push(value)
  }
  return rng.shuffle([draft.answer, ...chosen])
}

/** โจทย์ทุกแบบที่ใช้กับดาวดวงนี้ได้ในระดับนี้ */
export function questionOptions(planetId: PlanetId, tier: Tier, seed: string): PlanetQuestion[] {
  const planet = getPlanet(planetId)
  const questions: PlanetQuestion[] = []
  QUESTION_BUILDERS.forEach((build, index) => {
    const rng = createRng(`solar-question-${seed}-${planetId}-${tier}-${index}`)
    const draft = build(planet, tier, rng)
    if (!draft) return
    questions.push({
      kind: draft.kind,
      planet: planetId,
      text: draft.text,
      answer: draft.answer,
      choices: finishChoices(draft, rng),
      unit: draft.unit,
      format: draft.format ?? 'number',
      skill: draft.skill,
      steps: draft.steps,
    })
  })
  return questions
}

export function buildQuestion(planetId: PlanetId, tier: Tier, seed: string): PlanetQuestion {
  const options = questionOptions(planetId, tier, seed)
  const rng = createRng(`solar-question-pick-${seed}-${planetId}-${tier}`)
  return rng.pick(options)
}

/** ข้อความของตัวเลือกหนึ่งตัว รวมหน่วย */
export function formatAnswer(question: Pick<PlanetQuestion, 'format' | 'unit'>, value: number): string {
  const number =
    question.format === 'year' ? `ค.ศ. ${value}` : question.format === 'digit' ? `${value}` : formatNumber(value)
  return question.unit ? `${number} ${question.unit}` : number
}
