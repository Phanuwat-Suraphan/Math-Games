import type { DenomId, Skill } from './types'
import type { TestKind } from './progress'
import { SKILLS } from '../data/characters'
import { ALL_DENOM_IDS } from '../data/denominations'
import { shuffle } from '../utils/random'

/**
 * คลังข้อสอบก่อนเรียน/หลังเรียนที่ครูแก้ไขได้เอง (ไม่ต้องแก้โค้ด)
 *
 * - ข้อสอบปรนัย 4 ตัวเลือก และข้อเติมคำตอบเป็นตัวเลข
 * - กำหนดคะแนนรายข้อ สุ่มข้อ สุ่มตัวเลือก จำกัดเวลา ทำได้ครั้งเดียว
 * - ชุดตั้งต้นเป็นแบบคู่ขนาน: จุดประสงค์ จำนวนข้อ คะแนนเต็ม ความยากเท่ากัน ตัวเลข/สถานการณ์ต่างกัน
 */

export type ItemType = 'choice' | 'number'

export interface TestItem {
  id: string
  /** จุดประสงค์ (ทักษะ) ที่ข้อนี้วัด */
  skill: Skill
  type: ItemType
  text: string
  /** ปรนัย: ตัวเลือก 4 ข้อ */
  choices: string[]
  /** ปรนัย = ลำดับตัวเลือกที่ถูก (0–3) · เติมตัวเลข = คำตอบ */
  answer: number
  /** หน่วยของคำตอบแบบเติมตัวเลข เช่น บาท */
  unit: string
  points: number
  /** รูปเงินประกอบโจทย์ (ไม่บังคับ) */
  money: DenomId[]
}

export interface TestForm {
  kind: TestKind
  title: string
  items: TestItem[]
  /** เวลา (นาที) 0 = ไม่จำกัด */
  minutes: number
  shuffleItems: boolean
  shuffleChoices: boolean
  /** ทำได้ครั้งเดียว (ครูกดให้ทำใหม่เป็นรายคนได้) */
  oneAttempt: boolean
  /** เปิดให้นักเรียนทำ (หลังเรียน: เปิดเองเมื่อผ่านด่าน 12 ด้วย) */
  open: boolean
}

export interface TestBank {
  pre: TestForm
  post: TestForm
  /** เวลาที่ครูแก้ล่าสุด (0 = ชุดตั้งต้น) ใช้ตัดสินว่าไฟล์ไหนใหม่กว่าตอนรวมข้อมูล */
  updatedAt: number
}

export const CHOICE_LABELS = ['ก', 'ข', 'ค', 'ง']

export const KIND_NAME: Record<TestKind, string> = { pre: 'แบบทดสอบก่อนเรียน', post: 'แบบทดสอบหลังเรียน' }

/* ------------------------------------------------------------------ */
/* ชุดข้อสอบตั้งต้น (คู่ขนาน 20 ข้อ 20 คะแนน)                              */
/* ------------------------------------------------------------------ */

type Seed = [Skill, string, string[] | number, number | string, DenomId[]?]

function seedItems(prefix: string, seeds: Seed[]): TestItem[] {
  return seeds.map(([skill, text, choicesOrAnswer, answerOrUnit, money], i) => {
    const id = `${prefix}-${String(i + 1).padStart(2, '0')}`
    if (Array.isArray(choicesOrAnswer)) {
      return { id, skill, type: 'choice', text, choices: choicesOrAnswer, answer: answerOrUnit as number, unit: '', points: 1, money: money ?? [] }
    }
    return { id, skill, type: 'number', text, choices: [], answer: choicesOrAnswer, unit: answerOrUnit as string, points: 1, money: money ?? [] }
  })
}

