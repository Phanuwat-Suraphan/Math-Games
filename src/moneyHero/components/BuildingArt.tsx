import { useId } from 'react'

/**
 * อาคารของแต่ละด่านในเมืองเงินทอง วาดด้วย SVG ไม่ซ้ำกันสักหลัง
 *
 * 0 ค่ายฝึก · 1 ธนาคาร · 2 ตลาด · 3 ร้านเขียนราคา · 4 หอคอย · 5 สถานีแลกเหรียญ
 * 6 ธนาคารแลกเงิน · 7 ซูเปอร์มาร์เก็ต · 8 โรงงาน · 9 ร้านปริศนา · 10 ศูนย์ภารกิจ
 * 11 สำนักงานบัญชี · 12 ปราสาท MONEY MASTER
 *
 * อาคารทั่วไปใช้กรอบ 150 × 140 (ปราสาท 170 × 160) ประตูอยู่กลางล่างเสมอ
 * ฮีโร่จึงยืนหน้าประตูได้พอดีทุกหลัง
 */

type Gid = (name: string) => string

function useGid(): Gid {
  const base = useId().replace(/[^a-zA-Z0-9]/g, '')
  return (name: string) => `b${base}${name}`
}

function Ground({ w = 68, cx = 75, cy = 132 }: { w?: number; cx?: number; cy?: number }) {
  return <ellipse cx={cx} cy={cy} rx={w} ry="8" fill="#1e3c14" opacity="0.2" />
}

/** หน้าต่างกระจก มีแสงสะท้อน */
function Win({ x, y, w = 20, h = 20, arch = false, frame = '#7a5a3a', locked = false }: { x: number; y: number; w?: number; h?: number; arch?: boolean; frame?: string; locked?: boolean }) {
  const glass = locked ? '#8e96a6' : '#9fdcff'
  const d = arch
    ? `M${x} ${y + h} L${x} ${y + w / 2} A${w / 2} ${w / 2} 0 0 1 ${x + w} ${y + w / 2} L${x + w} ${y + h} Z`
    : `M${x} ${y} h${w} v${h} h${-w} Z`
  return (
    <g>
      <path d={d} fill={glass} stroke={frame} strokeWidth="2.6" strokeLinejoin="round" />
      {!locked && <path d={`M${x + 3} ${y + h - 4} L${x + w * 0.55} ${y + (arch ? w * 0.3 : 3)}`} stroke="#fff" strokeWidth="2.6" strokeLinecap="round" opacity="0.55" />}
      <path d={`M${x + w / 2} ${y + (arch ? 2 : 0)} V${y + h} M${x} ${y + h * 0.55} H${x + w}`} stroke={frame} strokeWidth="1.6" opacity="0.8" />
      {!locked && <rect x={x - 2} y={y + h} width={w + 4} height="3" rx="1.5" fill={frame} opacity="0.7" />}
    </g>
  )
}

/** ประตูกลางล่าง (ล็อกอยู่จะมีกุญแจคล้อง) */
function Door({ x = 75, bottom = 128, w = 24, h = 34, color = '#8a5a33', arch = true, locked }: { x?: number; bottom?: number; w?: number; h?: number; color?: string; arch?: boolean; locked: boolean }) {
  const l = x - w / 2
  const top = bottom - h
  const d = arch ? `M${l} ${bottom} V${top + w / 2} A${w / 2} ${w / 2} 0 0 1 ${l + w} ${top + w / 2} V${bottom} Z` : `M${l} ${bottom} V${top} H${l + w} V${bottom} Z`
  return (
    <g>
      <path d={d} fill={locked ? '#6f6f7a' : color} stroke="#4a2d16" strokeWidth="2.2" strokeLinejoin="round" />
      <path d={`M${x} ${top + (arch ? 3 : 2)} V${bottom}`} stroke="#4a2d16" strokeWidth="1.4" opacity="0.5" />
      <circle cx={x + w * 0.3} cy={bottom - h * 0.42} r="1.9" fill="#ffd23f" />
      {locked && (
        <g transform={`translate(${x} ${bottom - h * 0.45})`}>
          <path d="M-4.5 -2 V-6 A4.5 4.5 0 0 1 4.5 -6 V-2" fill="none" stroke="#d9dde5" strokeWidth="2.2" />
          <rect x="-6.5" y="-2.5" width="13" height="10" rx="2.2" fill="#ffd23f" stroke="#b07a00" strokeWidth="1.2" />
          <circle cx="0" cy="2.2" r="1.5" fill="#7a5200" />
        </g>
      )}
    </g>
  )
}

