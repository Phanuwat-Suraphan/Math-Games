import type { ReactNode } from 'react'
import { playSfx } from '../services/audioService'
import { sanitizeInput } from '../questionEngine/answerCheck'

/**
 * แป้นตัวเลขสำหรับพิมพ์คำตอบเอง
 *
 * ทำไมต้องทำแป้นเอง ไม่ใช้แป้นของเครื่อง
 *
 * เด็กส่วนใหญ่เล่นเกมนี้บนแท็บเล็ตของโรงเรียน แป้นพิมพ์ของระบบบนแท็บเล็ต
 * จะเด้งขึ้นมาทับครึ่งจอ ซึ่งบังโจทย์ที่เด็กกำลังต้องอ่านอยู่พอดี
 * และแป้นของระบบยังสลับภาษาไทยอังกฤษได้ ทำให้เด็กพิมพ์ ๆ อยู่แล้วได้ตัวอักษรไทย
 * แล้วงงว่าทำไมเลขไม่ขึ้น
 *
 * แป้นของเราอยู่ในหน้าเลย ไม่บังอะไร มีแต่ปุ่มที่ใช้ได้จริง
 * และปุ่มใหญ่พอสำหรับนิ้วเด็ก ซึ่งเป็นเรื่องที่แป้นของระบบทำได้ไม่ดีนัก
 *
 * ทำไมมีปุ่มเศษส่วนกับจุดทศนิยม
 *
 * เนื้อหาของโลกที่ 2 คือเศษส่วน และโลกที่ 3 คือทศนิยม
 * ถ้าไม่มีปุ่มพวกนี้ เด็กจะพิมพ์คำตอบของสองโลกนั้นไม่ได้เลย
 */

const KEYS = ['7', '8', '9', '4', '5', '6', '1', '2', '3']

export interface NumberPadProps {
  value: string
  onChange: (next: string) => void
  onSubmit: () => void
  /** ปิดปุ่มทั้งแผงระหว่างกำลังตรวจคำตอบ */
  disabled?: boolean
  /** ข้อความบนปุ่มยืนยัน */
  submitLabel?: string
}

export function NumberPad({
  value,
  onChange,
  onSubmit,
  disabled = false,
  submitLabel = 'ตอบ',
}: NumberPadProps) {
  const press = (key: string) => {
    if (disabled) return
    playSfx('click')
    onChange(sanitizeInput(value + key))
  }

  const backspace = () => {
    if (disabled) return
    playSfx('click')
    onChange(value.slice(0, -1))
  }

  return (
    <div className="mt-3">
      {/* ช่องแสดงสิ่งที่พิมพ์ไปแล้ว ตัวใหญ่พอให้เห็นจากระยะที่ถือแท็บเล็ต */}
      <div
        aria-live="polite"
        className="flex min-h-[60px] items-center justify-center rounded-xl border-2 border-arcane-400/40 bg-night-900/70 px-4 py-2"
      >
        <span className="text-3xl font-black tabular-nums text-white">
          {value.length > 0 ? value : <span className="text-slate-600">?</span>}
        </span>
      </div>

      <div className="mt-2 grid grid-cols-3 gap-2">
        {KEYS.map((key) => (
          <PadButton key={key} onClick={() => press(key)} disabled={disabled}>
            {key}
          </PadButton>
        ))}

        <PadButton onClick={() => press('.')} disabled={disabled} muted>
          .
        </PadButton>
        <PadButton onClick={() => press('0')} disabled={disabled}>
          0
        </PadButton>
        <PadButton onClick={() => press('/')} disabled={disabled} muted>
          /
        </PadButton>
      </div>

      <div className="mt-2 grid grid-cols-2 gap-2">
        <PadButton onClick={backspace} disabled={disabled || value.length === 0} muted>
          ⌫ ลบ
        </PadButton>
        <button
          type="button"
          onClick={onSubmit}
          disabled={disabled || value.length === 0}
          className="min-h-[56px] rounded-xl border-b-4 border-leaf-600 bg-leaf-500 px-3 text-lg font-black text-night-900 transition active:translate-y-0.5 active:border-b-2 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {submitLabel}
        </button>
      </div>
    </div>
  )
}

function PadButton({
  children,
  onClick,
  disabled,
  muted = false,
}: {
  children: ReactNode
  onClick: () => void
  disabled?: boolean
  muted?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`min-h-[56px] rounded-xl border-b-4 px-3 text-2xl font-bold transition active:translate-y-0.5 active:border-b-2 disabled:cursor-not-allowed disabled:opacity-40 ${
        muted
          ? 'border-night-600 bg-night-800 text-slate-300'
          : 'border-night-500 bg-night-700 text-white hover:bg-night-600'
      }`}
    >
      {children}
    </button>
  )
}
