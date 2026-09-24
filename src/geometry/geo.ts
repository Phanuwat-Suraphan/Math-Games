/**
 * คณิตศาสตร์ของห้องเรขาคณิต
 *
 * ไฟล์นี้ตั้งใจไม่แตะ React และไม่แตะ DOM เลย
 * ทุกฟังก์ชันรับค่าเข้า คืนค่าออก ไม่เก็บสถานะอะไรไว้ข้างใน
 * เพราะเป็นส่วนที่ผิดแล้วเห็นยากที่สุด (เส้นเบี้ยวไปสององศาไม่มีใครทันสังเกต)
 * จึงต้องเรียกจากชุดทดสอบได้ตรง ๆ โดยไม่ต้องเปิดหน้าจอ
 *
 * เรื่องมุมกับแกน y
 *
 * ใน SVG แกน y ชี้ลง แต่ในห้องเรียนมุมนับทวนเข็มนาฬิกาจากแกน x ที่ชี้ขวา
 * ทั้งไฟล์นี้ใช้แบบห้องเรียน คือ 0° ชี้ขวา 90° ชี้ขึ้น
 * การกลับด้าน y ถูกซ่อนไว้ใน angleOf กับ pointAt สองตัวนี้เท่านั้น
 * ที่อื่นจึงคิดแบบเดียวกับที่เด็กเห็นบนกระดาษได้เลย
 */

export interface Point {
  x: number
  y: number
}

/**
 * หนึ่งเซนติเมตรบนกระดาษเท่ากับกี่พิกเซลในระบบพิกัดของผืนวาด
 *
 * ไม่ได้อิงขนาดจริงของจอ เพราะผืนวาดถูกย่อขยายตามความกว้างของหน้าต่าง
 * ค่านี้คือ "มาตราส่วนของกระดาษ" ให้ตัวเลขที่เด็กอ่านได้ลงตัวสวย ๆ
 * ไม้บรรทัดกับวงเวียนบนหน้าจอใช้ค่าเดียวกันนี้ ตัวเลขจึงตรงกันเสมอ
 */
export const PX_PER_CM = 40

/** ระยะห่างระหว่างสองจุด (พิกเซล) */
export function distance(a: Point, b: Point): number {
  return Math.hypot(b.x - a.x, b.y - a.y)
}

/** แปลงพิกเซลเป็นเซนติเมตร */
export function toCm(px: number): number {
  return px / PX_PER_CM
}

/**
 * ข้อความความยาวที่เด็กอ่านได้ เช่น "3.5 ซม."
 *
 * บวกค่าเล็กจิ๋วก่อนปัดเศษ เพราะด้านของรูปด้านเท่าที่ควรยาวเท่ากันเป๊ะ
 * มักต่างกันในหลักที่สิบห้าของทศนิยมจากการคำนวณ sin cos
 * ถ้าปัดตรง ๆ ด้านที่ยาว 3.25 ซม. เท่ากันหกด้าน จะแสดงเป็น 3.3 บ้าง 3.2 บ้าง
 * แล้วเด็กจะเถียงกันว่าตกลงมันด้านเท่าจริงหรือเปล่า ทั้งที่รูปถูกต้องทุกประการ
 */
export function formatCm(px: number): string {
  const rounded = Math.round(toCm(px) * 10 + 1e-6) / 10
  return `${rounded.toFixed(1)} ซม.`
}

/** ข้อความมุม เช่น "60°" */
export function formatDeg(deg: number): string {
  return `${Math.round(deg)}°`
}

/** จุดกึ่งกลางของสองจุด */
export function midpoint(a: Point, b: Point): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
}

/** บีบองศาให้อยู่ในช่วง 0 ถึง 360 */
export function normalizeDeg(deg: number): number {
  const wrapped = deg % 360
  return wrapped < 0 ? wrapped + 360 : wrapped
}

/** มุมของจุด p เมื่อมองจากจุดศูนย์กลาง (0° ชี้ขวา 90° ชี้ขึ้น) */
export function angleOf(center: Point, p: Point): number {
  return normalizeDeg((Math.atan2(-(p.y - center.y), p.x - center.x) * 180) / Math.PI)
}

