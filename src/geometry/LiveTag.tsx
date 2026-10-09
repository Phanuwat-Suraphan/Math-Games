/**
 * ป้ายค่าที่ลอยติดปลายดินสอขณะกำลังวาด
 *
 * แถบบอกค่าใต้กระดาษมีอยู่แล้ว แต่ตอนครูฉายขึ้นจอหน้าชั้น สายตาทุกคู่อยู่ที่ปลายดินสอ
 * ไม่มีใครมองแถบที่อยู่ล่างสุดของหน้าจอเลยสักคน ตัวเลขจึงต้องมาอยู่ตรงที่มือกำลังทำงาน
 *
 * ขนาดตัวอักษรหารด้วยกำลังขยาย ป้ายจึงเท่าเดิมบนจอทุกระดับซูม
 * ถ้าไม่หาร ป้ายจะเล็กจนอ่านไม่ออกตอนซูมออก และใหญ่จนบังงานตอนซูมเข้า
 */

import type { Point } from './geo'

interface LiveTagProps {
  at: Point
  text: string
  /** กำลังขยายของกระดาษตอนนี้ */
  scale: number
  color?: string
}

export function LiveTag({ at, text, scale, color = '#5b21b6' }: LiveTagProps) {
  const unit = 1 / scale
  const width = Math.max(60, text.length * 8.6 + 22) * unit
  const height = 30 * unit
  /* วางเยื้องขึ้นไปทางขวาของปลายดินสอ ตรงที่มือไม่บังและเส้นที่กำลังลากไม่ทับ */
  const x = at.x + 18 * unit
  const y = at.y - 34 * unit

  return (
    <g pointerEvents="none" className="geo-no-export">
      <rect
        x={x}
        y={y - height / 2}
        width={width}
        height={height}
        rx={height / 2}
        fill="#ffffff"
        stroke={color}
        strokeWidth={2 * unit}
        opacity={0.95}
      />
      <text
        x={x + width / 2}
        y={y}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={14 * unit}
        fontWeight={800}
        fill={color}
        fontFamily="Kanit, sans-serif"
      >
        {text}
      </text>
    </g>
  )
}
