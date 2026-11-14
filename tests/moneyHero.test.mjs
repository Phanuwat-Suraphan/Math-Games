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
const road = load('engine/starRoad.js')
const budget = load('engine/budget.js')
const duel = load('engine/duel.js')
const album = load('engine/album.js')
const classroom = load('engine/classroom.js')
const roster = load('engine/roster.js')
const backup = load('engine/backup.js')
const testBank = load('engine/testBank.js')
const exam = load('engine/exam.js')
const board = load('board/boardData.js')
const activity = load('engine/activity.js')
const teams = load('engine/teams.js')
const stats = load('engine/stats.js')
const behavior = load('engine/behavior.js')
const worksheet = load('engine/worksheet.js')
const xlsx = load('engine/xlsx.js')
const workbook = load('engine/workbook.js')
const passport = load('engine/passport.js')
const bingo = load('engine/bingo.js')
const pictures = load('engine/pictures.js')
const { SKILLS } = load('data/characters.js')

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
  assert(lines[1].startsWith(',,"เอ, ""ก""",,"เอ, ""ก""",'), `ชื่อที่มีจุลภาคและอัญประกาศต้องถูกครอบ: ${lines[1].slice(0, 30)}`)
  assert(lines[0].startsWith('เลขที่,เลขประจำตัว,ชื่อ - สกุล,ห้อง,ชื่อในเกม,สถานะการเข้าร่วม,'), `CSV ขึ้นต้นด้วยข้อมูลทะเบียน: ${lines[0].slice(0, 60)}`)
  assert(lines[0].includes('ผลการประเมิน (เกณฑ์ร้อยละ 70)') && lines[1].includes(',ผ่าน,'), 'CSV มีผลการประเมินตามเกณฑ์ (เอได้ 18/20 = 90% ผ่าน)')
  const cols = lines[0].split(',').length
  for (const l of lines.slice(2)) eq(l.split(',').length, cols, 'จำนวนคอลัมน์ต้องเท่ากันทุกแถว')
  assert(lines[0].includes('กาดรักษ์โลก: ยอดขายสะสม (บาท)'), 'CSV ต้องมีผลกาดรักษ์โลก')
  assert(lines[2].includes(',2,45,25,0,10,'), `ผลกาดของบีใน CSV: ${lines[2]}`)
  // ด่านย่อยและถนนดาว
  assert(lines[0].includes('ดาวด่านย่อย (เต็ม 78)') && lines[0].includes('หีบสมบัติที่เปิด'), 'CSV ต้องมีด่านย่อยและถนนดาว')
  const d = {
    ...progress.newPlayer('ดี', 'hero', 4),
    levels: { 2: { ...progress.emptyLevel(), stepDone: 4, bestStars: 2 } },
    stages: { '2-2': { stars: 3, plays: 1, bestAccuracy: 1 }, '2-3': { stars: 1, plays: 2, bestAccuracy: 0.6 } },
    chests: [3],
  }
  const csv2 = report.buildCsv([d]).slice(1).split('\r\n')
  assert(csv2[1].includes(',4,1,6,1,'), `ด่านย่อย 4 ดาว · ท้าทาย 1 ด่าน · ดาวรวม 6 · หีบ 1: ${csv2[1]}`)
  // วางแผนใช้เงิน: จัดสำเร็จ 2 งาน ดาวรวม 5
  const planner = { ...d, plan: { best: { 'rabbit-party': 2, 'fox-picnic': 3 }, done: 3 } }
  const csv3 = report.buildCsv([planner]).slice(1).split('\r\n')
  assert(csv3[0].includes('วางแผนใช้เงิน: งานที่จัดสำเร็จ (จาก 4)'), 'CSV มีหัวคอลัมน์วางแผนใช้เงิน')
  assert(csv3[1].includes(',4,1,6,1,2,5,'), `ผลวางแผนใช้เงินใน CSV: ${csv3[1]}`)
  eq(report.planStarsTotal(planner), 5, 'ดาวรวมวางแผนใช้เงิน')
  const sum2 = report.classSummary([a, d])
  eq(sum2.stagePlayers, 1, 'คนที่เล่นด่านย่อย')
  eq(sum2.challengePlayers, 1, 'คนที่ผ่านด่านท้าทาย')
  eq(sum2.avgStars, 3, 'ดาวรวมเฉลี่ย (0 กับ 6)')
  const rows = report.stageTable(d)
  eq(rows.length, 13, 'ตารางดาวครบ 13 ด่าน')
  eq(rows[2].stars.join(), '2,3,1', 'ดาวด่าน 2: ผจญภัย ฝึกเก่ง ท้าทาย')
  eq(rows[0].stars.join(), '0,0,0', 'ด่านที่ยังไม่เล่น')
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

test('ถนนดาว: ดาวรวมเปิดหีบสมบัติ ได้เหรียญและของฟรี เปิดซ้ำไม่ได้', () => {
  const shop = load('data/shop.js')
  // หีบเรียงจากน้อยไปมาก หีบสุดท้ายคือดาวเต็ม ของฟรีมีอยู่จริงในร้าน
  for (let i = 1; i < road.CHESTS.length; i += 1) assert(road.CHESTS[i].at > road.CHESTS[i - 1].at, 'หีบต้องเรียงตามดาว')
  eq(road.CHESTS[road.CHESTS.length - 1].at, road.MAX_STARS, 'หีบสุดท้ายที่ดาวเต็ม')
  eq(road.MAX_STARS, 13 * 3 + 13 * 2 * 3, 'ดาวเต็ม = ด่านหลัก + ด่านย่อย')
  for (const c of road.CHESTS) if (c.gift) assert(shop.shopItem(c.gift), `ไม่มีของ ${c.gift} ในร้าน`)

  let p = progress.newPlayer('สมบัติ', 'hero')
  eq(road.allStars(p), 0, 'เริ่มที่ 0 ดาว')
  eq(road.readyChests(p).length, 0, 'ยังไม่มีหีบให้เปิด')
  eq(road.openChest(p, 3), null, 'หีบล็อกเปิดไม่ได้')
  eq(road.nextChest(p).need, 3, 'อีก 3 ดาวถึงหีบแรก')

  // ดาวด่านหลัก 3 + ด่านย่อย 6 = 9 ดาว → เปิดได้ 2 หีบ (3, 8)
  p = { ...p, levels: { 0: { ...progress.emptyLevel(), stepDone: 4, bestStars: 3 } }, stages: { '0-2': { stars: 3, plays: 1, bestAccuracy: 1 }, '0-3': { stars: 3, plays: 1, bestAccuracy: 1 } } }
  eq(road.allStars(p), 9, 'รวมดาวด่านหลักและด่านย่อย')
  eq(road.readyChests(p).map((c) => c.at).join(), '3,8', 'หีบที่เปิดได้')
  eq(road.nextChest(p).need, 6, 'อีก 6 ดาวถึงหีบ 15')

  const c0 = p.coins
  const first = road.openChest(p, 3)
  eq(first.reward.coins, 15, 'หีบแรกได้ 15 เหรียญ')
  p = first.player
  eq(p.coins, c0 + 15, 'เหรียญเพิ่มจริง')
  assert(p.ledger.some((e) => e.label === 'หีบสมบัติดาว 3 ดวง'), 'ลงสมุดบัญชี')
  eq(road.openChest(p, 3), null, 'เปิดหีบเดิมซ้ำไม่ได้')
  eq(road.chestState(p, road.CHESTS[0]), 'opened', 'หีบแรกเปิดแล้ว')

  // หีบมีของฟรี: ได้ของ สวมให้ถ้าช่องว่าง และไม่ต้องออมต่อถ้าเป็นเป้าหมาย
  p = { ...p, goal: 'face-round' }
  const second = road.openChest(p, 8)
  eq(second.reward.item, 'face-round', 'ได้แว่นฟรี')
  assert(second.player.owned.includes('face-round'), 'ของอยู่ในกระเป๋า')
  eq(second.player.wear.face, 'face-round', 'สวมให้เลย')
  eq(second.player.goal, undefined, 'เลิกเป้าหมายการออมของชิ้นนั้น')

  // มีของชิ้นนั้นแล้ว: ได้เหรียญชดเชยครึ่งราคาแทน
  const rich = { ...progress.newPlayer('มีแล้ว', 'hero'), owned: ['face-round'], wear: { face: 'face-round' }, levels: { 0: { ...progress.emptyLevel(), stepDone: 4, bestStars: 3 } }, stages: { '0-2': { stars: 3, plays: 1, bestAccuracy: 1 }, '0-3': { stars: 3, plays: 1, bestAccuracy: 1 } } }
  const dup = road.openChest(rich, 8)
  eq(dup.reward.item, undefined, 'ไม่ได้ของซ้ำ')
  eq(dup.reward.bonus, Math.round(shop.shopItem('face-round').price / 2), 'ได้เหรียญครึ่งราคาแทน')
  eq(dup.player.owned.filter((x) => x === 'face-round').length, 1, 'ของไม่ซ้ำในกระเป๋า')

  // ตรานักล่าสมบัติ: เปิดครบ 5 หีบ
  assert(!progress.newBadges({ ...p, chests: [3, 8, 15, 24] }).includes('treasure'), '4 หีบยังไม่ได้ตรา')
  assert(progress.newBadges({ ...p, chests: [3, 8, 15, 24, 36] }).includes('treasure'), '5 หีบได้ตรา')
  // บันทึกเก่าที่ไม่มีช่อง chests ยังโหลดได้
  const old = { ...progress.newPlayer('เก่า', 'hero') }
  delete old.chests
  const save = progress.parseSave(JSON.stringify({ version: 1, players: { [old.id]: old }, activeId: old.id }))
  eq(JSON.stringify(save.players[old.id].chests), '[]', 'บันทึกเก่าได้ chests ว่าง')
})

test('วางแผนใช้เงิน: ทุกงานจัดได้ในงบ และเลือกของแพงก็เกินงบได้จริง', () => {
  eq(budget.PLAN_EVENTS.length, 4, 'มี 4 งาน')
  for (const e of budget.PLAN_EVENTS) {
    assert(e.items.every((i) => i.price > 0 && e.needs[i.cat] !== undefined), `${e.id}: ของต้องมีราคาและอยู่ในหมวดที่ต้องซื้อ`)
    for (const [cat, n] of Object.entries(e.needs)) assert(e.items.filter((i) => i.cat === cat).length > n, `${e.id}: หมวด ${cat} ต้องมีของให้เลือกมากกว่าที่ต้องซื้อ`)
    if (!e.satang) assert(e.items.every((i) => i.price % 100 === 0), `${e.id}: งานบาทล้วนต้องไม่มีสตางค์`)
    else assert(e.items.some((i) => i.price % 100 !== 0), `${e.id}: งานที่มีสตางค์ต้องมีราคามีสตางค์`)
    const cheap = budget.cheapestPlan(e)
    assert(budget.needsMet(e, cheap), `${e.id}: แผนถูกที่สุดต้องครบรายการ`)
    assert(budget.cartTotal(e, cheap) <= e.budget, `${e.id}: แผนถูกที่สุดต้องไม่เกินงบ`)
    // เลือกของแพงสุดตามจำนวนที่ต้องซื้อ ต้องเกินงบ (เด็กต้องคิดจริง ไม่ใช่เลือกอะไรก็ได้)
    let priciest = 0
    for (const [cat, n] of Object.entries(e.needs)) {
      priciest += e.items.filter((i) => i.cat === cat).map((i) => i.price).sort((a, b) => b - a).slice(0, n).reduce((a, b) => a + b, 0)
    }
    assert(priciest > e.budget, `${e.id}: เลือกของแพงสุดต้องเกินงบ (${priciest} / ${e.budget})`)
    eq(budget.cartTotal(e, budget.priciestPlan(e)), priciest, `${e.id}: แผนแพงสุดในใบงานตรงกับที่คิด`)
    assert(budget.needsMet(e, budget.priciestPlan(e)), `${e.id}: แผนแพงสุดครบรายการ`)
  }
  const party = budget.planEvent('rabbit-party')
  eq(JSON.stringify(budget.missingNeeds(party, ['cookie'])), JSON.stringify({ cake: 1, snack: 1, deco: 1 }), 'บอกหมวดที่ยังขาด')
  const cart = ['cake-fruit', 'donut', 'cookie', 'hats']
  eq(budget.cartTotal(party, cart), 10700, 'รวม 107 บาท')
  assert(budget.explainTotal(party, cart).some((l) => l.includes('= 107 บาท')), 'วิธีคิดยอดรวม')
  const trip = budget.planEvent('bear-trip')
  const tripCart = ['bento', 'tea', 'bread', 'notebook']
  eq(budget.cartTotal(trip, tripCart), 7550, '35.50 + 15.50 + 9.50 + 15 = 75.50')
  assert(budget.explainLeft(trip, 7550).some((l) => l.includes('เหลือ 24 บาท 50 สตางค์')), 'วิธีคิดเงินเหลือ')
  // ดาว
  eq(budget.planStars(0, 0), 3, 'ไม่พลาดเลย 3 ดาว')
  eq(budget.planStars(1, 1), 2, 'พลาด 2 ครั้ง 2 ดาว')
  eq(budget.planStars(3, 0), 1, 'พลาดมาก 1 ดาว')
  // บันทึกผล
  let p = progress.newPlayer('วางแผน', 'hero')
  const c0 = p.coins
  p = budget.recordPlan(p, 'rabbit-party', 2)
  eq(p.coins, c0 + budget.planReward(2, true), 'ได้เหรียญรางวัล')
  assert(p.ledger.some((e) => e.label === 'จัดงาน: ปาร์ตี้วันเกิดน้องกระต่าย'), 'ลงสมุดบัญชี')
  p = budget.recordPlan(p, 'rabbit-party', 1)
  eq(p.plan.best['rabbit-party'], 2, 'เก็บดาวที่ดีที่สุด')
  eq(p.plan.done, 2, 'นับครั้งที่จัด')
  eq(budget.plannedEvents(p), 1, 'จัดแล้ว 1 งาน')
  assert(!progress.newBadges(p).includes('planner'), 'ยังไม่ได้ตรา')
  p = budget.recordPlan(budget.recordPlan(p, 'fox-picnic', 3), 'owl-books', 1)
  assert(progress.newBadges(p).includes('planner'), 'จัด 3 งานได้ตรานักวางแผน')
  // บันทึกเก่าที่ไม่มีช่อง plan ยังโหลดได้
  const old = { ...progress.newPlayer('เก่า', 'hero') }
  delete old.plan
  const save = progress.parseSave(JSON.stringify({ version: 1, players: { [old.id]: old }, activeId: old.id }))
  eq(save.players[old.id].plan.done, 0, 'บันทึกเก่าได้ plan ว่าง')
})

test('ดวลสองคน: โจทย์เลือกตอบครบ 10 ข้อ ใครถูกก่อนได้แต้ม แตะผิดรอข้อต่อไป', () => {
  for (let i = 0; i < 40; i += 1) {
    const qs = duel.buildDuel()
    eq(qs.length, duel.DUEL_ROUNDS, 'ได้ 10 ข้อ')
    for (const q of qs) {
      eq(q.kind, 'choice', 'ต้องเป็นโจทย์เลือกตอบ')
      assert(q.options.some((o) => o.id === q.answer), `${q.gen}: คำตอบต้องอยู่ในตัวเลือก`)
      assert(q.options.length >= 2, `${q.gen}: ต้องมีตัวเลือกอย่างน้อย 2`)
    }
    // ง่ายก่อนแล้วค่อยยาก
    assert(qs.slice(0, 5).every((q) => q.difficulty === 1), 'ห้าข้อแรกเป็นระดับง่าย')
  }
  let s = duel.startDuel()
  // ฝั่ง 1 ถูกก่อน
  s = duel.tapDuel(s, 1, 'a', 'a')
  eq(s.scores.join(), '0,1', 'ฝั่ง 1 ได้แต้ม')
  eq(s.winner, 1, 'ข้อนี้ฝั่ง 1 ชนะ')
  eq(duel.tapDuel(s, 0, 'a', 'a'), s, 'ข้อจบแล้วแตะไม่ได้')
  s = duel.nextDuel(s)
  eq(s.index, 1, 'ไปข้อถัดไป')
  // ฝั่ง 0 ผิด → ล็อก ฝั่ง 1 ยังตอบได้
  s = duel.tapDuel(s, 0, 'b', 'a')
  eq(s.locked.join(), 'true,false', 'ฝั่ง 0 ถูกล็อก')
  eq(s.winner, null, 'ข้อยังไม่จบ')
  eq(duel.tapDuel(s, 0, 'a', 'a'), s, 'ฝั่งที่ล็อกแตะไม่ได้')
  eq(duel.nextDuel(s), s, 'ข้อยังไม่จบไปต่อไม่ได้')
  s = duel.tapDuel(s, 1, 'c', 'a')
  eq(s.winner, 'none', 'ผิดทั้งคู่ไม่มีใครได้แต้ม')
  eq(s.scores.join(), '0,1', 'แต้มไม่เปลี่ยน')
  s = duel.nextDuel(s)
  eq(s.locked.join(), 'false,false', 'ข้อใหม่ปลดล็อก')
  eq(duel.duelWinner(s), 1, 'ฝั่ง 1 นำ')
  s = duel.nextDuel(duel.tapDuel(s, 0, 'a', 'a'))
  eq(duel.duelWinner(s), 'tie', 'เสมอ')
})

