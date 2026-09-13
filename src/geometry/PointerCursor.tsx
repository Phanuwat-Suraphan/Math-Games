/**
 * เคอร์เซอร์ของกระดาษวาด
 *
 * เคอร์เซอร์ของระบบเป็นกากบาทสีดำบาง ๆ กว้างสิบกว่าพิกเซล
 * บนจอโปรเจกเตอร์หน้าห้อง เด็กแถวหลังมองไม่เห็นเลยว่าครูกำลังชี้ตรงไหน
 * และตอนใช้ปากกาบนแท็บเล็ต ปลายปากกากับปลายดินสอจริงมักเยื้องกันเล็กน้อย
 * จนเด็กไม่แน่ใจว่าเส้นจะลงตรงไหนกันแน่
 *
 * วงแหวนนี้จึงทำหน้าที่สองอย่างพร้อมกัน
 * บอกว่าปลายดินสอจะลงตรงไหน และบอกว่าตอนนี้แม่เหล็กจับจุดสำคัญไว้แล้วหรือยัง
 * เส้นขาวด้านนอกมีไว้ให้มองเห็นได้ทั้งบนกระดาษว่างและบนเส้นสีเข้ม
 */

import type { Point } from './geo'

interface PointerCursorProps {
  at: Point
  color: string
  /** แม่เหล็กจับจุดสำคัญไว้แล้ว เช่น ปลายเส้นเดิมหรือจุดที่ส่วนโค้งตัดกัน */
  onTarget: boolean
  /** กำลังวาดอยู่ ไม่ใช่แค่เลื่อนผ่าน */
  drawing: boolean
  /** กำลังขยายกี่เท่า ใช้หารขนาดให้วงแหวนเท่าเดิมบนจอเสมอ */
  scale: number
}

export function PointerCursor({ at, color, onTarget, drawing, scale }: PointerCursorProps) {
  /*
   * ทุกขนาดในนี้หารด้วยกำลังขยาย
   *
   * วงแหวนเป็นของบนจอ ไม่ใช่ของบนกระดาษ ถ้าไม่หาร พอซูมสี่เท่าแล้ว
   * วงแหวนจะใหญ่เท่ากำปั้นจนบังจุดที่มันพยายามชี้ให้ดูเสียเอง
   */
  const ring = (onTarget ? 18 : 15) / scale
  const thin = 1 / scale
  const tint = onTarget ? '#db2777' : color

  return (
    <g transform={`translate(${at.x} ${at.y})`} pointerEvents="none" className="geo-cursor">
      {/* วงขาวด้านนอก ทำให้เห็นวงแหวนได้บนพื้นทุกสี */}
      <circle r={ring} fill="none" stroke="#ffffff" strokeWidth={6 * thin} opacity={0.9} />
      <circle
        r={ring}
        fill="none"
        stroke={tint}
        strokeWidth={3.5 * thin}
        opacity={drawing ? 1 : 0.92}
      />

      {/* กากบาทสี่ขีด บอกจุดกึ่งกลางให้แม่นกว่าวงแหวนอย่างเดียว */}
      {[0, 90, 180, 270].map((deg) => {
        const rad = (deg * Math.PI) / 180
        const from = ring + 5 * thin
        const to = ring + 13 * thin
        return (
          <line
            key={deg}
            x1={Math.cos(rad) * from}
            y1={-Math.sin(rad) * from}
            x2={Math.cos(rad) * to}
            y2={-Math.sin(rad) * to}
            stroke="#ffffff"
            strokeWidth={5 * thin}
            strokeLinecap="round"
          />
        )
      })}
      {[0, 90, 180, 270].map((deg) => {
        const rad = (deg * Math.PI) / 180
        const from = ring + 5 * thin
        const to = ring + 13 * thin
        return (
          <line
            key={`in-${deg}`}
            x1={Math.cos(rad) * from}
            y1={-Math.sin(rad) * from}
            x2={Math.cos(rad) * to}
            y2={-Math.sin(rad) * to}
            stroke={tint}
            strokeWidth={2.5 * thin}
            strokeLinecap="round"
          />
        )
      })}

      <circle r={3.5 * thin} fill="#ffffff" />
      <circle r={2 * thin} fill={tint} />

      {/* จับจุดได้แล้ว วงนอกอีกวงบอกให้รู้ทันทีโดยไม่ต้องอ่านตัวหนังสือ */}
      {onTarget ? (
        <circle
          r={ring + 9 * thin}
          fill="none"
          stroke={tint}
          strokeWidth={2 * thin}
          strokeDasharray={`${5 * thin} ${5 * thin}`}
          opacity={0.85}
        />
      ) : null}
    </g>
  )
}
