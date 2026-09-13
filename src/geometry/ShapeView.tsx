/**
 * การวาดรูปหนึ่งรูปลงบนกระดาษ
 *
 * ป้ายความยาวด้านกับป้ายมุมภายในอยู่ในนี้ด้วย ไม่ได้แยกเป็นชั้นต่างหาก
 * เพราะป้ายต้องขยับตามรูปเสมอ ถ้าแยกกันคนละที่จะมีวันที่ลืมขยับตาม
 * แล้วจะได้ป้ายที่บอกเลขของรูปเมื่อสองวินาทีที่แล้ว ซึ่งแย่กว่าไม่มีป้าย
 */

import {
  angleOf,
  arcPath,
  distance,
  formatCm,
  formatDeg,
  interiorAngles,
  midpoint,
  normalizeDeg,
  pointAt,
  angleBetween,
} from './geo'
import type { Point } from './geo'
import type { Shape } from './shapes'

interface ShapeViewProps {
  shape: Shape
  selected: boolean
  showLengths: boolean
  showAngles: boolean
}

/**
 * จุดปลายเส้น
 *
 * เด็กต้องเห็นว่า "เส้นนี้จบตรงไหน" ถึงจะเอาปลายเส้นถัดไปมาต่อให้ชนได้
 * เส้นที่ไม่มีจุดปลายทำให้รูปที่ดูเหมือนปิดแล้ว จริง ๆ ยังมีช่องโหว่อยู่สองพิกเซล
 * ซึ่งทำให้มุมภายในที่คำนวณได้ผิดไปทั้งรูปโดยไม่มีใครสังเกต
 */
function EndPoint({ at, color }: { at: Point; color: string }) {
  return (
    <circle
      cx={at.x}
      cy={at.y}
      r={5}
      fill="#ffffff"
      stroke={color}
      strokeWidth={2.5}
      pointerEvents="none"
    />
  )
}

function LabelPill({
  at,
  text,
  color,
  background,
}: {
  at: Point
  text: string
  color: string
  background: string
}) {
  const width = Math.max(34, text.length * 8.2 + 14)
  return (
    <g transform={`translate(${at.x} ${at.y})`} pointerEvents="none">
      <rect x={-width / 2} y={-12} width={width} height={23} rx={11} fill={background} opacity={0.95} />
      <text
        textAnchor="middle"
        y={4}
        fontSize={13}
        fontWeight={700}
        fill={color}
        fontFamily="Kanit, sans-serif"
      >
        {text}
      </text>
    </g>
  )
}

/** มุมภายในที่จุดยอดหนึ่งจุด คืนทั้งส่วนโค้งและตำแหน่งป้าย */
function vertexAngleMarks(previous: Point, vertex: Point, next: Point) {
  const toPrevious = angleOf(vertex, previous)
  const toNext = angleOf(vertex, next)
  const delta = normalizeDeg(toNext - toPrevious)
  const sweep = delta <= 180 ? delta : delta - 360
  const radius = Math.min(26, distance(vertex, previous) / 3, distance(vertex, next) / 3)
  return {
    path: arcPath(vertex, radius, toPrevious, sweep),
    labelAt: pointAt(vertex, radius + 18, toPrevious + sweep / 2),
    size: angleBetween(previous, vertex, next),
  }
}

