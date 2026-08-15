/**
 * ชุดทดสอบโหมดโร้คไลค์
 *
 * ข้อที่สำคัญที่สุดคือ "ด่านต้องเป็นไปได้เสมอ"
 * โหมดนี้ไม่มีวันจบ ความยากจึงไต่ขึ้นเรื่อย ๆ
 * ถ้าไม่มีพื้นล่างของเวลาต่อข้อ จะมีชั้นที่เด็กอ่านโจทย์ไม่ทันด้วยซ้ำ
 * ซึ่งกลายเป็นวัดความเร็วในการอ่าน ไม่ได้วัดคณิตศาสตร์
 *
 * วิธีใช้
 *   npx tsc -p tsconfig.tests.json --outDir /tmp/logic
 *   node tests/roguelike.test.mjs /tmp/logic
 */

import path from 'path'
import { createRequire } from 'module'

const OUT = process.argv[2]
if (!OUT) {
  console.error('ใช้: node tests/roguelike.test.mjs <โฟลเดอร์ JS ที่คอมไพล์แล้ว>')
  process.exit(1)
}

const require = createRequire(import.meta.url)
const load = (name) => require(path.resolve(OUT, name + '.js'))

const R = load('roguelike/engine')

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

// ---------- เริ่มรอบ ----------

check('รอบใหม่ต้องเริ่มจากชั้น 1 พร้อมหัวใจเต็ม', () => {
  const run = R.startRun('a')
  assert(run.floor === 1, `เริ่มที่ชั้น ${run.floor}`)
  assert(run.hearts === R.STARTING_HEARTS, 'หัวใจไม่เต็ม')
  assert(run.hearts === run.maxHearts, 'หัวใจไม่เท่ากับค่าสูงสุด')
  assert(!run.over, 'เริ่มมาก็จบแล้ว')
  assert(Object.keys(run.boons).length === 0, 'เริ่มมาก็มีพรแล้ว')
})

check('seed เดิมต้องได้หอคอยเดิม และ seed ต่างต้องได้ต่างกัน', () => {
  const a = R.buildFloor(R.startRun('เหมือน'), 6)
  const b = R.buildFloor(R.startRun('เหมือน'), 6)
  assert(JSON.stringify(a) === JSON.stringify(b), 'seed เดิมได้คนละชั้น')

  const seen = new Set()
  for (let i = 0; i < 20; i += 1) {
    seen.add(JSON.stringify(R.buildFloor(R.startRun(`s${i}`), 6)))
  }
  assert(seen.size >= 5, `20 seed ได้ชั้นต่างกันแค่ ${seen.size} แบบ`)
})

// ---------- ความยากต้องยุติธรรม ----------

check('เวลาต่อข้อต้องไม่ต่ำกว่าพื้นล่าง แม้จะขึ้นสูงมาก', () => {
  for (let floor = 1; floor <= 500; floor += 1) {
    const seconds = R.secondsFor(floor)
    assert(seconds >= 8, `ชั้น ${floor} ให้เวลาแค่ ${seconds} วินาที`)
  }
})

check('เวลาต่อข้อต้องลดลงจริงเมื่อขึ้นสูง ไม่ใช่คงที่ตลอด', () => {
  assert(R.secondsFor(20) < R.secondsFor(1), 'ชั้นสูงไม่ได้ยากขึ้นเลย')
})

check('พรนาฬิกาเดินช้าต้องเพิ่มเวลาจริง', () => {
  assert(R.secondsFor(10, 1) > R.secondsFor(10, 0), 'พรไม่มีผล')
  assert(R.secondsFor(10, 2) > R.secondsFor(10, 1), 'ซ้อนพรแล้วไม่เพิ่ม')
})

check('ทุกชั้นถึง 200 ต้องสร้างได้และมีข้อมูลสมเหตุสมผล', () => {
  const run = R.startRun('ยาว')
  for (let floor = 1; floor <= 200; floor += 1) {
    const data = R.buildFloor(run, floor)
    assert(data.index === floor, `ชั้น ${floor} หมายเลขไม่ตรง`)
    assert(data.title.length > 0, `ชั้น ${floor} ไม่มีชื่อ`)
    assert([4, 5, 6].includes(data.grade), `ชั้น ${floor} ระดับชั้นผิด: ${data.grade}`)
    if (data.kind === 'rest') {
      assert(data.questionCount === 0, `ห้องพักชั้น ${floor} ยังมีโจทย์`)
    } else {
      assert(data.questionCount > 0, `ชั้น ${floor} ไม่มีโจทย์เลย`)
      assert(data.secondsPerQuestion >= 8, `ชั้น ${floor} เวลาน้อยเกินไป`)
    }
  }
})

