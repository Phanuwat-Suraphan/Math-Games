import { roundTo } from '../../math/decimals'
import {
  circleArea,
  isValidTriangle,
  rectangleArea,
  rectanglePerimeter,
  squareArea,
  squarePerimeter,
  triangleArea,
  trianglePerimeter,
  type ShapeId,
} from '../../math/geometry'
import {
  decreaseByPercent,
  increaseByPercent,
  percentOf,
  whatPercent,
} from '../../math/percentages'
import { GEOMETRY_RANGES, PERCENT_BASES, PERCENT_VALUES } from '../difficulty/config'
import {
  geometryDistractors,
  percentageDistractors,
  type DistractorSeed,
} from '../distractors'
import type { GeneratorContext } from '../types'
import type { GeneratedCore } from './arithmetic'

/** โจทย์ร้อยละ เรขาคณิต และโจทย์ปัญหา */

export function generatePercentage(context: GeneratorContext): GeneratedCore {
  const { rng, grade, difficulty } = context
  const percent = rng.pick(PERCENT_VALUES[difficulty])
  const baseRange = PERCENT_BASES[difficulty]

  // ใช้ฐานที่หารด้วย 20 ลงตัว เพื่อให้คำตอบไม่เป็นทศนิยมยาวเกินไป
  const base = rng.int(baseRange.min / 20, baseRange.max / 20) * 20
  const mode = rng.pick(['of', 'whatPercent', 'increase', 'decrease'] as const)

  if (mode === 'whatPercent') {
    const part = roundTo((base * percent) / 100, 2)
    const answer = whatPercent(part, base)

    return {
      prompt: `${part} เป็นกี่เปอร์เซ็นต์ของ ${base}?`,
      correctAnswer: String(roundTo(answer, 2)),
      explanation: `(${part} ÷ ${base}) × 100 = ${roundTo(answer, 2)}%`,
      hint: 'เอาส่วนย่อยหารด้วยจำนวนทั้งหมด แล้วคูณด้วย 100',
      distractors: percentageDistractors(percent, base, answer),
      metadata: { operation: 'whatPercent', steps: 2 },
      tags: ['percentages', 'find-percent', `grade${grade}`],
    }
  }

  if (mode === 'increase') {
    const answer = increaseByPercent(base, percent)
    return {
      prompt: `สินค้าราคา ${base} บาท ขึ้นราคา ${percent}% ราคาใหม่เท่าไร?`,
      correctAnswer: String(roundTo(answer, 2)),
      explanation: `หาส่วนที่เพิ่มก่อน ${percent}% ของ ${base} = ${percentOf(percent, base)} แล้วบวกกลับ ได้ ${roundTo(answer, 2)} บาท`,
      hint: 'หาว่าเพิ่มขึ้นกี่บาทก่อน แล้วค่อยบวกกับราคาเดิม',
      distractors: percentageDistractors(percent, base, answer),
      metadata: { operation: 'increase', steps: 2 },
      tags: ['percentages', 'increase', `grade${grade}`],
    }
  }

  if (mode === 'decrease') {
    const answer = decreaseByPercent(base, percent)
    return {
      prompt: `สินค้าราคา ${base} บาท ลดราคา ${percent}% เหลือราคาเท่าไร?`,
      correctAnswer: String(roundTo(answer, 2)),
      explanation: `ส่วนลด ${percent}% ของ ${base} = ${percentOf(percent, base)} บาท ราคาที่ต้องจ่ายคือ ${base} − ${percentOf(percent, base)} = ${roundTo(answer, 2)} บาท`,
      hint: 'หาว่าลดไปกี่บาทก่อน แล้วเอาราคาเดิมลบออก',
      distractors: percentageDistractors(percent, base, answer),
      metadata: { operation: 'decrease', steps: 2 },
      tags: ['percentages', 'discount', `grade${grade}`],
    }
  }

  const answer = percentOf(percent, base)
  return {
    prompt: `${percent}% ของ ${base} เท่ากับเท่าไร?`,
    correctAnswer: String(roundTo(answer, 2)),
    explanation: `(${percent} ÷ 100) × ${base} = ${roundTo(answer, 2)}`,
    hint: `${percent}% คือ ${percent} ส่วนจาก 100 ส่วน ลองหารด้วย 100 ก่อนแล้วคูณ ${base}`,
    distractors: percentageDistractors(percent, base, answer),
    metadata: { operation: 'percentOf', steps: 2 },
    tags: ['percentages', 'basic', `grade${grade}`],
  }
}

