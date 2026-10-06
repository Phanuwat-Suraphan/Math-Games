import { useId, type ReactNode } from 'react'

/**
 * ตัวละครวาดด้วย SVG สไตล์การ์ตูนตัวกลม (chibi) มีแสงเงาแบบสามมิติ
 *
 * ใช้แทนรูป PNG เมื่อยังไม่ได้ใส่ไฟล์ใน public/money-hero/characters/
 * ทุกตัวใช้กรอบ 100 × 125 เท้าแตะพื้นที่ y ≈ 120 จึงวางเรียงกันได้พอดี
 *
 * ชิ้นส่วนมีชื่อคลาส (ขา แขน ลำตัว ตา) ให้ CSS ทำท่าเดิน กะพริบตา และหายใจได้
 */

export type CharacterKind = 'hero' | 'rabbit' | 'fox' | 'bear' | 'owl' | 'adventurer' | 'calculator' | 'wizard'

export const DRAWN_CHARACTERS: CharacterKind[] = ['hero', 'rabbit', 'fox', 'bear', 'owl', 'adventurer', 'calculator', 'wizard']

const INK = '#2b2350'

/** id ของ gradient ต้องไม่ซ้ำกันในหน้า จึงต่อท้ายด้วย useId */
function useIds() {
  const base = useId().replace(/[^a-zA-Z0-9]/g, '')
  return (name: string) => `cs${base}${name}`
}

function Shadow() {
  return <ellipse className="mh-cs-shadow" cx="50" cy="121" rx="24" ry="4.5" fill="#2b2350" opacity="0.18" />
}

function Eyes({ y = 46, gap = 9, rx = 4.2, ry = 5.4, color = INK }: { y?: number; gap?: number; rx?: number; ry?: number; color?: string }) {
  return (
    <g className="mh-cs-eyes">
      {[50 - gap, 50 + gap].map((x) => (
        <g key={x}>
          <ellipse cx={x} cy={y} rx={rx} ry={ry} fill={color} />
          <circle cx={x + rx * 0.3} cy={y - ry * 0.38} r={rx * 0.42} fill="#fff" />
          <circle cx={x - rx * 0.35} cy={y + ry * 0.38} r={rx * 0.2} fill="#fff" opacity="0.85" />
        </g>
      ))}
    </g>
  )
}

function Cheeks({ y = 54, gap = 15, color = '#ff8fa3' }: { y?: number; gap?: number; color?: string }) {
  return (
    <g opacity="0.55">
      <ellipse cx={50 - gap} cy={y} rx="4.6" ry="2.7" fill={color} />
      <ellipse cx={50 + gap} cy={y} rx="4.6" ry="2.7" fill={color} />
    </g>
  )
}

function Smile({ y = 55, w = 5, open = true }: { y?: number; w?: number; open?: boolean }) {
  return open ? (
    <path d={`M${50 - w} ${y} Q50 ${y + w * 1.5} ${50 + w} ${y} Z`} fill="#b8433f" stroke="#7a2e2a" strokeWidth="1.2" strokeLinejoin="round" />
  ) : (
    <path d={`M${50 - w} ${y} Q50 ${y + w} ${50 + w} ${y}`} fill="none" stroke="#7a3b2a" strokeWidth="2" strokeLinecap="round" />
  )
}

/** เหรียญทองเล็ก ๆ ที่ตัวละครถือ */
function Coin({ x, y, r = 7 }: { x: number; y: number; r?: number }) {
  return (
    <g>
      <circle cx={x} cy={y + 0.8} r={r} fill="#b97900" />
      <circle cx={x} cy={y} r={r} fill="#ffd23f" stroke="#d49400" strokeWidth="1.4" />
      <circle cx={x - r * 0.3} cy={y - r * 0.35} r={r * 0.28} fill="#fff6c4" opacity="0.9" />
      <text x={x} y={y + r * 0.42} textAnchor="middle" fontSize={r * 1.15} fontWeight="700" fill="#8a5a00" fontFamily="Kanit, sans-serif">
        ฿
      </text>
    </g>
  )
}