test('สมุดสะสมเงินไทย: การ์ดครบ 11 ชนิด คำถามลองแลกถูกต้อง และสติกเกอร์ได้ครั้งเดียว', () => {
  const den = load('data/denominations.js')
  eq(album.ALBUM.length, 11, 'การ์ดครบ 11 ชนิด')
  eq(new Set(album.ALBUM.map((c) => c.id)).size, 11, 'การ์ดไม่ซ้ำ')
  for (const c of album.ALBUM) {
    assert(c.facts.length >= 2, `${c.id}: ต้องมีเรื่องน่ารู้`)
    assert(c.swaps.length >= 2, `${c.id}: ต้องมีคำถามลองแลกอย่างน้อย 2 ข้อ`)
    c.swaps.forEach(([from, to], i) => {
      const a = den.denom(from).value
      const b = den.denom(to).value
      assert(a > b && a % b === 0, `${c.id}: แลก ${from} → ${to} ต้องได้จำนวนเต็ม`)
      assert(from === c.id || to === c.id, `${c.id}: คำถามต้องเกี่ยวกับเงินบนการ์ด`)
      for (let k = 0; k < 20; k += 1) {
        const q = album.albumQuestion(c.id, i)
        eq(q.answer, a / b, `${c.id}: คำตอบ`)
        eq(new Set(q.options).size, 3, `${c.id}: ตัวเลือก 3 ตัวไม่ซ้ำ`)
        assert(q.options.includes(q.answer) && q.options.every((n) => n > 0 && Number.isInteger(n)), `${c.id}: ตัวเลือกต้องมีคำตอบและเป็นจำนวนเต็มบวก`)
        assert(q.text.includes(den.denom(from).name) && q.text.includes(den.denom(to).name), `${c.id}: โจทย์ต้องบอกชื่อเงิน`)
      }
    })
  }
  eq(album.albumQuestion('s25', 0).text, 'เหรียญ 1 บาท 1 เหรียญ แลกเป็นเหรียญ 25 สตางค์ได้กี่เหรียญ?', 'ตัวอย่างโจทย์')
  eq(album.albumQuestion('b20', 0).answer, 2, 'ธนบัตร 20 แลกเหรียญ 10 ได้ 2 เหรียญ')
  let p = progress.newPlayer('สะสม', 'hero')
  const c0 = p.coins
  p = album.addSticker(p, 'b100')
  eq(p.coins, c0 + album.STICKER_COINS, 'สติกเกอร์แรกได้เหรียญ')
  eq(album.addSticker(p, 'b100'), p, 'สติกเกอร์ซ้ำไม่ได้อะไรเพิ่ม')
  assert(!album.albumComplete(p), 'ยังไม่ครบ')
  for (const c of album.ALBUM) p = album.addSticker(p, c.id)
  assert(album.albumComplete(p), 'ครบ 11 ชนิด')
  assert(progress.newBadges(p).includes('collector'), 'ได้ตรานักสะสมเงินไทย')
  const old = { ...progress.newPlayer('เก่า', 'hero') }
  delete old.album
  const save = progress.parseSave(JSON.stringify({ version: 1, players: { [old.id]: old }, activeId: old.id }))
  eq(JSON.stringify(save.players[old.id].album), '[]', 'บันทึกเก่าได้ album ว่าง')
})

test('หลักสูตร ป.3: คูณ หารเงินเป็นบาทล้วน ตัวคูณ/ตัวหารหลักเดียว ทุกระดับความยาก', () => {
  const whole = (v) => v % 100 === 0
  for (const gen of ['multiply', 'divide', 'wordMulDiv', 'wordAll', 'wordQuick']) {
    for (const d of [1, 2, 3]) {
      for (let i = 0; i < 300; i += 1) {
        for (const q of gens.generate(gen, d)) {
          if (q.kind === 'amount') {
            assert(whole(q.answer), `${gen} d${d}: คำตอบมีสตางค์ (${q.answer}) ${q.story}`)
            for (const r of q.visual?.rows ?? []) {
              if (r.plain) assert(r.value >= 2 && r.value <= 9, `${gen} d${d}: ตัวคูณ/ตัวหารต้องเป็นหลักเดียว (${r.value})`)
              else assert(whole(r.value), `${gen} d${d}: จำนวนเงินในโจทย์มีสตางค์ (${r.value})`)
            }
            assert(q.answer <= 1000000, `${gen} d${d}: จำนวนเงินเกิน 10,000 บาท`)
          } else if (q.kind === 'word' && (q.op === '×' || q.op === '÷')) {
            assert(whole(q.a) && whole(q.answer), `${gen} d${d}: โจทย์ปัญหาคูณหารมีสตางค์ (${q.story})`)
            assert(q.b >= 2 && q.b <= 9, `${gen} d${d}: ตัวคูณ/ตัวหารต้องเป็นหลักเดียว (${q.b})`)
          }
        }
      }
    }
  }
  // วิธีคิดของการคูณ หาร บาทล้วน ไม่พูดถึงสตางค์
  assert(!gens.generate('multiply', 3)[0].explain.join(' ').includes('สตางค์'), 'วิธีคิดการคูณไม่ต้องมีสตางค์')
  assert(!gens.generate('divide', 3)[0].explain.join(' ').includes('สตางค์'), 'วิธีคิดการหารไม่ต้องมีสตางค์')
})

/* ------------------------------------------------------------------ */
/* ห้องเรียน: ทะเบียนนักเรียน เกณฑ์ รหัสครู ไฟล์สำรอง                     */
/* ------------------------------------------------------------------ */

test('ทะเบียนนักเรียน: อ่านรายชื่อจาก Excel (แท็บ) และ CSV (มีหัวตาราง/อัญประกาศ/ชื่อ-สกุลช่องเดียว)', () => {
  // วางจาก Excel: คั่นด้วยแท็บ มีหัวตาราง
  const tsv = 'เลขที่\tเลขประจำตัว\tคำนำหน้า\tชื่อ\tนามสกุล\tชื่อเล่น\n1\t10231\tด.ช.\tสมชาย\tใจดี\tต้นกล้า\n2\t10232\tด.ญ.\tมะลิ\tรักเรียน\t\n'
  const a = roster.readRoster(tsv, 'ป.3/1')
  eq(a.errors.length, 0, `ไม่มีข้อผิดพลาด ${a.errors}`)
  eq(a.rows.length, 2, 'สองคน')
  eq(a.rows[0].first, 'สมชาย', 'ชื่อ')
  eq(a.rows[0].last, 'ใจดี', 'นามสกุล')
  eq(a.rows[0].prefix, 'ด.ช.', 'คำนำหน้า')
  eq(a.rows[0].code, '10231', 'เลขประจำตัว')
  eq(a.rows[0].no, 1, 'เลขที่')
  eq(a.rows[0].nick, 'ต้นกล้า', 'ชื่อเล่น')
  eq(a.rows[1].room, 'ป.3/1', 'ไม่มีคอลัมน์ห้อง ใช้ห้องเริ่มต้น')
  // CSV จาก Excel ภาษาไทย: มี BOM, ชื่อ-สกุลช่องเดียว, ช่องมีจุลภาคในอัญประกาศ, CRLF
  const csv = '﻿ที่,ชื่อ - สกุล,ห้อง,หมายเหตุ\r\n3,เด็กหญิงพลอย ใสสะอาด,ป.3/2,"ย้ายมา, เทอม 2"\r\n4,"ด.ช.ภูมิ แสงทอง",ป.3/2,\r\n'
  const b = roster.readRoster(csv, 'ป.3/1')
  eq(b.rows.length, 2, 'CSV สองคน')
  eq(b.rows[0].prefix, 'ด.ญ.', '"เด็กหญิง" ย่อเป็น ด.ญ.')
  eq(b.rows[0].first, 'พลอย', 'แยกชื่อจากชื่อ-สกุล')
  eq(b.rows[0].last, 'ใสสะอาด', 'แยกนามสกุล')
  eq(b.rows[0].room, 'ป.3/2', 'ใช้ห้องในไฟล์')
  eq(b.rows[1].first, 'ภูมิ', 'ช่องในอัญประกาศ')
  eq(b.rows[1].no, 4, 'เลขที่จากคอลัมน์ "ที่"')
  // ไม่มีหัวตาราง: เลขที่ | ชื่อ-สกุล
  const c = roster.readRoster('5\tด.ช.กล้า หาญ\n6\tด.ญ.ฝน ชุ่มฉ่ำ', 'ป.3/1')
  eq(c.rows.length, 2, 'ไม่มีหัวตารางก็อ่านได้')
  eq(c.rows[1].first, 'ฝน', 'ชื่อแถวที่สอง')
  eq(c.rows[1].no, 6, 'เลขที่แถวที่สอง')
  // ข้อผิดพลาด: แถวไม่มีชื่อ และเลขประจำตัวซ้ำ
  const d = roster.readRoster('เลขที่,เลขประจำตัว,ชื่อ\n1,111,ก้อง\n2,,\n3,111,ก้องซ้ำ', 'ป.3/1')
  eq(d.rows.length, 1, 'คนซ้ำนับเป็นคนเดียว')
  eq(d.rows[0].first, 'ก้องซ้ำ', 'ซ้ำ: ใช้แถวหลัง')
  assert(d.errors.some((e) => e.includes('แถว 4') && e.includes('ซ้ำ')), `แจ้งแถวซ้ำ: ${d.errors}`)
  // ไม่มีคอลัมน์ชื่อ
  eq(roster.readRoster('เลขที่,ห้อง\n1,ป.3/1', 'ป.3/1').rows.length, 0, 'ไม่มีคอลัมน์ชื่อ อ่านไม่ได้')
  // แบบฟอร์มที่ดาวน์โหลดไป อ่านกลับได้
  const t = roster.readRoster(roster.rosterTemplate('ป.3/1'), 'ป.3/1')
  eq(t.rows.length, 2, 'แบบฟอร์มอ่านกลับได้')
  eq(t.errors.length, 0, 'แบบฟอร์มไม่มีข้อผิดพลาด')
})

test('ทะเบียนนักเรียน: นำเข้าซ้ำไม่สร้างคนซ้ำ คะแนนเดิมไม่หาย และรหัสผู้เล่นเหมือนกันทุกเครื่อง', () => {
  const rows = roster.readRoster('เลขที่,เลขประจำตัว,ชื่อ,นามสกุล,ชื่อเล่น\n1,10231,สมชาย,ใจดี,ต้นกล้า\n2,10232,มะลิ,รักเรียน,', 'ป.3/1').rows
  const first = roster.applyRoster({}, rows, 1000)
  eq(first.added, 2, 'เพิ่มสองคน')
  const ids = Object.keys(first.players).sort()
  eq(ids.join(), 'st-c_10231,st-c_10232', 'รหัสผู้เล่นมาจากเลขประจำตัว')
  const tonkla = first.players['st-c_10231']
  eq(tonkla.name, 'ต้นกล้า', 'ชื่อในเกมใช้ชื่อเล่น')
  eq(first.players['st-c_10232'].name, 'มะลิ', 'ไม่มีชื่อเล่นใช้ชื่อจริง')
  assert(tonkla.needsAvatar === true, 'ยังไม่ได้เลือกตัวละคร')
  // นักเรียนเล่นไปแล้ว แล้วครูนำเข้ารายชื่อชุดใหม่ (แก้นามสกุล)
  const played = { ...first.players, 'st-c_10231': { ...tonkla, exp: 99, preTest: { score: 9, total: 18, timeMs: 1, at: 5, skills: progress.emptyTestSkills() } } }
  const rows2 = roster.readRoster('เลขที่,เลขประจำตัว,ชื่อ,นามสกุล\n1,10231,สมชาย,ใจงาม\n3,10233,ฟ้า,ใส', 'ป.3/1').rows
  const second = roster.applyRoster(played, rows2, 2000)
  eq(second.added, 1, 'เพิ่มเฉพาะคนใหม่')
  eq(second.updated, 1, 'ปรับข้อมูลคนเดิม')
  eq(Object.keys(second.players).length, 3, 'รวมสามคน')
  eq(second.players['st-c_10231'].student.last, 'ใจงาม', 'นามสกุลใหม่')
  eq(second.players['st-c_10231'].exp, 99, 'คะแนนเดิมอยู่ครบ')
  eq(second.players['st-c_10231'].preTest.score, 9, 'ผลก่อนเรียนเดิมอยู่ครบ')
  eq(second.players['st-c_10231'].name, 'ต้นกล้า', 'ชื่อเล่นเดิมไม่หาย')
  // เครื่องอื่นนำเข้าไฟล์เดียวกัน ได้รหัสผู้เล่นเดียวกัน
  const other = roster.applyRoster({}, rows, 5555)
  eq(Object.keys(other.players).sort().join(), ids.join(), 'รหัสเหมือนกันทุกเครื่อง')
  // ไม่มีเลขประจำตัว: ใช้ห้อง+เลขที่
  const noCode = roster.applyRoster({}, roster.readRoster('เลขที่,ชื่อ\n7,ข้าว', 'ป.3/1').rows)
  eq(Object.keys(noCode.players)[0], 'st-r_ป_3_1_7', 'รหัสจากห้องและเลขที่')
  // เรียงตามเลขที่ และชื่อบนจอนักเรียนไม่แสดงนามสกุล/เลขประจำตัว
  const list = roster.rosterList(second.players)
  eq(list.map((p) => p.student.no).join(), '1,2,3', 'เรียงตามเลขที่')
  eq(classroom.publicName(list[0]), 'เลขที่ 1 · ต้นกล้า', 'ชื่อที่เพื่อนเห็น')
  assert(!classroom.publicName(list[0]).includes('ใจงาม') && !classroom.publicName(list[0]).includes('10231'), 'ไม่แสดงนามสกุลและเลขประจำตัวต่อเพื่อน')
  eq(classroom.teacherName(list[0]), 'สมชาย ใจงาม', 'ชื่อเต็มสำหรับครู')
})

test('สถานะการเข้าร่วม และเกณฑ์ผ่าน/เป้าหมายที่ครูตั้งเอง (คำนวณแบบจำนวนเต็ม ไม่คลาดเคลื่อน)', () => {
  const mk = (pre, post, played) => {
    const p = progress.newPlayer('x', 'hero', 1)
    if (pre !== null) p.preTest = { score: pre, total: 20, timeMs: 1, at: 1, skills: progress.emptyTestSkills() }
    if (post !== null) p.postTest = { score: post, total: 20, timeMs: 1, at: 2, skills: progress.emptyTestSkills() }
    if (played) p.answered = 5
    return p
  }
  const none = mk(null, null, false)
  eq(roster.participation(none), 'none', 'ยังไม่เริ่ม')
  eq(roster.participation(mk(8, null, false)), 'pre', 'ทำก่อนเรียนแล้ว')
  eq(roster.participation(mk(8, null, true)), 'game', 'กำลังเล่นภารกิจ')
  eq(roster.participation(mk(8, 15, true)), 'post', 'ทำหลังเรียนแล้ว')
  // 14/20 = 70% พอดีต้องผ่านเกณฑ์ 70
  eq(report.passedPost(mk(8, 14, true), 70), true, '14/20 ผ่านเกณฑ์ 70% พอดี')
  eq(report.passedPost(mk(8, 13, true), 70), false, '13/20 ไม่ผ่าน')
  eq(report.passedPost(mk(8, null, true), 70), null, 'ยังไม่ทำหลังเรียน')
  eq(report.passedPost(mk(8, 15, true), 80), false, 'ครูตั้งเกณฑ์ 80%: 15/20 ไม่ผ่าน')
  // ห้อง 7 คน ผ่าน 6 คน = 85.71% ≥ 80 บรรลุเป้าหมาย
  const room = [mk(5, 20, true), mk(5, 18, true), mk(5, 16, true), mk(5, 14, true), mk(5, 15, true), mk(5, 17, true), mk(5, 10, true)]
  const prog = report.classProgress(room, { passPercent: 70, targetPercent: 80 })
  eq(prog.total, 7, 'นักเรียนทั้งหมด')
  eq(prog.passed, 6, 'ผ่านเกณฑ์')
  eq(prog.passRate, 85.71, 'ร้อยละที่ผ่าน (ทศนิยม 2 ตำแหน่ง)')
  eq(report.fixed2(prog.passRate), '85.71', 'แสดงทศนิยม 2 ตำแหน่ง')
  eq(prog.targetMet, true, 'บรรลุเป้าหมาย 80%')
  eq(report.classProgress(room, { passPercent: 70, targetPercent: 90 }).targetMet, false, 'เป้าหมาย 90% ยังไม่บรรลุ')
  // ยังไม่มีใครทำหลังเรียน: ยังสรุปเป้าหมายไม่ได้
  const early = report.classProgress([mk(5, null, true), none], { passPercent: 70, targetPercent: 80 })
  eq(early.targetMet, null, 'ยังไม่มีผลหลังเรียน')
  eq(early.preDone, 1, 'ทำก่อนเรียน 1 คน')
  eq(early.played, 1, 'เล่นเกม 1 คน')
  eq(report.classProgress([], { passPercent: 70, targetPercent: 80 }).passRate, null, 'ห้องว่าง')
})

