/**
 * รูปทรงที่วาดลงกระดาษ และสิ่งที่ทำกับมันได้
 *
 * แยกจาก geo.ts เพราะไฟล์นั้นเป็นสูตรล้วน ๆ ส่วนไฟล์นี้รู้จัก "ของบนกระดาษ"
 * ทั้งสองไฟล์ยังไม่แตะ React เหมือนกัน ชุดทดสอบจึงเรียกได้ทั้งคู่
 */

import {
  PX_PER_CM,
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
  normalizeDeg,
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
  /** สีที่ระบายข้างใน ใช้คำว่า none เมื่อยังไม่ระบาย */
  fill: string
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

/**
 * รูปจากแบบฝึกที่วางลงกระดาษ
 *
 * ครูถ่ายรูปมุมในหนังสือแบบฝึกหัดแล้ววางลงที่นี่ เด็กจะได้วัดของจริงในหนังสือ
 * ด้วยครึ่งวงกลมบนจอ แทนที่จะวัดเฉพาะมุมที่โปรแกรมสุ่มขึ้นมาเอง
 *
 * ไม่มีการหมุน ตั้งใจให้เหลือแค่ลากย้ายกับย่อขยาย เพราะสองอย่างนี้พอสำหรับการวัด
 * และปุ่มยิ่งน้อย เด็กยิ่งไม่หลงว่ากดอะไรไปแล้วรูปถึงเบี้ยว
 */
export interface PhotoShape extends Drawn {
  kind: 'photo'
  /** ใจกลางรูป */
  at: Point
  imageWidth: number
  imageHeight: number
  /** ข้อมูลรูปแบบ data URL ฝังไปกับงานที่บันทึก */
  src: string
  /** ความจาง 0 ถึง 1 ปรับให้เส้นที่วาดทับมองเห็นชัดขึ้น */
  fade: number
}

export type Shape =
  | SegmentShape
  | CircleShape
  | ArcShape
  | PolygonShape
  | DotShape
  | AngleShape
  | StickerShape
  | PhotoShape

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
    case 'photo':
      return (
        Math.abs(p.x - shape.at.x) <= shape.imageWidth / 2 &&
        Math.abs(p.y - shape.at.y) <= shape.imageHeight / 2
      )
    default:
      return false
  }
}

/**
 * หารูปบนสุดที่ถูกจิ้ม (รูปที่วาดทีหลังอยู่บนสุด)
 *
 * รูปจากแบบฝึกถูกกันไว้ท้ายแถวเสมอ เพราะมันกินพื้นที่ทั้งผืน
 * ถ้านับรวมตามลำดับปกติ การจิ้มเส้นที่วาดทับรูปจะไปโดนรูปแทนทุกครั้ง
 * แล้วเด็กจะลากรูปแบบฝึกเคลื่อนโดยไม่ได้ตั้งใจแทนที่จะได้เลือกเส้นของตัวเอง
 */
