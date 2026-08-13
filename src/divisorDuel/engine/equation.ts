import type { OperatorSymbol } from '../types'

/**
 * ระบบสร้างและคำนวณสมการ
 *
 * ผู้เล่นวางการ์ดเรียงกันเป็นลำดับ เช่น  5 + 2 × 10
 * แล้วเลือกใส่วงเล็บจากการ์ดถุงมือได้  เช่น  (5 + 2) × 10
 *
 * ใช้ลำดับการดำเนินการมาตรฐาน คูณก่อนบวกลบ ตามตัวอย่างบนหน้ากติกาของเกม
 */

export type SlotKind = 'number' | 'operator'

/** ช่องหนึ่งช่องในสมการ ผูกกับการ์ดที่ผู้เล่นวางลงไป */
export interface EquationSlot {
  cardId: string
  kind: SlotKind
  /** มีค่าเมื่อ kind เป็น number */
  value?: number
  /** มีค่าเมื่อ kind เป็น operator (ไม่รวมวงเล็บ) */
  symbol?: Exclude<OperatorSymbol, '(' | ')'>
}

/** ตำแหน่งวงเล็บหนึ่งคู่ อ้างอิงด้วยลำดับของตัวเลขในสมการ */
export interface BracketPair {
  /** การ์ดถุงมือที่ใช้เปิดวงเล็บคู่นี้ */
  cardId: string
  /** ลำดับตัวเลขที่วงเล็บเริ่ม (นับจาก 0) */
  startTerm: number
  /** ลำดับตัวเลขที่วงเล็บจบ */
  endTerm: number
}

export interface Equation {
  slots: EquationSlot[]
  brackets: BracketPair[]
}

export interface ValidationResult {
  isValid: boolean
  /** ข้อความอธิบายด้วยภาษาที่เด็กเข้าใจ ไม่ใช้ศัพท์เทคนิค */
  message: string | null
}

export function createEmptyEquation(): Equation {
  return { slots: [], brackets: [] }
}

/** ตัวเลขทั้งหมดในสมการ เรียงตามลำดับที่วาง */
export function getTerms(equation: Equation): number[] {
  return equation.slots
    .filter((slot) => slot.kind === 'number')
    .map((slot) => slot.value ?? 0)
}

/**
 * ช่องถัดไปต้องเป็นอะไร
 * สมการต้องสลับ ตัวเลข → เครื่องหมาย → ตัวเลข เสมอ
 */
export function getExpectedKind(equation: Equation): SlotKind {
  const last = equation.slots[equation.slots.length - 1]
  if (!last) return 'number'
  return last.kind === 'number' ? 'operator' : 'number'
}

export function canAppend(equation: Equation, kind: SlotKind): boolean {
  return getExpectedKind(equation) === kind
}

export function validate(equation: Equation): ValidationResult {
  const { slots, brackets } = equation

  if (slots.length === 0) {
    return { isValid: false, message: 'ยังไม่ได้วางการ์ดเลย ลองวางตัวเลขก่อนนะ' }
  }

  const first = slots[0]
  const last = slots[slots.length - 1]

  if (first && first.kind !== 'number') {
    return { isValid: false, message: 'สมการต้องเริ่มด้วยตัวเลข' }
  }
  if (last && last.kind !== 'number') {
    return { isValid: false, message: 'สมการต้องจบด้วยตัวเลข' }
  }

  for (let index = 1; index < slots.length; index += 1) {
    const previous = slots[index - 1]
    const current = slots[index]
    if (previous && current && previous.kind === current.kind) {
      return {
        isValid: false,
        message: 'ต้องวางสลับกัน ตัวเลข แล้วเครื่องหมาย แล้วตัวเลข',
      }
    }
  }

  const termCount = getTerms(equation).length

  for (const bracket of brackets) {
    if (
      bracket.startTerm < 0 ||
      bracket.endTerm >= termCount ||
      bracket.startTerm >= bracket.endTerm
    ) {
      return { isValid: false, message: 'ตำแหน่งวงเล็บไม่ถูกต้อง' }
    }
  }

  // วงเล็บซ้อนกันได้ แต่ห้ามคาบเกี่ยวกันแบบครึ่ง ๆ กลาง ๆ
  for (let i = 0; i < brackets.length; i += 1) {
    for (let j = i + 1; j < brackets.length; j += 1) {
      const a = brackets[i]
      const b = brackets[j]
      if (!a || !b) continue

      const aInsideB = a.startTerm >= b.startTerm && a.endTerm <= b.endTerm
      const bInsideA = b.startTerm >= a.startTerm && b.endTerm <= a.endTerm
      const disjoint = a.endTerm < b.startTerm || b.endTerm < a.startTerm

      if (!aInsideB && !bInsideA && !disjoint) {
        return { isValid: false, message: 'วงเล็บคร่อมกันไม่ได้' }
      }
    }
  }

  return { isValid: true, message: null }
}

