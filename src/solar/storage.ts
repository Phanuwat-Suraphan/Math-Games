/**
 * สมุดตราประทับของยานสำรวจ เก็บในเครื่อง
 *
 * เก็บเฉพาะของที่สะสมไว้อวดได้ คือดาวที่ดีที่สุดของแต่ละดวงและจำนวนทริปที่จบ
 * ไม่เก็บทริปที่ค้างกลางทาง เพราะหนึ่งทริปสั้นพอจะจบในคาบเดียว
 * และทริปค้างของเครื่องที่ใช้ร่วมกันมักไม่ใช่ของเด็กคนที่เปิดเครื่องครั้งต่อไป
 *
 * แยกคีย์จากข้อมูลผู้เล่นหลักด้วยเหตุผลเดียวกับโหมดอื่น
 * สมุดที่เสียทำให้เสียแค่สมุด ไม่ลามไปถึงเหรียญและด่านที่สะสมมา
 * และผูกกับชื่อผู้เล่น เพื่อไม่ให้เครื่องที่ใช้ร่วมกันเห็นตราประทับของคนอื่น
 */

import { PLANET_IDS, isPlanetId } from './planets'
import type { PlanetId } from './planets'
import type { TripLength, TripSummary } from './trip'

const KEY = 'math-adventure:solar:v1'

export interface StampRecord {
  /** ดาวที่ดีที่สุดที่เคยได้จากดาวดวงนี้ 1–3 */
  best: number
  visits: number
}

export interface Passport {
  owner: string
  stamps: Partial<Record<PlanetId, StampRecord>>
  trips: number
  bestTrip: Partial<Record<TripLength, number>>
}

export function emptyPassport(owner: string): Passport {
  return { owner, stamps: {}, trips: 0, bestTrip: {} }
}

function wholeNumber(value: unknown, max: number): number | null {
  if (typeof value !== 'number' || !Number.isInteger(value)) return null
  if (value < 0 || value > max) return null
  return value
}

/**
 * อ่านสมุดจากข้อความที่เก็บไว้ ตรวจทุกช่อง
 *
 * ช่องที่เสียถูกทิ้งเป็นช่อง ๆ ไม่ได้ทิ้งทั้งสมุด
 * เด็กที่เก็บตราครบเจ็ดดวงไม่ควรเสียทั้งหมดเพราะมีช่องเดียวที่อ่านไม่ออก
 */
export function parsePassport(raw: unknown, owner: string): Passport {
  const passport = emptyPassport(owner)
  if (typeof raw !== 'object' || raw === null) return passport
  const record = raw as Record<string, unknown>
  if (record.owner !== owner) return passport

  const stamps = record.stamps
  if (typeof stamps === 'object' && stamps !== null) {
    for (const [id, value] of Object.entries(stamps as Record<string, unknown>)) {
      if (!isPlanetId(id) || typeof value !== 'object' || value === null) continue
      const stamp = value as Record<string, unknown>
      const best = wholeNumber(stamp.best, 3)
      const visits = wholeNumber(stamp.visits, 1_000_000)
      if (best === null || best < 1 || visits === null) continue
      passport.stamps[id] = { best, visits }
    }
  }

  passport.trips = wholeNumber(record.trips, 1_000_000) ?? 0

  const bestTrip = record.bestTrip
  if (typeof bestTrip === 'object' && bestTrip !== null) {
    const trips = bestTrip as Record<string, unknown>
    const short = wholeNumber(trips.short, 12)
    const full = wholeNumber(trips.full, 24)
    if (short !== null) passport.bestTrip.short = short
    if (full !== null) passport.bestTrip.full = full
  }
  return passport
}

/** ประทับตราหนึ่งดวง เก็บดาวที่ดีที่สุดไว้ ไม่เอาครั้งล่าสุดไปทับ */
export function stampPlanet(passport: Passport, planetId: PlanetId, stars: number): Passport {
  const previous = passport.stamps[planetId]
  return {
    ...passport,
    stamps: {
      ...passport.stamps,
      [planetId]: {
        best: Math.max(previous?.best ?? 0, Math.max(1, Math.min(3, stars))),
        visits: (previous?.visits ?? 0) + 1,
      },
    },
  }
}

export function finishTrip(passport: Passport, length: TripLength, summary: TripSummary): Passport {
  return {
    ...passport,
    trips: passport.trips + 1,
    bestTrip: {
      ...passport.bestTrip,
      [length]: Math.max(passport.bestTrip[length] ?? 0, summary.stars),
    },
  }
}

/** จำนวนดาวที่เคยได้ตราประทับแล้วอย่างน้อยหนึ่งครั้ง */
export function stampCount(passport: Passport): number {
  return PLANET_IDS.filter((id) => passport.stamps[id]).length
}

function getStorage(): Storage | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null
    return window.localStorage
  } catch {
    return null
  }
}

export function loadPassport(owner: string): Passport {
  const storage = getStorage()
  if (!storage) return emptyPassport(owner)
  try {
    const text = storage.getItem(KEY)
    if (!text) return emptyPassport(owner)
    return parsePassport(JSON.parse(text), owner)
  } catch {
    return emptyPassport(owner)
  }
}

export function savePassport(passport: Passport): boolean {
  const storage = getStorage()
  if (!storage) return false
  try {
    storage.setItem(KEY, JSON.stringify(passport))
    return true
  } catch {
    return false
  }
}
