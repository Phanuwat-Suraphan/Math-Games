import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'

interface CoinDisplayProps {
  coins: number
  className?: string
}

/** แสดงจำนวนเหรียญพร้อมอนิเมชัน +N ลอยขึ้นเมื่อได้รับเหรียญเพิ่ม */
export function CoinDisplay({ coins, className = '' }: CoinDisplayProps) {
  const previousRef = useRef(coins)
  const [floaters, setFloaters] = useState<{ id: number; amount: number }[]>([])

  useEffect(() => {
    const diff = coins - previousRef.current
    previousRef.current = coins

    if (diff <= 0) return

    const id = Date.now() + Math.random()
    setFloaters((current) => [...current, { id, amount: diff }])

    const timer = window.setTimeout(() => {
      setFloaters((current) => current.filter((item) => item.id !== id))
    }, 900)

    return () => window.clearTimeout(timer)
  }, [coins])

  return (
    <div className={`relative ${className}`.trim()}>
      <span className="stat-chip text-gold-300">
        <span aria-hidden="true">🪙</span>
        <span className="tabular-nums">{coins.toLocaleString('th-TH')}</span>
        <span className="sr-only">เหรียญ</span>
      </span>

      <AnimatePresence>
        {floaters.map((floater) => (
          <motion.span
            key={floater.id}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: -22 }}
            exit={{ opacity: 0, y: -32 }}
            transition={{ duration: 0.8 }}
            className="pointer-events-none absolute -top-1 right-0 text-sm font-bold text-gold-300"
            aria-hidden="true"
          >
            +{floater.amount}
          </motion.span>
        ))}
      </AnimatePresence>
    </div>
  )
}
