import { AnimatePresence, motion } from 'framer-motion'
import { Button } from './Button'
import { expRequiredForLevel } from '../utils/levelSystem'

interface LevelUpModalProps {
  level: number | null
  onClose: () => void
}

export function LevelUpModal({ level, onClose }: LevelUpModalProps) {
  return (
    <AnimatePresence>
      {level !== null ? (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-night-900/80 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="level-up-title"
        >
          <motion.div
            initial={{ scale: 0.85, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 220, damping: 18 }}
            className="w-full max-w-sm rounded-xl2 border border-gold-400/50 bg-gradient-to-b from-night-700 to-night-800 p-6 text-center shadow-glow"
          >
            <motion.p
              aria-hidden="true"
              className="text-6xl"
              animate={{ rotate: [0, -8, 8, 0], scale: [1, 1.15, 1] }}
              transition={{ duration: 0.9, repeat: 1 }}
            >
              🌟
            </motion.p>

            <h2
              id="level-up-title"
              className="mt-3 text-3xl font-bold text-gold-300"
            >
              LEVEL UP!
            </h2>
            <p className="mt-2 text-lg text-white">
              เก่งมาก! ตอนนี้เลเวล{' '}
              <span className="text-2xl font-bold text-gold-300">{level}</span>{' '}
              แล้ว
            </p>
            <p className="mt-1 text-sm text-slate-300">
              เลเวลถัดไปต้องใช้ {expRequiredForLevel(level)} EXP
            </p>

            <Button
              variant="success"
              size="lg"
              fullWidth
              className="mt-6"
              onClick={onClose}
              autoFocus
            >
              เยี่ยมเลย!
            </Button>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
