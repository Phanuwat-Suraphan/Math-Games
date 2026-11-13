import type { Skill } from './types'
import type { Player, TestResult } from './progress'
import type { Classroom } from './classroom'
import { SKILLS } from '../data/characters'
import { compareStudents } from './classroom'
import { MISSION_GROUPS, groupSummary, strongWeakGroups, type MissionGroup } from './activity'
import { hasPlayed } from './roster'
import { passedResult } from './report'
import { weakSkills } from './progress'

/**
 * สถิติสำหรับวิเคราะห์ผลการใช้นวัตกรรม (ว.PA)
 *
 * - ค่าเฉลี่ย ส่วนเบี่ยงเบนมาตรฐาน (หาร n − 1 แบบกลุ่มตัวอย่าง) ร้อยละ
 * - เทียบก่อน–หลังเรียนด้วย t-test แบบไม่อิสระ (paired) ทางเดียว: หลังเรียนสูงกว่าก่อนเรียน
 * - ดัชนีประสิทธิผล (E.I.) และประสิทธิภาพ E1/E2
 * - คิดเฉพาะนักเรียนที่มีข้อมูลจริง และบอกจำนวน n ทุกครั้ง ไม่เดาค่าที่ไม่มี
 */

export interface Describe {
  n: number
  mean: number | null
  /** ส่วนเบี่ยงเบนมาตรฐาน (n − 1) null เมื่อ n < 2 */
  sd: number | null
  min: number | null
  max: number | null
}

export function describe(xs: number[]): Describe {
  const n = xs.length
  if (n === 0) return { n, mean: null, sd: null, min: null, max: null }
  const mean = xs.reduce((a, b) => a + b, 0) / n
  const sd = n < 2 ? null : Math.sqrt(xs.reduce((s, x) => s + (x - mean) ** 2, 0) / (n - 1))
  return { n, mean, sd, min: Math.min(...xs), max: Math.max(...xs) }
}

/** ปัดทศนิยม 2 ตำแหน่งแบบรายงาน */
export function round2(v: number): number {
  return Math.round(v * 100) / 100
}

/* ------------------------------------------------------------------ */
/* การแจกแจง t (คำนวณค่า p โดยไม่ต้องเปิดตาราง)                          */
/* ------------------------------------------------------------------ */

function logGamma(x: number): number {
  // Lanczos
  const g = 7
  const c = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7]
  if (x < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * x)) - logGamma(1 - x)
  x -= 1
  let a = c[0]
  const t = x + g + 0.5
  for (let i = 1; i < g + 2; i += 1) a += c[i] / (x + i)
  return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a)
}

function betaCf(a: number, b: number, x: number): number {
  const EPS = 1e-14
  const TINY = 1e-300
  let c = 1
  let d = 1 - ((a + b) * x) / (a + 1)
  if (Math.abs(d) < TINY) d = TINY
  d = 1 / d
  let h = d
  for (let m = 1; m <= 300; m += 1) {
    const m2 = 2 * m
    let aa = (m * (b - m) * x) / ((a + m2 - 1) * (a + m2))
    d = 1 + aa * d
    if (Math.abs(d) < TINY) d = TINY
    c = 1 + aa / c
    if (Math.abs(c) < TINY) c = TINY
    d = 1 / d
    h *= d * c
    aa = (-(a + m) * (a + b + m) * x) / ((a + m2) * (a + m2 + 1))
    d = 1 + aa * d
    if (Math.abs(d) < TINY) d = TINY
    c = 1 + aa / c
    if (Math.abs(c) < TINY) c = TINY
    d = 1 / d
    const del = d * c
    h *= del
    if (Math.abs(del - 1) < EPS) break
  }
  return h
}

/** ฟังก์ชันบีตาไม่สมบูรณ์แบบปรับมาตรฐาน I_x(a, b) */
export function incBeta(x: number, a: number, b: number): number {
  if (x <= 0) return 0
  if (x >= 1) return 1
  const front = Math.exp(logGamma(a + b) - logGamma(a) - logGamma(b) + a * Math.log(x) + b * Math.log(1 - x))
  return x < (a + 1) / (a + b + 2) ? (front * betaCf(a, b, x)) / a : 1 - (front * betaCf(b, a, 1 - x)) / b
}

/** P(T > t) ของการแจกแจง t ที่องศาอิสระ df */
export function tUpper(t: number, df: number): number {
  if (!Number.isFinite(t)) return t > 0 ? 0 : 1
  const tail = 0.5 * incBeta(df / (df + t * t), df / 2, 0.5)
  return t >= 0 ? tail : 1 - tail
}

