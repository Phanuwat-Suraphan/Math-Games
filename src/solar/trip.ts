/**
 * หนึ่งทริปของยานสำรวจ
 *
 * ทริปเริ่มจากโลกเสมอ บินไปดาวทีละดวงตามใบ้ของศูนย์บัญชาการ
 * แล้วจบด้วยการกลับบ้านที่โลก ทริปสั้นไปสามดวง ทริปเต็มไปครบเจ็ดดวง
 *
 * ทุกฟังก์ชันในไฟล์นี้คืนทริปอันใหม่ ไม่แก้ของเดิม
 * หน้าจอจึงเก็บทริปไว้ใน state ของ React ได้ตรง ๆ
 * และชุดทดสอบเล่นทริปจนจบได้โดยไม่ต้องมีหน้าจอ
 *
 * กติกาที่ตั้งใจให้ใจดี
 *
 * เลือกดาวผิดหรือตอบผิดไม่มีวันจบเกม แค่ได้ดาวน้อยลง
 * เพราะผู้เล่นคือเด็ก ป.4–ป.6 ที่กำลังหัดอ่านข้อมูล ไม่ใช่นักบินที่ต้องสอบผ่าน
 * ผิดครั้งแรกได้คำใบ้ ผิดครั้งที่สองวงโคจรของดาวเป้าหมายจะเรืองขึ้นมาเลย
 * ทุกทริปจึงเล่นจนจบได้เสมอ
 */

import { createRng } from '../math/rng'
import { PLANET_IDS, getPlanet } from './planets'
import type { PlanetId } from './planets'
import { buildClue, buildQuestion, clueMatches } from './questions'
import type { NavClue, PlanetQuestion, Tier } from './questions'

export type TripLength = 'short' | 'full'

/** จำนวนดาวที่แวะก่อนกลับโลก */
export const STOPS_BEFORE_HOME: Record<TripLength, number> = {
  short: 3,
  full: 7,
}

export const HOME: PlanetId = 'earth'

export interface TripLeg {
  target: PlanetId
  clue: NavClue
  question: PlanetQuestion
  wrongPicks: PlanetId[]
  wrongChoices: number[]
  navSolved: boolean
  questionSolved: boolean
}

export interface Trip {
  seed: string
  tier: Tier
  length: TripLength
  legs: TripLeg[]
  /** ช่วงที่กำลังเล่น เท่ากับ legs.length เมื่อจบทริปแล้ว */
  index: number
}

export function createTrip(seed: string, tier: Tier, length: TripLength): Trip {
  const rng = createRng(`solar-trip-${seed}-${tier}-${length}`)
  const away = rng
    .shuffle(PLANET_IDS.filter((id) => id !== HOME))
    .slice(0, STOPS_BEFORE_HOME[length])
  const targets = [...away, HOME]

  return {
    seed,
    tier,
    length,
    index: 0,
    legs: targets.map((target, stop) => ({
      target,
      clue: buildClue(target, tier, `${seed}-${stop}`),
      question: buildQuestion(target, tier, `${seed}-${stop}`),
      wrongPicks: [],
      wrongChoices: [],
      navSolved: false,
      questionSolved: false,
    })),
  }
}

export function currentLeg(trip: Trip): TripLeg | null {
  return trip.legs[trip.index] ?? null
}

export function isFinished(trip: Trip): boolean {
  return trip.index >= trip.legs.length
}

/** ยานอยู่ที่ดาวดวงไหนก่อนออกเดินทางช่วงนี้ */
export function departurePlanet(trip: Trip): PlanetId {
  if (trip.index === 0) return HOME
  return trip.legs[trip.index - 1]?.target ?? HOME
}

function replaceLeg(trip: Trip, leg: TripLeg): Trip {
  return {
    ...trip,
    legs: trip.legs.map((existing, index) => (index === trip.index ? leg : existing)),
  }
}

export interface PickResult {
  trip: Trip
  correct: boolean
  /** เลือกดาวดวงที่ยานจอดอยู่ ไม่นับเป็นการเลือกผิด */
  alreadyHere: boolean
}

