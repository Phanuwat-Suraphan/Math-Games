import type { DenomId, NpcId } from '../engine/types'
import { denom } from '../data/denominations'
import { AVATARS, CHARACTERS, avatarById } from '../data/characters'
import { useImage } from '../hooks/useImage'

/**
 * ภาพตัวละครและเงิน
 * ใช้รูปจริงจาก public/money-hero/ ถ้ามี ไม่งั้นวาดเองด้วย SVG / อีโมจิ
 */

export function CharacterArt({ id, size = 96, className = '' }: { id: NpcId; size?: number; className?: string }) {
  const c = CHARACTERS[id]
  const src = useImage(c.image)
  return (
    <div className={`mh-char ${className}`} style={{ width: size, height: size * 1.25 }} aria-label={c.name} role="img">
      {src ? (
        <img src={src} alt="" className="mh-char-img" draggable={false} />
      ) : (
        <div className="mh-char-fallback" style={{ background: c.tint, fontSize: size * 0.55 }}>
          {c.emoji}
        </div>
      )}
    </div>
  )
}

export function AvatarArt({ avatar, size = 80, className = '' }: { avatar: string; size?: number; className?: string }) {
  const a = avatarById(avatar)
  const src = useImage(a.image)
  return (
    <div className={`mh-char ${className}`} style={{ width: size, height: size * 1.25 }} aria-label={a.name} role="img">
      {src ? (
        <img src={src} alt="" className="mh-char-img" draggable={false} />
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

function CoinSvg({ id }: { id: DenomId }) {
  const d = denom(id)
  const gid = `g-${id}`
  const bimetal = id === 'b10'
  return (
    <svg viewBox="0 0 100 100" className="mh-money-svg" aria-hidden="true">
      <defs>
        <radialGradient id={gid} cx="35%" cy="30%" r="75%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.85" />
          <stop offset="35%" stopColor={d.color} />
          <stop offset="100%" stopColor={d.edge} />
        </radialGradient>
      </defs>
      <circle cx="50" cy="52" r="46" fill="rgba(0,0,0,0.18)" />
      <circle cx="50" cy="50" r="46" fill={bimetal ? d.edge : d.edge} />
      <circle cx="50" cy="50" r={bimetal ? 34 : 41} fill={`url(#${gid})`} />
      <circle cx="50" cy="50" r={bimetal ? 30 : 36} fill="none" stroke={d.ink} strokeOpacity="0.25" strokeWidth="1.5" />
      <text x="50" y={d.unit === 'สตางค์' ? 52 : 56} textAnchor="middle" fontSize={d.face.length > 1 ? 30 : 38} fontWeight="700" fill={d.ink} fontFamily="Mitr, Kanit, sans-serif">
        {d.face}
      </text>
      <text x="50" y={d.unit === 'สตางค์' ? 70 : 74} textAnchor="middle" fontSize={d.unit === 'สตางค์' ? 11 : 12} fill={d.ink} fontFamily="Kanit, sans-serif">
        {d.unit}
      </text>
    </svg>
  )
}

function NoteSvg({ id }: { id: DenomId }) {
  const d = denom(id)
  return (
    <svg viewBox="0 0 200 100" className="mh-money-svg" aria-hidden="true">
      <rect x="2" y="4" width="196" height="94" rx="10" fill="rgba(0,0,0,0.15)" />
      <rect x="0" y="0" width="196" height="94" rx="10" fill={d.color} />
      <rect x="7" y="7" width="182" height="80" rx="7" fill="none" stroke={d.edge} strokeWidth="3" />
      <circle cx="52" cy="47" r="26" fill="#ffffff" fillOpacity="0.35" stroke={d.edge} strokeWidth="2" />
      <text x="52" y="55" textAnchor="middle" fontSize="24" fill={d.ink}>
        🐘
      </text>
      <text x="138" y="56" textAnchor="middle" fontSize={d.face.length > 3 ? 32 : 38} fontWeight="700" fill={d.ink} fontFamily="Mitr, Kanit, sans-serif">
        {d.face}
      </text>
      <text x="138" y="78" textAnchor="middle" fontSize="13" fill={d.ink} fontFamily="Kanit, sans-serif">
        บาท
      </text>
      <text x="20" y="24" fontSize="12" fontWeight="700" fill={d.ink} fontFamily="Mitr, sans-serif">
        {d.face}
      </text>
    </svg>
  )
}

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
