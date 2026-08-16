/**
 * เฉลยแบบทีละขั้น
 *
 * ทำไมต้องมี ทั้งที่มี explanation อยู่แล้ว
 * explanation เดิมเป็นบรรทัดเดียวที่บอก "คำตอบมาจากไหน"
 * ซึ่งช่วยเด็กที่ทำเป็นอยู่แล้วให้ตรวจงานตัวเอง
 * แต่ไม่ช่วยเด็กที่ทำไม่เป็นเลย เพราะไม่ได้บอกว่า "ต้องเริ่มยังไง"
 * เด็กกลุ่มหลังคือกลุ่มที่ต้องการเฉลยมากที่สุด
 *
 * ขั้นตอนในนี้เดินตามวิธีที่สอนในห้องเรียนไทยจริง ๆ
 * คือตั้งหลักให้ตรงกัน แล้วคิดจากหลักหน่วยไปหลักซ้าย มีทดมียืมตามจริง
 * ไม่ใช่การอธิบายด้วยสมบัติทางพีชคณิตซึ่งถูกต้องแต่ใช้ทำข้อสอบไม่ได้
 *
 * ไฟล์นี้ไม่แตะ DOM จึงทดสอบได้ทั้งหมดโดยไม่ต้องเปิดเบราว์เซอร์
 */

import type { Question } from './types'

export interface SolutionStep {
  /** หัวข้อสั้นของขั้นนี้ */
  title: string
  /** คำอธิบายว่าทำอะไร */
  detail: string
}

/** ใส่ลูกน้ำคั่นหลักพัน ให้ตรงกับที่แสดงในตัวโจทย์ */
function fmt(value: number): string {
  return value.toLocaleString('en-US')
}

const PLACE_NAMES = ['หน่วย', 'สิบ', 'ร้อย', 'พัน', 'หมื่น', 'แสน', 'ล้าน']

/** ชื่อหลักที่ตำแหน่งหนึ่ง นับจากขวา เริ่มที่ 0 */
function placeName(index: number): string {
  return PLACE_NAMES[index] ?? `หลักที่ ${index + 1}`
}

/** เลขในหลักหนึ่งของจำนวนหนึ่ง */
function digitAt(value: number, index: number): number {
  return Math.floor(Math.abs(value) / 10 ** index) % 10
}

/** จำนวนหลักของค่าที่มากที่สุด */
function placeCount(...values: number[]): number {
  return Math.max(1, ...values.map((value) => String(Math.abs(value)).length))
}

/**
 * ขั้นตอนการบวก ไล่ทีละหลักพร้อมบอกว่าหลักไหนต้องทด
 *
 * รวมหลายจำนวนได้ ไม่ใช่แค่สองจำนวน เพราะโจทย์ระดับยากมีสามพจน์
 * แต่การไล่ทีละหลักจะทำเฉพาะสองจำนวนแรก แล้วค่อยบวกพจน์ที่เหลือทีเดียว
 * เพราะการไล่หลักของสามจำนวนพร้อมกันอ่านยากกว่าที่จะช่วยให้เข้าใจ
 */
function additionSteps(values: number[]): SolutionStep[] {
  const [a, b, ...rest] = values
  const steps: SolutionStep[] = [
    {
      title: 'ตั้งหลักให้ตรงกัน',
      detail: `เขียน ${fmt(a)} กับ ${fmt(b)} ให้หลักหน่วยตรงกัน แล้วเริ่มบวกจากหลักหน่วยไปทางซ้าย`,
    },
  ]

  let carry = 0
  const total = placeCount(a, b)

  for (let index = 0; index < total; index += 1) {
    const top = digitAt(a, index)
    const bottom = digitAt(b, index)
    const sum = top + bottom + carry
    const keep = sum % 10
    const nextCarry = Math.floor(sum / 10)

    const carryText = carry > 0 ? ` (มีตัวทด ${carry} จากหลักก่อนหน้า)` : ''
    const resultText =
      nextCarry > 0
        ? `ได้ ${sum} เขียน ${keep} แล้วทด ${nextCarry} ไปหลัก${placeName(index + 1)}`
        : `ได้ ${sum} เขียน ${keep}`

    steps.push({
      title: `หลัก${placeName(index)}`,
      detail: `${top} + ${bottom}${carryText} ${resultText}`,
    })

    carry = nextCarry
  }

  if (carry > 0) {
    steps.push({
      title: `หลัก${placeName(total)}`,
      detail: `เหลือตัวทด ${carry} เขียนลงไปได้เลย`,
    })
  }

  const pairSum = a + b
  if (rest.length > 0) {
    const answer = values.reduce((sum, value) => sum + value, 0)
    steps.push({
      title: 'บวกจำนวนที่เหลือ',
      detail: `ได้ ${fmt(pairSum)} แล้วบวก ${rest.map(fmt).join(' + ')} ต่อ ได้ ${fmt(answer)}`,
    })
  } else {
    steps.push({ title: 'คำตอบ', detail: `${fmt(a)} + ${fmt(b)} = ${fmt(pairSum)}` })
  }

  return steps
}

