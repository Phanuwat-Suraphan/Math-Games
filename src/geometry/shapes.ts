/**
 * รูปทรงที่วาดลงกระดาษ และสิ่งที่ทำกับมันได้
 *
 * แยกจาก geo.ts เพราะไฟล์นั้นเป็นสูตรล้วน ๆ ส่วนไฟล์นี้รู้จัก "ของบนกระดาษ"
 * ทั้งสองไฟล์ยังไม่แตะ React เหมือนกัน ชุดทดสอบจึงเรียกได้ทั้งคู่
 */

import {
  angleBetween,
  circleIntersections,
  circleSegmentIntersections,
  areaInCm,
  distance,
  distanceToCircle,
  distanceToSegment,
  formatCm,
  formatDeg,
  angleName,
  angleOf,
  interiorAngles,
  isOnArc,
  polygonArea,
  nearestVertexDistance,
  pointAt,
  polygonCentroid,
  polygonName,
  polygonPerimeter,
  sumInteriorAngles,
  toCm,
} from './geo'
import type { Point } from './geo'

interface Drawn {
  id: string
  color: string
  width: number
}

/** เส้นตรงหนึ่งเส้น ตั้งแต่จุด a ถึงจุด b */
export interface SegmentShape extends Drawn {
  kind: 'segment'
  a: Point
  b: Point
}

/** วงกลมเต็มวงจากวงเวียน */
export interface CircleShape extends Drawn {
  kind: 'circle'
  center: Point
  radius: number
}

/** ส่วนโค้งจากวงเวียน กวาดจากมุม start ไปเป็นระยะ sweep */
export interface ArcShape extends Drawn {
  kind: 'arc'
  center: Point
  radius: number
  start: number
  sweep: number
}

/** รูปหลายเหลี่ยม ปิดรูปแล้วหรือยังลากค้างอยู่ก็ได้ */
export interface PolygonShape extends Drawn {
  kind: 'polygon'
  points: Point[]
  closed: boolean
  fill: string
}

/** จุดที่ปักไว้พร้อมตัวอักษรกำกับ */
export interface DotShape extends Drawn {
  kind: 'dot'
  at: Point
  label: string
}

/** ป้ายบอกขนาดมุม a-vertex-b ที่วัดไว้ */
export interface AngleShape extends Drawn {
  kind: 'angle'
  vertex: Point
  a: Point
  b: Point
}

/**
 * สติกเกอร์ที่แปะลงกระดาษ
 *
 * ไม่ได้มีไว้สวยอย่างเดียว เด็กใช้มันทำเครื่องหมายบนงานตัวเองด้วย
 * เช่น แปะดาวไว้ที่มุมที่ครูให้หา หรือแปะดอกไม้ที่จุดที่วงเวียนตัดกัน
 * มันจึงย้ายได้ ลบได้ และติดไปในภาพที่บันทึกเหมือนรูปอื่นทุกประการ
 */
export interface StickerShape extends Drawn {
  kind: 'sticker'
  at: Point
  emoji: string
  size: number
}

export type Shape =
  | SegmentShape
  | CircleShape
  | ArcShape
  | PolygonShape
  | DotShape
  | AngleShape
  | StickerShape

/** คำอธิบายรูปสำหรับแผงข้อมูลด้านข้าง */
export interface ShapeReport {
  emoji: string
  title: string
  lines: string[]
}

/** ระยะที่ถือว่า "จิ้มโดน" รูป หน่วยเป็นพิกเซลของผืนวาด */
export const HIT_TOLERANCE = 12

/** จุดอยู่ในรูปหลายเหลี่ยมหรือไม่ ใช้วิธียิงรังสีไปทางขวา */
export function isInsidePolygon(p: Point, points: Point[]): boolean {
  if (points.length < 3) return false
  let inside = false
  for (let i = 0, j = points.length - 1; i < points.length; j = i, i += 1) {
    const a = points[i]
    const b = points[j]
    const straddles = a.y > p.y !== b.y > p.y
    if (!straddles) continue
    const crossX = a.x + ((p.y - a.y) * (b.x - a.x)) / (b.y - a.y)
    if (p.x < crossX) inside = !inside
  }
  return inside
}

