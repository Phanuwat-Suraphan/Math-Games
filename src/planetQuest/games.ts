/**
 * ตรรกะของเกมทั้งแปดดาว
 *
 * ทุกฟังก์ชันเป็นฟังก์ชันบริสุทธิ์ รับ seed แล้วคืนรอบเกมชุดเดิมเสมอ
 * หน้าจอเก็บสถานะไว้เองแล้วส่งเข้ามาให้ตัดสิน ชุดทดสอบจึงเล่นทุกเกมได้โดยไม่มีหน้าจอ
 *
 * ดาวพุธกับดาวอังคารใช้กระดานจับคู่และกระดานโยงเส้นตัวเดิมของมินิเกมคณิตศาสตร์
 * ไฟล์นี้แค่สร้างข้อมูลในรูปที่กระดานสองตัวนั้นรู้จัก ไม่ได้เขียนกระดานใหม่
 */

import { createRng } from '../math/rng'
import type { ConnectGame, MatchingGame } from '../minigames/types'
import { PLANETS } from '../solar/planets'
import {
  ASTEROID_QUESTIONS,
  PLANET_TRAITS,
  RIDDLES,
  SORT_ROUNDS,
  STATEMENTS,
  TECH_PAIRS,
  TIMELINE_EVENTS,
} from './content'
import type { ChoiceQuestion, SortBin, SortItem, Statement, TimelineEvent } from './content'

export type Stars = 1 | 2 | 3

/**
 * ดาวจากจำนวนครั้งที่พลาด ไม่มี 0 ดาว
 * เล่นจบก็ได้อย่างน้อยหนึ่งดาวเสมอ เพราะการเล่นจนจบคือการได้เรียนครบทุกข้อแล้ว
 */
export function starsFromMistakes(mistakes: number, threeUpTo: number, twoUpTo: number): Stars {
  if (mistakes <= threeUpTo) return 3
  if (mistakes <= twoUpTo) return 2
  return 1
}

/** ดาวจากสัดส่วนคะแนน */
export function starsFromScore(score: number, max: number): Stars {
  const ratio = max > 0 ? score / max : 0
  if (ratio >= 0.85) return 3
  if (ratio >= 0.55) return 2
  return 1
}

/* ---------- ดาวพุธ · ไพ่จับคู่ (ใช้ MatchingBoard) ---------- */

export const MEMORY_PAIRS = 6

export function buildMemoryGame(seed: string): MatchingGame {
  const rng = createRng(`pq-memory-${seed}`)
  const planets = rng.shuffle(PLANETS).slice(0, MEMORY_PAIRS)
  const cards = rng.shuffle(
    planets.flatMap((planet) => [
      { id: `${planet.id}-name`, pairId: planet.id, text: planet.name, side: 'prompt' as const },
      { id: `${planet.id}-trait`, pairId: planet.id, text: PLANET_TRAITS[planet.id], side: 'answer' as const },
    ]),
  )
  return {
    id: `pq-memory-${seed}`,
    kind: 'matching',
    grade: 6,
    skill: 'wordProblems',
    title: 'ไพ่ความจำความเร็วแสง',
    instruction: 'เปิดไพ่ทีละสองใบ จับคู่ชื่อดาวกับลักษณะเด่นของดาวดวงนั้น',
    story: 'ดาวพุธโคจรเร็วที่สุด ต้องจำให้ไวพอ ๆ กัน',
    successText: 'จับคู่ครบทุกดาวแล้ว',
    cards,
    pairCount: planets.length,
  }
}

/** ดาวของไพ่จับคู่ เปิดผิดคู่ไม่เกินสองครั้งได้สามดาว */
export function memoryStars(mismatches: number): Stars {
  return starsFromMistakes(mismatches, 2, 6)
}

/* ---------- ดาวศุกร์ · จริงหรือไม่ ---------- */

export const TRUE_FALSE_COUNT = 8

/** สุ่มข้อความครึ่งจริงครึ่งไม่จริง เด็กจะได้ไม่จับทางว่าตอบ "จริง" ไว้ก่อนแล้วถูกเยอะ */
export function buildTrueFalseRound(seed: string): Statement[] {
  const rng = createRng(`pq-truefalse-${seed}`)
  const half = TRUE_FALSE_COUNT / 2
  const truths = rng.shuffle(STATEMENTS.filter((item) => item.truth)).slice(0, half)
  const myths = rng.shuffle(STATEMENTS.filter((item) => !item.truth)).slice(0, half)
  return rng.shuffle([...truths, ...myths])
}

