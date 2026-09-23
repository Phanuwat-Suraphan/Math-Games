/**
 * ทดสอบผจญภัยเมืองแห่งเวลา (เกมอ่านเวลา ป.2)
 *
 * แบ่งเป็นสองส่วน
 *
 * 1. ตัวการ์ด: ตรวจว่าเฉลยของทุกใบถูกจริง
 *    นาฬิกาบนการ์ดต้องตรงกับตัวเลือกที่เป็นเฉลย การ์ดเรียงลำดับต้องเรียงตามเวลาจริง
 *    ข้อผิดพลาดแบบนี้ไม่มีอะไรฟ้องเลย นอกจากเด็กที่ตอบถูกแต่เกมบอกว่าผิด
 *
 * 2. เครื่องยนต์: เล่นตามกติกาของชุดพิมพ์ทุกข้อ
 *    และจำลองเกมสุ่มหลายร้อยเกม เพื่อตรวจว่าไม่มีสถานะไหนหลุดกติกา
 *
 * วิธีใช้
 *   npx tsc -p tsconfig.tests.json --outDir /tmp/logic
 *   node tests/timeAdventure.test.mjs /tmp/logic
 */

import path from 'path'
import { createRequire } from 'module'

const OUT = process.argv[2]
if (!OUT) {
  console.error('ต้องบอกโฟลเดอร์ที่คอมไพล์แล้ว เช่น node tests/timeAdventure.test.mjs /tmp/logic')
  process.exit(1)
}

const require = createRequire(import.meta.url)
const load = (name) => require(path.resolve(OUT, name + '.js'))

const CARDS = load('timeAdventure/cards')
const ENG = load('timeAdventure/engine')
const ART = load('timeAdventure/art')

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

/** ตัวสุ่มที่กำหนดผลได้ ผลเหมือนเดิมทุกครั้งที่รัน */
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

const ALL = CARDS.TIME_CARDS
const minutesOf = (text) => {
  const match = /(\d{2}):(\d{2})/.exec(text)
  return match ? Number(match[1]) * 60 + Number(match[2]) : null
}
const optionText = (option) => (typeof option === 'string' ? option : option.time)

/* ── การ์ด ─────────────────────────────────────────────── */

check('มีการ์ดคำถาม 40 ใบ แบ่งกองตรงกับชุดพิมพ์', () => {
  equal(ALL.length, 40, 'จำนวนการ์ดทั้งหมด')
  const count = (deck) => ALL.filter((card) => card.deck === deck).length
  equal(count('time'), 12, 'กองอ่านเวลา')
  equal(count('find'), 8, 'กองหาเวลา')
  equal(count('daily'), 10, 'กองชีวิตประจำวัน')
  equal(count('chal'), 10, 'กองท้าทาย')
})

check('รหัสการ์ดไม่ซ้ำ และหาเจอด้วย getTimeCard', () => {
  const ids = ALL.map((card) => card.id)
  equal(new Set(ids).size, ids.length, 'มีรหัสซ้ำ')
  for (const id of ids) assert(CARDS.getTimeCard(id), `หา ${id} ไม่เจอ`)
})

check('การ์ดตัวเลือกมีเฉลยอยู่ในช่วง และตัวเลือกไม่ซ้ำกัน', () => {
  for (const card of ALL.filter((c) => c.kind === 'choice')) {
    assert(card.options.length >= 2, `${card.id} ต้องมีอย่างน้อย 2 ตัวเลือก`)
    assert(card.answer >= 0 && card.answer < card.options.length, `${card.id} เฉลยอยู่นอกตัวเลือก`)
    const labels = card.options.map((o) => (typeof o === 'string' ? o : o.label + o.time))
    equal(new Set(labels).size, labels.length, `${card.id} มีตัวเลือกซ้ำ`)
  }
})

