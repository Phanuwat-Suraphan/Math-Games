import type { ReactNode } from 'react'
import { motion } from 'framer-motion'

interface ScreenLayoutProps {
  children: ReactNode
  /** ความกว้างสูงสุดของเนื้อหา ใช้ให้เหมาะกับแต่ละหน้า */
  width?: 'narrow' | 'normal' | 'wide'
  className?: string
}

const WIDTH_CLASSES = {
  narrow: 'max-w-xl',
  normal: 'max-w-3xl',
  wide: 'max-w-5xl',
} as const

export function ScreenLayout({
  children,
  width = 'normal',
  className = '',
}: ScreenLayoutProps) {
  return (
    <motion.main
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={[
        'mx-auto w-full px-4 py-6 sm:px-6 sm:py-8',
        WIDTH_CLASSES[width],
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </motion.main>
  )
}
