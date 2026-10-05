import type { AmountQ, ChoiceQ, Difficulty, LedgerQ, LedgerRow, LedgerSheet, Question } from '../engine/types'
import { KID_NAMES, THAI_MONTHS } from '../data/products'
import { formatBS, toSatang } from '../utils/money'
import { int, pick, shuffle, uid } from '../utils/random'
import { hint } from './common'

/**
 * ด่าน 11: การอ่านและการเขียนบันทึกรายรับรายจ่าย (MY MONEY BOOK)
 *
 * รายรับ = เงินที่ได้มา   รายจ่าย = เงินที่ใช้ไป
 * คงเหลือ = คงเหลือเดิม + รายรับ − รายจ่าย
 */

const INCOME = [
  { item: 'ได้รับเงินจากคุณแม่', amounts: [20, 50, 100] },
  { item: 'ได้ค่าขนมจากคุณพ่อ', amounts: [20, 40, 50] },
  { item: 'คุณยายให้เงิน', amounts: [50, 100] },
  { item: 'ขายขนมได้', amounts: [35, 45, 60, 80] },
  { item: 'ได้รางวัลเรียนดี', amounts: [100, 200] },
  { item: 'ได้รับเงิน', amounts: [50, 100] },
]

const EXPENSE = [
  { item: 'ซื้อขนม', min: 10, max: 30 },
  { item: 'ซื้อสมุด', min: 15, max: 45 },
  { item: 'ซื้อดินสอ', min: 5, max: 15 },
  { item: 'ซื้อนม', min: 12, max: 25 },
  { item: 'ซื้อของเล่น', min: 39, max: 99 },
  { item: 'ค่ารถโดยสาร', min: 10, max: 20 },
  { item: 'ทำบุญ', min: 20, max: 50 },
  { item: 'ซื้อสีเทียน', min: 25, max: 59 },
]

export function balances(sheet: LedgerSheet): number[] {
  let bal = sheet.start
  return sheet.rows.map((r) => {
    bal += r.type === 'in' ? r.amount : -r.amount
    return bal
  })
}

export function thaiYear(): number {
  return new Date().getFullYear() + 543
}

function dayTotals(sheet: LedgerSheet, type: 'in' | 'out'): Map<number, number> {
  const totals = new Map<number, number>()
  for (const r of sheet.rows) {
    if (!totals.has(r.day)) totals.set(r.day, 0)
    if (r.type === type) totals.set(r.day, totals.get(r.day)! + r.amount)
  }
  return totals
}

/** สร้างสมุดบัญชีที่คงเหลือไม่ติดลบ และ (ถ้าหลายวัน) มีวันที่ใช้เงินมากที่สุดเพียงวันเดียว */
export function generateLedgerSheet(d: Difficulty): LedgerSheet {
  const days = d === 1 ? 1 : d === 2 ? 2 : 3
  const perDay = d === 1 ? [4] : d === 2 ? [2, 3] : [2, 2, 2]
  const month = pick(THAI_MONTHS)
  const year = thaiYear()
  const firstDay = int(1, 25)

  for (let attempt = 0; attempt < 100; attempt += 1) {
    const start = toSatang(pick(d === 1 ? [100, 150, 200] : [200, 300, 500]))
    let balance = start
    const rows: LedgerRow[] = []
    for (let dayIndex = 0; dayIndex < days; dayIndex += 1) {
      const day = firstDay + dayIndex
      for (let k = 0; k < perDay[dayIndex]; k += 1) {
        // สลับรับ–จ่าย แต่ทุกวันต้องมีรายจ่ายอย่างน้อย 1 รายการ
        const isIncome = k === 0 && dayIndex === 0 ? pick([true, false]) : k % 2 === 0 && pick([true, false])
        if (isIncome) {
          const src = pick(INCOME)
          const amount = toSatang(pick(src.amounts))
          balance += amount
          rows.push({ day, month, year, item: src.item, type: 'in', amount })
        } else {
          const src = pick(EXPENSE)
          const amount = toSatang(Math.min(int(src.min, src.max), Math.floor(balance / 100)))
          if (amount <= 0) continue
          balance -= amount
          rows.push({ day, month, year, item: src.item, type: 'out', amount })
        }
      }
    }
    const sheet: LedgerSheet = { owner: pick(KID_NAMES), start, rows }
    const outs = dayTotals(sheet, 'out')
    const values = Array.from(outs.values())
    const max = Math.max(...values)
    const everyDaySpends = values.every((v) => v > 0)
    const hasIncome = rows.some((r) => r.type === 'in')
    const hasExpense = rows.some((r) => r.type === 'out')
    const uniqueMax = values.filter((v) => v === max).length === 1
    if (hasIncome && hasExpense && everyDaySpends && (days === 1 || uniqueMax)) return sheet
  }
  throw new Error('สร้างสมุดบัญชีไม่สำเร็จ')
}

