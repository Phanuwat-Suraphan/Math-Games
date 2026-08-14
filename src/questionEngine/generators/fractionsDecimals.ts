import {
  addFractions,
  compareFractions,
  formatFraction,
  makeFraction,
  simplifyFraction,
  subtractFractions,
  type Fraction,
} from '../../math/fractions'
import {
  addDecimals,
  decimalPlaces,
  formatDecimal,
  multiplyDecimals,
  roundTo,
  subtractDecimals,
} from '../../math/decimals'
import { DECIMAL_CONFIG, FRACTION_DENOMINATORS } from '../difficulty/config'
import { decimalDistractors, fractionDistractors, type DistractorSeed } from '../distractors'
import type { GeneratorContext } from '../types'
import type { GeneratedCore } from './arithmetic'

/** โจทย์เศษส่วนและทศนิยม */

type FractionMode = 'add' | 'subtract' | 'compare' | 'equivalent'

function pickDenominator(context: GeneratorContext): number {
  return context.rng.pick(FRACTION_DENOMINATORS[context.difficulty])
}

export function generateFraction(context: GeneratorContext): GeneratedCore {
  const { rng, grade, difficulty } = context

  // ระดับง่ายเน้นบวกลบตัวส่วนเดียวกันก่อน ค่อยขยับไปเทียบและเศษส่วนเท่ากัน
  const modes: FractionMode[] =
    difficulty === 'easy'
      ? ['add', 'subtract', 'compare']
      : ['add', 'subtract', 'compare', 'equivalent']
  const mode = rng.pick(modes)

  if (mode === 'equivalent') return equivalentFraction(context)
  if (mode === 'compare') return compareFraction(context)

  const sameDenominator = difficulty === 'easy' || rng.chance(0.4)
  const denominatorA = pickDenominator(context)
  const denominatorB = sameDenominator ? denominatorA : pickDenominator(context)

  const a = makeFraction(rng.int(1, Math.max(1, denominatorA - 1)), denominatorA)
  const b = makeFraction(rng.int(1, Math.max(1, denominatorB - 1)), denominatorB)

  if (mode === 'subtract') {
    // จัดให้ตัวตั้งมากกว่าเสมอ เด็กประถมยังไม่เจอเศษส่วนติดลบ
    const [big, small] = compareFractions(a, b) >= 0 ? [a, b] : [b, a]
    const answer = subtractFractions(big, small)
    if (answer.numerator === 0) {
      // ผลลบเป็นศูนย์ทำให้ตัวเลือกลวงหมดความหมาย เปลี่ยนเป็นโจทย์บวกแทน
      return buildFractionAdd(context, a, b)
    }

    return {
      prompt: `${formatFraction(big)} − ${formatFraction(small)} = ?`,
      correctAnswer: formatFraction(answer),
      explanation:
        big.denominator === small.denominator
          ? `ตัวส่วนเท่ากัน ลบเฉพาะตัวเศษ ${big.numerator} − ${small.numerator} = ${big.numerator - small.numerator} ได้ ${formatFraction(answer)}`
          : `ทำตัวส่วนให้เท่ากันก่อน แล้วลบตัวเศษ ได้ ${formatFraction(answer)}`,
      hint:
        big.denominator === small.denominator
          ? 'ตัวส่วนเท่ากันแล้ว ลบแค่ตัวเศษ ตัวส่วนคงเดิม'
          : 'หาตัวส่วนร่วมก่อน แล้วค่อยลบตัวเศษ',
      distractors: fractionDistractors(big, { numerator: -small.numerator, denominator: small.denominator }, answer),
      metadata: {
        fractionType: big.denominator === small.denominator ? 'same-denominator' : 'different-denominator',
        operation: 'subtract',
        steps: big.denominator === small.denominator ? 1 : 2,
      },
      tags: ['fractions', 'subtraction', `grade${grade}`],
    }
  }

  return buildFractionAdd(context, a, b)
}

