/**
 * สมุดบัญชีรายรับรายจ่ายของฮีโร่ (ตรงกับบทเรียน ป.3 เรื่องการบันทึกรายรับรายจ่าย)
 *
 * ทุกครั้งที่เหรียญเพิ่มหรือลด ให้ผ่าน earn() เพื่อจดลงสมุดด้วยเสมอ
 * รายการชื่อเดียวกันในวันเดียวกัน (เช่น "ตอบถูก ด่าน 3" ทีละ 1–3 เหรียญ) รวมเป็นบรรทัดเดียว
 * สมุดเก็บไว้ไม่เกิน LEDGER_MAX บรรทัด บรรทัดเก่าที่ตัดออกจะกลายเป็น "ยอดยกมา"
 */

export interface LedgerEntry {
  at: number
  label: string
  icon: string
  /** บวก = รายรับ, ลบ = รายจ่าย */
  amount: number
}

export const LEDGER_MAX = 80

interface Wallet {
  coins: number
  ledger: LedgerEntry[]
}

function sameDay(a: number, b: number): boolean {
  const x = new Date(a)
  const y = new Date(b)
  return x.getFullYear() === y.getFullYear() && x.getMonth() === y.getMonth() && x.getDate() === y.getDate()
}

/** รับ (amount > 0) หรือจ่าย (amount < 0) เหรียญ พร้อมจดลงสมุด */
export function earn<T extends Wallet>(p: T, amount: number, label: string, icon: string, at = Date.now()): T {
  if (!amount) return p
  const list = p.ledger ?? []
  const last = list[list.length - 1]
  let ledger: LedgerEntry[]
  if (last && last.label === label && Math.sign(last.amount) === Math.sign(amount) && sameDay(last.at, at)) {
    ledger = [...list.slice(0, -1), { ...last, at, amount: last.amount + amount }]
  } else {
    ledger = [...list, { at, label, icon, amount }]
  }
  return { ...p, coins: p.coins + amount, ledger: ledger.slice(-LEDGER_MAX) }
}

export interface LedgerRow extends LedgerEntry {
  /** เงินคงเหลือหลังบรรทัดนี้ */
  balance: number
}

export interface LedgerBook {
  /** ยอดยกมา (เงินที่มีก่อนบรรทัดแรกในสมุด) */
  opening: number
  rows: LedgerRow[]
  income: number
  expense: number
  closing: number
}

/**
 * คำนวณยอดคงเหลือทีละบรรทัด ย้อนจากเงินที่มีตอนนี้
 * limit = ดูเฉพาะบรรทัดล่าสุดกี่บรรทัด (บรรทัดก่อนหน้านั้นรวมเป็นยอดยกมา)
 * ยอดยกมา + รายรับ − รายจ่าย = คงเหลือ เสมอ
 */
export function ledgerBook(p: Wallet, limit?: number): LedgerBook {
  const all = p.ledger ?? []
  const list = limit === undefined ? all : all.slice(-Math.max(0, limit))
  const sum = list.reduce((s, e) => s + e.amount, 0)
  const opening = p.coins - sum
  let balance = opening
  let income = 0
  let expense = 0
  const rows = list.map((e) => {
    balance += e.amount
    if (e.amount > 0) income += e.amount
    else expense -= e.amount
    return { ...e, balance }
  })
  return { opening, rows, income, expense, closing: p.coins }
}

export interface LedgerQuiz {
  before: number
  entry: LedgerEntry
  answer: number
  choices: number[]
  text: string
}

/**
 * ถามจากสมุดของเด็กเอง: "มีอยู่ … ได้รับ/จ่าย … จะเหลือเท่าไร"
 * ตัวหลอกคือคิดผิดเครื่องหมาย (บวกแทนลบ) และคลาดไปสิบ
 */
export function ledgerQuiz(book: LedgerBook, rnd: () => number = Math.random): LedgerQuiz | null {
  if (book.rows.length === 0) return null
  const i = Math.floor(rnd() * book.rows.length)
  const row = book.rows[i]
  const before = row.balance - row.amount
  const answer = row.balance
  const amt = Math.abs(row.amount)
  const text =
    row.amount > 0
      ? `มีอยู่ ${before} เหรียญ แล้วได้รับ ${amt} เหรียญ (${row.label}) จะมีกี่เหรียญ?`
      : `มีอยู่ ${before} เหรียญ แล้วจ่ายไป ${amt} เหรียญ (${row.label}) จะเหลือกี่เหรียญ?`
  const wrong = [row.amount > 0 ? before - amt : before + amt, answer + 10, answer - 10, answer + 1].filter((v) => v >= 0 && v !== answer)
  const decoys = Array.from(new Set(wrong)).slice(0, 2)
  const choices = [answer, ...decoys]
  // สลับตำแหน่งคำตอบ
  for (let k = choices.length - 1; k > 0; k -= 1) {
    const j = Math.floor(rnd() * (k + 1))
    ;[choices[k], choices[j]] = [choices[j], choices[k]]
  }
  return { before, entry: row, answer, choices, text }
}

/* ------------------------------------------------------------------ */
/* เป้าหมายการออม                                                      */
/* ------------------------------------------------------------------ */

export interface GoalProgress {
  price: number
  have: number
  need: number
  ratio: number
  done: boolean
}

export function goalProgress(coins: number, price: number): GoalProgress {
  const need = Math.max(0, price - coins)
  return { price, have: Math.min(coins, price), need, ratio: price <= 0 ? 1 : Math.min(1, coins / price), done: need === 0 }
}
