/**
 * ชุดทดสอบโดมสีเขียว
 *
 * สามเรื่องที่ต้องตรวจทุกครั้ง
 *
 * หนึ่ง — เลขในสมุดบัญชีต้องตรงกับสิ่งที่เกิดขึ้นจริง
 * ถ้าโจทย์บอกว่าเหลือน้ำ 82,400 ลิตร แล้วเกมไปเก็บค่าอื่น
 * เด็กที่คิดถูกจะเห็นตัวเลขบนจอไม่ตรงกับที่ตัวเองคำนวณ
 * แล้วจะเลิกเชื่อทั้งเกมและเลิกเชื่อวิธีคิดของตัวเอง
 *
 * สอง — เศรษฐกิจต้องไม่ตัน
 * ตอนพัฒนาเคยตั้งตัวเลขจนฟาร์มตันถาวรตั้งแต่วันที่ห้า โดยที่เด็กไม่ได้ทำอะไรผิด
 * จับได้เพราะจำลองการเล่นสี่สิบวันแล้วดูผล ไม่ใช่เพราะอ่านโค้ด
 * การจำลองจึงถูกเก็บไว้เป็นชุดทดสอบถาวร ไม่ใช่สคริปต์ที่ใช้แล้วทิ้ง
 *
 * สาม — รหัสฟาร์มต้องอ่านกลับได้ตรงทุกช่อง
 * เพราะมันคือสิ่งเดียวที่กันไม่ให้ฟาร์มของเด็กหายไปตอนเปลี่ยนเครื่อง
 *
 * วิธีใช้
 *   npx tsc -p tsconfig.tests.json --outDir /tmp/logic
 *   node tests/farm.test.mjs /tmp/logic
 */

import path from 'path'
import { createRequire } from 'module'

const OUT = process.argv[2]
if (!OUT) {
  console.error('ใช้: node tests/farm.test.mjs <โฟลเดอร์ JS ที่คอมไพล์แล้ว>')
  process.exit(1)
}

const require = createRequire(import.meta.url)
const load = (name) => require(path.resolve(OUT, name + '.js'))

const T = load('farm/types')
const E = load('farm/engine')
const L = load('farm/ledger')
const S = load('farm/save')

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

const clone = (value) => JSON.parse(JSON.stringify(value))

// ---------- แปลงปลูก ----------

check('ฟาร์มใหม่ต้องเริ่มด้วยแปลงเดียว แรงเต็ม และทรัพยากรไม่เกินความจุ', () => {
  const farm = E.createFarm('ใหม่', 4)
  assert(farm.day === 1, `เริ่มที่วันที่ ${farm.day}`)
  assert(farm.plots.length === 1, `เริ่มด้วย ${farm.plots.length} แปลง`)
  assert(farm.energy === T.ENERGY_PER_DAY, 'แรงไม่เต็ม')
  for (const spec of T.RESOURCES) {
    assert(
      farm.resources[spec.id] > 0 && farm.resources[spec.id] <= spec.capacity,
      `${spec.name} เริ่มที่ ${farm.resources[spec.id]} ซึ่งอยู่นอกช่วง`,
    )
  }
})

check('จำนวนช่องปลูกต้องเท่ากับกว้างคูณยาว และรั้วเท่ากับเส้นรอบรูป', () => {
  for (const size of T.PLOT_SIZES) {
    const plot = { size, planting: null }
    assert(
      E.plotCells(plot) === size.cols * size.rows,
      `แปลง ${size.cols}x${size.rows} นับช่องผิด`,
    )
    assert(
      E.plotFence(plot) === (size.cols + size.rows) * 2,
      `แปลง ${size.cols}x${size.rows} คิดรั้วผิด`,
    )
  }
})

check('ต้องมีคู่แปลงที่พื้นที่กับเส้นรอบรูปสวนกัน ไม่งั้นโจทย์เปรียบเทียบไม่มีของจริงให้เทียบ', () => {
  const plots = T.PLOT_SIZES.map((size) => ({
    area: size.cols * size.rows,
    fence: (size.cols + size.rows) * 2,
  }))
  const found = plots.some((a) =>
    plots.some((b) => a.area < b.area && a.fence >= b.fence),
  )
  assert(found, 'ทุกแปลงพื้นที่มากแล้วรั้วยาวตามกันหมด ไม่มีคู่ที่สวนกันเลย')
})