test('ตั้งค่าห้องเรียน: ค่าเริ่มต้น 70/80 ซ่อมค่าผิดรูป รหัสครู และรหัสสำรอง', () => {
  const d = classroom.repairClassroom(undefined)
  eq(d.passPercent, 70, 'เกณฑ์ผ่านเริ่มต้น')
  eq(d.targetPercent, 80, 'เป้าหมายเริ่มต้น')
  eq(d.pin, '', 'ยังไม่มีรหัสครู')
  const bad = classroom.repairClassroom({ passPercent: 140, targetPercent: 'x', pin: '12', school: '  โรงเรียนบ้านดอน  ' })
  eq(bad.passPercent, 70, 'เกิน 100 ใช้ค่าเริ่มต้น')
  eq(bad.targetPercent, 80, 'ไม่ใช่ตัวเลขใช้ค่าเริ่มต้น')
  eq(bad.pin, '', 'รหัสสั้นเกินไม่รับ')
  eq(bad.school, 'โรงเรียนบ้านดอน', 'ตัดช่องว่าง')
  eq(classroom.repairClassroom({ passPercent: 60, pin: '2468', recovery: 'ABCD-EFGH' }).passPercent, 60, 'รับค่าที่ครูตั้ง')
  assert(classroom.validPin('2468') && classroom.validPin('135790') && !classroom.validPin('12a4') && !classroom.validPin('123'), 'รหัสครูเป็นตัวเลข 4–6 หลัก')
  const code = classroom.newRecoveryCode(() => 0.5)
  assert(/^[A-Z2-9]{4}-[A-Z2-9]{4}$/.test(code), `รูปแบบรหัสสำรอง ${code}`)
  const c = { ...d, pin: '2468', recovery: code }
  assert(classroom.recoveryMatches(c, code.toLowerCase().replace('-', ' ')), 'รหัสสำรองพิมพ์เล็ก/เว้นวรรคก็ได้')
  assert(!classroom.recoveryMatches(c, 'WRONG-CODE'), 'รหัสสำรองผิด')
  assert(!classroom.recoveryMatches({ ...d, recovery: '' }, ''), 'ไม่มีรหัสสำรองใช้ไม่ได้')
  eq(classroom.termLine({ ...d, term: '2', year: '2569' }), 'ภาคเรียนที่ 2 ปีการศึกษา 2569', 'บรรทัดภาคเรียน')
  eq(classroom.thaiDate(new Date(2026, 9, 30, 12).getTime()), '30 ตุลาคม พ.ศ. 2569', 'วันที่แบบไทย')
  // ข้อมูลเก่า (ไม่มีห้องเรียน/ทะเบียน) เปิดได้ และได้ค่าเริ่มต้น
  const old = progress.parseSave(JSON.stringify({ version: 1, players: { a: { id: 'a', name: 'เก่า' } }, activeId: 'a', settings: {} }))
  eq(old.classroom.passPercent, 70, 'ไฟล์เก่าได้เกณฑ์เริ่มต้น')
  eq(old.players.a.student, undefined, 'ผู้เล่นเก่าไม่มีทะเบียน')
  eq(old.activeId, 'a', 'ผู้เล่นเก่ายังเล่นต่อได้')
  // ข้อมูลทะเบียนเสียบางส่วน
  const broken = progress.parseSave(JSON.stringify({ version: 1, players: { b: { id: 'b', name: 'บี', student: { first: '', no: 'x' } }, c: { id: 'c', name: 'ซี', student: { first: 'ซี', no: '12', room: 'ป.3/1' } } } }))
  eq(broken.players.b.student, undefined, 'ทะเบียนไม่มีชื่อ ไม่รับ')
  eq(broken.players.c.student.no, 12, 'เลขที่จากข้อความ')
})

test('ไฟล์สำรอง: บันทึกแล้วอ่านกลับได้ครบ รวมสองเครื่องได้ผลถูก และนำเข้าไฟล์เดิมซ้ำคะแนนไม่เพิ่มซ้ำ', () => {
  const rows = roster.readRoster('เลขที่,เลขประจำตัว,ชื่อ\n1,501,ก้อง\n2,502,ข้าว', 'ป.3/1').rows
  const base = progress.emptySave()
  base.classroom = { ...base.classroom, school: 'โรงเรียนทดสอบ', pin: '2468', recovery: 'ABCD-EFGH' }
  base.players = roster.applyRoster({}, rows, 100).players
  // อ่านกลับ
  const text = backup.buildBackup(base, 12345)
  const read = backup.readBackup(text)
  assert(read, 'อ่านไฟล์สำรองได้')
  eq(read.exportedAt, 12345, 'เวลาที่บันทึก')
  eq(Object.keys(read.save.players).length, 2, 'นักเรียนครบ')
  eq(read.save.classroom.school, 'โรงเรียนทดสอบ', 'ข้อมูลห้องเรียนครบ')
  eq(backup.readBackup('{"hello":1}'), null, 'ไฟล์อื่นไม่รับ')
  eq(backup.readBackup('ไม่ใช่ JSON'), null, 'ไฟล์เสียไม่รับ')
  assert(backup.readBackup(JSON.stringify(base)), 'รับข้อมูลดิบจากที่เก็บในเครื่องได้')
  // เครื่อง A: ก้องเล่นด่าน 0–1 ทำก่อนเรียน · เครื่อง B: ก้องเล่นด่าน 2 ทำหลังเรียน ข้าวเล่นด่าน 0
  const kong = base.players['st-c_501']
  const lv = (stepDone, bestStars, plays) => ({ ...progress.emptyLevel(), stepDone, bestStars, plays })
  const pre = { score: 9, total: 20, timeMs: 1, at: 1000, skills: progress.emptyTestSkills() }
  const post = { score: 18, total: 20, timeMs: 1, at: 9000, skills: progress.emptyTestSkills() }
  const A = { ...base, players: { ...base.players, 'st-c_501': { ...kong, needsAvatar: undefined, avatar: 'wizard', lastPlayed: 2000, exp: 50, answered: 20, badges: ['pretest'], preTest: pre, levels: { 0: lv(4, 3, 1), 1: lv(4, 2, 2) }, skills: { ...kong.skills, count: { attempts: 10, correct: 8, timeMs: 5 } }, mistakes: [{ at: 1500, levelId: 1, gen: 'g1', difficulty: 1, skill: 'count', title: 't' }] } } }
  const B0 = progress.emptySave()
  const kongB = { ...kong, needsAvatar: undefined, avatar: 'wizard', lastPlayed: 9000, exp: 80, answered: 15, badges: ['posttest'], postTest: post, levels: { 1: lv(4, 3, 1), 2: lv(2, 0, 1) }, skills: { ...kong.skills, count: { attempts: 6, correct: 6, timeMs: 3 } }, mistakes: [{ at: 8000, levelId: 2, gen: 'g2', difficulty: 1, skill: 'count', title: 't' }] }
  const khao = { ...base.players['st-c_502'], needsAvatar: undefined, avatar: 'ninja', lastPlayed: 7000, answered: 4, levels: { 0: lv(4, 1, 1) } }
  const B = { ...B0, players: { 'st-c_501': kongB, 'st-c_502': khao } }
  const m = backup.mergeSaves(A, backup.readBackup(backup.buildBackup(B)).save)
  eq(m.added, 0, 'ไม่มีคนใหม่ (ทั้งสองคนอยู่ในทะเบียนแล้ว)')
  eq(m.merged, 2, 'รวมผลสองคน')
  const k = m.save.players['st-c_501']
  eq(k.preTest.score, 9, 'ผลก่อนเรียนจากเครื่อง A')
  eq(k.postTest.score, 18, 'ผลหลังเรียนจากเครื่อง B')
  eq(Object.keys(k.levels).sort().join(), '0,1,2', 'ด่านจากทั้งสองเครื่อง')
  eq(k.levels[1].bestStars, 3, 'ดาวที่ดีที่สุดของด่าน 1')
  eq(k.levels[1].plays, 2, 'จำนวนครั้งที่เล่น (ค่าสูงสุด)')
  eq(k.exp, 80, 'EXP สูงสุด')
  eq(k.skills.count.attempts, 10, 'สถิติทักษะใช้ชุดที่ทำมากกว่า')
  eq(k.skills.count.correct, 8, 'ถูก/ทั้งหมดมาจากชุดเดียวกัน')
  eq(k.badges.sort().join(), 'posttest,pretest', 'ตรารวมกัน')
  eq(k.mistakes.length, 2, 'ข้อที่เคยผิดรวมกัน')
  eq(k.lastPlayed, 9000, 'เล่นล่าสุด')
  eq(m.save.players['st-c_502'].avatar, 'ninja', 'ข้าวได้ตัวละครที่เลือกบนเครื่อง B')
  eq(m.save.players['st-c_502'].needsAvatar, undefined, 'ข้าวเลือกตัวละครแล้ว')
  eq(m.save.classroom.pin, '2468', 'เครื่องครูตั้งค่าแล้ว ใช้ของเครื่องครู')
  // นำเข้าไฟล์เดิมซ้ำ: ผลเหมือนเดิม
  const again = backup.mergeSaves(m.save, B)
  eq(JSON.stringify(again.save.players), JSON.stringify(m.save.players), 'นำเข้าซ้ำ คะแนนไม่เพิ่มซ้ำ')
  // เครื่องใหม่ที่ยังไม่ได้ตั้งค่า รับการตั้งค่าห้องเรียนจากไฟล์
  const fresh = backup.mergeSaves(progress.emptySave(), A)
  eq(fresh.added, 2, 'เครื่องใหม่ได้นักเรียนครบ')
  eq(fresh.save.classroom.school, 'โรงเรียนทดสอบ', 'รับการตั้งค่าห้องเรียนจากไฟล์')
  // ผู้เล่นที่สร้างเองชื่อซ้ำกันคนละเครื่อง (รหัสต่างกัน) ไม่ถูกรวมเป็นคนเดียว
  const x1 = progress.newPlayer('มิว', 'hero', 1)
  const x2 = { ...progress.newPlayer('มิว', 'hero', 2), id: x1.id + 'b' }
  const mm = backup.mergeSaves({ ...progress.emptySave(), players: { [x1.id]: x1 } }, { ...progress.emptySave(), players: { [x2.id]: x2 } })
  eq(mm.added, 1, 'คนละคน ไม่รวมกัน')
  // ชื่อไฟล์
  const name = backup.backupFileName(base, new Date(2026, 9, 30, 9, 5))
  eq(name, 'money-hero-สำรอง-ป.3-2026-10-30-0905.json', 'ชื่อไฟล์สำรอง')
})

/* ------------------------------------------------------------------ */
/* คลังข้อสอบก่อน/หลังเรียน                                             */
/* ------------------------------------------------------------------ */

test('คลังข้อสอบตั้งต้น: ก่อน/หลังเรียนเป็นฉบับคู่ขนาน 20 ข้อ 20 คะแนน และเฉลยทุกข้อถูกต้อง (คำนวณใหม่แยกจากคลัง)', () => {
  const bank = testBank.defaultBank()
  const baht = (satang) => {
    const b = Math.floor(satang / 100)
    const s = satang % 100
    return s === 0 ? `${b} บาท` : `${b} บาท ${s} สตางค์`
  }
  const expect = {
    pre: [
      'เหรียญ 10 บาท',
      '100 บาท',
      `${100 + 20 + 20 + 10 + 5} บาท`,
      baht(3 * 1000 + 2 * 50),
      50 + 20 + 10 + 10 + 2,
      '45.50 บาท',
      'สามสิบบาทยี่สิบห้าสตางค์',
      baht(Math.max(7500, 750, 5750, 7525)),
      `ต้น มากกว่า ${85 - 58} บาท`,
      `${100 / 20} ใบ`,
      (6 * 50) / 100,
      `${456 + 287} บาท`,
      baht(5075 + 2450),
      500 - 365,
      `${15 * 4} บาท`,
      `${96 / 4} บาท`,
      `${100 - 68} บาท`,
      120 - 25 - 18,
      `${500 - 159 - 235} บาท`,
      `${40 - 25 + (40 - 30)} บาท`,
    ],
    post: [
      'ธนบัตร 20 บาท',
      '500 บาท',
      `${100 + 50 + 20 + 5 + 1} บาท`,
      baht(4 * 500 + 4 * 25),
      100 + 20 + 5 + 5 + 2 + 1,
      '128.75 บาท',
      'สิบหกบาทห้าสิบสตางค์',
      '12.50 บาท',
      `โอ๊ต มากกว่า ${92 - 64} บาท`,
      `${50 / 5} เหรียญ`,
      (8 * 25) / 100,
      `${378 + 465} บาท`,
      baht(3650 + 4875),
      700 - 438,
      `${12 * 6} บาท`,
      `${84 / 3} บาท`,
      `${500 - 145} บาท`,
      150 - 36 - 27,
      `${500 - 289 - 175} บาท`,
      `${50 - 35 + (50 - 28)} บาท`,
    ],
  }
  for (const kind of ['pre', 'post']) {
    const form = bank[kind]
    eq(form.items.length, 20, `${kind}: 20 ข้อ`)
    eq(testBank.fullScore(form), 20, `${kind}: คะแนนเต็ม 20`)
    eq(new Set(form.items.map((i) => i.id)).size, 20, `${kind}: รหัสข้อไม่ซ้ำ`)
    form.items.forEach((item, i) => {
      const problems = testBank.itemProblems(item)
      eq(problems.length, 0, `${kind} ข้อ ${i + 1} ใช้ได้ (${problems})`)
      const want = expect[kind][i]
      if (item.type === 'choice') eq(item.choices[item.answer], want, `${kind} ข้อ ${i + 1} เฉลย`)
      else eq(item.answer, want, `${kind} ข้อ ${i + 1} เฉลยตัวเลข`)
    })
    eq(form.items.filter((i) => i.type === 'number').length, 4, `${kind}: ข้อเติมตัวเลข 4 ข้อ`)
  }
  eq(testBank.parallelProblems(bank.pre, bank.post).length, 0, 'ฉบับคู่ขนาน')
  // จุดประสงค์เดียวกันข้อต่อข้อ แต่โจทย์ไม่ซ้ำกัน
  bank.pre.items.forEach((it, i) => {
    eq(it.skill, bank.post.items[i].skill, `ข้อ ${i + 1} วัดจุดประสงค์เดียวกัน`)
    eq(it.type, bank.post.items[i].type, `ข้อ ${i + 1} ชนิดเดียวกัน`)
    assert(it.text !== bank.post.items[i].text || it.money.join() !== bank.post.items[i].money.join(), `ข้อ ${i + 1} ก่อน/หลังเรียนต้องต่างกัน`)
  })
  // ครอบคลุมทุกจุดประสงค์
  const counts = testBank.skillCounts(bank.pre)
  for (const s of ['notes', 'count', 'dot', 'compare', 'exchange', 'addsub', 'muldiv', 'word', 'ledger']) assert(counts[s] > 0, `มีข้อสอบจุดประสงค์ ${s}`)
  // คูณหารตามหลักสูตร ป.3: ตัวคูณ/ตัวหารหลักเดียว ผลเป็นบาทล้วน
  assert(!JSON.stringify(bank).includes('NaN'), 'ไม่มีค่าเสีย')
  eq(bank.pre.minutes, 30, 'เวลาเริ่มต้น 30 นาที')
  eq(bank.pre.open, true, 'ก่อนเรียนเปิดไว้')
  eq(bank.post.open, false, 'หลังเรียนปิดไว้จนครูเปิดหรือผ่านด่าน 12')
})

