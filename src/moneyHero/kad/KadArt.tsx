import { useId } from 'react'
import type { EcoMoney } from './kadData'

/**
 * ภาพวาด SVG ของชุดกาดรักษ์โลก (ขยะ สินค้า เงินจำลอง ตราภารกิจ)
 * วาดเองทั้งหมด พิมพ์ออกมาคมทุกขนาด ใช้ได้ทั้งบนจอและบนกระดาษ A4
 */

const INK = '#2b2350'

/* ------------------------------------------------------------------ */
/* ขยะ                                                                 */
/* ------------------------------------------------------------------ */

export function TrashArt({ id }: { id: string }) {
  let art: JSX.Element
  switch (id) {
    case 'bottle':
      art = (
        <g strokeLinejoin="round">
          <rect x="41" y="6" width="18" height="10" rx="2.5" fill="#1c7ed6" stroke={INK} strokeWidth="2.5" />
          <path d="M40 16 h20 l1 8 q13 6 13 20 v40 q0 9 -9 9 h-30 q-9 0 -9 -9 v-40 q0 -14 13 -20 z" fill="#d0ebff" stroke={INK} strokeWidth="2.5" />
          <rect x="26" y="50" width="48" height="18" fill="#74c0fc" opacity="0.75" />
          <path d="M34 42 v38" stroke="#fff" strokeWidth="4" strokeLinecap="round" opacity="0.9" />
          <path d="M30 76 q20 4 40 0" stroke="#a5d8ff" strokeWidth="2" fill="none" />
        </g>
      )
      break
    case 'can':
      art = (
        <g strokeLinejoin="round">
          <path d="M27 20 v62 q0 7 23 7 q23 0 23 -7 v-62" fill="#e03131" stroke={INK} strokeWidth="2.5" />
          <ellipse cx="50" cy="20" rx="23" ry="7" fill="#ced4da" stroke={INK} strokeWidth="2.5" />
          <ellipse cx="50" cy="20" rx="16" ry="4" fill="#adb5bd" />
          <path d="M46 18 h10 a3 3 0 0 1 0 5 h-10 z" fill="#868e96" />
          <path d="M27 46 q12 -8 23 0 q12 8 23 0 v12 q-12 8 -23 0 q-11 -8 -23 0 z" fill="#fff" />
          <path d="M33 30 v48" stroke="#fff" strokeWidth="4" strokeLinecap="round" opacity="0.55" />
          <path d="M27 82 q23 8 46 0" stroke="#adb5bd" strokeWidth="3" fill="none" />
        </g>
      )
      break
    case 'box':
      art = (
        <g strokeLinejoin="round">
          <path d="M14 38 L50 26 L86 38 L50 50 Z" fill="#e6b980" stroke={INK} strokeWidth="2.5" />
          <path d="M14 38 L50 50 V88 L14 76 Z" fill="#d9a066" stroke={INK} strokeWidth="2.5" />
          <path d="M86 38 L50 50 V88 L86 76 Z" fill="#b8834a" stroke={INK} strokeWidth="2.5" />
          <path d="M14 38 L4 26 L40 14 L50 26 Z" fill="#f0cb99" stroke={INK} strokeWidth="2.5" />
          <path d="M86 38 L96 26 L60 14 L50 26 Z" fill="#f0cb99" stroke={INK} strokeWidth="2.5" />
          <path d="M32 44 L68 32" stroke="#f8e0b8" strokeWidth="5" opacity="0.8" />
          <text x="31" y="74" fontSize="20" textAnchor="middle" fill="#7a4e1d" fontWeight="700">
            ♻
          </text>
        </g>
      )
      break
    case 'paper':
      art = (
        <g strokeLinejoin="round">
          <rect x="22" y="22" width="52" height="64" rx="3" fill="#f1f3f5" stroke={INK} strokeWidth="2.5" transform="rotate(-8 48 54)" />
          <rect x="26" y="18" width="52" height="64" rx="3" fill="#fff" stroke={INK} strokeWidth="2.5" transform="rotate(5 52 50)" />
          {[32, 40, 48, 56, 64].map((y) => (
            <path key={y} d={`M34 ${y} h34`} stroke="#a5d8ff" strokeWidth="2.2" transform="rotate(5 52 50)" />
          ))}
          <path d="M18 54 h66" stroke="#c92a2a" strokeWidth="3.5" />
          <path d="M50 54 q-10 -12 -16 -4 q6 8 16 4 q10 -12 16 -4 q-6 8 -16 4" fill="#ff8787" stroke="#c92a2a" strokeWidth="2" />
        </g>
      )
      break
    case 'cap':
      art = (
        <g strokeLinejoin="round">
          {[
            [30, 58, '#fa5252'],
            [66, 60, '#228be6'],
            [48, 34, '#40c057'],
            [50, 76, '#fab005'],
          ].map(([x, y, c]) => (
            <g key={String(c)} transform={`translate(${x} ${y})`}>
              <ellipse cx="0" cy="6" rx="15" ry="6" fill={String(c)} stroke={INK} strokeWidth="2.2" />
              <rect x="-15" y="-4" width="30" height="10" fill={String(c)} />
              <ellipse cx="0" cy="-4" rx="15" ry="6" fill="#fff" opacity="0.35" stroke={INK} strokeWidth="2.2" />
              <path d="M-15 -4 v10 M15 -4 v10" stroke={INK} strokeWidth="2.2" />
              {[-10, -5, 0, 5, 10].map((dx) => (
                <path key={dx} d={`M${dx} 1 v7`} stroke="#fff" strokeWidth="1.4" opacity="0.6" />
              ))}
            </g>
          ))}
        </g>
      )
      break
    default:
      art = (
        <g strokeLinejoin="round">
          <rect x="40" y="8" width="20" height="12" rx="3" fill="#7048e8" stroke={INK} strokeWidth="2.5" />
          <path d="M60 12 h10 v5 h-10" fill="#7048e8" stroke={INK} strokeWidth="2.5" />
          <path d="M34 20 h32 q8 0 9 10 l2 50 q0 10 -10 10 h-34 q-10 0 -10 -10 l2 -50 q1 -10 9 -10 z" fill="#e5dbff" stroke={INK} strokeWidth="2.5" />
          <ellipse cx="50" cy="56" rx="16" ry="14" fill="#fff" stroke="#b197fc" strokeWidth="2" />
          <circle cx="50" cy="56" r="6" fill="#f783ac" />
          {[0, 72, 144, 216, 288].map((a) => (
            <circle key={a} cx={50 + Math.cos((a * Math.PI) / 180) * 8} cy={56 + Math.sin((a * Math.PI) / 180) * 8} r="3.4" fill="#faa2c1" />
          ))}
          <path d="M33 30 v44" stroke="#fff" strokeWidth="4" strokeLinecap="round" opacity="0.9" />
        </g>
      )
  }
  return (
    <svg viewBox="0 0 100 100" className="kad-art" aria-hidden="true">
      <ellipse cx="50" cy="94" rx="34" ry="4" fill={INK} opacity="0.12" />
      {art}
    </svg>
  )
}

