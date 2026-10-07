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
const daily = load('engine/daily.js')
const quest = load('engine/npcQuest.js')
const sandbox = load('engine/sandbox.js')
const book = load('engine/ledger.js')
const kad = load('kad/kadData.js')
const pinch = load('engine/pinch.js')
const eco = load('engine/eco.js')
const changeGame = load('engine/changeGame.js')
const bosses = load('data/bosses.js')
const missions = load('data/missions.js')
const practice = load('data/practice.js')
const stages = load('engine/stages.js')
const speech = load('utils/speech.js')

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
  b.eco = { ...b.eco, days: 2, sales: 4500, donated: 1000, bestProfit: 2500 }
  c.eco = { ...c.eco, days: 1, sales: 3000, donated: 500 }
  const sum = report.classSummary([a, b, c])
  eq(sum.ecoPlayers, 2, 'จำนวนคนที่เล่นกาด')
  eq(sum.ecoSales, 75, 'ยอดขายกาดรวมทั้งห้อง (บาท)')
  eq(sum.ecoDonated, 15, 'บริจาครวมทั้งห้อง (บาท)')
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
  assert(lines[0].includes('กาดรักษ์โลก: ยอดขายสะสม (บาท)'), 'CSV ต้องมีผลกาดรักษ์โลก')
  assert(lines[2].includes(',2,45,25,0,10,'), `ผลกาดของบีใน CSV: ${lines[2]}`)
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

test('ร้านของฮีโร่: ซื้อได้เมื่อเหรียญพอ บอกจำนวนที่ขาด และสวม/ถอดได้', () => {
  let p = progress.newPlayer('ทดสอบ', 'hero', 1)
  p = { ...p, coins: 12 }
  const short = progress.buyItem(p, 'hat-cap')
  assert(!short.ok && short.reason === 'short' && short.short === 3, `ต้องบอกว่าขาด 3 เหรียญ: ${JSON.stringify(short)}`)
  const ok = progress.buyItem(p, 'hat-flower')
  assert(ok.ok, 'เหรียญพอแต่ซื้อไม่ได้')
  eq(ok.left, 2, 'เหรียญที่เหลือ')
  p = ok.player
  eq(p.coins, 2, 'ต้องตัดเหรียญ')
  eq(p.wear.hat, 'hat-flower', 'ซื้อแล้วต้องสวมให้ทันที')
  assert(progress.newBadges(p).includes('shopper'), 'ซื้อชิ้นแรกต้องได้ตรานักช้อปตัวน้อย')
  const again = progress.buyItem({ ...p, coins: 99 }, 'hat-flower')
  assert(!again.ok && again.reason === 'owned', 'ซื้อซ้ำต้องไม่ได้')
  p = progress.toggleWear(p, 'hat-flower')
  eq(p.wear.hat, undefined, 'กดซ้ำต้องถอด')
  eq(progress.toggleWear(p, 'pet-piggy'), p, 'ของที่ยังไม่ได้ซื้อสวมไม่ได้')
  assert(!progress.buyItem(p, 'ไม่มีจริง').ok, 'ของที่ไม่มีในร้านต้องซื้อไม่ได้')
  // บันทึกเก่าที่ยังไม่มีข้อมูลร้านต้องเปิดได้
  const old = progress.parseSave(JSON.stringify({ players: { a: { id: 'a', name: 'เก่า' } } }))
  eq(old.players.a.owned.length, 0, 'บันทึกเก่าต้องมีคลังของว่าง')
})

test('ภารกิจประจำวัน: สตรีคต่อเมื่อทำวันถัดไป ขาดแล้วเริ่มใหม่ และโจทย์วันเดียวกันได้ชุดเดิม', () => {
  eq(daily.shiftDay('2026-12-31', 1), '2027-01-01', 'ข้ามปี')
  eq(daily.shiftDay('2026-03-01', -1), '2026-02-28', 'ย้อนเดือน')
  let d = daily.recordDaily(undefined, '2026-10-05')
  eq(d.streak, 1, 'วันแรก')
  eq(daily.recordDaily(d, '2026-10-05'), d, 'ทำซ้ำวันเดียวกันต้องไม่นับเพิ่ม')
  d = daily.recordDaily(d, '2026-10-06')
  d = daily.recordDaily(d, '2026-10-07')
  eq(d.streak, 3, 'ติดกัน 3 วัน')
  eq(daily.liveStreak(d, '2026-10-08'), 3, 'วันถัดไปยังไม่ทำ สตรีคยังอยู่')
  eq(daily.liveStreak(d, '2026-10-09'), 0, 'ขาดไปวันหนึ่ง สตรีคหาย')
  d = daily.recordDaily(d, '2026-10-10')
  eq(d.streak, 1, 'ขาดแล้วเริ่มนับใหม่')
  eq(d.best, 3, 'สถิติสูงสุดยังอยู่')
  let p = progress.newPlayer('ทดสอบ', 'hero', 1)
  p = { ...p, daily: { last: '2026-10-07', streak: 3, best: 3, days: [] } }
  assert(progress.newBadges(p).includes('daily3'), 'ติดกัน 3 วันต้องได้ตราขยันทุกวัน')
  const a = daily.buildDaily(p, '2026-10-07').map((q) => q.title + JSON.stringify(q.answer ?? null))
  const b = daily.buildDaily(p, '2026-10-07').map((q) => q.title + JSON.stringify(q.answer ?? null))
  eq(a.join('|'), b.join('|'), 'วันเดียวกันต้องได้โจทย์ชุดเดิม')
  eq(a.length, daily.DAILY_COUNT, 'จำนวนข้อ')
  for (const q of daily.buildDaily(p, '2026-10-08')) validateQuestion(q, `ภารกิจประจำวัน ${q.gen}`)
  // ผ่านด่าน 7 แล้ว ต้องออกโจทย์จากด่านที่ผ่าน
  p = { ...p, levels: { 7: { ...progress.emptyLevel(), stepDone: 4 } } }
  eq(daily.dailyLevels(p).join(','), '7', 'ใช้ด่านที่ผ่านแล้ว')
  assert(daily.dailyReward(10).coins === 20, 'โบนัสสตรีคสูงสุด +10')
})

test('ภารกิจจากเพื่อนในเมือง: วันละครั้งต่อเพื่อน ได้รางวัลเมื่อตอบถูก', () => {
  let p = progress.newPlayer('ทดสอบ', 'hero', 1)
  for (const npc of ['rabbit', 'fox', 'bear', 'owl']) {
    for (let i = 0; i < 50; i += 1) {
      const q = quest.makeQuest(npc)
      eq(q.npc, npc, 'โจทย์ต้องเป็นของเพื่อนคนนั้น')
      validateQuestion(q, `ภารกิจของ ${npc}`)
    }
  }
  assert(quest.questAvailable(p, 'bear', '2026-10-07'), 'วันใหม่ต้องมีภารกิจ')
  p = quest.recordQuest(p, 'bear', true, '2026-10-07')
  eq(p.coins, quest.QUEST_REWARD.coins, 'ตอบถูกได้เหรียญ')
  assert(!quest.questAvailable(p, 'bear', '2026-10-07'), 'ทำแล้ววันเดียวกันต้องไม่มีอีก')
  eq(quest.recordQuest(p, 'bear', true, '2026-10-07'), p, 'ทำซ้ำวันเดียวกันต้องไม่ได้เพิ่ม')
  assert(quest.questAvailable(p, 'bear', '2026-10-08'), 'วันถัดไปมีภารกิจใหม่')
  const fail = quest.recordQuest(p, 'fox', false, '2026-10-07')
  eq(fail.coins, p.coins, 'ตอบไม่ถูกไม่ได้เหรียญ')
  assert(!quest.questAvailable(fail, 'fox', '2026-10-07'), 'ตอบไม่ถูกก็นับว่าทำแล้ววันนี้')
  p = { ...p, questsDone: 4 }
  assert(progress.newBadges(p).includes('helper'), 'ช่วยเพื่อน 4 ครั้งต้องได้ตรา')
})