/* ---------- ดาวอังคาร · โยงเส้นเทคโนโลยี (ใช้ ConnectBoard) ---------- */

export const CONNECT_PAIRS = 5

export function buildConnectGame(seed: string): ConnectGame {
  const rng = createRng(`pq-connect-${seed}`)
  const pairs = rng.shuffle(TECH_PAIRS).slice(0, CONNECT_PAIRS)
  const solution: Record<string, string> = {}
  for (const pair of pairs) solution[`tech-${pair.id}`] = `use-${pair.id}`
  return {
    id: `pq-connect-${seed}`,
    kind: 'connect',
    grade: 6,
    skill: 'wordProblems',
    title: 'ศูนย์เทคโนโลยีอวกาศ',
    instruction: 'แตะเทคโนโลยีทางซ้าย แล้วแตะประโยชน์ทางขวาที่คู่กัน',
    story: 'ศูนย์ควบคุมบนดาวอังคารต้องรู้ว่าเครื่องมือแต่ละชิ้นเอาไว้ทำอะไร',
    successText: 'โยงครบทุกเส้นแล้ว',
    left: pairs.map((pair) => ({ id: `tech-${pair.id}`, text: pair.tech })),
    right: rng.shuffle(pairs).map((pair) => ({ id: `use-${pair.id}`, text: pair.use })),
    solution,
  }
}

export function connectStars(wrongLinks: number): Stars {
  return starsFromMistakes(wrongLinks, 0, 2)
}

/* ---------- ดาวพฤหัสบดี · คัดแยก ---------- */

export interface SortRound {
  id: string
  title: string
  bins: readonly SortBin[]
  items: SortItem[]
}

/**
 * หยิบของมาเล่นให้ทุกกล่องมีของอย่างน้อยหนึ่งชิ้น
 * กล่องที่ว่างตลอดรอบทำให้เด็กสงสัยว่าตัวเองเข้าใจผิดตรงไหน ทั้งที่แค่สุ่มไม่โดน
 */
export function buildSortRounds(seed: string): SortRound[] {
  return SORT_ROUNDS.map((spec) => {
    const rng = createRng(`pq-sort-${seed}-${spec.id}`)
    const first = spec.bins.map((bin) => rng.pick(spec.items.filter((item) => item.bin === bin.id)))
    const rest = rng.shuffle(spec.items.filter((item) => !first.includes(item)))
    const items = rng.shuffle([...first, ...rest.slice(0, Math.max(0, spec.take - first.length))])
    return { id: spec.id, title: spec.title, bins: spec.bins, items }
  })
}

export function sortStars(mistakes: number): Stars {
  return starsFromMistakes(mistakes, 1, 3)
}

/* ---------- ดาวเสาร์ · ยิงอุกกาบาต ---------- */

export const ASTEROID_COUNT = 6

export interface ChoiceRoundItem {
  question: ChoiceQuestion
  options: string[]
}

export function buildChoiceRound(
  seed: string,
  bank: readonly ChoiceQuestion[],
  count: number,
): ChoiceRoundItem[] {
  const rng = createRng(`pq-choice-${seed}`)
  return rng
    .shuffle(bank)
    .slice(0, count)
    .map((question) => ({ question, options: rng.shuffle([question.answer, ...question.wrong]) }))
}

export function buildAsteroidRound(seed: string): ChoiceRoundItem[] {
  return buildChoiceRound(`asteroid-${seed}`, ASTEROID_QUESTIONS, ASTEROID_COUNT)
}

export function asteroidStars(mistakes: number): Stars {
  return starsFromMistakes(mistakes, 1, 3)
}

/* ---------- ดาวยูเรนัส · อะไรมาก่อน ---------- */

export const DUEL_COUNT = 6

export interface TimelineDuel {
  left: TimelineEvent
  right: TimelineEvent
}