/* ------------------------------------------------------------------ */
/* สินค้าจากวัสดุเหลือใช้                                                */
/* ------------------------------------------------------------------ */

function Face({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <circle cx="-6" cy="0" r="2.4" fill={INK} />
      <circle cx="6" cy="0" r="2.4" fill={INK} />
      <circle cx="-5.2" cy="-0.8" r="0.8" fill="#fff" />
      <circle cx="6.8" cy="-0.8" r="0.8" fill="#fff" />
      <path d="M-3 4 q3 3 6 0" stroke={INK} strokeWidth="1.6" fill="none" strokeLinecap="round" />
      <ellipse cx="-10" cy="4" rx="2.6" ry="1.6" fill="#ff8fb3" opacity="0.8" />
      <ellipse cx="10" cy="4" rx="2.6" ry="1.6" fill="#ff8fb3" opacity="0.8" />
    </g>
  )
}

function Flower({ x, y, c, r = 7 }: { x: number; y: number; c: string; r?: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      {[0, 72, 144, 216, 288].map((a) => (
        <circle key={a} cx={Math.cos((a * Math.PI) / 180) * r * 0.75} cy={Math.sin((a * Math.PI) / 180) * r * 0.75} r={r * 0.6} fill={c} stroke={INK} strokeWidth="1.2" />
      ))}
      <circle r={r * 0.45} fill="#ffd43b" stroke={INK} strokeWidth="1.2" />
    </g>
  )
}

