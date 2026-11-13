import type { Skill } from './types'
import type { Player } from './progress'

/**
 * บันทึกผลรายภารกิจ (ใช้ในขั้น E ของ REAL Model และรายงานของครู)
 *
 * - acts: สถิติรวมของแต่ละกิจกรรม (จำนวนครั้ง ถูก/ทั้งหมด ตอบผิดครั้งแรก เวลา แต้มที่ได้ ผลดีที่สุด)
 *   จำนวนกิจกรรมมีจำกัด ขนาดข้อมูลจึงไม่โตตามจำนวนครั้งที่เล่น
 * - actLog: รายการล่าสุด (เก็บไม่เกิน LOG_MAX รายการ) ไว้ดูประวัติและส่งออกเป็นไฟล์
 * ผู้เล่นหลายคน (ดวลสองคน) บันทึกแยกให้แต่ละคน ไม่ใช่คะแนนรวมของทีม
 */

export type MissionGroup = 'read' | 'price' | 'change' | 'word' | 'budget' | 'team'

export interface MissionGroupInfo {
  id: MissionGroup
  icon: string
  name: string
  /** คำอธิบายสำหรับนักเรียน */
  desc: string
  skills: Skill[]
  /** กิจกรรมที่แนะนำ (เส้นทางในเกม) */
  links: { to: string; label: string }[]
}

export const MISSION_GROUPS: MissionGroupInfo[] = [
  {
    id: 'read',
    icon: '🔍',
    name: 'อ่านและเปรียบเทียบค่าของเงิน',
    desc: 'รู้จักเหรียญ ธนบัตร บอกจำนวนเงิน เขียนแบบใช้จุด เปรียบเทียบ และแลกเงิน',
    skills: ['notes', 'count', 'dot', 'compare', 'exchange'],
    links: [
      { to: '/level/1/learn', label: 'ด่าน 1–6' },
      { to: '/album', label: 'สมุดสะสมเงิน' },
    ],
  },
  {
    id: 'price',
    icon: '🧮',
    name: 'คำนวณราคาสินค้า',
    desc: 'รวมราคา หาผลต่าง ซื้อของหลายชิ้น แบ่งเงินเท่า ๆ กัน',
    skills: ['addsub', 'muldiv'],
    links: [{ to: '/level/7/learn', label: 'ด่าน 7–8' }],
  },
  {
    id: 'change',
    icon: '💵',
    name: 'จ่ายเงินและทอนเงิน',
    desc: 'จ่ายเงินให้พอดี คิดเงินทอนให้ถูกและเร็ว',
    skills: ['count', 'addsub'],
    links: [
      { to: '/change', label: 'ร้านทอนไว' },
      { to: '/ar', label: 'ล่าเหรียญ' },
    ],
  },
  {
    id: 'word',
    icon: '🧩',
    name: 'แก้โจทย์ปัญหาเรื่องเงิน',
    desc: 'อ่านโจทย์ หาสิ่งที่ถาม เลือกวิธีคิด และตรวจคำตอบ',
    skills: ['word'],
    links: [
      { to: '/level/9/learn', label: 'ด่าน 9–10' },
      { to: '/daily', label: 'ภารกิจประจำวัน' },
    ],
  },
  {
    id: 'budget',
    icon: '📒',
    name: 'วางแผนใช้เงินตามงบประมาณ',
    desc: 'เลือกซื้อของให้ไม่เกินงบ จดรายรับรายจ่าย ออมและแบ่งปัน',
    skills: ['ledger'],
    links: [
      { to: '/plan', label: 'วางแผนใช้เงิน' },
      { to: '/level/11/learn', label: 'ด่าน 11' },
      { to: '/eco', label: 'กาดรักษ์โลก' },
    ],
  },
  {
    id: 'team',
    icon: '🤝',
    name: 'ใช้เหตุผลและทำงานร่วมกับเพื่อน',
    desc: 'แข่งตอบกับเพื่อน อธิบายวิธีคิด และเล่นเกมกระดานในห้อง',
    skills: ['word'],
    links: [{ to: '/duel', label: 'ดวลสองคน' }],
  },
]

