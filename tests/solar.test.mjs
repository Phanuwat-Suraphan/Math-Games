/**
 * ชุดทดสอบยานสำรวจระบบสุริยะ
 *
 * สี่เรื่องที่ถ้าพังแล้วเด็กเสียหายจริง
 *
 * หนึ่ง — ข้อมูลดาวต้องตรงกับความจริงและสอดคล้องกันเอง
 * เด็กเอาตัวเลขในเกมไปเทียบกับหนังสือเรียน ถ้าลำดับหรือขนาดผิด เด็กจะเลิกเชื่อเกม
 *
 * สอง — ใบ้พิกัดทุกข้อต้องชี้ดาวได้ดวงเดียว และโจทย์ทุกข้อต้องคำนวณถูก
 * เด็กที่คิดถูกแล้วถูกบอกว่าผิด จะเลิกเชื่อวิธีคิดของตัวเอง
 *
 * สาม — ทริปทุกทริปต้องเล่นจนจบได้เสมอ ไม่ว่าจะเลือกผิดหรือตอบผิดกี่ครั้ง
 *
 * สี่ — ฉากต้องวาดได้จากทุกมุมกล้องโดยไม่พัง
 * ผืนผ้าใบโยน error ทันทีเมื่อได้รัศมีติดลบ แล้วฉากทั้งฉากจะค้างเป็นภาพนิ่ง
 * ชุดนี้วาดลงผืนผ้าใบจำลองที่ตรวจทุกคำสั่ง จึงจับได้โดยไม่ต้องมีเบราว์เซอร์
 *
 * วิธีใช้
 *   npx tsc -p tsconfig.tests.json --outDir /tmp/logic
 *   node tests/solar.test.mjs /tmp/logic
 */

import path from 'path'
import { createRequire } from 'module'

const OUT = process.argv[2]
if (!OUT) {
  console.error('ใช้: node tests/solar.test.mjs <โฟลเดอร์ JS ที่คอมไพล์แล้ว>')
  process.exit(1)
}

const require = createRequire(import.meta.url)
const load = (name) => require(path.resolve(OUT, name + '.js'))

const P = load('solar/planets')
const S = load('solar/space')
const Q = load('solar/questions')
const T = load('solar/trip')
const Store = load('solar/storage')
const R = load('solar/render')
const Faces = load('solar/faces')
const { createRng } = load('math/rng')

let passed = 0
const failures = []

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

function check(name, fn) {
  try {
    fn()
    passed += 1
  } catch (error) {
    failures.push(`${name}: ${error.message}`)
  }
}

const close = (a, b, epsilon = 1e-6) => Math.abs(a - b) <= epsilon
const TIERS = [1, 2, 3]
const SEEDS = Array.from({ length: 400 }, (_, index) => `seed-${index}`)
const VIEWPORT = { width: 1280, height: 800 }

/** อ่านตัวเลขที่มีลูกน้ำคั่นหลักพัน */
const num = (text) => Number(text.replace(/,/g, ''))

/**
 * คำนวณประโยคสัญลักษณ์ที่เกมเขียน เช่น "12 ÷ 4" หรือ "(24 ÷ 4) + 2"
 * ตรวจไปด้วยว่าหารลงตัวและไม่มีผลลัพธ์ติดลบระหว่างทาง
 */
function evaluate(expression) {
  const text = expression.trim()
  const grouped = text.match(/^\(([^()]+)\)\s*([+−])\s*([\d,]+)$/)
  if (grouped) {
    const inner = evaluate(grouped[1])
    const extra = num(grouped[3])
    return grouped[2] === '+' ? inner + extra : inner - extra
  }
  const simple = text.match(/^([\d,]+)\s*([+−×÷])\s*([\d,]+)$/)
  if (!simple) throw new Error(`อ่านประโยค "${expression}" ไม่ออก`)
  const a = num(simple[1])
  const b = num(simple[3])
  switch (simple[2]) {
    case '+':
      return a + b
    case '−':
      if (a - b < 0) throw new Error(`"${expression}" ติดลบ`)
      return a - b
    case '×':
      return a * b
    case '÷':
      if (a % b !== 0) throw new Error(`"${expression}" หารไม่ลงตัว`)
      return a / b
  }
  throw new Error('เครื่องหมายแปลก')
}

// ---------- ข้อมูลดาว ----------

check('มีดาวเคราะห์แปดดวง ลำดับ 1–8 ไม่ซ้ำ และเรียงตามระยะห่างจริง', () => {
  assert(P.PLANETS.length === 8, `มี ${P.PLANETS.length} ดวง`)
  P.PLANETS.forEach((planet, index) => {
    assert(planet.order === index + 1, `${planet.name} อยู่ลำดับ ${planet.order}`)
    if (index === 0) return
    const inner = P.PLANETS[index - 1]
    assert(planet.distanceKm > inner.distanceKm, `${planet.name} ไม่ได้อยู่ไกลกว่า ${inner.name}`)
    assert(planet.sceneOrbit > inner.sceneOrbit, `วงโคจรในฉากของ ${planet.name} ไม่ได้อยู่นอก ${inner.name}`)
  })
})

check('ดาวที่อยู่ไกลกว่าโคจรช้ากว่าเสมอ (กฎข้อสามของเคปเลอร์)', () => {
  for (let index = 1; index < P.PLANETS.length; index += 1) {
    const inner = P.PLANETS[index - 1]
    const outer = P.PLANETS[index]
    assert(outer.orbitDays > inner.orbitDays, `${outer.name} โคจรเร็วกว่า ${inner.name}`)
    // คาบยกกำลังสองแปรผันตามระยะยกกำลังสาม คลาดได้ไม่เกินร้อยละห้าจากการปัดตัวเลข
    const ratio =
      (outer.orbitDays / inner.orbitDays) ** 2 / (outer.distanceKm / inner.distanceKm) ** 3
    assert(Math.abs(ratio - 1) < 0.05, `${outer.name} กับ ${inner.name} ไม่เป็นไปตามกฎเคปเลอร์ (${ratio.toFixed(3)})`)
  }
})