check('นาฬิกาบนการ์ดตรงกับตัวเลือกที่เป็นเฉลย', () => {
  let checked = 0
  for (const card of ALL) {
    if (card.kind !== 'choice' || card.visual?.kind !== 'clock') continue
    const shown = minutesOf(optionText(card.options[card.answer]))
    if (shown === null) continue // เฉลยเป็นคำพูด เช่น "เก้าโมงครึ่ง" ตรวจในข้อถัดไป
    const { h, m } = card.visual
    equal(shown % 720, (h % 12) * 60 + m, `${card.id} นาฬิกา ${h}:${m} ไม่ตรงกับเฉลย`)
    checked += 1
  }
  assert(checked >= 8, `ตรวจได้แค่ ${checked} ใบ น้อยผิดปกติ`)
})

check('การ์ดที่เฉลยเป็นคำพูด ตรงกับนาฬิกาบนการ์ด', () => {
  const f04 = CARDS.getTimeCard('F04')
  equal(f04.visual.h * 60 + f04.visual.m, 9 * 60 + 30, 'F04 ต้องวาด 9:30')
  assert(f04.options[f04.answer].includes('เก้าโมงครึ่ง'), 'F04 เฉลยต้องเป็นเก้าโมงครึ่ง')
  const f07 = CARDS.getTimeCard('F07')
  equal(f07.visual.clocks[f07.answer].join(':'), '10:30', 'F07 เรือนที่ถูกต้องเป็น 10:30')
  const f08 = CARDS.getTimeCard('F08')
  equal(f08.visual.clocks[f08.answer].join(':'), '6:30', 'F08 เรือนที่ถูกต้องเป็น 6:30')
  const c08 = CARDS.getTimeCard('C08')
  const times = c08.visual.clocks.map(([h, m]) => h * 60 + m)
  equal(times[c08.answer], Math.min(...times), 'C08 เฉลยต้องเป็นเรือนที่มาก่อน')
})

check('การ์ดเรียงลำดับ: เฉลยเรียงตามเวลาจริงจากก่อนไปหลัง', () => {
  for (const card of ALL.filter((c) => c.kind === 'order')) {
    equal([...card.order].sort().join(), card.items.map((_, i) => i).join(), `${card.id} เฉลยต้องใช้ทุกข้อครั้งเดียว`)
    const times = card.order.map((i) => minutesOf(card.items[i].time))
    for (let i = 1; i < times.length; i += 1) {
      assert(times[i] > times[i - 1], `${card.id} ลำดับที่ ${i + 1} ไม่ได้มาหลังลำดับที่ ${i}`)
    }
  }
})

check('การ์ดก่อน/หลัง: เฉลยตรงกับเวลาที่เขียนบนการ์ด', () => {
  for (const card of ALL) {
    if (card.kind !== 'choice' || typeof card.options[0] === 'string') continue
    const times = card.options.map((o) => minutesOf(o.time))
    const wantsLater = card.question.includes('หลัง')
    const best = wantsLater ? Math.max(...times) : Math.min(...times)
    equal(times[card.answer], best, `${card.id} (${wantsLater ? 'หลัง' : 'ก่อน'})`)
  }
  for (const id of ['C01', 'C02']) {
    const card = CARDS.getTimeCard(id)
    const times = card.options.map(minutesOf)
    const best = card.question.includes('ทีหลัง') ? Math.max(...times) : Math.min(...times)
    equal(times[card.answer], best, id)
  }
})

check('การ์ดหมุนเข็ม: เป้าหมายอยู่บนหน้าปัดได้จริง และไม่ใช่จุดเริ่ม', () => {
  for (const card of ALL.filter((c) => c.kind === 'set')) {
    const [h, m] = card.target
    assert(h >= 1 && h <= 12, `${card.id} ชั่วโมงต้องอยู่ 1–12`)
    equal(m % 5, 0, `${card.id} นาทีต้องหมุนถึงได้ด้วยทีละ 5`)
    assert(card.start.join() !== card.target.join(), `${card.id} เริ่มที่คำตอบพอดี`)
  }
})

