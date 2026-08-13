import { getAvatar } from '../data/avatars'
import type { Player } from '../types/player'
import { AvatarBadge } from './AvatarBadge'
import { CoinDisplay } from './CoinDisplay'
import { ExpBar } from './ExpBar'
import { HpDisplay } from './HpDisplay'
import { StreakBadge } from './StreakBadge'

interface PlayerCardProps {
  player: Player
  className?: string
}

export function PlayerCard({ player, className = '' }: PlayerCardProps) {
  const avatar = getAvatar(player.avatar)

  return (
    <section
      aria-label="ข้อมูลตัวละคร"
      className={`surface-card p-4 sm:p-5 ${className}`.trim()}
    >
      <div className="flex items-start gap-4">
        <AvatarBadge avatar={avatar} size="md" />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <h2 className="truncate text-xl font-bold text-white sm:text-2xl">
              {player.name}
            </h2>
            <span className="rounded-full bg-arcane-600/30 px-2.5 py-0.5 text-sm font-semibold text-arcane-400">
              {avatar.name}
            </span>
          </div>

          <div className="mt-3 space-y-3">
            <ExpBar level={player.level} exp={player.exp} />
            <HpDisplay hp={player.hp} maxHp={player.maxHp} />
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <CoinDisplay coins={player.coins} />
        <span className="stat-chip text-leaf-400">
          <span aria-hidden="true">🏅</span>
          <span>ผ่านแล้ว {player.completedStages.length} ด่าน</span>
        </span>
        <StreakBadge
          currentStreak={player.currentStreak}
          bestStreak={player.bestStreak}
          compact
        />
      </div>
    </section>
  )
}
