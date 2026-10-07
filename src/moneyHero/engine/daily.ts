import type { Question } from './types'
import type { Player } from './progress'
import { LEVEL_PLANS, generate } from '../generators'
import { seedRandom, useMathRandom, rand } from '../utils/random'

/**
 * ภารกิจประจำวัน: วันละ 5 ข้อ จากเรื่องที่เรียนผ่านมาแล้ว
 * ทำติดกันหลายวันได้ "สตรีค" และตราประทับรายวัน
 *
 * โจทย์ของแต่ละวันสุ่มด้วย seed จากวันที่ + รหัสผู้เล่น
 * เด็กคนเดียวกันเปิดซ้ำในวันเดียวกันจะเจอชุดเดิม (ไม่สุ่มหาข้อง่าย)
 */

export const DAILY_COUNT = 5

export interface DailyRecord {
  /** วันที่ทำล่าสุด YYYY-MM-DD (เวลาเครื่อง) */
  last?: string
  streak: number
  best: number
  /** วันที่เคยทำ (เก็บ 60 วันล่าสุด) */
  days: string[]
}

export function emptyDaily(): DailyRecord {
  return { streak: 0, best: 0, days: [] }
}

export function dayKey(d: Date = new Date()): string {
  const two = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${two(d.getMonth() + 1)}-${two(d.getDate())}`
}

/** เลื่อนวันที่ไป n วัน (ใช้เที่ยงวันกันปัญหาเวลาออมแสง) */
export function shiftDay(key: string, n: number): string {
  const [y, m, d] = key.split('-').map(Number)
  return dayKey(new Date(y, m - 1, d + n, 12))
}

export function doneToday(daily: DailyRecord | undefined, today = dayKey()): boolean {
  return daily?.last === today
}

/** สตรีคที่ยังนับอยู่ (ถ้าเมื่อวานไม่ได้ทำ สตรีคขาดแล้ว แสดงเป็น 0) */
export function liveStreak(daily: DailyRecord | undefined, today = dayKey()): number {
  if (!daily?.last) return 0
  return daily.last === today || daily.last === shiftDay(today, -1) ? daily.streak : 0
}

/** รางวัล: 10 เหรียญ + โบนัสสตรีค (สูงสุด +10) */
export function dailyReward(streak: number): { coins: number; exp: number } {
  return { coins: 10 + Math.min(5, streak) * 2, exp: 30 }
}

export function recordDaily(daily: DailyRecord | undefined, today = dayKey()): DailyRecord {
  const d = daily ?? emptyDaily()
  if (d.last === today) return d
  const streak = d.last === shiftDay(today, -1) ? d.streak + 1 : 1
  return { last: today, streak, best: Math.max(d.best, streak), days: [...d.days, today].slice(-60) }
}

function hash(text: string): number {
  let h = 2166136261
  for (let i = 0; i < text.length; i += 1) h = Math.imul(h ^ text.charCodeAt(i), 16777619)
  return h >>> 0
}

/** ด่านที่ใช้ออกโจทย์: ด่านที่ผ่านแล้ว (ยังไม่ผ่านอะไรเลยใช้ด่าน 0–1) */
export function dailyLevels(p: Player): number[] {
  const passed = Object.entries(p.levels)
    .filter(([, r]) => r.stepDone >= 4)
    .map(([k]) => Number(k))
  return passed.length > 0 ? passed : [0, 1]
}

export function buildDaily(p: Player, today = dayKey()): Question[] {
  const specs = dailyLevels(p).flatMap((id) => [...(LEVEL_PLANS[id]?.practice ?? []), ...(LEVEL_PLANS[id]?.mission ?? [])])
  seedRandom(hash(`${today}|${p.id}`))
  try {
    const out: Question[] = []
    for (let i = 0; i < DAILY_COUNT; i += 1) {
      const [gen, d] = specs[Math.floor(rand() * specs.length)]
      out.push(generate(gen, d)[0])
    }
    return out
  } finally {
    useMathRandom()
  }
}