export function ProductArt({ id }: { id: string }) {
  let art: JSX.Element
  switch (id) {
    case 'pot':
      art = (
        <g strokeLinejoin="round">
          <path d="M44 46 q-14 -18 -4 -30 q10 10 4 30" fill="#69db7c" stroke={INK} strokeWidth="2" />
          <path d="M56 46 q14 -18 4 -30 q-10 10 -4 30" fill="#8ce99a" stroke={INK} strokeWidth="2" />
          <path d="M50 48 v-26" stroke="#2f9e44" strokeWidth="3" />
          <path d="M24 46 h52 l-6 42 q-1 4 -5 4 h-30 q-4 0 -5 -4 z" fill="#a5d8ff" stroke={INK} strokeWidth="2.5" />
          <path d="M24 46 h52 v6 h-52 z" fill="#8d6e63" stroke={INK} strokeWidth="2.5" />
          <path d="M32 58 v26" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" opacity="0.8" />
          <Face x={52} y={68} />
        </g>
      )
      break
    case 'vase':
      art = (
        <g strokeLinejoin="round">
          <path d="M44 40 q-10 -14 -16 -20 M50 40 v-26 M56 40 q8 -14 16 -18" stroke="#2f9e44" strokeWidth="2.5" fill="none" />
          <Flower x={28} y={20} c="#ff8fb3" />
          <Flower x={50} y={12} c="#b197fc" />
          <Flower x={72} y={22} c="#ffa94d" />
          <path d="M42 38 h16 v8 q14 8 14 24 q0 20 -22 20 q-22 0 -22 -20 q0 -16 14 -24 z" fill="#c5f6fa" stroke={INK} strokeWidth="2.5" opacity="0.95" />
          <path d="M30 66 q20 8 40 0" stroke="#3bc9db" strokeWidth="3" fill="none" />
          <circle cx="40" cy="74" r="3" fill="#ff8fb3" />
          <circle cx="50" cy="78" r="3" fill="#ffd43b" />
          <circle cx="60" cy="74" r="3" fill="#b197fc" />
        </g>
      )
      break
    case 'pencil':
      art = (
        <g strokeLinejoin="round">
          {[
            [34, '#fa5252', -12],
            [46, '#fab005', -4],
            [56, '#40c057', 5],
            [66, '#228be6', 12],
          ].map(([x, c, r]) => (
            <g key={String(c)} transform={`rotate(${r} ${x} 50)`}>
              <rect x={Number(x) - 4} y="10" width="8" height="40" fill={String(c)} stroke={INK} strokeWidth="1.8" />
              <path d={`M${Number(x) - 4} 10 l4 -8 l4 8 z`} fill="#ffe8cc" stroke={INK} strokeWidth="1.8" />
              <path d={`M${Number(x) - 1.4} 4.6 l1.4 -2.6 l1.4 2.6 z`} fill={INK} />
            </g>
          ))}
          <path d="M26 40 v46 q0 6 24 6 q24 0 24 -6 v-46" fill="#ffd8a8" stroke={INK} strokeWidth="2.5" />
          <ellipse cx="50" cy="40" rx="24" ry="6" fill="#fff4e6" stroke={INK} strokeWidth="2.5" />
          {[52, 62, 72, 82].map((y, i) => (
            <path key={y} d={`M26 ${y} q24 6 48 0`} stroke={['#ff8787', '#74c0fc', '#8ce99a', '#ffd43b'][i]} strokeWidth="3.5" fill="none" />
          ))}
        </g>
      )
      break
    case 'piggy':
      art = (
        <g strokeLinejoin="round">
          <rect x="30" y="68" width="10" height="16" rx="3" fill="#f06595" stroke={INK} strokeWidth="2" />
          <rect x="60" y="68" width="10" height="16" rx="3" fill="#f06595" stroke={INK} strokeWidth="2" />
          <path d="M22 54 q0 -22 30 -22 h14 q14 0 14 22 q0 22 -30 22 h-6 q-22 0 -22 -22 z" fill="#ffc9de" stroke={INK} strokeWidth="2.5" />
          <rect x="80" y="44" width="10" height="20" rx="3" fill="#f06595" stroke={INK} strokeWidth="2.5" />
          <circle cx="85" cy="50" r="1.6" fill={INK} />
          <circle cx="85" cy="58" r="1.6" fill={INK} />
          <path d="M60 33 l4 -12 l8 12 z" fill="#f06595" stroke={INK} strokeWidth="2" />
          <rect x="40" y="30" width="16" height="4" rx="2" fill={INK} />
          <circle cx="70" cy="46" r="2.6" fill={INK} />
          <ellipse cx="68" cy="56" rx="3.4" ry="2" fill="#ff8fb3" />
          <path d="M22 50 q-8 -2 -6 -8" stroke={INK} strokeWidth="2" fill="none" strokeLinecap="round" />
          <path d="M30 46 q8 -6 16 -6" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity="0.8" />
          <circle cx="48" cy="18" r="7" fill="#ffd43b" stroke="#b07d00" strokeWidth="1.8" />
          <text x="48" y="21.5" fontSize="9" textAnchor="middle" fill="#b07d00" fontWeight="700">
            ฿
          </text>
        </g>
      )
      break
    case 'mobile':
      art = (
        <g strokeLinejoin="round">
          <path d="M14 14 q36 -8 72 0" stroke="#8d6e63" strokeWidth="4" fill="none" strokeLinecap="round" />
          <path d="M50 4 v6" stroke={INK} strokeWidth="1.5" />
          {[
            [22, 50, '#fa5252'],
            [36, 66, '#fab005'],
            [50, 44, '#40c057'],
            [64, 70, '#228be6'],
            [78, 54, '#be4bdb'],
          ].map(([x, y, c]) => (
            <g key={String(c)}>
              <path d={`M${x} 13 V${Number(y) - 8}`} stroke={INK} strokeWidth="1.2" />
              <circle cx={x} cy={y} r="8" fill={String(c)} stroke={INK} strokeWidth="2" />
              <circle cx={x} cy={y} r="4.5" fill="#fff" opacity="0.5" />
            </g>
          ))}
          <g transform="translate(50 84)">
            <path d="M0 0 q-14 -12 -16 0 q2 10 16 0 q14 -12 16 0 q-2 10 -16 0" fill="#ffa94d" stroke={INK} strokeWidth="1.8" />
            <path d="M0 -6 v12" stroke={INK} strokeWidth="2.4" strokeLinecap="round" />
          </g>
          <path d="M50 52 V78" stroke={INK} strokeWidth="1.2" />
        </g>
      )
      break
    case 'frame':
      art = (
        <g strokeLinejoin="round">
          <rect x="14" y="16" width="72" height="70" rx="4" fill="#d9a066" stroke={INK} strokeWidth="2.5" />
          <rect x="24" y="26" width="52" height="50" fill="#e7f5ff" stroke={INK} strokeWidth="2" />
          <path d="M24 64 q14 -12 26 0 q14 -14 26 -2 v14 h-52 z" fill="#8ce99a" />
          <circle cx="62" cy="38" r="6" fill="#ffd43b" />
          <path d="M38 64 v-12" stroke="#8d6e63" strokeWidth="3" />
          <circle cx="38" cy="48" r="7" fill="#40c057" />
          {[
            [16, 18],
            [84, 18],
            [16, 84],
            [84, 84],
          ].map(([x, y]) => (
            <circle key={`${x}${y}`} cx={x} cy={y} r="4" fill={['#ff8fb3', '#74c0fc', '#ffd43b', '#b197fc'][(x + y) % 4]} stroke={INK} strokeWidth="1.5" />
          ))}
        </g>
      )
      break
    case 'notebook':
      art = (
        <g strokeLinejoin="round">
          <rect x="24" y="12" width="56" height="76" rx="4" fill="#fff" stroke={INK} strokeWidth="2.5" transform="rotate(4 52 50)" />
          <rect x="20" y="12" width="56" height="76" rx="4" fill="#c0a27a" stroke={INK} strokeWidth="2.5" />
          {[20, 32, 44, 56, 68, 80].map((y) => (
            <path key={y} d={`M16 ${y} h10`} stroke="#495057" strokeWidth="2.5" strokeLinecap="round" />
          ))}
          <rect x="34" y="28" width="34" height="18" rx="3" fill="#fff4e6" stroke={INK} strokeWidth="1.8" />
          <path d="M40 37 h22" stroke="#adb5bd" strokeWidth="2" />
          <path d="M52 76 q-12 -4 -10 -18 q14 2 10 18 z" fill="#69db7c" stroke={INK} strokeWidth="1.8" />
          <path d="M52 76 q-4 -8 -8 -14" stroke="#2f9e44" strokeWidth="1.4" fill="none" />
        </g>
      )
      break
    case 'bag':
      art = (
        <g strokeLinejoin="round">
          <path d="M38 34 q0 -18 12 -18 q12 0 12 18" stroke="#8d6e63" strokeWidth="4" fill="none" />
          <path d="M22 34 h56 l4 54 h-64 z" fill="#d9a066" stroke={INK} strokeWidth="2.5" />
          <path d="M22 34 l-4 54 M78 34 l4 54" stroke={INK} strokeWidth="2" />
          <path d="M50 74 q-14 -10 -12 -18 q2 -8 12 -2 q10 -6 12 2 q2 8 -12 18 z" fill="#ff6b6b" stroke={INK} strokeWidth="2" />
          <path d="M26 42 h48" stroke="#b8834a" strokeWidth="2" strokeDasharray="4 3" />
        </g>
      )
      break
    case 'match':
      art = (
        <g strokeLinejoin="round">
          {[
            [16, 14, '#e7f5ff', '🍎'],
            [52, 14, '#4dabf7', ''],
            [16, 52, '#4dabf7', ''],
            [52, 52, '#e7f5ff', '🍎'],
          ].map(([x, y, c, e]) => (
            <g key={`${x}${y}`}>
              <rect x={x} y={y} width="32" height="34" rx="5" fill={String(c)} stroke={INK} strokeWidth="2.5" />
              {e ? (
                <text x={Number(x) + 16} y={Number(y) + 24} fontSize="18" textAnchor="middle">
                  {e}
                </text>
              ) : (
                <text x={Number(x) + 16} y={Number(y) + 24} fontSize="18" textAnchor="middle" fill="#fff" fontWeight="700">
                  ?
                </text>
              )}
            </g>
          ))}
        </g>
      )
      break
    case 'dice':
      art = (
        <g strokeLinejoin="round">
          <path d="M50 10 L86 26 L50 42 L14 26 Z" fill="#fff" stroke={INK} strokeWidth="2.5" />
          <path d="M14 26 L50 42 V88 L14 72 Z" fill="#ffe3e3" stroke={INK} strokeWidth="2.5" />
          <path d="M86 26 L50 42 V88 L86 72 Z" fill="#ffc9c9" stroke={INK} strokeWidth="2.5" />
          <ellipse cx="50" cy="26" rx="5" ry="3" fill="#e03131" />
          {[
            [24, 42],
            [40, 64],
            [32, 53],
          ].map(([x, y]) => (
            <ellipse key={`${x}${y}`} cx={x} cy={y} rx="3.4" ry="4" fill={INK} />
          ))}
          {[
            [60, 50],
            [76, 44],
            [60, 72],
            [76, 66],
          ].map(([x, y]) => (
            <ellipse key={`${x}${y}`} cx={x} cy={y} rx="3.4" ry="4" fill={INK} />
          ))}
        </g>
      )
      break
    case 'animal':
      art = (
        <g strokeLinejoin="round">
          <path d="M78 50 l14 -16 v32 z" fill="#ffa94d" stroke={INK} strokeWidth="2.5" />
          <ellipse cx="46" cy="50" rx="36" ry="24" fill="#ffc078" stroke={INK} strokeWidth="2.5" />
          <path d="M44 27 q8 -12 18 -2" fill="#ffa94d" stroke={INK} strokeWidth="2" />
          {[44, 56, 68].map((x) => (
            <path key={x} d={`M${x} 30 q-6 20 0 40`} stroke="#e8590c" strokeWidth="3" fill="none" opacity="0.7" />
          ))}
          <circle cx="24" cy="46" r="5" fill="#fff" stroke={INK} strokeWidth="2" />
          <circle cx="23" cy="46" r="2.4" fill={INK} />
          <path d="M14 56 q5 3 9 0" stroke={INK} strokeWidth="2" fill="none" strokeLinecap="round" />
          <ellipse cx="30" cy="56" rx="3" ry="1.8" fill="#ff8fb3" />
          <circle cx="8" cy="34" r="3" fill="#a5d8ff" stroke={INK} strokeWidth="1.2" />
          <circle cx="4" cy="24" r="2" fill="#a5d8ff" stroke={INK} strokeWidth="1.2" />
        </g>
      )
      break
    default:
      art = (
        <g strokeLinejoin="round">
          <path d="M18 88 q32 -12 64 0 v4 h-64 z" fill="#8d6e63" stroke={INK} strokeWidth="2.5" />
          <path d="M66 82 q-10 -22 4 -34 q8 14 -4 34" fill="#69db7c" stroke={INK} strokeWidth="2" />
          <path d="M70 82 q12 -16 22 -14 q-4 14 -22 14" fill="#8ce99a" stroke={INK} strokeWidth="2" />
          <rect x="34" y="40" width="10" height="48" rx="5" fill="#f4d29c" stroke={INK} strokeWidth="2.5" />
          <rect x="16" y="14" width="46" height="30" rx="8" fill="#f4d29c" stroke={INK} strokeWidth="2.5" />
          <text x="39" y="34" fontSize="12" textAnchor="middle" fill="#2f9e44" fontWeight="700" fontFamily="Kanit, sans-serif">
            ผักชี
          </text>
        </g>
      )
  }
  return (
    <svg viewBox="0 0 100 100" className="kad-art" aria-hidden="true">
      <ellipse cx="50" cy="95" rx="32" ry="3.5" fill={INK} opacity="0.1" />
      {art}
    </svg>
  )
}