check('ต้องมีห้องพักโผล่มาเป็นระยะ ไม่ใช่ยากรวดเดียวตลอด', () => {
  const run = R.startRun('พัก')
  let rests = 0
  for (let floor = 1; floor <= 30; floor += 1) {
    if (R.buildFloor(run, floor).kind === 'rest') rests += 1
  }
  assert(rests >= 5, `30 ชั้นมีห้องพักแค่ ${rests} ห้อง`)
})

check('ชั้นต้น ๆ ต้องไม่มีห้องผู้เฝ้าชั้น เด็กเพิ่งเริ่มยังไม่ควรเจอ', () => {
  for (let i = 0; i < 40; i += 1) {
    const run = R.startRun(`เริ่ม${i}`)
    for (let floor = 1; floor <= 3; floor += 1) {
      const kind = R.buildFloor(run, floor).kind
      assert(kind !== 'elite', `seed ${i} ชั้น ${floor} เป็นห้องผู้เฝ้าชั้น`)
    }
  }
})

check('ชั้นต้น ๆ ต้องถามแต่ทักษะที่คุ้นเคยก่อน', () => {
  const run = R.startRun('ทักษะ')
  const early = R.buildFloor(run, 1)
  assert(
    ['addition', 'subtraction'].includes(early.skill),
    `ชั้น 1 ถาม ${early.skill} ซึ่งยากเกินไปสำหรับเริ่มต้น`,
  )
})

// ---------- ตอบถูกตอบผิด ----------

check('ตอบถูกต้องเพิ่มคอมโบและเหรียญ', () => {
  const run = R.startRun('ถูก')
  const floor = R.buildFloor(run, 2)
  const after = R.answerCorrect(run, floor)
  assert(after.combo === 1, 'คอมโบไม่ขึ้น')
  assert(after.correct === 1, 'จำนวนข้อถูกไม่ขึ้น')
  assert(after.coinsEarned > 0, 'ไม่ได้เหรียญ')
  assert(run.combo === 0, 'สถานะเดิมถูกแก้')
})

check('คอมโบสูงสุดต้องถูกจำไว้แม้คอมโบจะขาด', () => {
  let run = R.startRun('คอมโบ')
  const floor = R.buildFloor(run, 2)
  for (let i = 0; i < 5; i += 1) run = R.answerCorrect(run, floor)
  assert(run.bestCombo === 5, `คอมโบสูงสุด ${run.bestCombo}`)

  run = R.answerWrong(run)
  assert(run.combo === 0, 'ตอบผิดแล้วคอมโบไม่ขาด')
  assert(run.bestCombo === 5, 'คอมโบสูงสุดหายไปด้วย')
})

check('ตอบผิดต้องเสียหัวใจ และหัวใจหมดต้องจบรอบ', () => {
  let run = R.startRun('ผิด')
  for (let i = 0; i < R.STARTING_HEARTS - 1; i += 1) {
    run = R.answerWrong(run)
    assert(!run.over, `ผิดครั้งที่ ${i + 1} ก็จบรอบแล้ว`)
  }
  run = R.answerWrong(run)
  assert(run.over, 'หัวใจหมดแล้วยังไม่จบรอบ')
  assert(run.hearts === 0, `หัวใจเหลือ ${run.hearts}`)
})

check('โล่ต้องกันความเสียหายก่อนหัวใจเสมอ', () => {
  let run = R.takeBoon(R.startRun('โล่'), 'shield')
  const heartsBefore = run.hearts
  run = R.answerWrong(run)
  assert(run.hearts === heartsBefore, 'มีโล่แต่ยังเสียหัวใจ')
  assert(run.shields === 0, 'โล่ไม่ถูกใช้')

  run = R.answerWrong(run)
  assert(run.hearts === heartsBefore - 1, 'โล่หมดแล้วยังไม่เสียหัวใจ')
})

check('โอกาสครั้งที่สองต้องช่วยตอนหัวใจหมด และใช้ได้ครั้งเดียว', () => {
  let run = R.takeBoon(R.startRun('โอกาส'), 'secondChance')
  for (let i = 0; i < R.STARTING_HEARTS; i += 1) run = R.answerWrong(run)

  assert(!run.over, 'มีโอกาสครั้งที่สองแต่จบรอบไปแล้ว')
  assert(run.hearts === 1, `ฟื้นมา ${run.hearts} ดวง`)
  assert(!run.boons.secondChance, 'พรไม่ถูกใช้ไป')

  run = R.answerWrong(run)
  assert(run.over, 'ใช้พรไปแล้วแต่ยังไม่จบรอบ')
})

