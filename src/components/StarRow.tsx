import { MAX_STAGE_STARS } from '../utils/stageSystem'

interface StarRowProps {
  stars: number
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const SIZE_CLASSES = {
  sm: 'text-sm',
  md: 'text-lg',
  lg: 'text-3xl',
} as const

/** แถวดาวของด่าน ดาวที่ยังไม่ได้จะเป็นสีจาง ไม่หายไปเฉย ๆ เด็กจะได้รู้ว่ายังเก็บได้อีก */
export function StarRow({ stars, size = 'md', className = '' }: StarRowProps) {
  const earned = Math.max(0, Math.min(MAX_STAGE_STARS, Math.floor(stars)))

  return (
    <p
      className={`leading-none tracking-tight ${SIZE_CLASSES[size]} ${className}`.trim()}
      aria-label={`ได้ ${earned} ดาว จาก ${MAX_STAGE_STARS} ดาว`}
    >
      <span aria-hidden="true" className="text-gold-300">
        {'★'.repeat(earned)}
      </span>
      <span aria-hidden="true" className="text-night-500">
        {'★'.repeat(MAX_STAGE_STARS - earned)}
      </span>
    </p>
  )
}
