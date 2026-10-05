import type { ChoiceOption, Difficulty, Hint, Visual } from '../engine/types'
import { commas, formatBS, formatDot, splitSatang, toSatang } from '../utils/money'
import { int, pick, shuffle } from '../utils/random'

/**
 * เครื่องมือกลางของตัวสร้างโจทย์ทุกด่าน
 */

/** สตางค์ที่ใช้ในโจทย์ ป.3 ใช้แค่ 0, 25, 50, 75 เพราะจ่ายด้วยเหรียญจริงได้ */
export function randomSatangPart(d: Difficulty, allowZero = true): number {
  const pool = d === 1 ? [0, 50] : [0, 25, 50, 75]
  const usable = allowZero ? pool : pool.filter((s) => s !== 0)
  return pick(usable)
}

/** สุ่มจำนวนเงิน (สตางค์) ช่วงบาทตามที่กำหนด */
export function randomAmount(minBaht: number, maxBaht: number, d: Difficulty, withSatang = true): number {
  const baht = int(minBaht, maxBaht)
  const satang = withSatang ? randomSatangPart(d) : 0
  const value = toSatang(baht, satang)
  return value === 0 ? 100 : value
}

/** ช่วงบาทของแต่ละระดับ */
export function bahtRange(d: Difficulty): [number, number] {
  if (d === 1) return [5, 99]
  if (d === 2) return [50, 999]
  return [200, 9999]
}

/** สร้างตัวเลือกจากคำตอบกับตัวลวง ตัดตัวซ้ำ ให้ได้ n ตัวพอดี */
export function buildOptions(
  answer: string,
  distractors: string[],
  n: number,
  extra: () => string,
): { options: ChoiceOption[]; answerId: string } {
  const labels: string[] = [answer]
  for (const d of distractors) {
    if (labels.length >= n) break
    if (!labels.includes(d)) labels.push(d)
  }
  let guard = 0
  while (labels.length < n && guard < 200) {
    const candidate = extra()
    if (!labels.includes(candidate)) labels.push(candidate)
    guard += 1
  }
  if (labels.length < n) throw new Error(`สร้างตัวเลือกไม่ครบ ${n} ตัว`)

  const shuffled = shuffle(labels)
  const options = shuffled.map((label, i) => ({ id: `o${i}`, label }))
  const answerId = options.find((o) => o.label === answer)!.id
  return { options, answerId }
}

/** ตัวลวงของจำนวนเงิน: ขยับบาทหรือสตางค์เล็กน้อย ไม่ติดลบและไม่ซ้ำคำตอบ */
export function nearbyAmounts(answer: number, count: number, format: (v: number) => string = formatBS): string[] {
  const { baht, satang } = splitSatang(answer)
  const candidates = [
    answer + 100,
    answer - 100,
    answer + 1000,
    answer - 1000,
    toSatang(baht, (satang + 25) % 100),
    toSatang(baht, (satang + 50) % 100),
    answer + 25,
    answer - 25,
    answer + 50,
    answer - 50,
    toSatang(satang, 0) > 0 && satang > 0 ? toSatang(baht + 1, 0) : answer + 200,
  ].filter((v) => v > 0 && v !== answer)
  const labels: string[] = []
  for (const v of shuffle(candidates)) {
    const label = format(v)
    if (label !== format(answer) && !labels.includes(label)) labels.push(label)
    if (labels.length >= count) break
  }
  return labels
}

export function hint(text: string, visualNote: string, partial: string[], visual?: Visual): Hint {
  return { text, visualNote, partial, visual }
}

/* ------------------------------------------------------------------ */
/* คำอธิบายการคำนวณทีละขั้น                                            */
/* ------------------------------------------------------------------ */