test('คลังข้อสอบ: ตรวจคะแนน (คะแนนรายข้อ ตัวเลขที่พิมพ์หลายแบบ ข้อที่ไม่ตอบ) และสุ่มข้อ/ตัวเลือกถูกต้อง', () => {
  const form = testBank.defaultBank().pre
  // ตอบถูกทุกข้อ
  const all = {}
  for (const i of form.items) all[i.id] = i.type === 'choice' ? i.answer : String(i.answer)
  const full = testBank.gradeAttempt(form, all, { startedAt: 1000, at: 61000, bankAt: 0, timedOut: false })
  eq(full.score, 20, 'ถูกทุกข้อได้ 20')
  eq(full.correct, 20, 'ถูก 20 ข้อ')
  eq(full.timeMs, 60000, 'เวลาที่ใช้')
  eq(full.id, 'pre-1000', 'รหัสการทำ')
  // ไม่ตอบเลย
  eq(testBank.gradeAttempt(form, {}, { startedAt: 1, at: 2, bankAt: 0, timedOut: true }).score, 0, 'ไม่ตอบได้ 0')
  eq(testBank.unanswered(form, {}), 20, 'ยังไม่ตอบ 20 ข้อ')
  eq(testBank.unanswered(form, all), 0, 'ตอบครบ')
  // ตัวเลขที่พิมพ์
  const num = { ...form.items.find((i) => i.type === 'number'), answer: 1250 }
  assert(testBank.isCorrect(num, '1,250') && testBank.isCorrect(num, '1250') && testBank.isCorrect(num, ' 1250 '), 'รับตัวเลขมีจุลภาค/ช่องว่าง')
  assert(!testBank.isCorrect(num, '125') && !testBank.isCorrect(num, '') && !testBank.isCorrect(num, 'abc') && !testBank.isCorrect(num, null), 'ตัวเลขผิด/ว่าง')
  const dec = { ...num, answer: 12.5 }
  assert(testBank.isCorrect(dec, '12.50') && testBank.isCorrect(dec, '12.5'), '12.50 = 12.5')
  assert(!testBank.isCorrect(dec, '12.05') && !testBank.isCorrect(dec, '12.505'), 'ทศนิยมผิด')
  eq(testBank.parseNumber('3.333'), null, 'ทศนิยมเกิน 2 ตำแหน่งไม่รับ')
  // คะแนนรายข้อไม่เท่ากัน
  const weighted = { ...form, items: form.items.map((i, n) => (n === 0 ? { ...i, points: 3 } : i)) }
  eq(testBank.fullScore(weighted), 22, 'คะแนนเต็มรวมคะแนนรายข้อ')
  const onlyFirst = testBank.gradeAttempt(weighted, { [form.items[0].id]: form.items[0].answer }, { startedAt: 1, at: 2, bankAt: 0, timedOut: false })
  eq(onlyFirst.score, 3, 'ถูกข้อ 3 คะแนนได้ 3')
  eq(onlyFirst.total, 22, 'คะแนนเต็ม 22')
  // สุ่มข้อและตัวเลือก: ครบทุกข้อ ตัวเลือกเป็นการสลับ 0–3
  for (let k = 0; k < 50; k += 1) {
    const paper = testBank.makePaper(form)
    eq([...paper.order].sort().join(), form.items.map((i) => i.id).sort().join(), 'สุ่มแล้วข้อครบ')
    for (const i of form.items.filter((x) => x.type === 'choice')) eq([...paper.choiceOrder[i.id]].sort().join(), '0,1,2,3', 'ตัวเลือกครบ 4')
  }
  const fixed = testBank.makePaper({ ...form, shuffleItems: false, shuffleChoices: false })
  eq(fixed.order.join(), form.items.map((i) => i.id).join(), 'ไม่สุ่มข้อ')
  eq(fixed.choiceOrder[form.items[0].id].join(), '0,1,2,3', 'ไม่สุ่มตัวเลือก')
  // เวลา
  eq(testBank.secondsLeft(form, 0, 60000), 29 * 60, 'เหลือ 29 นาที')
  eq(testBank.secondsLeft(form, 0, 31 * 60000), 0, 'หมดเวลา')
  eq(testBank.secondsLeft({ ...form, minutes: 0 }, 0, 9e9), null, 'ไม่จำกัดเวลา')
  eq(testBank.clockText(125), '2:05', 'นาฬิกา')
  eq(testBank.answerText(form.items[0]), 'ค. เหรียญ 10 บาท', 'ข้อความเฉลยปรนัย')
  eq(testBank.answerText({ ...num, answer: 1250, unit: 'บาท' }), '1,250 บาท', 'ข้อความเฉลยตัวเลข')
})

test('คลังข้อสอบ: ตรวจข้อที่ครูเขียน ซ่อมไฟล์ที่เสีย และบอกเมื่อไม่เป็นฉบับคู่ขนาน', () => {
  const ok = { ...testBank.blankItem('pre', 1), text: 'โจทย์', choices: ['1', '2', '3', '4'], answer: 2 }
  eq(testBank.itemProblems(ok).length, 0, 'ข้อที่ถูกต้อง')
  assert(testBank.itemProblems({ ...ok, text: ' ' }).includes('ยังไม่มีโจทย์'), 'ไม่มีโจทย์')
  assert(testBank.itemProblems({ ...ok, choices: ['1', '1', '3', '4'] }).includes('ตัวเลือกซ้ำกัน'), 'ตัวเลือกซ้ำ')
  assert(testBank.itemProblems({ ...ok, choices: ['1', '', '3', '4'] }).includes('ต้องมีตัวเลือกครบ 4 ข้อ'), 'ตัวเลือกไม่ครบ')
  assert(testBank.itemProblems({ ...ok, answer: 4 }).includes('ยังไม่ได้เลือกคำตอบที่ถูก'), 'ไม่มีคำตอบ')
  assert(testBank.itemProblems({ ...ok, points: 0 }).length > 0, 'คะแนน 0 ไม่ได้')
  const n = { ...ok, type: 'number', choices: [], answer: 12.345 }
  assert(testBank.itemProblems(n).some((p) => p.includes('2 ตำแหน่ง')), 'ทศนิยม 3 ตำแหน่งไม่ได้')
  eq(testBank.itemProblems({ ...n, answer: 12.5 }).length, 0, 'ทศนิยม 2 ตำแหน่งได้')
  // ซ่อมไฟล์: ข้อเสียถูกตัดทิ้ง ข้อดีอยู่ครบ รหัสซ้ำถูกแก้
  const raw = { pre: { items: [ok, { ...ok }, { text: '' }, 'x'], minutes: 999 }, post: null, updatedAt: 5 }
  const fixed = testBank.repairBank(raw)
  eq(fixed.pre.items.length, 2, 'เก็บเฉพาะข้อที่ใช้ได้')
  assert(fixed.pre.items[0].id !== fixed.pre.items[1].id, 'รหัสซ้ำถูกแก้')
  eq(fixed.pre.minutes, 30, 'เวลาผิดใช้ค่าเริ่มต้น')
  eq(fixed.post.items.length, 20, 'ฉบับที่หายใช้ชุดตั้งต้น')
  eq(fixed.updatedAt, 5, 'เวลาแก้ล่าสุด')
  eq(testBank.repairBank('garbage').pre.items.length, 20, 'ไฟล์เสียทั้งก้อนใช้ชุดตั้งต้น')
  // ไม่เป็นฉบับคู่ขนาน
  const bank = testBank.defaultBank()
  const shorter = { ...bank.post, items: bank.post.items.slice(1) }
  const problems = testBank.parallelProblems(bank.pre, shorter)
  assert(problems.some((p) => p.includes('จำนวนข้อ')) && problems.some((p) => p.includes('คะแนนเต็ม')), `เตือนเมื่อไม่คู่ขนาน: ${problems}`)
  // ข้อมูลเก่าที่ไม่มีคลังข้อสอบ เปิดได้และได้ชุดตั้งต้น
  const old = progress.parseSave(JSON.stringify({ version: 1, players: {}, activeId: null, settings: {} }))
  eq(old.bank.pre.items.length, 20, 'ไฟล์เก่าได้คลังข้อสอบตั้งต้น')
})

test('แบบทดสอบของนักเรียน: ทำได้ครั้งเดียว ส่งซ้ำไม่บันทึกซ้ำ ครูให้ทำใหม่ได้ หลังเรียนเปิดเมื่อครูเปิดหรือผ่านด่าน 12', () => {
  const bank = testBank.defaultBank()
  let p = progress.newPlayer('ทดสอบ', 'hero', 1)
  eq(exam.testState(p, bank.pre), 'ready', 'ก่อนเรียนพร้อมทำ')
  eq(exam.testState(p, bank.post), 'locked', 'หลังเรียนยังล็อก')
  eq(exam.testState(p, { ...bank.pre, open: false }), 'closed', 'ครูปิดก่อนเรียน')
  const answers = {}
  bank.pre.items.forEach((i, n) => {
    if (n < 15) answers[i.id] = i.type === 'choice' ? i.answer : String(i.answer)
  })
  const a1 = testBank.gradeAttempt(bank.pre, answers, { startedAt: 100, at: 200, bankAt: 0, timedOut: false })
  p = exam.recordAttempt(p, a1)
  eq(p.preTest.score, 15, 'ผลก่อนเรียน 15')
  eq(p.preTest.total, 20, 'คะแนนเต็ม 20')
  eq(p.coins, progress.TEST_REWARD.pre.coins, 'ได้รางวัลครั้งแรก')
  const skillTotal = Object.values(p.preTest.skills).reduce((s, v) => s + v.total, 0)
  eq(skillTotal, 20, 'ผลรายจุดประสงค์ครบ 20 ข้อ')
  // ส่งซ้ำ (กดสองครั้ง / StrictMode)
  const again = exam.recordAttempt(p, a1)
  eq(again, p, 'ส่งซ้ำไม่บันทึกซ้ำ')
  eq(p.tests.length, 1, 'ประวัติ 1 ครั้ง')
  eq(exam.testState(p, bank.pre), 'done', 'ทำแล้วทำซ้ำไม่ได้')
  eq(exam.testState(p, { ...bank.pre, oneAttempt: false }), 'ready', 'ครูตั้งให้ทำซ้ำได้')
  // ครูให้ทำใหม่
  p = exam.grantRetake(p, 'pre', 300)
  eq(exam.testState(p, bank.pre), 'ready', 'ครูให้ทำใหม่')
  assert(exam.retakeOpen(p, 'pre'), 'เปิดให้ทำใหม่')
  const a2 = testBank.gradeAttempt(bank.pre, {}, { startedAt: 400, at: 500, bankAt: 0, timedOut: true })
  p = exam.recordAttempt(p, a2)
  eq(p.preTest.score, 0, 'ผลล่าสุดใช้ในรายงาน')
  eq(p.tests.length, 2, 'ประวัติเก็บครบ 2 ครั้ง')
  eq(p.coins, progress.TEST_REWARD.pre.coins, 'ทำใหม่ไม่ได้รางวัลซ้ำ')
  eq(exam.testState(p, bank.pre), 'done', 'ทำใหม่แล้วกลับเป็นทำแล้ว')
  eq(exam.latestAttempt(p, 'pre').id, 'pre-400', 'ครั้งล่าสุด')
  // หลังเรียน: ครูเปิด หรือผ่านด่าน 12
  eq(exam.testState(p, { ...bank.post, open: true }), 'ready', 'ครูเปิดหลังเรียน')
  const passed12 = { ...p, levels: { 12: { ...progress.emptyLevel(), stepDone: 4 } } }
  eq(exam.testState(passed12, bank.post), 'ready', 'ผ่านด่าน 12 ทำได้')
  // วิเคราะห์รายข้อ
  const q = progress.newPlayer('คิว', 'hero', 2)
  const qa = testBank.gradeAttempt(bank.pre, answers, { startedAt: 10, at: 20, bankAt: 0, timedOut: false })
  const st = exam.itemStats([p, exam.recordAttempt(q, qa)], bank.pre)
  const first = st[bank.pre.items[0].id]
  eq(first.n, 2, 'ทำข้อแรก 2 คน')
  eq(first.right, 1, 'ถูก 1 คน (อีกคนครั้งล่าสุดไม่ได้ตอบ)')
  eq(first.p, 0.5, 'ค่าความยาก 0.50')
  eq(exam.takenCount([p, q], 'pre'), 1, 'นับคนที่ทำแล้ว')
  // รวมข้อมูลสองเครื่อง: ประวัติรวมกัน คลังข้อสอบใช้ฉบับที่ครูแก้ล่าสุด
  const devA = { ...progress.emptySave(), players: { [p.id]: { ...p, tests: [a1] } } }
  const devB = { ...progress.emptySave(), players: { [p.id]: { ...p, tests: [a1, a2] } }, bank: { ...bank, updatedAt: 99 } }
  const m = backup.mergeSaves(devA, devB)
  eq(m.save.players[p.id].tests.length, 2, 'ประวัติรวมไม่ซ้ำ')
  eq(m.save.bank.updatedAt, 99, 'ใช้คลังข้อสอบที่ใหม่กว่า')
  eq(backup.mergeSaves(devB, devA).save.bank.updatedAt, 99, 'คลังที่ใหม่กว่าไม่ถูกทับ')
})

/* ------------------------------------------------------------------ */
/* เกมกระดาน ตะลุยเมืองเงิน (ฉบับพิมพ์)                                    */
/* ------------------------------------------------------------------ */

test('เกมกระดาน: ถนน 40 ช่องเริ่มบ้านจบธนาคาร ช่องไม่ทับกัน และไม่มีช่องไหนถูกตัดตรงรอยต่อกระดานสองแผ่น', () => {
  const spaces = board.BOARD_SPACES
  eq(spaces.length, 40, 'จำนวนช่อง')
  eq(spaces[0].kind, 'home', 'ช่องแรกคือบ้าน')
  eq(spaces[39].kind, 'bank', 'ช่องสุดท้ายคือธนาคาร')
  const count = (k) => spaces.filter((s) => s.kind === k).length
  eq(count('quest'), 10, 'ช่องภารกิจ')
  eq(count('shop'), 12, 'ช่องร้านค้า')
  eq(count('luck'), 7, 'ช่องโชคดี')
  for (const shop of board.BOARD_SHOPS) eq(spaces.filter((s) => s.shop === shop.id).length, 2, `ร้าน ${shop.name} มี 2 ช่อง`)
  // ร้านแต่ละร้านมีอย่างน้อยหนึ่งช่องในครึ่งแรกของถนน (ซื้อได้ตั้งแต่รอบแรก)
  for (const shop of board.BOARD_SHOPS) assert(spaces.slice(0, 20).some((s) => s.shop === shop.id), `ร้าน ${shop.name} อยู่ครึ่งแรก`)
  spaces.forEach((s, i) => {
    eq(s.no, i + 1, 'เลขช่อง')
    const p = board.spaceCenter(i)
    const half = s.kind === 'home' || s.kind === 'bank' ? 63 : 55
    assert(p.x - half > 0 && p.x + half < board.BOARD_W && p.y - half > 120 && p.y + half < 910, `ช่อง ${s.no} อยู่ในกระดาน`)
    assert(p.x + half < board.BOARD_SEAM || p.x - half > board.BOARD_SEAM, `ช่อง ${s.no} ไม่ถูกตัดตรงรอยต่อ`)
    if (i > 0) {
      const q = board.spaceCenter(i - 1)
      const d = Math.abs(p.x - q.x) + Math.abs(p.y - q.y)
      assert(d === 130 || (d === 210 && p.x === q.x), `ช่อง ${s.no} อยู่ติดช่องก่อนหน้า (${d})`)
    }
  })
  assert(Object.values(board.SPACE_INFO).every((i) => i.short.length <= 26), 'คำอธิบายสั้นบนกระดานไม่ยาวเกิน')
})

