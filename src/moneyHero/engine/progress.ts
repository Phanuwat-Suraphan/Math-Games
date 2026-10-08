import type { DenomId, Difficulty, Question, Skill } from './types'
import { SKILLS } from '../data/characters'
import { LEVELS, TOTAL_LESSONS } from '../data/levels'
import { LEVEL_BADGES } from '../data/badges'
import { shopItem, type Wear } from '../data/shop'
import { emptyDaily, type DailyRecord } from './daily'
import { earn, type LedgerEntry } from './ledger'
import { ecoStage, emptyEco, type EcoRecord } from './eco'
import { emptyPlan, type PlanRecord } from './budget'

/**
 * ข้อมูลผู้เล่นและการบันทึกลง localStorage
 *
 * เครื่องเดียวมีผู้เล่นได้หลายคน (แท็บเล็ตห้องเรียนใช้ร่วมกัน)
 * แผงคุณครูอ่านข้อมูลทุกคนจากที่เดียวกันนี้
 */

export const SAVE_KEY = 'moneyHero.save.v1'

/** ขั้นที่ผ่านแล้ว: 0 = ยังไม่เริ่ม, 1 = LEARN, 2 = PRACTICE, 3 = MISSION, 4 = BOSS (ผ่านด่าน) */
export interface LevelRecord {
  stepDone: number
  bestStars: number
  plays: number
  bestAccuracy: number
  completedAt?: number
  /** คะแนนของรอบปัจจุบัน (ถูกครั้งแรก / ทั้งหมด) สะสมข้ามขั้น */
  runCorrect: number
  runTotal: number
  runHints: number
}

export interface SkillStat {
  attempts: number
  correct: number
  timeMs: number
}

export interface Mistake {
  at: number
  levelId: number
  gen: string
  difficulty: Difficulty
  skill: Skill
  title: string
  fixed?: boolean
}

export interface TestResult {
  score: number
  total: number
  timeMs: number
  at: number
  skills: Record<Skill, { correct: number; total: number }>
}

export interface Player {
  id: string
  name: string
  avatar: string
  createdAt: number
  lastPlayed: number
  exp: number
  coins: number
  levels: Record<number, LevelRecord>
  skills: Record<Skill, SkillStat>
  mistakes: Mistake[]
  fixedMistakes: number
  badges: string[]
  preTest?: TestResult
  postTest?: TestResult
  totalTimeMs: number
  streak: number
  bestStreak: number
  hintsUsed: number
  answered: number
  mapCoins: string[]
  /** ของที่ซื้อจากร้านของฮีโร่ และของที่สวมอยู่ */
  owned: string[]
  wear: Wear
  /** ภารกิจประจำวัน */
  daily: DailyRecord
  /** ภารกิจเสริมจากเพื่อนในเมือง: เพื่อน → วันที่ทำล่าสุด */
  npcQuests: Record<string, string>
  questsDone: number
  /** สมุดบัญชีรายรับรายจ่าย (ทุกเหรียญที่ได้และจ่าย) */
  ledger: LedgerEntry[]
  /** เป้าหมายการออม: ของในร้านที่อยากได้ */
  goal?: string
  /** ออมจนซื้อของตามเป้าหมายได้กี่ครั้งแล้ว */
  goalsDone: number
  /** โหมดกาดรักษ์โลกในเกม */
  eco: EcoRecord
  /** ร้านทอนไว: จำนวนลูกค้าที่ทอนถูกมากที่สุดในโหมดท้าเวลา 60 วินาที */
  changeBest: number
  /** ด่านย่อย X-2 / X-3: "ด่าน-ด่านย่อย" → ผลที่ดีที่สุด */
  stages: Record<string, { stars: number; plays: number; bestAccuracy: number }>
  /** ถนนดาว: หีบสมบัติที่เปิดแล้ว (จำนวนดาวของหีบ) */
  chests: number[]
  /** วางแผนใช้เงิน: ดาวที่ดีที่สุดของแต่ละงาน และจำนวนครั้งที่จัดสำเร็จ */
  plan: PlanRecord
  /** สมุดสะสมเงินไทย: สติกเกอร์ของเงินแต่ละชนิดที่ได้แล้ว */
  album: DenomId[]
  mapX?: number
  mapY?: number
}