/** ขั้นตอนการลบ ไล่ทีละหลักพร้อมบอกว่าหลักไหนต้องยืม */
function subtractionSteps(left: number, right: number): SolutionStep[] {
  const steps: SolutionStep[] = [
    {
      title: 'ตั้งหลักให้ตรงกัน',
      detail: `เขียน ${fmt(right)} ไว้ใต้ ${fmt(left)} ให้หลักหน่วยตรงกัน แล้วลบจากหลักหน่วยไปทางซ้าย`,
    },
  ]

  let borrow = 0
  const total = placeCount(left, right)

  for (let index = 0; index < total; index += 1) {
    const bottom = digitAt(right, index)
    const topRaw = digitAt(left, index) - borrow

    // บอกด้วยว่าเลขตัวบนถูกยืมไปแล้ว ไม่งั้นเด็กจะงงว่าทำไมเลขไม่ตรงกับที่เห็นในโจทย์
    const borrowedNote = borrow > 0 ? ` (เหลือ ${topRaw} เพราะถูกยืมไป 1)` : ''

    if (topRaw < bottom) {
      steps.push({
        title: `หลัก${placeName(index)}`,
        detail:
          `${topRaw}${borrowedNote} ลบ ${bottom} ไม่ได้ ต้องยืมจากหลัก${placeName(index + 1)} มา 1 ` +
          `กลายเป็น ${topRaw + 10} − ${bottom} = ${topRaw + 10 - bottom}`,
      })
      borrow = 1
    } else {
      steps.push({
        title: `หลัก${placeName(index)}`,
        detail: `${topRaw}${borrowedNote} − ${bottom} = ${topRaw - bottom}`,
      })
      borrow = 0
    }
  }

  steps.push({ title: 'คำตอบ', detail: `${fmt(left)} − ${fmt(right)} = ${fmt(left - right)}` })
  return steps
}

/**
 * ขั้นตอนการคูณ แยกตัวคูณตามหลักแล้วรวมกัน
 * เป็นวิธีเดียวกับที่ครูสอนว่า "คูณทีละหลักแล้วบวกผลลัพธ์"
 */
function multiplicationSteps(left: number, right: number): SolutionStep[] {
  const steps: SolutionStep[] = []
  const parts: number[] = []
  const total = placeCount(right)

  if (total === 1) {
    return [
      {
        title: 'นึกถึงสูตรคูณ',
        detail: `${fmt(left)} × ${right} คือการบวก ${fmt(left)} ทั้งหมด ${right} ครั้ง`,
      },
      { title: 'คำตอบ', detail: `${fmt(left)} × ${right} = ${fmt(left * right)}` },
    ]
  }

  steps.push({
    title: 'แยกตัวคูณตามหลัก',
    detail: `แยก ${fmt(right)} ออกเป็นแต่ละหลักก่อน แล้วคูณทีละหลัก`,
  })

  for (let index = total - 1; index >= 0; index -= 1) {
    const digit = digitAt(right, index)
    if (digit === 0) continue

    const piece = digit * 10 ** index
    const product = left * piece
    parts.push(product)

    steps.push({
      title: `คูณด้วย ${fmt(piece)}`,
      detail: `${fmt(left)} × ${fmt(piece)} = ${fmt(product)}`,
    })
  }

  steps.push({
    title: 'บวกผลลัพธ์ทั้งหมด',
    detail: `${parts.map(fmt).join(' + ')} = ${fmt(left * right)}`,
  })

  return steps
}

