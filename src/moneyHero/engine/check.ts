import type { CheckResult, DenomId, LedgerQ, PayQ, Question, Response, ShopQ, SortQ } from './types'
import { comboKey, denom, describeDenoms, sumDenoms } from '../data/denominations'
import { formatBS, formatDot, parseDot, parseWhole, splitSatang, toSatang } from '../utils/money'
import { explainAdd, explainSub } from '../generators/common'
import { balances } from '../generators/ledger'

/**
 * ตรวจคำตอบของทุกรูปแบบคำถาม
 *
 * ไม่ได้บอกแค่ถูกหรือผิด แต่ส่งคำแนะนำเฉพาะจุดกลับไปด้วย
 * เช่น "จำนวนบาทถูกแล้ว ลองดูสตางค์อีกครั้ง"
 * เพื่อให้เด็กรู้ว่าคิดถูกไปแล้วแค่ไหน
 */

/** อ่านช่องบาทกับช่องสตางค์ คืน null ถ้ายังกรอกไม่ครบหรือกรอกผิดรูปแบบ */
export function readBahtSatang(baht: string, satang: string): { value: number } | { error: string } {
  const b = parseWhole(baht, satang.trim() !== '')
  const s = parseWhole(satang, true)
  if (b === null) return { error: 'กรอกจำนวนบาทเป็นตัวเลขนะ' }
  if (s === null) return { error: 'กรอกจำนวนสตางค์เป็นตัวเลขนะ' }
  if (s >= 100) return { error: 'สตางค์ต้องน้อยกว่า 100 เพราะ 100 สตางค์ = 1 บาท' }
  return { value: toSatang(b, s) }
}

/** อ่านเงินในช่องสมุดบัญชี: "35" หรือ "35.25" */
export function readLedgerCell(text: string): number | null {
  const t = text.trim()
  if (t === '') return null
  if (t.includes('.')) {
    const parsed = parseDot(t)
    return parsed.ok ? parsed.value : NaN
  }
  const whole = parseWhole(t)
  return whole === null ? NaN : toSatang(whole)
}

function amountFeedback(given: number, answer: number): string {
  const g = splitSatang(given)
  const a = splitSatang(answer)
  if (g.baht === a.baht && g.satang !== a.satang) return 'จำนวนบาทถูกแล้ว! ลองดูสตางค์อีกครั้งนะ'
  if (g.satang === a.satang && g.baht !== a.baht) return 'สตางค์ถูกแล้ว! ใกล้แล้ว ลองดูจำนวนบาทก่อนนะ'
  if (Math.abs(given - answer) === 100) return 'ใกล้มาก! ลองดูการทดหรือการยืม 1 บาท (100 สตางค์) อีกครั้ง'
  return 'ใกล้แล้ว! ลองดูจำนวนบาทก่อนนะ'
}

function satisfiesRule(q: PayQ, combo: DenomId[]): string | null {
  if (combo.length === 0) return 'ยังไม่ได้เลือกเงินเลย'
  if (combo.some((id) => !q.tray.includes(id))) return 'มีเงินที่ใช้ไม่ได้ในข้อนี้'
  const rule = q.rule
  if (rule?.exclude && combo.some((id) => rule.exclude!.includes(id))) {
    return q.mode === 'exchange'
      ? `แลกเป็นเงินชนิดเดิมไม่ได้ ลองใช้เงินชนิดอื่น`
      : `ข้อนี้ห้ามใช้${rule.exclude.map((id) => denom(id).name).join(' ')}`
  }
  if (rule?.minPieces && combo.length < rule.minPieces) return `ต้องใช้เงินอย่างน้อย ${rule.minPieces} ชิ้น`
  if (rule?.maxPieces && combo.length > rule.maxPieces) return `ใช้เงินได้ไม่เกิน ${rule.maxPieces} ชิ้น`
  const total = sumDenoms(combo)
  if (total < q.target) return `ยังขาดอีก ${formatBS(q.target - total)}`
  if (total > q.target) return `เกินไป ${formatBS(total - q.target)} ลองเอาออกบางชิ้น`
  return null
}

