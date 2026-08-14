import { GameIcon } from './art/GameArt'
import { MAX_STAGE_STARS } from '../utils/stageSystem'

interface StarRowProps {
  stars: number
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const SIZE_CLASSES = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-9 w-9',
} as const

/** แถวดาวของด่าน ดาวที่ยังไม่ได้จะเป็นโครงร่าง ไม่หายไปเฉย ๆ เด็กจะได้รู้ว่ายังเก็บได้อีก */
export function StarRow({ stars, size = 'md', className = '' }: StarRowProps) {
  const earned = Math.max(0, Math.min(MAX_STAGE_STARS, Math.floor(stars)))

  return (
    <p
      className={`flex items-center gap-0.5 leading-none ${className}`.trim()}
      aria-label={`ได้ ${earned} ดาว จาก ${MAX_STAGE_STARS} ดาว`}
    >
      {Array.from({ length: MAX_STAGE_STARS }, (_, index) => (
        <GameIcon
          key={index}
          name={index < earned ? 'star' : 'starEmpty'}
          size={SIZE_CLASSES[size]}
        />
      ))}
    </p>
  )
}
