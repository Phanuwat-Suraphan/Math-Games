import type { Skill } from './types'
import { SKILLS } from '../data/characters'
import { canTakePostTest, emptyTestSkills, recordTest, type Player, type TestKind, type TestResult } from './progress'
import type { Given, Paper, TestAttempt, TestBank, TestForm, TestItem } from './testBank'

/**
 * แบบทดสอบของนักเรียนแต่ละคน: ทำได้หรือยัง บันทึกผล ครูให้ทำใหม่ และวิเคราะห์รายข้อ
 */

/** แปลงผลการทำข้อสอบเป็นผลแบบทดสอบที่ใช้ทั้งเกม (คะแนน = คะแนนที่ได้/คะแนนเต็ม · ทักษะ = ข้อถูก/จำนวนข้อ) */
export function attemptResult(a: TestAttempt): TestResult {
  const skills = emptyTestSkills()
  for (const r of a.answers) {
    const s = skills[r.skill as Skill]
    if (!s) continue
    s.total += 1
    if (r.correct) s.correct += 1
  }
  return { score: a.score, total: a.total, timeMs: a.timeMs, at: a.at, skills }
}

export function attemptsOf(p: Player, kind: TestKind): TestAttempt[] {
  return (p.tests ?? []).filter((t) => t.kind === kind).sort((a, b) => a.startedAt - b.startedAt)
}

export function latestAttempt(p: Player, kind: TestKind): TestAttempt | undefined {
  const list = attemptsOf(p, kind)
  return list[list.length - 1]
}

/** บันทึกผล (ส่งซ้ำด้วยรหัสเดิมไม่บันทึกซ้ำ) ผลล่าสุดเป็นผลที่ใช้ในรายงาน */
export function recordAttempt(p: Player, a: TestAttempt): Player {
  if ((p.tests ?? []).some((t) => t.id === a.id)) return p
  const next = recordTest(p, a.kind, attemptResult(a))
  return { ...next, tests: [...(p.tests ?? []), a], lastPlayed: Math.max(p.lastPlayed, a.at) }
}

/** ครูให้ทำใหม่แล้วและนักเรียนยังไม่ได้ทำหลังจากนั้น */
export function retakeOpen(p: Player, kind: TestKind): boolean {
  const granted = p.retake?.[kind]
  if (!granted) return false
  return !(p.tests ?? []).some((t) => t.kind === kind && t.startedAt >= granted)
}

export function grantRetake(p: Player, kind: TestKind, now = Date.now()): Player {
  return { ...p, retake: { ...(p.retake ?? {}), [kind]: now } }
}

export type TestState = 'ready' | 'done' | 'closed' | 'locked'

/**
 * ทำแบบทดสอบได้หรือไม่
 * - done: ทำแล้ว และครูตั้งให้ทำได้ครั้งเดียว (ยกเว้นครูให้ทำใหม่)
 * - closed: ครูปิดแบบทดสอบก่อนเรียนไว้
 * - locked: หลังเรียนยังไม่เปิด (ครูเปิดให้ทั้งห้อง หรือผ่านด่าน 12 ก่อน)
 */
export function testState(p: Player, form: TestForm): TestState {
  const taken = form.kind === 'pre' ? !!p.preTest : !!p.postTest
  if (taken && form.oneAttempt && !retakeOpen(p, form.kind)) return 'done'
  if (form.kind === 'pre') return form.open || retakeOpen(p, 'pre') ? 'ready' : 'closed'
  return form.open || canTakePostTest(p) || retakeOpen(p, 'post') ? 'ready' : 'locked'
}

/* ------------------------------------------------------------------ */
/* วิเคราะห์รายข้อ (ใช้ผลล่าสุดของนักเรียนแต่ละคน)                          */
/* ------------------------------------------------------------------ */

export interface ItemStat {
  id: string
  /** จำนวนนักเรียนที่ทำข้อนี้ / ตอบถูก */
  n: number
  right: number
  /** ค่าความยาก p (สัดส่วนที่ตอบถูก) */
  p: number | null
}

export function itemStats(players: Player[], form: TestForm): Record<string, ItemStat> {
  const out: Record<string, ItemStat> = {}
  for (const i of form.items) out[i.id] = { id: i.id, n: 0, right: 0, p: null }
  for (const pl of players) {
    const a = latestAttempt(pl, form.kind)
    if (!a) continue
    for (const r of a.answers) {
      const st = out[r.item]
      if (!st) continue
      st.n += 1
      if (r.correct) st.right += 1
    }
  }
  for (const st of Object.values(out)) st.p = st.n === 0 ? null : Math.round((st.right / st.n) * 100) / 100
  return out
}

/** จำนวนนักเรียนที่ทำแบบทดสอบชุดนี้แล้ว (ใช้เตือนครูก่อนแก้ข้อสอบ) */
export function takenCount(players: Player[], kind: TestKind): number {
  return players.filter((p) => attemptsOf(p, kind).length > 0).length
}

/** ร้อยละถูกรายจุดประสงค์ของทั้งห้อง (จากผลล่าสุด) */
export function skillPercentByTest(players: Player[], kind: TestKind): Record<Skill, number | null> {
  const sum = {} as Record<Skill, { c: number; t: number }>
  for (const s of SKILLS) sum[s] = { c: 0, t: 0 }
  for (const p of players) {
    const r = kind === 'pre' ? p.preTest : p.postTest
    if (!r) continue
    for (const s of SKILLS) {
      sum[s].c += r.skills[s]?.correct ?? 0
      sum[s].t += r.skills[s]?.total ?? 0
    }
  }
  const out = {} as Record<Skill, number | null>
  for (const s of SKILLS) out[s] = sum[s].t === 0 ? null : Math.round((sum[s].c / sum[s].t) * 100)
  return out
}

/* ------------------------------------------------------------------ */
/* แบบทดสอบที่ทำค้างไว้ (รีเฟรชหรือแท็บเล็ตดับ กลับมาทำต่อได้ เวลายังเดินต่อ)  */
/* ------------------------------------------------------------------ */

export const RUN_KEY = 'moneyHero.test.run'

export interface TestRun {
  player: string
  kind: TestKind
  startedAt: number
  bankAt: number
  paper: Paper
  answers: Record<string, Given>
}

export function saveRun(run: TestRun): void {
  try {
    globalThis.localStorage?.setItem(RUN_KEY, JSON.stringify(run))
  } catch {
    // บันทึกไม่ได้: ทำต่อได้แต่รีเฟรชแล้วต้องเริ่มใหม่
  }
}

/** แบบทดสอบที่ค้างของผู้เล่นคนนี้ (ข้อสอบถูกแก้ไปแล้วถือว่าใช้ไม่ได้) */
export function loadRun(player: string, kind: TestKind, bank: TestBank): TestRun | null {
  try {
    const raw = globalThis.localStorage?.getItem(RUN_KEY)
    if (!raw) return null
    const run = JSON.parse(raw) as TestRun
    if (run.player !== player || run.kind !== kind || run.bankAt !== bank.updatedAt) return null
    const ids = new Set(bank[kind].items.map((i: TestItem) => i.id))
    if (!Array.isArray(run.paper?.order) || run.paper.order.length !== ids.size || run.paper.order.some((id) => !ids.has(id))) return null
    return { ...run, answers: run.answers ?? {} }
  } catch {
    return null
  }
}

export function clearRun(): void {
  try {
    globalThis.localStorage?.removeItem(RUN_KEY)
  } catch {
    // ไม่มีที่เก็บข้อมูล
  }
}
