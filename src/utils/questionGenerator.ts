import { QUESTIONS } from '../data/questions'
import type { Difficulty, Level } from '../types/level'
import type { MathOperation, Question } from '../types/question'

const DIFFICULTY_RANK: Record<Difficulty, number> = {
  easy: 0,
  normal: 1,
  hard: 2,
  boss: 3,
}

export function shuffle<T>(items: readonly T[]): T[] {
  const result = items.slice()
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    const a = result[i]
    const b = result[j]
    result[i] = b
    result[j] = a
  }
  return result
}

function randomInt(min: number, max: number): number {
  const low = Math.ceil(min)
  const high = Math.floor(max)
  return Math.floor(Math.random() * (high - low + 1)) + low
}

/** สร้างตัวเลือกลวง 3 ตัวที่ไม่ซ้ำกันและไม่ซ้ำกับคำตอบจริง */
function buildChoices(answer: number): number[] {
  const choices = new Set<number>([answer])
  const spread = Math.max(2, Math.round(Math.abs(answer) * 0.12))
  let guard = 0

  while (choices.size < 4 && guard < 50) {
    guard += 1
    const offset = randomInt(1, spread) * (Math.random() < 0.5 ? -1 : 1)
    const candidate = answer + offset
    if (candidate >= 0 && candidate !== answer) {
      choices.add(candidate)
    }
  }

  // เผื่อกรณีสุ่มไม่ครบ (เช่นคำตอบเป็นเลขเล็กมาก) ให้เติมแบบคงที่
  let filler = answer + 1
  while (choices.size < 4) {
    if (filler !== answer && filler >= 0) choices.add(filler)
    filler += 1
  }

  return shuffle(Array.from(choices))
}

const OPERATION_SYMBOL: Record<MathOperation, string> = {
  add: '+',
  subtract: '−',
  multiply: '×',
  divide: '÷',
}

/** สร้างโจทย์ใหม่แบบสุ่ม ใช้เมื่อคลังโจทย์ในไฟล์ data มีไม่พอสำหรับด่านนั้น */
export function generateQuestion(
  operation: MathOperation,
  difficulty: Difficulty,
  maxOperand: number,
  index: number,
): Question {
  const cap = Math.max(10, Math.floor(maxOperand))
  let left = randomInt(2, cap)
  let right = randomInt(2, cap)
  let answer: number

  switch (operation) {
    case 'add':
      answer = left + right
      break
    case 'subtract':
      if (right > left) {
        const swap = left
        left = right
        right = swap
      }
      answer = left - right
      break
    case 'multiply':
      left = randomInt(2, Math.min(cap, 12))
      right = randomInt(2, Math.min(cap, 12))
      answer = left * right
      break
    case 'divide': {
      const divisor = randomInt(2, Math.min(cap, 12))
      const quotient = randomInt(2, Math.min(cap, 12))
      left = divisor * quotient
      right = divisor
      answer = quotient
      break
    }
    default:
      answer = left + right
      break
  }

  const symbol = OPERATION_SYMBOL[operation]

  return {
    id: `generated-${operation}-${index}-${left}-${right}`,
    prompt: `${left.toLocaleString('en-US')} ${symbol} ${right.toLocaleString('en-US')} = ?`,
    operation,
    difficulty,
    answer,
    choices: buildChoices(answer),
    explanation: `ลองคิดทีละหลัก: ${left} ${symbol} ${right} = ${answer}`,
  }
}

/**
 * เลือกโจทย์สำหรับหนึ่งด่าน
 * 1. คัดจากคลังโจทย์ตามชนิดการดำเนินการของด่าน
 * 2. เรียงโดยให้ระดับความยากใกล้เคียงด่านมาก่อน แล้วสุ่มลำดับภายในกลุ่ม
 * 3. ถ้ายังไม่ครบจำนวน ให้สร้างโจทย์เพิ่มแบบสุ่ม เกมจึงไม่มีทางโจทย์หมด
 */
export function getQuestionsForLevel(level: Level): Question[] {
  const operations: MathOperation[] =
    level.operations.length > 0 ? level.operations : ['add']
  const targetRank = DIFFICULTY_RANK[level.difficulty]

  const pool = QUESTIONS.filter((question) =>
    operations.includes(question.operation),
  )

  const grouped = new Map<number, Question[]>()
  for (const question of pool) {
    const distance = Math.abs(DIFFICULTY_RANK[question.difficulty] - targetRank)
    const bucket = grouped.get(distance)
    if (bucket) {
      bucket.push(question)
    } else {
      grouped.set(distance, [question])
    }
  }

  const sortedDistances = Array.from(grouped.keys()).sort((a, b) => a - b)
  const selected: Question[] = []

  for (const distance of sortedDistances) {
    if (selected.length >= level.questionCount) break
    const bucket = grouped.get(distance) ?? []
    for (const question of shuffle(bucket)) {
      if (selected.length >= level.questionCount) break
      selected.push(question)
    }
  }

  let fallbackIndex = 0
  while (selected.length < level.questionCount) {
    const operation = operations[fallbackIndex % operations.length] ?? 'add'
    selected.push(
      generateQuestion(
        operation,
        level.difficulty,
        level.maxOperand,
        fallbackIndex,
      ),
    )
    fallbackIndex += 1
  }

  return selected.map(normalizeQuestion)
}

/** ป้องกันข้อมูลผิดพลาด: ตัวเลือกต้องมีคำตอบจริงเสมอ และต้องมี 4 ตัวเลือก */
export function normalizeQuestion(question: Question): Question {
  const distractors = Array.from(new Set(question.choices)).filter(
    (choice) => choice !== question.answer,
  )
  const picked = [question.answer, ...distractors].slice(0, 4)

  let filler = question.answer + 1
  while (picked.length < 4) {
    if (!picked.includes(filler)) picked.push(filler)
    filler += 1
  }

  return { ...question, choices: shuffle(picked) }
}
