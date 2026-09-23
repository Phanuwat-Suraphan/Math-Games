/**
 * โจทย์การคูณของ ZOMBIE RESCUE
 *
 * ทำไมสร้างโจทย์จากแม่แบบ ไม่ใช่การ์ดชุดตายตัว
 *
 * แต่ละเขตฝึกแม่สูตรคูณแม่เดียว (เขต 1 แม่ 2 ถึงเขต 4 แม่ 5 แล้วเขต 5 รวมทุกแม่)
 * ถ้าใช้การ์ดชุดตายตัว เด็กที่เล่นซ้ำจะจำคำตอบได้ก่อนจะคิดเป็น
 * แม่แบบจึงกำหนดแค่ "เรื่อง" กับ "ภาพ" ส่วนตัวเลขสุ่มใหม่ทุกครั้งในช่วงที่เหมาะกับ ป.2
 *
 * ทุกข้อใช้รูปเดียวกัน: มี groups กลุ่ม กลุ่มละ each (each คือแม่สูตรคูณ)
 * ผลคูณคือ "พลังวัคซีน" ที่ทีมได้เมื่อตอบถูก ตัวเลขที่เด็กคิดออกมาจึงมีความหมายในเกม
 *
 * กฎที่ห้ามแก้
 * · ประโยคการคูณยอมรับการสลับที่ตัวคูณเสมอ (4 × 3 และ 3 × 4 ถูกทั้งคู่)
 *   เพราะหนังสือแต่ละเล่มเรียงตัวตั้งไม่เหมือนกัน
 * · ข้อความโจทย์ต้องไม่บอกผลคูณ และคำใบ้ต้องไม่บอกคำตอบ
 * · ภาพที่ต้องนับทีละชิ้นมีไม่เกิน 30 ชิ้น เด็ก ป.2 นับได้โดยไม่ตาลาย
 */

import type { ZoneId } from './board'

export type Table = 2 | 3 | 4 | 5 | 10
export const TABLES: Table[] = [2, 3, 4, 5, 10]
export const ZONE_TABLE: Record<ZoneId, Table | 0> = { 1: 2, 2: 3, 3: 4, 4: 5, 5: 0 }

export type Stage = ZoneId | 'boss'
export type AskKind = 'product' | 'missing' | 'sentence'

/** ของที่ใช้วาดเป็นภาพ 'Z' คือหัวซอมบี้ที่วาดเอง ไม่ใช่อิโมจิ */
export type QVisual =
  | { kind: 'expr'; text: string }
  | { kind: 'add'; addend: number; times: number }
  | { kind: 'groups'; groups: number; each: number; item: string }
  | { kind: 'array'; rows: number; cols: number; item: string }
  | { kind: 'zombies'; count: number; power: number }
  | { kind: 'scene'; item: string; count: number; tag: string }

export interface Question {
  /** แม่แบบที่ใช้สร้าง */
  key: string
  stage: Stage | 'practice'
  groups: number
  each: Table
  product: number
  ask: AskKind
  /** ตัวที่ซ่อนไว้ในข้อหาตัวไม่ทราบค่า */
  hidden?: 'groups' | 'each'
  text: string
  visual: QVisual
  /** หน่วยต่อท้ายคำตอบ เช่น ขวด ตัว (ไม่มีก็ได้) */
  unit: string
  answerText: string
  why: string
  hint: string
}

export type QAnswer = { kind: 'number'; value: number } | { kind: 'sentence'; x: number; y: number; z: number }

export type Rng = () => number
const pickOf = <T>(list: readonly T[], rng: Rng): T => list[Math.floor(rng() * list.length)]

/** ตัวเลขที่เด็กต้องพิมพ์ในข้อแบบช่องเดียว */
export function expectedNumber(q: Question): number {
  if (q.ask === 'missing') return q.hidden === 'each' ? q.each : q.groups
  return q.product
}

export function checkAnswer(q: Question, answer: QAnswer): boolean {
  if (q.ask === 'sentence') {
    if (answer.kind !== 'sentence') return false
    const sameFactors =
      (answer.x === q.groups && answer.y === q.each) || (answer.x === q.each && answer.y === q.groups)
    return sameFactors && answer.z === q.product
  }
  return answer.kind === 'number' && answer.value === expectedNumber(q)
}

/* ── ข้อความช่วยคิด ───────────────────────────────────────── */

/** นับทีละเท่า ๆ กันจนครบ เช่น 3, 6, 9, 12 */
export function skipCount(each: number, groups: number): string {
  return Array.from({ length: groups }, (_, i) => (i + 1) * each).join(', ')
}