function checkPay(q: PayQ, combos: DenomId[][]): CheckResult {
  const need = q.mode === 'make' ? (q.ways ?? 1) : 1
  if (combos.length < need) return { correct: false, feedback: `ต้องหาให้ครบ ${need} แบบ ตอนนี้ได้ ${combos.length} แบบ` }
  const keys = new Set<string>()
  for (let i = 0; i < combos.length; i += 1) {
    const problem = satisfiesRule(q, combos[i])
    if (problem) return { correct: false, feedback: need > 1 ? `แบบที่ ${i + 1}: ${problem}` : problem, wrongKeys: [String(i)] }
    const key = comboKey(combos[i])
    if (keys.has(key)) return { correct: false, feedback: `แบบที่ ${i + 1} ซ้ำกับแบบก่อนหน้า ลองใช้เงินชนิดอื่น`, wrongKeys: [String(i)] }
    keys.add(key)
  }
  return {
    correct: true,
    explain: [
      ...(q.give ? [`ก่อนแลก: ${describeDenoms(q.give)} = ${formatBS(q.target)}`] : []),
      ...combos.map((c, i) => `${need > 1 ? `แบบที่ ${i + 1}: ` : 'หนูเลือก '}${describeDenoms(c)} = ${formatBS(sumDenoms(c))}`),
      q.mode === 'exchange' ? 'ก่อนแลก = หลังแลก ✔' : `ครบ ${formatBS(q.target)} พอดี ✔`,
    ],
  }
}

function shopTotal(q: ShopQ, picked: string[]): number {
  return picked.reduce((sum, id) => sum + (q.products.find((p) => p.id === id)?.price ?? 0), 0)
}

function checkShop(q: ShopQ, picked: string[], totalText: string, changeText: string, totalSatang: string, changeSatang: string): CheckResult {
  if (picked.length !== q.pick) return { correct: false, feedback: `เลือกของให้ครบ ${q.pick} ชิ้นก่อนนะ` }
  const total = shopTotal(q, picked)
  const prices = picked.map((id) => q.products.find((p) => p.id === id)!.price)
  const explain = [...explainAdd(prices)]
  if (q.budget !== undefined) explain.push(...explainSub(q.budget, total).map((l) => (l.startsWith('คำตอบ') ? l.replace('คำตอบ', 'เงินเหลือ') : l)))

  const readTotal = readBahtSatang(totalText, totalSatang)
  if ('error' in readTotal) return { correct: false, feedback: readTotal.error, explain }
  if (readTotal.value !== total) {
    return { correct: false, feedback: `เงินรวม: ${amountFeedback(readTotal.value, total)}`, explain, wrongKeys: ['total'] }
  }
  if (q.budget !== undefined) {
    const readChange = readBahtSatang(changeText, changeSatang)
    if ('error' in readChange) return { correct: false, feedback: readChange.error, explain, wrongKeys: ['change'] }
    if (readChange.value !== q.budget - total) {
      return {
        correct: false,
        feedback: `เงินรวมถูกแล้ว! เงินเหลือ: ${amountFeedback(readChange.value, q.budget - total)}`,
        explain,
        wrongKeys: ['change'],
      }
    }
  }
  return { correct: true, explain }
}

function checkSort(q: SortQ, order: string[]): CheckResult {
  const expected = q.items
    .slice()
    .sort((a, b) => (q.order === 'asc' ? a.value - b.value : b.value - a.value))
    .map((it) => it.id)
  if (order.length !== expected.length) return { correct: false, feedback: 'เรียงให้ครบทุกตัวก่อนนะ' }
  const wrong = order.filter((id, i) => id !== expected[i])
  if (wrong.length === 0) return { correct: true }
  return {
    correct: false,
    feedback: 'ลำดับยังไม่ถูก ลองเทียบบาทก่อน แล้วค่อยเทียบสตางค์',
    wrongKeys: order.filter((id, i) => id !== expected[i]),
  }
}

function checkLedger(q: LedgerQ, cells: { income: string; expense: string }[]): CheckResult {
  const wrongKeys: string[] = []
  let firstProblem = ''
  q.sheet.rows.forEach((row, i) => {
    const cell = cells[i] ?? { income: '', expense: '' }
    const inc = readLedgerCell(cell.income)
    const exp = readLedgerCell(cell.expense)
    const ok =
      row.type === 'in'
        ? inc === row.amount && exp === null
        : exp === row.amount && inc === null
    if (!ok) {
      wrongKeys.push(String(i))
      if (!firstProblem) {
        if ((row.type === 'in' && exp !== null) || (row.type === 'out' && inc !== null)) {
          firstProblem = `แถว "${row.item}" ${row.type === 'in' ? 'ได้เงินมา ต้องใส่ช่องรายรับ' : 'ใช้เงินไป ต้องใส่ช่องรายจ่าย'}`
        } else {
          firstProblem = `แถว "${row.item}" ลองดูจำนวนเงินอีกครั้ง`
        }
      }
    }
  })
  if (wrongKeys.length === 0) return { correct: true }
  return { correct: false, feedback: firstProblem, wrongKeys }
}

