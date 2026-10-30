import { useEffect, useRef, useState } from 'react'
import { useGame } from '../hooks/useMoneyGame'
import { CHOICE_LABELS, clockText, secondsLeft, unanswered, type Given, type TestForm, type TestItem } from '../engine/testBank'
import type { TestRun } from '../engine/exam'
import { MoneyPile } from './Art'
import { playSound } from '../utils/sound'
import { speak } from '../utils/speech'

/**
 * ทำแบบทดสอบจากคลังข้อสอบ: ข้อละหน้า ข้ามไปมาได้ เห็นข้อที่ยังไม่ตอบ จับเวลา
 * ส่งคำตอบต้องยืนยันก่อน และกดส่งซ้ำไม่ได้ หมดเวลาส่งให้อัตโนมัติ
 * ระหว่างทำไม่บอกถูกผิด
 */

declare global {
  interface Window {
    __MH_TEST?: { index: number; total: number; id: string; type: TestItem['type']; answerPos: number; answer: number }
  }
}

export function ExamRunner({
  form,
  run,
  onChange,
  onSubmit,
}: {
  form: TestForm
  run: TestRun
  onChange: (answers: Record<string, Given>) => void
  onSubmit: (answers: Record<string, Given>, timedOut: boolean) => void
}) {
  const { settings } = useGame()
  const [idx, setIdx] = useState(() => Math.max(0, run.paper.order.findIndex((id) => run.answers[id] === undefined || run.answers[id] === null || run.answers[id] === '')))
  const [confirm, setConfirm] = useState(false)
  const [now, setNow] = useState(() => Date.now())
  const sent = useRef(false)
  const byId = new Map(form.items.map((i) => [i.id, i]))
  const order = run.paper.order
  const item = byId.get(order[idx])!
  const answers = run.answers
  const left = secondsLeft(form, run.startedAt, now)
  const missing = unanswered(form, answers)
  const display = item.type === 'choice' ? run.paper.choiceOrder[item.id] ?? [0, 1, 2, 3] : []

  const submit = (timedOut: boolean) => {
    if (sent.current) return
    sent.current = true
    setConfirm(false)
    onSubmit(answers, timedOut)
  }

  // นาฬิกา: หมดเวลาแล้วส่งเอง
  useEffect(() => {
    if (form.minutes <= 0) return
    const t = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(t)
  }, [form.minutes])
  useEffect(() => {
    if (left === 0) submit(true)
  }, [left])

  useEffect(() => {
    window.__MH_TEST = {
      index: idx,
      total: order.length,
      id: item.id,
      type: item.type,
      answerPos: item.type === 'choice' ? display.indexOf(item.answer) : -1,
      answer: item.answer,
    }
    if (settings.readAloud) speakItem(item, display)
    return () => {
      window.__MH_TEST = undefined
    }
  }, [idx])

  const set = (g: Given) => onChange({ ...answers, [item.id]: g })
  const go = (i: number) => {
    playSound('click')
    setIdx(Math.max(0, Math.min(order.length - 1, i)))
  }
  const last = idx === order.length - 1

  return (
    <div className="mh-exam" data-testid="mh-exam">
      <div className="mh-exam-top">
        <span className="mh-exam-count" data-testid="mh-exam-count">
          ข้อ {idx + 1}/{order.length}
        </span>
        <span className="mh-exam-done">ตอบแล้ว {order.length - missing} ข้อ</span>
        {left !== null && (
          <span className={`mh-exam-clock ${left <= 120 ? 'is-low' : ''}`} data-testid="mh-exam-clock" role="timer" aria-label={`เวลาเหลือ ${clockText(left)}`}>
            ⏱ {clockText(left)}
          </span>
        )}
      </div>

      <div className="mh-exam-dots" role="group" aria-label="เลือกข้อ">
        {order.map((id, i) => {
          const g = answers[id]
          const done = g !== undefined && g !== null && g !== ''
          return (
            <button
              key={id}
              type="button"
              className={`mh-exam-dot ${done ? 'is-done' : ''} ${i === idx ? 'is-on' : ''}`}
              aria-label={`ข้อ ${i + 1}${done ? ' ตอบแล้ว' : ' ยังไม่ตอบ'}`}
              aria-current={i === idx}
              onClick={() => go(i)}
            >
              {i + 1}
            </button>
          )
        })}
      </div>

      <div className="mh-card mh-exam-card" data-testid="mh-exam-item">
        <div className="mh-exam-q">
          <span className="mh-exam-no">{idx + 1}.</span>
          <p className="mh-exam-text">{item.text}</p>
          <button type="button" className="mh-speak" aria-label="ฟังโจทย์" onClick={() => speakItem(item, display)}>
            🔈
          </button>
        </div>
        {item.money.length > 0 && (
          <div className="mh-exam-money">
            <MoneyPile items={item.money} base={48} />
          </div>
        )}
        {item.type === 'choice' ? (
          <div className="mh-choices mh-choices-list mh-exam-choices" role="radiogroup" aria-label="ตัวเลือก">
            {display.map((orig, pos) => (
              <button
                key={`${item.id}-${orig}`}
                type="button"
                role="radio"
                aria-checked={answers[item.id] === orig}
                className={`mh-choice ${answers[item.id] === orig ? 'is-picked is-chosen' : ''}`}
                data-testid={`mh-tchoice-${pos}`}
                onClick={() => {
                  playSound('click')
                  set(orig)
                }}
              >
                <span className="mh-exam-letter">{CHOICE_LABELS[pos]}</span>
                <span className="mh-choice-label">{item.choices[orig]}</span>
              </button>
            ))}
          </div>
        ) : (
          <label className="mh-exam-number">
            <span>ตอบ</span>
            <input
              className="mh-text-input"
              inputMode="decimal"
              autoComplete="off"
              value={typeof answers[item.id] === 'string' ? (answers[item.id] as string) : ''}
              placeholder="พิมพ์ตัวเลข"
              aria-label={`คำตอบข้อ ${idx + 1}`}
              data-testid="mh-tnumber"
              onChange={(e) => set(e.target.value.replace(/[^\d.,]/g, '').slice(0, 12))}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !last) go(idx + 1)
              }}
            />
            {item.unit && <span>{item.unit}</span>}
          </label>
        )}
      </div>

      <div className="mh-exam-nav">
        <button type="button" className="mh-btn mh-btn-soft" disabled={idx === 0} onClick={() => go(idx - 1)} data-testid="mh-tprev">
          ◀ ข้อก่อนหน้า
        </button>
        {last ? (
          <button type="button" className="mh-btn mh-btn-gold" onClick={() => setConfirm(true)} data-testid="mh-tsubmit">
            📨 ส่งคำตอบ
          </button>
        ) : (
          <button type="button" className="mh-btn mh-btn-go" onClick={() => go(idx + 1)} data-testid="mh-tnext">
            ข้อต่อไป ▶
          </button>
        )}
      </div>
      {!last && (
        <button type="button" className="mh-link-btn mh-exam-early" onClick={() => setConfirm(true)}>
          ทำครบแล้ว ส่งคำตอบ
        </button>
      )}

      {confirm && (
        <div className="mh-modal" role="dialog" aria-label="ยืนยันส่งคำตอบ">
          <div className="mh-card mh-modal-card mh-exam-confirm" data-testid="mh-tconfirm">
            <h2 className="mh-step-title">ส่งคำตอบเลยไหม?</h2>
            {missing > 0 ? (
              <p>
                ยังไม่ได้ตอบ <b>{missing} ข้อ</b> (ข้อ{' '}
                {order
                  .map((id, i) => [id, i] as const)
                  .filter(([id]) => answers[id] === undefined || answers[id] === null || answers[id] === '')
                  .map(([, i]) => i + 1)
                  .join(', ')}
                ) ข้อที่ไม่ตอบจะไม่ได้คะแนน
              </p>
            ) : (
              <p>ตอบครบทุกข้อแล้ว ส่งแล้วแก้คำตอบไม่ได้นะ</p>
            )}
            <div className="mh-row-buttons">
              <button type="button" className="mh-btn mh-btn-soft" onClick={() => setConfirm(false)}>
                กลับไปตรวจ
              </button>
              <button type="button" className="mh-btn mh-btn-gold" data-testid="mh-tsubmit-confirm" onClick={() => submit(false)}>
                📨 ส่งคำตอบ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function speakItem(item: TestItem, display: number[]) {
  const choices = item.type === 'choice' ? display.map((orig, pos) => `${CHOICE_LABELS[pos]} ${item.choices[orig]}`).join(' ') : ''
  speak(`${item.text} ${choices}`)
}