/** บวกซ้ำ เช่น 3 + 3 + 3 + 3 (ยาวเกิน 6 ตัวย่อด้วย …) */
export function repeatedAdd(each: number, groups: number): string {
  if (groups <= 6) return Array.from({ length: groups }, () => String(each)).join(' + ')
  return `${each} + ${each} + … + ${each} (${groups} ตัว)`
}

/**
 * เริ่มนับให้ดูแค่ตัวแรกหรือสองตัวแรก
 * ถ้ามีแค่ 2 กลุ่ม ตัวที่สองก็คือคำตอบ จึงให้ดูแค่ตัวแรก
 */
function countStart(each: number, groups: number): string {
  return groups <= 2 ? `${each}, …` : `${each}, ${each * 2}, …`
}

function sentenceText(groups: number, each: number): string {
  const main = `${groups} × ${each} = ${groups * each}`
  return groups === each ? main : `${main} (เขียน ${each} × ${groups} = ${groups * each} ก็ถูก)`
}

/* ── แม่แบบ ─────────────────────────────────────────────── */

interface Template {
  key: string
  /** ช่วงจำนวนกลุ่มที่แม่แบบนี้วาดได้สวย (ก่อนตัดด้วยระดับง่าย/ปกติ) */
  min: number
  max: number
  /** แม่ที่ใช้ได้ · ไม่ใส่คือใช้แม่ของเขต */
  tables?: Table[]
  build: (groups: number, each: Table, rng: Rng) => Omit<Question, 'key' | 'stage' | 'groups' | 'each' | 'product'>
}

const productAsk = (groups: number, each: number, unit: string) => ({
  ask: 'product' as const,
  unit,
  answerText: `${groups * each}${unit ? ' ' + unit : ''}`,
  why: groups <= 10 ? `นับทีละ ${each}: ${skipCount(each, groups)}` : `${groups} × ${each} = ${groups * each}`,
  hint: `นับทีละ ${each} ไป ${groups} ครั้ง: ${countStart(each, groups)}`,
})

const sentenceAsk = (groups: number, each: number, unit: string) => ({
  ask: 'sentence' as const,
  unit,
  answerText: sentenceText(groups, each) + (unit ? ' ' + unit : ''),
  why: `${groups} กลุ่ม กลุ่มละ ${each} ➜ ${repeatedAdd(each, groups)} = ${groups * each}`,
  hint: `นับก่อนว่ามีกี่กลุ่ม แล้วกลุ่มละเท่าไร เขียนเป็น กลุ่ม × กลุ่มละ`,
})

const exprTemplate = (key: string, tables?: Table[]): Template => ({
  key,
  min: 1,
  max: 10,
  tables,
  build: (groups, each) => ({
    text: 'ได้เท่าไร?',
    visual: { kind: 'expr', text: `${groups} × ${each} = ?` },
    ...productAsk(groups, each, ''),
    why: `${repeatedAdd(each, groups)} = ${groups * each}`,
    hint: `บวก ${each} ซ้ำ ${groups} ครั้ง หรือนับทีละ ${each}: ${countStart(each, groups)}`,
  }),
})

/** หาตัวไม่ทราบค่า ซ่อนจำนวนกลุ่มเสมอ เพราะถ้าซ่อนแม่ของเขต เด็กตอบได้โดยไม่ต้องคิด */
const missingTemplate = (key: string, tables?: Table[], hideEither = false): Template => ({
  key,
  min: 2,
  max: 10,
  tables,
  build: (groups, each, rng) => {
    const hidden: 'groups' | 'each' = hideEither && rng() < 0.5 ? 'each' : 'groups'
    const product = groups * each
    const text = hidden === 'groups' ? `□ × ${each} = ${product}` : `${groups} × □ = ${product}`
    const answer = hidden === 'groups' ? groups : each
    const step = hidden === 'groups' ? each : groups
    return {
      ask: 'missing',
      hidden,
      unit: '',
      text: 'ใน □ คือเลขอะไร?',
      visual: { kind: 'expr', text },
      answerText: `${answer} (เพราะ ${groups} × ${each} = ${product})`,
      why: `นับทีละ ${step} จนถึง ${product}: ${skipCount(step, answer)} ได้ ${answer} ครั้ง`,
      hint: `นับทีละ ${step} ไปจนถึง ${product} แล้วนับว่ากี่ครั้ง`,
    }
  },
})

