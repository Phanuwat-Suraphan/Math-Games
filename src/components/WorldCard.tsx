import { motion } from 'framer-motion'
import type { World } from '../types/world'
import type { WorldProgress } from '../utils/progression'

interface WorldCardProps {
  world: World
  isUnlocked: boolean
  lockReason: string | null
  progress: WorldProgress
  onSelect: (world: World) => void
}

export function WorldCard({
  world,
  isUnlocked,
  lockReason,
  progress,
  onSelect,
}: WorldCardProps) {
  const isPlayable = isUnlocked && progress.hasContent

  const statusLabel = !isUnlocked
    ? `🔒 ${lockReason ?? 'ยังเข้าไม่ได้'}`
    : !progress.hasContent
      ? '🚧 กำลังสร้าง เร็ว ๆ นี้'
      : progress.isComplete
        ? '✅ ผ่านครบทุกด่านแล้ว'
        : `⚔️ ผ่านแล้ว ${progress.completedLevels} / ${progress.totalLevels} ด่าน`

  return (
    <motion.button
      type="button"
      whileHover={isPlayable ? { y: -4 } : undefined}
      whileTap={isPlayable ? { scale: 0.98 } : undefined}
      onClick={() => onSelect(world)}
      disabled={!isPlayable}
      aria-label={`โลกที่ ${world.order} ${world.name} หัวข้อ ${world.topic} — ${statusLabel}`}
      className={[
        'group relative w-full overflow-hidden rounded-xl2 border p-5 text-left transition-colors',
        'focus-visible:ring-4 focus-visible:ring-gold-300',
        isPlayable
          ? 'border-white/15 bg-night-800/80 hover:border-white/30 shadow-card cursor-pointer'
          : 'border-white/5 bg-night-800/40 cursor-not-allowed',
      ].join(' ')}
    >
      <div
        aria-hidden="true"
        className={`absolute inset-0 bg-gradient-to-br ${world.theme.gradient} ${
          isPlayable ? 'opacity-20 group-hover:opacity-30' : 'opacity-[0.07]'
        } transition-opacity`}
      />

      <div className="relative flex items-start gap-4">
        <span
          aria-hidden="true"
          className={`text-4xl sm:text-5xl ${isPlayable ? '' : 'grayscale opacity-60'}`}
        >
          {isUnlocked ? world.emoji : '🔒'}
        </span>

        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            โลกที่ {world.order}
          </p>
          <h3
            className={`mt-0.5 text-lg font-bold sm:text-xl ${
              isPlayable ? 'text-white' : 'text-slate-400'
            }`}
          >
            {world.name}
          </h3>
          <p className="mt-1 text-sm text-slate-300">{world.topic}</p>

          {isPlayable ? (
            <p className="mt-2 line-clamp-2 text-sm text-slate-400">
              {world.description}
            </p>
          ) : null}

          <p
            className={`mt-3 inline-flex rounded-full px-3 py-1 text-sm font-semibold ${
              !isUnlocked || !progress.hasContent
                ? 'bg-night-900/70 text-slate-300'
                : progress.isComplete
                  ? 'bg-leaf-600/25 text-leaf-400'
                  : 'bg-arcane-600/25 text-arcane-400'
            }`}
          >
            {statusLabel}
          </p>

          {isPlayable && progress.totalLevels > 0 ? (
            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-night-900/70">
              <div
                className="h-full rounded-full bg-gradient-to-r from-leaf-400 to-leaf-600 transition-all duration-500"
                style={{ width: `${progress.percent}%` }}
              />
            </div>
          ) : null}
        </div>
      </div>
    </motion.button>
  )
}
