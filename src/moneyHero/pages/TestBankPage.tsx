import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Plus, Printer } from 'lucide-react'
import type { DenomId, Skill } from '../engine/types'
import { useGame } from '../hooks/useMoneyGame'
import type { TestKind } from '../engine/progress'
import {
  answerText,
  blankItem,
  CHOICE_LABELS,
  defaultBank,
  fullScore,
  itemProblems,
  KIND_NAME,
  parallelProblems,
  skillCounts,
  type TestForm,
  type TestItem,
} from '../engine/testBank'
import { itemStats, takenCount } from '../engine/exam'
import { SKILLS, SKILL_ICONS, SKILL_NAMES } from '../data/characters'
import { ALL_DENOM_IDS, denom } from '../data/denominations'
import { MoneyPile, MoneyPiece } from '../components/Art'
import { Sky } from '../components/Sky'
import { playSound } from '../utils/sound'

/**
 * คลังข้อสอบ (หน้าครู): แก้ เพิ่ม ลบ เรียงข้อสอบก่อนเรียน/หลังเรียนได้เองโดยไม่ต้องแก้โค้ด
 * ตั้งเวลา สุ่มข้อ สุ่มตัวเลือก ทำได้ครั้งเดียว เปิด/ปิดแบบทดสอบ ตรวจความเป็นฉบับคู่ขนาน
 * และดูค่าความยากรายข้อจากผลของนักเรียน
 * เส้นทาง #/teacher/tests
 */
