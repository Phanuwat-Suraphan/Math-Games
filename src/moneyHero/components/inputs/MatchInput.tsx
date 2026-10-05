import { useCallback, useState } from 'react'
import type { MatchQ, Response } from '../../engine/types'
import { playSound } from '../../utils/sound'
import { useDrag } from '../../hooks/useDrag'
import { MoneyPile } from '../Art'

const PAIR_COLORS = ['#ff8a5c', '#4fb3ff', '#ffc93c', '#8ad66b', '#c38bff', '#ff6fa5']

/**
 * จับคู่: แตะซ้ายแล้วแตะขวา หรือลากจากซ้ายไปวางทางขวา
 * คู่ที่จับแล้วมีทั้งสีและหมายเลขกำกับ (ไม่ใช้สีอย่างเดียว)
 */
export function MatchInput({
  q,
  disabled,
  wrongKeys,
  onSubmit,
}: {
  q: MatchQ
  disabled: boolean
  wrongKeys?: string[]
  onSubmit: (r: Response) => void
}) {
  const [pairs, setPairs] = useState<Record<string, string>>({})
  const [active, setActive] = useState<string | null>(null)

  const connect = useCallback(
    (left: string, right: string) => {
      if (disabled) return
      playSound('click')
      setPairs((p) => {
        const next: Record<string, string> = {}
        // ฝั่งขวาหนึ่งช่องจับได้คู่เดียว
        for (const [l, r] of Object.entries(p)) if (r !== right && l !== left) next[l] = r
        next[left] = right
        return next
      })
      setActive(null)
    },
    [disabled],
  )

  const { ghost, bind, consumeClick } = useDrag<string>(
    useCallback((left: string, target: string) => {
      if (target.startsWith('r:')) connect(left, target.slice(2))
    }, [connect]),
  )

  const order = Object.keys(pairs)
  const numberOf = (left: string) => order.indexOf(left)
  const leftOfRight = (right: string) => Object.keys(pairs).find((l) => pairs[l] === right)
  const complete = order.length === q.pairs.length

  return (
    <div className="mh-match">
      <div className="mh-match-cols">
        <div className="mh-match-col">
          {q.pairs.map((p) => {
            const n = pairs[p.id] ? numberOf(p.id) : -1
            const wrong = wrongKeys?.includes(p.id)
            return (
              <button
                key={p.id}
                type="button"
                data-testid={`mh-left-${p.id}`}
                className={`mh-match-item ${active === p.id ? 'is-active' : ''} ${n >= 0 ? 'is-paired' : ''} ${wrong ? 'is-wrong' : ''}`}
                style={n >= 0 ? { borderColor: PAIR_COLORS[n % PAIR_COLORS.length] } : undefined}
                disabled={disabled}
                {...bind(p.id)}
                onClick={() => {
                  if (consumeClick()) return
                  if (pairs[p.id]) {
                    setPairs((old) => {
                      const next = { ...old }
                      delete next[p.id]
                      return next
                    })
                    return
                  }
                  playSound('click')
                  setActive(active === p.id ? null : p.id)
                }}
                aria-label={p.left.label}
              >
                {p.left.money ? <MoneyPile items={p.left.money} base={46} /> : <span>{p.left.label}</span>}
                {n >= 0 && (
                  <span className="mh-pair-badge" style={{ background: PAIR_COLORS[n % PAIR_COLORS.length] }}>
                    {n + 1}
                  </span>
                )}
                {wrong && <span className="mh-mark-wrong">✗</span>}
              </button>
            )
          })}
        </div>
        <div className="mh-match-col">
          {q.rightOrder.map((rid) => {
            const p = q.pairs.find((x) => x.id === rid)!
            const owner = leftOfRight(rid)
            const n = owner ? numberOf(owner) : -1
            return (
              <button
                key={rid}
                type="button"
                data-testid={`mh-right-${rid}`}
                data-drop={`r:${rid}`}
                className={`mh-match-item mh-match-right ${n >= 0 ? 'is-paired' : ''} ${active ? 'is-target' : ''}`}
                style={n >= 0 ? { borderColor: PAIR_COLORS[n % PAIR_COLORS.length] } : undefined}
                disabled={disabled}
                onClick={() => {
                  if (active) connect(active, rid)
                }}
                aria-label={p.right.label}
              >
                {n >= 0 && (
                  <span className="mh-pair-badge" style={{ background: PAIR_COLORS[n % PAIR_COLORS.length] }}>
                    {n + 1}
                  </span>
                )}
                <span>{p.right.label}</span>
              </button>
            )
          })}
        </div>
      </div>
      <p className="mh-help-line">{active ? '👉 แตะคำตอบทางขวาเพื่อจับคู่' : '👆 แตะทางซ้ายก่อน แล้วแตะทางขวา (หรือลากไปวาง)'}</p>
      <button
        type="button"
        data-testid="mh-submit"
        className="mh-btn mh-btn-go"
        disabled={disabled || !complete}
        onClick={() => onSubmit({ kind: 'match', pairs })}
      >
        ✔ ตรวจคำตอบ
      </button>
      {ghost && (
        <div className="mh-ghost mh-ghost-chip" style={{ left: ghost.x, top: ghost.y }} aria-hidden="true">
          🔗
        </div>
      )}
    </div>
  )
}