export function ShapeView({ shape, selected, showLengths, showAngles }: ShapeViewProps) {
  const halo = selected ? (
    <g opacity={0.4} pointerEvents="none">
      {shape.kind === 'segment' ? (
        <line
          x1={shape.a.x}
          y1={shape.a.y}
          x2={shape.b.x}
          y2={shape.b.y}
          stroke="#f472b6"
          strokeWidth={shape.width + 10}
          strokeLinecap="round"
        />
      ) : null}
      {shape.kind === 'circle' ? (
        <circle
          cx={shape.center.x}
          cy={shape.center.y}
          r={shape.radius}
          fill="none"
          stroke="#f472b6"
          strokeWidth={shape.width + 10}
        />
      ) : null}
      {shape.kind === 'arc' ? (
        <path
          d={arcPath(shape.center, shape.radius, shape.start, shape.sweep)}
          fill="none"
          stroke="#f472b6"
          strokeWidth={shape.width + 10}
          strokeLinecap="round"
        />
      ) : null}
      {shape.kind === 'polygon' ? (
        <polyline
          points={shape.points
            .concat(shape.closed && shape.points.length > 0 ? [shape.points[0]] : [])
            .map((point) => `${point.x},${point.y}`)
            .join(' ')}
          fill="none"
          stroke="#f472b6"
          strokeWidth={shape.width + 10}
          strokeLinejoin="round"
        />
      ) : null}
      {shape.kind === 'dot' ? (
        <circle cx={shape.at.x} cy={shape.at.y} r={13} fill="#f472b6" />
      ) : null}
      {shape.kind === 'angle' ? (
        <circle cx={shape.vertex.x} cy={shape.vertex.y} r={16} fill="#f472b6" />
      ) : null}
    </g>
  ) : null

  switch (shape.kind) {
    case 'segment': {
      const length = distance(shape.a, shape.b)
      return (
        <g>
          {halo}
          <line
            x1={shape.a.x}
            y1={shape.a.y}
            x2={shape.b.x}
            y2={shape.b.y}
            stroke={shape.color}
            strokeWidth={shape.width}
            strokeLinecap="round"
          />
          <EndPoint at={shape.a} color={shape.color} />
          <EndPoint at={shape.b} color={shape.color} />
          {showLengths && length > 24 ? (
            <LabelPill
              at={midpoint(shape.a, shape.b)}
              text={formatCm(length)}
              color={shape.color}
              background="#ffffff"
            />
          ) : null}
        </g>
      )
    }

    case 'circle':
      return (
        <g>
          {halo}
          <circle
            cx={shape.center.x}
            cy={shape.center.y}
            r={shape.radius}
            fill="none"
            stroke={shape.color}
            strokeWidth={shape.width}
          />
          <circle cx={shape.center.x} cy={shape.center.y} r={3.5} fill={shape.color} />
          {showLengths ? (
            <LabelPill
              at={{ x: shape.center.x, y: shape.center.y - shape.radius - 4 }}
              text={`รัศมี ${formatCm(shape.radius)}`}
              color={shape.color}
              background="#ffffff"
            />
          ) : null}
        </g>
      )

    case 'arc':
      return (
        <g>
          {halo}
          <path
            d={arcPath(shape.center, shape.radius, shape.start, shape.sweep)}
            fill="none"
            stroke={shape.color}
            strokeWidth={shape.width}
            strokeLinecap="round"
          />
          <circle cx={shape.center.x} cy={shape.center.y} r={3.5} fill={shape.color} opacity={0.6} />
          <EndPoint at={pointAt(shape.center, shape.radius, shape.start)} color={shape.color} />
          <EndPoint
            at={pointAt(shape.center, shape.radius, shape.start + shape.sweep)}
            color={shape.color}
          />
          {showAngles ? (
            <LabelPill
              at={pointAt(shape.center, shape.radius + 20, shape.start + shape.sweep / 2)}
              text={formatDeg(Math.abs(shape.sweep))}
              color={shape.color}
              background="#ffffff"
            />
          ) : null}
        </g>
      )

    case 'polygon': {
      const points = shape.points
      const pointsText = points.map((point) => `${point.x},${point.y}`).join(' ')
      const angles = shape.closed && points.length >= 3 ? interiorAngles(points) : []
      const edgeCount = shape.closed ? points.length : points.length - 1
      return (
        <g>
          {halo}
          {shape.closed ? (
            <polygon
              points={pointsText}
              fill={shape.fill}
              stroke={shape.color}
              strokeWidth={shape.width}
              strokeLinejoin="round"
            />
          ) : (
            <polyline
              points={pointsText}
              fill="none"
              stroke={shape.color}
              strokeWidth={shape.width}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          )}

          {points.map((point, index) => (
            <circle key={`v${index}`} cx={point.x} cy={point.y} r={4} fill={shape.color} />
          ))}

          {showAngles && angles.length > 0
            ? points.map((vertex, index) => {
                const previous = points[(index - 1 + points.length) % points.length]
                const next = points[(index + 1) % points.length]
                const mark = vertexAngleMarks(previous, vertex, next)
                return (
                  <g key={`a${index}`} pointerEvents="none">
                    <path d={mark.path} fill="none" stroke="#db2777" strokeWidth={2} />
                    <LabelPill
                      at={mark.labelAt}
                      text={formatDeg(mark.size)}
                      color="#be185d"
                      background="#fce7f3"
                    />
                  </g>
                )
              })
            : null}

          {showLengths
            ? points.slice(0, Math.max(0, edgeCount)).map((point, index) => {
                const next = points[(index + 1) % points.length]
                const length = distance(point, next)
                if (length < 26) return null
                return (
                  <LabelPill
                    key={`e${index}`}
                    at={midpoint(point, next)}
                    text={formatCm(length)}
                    color={shape.color}
                    background="#ffffff"
                  />
                )
              })
            : null}
        </g>
      )
    }

    case 'dot':
      return (
        <g>
          {halo}
          <circle cx={shape.at.x} cy={shape.at.y} r={6} fill={shape.color} stroke="#ffffff" strokeWidth={2} />
          <text
            x={shape.at.x + 10}
            y={shape.at.y - 10}
            fontSize={16}
            fontWeight={700}
            fill={shape.color}
            fontFamily="Kanit, sans-serif"
            pointerEvents="none"
          >
            {shape.label}
          </text>
        </g>
      )

    case 'angle': {
      const mark = vertexAngleMarks(shape.a, shape.vertex, shape.b)
      return (
        <g>
          {halo}
          <line
            x1={shape.vertex.x}
            y1={shape.vertex.y}
            x2={shape.a.x}
            y2={shape.a.y}
            stroke={shape.color}
            strokeWidth={shape.width}
            strokeLinecap="round"
            opacity={0.55}
            strokeDasharray="7 6"
          />
          <line
            x1={shape.vertex.x}
            y1={shape.vertex.y}
            x2={shape.b.x}
            y2={shape.b.y}
            stroke={shape.color}
            strokeWidth={shape.width}
            strokeLinecap="round"
            opacity={0.55}
            strokeDasharray="7 6"
          />
          <path d={mark.path} fill="none" stroke={shape.color} strokeWidth={2.5} />
          <LabelPill
            at={mark.labelAt}
            text={formatDeg(mark.size)}
            color="#be185d"
            background="#fce7f3"
          />
        </g>
      )
    }

    default:
      return null
  }
}
