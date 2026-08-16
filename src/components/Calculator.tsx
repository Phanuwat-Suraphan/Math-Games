import { useCallback, useState } from 'react'
import { playSfx } from '../services/audioService'

/**
 * เครื่องคิดเลขสำหรับเด็ก
 *
 * เรื่องที่ต้องคิดก่อนใส่ลงเกมเรียนรู้
 * เครื่องคิดเลขที่เปิดค้างไว้ตลอดจะทำให้เด็กกดคำตอบโดยไม่ได้คิดเลย
 * ซึ่งขัดกับเป้าหมายทั้งหมดของเกมนี้
 *
 * จึงออกแบบให้ "ต้องกดเปิดเอง" และปิดอยู่เป็นค่าเริ่มต้นเสมอ
 * การกดเปิดเป็นการตัดสินใจของเด็กเองว่าข้อนี้ขอใช้ตัวช่วย
 * ซึ่งต่างจากการมีมันวางอยู่ตรงหน้าตลอดเวลาโดยไม่ต้องเลือกอะไร
 *
 * และคู่กันเสมอกับปุ่ม "ดูวิธีคิด" ที่อยู่ข้าง ๆ กัน
 * เด็กที่ไม่อยากกดเครื่องคิดเลขจึงมีทางอื่นให้เดินต่อ ไม่ใช่ทางตันแล้วเดามั่ว
 *
 * ตัวเครื่องรองรับแค่สี่การดำเนินการกับจุดทศนิยม
 * ไม่มีวงเล็บ ไม่มีลำดับการดำเนินการ เพราะระดับ ป.4–ป.6 ยังไม่ต้องใช้
 * และการมีปุ่มเยอะเกินทำให้เด็กกดผิดมากกว่าช่วย
 */

type Operator = '+' | '−' | '×' | '÷'

function compute(left: number, operator: Operator, right: number): number {
  if (operator === '+') return left + right
  if (operator === '−') return left - right
  if (operator === '×') return left * right
  // หารด้วยศูนย์คืนค่าเดิม ดีกว่าโชว์ Infinity ซึ่งเด็กอ่านไม่ออกและตกใจ
  return right === 0 ? left : left / right
}

/** ตัดทศนิยมที่ยาวเกินจำเป็นทิ้ง ไม่ให้ขึ้นเป็นพรืดเต็มจอ */
function display(value: number): string {
  if (!Number.isFinite(value)) return '0'
  const rounded = Math.round(value * 1e8) / 1e8
  return String(rounded)
}