check('ค่าที่ใช้สร้างโจทย์ตรงกับที่หนังสือเรียนเขียน', () => {
  const earth = P.getPlanet('earth')
  assert(P.distanceMillionKm(earth) === 150, 'โลกไม่ได้อยู่ห่างดวงอาทิตย์ราว 150 ล้านกิโลเมตร')
  assert(earth.orbitDays === 365, 'หนึ่งปีของโลกไม่ใช่ 365 วัน')
  assert(earth.moons === 1, 'โลกไม่ได้มีดวงจันทร์ดวงเดียว')
  assert(P.getPlanet('mars').moons === 2, 'ดาวอังคารไม่ได้มีดวงจันทร์สองดวง')
  assert(P.getPlanet('mercury').moons === 0 && P.getPlanet('venus').moons === 0, 'ดาวพุธหรือดาวศุกร์มีดวงจันทร์')
  assert(P.orbitYears(P.getPlanet('jupiter')) === 12, 'ดาวพฤหัสบดีไม่ได้โคจรครบรอบในราว 12 ปี')
  assert(P.orbitYears(P.getPlanet('saturn')) === 29, 'ดาวเสาร์ไม่ได้โคจรครบรอบในราว 29 ปี')
  assert(P.orbitYears(P.getPlanet('uranus')) === 84, 'ดาวยูเรนัสไม่ได้โคจรครบรอบในราว 84 ปี')
  assert(P.orbitYears(P.getPlanet('neptune')) === 165, 'ดาวเนปจูนไม่ได้โคจรครบรอบในราว 165 ปี')
  const venus = P.getPlanet('venus')
  assert(Math.abs(venus.spinHours) / 24 > venus.orbitDays, 'หนึ่งวันของดาวศุกร์ต้องยาวกว่าหนึ่งปี')
  assert(venus.meanTempC > P.getPlanet('mercury').meanTempC, 'ดาวศุกร์ต้องร้อนกว่าดาวพุธ')
})

check('ขนาดในฉากขยายดาวเล็กให้มองเห็นได้ แต่ลำดับขนาดยังตรงกับของจริง', () => {
  const byReal = [...P.PLANETS].sort((a, b) => b.diameterKm - a.diameterKm).map((p) => p.id)
  const byScene = [...P.PLANETS].sort((a, b) => b.sceneRadius - a.sceneRadius).map((p) => p.id)
  assert(byReal.join() === byScene.join(), `ลำดับในฉาก ${byScene.join()} ไม่ตรงกับของจริง ${byReal.join()}`)
  const ranks = P.PLANETS.map((planet) => Q.sizeRank(planet)).sort((a, b) => a - b)
  assert(ranks.join() === '1,2,3,4,5,6,7,8', `อันดับขนาดซ้ำกัน ${ranks.join()}`)
})

check('วงโคจรในฉากไม่ชนกัน ดาวเคราะห์น้อยอยู่ระหว่างดาวอังคารกับดาวพฤหัสบดี', () => {
  for (let index = 1; index < P.PLANETS.length; index += 1) {
    const inner = P.PLANETS[index - 1]
    const outer = P.PLANETS[index]
    const gap = outer.sceneOrbit - inner.sceneOrbit
    assert(gap > S.bodyExtent(inner) + S.bodyExtent(outer), `${inner.name} กับ ${outer.name} ชนกันได้`)
  }
  const mars = P.getPlanet('mars')
  const jupiter = P.getPlanet('jupiter')
  assert(P.ASTEROID_BELT.inner > mars.sceneOrbit + S.bodyExtent(mars), 'แถบดาวเคราะห์น้อยทับดาวอังคาร')
  assert(P.ASTEROID_BELT.outer < jupiter.sceneOrbit - S.bodyExtent(jupiter), 'แถบดาวเคราะห์น้อยทับดาวพฤหัสบดี')
  assert(P.PLANETS[0].sceneOrbit - S.bodyExtent(P.PLANETS[0]) > P.SUN.sceneRadius, 'ดาวพุธชนดวงอาทิตย์')
})

check('ใส่ลูกน้ำคั่นหลักพันถูกทุกขนาด และใช้เครื่องหมายลบแบบคณิตศาสตร์', () => {
  assert(P.formatNumber(4498396441) === '4,498,396,441', P.formatNumber(4498396441))
  assert(P.formatNumber(999) === '999', P.formatNumber(999))
  assert(P.formatNumber(1000) === '1,000', P.formatNumber(1000))
  assert(P.formatNumber(-65) === '−65', P.formatNumber(-65))
  assert(P.formatNumber(9.9) === '9.9', P.formatNumber(9.9))
})

// ---------- ตำแหน่งดาวและกล้อง ----------

check('โคจรครบหนึ่งคาบแล้วกลับมาที่เดิม', () => {
  for (const planet of P.PLANETS) {
    const start = S.planetPosition(planet, 1234)
    const lap = S.planetPosition(planet, 1234 + planet.orbitDays)
    assert(close(start.x, lap.x, 1e-6) && close(start.z, lap.z, 1e-6), `${planet.name} ไม่กลับที่เดิม`)
    assert(close(Math.hypot(start.x, start.z), planet.sceneOrbit, 1e-9), `${planet.name} หลุดวงโคจร`)
  }
})

check('ดาวทุกดวงโคจรทวนเข็มนาฬิกาเมื่อมองลงมาจากด้านบน เหมือนของจริง', () => {
  const camera = S.cameraFor({ target: { x: 0, y: 0, z: 0 }, yaw: 0.3, pitch: S.MAX_PITCH, distance: 90 })
  for (const planet of P.PLANETS) {
    const step = planet.orbitDays / 50
    const a = S.projectPoint(S.planetPosition(planet, 100), camera, VIEWPORT)
    const b = S.projectPoint(S.planetPosition(planet, 100 + step), camera, VIEWPORT)
    const cx = VIEWPORT.width / 2
    const cy = VIEWPORT.height / 2
    // แกน y ของจอชี้ลง มุมทวนเข็มนาฬิกาจึงคิดจาก −y
    const angleA = Math.atan2(-(a.y - cy), a.x - cx)
    const angleB = Math.atan2(-(b.y - cy), b.x - cx)
    let turn = angleB - angleA
    if (turn > Math.PI) turn -= Math.PI * 2
    if (turn < -Math.PI) turn += Math.PI * 2
    assert(turn > 0, `${planet.name} โคจรตามเข็มนาฬิกา`)
  }
})

check('ในหนึ่งปีของโลก ดาวพุธโคจรได้เกินสี่รอบ ส่วนดาวเนปจูนขยับไม่ถึงร้อยละหนึ่งของรอบ', () => {
  const laps = (planet) => 365 / planet.orbitDays
  assert(laps(P.getPlanet('mercury')) > 4, 'ดาวพุธโคจรช้าเกินไป')
  assert(laps(P.getPlanet('neptune')) < 0.01, 'ดาวเนปจูนโคจรเร็วเกินไป')
})

check('ตำแหน่งดาววันนี้คิดจากวันที่จริง วันเดียวกันได้ตำแหน่งเดียวกันเสมอ', () => {
  const date = new Date('2026-09-25T00:00:00Z')
  const days = S.daysSinceJ2000(date)
  assert(close(days, 9763.5, 1e-9), `นับวันจาก J2000 ได้ ${days}`)
  assert(S.dateFromDays(days).toISOString() === date.toISOString(), 'แปลงวันกลับเป็นวันที่ไม่ตรง')
})

