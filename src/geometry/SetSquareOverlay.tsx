/**
 * ไม้ฉาก
 *
 * ชิ้นที่สี่ของกล่องเรขาคณิต ใช้ลากเส้นตั้งฉากและเส้นขนาน
 * ซึ่งเป็นสองอย่างที่หลักสูตรสอน และเป็นสองอย่างที่ลากด้วยมือเปล่าแล้วไม่มีวันตรงจริง
 *
 * ขอบทั้งสามด้านลากดินสอแนบได้หมดเหมือนของจริง ไม่ใช่มีขอบนำทางแค่ขอบเดียว
 * เพราะท่าที่ใช้บ่อยที่สุดคือเลื่อนไม้ฉากไปตามไม้บรรทัดแล้วลากตามขาตั้ง
 */

import type { PointerEvent as ReactPointerEvent } from 'react'
import { setSquareCorners } from './instruments'
import type { SetSquareKind } from './instruments'
import type { Point } from './geo'

export type SetSquarePart = 'move' | 'rotate' | 'resize'

interface SetSquareOverlayProps {
  kind: SetSquareKind
  /** จุดมุมฉาก */
  at: Point
  rotation: number
  leg: number
  onGrab: (part: SetSquarePart, event: ReactPointerEvent<SVGElement>) => void
}

export function SetSquareOverlay({ kind, at, rotation, leg, onGrab }: SetSquareOverlayProps) {
  const [corner, baseEnd, riseEnd] = setSquareCorners(kind, at, rotation, leg)
  const points = [corner, baseEnd, riseEnd].map((p) => `${p.x},${p.y}`).join(' ')

  /* เครื่องหมายมุมฉากวาดจากจุดมุมฉากเข้าหาอีกสองด้าน ขนาดคงที่ไม่ว่าไม้ฉากจะใหญ่แค่ไหน */
  const mark = 18
  const toBase = { x: (baseEnd.x - corner.x) / leg, y: (baseEnd.y - corner.y) / leg }
  const riseLength = Math.hypot(riseEnd.x - corner.x, riseEnd.y - corner.y)
  const toRise = { x: (riseEnd.x - corner.x) / riseLength, y: (riseEnd.y - corner.y) / riseLength }
  const square = [
    corner,
    { x: corner.x + toBase.x * mark, y: corner.y + toBase.y * mark },
    {
      x: corner.x + toBase.x * mark + toRise.x * mark,
      y: corner.y + toBase.y * mark + toRise.y * mark,
    },
    { x: corner.x + toRise.x * mark, y: corner.y + toRise.y * mark },
  ]
    .map((p) => `${p.x},${p.y}`)
    .join(' ')

  /* ป้ายมุมวางเยื้องเข้าข้างในจากแต่ละมุม จะได้ไม่ทับขอบที่ใช้ลากดินสอ */
  const inward = (from: Point, away: number) => ({
    x: from.x + ((corner.x + baseEnd.x + riseEnd.x) / 3 - from.x) * away,
    y: from.y + ((corner.y + baseEnd.y + riseEnd.y) / 3 - from.y) * away,
  })
  const baseLabel = inward(baseEnd, 0.3)
  const riseLabel = inward(riseEnd, 0.34)
  const angles = kind === '45' ? { base: 45, rise: 45 } : { base: 30, rise: 60 }

  return (
    <g className="geo-setsquare">
      <polygon
        points={points}
        fill="rgba(45, 212, 191, 0.2)"
        stroke="#0d9488"
        strokeWidth={2.5}
        onPointerDown={(event) => onGrab('move', event)}
      />

      {/* ขอบทั้งสามเน้นให้เห็นชัดว่าลากแนบได้ทุกด้าน */}
      <polygon points={points} fill="none" stroke="#0f766e" strokeWidth={3.5} pointerEvents="none" />
      <polygon points={square} fill="none" stroke="#0f766e" strokeWidth={2} pointerEvents="none" />

      <g pointerEvents="none" fontFamily="Kanit, sans-serif" fontWeight={800} fill="#0f766e">
        <text x={baseLabel.x} y={baseLabel.y} fontSize={15} textAnchor="middle" dominantBaseline="central">
          {angles.base}°
        </text>
        <text x={riseLabel.x} y={riseLabel.y} fontSize={15} textAnchor="middle" dominantBaseline="central">
          {angles.rise}°
        </text>
      </g>

      {/* ปุ่มหมุนที่ปลายฐาน และปุ่มย่อขยายที่ปลายขาตั้ง วางนอกตัวไม้ฉากจึงไม่บังขอบ */}
      <g
        transform={`translate(${baseEnd.x} ${baseEnd.y})`}
        onPointerDown={(event) => onGrab('rotate', event)}
        className="cursor-grab"
      >
        <circle r={20} fill="transparent" />
        <circle r={15} fill="#ccfbf1" stroke="#0d9488" strokeWidth={2.5} />
        <text textAnchor="middle" y={5} fontSize={15} fill="#0f766e">
          ↻
        </text>
      </g>

      <g
        transform={`translate(${riseEnd.x} ${riseEnd.y})`}
        onPointerDown={(event) => onGrab('resize', event)}
        className="cursor-grab"
      >
        <circle r={20} fill="transparent" />
        <circle r={15} fill="#ccfbf1" stroke="#0d9488" strokeWidth={2.5} />
        <text textAnchor="middle" y={5} fontSize={15} fill="#0f766e">
          ⤢
        </text>
      </g>
    </g>
  )
}