export function findShapeAt(
  shapes: Shape[],
  p: Point,
  tolerance = HIT_TOLERANCE,
): Shape | null {
  for (let i = shapes.length - 1; i >= 0; i -= 1) {
    if (shapes[i].kind !== 'photo' && hitTest(shapes[i], p, tolerance)) return shapes[i]
  }
  for (let i = shapes.length - 1; i >= 0; i -= 1) {
    if (shapes[i].kind === 'photo' && hitTest(shapes[i], p, tolerance)) return shapes[i]
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
    case 'photo':
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
    case 'photo':
      /* ของตกแต่งกับรูปแบบฝึกไม่ควรดูดปลายเส้นให้เบี้ยวไปจากจุดที่ตั้งใจ */
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
    case 'photo':
      return {
        emoji: '🖼️',
        title: 'รูปจากแบบฝึก',
        lines: [
          `กว้าง ${formatCm(shape.imageWidth)} สูง ${formatCm(shape.imageHeight)}`,
          'ลากย้ายและย่อขยายได้ แล้วเอาครึ่งวงกลมทาบวัดได้เลย',
          'ปรับความจางได้ ถ้าอยากให้เส้นที่วาดทับเห็นชัดขึ้น',
        ],
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
    case 'photo':
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

/* ------------------------------------------------------------------ */
/* การย่อขยาย หมุน และตั้งค่าตัวเลขของรูปที่วาดไปแล้ว                      */
/* ------------------------------------------------------------------ */

/**
 * ทำไมรูปที่วาดไปแล้วต้องแก้ได้
 *
 * เด็กวาดสามเหลี่ยมเสร็จแล้วอ่านค่าได้ว่าด้านยาว 3.7 ซม. ทั้งที่ครูสั่ง 4 ซม.
 * ถ้าแก้ไม่ได้ ทางเดียวคือลบทิ้งแล้ววาดใหม่ ซึ่งได้ 3.9 แล้วก็ลบอีก
 * เด็กจะสรุปว่าตัวเองวาดไม่เก่ง ทั้งที่ปัญหาคือเครื่องมือไม่ให้แก้
 *
 * การย่อขยายกับหมุนทุกแบบทำรอบใจกลางของรูปเอง รูปจึงไม่วิ่งหนีออกจากที่เดิม
 */

/** ย่อขยายรูปรอบจุดหนึ่ง */
export function scaleShape(shape: Shape, factor: number, origin: Point): Shape {
  const pull = (p: Point): Point => ({
    x: origin.x + (p.x - origin.x) * factor,
    y: origin.y + (p.y - origin.y) * factor,
  })

  switch (shape.kind) {
    case 'segment':
      return { ...shape, a: pull(shape.a), b: pull(shape.b) }
    case 'circle':
      return { ...shape, center: pull(shape.center), radius: shape.radius * factor }
    case 'arc':
      return { ...shape, center: pull(shape.center), radius: shape.radius * factor }
    case 'polygon':
      return { ...shape, points: shape.points.map(pull) }
    case 'dot':
      return { ...shape, at: pull(shape.at) }
    case 'angle':
      return { ...shape, vertex: pull(shape.vertex), a: pull(shape.a), b: pull(shape.b) }
    case 'sticker':
      return {
        ...shape,
        at: pull(shape.at),
        size: Math.min(160, Math.max(16, shape.size * factor)),
      }
    case 'photo': {
      /* ย่อขยายพร้อมกันทั้งกว้างและสูง สัดส่วนของรูปในหนังสือจึงไม่เพี้ยน ไม่งั้นมุมที่วัดได้จะผิด */
      const grow = Math.min(4, Math.max(0.15, factor))
      return {
        ...shape,
        at: pull(shape.at),
        imageWidth: shape.imageWidth * grow,
        imageHeight: shape.imageHeight * grow,
      }
    }
    default:
      return shape
  }
}

/** หมุนรูปรอบจุดหนึ่ง ทวนเข็มนาฬิกาเป็นบวกเหมือนที่เรียนในห้อง */
export function rotateShape(shape: Shape, deg: number, origin: Point): Shape {
  const spin = (p: Point): Point => pointAt(origin, distance(origin, p), angleOf(origin, p) + deg)

  switch (shape.kind) {
    case 'segment':
      return { ...shape, a: spin(shape.a), b: spin(shape.b) }
    case 'circle':
      return { ...shape, center: spin(shape.center) }
    case 'arc':
      return { ...shape, center: spin(shape.center), start: normalizeDeg(shape.start + deg) }
    case 'polygon':
      return { ...shape, points: shape.points.map(spin) }
    case 'dot':
      return { ...shape, at: spin(shape.at) }
    case 'angle':
      return { ...shape, vertex: spin(shape.vertex), a: spin(shape.a), b: spin(shape.b) }
    case 'sticker':
      return { ...shape, at: spin(shape.at) }
    case 'photo':
      /* รูปจากแบบฝึกไม่หมุน ถ้าหมุนได้ เด็กจะเผลอทำรูปเอียงแล้ววัดมุมผิดไปทั้งข้อ */
      return shape
    default:
      return shape
  }
}

/** ระยะจากใจกลางรูปถึงขอบนอกสุด ใช้วางปุ่มย่อขยายให้ไม่ทับตัวรูป */
export function shapeReach(shape: Shape): number {
  switch (shape.kind) {
    case 'segment':
      return distance(shape.a, shape.b) / 2
    case 'circle':
    case 'arc':
      return shape.radius
    case 'polygon': {
      const center = polygonCentroid(shape.points)
      return shape.points.reduce((far, point) => Math.max(far, distance(center, point)), 0)
    }
    case 'dot':
      return 10
    case 'angle':
      return Math.max(distance(shape.vertex, shape.a), distance(shape.vertex, shape.b))
    case 'sticker':
      return shape.size * 0.6
    case 'photo':
      return Math.max(shape.imageWidth, shape.imageHeight) / 2
    default:
      return 30
  }
}

/**
 * ช่องตั้งค่าตัวเลขของรูปที่เลือกอยู่
 *
 * เปิดเฉพาะค่าที่เด็กได้ยินจากปากครูจริง ๆ เช่น "ยาว 4 เซนติเมตร" "มุม 108 องศา"
 * ไม่ใช่ค่าภายในอย่างพิกัดหรือตัวคูณ ซึ่งเด็กไม่มีทางรู้ว่าควรใส่เท่าไร
 */
export interface ShapeField {
  key: string
  label: string
  value: number
  min: number
  max: number
  step: number
  unit: string
}

export function editableFields(shape: Shape): ShapeField[] {
  switch (shape.kind) {
    case 'segment':
      return [
        {
          key: 'length',
          label: 'ความยาว',
          value: Math.round(toCm(distance(shape.a, shape.b)) * 10) / 10,
          min: 0.5,
          max: 24,
          step: 0.5,
          unit: 'ซม.',
        },
        {
          key: 'tilt',
          label: 'ทำมุมกับแนวนอน',
          value: Math.round(angleOf(shape.a, shape.b)),
          min: 0,
          max: 359,
          step: 5,
          unit: '°',
        },
      ]

    case 'circle':
      return [
        {
          key: 'radius',
          label: 'รัศมี',
          value: Math.round(toCm(shape.radius) * 10) / 10,
          min: 0.5,
          max: 10,
          step: 0.5,
          unit: 'ซม.',
        },
      ]

    case 'arc':
      return [
        {
          key: 'radius',
          label: 'รัศมี',
          value: Math.round(toCm(shape.radius) * 10) / 10,
          min: 0.5,
          max: 10,
          step: 0.5,
          unit: 'ซม.',
        },
        {
          key: 'sweep',
          label: 'มุมที่จุดศูนย์กลาง',
          value: Math.round(Math.abs(shape.sweep)),
          min: 5,
          max: 360,
          step: 5,
          unit: '°',
        },
      ]

    case 'polygon': {
      if (!shape.closed || shape.points.length < 3) return []
      const sides = shape.points.map((point, index) =>
        distance(point, shape.points[(index + 1) % shape.points.length]),
      )
      const equal = Math.max(...sides) - Math.min(...sides) < 2
      /*
       * ด้านเท่ากันหมด ใช้ความยาวด้านซึ่งเป็นตัวเลขที่ครูสั่งจริง
       * ด้านไม่เท่ากัน ใช้ความยาวรอบรูปแทน เพราะเป็นค่าเดียวที่นิยามได้กับทุกรูป
       */
      return equal
        ? [
            {
              key: 'side',
              label: 'ด้านละ',
              value: Math.round(toCm(sides[0]) * 10) / 10,
              min: 0.5,
              max: 12,
              step: 0.5,
              unit: 'ซม.',
            },
          ]
        : [
            {
              key: 'perimeter',
              label: 'ความยาวรอบรูป',
              value: Math.round(toCm(polygonPerimeter(shape.points)) * 10) / 10,
              min: 2,
              max: 80,
              step: 1,
              unit: 'ซม.',
            },
          ]
    }

    case 'angle':
      return [
        {
          key: 'angle',
          label: 'ขนาดมุม',
          value: Math.round(angleBetween(shape.a, shape.vertex, shape.b)),
          min: 1,
          max: 179,
          step: 1,
          unit: '°',
        },
      ]

    case 'sticker':
      return [
        {
          key: 'size',
          label: 'ขนาด',
          value: Math.round(toCm(shape.size) * 10) / 10,
          min: 0.5,
          max: 4,
          step: 0.5,
          unit: 'ซม.',
        },
      ]

    case 'photo':
      return [
        {
          key: 'width',
          label: 'ความกว้าง',
          value: Math.round(toCm(shape.imageWidth) * 10) / 10,
          min: 2,
          max: 24,
          step: 0.5,
          unit: 'ซม.',
        },
        {
          key: 'fade',
          label: 'ความจาง',
          value: Math.round((1 - shape.fade) * 100),
          min: 20,
          max: 100,
          step: 10,
          unit: '%',
        },
      ]

    default:
      return []
  }
}

/** ใส่ค่าใหม่ให้รูป คืนรูปใหม่เสมอ ไม่แก้ของเดิม */
export function applyField(shape: Shape, key: string, value: number): Shape {
  if (!Number.isFinite(value)) return shape

  if (shape.kind === 'segment' && key === 'length') {
    const length = Math.max(4, value * PX_PER_CM)
    /* ยึดปลายข้างแรกไว้ เพราะเด็กคิดว่า "ลากจากจุด A ไป 4 เซนติเมตร" */
    return { ...shape, b: pointAt(shape.a, length, angleOf(shape.a, shape.b)) }
  }

  if (shape.kind === 'segment' && key === 'tilt') {
    return { ...shape, b: pointAt(shape.a, distance(shape.a, shape.b), value) }
  }

  if (shape.kind === 'circle' && key === 'radius') {
    return { ...shape, radius: Math.max(4, value * PX_PER_CM) }
  }

  if (shape.kind === 'arc' && key === 'radius') {
    return { ...shape, radius: Math.max(4, value * PX_PER_CM) }
  }

  if (shape.kind === 'arc' && key === 'sweep') {
    const size = Math.min(360, Math.max(1, value))
    /* คงทิศการกวาดเดิมไว้ ส่วนโค้งจะได้ไม่กระโดดไปอีกฝั่งของวงกลม */
    return { ...shape, sweep: shape.sweep < 0 ? -size : size }
  }

  if (shape.kind === 'polygon' && (key === 'side' || key === 'perimeter')) {
    const points = shape.points
    const current =
      key === 'side'
        ? distance(points[0], points[1 % points.length])
        : polygonPerimeter(points)
    if (current <= 0) return shape
    const factor = (value * PX_PER_CM) / current
    if (!Number.isFinite(factor) || factor <= 0) return shape
    return scaleShape(shape, factor, polygonCentroid(points))
  }

  if (shape.kind === 'angle' && key === 'angle') {
    const size = Math.min(179, Math.max(1, value))
    const from = angleOf(shape.vertex, shape.a)
    /* หมุนแขนข้างที่สองไปให้ได้มุมตามที่ขอ โดยหมุนไปทางเดิมที่มันเคยกางอยู่ */
    const turn = normalizeDeg(angleOf(shape.vertex, shape.b) - from) <= 180 ? 1 : -1
    return {
      ...shape,
      b: pointAt(shape.vertex, distance(shape.vertex, shape.b), from + turn * size),
    }
  }

  if (shape.kind === 'sticker' && key === 'size') {
    return { ...shape, size: Math.min(160, Math.max(16, value * PX_PER_CM)) }
  }

  if (shape.kind === 'photo' && key === 'width') {
    /* สูงต้องวิ่งตามกว้าง ไม่งั้นรูปในหนังสือจะยืด แล้วมุมที่เด็กวัดได้จะไม่ใช่มุมจริง */
    const wide = Math.min(24 * PX_PER_CM, Math.max(2 * PX_PER_CM, value * PX_PER_CM))
    const ratio = shape.imageHeight / shape.imageWidth
    return { ...shape, imageWidth: wide, imageHeight: wide * ratio }
  }

  if (shape.kind === 'photo' && key === 'fade') {
    const seen = Math.min(100, Math.max(20, value))
    return { ...shape, fade: 1 - seen / 100 }
  }

  return shape
}

/* ------------------------------------------------------------------ */
/* จุดบนรูปที่ลากแก้ได้ทีละจุด                                            */
/* ------------------------------------------------------------------ */

/**
 * ทำไมต้องลากทีละจุดได้
 *
 * เด็กวาดสามเหลี่ยมเสร็จแล้วพบว่ามุมหนึ่งเบี้ยวไปนิดเดียว
 * ถ้าแก้ได้แค่ย่อขยายทั้งรูปหรือหมุนทั้งรูป มุมนั้นก็ยังเบี้ยวอยู่ดี
 * ทางเดียวคือลบทิ้งแล้ววาดใหม่ทั้งรูป ซึ่งเสียทั้งเวลาและกำลังใจ
 *
 * และจุดพวกนี้ต้องมีแม่เหล็กเหมือนตอนวาด ไม่งั้นการลากแก้จะได้ 3.97 ซม.
 * ซึ่งแย่กว่าเดิมที่ 4.02 เพราะเด็กนึกว่าแก้แล้วมันจะตรง
 */
export interface ShapeVertex {
  key: string
  at: Point
  /** จุดนี้เป็นจุดศูนย์กลาง ไม่ใช่จุดบนเส้น ใช้วาดให้ต่างกัน */
  center?: boolean
}

export function shapeVertices(shape: Shape): ShapeVertex[] {
  switch (shape.kind) {
    case 'segment':
      return [
        { key: 'a', at: shape.a },
        { key: 'b', at: shape.b },
      ]
    case 'circle':
      return [
        { key: 'center', at: shape.center, center: true },
        { key: 'edge', at: pointAt(shape.center, shape.radius, 0) },
      ]
    case 'arc':
      return [
        { key: 'center', at: shape.center, center: true },
        { key: 'from', at: pointAt(shape.center, shape.radius, shape.start) },
        { key: 'to', at: pointAt(shape.center, shape.radius, shape.start + shape.sweep) },
      ]
    case 'polygon':
      return shape.points.map((point, index) => ({ key: `v${index}`, at: point }))
    case 'dot':
      return [{ key: 'at', at: shape.at }]
    case 'angle':
      return [
        { key: 'vertex', at: shape.vertex, center: true },
        { key: 'a', at: shape.a },
        { key: 'b', at: shape.b },
      ]
    case 'sticker':
    case 'photo':
      return [{ key: 'at', at: shape.at, center: true }]
    default:
      return []
  }
}

/** ย้ายจุดหนึ่งของรูปไปที่ใหม่ คืนรูปใหม่เสมอ */
export function moveVertex(shape: Shape, key: string, to: Point): Shape {
  const target = { x: to.x, y: to.y }

  switch (shape.kind) {
    case 'segment':
      if (key === 'a') return { ...shape, a: target }
      if (key === 'b') return { ...shape, b: target }
      return shape

    case 'circle':
      if (key === 'center') return { ...shape, center: target }
      if (key === 'edge') {
        return { ...shape, radius: Math.max(4, distance(shape.center, target)) }
      }
      return shape

    case 'arc': {
      if (key === 'center') return { ...shape, center: target }
      const radius = Math.max(4, distance(shape.center, target))
      const angle = angleOf(shape.center, target)
      if (key === 'from') {
        /* ลากปลายด้านเริ่ม ปลายอีกข้างต้องอยู่ที่เดิม มุมกวาดจึงเปลี่ยนตาม */
        const end = shape.start + shape.sweep
        let sweep = end - angle
        if (shape.sweep > 0 && sweep <= 0) sweep += 360
        if (shape.sweep < 0 && sweep >= 0) sweep -= 360
        return { ...shape, radius, start: angle, sweep }
      }
      if (key === 'to') {
        let sweep = angle - shape.start
        if (shape.sweep > 0 && sweep <= 0) sweep += 360
        if (shape.sweep < 0 && sweep >= 0) sweep -= 360
        return { ...shape, radius, sweep }
      }
      return shape
    }

    case 'polygon': {
      const index = Number(key.slice(1))
      if (!Number.isInteger(index) || index < 0 || index >= shape.points.length) return shape
      const points = shape.points.map((point, at) => (at === index ? target : point))
      return { ...shape, points }
    }

    case 'dot':
      return key === 'at' ? { ...shape, at: target } : shape

    case 'angle':
      if (key === 'vertex') {
        /* ลากจุดยอด แขนทั้งสองข้างต้องตามไปด้วย ไม่งั้นมุมจะเปลี่ยนโดยไม่ได้ตั้งใจ */
        const shift = { x: target.x - shape.vertex.x, y: target.y - shape.vertex.y }
        return {
          ...shape,
          vertex: target,
          a: { x: shape.a.x + shift.x, y: shape.a.y + shift.y },
          b: { x: shape.b.x + shift.x, y: shape.b.y + shift.y },
        }
      }
      if (key === 'a') return { ...shape, a: target }
      if (key === 'b') return { ...shape, b: target }
      return shape

    case 'sticker':
    case 'photo':
      return key === 'at' ? { ...shape, at: target } : shape

    default:
      return shape
  }
}

/**
 * จุดอ้างอิงสำหรับลากทั้งรูปให้ดูดเข้าแม่เหล็ก
 *
 * เลือกจุดของรูปที่อยู่ใกล้นิ้วที่สุดตอนเริ่มลาก แล้วให้จุดนั้นเป็นตัวที่ไปชนเป้า
 * เด็กจึงเล็งได้ว่า "เอามุมนี้ไปแปะตรงนั้น" ซึ่งเป็นสิ่งที่ตั้งใจจะทำจริง ๆ
 * ถ้าใช้จุดกึ่งกลางรูปเสมอ การเล็งมุมจะทำไม่ได้เลย
 */
export function grabHandle(shape: Shape, near: Point): Point {
  const spots = shapeVertices(shape).map((vertex) => vertex.at)
  if (spots.length === 0) return shapeCenter(shape)
  return spots.reduce((best, spot) =>
    distance(spot, near) < distance(best, near) ? spot : best,
  )
}