/* ------------------------------------------------------------------ */
/* เงินจำลองของกาด (ออกแบบใหม่ ไม่เลียนแบบเงินจริง)                     */
/* ------------------------------------------------------------------ */

/** ลวดลายประจำเงินแต่ละชนิด วาดในกรอบ 40×40 */
function Motif({ kind, color }: { kind: EcoMoney['motif']; color: string }) {
  switch (kind) {
    case 'leaf':
      return (
        <g>
          <path d="M20 36 q-16 -10 -8 -28 q18 2 14 26 z" fill={color} stroke={INK} strokeWidth="1.6" />
          <path d="M20 36 q-4 -12 -2 -22" stroke={INK} strokeWidth="1.4" fill="none" />
          <path d="M22 36 q10 -6 14 -16 q-12 -2 -16 12" fill={color} stroke={INK} strokeWidth="1.6" opacity="0.85" />
        </g>
      )
    case 'drop':
      return <path d="M20 4 q14 16 14 24 a14 14 0 0 1 -28 0 q0 -8 14 -24 z" fill={color} stroke={INK} strokeWidth="1.6" />
    case 'sun':
      return (
        <g>
          {Array.from({ length: 8 }, (_, i) => (
            <path key={i} d="M20 2 v6" stroke={INK} strokeWidth="2.4" strokeLinecap="round" transform={`rotate(${i * 45} 20 20)`} />
          ))}
          <circle cx="20" cy="20" r="10" fill={color} stroke={INK} strokeWidth="1.6" />
        </g>
      )
    case 'flower':
      return (
        <g>
          {[0, 72, 144, 216, 288].map((a) => (
            <circle key={a} cx={20 + Math.cos((a * Math.PI) / 180) * 8} cy={20 + Math.sin((a * Math.PI) / 180) * 8} r="7" fill={color} stroke={INK} strokeWidth="1.4" />
          ))}
          <circle cx="20" cy="20" r="5" fill="#ffd43b" stroke={INK} strokeWidth="1.4" />
        </g>
      )
    case 'tree':
      return (
        <g>
          <rect x="17" y="24" width="6" height="14" fill="#8d6e63" stroke={INK} strokeWidth="1.4" />
          <circle cx="20" cy="16" r="12" fill={color} stroke={INK} strokeWidth="1.6" />
          <circle cx="13" cy="22" r="7" fill={color} stroke={INK} strokeWidth="1.6" />
          <circle cx="27" cy="22" r="7" fill={color} stroke={INK} strokeWidth="1.6" />
        </g>
      )
    case 'bee':
      return (
        <g>
          <ellipse cx="14" cy="14" rx="7" ry="5" fill="#fff" stroke={INK} strokeWidth="1.4" opacity="0.9" />
          <ellipse cx="26" cy="14" rx="7" ry="5" fill="#fff" stroke={INK} strokeWidth="1.4" opacity="0.9" />
          <ellipse cx="20" cy="24" rx="12" ry="9" fill={color} stroke={INK} strokeWidth="1.6" />
          <path d="M16 16 v16 M23 16 v16" stroke={INK} strokeWidth="3" />
          <circle cx="30" cy="22" r="1.6" fill={INK} />
        </g>
      )
    case 'bird':
      return (
        <g>
          <path d="M8 26 l-6 -2 l4 6 z" fill={color} stroke={INK} strokeWidth="1.4" strokeLinejoin="round" />
          <ellipse cx="18" cy="26" rx="12" ry="9" fill={color} stroke={INK} strokeWidth="1.6" />
          <circle cx="28" cy="15" r="8" fill={color} stroke={INK} strokeWidth="1.6" />
          <path d="M12 24 q6 -8 12 2 q-6 4 -12 -2 z" fill="#fff" opacity="0.7" stroke={INK} strokeWidth="1.2" />
          <circle cx="30" cy="13.5" r="1.8" fill={INK} />
          <path d="M35 15 l6 1.5 l-6 2.5 z" fill="#ffa94d" stroke={INK} strokeWidth="1" strokeLinejoin="round" />
          <ellipse cx="25" cy="18.5" rx="2" ry="1.2" fill="#ff8fb3" />
        </g>
      )
    default:
      return <RecycleMark x={0} y={0} size={40} color={color} />
  }
}