test('โต๊ะนับเงิน: รวมยอดถูก แยกนับตามชนิด และแลกให้น้อยชิ้นที่สุดได้ยอดเท่าเดิม', () => {
  const s = sandbox.summarize(['b1', 'b100', 's50', 'b1', 'b100'])
  eq(s.total, 20250, 'ยอดรวม')
  eq(s.groups[0].id, 'b100', 'ชนิดค่ามากต้องอยู่ก่อน')
  eq(s.groups[0].count, 2, 'จำนวนใบ')
  eq(s.groups[0].label, 'ธนบัตร 100 บาท 2 ใบ', 'ชื่อกลุ่ม')
  for (let i = 0; i < 2000; i += 1) {
    const total = (1 + Math.floor(Math.random() * 400000)) * 25
    const f = sandbox.fewestPieces(total)
    eq(f.reduce((a, id) => a + ({ s25: 25, s50: 50, b1: 100, b2: 200, b5: 500, b10: 1000, b20: 2000, b50: 5000, b100: 10000, b500: 50000, b1000: 100000 })[id], 0), total, `แลกแล้วยอดไม่เท่าเดิม (${total})`)
  }
  eq(sandbox.fewestPieces(18875).join(','), 'b100,b50,b20,b10,b5,b2,b1,s50,s25', '188.75 บาท แลกได้ 9 ชิ้น')
})

test('สมุดบัญชีของฮีโร่: รับ/จ่ายแล้วเหรียญตรง รวมบรรทัดชื่อเดียวกันในวันเดียว และยอดยกมา + รับ − จ่าย = คงเหลือ', () => {
  const day = new Date(2026, 9, 7, 9).getTime()
  let p = { ...progress.newPlayer('สมุด', 'hero', day), coins: 40 }
  p = book.earn(p, 2, 'ตอบถูก ด่าน 3', '✅', day)
  p = book.earn(p, 3, 'ตอบถูก ด่าน 3', '✅', day + 60000)
  eq(p.ledger.length, 1, 'ชื่อเดียวกันวันเดียวกันต้องรวมเป็นบรรทัดเดียว')
  eq(p.ledger[0].amount, 5, 'ยอดที่รวม')
  p = book.earn(p, 0, 'ไม่มีอะไร', '❔', day)
  eq(p.ledger.length, 1, 'ศูนย์เหรียญไม่ต้องจด')
  p = book.earn(p, 3, 'ตอบถูก ด่าน 3', '✅', day + 86400000)
  eq(p.ledger.length, 2, 'ข้ามวันต้องขึ้นบรรทัดใหม่')
  p = book.earn(p, -20, 'ซื้อหมวก', '🎩', day + 86400000)
  eq(p.coins, 28, 'เหรียญหลังรับและจ่าย')
  const b = book.ledgerBook(p)
  eq(b.opening, 40, 'ยอดยกมาคือเงินก่อนบรรทัดแรก')
  eq(b.income, 8, 'รายรับรวม')
  eq(b.expense, 20, 'รายจ่ายรวม')
  eq(b.rows[b.rows.length - 1].balance, 28, 'คงเหลือบรรทัดสุดท้าย')
  eq(b.opening + b.income - b.expense, b.closing, 'สมการสมุดบัญชี')
  // สุ่มรับจ่ายหลายร้อยครั้ง: สมการต้องจริงทุกครั้ง ทั้งแบบเต็มเล่มและแบบดูบางบรรทัด
  for (let k = 0; k < 400; k += 1) {
    const amt = Math.random() < 0.7 ? 1 + Math.floor(Math.random() * 12) : -Math.min(p.coins, 1 + Math.floor(Math.random() * 30))
    p = book.earn(p, amt, `รายการ ${k % 7}`, '•', day + k * 3600000)
    assert(p.coins >= 0, 'เหรียญติดลบ')
  }
  assert(p.ledger.length <= book.LEDGER_MAX, 'สมุดยาวเกินกำหนด')
  for (const limit of [undefined, 1, 10, 500]) {
    const x = book.ledgerBook(p, limit)
    eq(x.opening + x.income - x.expense, x.closing, `สมการสมุดบัญชี (limit ${limit})`)
    eq(x.closing, p.coins, 'คงเหลือต้องเท่าเหรียญที่มี')
    let bal = x.opening
    for (const r of x.rows) {
      bal += r.amount
      eq(r.balance, bal, 'คงเหลือทีละบรรทัด')
    }
  }
})

test('สมุดบัญชีของฮีโร่: นกฮูกถามจากสมุด คำตอบถูก ตัวเลือกไม่ซ้ำ', () => {
  let p = { ...progress.newPlayer('ถาม', 'hero'), coins: 12 }
  eq(book.ledgerQuiz(book.ledgerBook(p)), null, 'สมุดว่างไม่ต้องถาม')
  for (let k = 0; k < 30; k += 1) p = book.earn(p, k % 4 === 3 ? -5 : 4, `รายการ ${k}`, '•')
  const b = book.ledgerBook(p)
  for (let i = 0; i < 500; i += 1) {
    const q = book.ledgerQuiz(b)
    eq(q.answer, q.before + q.entry.amount, 'คำตอบ = ก่อน ± รายการ')
    assert(q.choices.includes(q.answer), 'ต้องมีคำตอบในตัวเลือก')
    eq(new Set(q.choices).size, q.choices.length, 'ตัวเลือกซ้ำ')
    eq(q.choices.length, 3, 'ต้องมี 3 ตัวเลือก')
    assert(q.choices.every((c) => c >= 0), 'ตัวเลือกติดลบ')
  }
})

test('เป้าหมายการออม: ขาดอีกเท่าไร ซื้อของตามเป้าแล้วได้ตรานักออม และทุกการได้/จ่ายเหรียญลงสมุด', () => {
  let p = { ...progress.newPlayer('ออม', 'hero'), coins: 25 }
  const g = book.goalProgress(p.coins, 60)
  eq(g.need, 35, 'ขาดอีก')
  assert(!g.done, 'ยังไม่ครบ')
  assert(book.goalProgress(80, 60).done, 'เกินราคาถือว่าครบ')
  eq(book.goalProgress(80, 60).ratio, 1, 'แถบเต็ม')
  p = progress.setGoal(p, 'hat-crown')
  eq(p.goal, 'hat-crown', 'ตั้งเป้าหมาย')
  eq(progress.setGoal(p, 'ไม่มีจริง').goal, 'hat-crown', 'ของที่ไม่มีในร้านตั้งไม่ได้')
  p = { ...p, coins: 70 }
  const r = progress.buyItem(p, 'hat-crown')
  assert(r.ok, 'ซื้อได้')
  eq(r.player.goal, undefined, 'ซื้อแล้วเป้าหมายหายไป')
  eq(r.player.goalsDone, 1, 'นับว่าออมสำเร็จ')
  eq(r.player.ledger[r.player.ledger.length - 1].amount, -60, 'การซื้อลงสมุดเป็นรายจ่าย')
  assert(progress.newBadges(r.player).includes('saver'), 'ได้ตรานักออม')
  eq(progress.setGoal(r.player, 'hat-crown').goal, undefined, 'ของที่มีแล้วตั้งเป็นเป้าไม่ได้')
  const other = progress.buyItem({ ...progress.newPlayer('ไม่ตั้ง', 'hero'), coins: 70 }, 'hat-crown')
  eq(other.player.goalsDone, 0, 'ซื้อโดยไม่ได้ตั้งเป้า ไม่นับว่าออมสำเร็จ')
  const t = progress.recordTest(progress.newPlayer('สอบ', 'hero'), 'pre', progress.testResultFrom({ firstTry: 1, originals: 2, ms: 1, bySkill: {} }))
  eq(t.ledger[0].amount, progress.TEST_REWARD.pre.coins, 'รางวัลแบบทดสอบลงสมุด')
  const qd = quest.recordQuest(progress.newPlayer('เพื่อน', 'hero'), 'owl', true, '2026-10-07')
  eq(qd.ledger[0].amount, quest.QUEST_REWARD.coins, 'รางวัลภารกิจเพื่อนลงสมุด')
  eq(qd.ledger.reduce((a, e) => a + e.amount, 0), qd.coins, 'ผู้เล่นใหม่: ผลรวมสมุด = เหรียญที่มี')
})