/* ------------------------------------------------------------------ */
/* เด็ก (ฮีโร่ และตัวเลือกของผู้เล่น)                                  */
/* ------------------------------------------------------------------ */

interface KidLook {
  shirt: [string, string]
  pants: string
  shoes: string
  hair: string
  /** ชิ้นที่วาดหลังลำตัว (ผ้าคลุม กระเป๋า หางม้า) */
  back?: ReactNode
  /** ทรงผม (วาดทับหัว) */
  hairTop: ReactNode
  /** ของบนลำตัว (ตราเหรียญ สายกระเป๋า) */
  chest?: ReactNode
  /** ของในมือขวา */
  hand?: ReactNode
  /** หมวก (วาดทับผม) */
  hat?: ReactNode
  glove?: string
  skirt?: boolean
}

function Kid({ look, gid }: { look: KidLook; gid: (n: string) => string }) {
  const skin = gid('skin')
  const shirt = gid('shirt')
  return (
    <>
      <defs>
        <radialGradient id={skin} cx="42%" cy="35%" r="70%">
          <stop offset="0%" stopColor="#ffe9d2" />
          <stop offset="70%" stopColor="#ffd0a6" />
          <stop offset="100%" stopColor="#efb183" />
        </radialGradient>
        <linearGradient id={shirt} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={look.shirt[0]} />
          <stop offset="100%" stopColor={look.shirt[1]} />
        </linearGradient>
      </defs>
      <Shadow />
      {/* ของด้านหลัง (ผ้าคลุม กระเป๋า ผม) อยู่หลังขา แต่ขยับไปกับลำตัว */}
      {look.back && <g className="mh-cs-body">{look.back}</g>}
      <g className="mh-cs-leg mh-cs-leg-l">
        <rect x="38" y="94" width="10" height="21" rx="4.5" fill={look.pants} />
        <ellipse cx="42" cy="116.5" rx="7.5" ry="4.6" fill={look.shoes} />
        <ellipse cx="40.5" cy="114.8" rx="3" ry="1.4" fill="#fff" opacity="0.35" />
      </g>
      <g className="mh-cs-leg mh-cs-leg-r">
        <rect x="52" y="94" width="10" height="21" rx="4.5" fill={look.pants} />
        <ellipse cx="58" cy="116.5" rx="7.5" ry="4.6" fill={look.shoes} />
        <ellipse cx="56.5" cy="114.8" rx="3" ry="1.4" fill="#fff" opacity="0.35" />
      </g>
      <g className="mh-cs-body">
        <g className="mh-cs-arm mh-cs-arm-l">
          <path d="M36 70 Q28 78 27 90" stroke={look.shirt[1]} strokeWidth="9" strokeLinecap="round" fill="none" />
          <circle cx="27" cy="91" r="5" fill={look.glove ?? `url(#${skin})`} />
        </g>
        <g className="mh-cs-arm mh-cs-arm-r">
          <path d="M64 70 Q72 78 73 90" stroke={look.shirt[1]} strokeWidth="9" strokeLinecap="round" fill="none" />
          <circle cx="73" cy="91" r="5" fill={look.glove ?? `url(#${skin})`} />
          {look.hand}
        </g>
        {look.skirt ? (
          <path d="M35 66 Q50 61 65 66 L70 100 Q50 106 30 100 Z" fill={`url(#${shirt})`} />
        ) : (
          <rect x="34" y="64" width="32" height="35" rx="12" fill={`url(#${shirt})`} />
        )}
        <path d="M38 68 Q44 66 46 74" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" fill="none" opacity="0.3" />
        {look.chest}
        {/* คอ */}
        <rect x="45" y="60" width="10" height="7" rx="3" fill="#efb183" />
        {/* หู */}
        <circle cx="24.5" cy="46" r="5.2" fill="#f6bf92" />
        <circle cx="75.5" cy="46" r="5.2" fill="#f6bf92" />
        {/* หัว */}
        <ellipse cx="50" cy="42" rx="26" ry="24.5" fill={`url(#${skin})`} />
        <Eyes y={46} gap={9.5} />
        <path d="M37 37 Q41 34.5 45 36.5 M55 36.5 Q59 34.5 63 37" stroke={look.hair} strokeWidth="2" strokeLinecap="round" fill="none" />
        <Cheeks y={54} gap={16} />
        <Smile y={54} w={5} />
        {look.hairTop}
        {look.hat}
      </g>
    </>
  )
}