/** สัญลักษณ์รีไซเคิล ♻ (บังคับแบบตัวอักษร ไม่ใช่อีโมจิ จะได้ใส่สีเองได้) */
export function RecycleMark({ x = 0, y = 0, size = 40, color = '#2f9e44' }: { x?: number; y?: number; size?: number; color?: string }) {
  return (
    <text x={x + size / 2} y={y + size * 0.86} fontSize={size} textAnchor="middle" fill={color} fontWeight="700">
      {'\u267B\uFE0E'}
    </text>
  )
}

export function EcoCoin({ money }: { money: EcoMoney }) {
  const uid = useId().replace(/:/g, '')
  const g = `kc-${uid}`
  const satang = money.value < 100
  const big = satang ? String(money.value) : String(money.value / 100)
  return (
    <svg viewBox="0 0 100 100" className="kad-coin" role="img" aria-label={`เหรียญจำลอง ${money.label}`}>
      <defs>
        <radialGradient id={g} cx="0.35" cy="0.3" r="0.8">
          <stop offset="0" stopColor="#fff" stopOpacity="0.8" />
          <stop offset="0.35" stopColor={money.color} />
          <stop offset="1" stopColor={money.dark} />
        </radialGradient>
      </defs>
      <circle cx="50" cy="50" r="47" fill={money.dark} />
      <circle cx="50" cy="50" r="43" fill={`url(#${g})`} />
      <circle cx="50" cy="50" r="36" fill="none" stroke="#fff" strokeWidth="1.6" strokeDasharray="2 3" opacity="0.9" />
      <g transform="translate(40 12) scale(0.5)">
        <Motif kind={money.motif} color="#fff" />
      </g>
      <text x="50" y="62" fontSize={big.length > 1 ? 30 : 36} textAnchor="middle" fontWeight="800" fill={INK} fontFamily="Kanit, sans-serif">
        {big}
      </text>
      <text x="50" y="76" fontSize="9.5" textAnchor="middle" fontWeight="700" fill={INK} fontFamily="Kanit, sans-serif">
        {satang ? 'สตางค์' : 'บาท'}
      </text>
      <text x="50" y="88" fontSize="6.5" textAnchor="middle" fill="#fff" stroke={money.dark} strokeWidth="0.9" paintOrder="stroke" fontWeight="700" fontFamily="Kanit, sans-serif">
        กาดรักษ์โลก
      </text>
    </svg>
  )
}