check('ปลูกแล้วต้องเสียทั้งเงินและแรง และปลูกซ้ำแปลงเดิมไม่ได้', () => {
  const farm = E.createFarm('ปลูก', 4)
  const cost = E.seedCostFor(farm.plots[0], 'tomato')
  const coins = farm.coins
  const energy = farm.energy

  assert(E.plantPlot(farm, 0, 'tomato').ok, 'ปลูกไม่ได้ทั้งที่เงินพอ')
  assert(farm.coins === coins - cost, 'เงินไม่ถูกหัก')
  assert(farm.energy === energy - T.ENERGY_COST.plant, 'แรงไม่ถูกหัก')
  assert(!E.plantPlot(farm, 0, 'tomato').ok, 'ปลูกทับแปลงที่ปลูกอยู่แล้วได้')
})

check('เงินไม่พอต้องปลูกไม่ได้ และต้องไม่มีเงินติดลบ', () => {
  const farm = E.createFarm('จน', 4)
  farm.coins = 3
  const result = E.plantPlot(farm, 0, 'pumpkin')
  assert(!result.ok, 'เงินไม่พอแต่ปลูกได้')
  assert(farm.coins === 3, 'ปลูกไม่สำเร็จแต่เงินหาย')
  assert(typeof result.reason === 'string' && result.reason.length > 0, 'ไม่มีเหตุผลบอกเด็ก')
})

check('รดน้ำได้วันละครั้ง และครบตามกำหนดแล้วต้องพร้อมเก็บเกี่ยว', () => {
  const farm = E.createFarm('รดน้ำ', 4)
  farm.coins = 9999
  E.plantPlot(farm, 0, 'lettuce')
  assert(!E.waterPlot(farm, 0).ok, 'วันที่ปลูกยังรดน้ำซ้ำได้อีก')

  const grow = T.findCrop('lettuce').growDays
  for (let day = 1; day < grow; day += 1) {
    farm.plots[0].planting.wateredToday = false
    farm.energy = T.ENERGY_PER_DAY
    assert(E.waterPlot(farm, 0).ok, `วันที่ ${day} รดน้ำไม่ได้`)
  }
  assert(E.isReady(farm.plots[0]), `รดน้ำครบ ${grow} วันแล้วยังไม่พร้อมเก็บ`)
  farm.plots[0].planting.wateredToday = false
  assert(!E.waterPlot(farm, 0).ok, 'โตเต็มที่แล้วยังรดน้ำเพิ่มได้')
})

check('แรงหมดแล้วต้องทำอะไรไม่ได้', () => {
  const farm = E.createFarm('หมดแรง', 4)
  farm.coins = 9999
  farm.energy = 0
  assert(!E.plantPlot(farm, 0, 'tomato').ok, 'แรงหมดแต่ยังปลูกได้')
})

check('เปิดแปลงเพิ่มได้ตามราคา และเปิดเกินจำนวนสูงสุดไม่ได้', () => {
  const farm = E.createFarm('ขยาย', 4)
  farm.coins = 999_999
  let guard = 0
  while (E.nextPlotCost(farm) !== null && guard < 50) {
    const before = farm.plots.length
    assert(E.unlockPlot(farm).ok, `เปิดแปลงที่ ${before + 1} ไม่ได้`)
    guard += 1
  }
  assert(farm.plots.length === T.MAX_PLOTS, `เปิดได้ ${farm.plots.length} แปลง`)
  assert(!E.unlockPlot(farm).ok, 'เปิดเกินจำนวนสูงสุดได้')
})

// ---------- คลังและการขาย ----------

check('ขายของแล้วของต้องหายจากคลังตามจำนวน และเงินเพิ่มตามราคา', () => {
  const farm = E.createFarm('ขาย', 4)
  farm.stock = { tomato: 10 }
  const coins = farm.coins
  assert(E.sellStock(farm, 'tomato', 4).ok, 'ขายไม่ได้')
  assert(farm.stock.tomato === 6, `เหลือ ${farm.stock.tomato} ผล`)
  assert(farm.coins === coins + 4 * T.findCrop('tomato').sellPrice, 'เงินไม่ตรง')
  assert(!E.sellStock(farm, 'tomato', 99).ok, 'ขายเกินที่มีได้')
  assert(farm.stock.tomato === 6, 'ขายไม่สำเร็จแต่ของหาย')
})

