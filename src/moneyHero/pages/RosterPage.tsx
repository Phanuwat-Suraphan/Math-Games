import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Download, Printer, UserPlus } from 'lucide-react'
import { useGame } from '../hooks/useMoneyGame'
import { fullName, rosterPlayerId, studentKey, type StudentInfo } from '../engine/classroom'
import { applyRoster, findStudent, participation, PARTICIPATION_LABEL, readRoster, rosterList, rosterTemplate, type RosterRead } from '../engine/roster'
import { downloadText } from '../engine/backup'
import { lessonsPassed, newPlayer, type Player } from '../engine/progress'
import { TOTAL_LESSONS } from '../data/levels'
import { AvatarArt } from '../components/Art'
import { Sky } from '../components/Sky'
import { playSound } from '../utils/sound'

/**
 * ทะเบียนนักเรียน (หน้าครู): นำเข้ารายชื่อจาก Excel/CSV เพิ่ม แก้ ลบ ทีละคน
 * และจัดผู้เล่นที่สร้างเองในเครื่องเข้าทะเบียน (คะแนนเดิมอยู่ครบ)
 * เส้นทาง #/teacher/students
 */

interface FormValue extends StudentInfo {
  nick: string
}

const PREFIX_CHOICES = ['ด.ช.', 'ด.ญ.']

