import { DEFAULT_AVATAR_ID, isValidAvatarId } from '../data/avatars'
import { HP_CONFIG, MAX_RECENT_ATTEMPTS } from '../data/rewards'
import { SKILL_IDS } from '../data/skills'
import { ALL_QUESTS } from '../data/quests'
import { getItem } from '../data/items'
import { STORY_BEATS } from '../data/story'
import { STAGES, getStage } from '../data/stages'
import { EQUIP_SLOTS } from './inventoryService'
import type { Equipment } from '../types/item'
import type { GameSettings, Player } from '../types/player'
import type { DailyQuestState, QuestProgress } from '../types/quest'
import type { StageProgress } from '../types/stage'
import type {
  PlayerStatistics,
  QuestionAttempt,
  SkillId,
} from '../types/stats'
import { MAX_LEVEL, applyExpGain, getRequiredExp } from '../utils/experience'
import {
  MAX_STAGE_STARS,
  createEmptyStageProgress,
  resolveUnlockedWorlds,
} from '../utils/stageSystem'
import {
  calculateAccuracy,
  createEmptySkillStatistic,
  createEmptyStatistics,
} from '../utils/statistics'

const PLAYER_KEY = 'math-adventure:player:v1'
const SETTINGS_KEY = 'math-adventure:settings:v1'

/** เวอร์ชันโครงสร้างข้อมูลปัจจุบัน เพิ่มเลขนี้เมื่อรูปแบบข้อมูลเปลี่ยน แล้วเขียน migration รองรับ */
export const CURRENT_SAVE_VERSION = 5

export const DEFAULT_SETTINGS: GameSettings = {
  soundEnabled: true,
  musicEnabled: true,
  animationsEnabled: true,
}

export type StorageStatus =
  | 'ok'
  | 'empty'
  | 'corrupted'
  | 'repaired'
  | 'unavailable'

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

function toSafeNumber(
  value: unknown,
  fallback: number,
  min: number,
  max: number,
): number {
  const parsed = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(parsed)) return fallback
  return Math.min(max, Math.max(min, parsed))
}

function toIsoString(value: unknown, fallback: string): string {
  if (typeof value !== 'string' || value.length === 0) return fallback
  return Number.isNaN(Date.parse(value)) ? fallback : value
}