export interface Settings {
  sound: boolean
  /** เพลงประกอบเบา ๆ บนหน้าเริ่มเกมและแผนที่ */
  music: boolean
  speech: boolean
  /** อ่านโจทย์ให้ฟังเองทุกข้อ (ไม่ต้องกดปุ่ม 🔈) */
  readAloud: boolean
  reduceMotion: boolean
  bigText: boolean
}

export interface SaveData {
  version: 1
  players: Record<string, Player>
  activeId: string | null
  settings: Settings
}

export const DEFAULT_SETTINGS: Settings = { sound: true, music: true, speech: true, readAloud: false, reduceMotion: false, bigText: false }

export function emptySkills(): Record<Skill, SkillStat> {
  const out = {} as Record<Skill, SkillStat>
  for (const s of SKILLS) out[s] = { attempts: 0, correct: 0, timeMs: 0 }
  return out
}

export function emptyTestSkills(): Record<Skill, { correct: number; total: number }> {
  const out = {} as Record<Skill, { correct: number; total: number }>
  for (const s of SKILLS) out[s] = { correct: 0, total: 0 }
  return out
}

export function emptyLevel(): LevelRecord {
  return { stepDone: 0, bestStars: 0, plays: 0, bestAccuracy: 0, runCorrect: 0, runTotal: 0, runHints: 0 }
}

export function newPlayer(name: string, avatar: string, now = Date.now()): Player {
  return {
    id: `p${now.toString(36)}${Math.floor(Math.random() * 1e4).toString(36)}`,
    name: name.trim().slice(0, 20),
    avatar,
    createdAt: now,
    lastPlayed: now,
    exp: 0,
    coins: 0,
    levels: {},
    skills: emptySkills(),
    mistakes: [],
    fixedMistakes: 0,
    badges: [],
    totalTimeMs: 0,
    streak: 0,
    bestStreak: 0,
    hintsUsed: 0,
    answered: 0,
    mapCoins: [],
    owned: [],
    wear: {},
    daily: emptyDaily(),
    npcQuests: {},
    questsDone: 0,
    ledger: [],
    goalsDone: 0,
    eco: emptyEco(),
    changeBest: 0,
    stages: {},
    chests: [],
    plan: emptyPlan(),
    album: [],
  }
}

export function emptySave(): SaveData {
  return { version: 1, players: {}, activeId: null, settings: { ...DEFAULT_SETTINGS } }
}

/** ซ่อมข้อมูลที่ขาดหาย (เช่นบันทึกจากเวอร์ชันเก่า) ให้ใช้งานต่อได้ */
function repairPlayer(raw: Partial<Player>): Player | null {
  if (!raw || typeof raw.id !== 'string' || typeof raw.name !== 'string') return null
  const base = newPlayer(raw.name, raw.avatar ?? 'hero', raw.createdAt ?? Date.now())
  const skills = emptySkills()
  for (const s of SKILLS) if (raw.skills?.[s]) skills[s] = { ...skills[s], ...raw.skills[s] }
  const levels: Record<number, LevelRecord> = {}
  for (const [k, v] of Object.entries(raw.levels ?? {})) levels[Number(k)] = { ...emptyLevel(), ...v }
  return { ...base, ...raw, id: raw.id, skills, levels, eco: { ...emptyEco(), ...(raw.eco ?? {}) }, plan: { ...emptyPlan(), ...(raw.plan ?? {}) } } as Player
}