function rowText(r: LedgerRow): string {
  return `${r.item} ${formatBS(r.amount)}`
}

/** บันทึกลงสมุดบัญชี */
export function generateLedgerQuestion(d: Difficulty, given?: LedgerSheet): LedgerQ {
  const sheet = given ?? generateLedgerSheet(d)
  const bal = balances(sheet)
  return {
    id: uid(),
    gen: 'ledgerFill',
    kind: 'ledger',
    skill: 'ledger',
    difficulty: d,
    title: `ช่วย${sheet.owner}บันทึกรายรับรายจ่าย`,
    story: `เงินคงเหลือยกมา ${formatBS(sheet.start)}`,
    sheet,
    npc: 'owl',
    hint: hint(
      'ได้เงินมา ใส่ช่อง "รายรับ" ใช้เงินไป ใส่ช่อง "รายจ่าย"',
      'ตัวอย่างแถวแรก',
      [`แถวแรก "${rowText(sheet.rows[0])}" ใส่ช่อง${sheet.rows[0].type === 'in' ? 'รายรับ' : 'รายจ่าย'}`],
      { type: 'rules', items: ['ได้รับเงิน / ขายของได้ → รายรับ', 'ซื้อของ / จ่ายค่ารถ / ทำบุญ → รายจ่าย', 'คงเหลือ = เดิม + รับ − จ่าย'] },
    ),
    explain: sheet.rows.map(
      (r, i) =>
        `${r.item}: ${r.type === 'in' ? 'รายรับ' : 'รายจ่าย'} ${formatBS(r.amount)} → คงเหลือ ${formatBS(bal[i])}`,
    ),
  }
}

type Ask = 'in' | 'out' | 'balance' | 'maxDay' | 'dayIn'

/** อ่านสมุดบัญชีแล้วตอบคำถาม */
export function generateIncomeExpenseQuestion(d: Difficulty, given?: LedgerSheet, ask?: Ask): AmountQ | ChoiceQ {
  const q = buildIncomeExpense(d, given, ask)
  // คำตอบที่มีสตางค์ ต้องให้กรอกได้ทั้งบาทและสตางค์
  if (q.kind === 'amount' && q.answer % 100 !== 0) q.input = 'bs'
  if (q.kind === 'amount' && q.input === 'bs') q.title = q.title.replace('กี่บาท', 'เท่าไร')
  return q
}