check('จุดที่กล้องมองต้องอยู่กลางจอพอดี จากทุกมุมและทุกระยะ', () => {
  const rng = createRng('solar-camera')
  for (let index = 0; index < 500; index += 1) {
    const view = {
      target: { x: rng.next() * 60 - 30, y: rng.next() * 4 - 2, z: rng.next() * 60 - 30 },
      yaw: rng.next() * Math.PI * 4 - Math.PI * 2,
      pitch: S.MIN_PITCH + rng.next() * (S.MAX_PITCH - S.MIN_PITCH),
      distance: S.MIN_DISTANCE + rng.next() * (S.MAX_DISTANCE - S.MIN_DISTANCE),
    }
    const point = S.projectPoint(view.target, S.cameraFor(view), VIEWPORT)
    assert(point, 'จุดที่มองอยู่หลังกล้อง')
    assert(close(point.x, VIEWPORT.width / 2, 1e-6) && close(point.y, VIEWPORT.height / 2, 1e-6), `ไปอยู่ที่ ${point.x}, ${point.y}`)
    assert(close(point.depth, view.distance, 1e-6), 'ความลึกไม่เท่าระยะกล้อง')
  }
})

check('ด้านสว่างของดาวหันเข้าหาดวงอาทิตย์เสมอ', () => {
  const planet = { x: 20, y: 0, z: 0 }
  // กล้องมองไปทาง +x คืออยู่ระหว่างดวงอาทิตย์กับดาว ดวงอาทิตย์จึงอยู่ข้างหลังกล้อง
  const behindCamera = S.cameraFor({ target: planet, yaw: Math.PI / 2, pitch: 0.001, distance: 5 })
  const behindPlanet = S.cameraFor({ target: planet, yaw: -Math.PI / 2, pitch: 0.001, distance: 5 })
  const side = S.cameraFor({ target: planet, yaw: 0, pitch: 0.001, distance: 5 })
  const full = S.phaseOf(planet, behindCamera)
  const dark = S.phaseOf(planet, behindPlanet)
  const half = S.phaseOf(planet, side)
  assert(full.litFraction > 0.99, `ดวงอาทิตย์อยู่ข้างหลังกล้องแต่สว่างแค่ ${full.litFraction}`)
  assert(dark.litFraction < 0.01, `ดวงอาทิตย์อยู่หลังดาวแต่ยังสว่าง ${dark.litFraction}`)
  assert(close(half.litFraction, 0.5, 0.01), `มองจากด้านข้างแต่สว่าง ${half.litFraction}`)
  // มองจากด้านข้าง ดวงอาทิตย์อยู่ทางซ้ายของจอ ด้านสว่างจึงต้องชี้ไปทางซ้าย
  assert(Math.cos(half.angle) < -0.99, `ด้านสว่างชี้ไปทางมุม ${half.angle}`)
})

check('มุมกล้องตอนมาถึงดาวเห็นด้านสว่างเกือบเต็มดวง ทุกดวงทุกตำแหน่ง', () => {
  for (const planet of P.PLANETS) {
    for (let day = 0; day < 60_000; day += 3_700) {
      const center = S.planetPosition(planet, day)
      const camera = S.cameraFor({ target: center, yaw: S.sunSideYaw(center), pitch: 0.3, distance: S.closeUpDistance(planet) })
      const lit = S.phaseOf(center, camera).litFraction
      assert(lit > 0.75 && lit < 0.98, `${planet.name} วันที่ ${day} สว่าง ${lit.toFixed(2)}`)
    }
  }
})

check('กล้องเลื่อนไปถึงเป้าหมายในเวลาเท่ากัน ไม่ว่าเครื่องจะวาดได้กี่เฟรมต่อวินาที', () => {
  const start = { target: { x: 0, y: 0, z: 0 }, yaw: 3, pitch: 0.2, distance: 80 }
  const goal = { target: { x: 10, y: 0, z: -5 }, yaw: -3, pitch: 1, distance: 5 }
  const run = (fps) => {
    let view = start
    for (let frame = 0; frame < fps; frame += 1) view = S.easeView(view, goal, 1 / fps)
    return view
  }
  const slow = run(20)
  const fast = run(120)
  assert(close(slow.distance, fast.distance, 0.05), `ระยะต่างกัน ${slow.distance} กับ ${fast.distance}`)
  assert(close(slow.target.x, fast.target.x, 0.01), 'เป้าหมายต่างกัน')
  let view = start
  for (let frame = 0; frame < 600; frame += 1) view = S.easeView(view, goal, 1 / 60)
  assert(close(view.distance, goal.distance, 1e-3) && close(view.target.z, goal.target.z, 1e-3), 'กล้องไปไม่ถึงเป้าหมาย')
  // หมุนจาก 3 ไป −3 เรเดียน ทางสั้นคือผ่าน π ไม่ใช่หมุนย้อนเกือบรอบผ่านศูนย์
  const firstStep = S.easeView(start, goal, 1 / 60)
  assert(firstStep.yaw > start.yaw, 'กล้องหมุนอ้อมทางไกล')
})

check('แตะดาวแล้วเลือกดาวดวงนั้น แตะที่ว่างไม่เลือกอะไร', () => {
  const days = 9000
  const camera = S.cameraFor(S.OVERVIEW)
  const bodies = S.bodiesOnScreen(days, camera, VIEWPORT)
  assert(bodies.length === 9, `เห็นแค่ ${bodies.length} ดวงจากมุมมองทั้งระบบ`)
  for (const body of bodies) {
    const picked = S.pickBody(body.x, body.y, bodies, 26)
    // ดาวที่อยู่หลังดวงอาทิตย์พอดีแตะไม่โดนได้ ซึ่งถูกต้อง แต่ต้องได้ดวงที่อยู่หน้ากว่า
    if (picked !== body.id) {
      const winner = bodies.find((other) => other.id === picked)
      assert(winner && winner.depth < body.depth, `แตะ ${body.id} แต่ได้ ${picked}`)
    }
  }
  assert(S.pickBody(3, 3, bodies, 26) === null, 'แตะมุมจอแล้วยังเลือกดาว')
})

check('ดาวดวงเล็กที่อยู่ไกลแตะโดนได้แม้นิ้วคลาดไปเล็กน้อย', () => {
  const bodies = [
    { id: 'mercury', x: 100, y: 100, radius: 2, depth: 50 },
    { id: 'venus', x: 140, y: 100, radius: 3, depth: 50 },
  ]
  assert(S.pickBody(100, 118, bodies, 26) === 'mercury', 'นิ้วคลาดไป 18 พิกเซลแล้วแตะไม่โดน')
  // นิ้วอยู่ในพื้นที่แตะของทั้งสองดวง ต้องได้ดวงที่ใกล้นิ้วกว่า
  assert(S.pickBody(118, 100, bodies, 26) === 'mercury', 'ต้องได้ดวงที่ใกล้นิ้วกว่า')
  assert(S.pickBody(124, 100, bodies, 26) === 'venus', 'ต้องได้ดวงที่ใกล้นิ้วกว่า')
  assert(S.pickBody(100, 140, bodies, 26) === null, 'นิ้วห่างไป 40 พิกเซลแล้วยังเลือกดาว')
  const overlap = [
    { id: 'saturn', x: 100, y: 100, radius: 40, depth: 30 },
    { id: 'neptune', x: 110, y: 100, radius: 20, depth: 60 },
  ]
  assert(S.pickBody(110, 100, overlap, 26) === 'saturn', 'ดาวที่อยู่หน้าต้องบังดาวที่อยู่หลัง')
})