export interface PairedT {
  n: number
  /** ผลต่างเฉลี่ย (หลัง − ก่อน) */
  meanDiff: number | null
  sdDiff: number | null
  t: number | null
  df: number
  /** ค่า p ทางเดียว (H1: หลังเรียนสูงกว่าก่อนเรียน) */
  p: number | null
  /** มีนัยสำคัญที่ระดับ .05 / .01 */
  sig05: boolean
  sig01: boolean
}

/** t-test แบบไม่อิสระ (Dependent / Paired samples) ทางเดียว */
export function pairedT(pre: number[], post: number[]): PairedT {
  const n = Math.min(pre.length, post.length)
  const diffs = Array.from({ length: n }, (_, i) => post[i] - pre[i])
  const d = describe(diffs)
  const df = Math.max(0, n - 1)
  let t: number | null = null
  let p: number | null = null
  if (n >= 2 && d.mean !== null && d.sd !== null) {
    // ทศนิยมของเครื่องทำให้ S.D. ไม่เป็น 0 พอดีแม้ทุกคนเพิ่มเท่ากัน ถือว่าเป็น 0
    if (d.sd < 1e-9 * Math.max(1, Math.abs(d.mean))) {
      // ทุกคนเพิ่มเท่ากัน: ถ้าเพิ่มขึ้นถือว่าต่างอย่างชัดเจน ถ้าไม่เปลี่ยนเลยไม่มีหลักฐาน
      t = d.mean === 0 ? 0 : d.mean > 0 ? Infinity : -Infinity
    } else {
      t = d.mean / (d.sd / Math.sqrt(n))
    }
    p = tUpper(t, df)
  }
  return { n, meanDiff: d.mean, sdDiff: d.sd, t, df, p, sig05: p !== null && p < 0.05, sig01: p !== null && p < 0.01 }
}

/**
 * ดัชนีประสิทธิผล (Goodman, Fletcher & Schneider)
 * E.I. = (ผลรวมคะแนนหลังเรียน − ผลรวมคะแนนก่อนเรียน) / (จำนวนนักเรียน × คะแนนเต็ม − ผลรวมคะแนนก่อนเรียน)
 * คิดจากร้อยละ (คะแนนเต็ม 100) จึงใช้ได้แม้ชุดข้อสอบมีจำนวนข้อต่างกัน ถ้าคะแนนเต็มเท่ากันได้ค่าเดียวกับคิดจากคะแนนดิบ
 */
export function effectivenessIndex(prePct: number[], postPct: number[]): number | null {
  const n = Math.min(prePct.length, postPct.length)
  if (n === 0) return null
  const sPre = prePct.slice(0, n).reduce((a, b) => a + b, 0)
  const sPost = postPct.slice(0, n).reduce((a, b) => a + b, 0)
  const room = n * 100 - sPre
  if (room <= 0) return null
  return (sPost - sPre) / room
}

/* ------------------------------------------------------------------ */
/* ระดับคุณภาพของคะแนน                                                   */
/* ------------------------------------------------------------------ */

export const SCORE_LEVELS = [
  { id: 'excellent', name: 'ดีเยี่ยม', min: 80 },
  { id: 'good', name: 'ดี', min: 70 },
  { id: 'fair', name: 'พอใช้', min: 60 },
  { id: 'improve', name: 'ควรปรับปรุง', min: 0 },
] as const

export type ScoreLevel = (typeof SCORE_LEVELS)[number]['id']

export function scoreLevel(pct: number): (typeof SCORE_LEVELS)[number] {
  return SCORE_LEVELS.find((l) => pct >= l.min) ?? SCORE_LEVELS[SCORE_LEVELS.length - 1]
}

/** ร้อยละของแบบทดสอบ (ไม่ปัด) */
export function pctOf(t: TestResult): number {
  return t.total > 0 ? (t.score / t.total) * 100 : 0
}

/** คะแนนเต็มที่ใช้ร่วมกัน (null ถ้าแต่ละคนได้ข้อสอบจำนวนข้อไม่เท่ากัน) */
function commonFull(results: TestResult[]): number | null {
  const totals = new Set(results.map((r) => r.total))
  return totals.size === 1 ? results[0].total : null
}

/** ร้อยละกระบวนการ (ทำภารกิจระหว่างเรียน) ของนักเรียนหนึ่งคน */
export function processPercent(p: Player): number | null {
  let c = 0
  let t = 0
  for (const st of Object.values(p.acts ?? {})) {
    if (st.group === 'other') continue
    c += st.correct
    t += st.total
  }
  return t === 0 ? null : (c / t) * 100
}

/* ------------------------------------------------------------------ */
/* วิเคราะห์ทั้งห้อง                                                      */
/* ------------------------------------------------------------------ */

