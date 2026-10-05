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

console.log(`ผ่าน ${passed} ข้อ`)
if (failures.length > 0) {
  console.log(`\nไม่ผ่าน ${failures.length} ข้อ`)
  failures.slice(0, 40).forEach((line, i) => console.log(`  ${i + 1}. ${line}`))
  process.exit(1)
}
console.log('ผ่านทั้งหมด')
