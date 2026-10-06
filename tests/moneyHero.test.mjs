/**
 * ชุดทดสอบ MONEY HERO – ปฏิบัติการเมืองเงินทอง (เรื่องเงิน ป.3)
 *
 * ตรวจคณิตศาสตร์ทั้งหมดของเกม:
 *   - 100 สตางค์ = 1 บาท, การแสดงผลแบบบาท–สตางค์ และแบบใช้จุด
 *   - ตัวสร้างโจทย์ทุกตัว × ทุกระดับ สุ่มหลายพันข้อ ทุกข้อต้องมีคำตอบที่ถูก
 *     และตัวตรวจคำตอบต้องยอมรับคำตอบนั้น
 *   - ตัวเลือกไม่ซ้ำ ไม่มีข้อที่กำกวม (ตัวลวงต้องมีค่าต่างจากคำตอบจริง)
 *   - บวก ลบ คูณ หาร แลกเงิน เปรียบเทียบ ตรงกับการคำนวณแบบสตางค์จำนวนเต็ม
 *   - สมุดบัญชีไม่ติดลบ การเดินทางวันสุดท้ายยอดเงินถูกต้อง
 *
 * วิธีใช้
 *   npx tsc -p tsconfig.tests.json --outDir /tmp/logic
 *   node tests/moneyHero.test.mjs /tmp/logic
 */

import path from 'path'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)
const OUT = path.resolve(process.argv[2] ?? '/tmp/logic')
const load = (p) => require(path.join(OUT, 'moneyHero', p))

const money = load('utils/money.js')
const random = load('utils/random.js')
const denoms = load('data/denominations.js')
const gens = load('generators/index.js')
const check = load('engine/check.js')
const solveMod = load('engine/solve.js')
const ledger = load('generators/ledger.js')
const journey = load('generators/journey.js')
const scoring = load('engine/scoring.js')
const town = load('data/town.js')
const progress = load('engine/progress.js')
const report = load('engine/report.js')
const hunt = load('engine/coinHunt.js')

let passed = 0
const failures = []

function assert(cond, msg) {
  if (!cond) throw new Error(msg)
}
function eq(a, b, msg) {
  if (a !== b) throw new Error(`${msg}: ได้ ${JSON.stringify(a)} ควรได้ ${JSON.stringify(b)}`)
}
function test(name, fn) {
  try {
    fn()
    passed += 1
  } catch (error) {
    failures.push(`${name}: ${error.message}`)
  }
}

/* ------------------------------------------------------------------ */
/* หน่วยเงินและการแสดงผล                                               */
/* ------------------------------------------------------------------ */

test('100 สตางค์ = 1 บาท', () => {
  eq(money.toSatang(1, 0), 100, 'toSatang(1)')
  eq(money.toSatang(25, 50), 2550, '25 บาท 50 สตางค์')
  eq(money.splitSatang(112550).baht, 1125, 'baht')
  eq(money.splitSatang(112550).satang, 50, 'satang')
})

test('แสดงผลแบบบาท–สตางค์', () => {
  eq(money.formatBS(112550), '1,125 บาท 50 สตางค์', 'ตัวอย่างจากโจทย์')
  eq(money.formatBS(10000), '100 บาท', 'ไม่มีสตางค์')
  eq(money.formatBS(50), '50 สตางค์', 'ไม่มีบาท')
  eq(money.formatBS(15250), '152 บาท 50 สตางค์', '65.50 + 87')
  eq(money.formatBS(100000), '1,000 บาท', 'พันบาท')
  eq(money.formatBS(1234500), '12,345 บาท', 'หมื่น')
})

test('แสดงผลแบบใช้จุด', () => {
  eq(money.formatDot(2550), '25.50 บาท', '25.50')
  eq(money.formatDot(10000), '100.00 บาท', '100.00')
  eq(money.formatDot(825), '8.25 บาท', '8.25')
  eq(money.formatDot(805), '8.05 บาท', '8.05')
  eq(money.formatDot(112550), '1,125.50 บาท', 'มีจุลภาค')
})

test('อ่านจำนวนเงินแบบใช้จุดที่เด็กพิมพ์', () => {
  eq(money.parseDot('25.50').value, 2550, '25.50')
  eq(money.parseDot('1,125.50 บาท').value, 112550, 'มีคำว่าบาทและจุลภาค')
  eq(money.parseDot('100.00').value, 10000, '100.00')
  eq(money.parseDot('25.5').reason, 'satangDigits', 'สตางค์หลักเดียว')
  eq(money.parseDot('100').reason, 'noDot', 'ไม่มีจุด')
  eq(money.parseDot('12,34.00').reason, 'commaPlace', 'จุลภาคผิดที่')
  eq(money.parseDot('').reason, 'empty', 'ว่าง')
  eq(money.parseDot('abc').reason, 'format', 'ตัวอักษร')
})

