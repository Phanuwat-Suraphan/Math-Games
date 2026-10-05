import { useCallback, useState } from 'react'
import type { Response, SortQ } from '../../engine/types'
import { playSound } from '../../utils/sound'
import { useDrag } from '../../hooks/useDrag'

/**
 * เรียงลำดับจำนวนเงิน: แตะเงินตามลำดับ หรือลากไปวางในช่อง 1, 2, 3, ...
 */
export function SortInput({
  q,
  disabled,
  wrongKeys,
  onSubmit,
}: {
  q: SortQ
  disabled: boolean
  wrongKeys?: string[]
  onSubmit: (r: Response) => void
}) {
  const [slots, setSlots] = useState<(string | null)[]>(() => q.items.map(() => null))

  const place = useCallback(
    (id: string, slot?: number) => {
      if (disabled) return
      playSound('click')
      setSlots((s) => {
        const next = s.map((x) => (x === id ? null : x))
        const target = slot ?? next.findIndex((x) => x === null)
        if (target < 0) return s
        next[target] = id
        return next
      })
    },
    [disabled],
  )

  const { ghost, bind, consumeClick } = useDrag<string>(
    useCallback((id: string, target: string) => {
      if (target.startsWith('slot:')) place(id, Number(target.slice(5)))
    }, [place]),
  )

  const pool = q.items.filter((it) => !slots.includes(it.id))
  const label = (id: string) => q.items.find((it) => it.id === id)?.label ?? ''

  return (
    <div className="mh-sort">
      <div className="mh-sort-hint">{q.order === 'asc' ? 'น้อย ➜ มาก' : 'มาก ➜ น้อย'}</div>
      <div className="mh-sort-slots">
        {slots.map((id, i) => (
          <button
            key={i}
            type="button"
            data-drop={`slot:${i}`}
            data-testid={`mh-slot-${i}`}
            className={`mh-sort-slot ${id ? 'is-filled' : ''} ${id && wrongKeys?.includes(id) ? 'is-wrong' : ''}`}
            disabled={disabled || !id}
            onClick={() => id && setSlots((s) => s.map((x) => (x === id ? null : x)))}
          >
            <span className="mh-sort-num">{i + 1}</span>
            <span>{id ? label(id) : '…'}</span>
            {id && wrongKeys?.includes(id) && <span className="mh-mark-wrong">✗</span>}
          </button>
        ))}
      </div>
      <div className="mh-sort-pool">
        {pool.map((it) => (
          <button
            key={it.id}
            type="button"
            data-testid={`mh-sort-item-${it.id}`}
            className="mh-sort-item"
            disabled={disabled}
            {...bind(it.id)}
            onClick={() => {
              if (consumeClick()) return
              place(it.id)
            }}
          >
            {it.label}
          </button>
        ))}
        {pool.length === 0 && <span className="mh-help-line">แตะช่องด้านบนเพื่อเอาออก</span>}
      </div>
      <button
        type="button"
        data-testid="mh-submit"
        className="mh-btn mh-btn-go"
        disabled={disabled || slots.some((s) => s === null)}
        onClick={() => onSubmit({ kind: 'sort', order: slots as string[] })}
      >
        ✔ ตรวจคำตอบ
      </button>
      {ghost && (
        <div className="mh-ghost mh-ghost-chip" style={{ left: ghost.x, top: ghost.y }} aria-hidden="true">
          {label(ghost.payload)}
        </div>
      )}
    </div>
  )
}