/** ป้ายร้านพร้อมไอคอน */
function Sign({ x, y, w = 44, h = 20, icon, bg = '#fff8dc', border = '#7a5a3a' }: { x: number; y: number; w?: number; h?: number; icon: string; bg?: string; border?: string }) {
  return (
    <g>
      <rect x={x - w / 2} y={y} width={w} height={h} rx="5" fill={bg} stroke={border} strokeWidth="2" />
      <text x={x} y={y + h * 0.74} textAnchor="middle" fontSize={h * 0.72}>
        {icon}
      </text>
    </g>
  )
}

function Coin({ x, y, r }: { x: number; y: number; r: number }) {
  return (
    <g>
      <circle cx={x} cy={y + 1} r={r} fill="#b97900" />
      <circle cx={x} cy={y} r={r} fill="#ffd23f" stroke="#d49400" strokeWidth="1.5" />
      <text x={x} y={y + r * 0.42} textAnchor="middle" fontSize={r * 1.2} fontWeight="700" fill="#8a5a00" fontFamily="Kanit, sans-serif">
        ฿
      </text>
    </g>
  )
}

/** ฐานหิน/ขั้นบันไดหน้าอาคาร */
function Steps({ x = 75, w = 40, y = 128 }: { x?: number; w?: number; y?: number }) {
  return (
    <g>
      <rect x={x - w / 2 - 6} y={y} width={w + 12} height="5" rx="1.5" fill="#b9b3a7" />
      <rect x={x - w / 2 - 3} y={y - 3} width={w + 6} height="4" rx="1.5" fill="#d3cdc0" />
    </g>
  )
}

function Bush({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <circle cx="-6" cy="0" r="7" fill="#3f9a46" />
      <circle cx="6" cy="0" r="7" fill="#3f9a46" />
      <circle cx="0" cy="-4" r="8" fill="#52b456" />
      <circle cx="-2" cy="-7" r="2.6" fill="#8ad97c" />
    </g>
  )
}

function Flag({ x, y, color = '#e2574c', h = 16 }: { x: number; y: number; color?: string; h?: number }) {
  return (
    <g>
      <path d={`M${x} ${y} V${y - h}`} stroke="#6b3f1f" strokeWidth="2" strokeLinecap="round" />
      <path className="mh-flag" d={`M${x} ${y - h} L${x + 13} ${y - h + 4} L${x} ${y - h + 8} Z`} fill={color} />
    </g>
  )
}

/** ควันลอยจากปล่อง (CSS ทำให้ลอยขึ้นแล้วจางหาย) */
function Smoke({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      {[0, 1, 2].map((i) => (
        <circle key={i} className="mh-smoke-puff" cx="0" cy="0" r={4 + i} fill="#f2f2f2" style={{ animationDelay: `${i * 0.9}s` }} />
      ))}
    </g>
  )
}

/* ------------------------------------------------------------------ */
/* อาคารแต่ละด่าน                                                      */
/* ------------------------------------------------------------------ */

type Art = (p: { locked: boolean; g: Gid }) => JSX.Element

/** 0 ค่ายฝึกฮีโร่: เต็นท์ กองไฟ ธง */
const Camp: Art = ({ locked }) => (
  <>
    <Ground w={66} />
    <path d="M70 18 L136 126 L4 126 Z" fill="#f08a3c" stroke="#c9661f" strokeWidth="3.5" strokeLinejoin="round" />
    <path d="M70 18 L136 126 L104 126 Z" fill="#c9661f" opacity="0.55" />
    <path d="M70 18 L48 126 L36 126 Z" fill="#fff" opacity="0.18" />
    <path d="M70 62 L90 126 L50 126 Z" fill={locked ? '#555' : '#5a3b22'} />
    <path d="M70 62 L60 126 L50 126 Z" fill="#f6b37a" />
    <Flag x={70} y={19} h={16} color="#e2574c" />
    {/* กองไฟ */}
    <g transform="translate(128 120)">
      <path d="M-11 6 L11 -1 M-11 -1 L11 6" stroke="#7a4a26" strokeWidth="4" strokeLinecap="round" />
      <g className="mh-fire">
        <path d="M-7 1 Q-8 -12 0 -20 Q2 -10 7 -8 Q9 -2 6 1 Z" fill="#ff9a3c" />
        <path d="M-3 1 Q-3 -8 1 -12 Q2 -5 4 -3 Q5 0 3 1 Z" fill="#ffd23f" />
      </g>
    </g>
    <rect x="6" y="118" width="22" height="7" rx="3.5" fill="#8a5a33" />
  </>
)

