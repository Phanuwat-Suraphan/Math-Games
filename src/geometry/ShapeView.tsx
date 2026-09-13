/**
 * การวาดรูปหนึ่งรูปลงบนกระดาษ
 *
 * ป้ายความยาวด้านกับป้ายมุมภายในอยู่ในนี้ด้วย ไม่ได้แยกเป็นชั้นต่างหาก
 * เพราะป้ายต้องขยับตามรูปเสมอ ถ้าแยกกันคนละที่จะมีวันที่ลืมขยับตาม
 * แล้วจะได้ป้ายที่บอกเลขของรูปเมื่อสองวินาทีที่แล้ว ซึ่งแย่กว่าไม่มีป้าย
 */

import {
  areaInCm,
  angleOf,
  arcPath,
  distance,
  formatCm,
  formatDeg,
  interiorAngles,
  normalizeDeg,
  pointAt,
  polygonCentroid,
  polygonPerimeter,
  toCm,
  angleBetween,
} from './geo'
import type { Point } from './geo'
import { faceOf } from './shapes'
import type { Shape } from './shapes'
import { edgeLabelAnchor, isMoved, labelKey, offsetOf } from './labels'
import type { LabelOffsets } from './labels'
import type { PointerEvent as ReactPointerEvent } from 'react'