/** จิ้มตรงนี้โดนรูปนี้ไหม ใช้ทั้งกับยางลบและการเลือก */
export function hitTest(shape: Shape, p: Point, tolerance = HIT_TOLERANCE): boolean {
  switch (shape.kind) {
    case 'segment':
      return distanceToSegment(p, shape.a, shape.b) <= tolerance
    case 'circle':
      return distanceToCircle(p, shape.center, shape.radius) <= tolerance
    case 'arc':
      return (
        distanceToCircle(p, shape.center, shape.radius) <= tolerance &&
        isOnArc(angleOf(shape.center, p), shape.start, shape.sweep)
      )
    case 'polygon': {
      const points = shape.points
      if (points.length === 0) return false
      if (points.length === 1) return distance(p, points[0]) <= tolerance
      const lastEdge = shape.closed ? points.length : points.length - 1
      for (let i = 0; i < lastEdge; i += 1) {
        const a = points[i]
        const b = points[(i + 1) % points.length]
        if (distanceToSegment(p, a, b) <= tolerance) return true
      }
      return shape.closed && isInsidePolygon(p, points)
    }
    case 'dot':
      return distance(p, shape.at) <= tolerance
    case 'angle':
      return distance(p, shape.vertex) <= tolerance * 2
    case 'sticker':
      return distance(p, shape.at) <= shape.size * 0.6
    default:
      return false
  }
}

/** หารูปบนสุดที่ถูกจิ้ม (รูปที่วาดทีหลังอยู่บนสุด) */
export function findShapeAt(
  shapes: Shape[],
  p: Point,
  tolerance = HIT_TOLERANCE,
): Shape | null {
  for (let i = shapes.length - 1; i >= 0; i -= 1) {
    if (hitTest(shapes[i], p, tolerance)) return shapes[i]
  }
  return null
}

/** ย้ายรูปทั้งรูปไปตามระยะที่ลาก */
export function translateShape(shape: Shape, dx: number, dy: number): Shape {
  const move = (p: Point): Point => ({ x: p.x + dx, y: p.y + dy })
  switch (shape.kind) {
    case 'segment':
      return { ...shape, a: move(shape.a), b: move(shape.b) }
    case 'circle':
      return { ...shape, center: move(shape.center) }
    case 'arc':
      return { ...shape, center: move(shape.center) }
    case 'polygon':
      return { ...shape, points: shape.points.map(move) }
    case 'dot':
      return { ...shape, at: move(shape.at) }
    case 'angle':
      return { ...shape, vertex: move(shape.vertex), a: move(shape.a), b: move(shape.b) }
    case 'sticker':
      return { ...shape, at: move(shape.at) }
    default:
      return shape
  }
}

/**
 * จุดสำคัญของรูป ใช้เป็นเป้าให้ปลายดินสอดูดเข้าหา
 *
 * การต่อเส้นให้ชนจุดเดิมพอดีคือสิ่งที่เด็กทำพลาดบ่อยที่สุด
 * ปลายเส้นห่างกันสองพิกเซลทำให้รูปไม่ปิด แล้วมุมภายในที่คำนวณได้ก็ผิดตามไปหมด
 */
export function shapeAnchors(shape: Shape): Point[] {
  switch (shape.kind) {
    case 'segment':
      return [shape.a, shape.b]
    case 'circle':
      return [shape.center]
    case 'arc':
      /*
       * ปลายส่วนโค้งทั้งสองข้างเป็นจุดสำคัญไม่แพ้จุดศูนย์กลาง
       * เพราะการสร้างรูปด้วยวงเวียนมักจบที่การลากเส้นไปยังปลายโค้งหรือจุดที่โค้งตัดกัน
       */
      return [
        shape.center,
        pointAt(shape.center, shape.radius, shape.start),
        pointAt(shape.center, shape.radius, shape.start + shape.sweep),
      ]
    case 'polygon':
      return [...shape.points]
    case 'dot':
      return [shape.at]
    case 'angle':
      return [shape.vertex]
    case 'sticker':
      /* สติกเกอร์เป็นของตกแต่ง ไม่ควรดูดปลายเส้นให้เบี้ยวไปจากจุดที่ตั้งใจ */
      return []
    default:
      return []
  }
}

