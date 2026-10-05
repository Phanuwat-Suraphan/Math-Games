import { useCallback, useState } from 'react'
import type { DenomId, PayQ, Response } from '../../engine/types'
import { comboKey, denom, sortDenomsDesc, sumDenoms } from '../../data/denominations'
import { formatBS } from '../../utils/money'
import { playSound } from '../../utils/sound'
import { useDrag } from '../../hooks/useDrag'
import { MoneyPiece, MoneyPile } from '../Art'

/**
 * จ่ายเงินซื้อของ / EXCHANGE STATION / MONEY MAKER
 * แตะเงินในถาดเพื่อใส่ หรือ "ลาก" ไปวางในกระเป๋า แตะเงินในกระเป๋าเพื่อเอาออก
 */
export function PayInput({
  q,
  disabled,
  wrongKeys,
  onSubmit,
}: {
  q: PayQ
  disabled: boolean
  wrongKeys?: string[]
  onSubmit: (r: Response) => void
}) {
  const [wallet, setWallet] = useState<DenomId[]>([])
  const [found, setFound] = useState<DenomId[][]>([])
  const [note, setNote] = useState('')
  const ways = q.mode === 'make' ? q.ways ?? 1 : 1
  const total = sumDenoms(wallet)

  const add = useCallback(
    (id: DenomId) => {
      if (disabled) return
      playSound('coin')
      setNote('')
      setWallet((w) => (w.length >= 40 ? w : [...w, id]))
    },
    [disabled],
  )
  const { ghost, bind, consumeClick } = useDrag<DenomId>(
    useCallback((id: DenomId, target: string) => {
      if (target === 'wallet') add(id)
    }, [add]),
  )

  const removeAt = (i: number) => {
    if (disabled) return
    playSound('click')
    setWallet((w) => w.filter((_, k) => k !== i))
  }

  const saveWay = () => {
    if (disabled) return
    if (total !== q.target) {
      setNote(total < q.target ? `ยังขาดอีก ${formatBS(q.target - total)}` : `เกินไป ${formatBS(total - q.target)}`)
      return
    }
    if (q.rule?.exclude && wallet.some((id) => q.rule!.exclude!.includes(id))) {
      setNote(q.rule.label ?? 'มีเงินที่ห้ามใช้')
      return
    }
    if (q.rule?.minPieces && wallet.length < q.rule.minPieces) {
      setNote(`ต้องใช้เงินอย่างน้อย ${q.rule.minPieces} ชิ้น`)
      return
    }
    if (found.some((c) => comboKey(c) === comboKey(wallet))) {
      setNote('แบบนี้มีแล้ว ลองใช้เงินชนิดอื่นดูนะ')
      return
    }
    playSound('star')
    const next = [...found, sortDenomsDesc(wallet)]
    setFound(next)
    setWallet([])
    setNote(next.length < ways ? `เยี่ยม! หาอีก ${ways - next.length} แบบ` : '')
    if (next.length >= ways) onSubmit({ kind: 'pay', combos: next })
  }

  const submit = () => {
    if (disabled || wallet.length === 0) return
    playSound('click')
    onSubmit({ kind: 'pay', combos: [wallet] })
  }

  const status = total === q.target ? 'eq' : total < q.target ? 'lt' : 'gt'
  const badWay = wrongKeys?.includes('0')

  return (
    <div className="mh-pay">
      <div className="mh-pay-target">
        {q.mode === 'exchange' && q.give ? (
          <div className="mh-pay-give">
            <span className="mh-pay-tag">ก่อนแลก</span>
            <MoneyPile items={q.give} base={52} />
            <span className="mh-pay-value">= {formatBS(q.target)}</span>
          </div>
        ) : (
          <div className="mh-pay-give">
            {q.product && <span className="mh-pay-product">{q.product.emoji}</span>}
            <span className="mh-pay-tag">{q.mode === 'make' ? 'เป้าหมาย' : 'ต้องจ่าย'}</span>
            <span className="mh-pay-value">{formatBS(q.target)}</span>
          </div>
        )}
        {q.rule?.label && <div className="mh-pay-rule">📌 {q.rule.label}</div>}
      </div>

      {q.mode === 'make' && (
        <div className="mh-found" aria-live="polite">
          {Array.from({ length: ways }, (_, i) => (
            <div key={i} className={`mh-found-slot ${found[i] ? 'is-done' : ''}`}>
              <span className="mh-found-num">แบบที่ {i + 1}</span>
              {found[i] ? <MoneyPile items={found[i]} base={30} /> : <span className="mh-found-empty">?</span>}
            </div>
          ))}
        </div>
      )}

      <div
        className={`mh-wallet ${badWay ? 'is-wrong' : ''}`}
        data-drop="wallet"
        data-testid="mh-wallet"
        aria-label={q.mode === 'exchange' ? 'หลังแลก' : 'เงินที่เลือก'}
      >
        <div className="mh-wallet-head">
          <span>{q.mode === 'exchange' ? '🔄 หลังแลก' : q.mode === 'make' ? '🧰 แบบที่กำลังสร้าง' : '👛 เงินที่จ่าย'}</span>
          <span className={`mh-wallet-total is-${status}`}>
            รวม {formatBS(total)} {status === 'eq' ? '✔ พอดี' : status === 'lt' ? '▲ ยังขาด' : '▼ เกิน'}
          </span>
        </div>
        <div className="mh-wallet-items">
          {wallet.length === 0 && <span className="mh-wallet-empty">แตะหรือลากเงินจากถาดมาวางที่นี่</span>}
          {wallet.map((id, i) => (
            <button
              key={`${id}-${i}`}
              type="button"
              className="mh-wallet-piece"
              onClick={() => removeAt(i)}
              disabled={disabled}
              aria-label={`เอา${denom(id).name}ออก`}
            >
              <MoneyPiece id={id} base={44} />
            </button>
          ))}
        </div>
      </div>

      <div className="mh-tray" aria-label="ถาดเงิน">
        {q.tray.map((id) => (
          <button
            key={id}
            type="button"
            data-testid={`mh-tray-${id}`}
            className="mh-tray-item"
            disabled={disabled}
            {...bind(id)}
            onClick={() => {
              if (consumeClick()) return
              add(id)
            }}
            aria-label={`ใส่${denom(id).name}`}
          >
            <MoneyPiece id={id} base={50} />
          </button>
        ))}
      </div>

      {note && <div className="mh-note-line">{note}</div>}

      <div className="mh-row-buttons">
        <button type="button" className="mh-btn mh-btn-soft" data-testid="mh-pay-clear" disabled={disabled || wallet.length === 0} onClick={() => setWallet([])}>
          ล้าง
        </button>
        {q.mode === 'make' ? (
          <button type="button" className="mh-btn mh-btn-go" data-testid="mh-save-way" disabled={disabled || wallet.length === 0} onClick={saveWay}>
            ➕ บันทึกแบบนี้
          </button>
        ) : (
          <button type="button" className="mh-btn mh-btn-go" data-testid="mh-submit" disabled={disabled || wallet.length === 0} onClick={submit}>
            ✔ {q.mode === 'exchange' ? 'แลกเงิน' : 'จ่ายเงิน'}
          </button>
        )}
      </div>

      {ghost && (
        <div className="mh-ghost" style={{ left: ghost.x, top: ghost.y }} aria-hidden="true">
          <MoneyPiece id={ghost.payload} base={50} />
        </div>
      )}
    </div>
  )
}
