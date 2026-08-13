import { motion } from 'framer-motion'
import type { Difficulty, Level } from '../types/level'
import { Button } from './Button'

interface LevelCardProps {
  level: Level
  isUnlocked: boolean
  isCompleted: boolean
  onStart: (level: Level) => void
}

const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  easy: 'ง่าย',
  normal: 'ปานกลาง',
  hard: 'ยาก',
  boss: 'บอส',
}

const DIFFICULTY_CLASS: Record<Difficulty, string> = {
  easy: 'bg-leaf-600/25 text-leaf-400',
  normal: 'bg-sky-600/25 text-sky-400',
  hard: 'bg-gold-600/25 text-gold-300',
  boss: 'bg-ember-600/25 text-ember-400',
}

const DIFFICULTY_STARS: Record<Difficulty, number> = {
  easy: 1,
  normal: 2,
  hard: 3,
  boss: 4,
}

export function LevelCard({
  level,
  isUnlocked,
  isCompleted,
  onStart,
}: LevelCardProps) {
  const stars = DIFFICULTY_STARS[level.difficulty]

  return (
    <motion.article
      whileHover={isUnlocked ? { y: -3 } : undefined}
      className={[
        'surface-card flex flex-col gap-4 p-5',
        isUnlocked ? '' : 'opacity-70',
        level.isBoss && isUnlocked ? 'ring-1 ring-ember-500/50' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="flex items-start gap-3">
        <span aria-hidden="true" className="text-3xl">
          {isUnlocked ? level.emoji : '🔒'}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              ด่านที่ {level.order}
            </p>
            {isCompleted ? (
              <span className="rounded-full bg-leaf-600/25 px-2 py-0.5 text-xs font-bold text-leaf-400">
                ✅ ผ่านแล้ว
              </span>
            ) : null}
          </div>

          <h3 className="mt-0.5 text-lg font-bold text-white">{level.name}</h3>
          <p className="mt-1 text-sm text-slate-300">{level.description}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span
          className={`rounded-full px-3 py-1 font-semibold ${DIFFICULTY_CLASS[level.difficulty]}`}
        >
          ระดับ: {DIFFICULTY_LABEL[level.difficulty]}{' '}
          <span aria-hidden="true">{'★'.repeat(stars)}</span>
        </span>
        <span className="stat-chip text-arcane-400">
          <span aria-hidden="true">✨</span> +{level.reward.exp} EXP
        </span>
        <span className="stat-chip text-gold-300">
          <span aria-hidden="true">🪙</span> +{level.reward.coins}
        </span>
        <span className="stat-chip text-slate-300">
          <span aria-hidden="true">❓</span> {level.questionCount} ข้อ
        </span>
      </div>

      {isUnlocked ? (
        <Button
          variant={level.isBoss ? 'danger' : 'primary'}
          fullWidth
          icon={level.isBoss ? '⚔️' : '▶️'}
          onClick={() => onStart(level)}
          aria-label={`เริ่มด่าน ${level.name}`}
        >
          {isCompleted ? 'เล่นอีกครั้ง' : 'เริ่มด่านนี้'}
        </Button>
      ) : (
        <p className="rounded-2xl bg-night-900/70 px-4 py-3 text-center text-sm font-semibold text-slate-300">
          🔒 ต้องผ่านด่านที่ {level.order - 1} ก่อน
        </p>
      )}
    </motion.article>
  )
}
