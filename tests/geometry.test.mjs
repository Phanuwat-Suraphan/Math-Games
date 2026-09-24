/**
 * ชุดทดสอบห้องเรขาคณิต
 *
 * สามเรื่องที่ต้องตรวจทุกครั้ง
 *
 * หนึ่ง — ตัวเลขที่เด็กอ่านได้ต้องถูกต้อง
 * หน้านี้ไม่ได้บอกแค่ว่า "สวย" แต่บอกว่าด้านยาว 4.0 ซม. และมุมภายในรวม 540°
 * ถ้าเลขผิดแม้แต่นิดเดียว เด็กจะจดผิดลงสมุดแล้วเอาไปสอบ
 * ความผิดพลาดชนิดนี้ไม่มีทางเห็นด้วยตา เพราะรูปยังสวยเหมือนเดิมทุกประการ
 *
 * สอง — เรื่องมุมกับแกน y ที่กลับด้านกัน
 * ใน SVG แกน y ชี้ลง แต่ในห้องเรียนมุมนับทวนเข็มนาฬิกา
 * จุดนี้คือที่ที่เครื่องหมายลบหายไปได้ง่ายที่สุด และเมื่อหายแล้ว
 * ส่วนโค้งจะไปโผล่อีกฝั่งของวงกลม ซึ่งดูเหมือนวงเวียนพังทั้งอัน
 *
 * สาม — ปุ่มย้อนกลับต้องย้อนได้จริงทุกขั้น
 * เด็กกดปุ่มนี้บ่อยที่สุดเวลาวาดพลาด ถ้ามันข้ามขั้นหรือกินงานที่ทำไว้
 * เด็กจะเลิกกล้าลองวาด ซึ่งเสียมากกว่าเส้นที่วาดพลาดเสียอีก
 *
 * วิธีใช้
 *   npx tsc -p tsconfig.tests.json --outDir /tmp/logic
 *   node tests/geometry.test.mjs /tmp/logic
 */

import path from 'path'
import { createRequire } from 'module'

const OUT = process.argv[2]
if (!OUT) {
  console.error('ใช้: node tests/geometry.test.mjs <โฟลเดอร์ JS ที่คอมไพล์แล้ว>')
  process.exit(1)
}

const require = createRequire(import.meta.url)
const load = (name) => require(path.resolve(OUT, name + '.js'))

const G = load('geometry/geo')
const S = load('geometry/shapes')
const B = load('geometry/board')
const T = load('geometry/tools')
const M = load('geometry/missions')
const I = load('geometry/input')
const W = load('geometry/view')
const C = load('geometry/cute')
const B_LABELS = load('geometry/labels')
const N = load('geometry/instruments')
const R = load('geometry/recipes')
const D = load('geometry/storage')
const P = load('geometry/paint')
const Q = load('geometry/practice')
const SH = load('geometry/worksheet')
const PH = load('geometry/photos')

let passed = 0
const failures = []

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

function close(actual, expected, tolerance, message) {
  assert(
    Math.abs(actual - expected) <= tolerance,
    `${message} (ได้ ${actual} ต้องการ ${expected})`,
  )
}

function check(name, fn) {
  try {
    fn()
    passed += 1
  } catch (error) {
    failures.push(`${name}: ${error.message}`)
  }
}

const segment = (id, a, b) => ({ kind: 'segment', id, color: '#000', width: 2, a, b })

/* ---------------------------------------------------------------- */
/* มุมกับทิศทาง                                                      */
/* ---------------------------------------------------------------- */

check('0° ชี้ขวา และ 90° ชี้ขึ้น แม้แกน y ของ SVG จะชี้ลง', () => {
  const center = { x: 100, y: 100 }
  close(G.angleOf(center, { x: 140, y: 100 }), 0, 0.001, 'จุดทางขวาต้องเป็น 0°')
  close(G.angleOf(center, { x: 100, y: 60 }), 90, 0.001, 'จุดด้านบนต้องเป็น 90°')
  close(G.angleOf(center, { x: 60, y: 100 }), 180, 0.001, 'จุดทางซ้ายต้องเป็น 180°')
  close(G.angleOf(center, { x: 100, y: 140 }), 270, 0.001, 'จุดด้านล่างต้องเป็น 270°')

  const up = G.pointAt(center, 40, 90)
  close(up.x, 100, 0.001, 'จุดที่ 90° ต้องอยู่ตรงแนวดิ่ง')
  close(up.y, 60, 0.001, 'จุดที่ 90° ต้องอยู่เหนือจุดศูนย์กลาง')
})

check('angleOf กับ pointAt ต้องเป็นตัวกลับของกันและกัน', () => {
  const center = { x: 321, y: 244 }
  for (const deg of [0, 17, 45, 90, 137, 180, 213, 270, 359]) {
    const p = G.pointAt(center, 123, deg)
    close(G.angleOf(center, p), deg, 0.0001, `กลับไปกลับมาที่ ${deg}° แล้วเพี้ยน`)
    close(G.distance(center, p), 123, 0.0001, `รัศมีที่ ${deg}° เพี้ยน`)
  }
})

check('ขนาดมุมสามจุดต้องตรงกับที่วัดด้วยครึ่งวงกลม', () => {
  const vertex = { x: 0, y: 0 }
  close(
    G.angleBetween({ x: 10, y: 0 }, vertex, { x: 0, y: -10 }),
    90,
    0.001,
    'มุมฉากต้องได้ 90°',
  )
  close(
    G.angleBetween({ x: 10, y: 0 }, vertex, { x: -10, y: 0 }),
    180,
    0.001,
    'มุมตรงต้องได้ 180°',
  )
  /* จุดซ้อนทับกันต้องไม่คืน NaN ไม่งั้นป้ายบนจอจะกลายเป็นคำว่า NaN */
  assert(Number.isFinite(G.angleBetween(vertex, vertex, vertex)), 'จุดซ้อนกันแล้วได้ NaN')
})

/* ---------------------------------------------------------------- */
/* รูปหลายเหลี่ยม                                                    */
/* ---------------------------------------------------------------- */

check('รูปหลายเหลี่ยมด้านเท่าต้องด้านเท่าจริงและมุมเท่ากันจริง', () => {
  for (const sides of [3, 4, 5, 6, 8, 12]) {
    const points = G.regularPolygon({ x: 500, y: 400 }, 150, sides)
    assert(points.length === sides, `ขอ ${sides} ด้าน แต่ได้ ${points.length} จุด`)

    const lengths = points.map((point, index) =>
      G.distance(point, points[(index + 1) % points.length]),
    )
    const shortest = Math.min(...lengths)
    const longest = Math.max(...lengths)
    close(longest, shortest, 0.0001, `${sides} เหลี่ยม ด้านยาวไม่เท่ากัน`)

    const angles = G.interiorAngles(points)
    const expected = ((sides - 2) * 180) / sides
    for (const angle of angles) {
      close(angle, expected, 0.0001, `${sides} เหลี่ยม มุมภายในไม่เท่ากับสูตร`)
    }

    const total = angles.reduce((sum, value) => sum + value, 0)
    close(total, G.sumInteriorAngles(sides), 0.0001, `${sides} เหลี่ยม ผลรวมมุมภายในผิด`)
  }
})

check('ผลรวมมุมภายในของรูปเบี้ยว ๆ ก็ยังเท่ากับ (n-2)×180', () => {
  const shapes = [
    [
      { x: 0, y: 0 },
      { x: 200, y: 40 },
      { x: 160, y: 220 },
    ],
    [
      { x: 0, y: 0 },
      { x: 240, y: 10 },
      { x: 300, y: 180 },
      { x: 40, y: 260 },
    ],
    [
      { x: 0, y: 0 },
      { x: 180, y: 30 },
      { x: 260, y: 160 },
      { x: 120, y: 280 },
      { x: -40, y: 170 },
    ],
  ]
  for (const points of shapes) {
    const total = G.interiorAngles(points).reduce((sum, value) => sum + value, 0)
    close(
      total,
      G.sumInteriorAngles(points.length),
      0.0001,
      `รูป ${points.length} เหลี่ยม ผลรวมมุมภายในเพี้ยน`,
    )
  }
})

check('ความยาวรอบรูปกับพื้นที่ต้องตรงกับการคำนวณด้วยมือ', () => {
  /* สี่เหลี่ยมจัตุรัสด้านละ 4 ซม. บนกระดาษคือด้านละ 160 พิกเซล */
  const side = 4 * G.PX_PER_CM
  const square = [
    { x: 0, y: 0 },
    { x: side, y: 0 },
    { x: side, y: side },
    { x: 0, y: side },
  ]
  close(G.polygonPerimeter(square) / G.PX_PER_CM, 16, 0.0001, 'รอบรูปของจัตุรัส 4 ซม. ต้องได้ 16 ซม.')
  close(G.areaInCm(square), 16, 0.0001, 'พื้นที่จัตุรัส 4 ซม. ต้องได้ 16 ตร.ซม.')

  const triangle = [
    { x: 0, y: 0 },
    { x: 120, y: 0 },
    { x: 0, y: 80 },
  ]
  close(G.polygonArea(triangle), 4800, 0.0001, 'พื้นที่สามเหลี่ยมมุมฉากผิด')
})

check('ชื่อรูปต้องเป็นภาษาไทยที่เด็กอ่านแล้วเข้าใจ', () => {
  assert(G.polygonName(3) === 'สามเหลี่ยม', 'ชื่อรูปสามด้านผิด')
  assert(G.polygonName(6) === 'หกเหลี่ยม', 'ชื่อรูปหกด้านผิด')
  assert(G.polygonName(20).includes('20'), 'รูปที่ไม่มีชื่อเฉพาะต้องบอกจำนวนด้าน')
  assert(G.angleName(45) === 'มุมแหลม', 'มุมน้อยกว่า 90 ต้องเป็นมุมแหลม')
  assert(G.angleName(90) === 'มุมฉาก', '90 องศาต้องเป็นมุมฉาก')
  assert(G.angleName(120) === 'มุมป้าน', 'มุมเกิน 90 ต้องเป็นมุมป้าน')
})

/* ---------------------------------------------------------------- */
/* วงเวียน                                                           */
/* ---------------------------------------------------------------- */

check('ส่วนโค้งต้องรู้ว่ามุมไหนอยู่บนตัวเองบ้าง', () => {
  assert(G.isOnArc(45, 0, 90), '45° ต้องอยู่บนส่วนโค้ง 0° ถึง 90°')
  assert(!G.isOnArc(120, 0, 90), '120° ต้องไม่อยู่บนส่วนโค้ง 0° ถึง 90°')
  /* กวาดตามเข็มนาฬิกา คือค่าติดลบ */
  assert(G.isOnArc(330, 0, -60), 'กวาดตามเข็มแล้ว 330° ต้องอยู่บนส่วนโค้ง')
  assert(!G.isOnArc(30, 0, -60), 'กวาดตามเข็มแล้ว 30° ต้องไม่อยู่บนส่วนโค้ง')
  assert(G.isOnArc(200, 10, 360), 'กวาดครบวงแล้วทุกมุมต้องอยู่บนส่วนโค้ง')
})

check('การกวาดต้องต่อเนื่องแม้ข้ามรอยต่อ 0 องศา', () => {
  /* หมุนทวนเข็มผ่าน 0° เช่นจาก 350° ไป 10° ต้องได้ +20 ไม่ใช่ -340 */
  close(G.accumulateSweep(0, 350, 10), 20, 0.0001, 'ข้าม 0° แล้วมุมกระโดด')
  close(G.accumulateSweep(0, 10, 350), -20, 0.0001, 'ข้าม 0° ย้อนกลับแล้วมุมกระโดด')
  /* กวาดต่อจากของเดิมได้เรื่อย ๆ แต่ไม่เกินหนึ่งรอบ */
  close(G.accumulateSweep(200, 0, 30), 230, 0.0001, 'กวาดสะสมต่อจากของเดิมแล้วเพี้ยน')
  close(G.accumulateSweep(350, 0, 30), 360, 0.0001, 'กวาดเกินหนึ่งรอบต้องหยุดที่ 360°')
  assert(G.accumulateSweep(359, 0, 90) <= 360, 'กวาดเกินหนึ่งรอบไม่ถูกจำกัด')
  assert(G.accumulateSweep(-359, 0, -90) >= -360, 'กวาดย้อนเกินหนึ่งรอบไม่ถูกจำกัด')
})

check('เส้นทางส่วนโค้งต้องเริ่มและจบตรงจุดที่ควรเป็น', () => {
  const center = { x: 300, y: 300 }
  const path = G.arcPath(center, 100, 0, 90)
  const numbers = path.match(/-?\d+\.\d+/g).map(Number)
  close(numbers[0], 400, 0.01, 'ส่วนโค้งต้องเริ่มทางขวาของจุดศูนย์กลาง')
  close(numbers[1], 300, 0.01, 'จุดเริ่มของส่วนโค้งอยู่ผิดแนว')
  const last = numbers.slice(-2)
  close(last[0], 300, 0.01, 'ส่วนโค้ง 90° ต้องจบตรงแนวดิ่ง')
  close(last[1], 200, 0.01, 'ส่วนโค้ง 90° ต้องจบเหนือจุดศูนย์กลาง')
  /*
   * ทวนเข็มบนกระดาษคือธง sweep-flag = 0 ของ SVG เพราะแกน y กลับด้านกัน
   * ธงผิดด้านคือความผิดพลาดที่ยังวาดออกมาเป็นส่วนโค้งสวย ๆ เหมือนเดิม
   * ต่างกันแค่ไปโผล่อีกฝั่งของวงกลม ซึ่งอ่านจากโค้ดอย่างเดียวไม่มีทางเห็น
   */
  const flags = (text) => text.split(' A ')[1].split(' ').slice(3, 5).join(' ')
  assert(flags(path) === '0 0', `กวาดทวนเข็มแล้วธงเป็น ${flags(path)} ควรเป็น 0 0`)
  const clockwise = G.arcPath(center, 100, 0, -90)
  assert(flags(clockwise) === '0 1', `กวาดตามเข็มแล้วธงเป็น ${flags(clockwise)} ควรเป็น 0 1`)
  const wide = G.arcPath(center, 100, 0, 200)
  assert(flags(wide) === '1 0', `ส่วนโค้งเกินครึ่งวงต้องใช้ธง 1 0 แต่ได้ ${flags(wide)}`)
})

/* ---------------------------------------------------------------- */
/* แม่เหล็กและการจิ้มโดน                                              */
/* ---------------------------------------------------------------- */

check('แม่เหล็กต้องดูดเข้าเส้นตารางและมุมที่ลงตัว', () => {
  const snapped = G.snapToGrid({ x: 97, y: 43 }, 20)
  assert(snapped.x === 100 && snapped.y === 40, 'ดูดเข้าเส้นตารางผิดช่อง')
  close(G.snapDeg(47, 15), 45, 0.0001, 'ดูดมุมเข้า 15° ผิด')
  close(G.snapDeg(-5, 15), 0, 0.0001, 'ดูดมุมติดลบแล้วผิด')

  const start = { x: 100, y: 100 }
  const end = G.snapEnd(start, { x: 218, y: 96 }, 15, 0.5)
  close(G.angleOf(start, end), 0, 0.0001, 'ปลายเส้นควรถูกดูดให้อยู่แนวนอนพอดี')
  close(G.distance(start, end) / G.PX_PER_CM, 3, 0.0001, 'ความยาวควรถูกดูดเป็น 3.0 ซม.')
})

