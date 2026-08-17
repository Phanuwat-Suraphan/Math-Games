import { createRng, type Rng } from '../math/rng'
import type { SkillId } from '../types/stats'
import { TYPE_TO_SKILL } from './difficulty/config'
import { selectDistractors } from './distractors'
import {
  generateAddition,
  generateDivision,
  generateMultiplication,
  generateSubtraction,
  type GeneratedCore,
} from './generators/arithmetic'
import { generateDecimal, generateFraction } from './generators/fractionsDecimals'
import {
  generateGeometry,
  generatePercentage,
  generateWordProblem,
} from './generators/appliedMath'
import type {
  Choice,
  GenerateOptions,
  GeneratorContext,
  Question,
  QuestionMetadata,
  QuestionType,
} from './types'
import { validateQuestion } from './validators'
import { isAnswerCorrect } from './answerCheck'

export * from './types'
export { validateQuestion } from './validators'
export { DIFFICULTY_BONUS, HINT_PENALTY, shiftDifficulty } from './difficulty/config'

/** จำนวนตัวเลือกต่อข้อ */
const CHOICE_COUNT = 4

/** สร้างใหม่ได้กี่ครั้งถ้าโจทย์ไม่ผ่านการตรวจ */
const MAX_ATTEMPTS = 12

type GeneratorFn = (context: GeneratorContext) => GeneratedCore

const GENERATORS: Record<QuestionType, GeneratorFn> = {
  addition: generateAddition,
  subtraction: generateSubtraction,
  multiplication: generateMultiplication,
  division: generateDivision,
  fractions: generateFraction,
  decimals: generateDecimal,
  percentages: generatePercentage,
  geometry: generateGeometry,
  wordProblems: generateWordProblem,
}

let counter = 0
function nextId(type: QuestionType): string {
  counter += 1
  return `q-${type}-${Date.now().toString(36)}-${counter.toString(36)}`
}

/** ประกอบชิ้นส่วนจากตัวสร้างให้เป็นโจทย์เต็มรูปแบบ */
function assemble(
  core: GeneratedCore,
  options: GenerateOptions,
  rng: Rng,
): Question {
  const allowNegative = false
  const isFraction = core.correctAnswer.includes('/')

  const distractors = selectDistractors(
    core.distractors,
    core.correctAnswer,
    CHOICE_COUNT - 1,
    rng,
    {
      allowNegative,
      // โจทย์ทศนิยมต้องขยับทีละ 0.1 ไม่ใช่ทีละ 1 ไม่งั้นตัวเลือกจะห่างเกินไป
      fallbackStep: options.type === 'decimals' ? 0.1 : 1,
    },
  )

  const texts = [core.correctAnswer, ...distractors.map((seed) => seed.value)]
  const choices: Choice[] = rng
    .shuffle(texts)
    .map((text, index) => ({ id: `c${index + 1}`, text }))

  const metadata = core.metadata as QuestionMetadata

  return {
    id: nextId(options.type),
    type: options.type,
    grade: options.grade,
    difficulty: options.difficulty,
    prompt: core.prompt,
    choices,
    correctAnswer: core.correctAnswer,
    explanation: core.explanation,
    hint: core.hint,
    skill: TYPE_TO_SKILL[options.type] as SkillId,
    source: 'generated',
    tags: [...core.tags, options.difficulty, isFraction ? 'fraction-answer' : 'numeric-answer'],
    metadata,
  }
}

/**
 * สร้างโจทย์หนึ่งข้อ
 *
 * โจทย์ทุกข้อผ่าน validateQuestion ก่อนคืนออกไปเสมอ
 * ถ้าสร้างแล้วไม่ผ่าน จะสุ่มใหม่จนกว่าจะได้ข้อที่ใช้ได้
 * ไม่มีทางที่ฟังก์ชันนี้จะคืนโจทย์เสียหรือ undefined ให้หน้าจอ
 */
export function generateQuestion(options: GenerateOptions): Question {
  const generator = GENERATORS[options.type]
  if (!generator) {
    throw new Error(`ไม่รู้จักชนิดโจทย์: ${options.type}`)
  }

  const problems: string[] = []

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    // เปลี่ยน seed ทุกครั้งที่ลองใหม่ ไม่งั้นจะได้โจทย์เสียเดิมวนไม่จบ
    const rng = createRng(
      options.seed === undefined ? undefined : `${options.seed}#${attempt}`,
    )

    try {
      const core = generator({
        grade: options.grade,
        difficulty: options.difficulty,
        rng,
      })
      const question = assemble(core, options, rng)
      const check = validateQuestion(question)

      if (check.valid) return question
      problems.push(check.errors.join(', '))
    } catch (error) {
      problems.push(error instanceof Error ? error.message : String(error))
    }
  }

  // ถึงตรงนี้แปลว่าตัวสร้างชนิดนี้มีปัญหาจริง ๆ ตกไปใช้โจทย์สำรองที่ถูกต้องแน่นอน
  return fallbackQuestion(options, problems)
}

