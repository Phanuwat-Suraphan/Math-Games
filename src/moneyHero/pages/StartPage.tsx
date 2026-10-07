import { Link, useNavigate } from 'react-router-dom'
import { GraduationCap, Settings, UserPlus, Users, Volume2, VolumeX } from 'lucide-react'
import { useGame } from '../hooks/useMoneyGame'
import { AvatarArt, CharacterArt } from '../components/Art'
import { Sky } from '../components/Sky'
import { LogoLetters } from '../components/LogoLetters'
import { lessonsPassed, totalStars } from '../engine/progress'
import { TOTAL_LESSONS } from '../data/levels'
import { playSound } from '../utils/sound'

/**
 * หน้าเริ่มเกม
 * ผู้เล่นใหม่: ▶ เริ่มเกม → สร้างตัวละคร
 * ผู้เล่นเดิม: ▶ เล่นต่อ → แผนที่
 */
export function StartPage() {
  const { player, save, settings, updateSettings } = useGame()
  const navigate = useNavigate()
  // มีผู้เล่นในเครื่องแล้ว ให้เปลี่ยนหรือลบผู้เล่นได้เสมอ
  const hasOthers = Object.keys(save.players).length > 0

  const start = () => {
    playSound('click')
    navigate(player ? '/map' : '/create')
  }

  return (
    <div className="mh-start">
      <Sky />
      <div className="mh-start-top">
        <span className="mh-start-badge">🎓 คณิตศาสตร์ ป.3 · เรื่องเงิน</span>
        <div className="mh-topbar-nav">
          <button
            type="button"
            className={`mh-icon-btn ${settings.sound ? '' : 'is-off'}`}
            onClick={() => updateSettings({ sound: !settings.sound })}
            aria-label={settings.sound ? 'ปิดเสียง' : 'เปิดเสียง'}
            data-testid="mh-sound"
          >
            {settings.sound ? <Volume2 size={24} /> : <VolumeX size={24} />}
          </button>
          <Link to="/settings" className="mh-icon-btn" aria-label="ตั้งค่า">
            <Settings size={24} />
          </Link>
        </div>
      </div>

      <div className="mh-start-stage">
        <h1 className="mh-logo" aria-label="MONEY HERO ปฏิบัติการเมืองเงินทอง">
          <LogoLetters text="MONEY HERO" />
          <span className="mh-logo-ribbon">ปฏิบัติการเมืองเงินทอง</span>
        </h1>

        <div className="mh-start-cast">
          <CharacterArt id="rabbit" size={78} className="mh-cast-sm" />
          <CharacterArt id="fox" size={78} className="mh-cast-sm" />
          <CharacterArt id="hero" size={160} className="mh-cast-lg" />
          <CharacterArt id="bear" size={78} className="mh-cast-sm" />
          <CharacterArt id="owl" size={78} className="mh-cast-sm" />
        </div>

        <div className="mh-card mh-start-actions">
          {player && (
            <div className="mh-continue">
              <AvatarArt avatar={player.avatar} size={52} portrait wear={player.wear} />
              <div>
                <div className="mh-continue-name">{player.name}</div>
                <div className="mh-continue-meta">
                  ผ่านแล้ว {lessonsPassed(player)} / {TOTAL_LESSONS} ด่าน · ⭐ {totalStars(player)} · 🪙 {player.coins}
                </div>
              </div>
            </div>
          )}
          <button type="button" className="mh-btn mh-btn-gold mh-btn-xl" onClick={start} data-testid="mh-start">
            ▶ {player ? 'เล่นต่อ' : 'เริ่มเกม'}
          </button>
          <div className={`mh-start-links ${hasOthers ? '' : 'mh-start-links-one'}`}>
            {hasOthers && (
              <Link to="/players" className="mh-btn mh-btn-soft">
                <Users size={22} /> เปลี่ยนผู้เล่น
              </Link>
            )}
            <Link to="/create" className="mh-btn mh-btn-soft" data-testid="mh-new-player">
              <UserPlus size={22} /> ผู้เล่นใหม่
            </Link>
          </div>
          <Link to="/teacher" className="mh-btn mh-btn-soft mh-btn-block">
            <GraduationCap size={22} /> โหมดคุณครู
          </Link>
        </div>
        <p className="mh-foot-note mh-pill">ไม่ต้องสมัครสมาชิก · ความก้าวหน้าบันทึกไว้ในเครื่องนี้</p>
      </div>
    </div>
  )
}
