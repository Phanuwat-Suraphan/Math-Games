/**
 * วงเวียนที่วางอยู่บนกระดาษ
 *
 * ทำไมต้องมีที่จับสามแบบแยกกัน
 *
 * ของจริงมีสามการกระทำที่ไม่เหมือนกันเลย ย้ายที่ปักเข็ม กางขาให้ได้รัศมี
 * และจับหัวหมุนเพื่อวาด เวอร์ชันแรกของหน้านี้ยุบทั้งสามอย่างเป็น "ลากบนกระดาษ"
 * ผลคือแตะตรงไหนก็เป็นการวาด กางไม่ได้ และวาดเส้นที่ไม่ได้ตั้งใจเต็มไปหมด
 *
 * คราวนี้จึงแยกที่จับตามของจริง
 *   เข็ม      ลากเพื่อย้ายจุดศูนย์กลาง ไม่มีการวาดเกิดขึ้น
 *   ปุ่มกาง   ลากเข้าออกเพื่อเปลี่ยนรัศมี ไม่มีการวาดเกิดขึ้น
 *   หัวและปลายดินสอ  ลากเพื่อหมุนวาด โดยรัศมีถูกล็อกไว้เหมือนวงเวียนจริง
 *
 * ที่จับทุกอันมีพื้นที่กดกว้างกว่าที่ตาเห็น เพราะนิ้วเด็กกว้างกว่าเคอร์เซอร์เมาส์มาก
 */

import type { PointerEvent as ReactPointerEvent } from 'react'
import { formatCm, midpoint, pointAt } from './geo'
import type { Point } from './geo'

export type CompassPart = 'move' | 'spread' | 'draw'

interface CompassArtProps {
  center: Point
  radius: number
  /** ทิศที่ปลายดินสอชี้อยู่ตอนนี้ */
  angle: number
  /** ส่วนโค้งที่กวาดไปแล้วในการหมุนครั้งนี้ ยังไม่หมุนให้ส่ง 0 */
  sweep: number
  color: string
  onGrab: (part: CompassPart, event: ReactPointerEvent<SVGElement>) => void
}

/** หาตำแหน่งข้อต่อด้านบน โดยให้ขาทั้งสองข้างยาวเท่ากันเสมอ */
function hingeOf(pivot: Point, pencil: Point, legLength: number): Point {
  const half = { x: (pencil.x - pivot.x) / 2, y: (pencil.y - pivot.y) / 2 }
  const halfLength = Math.hypot(half.x, half.y)
  const middle = midpoint(pivot, pencil)
  if (halfLength === 0) return { x: middle.x, y: middle.y - legLength }
  const height = Math.sqrt(Math.max(1, legLength * legLength - halfLength * halfLength))
  /* เลือกด้านที่ชี้ขึ้นเสมอ ไม่งั้นวงเวียนจะห้อยหัวเวลาลากลงล่าง */
  const normal = { x: -half.y / halfLength, y: half.x / halfLength }
  const sign = normal.y > 0 ? -1 : 1
  return {
    x: middle.x + normal.x * height * sign,
    y: middle.y + normal.y * height * sign,
  }
}

/** จุดบนเส้นตรงระหว่างสองจุด ที่ระยะเป็นสัดส่วน t */
function along(from: Point, to: Point, t: number): Point {
  return { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t }
}