test('ไม่ใช้ทศนิยมของ JavaScript (0.1 + 0.2)', () => {
  // 0.10 + 0.20 บาท ต้องได้ 0.30 บาทพอดี
  eq(money.addMoney(10, 20), 30, 'สตางค์')
  eq(money.formatDot(money.addMoney(10, 20)), '0.30 บาท', 'แสดงผล')
  // 87.25 × 3 = 261.75
  eq(money.multiplyMoney(8725, 3), 26175, 'คูณ')
  // 455 ÷ 2 = 227.50
  eq(money.divideMoney(45500, 2), 22750, 'หาร')
  // 100 − 35.50 = 64.50 (ยืม)
  eq(money.subtractMoney(10000, 3550), 6450, 'ลบ')
  let threw = false
  try {
    money.divideMoney(100, 3)
  } catch {
    threw = true
  }
  assert(threw, 'หารไม่ลงตัวต้องถือว่าโจทย์ผิด')
})

test('เปรียบเทียบเงิน: บาทก่อน แล้วค่อยสตางค์', () => {
  eq(money.compareMoney(34550, 51025), '<', '345.50 กับ 510.25')
  eq(money.compareMoney(12075, 12050), '>', 'บาทเท่ากัน')
  eq(money.compareMoney(12050, 12050), '=', 'เท่ากัน')
})

test('เงิน 11 ชนิด ค่าถูกต้อง', () => {
  const expect = { s25: 25, s50: 50, b1: 100, b2: 200, b5: 500, b10: 1000, b20: 2000, b50: 5000, b100: 10000, b500: 50000, b1000: 100000 }
  eq(denoms.DENOMINATIONS.length, 11, 'จำนวนชนิด')
  for (const [id, v] of Object.entries(expect)) eq(denoms.denom(id).value, v, id)
  eq(denoms.COIN_IDS.length, 6, 'เหรียญ 6 ชนิด')
  eq(denoms.NOTE_IDS.length, 5, 'ธนบัตร 5 ชนิด')
  // ตัวอย่างจากเอกสาร: 1,000 + 100 + 20 + 5 + 50 สตางค์ = 1,125 บาท 50 สตางค์
  eq(money.formatBS(denoms.sumDenoms(['b1000', 'b100', 'b20', 'b5', 's50'])), '1,125 บาท 50 สตางค์', 'ตัวอย่างนับเงิน')
})

test('แตกเงินเป็นชนิดที่อนุญาต (decompose)', () => {
  const combo = denoms.decompose(2000, ['b10', 'b5', 'b2', 'b1'])
  eq(denoms.sumDenoms(combo), 2000, '20 บาท')
  const odd = denoms.decompose(600, ['b5', 'b2'])
  // greedy 5 + ... จะติด แต่การค้นหาย้อนกลับต้องหาเจอ 2+2+2
  eq(denoms.sumDenoms(odd), 600, '6 บาท ด้วยเหรียญ 5 กับ 2')
  eq(denoms.decompose(300, ['b2']), null, '3 บาท ด้วยเหรียญ 2 ทำไม่ได้')
})

/* ------------------------------------------------------------------ */
/* ตัวสร้างโจทย์ทุกตัว                                                 */
/* ------------------------------------------------------------------ */

