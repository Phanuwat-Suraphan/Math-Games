/**
 * โจทย์คณิตศาสตร์ทั้งหมดของ Safe Zone Guardians
 *
 * แบ่งเป็นสองกลุ่ม
 *
 * กลุ่มแรกคือโจทย์ของโดรนในเขาวงกต เป็นบวกลบเลขสองหลัก
 * ตั้งใจให้ง่ายกว่าระดับชั้นจริง เพราะหน้าที่ของมันคือ "ด่านผ่านทาง"
 * ที่ไม่ควรหยุดการสำรวจไว้นาน ถ้ายากเท่าภารกิจหลัก เด็กจะเลิกเดินสำรวจ
 * แล้วเกมจะเหลือแค่แบบฝึกหัดที่มีฉากสามมิติเป็นฉากหลัง
 *
 * กลุ่มที่สองคือภารกิจในห้องควบคุม ผูกกับตัวชี้วัด ป.4 สี่ตัวโดยตรง
 *   ป.4/7  ประมาณค่าผลลัพธ์ของการบวกจำนวนนับที่มากกว่า 100,000
 *   ป.4/8  หาค่าตัวไม่ทราบค่าในประโยคสัญลักษณ์
 *   ป.4/11 แสดงวิธีหาคำตอบของโจทย์ปัญหาสองขั้นตอน
 *   ป.4/12 สร้างโจทย์ปัญหาพร้อมหาคำตอบ
 *
 * ทุกโจทย์สร้างจาก seed จึงสร้างชุดเดิมซ้ำได้ ซึ่งจำเป็นสองอย่าง
 * ครูเปิดชุดเดียวกันให้ทั้งห้องดูพร้อมกันได้ และชุดทดสอบตรวจซ้ำได้
 */

import { createRng } from '../math/rng'
import type { Rng } from '../math/rng'
import type { SurvivalItemId } from './types'

/** ใส่ลูกน้ำคั่นหลักพัน เพื่อให้เด็กอ่านจำนวนหลักแสนหลักล้านได้ถูกหลัก */
export function formatNumber(value: number): string {
  return value.toLocaleString('en-US')
}

const MILLION = 1_000_000

/* ------------------------------------------------------------------ *
 * Phase 1 — โจทย์ของโดรนรักษาความปลอดภัย
 * ------------------------------------------------------------------ */

export interface DronePuzzle {
  itemId: SurvivalItemId
  /** ประโยคสัญลักษณ์ที่แสดงบนจอโดรน เช่น 45 + 38 = ? */
  expression: string
  left: number
  right: number
  operator: '+' | '−'
  answer: number
  choices: number[]
}

/**
 * ตัวเลือกลวงที่ "ผิดอย่างมีเหตุผล"
 *
 * ไม่สุ่มตัวเลขมั่ว ๆ เพราะตัวเลือกที่ห่างจากคำตอบมากเกินไปถูกตัดทิ้งได้
 * โดยไม่ต้องคำนวณเลย ซึ่งเท่ากับเปลี่ยนโจทย์สี่ตัวเลือกเป็นโจทย์สองตัวเลือก
 * ค่าที่ใช้จึงเป็นความผิดพลาดที่เด็กทำจริง คือลืมทด คิดหลักสิบพลาด และบวกเกินหนึ่ง
 */
function distractorsFor(answer: number, rng: Rng): number[] {
  const offsets = rng.shuffle([10, -10, 1, -1, 9, -9, 11, -11, 20, -20])
  const chosen: number[] = []
  for (const offset of offsets) {
    const candidate = answer + offset
    if (candidate < 0) continue
    if (candidate === answer) continue
    if (chosen.includes(candidate)) continue
    chosen.push(candidate)
    if (chosen.length === 3) break
  }
  return chosen
}

export function generateDronePuzzle(
  seed: string,
  itemId: SurvivalItemId,
  attempt: number,
): DronePuzzle {
  const rng = createRng(`safezone-drone-${seed}-${itemId}-${attempt}`)
  const addition = rng.chance(0.5)

  let left = rng.int(21, 89)
  let right = rng.int(12, 79)
  if (!addition && right >= left) {
    // ลบต้องไม่ติดลบ เพราะ ป.4 ยังไม่เรียนจำนวนเต็มลบ
    const swap = left
    left = right + rng.int(1, 10)
    right = Math.min(swap, left - 1)
  }

  const answer = addition ? left + right : left - right
  const operator = addition ? '+' : '−'
  return {
    itemId,
    expression: `${left} ${operator} ${right} = ?`,
    left,
    right,
    operator,
    answer,
    choices: rng.shuffle([answer, ...distractorsFor(answer, rng)]),
  }
}

