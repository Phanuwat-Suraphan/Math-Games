import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useGame } from '../hooks/useMoneyGame'
import { AVATARS } from '../data/characters'
import { AvatarArt, CharacterArt } from '../components/Art'
import { Sky } from '../components/Sky'
import { playSound } from '../utils/sound'

/** สร้างผู้เล่น: ชื่อเล่น + Avatar ไม่ต้องสมัครสมาชิก */
export function CreatePlayerPage() {
  const { createPlayer } = useGame()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [avatar, setAvatar] = useState(AVATARS[0].id)
  const ok = name.trim().length > 0

  const submit = () => {
    if (!ok) return
    playSound('complete')
    createPlayer(name, avatar)
    navigate('/map', { replace: true })
  }

  return (
    <div className="mh-page mh-page-narrow">
      <Sky city={false} />
      <div className="mh-page-head">
        <Link to="/start" className="mh-icon-btn" aria-label="กลับ">
          <ArrowLeft size={24} />
        </Link>
        <h1 className="mh-title">สร้างฮีโร่ของหนู</h1>
      </div>

      <div className="mh-card mh-create">
        <div className="mh-create-hero">
          <div className="mh-pedestal mh-create-pedestal">
            <AvatarArt key={avatar} avatar={avatar} size={128} mood="happy" className="mh-create-preview" />
          </div>
          <div className="mh-create-hero-text">
            <div className="mh-npc-line">
              <CharacterArt id="rabbit" size={56} />
              <div className="mh-bubble">สวัสดีจ้ะ! บอกชื่อเล่นแล้วเลือกตัวละครได้เลย</div>
            </div>
            <div className="mh-create-name">{name.trim() || 'ฮีโร่คนใหม่'}</div>
          </div>
        </div>

        <label className="mh-label" htmlFor="mh-name">
          ชื่อเล่น
        </label>
        <input
          id="mh-name"
          data-testid="mh-name"
          className="mh-text-input"
          value={name}
          maxLength={20}
          placeholder="เช่น น้องมะลิ"
          autoComplete="off"
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') submit()
          }}
        />

        <div className="mh-label">เลือกตัวละคร</div>
        <div className="mh-avatar-grid" role="radiogroup" aria-label="ตัวละคร">
          {AVATARS.map((a) => (
            <button
              key={a.id}
              type="button"
              role="radio"
              aria-checked={avatar === a.id}
              data-testid={`mh-avatar-${a.id}`}
              className={`mh-avatar-card ${avatar === a.id ? 'is-on' : ''}`}
              onClick={() => {
                playSound('click')
                setAvatar(a.id)
              }}
            >
              <AvatarArt avatar={a.id} size={84} />
              <span className="mh-avatar-name">
                {a.emoji} {a.name}
              </span>
              {avatar === a.id && <span className="mh-check">✔</span>}
            </button>
          ))}
        </div>

        <button type="button" className="mh-btn mh-btn-gold mh-btn-xl mh-btn-block" disabled={!ok} onClick={submit} data-testid="mh-create">
          ▶ ออกผจญภัย!
        </button>
        {!ok && <p className="mh-help-line">พิมพ์ชื่อเล่นก่อนนะ</p>}
      </div>
    </div>
  )
}