/** จุดที่อยู่ห่างจากศูนย์กลางเป็นระยะ radius ในทิศ deg องศา */
export function pointAt(center: Point, radius: number, deg: number): Point {
  const rad = (deg * Math.PI) / 180
  return {
    x: center.x + radius * Math.cos(rad),
    y: center.y - radius * Math.sin(rad),
  }
}

/** ขนาดมุม a-vertex-b คืนค่า 0 ถึง 180 องศา */
export function angleBetween(a: Point, vertex: Point, b: Point): number {
  const ax = a.x - vertex.x
  const ay = a.y - vertex.y
  const bx = b.x - vertex.x
  const by = b.y - vertex.y
  const magnitude = Math.hypot(ax, ay) * Math.hypot(bx, by)
  if (magnitude === 0) return 0
  const cosine = (ax * bx + ay * by) / magnitude
  /* ปัดเศษทศนิยมอาจดัน cosine ออกนอกช่วง -1 ถึง 1 แล้ว acos จะกลายเป็น NaN */
  return (Math.acos(Math.min(1, Math.max(-1, cosine))) * 180) / Math.PI
}

/** ดูดจุดเข้าหาเส้นตาราง */
export function snapToGrid(p: Point, step: number): Point {
  if (step <= 0) return p
  return {
    x: Math.round(p.x / step) * step,
    y: Math.round(p.y / step) * step,
  }
}

/** ดูดมุมเข้าหาค่าที่ลงตัว เช่น ทีละ 15° */
export function snapDeg(deg: number, step: number): number {
  if (step <= 0) return deg
  return normalizeDeg(Math.round(deg / step) * step)
}

/**
 * ดูดมุมเข้าขีดที่ลงตัวเฉพาะตอนเข้าใกล้มากแล้ว นอกนั้นปล่อยให้หมุนอิสระ
 *
 * ใช้กับการหมุนครึ่งวงกลมและไม้บรรทัด
 * การดูดทีละ 5° เต็ม ๆ ทำให้ทาบขอบครึ่งวงกลมกับเส้นในรูปแบบฝึกไม่ได้เลย
 * เพราะเส้นในหนังสือไม่ได้เอียงเป็นจำนวนเท่าของ 5° สักเส้น
 * แต่ถ้าไม่ดูดเลย การวางให้ได้แนวนอนพอดีก็ยากเกินไปสำหรับเด็ก
 * จึงเหลือแรงดูดไว้แคบ ๆ รอบขีดที่ลงตัว ที่เหลือเป็นอิสระทั้งหมด
 */
export function softSnapDeg(deg: number, step: number, pull: number): number {
  const free = Math.round(normalizeDeg(deg) * 10) / 10
  if (step <= 0 || pull <= 0) return free
  const snapped = snapDeg(deg, step)
  /* ระยะห่างจริงบนวงกลม 359° กับ 1° ห่างกันแค่ 2° ไม่ใช่ 358° */
  const gap = Math.abs(normalizeDeg(free - snapped + 180) - 180)
  return gap <= pull ? snapped : free
}

/**
 * ดูดปลายเส้นให้ได้ความยาวและมุมที่ลงตัว
 *
 * ใช้ตอนลากเส้นโดยเปิดแม่เหล็ก เพื่อให้เด็กได้เส้นยาว 3.0 ซม. ตรง ๆ
 * ไม่ใช่ 2.97 ซม. ซึ่งวัดซ้ำทีหลังแล้วไม่ตรงกับที่ครูสั่ง
 */
export function snapEnd(
  start: Point,
  end: Point,
  degStep: number,
  cmStep: number,
): Point {
  const length = distance(start, end)
  if (length === 0) return end
  const deg = snapDeg(angleOf(start, end), degStep)
  const pxStep = cmStep * PX_PER_CM
  const snappedLength = pxStep > 0 ? Math.max(pxStep, Math.round(length / pxStep) * pxStep) : length
  return pointAt(start, snappedLength, deg)
}