test('กาดรักษ์โลก: ราคาขยะ เงินจำลอง ร้าน ภารกิจ และคณิตศาสตร์ของกาดถูกต้อง', () => {
  // ราคาขยะต้องเป็นเงินที่ทอนได้จริง (ลงตัวที่ 25 สตางค์)
  for (const t of kad.TRASH) assert(t.price > 0 && t.price % 25 === 0, `ราคา ${t.name} ทอนไม่ได้`)
  eq(new Set(kad.TRASH.map((t) => t.id)).size, kad.TRASH.length, 'ชนิดขยะซ้ำ')
  // เงินจำลองเรียงจากน้อยไปมาก ไม่ซ้ำ ครบตามที่ใช้ในกิจกรรม
  const values = kad.ECO_MONEY.map((m) => m.value)
  eq(values.join(','), '50,100,200,500,1000,2000,5000,10000', 'ชนิดเงินจำลอง')
  for (const m of kad.ECO_MONEY) eq(m.label, money.formatBS(m.value), `ชื่อเงินจำลอง ${m.value}`)
  // สินค้า: ราคาแนะนำสมเหตุสมผล ร้านอ้างสินค้าที่มีจริง
  for (const p of kad.PRODUCTS) assert(p.min > 0 && p.min <= p.max, `ราคาแนะนำ ${p.name}`)
  for (const s of kad.SHOPS) for (const id of s.products) assert(kad.PRODUCTS.some((p) => p.id === id), `ร้าน ${s.name} อ้างสินค้า ${id} ที่ไม่มี`)
  eq(new Set(kad.SHOPS.map((s) => s.letter)).size, kad.SHOPS.length, 'ตัวอักษรร้านซ้ำ')
  eq(kad.MISSIONS.length, 7, 'ภารกิจ 7 อย่าง')
  eq(kad.CYCLE.length, 10, 'วงจร 10 ขั้น')
  eq(kad.priceRange(kad.PRODUCTS.find((p) => p.id === 'frame')), '15 บาท', 'ราคาเดียว')
  eq(kad.priceRange(kad.PRODUCTS[0]), '15–25 บาท', 'ช่วงราคา')
  // ใบรับซื้อขยะ: ขวด 6 ขวด + กระป๋อง 4 ใบ + ฝา 3 ฝา = 6 + 8 + 1.50 = 15.50 บาท
  const pay = kad.trashPayout({ bottle: 6, can: 4, cap: 3 })
  eq(pay.total, 1550, 'ใบรับซื้อขยะรวมเงิน')
  eq(pay.lines.length, 3, 'บรรทัดเฉพาะชนิดที่มี')
  eq(kad.trashPayout({ bottle: 2 }, { ...kad.defaultPrices(), bottle: 150 }).total, 300, 'ครูปรับราคาเองได้')
  for (let i = 0; i < 500; i += 1) {
    const counts = Object.fromEntries(kad.TRASH.map((t) => [t.id, Math.floor(Math.random() * 20)]))
    const r = kad.trashPayout(counts)
    eq(r.total, kad.TRASH.reduce((s, t) => s + counts[t.id] * t.price, 0), 'รวมเงินใบรับซื้อ')
    eq(r.total % 25, 0, 'ยอดต้องทอนได้')
  }
  // กำไร: ตัวอย่างในเอกสาร 3 × 15 − 20 = 25
  eq(kad.profitOf(3 * 15, 20).profit, 25, 'กำไรตัวอย่าง')
  eq(kad.profitOf(45, 20).word, 'กำไร', 'คำว่ากำไร')
  eq(kad.profitOf(10, 20).word, 'ขาดทุน', 'คำว่าขาดทุน')
  eq(kad.profitOf(20, 20).word, 'เท่าทุน', 'คำว่าเท่าทุน')
  // เป้าหมายทั้งห้อง 100 / 200 / 300 บาท
  eq(kad.classProgress(0).unlocked, 0, 'ยังไม่ปลดล็อก')
  eq(kad.classProgress(0).need, 100, 'ขาดอีก 100')
  eq(kad.classProgress(150).unlocked, 1, 'ปลดล็อกต้นไม้')
  eq(kad.classProgress(150).need, 50, 'ขาดอีก 50 ถึงกระถาง')
  eq(kad.classProgress(300).next, null, 'ครบทุกเป้า')
})

test('แดชบอร์ดตลาดนัด: คงเหลือ กำไร ยอดขายทั้งห้อง เงินทอน และข้อมูลเสียไม่ทำให้พัง', () => {
  // ตัวอย่างกลุ่มกระถาง: ขายขยะ 40 ซื้ออุปกรณ์ 20 ขายกระถาง 3 ใบ ใบละ 15 → กำไร 25
  const g = {
    ...kad.defaultGroups()[0],
    entries: [
      { at: 1, kind: 'trash', amount: 4000 },
      { at: 2, kind: 'buy', amount: 2000 },
      { at: 3, kind: 'sale', amount: 1500 },
      { at: 4, kind: 'sale', amount: 1500 },
      { at: 5, kind: 'sale', amount: 1500 },
    ],
  }
  const s = kad.groupSummary(g)
  eq(s.sales, 4500, 'รายได้จากการขาย')
  eq(s.cost, 2000, 'ต้นทุน')
  eq(s.profit, 2500, 'กำไร 25 บาท')
  eq(s.balance, kad.START_MONEY + 4000 + 4500 - 2000, 'คงเหลือ = ตั้งต้น + รับ − จ่าย')
  eq(s.income - s.expense + kad.START_MONEY, s.balance, 'สมการคงเหลือ')
  const loss = kad.groupSummary({ ...g, entries: [{ at: 1, kind: 'buy', amount: 3000 }, { at: 2, kind: 'sale', amount: 1000 }] })
  eq(loss.profit, -2000, 'ขาดทุน')
  eq(kad.classSales([g, g]), 9000, 'ยอดขายรวมทั้งห้อง')
  // เงินทอน: 50 − 35 = 15 → 10 + 5
  const c = kad.changeFor(3500, 5000)
  eq(c.change, 1500, 'เงินทอน')
  eq(c.pieces.map((m) => m.value).join('+'), '1000+500', 'ทอนด้วย 10 + 5')
  eq(kad.changeFor(4500, 4000).short, 500, 'เงินไม่พอ ขาดอีก 5 บาท')
  eq(kad.changeFor(2000, 2000).pieces.length, 0, 'จ่ายพอดี')
  for (let i = 0; i < 1000; i += 1) {
    const price = (1 + Math.floor(Math.random() * 400)) * 50
    const paid = price + Math.floor(Math.random() * 400) * 50
    const r = kad.changeFor(price, paid)
    assert(r.ok, 'ทอนไม่ได้')
    eq(r.pieces.reduce((a, m) => a + m.value, 0), paid - price, 'ชิ้นเงินทอนรวมไม่เท่าเงินทอน')
  }
  // ข้อมูลเสีย / ว่าง → กลับเป็น 5 กลุ่มเริ่มต้น
  eq(kad.parseGroups(null).length, 5, 'ไม่มีข้อมูล')
  eq(kad.parseGroups('{พัง').length, 5, 'JSON เสีย')
  eq(kad.parseGroups('[]').length, 5, 'ว่าง')
  const back = kad.parseGroups(JSON.stringify([{ ...g, entries: [...g.entries, { at: 9, kind: 'hack', amount: 5 }, { at: 10, kind: 'sale', amount: -5 }] }]))
  eq(back.length, 1, 'โหลดกลุ่มที่บันทึกไว้')
  eq(back[0].entries.length, 5, 'ตัดรายการที่ผิดรูปแบบทิ้ง')
})