/* ------------------------------------------------------------------ *
 * Phase 3 — ภารกิจในห้องควบคุม
 * ------------------------------------------------------------------ */

export type MissionId = 'energy' | 'air' | 'water' | 'supply'

interface MissionBase {
  id: MissionId
  /** ตัวชี้วัดของหลักสูตร แสดงบนจอให้ครูตรวจสอบได้ว่าตรงกับที่สอน */
  indicator: string
  title: string
  /** สถานการณ์ที่เล่าก่อนถามคำถาม */
  scenario: string
  question: string
}

/** ป.4/7 ประมาณค่าผลรวมของพลังงานที่ผลิตได้ */
export interface EstimateMission extends MissionBase {
  kind: 'estimate'
  solar: number
  wind: number
  exact: number
  roundedSolar: number
  roundedWind: number
  answer: number
  choices: number[]
}

/** ป.4/8 หาค่าตัวไม่ทราบค่าในประโยคสัญลักษณ์ */
export interface UnknownMission extends MissionBase {
  kind: 'unknown'
  /** ออกซิเจนที่มีอยู่แล้ว */
  known: number
  /** ปริมาณที่ต้องมีให้ครบ */
  target: number
  answer: number
  sentence: string
}

/** ป.4/11 โจทย์ปัญหาสองขั้นตอน */
export interface TwoStepMission extends MissionBase {
  kind: 'twoStep'
  total: number
  farm: number
  hospital: number
  /** ขั้นที่หนึ่ง รวมน้ำที่จ่ายออกไปทั้งหมด */
  stepOne: number
  /** ขั้นที่สอง น้ำที่เหลือ */
  answer: number
  stepOneQuestion: string
  stepTwoQuestion: string
}

/** ป.4/12 ผู้เล่นสร้างโจทย์ของตัวเองจากตัวเลือกสามชุด */
export interface BuilderMission extends MissionBase {
  kind: 'builder'
  startOptions: number[]
  giveOptions: number[]
  growOptions: number[]
}

export type Mission =
  | EstimateMission
  | UnknownMission
  | TwoStepMission
  | BuilderMission

/** ปัดเป็นหลักล้านที่ใกล้ที่สุด วิธีเดียวกับที่สอนในห้องเรียน */
export function roundToMillion(value: number): number {
  return Math.round(value / MILLION) * MILLION
}

/** ปัดเป็นหลักแสนที่ใกล้ที่สุด */
export function roundToHundredThousand(value: number): number {
  return Math.round(value / 100_000) * 100_000
}

/**
 * ห่างจากจุดกึ่งกลางระหว่างหลักล้านสองจำนวนพอไหม
 *
 * จำนวนอย่าง 2,499,000 ปัดเป็นหลักล้านได้ 2,000,000 ตามกฎ
 * แต่เด็กที่ตอบ 3,000,000 ไม่ได้ "ไม่เข้าใจการประมาณค่า" เขาแค่ปัดพลาดหลักเดียว
 * โจทย์ที่ลงโทษความผิดพลาดระดับนั้นวัดความรอบคอบ ไม่ได้วัดความเข้าใจ
 * จึงหลีกเลี่ยงจำนวนที่คาบเส้นตั้งแต่ตอนสร้างโจทย์
 */
function safeToRound(value: number): boolean {
  const remainder = value % MILLION
  return Math.abs(remainder - MILLION / 2) > 120_000
}