export function TestBankPage() {
  const { save, updateSave, pushToast } = useGame()
  const [kind, setKind] = useState<TestKind>('pre')
  const [editing, setEditing] = useState<TestItem | null>(null)
  const [confirmDel, setConfirmDel] = useState<string | null>(null)
  const [confirmReset, setConfirmReset] = useState(false)
  const form = save.bank[kind]
  const other = save.bank[kind === 'pre' ? 'post' : 'pre']
  const players = useMemo(() => Object.values(save.players), [save.players])
  const stats = useMemo(() => itemStats(players, form), [players, form])
  const taken = takenCount(players, kind)
  const parallel = parallelProblems(save.bank.pre, save.bank.post)
  const counts = skillCounts(form)

  const setForm = (fn: (f: TestForm) => TestForm) => updateSave((s) => ({ ...s, bank: { ...s.bank, [kind]: fn(s.bank[kind]), updatedAt: Date.now() } }))

  const saveItem = (item: TestItem) => {
    setForm((f) => {
      const at = f.items.findIndex((i) => i.id === item.id)
      const items = at >= 0 ? f.items.map((i) => (i.id === item.id ? item : i)) : [...f.items, item]
      return { ...f, items }
    })
    setEditing(null)
    playSound('complete')
    pushToast('💾', 'บันทึกข้อสอบแล้ว')
  }

  const move = (id: string, dir: -1 | 1) =>
    setForm((f) => {
      const items = f.items.slice()
      const i = items.findIndex((x) => x.id === id)
      const j = i + dir
      if (i < 0 || j < 0 || j >= items.length) return f
      ;[items[i], items[j]] = [items[j], items[i]]
      return { ...f, items }
    })

  return (
    <div className="mh-page mh-teacher mh-bank" data-testid="mh-bank">
      <Sky city={false} />
      <div className="mh-page-head">
        <Link to="/teacher" className="mh-icon-btn" aria-label="กลับแผงคุณครู">
          <ArrowLeft size={24} />
        </Link>
        <h1 className="mh-title">📝 คลังข้อสอบ</h1>
        <div className="mh-teacher-actions">
          <Link to={`/teacher/print/test/${kind}`} className="mh-btn mh-btn-go" data-testid="mh-bank-print">
            <Printer size={20} /> พิมพ์ข้อสอบ (A4)
          </Link>
        </div>
      </div>

      <div className="mh-chips" role="tablist" aria-label="ฉบับ">
        {(['pre', 'post'] as TestKind[]).map((k) => (
          <button
            key={k}
            type="button"
            role="tab"
            aria-selected={k === kind}
            className={`mh-chip ${k === kind ? 'is-on' : ''}`}
            data-testid={`mh-bank-tab-${k}`}
            onClick={() => {
              setKind(k)
              setEditing(null)
            }}
          >
            {k === 'pre' ? '🧭' : '🎓'} {KIND_NAME[k]} ({save.bank[k].items.length} ข้อ)
          </button>
        ))}
      </div>

      <section className="mh-card">
        <div className="mh-bank-summary" data-testid="mh-bank-summary">
          <span>
            <b>{form.items.length}</b> ข้อ
          </span>
          <span>
            คะแนนเต็ม <b>{fullScore(form)}</b>
          </span>
          <span>
            ปรนัย {form.items.filter((i) => i.type === 'choice').length} · เติมตัวเลข {form.items.filter((i) => i.type === 'number').length}
          </span>
          <span>นักเรียนทำแล้ว {taken} คน</span>
        </div>
        <div className={`mh-bank-parallel ${parallel.length === 0 ? 'is-ok' : 'is-warn'}`} data-testid="mh-bank-parallel">
          {parallel.length === 0 ? (
            <>✅ ฉบับคู่ขนาน: ก่อนเรียนและหลังเรียน จำนวนข้อ คะแนนเต็ม จุดประสงค์ และชนิดข้อเท่ากัน</>
          ) : (
            <>
              ⚠️ ก่อนเรียนกับหลังเรียนยังไม่เป็นฉบับคู่ขนาน: {parallel.join(' · ')}
            </>
          )}
        </div>
        {taken > 0 && <p className="mh-soft">มีนักเรียนทำฉบับนี้แล้ว การแก้ข้อสอบไม่เปลี่ยนคะแนนที่บันทึกไว้แล้ว และนักเรียนที่ทำค้างอยู่ต้องเริ่มใหม่</p>}
        <div className="mh-bank-skills">
          {SKILLS.map((s) => (
            <span key={s} className={`mh-bank-skill ${counts[s] !== skillCounts(other)[s] ? 'is-diff' : ''}`} title={SKILL_NAMES[s]}>
              {SKILL_ICONS[s]} {SKILL_NAMES[s]} <b>{counts[s]}</b>
            </span>
          ))}
        </div>
      </section>

      <section className="mh-card">
        <h2 className="mh-card-title">⚙️ การทำแบบทดสอบ</h2>
        <div className="mh-form-grid">
          <label>
            ชื่อแบบทดสอบ
            <input className="mh-text-input" value={form.title} maxLength={80} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} data-testid="mh-bank-title" />
          </label>
          <label>
            เวลา (นาที · 0 = ไม่จำกัด)
            <input
              className="mh-text-input"
              inputMode="numeric"
              value={form.minutes}
              data-testid="mh-bank-minutes"
              onChange={(e) => {
                const n = Number(e.target.value.replace(/\D/g, '').slice(0, 3))
                setForm((f) => ({ ...f, minutes: Math.min(180, n) }))
              }}
            />
          </label>
        </div>
        {(
          [
            ['open', kind === 'pre' ? 'เปิดให้นักเรียนทำ' : 'เปิดให้นักเรียนทุกคนทำ', kind === 'pre' ? 'ปิดไว้ = นักเรียนยังทำไม่ได้' : 'ปิดไว้ = นักเรียนทำได้เมื่อผ่านด่าน 12 เท่านั้น'],
            ['shuffleItems', 'สุ่มลำดับข้อ', 'นักเรียนแต่ละคนได้ลำดับข้อไม่เหมือนกัน'],
            ['shuffleChoices', 'สุ่มลำดับตัวเลือก', 'ตำแหน่ง ก ข ค ง ของคำตอบเปลี่ยนไปในแต่ละคน'],
            ['oneAttempt', 'ทำได้ครั้งเดียว', 'ครูกด "ให้ทำใหม่" เป็นรายคนได้ที่แผงคุณครู'],
          ] as const
        ).map(([key, label, note]) => (
          <label key={key} className="mh-switch-row">
            <span className="mh-switch-text">
              <b>{label}</b>
              <span>{note}</span>
            </span>
            <input type="checkbox" className="mh-switch" checked={form[key]} data-testid={`mh-bank-${key}`} onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.checked }))} />
          </label>
        ))}
      </section>

      <section className="mh-card">
        <div className="mh-roster-head">
          <h2 className="mh-card-title">📋 ข้อสอบ {form.items.length} ข้อ</h2>
          <button type="button" className="mh-btn mh-btn-gold" onClick={() => setEditing(blankItem(kind))} data-testid="mh-bank-add">
            <Plus size={18} /> เพิ่มข้อสอบ
          </button>
        </div>
        {editing && !form.items.some((i) => i.id === editing.id) && <ItemEditor key={editing.id} initial={editing} onSave={saveItem} onCancel={() => setEditing(null)} />}
        <ol className="mh-bank-list" data-testid="mh-bank-list">
          {form.items.map((item, i) => {
            const st = stats[item.id]
            return (
              <li key={item.id} className="mh-bank-item" data-testid={`mh-bank-item-${i + 1}`}>
                {editing?.id === item.id ? (
                  <ItemEditor key={item.id} initial={editing} onSave={saveItem} onCancel={() => setEditing(null)} />
                ) : (
                  <>
                    <div className="mh-bank-item-head">
                      <b>ข้อ {i + 1}.</b>
                      <span className="mh-bank-tag">
                        {SKILL_ICONS[item.skill]} {SKILL_NAMES[item.skill]}
                      </span>
                      <span className="mh-bank-tag">{item.type === 'choice' ? 'ปรนัย 4 ตัวเลือก' : 'เติมตัวเลข'}</span>
                      <span className="mh-bank-tag">{item.points} คะแนน</span>
                      {st && st.p !== null && (
                        <span className={`mh-bank-tag ${st.p < 0.2 || st.p > 0.8 ? 'is-warn' : ''}`} title="ค่าความยาก p = สัดส่วนนักเรียนที่ตอบถูก (0.20–0.80 เหมาะสม)">
                          ตอบถูก {st.right}/{st.n} คน · p = {st.p.toFixed(2)}
                        </span>
                      )}
                    </div>
                    <p className="mh-bank-text">{item.text}</p>
                    {item.money.length > 0 && <MoneyPile items={item.money} base={30} className="mh-bank-money" />}
                    {item.type === 'choice' ? (
                      <ol className="mh-bank-choices">
                        {item.choices.map((c, ci) => (
                          <li key={ci} className={ci === item.answer ? 'is-answer' : ''}>
                            {CHOICE_LABELS[ci]}. {c} {ci === item.answer && '✔'}
                          </li>
                        ))}
                      </ol>
                    ) : (
                      <p className="mh-bank-answer">คำตอบ: {answerText(item)}</p>
                    )}
                    <div className="mh-bank-actions">
                      <button type="button" className="mh-chip" onClick={() => setEditing(item)} data-testid={`mh-bank-edit-${i + 1}`}>
                        ✏️ แก้ไข
                      </button>
                      <button type="button" className="mh-chip" disabled={i === 0} onClick={() => move(item.id, -1)} aria-label="เลื่อนขึ้น">
                        ⬆️
                      </button>
                      <button type="button" className="mh-chip" disabled={i === form.items.length - 1} onClick={() => move(item.id, 1)} aria-label="เลื่อนลง">
                        ⬇️
                      </button>
                      <button
                        type="button"
                        className="mh-chip"
                        onClick={() => setEditing({ ...item, id: `${kind}-${Date.now().toString(36)}` })}
                        aria-label="คัดลอกเป็นข้อใหม่"
                      >
                        📄 คัดลอก
                      </button>
                      {confirmDel === item.id ? (
                        <span className="mh-confirm">
                          ลบข้อนี้?
                          <button
                            type="button"
                            className="mh-chip mh-chip-danger"
                            data-testid={`mh-bank-del-yes-${i + 1}`}
                            disabled={form.items.length <= 1}
                            onClick={() => {
                              setForm((f) => ({ ...f, items: f.items.filter((x) => x.id !== item.id) }))
                              setConfirmDel(null)
                            }}
                          >
                            ลบ
                          </button>
                          <button type="button" className="mh-chip" onClick={() => setConfirmDel(null)}>
                            ไม่ลบ
                          </button>
                        </span>
                      ) : (
                        <button type="button" className="mh-chip" onClick={() => setConfirmDel(item.id)} data-testid={`mh-bank-del-${i + 1}`}>
                          🗑️ ลบ
                        </button>
                      )}
                    </div>
                  </>
                )}
              </li>
            )
          })}
        </ol>
      </section>

      <section className="mh-card">
        <h2 className="mh-card-title">↩️ ใช้ชุดข้อสอบตั้งต้น</h2>
        <p className="mh-soft">ชุดตั้งต้น 20 ข้อ 20 คะแนน ฉบับก่อนเรียนและหลังเรียนวัดจุดประสงค์เดียวกัน ความยากเท่ากัน ใช้ตัวเลขและสถานการณ์ต่างกัน</p>
        {confirmReset ? (
          <div className="mh-row-buttons">
            <button
              type="button"
              className="mh-btn mh-btn-soft mh-btn-danger"
              data-testid="mh-bank-reset-yes"
              onClick={() => {
                const d = defaultBank()[kind]
                setForm((f) => ({ ...d, open: f.open }))
                setConfirmReset(false)
                pushToast('↩️', `ใช้ชุดตั้งต้นของ${KIND_NAME[kind]}แล้ว`)
              }}
            >
              ยืนยัน ใช้ชุดตั้งต้น
            </button>
            <button type="button" className="mh-btn mh-btn-go" onClick={() => setConfirmReset(false)}>
              ไม่เปลี่ยน
            </button>
          </div>
        ) : (
          <button type="button" className="mh-btn mh-btn-soft" onClick={() => setConfirmReset(true)} data-testid="mh-bank-reset">
            ↩️ ใช้ชุดตั้งต้นของ{KIND_NAME[kind]}
          </button>
        )}
      </section>
    </div>
  )
}