check('ส่งเข้าคลังอาหารแล้วของหายจากคลัง อาหารเพิ่ม และไม่ล้นถัง', () => {
  const farm = E.createFarm('อาหาร', 4)
  farm.stock = { corn: 5 }
  const before = farm.resources.food
  assert(E.depositFood(farm, 'corn', 5).ok, 'ส่งเข้าคลังไม่ได้')
  assert((farm.stock.corn ?? 0) === 0, 'ของไม่หายจากคลัง')
  assert(farm.resources.food === before + 5 * E.FOOD_PER_PRODUCE, 'อาหารเพิ่มไม่ตรง')

  farm.stock = { corn: 9999 }
  E.depositFood(farm, 'corn', 9999)
  const capacity = T.findResource('food').capacity
  assert(farm.resources.food <= capacity, `อาหารล้นถังไปที่ ${farm.resources.food}`)
})

// ---------- โดม ----------

check('รับครอบครัวเพิ่มแล้วโดมต้องใช้ทรัพยากรมากขึ้นทุกอย่าง', () => {
  const farm = E.createFarm('ครอบครัว', 4)
  const before = E.dailyConsumption(farm)
  E.acceptFamily(farm)
  const after = E.dailyConsumption(farm)
  for (const spec of T.RESOURCES) {
    assert(
      after[spec.id] === before[spec.id] + spec.perFamily,
      `${spec.name} ใช้เพิ่มไม่ตรงกับหนึ่งครอบครัว`,
    )
  }
})

check('ไฟดับแล้วเครื่องกรองน้ำและเครื่องฟอกอากาศต้องทำงานได้ครึ่งเดียว ไม่ใช่หยุดสนิท', () => {
  const farm = E.createFarm('ไฟดับ', 4)
  const normal = E.dailyProduction(farm)
  farm.resources.power = 0
  assert(E.isBrownout(farm), 'ไฟหมดแล้วเกมไม่รู้')

  const brownout = E.dailyProduction(farm)
  assert(brownout.water > 0, 'ไฟดับแล้วน้ำหยุดผลิตสนิท ซึ่งกู้กลับยากเกินไปสำหรับเด็ก')
  assert(brownout.water < normal.water, 'ไฟดับแล้วน้ำผลิตได้เท่าเดิม')
  assert(
    brownout.power === normal.power,
    'ไฟดับแล้วแผงโซลาร์ผลิตไฟไม่ได้ ซึ่งทำให้ไม่มีทางฟื้นเลย',
  )
})

check('จำนวนวันที่เหลือต้องคิดจากยอดสุทธิ และเป็นอนันต์เมื่อผลิตได้มากกว่าใช้', () => {
  const farm = E.createFarm('พยากรณ์', 4)
  const days = E.daysRemaining(farm, 'water')
  const net = E.dailyConsumption(farm).water - E.dailyProduction(farm).water
  assert(net > 0, 'ตอนเริ่มเกมน้ำไม่ได้ขาด ทำให้ทดสอบนี้ไม่ได้ทดสอบอะไร')
  assert(days === Math.floor(farm.resources.water / net), `คำนวณได้ ${days} วัน`)

  farm.buildings.purifier = 99
  assert(E.daysRemaining(farm, 'water') === Infinity, 'ผลิตเกินใช้แล้วยังบอกว่าจะหมด')
})

// ---------- สมุดบัญชี ----------

check('การวางแผนวันต้องไม่แก้ค่าในฟาร์ม และเรียกซ้ำต้องได้ผลเดิม', () => {
  const farm = E.createFarm('แผน', 5)
  farm.coins = 9999
  E.plantPlot(farm, 0, 'tomato')
  E.buyAnimal(farm, 'chicken', 5)
  E.buyFeed(farm, 37)

  const snapshot = clone(farm)
  const first = L.planDay(farm)
  const second = L.planDay(farm)
  assert(JSON.stringify(farm) === JSON.stringify(snapshot), 'วางแผนแล้วฟาร์มเปลี่ยน')
  assert(JSON.stringify(first) === JSON.stringify(second), 'วางแผนสองครั้งได้คนละผล')
})