function buildEstimateMission(seed: string): EstimateMission {
  const rng = createRng(`safezone-mission-energy-${seed}`)

  /*
   * เงื่อนไขของจำนวนที่ใช้ได้
   *
   * ในห้องเรียนมีสองวิธีที่ถูกทั้งคู่ คือปัดทีละจำนวนแล้วค่อยบวก
   * กับบวกให้เสร็จก่อนแล้วค่อยปัด ปกติสองวิธีนี้ให้คำตอบเท่ากัน
   * แต่ไม่เท่ากันเสมอไป และเมื่อไม่เท่า เด็กที่ใช้วิธีที่สองจะถูกบอกว่าผิด
   * ทั้งที่ทำถูกทุกขั้น จึงคัดเฉพาะจำนวนที่ทั้งสองวิธีตรงกันมาเป็นโจทย์
   */
  let solar = 0
  let wind = 0
  let usable = false
  for (let attempt = 0; attempt < 200 && !usable; attempt += 1) {
    solar = rng.int(12, 48) * 100_000 + rng.int(0, 9) * 1_000
    wind = rng.int(8, 32) * 100_000 + rng.int(0, 9) * 1_000
    usable =
      safeToRound(solar) &&
      safeToRound(wind) &&
      safeToRound(solar + wind) &&
      roundToMillion(solar) + roundToMillion(wind) === roundToMillion(solar + wind)
  }

  if (!usable) {
    /*
     * ซ่อมให้ใช้ได้แน่นอน แทนที่จะปล่อยโจทย์ที่กำกวมออกไป
     * เศษบวกเล็ก ๆ ทั้งสองจำนวนแปลว่าทั้งคู่ปัดลง และผลรวมของเศษ
     * ยังไม่ถึงครึ่งล้าน ผลรวมจึงปัดลงเหมือนกัน สองวิธีจึงตรงกันเสมอ
     */
    solar = roundToMillion(solar) + 130_000
    wind = roundToMillion(wind) + 120_000
  }

  const roundedSolar = roundToMillion(solar)
  const roundedWind = roundToMillion(wind)
  const answer = roundedSolar + roundedWind
  const exact = solar + wind

  /*
   * ตัวเลือกห่างกันหนึ่งล้านเสมอ
   *
   * ถ้าห่างกันน้อยกว่านี้ การประมาณค่าจะแยกตัวเลือกไม่ออก
   * แล้วโจทย์จะกลายเป็นโจทย์บวกจริงที่ต้องคำนวณให้แม่น
   * ซึ่งเป็นคนละทักษะกับที่ตัวชี้วัด ป.4/7 ต้องการวัด
   */
  const options = new Set<number>([answer])
  for (const offset of [MILLION, -MILLION, 2 * MILLION, -2 * MILLION]) {
    if (options.size >= 4) break
    const candidate = answer + offset
    if (candidate > 0) options.add(candidate)
  }

  return {
    kind: 'estimate',
    id: 'energy',
    indicator: 'ป.4/7 ประมาณค่าผลลัพธ์ของการบวก',
    title: 'ภารกิจที่ 1 · ประเมินพลังงาน',
    scenario: `แผงโซลาร์ของโดมผลิตไฟได้ ${formatNumber(solar)} หน่วย และกังหันลมผลิตได้อีก ${formatNumber(wind)} หน่วย`,
    question: 'วันนี้โดมมีไฟฟ้ารวมกันประมาณกี่หน่วย',
    solar,
    wind,
    exact,
    roundedSolar,
    roundedWind,
    answer,
    choices: rng.shuffle([...options]),
  }
}

function buildUnknownMission(seed: string): UnknownMission {
  const rng = createRng(`safezone-mission-air-${seed}`)

  const target = rng.int(35, 92) * 10_000 + rng.int(1, 99) * 100
  const known = rng.int(12, Math.floor((target * 0.6) / 10_000)) * 10_000 + rng.int(0, 99) * 100
  const answer = target - known

  return {
    kind: 'unknown',
    id: 'air',
    indicator: 'ป.4/8 หาค่าตัวไม่ทราบค่าในประโยคสัญลักษณ์',
    title: 'ภารกิจที่ 2 · ปรับสมดุลอากาศ',
    scenario: `เครื่องฟอกอากาศผลิตออกซิเจนได้ ${formatNumber(known)} ลิตร แต่ทั้งโดมต้องใช้ ${formatNumber(target)} ลิตร`,
    question: 'ต้องเปิดถังออกซิเจนสำรองเพิ่มอีกกี่ลิตร',
    known,
    target,
    answer,
    sentence: `[ ? ] + ${formatNumber(known)} = ${formatNumber(target)}`,
  }
}