export function explainAdd(values: number[]): string[] {
  const parts = values.map(splitSatang)
  const satangSum = parts.reduce((s, p) => s + p.satang, 0)
  const bahtSum = parts.reduce((s, p) => s + p.baht, 0)
  const carry = Math.floor(satangSum / 100)
  const total = values.reduce((s, v) => s + v, 0)
  const lines = ['แยกคิด บาทบวกบาท สตางค์บวกสตางค์']
  lines.push(`สตางค์: ${parts.map((p) => p.satang).join(' + ')} = ${satangSum} สตางค์`)
  if (carry > 0) {
    lines.push(
      `${satangSum} สตางค์ = ${formatBS(satangSum)} (100 สตางค์ = 1 บาท) จึงทด ${carry} บาท ไปที่บาท`,
    )
  }
  lines.push(
    `บาท: ${parts.map((p) => commas(p.baht)).join(' + ')}${carry > 0 ? ` + ${carry} (ที่ทดมา)` : ''} = ${commas(bahtSum + carry)} บาท`,
  )
  lines.push(`คำตอบ: ${formatBS(total)} (${formatDot(total)})`)
  return lines
}

export function explainSub(a: number, b: number): string[] {
  const A = splitSatang(a)
  const B = splitSatang(b)
  const lines = ['แยกคิด บาทลบบาท สตางค์ลบสตางค์']
  if (A.satang >= B.satang) {
    lines.push(`สตางค์: ${A.satang} − ${B.satang} = ${A.satang - B.satang} สตางค์`)
    lines.push(`บาท: ${commas(A.baht)} − ${commas(B.baht)} = ${commas(A.baht - B.baht)} บาท`)
  } else {
    lines.push(`สตางค์: ${A.satang} ลบ ${B.satang} ไม่พอ ต้องยืม 1 บาท จากหลักบาท`)
    lines.push(`1 บาท = 100 สตางค์ → ${A.satang} + 100 = ${A.satang + 100} สตางค์`)
    lines.push(`สตางค์: ${A.satang + 100} − ${B.satang} = ${A.satang + 100 - B.satang} สตางค์`)
    lines.push(
      `บาท: ${commas(A.baht)} − 1 (ที่ให้ยืม) − ${commas(B.baht)} = ${commas(A.baht - 1 - B.baht)} บาท`,
    )
  }
  lines.push(`คำตอบ: ${formatBS(a - b)} (${formatDot(a - b)})`)
  return lines
}

export function explainMul(a: number, n: number): string[] {
  const A = splitSatang(a)
  const satangProduct = A.satang * n
  const carry = Math.floor(satangProduct / 100)
  const lines = [`คูณทีละส่วน บาทคูณ ${n} และสตางค์คูณ ${n}`]
  lines.push(`บาท: ${commas(A.baht)} × ${n} = ${commas(A.baht * n)} บาท`)
  if (A.satang > 0) {
    lines.push(`สตางค์: ${A.satang} × ${n} = ${satangProduct} สตางค์`)
    if (carry > 0) {
      lines.push(
        `${satangProduct} สตางค์ = ${formatBS(satangProduct)} → ทด ${carry} บาท: ${commas(A.baht * n)} + ${carry} = ${commas(A.baht * n + carry)} บาท`,
      )
    }
  }
  lines.push(`คำตอบ: ${formatBS(a * n)} (${formatDot(a * n)})`)
  return lines
}

export function explainDiv(a: number, n: number): string[] {
  const A = splitSatang(a)
  const q = Math.floor(A.baht / n)
  const r = A.baht % n
  const lines = [`แบ่ง ${formatBS(a)} ออกเป็น ${n} ส่วนเท่า ๆ กัน แบ่งบาทก่อน`]
  lines.push(`บาท: ${commas(A.baht)} ÷ ${n} = ${commas(q)}${r > 0 ? ` เหลือเศษ ${r} บาท` : ' ลงตัว'}`)
  if (r > 0 || A.satang > 0) {
    const pool = r * 100 + A.satang
    if (r > 0) {
      lines.push(
        `เปลี่ยนเศษ ${r} บาท เป็น ${r * 100} สตางค์${A.satang > 0 ? ` รวมกับ ${A.satang} สตางค์ ได้ ${pool} สตางค์` : ''}`,
      )
    }
    lines.push(`สตางค์: ${pool} ÷ ${n} = ${pool / n} สตางค์`)
  }
  lines.push(`คำตอบ: ${formatBS(a / n)} (${formatDot(a / n)})`)
  lines.push(`ตรวจ: ${formatBS(a / n)} × ${n} = ${formatBS(a)} ✔`)
  return lines
}

/** ข้อความคำตอบที่ถูกต้อง */
export function answerLine(value: number): string {
  return `คำตอบที่ถูกคือ ${formatBS(value)}`
}