/** หาจุดสำคัญที่ใกล้ที่สุดในระยะที่กำหนด ไม่เจอก็คืน null */
export function nearestAnchor(
  shapes: Shape[],
  p: Point,
  radius: number,
): Point | null {
  let best: Point | null = null
  let bestDistance = radius
  for (const shape of shapes) {
    for (const anchor of shapeAnchors(shape)) {
      const d = distance(p, anchor)
      if (d <= bestDistance) {
        best = anchor
        bestDistance = d
      }
    }
  }
  return best ? { x: best.x, y: best.y } : null
}

/** เส้นตรงทุกเส้นบนกระดาษ ทั้งเส้นเดี่ยวและด้านของรูปหลายเหลี่ยม */
function allEdges(shapes: Shape[]): { a: Point; b: Point }[] {
  const edges: { a: Point; b: Point }[] = []
  for (const shape of shapes) {
    if (shape.kind === 'segment') {
      edges.push({ a: shape.a, b: shape.b })
      continue
    }
    if (shape.kind === 'polygon') {
      const points = shape.points
      const last = shape.closed ? points.length : points.length - 1
      for (let i = 0; i < last; i += 1) {
        edges.push({ a: points[i], b: points[(i + 1) % points.length] })
      }
    }
  }
  return edges
}

/**
 * จุดที่เส้นโค้งตัดกับเส้นโค้ง และเส้นโค้งตัดกับเส้นตรง
 *
 * จุดพวกนี้ไม่ได้ถูกวาดไว้เป็นรูป มันเกิดขึ้นเองจากการที่รูปสองรูปพาดกัน
 * แต่เป็นจุดที่เด็กต้องลากเส้นไปหาบ่อยที่สุดในงานวงเวียน
 * ถ้าไม่มีแม่เหล็กดูดให้ เด็กจะกะเอาด้วยสายตาแล้วรูปเพี้ยนทุกครั้ง
 */
export function intersectionTargets(shapes: Shape[]): Point[] {
  const rounds = shapes.filter(
    (shape): shape is CircleShape | ArcShape => shape.kind === 'circle' || shape.kind === 'arc',
  )
  const edges = allEdges(shapes)
  const found: Point[] = []

  /** จุดนี้อยู่บนส่วนโค้งจริงไหม วงกลมเต็มวงถือว่าอยู่เสมอ */
  const onShape = (shape: CircleShape | ArcShape, point: Point): boolean =>
    shape.kind === 'circle' || isOnArc(angleOf(shape.center, point), shape.start, shape.sweep)

  for (let i = 0; i < rounds.length; i += 1) {
    for (let j = i + 1; j < rounds.length; j += 1) {
      const first = rounds[i]
      const second = rounds[j]
      for (const point of circleIntersections(
        first.center,
        first.radius,
        second.center,
        second.radius,
      )) {
        if (onShape(first, point) && onShape(second, point)) found.push(point)
      }
    }

    for (const edge of edges) {
      const round = rounds[i]
      for (const point of circleSegmentIntersections(round.center, round.radius, edge.a, edge.b)) {
        if (onShape(round, point)) found.push(point)
      }
    }
  }

  return found
}

/**
 * จุดที่ปลายดินสอควรวิ่งไปชน เรียงความสำคัญจากมากไปน้อย
 *
 * จุดยอดที่มีอยู่แล้วมาก่อนจุดตัดเสมอ เพราะถ้าทั้งสองอย่างอยู่ใกล้กัน
 * สิ่งที่เด็กตั้งใจจะชนคือจุดที่มองเห็นอยู่ ไม่ใช่จุดที่เกิดจากเส้นพาดกัน
 */