const PRE_SEEDS: Seed[] = [
  ['notes', 'เหรียญในข้อใดมีค่ามากที่สุด', ['เหรียญ 1 บาท', 'เหรียญ 5 บาท', 'เหรียญ 10 บาท', 'เหรียญ 2 บาท'], 2],
  ['notes', 'ธนบัตรสีแดงมีค่ากี่บาท', ['20 บาท', '50 บาท', '100 บาท', '500 บาท'], 2],
  ['count', 'เงินในภาพรวมเป็นเงินเท่าไร', ['145 บาท', '150 บาท', '155 บาท', '165 บาท'], 2, ['b100', 'b20', 'b20', 'b10', 'b5']],
  ['count', 'เหรียญ 10 บาท 3 เหรียญ และเหรียญ 50 สตางค์ 2 เหรียญ รวมเป็นเงินเท่าไร', ['30 บาท 50 สตางค์', '31 บาท', '32 บาท', '13 บาท'], 1],
  ['count', 'เงินในภาพรวมเป็นเงินกี่บาท', 92, 'บาท', ['b50', 'b20', 'b10', 'b10', 'b2']],
  ['dot', '45 บาท 50 สตางค์ เขียนแบบใช้จุดได้ตามข้อใด', ['45.05 บาท', '45.50 บาท', '4.550 บาท', '455.0 บาท'], 1],
  ['dot', '30.25 บาท อ่านว่าอย่างไร', ['สามสิบบาทยี่สิบห้าสตางค์', 'สามบาทยี่สิบห้าสตางค์', 'สามสิบบาทสองสตางค์', 'สามร้อยสองบาทห้าสิบสตางค์'], 0],
  ['compare', 'ข้อใดมีค่ามากที่สุด', ['75 บาท', '7.50 บาท', '57 บาท 50 สตางค์', '75 บาท 25 สตางค์'], 3],
  ['compare', 'ต้นมีเงิน 85 บาท ฝนมีเงิน 58 บาท ใครมีเงินมากกว่า และมากกว่ากี่บาท', ['ต้น มากกว่า 27 บาท', 'ฝน มากกว่า 27 บาท', 'ต้น มากกว่า 37 บาท', 'ฝน มากกว่า 33 บาท'], 0],
  ['exchange', 'ธนบัตร 100 บาท 1 ใบ แลกเป็นธนบัตร 20 บาทได้กี่ใบ', ['2 ใบ', '4 ใบ', '5 ใบ', '10 ใบ'], 2],
  ['exchange', 'เหรียญ 50 สตางค์ 6 เหรียญ รวมเป็นเงินกี่บาท', 3, 'บาท'],
  ['addsub', '456 บาท + 287 บาท เท่ากับเท่าไร', ['733 บาท', '743 บาท', '643 บาท', '753 บาท'], 1],
  ['addsub', '50 บาท 75 สตางค์ + 24 บาท 50 สตางค์ เท่ากับเท่าไร', ['74 บาท 25 สตางค์', '75 บาท 25 สตางค์', '74 บาท 75 สตางค์', '26 บาท 25 สตางค์'], 1],
  ['addsub', '500 บาท − 365 บาท เท่ากับกี่บาท', 135, 'บาท'],
  ['muldiv', 'สมุดเล่มละ 15 บาท ซื้อ 4 เล่ม ต้องจ่ายเงินกี่บาท', ['19 บาท', '45 บาท', '60 บาท', '75 บาท'], 2],
  ['muldiv', 'แบ่งเงิน 96 บาท ให้เด็ก 4 คนเท่า ๆ กัน ได้คนละกี่บาท', ['22 บาท', '24 บาท', '26 บาท', '92 บาท'], 1],
  ['word', 'แม่ซื้อผลไม้ราคา 68 บาท จ่ายด้วยธนบัตร 100 บาท จะได้เงินทอนกี่บาท', ['22 บาท', '32 บาท', '42 บาท', '168 บาท'], 1],
  ['word', 'นิดมีเงิน 120 บาท ซื้อดินสอ 25 บาท และยางลบ 18 บาท นิดเหลือเงินกี่บาท', 77, 'บาท'],
  ['word', 'ซื้อเสื้อราคา 159 บาท และกางเกงราคา 235 บาท จ่ายด้วยธนบัตร 500 บาท จะได้เงินทอนกี่บาท', ['94 บาท', '106 บาท', '116 บาท', '394 บาท'], 1],
  ['ledger', 'วันจันทร์ได้เงิน 40 บาท ใช้ไป 25 บาท วันอังคารได้เงิน 40 บาท ใช้ไป 30 บาท สองวันนี้เหลือเงินรวมกี่บาท', ['15 บาท', '25 บาท', '35 บาท', '80 บาท'], 1],
]

