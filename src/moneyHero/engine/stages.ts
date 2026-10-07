import type { Difficulty } from './types'
import { earn } from './ledger'
import { isLevelPassed, type Player } from './progress'
import { BOSS_PASS, starsFor } from './scoring'

/**
 * ด่านย่อยของแต่ละด่าน
 *   X-1 = ด่านหลักเดิม (LEARN → PRACTICE → MISSION → BOSS)
 *   X-2 = ฝึกเก่ง: โจทย์ระดับกลาง ฉากลานฝึกยิงลูกโป่ง (เปิดเมื่อผ่าน X-1)
 *   X-3 = ท้าทาย: โจทย์ระดับยาก สู้บอสร่างโหด (เปิดเมื่อผ่าน X-2)
 * ด่านย่อยไม่บังคับ ด่านถัดไปบนแผนที่เปิดเมื่อผ่าน X-1 เหมือนเดิม
 */

export type StageNo = 2 | 3

export interface StageDef {
  n: StageNo
  name: string
  icon: string
  difficulty: Difficulty
  /** จำนวนข้อขั้นต่ำ (ชุดสมุดบัญชีอาจเกินเล็กน้อยเพราะไม่ตัดกลางชุด) */
  target: number
  scene: 'balloons' | 'boss'
}

export const STAGES: Record<StageNo, StageDef> = {
  2: { n: 2, name: 'ฝึกเก่ง', icon: '🎈', difficulty: 2, target: 6, scene: 'balloons' },
  3: { n: 3, name: 'ท้าทาย', icon: '🔥', difficulty: 3, target: 8, scene: 'boss' },
}

export function isStageNo(n: number): n is StageNo {
  return n === 2 || n === 3
}

export interface StageRecord {
  /** ดาวที่ดีที่สุด (0 = ยังไม่ผ่าน) */
  stars: number
  plays: number
  bestAccuracy: number
}

export function stageKey(level: number, n: StageNo): string {
  return `${level}-${n}`
}

export function stageRecord(p: Player, level: number, n: StageNo): StageRecord {
  return p.stages?.[stageKey(level, n)] ?? { stars: 0, plays: 0, bestAccuracy: 0 }
}

export function isStageUnlocked(p: Player, level: number, n: StageNo): boolean {
  if (n === 2) return isLevelPassed(p, level)
  return stageRecord(p, level, 2).stars > 0
}

export interface StageResult {
  passed: boolean
  stars: number
  accuracy: number
  firstTry: number
  total: number
}

/** ผ่านเมื่อถูก (ภายใน 2 ครั้ง) อย่างน้อย 60% · ดาวคิดจากข้อที่ถูกตั้งแต่ครั้งแรกเหมือนด่านหลัก */
export function stageResult(s: { originals: number; firstTry: number; within2: number }): StageResult {
  const total = s.originals
  const accuracy = total === 0 ? 1 : s.firstTry / total
  const passed = total === 0 || s.within2 / total >= BOSS_PASS
  return { passed, stars: passed ? starsFor(accuracy) : 0, accuracy, firstTry: s.firstTry, total }
}

/** รางวัลผ่านด่านย่อย (เล่นซ้ำได้ครึ่งหนึ่ง) ด่านท้าทายได้มากกว่า */
export function stageReward(n: StageNo, stars: number, firstClear: boolean): { exp: number; coins: number } {
  const exp = (n === 3 ? 40 : 25) + stars * 10
  const coins = (n === 3 ? 10 : 6) + stars * 3
  return firstClear ? { exp, coins } : { exp: Math.round(exp / 2), coins: Math.round(coins / 2) }
}

/** บันทึกผลด่านย่อย: เก็บดาวที่ดีที่สุด และให้รางวัลเมื่อผ่าน */
export function recordStage(p: Player, level: number, n: StageNo, r: StageResult): Player {
  const key = stageKey(level, n)
  const prev = stageRecord(p, level, n)
  const rec: StageRecord = {
    stars: Math.max(prev.stars, r.stars),
    plays: prev.plays + 1,
    bestAccuracy: r.passed ? Math.max(prev.bestAccuracy, r.accuracy) : prev.bestAccuracy,
  }
  const next: Player = { ...p, stages: { ...(p.stages ?? {}), [key]: rec } }
  if (!r.passed) return next
  const reward = stageReward(n, r.stars, prev.stars === 0)
  return { ...earn(next, reward.coins, `รางวัลด่านย่อย ${key}`, n === 3 ? '🔥' : '🎈'), exp: next.exp + reward.exp }
}

/** ดาวรวมจากด่านย่อยทั้งหมด */
export function stageStars(p: Player): number {
  return Object.values(p.stages ?? {}).reduce((s, r) => s + r.stars, 0)
}

/** จำนวนด่านท้าทาย (X-3) ที่ผ่านแล้ว */
export function challengesCleared(p: Player): number {
  return Object.entries(p.stages ?? {}).filter(([k, r]) => k.endsWith('-3') && r.stars > 0).length
}
