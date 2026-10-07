import type { Skill } from './types'
import { SKILLS, SKILL_NAMES } from '../data/characters'
import { TOTAL_LESSONS } from '../data/levels'
import {
  accuracy,
  lessonsPassed,
  overallAccuracy,
  totalStars,
  weakSkills,
  type Player,
  type TestResult,
} from './progress'

/**
 * รายงานสำหรับคุณครู และไฟล์ CSV
 */

export function percent(x: number): number {
  return Math.round(x * 100)
}

export function testPercent(t?: TestResult): number | null {
  return t ? percent(t.score / Math.max(1, t.total)) : null
}

export function improvement(p: Player): number | null {
  const pre = testPercent(p.preTest)
  const post = testPercent(p.postTest)
  return pre === null || post === null ? null : post - pre
}

export function minutes(ms: number): number {
  return Math.round(ms / 60000)
}

export function skillPercent(p: Player, s: Skill): number | null {
  const st = p.skills[s]
  return st.attempts === 0 ? null : percent(accuracy(st))
}

/** วันเวลาแบบ 2026-10-06 14:05 (ไม่ขึ้นกับภาษาของเครื่อง Excel จึงเรียงลำดับได้) */
export function dateText(ms: number): string {
  const d = new Date(ms)
  const two = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${two(d.getMonth() + 1)}-${two(d.getDate())} ${two(d.getHours())}:${two(d.getMinutes())}`
}

function csvCell(value: string | number | null): string {
  const text = value === null ? '' : String(value)
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

/** สร้างไฟล์ CSV (มี BOM ให้ Excel อ่านภาษาไทยได้) */
export function buildCsv(players: Player[]): string {
  const header = [
    'ชื่อ',
    'คะแนนรวม (EXP)',
    'เหรียญ',
    'ดาว',
    `ด่านที่ผ่าน (จาก ${TOTAL_LESSONS})`,
    'เปอร์เซ็นต์ถูก',
    'จำนวนข้อที่ทำ',
    'เวลาที่ใช้ (นาที)',
    'Pre-test (%)',
    'Post-test (%)',
    'พัฒนาการ (%)',
    'เวลา Pre-test (นาที)',
    'เวลา Post-test (นาที)',
    ...SKILLS.map((s) => `${SKILL_NAMES[s]} (%)`),
    'หัวข้อที่ยังอ่อน',
    'ข้อที่เคยผิด',
    'กาดรักษ์โลก: วันที่เล่น',
    'กาดรักษ์โลก: ยอดขายสะสม (บาท)',
    'กาดรักษ์โลก: กำไรสูงสุด (บาท)',
    'กาดรักษ์โลก: เก็บออม (บาท)',
    'กาดรักษ์โลก: บริจาคกองทุนต้นไม้ (บาท)',
    'เล่นล่าสุด',
  ]
  const rows = players.map((p) => [
    p.name,
    p.exp,
    p.coins,
    totalStars(p),
    lessonsPassed(p),
    p.answered === 0 ? null : percent(overallAccuracy(p)),
    p.answered,
    minutes(p.totalTimeMs),
    testPercent(p.preTest),
    testPercent(p.postTest),
    improvement(p),
    p.preTest ? minutes(p.preTest.timeMs) : null,
    p.postTest ? minutes(p.postTest.timeMs) : null,
    ...SKILLS.map((s) => skillPercent(p, s)),
    weakSkills(p).map((s) => SKILL_NAMES[s]).join(' / '),
    p.mistakes.length,
    p.eco.days,
    p.eco.sales / 100,
    p.eco.bestProfit / 100,
    p.eco.saved / 100,
    p.eco.donated / 100,
    dateText(p.lastPlayed),
  ])
  return '﻿' + [header, ...rows].map((r) => r.map(csvCell).join(',')).join('\r\n')
}

function average(xs: number[]): number | null {
  return xs.length === 0 ? null : Math.round(xs.reduce((a, b) => a + b, 0) / xs.length)
}

export interface ClassSummary {
  players: number
  /** เปอร์เซ็นต์ตอบถูกเฉลี่ย (เฉพาะคนที่เคยทำโจทย์) */
  accuracy: number | null
  pre: number | null
  post: number | null
  /** พัฒนาการเฉลี่ย (เฉพาะคนที่ทำครบทั้งสองแบบทดสอบ) */
  improvement: number | null
  /** กาดรักษ์โลก: จำนวนคนที่เล่นแล้ว ยอดขายรวม และเงินบริจาครวมของห้อง (บาท) */
  ecoPlayers: number
  ecoSales: number
  ecoDonated: number
  /** ค่าเฉลี่ยรายทักษะของทั้งห้อง */
  skills: Record<Skill, number | null>
  /** จำนวนนักเรียนที่ทักษะนั้นยังอ่อน */
  weakCount: Record<Skill, number>
}

/** สรุปภาพรวมทั้งห้องสำหรับแผงคุณครู */
export function classSummary(players: Player[]): ClassSummary {
  const skills = {} as Record<Skill, number | null>
  const weakCount = {} as Record<Skill, number>
  for (const s of SKILLS) {
    skills[s] = average(players.map((p) => skillPercent(p, s)).filter((v): v is number => v !== null))
    weakCount[s] = players.filter((p) => weakSkills(p).includes(s)).length
  }
  return {
    players: players.length,
    ecoPlayers: players.filter((p) => p.eco.days > 0).length,
    ecoSales: players.reduce((s, p) => s + p.eco.sales, 0) / 100,
    ecoDonated: players.reduce((s, p) => s + p.eco.donated, 0) / 100,
    accuracy: average(players.filter((p) => p.answered > 0).map((p) => percent(overallAccuracy(p)))),
    pre: average(players.map((p) => testPercent(p.preTest)).filter((v): v is number => v !== null)),
    post: average(players.map((p) => testPercent(p.postTest)).filter((v): v is number => v !== null)),
    improvement: average(players.map((p) => improvement(p)).filter((v): v is number => v !== null)),
    skills,
    weakCount,
  }
}

/** เปอร์เซ็นต์ถูกของทักษะหนึ่งในแบบทดสอบ */
export function testSkillPercent(t: TestResult | undefined, s: Skill): number | null {
  const v = t?.skills[s]
  return v && v.total > 0 ? percent(v.correct / v.total) : null
}
