/**
 * ไม้บรรทัดยาว 20 เซนติเมตร
 *
 * ขอบบนของไม้บรรทัดคือขอบวัดจริง ๆ เส้นที่ลากตอนวางดินสอไว้ใกล้ขอบนี้
 * จะถูกดูดให้แนบขอบพอดี เหมือนตอนลากดินสอตามไม้บรรทัดของจริง
 * เด็กจึงได้เส้นตรงจริงโดยไม่ต้องพยายามลากนิ้วให้ตรง
 */

import { memo, useMemo } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { PX_PER_CM } from './geo'
import type { Point } from './geo'

export type RulerPart = 'move' | 'rotate'

interface RulerOverlayProps {
  /** ปลายซ้ายของขอบวัด ตรงกับเลข 0 บนไม้บรรทัด */
  origin: Point
  rotation: number
  lengthCm: number
  onGrab: (part: RulerPart, event: ReactPointerEvent<SVGElement>) => void
}

/**
 * ขีดเซนติเมตรกับมิลลิเมตรทั้งแถบ
 *
 * แยกออกมาและจำผลไว้ด้วยเหตุผลเดียวกับสเกลของครึ่งวงกลม
 * ขีดมีสองร้อยกว่าขีดแต่ไม่เคยเปลี่ยนเลยระหว่างที่เด็กลากเส้นอยู่
 */
const RulerScale = memo(function RulerScale({
  lengthCm,
  rotation,
}: {
  lengthCm: number
  rotation: number
}) {
  const ticks = useMemo(() => {
    const list: { x: number; size: number; label: number | null }[] = []
    const steps = Math.round(lengthCm * 10)
    for (let i = 0; i <= steps; i += 1) {
      const isCm = i % 10 === 0
      const isHalf = i % 5 === 0
      list.push({
        x: (i / 10) * PX_PER_CM,
        size: isCm ? 22 : isHalf ? 14 : 8,
        label: isCm ? i / 10 : null,
      })
    }
    return list
  }, [lengthCm])

  return (
    <g pointerEvents="none" fontFamily="Kanit, sans-serif">
      {ticks.map((tick, index) => (
        <line
          key={index}
          x1={tick.x}
          y1={0}
          x2={tick.x}
          y2={tick.size}
          stroke="#92400e"
          strokeWidth={tick.label !== null ? 2 : 1}
        />
      ))}

      {ticks
        .filter((tick) => tick.label !== null)
        .map((tick) => (
          <text
            key={`label-${tick.label}`}
            x={tick.x}
            y={38}
            transform={`rotate(${rotation} ${tick.x} 38)`}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={13}
            fontWeight={700}
            fill="#78350f"
          >
            {tick.label}
          </text>
        ))}
    </g>
  )
})

export function RulerOverlay({ origin, rotation, lengthCm, onGrab }: RulerOverlayProps) {
  const length = lengthCm * PX_PER_CM
  const height = 76

  return (
    <g transform={`translate(${origin.x} ${origin.y}) rotate(${-rotation})`} className="geo-ruler">
      <rect
        x={-10}
        y={0}
        width={length + 20}
        height={height}
        rx={14}
        fill="rgba(253, 230, 138, 0.82)"
        stroke="#d97706"
        strokeWidth={2.5}
        onPointerDown={(event) => onGrab('move', event)}
      />
      {/* ขอบวัดเน้นด้วยเส้นเข้ม ให้รู้ว่าต้องลากดินสอตามขอบไหน */}
      <line x1={-10} y1={0} x2={length + 10} y2={0} stroke="#b45309" strokeWidth={3} pointerEvents="none" />

      <RulerScale lengthCm={lengthCm} rotation={rotation} />

      <text
        x={length / 2}
        y={62}
        transform={`rotate(${rotation} ${length / 2} 62)`}
        textAnchor="middle"
        fontSize={14}
        fontWeight={700}
        fill="#b45309"
        fontFamily="Kanit, sans-serif"
        pointerEvents="none"
      >
        เซนติเมตร
      </text>

      {/* ปุ่มหมุนที่ปลายขวา */}
      <g
        transform={`translate(${length + 44} ${height / 2})`}
        onPointerDown={(event) => onGrab('rotate', event)}
        className="cursor-grab"
      >
        <circle r={17} fill="#fde68a" stroke="#d97706" strokeWidth={2.5} />
        <text textAnchor="middle" y={6} fontSize={17} transform={`rotate(${rotation})`} fill="#92400e">
          ↻
        </text>
      </g>
    </g>
  )
}
