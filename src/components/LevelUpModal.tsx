import { AnimatePresence, motion } from 'framer-motion'
import { Button } from './Button'
import { getRequiredExp } from '../utils/experience'
import { useGame } from '../context/useGame'

interface LevelUpModalProps {
  level: number | null
  onClose: () => void
}

const PARTICLE_COUNT = 12

export function LevelUpModal({ level, onClose }: LevelUpModalProps) {
  const { settings } = useGame()
  const showEffects = settings.animationsEnabled

  return (
    <AnimatePresence>
      {level !== null ? (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-night-900/85 p-4 backdrop-blur-sm"
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
            className="relative w-full max-w-sm overflow-hidden rounded-xl2 border border-gold-400/50 bg-gradient-to-b from-night-700 to-night-800 p-6 text-center shadow-glow"
          >
            {/* แสงเรืองด้านหลัง */}
            {showEffects ? (
              <motion.div
                aria-hidden="true"
                className="pointer-events-none absolute left-1/2 top-16 h-48 w-48 -translate-x-1/2 rounded-full bg-gold-400/30 blur-3xl"
                animate={{ opacity: [0.35, 0.7, 0.35], scale: [0.9, 1.1, 0.9] }}
                transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
              />
            ) : null}

            {/* ดาวกระจายรอบตัวเลขเลเวล */}
            {showEffects ? (
              <div aria-hidden="true" className="pointer-events-none absolute inset-0">
                {Array.from({ length: PARTICLE_COUNT }, (_, index) => {
                  const angle = (index / PARTICLE_COUNT) * Math.PI * 2
                  return (
                    <motion.span
                      key={index}
                      className="absolute left-1/2 top-24 text-sm"
                      initial={{ opacity: 0, x: 0, y: 0, scale: 0.5 }}
                      animate={{
                        opacity: [0, 1, 0],
                        x: Math.cos(angle) * 110,
                        y: Math.sin(angle) * 90,
                        scale: [0.5, 1, 0.6],
                      }}
                      transition={{
                        duration: 1.5,
                        delay: 0.15 + (index % 4) * 0.08,
                        repeat: 1,
                        repeatDelay: 0.4,
                      }}
                    >
                      {index % 2 === 0 ? '⭐' : '✨'}
                    </motion.span>
                  )
                })}
              </div>
            ) : null}

            <div className="relative">
              <p className="text-sm font-bold uppercase tracking-[0.3em] text-gold-300">
                ✨ Level Up ✨
              </p>

              <motion.p
                className="mt-3 bg-gradient-to-b from-gold-300 to-gold-600 bg-clip-text text-7xl font-bold text-transparent"
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 240, damping: 14, delay: 0.1 }}
              >
                {level}
              </motion.p>

              <h2 id="level-up-title" className="mt-2 text-2xl font-bold text-white">
                เลเวล {level} แล้ว!
              </h2>
              <p className="mt-1 text-lg text-leaf-400">เก่งขึ้นแล้ว! 🎉</p>
              <p className="mt-2 text-sm text-slate-300">
                เลเวลถัดไปต้องใช้ {getRequiredExp(level).toLocaleString('th-TH')} EXP
              </p>

              <Button
                variant="success"
                size="lg"
                fullWidth
                className="mt-6"
                onClick={onClose}
                autoFocus
              >
                ไปต่อกันเลย!
              </Button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