const TEMPLATES: Record<Stage, Template[]> = {
  /* เขต 1 · บ้านหลบภัย · แม่ 2 · คูณคือการบวกซ้ำ */
  1: [
    {
      key: 'z1-add',
      min: 2,
      max: 6,
      build: (groups, each) => ({
        text: 'เปลี่ยนการบวกซ้ำเป็นการคูณ',
        visual: { kind: 'add', addend: each, times: groups },
        ...sentenceAsk(groups, each, ''),
        why: `บวก ${each} ซ้ำ ${groups} ครั้ง คือ ${groups} × ${each} = ${groups * each}`,
        hint: `นับว่ามีเลข ${each} กี่ตัว นั่นคือจำนวนกลุ่ม`,
      }),
    },
    exprTemplate('z1-expr'),
    {
      key: 'z1-zombies',
      min: 2,
      max: 8,
      build: (groups, each) => ({
        text: `ซอมบี้ ${groups} ตัว มีพลังตัวละ ${each} พลังรวมเท่าไร?`,
        visual: { kind: 'zombies', count: groups, power: each },
        ...productAsk(groups, each, 'พลัง'),
      }),
    },
    {
      key: 'z1-groups',
      min: 2,
      max: 8,
      build: (groups, each, rng) => {
        const [emoji, name, unit] = pickOf(
          [
            ['🍎', 'แอปเปิล', 'ผล'],
            ['🥚', 'ไข่', 'ฟอง'],
            ['🧦', 'ถุงเท้า', 'ข้าง'],
          ] as const,
          rng,
        )
        return {
          text: `มี ${groups} กลุ่ม กลุ่มละ ${each} ${unit} มี${name}ทั้งหมดกี่${unit}?`,
          visual: { kind: 'groups', groups, each, item: emoji },
          ...productAsk(groups, each, unit),
        }
      },
    },
  ],

  /* เขต 2 · ตลาดเสบียง · แม่ 3 · การคูณกับสิ่งของ */
  2: [
    {
      key: 'z2-medkit',
      min: 2,
      max: 8,
      build: (groups, each) => ({
        text: `ชุดยา ${groups} กล่อง กล่องละ ${each} ขวด มียาทั้งหมดกี่ขวด?`,
        visual: { kind: 'groups', groups, each, item: '💊' },
        ...productAsk(groups, each, 'ขวด'),
      }),
    },
    {
      key: 'z2-cans',
      min: 2,
      max: 8,
      build: (groups, each) => ({
        text: `อาหารกระป๋อง ${groups} แพ็ก แพ็กละ ${each} กระป๋อง เขียนเป็นประโยคการคูณ`,
        visual: { kind: 'groups', groups, each, item: '🥫' },
        ...sentenceAsk(groups, each, 'กระป๋อง'),
      }),
    },
    {
      key: 'z2-price',
      min: 2,
      max: 10,
      build: (groups, each) => ({
        text: `ไฟฉายราคาอันละ ${each} เหรียญ ซื้อ ${groups} อัน ต้องจ่ายกี่เหรียญ?`,
        visual: { kind: 'scene', item: '🔦', count: groups, tag: `อันละ ${each} เหรียญ` },
        ...productAsk(groups, each, 'เหรียญ'),
      }),
    },
    exprTemplate('z2-expr'),
  ],

  /* เขต 3 · โรงเรียนซอมบี้ · แม่ 4 · นับซอมบี้เป็นกลุ่มและเป็นแถว */
  3: [
    {
      key: 'z3-zgroups',
      min: 2,
      max: 7,
      build: (groups, each) => ({
        text: `ซอมบี้ ${groups} กลุ่ม กลุ่มละ ${each} ตัว มีซอมบี้ทั้งหมดกี่ตัว?`,
        visual: { kind: 'groups', groups, each, item: 'Z' },
        ...productAsk(groups, each, 'ตัว'),
      }),
    },
    {
      key: 'z3-desks',
      min: 2,
      max: 7,
      build: (groups, each) => ({
        text: `ซอมบี้นั่งเรียน ${groups} แถว แถวละ ${each} ตัว เขียนเป็นประโยคการคูณ`,
        visual: { kind: 'array', rows: groups, cols: each, item: 'Z' },
        ...sentenceAsk(groups, each, 'ตัว'),
        why: `${groups} แถว แถวละ ${each} ➜ นับทีละแถว: ${skipCount(each, groups)}`,
        hint: 'นับว่ามีกี่แถว แล้วแถวหนึ่งมีกี่ตัว เขียนเป็น แถว × แถวละ',
      }),
    },
    {
      key: 'z3-chairs',
      min: 2,
      max: 10,
      build: (groups, each) => ({
        text: `เก้าอี้ ${groups} ตัว ตัวละ ${each} ขา มีขาเก้าอี้ทั้งหมดกี่ขา?`,
        visual: { kind: 'scene', item: '🪑', count: groups, tag: `ตัวละ ${each} ขา` },
        ...productAsk(groups, each, 'ขา'),
      }),
    },
    exprTemplate('z3-expr'),
    missingTemplate('z3-missing'),
  ],

  /* เขต 4 · ห้องทดลองลับ · แม่ 5 · ใช้การคูณทำภารกิจ */
  4: [
    {
      key: 'z4-cure',
      min: 2,
      max: 10,
      build: (groups, each) => ({
        text: `ผู้ติดเชื้อ 1 คน ต้องใช้ยา ${each} ขวด มีผู้ติดเชื้อ ${groups} คน ต้องใช้ยาทั้งหมดกี่ขวด?`,
        visual: { kind: 'scene', item: 'Z', count: groups, tag: `คนละ ${each} ขวด` },
        ...productAsk(groups, each, 'ขวด'),
      }),
    },
    {
      key: 'z4-tubes',
      min: 2,
      max: 6,
      build: (groups, each) => ({
        text: `หลอดทดลอง ${groups} แถว แถวละ ${each} หลอด เขียนเป็นประโยคการคูณ`,
        visual: { kind: 'array', rows: groups, cols: each, item: '🧪' },
        ...sentenceAsk(groups, each, 'หลอด'),
        why: `${groups} แถว แถวละ ${each} ➜ นับทีละแถว: ${skipCount(each, groups)}`,
        hint: 'นับว่ามีกี่แถว แล้วแถวหนึ่งมีกี่หลอด เขียนเป็น แถว × แถวละ',
      }),
    },
    exprTemplate('z4-expr'),
    missingTemplate('z4-missing'),
  ],

  /* เขต 5 · Z-CURE CENTER · รวมทุกแม่ */
  5: [
    exprTemplate('z5-expr', TABLES),
    missingTemplate('z5-missing', [2, 3, 4, 5], true),
    {
      key: 'z5-leaves',
      min: 2,
      max: 10,
      tables: [10],
      build: (groups, each) => ({
        text: `ใบไม้วิเศษ ${groups} กอง กองละ ${each} ใบ มีทั้งหมดกี่ใบ?`,
        visual: { kind: 'scene', item: '🍃', count: groups, tag: `กองละ ${each} ใบ` },
        ...productAsk(groups, each, 'ใบ'),
        hint: `นับทีละ 10 ไป ${groups} ครั้ง: ${countStart(10, groups)}`,
      }),
    },
    {
      key: 'z5-rescue',
      min: 2,
      max: 8,
      tables: [2, 3, 4, 5],
      build: (groups, each) => ({
        text: `รถพยาบาล ${groups} คัน คันละ ${each} คน ช่วยคนได้ทั้งหมดกี่คน? เขียนเป็นประโยคการคูณ`,
        visual: { kind: 'scene', item: '🚑', count: groups, tag: `คันละ ${each} คน` },
        ...sentenceAsk(groups, each, 'คน'),
      }),
    },
  ],

  /* หน้าประตู Z-CURE CENTER · ภารกิจของ ดร.ซอมโบ */
  boss: [
    {
      key: 'boss-formula',
      min: 2,
      max: 9,
      tables: [2, 3, 4, 5],
      build: (groups, each) => ({
        text: `สูตรยา Z-CURE ต้องผสม ${groups} รอบ รอบละ ${each} หยด ใช้ทั้งหมดกี่หยด? เขียนเป็นประโยคการคูณ`,
        visual: { kind: 'scene', item: '💧', count: groups, tag: `รอบละ ${each} หยด` },
        ...sentenceAsk(groups, each, 'หยด'),
      }),
    },
    missingTemplate('boss-missing', [2, 3, 4, 5], true),
    exprTemplate('boss-expr', TABLES),
    {
      key: 'boss-power',
      min: 2,
      max: 8,
      tables: [2, 3, 4, 5],
      build: (groups, each) => ({
        text: `ผู้ติดเชื้อ ${groups} คน ต้องใช้วัคซีนคนละ ${each} หน่วย ต้องใช้ทั้งหมดกี่หน่วย?`,
        visual: { kind: 'zombies', count: groups, power: each },
        ...productAsk(groups, each, 'หน่วย'),
      }),
    },
  ],
}