test('AR จีบนิ้ว: วัดระยะโป้ง–ชี้เทียบฝ่ามือ จีบ/ปล่อยแบบกันสั่น และแปลงพิกัดกล้องเป็นจอถูกต้อง', () => {
  // มือจำลอง: ข้อมือ (0) ถึงโคนนิ้วกลาง (9) ยาว 0.2 · ปลายโป้ง (4) กับปลายชี้ (8) ห่าง gap
  const handAt = (gap, scale = 1, cx = 0.5) => {
    const lm = Array.from({ length: 21 }, () => ({ x: cx, y: 0.5 }))
    lm[0] = { x: cx, y: 0.5 + 0.2 * scale }
    lm[9] = { x: cx, y: 0.5 }
    lm[4] = { x: cx - (gap * scale) / 2, y: 0.4 }
    lm[8] = { x: cx + (gap * scale) / 2, y: 0.4 }
    return lm
  }
  assert(Math.abs(pinch.pinchRatio(handAt(0.1)) - 0.5) < 1e-9, 'อัตราส่วน = ระยะนิ้ว / ฝ่ามือ')
  // มือใกล้หรือไกลกล้อง (ใหญ่/เล็ก) ได้อัตราส่วนเท่ากัน
  assert(Math.abs(pinch.pinchRatio(handAt(0.05, 2)) - pinch.pinchRatio(handAt(0.05, 0.5))) < 1e-9, 'ไม่ขึ้นกับขนาดมือ')
  eq(pinch.pinchRatio([]), Infinity, 'ไม่มีจุดมือ')
  const c = pinch.cursorOf(handAt(0.1))
  assert(Math.abs(c.x - 0.5) < 1e-9 && Math.abs(c.y - 0.4) < 1e-9, 'ตัวชี้อยู่กลางนิ้วโป้งกับนิ้วชี้')
  eq(pinch.pinchProgress(1), 0, 'มือกางไม่มีความคืบหน้า')
  eq(pinch.pinchProgress(0), 1, 'จีบสนิท = เต็ม')

  // จีบต้องค้าง 2 เฟรม ได้ down ครั้งเดียว ขยับเล็กน้อยใกล้เส้นไม่สั่น และต้องกางเกิน PINCH_OFF ถึงปล่อย
  const d = new pinch.PinchDetector()
  const seq = [0.9, 0.2, 0.2, 0.25, 0.4, 0.3, 0.45, 0.6, 0.2, 0.2]
  const events = seq.map((r) => d.update(r))
  eq(events.filter((e) => e === 'down').length, 2, 'จีบสองครั้ง')
  eq(events.filter((e) => e === 'up').length, 1, 'ปล่อยหนึ่งครั้งระหว่างกลาง')
  eq(events[2], 'down', 'จีบเฟรมที่สองติดกันจึงนับ')
  eq(events[7], 'up', 'ปล่อยเมื่อกางเกินเส้นปล่อย')
  const d2 = new pinch.PinchDetector()
  eq([0.2, 0.9, 0.2, 0.9].map((r) => d2.update(r)).filter(Boolean).length, 0, 'จีบแวบเดียวไม่นับ')
  const d3 = new pinch.PinchDetector()
  d3.update(0.1)
  d3.update(0.1)
  eq(d3.lost(), 'up', 'มือหายไประหว่างจีบ = ปล่อย')
  eq(d3.lost(), null, 'หายซ้ำไม่ปล่อยซ้ำ')

  // วิดีโอ 1280×720 แสดงแบบ cover บนจอ 400×800: กว้างเกินแล้วถูกตัดซ้ายขวา
  const box = { left: 0, top: 0, w: 400, h: 800 }
  const v = { w: 1280, h: 720 }
  const mid = pinch.videoToScreen({ x: 0.5, y: 0.5 }, v, box, false)
  assert(Math.abs(mid.x - 200) < 1e-6 && Math.abs(mid.y - 400) < 1e-6, 'กลางภาพ = กลางจอ')
  const top = pinch.videoToScreen({ x: 0.5, y: 0 }, v, box, false)
  assert(Math.abs(top.y) < 1e-6, 'ขอบบนภาพ = ขอบบนจอ (สูงพอดี)')
  const a = pinch.videoToScreen({ x: 0.6, y: 0.5 }, v, box, false)
  const m = pinch.videoToScreen({ x: 0.6, y: 0.5 }, v, box, true)
  assert(Math.abs(a.x - 200 - (200 - m.x)) < 1e-6, 'กล้องหน้า: กลับซ้ายขวาเหมือนกระจก')
  // เป้าหมายใกล้ที่สุดในรัศมี
  const ts = [
    { x: 100, y: 100, id: 'a' },
    { x: 130, y: 100, id: 'b' },
  ]
  eq(pinch.nearestTarget({ x: 120, y: 100 }, ts, 60).id, 'b', 'เลือกชิ้นที่ใกล้กว่า')
  eq(pinch.nearestTarget({ x: 300, y: 300 }, ts, 60), null, 'ไกลเกินรัศมีไม่เลือก')
})