/**
 * ประลองสองเหตุการณ์ แตะอันที่เกิดขึ้นก่อน
 *
 * เดิมเป็นการเรียงห้าเหตุการณ์ลงห้าช่องพร้อมกัน ซึ่งเหมือนข้อสอบมากกว่าเกม
 * เด็กต้องจำปีของทุกเรื่องก่อนถึงจะเริ่มได้ แบบประลองทีละคู่ตัดสินใจได้ทันที
 * และได้ลุ้นผลทุกสองสามวินาที เหตุการณ์หนึ่งเรื่องไม่ออกซ้ำในรอบเดียว
 * เด็กจึงได้เห็นเหตุการณ์ต่างกันครบสิบสองเรื่อง (ถ้ามีพอ)
 */
export function buildTimelineDuels(seed: string): TimelineDuel[] {
  const rng = createRng(`pq-duel-${seed}`)
  const pool = rng.shuffle(TIMELINE_EVENTS)
  const duels: TimelineDuel[] = []
  for (let index = 0; duels.length < DUEL_COUNT; index += 2) {
    // ใช้ซ้ำได้เมื่อเหตุการณ์ไม่พอ แต่คู่ต้องไม่ใช่เรื่องเดียวกัน
    const left = pool[index % pool.length] as TimelineEvent
    let right = pool[(index + 1) % pool.length] as TimelineEvent
    if (right.id === left.id) right = pool[(index + 2) % pool.length] as TimelineEvent
    duels.push(rng.chance(0.5) ? { left, right } : { left: right, right: left })
  }
  return duels
}

/** เหตุการณ์ที่เกิดก่อนของคู่นี้ */
export function earlierOf(duel: TimelineDuel): TimelineEvent {
  return duel.left.year < duel.right.year ? duel.left : duel.right
}

export function duelStars(correct: number): Stars {
  if (correct >= DUEL_COUNT) return 3
  if (correct >= DUEL_COUNT - 2) return 2
  return 1
}

/* ---------- ดาวเนปจูน · ฉันคือใคร ---------- */

export const RIDDLE_COUNT = 5

export interface RiddleRoundItem {
  id: string
  answer: string
  clues: readonly string[]
  options: string[]
}

export function buildRiddleRound(seed: string): RiddleRoundItem[] {
  const rng = createRng(`pq-riddle-${seed}`)
  return rng
    .shuffle(RIDDLES)
    .slice(0, RIDDLE_COUNT)
    .map((riddle) => ({
      id: riddle.id,
      answer: riddle.answer,
      clues: riddle.clues,
      options: rng.shuffle([riddle.answer, ...riddle.decoys]),
    }))
}

/**
 * คะแนนของปริศนาหนึ่งข้อ
 * ตอบได้ตั้งแต่ใบ้แรก 4 คะแนน เปิดใบ้เพิ่มหรือตอบผิดเสียทีละ 1 คะแนน แต่ได้อย่างน้อย 1 คะแนนเสมอ
 */
export function riddlePoints(cluesShown: number, wrongTries: number): number {
  return Math.max(1, 5 - Math.max(1, cluesShown) - wrongTries)
}

export const RIDDLE_MAX_POINTS = RIDDLE_COUNT * 4

export function riddleStars(points: number): Stars {
  return starsFromScore(points, RIDDLE_MAX_POINTS)
}

/* ---------- คะแนนสนุก ๆ ที่ใช้ร่วมกันทุกเกม ---------- */

/**
 * คะแนนของการตอบถูกหนึ่งครั้ง ถูกติดกันยิ่งหลายครั้งยิ่งได้มาก
 *
 * คะแนนนี้มีไว้ให้ลุ้นระหว่างเล่นเท่านั้น ไม่ได้ใช้ตัดสินดาว
 * ดาวยังคิดจากจำนวนครั้งที่พลาดเหมือนเดิม เด็กที่ช้าแต่ถูกจึงไม่เสียเปรียบ
 */
export function comboPoints(streak: number): number {
  return 100 + Math.max(0, streak - 1) * 50
}

/** ดาวศุกร์ให้เวลาตัดสินข้อละกี่วินาที */
export const TRUE_FALSE_SECONDS = 12

/* ---------- ดาวศุกร์และห้องทดลองอุปราคา ---------- */

export function trueFalseStars(correct: number): Stars {
  return starsFromScore(correct, TRUE_FALSE_COUNT)
}

export function labStars(mistakes: number): Stars {
  return starsFromMistakes(mistakes, 1, 3)
}