/** ช่วงจำนวนกลุ่มของแต่ละระดับ · ง่ายคือไม่เกิน 5 กลุ่ม */
export function groupRange(easy: boolean): [number, number] {
  return easy ? [1, 5] : [2, 10]
}

/** จำนวนชิ้นที่วาดได้มากที่สุดในภาพกลุ่มหรือภาพแถว */
export const MAX_DRAWN = 30

function drawnCount(visual: QVisual): number {
  if (visual.kind === 'groups') return visual.groups * visual.each
  if (visual.kind === 'array') return visual.rows * visual.cols
  return 0
}

export interface MakeOptions {
  easy?: boolean
  /** ลายเซ็นของข้อที่เพิ่งถาม กันข้อเดิมวนกลับมาติด ๆ กัน */
  recent?: string[]
}

export const signatureOf = (q: Question): string => `${q.key}:${q.groups}:${q.each}`

function buildFrom(template: Template, stage: Stage | 'practice', groups: number, each: Table, rng: Rng): Question {
  return { key: template.key, stage, groups, each, product: groups * each, ...template.build(groups, each, rng) }
}

/** สร้างโจทย์ 1 ข้อของเขตนี้ (หรือของ ดร.ซอมโบ) */
export function makeQuestion(stage: Stage, rng: Rng, options: MakeOptions = {}): Question {
  const [low, high] = groupRange(options.easy === true)
  const recent = options.recent ?? []
  let fallback: Question | null = null
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const template = pickOf(TEMPLATES[stage], rng)
    const tables: Table[] = template.tables ?? (stage === 'boss' || ZONE_TABLE[stage] === 0 ? TABLES : [ZONE_TABLE[stage] as Table])
    const each = pickOf(tables, rng)
    const min = Math.max(low, template.min)
    const max = Math.min(high, template.max)
    if (min > max) continue
    const groups = min + Math.floor(rng() * (max - min + 1))
    const q = buildFrom(template, stage, groups, each, rng)
    if (drawnCount(q.visual) > MAX_DRAWN) continue
    fallback = fallback ?? q
    if (!recent.includes(signatureOf(q))) return q
  }
  if (fallback) return fallback
  // แม่แบบทุกอันถูกตัดหมด (ไม่ควรเกิด) ใช้โจทย์คูณตรง ๆ ของแม่ 2 แทน
  return buildFrom(exprTemplate('fallback'), stage, Math.max(1, low), 2, rng)
}