check('ยานออกจากจุดเดิม ไปถึงจุดจอด และไม่บินทะลุดวงอาทิตย์', () => {
  for (const from of P.PLANETS) {
    for (const to of P.PLANETS) {
      if (from.id === to.id) continue
      for (const day of [0, 3000, 7777]) {
        const start = S.parkingSpot(from.id, day)
        const end = S.parkingSpot(to.id, day)
        const first = S.flightPosition(start, end, 0)
        const last = S.flightPosition(start, end, 1)
        assert(close(first.x, start.x) && close(first.z, start.z), 'ไม่ได้ออกจากจุดเดิม')
        assert(close(last.x, end.x) && close(last.y, end.y) && close(last.z, end.z), 'ไปไม่ถึงจุดจอด')
        for (let t = 0; t <= 1; t += 0.01) {
          const point = S.flightPosition(start, end, t)
          const gap = Math.hypot(point.x, point.y, point.z)
          assert(gap > P.SUN.sceneRadius + 0.3, `${from.id}→${to.id} บินเฉียดดวงอาทิตย์ที่ t=${t.toFixed(2)}`)
        }
        const seconds = S.flightSeconds(start, end)
        assert(seconds >= 2 && seconds <= 6, `บินนาน ${seconds} วินาที`)
      }
    }
  }
})

check('จุดจอดอยู่นอกตัวดาวและนอกวงแหวนเสมอ', () => {
  for (const planet of P.PLANETS) {
    const center = S.planetPosition(planet, 500)
    const spot = S.parkingSpot(planet.id, 500)
    const gap = Math.hypot(spot.x - center.x, spot.y - center.y, spot.z - center.z)
    assert(gap > S.bodyExtent(planet) + 0.3, `${planet.name} ยานจอดชนดาว`)
  }
})

// ---------- ใบ้พิกัด ----------

check('ประโยคสัญลักษณ์ทุกระดับคำนวณได้เท่ากับค่าที่ตั้งใจ หารลงตัว ไม่ติดลบ', () => {
  for (const tier of TIERS) {
    for (let value = 1; value <= 300; value += 1) {
      for (let attempt = 0; attempt < 6; attempt += 1) {
        const expression = Q.makeExpression(value, tier, createRng(`expr-${tier}-${value}-${attempt}`))
        assert(expression.value === value, 'ค่าที่คืนมาไม่ตรง')
        const result = evaluate(expression.text)
        assert(result === value, `ระดับ ${tier}: "${expression.text}" ได้ ${result} ไม่ใช่ ${value}`)
      }
    }
  }
})

check('ใบ้พิกัดทุกข้อชี้ดาวได้ดวงเดียว และเป็นดวงที่เป็นปลายทางจริง', () => {
  for (const planet of P.PLANETS) {
    for (const tier of TIERS) {
      for (const seed of SEEDS) {
        const clue = Q.buildClue(planet.id, tier, seed)
        const candidates = Q.clueCandidates(clue)
        assert(
          candidates.length === 1 && candidates[0] === planet.id,
          `ระดับ ${tier} "${clue.text}" ชี้ได้ ${candidates.join(',') || 'ไม่มีดวงไหน'}`,
        )
        assert(!/undefined|NaN|Infinity/.test(clue.text + clue.hint), `ข้อความเสีย: ${clue.text}`)
      }
    }
  }
})

/*
 * ใบ้ที่ชี้ได้หลายดวงถูกตัดทิ้งเงียบ ๆ ก่อนถึงมือเด็ก ซึ่งดีสำหรับเด็ก
 * แต่แปลว่าถ้าเงื่อนไขของใบ้แบบไหนเขียนผิด ใบ้แบบนั้นจะหายไปเฉย ๆ โดยไม่มีข้อไหนตก
 * ข้อนี้จึงระบุไว้ตรง ๆ ว่าดาวดวงไหนต้องได้ใบ้แบบไหนบ้าง
 */
check('ใบ้แต่ละแบบยังออกได้ครบทุกดาวที่ควรได้ ไม่ถูกตัดทิ้งเพราะเงื่อนไขเขียนผิด', () => {
  const inner = ['mercury', 'venus', 'earth', 'mars']
  const withMoons = P.PLANETS.filter((planet) => planet.moons > 0).map((planet) => planet.id)
  const manyMoons = P.PLANETS.filter((planet) => planet.moons >= 10).map((planet) => planet.id)
  const expected = {
    1: {
      order: P.PLANET_IDS,
      feature: P.PLANET_IDS,
      edge: ['mercury', 'neptune'],
      between: P.PLANET_IDS.slice(1, 7),
      size: ['jupiter', 'mercury'],
      moons: ['earth', 'mars', 'neptune'],
    },
    2: {
      order: P.PLANET_IDS,
      distance: P.PLANET_IDS,
      size: P.PLANET_IDS,
      periodDays: inner,
      periodYears: P.PLANET_IDS.filter((id) => !inner.includes(id)),
      moons: withMoons,
      moonRange: manyMoons,
    },
  }
  expected[3] = expected[2]
  for (const tier of TIERS) {
    for (const [kind, planets] of Object.entries(expected[tier])) {
      for (const id of planets) {
        const kinds = Q.clueOptions(id, tier, 'coverage').map((clue) => clue.kind)
        assert(kinds.includes(kind), `${id} ระดับ ${tier} ไม่มีใบ้แบบ ${kind} (มี ${kinds.join(',')})`)
      }
    }
  }
})

check('ใบ้แบบนับลำดับคำนวณแล้วได้ลำดับของดาวปลายทาง', () => {
  let found = 0
  for (const planet of P.PLANETS) {
    for (const tier of TIERS) {
      for (const seed of SEEDS) {
        const clue = Q.clueOptions(planet.id, tier, seed).find((item) => item.kind === 'order')
        assert(clue, `ไม่มีใบ้นับลำดับให้ ${planet.name} ระดับ ${tier}`)
        const expression = clue.text.match(/ลำดับที่ (.+) นับจากดวงอาทิตย์/)[1]
        assert(evaluate(expression) === planet.order, `"${expression}" ไม่ได้ ${planet.order}`)
        found += 1
      }
    }
  }
  assert(found === 8 * 3 * SEEDS.length, 'ตรวจไม่ครบ')
})

