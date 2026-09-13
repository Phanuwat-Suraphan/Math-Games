/**
 * ครึ่งวงกลมวัดมุม (โพรแทรกเตอร์)
 *
 * ทำไมต้องมีขีดครบทุกองศาและมีเลขสองแถว
 *
 * เพราะเด็กต้องใช้ของจริงในห้องสอบ ถ้าของบนจอง่ายกว่าของจริง
 * เช่น มีแต่เลขทีละสิบ หรือมีสเกลแถวเดียว เด็กจะอ่านของจริงไม่เป็นอยู่ดี
 * สเกลสองแถวที่อ่านสวนทางกันคือจุดที่เด็กสับสนที่สุด จึงต้องมีให้ฝึก
 */

import { memo, useMemo } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { pointAt } from './geo'
import { scaleUnit } from './instruments'
import type { Point } from './geo'

export type ProtractorPart = 'move' | 'rotate' | 'scale' | 'resize'

interface ProtractorOverlayProps {
  center: Point
  /** ทิศของขอบล่าง 0 องศาคือขอบล่างชี้ไปทางขวา */
  rotation: number
  radius: number
  /** องศาบนสเกลที่ปลายนิ้วชี้อยู่ (0 ถึง 180) ไม่ได้ชี้อยู่ให้ส่ง null */
  highlight: number | null
  onGrab: (part: ProtractorPart, event: ReactPointerEvent<SVGElement>) => void
}

interface Tick {
  deg: number
  inner: number
  major: boolean
}

/**
 * ขีดสเกลทั้งหมดกับตัวเลขสองแถว
 *
 * แยกออกมาและจำผลไว้ เพราะมีขีดถึง 181 ขีดกับตัวเลขอีก 38 ตัว
 * ตอนเลื่อนนิ้วผ่านสเกล มีแค่เส้นชี้ที่ต้องเปลี่ยน ขีดที่เหลือเหมือนเดิมหมด
 * ถ้าไม่แยก แท็บเล็ตรุ่นเก่าจะวาดใหม่ทั้ง 219 ชิ้นทุกครั้งที่นิ้วขยับหนึ่งพิกเซล
 */
const ProtractorScale = memo(function ProtractorScale({
  radius,
  rotation,
}: {
  radius: number
  rotation: number
}) {
  /* ขีดและตัวเลขโตตามอันจริง ครึ่งวงกลมอันใหญ่ต้องมีขีดใหญ่ตาม ไม่ใช่ขนแมวเส้นเล็ก */
  const unit = scaleUnit(radius)
  const ticks = useMemo<Tick[]>(() => {
    const list: Tick[] = []
    for (let deg = 0; deg <= 180; deg += 1) {
      const major = deg % 10 === 0
      const medium = deg % 5 === 0
      list.push({ deg, inner: (major ? 22 : medium ? 14 : 8) * unit, major })
    }
    return list
  }, [unit])

  const origin: Point = { x: 0, y: 0 }

  return (
    <g pointerEvents="none" fontFamily="Kanit, sans-serif">
      {ticks.map((tick) => {
        const from = pointAt(origin, radius, tick.deg)
        const to = pointAt(origin, radius - tick.inner, tick.deg)
        return (
          <line
            key={tick.deg}
            x1={from.x}
            y1={from.y}
            x2={to.x}
            y2={to.y}
            stroke={tick.major ? '#be185d' : '#f472b6'}
            strokeWidth={(tick.major ? 2 : 1) * unit}
          />
        )
      })}

      {ticks
        .filter((tick) => tick.major)
        .map((tick) => {
          const outerLabel = pointAt(origin, radius - 32 * unit, tick.deg)
          const innerLabel = pointAt(origin, radius - 56 * unit, tick.deg)
          return (
            <g key={`label-${tick.deg}`}>
              <text
                x={outerLabel.x}
                y={outerLabel.y}
                transform={`rotate(${rotation} ${outerLabel.x} ${outerLabel.y})`}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={13 * unit}
                fontWeight={700}
                fill="#be185d"
              >
                {tick.deg}
              </text>
              <text
                x={innerLabel.x}
                y={innerLabel.y}
                transform={`rotate(${rotation} ${innerLabel.x} ${innerLabel.y})`}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={11 * unit}
                fontWeight={600}
                fill="#9d174d"
                opacity={0.7}
              >
                {180 - tick.deg}
              </text>
            </g>
          )
        })}
    </g>
  )
})

