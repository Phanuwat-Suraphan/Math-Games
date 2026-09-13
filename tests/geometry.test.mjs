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

check('ตัวอักษรกำกับจุดต้องไม่ซ้ำกัน', () => {
  const labels = new Set()
  for (let index = 0; index < 60; index += 1) {
    const label = G.pointLabel(index)
    assert(!labels.has(label), `ตัวอักษร ${label} ซ้ำที่จุดที่ ${index}`)
    labels.add(label)
  }
})

console.log(`ผ่าน ${passed} ข้อ`)
if (failures.length > 0) {
  console.log(`\nไม่ผ่าน ${failures.length} ข้อ`)
  failures.forEach((line, index) => console.log(`  ${index + 1}. ${line}`))
  process.exit(1)
}
console.log('ผ่านทั้งหมด')