/**
 * จุดยอดของรูปหลายเหลี่ยมด้านเท่า
 *
 * นับทวนเข็มนาฬิกาจากมุม rotation เพื่อให้ลำดับจุดตรงกับที่เด็กเห็น
 * เวลาเอาไปคิดมุมภายในต่อ ทิศทางการนับจึงไม่สลับไปมา
 */
export function regularPolygon(
  center: Point,
  radius: number,
  sides: number,
  rotation = 90,
): Point[] {
  const count = Math.max(3, Math.round(sides))
  const points: Point[] = []
  for (let i = 0; i < count; i += 1) {
    points.push(pointAt(center, radius, rotation + (360 / count) * i))
  }
  return points
}

/** ความยาวรอบรูป (พิกเซล) */
export function polygonPerimeter(points: Point[]): number {
  if (points.length < 2) return 0
  let total = 0
  for (let i = 0; i < points.length; i += 1) {
    total += distance(points[i], points[(i + 1) % points.length])
  }
  return total
}

/** พื้นที่ของรูปหลายเหลี่ยม (ตารางพิกเซล) ด้วยสูตรรองเท้า */
export function polygonArea(points: Point[]): number {
  if (points.length < 3) return 0
  let sum = 0
  for (let i = 0; i < points.length; i += 1) {
    const a = points[i]
    const b = points[(i + 1) % points.length]
    sum += a.x * b.y - b.x * a.y
  }
  return Math.abs(sum) / 2
}

/** พื้นที่เป็นตารางเซนติเมตร */
export function areaInCm(points: Point[]): number {
  return polygonArea(points) / (PX_PER_CM * PX_PER_CM)
}

/** มุมภายในของแต่ละจุดยอด เรียงตามลำดับจุด */
export function interiorAngles(points: Point[]): number[] {
  if (points.length < 3) return []
  return points.map((vertex, index) => {
    const before = points[(index - 1 + points.length) % points.length]
    const after = points[(index + 1) % points.length]
    return angleBetween(before, vertex, after)
  })
}

/** ผลรวมมุมภายในตามสูตร (n - 2) × 180 */
export function sumInteriorAngles(sides: number): number {
  return (Math.max(3, Math.round(sides)) - 2) * 180
}

/** ชื่อไทยของรูปหลายเหลี่ยมตามจำนวนด้าน */
export function polygonName(sides: number): string {
  const names: Record<number, string> = {
    3: 'สามเหลี่ยม',
    4: 'สี่เหลี่ยม',
    5: 'ห้าเหลี่ยม',
    6: 'หกเหลี่ยม',
    7: 'เจ็ดเหลี่ยม',
    8: 'แปดเหลี่ยม',
    9: 'เก้าเหลี่ยม',
    10: 'สิบเหลี่ยม',
    11: 'สิบเอ็ดเหลี่ยม',
    12: 'สิบสองเหลี่ยม',
  }
  return names[Math.round(sides)] ?? `รูป ${Math.round(sides)} เหลี่ยม`
}

/** ชื่อชนิดของมุมตามขนาด */
export function angleName(deg: number): string {
  const value = Math.round(deg)
  if (value === 0) return 'มุมศูนย์'
  if (value < 90) return 'มุมแหลม'
  if (value === 90) return 'มุมฉาก'
  if (value < 180) return 'มุมป้าน'
  if (value === 180) return 'มุมตรง'
  return 'มุมกลับ'
}

/** เงาของจุด p ที่ตกลงบนเส้นตรงที่ลากผ่าน a กับ b */
export function projectOnLine(p: Point, a: Point, b: Point): Point {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const lengthSquared = dx * dx + dy * dy
  if (lengthSquared === 0) return { x: a.x, y: a.y }
  const t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / lengthSquared
  return { x: a.x + t * dx, y: a.y + t * dy }
}

/** ระยะจากจุดถึงส่วนของเส้นตรง (ไม่ใช่เส้นตรงยาวไม่สิ้นสุด) */
export function distanceToSegment(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const lengthSquared = dx * dx + dy * dy
  if (lengthSquared === 0) return distance(p, a)
  const raw = ((p.x - a.x) * dx + (p.y - a.y) * dy) / lengthSquared
  const t = Math.min(1, Math.max(0, raw))
  return distance(p, { x: a.x + t * dx, y: a.y + t * dy })
}