function toIdArray(value: unknown, allowed?: Set<string>): string[] {
  if (!Array.isArray(value)) return []
  const unique = new Set<string>()
  for (const item of value) {
    if (typeof item !== 'string' || item.length === 0 || item.length > 100) continue
    if (allowed && !allowed.has(item)) continue
    unique.add(item)
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

const STAGE_IDS = new Set(STAGES.map((stage) => stage.id))
const QUEST_IDS = new Set(ALL_QUESTS.map((quest) => quest.id))

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

    completedStages: [],
    stageProgress: {},
    // โลกแรกเปิดให้เล่นตั้งแต่เริ่มเกมเสมอ
    unlockedWorlds: ['world-1'],

    questProgress: {},
    dailyQuests: { date: '', questIds: [] },

    storyFlags: [],
    inventory: {},
    equipped: {},

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

/** ตรวจความคืบหน้ารายด่าน ทิ้งด่านที่ไม่มีอยู่จริงและจำกัดค่าที่เกินขอบเขต */
function parseStageProgress(raw: unknown): Record<string, StageProgress> {
  const records: Record<string, StageProgress> = {}
  if (!isRecord(raw)) return records

  for (const [stageId, entry] of Object.entries(raw)) {
    if (!STAGE_IDS.has(stageId) || !isRecord(entry)) continue

    const stage = getStage(stageId)
    const maxScore = stage?.questionCount ?? 999

    const stars = toSafeInt(entry.stars, 0, 0, MAX_STAGE_STARS)
    const completed = entry.completed === true

    records[stageId] = {
      ...createEmptyStageProgress(stageId),
      attempts: toSafeInt(entry.attempts, 0, 0, 999_999),
      bestScore: toSafeInt(entry.bestScore, 0, 0, maxScore),
      bestAccuracy: toSafeNumber(entry.bestAccuracy, 0, 0, 100),
      stars,
      completed,
      // ต้องได้ดาวครบเท่านั้นจึงจะนับว่าเชี่ยวชาญ ไม่เชื่อธงที่บันทึกไว้
      mastered: completed && stars >= MAX_STAGE_STARS,
      firstCompletedAt:
        typeof entry.firstCompletedAt === 'string'
          ? entry.firstCompletedAt
          : undefined,
      lastPlayedAt:
        typeof entry.lastPlayedAt === 'string' ? entry.lastPlayedAt : undefined,
    }
  }

  return records
}

function parseQuestProgress(raw: unknown): Record<string, QuestProgress> {
  const records: Record<string, QuestProgress> = {}
  if (!isRecord(raw)) return records

  for (const [questId, entry] of Object.entries(raw)) {
    if (!QUEST_IDS.has(questId) || !isRecord(entry)) continue

    const counters = Array.isArray(entry.counters)
      ? entry.counters.map((value) => toSafeInt(value, 0, 0, 9_999_999))
      : []

    const completed = entry.completed === true

    records[questId] = {
      questId,
      counters,
      completed,
      // รับรางวัลได้เฉพาะภารกิจที่สำเร็จแล้วเท่านั้น
      claimed: completed && entry.claimed === true,
      completedAt:
        typeof entry.completedAt === 'string' ? entry.completedAt : undefined,
      claimedAt:
        typeof entry.claimedAt === 'string' ? entry.claimedAt : undefined,
    }
  }

  return records
}

function parseDailyQuests(raw: unknown): DailyQuestState {
  if (!isRecord(raw)) return { date: '', questIds: [] }

  const date =
    typeof raw.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw.date)
      ? raw.date
      : ''

  return { date, questIds: toIdArray(raw.questIds, QUEST_IDS) }
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
      stageId: typeof entry.stageId === 'string' ? entry.stageId.slice(0, 100) : '',
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
  const stageProgress = parseStageProgress(raw.stageProgress)

  // รายชื่อด่านที่ผ่านต้องสอดคล้องกับความคืบหน้ารายด่านเสมอ
  const completedStages = Object.values(stageProgress)
    .filter((progress) => progress.completed)
    .map((progress) => progress.stageId)

  const player: Player = {
    id:
      typeof raw.id === 'string' && raw.id.length > 0
        ? raw.id.slice(0, 100)
        : createId(),
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

    completedStages,
    stageProgress,
    unlockedWorlds: [],

    questProgress: parseQuestProgress(raw.questProgress),
    dailyQuests: parseDailyQuests(raw.dailyQuests),

    storyFlags: parseStoryFlags(raw.storyFlags),
    inventory: parseInventory(raw.inventory),
    equipped: parseEquipped(raw.equipped),

    statistics: parseStatistics(raw.statistics),
    recentAttempts: parseRecentAttempts(raw.recentAttempts),

    createdAt,
    updatedAt: toIsoString(raw.updatedAt, createdAt),
  }

  // คำนวณโลกที่เปิดจากความคืบหน้าจริง กันไม่ให้แก้ localStorage เพื่อข้ามด่าน
  return { ...player, unlockedWorlds: resolveUnlockedWorlds(player) }
}

/**
 * อ่านกระเป๋าของ
 *
 * ทิ้งรหัสของที่ไม่มีอยู่จริงแล้ว เช่นของที่เคยมีในเกมเวอร์ชันเก่า
 * ถ้าปล่อยไว้ หน้าจอจะพยายามวาดของที่ไม่มีข้อมูลแล้วพัง
 */
function parseInventory(raw: unknown): Record<string, number> {
  if (!isRecord(raw)) return {}

  const inventory: Record<string, number> = {}
  for (const [itemId, value] of Object.entries(raw)) {
    if (!getItem(itemId)) continue
    const count = toSafeInt(value, 0, 0, 999)
    if (count > 0) inventory[itemId] = count
  }
  return inventory
}

/**
 * อ่านของที่สวมอยู่
 *
 * ตรวจสองชั้น: ของต้องมีอยู่จริง และต้องสวมในช่องที่ตรงกับชนิดของมัน
 * ชั้นที่สองสำคัญ เพราะถ้าแก้ไฟล์บันทึกให้เอาอาวุธตำนานไปใส่ช่องเกราะ
 * จะได้ค่าพลังซ้อนกันสองช่องจากของชิ้นเดียว
 */
function parseEquipped(raw: unknown): Equipment {
  if (!isRecord(raw)) return {}

  const equipped: Equipment = {}
  for (const slot of EQUIP_SLOTS) {
    const itemId = raw[slot]
    if (typeof itemId !== 'string') continue
    const item = getItem(itemId)
    if (!item || item.kind !== slot) continue
    equipped[slot] = itemId
  }
  return equipped
}

/**
 * อ่านธงเรื่อง
 *
 * ทิ้งธงที่ไม่มีอยู่จริงในเนื้อเรื่องแล้ว และตัดธงซ้ำออก
 * ถ้าปล่อยธงแปลกปลอมไว้ ความคืบหน้าของเรื่องจะเกินร้อยเปอร์เซ็นต์
 */
function parseStoryFlags(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []

  const known = new Set(
    STORY_BEATS.map((beat) => beat.grantsFlag).filter(
      (flag): flag is string => Boolean(flag),
    ),
  )
  const flags: string[] = []
  for (const value of raw) {
    if (typeof value !== 'string') continue
    if (!known.has(value)) continue
    if (flags.includes(value)) continue
    flags.push(value)
  }
  return flags
}

/**
 * เวอร์ชัน 4 → เวอร์ชัน 5
 * เพิ่มเนื้อเรื่อง ผู้เล่นเดิมเริ่มจากยังไม่ได้อ่านตอนไหนเลย
 */
function migrateV4ToV5(raw: unknown): unknown {
  if (!isRecord(raw)) return raw
  return { ...raw, storyFlags: [] }
}

/**
 * เวอร์ชัน 3 → เวอร์ชัน 4
 * เพิ่มระบบร้านค้าและของสวมใส่ ผู้เล่นเดิมเริ่มต้นด้วยกระเป๋าว่าง
 */
function migrateV3ToV4(raw: unknown): unknown {
  if (!isRecord(raw)) return raw
  return { ...raw, inventory: {}, equipped: {} }
}

/**
 * เวอร์ชัน 1 (Part 1) → เวอร์ชัน 2
 * ข้อมูลเดิมไม่มีสถิติ streak หรือประวัติการเล่น จึงเติมค่าเริ่มต้นให้
 */
function migrateV1ToV2(raw: unknown): unknown {
  if (!isRecord(raw)) return raw

  const completedLevels = toIdArray(raw.completedLevels)
  const migratedAt = toIsoString(raw.updatedAt, new Date().toISOString())

  const levelRecords: Record<string, unknown> = {}
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

/**
 * เวอร์ชัน 2 (Part 2) → เวอร์ชัน 3
 * Part 3 เปลี่ยนคำว่า level เป็น stage และเพิ่มระบบดาว ภารกิจ และการปลดล็อกโลก
 * ด่านเดิม world-1-level-N ถูกย้ายไปเป็น world-1-stage-N ตามลำดับ ความคืบหน้าจึงไม่หาย
 */
function migrateV2ToV3(raw: unknown): unknown {
  if (!isRecord(raw)) return raw

  const oldCompleted = toIdArray(raw.completedLevels)
  const oldRecords = isRecord(raw.levelRecords) ? raw.levelRecords : {}
  const migratedAt = toIsoString(raw.updatedAt, new Date().toISOString())

  const stageProgress: Record<string, unknown> = {}

  const toStageId = (levelId: string): string =>
    levelId.replace(/-level-(\d+)$/, '-stage-$1')

  for (const levelId of oldCompleted) {
    const stageId = toStageId(levelId)
    if (!STAGE_IDS.has(stageId)) continue

    const oldRecord = oldRecords[levelId]
    const bestAccuracy = isRecord(oldRecord)
      ? toSafeNumber(oldRecord.bestAccuracy, 0, 0, 100)
      : 0
    const bestScore = isRecord(oldRecord)
      ? toSafeInt(oldRecord.bestCorrect, 0, 0, 999)
      : 0
    const attempts = isRecord(oldRecord)
      ? toSafeInt(oldRecord.completions, 1, 1, 999_999)
      : 1

    const stage = getStage(stageId)
    // ข้อมูลเดิมไม่ได้เก็บความแม่นยำไว้ทุกกรณี จึงให้ดาวขั้นต่ำ 1 ดวงสำหรับด่านที่เคยผ่าน
    const stars =
      bestAccuracy >= 90 ? 3 : bestAccuracy >= 70 ? 2 : 1

    stageProgress[stageId] = {
      stageId,
      attempts,
      bestScore: Math.min(bestScore, stage?.questionCount ?? bestScore),
      bestAccuracy,
      stars,
      completed: true,
      mastered: stars >= MAX_STAGE_STARS,
      firstCompletedAt: migratedAt,
      lastPlayedAt: migratedAt,
    }
  }

  return {
    ...raw,
    stageProgress,
    questProgress: {},
    dailyQuests: { date: '', questIds: [] },
  }
}

/** อ่านซองข้อมูลและแปลงให้เป็นเวอร์ชันปัจจุบันทีละขั้น */
function migrateToCurrent(parsed: unknown): unknown {
  // เวอร์ชัน 1 บันทึก Player ไว้ตรง ๆ โดยไม่มีซองครอบ
  if (isRecord(parsed) && !('version' in parsed)) {
    return migrateV4ToV5(migrateV3ToV4(migrateV2ToV3(migrateV1ToV2(parsed))))
  }

  if (!isRecord(parsed)) return null

  const version = toSafeInt(parsed.version, 1, 1, 999)
  let player = parsed.player

  if (version <= 1) player = migrateV1ToV2(player)
  if (version <= 2) player = migrateV2ToV3(player)
  if (version <= 3) player = migrateV3ToV4(player)
  if (version <= 4) player = migrateV4ToV5(player)

  return player
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
    const envelope = {
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
export function updatePlayer(player: Player, changes: Partial<Player>): Player {
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
