import { useId } from 'react'

/**
 * กระปุกหมูออมสิน วาดด้วย SVG: ตัวกลมสีชมพู หูตั้ง จมูกดุ๊กดิก หางขด
 * มีหน้าต่างใส ๆ ที่ท้อง เห็นเหรียญข้างในสูงขึ้นตาม fill (0–1)
 * happy = ตายิ้มปิด (ตอนเพิ่งได้เหรียญ / เก็บครบเป้า)
 */
export function PiggyBank({ fill = 0, happy = false, className = '' }: { fill?: number; happy?: boolean; className?: string }) {
  const uid = useId().replace(/:/g, '')
  const body = `pg-body-${uid}`
  const snout = `pg-snout-${uid}`
  const glass = `pg-glass-${uid}`
  const clip = `pg-clip-${uid}`
  const gold = `pg-gold-${uid}`
  const f = Math.max(0, Math.min(1, fill))
  // หน้าต่างกลมรัศมี 25 ที่ (82, 104): ระดับเหรียญจากก้น (129) ขึ้นไป
  const level = 129 - 50 * f

  return (
    <svg viewBox="0 0 200 170" className={`mh-piggy ${className}`} role="img" aria-label="กระปุกหมูออมสิน">
      <defs>
        <radialGradient id={body} cx="0.42" cy="0.32" r="0.75">
          <stop offset="0" stopColor="#ffe1ec" />
          <stop offset="0.45" stopColor="#ffa7c4" />
          <stop offset="1" stopColor="#e9628f" />
        </radialGradient>
        <radialGradient id={snout} cx="0.4" cy="0.35" r="0.8">
          <stop offset="0" stopColor="#ffc6d8" />
          <stop offset="1" stopColor="#f07ca2" />
        </radialGradient>
        <radialGradient id={glass} cx="0.35" cy="0.3" r="0.8">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.85" />
          <stop offset="1" stopColor="#ffd9e6" stopOpacity="0.35" />
        </radialGradient>
        <linearGradient id={gold} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffe680" />
          <stop offset="1" stopColor="#f2b21b" />
        </linearGradient>
        <clipPath id={clip}>
          <circle cx="82" cy="104" r="25" />
        </clipPath>
      </defs>

      <ellipse cx="100" cy="161" rx="66" ry="7" fill="#000" opacity="0.12" />

      {/* ขา (อยู่หลังตัว โผล่ออกมาเป็นตอสั้น ๆ) ขาหลังเข้มกว่า */}
      <rect x="50" y="122" width="20" height="34" rx="9" fill="#d9557f" />
      <rect x="128" y="122" width="20" height="34" rx="9" fill="#d9557f" />
      <rect x="68" y="124" width="22" height="36" rx="9" fill="#f07ca2" stroke="#c94477" strokeWidth="2.5" />
      <rect x="110" y="124" width="22" height="36" rx="9" fill="#f07ca2" stroke="#c94477" strokeWidth="2.5" />
      <path d="M72 155 h14 M114 155 h14" stroke="#c94477" strokeWidth="2.5" strokeLinecap="round" />

      {/* หางขด */}
      <path className="mh-piggy-tail" d="M30 92 c-12 -4 -16 8 -8 12 c8 4 12 -8 2 -10 c-6 -1 -10 4 -8 8" fill="none" stroke="#e9628f" strokeWidth="4.5" strokeLinecap="round" />

      {/* ตัว */}
      <ellipse cx="100" cy="96" rx="72" ry="52" fill={`url(#${body})`} stroke="#c94477" strokeWidth="3" />
      <ellipse cx="78" cy="66" rx="30" ry="12" fill="#fff" opacity="0.4" transform="rotate(-14 78 66)" />

      {/* ช่องหยอดเหรียญ */}
      <rect x="84" y="44" width="34" height="8" rx="4" fill="#7a2446" transform="rotate(-4 101 48)" />
      <path d="M88 44.5 h22" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" opacity="0.5" transform="rotate(-4 101 48)" />

      {/* หู */}
      <path className="mh-piggy-ear" d="M128 56 L134 24 L154 50 Z" fill="#f07ca2" stroke="#c94477" strokeWidth="3" strokeLinejoin="round" />
      <path d="M135 48 L137 33 L147 47 Z" fill="#ffc6d8" />
      <path className="mh-piggy-ear mh-piggy-ear-2" d="M150 62 L166 34 L176 66 Z" fill="#f07ca2" stroke="#c94477" strokeWidth="3" strokeLinejoin="round" />
      <path d="M158 60 L165 45 L170 62 Z" fill="#ffc6d8" />

      {/* หน้าต่างท้อง: เห็นเหรียญข้างใน */}
      <circle cx="82" cy="104" r="25" fill="#fff4f8" />
      <g clipPath={`url(#${clip})`}>
        <rect x="55" y={level} width="54" height="60" fill={`url(#${gold})`} />
        {/* เหรียญซ้อนกันเป็นชั้น ๆ จากก้นถึงระดับปัจจุบัน */}
        {f > 0 &&
          Array.from({ length: Math.floor((129 - level) / 8) + 1 }, (_, row) => level + 1 + row * 8).map((y, row) =>
            [0, 1, 2, 3, 4, 5].map((i) => (
              <ellipse key={`${row}-${i}`} cx={57 + i * 10 + (row % 2) * 5} cy={y} rx="6" ry="3" fill="#ffe680" stroke="#d99a0b" strokeWidth="1.2" />
            )),
          )}
      </g>
      <circle cx="82" cy="104" r="25" fill={`url(#${glass})`} stroke="#c94477" strokeWidth="3" />
      <path d="M68 94 a16 16 0 0 1 10 -9" stroke="#fff" strokeWidth="4" strokeLinecap="round" fill="none" opacity="0.85" />

      {/* ตา */}
      {happy ? (
        <g stroke="#3b1a2a" strokeWidth="3.5" strokeLinecap="round" fill="none">
          <path d="M128 84 q6 -7 12 0" />
          <path d="M152 82 q6 -7 12 0" />
        </g>
      ) : (
        <g className="mh-piggy-eyes">
          <ellipse cx="134" cy="83" rx="5.5" ry="7" fill="#3b1a2a" />
          <ellipse cx="158" cy="81" rx="5.5" ry="7" fill="#3b1a2a" />
          <circle cx="136" cy="80" r="2" fill="#fff" />
          <circle cx="160" cy="78" r="2" fill="#fff" />
        </g>
      )}

      {/* แก้มแดง */}
      <ellipse cx="124" cy="100" rx="9" ry="5.5" fill="#ff6f96" opacity="0.55" />
      <ellipse cx="170" cy="96" rx="7" ry="5" fill="#ff6f96" opacity="0.55" />

      {/* จมูก */}
      <g className="mh-piggy-snout">
        <ellipse cx="160" cy="104" rx="19" ry="14" fill={`url(#${snout})`} stroke="#c94477" strokeWidth="3" />
        <ellipse cx="153" cy="104" rx="3.6" ry="5" fill="#a83463" />
        <ellipse cx="167" cy="104" rx="3.6" ry="5" fill="#a83463" />
      </g>

      {/* ปากยิ้ม */}
      <path d="M138 118 q8 7 16 1" stroke="#7a2446" strokeWidth="3" strokeLinecap="round" fill="none" />
    </svg>
  )
}