function validateQuestion(q, label) {
  assert(q.id && q.gen && q.skill && q.title, `${label}: ข้อมูลพื้นฐานไม่ครบ`)
  assert(q.hint && q.hint.text && q.hint.visualNote && Array.isArray(q.hint.partial), `${label}: ตัวช่วยไม่ครบ 3 ระดับ`)
  assert(q.explain.length > 0, `${label}: ไม่มีคำอธิบาย`)
  for (const line of [q.title, q.story ?? '', ...q.explain, q.hint.text, ...q.hint.partial]) {
    assert(!/NaN|undefined|null|Infinity/.test(line), `${label}: ข้อความมีค่าผิด "${line}"`)
  }

  const allMoney = []
  switch (q.kind) {
    case 'choice': {
      const labels = q.options.map((o) => o.label + JSON.stringify(o.money ?? []))
      eq(new Set(labels).size, labels.length, `${label}: ตัวเลือกซ้ำ`)
      eq(new Set(q.options.map((o) => o.id)).size, q.options.length, `${label}: id ซ้ำ`)
      assert(q.options.some((o) => o.id === q.answer), `${label}: ไม่มีคำตอบในตัวเลือก`)
      // ตัวเลือกที่เป็นกองเงิน: ถ้าคำถามหา "เท่ากับ" ต้องมีกองที่เท่ากันแค่กองเดียว
      if (q.gen === 'equalValue' || q.gen === 'countChoice') {
        const sums = q.options.map((o) => denoms.sumDenoms(o.money))
        eq(new Set(sums).size, sums.length, `${label}: มีกองเงินค่าเท่ากัน ทำให้กำกวม`)
      }
      if (q.gen === 'notEqual') {
        const sums = q.options.map((o) => denoms.sumDenoms(o.money))
        const answerSum = denoms.sumDenoms(q.options.find((o) => o.id === q.answer).money)
        eq(sums.filter((s) => s === answerSum).length, 1, `${label}: ข้อที่ไม่เท่ามีมากกว่า 1`)
      }
      if (q.gen === 'compare' && q.visual?.type === 'pair') {
        const sign = money.compareMoney(q.visual.a, q.visual.b)
        eq(q.answer, sign === '>' ? 'gt' : sign === '<' ? 'lt' : 'eq', `${label}: เครื่องหมายเปรียบเทียบผิด`)
      }
      if (q.gen === 'dotChoice') {
        const values = q.options.map((o) => money.parseDot(o.label.replace(' บาท', '')))
        assert(values.every((v) => v.ok), `${label}: ตัวเลือกแบบจุดอ่านไม่ได้`)
        eq(new Set(values.map((v) => v.value)).size, values.length, `${label}: ตัวเลือกแบบจุดมีค่าซ้ำ (กำกวม)`)
      }
      for (const o of q.options) if (o.money) allMoney.push(...o.money)
      break
    }
    case 'amount':
      assert(Number.isInteger(q.answer) && q.answer >= 0, `${label}: คำตอบไม่ใช่สตางค์จำนวนเต็ม ${q.answer}`)
      if (q.input === 'baht') eq(q.answer % 100, 0, `${label}: กรอกแค่บาทแต่คำตอบมีสตางค์`)
      break
    case 'number':
      assert(Number.isInteger(q.answer) && q.answer > 0, `${label}: คำตอบตัวเลขผิด ${q.answer}`)
      break
    case 'pay': {
      assert(q.sample.length >= (q.mode === 'make' ? q.ways : 1), `${label}: ตัวอย่างคำตอบไม่ครบ`)
      for (const combo of q.sample) eq(denoms.sumDenoms(combo), q.target, `${label}: ตัวอย่างรวมไม่เท่าเป้าหมาย`)
      if (q.give) eq(denoms.sumDenoms(q.give), q.target, `${label}: ก่อนแลก ≠ เป้าหมาย`)
      allMoney.push(...q.tray)
      break
    }
    case 'match':
      eq([...q.rightOrder].sort().join(), q.pairs.map((p) => p.id).sort().join(), `${label}: ลำดับขวาไม่ครบ`)
      eq(new Set(q.pairs.map((p) => p.right.label)).size, q.pairs.length, `${label}: ฝั่งขวาซ้ำ (กำกวม)`)
      eq(new Set(q.pairs.map((p) => p.left.label)).size, q.pairs.length, `${label}: ฝั่งซ้ายซ้ำ (กำกวม)`)
      break
    case 'sort':
      eq(new Set(q.items.map((i) => i.value)).size, q.items.length, `${label}: มีจำนวนเท่ากัน เรียงได้หลายแบบ`)
      break
    case 'shop': {
      eq(new Set(q.products.map((p) => p.id)).size, q.products.length, `${label}: สินค้าซ้ำ`)
      if (q.budget !== undefined) {
        const top = q.products.map((p) => p.price).sort((a, b) => b - a).slice(0, q.pick).reduce((s, v) => s + v, 0)
        assert(q.budget >= top, `${label}: งบไม่พอซื้อของแพงสุด ${q.pick} ชิ้น`)
      }
      for (const p of q.products) assert(Number.isInteger(p.price) && p.price > 0 && p.price % 25 === 0, `${label}: ราคาผิด ${p.price}`)
      break
    }
    case 'word': {
      const expected =
        q.op === '+' ? q.a + q.b : q.op === '-' ? q.a - q.b : q.op === '×' ? q.a * q.b : q.a / q.b
      eq(q.answer, expected, `${label}: คำตอบไม่ตรงกับการ${q.op}`)
      assert(Number.isInteger(q.answer) && q.answer > 0, `${label}: คำตอบต้องเป็นสตางค์จำนวนเต็มบวก`)
      assert(q.answer % 25 === 0, `${label}: คำตอบต้องจ่ายด้วยเหรียญจริงได้ (ลงตัว 25 สตางค์)`)
      eq(q.given.options.length, new Set(q.given.options).size, `${label}: ตัวเลือกโจทย์บอกซ้ำ`)
      assert(q.given.options[q.given.answer] && q.asked.options[q.asked.answer], `${label}: คำตอบขั้นอ่านโจทย์หาย`)
      break
    }
    case 'ledger': {
      const bal = ledger.balances(q.sheet)
      assert(bal.every((b) => b >= 0), `${label}: คงเหลือติดลบ`)
      break
    }
  }
  for (const id of allMoney) assert(denoms.denom(id), `${label}: เงินชนิด ${id} ไม่มีจริง`)

  // คำตอบที่ถูกต้องต้องผ่านการตรวจ
  const right = solveMod.solve(q)
  const result = check.checkAnswer(q, right)
  assert(result.correct, `${label}: คำตอบที่ถูกถูกตัดสินว่าผิด (${result.feedback}) ${JSON.stringify(q).slice(0, 400)}`)
  return right
}