test('เกมกระดาน: ราคาจ่ายได้ด้วยเงินจำลอง บัตรรายการรวมราคาถูกต้อง และเงินตั้งต้นพอซื้อได้', () => {
  eq(board.startTotal(), 10000, 'เงินตั้งต้น 100 บาท')
  for (const shop of board.BOARD_SHOPS) {
    eq(shop.items.length, 4, `${shop.name} มี 4 อย่าง`)
    for (const it of shop.items) assert(it.price > 0 && it.price % 50 === 0, `${it.name} ราคาจ่ายได้ด้วยเหรียญ 50 สตางค์ขึ้นไป`)
  }
  const ids = board.BOARD_SHOPS.flatMap((s) => s.items.map((i) => i.id))
  eq(new Set(ids).size, ids.length, 'รหัสสินค้าไม่ซ้ำ')
  // ราคารวมคำนวณใหม่ด้วยมือ (บาท)
  const expected = [12 + 20 + 15 * 2, 18 * 2 + 6 * 2 + 12, 60 + 25 + 12.5, 5 * 4 + 8 * 2 + 12.5 * 2, 45 + 20 * 2 + 20, 35 + 5 + 17.5 * 2, 40 + 10 * 2 + 15 * 2, 39 + 2.5 * 4 + 30]
  eq(board.SHOPPING_LISTS.length, 8, '8 ใบ')
  board.SHOPPING_LISTS.forEach((l, i) => {
    eq(board.listTotal(l), Math.round(expected[i] * 100), `บัตร ${l.no} ${l.title}`)
    const shops = new Set(l.lines.map((x) => board.boardItem(x.item).shop.id))
    assert(shops.size >= 2, `บัตร ${l.no} ต้องไปมากกว่าหนึ่งร้าน`)
    assert(board.listTotal(l) >= 4000 && board.listTotal(l) <= 12000, `บัตร ${l.no} ยอดพอเหมาะ (${board.listTotal(l)})`)
  })
  eq(board.moneyStars(9950), 9, 'เงินเหลือ 99.50 บาท ได้ 9 ดาว')
  eq(board.moneyStars(10000), 10, '100 บาท ได้ 10 ดาว')
  eq(board.moneyStars(-5), 0, 'ติดลบไม่ได้ดาว')
  eq(board.LUCK_CARDS.length, 16, 'การ์ดโชคดี 16 ใบ')
  for (const c of board.LUCK_CARDS) {
    assert(c.text.length > 5 && c.money % 50 === 0, `การ์ดโชคดี ${c.no}`)
    assert(Math.abs(c.money) <= 5000, `การ์ดโชคดี ${c.no} เงินไม่มากเกิน`)
  }
})

test('เกมกระดาน: การ์ดภารกิจ 32 ใบ เฉลยถูกทุกใบ (คำนวณใหม่แยกจากตัวสร้าง) และคูณหารตามหลักสูตร ป.3', () => {
  const cards = board.buildQuestCards()
  eq(cards.length, 32, '32 ใบ')
  eq(cards.map((c) => c.no).join(), Array.from({ length: 32 }, (_, i) => i + 1).join(), 'เลขการ์ด 1–32')
  eq(JSON.stringify(board.buildQuestCards()), JSON.stringify(cards), 'สร้างกี่ครั้งก็ได้ชุดเดิม (เฉลยตรงกับที่พิมพ์)')
  const kinds = {}
  for (const c of cards) kinds[c.kind] = (kinds[c.kind] ?? 0) + 1
  for (const k of ['count', 'change', 'add', 'compare', 'exchange', 'muldiv', 'dot', 'ledger']) eq(kinds[k], 4, `ชนิด ${k} 4 ใบ`)
  for (let i = 1; i < cards.length; i += 1) assert(cards[i].kind !== cards[i - 1].kind, 'การ์ดชนิดเดียวกันไม่เรียงติดกัน')
  for (const c of cards) {
    const d = c.data
    let want
    switch (c.kind) {
      case 'count': {
        let total = 0
        for (let i = 0; i < d.length; i += 2) total += d[i] * d[i + 1]
        want = money.formatBS(total)
        break
      }
      case 'change':
        assert(d[1] > d[0], `การ์ด ${c.no} จ่ายมากกว่าราคา`)
        want = money.formatBS(d[1] - d[0])
        break
      case 'add':
        want = money.formatBS(d[0] + d[1])
        break
      case 'compare':
        assert(d[0] !== d[1], 'เงินสองคนไม่เท่ากัน')
        want = `${d[0] > d[1] ? c.text.split('มีเงิน')[0] : c.text.split(' บาท ')[1].split('มีเงิน')[0]} มากกว่า ${Math.abs(d[0] - d[1])} บาท`
        break
      case 'exchange':
        assert(d[0] % d[1] === 0, 'แลกได้ลงตัว')
        want = `${d[0] / d[1]} ${d[1] > 1000 ? 'ใบ' : 'เหรียญ'}`
        break
      case 'muldiv':
        if (c.text.startsWith('ซื้อ')) {
          assert(d[0] % 100 === 0 && d[1] >= 2 && d[1] <= 9, `การ์ด ${c.no} คูณบาทล้วน ตัวคูณหลักเดียว`)
          want = money.formatBS(d[0] * d[1])
        } else {
          assert(d[0] % (d[1] * 100) === 0 && d[1] >= 2 && d[1] <= 9, `การ์ด ${c.no} หารลงตัวเป็นบาท ตัวหารหลักเดียว`)
          want = `${d[0] / 100 / d[1]} บาท`
        }
        break
      case 'dot':
        want = d[1] === 0 ? money.formatDot(d[0]) : money.formatBS(d[0])
        break
      case 'ledger':
        want = money.formatBS(d[0] + d[1] - d[2])
        break
    }
    eq(c.answer, want, `การ์ด ${c.no} (${c.kind}) ${c.text}`)
    assert(c.reward === 500 || c.reward === 1000, `การ์ด ${c.no} รางวัล 5 หรือ 10 บาท`)
    assert(!c.text.includes('undefined') && !c.answer.includes('NaN'), `การ์ด ${c.no} ข้อความสมบูรณ์`)
  }
})

/* ------------------------------------------------------------------ */
/* ระยะ 3: บันทึกภารกิจ กลุ่มทำกิจกรรม โหมดทบทวน                          */
/* ------------------------------------------------------------------ */

test('บันทึกภารกิจ: สถิติรวมรายกิจกรรม รายการล่าสุดจำกัดจำนวน และสรุปตามกลุ่มภารกิจ 6 กลุ่ม', () => {
  let p = progress.newPlayer('มะลิ', 'hero', 1)
  p = activity.logActivity(p, { act: 'L3-practice', group: activity.levelGroup(3), label: 'ด่าน 3 ฝึกฝน', correct: 4, total: 5, wrong: 1, timeMs: 60000, points: 8 }, 100)
  p = activity.logActivity(p, { act: 'L3-practice', group: 'read', label: 'ด่าน 3 ฝึกฝน', correct: 5, total: 5, wrong: 0, timeMs: 30000, points: 10 }, 200)
  p = activity.logActivity(p, { act: 'change-practice', group: 'change', label: 'ร้านทอนไว', correct: 8, total: 10, wrong: 2, timeMs: 90000, points: 12 }, 300)
  const st = p.acts['L3-practice']
  eq(st.plays, 2, 'เล่นสองครั้ง')
  eq(st.correct, 9, 'ถูกรวม')
  eq(st.total, 10, 'ทั้งหมดรวม')
  eq(st.wrong, 1, 'ผิดรวม')
  eq(st.best, 1, 'ครั้งที่ดีที่สุด 100%')
  eq(st.firstAt, 100, 'เล่นครั้งแรก')
  eq(st.lastAt, 200, 'เล่นล่าสุด')
  eq(p.actLog.length, 3, 'รายการล่าสุด 3 รายการ')
  const g = activity.groupSummary(p)
  eq(g.read.plays, 2, 'กลุ่มอ่านเงิน 2 ครั้ง')
  eq(g.read.percent, 90, 'กลุ่มอ่านเงิน 90%')
  eq(g.change.percent, 80, 'กลุ่มทอนเงิน 80%')
  eq(g.team.percent, null, 'ยังไม่เล่นภารกิจร่วมมือ')
  eq(activity.groupsPlayed(p), 2, 'เล่นแล้ว 2 กลุ่ม')
  const sw = activity.strongWeakGroups(p, 85)
  eq(sw.strong.join(), 'read', 'กลุ่มที่เด่น')
  eq(sw.weak.join(), 'change', 'กลุ่มที่ควรฝึก (ต่ำกว่าเกณฑ์ 85)')
  // ข้อมูลผิดรูปไม่ทำให้สถิติเสีย
  const bad = activity.logActivity(p, { act: 'x', group: 'other', label: 'x', correct: 5, total: 2, wrong: -3, timeMs: NaN, points: Infinity }, 400)
  eq(bad.acts.x.total, 5, 'ถูกมากกว่าทั้งหมด ปรับทั้งหมดให้เท่าถูก')
  eq(bad.acts.x.wrong, 0, 'ค่าติดลบเป็น 0')
  eq(bad.acts.x.timeMs, 0, 'เวลาเสียเป็น 0')
  // จำกัดจำนวนรายการล่าสุด
  let q = progress.newPlayer('ก', 'hero', 1)
  for (let i = 0; i < activity.LOG_MAX + 20; i += 1) q = activity.logActivity(q, { act: 'daily', group: 'word', label: 'd', correct: 1, total: 1, wrong: 0, timeMs: 1, points: 0 }, i)
  eq(q.actLog.length, activity.LOG_MAX, 'เก็บไม่เกินจำนวนที่กำหนด')
  eq(q.acts.daily.plays, activity.LOG_MAX + 20, 'สถิติรวมนับครบทุกครั้ง')
  // กลุ่มภารกิจของแต่ละด่าน
  eq([0, 4, 6, 7, 8, 9, 10, 11, 12].map(activity.levelGroup).join(), 'read,read,read,price,price,word,word,budget,word', 'กลุ่มภารกิจของด่าน')
  eq(activity.MISSION_GROUPS.length, 6, 'กลุ่มภารกิจ 6 กลุ่มตามแผน')
  // รวมสองเครื่อง: รายการไม่ซ้ำ สถิติไม่นับซ้ำ
  const m1 = activity.mergeActivity(p, p)
  eq(m1.actLog.length, 3, 'รวมกับตัวเองไม่ซ้ำ')
  eq(m1.acts['L3-practice'].plays, 2, 'สถิติไม่นับซ้ำ')
  const other = activity.logActivity(progress.newPlayer('มะลิ', 'hero', 1), { act: 'duel', group: 'team', label: 'ดวล', correct: 7, total: 10, wrong: 1, timeMs: 1, points: 0 }, 500)
  const m2 = activity.mergeActivity(p, other)
  eq(m2.actLog.length, 4, 'รวมรายการจากสองเครื่อง')
  assert(m2.acts.duel && m2.acts['L3-practice'], 'สถิติจากทั้งสองเครื่อง')
  // สะท้อนผล
  eq(activity.repairReflection({ feeling: 'great', good: 'ทอนเงินเร็ว', at: 5 }).good, 'ทอนเงินเร็ว', 'อ่านบันทึกสะท้อนผล')
  eq(activity.repairReflection({ feeling: 'xx' }), undefined, 'ความรู้สึกผิดรูปไม่รับ')
  const saved = progress.parseSave(JSON.stringify({ version: 1, players: { [p.id]: { ...p, reflection: { feeling: 'good', good: 'ก', at: 9 } } } }))
  eq(saved.players[p.id].acts['L3-practice'].plays, 2, 'บันทึกภารกิจอ่านกลับได้')
  eq(saved.players[p.id].reflection.feeling, 'good', 'บันทึกสะท้อนผลอ่านกลับได้')
  // CSV บันทึกภารกิจ
  const csv = report.buildLogCsv([p]).slice(1).split('\r\n')
  eq(csv.length, 4, 'หัวตาราง + 3 แถว')
  assert(csv[0].startsWith('เลขที่,ชื่อ - สกุล,กลุ่ม,วันเวลา,กิจกรรม'), `หัว CSV: ${csv[0]}`)
  assert(csv[3].includes('ร้านทอนไว') && csv[3].includes('จ่ายเงินและทอนเงิน') && csv[3].includes(',8,10,80,2,90,12,'), `แถวร้านทอนไว: ${csv[3]}`)
})

test('กลุ่มทำกิจกรรม: จัดกลุ่มคละความสามารถแบบงูเลื้อย กลุ่มขนาดใกล้กัน คะแนนเฉลี่ยใกล้กัน และนำเข้ารายชื่อซ้ำกลุ่มไม่หาย', () => {
  const mk = (i, pre) => {
    const p = { ...progress.newPlayer(`น${i}`, 'hero', i), id: `p${i}`, student: { no: i, code: String(1000 + i), prefix: '', first: `น${i}`, last: '', room: 'ป.3/1' } }
    if (pre !== null) p.preTest = { score: pre, total: 20, timeMs: 1, at: 1, skills: progress.emptyTestSkills() }
    return p
  }
  const pres = [20, 18, 17, 16, 15, 14, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1]
  const kids = pres.map((v, i) => mk(i + 1, v))
  const map = teams.autoTeams(kids, 4)
  const labels = Array.from(new Set(Object.values(map))).sort()
  eq(labels.join(), '1,2,3,4,5', '18 คน กลุ่มละไม่เกิน 4 → 5 กลุ่ม')
  const sizes = labels.map((t) => Object.values(map).filter((x) => x === t).length)
  assert(Math.max(...sizes) - Math.min(...sizes) <= 1 && Math.max(...sizes) <= 4, `ขนาดกลุ่มใกล้กัน: ${sizes}`)
  // งูเลื้อย: คนเก่งที่สุด 5 คนอยู่คนละกลุ่ม
  eq(new Set(kids.slice(0, 5).map((k) => map[k.id])).size, 5, 'คนเก่งที่สุดกระจายทุกกลุ่ม')
  eq(map.p1, '1', 'อันดับ 1 อยู่กลุ่ม 1')
  eq(map.p10, '1', 'อันดับ 10 กลับมากลุ่ม 1 (งูเลื้อย)')
  const avg = labels.map((t) => {
    const ms = kids.filter((k) => map[k.id] === t)
    return ms.reduce((s, k) => s + teams.abilityScore(k), 0) / ms.length
  })
  assert(Math.max(...avg) - Math.min(...avg) < 0.2, `คะแนนเฉลี่ยแต่ละกลุ่มใกล้กัน: ${avg.map((a) => a.toFixed(2))}`)
  // ใส่กลุ่มลงทะเบียน แล้วแสดงรายกลุ่ม
  const players = {}
  for (const k of kids) players[k.id] = k
  const withTeams = teams.applyTeams(players, map)
  const list = teams.teamList(Object.values(withTeams))
  eq(list.length, 5, 'แสดง 5 กลุ่ม')
  eq(list[0].team, '1', 'เรียงตามเลขกลุ่ม')
  assert(list[0].members[0].student.no < list[0].members[1].student.no, 'สมาชิกเรียงตามเลขที่')
  // นำเข้ารายชื่อชุดเดิมซ้ำ (ไม่มีคอลัมน์กลุ่ม): กลุ่มเดิมยังอยู่
  const rows = roster.readRoster('เลขที่,เลขประจำตัว,ชื่อ\n1,1001,น1', 'ป.3/1').rows
  const reimport = roster.applyRoster(withTeams, rows)
  eq(reimport.players.p1.student.team, '1', 'กลุ่มเดิมไม่หายเมื่อนำเข้าซ้ำ')
  // นำเข้าพร้อมคอลัมน์กลุ่ม
  const withCol = roster.readRoster('เลขที่,ชื่อ,กลุ่ม\n3,ข้าว,2', 'ป.3/1')
  eq(withCol.rows[0].team, '2', 'อ่านคอลัมน์กลุ่มจากไฟล์')
  // ล้างกลุ่ม
  const cleared = teams.applyTeams(withTeams, { p1: '' })
  eq(cleared.p1.student.team, undefined, 'เอาออกจากกลุ่ม')
  eq(teams.teamOf(cleared.p2), map.p2, 'คนอื่นไม่เปลี่ยน')
  // ไม่มีคะแนนก่อนเรียน: ใช้ผลในเกม ถ้าไม่มีอีกถือว่ากลาง ๆ
  eq(teams.abilityScore(mk(99, null)), 0.5, 'ยังไม่มีข้อมูล = กลาง ๆ')
})

