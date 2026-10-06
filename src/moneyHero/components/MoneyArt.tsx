import { useId } from 'react'
import type { DenomId } from '../engine/types'
import { denom } from '../data/denominations'

/**
 * เหรียญและธนบัตรไทยแบบการ์ตูน วาดด้วย SVG
 *
 * เหรียญ: ขอบหยัก ขอบนูน ตัวเลขนูน แสงสะท้อน · 10 บาทเป็นสองสี (วงนอกเงิน ในทอง)
 * ธนบัตร: สีตามของจริง ลายเส้นพื้น ซุ้มรูปเจดีย์ แถบความปลอดภัย และตัวเลขมุม
 * ตั้งใจให้ "จำได้ว่าเป็นเงินชนิดไหน" แต่เห็นชัดว่าเป็นของเล่น ไม่ใช่ภาพเงินจริง
 */

function useGid() {
  const base = useId().replace(/[^a-zA-Z0-9]/g, '')
  return (n: string) => `m${base}${n}`
}

/** ปรับความสว่างของสี hex (+ สว่างขึ้น, − มืดลง) */
function shade(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16)
  const f = (c: number) => Math.max(0, Math.min(255, Math.round(c + (amt > 0 ? (255 - c) * amt : c * amt))))
  const r = f((n >> 16) & 255)
  const g = f((n >> 8) & 255)
  const b = f(n & 255)
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`
}

export function CoinSvg({ id }: { id: DenomId }) {
  const d = denom(id)
  const g = useGid()
  const bimetal = id === 'b10'
  const inner = bimetal ? '#f3c84b' : d.color
  const ring = bimetal ? '#d9dee6' : d.color
  const satang = d.unit === 'สตางค์'
  return (
    <svg viewBox="0 0 100 100" className="mh-money-svg" aria-hidden="true">
      <defs>
        <radialGradient id={g('face')} cx="36%" cy="30%" r="80%">
          <stop offset="0%" stopColor={shade(inner, 0.65)} />
          <stop offset="45%" stopColor={inner} />
          <stop offset="100%" stopColor={shade(inner, -0.28)} />
        </radialGradient>
        <radialGradient id={g('ring')} cx="36%" cy="30%" r="85%">
          <stop offset="0%" stopColor={shade(ring, 0.6)} />
          <stop offset="55%" stopColor={ring} />
          <stop offset="100%" stopColor={shade(ring, -0.3)} />
        </radialGradient>
        <path id={g('arc')} d="M18 52 A32 32 0 0 1 82 52" />
      </defs>
      {/* เงาบนพื้น */}
      <ellipse cx="51" cy="54" rx="47" ry="47" fill="rgba(43,35,80,0.22)" />
      {/* ขอบหยัก */}
      <circle cx="50" cy="50" r="47" fill={shade(bimetal ? ring : d.edge, -0.05)} />
      <circle cx="50" cy="50" r="45.6" fill="none" stroke={shade(bimetal ? ring : d.edge, -0.35)} strokeWidth="2.6" strokeDasharray="1.3 1.3" opacity="0.7" />
      {/* วงนอก (10 บาทเป็นสีเงิน) */}
      <circle cx="50" cy="50" r="43.5" fill={`url(#${g('ring')})`} />
      {bimetal && <circle cx="50" cy="50" r="31" fill={`url(#${g('face')})`} stroke={shade(inner, -0.35)} strokeWidth="1.2" />}
      {/* ขอบนูนด้านใน */}
      {!bimetal && <circle cx="50" cy="50" r="39" fill={`url(#${g('face')})`} />}
      <circle cx="50" cy="50" r={bimetal ? 40 : 39} fill="none" stroke={shade(ring, 0.55)} strokeWidth="1.6" opacity="0.9" />
      <circle cx="50.6" cy="50.8" r={bimetal ? 40 : 39} fill="none" stroke={shade(ring, -0.4)} strokeWidth="1" opacity="0.55" />
      {/* ตัวอักษรโค้งด้านบน */}
      <text fontSize="7.2" fontWeight="700" fill={shade(d.ink, 0.15)} opacity="0.75" fontFamily="Kanit, sans-serif" letterSpacing="0.6">
        <textPath href={`#${g('arc')}`} startOffset="50%" textAnchor="middle">
          ประเทศไทย
        </textPath>
      </text>
      {/* ตัวเลขนูน: เงาสว่างด้านล่าง ตัวจริงด้านบน */}
      {[
        { dx: 0.9, dy: 1.1, fill: shade(inner, 0.7) },
        { dx: 0, dy: 0, fill: d.ink },
      ].map((t, i) => (
        <g key={i} transform={`translate(${t.dx} ${t.dy})`}>
          <text x="50" y={satang ? 58 : 62} textAnchor="middle" fontSize={d.face.length > 1 ? (bimetal ? 24 : 28) : 36} fontWeight="700" fill={t.fill} fontFamily="Mitr, Kanit, sans-serif">
            {d.face}
          </text>
          <text x="50" y={satang ? 72 : 76} textAnchor="middle" fontSize={satang ? 9.5 : 10.5} fontWeight="600" fill={t.fill} fontFamily="Kanit, sans-serif">
            {d.unit}
          </text>
        </g>
      ))}
      {/* ดาวเล็ก ๆ ด้านล่าง */}
      {[-10, 0, 10].map((dx) => (
        <circle key={dx} cx={50 + dx} cy={bimetal ? 84 : 83} r="1.2" fill={d.ink} opacity="0.45" />
      ))}
      {/* แสงสะท้อน */}
      <ellipse cx="34" cy="28" rx="15" ry="7" fill="#fff" opacity="0.35" transform="rotate(-35 34 28)" />
    </svg>
  )
}