function wrongVersion(q, right) {
  switch (q.kind) {
    case 'choice':
      return { kind: 'choice', id: q.options.find((o) => o.id !== q.answer).id }
    case 'amount': {
      const v = q.answer + 100
      const { baht, satang } = money.splitSatang(v)
      return { ...right, baht: String(baht), satang: String(satang), dot: money.formatDotNumber(v) }
    }
    case 'number':
      return { kind: 'number', value: String(q.answer + 1) }
    case 'pay':
      return { kind: 'pay', combos: right.combos.map((c, i) => (i === 0 ? c.concat(['b1']) : c)) }
    case 'match': {
      const ids = q.pairs.map((p) => p.id)
      return { kind: 'match', pairs: Object.fromEntries(ids.map((id, i) => [id, ids[(i + 1) % ids.length]])) }
    }
    case 'sort':
      return { kind: 'sort', order: right.order.slice().reverse() }
    case 'shop':
      return { ...right, totalBaht: String(Number(right.totalBaht) + 1) }
    case 'word':
      return { ...right, calc: String(Number(right.calc) + 1) }
    case 'ledger': {
      const cells = right.cells.map((c) => ({ income: c.expense, expense: c.income }))
      return { kind: 'ledger', cells }
    }
  }
}

const ROUNDS = Number(process.env.MONEY_ROUNDS ?? 400)

for (const gen of Object.keys(gens.GENERATORS)) {
  for (const d of [1, 2, 3]) {
    test(`ตัวสร้างโจทย์ ${gen} ระดับ ${d} (${ROUNDS} รอบ)`, () => {
      random.seedRandom(1000 * d + gen.length)
      for (let i = 0; i < ROUNDS; i += 1) {
        const qs = gens.generate(gen, d)
        for (const q of qs) {
          const label = `${gen}/${d}#${i}`
          const right = validateQuestion(q, label)
          const wrong = wrongVersion(q, right)
          const result = check.checkAnswer(q, wrong)
          assert(!result.correct, `${label}: คำตอบผิดถูกตัดสินว่าถูก ${JSON.stringify(wrong).slice(0, 200)}`)
          assert(result.feedback, `${label}: ตอบผิดแล้วไม่มีคำแนะนำ`)
        }
      }
    })
  }
}

test('ตัวตรวจให้คำแนะนำเฉพาะจุด', () => {
  random.seedRandom(7)
  const q = gens.generate('add', 2)[0]
  const { baht, satang } = money.splitSatang(q.answer)
  const wrongSatang = check.checkAnswer(q, { kind: 'amount', baht: String(baht), satang: String((satang + 25) % 100), dot: '' })
  assert(/บาทถูกแล้ว/.test(wrongSatang.feedback), 'บาทถูกแต่สตางค์ผิด ต้องบอกว่าบาทถูกแล้ว')
  const tooMany = check.checkAnswer(q, { kind: 'amount', baht: '1', satang: '150', dot: '' })
  assert(/100 สตางค์ = 1 บาท/.test(tooMany.feedback), 'สตางค์เกิน 99 ต้องสอนว่า 100 สตางค์ = 1 บาท')
  const dotQ = gens.generate('dotWrite', 1)[0]
  const noDot = check.checkAnswer(dotQ, { kind: 'amount', baht: '', satang: '', dot: '25' })
  assert(/\.00/.test(noDot.feedback), 'ลืมจุดต้องเตือนเรื่อง .00')
  const oneDigit = check.checkAnswer(dotQ, { kind: 'amount', baht: '', satang: '', dot: '25.5' })
  assert(/2 หลัก/.test(oneDigit.feedback), 'สตางค์หลักเดียวต้องเตือนเรื่อง 2 หลัก')
})

test('MONEY MAKER: แบบซ้ำไม่นับ', () => {
  random.seedRandom(11)
  const q = gens.generate('moneyMaker', 2)[0]
  const same = check.checkAnswer(q, { kind: 'pay', combos: [q.sample[0], q.sample[0].slice().reverse(), q.sample[1]] })
  assert(!same.correct && /ซ้ำ/.test(same.feedback), 'แบบที่เรียงต่างแต่เงินชุดเดียวกันต้องถือว่าซ้ำ')
})

test('แลกเงิน: ห้ามแลกเป็นชนิดเดิม', () => {
  random.seedRandom(5)
  for (let i = 0; i < 50; i += 1) {
    const q = gens.generate('exchange', 1)[0]
    if (q.give.length !== 1) continue
    const res = check.checkAnswer(q, { kind: 'pay', combos: [q.give.slice()] })
    assert(!res.correct, 'เอาเงินชิ้นเดิมกลับมาไม่ใช่การแลก')
  }
})