const POST_SEEDS: Seed[] = [
  ['notes', 'ธนบัตรในข้อใดมีค่าน้อยที่สุด', ['ธนบัตร 100 บาท', 'ธนบัตร 20 บาท', 'ธนบัตร 50 บาท', 'ธนบัตร 500 บาท'], 1],
  ['notes', 'ธนบัตรสีม่วงมีค่ากี่บาท', ['50 บาท', '100 บาท', '500 บาท', '1,000 บาท'], 2],
  ['count', 'เงินในภาพรวมเป็นเงินเท่าไร', ['166 บาท', '171 บาท', '176 บาท', '186 บาท'], 2, ['b100', 'b50', 'b20', 'b5', 'b1']],
  ['count', 'เหรียญ 5 บาท 4 เหรียญ และเหรียญ 25 สตางค์ 4 เหรียญ รวมเป็นเงินเท่าไร', ['20 บาท 25 สตางค์', '24 บาท', '21 บาท', '20 บาท'], 2],
  ['count', 'เงินในภาพรวมเป็นเงินกี่บาท', 133, 'บาท', ['b100', 'b20', 'b5', 'b5', 'b2', 'b1']],
  ['dot', '128 บาท 75 สตางค์ เขียนแบบใช้จุดได้ตามข้อใด', ['128.75 บาท', '12.875 บาท', '128.07 บาท', '1,287.5 บาท'], 0],
  ['dot', '16.50 บาท อ่านว่าอย่างไร', ['สิบหกบาทห้าสตางค์', 'สิบหกบาทห้าสิบสตางค์', 'หกสิบบาทห้าสิบสตางค์', 'หนึ่งร้อยหกสิบห้าบาท'], 1],
  ['compare', 'ข้อใดมีค่าน้อยที่สุด', ['120 บาท', '102 บาท 50 สตางค์', '12.50 บาท', '120.05 บาท'], 2],
  ['compare', 'มดมีเงิน 64 บาท โอ๊ตมีเงิน 92 บาท ใครมีเงินมากกว่า และมากกว่ากี่บาท', ['มด มากกว่า 28 บาท', 'โอ๊ต มากกว่า 28 บาท', 'โอ๊ต มากกว่า 32 บาท', 'โอ๊ต มากกว่า 38 บาท'], 1],
  ['exchange', 'ธนบัตร 50 บาท 1 ใบ แลกเป็นเหรียญ 5 บาทได้กี่เหรียญ', ['5 เหรียญ', '10 เหรียญ', '25 เหรียญ', '50 เหรียญ'], 1],
  ['exchange', 'เหรียญ 25 สตางค์ 8 เหรียญ รวมเป็นเงินกี่บาท', 2, 'บาท'],
  ['addsub', '378 บาท + 465 บาท เท่ากับเท่าไร', ['853 บาท', '833 บาท', '743 บาท', '843 บาท'], 3],
  ['addsub', '36 บาท 50 สตางค์ + 48 บาท 75 สตางค์ เท่ากับเท่าไร', ['84 บาท 25 สตางค์', '85 บาท 25 สตางค์', '85 บาท 75 สตางค์', '12 บาท 25 สตางค์'], 1],
  ['addsub', '700 บาท − 438 บาท เท่ากับกี่บาท', 262, 'บาท'],
  ['muldiv', 'ปากกาด้ามละ 12 บาท ซื้อ 6 ด้าม ต้องจ่ายเงินกี่บาท', ['18 บาท', '62 บาท', '72 บาท', '84 บาท'], 2],
  ['muldiv', 'แบ่งเงิน 84 บาท ให้เด็ก 3 คนเท่า ๆ กัน ได้คนละกี่บาท', ['21 บาท', '28 บาท', '32 บาท', '81 บาท'], 1],
  ['word', 'พ่อซื้อขนมราคา 145 บาท จ่ายด้วยธนบัตร 500 บาท จะได้เงินทอนกี่บาท', ['345 บาท', '355 บาท', '365 บาท', '455 บาท'], 1],
  ['word', 'ก้องมีเงิน 150 บาท ซื้อขนม 36 บาท และนม 27 บาท ก้องเหลือเงินกี่บาท', 87, 'บาท'],
  ['word', 'ซื้อรองเท้าราคา 289 บาท และกระเป๋าราคา 175 บาท จ่ายด้วยธนบัตร 500 บาท จะได้เงินทอนกี่บาท', ['36 บาท', '46 บาท', '164 บาท', '464 บาท'], 0],
  ['ledger', 'วันพุธได้เงิน 50 บาท ใช้ไป 35 บาท วันพฤหัสบดีได้เงิน 50 บาท ใช้ไป 28 บาท สองวันนี้เหลือเงินรวมกี่บาท', ['27 บาท', '37 บาท', '47 บาท', '100 บาท'], 1],
]