export function parseSave(text: string | null): SaveData {
  if (!text) return emptySave()
  try {
    const data = JSON.parse(text) as Partial<SaveData>
    const save = emptySave()
    save.settings = { ...DEFAULT_SETTINGS, ...(data.settings ?? {}) }
    for (const raw of Object.values(data.players ?? {})) {
      const p = repairPlayer(raw as Partial<Player>)
      if (p) save.players[p.id] = p
    }
    save.activeId = data.activeId && save.players[data.activeId] ? data.activeId : null
    return save
  } catch {
    return emptySave()
  }
}

export function loadSave(): SaveData {
  try {
    return parseSave(globalThis.localStorage?.getItem(SAVE_KEY) ?? null)
  } catch {
    return emptySave()
  }
}

export function writeSave(save: SaveData): boolean {
  try {
    globalThis.localStorage?.setItem(SAVE_KEY, JSON.stringify(save))
    return true
  } catch {
    return false
  }
}

/* ------------------------------------------------------------------ */
/* ความก้าวหน้า                                                        */
/* ------------------------------------------------------------------ */

export function levelRecord(p: Player, id: number): LevelRecord {
  return p.levels[id] ?? emptyLevel()
}

export function isLevelPassed(p: Player, id: number): boolean {
  return levelRecord(p, id).stepDone >= 4
}

/** ด่าน 0 เปิดเสมอ ด่านถัดไปเปิดเมื่อผ่านด่านก่อนหน้า */
export function isLevelUnlocked(p: Player, id: number): boolean {
  if (id === 0) return true
  return isLevelPassed(p, id - 1)
}

/** จำนวนด่านบทเรียน (1–12) ที่ผ่านแล้ว */
export function lessonsPassed(p: Player): number {
  let n = 0
  for (let id = 1; id <= TOTAL_LESSONS; id += 1) if (isLevelPassed(p, id)) n += 1
  return n
}

export function totalStars(p: Player): number {
  return LEVELS.reduce((s, l) => s + levelRecord(p, l.id).bestStars, 0)
}

/** ด่านที่ควรเล่นต่อ */
export function nextLevelId(p: Player): number {
  for (const l of LEVELS) if (!isLevelPassed(p, l.id)) return l.id
  return LEVELS[LEVELS.length - 1].id
}

export function accuracy(stat: { attempts: number; correct: number }): number {
  return stat.attempts === 0 ? 0 : stat.correct / stat.attempts
}

/** บันทึกผลการตอบหนึ่งข้อ (นับเฉพาะครั้งแรกของแต่ละข้อลงสถิติทักษะ) */
export function recordAnswer(
  p: Player,
  q: Question,
  levelId: number,
  firstTryCorrect: boolean,
  ms: number,
  hints: number,
): Player {
  const skills = { ...p.skills }
  const s = skills[q.skill]
  skills[q.skill] = { attempts: s.attempts + 1, correct: s.correct + (firstTryCorrect ? 1 : 0), timeMs: s.timeMs + ms }
  const streak = firstTryCorrect ? p.streak + 1 : 0
  let mistakes = p.mistakes
  if (!firstTryCorrect && levelId >= 0) {
    mistakes = [
      ...p.mistakes,
      { at: Date.now(), levelId, gen: q.gen, difficulty: q.difficulty, skill: q.skill, title: q.title },
    ].slice(-60)
  }
  return {
    ...p,
    skills,
    streak,
    bestStreak: Math.max(p.bestStreak, streak),
    mistakes,
    hintsUsed: p.hintsUsed + hints,
    answered: p.answered + 1,
    totalTimeMs: p.totalTimeMs + ms,
    lastPlayed: Date.now(),
  }
}