export function RosterPage() {
  const { save, updateSave, deletePlayer, pushToast } = useGame()
  const room = save.classroom.room
  const roster = useMemo(() => rosterList(save.players).filter((p) => p.student), [save.players])
  const others = useMemo(() => Object.values(save.players).filter((p) => !p.student), [save.players])
  const [paste, setPaste] = useState('')
  const [importRoom, setImportRoom] = useState(room)
  const [preview, setPreview] = useState<RosterRead | null>(null)
  const [editing, setEditing] = useState<string | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)

  const check = (input: string) => {
    const read = readRoster(input, importRoom.trim() || room)
    setPreview(read)
    if (read.rows.length === 0) playSound('wrong')
  }

  const apply = () => {
    if (!preview || preview.rows.length === 0) return
    const rows = preview.rows
    const result = applyRoster(save.players, rows)
    updateSave((s) => ({ ...s, players: applyRoster(s.players, rows).players }))
    playSound('complete')
    pushToast('✅', `นำเข้าแล้ว: เพิ่มใหม่ ${result.added} คน · ปรับข้อมูล ${result.updated} คน`)
    setPreview(null)
    setPaste('')
  }

  const saveForm = (id: string | 'new', v: FormValue): string | null => {
    const student: StudentInfo = { no: v.no, code: v.code.trim(), prefix: v.prefix.trim(), first: v.first.trim(), last: v.last.trim(), room: v.room.trim() || room }
    if (!student.first) return 'ใส่ชื่อจริงก่อนนะ'
    const same = findStudent(save.players, student)
    if (same && same.id !== id) return `${student.code ? 'เลขประจำตัวนี้' : 'เลขที่นี้ในห้องนี้'}มีในทะเบียนแล้ว (${fullName(same.student!)})`
    updateSave((s) => {
      if (id === 'new') {
        let pid = rosterPlayerId(student)
        while (s.players[pid]) pid += '_'
        const p: Player = { ...newPlayer(v.nick.trim() || student.first, 'hero'), id: pid, student, needsAvatar: true }
        return { ...s, players: { ...s.players, [pid]: p } }
      }
      const old = s.players[id]
      if (!old) return s
      return { ...s, players: { ...s.players, [id]: { ...old, student, name: (v.nick.trim() || old.name).slice(0, 20) } } }
    })
    playSound('click')
    setEditing(null)
    return null
  }

  const editingPlayer = editing && editing !== 'new' ? save.players[editing] : null

  return (
    <div className="mh-page mh-teacher mh-roster" data-testid="mh-roster">
      <Sky city={false} />
      <div className="mh-page-head">
        <Link to="/teacher" className="mh-icon-btn" aria-label="กลับแผงคุณครู">
          <ArrowLeft size={24} />
        </Link>
        <h1 className="mh-title">👧 ทะเบียนนักเรียน</h1>
        <div className="mh-teacher-actions">
          <Link to="/teacher/print/roster" className="mh-btn mh-btn-go" data-testid="mh-roster-print">
            <Printer size={20} /> พิมพ์รายชื่อ (A4)
          </Link>
        </div>
      </div>

      <section className="mh-card mh-roster-import">
        <h2 className="mh-card-title">📥 นำเข้ารายชื่อ</h2>
        <ol className="mh-roster-steps">
          <li>
            คัดลอกรายชื่อจาก Excel (เลือกทั้งตารางรวมแถวหัวตาราง) แล้ววางในช่องนี้ <b>หรือ</b> เลือกไฟล์ CSV
          </li>
          <li>กด "ตรวจรายชื่อ" ดูตัวอย่างให้ถูกต้อง แล้วกด "นำเข้า"</li>
        </ol>
        <p className="mh-soft">
          หัวตารางที่อ่านได้: เลขที่ · เลขประจำตัว · คำนำหน้า · ชื่อ · นามสกุล (หรือ ชื่อ-สกุล ช่องเดียว) · ชื่อเล่น · ห้อง — นำเข้าซ้ำได้ คนเดิมจะปรับข้อมูล คะแนนไม่หาย
        </p>
        <textarea
          className="mh-text-input mh-roster-paste"
          rows={5}
          value={paste}
          placeholder={'เลขที่\tเลขประจำตัว\tชื่อ-สกุล\tชื่อเล่น\n1\t12345\tด.ช.สมชาย ใจดี\tต้นกล้า'}
          data-testid="mh-roster-paste"
          aria-label="วางรายชื่อนักเรียน"
          onChange={(e) => {
            setPaste(e.target.value)
            setPreview(null)
          }}
        />
        <div className="mh-roster-tools">
          <label className="mh-roster-room">
            ห้องเริ่มต้น
            <input className="mh-text-input" value={importRoom} maxLength={20} onChange={(e) => setImportRoom(e.target.value)} data-testid="mh-roster-room" />
          </label>
          <button type="button" className="mh-btn mh-btn-gold" disabled={!paste.trim()} onClick={() => check(paste)} data-testid="mh-roster-check">
            🔍 ตรวจรายชื่อ
          </button>
          <label className="mh-btn mh-btn-soft mh-file-btn">
            📂 เลือกไฟล์ CSV
            <input
              type="file"
              accept=".csv,.txt,text/csv,text/plain"
              data-testid="mh-roster-file"
              onChange={async (e) => {
                const f = e.target.files?.[0]
                e.target.value = ''
                if (!f) return
                const body = await f.text()
                setPaste(body)
                check(body)
              }}
            />
          </label>
          <button type="button" className="mh-btn mh-btn-soft" onClick={() => downloadText('แบบฟอร์มรายชื่อนักเรียน.csv', rosterTemplate(room), 'text/csv;charset=utf-8')}>
            <Download size={18} /> แบบฟอร์ม CSV
          </button>
        </div>

        {preview && (
          <div className="mh-roster-preview" data-testid="mh-roster-preview">
            {preview.errors.length > 0 && (
              <ul className="mh-roster-errors">
                {preview.errors.map((e) => (
                  <li key={e}>⚠️ {e}</li>
                ))}
              </ul>
            )}
            {preview.rows.length > 0 && (
              <>
                <div className="mh-table-wrap">
                  <table className="mh-table">
                    <thead>
                      <tr>
                        <th>เลขที่</th>
                        <th>เลขประจำตัว</th>
                        <th>ชื่อ - สกุล</th>
                        <th>ชื่อเล่น</th>
                        <th>ห้อง</th>
                        <th>ผล</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.rows.map((r) => (
                        <tr key={studentKey(r)}>
                          <td>{r.no ?? '–'}</td>
                          <td>{r.code || '–'}</td>
                          <td>{fullName(r)}</td>
                          <td>{r.nick || '–'}</td>
                          <td>{r.room}</td>
                          <td>{findStudent(save.players, r) ? '🔄 มีแล้ว (ปรับข้อมูล)' : '🆕 เพิ่มใหม่'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <button type="button" className="mh-btn mh-btn-gold mh-btn-block" onClick={apply} data-testid="mh-roster-apply">
                  ✅ นำเข้า {preview.rows.length} คน
                </button>
              </>
            )}
          </div>
        )}
      </section>

      <section className="mh-card">
        <div className="mh-roster-head">
          <h2 className="mh-card-title">📋 รายชื่อในทะเบียน ({roster.length} คน)</h2>
          <button type="button" className="mh-btn mh-btn-soft" onClick={() => setEditing('new')} data-testid="mh-roster-add">
            <UserPlus size={18} /> เพิ่มทีละคน
          </button>
        </div>
        {editing === 'new' && (
          <StudentForm
            title="เพิ่มนักเรียน"
            initial={{ no: null, code: '', prefix: '', first: '', last: '', room, nick: '' }}
            onSave={(v) => saveForm('new', v)}
            onCancel={() => setEditing(null)}
          />
        )}
        {roster.length === 0 ? (
          <p className="mh-soft">ยังไม่มีรายชื่อ นำเข้าจาก Excel ด้านบน หรือกด "เพิ่มทีละคน"</p>
        ) : (
          <div className="mh-table-wrap">
            <table className="mh-table" data-testid="mh-roster-table">
              <thead>
                <tr>
                  <th>เลขที่</th>
                  <th>เลขประจำตัว</th>
                  <th>ชื่อ - สกุล</th>
                  <th>ชื่อในเกม</th>
                  <th>ห้อง</th>
                  <th>สถานะ</th>
                  <th>จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {roster.map((p) => (
                  <tr key={p.id}>
                    <td>{p.student!.no ?? '–'}</td>
                    <td>{p.student!.code || '–'}</td>
                    <td>{fullName(p.student!)}</td>
                    <td>
                      <span className="mh-roster-nick">
                        {p.needsAvatar ? <span className="mh-roster-noavatar">?</span> : <AvatarArt avatar={p.avatar} size={28} portrait />}
                        {p.name}
                      </span>
                    </td>
                    <td>{p.student!.room}</td>
                    <td className="mh-roster-status">{PARTICIPATION_LABEL[participation(p)]}</td>
                    <td>
                      {confirmId === p.id ? (
                        <span className="mh-confirm">
                          ลบทั้งคะแนน?
                          <button
                            type="button"
                            className="mh-chip mh-chip-danger"
                            onClick={() => {
                              deletePlayer(p.id)
                              setConfirmId(null)
                            }}
                          >
                            ลบ
                          </button>
                          <button type="button" className="mh-chip" onClick={() => setConfirmId(null)}>
                            ไม่ลบ
                          </button>
                        </span>
                      ) : (
                        <span className="mh-roster-actions">
                          <button type="button" className="mh-chip" onClick={() => setEditing(p.id)} data-testid={`mh-roster-edit-${p.id}`}>
                            ✏️ แก้ไข
                          </button>
                          <button type="button" className="mh-chip" onClick={() => setConfirmId(p.id)} aria-label={`ลบ ${p.name}`}>
                            🗑️
                          </button>
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {editingPlayer?.student && (
          <StudentForm
            key={editingPlayer.id}
            title={`แก้ไข ${fullName(editingPlayer.student)}`}
            initial={{ ...editingPlayer.student, nick: editingPlayer.name }}
            onSave={(v) => saveForm(editingPlayer.id, v)}
            onCancel={() => setEditing(null)}
          />
        )}
      </section>

      {others.length > 0 && (
        <section className="mh-card" data-testid="mh-roster-others">
          <h2 className="mh-card-title">🙋 ผู้เล่นที่ยังไม่อยู่ในทะเบียน ({others.length} คน)</h2>
          <p className="mh-soft">ผู้เล่นที่นักเรียนสร้างเองในเครื่องนี้ กด "จัดเข้าทะเบียน" แล้วกรอกข้อมูล คะแนนที่เล่นมาแล้วอยู่ครบ</p>
          <ul className="mh-roster-otherlist">
            {others.map((p) => (
              <li key={p.id}>
                <AvatarArt avatar={p.avatar} size={36} portrait wear={p.wear} />
                <span className="mh-roster-other-name">
                  <b>{p.name}</b>
                  <span className="mh-soft">
                    ผ่าน {lessonsPassed(p)}/{TOTAL_LESSONS} ด่าน · {PARTICIPATION_LABEL[participation(p)]}
                  </span>
                </span>
                <button type="button" className="mh-chip" onClick={() => setEditing(p.id)} data-testid={`mh-roster-link-${p.id}`}>
                  ➕ จัดเข้าทะเบียน
                </button>
              </li>
            ))}
          </ul>
          {editingPlayer && !editingPlayer.student && (
            <StudentForm
              key={editingPlayer.id}
              title={`จัด "${editingPlayer.name}" เข้าทะเบียน`}
              initial={{ no: null, code: '', prefix: '', first: editingPlayer.name, last: '', room, nick: editingPlayer.name }}
              onSave={(v) => saveForm(editingPlayer.id, v)}
              onCancel={() => setEditing(null)}
            />
          )}
        </section>
      )}
    </div>
  )
}

function StudentForm({
  title,
  initial,
  onSave,
  onCancel,
}: {
  title: string
  initial: FormValue
  onSave: (v: FormValue) => string | null
  onCancel: () => void
}) {
  const [v, setV] = useState<FormValue>(initial)
  const [error, setError] = useState('')
  const set = (patch: Partial<FormValue>) => {
    setError('')
    setV((o) => ({ ...o, ...patch }))
  }
  return (
    <form
      className="mh-student-form"
      data-testid="mh-student-form"
      onSubmit={(e) => {
        e.preventDefault()
        const err = onSave(v)
        if (err) setError(err)
      }}
    >
      <h3 className="mh-card-title">{title}</h3>
      <div className="mh-form-grid">
        <label>
          เลขที่
          <input
            className="mh-text-input"
            inputMode="numeric"
            value={v.no ?? ''}
            data-testid="mh-sf-no"
            onChange={(e) => {
              const n = e.target.value.replace(/\D/g, '').slice(0, 3)
              set({ no: n ? Number(n) : null })
            }}
          />
        </label>
        <label>
          เลขประจำตัว
          <input className="mh-text-input" value={v.code} maxLength={20} data-testid="mh-sf-code" onChange={(e) => set({ code: e.target.value })} />
        </label>
        <label>
          คำนำหน้า
          <input className="mh-text-input" list="mh-prefixes" value={v.prefix} maxLength={12} data-testid="mh-sf-prefix" onChange={(e) => set({ prefix: e.target.value })} />
          <datalist id="mh-prefixes">
            {PREFIX_CHOICES.map((p) => (
              <option key={p} value={p} />
            ))}
          </datalist>
        </label>
        <label>
          ชื่อจริง *
          <input className="mh-text-input" value={v.first} maxLength={40} data-testid="mh-sf-first" onChange={(e) => set({ first: e.target.value })} />
        </label>
        <label>
          นามสกุล
          <input className="mh-text-input" value={v.last} maxLength={40} data-testid="mh-sf-last" onChange={(e) => set({ last: e.target.value })} />
        </label>
        <label>
          ชื่อเล่น (แสดงในเกม)
          <input className="mh-text-input" value={v.nick} maxLength={20} data-testid="mh-sf-nick" onChange={(e) => set({ nick: e.target.value })} />
        </label>
        <label>
          ห้อง
          <input className="mh-text-input" value={v.room} maxLength={20} data-testid="mh-sf-room" onChange={(e) => set({ room: e.target.value })} />
        </label>
      </div>
      {error && (
        <p className="mh-pin-error" role="alert">
          {error}
        </p>
      )}
      <div className="mh-row-buttons">
        <button type="submit" className="mh-btn mh-btn-gold" data-testid="mh-sf-save">
          💾 บันทึก
        </button>
        <button type="button" className="mh-btn mh-btn-soft" onClick={onCancel}>
          ยกเลิก
        </button>
      </div>
    </form>
  )
}