/**
 * ยืนยันปลายทาง
 *
 * ตัดสินด้วย clueMatches ไม่ได้เทียบกับ target ตรง ๆ
 * สองอย่างนี้ควรให้ผลเดียวกันเสมอ แต่ถ้าวันหนึ่งข้อมูลดาวถูกแก้แล้วใบ้ชี้ได้สองดวง
 * เด็กที่เลือกดวงที่ตรงใบ้ก็ยังควรถูก ไม่ใช่ถูกบอกว่าผิดเพราะไม่ตรงกับที่เกมคิดไว้
 *
 * การเลือกดาวดวงที่ยานจอดอยู่แล้วไม่นับเป็นการเลือกผิด เพราะไม่มีใบ้ข้อไหนชี้ดาวดวงนั้น
 * แต่เด็กมักแตะโดนเพราะเป็นดวงที่ใหญ่ที่สุดบนจอตอนยานเพิ่งมาถึง
 */
export function pickDestination(trip: Trip, planetId: PlanetId): PickResult {
  const leg = currentLeg(trip)
  if (!leg || leg.navSolved) return { trip, correct: false, alreadyHere: false }

  if (clueMatches(leg.clue, getPlanet(planetId))) {
    return {
      trip: replaceLeg(trip, { ...leg, navSolved: true }),
      correct: true,
      alreadyHere: false,
    }
  }
  if (planetId === departurePlanet(trip)) return { trip, correct: false, alreadyHere: true }
  if (leg.wrongPicks.includes(planetId)) return { trip, correct: false, alreadyHere: false }
  return {
    trip: replaceLeg(trip, { ...leg, wrongPicks: [...leg.wrongPicks, planetId] }),
    correct: false,
    alreadyHere: false,
  }
}

export interface AnswerResult {
  trip: Trip
  correct: boolean
}

export function answerLeg(trip: Trip, choice: number): AnswerResult {
  const leg = currentLeg(trip)
  if (!leg || !leg.navSolved || leg.questionSolved) return { trip, correct: false }

  if (choice === leg.question.answer) {
    return { trip: replaceLeg(trip, { ...leg, questionSolved: true }), correct: true }
  }
  // กดตัวเลือกผิดตัวเดิมซ้ำไม่ถูกนับซ้ำ ปุ่มนั้นถูกปิดไปแล้วบนจอ แต่กันไว้อีกชั้น
  if (leg.wrongChoices.includes(choice)) return { trip, correct: false }
  return {
    trip: replaceLeg(trip, { ...leg, wrongChoices: [...leg.wrongChoices, choice] }),
    correct: false,
  }
}

/** ไปช่วงถัดไป ทำได้เมื่อช่วงนี้จบครบทั้งสองอย่างแล้วเท่านั้น */
export function advance(trip: Trip): Trip {
  const leg = currentLeg(trip)
  if (!leg || !leg.navSolved || !leg.questionSolved) return trip
  return { ...trip, index: trip.index + 1 }
}

/** จำนวนครั้งที่พลาดในช่วงนี้ รวมทั้งเลือกดาวผิดและตอบผิด */
export function legMisses(leg: TripLeg): number {
  return leg.wrongPicks.length + leg.wrongChoices.length
}

/** ดาวของตราประทับ ไม่พลาดเลย 3 ดวง พลาดครั้งเดียว 2 ดวง นอกนั้น 1 ดวง ไม่มี 0 */
export function legStars(leg: TripLeg): number {
  const misses = legMisses(leg)
  if (misses === 0) return 3
  if (misses === 1) return 2
  return 1
}

/**
 * คำใบ้ของการหาปลายทาง
 * 0 = ยังไม่ต้องใบ้, 1 = ขึ้นข้อความใบ้, 2 = วงโคจรเป้าหมายเรืองแสงให้เห็นเลย
 */
export function navHintLevel(leg: TripLeg): 0 | 1 | 2 {
  if (leg.wrongPicks.length >= 2) return 2
  return leg.wrongPicks.length === 1 ? 1 : 0
}

/** หลังตอบผิดสองครั้ง ขึ้นขั้นแรกของวิธีคิดเป็นคำใบ้ */
export function questionHintVisible(leg: TripLeg): boolean {
  return leg.wrongChoices.length >= 2
}

export interface TripSummary {
  stars: number
  maxStars: number
  perfectLegs: number
  legs: { target: PlanetId; stars: number }[]
}

export function summarize(trip: Trip): TripSummary {
  const done = trip.legs.filter((leg) => leg.questionSolved)
  const legs = done.map((leg) => ({ target: leg.target, stars: legStars(leg) }))
  return {
    stars: legs.reduce((total, leg) => total + leg.stars, 0),
    maxStars: trip.legs.length * 3,
    perfectLegs: legs.filter((leg) => leg.stars === 3).length,
    legs,
  }
}
