import { motion } from 'framer-motion'
import { getExpProgress } from '../utils/experience'

interface ExpBarProps {
  level: number
  exp: number
  showLabel?: boolean
  size?: 'sm' | 'md'
}

export function ExpBar({
  level,
  exp,
  showLabel = true,
  size = 'md',
}: ExpBarProps) {
  const progress = getExpProgress({ level, exp })
  const label = progress.isMaxLevel
    ? 'เลเวลสูงสุดแล้ว'
    : `${progress.exp.toLocaleString('th-TH')} / ${progress.required.toLocaleString('th-TH')} EXP`

  return (
    <div className="w-full">
      {showLabel ? (
        <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
          <span className="font-semibold text-arcane-400">Level {level}</span>
          <span className="tabular-nums text-slate-300">{label}</span>
        </div>
      ) : null}

      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={progress.required}
        aria-valuenow={progress.exp}
        aria-label={`ค่าประสบการณ์ เลเวล ${level}: ${label}`}
        className={`bar-track w-full ${size === 'sm' ? 'h-2.5' : 'h-4'}`}
      >
        <motion.div
          className="bar-fill bg-gradient-to-r from-arcane-400 via-arcane-500 to-sky-400"
          initial={false}
          animate={{ width: `${progress.percent}%` }}
          transition={{ type: 'spring', stiffness: 120, damping: 20 }}
        />
      </div>
    </div>
  )
}