test('กาดรักษ์โลกในเกม: กองขยะพอทำสินค้าและพอซื้ออุปกรณ์ ทุกวันเล่นจบได้ และโจทย์ทุกข้อคำนวณถูก', () => {
  const sumCheck = (q) => {
    assert(q.answer > 0 && q.answer % 25 === 0, `${q.gen}: คำตอบต้องเป็นเงินที่จ่ายได้จริง (${q.answer})`)
    eq(q.input, q.answer % 100 === 0 ? 'baht' : 'bs', `${q.gen}: ช่องตอบ`)
    assert(q.explain.length > 0 && q.hint.text, `${q.gen}: ต้องมีวิธีคิดและตัวช่วย`)
  }
  for (const r of eco.RECIPES) {
    assert(kad.PRODUCTS.some((p) => p.id === r.id), `สูตร ${r.id} ต้องมีภาพสินค้า`)
    for (const id of Object.keys(r.uses)) assert(eco.TRASH_BIN[id], `ขยะ ${id} ต้องมีถัง`)
    assert(r.prices.length === 3 && r.prices[0] < r.prices[2], `ราคาให้เลือกของ ${r.id}`)
  }
  for (const id of kad.TRASH.map((t) => t.id)) assert(eco.BINS.some((b) => b.id === eco.TRASH_BIN[id]), `ขยะ ${id} ไม่มีถังให้ทิ้ง`)
  for (let k = 0; k < 1500; k += 1) {
    const r = eco.RECIPES[k % eco.RECIPES.length]
    const start = k % 3 === 0 ? 0 : (k % 7) * 100
    const day = eco.makeDay(r, start)
    const counts = eco.countOf(day.pile)
    // กองขยะ = ของที่เก็บไว้ + ของที่ขาย
    for (const [id, n] of Object.entries(r.uses)) assert((counts[id] ?? 0) >= n, `กองขยะไม่พอทำ${r.name}`)
    eq(day.pile.length, Object.values(day.keep).reduce((a, b) => a + b, 0) + Object.values(day.sell).reduce((a, b) => a + b, 0), 'จำนวนขยะในกอง')
    assert(day.pile.length <= 30, 'กองขยะใหญ่เกินไป')
    eq(day.payout, eco.payoutOf(day.sell), 'เงินขายขยะ')
    assert(day.start + day.payout >= day.cost + 200, `เงินไม่พอซื้ออุปกรณ์ (${day.start} + ${day.payout} < ${day.cost})`)
    const sq = eco.sellQuestion(day)
    eq(sq.answer, day.payout, 'โจทย์ขายขยะ')
    sumCheck(sq)
    const cq = eco.costQuestion(r)
    eq(cq.answer, eco.recipeCost(r), 'โจทย์ต้นทุน')
    sumCheck(cq)
    const lq = eco.leftQuestion(day.start + day.payout, day.cost)
    eq(lq.answer, day.start + day.payout - day.cost, 'โจทย์เงินเหลือ')
    sumCheck(lq)
    // ทุกราคา: ลูกค้าซื้อไม่เกินของที่มี ทอนถูก และกำไร = ขาย − ต้นทุน
    const customers = eco.makeCustomers(r)
    eq(customers.length, 3, 'ลูกค้า 3 คน')
    eq(new Set(customers.map((c) => c.npc)).size, 3, 'ลูกค้าไม่ซ้ำคน')
    for (const price of r.prices) {
      const serves = eco.serveCustomers(customers, price, r.makes)
      const sold = serves.filter((s) => s.result === 'sold')
      assert(sold.reduce((a, s) => a + s.sale.qty, 0) <= r.makes, 'ขายเกินของที่มี')
      for (const s of serves) if (s.result === 'pricey') assert(price > s.customer.max, 'ปฏิเสธทั้งที่ราคาไม่แพง')
      for (const s of sold) {
        eq(s.sale.total, s.sale.qty * price * 100, 'ราคารวม')
        assert(s.sale.paid > s.sale.total, 'ลูกค้าต้องจ่ายเกินเพื่อให้มีเงินทอน')
        const q = eco.changeQuestion(s.sale, r, price)
        eq(q.answer, s.sale.paid - s.sale.total, 'โจทย์เงินทอน')
        sumCheck(q)
      }
      const income = sold.reduce((a, s) => a + s.sale.total, 0)
      const pq = eco.profitQuestion(income, eco.recipeCost(r))
      if (income === eco.recipeCost(r)) eq(pq, null, 'เท่าทุนไม่ต้องถาม')
      else {
        eq(pq.answer, Math.abs(income - eco.recipeCost(r)), 'โจทย์กำไร/ขาดทุน')
        sumCheck(pq)
      }
    }
    // ราคาถูกสุด: ขายหมดเสมอ และกำไร
    const cheap = eco.serveCustomers(customers, r.prices[0], r.makes)
    eq(cheap.filter((s) => s.result === 'sold').reduce((a, s) => a + s.sale.qty, 0), r.makes, 'ราคาถูกสุดต้องขายหมด')
    assert(r.makes * r.prices[0] * 100 > eco.recipeCost(r), `ราคาถูกสุดของ ${r.id} ต้องยังมีกำไร`)
  }
  // บันทึกของผู้เล่น: ทุนยกไปวันถัดไป ออม/บริจาคสะสม ต้นไม้โตตามยอดขาย
  let rec = eco.emptyEco()
  rec = eco.recordEcoDay(rec, { sales: 3000, profit: 1900, alloc: { invest: 500, save: 400, donate: 1000, gift: 0 } })
  rec = eco.recordEcoDay(rec, { sales: 8000, profit: 6000, alloc: { invest: 0, save: 6000, donate: 0, gift: 0 } })
  eq(rec.days, 2, 'จำนวนวัน')
  eq(rec.sales, 11000, 'ยอดขายสะสม')
  eq(rec.saved, 6400, 'ออมสะสม')
  eq(rec.donated, 1000, 'บริจาคสะสม')
  eq(rec.invest, 0, 'ทุนยกมาเป็นของวันล่าสุด')
  eq(rec.bestProfit, 6000, 'กำไรสูงสุด')
  eq(eco.ecoStage(rec).stage, 1, 'ยอดขาย 110 บาท ปลดล็อกต้นไม้')
  eq(eco.ecoStage(rec).need, 90, 'อีก 90 บาท ถึงกระถาง')
  eq(eco.allocTotal({ invest: 100, save: 200, donate: 300, gift: 400 }), 1000, 'รวมการแบ่งกำไร')
  // ผู้เล่นเก่าไม่มีข้อมูลกาด โหลดแล้วต้องมีค่าเริ่มต้น
  const old = progress.parseSave(JSON.stringify({ players: { a: { id: 'a', name: 'เก่า', eco: { days: 2 } } }, activeId: 'a' }))
  eq(old.players.a.eco.days, 2, 'เก็บค่าที่มี')
  eq(old.players.a.eco.sales, 0, 'เติมค่าที่ขาด')
  const fresh = { ...progress.newPlayer('กาด', 'hero'), eco: rec }
  assert(progress.newBadges(fresh).includes('eco-seller'), 'เล่นจบหนึ่งวันได้ตรา')
  assert(!progress.newBadges(fresh).includes('eco-garden'), 'ยังไม่ถึงสวน')
  assert(progress.newBadges({ ...fresh, eco: { ...rec, sales: 30000 } }).includes('eco-garden'), 'ขายครบ 300 บาทได้ตราสวน')
})

test('กาดรักษ์โลกในเมือง: ถนนรักษ์โลกเดินได้ ขยะรายวันเก็บได้จริง เส้นทางไปแผงกาดถึงจริง และถุงขยะใช้ขายได้', () => {
  const [a, b] = town.ECO_LANE
  for (let k = 0; k <= 100; k += 1) {
    const p = { x: a.x + ((b.x - a.x) * k) / 100, y: a.y }
    assert(town.walkable(p), `ถนนรักษ์โลกถูกขวางที่ ${Math.round(p.x)}`)
  }
  assert(town.walkable(town.ECO_MARKET) && town.walkable(town.ECO_GARDEN), 'หน้าแผงกาด/สวนต้องยืนได้')
  for (const t of town.TREES) assert(town.nearestOnLane(t).d > t.r, `ต้นไม้ทับถนนรักษ์โลก (${t.x}, ${t.y})`)
  assert(town.TRASH_SPOTS.length >= 20, 'จุดขยะน้อยเกินไป')
  for (const sp of town.TRASH_SPOTS) assert(town.walkable(sp), `จุดขยะ ${sp.id} เดินไปไม่ได้`)
  for (const c of town.TOWN_COINS) for (const sp of town.TRASH_SPOTS) assert(town.dist(c, sp) > 40, 'ขยะทับเหรียญ')
  for (const day of ['2026-10-07', '2026-10-08', '2027-01-01']) {
    const t1 = town.dailyTrash(day)
    eq(JSON.stringify(t1), JSON.stringify(town.dailyTrash(day)), 'วันเดียวกันได้ขยะชุดเดิม')
    eq(t1.length, 6, 'วันละ 6 ชิ้น')
    eq(new Set(t1.map((t) => t.id)).size, 6, 'จุดไม่ซ้ำ')
    for (const t of t1) assert(kad.TRASH.some((x) => x.id === t.kind), 'ชนิดขยะต้องมีราคารับซื้อ')
  }
  assert(JSON.stringify(town.dailyTrash('2026-10-07')) !== JSON.stringify(town.dailyTrash('2026-10-08')), 'วันใหม่ขยะเปลี่ยน')
  for (const from of [town.doorOf(0), town.doorOf(6), town.doorOf(12), { x: 900, y: 1520 }]) {
    const route = town.routeToLane(from, town.ECO_MARKET)
    const end = route[route.length - 1]
    eq(`${end.x},${end.y}`, `${town.ECO_MARKET.x},${town.ECO_MARKET.y}`, 'เส้นทางต้องจบที่แผงกาด')
    let prev = from
    for (const p of route) {
      for (let k = 0; k <= 20; k += 1) {
        const q = { x: prev.x + ((p.x - prev.x) * k) / 20, y: prev.y + ((p.y - prev.y) * k) / 20 }
        assert(town.walkable(q), `เส้นทางไปแผงกาดถูกขวางที่ (${Math.round(q.x)}, ${Math.round(q.y)})`)
      }
      prev = p
    }
  }
  // ถุงขยะ: เก็บจุดเดิมซ้ำไม่ได้ ถุงเต็มเก็บไม่ได้ วันใหม่เก็บใหม่ได้ ขายแล้วถุงว่าง
  let rec = eco.emptyEco()
  let r = eco.pickTrash(rec, 'w0-0', 'bottle', '2026-10-07')
  assert(r.ok, 'เก็บได้')
  rec = r.rec
  assert(!eco.pickTrash(rec, 'w0-0', 'bottle', '2026-10-07').ok, 'จุดเดิมวันเดียวกันเก็บซ้ำไม่ได้')
  assert(eco.pickTrash(rec, 'w0-0', 'can', '2026-10-08').ok, 'วันใหม่เก็บได้อีก')
  for (let i = 1; i < eco.BAG_MAX; i += 1) rec = eco.pickTrash(rec, `x${i}`, 'can', '2026-10-07').rec
  eq(rec.bag.length, eco.BAG_MAX, 'ถุงเต็ม')
  assert(eco.pickTrash(rec, 'x99', 'can', '2026-10-07').full, 'ถุงเต็มต้องบอก')
  const day = eco.makeDay(eco.RECIPES[0], 0, undefined, rec.bag)
  for (const id of rec.bag) assert((eco.countOf(day.pile)[id] ?? 0) >= 1, 'ขยะในถุงต้องอยู่ในกอง')
  assert((day.sell.can ?? 0) >= rec.bag.filter((x) => x === 'can').length, 'ขยะในถุงขายได้')
  const after = eco.recordEcoDay(rec, { sales: 3000, profit: 1000, alloc: eco.emptyAlloc() })
  eq(after.bag.length, 0, 'ขายแล้วถุงว่าง')
  eq(after.pickDay, rec.pickDay, 'ยังจำจุดที่เก็บวันนี้')
})