export function EcoNote({ money }: { money: EcoMoney }) {
  const uid = useId().replace(/:/g, '')
  const g = `kn-${uid}`
  const p = `kp-${uid}`
  const baht = String(money.value / 100)
  return (
    <svg viewBox="0 0 200 96" className="kad-note" role="img" aria-label={`ธนบัตรจำลอง ${money.label}`}>
      <defs>
        <linearGradient id={g} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff" />
          <stop offset="0.5" stopColor={money.color} />
          <stop offset="1" stopColor={money.color} />
        </linearGradient>
        <pattern id={p} width="16" height="16" patternUnits="userSpaceOnUse">
          <path d="M8 13 q-6 -4 -3 -10 q7 1 3 10 z" fill="#fff" opacity="0.25" />
        </pattern>
      </defs>
      <rect x="1" y="1" width="198" height="94" rx="8" fill={money.dark} />
      <rect x="5" y="5" width="190" height="86" rx="6" fill={`url(#${g})`} />
      <rect x="5" y="5" width="190" height="86" rx="6" fill={`url(#${p})`} />
      <rect x="10" y="10" width="180" height="79" rx="5" fill="none" stroke="#fff" strokeWidth="1.5" strokeDasharray="5 3" />
      {/* วงกลมลวดลายด้านซ้าย */}
      <circle cx="46" cy="50" r="27" fill="#fff" opacity="0.85" stroke={money.dark} strokeWidth="2" />
      <g transform="translate(24 28) scale(1.1)">
        <Motif kind={money.motif} color={money.color} />
      </g>
      <text x="128" y="34" fontSize="9.5" textAnchor="middle" fontWeight="700" fill={INK} fontFamily="Kanit, sans-serif">
        เงินกาดรักษ์โลก ป.3
      </text>
      <text x="128" y="68" fontSize="34" textAnchor="middle" fontWeight="800" fill={INK} fontFamily="Kanit, sans-serif">
        {baht}
      </text>
      <text x="128" y="78" fontSize="9" textAnchor="middle" fontWeight="700" fill={INK} fontFamily="Kanit, sans-serif">
        บาท
      </text>
      <text x="100" y="86" fontSize="5.4" textAnchor="middle" fill={INK} fontFamily="Kanit, sans-serif" opacity="0.85">
        เงินจำลองสำหรับเล่นในห้องเรียนเท่านั้น ใช้จริงไม่ได้
      </text>
      <text x="18" y="21" fontSize="10" fontWeight="800" fill={INK} fontFamily="Kanit, sans-serif">
        {baht}
      </text>
      <text x="182" y="21" fontSize="10" fontWeight="800" textAnchor="end" fill={INK} fontFamily="Kanit, sans-serif">
        {baht}
      </text>
      <RecycleMark x={166} y={60} size={16} color={money.dark} />
    </svg>
  )
}

/* ------------------------------------------------------------------ */
/* ตราภารกิจ                                                           */
/* ------------------------------------------------------------------ */

export function MissionBadgeArt({ icon, color }: { icon: string; color: string }) {
  const points = Array.from({ length: 32 }, (_, i) => {
    const r = i % 2 === 0 ? 48 : 43
    const a = (Math.PI / 16) * i
    return `${(50 + Math.cos(a) * r).toFixed(1)},${(50 + Math.sin(a) * r).toFixed(1)}`
  }).join(' ')
  return (
    <svg viewBox="0 0 100 100" className="kad-badge-art" aria-hidden="true">
      <polygon points={points} fill={color} stroke={INK} strokeWidth="2" strokeLinejoin="round" />
      <circle cx="50" cy="50" r="34" fill="#fff" stroke={INK} strokeWidth="2" />
      <circle cx="50" cy="50" r="29" fill="none" stroke={color} strokeWidth="2" strokeDasharray="3 3" />
      <text x="50" y="62" fontSize="34" textAnchor="middle">
        {icon}
      </text>
    </svg>
  )
}