function defaultForm(kind: TestKind): TestForm {
  return {
    kind,
    title: KIND_NAME[kind],
    items: seedItems(kind, kind === 'pre' ? PRE_SEEDS : POST_SEEDS),
    minutes: 30,
    shuffleItems: true,
    shuffleChoices: true,
    oneAttempt: true,
    open: kind === 'pre',
  }
}

export function defaultBank(): TestBank {
  return { pre: defaultForm('pre'), post: defaultForm('post'), updatedAt: 0 }
}

/* ------------------------------------------------------------------ */
/* ตรวจความถูกต้องของข้อสอบ                                              */
/* ------------------------------------------------------------------ */

/** ปัญหาของข้อสอบหนึ่งข้อ (ว่าง = ใช้ได้) */
export function itemProblems(item: TestItem): string[] {
  const out: string[] = []
  if (!item.text.trim()) out.push('ยังไม่มีโจทย์')
  if (!SKILLS.includes(item.skill)) out.push('ยังไม่ได้เลือกจุดประสงค์')
  if (!Number.isInteger(item.points) || item.points < 1 || item.points > 10) out.push('คะแนนต้องเป็นเลข 1–10')
  if (item.type === 'choice') {
    const clean = item.choices.map((c) => c.trim())
    if (clean.length !== 4 || clean.some((c) => !c)) out.push('ต้องมีตัวเลือกครบ 4 ข้อ')
    else if (new Set(clean).size !== 4) out.push('ตัวเลือกซ้ำกัน')
    if (!Number.isInteger(item.answer) || item.answer < 0 || item.answer > 3) out.push('ยังไม่ได้เลือกคำตอบที่ถูก')
  } else if (!Number.isFinite(item.answer) || item.answer < 0) out.push('คำตอบต้องเป็นตัวเลขตั้งแต่ 0 ขึ้นไป')
  else if (Math.round(item.answer * 100) !== item.answer * 100) out.push('คำตอบมีทศนิยมได้ไม่เกิน 2 ตำแหน่ง (สตางค์)')
  return out
}

export function fullScore(form: TestForm): number {
  return form.items.reduce((s, i) => s + i.points, 0)
}

export function skillCounts(form: TestForm): Record<Skill, number> {
  const out = {} as Record<Skill, number>
  for (const s of SKILLS) out[s] = 0
  for (const i of form.items) out[i.skill] += 1
  return out
}

/** เทียบความเป็นคู่ขนานของสองฉบับ: จำนวนข้อ คะแนนเต็ม จำนวนข้อต่อจุดประสงค์ และชนิดข้อ */
export function parallelProblems(a: TestForm, b: TestForm): string[] {
  const out: string[] = []
  if (a.items.length !== b.items.length) out.push(`จำนวนข้อไม่เท่ากัน (${a.items.length} กับ ${b.items.length})`)
  if (fullScore(a) !== fullScore(b)) out.push(`คะแนนเต็มไม่เท่ากัน (${fullScore(a)} กับ ${fullScore(b)})`)
  const ca = skillCounts(a)
  const cb = skillCounts(b)
  const diff = SKILLS.filter((s) => ca[s] !== cb[s])
  if (diff.length > 0) out.push(`จำนวนข้อต่อจุดประสงค์ไม่เท่ากัน ${diff.length} จุดประสงค์`)
  const na = a.items.filter((i) => i.type === 'number').length
  const nb = b.items.filter((i) => i.type === 'number').length
  if (na !== nb) out.push(`ข้อเติมตัวเลขไม่เท่ากัน (${na} กับ ${nb})`)
  return out
}