check('ใบ้แบบช่วงของจำนวนดวงจันทร์ครอบดาวดวงเดียวจริง ๆ', () => {
  for (const planet of P.PLANETS) {
    for (const tier of [2, 3]) {
      const clue = Q.clueOptions(planet.id, tier, 'range').find((item) => item.kind === 'moonRange')
      if (!clue) continue
      const inside = P.PLANETS.filter((other) => other.moons > clue.min && other.moons < clue.max)
      assert(inside.length === 1 && inside[0].id === planet.id, `"${clue.text}" ครอบ ${inside.map((p) => p.name).join(',')}`)
    }
  }
})

check('ใบ้มีหลายแบบ ไม่ได้ออกแต่แบบนับลำดับจนเด็กจำวิธีได้', () => {
  for (const tier of TIERS) {
    const kinds = new Map()
    for (const planet of P.PLANETS) {
      for (const seed of SEEDS.slice(0, 100)) {
        const kind = Q.buildClue(planet.id, tier, seed).kind
        kinds.set(kind, (kinds.get(kind) ?? 0) + 1)
      }
    }
    assert(kinds.size >= 4, `ระดับ ${tier} มีใบ้แค่ ${kinds.size} แบบ`)
    const order = kinds.get('order') ?? 0
    assert(order / 800 < 0.5, `ระดับ ${tier} ใบ้นับลำดับออกถึงร้อยละ ${Math.round((order / 800) * 100)}`)
  }
})

// ---------- โจทย์ประจำดาว ----------

check('ทุกดาวมีโจทย์อย่างน้อยสี่แบบในทุกระดับ', () => {
  for (const planet of P.PLANETS) {
    for (const tier of TIERS) {
      const kinds = new Set()
      for (const seed of SEEDS.slice(0, 50)) {
        for (const question of Q.questionOptions(planet.id, tier, seed)) kinds.add(question.kind)
      }
      assert(kinds.size >= 4, `${planet.name} ระดับ ${tier} มีแค่ ${[...kinds].join(',')}`)
    }
  }
})

check('โจทย์แต่ละแบบออกให้ดาวที่ควรได้ครบ ในระดับที่ตั้งใจ', () => {
  const all = P.PLANET_IDS
  const away = all.filter((id) => id !== 'earth')
  const expected = {
    1: {
      'digit-place': all,
      'distance-gap': all,
      'year-times': all,
      'venus-day-year': ['venus'],
      hotter: ['mercury', 'venus', 'earth'],
      'olympus-km': ['mars'],
      'big-ball': ['jupiter', 'saturn', 'uranus', 'neptune'],
      discovery: ['uranus', 'neptune'],
      'slow-spin': ['mercury', 'venus'],
    },
    2: {
      'orbits-in': ['mercury', 'venus', 'earth', 'mars'],
      'planet-age': ['jupiter', 'saturn'],
      'travel-days': away,
      'spin-count': ['earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'],
      'size-times': ['jupiter', 'earth', 'neptune', 'mercury'],
      'moon-trip': ['earth'],
      'moon-weight': ['earth'],
      'olympus-m': ['mars'],
    },
    3: {
      'year-times': all,
      'weigh-in': away,
      'moon-weight': ['earth'],
      'moon-trip-days': ['earth'],
      'light-minutes': all.filter((id) => id !== 'uranus'),
      'travel-two-step': away.filter((id) => id !== 'saturn'),
    },
  }
  for (const tier of TIERS) {
    for (const [kind, planets] of Object.entries(expected[tier])) {
      for (const id of planets) {
        const kinds = new Set()
        for (const seed of SEEDS.slice(0, 20)) {
          for (const question of Q.questionOptions(id, tier, seed)) kinds.add(question.kind)
        }
        assert(kinds.has(kind), `${id} ระดับ ${tier} ไม่มีโจทย์แบบ ${kind}`)
      }
    }
  }
})

check('โจทย์ทุกข้อมีสี่ตัวเลือกไม่ซ้ำ มีคำตอบอยู่ในนั้น และคำตอบเป็นจำนวนนับ', () => {
  let count = 0
  for (const planet of P.PLANETS) {
    for (const tier of TIERS) {
      for (const seed of SEEDS) {
        for (const question of Q.questionOptions(planet.id, tier, seed)) {
          count += 1
          const label = `${planet.name} ระดับ ${tier} ${question.kind}`
          assert(question.choices.length === 4, `${label} มี ${question.choices.length} ตัวเลือก`)
          assert(new Set(question.choices).size === 4, `${label} ตัวเลือกซ้ำ ${question.choices}`)
          assert(question.choices.includes(question.answer), `${label} ไม่มีคำตอบในตัวเลือก`)
          for (const choice of question.choices) {
            assert(Number.isInteger(choice), `${label} มีตัวเลือก ${choice}`)
            assert(question.format === 'digit' ? choice >= 0 && choice <= 9 : choice > 0, `${label} มีตัวเลือก ${choice}`)
          }
          assert(!/undefined|NaN|Infinity/.test(question.text + question.steps.join()), `${label} ข้อความเสีย`)
          assert(question.steps.length > 0, `${label} ไม่มีวิธีคิด`)
        }
      }
    }
  }
  assert(count > 50_000, `ตรวจแค่ ${count} ข้อ`)
})

check('ทุกบรรทัดของวิธีคิดคำนวณถูก และบรรทัดสุดท้ายได้คำตอบ', () => {
  const line = /([\d,]+(?:\.\d+)?) ([+−×÷]) ([\d,]+(?:\.\d+)?) = ([\d,]+(?:\.\d+)?)/g
  for (const planet of P.PLANETS) {
    for (const tier of TIERS) {
      for (const seed of SEEDS.slice(0, 150)) {
        for (const question of Q.questionOptions(planet.id, tier, seed)) {
          let lastResult = null
          for (const step of question.steps) {
            for (const match of step.matchAll(line)) {
              const a = num(match[1])
              const b = num(match[3])
              const result = num(match[4])
              const expected =
                match[2] === '+' ? a + b : match[2] === '−' ? a - b : match[2] === '×' ? a * b : a / b
              assert(Math.abs(expected - result) < 1e-9, `${question.kind}: "${match[0]}" ผิด`)
              lastResult = result
            }
          }
          const rounded = question.kind === 'size-round' || question.kind === 'light-minutes'
          if (!rounded && question.kind !== 'digit-place') {
            assert(lastResult === question.answer, `${question.kind}: วิธีคิดได้ ${lastResult} แต่คำตอบคือ ${question.answer}`)
          }
        }
      }
    }
  }
})

