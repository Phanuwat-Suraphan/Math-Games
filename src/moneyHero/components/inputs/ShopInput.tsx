import { useState } from 'react'
import type { Response, ShopQ } from '../../engine/types'
import { formatBS, formatDot } from '../../utils/money'
import { playSound } from '../../utils/sound'
import { BigField } from './AmountInput'

/**
 * SUPERMARKET: เลือกของบนชั้นเอง แล้วคิดเงินรวม (และเงินที่เหลือ ถ้ามีงบ)
 * เด็กเลือกของได้อิสระ ตัวตรวจคำนวณคำตอบจากของที่เลือกจริง
 */
export function ShopInput({
  q,
  disabled,
  wrongKeys,
  onSubmit,
}: {
  q: ShopQ
  disabled: boolean
  wrongKeys?: string[]
  onSubmit: (r: Response) => void
}) {
  const [picked, setPicked] = useState<string[]>([])
  const [totalBaht, setTotalBaht] = useState('')
  const [totalSatang, setTotalSatang] = useState('')
  const [changeBaht, setChangeBaht] = useState('')
  const [changeSatang, setChangeSatang] = useState('')
  const full = picked.length === q.pick

  const toggle = (id: string) => {
    if (disabled) return
    playSound(picked.includes(id) ? 'click' : 'coin')
    setPicked((list) => (list.includes(id) ? list.filter((x) => x !== id) : list.length >= q.pick ? list : [...list, id]))
  }

  const ready = full && (totalBaht !== '' || totalSatang !== '') && (q.budget === undefined || changeBaht !== '' || changeSatang !== '')

  return (
    <div className="mh-shop">
      <div className="mh-shelf" role="group" aria-label="ชั้นวางสินค้า">
        {q.products.map((p) => {
          const on = picked.includes(p.id)
          return (
            <button
              key={p.id}
              type="button"
              data-testid={`mh-product-${p.id}`}
              className={`mh-product ${on ? 'is-on' : ''}`}
              disabled={disabled || (!on && full)}
              onClick={() => toggle(p.id)}
              aria-pressed={on}
            >
              <span className="mh-product-emoji">{p.emoji}</span>
              <span className="mh-product-name">{p.name}</span>
              <span className="mh-price-tag">{formatDot(p.price)}</span>
              {on && <span className="mh-check">✔</span>}
            </button>
          )
        })}
      </div>

      <div className="mh-basket" aria-live="polite">
        <div className="mh-basket-head">
          🧺 ตะกร้า {picked.length} / {q.pick} ชิ้น
        </div>
        {picked.length === 0 && <span className="mh-wallet-empty">แตะสินค้าบนชั้นเพื่อใส่ตะกร้า</span>}
        {picked.map((id) => {
          const p = q.products.find((x) => x.id === id)!
          return (
            <div key={id} className="mh-basket-row">
              <span>
                {p.emoji} {p.name}
              </span>
              <b>{formatBS(p.price)}</b>
            </div>
          )
        })}
      </div>

      {full && (
        <div className="mh-shop-calc">
          <div className={`mh-shop-line ${wrongKeys?.includes('total') ? 'is-wrong' : ''}`}>
            <span className="mh-shop-label">รวมเป็นเงิน</span>
            <div className="mh-fields">
              <BigField value={totalBaht} onChange={setTotalBaht} label="บาท" testId="mh-total-baht" disabled={disabled} />
              <BigField value={totalSatang} onChange={setTotalSatang} label="สตางค์" testId="mh-total-satang" width="sm" disabled={disabled} />
            </div>
          </div>
          {q.budget !== undefined && (
            <div className={`mh-shop-line ${wrongKeys?.includes('change') ? 'is-wrong' : ''}`}>
              <span className="mh-shop-label">มีเงิน {formatBS(q.budget)} เหลือเงิน</span>
              <div className="mh-fields">
                <BigField value={changeBaht} onChange={setChangeBaht} label="บาท" testId="mh-change-baht" disabled={disabled} />
                <BigField value={changeSatang} onChange={setChangeSatang} label="สตางค์" testId="mh-change-satang" width="sm" disabled={disabled} />
              </div>
            </div>
          )}
        </div>
      )}

      <button
        type="button"
        data-testid="mh-submit"
        className="mh-btn mh-btn-go"
        disabled={disabled || !ready}
        onClick={() => {
          playSound('click')
          onSubmit({ kind: 'shop', picked, totalBaht, totalSatang, changeBaht, changeSatang })
        }}
      >
        ✔ จ่ายเงิน
      </button>
    </div>
  )
}