function buildTwoStepMission(seed: string): TwoStepMission {
  const rng = createRng(`safezone-mission-water-${seed}`)

  const total = rng.int(62, 95) * 10_000 + rng.int(1, 99) * 100
  const farm = rng.int(15, 28) * 10_000 + rng.int(0, 99) * 100
  const hospital = rng.int(12, 24) * 10_000 + rng.int(0, 99) * 100
  const stepOne = farm + hospital

  return {
    kind: 'twoStep',
    id: 'water',
    indicator: 'ป.4/11 โจทย์ปัญหาสองขั้นตอน',
    title: 'ภารกิจที่ 3 · บริหารน้ำกู้ชีพ',
    scenario: `ถังน้ำสำรองของโดมมีน้ำอยู่ ${formatNumber(total)} ลิตร วันนี้จ่ายให้แปลงเกษตร ${formatNumber(farm)} ลิตร และจ่ายให้ห้องพยาบาล ${formatNumber(hospital)} ลิตร`,
    question: 'สิ้นวันนี้โดมจะเหลือน้ำกี่ลิตร',
    total,
    farm,
    hospital,
    stepOne,
    answer: total - stepOne,
    stepOneQuestion: 'ขั้นที่ 1 — วันนี้จ่ายน้ำออกไปทั้งหมดกี่ลิตร',
    stepTwoQuestion: 'ขั้นที่ 2 — แล้วจะเหลือน้ำกี่ลิตร',
  }
}

function buildBuilderMission(seed: string): BuilderMission {
  const rng = createRng(`safezone-mission-supply-${seed}`)

  /*
   * ตัวเลือกทุกชุดต้องประกอบกันแล้วได้โจทย์ที่ตอบได้เสมอ
   *
   * เสบียงตั้งต้นที่น้อยที่สุดต้องมากกว่าปริมาณที่แจกจ่ายมากที่สุด
   * ไม่งั้นเด็กจะเลือกชุดที่ทำให้เสบียงติดลบได้ ซึ่งเป็นจำนวนที่ ป.4 ยังไม่เรียน
   * และเป็นความผิดของคนออกแบบโจทย์ ไม่ใช่ของเด็กที่เลือก
   */
  const startOptions = rng
    .shuffle([72, 80, 88, 94, 65])
    .slice(0, 3)
    .map((value) => value * 10_000)
  const giveOptions = rng
    .shuffle([15, 22, 30, 38, 45])
    .slice(0, 3)
    .map((value) => value * 10_000)
  const growOptions = rng
    .shuffle([11, 15, 18, 25, 31])
    .slice(0, 3)
    .map((value) => value * 10_000)

  return {
    kind: 'builder',
    id: 'supply',
    indicator: 'ป.4/12 สร้างโจทย์ปัญหาพร้อมหาคำตอบ',
    title: 'ภารกิจที่ 4 · วางแผนเสบียงระยะยาว',
    scenario:
      'ห้องควบคุมให้สิทธิ์หนูวางแผนเสบียงของโดมเอง เลือกตัวเลขในช่องว่างให้ครบ แล้วคำนวณคำตอบของโจทย์ที่หนูสร้างขึ้น',
    question: 'เมื่อจบเดือนนี้ โดมจะมีเสบียงเหลือกี่กิโลกรัม',
    startOptions: startOptions.sort((a, b) => a - b),
    giveOptions: giveOptions.sort((a, b) => a - b),
    growOptions: growOptions.sort((a, b) => a - b),
  }
}

/** คำตอบของโจทย์ที่ผู้เล่นสร้างเอง มีตั้งต้น แจกจ่ายออก แล้วปลูกเพิ่ม */
export function builderAnswer(start: number, give: number, grow: number): number {
  return start - give + grow
}

/** ภารกิจทั้งสี่ของห้องควบคุม เรียงตามลำดับที่ต้องเล่น */
export function buildMissions(seed: string): Mission[] {
  return [
    buildEstimateMission(seed),
    buildUnknownMission(seed),
    buildTwoStepMission(seed),
    buildBuilderMission(seed),
  ]
}

/**
 * ตรวจว่าภารกิจหนึ่งภารกิจสมเหตุสมผลไหม
 *
 * ใช้ทั้งในชุดทดสอบและตอนสร้างจริง เพราะโจทย์ที่ผิดคือความเสียหายกับเด็กโดยตรง
 * เด็กที่คิดถูกแล้วถูกบอกว่าผิด จะเลิกเชื่อวิธีคิดของตัวเอง
 * ซึ่งแก้ยากกว่าการสอนเนื้อหาที่ยังไม่รู้เสียอีก
 */
