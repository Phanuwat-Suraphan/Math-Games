import { useNavigate } from 'react-router-dom'
import { getAvatar } from '../data/avatars'
import type { Player } from '../types/player'
import { AvatarBadge } from './AvatarBadge'
import { CoinDisplay } from './CoinDisplay'
import { ExpBar } from './ExpBar'
import { StreakBadge } from './StreakBadge'

interface TopBarProps {
  player: Player
  title: string
  backTo?: string
  backLabel?: string
  /** แสดงจำนวนข้อที่ตอบถูกติดต่อกัน ใช้ระหว่างเล่นด่าน */
  showStreak?: boolean
}

/** แถบสถานะด้านบนที่ใช้ร่วมกันทุกหน้า เพื่อไม่ให้เด็กหลงทาง */
export function TopBar({
  player,
  title,
  backTo,
  backLabel = 'ย้อนกลับ',
  showStreak = false,
}: TopBarProps) {
  const navigate = useNavigate()
  const avatar = getAvatar(player.avatar)

  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-night-900/85 backdrop-blur">
      <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center gap-3 px-4 py-3 sm:px-6">
        {backTo ? (
          <button
            type="button"
            onClick={() => navigate(backTo)}
            aria-label={backLabel}
            className="flex min-h-[44px] items-center gap-1.5 rounded-xl border border-white/15 px-3 py-2 text-sm font-semibold text-slate-200 transition-colors hover:bg-white/10"
          >
            <span aria-hidden="true">←</span>
            <span className="hidden sm:inline">{backLabel}</span>
          </button>
        ) : null}

        <div className="flex min-w-0 flex-1 items-center gap-3">
          <AvatarBadge avatar={avatar} size="sm" className="hidden sm:flex" />
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-base font-bold text-white sm:text-lg">
              {title}
            </h1>
            <p className="truncate text-xs text-slate-400">
              {player.name} · เลเวล {player.level}
            </p>
          </div>
        </div>

        {showStreak ? (
          <StreakBadge
            currentStreak={player.currentStreak}
            bestStreak={player.bestStreak}
            compact
          />
        ) : null}

        <CoinDisplay coins={player.coins} />
      </div>

      <div className="mx-auto w-full max-w-5xl px-4 pb-2 sm:px-6">
        <ExpBar level={player.level} exp={player.exp} showLabel={false} size="sm" />
      </div>
    </header>
  )
}