/** ตราที่ควรได้จากสถานะปัจจุบัน (คืนเฉพาะตราใหม่) */
export function newBadges(p: Player, extra: string[] = []): string[] {
  const earned = new Set(p.badges)
  const want: string[] = [...extra]
  for (const b of LEVEL_BADGES) {
    const id = Number(b.id.replace('level-', ''))
    if (isLevelPassed(p, id)) want.push(b.id)
  }
  if (p.preTest) want.push('pretest')
  if (p.postTest) want.push('posttest')
  if (p.preTest && p.postTest && p.postTest.score / Math.max(1, p.postTest.total) > p.preTest.score / Math.max(1, p.preTest.total)) want.push('improver')
  if (p.bestStreak >= 5) want.push('streak5')
  if (p.bestStreak >= 10) want.push('streak10')
  if (totalStars(p) >= 15) want.push('stars-15')
  if (Object.values(p.levels).some((l) => l.bestStars >= 3)) want.push('perfect')
  if (p.coins >= 300) want.push('coins-300')
  if (p.mapCoins.length >= 15) want.push('explorer')
  if (p.fixedMistakes >= 5) want.push('comeback')
  if (p.owned.length >= 1) want.push('shopper')
  if (p.daily.best >= 3) want.push('daily3')
  if (p.questsDone >= 4) want.push('helper')
  if (p.goalsDone >= 1) want.push('saver')
  if (p.eco.days >= 1) want.push('eco-seller')
  if (p.changeBest >= 8) want.push('quick-change')
  if (ecoStage(p.eco).stage >= 3) want.push('eco-garden')
  if ((p.chests ?? []).length >= 5) want.push('treasure')
  if (Object.values(p.plan?.best ?? {}).filter((s) => s > 0).length >= 3) want.push('planner')
  if ((p.album ?? []).length >= 11) want.push('collector')
  if (Object.entries(p.stages ?? {}).filter(([k, r]) => k.endsWith('-3') && r.stars > 0).length >= 3) want.push('challenger')
  return Array.from(new Set(want)).filter((id) => !earned.has(id))
}

/** ทักษะที่ยังอ่อน (ต่ำกว่า 70% และเคยทำอย่างน้อย 3 ข้อ) */
export function weakSkills(p: Player): Skill[] {
  return SKILLS.filter((s) => p.skills[s].attempts >= 3 && accuracy(p.skills[s]) < 0.7)
}

export function overallAccuracy(p: Player): number {
  const totals = SKILLS.reduce(
    (acc, s) => ({ attempts: acc.attempts + p.skills[s].attempts, correct: acc.correct + p.skills[s].correct }),
    { attempts: 0, correct: 0 },
  )
  return accuracy(totals)
}

/* ------------------------------------------------------------------ */
/* แบบทดสอบก่อน/หลังเรียน                                               */
/* ------------------------------------------------------------------ */

export type TestKind = 'pre' | 'post'

/** แบบทดสอบหลังเรียนเปิดเมื่อผ่านด่านสุดท้าย (FINAL MONEY MASTER) */
export const POST_TEST_AFTER = 12

export function canTakePostTest(p: Player): boolean {
  return isLevelPassed(p, POST_TEST_AFTER)
}

/** รางวัลทำแบบทดสอบ (ได้ครั้งแรกครั้งเดียว ทำซ้ำไม่ได้เพิ่ม จะได้ไม่ทำเพื่อปั๊มแต้ม) */
export const TEST_REWARD: Record<TestKind, { exp: number; coins: number }> = {
  pre: { exp: 30, coins: 10 },
  post: { exp: 60, coins: 20 },
}

/** สรุปผลแบบทดสอบจากผลการทำโจทย์ */
export function testResultFrom(
  run: { firstTry: number; originals: number; ms: number; bySkill: Record<string, { correct: number; total: number }> },
  now = Date.now(),
): TestResult {
  const skills = emptyTestSkills()
  for (const s of SKILLS) {
    const b = run.bySkill[s]
    if (b) skills[s] = { correct: b.correct, total: b.total }
  }
  return { score: run.firstTry, total: run.originals, timeMs: run.ms, at: now, skills }
}

