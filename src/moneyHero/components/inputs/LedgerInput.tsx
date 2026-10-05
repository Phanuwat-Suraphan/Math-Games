import { useState } from 'react'
import type { LedgerQ, Response } from '../../engine/types'
import { readLedgerCell } from '../../engine/check'
import { formatBS, formatDotNumber } from '../../utils/money'
import { playSound } from '../../utils/sound'

/**
 * MY MONEY BOOK: บันทึกรายรับรายจ่ายลงตาราง วัน เดือน ปี | รายการ | รายรับ | รายจ่าย | คงเหลือ
 * ช่อง "คงเหลือ" ระบบคำนวณให้อัตโนมัติจากตัวเลขที่เด็กกรอก
 */
export function LedgerInput({
  q,
  disabled,
  wrongKeys,
  onSubmit,
}: {
  q: LedgerQ
  disabled: boolean
  wrongKeys?: string[]
  onSubmit: (r: Response) => void
}) {
  const [cells, setCells] = useState(() => q.sheet.rows.map(() => ({ income: '', expense: '' })))

  const set = (i: number, key: 'income' | 'expense', value: string) => {
    setCells((list) => list.map((c, k) => (k === i ? { ...c, [key]: value.replace(/[^0-9.,]/g, '').slice(0, 10) } : c)))
  }

  // คงเหลืออัตโนมัติ: คิดต่อเนื่องจากแถวบนลงล่าง ถ้าแถวไหนยังกรอกไม่ครบจะแสดง "…"
  let running: number | null = q.sheet.start
  const balances = cells.map((c) => {
    const inc = readLedgerCell(c.income)
    const exp = readLedgerCell(c.expense)
    if (running === null || (inc === null && exp === null) || Number.isNaN(inc) || Number.isNaN(exp)) {
      running = null
      return null
    }
    running = running + (inc ?? 0) - (exp ?? 0)
    return running
  })

  const filled = cells.every((c) => c.income.trim() !== '' || c.expense.trim() !== '')

  return (
    <div className="mh-ledger-input">
      <div className="mh-events">
        {q.sheet.rows.map((r, i) => (
          <div key={i} className={`mh-event ${r.type === 'in' ? 'is-in' : 'is-out'}`}>
            <span className="mh-event-icon">{r.type === 'in' ? '📥' : '📤'}</span>
            <span>
              {r.day} {r.month}: {r.item} <b>{formatBS(r.amount)}</b>
            </span>
          </div>
        ))}
      </div>
      <div className="mh-ledger-wrap">
        <table className="mh-ledger mh-ledger-edit">
          <thead>
            <tr>
              <th>วัน เดือน ปี</th>
              <th>รายการ</th>
              <th>รายรับ</th>
              <th>รายจ่าย</th>
              <th>คงเหลือ</th>
            </tr>
          </thead>
          <tbody>
            <tr className="mh-ledger-start">
              <td>—</td>
              <td>ยกมา</td>
              <td />
              <td />
              <td>{formatDotNumber(q.sheet.start)}</td>
            </tr>
            {q.sheet.rows.map((r, i) => {
              const wrong = wrongKeys?.includes(String(i))
              const bal = balances[i]
              return (
                <tr key={i} className={wrong ? 'is-wrong' : ''}>
                  <td>
                    {r.day} {r.month.slice(0, 3)}. {String(r.year).slice(2)}
                  </td>
                  <td>
                    {r.item} {wrong && <span className="mh-mark-inline">✗</span>}
                  </td>
                  <td>
                    <input
                      className="mh-cell"
                      inputMode="decimal"
                      data-testid={`mh-in-${i}`}
                      aria-label={`รายรับ ${r.item}`}
                      value={cells[i].income}
                      disabled={disabled}
                      onChange={(e) => set(i, 'income', e.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      className="mh-cell"
                      inputMode="decimal"
                      data-testid={`mh-out-${i}`}
                      aria-label={`รายจ่าย ${r.item}`}
                      value={cells[i].expense}
                      disabled={disabled}
                      onChange={(e) => set(i, 'expense', e.target.value)}
                    />
                  </td>
                  <td className="mh-auto">{bal === null ? '…' : bal < 0 ? '⚠️' : formatDotNumber(bal)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <p className="mh-help-line">ได้เงินมา ใส่ช่องรายรับ · ใช้เงินไป ใส่ช่องรายจ่าย · ช่องคงเหลือคิดให้อัตโนมัติ</p>
      <button
        type="button"
        data-testid="mh-submit"
        className="mh-btn mh-btn-go"
        disabled={disabled || !filled}
        onClick={() => {
          playSound('click')
          onSubmit({ kind: 'ledger', cells })
        }}
      >
        ✔ บันทึกสมุดบัญชี
      </button>
    </div>
  )
}
