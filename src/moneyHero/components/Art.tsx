import type { DenomId, NpcId } from '../engine/types'
import { denom } from '../data/denominations'
import { AVATARS, CHARACTERS, avatarById } from '../data/characters'
import { useImage } from '../hooks/useImage'
import { CharacterSvg, isDrawn, type CharacterKind, type Mood } from './CharacterSvg'
import { CoinSvg, NoteSvg } from './MoneyArt'

/**
 * ภาพตัวละครและเงิน
 * ใช้รูปจริงจาก public/money-hero/ ถ้ามี ไม่งั้นใช้ภาพวาด SVG (components/CharacterSvg.tsx)
 */

/** วงกลมรูปหน้า (ใช้ในแถบบน กล่องคำพูด รายชื่อผู้เล่น) */
function Portrait({ kind, size, tint, src, className, label }: { kind: CharacterKind | null; size: number; tint: string; src: string | null; className: string; label: string }) {
  return (
    <div className={`mh-portrait ${className}`} style={{ width: size, height: size, background: tint }} aria-label={label} role="img">
      {src ? <img src={src} alt="" className="mh-portrait-img" draggable={false} /> : kind ? <CharacterSvg kind={kind} portrait /> : null}
    </div>
  )
}

export function CharacterArt({
  id,
  size = 96,
  className = '',
  portrait = false,
  mood = 'normal',
}: {
  id: NpcId
  size?: number
  className?: string
  portrait?: boolean
  mood?: Mood
}) {
  const c = CHARACTERS[id]
  const src = useImage(c.image)
  if (portrait) return <Portrait kind={id} size={size} tint={c.tint} src={src} className={className} label={c.name} />
  return (
    <div className={`mh-char ${className}`} style={{ width: size, height: size * 1.25 }} aria-label={c.name} role="img">
      {src ? <img src={src} alt="" className="mh-char-img" draggable={false} /> : <CharacterSvg kind={id} mood={mood} />}
    </div>
  )
}

export function AvatarArt({
  avatar,
  size = 80,
  className = '',
  portrait = false,
  mood = 'normal',
}: {
  avatar: string
  size?: number
  className?: string
  portrait?: boolean
  mood?: Mood
}) {
  const a = avatarById(avatar)
  const src = useImage(a.image)
  const kind = isDrawn(a.id) ? a.id : null
  if (portrait) return <Portrait kind={kind} size={size} tint="linear-gradient(180deg,#fff3c4,#ffd36b)" src={src} className={className} label={a.name} />
  return (
    <div className={`mh-char ${className}`} style={{ width: size, height: size * 1.25 }} aria-label={a.name} role="img">
      {src ? (
        <img src={src} alt="" className="mh-char-img" draggable={false} />
      ) : kind ? (
        <CharacterSvg kind={kind} mood={mood} />
      ) : (
        <div className="mh-char-fallback mh-avatar-fallback" style={{ fontSize: size * 0.58 }}>
          {a.emoji}
        </div>
      )}
    </div>
  )
}

export { AVATARS }

/* ------------------------------------------------------------------ */
/* เงิน                                                                */
/* ------------------------------------------------------------------ */

/** ขนาดฐาน: เหรียญ 10 บาท = base px ธนบัตร = base × 2 กว้าง */
export function MoneyPiece({ id, base = 64, className = '', showLabel = false }: { id: DenomId; base?: number; className?: string; showLabel?: boolean }) {
  const d = denom(id)
  const src = useImage(`money/${id}.png`)
  const isCoin = d.kind === 'coin'
  const w = isCoin ? Math.round(base * (0.62 + (0.38 * d.size) / 26)) : Math.round(base * 1.9)
  const h = isCoin ? w : Math.round(base * 0.95)
  return (
    <span className={`mh-money ${isCoin ? 'mh-coin' : 'mh-note'} ${className}`} style={{ width: w, height: h }} title={d.name}>
      {src ? <img src={src} alt={d.name} className="mh-money-img" draggable={false} /> : isCoin ? <CoinSvg id={id} /> : <NoteSvg id={id} />}
      {showLabel && <span className="mh-money-label">{d.name}</span>}
      <span className="mh-sr">{d.name}</span>
    </span>
  )
}

/** กองเงิน แสดงทีละชิ้น ให้เด็กนับได้จริง */
export function MoneyPile({ items, base = 56, className = '' }: { items: DenomId[]; base?: number; className?: string }) {
  return (
    <div className={`mh-pile ${className}`}>
      {items.map((id, i) => (
        <MoneyPiece key={`${id}-${i}`} id={id} base={base} />
      ))}
    </div>
  )
}
