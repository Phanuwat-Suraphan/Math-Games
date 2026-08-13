import { DEFAULT_AVATAR_ID, isValidAvatarId } from '../data/avatars'
import { HP_CONFIG, MAX_RECENT_ATTEMPTS } from '../data/rewards'
import { SKILL_IDS } from '../data/skills'
import type { GameSettings, Player } from '../types/player'
import type {
  LevelRecord,
  PlayerStatistics,
  QuestionAttempt,
  SkillId,
} from '../types/stats'
import { MAX_LEVEL, applyExpGain, getRequiredExp } from '../utils/experience'
import {
  calculateAccuracy,
  createEmptySkillStatistic,
  createEmptyStatistics,
} from '../utils/statistics'

const PLAYER_KEY = 'math-adventure:player:v1'
const SETTINGS_KEY = 'math-adventure:settings:v1'

/** เวอร์ชันโครงสร้างข้อมูลปัจจุบัน เพิ่มเลขนี้เมื่อรูปแบบข้อมูลเปลี่ยน แล้วเขียน migration รองรับ */
export const CURRENT_SAVE_VERSION = 2

export const DEFAULT_SETTINGS: GameSettings = {
  soundEnabled: true,
  musicEnabled: true,
  animationsEnabled: true,
}

export type StorageStatus = 'ok' | 'empty' | 'corrupted' | 'repaired' | 'unavailable'

export interface LoadResult<T> {
  status: StorageStatus
  data: T | null
}

interface SaveEnvelope {
  version: number
  player: unknown
}

function getStorage(): Storage | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null
    // ทดสอบเขียนจริง เพราะโหมดส่วนตัวของบางเบราว์เซอร์จะโยน error ตอนเขียน
    const probeKey = '__math_adventure_probe__'
    window.localStorage.setItem(probeKey, '1')
    window.localStorage.removeItem(probeKey)
    return window.localStorage
  } catch {
    return null
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function toSafeInt(
  value: unknown,
  fallback: number,
  min: number,
  max: number,
): number {
  const parsed = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(parsed)) return fallback
  return Math.min(max, Math.max(min, Math.floor(parsed)))
}

function toIsoString(value: unknown, fallback: string): string {
  if (typeof value !== 'string' || value.length === 0) return fallback
  return Number.isNaN(Date.parse(value)) ? fallback : value
}

function toLevelIdArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  const unique = new Set<string>()
  for (const item of value) {
    if (typeof item === 'string' && item.length > 0 && item.length <= 100) {
      unique.add(item)
    }
  }
  return Array.from(unique)
}

export function sanitizeName(name: string): string {
  const trimmed = name.trim().replace(/\s+/g, ' ')
  return trimmed.slice(0, 20)
}

