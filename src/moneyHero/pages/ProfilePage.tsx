import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Pencil } from 'lucide-react'
import { useGame } from '../hooks/useMoneyGame'
import { AVATARS } from '../data/characters'
import { TOTAL_LESSONS } from '../data/levels'
import { canTakePostTest, lessonsPassed, overallAccuracy, totalStars } from '../engine/progress'
import { minutes, percent, testPercent } from '../engine/report'
import { playerLevel } from '../engine/scoring'
import { TopBar } from '../components/TopBar'
import { AvatarArt } from '../components/Art'
import { BeforeAfter, StatTile } from '../components/Charts'
import { playSound } from '../utils/sound'

/**
 * โปรไฟล์ฮีโร่: ตัวละคร เลเวล สถิติสำคัญ ผลแบบทดสอบ และเปลี่ยนชื่อ/ตัวละครได้
 * เส้นทาง #/profile
 */
export function ProfilePage() {
  const { player, updatePlayer } = useGame()
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(player?.name ?? '')
  if (!player) return null
  const lv = playerLevel(player.exp)
  const pre = testPercent(player.preTest)
  const post = testPercent(player.postTest)

  return (
    <div className="mh-level theme-start">
      <TopBar />
      <div className="mh-page">
        <div className="mh-page-head">
          <Link to="/map" className="mh-icon-btn" aria-label="กลับแผนที่">
            <ArrowLeft size={24} />
          </Link>
          <h1 className="mh-title mh-level-title">👤 โปรไฟล์ฮีโร่</h1>
        </div>

        <div className="mh-profile">
          <div className="mh-card mh-profile-card" data-testid="mh-profile">
            <div className="mh-pedestal">
              <AvatarArt avatar={player.avatar} size={150} />
            </div>
            {editing ? (
              <form
                className="mh-rename"
                onSubmit={(e) => {
                  e.preventDefault()
                  const n = name.trim().slice(0, 20)
                  if (n) updatePlayer((p) => ({ ...p, name: n }))
                  setEditing(false)
                }}
              >
                <input className="mh-text-input" value={name} maxLength={20} onChange={(e) => setName(e.target.value)} aria-label="ชื่อฮีโร่" autoFocus />
                <button type="submit" className="mh-btn mh-btn-go">
                  บันทึก
                </button>
              </form>
            ) : (
              <h2 className="mh-profile-name">
                {player.name}
                <button type="button" className="mh-icon-btn mh-icon-btn-sm" aria-label="แก้ชื่อ" onClick={() => setEditing(true)}>
                  <Pencil size={16} />
                </button>
              </h2>
            )}
            <div className="mh-lv-row">
              <span className="mh-lv">Lv.{lv.level}</span>
              <div className="mh-progress mh-exp-bar" role="progressbar" aria-valuenow={lv.into} aria-valuemin={0} aria-valuemax={lv.need}>
                <div style={{ width: `${(lv.into / lv.need) * 100}%` }} />
              </div>
              <span className="mh-soft">
                {lv.into}/{lv.need} EXP
              </span>
            </div>
            <div className="mh-avatar-pick" role="radiogroup" aria-label="เลือกตัวละคร">
              {AVATARS.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  role="radio"
                  aria-checked={player.avatar === a.id}
                  aria-label={a.name}
                  className={`mh-avatar-chip ${player.avatar === a.id ? 'is-on' : ''}`}
                  onClick={() => {
                    playSound('click')
                    updatePlayer((p) => ({ ...p, avatar: a.id }))
                  }}
                >
                  <AvatarArt avatar={a.id} size={46} portrait />
                </button>
              ))}
            </div>
          </div>

          <div className="mh-profile-side">
            <div className="mh-stat-tiles">
              <StatTile icon="🏙️" label="ด่านที่ผ่าน" value={`${lessonsPassed(player)}/${TOTAL_LESSONS}`} />
              <StatTile icon="⭐" label="ดาว" value={totalStars(player)} />
              <StatTile icon="🪙" label="เหรียญ" value={player.coins} />
              <StatTile icon="🎯" label="ตอบถูกครั้งแรก" value={player.answered ? `${percent(overallAccuracy(player))}%` : '–'} sub={`${player.answered} ข้อ`} />
              <StatTile icon="🔥" label="ถูกติดกันสูงสุด" value={player.bestStreak} />
              <StatTile icon="⏱" label="เวลาเล่น" value={`${minutes(player.totalTimeMs)} นาที`} />
            </div>

            <div className="mh-card mh-test-card">
              <h3 className="mh-card-title">🧭 แบบทดสอบ</h3>
              <div className="mh-test-pair">
                <div>
                  <span className="mh-soft">ก่อนเรียน</span>
                  <b>{pre === null ? 'ยังไม่ได้ทำ' : `${pre}%`}</b>
                  <Link to="/test/pre" className="mh-btn mh-btn-soft mh-btn-sm">
                    {pre === null ? 'ทำเลย' : 'ทำอีกครั้ง'}
                  </Link>
                </div>
                <div>
                  <span className="mh-soft">หลังเรียน</span>
                  <b>{post === null ? (canTakePostTest(player) ? 'พร้อมทำแล้ว' : '🔒 ผ่านด่าน 12 ก่อน') : `${post}%`}</b>
                  {canTakePostTest(player) && (
                    <Link to="/test/post" className="mh-btn mh-btn-soft mh-btn-sm">
                      {post === null ? 'ทำเลย' : 'ทำอีกครั้ง'}
                    </Link>
                  )}
                </div>
              </div>
              {player.preTest && player.postTest && <BeforeAfter pre={player.preTest} post={player.postTest} />}
            </div>

            <div className="mh-row-buttons">
              <Link to="/badges" className="mh-btn mh-btn-soft">
                🏆 ตรา ({player.badges.length})
              </Link>
              <Link to="/stats" className="mh-btn mh-btn-soft">
                📊 สถิติทักษะ
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
