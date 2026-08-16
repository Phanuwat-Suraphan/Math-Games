/**
 * ชุดทดสอบเครื่องยนต์ Divisor Duel
 *
 * ทดสอบกับ JavaScript ที่คอมไพล์แล้ว ไม่ต้องติดตั้ง test framework
 *
 * ต้องคอมไพล์เป็น CommonJS เพราะ TypeScript เขียน import แบบไม่มีนามสกุล .js
 * ซึ่ง Node โหมด ESM หาไฟล์ไม่เจอ ส่วนตัวเกมจริงไม่เจอปัญหานี้
 * เพราะ bundle.mjs รวมทุกโมดูลเป็นไฟล์เดียวอยู่แล้ว
 *
 * วิธีใช้
 *   tsc --ignoreConfig src/divisorDuel/*.ts src/divisorDuel/engine/*.ts \
 *     --outDir /tmp/dd-cjs --target ES2020 --module commonjs \
 *     --strict --skipLibCheck --lib ES2020,DOM
 *   node src/divisorDuel/web/test.mjs /tmp/dd-cjs
 */

import path from 'path'
import { createRequire } from 'module'

const OUT = process.argv[2]
if (!OUT) {
  console.error('ใช้: node test.mjs <โฟลเดอร์ JS ที่คอมไพล์แบบ commonjs แล้ว>')
  process.exit(1)
}

const require = createRequire(import.meta.url)
const load = (name) => require(path.resolve(OUT, name + '.js'))

const EQ = load('engine/equation')
const DMG = load('engine/damage')
const G = load('engine/game')
const S = load('engine/suggest')
const AI = load('engine/ai')

let passed = 0
const failures = []