check('ไม่มีเวลาช่วงตี 1 ถึงตี 5 บนการ์ดใบไหนเลย', () => {
  const texts = []
  for (const card of ALL) {
    texts.push([card.id, card.question], [card.id, card.answerText], [card.id, card.why])
    if (card.kind === 'choice') for (const o of card.options) texts.push([card.id, optionText(o)])
    if (card.kind === 'order') for (const o of card.items) texts.push([card.id, o.time])
    if (card.visual?.kind === 'rows') for (const o of card.visual.rows) texts.push([card.id, o.time])
    if (card.visual?.kind === 'word') texts.push([card.id, card.visual.text])
  }
  const bad = texts.filter(([, text]) => /\b0[1-5]:\d\d/.test(text))
  equal(bad.length, 0, `พบ: ${bad.map(([id, t]) => `${id} "${t}"`).join(', ')}`)
})

check('เวลาครึ่งชั่วโมง เข็มสั้นอยู่กึ่งกลางระหว่างสองเลข', () => {
  equal(ART.handAngles(8, 30).hour, 255, '8:30 เข็มสั้นต้องอยู่ที่ 255 องศา (ระหว่าง 8 กับ 9)')
  equal(ART.handAngles(8, 30).minute, 180, '8:30 เข็มยาวต้องชี้ 6')
  equal(ART.handAngles(12, 0).hour, 0, '12:00 เข็มสั้นต้องชี้ 12')
  equal(ART.handAngles(7, 15).minute, 90, '7:15 เข็มยาวต้องชี้ 3')
})

check('ภาพทุกชิ้นสร้างได้และไม่มีค่า NaN หรือ undefined', () => {
  const pieces = [
    ART.clockArt(8, 30).inner,
    ART.clockArt(0, 0, { hands: false }).inner,
    ART.clockArt(6, 50, { plain: true }).inner,
    ART.bunnyInner(),
    ART.khemInner('#D99A00'),
    ART.boardArt(),
    ...ENG.HERO_KEYS.map((k) => ART.heroInner(k)),
  ]
  for (const svg of pieces) {
    assert(svg.length > 100, 'ภาพสั้นผิดปกติ')
    assert(!/NaN|undefined/.test(svg), 'ภาพมี NaN หรือ undefined')
  }
  equal(ART.SQUARE_POSITIONS.length, 17, 'ต้องมีตำแหน่ง START ช่อง 1–15 และในปราสาท')
})

/* ── เครื่องยนต์ ────────────────────────────────────────── */

const two = () => ENG.createGame([{ name: 'ต้นกล้า', hero: 'knight' }, { name: '', hero: 'fairy' }], false, seeded(1))
const setPlayer = (state, changes, i = state.turn) => ({
  ...state,
  players: state.players.map((p, j) => (j === i ? { ...p, ...changes } : p)),
})

check('เริ่มเกม: ทุกคนอยู่ START ไม่มีเหรียญ ชื่อว่างใช้ชื่อฮีโร่', () => {
  const state = two()
  equal(state.players.length, 2, 'จำนวนผู้เล่น')
  equal(state.players[1].name, 'นางฟ้าใบเตย', 'ชื่อว่างต้องใช้ชื่อฮีโร่')
  for (const p of state.players) {
    equal(p.pos, 0, 'ต้องเริ่มที่ START')
    equal(p.coins, 0, 'ต้องเริ่มที่ศูนย์เหรียญ')
  }
  equal(state.specials.length, 8, 'การ์ดพิเศษ 8 ใบ')
})

check('รับผู้เล่นได้ไม่เกิน 4 คน', () => {
  const five = Array.from({ length: 5 }, () => ({ name: 'x', hero: 'wizard' }))
  equal(ENG.createGame(five, false, seeded(2)).players.length, 4, 'ต้องตัดเหลือ 4 คน')
})

