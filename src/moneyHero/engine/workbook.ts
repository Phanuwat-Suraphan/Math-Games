import type { Player } from './progress'
import { SKILLS, SKILL_NAMES } from '../data/characters'
import { fullName, INNOVATION_NAME, teacherName, termLine, thaiDate, type Classroom } from './classroom'
import { FEELINGS, MISSION_GROUPS } from './activity'
import { BEHAVIOR_CRITERIA, BEHAVIOR_FULL, BEHAVIOR_LEVELS, behaviorLevel, behaviorSummary, behaviorTotal } from './behavior'
import { groupRows, logTable, passedResult, studentTable, testSkillPercent, type TableCell } from './report'
import { analyzeClass, pctOf, scoreLevel, SCORE_LEVELS, tSummary } from './stats'
import type { XSheet } from './xlsx'

/**
 * ไฟล์ Excel ของทั้งห้อง แยกชีตตามงานของครู
 * สรุป · นักเรียน · ก่อน-หลังเรียน · รายทักษะ · กลุ่มภารกิจ · บันทึกภารกิจ · พฤติกรรม · สะท้อนผล
 * ตัวเลขมาจากฟังก์ชันเดียวกับหน้าวิเคราะห์ผลและรายงาน A4 จึงตรงกันทุกที่
 */

const r2 = (v: number | null | undefined): number | null => (v === null || v === undefined || !Number.isFinite(v) ? null : Math.round(v * 100) / 100)

function who(p: Player): string {
  return p.student ? fullName(p.student) : teacherName(p)
}

function summarySheet(players: Player[], c: Classroom, now: number): XSheet {
  const a = analyzeClass(players, c)
  const b = behaviorSummary(players)
  const rows: TableCell[][] = [
    ['รายการ', 'ค่า', 'หมายเหตุ'],
    ['นวัตกรรม', INNOVATION_NAME, 'REAL Model'],
    ['โรงเรียน', c.school || null, c.area || null],
    ['ชั้น', c.room, termLine(c) || null],
    ['ครูผู้สอน', c.teacher || null, null],
    ['ข้อมูล ณ วันที่', thaiDate(now), null],
    ['เกณฑ์ผ่านรายคน (ร้อยละ)', c.passPercent, null],
    ['เป้าหมายของห้อง (ร้อยละของนักเรียน)', c.targetPercent, null],
    ['นักเรียนทั้งหมด (คน)', a.total, null],
    ['ทำแบบทดสอบก่อนเรียน (คน)', a.preDone, null],
    ['ทำภารกิจในเกม (คน)', a.played, null],
    ['ทำแบบทดสอบหลังเรียน (คน)', a.postDone, null],
    ['ทำครบทั้งก่อนและหลังเรียน (คน)', a.bothDone, null],
    ['ก่อนเรียน: ค่าเฉลี่ย (ร้อยละ)', r2(a.pre.mean), `n = ${a.pre.n}`],
    ['ก่อนเรียน: S.D. (ร้อยละ)', r2(a.pre.sd), null],
    ['หลังเรียน: ค่าเฉลี่ย (ร้อยละ)', r2(a.post.mean), `n = ${a.post.n}`],
    ['หลังเรียน: S.D. (ร้อยละ)', r2(a.post.sd), null],
    ['พัฒนาการเฉลี่ย (จุดร้อยละ)', r2(a.gain), 'เฉพาะคนที่ทำครบ'],
    ['t (แบบไม่อิสระ)', a.t.t !== null && Number.isFinite(a.t.t) ? r2(a.t.t) : a.t.t === null ? null : 'สูงมาก', `df = ${a.t.df}`],
    ['p (ทางเดียว)', a.t.p === null ? null : Math.round(a.t.p * 10000) / 10000, tSummary(a.t)],
    ['ดัชนีประสิทธิผล (E.I.)', a.ei === null ? null : Math.round(a.ei * 10000) / 10000, null],
    ['E1 (ภารกิจระหว่างเรียน)', r2(a.e1.mean), `n = ${a.e1.n}`],
    ['E2 (หลังเรียน)', r2(a.e2), null],
    ['ผ่านเกณฑ์หลังเรียน (คน)', a.passed, null],
    ['ร้อยละผ่านเกณฑ์ (เทียบทั้งห้อง)', r2(a.passRate), a.targetMet === null ? 'รอผลหลังเรียน' : a.targetMet ? 'บรรลุเป้าหมาย' : 'ยังไม่บรรลุเป้าหมาย'],
    ['ควรซ่อมเสริม (คน)', a.remedial.length, null],
    ['ประเมินพฤติกรรมครบ (คน)', b.assessed, null],
    [`พฤติกรรมเฉลี่ย (เต็ม ${BEHAVIOR_FULL})`, r2(b.mean), b.assessed === 0 ? null : BEHAVIOR_LEVELS.map((l) => `${l} ${b.levels[l]}`).join(', ')],
  ]
  for (const l of SCORE_LEVELS) rows.push([`ระดับคุณภาพหลังเรียน: ${l.name} (คน)`, a.levels[l.id].post, `ก่อนเรียน ${a.levels[l.id].pre} คน`])
  return { name: 'สรุป', rows, widths: [40, 22, 50] }
}