/* ------------------------------------------------------------------ */
/* ซ่อมข้อมูลจากไฟล์ (ข้อที่เสียทิ้งไป ไม่ทำให้เกมพัง)                        */
/* ------------------------------------------------------------------ */

function repairItem(raw: unknown, i: number): TestItem | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Partial<TestItem>
  const type: ItemType = r.type === 'number' ? 'number' : 'choice'
  const item: TestItem = {
    id: typeof r.id === 'string' && r.id ? r.id.slice(0, 40) : `item-${i}`,
    skill: SKILLS.includes(r.skill as Skill) ? (r.skill as Skill) : 'word',
    type,
    text: typeof r.text === 'string' ? r.text.slice(0, 400) : '',
    choices: type === 'choice' && Array.isArray(r.choices) ? r.choices.slice(0, 4).map((c) => String(c).slice(0, 120)) : [],
    answer: Number(r.answer),
    unit: typeof r.unit === 'string' ? r.unit.slice(0, 20) : '',
    points: Number.isInteger(r.points) ? (r.points as number) : 1,
    money: Array.isArray(r.money) ? r.money.filter((m): m is DenomId => ALL_DENOM_IDS.includes(m as DenomId)).slice(0, 12) : [],
  }
  return itemProblems(item).length === 0 ? item : null
}

function repairForm(raw: unknown, kind: TestKind): TestForm {
  const base = defaultForm(kind)
  if (!raw || typeof raw !== 'object') return base
  const r = raw as Partial<TestForm>
  const items = Array.isArray(r.items) ? r.items.map(repairItem).filter((x): x is TestItem => x !== null) : base.items
  const ids = new Set<string>()
  for (const it of items) {
    while (ids.has(it.id)) it.id += '_'
    ids.add(it.id)
  }
  const minutes = Math.round(Number(r.minutes))
  return {
    kind,
    title: typeof r.title === 'string' && r.title.trim() ? r.title.trim().slice(0, 80) : base.title,
    items: items.length > 0 ? items : base.items,
    minutes: Number.isFinite(minutes) && minutes >= 0 && minutes <= 180 ? minutes : base.minutes,
    shuffleItems: typeof r.shuffleItems === 'boolean' ? r.shuffleItems : base.shuffleItems,
    shuffleChoices: typeof r.shuffleChoices === 'boolean' ? r.shuffleChoices : base.shuffleChoices,
    oneAttempt: typeof r.oneAttempt === 'boolean' ? r.oneAttempt : base.oneAttempt,
    open: typeof r.open === 'boolean' ? r.open : base.open,
  }
}

export function repairBank(raw: unknown): TestBank {
  if (!raw || typeof raw !== 'object') return defaultBank()
  const r = raw as Partial<TestBank>
  return { pre: repairForm(r.pre, 'pre'), post: repairForm(r.post, 'post'), updatedAt: typeof r.updatedAt === 'number' ? r.updatedAt : 0 }
}

/* ------------------------------------------------------------------ */
/* การทำข้อสอบหนึ่งครั้ง                                                 */
/* ------------------------------------------------------------------ */

/** ลำดับข้อ และลำดับตัวเลือกของแต่ละข้อ (สุ่มตามที่ครูตั้ง) */
export interface Paper {
  order: string[]
  /** id ข้อ → ลำดับตัวเลือกเดิมที่แสดงในตำแหน่ง ก ข ค ง */
  choiceOrder: Record<string, number[]>
}

export function makePaper(form: TestForm): Paper {
  const ids = form.items.map((i) => i.id)
  const choiceOrder: Record<string, number[]> = {}
  for (const i of form.items) if (i.type === 'choice') choiceOrder[i.id] = form.shuffleChoices ? shuffle([0, 1, 2, 3]) : [0, 1, 2, 3]
  return { order: form.shuffleItems ? shuffle(ids) : ids, choiceOrder }
}