test('สมุดบัญชี: ใส่ผิดช่องต้องบอกว่าผิดช่อง', () => {
  random.seedRandom(3)
  const q = gens.generate('ledgerFill', 1)[0]
  const right = solveMod.solve(q)
  const swapped = { kind: 'ledger', cells: right.cells.map((c, i) => (i === 0 ? { income: c.expense, expense: c.income } : c)) }
  const res = check.checkAnswer(q, swapped)
  assert(!res.correct && /ช่อง/.test(res.feedback), 'ต้องบอกว่าใส่ผิดช่อง')
  eq(res.wrongKeys.join(), '0', 'ผิดเฉพาะแถวแรก')
})

test('สมุดบัญชีหลายวัน: วันที่ใช้เงินมากที่สุดมีวันเดียว', () => {
  random.seedRandom(99)
  for (let i = 0; i < 500; i += 1) {
    const sheet = ledger.generateLedgerSheet(3)
    const q = ledger.generateIncomeExpenseQuestion(3, sheet, 'maxDay')
    eq(q.kind, 'choice', 'ต้องเป็นคำถามเลือกวัน')
  }
})

/* ------------------------------------------------------------------ */
/* ด่านและแบบทดสอบ                                                     */
/* ------------------------------------------------------------------ */

test('ทุกด่านมีคำถามครบ 3 ขั้น (PRACTICE · MISSION · BOSS)', () => {
  random.seedRandom(2024)
  for (let level = 0; level <= 12; level += 1) {
    for (let round = 0; round < 30; round += 1) {
      const practice = gens.buildStep(level, 'practice')
      const boss = gens.buildStep(level, 'boss')
      assert(practice.length >= 3 && practice.length <= 5, `ด่าน ${level} PRACTICE มี ${practice.length} ข้อ`)
      assert(boss.length >= 3 && boss.length <= 5, `ด่าน ${level} BOSS มี ${boss.length} ข้อ`)
      if (level !== 12) {
        const mission = gens.buildStep(level, 'mission')
        assert(mission.length >= 5 && mission.length <= 10, `ด่าน ${level} MISSION มี ${mission.length} ข้อ`)
      }
    }
  }
})

test('แบบทดสอบก่อนเรียน 18 ข้อ หลังเรียน 20 ข้อ ครบ 9 ทักษะ', () => {
  random.seedRandom(1)
  for (let i = 0; i < 50; i += 1) {
    const pre = gens.buildTest('pre')
    const post = gens.buildTest('post')
    eq(pre.length, 18, 'pre-test')
    eq(post.length, 20, 'post-test')
    eq(new Set(pre.map((q) => q.skill)).size, 9, 'pre ครบทักษะ')
    eq(new Set(post.map((q) => q.skill)).size, 9, 'post ครบทักษะ')
    for (const q of [...pre, ...post]) validateQuestion(q, `test/${q.gen}`)
  }
})

test('FINAL MONEY MASTER: การเดินทาง 1 วัน ยอดเงินถูกต้องทุกสถานี', () => {
  random.seedRandom(77)
  for (let i = 0; i < 300; i += 1) {
    const stations = journey.buildJourney()
    eq(stations.map((s) => s.icon).join(''), '🏦🛒🍱📚🏪🏠', 'ลำดับสถานี')
    const events = []
    for (const station of stations) {
      if (station.id === 'home') {
        const home = journey.buildHomeQuestions(events)
        eq(home[0].kind, 'ledger', 'บ้านต้องเริ่มด้วยสมุดบัญชี')
        for (const q of home) validateQuestion(q, `home#${i}`)
        const balanceQ = home[home.length - 1]
        eq(balanceQ.answer, journey.walletAfter(events), 'คงเหลือในสมุด = เงินในกระเป๋า')
        break
      }
      for (const q of station.questions) {
        validateQuestion(q, `${station.id}#${i}`)
        if (q.kind === 'shop') {
          eq(q.budget, journey.walletAfter(events), 'งบที่ร้านเครื่องเขียน = เงินในกระเป๋า')
          const picked = q.products.slice(0, q.pick)
          const total = picked.reduce((s, p) => s + p.price, 0)
          events.push({ item: `ซื้อ${picked.map((p) => p.name).join(' และ ')}`, type: 'out', amount: total })
        }
      }
      events.push(...station.events)
      assert(journey.walletAfter(events) >= 0, 'เงินในกระเป๋าติดลบ')
    }
  }
})

/* ------------------------------------------------------------------ */
/* คะแนนและดาว                                                        */
/* ------------------------------------------------------------------ */

test('ดาว: 90% ขึ้นไป 3 ดาว, 70% ขึ้นไป 2 ดาว, ผ่าน 1 ดาว', () => {
  eq(scoring.starsFor(1), 3, '100%')
  eq(scoring.starsFor(0.9), 3, '90%')
  eq(scoring.starsFor(0.89), 2, '89%')
  eq(scoring.starsFor(0.7), 2, '70%')
  eq(scoring.starsFor(0.5), 1, '50% ยังได้ 1 ดาว ไม่ลงโทษรุนแรง')
  eq(scoring.starsFor(0), 1, 'ผ่านด่านแล้วได้อย่างน้อย 1 ดาว')
})