check('เงาของจุดบนเส้นไม้บรรทัดต้องตกตั้งฉากจริง', () => {
  const foot = G.projectOnLine({ x: 50, y: 80 }, { x: 0, y: 0 }, { x: 100, y: 0 })
  close(foot.x, 50, 0.0001, 'เงาเลื่อนไปตามแนวเส้น')
  close(foot.y, 0, 0.0001, 'เงาไม่ได้ตกบนเส้น')
  close(G.distanceToSegment({ x: 200, y: 0 }, { x: 0, y: 0 }, { x: 100, y: 0 }), 100, 0.0001,
    'ระยะถึงส่วนของเส้นตรงต้องวัดจากปลายเส้น ไม่ใช่จากเส้นที่ยาวไม่สิ้นสุด')
})

check('จิ้มโดนเส้น โดนเส้นรอบวง และโดนในรูป', () => {
  const line = segment('a', { x: 0, y: 0 }, { x: 100, y: 0 })
  assert(S.hitTest(line, { x: 50, y: 4 }), 'จิ้มใกล้เส้นแล้วไม่โดน')
  assert(!S.hitTest(line, { x: 50, y: 60 }), 'จิ้มไกลเส้นแล้วยังโดน')

  const circle = { kind: 'circle', id: 'c', color: '#000', width: 2, center: { x: 0, y: 0 }, radius: 100 }
  assert(S.hitTest(circle, { x: 100, y: 0 }), 'จิ้มบนเส้นรอบวงแล้วไม่โดน')
  assert(!S.hitTest(circle, { x: 0, y: 0 }), 'จิ้มกลางวงกลมเปล่าไม่ควรโดนเส้นรอบวง')

  const polygon = {
    kind: 'polygon',
    id: 'p',
    color: '#000',
    width: 2,
    closed: true,
    fill: 'none',
    points: [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 100 },
      { x: 0, y: 100 },
    ],
  }
  assert(S.hitTest(polygon, { x: 50, y: 50 }), 'จิ้มกลางรูปปิดแล้วไม่โดน')
  assert(!S.hitTest(polygon, { x: 300, y: 300 }), 'จิ้มนอกรูปแล้วยังโดน')

  /* ส่วนโค้งครึ่งบนของวงกลม จิ้มด้านล่างต้องไม่โดน */
  const arc = { kind: 'arc', id: 'r', color: '#000', width: 2, center: { x: 0, y: 0 }, radius: 100, start: 0, sweep: 180 }
  assert(S.hitTest(arc, { x: 0, y: -100 }), 'จิ้มบนส่วนโค้งแล้วไม่โดน')
  assert(!S.hitTest(arc, { x: 0, y: 100 }), 'จิ้มฝั่งที่ไม่มีส่วนโค้งแล้วยังโดน')
})

check('รูปบนสุดต้องถูกเลือกก่อน และย้ายแล้วต้องไปทั้งรูป', () => {
  const shapes = [
    segment('ล่าง', { x: 0, y: 0 }, { x: 100, y: 0 }),
    segment('บน', { x: 0, y: 0 }, { x: 100, y: 0 }),
  ]
  assert(S.findShapeAt(shapes, { x: 50, y: 0 }).id === 'บน', 'ต้องเลือกรูปที่วาดทีหลังก่อน')
  assert(S.findShapeAt(shapes, { x: 50, y: 400 }) === null, 'จิ้มที่ว่างต้องไม่ได้รูปอะไร')

  const moved = S.translateShape(shapes[0], 10, -20)
  assert(moved.a.x === 10 && moved.a.y === -20, 'ปลายด้านหนึ่งไม่ขยับตาม')
  assert(moved.b.x === 110 && moved.b.y === -20, 'ปลายอีกด้านไม่ขยับตาม')
  assert(shapes[0].a.x === 0, 'การย้ายไปแก้รูปเดิม ทำให้ปุ่มย้อนกลับพัง')
})

check('ปลายเส้นต้องวิ่งไปชนจุดเดิมที่อยู่ใกล้', () => {
  const shapes = [segment('a', { x: 0, y: 0 }, { x: 100, y: 100 })]
  const near = S.nearestAnchor(shapes, { x: 104, y: 97 }, 16)
  assert(near && near.x === 100 && near.y === 100, 'จุดใกล้ ๆ ไม่ถูกดูด')
  assert(S.nearestAnchor(shapes, { x: 400, y: 400 }, 16) === null, 'จุดไกลไม่ควรถูกดูด')
})

check('จุดตัดของวงกลมสองวง ต้องเป็นจุดที่ใช้สร้างสามเหลี่ยมด้านเท่าได้จริง', () => {
  /* วงกลมรัศมีเท่ากันสองวง ที่เข็มปักอยู่ปลายเส้นคนละข้าง คือขั้นตอนสร้างสามเหลี่ยมด้านเท่า */
  const side = 4 * G.PX_PER_CM
  const points = G.circleIntersections({ x: 0, y: 0 }, side, { x: side, y: 0 }, side)
  assert(points.length === 2, `ควรตัดกันสองจุด แต่ได้ ${points.length} จุด`)
  for (const point of points) {
    close(G.distance(point, { x: 0, y: 0 }), side, 0.0001, 'จุดตัดห่างจากเข็มข้างแรกไม่เท่ารัศมี')
    close(G.distance(point, { x: side, y: 0 }), side, 0.0001, 'จุดตัดห่างจากเข็มข้างที่สองไม่เท่ารัศมี')
  }

  /* แตะกันพอดีได้จุดเดียว ห่างกันเกินไปไม่ได้เลย และวงในวงก็ไม่ได้เลย */
  assert(G.circleIntersections({ x: 0, y: 0 }, 5, { x: 10, y: 0 }, 5).length === 1, 'สัมผัสกันพอดีควรได้จุดเดียว')
  assert(G.circleIntersections({ x: 0, y: 0 }, 1, { x: 9, y: 0 }, 1).length === 0, 'ห่างกันเกินไปต้องไม่มีจุดตัด')
  assert(G.circleIntersections({ x: 0, y: 0 }, 10, { x: 1, y: 0 }, 2).length === 0, 'วงเล็กอยู่ในวงใหญ่ต้องไม่มีจุดตัด')
  assert(G.circleIntersections({ x: 0, y: 0 }, 5, { x: 0, y: 0 }, 5).length === 0, 'วงเดียวกันทั้งวงต้องไม่คืนจุดตัด')
})

check('จุดที่วงกลมตัดเส้นตรง ต้องอยู่บนช่วงของเส้นเท่านั้น', () => {
  const across = G.circleSegmentIntersections({ x: 0, y: 0 }, 5, { x: -10, y: 0 }, { x: 10, y: 0 })
  assert(across.length === 2, 'เส้นที่ผ่ากลางวงต้องตัดสองจุด')
  /* เส้นสั้น ๆ ที่จบก่อนถึงเส้นรอบวง ต้องไม่นับว่าตัด */
  assert(
    G.circleSegmentIntersections({ x: 0, y: 0 }, 5, { x: 0, y: 0 }, { x: 3, y: 0 }).length === 0,
    'เส้นที่ยังไปไม่ถึงเส้นรอบวงต้องไม่มีจุดตัด',
  )
  assert(
    G.circleSegmentIntersections({ x: 0, y: 0 }, 5, { x: -10, y: 20 }, { x: 10, y: 20 }).length === 0,
    'เส้นที่อยู่ห่างออกไปต้องไม่มีจุดตัด',
  )
})

check('ปลายส่วนโค้งต้องเป็นจุดที่ปลายเส้นวิ่งไปชนได้', () => {
  const arc = {
    kind: 'arc',
    id: 'r',
    color: '#000',
    width: 2,
    center: { x: 0, y: 0 },
    radius: 100,
    start: 0,
    sweep: 90,
  }
  const anchors = S.shapeAnchors(arc)
  assert(anchors.length === 3, `ส่วนโค้งควรมีจุดสำคัญสามจุด แต่ได้ ${anchors.length}`)
  const near = S.nearestAnchor([arc], { x: 4, y: -97 }, 16)
  assert(near !== null, 'ปลายโค้งด้านบนไม่ถูกดูด')
  close(near.x, 0, 0.0001, 'ปลายโค้งอยู่ผิดที่')
  close(near.y, -100, 0.0001, 'ปลายโค้งอยู่ผิดที่')
})

check('แม่เหล็กต้องดูดเข้าจุดตัดของส่วนโค้ง ไม่ใช่แค่จุดที่วาดไว้', () => {
  const side = 4 * G.PX_PER_CM
  const shapes = [
    { kind: 'circle', id: 'a', color: '#000', width: 2, center: { x: 0, y: 0 }, radius: side },
    { kind: 'circle', id: 'b', color: '#000', width: 2, center: { x: side, y: 0 }, radius: side },
  ]
  const apex = G.circleIntersections({ x: 0, y: 0 }, side, { x: side, y: 0 }, side)[0]
  const snapped = S.nearestSnapPoint(shapes, { x: apex.x + 6, y: apex.y - 5 }, 16)
  assert(snapped !== null, 'จุดตัดของสองวงไม่ถูกดูด ทั้งที่นิ้วอยู่ใกล้มาก')
  close(snapped.x, apex.x, 0.0001, 'ดูดไปผิดจุด')
  close(snapped.y, apex.y, 0.0001, 'ดูดไปผิดจุด')

  /* จุดยอดที่มองเห็นต้องมาก่อนจุดตัดเสมอ ถ้าอยู่ใกล้กันทั้งคู่ */
  const withDot = [
    ...shapes,
    { kind: 'dot', id: 'd', color: '#000', width: 2, at: { x: apex.x + 4, y: apex.y }, label: 'A' },
  ]
  const preferred = S.nearestSnapPoint(withDot, { x: apex.x + 5, y: apex.y }, 16)
  close(preferred.x, apex.x + 4, 0.0001, 'ควรดูดเข้าจุดที่มองเห็นก่อนจุดตัด')
})

check('ส่วนโค้งครึ่งเดียว ต้องไม่แถมจุดตัดของฝั่งที่ไม่ได้วาด', () => {
  const shapes = [
    /* โค้งครึ่งบนของวงซ้าย กับโค้งครึ่งบนของวงขวา ตัดกันได้จุดเดียวคือด้านบน */
    { kind: 'arc', id: 'a', color: '#000', width: 2, center: { x: 0, y: 0 }, radius: 100, start: 0, sweep: 180 },
    { kind: 'arc', id: 'b', color: '#000', width: 2, center: { x: 100, y: 0 }, radius: 100, start: 0, sweep: 180 },
  ]
  const found = S.intersectionTargets(shapes)
  assert(found.length === 1, `ควรได้จุดตัดจุดเดียว แต่ได้ ${found.length} จุด`)
  assert(found[0].y < 0, 'จุดตัดต้องอยู่ครึ่งบนของกระดาษ ซึ่งเป็นฝั่งที่วาดไว้จริง')
})

/* ---------------------------------------------------------------- */
/* คำอธิบายที่เด็กอ่าน                                                */
/* ---------------------------------------------------------------- */

check('คำอธิบายรูปต้องมีตัวเลขที่ถูกต้องอยู่จริง', () => {
  const square = {
    kind: 'polygon',
    id: 'p',
    color: '#000',
    width: 2,
    closed: true,
    fill: 'none',
    points: G.regularPolygon({ x: 0, y: 0 }, 100, 4),
  }
  const report = S.describeShape(square)
  assert(report.title === 'สี่เหลี่ยม', 'ชื่อรูปในคำอธิบายผิด')
  assert(report.lines.some((line) => line.includes('360')), 'ไม่ได้บอกผลรวมมุมภายใน 360°')
  assert(report.lines.some((line) => line.includes('ด้านทุกด้านยาวเท่ากัน')), 'ไม่ได้บอกว่าด้านเท่ากัน')

  const circle = { kind: 'circle', id: 'c', color: '#000', width: 2, center: { x: 0, y: 0 }, radius: 2 * G.PX_PER_CM }
  const circleReport = S.describeShape(circle)
  assert(circleReport.lines.some((line) => line.includes('4.0')), 'เส้นผ่านศูนย์กลางของรัศมี 2 ซม. ต้องเป็น 4.0 ซม.')

  assert(S.describeBoard([]).length > 0, 'กระดาษว่างต้องมีข้อความชวนเริ่มวาด')
})

/* ---------------------------------------------------------------- */
/* ปุ่มย้อนกลับ                                                       */
/* ---------------------------------------------------------------- */

check('ย้อนกลับและทำซ้ำต้องกลับไปกลับมาได้ตรงทุกขั้น', () => {
  let board = B.EMPTY_BOARD
  board = B.boardReducer(board, { type: 'add', shape: segment('1', { x: 0, y: 0 }, { x: 1, y: 1 }) })
  board = B.boardReducer(board, { type: 'add', shape: segment('2', { x: 0, y: 0 }, { x: 2, y: 2 }) })
  assert(board.shapes.length === 2, 'วางรูปแล้วไม่ขึ้นบนกระดาษ')

  board = B.boardReducer(board, { type: 'undo' })
  assert(board.shapes.length === 1 && board.shapes[0].id === '1', 'ย้อนกลับหนึ่งขั้นแล้วผิด')
  board = B.boardReducer(board, { type: 'undo' })
  assert(board.shapes.length === 0, 'ย้อนกลับสองขั้นแล้วกระดาษต้องว่าง')
  assert(!B.canUndo(board), 'ย้อนจนสุดแล้วยังบอกว่าย้อนได้อีก')

  board = B.boardReducer(board, { type: 'redo' })
  board = B.boardReducer(board, { type: 'redo' })
  assert(board.shapes.length === 2, 'ทำซ้ำแล้วรูปไม่กลับมาครบ')
  assert(!B.canRedo(board), 'ทำซ้ำจนสุดแล้วยังบอกว่าทำซ้ำได้อีก')
})

check('วาดรูปใหม่หลังย้อนกลับ ต้องทิ้งอนาคตที่ไม่ได้ใช้แล้ว', () => {
  let board = B.EMPTY_BOARD
  board = B.boardReducer(board, { type: 'add', shape: segment('1', { x: 0, y: 0 }, { x: 1, y: 1 }) })
  board = B.boardReducer(board, { type: 'undo' })
  assert(B.canRedo(board), 'ย้อนกลับแล้วต้องทำซ้ำได้')
  board = B.boardReducer(board, { type: 'add', shape: segment('2', { x: 0, y: 0 }, { x: 2, y: 2 }) })
  assert(!B.canRedo(board), 'วาดใหม่แล้วยังทำซ้ำของเก่าได้ จะได้รูปที่เด็กไม่ได้ตั้งใจ')
})

check('จิ้มยางลบโดนที่ว่าง ต้องไม่กินประวัติไปหนึ่งขั้น', () => {
  let board = B.EMPTY_BOARD
  board = B.boardReducer(board, { type: 'add', shape: segment('1', { x: 0, y: 0 }, { x: 1, y: 1 }) })
  const before = board
  board = B.boardReducer(board, { type: 'remove', id: 'ไม่มีรูปนี้' })
  assert(board === before, 'ลบรูปที่ไม่มีอยู่แล้วสถานะเปลี่ยน')
  board = B.boardReducer(board, { type: 'clear' })
  board = B.boardReducer(board, { type: 'undo' })
  assert(board.shapes.length === 1, 'ล้างกระดาษแล้วย้อนกลับไม่ได้')
})