export function CompassArt({ center, radius, angle, sweep, color, onGrab }: CompassArtProps) {
  const pencil = pointAt(center, radius, angle)
  const hinge = hingeOf(center, pencil, Math.max(radius * 1.15, 120))
  const spreadKnob = along(hinge, pencil, 0.62)
  const drawing = Math.abs(sweep) > 0.5

  return (
    <g className="geo-compass">
      {/* รอยวงกลมจาง ๆ บอกว่าถ้าหมุนครบรอบจะได้วงแค่ไหน */}
      <circle
        cx={center.x}
        cy={center.y}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeDasharray="6 8"
        opacity={drawing ? 0.2 : 0.4}
        pointerEvents="none"
      />

      {/* ขาเข็ม จับตรงนี้ก็ถือว่าจับเข็ม ลากเพื่อย้ายทั้งวงเวียน */}
      <line
        x1={hinge.x}
        y1={hinge.y}
        x2={center.x}
        y2={center.y}
        stroke="#64748b"
        strokeWidth={8}
        strokeLinecap="round"
        onPointerDown={(event) => onGrab('move', event)}
        className="cursor-grab"
      />
      {/* ขาดินสอ จับที่ขาคือการกางออกหรือหุบเข้า ไม่ใช่การวาด */}
      <line
        x1={hinge.x}
        y1={hinge.y}
        x2={pencil.x}
        y2={pencil.y}
        stroke="#a78bfa"
        strokeWidth={8}
        strokeLinecap="round"
        onPointerDown={(event) => onGrab('spread', event)}
        className="cursor-grab"
      />

      {/* ปุ่มกาง อยู่บนขาดินสอ ลากเข้าหาเข็มเพื่อหุบ ลากออกเพื่อกาง */}
      <g
        transform={`translate(${spreadKnob.x} ${spreadKnob.y})`}
        onPointerDown={(event) => onGrab('spread', event)}
        className="cursor-grab"
      >
        <circle r={20} fill="transparent" />
        <circle r={13} fill="#ede9fe" stroke="#7c3aed" strokeWidth={2.5} />
        <text textAnchor="middle" y={5} fontSize={14} fill="#5b21b6" fontFamily="Kanit, sans-serif">
          ↔
        </text>
      </g>

      {/* หัววงเวียน จับแล้วหมุนเพื่อวาด เหมือนจับปุ่มบนสุดของวงเวียนจริง */}
      <g
        transform={`translate(${hinge.x} ${hinge.y})`}
        onPointerDown={(event) => onGrab('draw', event)}
        className="cursor-grab"
      >
        <circle r={26} fill="transparent" />
        <circle r={15} fill="#c4b5fd" stroke="#7c3aed" strokeWidth={3.5} />
        <circle cx={-4.5} cy={-2} r={2} fill="#312e81" />
        <circle cx={4.5} cy={-2} r={2} fill="#312e81" />
        <path
          d={drawing ? 'M -5 4 Q 0 9 5 4' : 'M -4 4.5 Q 0 7 4 4.5'}
          stroke="#312e81"
          strokeWidth={1.8}
          fill="none"
          strokeLinecap="round"
        />
      </g>

      {/* ปลายเข็มที่ปักกระดาษ ลากเพื่อย้ายวงเวียนทั้งอัน */}
      <g
        transform={`translate(${center.x} ${center.y})`}
        onPointerDown={(event) => onGrab('move', event)}
        className="cursor-grab"
      >
        <circle r={22} fill="transparent" />
        <circle r={9} fill="#ffffff" stroke="#475569" strokeWidth={3} />
        <circle r={3.5} fill="#334155" />
      </g>

      {/* ปลายดินสอ จับแล้วหมุนเพื่อวาดได้เหมือนกัน */}
      <g
        transform={`translate(${pencil.x} ${pencil.y})`}
        onPointerDown={(event) => onGrab('draw', event)}
        className="cursor-grab"
      >
        <circle r={22} fill="transparent" />
        <circle r={9} fill={color} stroke="#ffffff" strokeWidth={3} />
      </g>

      {/* ป้ายบอกว่ากางอยู่กี่เซนติเมตร ติดอยู่กับขาดินสอ */}
      <g transform={`translate(${along(center, pencil, 0.5).x} ${along(center, pencil, 0.5).y - 18})`} pointerEvents="none">
        <rect x={-38} y={-14} width={76} height={25} rx={12} fill="#ffffff" opacity={0.94} />
        <text
          textAnchor="middle"
          y={4}
          fontSize={14}
          fontWeight={700}
          fill="#7c3aed"
          fontFamily="Kanit, sans-serif"
        >
          {formatCm(radius)}
        </text>
      </g>
    </g>
  )
}