function HeroArt({ gid }: { gid: (n: string) => string }) {
  const cape = gid('cape')
  return (
    <Kid
      gid={gid}
      look={{
        shirt: ['#5b97ff', '#2f5fd0'],
        pants: '#2a4fb0',
        shoes: '#e2574c',
        hair: '#5a3418',
        glove: '#ffffff',
        back: (
          <>
            <defs>
              <linearGradient id={cape} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ffd84a" />
                <stop offset="100%" stopColor="#f08a1c" />
              </linearGradient>
            </defs>
            <path className="mh-cs-cape" d="M37 64 L63 64 L77 111 Q63 106 50 112 Q37 106 23 111 Z" fill={`url(#${cape})`} stroke="#d0730f" strokeWidth="1.5" strokeLinejoin="round" />
          </>
        ),
        chest: (
          <>
            <rect x="34" y="88" width="32" height="5" fill="#ffd23f" />
            <rect x="46.5" y="87.2" width="7" height="6.6" rx="1.5" fill="#e0a400" />
            <Coin x={50} y={76} r={7.2} />
            <path d="M40 64 L50 72 L60 64" fill="#ffd23f" stroke="#d0730f" strokeWidth="1.2" strokeLinejoin="round" />
          </>
        ),
        hairTop: (
          <g fill="#6b3e1d">
            <path d="M23.5 46 C21 26 35 15.5 50 15.5 C66 15.5 80 26 76.5 46 C73 37 66 31.5 57 30.5 L52 37 L49 30.4 C38 30.6 28 35.5 23.5 46 Z" />
            <path d="M33 22 L27 9 L42 16.5 Z" />
            <path d="M45 17 L49 3.5 L57 16 Z" />
            <path d="M60 18 L72 8 L70 24 Z" />
            <path d="M33 24 Q42 18 50 19" stroke="#8a5530" strokeWidth="2.4" strokeLinecap="round" fill="none" />
          </g>
        ),
        hat: <path d="M28 33.5 Q50 25 72 33.5 L71.5 36.5 Q50 29 28.5 36.5 Z" fill="#e2574c" />,
      }}
    />
  )
}

function AdventurerArt({ gid }: { gid: (n: string) => string }) {
  return (
    <Kid
      gid={gid}
      look={{
        shirt: ['#5fc173', '#2f9150'],
        pants: '#b98c55',
        shoes: '#6b4426',
        hair: '#3b2414',
        back: <rect x="30" y="66" width="40" height="30" rx="9" fill="#d97b2f" stroke="#a65516" strokeWidth="1.5" />,
        chest: (
          <>
            <path d="M39 65 L42 98 M61 65 L58 98" stroke="#7a4a26" strokeWidth="3.4" strokeLinecap="round" />
            <circle cx="42" cy="78" r="2" fill="#ffd23f" />
          </>
        ),
        hairTop: <path d="M24 46 C22 30 34 22 50 22 C66 22 78 30 76 46 C71 39 63 35 50 35 C38 35 29 39 24 46 Z" fill="#4a2d18" />,
        hat: (
          <g>
            <ellipse cx="50" cy="29" rx="34" ry="7" fill="#c9a160" />
            <path d="M31 29 C31 12 69 12 69 29 Z" fill="#d9b574" />
            <rect x="31" y="23.5" width="38" height="5" fill="#8a5a33" />
            <ellipse cx="44" cy="17" rx="6" ry="3" fill="#fff" opacity="0.25" />
          </g>
        ),
        hand: <Coin x={74} y={90} r={5.5} />,
      }}
    />
  )
}