check('แถวเก็บเกี่ยวต้องมีคำตอบเท่ากับกว้างคูณยาวเสมอ', () => {
  for (let index = 0; index < T.PLOT_SIZES.length; index += 1) {
    const farm = E.createFarm(`เก็บ-${index}`, 4)
    farm.coins = 999_999
    while (farm.plots.length <= index) E.unlockPlot(farm)

    const plot = farm.plots[index]
    plot.planting = { crop: 'tomato', watered: 99, wateredToday: true }
    const plan = L.planDay(farm)
    const row = L.buildLedger(farm, plan).find((entry) => entry.kind === 'harvest')
    assert(row, `แปลงที่ ${index + 1} ไม่มีแถวเก็บเกี่ยว`)
    assert(
      row.fields[0].answer === plot.size.cols * plot.size.rows,
      `แปลง ${plot.size.cols}x${plot.size.rows} คำตอบเป็น ${row.fields[0].answer}`,
    )
  }
})

check('แถวอาหารสัตว์ต้องเป็นการหารที่มีเศษ และผลหารคูณตัวหารบวกเศษต้องได้ตัวตั้ง', () => {
  let sawRemainder = false
  for (let feed = 1; feed <= 200; feed += 1) {
    const farm = E.createFarm('เศษ', 4)
    farm.herds = [{ animal: 'goat', count: 30, fedToday: false }]
    farm.feed = feed

    const plan = L.planDay(farm)
    const row = L.buildLedger(farm, plan).find((entry) => entry.kind === 'feed')
    assert(row, `อาหาร ${feed} กก. ไม่มีแถวอาหารสัตว์`)

    const quotient = row.fields[0].answer
    const remainder = row.fields[1].answer
    const perAnimal = T.findAnimal('goat').feedPerDay
    assert(
      quotient * perAnimal + remainder === feed,
      `อาหาร ${feed}: ${quotient} × ${perAnimal} + ${remainder} ไม่เท่ากับ ${feed}`,
    )
    assert(remainder >= 0 && remainder < perAnimal, `เศษ ${remainder} อยู่นอกช่วง`)
    if (remainder > 0) sawRemainder = true
  }
  assert(sawRemainder, 'ไม่เจอเศษเลยสักครั้ง แถวนี้จึงไม่ได้ฝึกการหารที่มีเศษ')
})

check('แถวทรัพยากรต้องเป็นโจทย์สองขั้นตอนที่คำตอบตรงกับค่าที่เกมนำไปใช้', () => {
  for (let day = 1; day <= 8; day += 1) {
    const farm = E.createFarm('ทรัพยากร', 4)
    farm.day = day
    const plan = L.planDay(farm)
    const row = L.buildLedger(farm, plan).find((entry) => entry.kind === 'resource')
    assert(row, `วันที่ ${day} ไม่มีแถวทรัพยากร`)

    const id = row.id.replace('resource-', '')
    const entry = plan.resources.find((item) => item.id === id)
    assert(
      row.fields[0].answer === entry.before + entry.production - entry.consumption,
      `วันที่ ${day} คำตอบไม่เท่ากับ ก่อน + ผลิต − ใช้`,
    )
    assert(row.fields[0].answer === entry.raw, `วันที่ ${day} คำตอบไม่ตรงกับค่าที่เก็บ`)
  }
})

check('ทุกวันต้องหมุนไปถามทรัพยากรคนละอย่าง ไม่ใช่ถามอย่างเดิมซ้ำ ๆ', () => {
  const seen = new Set()
  for (let day = 1; day <= T.RESOURCES.length; day += 1) {
    const farm = E.createFarm('หมุน', 4)
    farm.day = day
    const plan = L.planDay(farm)
    const row = L.buildLedger(farm, plan).find((entry) => entry.kind === 'resource')
    seen.add(row.id)
  }
  assert(seen.size === T.RESOURCES.length, `${T.RESOURCES.length} วันถามซ้ำเหลือ ${seen.size} แบบ`)
})

