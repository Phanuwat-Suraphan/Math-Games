import { useState } from 'react'
import type { ChoiceQ, Response } from '../../engine/types'
import { MoneyPile } from '../Art'
import { playSound } from '../../utils/sound'

export function ChoiceInput({
  q,
  disabled,
  wrongKeys,
  onSubmit,
}: {
  q: ChoiceQ
  disabled: boolean
  wrongKeys?: string[]
  onSubmit: (r: Response) => void
}) {
  const [picked, setPicked] = useState<string | null>(null)
  const choose = (id: string) => {
    if (disabled) return
    playSound('click')
    setPicked(id)
    onSubmit({ kind: 'choice', id })
  }

  return (
    <div className={`mh-choices mh-choices-${q.layout}`} role="group" aria-label="ตัวเลือก">
      {q.options.map((o) => {
        const wrong = wrongKeys?.includes(o.id)
        const hasMoney = !!o.money && o.money.length > 0
        return (
          <button
            key={o.id}
            type="button"
            data-testid={`mh-opt-${o.id}`}
            className={`mh-choice ${picked === o.id ? 'is-picked' : ''} ${wrong ? 'is-wrong' : ''} ${hasMoney ? 'has-money' : ''}`}
            disabled={disabled}
            onClick={() => choose(o.id)}
            aria-label={o.label}
          >
            {o.symbol && <span className="mh-choice-symbol">{o.symbol}</span>}
            {hasMoney && <MoneyPile items={o.money!} base={q.layout === 'grid' ? 62 : 44} />}
            {/* ข้อที่ให้แตะเงินตามชื่อ ห้ามแสดงชื่อบนปุ่ม ไม่งั้นเฉลยตัวเอง */}
            {(!hasMoney || q.layout !== 'grid') && <span className="mh-choice-label">{o.label}</span>}
            {wrong && <span className="mh-mark-wrong" aria-label="ยังไม่ถูก">✗</span>}
          </button>
        )
      })}
    </div>
  )
}