// ---------- พร ----------

check('เสนอพรต้องได้สามอย่างที่ไม่ซ้ำกัน', () => {
  for (let i = 0; i < 30; i += 1) {
    const run = { ...R.startRun(`พร${i}`), floor: i + 1 }
    const offer = R.offerBoons(run)
    assert(offer.length === 3, `เสนอมา ${offer.length} อย่าง`)
    const ids = offer.map((boon) => boon.id)
    assert(new Set(ids).size === ids.length, `เสนอซ้ำ: ${ids.join(', ')}`)
  }
})

check('พรที่ซ้อนไม่ได้และถืออยู่แล้ว ต้องไม่ถูกเสนออีก', () => {
  let run = R.startRun('ซ้ำ')
  run = R.takeBoon(run, 'doubleCoin')
  run = R.takeBoon(run, 'comboBoost')
  run = R.takeBoon(run, 'secondChance')

  for (let floor = 1; floor <= 20; floor += 1) {
    const offer = R.offerBoons({ ...run, floor })
    for (const boon of offer) {
      assert(
        !['doubleCoin', 'comboBoost', 'secondChance'].includes(boon.id),
        `ชั้น ${floor} ยังเสนอ ${boon.id} ที่ถืออยู่แล้ว`,
      )
    }
  }
})

check('หัวใจเต็มเพดานแล้วต้องไม่เสนอพรเพิ่มหัวใจอีก', () => {
  let run = R.startRun('เพดาน')
  for (let i = 0; i < 10; i += 1) run = R.takeBoon(run, 'extraHeart')
  assert(run.maxHearts === R.MAX_HEARTS_CAP, `หัวใจสูงสุด ${run.maxHearts}`)

  for (let floor = 1; floor <= 15; floor += 1) {
    const offer = R.offerBoons({ ...run, floor })
    assert(
      !offer.some((boon) => boon.id === 'extraHeart'),
      `ชั้น ${floor} ยังเสนอหัวใจเพิ่มทั้งที่เต็มเพดานแล้ว`,
    )
  }
})

check('หัวใจสูงสุดต้องไม่เกินเพดานไม่ว่าจะรับพรกี่ครั้ง', () => {
  let run = R.startRun('ล้น')
  for (let i = 0; i < 50; i += 1) run = R.takeBoon(run, 'extraHeart')
  assert(run.maxHearts <= R.MAX_HEARTS_CAP, `หัวใจสูงสุดล้นเป็น ${run.maxHearts}`)
  assert(run.hearts <= run.maxHearts, 'หัวใจปัจจุบันเกินค่าสูงสุด')
})

check('พรฟื้นพลังต้องเติมหัวใจจนเต็ม', () => {
  let run = R.startRun('ฟื้น')
  run = R.answerWrong(run)
  run = R.answerWrong(run)
  assert(run.hearts < run.maxHearts, 'ยังไม่ได้เสียหัวใจเลย')

  run = R.takeBoon(run, 'healFull')
  assert(run.hearts === run.maxHearts, 'ฟื้นแล้วไม่เต็ม')
})

check('รับพรที่ไม่มีอยู่จริงต้องไม่ทำให้สถานะเสีย', () => {
  const run = R.startRun('ปลอม')
  const after = R.takeBoon(run, 'พรปลอม')
  assert(after === run, 'พรปลอมเปลี่ยนสถานะ')
})

check('ตั๋วข้ามข้อต้องลดลงเมื่อใช้ และใช้เกินจำนวนไม่ได้', () => {
  let run = R.takeBoon(R.startRun('ข้าม'), 'skipOne')
  const used = R.useSkip(run)
  assert(used, 'มีตั๋วแต่ใช้ไม่ได้')
  assert(!used.boons.skipOne, 'ตั๋วไม่ลด')
  assert(R.useSkip(used) === null, 'ตั๋วหมดแล้วยังใช้ได้')
})

// ---------- ห้องพักและการขึ้นชั้น ----------

check('ห้องพักต้องฟื้นหัวใจอย่างน้อยหนึ่งดวง แต่ไม่เกินค่าสูงสุด', () => {
  let run = R.startRun('พักผ่อน')
  run = R.answerWrong(run)
  const healed = R.restHeal(run)
  assert(healed.hearts > run.hearts, 'พักแล้วไม่ฟื้นเลย')
  assert(healed.hearts <= healed.maxHearts, 'ฟื้นเกินค่าสูงสุด')

  const full = R.restHeal(R.startRun('เต็ม'))
  assert(full.hearts === R.STARTING_HEARTS, 'หัวใจเต็มอยู่แล้วแต่ยังเปลี่ยน')
})

