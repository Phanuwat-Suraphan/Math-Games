import { useState } from 'react'
import type { LedgerSheet, Visual } from '../engine/types'
import { DENOMINATIONS, denom } from '../data/denominations'
import { commas, formatBS, formatDot, formatDotNumber, splitSatang, twoDigits } from '../utils/money'
import { balances } from '../generators/ledger'
import { speak } from '../utils/speech'
import { MoneyPiece, MoneyPile } from './Art'

/**
 * ภาพประกอบการเรียนรู้ทุกแบบ: กองเงิน ตารางบาท|สตางค์ การตั้งเลข บาร์โมเดล สมุดบัญชี ฯลฯ
 */

export function LedgerTable({ sheet, showBalance = true }: { sheet: LedgerSheet; showBalance?: boolean }) {
  const bal = balances(sheet)
  return (
    <div className="mh-ledger-wrap">
      <table className="mh-ledger">
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
            <td>{formatDotNumber(sheet.start)}</td>
          </tr>
          {sheet.rows.map((r, i) => (
            <tr key={i}>
              <td>
                {r.day} {r.month.slice(0, 3)}. {String(r.year).slice(2)}
              </td>
              <td>{r.item}</td>
              <td className="mh-in">{r.type === 'in' ? formatDotNumber(r.amount) : ''}</td>
              <td className="mh-out">{r.type === 'out' ? formatDotNumber(r.amount) : ''}</td>
              <td>{showBalance ? formatDotNumber(bal[i]) : ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Gallery() {
  const [picked, setPicked] = useState<string | null>(null)
  const chosen = picked ? DENOMINATIONS.find((d) => d.id === picked) : null
  return (
    <div className="mh-gallery">
      <div className="mh-gallery-grid">
        {DENOMINATIONS.map((d) => (
          <button
            key={d.id}
            type="button"
            className={`mh-gallery-item ${picked === d.id ? 'is-on' : ''}`}
            onClick={() => {
              setPicked(d.id)
              speak(`${d.name} มีค่า ${formatBS(d.value)}`)
            }}
            aria-label={d.name}
          >
            <MoneyPiece id={d.id} base={48} />
          </button>
        ))}
      </div>
      <div className="mh-gallery-info" aria-live="polite">
        {chosen ? (
          <>
            <strong>{chosen.name}</strong>
            <span>
              {chosen.kind === 'coin' ? 'เหรียญ' : 'ธนบัตร'} {chosen.colorName} · มีค่า {formatBS(chosen.value)}
            </span>
          </>
        ) : (
          <span>👆 แตะเงินเพื่อดูชื่อและค่า</span>
        )}
      </div>
    </div>
  )
}

function SplitTable({ value }: { value: number }) {
  const { baht, satang } = splitSatang(value)
  return (
    <div className="mh-split">
      <div className="mh-split-col mh-split-baht">
        <span className="mh-split-head">บาท</span>
        <span className="mh-split-num">{commas(baht)}</span>
      </div>
      <div className="mh-split-dot">.</div>
      <div className="mh-split-col mh-split-satang">
        <span className="mh-split-head">สตางค์ (2 หลัก)</span>
        <span className="mh-split-num">{twoDigits(satang)}</span>
      </div>
      <div className="mh-split-result">= {formatDot(value)}</div>
    </div>
  )
}

const OP_SIGN = { '+': '+', '-': '−', '×': '×', '÷': '÷' } as const

function Calc({ v }: { v: Extract<Visual, { type: 'calc' }> }) {
  return (
    <div className="mh-calc" role="img" aria-label="การตั้งเลข">
      <div className="mh-calc-row mh-calc-head">
        <span />
        <span>บาท</span>
        <span>สตางค์</span>
      </div>
      {v.rows.map((row, i) => {
        if (row.plain) {
          return (
            <div key={i} className="mh-calc-row">
              <span className="mh-calc-op">{row.op ? OP_SIGN[row.op] : ''}</span>
              <span className="mh-calc-plain">{row.value}</span>
              <span />
            </div>
          )
        }
        const { baht, satang } = splitSatang(row.value)
        return (
          <div key={i} className="mh-calc-row">
            <span className="mh-calc-op">{row.op ? OP_SIGN[row.op] : ''}</span>
            <span>{commas(baht)}</span>
            <span>{twoDigits(satang)}</span>
          </div>
        )
      })}
      <div className="mh-calc-line" />
      <div className="mh-calc-row mh-calc-result">
        <span>=</span>
        {v.hideResult || v.result === undefined ? (
          <>
            <span>?</span>
            <span>?</span>
          </>
        ) : (
          <>
            <span>{commas(splitSatang(v.result).baht)}</span>
            <span>{twoDigits(splitSatang(v.result).satang)}</span>
          </>
        )}
      </div>
    </div>
  )
}

function Bar({ v }: { v: Extract<Visual, { type: 'bar' }> }) {
  const known = v.parts.map((p) => p.value ?? 0)
  const sum = known.reduce((s, x) => s + x, 0) || 1
  const equal = v.mode === 'equal'
  const compare = v.mode === 'compare'
  return (
    <div className="mh-bar" role="img" aria-label="บาร์โมเดล">
      {compare ? (
        <div className="mh-bar-compare">
          {v.parts.map((p, i) => (
            <div key={i} className="mh-bar-line">
              <span className="mh-bar-name">{p.label}</span>
              <div
                className={`mh-bar-seg ${p.unknown ? 'is-unknown' : ''} c${i}`}
                style={{ width: `${p.unknown ? 62 : 92}%` }}
              >
                {p.unknown ? '?' : formatBS(p.value ?? 0)}
              </div>
            </div>
          ))}
          <div className="mh-bar-total">
            ส่วนต่าง: {v.total.unknown ? '?' : v.total.label}
          </div>
        </div>
      ) : (
        <>
          <div className="mh-bar-track">
            {v.parts.map((p, i) => (
              <div
                key={i}
                className={`mh-bar-seg ${p.unknown ? 'is-unknown' : ''} c${equal ? 0 : i}`}
                style={{ flex: equal ? 1 : p.unknown ? Math.max(sum * 0.4, 1) : Math.max(p.value ?? 1, sum * 0.12) }}
              >
                <span className="mh-bar-seg-label">{p.label}</span>
                {!equal && !p.unknown && p.value !== undefined && p.label !== formatBS(p.value) && (
                  <span className="mh-bar-seg-value">{formatBS(p.value)}</span>
                )}
              </div>
            ))}
          </div>
          <div className="mh-bar-brace" />
          <div className="mh-bar-total">
            {v.total.unknown ? `${v.total.label} = ?` : `${v.total.label}`}
            {equal && v.count ? ` (${v.count} ส่วนเท่า ๆ กัน)` : ''}
          </div>
        </>
      )}
    </div>
  )
}

export function VisualView({ visual }: { visual: Visual }) {
  switch (visual.type) {
    case 'money':
      return (
        <div className="mh-visual">
          <MoneyPile items={visual.items} />
          {visual.caption && <p className="mh-visual-caption">{visual.caption}</p>}
        </div>
      )
    case 'gallery':
      return <Gallery />
    case 'split':
      return <SplitTable value={visual.value} />
    case 'calc':
      return <Calc v={visual} />
    case 'bar':
      return <Bar v={visual} />
    case 'ledger':
      return <LedgerTable sheet={visual.sheet} showBalance={visual.showBalance} />
    case 'exchange':
      return (
        <div className="mh-exchange-visual">
          <MoneyPile items={visual.left} base={50} />
          <span className="mh-eq">=</span>
          <MoneyPile items={visual.right.slice(0, 12)} base={50} />
          {visual.right.length > 12 && <span className="mh-more">… อีก {visual.right.length - 12}</span>}
        </div>
      )
    case 'products':
      return (
        <div className="mh-products-mini">
          {visual.items.map((p) => (
            <span key={p.id} className="mh-tag">
              {p.emoji} {p.name} <b>{formatDot(p.price)}</b>
            </span>
          ))}
        </div>
      )
    case 'big':
      return (
        <div className="mh-big">
          <div className="mh-big-text">{visual.text}</div>
          {visual.sub && <div className="mh-big-sub">{visual.sub}</div>}
        </div>
      )
    case 'rules':
      return (
        <ul className="mh-rules">
          {visual.items.map((r, i) => (
            <li key={i}>{r}</li>
          ))}
        </ul>
      )
    case 'pair':
      return (
        <div className="mh-pair">
          <div className="mh-pair-card">{visual.aLabel ?? formatBS(visual.a)}</div>
          <div className="mh-pair-vs">?</div>
          <div className="mh-pair-card">{visual.bLabel ?? formatBS(visual.b)}</div>
        </div>
      )
  }
}

export { denom }