test('โหมดทบทวนในห้องเรียน: ครูเปิดทุกด่านได้ ค่าเริ่มต้นยังเล่นตามลำดับเหมือนเดิม', () => {
  const p = progress.newPlayer('ก', 'hero', 1)
  eq(progress.isLevelUnlocked(p, 5), false, 'ปกติด่าน 5 ยังล็อก')
  eq(progress.isLevelUnlocked(p, 5, true), true, 'โหมดทบทวนเปิดด่าน 5')
  eq(progress.isLevelUnlocked(p, 0), true, 'ด่าน 0 เปิดเสมอ')
  eq(classroom.repairClassroom({}).classMode, false, 'ค่าเริ่มต้นปิด')
  eq(classroom.repairClassroom({ classMode: true }).classMode, true, 'อ่านค่าที่ครูตั้ง')
  eq(classroom.repairStudent({ first: 'ก', team: '3' }).team, '3', 'อ่านกลุ่มของนักเรียน')
  eq(classroom.repairStudent({ first: 'ก' }).team, undefined, 'ไม่มีกลุ่ม')
  // ภารกิจกลุ่ม: โจทย์ครบตามจำนวน และมีคำตอบทุกข้อ
  for (const n of [9, 12, 15]) {
    const qs = gens.buildTeam(n)
    eq(qs.length, n, `ภารกิจกลุ่ม ${n} ข้อ`)
    for (const q of qs) assert(q.title && q.skill, `โจทย์ภารกิจกลุ่มสมบูรณ์ (${q.gen})`)
  }
})

/* ------------------------------------------------------------------ */
/* ระยะ 4: วิเคราะห์ผลการเรียนรู้ (สถิติสำหรับ ว.PA)                       */
/* ------------------------------------------------------------------ */

test('สถิติ: ค่าเฉลี่ย S.D. ค่า p ของ t ตรงกับตาราง และ t-test แบบไม่อิสระคำนวณถูก', () => {
  const d = stats.describe([2, 4, 4, 4, 5, 5, 7, 9])
  eq(d.mean, 5, 'ค่าเฉลี่ย')
  assert(Math.abs(d.sd - 2.13809) < 1e-4, `S.D. หาร n−1: ${d.sd}`)
  eq(stats.describe([]).mean, null, 'ไม่มีข้อมูล')
  eq(stats.describe([3]).sd, null, 'คนเดียวไม่มี S.D.')
  // ค่าวิกฤตจากตาราง t: P(T > t) = .05 และ .01
  for (const [t, df, p] of [[1.833, 9, 0.05], [2.821, 9, 0.01], [1.729, 19, 0.05], [2.539, 19, 0.01], [1.697, 30, 0.05], [2.0, 10, 0.03669]]) {
    assert(Math.abs(stats.tUpper(t, df) - p) < 5e-4, `P(T>${t}, df ${df}) = ${stats.tUpper(t, df)} ควรเป็น ${p}`)
  }
  assert(Math.abs(stats.tUpper(-1, 5) - 0.8184) < 1e-3, 'ค่า t ติดลบ')
  const pre = [10, 12, 9, 14, 11, 8, 13, 10]
  const post = [14, 15, 12, 17, 13, 12, 16, 15]
  const r = stats.pairedT(pre, post)
  eq(r.n, 8, 'n')
  eq(r.df, 7, 'df')
  eq(r.meanDiff, 3.375, 'ผลต่างเฉลี่ย')
  assert(Math.abs(r.t - 10.42) < 0.01, `t ≈ 10.42: ${r.t}`)
  assert(r.sig01 && r.sig05, 'มีนัยสำคัญ .01')
  eq(stats.tSummary(r), 'คะแนนหลังเรียนสูงกว่าก่อนเรียนอย่างมีนัยสำคัญทางสถิติที่ระดับ .01', 'สรุปผล')
  // ไม่เปลี่ยนเลย: ไม่มีนัยสำคัญ
  const same = stats.pairedT([5, 6, 7], [5, 6, 7])
  eq(same.t, 0, 't = 0')
  eq(same.sig05, false, 'ไม่มีนัยสำคัญ')
  // ทุกคนเพิ่มเท่ากัน: S.D. = 0 ไม่หารศูนย์
  const flat = stats.pairedT([5, 6, 7], [7, 8, 9])
  eq(flat.sig01, true, 'เพิ่มเท่ากันทุกคน ถือว่าต่างชัดเจน')
  eq(stats.pairedT([5], [9]).p, null, 'คนเดียวทดสอบไม่ได้')
  // ร้อยละจากคะแนนดิบมีเศษทศนิยม (8/20*100 = 40.00000000000001) ทุกคนเพิ่ม 6 คะแนนเท่ากันต้องไม่ได้ค่า t มหาศาล
  const noisy = stats.pairedT([8, 9, 10, 11].map((x) => (x / 20) * 100), [14, 15, 16, 17].map((x) => (x / 20) * 100))
  eq(noisy.t, Infinity, 'เพิ่มเท่ากันทุกคน ถือว่า S.D. = 0')
  eq(stats.tText(noisy.t), 'สูงมาก (ทุกคนเพิ่มเท่ากัน)', 'แสดงผลเป็นข้อความ')
  // E.I. (คิดจากร้อยละ = คิดจากคะแนนดิบเมื่อคะแนนเต็มเท่ากัน)
  const ei = stats.effectivenessIndex(pre.map((x) => x * 5), post.map((x) => x * 5))
  assert(Math.abs(ei - 135 / 365) < 1e-9, `E.I. = (570−435)/(800−435): ${ei}`)
  eq(stats.effectivenessIndex([100], [100]), null, 'เต็มตั้งแต่ก่อนเรียน คิด E.I. ไม่ได้')
  eq(stats.pText(0.0004), '< .001', 'ค่า p น้อยมาก')
  eq(stats.pText(0.0321), '.032', 'ค่า p สามตำแหน่ง')
  eq(stats.scoreLevel(80).name, 'ดีเยี่ยม', 'ระดับ 80')
  eq(stats.scoreLevel(79.9).name, 'ดี', 'ระดับ 79.9')
  eq(stats.scoreLevel(59).name, 'ควรปรับปรุง', 'ระดับ 59')
})

test('วิเคราะห์ทั้งห้อง: การเข้าร่วม ผ่านเกณฑ์ ระดับคุณภาพ รายทักษะ รายกลุ่มภารกิจ E1/E2 และรายชื่อซ่อมเสริม', () => {
  const skillsOf = (c, t) => {
    const s = progress.emptyTestSkills()
    s.addsub = { correct: c, total: t }
    return s
  }
  const test = (score) => ({ score, total: 20, timeMs: 1, at: 1, skills: skillsOf(Math.min(score, 5), 5) })
  const mk = (no, pre, post, acts) => {
    let p = { ...progress.newPlayer(`น${no}`, 'hero', no), id: `p${no}`, student: { no, code: String(no), prefix: '', first: `น${no}`, last: '', room: 'ป.3/1' } }
    if (pre !== null) p.preTest = test(pre)
    if (post !== null) p.postTest = test(post)
    for (const a of acts ?? []) p = activity.logActivity(p, { act: a.act, group: a.group, label: a.act, correct: a.c, total: a.t, wrong: a.t - a.c, timeMs: 1000, points: 0 }, no)
    return p
  }
  const kids = [
    mk(1, 10, 18, [{ act: 'L1-practice', group: 'read', c: 9, t: 10 }]),
    mk(2, 8, 16, [{ act: 'change-practice', group: 'change', c: 8, t: 10 }]),
    mk(3, 12, 13, [{ act: 'change-practice', group: 'change', c: 4, t: 10 }]),
    mk(4, 6, null, [{ act: 'L1-practice', group: 'read', c: 6, t: 10 }]),
    mk(5, null, null, [{ act: 'plan-1', group: 'budget', c: 3, t: 10 }]),
    mk(6, null, null, null),
  ]
  const a = stats.analyzeClass(kids, { passPercent: 70, targetPercent: 80 })
  eq(a.total, 6, 'ทั้งห้อง')
  eq(a.preDone, 4, 'ทำก่อนเรียน')
  eq(a.postDone, 3, 'ทำหลังเรียน')
  eq(a.bothDone, 3, 'ทำครบ')
  eq(a.pre.full, 20, 'คะแนนเต็มร่วม')
  eq(a.pre.rawMean, 9, 'ก่อนเรียนเฉลี่ย 9 คะแนน (10+8+12+6)/4')
  eq(a.pre.mean, 45, 'ก่อนเรียนเฉลี่ย 45%')
  eq(a.pairedPre.mean, 50, 'เฉพาะคนที่ทำครบ ก่อนเรียน 50%')
  eq(a.pairedPost.mean, 78.33333333333333, 'หลังเรียน (90+80+65)/3')
  eq(a.passed, 2, 'ผ่าน 70%: 18/20 และ 16/20 (13/20 = 65% ไม่ผ่าน)')
  eq(Math.round(a.passRate * 100) / 100, 33.33, 'ร้อยละผ่านเทียบทั้งห้อง')
  eq(a.targetMet, false, 'ยังไม่ถึงเป้าหมาย 80%')
  eq(a.improvedCount, 3, 'ทุกคนคะแนนสูงขึ้น')
  assert(Math.abs(a.ei - (235 - 150) / (300 - 150)) < 1e-9, `E.I. ทั้งห้อง: ${a.ei}`)
  eq(a.levels.excellent.post, 2, 'หลังเรียนดีเยี่ยม 2 คน')
  eq(a.levels.fair.post, 1, 'หลังเรียนพอใช้ 1 คน')
  eq(a.levels.improve.pre, 3, 'ก่อนเรียนควรปรับปรุง 3 คน')
  eq(a.levels.fair.pre, 1, 'ก่อนเรียน 12/20 = 60% พอใช้')
  eq(a.skills.addsub.post, 100, 'ทักษะบวกลบหลังเรียน')
  eq(a.skills.notes.pre, null, 'ทักษะที่ไม่มีข้อสอบ = ไม่มีข้อมูล')
  eq(a.groups.read.players, 2, 'กลุ่มอ่านเงิน 2 คน')
  eq(a.groups.read.percent, 75, 'กลุ่มอ่านเงิน 15/20')
  eq(a.groups.change.below, 1, 'กลุ่มทอนเงินต่ำกว่าเกณฑ์ 1 คน')
  eq(a.groups.team.percent, null, 'ภารกิจร่วมมือยังไม่มีข้อมูล')
  eq(a.e1.n, 5, 'E1 คิดจาก 5 คนที่ทำภารกิจ')
  eq(a.e1.mean, 60, 'E1 = (90+80+40+60+30)/5')
  eq(a.e2, 78.33333333333333, 'E2 = หลังเรียนเฉลี่ย')
  // ซ่อมเสริม: น3 หลังเรียนไม่ผ่าน, น4 ก่อนเรียนไม่ผ่าน (ยังไม่สอบหลัง), น5 ภารกิจต่ำ, น6 ไม่มีข้อมูล ไม่ใส่
  eq(a.remedial.map((r) => `${r.player.id}:${r.reason}`).join(), 'p4:pre-below,p5:process-below,p3:post-below', 'รายชื่อซ่อมเสริมเรียงจากคะแนนต่ำสุด')
  eq(a.remedial.find((r) => r.player.id === 'p5').weakGroups.join(), 'budget', 'บอกกลุ่มภารกิจที่ควรฝึก')
  eq(a.missingPost.map((p) => p.id).join(), 'p4,p5,p6', 'ยังไม่ทำหลังเรียน')
  // ห้องว่าง
  const empty = stats.analyzeClass([], { passPercent: 70, targetPercent: 80 })
  eq(empty.passRate, null, 'ห้องว่างไม่หารศูนย์')
  eq(empty.t.p, null, 'ห้องว่างไม่มี t')
})


/* ------------------------------------------------------------------ */
/* ระยะ 5: บันทึกพฤติกรรม รายงานสรุป PDCA                                */
/* ------------------------------------------------------------------ */

test('บันทึกพฤติกรรม: ให้คะแนนรายด้าน รวม 16 แปลระดับ บันทึกกลับได้ รวมสองเครื่อง และสรุปทั้งห้อง', () => {
  let p = progress.newPlayer('มะลิ', 'hero', 1)
  eq(behavior.behaviorTotal(p.behavior), null, 'ยังไม่ประเมิน')
  p = behavior.setBehaviorScore(p, 0, 4, 10)
  p = behavior.setBehaviorScore(p, 1, 3, 11)
  eq(behavior.behaviorTotal(p.behavior), null, 'ประเมินไม่ครบ 4 ด้าน ยังไม่รวม')
  p = behavior.setBehaviorScore(p, 2, 4, 12)
  p = behavior.setBehaviorScore(p, 3, 3, 13)
  eq(behavior.behaviorTotal(p.behavior), 14, 'รวม 14')
  eq(behavior.behaviorLevel(14), 'ดีเยี่ยม', '14 ดีเยี่ยม')
  eq(behavior.behaviorLevel(13), 'ดี', '13 ดี')
  eq(behavior.behaviorLevel(8), 'พอใช้', '8 พอใช้')
  eq(behavior.behaviorLevel(7), 'ควรปรับปรุง', '7 ควรปรับปรุง')
  eq(p.behavior.at, 13, 'เวลาบันทึกล่าสุด')
  eq(behavior.setBehaviorScore(p, 9, 4).behavior.scores.join(), '4,3,4,3', 'ด้านที่ไม่มีไม่เปลี่ยนอะไร')
  eq(behavior.setBehaviorScore(p, 0, 7).behavior.scores[0], 0, 'คะแนนนอกช่วงถือว่าล้าง')
  // ล้างทุกด้าน = ลบบันทึก
  let q = behavior.setBehaviorScore(progress.newPlayer('ก', 'hero', 1), 0, 2)
  q = behavior.setBehaviorScore(q, 0, 0)
  eq(q.behavior, undefined, 'ล้างครบลบบันทึก')
  // บันทึกเพิ่มเติมอย่างเดียวก็เก็บไว้
  const n = behavior.setBehaviorNote(progress.newPlayer('ข', 'hero', 1), 'ช่วยเพื่อนนับเงิน', 5)
  const back = progress.parseSave(JSON.stringify({ version: 1, players: { a: { ...p, id: 'a' }, b: { ...n, id: 'b' } } }))
  eq(back.players.a.behavior.scores.join(), '4,3,4,3', 'อ่านคะแนนกลับได้')
  eq(back.players.b.behavior.note, 'ช่วยเพื่อนนับเงิน', 'บันทึกเพิ่มเติมอย่างเดียวไม่หาย')
  eq(behavior.repairBehavior({ scores: [9, 'x', -1, 2.5] }), undefined, 'ข้อมูลผิดรูปทั้งหมดไม่รับ')
  eq(behavior.repairBehavior({ scores: [2, 9] }).scores.join(), '2,0,0,0', 'รับเฉพาะค่าที่ถูกต้อง')
  // รวมสองเครื่อง: บันทึกที่ใหม่กว่าชนะ
  const older = { at: 1, scores: [1, 1, 1, 1] }
  const newer = { at: 2, scores: [4, 4, 4, 4] }
  eq(behavior.mergeBehavior(older, newer), newer, 'ใหม่กว่าชนะ')
  eq(behavior.mergeBehavior(newer, older), newer, 'ลำดับไม่มีผล')
  eq(behavior.mergeBehavior(undefined, older), older, 'มีฝั่งเดียว')
  const merged = backup.mergeSaves(back, progress.parseSave(JSON.stringify({ version: 1, players: { a: { ...p, id: 'a', behavior: { at: 99, scores: [2, 2, 2, 2] } } } })))
  eq(merged.save.players.a.behavior.scores.join(), '2,2,2,2', 'รวมไฟล์สำรองใช้บันทึกล่าสุด')
  // สรุปทั้งห้อง
  const r = (sc) => ({ ...progress.newPlayer('x', 'hero', 1), behavior: { at: 1, scores: sc } })
  const s = behavior.behaviorSummary([r([4, 4, 4, 4]), r([3, 3, 3, 3]), r([2, 2, 2, 1]), r([1, 1, 1, 1]), progress.newPlayer('ไม่ประเมิน', 'hero', 1), r([4, 0, 0, 0])])
  eq(s.assessed, 4, 'นับเฉพาะคนที่ประเมินครบ')
  eq(s.mean, (16 + 12 + 7 + 4) / 4, 'ค่าเฉลี่ยรวม')
  eq(s.levels['ดีเยี่ยม'], 1, 'ดีเยี่ยม 1')
  eq(s.levels['ดี'], 1, 'ดี 1')
  eq(s.levels['ควรปรับปรุง'], 2, 'ควรปรับปรุง 2')
  eq(s.goodUp, 50, 'ระดับดีขึ้นไปร้อยละ 50')
  eq(s.criteria[3], (4 + 3 + 1 + 1) / 4, 'ค่าเฉลี่ยด้านที่ 4')
  eq(behavior.behaviorSummary([]).mean, null, 'ห้องว่าง')
})

