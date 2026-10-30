import { parseSave, type LevelRecord, type Player, type SaveData, type SkillStat } from './progress'
import { classroomConfigured, studentKey } from './classroom'
import type { Skill } from './types'

/**
 * ไฟล์สำรองข้อมูล และการรวมข้อมูลจากหลายเครื่อง
 *
 * เว็บนี้ไม่มีเซิร์ฟเวอร์ ข้อมูลอยู่ในเครื่องที่เล่น ครูจึงรวมผลด้วยไฟล์:
 *   แท็บเล็ตแต่ละเครื่อง → ดาวน์โหลดไฟล์สำรอง → เครื่องครูนำเข้าแบบ "รวม"
 * การรวมนำเข้าไฟล์เดิมซ้ำได้ ผลไม่เพิ่มซ้ำ (ใช้ค่าสูงสุดและรวมรายการที่ไม่ซ้ำ)
 */

export const BACKUP_APP = 'money-hero'

export interface BackupFile {
  app: typeof BACKUP_APP
  kind: 'backup'
  version: 1
  exportedAt: number
  save: SaveData
}

export function buildBackup(save: SaveData, now = Date.now()): string {
  const file: BackupFile = { app: BACKUP_APP, kind: 'backup', version: 1, exportedAt: now, save }
  return JSON.stringify(file)
}

export interface BackupRead {
  save: SaveData
  exportedAt: number | null
}

/** อ่านไฟล์สำรอง (รับทั้งไฟล์สำรองของเกม และข้อมูลดิบจากที่เก็บในเครื่อง) คืน null ถ้าไม่ใช่ไฟล์ของเกมนี้ */
export function readBackup(textIn: string): BackupRead | null {
  let data: unknown
  try {
    data = JSON.parse(textIn.replace(/^﻿/, ''))
  } catch {
    return null
  }
  if (!data || typeof data !== 'object') return null
  const d = data as Partial<BackupFile> & Partial<SaveData>
  const raw = d.app === BACKUP_APP && d.save ? d.save : d.players ? d : null
  if (!raw || typeof raw !== 'object' || !('players' in raw)) return null
  return { save: parseSave(JSON.stringify(raw)), exportedAt: typeof d.exportedAt === 'number' ? d.exportedAt : null }
}

/** ชื่อไฟล์ เช่น money-hero-สำรอง-ป.3_1-2026-10-30-0915.json */
export function backupFileName(save: SaveData, now = new Date()): string {
  const two = (n: number) => String(n).padStart(2, '0')
  const room = save.classroom.room.replace(/[^0-9A-Za-z฀-๿.]+/g, '_')
  return `money-hero-สำรอง-${room}-${now.getFullYear()}-${two(now.getMonth() + 1)}-${two(now.getDate())}-${two(now.getHours())}${two(now.getMinutes())}.json`
}

/* ------------------------------------------------------------------ */
/* รวมผู้เล่นคนเดียวกันจากสองเครื่อง                                      */
/* ------------------------------------------------------------------ */

function union<T>(a: T[] = [], b: T[] = []): T[] {
  return Array.from(new Set([...a, ...b]))
}

function unionBy<T>(a: T[] = [], b: T[] = [], key: (x: T) => string): T[] {
  const map = new Map<string, T>()
  for (const x of [...a, ...b]) if (!map.has(key(x))) map.set(key(x), x)
  return Array.from(map.values())
}

function mergeLevel(a: LevelRecord | undefined, b: LevelRecord | undefined, newerIsB: boolean): LevelRecord {
  if (!a) return b!
  if (!b) return a
  const newer = newerIsB ? b : a
  const done = [a.completedAt, b.completedAt].filter((x): x is number => typeof x === 'number')
  return {
    ...newer,
    stepDone: Math.max(a.stepDone, b.stepDone),
    bestStars: Math.max(a.bestStars, b.bestStars),
    plays: Math.max(a.plays, b.plays),
    bestAccuracy: Math.max(a.bestAccuracy, b.bestAccuracy),
    ...(done.length > 0 ? { completedAt: Math.min(...done) } : {}),
  }
}

