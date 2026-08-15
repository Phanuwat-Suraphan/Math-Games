/**
 * เครื่องยนต์โหมดโร้คไลค์
 *
 * ฟังก์ชันบริสุทธิ์ทั้งหมด รับสถานะเข้า คืนสถานะใหม่ออก
 * ทดสอบการเล่นทั้งรอบได้โดยไม่ต้องเปิดเบราว์เซอร์
 *
 * เรื่องความยาก: ต้องยากขึ้นเรื่อย ๆ แต่ต้องไม่ถึงจุดที่เป็นไปไม่ได้
 * เพราะเป้าหมายคือให้เด็กรู้สึกว่า "เกือบแล้ว รอบหน้าต้องได้"
 * ไม่ใช่ "ยังไงก็ไม่รอด" ซึ่งทำให้เลิกเล่น
 */

import { createRng } from '../math/rng'
import type { Rng } from '../math/rng'
import type { Grade } from '../questionEngine/types'
import type { SkillId } from '../types/stats'
import type { Boon, BoonId, Floor, RoomKind, RunState } from './types'

export const STARTING_HEARTS = 3
export const MAX_HEARTS_CAP = 6

/** ทักษะที่หอคอยหยิบมาถาม เรียงจากง่ายไปยาก */
const SKILL_POOL: SkillId[] = [
  'addition',
  'subtraction',
  'multiplication',
  'division',
  'fractions',
  'decimals',
  'percentages',
  'geometry',
  'wordProblems',
]

export const BOONS: Boon[] = [
  {
    id: 'extraHeart',
    name: 'หัวใจเพิ่ม',
    description: 'เพิ่มหัวใจสูงสุด 1 ดวง และฟื้นให้ 1 ดวงทันที',
    stackable: true,
    weight: 3,
  },
  {
    id: 'shield',
    name: 'โล่กันพลาด',
    description: 'ตอบผิดครั้งถัดไปจะไม่เสียหัวใจ ใช้ได้ 1 ครั้ง',
    stackable: true,
    weight: 4,
  },
  {
    id: 'doubleCoin',
    name: 'ถุงเงินรั่ว',
    description: 'ได้เหรียญเพิ่มขึ้นเท่าตัวไปจนจบรอบ',
    stackable: false,
    weight: 2,
  },
  {
    id: 'timeSlow',
    name: 'นาฬิกาเดินช้า',
    description: 'มีเวลาคิดต่อข้อเพิ่มขึ้น 5 วินาที',
    stackable: true,
    weight: 3,
  },
  {
    id: 'skipOne',
    name: 'ตั๋วข้ามข้อ',
    description: 'ข้ามข้อที่ยากเกินไปได้ 1 ข้อโดยไม่เสียหัวใจ',
    stackable: true,
    weight: 3,
  },
  {
    id: 'healFull',
    name: 'น้ำพุแห่งพลัง',
    description: 'ฟื้นหัวใจจนเต็มทันที',
    stackable: true,
    weight: 2,
  },
  {
    id: 'comboBoost',
    name: 'ไฟลุกโชน',
    description: 'ทุกคอมโบให้เหรียญมากขึ้น',
    stackable: false,
    weight: 2,
  },
  {
    id: 'secondChance',
    name: 'โอกาสครั้งที่สอง',
    description: 'ตอนหัวใจหมด จะฟื้นกลับมา 1 ดวงแทนที่จะจบรอบ ใช้ได้ครั้งเดียว',
    stackable: false,
    weight: 1,
  },
]

const BOON_BY_ID = new Map(BOONS.map((boon) => [boon.id, boon]))

export function getBoon(id: string): Boon | undefined {
  return BOON_BY_ID.get(id as BoonId)
}

/** เริ่มรอบใหม่ */
export function startRun(seed: string): RunState {
  return {
    seed,
    floor: 1,
    hearts: STARTING_HEARTS,
    maxHearts: STARTING_HEARTS,
    shields: 0,
    boons: {},
    coinsEarned: 0,
    correct: 0,
    wrong: 0,
    bestCombo: 0,
    combo: 0,
    over: false,
    reachedFloor: 1,
  }
}

/**
 * ชนิดห้องของชั้นหนึ่ง
 *
 * ชั้นที่หารด้วย 5 ลงตัวเป็นห้องพัก ให้เด็กได้หายใจและฟื้นหัวใจ
 * ถ้าไล่ยากขึ้นรวดเดียวโดยไม่มีจังหวะพัก เด็กจะรู้สึกกดดันจนเลิกเล่น
 */
