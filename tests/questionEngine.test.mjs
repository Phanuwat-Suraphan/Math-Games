/**
 * ชุดทดสอบ Question Engine และ Math Engine (Part 4)
 *
 * เน้นความถูกต้องทางคณิตศาสตร์เป็นหลัก เพราะโจทย์ที่ผิดคือความเสียหายโดยตรง
 * ต่อเด็ก ไม่ใช่แค่บั๊กของโปรแกรม
 *
 * วิธีใช้
 *   tsc --ignoreConfig src/types/*.ts src/data/*.ts src/utils/*.ts src/math/*.ts \
 *     src/questionEngine/*.ts src/questionEngine/**\/*.ts \
 *     src/services/storage.ts src/services/rewardService.ts src/services/questService.ts \
 *     --outDir /tmp/qe --target ES2020 --module commonjs --strict --skipLibCheck --lib ES2020,DOM
 *   node tests/questionEngine.test.mjs /tmp/qe
 */

import path from 'path'
import { createRequire } from 'module'

const OUT = process.argv[2]
if (!OUT) {
  console.error('ใช้: node tests/questionEngine.test.mjs <โฟลเดอร์ JS ที่คอมไพล์แล้ว>')
  process.exit(1)
}

const require = createRequire(import.meta.url)
const load = (name) => require(path.resolve(OUT, name + '.js'))

const F = load('math/fractions')
const D = load('math/decimals')
const P = load('math/percentages')
const G = load('math/geometry')
const RNG = load('math/rng')
const QE = load('questionEngine/index')
const S = load('questionEngine/session')
const V = load('questionEngine/validators')

let passed = 0
const failures = []