check('โหมดง่ายไม่มีการ์ด ★★★ ในกองเลย', () => {
  const state = ENG.createGame([{ name: 'a', hero: 'dragon' }], true, seeded(3))
  for (const pile of Object.values(state.decks)) {
    for (const id of pile) assert(CARDS.getTimeCard(id).stars < 3, `${id} เป็นการ์ด ★★★`)
  }
  equal(state.decks.chal.length, 5, 'กองท้าทายต้องเหลือ 5 ใบ')
})

check('กองที่จั่วได้เปลี่ยนตามด่าน · ด่าน 5 เลือกได้ · ประตูปราสาทได้แค่ท้าทาย', () => {
  const at = (pos) => ENG.deckChoices(setPlayer(two(), { pos }))
  equal(at(0).join(), 'time', 'START')
  equal(at(3).join(), 'time', 'ช่อง 3')
  equal(at(4).join(), 'find', 'ช่อง 4')
  equal(at(9).join(), 'daily', 'ช่อง 9')
  equal(at(12).join(), 'chal', 'ช่อง 12')
  equal(at(13).length, 4, 'ด่าน 5 เลือกได้ 4 กอง')
  equal(at(15).join(), 'chal', 'ประตูปราสาท')
})

check('จั่วการ์ดแล้วกองลดลง กองหมดแล้วสับใหม่', () => {
  let state = two()
  const before = state.decks.time.length
  const first = ENG.drawCard(state, 'time', seeded(4))
  equal(first.state.decks.time.length, before - 1, 'กองต้องลดลงหนึ่งใบ')
  equal(first.card.deck, 'time', 'ต้องได้การ์ดจากกองที่ขอ')
  state = { ...state, decks: { ...state.decks, time: [] } }
  const refill = ENG.drawCard(state, 'time', seeded(5))
  equal(refill.state.decks.time.length, 11, 'กองว่างต้องสับใหม่ครบแล้วจั่วไปหนึ่งใบ')
})

check('ตรวจคำตอบได้ทั้งสามแบบ', () => {
  const t01 = CARDS.getTimeCard('T01')
  assert(ENG.isCorrect(t01, { kind: 'choice', index: t01.answer }), 'ตัวเลือกที่ถูก')
  assert(!ENG.isCorrect(t01, { kind: 'choice', index: 1 }), 'ตัวเลือกที่ผิด')
  const d06 = CARDS.getTimeCard('D06')
  assert(ENG.isCorrect(d06, { kind: 'order', order: [1, 2, 0] }), 'ลำดับที่ถูก')
  assert(!ENG.isCorrect(d06, { kind: 'order', order: [0, 1, 2] }), 'ลำดับที่ผิด')
  assert(!ENG.isCorrect(d06, { kind: 'order', order: [1, 2] }), 'เรียงไม่ครบต้องผิด')
  const t09 = CARDS.getTimeCard('T09')
  assert(ENG.isCorrect(t09, { kind: 'set', h: 9, m: 30 }), 'หมุนถูก')
  assert(!ENG.isCorrect(t09, { kind: 'set', h: 9, m: 0 }), 'นาทีผิด')
  const t06like = { ...CARDS.getTimeCard('T03'), target: [12, 0] }
  assert(ENG.isCorrect(t06like, { kind: 'set', h: 12, m: 0 }), '12 นาฬิกาต้องถูก')
})

check('ตอบถูก: ได้ 1 เหรียญ เดินตามดาว · ตอบผิด: อยู่ที่เดิม ไม่เสียอะไร', () => {
  const state = two()
  const card = CARDS.getTimeCard('T07') // ★★
  const good = ENG.applyAnswer(state, card, true)
  equal(good.state.players[0].pos, 2, 'ต้องเดิน 2 ช่อง')
  equal(good.state.players[0].coins, 1, 'ต้องได้ 1 เหรียญ')
  equal(good.state.players[0].correct, 1, 'นับข้อถูก')
  const bad = ENG.applyAnswer(state, card, false)
  equal(bad.state.players[0].pos, 0, 'ตอบผิดต้องอยู่ที่เดิม')
  equal(bad.state.players[0].coins, 0, 'ตอบผิดต้องไม่เสียเหรียญ')
  equal(bad.state.players[0].answered, 1, 'นับว่าตอบไปแล้วหนึ่งข้อ')
})