function CalculatorArt({ gid }: { gid: (n: string) => string }) {
  return (
    <Kid
      gid={gid}
      look={{
        shirt: ['#ff8fb8', '#e8508a'],
        pants: '#f2a7c3',
        shoes: '#8b5cf6',
        hair: '#2b1a10',
        skirt: true,
        back: (
          <g fill="#3a2414">
            <ellipse cx="19" cy="48" rx="7" ry="13" />
            <ellipse cx="81" cy="48" rx="7" ry="13" />
          </g>
        ),
        chest: <path d="M42 66 L50 73 L58 66" fill="#fff" stroke="#e8508a" strokeWidth="1.2" />,
        hairTop: (
          <g>
            <path d="M23.5 47 C20 25 35 16 50 16 C65 16 80 25 76.5 47 C74 38 67 31 59 29 C52 34 40 35 30 34 C27 38 25 42 23.5 47 Z" fill="#3a2414" />
            <circle cx="24" cy="35" r="4" fill="#ffd23f" stroke="#e0a400" strokeWidth="1" />
            <circle cx="76" cy="35" r="4" fill="#ffd23f" stroke="#e0a400" strokeWidth="1" />
            <path d="M40 22 Q48 18 56 20" stroke="#5a3a24" strokeWidth="2.4" strokeLinecap="round" fill="none" />
          </g>
        ),
        hand: (
          <g>
            <rect x="68" y="80" width="16" height="20" rx="3" fill="#4b4f59" stroke="#2f323a" strokeWidth="1" />
            <rect x="70.5" y="82.5" width="11" height="5" rx="1" fill="#bfe8c8" />
            {[0, 1, 2].map((r) =>
              [0, 1, 2].map((c) => <rect key={`${r}${c}`} x={70.5 + c * 4} y={89.5 + r * 3.4} width="3" height="2.4" rx="0.6" fill={c === 2 && r === 2 ? '#ff9a3c' : '#e8e8ef'} />),
            )}
          </g>
        ),
      }}
    />
  )
}

function WizardArt({ gid }: { gid: (n: string) => string }) {
  const hat = gid('hat')
  return (
    <Kid
      gid={gid}
      look={{
        shirt: ['#9b6cf0', '#6a3dd6'],
        pants: '#4b2fa0',
        shoes: '#3a2470',
        hair: '#d9d2c6',
        skirt: true,
        chest: (
          <>
            <path d="M50 66 L50 100" stroke="#ffd23f" strokeWidth="2" />
            <Coin x={50} y={80} r={5} />
          </>
        ),
        hairTop: <path d="M24 47 C22 36 30 30 40 32 L60 32 C70 30 78 36 76 47 C72 41 64 38 50 38 C36 38 28 41 24 47 Z" fill="#f2ead8" />,
        hat: (
          <g>
            <defs>
              <linearGradient id={hat} x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#8b5cf6" />
                <stop offset="100%" stopColor="#4b2fa0" />
              </linearGradient>
            </defs>
            <path d="M30 33 L58 -2 Q62 6 70 33 Z" fill={`url(#${hat})`} />
            <ellipse cx="50" cy="33" rx="29" ry="6" fill="#5a3bc0" />
            <path d="M44 14 l1.6 3.4 3.6.4 -2.7 2.4 .8 3.6 -3.3-1.9 -3.2 1.9 .8-3.6 -2.7-2.4 3.6-.4 Z" fill="#ffd23f" />
            <circle cx="58" cy="24" r="1.8" fill="#ffd23f" />
          </g>
        ),
        hand: (
          <g>
            <path d="M73 92 L80 70" stroke="#8a5a33" strokeWidth="2.6" strokeLinecap="round" />
            <path d="M80 62 l2 4.4 4.7.5 -3.5 3.1 1 4.6 -4.2-2.4 -4.2 2.4 1-4.6 -3.5-3.1 4.7-.5 Z" fill="#ffd23f" stroke="#e0a400" strokeWidth="0.8" />
          </g>
        ),
      }}
    />
  )
}

/* ------------------------------------------------------------------ */
/* เพื่อนสัตว์ในเมือง                                                  */
/* ------------------------------------------------------------------ */