export function nearestSnapPoint(shapes: Shape[], p: Point, radius: number): Point | null {
  const anchor = nearestAnchor(shapes, p, radius)
  if (anchor) return anchor

  let best: Point | null = null
  let bestDistance = radius
  for (const point of intersectionTargets(shapes)) {
    const away = distance(p, point)
    if (away <= bestDistance) {
      best = point
      bestDistance = away
    }
  }
  return best
}

/**
 * คำอธิบายของรูปที่เลือกอยู่
 *
 * นี่คือส่วนที่ทำให้เครื่องมือชุดนี้เป็นของสำหรับสอน ไม่ใช่โปรแกรมวาดรูปเฉย ๆ
 * เด็กวาดห้าเหลี่ยมเสร็จแล้วต้องอ่านได้ทันทีว่ามุมภายในรวมกันได้ 540°
 * โดยไม่ต้องมีใครมาบอก
 */
export function describeShape(shape: Shape): ShapeReport {
  switch (shape.kind) {
    case 'segment': {
      const length = distance(shape.a, shape.b)
      return {
        emoji: '📏',
        title: 'ส่วนของเส้นตรง',
        lines: [
          `ความยาว ${formatCm(length)}`,
          `ทำมุมกับแนวนอน ${formatDeg(angleOf(shape.a, shape.b))}`,
        ],
      }
    }
    case 'circle': {
      const radiusCm = toCm(shape.radius)
      return {
        emoji: '⭕',
        title: 'วงกลม',
        lines: [
          `รัศมี ${formatCm(shape.radius)}`,
          `เส้นผ่านศูนย์กลาง ${formatCm(shape.radius * 2)}`,
          `เส้นรอบวง ≈ ${(2 * Math.PI * radiusCm).toFixed(1)} ซม.`,
          `พื้นที่ ≈ ${(Math.PI * radiusCm * radiusCm).toFixed(1)} ตร.ซม.`,
        ],
      }
    }
    case 'arc': {
      const sweep = Math.abs(shape.sweep)
      const arcLength = (sweep / 360) * 2 * Math.PI * toCm(shape.radius)
      return {
        emoji: '🌙',
        title: 'ส่วนโค้ง',
        lines: [
          `รัศมี ${formatCm(shape.radius)}`,
          `มุมที่จุดศูนย์กลาง ${formatDeg(sweep)}`,
          `ความยาวส่วนโค้ง ≈ ${arcLength.toFixed(1)} ซม.`,
        ],
      }
    }
    case 'polygon': {
      const points = shape.points
      if (!shape.closed || points.length < 3) {
        return {
          emoji: '✏️',
          title: 'เส้นหลายท่อน',
          lines: [
            `มี ${points.length} จุด`,
            'จิ้มจุดแรกอีกครั้งเพื่อปิดรูป',
          ],
        }
      }
      const angles = interiorAngles(points)
      const measured = angles.reduce((total, value) => total + value, 0)
      const sides = points.map((point, index) =>
        distance(point, points[(index + 1) % points.length]),
      )
      const shortest = Math.min(...sides)
      const longest = Math.max(...sides)
      const equalSides = longest - shortest < 2
      return {
        emoji: '🔷',
        title: polygonName(points.length),
        lines: [
          `มี ${points.length} ด้าน และ ${points.length} มุม`,
          `ความยาวรอบรูป ${formatCm(polygonPerimeter(points))}`,
          `พื้นที่ ≈ ${areaInCm(points).toFixed(1)} ตร.ซม.`,
          `มุมภายในรวมกันได้ ${formatDeg(measured)} (สูตร (${points.length}-2)×180 = ${sumInteriorAngles(
            points.length,
          )}°)`,
          equalSides ? 'ด้านทุกด้านยาวเท่ากัน 🎉' : `ด้านสั้นสุด ${formatCm(shortest)} ยาวสุด ${formatCm(longest)}`,
        ],
      }
    }
    case 'dot':
      return {
        emoji: '📍',
        title: `จุด ${shape.label}`,
        lines: ['ลากไปวางตรงไหนก็ได้ ใช้เป็นหมุดให้เส้นมาชนพอดี'],
      }
    case 'angle': {
      const size = angleBetween(shape.a, shape.vertex, shape.b)
      return {
        emoji: '📐',
        title: `มุมที่วัดไว้ ${formatDeg(size)}`,
        lines: [`เป็น${angleName(size)}`],
      }
    }
    case 'sticker':
      return {
        emoji: shape.emoji,
        title: 'สติกเกอร์',
        lines: ['ลากย้ายไปตรงไหนก็ได้ ใช้ทำเครื่องหมายบนงานของเราเอง'],
      }

    default:
      return { emoji: '❔', title: 'รูป', lines: [] }
  }
}

