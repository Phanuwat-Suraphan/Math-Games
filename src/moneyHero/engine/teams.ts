import type { Player } from './progress'
import { compareStudents } from './classroom'
import { overallAccuracy } from './progress'

/**
 * กลุ่มทำกิจกรรม: ครูกำหนดเองรายคน หรือให้ระบบจัดกลุ่มคละความสามารถ
 * (เรียงตามคะแนนก่อนเรียน แล้วแจกแบบงูเลื้อย ทุกกลุ่มมีทั้งคนเก่งและคนที่ต้องช่วย)
 * ผลการทำภารกิจกลุ่มบันทึกแยกให้นักเรียนแต่ละคน
 */

export function teamOf(p: Player): string {
  return p.student?.team ?? ''
}

export interface Team {
  team: string
  members: Player[]
}

/** กลุ่มทั้งหมดของห้อง เรียงตามเลขกลุ่ม สมาชิกเรียงตามเลขที่ */
export function teamList(players: Player[]): Team[] {
  const map = new Map<string, Player[]>()
  for (const p of players) {
    const t = teamOf(p)
    if (!t) continue
    map.set(t, [...(map.get(t) ?? []), p])
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b, 'th', { numeric: true }))
    .map(([team, members]) => ({ team, members: members.sort(compareStudents) }))
}

/** คะแนนที่ใช้คละความสามารถ (0–1): ก่อนเรียน ถ้าไม่มีใช้ร้อยละตอบถูกในเกม ถ้าไม่มีอีกถือว่ากลาง ๆ */
export function abilityScore(p: Player): number {
  if (p.preTest && p.preTest.total > 0) return p.preTest.score / p.preTest.total
  if (p.answered >= 5) return overallAccuracy(p)
  return 0.5
}

/**
 * จัดกลุ่มคละความสามารถ: กลุ่มละไม่เกิน size คน
 * คืน รหัสผู้เล่น → เลขกลุ่ม ('1', '2', ...)
 */
export function autoTeams(players: Player[], size: number): Record<string, string> {
  const list = [...players].sort((a, b) => abilityScore(b) - abilityScore(a) || compareStudents(a, b))
  const groups = Math.max(1, Math.ceil(list.length / Math.max(2, size)))
  const out: Record<string, string> = {}
  list.forEach((p, i) => {
    const round = Math.floor(i / groups)
    const pos = i % groups
    out[p.id] = String((round % 2 === 0 ? pos : groups - 1 - pos) + 1)
  })
  return out
}

/** ใส่เลขกลุ่มให้ผู้เล่นในทะเบียน ('' = เอาออกจากกลุ่ม) */
export function applyTeams(players: Record<string, Player>, map: Record<string, string>): Record<string, Player> {
  const out = { ...players }
  for (const [id, team] of Object.entries(map)) {
    const p = out[id]
    if (!p?.student) continue
    const student = { ...p.student }
    if (team) student.team = team
    else delete student.team
    out[id] = { ...p, student }
  }
  return out
}
