import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Printer } from 'lucide-react'
import { useGame } from '../hooks/useMoneyGame'
import { fullName, teacherName } from '../engine/classroom'
import { hasRoster, rosterList } from '../engine/roster'
import { teamList } from '../engine/teams'
import { BEHAVIOR_CRITERIA, BEHAVIOR_FULL, BEHAVIOR_LEVELS, behaviorLevel, behaviorSummary, behaviorTotal, setBehaviorNote, setBehaviorScore } from '../engine/behavior'
import type { Player } from '../engine/progress'
import { Sky } from '../components/Sky'

/**
 * ครูบันทึกพฤติกรรมการเรียนรู้เชิงรุกรายคน (4 ด้าน ด้านละ 1–4) บันทึกทันทีที่เลือก
 * ผลไปรวมในรายงานรายบุคคล รายงานสรุป และพิมพ์ลงแบบสังเกตกลุ่มได้
 * เส้นทาง #/teacher/behavior
 */

const SCORE_TEXT = ['–', '1 ควรปรับปรุง', '2 พอใช้', '3 ดี', '4 ดีเยี่ยม']

export function BehaviorPage() {
  const { save, updateSave } = useGame()
  const rosterMode = hasRoster(save.players)
  const players = useMemo(() => rosterList(save.players).filter((p) => !rosterMode || p.student), [save.players, rosterMode])
  const sum = useMemo(() => behaviorSummary(players), [players])
  const teams = teamList(players)
  const noTeam = players.filter((p) => !p.student?.team)
  const blocks = [...teams.map((t) => ({ key: t.team, title: `กลุ่มที่ ${t.team}`, members: t.members })), ...(noTeam.length > 0 ? [{ key: '-', title: teams.length > 0 ? 'ยังไม่ได้จัดกลุ่ม' : 'นักเรียนทั้งหมด', members: noTeam }] : [])]

  const update = (id: string, fn: (p: Player) => Player) => updateSave((s) => (s.players[id] ? { ...s, players: { ...s.players, [id]: fn(s.players[id]) } } : s))

  return (
    <div className="mh-page mh-teacher mh-behavior" data-testid="mh-behavior">
      <Sky city={false} />
      <div className="mh-page-head">
        <Link to="/teacher" className="mh-icon-btn" aria-label="กลับแผงคุณครู">
          <ArrowLeft size={24} />
        </Link>
        <h1 className="mh-title">✍️ บันทึกพฤติกรรมการเรียนรู้</h1>
        <div className="mh-teacher-actions">
          <Link to="/teacher/print/groups" className="mh-btn mh-btn-go" data-testid="mh-behavior-print">
            <Printer size={20} /> แบบสังเกต (A4)
          </Link>
        </div>
      </div>

      <section className="mh-card">
        <p>
          เลือกคะแนนแต่ละด้าน 1–4 ระบบบันทึกทันที รวมเต็ม {BEHAVIOR_FULL} คะแนน: 14–16 ดีเยี่ยม · 11–13 ดี · 8–10 พอใช้ · ต่ำกว่า 8 ควรปรับปรุง
        </p>
        <details className="mh-behavior-rubric">
          <summary>ดูเกณฑ์การให้คะแนน</summary>
          <ul>
            {BEHAVIOR_CRITERIA.map((c) => (
              <li key={c.name}>
                <b>{c.name}</b>: {c.levels.map((l, i) => `${4 - i} = ${l}`).join(' · ')}
              </li>
            ))}
          </ul>
        </details>
        <p className="mh-behavior-sum" data-testid="mh-behavior-sum">
          ประเมินครบแล้ว <b>{sum.assessed}</b> จาก {players.length} คน
          {sum.mean !== null && <> · เฉลี่ย {sum.mean.toFixed(2)} / {BEHAVIOR_FULL}</>}
          {sum.assessed > 0 && <> · {BEHAVIOR_LEVELS.map((l) => `${l} ${sum.levels[l]}`).join(' · ')}</>}
        </p>
      </section>

      {players.length === 0 && (
        <div className="mh-card mh-center">
          <p>ยังไม่มีนักเรียน</p>
          <Link to="/teacher/students" className="mh-btn mh-btn-gold">
            👧 นำเข้ารายชื่อนักเรียน
          </Link>
        </div>
      )}

      {blocks.map((b) => (
        <section key={b.key} className="mh-card">
          <h2 className="mh-card-title">
            {b.title} ({b.members.length} คน)
          </h2>
          <div className="mh-behavior-list">
            {b.members.map((p) => {
              const total = behaviorTotal(p.behavior)
              return (
                <div key={p.id} className="mh-behavior-row" data-testid={`mh-bh-row-${p.id}`}>
                  <div className="mh-behavior-name">
                    <b>
                      {p.student?.no ? `${p.student.no}. ` : ''}
                      {p.student ? fullName(p.student) : teacherName(p)}
                    </b>
                    <span className={`mh-behavior-total ${total === null ? 'is-empty' : ''}`} data-testid={`mh-bh-total-${p.id}`}>
                      {total === null ? 'ยังประเมินไม่ครบ' : `${total}/${BEHAVIOR_FULL} · ${behaviorLevel(total)}`}
                    </span>
                  </div>
                  <div className="mh-form-grid mh-behavior-grid">
                    {BEHAVIOR_CRITERIA.map((c, i) => (
                      <label key={c.name}>
                        {c.name}
                        <select
                          className="mh-text-input"
                          value={p.behavior?.scores[i] ?? 0}
                          data-testid={`mh-bh-${p.id}-${i}`}
                          onChange={(e) => update(p.id, (q) => setBehaviorScore(q, i, Number(e.target.value)))}
                        >
                          {SCORE_TEXT.map((t, v) => (
                            <option key={t} value={v}>
                              {t}
                            </option>
                          ))}
                        </select>
                      </label>
                    ))}
                    <label className="mh-behavior-note">
                      บันทึกเพิ่มเติม
                      <input
                        className="mh-text-input"
                        value={p.behavior?.note ?? ''}
                        maxLength={200}
                        placeholder="เช่น อธิบายวิธีทอนเงินให้เพื่อนฟังได้ดี"
                        data-testid={`mh-bh-note-${p.id}`}
                        onChange={(e) => update(p.id, (q) => setBehaviorNote(q, e.target.value))}
                      />
                    </label>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      ))}
    </div>
  )
}