function testSheet(players: Player[], c: Classroom): XSheet {
  const rows: TableCell[][] = [['เลขที่', 'ชื่อ - สกุล', 'ก่อนเรียน (คะแนน)', 'คะแนนเต็ม', 'ก่อนเรียน (%)', 'หลังเรียน (คะแนน)', 'คะแนนเต็ม', 'หลังเรียน (%)', 'ผลต่าง (จุดร้อยละ)', 'ระดับคุณภาพ', `ผล (เกณฑ์ ${c.passPercent}%)`]]
  for (const p of players) {
    const pre = p.preTest ? pctOf(p.preTest) : null
    const post = p.postTest ? pctOf(p.postTest) : null
    rows.push([
      p.student?.no ?? null,
      who(p),
      p.preTest?.score ?? null,
      p.preTest?.total ?? null,
      r2(pre),
      p.postTest?.score ?? null,
      p.postTest?.total ?? null,
      r2(post),
      pre !== null && post !== null ? r2(post - pre) : null,
      post === null ? null : scoreLevel(post).name,
      p.postTest ? (passedResult(p.postTest, c.passPercent) ? 'ผ่าน' : 'ไม่ผ่าน') : 'รอสอบ',
    ])
  }
  return { name: 'ก่อน-หลังเรียน', rows, widths: [7, 28, 10, 9, 10, 10, 9, 10, 12, 12, 12], landscape: true }
}

function skillSheet(players: Player[]): XSheet {
  const head: TableCell[] = ['เลขที่', 'ชื่อ - สกุล']
  for (const s of SKILLS) head.push(`${SKILL_NAMES[s]} ก่อน (%)`, `${SKILL_NAMES[s]} หลัง (%)`)
  const rows: TableCell[][] = [head]
  for (const p of players) {
    const row: TableCell[] = [p.student?.no ?? null, who(p)]
    for (const s of SKILLS) row.push(testSkillPercent(p.preTest, s), testSkillPercent(p.postTest, s))
    rows.push(row)
  }
  return { name: 'รายทักษะ', rows, widths: [7, 28, ...SKILLS.flatMap(() => [11, 11])], landscape: true }
}

function groupSheet(players: Player[]): XSheet {
  const head: TableCell[] = ['เลขที่', 'ชื่อ - สกุล', 'กลุ่ม']
  for (const g of MISSION_GROUPS) head.push(`${g.name} (ครั้ง)`, `${g.name} (% ถูก)`)
  const rows: TableCell[][] = [head]
  for (const p of players) {
    const row: TableCell[] = [p.student?.no ?? null, who(p), p.student?.team ?? null]
    for (const g of groupRows(p)) row.push(g.plays || null, g.percent)
    rows.push(row)
  }
  return { name: 'กลุ่มภารกิจ', rows, widths: [7, 28, 7, ...MISSION_GROUPS.flatMap(() => [10, 10])], landscape: true }
}

function behaviorSheet(players: Player[]): XSheet {
  const rows: TableCell[][] = [['เลขที่', 'ชื่อ - สกุล', 'กลุ่ม', ...BEHAVIOR_CRITERIA.map((b) => `${b.name} (4)`), `รวม (${BEHAVIOR_FULL})`, 'ระดับ', 'บันทึกของครู']]
  for (const p of players) {
    const total = behaviorTotal(p.behavior)
    rows.push([
      p.student?.no ?? null,
      who(p),
      p.student?.team ?? null,
      ...BEHAVIOR_CRITERIA.map((_, i) => p.behavior?.scores[i] || null),
      total,
      total === null ? null : behaviorLevel(total),
      p.behavior?.note ?? null,
    ])
  }
  return { name: 'พฤติกรรม', rows, widths: [7, 28, 7, 14, 14, 14, 14, 10, 12, 40], landscape: true }
}

function reflectionSheet(players: Player[]): XSheet {
  const rows: TableCell[][] = [['เลขที่', 'ชื่อ - สกุล', 'ความรู้สึก', 'สิ่งที่ทำได้ดี', 'อยากฝึกเพิ่ม', 'นำไปใช้ในชีวิตจริง', 'วันที่เขียน']]
  for (const p of players) {
    const f = p.reflection
    rows.push([p.student?.no ?? null, who(p), f ? (FEELINGS.find((x) => x.id === f.feeling)?.label ?? null) : null, f?.good || null, f?.improve || null, f?.apply || null, f ? thaiDate(f.at) : null])
  }
  return { name: 'สะท้อนผล', rows, widths: [7, 28, 14, 32, 32, 32, 18], landscape: true }
}

export function classWorkbook(players: Player[], c: Classroom, now = Date.now()): XSheet[] {
  const st = studentTable(players, c.passPercent)
  const log = logTable(players)
  return [
    summarySheet(players, c, now),
    { name: 'นักเรียน', rows: [st.header, ...st.rows], widths: st.header.map((h, i) => (i === 2 ? 28 : Math.min(18, Math.max(8, h.length * 0.9)))), landscape: true },
    testSheet(players, c),
    skillSheet(players),
    groupSheet(players),
    { name: 'บันทึกภารกิจ', rows: [log.header, ...log.rows], widths: [7, 28, 7, 17, 24, 26, 9, 10, 9, 10, 10, 10, 6, 8], landscape: true },
    behaviorSheet(players),
    reflectionSheet(players),
  ]
}

/** ชื่อไฟล์ เช่น money-hero-ป.3-1-2026-11-14.xlsx */
export function workbookFileName(c: Classroom, now = Date.now()): string {
  const d = new Date(now)
  const room = (c.room || 'ห้อง').replace(/[\\/:*?"<>|\s]+/g, '-')
  return `money-hero-${room}-${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}.xlsx`
}
