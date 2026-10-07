import { useEffect, useRef, useState, type CSSProperties, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { formatBS } from '../utils/money'
import { playSound } from '../utils/sound'
import { Confetti } from '../components/Effects'
import {
  CLASS_GOALS,
  ENTRY_KINDS,
  START_MONEY,
  changeFor,
  classProgress,
  classSales,
  defaultGroups,
  groupSummary,
  kindOf,
  parseGroups,
  type KadEntryKind,
  type KadGroup,
} from './kadData'
import { EcoCoin, EcoNote } from './KadArt'
import { TreeStage } from './KadSheets'
import './kad.css'

/**
 * แดชบอร์ดตลาดนัดกาดรักษ์โลก (#/kad/class) — ครูเปิดขึ้นจอระหว่างเล่นจริง
 * - จดเงินของแต่ละกลุ่ม: ขายขยะ ขายสินค้า ซื้ออุปกรณ์ → เห็นคงเหลือและกำไรทันที
 * - ยอดขายรวมทั้งห้องทำให้ต้นไม้โต ปลดล็อกที่ 100 / 200 / 300 บาท
 * - เครื่องคิดเงินทอน แสดงเงินจำลองที่ต้องทอน
 * ข้อมูลเก็บในเครื่องนี้ (localStorage)
 */

const KEY = 'moneyHero.kad.class.v1'

function load(): KadGroup[] {
  try {
    return parseGroups(globalThis.localStorage?.getItem(KEY) ?? null)
  } catch {
    return defaultGroups()
  }
}

/** "12.5" → 1250 สตางค์ (ปัดเป็น 25 สตางค์) · ไม่ถูกต้อง = null */
function toSatang(text: string): number | null {
  const v = Number(text.replace(/,/g, '').trim())
  if (!Number.isFinite(v) || v <= 0) return null
  return Math.round(v * 4) * 25
}

function GroupCard({ g, onChange, onRemove }: { g: KadGroup; onChange: (g: KadGroup) => void; onRemove: () => void }) {
  const [kind, setKind] = useState<KadEntryKind>('sale')
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [bump, setBump] = useState(0)
  const s = groupSummary(g)

  const add = (e: FormEvent) => {
    e.preventDefault()
    const v = toSatang(amount)
    if (v === null) return
    onChange({ ...g, entries: [...g.entries, { at: Date.now(), kind, amount: v, note: note.trim() || undefined }] })
    setAmount('')
    setNote('')
    setBump((n) => n + 1)
    playSound(kindOf(kind).sign > 0 ? 'coin' : 'click')
  }

  return (
    <section className="kad-group" style={{ '--kad-c': g.color } as CSSProperties} data-testid={`kad-group-${g.id}`}>
      <header className="kad-group-head">
        <span className="kad-group-icon">{g.icon}</span>
        <input className="kad-group-name" value={g.name} onChange={(e) => onChange({ ...g, name: e.target.value.slice(0, 30) })} aria-label="ชื่อกลุ่ม" />
        <button type="button" className="kad-x" onClick={onRemove} aria-label={`ลบกลุ่ม ${g.name}`}>
          ✕
        </button>
      </header>
      <div key={bump} className={`kad-group-balance ${bump ? 'is-bump' : ''}`}>
        คงเหลือ <b data-testid={`kad-balance-${g.id}`}>{formatBS(s.balance)}</b>
      </div>
      <div className="kad-group-stats">
        <span>♻️ ขายขยะ {formatBS(s.trash)}</span>
        <span>🛍️ ขายสินค้า {formatBS(s.sales)}</span>
        <span>🛒 ต้นทุน {formatBS(s.cost)}</span>
      </div>
      <div className={`kad-group-profit ${s.profit < 0 ? 'is-loss' : ''}`} data-testid={`kad-profit-${g.id}`}>
        {s.profit < 0 ? '📉 ขาดทุน' : '📈 กำไร'} {formatBS(Math.abs(s.profit))}
        <small>
          ขายสินค้า {formatBS(s.sales)} − ต้นทุน {formatBS(s.cost)}
        </small>
      </div>

      <form className="kad-group-form" onSubmit={add}>
        <div className="kad-kinds" role="radiogroup" aria-label="ชนิดรายการ">
          {ENTRY_KINDS.map((k) => (
            <button
              key={k.id}
              type="button"
              role="radio"
              aria-checked={kind === k.id}
              className={`kad-kind ${kind === k.id ? 'is-on' : ''} ${k.sign > 0 ? 'is-in' : 'is-out'}`}
              onClick={() => setKind(k.id)}
              data-testid={`kad-kind-${g.id}-${k.id}`}
            >
              {k.icon} {k.label}
            </button>
          ))}
        </div>
        <div className="kad-group-inputs">
          <input
            inputMode="decimal"
            placeholder="เงิน (บาท)"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            aria-label="จำนวนเงิน (บาท)"
            data-testid={`kad-amount-${g.id}`}
          />
          <input placeholder="รายการ" value={note} onChange={(e) => setNote(e.target.value.slice(0, 40))} aria-label="รายการ" />
          <button type="submit" className="mh-btn mh-btn-go mh-btn-sm" disabled={toSatang(amount) === null} data-testid={`kad-add-${g.id}`}>
            บันทึก
          </button>
        </div>
      </form>

      {g.entries.length > 0 && (
        <ul className="kad-entries">
          {g.entries
            .map((e, i) => ({ e, i }))
            .slice(-5)
            .reverse()
            .map(({ e, i }) => {
              const k = kindOf(e.kind)
              return (
                <li key={`${e.at}-${i}`} className={k.sign > 0 ? 'is-in' : 'is-out'}>
                  <span>
                    {k.icon} {e.note || k.label}
                  </span>
                  <b>
                    {k.sign > 0 ? '+' : '−'}
                    {formatBS(e.amount)}
                  </b>
                  <button type="button" className="kad-x" onClick={() => onChange({ ...g, entries: g.entries.filter((_, j) => j !== i) })} aria-label="ลบรายการ">
                    ✕
                  </button>
                </li>
              )
            })}
        </ul>
      )}
    </section>
  )
}

function ChangeCalc() {
  const [price, setPrice] = useState('35')
  const [paid, setPaid] = useState('50')
  const p = toSatang(price)
  const q = toSatang(paid)
  const r = p !== null && q !== null ? changeFor(p, q) : null
  return (
    <section className="mh-card kad-change">
      <h3 className="mh-card-title">💵 เครื่องคิดเงินทอน</h3>
      <div className="kad-change-inputs">
        <label>
          ราคาสินค้า
          <input inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} data-testid="kad-change-price" />
          บาท
        </label>
        <label>
          ลูกค้าจ่าย
          <input inputMode="decimal" value={paid} onChange={(e) => setPaid(e.target.value)} data-testid="kad-change-paid" />
          บาท
        </label>
      </div>
      <div className="kad-change-result" data-testid="kad-change-result" aria-live="polite">
        {r === null ? (
          'ใส่ราคาและเงินที่ลูกค้าจ่าย'
        ) : !r.ok && r.short > 0 ? (
          <>เงินไม่พอ ขาดอีก {formatBS(r.short)}</>
        ) : r.change === 0 ? (
          <>จ่ายพอดี ไม่ต้องทอน 🎉</>
        ) : (
          <>
            {formatBS(q ?? 0)} − {formatBS(p ?? 0)} = ทอน <b>{formatBS(r.change)}</b>
          </>
        )}
      </div>
      {r && r.pieces.length > 0 && (
        <div className="kad-change-pieces">
          {r.pieces.map((m, i) => (
            <span key={i} className={m.kind === 'coin' ? 'kad-strip-coin' : 'kad-strip-note'}>
              {m.kind === 'coin' ? <EcoCoin money={m} /> : <EcoNote money={m} />}
            </span>
          ))}
        </div>
      )}
    </section>
  )
}

