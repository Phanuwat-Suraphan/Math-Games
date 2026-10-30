import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Trash2, UserPlus } from 'lucide-react'
import { useGame } from '../hooks/useMoneyGame'
import { lessonsPassed, totalStars, type Player } from '../engine/progress'
import { compareStudents } from '../engine/classroom'
import { TOTAL_LESSONS } from '../data/levels'
import { AvatarArt } from '../components/Art'
import { Sky } from '../components/Sky'
import { playSound } from '../utils/sound'

/**
 * เลือกผู้เล่น (แท็บเล็ตห้องเรียนใช้ร่วมกันได้หลายคน)
 * มีทะเบียนนักเรียน: แตะชื่อตัวเอง (แสดงแค่เลขที่กับชื่อเล่น ไม่แสดงนามสกุล เลขประจำตัว หรือคะแนนของเพื่อน)
 */
export function PlayersPage() {
  const { save, player, selectPlayer, deletePlayer } = useGame()
  const navigate = useNavigate()
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [room, setRoom] = useState<string | null>(null)
  const c = save.classroom
  const roster = useMemo(() => Object.values(save.players).filter((p) => p.student).sort(compareStudents), [save.players])
  const others = useMemo(() => Object.values(save.players).filter((p) => !p.student).sort((a, b) => b.lastPlayed - a.lastPlayed), [save.players])
  const rooms = Array.from(new Set(roster.map((p) => p.student!.room)))
  const shownRoom = room ?? (rooms.includes(c.room) ? c.room : rooms[0])
  const canCreate = !(c.rosterOnly && roster.length > 0)
  // ลบผู้เล่นได้เฉพาะเมื่อครูยังไม่ได้ตั้งรหัส (ตั้งแล้วให้ครูจัดการที่ทะเบียนนักเรียน)
  const canDelete = !c.pin

  const pick = (p: Player) => {
    playSound('click')
    selectPlayer(p.id)
    navigate(p.needsAvatar ? '/create?for=me' : '/map')
  }

  return (
    <div className="mh-page mh-page-narrow">
      <Sky city={false} />
      <div className="mh-page-head">
        <Link to="/start" className="mh-icon-btn" aria-label="กลับ">
          <ArrowLeft size={24} />
        </Link>
        <h1 className="mh-title">{roster.length > 0 ? 'แตะชื่อของหนู' : 'ใครกำลังเล่นอยู่?'}</h1>
      </div>

      {roster.length > 0 && (
        <section className="mh-card mh-roster-pick" data-testid="mh-roster-pick">
          {rooms.length > 1 && (
            <div className="mh-chips" role="tablist" aria-label="ห้อง">
              {rooms.map((r) => (
                <button key={r} type="button" role="tab" aria-selected={r === shownRoom} className={`mh-chip ${r === shownRoom ? 'is-on' : ''}`} onClick={() => setRoom(r)}>
                  {r}
                </button>
              ))}
            </div>
          )}
          <div className="mh-roster-grid">
            {roster
              .filter((p) => p.student!.room === shownRoom)
              .map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className={`mh-roster-kid ${player?.id === p.id ? 'is-on' : ''}`}
                  data-testid={`mh-pick-${p.student!.no ?? p.id}`}
                  onClick={() => pick(p)}
                >
                  {p.needsAvatar ? <span className="mh-roster-noavatar is-big">?</span> : <AvatarArt avatar={p.avatar} size={56} portrait wear={p.wear} />}
                  <span className="mh-roster-kid-no">{p.student!.no ? `เลขที่ ${p.student!.no}` : ''}</span>
                  <b className="mh-roster-kid-name">{p.name}</b>
                </button>
              ))}
          </div>
        </section>
      )}

      {(others.length > 0 || roster.length === 0) && (canCreate || roster.length === 0) && (
        <>
          {roster.length > 0 && <h2 className="mh-section-title">ผู้เล่นอื่นในเครื่องนี้</h2>}
          <div className="mh-player-list">
            {others.length === 0 && <div className="mh-card">ยังไม่มีผู้เล่นในเครื่องนี้</div>}
            {others.map((p) => (
              <div key={p.id} className={`mh-card mh-player-row ${player?.id === p.id ? 'is-on' : ''}`}>
                <button type="button" className="mh-player-pick" onClick={() => pick(p)}>
                  <AvatarArt avatar={p.avatar} size={56} portrait wear={p.wear} />
                  <span className="mh-player-info">
                    <b>{p.name}</b>
                    <span>
                      ผ่านแล้ว {lessonsPassed(p)} / {TOTAL_LESSONS} ด่าน · ⭐ {totalStars(p)} · 🪙 {p.coins}
                    </span>
                  </span>
                  <span className="mh-player-go">▶</span>
                </button>
                {!canDelete ? null : confirmId === p.id ? (
                  <span className="mh-confirm">
                    ลบ{p.name}?
                    <button
                      type="button"
                      className="mh-chip mh-chip-danger"
                      onClick={() => {
                        deletePlayer(p.id)
                        setConfirmId(null)
                      }}
                    >
                      ลบเลย
                    </button>
                    <button type="button" className="mh-chip" onClick={() => setConfirmId(null)}>
                      ไม่ลบ
                    </button>
                  </span>
                ) : (
                  <button type="button" className="mh-icon-btn" aria-label={`ลบ${p.name}`} onClick={() => setConfirmId(p.id)}>
                    <Trash2 size={20} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {canCreate && (
        <div className="mh-row-buttons">
          <Link to="/create" className="mh-btn mh-btn-gold">
            <UserPlus size={22} /> เพิ่มผู้เล่นใหม่
          </Link>
        </div>
      )}
      {roster.length > 0 && <p className="mh-help-line">ไม่เจอชื่อ? บอกคุณครูให้เพิ่มชื่อในทะเบียนนักเรียน</p>}
    </div>
  )
}
