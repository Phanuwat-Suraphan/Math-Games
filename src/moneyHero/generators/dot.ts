import type { AmountQ, ChoiceQ, Difficulty, MatchQ, NumberQ } from '../engine/types'
import { commas, formatBS, formatDot, splitSatang, toSatang, twoDigits } from '../utils/money'
import { int, pick, shuffle, uid } from '../utils/random'
import { bahtRange, buildOptions, hint, randomAmount, randomSatangPart } from './common'

/**
 * ด่าน 3: การเขียนแสดงจำนวนเงินแบบใช้จุด
 * หลักสำคัญ: หน้าจุดคือบาท หลังจุดคือสตางค์ และต้องมี 2 หลักเสมอ
 */

function dotSteps(value: number): string[] {
  const { baht, satang } = splitSatang(value)
  return [
    `หน้าจุดเขียนจำนวนบาท: ${commas(baht)}`,
    `หลังจุดเขียนสตางค์ให้ครบ 2 หลัก: ${twoDigits(satang)}${satang === 0 ? ' (ไม่มีสตางค์ก็ต้องเขียน 00)' : ''}`,
    `${formatBS(value)} = ${formatDot(value)}`,
  ]
}

function dotAmount(d: Difficulty): number {
  const [lo, hi] = bahtRange(d)
  // ให้มีโจทย์ "ไม่มีสตางค์" บ้าง เพื่อฝึกเขียน .00
  return randomAmount(Math.max(1, Math.floor(lo / 2)), hi, d, true)
}

/** เขียนจำนวนเงินแบบใช้จุด (เครื่องเขียนราคา) */
export function generateDotWriteQuestion(d: Difficulty): AmountQ {
  const value = dotAmount(d)
  const { baht } = splitSatang(value)
  return {
    id: uid(),
    gen: 'dotWrite',
    kind: 'amount',
    input: 'dot',
    skill: 'dot',
    difficulty: d,
    title: 'เขียนจำนวนเงินนี้แบบใช้จุด',
    visual: { type: 'big', text: formatBS(value), sub: 'เขียนแบบใช้จุด เช่น 25.50' },
    answer: value,
    npc: 'rabbit',
    hint: hint(
      'หน้าจุดคือ "บาท" หลังจุดคือ "สตางค์" และสตางค์ต้องมี 2 หลัก',
      'แยกบาทกับสตางค์ลงตาราง',
      [`หน้าจุด: ${commas(baht)}`],
      { type: 'split', value },
    ),
    explain: dotSteps(value),
  }
}

/** อ่านจำนวนเงินแบบใช้จุด แล้วเขียนเป็นบาทกับสตางค์ */
export function generateDotReadQuestion(d: Difficulty): AmountQ {
  const value = dotAmount(d)
  const { baht, satang } = splitSatang(value)
  return {
    id: uid(),
    gen: 'dotRead',
    kind: 'amount',
    input: 'bs',
    skill: 'dot',
    difficulty: d,
    title: 'เปลี่ยนเป็นบาทกับสตางค์',
    visual: { type: 'big', text: formatDot(value), sub: 'ป้ายราคา' },
    answer: value,
    npc: 'rabbit',
    hint: hint(
      'ตัวเลขหน้าจุดคือบาท ตัวเลขหลังจุดคือสตางค์',
      'แยกเลขหน้าจุดกับหลังจุด',
      [`หน้าจุด ${commas(baht)} → ${commas(baht)} บาท`],
      { type: 'split', value },
    ),
    explain: [
      `${formatDot(value)}: หน้าจุดคือ ${commas(baht)} บาท`,
      `หลังจุดคือ ${twoDigits(satang)} → ${satang} สตางค์`,
      `ดังนั้น ${formatDot(value)} = ${formatBS(value)}`,
    ],
  }
}

/** จับคู่แบบบาท–สตางค์ กับแบบใช้จุด */
export function generateDotMatchQuestion(d: Difficulty): MatchQ {
  const n = d === 1 ? 3 : 4
  const values = new Set<number>()
  // ระดับยาก: ใส่ตัวลวงที่ตัวเลขคล้ายกัน เช่น 8.25 กับ 8.50
  if (d >= 2) {
    const base = int(2, d === 2 ? 99 : 999)
    values.add(toSatang(base, 25))
    values.add(toSatang(base, 50))
  }
  let guard = 0
  while (values.size < n && guard < 100) {
    values.add(dotAmount(d))
    guard += 1
  }
  const list = Array.from(values)
  const pairs = list.map((v, i) => ({
    id: `m${i}`,
    left: { label: formatBS(v) },
    right: { label: formatDot(v) },
  }))
  return {
    id: uid(),
    gen: 'dotMatch',
    kind: 'match',
    skill: 'dot',
    difficulty: d,
    title: 'จับคู่จำนวนเงินที่เท่ากัน',
    pairs,
    rightOrder: shuffle(pairs.map((p) => p.id)),
    npc: 'rabbit',
    hint: hint(
      'หาเลขบาทที่ตรงกันก่อน แล้วดูสตางค์หลังจุด',
      'ตัวอย่างการแปลง',
      [`${formatBS(list[0])} = ${formatDot(list[0])}`],
      { type: 'split', value: list[0] },
    ),
    explain: list.map((v) => `${formatBS(v)} = ${formatDot(v)}`),
  }
}