test('ร้านทอนไว: ทุกออร์เดอร์ทอนได้พอดีด้วยเงินในลิ้นชัก ระดับยากขึ้นตามคอมโบ และตัวตรวจบอกขาด/เกินถูก', () => {
  for (let i = 0; i < 4000; i += 1) {
    const level = [1, 2, 3][i % 3]
    const o = changeGame.makeOrder(level)
    eq(o.total, o.price * o.qty, 'ราคารวม')
    eq(o.change, o.paid - o.total, 'เงินทอน = จ่าย − ราคา')
    assert(o.change > 0, `ต้องมีเงินทอน (${o.paid} − ${o.total})`)
    assert(o.change % 50 === 0, 'เงินทอนต้องทอนด้วยเหรียญที่มีได้')
    eq(denoms.sumDenoms(o.paidWith), o.paid, 'เงินที่ลูกค้าจ่าย')
    eq(denoms.sumDenoms(o.solution), o.change, 'ตัวอย่างการทอนต้องพอดี')
    assert(o.solution.every((id) => changeGame.CHANGE_TRAY.includes(id)), 'ทอนด้วยเงินในลิ้นชักเท่านั้น')
    assert(changeGame.checkChange(o, o.solution).ok, 'ทอนตามตัวอย่างต้องผ่าน')
    if (level === 1) {
      assert(o.change <= 2000 + 4000 && o.paid <= 5000, 'ระดับ 1 ใช้ธนบัตรไม่เกิน 50')
      eq(o.qty, 1, 'ระดับ 1 ซื้อชิ้นเดียว')
      eq(o.price % 100, 0, 'ระดับ 1 ไม่มีสตางค์')
    }
    assert(kad.PRODUCTS.some((p) => p.id === o.product), 'สินค้าต้องมีภาพ')
  }
  const o = changeGame.makeOrder(1)
  const short = changeGame.checkChange(o, [])
  assert(!short.ok && short.diff === -o.change, 'ยังไม่หยิบ = ขาดเท่าเงินทอน')
  const over = changeGame.checkChange(o, [...o.solution, 'b1'])
  assert(!over.ok && over.diff === 100 && over.message.includes('เกิน'), 'ทอนเกิน 1 บาท')
  eq(changeGame.levelFor(0), 1, 'เริ่มระดับ 1')
  eq(changeGame.levelFor(3), 2, 'คอมโบ 3 ขึ้นระดับ 2')
  eq(changeGame.levelFor(6), 3, 'คอมโบ 6 ขึ้นระดับ 3')
  eq(changeGame.serveScore(0), 10, 'คะแนนพื้นฐาน')
  eq(changeGame.serveScore(9), 20, 'โบนัสคอมโบสูงสุด +10')
  eq(changeGame.roundCoins(30), 12, 'เหรียญต่อรอบไม่เกิน 12')
  eq(changeGame.roundStars(10, 'timed', 0), 3, 'ท้าเวลา 10 คนได้ 3 ดาว')
  eq(changeGame.roundStars(8, 'practice', 3), 1, 'ฝึกแต่ผิดหลายครั้ง')
  // ลูกค้าคนถัดไปไม่ใช่คนเดิม
  for (let i = 0; i < 200; i += 1) assert(changeGame.makeOrder(2, 'fox').npc !== 'fox', 'ลูกค้าซ้ำคนเดิม')
  const p = { ...progress.newPlayer('ทอน', 'hero'), changeBest: 8 }
  assert(progress.newBadges(p).includes('quick-change'), 'ทอนถูก 8 คนได้ตรา')
})

test('สู้บอส: ทุกด่านมีบอส และพลังบอสเท่ากับจำนวนข้อที่ต้องตอบถูกเพื่อชนะพอดี', () => {
  for (let id = 0; id <= 12; id += 1) {
    const b = bosses.bossOf(id)
    assert(b.name && b.intro && b.lose && b.taunts.length && b.ouch.length, `บอสด่าน ${id} ข้อมูลไม่ครบ`)
  }
  eq(new Set(Array.from({ length: 13 }, (_, i) => bosses.bossOf(i).name)).size, 13, 'ชื่อบอสไม่ซ้ำ')
  // กติกาชนะบอสใน LevelPage: within2 / originals >= BOSS_PASS
  for (let n = 1; n <= 40; n += 1) {
    const hp = bosses.bossHp(n, scoring.BOSS_PASS)
    assert(hp / n >= scoring.BOSS_PASS, `${n} ข้อ: ตีบอสหมดพลัง (${hp}) ต้องชนะ`)
    assert((hp - 1) / n < scoring.BOSS_PASS, `${n} ข้อ: ขาดอีก 1 ครั้งต้องยังไม่ชนะ`)
  }
  // จำนวนข้อบอสจริงของทุกด่าน
  for (let id = 0; id <= 12; id += 1) {
    const qs = gens.buildStep(id, 'boss')
    const hp = bosses.bossHp(qs.length, scoring.BOSS_PASS)
    assert(hp >= 1 && hp <= qs.length, `พลังบอสด่าน ${id} ผิด (${hp}/${qs.length})`)
  }
})

