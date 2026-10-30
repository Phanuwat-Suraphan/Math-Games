import { BOARD_H, BOARD_SEAM, BOARD_SPACES, BOARD_W, SPACE_INFO, boardShop, spaceCenter, type BoardSpace } from './boardData'

/**
 * กระดานเกม "ตะลุยเมืองเงิน" วาดเป็น SVG ขนาด 1400 × 990 (สัดส่วน A3 แนวนอน)
 * part = 'left' / 'right' ตัดครึ่งเป็น A4 แนวตั้งสองแผ่น พิมพ์แล้วต่อกันได้ A3
 * รอยต่ออยู่ระหว่างช่องที่ 5 กับ 6 ของทุกแถว จึงไม่มีช่องไหนถูกตัดครึ่ง
 */

const BOX = 110

function roadPath(): string {
  let d = ''
  BOARD_SPACES.forEach((_, i) => {
    const p = spaceCenter(i)
    if (i === 0) {
      d += `M ${p.x} ${p.y}`
      return
    }
    const prev = spaceCenter(i - 1)
    if (prev.y !== p.y) {
      // เลี้ยวกลับที่ปลายแถว: โค้งออกไปด้านข้าง
      const side = p.x > BOARD_W / 2 ? 1 : -1
      d += ` C ${prev.x + side * 105} ${prev.y}, ${p.x + side * 105} ${p.y}, ${p.x} ${p.y}`
    } else d += ` L ${p.x} ${p.y}`
  })
  return d
}

function Space({ s, index }: { s: BoardSpace; index: number }) {
  const { x, y } = spaceCenter(index)
  const info = SPACE_INFO[s.kind]
  const shop = s.shop ? boardShop(s.shop) : null
  const fill = shop ? shop.light : info.light
  const stroke = shop ? shop.color : info.color
  const icon = shop ? shop.icon : info.icon
  const big = s.kind === 'home' || s.kind === 'bank'
  const label = shop ? shop.short : big ? (s.kind === 'home' ? 'บ้าน (เริ่ม)' : 'ธนาคาร') : info.name
  const sub = big ? (s.kind === 'home' ? 'รับค่าขนม 20 บาท' : 'เส้นชัย') : shop ? 'ร้านค้า' : ''
  const size = big ? BOX + 16 : BOX
  return (
    <g data-space={s.no}>
      <rect x={x - size / 2} y={y - size / 2} width={size} height={size} rx={18} fill={fill} stroke={stroke} strokeWidth={big ? 6 : 4} />
      <text x={x - size / 2 + 9} y={y - size / 2 + 20} fontSize={15} fontWeight={700} fill={stroke}>
        {s.no}
      </text>
      <text x={x} y={y + (sub ? 2 : 8)} fontSize={big ? 44 : 40} textAnchor="middle">
        {icon}
      </text>
      <text x={x} y={y + (sub ? 30 : 40)} fontSize={label.length > 9 ? 14 : 16} fontWeight={700} textAnchor="middle" fill="#2b2350">
        {label}
      </text>
      {sub && (
        <text x={x} y={y + 47} fontSize={12} textAnchor="middle" fill="#495057">
          {sub}
        </text>
      )}
    </g>
  )
}

/** ลูกศรบอกทิศทางระหว่างช่อง */
function Arrows() {
  const out: JSX.Element[] = []
  for (let i = 0; i < BOARD_SPACES.length - 1; i += 1) {
    const a = spaceCenter(i)
    const b = spaceCenter(i + 1)
    if (a.y !== b.y) continue
    const mx = (a.x + b.x) / 2
    const dir = b.x > a.x ? 1 : -1
    out.push(<polygon key={i} points={`${mx - dir * 6},${a.y - 9} ${mx + dir * 7},${a.y} ${mx - dir * 6},${a.y + 9}`} fill="#fff" />)
  }
  return <>{out}</>
}

const DECOR: [string, number, number, number][] = [
  ['🌳', 60, 725, 40],
  ['🏡', 250, 730, 44],
  ['🌷', 420, 718, 32],
  ['🚲', 560, 728, 36],
  ['🌳', 860, 725, 40],
  ['🏪', 1030, 730, 44],
  ['🌻', 1190, 718, 34],
  ['🌳', 1340, 515, 40],
  ['🐶', 180, 518, 34],
  ['🏫', 360, 520, 44],
  ['🌳', 560, 512, 38],
  ['🎈', 860, 512, 34],
  ['🏥', 1050, 520, 42],
  ['🌴', 1230, 516, 38],
  ['🌳', 70, 305, 40],
  ['⛲', 260, 310, 40],
  ['🌼', 450, 300, 32],
  ['🚗', 600, 308, 34],
  ['🌳', 820, 305, 40],
  ['🏛️', 1000, 312, 44],
  ['🐦', 1180, 298, 32],
]