export function checkAnswer(q: Question, r: Response): CheckResult {
  switch (q.kind) {
    case 'choice': {
      if (r.kind !== 'choice') break
      return r.id === q.answer
        ? { correct: true }
        : { correct: false, feedback: 'ยังไม่ใช่ ลองคิดอีกครั้งนะ', wrongKeys: [r.id] }
    }
    case 'amount': {
      if (r.kind !== 'amount') break
      if (q.input === 'dot') {
        const parsed = parseDot(r.dot)
        if (!parsed.ok) {
          const messages = {
            empty: 'พิมพ์จำนวนเงินก่อนนะ',
            format: 'พิมพ์เป็นตัวเลขและจุด เช่น 25.50',
            noDot: 'อย่าลืมจุด! ถ้าไม่มีสตางค์ให้เขียน .00 เช่น 100.00',
            satangDigits: 'หลังจุดต้องมีสตางค์ 2 หลักเสมอ เช่น 25.50 หรือ 8.05',
            commaPlace: 'จุลภาค (,) ใส่ทุก 3 หลักจากขวา เช่น 1,125.50',
          } as const
          return { correct: false, feedback: messages[parsed.reason] }
        }
        return parsed.value === q.answer
          ? { correct: true }
          : { correct: false, feedback: amountFeedback(parsed.value, q.answer) }
      }
      const read = readBahtSatang(r.baht, q.input === 'baht' ? '' : r.satang)
      if ('error' in read) return { correct: false, feedback: read.error }
      return read.value === q.answer
        ? { correct: true }
        : { correct: false, feedback: amountFeedback(read.value, q.answer) }
    }
    case 'number': {
      if (r.kind !== 'number') break
      const n = parseWhole(r.value)
      if (n === null) return { correct: false, feedback: 'พิมพ์คำตอบเป็นตัวเลขนะ' }
      if (n === q.answer) return { correct: true }
      return { correct: false, feedback: n > q.answer ? 'มากเกินไปนิดนึง ลองนับใหม่นะ' : 'น้อยไปนิดนึง ลองนับใหม่นะ' }
    }
    case 'pay':
      if (r.kind !== 'pay') break
      return checkPay(q, r.combos)
    case 'match': {
      if (r.kind !== 'match') break
      const wrong = q.pairs.filter((p) => r.pairs[p.id] !== p.id).map((p) => p.id)
      if (Object.keys(r.pairs).length < q.pairs.length) return { correct: false, feedback: 'จับคู่ให้ครบทุกคู่ก่อนนะ' }
      return wrong.length === 0
        ? { correct: true }
        : { correct: false, feedback: `ยังจับคู่ผิด ${wrong.length} คู่ ลองดูตัวเลขกับหน่วยอีกครั้ง`, wrongKeys: wrong }
    }
    case 'sort':
      if (r.kind !== 'sort') break
      return checkSort(q, r.order)
    case 'shop': {
      if (r.kind !== 'shop') break
      return checkShop(q, r.picked, r.totalBaht, r.changeBaht, r.totalSatang, r.changeSatang)
    }
    case 'word': {
      if (r.kind !== 'word') break
      const read = readBahtSatang(r.calc, r.calcSatang)
      if ('error' in read) return { correct: false, feedback: read.error }
      return read.value === q.answer
        ? { correct: true }
        : { correct: false, feedback: amountFeedback(read.value, q.answer) }
    }
    case 'ledger':
      if (r.kind !== 'ledger') break
      return checkLedger(q, r.cells)
  }
  return { correct: false, feedback: 'ตอบให้ครบก่อนนะ' }
}

/** คำตอบที่ถูกต้อง (สำหรับแสดงหลังตอบผิด 2 ครั้ง และสำหรับบอตทดสอบ) */
export function answerText(q: Question): string {
  switch (q.kind) {
    case 'choice':
      return q.options.find((o) => o.id === q.answer)?.label ?? ''
    case 'amount':
      return q.input === 'dot' ? formatDot(q.answer) : formatBS(q.answer)
    case 'number':
      return `${q.answer} ${q.unit}`
    case 'pay':
      return q.sample.map((c) => describeDenoms(c)).join(' / ')
    case 'match':
      return q.pairs.map((p) => `${p.left.label} = ${p.right.label}`).join(', ')
    case 'sort':
      return q.items
        .slice()
        .sort((a, b) => (q.order === 'asc' ? a.value - b.value : b.value - a.value))
        .map((it) => it.label)
        .join(q.order === 'asc' ? ' < ' : ' > ')
    case 'shop':
      return 'บวกราคาของที่เลือก แล้วลบออกจากเงินที่มี'
    case 'word':
      return formatBS(q.answer)
    case 'ledger': {
      const bal = balances(q.sheet)
      return `คงเหลือสุดท้าย ${formatBS(bal[bal.length - 1])}`
    }
  }
}

/** ผลรวมร้านค้า ใช้ในหน้าจอร้านค้าและบอตทดสอบ */
export { shopTotal }