check('คำตอบทุกช่องต้องเป็นจำนวนเต็มไม่ติดลบ เพราะ ป.4 ยังไม่เรียนจำนวนเต็มลบ', () => {
  for (let day = 1; day <= 30; day += 1) {
    for (const grade of [4, 5, 6]) {
      const farm = E.createFarm(`จำนวน-${day}`, grade)
      farm.day = day
      farm.coins = 9999
      farm.herds = [{ animal: 'chicken', count: 6, fedToday: false }]
      farm.feed = 20 + day
      farm.plots[0].planting = { crop: 'corn', watered: 99, wateredToday: true }

      for (const row of L.buildLedger(farm, L.planDay(farm))) {
        for (const field of row.fields) {
          assert(
            Number.isInteger(field.answer),
            `วันที่ ${day} ป.${grade} แถว ${row.id} ช่อง ${field.key} ไม่ใช่จำนวนเต็ม (${field.answer})`,
          )
          assert(
            field.answer >= 0,
            `วันที่ ${day} ป.${grade} แถว ${row.id} คำตอบติดลบ (${field.answer})`,
          )
        }
      }
    }
  }
})

check('แถวร้อยละต้องมีเฉพาะ ป.6 และแถวค่าเฉลี่ยต้องไม่มีใน ป.4', () => {
  const build = (grade) => {
    const farm = E.createFarm('ชั้น', grade)
    farm.herds = [{ animal: 'chicken', count: 6, fedToday: false }]
    farm.feed = 18
    return L.buildLedger(farm, L.planDay(farm)).map((row) => row.kind)
  }
  assert(!build(4).includes('percent'), 'ป.4 เจอแถวร้อยละ')
  assert(!build(5).includes('percent'), 'ป.5 เจอแถวร้อยละ')
  assert(build(6).includes('percent'), 'ป.6 ไม่มีแถวร้อยละ')
  assert(!build(4).includes('average'), 'ป.4 เจอแถวค่าเฉลี่ย')
})

check('แถวพยากรณ์ต้องโผล่เฉพาะตอนทรัพยากรตึงจริง', () => {
  const relaxed = E.createFarm('สบาย', 4)
  relaxed.buildings = { solar: 40, purifier: 40, scrubber: 40 }
  relaxed.resources.food = T.findResource('food').capacity
  const relaxedRows = L.buildLedger(relaxed, L.planDay(relaxed))
  assert(
    !relaxedRows.some((row) => row.kind === 'forecast'),
    'ทุกอย่างเหลือเฟือแต่ยังถามว่าอยู่ได้อีกกี่วัน',
  )

  const tight = E.createFarm('ตึง', 4)
  tight.resources.food = 300
  const tightRows = L.buildLedger(tight, L.planDay(tight))
  assert(
    tightRows.some((row) => row.kind === 'forecast'),
    'อาหารเหลือน้อยมากแต่ไม่มีแถวพยากรณ์',
  )
})

check('ปิดวันแล้วต้องขึ้นวันใหม่ แรงเต็ม และทุกแปลงกลับมารดน้ำได้อีก', () => {
  const farm = E.createFarm('ปิดวัน', 4)
  farm.coins = 9999
  E.plantPlot(farm, 0, 'tomato')

  const plan = L.planDay(farm)
  L.closeDay(farm, plan, false)
  assert(farm.day === 2, `ขึ้นวันที่ ${farm.day}`)
  assert(farm.energy === T.ENERGY_PER_DAY, 'แรงไม่เต็ม')
  assert(farm.plots[0].planting.wateredToday === false, 'เช้าใหม่แล้วยังรดน้ำไม่ได้')
})

check('ปิดบัญชีถูกทุกช่องต้องได้แรงเพิ่ม และตอบผิดต้องไม่ถูกหักแรง', () => {
  const perfect = E.createFarm('แม่น', 4)
  L.closeDay(perfect, L.planDay(perfect), true)
  assert(
    perfect.energy === T.ENERGY_PER_DAY + T.ENERGY_BONUS_PERFECT_LEDGER,
    `ตอบถูกหมดได้แรง ${perfect.energy}`,
  )
  assert(perfect.perfectDays === 1, 'ไม่ได้นับวันที่ตอบถูกหมด')

  const missed = E.createFarm('พลาด', 4)
  L.closeDay(missed, L.planDay(missed), false)
  assert(missed.energy === T.ENERGY_PER_DAY, `ตอบผิดแล้วเหลือแรง ${missed.energy}`)
  assert(missed.perfectDays === 0, 'ตอบผิดแต่ยังนับเป็นวันที่แม่น')
})