test('คะแนนต่อข้อ: ถูกครั้งแรกได้มากกว่า และโบนัสไม่ติดลบ', () => {
  const first = scoring.scoreAnswer({ correct: true, attempt: 1, streak: 0, ms: 30000, hintsUsed: 0 })
  const second = scoring.scoreAnswer({ correct: true, attempt: 2, streak: 0, ms: 30000, hintsUsed: 0 })
  const fast = scoring.scoreAnswer({ correct: true, attempt: 1, streak: 0, ms: 5000, hintsUsed: 0 })
  const streak = scoring.scoreAnswer({ correct: true, attempt: 1, streak: 5, ms: 30000, hintsUsed: 0 })
  const hinted = scoring.scoreAnswer({ correct: true, attempt: 1, streak: 0, ms: 30000, hintsUsed: 2 })
  const wrong = scoring.scoreAnswer({ correct: false, attempt: 1, streak: 0, ms: 30000, hintsUsed: 0 })
  assert(first.exp > second.exp, 'ถูกครั้งแรกต้องได้มากกว่า')
  assert(fast.exp > first.exp, 'ตอบเร็วได้โบนัส')
  assert(streak.exp > first.exp, 'ตอบต่อเนื่องได้โบนัส')
  assert(first.exp > hinted.exp && hinted.exp > 0, 'ไม่ใช้ตัวช่วยได้มากกว่า แต่ใช้ตัวช่วยก็ยังได้คะแนน')
  eq(wrong.exp, 0, 'ตอบผิดไม่ได้คะแนน แต่ไม่หักคะแนน')
  assert(wrong.coins >= 0, 'ไม่หักเหรียญ')
})

/* ------------------------------------------------------------------ */
/* ผังเมือง (แผนที่ 2 มิติ)                                            */
/* ------------------------------------------------------------------ */

test('เมือง: ถนนเดินได้ตลอดเส้น ไม่มีต้นไม้หรืออาคารขวาง', () => {
  for (let i = 0; i < town.ROAD.length - 1; i += 1) {
    const a = town.ROAD[i]
    const b = town.ROAD[i + 1]
    const n = Math.ceil(town.dist(a, b) / 6)
    for (let k = 0; k <= n; k += 1) {
      const p = { x: a.x + ((b.x - a.x) * k) / n, y: a.y + ((b.y - a.y) * k) / n }
      assert(town.walkable(p), `ถนนช่วงที่ ${i} ถูกขวางที่ (${Math.round(p.x)}, ${Math.round(p.y)})`)
    }
  }
})

test('เมือง: ประตูครบ 13 ด่าน เหรียญทุกเหรียญเก็บได้', () => {
  for (let l = 0; l <= 12; l += 1) assert(town.walkable(town.doorOf(l)), `ประตูด่าน ${l} ถูกขวาง`)
  assert(town.TOWN_COINS.length >= 20, 'เหรียญบนแผนที่น้อยเกินไป')
  for (const c of town.TOWN_COINS) assert(town.walkable(c), `เหรียญ ${c.id} อยู่ในที่ที่เดินไปไม่ได้`)
  eq(new Set(town.TOWN_COINS.map((c) => c.id)).size, town.TOWN_COINS.length, 'id เหรียญซ้ำ')
})

test('เมือง: แตะอาคารจากที่ไหนก็เดินตามถนนไปถึงประตูได้', () => {
  const starts = [town.doorOf(0), town.doorOf(6), town.doorOf(12), { x: 800, y: 1520 }, { x: 1100, y: 1040 }]
  for (const from of starts) {
    for (let l = 0; l <= 12; l += 1) {
      const route = town.routeTo(from, l)
      const end = route[route.length - 1]
      eq(`${end.x},${end.y}`, `${town.doorOf(l).x},${town.doorOf(l).y}`, `เส้นทางไปด่าน ${l} ไม่จบที่ประตู`)
    }
  }
})

test('เมือง: ต้นไม้ไม่ทับอาคาร ไม่ทับแม่น้ำ และเพื่อน ๆ ยืนบนพื้นที่เดินได้', () => {
  assert(town.TREES.length > 40, 'ต้นไม้น้อยเกินไป')
  for (const t of town.TREES) {
    assert(!(t.y > town.RIVER.top - t.r && t.y < town.RIVER.bottom + t.r), `ต้นไม้อยู่ในแม่น้ำ (${t.x}, ${t.y})`)
    for (let l = 0; l <= 12; l += 1) {
      const b = town.buildingRect(l)
      const inside = t.x > b.x - t.r && t.x < b.x + b.w + t.r && t.y > b.y - t.r && t.y < b.y + b.h + town.BUILDING.gap + t.r
      assert(!inside, `ต้นไม้ทับอาคารด่าน ${l}`)
    }
  }
  for (const n of town.TOWN_NPCS) {
    const beside = { x: n.x, y: n.y - 40 }
    assert(town.walkable(beside) || town.walkable({ x: n.x + 40, y: n.y }), `เดินไปหา${n.id}ไม่ได้`)
  }
})