function RabbitArt({ gid }: { gid: (n: string) => string }) {
  const fur = gid('fur')
  return (
    <>
      <defs>
        <radialGradient id={fur} cx="40%" cy="30%" r="75%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="75%" stopColor="#f6eef3" />
          <stop offset="100%" stopColor="#dccbd6" />
        </radialGradient>
      </defs>
      <Shadow />
      <g className="mh-cs-leg mh-cs-leg-l">
        <ellipse cx="40" cy="115" rx="9.5" ry="5.5" fill={`url(#${fur})`} stroke="#dccbd6" strokeWidth="1" />
      </g>
      <g className="mh-cs-leg mh-cs-leg-r">
        <ellipse cx="60" cy="115" rx="9.5" ry="5.5" fill={`url(#${fur})`} stroke="#dccbd6" strokeWidth="1" />
      </g>
      <g className="mh-cs-body">
        <ellipse cx="50" cy="91" rx="20" ry="21" fill={`url(#${fur})`} />
        {/* เอี๊ยมสีชมพู */}
        <path d="M32 92 Q50 86 68 92 L66 106 Q50 114 34 106 Z" fill="#ff7fab" />
        <path d="M38 91 L36 74 M62 91 L64 74" stroke="#ff7fab" strokeWidth="3.4" strokeLinecap="round" />
        <rect x="44" y="94" width="12" height="8" rx="2.5" fill="#ffb3cc" />
        <g className="mh-cs-arm mh-cs-arm-l">
          <ellipse cx="30" cy="88" rx="5.5" ry="9" fill={`url(#${fur})`} transform="rotate(18 30 88)" />
        </g>
        <g className="mh-cs-arm mh-cs-arm-r">
          <ellipse cx="70" cy="86" rx="5.5" ry="9" fill={`url(#${fur})`} transform="rotate(-25 70 86)" />
          <Coin x={74} y={80} r={7.5} />
        </g>
        {/* หู */}
        <g className="mh-cs-ears">
          <ellipse cx="38" cy="18" rx="7.5" ry="19" fill={`url(#${fur})`} transform="rotate(-12 38 34)" />
          <ellipse cx="38" cy="19" rx="3.6" ry="13" fill="#ffb3c7" transform="rotate(-12 38 34)" />
          <ellipse cx="63" cy="20" rx="7.5" ry="18" fill={`url(#${fur})`} transform="rotate(24 62 36)" />
          <ellipse cx="63" cy="21" rx="3.6" ry="12" fill="#ffb3c7" transform="rotate(24 62 36)" />
        </g>
        <ellipse cx="50" cy="50" rx="25" ry="22" fill={`url(#${fur})`} />
        <Eyes y={49} gap={10} rx={4} ry={5.2} />
        <Cheeks y={57} gap={15} color="#ff7f9f" />
        <path d="M47.5 56 L52.5 56 L50 59 Z" fill="#ff7f9f" />
        <path d="M45 61 Q47.5 63.5 50 60 Q52.5 63.5 55 61" fill="none" stroke="#7a3b4a" strokeWidth="1.5" strokeLinecap="round" />
        <rect x="48.4" y="60.6" width="3.2" height="3.6" rx="0.8" fill="#fff" stroke="#d8c8cf" strokeWidth="0.5" />
        <path d="M30 58 L22 56 M30 61 L22 62 M70 58 L78 56 M70 61 L78 62" stroke="#cdb7c3" strokeWidth="1" strokeLinecap="round" />
      </g>
    </>
  )
}

