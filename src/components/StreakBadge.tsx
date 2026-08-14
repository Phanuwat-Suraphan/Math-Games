import { GameIcon } from './art/GameArt'
import { motion } from 'framer-motion'

interface StreakBadgeProps {
  currentStreak: number
  bestStreak: number
  /** แสดงแบบย่อสำหรับแถบด้านบน */
  compact?: boolean
  className?: string
}

export function StreakBadge({
  currentStreak,
  bestStreak,
  compact = false,
  className = '',
}: StreakBadgeProps) {
  const isHot = currentStreak >= 3

  if (compact) {
    return (
      <motion.span
        key={currentStreak}
        initial={isHot ? { scale: 0.85 } : false}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 320, damping: 16 }}
        className={`stat-chip ${
          isHot ? 'text-ember-400' : 'text-slate-300'
        } ${className}`.trim()}
      >
        <GameIcon name="flame" size={isHot ? 'h-5 w-5' : 'h-4 w-4'} />
        <span className="tabular-nums">{currentStreak}</span>
        <span className="sr-only">ตอบถูกติดต่อกัน {currentStreak} ข้อ</span>
      </motion.span>
    )
  }

  return (
    <div
      className={`surface-card p-4 text-center ${className}`.trim()}
      aria-label={`ตอบถูกติดต่อกันตอนนี้ ${currentStreak} ข้อ สถิติดีที่สุด ${bestStreak} ข้อ`}
    >
      <motion.p
        aria-hidden="true"
        className="text-3xl"
        key={currentStreak}
        initial={isHot ? { scale: 0.7, rotate: -8 } : false}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 15 }}
      >
        <GameIcon name="flame" size="h-4 w-4" />
      </motion.p>

      <p className="mt-1 text-xs text-slate-400">ตอบถูกติดต่อกัน</p>
      <p className="text-2xl font-bold tabular-nums text-ember-400">
        {currentStreak}
      </p>
      <p className="mt-1 text-xs text-slate-400">
        สถิติดีที่สุด{' '}
        <span className="font-semibold tabular-nums text-gold-300">
          {bestStreak}
        </span>
      </p>
    </div>
  )
}