check('ค่าที่เกมนำไปใช้ต้องมาจากแผน ไม่ใช่จากคำตอบของเด็ก', () => {
  const a = E.createFarm('เหมือนกัน', 4)
  const b = E.createFarm('เหมือนกัน', 4)
  a.coins = 9999
  b.coins = 9999
  E.plantPlot(a, 0, 'corn')
  E.plantPlot(b, 0, 'corn')

  // ปิดวันโดยบอกว่าตอบถูกหมด กับบอกว่าตอบผิดหมด ผลกับฟาร์มต้องต่างกันแค่แรง
  L.closeDay(a, L.planDay(a), true)
  L.closeDay(b, L.planDay(b), false)

  assert(
    JSON.stringify(a.resources) === JSON.stringify(b.resources),
    'ตอบผิดแล้วทรัพยากรของโดมเปลี่ยนไปด้วย ซึ่งเป็นการลงโทษซ้ำ',
  )
  assert(
    JSON.stringify(a.stock) === JSON.stringify(b.stock),
    'ตอบผิดแล้วผลผลิตหายไป',
  )
  assert(a.energy > b.energy, 'ตอบถูกหมดแล้วไม่ได้อะไรเพิ่มเลย')
})

check('เก็บเกี่ยวตอนปิดวันแล้ว แปลงต้องว่างและของต้องเข้าคลังครบ', () => {
  const farm = E.createFarm('เก็บเกี่ยว', 4)
  farm.plots[0].planting = { crop: 'wheat', watered: 99, wateredToday: true }
  const cells = E.plotCells(farm.plots[0])

  const plan = L.planDay(farm)
  L.closeDay(farm, plan, true)
  assert(farm.plots[0].planting === null, 'เก็บเกี่ยวแล้วแปลงยังไม่ว่าง')
  assert(farm.stock.wheat === cells, `เข้าคลัง ${farm.stock.wheat} จาก ${cells} ต้น`)
})

check('อาหารสัตว์ที่เหลือต้องถูกเก็บไว้ใช้วันรุ่งขึ้น ไม่หายไปเฉย ๆ', () => {
  const farm = E.createFarm('เศษอาหาร', 4)
  farm.herds = [{ animal: 'goat', count: 2, fedToday: false }]
  farm.feed = 20

  const plan = L.planDay(farm)
  const used = plan.feeding[0].fed * plan.feeding[0].perAnimal
  L.closeDay(farm, plan, true)
  assert(farm.feed === 20 - used, `เหลืออาหาร ${farm.feed} ควรเป็น ${20 - used}`)
  assert(farm.feed > 0, 'เทสต์นี้ต้องมีอาหารเหลือถึงจะทดสอบได้')
})

// ---------- เหตุการณ์ ----------

check('เหตุการณ์ประจำวันต้องซ้ำเดิมเมื่อ seed และวันเดิม และต่างกันเมื่อวันต่าง', () => {
  const farm = E.createFarm('เหตุการณ์', 4)
  const first = L.eventForDay(farm)
  assert(first.id === L.eventForDay(farm).id, 'วันเดิมได้คนละเหตุการณ์')

  const seen = new Set()
  for (let day = 1; day <= 40; day += 1) {
    farm.day = day
    seen.add(L.eventForDay(farm).id)
  }
  assert(seen.size >= 3, `สี่สิบวันเจอเหตุการณ์แค่ ${seen.size} แบบ`)
})

// ---------- รหัสฟาร์ม ----------

check('รหัสฟาร์มต้องอ่านกลับได้ตรงทุกช่อง', () => {
  for (let index = 0; index < 40; index += 1) {
    const farm = E.createFarm(`code-${index}`, [4, 5, 6][index % 3])
    farm.coins = 20_000
    for (let step = 0; step < index % 5; step += 1) E.unlockPlot(farm)
    farm.plots.forEach((plot, position) => {
      if ((position + index) % 3 !== 0) E.plantPlot(farm, position, T.CROPS[position % T.CROPS.length].id)
    })
    E.buyAnimal(farm, 'chicken', 1 + (index % 7))
    if (index % 2 === 0) E.buyAnimal(farm, 'goat', 1 + (index % 3))
    E.buyFeed(farm, 10 + index)
    E.buyBuilding(farm, 'solar')
    farm.stock = { tomato: index + 1, [E.productKey('chicken')]: (index % 6) + 1 }
    farm.day = index + 1

    const decoded = S.decodeFarm(S.encodeFarm(farm))
    assert(decoded.ok, `รอบที่ ${index} อ่านรหัสไม่ได้: ${decoded.reason}`)
    assert(
      JSON.stringify(decoded.farm) === JSON.stringify(farm),
      `รอบที่ ${index} อ่านกลับแล้วไม่ตรง`,
    )
  }
})