check('BOOST ได้ 2 เหรียญ · FAST เดินเพิ่ม 2 ช่อง', () => {
  const card = CARDS.getTimeCard('T01') // ★
  const out = ENG.applyAnswer(two(), card, true, { boost: true, fast: true })
  equal(out.state.players[0].coins, 2, 'BOOST')
  equal(out.state.players[0].pos, 3, 'FAST: 1 + 2')
})

check('เดินเกินช่อง 15 ต้องหยุดที่ประตูปราสาท', () => {
  const state = setPlayer(two(), { pos: 14 })
  const out = ENG.applyAnswer(state, CARDS.getTimeCard('C10'), true, { fast: true })
  equal(out.to, ENG.GATE, 'ต้องหยุดที่ประตู')
  assert(!out.won, 'ถึงประตูยังไม่ชนะ')
})

check('ที่ประตูปราสาท ตอบถูกคือชนะ ตอบผิดรออยู่ที่ประตู', () => {
  const state = setPlayer(two(), { pos: ENG.GATE })
  const card = CARDS.getTimeCard('C01')
  const lose = ENG.applyAnswer(state, card, false)
  equal(lose.state.players[0].pos, ENG.GATE, 'ตอบผิดยังอยู่ที่ประตู')
  equal(lose.state.winner, null, 'ยังไม่มีผู้ชนะ')
  const win = ENG.applyAnswer(state, card, true)
  equal(win.state.players[0].pos, ENG.CASTLE, 'ต้องเข้าปราสาท')
  equal(win.state.winner, 0, 'ต้องเป็นผู้ชนะ')
  assert(win.won, 'ต้องบอกว่าชนะ')
})

check('ได้การ์ดพิเศษเฉพาะตอนเดินมาจบตาบนช่องดาว', () => {
  assert(ENG.landsOnStar(0, 2), 'เดินมาหยุดช่อง 2')
  assert(!ENG.landsOnStar(2, 2), 'ยืนบนดาวเดิมเพราะตอบผิด ต้องไม่ได้ซ้ำ')
  assert(!ENG.landsOnStar(1, 3), 'เดินผ่านดาวไม่นับ')
  for (const sq of ENG.STAR_SQUARES) assert(ENG.landsOnStar(sq - 1, sq), `ช่อง ${sq}`)
})

check('หีบสมบัติเปิดทันทีได้ 2 เหรียญ แล้วกลับเข้ากอง', () => {
  const state = { ...two(), specials: ['chest', 'boost'] }
  const out = ENG.drawSpecial(state)
  equal(out.special, 'chest', 'ต้องได้หีบ')
  equal(out.state.players[0].coins, 2, 'ต้องได้ 2 เหรียญ')
  equal(out.state.players[0].hand.length, 0, 'หีบไม่เข้ามือ')
  equal(out.state.specials.join(), 'boost,chest', 'หีบกลับไปใต้กอง')
})

check('ถือการ์ดพิเศษได้ 2 ใบ ใบที่ 3 ต้องเลือกทิ้ง', () => {
  let state = setPlayer({ ...two(), specials: ['fast'] }, { hand: ['boost', 'shield'] })
  const drawn = ENG.drawSpecial(state)
  assert(drawn.mustDrop, 'มือเต็มต้องบอกให้ทิ้ง')
  state = ENG.keepSpecial(drawn.state, drawn.special, 0)
  equal(state.players[0].hand.join(), 'shield,fast', 'ทิ้งใบแรกแล้วเก็บใบใหม่')
  equal(state.specials.join(), 'boost', 'ใบที่ทิ้งกลับเข้ากอง')
})