/** สถิติทักษะ: ใช้ชุดที่ทำมากกว่า (ถูก/ทั้งหมด/เวลา มาจากชุดเดียวกัน ค่าจึงไม่ขัดกัน) */
function mergeSkill(a: SkillStat, b: SkillStat): SkillStat {
  return b.attempts > a.attempts ? b : a
}

/** ผลแบบทดสอบ: ใช้ครั้งล่าสุด (เหมือนในเครื่องเดียว) */
function latestTest<T extends { at: number }>(a?: T, b?: T): T | undefined {
  if (!a) return b
  if (!b) return a
  return b.at > a.at ? b : a
}

/**
 * รวมผู้เล่นคนเดียวกันจากสองเครื่อง
 * a = ข้อมูลในเครื่องนี้ (ข้อมูลทะเบียนที่ครูแก้ไว้ยึดเครื่องนี้) b = ข้อมูลจากไฟล์
 */
export function mergePlayer(a: Player, b: Player): Player {
  const newerIsB = b.lastPlayed > a.lastPlayed
  const newer = newerIsB ? b : a
  const levels: Record<number, LevelRecord> = {}
  for (const id of union(Object.keys(a.levels), Object.keys(b.levels)).map(Number)) levels[id] = mergeLevel(a.levels[id], b.levels[id], newerIsB)
  const skills = { ...a.skills }
  for (const s of Object.keys(b.skills) as Skill[]) skills[s] = a.skills[s] ? mergeSkill(a.skills[s], b.skills[s]) : b.skills[s]
  const stages: Player['stages'] = { ...(a.stages ?? {}) }
  for (const [k, r] of Object.entries(b.stages ?? {})) {
    const o = stages[k]
    stages[k] = o ? { stars: Math.max(o.stars, r.stars), plays: Math.max(o.plays, r.plays), bestAccuracy: Math.max(o.bestAccuracy, r.bestAccuracy) } : r
  }
  const planBest: Record<string, number> = { ...(a.plan?.best ?? {}) }
  for (const [k, v] of Object.entries(b.plan?.best ?? {})) planBest[k] = Math.max(planBest[k] ?? 0, v)
  const pickAvatar = !newer.needsAvatar ? newer : a.needsAvatar ? b : a
  return {
    ...newer,
    id: a.id,
    name: a.name,
    student: a.student ?? b.student,
    avatar: pickAvatar.avatar,
    needsAvatar: a.needsAvatar && b.needsAvatar ? true : undefined,
    createdAt: Math.min(a.createdAt, b.createdAt),
    lastPlayed: Math.max(a.lastPlayed, b.lastPlayed),
    exp: Math.max(a.exp, b.exp),
    levels,
    skills,
    stages,
    mistakes: unionBy(a.mistakes, b.mistakes, (m) => `${m.at}|${m.gen}`)
      .sort((x, y) => x.at - y.at)
      .slice(-60),
    fixedMistakes: Math.max(a.fixedMistakes, b.fixedMistakes),
    badges: union(a.badges, b.badges),
    preTest: latestTest(a.preTest, b.preTest),
    postTest: latestTest(a.postTest, b.postTest),
    totalTimeMs: Math.max(a.totalTimeMs, b.totalTimeMs),
    bestStreak: Math.max(a.bestStreak, b.bestStreak),
    hintsUsed: Math.max(a.hintsUsed, b.hintsUsed),
    answered: Math.max(a.answered, b.answered),
    mapCoins: union(a.mapCoins, b.mapCoins),
    owned: union(a.owned, b.owned),
    questsDone: Math.max(a.questsDone, b.questsDone),
    goalsDone: Math.max(a.goalsDone, b.goalsDone),
    eco: b.eco.days > a.eco.days ? b.eco : a.eco,
    changeBest: Math.max(a.changeBest, b.changeBest),
    chests: union(a.chests, b.chests).sort((x, y) => x - y),
    plan: { best: planBest, done: Math.max(a.plan?.done ?? 0, b.plan?.done ?? 0) },
    album: union(a.album, b.album),
    tests: a.tests || b.tests ? unionBy(a.tests, b.tests, (t) => t.id).sort((x, y) => x.startedAt - y.startedAt) : undefined,
    retake: mergeRetake(a.retake, b.retake),
  }
}

