import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Download } from 'lucide-react'
import { useGame } from '../hooks/useMoneyGame'
import { newRecoveryCode, validPin, type Classroom } from '../engine/classroom'
import { backupFileName, buildBackup, clearPrevious, downloadText, keepPrevious, mergeSaves, readBackup, readPrevious, type BackupRead } from '../engine/backup'
import { dateText } from '../engine/report'
import type { SaveData } from '../engine/progress'
import { Sky } from '../components/Sky'
import { playSound } from '../utils/sound'

/**
 * ตั้งค่าห้องเรียน (หน้าครู): ข้อมูลหัวรายงาน เกณฑ์ผ่าน/เป้าหมาย การเข้าเกม รหัสครู
 * และสำรอง/รวม/กู้คืนข้อมูลจากหลายเครื่อง
 * เส้นทาง #/teacher/settings
 */

const INFO_FIELDS: { key: keyof Classroom; label: string; placeholder: string; max: number }[] = [
  { key: 'school', label: 'โรงเรียน', placeholder: 'เช่น โรงเรียนบ้านดอนแก้ว', max: 80 },
  { key: 'area', label: 'สังกัด', placeholder: 'เช่น สพป.เชียงใหม่ เขต 1', max: 80 },
  { key: 'room', label: 'ชั้น/ห้อง', placeholder: 'เช่น ป.3/1', max: 20 },
  { key: 'term', label: 'ภาคเรียนที่', placeholder: 'เช่น 2', max: 4 },
  { key: 'year', label: 'ปีการศึกษา', placeholder: 'เช่น 2569', max: 8 },
  { key: 'teacher', label: 'ครูผู้สอน', placeholder: 'ชื่อ - สกุล ของคุณครู', max: 80 },
  { key: 'director', label: 'ผู้บริหารสถานศึกษา', placeholder: 'ใช้ในช่องลงนามของรายงาน', max: 80 },
]

interface Incoming {
  name: string
  read: BackupRead
}

export function ClassSettingsPage() {
  const { save, updateClassroom, resetAll, pushToast } = useGame()
  const c = save.classroom
  const [pass, setPass] = useState(String(c.passPercent))
  const [target, setTarget] = useState(String(c.targetPercent))

  const commitPercent = (key: 'passPercent' | 'targetPercent', raw: string) => {
    const n = Math.round(Number(raw))
    if (Number.isFinite(n) && n >= 1 && n <= 100) updateClassroom({ [key]: n })
    else (key === 'passPercent' ? setPass : setTarget)(String(c[key]))
  }

  return (
    <div className="mh-page mh-teacher mh-class-settings" data-testid="mh-class-settings">
      <Sky city={false} />
      <div className="mh-page-head">
        <Link to="/teacher" className="mh-icon-btn" aria-label="กลับแผงคุณครู">
          <ArrowLeft size={24} />
        </Link>
        <h1 className="mh-title">⚙️ ตั้งค่าห้องเรียน</h1>
      </div>

      <section className="mh-card">
        <h2 className="mh-card-title">🏫 ข้อมูลสำหรับหัวรายงาน</h2>
        <p className="mh-soft">บันทึกอัตโนมัติ ใช้พิมพ์ในหัวกระดาษและช่องลงนามของรายงานทุกแบบ</p>
        <div className="mh-form-grid">
          {INFO_FIELDS.map((f) => (
            <label key={f.key}>
              {f.label}
              <input
                className="mh-text-input"
                value={String(c[f.key])}
                maxLength={f.max}
                placeholder={f.placeholder}
                data-testid={`mh-cs-${f.key}`}
                onChange={(e) => updateClassroom({ [f.key]: e.target.value })}
              />
            </label>
          ))}
        </div>
      </section>

      <section className="mh-card">
        <h2 className="mh-card-title">🎯 เกณฑ์การประเมิน</h2>
        <div className="mh-form-grid">
          <label>
            เกณฑ์ผ่านของนักเรียนแต่ละคน (ร้อยละของคะแนนเต็ม)
            <input
              className="mh-text-input"
              inputMode="numeric"
              value={pass}
              data-testid="mh-cs-pass"
              onChange={(e) => setPass(e.target.value.replace(/\D/g, '').slice(0, 3))}
              onBlur={() => commitPercent('passPercent', pass)}
            />
          </label>
          <label>
            เป้าหมายของห้อง (ร้อยละของนักเรียนที่ผ่านเกณฑ์)
            <input
              className="mh-text-input"
              inputMode="numeric"
              value={target}
              data-testid="mh-cs-target"
              onChange={(e) => setTarget(e.target.value.replace(/\D/g, '').slice(0, 3))}
              onBlur={() => commitPercent('targetPercent', target)}
            />
          </label>
        </div>
        <p className="mh-criteria-line" data-testid="mh-cs-criteria">
          นักเรียนผ่านเกณฑ์เมื่อได้คะแนนแบบทดสอบหลังเรียนตั้งแต่ร้อยละ <b>{c.passPercent}</b> ขึ้นไป และห้องบรรลุเป้าหมายเมื่อมีนักเรียนผ่านเกณฑ์ตั้งแต่ร้อยละ{' '}
          <b>{c.targetPercent}</b> ของจำนวนนักเรียนทั้งหมด
        </p>
      </section>

      <section className="mh-card">
        <h2 className="mh-card-title">👧 การเข้าเกมของนักเรียน</h2>
        <label className="mh-switch-row">
          <span className="mh-switch-icon">📋</span>
          <span className="mh-switch-text">
            <b>เลือกชื่อจากทะเบียนเท่านั้น</b>
            <span>ปิดปุ่ม "ผู้เล่นใหม่" นักเรียนแตะชื่อตัวเองในรายชื่อเพื่อเข้าเกม (ทุกคะแนนเข้าทะเบียนถูกคน)</span>
          </span>
          <input type="checkbox" className="mh-switch" checked={c.rosterOnly} data-testid="mh-cs-rosteronly" onChange={(e) => updateClassroom({ rosterOnly: e.target.checked })} />
        </label>
      </section>

      <PinSection />
      <BackupSection />

      <section className="mh-card">
        <h2 className="mh-card-title">🗑️ ล้างข้อมูลนักเรียนทั้งหมดในเครื่องนี้</h2>
        <DangerReset
          onReset={() => {
            keepPrevious(save)
            resetAll()
            pushToast('🗑️', 'ล้างข้อมูลนักเรียนแล้ว (ย้อนกลับได้ที่ "ย้อนกลับเป็นข้อมูลก่อนหน้า")')
          }}
          onBackup={() => downloadText(backupFileName(save), buildBackup(save), 'application/json')}
        />
      </section>
    </div>
  )
}

