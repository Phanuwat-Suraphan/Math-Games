import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { on } from '../services/eventBus'
import { useGame } from '../context/useGame'

interface Toast {
  id: number
  label: string
  tone: 'exp' | 'coin'
}

const TOAST_DURATION_MS = 1400
const MAX_VISIBLE_TOASTS = 4

/**
 * แสดง +EXP และ +เหรียญ แบบลอยขึ้นมุมจอ
 * ทำงานโดยรับเหตุการณ์จาก event bus จึงไม่ต้องผูกกับหน้าใดหน้าหนึ่ง
 * ปิดได้จากการตั้งค่า "เอฟเฟกต์การเคลื่อนไหว"
 */
export function RewardToastLayer() {
  const { settings } = useGame()
  const [toasts, setToasts] = useState<Toast[]>([])

  useEffect(() => {
    if (!settings.animationsEnabled) {
      setToasts([])
      return
    }

    let counter = 0
    const timers: number[] = []

    const push = (label: string, tone: Toast['tone']) => {
      counter += 1
      const id = Date.now() + counter
      setToasts((current) =>
        [...current, { id, label, tone }].slice(-MAX_VISIBLE_TOASTS),
      )

      const timer = window.setTimeout(() => {
        setToasts((current) => current.filter((toast) => toast.id !== id))
      }, TOAST_DURATION_MS)
      timers.push(timer)
    }

    const unsubscribeExp = on('EXP_GAINED', ({ amount }) => {
      push(`+${amount} EXP`, 'exp')
    })
    const unsubscribeCoin = on('COIN_GAINED', ({ amount }) => {
      push(`+${amount} 🪙`, 'coin')
    })

    return () => {
      unsubscribeExp()
      unsubscribeCoin()
      timers.forEach((timer) => window.clearTimeout(timer))
    }
  }, [settings.animationsEnabled])

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-x-0 top-24 z-40 flex flex-col items-center gap-1.5"
    >
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.span
            key={toast.id}
            initial={{ opacity: 0, y: 12, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.25 }}
            className={`rounded-full border px-4 py-1.5 text-sm font-bold shadow-card backdrop-blur ${
              toast.tone === 'exp'
                ? 'border-arcane-400/50 bg-arcane-600/40 text-white'
                : 'border-gold-400/50 bg-gold-600/40 text-gold-300'
            }`}
          >
            {toast.label}
          </motion.span>
        ))}
      </AnimatePresence>
    </div>
  )
}
