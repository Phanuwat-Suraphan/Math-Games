import { hasHeroArt } from '../art/heroes'
import { HeroArt } from './art/GameArt'
import type { Avatar, AvatarAccent } from '../types/player'

const ACCENT_CLASSES: Record<AvatarAccent, string> = {
  ember: 'from-ember-400 to-ember-600 ring-ember-400',
  arcane: 'from-arcane-400 to-arcane-600 ring-arcane-400',
  leaf: 'from-leaf-400 to-leaf-600 ring-leaf-400',
  gold: 'from-gold-300 to-gold-600 ring-gold-300',
  sky: 'from-sky-400 to-sky-600 ring-sky-400',
  rose: 'from-pink-400 to-rose-600 ring-pink-400',
}

const SIZE_CLASSES = {
  sm: 'h-12 w-12 text-2xl',
  md: 'h-16 w-16 text-3xl',
  lg: 'h-24 w-24 text-5xl',
} as const

interface AvatarBadgeProps {
  avatar: Avatar
  size?: keyof typeof SIZE_CLASSES
  className?: string
}

export function AvatarBadge({
  avatar,
  size = 'md',
  className = '',
}: AvatarBadgeProps) {
  return (
    <div
      className={[
        'flex shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ring-2 ring-offset-2 ring-offset-night-800',
        ACCENT_CLASSES[avatar.accent],
        SIZE_CLASSES[size],
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      role="img"
      aria-label={`ตัวละคร ${avatar.name}`}
    >
      {/* มีภาพวาดก็ใช้ภาพ ตัวไหนยังไม่มีภาพก็ยังใช้อีโมจิได้เหมือนเดิม */}
      {hasHeroArt(avatar.id) ? (
        <HeroArt avatarId={avatar.id} className="h-full w-full p-0.5" />
      ) : (
        <span aria-hidden="true">{avatar.emoji}</span>
      )}
    </div>
  )
}