/** ครูให้ทำใหม่: ใช้เวลาที่กดล่าสุดของแต่ละแบบทดสอบ */
function mergeRetake(a: Player['retake'], b: Player['retake']): Player['retake'] {
  if (!a && !b) return undefined
  const out: NonNullable<Player['retake']> = { ...(a ?? {}) }
  for (const k of ['pre', 'post'] as const) {
    const v = Math.max(a?.[k] ?? 0, b?.[k] ?? 0)
    if (v > 0) out[k] = v
  }
  return out
}

export interface MergeResult {
  save: SaveData
  /** นักเรียนที่เพิ่มเข้ามาใหม่ */
  added: number
  /** นักเรียนที่มีอยู่แล้วและรวมผลเข้าด้วยกัน */
  merged: number
}

/** หาผู้เล่นคนเดียวกันในเครื่องนี้: รหัสผู้เล่นตรงกัน หรือข้อมูลทะเบียนเป็นคนเดียวกัน */
function findSame(players: Record<string, Player>, p: Player): Player | undefined {
  if (players[p.id]) return players[p.id]
  if (!p.student) return undefined
  const key = studentKey(p.student)
  return Object.values(players).find((x) => x.student && studentKey(x.student) === key)
}

/**
 * รวมข้อมูลจากไฟล์เข้ากับข้อมูลในเครื่องนี้
 * การตั้งค่าเสียงของเครื่องนี้คงเดิม การตั้งค่าห้องเรียนรับจากไฟล์เฉพาะเมื่อเครื่องนี้ยังไม่ได้ตั้ง
 */
export function mergeSaves(local: SaveData, incoming: SaveData): MergeResult {
  const players = { ...local.players }
  let added = 0
  let merged = 0
  for (const p of Object.values(incoming.players)) {
    const same = findSame(players, p)
    if (same) {
      players[same.id] = mergePlayer(same, p)
      merged += 1
    } else {
      let id = p.id
      while (players[id]) id += '_'
      players[id] = { ...p, id }
      added += 1
    }
  }
  const classroom = classroomConfigured(local.classroom) ? local.classroom : incoming.classroom
  // คลังข้อสอบ: ใช้ฉบับที่ครูแก้ล่าสุด (ครูแจกข้อสอบที่แก้แล้วให้แท็บเล็ตทุกเครื่องผ่านไฟล์สำรองได้)
  const bank = incoming.bank.updatedAt > local.bank.updatedAt ? incoming.bank : local.bank
  return { save: { ...local, players, classroom, bank }, added, merged }
}

/* ------------------------------------------------------------------ */
/* สำเนาก่อนนำเข้า (ย้อนกลับได้หนึ่งครั้ง)                                 */
/* ------------------------------------------------------------------ */

export const PREVIOUS_KEY = 'moneyHero.save.prev'

/** เก็บข้อมูลก่อนนำเข้าไฟล์ไว้ ถ้านำเข้าผิดกดย้อนกลับได้ */
export function keepPrevious(save: SaveData, now = Date.now()): boolean {
  try {
    globalThis.localStorage?.setItem(PREVIOUS_KEY, buildBackup(save, now))
    return true
  } catch {
    return false
  }
}

export function readPrevious(): BackupRead | null {
  try {
    const raw = globalThis.localStorage?.getItem(PREVIOUS_KEY)
    return raw ? readBackup(raw) : null
  } catch {
    return null
  }
}

export function clearPrevious(): void {
  try {
    globalThis.localStorage?.removeItem(PREVIOUS_KEY)
  } catch {
    // ไม่มีที่เก็บข้อมูล: ไม่ต้องทำอะไร
  }
}

/** ดาวน์โหลดข้อความเป็นไฟล์ (ใช้ในหน้าเว็บเท่านั้น) */
export function downloadText(name: string, body: string, type: string): void {
  const blob = new Blob([body], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