/** ระยะจากจุดถึงเส้นรอบวง (ไม่ใช่ถึงจุดศูนย์กลาง) */
export function distanceToCircle(p: Point, center: Point, radius: number): number {
  return Math.abs(distance(p, center) - radius)
}

/**
 * มุมนี้อยู่บนส่วนโค้งที่กวาดจาก start ไปเป็นระยะ sweep หรือไม่
 *
 * sweep เป็นบวกคือกวาดทวนเข็มนาฬิกา เป็นลบคือตามเข็ม
 */
export function isOnArc(deg: number, start: number, sweep: number): boolean {
  if (Math.abs(sweep) >= 360) return true
  const offset = sweep >= 0 ? normalizeDeg(deg - start) : normalizeDeg(start - deg)
  return offset <= Math.abs(sweep)
}

/**
 * เส้นทาง SVG ของส่วนโค้ง
 *
 * ธงทิศทางของ SVG นับตามเข็มนาฬิกาบนจอเป็นบวก
 * ส่วนไฟล์นี้นับทวนเข็มเป็นบวก ธงจึงกลับด้านกับเครื่องหมายของ sweep
 */
export function arcPath(center: Point, radius: number, start: number, sweep: number): string {
  const from = pointAt(center, radius, start)
  const to = pointAt(center, radius, start + sweep)
  const largeArc = Math.abs(sweep) > 180 ? 1 : 0
  const sweepFlag = sweep > 0 ? 0 : 1
  return `M ${from.x.toFixed(2)} ${from.y.toFixed(2)} A ${radius.toFixed(2)} ${radius.toFixed(
    2,
  )} 0 ${largeArc} ${sweepFlag} ${to.x.toFixed(2)} ${to.y.toFixed(2)}`
}

/** รวมมุมที่กวาดไปเรื่อย ๆ ระหว่างลาก ให้วาดเกินหนึ่งรอบได้โดยไม่กระโดด */
export function accumulateSweep(previousSweep: number, fromDeg: number, toDeg: number): number {
  let step = normalizeDeg(toDeg - fromDeg)
  if (step > 180) step -= 360
  const total = previousSweep + step
  return Math.min(360, Math.max(-360, total))
}

/** ตัวอักษรกำกับจุด A B C ... Z แล้วขึ้นรอบใหม่เป็น A1 B1 */
export function pointLabel(index: number): string {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const letter = letters[index % letters.length]
  const round = Math.floor(index / letters.length)
  return round === 0 ? letter : `${letter}${round}`
}

/**
 * จุดตัดของวงกลมสองวง
 *
 * นี่คือหัวใจของงานวงเวียนทั้งหมด การสร้างสามเหลี่ยมด้านเท่า การแบ่งครึ่งมุม
 * และการสร้างมุมฉาก ล้วนจบลงที่ "ลากเส้นไปยังจุดที่ส่วนโค้งสองเส้นตัดกัน"
 * ถ้าเด็กต้องกะเอาเองด้วยสายตา รูปจะเพี้ยนทุกครั้งและบทเรียนจะเสียไปเปล่า ๆ
 *
 * คืนสองจุดเมื่อตัดกันจริง คืนจุดเดียวเมื่อสัมผัสกันพอดี
 * และคืนรายการว่างเมื่อไม่แตะกันเลยหรือเป็นวงเดียวกันทั้งวง
 */
export function circleIntersections(
  centerA: Point,
  radiusA: number,
  centerB: Point,
  radiusB: number,
): Point[] {
  const dx = centerB.x - centerA.x
  const dy = centerB.y - centerA.y
  const span = Math.hypot(dx, dy)
  if (span === 0) return []
  if (span > radiusA + radiusB) return []
  if (span < Math.abs(radiusA - radiusB)) return []

  const along = (radiusA * radiusA - radiusB * radiusB + span * span) / (2 * span)
  const height = Math.sqrt(Math.max(0, radiusA * radiusA - along * along))
  const middle: Point = {
    x: centerA.x + (along * dx) / span,
    y: centerA.y + (along * dy) / span,
  }
  if (height === 0) return [middle]

  const offsetX = (height * dy) / span
  const offsetY = (height * dx) / span
  return [
    { x: middle.x + offsetX, y: middle.y - offsetY },
    { x: middle.x - offsetX, y: middle.y + offsetY },
  ]
}