/** คำตอบของนักเรียน: ปรนัย = ลำดับตัวเลือกเดิม (0–3) · เติมตัวเลข = ข้อความที่พิมพ์ */
export type Given = number | string | null

/** อ่านตัวเลขที่นักเรียนพิมพ์ (รับ 1,250 / 12.50 / ช่องว่าง) คืน null ถ้าไม่ใช่ตัวเลข */
export function parseNumber(text: string): number | null {
  const clean = text.replace(/[,\s]/g, '').replace(/บาท$/, '')
  if (!/^\d+(\.\d{1,2})?$/.test(clean)) return null
  return Number(clean)
}

export function isCorrect(item: TestItem, given: Given): boolean {
  if (given === null || given === '') return false
  if (item.type === 'choice') return given === item.answer
  const n = typeof given === 'number' ? given : parseNumber(given)
  return n !== null && Math.round(n * 100) === Math.round(item.answer * 100)
}

export interface ItemResult {
  item: string
  skill: Skill
  given: Given
  correct: boolean
  points: number
}

export interface TestAttempt {
  id: string
  kind: TestKind
  /** เวลาที่ครูแก้คลังข้อสอบล่าสุด ณ ตอนทำ (บอกได้ว่าทำข้อสอบฉบับไหน) */
  bankAt: number
  startedAt: number
  at: number
  timeMs: number
  /** คะแนนที่ได้ / คะแนนเต็ม */
  score: number
  total: number
  correct: number
  count: number
  timedOut: boolean
  answers: ItemResult[]
}

/** ตรวจคะแนนทั้งฉบับ */
export function gradeAttempt(
  form: TestForm,
  answers: Record<string, Given>,
  meta: { startedAt: number; at: number; bankAt: number; timedOut: boolean },
): TestAttempt {
  const results: ItemResult[] = form.items.map((item) => {
    const given = answers[item.id] ?? null
    const correct = isCorrect(item, given)
    return { item: item.id, skill: item.skill, given, correct, points: correct ? item.points : 0 }
  })
  return {
    id: `${form.kind}-${meta.startedAt}`,
    kind: form.kind,
    bankAt: meta.bankAt,
    startedAt: meta.startedAt,
    at: meta.at,
    timeMs: Math.max(0, meta.at - meta.startedAt),
    score: results.reduce((s, r) => s + r.points, 0),
    total: fullScore(form),
    correct: results.filter((r) => r.correct).length,
    count: results.length,
    timedOut: meta.timedOut,
    answers: results,
  }
}

/** ข้อที่ยังไม่ได้ตอบ */
export function unanswered(form: TestForm, answers: Record<string, Given>): number {
  return form.items.filter((i) => {
    const g = answers[i.id]
    return g === null || g === undefined || g === ''
  }).length
}

/** วินาทีที่เหลือ (null = ไม่จำกัดเวลา) */
export function secondsLeft(form: TestForm, startedAt: number, now: number): number | null {
  if (form.minutes <= 0) return null
  return Math.max(0, Math.ceil((startedAt + form.minutes * 60000 - now) / 1000))
}

export function clockText(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

/** ข้อความคำตอบที่ถูกสำหรับเฉลย */
export function answerText(item: TestItem): string {
  if (item.type === 'choice') return `${CHOICE_LABELS[item.answer]}. ${item.choices[item.answer]}`
  const n = Number.isInteger(item.answer) ? item.answer.toLocaleString('en-US') : item.answer.toFixed(2)
  return `${n}${item.unit ? ` ${item.unit}` : ''}`
}

/** ข้อใหม่ว่าง ๆ สำหรับครูเพิ่ม */
export function blankItem(kind: TestKind, now = Date.now()): TestItem {
  return { id: `${kind}-${now.toString(36)}`, skill: 'word', type: 'choice', text: '', choices: ['', '', '', ''], answer: 0, unit: 'บาท', points: 1, money: [] }
}