test('ฉากภารกิจ: ด่าน 0–11 มีฉากของตัวเอง และช่องความคืบหน้าเดินหนึ่งช่องต่อข้อหลัก', () => {
  for (let id = 0; id <= 11; id += 1) {
    const m = missions.missionOf(id)
    assert(m && m.title && m.story && m.item && m.done, `ด่าน ${id} ไม่มีฉากภารกิจ`)
    assert(gens.buildStep(id, 'mission').length >= 1, `ด่าน ${id} ไม่มีโจทย์ภารกิจ`)
  }
  eq(missions.missionOf(12), null, 'ด่าน 12 ใช้ภารกิจหนึ่งวันในเมืองแยกต่างหาก')
  eq(new Set(Array.from({ length: 12 }, (_, i) => missions.missionOf(i).title)).size, 12, 'ชื่อภารกิจไม่ซ้ำ')
  const go = missions.advanceMission
  eq(go([], true, 1, false).join(), 'good', 'ตอบถูกครั้งแรก')
  eq(go(['good'], true, 2, false).join(), 'good,good', 'ตอบถูกครั้งที่ 2 ก็ได้ของ')
  eq(go(['good'], false, 1, false).join(), 'good', 'ผิดครั้งแรกยังไม่เดิน')
  eq(go(['good'], false, 2, false).join(), 'good,try', 'ผิดครบ 2 ครั้ง ได้ช่อง 💪')
  eq(go(['good', 'try'], true, 1, true).join(), 'good,try', 'ข้อฝึกซ้ำไม่เพิ่มช่อง')
  // จำลองทั้งชุด: ทุกข้อหลักจบด้วยถูก (ครั้งที่ 1/2) หรือผิดครั้งที่ 2 เสมอ → ช่องเต็มพอดี
  let slots = []
  const plan = [[true], [false, true], [false, false], [true], [false, false]]
  for (const tries of plan) tries.forEach((ok, i) => (slots = go(slots, ok, i + 1, false)))
  slots = go(slots, true, 1, true)
  eq(slots.length, plan.length, 'ช่องเท่าจำนวนข้อหลัก')
  eq(slots.filter((x) => x === 'good').length, 3, 'นับของที่ได้ถูกต้อง')
})

test('ลานฝึกลูกโป่ง: ถูกครั้งแรกได้ดาว ผิดครบ 2 ครั้งลูกโป่งลอยหนี และคอมโบนับดาวติดกัน', () => {
  const go = practice.advanceBalloons
  eq(go([], true, 1, false).join(), 'star', 'ถูกครั้งแรกได้ดาว')
  eq(go([], true, 2, false).join(), 'pop', 'ถูกครั้งที่ 2 ลูกโป่งแตก')
  eq(go([], false, 1, false).join(), '', 'ผิดครั้งแรกยังไม่เปลี่ยน')
  eq(go([], false, 2, false).join(), 'away', 'ผิดครบ 2 ครั้งลอยหนี')
  eq(go(['star'], true, 1, true).join(), 'star', 'ข้อฝึกซ้ำไม่เพิ่มลูกโป่ง')
  eq(practice.comboOf([]), 0, 'ยังไม่มีคอมโบ')
  eq(practice.comboOf(['star', 'away', 'star', 'star']), 2, 'คอมโบนับจากท้าย')
  eq(practice.comboOf(['star', 'star', 'pop']), 0, 'ถูกครั้งที่ 2 ตัดคอมโบ')
  // คำพูดโค้ช
  assert(practice.coachLine([], 4, false).includes('ลูกโป่ง'), 'โค้ชอธิบายกติกาตอนเริ่ม')
  assert(practice.coachLine(['star'], 4, true).includes('เกือบแล้ว'), 'ผิดครั้งแรกโค้ชให้กำลังใจ')
  assert(practice.coachLine(['star', 'star', 'star'], 4, false).includes('คอมโบ 3'), 'คอมโบ 3 โค้ชชม')
  assert(practice.coachLine(['away'], 4, false).includes('ไม่เป็นไร'), 'ลูกโป่งลอยหนีไม่ลงโทษ')
  assert(practice.coachLine(['star', 'star'], 2, false).includes('ครบทุกลูก'), 'ได้ดาวครบ')
  assert(practice.coachLine(['star', 'pop'], 2, true).includes('ฝึกครบแล้ว'), 'จบแล้วไม่สนสัญญาณผิด')
  // ทุกด่านมีโจทย์ฝึกอย่างน้อย 1 ลูก และไม่เกินจำนวนสีที่วนได้สวย
  for (let id = 0; id <= 12; id += 1) {
    const n = gens.buildStep(id, 'practice').length
    assert(n >= 1 && n <= 8, `ด่าน ${id} ลูกโป่ง ${n} ลูก`)
  }
})

test('เกณฑ์ดาว: บอกได้ว่าต้องถูกตั้งแต่ครั้งแรกอีกกี่ข้อจึงได้ดาวเพิ่ม', () => {
  eq(scoring.nextStar(10, 10), null, '3 ดาวแล้วไม่มีขั้นถัดไป')
  eq(JSON.stringify(scoring.nextStar(6, 10)), JSON.stringify({ stars: 2, need: 1 }), '60% → อีก 1 ข้อได้ 2 ดาว')
  eq(JSON.stringify(scoring.nextStar(7, 10)), JSON.stringify({ stars: 3, need: 2 }), '70% → อีก 2 ข้อได้ 3 ดาว')
  eq(JSON.stringify(scoring.nextStar(2, 3)), JSON.stringify({ stars: 2, need: 1 }), '2/3 ยังไม่ถึง 70%')
  // ทุกกรณี: เพิ่มตามที่บอกแล้วได้ดาวตามนั้นพอดี และน้อยกว่านั้นยังไม่ได้
  for (let total = 1; total <= 40; total += 1) {
    for (let correct = 0; correct <= total; correct += 1) {
      const n = scoring.nextStar(correct, total)
      const now = scoring.starsFor(correct / total)
      if (now === 3) {
        eq(n, null, `${correct}/${total} ได้ 3 ดาวแล้ว`)
        continue
      }
      assert(n && n.stars === now + 1, `${correct}/${total} ดาวถัดไปผิด`)
      assert(scoring.starsFor((correct + n.need) / total) >= n.stars, `${correct}/${total} เพิ่ม ${n.need} ข้อต้องได้ดาว`)
      if (n.need > 0) assert(scoring.starsFor((correct + n.need - 1) / total) < n.stars, `${correct}/${total} บอกจำนวนเกิน`)
    }
  }
  eq(scoring.STAR_LINES.map((l) => l.at).join(), '0.7,0.9', 'เส้นเกณฑ์ตรงกับ starsFor')
  eq(scoring.starsFor(0.7), 2, 'เส้น 2 ดาว')
  eq(scoring.starsFor(0.9), 3, 'เส้น 3 ดาว')
})