/** 1 ธนาคาร: ทรงวิหารกรีก เสา หน้าจั่ว เหรียญ ฿ */
const Bank: Art = ({ locked, g }) => (
  <>
    <defs>
      <linearGradient id={g('roof')} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#ffd84a" />
        <stop offset="100%" stopColor="#d99a00" />
      </linearGradient>
      <linearGradient id={g('col')} x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#ffffff" />
        <stop offset="100%" stopColor="#d6d0c4" />
      </linearGradient>
    </defs>
    <Ground w={70} />
    <rect x="16" y="56" width="118" height="70" fill="#f6efe1" stroke="#b8ab92" strokeWidth="2.5" />
    <path d="M8 58 L75 16 L142 58 Z" fill={`url(#${g('roof')})`} stroke="#b07a00" strokeWidth="3" strokeLinejoin="round" />
    <path d="M24 53 L75 22 L126 53 Z" fill="#fff4c2" opacity="0.6" />
    <Coin x={75} y={41} r={9} />
    <rect x="10" y="56" width="130" height="7" rx="2" fill="#e8dfcd" stroke="#b8ab92" strokeWidth="2" />
    {[24, 44, 98, 118].map((x) => (
      <g key={x}>
        <rect x={x} y="64" width="10" height="56" fill={`url(#${g('col')})`} stroke="#b8ab92" strokeWidth="1.4" />
        <rect x={x - 2} y="63" width="14" height="4" rx="1" fill="#e8dfcd" />
        <path d={`M${x + 3.3} 68 V116 M${x + 6.6} 68 V116`} stroke="#c9c1b2" strokeWidth="1" />
      </g>
    ))}
    <Door w={26} h={40} color="#8a5a33" locked={locked} />
    <Steps w={60} y={123} />
    <Bush x={6} y={122} s={0.9} />
    <Bush x={144} y={122} s={0.9} />
  </>
)

/** 2 ตลาดนับเงิน: แผงผลไม้ ผ้าใบลายทาง */
const Market: Art = ({ locked }) => {
  const stripes = Array.from({ length: 8 }, (_, i) => i)
  return (
    <>
      <Ground w={70} />
      <rect x="14" y="58" width="122" height="68" fill="#f3e2c0" stroke="#b39466" strokeWidth="2.5" />
      <path d="M10 60 L24 26 L126 26 L140 60 Z" fill="#fff" stroke="#2e8a4b" strokeWidth="2.5" strokeLinejoin="round" />
      {stripes.map((i) => (
        <path key={i} d={`M${24 + i * 12.75} 26 L${10 + i * 16.25} 60 L${10 + (i + 0.5) * 16.25} 60 L${24 + (i + 0.5) * 12.75} 26 Z`} fill="#4fb36b" />
      ))}
      {/* ระบายผ้าใบ */}
      {stripes.map((i) => (
        <path key={`s${i}`} d={`M${10 + i * 16.25} 60 a8.1 7 0 0 0 16.25 0 Z`} fill={i % 2 ? '#fff' : '#4fb36b'} stroke="#2e8a4b" strokeWidth="1.2" />
      ))}
      {/* ลังผลไม้ */}
      {[
        [26, '#e2574c'],
        [50, '#ff9a3c'],
        [100, '#7cc35a'],
        [124, '#ffd23f'],
      ].map(([x, c]) => (
        <g key={x as number}>
          <rect x={(x as number) - 11} y="104" width="22" height="18" rx="2" fill="#c98a52" stroke="#8a5a33" strokeWidth="1.6" />
          <path d={`M${(x as number) - 11} 113 h22`} stroke="#8a5a33" strokeWidth="1.2" />
          {[-6, 0, 6].map((dx) => (
            <circle key={dx} cx={(x as number) + dx} cy={101} r="4.6" fill={c as string} stroke="rgba(0,0,0,0.15)" strokeWidth="0.8" />
          ))}
        </g>
      ))}
      <Sign x={75} y={70} icon="🛒" w={36} h={18} />
      <Door w={24} h={30} color="#a8643a" arch={false} locked={locked} />
    </>
  )
}

/** 3 ร้านเขียนราคา: ร้านชมพู ป้ายป้ายราคา หน้าต่างโชว์ */
const PriceShop: Art = ({ locked }) => (
  <>
    <Ground w={66} />
    <rect x="18" y="50" width="114" height="76" fill="#fff0f4" stroke="#c78a9b" strokeWidth="2.5" />
    <path d="M10 54 L32 18 L118 18 L140 54 Z" fill="#ef6f8e" stroke="#c74766" strokeWidth="3" strokeLinejoin="round" />
    {[28, 38].map((y) => (
      <path key={y} d={`M${18 + (54 - y) * 0.5} ${y} H${132 - (54 - y) * 0.5}`} stroke="#c74766" strokeWidth="1.6" opacity="0.5" />
    ))}
    {/* ป้ายราคาห้อย */}
    <g transform="translate(75 46) rotate(-8)">
      <path d="M-20 -9 H14 L22 0 L14 9 H-20 Z" fill="#ffd23f" stroke="#c98400" strokeWidth="2" strokeLinejoin="round" />
      <circle cx="15" cy="0" r="2.4" fill="#fff" stroke="#c98400" strokeWidth="1" />
      <text x="-3" y="4.5" textAnchor="middle" fontSize="11" fontWeight="700" fill="#8a5a00" fontFamily="Kanit, sans-serif">
        ฿.25
      </text>
    </g>
    {/* หน้าต่างโชว์สินค้า */}
    {[24, 96].map((x) => (
      <g key={x}>
        <rect x={x} y="74" width="30" height="34" rx="2" fill={locked ? '#8e96a6' : '#d8f1ff'} stroke="#c78a9b" strokeWidth="2.4" />
        {!locked && (
          <>
            <rect x={x + 4} y="96" width="8" height="10" rx="1" fill="#6f7fe6" />
            <rect x={x + 15} y="92" width="10" height="14" rx="1" fill="#ff9a3c" />
            <path d={`M${x + 4} 90 L${x + 14} 78`} stroke="#fff" strokeWidth="2.4" strokeLinecap="round" opacity="0.7" />
          </>
        )}
      </g>
    ))}
    <path d="M18 70 Q32 78 46 70 Q60 78 75 70 Q90 78 104 70 Q118 78 132 70" fill="none" stroke="#ef6f8e" strokeWidth="5" strokeLinecap="round" />
    <Door w={24} h={36} color="#c74766" locked={locked} />
    <Steps w={34} y={123} />
  </>
)