/** ใจกลางของรูป ใช้เป็นที่ระเบิดประกายตอนวาดเสร็จ */
export function shapeCenter(shape: Shape): Point {
  switch (shape.kind) {
    case 'segment':
      return { x: (shape.a.x + shape.b.x) / 2, y: (shape.a.y + shape.b.y) / 2 }
    case 'circle':
    case 'arc':
      return { ...shape.center }
    case 'polygon':
      return polygonCentroid(shape.points)
    case 'dot':
      return { ...shape.at }
    case 'angle':
      return { ...shape.vertex }
    case 'sticker':
      return { ...shape.at }
    default:
      return { x: 0, y: 0 }
  }
}

/**
 * ที่วางหน้าตาการ์ตูนบนรูป
 *
 * ใส่ให้เฉพาะรูปปิดที่ใหญ่พอ เพราะหน้าบนรูปเล็กจะกลายเป็นจุดสามจุดมั่ว ๆ
 * ที่อ่านไม่ออกว่าเป็นอะไร และไปบังป้ายบอกมุมที่อยู่ตรงนั้นพอดี
 */
export function faceOf(shape: Shape): { center: Point; size: number } | null {
  if (shape.kind === 'circle') {
    return shape.radius >= 34 ? { center: { ...shape.center }, size: shape.radius } : null
  }
  if (shape.kind !== 'polygon' || !shape.closed || shape.points.length < 3) return null

  const center = polygonCentroid(shape.points)
  /* ใช้ระยะถึงจุดยอดที่ใกล้ที่สุด หน้าจะได้ไม่ล้นออกนอกรูปที่แบนหรือแหลม */
  const size = nearestVertexDistance(center, shape.points)
  return size >= 34 ? { center, size } : null
}

/** สรุปทั้งกระดาษ ใช้โชว์ตอนยังไม่ได้เลือกรูปไหน */
export function describeBoard(shapes: Shape[]): string[] {
  const polygons = shapes.filter(
    (shape): shape is PolygonShape => shape.kind === 'polygon' && shape.closed,
  )
  const circles = shapes.filter((shape) => shape.kind === 'circle' || shape.kind === 'arc')
  const segments = shapes.filter((shape) => shape.kind === 'segment')
  const lines: string[] = []
  if (polygons.length > 0) {
    const biggest = polygons.reduce((best, shape) =>
      polygonArea(shape.points) > polygonArea(best.points) ? shape : best,
    )
    lines.push(
      `รูปหลายเหลี่ยม ${polygons.length} รูป ใหญ่ที่สุดคือ${polygonName(biggest.points.length)}`,
    )
  }
  if (circles.length > 0) lines.push(`วงกลมและส่วนโค้งจากวงเวียน ${circles.length} ชิ้น`)
  if (segments.length > 0) lines.push(`ส่วนของเส้นตรง ${segments.length} เส้น`)
  if (lines.length === 0) lines.push('กระดาษยังว่างอยู่ เลือกเครื่องมือทางซ้ายแล้วเริ่มวาดได้เลย')
  return lines
}