export function generateGeometry(context: GeneratorContext): GeneratedCore {
  const { rng, grade, difficulty } = context
  const range = GEOMETRY_RANGES[difficulty]

  const shapes: ShapeId[] =
    difficulty === 'easy'
      ? ['rectangle', 'square']
      : difficulty === 'medium'
        ? ['rectangle', 'square', 'triangle']
        : ['rectangle', 'square', 'triangle', 'circle']

  const shape = rng.pick(shapes)
  const wantArea = rng.chance(0.6)

  if (shape === 'square') {
    const side = rng.int(range.min, range.max)
    const answer = wantArea ? squareArea(side) : squarePerimeter(side)
    const other = wantArea ? squarePerimeter(side) : squareArea(side)

    return {
      prompt: wantArea
        ? `สี่เหลี่ยมจัตุรัสด้านยาว ${side} เซนติเมตร มีพื้นที่กี่ตารางเซนติเมตร?`
        : `สี่เหลี่ยมจัตุรัสด้านยาว ${side} เซนติเมตร มีเส้นรอบรูปกี่เซนติเมตร?`,
      correctAnswer: String(answer),
      explanation: wantArea
        ? `พื้นที่สี่เหลี่ยมจัตุรัส = ด้าน × ด้าน = ${side} × ${side} = ${answer}`
        : `เส้นรอบรูปสี่เหลี่ยมจัตุรัส = 4 × ด้าน = 4 × ${side} = ${answer}`,
      hint: wantArea ? 'พื้นที่คือด้านคูณด้าน' : 'เส้นรอบรูปคือระยะรอบทั้งสี่ด้านรวมกัน',
      distractors: geometryDistractors(answer, other, 'perimeterAreaSwap'),
      metadata: { geometryShape: 'square', operation: wantArea ? 'area' : 'perimeter', steps: 1 },
      tags: ['geometry', 'square', wantArea ? 'area' : 'perimeter', `grade${grade}`],
    }
  }

  if (shape === 'triangle') {
    const base = rng.int(range.min, range.max)
    const height = rng.int(range.min, range.max)

    if (wantArea) {
      const answer = triangleArea(base, height)
      return {
        prompt: `สามเหลี่ยมฐานยาว ${base} เซนติเมตร สูง ${height} เซนติเมตร มีพื้นที่กี่ตารางเซนติเมตร?`,
        correctAnswer: String(answer),
        explanation: `พื้นที่สามเหลี่ยม = 1/2 × ฐาน × สูง = 1/2 × ${base} × ${height} = ${answer}`,
        hint: 'พื้นที่สามเหลี่ยมคือครึ่งหนึ่งของฐานคูณสูง อย่าลืมหารสองนะ',
        distractors: geometryDistractors(answer, base * height, 'forgotHalf'),
        metadata: { geometryShape: 'triangle', operation: 'area', steps: 2 },
        tags: ['geometry', 'triangle', 'area', `grade${grade}`],
      }
    }

    // สร้างด้านสามด้านที่ประกอบเป็นสามเหลี่ยมได้จริง
    let a = rng.int(range.min, range.max)
    let b = rng.int(range.min, range.max)
    let c = rng.int(range.min, range.max)
    let guard = 0
    while (!isValidTriangle(a, b, c) && guard < 40) {
      guard += 1
      a = rng.int(range.min, range.max)
      b = rng.int(range.min, range.max)
      c = rng.int(Math.max(range.min, Math.abs(a - b) + 1), a + b - 1)
    }
    if (!isValidTriangle(a, b, c)) { a = 3; b = 4; c = 5 }

    const answer = trianglePerimeter(a, b, c)
    return {
      prompt: `สามเหลี่ยมมีด้านยาว ${a}, ${b} และ ${c} เซนติเมตร มีเส้นรอบรูปกี่เซนติเมตร?`,
      correctAnswer: String(answer),
      explanation: `เส้นรอบรูป = ${a} + ${b} + ${c} = ${answer}`,
      hint: 'เส้นรอบรูปคือความยาวด้านทุกด้านรวมกัน',
      distractors: geometryDistractors(answer, a * b, 'perimeterAreaSwap'),
      metadata: { geometryShape: 'triangle', operation: 'perimeter', steps: 1 },
      tags: ['geometry', 'triangle', 'perimeter', `grade${grade}`],
    }
  }

  if (shape === 'circle') {
    const radius = rng.int(Math.max(1, Math.floor(range.min / 2)), Math.max(2, Math.floor(range.max / 4)))
    const answer = circleArea(radius)

    return {
      prompt: `วงกลมรัศมี ${radius} เซนติเมตร มีพื้นที่กี่ตารางเซนติเมตร? (ใช้ π = 3.14)`,
      correctAnswer: String(answer),
      explanation: `พื้นที่วงกลม = π × r × r = 3.14 × ${radius} × ${radius} = ${answer}`,
      hint: 'พื้นที่วงกลมคือ π คูณรัศมียกกำลังสอง',
      distractors: geometryDistractors(answer, roundTo(2 * 3.14 * radius, 2), 'perimeterAreaSwap'),
      metadata: { geometryShape: 'circle', operation: 'area', steps: 2 },
      tags: ['geometry', 'circle', 'area', `grade${grade}`],
    }
  }

  const width = rng.int(range.min, range.max)
  let height = rng.int(range.min, range.max)
  // กันไม่ให้กลายเป็นจัตุรัสทั้งที่โจทย์บอกว่าผืนผ้า
  if (height === width) height = width + 1

  const answer = wantArea ? rectangleArea(width, height) : rectanglePerimeter(width, height)
  const other = wantArea ? rectanglePerimeter(width, height) : rectangleArea(width, height)

  return {
    prompt: wantArea
      ? `สี่เหลี่ยมผืนผ้ากว้าง ${width} เซนติเมตร ยาว ${height} เซนติเมตร มีพื้นที่กี่ตารางเซนติเมตร?`
      : `สี่เหลี่ยมผืนผ้ากว้าง ${width} เซนติเมตร ยาว ${height} เซนติเมตร มีเส้นรอบรูปกี่เซนติเมตร?`,
    correctAnswer: String(answer),
    explanation: wantArea
      ? `พื้นที่ = กว้าง × ยาว = ${width} × ${height} = ${answer}`
      : `เส้นรอบรูป = 2 × (กว้าง + ยาว) = 2 × (${width} + ${height}) = ${answer}`,
    hint: wantArea
      ? 'พื้นที่สี่เหลี่ยมผืนผ้าคือกว้างคูณยาว'
      : 'เส้นรอบรูปคือเดินรอบรูปหนึ่งรอบ = 2 เท่าของกว้างบวกยาว',
    distractors: geometryDistractors(answer, other, 'perimeterAreaSwap'),
    metadata: {
      geometryShape: 'rectangle',
      operation: wantArea ? 'area' : 'perimeter',
      steps: wantArea ? 1 : 2,
    },
    tags: ['geometry', 'rectangle', wantArea ? 'area' : 'perimeter', `grade${grade}`],
  }
}

