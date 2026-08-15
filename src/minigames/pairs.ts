/**
 * โรงงานผลิต "คู่ที่ตรงกัน" สำหรับมินิเกม
 *
 * เกมจับคู่ โยงเส้น และลากวาง ต่างต้องการของแบบเดียวกัน
 * คือข้อความสองอันที่มีค่าเท่ากัน เช่น "6 × 7" กับ "42"
 * จึงรวมไว้ที่เดียว ไม่ต้องเขียนซ้ำสามรอบ
 *
 * ข้อสำคัญที่ต้องระวัง: คู่ในกระดานเดียวกันห้ามมี "คำตอบ" ซ้ำกัน
 * ถ้ามีคู่ 2 × 6 กับ 3 × 4 อยู่ด้วยกัน ทั้งคู่ตอบ 12 เหมือนกัน
 * เด็กจะลากเส้นถูกตามความเข้าใจแต่ระบบตัดสินว่าผิด ซึ่งไม่ยุติธรรม
 * ฟังก์ชันในไฟล์นี้จึงกันค่าซ้ำเสมอ
 */

import type { Rng } from '../math/rng'
import type { Grade } from '../questionEngine/types'
import type { SkillId } from '../types/stats'

export interface MathPair {
  /** ฝั่งโจทย์ เช่น "6 × 7" */
  prompt: string
  /** ฝั่งคำตอบ เช่น "42" */
  answer: string
  /** ค่าที่ใช้เทียบว่าซ้ำกันหรือไม่ */
  key: string
}

function multiplicationPair(rng: Rng, grade: Grade): MathPair {
  const max = grade === 4 ? 9 : grade === 5 ? 12 : 15
  const a = rng.int(2, max)
  const b = rng.int(2, max)
  return { prompt: `${a} × ${b}`, answer: `${a * b}`, key: `${a * b}` }
}

function divisionPair(rng: Rng, grade: Grade): MathPair {
  const max = grade === 4 ? 9 : 12
  const b = rng.int(2, max)
  const result = rng.int(2, max)
  return { prompt: `${b * result} ÷ ${b}`, answer: `${result}`, key: `${result}` }
}

function additionPair(rng: Rng, grade: Grade): MathPair {
  const max = grade === 4 ? 99 : grade === 5 ? 499 : 999
  const a = rng.int(10, max)
  const b = rng.int(10, max)
  return { prompt: `${a} + ${b}`, answer: `${a + b}`, key: `${a + b}` }
}

function subtractionPair(rng: Rng, grade: Grade): MathPair {
  const max = grade === 4 ? 99 : grade === 5 ? 499 : 999
  const a = rng.int(20, max)
  const b = rng.int(10, a - 1)
  return { prompt: `${a} − ${b}`, answer: `${a - b}`, key: `${a - b}` }
}

/**
 * เศษส่วนที่ยังไม่ทอน จับคู่กับรูปอย่างต่ำ
 * เป็นการฝึกที่ตรงกับสิ่งที่เด็กมักพลาดที่สุดเรื่องเศษส่วน
 */
function fractionPair(rng: Rng, _grade: Grade): MathPair {
  const base = rng.pick([
    [1, 2],
    [1, 3],
    [2, 3],
    [1, 4],
    [3, 4],
    [1, 5],
    [2, 5],
    [3, 5],
    [4, 5],
    [1, 6],
    [5, 6],
  ] as const)
  const factor = rng.int(2, 4)
  const [n, d] = base
  return {
    prompt: `${n * factor}/${d * factor}`,
    answer: `${n}/${d}`,
    key: `${n}/${d}`,
  }
}