/** 4 หอคอยเปรียบเทียบ: หอคอยกลมสูง หลังคากรวย ตาชั่ง */
const Tower: Art = ({ locked, g }) => (
  <>
    <defs>
      <linearGradient id={g('wall')} x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#e9ecfb" />
        <stop offset="55%" stopColor="#ffffff" />
        <stop offset="100%" stopColor="#b9c0e6" />
      </linearGradient>
    </defs>
    <Ground w={58} />
    <rect x="22" y="80" width="28" height="46" fill="#dfe3f7" stroke="#8d96c9" strokeWidth="2" />
    <rect x="100" y="80" width="28" height="46" fill="#dfe3f7" stroke="#8d96c9" strokeWidth="2" />
    <path d="M18 82 L36 64 L54 82 Z M96 82 L114 64 L132 82 Z" fill="#6f7fe6" stroke="#4b59c4" strokeWidth="2" strokeLinejoin="round" />
    <Win x={29} y={92} w={14} h={16} arch frame="#6a72a8" locked={locked} />
    <Win x={107} y={92} w={14} h={16} arch frame="#6a72a8" locked={locked} />
    <rect x="48" y="34" width="54" height="92" fill={`url(#${g('wall')})`} stroke="#8d96c9" strokeWidth="2.5" />
    {[48, 60, 72, 84, 96].map((x) => (
      <rect key={x} x={x} y="28" width="7" height="8" fill="#e9ecfb" stroke="#8d96c9" strokeWidth="1.6" />
    ))}
    <path d="M44 30 L75 -2 L106 30 Z" fill="#6f7fe6" stroke="#4b59c4" strokeWidth="3" strokeLinejoin="round" />
    <path d="M75 -2 L60 30 L52 30 Z" fill="#fff" opacity="0.2" />
    {/* ตาชั่ง */}
    <g transform="translate(75 58)">
      <circle r="15" fill="#fff8dc" stroke="#4b59c4" strokeWidth="2.4" />
      <path d="M0 -9 V8 M-10 -5 H10" stroke="#4b59c4" strokeWidth="2" strokeLinecap="round" />
      <path d="M-14 3 L-10 -5 L-6 3 Z M6 3 L10 -5 L14 3 Z" fill="#ffd23f" stroke="#c98400" strokeWidth="1" />
      <path d="M-5 9 H5" stroke="#4b59c4" strokeWidth="2.4" strokeLinecap="round" />
    </g>
    <Win x={66} y={78} w={18} h={10} frame="#6a72a8" locked={locked} />
    <Door w={22} h={32} color="#4b59c4" locked={locked} />
  </>
)