/** บันทึกผลแบบทดสอบ พร้อมรางวัลครั้งแรก */
export function recordTest(p: Player, kind: TestKind, result: TestResult): Player {
  const first = kind === 'pre' ? !p.preTest : !p.postTest
  const reward = first ? TEST_REWARD[kind] : { exp: 0, coins: 0 }
  const paid = earn(p, reward.coins, kind === 'pre' ? 'รางวัลแบบทดสอบก่อนเรียน' : 'รางวัลแบบทดสอบหลังเรียน', kind === 'pre' ? '🧭' : '🎓')
  return {
    ...paid,
    exp: p.exp + reward.exp,
    ...(kind === 'pre' ? { preTest: result } : { postTest: result }),
  }
}

/* ------------------------------------------------------------------ */
/* ฝึกข้อที่เคยผิด                                                      */
/* ------------------------------------------------------------------ */

/** ข้อที่เคยผิดและยังไม่ได้ฝึกจนถูก (แบบโจทย์ละ 1 ข้อ ล่าสุดก่อน) */
export function pendingMistakes(p: Player, max = 8): Mistake[] {
  const seen = new Set<string>()
  const out: Mistake[] = []
  for (let i = p.mistakes.length - 1; i >= 0 && out.length < max; i -= 1) {
    const m = p.mistakes[i]
    if (m.fixed || seen.has(m.gen)) continue
    seen.add(m.gen)
    out.push(m)
  }
  return out
}

/** ตอบโจทย์แบบนี้ถูกแล้ว ทำเครื่องหมายว่าแก้ได้ทุกข้อที่เป็นแบบเดียวกัน */
export function markMistakeFixed(p: Player, gen: string): Player {
  if (!p.mistakes.some((m) => m.gen === gen && !m.fixed)) return p
  return { ...p, mistakes: p.mistakes.map((m) => (m.gen === gen && !m.fixed ? { ...m, fixed: true } : m)) }
}

/* ------------------------------------------------------------------ */
/* ร้านของฮีโร่                                                        */
/* ------------------------------------------------------------------ */

export type BuyResult = { ok: true; player: Player; left: number } | { ok: false; reason: 'unknown' | 'owned' | 'short'; short: number }

/** ซื้อของ: ตัดเหรียญ เพิ่มเข้าคลัง แล้วสวมให้ทันที */
export function buyItem(p: Player, id: string): BuyResult {
  const item = shopItem(id)
  if (!item) return { ok: false, reason: 'unknown', short: 0 }
  if (p.owned.includes(id)) return { ok: false, reason: 'owned', short: 0 }
  if (p.coins < item.price) return { ok: false, reason: 'short', short: item.price - p.coins }
  const paid = earn(p, -item.price, `ซื้อ${item.name}`, item.icon)
  const reached = p.goal === id
  return {
    ok: true,
    left: paid.coins,
    player: {
      ...paid,
      owned: [...p.owned, id],
      wear: { ...p.wear, [item.slot]: id },
      goal: reached ? undefined : p.goal,
      goalsDone: p.goalsDone + (reached ? 1 : 0),
    },
  }
}

/** ตั้ง/ยกเลิกเป้าหมายการออม (ของที่มีแล้วตั้งไม่ได้) */
export function setGoal(p: Player, id: string | undefined): Player {
  if (id !== undefined && (!shopItem(id) || p.owned.includes(id))) return p
  return { ...p, goal: id }
}

/** สวม/ถอดของที่มีอยู่แล้ว (ของที่ยังไม่ได้ซื้อ สวมไม่ได้) */
export function toggleWear(p: Player, id: string): Player {
  const item = shopItem(id)
  if (!item || !p.owned.includes(id)) return p
  const wear = { ...p.wear }
  if (wear[item.slot] === id) delete wear[item.slot]
  else wear[item.slot] = id
  return { ...p, wear }
}