export function BoardArt({ part = 'full' }: { part?: 'full' | 'left' | 'right' }) {
  const vb = part === 'full' ? `0 0 ${BOARD_W} ${BOARD_H}` : part === 'left' ? `0 0 ${BOARD_SEAM} ${BOARD_H}` : `${BOARD_SEAM} 0 ${BOARD_W - BOARD_SEAM} ${BOARD_H}`
  const legend = (['quest', 'luck', 'save', 'exchange', 'bus', 'work'] as const).map((k) => SPACE_INFO[k])
  return (
    <svg viewBox={vb} className={`bd-board bd-board-${part}`} role="img" aria-label="กระดานเกมตะลุยเมืองเงิน" fontFamily="Sarabun, Kanit, 'Noto Sans Thai', sans-serif">
      <defs>
        <linearGradient id="bd-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#e7f5ff" />
          <stop offset="1" stopColor="#ebfbee" />
        </linearGradient>
      </defs>
      <rect x={0} y={0} width={BOARD_W} height={BOARD_H} fill="url(#bd-sky)" />
      <rect x={6} y={6} width={BOARD_W - 12} height={BOARD_H - 12} rx={24} fill="none" stroke="#f59f00" strokeWidth={6} />

      {/* หัวกระดาน: แผ่นซ้ายและแผ่นขวาแยกกัน ไม่ถูกตัดตรงรอยต่อ */}
      <text x={350} y={72} fontSize={46} fontWeight={800} textAnchor="middle" fill="#e8590c">
        🎲 ตะลุยเมืองเงิน ป.3
      </text>
      <text x={350} y={108} fontSize={18} textAnchor="middle" fill="#495057">
        เกมเศรษฐีตัวน้อย · ซื้อของให้ครบ ใช้เงินให้คุ้ม
      </text>
      <text x={1050} y={64} fontSize={20} fontWeight={700} textAnchor="middle" fill="#2b8a3e">
        เดินตามลูกศร จากบ้าน 🏠 ไปธนาคาร 🏦
      </text>
      <text x={1050} y={94} fontSize={16} textAnchor="middle" fill="#495057">
        ทุกครั้งที่เงินเข้า–ออก จดลงสมุดรายรับรายจ่าย 📒
      </text>

      {DECOR.map(([e, x, y, size], i) => (
        <text key={i} x={x} y={y} fontSize={size} textAnchor="middle" opacity={0.85}>
          {e}
        </text>
      ))}

      <path d={roadPath()} fill="none" stroke="#868e96" strokeWidth={58} strokeLinecap="round" strokeLinejoin="round" />
      <path d={roadPath()} fill="none" stroke="#fff" strokeWidth={3} strokeDasharray="14 12" />
      <Arrows />
      {BOARD_SPACES.map((s, i) => (
        <Space key={s.no} s={s} index={i} />
      ))}

      {/* คำอธิบายช่อง แผ่นละสามช่อง */}
      {legend.map((info, i) => {
        const x = (i < 3 ? 40 : BOARD_SEAM + 40) + (i % 3) * 215
        return (
          <g key={info.name}>
            <rect x={x} y={922} width={205} height={50} rx={12} fill={info.light} stroke={info.color} strokeWidth={2} />
            <text x={x + 26} y={956} fontSize={26} textAnchor="middle">
              {info.icon}
            </text>
            <text x={x + 48} y={945} fontSize={15} fontWeight={700} fill="#2b2350">
              {info.name}
            </text>
            <text x={x + 48} y={964} fontSize={11.5} fill="#495057">
              {info.short}
            </text>
          </g>
        )
      })}

      {/* เส้นต่อกระดาน (เห็นเฉพาะฉบับสองแผ่น) */}
      {part !== 'full' && (
        <g>
          <line x1={BOARD_SEAM} y1={0} x2={BOARD_SEAM} y2={BOARD_H} stroke="#495057" strokeWidth={2} strokeDasharray="10 8" />
          <text
            x={part === 'left' ? BOARD_SEAM - 12 : BOARD_SEAM + 12}
            y={BOARD_H / 2}
            fontSize={13}
            fill="#495057"
            textAnchor="middle"
            transform={`rotate(${part === 'left' ? -90 : 90} ${part === 'left' ? BOARD_SEAM - 12 : BOARD_SEAM + 12} ${BOARD_H / 2})`}
          >
            ✂ ตัดตามเส้นประ แล้วต่อกับแผ่นที่ {part === 'left' ? 2 : 1}
          </text>
        </g>
      )}
    </svg>
  )
}

