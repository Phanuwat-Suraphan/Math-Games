import { Link } from 'react-router-dom'
import { BarChart3, Map as MapIcon, Settings, Trophy, User, Volume2, VolumeX } from 'lucide-react'
import { useGame } from '../hooks/useMoneyGame'
import { totalStars } from '../engine/progress'
import { playerLevel } from '../engine/scoring'
import { AvatarArt } from './Art'

/**
 * แถบบนของทุกหน้าในเกม: ผู้เล่น · เหรียญ · ดาว · EXP และปุ่ม 🗺 🏆 👤 📊 🔊 ⚙
 */
export function TopBar({ compact = false }: { compact?: boolean }) {
  const { player, settings, updateSettings } = useGame()
  if (!player) return null
  const lv = playerLevel(player.exp)

  return (
    <header className="mh-topbar">
      <Link to="/profile" className="mh-topbar-player" aria-label="โปรไฟล์">
        <AvatarArt avatar={player.avatar} size={40} portrait />
        <span className="mh-topbar-name">{player.name}</span>
        <span className="mh-lv">Lv.{lv.level}</span>
      </Link>
      <div className="mh-stats">
        {/* key เปลี่ยนเมื่อค่าเปลี่ยน ชิปจะเด้งดุ๊กดิกให้เห็นว่าได้เพิ่ม */}
        <span key={`c${player.coins}`} className="mh-stat mh-stat-coin" title="เหรียญ" data-testid="mh-coins">
          🪙 {player.coins}
        </span>
        <span key={`s${totalStars(player)}`} className="mh-stat mh-stat-star" title="ดาว">
          ⭐ {totalStars(player)}
        </span>
        {!compact && (
          <span key={`e${player.exp}`} className="mh-stat mh-stat-exp" title="EXP">
            ✨ {player.exp}
          </span>
        )}
      </div>
      <nav className="mh-topbar-nav" aria-label="เมนู">
        <Link to="/map" className="mh-icon-btn" aria-label="แผนที่" data-testid="mh-nav-map">
          <MapIcon size={22} />
        </Link>
        <Link to="/badges" className="mh-icon-btn mh-hide-sm" aria-label="รางวัล">
          <Trophy size={22} />
        </Link>
        <Link to="/profile" className="mh-icon-btn mh-hide-sm" aria-label="โปรไฟล์">
          <User size={22} />
        </Link>
        <Link to="/stats" className="mh-icon-btn mh-hide-sm" aria-label="สถิติ">
          <BarChart3 size={22} />
        </Link>
        <button
          type="button"
          className={`mh-icon-btn ${settings.sound ? '' : 'is-off'}`}
          onClick={() => updateSettings({ sound: !settings.sound })}
          aria-label={settings.sound ? 'ปิดเสียง' : 'เปิดเสียง'}
        >
          {settings.sound ? <Volume2 size={22} /> : <VolumeX size={22} />}
        </button>
        <Link to="/settings" className="mh-icon-btn" aria-label="ตั้งค่า">
          <Settings size={22} />
        </Link>
      </nav>
    </header>
  )
}