export interface TestDescribe extends Describe {
  /** คะแนนเต็ม (ถ้าทุกคนเท่ากัน) ใช้แสดงค่าเฉลี่ยเป็นคะแนนดิบ */
  full: number | null
  /** ค่าเฉลี่ยและ S.D. เป็นคะแนนดิบ (มีเมื่อคะแนนเต็มเท่ากันทุกคน) */
  rawMean: number | null
  rawSd: number | null
}

function describeTests(results: TestResult[]): TestDescribe {
  const d = describe(results.map(pctOf))
  const full = results.length > 0 ? commonFull(results) : null
  const raw = full === null ? null : describe(results.map((r) => r.score))
  return { ...d, full, rawMean: raw?.mean ?? null, rawSd: raw?.sd ?? null }
}

export interface Remedial {
  player: Player
  /** เหตุผลที่ควรซ่อมเสริม */
  reason: 'post-below' | 'pre-below' | 'process-below'
  /** ร้อยละที่ใช้ตัดสิน */
  percent: number
  weakSkills: Skill[]
  weakGroups: MissionGroup[]
}

export interface ClassAnalysis {
  total: number
  preDone: number
  played: number
  postDone: number
  bothDone: number
  pre: TestDescribe
  post: TestDescribe
  /** เฉพาะคนที่ทำครบทั้งสองครั้ง */
  pairedPre: Describe
  pairedPost: Describe
  t: PairedT
  ei: number | null
  /** พัฒนาการเฉลี่ย (จุดร้อยละ) */
  gain: number | null
  /** ร้อยละของคนที่คะแนนหลังเรียนสูงขึ้น */
  improvedCount: number
  /** ผ่านเกณฑ์หลังเรียน */
  passed: number
  /** ร้อยละผ่านเกณฑ์ เทียบกับนักเรียนทั้งห้อง */
  passRate: number | null
  /** ร้อยละผ่านเกณฑ์ เทียบกับคนที่ทำหลังเรียนแล้ว */
  passRateTaken: number | null
  targetMet: boolean | null
  /** E1 ร้อยละเฉลี่ยของภารกิจระหว่างเรียน · E2 ร้อยละเฉลี่ยหลังเรียน */
  e1: Describe
  e2: number | null
  /** จำนวนคนในแต่ละระดับคุณภาพ ก่อน / หลังเรียน */
  levels: Record<ScoreLevel, { pre: number; post: number }>
  /** ร้อยละถูกรายทักษะ ก่อน / หลังเรียน (ทั้งห้อง รวมทุกข้อ) */
  skills: Record<Skill, { pre: number | null; post: number | null }>
  /** ภาพรวมรายกลุ่มภารกิจ */
  groups: Record<MissionGroup, { players: number; plays: number; correct: number; total: number; percent: number | null; below: number }>
  remedial: Remedial[]
  /** ยังไม่ได้ทำ (ไว้ตามงาน) */
  missingPre: Player[]
  missingPost: Player[]
}

function skillPct(results: TestResult[], s: Skill): number | null {
  let c = 0
  let t = 0
  for (const r of results) {
    const v = r.skills[s]
    if (!v) continue
    c += v.correct
    t += v.total
  }
  return t === 0 ? null : (c / t) * 100
}