export function roomKindFor(floor: number, rng: Rng): RoomKind {
  if (floor % 5 === 0) return 'rest'
  if (floor % 7 === 0) return 'treasure'
  if (floor >= 4 && rng.chance(0.22)) return 'elite'
  return 'question'
}

/**
 * ระดับชั้นเรียนของชั้นนี้
 * ชั้นต้น ๆ ใช้เลขเล็ก แล้วค่อยขยับขึ้นตามความสูง
 */
function gradeFor(floor: number): Grade {
  if (floor <= 5) return 4
  if (floor <= 12) return 5
  return 6
}

/**
 * จำนวนวินาทีต่อข้อ
 *
 * มีพื้นล่างที่ 8 วินาทีเสมอ ไม่ว่าจะขึ้นสูงแค่ไหน
 * เด็ก ป.4 อ่านโจทย์อย่างเดียวก็ใช้เวลาหลายวินาทีแล้ว
 * ถ้าปล่อยให้ลดลงเรื่อย ๆ จะถึงจุดที่อ่านโจทย์ไม่ทันด้วยซ้ำ
 * ซึ่งวัดความเร็วในการอ่าน ไม่ได้วัดความสามารถทางคณิตศาสตร์
 */
export function secondsFor(floor: number, timeSlowStacks = 0): number {
  const base = Math.max(8, 20 - Math.floor((floor - 1) * 0.6))
  return base + timeSlowStacks * 5
}

/** สร้างข้อมูลชั้นหนึ่ง */
export function buildFloor(run: RunState, floor: number): Floor {
  const rng = createRng(`${run.seed}-floor-${floor}`)
  const kind = roomKindFor(floor, rng)
  const grade = gradeFor(floor)

  // ยิ่งสูงยิ่งมีทักษะให้สุ่มมากขึ้น ชั้นต้นจึงเจอแต่บวกลบซึ่งคุ้นที่สุด
  const poolSize = Math.min(SKILL_POOL.length, 2 + Math.floor(floor / 2))
  const skill = rng.pick(SKILL_POOL.slice(0, poolSize))

  const questionCount =
    kind === 'rest' ? 0 : kind === 'elite' ? 5 : kind === 'treasure' ? 2 : 3

  const title =
    kind === 'rest'
      ? `ชั้น ${floor} · ลานพักใจ`
      : kind === 'treasure'
        ? `ชั้น ${floor} · ห้องสมบัติ`
        : kind === 'elite'
          ? `ชั้น ${floor} · ผู้เฝ้าชั้น`
          : `ชั้น ${floor}`

  return {
    index: floor,
    kind,
    skill,
    grade,
    questionCount,
    secondsPerQuestion:
      kind === 'rest' ? 0 : secondsFor(floor, run.boons.timeSlow ?? 0),
    title,
  }
}

/** เหรียญที่ได้จากการตอบถูกหนึ่งข้อในชั้นนี้ */
export function coinsForAnswer(run: RunState, floor: Floor): number {
  const base = floor.kind === 'elite' ? 12 : floor.kind === 'treasure' ? 20 : 6
  const comboBonus = run.boons.comboBoost ? run.combo * 2 : run.combo
  const total = base + comboBonus
  return run.boons.doubleCoin ? total * 2 : total
}

/**
 * ตอบถูกหนึ่งข้อ
 * คอมโบเพิ่ม เหรียญเพิ่ม และบันทึกคอมโบสูงสุดไว้โชว์ตอนจบ
 */
export function answerCorrect(run: RunState, floor: Floor): RunState {
  const combo = run.combo + 1
  const gained = coinsForAnswer({ ...run, combo: run.combo }, floor)

  return {
    ...run,
    combo,
    bestCombo: Math.max(run.bestCombo, combo),
    correct: run.correct + 1,
    coinsEarned: run.coinsEarned + gained,
  }
}

/**
 * ตอบผิดหนึ่งข้อ
 *
 * ลำดับการกันความเสียหาย: โล่ก่อน แล้วค่อยหัวใจ แล้วค่อยโอกาสครั้งที่สอง
 * เรียงแบบนี้เพราะโล่เป็นของที่เด็กเพิ่งเลือกมา ควรได้ใช้ก่อนของอื่น
 */
export function answerWrong(run: RunState): RunState {
  const next: RunState = { ...run, combo: 0, wrong: run.wrong + 1 }

  if (next.shields > 0) {
    return { ...next, shields: next.shields - 1 }
  }

  const hearts = next.hearts - 1
  if (hearts > 0) return { ...next, hearts }

  // หัวใจหมดแล้ว ถ้ามีโอกาสครั้งที่สองให้ใช้ทันทีและตัดพรนั้นทิ้ง
  if (next.boons.secondChance) {
    const boons = { ...next.boons }
    delete boons.secondChance
    return { ...next, hearts: 1, boons }
  }

  return { ...next, hearts: 0, over: true, reachedFloor: next.floor }
}

