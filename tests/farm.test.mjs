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
const M = load('farm/market')
const R = load('math/rng')

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
  assert(
    farm.coins === coins + 4 * M.marketPrice(farm, 'tomato'),
    `เงินไม่ตรงกับราคาตลาดของวันนั้น (ราคาวันนี้ ${M.marketPrice(farm, 'tomato')})`,
  )
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

check('ฟาร์มที่ทรัพยากรหมดแล้ว ต้องยังปิดวันได้ ไม่ใช่ค้างเพราะคำตอบติดลบ', () => {
  /*
   * เคยเป็นบั๊กจริง ช่องกรอกคำตอบรับเฉพาะตัวเลข พอทรัพยากรติดลบ
   * เด็กจึงพิมพ์คำตอบที่ถูกไม่ได้เลย แล้วปิดวันไม่ได้ตลอดกาล
   * เกมค้างถาวรโดยที่เด็กไม่ได้ทำอะไรผิด
   */
  for (const spec of T.RESOURCES) {
    for (let day = 1; day <= T.RESOURCES.length; day += 1) {
      const farm = E.createFarm('หมดเกลี้ยง', 6)
      farm.day = day
      for (const other of T.RESOURCES) farm.resources[other.id] = 0
      farm.herds = [{ animal: 'goat', count: 4, fedToday: false }]
      farm.feed = 9

      const rows = L.buildLedger(farm, L.planDay(farm))
      for (const row of rows) {
        for (const field of row.fields) {
          assert(
            Number.isInteger(field.answer) && field.answer >= 0,
            `${spec.name} วันที่ ${day} แถว ${row.id} ตอบเป็น ${field.answer} ซึ่งพิมพ์ลงช่องไม่ได้`,
          )
        }
      }
    }
  }
})