function buildIncomeExpense(d: Difficulty, given?: LedgerSheet, ask?: Ask): AmountQ | ChoiceQ {
  const sheet = given ?? generateLedgerSheet(d)
  const days = Array.from(new Set(sheet.rows.map((r) => r.day)))
  const single = days.length === 1
  const choice: Ask =
    ask ?? pick(single ? (['in', 'out', 'balance'] as Ask[]) : (['in', 'out', 'balance', 'maxDay', 'dayIn'] as Ask[]))
  const bal = balances(sheet)
  const finalBalance = bal[bal.length - 1]
  const visual = { type: 'ledger' as const, sheet, showBalance: true }
  const totalIn = sheet.rows.filter((r) => r.type === 'in').reduce((s, r) => s + r.amount, 0)
  const totalOut = sheet.rows.filter((r) => r.type === 'out').reduce((s, r) => s + r.amount, 0)
  const when = single ? 'วันนี้' : 'ทั้งหมด'
  const base = {
    id: uid(),
    gen: 'incomeExpense',
    skill: 'ledger' as const,
    difficulty: d,
    visual,
    npc: 'owl' as const,
  }

  if (choice === 'maxDay' && !single) {
    const outs = dayTotals(sheet, 'out')
    const ranked = Array.from(outs.entries()).sort((a, b) => b[1] - a[1])
    const month = sheet.rows[0].month
    const options = shuffle(days).map((day) => ({ id: `d${day}`, label: `วันที่ ${day} ${month}` }))
    return {
      ...base,
      kind: 'choice',
      layout: 'list',
      title: 'วันไหนใช้เงินมากที่สุด?',
      options,
      answer: `d${ranked[0][0]}`,
      hint: hint(
        'รวมรายจ่ายของแต่ละวัน แล้วดูว่าวันไหนมากที่สุด',
        'ดูช่องรายจ่ายในสมุด',
        [`วันที่ ${ranked[ranked.length - 1][0]} จ่ายรวม ${formatBS(ranked[ranked.length - 1][1])}`],
        visual,
      ),
      explain: [
        ...Array.from(outs.entries()).map(([day, v]) => `วันที่ ${day} จ่ายรวม ${formatBS(v)}`),
        `วันที่ ${ranked[0][0]} ใช้เงินมากที่สุด`,
      ],
    }
  }

  if (choice === 'dayIn' && !single) {
    const ins = dayTotals(sheet, 'in')
    const day = pick(days)
    const value = ins.get(day) ?? 0
    return {
      ...base,
      kind: 'amount',
      input: 'baht',
      title: `วันที่ ${day} ได้รับเงินกี่บาท?`,
      answer: value,
      hint: hint('ดูเฉพาะแถวของวันนั้น ในช่องรายรับ', 'สมุดบัญชี', [`หาแถวที่เป็นวันที่ ${day}`], visual),
      explain: [
        ...sheet.rows.filter((r) => r.day === day && r.type === 'in').map((r) => `${r.item} ${formatBS(r.amount)}`),
        value === 0 ? `วันที่ ${day} ไม่มีรายรับ = 0 บาท` : `รวมรายรับวันที่ ${day} = ${formatBS(value)}`,
      ],
    }
  }

  if (choice === 'in') {
    const list = sheet.rows.filter((r) => r.type === 'in')
    return {
      ...base,
      kind: 'amount',
      input: 'baht',
      title: `${when}ได้รับเงินกี่บาท?`,
      answer: totalIn,
      hint: hint('รวมตัวเลขในช่อง "รายรับ" ทุกแถว', 'ดูช่องรายรับ', [`รายรับแถวแรก ${formatBS(list[0].amount)}`], visual),
      explain: [`รายรับ: ${list.map((r) => formatBS(r.amount)).join(' + ')} = ${formatBS(totalIn)}`],
    }
  }

  if (choice === 'out') {
    const list = sheet.rows.filter((r) => r.type === 'out')
    return {
      ...base,
      kind: 'amount',
      input: 'baht',
      title: `${when}จ่ายเงินไปกี่บาท?`,
      answer: totalOut,
      hint: hint('รวมตัวเลขในช่อง "รายจ่าย" ทุกแถว', 'ดูช่องรายจ่าย', [`รายจ่ายแถวแรก ${formatBS(list[0].amount)}`], visual),
      explain: [`รายจ่าย: ${list.map((r) => formatBS(r.amount)).join(' + ')} = ${formatBS(totalOut)}`],
    }
  }

  return {
    ...base,
    kind: 'amount',
    input: 'baht',
    title: 'สุดท้ายเหลือเงินกี่บาท?',
    answer: finalBalance,
    hint: hint(
      'ดูช่อง "คงเหลือ" แถวสุดท้าย หรือคิด เงินยกมา + รายรับ − รายจ่าย',
      'สมุดบัญชี',
      [`เงินยกมา ${formatBS(sheet.start)} + รายรับ ${formatBS(totalIn)}`],
      visual,
    ),
    explain: [
      `เงินยกมา ${formatBS(sheet.start)} + รายรับ ${formatBS(totalIn)} = ${formatBS(sheet.start + totalIn)}`,
      `${formatBS(sheet.start + totalIn)} − รายจ่าย ${formatBS(totalOut)} = ${formatBS(finalBalance)}`,
    ],
  }
}

/** ชุดสมุดบัญชี: บันทึก 1 ข้อ ตามด้วยคำถามจากสมุดเล่มเดียวกัน */
export function generateLedgerSet(d: Difficulty, followUps: Ask[]): Question[] {
  const sheet = generateLedgerSheet(d)
  return [generateLedgerQuestion(d, sheet), ...followUps.map((ask) => generateIncomeExpenseQuestion(d, sheet, ask))]
}