check('ขึ้นชั้นต้องบันทึกชั้นสูงสุดที่ไปถึง', () => {
  let run = R.startRun('ขึ้น')
  for (let i = 0; i < 12; i += 1) run = R.advanceFloor(run)
  assert(run.floor === 13, `อยู่ชั้น ${run.floor}`)
  assert(run.reachedFloor === 13, `บันทึกชั้นสูงสุด ${run.reachedFloor}`)
})

// ---------- เหรียญ ----------

check('พรถุงเงินรั่วต้องทำให้ได้เหรียญมากขึ้นจริง', () => {
  const run = R.startRun('เงิน')
  const floor = R.buildFloor(run, 3)
  const plain = R.answerCorrect(run, floor).coinsEarned
  const rich = R.answerCorrect(R.takeBoon(run, 'doubleCoin'), floor).coinsEarned
  assert(rich > plain, `ปกติได้ ${plain} มีพรได้ ${rich}`)
})

check('ตายแล้วต้องยังได้เหรียญกลับบ้านครึ่งหนึ่ง ไม่ใช่ศูนย์', () => {
  let run = R.startRun('ตาย')
  const floor = R.buildFloor(run, 2)
  for (let i = 0; i < 10; i += 1) run = R.answerCorrect(run, floor)
  const earned = run.coinsEarned

  for (let i = 0; i < R.STARTING_HEARTS; i += 1) run = R.answerWrong(run)
  assert(run.over, 'ยังไม่จบรอบ')

  const paid = R.payout(run)
  assert(paid > 0, 'ตายแล้วได้ศูนย์')
  assert(paid === Math.floor(earned / 2), `ได้ ${paid} ควรได้ ${Math.floor(earned / 2)}`)
})

check('เล่นจบโดยไม่ตายต้องได้เหรียญเต็ม', () => {
  let run = R.startRun('รอด')
  const floor = R.buildFloor(run, 2)
  for (let i = 0; i < 5; i += 1) run = R.answerCorrect(run, floor)
  assert(R.payout(run) === run.coinsEarned, 'ยังไม่ตายแต่ได้เหรียญไม่เต็ม')
})

// ---------- เล่นทั้งรอบ ----------

check('เล่นถูกทุกข้อ 60 ชั้นต้องไม่ตายและไม่มีสถานะเพี้ยน', () => {
  let run = R.startRun('เก่ง')

  for (let floor = 1; floor <= 60; floor += 1) {
    const data = R.buildFloor(run, floor)
    if (data.kind === 'rest') {
      run = R.restHeal(run)
    } else {
      for (let q = 0; q < data.questionCount; q += 1) run = R.answerCorrect(run, data)
    }

    const offer = R.offerBoons(run)
    if (offer.length > 0) run = R.takeBoon(run, offer[0].id)
    run = R.advanceFloor(run)

    assert(!run.over, `ตอบถูกหมดแต่ตายที่ชั้น ${floor}`)
    assert(run.hearts > 0, `ชั้น ${floor} หัวใจเหลือ ${run.hearts}`)
    assert(run.hearts <= run.maxHearts, `ชั้น ${floor} หัวใจเกินค่าสูงสุด`)
    assert(run.maxHearts <= R.MAX_HEARTS_CAP, `ชั้น ${floor} หัวใจสูงสุดล้นเพดาน`)
  }

  assert(run.reachedFloor === 61, `ไปถึงชั้น ${run.reachedFloor}`)
  assert(run.wrong === 0, 'ตอบถูกหมดแต่มีข้อผิด')
})

check('เล่นผิดทุกข้อต้องจบรอบเร็ว ไม่ค้างอยู่ตลอดไป', () => {
  let run = R.startRun('อ่อน')
  let guard = 0
  while (!run.over && guard < 200) {
    run = R.answerWrong(run)
    guard += 1
  }
  assert(run.over, 'ตอบผิดรัวแล้วยังไม่จบรอบ')
  assert(guard <= 10, `ใช้ไป ${guard} ครั้งกว่าจะจบ นานผิดปกติ`)
})

console.log(`ผ่าน ${passed} ข้อ`)
if (failures.length > 0) {
  console.log(`\nไม่ผ่าน ${failures.length} ข้อ`)
  failures.forEach((line, i) => console.log(`  ${i + 1}. ${line}`))
  process.exit(1)
}
console.log('ผ่านทั้งหมด')