/**
 * ขั้นตอนการหาร ใช้การคิดกลับด้วยการคูณ
 *
 * เลือกวิธีนี้แทนการตั้งหารยาว เพราะโจทย์ในเกมนี้หารลงตัวเสมอ
 * และการคิดกลับเป็นวิธีที่เด็กตรวจคำตอบเองได้ทันทีว่าถูกหรือผิด
 * ซึ่งมีค่ากว่าการท่องขั้นตอนตั้งหารยาวที่ยาวกว่าและพลาดง่ายกว่า
 */
function divisionSteps(dividend: number, divisor: number): SolutionStep[] {
  const quotient = dividend / divisor

  return [
    {
      title: 'เปลี่ยนเป็นโจทย์คูณ',
      detail: `${fmt(dividend)} ÷ ${fmt(divisor)} = ? ถามอีกอย่างคือ ${fmt(divisor)} × ? = ${fmt(dividend)}`,
    },
    {
      title: 'ลองหาตัวคูณ',
      detail: `${fmt(divisor)} × ${fmt(quotient)} = ${fmt(dividend)} พอดี`,
    },
    { title: 'คำตอบ', detail: `${fmt(dividend)} ÷ ${fmt(divisor)} = ${fmt(quotient)}` },
  ]
}

/**
 * แยกคำอธิบายบรรทัดเดียวออกเป็นขั้น ๆ
 *
 * ใช้กับโจทย์ที่ยังไม่มีขั้นตอนเฉพาะของตัวเอง เช่น เศษส่วนหรือเรขาคณิต
 * ตัดที่คำเชื่อมที่คนไทยใช้เล่าลำดับจริง ๆ ไม่ได้ตัดตามจำนวนตัวอักษร
 *
 * ยอมรับว่าหยาบกว่าขั้นตอนที่เขียนเอง แต่ดีกว่าไม่มีอะไรเลย
 * และดีกว่าการแสดงข้อความยาวก้อนเดียวซึ่งเด็กจะข้ามไปโดยไม่อ่าน
 */
function splitExplanation(explanation: string): SolutionStep[] {
  const pieces = explanation
    .split(/\s+(?:แล้ว|จากนั้น|ต่อมา|สุดท้าย)\s+/)
    .map((piece) => piece.trim())
    .filter((piece) => piece.length > 0)

  if (pieces.length <= 1) {
    return [{ title: 'วิธีคิด', detail: explanation }]
  }

  return pieces.map((piece, index) => ({
    title: index === pieces.length - 1 ? 'คำตอบ' : `ขั้นที่ ${index + 1}`,
    detail: piece,
  }))
}

/**
 * เฉลยทีละขั้นของโจทย์หนึ่งข้อ
 *
 * คืนอย่างน้อยหนึ่งขั้นเสมอ ไม่มีทางคืนอาเรย์ว่าง
 * เพราะหน้าจอที่ขึ้นหัวข้อ "วิธีคิด" แล้วไม่มีอะไรอยู่ข้างใน
 * ทำให้เด็กคิดว่าแอปพัง มากกว่าคิดว่าโจทย์ข้อนี้ไม่มีเฉลย
 */
export function solutionSteps(question: Question): SolutionStep[] {
  const { operation, operands } = question.metadata

  if (operands && operands.length >= 2) {
    const [first, second] = operands as [number, number]
    const usable = operands.every((value) => Number.isFinite(value))

    if (usable) {
      if (operation === 'add') return additionSteps(operands)
      if (operation === 'subtract') return subtractionSteps(first, second)
      if (operation === 'multiply') return multiplicationSteps(first, second)
      if (operation === 'divide' && second !== 0) return divisionSteps(first, second)
    }
  }

  return splitExplanation(question.explanation)
}
