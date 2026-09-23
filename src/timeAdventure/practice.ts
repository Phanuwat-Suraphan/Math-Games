/**
 * โหมดฝึกอ่านนาฬิกา: สร้างโจทย์เวลาใหม่ได้ไม่รู้จบ
 *
 * ทำไมต้องมี ในเมื่อมีการ์ด 40 ใบอยู่แล้ว
 *
 * การ์ดชุดเดิมจำได้ เด็กที่เล่นซ้ำสามสี่รอบจะจำว่า "นาฬิการูปนี้ตอบข้อแรก"
 * โดยไม่ได้อ่านเข็มจริง ๆ อีกต่อไป โหมดนี้สุ่มเวลาใหม่ทุกข้อ
 * จึงวัดได้ว่าเด็กอ่านนาฬิกาเป็นจริงหรือจำการ์ดได้
 *
 * ตัวเลือกผิดทุกข้อมาจากความผิดพลาดที่เด็ก ป.2 ทำจริง ไม่ใช่สุ่มมั่ว
 * · อ่านเลขที่เข็มสั้นกำลังจะไปถึง (8:30 ตอบเป็น 9:30)
 * · อ่านเลขที่เข็มยาวชี้เป็นนาทีตรง ๆ (เข็มยาวชี้ 6 ตอบเป็น 06 นาที)
 * · สลับหน้าที่ของเข็มสองเข็ม
 * · สับสนครึ่งชั่วโมงกับตรงชั่วโมง
 * ตัวเลือกผิดที่เดาง่ายเกินไปไม่ได้ฝึกอะไร ส่วนตัวเลือกแบบนี้ทำให้ครูเห็นว่าเด็กพลาดตรงไหน
 *
 * กติกาเรื่องช่วงเวลาเหมือนการ์ดชุดเดิม: ไม่มีเวลาช่วงตี 1 ถึงตี 5
 * หน้าปัดที่เป็นเลข 1–5 ถือเป็นตอนบ่าย และมีป้ายบอกกำกับไว้เสมอ
 */

import type { ChoiceCard, SetClockCard, TimeCard } from './cards'
import { shuffle } from './engine'
import type { Rng } from './engine'

export type PracticeLevel = 'hour' | 'half' | 'five'
export type PracticeKind = 'read' | 'set' | 'write'

export const PRACTICE_LEVELS: Record<PracticeLevel, { name: string; hint: string }> = {
  hour: { name: 'ตรงชั่วโมง', hint: 'เข็มยาวชี้ 12 เสมอ เช่น 07:00' },
  half: { name: 'ครึ่งชั่วโมง', hint: 'มีทั้งตรงชั่วโมงและครึ่งชั่วโมง เช่น 08:30' },
  five: { name: 'ทีละ 5 นาที', hint: 'นับเข็มยาวทีละ 5 เช่น 07:15 และมีตอนบ่ายด้วย' },
}

export const PRACTICE_LENGTH = 10
/** รอบแก้ตัว: ข้อที่ผิดวนกลับมาให้ตอบใหม่ท้ายรอบ แต่ไม่เกินจำนวนนี้ */
export const PRACTICE_RETRY_LIMIT = 3

type Period = 'morning' | 'noon' | 'afternoon'

/* ── ตัวเลขและคำอ่านภาษาไทย ─────────────────────────────── */

const UNITS = ['', 'หนึ่ง', 'สอง', 'สาม', 'สี่', 'ห้า', 'หก', 'เจ็ด', 'แปด', 'เก้า']

/** เขียนจำนวน 0–59 เป็นคำอ่านภาษาไทย เช่น 21 เป็น "ยี่สิบเอ็ด" */
export function thaiNumber(n: number): string {
  if (n === 0) return 'ศูนย์'
  if (n < 10) return UNITS[n]
  const tens = Math.floor(n / 10)
  const ones = n % 10
  const head = tens === 1 ? 'สิบ' : tens === 2 ? 'ยี่สิบ' : UNITS[tens] + 'สิบ'
  const tail = ones === 0 ? '' : ones === 1 ? 'เอ็ด' : UNITS[ones]
  return head + tail
}

const pad = (n: number) => String(n).padStart(2, '0')

function periodOf(h: number): Period {
  if (h === 12) return 'noon'
  return h <= 5 ? 'afternoon' : 'morning'
}

/**
 * ชั่วโมงบนหน้าปัด (1–12) เป็นชั่วโมงแบบ 24 ชั่วโมงตามช่วงเวลาของโจทย์
 * คืน null เมื่อกลายเป็นเวลาช่วงตี 1 ถึงตี 5 ซึ่งไม่ใช้ในโจทย์ ป.2
 */
