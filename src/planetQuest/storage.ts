/**
 * ความคืบหน้าของภารกิจแปดดาว เก็บในเครื่อง แยกตามชื่อผู้เล่น
 *
 * เก็บสามอย่างตามสามโหมด
 *   โหมดสำรวจ  ดาวที่เคยบินไปเที่ยวแล้ว (ของที่ระลึก)
 *   โหมดเรียนรู้ บทเรียนที่อ่านจบแล้ว
 *   โหมดฝึกฝน  ดาวที่ดีที่สุดของแต่ละด่าน กับจำนวนครั้งที่เล่น
 * และยานที่แต่งเองในอู่ต่อยาน (สียานกับเพื่อนร่วมทางที่นั่งไปด้วย)
 * กับรายชื่อเพื่อนร่วมทางที่เคยทักทายกันแล้ว การ์ดเพื่อนใหม่จะได้ขึ้นแค่ครั้งเดียวต่อตัว
 * แยกคีย์จากข้อมูลผู้เล่นหลักเหมือนโหมดอื่น ข้อมูลเสียจึงเสียแค่ส่วนนี้
 */

import { PLANET_IDS, isPlanetId } from '../solar/planets'
import type { PlanetId } from '../solar/planets'
import { LESSONS } from './lessons'
import { DEFAULT_COMPANION, isCompanionId } from './companions'
import type { CompanionId } from './companions'
import { DEFAULT_COLOR, isShipColorId } from './ship'
import type { ShipColorId } from './ship'

const KEY = 'math-adventure:planet-quest:v1'

export interface QuestProgress {
  owner: string
  best: Partial<Record<PlanetId, number>>
  plays: number
  visited: PlanetId[]
  lessons: string[]
  ship: { color: ShipColorId; companion: CompanionId }
  /** เพื่อนร่วมทางที่ทักทายกันแล้ว */
  met: CompanionId[]
}

export function emptyProgress(owner: string): QuestProgress {
  return {
    owner,
    best: {},
    plays: 0,
    visited: [],
    lessons: [],
    ship: { color: DEFAULT_COLOR, companion: DEFAULT_COMPANION },
    met: [DEFAULT_COMPANION],
  }
}

/** อ่านความคืบหน้า ช่องที่เสียถูกทิ้งเป็นช่อง ๆ ไม่ทิ้งทั้งก้อน */
export function parseProgress(raw: unknown, owner: string): QuestProgress {
  const progress = emptyProgress(owner)
  if (typeof raw !== 'object' || raw === null) return progress
  const record = raw as Record<string, unknown>
  if (record.owner !== owner) return progress

  if (typeof record.best === 'object' && record.best !== null) {
    for (const [id, value] of Object.entries(record.best as Record<string, unknown>)) {
      if (!isPlanetId(id)) continue
      if (typeof value !== 'number' || !Number.isInteger(value) || value < 1 || value > 3) continue
      progress.best[id] = value
    }
  }
  const plays = record.plays
  progress.plays = typeof plays === 'number' && Number.isInteger(plays) && plays >= 0 ? plays : 0

  if (Array.isArray(record.visited)) {
    progress.visited = [...new Set(record.visited.filter(isPlanetId))]
  }
  if (Array.isArray(record.lessons)) {
    // รหัสบทเรียนที่ไม่รู้จักถูกทิ้ง กันบทที่ถูกลบออกไปแล้วค้างอยู่ในจำนวนบทที่อ่านจบ
    const known = new Set(LESSONS.map((lesson) => lesson.id))
    progress.lessons = [
      ...new Set(record.lessons.filter((id): id is string => typeof id === 'string' && known.has(id))),
    ]
  }
  if (typeof record.ship === 'object' && record.ship !== null) {
    // สีกับเพื่อนร่วมทางตรวจแยกกัน สีที่ถูกลบไปแล้วไม่ทำให้เพื่อนที่เลือกไว้หายไปด้วย
    const ship = record.ship as Record<string, unknown>
    progress.ship = {
      color: isShipColorId(ship.color) ? ship.color : DEFAULT_COLOR,
      companion: isCompanionId(ship.companion) ? ship.companion : DEFAULT_COMPANION,
    }
  }
  if (Array.isArray(record.met)) {
    progress.met = [...new Set([DEFAULT_COMPANION, ...record.met.filter(isCompanionId)])]
  }
  return progress
}

/** ทักทายเพื่อนร่วมทางตัวใหม่แล้ว การ์ดเพื่อนใหม่ของตัวนี้จะไม่ขึ้นอีก */
export function markMet(progress: QuestProgress, companion: CompanionId): QuestProgress {
  if (progress.met.includes(companion)) return progress
  return { ...progress, met: [...progress.met, companion] }
}

export function setShip(progress: QuestProgress, ship: Partial<QuestProgress['ship']>): QuestProgress {
  const next = { ...progress.ship, ...ship }
  if (next.color === progress.ship.color && next.companion === progress.ship.companion) return progress
  return { ...progress, ship: next }
}

export function markVisited(progress: QuestProgress, planet: PlanetId): QuestProgress {
  if (progress.visited.includes(planet)) return progress
  return { ...progress, visited: [...progress.visited, planet] }
}

export function markLesson(progress: QuestProgress, lessonId: string): QuestProgress {
  if (progress.lessons.includes(lessonId)) return progress
  return { ...progress, lessons: [...progress.lessons, lessonId] }
}

export function recordStage(progress: QuestProgress, planet: PlanetId, stars: number): QuestProgress {
  const clamped = Math.max(1, Math.min(3, Math.round(stars)))
  return {
    ...progress,
    plays: progress.plays + 1,
    best: { ...progress.best, [planet]: Math.max(progress.best[planet] ?? 0, clamped) },
  }
}

export function clearedCount(progress: QuestProgress): number {
  return PLANET_IDS.filter((id) => progress.best[id] !== undefined).length
}

export function totalStars(progress: QuestProgress): number {
  return PLANET_IDS.reduce((sum, id) => sum + (progress.best[id] ?? 0), 0)
}

function getStorage(): Storage | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null
    return window.localStorage
  } catch {
    return null
  }
}

export function loadProgress(owner: string): QuestProgress {
  const storage = getStorage()
  if (!storage) return emptyProgress(owner)
  try {
    const text = storage.getItem(KEY)
    return text ? parseProgress(JSON.parse(text), owner) : emptyProgress(owner)
  } catch {
    return emptyProgress(owner)
  }
}

export function saveProgress(progress: QuestProgress): boolean {
  const storage = getStorage()
  if (!storage) return false
  try {
    storage.setItem(KEY, JSON.stringify(progress))
    return true
  } catch {
    return false
  }
}