check('วันที่ทรัพยากรไม่พอ ต้องถามว่าขาดเท่าไร และคำตอบต้องตรงกับส่วนที่ขาดจริง', () => {
  const farm = E.createFarm('ขาด', 4)
  farm.day = 2
  farm.resources.water = 0

  const plan = L.planDay(farm)
  const entry = plan.resources.find((item) => item.id === 'water')
  assert(entry.raw < 0, 'ตั้งค่าแล้วน้ำยังไม่ติดลบ ทดสอบนี้จึงไม่ได้ทดสอบอะไร')

  const row = L.buildLedger(farm, plan).find((item) => item.kind === 'resource')
  assert(row.fields[0].answer === -entry.raw, `ถามส่วนที่ขาดแล้วได้ ${row.fields[0].answer}`)
  assert(row.prompt.includes('ขาด'), 'ไม่ได้เปลี่ยนคำถามเป็นการถามส่วนที่ขาด')
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

// ---------- ตลาด ----------

check('ราคาต้องซ้ำเดิมเมื่อ seed และวันเดิม และเปลี่ยนไปตามวัน', () => {
  const farm = E.createFarm('ราคา', 4)
  assert(
    M.marketPrice(farm, 'tomato') === M.marketPrice(farm, 'tomato'),
    'วันเดิมได้คนละราคา',
  )

  const seen = new Set()
  for (let day = 1; day <= 40; day += 1) {
    farm.day = day
    seen.add(M.marketPrice(farm, 'tomato'))
  }
  assert(seen.size >= 3, `สี่สิบวันราคาต่างกันแค่ ${seen.size} แบบ`)
})

check('ราคาทุกวันต้องเป็นจำนวนเต็มบวก ไม่งั้นโจทย์การคูณจะมีทศนิยมโผล่มา', () => {
  for (const crop of T.CROPS) {
    for (let day = 1; day <= 60; day += 1) {
      const farm = E.createFarm('เต็ม', 4)
      farm.day = day
      const price = M.marketPrice(farm, crop.id)
      assert(Number.isInteger(price), `${crop.name} วันที่ ${day} ราคาเป็น ${price}`)
      assert(price > 0, `${crop.name} วันที่ ${day} ราคาไม่เป็นบวก`)
    }
  }
})

check('ราคาเฉลี่ยระยะยาวต้องใกล้เคียงราคาปกติ ไม่ทำให้เศรษฐกิจเฟ้อหรือฝืด', () => {
  for (const crop of T.CROPS) {
    let total = 0
    const days = 400
    for (let day = 1; day <= days; day += 1) {
      const farm = E.createFarm('เฉลี่ย', 4)
      farm.day = day
      total += M.marketPrice(farm, crop.id)
    }
    const average = total / days
    const drift = Math.abs(average - crop.sellPrice) / crop.sellPrice
    assert(drift < 0.06, `${crop.name} เฉลี่ย ${average.toFixed(1)} ต่างจากปกติ ${(drift * 100).toFixed(1)}%`)
  }
})

check('ของแปรรูปและผลผลิตจากสัตว์ต้องราคานิ่ง ไม่ขึ้นลงตามวัน', () => {
  const keys = [
    ...T.RECIPES.map((recipe) => T.craftKey(recipe.id)),
    ...T.ANIMALS.map((animal) => E.productKey(animal.id)),
  ]
  for (const key of keys) {
    const prices = new Set()
    for (let day = 1; day <= 30; day += 1) {
      const farm = E.createFarm('นิ่ง', 4)
      farm.day = day
      prices.add(M.marketPrice(farm, key))
    }
    assert(prices.size === 1, `${key} ราคาขึ้นลง ${prices.size} แบบ ทั้งที่ควรนิ่ง`)
  }
})

// ---------- โรงแปรรูป ----------

check('สั่งแปรรูปแล้ววัตถุดิบต้องถูกตัดทันที และผลิตภัณฑ์เข้าคลังตอนปิดวัน', () => {
  const farm = E.createFarm('แปรรูป', 4)
  farm.kitchens = 1
  farm.stock = { tomato: 30 }

  assert(E.startCraft(farm, 'sauce', 5).ok, 'สั่งแปรรูปไม่ได้')
  assert(farm.stock.tomato === 30 - 5 * T.findRecipe('sauce').inputPerUnit, 'วัตถุดิบไม่ถูกตัด')
  assert((farm.stock[T.craftKey('sauce')] ?? 0) === 0, 'ผลิตภัณฑ์เสร็จก่อนปิดวัน')

  L.closeDay(farm, L.planDay(farm), true)
  assert(farm.stock[T.craftKey('sauce')] === 5, 'ปิดวันแล้วผลิตภัณฑ์ไม่เข้าคลัง')
  assert(farm.crafting.length === 0, 'ปิดวันแล้วงานยังค้างอยู่')
})

check('ไม่มีโรงแปรรูป หรือวัตถุดิบไม่พอ ต้องสั่งไม่ได้และของต้องไม่หาย', () => {
  const none = E.createFarm('ไม่มีครัว', 4)
  none.stock = { tomato: 100 }
  assert(!E.startCraft(none, 'sauce', 1).ok, 'ไม่มีโรงแปรรูปแต่สั่งได้')
  assert(none.stock.tomato === 100, 'สั่งไม่สำเร็จแต่ของหาย')

  const short = E.createFarm('ของไม่พอ', 4)
  short.kitchens = 1
  short.stock = { tomato: 3 }
  assert(!E.startCraft(short, 'sauce', 1).ok, 'วัตถุดิบไม่พอแต่สั่งได้')
  assert(short.stock.tomato === 3, 'สั่งไม่สำเร็จแต่ของหาย')
})

check('กำลังของโรงแปรรูปต้องจำกัดจำนวนต่อวัน และเพิ่มขึ้นตามจำนวนโรง', () => {
  const farm = E.createFarm('กำลัง', 4)
  farm.kitchens = 1
  farm.stock = { tomato: 999 }
  assert(E.craftCapacity(farm) === T.KITCHEN_CAPACITY, 'กำลังหนึ่งโรงไม่ตรง')

  assert(E.startCraft(farm, 'sauce', T.KITCHEN_CAPACITY).ok, 'ทำเต็มกำลังไม่ได้')
  assert(!E.startCraft(farm, 'sauce', 1).ok, 'ทำเกินกำลังได้')

  farm.kitchens = 2
  assert(E.craftCapacity(farm) === T.KITCHEN_CAPACITY * 2, 'สองโรงกำลังไม่เพิ่ม')
  assert(E.startCraft(farm, 'sauce', 1).ok, 'สร้างเพิ่มแล้วยังทำไม่ได้')
})

check('ยกเลิกงานแปรรูปแล้ววัตถุดิบต้องคืนครบ', () => {
  const farm = E.createFarm('ยกเลิก', 4)
  farm.kitchens = 1
  farm.stock = { corn: 40 }
  const before = farm.stock.corn

  E.startCraft(farm, 'roasted', 4)
  assert(farm.stock.corn < before, 'สั่งแล้ววัตถุดิบไม่ถูกตัด')
  assert(E.cancelCraft(farm, 'roasted').ok, 'ยกเลิกไม่ได้')
  assert(farm.stock.corn === before, `คืนของแล้วเหลือ ${farm.stock.corn} จาก ${before}`)
  assert(farm.crafting.length === 0, 'ยกเลิกแล้วงานยังอยู่')
})

check('แปรรูปต้องได้กำไรเสมอ ไม่ว่าราคาวัตถุดิบวันนั้นจะแพงแค่ไหน', () => {
  /*
   * ถ้าวันหนึ่งมีคนปรับราคาจนแปรรูปแล้วขาดทุน คำตอบในสมุดบัญชีจะติดลบ
   * แล้วช่องกรอกที่รับเฉพาะตัวเลขจะทำให้ปิดวันไม่ได้ตลอดกาล
   * เคยเกิดมาแล้วกับแถวทรัพยากร ข้อนี้จึงเฝ้าไว้ไม่ให้เกิดซ้ำที่แถวแปรรูป
   */
  for (const recipe of T.RECIPES) {
    for (let day = 1; day <= 40; day += 1) {
      const farm = E.createFarm('กำไร', 4)
      farm.day = day
      const rawValue = recipe.inputPerUnit * M.marketPrice(farm, recipe.input)
      assert(
        recipe.price > rawValue,
        `${recipe.name} วันที่ ${day} ขายสดได้ ${rawValue} แต่แปรรูปได้แค่ ${recipe.price}`,
      )
    }
  }
})

check('แถวแปรรูปในสมุดบัญชีต้องคำนวณส่วนต่างถูกต้อง', () => {
  const farm = E.createFarm('แถวแปรรูป', 4)
  farm.kitchens = 1
  farm.stock = { wheat: 40 }
  E.startCraft(farm, 'bread', 4)

  const plan = L.planDay(farm)
  const craft = plan.crafts[0]
  const recipe = T.findRecipe('bread')

  assert(craft.inputsUsed === 4 * recipe.inputPerUnit, 'วัตถุดิบที่ใช้ไม่ตรง')
  assert(craft.craftValue === 4 * recipe.price, 'มูลค่าผลิตภัณฑ์ไม่ตรง')
  assert(craft.rawValue === craft.inputsUsed * craft.inputPrice, 'มูลค่าของสดไม่ตรง')
  assert(craft.gain === craft.craftValue - craft.rawValue, 'ส่วนต่างไม่ตรง')

  const row = L.buildLedger(farm, plan).find((entry) => entry.kind === 'craft')
  assert(row, 'ไม่มีแถวแปรรูปในสมุดบัญชี')
  assert(row.fields[0].answer === craft.inputsUsed, 'ช่องวัตถุดิบตอบผิด')
  assert(row.fields[1].answer === craft.gain, 'ช่องส่วนต่างตอบผิด')
})

check('แถวร้อยละของการแปรรูปต้องมีเฉพาะ ป.6', () => {
  const build = (grade) => {
    const farm = E.createFarm('ชั้นแปรรูป', grade)
    farm.kitchens = 1
    farm.stock = { tomato: 40 }
    E.startCraft(farm, 'sauce', 4)
    return L.buildLedger(farm, L.planDay(farm)).map((row) => row.id)
  }
  assert(!build(4).some((id) => id.startsWith('craft-percent')), 'ป.4 เจอแถวร้อยละของการแปรรูป')
  assert(build(6).some((id) => id.startsWith('craft-percent')), 'ป.6 ไม่มีแถวร้อยละของการแปรรูป')
})

check('รหัสฟาร์มต้องเก็บโรงแปรรูปและงานที่สั่งค้างไว้', () => {
  const farm = E.createFarm('เก็บครัว', 5)
  farm.kitchens = 2
  farm.stock = { tomato: 40, corn: 40 }
  E.startCraft(farm, 'sauce', 3)
  E.startCraft(farm, 'roasted', 2)

  const decoded = S.decodeFarm(S.encodeFarm(farm))
  assert(decoded.ok, `อ่านรหัสไม่ได้: ${decoded.reason}`)
  assert(decoded.farm.kitchens === 2, 'จำนวนโรงแปรรูปหาย')
  assert(
    JSON.stringify(decoded.farm.crafting) === JSON.stringify(farm.crafting),
    'งานแปรรูปที่สั่งค้างไว้ไม่ตรง',
  )
})

check('รหัสรุ่นเก่าที่ยังไม่มีโรงแปรรูป ต้องยังอ่านได้ และได้ฟาร์มที่ถูกต้อง', () => {
  /*
   * รหัสฟาร์มคือสิ่งเดียวที่กันไม่ให้ฟาร์มของเด็กหาย
   * การทำให้รหัสที่จดไว้เมื่อสัปดาห์ก่อนใช้ไม่ได้ คือการทำลายสิ่งที่มันมีไว้ป้องกันพอดี
   *
   * สร้างรหัสรุ่นเก่าขึ้นมาเองที่นี่ แทนการฝังข้อความตายตัวไว้
   * เพราะรหัสตายตัวจะใช้ไม่ได้ทันทีที่มีการเพิ่มพืชหรืออาคาร ซึ่งเป็นเรื่องปกติ
   * แล้ววันนั้นคนแก้จะลบเทสต์ข้อนี้ทิ้งเพราะคิดว่ามันพัง ทั้งที่มันกำลังทำงาน
   */
  // ใช้ seed แบบที่เกมสร้างจริง คือตัวเลขล้วนจากเวลาปัจจุบัน
  const modern = E.createFarm('1735689600000', 5)
  modern.coins = 9_999
  E.plantPlot(modern, 0, 'corn')
  E.buyAnimal(modern, 'chicken', 3)
  modern.day = 12
  modern.stock = { tomato: 7 }

  // ถอดรหัสรุ่นใหม่ออกเป็นส่วน ๆ แล้วประกอบกลับเป็นรูปแบบรุ่นเก่า
  const parts = S.encodeFarm(modern).split('~')
  const head = parts[1].split('.').slice(0, 9).join('.')
  const body = [head, parts[2], parts[3], parts[4], parts[5], parts[6], parts[8]].join('~')
  const legacy = `DOME1~${body}~${R.hashSeed(body).toString(36).slice(0, 6)}`

  const decoded = S.decodeFarm(legacy)
  assert(decoded.ok, `อ่านรหัสรุ่นเก่าไม่ได้: ${decoded.reason}`)
  assert(decoded.farm.kitchens === 0, 'รหัสรุ่นเก่าควรได้ฟาร์มที่ยังไม่มีโรงแปรรูป')
  assert(decoded.farm.crafting.length === 0, 'รหัสรุ่นเก่าไม่ควรมีงานแปรรูปค้าง')
  assert(decoded.farm.day === 12, `วันที่เพี้ยนเป็น ${decoded.farm.day}`)
  assert(decoded.farm.coins === modern.coins, 'เหรียญเพี้ยน')
  assert(decoded.farm.seed === modern.seed, `seed เพี้ยนเป็น ${decoded.farm.seed}`)
  assert(
    JSON.stringify(decoded.farm.plots) === JSON.stringify(modern.plots),
    'แปลงปลูกเพี้ยน',
  )
  assert(decoded.farm.stock.tomato === 7, 'คลังเพี้ยน')
})

check('seed ที่มีอักขระนอกเหนือจากตัวเลขและอังกฤษ ต้องถูกแทนที่อย่างตั้งใจ', () => {
  /*
   * seed ถูกใช้สุ่มเหตุการณ์และราคาประจำวัน ถ้ามันเปลี่ยนไปเงียบ ๆ ตอนกู้รหัส
   * ฟาร์มที่กู้กลับมาจะเจอเหตุการณ์และราคาคนละชุดกับของเดิม
   *
   * เกมสร้าง seed จากเวลาปัจจุบันซึ่งเป็นตัวเลขล้วนอยู่แล้ว จึงไม่กระทบการเล่นจริง
   * ข้อนี้มีไว้บันทึกว่าเป็นพฤติกรรมที่ตั้งใจ ไม่ใช่ความบังเอิญที่ไม่มีใครรู้
   */
  const thai = E.createFarm('ห้องเรียนป4', 4)
  const decoded = S.decodeFarm(S.encodeFarm(thai))
  assert(decoded.ok, 'อ่านรหัสไม่ได้')
  assert(decoded.farm.seed !== thai.seed, 'seed ภาษาไทยกลับรอดมาได้ ซึ่งไม่ตรงกับที่ออกแบบไว้')
  assert(decoded.farm.seed.length > 0, 'seed กลายเป็นค่าว่าง')

  const digits = E.createFarm('1735689600002', 4)
  const kept = S.decodeFarm(S.encodeFarm(digits))
  assert(kept.ok && kept.farm.seed === digits.seed, 'seed ที่เกมสร้างจริงกลับไม่รอด')
})

check('รหัสรุ่นเก่าที่ถูกแก้ ต้องถูกปฏิเสธเหมือนรหัสรุ่นใหม่', () => {
  const modern = E.createFarm('1735689600001', 4)
  const parts = S.encodeFarm(modern).split('~')
  const head = parts[1].split('.').slice(0, 9).join('.')
  const body = [head, parts[2], parts[3], parts[4], parts[5], parts[6], parts[8]].join('~')

  assert(!S.decodeFarm(`DOME1~${body}~zzzzzz`).ok, 'รหัสรุ่นเก่าที่เลขตรวจสอบผิดกลับอ่านได้')
  assert(!S.decodeFarm(`DOME1~${body}`).ok, 'รหัสรุ่นเก่าที่ขาดเลขตรวจสอบกลับอ่านได้')
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
    code.replace(/^DOME\d/, 'MAZE1'),
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

    // แปรรูปให้เต็มกำลังด้วยสูตรที่แพงที่สุดที่วัตถุดิบพอ
    if (farm.kitchens > 0) {
      for (const recipe of [...T.RECIPES].reverse()) {
        const units = E.craftableUnits(farm, recipe.id)
        if (units > 0) E.startCraft(farm, recipe.id, units)
      }
    }

    if (!options.careless) {
      /*
       * ลำดับการลงทุนสำคัญกว่าที่คิด
       *
       * ตอนเพิ่มโรงแปรรูปเข้ามาแล้ววางไว้ก่อนอาคารของโดม ผลคือทรัพยากรหมด
       * ตั้งแต่วันที่สิบหก เพราะเงินถูกดูดไปสร้างโรงแปรรูปจนไม่พอสร้างโรงกรอง
       * ผู้เล่นที่ตั้งใจดูแลโดมจะไม่ทำแบบนั้น จึงเรียงให้ดูแลคนก่อนลงทุนเสมอ
       */
      for (const building of T.BUILDINGS) {
        const left = E.daysRemaining(farm, building.produces)
        /*
         * ของใกล้หมดจริง ๆ ก็ซื้อทันทีถ้าเงินพอ ไม่ต้องเหลือกันไว้
         *
         * เคยตั้งกฎว่าต้องมีเงินเกินราคาสามร้อยถึงจะซื้อ ผลคือผู้เล่นจำลอง
         * นั่งดูอากาศลดจากสิบสองวันเหลือศูนย์ทั้งที่มีเงินห้าร้อยแปดสิบ
         * และเครื่องฟอกราคาสี่ร้อยแปดสิบ ซึ่งไม่มีคนจริงคนไหนทำแบบนั้น
         */
        const urgent = left < 8 && farm.coins >= building.cost
        const planned = left < 12 && farm.coins > building.cost + 300
        if (urgent || planned) E.buyBuilding(farm, building.id)
      }
      const plotCost = E.nextPlotCost(farm)
      if (plotCost !== null && farm.coins > plotCost + 400) E.unlockPlot(farm)

      // โรงแปรรูปเป็นการลงทุนต่อยอด ทำเมื่อโดมมั่นคงแล้วเท่านั้น
      const settled = T.RESOURCES.every((spec) => E.daysRemaining(farm, spec.id) > 20)
      if (settled && farm.kitchens === 0 && farm.coins > T.KITCHEN_COST + 400) {
        E.buyKitchen(farm)
      }
      // ไม่รับคนเพิ่มจนกว่าจะมีกำลังผลิตรองรับ คือมีแปลงมากกว่าหนึ่งแปลง
      if (
        farm.plots.length > 1 &&
        T.RESOURCES.every((spec) => E.daysRemaining(farm, spec.id) > 15)
      ) {
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

/* ------------------------------------------------------------------ *
 * แถวสร้างโจทย์เอง ตัวชี้วัด ป.4/12
 * ------------------------------------------------------------------ */

/** เก็บแถวสร้างโจทย์เองที่เกิดขึ้นจริงจากการเล่น พร้อมฟาร์มของวันนั้น */
function collectBuilderRows(seeds, days) {
  const found = []
  for (let index = 0; index < seeds; index += 1) {
    const farm = E.createFarm(`สร้างโจทย์-${index}`, 4)
    E.buyAnimal(farm, 'chicken', 2)
    E.buyFeed(farm, 20)
    for (let step = 0; step < days; step += 1) {
      farm.plots.forEach((plot, plotIndex) => {
        if (plot.planting && !E.isReady(plot)) E.waterPlot(farm, plotIndex)
      })
      farm.plots.forEach((plot, plotIndex) => {
        if (plot.planting) return
        for (const crop of T.CROPS) {
          if (E.plantPlot(farm, plotIndex, crop.id).ok) break
        }
      })
      for (const [key, amount] of Object.entries(farm.stock)) {
        if (amount > 0) E.sellStock(farm, key, amount)
      }
      if (farm.feed < 20 && farm.coins > 200) E.buyFeed(farm, 40)

      const plan = L.planDay(farm)
      const row = L.buildLedger(farm, plan).find((entry) => entry.kind === 'build')
      if (row) found.push({ row, coins: farm.coins, day: farm.day, farm: clone(farm) })
      L.closeDay(farm, plan, true)
    }
  }
  return found
}

check('แถวสร้างโจทย์เองต้องเกิดขึ้นบ่อยพอที่ครูจะวัดตัวชี้วัดได้ในคาบเดียว', () => {
  /*
   * ตัวชี้วัด ป.4/12 เดิมมาจากภารกิจเดียวใน Safe Zone ซึ่งตอบได้ครั้งเดียวต่อรอบ
   * แผงคุณครูต้องเห็นสามข้อถึงจะตัดสินได้ แปลว่าต้องเล่นจบสามรอบเพื่อวัดข้อเดียว
   * แถวนี้จึงต้องเกิดอย่างน้อยสามครั้งในหนึ่งคาบ ซึ่งจำลองไว้ที่สิบวัน
   */
  const found = collectBuilderRows(6, 10)
  const perSeed = found.length / 6
  assert(
    perSeed >= 3,
    `หนึ่งคาบสิบวันเจอแถวนี้เฉลี่ย ${perSeed.toFixed(1)} ครั้ง ซึ่งน้อยกว่าสามข้อที่ครูต้องใช้ตัดสิน`,
  )
})

check('ทุกชุดที่เด็กเลือกได้ ต้องได้คำตอบเป็นจำนวนนับ ไม่ติดลบ', () => {
  /*
   * ข้อเดียวกับที่ภารกิจสร้างโจทย์ของ Safe Zone ต้องระวัง
   * เด็กเลือกชุดที่ทำให้คำตอบติดลบไม่ได้ เพราะ ป.4 ยังไม่เรียนจำนวนเต็มลบ
   * และช่องกรอกรับเฉพาะตัวเลข เด็กจึงพิมพ์คำตอบที่ถูกไม่ได้เลย แล้วปิดวันไม่ได้
   * ซึ่งเป็นความผิดของคนออกแบบโจทย์ ไม่ใช่ของเด็กที่เลือก
   */
  const found = collectBuilderRows(6, 25)
  assert(found.length > 0, 'ไม่เจอแถวสร้างโจทย์เองเลย ข้อนี้จึงไม่ได้ตรวจอะไร')
  for (const { row } of found) {
    for (const sell of row.builder.sell) {
      for (const spend of row.builder.spend) {
        const answer = L.builderAnswer(row.builder, sell.value, spend.value)
        assert(
          answer >= 0,
          `เลือก "${sell.label}" กับ "${spend.label}" แล้วได้ ${answer} ซึ่งติดลบ`,
        )
        assert(Number.isInteger(answer), `คำตอบ ${answer} ไม่ใช่จำนวนเต็ม`)
      }
    }
  }
})

check('ต้องมีอย่างน้อยสองทางเลือกทั้งสองช่อง ไม่งั้นไม่ใช่การสร้างโจทย์', () => {
  const found = collectBuilderRows(6, 25)
  for (const { row } of found) {
    assert(row.builder.sell.length >= 2, 'ช่องขายมีทางเลือกเดียว เด็กไม่ได้เลือกอะไร')
    assert(row.builder.spend.length >= 2, 'ช่องซื้อมีทางเลือกเดียว เด็กไม่ได้เลือกอะไร')
  }
})

check('เงินตั้งต้นในโจทย์ต้องเป็นเงินที่โดมมีอยู่จริง', () => {
  const found = collectBuilderRows(6, 25)
  for (const { row, coins } of found) {
    assert(
      row.builder.coins === coins,
      `โจทย์บอกว่ามีเงิน ${row.builder.coins} แต่ฟาร์มมี ${coins}`,
    )
  }
})

check('ราคาของที่ให้เลือกซื้อ ต้องเป็นราคาจริงที่กดซื้อได้ในเกม', () => {
  /*
   * เรื่องนี้สำคัญกว่าที่ดู
   *
   * โจทย์ข้อนี้ไม่ได้จบที่คำตอบ เด็กที่คิดออกว่าขายอันไหนแล้วซื้ออาคารได้พอดี
   * จะเดินไปกดซื้อจริงในวันรุ่งขึ้น ถ้าราคาในโจทย์ไม่ตรงกับราคาในร้าน
   * สิ่งที่เด็กคิดถูกจะกลายเป็นสิ่งที่ใช้ไม่ได้ และเด็กจะเลิกเชื่อตัวเลขในเกม
   */
  const realPrices = new Map()
  realPrices.set('feed', 20 * T.FEED_PRICE)
  realPrices.set('feed-big', 60 * T.FEED_PRICE)
  realPrices.set('kitchen', T.KITCHEN_COST)
  for (const building of T.BUILDINGS) realPrices.set(`building-${building.id}`, building.cost)

  const found = collectBuilderRows(6, 25)
  for (const { row, farm } of found) {
    for (const option of row.builder.spend) {
      if (option.key === 'plot') {
        assert(
          option.value === E.nextPlotCost(farm),
          `ราคาเปิดแปลงในโจทย์คือ ${option.value} แต่ราคาจริงคือ ${E.nextPlotCost(farm)}`,
        )
        continue
      }
      assert(
        realPrices.get(option.key) === option.value,
        `ราคาของ ${option.key} ในโจทย์คือ ${option.value} แต่ราคาจริงคือ ${realPrices.get(option.key)}`,
      )
    }
  }
})

check('เงินที่ขายได้ในโจทย์ ต้องตรงกับราคาตลาดของวันนั้น', () => {
  const found = collectBuilderRows(6, 25)
  let checkedCrops = 0
  for (const { row, farm } of found) {
    for (const option of row.builder.sell) {
      if (!option.key.startsWith('crop-')) continue
      const cropId = option.key.slice('crop-'.length)
      const price = M.marketPrice(farm, cropId)
      assert(
        option.value % price === 0,
        `${option.label} ราคารวม ${option.value} หารด้วยราคาตลาด ${price} ไม่ลงตัว`,
      )
      checkedCrops += 1
    }
  }
  assert(checkedCrops > 0, 'ไม่มีตัวเลือกขายพืชเลย ข้อนี้จึงไม่ได้ตรวจอะไร')
})

check('แถวสร้างโจทย์เองต้องไม่มีคำตอบตายตัว เพราะคำตอบขึ้นกับสิ่งที่เด็กเลือก', () => {
  const found = collectBuilderRows(6, 25)
  assert(found.length > 0, 'ไม่เจอแถวสร้างโจทย์เองเลย')
  for (const { row } of found) {
    assert(row.fields.length === 0, 'แถวนี้ไม่ควรมีช่องคำตอบตายตัวใน fields')
    assert(row.builder !== undefined, 'แถวชนิด build ต้องมีข้อมูล builder เสมอ')
  }
})

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