/** 5 สถานีแลกเหรียญ: สถานีมีหอนาฬิกา ประตูโค้งใหญ่ */
const Station: Art = ({ locked }) => (
  <>
    <Ground w={70} />
    <rect x="10" y="66" width="130" height="60" fill="#e8f7f9" stroke="#6aaab4" strokeWidth="2.5" />
    <path d="M4 68 L18 52 L132 52 L146 68 Z" fill="#3cb6c9" stroke="#228c9c" strokeWidth="2.5" strokeLinejoin="round" />
    {/* หอนาฬิกา */}
    <rect x="56" y="22" width="38" height="46" fill="#f4fbfc" stroke="#6aaab4" strokeWidth="2.5" />
    <path d="M50 24 L75 2 L100 24 Z" fill="#3cb6c9" stroke="#228c9c" strokeWidth="2.5" strokeLinejoin="round" />
    <circle cx="75" cy="42" r="12" fill="#fff" stroke="#228c9c" strokeWidth="2.6" />
    <path d="M75 42 V34 M75 42 L81 45" stroke="#2b2350" strokeWidth="2" strokeLinecap="round" />
    {[0, 90, 180, 270].map((a) => (
      <circle key={a} cx={75 + Math.cos((a * Math.PI) / 180) * 9} cy={42 + Math.sin((a * Math.PI) / 180) * 9} r="1.1" fill="#2b2350" />
    ))}
    {/* เหรียญหมุนบนป้าย */}
    <Coin x={30} y={60} r={6} />
    <text x="44" y="64" fontSize="10" fontWeight="700" fill="#228c9c" fontFamily="Kanit, sans-serif">
      ⇄
    </text>
    <Coin x={120} y={60} r={6} />
    <Win x={18} y={80} w={18} h={24} arch frame="#4f8f99" locked={locked} />
    <Win x={40} y={80} w={18} h={24} arch frame="#4f8f99" locked={locked} />
    <Win x={92} y={80} w={18} h={24} arch frame="#4f8f99" locked={locked} />
    <Win x={114} y={80} w={18} h={24} arch frame="#4f8f99" locked={locked} />
    <Door w={30} h={44} color="#228c9c" locked={locked} />
    <rect x="10" y="120" width="130" height="6" fill="#9fb4b8" />
  </>
)