function FoxArt({ gid }: { gid: (n: string) => string }) {
  const fur = gid('fur')
  return (
    <>
      <defs>
        <linearGradient id={fur} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffa24a" />
          <stop offset="100%" stopColor="#e86f1c" />
        </linearGradient>
      </defs>
      <Shadow />
      <g className="mh-cs-tail">
        <path d="M60 104 C82 106 96 90 91 64 C87 73 79 76 72 72 C77 84 71 95 58 97 Z" fill={`url(#${fur})`} stroke="#c95c12" strokeWidth="1.2" />
        <path d="M91 64 C87 73 81 75 77 74 C82 72 87 68 91 64 Z" fill="#fff" />
        <path d="M88 66 C90 72 89 76 85 79 C82 76 82 72 84 70 Z" fill="#fff8f0" />
      </g>
      <g className="mh-cs-leg mh-cs-leg-l">
        <rect x="38" y="96" width="9" height="19" rx="4" fill="#5a3418" />
        <ellipse cx="42" cy="116" rx="7" ry="4.2" fill="#3b2414" />
      </g>
      <g className="mh-cs-leg mh-cs-leg-r">
        <rect x="53" y="96" width="9" height="19" rx="4" fill="#5a3418" />
        <ellipse cx="58" cy="116" rx="7" ry="4.2" fill="#3b2414" />
      </g>
      <g className="mh-cs-body">
        <ellipse cx="50" cy="88" rx="17" ry="17" fill={`url(#${fur})`} />
        <ellipse cx="50" cy="91" rx="10" ry="12" fill="#fff8f0" />
        <g className="mh-cs-arm mh-cs-arm-l">
          <path d="M36 80 Q30 88 31 96" stroke="#e86f1c" strokeWidth="8" strokeLinecap="round" fill="none" />
          <circle cx="31" cy="97" r="4.4" fill="#5a3418" />
        </g>
        <g className="mh-cs-arm mh-cs-arm-r">
          <path d="M64 80 Q72 84 72 74" stroke="#e86f1c" strokeWidth="8" strokeLinecap="round" fill="none" />
          <circle cx="72" cy="72" r="4.4" fill="#5a3418" />
          {/* ดินสอ */}
          <path d="M74 70 L82 56" stroke="#ffd23f" strokeWidth="3.4" strokeLinecap="round" />
          <path d="M82 56 L84 51.5 L80.5 54.5 Z" fill="#3b2414" />
        </g>
        {/* ผ้าพันคอ */}
        <path d="M36 70 Q50 77 64 70 L64 75 Q50 82 36 75 Z" fill="#4fb36b" />
        <path d="M56 75 L60 86 L65 84 L61 74 Z" fill="#3f9a5a" />
        {/* หู */}
        <path d="M27 36 L29 7 L47 26 Z" fill={`url(#${fur})`} stroke="#c95c12" strokeWidth="1.2" strokeLinejoin="round" />
        <path d="M31 30 L31.5 14 L41 25 Z" fill="#3b2414" opacity="0.75" />
        <path d="M73 36 L71 7 L53 26 Z" fill={`url(#${fur})`} stroke="#c95c12" strokeWidth="1.2" strokeLinejoin="round" />
        <path d="M69 30 L68.5 14 L59 25 Z" fill="#3b2414" opacity="0.75" />
        {/* หัว */}
        <path d="M23 42 C23 27 35 20 50 20 C65 20 77 27 77 42 C77 55 66 68 50 69 C34 68 23 55 23 42 Z" fill={`url(#${fur})`} />
        <path d="M32 50 C39 45 45 52 50 52 C55 52 61 45 68 50 C66 61 57 68 50 68.5 C43 68 34 61 32 50 Z" fill="#fff8f0" />
        <Eyes y={43} gap={10} rx={3.6} ry={4.6} />
        <g fill="rgba(255,255,255,0.18)" stroke="#4b3d7a" strokeWidth="2">
          <circle cx="40" cy="43" r="7.6" />
          <circle cx="60" cy="43" r="7.6" />
        </g>
        <path d="M47.6 43 Q50 41 52.4 43" stroke="#4b3d7a" strokeWidth="2" fill="none" />
        <ellipse cx="50" cy="55" rx="3.6" ry="2.6" fill="#2b1a10" />
        <path d="M45.5 60 Q50 64 54.5 60" fill="none" stroke="#7a3b2a" strokeWidth="1.6" strokeLinecap="round" />
        <Cheeks y={56} gap={17} color="#ff7f6f" />
      </g>
    </>
  )
}