function clockHourTo24(h: number, period: Period): number | null {
  if (h === 12) return 12
  if (period === 'afternoon') return h + 12
  return h <= 5 ? null : h
}

export function formatTime(h24: number, m: number): string {
  return `${pad(h24)}:${pad(m)} น.`
}

export function thaiTimeWords(h24: number, m: number): string {
  return `${thaiNumber(h24)}นาฬิกา${m === 0 ? '' : `${thaiNumber(m)}นาที`}`
}

const PERIOD_TAG: Record<Period, string> = {
  morning: '🌅 ตอนเช้า',
  noon: '☀️ เที่ยงวัน',
  afternoon: '🌤️ ตอนบ่าย',
}

/* ── สุ่มเวลา ────────────────────────────────────────────── */

const pickFrom = <T>(list: readonly T[], rng: Rng): T => list[Math.floor(rng() * list.length)]

/** ชั่วโมงบนหน้าปัดที่ใช้ได้ในแต่ละระดับ ระดับต้น ๆ ใช้แค่ตอนเช้าถึงเที่ยง */
function hoursFor(level: PracticeLevel): number[] {
  return level === 'five' ? [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] : [6, 7, 8, 9, 10, 11, 12]
}

function minutesFor(level: PracticeLevel): number[] {
  if (level === 'hour') return [0]
  if (level === 'half') return [0, 30, 30]
  return [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55]
}

export interface ClockTime {
  h: number
  m: number
}

export function randomTime(level: PracticeLevel, rng: Rng): ClockTime {
  return { h: pickFrom(hoursFor(level), rng), m: pickFrom(minutesFor(level), rng) }
}

/* ── ตัวเลือกผิดจากความผิดพลาดจริง ─────────────────────────── */

const wrapHour = (h: number) => ((((h - 1) % 12) + 12) % 12) + 1

/**
 * รายการตัวเลือกผิดเรียงตามความน่าจะพลาดจริง ตัวแรก ๆ ถูกเลือกก่อน
 * หน้าที่ของฟังก์ชันนี้คือเสนอ ส่วนการกรองตัวซ้ำและเวลาต้องห้ามทำที่ผู้เรียก
 */
function mistakesFor({ h, m }: ClockTime): ClockTime[] {
  const out: ClockTime[] = []
  if (m > 0) out.push({ h: wrapHour(h + 1), m }) // อ่านเลขที่เข็มสั้นกำลังจะไปถึง
  if (m > 0) out.push({ h, m: m / 5 }) // อ่านเลขที่เข็มยาวชี้เป็นนาที
  out.push({ h: m === 0 ? 12 : m / 5, m: (h % 12) * 5 }) // สลับเข็ม
  out.push({ h, m: (m + 30) % 60 }) // สับสนครึ่งชั่วโมงกับตรงชั่วโมง
  out.push({ h: wrapHour(h + 1), m })
  out.push({ h: wrapHour(h - 1), m })
  out.push({ h: wrapHour(h + 2), m })
  out.push({ h, m: (m + 15) % 60 })
  return out
}

function whyFor({ h, m }: ClockTime, period: Period): string {
  const hand =
    m === 0
      ? `เข็มยาวชี้ 12 = ตรงชั่วโมง · เข็มสั้นชี้ ${h}`
      : m === 30
        ? `เข็มยาวชี้ 6 = 30 นาที · เข็มสั้นเลย ${h} มาแล้ว`
        : `เข็มยาวชี้ ${m / 5} ➜ นับทีละ 5 ได้ ${m} นาที · เข็มสั้นเลย ${h} มาแล้ว`
  return period === 'afternoon' ? `${hand} · ตอนบ่ายบวก 12 เป็น ${h + 12} นาฬิกา` : hand
}

/**
 * ตัวเลือกสามข้อ: เฉลยหนึ่ง ผิดสอง
 * ตัวเลือกผิดต้องเป็นเวลาที่มีจริงในช่วงเดียวกัน และไม่ซ้ำกับเฉลย
 */
function optionsFor(time: ClockTime, rng: Rng): { options: string[]; answer: number } {
  const period = periodOf(time.h)
  const h24 = clockHourTo24(time.h, period) as number
  const correct = formatTime(h24, time.m)
  const wrong: string[] = []
  for (const miss of mistakesFor(time)) {
    const missH24 = clockHourTo24(miss.h, period)
    if (missH24 === null) continue
    const text = formatTime(missH24, miss.m)
    if (text !== correct && !wrong.includes(text)) wrong.push(text)
    if (wrong.length === 2) break
  }
  const options = shuffle([correct, ...wrong], rng)
  return { options, answer: options.indexOf(correct) }
}

