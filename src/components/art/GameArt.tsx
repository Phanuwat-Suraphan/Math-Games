import { heroArt, HERO_VIEWBOX } from '../../art/heroes'
import { monsterArt, MONSTER_VIEWBOX } from '../../art/monsters'
import { lockedSceneFilter, SCENE_VIEWBOX, worldScene } from '../../art/scenes'

/**
 * ตัวห่อ SVG ให้ใช้ใน React ได้
 *
 * ภาพทั้งหมดอยู่ใน src/art/ ซึ่งเป็น TypeScript ล้วน ไม่ผูกกับ React
 * จึงเอาไปเรนเดอร์เป็นไฟล์ภาพหรือใช้ที่อื่นได้ด้วย
 *
 * ใช้ dangerouslySetInnerHTML ได้อย่างปลอดภัยเพราะเนื้อหาทั้งหมดเป็น
 * ข้อความคงที่ที่เราเขียนเอง ไม่มีข้อมูลจากผู้ใช้ปนเข้ามาเลย
 */

interface ArtProps {
  className?: string
  /** ข้อความสำหรับโปรแกรมอ่านหน้าจอ ถ้าเป็นภาพประกอบล้วนให้ปล่อยว่าง */
  label?: string
}

interface MonsterArtProps extends ArtProps {
  monsterId: string
  /** สั่นเมื่อโดนโจมตี */
  isHurt?: boolean
}

export function MonsterArt({ monsterId, className, label, isHurt }: MonsterArtProps) {
  return (
    <svg
      viewBox={MONSTER_VIEWBOX}
      className={[className, isHurt ? 'animate-hit' : ''].filter(Boolean).join(' ')}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      dangerouslySetInnerHTML={{ __html: monsterArt(monsterId) }}
    />
  )
}

interface HeroArtProps extends ArtProps {
  avatarId: string
}

export function HeroArt({ avatarId, className, label }: HeroArtProps) {
  return (
    <svg
      viewBox={HERO_VIEWBOX}
      className={className}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      dangerouslySetInnerHTML={{ __html: heroArt(avatarId) }}
    />
  )
}

interface WorldSceneArtProps extends ArtProps {
  worldId: string
  /** โลกที่ยังเล่นไม่ได้จะแสดงแบบหม่น แต่ยังเห็นเค้าโครง */
  isLocked?: boolean
}

export function WorldSceneArt({
  worldId,
  className,
  label,
  isLocked,
}: WorldSceneArtProps) {
  return (
    <svg
      viewBox={SCENE_VIEWBOX}
      preserveAspectRatio="xMidYMid slice"
      className={className}
      style={isLocked ? { filter: lockedSceneFilter() } : undefined}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      dangerouslySetInnerHTML={{ __html: worldScene(worldId) }}
    />
  )
}
