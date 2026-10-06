import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useGame } from '../hooks/useMoneyGame'
import { ALL_BADGES, LEVEL_BADGES, SPECIAL_BADGES, type BadgeDef } from '../data/badges'
import { TopBar } from '../components/TopBar'
import { CharacterArt } from '../components/Art'

/**
 * ตู้ตราสัญลักษณ์: ตราที่ได้แล้วเป็นสีสด ตราที่ยังไม่ได้บอกวิธีได้ไว้ให้
 * เส้นทาง #/badges
 */
export function BadgesPage() {
  const { player } = useGame()
  if (!player) return null
  const earned = new Set(player.badges)
  const count = ALL_BADGES.filter((b) => earned.has(b.id)).length

  const Grid = ({ list }: { list: BadgeDef[] }) => (
    <div className="mh-badge-grid">
      {list.map((b) => {
        const has = earned.has(b.id)
        return (
          <div key={b.id} className={`mh-badge ${has ? 'is-earned' : 'is-locked'}`} data-testid={`mh-badge-${b.id}`} title={b.how}>
            <span className="mh-badge-medal" aria-hidden="true">
              <span className="mh-badge-icon">{has ? b.icon : '🔒'}</span>
            </span>
            <b className="mh-badge-name">{b.name}</b>
            <span className="mh-badge-how">{has ? '✔ ได้แล้ว' : b.how}</span>
          </div>
        )
      })}
    </div>
  )

  return (
    <div className="mh-level theme-final">
      <TopBar />
      <div className="mh-page">
        <div className="mh-page-head">
          <Link to="/map" className="mh-icon-btn" aria-label="กลับแผนที่">
            <ArrowLeft size={24} />
          </Link>
          <h1 className="mh-title mh-level-title">🏆 ตู้ตราสัญลักษณ์</h1>
        </div>
        <div className="mh-card mh-badge-summary">
          <CharacterArt id="hero" size={78} />
          <div>
            <strong>
              สะสมแล้ว {count} / {ALL_BADGES.length} ตรา
            </strong>
            <div className="mh-progress" role="progressbar" aria-valuenow={count} aria-valuemin={0} aria-valuemax={ALL_BADGES.length}>
              <div style={{ width: `${(count / ALL_BADGES.length) * 100}%` }} />
            </div>
            <span className="mh-soft">ผ่านด่าน ตอบถูกติดกัน และฝึกข้อที่เคยผิด เพื่อสะสมตราเพิ่ม!</span>
          </div>
        </div>
        <h2 className="mh-section-title">🏅 ตราประจำด่าน</h2>
        <Grid list={LEVEL_BADGES} />
        <h2 className="mh-section-title">✨ ตราพิเศษ</h2>
        <Grid list={SPECIAL_BADGES} />
      </div>
    </div>
  )
}
