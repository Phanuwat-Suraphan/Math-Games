/**
 * ภาพวงเวียนที่ยืนอยู่บนกระดาษระหว่างกำลังใช้งาน
 *
 * ตั้งใจวาดขาสองข้างให้มาบรรจบกันที่ข้อต่อด้านบนจริง ๆ ตามของจริง
 * ไม่ใช่แค่ลากเส้นรัศมีเส้นเดียวแล้วเขียนว่าเป็นวงเวียน
 * เพราะสิ่งที่เด็กต้องจำคือ "ระยะระหว่างเข็มกับดินสอไม่เปลี่ยน"
 * ภาพที่ขากางออกเท่าเดิมตลอดการหมุน สอนเรื่องนี้ได้โดยไม่ต้องพูด
 */

import { formatCm, midpoint, pointAt } from './geo'
import type { Point } from './geo'

interface CompassArtProps {
  center: Point
  radius: number
  /** ทิศที่ปลายดินสอชี้อยู่ตอนนี้ */
  angle: number
  /** ส่วนโค้งที่กวาดไปแล้ว ถ้ายังไม่เริ่มหมุนให้ส่ง 0 */
  sweep: number
  color: string
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

export function CompassArt({ center, radius, angle, sweep, color }: CompassArtProps) {
  const pencil = pointAt(center, radius, angle)
  const hinge = hingeOf(center, pencil, Math.max(radius * 1.15, 110))
  const labelAt = midpoint(center, pencil)

  return (
    <g pointerEvents="none">
      {/* รอยวงกลมจาง ๆ บอกว่าถ้าหมุนครบรอบจะได้วงแค่ไหน */}
      <circle
        cx={center.x}
        cy={center.y}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeDasharray="6 8"
        opacity={0.35}
      />
      {sweep !== 0 ? null : (
        <line
          x1={center.x}
          y1={center.y}
          x2={pencil.x}
          y2={pencil.y}
          stroke={color}
          strokeWidth={1.5}
          strokeDasharray="4 6"
          opacity={0.6}
        />
      )}

      {/* ขาเข็ม */}
      <line
        x1={hinge.x}
        y1={hinge.y}
        x2={center.x}
        y2={center.y}
        stroke="#64748b"
        strokeWidth={7}
        strokeLinecap="round"
      />
      {/* ขาดินสอ */}
      <line
        x1={hinge.x}
        y1={hinge.y}
        x2={pencil.x}
        y2={pencil.y}
        stroke="#a78bfa"
        strokeWidth={7}
        strokeLinecap="round"
      />
      {/* ข้อต่อด้านบนพร้อมหน้ายิ้มเล็ก ๆ */}
      <circle cx={hinge.x} cy={hinge.y} r={11} fill="#c4b5fd" stroke="#7c3aed" strokeWidth={3} />
      <circle cx={hinge.x - 3.5} cy={hinge.y - 1} r={1.6} fill="#312e81" />
      <circle cx={hinge.x + 3.5} cy={hinge.y - 1} r={1.6} fill="#312e81" />

      {/* ปลายเข็มที่ปักกระดาษ และปลายดินสอ */}
      <circle cx={center.x} cy={center.y} r={4.5} fill="#334155" />
      <circle cx={pencil.x} cy={pencil.y} r={6} fill={color} stroke="#ffffff" strokeWidth={2} />

      <g transform={`translate(${labelAt.x}, ${labelAt.y - 14})`}>
        <rect x={-34} y={-14} width={68} height={24} rx={12} fill="#ffffff" opacity={0.92} />
        <text
          textAnchor="middle"
          y={3}
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