function createId(): string {
  try {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
      return crypto.randomUUID()
    }
  } catch {
    // ตกไปใช้วิธีสำรองด้านล่าง
  }
  return `player-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

export function createPlayer(name: string, avatar: string): Player {
  const now = new Date().toISOString()

  return {
    id: createId(),
    name: sanitizeName(name),
    avatar: isValidAvatarId(avatar) ? avatar : DEFAULT_AVATAR_ID,

    level: 1,
    exp: 0,
    coins: 100,
    hp: HP_CONFIG.defaultMaxHp,
    maxHp: HP_CONFIG.defaultMaxHp,

    totalQuestions: 0,
    correctAnswers: 0,
    wrongAnswers: 0,

    currentStreak: 0,
    bestStreak: 0,

    completedLevels: [],
    levelRecords: {},

    statistics: createEmptyStatistics(),
    recentAttempts: [],

    createdAt: now,
    updatedAt: now,
  }
}

/** ตรวจและซ่อมสถิติรายทักษะ ค่าที่ผิดปกติจะถูกปรับให้สมเหตุสมผลแทนการทิ้งทั้งก้อน */
function parseStatistics(raw: unknown): PlayerStatistics {
  const statistics = createEmptyStatistics()
  if (!isRecord(raw)) return statistics

  for (const id of SKILL_IDS) {
    const entry = raw[id]
    if (!isRecord(entry)) continue

    const attempts = toSafeInt(entry.attempts, 0, 0, 9_999_999)
    // จำนวนที่ถูกต้องต้องไม่มากกว่าจำนวนครั้งที่ทำ
    const correct = toSafeInt(entry.correct, 0, 0, attempts)

    const statistic = createEmptySkillStatistic()
    statistic.attempts = attempts
    statistic.correct = correct
    // คำนวณใหม่เสมอ ไม่เชื่อค่า accuracy ที่บันทึกไว้
    statistic.accuracy = calculateAccuracy(correct, attempts)

    if (typeof entry.lastPlayedAt === 'string' && entry.lastPlayedAt.length > 0) {
      statistic.lastPlayedAt = entry.lastPlayedAt
    }

    statistics[id] = statistic
  }

  return statistics
}

function parseLevelRecords(raw: unknown): Record<string, LevelRecord> {
  const records: Record<string, LevelRecord> = {}
  if (!isRecord(raw)) return records

  for (const [levelId, entry] of Object.entries(raw)) {
    if (levelId.length === 0 || levelId.length > 100) continue
    if (!isRecord(entry)) continue

    records[levelId] = {
      completions: toSafeInt(entry.completions, 0, 0, 999_999),
      bestCorrect: toSafeInt(entry.bestCorrect, 0, 0, 9_999),
      bestAccuracy: Math.min(
        100,
        Math.max(0, Number(entry.bestAccuracy) || 0),
      ),
      lastPlayedAt: toIsoString(entry.lastPlayedAt, new Date().toISOString()),
    }
  }

  return records
}

function parseRecentAttempts(raw: unknown): QuestionAttempt[] {
  if (!Array.isArray(raw)) return []

  const skillSet = new Set<string>(SKILL_IDS)
  const attempts: QuestionAttempt[] = []

  for (const entry of raw) {
    if (!isRecord(entry)) continue
    if (typeof entry.questionId !== 'string' || entry.questionId.length === 0) continue
    if (typeof entry.skill !== 'string' || !skillSet.has(entry.skill)) continue

    attempts.push({
      questionId: entry.questionId.slice(0, 100),
      skill: entry.skill as SkillId,
      levelId: typeof entry.levelId === 'string' ? entry.levelId.slice(0, 100) : '',
      isCorrect: entry.isCorrect === true,
      timeMs: toSafeInt(entry.timeMs, 0, 0, 3_600_000),
      answeredAt: toIsoString(entry.answeredAt, new Date().toISOString()),
    })
  }

  return attempts.slice(-MAX_RECENT_ATTEMPTS)
}

/**
 * แปลงข้อมูลดิบให้เป็น Player ที่ปลอดภัย
 * คืน null เฉพาะกรณีที่ซ่อมไม่ได้จริง ๆ (เช่น ไม่มีชื่อผู้เล่น)
 */
function parsePlayer(raw: unknown): Player | null {
  if (!isRecord(raw)) return null

  const name = typeof raw.name === 'string' ? sanitizeName(raw.name) : ''
  if (name.length === 0) return null

  const now = new Date().toISOString()
  const createdAt = toIsoString(raw.createdAt, now)
  const maxHp = toSafeInt(raw.maxHp, HP_CONFIG.defaultMaxHp, 1, 9_999)

  const level = toSafeInt(raw.level, 1, 1, MAX_LEVEL)
  // EXP ต้องไม่เกินเกณฑ์ของเลเวลปัจจุบัน มิฉะนั้นแถบ EXP จะแสดงเกิน 100%
  const exp = toSafeInt(raw.exp, 0, 0, Math.max(0, getRequiredExp(level) - 1))

  const totalQuestions = toSafeInt(raw.totalQuestions, 0, 0, 9_999_999)
  const correctAnswers = toSafeInt(raw.correctAnswers, 0, 0, totalQuestions)
  const wrongAnswers = toSafeInt(
    raw.wrongAnswers,
    Math.max(0, totalQuestions - correctAnswers),
    0,
    totalQuestions,
  )

  const bestStreak = toSafeInt(raw.bestStreak, 0, 0, 9_999_999)

  return {
    id: typeof raw.id === 'string' && raw.id.length > 0 ? raw.id.slice(0, 100) : createId(),
    name,
    avatar:
      typeof raw.avatar === 'string' && isValidAvatarId(raw.avatar)
        ? raw.avatar
        : DEFAULT_AVATAR_ID,

    level,
    exp,
    coins: toSafeInt(raw.coins, 0, 0, 9_999_999),
    hp: toSafeInt(raw.hp, maxHp, 0, maxHp),
    maxHp,

    totalQuestions,
    correctAnswers,
    wrongAnswers,

    // streak ปัจจุบันต้องไม่มากกว่าสถิติที่ดีที่สุด
    currentStreak: toSafeInt(raw.currentStreak, 0, 0, bestStreak),
    bestStreak,

    completedLevels: toLevelIdArray(raw.completedLevels),
    levelRecords: parseLevelRecords(raw.levelRecords),

    statistics: parseStatistics(raw.statistics),
    recentAttempts: parseRecentAttempts(raw.recentAttempts),

    createdAt,
    updatedAt: toIsoString(raw.updatedAt, createdAt),
  }
}

/**
 * ย้ายข้อมูลจากเวอร์ชัน 1 (Part 1) มาเป็นเวอร์ชัน 2
 * ข้อมูลเดิมไม่มีสถิติ streak หรือประวัติการเล่น จึงเติมค่าเริ่มต้นให้
 * และเติม levelRecords จาก completedLevels เพื่อให้ระบบเล่นซ้ำทำงานถูกต้องทันที
 */
function migrateFromV1(raw: unknown): unknown {
  if (!isRecord(raw)) return raw

  const completedLevels = toLevelIdArray(raw.completedLevels)
  const migratedAt = toIsoString(raw.updatedAt, new Date().toISOString())

  const levelRecords: Record<string, LevelRecord> = {}
  for (const levelId of completedLevels) {
    levelRecords[levelId] = {
      completions: 1,
      bestCorrect: 0,
      bestAccuracy: 0,
      lastPlayedAt: migratedAt,
    }
  }

  return {
    ...raw,
    totalQuestions: 0,
    correctAnswers: 0,
    wrongAnswers: 0,
    currentStreak: 0,
    bestStreak: 0,
    levelRecords,
    statistics: createEmptyStatistics(),
    recentAttempts: [],
  }
}

/** อ่านซองข้อมูลและแปลงให้เป็นเวอร์ชันปัจจุบัน */
function migrateToCurrent(parsed: unknown): unknown {
  // เวอร์ชัน 1 บันทึก Player ไว้ตรง ๆ โดยไม่มีซองครอบ
  if (isRecord(parsed) && !('version' in parsed)) {
    return migrateFromV1(parsed)
  }

  if (!isRecord(parsed)) return null

  const version = toSafeInt(parsed.version, 1, 1, 999)
  const storedPlayer = parsed.player

  if (version >= CURRENT_SAVE_VERSION) return storedPlayer
  if (version === 1) return migrateFromV1(storedPlayer)

  return storedPlayer
}

/** ปรับ EXP ที่ล้นเกณฑ์ให้กลายเป็นเลเวลที่ถูกต้อง (เกิดได้เมื่อเส้นโค้ง EXP เปลี่ยน) */
function settleLevel(player: Player): Player {
  const gain = applyExpGain(player.level, player.exp, 0)
  if (gain.level === player.level && gain.exp === player.exp) return player
  return { ...player, level: gain.level, exp: gain.exp }
}

export function loadPlayer(): LoadResult<Player> {
  const storage = getStorage()
  if (!storage) return { status: 'unavailable', data: null }

  let rawValue: string | null = null
  try {
    rawValue = storage.getItem(PLAYER_KEY)
  } catch {
    return { status: 'unavailable', data: null }
  }

  if (rawValue === null) return { status: 'empty', data: null }

  try {
    const parsed: unknown = JSON.parse(rawValue)
    const needsMigration =
      isRecord(parsed) &&
      (!('version' in parsed) ||
        toSafeInt(parsed.version, 1, 1, 999) < CURRENT_SAVE_VERSION)

    const player = parsePlayer(migrateToCurrent(parsed))
    if (!player) return { status: 'corrupted', data: null }

    const settled = settleLevel(player)

    // บันทึกทับด้วยรูปแบบใหม่ทันที เพื่อไม่ต้อง migrate ซ้ำทุกครั้งที่เปิดเกม
    if (needsMigration) {
      savePlayer(settled)
      return { status: 'repaired', data: settled }
    }

    return { status: 'ok', data: settled }
  } catch {
    return { status: 'corrupted', data: null }
  }
}

export function savePlayer(player: Player): boolean {
  const storage = getStorage()
  if (!storage) return false

  try {
    const envelope: SaveEnvelope = {
      version: CURRENT_SAVE_VERSION,
      player: { ...player, updatedAt: new Date().toISOString() },
    }
    storage.setItem(PLAYER_KEY, JSON.stringify(envelope))
    return true
  } catch {
    return false
  }
}

/** แก้ไขข้อมูลผู้เล่นบางส่วนแล้วบันทึก คืนผู้เล่นชุดใหม่ */
export function updatePlayer(
  player: Player,
  changes: Partial<Player>,
): Player {
  const next: Player = { ...player, ...changes }
  savePlayer(next)
  return next
}

export function clearPlayer(): void {
  const storage = getStorage()
  if (!storage) return
  try {
    storage.removeItem(PLAYER_KEY)
  } catch {
    // ไม่ต้องทำอะไร เกมยังเล่นต่อได้
  }
}

export function loadSettings(): GameSettings {
  const storage = getStorage()
  if (!storage) return { ...DEFAULT_SETTINGS }

  try {
    const rawValue = storage.getItem(SETTINGS_KEY)
    if (!rawValue) return { ...DEFAULT_SETTINGS }

    const parsed: unknown = JSON.parse(rawValue)
    if (!isRecord(parsed)) return { ...DEFAULT_SETTINGS }

    // Part 1 เก็บค่าเป็น reduceMotion ซึ่งมีความหมายกลับกันกับ animationsEnabled
    const legacyAnimations =
      typeof parsed.reduceMotion === 'boolean' ? !parsed.reduceMotion : undefined

    return {
      soundEnabled:
        typeof parsed.soundEnabled === 'boolean'
          ? parsed.soundEnabled
          : DEFAULT_SETTINGS.soundEnabled,
      musicEnabled:
        typeof parsed.musicEnabled === 'boolean'
          ? parsed.musicEnabled
          : DEFAULT_SETTINGS.musicEnabled,
      animationsEnabled:
        typeof parsed.animationsEnabled === 'boolean'
          ? parsed.animationsEnabled
          : (legacyAnimations ?? DEFAULT_SETTINGS.animationsEnabled),
    }
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

export function saveSettings(settings: GameSettings): boolean {
  const storage = getStorage()
  if (!storage) return false

  try {
    storage.setItem(SETTINGS_KEY, JSON.stringify(settings))
    return true
  } catch {
    return false
  }
}
