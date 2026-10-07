import { memo } from 'react'
import { BRIDGE, DECOR, ECO_LANE, ECO_LANE_WIDTH, RIVER, ROAD, ROAD_WIDTH, WORLD, type Tree } from '../data/town'

/**
 * ภาพเมืองเงินทองแบบมองจากด้านบน วาดด้วย SVG ทั้งหมด
 * พื้นหญ้า ถนนปูหิน แม่น้ำ รั้วไม้ สะพานไม้ ดอกไม้ พุ่มไม้ ก้อนหิน และเสาไฟ
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

/** รั้วริมแม่น้ำ: เว้นช่องกว้างตรงสะพาน */
const FENCE_RAILS: [number, number][] = [
  [10, BRIDGE.x - 30],
  [BRIDGE.x + BRIDGE.w + 30, WORLD.w - 10],
]
const FENCE = FENCE_RAILS.flatMap(([a, b]) => Array.from({ length: Math.floor((b - a) / 34) + 1 }, (_, i) => a + i * 34))

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
      <rect x="0" y={RIVER.top - 16} width={WORLD.w} height={RIVER.bottom - RIVER.top + 32} fill="#d9b98a" />
      <path d={wave(RIVER.top - 4, 5, 0)} stroke="#c9a06a" strokeWidth="10" fill="none" />
      <path d={wave(RIVER.bottom + 4, 5, 0)} stroke="#c9a06a" strokeWidth="10" fill="none" />
      <rect x="0" y={RIVER.top} width={WORLD.w} height={RIVER.bottom - RIVER.top} fill="url(#mh-water)" />
      <rect x="0" y={RIVER.top} width={WORLD.w} height="10" fill="#2f73b0" opacity="0.6" />
      <path d={wave(RIVER.bottom - 6, 4, 0)} stroke="#e8f6ff" strokeWidth="5" fill="none" opacity="0.65" />
      <path d={wave(RIVER.top + 40, 6, 0)} stroke="#8fd0ff" strokeWidth="4" fill="none" opacity="0.7" />
      <path d={wave(RIVER.top + 72, 5, 2)} stroke="#8fd0ff" strokeWidth="3" fill="none" opacity="0.5" />
      {LILIES.map((l, i) => (
        <g key={i} transform={`translate(${l.x} ${l.y})`}>
          <path d="M0 0 L12 -3 A12 12 0 1 1 12 3 Z" fill="#5dbb63" stroke="#3c8f44" strokeWidth="2" />
          {i % 3 === 0 && <circle cx="-2" cy="-2" r="4" fill="#ff9fc4" />}
        </g>
      ))}
      {/* รั้วไม้ริมแม่น้ำ (เว้นช่องตรงสะพาน) */}
      {FENCE.map((x) => (
        <g key={x}>
          <rect x={x} y={RIVER.top - 30} width="7" height="20" rx="2" fill="#c98a52" stroke="#8a5a33" strokeWidth="1.2" />
        </g>
      ))}
      {FENCE_RAILS.map(([a, b]) => (
        <g key={a}>
          <rect x={a} y={RIVER.top - 26} width={b - a} height="4" rx="2" fill="#a86b3c" />
          <rect x={a} y={RIVER.top - 18} width={b - a} height="4" rx="2" fill="#a86b3c" />
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
      {[BRIDGE.x - 2, BRIDGE.x + BRIDGE.w - 4].map((x) => (
        <rect key={x} x={x} y={top} width="6" height={h} rx="3" fill="#7a4a26" />
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
      <defs>
        <pattern id="mh-cobble" patternUnits="userSpaceOnUse" width="40" height="28">
          <rect width="40" height="28" fill="#c2a27c" />
          <rect x="1.5" y="1.5" width="17" height="11" rx="4" fill="#dcc29e" stroke="#a88a66" strokeWidth="1" />
          <rect x="21.5" y="1.5" width="17" height="11" rx="4" fill="#d3b892" stroke="#a88a66" strokeWidth="1" />
          <rect x="-8.5" y="15.5" width="17" height="11" rx="4" fill="#d6bb95" stroke="#a88a66" strokeWidth="1" />
          <rect x="11.5" y="15.5" width="17" height="11" rx="4" fill="#e0c8a5" stroke="#a88a66" strokeWidth="1" />
          <rect x="31.5" y="15.5" width="17" height="11" rx="4" fill="#d6bb95" stroke="#a88a66" strokeWidth="1" />
          <path d="M4 4 h8 M24 4 h6 M14 18 h8" stroke="#fff" strokeWidth="1.4" strokeLinecap="round" opacity="0.35" />
        </pattern>
        <pattern id="mh-grass" patternUnits="userSpaceOnUse" width="60" height="60">
          <rect width="60" height="60" fill="#7cc35a" />
          <circle cx="8" cy="12" r="1.6" fill="#6aae4a" />
          <circle cx="38" cy="30" r="1.4" fill="#8fd16a" />
          <circle cx="22" cy="48" r="1.6" fill="#6aae4a" />
          <circle cx="52" cy="6" r="1.2" fill="#8fd16a" />
          <circle cx="48" cy="52" r="1.4" fill="#6aae4a" />
        </pattern>
        <linearGradient id="mh-water" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3a86c8" />
          <stop offset="30%" stopColor="#4fa3e3" />
          <stop offset="100%" stopColor="#66b8ee" />
        </linearGradient>
      </defs>
      <rect width={WORLD.w} height={WORLD.h} fill="url(#mh-grass)" />
      {BLOTCHES.map((b, i) => (
        <ellipse key={i} cx={b.x} cy={b.y} rx={b.rx} ry={b.ry} fill={b.light ? '#8fd16a' : '#6db34e'} opacity="0.55" />
      ))}
      {TUFTS.map((t, i) => (
        <path key={i} d={`M${t.x} ${t.y} l3 -7 M${t.x + 5} ${t.y} l1 -9 M${t.x + 9} ${t.y} l-2 -6`} stroke="#5a9e43" strokeWidth="2" strokeLinecap="round" />
      ))}
      <Riverbank />
      {/* ถนนปูหิน: ขอบหญ้าเข้ม → ขอบหินคันถนน → ผิวหินก้อนกลม */}
      {/* ถนนรักษ์โลก: ทางดินไปแผงกาดและสวน */}
      <line x1={ECO_LANE[0].x} y1={ECO_LANE[0].y} x2={ECO_LANE[1].x} y2={ECO_LANE[1].y} stroke="#4f9140" strokeWidth={ECO_LANE_WIDTH + 18} strokeLinecap="round" opacity="0.6" />
      <line x1={ECO_LANE[0].x} y1={ECO_LANE[0].y} x2={ECO_LANE[1].x} y2={ECO_LANE[1].y} stroke="#c9a46f" strokeWidth={ECO_LANE_WIDTH} strokeLinecap="round" />
      <line x1={ECO_LANE[0].x} y1={ECO_LANE[0].y} x2={ECO_LANE[1].x} y2={ECO_LANE[1].y} stroke="#e2c48f" strokeWidth="6" strokeDasharray="14 18" strokeLinecap="round" />
      <polyline points={ROAD_POINTS} fill="none" stroke="#4f9140" strokeWidth={ROAD_WIDTH + 24} strokeLinejoin="round" strokeLinecap="round" opacity="0.7" />
      <polyline points={ROAD_POINTS} fill="none" stroke="#8f7a63" strokeWidth={ROAD_WIDTH + 10} strokeLinejoin="round" strokeLinecap="round" />
      <polyline points={ROAD_POINTS} fill="none" stroke="#b9a184" strokeWidth={ROAD_WIDTH + 4} strokeLinejoin="round" strokeLinecap="round" />
      <polyline points={ROAD_POINTS} fill="none" stroke="url(#mh-cobble)" strokeWidth={ROAD_WIDTH} strokeLinejoin="round" strokeLinecap="round" />
      <polyline points={ROAD_POINTS} fill="none" stroke="#fff" strokeWidth={ROAD_WIDTH - 40} strokeLinejoin="round" strokeLinecap="round" opacity="0.08" />
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
          <circle cx="0" cy="-52" r="16" fill="#fff3b0" opacity="0.18" />
        </g>
      ))}
    </svg>
  )
})