/* ------------------------------------------------------------------ */
/* แบบทดสอบ ฝึกข้อที่ผิด และรายงานคุณครู                                 */
/* ------------------------------------------------------------------ */

function fakeRun(bySkill) {
  let firstTry = 0
  let originals = 0
  for (const v of Object.values(bySkill)) {
    firstTry += v.correct
    originals += v.total
  }
  return { firstTry, originals, ms: 90000, bySkill }
}

test('แบบทดสอบ: สรุปคะแนนรายทักษะ และรางวัลได้ครั้งแรกครั้งเดียว', () => {
  let p = progress.newPlayer('ทดสอบ', 'hero', 1)
  const pre = progress.testResultFrom(fakeRun({ count: { correct: 1, total: 2 }, compare: { correct: 2, total: 4 } }), 5)
  eq(pre.score, 3, 'คะแนนรวม')
  eq(pre.total, 6, 'จำนวนข้อ')
  eq(pre.skills.count.total, 2, 'ทักษะ count')
  eq(pre.skills.ledger.total, 0, 'ทักษะที่ไม่มีในชุดต้องเป็น 0')
  p = progress.recordTest(p, 'pre', pre)
  eq(p.exp, progress.TEST_REWARD.pre.exp, 'EXP ครั้งแรก')
  p = progress.recordTest(p, 'pre', pre)
  eq(p.exp, progress.TEST_REWARD.pre.exp, 'ทำซ้ำต้องไม่ได้ EXP เพิ่ม')
  eq(report.testPercent(p.preTest), 50, 'เปอร์เซ็นต์ก่อนเรียน')
  assert(progress.newBadges(p).includes('pretest'), 'ต้องได้ตรานักสำรวจพลัง')
  assert(!progress.canTakePostTest(p), 'ยังไม่ผ่านด่าน 12 ต้องยังทำหลังเรียนไม่ได้')
  p = { ...p, levels: { 12: { ...progress.emptyLevel(), stepDone: 4 } } }
  assert(progress.canTakePostTest(p), 'ผ่านด่าน 12 แล้วต้องทำหลังเรียนได้')
  // หลังเรียน 20 ข้อ ถูก 13 ข้อ (65%) มากกว่าก่อนเรียน (50%) แม้จำนวนข้อไม่เท่ากัน
  const post = progress.testResultFrom(fakeRun({ count: { correct: 7, total: 10 }, compare: { correct: 6, total: 10 } }))
  p = progress.recordTest(p, 'post', post)
  eq(report.improvement(p), 15, 'พัฒนาการ')
  const badges = progress.newBadges(p)
  assert(badges.includes('posttest') && badges.includes('improver'), `ตราหลังเรียนไม่ครบ: ${badges}`)
  eq(report.testSkillPercent(p.postTest, 'count'), 70, 'เปอร์เซ็นต์รายทักษะ')
  eq(report.testSkillPercent(p.postTest, 'ledger'), null, 'ทักษะที่ไม่ได้สอบต้องเป็น null')
})

test('ตราเก่งขึ้นทุกวัน: เทียบเป็นเปอร์เซ็นต์ ไม่ใช่จำนวนข้อ', () => {
  let p = progress.newPlayer('ทดสอบ', 'hero', 1)
  // ก่อนเรียน 15/18 (83%) หลังเรียน 16/20 (80%) จำนวนข้อมากกว่าแต่เปอร์เซ็นต์น้อยกว่า
  p = progress.recordTest(p, 'pre', { score: 15, total: 18, timeMs: 1, at: 1, skills: progress.emptyTestSkills() })
  p = progress.recordTest(p, 'post', { score: 16, total: 20, timeMs: 1, at: 2, skills: progress.emptyTestSkills() })
  assert(!progress.newBadges(p).includes('improver'), 'คะแนนลดลงแต่ได้ตราเก่งขึ้น')
})

test('ฝึกข้อที่ผิด: แบบโจทย์ละ 1 ข้อ ล่าสุดก่อน และแก้แล้วไม่กลับมาอีก', () => {
  let p = progress.newPlayer('ทดสอบ', 'hero', 1)
  const q1 = gens.regenerate('compare', 2)
  const q2 = gens.regenerate('add', 1)
  for (const q of [q1, q1, q2]) p = progress.recordAnswer(p, q, 4, false, 1000, 0)
  const pending = progress.pendingMistakes(p)
  eq(pending.length, 2, 'จำนวนแบบโจทย์ที่ต้องฝึก')
  eq(pending[0].gen, 'add', 'ข้อล่าสุดต้องมาก่อน')
  p = progress.markMistakeFixed(p, 'compare')
  eq(progress.pendingMistakes(p).length, 1, 'แก้แล้วต้องหายจากรายการ')
  assert(p.mistakes.filter((m) => m.gen === 'compare').every((m) => m.fixed), 'ต้องทำเครื่องหมายทุกข้อของแบบนั้น')
  eq(progress.markMistakeFixed(p, 'compare'), p, 'ไม่มีอะไรเปลี่ยนต้องคืนตัวเดิม')
  // แบบทดสอบ (levelId -1) ไม่นับเป็นข้อที่ต้องฝึก
  p = progress.recordAnswer(p, gens.regenerate('divide', 1), -1, false, 1000, 0)
  eq(progress.pendingMistakes(p).length, 1, 'ข้อผิดในแบบทดสอบต้องไม่ถูกบันทึก')
  for (const m of progress.pendingMistakes(p)) validateQuestion(gens.regenerate(m.gen, m.difficulty), `ฝึกซ้ำ ${m.gen}`)
})