export function validateMission(mission: Mission): string[] {
  const problems: string[] = []
  const requireAboveHundredThousand = (label: string, value: number): void => {
    if (value <= 100_000) {
      problems.push(`${label} ต้องมากกว่า 100,000 แต่ได้ ${value}`)
    }
  }

  switch (mission.kind) {
    case 'estimate': {
      requireAboveHundredThousand('พลังงานจากโซลาร์', mission.solar)
      requireAboveHundredThousand('พลังงานจากกังหันลม', mission.wind)
      if (mission.roundedSolar !== roundToMillion(mission.solar)) {
        problems.push('ค่าที่ปัดของแผงโซลาร์ไม่ตรงกับการปัดหลักล้าน')
      }
      if (mission.roundedWind !== roundToMillion(mission.wind)) {
        problems.push('ค่าที่ปัดของกังหันลมไม่ตรงกับการปัดหลักล้าน')
      }
      if (mission.answer !== mission.roundedSolar + mission.roundedWind) {
        problems.push('คำตอบไม่เท่ากับผลบวกของค่าที่ปัดแล้ว')
      }
      if (Math.abs(mission.exact - mission.answer) > 500_000) {
        problems.push('ค่าประมาณห่างจากผลบวกจริงเกินครึ่งล้าน')
      }
      if (mission.answer !== roundToMillion(mission.exact)) {
        problems.push('ปัดทีละจำนวนแล้วบวก ได้ไม่เท่ากับบวกแล้วค่อยปัด')
      }
      if (!mission.choices.includes(mission.answer)) {
        problems.push('ตัวเลือกไม่มีคำตอบที่ถูก')
      }
      if (new Set(mission.choices).size !== mission.choices.length) {
        problems.push('ตัวเลือกซ้ำกัน')
      }
      if (mission.choices.some((choice) => choice <= 0)) {
        problems.push('มีตัวเลือกที่ไม่เป็นจำนวนนับ')
      }
      break
    }
    case 'unknown': {
      requireAboveHundredThousand('ปริมาณที่ต้องใช้ทั้งหมด', mission.target)
      requireAboveHundredThousand('ปริมาณที่มีอยู่แล้ว', mission.known)
      if (mission.answer !== mission.target - mission.known) {
        problems.push('คำตอบไม่ตรงกับ เป้าหมาย ลบ ค่าที่มีอยู่')
      }
      if (mission.answer <= 0) problems.push('คำตอบต้องเป็นจำนวนนับ')
      break
    }
    case 'twoStep': {
      requireAboveHundredThousand('น้ำสำรองทั้งหมด', mission.total)
      requireAboveHundredThousand('น้ำที่จ่ายให้แปลงเกษตร', mission.farm)
      requireAboveHundredThousand('น้ำที่จ่ายให้ห้องพยาบาล', mission.hospital)
      if (mission.stepOne !== mission.farm + mission.hospital) {
        problems.push('ขั้นที่ 1 ไม่ตรงกับผลบวกของสองแผนก')
      }
      if (mission.answer !== mission.total - mission.stepOne) {
        problems.push('ขั้นที่ 2 ไม่ตรงกับน้ำทั้งหมดลบด้วยขั้นที่ 1')
      }
      if (mission.answer <= 0) problems.push('น้ำที่เหลือต้องเป็นจำนวนนับ')
      break
    }
    case 'builder': {
      const smallestStart = Math.min(...mission.startOptions)
      const biggestGive = Math.max(...mission.giveOptions)
      if (smallestStart <= biggestGive) {
        problems.push('เลือกชุดที่ทำให้เสบียงติดลบได้')
      }
      for (const value of [
        ...mission.startOptions,
        ...mission.giveOptions,
        ...mission.growOptions,
      ]) {
        if (value % 100 !== 0) problems.push(`ตัวเลือก ${value} ไม่ใช่จำนวนที่อ่านง่าย`)
      }
      requireAboveHundredThousand('เสบียงตั้งต้นที่น้อยที่สุด', smallestStart)
      if (mission.startOptions.length !== 3) problems.push('ตัวเลือกเสบียงตั้งต้นต้องมีสามค่า')
      if (mission.giveOptions.length !== 3) problems.push('ตัวเลือกการแจกจ่ายต้องมีสามค่า')
      if (mission.growOptions.length !== 3) problems.push('ตัวเลือกการปลูกเพิ่มต้องมีสามค่า')
      break
    }
    default:
      problems.push('ไม่รู้จักชนิดของภารกิจ')
  }

  return problems
}