check('โจทย์ที่ต้องปัดเศษไม่คาบเส้นครึ่ง', () => {
  for (const planet of P.PLANETS) {
    for (const seed of SEEDS.slice(0, 150)) {
      for (const question of Q.questionOptions(planet.id, 3, seed)) {
        if (question.kind !== 'size-round' && question.kind !== 'light-minutes') continue
        const exact = Number(question.steps[0].match(/ได้ประมาณ ([\d.]+)/)[1])
        const fraction = exact - Math.floor(exact)
        assert(Math.abs(fraction - 0.5) > 0.1, `${question.kind} ได้ ${exact} ซึ่งคาบเส้น`)
        assert(Math.round(exact) === question.answer, `${question.kind} ปัด ${exact} ได้ ${question.answer}`)
      }
    }
  }
})

check('โจทย์ค่าประจำหลักตอบเลขโดดของหลักที่ถามจริง', () => {
  const places = { แสน: 5, ล้าน: 6, สิบล้าน: 7, ร้อยล้าน: 8, พันล้าน: 9 }
  for (const planet of P.PLANETS) {
    for (const seed of SEEDS.slice(0, 80)) {
      const question = Q.questionOptions(planet.id, 1, seed).find((item) => item.kind === 'digit-place')
      assert(question, `${planet.name} ไม่มีโจทย์ค่าประจำหลัก`)
      const place = question.text.match(/หลัก(แสน|ล้าน|สิบล้าน|ร้อยล้าน|พันล้าน)คือ/)[1]
      const digit = Math.floor(planet.distanceKm / 10 ** places[place]) % 10
      assert(question.answer === digit, `${planet.name} หลัก${place} ได้ ${question.answer} ไม่ใช่ ${digit}`)
    }
  }
})

check('โจทย์ตาชั่งบนดาวอื่นคำนวณด้วยจำนวนเต็ม ไม่มีเศษทศนิยมลอยค้าง', () => {
  for (const planet of P.PLANETS) {
    for (const seed of SEEDS) {
      const question = Q.questionOptions(planet.id, 3, seed).find((item) => item.kind === 'weigh-in')
      if (!question) continue
      const [, weight, factor] = question.text.match(/ได้ (\d+) กิโลกรัม.*?ประมาณ ([\d.]+) เท่า/)
      assert(Math.round(Number(weight) * Number(factor) * 10) / 10 === question.answer, `${weight} × ${factor} ไม่ใช่ ${question.answer}`)
    }
  }
})

check('ตัวลวงของการลบคือการลบแบบลืมยืม ซึ่งเป็นความผิดพลาดที่พบบ่อยที่สุด', () => {
  assert(Q.subtractWithoutBorrow(243, 225) === 22, 'ลบ 243 − 225 แบบลืมยืมต้องได้ 22')
  assert(Q.subtractWithoutBorrow(464, 167) === 303, 'ลบ 464 − 167 แบบลืมยืมต้องได้ 303')
  assert(Q.subtractWithoutBorrow(50, 8) === 58, 'ลบ 50 − 8 แบบลืมยืมต้องได้ 58')
})

check('ข้อความคำตอบใส่หน่วย ปี ค.ศ. ไม่มีลูกน้ำ', () => {
  assert(Q.formatAnswer({ format: 'year', unit: '' }, 2011) === 'ค.ศ. 2011', 'ปีมีลูกน้ำ')
  assert(Q.formatAnswer({ format: 'number', unit: 'วัน' }, 1125) === '1,125 วัน', 'จำนวนไม่มีลูกน้ำ')
  assert(Q.formatAnswer({ format: 'digit', unit: '' }, 0) === '0', 'เลขโดดศูนย์หาย')
})

// ---------- ทริป ----------

check('ทริปเริ่มจากโลก แวะดาวไม่ซ้ำ แล้วจบที่โลก', () => {
  for (const length of ['short', 'full']) {
    for (const seed of SEEDS.slice(0, 100)) {
      const trip = T.createTrip(seed, 2, length)
      const targets = trip.legs.map((leg) => leg.target)
      assert(targets.length === T.STOPS_BEFORE_HOME[length] + 1, `ทริป ${length} มี ${targets.length} ช่วง`)
      assert(targets[targets.length - 1] === 'earth', 'ไม่ได้จบที่โลก')
      assert(targets[0] !== 'earth', 'ช่วงแรกให้บินไปโลกทั้งที่อยู่โลกแล้ว')
      assert(new Set(targets).size === targets.length, `แวะดาวซ้ำ ${targets.join()}`)
    }
  }
  const a = T.createTrip('same', 1, 'full')
  const b = T.createTrip('same', 1, 'full')
  assert(JSON.stringify(a) === JSON.stringify(b), 'seed เดิมได้ทริปคนละแบบ')
})

check('เล่นถูกทุกข้อตั้งแต่ครั้งแรก ได้สามดาวทุกช่วง', () => {
  let trip = T.createTrip('perfect', 3, 'full')
  while (!T.isFinished(trip)) {
    const leg = T.currentLeg(trip)
    trip = T.pickDestination(trip, leg.target).trip
    trip = T.answerLeg(trip, T.currentLeg(trip).question.answer).trip
    trip = T.advance(trip)
  }
  const summary = T.summarize(trip)
  assert(summary.stars === summary.maxStars && summary.maxStars === 24, `ได้ ${summary.stars}/${summary.maxStars}`)
  assert(summary.perfectLegs === 8, 'มีช่วงที่ไม่ได้สามดาว')
})

check('เลือกผิดหรือตอบผิดกี่ครั้งก็ยังเล่นจนจบได้ และได้อย่างน้อยหนึ่งดาวเสมอ', () => {
  for (const seed of SEEDS.slice(0, 120)) {
    const rng = createRng(`chaos-${seed}`)
    let trip = T.createTrip(seed, rng.pick([1, 2, 3]), rng.pick(['short', 'full']))
    let guard = 0
    while (!T.isFinished(trip)) {
      guard += 1
      assert(guard < 500, 'วนไม่จบ')
      const leg = T.currentLeg(trip)
      if (!leg.navSolved) {
        trip = T.pickDestination(trip, rng.pick(P.PLANET_IDS)).trip
        continue
      }
      if (!leg.questionSolved) {
        trip = T.answerLeg(trip, rng.pick(leg.question.choices)).trip
        continue
      }
      trip = T.advance(trip)
    }
    for (const item of T.summarize(trip).legs) {
      assert(item.stars >= 1 && item.stars <= 3, `ได้ ${item.stars} ดาว`)
    }
  }
})

