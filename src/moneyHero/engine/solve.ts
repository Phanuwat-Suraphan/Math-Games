import type { Question, Response } from './types'
import { splitSatang } from '../utils/money'
import { formatDotNumber } from '../utils/money'

/**
 * สร้างคำตอบที่ถูกต้องของคำถามหนึ่งข้อ
 *
 * ใช้ในชุดทดสอบ: สร้างโจทย์สุ่มหลายหมื่นข้อ แล้วยืนยันว่าทุกข้อ "มีคำตอบที่ถูก"
 * และตัวตรวจคำตอบยอมรับคำตอบนั้นจริง
 * ร้านค้าเลือกของ n ชิ้นแรกบนชั้น
 */
export function solve(q: Question): Response {
  switch (q.kind) {
    case 'choice':
      return { kind: 'choice', id: q.answer }
    case 'amount': {
      const { baht, satang } = splitSatang(q.answer)
      return { kind: 'amount', baht: String(baht), satang: String(satang), dot: formatDotNumber(q.answer) }
    }
    case 'number':
      return { kind: 'number', value: String(q.answer) }
    case 'pay':
      return { kind: 'pay', combos: q.sample.slice(0, q.mode === 'make' ? (q.ways ?? 1) : 1) }
    case 'match':
      return { kind: 'match', pairs: Object.fromEntries(q.pairs.map((p) => [p.id, p.id])) }
    case 'sort':
      return {
        kind: 'sort',
        order: q.items
          .slice()
          .sort((a, b) => (q.order === 'asc' ? a.value - b.value : b.value - a.value))
          .map((it) => it.id),
      }
    case 'shop': {
      const picked = q.products.slice(0, q.pick).map((p) => p.id)
      const total = q.products.slice(0, q.pick).reduce((s, p) => s + p.price, 0)
      const t = splitSatang(total)
      const c = splitSatang(q.budget !== undefined ? q.budget - total : 0)
      return {
        kind: 'shop',
        picked,
        totalBaht: String(t.baht),
        totalSatang: String(t.satang),
        changeBaht: String(c.baht),
        changeSatang: String(c.satang),
      }
    }
    case 'word': {
      const { baht, satang } = splitSatang(q.answer)
      return { kind: 'word', calc: String(baht), calcSatang: String(satang) }
    }
    case 'ledger':
      return {
        kind: 'ledger',
        cells: q.sheet.rows.map((r) => {
          const text = r.amount % 100 === 0 ? String(r.amount / 100) : formatDotNumber(r.amount).replace(/,/g, '')
          return r.type === 'in' ? { income: text, expense: '' } : { income: '', expense: text }
        }),
      }
  }
}