function BearArt({ gid }: { gid: (n: string) => string }) {
  const fur = gid('fur')
  return (
    <>
      <defs>
        <radialGradient id={fur} cx="40%" cy="30%" r="75%">
          <stop offset="0%" stopColor="#d8a172" />
          <stop offset="70%" stopColor="#b47a49" />
          <stop offset="100%" stopColor="#8a5a33" />
        </radialGradient>
      </defs>
      <Shadow />
      <g className="mh-cs-leg mh-cs-leg-l">
        <rect x="35" y="98" width="13" height="18" rx="6" fill="#9a6a3e" />
        <ellipse cx="41.5" cy="116.5" rx="8.5" ry="4.5" fill="#6b4426" />
      </g>
      <g className="mh-cs-leg mh-cs-leg-r">
        <rect x="52" y="98" width="13" height="18" rx="6" fill="#9a6a3e" />
        <ellipse cx="58.5" cy="116.5" rx="8.5" ry="4.5" fill="#6b4426" />
      </g>
      <g className="mh-cs-body">
        <ellipse cx="50" cy="89" rx="24" ry="22" fill={`url(#${fur})`} />
        {/* ผ้ากันเปื้อนร้านค้า */}
        <path d="M35 76 L65 76 L68 108 Q50 114 32 108 Z" fill="#4fb36b" stroke="#2e8a4b" strokeWidth="1.4" />
        <path d="M38 76 Q50 66 62 76" fill="none" stroke="#2e8a4b" strokeWidth="2.4" />
        <rect x="42" y="90" width="16" height="11" rx="3" fill="#3f9a5a" />
        <Coin x={50} y={84} r={5} />
        <g className="mh-cs-arm mh-cs-arm-l">
          <ellipse cx="27" cy="88" rx="7" ry="11" fill={`url(#${fur})`} transform="rotate(20 27 88)" />
        </g>
        <g className="mh-cs-arm mh-cs-arm-r">
          <ellipse cx="73" cy="86" rx="7" ry="11" fill={`url(#${fur})`} transform="rotate(-30 73 86)" />
        </g>
        {/* หู */}
        <circle cx="29" cy="24" r="9.5" fill={`url(#${fur})`} />
        <circle cx="29" cy="24" r="5" fill="#e8c09a" />
        <circle cx="71" cy="24" r="9.5" fill={`url(#${fur})`} />
        <circle cx="71" cy="24" r="5" fill="#e8c09a" />
        <ellipse cx="50" cy="45" rx="27" ry="25" fill={`url(#${fur})`} />
        <Eyes y={42} gap={10.5} rx={3.6} ry={4.4} />
        <ellipse cx="50" cy="55" rx="12" ry="9" fill="#f1d7b5" />
        <ellipse cx="50" cy="51" rx="5" ry="3.4" fill="#3b2a20" />
        <ellipse cx="48.6" cy="50.2" rx="1.6" ry="0.9" fill="#fff" opacity="0.6" />
        <path d="M44.5 57 Q50 62 55.5 57" fill="none" stroke="#5a3418" strokeWidth="1.8" strokeLinecap="round" />
        <Cheeks y={52} gap={19} color="#ff8f7a" />
        {/* หมวกร้านค้า */}
        <path d="M33 25 Q50 14 67 25 L66 29 Q50 21 34 29 Z" fill="#4fb36b" />
      </g>
    </>
  )
}