check('ประวัติต้องไม่โตไม่สิ้นสุด', () => {
  let board = B.EMPTY_BOARD
  for (let index = 0; index < B.HISTORY_LIMIT + 20; index += 1) {
    board = B.boardReducer(board, {
      type: 'add',
      shape: segment(`s${index}`, { x: 0, y: 0 }, { x: index, y: index }),
    })
  }
  assert(board.past.length === B.HISTORY_LIMIT, `ประวัติยาว ${board.past.length} ขั้น เกินที่ตั้งไว้`)
})

/* ---------------------------------------------------------------- */
/* ข้อความบนหน้าจอ                                                    */
/* ---------------------------------------------------------------- */

check('ทุกเครื่องมือต้องมีคำแนะนำและขั้นตอนครบ', () => {
  assert(T.TOOLS.length >= 8, 'เครื่องมือหายไปจากกล่อง')
  for (const tool of T.TOOLS) {
    assert(tool.hint.length > 10, `${tool.id} ไม่มีคำแนะนำให้น้องวงเวียนพูด`)
    assert(tool.steps.length >= 2, `${tool.id} มีขั้นตอนไม่ครบ`)
    /*
     * ชื่อสั้นใช้บนปุ่มที่กว้างแค่หนึ่งในสามของแผง
     * ชื่อยาวเกินจะตัดบรรทัดจนปุ่มสูงไม่เท่ากันทั้งตาราง แล้วตารางจะดูเบี้ยว
     */
    assert(tool.short.length > 0, `${tool.id} ไม่มีชื่อสั้นสำหรับปุ่มในตาราง`)
    assert(tool.short.length <= 12, `${tool.id} ชื่อสั้นยาวเกินไป (${tool.short})`)
    assert(T.findTool(tool.id).id === tool.id, `หาเครื่องมือ ${tool.id} ไม่เจอ`)
  }
  assert(T.PENCIL_COLORS.length >= 4, 'สีดินสอน้อยเกินไป')
  assert(T.PENCIL_WIDTHS.length >= 2, 'ความหนาเส้นน้อยเกินไป')
})

check('บัตรภารกิจต้องบอกขั้นตอนและสิ่งที่ได้เรียนรู้', () => {
  assert(M.MISSIONS.length >= 4, 'ภารกิจน้อยเกินไปสำหรับหนึ่งคาบ')
  for (const mission of M.MISSIONS) {
    assert(mission.steps.length >= 3, `ภารกิจ ${mission.id} มีขั้นตอนน้อยเกินไป`)
    assert(mission.learn.length > 10, `ภารกิจ ${mission.id} ไม่ได้บอกว่าได้เรียนรู้อะไร`)
  }
  assert(M.nextMissionIndex(M.MISSIONS.length - 1) === 0, 'ภารกิจใบสุดท้ายต้องวนกลับใบแรก')
})

/* ---------------------------------------------------------------- */
/* บันทึกงานและอ่านกลับ                                                */
/* ---------------------------------------------------------------- */

const SAMPLE_PREFS = {
  themeId: 'mint',
  color: '#3b82f6',
  width: 3.5,
  showGrid: false,
  snapOn: true,
  showLengths: false,
  showAngles: true,
  showFaces: false,
}

check('บันทึกแล้วอ่านกลับ ต้องได้งานเดิมทุกอย่าง', () => {
  const shapes = [
    segment('s1', { x: 10, y: 20 }, { x: 110, y: 20 }),
    { kind: 'circle', id: 'c1', color: '#000', width: 2, center: { x: 50, y: 50 }, radius: 40 },
    {
      kind: 'polygon',
      id: 'p1',
      color: '#000',
      width: 2,
      closed: true,
      fill: '#00000022',
      points: G.regularPolygon({ x: 300, y: 300 }, 80, 5),
    },
    { kind: 'sticker', id: 'k1', color: '#000', width: 2, at: { x: 9, y: 9 }, emoji: '⭐', size: 46 },
  ]
  const labels = { 'p1:edge:0': { x: 12, y: -18 } }

  const back = D.decodeBoard(D.encodeBoard(shapes, labels, SAMPLE_PREFS))
  assert(back !== null, 'อ่านงานที่เพิ่งบันทึกกลับไม่ได้')
  assert(back.shapes.length === shapes.length, 'จำนวนรูปหายไประหว่างบันทึก')
  close(back.shapes[1].radius, 40, 0.0001, 'รัศมีเพี้ยนหลังอ่านกลับ')
  assert(back.shapes[2].points.length === 5, 'จุดยอดของรูปหายไป')
  assert(back.shapes[3].emoji === '⭐', 'สติกเกอร์เปลี่ยนรูป')
  close(back.labels['p1:edge:0'].y, -18, 0.0001, 'ตำแหน่งป้ายที่ลากไว้หายไป')
  assert(back.prefs.themeId === 'mint', 'ธีมกระดาษไม่ถูกจำ')
  assert(back.prefs.showGrid === false, 'สวิตช์ที่ปิดไว้กลับมาเปิดเอง')
})

check('ข้อมูลที่ใช้ไม่ได้ ต้องไม่ทำให้หน้าพัง', () => {
  /*
   * ข้อมูลใน localStorage แก้ด้วยมือได้ ค้างจากเวอร์ชันเก่าได้ และเสียกลางทางได้
   * ถ้าอ่านมาใช้ตรง ๆ หน้าจะพังตั้งแต่เปิด แล้วเด็กจะเข้าห้องนี้ไม่ได้อีกเลย
   */
  assert(D.decodeBoard(null) === null, 'ยังไม่เคยบันทึกต้องได้ null เฉย ๆ')
  assert(D.decodeBoard('') === null, 'ข้อความว่างต้องได้ null')
  assert(D.decodeBoard('ไม่ใช่ JSON เลย') === null, 'ข้อความที่อ่านไม่ออกต้องได้ null')
  assert(D.decodeBoard('[1,2,3]') === null, 'JSON ที่ไม่ใช่งานของห้องนี้ต้องได้ null')
  assert(
    D.decodeBoard(JSON.stringify({ version: 999, shapes: [] })) === null,
    'งานคนละเวอร์ชันต้องไม่ถูกนำมาใช้',
  )
  assert(
    D.decodeBoard(JSON.stringify({ version: 1, shapes: 'ไม่ใช่รายการ' })) === null,
    'รายการรูปที่ผิดชนิดต้องได้ null',
  )
})

check('รูปที่เสียถูกทิ้งเฉพาะรูปนั้น ไม่ใช่ทิ้งทั้งกระดาษ', () => {
  const raw = JSON.stringify({
    version: 1,
    shapes: [
      segment('ดี', { x: 0, y: 0 }, { x: 10, y: 10 }),
      { kind: 'segment', id: 'พิกัดพัง', color: '#000', width: 2, a: { x: 0, y: 'ห้า' }, b: { x: 1, y: 1 } },
      { kind: 'circle', id: 'รัศมีติดลบ', color: '#000', width: 2, center: { x: 0, y: 0 }, radius: -5 },
      { kind: 'ไม่รู้จักชนิดนี้', id: 'แปลก', color: '#000', width: 2 },
      { kind: 'dot', id: '', color: '#000', width: 2, at: { x: 1, y: 1 }, label: 'A' },
      { kind: 'circle', id: 'ดีอีกอัน', color: '#000', width: 2, center: { x: 5, y: 5 }, radius: 20 },
    ],
  })
  const back = D.decodeBoard(raw)
  assert(back !== null, 'ทั้งกระดาษถูกทิ้งทั้งที่มีรูปดีอยู่')
  assert(back.shapes.length === 2, `ควรเหลือรูปที่ใช้ได้สองรูป แต่ได้ ${back.shapes.length}`)
  assert(back.shapes[0].id === 'ดี' && back.shapes[1].id === 'ดีอีกอัน', 'เก็บผิดรูป')
})

check('ค่าตั้งค่าที่ไม่รู้จัก ต้องกลับไปใช้ค่าตั้งต้น', () => {
  const back = D.decodeBoard(
    JSON.stringify({
      version: 1,
      shapes: [],
      prefs: { themeId: 'ธีมที่ไม่มีอยู่', color: 'สีมั่ว', width: -3, showGrid: 'ไม่ใช่บูลีน' },
      labels: { 'a:edge:0': { x: 9999, y: 0 }, 'b:edge:0': 'ไม่ใช่จุด' },
    }),
  )
  assert(back !== null, 'ควรอ่านได้ ไม่ใช่ทิ้งทั้งงาน')
  assert(back.prefs.themeId === D.DEFAULT_PREFS.themeId, 'ธีมที่ไม่รู้จักควรกลับไปใช้ค่าตั้งต้น')
  assert(back.prefs.color === D.DEFAULT_PREFS.color, 'สีที่ไม่รู้จักควรกลับไปใช้ค่าตั้งต้น')
  assert(back.prefs.width === D.DEFAULT_PREFS.width, 'ความหนาที่ติดลบควรกลับไปใช้ค่าตั้งต้น')
  assert(back.prefs.showGrid === D.DEFAULT_PREFS.showGrid, 'ค่าที่ไม่ใช่บูลีนควรกลับไปใช้ค่าตั้งต้น')

  /* ป้ายที่ถูกแก้มือให้ไกลเกินเชือก ต้องถูกดึงกลับตอนอ่าน ไม่ใช่ลอยอยู่กลางกระดาษ */
  const leashed = back.labels['a:edge:0']
  close(Math.hypot(leashed.x, leashed.y), B_LABELS.LABEL_LEASH, 0.0001, 'ป้ายที่ไกลเกินไม่ถูกดึงกลับ')
  assert(back.labels['b:edge:0'] === undefined, 'ป้ายที่ผิดชนิดควรถูกทิ้ง')
})

/* ---------------------------------------------------------------- */
/* ลากจุดบนรูป                                                        */
/* ---------------------------------------------------------------- */

check('รูปแต่ละชนิดต้องมีจุดให้ลากแก้ครบตามที่ควรมี', () => {
  const poly = {
    kind: 'polygon',
    id: 'p',
    color: '#000',
    width: 2,
    closed: true,
    fill: 'none',
    points: G.regularPolygon({ x: 0, y: 0 }, 100, 6),
  }
  assert(S.shapeVertices(poly).length === 6, 'หกเหลี่ยมควรมีจุดให้ลากหกจุด')
  assert(S.shapeVertices(segment('s', { x: 0, y: 0 }, { x: 1, y: 1 })).length === 2, 'เส้นตรงควรมีสองจุด')

  const circle = { kind: 'circle', id: 'c', color: '#000', width: 2, center: { x: 0, y: 0 }, radius: 50 }
  const spots = S.shapeVertices(circle)
  assert(spots.length === 2, 'วงกลมควรมีจุดศูนย์กลางกับจุดบนเส้นรอบวง')
  assert(spots[0].center === true, 'จุดศูนย์กลางต้องถูกทำเครื่องหมายไว้ให้วาดต่างจากจุดบนเส้น')
})

check('ลากจุดเดียว ต้องขยับแค่จุดนั้น', () => {
  const poly = {
    kind: 'polygon',
    id: 'p',
    color: '#000',
    width: 2,
    closed: true,
    fill: 'none',
    points: G.regularPolygon({ x: 200, y: 200 }, 100, 4),
  }
  const moved = S.moveVertex(poly, 'v2', { x: 7, y: 9 })
  close(moved.points[2].x, 7, 0.0001, 'จุดที่ลากไม่ไปที่ใหม่')
  close(moved.points[0].x, poly.points[0].x, 0.0001, 'จุดอื่นขยับตามไปด้วย')
  assert(poly.points[2].x !== 7, 'ของเดิมถูกแก้ ซึ่งทำให้ปุ่มย้อนกลับพัง')

  /* ชื่อจุดที่ไม่มีอยู่ ต้องไม่ทำให้รูปเปลี่ยน */
  assert(S.moveVertex(poly, 'v99', { x: 0, y: 0 }) === poly, 'จุดที่ไม่มีอยู่ไม่ควรเปลี่ยนอะไร')
})

check('ลากจุดของวงกลมและส่วนโค้ง ต้องได้ผลตามที่เห็น', () => {
  const circle = { kind: 'circle', id: 'c', color: '#000', width: 2, center: { x: 0, y: 0 }, radius: 50 }
  close(S.moveVertex(circle, 'edge', { x: 80, y: 0 }).radius, 80, 0.0001, 'ลากขอบวงกลมแล้วรัศมีไม่ตาม')
  close(S.moveVertex(circle, 'center', { x: 10, y: 10 }).center.x, 10, 0.0001, 'ลากจุดศูนย์กลางแล้ววงไม่ย้าย')
  assert(S.moveVertex(circle, 'edge', { x: 0, y: 0 }).radius > 0, 'รัศมีต้องไม่กลายเป็นศูนย์จนวงหายไป')

  /* ลากปลายส่วนโค้ง ปลายอีกข้างต้องอยู่ที่เดิม */
  const arc = {
    kind: 'arc',
    id: 'a',
    color: '#000',
    width: 2,
    center: { x: 0, y: 0 },
    radius: 100,
    start: 0,
    sweep: 90,
  }
  const pulled = S.moveVertex(arc, 'to', { x: -100, y: 0 })
  close(pulled.start, 0, 0.0001, 'ลากปลายด้านหนึ่งแล้วปลายอีกข้างขยับตาม')
  close(pulled.sweep, 180, 0.0001, 'มุมกวาดไม่ตรงกับจุดที่ลากไป')
})

check('ลากจุดยอดของมุม แขนทั้งสองต้องตามไปทั้งชุด', () => {
  /* ถ้าแขนไม่ตาม มุมจะเปลี่ยนขนาดทั้งที่เด็กแค่อยากย้ายที่ */
  const angle = {
    kind: 'angle',
    id: 'g',
    color: '#000',
    width: 2,
    vertex: { x: 0, y: 0 },
    a: { x: 100, y: 0 },
    b: { x: 0, y: -100 },
  }
  const moved = S.moveVertex(angle, 'vertex', { x: 50, y: 50 })
  close(
    G.angleBetween(moved.a, moved.vertex, moved.b),
    G.angleBetween(angle.a, angle.vertex, angle.b),
    0.0001,
    'ย้ายจุดยอดแล้วขนาดมุมเปลี่ยน',
  )
  close(moved.a.x, 150, 0.0001, 'แขนไม่ได้ตามจุดยอดไป')
})

check('จุดอ้างอิงตอนลากทั้งรูป ต้องเป็นจุดที่ใกล้นิ้วที่สุด', () => {
  /* เด็กเล็งว่า "เอามุมนี้ไปแปะตรงนั้น" แม่เหล็กจึงต้องทำงานกับมุมที่เขาจับ */
  const square = {
    kind: 'polygon',
    id: 'p',
    color: '#000',
    width: 2,
    closed: true,
    fill: 'none',
    points: [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 100 },
      { x: 0, y: 100 },
    ],
  }
  const handle = S.grabHandle(square, { x: 95, y: 96 })
  close(handle.x, 100, 0.0001, 'จับมุมล่างขวาแล้วได้จุดอื่น')
  close(handle.y, 100, 0.0001, 'จับมุมล่างขวาแล้วได้จุดอื่น')
})