function buildFractionAdd(
  context: GeneratorContext,
  a: Fraction,
  b: Fraction,
): GeneratedCore {
  const answer = addFractions(a, b)
  const same = a.denominator === b.denominator

  return {
    prompt: `${formatFraction(a)} + ${formatFraction(b)} = ?`,
    correctAnswer: formatFraction(answer),
    explanation: same
      ? `ตัวส่วนเท่ากัน บวกเฉพาะตัวเศษ ${a.numerator} + ${b.numerator} = ${a.numerator + b.numerator} ได้ ${formatFraction(answer)}`
      : `ทำตัวส่วนให้เท่ากันเป็น ${a.denominator * b.denominator} ก่อน แล้วบวกตัวเศษ ได้ ${formatFraction(answer)}`,
    hint: same
      ? 'ตัวส่วนเท่ากันแล้ว บวกแค่ตัวเศษ ตัวส่วนไม่ต้องบวกนะ'
      : 'ตัวส่วนไม่เท่ากัน ต้องทำให้เท่ากันก่อนถึงจะบวกได้',
    distractors: fractionDistractors(a, b, answer),
    metadata: {
      fractionType: same ? 'same-denominator' : 'different-denominator',
      operation: 'add',
      steps: same ? 1 : 2,
    },
    tags: ['fractions', 'addition', `grade${context.grade}`],
  }
}

function compareFraction(context: GeneratorContext): GeneratedCore {
  const { rng, grade } = context

  let a = makeFraction(1, 2)
  let b = makeFraction(1, 3)
  let guard = 0

  // สุ่มจนได้คู่ที่ไม่เท่ากัน ไม่งั้นคำถาม "อันไหนมากกว่า" จะไม่มีคำตอบ
  do {
    guard += 1
    const denominatorA = pickDenominator(context)
    const denominatorB = pickDenominator(context)
    a = makeFraction(rng.int(1, Math.max(1, denominatorA - 1)), denominatorA)
    b = makeFraction(rng.int(1, Math.max(1, denominatorB - 1)), denominatorB)
  } while (compareFractions(a, b) === 0 && guard < 30)

  const bigger = compareFractions(a, b) > 0 ? a : b
  const smaller = compareFractions(a, b) > 0 ? b : a

  const distractors: DistractorSeed[] = [
    { value: formatFraction(smaller), strategy: 'wrongOperation' },
    { value: formatFraction(addFractions(a, b)), strategy: 'addedDenominators' },
    {
      value: formatFraction(makeFraction(bigger.numerator + 1, bigger.denominator)),
      strategy: 'nearMiss',
    },
  ]

  return {
    prompt: `${formatFraction(a)} กับ ${formatFraction(b)} จำนวนใดมากกว่า?`,
    correctAnswer: formatFraction(bigger),
    explanation: `เทียบโดยคูณไขว้: ${a.numerator} × ${b.denominator} = ${a.numerator * b.denominator} และ ${b.numerator} × ${a.denominator} = ${b.numerator * a.denominator} จึงได้ว่า ${formatFraction(bigger)} มากกว่า`,
    hint: 'ทำตัวส่วนให้เท่ากันก่อน หรือใช้วิธีคูณไขว้เปรียบเทียบก็ได้',
    distractors,
    metadata: { fractionType: 'comparison', operation: 'compare', steps: 1 },
    tags: ['fractions', 'comparison', `grade${grade}`],
  }
}

function equivalentFraction(context: GeneratorContext): GeneratedCore {
  const { rng, grade } = context

  const denominator = pickDenominator(context)
  const numerator = rng.int(1, Math.max(1, denominator - 1))
  const base = simplifyFraction(makeFraction(numerator, denominator))
  const factor = rng.int(2, 4)

  const targetDenominator = base.denominator * factor
  const answer = base.numerator * factor

  const distractors: DistractorSeed[] = [
    { value: String(base.numerator), strategy: 'nearMiss' },
    { value: String(answer + 1), strategy: 'offByOne' },
    { value: String(answer - 1), strategy: 'offByOne' },
    { value: String(base.numerator + factor), strategy: 'wrongOperation' },
    { value: String(targetDenominator - answer), strategy: 'wrongOperation' },
  ]

  return {
    prompt: `${formatFraction(base)} = ?/${targetDenominator} — ตัวเศษที่หายไปคือเท่าไร?`,
    correctAnswer: String(answer),
    explanation: `ตัวส่วนคูณ ${factor} จาก ${base.denominator} เป็น ${targetDenominator} ตัวเศษต้องคูณ ${factor} ด้วย จึงได้ ${base.numerator} × ${factor} = ${answer}`,
    hint: `ดูว่าตัวส่วนถูกคูณด้วยเท่าไร แล้วคูณตัวเศษด้วยจำนวนเดียวกัน`,
    distractors,
    metadata: { fractionType: 'equivalent', operation: 'equivalent', steps: 1 },
    tags: ['fractions', 'equivalent', `grade${grade}`],
  }
}