test('ด่านย่อย X-2 / X-3: โจทย์ครบทุกด่าน ปลดล็อกตามลำดับ เก็บดาวที่ดีที่สุด และให้รางวัล', () => {
  for (let id = 0; id <= 12; id += 1) {
    for (const n of [2, 3]) {
      const def = stages.STAGES[n]
      for (let round = 0; round < 5; round += 1) {
        const qs = gens.buildStage(id, def.difficulty, def.target)
        assert(qs.length >= def.target && qs.length <= def.target + 6, `ด่าน ${id}-${n} ได้ ${qs.length} ข้อ`)
        for (const q of qs) assert(q.difficulty === def.difficulty, `ด่าน ${id}-${n} ระดับความยากผิด (${q.gen})`)
      }
      assert(gens.stageGens(id).length >= 1, `ด่าน ${id} ไม่มีชนิดโจทย์`)
    }
  }
  // ใช้ชนิดโจทย์หลากหลาย ไม่ใช่ชนิดเดียวซ้ำ
  assert(new Set(gens.buildStage(4, 2, 6).map((q) => q.gen)).size >= 3, 'ด่านย่อยควรมีโจทย์หลายแบบ')

  let p = progress.newPlayer('ด่านย่อย', 'hero')
  eq(stages.isStageUnlocked(p, 1, 2), false, 'ยังไม่ผ่านด่านหลัก X-2 ล็อก')
  p = { ...p, levels: { 1: { ...progress.emptyLevel(), stepDone: 4, bestStars: 2 } } }
  eq(stages.isStageUnlocked(p, 1, 2), true, 'ผ่านด่านหลักแล้วเปิด X-2')
  eq(stages.isStageUnlocked(p, 1, 3), false, 'ยังไม่ผ่าน X-2 X-3 ล็อก')

  // ไม่ผ่าน: ถูกภายใน 2 ครั้งไม่ถึง 60%
  const fail = stages.stageResult({ originals: 6, firstTry: 2, within2: 3 })
  eq(fail.passed, false, '3/6 ไม่ผ่าน')
  eq(fail.stars, 0, 'ไม่ผ่านไม่มีดาว')
  const coins0 = p.coins
  p = stages.recordStage(p, 1, 2, fail)
  eq(p.coins, coins0, 'ไม่ผ่านไม่ได้เหรียญ')
  eq(stages.isStageUnlocked(p, 1, 3), false, 'ไม่ผ่าน X-2 ยังล็อก X-3')

  const ok = stages.stageResult({ originals: 6, firstTry: 6, within2: 6 })
  eq(ok.stars, 3, 'ถูกหมดได้ 3 ดาว')
  p = stages.recordStage(p, 1, 2, ok)
  const r1 = stages.stageReward(2, 3, true)
  eq(p.coins, coins0 + r1.coins, 'ผ่านครั้งแรกได้รางวัลเต็ม')
  eq(stages.isStageUnlocked(p, 1, 3), true, 'ผ่าน X-2 เปิด X-3')
  // เล่นซ้ำได้ดาวน้อยกว่า: เก็บดาวที่ดีที่สุด ได้รางวัลครึ่งหนึ่ง
  const worse = stages.stageResult({ originals: 6, firstTry: 4, within2: 6 })
  const before = p.coins
  p = stages.recordStage(p, 1, 2, worse)
  eq(stages.stageRecord(p, 1, 2).stars, 3, 'เก็บดาวที่ดีที่สุด')
  eq(stages.stageRecord(p, 1, 2).plays, 3, 'นับจำนวนครั้งที่เล่น')
  eq(p.coins - before, stages.stageReward(2, worse.stars, false).coins, 'เล่นซ้ำได้รางวัลครึ่งหนึ่ง')
  assert(stages.stageReward(3, 3, true).coins > stages.stageReward(2, 3, true).coins, 'ด่านท้าทายได้รางวัลมากกว่า')
  assert(p.ledger.some((e) => e.label === 'รางวัลด่านย่อย 1-2'), 'รางวัลลงสมุดบัญชี')
  eq(stages.stageStars(p), 3, 'ดาวด่านย่อยรวม')

  // ตรานักล่าความท้าทาย: ผ่าน X-3 ครบ 3 ด่าน
  for (const id of [0, 1, 2]) p = stages.recordStage(p, id, 3, ok)
  eq(stages.challengesCleared(p), 3, 'นับด่านท้าทายที่ผ่าน')
  assert(progress.newBadges(p).includes('challenger'), 'ได้ตรานักล่าความท้าทาย')
  // บันทึกเก่าที่ไม่มีช่อง stages ยังโหลดได้
  const old = { ...progress.newPlayer('เก่า', 'hero') }
  delete old.stages
  const save = progress.parseSave(JSON.stringify({ version: 1, players: { [old.id]: old }, activeId: old.id }))
  eq(JSON.stringify(save.players[old.id].stages), '{}', 'บันทึกเก่าได้ stages ว่าง')
})

test('เสียงพูดภาษาไทย: อ่านเป็นคำไทยล้วน ไม่อ่านอีโมจิ และเลือกเสียงไทยเสมอ', () => {
  const sp = speech.spoken
  eq(sp('ราคา 25.50 บาท'), 'ราคา 25 บาท 50 สตางค์', 'อ่านบาทสตางค์')
  eq(sp('ได้ +10 EXP ⭐🎈🔥'), 'ได้ +10 แต้มประสบการณ์', 'คำอังกฤษเป็นไทย ตัดอีโมจิ')
  eq(sp('5 × 3 = 15'), '5 คูณ 3 เท่ากับ 15', 'อ่านเครื่องหมายคูณ')
  eq(sp('20 − 5'), '20 ลบ 5', 'อ่านเครื่องหมายลบ')
  eq(sp('12 ÷ 4'), '12 หาร 4', 'อ่านเครื่องหมายหาร')
  eq(sp('ถูก 3/4 ข้อ'), 'ถูก 3 จาก 4 ข้อ', 'อ่านเศษส่วนจำนวนข้อ')
  eq(sp('👾 BOSS · MISSION COMPLETE!'), 'บอส ภารกิจสำเร็จ!', 'ชื่อขั้นเป็นไทย')
  eq(sp('ยินดีต้อนรับสู่ MONEY HERO'), 'ยินดีต้อนรับสู่ มันนี่ฮีโร่', 'ชื่อเกม')
  eq(sp('🎉🎉'), '', 'มีแต่อีโมจิไม่ต้องพูด')
  // คำชมและกำลังใจทุกประโยคไม่มีตัวอักษรอังกฤษหลุดไปให้เสียงอ่าน
  const chars = load('data/characters.js')
  for (const line of [...chars.PRAISE, ...chars.ENCOURAGE]) assert(!/[A-Za-z]/.test(sp(line)), `มีคำอังกฤษ: ${line}`)
  // เลือกเสียง
  const v = (name, lang, localService = false) => ({ name, lang, localService })
  eq(speech.pickThaiVoice([v('Samantha', 'en-US'), v('Daniel', 'en-GB')]), null, 'ไม่มีเสียงไทย')
  eq(speech.pickThaiVoice([v('Samantha', 'en-US'), v('Kanya', 'th-TH')]).name, 'Kanya', 'เลือกเสียงไทย')
  eq(speech.pickThaiVoice([v('Microsoft Pattara', 'th-TH', true), v('Google ไทย', 'th_TH')]).name, 'Google ไทย', 'เสียงคุณภาพสูงก่อน รองรับ th_TH')
  eq(speech.pickThaiVoice([v('Narisa', 'th-TH'), v('Narisa (Premium)', 'th-TH')]).name, 'Narisa (Premium)', 'Premium ก่อน')
})

test('ทุกประโยคที่ตัวละครพูด อ่านออกเสียงเป็นภาษาไทยล้วน', () => {
  const sp = speech.spoken
  const lines = []
  for (let id = 0; id <= 12; id += 1) {
    const b = bosses.bossOf(id)
    lines.push(b.intro, b.lose, ...b.taunts, ...b.ouch)
    const m = missions.missionOf(id)
    if (m) lines.push(`${m.title} ${m.story}`, m.done)
  }
  for (const total of [1, 4]) {
    lines.push(practice.coachLine([], total, false), practice.coachLine(['star'], total, true), practice.coachLine(['away'], total, false))
    lines.push(practice.coachLine(['star', 'star', 'star', 'star'], total, false))
  }
  const levels = load('data/levels.js')
  for (const l of levels.LEVELS) {
    lines.push(l.name)
    for (const slide of l.learn) lines.push(`${slide.title} ${slide.lines.join(' ')}`)
  }
  const bad = lines.filter((line) => /[A-Za-z]/.test(sp(line)))
  eq(bad.length, 0, `มีคำอังกฤษหลุด: ${bad.slice(0, 3).map(sp).join(' | ')}`)
})

console.log(`ผ่าน ${passed} ข้อ`)
if (failures.length > 0) {
  console.log(`\nไม่ผ่าน ${failures.length} ข้อ`)
  failures.slice(0, 40).forEach((line, i) => console.log(`  ${i + 1}. ${line}`))
  process.exit(1)
}
console.log('ผ่านทั้งหมด')