/* ---------------------------------------------------------------- */
/* สั่งสร้างรูปด้วยตัวเลข                                               */
/* ---------------------------------------------------------------- */

const AT = { x: 500, y: 340 }
const STYLE = { color: '#8b5cf6', width: 3 }
const build = (id, values) => R.buildShapes(R.findRecipe(id), values, AT, STYLE)

check('ทุกแบบต้องสร้างรูปออกมาได้จริงด้วยค่าตั้งต้นของมันเอง', () => {
  /*
   * ข้อนี้ดักกรณีที่เพิ่มแบบใหม่ในรายการแล้วลืมเขียนวิธีสร้างของมัน
   * ซึ่งจะกลายเป็นปุ่มที่กดแล้วไม่มีอะไรเกิดขึ้น โดยไม่มี error อะไรเลย
   */
  const ids = new Set()
  for (const recipe of R.RECIPES) {
    assert(!ids.has(recipe.id), `รหัสแบบ ${recipe.id} ซ้ำ`)
    ids.add(recipe.id)
    assert(recipe.fields.length >= 1, `แบบ ${recipe.id} ไม่มีช่องให้ตั้งค่าเลย`)
    assert(recipe.hint.length > 10, `แบบ ${recipe.id} ไม่ได้บอกว่าใช้ตอนไหน`)

    const made = R.buildShapes(recipe, R.initialValues(recipe), AT, STYLE)
    assert(made.length >= 1, `แบบ ${recipe.id} กดแล้วไม่ได้รูปอะไรเลย`)
    for (const shape of made) {
      assert(shape.color === STYLE.color, `แบบ ${recipe.id} ไม่ได้ใช้สีดินสอที่เลือกอยู่`)
    }
  }
})

check('สี่เหลี่ยมผืนผ้าต้องได้กว้างยาวตรงตามที่สั่ง', () => {
  const rect = build('rect', { width: 3, height: 5 })[0]
  const sides = rect.points.map((point, index) =>
    G.distance(point, rect.points[(index + 1) % rect.points.length]),
  )
  close(sides[0] / G.PX_PER_CM, 3, 0.0001, 'ด้านกว้างไม่ตรง')
  close(sides[1] / G.PX_PER_CM, 5, 0.0001, 'ด้านยาวไม่ตรง')
  /* มุมทุกมุมต้องเป็นมุมฉาก ไม่งั้นมันไม่ใช่สี่เหลี่ยมผืนผ้า */
  for (const angle of G.interiorAngles(rect.points)) {
    close(angle, 90, 0.0001, 'สี่เหลี่ยมผืนผ้ามีมุมที่ไม่ใช่มุมฉาก')
  }
  /* พื้นที่ต้องตรงกับที่เด็กคำนวณเองได้ คือกว้างคูณยาว */
  close(G.areaInCm(rect.points), 15, 0.0001, 'พื้นที่ไม่เท่ากับกว้างคูณยาว')
})

check('จัตุรัสต้องด้านเท่าจริงทั้งสี่ด้าน', () => {
  const square = build('square', { side: 4 })[0]
  const sides = square.points.map((point, index) =>
    G.distance(point, square.points[(index + 1) % square.points.length]),
  )
  for (const side of sides) close(side / G.PX_PER_CM, 4, 0.0001, 'ด้านของจัตุรัสไม่เท่ากับที่สั่ง')
  close(G.polygonPerimeter(square.points) / G.PX_PER_CM, 16, 0.0001, 'ความยาวรอบรูปไม่ตรง')
})

check('รูปด้านเท่าต้องได้ความยาวด้านตามที่สั่ง ตั้งแต่สามถึงสิบสองเหลี่ยม', () => {
  for (let sides = 3; sides <= 12; sides += 1) {
    const poly = build('regular', { sides, side: 3 })[0]
    assert(poly.points.length === sides, `สั่ง ${sides} ด้าน แต่ได้ ${poly.points.length} จุด`)
    close(
      G.distance(poly.points[0], poly.points[1]) / G.PX_PER_CM,
      3,
      0.0001,
      `${sides} เหลี่ยม ด้านไม่ยาว 3 ซม. ตามที่สั่ง`,
    )
    close(
      G.interiorAngles(poly.points)[0],
      ((sides - 2) * 180) / sides,
      0.0001,
      `${sides} เหลี่ยม มุมภายในไม่ตรงสูตร`,
    )
  }
})

check('เส้นตรงต้องได้ความยาวและมุมตามที่สั่ง และวางกลางที่จิ้ม', () => {
  const line = build('line', { length: 4, tilt: 30 })[0]
  close(G.distance(line.a, line.b) / G.PX_PER_CM, 4, 0.0001, 'ความยาวไม่ตรง')
  close(G.angleOf(line.a, line.b), 30, 0.0001, 'มุมไม่ตรง')
  const middle = G.midpoint(line.a, line.b)
  close(middle.x, AT.x, 0.0001, 'เส้นไม่ได้วางให้กึ่งกลางอยู่ตรงที่จิ้ม')
  close(middle.y, AT.y, 0.0001, 'เส้นไม่ได้วางให้กึ่งกลางอยู่ตรงที่จิ้ม')
})

check('วงกลมกับส่วนโค้งต้องได้ขนาดตามที่สั่ง', () => {
  const circle = build('circle', { radius: 2.5 })[0]
  close(circle.radius / G.PX_PER_CM, 2.5, 0.0001, 'รัศมีวงกลมไม่ตรง')
  close(circle.center.x, AT.x, 0.0001, 'วงกลมไม่ได้วางตรงที่จิ้ม')

  const arc = build('arc', { radius: 3, sweep: 120 })[0]
  close(Math.abs(arc.sweep), 120, 0.0001, 'มุมที่จุดศูนย์กลางไม่ตรง')
  close(arc.radius / G.PX_PER_CM, 3, 0.0001, 'รัศมีส่วนโค้งไม่ตรง')
  /* กางสมมาตรรอบแนวนอน ปลายทั้งสองข้างจึงอยู่สูงเท่ากัน */
  const from = G.pointAt(arc.center, arc.radius, arc.start)
  const to = G.pointAt(arc.center, arc.radius, arc.start + arc.sweep)
  close(from.y, 2 * arc.center.y - to.y, 0.0001, 'ส่วนโค้งกางไม่สมมาตร')
})

check('สั่งมุม 108 องศา ต้องได้แขนสองข้างที่กาง 108 องศาจริง', () => {
  /* นี่คือทางลัดของการสร้างห้าเหลี่ยมด้านเท่า โดยไม่ต้องกะมุมเอง */
  const made = build('angle', { angle: 108, arm: 5 })
  assert(made.length === 3, 'มุมหนึ่งมุมควรได้แขนสองข้างกับป้ายองศา')
  const mark = made.find((shape) => shape.kind === 'angle')
  assert(mark, 'ไม่มีป้ายบอกองศา')
  close(G.angleBetween(mark.a, mark.vertex, mark.b), 108, 0.0001, 'มุมที่ได้ไม่ใช่ 108 องศา')

  const arms = made.filter((shape) => shape.kind === 'segment')
  assert(arms.length === 2, 'ควรได้แขนสองข้าง')
  close(
    G.distance(arms[0].a, arms[0].b) / G.PX_PER_CM,
    5,
    0.0001,
    'ความยาวแขนไม่ตรงกับที่สั่ง',
  )
  close(
    G.distance(arms[0].a, arms[0].b),
    G.distance(arms[1].a, arms[1].b),
    0.0001,
    'แขนสองข้างยาวไม่เท่ากัน',
  )
})

check('ค่าที่ใส่เกินขอบเขตหรือใส่ผิด ต้องถูกดึงกลับให้อยู่ในช่วงที่สร้างได้', () => {
  const recipe = R.findRecipe('circle')
  const field = recipe.fields[0]
  close(R.valueOf(recipe, { radius: 9999 }, 'radius'), field.max, 0.0001, 'ค่าเกินไม่ถูกดึงกลับ')
  close(R.valueOf(recipe, { radius: -5 }, 'radius'), field.min, 0.0001, 'ค่าติดลบไม่ถูกดึงกลับ')
  close(R.valueOf(recipe, {}, 'radius'), field.initial, 0.0001, 'ยังไม่ได้ใส่ค่าควรใช้ค่าตั้งต้น')
  close(R.valueOf(recipe, { radius: Number.NaN }, 'radius'), field.initial, 0.0001, 'ค่า NaN ควรใช้ค่าตั้งต้น')

  const values = R.initialValues(recipe)
  assert(Object.keys(values).length === recipe.fields.length, 'ค่าตั้งต้นไม่ครบทุกช่อง')
  assert(R.findRecipe('ไม่มีแบบนี้').id === R.RECIPES[0].id, 'แบบที่ไม่รู้จักควรได้แบบแรก')
})

/* ---------------------------------------------------------------- */
/* ย่อขยาย หมุน และตั้งค่าตัวเลขของรูป                                   */
/* ---------------------------------------------------------------- */

check('ย่อขยายรูปรอบใจกลาง รูปต้องอยู่ที่เดิมและสัดส่วนต้องคงเดิม', () => {
  const poly = {
    kind: 'polygon',
    id: 'p',
    color: '#000',
    width: 2,
    closed: true,
    fill: 'none',
    points: G.regularPolygon({ x: 500, y: 400 }, 100, 5),
  }
  const middle = G.polygonCentroid(poly.points)
  const bigger = S.scaleShape(poly, 2, middle)
  const after = G.polygonCentroid(bigger.points)

  close(after.x, middle.x, 0.0001, 'ขยายแล้วรูปวิ่งหนีไปทางแนวนอน')
  close(after.y, middle.y, 0.0001, 'ขยายแล้วรูปวิ่งหนีไปทางแนวดิ่ง')
  close(
    G.distance(bigger.points[0], bigger.points[1]) / G.distance(poly.points[0], poly.points[1]),
    2,
    0.0001,
    'ด้านไม่ได้ขยายเป็นสองเท่า',
  )
  /* มุมภายในต้องไม่เปลี่ยนเลย นี่คือสิ่งที่ทำให้การย่อขยายปลอดภัยต่อบทเรียน */
  const before = G.interiorAngles(poly.points)
  const now = G.interiorAngles(bigger.points)
  for (let i = 0; i < before.length; i += 1) {
    close(now[i], before[i], 0.0001, 'ขยายแล้วมุมภายในเปลี่ยน ซึ่งผิดหลักคณิตศาสตร์')
  }
})

check('หมุนรูปแล้วขนาดทุกอย่างต้องเท่าเดิม', () => {
  const poly = {
    kind: 'polygon',
    id: 'p',
    color: '#000',
    width: 2,
    closed: true,
    fill: 'none',
    points: G.regularPolygon({ x: 300, y: 300 }, 80, 4),
  }
  const middle = G.polygonCentroid(poly.points)
  const spun = S.rotateShape(poly, 37, middle)
  close(
    G.polygonPerimeter(spun.points),
    G.polygonPerimeter(poly.points),
    0.0001,
    'หมุนแล้วความยาวรอบรูปเปลี่ยน',
  )
  close(G.polygonCentroid(spun.points).x, middle.x, 0.0001, 'หมุนแล้วรูปเลื่อนที่')

  /* ส่วนโค้งต้องหมุนมุมเริ่มตามไปด้วย ไม่งั้นโค้งจะกระโดดไปอีกฝั่ง */
  const arc = {
    kind: 'arc',
    id: 'a',
    color: '#000',
    width: 2,
    center: { x: 0, y: 0 },
    radius: 100,
    start: 0,
    sweep: 90,
  }
  const spunArc = S.rotateShape(arc, 45, { x: 0, y: 0 })
  close(spunArc.start, 45, 0.0001, 'ส่วนโค้งไม่ได้หมุนมุมเริ่มตาม')
  close(spunArc.sweep, 90, 0.0001, 'หมุนแล้วขนาดของส่วนโค้งเปลี่ยน')
})

check('ตั้งความยาวเส้นเป็นตัวเลข ต้องได้ตรงเป๊ะและปลายข้างแรกอยู่ที่เดิม', () => {
  const line = segment('s', { x: 100, y: 100 }, { x: 220, y: 100 })
  const fixed = S.applyField(line, 'length', 4)
  close(G.distance(fixed.a, fixed.b) / G.PX_PER_CM, 4, 0.0001, 'ความยาวไม่ตรงกับที่ตั้ง')
  close(fixed.a.x, 100, 0.0001, 'ปลายข้างแรกขยับ ทั้งที่ควรยึดไว้')
  close(
    G.angleOf(fixed.a, fixed.b),
    G.angleOf(line.a, line.b),
    0.0001,
    'ตั้งความยาวแล้วทิศของเส้นเปลี่ยน',
  )

  const tilted = S.applyField(line, 'tilt', 30)
  close(G.angleOf(tilted.a, tilted.b), 30, 0.0001, 'ตั้งมุมแล้วไม่ได้ 30 องศา')
  close(
    G.distance(tilted.a, tilted.b),
    G.distance(line.a, line.b),
    0.0001,
    'ตั้งมุมแล้วความยาวเปลี่ยน',
  )
})

check('ตั้งขนาดมุมที่วัดไว้ ต้องได้องศาตามที่ขอจริง', () => {
  /* นี่คือวิธีสร้างมุม 108 องศาสำหรับห้าเหลี่ยมด้านเท่า โดยไม่ต้องกะเอา */
  const angle = {
    kind: 'angle',
    id: 'g',
    color: '#000',
    width: 2,
    vertex: { x: 0, y: 0 },
    a: { x: 100, y: 0 },
    b: { x: 70, y: -70 },
  }
  for (const want of [30, 90, 108, 170]) {
    const fixed = S.applyField(angle, 'angle', want)
    close(
      G.angleBetween(fixed.a, fixed.vertex, fixed.b),
      want,
      0.0001,
      `ตั้งมุม ${want} องศาแล้วไม่ได้ตามนั้น`,
    )
    close(
      G.distance(fixed.vertex, fixed.b),
      G.distance(angle.vertex, angle.b),
      0.0001,
      'ตั้งมุมแล้วความยาวแขนเปลี่ยน',
    )
  }
})

check('ตั้งด้านของรูปด้านเท่า และรอบรูปของรูปเบี้ยว', () => {
  const regular = {
    kind: 'polygon',
    id: 'p',
    color: '#000',
    width: 2,
    closed: true,
    fill: 'none',
    points: G.regularPolygon({ x: 400, y: 300 }, 90, 6),
  }
  const sized = S.applyField(regular, 'side', 3)
  close(
    G.distance(sized.points[0], sized.points[1]) / G.PX_PER_CM,
    3,
    0.0001,
    'ตั้งด้านละ 3 ซม. แล้วไม่ได้ 3',
  )
  assert(S.editableFields(regular)[0].key === 'side', 'รูปด้านเท่าควรให้ตั้งความยาวด้าน')

  const bent = {
    ...regular,
    id: 'q',
    points: [
      { x: 0, y: 0 },
      { x: 200, y: 20 },
      { x: 160, y: 180 },
    ],
  }
  assert(S.editableFields(bent)[0].key === 'perimeter', 'รูปด้านไม่เท่าควรให้ตั้งความยาวรอบรูป')
  const scaled = S.applyField(bent, 'perimeter', 20)
  close(
    G.polygonPerimeter(scaled.points) / G.PX_PER_CM,
    20,
    0.0001,
    'ตั้งความยาวรอบรูปแล้วไม่ตรง',
  )
})