function ItemEditor({ initial, onSave, onCancel }: { initial: TestItem; onSave: (i: TestItem) => void; onCancel: () => void }) {
  const [item, setItem] = useState<TestItem>(() => ({ ...initial, choices: initial.type === 'choice' ? [...initial.choices] : ['', '', '', ''] }))
  const [numText, setNumText] = useState(initial.type === 'number' ? String(initial.answer) : '')
  const [tried, setTried] = useState(false)
  const set = (patch: Partial<TestItem>) => setItem((o) => ({ ...o, ...patch }))
  const final: TestItem =
    item.type === 'choice' ? { ...item, unit: '', choices: item.choices.map((c) => c.trim()), text: item.text.trim() } : { ...item, choices: [], answer: Number(numText.replace(/,/g, '')), text: item.text.trim() }
  if (item.type === 'number' && numText.trim() === '') final.answer = NaN
  const problems = itemProblems(final)

  return (
    <div className="mh-student-form mh-item-editor" data-testid="mh-item-editor">
      <div className="mh-form-grid">
        <label>
          จุดประสงค์ (ทักษะ)
          <select className="mh-text-input" value={item.skill} onChange={(e) => set({ skill: e.target.value as Skill })} data-testid="mh-ie-skill">
            {SKILLS.map((s) => (
              <option key={s} value={s}>
                {SKILL_ICONS[s]} {SKILL_NAMES[s]}
              </option>
            ))}
          </select>
        </label>
        <label>
          ชนิดข้อ
          <select className="mh-text-input" value={item.type} onChange={(e) => set({ type: e.target.value as TestItem['type'], answer: 0 })} data-testid="mh-ie-type">
            <option value="choice">ปรนัย 4 ตัวเลือก</option>
            <option value="number">เติมคำตอบเป็นตัวเลข</option>
          </select>
        </label>
        <label>
          คะแนน
          <input
            className="mh-text-input"
            inputMode="numeric"
            value={item.points}
            data-testid="mh-ie-points"
            onChange={(e) => set({ points: Number(e.target.value.replace(/\D/g, '').slice(0, 2)) || 0 })}
          />
        </label>
      </div>
      <label className="mh-ie-text">
        โจทย์
        <textarea className="mh-text-input" rows={3} value={item.text} maxLength={400} onChange={(e) => set({ text: e.target.value })} data-testid="mh-ie-text" />
      </label>

      {item.type === 'choice' ? (
        <div className="mh-ie-choices" role="radiogroup" aria-label="ตัวเลือกและคำตอบที่ถูก">
          {item.choices.map((c, i) => (
            <label key={i} className={`mh-ie-choice ${item.answer === i ? 'is-answer' : ''}`}>
              <input type="radio" name="mh-ie-answer" checked={item.answer === i} onChange={() => set({ answer: i })} data-testid={`mh-ie-answer-${i}`} aria-label={`ตัวเลือก ${CHOICE_LABELS[i]} ถูก`} />
              <b>{CHOICE_LABELS[i]}.</b>
              <input
                className="mh-text-input"
                value={c}
                maxLength={120}
                data-testid={`mh-ie-choice-${i}`}
                onChange={(e) => {
                  const choices = item.choices.slice()
                  choices[i] = e.target.value
                  set({ choices })
                }}
              />
            </label>
          ))}
          <p className="mh-soft">กดวงกลมหน้าตัวเลือกที่ถูก</p>
        </div>
      ) : (
        <div className="mh-form-grid">
          <label>
            คำตอบที่ถูก (ตัวเลข เช่น 135 หรือ 12.50)
            <input className="mh-text-input" inputMode="decimal" value={numText} onChange={(e) => setNumText(e.target.value.replace(/[^\d.,]/g, ''))} data-testid="mh-ie-number" />
          </label>
          <label>
            หน่วย
            <input className="mh-text-input" value={item.unit} maxLength={20} placeholder="บาท" onChange={(e) => set({ unit: e.target.value })} data-testid="mh-ie-unit" />
          </label>
        </div>
      )}

      <div className="mh-ie-money">
        <span className="mh-soft">รูปเงินประกอบโจทย์ (ไม่บังคับ) แตะเพื่อเพิ่ม:</span>
        <div className="mh-ie-denoms">
          {ALL_DENOM_IDS.map((id) => (
            <button key={id} type="button" className="mh-ie-denom" aria-label={`เพิ่ม${denom(id).name}`} disabled={item.money.length >= 12} onClick={() => set({ money: [...item.money, id] })}>
              <MoneyPiece id={id} base={26} />
            </button>
          ))}
        </div>
        {item.money.length > 0 && (
          <div className="mh-ie-picked">
            {item.money.map((id: DenomId, i) => (
              <button key={`${id}-${i}`} type="button" className="mh-chip" onClick={() => set({ money: item.money.filter((_, j) => j !== i) })} aria-label={`เอา${denom(id).name}ออก`}>
                {denom(id).name} ✕
              </button>
            ))}
          </div>
        )}
      </div>

      {tried && problems.length > 0 && (
        <ul className="mh-roster-errors" role="alert">
          {problems.map((p) => (
            <li key={p}>⚠️ {p}</li>
          ))}
        </ul>
      )}
      <div className="mh-row-buttons">
        <button
          type="button"
          className="mh-btn mh-btn-gold"
          data-testid="mh-ie-save"
          onClick={() => {
            setTried(true)
            if (problems.length === 0) onSave(final)
            else playSound('wrong')
          }}
        >
          💾 บันทึกข้อนี้
        </button>
        <button type="button" className="mh-btn mh-btn-soft" onClick={onCancel}>
          ยกเลิก
        </button>
      </div>
    </div>
  )
}
