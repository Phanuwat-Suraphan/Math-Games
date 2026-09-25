/**
 * ความคืบหน้าของภารกิจแปดดาว เก็บในเครื่อง แยกตามชื่อผู้เล่น
 *
 * เก็บสามอย่างตามสามโหมด
 *   โหมดสำรวจ  ดาวที่เคยบินไปเที่ยวแล้ว (ของที่ระลึก)
 *   โหมดเรียนรู้ บทเรียนที่อ่านจบแล้ว
 *   โหมดฝึกฝน  ดาวที่ดีที่สุดของแต่ละด่าน กับจำนวนครั้งที่เล่น
 * แยกคีย์จากข้อมูลผู้เล่นหลักเหมือนโหมดอื่น ข้อมูลเสียจึงเสียแค่ส่วนนี้
 */

import { PLANET_IDS, isPlanetId } from '../solar/planets'
import type { PlanetId } from '../solar/planets'
import { LESSONS } from './lessons'

const KEY = 'math-adventure:planet-quest:v1'

export interface QuestProgress {
  owner: string
  best: Partial<Record<PlanetId, number>>
  plays: number
  visited: PlanetId[]
  lessons: string[]
}

export function emptyProgress(owner: string): QuestProgress {
  return { owner, best: {}, plays: 0, visited: [], lessons: [] }
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
  return progress
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