export const TEMPLATE_KEYS: Record<Stage, string[]> = Object.fromEntries(
  Object.entries(TEMPLATES).map(([stage, list]) => [stage, list.map((t) => t.key)]),
) as Record<Stage, string[]>

/* ── โหมดฝึกสูตรคูณ ───────────────────────────────────────── */

export type PracticeTable = Table | 'mix'
export const PRACTICE_LENGTH = 10
export const PRACTICE_PERFECT_BONUS = 5

/**
 * ชุดฝึก 10 ข้อ: คูณตรง ๆ 8 ข้อ และหาตัวไม่ทราบค่า 2 ข้อ (ข้อที่ 5 และ 10)
 * แม่เดียวใช้จำนวนกลุ่ม 1–10 ครบทุกตัวแบบสลับลำดับ เด็กจึงได้ท่องครบทั้งแม่ในรอบเดียว
 * ข้อหา □ ต้องมีอย่างน้อย 2 กลุ่ม ไม่งั้นคำตอบคือ 1 เสมอ
 */
export function buildPracticeSet(table: PracticeTable, rng: Rng): Question[] {
  const expr = exprTemplate('practice-expr')
  const missing = missingTemplate('practice-missing')
  const shuffled = <T>(list: T[]): T[] => {
    const out = list.slice()
    for (let i = out.length - 1; i > 0; i -= 1) {
      const j = Math.floor(rng() * (i + 1))
      ;[out[i], out[j]] = [out[j], out[i]]
    }
    return out
  }
  const counts = Array.from({ length: 10 }, (_, i) => i + 1)
  const pairs: Array<[Table, number]> =
    table === 'mix'
      ? shuffled(TABLES.flatMap((t) => counts.map((g): [Table, number] => [t, g]))).slice(0, PRACTICE_LENGTH)
      : shuffled(counts).map((g): [Table, number] => [table, g])
  const missingSlots = [4, 9]
  for (const slot of missingSlots) {
    if (pairs[slot][1] >= 2) continue
    const swap = pairs.findIndex((pair, i) => pair[1] >= 2 && !missingSlots.includes(i))
    ;[pairs[slot], pairs[swap]] = [pairs[swap], pairs[slot]]
  }
  return pairs.map(([each, groups], i) => buildFrom(missingSlots.includes(i) ? missing : expr, 'practice', groups, each, rng))
}

export function practiceReward(firstTryCorrect: number, total: number): number {
  const correct = Math.max(0, Math.min(total, firstTryCorrect))
  return correct + (total > 0 && correct === total ? PRACTICE_PERFECT_BONUS : 0)
}