export function analyzeClass(players: Player[], c: Pick<Classroom, 'passPercent' | 'targetPercent'>): ClassAnalysis {
  const list = [...players].sort(compareStudents)
  const pres = list.flatMap((p) => (p.preTest ? [p.preTest] : []))
  const posts = list.flatMap((p) => (p.postTest ? [p.postTest] : []))
  const both = list.filter((p) => p.preTest && p.postTest)
  const prePct = both.map((p) => pctOf(p.preTest!))
  const postPct = both.map((p) => pctOf(p.postTest!))
  const passed = list.filter((p) => p.postTest && passedResult(p.postTest, c.passPercent)).length
  const total = list.length
  const passRate = total === 0 ? null : (passed / total) * 100

  const levels = {} as ClassAnalysis['levels']
  for (const l of SCORE_LEVELS) levels[l.id] = { pre: 0, post: 0 }
  for (const r of pres) levels[scoreLevel(pctOf(r)).id].pre += 1
  for (const r of posts) levels[scoreLevel(pctOf(r)).id].post += 1

  const skills = {} as ClassAnalysis['skills']
  for (const s of SKILLS) skills[s] = { pre: skillPct(pres, s), post: skillPct(posts, s) }

  const groups = {} as ClassAnalysis['groups']
  for (const g of MISSION_GROUPS) groups[g.id] = { players: 0, plays: 0, correct: 0, total: 0, percent: null, below: 0 }
  for (const p of list) {
    for (const g of Object.values(groupSummary(p))) {
      if (g.plays === 0) continue
      const row = groups[g.group]
      row.players += 1
      row.plays += g.plays
      row.correct += g.correct
      row.total += g.total
      if (g.total >= 3 && g.percent !== null && g.percent < c.passPercent) row.below += 1
    }
  }
  for (const g of Object.values(groups)) g.percent = g.total === 0 ? null : (g.correct / g.total) * 100

  const remedial: Remedial[] = []
  for (const p of list) {
    const extra = { weakSkills: weakSkills(p), weakGroups: strongWeakGroups(p, c.passPercent).weak }
    if (p.postTest) {
      if (!passedResult(p.postTest, c.passPercent)) remedial.push({ player: p, reason: 'post-below', percent: pctOf(p.postTest), ...extra })
    } else if (p.preTest && !passedResult(p.preTest, c.passPercent)) {
      remedial.push({ player: p, reason: 'pre-below', percent: pctOf(p.preTest), ...extra })
    } else {
      const proc = processPercent(p)
      const answered = Object.values(p.acts ?? {}).reduce((s, a) => s + a.total, 0)
      if (proc !== null && answered >= 10 && proc < c.passPercent) remedial.push({ player: p, reason: 'process-below', percent: proc, ...extra })
    }
  }
  remedial.sort((a, b) => a.percent - b.percent || compareStudents(a.player, b.player))

  const e1 = describe(list.map(processPercent).filter((v): v is number => v !== null))
  const pairedPost = describe(postPct)
  const pairedPre = describe(prePct)

  return {
    total,
    preDone: pres.length,
    played: list.filter(hasPlayed).length,
    postDone: posts.length,
    bothDone: both.length,
    pre: describeTests(pres),
    post: describeTests(posts),
    pairedPre,
    pairedPost,
    t: pairedT(prePct, postPct),
    ei: effectivenessIndex(prePct, postPct),
    gain: pairedPost.mean === null || pairedPre.mean === null ? null : pairedPost.mean - pairedPre.mean,
    improvedCount: both.filter((_, i) => postPct[i] > prePct[i]).length,
    passed,
    passRate,
    passRateTaken: posts.length === 0 ? null : (passed / posts.length) * 100,
    targetMet: posts.length === 0 || passRate === null ? null : passRate >= c.targetPercent,
    e1,
    e2: describe(posts.map(pctOf)).mean,
    levels,
    skills,
    groups,
    remedial,
    missingPre: list.filter((p) => !p.preTest),
    missingPost: list.filter((p) => !p.postTest),
  }
}

/** ค่าทศนิยม 2 ตำแหน่ง หรือขีด */
export function f2(v: number | null | undefined): string {
  return v === null || v === undefined || !Number.isFinite(v) ? '–' : v.toFixed(2)
}

/** ค่า p แบบรายงาน (.000 → < .001) */
export function pText(p: number | null): string {
  if (p === null) return '–'
  if (p < 0.001) return '< .001'
  return p.toFixed(3).replace(/^0/, '')
}

/** ค่า t แบบรายงาน */
export function tText(t: number | null): string {
  if (t === null) return '–'
  if (!Number.isFinite(t)) return t > 0 ? 'สูงมาก (ทุกคนเพิ่มเท่ากัน)' : '–'
  return t.toFixed(2)
}

/** คำอธิบายผล t-test ภาษาครู */
export function tSummary(r: PairedT): string {
  if (r.n < 2 || r.p === null) return 'ต้องมีนักเรียนทำทั้งก่อนและหลังเรียนอย่างน้อย 2 คน จึงทดสอบได้'
  if (r.sig01) return 'คะแนนหลังเรียนสูงกว่าก่อนเรียนอย่างมีนัยสำคัญทางสถิติที่ระดับ .01'
  if (r.sig05) return 'คะแนนหลังเรียนสูงกว่าก่อนเรียนอย่างมีนัยสำคัญทางสถิติที่ระดับ .05'
  return 'คะแนนหลังเรียนยังไม่สูงกว่าก่อนเรียนอย่างมีนัยสำคัญทางสถิติ'
}

export const REMEDIAL_REASON: Record<Remedial['reason'], string> = {
  'post-below': 'หลังเรียนต่ำกว่าเกณฑ์',
  'pre-below': 'ก่อนเรียนต่ำกว่าเกณฑ์ (ยังไม่ทำหลังเรียน)',
  'process-below': 'ภารกิจระหว่างเรียนต่ำกว่าเกณฑ์',
}