/** สถานการณ์ของโจทย์ปัญหา เปลี่ยนชื่อและสิ่งของเพื่อไม่ให้เด็กเจอโจทย์เดิมซ้ำ */
const NAMES = ['น้ำใส', 'ก้อง', 'มินท์', 'ภูมิ', 'ปาล์ม', 'ใบเตย', 'ตะวัน', 'พลอย']
const ITEMS = [
  { name: 'ดินสอ', unit: 'แท่ง' },
  { name: 'สมุด', unit: 'เล่ม' },
  { name: 'ส้ม', unit: 'ผล' },
  { name: 'ขนม', unit: 'ชิ้น' },
  { name: 'ลูกอม', unit: 'เม็ด' },
  { name: 'สติกเกอร์', unit: 'ดวง' },
]

export function generateWordProblem(context: GeneratorContext): GeneratedCore {
  const { rng, grade, difficulty } = context
  const name = rng.pick(NAMES)
  const item = rng.pick(ITEMS)

  const scale = difficulty === 'easy' ? 1 : difficulty === 'medium' ? 3 : difficulty === 'hard' ? 8 : 15
  const mode = rng.pick(['buy', 'share', 'remain', 'total'] as const)

  if (mode === 'buy') {
    const price = rng.int(3, 12) * scale
    const quantity = rng.int(2, 9)
    const answer = price * quantity

    return {
      prompt: `ร้านค้าขาย${item.name}${item.unit}ละ ${price} บาท ถ้า${name}ซื้อ ${quantity} ${item.unit} ต้องจ่ายเงินกี่บาท?`,
      correctAnswer: String(answer),
      explanation: `ราคาต่อ${item.unit} × จำนวน = ${price} × ${quantity} = ${answer} บาท`,
      hint: 'ซื้อหลายชิ้นราคาเท่ากัน ใช้การคูณได้เลย',
      distractors: [
        { value: String(price + quantity), strategy: 'wrongOperation' },
        { value: String(answer + price), strategy: 'offByOne' },
        { value: String(answer - price), strategy: 'offByOne' },
        { value: String(Math.abs(price - quantity)), strategy: 'wrongOperation' },
      ] as DistractorSeed[],
      metadata: { operation: 'multiply', steps: 1 },
      tags: ['wordProblems', 'multiplication', 'money', `grade${grade}`],
    }
  }

  if (mode === 'share') {
    const perPerson = rng.int(2, 12)
    const people = rng.int(2, 9)
    const total = perPerson * people

    return {
      prompt: `${name}มี${item.name} ${total} ${item.unit} แบ่งให้เพื่อน ${people} คนเท่า ๆ กัน เพื่อนได้คนละกี่${item.unit}?`,
      correctAnswer: String(perPerson),
      explanation: `${total} ÷ ${people} = ${perPerson} ${item.unit}`,
      hint: 'แบ่งเท่า ๆ กัน ใช้การหาร',
      distractors: [
        { value: String(perPerson + 1), strategy: 'offByOne' },
        { value: String(perPerson - 1), strategy: 'offByOne' },
        { value: String(total - people), strategy: 'wrongOperation' },
        { value: String(total * people), strategy: 'wrongOperation' },
      ] as DistractorSeed[],
      metadata: { operation: 'divide', steps: 1 },
      tags: ['wordProblems', 'division', `grade${grade}`],
    }
  }

  if (mode === 'remain') {
    const start = rng.int(20, 60) * scale
    const given = rng.int(5, Math.max(6, Math.floor(start / 2)))
    const answer = start - given

    return {
      prompt: `แม่ซื้อ${item.name}มา ${start} ${item.unit} แจกให้เพื่อนบ้านไป ${given} ${item.unit} แม่เหลือ${item.name}กี่${item.unit}?`,
      correctAnswer: String(answer),
      explanation: `${start} − ${given} = ${answer} ${item.unit}`,
      hint: 'มีอยู่เท่าไร ให้ไปเท่าไร ที่เหลือใช้การลบ',
      distractors: [
        { value: String(start + given), strategy: 'wrongOperation' },
        { value: String(answer + 10), strategy: 'placeValue' },
        { value: String(answer - 1), strategy: 'offByOne' },
        { value: String(given), strategy: 'wrongOperation' },
      ] as DistractorSeed[],
      metadata: { operation: 'subtract', steps: 1 },
      tags: ['wordProblems', 'subtraction', `grade${grade}`],
    }
  }

  const boxes = rng.int(3, 9)
  const perBox = rng.int(4, 15)
  const extra = rng.int(2, 20)
  const answer = boxes * perBox + extra

  return {
    prompt: `${name}มี${item.name} ${boxes} กล่อง กล่องละ ${perBox} ${item.unit} และมีอีก ${extra} ${item.unit}นอกกล่อง รวมมี${item.name}ทั้งหมดกี่${item.unit}?`,
    correctAnswer: String(answer),
    explanation: `ในกล่องมี ${boxes} × ${perBox} = ${boxes * perBox} ${item.unit} รวมกับนอกกล่องอีก ${extra} ได้ ${answer} ${item.unit}`,
    hint: 'คิดของในกล่องก่อนด้วยการคูณ แล้วค่อยบวกส่วนที่อยู่นอกกล่อง',
    distractors: [
      { value: String(boxes * perBox), strategy: 'wrongOperation' },
      { value: String((boxes + extra) * perBox), strategy: 'wrongOperation' },
      { value: String(boxes + perBox + extra), strategy: 'wrongOperation' },
      { value: String(answer + perBox), strategy: 'offByOne' },
    ] as DistractorSeed[],
    metadata: { operation: 'mixed', steps: 2 },
    tags: ['wordProblems', 'mixed', `grade${grade}`],
  }
}