check('ค่าที่ใส่ผิด ๆ ต้องไม่ทำให้รูปพัง', () => {
  const circle = { kind: 'circle', id: 'c', color: '#000', width: 2, center: { x: 0, y: 0 }, radius: 100 }
  assert(S.applyField(circle, 'radius', Number.NaN) === circle, 'ค่า NaN ต้องไม่ถูกนำไปใช้')
  assert(S.applyField(circle, 'ไม่มีช่องนี้', 5) === circle, 'ช่องที่ไม่รู้จักต้องไม่เปลี่ยนอะไร')
  assert(S.applyField(circle, 'radius', 0).radius > 0, 'รัศมีต้องไม่กลายเป็นศูนย์จนรูปหายไป')
})

check('ปุ่มย่อขยายต้องวางนอกตัวรูปเสมอ', () => {
  const circle = { kind: 'circle', id: 'c', color: '#000', width: 2, center: { x: 0, y: 0 }, radius: 100 }
  close(S.shapeReach(circle), 100, 0.0001, 'ระยะขอบนอกของวงกลมควรเท่ารัศมี')
  close(S.shapeReach(segment('s', { x: 0, y: 0 }, { x: 100, y: 0 })), 50, 0.0001, 'เส้นตรงควรได้ครึ่งความยาว')
  const poly = {
    kind: 'polygon',
    id: 'p',
    color: '#000',
    width: 2,
    closed: true,
    fill: 'none',
    points: G.regularPolygon({ x: 0, y: 0 }, 120, 5),
  }
  close(S.shapeReach(poly), 120, 0.0001, 'รูปหลายเหลี่ยมควรได้ระยะถึงจุดยอดที่ไกลสุด')
})

check('อุปกรณ์ย่อขยายได้ในช่วงที่อ่านค่าได้จริง', () => {
  assert(N.clampProtractorRadius(10) === N.PROTRACTOR_MIN, 'ครึ่งวงกลมเล็กเกินต้องถูกดึงกลับ')
  assert(N.clampProtractorRadius(9999) === N.PROTRACTOR_MAX, 'ครึ่งวงกลมใหญ่เกินต้องถูกดึงกลับ')
  assert(N.clampRulerLength(0) === N.RULER_MIN_CM, 'ไม้บรรทัดสั้นเกินต้องถูกดึงกลับ')
  assert(N.clampRulerLength(99) === N.RULER_MAX_CM, 'ไม้บรรทัดยาวเกินต้องถูกดึงกลับ')
  /* ความยาวไม้บรรทัดต้องเป็นครึ่งเซนติเมตรลงตัวเสมอ จะได้อ่านเป็นตัวเลขกลม ๆ */
  close(N.clampRulerLength(12.3), 12.5, 0.0001, 'ความยาวไม้บรรทัดไม่ถูกปัดเป็นครึ่งเซนติเมตร')

  /* ลากปุ่มยืดไม้บรรทัด ใช้เงาที่ตกบนแนวไม้ นิ้วที่เลื่อนออกนอกแนวจึงไม่ทำให้ยืดเกินจริง */
  const straight = N.rulerLengthFromPointer({ x: 0, y: 0 }, 0, { x: 10 * G.PX_PER_CM, y: 0 })
  close(straight, 10, 0.0001, 'ลากตรง ๆ แล้วความยาวไม่ตรง')
  const offAxis = N.rulerLengthFromPointer({ x: 0, y: 0 }, 0, { x: 10 * G.PX_PER_CM, y: 300 })
  close(offAxis, 10, 0.0001, 'นิ้วเลื่อนออกนอกแนวไม้แล้วไม้ยืดเกินจริง')

  /* ไม้บรรทัดที่หมุนไปแล้วก็ต้องยืดตามแนวของตัวเอง ไม่ใช่ตามแนวนอนของจอ */
  const turned = N.rulerLengthFromPointer({ x: 0, y: 0 }, 90, { x: 0, y: -8 * G.PX_PER_CM })
  close(turned, 8, 0.0001, 'ไม้บรรทัดที่หมุนแล้วยืดผิดแนว')
})

/* ---------------------------------------------------------------- */
/* ป้ายตัวเลขที่ลากหลบได้                                              */
/* ---------------------------------------------------------------- */

check('ป้ายลากหลบได้ แต่ต้องไม่หลุดไปไกลจนไม่รู้ว่าเป็นของใคร', () => {
  /* ใกล้ ๆ ลากได้ตามปกติ */
  const near = B_LABELS.clampLeash({ x: 20, y: -15 })
  close(near.x, 20, 0.0001, 'ป้ายที่ยังอยู่ในระยะต้องไม่ถูกดึงกลับ')
  close(near.y, -15, 0.0001, 'ป้ายที่ยังอยู่ในระยะต้องไม่ถูกดึงกลับ')

  /* ลากไกลเกิน ต้องถูกดึงกลับมาที่ปลายเชือกพอดี และยังอยู่ในทิศเดิม */
  const far = B_LABELS.clampLeash({ x: 600, y: 800 })
  close(Math.hypot(far.x, far.y), B_LABELS.LABEL_LEASH, 0.0001, 'ป้ายหลุดเชือกไปไกลเกิน')
  close(far.x / far.y, 600 / 800, 0.0001, 'ดึงกลับแล้วทิศเปลี่ยน ป้ายจะกระโดดไปอีกทาง')

  /* ไม่ขยับเลยต้องไม่ได้ NaN จากการหารด้วยศูนย์ */
  const still = B_LABELS.clampLeash({ x: 0, y: 0 })
  assert(Number.isFinite(still.x) && Number.isFinite(still.y), 'ป้ายที่ไม่ขยับทำให้ได้ NaN')
})

check('ขยับป้ายหนึ่งอัน ต้องไม่ไปแตะป้ายอื่นและไม่แก้ของเดิม', () => {
  const before = { 'a:edge:0': { x: 5, y: 5 } }
  const after = B_LABELS.moveLabel(before, 'a:edge:1', { x: 10, y: 0 })
  assert(after['a:edge:0'].x === 5, 'ป้ายอื่นถูกแก้ไปด้วย')
  assert(after['a:edge:1'].x === 10, 'ป้ายที่ขยับไม่ได้ถูกบันทึก')
  assert(before['a:edge:1'] === undefined, 'ตารางเดิมถูกแก้ ซึ่งทำให้ React ไม่วาดใหม่')

  /* ขยับไกลเกินต้องถูกล่ามไว้เหมือนกัน */
  const leashed = B_LABELS.moveLabel({}, 'k', { x: 999, y: 0 })
  close(leashed.k.x, B_LABELS.LABEL_LEASH, 0.0001, 'ขยับผ่าน moveLabel แล้วไม่ถูกล่าม')
})

check('ชื่อป้ายต้องไม่ซ้ำกันข้ามรูป ข้ามชนิด และข้ามด้าน', () => {
  const names = new Set()
  for (const shapeId of ['s1', 's2']) {
    for (const role of ['edge', 'angle', 'len']) {
      for (let index = 0; index < 3; index += 1) {
        const key = B_LABELS.labelKey(shapeId, role, index)
        assert(!names.has(key), `ชื่อป้าย ${key} ซ้ำ`)
        names.add(key)
      }
    }
  }
  assert(names.size === 18, 'จำนวนชื่อป้ายไม่ครบ')
  assert(B_LABELS.offsetOf({}, 'ยังไม่เคยขยับ').x === 0, 'ป้ายที่ยังไม่เคยขยับต้องอยู่ที่เดิม')
})

check('ป้ายความยาวด้านต้องออกไปอยู่นอกรูป ไม่ทับเส้น', () => {
  /*
   * นี่คือครึ่งหนึ่งของการแก้ปัญหาป้ายบังเส้น อีกครึ่งคือการลากเอง
   * ถ้าค่าเริ่มต้นวางดีอยู่แล้ว เด็กส่วนใหญ่จะไม่ต้องลากเลย
   */
  const square = [
    { x: 0, y: 0 },
    { x: 100, y: 0 },
    { x: 100, y: 100 },
    { x: 0, y: 100 },
  ]
  const middle = G.polygonCentroid(square)
  for (let i = 0; i < square.length; i += 1) {
    const a = square[i]
    const b = square[(i + 1) % square.length]
    const anchor = B_LABELS.edgeLabelAnchor(a, b, middle)
    const onEdge = G.distanceToSegment(anchor, a, b)
    assert(onEdge > 10, `ป้ายของด้านที่ ${i} ยังทับเส้นอยู่ (ห่างแค่ ${onEdge.toFixed(1)})`)
    assert(
      G.distance(anchor, middle) > G.distance(G.midpoint(a, b), middle),
      `ป้ายของด้านที่ ${i} เลื่อนเข้าข้างในรูปแทนที่จะออกข้างนอก`,
    )
  }

  /* เส้นเดี่ยวไม่มีข้างในข้างนอก ป้ายต้องเลื่อนขึ้นด้านบนของจอ */
  const lone = B_LABELS.edgeLabelAnchor({ x: 0, y: 0 }, { x: 100, y: 0 }, null)
  assert(lone.y < 0, 'ป้ายของเส้นเดี่ยวควรอยู่เหนือเส้น')
  close(lone.x, 50, 0.0001, 'ป้ายของเส้นเดี่ยวควรอยู่กลางเส้น')

  /* จุดสองจุดซ้อนกันต้องไม่ทำให้ได้ NaN */
  const degenerate = B_LABELS.edgeLabelAnchor({ x: 5, y: 5 }, { x: 5, y: 5 }, null)
  assert(Number.isFinite(degenerate.x) && Number.isFinite(degenerate.y), 'เส้นยาวศูนย์ทำให้ป้ายพัง')
})

check('เส้นประจะขึ้นก็ต่อเมื่อป้ายถูกลากออกมาจริง', () => {
  assert(!B_LABELS.isMoved({ x: 0, y: 0 }), 'ป้ายที่อยู่ที่เดิมไม่ควรมีเส้นประ')
  assert(!B_LABELS.isMoved({ x: 3, y: 2 }), 'ขยับนิดเดียวไม่ควรมีเส้นประ')
  assert(B_LABELS.isMoved({ x: 30, y: 0 }), 'ป้ายที่ลากออกมาไกลต้องมีเส้นประบอกที่มา')
})

/* ---------------------------------------------------------------- */
/* ของน่ารัก สติกเกอร์ หน้าตา และประกาย                                 */
/* ---------------------------------------------------------------- */

check('จุดศูนย์ถ่วงต้องอยู่ในรูปจริง ไม่ใช่ค่าเฉลี่ยของจุดยอด', () => {
  const square = [
    { x: 0, y: 0 },
    { x: 100, y: 0 },
    { x: 100, y: 100 },
    { x: 0, y: 100 },
  ]
  const middle = G.polygonCentroid(square)
  close(middle.x, 50, 0.0001, 'จุดศูนย์ถ่วงของจัตุรัสผิด')
  close(middle.y, 50, 0.0001, 'จุดศูนย์ถ่วงของจัตุรัสผิด')

  /* สามเหลี่ยมมุมฉาก จุดศูนย์ถ่วงอยู่ที่หนึ่งในสามของแต่ละด้าน */
  const triangle = G.polygonCentroid([
    { x: 0, y: 0 },
    { x: 120, y: 0 },
    { x: 0, y: 90 },
  ])
  close(triangle.x, 40, 0.0001, 'จุดศูนย์ถ่วงของสามเหลี่ยมผิด')
  close(triangle.y, 30, 0.0001, 'จุดศูนย์ถ่วงของสามเหลี่ยมผิด')

  /* จุดยอดเรียงเป็นเส้นตรง พื้นที่เป็นศูนย์ ต้องไม่ได้ NaN หรือค่าอนันต์ */
  const flat = G.polygonCentroid([
    { x: 0, y: 0 },
    { x: 10, y: 0 },
    { x: 20, y: 0 },
  ])
  assert(Number.isFinite(flat.x) && Number.isFinite(flat.y), 'รูปแบนทำให้จุดศูนย์ถ่วงพัง')
})

check('หน้าตาการ์ตูนต้องใส่เฉพาะรูปปิดที่ใหญ่พอ และต้องไม่ล้นออกนอกรูป', () => {
  const big = {
    kind: 'polygon',
    id: 'p',
    color: '#000',
    width: 2,
    closed: true,
    fill: 'none',
    points: G.regularPolygon({ x: 500, y: 400 }, 150, 5),
  }
  const face = S.faceOf(big)
  assert(face !== null, 'ห้าเหลี่ยมใหญ่ควรมีหน้า')
  assert(
    face.size <= G.nearestVertexDistance(face.center, big.points) + 0.0001,
    'หน้าถูกวางใหญ่เกินจนล้นออกนอกรูป',
  )

  /* รูปเล็กเกินไป หน้าจะกลายเป็นจุดมั่ว ๆ ที่บังป้ายบอกมุม */
  const small = { ...big, points: G.regularPolygon({ x: 100, y: 100 }, 20, 5) }
  assert(S.faceOf(small) === null, 'รูปเล็กต้องไม่มีหน้า')

  /* รูปที่ยังไม่ปิด ยังไม่ใช่รูป จึงยังไม่มีหน้า */
  assert(S.faceOf({ ...big, closed: false }) === null, 'รูปที่ยังไม่ปิดต้องไม่มีหน้า')

  assert(
    S.faceOf(segment('s', { x: 0, y: 0 }, { x: 300, y: 0 })) === null,
    'เส้นตรงต้องไม่มีหน้า',
  )

  /* วงกลมใหญ่มีหน้าได้ วงกลมจิ๋วไม่มี */
  const circle = { kind: 'circle', id: 'c', color: '#000', width: 2, center: { x: 0, y: 0 }, radius: 120 }
  assert(S.faceOf(circle) !== null, 'วงกลมใหญ่ควรมีหน้า')
  assert(S.faceOf({ ...circle, radius: 10 }) === null, 'วงกลมจิ๋วต้องไม่มีหน้า')
})

check('ใจกลางของรูปต้องหาได้ทุกชนิด ไว้ใช้เป็นจุดโปรยประกาย', () => {
  const middle = S.shapeCenter(segment('s', { x: 0, y: 0 }, { x: 100, y: 40 }))
  close(middle.x, 50, 0.0001, 'ใจกลางเส้นตรงผิด')
  close(middle.y, 20, 0.0001, 'ใจกลางเส้นตรงผิด')

  const arcCenter = S.shapeCenter({
    kind: 'arc',
    id: 'a',
    color: '#000',
    width: 2,
    center: { x: 7, y: 9 },
    radius: 50,
    start: 0,
    sweep: 90,
  })
  close(arcCenter.x, 7, 0.0001, 'ใจกลางส่วนโค้งควรเป็นจุดที่ปักเข็ม')

  const stickerCenter = S.shapeCenter({
    kind: 'sticker',
    id: 'k',
    color: '#000',
    width: 2,
    at: { x: 11, y: 22 },
    emoji: '⭐',
    size: 46,
  })
  close(stickerCenter.y, 22, 0.0001, 'ใจกลางสติกเกอร์ผิด')
})