function check(name, fn) {
  try {
    fn()
    passed += 1
  } catch (err) {
    failures.push(`${name}\n      ${err.message}`)
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

function equal(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message} — ได้ ${JSON.stringify(actual)} คาดว่า ${JSON.stringify(expected)}`)
  }
}

// ── ตัวช่วยสร้างสถานะเกมแบบกำหนดมือเองได้ ──

const num = (value, tag) => ({
  uid: `n${value}-${tag}`, kind: 'number', value,
  tier: value >= 50 ? 'void' : value >= 20 ? 'legendary' : value >= 10 ? 'advanced' : 'basic',
  label: String(value),
})
const op = (symbol, tag) => ({
  uid: `o${tag}`, kind: 'operator', symbol,
  label: { '+': '+', '-': '−', '*': '×' }[symbol],
})
const gauntlet = (tag) => ({ uid: `b${tag}`, kind: 'bracket', label: '( )' })

/** เกมที่คุมได้ทุกตัวแปร: มือของผู้เล่น เกราะและเลือดของเป้าหมาย */
function stateWith(hand, { divisors = [4, 7], hp = 999, heroId = 'grand-wizard-arcanus', comboStreak = 0 } = {}) {
  const state = G.createGame({
    p1HeroId: heroId,
    p2HeroId: 'grand-wizard-arcanus',
    p2Control: 'ai',
    random: () => 0.5,
  })
  state.players.p1.hand = hand
  state.players.p1.comboStreak = comboStreak
  state.players.p2.guards = state.players.p2.guards.map((guard, index) => ({
    ...guard,
    hp,
    maxHp: Math.max(hp, guard.maxHp),
    divisor: divisors[index] ?? guard.divisor,
    divisorBonus: 0,
  }))
  return state
}

/**
 * เล่นสมการที่ระบบแนะนำจริง ๆ ทีละใบ แล้วคืนพลังโจมตีที่ได้
 *
 * ข้อนี้สำคัญที่สุดของไฟล์นี้: คำแนะนำที่วางลงกระดานจริงไม่ได้
 * หรือวางแล้วได้ผลลัพธ์คนละค่า คือคำแนะนำที่หลอกเด็ก
 */
function playSuggestion(state, suggestion) {
  let next = state
  for (const slot of suggestion.slots) {
    const before = next.equation.slots.length
    next = G.placeCard(next, slot.cardId)
    assert(next.equation.slots.length === before + 1, `วางการ์ด ${slot.cardId} ไม่ได้`)
  }
  if (suggestion.bracket) {
    const res = G.addBracket(next, suggestion.bracket.startTerm, suggestion.bracket.endTerm)
    assert(res.ok, 'ใส่วงเล็บไม่ได้: ' + res.message)
    next = res.state
  }
  return { power: EQ.evaluate(next.equation), state: next }
}

// ── การประกอบสมการ ──

check('ประกอบสมการได้ทั้งพจน์เดียว สองพจน์ และสามพจน์', () => {
  const hand = [num(2, 'a'), num(3, 'b'), num(4, 'c'), op('+', '1'), op('*', '2')]
  const powers = new Set(S.buildCandidates(hand).map((c) => c.power))
  assert(powers.has(2), 'ต้องมีสมการพจน์เดียว 2')
  assert(powers.has(5), 'ต้องมี 2 + 3')
  assert(powers.has(14), 'ต้องมี 2 + 3 × 4 (คูณก่อน)')
})

check('วงเล็บเปลี่ยนผลลัพธ์ตามลำดับการดำเนินการ', () => {
  const hand = [num(2, 'a'), num(3, 'b'), num(4, 'c'), op('+', '1'), op('*', '2'), gauntlet('g')]
  const powers = new Set(S.buildCandidates(hand).map((c) => c.power))
  assert(powers.has(14), '2 + 3 × 4 = 14 ต้องมี')
  assert(powers.has(20), '(2 + 3) × 4 = 20 ต้องมี')
})

check('ไม่มีเครื่องหมายก็ได้แค่สมการพจน์เดียว', () => {
  const hand = [num(2, 'a'), num(3, 'b'), num(4, 'c')]
  const candidates = S.buildCandidates(hand)
  equal(candidates.length, 3, 'ต้องได้เท่าจำนวนตัวเลข')
  assert(candidates.every((c) => c.slots.length === 1), 'ทุกข้อต้องเป็นพจน์เดียว')
})

check('การ์ดใบเดียวใช้ซ้ำในสมการเดียวไม่ได้', () => {
  const hand = [num(5, 'a'), op('+', '1')]
  const candidates = S.buildCandidates(hand)
  for (const candidate of candidates) {
    const ids = candidate.slots.map((s) => s.cardId)
    equal(new Set(ids).size, ids.length, 'มีการ์ดซ้ำในสมการเดียว')
  }
})

// ── ระบบแนะนำสมการ ──

check('แนะนำสมการที่หารลงตัวได้เมื่อมือทำได้', () => {
  // 2 × 4 = 8 หารด้วย 4 ลงตัว
  const hand = [num(2, 'a'), num(4, 'b'), num(7, 'c'), op('*', '1'), op('+', '2')]
  const list = S.suggestEquations(stateWith(hand, { divisors: [4, 7] }), { criticalOnly: true })
  assert(list.length > 0, 'ควรหาสมการที่หารลงตัวเจอ')
  assert(list.every((s) => s.isCritical), 'ทุกข้อต้องเป็น Critical')
  assert(list.every((s) => s.power % s.target.divisor === 0), 'พลังต้องหารด้วยเกราะลงตัวจริง')
})

check('สมการที่แนะนำวางลงกระดานได้จริงและได้พลังตรงตามที่บอก', () => {
  const hand = [num(2, 'a'), num(3, 'b'), num(4, 'c'), op('+', '1'), op('*', '2'), gauntlet('g')]
  const state = stateWith(hand, { divisors: [5, 7] })
  const list = S.suggestEquations(state, { limit: 20 })
  assert(list.length > 0, 'ต้องมีคำแนะนำอย่างน้อยหนึ่งข้อ')
  for (const suggestion of list) {
    const { power } = playSuggestion(state, suggestion)
    equal(power, suggestion.power, `สมการ ${suggestion.display} ให้พลังไม่ตรง`)
  }
})

check('ดาเมจที่บอกไว้ตรงกับที่ระบบดาเมจคำนวณจริง', () => {
  const hand = [num(6, 'a'), num(8, 'b'), num(9, 'c'), op('*', '1'), op('-', '2')]
  const state = stateWith(hand, { divisors: [6, 9] })
  for (const s of S.suggestEquations(state, { limit: 10 })) {
    const expected = DMG.calculateDamage({
      power: s.power, divisor: s.target.divisor, comboStreak: 0, passive: null,
    })
    equal(s.damage, expected.damage, `ดาเมจของ ${s.display} ไม่ตรง`)
    equal(s.isCritical, expected.isCritical, `สถานะ Critical ของ ${s.display} ไม่ตรง`)
  }
})

check('เรียงจากดาเมจมากไปน้อย', () => {
  const hand = [num(3, 'a'), num(5, 'b'), num(10, 'c'), op('*', '1'), op('+', '2')]
  const list = S.suggestEquations(stateWith(hand), { limit: 10 })
  for (let i = 1; i < list.length; i += 1) {
    assert(list[i - 1].damage >= list[i].damage, 'ลำดับดาเมจไม่ถูก')
  }
})

check('ดาเมจเท่ากันให้สมการที่ใช้การ์ดน้อยกว่าขึ้นก่อน', () => {
  // 5 กับ 5 + 0 ไม่มี จึงใช้ 10 พจน์เดียว เทียบกับ 5 + 5
  const hand = [num(10, 'a'), num(5, 'b'), num(5, 'c'), op('+', '1')]
  const list = S.suggestEquations(stateWith(hand, { divisors: [5, 5] }), { limit: 10 })
  const tens = list.filter((s) => s.power === 10 && s.target.index === 0)
  assert(tens.length >= 2, 'ควรมีทั้งแบบพจน์เดียวและแบบบวก')
  assert(tens[0].cardCount <= tens[1].cardCount, 'ข้อที่ใช้การ์ดน้อยกว่าต้องมาก่อน')
})

check('ไม่แนะนำสมการหน้าตาซ้ำกันกับเป้าหมายเดียวกัน', () => {
  const hand = [num(4, 'a'), num(4, 'b'), num(4, 'c'), op('+', '1'), op('+', '2')]
  const list = S.suggestEquations(stateWith(hand), { limit: 50 })
  const keys = list.map((s) => `${s.target.kind}:${s.target.index}:${s.display}`)
  equal(new Set(keys).size, keys.length, 'มีคำแนะนำซ้ำ')
})

check('จำกัดเป้าหมายได้ตามที่เด็กเลือกไว้', () => {
  const hand = [num(4, 'a'), num(7, 'b'), num(3, 'c'), op('+', '1'), op('*', '2')]
  const state = stateWith(hand, { divisors: [4, 7] })
  const list = S.suggestEquations(state, { target: { kind: 'guard', index: 1 }, limit: 20 })
  assert(list.length > 0, 'ควรมีคำแนะนำ')
  assert(list.every((s) => s.target.index === 1), 'ต้องแนะนำเฉพาะเป้าหมายที่เลือก')
})

check('เป้าหมายที่ตายแล้วไม่ถูกแนะนำ', () => {
  const hand = [num(4, 'a'), num(8, 'b'), num(3, 'c'), op('+', '1'), op('*', '2')]
  const state = stateWith(hand, { divisors: [4, 7] })
  state.players.p2.guards[0].hp = 0
  const list = S.suggestEquations(state, { limit: 50 })
  assert(list.every((s) => !(s.target.kind === 'guard' && s.target.index === 0)),
    'ยังแนะนำให้ตีองครักษ์ที่ตายแล้ว')
})

check('ไม่แนะนำสมการที่ทำดาเมจไม่ได้เลย', () => {
  const hand = [num(1, 'a'), num(2, 'b'), num(3, 'c'), op('+', '1'), op('-', '2')]
  const list = S.suggestEquations(stateWith(hand, { divisors: [50, 50] }), { limit: 50 })
  assert(list.every((s) => s.damage > 0), 'มีคำแนะนำที่ดาเมจเป็น 0')
})

check('มือที่ไม่มีทางทำดาเมจได้เลย คืนรายการว่าง', () => {
  const hand = [num(1, 'a'), num(1, 'b')]
  const list = S.suggestEquations(stateWith(hand, { divisors: [50, 50] }), { limit: 10 })
  equal(list.length, 0, 'ควรไม่มีคำแนะนำ')
})

check('สมการที่แนะนำใช้เฉพาะการ์ดที่อยู่ในมือจริง', () => {
  const hand = [num(2, 'a'), num(6, 'b'), num(9, 'c'), op('*', '1'), op('+', '2'), gauntlet('g')]
  const state = stateWith(hand)
  const inHand = new Set(hand.map((c) => c.uid))
  for (const s of S.suggestEquations(state, { limit: 30 })) {
    for (const slot of s.slots) assert(inHand.has(slot.cardId), 'ใช้การ์ดที่ไม่มีในมือ')
    if (s.bracket) assert(inHand.has(s.bracket.cardId), 'ใช้ถุงมือที่ไม่มีในมือ')
  }
})

check('คิดโบนัสคอมโบเข้าไปในดาเมจที่แนะนำด้วย', () => {
  const hand = [num(4, 'a'), num(2, 'b'), op('*', '1')]
  const plain = S.suggestEquations(stateWith(hand, { divisors: [4, 4], comboStreak: 0 }), { limit: 1 })
  const combo = S.suggestEquations(stateWith(hand, { divisors: [4, 4], comboStreak: 4 }), { limit: 1 })
  assert(combo[0].damage > plain[0].damage, 'คอมโบควรทำให้ดาเมจสูงขึ้น')
})

check('คิดสกิลฮีโร่เข้าไปในดาเมจที่แนะนำด้วย', () => {
  const hand = [num(4, 'a'), num(2, 'b'), op('*', '1')]
  const plain = S.suggestEquations(stateWith(hand, { divisors: [4, 4] }), { limit: 1 })
  const valerius = S.suggestEquations(
    stateWith(hand, { divisors: [4, 4], heroId: 'knight-commander-valerius' }), { limit: 1 })
  assert(valerius[0].damage > plain[0].damage, 'Precision Strike ควรเพิ่มดาเมจตอน Critical')
})

// ── คำใบ้ชั้นที่ 1 ──

check('คำใบ้ชั้นแรกไม่เฉลยสมการออกมา', () => {
  const hand = [num(2, 'a'), num(4, 'b'), num(7, 'c'), op('*', '1'), op('+', '2')]
  const hint = S.summarizeHint(stateWith(hand, { divisors: [4, 7] }))
  assert(hint !== null, 'ควรมีคำใบ้')
  assert(!('slots' in hint), 'คำใบ้ชั้นแรกต้องไม่มี slots')
  assert(!('display' in hint), 'คำใบ้ชั้นแรกต้องไม่มีข้อความสมการ')
})

check('คำใบ้บอกจำนวนวิธีตรงกับที่ระบบแนะนำหาได้จริง', () => {
  const hand = [num(2, 'a'), num(4, 'b'), num(6, 'c'), op('*', '1'), op('+', '2')]
  const state = stateWith(hand, { divisors: [4, 7] })
  const target = { kind: 'guard', index: 0 }
  const hint = S.summarizeHint(state, target)
  const crits = S.suggestEquations(state, { target, criticalOnly: true, limit: Number.MAX_SAFE_INTEGER })
  equal(hint.criticalCount, crits.length, 'จำนวนวิธีไม่ตรงกัน')
  equal(hint.hasCritical, crits.length > 0, 'ธง hasCritical ไม่ตรง')
})

check('ตัวอย่างผลลัพธ์ในคำใบ้หารด้วยเกราะลงตัวจริงและเรียงจากน้อยไปมาก', () => {
  const hand = [num(3, 'a'), num(4, 'b'), num(8, 'c'), op('*', '1'), op('+', '2')]
  const hint = S.summarizeHint(stateWith(hand, { divisors: [4, 7] }), { kind: 'guard', index: 0 })
  assert(hint.targetPowers.length > 0, 'ควรมีตัวอย่างผลลัพธ์')
  for (const power of hint.targetPowers) {
    equal(power % hint.divisor, 0, `${power} หารด้วย ${hint.divisor} ไม่ลงตัว`)
  }
  for (let i = 1; i < hint.targetPowers.length; i += 1) {
    assert(hint.targetPowers[i - 1] < hint.targetPowers[i], 'ตัวอย่างไม่ได้เรียงจากน้อยไปมาก')
  }
})

check('คำใบ้บอกจำนวนผลลัพธ์ทั้งหมด แม้จะแสดงตัวอย่างแค่บางส่วน', () => {
  // เกราะ ÷1 หารลงตัวหมดทุกค่า จึงมีผลลัพธ์เกิน 4 ค่าแน่นอน
  const hand = [num(2, 'a'), num(3, 'b'), num(5, 'c'), op('+', '1'), op('*', '2')]
  const state = stateWith(hand, { divisors: [1, 1] })
  const hint = S.summarizeHint(state, { kind: 'guard', index: 0 })
  const crits = S.suggestEquations(state, {
    target: { kind: 'guard', index: 0 }, criticalOnly: true, limit: Number.MAX_SAFE_INTEGER,
  })
  const distinct = new Set(crits.map((s) => s.power)).size
  assert(distinct > hint.targetPowers.length, 'ควรมีผลลัพธ์มากกว่าที่แสดงตัวอย่าง')
  equal(hint.targetPowerCount, distinct, 'จำนวนผลลัพธ์ทั้งหมดไม่ตรง')
})

check('มือที่หารไม่ลงตัวเลย คำใบ้ต้องบอกตามตรงว่าทำ Critical ไม่ได้', () => {
  // การ์ด 50 ใบเดียว ใส่เกราะ 4: 50 ÷ 4 เหลือเศษ 2 เสมอ ทำ Critical ไม่ได้
  // แต่ยังทำดาเมจได้ 50 − (2 × 10) = 30 จึงต้องมีคำใบ้ ไม่ใช่ null
  const hand = [num(50, 'a')]
  const hint = S.summarizeHint(stateWith(hand, { divisors: [4, 4] }), { kind: 'guard', index: 0 })
  assert(hint !== null, 'ยังควรมีคำใบ้')
  equal(hint.hasCritical, false, 'ไม่ควรบอกว่าทำ Critical ได้')
  equal(hint.fewestCards, null, 'ไม่ควรมีจำนวนการ์ด')
  equal(hint.targetPowers.length, 0, 'ไม่ควรมีตัวอย่างผลลัพธ์')
  equal(hint.targetPowerCount, 0, 'จำนวนผลลัพธ์ต้องเป็น 0')
  assert(hint.bestDamage > 0, 'ควรยังบอกดาเมจดีที่สุดที่ทำได้')
})

check('มือที่ทำอะไรไม่ได้เลย คืน null', () => {
  const hint = S.summarizeHint(stateWith([num(1, 'a')], { divisors: [50, 50] }))
  equal(hint, null, 'ควรคืน null')
})

// ── AI ยังทำงานเหมือนเดิมหลังย้ายตัวประกอบสมการ ──

check('AI ระดับยากเลือกสมการที่หารลงตัวเมื่อมีทางเลือก', () => {
  const hand = [num(2, 'a'), num(4, 'b'), num(7, 'c'), op('*', '1'), op('+', '2')]
  const plan = AI.planTurn(stateWith(hand, { divisors: [4, 7], hp: 500 }), 'hard')
  equal(plan.fallback, 'none', 'ไม่ควรตกไปใช้กติกามือตาย')
  assert(plan.isCritical, 'ระดับยากควรหาสมการที่หารลงตัวเจอ')
})

check('แผนของ AI วางลงกระดานได้จริง', () => {
  const hand = [num(3, 'a'), num(5, 'b'), num(9, 'c'), op('*', '1'), op('+', '2'), gauntlet('g')]
  const state = stateWith(hand, { divisors: [6, 8], hp: 500 })
  const plan = AI.planTurn(state, 'hard')
  const { power } = playSuggestion(state, { slots: plan.slots, bracket: plan.bracket })
  equal(power, plan.power, 'พลังของแผน AI ไม่ตรงกับที่วางจริง')
})

check('AI กับระบบแนะนำใช้ชุดสมการเดียวกัน', () => {
  const hand = [num(2, 'a'), num(6, 'b'), num(9, 'c'), op('*', '1'), op('+', '2')]
  const state = stateWith(hand, { divisors: [4, 9], hp: 500 })
  const best = S.suggestEquations(state, { limit: 1 })[0]
  const plan = AI.planTurn(state, 'hard')
  // AI หักคะแนนดาเมจส่วนเกิน จึงอาจเลือกคนละข้อ แต่ต้องไม่แรงกว่าข้อที่ดีที่สุด
  assert(plan.expectedDamage <= best.damage, 'AI หาสมการที่ระบบแนะนำหาไม่เจอ')
})

// ── เล่นจริงหลายเกม โดยเล่นตามคำแนะนำทุกตา ──

/**
 * ข้อนี้จับบั๊กที่ทดสอบทีละข้อจับไม่ได้
 *
 * ไล่เล่นเกมจริงจนจบ โดยฝ่ายที่ถึงตาจะเล่นตามสมการอันดับหนึ่งที่ระบบแนะนำ
 * ทุกตาต้องวางการ์ดตามคำแนะนำได้จริงและได้พลังตรงตามที่บอก
 */
check('เล่นตามคำแนะนำได้จริงตลอดทั้งเกม 40 เกม', () => {
  let seed = 20260813
  const random = () => {
    seed = (seed * 1103515245 + 12345) % 2147483648
    return seed / 2147483648
  }

  let turns = 0, applied = 0, finished = 0, deadHands = 0

  for (let game = 0; game < 40; game += 1) {
    let state = G.createGame({
      p1HeroId: 'knight-commander-valerius',
      p2HeroId: 'lich-queen-morwenna',
      p2Control: 'human',
      random,
    })

    for (let turn = 0; turn < 200 && !state.winner; turn += 1) {
      turns += 1

      if (state.deadHand !== 'none') {
        deadHands += 1
        // ตามกติกามือตาย ไม่เกี่ยวกับระบบแนะนำ ข้ามไปเทิร์นถัดไป
        state = G.tacticalReset(state)
        state = G.endTurn(state)
        continue
      }

      const best = S.suggestEquations(state, { limit: 1 })[0]
      if (!best) { state = G.endTurn(state); continue }

      // ตรวจว่าคำแนะนำใช้ได้จริง แล้วเล่นตามนั้น
      const played = playSuggestion(state, best)
      equal(played.power, best.power, `เกม ${game} เทิร์น ${turn}: พลังไม่ตรงกับที่แนะนำ`)
      applied += 1

      const out = G.attack(played.state, { target: { kind: best.target.kind, index: best.target.index } })
      assert(out.result !== null, `เกม ${game} เทิร์น ${turn}: โจมตีตามคำแนะนำไม่ได้ — ${out.message}`)
      equal(out.result.damage, best.damage, `เกม ${game} เทิร์น ${turn}: ดาเมจไม่ตรงกับที่แนะนำ`)

      state = out.state
      if (!state.winner) state = G.endTurn(state)
    }

    if (state.winner) finished += 1
  }

  console.log(`      เล่นจบ ${finished}/40 เกม · ${turns} เทิร์น · ทำตามคำแนะนำ ${applied} ครั้ง · มือตาย ${deadHands}`)
  assert(finished === 40, `มีเกมที่เล่นไม่จบ (จบ ${finished}/40)`)
})

// ── สรุป ──


check('หน้าจอเรียกเครื่องยนต์ได้ครบทุกฟังก์ชันโดยไม่พัง', () => {
  /*
   * ข้อนี้คู่กับ src/divisorDuel/uiContract.ts
   *
   * ไฟล์นั้นเรียกทุกฟังก์ชันที่หน้าจอ .tsx ใช้ ด้วยค่าชนิดเดียวกับของจริง
   * และเป็น .ts ธรรมดา จึงถูกคอมไพเลอร์ตรวจตั้งแต่ในเครื่องพัฒนา
   * ส่วนข้อนี้ตรวจอีกชั้นว่าเรียกแล้วทำงานได้จริง ไม่ใช่แค่ชนิดถูก
   *
   * ที่ต้องมีเพราะหน้าจอเป็น .tsx ซึ่งคอมไพล์ในเครื่องไม่ได้
   * ตอนต่อหน้าจอเข้ากับเครื่องยนต์ครั้งแรกเรียกผิดไปห้าจุด
   * และรู้ทีละจุดจาก CI ซึ่งเสียเวลาสองนาทีต่อจุด
   */
  const contract = load('uiContract')

  for (const level of ['easy', 'normal', 'hard']) {
    const result = contract.exerciseUi(level)
    assert(result.targetCount >= 2, `ระดับ ${level} มีเป้าหมายแค่ ${result.targetCount}`)
    assert(result.redrawCost > 0, 'ค่าจั่วใหม่ต้องมากกว่าศูนย์')
    assert(Array.isArray(result.logLines), 'บันทึกการต่อสู้ต้องเป็นรายการ')
  }
})

console.log(`ผ่าน ${passed} ข้อ`)
if (failures.length > 0) {
  console.log(`\nไม่ผ่าน ${failures.length} ข้อ`)
  failures.forEach((line, i) => console.log(`  ${i + 1}. ${line}`))
  process.exit(1)
}
console.log('ผ่านทั้งหมด')
