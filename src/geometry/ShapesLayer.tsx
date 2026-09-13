/**
 * ชั้นของรูปที่วาดเสร็จแล้วทั้งหมด
 *
 * แยกออกมาและจำผลไว้ เพราะตั้งแต่มีเคอร์เซอร์วงแหวนที่วิ่งตามปลายปากกา
 * หน้าจอถูกวาดใหม่ทุกครั้งที่ปลายปากกาขยับหนึ่งพิกเซล
 * ถ้าไม่แยก รูปทุกรูปบนกระดาษจะถูกคิดใหม่ทั้งหมดตามไปด้วย
 * ซึ่งบนแท็บเล็ตของโรงเรียนจะกลายเป็นเส้นที่ตามนิ้วไม่ทัน
 */

import { memo } from 'react'
import { ShapeView } from './ShapeView'
import type { Shape } from './shapes'

interface ShapesLayerProps {
  shapes: Shape[]
  selectedId: string | null
  showLengths: boolean
  showAngles: boolean
  showFaces: boolean
}

export const ShapesLayer = memo(function ShapesLayer({
  shapes,
  selectedId,
  showLengths,
  showAngles,
  showFaces,
}: ShapesLayerProps) {
  return (
    <g>
      {shapes.map((shape) => (
        <ShapeView
          key={shape.id}
          shape={shape}
          selected={shape.id === selectedId}
          showLengths={showLengths}
          showAngles={showAngles}
          showFaces={showFaces}
        />
      ))}
    </g>
  )
})