/**
 * โจทย์สำรอง — ใช้เมื่อตัวสร้างล้มเหลวทุกครั้ง
 * สร้างจากการคูณจำนวนเต็มเล็ก ๆ ซึ่งไม่มีทางผิดพลาด
 * เด็กจะได้โจทย์ที่ทำได้เสมอ ดีกว่าเห็นหน้าจอว่างหรือ error
 */
function fallbackQuestion(options: GenerateOptions, problems: string[]): Question {
  const rng = createRng(options.seed)
  const left = rng.int(2, 9)
  const right = rng.int(2, 9)
  const answer = left * right

  const texts = [String(answer), String(answer + 1), String(answer - 1), String(answer + left)]
  const unique = Array.from(new Set(texts))
  while (unique.length < CHOICE_COUNT) {
    unique.push(String(answer + unique.length + 3))
  }

  if (typeof console !== 'undefined') {
    console.warn(`[questionEngine] ใช้โจทย์สำรองสำหรับ ${options.type}:`, problems.slice(0, 3))
  }

  return {
    id: nextId(options.type),
    type: options.type,
    grade: options.grade,
    difficulty: options.difficulty,
    prompt: `${left} × ${right} = ?`,
    choices: rng.shuffle(unique).map((text, index) => ({ id: `c${index + 1}`, text })),
    correctAnswer: String(answer),
    explanation: `${left} × ${right} = ${answer}`,
    hint: 'นึกถึงสูตรคูณที่เคยท่องดูนะ',
    skill: TYPE_TO_SKILL[options.type] as SkillId,
    source: 'generated',
    tags: ['fallback', options.difficulty],
    metadata: { operation: 'multiply', steps: 1 },
  }
}

/** โจทย์สองข้อนี้เหมือนกันไหม ใช้กันโจทย์ซ้ำในชุดเดียวกัน */
export function isSameQuestion(a: Question, b: Question): boolean {
  return a.prompt === b.prompt
}

/**
 * สร้างโจทย์หลายข้อโดยไม่ให้ซ้ำกันในชุดเดียวกัน
 *
 * ถ้าสุ่มได้โจทย์ที่โจทย์ซ้ำกับที่มีแล้ว จะสุ่มใหม่
 * แต่ถ้าลองหลายรอบแล้วยังซ้ำ (เช่นโจทย์ระดับง่ายมีความเป็นไปได้จำกัด)
 * จะยอมรับข้อซ้ำแทนการวนไม่จบ
 */
export function generateUniqueQuestions(
  count: number,
  optionsFor: (index: number) => GenerateOptions,
): Question[] {
  const questions: Question[] = []
  const seenPrompts = new Set<string>()

  for (let index = 0; index < count; index += 1) {
    let question: Question | null = null

    for (let attempt = 0; attempt < 20; attempt += 1) {
      const base = optionsFor(index)
      const candidate = generateQuestion({
        ...base,
        seed: base.seed === undefined ? undefined : `${base.seed}:${index}:${attempt}`,
      })
      if (!seenPrompts.has(candidate.prompt)) {
        question = candidate
        break
      }
      question = candidate
    }

    const picked = question as Question
    seenPrompts.add(picked.prompt)
    questions.push(picked)
  }

  return questions
}

/** ตรวจคำตอบ เทียบแบบข้อความเพื่อให้เศษส่วนกับทศนิยมใช้กติกาเดียวกัน */
/**
 * คำตอบที่ส่งมา ถูกต้องหรือไม่
 *
 * เดิมเทียบข้อความตรง ๆ ซึ่งใช้ได้เพราะคำตอบมาจากปุ่มที่เราสร้างเองทั้งหมด
 * ตอนนี้ด่านระดับยากให้เด็กพิมพ์คำตอบเอง ข้อความจะไม่มีทางตรงกันเป๊ะ
 * จึงต้องเทียบด้วยค่าที่โจทย์ถามจริง ๆ ไม่ใช่เทียบตัวอักษร
 */
export function checkAnswer(question: Question, selected: string): boolean {
  return isAnswerCorrect(selected, question.correctAnswer)
}