/** ผ่านชั้นนี้แล้ว ขึ้นชั้นถัดไป */
export function advanceFloor(run: RunState): RunState {
  const floor = run.floor + 1
  return { ...run, floor, reachedFloor: Math.max(run.reachedFloor, floor) }
}

/** ห้องพักฟื้นหัวใจให้ครึ่งหนึ่งของที่หายไป อย่างน้อยหนึ่งดวง */
export function restHeal(run: RunState): RunState {
  if (run.hearts >= run.maxHearts) return run
  const missing = run.maxHearts - run.hearts
  const healed = Math.max(1, Math.floor(missing / 2))
  return { ...run, hearts: Math.min(run.maxHearts, run.hearts + healed) }
}

/**
 * สุ่มพรสามอย่างให้เลือก
 *
 * ตัดพรที่ถืออยู่แล้วและซ้อนไม่ได้ออกก่อน
 * ไม่งั้นเด็กจะเจอตัวเลือกที่เลือกไปก็ไม่ได้อะไร ซึ่งเหมือนโดนโกงตาเลือก
 *
 * ถ้าเหลือให้เลือกน้อยกว่าสาม จะคืนเท่าที่มี ไม่เติมของซ้ำเข้าไป
 */
export function offerBoons(run: RunState, count = 3): Boon[] {
  const rng = createRng(`${run.seed}-boon-${run.floor}`)

  const available = BOONS.filter((boon) => {
    if (boon.stackable) return true
    return !run.boons[boon.id]
  }).filter((boon) => {
    // หัวใจเต็มเพดานแล้ว การเพิ่มหัวใจสูงสุดก็ไม่มีประโยชน์
    if (boon.id === 'extraHeart') return run.maxHearts < MAX_HEARTS_CAP
    return true
  })

  // สุ่มแบบถ่วงน้ำหนัก ของหายากจึงโผล่น้อยกว่าของธรรมดา
  const pool: Boon[] = []
  for (const boon of available) {
    for (let i = 0; i < boon.weight; i += 1) pool.push(boon)
  }

  const picked: Boon[] = []
  for (let attempt = 0; attempt < 60 && picked.length < count; attempt += 1) {
    if (pool.length === 0) break
    const boon = rng.pick(pool)
    if (picked.some((entry) => entry.id === boon.id)) continue
    picked.push(boon)
  }

  return picked
}

/** รับพรหนึ่งอย่าง */
export function takeBoon(run: RunState, boonId: string): RunState {
  const boon = getBoon(boonId)
  if (!boon) return run
  if (!boon.stackable && run.boons[boonId]) return run

  const boons = { ...run.boons, [boonId]: (run.boons[boonId] ?? 0) + 1 }
  let next: RunState = { ...run, boons }

  // พรบางอย่างมีผลทันทีตอนรับ ไม่ใช่แค่ถือไว้เฉย ๆ
  if (boonId === 'extraHeart') {
    const maxHearts = Math.min(MAX_HEARTS_CAP, next.maxHearts + 1)
    next = { ...next, maxHearts, hearts: Math.min(maxHearts, next.hearts + 1) }
  }
  if (boonId === 'shield') {
    next = { ...next, shields: next.shields + 1 }
  }
  if (boonId === 'healFull') {
    next = { ...next, hearts: next.maxHearts }
  }

  return next
}

/** ใช้ตั๋วข้ามข้อ คืน null ถ้าไม่มีตั๋วเหลือ */
export function useSkip(run: RunState): RunState | null {
  const left = run.boons.skipOne ?? 0
  if (left <= 0) return null

  const boons: Record<string, number> = { ...run.boons, skipOne: left - 1 }
  if (boons.skipOne <= 0) delete boons.skipOne
  return { ...run, boons, combo: 0 }
}

/**
 * เหรียญที่เอากลับบ้านได้จริงเมื่อจบรอบ
 *
 * ตายแล้วยังได้ครึ่งหนึ่ง ไม่ใช่ศูนย์
 * เด็กที่เล่นแล้วได้ศูนย์ทุกครั้งจะเลิกเล่นเร็วมาก
 * และการได้อะไรกลับไปบ้างทำให้รอบที่แพ้ยังรู้สึกว่าคุ้มที่ลอง
 */
export function payout(run: RunState): number {
  return run.over ? Math.floor(run.coinsEarned / 2) : run.coinsEarned
}
