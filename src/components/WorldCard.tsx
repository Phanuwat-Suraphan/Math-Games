import { motion } from 'framer-motion'
import { WorldSceneArt } from './art/GameArt'
import type { WorldSummary } from '../hooks/useProgression'

interface WorldCardProps {
  summary: WorldSummary
  onSelect: (worldId: string) => void
}

export function WorldCard({ summary, onSelect }: WorldCardProps) {
  const { world, lock, progress } = summary
  const isPlayable = lock.isUnlocked && progress.hasContent

  const statusLabel = !lock.isUnlocked
    ? `🔒 ${lock.reason ?? 'ยังเข้าไม่ได้'}`
    : !progress.hasContent
      ? '🚧 กำลังสร้าง เร็ว ๆ นี้'
      : progress.isComplete
        ? '🏆 พิชิตครบทุกด่านแล้ว'
        : `⚔️ ผ่านแล้ว ${progress.completedStages} / ${progress.totalStages} ด่าน`

  return (
    <motion.button
      type="button"
      whileHover={isPlayable ? { y: -4 } : undefined}
      whileTap={isPlayable ? { scale: 0.98 } : undefined}
      onClick={() => onSelect(world.id)}
      disabled={!isPlayable}
      aria-label={`โลกที่ ${world.order} ${world.name} เรื่อง ${world.subtitle} — ${statusLabel}`}
      className={[
        'group relative w-full overflow-hidden rounded-xl2 border p-5 text-left transition-colors',
        isPlayable
          ? 'cursor-pointer border-white/15 bg-night-800/80 shadow-card hover:border-white/30'
          : 'cursor-not-allowed border-white/5 bg-night-800/40',
      ].join(' ')}
    >
      {/* ฉากประจำโลกเป็นภาพพื้นหลัง เด็กจำโลกได้จากภาพโดยไม่ต้องอ่านชื่อ */}
      <WorldSceneArt
        worldId={world.id}
        isLocked={!lock.isUnlocked}
        className={`absolute inset-0 h-full w-full object-cover transition-opacity ${
          isPlayable ? 'opacity-60 group-hover:opacity-80' : 'opacity-35'
        }`}
      />
      {/* ไล่สีทับให้ตัวหนังสืออ่านออกทุกฉาก */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-r from-night-900/95 via-night-900/70 to-night-900/30"
      />

      <div className="relative flex items-start gap-4">
        <span
          aria-hidden="true"
          className={`text-4xl sm:text-5xl ${isPlayable ? '' : 'opacity-60 grayscale'}`}
        >
          {lock.isUnlocked ? world.emoji : '🔒'}
        </span>

        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-300">
            โลกที่ {world.order}
          </p>
          <h3
            className={`mt-0.5 text-lg font-bold sm:text-xl ${
              isPlayable ? 'text-white' : 'text-slate-400'
            }`}
          >
            {world.name}
          </h3>
          <p className="mt-1 text-sm text-slate-200">{world.subtitle}</p>

          {isPlayable ? (
            <p className="mt-2 line-clamp-2 text-sm text-slate-300">
              {world.description}
            </p>
          ) : null}

          <p
            className={`mt-3 inline-flex rounded-full px-3 py-1 text-sm font-semibold ${
              !lock.isUnlocked || !progress.hasContent
                ? 'bg-night-900/70 text-slate-200'
                : progress.isComplete
                  ? 'bg-gold-500/25 text-gold-300'
                  : 'bg-night-900/70 text-white'
            }`}
          >
            {statusLabel}
          </p>

          {isPlayable ? (
            <>
              <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-night-900/70">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-leaf-400 to-leaf-600 transition-all duration-500"
                  style={{ width: `${progress.percent}%` }}
                />
              </div>
              <p className="mt-2 text-sm font-semibold text-gold-300">
                <span aria-hidden="true">⭐</span> {progress.stars} /{' '}
                {progress.maxStars} ดาว
              </p>
            </>
          ) : null}
        </div>
      </div>
    </motion.button>
  )
}