export function KadClassPage() {
  const [groups, setGroups] = useState<KadGroup[]>(load)
  const sales = classSales(groups)
  const prog = classProgress(Math.floor(sales / 100))
  const lastUnlocked = useRef(prog.unlocked)
  const [party, setParty] = useState(0)

  useEffect(() => {
    try {
      globalThis.localStorage?.setItem(KEY, JSON.stringify(groups))
    } catch {
      /* ไม่เป็นไร */
    }
  }, [groups])

  useEffect(() => {
    if (prog.unlocked > lastUnlocked.current) {
      setParty((n) => n + 1)
      playSound('complete')
    }
    lastUnlocked.current = prog.unlocked
  }, [prog.unlocked])

  const prevAt = prog.unlocked === 0 ? 0 : CLASS_GOALS[prog.unlocked - 1].at
  const nextAt = prog.next?.at ?? prevAt
  const ratio = prog.next ? Math.min(1, (sales / 100 - prevAt) / (nextAt - prevAt)) : 1

  return (
    <div className="kad-page kad-class" data-testid="kad-class-page">
      <div className="mh-page-head">
        <Link to="/kad" className="mh-icon-btn" aria-label="กลับชุดสื่อกาดรักษ์โลก">
          <ArrowLeft size={24} />
        </Link>
        <h1 className="mh-title">📺 ตลาดนัดกาดรักษ์โลก</h1>
        <button
          type="button"
          className="mh-btn mh-btn-soft mh-btn-sm"
          onClick={() => {
            if (window.confirm('ล้างข้อมูลทุกกลุ่ม เริ่มรอบใหม่?')) setGroups(defaultGroups())
          }}
          data-testid="kad-class-reset"
        >
          ↺ เริ่มรอบใหม่
        </button>
      </div>

      <section className="mh-card kad-class-tree">
        {party > 0 && <Confetti key={party} />}
        <div key={prog.unlocked} className="kad-class-tree-art">
          <TreeStage stage={prog.unlocked} />
        </div>
        <div className="kad-class-tree-info">
          <div className="kad-class-sales">
            ยอดขายรวมทั้งห้อง <b data-testid="kad-class-sales">{formatBS(sales)}</b>
          </div>
          <div className="kad-class-track" role="progressbar" aria-valuemin={prevAt} aria-valuemax={nextAt} aria-valuenow={Math.floor(sales / 100)}>
            <div className="kad-class-fill" style={{ width: `${Math.round(ratio * 100)}%` }} />
          </div>
          <p className="kad-class-next" data-testid="kad-class-next">
            {prog.next ? (
              <>
                อีก <b>{prog.need} บาท</b> {prog.next.icon} {prog.next.label}
              </>
            ) : (
              <>🎉 ปลดล็อกครบทุกเป้าหมายแล้ว! สวนของห้องเราเสร็จสมบูรณ์</>
            )}
          </p>
          <div className="kad-class-goals">
            {CLASS_GOALS.map((g, i) => (
              <span key={g.at} className={i < prog.unlocked ? 'is-done' : ''}>
                {i < prog.unlocked ? '✅' : g.icon} {g.at} บาท · {g.label}
              </span>
            ))}
          </div>
        </div>
      </section>

      <div className="kad-groups">
        {groups.map((g) => (
          <GroupCard
            key={g.id}
            g={g}
            onChange={(next) => setGroups((list) => list.map((x) => (x.id === g.id ? next : x)))}
            onRemove={() => {
              if (window.confirm(`ลบกลุ่ม ${g.name}?`)) setGroups((list) => list.filter((x) => x.id !== g.id))
            }}
          />
        ))}
        <button
          type="button"
          className="kad-group kad-group-add"
          onClick={() =>
            setGroups((list) => [
              ...list,
              { id: `g${Date.now().toString(36)}`, name: `กลุ่มที่ ${list.length + 1}`, icon: '🏪', color: '#495057', start: START_MONEY, entries: [] },
            ])
          }
        >
          + เพิ่มกลุ่ม
        </button>
      </div>

      <ChangeCalc />
      <p className="kad-intro">💡 กำไร = รายได้จากการขายสินค้า − ต้นทุน (เงินที่ซื้ออุปกรณ์) · เงินจากการขายขยะคือทุนเริ่มต้น ยังไม่นับเป็นกำไร · ทุกกลุ่มเริ่มต้น {formatBS(START_MONEY)}</p>
    </div>
  )
}