function check(name, fn) {
  try { fn(); passed += 1 }
  catch (err) { failures.push(`${name}\n      ${err.message}`) }
}
function assert(condition, message) { if (!condition) throw new Error(message) }
function equal(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message} — ได้ ${JSON.stringify(actual)} คาดว่า ${JSON.stringify(expected)}`)
  }
}
function throws(fn, message) {
  let threw = false
  try { fn() } catch { threw = true }
  if (!threw) throw new Error(message)
}

const ALL_TYPES = [
  'addition', 'subtraction', 'multiplication', 'division',
  'fractions', 'decimals', 'percentages', 'geometry', 'wordProblems',
]
const ALL_DIFFICULTIES = ['easy', 'medium', 'hard', 'expert']
const GRADES = [4, 5, 6]

// ══ ตัวสุ่มที่กำหนด seed ได้ ══

check('seed เดิมให้ลำดับตัวเลขเดิมทุกครั้ง', () => {
  const a = RNG.createRng('abc')
  const b = RNG.createRng('abc')
  for (let i = 0; i < 20; i += 1) equal(a.next(), b.next(), 'ลำดับไม่ตรงกัน')
})

check('seed ต่างกันให้ลำดับต่างกัน', () => {
  const a = RNG.createRng('abc')
  const b = RNG.createRng('xyz')
  const sameCount = Array.from({ length: 20 }, () => a.next() === b.next()).filter(Boolean).length
  assert(sameCount < 5, 'สองลำดับเหมือนกันเกินไป')
})

check('int อยู่ในช่วงที่กำหนดเสมอ', () => {
  const rng = RNG.createRng('range')
  for (let i = 0; i < 2000; i += 1) {
    const value = rng.int(3, 7)
    assert(value >= 3 && value <= 7, `หลุดช่วง: ${value}`)
    assert(Number.isInteger(value), 'ต้องเป็นจำนวนเต็ม')
  }
})

check('shuffle ไม่ทำให้สมาชิกหายหรือเพิ่ม', () => {
  const rng = RNG.createRng('shuffle')
  const source = [1, 2, 3, 4, 5, 6, 7, 8]
  const result = rng.shuffle(source)
  equal(result.length, source.length, 'จำนวนสมาชิกเปลี่ยน')
  equal([...result].sort((a, b) => a - b).join(','), source.join(','), 'สมาชิกเปลี่ยนไป')
  equal(source.join(','), '1,2,3,4,5,6,7,8', 'ของเดิมถูกแก้')
})

// ══ เศษส่วน ══

check('ห.ร.ม. และ ค.ร.น. ถูกต้อง', () => {
  equal(F.gcd(12, 18), 6, 'gcd(12,18)')
  equal(F.gcd(7, 13), 1, 'gcd(7,13)')
  equal(F.gcd(0, 5), 5, 'gcd(0,5)')
  equal(F.lcm(4, 6), 12, 'lcm(4,6)')
})

check('ตัวส่วนเป็นศูนย์ต้องโยน error ไม่ปล่อยเป็น Infinity', () => {
  throws(() => F.makeFraction(1, 0), 'ควรโยน error')
  throws(() => F.simplifyFraction({ numerator: 1, denominator: 0 }), 'ควรโยน error')
  equal(F.isValidFraction({ numerator: 1, denominator: 0 }), false, 'ต้องบอกว่าไม่ถูกต้อง')
})

check('ทอนเศษส่วนเป็นรูปอย่างต่ำ', () => {
  equal(F.formatFraction(F.simplifyFraction({ numerator: 2, denominator: 4 })), '1/2', '2/4')
  equal(F.formatFraction(F.simplifyFraction({ numerator: 6, denominator: 3 })), '2', '6/3')
  equal(F.formatFraction(F.simplifyFraction({ numerator: 0, denominator: 7 })), '0', '0/7')
  equal(F.formatFraction(F.simplifyFraction({ numerator: 9, denominator: 12 })), '3/4', '9/12')
})

check('เครื่องหมายลบอยู่ที่ตัวเศษเสมอ', () => {
  const f = F.makeFraction(3, -4)
  equal(f.numerator, -3, 'ตัวเศษ')
  equal(f.denominator, 4, 'ตัวส่วนต้องเป็นบวก')
})

check('บวกลบคูณหารเศษส่วนถูกต้อง', () => {
  const half = F.makeFraction(1, 2)
  const third = F.makeFraction(1, 3)
  equal(F.formatFraction(F.addFractions(half, third)), '5/6', '1/2 + 1/3')
  equal(F.formatFraction(F.subtractFractions(half, third)), '1/6', '1/2 − 1/3')
  equal(F.formatFraction(F.multiplyFractions(half, third)), '1/6', '1/2 × 1/3')
  equal(F.formatFraction(F.divideFractions(half, third)), '3/2', '1/2 ÷ 1/3')
  // 3/4 + 1/4 = 1 ตรงตามตัวอย่างในสเปก
  equal(F.formatFraction(F.addFractions(F.makeFraction(3, 4), F.makeFraction(1, 4))), '1', '3/4 + 1/4')
})

check('หารด้วยเศษส่วนที่เป็นศูนย์ต้องโยน error', () => {
  throws(
    () => F.divideFractions(F.makeFraction(1, 2), F.makeFraction(0, 5)),
    'ควรโยน error',
  )
})

check('เปรียบเทียบเศษส่วนถูกต้องแม้ตัวส่วนต่างกัน', () => {
  equal(F.compareFractions(F.makeFraction(3, 4), F.makeFraction(2, 3)), 1, '3/4 > 2/3')
  equal(F.compareFractions(F.makeFraction(2, 3), F.makeFraction(3, 4)), -1, '2/3 < 3/4')
  equal(F.compareFractions(F.makeFraction(1, 2), F.makeFraction(2, 4)), 0, '1/2 = 2/4')
  equal(F.compareFractions(F.makeFraction(-1, 2), F.makeFraction(1, 2)), -1, 'ค่าลบน้อยกว่า')
})

check('จำนวนคละแปลงไปกลับได้ค่าเดิม', () => {
  const improper = F.makeFraction(7, 3)
  const mixed = F.toMixedNumber(improper)
  equal(mixed.whole, 2, 'จำนวนเต็ม')
  equal(mixed.numerator, 1, 'ตัวเศษ')
  equal(F.formatFraction(F.fromMixedNumber(mixed)), '7/3', 'แปลงกลับไม่ตรง')
  equal(F.formatMixedNumber(improper), '2 1/3', 'ข้อความจำนวนคละ')
})

check('สมบัติของการบวกเศษส่วน: สลับที่ได้', () => {
  const rng = RNG.createRng('frac-prop')
  for (let i = 0; i < 300; i += 1) {
    const a = F.makeFraction(rng.int(1, 20), rng.int(1, 20))
    const b = F.makeFraction(rng.int(1, 20), rng.int(1, 20))
    equal(
      F.formatFraction(F.addFractions(a, b)),
      F.formatFraction(F.addFractions(b, a)),
      'a + b ต้องเท่ากับ b + a',
    )
  }
})

check('สมบัติ: a − a = 0 และ a × 1 = a', () => {
  const rng = RNG.createRng('frac-prop2')
  const one = F.makeFraction(1, 1)
  for (let i = 0; i < 300; i += 1) {
    const a = F.makeFraction(rng.int(1, 20), rng.int(1, 20))
    equal(F.formatFraction(F.subtractFractions(a, a)), '0', 'a − a ต้องเป็น 0')
    equal(F.formatFraction(F.multiplyFractions(a, one)), F.formatFraction(a), 'a × 1 ต้องเท่ากับ a')
  }
})

// ══ ทศนิยม ══

check('แก้ปัญหา floating point ของ 0.1 + 0.2', () => {
  equal(D.addDecimals(0.1, 0.2), 0.3, '0.1 + 0.2 ต้องได้ 0.3 พอดี')
  equal(D.addDecimals(0.1, 0.7), 0.8, '0.1 + 0.7')
  equal(D.subtractDecimals(1.0, 0.9), 0.1, '1.0 − 0.9')
  equal(D.multiplyDecimals(0.1, 3), 0.3, '0.1 × 3')
  equal(D.multiplyDecimals(1.1, 1.1), 1.21, '1.1 × 1.1')
})

check('นับตำแหน่งทศนิยมถูกต้อง', () => {
  equal(D.decimalPlaces(1), 0, 'จำนวนเต็ม')
  equal(D.decimalPlaces(1.5), 1, 'หนึ่งตำแหน่ง')
  equal(D.decimalPlaces(1.25), 2, 'สองตำแหน่ง')
  equal(D.decimalPlaces(0.001), 3, 'สามตำแหน่ง')
})

check('เปรียบเทียบทศนิยมถูกต้อง', () => {
  equal(D.compareDecimals(0.1, 0.2), -1, '0.1 < 0.2')
  equal(D.compareDecimals(1.50, 1.5), 0, '1.50 = 1.5')
  equal(D.compareDecimals(2.10, 2.09), 1, '2.10 > 2.09')
  assert(D.decimalsEqual(0.3, D.addDecimals(0.1, 0.2)), '0.1+0.2 ต้องเท่ากับ 0.3')
})

check('หารทศนิยมและกันหารด้วยศูนย์', () => {
  equal(D.divideDecimals(1, 4), 0.25, '1 ÷ 4')
  equal(D.divideDecimals(0.6, 0.2), 3, '0.6 ÷ 0.2')
  throws(() => D.divideDecimals(1, 0), 'หารด้วยศูนย์ต้องโยน error')
})

check('ปัดทศนิยมถูกต้อง', () => {
  equal(D.roundTo(1.005, 2), 1.01, '1.005 ปัดสองตำแหน่ง')
  equal(D.roundTo(2.344, 2), 2.34, '2.344')
  equal(D.roundTo(2.346, 2), 2.35, '2.346')
})

// ══ ร้อยละ ══

check('คำนวณร้อยละพื้นฐาน', () => {
  equal(P.percentOf(25, 200), 50, '25% ของ 200')
  equal(P.percentOf(20, 100), 20, '20% ของ 100')
  equal(P.percentOf(35, 70), 24.5, '35% ของ 70 ต้องไม่เพี้ยนจาก floating point')
  equal(P.whatPercent(20, 80), 25, '20 เป็น 25% ของ 80')
})

check('เพิ่มและลดร้อยละ', () => {
  equal(P.increaseByPercent(100, 20), 120, 'ราคา 100 เพิ่ม 20%')
  equal(P.decreaseByPercent(500, 10), 450, 'ราคา 500 ลด 10%')
  equal(P.discountAmount(500, 10), 50, 'ส่วนลดเป็นเงิน')
})

check('ร้อยละกับฐานศูนย์ต้องโยน error', () => {
  throws(() => P.whatPercent(5, 0), 'ควรโยน error')
  throws(() => P.baseFromPercent(50, 0), 'ควรโยน error')
})

// ══ เรขาคณิต ══

check('สูตรพื้นที่ถูกต้อง', () => {
  equal(G.rectangleArea(8, 12), 96, 'สี่เหลี่ยมผืนผ้า 8×12')
  equal(G.squareArea(7), 49, 'จัตุรัสด้าน 7')
  equal(G.triangleArea(10, 6), 30, 'สามเหลี่ยมฐาน 10 สูง 6')
  equal(G.parallelogramArea(5, 4), 20, 'ด้านขนาน')
  equal(G.circleArea(10), 314, 'วงกลมรัศมี 10 ด้วย π = 3.14')
})

check('สูตรเส้นรอบรูปถูกต้อง', () => {
  equal(G.rectanglePerimeter(8, 12), 40, 'สี่เหลี่ยมผืนผ้า')
  equal(G.squarePerimeter(7), 28, 'จัตุรัส')
  equal(G.trianglePerimeter(3, 4, 5), 12, 'สามเหลี่ยม')
  equal(G.circleCircumference(10), 62.8, 'เส้นรอบวง')
})

check('ตรวจได้ว่าด้านสามด้านประกอบเป็นสามเหลี่ยมได้จริงไหม', () => {
  equal(G.isValidTriangle(3, 4, 5), true, '3-4-5 เป็นสามเหลี่ยมได้')
  equal(G.isValidTriangle(1, 2, 10), false, '1-2-10 เป็นไปไม่ได้')
  equal(G.isValidTriangle(0, 4, 5), false, 'ด้านเป็นศูนย์ไม่ได้')
})

// ══ ตัวสร้างโจทย์ ══

check('สร้างโจทย์ได้ครบทุกชนิด ทุกระดับความยาก ทุกระดับชั้น', () => {
  for (const type of ALL_TYPES) {
    for (const difficulty of ALL_DIFFICULTIES) {
      for (const grade of GRADES) {
        const question = QE.generateQuestion({ type, grade, difficulty, seed: `${type}-${difficulty}-${grade}` })
        assert(question, `${type}/${difficulty}/ป.${grade}: ไม่ได้โจทย์`)
        assert(!question.tags.includes('fallback'),
          `${type}/${difficulty}/ป.${grade}: ต้องใช้โจทย์สำรอง แปลว่าตัวสร้างมีปัญหา`)
      }
    }
  }
})

check('โจทย์ทุกข้อผ่านการตรวจสอบ (สุ่ม 2,700 ข้อ)', () => {
  let count = 0
  for (const type of ALL_TYPES) {
    for (const difficulty of ALL_DIFFICULTIES) {
      for (let i = 0; i < 25; i += 1) {
        const grade = GRADES[i % 3]
        const question = QE.generateQuestion({ type, grade, difficulty, seed: `v-${type}-${difficulty}-${i}` })
        const result = V.validateQuestion(question)
        assert(result.valid, `${type}/${difficulty} ข้อ ${i}: ${result.errors.join(', ')}`)
        count += 1
      }
    }
  }
  assert(count >= 900, `ทดสอบไปแค่ ${count} ข้อ`)
})

check('ทุกข้อมีตัวเลือก 4 ตัวไม่ซ้ำ และมีคำตอบที่ถูกอยู่ด้วย', () => {
  for (const type of ALL_TYPES) {
    for (let i = 0; i < 40; i += 1) {
      const q = QE.generateQuestion({ type, grade: 5, difficulty: 'medium', seed: `c-${type}-${i}` })
      equal(q.choices.length, 4, `${type}: จำนวนตัวเลือก`)
      const texts = q.choices.map((c) => c.text)
      equal(new Set(texts).size, 4, `${type}: มีตัวเลือกซ้ำ — ${texts.join(', ')}`)
      assert(texts.includes(q.correctAnswer), `${type}: ไม่มีคำตอบที่ถูกในตัวเลือก`)
    }
  }
})

check('ไม่มีตัวเลือกติดลบหรือค่าประหลาดหลุดไปถึงเด็ก', () => {
  for (const type of ALL_TYPES) {
    for (const difficulty of ALL_DIFFICULTIES) {
      for (let i = 0; i < 20; i += 1) {
        const q = QE.generateQuestion({ type, grade: 6, difficulty, seed: `n-${type}-${difficulty}-${i}` })
        for (const choice of q.choices) {
          assert(!choice.text.includes('NaN'), `${type}: เจอ NaN`)
          assert(!choice.text.includes('Infinity'), `${type}: เจอ Infinity`)
          assert(!choice.text.trimStart().startsWith('-'), `${type}: เจอตัวเลือกติดลบ ${choice.text}`)
          assert(!/\/\s*0+$/.test(choice.text), `${type}: เจอตัวส่วนเป็นศูนย์ ${choice.text}`)
        }
      }
    }
  }
})

check('ทุกข้อมีคำอธิบายเฉลยและคำใบ้', () => {
  for (const type of ALL_TYPES) {
    const q = QE.generateQuestion({ type, grade: 4, difficulty: 'easy', seed: `e-${type}` })
    assert(q.explanation.trim().length > 0, `${type}: ไม่มีคำอธิบาย`)
    assert(q.hint && q.hint.trim().length > 0, `${type}: ไม่มีคำใบ้`)
    assert(q.prompt.trim().length > 0, `${type}: ไม่มีตัวโจทย์`)
  }
})

check('โจทย์บวกลบคูณหารคำนวณถูกต้องจริง', () => {
  for (let i = 0; i < 150; i += 1) {
    const add = QE.generateQuestion({ type: 'addition', grade: 4, difficulty: 'easy', seed: `a${i}` })
    const nums = add.prompt.replace(/,/g, '').match(/\d+/g).map(Number)
    equal(Number(add.correctAnswer), nums.reduce((s, n) => s + n, 0), `บวกผิด: ${add.prompt}`)

    const sub = QE.generateQuestion({ type: 'subtraction', grade: 4, difficulty: 'medium', seed: `s${i}` })
    const sn = sub.prompt.replace(/,/g, '').match(/\d+/g).map(Number)
    equal(Number(sub.correctAnswer), sn[0] - sn[1], `ลบผิด: ${sub.prompt}`)
    assert(Number(sub.correctAnswer) >= 0, `คำตอบติดลบ: ${sub.prompt}`)

    const mul = QE.generateQuestion({ type: 'multiplication', grade: 5, difficulty: 'medium', seed: `m${i}` })
    const mn = mul.prompt.replace(/,/g, '').match(/\d+/g).map(Number)
    equal(Number(mul.correctAnswer), mn[0] * mn[1], `คูณผิด: ${mul.prompt}`)
  }
})

check('โจทย์หารต้องลงตัวเสมอ ไม่มีเศษหลุดมา', () => {
  for (const difficulty of ALL_DIFFICULTIES) {
    for (let i = 0; i < 80; i += 1) {
      const q = QE.generateQuestion({ type: 'division', grade: 6, difficulty, seed: `d-${difficulty}-${i}` })
      const [dividend, divisor] = q.prompt.replace(/,/g, '').match(/\d+/g).map(Number)
      equal(dividend % divisor, 0, `หารไม่ลงตัว: ${q.prompt}`)
      equal(Number(q.correctAnswer), dividend / divisor, `ผลหารผิด: ${q.prompt}`)
    }
  }
})

check('โจทย์เศษส่วนไม่มีตัวส่วนเป็นศูนย์', () => {
  for (const difficulty of ALL_DIFFICULTIES) {
    for (let i = 0; i < 60; i += 1) {
      const q = QE.generateQuestion({ type: 'fractions', grade: 5, difficulty, seed: `f-${difficulty}-${i}` })
      const fractions = q.prompt.match(/\d+\/\d+/g) ?? []
      for (const text of fractions) {
        const denominator = Number(text.split('/')[1])
        assert(denominator !== 0, `ตัวส่วนเป็นศูนย์: ${q.prompt}`)
      }
    }
  }
})

check('seed เดิมได้โจทย์เดิม', () => {
  for (const type of ALL_TYPES) {
    const a = QE.generateQuestion({ type, grade: 5, difficulty: 'medium', seed: 'fixed-seed' })
    const b = QE.generateQuestion({ type, grade: 5, difficulty: 'medium', seed: 'fixed-seed' })
    equal(a.prompt, b.prompt, `${type}: โจทย์ไม่ตรงกัน`)
    equal(a.correctAnswer, b.correctAnswer, `${type}: คำตอบไม่ตรงกัน`)
    equal(a.choices.map((c) => c.text).join('|'), b.choices.map((c) => c.text).join('|'),
      `${type}: ลำดับตัวเลือกไม่ตรงกัน`)
  }
})

check('ไม่ระบุ seed แล้วโจทย์ต้องเปลี่ยนไปเรื่อย ๆ', () => {
  const prompts = new Set()
  for (let i = 0; i < 40; i += 1) {
    prompts.add(QE.generateQuestion({ type: 'multiplication', grade: 5, difficulty: 'hard' }).prompt)
  }
  assert(prompts.size > 25, `โจทย์ซ้ำมากเกินไป ได้ ${prompts.size} แบบจาก 40 ครั้ง`)
})

check('ตรวจคำตอบถูกต้อง', () => {
  const q = QE.generateQuestion({ type: 'addition', grade: 4, difficulty: 'easy', seed: 'ans' })
  assert(QE.checkAnswer(q, q.correctAnswer), 'คำตอบที่ถูกต้องผ่าน')
  const wrong = q.choices.find((c) => c.text !== q.correctAnswer)
  assert(!QE.checkAnswer(q, wrong.text), 'คำตอบผิดต้องไม่ผ่าน')
  assert(QE.checkAnswer(q, ` ${q.correctAnswer} `), 'ช่องว่างหัวท้ายไม่ควรมีผล')
})

check('ตัวตรวจสอบจับโจทย์เสียได้', () => {
  const good = QE.generateQuestion({ type: 'addition', grade: 4, difficulty: 'easy', seed: 'val' })
  assert(V.validateQuestion(good).valid, 'โจทย์ดีต้องผ่าน')

  assert(!V.validateQuestion({ ...good, prompt: '' }).valid, 'ไม่มีตัวโจทย์ต้องไม่ผ่าน')
  assert(!V.validateQuestion({ ...good, explanation: '' }).valid, 'ไม่มีเฉลยต้องไม่ผ่าน')
  assert(!V.validateQuestion({ ...good, correctAnswer: 'NaN' }).valid, 'คำตอบ NaN ต้องไม่ผ่าน')
  assert(!V.validateQuestion({ ...good, correctAnswer: '999999' }).valid,
    'คำตอบที่ไม่อยู่ในตัวเลือกต้องไม่ผ่าน')
  assert(!V.validateQuestion({
    ...good,
    choices: [{ id: 'a', text: '1' }, { id: 'b', text: '1' }, { id: 'c', text: '2' }, { id: 'd', text: '3' }],
    correctAnswer: '1',
  }).valid, 'ตัวเลือกซ้ำต้องไม่ผ่าน')
  assert(!V.validateQuestion({ ...good, difficulty: 'impossible' }).valid, 'ความยากผิดต้องไม่ผ่าน')
  assert(!V.validateQuestion({ ...good, grade: 9 }).valid, 'ระดับชั้นผิดต้องไม่ผ่าน')
})

// ══ ชุดโจทย์ ══

check('กระจายชนิดโจทย์อย่างสมดุล ไม่ออกชนิดเดียวรวด', () => {
  const types = ['addition', 'subtraction', 'multiplication', 'division']
  const plan = S.distributeTypes(types, 10)
  equal(plan.length, 10, 'จำนวนข้อ')
  for (const type of types) {
    const count = plan.filter((item) => item === type).length
    assert(count >= 2 && count <= 3, `${type} ได้ ${count} ข้อ ไม่สมดุล`)
  }
})

check('กระจายชนิดโจทย์ได้แม้จำนวนข้อหารไม่ลงตัว', () => {
  equal(S.distributeTypes(['addition', 'subtraction', 'multiplication'], 10).length, 10, '10 ข้อ 3 ชนิด')
  equal(S.distributeTypes(['addition'], 7).length, 7, 'ชนิดเดียว')
  equal(S.distributeTypes([], 5).length, 0, 'ไม่มีชนิดเลย')
})

check('สร้างชุดโจทย์ได้ตามจำนวนที่ด่านกำหนด', () => {
  const session = S.createSession({
    stageId: 'world-1-stage-6',
    questionTypes: ['addition', 'subtraction', 'multiplication', 'division'],
    grade: 4, difficulty: 'medium', questionCount: 10, seed: 'sess',
  })
  equal(session.questions.length, 10, 'จำนวนโจทย์')
  equal(session.currentIndex, 0, 'เริ่มที่ข้อแรก')
  equal(session.results.length, 0, 'ยังไม่มีผล')
  for (const question of session.questions) {
    assert(V.validateQuestion(question).valid, `โจทย์ในชุดไม่ผ่านการตรวจ: ${question.prompt}`)
  }
})

check('โจทย์ในชุดเดียวกันไม่ซ้ำ', () => {
  const session = S.createSession({
    stageId: 'stage-x',
    questionTypes: ['multiplication'],
    grade: 6, difficulty: 'hard', questionCount: 10, seed: 'uniq',
  })
  const prompts = session.questions.map((q) => q.prompt)
  equal(new Set(prompts).size, prompts.length, `มีโจทย์ซ้ำ: ${prompts.join(' | ')}`)
})

check('ตอบครบทุกข้อแล้วชุดต้องจบ', () => {
  let session = S.createSession({
    stageId: 'stage-y', questionTypes: ['addition'],
    grade: 4, difficulty: 'easy', questionCount: 5, seed: 'flow',
  })

  for (let i = 0; i < 5; i += 1) {
    assert(!S.isSessionComplete(session), `ข้อ ${i}: ไม่ควรจบ`)
    const question = S.currentQuestion(session)
    assert(question, 'ต้องมีโจทย์')
    const outcome = S.answerCurrent(session, {
      selectedAnswer: question.correctAnswer, timeSpent: 4000,
    })
    assert(outcome.correct, 'ตอบคำตอบที่ถูกต้องเข้าไปต้องถูก')
    session = outcome.session
  }

  assert(S.isSessionComplete(session), 'ตอบครบแล้วต้องจบ')
  equal(S.currentQuestion(session), null, 'ไม่ควรมีโจทย์เหลือ')
  assert(session.completedAt, 'ต้องบันทึกเวลาที่จบ')
  equal(S.answerCurrent(session, { selectedAnswer: '1', timeSpent: 100 }), null,
    'ตอบเกินจำนวนข้อไม่ได้')
})

check('สรุปผลชุดโจทย์ถูกต้อง', () => {
  let session = S.createSession({
    stageId: 'stage-z', questionTypes: ['addition'],
    grade: 4, difficulty: 'easy', questionCount: 10, seed: 'sum',
  })

  // ตอบถูก 8 ข้อแรก ผิด 2 ข้อท้าย
  for (let i = 0; i < 10; i += 1) {
    const question = S.currentQuestion(session)
    const wrong = question.choices.find((c) => c.text !== question.correctAnswer).text
    session = S.answerCurrent(session, {
      selectedAnswer: i < 8 ? question.correctAnswer : wrong,
      timeSpent: 6000,
    }).session
  }

  const summary = S.summarizeSession(session)
  equal(summary.total, 10, 'จำนวนข้อ')
  equal(summary.correct, 8, 'ตอบถูก')
  equal(summary.wrong, 2, 'ตอบผิด')
  equal(summary.accuracy, 80, 'ความแม่นยำ')
  equal(summary.bestStreak, 8, 'ตอบถูกติดกันสูงสุด')
  equal(summary.stars, 2, 'ความแม่นยำ 80% ต้องได้ 2 ดาว')
  assert(summary.score > 0, 'ต้องมีคะแนน')
})

check('ความถูกต้องสำคัญกว่าความเร็ว', () => {
  const slowCorrect = [{ correct: true, difficulty: 'easy', timeSpent: 60000 }]
  const fastWrong = [{ correct: false, difficulty: 'easy', timeSpent: 1000 }]
  assert(S.calculateScore(slowCorrect) > S.calculateScore(fastWrong),
    'ตอบถูกแบบช้าต้องได้คะแนนมากกว่าตอบผิดแบบเร็ว')

  // โบนัสความเร็วต้องมีน้ำหนักน้อยกว่าคะแนนตอบถูกมาก
  const fastCorrect = [{ correct: true, difficulty: 'easy', timeSpent: 1000 }]
  const gap = S.calculateScore(fastCorrect) - S.calculateScore(slowCorrect)
  assert(gap <= S.SCORE_CONFIG.maxSpeedBonus,
    `ช่องว่างจากความเร็วมากเกินไป (${gap})`)
  assert(gap < S.SCORE_CONFIG.perCorrect * 0.2,
    'โบนัสความเร็วต้องน้อยกว่า 20% ของคะแนนตอบถูก')
})

check('นับตอบถูกติดกันสูงสุดถูกต้อง', () => {
  const make = (pattern) => pattern.map((correct) => ({ correct }))
  equal(S.bestStreakOf(make([true, true, false, true, true, true])), 3, 'ควรได้ 3')
  equal(S.bestStreakOf(make([false, false])), 0, 'ไม่มีเลย')
  equal(S.bestStreakOf(make([true, true, true, true])), 4, 'ถูกหมด')
})

// ══ ความยากที่ปรับตามผู้เล่น ══

check('ตอบถูกติดกัน 3 ข้อแล้วยากขึ้นหนึ่งขั้น', () => {
  const results = [{ correct: true }, { correct: true }, { correct: true }]
  equal(S.nextDifficulty('easy', results), 'medium', 'easy → medium')
  equal(S.nextDifficulty('medium', results), 'hard', 'medium → hard')
  equal(S.nextDifficulty('expert', results), 'expert', 'expert ขึ้นต่อไม่ได้แล้ว')
})

check('ตอบผิดติดกัน 3 ข้อแล้วง่ายลงหนึ่งขั้น', () => {
  const results = [{ correct: false }, { correct: false }, { correct: false }]
  equal(S.nextDifficulty('hard', results), 'medium', 'hard → medium')
  equal(S.nextDifficulty('easy', results), 'easy', 'easy ลดต่อไม่ได้แล้ว')
})

check('ตอบถูกบ้างผิดบ้าง ความยากต้องไม่เปลี่ยน', () => {
  equal(S.nextDifficulty('medium', [{ correct: true }, { correct: false }, { correct: true }]),
    'medium', 'ไม่ควรเปลี่ยน')
  equal(S.nextDifficulty('medium', [{ correct: true }, { correct: true }]),
    'medium', 'ยังไม่ครบ 3 ข้อ')
  equal(S.nextDifficulty('medium', []), 'medium', 'ยังไม่มีข้อมูล')
})

check('ความยากขยับได้ทีละขั้นเท่านั้น ไม่กระโดด', () => {
  equal(QE.shiftDifficulty('easy', 5), 'medium', 'ขอขึ้น 5 ขั้นก็ได้แค่ 1')
  equal(QE.shiftDifficulty('expert', -9), 'hard', 'ขอลง 9 ขั้นก็ได้แค่ 1')
  equal(QE.shiftDifficulty('medium', 0), 'medium', 'ไม่ขยับ')
})

// ══ สรุป ══

console.log(`ผ่าน ${passed} ข้อ`)
if (failures.length > 0) {
  console.log(`\nไม่ผ่าน ${failures.length} ข้อ`)
  failures.forEach((line, i) => console.log(`  ${i + 1}. ${line}`))
  process.exit(1)
}
console.log('ผ่านทั้งหมด')