check('เลือกดาวผิดดวงเดิมซ้ำ หรือเลือกดาวที่ยานจอดอยู่ ไม่ถูกนับเป็นความผิด', () => {
  let trip = T.createTrip('repeat', 1, 'short')
  const leg = T.currentLeg(trip)
  const wrong = P.PLANET_IDS.find((id) => id !== leg.target && id !== 'earth')
  trip = T.pickDestination(trip, wrong).trip
  trip = T.pickDestination(trip, wrong).trip
  assert(T.currentLeg(trip).wrongPicks.length === 1, 'เลือกผิดดวงเดิมถูกนับสองครั้ง')
  assert(T.navHintLevel(T.currentLeg(trip)) === 1, 'ผิดครั้งแรกแล้วไม่มีคำใบ้')

  const here = T.pickDestination(trip, 'earth')
  assert(here.alreadyHere && !here.correct, 'เลือกดาวที่ยานจอดอยู่แล้วไม่บอกว่าอยู่ที่นี่แล้ว')
  assert(T.currentLeg(here.trip).wrongPicks.length === 1, 'เลือกดาวที่ยานจอดอยู่ถูกนับเป็นความผิด')

  const another = P.PLANET_IDS.find((id) => id !== leg.target && id !== 'earth' && id !== wrong)
  trip = T.pickDestination(trip, another).trip
  assert(T.navHintLevel(T.currentLeg(trip)) === 2, 'ผิดครั้งที่สองแล้ววงโคจรไม่เรืองให้เห็น')
  assert(T.legStars(T.currentLeg(trip)) === 1, 'ผิดสองครั้งแต่ยังได้มากกว่าหนึ่งดาว')
})

check('ตอบโจทย์ก่อนไปถึงดาว หรือไปช่วงถัดไปก่อนตอบเสร็จ ทำไม่ได้', () => {
  let trip = T.createTrip('order', 2, 'short')
  const leg = T.currentLeg(trip)
  const early = T.answerLeg(trip, leg.question.answer)
  assert(!early.correct && !T.currentLeg(early.trip).questionSolved, 'ตอบได้ทั้งที่ยังไม่ถึงดาว')
  trip = T.pickDestination(trip, leg.target).trip
  assert(T.advance(trip).index === 0, 'ข้ามช่วงได้ทั้งที่ยังไม่ตอบ')
  const wrong = leg.question.choices.find((choice) => choice !== leg.question.answer)
  trip = T.answerLeg(trip, wrong).trip
  trip = T.answerLeg(trip, wrong).trip
  assert(T.currentLeg(trip).wrongChoices.length === 1, 'กดตัวเลือกผิดตัวเดิมถูกนับซ้ำ')
  assert(!T.questionHintVisible(T.currentLeg(trip)), 'ผิดครั้งเดียวก็ขึ้นวิธีคิดแล้ว')
})

// ---------- สมุดตราประทับ ----------

check('สมุดที่เสียหรือเป็นของคนอื่นไม่ทำให้พัง และช่องที่เสียถูกทิ้งเป็นช่อง ๆ', () => {
  for (const raw of [null, 5, 'text', [], { owner: 'อื่น', stamps: { mars: { best: 3, visits: 1 } } }]) {
    const passport = Store.parsePassport(raw, 'ต้นกล้า')
    assert(Store.stampCount(passport) === 0 && passport.trips === 0, `อ่าน ${JSON.stringify(raw)} แล้วได้ข้อมูล`)
  }
  const mixed = Store.parsePassport(
    {
      owner: 'ต้นกล้า',
      trips: 3,
      stamps: {
        mars: { best: 3, visits: 2 },
        venus: { best: 9, visits: 1 },
        pluto: { best: 2, visits: 1 },
        earth: 'broken',
        saturn: { best: 2, visits: -1 },
      },
      bestTrip: { short: 10, full: 99 },
    },
    'ต้นกล้า',
  )
  assert(Store.stampCount(mixed) === 1 && mixed.stamps.mars.best === 3, 'ช่องที่ถูกต้องหายไป หรือช่องที่เสียหลุดเข้ามา')
  assert(mixed.trips === 3 && mixed.bestTrip.short === 10 && mixed.bestTrip.full === undefined, 'สถิติทริปอ่านผิด')
})

check('ประทับตราเก็บดาวที่ดีที่สุดไว้ ไม่เอาครั้งล่าสุดไปทับ', () => {
  let passport = Store.emptyPassport('ต้นกล้า')
  passport = Store.stampPlanet(passport, 'jupiter', 3)
  passport = Store.stampPlanet(passport, 'jupiter', 1)
  assert(passport.stamps.jupiter.best === 3 && passport.stamps.jupiter.visits === 2, 'ดาวที่ดีที่สุดถูกทับ')
  passport = Store.finishTrip(passport, 'short', { stars: 9, maxStars: 12, perfectLegs: 1, legs: [] })
  passport = Store.finishTrip(passport, 'short', { stars: 5, maxStars: 12, perfectLegs: 0, legs: [] })
  assert(passport.trips === 2 && passport.bestTrip.short === 9, 'สถิติทริปที่ดีที่สุดถูกทับ')
  const again = Store.parsePassport(JSON.parse(JSON.stringify(passport)), 'ต้นกล้า')
  assert(JSON.stringify(again) === JSON.stringify(passport), 'บันทึกแล้วอ่านกลับได้ไม่เหมือนเดิม')
})

// ---------- การวาด ----------

/**
 * ผืนผ้าใบจำลอง ทำตัวเหมือนของจริงในเรื่องที่ทำให้ฉากพัง
 * รัศมีติดลบหรือไม่ใช่ตัวเลขโยน error เหมือนเบราว์เซอร์ ส่วนพิกัดที่เป็น NaN นับไว้
 * (เบราว์เซอร์ไม่โยน แต่วาดไม่ขึ้นเงียบ ๆ ซึ่งแย่กว่า)
 */
function mockContext() {
  const state = { nan: 0, calls: 0 }
  const radius = (name, ...values) => {
    for (const value of values) {
      if (!Number.isFinite(value) || value < 0) throw new Error(`${name} ได้รัศมี ${value}`)
    }
  }
  const coords = (...values) => {
    state.calls += 1
    if (values.some((value) => !Number.isFinite(value))) state.nan += 1
  }
  const gradient = () => ({ addColorStop: () => undefined })
  const ctx = {
    state,
    set fillStyle(_) {},
    set strokeStyle(_) {},
    set globalAlpha(value) {
      if (!Number.isFinite(value)) state.nan += 1
    },
    set lineWidth(value) {
      if (!Number.isFinite(value)) state.nan += 1
    },
    set lineCap(_) {},
    set lineJoin(_) {},
    set lineDashOffset(_) {},
    set font(_) {},
    set textAlign(_) {},
    set textBaseline(_) {},
    save() {},
    restore() {},
    beginPath() {},
    closePath() {},
    fill() {},
    stroke() {},
    clip() {},
    setLineDash() {},
    translate: (x, y) => coords(x, y),
    scale: (x, y) => coords(x, y),
    drawImage: (_, x, y, w, h) => {
      coords(x, y, w, h)
      radius('drawImage', w, h)
    },
    rotate: (angle) => coords(angle),
    moveTo: (x, y) => coords(x, y),
    lineTo: (x, y) => coords(x, y),
    quadraticCurveTo: (a, b, c, d) => coords(a, b, c, d),
    fillRect: (x, y, w, h) => coords(x, y, w, h),
    fillText: (_, x, y) => coords(x, y),
    measureText: (text) => ({ width: text.length * 7 }),
    arc(x, y, r) {
      coords(x, y)
      radius('arc', r)
    },
    ellipse(x, y, rx, ry, rotation) {
      coords(x, y, rotation)
      radius('ellipse', rx, ry)
    },
    createRadialGradient(x0, y0, r0, x1, y1, r1) {
      coords(x0, y0, x1, y1)
      radius('createRadialGradient', r0, r1)
      return gradient()
    },
    createLinearGradient(x0, y0, x1, y1) {
      coords(x0, y0, x1, y1)
      return gradient()
    },
  }
  return ctx
}