/** 6 ธนาคารแลกเงิน: อาคารทันสมัย กระจกบานใหญ่ ตู้ ATM */
const ModernBank: Art = ({ locked, g }) => (
  <>
    <defs>
      <linearGradient id={g('glass')} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#d6f2ff" />
        <stop offset="100%" stopColor="#6fb9e8" />
      </linearGradient>
    </defs>
    <Ground w={70} />
    <rect x="14" y="30" width="122" height="96" rx="4" fill="#fff7dd" stroke="#c9a640" strokeWidth="2.5" />
    <rect x="10" y="24" width="130" height="12" rx="3" fill="#f2b51c" stroke="#c48a00" strokeWidth="2.5" />
    <text x="75" y="34" textAnchor="middle" fontSize="9" fontWeight="700" fill="#7a5200" fontFamily="Kanit, sans-serif">
      ฿ ⇄ ฿
    </text>
    {[22, 54, 86, 118].map((x, i) =>
      i === 1 || i === 2 ? null : <rect key={x} x={x - 2} y="44" width="14" height="66" rx="2" fill={locked ? '#8e96a6' : `url(#${g('glass')})`} stroke="#c9a640" strokeWidth="2" />,
    )}
    <rect x="46" y="44" width="58" height="30" rx="2" fill={locked ? '#8e96a6' : `url(#${g('glass')})`} stroke="#c9a640" strokeWidth="2" />
    {!locked && <path d="M50 70 L64 48 M58 70 L70 52" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" opacity="0.6" />}
    <Coin x={94} y={59} r={8} />
    {/* ตู้ ATM */}
    <g transform="translate(118 96)">
      <rect x="-9" y="-12" width="18" height="30" rx="2" fill="#4b59c4" stroke="#2f3a8a" strokeWidth="1.4" />
      <rect x="-6" y="-9" width="12" height="7" rx="1" fill="#bfe8c8" />
      <rect x="-5" y="1" width="10" height="2" rx="1" fill="#2b2350" />
    </g>
    <Door w={30} h={38} color="#c48a00" arch={false} locked={locked} />
    <Steps w={40} y={123} />
  </>
)

/** 7 ซูเปอร์มาร์เก็ต: ป้ายใหญ่ ประตูกระจก รถเข็น */
const Supermarket: Art = ({ locked }) => (
  <>
    <Ground w={72} />
    <rect x="8" y="46" width="134" height="80" fill="#fff4f2" stroke="#c97a72" strokeWidth="2.5" />
    <rect x="4" y="34" width="142" height="20" rx="4" fill="#e2574c" stroke="#b53a31" strokeWidth="2.5" />
    <text x="75" y="49" textAnchor="middle" fontSize="12" fontWeight="700" fill="#fff" fontFamily="Kanit, sans-serif">
      SUPER ฿ MARKET
    </text>
    {Array.from({ length: 9 }, (_, i) => (
      <path key={i} d={`M${8 + i * 14.9} 56 h14.9 v8 a7.45 6 0 0 1 -14.9 0 Z`} fill={i % 2 ? '#fff' : '#e2574c'} stroke="#b53a31" strokeWidth="1" />
    ))}
    {[14, 108].map((x) => (
      <g key={x}>
        <rect x={x} y="74" width="28" height="36" rx="2" fill={locked ? '#8e96a6' : '#d8f1ff'} stroke="#c97a72" strokeWidth="2.2" />
        {!locked && (
          <>
            <path d={`M${x} 92 h28`} stroke="#c97a72" strokeWidth="1.6" />
            {[0, 1, 2].map((k) => (
              <rect key={k} x={x + 3 + k * 8.5} y="84" width="6" height="7" rx="1" fill={['#ffd23f', '#4fb36b', '#ff9a3c'][k]} />
            ))}
            {[0, 1, 2].map((k) => (
              <rect key={`b${k}`} x={x + 3 + k * 8.5} y="101" width="6" height="8" rx="1" fill={['#6f7fe6', '#ef6f8e', '#3cb6c9'][k]} />
            ))}
          </>
        )}
      </g>
    ))}
    {/* ประตูกระจกเลื่อน */}
    <rect x="56" y="80" width="38" height="46" fill={locked ? '#6f6f7a' : '#bfe6ff'} stroke="#8a4a42" strokeWidth="2.4" />
    <path d="M75 80 V126" stroke="#8a4a42" strokeWidth="2" />
    {!locked && <path d="M60 120 L70 88 M80 120 L90 88" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" opacity="0.6" />}
    {locked && <Door w={20} h={30} color="#6f6f7a" arch={false} locked />}
    {/* รถเข็น */}
    <g transform="translate(136 116)">
      <path d="M-14 -12 H-10 L-6 2 H8 L11 -8 H-8" fill="none" stroke="#6b6f7a" strokeWidth="2" strokeLinejoin="round" />
      <circle cx="-4" cy="6" r="2.4" fill="#2b2350" />
      <circle cx="6" cy="6" r="2.4" fill="#2b2350" />
    </g>
  </>
)

/** 8 โรงงานคูณ–หาร: หลังคาฟันเลื่อย ปล่องควัน เฟือง */
const Factory: Art = ({ locked }) => (
  <>
    <Ground w={72} />
    <rect x="96" y="12" width="16" height="56" fill="#b36a4a" stroke="#7d4521" strokeWidth="2" />
    <rect x="94" y="8" width="20" height="8" rx="2" fill="#8a5a33" />
    {!locked && <Smoke x={104} y={4} />}
    {[22, 34, 46].map((y) => (
      <path key={y} d={`M96 ${y} H112`} stroke="#7d4521" strokeWidth="1.2" opacity="0.6" />
    ))}
    <rect x="10" y="58" width="130" height="68" fill="#d7dbe2" stroke="#7e8796" strokeWidth="2.5" />
    <path d="M8 60 L8 40 L40 56 L40 36 L72 52 L72 32 L104 48 L104 28 L142 46 L142 60 Z" fill="#7e8796" stroke="#5d6573" strokeWidth="2.5" strokeLinejoin="round" />
    {[16, 48, 80].map((x) => (
      <path key={x} d={`M${x} 56 L${x} 44 L${x + 18} 52 Z`} fill={locked ? '#8e96a6' : '#bfe6ff'} opacity="0.9" />
    ))}
    {/* เฟือง */}
    <g transform="translate(34 88)" className="mh-gear">
      <circle r="11" fill="#ffd23f" stroke="#c98400" strokeWidth="2" />
      {Array.from({ length: 8 }, (_, i) => (
        <rect key={i} x="-2.5" y="-15" width="5" height="6" rx="1" fill="#ffd23f" stroke="#c98400" strokeWidth="1.2" transform={`rotate(${i * 45})`} />
      ))}
      <circle r="4" fill="#fff8dc" stroke="#c98400" strokeWidth="1.5" />
    </g>
    <text x="116" y="96" textAnchor="middle" fontSize="20" fontWeight="700" fill="#5d6573" fontFamily="Kanit, sans-serif">
      ×÷
    </text>
    {/* ประตูม้วน */}
    <rect x="55" y="88" width="40" height="38" fill={locked ? '#6f6f7a' : '#a7adb8'} stroke="#5d6573" strokeWidth="2.2" />
    {[94, 100, 106, 112, 118].map((y) => (
      <path key={y} d={`M55 ${y} H95`} stroke="#5d6573" strokeWidth="1.2" opacity="0.6" />
    ))}
    {locked && <Door w={18} h={26} color="#6f6f7a" arch={false} locked />}
    <rect x="10" y="120" width="130" height="6" fill="#9aa1aa" />
  </>
)

/** 9 ร้านค้าปริศนา: บ้านเอียงสนุก ๆ หน้าต่างกลม เครื่องหมายคำถาม */
const PuzzleShop: Art = ({ locked }) => (
  <>
    <Ground w={64} />
    <path d="M20 126 L24 52 L128 48 L130 126 Z" fill="#f4ecff" stroke="#9b7cc8" strokeWidth="2.5" strokeLinejoin="round" />
    <path d="M10 56 L70 6 L140 52 Z" fill="#a66be6" stroke="#7f45c2" strokeWidth="3" strokeLinejoin="round" />
    {[[50, 30], [92, 30], [70, 18]].map(([x, y], i) => (
      <circle key={i} cx={x} cy={y} r="2.2" fill="#ffd23f" />
    ))}
    {/* หน้าต่างกลมรูปจิ๊กซอว์ */}
    <circle cx="70" cy="36" r="10" fill="#fff8dc" stroke="#7f45c2" strokeWidth="2.4" />
    <text x="70" y="42" textAnchor="middle" fontSize="15" fontWeight="700" fill="#7f45c2" fontFamily="Kanit, sans-serif">
      ?
    </text>
    <Win x={30} y={66} w={22} h={22} arch frame="#7f45c2" locked={locked} />
    <Win x={98} y={64} w={22} h={22} arch frame="#7f45c2" locked={locked} />
    <g transform="translate(40 108)">
      <path d="M-8 -8 h5 a3 3 0 0 1 6 0 h5 v5 a3 3 0 0 1 0 6 v5 h-16 Z" fill="#ffd23f" stroke="#c98400" strokeWidth="1.4" />
    </g>
    <g transform="translate(110 108) rotate(15)">
      <path d="M-8 -8 h5 a3 3 0 0 1 6 0 h5 v5 a3 3 0 0 1 0 6 v5 h-16 Z" fill="#4fb36b" stroke="#2e8a4b" strokeWidth="1.4" />
    </g>
    <Door w={24} h={36} color="#7f45c2" locked={locked} />
  </>
)

/** 10 ศูนย์ภารกิจ: กองบัญชาการ จานเรดาร์ ธง เป้า */
const MissionHQ: Art = ({ locked }) => (
  <>
    <Ground w={70} />
    <rect x="12" y="50" width="126" height="76" rx="3" fill="#eef2ff" stroke="#7b8fd6" strokeWidth="2.5" />
    <rect x="8" y="44" width="134" height="10" rx="3" fill="#4e6ce0" stroke="#3349b0" strokeWidth="2.5" />
    {/* จานเรดาร์ */}
    <g transform="translate(110 34)">
      <path d="M0 10 V2" stroke="#5d6573" strokeWidth="3" />
      <g className="mh-radar">
        <path d="M-14 -2 A14 9 0 0 0 14 -2 Z" fill="#e6e9f2" stroke="#5d6573" strokeWidth="2" transform="rotate(-20)" />
        <path d="M0 -2 L7 -12" stroke="#5d6573" strokeWidth="1.6" />
        <circle cx="7" cy="-12" r="2" fill="#e2574c" />
      </g>
    </g>
    <Flag x={30} y={45} h={22} color="#ffd23f" />
    {/* เป้า */}
    <g transform="translate(75 72)">
      <circle r="13" fill="#fff" stroke="#e2574c" strokeWidth="3" />
      <circle r="8" fill="#e2574c" />
      <circle r="3.6" fill="#fff" />
    </g>
    {[20, 104].map((x) => (
      <g key={x}>
        <Win x={x} y={64} w={26} h={16} frame="#4e6ce0" locked={locked} />
        <Win x={x} y={92} w={26} h={16} frame="#4e6ce0" locked={locked} />
      </g>
    ))}
    <Door w={26} h={34} color="#3349b0" arch={false} locked={locked} />
    <Steps w={36} y={123} />
  </>
)

/** 11 สำนักงานบัญชี: ห้องสมุดอิฐ ป้ายรูปสมุด หน้าต่างกองหนังสือ */
const Ledger: Art = ({ locked }) => (
  <>
    <Ground w={68} />
    <rect x="16" y="54" width="118" height="72" fill="#c9825a" stroke="#7d4521" strokeWidth="2.5" />
    {Array.from({ length: 7 }, (_, r) =>
      Array.from({ length: 6 }, (_, c) => (
        18 + c * 20 + (r % 2) * 10 + 17 > 132 ? null : (
          <rect key={`${r}${c}`} x={18 + c * 20 + (r % 2) * 10} y={58 + r * 9} width="17" height="6" rx="1" fill="#b36a4a" opacity="0.55" />
        )
      )),
    )}
    <path d="M8 58 L36 22 L114 22 L142 58 Z" fill="#a8643a" stroke="#7d4521" strokeWidth="3" strokeLinejoin="round" />
    <rect x="98" y="12" width="12" height="20" fill="#8a5a33" stroke="#5d3b1f" strokeWidth="2" />
    {!locked && <Smoke x={104} y={9} />}
    {/* ป้ายรูปสมุดบัญชี */}
    <g transform="translate(75 40)">
      <path d="M-20 -10 Q-10 -14 0 -10 Q10 -14 20 -10 V10 Q10 6 0 10 Q-10 6 -20 10 Z" fill="#fff8dc" stroke="#7d4521" strokeWidth="2" strokeLinejoin="round" />
      <path d="M0 -10 V10" stroke="#7d4521" strokeWidth="1.4" />
      <text x="-10" y="4" textAnchor="middle" fontSize="10" fontWeight="700" fill="#2e8a4b" fontFamily="Kanit, sans-serif">
        +
      </text>
      <text x="10" y="4" textAnchor="middle" fontSize="11" fontWeight="700" fill="#e2574c" fontFamily="Kanit, sans-serif">
        −
      </text>
    </g>
    {[24, 102].map((x) => (
      <g key={x}>
        <rect x={x} y="70" width="24" height="30" rx="2" fill={locked ? '#8e96a6' : '#fff1d6'} stroke="#5d3b1f" strokeWidth="2.4" />
        {!locked &&
          [0, 1, 2, 3].map((k) => <rect key={k} x={x + 3 + k * 5} y={84 - (k % 2) * 3} width="4" height={14 + (k % 2) * 3} rx="0.8" fill={['#e2574c', '#4fb36b', '#6f7fe6', '#ffd23f'][k]} />)}
      </g>
    ))}
    <Door w={24} h={36} color="#5d3b1f" locked={locked} />
    <Steps w={34} y={123} />
  </>
)

/** 12 ปราสาท FINAL MONEY MASTER */
const Castle: Art = ({ locked, g }) => (
  <>
    <defs>
      <linearGradient id={g('stone')} x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#efe6f9" />
        <stop offset="60%" stopColor="#ffffff" />
        <stop offset="100%" stopColor="#c9bde0" />
      </linearGradient>
    </defs>
    <Ground w={82} cx={85} cy={152} />
    {/* กำแพงหลัก */}
    <rect x="22" y="70" width="126" height="78" fill={`url(#${g('stone')})`} stroke="#9a8cbf" strokeWidth="2.5" />
    {Array.from({ length: 9 }, (_, i) => (
      <rect key={i} x={24 + i * 14} y="62" width="9" height="10" fill="#f1eafa" stroke="#9a8cbf" strokeWidth="1.6" />
    ))}
    {/* หอกลาง */}
    <rect x="60" y="34" width="50" height="60" fill={`url(#${g('stone')})`} stroke="#9a8cbf" strokeWidth="2.5" />
    <path d="M54 36 L85 -4 L116 36 Z" fill="#8b5cf6" stroke="#6a3dd6" strokeWidth="3" strokeLinejoin="round" />
    <Flag x={85} y={-3} h={14} color="#ffd23f" />
    <circle cx="85" cy="56" r="12" fill="#ffd23f" stroke="#c98400" strokeWidth="2.6" />
    <path d="M78 59 L78 52 L81.5 55 L85 50 L88.5 55 L92 52 L92 59 Z" fill="#fff" stroke="#c98400" strokeWidth="1" />
    {/* หอซ้ายขวา */}
    {[8, 130].map((x) => (
      <g key={x}>
        <rect x={x} y="46" width="32" height="102" fill={`url(#${g('stone')})`} stroke="#9a8cbf" strokeWidth="2.5" />
        <path d={`M${x - 5} 48 L${x + 16} 14 L${x + 37} 48 Z`} fill="#8b5cf6" stroke="#6a3dd6" strokeWidth="2.6" strokeLinejoin="round" />
        <Flag x={x + 16} y={15} h={12} color="#e2574c" />
        <Win x={x + 9} y={62} w={14} h={18} arch frame="#6a3dd6" locked={locked} />
        <Win x={x + 9} y={96} w={14} h={18} arch frame="#6a3dd6" locked={locked} />
      </g>
    ))}
    {/* ธงห้อย */}
    {[44, 114].map((x) => (
      <path key={x} d={`M${x} 78 h12 v22 l-6 -5 l-6 5 Z`} fill="#8b5cf6" stroke="#6a3dd6" strokeWidth="1.4" />
    ))}
    <Door x={85} bottom={148} w={32} h={44} color="#6b3f1f" locked={locked} />
    <rect x="66" y="146" width="38" height="5" rx="2" fill="#b9b3a7" />
  </>
)

const ARTS: Art[] = [Camp, Bank, Market, PriceShop, Tower, Station, ModernBank, Supermarket, Factory, PuzzleShop, MissionHQ, Ledger, Castle]

/** ขนาดกรอบภาพของแต่ละอาคาร */
export function buildingBox(level: number): { w: number; h: number } {
  return level === 12 ? { w: 170, h: 160 } : { w: 150, h: 140 }
}

export function BuildingArt({ level, locked = false, className = 'mh-house-svg' }: { level: number; locked?: boolean; className?: string }) {
  const g = useGid()
  const Draw = ARTS[level] ?? Bank
  const box = buildingBox(level)
  return (
    <svg viewBox={`0 0 ${box.w} ${box.h}`} className={className} aria-hidden="true" overflow="visible">
      <Draw locked={locked} g={g} />
    </svg>
  )
}