const PRECEDENCE: Record<string, number> = { '+': 1, '-': 1, '*': 2 }

function applyOperator(left: number, symbol: string, right: number): number {
  if (symbol === '+') return left + right
  if (symbol === '-') return left - right
  return left * right
}

/** คำนวณช่วงของสมการโดยเคารพลำดับการดำเนินการและวงเล็บที่ซ้อนอยู่ภายใน */
function evaluateRange(
  equation: Equation,
  fromTerm: number,
  toTerm: number,
): number {
  const terms = getTerms(equation)
  const operators = equation.slots
    .filter((slot) => slot.kind === 'operator')
    .map((slot) => slot.symbol ?? '+')

  // วงเล็บชั้นในสุดที่อยู่ในช่วงนี้ ต้องคำนวณก่อน
  const inner = equation.brackets
    .filter(
      (bracket) =>
        bracket.startTerm >= fromTerm &&
        bracket.endTerm <= toTerm &&
        !(bracket.startTerm === fromTerm && bracket.endTerm === toTerm),
    )
    .sort((a, b) => a.startTerm - b.startTerm)

  const values: number[] = []
  const symbols: string[] = []

  let cursor = fromTerm
  while (cursor <= toTerm) {
    const bracket = inner.find((item) => item.startTerm === cursor)

    if (bracket) {
      values.push(evaluateRange(equation, bracket.startTerm, bracket.endTerm))
      if (bracket.endTerm < toTerm) {
        symbols.push(operators[bracket.endTerm] ?? '+')
      }
      cursor = bracket.endTerm + 1
    } else {
      values.push(terms[cursor] ?? 0)
      if (cursor < toTerm) symbols.push(operators[cursor] ?? '+')
      cursor += 1
    }
  }

  // คูณก่อน
  for (let index = 0; index < symbols.length; ) {
    if (PRECEDENCE[symbols[index] ?? '+'] === 2) {
      const left = values[index] ?? 0
      const right = values[index + 1] ?? 0
      values.splice(index, 2, applyOperator(left, symbols[index] ?? '*', right))
      symbols.splice(index, 1)
    } else {
      index += 1
    }
  }

  // แล้วค่อยบวกลบจากซ้ายไปขวา
  let accumulator = values[0] ?? 0
  for (let index = 0; index < symbols.length; index += 1) {
    accumulator = applyOperator(
      accumulator,
      symbols[index] ?? '+',
      values[index + 1] ?? 0,
    )
  }

  return accumulator
}

/** พลังโจมตีจากสมการ คืน null เมื่อสมการยังไม่สมบูรณ์ */
export function evaluate(equation: Equation): number | null {
  if (!validate(equation).isValid) return null

  const termCount = getTerms(equation).length
  if (termCount === 0) return null

  return evaluateRange(equation, 0, termCount - 1)
}

/** แปลงสมการเป็นข้อความสำหรับแสดงผล เช่น (5 + 2) × 10 */
export function toDisplayString(equation: Equation): string {
  const symbolText: Record<string, string> = { '+': '+', '-': '−', '*': '×' }
  const terms = getTerms(equation)
  const operators = equation.slots
    .filter((slot) => slot.kind === 'operator')
    .map((slot) => slot.symbol ?? '+')

  const parts: string[] = []

  for (let index = 0; index < terms.length; index += 1) {
    const opens = equation.brackets.filter((b) => b.startTerm === index).length
    const closes = equation.brackets.filter((b) => b.endTerm === index).length

    parts.push('('.repeat(opens) + String(terms[index]) + ')'.repeat(closes))

    if (index < operators.length) {
      parts.push(symbolText[operators[index] ?? '+'] ?? '+')
    }
  }

  return parts.join(' ')
}