function frameFor(view, overrides = {}) {
  return {
    days: 9000,
    spinSeconds: 12,
    view,
    selected: 'saturn',
    highlight: 'mars',
    stamped: ['venus'],
    ruledOut: ['uranus'],
    ship: S.parkingSpot('earth', 9000),
    shipHeading: { x: 1, y: 0.2, z: 0 },
    thrust: true,
    aim: true,
    showLabels: true,
    showOrbits: true,
    now: 5000,
    reduceMotion: false,
    pixelRatio: 2,
    ...overrides,
  }
}

check('วาดฉากได้จากมุมกล้องสุ่มสองพันมุม รวมถึงตอนซูมเข้าไปชิดดาวและอยู่ในวงแหวน', () => {
  const rng = createRng('solar-render')
  const targets = [{ x: 0, y: 0, z: 0 }, ...P.PLANETS.map((planet) => S.planetPosition(planet, 9000))]
  let drawn = 0
  for (let index = 0; index < 2000; index += 1) {
    const ctx = mockContext()
    const view = S.clampView({
      target: rng.pick(targets),
      yaw: rng.next() * Math.PI * 2,
      pitch: rng.next() * 2 - 0.5,
      distance: rng.chance(0.4) ? S.MIN_DISTANCE + rng.next() * 3 : rng.next() * 120,
    })
    const bodies = R.drawSolarSystem(ctx, VIEWPORT, frameFor(view, { days: rng.next() * 60_000 }))
    assert(ctx.state.nan === 0, `มุมที่ ${index} มีพิกัด NaN ${ctx.state.nan} ครั้ง`)
    assert(Array.isArray(bodies), 'ไม่คืนตำแหน่งดาวให้ใช้แตะเลือก')
    drawn += ctx.state.calls
  }
  assert(drawn > 0, 'ไม่ได้วาดอะไรเลย')
})

check('วาดได้ทั้งตอนปิดการเคลื่อนไหว ปิดชื่อดาว ปิดวงโคจร และไม่มียาน', () => {
  const ctx = mockContext()
  R.drawSolarSystem(
    ctx,
    { width: 360, height: 300 },
    frameFor(S.OVERVIEW, {
      reduceMotion: true,
      showLabels: false,
      showOrbits: false,
      ship: null,
      shipHeading: null,
      selected: null,
      highlight: null,
      pixelRatio: 1,
    }),
  )
  assert(ctx.state.nan === 0, 'มีพิกัด NaN')
})

check('หน้าตาน่ารักของดาววาดได้จากมุมกล้องสุ่ม ทั้งตอนตื่น หลับ และถูกเลือก ไม่มีรัศมีติดลบหรือพิกัด NaN', () => {
  const rng = createRng('solar-faces')
  const targets = [{ x: 0, y: 0, z: 0 }, ...P.PLANETS.map((planet) => S.planetPosition(planet, 9000))]
  for (let index = 0; index < 600; index += 1) {
    const ctx = mockContext()
    const view = S.clampView({
      target: rng.pick(targets),
      yaw: rng.next() * Math.PI * 2,
      pitch: rng.next() * 2 - 0.5,
      distance: rng.chance(0.5) ? S.MIN_DISTANCE + rng.next() * 3 : rng.next() * 120,
    })
    R.drawSolarSystem(
      ctx,
      VIEWPORT,
      frameFor(view, {
        days: rng.next() * 60_000,
        now: rng.next() * 100_000,
        reduceMotion: rng.chance(0.3),
        selected: rng.pick(['sun', ...P.PLANETS.map((planet) => planet.id)]),
        faces: true,
        awake: rng.chance(0.5) ? ['earth', 'saturn'] : undefined,
        // ดาวที่ถูกจิ้มเมื่อไม่นาน รวมถึงจิ้มอนาคต (นาฬิกาย้อน) กับจิ้มนานมาแล้ว
        poke: rng.chance(0.7) ? { id: rng.pick(['sun', ...P.PLANETS.map((planet) => planet.id)]), at: rng.next() * 100_000 } : null,
        shipLook: rng.chance(0.5) ? { fin: '#8b5cf6', bodyTop: '#ffffff', bodyBottom: '#c4b5fd', window: '#fcd34d' } : undefined,
        companion: rng.chance(0.5) ? { complete: true, naturalWidth: 100 } : rng.chance(0.5) ? { complete: false, naturalWidth: 0 } : null,
      }),
    )
    assert(ctx.state.nan === 0, `มุมที่ ${index} มีพิกัด NaN ${ctx.state.nan} ครั้ง`)
  }
})

check('ดาวที่เล็กบนจอเกินไปไม่ถูกวาดหน้า และกะพริบตาไม่พร้อมกันทุกดวง', () => {
  let calls = 0
  const counting = new Proxy(mockContext(), {
    get(target, key) {
      const value = target[key]
      if (typeof value !== 'function') return value
      return (...args) => {
        calls += 1
        return value.apply(target, args)
      }
    },
  })
  Faces.drawFace(counting, 50, 50, Faces.FACE_MIN_RADIUS - 1, { mood: 'happy', blink: false, now: 0, reduceMotion: false, pixelRatio: 1 })
  assert(calls === 0, 'ดาวเล็กยังถูกวาดหน้า')
  Faces.drawFace(counting, 50, 50, 40, { mood: 'sleep', blink: false, now: 0, reduceMotion: false, pixelRatio: 2 })
  assert(calls > 0, 'ดาวใหญ่ไม่ถูกวาดหน้า')
  const blinking = (now) => P.PLANETS.filter((planet) => Faces.isBlinking(now, planet.order, false)).length
  let most = 0
  for (let now = 0; now < 10_000; now += 20) most = Math.max(most, blinking(now))
  assert(most <= 2, `กะพริบพร้อมกันได้ถึง ${most} ดวง`)
  assert(!Faces.isBlinking(0, 0, true), 'ปิดการเคลื่อนไหวแล้วยังกะพริบ')
})

console.log(`ผ่าน ${passed} ข้อ`)
if (failures.length > 0) {
  console.log(`\nไม่ผ่าน ${failures.length} ข้อ`)
  failures.forEach((line, index) => console.log(`  ${index + 1}. ${line}`))
  process.exit(1)
}
console.log('ผ่านทั้งหมด')