check('สติกเกอร์ต้องจิ้มโดน ย้ายได้ แต่ต้องไม่ดูดปลายเส้น', () => {
  const sticker = {
    kind: 'sticker',
    id: 'k',
    color: '#000',
    width: 2,
    at: { x: 100, y: 100 },
    emoji: '⭐',
    size: 46,
  }
  assert(S.hitTest(sticker, { x: 110, y: 105 }), 'จิ้มกลางสติกเกอร์แล้วไม่โดน')
  assert(!S.hitTest(sticker, { x: 200, y: 200 }), 'จิ้มไกลแล้วยังโดน')

  const moved = S.translateShape(sticker, 10, -10)
  assert(moved.at.x === 110 && moved.at.y === 90, 'ย้ายสติกเกอร์แล้วตำแหน่งผิด')

  /*
   * สติกเกอร์เป็นของตกแต่ง ถ้ามันดูดปลายเส้น เด็กที่แปะดาวไว้ใกล้จุดยอด
   * จะลากเส้นไปชนดาวแทนที่จะชนจุดยอด แล้วรูปจะเพี้ยนโดยไม่รู้สาเหตุ
   */
  assert(S.shapeAnchors(sticker).length === 0, 'สติกเกอร์ต้องไม่เป็นเป้าให้ปลายเส้นมาชน')
  assert(S.nearestSnapPoint([sticker], { x: 101, y: 101 }, 16) === null, 'สติกเกอร์ไม่ควรถูกดูด')
})

check('คำเชียร์ต้องมาเป็นหมุด ไม่ใช่ทุกครั้งที่วาด', () => {
  assert(C.encouragementFor(1) !== null, 'รูปแรกควรมีคำเชียร์')
  assert(C.encouragementFor(2) === null, 'รูปที่สองไม่ควรมีคำเชียร์ ไม่งั้นจะกลายเป็นเสียงรบกวน')
  assert(C.encouragementFor(10) !== null, 'ครบสิบรูปควรมีคำเชียร์')
  assert(C.encouragementFor(137) === null, 'จำนวนที่ไม่ใช่หมุดต้องเงียบ')
})

check('ธีมกระดาษต้องครบและไม่ซ้ำรหัส', () => {
  assert(C.PAPER_THEMES.length >= 3, 'ธีมน้อยเกินไป')
  const ids = new Set()
  for (const theme of C.PAPER_THEMES) {
    assert(!ids.has(theme.id), `รหัสธีม ${theme.id} ซ้ำ`)
    ids.add(theme.id)
    assert(/^#[0-9a-f]{6}$/i.test(theme.paper), `ธีม ${theme.id} สีกระดาษไม่ใช่รหัสสีที่ใช้ได้`)
    assert(theme.label.length > 0, `ธีม ${theme.id} ไม่มีชื่อ`)
  }
  assert(C.findTheme('ไม่มีธีมนี้').id === C.PAPER_THEMES[0].id, 'ธีมที่ไม่รู้จักควรได้ธีมแรก')
  assert(C.STICKERS.length >= 6, 'สติกเกอร์น้อยเกินไป')
})

check('ประกายต้องกระจายรอบทิศและไม่อยู่ห่างเท่ากันหมด', () => {
  const offsets = C.sparkleOffsets(6, 40)
  assert(offsets.length === 6, 'จำนวนประกายผิด')
  const spans = offsets.map((offset) => Math.hypot(offset.x, offset.y))
  assert(Math.max(...spans) <= 40.0001, 'ประกายกระเด็นไกลเกินที่กำหนด')
  assert(
    new Set(spans.map((value) => value.toFixed(3))).size > 1,
    'ประกายอยู่ห่างเท่ากันหมด จะดูเหมือนวงกลมจุดไข่ปลา ไม่ใช่ประกาย',
  )
  /* กระจายทั้งซ้ายขวาบนล่าง ไม่ใช่กองอยู่ข้างเดียว */
  assert(offsets.some((o) => o.x > 1) && offsets.some((o) => o.x < -1), 'ประกายไม่กระจายซ้ายขวา')
  assert(offsets.some((o) => o.y > 1) && offsets.some((o) => o.y < -1), 'ประกายไม่กระจายบนล่าง')
})

/* ---------------------------------------------------------------- */
/* ซูมและการเลื่อนกระดาษ                                              */
/* ---------------------------------------------------------------- */

const PAPER_W = 1000
const PAPER_H = 680

check('ซูมแล้วจุดที่เล็งอยู่ต้องอยู่ที่เดิม', () => {
  /*
   * ข้อนี้คือหัวใจของการซูม ถ้าจุดที่เล็งไว้ขยับ เด็กจะหาสิ่งที่กำลังดูอยู่ไม่เจอ
   * ทุกครั้งที่ซูม ซึ่งแย่กว่าการไม่มีปุ่มซูมเสียอีก
   */
  const focus = { x: 700, y: 200 }
  let view = W.DEFAULT_VIEW
  /* หาว่าจุดนี้อยู่ตรงสัดส่วนไหนของจอก่อนซูม */
  const before = { x: (focus.x - view.x) / PAPER_W, y: (focus.y - view.y) / PAPER_H }

  view = W.zoomAt(view, 2, focus, PAPER_W, PAPER_H)
  const size = W.visibleSize(view, PAPER_W, PAPER_H)
  const after = { x: (focus.x - view.x) / size.width, y: (focus.y - view.y) / size.height }

  close(after.x, before.x, 0.0001, 'จุดที่เล็งไว้เลื่อนไปทางแนวนอน')
  close(after.y, before.y, 0.0001, 'จุดที่เล็งไว้เลื่อนไปทางแนวดิ่ง')
  close(view.scale, 2, 0.0001, 'กำลังขยายไม่ตรง')
})

check('ซูมต้องไม่เกินขอบเขตที่ตั้งไว้', () => {
  let view = W.DEFAULT_VIEW
  for (let i = 0; i < 20; i += 1) view = W.zoomAt(view, 2, { x: 500, y: 340 }, PAPER_W, PAPER_H)
  close(view.scale, W.MAX_SCALE, 0.0001, 'ขยายเกินเพดาน')

  for (let i = 0; i < 40; i += 1) view = W.zoomAt(view, 0.5, { x: 500, y: 340 }, PAPER_W, PAPER_H)
  close(view.scale, W.MIN_SCALE, 0.0001, 'ย่อเกินพื้น')
})

check('ย่อจนกระดาษเล็กกว่าจอ ต้องจัดกึ่งกลางให้เอง', () => {
  /* กระดาษที่ลอยไปอยู่มุมจอ เป็นสิ่งที่เด็กแก้กลับเองไม่ได้ */
  const view = W.clampView({ scale: 0.5, x: 900, y: -900 }, PAPER_W, PAPER_H)
  close(view.x, (PAPER_W - PAPER_W / 0.5) / 2, 0.0001, 'ไม่ได้จัดกึ่งกลางแนวนอน')
  close(view.y, (PAPER_H - PAPER_H / 0.5) / 2, 0.0001, 'ไม่ได้จัดกึ่งกลางแนวดิ่ง')
})

check('เลื่อนกระดาษต้องไม่หลุดไปจนมองไม่เห็นกระดาษ', () => {
  let view = { scale: 2, x: 250, y: 170 }
  view = W.panBy(view, 100000, 100000, PAPER_W, PAPER_H)
  const size = W.visibleSize(view, PAPER_W, PAPER_H)
  assert(view.x <= PAPER_W - size.width + W.PAN_MARGIN + 0.001, 'เลื่อนเลยขอบขวาไปไกลเกิน')
  assert(view.y <= PAPER_H - size.height + W.PAN_MARGIN + 0.001, 'เลื่อนเลยขอบล่างไปไกลเกิน')

  view = W.panBy(view, -100000, -100000, PAPER_W, PAPER_H)
  assert(view.x >= -W.PAN_MARGIN - 0.001, 'เลื่อนเลยขอบซ้ายไปไกลเกิน')
  assert(view.y >= -W.PAN_MARGIN - 0.001, 'เลื่อนเลยขอบบนไปไกลเกิน')
})

check('แปลงตำแหน่งบนจอเป็นพิกัดกระดาษ ต้องตรงกับ viewBox ที่ใช้วาดจริง', () => {
  const view = W.zoomAt(W.DEFAULT_VIEW, 2, { x: 500, y: 340 }, PAPER_W, PAPER_H)
  const box = W.viewBoxOf(view, PAPER_W, PAPER_H).split(' ').map(Number)

  /* มุมบนซ้ายของจอ คือมุมบนซ้ายของ viewBox */
  const topLeft = W.screenToPaper(view, 0, 0, PAPER_W, PAPER_H)
  close(topLeft.x, box[0], 0.01, 'มุมบนซ้ายไม่ตรงกับ viewBox')
  close(topLeft.y, box[1], 0.01, 'มุมบนซ้ายไม่ตรงกับ viewBox')

  /* มุมล่างขวาของจอ คือมุมบนซ้ายบวกขนาดของ viewBox */
  const bottomRight = W.screenToPaper(view, 1, 1, PAPER_W, PAPER_H)
  close(bottomRight.x, box[0] + box[2], 0.01, 'มุมล่างขวาไม่ตรงกับ viewBox')
  close(bottomRight.y, box[1] + box[3], 0.01, 'มุมล่างขวาไม่ตรงกับ viewBox')
})

check('หนีบสองนิ้วแล้ว จุดกึ่งกลางนิ้วต้องยังเป็นจุดเดิมบนกระดาษ', () => {
  /* จำลองการหนีบ จุดกระดาษที่อยู่ใต้กึ่งกลางนิ้วตอนเริ่ม ต้องตามนิ้วไปเสมอ */
  const held = { x: 620, y: 240 }
  const view = W.viewPlacing(2.5, held, 0.3, 0.7, PAPER_W, PAPER_H)
  const size = W.visibleSize(view, PAPER_W, PAPER_H)
  close(view.x + 0.3 * size.width, held.x, 0.0001, 'จุดที่หนีบไว้เลื่อนไปทางแนวนอน')
  close(view.y + 0.7 * size.height, held.y, 0.0001, 'จุดที่หนีบไว้เลื่อนไปทางแนวดิ่ง')
})

check('ป้ายเปอร์เซ็นต์ต้องอ่านง่าย', () => {
  assert(W.zoomLabel({ scale: 1, x: 0, y: 0 }) === '100%', 'ขนาดปกติต้องเป็น 100%')
  assert(W.zoomLabel({ scale: 2.5, x: 0, y: 0 }) === '250%', 'สองเท่าครึ่งต้องเป็น 250%')
  assert(W.zoomLabel({ scale: 0.5, x: 0, y: 0 }) === '50%', 'ครึ่งหนึ่งต้องเป็น 50%')
})

/* ---------------------------------------------------------------- */
/* ปากกา นิ้ว และฝ่ามือ                                               */
/* ---------------------------------------------------------------- */

check('ฝ่ามือที่วางบนจอระหว่างเขียนด้วยปากกา ต้องไม่กลายเป็นเส้น', () => {
  let gate = I.EMPTY_GATE
  /* ปากกาแตะจอที่เวลา 1000 */
  gate = I.beginPointer(gate, 1, 'pen', 1000)
  assert(gate.penSeen, 'ควรจำได้ว่าเห็นปากกาแล้ว')

  /* ฝ่ามือแตะตามมาทันที ต้องถูกทิ้ง */
  assert(I.shouldIgnorePointer(gate, 2, 'touch', 1010), 'ฝ่ามือแตะตอนปากกาลงจอ ต้องถูกทิ้ง')

  /* ยกปากกาแล้ว แต่ยังอยู่ในช่วงกัน ฝ่ามือก็ยังต้องถูกทิ้ง */
  gate = I.endPointer(gate, 1)
  assert(
    I.shouldIgnorePointer(gate, 2, 'touch', 1000 + I.PEN_GUARD_MS - 1),
    'ยกปากกาแป๊บเดียวแล้วฝ่ามือแตะ ยังต้องถูกทิ้ง',
  )

  /* พ้นช่วงกันแล้ว เด็กที่เปลี่ยนมาใช้นิ้วต้องวาดได้ตามปกติ */
  assert(
    !I.shouldIgnorePointer(gate, 2, 'touch', 1000 + I.PEN_GUARD_MS + 1),
    'พ้นช่วงกันแล้วนิ้วต้องวาดได้ ไม่งั้นจอจะเหมือนค้าง',
  )
})

check('กำลังลากอยู่ด้วยอะไร นิ้วที่แตะเพิ่มต้องไม่แย่งงาน', () => {
  let gate = I.beginPointer(I.EMPTY_GATE, 7, 'touch', 500)
  assert(I.shouldIgnorePointer(gate, 8, 'touch', 520), 'นิ้วที่สองต้องไม่แย่งเส้นที่กำลังลากอยู่')
  assert(!I.shouldIgnorePointer(gate, 7, 'touch', 520), 'นิ้วที่กำลังลากอยู่ต้องทำงานต่อได้')

  /* ปล่อยมือแล้วต้องคืนสิทธิ์ ไม่งั้นจะวาดอะไรไม่ได้อีกเลย */
  gate = I.endPointer(gate, 7)
  assert(!I.shouldIgnorePointer(gate, 8, 'touch', 540), 'ปล่อยมือแล้วนิ้วอื่นต้องวาดได้')

  /* ปล่อยรหัสที่ไม่ได้ถืออยู่ ต้องไม่ไปคืนสิทธิ์ของตัวที่กำลังลาก */
  let busy = I.beginPointer(I.EMPTY_GATE, 3, 'mouse', 100)
  busy = I.endPointer(busy, 99)
  assert(busy.activeId === 3, 'การปล่อยของตัวอื่นต้องไม่ทำให้ตัวที่ลากอยู่หลุดสิทธิ์')
})

check('เมาส์กับปากกาต้องใช้ได้ตามปกติ ไม่มีการกันใคร', () => {
  const gate = I.EMPTY_GATE
  assert(!I.shouldIgnorePointer(gate, 1, 'mouse', 0), 'เมาส์ต้องใช้ได้ตั้งแต่แรก')
  assert(!I.shouldIgnorePointer(gate, 1, 'pen', 0), 'ปากกาต้องใช้ได้ตั้งแต่แรก')
  assert(!I.shouldIgnorePointer(gate, 1, 'touch', 0), 'นิ้วต้องใช้ได้เมื่อยังไม่เคยเห็นปากกา')
  /* เมาส์ไม่ควรไปตั้งเวลากันฝ่ามือ ไม่งั้นห้องที่ใช้เมาส์จะกันนิ้วทิ้งโดยไม่มีเหตุผล */
  assert(I.noteInput(gate, 'mouse', 9999).lastPenAt === 0, 'เมาส์ต้องไม่ทำให้เข้าโหมดกันฝ่ามือ')
  assert(I.noteInput(gate, 'pen', 9999).lastPenAt === 9999, 'ปากกาต้องอัปเดตเวลาที่เห็นล่าสุด')
})

check('แยกการจิ้มออกจากการลาก ต้องเผื่อนิ้วที่ขยับนิดหน่อย', () => {
  /*
   * นิ้วเด็กไม่เคยอยู่นิ่งสนิท ถ้าตัดสินที่ศูนย์พิกเซล
   * จะไม่มีการจิ้มเกิดขึ้นเลยสักครั้งบนแท็บเล็ต แล้วกล่องถามจะไม่มีวันขึ้น
   */
  assert(I.isTap(0, 1), 'กดแล้วปล่อยที่เดิมต้องนับเป็นการจิ้ม')
  assert(I.isTap(6, 1), 'ขยับหกพิกเซลยังต้องนับเป็นการจิ้ม')
  assert(!I.isTap(40, 1), 'ลากไปสี่สิบพิกเซลต้องไม่ใช่การจิ้ม')

  /*
   * ระยะที่รับได้คิดเป็นพิกเซลบนจอ ตอนซูมเข้าสี่เท่า
   * การขยับนิ้วเท่าเดิมจะกินระยะบนกระดาษน้อยลงสี่เท่า
   */
  assert(I.isTap(2, 4), 'ตอนซูมเข้า การขยับนิ้วนิดเดียวยังต้องเป็นการจิ้ม')
  assert(!I.isTap(6, 4), 'ตอนซูมเข้าสี่เท่า ระยะหกหน่วยบนกระดาษคือลากจริง')
  assert(I.isTap(16, 0.5), 'ตอนย่อจอ ระยะบนกระดาษที่มากขึ้นยังเป็นการจิ้มได้')
})

check('ปลายยางลบของปากกา ต้องรู้จักเฉพาะตอนเป็นปากกาจริง', () => {
  assert(I.isEraserTip('pen', 32), 'พลิกปากกาใช้ด้านยางลบต้องถูกจับได้')
  assert(!I.isEraserTip('pen', 1), 'ปากกาปลายปกติต้องไม่ถูกนับเป็นยางลบ')
  assert(!I.isEraserTip('mouse', 32), 'ปุ่มกลางของเมาส์ต้องไม่ถูกนับเป็นยางลบ')
  assert(I.pointerKind('pen') === 'pen', 'อ่านชนิดปากกาผิด')
  assert(I.pointerKind('touch') === 'touch', 'อ่านชนิดนิ้วผิด')
  assert(I.pointerKind('') === 'mouse', 'ค่าที่ไม่รู้จักควรถือเป็นเมาส์')
})

check('ตัวอักษรกำกับจุดต้องไม่ซ้ำกัน', () => {
  const labels = new Set()
  for (let index = 0; index < 60; index += 1) {
    const label = G.pointLabel(index)
    assert(!labels.has(label), `ตัวอักษร ${label} ซ้ำที่จุดที่ ${index}`)
    labels.add(label)
  }
})

check('ถังสีต้องระบายได้เฉพาะรูปที่ปิดแล้ว', () => {
  const square = {
    id: 'sq',
    kind: 'polygon',
    color: '#000',
    width: 3,
    closed: true,
    fill: 'none',
    points: [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 100 },
      { x: 0, y: 100 },
    ],
  }
  const open = { ...square, id: 'open', closed: false }
  const line = { id: 'ln', kind: 'segment', color: '#000', width: 3, a: { x: 0, y: 0 }, b: { x: 50, y: 0 } }
  const circle = { id: 'ci', kind: 'circle', color: '#000', width: 3, center: { x: 300, y: 300 }, radius: 60, fill: 'none' }

  assert(P.canFill(square), 'สี่เหลี่ยมที่ปิดแล้วต้องระบายได้')
  assert(P.canFill(circle), 'วงกลมต้องระบายได้')
  assert(!P.canFill(open), 'รูปที่ยังไม่ปิดต้องระบายไม่ได้ เพราะสีจะรั่วออกนอกรูป')
  assert(!P.canFill(line), 'เส้นตรงไม่มีข้างในให้ระบาย')

  const painted = P.paintShape(square, '#bbf7d0')
  assert(painted.fill === '#bbf7d0', 'ระบายแล้วสีไม่เปลี่ยน')
  assert(square.fill === 'none', 'รูปเดิมต้องไม่ถูกแก้ ไม่งั้นปุ่มย้อนกลับจะย้อนไม่ได้')
  assert(P.paintShape(line, '#bbf7d0') === line, 'รูปที่ระบายไม่ได้ต้องคืนตัวเดิมไปเลย')
  assert(P.paintShape(painted, P.NO_FILL).fill === 'none', 'ลบสีออกแล้วต้องกลับเป็นไม่ระบาย')
  assert(P.fillOf(painted) === '#bbf7d0', 'อ่านสีที่ระบายอยู่ผิด')
  assert(P.fillOf(line) === P.NO_FILL, 'รูปที่ระบายไม่ได้ต้องถือว่าไม่มีสี')
})

