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
import type { LabelOffsets } from './labels'
import type { PointerEvent as ReactPointerEvent } from 'react'

interface ShapesLayerProps {
  shapes: Shape[]
  selectedId: string | null
  showLengths: boolean
  showAngles: boolean
  showFaces: boolean
  showArea: boolean
  showPerimeter: boolean
  offsets: LabelOffsets
  onLabelGrab?: (key: string, event: ReactPointerEvent<SVGElement>) => void
}

export const ShapesLayer = memo(function ShapesLayer({
  shapes,
  selectedId,
  showLengths,
  showAngles,
  showFaces,
  showArea,
  showPerimeter,
  offsets,
  onLabelGrab,
}: ShapesLayerProps) {
  /*
   * รูปจากแบบฝึกวาดก่อนเสมอ จึงอยู่ล่างสุดใต้ทุกอย่าง
   * ถ้าเรียงตามลำดับที่วางลงกระดาษ รูปที่วางทีหลังจะทับเส้นที่เด็กวาดไว้ก่อนจนหายไปทั้งแผ่น
   */
  const ordered = [
    ...shapes.filter((shape) => shape.kind === 'photo'),
    ...shapes.filter((shape) => shape.kind !== 'photo'),
  ]

  return (
    <g>
      {ordered.map((shape) => (
        <ShapeView
          key={shape.id}
          shape={shape}
          selected={shape.id === selectedId}
          showLengths={showLengths}
          showAngles={showAngles}
          showFaces={showFaces}
          showArea={showArea}
          showPerimeter={showPerimeter}
          offsets={offsets}
          onLabelGrab={onLabelGrab}
        />
      ))}
    </g>
  )
})