/* ── สร้างโจทย์ ──────────────────────────────────────────── */

/**
 * โจทย์หนึ่งข้อ ใช้รูปการ์ดแบบเดียวกับการ์ดชุดเดิม หน้าจอจึงวาดได้ด้วยโค้ดเดิม
 * รหัสขึ้นต้นด้วย P ไม่ชนกับการ์ดชุดเดิม และไม่นับรวมในสถิติรายการ์ด
 */
export function makeQuestion(kind: PracticeKind, time: ClockTime, rng: Rng): TimeCard {
  const period = periodOf(time.h)
  const h24 = clockHourTo24(time.h, period) as number
  const shown = formatTime(h24, time.m)
  const id = `P-${kind}-${pad(h24)}${pad(time.m)}`
  const why = whyFor(time, period)

  if (kind === 'set') {
    const card: SetClockCard = {
      id,
      deck: 'time',
      stars: 1,
      kind: 'set',
      start: time.h === 12 && time.m === 0 ? [6, 0] : [12, 0],
      target: [time.h, time.m],
      question: `หมุนเข็มให้เป็น ${shown}`,
      answerText: `เข็มสั้น${time.m === 0 ? 'ชี้' : 'เลย'} ${time.h} · เข็มยาวชี้ ${time.m === 0 ? 12 : time.m / 5}`,
      why,
    }
    return card
  }

  const { options, answer } = optionsFor(time, rng)
  if (kind === 'write') {
    const card: ChoiceCard = {
      id,
      deck: 'time',
      stars: 1,
      kind: 'choice',
      visual: { kind: 'word', text: thaiTimeWords(h24, time.m), blank: true, tag: PERIOD_TAG[period] },
      question: 'เขียนเป็นตัวเลขอย่างไร?',
      options,
      answer,
      answerText: shown,
      why: `ชั่วโมงไว้หน้า : นาทีไว้หลัง : · ${thaiTimeWords(h24, time.m)} = ${shown}`,
    }
    return card
  }

  const card: ChoiceCard = {
    id,
    deck: 'time',
    stars: 1,
    kind: 'choice',
    visual: { kind: 'clock', h: time.h, m: time.m, tag: PERIOD_TAG[period] },
    question: 'นาฬิกาบอกเวลาเท่าไร?',
    options,
    answer,
    answerText: shown,
    why,
  }
  return card
}

/**
 * ชุดฝึกหนึ่งรอบ: อ่านหน้าปัด 5 ข้อ หมุนเข็ม 3 ข้อ เขียนเวลา 2 ข้อ
 * เวลาไม่ซ้ำกันในรอบเดียว เพื่อไม่ให้ข้อหลังเป็นการลอกคำตอบข้อก่อน
 */
export function buildPracticeSet(level: PracticeLevel, rng: Rng, count = PRACTICE_LENGTH): TimeCard[] {
  const pattern: PracticeKind[] = ['read', 'read', 'set', 'read', 'write', 'read', 'set', 'read', 'write', 'set']
  const kinds = shuffle(Array.from({ length: count }, (_, i) => pattern[i % pattern.length]), rng)
  // หยิบเวลาจากกองที่สับแล้วโดยไม่ใส่คืน เวลาจึงไม่ซ้ำจนกว่าจะใช้ครบทุกเวลาของระดับนั้น
  // (ระดับตรงชั่วโมงมีแค่ 7 เวลา รอบละ 10 ข้อจึงต้องวนซ้ำบ้าง)
  const pool: ClockTime[] = []
  for (const h of hoursFor(level)) for (const m of [...new Set(minutesFor(level))]) pool.push({ h, m })
  let deck: ClockTime[] = []
  return kinds.map((kind) => {
    if (deck.length === 0) deck = shuffle(pool, rng)
    const time = deck.pop() as ClockTime
    return makeQuestion(kind, time, rng)
  })
}

/**
 * เหรียญในแอปจากการฝึกหนึ่งรอบ
 *
 * ข้อละ 1 เหรียญ ถูกหมดได้โบนัส น้อยกว่าเกมกระดานโดยตั้งใจ
 * เพราะหนึ่งรอบใช้เวลาไม่ถึงสองนาที ถ้าให้เท่ากันจะกลายเป็นทางปั๊มเหรียญ
 * ข้อที่ถูกในรอบแก้ตัวไม่ได้เหรียญ เพราะเห็นเฉลยไปแล้ว
 */
export const PRACTICE_PERFECT_BONUS = 5

export function practiceReward(firstTryCorrect: number, total: number): number {
  const correct = Math.max(0, Math.min(total, firstTryCorrect))
  return correct + (total > 0 && correct === total ? PRACTICE_PERFECT_BONUS : 0)
}
