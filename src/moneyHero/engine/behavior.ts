import type { Player } from './progress'

/**
 * แบบสังเกตพฤติกรรมการเรียนรู้เชิงรุก (ครูบันทึกในเกม หรือพิมพ์ไปกรอกบนกระดาษ)
 * 4 ด้าน ด้านละ 1–4 คะแนน รวม 16 คะแนน แปลเป็น 4 ระดับ ดีเยี่ยม ดี พอใช้ ควรปรับปรุง
 */

export const BEHAVIOR_CRITERIA: { name: string; levels: [string, string, string, string] }[] = [
  {
    name: 'ความร่วมมือในกลุ่ม',
    levels: ['ช่วยเพื่อนและรับฟังทุกคนตลอดกิจกรรม', 'ช่วยเพื่อนและรับฟังเป็นส่วนใหญ่', 'ร่วมมือเมื่อมีคนชวน', 'ไม่ค่อยร่วมทำกับกลุ่ม'],
  },
  {
    name: 'การอธิบายวิธีคิด',
    levels: ['อธิบายวิธีคิดเรื่องเงินได้ชัดเจนและถูกต้อง', 'อธิบายได้ถูกต้องเป็นส่วนใหญ่', 'อธิบายได้บางส่วนเมื่อครูถาม', 'ยังอธิบายวิธีคิดไม่ได้'],
  },
  {
    name: 'ความรับผิดชอบ',
    levels: ['ทำหน้าที่ของตนครบ ตรงเวลา และช่วยงานกลุ่ม', 'ทำหน้าที่ของตนครบ', 'ทำหน้าที่ได้บางส่วน', 'ต้องเตือนบ่อยครั้ง'],
  },
  {
    name: 'การคิดแก้ปัญหา',
    levels: ['ตรวจคำตอบเองและหาวิธีใหม่เมื่อผิด', 'แก้ไขเมื่อรู้ว่าผิด', 'แก้ไขได้เมื่อมีคนช่วย', 'ยังไม่แก้ไขเมื่อผิด'],
  },
]

export const BEHAVIOR_LEVELS = ['ดีเยี่ยม', 'ดี', 'พอใช้', 'ควรปรับปรุง'] as const
export type BehaviorLevel = (typeof BEHAVIOR_LEVELS)[number]

/** คะแนนเต็มรวม */
export const BEHAVIOR_FULL = BEHAVIOR_CRITERIA.length * 4

/** ระดับคุณภาพจากคะแนนรวม 4 ด้าน (เต็ม 16) */
export function behaviorLevel(total: number): BehaviorLevel {
  if (total >= 14) return 'ดีเยี่ยม'
  if (total >= 11) return 'ดี'
  if (total >= 8) return 'พอใช้'
  return 'ควรปรับปรุง'
}

/** คะแนนแต่ละด้าน 1–4 (0 = ยังไม่ได้ประเมินด้านนั้น) */
export interface BehaviorRecord {
  at: number
  scores: number[]
  note?: string
}

export function repairBehavior(raw: unknown): BehaviorRecord | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const r = raw as Partial<Record<keyof BehaviorRecord, unknown>>
  if (!Array.isArray(r.scores)) return undefined
  const scores = BEHAVIOR_CRITERIA.map((_, i) => {
    const v = Number((r.scores as unknown[])[i])
    return Number.isInteger(v) && v >= 1 && v <= 4 ? v : 0
  })
  const note = typeof r.note === 'string' ? r.note.trim().slice(0, 200) : ''
  if (scores.every((s) => s === 0) && !note) return undefined
  return { at: typeof r.at === 'number' && Number.isFinite(r.at) ? r.at : 0, scores, ...(note ? { note } : {}) }
}

/** ประเมินครบทุกด้านแล้วหรือยัง */
export function behaviorComplete(b: BehaviorRecord | undefined): b is BehaviorRecord {
  return !!b && b.scores.length === BEHAVIOR_CRITERIA.length && b.scores.every((s) => s >= 1 && s <= 4)
}

export function behaviorTotal(b: BehaviorRecord | undefined): number | null {
  return behaviorComplete(b) ? b.scores.reduce((a, s) => a + s, 0) : null
}

/** ตั้งคะแนนด้านหนึ่ง (0 = ล้างด้านนั้น) ล้างครบทุกด้านแล้วลบบันทึกทิ้ง */
export function setBehaviorScore(p: Player, criterion: number, score: number, now = Date.now()): Player {
  if (criterion < 0 || criterion >= BEHAVIOR_CRITERIA.length) return p
  const s = Number.isInteger(score) && score >= 1 && score <= 4 ? score : 0
  const scores = BEHAVIOR_CRITERIA.map((_, i) => p.behavior?.scores[i] ?? 0)
  scores[criterion] = s
  if (scores.every((v) => v === 0)) {
    const rest = { ...p }
    delete rest.behavior
    return rest
  }
  return { ...p, behavior: { ...(p.behavior ?? {}), at: now, scores } }
}

export function setBehaviorNote(p: Player, note: string, now = Date.now()): Player {
  const text = note.slice(0, 200)
  const scores = BEHAVIOR_CRITERIA.map((_, i) => p.behavior?.scores[i] ?? 0)
  if (!text.trim() && scores.every((v) => v === 0)) {
    const rest = { ...p }
    delete rest.behavior
    return rest
  }
  return { ...p, behavior: { at: now, scores, ...(text.trim() ? { note: text } : {}) } }
}

export interface BehaviorSummary {
  /** จำนวนคนที่ประเมินครบ */
  assessed: number
  /** ค่าเฉลี่ยรายด้าน (1–4) */
  criteria: (number | null)[]
  /** คะแนนรวมเฉลี่ย (เต็ม 16) */
  mean: number | null
  levels: Record<BehaviorLevel, number>
  /** ร้อยละของคนที่ได้ระดับ ดี ขึ้นไป */
  goodUp: number | null
}

export function behaviorSummary(players: Player[]): BehaviorSummary {
  const done = players.map((p) => p.behavior).filter(behaviorComplete)
  const levels = Object.fromEntries(BEHAVIOR_LEVELS.map((l) => [l, 0])) as Record<BehaviorLevel, number>
  for (const b of done) levels[behaviorLevel(behaviorTotal(b)!)] += 1
  const n = done.length
  return {
    assessed: n,
    criteria: BEHAVIOR_CRITERIA.map((_, i) => (n === 0 ? null : done.reduce((s, b) => s + b.scores[i], 0) / n)),
    mean: n === 0 ? null : done.reduce((s, b) => s + behaviorTotal(b)!, 0) / n,
    levels,
    goodUp: n === 0 ? null : ((levels['ดีเยี่ยม'] + levels['ดี']) / n) * 100,
  }
}

/** รวมสองเครื่อง: บันทึกที่ใหม่กว่าชนะ */
export function mergeBehavior(a: BehaviorRecord | undefined, b: BehaviorRecord | undefined): BehaviorRecord | undefined {
  if (!a) return b
  if (!b) return a
  return b.at > a.at ? b : a
}