check('ใช้การ์ดพิเศษได้ตาละ 1 ใบ และยกเลิก BOOST ก่อนตอบได้', () => {
  let state = setPlayer(two(), { hand: ['boost', 'fast'] })
  state = ENG.spendSpecial(state, 'boost')
  equal(state.players[0].hand.join(), 'fast', 'BOOST ออกจากมือ')
  assert(!ENG.canUse(state, 'fast'), 'ใบที่สองในตาเดียวกันต้องใช้ไม่ได้')
  equal(ENG.spendSpecial(state, 'fast'), state, 'ใช้ซ้ำต้องไม่เปลี่ยนอะไร')
  state = ENG.cancelSpecial(state, 'boost')
  equal(state.players[0].hand.length, 2, 'ยกเลิกแล้วต้องกลับเข้ามือ')
  assert(ENG.canUse(state, 'fast'), 'ยกเลิกแล้วต้องใช้ใบอื่นได้')
  state = ENG.endTurn(ENG.spendSpecial(state, 'fast'))
  assert(!state.usedSpecial, 'ตาใหม่ต้องใช้ได้อีก')
})

check('TIME TRAVEL เดินหนึ่งช่องและไม่เลยประตูปราสาท', () => {
  let state = setPlayer(two(), { hand: ['travel'], pos: 4 })
  state = ENG.travel(state)
  equal(state.players[0].pos, 5, 'ต้องเดิน 1 ช่อง')
  equal(state.players[0].hand.length, 0, 'ใช้แล้วหายจากมือ')
  const atGate = setPlayer(two(), { hand: ['travel'], pos: ENG.GATE })
  equal(ENG.travel(atGate), atGate, 'ที่ประตูปราสาทใช้ไม่ได้')
})

check('กระต่ายตัดเฉพาะคำตอบผิด และใช้กับการ์ดสองตัวเลือกไม่ได้', () => {
  const card = CARDS.getTimeCard('T07')
  for (let seed = 1; seed < 40; seed += 1) {
    const gone = ENG.bunnyRemoves(card, [], seeded(seed))
    assert(gone >= 0 && gone !== card.answer, 'ต้องตัดข้อที่ผิดเท่านั้น')
  }
  equal(ENG.bunnyRemoves(CARDS.getTimeCard('C01'), [], seeded(1)), -1, 'สองตัวเลือก')
  equal(ENG.bunnyRemoves(CARDS.getTimeCard('D06'), [], seeded(1)), -1, 'การ์ดเรียงลำดับ')
})

check('จบตาแล้ววนคนถัดไป และนับรอบเมื่อวนครบ', () => {
  let state = two()
  state = ENG.endTurn(state)
  equal(state.turn, 1, 'คนที่สอง')
  equal(state.round, 1, 'ยังรอบแรก')
  state = ENG.endTurn(state)
  equal(state.turn, 0, 'กลับคนแรก')
  equal(state.round, 2, 'รอบที่สอง')
})

check('อันดับ: เข้าปราสาทก่อน แล้วเหรียญ แล้วระยะทาง', () => {
  let state = ENG.createGame(
    ['knight', 'fairy', 'wizard'].map((hero) => ({ name: hero, hero })),
    false,
    seeded(6),
  )
  state = setPlayer(state, { coins: 9, pos: 10 }, 0)
  state = setPlayer(state, { coins: 3, pos: ENG.CASTLE }, 1)
  state = setPlayer(state, { coins: 9, pos: 12 }, 2)
  equal(ENG.ranking(state).join(), '1,2,0', 'อันดับ')
})

check('รางวัลในแอปคิดจากข้อที่ตอบถูก และมีเพดาน', () => {
  let state = two()
  equal(ENG.appReward(state), ENG.REWARD_BASE, 'ยังไม่ตอบเลยได้ค่าพื้นฐาน')
  state = setPlayer(state, { correct: 5 }, 0)
  state = setPlayer(state, { correct: 3 }, 1)
  equal(ENG.appReward(state), ENG.REWARD_BASE + 8 * ENG.REWARD_PER_CORRECT, 'รวมข้อถูกของทุกคน')
  equal(ENG.appReward({ ...state, winner: 0 }), ENG.REWARD_BASE + 16 + ENG.REWARD_CASTLE, 'โบนัสเข้าปราสาท')
  state = setPlayer(state, { correct: 500 }, 0)
  equal(ENG.appReward(state), ENG.REWARD_MAX, 'ต้องไม่เกินเพดาน')
})