test('บันทึก PDCA ของครู: ค่าเริ่มต้นว่าง อ่านกลับได้ ตัดความยาว และข้อมูลเก่าที่ไม่มีช่องนี้ยังเปิดได้', () => {
  const d = classroom.repairClassroom({})
  eq(JSON.stringify(d.pdca), JSON.stringify({ plan: '', do: '', check: '', act: '' }), 'ค่าเริ่มต้น')
  const c = classroom.repairClassroom({ pdca: { plan: 'วิเคราะห์ปัญหา\nบรรทัดสอง', do: 5, act: 'x'.repeat(2000) } })
  eq(c.pdca.plan, 'วิเคราะห์ปัญหา\nบรรทัดสอง', 'เก็บขึ้นบรรทัดใหม่')
  eq(c.pdca.do, '', 'ค่าที่ไม่ใช่ข้อความเป็นว่าง')
  eq(c.pdca.act.length, 1500, 'ตัดที่ 1500 ตัวอักษร')
  const saved = progress.parseSave(JSON.stringify({ version: 1, players: {}, classroom: { teacher: 'ครูใจดี', pdca: { check: 'ผลดีขึ้น' } } }))
  eq(saved.classroom.pdca.check, 'ผลดีขึ้น', 'อ่านจากไฟล์บันทึก')
  eq(saved.classroom.teacher, 'ครูใจดี', 'ค่าอื่นไม่หาย')
})

/* ------------------------------------------------------------------ */
/* ระยะ 6: ใบงานซ่อมเสริม เกียรติบัตร                                     */
/* ------------------------------------------------------------------ */

const AMT = String.raw`(?:[\d,]+\.\d\d บาท|[\d,]+ บาท \d+ สตางค์|[\d,]+ บาท|\d+ สตางค์)`
function amt(s) {
  const n = (x) => Number(x.replace(/,/g, ''))
  let m = s.match(/^([\d,]+)\.(\d\d) บาท$/)
  if (m) return n(m[1]) * 100 + Number(m[2])
  m = s.match(/^([\d,]+) บาท (\d+) สตางค์$/)
  if (m) return n(m[1]) * 100 + Number(m[2])
  m = s.match(/^([\d,]+) บาท$/)
  if (m) return n(m[1]) * 100
  m = s.match(/^(\d+) สตางค์$/)
  if (m) return Number(m[1])
  throw new Error(`อ่านจำนวนเงินไม่ได้: ${s}`)
}
const dotNum = (s) => Math.round(Number(s.replace(/,/g, '')) * 100)

test('ใบงานซ่อมเสริม: เฉลยทุกข้อตรงกับโจทย์ (คำนวณย้อนจากข้อความโจทย์) 9 ทักษะ 2 ระดับ หลายชุด', () => {
  const denoms = load('data/denominations.js')
  let checked = 0
  for (const level of [1, 2]) {
    for (let seed = 1; seed <= 40; seed += 1) {
      const items = worksheet.buildWorksheet({ skills: [...SKILLS], perSkill: 4, level, seed })
      eq(items.length, SKILLS.length * 4, `ครบทุกทักษะ ทักษะละ 4 ข้อ (ระดับ ${level} ชุด ${seed})`)
      for (const it of items) {
        const where = `[${it.skill} ระดับ ${level} ชุด ${seed}] ${it.text} → ${it.answer}`
        assert(it.answer && !/NaN|undefined|null|-\d/.test(it.answer + it.text), `ข้อความเสีย ${where}`)
        assert(it.text.includes('............') || it.skill === 'compare', `มีช่องให้เติม ${where}`)
        let expect
        if (it.skill === 'notes') expect = denoms.denom(it.money[0]).value
        else if (it.skill === 'count') expect = denoms.sumDenoms(it.money)
        else if (it.skill === 'dot') expect = amt(it.text.match(new RegExp(`^(${AMT})`))[1])
        else if (it.skill === 'compare') {
          const m = it.text.match(new RegExp(`(${AMT})\\s+\\(\\s+\\)\\s+(${AMT})$`))
          const d = amt(m[1]) - amt(m[2])
          eq(it.answer, d > 0 ? '>' : d < 0 ? '<' : '=', `เครื่องหมายถูก ${where}`)
          expect = d
        } else if (it.skill === 'exchange') {
          let m = it.text.match(/^(.+) 1 (?:เหรียญ|ใบ) แลกเป็น(.+)ได้/)
          if (m) {
            const v = (name) => denoms.DENOMINATIONS.find((x) => x.name === name).value
            expect = v(m[1]) / v(m[2])
          } else if ((m = it.text.match(/^เงิน (\d+) บาท แลกเป็นเหรียญ (\d+) สตางค์/))) expect = (Number(m[1]) * 100) / Number(m[2])
          else {
            m = it.text.match(/^(.+) (\d+) เหรียญ รวมเป็นเงิน/)
            expect = denoms.DENOMINATIONS.find((x) => x.name === m[1]).value * Number(m[2])
          }
          assert(Number.isInteger(expect), `แลกได้พอดี ${where}`)
        } else if (it.skill === 'addsub') {
          const m = it.text.match(/^([\d,]+\.\d\d) ([+−]) ([\d,]+\.\d\d) =/)
          expect = m[2] === '+' ? dotNum(m[1]) + dotNum(m[3]) : dotNum(m[1]) - dotNum(m[3])
          eq(amt(it.answer), expect, `เฉลยบวกลบ ${where}`)
        } else if (it.skill === 'muldiv') {
          let m = it.text.match(new RegExp(`ละ (${AMT}) ซื้อ (\\d+) `))
          if (m) expect = amt(m[1]) * Number(m[2])
          else {
            m = it.text.match(new RegExp(`^แบ่งเงิน (${AMT}) ให้เพื่อน (\\d+) คน`))
            expect = amt(m[1]) / Number(m[2])
            assert(Number.isInteger(expect / 100), `แบ่งได้ลงตัวเป็นบาท ${where}`)
          }
          eq(amt(it.answer), expect, `เฉลยคูณหาร ${where}`)
        } else if (it.skill === 'word') {
          let m = it.text.match(new RegExp(`มีเงิน (${AMT}) ซื้อ.+ราคา (${AMT}) และ.+ราคา (${AMT}) `))
          if (m) expect = amt(m[1]) - amt(m[2]) - amt(m[3])
          else {
            m = it.text.match(new RegExp(`วันละ (${AMT}) เป็นเวลา (\\d+) วัน .+ราคา (${AMT}) `))
            expect = amt(m[1]) * Number(m[2]) - amt(m[3])
          }
          assert(expect > 0, `ซื้อแล้วยังมีเงินเหลือ ${where}`)
          eq(amt(it.answer.replace(/ \(.*\)$/, '')), expect, `เฉลยโจทย์ปัญหา ${where}`)
        } else if (it.skill === 'ledger') {
          let bal = amt(it.text.match(new RegExp(`ยกมา (${AMT})`))[1])
          for (const [, , inc, out] of it.table.rows) {
            bal += inc ? dotNum(inc) : -dotNum(out)
            assert(bal > 0, `เงินในบัญชีไม่ติดลบระหว่างทาง ${where}`)
          }
          eq(it.table.rows.length, level === 1 ? 3 : 4, `จำนวนรายการในบัญชี ${where}`)
          expect = bal
          eq(amt(it.answer), expect, `เฉลยบัญชี ${where}`)
        }
        eq(it.value, expect, `ค่าเฉลยตรงกับโจทย์ ${where}`)
        if (!['exchange', 'compare'].includes(it.skill) || /รวมเป็นเงิน/.test(it.text)) assert(worksheet.validAmount(it.value), `จำนวนเงินใช้ได้จริง ${where}`)
        checked += 1
      }
      // ข้อในทักษะเดียวกันไม่ซ้ำ
      for (const s of SKILLS) {
        const keys = items.filter((i) => i.skill === s).map((i) => JSON.stringify([i.text, i.money ?? [], i.table ?? null]))
        eq(new Set(keys).size, keys.length, `โจทย์ทักษะ ${s} ไม่ซ้ำกัน (ชุด ${seed})`)
      }
    }
  }
  assert(checked === 2 * 40 * SKILLS.length * 4, `ตรวจครบ ${checked} ข้อ`)
  // ชุดเดิมพิมพ์ซ้ำได้โจทย์เดิม ชุดใหม่ได้โจทย์ใหม่
  const o = { skills: ['dot', 'word'], perSkill: 5, level: 1, seed: 3 }
  eq(JSON.stringify(worksheet.buildWorksheet(o)), JSON.stringify(worksheet.buildWorksheet(o)), 'ชุดเดิมได้โจทย์เดิม')
  assert(JSON.stringify(worksheet.buildWorksheet(o)) !== JSON.stringify(worksheet.buildWorksheet({ ...o, seed: 4 })), 'ชุดใหม่ได้โจทย์ใหม่')
  eq(worksheet.buildWorksheet({ ...o, skills: [] }).length, 0, 'ไม่เลือกทักษะ ไม่มีโจทย์')
  // ไม่รบกวนตัวสุ่มของเกม
  random.seedRandom(5)
  const a = random.rand()
  random.seedRandom(5)
  worksheet.buildWorksheet(o)
  eq(random.rand(), a, 'ตัวสุ่มของเกมไม่เปลี่ยน')
  random.useMathRandom()
})

test('ใบงานรายบุคคล: เลือกทักษะที่ยังอ่อน คนละชุดโจทย์ และเกียรติบัตรเลือกผู้รับถูกต้อง', () => {
  const p = progress.newPlayer('มะลิ', 'hero', 1)
  eq(worksheet.remedialSkills(p, 70).length, 0, 'ยังไม่มีข้อมูล ไม่ต้องซ่อม')
  p.skills.dot = { attempts: 6, correct: 2, firstTry: 2 }
  const t = { score: 10, total: 20, timeMs: 1, at: 1, skills: progress.emptyTestSkills() }
  t.skills.word = { correct: 1, total: 4 }
  t.skills.addsub = { correct: 3, total: 3 }
  p.postTest = t
  eq(worksheet.remedialSkills(p, 70).join(), 'dot,word', 'ทักษะที่อ่อนในเกม + ต่ำกว่าเกณฑ์ในแบบทดสอบ')
  assert(worksheet.studentSeed(1, 'st-a') !== worksheet.studentSeed(1, 'st-b'), 'คนละคนได้ชุดต่างกัน')
  eq(worksheet.studentSeed(1, 'st-a'), worksheet.studentSeed(1, 'st-a'), 'คนเดิมได้ชุดเดิม')
})

/* ------------------------------------------------------------------ */
/* ไฟล์ Excel (.xlsx) แยกชีต                                             */
/* ------------------------------------------------------------------ */

/** แตกไฟล์ zip แบบไม่บีบอัด (อ่านจาก central directory) */
function unzipStored(bytes) {
  const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  let end = bytes.length - 22
  while (end >= 0 && v.getUint32(end, true) !== 0x06054b50) end -= 1
  const count = v.getUint16(end + 10, true)
  let at = v.getUint32(end + 16, true)
  const out = {}
  for (let i = 0; i < count; i += 1) {
    assert(v.getUint32(at, true) === 0x02014b50, 'central directory ถูกต้อง')
    const method = v.getUint16(at + 10, true)
    const crc = v.getUint32(at + 16, true)
    const size = v.getUint32(at + 20, true)
    const nameLen = v.getUint16(at + 28, true)
    const local = v.getUint32(at + 42, true)
    const name = new TextDecoder().decode(bytes.subarray(at + 46, at + 46 + nameLen))
    assert(v.getUint32(local, true) === 0x04034b50, `local header ของ ${name}`)
    const lNameLen = v.getUint16(local + 26, true)
    const data = bytes.subarray(local + 30 + lNameLen, local + 30 + lNameLen + size)
    eq(method, 0, `${name} ไม่บีบอัด`)
    eq(xlsx.crc32(data), crc, `CRC ของ ${name}`)
    out[name] = new TextDecoder().decode(data)
    at += 46 + nameLen
  }
  return out
}

test('ไฟล์ Excel: zip ถูกโครงสร้าง CRC ถูก ชื่อคอลัมน์ ชื่อชีต และอักขระพิเศษปลอดภัย', () => {
  eq(xlsx.crc32(new TextEncoder().encode('123456789')), 0xcbf43926, 'CRC-32 มาตรฐาน')
  eq([0, 25, 26, 51, 52, 701, 702].map(xlsx.colName).join(), 'A,Z,AA,AZ,BA,ZZ,AAA', 'ชื่อคอลัมน์')
  const used = new Set()
  eq(xlsx.sheetName('ก่อน/หลัง [เรียน]?', used), 'ก่อน หลัง  เรียน', 'ตัดอักขระที่ Excel ไม่รับ')
  eq(xlsx.sheetName('ก่อน/หลัง [เรียน]?', used), 'ก่อน หลัง  เรียน (2)', 'ชื่อซ้ำเติมเลข')
  assert(xlsx.sheetName('ก'.repeat(40), used).length <= 31, 'ยาวไม่เกิน 31 ตัว')
  const bytes = xlsx.buildXlsx([
    { name: 'ทดสอบ', rows: [['ชื่อ', 'คะแนน'], ['A & "B" <C>', 12.5], ['ว่าง', null], ['ศูนย์', 0]], widths: [20, 8] },
    { name: 'ทดสอบ', rows: [['x']], headerRows: 0, landscape: true },
  ])
  const files = unzipStored(bytes)
  eq(Object.keys(files).sort().join(), ['[Content_Types].xml', '_rels/.rels', 'xl/_rels/workbook.xml.rels', 'xl/styles.xml', 'xl/workbook.xml', 'xl/worksheets/sheet1.xml', 'xl/worksheets/sheet2.xml'].sort().join(), 'ไฟล์ในแพ็กเกจครบ')
  const s1 = files['xl/worksheets/sheet1.xml']
  assert(s1.includes('<t xml:space="preserve">A &amp; &quot;B&quot; &lt;C&gt;</t>'), 'อักขระพิเศษถูก escape')
  assert(s1.includes('<c r="B2"><v>12.5</v></c>'), 'ตัวเลขเป็นตัวเลขจริง')
  assert(s1.includes('<c r="B4"><v>0</v></c>'), 'ศูนย์ไม่หาย')
  assert(!s1.includes('r="B3"'), 'ช่องว่างไม่เขียน')
  assert(s1.includes('state="frozen"') && s1.includes('ySplit="1"'), 'ตรึงหัวตาราง')
  assert(s1.includes('paperSize="9"') && s1.includes('orientation="portrait"'), 'ตั้งกระดาษ A4')
  assert(s1.includes('<c r="A1" t="inlineStr" s="1">'), 'หัวตารางใช้รูปแบบตัวหนา')
  assert(files['xl/worksheets/sheet2.xml'].includes('orientation="landscape"'), 'แนวนอน')
  assert(!files['xl/worksheets/sheet2.xml'].includes('<pane'), 'ไม่มีหัวตารางไม่ตรึง')
  assert(files['xl/workbook.xml'].includes('name="ทดสอบ (2)"'), 'ชื่อชีตซ้ำได้เลขต่อท้าย')
  for (const [name, xml] of Object.entries(files)) assert(xml.startsWith('<?xml') && !/[\u0000-\u0008]/.test(xml), `${name} เป็น XML`)
})