check('รหัสฟาร์มต้องสั้นพอที่เด็กจะจดใส่สมุดได้', () => {
  const farm = E.createFarm('ยาว', 6)
  farm.coins = 99_999
  while (E.nextPlotCost(farm) !== null) E.unlockPlot(farm)
  farm.plots.forEach((_, index) => E.plantPlot(farm, index, 'pumpkin'))
  E.buyAnimal(farm, 'chicken', 99)
  E.buyAnimal(farm, 'goat', 99)
  E.buyAnimal(farm, 'fish', 99)
  farm.stock = { tomato: 999, lettuce: 999, corn: 999 }

  const code = S.encodeFarm(farm)
  assert(code.length <= 200, `ฟาร์มที่ใหญ่ที่สุดได้รหัสยาว ${code.length} ตัวอักษร`)
})

check('รหัสที่ถูกแก้ ถูกตัด หรือไม่ใช่รหัสฟาร์ม ต้องถูกปฏิเสธพร้อมบอกเหตุผลเป็นภาษาไทย', () => {
  const farm = E.createFarm('ตรวจ', 4)
  const code = S.encodeFarm(farm)

  const broken = [
    '',
    'สวัสดีครับ',
    code.slice(0, code.length - 4),
    code.replace('DOME1', 'DOME9'),
    code.replace(/~[a-z0-9]+$/, '~zzzzzz'),
  ]
  for (const entry of broken) {
    const result = S.decodeFarm(entry)
    assert(!result.ok, `รหัสพัง "${entry.slice(0, 20)}" กลับอ่านได้`)
    assert(
      typeof result.reason === 'string' && result.reason.length > 0,
      'ปฏิเสธแล้วไม่บอกเหตุผล',
    )
  }
})

check('ข้อความมั่ว ๆ ต้องไม่ทำให้ตัวอ่านรหัสพัง', () => {
  const junk = ['DOME1', 'DOME1~~~~~~~~', 'DOME1~a~b~c~d~e~f~g~h', '~'.repeat(50), 'DOME1~'.repeat(9)]
  for (const entry of junk) {
    let result
    try {
      result = S.decodeFarm(entry)
    } catch (error) {
      throw new Error(`ข้อความ "${entry.slice(0, 20)}" ทำให้โยน error: ${error.message}`)
    }
    assert(typeof result.ok === 'boolean', 'ผลลัพธ์ไม่ใช่รูปแบบที่ตกลงไว้')
  }
})

check('รหัสที่ระบุทรัพยากรเกินความจุ ต้องถูกดึงกลับมาที่เพดาน', () => {
  const farm = E.createFarm('ล้น', 4)
  const inflated = S.encodeFarm({
    ...farm,
    resources: { power: 9_999_999, water: 9_999_999, air: 9_999_999, food: 9_999_999 },
  })
  const decoded = S.decodeFarm(inflated)
  assert(decoded.ok, 'อ่านรหัสไม่ได้')
  for (const spec of T.RESOURCES) {
    assert(
      decoded.farm.resources[spec.id] === spec.capacity,
      `${spec.name} ไม่ถูกดึงกลับมาที่เพดาน`,
    )
  }
})

// ---------- สมดุลของเกม ----------

/**
 * จำลองการเล่นหนึ่งรอบ
 *
 * ไม่ได้พยายามเล่นให้เก่งที่สุด แต่เล่นแบบที่เด็กที่ตั้งใจน่าจะเล่น
 * คือรดน้ำทุกวัน ปลูกซ้ำเมื่อแปลงว่าง ส่งอาหารเข้าคลังเมื่อใกล้หมด
 * และลงทุนกับอาคารเมื่อเห็นว่าทรัพยากรจะไม่พอ
 */
