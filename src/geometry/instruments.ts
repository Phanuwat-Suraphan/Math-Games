/**
 * ขนาดของอุปกรณ์บนกระดาษ
 *
 * ทำไมไม้บรรทัดกับครึ่งวงกลม "ย่อขยาย" คนละแบบกัน
 *
 * ครึ่งวงกลมวัดมุม ขยายได้อิสระ เพราะมุมไม่ขึ้นกับขนาด
 * ครึ่งวงกลมอันใหญ่กับอันเล็กวัดมุม 60 องศาได้เท่ากันเป๊ะ
 * อันใหญ่อ่านง่ายบนจอโปรเจกเตอร์ อันเล็กไม่บังงานตอนกระดาษแน่น
 *
 * ไม้บรรทัดต่างออกไปสิ้นเชิง ถ้าขยายทั้งอันแบบเดียวกัน
 * ขีดเซนติเมตรบนไม้บรรทัดจะไม่ตรงกับเซนติเมตรบนกระดาษอีกต่อไป
 * เด็กจะวัดได้ 4 ซม. จากเส้นที่ยาว 3 ซม. จริง ๆ แล้วจดลงสมุดไปทั้งอย่างนั้น
 * ความผิดพลาดแบบนี้ไม่มีอะไรบนจอบอกเลยว่าผิด
 *
 * ไม้บรรทัดจึง "ย่อขยาย" ด้วยการเปลี่ยนความยาวของไม้ ไม่ใช่เปลี่ยนมาตราส่วน
 * ยาวขึ้นคือมีขีดมากขึ้น ไม่ใช่ขีดห่างขึ้น
 */

import {
  PX_PER_CM,
  angleOf,
  distance,
  distanceToSegment,
  normalizeDeg,
  pointAt,
  projectOnSegment,
} from './geo'
import type { Point } from './geo'
import type { Shape } from './shapes'

/** รัศมีของครึ่งวงกลม ตั้งแต่ 3 ถึง 8 เซนติเมตร */
export const PROTRACTOR_MIN = 120
export const PROTRACTOR_MAX = 320
export const PROTRACTOR_DEFAULT = 200

/** ความยาวไม้บรรทัด ตั้งแต่ 5 ถึง 30 เซนติเมตร */
export const RULER_MIN_CM = 5
export const RULER_MAX_CM = 30
export const RULER_DEFAULT_CM = 20

export function clampProtractorRadius(radius: number): number {
  return Math.min(PROTRACTOR_MAX, Math.max(PROTRACTOR_MIN, radius))
}

/** ความยาวไม้บรรทัด ปัดเป็นครึ่งเซนติเมตรให้อ่านเป็นตัวเลขกลม ๆ ได้ */
export function clampRulerLength(lengthCm: number): number {
  const snapped = Math.round(lengthCm * 2) / 2
  return Math.min(RULER_MAX_CM, Math.max(RULER_MIN_CM, snapped))
}

/** รัศมีใหม่ของครึ่งวงกลม เมื่อลากปุ่มขยายไปอยู่ที่ตำแหน่งหนึ่ง */
export function protractorRadiusFromPointer(center: Point, pointer: Point): number {
  return clampProtractorRadius(Math.hypot(pointer.x - center.x, pointer.y - center.y))
}

/**
 * ความยาวใหม่ของไม้บรรทัด เมื่อลากปุ่มที่ปลายไม้
 *
 * ใช้เงาของปลายนิ้วที่ตกลงบนแนวไม้บรรทัด ไม่ใช่ระยะตรงจากจุดศูนย์
 * นิ้วที่เลื่อนออกนอกแนวไม้เล็กน้อยจึงไม่ทำให้ไม้ยืดเกินจริง
 */
export function rulerLengthFromPointer(
  origin: Point,
  rotation: number,
  pointer: Point,
): number {
  const radian = (rotation * Math.PI) / 180
  /* ทิศของไม้บรรทัด แกน y ของ SVG ชี้ลง จึงกลับเครื่องหมายของ sin */
  const along = { x: Math.cos(radian), y: -Math.sin(radian) }
  const reach = (pointer.x - origin.x) * along.x + (pointer.y - origin.y) * along.y
  return clampRulerLength(reach / PX_PER_CM)
}

/**
 * ตัวคูณขนาดของขีดและตัวเลขบนครึ่งวงกลม
 *
 * ขีดที่ยาวเท่าเดิมบนครึ่งวงกลมอันใหญ่จะดูเหมือนขนแมวเส้นเล็ก ๆ
 * ส่วนบนอันเล็กจะยาวจนขีดชนกันเป็นแถบทึบ ทุกอย่างจึงต้องโตตามรัศมี
 * แต่ไม่ปล่อยให้เล็กหรือใหญ่เกินไปจนอ่านไม่ออก
 */