interface ShapeViewProps {
  shape: Shape
  selected: boolean
  showLengths: boolean
  showAngles: boolean
  /** ใส่หน้าตาการ์ตูนให้รูปปิดที่ใหญ่พอ */
  showFaces: boolean
  /** ป้ายพื้นที่กลางรูป */
  showArea: boolean
  /** ป้ายความยาวรอบรูป */
  showPerimeter: boolean
  /** ป้ายไหนถูกลากหลบไปไว้ตรงไหนแล้วบ้าง */
  offsets: LabelOffsets
  /** ส่งมาเมื่ออนุญาตให้ลากป้ายได้ ไม่ส่งมาแปลว่าป้ายให้คลิกทะลุผ่านไปได้เลย */
  onLabelGrab?: (key: string, event: ReactPointerEvent<SVGElement>) => void
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

/**
 * ป้ายตัวเลขหนึ่งอัน ลากหลบได้เมื่อมันไปบังเส้น
 *
 * ตอนถูกลากออกมาจากที่เดิม จะมีเส้นประลากจากที่เดิมไปหาป้าย
 * ไม่งั้นป้าย "3.5 ซม." ที่ลอยอยู่ จะไม่มีใครรู้ว่าบอกความยาวของด้านไหน
 */
function LabelPill({
  at,
  keyName,
  offsets,
  onGrab,
  text,
  color,
  background,
}: {
  at: Point
  keyName: string
  offsets: LabelOffsets
  onGrab?: (key: string, event: ReactPointerEvent<SVGElement>) => void
  text: string
  color: string
  background: string
}) {
  const width = Math.max(34, text.length * 8.2 + 14)
  const offset = offsetOf(offsets, keyName)
  const spot = { x: at.x + offset.x, y: at.y + offset.y }

  return (
    <g>
      {isMoved(offset) ? (
        <line
          x1={at.x}
          y1={at.y}
          x2={spot.x}
          y2={spot.y}
          stroke={color}
          strokeWidth={1.3}
          strokeDasharray="4 4"
          opacity={0.6}
          pointerEvents="none"
        />
      ) : null}
      <g
        transform={`translate(${spot.x} ${spot.y})`}
        pointerEvents={onGrab ? 'auto' : 'none'}
        className={onGrab ? 'geo-label' : undefined}
        onPointerDown={onGrab ? (event) => onGrab(keyName, event) : undefined}
      >
        {/* พื้นที่กดกว้างกว่าตัวป้าย ให้นิ้วเด็กจับป้ายเล็ก ๆ ได้ */}
        {onGrab ? (
          <rect x={-width / 2 - 6} y={-18} width={width + 12} height={35} rx={16} fill="transparent" />
        ) : null}
        <rect x={-width / 2} y={-12} width={width} height={23} rx={11} fill={background} opacity={0.95} />
        <text
          textAnchor="middle"
          y={4}
          fontSize={13}
          fontWeight={700}
          fill={color}
          fontFamily="Kanit, sans-serif"
          pointerEvents="none"
        >
          {text}
        </text>
      </g>
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

/**
 * หน้าตาการ์ตูนบนรูป
 *
 * ไม่ได้มีไว้ขำอย่างเดียว หนังสือเรียนไทยหลายเล่มวาดรูปทรงเป็นตัวละคร
 * เพราะเด็กจำ "สามเหลี่ยมหน้ายิ้ม" ได้ง่ายกว่าจำคำว่ารูปสามเหลี่ยมด้านเท่า
 * ขนาดทุกส่วนคิดจากขนาดรูป หน้าจึงพอดีตัวทั้งรูปเล็กและรูปใหญ่
 */
function ShapeFace({ center, size, color }: { center: Point; size: number; color: string }) {
  const eye = Math.max(2.6, size * 0.1)
  const gap = size * 0.3
  return (
    <g transform={`translate(${center.x} ${center.y})`} pointerEvents="none">
      <circle cx={-gap} cy={-size * 0.12} r={eye} fill="#1e293b" />
      <circle cx={gap} cy={-size * 0.12} r={eye} fill="#1e293b" />
      <circle cx={-gap + eye * 0.35} cy={-size * 0.12 - eye * 0.35} r={eye * 0.34} fill="#ffffff" />
      <circle cx={gap + eye * 0.35} cy={-size * 0.12 - eye * 0.35} r={eye * 0.34} fill="#ffffff" />
      <circle cx={-gap - eye * 1.9} cy={size * 0.08} r={eye * 0.95} fill="#fb7185" opacity={0.45} />
      <circle cx={gap + eye * 1.9} cy={size * 0.08} r={eye * 0.95} fill="#fb7185" opacity={0.45} />
      <path
        d={`M ${-size * 0.2} ${size * 0.1} Q 0 ${size * 0.33} ${size * 0.2} ${size * 0.1}`}
        fill="none"
        stroke={color}
        strokeWidth={Math.max(2, size * 0.05)}
        strokeLinecap="round"
      />
    </g>
  )
}

export function ShapeView({
  shape,
  selected,
  showLengths,
  showAngles,
  showFaces,
  showArea,
  showPerimeter,
  offsets,
  onLabelGrab,
}: ShapeViewProps) {
  const face = showFaces ? faceOf(shape) : null
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
      {shape.kind === 'sticker' ? (
        <circle cx={shape.at.x} cy={shape.at.y} r={shape.size * 0.62} fill="#f472b6" />
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
              at={edgeLabelAnchor(shape.a, shape.b, null)}
              keyName={labelKey(shape.id, 'len')}
              offsets={offsets}
              onGrab={onLabelGrab}
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
          {face ? <ShapeFace center={face.center} size={face.size} color={shape.color} /> : null}

          {showArea ? (
            <LabelPill
              at={{ x: shape.center.x, y: shape.center.y + (face ? 34 : 0) }}
              keyName={labelKey(shape.id, 'area')}
              offsets={offsets}
              onGrab={onLabelGrab}
              text={`พื้นที่ ≈ ${(Math.PI * toCm(shape.radius) * toCm(shape.radius)).toFixed(1)} ตร.ซม.`}
              color="#0f766e"
              background="#ccfbf1"
            />
          ) : null}
          {showPerimeter ? (
            <LabelPill
              at={{ x: shape.center.x, y: shape.center.y + shape.radius + 20 }}
              keyName={labelKey(shape.id, 'perimeter')}
              offsets={offsets}
              onGrab={onLabelGrab}
              text={`เส้นรอบวง ≈ ${(2 * Math.PI * toCm(shape.radius)).toFixed(1)} ซม.`}
              color="#9a3412"
              background="#ffedd5"
            />
          ) : null}
          {showLengths ? (
            <LabelPill
              at={{ x: shape.center.x, y: shape.center.y - shape.radius - 4 }}
              keyName={labelKey(shape.id, 'radius')}
              offsets={offsets}
              onGrab={onLabelGrab}
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
              keyName={labelKey(shape.id, 'arc')}
              offsets={offsets}
              onGrab={onLabelGrab}
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
      /* ใช้เป็นทิศ "ข้างนอกรูป" ให้ป้ายความยาวด้านเลื่อนออกไปไม่ให้ทับเส้น */
      const center = polygonCentroid(points)
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

          {face ? <ShapeFace center={face.center} size={face.size} color={shape.color} /> : null}

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
                      keyName={labelKey(shape.id, 'angle', index)}
                      offsets={offsets}
                      onGrab={onLabelGrab}
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
                    at={edgeLabelAnchor(point, next, shape.closed ? center : null)}
                    keyName={labelKey(shape.id, 'edge', index)}
                    offsets={offsets}
                    onGrab={onLabelGrab}
                    text={formatCm(length)}
                    color={shape.color}
                    background="#ffffff"
                  />
                )
              })
            : null}

          {/*
            ป้ายพื้นที่กับรอบรูป ใช้สีคนละชุดกับป้ายความยาวด้านโดยตั้งใจ
            เพราะสามอย่างนี้เป็นคนละเรื่องกัน และมักถูกถามพร้อมกันในโจทย์เดียว
            ถ้าสีเหมือนกันหมด เด็กจะอ่านสลับกันแล้วตอบผิดทั้งที่รูปถูก
          */}
          {showArea && shape.closed && points.length >= 3 ? (
            <LabelPill
              at={{ x: center.x, y: center.y + (face ? 30 : 0) }}
              keyName={labelKey(shape.id, 'area')}
              offsets={offsets}
              onGrab={onLabelGrab}
              text={`พื้นที่ ${areaInCm(points).toFixed(1)} ตร.ซม.`}
              color="#0f766e"
              background="#ccfbf1"
            />
          ) : null}

          {showPerimeter && shape.closed && points.length >= 3 ? (
            <LabelPill
              at={{
                x: center.x,
                y: points.reduce((top, point) => Math.min(top, point.y), Infinity) - 22,
              }}
              keyName={labelKey(shape.id, 'perimeter')}
              offsets={offsets}
              onGrab={onLabelGrab}
              text={`รอบรูป ${toCm(polygonPerimeter(points)).toFixed(1)} ซม.`}
              color="#9a3412"
              background="#ffedd5"
            />
          ) : null}

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
            keyName={labelKey(shape.id, 'deg')}
            offsets={offsets}
            onGrab={onLabelGrab}
            text={formatDeg(mark.size)}
            color="#be185d"
            background="#fce7f3"
          />
        </g>
      )
    }

    case 'sticker':
      return (
        <g>
          {halo}
          <text
            x={shape.at.x}
            y={shape.at.y}
            fontSize={shape.size}
            textAnchor="middle"
            dominantBaseline="central"
            pointerEvents="none"
          >
            {shape.emoji}
          </text>
        </g>
      )

    default:
      return null
  }
}