check('ประวัติการตอบ: บันทึกทุกใบ และสรุปรายกองกับการ์ดที่เคยผิด', () => {
  let state = two()
  state = ENG.applyAnswer(state, CARDS.getTimeCard('T01'), true).state
  state = ENG.applyAnswer(state, CARDS.getTimeCard('T07'), false).state
  state = ENG.applyAnswer(state, CARDS.getTimeCard('T07'), true).state
  state = ENG.applyAnswer(state, CARDS.getTimeCard('F04'), false).state
  const review = ENG.reviewOf(state.players[0])
  equal(review.byDeck.time.total, 3, 'ตอบกองอ่านเวลา 3 ครั้ง')
  equal(review.byDeck.time.right, 2, 'ถูก 2 ครั้ง')
  equal(review.byDeck.find.right, 0, 'กองหาเวลาถูก 0')
  equal(review.missed.join(), 'T07,F04', 'การ์ดที่เคยผิด ไม่ซ้ำ เรียงตามที่เจอ')
})

check('ใช้โล่ตอบใหม่แล้ว ประวัติข้อที่ผิดถูกถอนออก', () => {
  let state = setPlayer(two(), { hand: ['shield'] })
  state = ENG.applyAnswer(state, CARDS.getTimeCard('T07'), false).state
  state = ENG.undoWrongAnswerCount(ENG.spendSpecial(state, 'shield'))
  equal(state.players[0].history.length, 0, 'ข้อที่ผิดต้องถูกถอน')
  equal(state.players[0].answered, 0, 'จำนวนที่ตอบต้องถูกถอนด้วย')
})

check('เกมค้างที่บันทึกไว้ อ่านกลับได้ตรงทุกช่อง', () => {
  let state = two()
  state = ENG.drawCard(state, 'time', seeded(8)).state
  state = ENG.applyAnswer(state, CARDS.getTimeCard('T07'), true).state
  state = setPlayer({ ...state, specials: state.specials.slice(1) }, { hand: [state.specials[0]] })
  const back = ENG.parseSavedGame(JSON.parse(JSON.stringify(state)))
  assert(back, 'ต้องอ่านกลับได้')
  // เทียบแบบเรียงชื่อช่อง เพราะลำดับช่องใน object ไม่ใช่ข้อมูล
  const canon = (value) => JSON.stringify(value, (_, v) =>
    v && typeof v === 'object' && !Array.isArray(v) ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => a.localeCompare(b))) : v)
  equal(canon(back), canon(state), 'ต้องเหมือนเดิมทุกช่อง')
})

check('เกมค้างที่ข้อมูลถูกแก้หรือเสีย ต้องถูกปฏิเสธ', () => {
  const good = JSON.parse(JSON.stringify(two()))
  const bad = (change) => { const copy = JSON.parse(JSON.stringify(good)); change(copy); return ENG.parseSavedGame(copy) }
  equal(ENG.parseSavedGame(null), null, 'null')
  equal(ENG.parseSavedGame('ข้อความมั่ว'), null, 'ข้อความ')
  equal(bad((g) => { g.players[0].hero = 'robot' }), null, 'ฮีโร่ที่ไม่มีจริง')
  equal(bad((g) => { g.players[0].pos = 99 }), null, 'ตำแหน่งนอกกระดาน')
  equal(bad((g) => { g.players[0].coins = -5 }), null, 'เหรียญติดลบ')
  equal(bad((g) => { g.players[0].hand = ['chest', 'chest'] }), null, 'เสกการ์ดพิเศษเพิ่ม')
  equal(bad((g) => { g.decks.time.push('C01') }), null, 'การ์ดผิดกอง')
  equal(bad((g) => { g.decks.find = ['ZZZ'] }), null, 'การ์ดที่ไม่มีจริง')
  equal(bad((g) => { g.turn = 5 }), null, 'ตาของคนที่ไม่มี')
  equal(bad((g) => { g.players = [] }), null, 'ไม่มีผู้เล่น')
  const oldSave = bad((g) => { for (const p of g.players) delete p.history })
  assert(oldSave && oldSave.players[0].history.length === 0, 'ข้อมูลที่ไม่มีประวัติ (รุ่นก่อน) ต้องอ่านได้ ประวัติว่าง')
})