export function scaleUnit(radius: number, base = PROTRACTOR_DEFAULT): number {
  return Math.min(1.5, Math.max(0.72, radius / base))
}


/** ระยะกางวงเวียน ตั้งแต่ 0.5 ถึง 8 เซนติเมตร เท่าที่วงเวียนในกล่องเรขาคณิตกางได้จริง */
export const COMPASS_MIN = 0.5 * PX_PER_CM
export const COMPASS_MAX = 8 * PX_PER_CM

export function clampCompassRadius(radius: number): number {
  if (!Number.isFinite(radius)) return COMPASS_MIN
  return Math.min(COMPASS_MAX, Math.max(COMPASS_MIN, radius))
}

/**
 * ความยาวของรูปที่จะเอาไปกางวงเวียนให้เท่ากัน
 *
 * ขั้นตอนแรกของการสร้างรูปเกือบทุกแบบคือ "กางวงเวียนเท่ากับ AB"
 * ของจริงทำด้วยการเอาเข็มจิ้มที่ A แล้วเลื่อนดินสอไปทาบ B ซึ่งเป๊ะโดยไม่ต้องอ่านตัวเลขเลย
 * บนจอถ้าต้องเลื่อนแถบกะเอาเอง รัศมีจะพลาดไปสองสามมิลลิเมตรทุกครั้ง
 * แล้วส่วนโค้งที่ควรตัดกันพอดีก็จะไม่ตัดกัน ทั้งที่ขั้นตอนทุกอย่างถูกหมด
 */
export function compassSpanOf(shape: Shape): number | null {
  switch (shape.kind) {
    case 'segment':
      return distance(shape.a, shape.b)
    case 'circle':
    case 'arc':
      return shape.radius
    case 'polygon':
      return shape.points.length >= 2 ? distance(shape.points[0], shape.points[1]) : null
    case 'angle':
      return distance(shape.vertex, shape.a)
    default:
      return null
  }
}

/**
 * ไม้ฉาก
 *
 * ในกล่องเรขาคณิตจริงมีสี่ชิ้น วงเวียน ไม้บรรทัด ครึ่งวงกลม และไม้ฉาก
 * ไม้ฉากคือชิ้นที่ใช้ลากเส้นตั้งฉากและเส้นขนาน ซึ่งเป็นสองอย่างที่หลักสูตรสอน
 * และเป็นสองอย่างที่ลากด้วยมือเปล่าแล้วไม่มีวันตรงจริง
 *
 * มีสองแบบเหมือนของจริง 45-45-90 กับ 30-60-90
 * ไม่ใช่เพื่อความหลากหลาย แต่เพราะมุม 30 45 60 คือมุมที่โจทย์สั่งให้วาดบ่อยที่สุด
 */
export type SetSquareKind = '45' | '30'

export const SETSQUARE_MIN = 4 * PX_PER_CM
export const SETSQUARE_MAX = 14 * PX_PER_CM
export const SETSQUARE_DEFAULT = 8 * PX_PER_CM

export function clampSetSquare(leg: number): number {
  if (!Number.isFinite(leg)) return SETSQUARE_DEFAULT
  return Math.min(SETSQUARE_MAX, Math.max(SETSQUARE_MIN, leg))
}

/** ความยาวขาที่ตั้งฉากกับฐาน เทียบกับความยาวฐาน */
export function setSquareRise(kind: SetSquareKind): number {
  /* 30-60-90 ขาตั้งสั้นกว่าฐานตามอัตราส่วน tan 30 องศา มุมที่ปลายฐานจึงเป็น 30 องศาพอดี */
  return kind === '45' ? 1 : Math.tan(Math.PI / 6)
}

/**
 * มุมฉากอยู่ที่จุดแรกเสมอ ไล่ไปปลายฐาน แล้วไปปลายขาตั้ง
 * ลำดับนี้สำคัญ เพราะหน้าจอวาดเครื่องหมายมุมฉากที่จุดแรก
 */
export function setSquareCorners(
  kind: SetSquareKind,
  at: Point,
  rotation: number,
  leg: number,
): [Point, Point, Point] {
  const base = clampSetSquare(leg)
  return [
    { ...at },
    pointAt(at, base, rotation),
    pointAt(at, base * setSquareRise(kind), rotation + 90),
  ]
}

/** ขอบทั้งสามด้านของไม้ฉาก ลากดินสอตามขอบไหนก็ได้เหมือนของจริง */
export function setSquareEdges(
  kind: SetSquareKind,
  at: Point,
  rotation: number,
  leg: number,
): { a: Point; b: Point }[] {
  const [corner, baseEnd, riseEnd] = setSquareCorners(kind, at, rotation, leg)
  return [
    { a: corner, b: baseEnd },
    { a: corner, b: riseEnd },
    { a: baseEnd, b: riseEnd },
  ]
}