check('จิ้มระบายต้องโดนข้างในรูป ไม่ใช่แค่ใกล้เส้น', () => {
  const square = {
    id: 'sq',
    kind: 'polygon',
    color: '#000',
    width: 3,
    closed: true,
    fill: 'none',
    points: [
      { x: 0, y: 0 },
      { x: 200, y: 0 },
      { x: 200, y: 200 },
      { x: 0, y: 200 },
    ],
  }
  assert(P.findFillTarget([square], { x: 100, y: 100 }) === square, 'จิ้มกลางรูปต้องโดน')
  assert(P.findFillTarget([square], { x: 260, y: 100 }) === null, 'จิ้มนอกรูปต้องไม่โดนอะไรเลย')

  const circle = { id: 'ci', kind: 'circle', color: '#000', width: 3, center: { x: 0, y: 0 }, radius: 50, fill: 'none' }
  assert(P.findFillTarget([circle], { x: 30, y: 30 }) === circle, 'จิ้มในวงกลมต้องโดน')
  assert(P.findFillTarget([circle], { x: 45, y: 45 }) === null, 'จิ้มนอกวงกลมแต่ในกรอบสี่เหลี่ยมต้องไม่โดน')
})

check('รูปซ้อนกัน ถังสีต้องเทลงช่องเล็กที่สุด', () => {
  /*
   * นี่คือกรณีที่ครูใช้จริง แบ่งสี่เหลี่ยมเป็นสามเหลี่ยมสองรูปแล้วระบายคนละสี
   * เพื่อให้เห็นว่าผลรวมมุมภายในของสี่เหลี่ยมคือสองเท่าของสามเหลี่ยม
   * ถ้าถังสีเลือกรูปบนสุดแบบเครื่องมืออื่น จิ้มสามเหลี่ยมแล้วสี่เหลี่ยมจะเปลี่ยนสีแทน
   */
  const outer = {
    id: 'outer',
    kind: 'polygon',
    color: '#000',
    width: 3,
    closed: true,
    fill: 'none',
    points: [
      { x: 0, y: 0 },
      { x: 200, y: 0 },
      { x: 200, y: 200 },
      { x: 0, y: 200 },
    ],
  }
  const inner = {
    ...outer,
    id: 'inner',
    points: [
      { x: 0, y: 0 },
      { x: 200, y: 0 },
      { x: 0, y: 200 },
    ],
  }
  /* สามเหลี่ยมวาดก่อน สี่เหลี่ยมวาดทีหลังจึงอยู่บนสุด */
  const board = [inner, outer]
  const picked = P.findFillTarget(board, { x: 40, y: 40 })
  assert(picked === inner, 'จิ้มในสามเหลี่ยมต้องได้สามเหลี่ยม ไม่ใช่สี่เหลี่ยมที่ครอบอยู่')
  assert(
    P.findFillTarget(board, { x: 170, y: 170 }) === outer,
    'จิ้มในส่วนที่มีแต่สี่เหลี่ยมต้องได้สี่เหลี่ยม',
  )
})

check('ชื่อสีระบายต้องพูดกับเด็กได้', () => {
  assert(P.FILL_COLORS.length >= 4, 'สีระบายน้อยเกินไป')
  for (const choice of P.FILL_COLORS) {
    assert(/^#[0-9a-f]{6}$/i.test(choice.value), `สี ${choice.value} ไม่ใช่รหัสสีที่ถูกต้อง`)
    assert(choice.label.length > 0, 'สีระบายต้องมีชื่อภาษาไทย')
    assert(P.fillName(choice.value) === choice.label, 'เรียกชื่อสีผิด')
  }
  const values = new Set(P.FILL_COLORS.map((choice) => choice.value))
  assert(values.size === P.FILL_COLORS.length, 'มีสีระบายซ้ำกันในจาน')
  assert(P.fillName(P.NO_FILL).length > 0, 'ปุ่มลบสีต้องมีคำอธิบาย')
})

check('งานที่ระบายสีไว้ต้องยังอยู่หลังรีเฟรช', () => {
  const shapes = [
    {
      id: 'sq',
      kind: 'polygon',
      color: '#ec4899',
      width: 3,
      closed: true,
      fill: '#bbf7d0',
      points: [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 100, y: 100 },
      ],
    },
    {
      id: 'ci',
      kind: 'circle',
      color: '#ec4899',
      width: 3,
      center: { x: 300, y: 300 },
      radius: 60,
      fill: '#fef08a',
    },
  ]
  const back = D.decodeBoard(D.encodeBoard(shapes, {}, SAMPLE_PREFS))
  assert(back !== null, 'อ่านงานที่บันทึกไว้ไม่ได้')
  assert(back.shapes[0].fill === '#bbf7d0', 'สีที่ระบายในรูปหลายเหลี่ยมหายไปหลังรีเฟรช')
  assert(back.shapes[1].fill === '#fef08a', 'สีที่ระบายในวงกลมหายไปหลังรีเฟรช')
})

check('โจทย์ฝึกวัดมุมต้องอยู่ในช่วงของระดับ และวางบนกระดาษเสมอ', () => {
  /* ตัวสุ่มปลอมที่ไล่ค่าตั้งแต่ 0 ถึงเกือบ 1 เพื่อกวาดให้ครบทุกมุมที่เป็นไปได้ */
  for (const level of Q.PRACTICE_LEVELS) {
    for (let i = 0; i < 200; i += 1) {
      const feed = [i / 200, ((i * 7) % 200) / 200, ((i * 13) % 200) / 200, ((i * 29) % 200) / 200]
      let at = 0
      const question = Q.makeQuestion(level, () => feed[at++ % feed.length])

      assert(
        question.answer >= level.min && question.answer <= level.max,
        `ระดับ ${level.id} ได้คำตอบ ${question.answer} ซึ่งหลุดช่วง`,
      )
      assert(
        (question.answer - level.min) % level.step === 0,
        `ระดับ ${level.id} ได้คำตอบ ${question.answer} ซึ่งไม่ใช่จำนวนเท่าของ ${level.step}`,
      )

      const ends = Q.armEnds(question)
      /* มุมที่วัดจากปลายแขนจริงต้องเท่ากับคำตอบ ไม่งั้นเฉลยจะไม่ตรงกับรูปที่เด็กเห็น */
      close(G.angleBetween(ends.a, question.vertex, ends.b), question.answer, 0.0001, 'มุมในรูปไม่ตรงกับเฉลย')
      close(G.distance(question.vertex, ends.a), Q.ARM_LENGTH, 0.0001, 'แขนข้างแรกยาวผิด')
      close(G.distance(question.vertex, ends.b), Q.ARM_LENGTH, 0.0001, 'แขนข้างที่สองยาวผิด')

      for (const point of [ends.a, ends.b, question.vertex]) {
        assert(
          point.x > 0 && point.x < 1000 && point.y > 0 && point.y < 680,
          `โจทย์หลุดออกนอกกระดาษที่ (${Math.round(point.x)}, ${Math.round(point.y)})`,
        )
      }
    }
  }
})

check('ตรวจคำตอบต้องแยก "ถูก" กับ "อ่านสลับแถว" ออกจากกัน', () => {
  const level = Q.findLevel('medium')
  const question = { vertex: { x: 300, y: 400 }, start: 0, answer: 130, arm: Q.ARM_LENGTH }

  assert(Q.judgeAnswer(question, 130, level).verdict === 'correct', 'ตอบตรงเป๊ะต้องถูก')
  assert(Q.judgeAnswer(question, 132, level).verdict === 'correct', 'คลาดสององศายังต้องถือว่าถูก')

  /*
   * 180 − 130 = 50 คือเลขที่เด็กอ่านได้เมื่อดูผิดแถวของครึ่งวงกลม
   * ต้องบอกให้ตรงจุด ไม่ใช่บอกแค่ว่าผิด ไม่งั้นเด็กจะวัดผิดแบบเดิมทั้งคาบ
   */
  const flipped = Q.judgeAnswer(question, 50, level)
  assert(flipped.verdict === 'flipped', 'ต้องจับได้ว่าอ่านสลับแถว')
  assert(flipped.say.includes('130'), 'ตอนบอกว่าอ่านสลับแถวต้องบอกคำตอบจริงด้วย')

  assert(Q.judgeAnswer(question, 138, level).verdict === 'close', 'ห่างแปดองศาควรเป็น "เกือบแล้ว"')
  assert(Q.judgeAnswer(question, 20, level).verdict === 'wrong', 'ห่างเกินร้อยองศาต้องเป็นผิด')
})

check('มุมฉากต้องนับว่าถูก ไม่ใช่ว่าอ่านสลับแถว', () => {
  /*
   * กรณีนี้คือเหตุผลที่ลำดับการตรวจต้องเช็ก "ถูก" ก่อนเสมอ
   * เพราะ 180 − 90 ก็คือ 90 เท่ากัน ถ้าเช็กสลับลำดับ เด็กที่ตอบถูกเป๊ะจะโดนบอกว่าอ่านผิด
   */
  const level = Q.findLevel('easy')
  const question = { vertex: { x: 300, y: 400 }, start: 0, answer: 90, arm: Q.ARM_LENGTH }
  assert(Q.judgeAnswer(question, 90, level).verdict === 'correct', 'ตอบ 90 องศาต้องถูก')
  assert(Q.judgeAnswer(question, 92, level).verdict === 'correct', 'ตอบ 92 องศายังอยู่ในเกณฑ์')
})

check('ตอบผิดต้องได้คำใบ้ชนิดของมุม และสถิติต้องเริ่มนับใหม่', () => {
  assert(Q.angleFamily(45) === 'มุมแหลม', 'สี่สิบห้าองศาคือมุมแหลม')
  assert(Q.angleFamily(90) === 'มุมฉาก', 'เก้าสิบองศาคือมุมฉาก')
  assert(Q.angleFamily(120) === 'มุมป้าน', 'ร้อยยี่สิบองศาคือมุมป้าน')

  assert(Q.nextStreak(4, 'correct') === 5, 'ตอบถูกต้องนับเพิ่ม')
  assert(Q.nextStreak(4, 'wrong') === 0, 'ตอบผิดต้องเริ่มนับใหม่')
  assert(Q.nextStreak(4, 'flipped') === 0, 'อ่านสลับแถวยังไม่นับว่าถูก')
  assert(Q.streakCheer(1) === null, 'ข้อเดียวยังไม่ต้องชม')
  assert(typeof Q.streakCheer(5) === 'string', 'ห้าข้อติดต้องมีคำชม')
})

check('ครึ่งวงกลมตอนเริ่มข้อใหม่ ต้องไม่วางทับจุดยอดให้ฟรี', () => {
  const question = { vertex: { x: 300, y: 400 }, start: 0, answer: 60, arm: Q.ARM_LENGTH }
  const placing = Q.protractorStart(question)
  assert(
    G.distance(placing.center, question.vertex) > 40,
    'ถ้าวางจุดกึ่งกลางให้ตรงจุดยอดเลย เด็กจะไม่ได้ฝึกสิ่งที่โหมดนี้ตั้งใจให้ฝึก',
  )
})