function PinSection() {
  const { save, updateClassroom, pushToast } = useGame()
  const c = save.classroom
  const [mode, setMode] = useState<'idle' | 'set'>('idle')
  const [pin, setPin] = useState('')
  const [pin2, setPin2] = useState('')
  const [error, setError] = useState('')
  const [shown, setShown] = useState<string | null>(null)

  const commit = () => {
    if (!validPin(pin)) return setError('รหัสครูต้องเป็นตัวเลข 4–6 หลัก')
    if (pin !== pin2) return setError('ใส่รหัสสองครั้งไม่ตรงกัน')
    const recovery = c.recovery || newRecoveryCode()
    updateClassroom({ pin, recovery })
    playSound('complete')
    setShown(recovery)
    setMode('idle')
    setPin('')
    setPin2('')
    pushToast('🔒', 'ตั้งรหัสครูแล้ว')
  }

  return (
    <section className="mh-card" data-testid="mh-cs-pin">
      <h2 className="mh-card-title">🔒 รหัสครู</h2>
      <p className="mh-soft">
        {c.pin
          ? 'ตั้งรหัสแล้ว: นักเรียนเปิดหน้าครู ดูคะแนนเพื่อน หรือลบผู้เล่นไม่ได้ หน้าครูล็อกเองเมื่อกลับไปหน้าของนักเรียน'
          : 'ยังไม่ได้ตั้งรหัส: ใครก็เปิดหน้าครูและเห็นคะแนนของทุกคนได้ ควรตั้งรหัสก่อนให้นักเรียนใช้เครื่อง'}
      </p>
      {shown && (
        <div className="mh-recovery-box" data-testid="mh-recovery-box">
          <b>รหัสสำรอง (จดเก็บไว้): {shown}</b>
          <span>ถ้าลืมรหัสครู ใช้รหัสสำรองนี้ล้างรหัสได้ ข้อมูลนักเรียนไม่หาย</span>
          <button type="button" className="mh-chip" onClick={() => setShown(null)}>
            จดแล้ว
          </button>
        </div>
      )}
      {mode === 'set' ? (
        <div className="mh-form-grid">
          <label>
            รหัสใหม่ (ตัวเลข 4–6 หลัก)
            <input
              className="mh-text-input"
              type="password"
              inputMode="numeric"
              value={pin}
              data-testid="mh-cs-newpin"
              onChange={(e) => {
                setError('')
                setPin(e.target.value.replace(/\D/g, '').slice(0, 6))
              }}
            />
          </label>
          <label>
            ใส่รหัสอีกครั้ง
            <input
              className="mh-text-input"
              type="password"
              inputMode="numeric"
              value={pin2}
              data-testid="mh-cs-newpin2"
              onChange={(e) => {
                setError('')
                setPin2(e.target.value.replace(/\D/g, '').slice(0, 6))
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commit()
              }}
            />
          </label>
          {error && (
            <p className="mh-pin-error" role="alert">
              {error}
            </p>
          )}
          <div className="mh-row-buttons">
            <button type="button" className="mh-btn mh-btn-gold" onClick={commit} data-testid="mh-cs-pin-save">
              💾 บันทึกรหัส
            </button>
            <button type="button" className="mh-btn mh-btn-soft" onClick={() => setMode('idle')}>
              ยกเลิก
            </button>
          </div>
        </div>
      ) : (
        <div className="mh-row-buttons">
          <button type="button" className="mh-btn mh-btn-gold" onClick={() => setMode('set')} data-testid="mh-cs-pin-set">
            {c.pin ? '🔁 เปลี่ยนรหัสครู' : '🔒 ตั้งรหัสครู'}
          </button>
          {c.pin && (
            <>
              <button type="button" className="mh-btn mh-btn-soft" onClick={() => setShown(c.recovery)}>
                👁️ ดูรหัสสำรอง
              </button>
              <button
                type="button"
                className="mh-btn mh-btn-soft"
                onClick={() => {
                  updateClassroom({ pin: '', recovery: '' })
                  pushToast('🔓', 'ยกเลิกรหัสครูแล้ว')
                }}
              >
                🔓 ยกเลิกรหัส
              </button>
            </>
          )}
        </div>
      )}
    </section>
  )
}