check('ตัวชี้วัดเวลา ป.2 อยู่ท้ายรายการและไม่นับเป็นตัวชี้วัด ป.4', () => {
  const IND = load('teacher/indicators')
  const last = IND.INDICATORS[IND.INDICATORS.length - 1]
  equal(last.id, IND.TIME_INDICATOR, 'ต้องต่อท้ายรายการ รหัสเก่าของครูจึงอ่านได้เหมือนเดิม')
  equal(last.level, 'review', 'ต้องไม่ใช่ตัวชี้วัดหลักของ ป.4')
  equal(last.verified, false, 'รหัสที่เกมโยงเองต้องบอกครูว่ายังไม่ได้ทาน')
})

check('จำลองเกมสุ่ม 300 เกม: ไม่มีสถานะไหนหลุดกติกา และทุกเกมจบได้', () => {
  for (let g = 0; g < 300; g += 1) {
    const rng = seeded(1000 + g)
    const n = 1 + (g % 4)
    let state = ENG.createGame(
      Array.from({ length: n }, (_, i) => ({ name: '', hero: ENG.HERO_KEYS[i] })),
      g % 3 === 0,
      rng,
    )
    let turns = 0
    while (state.winner === null) {
      turns += 1
      assert(turns < 2000, `เกม ${g} ไม่จบ`)
      if (ENG.canUse(state, 'travel') && rng() < 0.5) state = ENG.travel(state)
      const choices = ENG.deckChoices(state)
      const drawn = ENG.drawCard(state, choices[Math.floor(rng() * choices.length)], rng)
      state = drawn.state
      const boost = ENG.canUse(state, 'boost') && rng() < 0.5
      if (boost) state = ENG.spendSpecial(state, 'boost')
      const out = ENG.applyAnswer(state, drawn.card, rng() < 0.7, { boost })
      state = out.state
      if (!out.won && ENG.landsOnStar(out.from, out.to)) {
        const star = ENG.drawSpecial(state)
        state = star.state
        if (star.special && star.special !== 'chest') state = ENG.keepSpecial(state, star.special, star.mustDrop ? 0 : undefined)
      }
      for (const p of state.players) {
        assert(p.pos >= 0 && p.pos <= ENG.CASTLE, `ตำแหน่งหลุดกระดาน ${p.pos}`)
        assert(p.hand.length <= ENG.HAND_LIMIT, 'ถือการ์ดพิเศษเกินสองใบ')
        assert(p.coins >= 0, 'เหรียญติดลบ')
      }
      const inPlay = state.specials.length + state.players.reduce((s, p) => s + p.hand.length, 0)
      equal(inPlay, 8, `การ์ดพิเศษต้องครบ 8 ใบเสมอ (เกม ${g})`)
      assert(ENG.parseSavedGame(JSON.parse(JSON.stringify(state))), `บันทึกกลางเกมแล้วต้องอ่านกลับได้ (เกม ${g})`)
      if (!out.won) state = ENG.endTurn(state)
    }
    equal(state.players[state.winner].pos, ENG.CASTLE, 'ผู้ชนะต้องอยู่ในปราสาท')
  }
})

console.log(`\nเมืองแห่งเวลา: ผ่าน ${passed} ข้อ`)
if (failures.length) {
  console.log(`\nไม่ผ่าน ${failures.length} ข้อ:\n`)
  for (const f of failures) console.log('  ✗ ' + f)
  process.exit(1)
}
console.log('ผ่านทั้งหมด')