/**
 * ขอบที่ดินสออยู่ใกล้ที่สุด ใช้ตัดสินว่าจะลากแนบขอบไหน
 *
 * ของจริงดินสอแนบขอบไหนก็ได้ที่มันพิงอยู่ ไม่ใช่ขอบที่โปรแกรมเลือกไว้ให้
 * คืน null เมื่อดินสออยู่ห่างจากทุกขอบ แปลว่าวาดอิสระตามปกติ
 */
export function nearestGuideEdge(
  p: Point,
  edges: { a: Point; b: Point }[],
  range: number,
): { a: Point; b: Point } | null {
  let best: { a: Point; b: Point } | null = null
  let bestAway = range
  for (const edge of edges) {
    const away = distanceToSegment(p, edge.a, edge.b)
    if (away <= bestAway) {
      best = edge
      bestAway = away
    }
  }
  return best
}

/**
 * ค่าที่อ่านได้จากไม้บรรทัด ณ จุดที่ปลายนิ้วอยู่
 *
 * ของจริงเด็กอ่านค่าโดยดูว่าปลายดินสอตรงกับขีดไหน ไม่ใช่คำนวณจากจุดเริ่มถึงจุดจบ
 * บนจอไม่มีสายตาที่ไล่ตามขีดได้เหมือนของจริง ป้ายบอกค่าจึงมาแทนหน้าที่นั้น
 *
 * คืน null เมื่อปลายนิ้วเลยปลายไม้ไปแล้ว เพราะของจริงตรงนั้นไม่มีขีดให้อ่าน
 */
export function rulerReading(
  origin: Point,
  rotation: number,
  lengthCm: number,
  p: Point,
): { cm: number; at: Point } | null {
  const end = pointAt(origin, lengthCm * PX_PER_CM, rotation)
  const along = projectOnSegment(p, origin, end)
  const cm = distance(origin, along) / PX_PER_CM
  /* เลยปลายไม้ไปแล้ว การทาบจะไปค้างที่ปลายพอดี ซึ่งไม่ใช่ค่าที่อ่านได้จริง */
  const atEnd = cm >= lengthCm - 0.001 && distance(p, end) > 2
  const atStart = cm <= 0.001 && distance(p, origin) > 2
  if (atEnd || atStart) return null
  return { cm: Math.round(cm * 10) / 10, at: along }
}

/** ที่วางของอุปกรณ์หนึ่งชิ้น */
export interface Placement {
  at: Point
  rotation: number
}

/**
 * เอาครึ่งวงกลมไปทาบกับรูปที่เลือกไว้
 *
 * นี่คือท่าที่ครูทำหน้าชั้นทุกครั้ง วางรูตรงกลางที่จุดยอด แล้วหมุนให้ขอบล่างทาบแขนข้างหนึ่ง
 * ทำด้วยมือบนจอได้ แต่ใช้เวลาเป็นสิบวินาทีต่อหนึ่งครั้ง ซึ่งนานเกินไปตอนสอนหน้าชั้น
 *
 * เลือกแขนที่ทำให้อีกข้างอ่านได้ในช่วง 0 ถึง 180 เสมอ
 * ถ้าทาบผิดข้าง แขนอีกข้างจะไปโผล่ใต้ขอบล่างซึ่งไม่มีสเกลให้อ่านเลย
 */
export function alignProtractorTo(shape: Shape): Placement | null {
  if (shape.kind === 'angle') {
    const toA = angleOf(shape.vertex, shape.a)
    const toB = angleOf(shape.vertex, shape.b)
    const aFirst = normalizeDeg(toB - toA) <= 180
    return { at: { ...shape.vertex }, rotation: normalizeDeg(aFirst ? toA : toB) }
  }
  if (shape.kind === 'segment') {
    return { at: { ...shape.a }, rotation: normalizeDeg(angleOf(shape.a, shape.b)) }
  }
  return null
}

/**
 * เอาไม้บรรทัดไปทาบกับรูปที่เลือกไว้
 *
 * คืนความยาวที่ควรใช้มาด้วย ไม้บรรทัดที่สั้นกว่าเส้นที่จะวัดคือไม้ที่วัดไม่ได้
 * และไม้ที่ยาวกว่าเส้นมาก ๆ ก็บังงานส่วนอื่นเปล่า ๆ
 */
export function alignRulerTo(shape: Shape): (Placement & { lengthCm: number }) | null {
  const span = (a: Point, b: Point) => ({
    at: { ...a },
    rotation: normalizeDeg(angleOf(a, b)),
    lengthCm: clampRulerLength(Math.ceil(distance(a, b) / PX_PER_CM) + 2),
  })
  if (shape.kind === 'segment') return span(shape.a, shape.b)
  if (shape.kind === 'angle') return span(shape.vertex, shape.a)
  if (shape.kind === 'polygon' && shape.points.length >= 2) {
    return span(shape.points[0], shape.points[1])
  }
  return null
}