export function ProtractorOverlay({
  center,
  rotation,
  radius,
  highlight,
  onGrab,
}: ProtractorOverlayProps) {
  const unit = scaleUnit(radius)
  const bandInner = radius - 64 * unit
  const origin: Point = { x: 0, y: 0 }
  const edge = (deg: number, r: number) => pointAt(origin, r, deg)

  const outer = edge(180, radius)
  const outerEnd = edge(0, radius)
  const innerStart = edge(0, bandInner)
  const innerEnd = edge(180, bandInner)

  return (
    <g
      transform={`translate(${center.x} ${center.y}) rotate(${-rotation})`}
      className="geo-protractor"
    >
      {/* ตัวครึ่งวงกลมโปร่งแสง จิ้มตรงกลางแล้วลากเพื่อย้าย */}
      <path
        d={`M ${outer.x} ${outer.y} A ${radius} ${radius} 0 0 1 ${outerEnd.x} ${outerEnd.y} Z`}
        fill="rgba(244, 114, 182, 0.16)"
        stroke="#f472b6"
        strokeWidth={2.5}
        onPointerDown={(event) => onGrab('move', event)}
      />

      {/* แถบสเกล จิ้มตรงนี้เพื่อยิงเส้นออกไปตามองศาที่ต้องการ */}
      <path
        d={
          `M ${outer.x} ${outer.y} A ${radius} ${radius} 0 0 1 ${outerEnd.x} ${outerEnd.y} ` +
          `L ${innerStart.x} ${innerStart.y} A ${bandInner} ${bandInner} 0 0 0 ${innerEnd.x} ${innerEnd.y} Z`
        }
        fill="rgba(255, 255, 255, 0.5)"
        stroke="none"
        onPointerDown={(event) => onGrab('scale', event)}
      />

      <ProtractorScale radius={radius} rotation={rotation} />

      {/* เส้นที่ปลายนิ้วชี้อยู่ ทำให้เห็นชัดว่ากำลังจะได้มุมกี่องศา */}
      {highlight !== null ? (
        <g pointerEvents="none">
          <line
            x1={0}
            y1={0}
            x2={edge(highlight, radius).x}
            y2={edge(highlight, radius).y}
            stroke="#db2777"
            strokeWidth={2.5}
            strokeDasharray="7 5"
          />
          <g transform={`translate(${edge(highlight, radius + 26).x} ${edge(highlight, radius + 26).y})`}>
            <g transform={`rotate(${rotation})`}>
              <rect x={-26} y={-14} width={52} height={26} rx={13} fill="#db2777" />
              <text
                textAnchor="middle"
                y={5}
                fontSize={14}
                fontWeight={700}
                fill="#ffffff"
                fontFamily="Kanit, sans-serif"
              >
                {Math.round(highlight)}°
              </text>
            </g>
          </g>
        </g>
      ) : null}

      {/* ขอบล่างและรูตรงกลางที่ต้องเอาไปทาบจุดยอดของมุม */}
      <line x1={-radius} y1={0} x2={radius} y2={0} stroke="#be185d" strokeWidth={2.5} pointerEvents="none" />
      <line x1={0} y1={-14} x2={0} y2={14} stroke="#be185d" strokeWidth={2.5} pointerEvents="none" />
      <circle cx={0} cy={0} r={6} fill="none" stroke="#be185d" strokeWidth={2.5} pointerEvents="none" />

      {/*
        ปุ่มย่อขยาย วางที่ขอบโค้งด้านบน ลากเข้าหาจุดกึ่งกลางคือย่อ ลากออกคือขยาย
        มุมไม่ขึ้นกับขนาด ครึ่งวงกลมอันใหญ่กับอันเล็กจึงวัดได้ตรงกันเป๊ะ
      */}
      <g
        transform={`translate(0 ${-radius - 26})`}
        onPointerDown={(event) => onGrab('resize', event)}
        className="cursor-grab"
      >
        <circle r={20} fill="transparent" />
        <circle r={15} fill="#fbcfe8" stroke="#db2777" strokeWidth={2.5} />
        <text
          textAnchor="middle"
          y={5}
          fontSize={15}
          transform={`rotate(${rotation})`}
          fill="#9d174d"
        >
          ⤢
        </text>
      </g>

      {/* ปุ่มหมุน อยู่นอกตัวครึ่งวงกลมเพื่อไม่ให้บังสเกล */}
      <g
        transform={`translate(${radius + 30} 0)`}
        onPointerDown={(event) => onGrab('rotate', event)}
        className="cursor-grab"
      >
        <circle r={17} fill="#fbcfe8" stroke="#db2777" strokeWidth={2.5} />
        <text
          textAnchor="middle"
          y={6}
          fontSize={17}
          transform={`rotate(${rotation})`}
          fill="#9d174d"
        >
          ↻
        </text>
      </g>

      {/* ปุ่มย้าย อยู่ใต้ขอบล่าง ตรงที่ไม่ทับกระดาษส่วนที่วาด */}
      <g
        transform="translate(0 34)"
        onPointerDown={(event) => onGrab('move', event)}
        className="cursor-grab"
      >
        <rect x={-30} y={-15} width={60} height={30} rx={15} fill="#fbcfe8" stroke="#db2777" strokeWidth={2.5} />
        <text
          textAnchor="middle"
          y={6}
          fontSize={15}
          transform={`rotate(${rotation})`}
          fill="#9d174d"
          fontFamily="Kanit, sans-serif"
        >
          ✥
        </text>
      </g>
    </g>
  )
}
