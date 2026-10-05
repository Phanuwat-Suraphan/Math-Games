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
    new Date(p.lastPlayed).toLocaleString('th-TH'),
  ])
  return '﻿' + [header, ...rows].map((r) => r.map(csvCell).join(',')).join('\r\n')
}