function simulate(days, options = {}) {
  const farm = E.createFarm(options.seed ?? 'สมดุล', 4)
  const shortages = []

  for (let step = 0; step < days; step += 1) {
    farm.plots.forEach((plot, index) => {
      if (plot.planting && !E.isReady(plot)) E.waterPlot(farm, index)
    })
    farm.plots.forEach((plot, index) => {
      if (plot.planting) return
      const order = E.daysRemaining(farm, 'food') < 12 ? T.CROPS : [...T.CROPS].reverse()
      for (const crop of order) {
        if (E.plantPlot(farm, index, crop.id).ok) break
      }
    })

    for (const key of Object.keys(farm.stock)) {
      let have = farm.stock[key]
      if (have <= 0) continue
      if (T.CROPS.some((crop) => crop.id === key) && E.daysRemaining(farm, 'food') < 12) {
        const spec = T.findResource('food')
        const want = Math.max(
          0,
          Math.min(spec.capacity, spec.perFamily * farm.families * 20) - farm.resources.food,
        )
        const send = Math.min(have, Math.ceil(want / E.FOOD_PER_PRODUCE))
        if (send > 0) {
          E.depositFood(farm, key, send)
          have -= send
        }
      }
      if (have > 0) E.sellStock(farm, key, have)
    }

    if (!options.careless) {
      for (const building of T.BUILDINGS) {
        if (
          E.daysRemaining(farm, building.produces) < 10 &&
          farm.coins > building.cost + 300
        ) {
          E.buyBuilding(farm, building.id)
        }
      }
      const plotCost = E.nextPlotCost(farm)
      if (plotCost !== null && farm.coins > plotCost + 400) E.unlockPlot(farm)
      if (T.RESOURCES.every((spec) => E.daysRemaining(farm, spec.id) > 15)) {
        E.acceptFamily(farm)
      }
    }

    L.closeDay(farm, L.planDay(farm), true)
    for (const spec of T.RESOURCES) {
      if (farm.resources[spec.id] <= 0) shortages.push({ day: farm.day - 1, id: spec.id })
    }
  }
  return { farm, shortages }
}

check('เล่นแบบตั้งใจสามสิบวัน ต้องไม่มีทรัพยากรไหนหมด และฟาร์มต้องโตขึ้น', () => {
  const { farm, shortages } = simulate(30)
  assert(
    shortages.length === 0,
    `ทรัพยากรหมด ${shortages.length} ครั้ง ครั้งแรกวันที่ ${shortages[0]?.day} (${shortages[0]?.id})`,
  )
  assert(farm.plots.length > 1, `เล่นสามสิบวันแล้วยังมีแปลงเดียว`)
  assert(farm.coins > T.STARTING_COINS, `เงินลดจาก ${T.STARTING_COINS} เหลือ ${farm.coins}`)
})

check('เล่นสิบวันแรกซึ่งเท่ากับหนึ่งคาบเรียน ต้องเห็นความก้าวหน้าและไม่มีอะไรหมด', () => {
  const { farm, shortages } = simulate(10)
  assert(shortages.length === 0, `หนึ่งคาบแล้วทรัพยากรหมดตั้งแต่วันที่ ${shortages[0]?.day}`)
  assert(farm.day === 11, `เล่นสิบวันแล้วอยู่วันที่ ${farm.day}`)
  assert(
    farm.coins > T.STARTING_COINS || farm.plots.length > 1,
    'จบหนึ่งคาบแล้วไม่มีอะไรคืบหน้าเลย',
  )
})

check('เด็กที่สนใจแต่ปลูกผัก ไม่สนใจโดมเลย ต้องอยู่รอดครบหนึ่งคาบ', () => {
  const { shortages } = simulate(10, { careless: true, seed: 'ไม่สน' })
  assert(
    shortages.length === 0,
    `ไม่ดูแลโดมเลยแล้วพังตั้งแต่วันที่ ${shortages[0]?.day} ซึ่งเร็วเกินไปสำหรับเด็ก`,
  )
})

check('ทุก seed ต้องเล่นได้ ไม่มี seed ที่ตันตั้งแต่ต้น', () => {
  for (let index = 0; index < 12; index += 1) {
    const { farm, shortages } = simulate(20, { seed: `ห้อง-${index}` })
    assert(
      shortages.length === 0,
      `seed ${index} ทรัพยากรหมดวันที่ ${shortages[0]?.day}`,
    )
    assert(farm.coins > 0, `seed ${index} เงินหมดเกลี้ยง`)
  }
})

console.log(`ผ่าน ${passed} ข้อ`)
if (failures.length > 0) {
  console.log(`\nไม่ผ่าน ${failures.length} ข้อ`)
  failures.forEach((line, index) => console.log(`  ${index + 1}. ${line}`))
  process.exit(1)
}
console.log('ผ่านทั้งหมด')