function OwlArt({ gid }: { gid: (n: string) => string }) {
  const body = gid('body')
  return (
    <>
      <defs>
        <radialGradient id={body} cx="40%" cy="30%" r="80%">
          <stop offset="0%" stopColor="#b5cdf3" />
          <stop offset="65%" stopColor="#8aa9df" />
          <stop offset="100%" stopColor="#5d7fc0" />
        </radialGradient>
      </defs>
      <Shadow />
      <g className="mh-cs-leg mh-cs-leg-l">
        <path d="M38 112 l-4 6 M41 112 v7 M44 112 l4 6" stroke="#f29a1f" strokeWidth="3" strokeLinecap="round" />
      </g>
      <g className="mh-cs-leg mh-cs-leg-r">
        <path d="M56 112 l-4 6 M59 112 v7 M62 112 l4 6" stroke="#f29a1f" strokeWidth="3" strokeLinecap="round" />
      </g>
      <g className="mh-cs-body">
        {/* หูขนนก */}
        <path d="M24 42 L19 18 L38 32 Z" fill="#6d8fd0" />
        <path d="M76 42 L81 18 L62 32 Z" fill="#6d8fd0" />
        <ellipse cx="50" cy="70" rx="30" ry="42" fill={`url(#${body})`} />
        <ellipse cx="50" cy="90" rx="19" ry="19" fill="#e4eefc" />
        {[0, 1, 2].map((r) =>
          [-1, 0, 1].map((c) => (
            <path key={`${r}${c}`} d={`M${44 + c * 8 - 3} ${82 + r * 8} q3 3 6 0`} fill="none" stroke="#a9bfe6" strokeWidth="1.4" strokeLinecap="round" />
          )),
        )}
        <g className="mh-cs-arm mh-cs-arm-l">
          <ellipse cx="22" cy="80" rx="8" ry="21" fill="#6d8fd0" transform="rotate(12 22 80)" />
        </g>
        <g className="mh-cs-arm mh-cs-arm-r">
          <ellipse cx="78" cy="80" rx="8" ry="21" fill="#6d8fd0" transform="rotate(-12 78 80)" />
        </g>
        {/* สมุดบัญชี */}
        <g transform="rotate(-6 50 100)">
          <rect x="35" y="92" width="30" height="20" rx="2.5" fill="#a8643a" stroke="#7d4521" strokeWidth="1.4" />
          <rect x="38" y="95" width="24" height="14" rx="1.5" fill="#fff8dc" />
          <path d="M41 99 h18 M41 102.5 h14 M41 106 h16" stroke="#c9b48c" strokeWidth="1.2" />
          <text x="58" y="108" fontSize="6" fontWeight="700" fill="#2e8a4b" fontFamily="Kanit, sans-serif">
            +
          </text>
        </g>
        {/* หน้า */}
        <circle cx="39" cy="50" r="13" fill="#f2f7ff" />
        <circle cx="61" cy="50" r="13" fill="#f2f7ff" />
        <g className="mh-cs-eyes">
          {[39, 61].map((x) => (
            <g key={x}>
              <circle cx={x} cy="50" r="7.4" fill={INK} />
              <circle cx={x + 2.4} cy="47.2" r="2.8" fill="#fff" />
              <circle cx={x - 2.2} cy="53" r="1.2" fill="#fff" opacity="0.85" />
            </g>
          ))}
        </g>
        <g fill="none" stroke="#7a5a3a" strokeWidth="2.4">
          <circle cx="39" cy="50" r="11" />
          <circle cx="61" cy="50" r="11" />
          <path d="M50 49 Q50 46.5 50 49" />
        </g>
        <path d="M45.5 60 L54.5 60 L50 69 Z" fill="#f29a1f" stroke="#c97a10" strokeWidth="1" strokeLinejoin="round" />
        <Cheeks y={62} gap={19} color="#ff8fa3" />
      </g>
    </>
  )
}

const ART: Record<CharacterKind, (p: { gid: (n: string) => string }) => JSX.Element> = {
  hero: HeroArt,
  rabbit: RabbitArt,
  fox: FoxArt,
  bear: BearArt,
  owl: OwlArt,
  adventurer: AdventurerArt,
  calculator: CalculatorArt,
  wizard: WizardArt,
}

export function isDrawn(id: string): id is CharacterKind {
  return (DRAWN_CHARACTERS as string[]).includes(id)
}

/** ภาพตัวละครแบบ SVG เต็มตัว (กรอบ 100 × 125) */
export function CharacterSvg({ kind, portrait = false }: { kind: CharacterKind; portrait?: boolean }) {
  const gid = useIds()
  const Art = ART[kind]
  // แบบรูปหน้า: ตัดเฉพาะหัวไหล่ขึ้นไป
  const box = portrait ? (kind === 'owl' ? '12 12 76 76' : '13 6 74 74') : '0 0 100 125'
  return (
    <svg viewBox={box} className={`mh-cs mh-cs-${kind} ${portrait ? 'is-portrait' : ''}`} aria-hidden="true" overflow={portrait ? 'hidden' : 'visible'}>
      <Art gid={gid} />
    </svg>
  )
}