export function groupInfo(id: MissionGroup): MissionGroupInfo {
  return MISSION_GROUPS.find((g) => g.id === id)!
}

/** กลุ่มภารกิจของแต่ละด่าน */
export function levelGroup(level: number): MissionGroup {
  if (level <= 6) return 'read'
  if (level <= 8) return 'price'
  if (level === 11) return 'budget'
  return 'word'
}

export interface ActivityInput {
  /** รหัสกิจกรรม เช่น L3-mission, S3-2, change, plan-rabbit-party, duel */
  act: string
  group: MissionGroup | 'other'
  label: string
  correct: number
  total: number
  /** ข้อที่ตอบผิดครั้งแรก / จำนวนครั้งที่ทำผิด */
  wrong: number
  timeMs: number
  /** เหรียญหรือแต้มที่ได้ */
  points: number
  stars?: number
  passed?: boolean
}

export interface ActivityEntry extends ActivityInput {
  at: number
}

export interface ActivityStat {
  group: MissionGroup | 'other'
  label: string
  plays: number
  correct: number
  total: number
  wrong: number
  timeMs: number
  points: number
  /** ร้อยละถูกที่ดีที่สุด (0–1) */
  best: number
  bestStars: number
  firstAt: number
  lastAt: number
}

export const LOG_MAX = 150

function clean(n: number): number {
  return Number.isFinite(n) && n > 0 ? Math.round(n) : 0
}

/** บันทึกผลหนึ่งครั้ง (ข้อมูลผิดรูปถูกปรับเป็น 0 ไม่ทำให้สถิติเสีย) */
export function logActivity(p: Player, input: ActivityInput, now = Date.now()): Player {
  const e: ActivityEntry = {
    ...input,
    correct: clean(input.correct),
    total: clean(input.total),
    wrong: clean(input.wrong),
    timeMs: clean(input.timeMs),
    points: clean(input.points),
    at: now,
  }
  if (e.correct > e.total) e.total = e.correct
  const acts = { ...(p.acts ?? {}) }
  const prev = acts[e.act]
  const acc = e.total === 0 ? 0 : e.correct / e.total
  acts[e.act] = prev
    ? {
        ...prev,
        label: e.label,
        plays: prev.plays + 1,
        correct: prev.correct + e.correct,
        total: prev.total + e.total,
        wrong: prev.wrong + e.wrong,
        timeMs: prev.timeMs + e.timeMs,
        points: prev.points + e.points,
        best: Math.max(prev.best, acc),
        bestStars: Math.max(prev.bestStars, e.stars ?? 0),
        lastAt: now,
      }
    : {
        group: e.group,
        label: e.label,
        plays: 1,
        correct: e.correct,
        total: e.total,
        wrong: e.wrong,
        timeMs: e.timeMs,
        points: e.points,
        best: acc,
        bestStars: e.stars ?? 0,
        firstAt: now,
        lastAt: now,
      }
  return { ...p, acts, actLog: [...(p.actLog ?? []), e].slice(-LOG_MAX) }
}

export interface GroupSummary {
  group: MissionGroup
  plays: number
  correct: number
  total: number
  wrong: number
  timeMs: number
  points: number
  /** ร้อยละถูก (null = ยังไม่เล่น) */
  percent: number | null
  /** ชนิดกิจกรรมที่เคยเล่นในกลุ่มนี้ */
  activities: number
}

export function groupSummary(p: Player): Record<MissionGroup, GroupSummary> {
  const out = {} as Record<MissionGroup, GroupSummary>
  for (const g of MISSION_GROUPS) out[g.id] = { group: g.id, plays: 0, correct: 0, total: 0, wrong: 0, timeMs: 0, points: 0, percent: null, activities: 0 }
  for (const st of Object.values(p.acts ?? {})) {
    if (st.group === 'other') continue
    const g = out[st.group]
    if (!g) continue
    g.plays += st.plays
    g.correct += st.correct
    g.total += st.total
    g.wrong += st.wrong
    g.timeMs += st.timeMs
    g.points += st.points
    g.activities += 1
  }
  for (const g of Object.values(out)) g.percent = g.total === 0 ? null : Math.round((g.correct / g.total) * 100)
  return out
}