export function generateDecimal(context: GeneratorContext): GeneratedCore {
  const { rng, grade, difficulty } = context
  const config = DECIMAL_CONFIG[difficulty]
  const places = config.places

  const makeValue = (): number => {
    const whole = rng.int(config.whole.min, config.whole.max)
    const fractionPart = rng.int(1, 10 ** places - 1)
    return roundTo(whole + fractionPart / 10 ** places, places)
  }

  const mode = rng.pick(['add', 'subtract', 'compare', 'multiply'] as const)

  if (mode === 'compare') {
    let a = makeValue()
    let b = makeValue()
    let guard = 0
    while (a === b && guard < 20) { b = makeValue(); guard += 1 }

    const bigger = Math.max(a, b)
    return {
      prompt: `${formatDecimal(a, places)} กับ ${formatDecimal(b, places)} จำนวนใดมากกว่า?`,
      correctAnswer: formatDecimal(bigger, places),
      explanation: `เทียบหลักจำนวนเต็มก่อน ถ้าเท่ากันค่อยเทียบทศนิยมทีละตำแหน่ง จึงได้ว่า ${formatDecimal(bigger, places)} มากกว่า`,
      hint: 'เทียบจำนวนเต็มก่อน แล้วค่อยเทียบทศนิยมตำแหน่งแรก ตำแหน่งที่สอง ไปเรื่อย ๆ',
      distractors: [
        { value: formatDecimal(Math.min(a, b), places), strategy: 'wrongOperation' },
        { value: formatDecimal(roundTo(bigger * 10, places), places), strategy: 'decimalPlace' },
        { value: formatDecimal(roundTo(bigger + 0.1, places), places), strategy: 'nearMiss' },
      ],
      metadata: { operation: 'compare', decimalPlaces: places, steps: 1 },
      tags: ['decimals', 'comparison', `grade${grade}`],
    }
  }

  if (mode === 'multiply') {
    const value = makeValue()
    const factor = rng.int(2, 9)
    const answer = roundTo(multiplyDecimals(value, factor), places)

    return {
      prompt: `${formatDecimal(value, places)} × ${factor} = ?`,
      correctAnswer: formatDecimal(answer, places),
      explanation: `คูณเหมือนจำนวนเต็มก่อน แล้วใส่จุดทศนิยม ${places} ตำแหน่ง ได้ ${formatDecimal(answer, places)}`,
      hint: `คูณโดยไม่สนจุดก่อน แล้วนับทศนิยมให้ได้ ${places} ตำแหน่ง`,
      distractors: decimalDistractors(value, factor, answer, places),
      metadata: { operation: 'multiply', decimalPlaces: places, steps: 2 },
      tags: ['decimals', 'multiplication', `grade${grade}`],
    }
  }

  const a = makeValue()
  const b = makeValue()

  if (mode === 'subtract') {
    const [big, small] = a >= b ? [a, b] : [b, a]
    const answer = roundTo(subtractDecimals(big, small), places)

    return {
      prompt: `${formatDecimal(big, places)} − ${formatDecimal(small, places)} = ?`,
      correctAnswer: formatDecimal(answer, places),
      explanation: `เขียนให้จุดทศนิยมตรงกันแล้วลบ ได้ ${formatDecimal(answer, places)}`,
      hint: 'เขียนเลขให้จุดทศนิยมตรงกันก่อนลบเสมอ',
      distractors: decimalDistractors(big, small, answer, places),
      metadata: { operation: 'subtract', decimalPlaces: places, steps: 1 },
      tags: ['decimals', 'subtraction', `grade${grade}`],
    }
  }

  const answer = roundTo(addDecimals(a, b), places)
  return {
    prompt: `${formatDecimal(a, places)} + ${formatDecimal(b, places)} = ?`,
    correctAnswer: formatDecimal(answer, places),
    explanation: `เขียนให้จุดทศนิยมตรงกันแล้วบวก ได้ ${formatDecimal(answer, places)}`,
    hint: 'เขียนเลขให้จุดทศนิยมตรงกันก่อนบวกเสมอ',
    distractors: decimalDistractors(a, b, answer, Math.max(places, decimalPlaces(answer))),
    metadata: { operation: 'add', decimalPlaces: places, steps: 1 },
    tags: ['decimals', 'addition', `grade${grade}`],
  }
}