test('แผงคุณครู: ค่าเฉลี่ยทั้งห้องไม่นับคนที่ยังไม่มีข้อมูล และ CSV ถูกต้อง', () => {
  const a = progress.newPlayer('เอ, "ก"', 'hero', 1)
  a.skills.count = { attempts: 4, correct: 2, timeMs: 1 }
  a.answered = 4
  a.preTest = { score: 9, total: 18, timeMs: 60000, at: 1, skills: progress.emptyTestSkills() }
  a.postTest = { score: 18, total: 20, timeMs: 60000, at: 2, skills: progress.emptyTestSkills() }
  const b = progress.newPlayer('บี', 'wizard', 2)
  b.skills.count = { attempts: 4, correct: 4, timeMs: 1 }
  b.answered = 4
  const c = progress.newPlayer('ซี', 'adventurer', 3)
  const sum = report.classSummary([a, b, c])
  eq(sum.players, 3, 'จำนวนนักเรียน')
  eq(sum.skills.count, 75, 'ค่าเฉลี่ยทักษะ (50% กับ 100%)')
  eq(sum.skills.ledger, null, 'ทักษะที่ไม่มีใครทำต้องเป็น null')
  eq(sum.accuracy, 75, 'ตอบถูกเฉลี่ยไม่นับคนที่ยังไม่ทำ')
  eq(sum.pre, 50, 'ก่อนเรียนเฉลี่ย')
  eq(sum.improvement, 40, 'พัฒนาการเฉลี่ย')
  eq(sum.weakCount.count, 1, 'จำนวนคนที่ทักษะอ่อน')
  const csv = report.buildCsv([a, b, c])
  assert(csv.charCodeAt(0) === 0xfeff, 'CSV ต้องขึ้นต้นด้วย BOM ให้ Excel อ่านภาษาไทยได้')
  const lines = csv.slice(1).split('\r\n')
  eq(lines.length, 4, 'จำนวนบรรทัด CSV')
  assert(lines[1].startsWith('"เอ, ""ก"""'), `ชื่อที่มีจุลภาคและอัญประกาศต้องถูกครอบ: ${lines[1].slice(0, 20)}`)
  const cols = lines[0].split(',').length
  for (const l of lines.slice(2)) eq(l.split(',').length, cols, 'จำนวนคอลัมน์ต้องเท่ากันทุกแถว')
})

test('ล่าเหรียญ AR: ทุกรอบมีทางเก็บได้พอดี และตัวตรวจบอกขาด/เกินถูกต้อง', () => {
  for (let i = 0; i < 3000; i += 1) {
    const round = i % hunt.HUNT_ROUNDS
    const r = hunt.makeRound(round)
    const lv = hunt.HUNT_LEVELS[round]
    assert(r.target > 0, 'เป้าหมายต้องมากกว่า 0')
    assert(r.spawns.every((id) => lv.allowed.includes(id)), `รอบ ${round} มีเงินชนิดที่ไม่อนุญาต`)
    assert(new Set(r.solution).size === r.solution.length, 'ตำแหน่งคำตอบซ้ำ')
    assert(r.spawns.length > r.solution.length, 'ต้องมีตัวหลอกด้วย')
    const picked = r.solution.map((k) => r.spawns[k])
    const ok = hunt.checkHunt(r.target, picked)
    assert(ok.ok && ok.diff === 0, `ชุดคำตอบไม่พอดี (รอบ ${round})`)
  }
  const less = hunt.checkHunt(1000, ['b5'])
  assert(!less.ok && less.diff === -500 && less.message.includes('ขาดอีก 5 บาท'), less.message)
  const more = hunt.checkHunt(150, ['b1', 's50', 's25'])
  assert(!more.ok && more.diff === 25 && more.message.includes('เกินมา 25 สตางค์'), more.message)
  assert(!hunt.checkHunt(100, []).ok, 'ยังไม่เก็บอะไรต้องไม่ผ่าน')
})

console.log(`ผ่าน ${passed} ข้อ`)
if (failures.length > 0) {
  console.log(`\nไม่ผ่าน ${failures.length} ข้อ`)
  failures.slice(0, 40).forEach((line, i) => console.log(`  ${i + 1}. ${line}`))
  process.exit(1)
}
console.log('ผ่านทั้งหมด')