/** จำนวนกลุ่มภารกิจที่เคยเล่นแล้ว (จาก 6 กลุ่ม) */
export function groupsPlayed(p: Player): number {
  return Object.values(groupSummary(p)).filter((g) => g.plays > 0).length
}

/** กลุ่มภารกิจที่เด่น / ควรฝึกเพิ่ม (คิดเฉพาะกลุ่มที่ทำอย่างน้อย 3 ข้อ) */
export function strongWeakGroups(p: Player, passPercent: number): { strong: MissionGroup[]; weak: MissionGroup[] } {
  const strong: MissionGroup[] = []
  const weak: MissionGroup[] = []
  for (const g of Object.values(groupSummary(p))) {
    if (g.total < 3 || g.percent === null) continue
    if (g.percent >= Math.max(80, passPercent)) strong.push(g.group)
    else if (g.percent < passPercent) weak.push(g.group)
  }
  return { strong, weak }
}

/* ------------------------------------------------------------------ */
/* ขั้น L: สะท้อนผลการเรียนรู้ของนักเรียน                                  */
/* ------------------------------------------------------------------ */

export type Feeling = 'great' | 'good' | 'ok' | 'hard'

export const FEELINGS: { id: Feeling; icon: string; label: string }[] = [
  { id: 'great', icon: '😀', label: 'สนุกมาก เข้าใจแล้ว' },
  { id: 'good', icon: '🙂', label: 'เข้าใจเกือบหมด' },
  { id: 'ok', icon: '😐', label: 'ยังงง บางเรื่อง' },
  { id: 'hard', icon: '😟', label: 'ยังไม่เข้าใจ อยากให้ช่วย' },
]

export interface Reflection {
  at: number
  feeling: Feeling
  /** สิ่งที่ทำได้ดี */
  good: string
  /** สิ่งที่อยากฝึกเพิ่ม */
  improve: string
  /** จะนำไปใช้ในชีวิตจริงอย่างไร */
  apply: string
}

export function repairReflection(raw: unknown): Reflection | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const r = raw as Partial<Reflection>
  if (!FEELINGS.some((f) => f.id === r.feeling)) return undefined
  const t = (v: unknown) => (typeof v === 'string' ? v.slice(0, 300) : '')
  return { at: typeof r.at === 'number' ? r.at : 0, feeling: r.feeling as Feeling, good: t(r.good), improve: t(r.improve), apply: t(r.apply) }
}

/* ------------------------------------------------------------------ */
/* รวมข้อมูลจากสองเครื่อง                                                 */
/* ------------------------------------------------------------------ */

/** รวมบันทึกภารกิจ: รายการล่าสุดรวมกันไม่ซ้ำ สถิติรวมใช้ชุดที่เล่นมากกว่า (นำเข้าไฟล์ซ้ำไม่นับซ้ำ) */
export function mergeActivity(a: Player, b: Player): Pick<Player, 'acts' | 'actLog'> {
  const acts: Record<string, ActivityStat> = { ...(a.acts ?? {}) }
  for (const [k, v] of Object.entries(b.acts ?? {})) {
    const o = acts[k]
    acts[k] = !o || v.plays > o.plays ? v : o
  }
  const seen = new Map<string, ActivityEntry>()
  for (const e of [...(a.actLog ?? []), ...(b.actLog ?? [])]) seen.set(`${e.at}|${e.act}`, e)
  const actLog = Array.from(seen.values())
    .sort((x, y) => x.at - y.at)
    .slice(-LOG_MAX)
  return { acts: Object.keys(acts).length > 0 ? acts : undefined, actLog: actLog.length > 0 ? actLog : undefined }
}
