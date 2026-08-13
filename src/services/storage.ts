import { DEFAULT_AVATAR_ID, isValidAvatarId } from '../data/avatars'
import type { GameSettings, Player } from '../types/player'
import { MAX_LEVEL } from '../utils/levelSystem'

const PLAYER_KEY = 'math-adventure:player:v1'
const SETTINGS_KEY = 'math-adventure:settings:v1'

export const DEFAULT_MAX_HP = 100

export const DEFAULT_SETTINGS: GameSettings = {
  soundEnabled: true,
  reduceMotion: false,
}

export type StorageStatus = 'ok' | 'empty' | 'corrupted' | 'unavailable'

export interface LoadResult<T> {
  status: StorageStatus
  data: T | null
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

function toSafeInt(value: unknown, fallback: number, min: number, max: number): number {
  const parsed = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(parsed)) return fallback
  return Math.min(max, Math.max(min, Math.floor(parsed)))
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  const unique = new Set<string>()
  for (const item of value) {
    if (typeof item === 'string' && item.length > 0 && item.length <= 100) {
      unique.add(item)
    }
  }
  return Array.from(unique)
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
    hp: DEFAULT_MAX_HP,
    maxHp: DEFAULT_MAX_HP,
    completedLevels: [],
    createdAt: now,
    updatedAt: now,
  }
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

/** แปลงข้อมูลดิบจาก localStorage ให้เป็น Player ที่ปลอดภัย หรือคืน null ถ้าซ่อมไม่ได้ */
function parsePlayer(raw: unknown): Player | null {
  if (!isRecord(raw)) return null

  const name = typeof raw.name === 'string' ? sanitizeName(raw.name) : ''
  if (name.length === 0) return null

  const avatar =
    typeof raw.avatar === 'string' && isValidAvatarId(raw.avatar)
      ? raw.avatar
      : DEFAULT_AVATAR_ID

  const maxHp = toSafeInt(raw.maxHp, DEFAULT_MAX_HP, 1, 9999)
  const createdAt =
    typeof raw.createdAt === 'string' && raw.createdAt.length > 0
      ? raw.createdAt
      : new Date().toISOString()

  return {
    id: typeof raw.id === 'string' && raw.id.length > 0 ? raw.id : createId(),
    name,
    avatar,
    level: toSafeInt(raw.level, 1, 1, MAX_LEVEL),
    exp: toSafeInt(raw.exp, 0, 0, 9_999_999),
    coins: toSafeInt(raw.coins, 0, 0, 9_999_999),
    hp: toSafeInt(raw.hp, maxHp, 0, maxHp),
    maxHp,
    completedLevels: toStringArray(raw.completedLevels),
    createdAt,
    updatedAt:
      typeof raw.updatedAt === 'string' && raw.updatedAt.length > 0
        ? raw.updatedAt
        : createdAt,
  }
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
    const player = parsePlayer(JSON.parse(rawValue))
    if (!player) return { status: 'corrupted', data: null }
    return { status: 'ok', data: player }
  } catch {
    return { status: 'corrupted', data: null }
  }
}

export function savePlayer(player: Player): boolean {
  const storage = getStorage()
  if (!storage) return false

  try {
    const payload: Player = { ...player, updatedAt: new Date().toISOString() }
    storage.setItem(PLAYER_KEY, JSON.stringify(payload))
    return true
  } catch {
    return false
  }
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

    return {
      soundEnabled:
        typeof parsed.soundEnabled === 'boolean'
          ? parsed.soundEnabled
          : DEFAULT_SETTINGS.soundEnabled,
      reduceMotion:
        typeof parsed.reduceMotion === 'boolean'
          ? parsed.reduceMotion
          : DEFAULT_SETTINGS.reduceMotion,
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
