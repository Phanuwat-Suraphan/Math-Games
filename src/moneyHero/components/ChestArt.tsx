import { useId } from 'react'
import type { ChestState } from '../engine/starRoad'

/** หีบสมบัติ: ปิด (รอเปิด) · เปิด (มีแสงและเหรียญเด้ง) · ล็อก (สีจาง มีแม่กุญแจ) */
export function ChestArt({ state, size = 84 }: { state: ChestState; size?: number }) {
  const uid = useId().replace(/:/g, '')
  const wood = `chest-wood-${uid}`
  const ink = '#5c3317'
  const open = state === 'opened'
  return (
    <svg viewBox="0 0 100 92" width={size} height={size * 0.92} className={`mh-chest-art is-${state}`} aria-hidden="true">
      <defs>
        <linearGradient id={wood} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#e8964f" />
          <stop offset="1" stopColor="#a85a24" />
        </linearGradient>
      </defs>
      <ellipse cx="50" cy="86" rx="40" ry="5" fill="#2b2350" opacity="0.16" />
      {open && (
        <g className="mh-chest-glow">
          <path d="M50 44 L22 4 L38 6 Z M50 44 L50 0 L60 2 Z M50 44 L80 6 L90 14 Z" fill="#ffe066" opacity="0.75" />
          <circle cx="50" cy="40" r="16" fill="#fff3bf" opacity="0.9" />
        </g>
      )}
      {/* ตัวหีบ */}
      <rect x="10" y="42" width="80" height="40" rx="8" fill={`url(#${wood})`} stroke={ink} strokeWidth="3" />
      <rect x="22" y="42" width="8" height="40" fill="#ffd43b" stroke={ink} strokeWidth="2" />
      <rect x="70" y="42" width="8" height="40" fill="#ffd43b" stroke={ink} strokeWidth="2" />
      {open && (
        <g className="mh-chest-coins">
          <circle cx="40" cy="40" r="7" fill="#ffd43b" stroke="#e67700" strokeWidth="2" />
          <circle cx="56" cy="36" r="7" fill="#ffd43b" stroke="#e67700" strokeWidth="2" />
          <circle cx="48" cy="30" r="6" fill="#ffe066" stroke="#e67700" strokeWidth="2" />
          <text x="72" y="34" fontSize="13">✨</text>
        </g>
      )}
      {/* ฝาหีบ */}
      {open ? (
        <g transform="rotate(-24 12 40) translate(0 -10)">
          <path d="M10 42 Q10 18 50 16 Q90 18 90 42 Z" fill={`url(#${wood})`} stroke={ink} strokeWidth="3" strokeLinejoin="round" />
          <rect x="22" y="19" width="8" height="23" fill="#ffd43b" stroke={ink} strokeWidth="2" />
          <rect x="70" y="19" width="8" height="23" fill="#ffd43b" stroke={ink} strokeWidth="2" />
        </g>
      ) : (
        <g>
          <path d="M10 44 Q10 18 50 16 Q90 18 90 44 Z" fill={`url(#${wood})`} stroke={ink} strokeWidth="3" strokeLinejoin="round" />
          <rect x="22" y="19" width="8" height="25" fill="#ffd43b" stroke={ink} strokeWidth="2" />
          <rect x="70" y="19" width="8" height="25" fill="#ffd43b" stroke={ink} strokeWidth="2" />
          {/* แผ่นกุญแจ */}
          <rect x="41" y="38" width="18" height="20" rx="4" fill="#ffd43b" stroke={ink} strokeWidth="2.5" />
          <circle cx="50" cy="46" r="3" fill={ink} />
          <path d="M48.5 47 L51.5 47 L52 53 L48 53 Z" fill={ink} />
          <ellipse cx="28" cy="28" rx="10" ry="4" fill="#fff" opacity="0.25" transform="rotate(-12 28 28)" />
        </g>
      )}
      {state === 'locked' && (
        <text x="74" y="88" fontSize="22">
          🔒
        </text>
      )}
    </svg>
  )
}