check('ใบงานต้องได้จำนวนข้อครบ และไม่มีองศาซ้ำกันในใบเดียว', () => {
  const level = Q.findLevel('medium')
  for (let round = 0; round < 30; round += 1) {
    let seed = round + 1
    /* ตัวสุ่มปลอมแบบวนซ้ำ ๆ เพื่อบังคับให้เจอองศาซ้ำบ่อย ๆ ตั้งใจกดดันตัวกันซ้ำ */
    const random = () => {
      seed = (seed * 48271) % 2147483647
      return (seed % 1000) / 1000
    }
    const items = SH.makeSheet({ count: 12, kinds: ['measure', 'draw'], level }, random)

    assert(items.length === 12, `ได้ ${items.length} ข้อ แทนที่จะเป็น 12 ข้อ`)
    const answers = new Set(items.map((item) => item.answer))
    assert(answers.size === items.length, 'มีองศาซ้ำกันในใบเดียว เด็กจะลอกข้ามข้อแทนที่จะวัด')
    for (const item of items) {
      assert(
        item.answer >= level.min && item.answer <= level.max,
        `องศา ${item.answer} หลุดช่วงของระดับที่เลือก`,
      )
      assert(item.kind === 'measure' || item.kind === 'draw', 'ได้แบบโจทย์ที่ไม่รู้จัก')
    }
  }
})

check('ใบงานต้องไม่ค้างเมื่อขอข้อมากกว่าองศาที่มีให้เลือก', () => {
  /*
   * ระดับง่ายมีองศาให้เลือกแค่สิบห้าค่า ถ้าขอยี่สิบข้อโดยห้ามซ้ำ
   * การวนจนกว่าจะครบจะวนไม่รู้จบ แล้วหน้าเว็บจะค้างทั้งหน้าในมือครูกลางคาบ
   */
  const level = Q.findLevel('easy')
  const items = SH.makeSheet({ count: 20, kinds: ['measure'], level }, Math.random)
  assert(items.length > 0, 'ต้องยังได้โจทย์อยู่บ้าง')
  assert(items.length <= 15, 'ระดับง่ายมีองศาให้เลือกแค่สิบห้าค่า จะได้มากกว่านั้นไม่ได้')
  assert(new Set(items.map((item) => item.answer)).size === items.length, 'ยังซ้ำกันอยู่')
})

check('ใบงานต้องสลับแบบโจทย์ตามที่เลือกไว้เท่านั้น', () => {
  const level = Q.findLevel('hard')
  const only = SH.makeSheet({ count: 6, kinds: ['draw'], level }, Math.random)
  assert(only.every((item) => item.kind === 'draw'), 'เลือกแบบเดียวแต่ได้แบบอื่นปนมา')

  const both = SH.makeSheet({ count: 6, kinds: ['measure', 'draw'], level }, Math.random)
  assert(
    both.some((item) => item.kind === 'measure') && both.some((item) => item.kind === 'draw'),
    'เลือกสองแบบแล้วต้องได้ทั้งสองแบบ',
  )

  /* ไม่เลือกอะไรเลยต้องไม่ได้กระดาษเปล่า */
  const fallback = SH.makeSheet({ count: 4, kinds: [], level }, Math.random)
  assert(fallback.length === 4, 'ใบงานที่ไม่มีโจทย์เลยคือกระดาษเปล่า')
})

check('รูปในใบงานต้องตรงกับเฉลยของข้อนั้น', () => {
  const level = Q.findLevel('medium')
  const items = SH.makeSheet({ count: 8, kinds: ['measure', 'draw'], level }, Math.random)
  const vertex = { x: 100, y: 112 }

  items.forEach((item, index) => {
    const ends = SH.itemArms(item, vertex)
    close(
      G.angleBetween(ends.a, vertex, ends.b),
      item.answer,
      0.0001,
      'มุมที่วาดในใบงานไม่ตรงกับเฉลย',
    )
    /* ทุกเส้นต้องอยู่ในกรอบ 200x150 ของข้อนั้น ไม่งั้นรูปจะโดนตัดตอนพิมพ์ */
    for (const point of [ends.a, ends.b]) {
      assert(
        point.x > 0 && point.x < 200 && point.y > 0 && point.y < 150,
        `เส้นของข้อ ${index + 1} ล้นกรอบที่ (${Math.round(point.x)}, ${Math.round(point.y)})`,
      )
    }

    const line = SH.answerLine(item, index)
    assert(line.includes(String(item.answer)), 'บรรทัดเฉลยไม่มีตัวเลขคำตอบ')
    assert(line.includes(`ข้อ ${index + 1}`), 'บรรทัดเฉลยไม่บอกว่าเป็นข้อที่เท่าไร')

    const ask = SH.itemPrompt(item)
    if (item.kind === 'draw') {
      assert(ask.includes(String(item.answer)), 'โจทย์วาดมุมต้องบอกด้วยว่าให้วาดกี่องศา')
    } else {
      assert(!ask.includes(String(item.answer)), 'โจทย์วัดมุมต้องไม่มีเฉลยติดไปในคำสั่ง')
    }
  })

  assert(SH.sheetSubtitle(items).includes('ข้อ'), 'หัวใบงานต้องบอกว่ามีกี่ข้อ')
})

check('รูปจากแบบฝึกต้องย่อลงโดยไม่เสียสัดส่วน', () => {
  /*
   * สัดส่วนคือหัวใจของฟีเจอร์นี้ ถ้ารูปยืดแม้แต่นิดเดียว
   * มุมในหนังสือที่เด็กเอาครึ่งวงกลมไปทาบวัดจะเปลี่ยนไปด้วย แล้วคำตอบจะผิดทั้งข้อ
   */
  const before = 4032 / 3024
  const small = PH.shrinkTo(4032, 3024)
  assert(Math.max(small.width, small.height) <= PH.MAX_PHOTO_SIDE, 'ย่อแล้วยังใหญ่เกินที่กำหนด')
  close(small.width / small.height, before, 0.01, 'สัดส่วนเพี้ยนหลังย่อ')

  const tall = PH.shrinkTo(600, 2400)
  assert(tall.height <= PH.MAX_PHOTO_SIDE, 'รูปแนวตั้งไม่ถูกย่อตามด้านที่ยาวที่สุด')
  close(tall.width / tall.height, 600 / 2400, 0.01, 'สัดส่วนรูปแนวตั้งเพี้ยน')

  /* รูปเล็กอยู่แล้วต้องไม่ถูกขยาย ขยายมีแต่ทำให้เบลอและไฟล์ใหญ่ขึ้นเปล่า ๆ */
  const tiny = PH.shrinkTo(300, 200)
  assert(tiny.width === 300 && tiny.height === 200, 'รูปเล็กไม่ควรถูกขยาย')

  /* ค่าพังต้องไม่ทำให้ได้ขนาดศูนย์หรือค่าติดลบ ซึ่งจะทำให้รูปหายไปเงียบ ๆ */
  const broken = PH.shrinkTo(0, 0)
  assert(broken.width > 0 && broken.height > 0, 'ขนาดที่พังต้องไม่กลายเป็นศูนย์')
})

check('รูปที่วางใหม่ต้องพอดีกระดาษ ไม่ล้นออกไป', () => {
  const paperWidth = 1000
  const paperHeight = 680
  for (const size of [[4032, 3024], [800, 2400], [1000, 1000], [2400, 600]]) {
    const box = PH.fitOnPaper(size[0], size[1], paperWidth, paperHeight)
    assert(box.width <= paperWidth && box.height <= paperHeight, 'รูปที่วางล้นกระดาษ')
    close(box.width / box.height, size[0] / size[1], 0.01, 'สัดส่วนเพี้ยนตอนวางลงกระดาษ')
    assert(box.width > 40 && box.height > 40, 'รูปที่วางเล็กจนมองไม่เห็น')
  }
})

check('รับเฉพาะไฟล์ที่เป็นรูปภาพ', () => {
  assert(PH.isImageType('image/png'), 'PNG ต้องวางได้')
  assert(PH.isImageType('image/jpeg'), 'JPEG ต้องวางได้')
  assert(!PH.isImageType('application/pdf'), 'PDF ไม่ใช่รูปภาพ')
  assert(!PH.isImageType('text/plain'), 'ข้อความที่ก็อปมาต้องไม่กลายเป็นรูป')
  assert(PH.approxBytes('data:image/jpeg;base64,AAAAAAAA') === 6, 'คำนวณขนาดข้อมูลผิด')
})

check('รูปจากแบบฝึกต้องอยู่ล่างสุด ทั้งตอนวาดและตอนจิ้ม', () => {
  const photo = {
    id: 'photo',
    kind: 'photo',
    color: '#000',
    width: 3,
    at: { x: 200, y: 200 },
    imageWidth: 400,
    imageHeight: 300,
    src: 'data:image/jpeg;base64,AAAA',
    fade: 0,
  }
  const line = {
    id: 'line',
    kind: 'segment',
    color: '#000',
    width: 3,
    a: { x: 120, y: 200 },
    b: { x: 280, y: 200 },
  }

  /*
   * รูปวางทีหลังเส้น ตามลำดับปกติมันจะอยู่บนสุด
   * แต่ถ้าจิ้มแล้วได้รูป เด็กจะลากรูปแบบฝึกเคลื่อนทุกครั้งที่ตั้งใจจะเลือกเส้นของตัวเอง
   */
  assert(S.findShapeAt([line, photo], { x: 200, y: 200 }).id === 'line', 'จิ้มบนเส้นต้องได้เส้น')
  assert(
    S.findShapeAt([line, photo], { x: 320, y: 120 }).id === 'photo',
    'จิ้มที่ว่างในรูปต้องได้รูป',
  )
  assert(S.findShapeAt([line, photo], { x: 900, y: 600 }) === null, 'จิ้มนอกรูปต้องไม่โดนอะไร')
})

check('ย่อขยายรูปจากแบบฝึกต้องคงสัดส่วน และหมุนไม่ได้', () => {
  const photo = {
    id: 'photo',
    kind: 'photo',
    color: '#000',
    width: 3,
    at: { x: 300, y: 300 },
    imageWidth: 400,
    imageHeight: 300,
    src: 'data:image/jpeg;base64,AAAA',
    fade: 0,
  }

  const bigger = S.scaleShape(photo, 1.5, { x: 300, y: 300 })
  close(bigger.imageWidth / bigger.imageHeight, 4 / 3, 0.0001, 'ย่อขยายแล้วสัดส่วนเพี้ยน')
  close(bigger.imageWidth, 600, 0.0001, 'ขนาดหลังขยายไม่ถูกต้อง')

  /* หมุนรูปในหนังสือได้เมื่อไร มุมที่วัดได้ก็ผิดเมื่อนั้น จึงต้องไม่ขยับเลย */
  const turned = S.rotateShape(photo, 30, { x: 0, y: 0 })
  assert(turned === photo, 'รูปจากแบบฝึกต้องหมุนไม่ได้')

  const narrow = S.applyField(photo, 'width', 5)
  close(narrow.imageWidth / narrow.imageHeight, 4 / 3, 0.0001, 'ตั้งความกว้างแล้วสัดส่วนเพี้ยน')
  close(narrow.imageWidth, 5 * G.PX_PER_CM, 0.0001, 'ตั้งความกว้างเป็นเซนติเมตรแล้วได้ขนาดผิด')

  const faded = S.applyField(photo, 'fade', 40)
  close(faded.fade, 0.6, 0.0001, 'ปรับความจางแล้วได้ค่าผิด')
})

check('งานที่มีรูปจากแบบฝึกต้องอ่านกลับได้ และกันที่อยู่รูปจากภายนอก', () => {
  const good = {
    id: 'photo',
    kind: 'photo',
    color: '#000',
    width: 3,
    at: { x: 300, y: 300 },
    imageWidth: 400,
    imageHeight: 300,
    src: 'data:image/jpeg;base64,AAAA',
    fade: 0.2,
  }
  const back = D.decodeBoard(D.encodeBoard([good], {}, SAMPLE_PREFS))
  assert(back !== null && back.shapes.length === 1, 'รูปจากแบบฝึกหายหลังรีเฟรช')
  close(back.shapes[0].fade, 0.2, 0.0001, 'ความจางที่ตั้งไว้หายไป')

  /*
   * ค่าที่อ่านกลับมาจากเครื่องถูกแก้มือได้ ถ้ารับที่อยู่รูปอะไรก็ได้
   * หน้าเว็บจะยิงไปโหลดรูปจากปลายทางนั้นให้เองทุกครั้งที่เปิดห้องเรขาคณิต
   */
  const sneaky = { ...good, src: 'https://example.com/tracker.png' }
  const blocked = D.decodeBoard(D.encodeBoard([sneaky], {}, SAMPLE_PREFS))
  assert(blocked.shapes.length === 0, 'ต้องรับเฉพาะรูปที่ฝังมาเป็น data URL เท่านั้น')
})

check('ครึ่งวงกลมและไม้บรรทัดต้องหมุนอิสระ เหลือแรงดูดไว้แค่ใกล้ขีดที่ลงตัว', () => {
  /*
   * นี่คือหัวใจของการวัดมุมในรูปจากแบบฝึก
   * เส้นในหนังสือไม่ได้เอียงเป็นจำนวนเท่าของ 5° สักเส้น
   * ถ้าดูดทีละ 5° เต็ม ๆ เด็กจะทาบขอบครึ่งวงกลมกับเส้นในรูปไม่ได้เลยสักครั้ง
   */
  close(G.softSnapDeg(37.4, 5, 2), 37.4, 0.0001, 'มุมที่อยู่ไกลขีดต้องไม่ถูกดูด')
  close(G.softSnapDeg(22.6, 5, 2), 22.6, 0.0001, 'มุมที่ห่างขีดเกินแรงดูดต้องอยู่ที่เดิม')

  /* แต่ต้องยังวางให้ได้แนวนอนหรือแนวตั้งพอดีง่าย ๆ อยู่ */
  close(G.softSnapDeg(88.7, 5, 2), 90, 0.0001, 'ใกล้แนวตั้งต้องถูกดูดให้พอดี')
  close(G.softSnapDeg(1.2, 5, 2), 0, 0.0001, 'ใกล้แนวนอนต้องถูกดูดให้พอดี')

  /* 359° กับ 1° ห่างกันแค่ 2° ไม่ใช่ 358° ถ้าคิดผิดตรงนี้ การหมุนจะกระตุกตอนผ่านศูนย์ */
  close(G.softSnapDeg(358.8, 5, 2), 0, 0.0001, 'ข้ามศูนย์องศาแล้วแรงดูดต้องยังทำงาน')
  close(G.softSnapDeg(357, 5, 2), 355, 0.0001, 'ต้องดูดเข้าขีดที่ใกล้ที่สุด')

  /* ปิดแม่เหล็กแล้วต้องอิสระทั้งหมด ไม่เหลือแรงดูดที่ขีดไหนเลย */
  close(G.softSnapDeg(89.9, 5, 0), 89.9, 0.0001, 'ปิดแม่เหล็กแล้วยังถูกดูดอยู่')
  close(G.softSnapDeg(90, 0, 2), 90, 0.0001, 'ไม่มีขีดให้ดูดต้องคืนค่าเดิม')
})

console.log(`ผ่าน ${passed} ข้อ`)
if (failures.length > 0) {
  console.log(`\nไม่ผ่าน ${failures.length} ข้อ`)
  failures.forEach((line, index) => console.log(`  ${index + 1}. ${line}`))
  process.exit(1)
}
console.log('ผ่านทั้งหมด')
