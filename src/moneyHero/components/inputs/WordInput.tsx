import { useState } from 'react'
import type { Op, Response, WordQ, WordStep } from '../../engine/types'
import { playSound } from '../../utils/sound'
import { BigField } from './AmountInput'

/**
 * โจทย์ปัญหา 4 ขั้น: อ่านและทำความเข้าใจ → วางแผน → คำนวณ → ตรวจสอบ
 *
 * ขั้น "โจทย์บอกอะไร?" "โจทย์ถามอะไร?" "ต้องใช้วิธีใด?" ตอบผิดได้ไม่จำกัด
 * (เป็นนั่งร้านช่วยคิด ไม่นับคะแนน) ส่วนขั้นคำนวณคือคำตอบที่ส่งตรวจจริง
 */

const OPS: { op: Op; label: string; word: string }[] = [
  { op: '+', label: '+', word: 'บวก' },
  { op: '-', label: '−', word: 'ลบ' },
  { op: '×', label: '×', word: 'คูณ' },
  { op: '÷', label: '÷', word: 'หาร' },
]

const STEP_TITLE: Record<Exclude<WordStep, 'check'>, string> = {
  given: '1. โจทย์บอกอะไร?',
  asked: '2. โจทย์ถามอะไร?',
  op: '3. ต้องใช้วิธีใด?',
  calc: '4. คำนวณ',
}

export function WordInput({ q, disabled, onSubmit }: { q: WordQ; disabled: boolean; onSubmit: (r: Response) => void }) {
  const steps = q.steps.filter((s): s is Exclude<WordStep, 'check'> => s !== 'check')
  const [at, setAt] = useState(0)
  const [miss, setMiss] = useState<string | null>(null)
  const [baht, setBaht] = useState('')
  const [satang, setSatang] = useState('')
  const step = steps[at]

  const advance = () => {
    playSound('correct')
    setMiss(null)
    setAt((i) => Math.min(steps.length - 1, i + 1))
  }

  const wrongPick = (msg: string) => {
    playSound('wrong')
    setMiss(msg)
  }

  return (
    <div className="mh-word">
      <ol className="mh-word-track" aria-label="ขั้นการแก้โจทย์">
        {steps.map((s, i) => (
          <li key={s} className={i < at ? 'is-done' : i === at ? 'is-on' : ''}>
            {i < at ? '✔' : i + 1}
          </li>
        ))}
      </ol>

      <div className="mh-word-step" key={step}>
        <h3 className="mh-word-title">{STEP_TITLE[step]}</h3>

        {step === 'given' && (
          <div className="mh-choices mh-choices-list">
            {q.given.options.map((text, i) => (
              <button
                key={i}
                type="button"
                className="mh-choice"
                data-testid={`mh-given-${i}`}
                disabled={disabled}
                onClick={() => (i === q.given.answer ? advance() : wrongPick('อ่านโจทย์อีกครั้ง ดูตัวเลขให้ตรงกับเรื่องนะ'))}
              >
                📌 {text}
              </button>
            ))}
          </div>
        )}

        {step === 'asked' && (
          <div className="mh-choices mh-choices-list">
            {q.asked.options.map((text, i) => (
              <button
                key={i}
                type="button"
                className="mh-choice"
                data-testid={`mh-asked-${i}`}
                disabled={disabled}
                onClick={() => (i === q.asked.answer ? advance() : wrongPick('ดูประโยคคำถามท้ายโจทย์อีกครั้งนะ'))}
              >
                ❓ {text}
              </button>
            ))}
          </div>
        )}

        {step === 'op' && (
          <div className="mh-choices mh-choices-ops">
            {OPS.map((o) => (
              <button
                key={o.op}
                type="button"
                className="mh-choice mh-op"
                data-testid={`mh-op-${o.word}`}
                disabled={disabled}
                onClick={() => (o.op === q.op ? advance() : wrongPick(`ลองดูคำสำคัญในโจทย์อีกครั้ง: ${q.hint.text}`))}
              >
                <span className="mh-choice-symbol">{o.label}</span>
                <span>{o.word}</span>
              </button>
            ))}
          </div>
        )}

        {step === 'calc' && (
          <div className="mh-answer-box">
            <div className="mh-word-plan">
              ใช้การ{OPS.find((o) => o.op === q.op)!.word}
            </div>
            <div className="mh-fields">
              <BigField value={baht} onChange={setBaht} label="บาท" testId="mh-baht" disabled={disabled} />
              <BigField value={satang} onChange={setSatang} label="สตางค์" testId="mh-satang" width="sm" disabled={disabled} />
            </div>
            <button
              type="button"
              className="mh-btn mh-btn-go"
              data-testid="mh-submit"
              disabled={disabled || (baht === '' && satang === '')}
              onClick={() => {
                playSound('click')
                onSubmit({ kind: 'word', calc: baht, calcSatang: satang })
              }}
            >
              ✔ ตรวจคำตอบ
            </button>
          </div>
        )}
      </div>
      {miss && <p className="mh-note-line">{miss}</p>}
    </div>
  )
}
