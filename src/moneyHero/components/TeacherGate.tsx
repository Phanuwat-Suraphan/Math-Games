import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useGame } from '../hooks/useMoneyGame'
import { CharacterArt } from './Art'
import { Sky } from './Sky'
import { playSound } from '../utils/sound'

/**
 * ประตูหน้าครู: ถ้าครูตั้งรหัสไว้ ต้องใส่รหัสก่อนเห็นคะแนนและข้อมูลนักเรียน
 * (ไม่ได้ตั้งรหัส = เปิดได้เลยเหมือนเดิม)
 */
export function TeacherGate({ children }: { children: JSX.Element }) {
  const { teacherOk } = useGame()
  return teacherOk ? children : <PinScreen />
}

/** หน้าที่ครูเปิดต่อจากหน้าครูได้โดยไม่ล็อก (สื่อการสอน ไม่มีข้อมูลนักเรียน) */
const TEACHER_TOOLS = ['/kad', '/board', '/plan/print', '/duel', '/sandbox']

/** ออกจากหน้าครูไปหน้าของนักเรียนเมื่อไร ล็อกหน้าครูทันที (ส่งแท็บเล็ตต่อให้นักเรียนได้อย่างปลอดภัย) */
export function TeacherAutoLock() {
  const { pathname } = useLocation()
  const { save, teacherOk, lockTeacher } = useGame()
  useEffect(() => {
    if (!save.classroom.pin || !teacherOk) return
    const teacherArea = pathname.startsWith('/teacher') || TEACHER_TOOLS.some((t) => pathname.startsWith(t))
    if (!teacherArea) lockTeacher()
  }, [pathname, save.classroom.pin, teacherOk, lockTeacher])
  return null
}

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'del', '0', 'ok'] as const

function PinScreen() {
  const { unlockTeacher, unlockWithRecovery, pushToast } = useGame()
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [fails, setFails] = useState(0)
  const [waitUntil, setWaitUntil] = useState(0)
  const [now, setNow] = useState(() => Date.now())
  const [forgot, setForgot] = useState(false)
  const [code, setCode] = useState('')
  const waiting = now < waitUntil

  useEffect(() => {
    if (!waiting) return
    const t = window.setInterval(() => setNow(Date.now()), 500)
    return () => window.clearInterval(t)
  }, [waiting])

  const submit = (value: string) => {
    if (Date.now() < waitUntil || value.length < 4) return
    if (unlockTeacher(value)) {
      playSound('complete')
      return
    }
    playSound('wrong')
    setPin('')
    const f = fails + 1
    setFails(f)
    if (f % 5 === 0) {
      setWaitUntil(Date.now() + 30000)
      setNow(Date.now())
      setError('ใส่รหัสผิด 5 ครั้ง รอ 30 วินาทีแล้วลองใหม่')
    } else setError('รหัสไม่ถูกต้อง ลองอีกครั้ง')
  }

  const press = (k: (typeof KEYS)[number]) => {
    if (waiting) return
    playSound('click')
    setError('')
    if (k === 'del') setPin((p) => p.slice(0, -1))
    else if (k === 'ok') submit(pin)
    else setPin((p) => (p.length < 6 ? p + k : p))
  }

  return (
    <div className="mh-page mh-page-narrow" data-testid="mh-pin-screen">
      <Sky city={false} />
      <div className="mh-page-head">
        <Link to="/start" className="mh-icon-btn" aria-label="กลับ">
          <ArrowLeft size={24} />
        </Link>
        <h1 className="mh-title">🔒 โหมดคุณครู</h1>
      </div>
      <div className="mh-card mh-pin-card">
        <CharacterArt id="owl" size={84} />
        <p className="mh-pin-help">หน้านี้มีคะแนนและข้อมูลของนักเรียน ใส่รหัสครูก่อนนะ</p>
        {!forgot ? (
          <>
            <input
              className="mh-text-input mh-pin-input"
              type="password"
              inputMode="numeric"
              autoComplete="off"
              maxLength={6}
              value={pin}
              aria-label="รหัสครู"
              data-testid="mh-pin-input"
              disabled={waiting}
              onChange={(e) => {
                setError('')
                setPin(e.target.value.replace(/\D/g, '').slice(0, 6))
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') submit(pin)
              }}
            />
            <div className="mh-pin-pad" role="group" aria-label="แป้นตัวเลข">
              {KEYS.map((k) => (
                <button
                  key={k}
                  type="button"
                  className={`mh-pin-key ${k === 'ok' ? 'is-ok' : ''}`}
                  data-testid={`mh-pin-key-${k}`}
                  disabled={waiting || (k === 'ok' && pin.length < 4)}
                  onClick={() => press(k)}
                  aria-label={k === 'del' ? 'ลบ' : k === 'ok' ? 'ตกลง' : k}
                >
                  {k === 'del' ? '⌫' : k === 'ok' ? '✔' : k}
                </button>
              ))}
            </div>
            {(error || waiting) && (
              <p className="mh-pin-error" role="alert" data-testid="mh-pin-error">
                {error}
                {waiting && ` (${Math.ceil((waitUntil - now) / 1000)} วินาที)`}
              </p>
            )}
            <button type="button" className="mh-link-btn" onClick={() => setForgot(true)}>
              ลืมรหัสครู?
            </button>
          </>
        ) : (
          <>
            <p className="mh-soft">ใส่รหัสสำรอง 8 ตัวที่ได้ตอนตั้งรหัสครู ระบบจะล้างรหัสครูเดิม แล้วตั้งรหัสใหม่ได้ที่หน้าตั้งค่าห้องเรียน (ข้อมูลนักเรียนไม่หาย)</p>
            <input
              className="mh-text-input"
              value={code}
              placeholder="เช่น ABCD-2345"
              aria-label="รหัสสำรอง"
              data-testid="mh-recovery-input"
              onChange={(e) => {
                setError('')
                setCode(e.target.value)
              }}
            />
            {error && (
              <p className="mh-pin-error" role="alert">
                {error}
              </p>
            )}
            <div className="mh-row-buttons">
              <button
                type="button"
                className="mh-btn mh-btn-gold"
                data-testid="mh-recovery-go"
                onClick={() => {
                  if (unlockWithRecovery(code)) pushToast('🔓', 'ล้างรหัสครูแล้ว ตั้งรหัสใหม่ได้ที่ตั้งค่าห้องเรียน')
                  else setError('รหัสสำรองไม่ถูกต้อง')
                }}
              >
                ล้างรหัสครู
              </button>
              <button type="button" className="mh-btn mh-btn-soft" onClick={() => setForgot(false)}>
                กลับไปใส่รหัส
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
