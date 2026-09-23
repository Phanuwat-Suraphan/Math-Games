/**
 * ทดสอบโหมดฝึกอ่านนาฬิกาของเมืองแห่งเวลา
 *
 * โจทย์โหมดนี้สุ่มขึ้นใหม่ทุกข้อ จึงตรวจทีละข้อด้วยตาไม่ได้เหมือนการ์ด 40 ใบ
 * ชุดนี้สร้างโจทย์หลายหมื่นข้อจากตัวสุ่มที่กำหนดผลได้ แล้วตรวจทุกข้อว่า
 * เฉลยตรงกับเข็มจริง ตัวเลือกผิดไม่บังเอิญถูก และไม่มีเวลาต้องห้ามหลุดมา
 *
 * วิธีใช้
 *   npx tsc -p tsconfig.tests.json --outDir /tmp/logic
 *   node tests/timePractice.test.mjs /tmp/logic
 */

import path from 'path'
import { createRequire } from 'module'

const OUT = process.argv[2]
if (!OUT) {
  console.error('ต้องบอกโฟลเดอร์ที่คอมไพล์แล้ว เช่น node tests/timePractice.test.mjs /tmp/logic')
  process.exit(1)
}

const require = createRequire(import.meta.url)
const load = (name) => require(path.resolve(OUT, name + '.js'))
const P = load('timeAdventure/practice')
const ENG = load('timeAdventure/engine')