/** ข้อใดเขียนแบบใช้จุดได้ถูกต้อง */
export function generateDotChoiceQuestion(d: Difficulty): ChoiceQ {
  const value = dotAmount(d)
  const { baht, satang } = splitSatang(value)
  // ตัวลวงทุกตัว "มีค่าต่างจากคำตอบจริง" จึงไม่มีข้อที่กำกวม
  const distractors: string[] = []
  if (satang > 0) {
    distractors.push(formatDot(toSatang(satang, baht % 100))) // สลับบาทกับสตางค์
    if (satang % 10 === 0) distractors.push(`${commas(baht)}.0${satang / 10} บาท`) // 25.05
    distractors.push(`${commas(baht * 100 + satang)}.00 บาท`) // 2,550.00
  } else {
    distractors.push(formatDot(toSatang(Math.floor(baht / 10) || 1, 0)))
    distractors.push(`${commas(baht)}.10 บาท`)
    distractors.push(formatDot(toSatang(baht * 10, 0)))
  }
  const { options, answerId } = buildOptions(formatDot(value), distractors, 4, () =>
    formatDot(value + pick([100, 1000, 25, 50]) * pick([1, 2])),
  )
  return {
    id: uid(),
    gen: 'dotChoice',
    kind: 'choice',
    skill: 'dot',
    difficulty: d,
    title: `${formatBS(value)} เขียนแบบใช้จุดได้อย่างไร?`,
    layout: 'list',
    options,
    answer: answerId,
    npc: 'rabbit',
    hint: hint(
      'จำไว้ว่าหลังจุดต้องเป็นสตางค์ 2 หลัก',
      'ตารางบาท | สตางค์',
      [`หน้าจุดต้องเป็น ${commas(baht)}`],
      { type: 'split', value },
    ),
    explain: dotSteps(value),
  }
}

/** แปลงบาทเป็นสตางค์ หรือสตางค์เป็นบาท */
export function generateSatangConvertQuestion(d: Difficulty): NumberQ | AmountQ {
  if (d === 1 || pick([true, false])) {
    const baht = d === 1 ? int(1, 9) : int(2, 20)
    const satang = d === 1 ? 0 : randomSatangPart(d)
    const value = toSatang(baht, satang)
    const label = formatBS(value)
    return {
      id: uid(),
      gen: 'satangConvert',
      kind: 'number',
      unit: 'สตางค์',
      skill: 'dot',
      difficulty: d,
      title: `${label} เท่ากับกี่สตางค์?`,
      visual: { type: 'rules', items: ['1 บาท = 100 สตางค์'] },
      answer: value,
      npc: 'rabbit',
      hint: hint(
        '1 บาท = 100 สตางค์',
        'นับเพิ่มทีละ 100',
        [`${baht} บาท = ${baht} × 100 = ? สตางค์`],
        { type: 'rules', items: ['1 บาท = 100 สตางค์', '2 บาท = 200 สตางค์', '3 บาท = 300 สตางค์'] },
      ),
      explain: [
        '1 บาท = 100 สตางค์',
        `${baht} บาท = ${baht} × 100 = ${commas(baht * 100)} สตางค์`,
        ...(satang > 0 ? [`รวมกับ ${satang} สตางค์ = ${commas(value)} สตางค์`] : []),
      ],
    }
  }
  const baht = int(1, d === 2 ? 9 : 30)
  const satang = randomSatangPart(d, false)
  const value = toSatang(baht, satang)
  return {
    id: uid(),
    gen: 'satangConvert',
    kind: 'amount',
    input: 'bs',
    skill: 'dot',
    difficulty: d,
    title: `${commas(value)} สตางค์ เท่ากับกี่บาทกี่สตางค์?`,
    visual: { type: 'rules', items: ['100 สตางค์ = 1 บาท'] },
    answer: value,
    npc: 'rabbit',
    hint: hint(
      'ทุก 100 สตางค์ เปลี่ยนเป็น 1 บาท',
      'แยกเป็นกลุ่มละ 100',
      [`${commas(value)} สตางค์ มีกลุ่มละ 100 อยู่ ${baht} กลุ่ม`],
      { type: 'rules', items: ['100 สตางค์ = 1 บาท', '200 สตางค์ = 2 บาท'] },
    ),
    explain: [
      `${commas(value)} = ${commas(baht * 100)} + ${satang}`,
      `${commas(baht * 100)} สตางค์ = ${baht} บาท`,
      `ดังนั้น ${commas(value)} สตางค์ = ${formatBS(value)}`,
    ],
  }
}