/** เจดีย์ในซุ้มของธนบัตร */
function Chedi({ color }: { color: string }) {
  return (
    <g fill={color}>
      <rect x="-3" y="-22" width="6" height="6" rx="1" />
      <path d="M0 -36 L1.6 -22 L-1.6 -22 Z" />
      <path d="M-11 4 Q-11 -14 0 -18 Q11 -14 11 4 Z" />
      <rect x="-14" y="4" width="28" height="4" rx="1" />
      <rect x="-17" y="8" width="34" height="5" rx="1" />
      <rect x="-20" y="13" width="40" height="5" rx="1" />
    </g>
  )
}

export function NoteSvg({ id }: { id: DenomId }) {
  const d = denom(id)
  const g = useGid()
  const light = shade(d.color, 0.55)
  const dark = shade(d.edge, -0.15)
  const waves = [18, 30, 42, 54, 66, 78]
  return (
    <svg viewBox="0 0 200 100" className="mh-money-svg" aria-hidden="true">
      <defs>
        <linearGradient id={g('paper')} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={shade(d.color, 0.25)} />
          <stop offset="50%" stopColor={light} />
          <stop offset="100%" stopColor={d.color} />
        </linearGradient>
        <radialGradient id={g('oval')} cx="50%" cy="45%" r="60%">
          <stop offset="0%" stopColor="#fffdf4" />
          <stop offset="100%" stopColor={shade(d.color, 0.4)} />
        </radialGradient>
        <clipPath id={g('clip')}>
          <rect x="0" y="0" width="196" height="94" rx="8" />
        </clipPath>
      </defs>
      <rect x="3" y="5" width="196" height="94" rx="8" fill="rgba(43,35,80,0.2)" />
      <g clipPath={`url(#${g('clip')})`}>
        <rect x="0" y="0" width="196" height="94" fill={`url(#${g('paper')})`} />
        {/* ลายเส้นพื้น */}
        {waves.map((y, i) => (
          <path
            key={y}
            d={`M-10 ${y} C 20 ${y - 8}, 40 ${y + 8}, 70 ${y} S 120 ${y - 8}, 150 ${y} S 190 ${y + 8}, 210 ${y}`}
            fill="none"
            stroke={i % 2 ? d.edge : '#ffffff'}
            strokeWidth="1"
            opacity={i % 2 ? 0.22 : 0.45}
          />
        ))}
        {/* ลายวงกลมมุมขวาล่าง */}
        {[10, 18, 26, 34].map((r) => (
          <circle key={r} cx="176" cy="84" r={r} fill="none" stroke={d.edge} strokeWidth="0.8" opacity="0.25" />
        ))}
        {/* แถบความปลอดภัย */}
        <rect x="108" y="0" width="5" height="94" fill={shade(d.edge, -0.1)} opacity="0.35" />
        {[6, 22, 38, 54, 70, 86].map((y) => (
          <rect key={y} x="108.5" y={y} width="4" height="7" rx="1" fill="#fff" opacity="0.55" />
        ))}
      </g>
      {/* กรอบ */}
      <rect x="0" y="0" width="196" height="94" rx="8" fill="none" stroke={d.edge} strokeWidth="2.5" />
      <rect x="6" y="6" width="184" height="82" rx="5" fill="none" stroke={dark} strokeWidth="1" opacity="0.45" strokeDasharray="3 2" />
      {/* ซุ้มรูปเจดีย์ */}
      <ellipse cx="56" cy="50" rx="30" ry="34" fill={`url(#${g('oval')})`} stroke={d.edge} strokeWidth="2" />
      <ellipse cx="56" cy="50" rx="25" ry="29" fill="none" stroke={d.edge} strokeWidth="0.8" opacity="0.5" />
      <g transform="translate(56 60)">
        <Chedi color={shade(d.edge, -0.1)} />
      </g>
      {/* ตัวเลขมุม */}
      <text x="14" y="21" fontSize="12" fontWeight="700" fill={d.ink} fontFamily="Mitr, Kanit, sans-serif">
        {d.face}
      </text>
      <text x="154" y="21" textAnchor="middle" fontSize="8" fontWeight="600" fill={d.ink} opacity="0.8" fontFamily="Kanit, sans-serif">
        ธนบัตรของเล่น
      </text>
      {/* มูลค่าใหญ่ */}
      <text x="153.5" y="62.5" textAnchor="middle" fontSize={d.face.length > 3 ? 30 : 36} fontWeight="700" fill="#fff" opacity="0.65" fontFamily="Mitr, Kanit, sans-serif">
        {d.face}
      </text>
      <text x="152" y="61" textAnchor="middle" fontSize={d.face.length > 3 ? 30 : 36} fontWeight="700" fill={d.ink} fontFamily="Mitr, Kanit, sans-serif">
        {d.face}
      </text>
      <text x="152" y="80" textAnchor="middle" fontSize="12" fontWeight="600" fill={d.ink} fontFamily="Kanit, sans-serif">
        บาท
      </text>
      {/* แสงมันของกระดาษ */}
      <path d="M0 0 L70 0 L30 94 L0 94 Z" fill="#fff" opacity="0.08" />
    </svg>
  )
}
