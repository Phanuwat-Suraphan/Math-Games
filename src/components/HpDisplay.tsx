import { GameIcon } from './art/GameArt'
interface HpDisplayProps {
  hp: number
  maxHp: number
  className?: string
}

export function HpDisplay({ hp, maxHp, className = '' }: HpDisplayProps) {
  const safeMax = Math.max(1, maxHp)
  const percent = Math.min(100, Math.max(0, Math.round((hp / safeMax) * 100)))

  return (
    <div className={`w-full ${className}`.trim()}>
      <div className="mb-1 flex items-baseline justify-between text-sm">
        <span className="font-semibold text-ember-400">
          <GameIcon name="heart" size="h-4 w-4" /> พลังชีวิต
        </span>
        <span className="tabular-nums text-slate-300">
          {hp} / {safeMax}
        </span>
      </div>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={safeMax}
        aria-valuenow={hp}
        aria-label={`พลังชีวิต ${hp} จาก ${safeMax}`}
        className="bar-track h-2.5 w-full"
      >
        <div
          className="bar-fill bg-gradient-to-r from-ember-500 to-ember-400"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  )
}