/** ต้นไม้หนึ่งต้น (เป็นชิ้นแยก จึงเรียงหน้า–หลังกับฮีโร่ได้ถูก)
 *  แบบ 0 ไม้พุ่มกลม · แบบ 1 สน · แบบ 2 ต้นไม้ผล */
export function TreeSprite({ tree }: { tree: Tree }) {
  const r = tree.r
  const w = r * 2 + 8
  const h = r * 2.5
  return (
    <div className="mh-tree-sprite" style={{ left: tree.x - w / 2, top: tree.y - h, width: w, height: h + 10, zIndex: Math.round(tree.y) }}>
      <svg viewBox={`${-w / 2} ${-h} ${w} ${h + 10}`} width={w} height={h + 10} aria-hidden="true">
        <ellipse cx={r * 0.12} cy="2" rx={r * 0.85} ry={r * 0.26} fill="#1e3c14" opacity="0.22" />
        <rect x={-r * 0.15} y={-r * 0.75} width={r * 0.3} height={r * 0.78} rx="3" fill="#8a5a33" />
        <rect x={-r * 0.15} y={-r * 0.75} width={r * 0.1} height={r * 0.78} rx="2" fill="#a9734a" />
        {tree.kind === 1 ? (
          <g>
            <path d={`M0 ${-h + 2} L${r * 0.62} ${-r * 1.45} L${-r * 0.62} ${-r * 1.45} Z`} fill="#3c8f4c" />
            <path d={`M0 ${-r * 1.85} L${r * 0.85} ${-r * 0.95} L${-r * 0.85} ${-r * 0.95} Z`} fill="#348043" />
            <path d={`M0 ${-r * 1.4} L${r} ${-r * 0.5} L${-r} ${-r * 0.5} Z`} fill="#2d7339" />
            <path d={`M0 ${-h + 2} L${-r * 0.62} ${-r * 1.45} L${-r * 0.2} ${-r * 1.45} Z M0 ${-r * 1.85} L${-r * 0.85} ${-r * 0.95} L${-r * 0.3} ${-r * 0.95} Z M0 ${-r * 1.4} L${-r} ${-r * 0.5} L${-r * 0.35} ${-r * 0.5} Z`} fill="#fff" opacity="0.12" />
          </g>
        ) : (
          <g>
            <circle cx={-r * 0.45} cy={-r * 1.05} r={r * 0.62} fill={tree.kind === 2 ? '#3f8f3a' : '#3a8f41'} />
            <circle cx={r * 0.45} cy={-r * 1.05} r={r * 0.62} fill={tree.kind === 2 ? '#3a8636' : '#33803b'} />
            <circle cx="0" cy={-r * 1.38} r={r * 0.8} fill={tree.kind === 2 ? '#56ad47' : '#4caf54'} />
            <circle cx={r * 0.25} cy={-r * 1.2} r={r * 0.55} fill="#000" opacity="0.07" />
            <circle cx={-r * 0.3} cy={-r * 1.68} r={r * 0.32} fill="#8ad97c" opacity="0.75" />
            <circle cx={-r * 0.62} cy={-r * 1.12} r={r * 0.16} fill="#8ad97c" opacity="0.5" />
            {tree.kind === 2 &&
              [
                [-0.4, -1.2],
                [0.35, -1.0],
                [0.1, -1.55],
                [-0.05, -0.95],
                [0.55, -1.4],
              ].map(([fx, fy], i) => <circle key={i} cx={r * fx} cy={r * fy} r={r * 0.09 + 1.2} fill={i % 2 ? '#ff7b54' : '#ffcf3f'} stroke="rgba(0,0,0,0.15)" strokeWidth="0.8" />)}
          </g>
        )}
      </svg>
    </div>
  )
}