/** เศษส่วนคู่กับทศนิยม เป็นสะพานที่เด็กต้องข้ามให้ได้ */
function decimalPair(rng: Rng, _grade: Grade): MathPair {
  const choice = rng.pick([
    { n: 1, d: 2, text: '0.5' },
    { n: 1, d: 4, text: '0.25' },
    { n: 3, d: 4, text: '0.75' },
    { n: 1, d: 5, text: '0.2' },
    { n: 2, d: 5, text: '0.4' },
    { n: 3, d: 5, text: '0.6' },
    { n: 4, d: 5, text: '0.8' },
    { n: 1, d: 10, text: '0.1' },
    { n: 3, d: 10, text: '0.3' },
    { n: 7, d: 10, text: '0.7' },
    { n: 9, d: 10, text: '0.9' },
  ] as const)
  return {
    prompt: `${choice.n}/${choice.d}`,
    answer: choice.text,
    key: choice.text,
  }
}

/** ร้อยละของจำนวน คู่กับผลลัพธ์ */
function percentagePair(rng: Rng, _grade: Grade): MathPair {
  const percent = rng.pick([10, 20, 25, 50, 75] as const)
  const base = rng.pick([20, 40, 60, 80, 100, 120, 160, 200] as const)
  const value = (base * percent) / 100
  return {
    prompt: `${percent}% ของ ${base}`,
    answer: `${value}`,
    key: `${value}`,
  }
}

/** รูปเรขาคณิตคู่กับพื้นที่ */
function geometryPair(rng: Rng, _grade: Grade): MathPair {
  if (rng.chance(0.5)) {
    const w = rng.int(3, 12)
    const h = rng.int(3, 12)
    return {
      prompt: `สี่เหลี่ยม ${w}×${h}`,
      answer: `${w * h}`,
      key: `${w * h}`,
    }
  }
  const base = rng.int(4, 12) * 2
  const height = rng.int(3, 10)
  return {
    prompt: `สามเหลี่ยม ฐาน ${base} สูง ${height}`,
    answer: `${(base * height) / 2}`,
    key: `${(base * height) / 2}`,
  }
}

/** โจทย์ปัญหาสั้นคู่กับคำตอบ */
function wordProblemPair(rng: Rng, _grade: Grade): MathPair {
  const each = rng.int(3, 12)
  const groups = rng.int(3, 9)
  const thing = rng.pick(['ขนม', 'ดินสอ', 'ลูกอม', 'สมุด', 'สติกเกอร์'] as const)
  return {
    prompt: `${thing} ${each} ชิ้น ${groups} ถุง`,
    answer: `${each * groups}`,
    key: `${each * groups}`,
  }
}

const PAIR_BUILDERS: Record<SkillId, (rng: Rng, grade: Grade) => MathPair> = {
  addition: additionPair,
  subtraction: subtractionPair,
  multiplication: multiplicationPair,
  division: divisionPair,
  fractions: fractionPair,
  decimals: decimalPair,
  percentages: percentagePair,
  geometry: geometryPair,
  wordProblems: wordProblemPair,
}

/**
 * สร้างคู่ที่ไม่ซ้ำค่ากันจำนวน count คู่
 *
 * ถ้าสุ่มชนค่าเดิมจะสุ่มใหม่ ไม่เกิน 60 รอบ
 * ทักษะบางอย่างมีคำตอบให้เลือกไม่มาก เช่น ทศนิยมมีแค่ 11 แบบ
 * ถ้าขอเกินจำนวนที่มีจริง จะคืนเท่าที่หาได้แทนที่จะวนไม่รู้จบ
 */
export function buildPairs(
  rng: Rng,
  grade: Grade,
  skill: SkillId,
  count: number,
): MathPair[] {
  const build = PAIR_BUILDERS[skill] ?? multiplicationPair
  const pairs: MathPair[] = []
  const usedKeys = new Set<string>()
  const usedPrompts = new Set<string>()

  for (let attempt = 0; attempt < 60 && pairs.length < count; attempt += 1) {
    const pair = build(rng, grade)
    if (usedKeys.has(pair.key) || usedPrompts.has(pair.prompt)) continue
    usedKeys.add(pair.key)
    usedPrompts.add(pair.prompt)
    pairs.push(pair)
  }

  return pairs
}