let passed = 0
const failures = []
function check(name, fn) {
  try { fn(); passed += 1 }
  catch (err) { failures.push(`${name}\n      ${err.message}`) }
}
function assert(condition, message) { if (!condition) throw new Error(message) }
function equal(actual, expected, message) {
  if (actual !== expected) throw new Error(`${message} — ได้ ${JSON.stringify(actual)} คาดว่า ${JSON.stringify(expected)}`)
}
function seeded(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const LEVELS = ['hour', 'half', 'five']
const KINDS = ['read', 'set', 'write']
const minutesOf = (text) => {
  const match = /(\d{2}):(\d{2})/.exec(text)
  return match ? Number(match[1]) * 60 + Number(match[2]) : null
}

/** สร้างโจทย์ทุกระดับทุกแบบ จากหลายพัน seed */
function* everyQuestion(perLevel = 3000) {
  for (const level of LEVELS) {
    for (let seed = 1; seed <= perLevel; seed += 1) {
      const rng = seeded(seed * 7 + level.length)
      const time = P.randomTime(level, rng)
      for (const kind of KINDS) yield { level, time, kind, card: P.makeQuestion(kind, time, rng) }
    }
  }
}

check('คำอ่านตัวเลขภาษาไทยถูกต้อง', () => {
  const cases = { 1: 'หนึ่ง', 10: 'สิบ', 11: 'สิบเอ็ด', 15: 'สิบห้า', 20: 'ยี่สิบ', 21: 'ยี่สิบเอ็ด', 30: 'สามสิบ', 45: 'สี่สิบห้า', 55: 'ห้าสิบห้า' }
  for (const [n, word] of Object.entries(cases)) equal(P.thaiNumber(Number(n)), word, `เลข ${n}`)
  equal(P.thaiTimeWords(8, 30), 'แปดนาฬิกาสามสิบนาที', '08:30')
  equal(P.thaiTimeWords(15, 0), 'สิบห้านาฬิกา', '15:00')
})

check('เวลาที่สุ่มได้อยู่ในช่วงของระดับนั้น', () => {
  for (const { level, time } of everyQuestion(500)) {
    assert(time.h >= 1 && time.h <= 12, 'ชั่วโมงบนหน้าปัดต้องอยู่ 1–12')
    if (level === 'hour') equal(time.m, 0, 'ระดับตรงชั่วโมง')
    if (level === 'half') assert(time.m === 0 || time.m === 30, 'ระดับครึ่งชั่วโมง')
    equal(time.m % 5, 0, 'นาทีต้องเป็นทีละ 5')
    if (level !== 'five') assert(time.h >= 6, 'ระดับต้นใช้แค่ตอนเช้าถึงเที่ยง')
  }
})

check('โจทย์อ่านหน้าปัด: เฉลยตรงกับเข็มจริงทุกข้อ', () => {
  for (const { card } of everyQuestion()) {
    if (card.kind !== 'choice' || card.visual.kind !== 'clock') continue
    const shown = minutesOf(card.options[card.answer])
    const { h, m } = card.visual
    equal(shown % 720, (h % 12) * 60 + m, `${card.id} เฉลยไม่ตรงกับเข็ม ${h}:${m}`)
  }
})

check('ทุกโจทย์ตัวเลือกมีสามข้อ ไม่ซ้ำ และตัวเลือกผิดไม่บังเอิญถูก', () => {
  for (const { card, time } of everyQuestion()) {
    if (card.kind !== 'choice') continue
    equal(card.options.length, 3, `${card.id} ต้องมีสามตัวเลือก`)
    equal(new Set(card.options).size, 3, `${card.id} ตัวเลือกซ้ำ`)
    const target = (time.h % 12) * 60 + time.m
    card.options.forEach((option, i) => {
      if (i === card.answer) return
      assert(minutesOf(option) % 720 !== target, `${card.id} ตัวเลือกผิด "${option}" ที่จริงก็ถูก`)
    })
  }
})

check('ไม่มีเวลาช่วงตี 1 ถึงตี 5 หลุดมาในโจทย์ใดเลย', () => {
  for (const { card } of everyQuestion()) {
    const texts = [card.question, card.answerText, card.why, ...(card.kind === 'choice' ? card.options : [])]
    for (const text of texts) assert(!/\b0[1-5]:\d\d/.test(text), `${card.id} มี "${text}"`)
  }
})

check('หน้าปัดเลข 1–5 ต้องบอกว่าเป็นตอนบ่าย และเฉลยเป็นเวลา 13–17 นาฬิกา', () => {
  let seen = 0
  for (const { card, time } of everyQuestion()) {
    if (card.kind !== 'choice' || time.h > 5) continue
    seen += 1
    assert(card.visual.tag.includes('บ่าย'), `${card.id} ต้องมีป้ายตอนบ่าย`)
    const hour = Math.floor(minutesOf(card.options[card.answer]) / 60)
    assert(hour >= 13 && hour <= 17, `${card.id} เฉลยต้องเป็นตอนบ่าย`)
  }
  assert(seen > 100, 'ต้องมีโจทย์ตอนบ่ายในระดับทีละ 5 นาที')
})

check('โจทย์เขียนเวลา: คำอ่านตรงกับเฉลย', () => {
  for (const { card } of everyQuestion(400)) {
    if (card.kind !== 'choice' || card.visual.kind !== 'word') continue
    const answer = card.options[card.answer]
    const [hh, mm] = answer.match(/(\d{2}):(\d{2})/).slice(1).map(Number)
    equal(card.visual.text, P.thaiTimeWords(hh, mm), `${card.id} คำอ่านกับตัวเลขไม่ตรงกัน`)
  }
})

check('โจทย์หมุนเข็ม: ตรวจคำตอบด้วยเครื่องยนต์เดียวกับเกมกระดานได้', () => {
  for (const { card, time } of everyQuestion(300)) {
    if (card.kind !== 'set') continue
    assert(ENG.isCorrect(card, { kind: 'set', h: time.h, m: time.m }), `${card.id} คำตอบที่ถูกต้องผ่าน`)
    assert(!ENG.isCorrect(card, { kind: 'set', h: card.start[0], m: card.start[1] }), `${card.id} จุดเริ่มต้องไม่ใช่คำตอบ`)
  }
})

check('ไม่มีข้อความ NaN หรือ undefined ในโจทย์ใดเลย', () => {
  for (const { card } of everyQuestion(500)) {
    assert(!/NaN|undefined/.test(JSON.stringify(card)), `${card.id}`)
  }
})

check('ชุดฝึกหนึ่งรอบ: 10 ข้อ ครบทั้งสามแบบ และเวลาไม่ซ้ำ (ยกเว้นระดับตรงชั่วโมง)', () => {
  for (let seed = 1; seed <= 200; seed += 1) {
    for (const level of LEVELS) {
      const set = P.buildPracticeSet(level, seeded(seed))
      equal(set.length, P.PRACTICE_LENGTH, 'จำนวนข้อ')
      const kinds = set.map((c) => (c.kind === 'set' ? 'set' : c.visual.kind === 'word' ? 'write' : 'read'))
      equal(kinds.filter((k) => k === 'read').length, 5, 'อ่านหน้าปัด 5 ข้อ')
      equal(kinds.filter((k) => k === 'set').length, 3, 'หมุนเข็ม 3 ข้อ')
      equal(kinds.filter((k) => k === 'write').length, 2, 'เขียนเวลา 2 ข้อ')
      if (level !== 'hour') {
        const times = set.map((c) => c.id.slice(-4))
        equal(new Set(times).size, times.length, `เวลาซ้ำในรอบเดียว (${level})`)
      }
    }
  }
})

check('เหรียญจากการฝึก: ข้อละ 1 เหรียญ ถูกหมดได้โบนัส', () => {
  equal(P.practiceReward(0, 10), 0, 'ไม่ถูกเลย')
  equal(P.practiceReward(7, 10), 7, 'ถูก 7 ข้อ')
  equal(P.practiceReward(10, 10), 10 + P.PRACTICE_PERFECT_BONUS, 'ถูกหมด')
  equal(P.practiceReward(99, 10), 10 + P.PRACTICE_PERFECT_BONUS, 'ส่งเกินมาต้องไม่เกินจำนวนข้อ')
})

console.log(`\nฝึกอ่านนาฬิกา: ผ่าน ${passed} ข้อ`)
if (failures.length) {
  console.log(`\nไม่ผ่าน ${failures.length} ข้อ:\n`)
  for (const f of failures) console.log('  ✗ ' + f)
  process.exit(1)
}
console.log('ผ่านทั้งหมด')