/**
 * จุดที่วงกลมตัดกับส่วนของเส้นตรง
 *
 * ใช้ตอนกางวงเวียนคร่อมเส้นแล้วขีดรอยตัดสองข้าง
 * ซึ่งเป็นขั้นแรกของการสร้างเส้นแบ่งครึ่งที่ตั้งฉาก
 */
export function circleSegmentIntersections(
  center: Point,
  radius: number,
  a: Point,
  b: Point,
): Point[] {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const quadratic = dx * dx + dy * dy
  if (quadratic === 0) return []

  const linear = 2 * (dx * (a.x - center.x) + dy * (a.y - center.y))
  const constant =
    (a.x - center.x) * (a.x - center.x) + (a.y - center.y) * (a.y - center.y) - radius * radius
  const discriminant = linear * linear - 4 * quadratic * constant
  if (discriminant < 0) return []

  const root = Math.sqrt(discriminant)
  const steps =
    discriminant === 0
      ? [-linear / (2 * quadratic)]
      : [(-linear - root) / (2 * quadratic), (-linear + root) / (2 * quadratic)]

  /* เอาเฉพาะจุดที่อยู่บนช่วงของเส้นจริง ไม่ใช่บนเส้นที่ต่อออกไปไม่สิ้นสุด */
  return steps
    .filter((step) => step >= 0 && step <= 1)
    .map((step) => ({ x: a.x + step * dx, y: a.y + step * dy }))
}

/**
 * จุดศูนย์ถ่วงของรูปหลายเหลี่ยม
 *
 * ใช้หาที่วางหน้าตาการ์ตูนบนรูป ไม่ใช้ค่าเฉลี่ยของจุดยอดธรรมดา
 * เพราะรูปที่มีจุดยอดกระจุกอยู่มุมเดียว ค่าเฉลี่ยจะถูกดึงไปอยู่มุมนั้น
 * แล้วหน้าจะไปโผล่ค่อนไปข้างใดข้างหนึ่งจนดูเหมือนรูปเอียงคอ
 */
export function polygonCentroid(points: Point[]): Point {
  if (points.length === 0) return { x: 0, y: 0 }
  if (points.length < 3) {
    const sum = points.reduce((total, point) => ({ x: total.x + point.x, y: total.y + point.y }), {
      x: 0,
      y: 0,
    })
    return { x: sum.x / points.length, y: sum.y / points.length }
  }

  let twiceArea = 0
  let x = 0
  let y = 0
  for (let i = 0; i < points.length; i += 1) {
    const a = points[i]
    const b = points[(i + 1) % points.length]
    const cross = a.x * b.y - b.x * a.y
    twiceArea += cross
    x += (a.x + b.x) * cross
    y += (a.y + b.y) * cross
  }

  /* รูปที่จุดยอดเรียงอยู่บนเส้นตรงเดียวกันจะได้พื้นที่ศูนย์ ใช้ค่าเฉลี่ยแทน */
  if (Math.abs(twiceArea) < 1e-9) {
    const sum = points.reduce((total, point) => ({ x: total.x + point.x, y: total.y + point.y }), {
      x: 0,
      y: 0,
    })
    return { x: sum.x / points.length, y: sum.y / points.length }
  }

  return { x: x / (3 * twiceArea), y: y / (3 * twiceArea) }
}

/** ระยะจากจุดหนึ่งถึงจุดยอดที่ใกล้ที่สุด ใช้กะว่าหน้าการ์ตูนวางได้ใหญ่แค่ไหน */
export function nearestVertexDistance(from: Point, points: Point[]): number {
  if (points.length === 0) return 0
  return points.reduce((closest, point) => Math.min(closest, distance(from, point)), Infinity)
}