export function Calculator({ onClose }: { onClose?: () => void }) {
  const [entry, setEntry] = useState('0')
  const [stored, setStored] = useState<number | null>(null)
  const [operator, setOperator] = useState<Operator | null>(null)
  /** กดเครื่องหมายแล้วรอเลขตัวใหม่ ตัวเลขถัดไปจึงเริ่มนับใหม่ ไม่ใช่ต่อท้าย */
  const [awaitingNext, setAwaitingNext] = useState(false)

  const press = useCallback((label: string) => {
    playSfx('click')

    setEntry((current) => {
      if (label === '.') {
        if (awaitingNext) {
          setAwaitingNext(false)
          return '0.'
        }
        return current.includes('.') ? current : `${current}.`
      }

      if (awaitingNext) {
        setAwaitingNext(false)
        return label
      }
      // เลขศูนย์นำหน้าต้องถูกแทนที่ ไม่ใช่ต่อท้ายกลายเป็น 05
      return current === '0' ? label : `${current}${label}`
    })
  }, [awaitingNext])

  const chooseOperator = useCallback(
    (next: Operator) => {
      playSfx('click')
      const value = Number(entry)

      if (stored !== null && operator && !awaitingNext) {
        const result = compute(stored, operator, value)
        setStored(result)
        setEntry(display(result))
      } else {
        setStored(value)
      }

      setOperator(next)
      setAwaitingNext(true)
    },
    [awaitingNext, entry, operator, stored],
  )

  const equals = useCallback(() => {
    playSfx('click')
    if (stored === null || !operator) return

    const result = compute(stored, operator, Number(entry))
    setEntry(display(result))
    setStored(null)
    setOperator(null)
    setAwaitingNext(true)
  }, [entry, operator, stored])

  const clear = useCallback(() => {
    playSfx('click')
    setEntry('0')
    setStored(null)
    setOperator(null)
    setAwaitingNext(false)
  }, [])

  const backspace = useCallback(() => {
    playSfx('click')
    setEntry((current) => (current.length <= 1 ? '0' : current.slice(0, -1)))
  }, [])

  const key =
    'btn-3d min-h-[52px] rounded-xl border-b-4 text-lg font-black transition-all active:translate-y-0.5 active:border-b-2'

  return (
    <div className="panel p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-bold text-slate-400">เครื่องคิดเลข</p>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-white/15 bg-white/5 px-2 py-1 text-xs font-bold text-slate-300"
          >
            ปิด
          </button>
        )}
      </div>

      {/* ช่องแสดงผล มีเครื่องหมายที่ค้างอยู่กำกับ เด็กจะได้ไม่ลืมว่ากดอะไรไว้ */}
      <div className="mt-2 rounded-xl border border-white/10 bg-black/45 px-3 py-2 text-right">
        <p className="h-4 text-xs text-slate-400">
          {stored !== null && operator ? `${display(stored)} ${operator}` : ''}
        </p>
        <p className="truncate text-2xl font-black tabular-nums text-white">{entry}</p>
      </div>

      <div className="mt-2 grid grid-cols-4 gap-1.5">
        <button type="button" onClick={clear} className={`${key} border-ember-700 bg-gradient-to-b from-ember-400 to-ember-600 text-white`}>
          C
        </button>
        <button type="button" onClick={backspace} className={`${key} border-night-500 bg-gradient-to-b from-night-600 to-night-800 text-slate-100`}>
          ⌫
        </button>
        <button type="button" onClick={() => chooseOperator('÷')} className={`${key} border-arcane-600 bg-gradient-to-b from-arcane-400 to-arcane-600 text-white`}>
          ÷
        </button>
        <button type="button" onClick={() => chooseOperator('×')} className={`${key} border-arcane-600 bg-gradient-to-b from-arcane-400 to-arcane-600 text-white`}>
          ×
        </button>

        {['7', '8', '9'].map((label) => (
          <button key={label} type="button" onClick={() => press(label)} className={`${key} border-night-500 bg-gradient-to-b from-night-600 to-night-800 text-white`}>
            {label}
          </button>
        ))}
        <button type="button" onClick={() => chooseOperator('−')} className={`${key} border-arcane-600 bg-gradient-to-b from-arcane-400 to-arcane-600 text-white`}>
          −
        </button>

        {['4', '5', '6'].map((label) => (
          <button key={label} type="button" onClick={() => press(label)} className={`${key} border-night-500 bg-gradient-to-b from-night-600 to-night-800 text-white`}>
            {label}
          </button>
        ))}
        <button type="button" onClick={() => chooseOperator('+')} className={`${key} border-arcane-600 bg-gradient-to-b from-arcane-400 to-arcane-600 text-white`}>
          +
        </button>

        {['1', '2', '3'].map((label) => (
          <button key={label} type="button" onClick={() => press(label)} className={`${key} border-night-500 bg-gradient-to-b from-night-600 to-night-800 text-white`}>
            {label}
          </button>
        ))}
        {/* ปุ่มเท่ากับสูงสองแถว เป็นตำแหน่งที่เด็กคุ้นจากเครื่องคิดเลขจริง */}
        <button type="button" onClick={equals} className={`${key} row-span-2 border-leaf-600 bg-gradient-to-b from-leaf-400 to-leaf-600 text-night-900`}>
          =
        </button>

        <button type="button" onClick={() => press('0')} className={`${key} col-span-2 border-night-500 bg-gradient-to-b from-night-600 to-night-800 text-white`}>
          0
        </button>
        <button type="button" onClick={() => press('.')} className={`${key} border-night-500 bg-gradient-to-b from-night-600 to-night-800 text-white`}>
          .
        </button>
      </div>
    </div>
  )
}