test('ไฟล์ Excel ของห้อง: 8 ชีต ทุกชีตมีครบทุกคน และตัวเลขตรงกับหน้าวิเคราะห์ผล', () => {
  const mk = (no, pre, post) => {
    let p = { ...progress.newPlayer(`น${no}`, 'hero', no), id: `p${no}`, student: { no, code: `0${no}`, prefix: 'ด.ญ.', first: `น${no}`, last: 'ใจดี', room: 'ป.3/1' } }
    if (pre !== null) p.preTest = { score: pre, total: 20, timeMs: 1, at: 1, skills: progress.emptyTestSkills() }
    if (post !== null) p.postTest = { score: post, total: 20, timeMs: 1, at: 2, skills: progress.emptyTestSkills() }
    p = activity.logActivity(p, { act: 'daily', group: 'word', label: 'ภารกิจประจำวัน', correct: 4, total: 5, wrong: 1, timeMs: 1000, points: 3 }, 5)
    p = behavior.setBehaviorScore(p, 0, 4, 6)
    return p
  }
  const kids = [mk(1, 8, 16), mk(2, 10, 12), mk(3, 6, null)]
  const c = classroom.repairClassroom({ room: 'ป.3/1', passPercent: 70 })
  const sheets = workbook.classWorkbook(kids, c, 0)
  eq(sheets.map((s) => s.name).join(), 'สรุป,นักเรียน,ก่อน-หลังเรียน,รายทักษะ,กลุ่มภารกิจ,บันทึกภารกิจ,พฤติกรรม,สะท้อนผล', 'ชื่อชีต')
  for (const s of sheets.slice(1)) {
    const expect = s.name === 'บันทึกภารกิจ' ? 1 + 3 : 1 + kids.length
    eq(s.rows.length, expect, `ชีต ${s.name} มีครบทุกคน`)
    for (const r of s.rows.slice(1)) assert(r.length <= s.rows[0].length, `ชีต ${s.name} ไม่มีช่องเกินหัวตาราง`)
  }
  const a = stats.analyzeClass(kids, c)
  const sum = Object.fromEntries(sheets[0].rows.map((r) => [r[0], r[1]]))
  eq(sum['นักเรียนทั้งหมด (คน)'], 3, 'จำนวนนักเรียน')
  eq(sum['ก่อนเรียน: ค่าเฉลี่ย (ร้อยละ)'], Math.round(a.pre.mean * 100) / 100, 'ค่าเฉลี่ยก่อนเรียนตรงกับหน้าวิเคราะห์ผล')
  eq(sum['ผ่านเกณฑ์หลังเรียน (คน)'], a.passed, 'จำนวนผ่านเกณฑ์ตรงกัน')
  const test = sheets[2]
  eq(test.rows[1].join('|'), '1|ด.ญ.น1 ใจดี|8|20|40|16|20|80|40|ดีเยี่ยม|ผ่าน', 'แถวก่อน-หลังเรียน')
  eq(test.rows[3][10], 'รอสอบ', 'ยังไม่สอบหลังเรียน')
  eq(sheets[1].rows[1][1], '01', 'เลขประจำตัวเก็บเป็นข้อความ ไม่หายเลขศูนย์นำหน้า')
  eq(sheets[6].rows[1][3], 4, 'คะแนนพฤติกรรม')
  eq(workbook.workbookFileName(c, new Date(2026, 10, 14).getTime()), 'money-hero-ป.3-1-2026-11-14.xlsx', 'ชื่อไฟล์')
  // ไฟล์จริงแตกได้ และมี 8 ชีต
  const files = unzipStored(xlsx.buildXlsx(sheets))
  eq(Object.keys(files).filter((n) => n.startsWith('xl/worksheets/')).length, 8, 'ไฟล์มี 8 ชีต')
})

test('หนังสือเดินทาง: ได้ตราเมื่อทำครบ 5 ข้อและถึงเกณฑ์ ขั้น REAL ครบตามจริง', () => {
  let p = progress.newPlayer('มะลิ', 'hero', 1)
  let s = passport.passportSummary(p, 70)
  eq(s.earned, 0, 'ยังไม่มีตรา')
  eq(s.stamps.length, 6, 'ตราภารกิจ 6 กลุ่ม')
  eq(JSON.stringify(s.steps), JSON.stringify({ r: false, e: false, a: false, l: false }), 'ยังไม่ได้ทำขั้นใด')
  const log = (q, group, correct, total, at) => activity.logActivity(q, { act: `${group}-x${at}`, group, label: group, correct, total, wrong: total - correct, timeMs: 1, points: 0 }, at)
  p = log(p, 'read', 4, 4, 10)
  eq(passport.passportStamps(p, 70)[0].earned, false, 'ถูกหมดแต่ทำแค่ 4 ข้อ ยังไม่ได้ตรา')
  p = log(p, 'read', 3, 6, 20)
  const read = passport.passportStamps(p, 70)[0]
  eq(read.earned, true, '7/10 = 70% พอดีเกณฑ์ ได้ตรา')
  eq(read.at, 20, 'วันที่ล่าสุด')
  eq(read.total, 10, 'นับรวมทุกกิจกรรมในกลุ่ม')
  eq(passport.passportStamps(p, 71)[0].earned, false, 'เกณฑ์ 71% ไม่ได้ตรา')
  p = log(p, 'change', 2, 10, 30)
  eq(passport.passportStamps(p, 70).find((x) => x.group === 'change').earned, false, '20% ไม่ได้ตรา')
  for (const g of ['price', 'word']) p = log(p, g, 9, 10, 40)
  s = passport.passportSummary(p, 70)
  eq(s.earned, 3, 'ได้ 3 ตรา')
  eq(s.steps.e, true, 'ได้ครึ่งหนึ่งของ 6 กลุ่ม ถือว่าผ่านขั้น E')
  p.preTest = { score: 8, total: 20, timeMs: 1, at: 1, skills: progress.emptyTestSkills() }
  p.postTest = { score: 13, total: 20, timeMs: 1, at: 2, skills: progress.emptyTestSkills() }
  p.reflection = { at: 3, feeling: 'good', good: 'ก', improve: '', apply: '' }
  s = passport.passportSummary(p, 70)
  eq(JSON.stringify(s.steps), JSON.stringify({ r: true, e: true, a: true, l: true }), 'ครบทุกขั้น')
  eq(s.postPassed, false, '13/20 = 65% ไม่ผ่านเกณฑ์ 70')
  eq(passport.CLASS_STAMPS.length, 4, 'ตรากิจกรรมในห้องเรียน 4 ช่อง')
})

test('บิงโกเงินทอง: คำตอบไม่ซ้ำ เฉลยทุกโจทย์ถูก (คำนวณย้อนจากโจทย์) การ์ดถูกต้อง และตารางตรวจผู้ชนะตรงกับการเล่นจริง', () => {
  const denoms = load('data/denominations.js')
  const wordsValue = (s) => {
    let sum = 0
    const re = /((?:ธนบัตร|เหรียญ) [\d,]+ (?:บาท|สตางค์)) (\d+) (?:ใบ|เหรียญ)/g
    let m
    while ((m = re.exec(s))) sum += denoms.DENOMINATIONS.find((d) => d.name === m[1]).value * Number(m[2])
    return sum
  }
  for (let seed = 1; seed <= 30; seed += 1) {
    const set = bingo.buildBingo(seed)
    eq(set.calls.length, bingo.POOL, `ชุด ${seed} มี ${bingo.POOL} โจทย์`)
    eq(new Set(set.calls.map((c) => c.answer)).size, bingo.POOL, 'คำตอบไม่ซ้ำ')
    for (const c of set.calls) {
      const where = `[ชุด ${seed} ${c.kind}] ${c.text} → ${c.answer}`
      assert(c.answer >= 200 && c.answer <= 9975 && c.answer % 25 === 0, `คำตอบอยู่ในช่วง ${where}`)
      assert(!/NaN|undefined/.test(c.text), `ข้อความเสีย ${where}`)
      let got
      if (c.kind === 'change') {
        const m = c.text.match(new RegExp(`ราคา (${AMT}) จ่ายด้วยธนบัตร (\\d+) บาท`))
        got = Number(m[2]) * 100 - amt(m[1])
        assert(amt(m[1]) >= 25, `ราคาเป็นบวก ${where}`)
      } else if (c.kind === 'add') {
        const m = c.text.match(new RegExp(`มีเงิน (${AMT}) ได้เพิ่มอีก (${AMT}) `))
        got = amt(m[1]) + amt(m[2])
      } else if (c.kind === 'times') {
        const m = c.text.match(new RegExp(`ละ (${AMT}) ซื้อ (\\d+) `))
        got = amt(m[1]) * Number(m[2])
      } else if (c.kind === 'count') got = wordsValue(c.text)
      else got = amt(c.text.match(new RegExp(`^(${AMT}) เขียน`))[1])
      eq(got, c.answer, `เฉลยถูก ${where}`)
    }
    // การ์ด: 24 คำตอบไม่ซ้ำจากชุด ช่องกลางฟรี ข้อความอ่านได้ค่าตรง
    const pool = new Set(set.calls.map((c) => c.answer))
    const seen = new Set()
    for (let n = 1; n <= 12; n += 1) {
      const card = bingo.bingoCard(set, n)
      eq(card.length, 25, 'การ์ด 25 ช่อง')
      eq(card[bingo.FREE].value, null, 'ช่องกลางฟรี')
      const vals = card.filter((c) => c.value !== null).map((c) => c.value)
      eq(new Set(vals).size, 24, 'ในการ์ดไม่ซ้ำ')
      for (const c of card) {
        if (c.value === null) continue
        assert(pool.has(c.value), 'ทุกช่องเป็นคำตอบของชุด')
        eq(/\.\d\d$/.test(c.label) ? dotNum(c.label) : amt(c.label), c.value, `ข้อความบนการ์ด ${c.label}`)
      }
      seen.add(JSON.stringify(card))
      // ตารางตรวจผู้ชนะ: จำลองการเล่นทีละข้อ
      const marked = new Set([bingo.FREE])
      let real = null
      for (let k = 0; k < set.calls.length && real === null; k += 1) {
        const i = card.findIndex((c) => c.value === set.calls[k].answer)
        if (i >= 0) marked.add(i)
        if (bingo.LINES.some((line) => line.every((x) => marked.has(x)))) real = k + 1
      }
      eq(bingo.winAt(set, card), real, `ข้อที่ได้บิงโก (ชุด ${seed} ใบ ${n})`)
    }
    eq(seen.size, 12, 'การ์ดแต่ละใบไม่เหมือนกัน')
  }
  eq(JSON.stringify(bingo.buildBingo(4)), JSON.stringify(bingo.buildBingo(4)), 'ชุดเดิมได้โจทย์เดิม')
  eq(JSON.stringify(bingo.bingoCard(bingo.buildBingo(4), 3)), JSON.stringify(bingo.bingoCard(bingo.buildBingo(4), 3)), 'การ์ดเดิมพิมพ์ซ้ำได้เหมือนเดิม')
  eq(bingo.LINES.length, 12, 'แถวชนะ 12 แบบ')
  eq(bingo.moneyWords(8775), 'ธนบัตร 50 บาท 1 ใบ ธนบัตร 20 บาท 1 ใบ เหรียญ 10 บาท 1 เหรียญ เหรียญ 5 บาท 1 เหรียญ เหรียญ 2 บาท 1 เหรียญ เหรียญ 50 สตางค์ 1 เหรียญ เหรียญ 25 สตางค์ 1 เหรียญ', 'แตกเงินน้อยชิ้นที่สุด')
})

test('ภาพปริศนา: ภาพ 10×10 ถูกรูปแบบ เผยครบเมื่อตอบครบ ทายภาพ สะสมภาพ และบันทึกกลับได้', () => {
  eq(pictures.PICTURES.length, 8, 'ภาพ 8 ภาพ')
  eq(new Set(pictures.PICTURES.map((p) => p.id)).size, 8, 'รหัสไม่ซ้ำ')
  for (const p of pictures.PICTURES) {
    eq(p.rows.length, 10, `${p.id} สูง 10 แถว`)
    for (const r of p.rows) assert(/^[0-8]{10}$/.test(r), `${p.id} แถวละ 10 ช่อง สีที่รู้จัก: ${r}`)
    assert(pictures.coloredCells(p).length >= 30, `${p.id} มีช่องสีพอให้เป็นภาพ`)
    const order = pictures.revealOrder(p)
    eq([...order].sort((a, b) => a - b).join(), Array.from({ length: 100 }, (_, i) => i).join(), `${p.id} ลำดับการเผยครบทุกช่อง`)
    eq(JSON.stringify(order), JSON.stringify(pictures.revealOrder(p)), 'ภาพเดิมเผยแบบเดิม')
    let last = 0
    for (let c = 0; c <= pictures.PUZZLE_QUESTIONS; c += 1) {
      const n = pictures.revealedCount(p, c)
      assert(n >= last, 'ยิ่งตอบถูกยิ่งเผยมาก')
      last = n
    }
    eq(pictures.revealedCount(p, 0), 0, 'ยังไม่ตอบ ไม่เผย')
    eq(pictures.revealedCount(p, pictures.PUZZLE_QUESTIONS), 100, 'ตอบครบ เผยครบ')
    const g = pictures.guessChoices(p)
    eq(g.length, 3, 'ตัวเลือกทาย 3 ตัว')
    assert(g.includes(p.name) && new Set(g).size === 3, `ตัวเลือกมีคำตอบจริงและไม่ซ้ำ: ${g}`)
  }
  // สะสมภาพ
  let pl = progress.newPlayer('มะลิ', 'hero', 1)
  eq(pictures.nextPicture(pl).id, 'piggy', 'ภาพแรกคือลูกหมู')
  pl = pictures.collectPicture(pl, 'piggy')
  eq(pictures.collectPicture(pl, 'piggy'), pl, 'เก็บซ้ำไม่เพิ่ม')
  eq(pictures.collectPicture(pl, 'xx'), pl, 'รหัสที่ไม่มีไม่เก็บ')
  eq(pictures.nextPicture(pl).id, 'heart', 'ภาพถัดไป')
  for (const p of pictures.PICTURES) pl = pictures.collectPicture(pl, p.id)
  eq(pictures.nextPicture(pl).id, 'piggy', 'ครบแล้ววนกลับภาพแรก')
  const back = progress.parseSave(JSON.stringify({ version: 1, players: { a: { ...pl, id: 'a', puzzles: ['heart', 'zzz', 'heart', 7] } } }))
  eq(back.players.a.puzzles.join(), 'heart', 'อ่านกลับ กรองรหัสผิดและซ้ำ')
  const m = backup.mergeSaves(progress.parseSave(JSON.stringify({ version: 1, players: { a: { ...pl, id: 'a', puzzles: ['heart'] } } })), progress.parseSave(JSON.stringify({ version: 1, players: { a: { ...pl, id: 'a', puzzles: ['cat'] } } })))
  eq([...m.save.players.a.puzzles].sort().join(), 'cat,heart', 'รวมสองเครื่องได้ภาพจากทั้งสองเครื่อง')
  // โจทย์ของภาพ: ครบจำนวน และเล่นซ้ำได้ชุดใหม่
  const q1 = daily.buildPuzzle(pl, 'piggy', 1, pictures.PUZZLE_QUESTIONS)
  eq(q1.length, pictures.PUZZLE_QUESTIONS, 'โจทย์ครบ')
  eq(JSON.stringify(daily.buildPuzzle(pl, 'piggy', 1, 8).map((q) => q.title)), JSON.stringify(q1.map((q) => q.title)), 'รอบเดิมได้โจทย์เดิม')
})

test('ระบายสีภาพปริศนา: ทุกช่องคำนวณได้คำตอบตรงกับสีของช่อง แต่ละสีคำตอบไม่ซ้ำ ช่องขาวไม่มีโจทย์', () => {
  const calc = (e) => {
    const m = e.match(/^(\d+) ([+−×]) (\d+)$/)
    assert(m, `รูปแบบโจทย์: ${e}`)
    const a = Number(m[1])
    const b = Number(m[3])
    assert(a > 0 && b > 0, `ตัวเลขบวก: ${e}`)
    return m[2] === '+' ? a + b : m[2] === '−' ? a - b : a * b
  }
  for (const level of [1, 2]) {
    for (let seed = 1; seed <= 10; seed += 1) {
      for (const p of pictures.PICTURES) {
        const s = pictures.colourSheet(p, seed, level)
        eq(s.legend.length, pictures.colorsUsed(p).length, 'ทุกสีมีในตาราง')
        eq(new Set(s.legend.map((l) => l.answer)).size, s.legend.length, `${p.id} คำตอบแต่ละสีไม่ซ้ำ`)
        const ans = new Map(s.legend.map((l) => [l.color, l.answer]))
        s.cells.forEach((c, i) => {
          eq(c.color, pictures.cellColor(p, i), 'สีของช่องตรงกับภาพ')
          if (c.color === 0) {
            eq(c.expr, null, 'ช่องขาวไม่มีโจทย์')
            return
          }
          eq(calc(c.expr), ans.get(c.color), `${p.id} ระดับ ${level} ชุด ${seed} ช่อง ${i}: ${c.expr}`)
          if (level === 1) assert(!c.expr.includes('×'), 'ระดับ 1 ไม่มีคูณ')
        })
      }
    }
  }
  eq(JSON.stringify(pictures.colourSheet(pictures.PICTURES[0], 3, 1)), JSON.stringify(pictures.colourSheet(pictures.PICTURES[0], 3, 1)), 'ชุดเดิมพิมพ์ซ้ำได้เหมือนเดิม')
})

console.log(`ผ่าน ${passed} ข้อ`)
if (failures.length > 0) {
  console.log(`\nไม่ผ่าน ${failures.length} ข้อ`)
  failures.slice(0, 40).forEach((line, i) => console.log(`  ${i + 1}. ${line}`))
  process.exit(1)
}
console.log('ผ่านทั้งหมด')
