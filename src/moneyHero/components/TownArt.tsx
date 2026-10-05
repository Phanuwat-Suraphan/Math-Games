import { memo } from 'react'
import { BRIDGE, DECOR, RIVER, ROAD, ROAD_WIDTH, WORLD, type Tree } from '../data/town'

/**
 * ภาพเมืองเงินทองแบบมองจากด้านบน วาดด้วย SVG ทั้งหมด
 * พื้นหญ้า ถนนดิน แม่น้ำ สะพานไม้ ดอกไม้ พุ่มไม้ ก้อนหิน และเสาไฟ
 * วาดครั้งเดียว (memo) แล้วเลื่อนทั้งแผ่นตามกล้อง จึงไม่หนักเครื่อง
 */

function seeded(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const rnd = seeded(11)
const BLOTCHES = Array.from({ length: 70 }, () => ({
  x: rnd() * WORLD.w,
  y: rnd() * WORLD.h,
  rx: 60 + rnd() * 140,
  ry: 30 + rnd() * 70,
  light: rnd() < 0.5,
}))
const TUFTS = Array.from({ length: 260 }, () => ({ x: rnd() * WORLD.w, y: rnd() * WORLD.h }))
const LILIES = Array.from({ length: 14 }, (_, i) => ({ x: 120 + i * 160 + rnd() * 60, y: RIVER.top + 22 + rnd() * 56 }))
const RIVER_ROCKS = Array.from({ length: 8 }, (_, i) => ({ x: 520 + i * 230 + rnd() * 80, y: RIVER.top + 30 + rnd() * 40, s: 14 + rnd() * 14 }))

const ROAD_POINTS = ROAD.map((p) => `${p.x},${p.y}`).join(' ')

/** เสาไฟข้างถนน ทุกช่วงยาว ๆ */
const LAMPS = ROAD.slice(0, -1).flatMap((a, i) => {
  const b = ROAD[i + 1]
  const len = Math.hypot(b.x - a.x, b.y - a.y)
  if (len < 300) return []
  const t = 0.5
  const horizontal = Math.abs(b.y - a.y) < 10
  const lamp = {
    x: a.x + (b.x - a.x) * t + (horizontal ? 0 : ROAD_WIDTH / 2 + 20),
    y: a.y + (b.y - a.y) * t + (horizontal ? ROAD_WIDTH / 2 + 18 : 0),
  }
  // ไม่ตั้งเสาไฟบนสะพานหรือในแม่น้ำ
  return lamp.y > RIVER.top - 40 && lamp.y < RIVER.bottom + 40 ? [] : [lamp]
})

function Riverbank() {
  const wave = (y: number, amp: number, phase: number) => {
    let d = `M 0 ${y}`
    for (let x = 0; x <= WORLD.w; x += 80) d += ` Q ${x + 40} ${y + (((x / 80) % 2 === 0 ? 1 : -1) * amp + phase)} ${x + 80} ${y}`
    return d
  }
  return (
    <g>
      <rect x="0" y={RIVER.top - 14} width={WORLD.w} height={RIVER.bottom - RIVER.top + 28} fill="#c9a06a" />
      <rect x="0" y={RIVER.top} width={WORLD.w} height={RIVER.bottom - RIVER.top} fill="#4fa3e3" />
      <rect x="0" y={RIVER.top} width={WORLD.w} height="16" fill="#3b8bd0" />
      <path d={wave(RIVER.top + 40, 6, 0)} stroke="#8fd0ff" strokeWidth="4" fill="none" opacity="0.7" />
      <path d={wave(RIVER.top + 72, 5, 2)} stroke="#8fd0ff" strokeWidth="3" fill="none" opacity="0.5" />
      {LILIES.map((l, i) => (
        <g key={i} transform={`translate(${l.x} ${l.y})`}>
          <path d="M0 0 L12 -3 A12 12 0 1 1 12 3 Z" fill="#5dbb63" stroke="#3c8f44" strokeWidth="2" />
          {i % 3 === 0 && <circle cx="-2" cy="-2" r="4" fill="#ff9fc4" />}
        </g>
      ))}
      {RIVER_ROCKS.map((r, i) => (
        <g key={i}>
          <ellipse cx={r.x} cy={r.y + 4} rx={r.s} ry={r.s * 0.6} fill="#2f6fa8" opacity="0.5" />
          <ellipse cx={r.x} cy={r.y} rx={r.s} ry={r.s * 0.75} fill="#8d939c" />
          <ellipse cx={r.x - r.s * 0.3} cy={r.y - r.s * 0.3} rx={r.s * 0.4} ry={r.s * 0.25} fill="#b8bec6" />
        </g>
      ))}
    </g>
  )
}

function Bridge() {
  const top = RIVER.top - 30
  const h = RIVER.bottom - RIVER.top + 60
  const planks = Math.floor(h / 16)
  return (
    <g>
      <rect x={BRIDGE.x} y={top} width={BRIDGE.w} height={h} fill="#a86b3c" rx="6" />
      {Array.from({ length: planks }, (_, i) => (
        <rect key={i} x={BRIDGE.x + 6} y={top + 4 + i * 16} width={BRIDGE.w - 12} height="12" rx="2" fill={i % 2 ? '#c98a52' : '#bf7f48'} />
      ))}
      {[top, top + h - 14].map((y) =>
        [BRIDGE.x - 6, BRIDGE.x + BRIDGE.w - 8].map((x) => <rect key={`${x}-${y}`} x={x} y={y - 6} width="14" height="26" rx="4" fill="#7a4a26" />),
      )}
    </g>
  )
}

function DecorItem({ kind, x, y }: { kind: string; x: number; y: number }) {
  switch (kind) {
    case 'flower':
      return (
        <g transform={`translate(${x} ${y})`}>
          {[0, 72, 144, 216, 288].map((a) => (
            <circle key={a} cx={Math.cos((a * Math.PI) / 180) * 4} cy={Math.sin((a * Math.PI) / 180) * 4} r="3.2" fill={x % 2 > 1 ? '#ffffff' : '#ffd1e6'} />
          ))}
          <circle r="2.4" fill="#ffd23f" />
        </g>
      )
    case 'bush':
      return (
        <g transform={`translate(${x} ${y})`}>
          <ellipse cx="0" cy="8" rx="20" ry="7" fill="#3f8a3a" opacity="0.35" />
          <circle cx="-9" cy="0" r="11" fill="#4ea64a" />
          <circle cx="9" cy="0" r="11" fill="#4ea64a" />
          <circle cx="0" cy="-6" r="12" fill="#5fbd57" />
          <circle cx="-3" cy="-10" r="4" fill="#8ad97c" />
        </g>
      )
    case 'rock':
      return (
        <g transform={`translate(${x} ${y})`}>
          <ellipse cx="0" cy="6" rx="16" ry="6" fill="#000" opacity="0.15" />
          <path d="M-14 4 Q-14 -10 -2 -12 Q14 -12 14 2 Q10 8 0 8 Q-12 8 -14 4 Z" fill="#9aa1aa" />
          <path d="M-8 -6 Q-2 -10 6 -8" stroke="#c4cad1" strokeWidth="3" fill="none" />
        </g>
      )
    default:
      return (
        <g transform={`translate(${x} ${y})`}>
          <rect x="-3" y="-2" width="6" height="9" rx="2" fill="#f4e4c8" />
          <path d="M-9 -1 Q0 -14 9 -1 Z" fill="#e2574c" />
          <circle cx="-3" cy="-5" r="1.6" fill="#fff" />
          <circle cx="3" cy="-6" r="1.4" fill="#fff" />
        </g>
      )
  }
}

export const TownTerrain = memo(function TownTerrain() {
  return (
    <svg className="mh-town-terrain" width={WORLD.w} height={WORLD.h} viewBox={`0 0 ${WORLD.w} ${WORLD.h}`} aria-hidden="true">
      <rect width={WORLD.w} height={WORLD.h} fill="#7cc35a" />
      {BLOTCHES.map((b, i) => (
        <ellipse key={i} cx={b.x} cy={b.y} rx={b.rx} ry={b.ry} fill={b.light ? '#8fd16a' : '#6db34e'} opacity="0.55" />
      ))}
      {TUFTS.map((t, i) => (
        <path key={i} d={`M${t.x} ${t.y} l3 -7 M${t.x + 5} ${t.y} l1 -9 M${t.x + 9} ${t.y} l-2 -6`} stroke="#5a9e43" strokeWidth="2" strokeLinecap="round" />
      ))}
      <Riverbank />
      {/* ถนนดิน: ขอบหญ้าเข้ม → ขอบดิน → ผิวถนน */}
      <polyline points={ROAD_POINTS} fill="none" stroke="#5c9f45" strokeWidth={ROAD_WIDTH + 22} strokeLinejoin="round" strokeLinecap="round" />
      <polyline points={ROAD_POINTS} fill="none" stroke="#a9764a" strokeWidth={ROAD_WIDTH + 8} strokeLinejoin="round" strokeLinecap="round" />
      <polyline points={ROAD_POINTS} fill="none" stroke="#c99665" strokeWidth={ROAD_WIDTH} strokeLinejoin="round" strokeLinecap="round" />
      <polyline points={ROAD_POINTS} fill="none" stroke="#d6a676" strokeWidth={ROAD_WIDTH - 30} strokeLinejoin="round" strokeLinecap="round" strokeDasharray="2 46" />
      <Bridge />
      {DECOR.map((d, i) => (
        <DecorItem key={i} kind={d.kind} x={d.x} y={d.y} />
      ))}
      {LAMPS.map((l, i) => (
        <g key={i} transform={`translate(${l.x} ${l.y})`}>
          <ellipse cx="0" cy="4" rx="10" ry="4" fill="#000" opacity="0.18" />
          <rect x="-3" y="-44" width="6" height="46" rx="2" fill="#5b5f6a" />
          <rect x="-9" y="-62" width="18" height="20" rx="4" fill="#4b4f59" />
          <rect x="-6" y="-58" width="12" height="13" rx="3" fill="#ffd36b" />
        </g>
      ))}
    </svg>
  )
})

/** ต้นไม้หนึ่งต้น (เป็นชิ้นแยก จึงเรียงหน้า–หลังกับฮีโร่ได้ถูก) */
export function TreeSprite({ tree }: { tree: Tree }) {
  const r = tree.r
  const fills = [
    ['#3f9a46', '#52b456', '#7fd36f'],
    ['#368a4a', '#47a65b', '#73c77c'],
    ['#4e9e3a', '#62b84a', '#93da6b'],
  ][tree.kind]
  const w = r * 2 + 8
  const h = r * 2.3
  return (
    <div className="mh-tree-sprite" style={{ left: tree.x - w / 2, top: tree.y - h, width: w, height: h + 10, zIndex: Math.round(tree.y) }}>
      <svg viewBox={`${-w / 2} ${-h} ${w} ${h + 10}`} width={w} height={h + 10} aria-hidden="true">
        <ellipse cx="0" cy="2" rx={r * 0.8} ry={r * 0.25} fill="#000" opacity="0.18" />
        <rect x={-r * 0.16} y={-r * 0.7} width={r * 0.32} height={r * 0.72} rx="3" fill="#8a5a33" />
        <circle cx={-r * 0.45} cy={-r * 1.05} r={r * 0.62} fill={fills[0]} />
        <circle cx={r * 0.45} cy={-r * 1.05} r={r * 0.62} fill={fills[0]} />
        <circle cx="0" cy={-r * 1.35} r={r * 0.78} fill={fills[1]} />
        <circle cx={-r * 0.28} cy={-r * 1.62} r={r * 0.28} fill={fills[2]} opacity="0.85" />
      </svg>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* บ้านของแต่ละด่าน                                                    */
/* ------------------------------------------------------------------ */

const ROOFS: Record<string, [string, string]> = {
  'theme-start': ['#f08a3c', '#c9661f'],
  'theme-bank': ['#f2b51c', '#c48a00'],
  'theme-market': ['#4fb36b', '#2e8a4b'],
  'theme-price': ['#ef6f8e', '#c74766'],
  'theme-tower': ['#6f7fe6', '#4b59c4'],
  'theme-station': ['#3cb6c9', '#228c9c'],
  'theme-super': ['#e2574c', '#b53a31'],
  'theme-factory': ['#7e8796', '#5d6573'],
  'theme-puzzle': ['#a66be6', '#7f45c2'],
  'theme-mission': ['#4e6ce0', '#3349b0'],
  'theme-library': ['#a8643a', '#7d4521'],
  'theme-final': ['#8b5cf6', '#6a3dd6'],
}

/** บ้านแบบมองเฉียงจากด้านบน: หลังคา ผนัง ประตู หน้าต่าง ป้ายด่าน */
export function HouseArt({ theme, icon, locked, kind }: { theme: string; icon: string; locked: boolean; kind: 'house' | 'tent' | 'castle' }) {
  const [roof, roofDark] = ROOFS[theme] ?? ROOFS['theme-super']
  if (kind === 'tent') {
    return (
      <svg viewBox="0 0 150 140" className="mh-house-svg" aria-hidden="true">
        <ellipse cx="75" cy="132" rx="64" ry="8" fill="#000" opacity="0.18" />
        <path d="M75 18 L140 128 L10 128 Z" fill={roof} stroke={roofDark} strokeWidth="4" strokeLinejoin="round" />
        <path d="M75 18 L95 128 L55 128 Z" fill={roofDark} />
        <path d="M75 70 L92 128 L58 128 Z" fill="#5a3b22" />
        <path d="M75 18 L75 6" stroke="#7a4a26" strokeWidth="4" />
        <path d="M75 6 L98 12 L75 18 Z" fill="#e2574c" />
        <rect x="104" y="112" width="30" height="8" rx="3" fill="#8a5a33" />
        <path d="M108 112 L119 96 L130 112" fill="#ff9a3c" />
      </svg>
    )
  }
  if (kind === 'castle') {
    return (
      <svg viewBox="0 0 170 160" className="mh-house-svg" aria-hidden="true">
        <ellipse cx="85" cy="152" rx="80" ry="8" fill="#000" opacity="0.18" />
        <rect x="20" y="60" width="130" height="88" fill="#e8dcc8" stroke="#a5957c" strokeWidth="3" />
        {[10, 120].map((x) => (
          <g key={x}>
            <rect x={x} y="38" width="40" height="110" fill="#f1e6d3" stroke="#a5957c" strokeWidth="3" />
            <path d={`M${x - 4} 40 L${x + 20} 6 L${x + 44} 40 Z`} fill={roof} stroke={roofDark} strokeWidth="3" />
            <rect x={x + 14} y="70" width="12" height="18" rx="6" fill="#4b3d7a" />
          </g>
        ))}
        <path d="M58 60 L85 24 L112 60 Z" fill={roof} stroke={roofDark} strokeWidth="3" />
        <path d="M70 148 L70 112 Q85 96 100 112 L100 148 Z" fill="#6b3f1f" />
        <circle cx="85" cy="84" r="12" fill="#ffd23f" stroke="#c98400" strokeWidth="3" />
        <text x="85" y="90" textAnchor="middle" fontSize="15">👑</text>
        <path d="M85 24 L85 8" stroke="#6b3f1f" strokeWidth="3" />
        <path d="M85 8 L104 14 L85 20 Z" fill="#ffd23f" />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 150 140" className="mh-house-svg" aria-hidden="true">
      <ellipse cx="75" cy="132" rx="66" ry="8" fill="#000" opacity="0.18" />
      {/* ผนัง */}
      <rect x="18" y="62" width="114" height="66" fill="#f4e4c3" stroke="#b39466" strokeWidth="3" />
      <rect x="18" y="114" width="114" height="14" fill="#a7a7ad" />
      {[24, 44, 64, 84, 104, 124].map((x) => (
        <rect key={x} x={x} y="116" width="14" height="10" rx="2" fill="#8d8d95" />
      ))}
      {/* หลังคา */}
      <path d="M8 66 L42 18 L108 18 L142 66 Z" fill={roof} stroke={roofDark} strokeWidth="4" strokeLinejoin="round" />
      {[30, 42, 54].map((y) => (
        <path key={y} d={`M${18 + (66 - y) * 0.2} ${y} L${132 - (66 - y) * 0.2} ${y}`} stroke={roofDark} strokeWidth="2" opacity="0.5" />
      ))}
      <rect x="104" y="6" width="14" height="24" fill="#8d8d95" stroke="#6f6f78" strokeWidth="2" />
      {/* ประตูและหน้าต่าง */}
      <path d="M62 128 L62 96 Q75 84 88 96 L88 128 Z" fill={locked ? '#7a7a85' : '#8a5a33'} stroke="#5d3b1f" strokeWidth="2" />
      <circle cx="83" cy="112" r="2" fill="#ffd23f" />
      <rect x="28" y="78" width="22" height="20" rx="3" fill={locked ? '#9aa0ad' : '#9fd8ff'} stroke="#7a5a3a" strokeWidth="3" />
      <rect x="100" y="78" width="22" height="20" rx="3" fill={locked ? '#9aa0ad' : '#9fd8ff'} stroke="#7a5a3a" strokeWidth="3" />
      {/* ป้ายร้าน */}
      <rect x="52" y="64" width="46" height="24" rx="6" fill="#fff8dc" stroke="#7a5a3a" strokeWidth="2" />
      <text x="75" y="82" textAnchor="middle" fontSize="16">
        {icon}
      </text>
      {/* รั้วหน้าบ้าน */}
      {[6, 116].map((x) => (
        <g key={x}>
          <rect x={x} y="112" width="28" height="5" fill="#a86b3c" />
          <rect x={x + 2} y="104" width="6" height="22" rx="2" fill="#c98a52" />
          <rect x={x + 20} y="104" width="6" height="22" rx="2" fill="#c98a52" />
        </g>
      ))}
    </svg>
  )
}
