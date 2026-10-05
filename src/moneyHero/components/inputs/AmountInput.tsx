import { useState } from 'react'
import type { AmountQ, NumberQ, Response } from '../../engine/types'
import { playSound } from '../../utils/sound'

/** ช่องกรอกตัวเลขขนาดใหญ่ (แป้นตัวเลขบนมือถือ) */
export function BigField({
  value,
  onChange,
  label,
  testId,
  width = 'md',
  decimal = false,
  placeholder,
  disabled,
  onEnter,
}: {
  value: string
  onChange: (v: string) => void
  label: string
  testId: string
  width?: 'sm' | 'md' | 'lg'
  decimal?: boolean
  placeholder?: string
  disabled?: boolean
  onEnter?: () => void
}) {
  return (
    <label className={`mh-field mh-field-${width}`}>
      <input
        data-testid={testId}
        className="mh-field-input"
        inputMode={decimal ? 'decimal' : 'numeric'}
        autoComplete="off"
        value={value}
        placeholder={placeholder ?? '0'}
        disabled={disabled}
        aria-label={label}
        onChange={(e) => onChange(e.target.value.replace(decimal ? /[^0-9.,]/g : /[^0-9,]/g, '').slice(0, 12))}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && onEnter) onEnter()
        }}
      />
      <span className="mh-field-unit">{label}</span>
    </label>
  )
}

export function AmountInput({ q, disabled, onSubmit }: { q: AmountQ; disabled: boolean; onSubmit: (r: Response) => void }) {
  const [baht, setBaht] = useState('')
  const [satang, setSatang] = useState('')
  const [dot, setDot] = useState('')
  const ready = q.input === 'dot' ? dot.trim() !== '' : baht.trim() !== '' || satang.trim() !== ''
  const submit = () => {
    if (!ready || disabled) return
    playSound('click')
    onSubmit({ kind: 'amount', baht, satang, dot })
  }

  return (
    <div className="mh-answer-box">
      {q.input === 'dot' ? (
        <div className="mh-fields">
          <BigField value={dot} onChange={setDot} label="บาท" testId="mh-dot" width="lg" decimal placeholder="เช่น 25.50" disabled={disabled} onEnter={submit} />
          <div className="mh-dot-keys">
            <button type="button" className="mh-chip" disabled={disabled} onClick={() => setDot((d) => (d.includes('.') ? d : `${d}.`))}>
              ใส่จุด .
            </button>
            <button type="button" className="mh-chip" disabled={disabled} onClick={() => setDot((d) => `${d}00`)}>
              00
            </button>
          </div>
        </div>
      ) : (
        <div className="mh-fields">
          <BigField value={baht} onChange={setBaht} label="บาท" testId="mh-baht" disabled={disabled} onEnter={submit} />
          {q.input === 'bs' && (
            <BigField value={satang} onChange={setSatang} label="สตางค์" testId="mh-satang" width="sm" disabled={disabled} onEnter={submit} />
          )}
        </div>
      )}
      <button type="button" data-testid="mh-submit" className="mh-btn mh-btn-go" disabled={!ready || disabled} onClick={submit}>
        ✔ ตรวจคำตอบ
      </button>
    </div>
  )
}

export function NumberInput({ q, disabled, onSubmit }: { q: NumberQ; disabled: boolean; onSubmit: (r: Response) => void }) {
  const [value, setValue] = useState('')
  const n = Number(value.replace(/,/g, '')) || 0
  const submit = () => {
    if (value.trim() === '' || disabled) return
    playSound('click')
    onSubmit({ kind: 'number', value })
  }
  return (
    <div className="mh-answer-box">
      <div className="mh-fields">
        <button type="button" className="mh-step-btn" disabled={disabled || n <= 0} onClick={() => setValue(String(Math.max(0, n - 1)))} aria-label="ลดลง 1">
          −
        </button>
        <BigField value={value} onChange={setValue} label={q.unit} testId="mh-number" disabled={disabled} onEnter={submit} />
        <button type="button" className="mh-step-btn" disabled={disabled} onClick={() => setValue(String(n + 1))} aria-label="เพิ่มขึ้น 1">
          +
        </button>
      </div>
      <button type="button" data-testid="mh-submit" className="mh-btn mh-btn-go" disabled={value.trim() === '' || disabled} onClick={submit}>
        ✔ ตรวจคำตอบ
      </button>
    </div>
  )
}