function BackupSection() {
  const { save, updateSave, pushToast } = useGame()
  const [incoming, setIncoming] = useState<Incoming[]>([])
  const [bad, setBad] = useState<string[]>([])
  const [prev, setPrev] = useState(() => readPrevious())
  const students = Object.keys(save.players).length

  const download = () => {
    downloadText(backupFileName(save), buildBackup(save), 'application/json')
    playSound('click')
  }

  const pick = async (files: FileList | null) => {
    if (!files) return
    const ok: Incoming[] = []
    const failed: string[] = []
    for (const f of Array.from(files)) {
      const read = readBackup(await f.text())
      if (read) ok.push({ name: f.name, read })
      else failed.push(f.name)
    }
    setIncoming(ok)
    setBad(failed)
  }

  const apply = (mode: 'merge' | 'replace') => {
    if (incoming.length === 0) return
    keepPrevious(save)
    let added = 0
    let merged = 0
    let next: SaveData = save
    if (mode === 'replace') {
      next = { ...incoming[0].read.save, settings: save.settings }
      for (const f of incoming.slice(1)) {
        const r = mergeSaves(next, f.read.save)
        next = r.save
      }
      added = Object.keys(next.players).length
    } else {
      for (const f of incoming) {
        const r = mergeSaves(next, f.read.save)
        next = r.save
        added += r.added
        merged += r.merged
      }
    }
    const result = next
    updateSave(() => ({ ...result, activeId: result.players[save.activeId ?? ''] ? save.activeId : null }))
    setPrev(readPrevious())
    setIncoming([])
    playSound('complete')
    pushToast('✅', mode === 'replace' ? `แทนที่ข้อมูลแล้ว (${added} คน)` : `รวมข้อมูลแล้ว: เพิ่มใหม่ ${added} คน · รวมผลคนเดิม ${merged} คน`)
  }

  return (
    <section className="mh-card" data-testid="mh-cs-backup">
      <h2 className="mh-card-title">💾 สำรองและรวมข้อมูลจากหลายเครื่อง</h2>
      <ol className="mh-roster-steps">
        <li>
          แท็บเล็ตแต่ละเครื่อง: เข้าหน้านี้ แล้วกด <b>ดาวน์โหลดไฟล์สำรอง</b>
        </li>
        <li>
          ส่งไฟล์มาที่เครื่องครู (สาย USB ไลน์ อีเมล หรือไดรฟ์) แล้วกด <b>เลือกไฟล์สำรอง</b> เลือกได้หลายไฟล์พร้อมกัน
        </li>
        <li>
          เลือก <b>รวมกับข้อมูลในเครื่องนี้</b> นักเรียนคนเดียวกันจะรวมผลเป็นคนเดียว นำเข้าไฟล์เดิมซ้ำได้ คะแนนไม่เพิ่มซ้ำ
        </li>
      </ol>
      <p className="mh-soft">ไฟล์สำรองมีชื่อและคะแนนของนักเรียน เก็บไว้ในเครื่องของโรงเรียน ไม่ควรเผยแพร่</p>
      <div className="mh-row-buttons">
        <button type="button" className="mh-btn mh-btn-gold" onClick={download} data-testid="mh-backup-download">
          <Download size={20} /> ดาวน์โหลดไฟล์สำรอง ({students} คน)
        </button>
        <label className="mh-btn mh-btn-soft mh-file-btn">
          📂 เลือกไฟล์สำรอง
          <input
            type="file"
            accept=".json,application/json"
            multiple
            data-testid="mh-backup-file"
            onChange={async (e) => {
              await pick(e.target.files)
              e.target.value = ''
            }}
          />
        </label>
      </div>
      {bad.length > 0 && <p className="mh-pin-error">⚠️ อ่านไม่ได้ (ไม่ใช่ไฟล์สำรองของเกมนี้): {bad.join(', ')}</p>}
      {incoming.length > 0 && (
        <div className="mh-backup-preview" data-testid="mh-backup-preview">
          <ul>
            {incoming.map((f) => (
              <li key={f.name}>
                📄 {f.name}: นักเรียน {Object.keys(f.read.save.players).length} คน
                {f.read.exportedAt ? ` · บันทึกเมื่อ ${dateText(f.read.exportedAt)}` : ''}
              </li>
            ))}
          </ul>
          <div className="mh-row-buttons">
            <button type="button" className="mh-btn mh-btn-gold" onClick={() => apply('merge')} data-testid="mh-backup-merge">
              🔄 รวมกับข้อมูลในเครื่องนี้ (แนะนำ)
            </button>
            <button type="button" className="mh-btn mh-btn-soft" onClick={() => apply('replace')} data-testid="mh-backup-replace">
              ⚠️ แทนที่ข้อมูลทั้งหมด
            </button>
            <button type="button" className="mh-btn mh-btn-soft" onClick={() => setIncoming([])}>
              ยกเลิก
            </button>
          </div>
        </div>
      )}
      {prev && (
        <div className="mh-backup-undo">
          <span className="mh-soft">
            มีสำเนาข้อมูลก่อนการนำเข้า/ล้างครั้งล่าสุด ({Object.keys(prev.save.players).length} คน{prev.exportedAt ? ` · ${dateText(prev.exportedAt)}` : ''})
          </span>
          <button
            type="button"
            className="mh-chip"
            data-testid="mh-backup-undo"
            onClick={() => {
              const before = prev.save
              keepPrevious(save)
              updateSave(() => ({ ...before, settings: save.settings }))
              setPrev(readPrevious())
              pushToast('↩️', 'ย้อนกลับเป็นข้อมูลก่อนหน้าแล้ว')
            }}
          >
            ↩️ ย้อนกลับเป็นข้อมูลก่อนหน้า
          </button>
          <button
            type="button"
            className="mh-chip"
            onClick={() => {
              clearPrevious()
              setPrev(null)
            }}
          >
            ลบสำเนา
          </button>
        </div>
      )}
    </section>
  )
}

function DangerReset({ onReset, onBackup }: { onReset: () => void; onBackup: () => void }) {
  const [step, setStep] = useState(0)
  return (
    <>
      <p className="mh-soft">ผู้เล่นทุกคนและคะแนนทั้งหมดในเครื่องนี้จะหายไป (การตั้งค่าห้องเรียนและรหัสครูยังอยู่) ควรดาวน์โหลดไฟล์สำรองก่อน</p>
      {step === 0 ? (
        <button type="button" className="mh-btn mh-btn-soft" onClick={() => setStep(1)}>
          🗑️ ล้างข้อมูลนักเรียน
        </button>
      ) : (
        <div className="mh-row-buttons">
          <button type="button" className="mh-btn mh-btn-gold" onClick={onBackup}>
            <Download size={20} /> ดาวน์โหลดไฟล์สำรองก่อน
          </button>
          <button
            type="button"
            className="mh-btn mh-btn-soft mh-btn-danger"
            onClick={() => {
              onReset()
              setStep(0)
            }}
          >
            ยืนยันล้างข้อมูล
          </button>
          <button type="button" className="mh-btn mh-btn-go" onClick={() => setStep(0)}>
            ไม่ล้าง
          </button>
        </div>
      )}
    </>
  )
}
