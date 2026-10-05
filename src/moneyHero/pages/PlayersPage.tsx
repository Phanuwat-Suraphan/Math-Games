import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Trash2, UserPlus } from 'lucide-react'
import { useGame } from '../hooks/useMoneyGame'
import { lessonsPassed, totalStars } from '../engine/progress'
import { TOTAL_LESSONS } from '../data/levels'
import { AvatarArt } from '../components/Art'
import { Sky } from '../components/Sky'
import { playSound } from '../utils/sound'

/** เลือกผู้เล่น (แท็บเล็ตห้องเรียนใช้ร่วมกันได้หลายคน) */
export function PlayersPage() {
  const { save, player, selectPlayer, deletePlayer } = useGame()
  const navigate = useNavigate()
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const players = Object.values(save.players).sort((a, b) => b.lastPlayed - a.lastPlayed)

  return (
    <div className="mh-page mh-page-narrow">
      <Sky city={false} />
      <div className="mh-page-head">
        <Link to="/start" className="mh-icon-btn" aria-label="กลับ">
          <ArrowLeft size={24} />
        </Link>
        <h1 className="mh-title">ใครกำลังเล่นอยู่?</h1>
      </div>

      <div className="mh-player-list">
        {players.length === 0 && <div className="mh-card">ยังไม่มีผู้เล่นในเครื่องนี้</div>}
        {players.map((p) => (
          <div key={p.id} className={`mh-card mh-player-row ${player?.id === p.id ? 'is-on' : ''}`}>
            <button
              type="button"
              className="mh-player-pick"
              onClick={() => {
                playSound('click')
                selectPlayer(p.id)
                navigate('/map')
              }}
            >
              <AvatarArt avatar={p.avatar} size={56} />
              <span className="mh-player-info">
                <b>{p.name}</b>
                <span>
                  ผ่านแล้ว {lessonsPassed(p)} / {TOTAL_LESSONS} ด่าน · ⭐ {totalStars(p)} · 🪙 {p.coins}
                </span>
              </span>
              <span className="mh-player-go">▶</span>
            </button>
            {confirmId === p.id ? (
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

      <div className="mh-row-buttons">
        <Link to="/create" className="mh-btn mh-btn-gold">
          <UserPlus size={22} /> เพิ่มผู้เล่นใหม่
        </Link>
      </div>
    </div>
  )
}
