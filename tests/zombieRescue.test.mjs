/**
 * ทดสอบ ZOMBIE RESCUE (เกมการคูณ ป.2)
 *
 * แบ่งเป็นสามส่วน
 *
 * 1. กระดาน: 5 เขต เขตละ 7 ช่อง ทุกเขตมีจุดพักฟื้น และช่องห่างกันพอให้เด็กนับตามนิ้วได้
 * 2. โจทย์: สุ่มหลายหมื่นข้อ ตรวจว่าเฉลยถูก ใช้แม่ของเขตนั้นจริง ยอมรับการสลับที่ตัวคูณ
 *    และข้อความกับคำใบ้ไม่เผยคำตอบ ข้อผิดพลาดแบบนี้ไม่มีอะไรฟ้องเลย
 *    นอกจากเด็กที่ตอบถูกแต่เกมบอกว่าผิด
 * 3. เครื่องยนต์: เล่นตามกติกาทุกข้อ และจำลองเกมสุ่มหลายร้อยเกม
 *    เพื่อตรวจว่าไม่มีสถานะไหนหลุดกติกา ทุกเกมจบได้ และความยาวเกมพอดีคาบเรียน
 *
 * วิธีใช้
 *   npx tsc -p tsconfig.tests.json --outDir /tmp/logic
 *   node tests/zombieRescue.test.mjs /tmp/logic
 */

import fs from 'fs'
import path from 'path'
import { createRequire } from 'module'
import { fileURLToPath } from 'url'

const OUT = process.argv[2]
if (!OUT) {
  console.error('ต้องบอกโฟลเดอร์ที่คอมไพล์แล้ว เช่น node tests/zombieRescue.test.mjs /tmp/logic')
  process.exit(1)
}

const require = createRequire(import.meta.url)
const load = (name) => require(path.resolve(OUT, name + '.js'))

const BOARD = load('zombieRescue/board')
const Q = load('zombieRescue/questions')
const ENG = load('zombieRescue/engine')
const ART = load('zombieRescue/art')

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

/** มีตัวเลขนี้เป็นจำนวนเต็มตัวหนึ่งในข้อความหรือไม่ (12 ไม่นับว่าอยู่ใน 120) */
const hasNumber = (text, n) => new RegExp(`(^|[^0-9])${n}([^0-9]|$)`).test(text)
const STAGES = [1, 2, 3, 4, 5, 'boss']

/* ── กระดาน ─────────────────────────────────────────────── */

check('กระดานมี START ช่อง 1–35 และหน้าประตู · 5 เขต เขตละ 7 ช่อง', () => {
  equal(BOARD.DOOR, 36, 'หน้าประตูคือช่อง 36')
  let from = 1
  for (const id of BOARD.ZONE_IDS) {
    const zone = BOARD.ZONES[id]
    equal(zone.from, from, `เขต ${id} ต้องต่อจากเขตก่อนหน้า`)
    equal(zone.to - zone.from + 1, 7, `เขต ${id} ต้องมี 7 ช่อง`)
    for (let p = zone.from; p <= zone.to; p += 1) equal(BOARD.zoneOf(p), id, `ช่อง ${p} ต้องอยู่เขต ${id}`)
    // เขต 1–4 จบด้วยจุดพักฟื้น ส่วนเขต 5 จบด้วยซอมบี้ตัวสุดท้ายก่อนถึงประตู จุดพักฟื้นจึงอยู่ก่อนหน้า 1 ช่อง
    const rest = id === 5 ? zone.to - 1 : zone.to
    equal(BOARD.squareKind(rest), 'rest', `เขต ${id} ต้องมีจุดพักฟื้น (จุดเซฟ) ที่ช่อง ${rest}`)
    from = zone.to + 1
  }
  equal(from - 1, BOARD.LAST_SQUARE, 'ช่องสุดท้ายคือ 35')
  equal(BOARD.squareKind(0), 'start', 'START')
  equal(BOARD.squareKind(36), 'door', 'หน้าประตู')
})

check('ทุกเขตมีช่องเจอซอมบี้และช่องได้ไอเทม · มีตลาดอย่างน้อย 4 ช่อง', () => {
  for (const id of BOARD.ZONE_IDS) {
    const zone = BOARD.ZONES[id]
    const kinds = []
    for (let p = zone.from; p <= zone.to; p += 1) kinds.push(BOARD.squareKind(p))
    assert(kinds.includes('zombie'), `เขต ${id} ไม่มีช่อง ⚠️`)
    assert(kinds.includes('item'), `เขต ${id} ไม่มีช่อง ➕`)
    assert(kinds.includes('event'), `เขต ${id} ไม่มีช่อง ⚙️`)
  }
  let markets = 0
  for (let p = 1; p <= 35; p += 1) if (BOARD.squareKind(p) === 'market') markets += 1
  assert(markets >= 4, 'ตลาดน้อยเกินไป เสบียงจะไม่มีที่ใช้')
})

check('จุดเซฟ: หมดแรงแล้วกลับไปช่องพักฟื้นล่าสุด ไม่ใช่ START', () => {
  equal(BOARD.checkpointFor(0), 0, 'START')
  equal(BOARD.checkpointFor(6), 0, 'ยังไม่ผ่านจุดพักฟื้นเลย')
  equal(BOARD.checkpointFor(7), 7, 'ยืนบนจุดพักฟื้นเอง')
  equal(BOARD.checkpointFor(13), 7, 'เขต 2')
  equal(BOARD.checkpointFor(36), 34, 'หน้าประตูกลับไปช่อง 34')
})

check('ภาพกระดาน: ช่องห่างกันเท่า ๆ กัน และทุกช่องมีในภาพ', () => {
  equal(ART.SQUARE_POSITIONS.length, 37, 'ต้องมีตำแหน่ง START ช่อง 1–35 และหน้าประตู')
  for (let i = 1; i < ART.SQUARE_POSITIONS.length; i += 1) {
    const [x1, y1] = ART.SQUARE_POSITIONS[i - 1]
    const [x2, y2] = ART.SQUARE_POSITIONS[i]
    const d = Math.hypot(x2 - x1, y2 - y1)
    assert(d >= 18 && d <= 27, `ช่อง ${i - 1} กับ ${i} ห่างกัน ${d.toFixed(1)} (ต้อง 18–27)`)
  }
  for (let i = 0; i < ART.SQUARE_POSITIONS.length; i += 1) {
    for (let j = i + 2; j < ART.SQUARE_POSITIONS.length; j += 1) {
      const [x1, y1] = ART.SQUARE_POSITIONS[i]
      const [x2, y2] = ART.SQUARE_POSITIONS[j]
      assert(Math.hypot(x2 - x1, y2 - y1) >= 17, `ช่อง ${i} กับ ${j} อยู่ชิดกันจนทับ`)
    }
  }
  const svg = ART.boardArt()
  for (let i = 1; i <= 35; i += 1) {
    if (BOARD.squareKind(i) === 'plain') assert(svg.includes(`>${i}</text>`), `ไม่เห็นเลขช่อง ${i} บนกระดาน`)
  }
  assert(!/undefined|NaN/.test(svg), 'กระดานมีค่า undefined หรือ NaN หลุดเข้าไป')
})

check('ตัวละครทุกตัววาดได้ ไม่มี undefined และไม่มีสีแดงเลือด', () => {
  for (const key of ['scientist', 'doctor', 'scout', 'dog', 'zombie', 'boss', 'zombo']) {
    const inner = ART.charInner(key)
    assert(inner.length > 200, `${key} ว่างเปล่า`)
    assert(!/undefined|NaN/.test(inner), `${key} มีค่าเสีย`)
    assert(!/#8B0000|#B00000|blood/i.test(inner), `${key} มีสีเลือด`)
  }
  assert(ART.zheadInner().includes('<circle'), 'หัวซอมบี้')
  assert(ART.curedHeadInner().includes('<circle'), 'หัวคนที่หายป่วย')
})

/* ── โจทย์ ─────────────────────────────────────────────── */

check('สุ่มโจทย์ 30,000 ข้อ: เฉลยถูก แม่ตรงเขต จำนวนกลุ่มอยู่ในช่วง และภาพไม่เกิน 30 ชิ้น', () => {
  for (const easy of [false, true]) {
    const [low, high] = Q.groupRange(easy)
    for (const stage of STAGES) {
      const rng = seeded(easy ? 77 : 7 + String(stage).length)
      for (let i = 0; i < 2500; i += 1) {
        const q = Q.makeQuestion(stage, rng, { easy })
        equal(q.product, q.groups * q.each, `${q.key} ผลคูณผิด`)
        assert(q.groups >= low && q.groups <= high, `${q.key} จำนวนกลุ่ม ${q.groups} นอกช่วง ${low}–${high}`)
        const table = typeof stage === 'number' ? Q.ZONE_TABLE[stage] : 0
        if (table) equal(q.each, table, `${q.key} ในเขต ${stage} ต้องใช้แม่ ${table}`)
        else assert(Q.TABLES.includes(q.each), `${q.key} ใช้แม่ ${q.each} ซึ่งไม่อยู่ในรายการ`)
        const v = q.visual
        if (v.kind === 'groups') assert(v.groups === q.groups && v.each === q.each && v.groups * v.each <= 30, `${q.key} ภาพกลุ่มไม่ตรงโจทย์หรือเยอะเกิน`)
        if (v.kind === 'array') assert(v.rows === q.groups && v.cols === q.each && v.rows * v.cols <= 30, `${q.key} ภาพแถวไม่ตรงโจทย์หรือเยอะเกิน`)
        if (v.kind === 'add') assert(v.addend === q.each && v.times === q.groups, `${q.key} การบวกซ้ำไม่ตรงโจทย์`)
        if (v.kind === 'zombies') assert(v.count === q.groups && v.power === q.each, `${q.key} ซอมบี้ไม่ตรงโจทย์`)
        if (v.kind === 'scene') assert(v.count === q.groups && hasNumber(v.tag, q.each), `${q.key} ภาพประกอบไม่ตรงโจทย์`)
        assert(q.text && q.answerText && q.why && q.hint, `${q.key} ข้อความไม่ครบ`)
        assert(!/undefined|NaN/.test(q.text + q.answerText + q.why + q.hint), `${q.key} มีค่าเสีย`)
      }
    }
  }
})

check('ตรวจคำตอบ: ถูกเมื่อถูกจริง และประโยคการคูณสลับที่ตัวคูณได้เสมอ', () => {
  const rng = seeded(2024)
  let sentences = 0
  let missing = 0
  for (const stage of STAGES) {
    for (let i = 0; i < 1500; i += 1) {
      const q = Q.makeQuestion(stage, rng)
      if (q.ask === 'sentence') {
        sentences += 1
        assert(Q.checkAnswer(q, { kind: 'sentence', x: q.groups, y: q.each, z: q.product }), `${q.key} กลุ่ม × กลุ่มละ ต้องถูก`)
        assert(Q.checkAnswer(q, { kind: 'sentence', x: q.each, y: q.groups, z: q.product }), `${q.key} สลับที่ตัวคูณต้องถูก`)
        assert(!Q.checkAnswer(q, { kind: 'sentence', x: q.groups, y: q.each, z: q.product + 1 }), `${q.key} ผลคูณผิดต้องผิด`)
        if (q.groups !== 1 && q.each !== 1) {
          assert(!Q.checkAnswer(q, { kind: 'sentence', x: q.product, y: 1, z: q.product }), `${q.key} ตัวคูณที่ไม่ตรงโจทย์ต้องผิด แม้ผลคูณจะถูก`)
        }
        assert(!Q.checkAnswer(q, { kind: 'number', value: q.product }), `${q.key} ข้อประโยคต้องตอบเป็นประโยค`)
        assert(hasNumber(q.answerText, q.product), `${q.key} เฉลยไม่มีผลคูณ`)
      } else {
        const want = Q.expectedNumber(q)
        if (q.ask === 'missing') {
          missing += 1
          equal(want, q.hidden === 'each' ? q.each : q.groups, `${q.key} คำตอบของ □`)
          assert(q.visual.kind === 'expr' && q.visual.text.includes('□') && hasNumber(q.visual.text, q.product), `${q.key} ต้องโชว์ผลคูณและ □`)
        } else {
          equal(want, q.product, `${q.key} คำตอบคือผลคูณ`)
        }
        assert(Q.checkAnswer(q, { kind: 'number', value: want }), `${q.key} ตอบถูกต้องถูก`)
        assert(!Q.checkAnswer(q, { kind: 'number', value: want + 1 }), `${q.key} ตอบผิดต้องผิด`)
        assert(hasNumber(q.answerText, want), `${q.key} เฉลยไม่มีคำตอบ`)
      }
    }
  }
  assert(sentences > 500 && missing > 300, 'ต้องมีทั้งข้อเขียนประโยคและข้อหา □ ปนอยู่พอสมควร')
})

check('ข้อความโจทย์และคำใบ้ไม่เผยคำตอบ', () => {
  const rng = seeded(99)
  for (const easy of [false, true]) {
    for (const stage of STAGES) {
      for (let i = 0; i < 2000; i += 1) {
        const q = Q.makeQuestion(stage, rng, { easy })
        const answer = q.ask === 'sentence' ? q.product : Q.expectedNumber(q)
        // ตัวเลขที่โจทย์ให้มาอยู่แล้ว (จำนวนกลุ่ม กลุ่มละ หรือผลคูณในข้อหา □) บังเอิญเท่าคำตอบได้ ไม่นับว่าเผย
        const given = q.ask === 'missing' ? [q.product, q.hidden === 'each' ? q.groups : q.each] : [q.groups, q.each]
        if (given.includes(answer)) continue
        const shown = q.text + ' ' + (q.visual.kind === 'expr' ? q.visual.text : '') + ' ' + (q.visual.kind === 'scene' ? q.visual.tag : '')
        assert(!hasNumber(shown, answer), `${q.key} ${q.groups}×${q.each} โจทย์เผยคำตอบ ${answer}: ${shown}`)
        assert(!hasNumber(q.hint, answer), `${q.key} ${q.groups}×${q.each} คำใบ้เผยคำตอบ ${answer}: ${q.hint}`)
      }
    }
  }
})

check('ทุกแม่แบบถูกสุ่มเจอ และไม่ถามข้อเดิมติดกันเมื่อบอกข้อที่เพิ่งถาม', () => {
  const rng = seeded(5)
  for (const stage of STAGES) {
    const seen = new Set()
    for (let i = 0; i < 800; i += 1) seen.add(Q.makeQuestion(stage, rng).key)
    for (const key of Q.TEMPLATE_KEYS[stage]) assert(seen.has(key), `เขต ${stage} ไม่เคยเจอแม่แบบ ${key}`)
  }
  let repeats = 0
  let recent = []
  for (let i = 0; i < 2000; i += 1) {
    const q = Q.makeQuestion(2, rng, { recent })
    if (recent.includes(Q.signatureOf(q))) repeats += 1
    recent = [...recent, Q.signatureOf(q)].slice(-8)
  }
  assert(repeats < 20, `ถามข้อที่เพิ่งถามซ้ำ ${repeats} ครั้งจาก 2,000 ข้อ`)
})

check('ชุดฝึกสูตรคูณ: 10 ข้อไม่ซ้ำ ใช้แม่ที่เลือก และมีข้อหา □', () => {
  for (const table of [2, 3, 4, 5, 10, 'mix']) {
    for (let seed = 0; seed < 60; seed += 1) {
      const set = Q.buildPracticeSet(table, seeded(seed * 13 + 1))
      equal(set.length, Q.PRACTICE_LENGTH, `แม่ ${table} ต้องมี 10 ข้อ`)
      const sigs = new Set(set.map((q) => `${q.each}:${q.groups}`))
      equal(sigs.size, set.length, `แม่ ${table} มีข้อซ้ำ`)
      if (table !== 'mix') assert(set.every((q) => q.each === table), `แม่ ${table} มีข้อของแม่อื่นปน`)
      assert(set.some((q) => q.ask === 'missing'), `แม่ ${table} ไม่มีข้อหา □`)
      for (const q of set) assert(Q.checkAnswer(q, { kind: 'number', value: Q.expectedNumber(q) }), `แม่ ${table} เฉลยผิด`)
    }
  }
  equal(Q.practiceReward(10, 10), 15, 'ถูกหมดได้โบนัส')
  equal(Q.practiceReward(7, 10), 7, 'ถูก 7 ข้อ')
  equal(Q.practiceReward(99, 10), 15, 'ค่าเกินต้องถูกตัด')
})

/* ── เครื่องยนต์ ───────────────────────────────────────── */

const newGame = (n = 2, easy = false, seed = 1) =>
  ENG.createGame(Array.from({ length: n }, (_, i) => ({ name: '', hero: ENG.HERO_KEYS[i] })), easy, seeded(seed))
/** โจทย์ที่กำหนดตัวเลขเอง ใช้ทดสอบกติกาโดยไม่ขึ้นกับการสุ่ม */
const fakeQ = (groups, each) => ({ ...Q.makeQuestion(1, seeded(1)), groups, each, product: groups * each })
const setPlayer = (state, changes, index = state.turn) => ({
  ...state,
  players: state.players.map((p, i) => (i === index ? { ...p, ...changes } : p)),
})

check('เริ่มเกม: ❤️ 3 · 🥫 2 · 💡 1 · เป้าพลังวัคซีนตามจำนวนคน', () => {
  const g = newGame(3)
  equal(g.players.length, 3, 'จำนวนคน')
  for (const p of g.players) {
    equal(p.lives, 3, 'พลังชีวิต')
    equal(p.supplies, 2, 'เสบียง')
    equal(p.items.join(), 'help', 'บัตรช่วยคิด')
    equal(p.pos, 0, 'เริ่มที่ START')
  }
  equal(g.target, ENG.targetFor(3, false), 'เป้า')
  assert(ENG.targetFor(1, false) < ENG.targetFor(2, false) && ENG.targetFor(2, false) < ENG.targetFor(4, false), 'คนมากเป้าต้องมากขึ้น')
  assert(ENG.targetFor(2, true) < ENG.targetFor(2, false), 'ระดับง่ายเป้าต่ำกว่า')
  equal(newGame(1, true).players[0].items.join(), 'help,medkit', 'ระดับง่ายได้ยาติดตัว')
  equal(ENG.createGame([], false, seeded(1)).players.length, 1, 'ไม่มีผู้เล่นเลยต้องสร้างให้ 1 คน')
})

check('ด่านตามตำแหน่ง: START อยู่เขต 1 และหน้าประตูคือภารกิจของ ดร.ซอมโบ', () => {
  equal(ENG.stageOf(0), 1, 'START')
  equal(ENG.stageOf(7), 1, 'ช่อง 7')
  equal(ENG.stageOf(8), 2, 'ช่อง 8')
  equal(ENG.stageOf(35), 5, 'ช่อง 35')
  equal(ENG.stageOf(36), 'boss', 'หน้าประตู')
})

check('ตอบถูก: ได้พลังวัคซีนเท่าผลคูณ · ⚠️ นับเป็นการรักษา · ⚡ ได้สองเท่าแล้วหมดไป', () => {
  let g = newGame(2)
  const q = fakeQ(4, 3)
  let out = ENG.answerQuestion(g, q, true, 'turn')
  equal(out.energy, 12, 'พลังเท่าผลคูณ')
  equal(out.state.team.energy, 12, 'เข้าหลอดของทีม')
  equal(out.state.players[0].energy, 12, 'จำไว้ว่าใครหามา')
  equal(out.state.players[0].supplies, 3, 'ได้เสบียง 1')
  g = out.state
  out = ENG.answerQuestion(g, q, true, 'zombie')
  equal(out.state.team.rescued, 1, 'รักษาผู้ติดเชื้อได้ 1 คน')
  equal(out.state.players[0].supplies, 5, 'ช่อง ⚠️ ได้เสบียง 2')
  g = setPlayer(out.state, { boost: true })
  out = ENG.answerQuestion(g, q, true, 'turn')
  equal(out.energy, 24, '⚡ ได้สองเท่า')
  equal(out.state.players[0].boost, false, '⚡ ใช้แล้วหมดไป')
  equal(out.state.players[0].history.length, 3, 'บันทึกทุกข้อ')
  equal(out.state.players[0].history[0].t, 3, 'บันทึกแม่ของข้อนั้น')
})

check('ตอบผิด: เสีย ❤️ 1 · มีโล่ใช้โล่แทน · ❤️ หมดกลับจุดเซฟแล้วฟื้นเต็ม', () => {
  const q = fakeQ(2, 2)
  let g = setPlayer(newGame(2), { pos: 12 })
  let out = ENG.answerQuestion(g, q, false, 'turn')
  equal(out.state.players[0].lives, 2, 'เสีย 1 ดวง')
  equal(out.state.players[0].pos, 12, 'อยู่ที่เดิม')
  assert(out.lifeLost && !out.knockedOut, 'ผลลัพธ์')
  g = setPlayer(out.state, { items: ['shield', 'help'] })
  out = ENG.answerQuestion(g, q, false, 'zombie')
  equal(out.state.players[0].lives, 2, 'โล่กันไว้')
  equal(out.state.players[0].items.join(), 'help', 'โล่ถูกใช้ไป 1 อัน')
  assert(out.shieldUsed && !out.lifeLost, 'ผลลัพธ์โล่')
  g = setPlayer(out.state, { lives: 1 })
  out = ENG.answerQuestion(g, q, false, 'turn')
  assert(out.knockedOut, 'หมดแรง')
  equal(out.to, 7, 'กลับไปจุดพักฟื้นช่อง 7')
  equal(out.state.players[0].pos, 7, 'ตำแหน่งจริง')
  equal(out.state.players[0].lives, 3, 'ฟื้นเต็ม')
  equal(out.state.players[0].knockouts, 1, 'นับครั้งที่หมดแรง')
  equal(out.state.team.energy, 0, 'ตอบผิดไม่ได้พลัง')
})

check('ภารกิจ ดร.ซอมโบ: ตอบถูกตอนหลอดเต็มแล้ว = สร้าง Z-CURE สำเร็จ', () => {
  let g = setPlayer(newGame(1), { pos: 36 })
  g = { ...g, team: { energy: g.target - 30, rescued: 0 } }
  g = setPlayer(g, { energy: g.target - 30 })
  let out = ENG.answerQuestion(g, fakeQ(2, 5), true, 'boss')
  assert(!out.cured && !out.state.cured, 'ยังไม่เต็ม (ขาดอีก 20)')
  out = ENG.answerQuestion(out.state, fakeQ(4, 5), true, 'boss')
  assert(out.cured && out.state.cured, 'เต็มแล้ว สร้างสำเร็จ')
  equal(out.state.curedBy, 0, 'จำไว้ว่าใครสร้าง')
  const full = { ...setPlayer(newGame(1), { pos: 20 }), team: { energy: 9999, rescued: 0 } }
  assert(!ENG.answerQuestion(full, fakeQ(2, 2), true, 'turn').cured, 'ต้องทำที่หน้าประตูเท่านั้น')
})

check('เดิน: ไม่เกินหน้าประตู ไม่ต่ำกว่า START และช่องธรรมดาไม่มีอะไรเกิด', () => {
  let g = setPlayer(newGame(1), { pos: 33 })
  const m = ENG.move(g, 6)
  equal(m.to, 36, 'หยุดที่หน้าประตู')
  equal(ENG.move(setPlayer(g, { pos: 1 }), -2).to, 0, 'ถอยไม่ต่ำกว่า START')
  equal(ENG.landingOf(5, 5), null, 'ไม่ได้ขยับ')
  equal(ENG.landingOf(1, 2), 'item', 'ช่อง ➕')
  equal(ENG.landingOf(1, 3), null, 'ช่องธรรมดา')
  equal(ENG.landingOf(30, 36), null, 'หน้าประตูไม่มีเหตุการณ์')
  g = setPlayer(g, { lives: 1 })
  equal(ENG.rest(ENG.rest(ENG.rest(g))).players[0].lives, 3, 'พักฟื้นไม่เกิน 3')
})

check('ตลาด: ซื้อได้เมื่อมีเสบียงพอและกระเป๋ายังไม่เต็ม', () => {
  let g = setPlayer(newGame(1), { supplies: 5, items: [] })
  g = ENG.buy(g, 'shield')
  equal(g.players[0].supplies, 2, 'จ่าย 3')
  equal(g.players[0].items.join(), 'shield', 'ได้โล่')
  equal(ENG.buyBlocker(g, 'skate'), 'เสบียงไม่พอ', 'เสบียงไม่พอ')
  equal(ENG.buy(g, 'skate'), g, 'ซื้อไม่ได้ต้องคืนสถานะเดิม')
  g = setPlayer(g, { supplies: 50, items: ['help', 'help', 'radio', 'skate'] })
  equal(ENG.buyBlocker(g, 'medkit'), 'กระเป๋าเต็ม', 'กระเป๋าเต็ม')
  g = setPlayer(g, { lives: 1, items: ['medkit'] })
  g = ENG.takeMedkit(g)
  equal(g.players[0].lives, 2, 'ยาฟื้น 1 ดวง')
  equal(g.players[0].items.length, 0, 'ยาถูกใช้')
  equal(ENG.takeMedkit(setPlayer(g, { lives: 3, items: ['medkit'] })).players[0].items.length, 1, 'ชีวิตเต็มไม่ต้องใช้ยา')
})

check('กล่องเสบียง ➕: ได้ของเสมอ · กระเป๋าเต็มได้เสบียงแทน · ยาออกบ่อยที่สุด', () => {
  const rng = seeded(3)
  const count = {}
  for (let i = 0; i < 4000; i += 1) {
    const g = setPlayer(newGame(1), { items: [] })
    const { state, reward } = ENG.openSupply(g, rng)
    const key = reward.kind === 'item' ? reward.item : 'supplies'
    count[key] = (count[key] || 0) + 1
    if (reward.kind === 'item') equal(state.players[0].items.join(), reward.item, 'ได้ของเข้ากระเป๋า')
    else equal(state.players[0].supplies, 2 + reward.amount, 'ได้เสบียง')
  }
  assert(['help', 'shield', 'skate', 'supplies'].every((k) => count.medkit > count[k]), 'ยาต้องออกบ่อยที่สุด')
  equal(count.radio, undefined, 'วิทยุไม่อยู่ในกล่องเสบียง (ซื้อที่ตลาดเท่านั้น) เหมือนชุดพิมพ์')
  equal(ENG.SUPPLY_TABLE.reduce((s, [, w]) => s + w, 0), 6, 'กล่องเสบียงคือการทอยลูกเต๋า 1 ลูก (6 หน้า) เหมือนชุดพิมพ์')
  const full = setPlayer(newGame(1), { items: ['help', 'help', 'help', 'help'] })
  for (let i = 0; i < 50; i += 1) {
    const { state, reward } = ENG.openSupply(full, rng)
    equal(state.players[0].items.length, 4, 'กระเป๋าเต็มต้องไม่เกิน 4')
    if (reward.kind === 'item') assert(!reward.kept && state.players[0].supplies === 4, 'ได้เสบียงแทน')
  }
})

check('การ์ดพิเศษ ⚙️: ทำตามทุกใบ และวนกลับใต้กอง', () => {
  const g0 = setPlayer(newGame(2), { pos: 10, lives: 2 })
  for (const event of ENG.EVENT_DECK) {
    const g = { ...setPlayer(g0, { lives: 2 }), events: [event, ...ENG.EVENT_DECK.filter((e) => e !== event)] }
    const d = ENG.drawEvent(g)
    equal(d.event, event, 'จั่วใบบนสุด')
    equal(d.state.events[d.state.events.length - 1], event, 'ใบที่ใช้แล้วไปอยู่ใต้กอง')
    const me = d.state.players[0]
    const other = d.state.players[1]
    if (event === 'heli') equal(me.pos, 13, 'บินหน้า 3')
    if (event === 'chase') equal(me.pos, 8, 'ถอยหลัง 2')
    if (event === 'share') assert(me.supplies === 3 && other.supplies === 3, 'ทุกคนได้เสบียง')
    if (event === 'vaccine') assert(d.state.team.energy === 10 && me.energy === 10, 'ทีมได้พลัง 10')
    if (event === 'rain') assert(me.lives === 3 && other.lives === 3, 'ทุกคนฟื้น')
    if (event === 'sniff') equal(me.items.filter((k) => k === 'help').length, 2, 'ได้บัตรช่วยคิด')
    if (event === 'power') equal(me.boost, true, 'ได้พลังคูณสอง')
    if (event === 'again') {
      equal(d.state.again, true, 'ได้เล่นต่อ')
      const next = ENG.endTurn(d.state)
      equal(next.turn, 0, 'ตาต่อไปยังเป็นคนเดิม')
      equal(ENG.endTurn(next).turn, 1, 'แล้วค่อยเปลี่ยนคน')
    }
  }
})

check('จบตา: วนทุกคนแล้วนับรอบใหม่', () => {
  let g = newGame(3)
  g = ENG.endTurn(ENG.endTurn(g))
  equal(g.turn, 2, 'ตาคนที่ 3')
  g = ENG.endTurn(g)
  equal(g.turn, 0, 'วนกลับ')
  equal(g.round, 2, 'รอบใหม่')
})

check('สรุปท้ายเกม: แยกผลตามแม่สูตรคูณ · รางวัลมีเพดาน', () => {
  let g = newGame(1)
  g = ENG.answerQuestion(g, fakeQ(3, 2), true, 'turn').state
  g = ENG.answerQuestion(g, fakeQ(3, 4), false, 'turn').state
  g = ENG.answerQuestion(g, fakeQ(3, 4), true, 'turn').state
  const r = ENG.reviewOf(g.players[0])
  equal(`${r[2].right}/${r[2].total}`, '1/1', 'แม่ 2')
  equal(`${r[4].right}/${r[4].total}`, '1/2', 'แม่ 4')
  equal(r[10].total, 0, 'แม่ 10 ยังไม่เจอ')
  equal(ENG.appReward(g), 10 + 2 * 2, 'รางวัลพื้นฐาน + ข้อที่ถูก')
  equal(ENG.appReward({ ...setPlayer(g, { correct: 500 }), cured: true }), ENG.REWARD_MAX, 'มีเพดาน')
  equal(ENG.topHelper(setPlayer(newGame(2), { energy: 50 }, 1)), 1, 'คนที่หาพลังได้มากที่สุด')
})

check('เกมค้าง: อ่านกลับได้เหมือนเดิม และข้อมูลที่ถูกแก้ต้องไม่ผ่าน', () => {
  let g = newGame(3, false, 8)
  g = ENG.answerQuestion(g, fakeQ(5, 3), true, 'zombie').state
  g = setPlayer(g, { pos: 12, items: ['help', 'shield'] })
  const round = ENG.parseSavedGame(JSON.parse(JSON.stringify(g)))
  assert(round, 'ต้องอ่านกลับได้')
  equal(JSON.stringify(round), JSON.stringify(g), 'ต้องได้เกมเดิมทุกอย่าง')
  const bad = (mutate) => {
    const copy = JSON.parse(JSON.stringify(g))
    mutate(copy)
    return ENG.parseSavedGame(copy)
  }
  equal(ENG.parseSavedGame(null), null, 'null')
  equal(bad((s) => { s.team.energy = 99999 }), null, 'เสกพลังวัคซีนของทีม')
  equal(bad((s) => { s.target = 1 }), null, 'แก้เป้าให้ต่ำ')
  equal(bad((s) => { s.players[0].lives = 9 }), null, 'ชีวิตเกิน')
  equal(bad((s) => { s.players[0].lives = 0 }), null, 'ชีวิตเป็นศูนย์')
  equal(bad((s) => { s.players[0].pos = 50 }), null, 'ตำแหน่งนอกกระดาน')
  equal(bad((s) => { s.players[0].items = ['help', 'help', 'help', 'help', 'help'] }), null, 'กระเป๋าเกิน')
  equal(bad((s) => { s.players[0].items = ['rocket'] }), null, 'ไอเทมที่ไม่มีจริง')
  equal(bad((s) => { s.players[0].hero = 'robot' }), null, 'ตัวละครที่ไม่มีจริง')
  equal(bad((s) => { s.events = ['again', 'again', 'again', 'again', 'again', 'again', 'again', 'again'] }), null, 'เสกการ์ดพิเศษ')
  equal(bad((s) => { s.turn = 7 }), null, 'ตาของคนที่ไม่มี')
  equal(bad((s) => { s.cured = true }), null, 'สร้างยาสำเร็จโดยไม่มีคนสร้าง')
  const noHistory = bad((s) => { delete s.players[0].history })
  assert(noHistory && noHistory.players[0].history.length === 0, 'ข้อมูลที่ไม่มีประวัติต้องอ่านได้ ประวัติว่าง')
})

/* ── จำลองทั้งเกม ─────────────────────────────────────── */

/**
 * เล่นแทนเด็กทั้งวง: ตอบถูกตามโอกาสที่กำหนด ใช้บัตรช่วยคิดเมื่อตอบผิด
 * ใช้ยาเมื่อชีวิตไม่เต็ม ซื้อของเมื่อมีเสบียง ใช้สเก็ตบอร์ดทันทีที่มี
 */
function simulate(n, easy, p, seed) {
  const rng = seeded(seed)
  let s = newGame(n, easy, seed)
  let firstDoor = null
  const invariant = (label) => {
    const energy = s.players.reduce((sum, pl) => sum + pl.energy, 0)
    assert(energy === s.team.energy, `${label}: พลังของทีมไม่เท่าผลรวม`)
    for (const pl of s.players) {
      assert(pl.lives >= 1 && pl.lives <= 3, `${label}: ชีวิต ${pl.lives}`)
      assert(pl.pos >= 0 && pl.pos <= 36, `${label}: ตำแหน่ง ${pl.pos}`)
      assert(pl.items.length <= ENG.BAG_LIMIT, `${label}: กระเป๋าเกิน`)
      assert(pl.supplies >= 0, `${label}: เสบียงติดลบ`)
    }
    assert(ENG.parseSavedGame(JSON.parse(JSON.stringify(s))), `${label}: บันทึกแล้วอ่านกลับไม่ได้`)
  }
  while (!s.cured && s.round <= 80) {
    if (s.players[s.turn].lives < 3) s = ENG.takeMedkit(s)
    const stage = ENG.stageOf(s.players[s.turn].pos)
    const drawn = ENG.nextQuestion(s, stage, rng)
    s = drawn.state
    let ok = rng() < p
    if (!ok && ENG.hasItem(s, 'help')) {
      s = ENG.spendItem(s, 'help')
      ok = rng() < p
    }
    const out = ENG.answerQuestion(s, drawn.question, ok, stage === 'boss' ? 'boss' : 'turn')
    s = out.state
    invariant(`เกม ${seed} รอบ ${s.round}`)
    if (out.cured) break
    if (ok && stage !== 'boss') {
      let steps = 1 + Math.floor(rng() * 6)
      if (ENG.hasItem(s, 'skate')) {
        s = ENG.spendItem(s, 'skate')
        steps += ENG.SKATE_STEPS
      }
      const m = ENG.move(s, steps)
      s = m.state
      if (m.to === 36 && firstDoor === null) firstDoor = s.round
      const land = ENG.landingOf(m.from, m.to)
      if (land === 'rest') s = ENG.rest(s)
      if (land === 'item') s = ENG.openSupply(s, rng).state
      if (land === 'event') s = ENG.drawEvent(s).state
      if (land === 'market') for (const k of ['medkit', 'shield', 'help']) if (!ENG.buyBlocker(s, k)) s = ENG.buy(s, k)
      if (land === 'zombie') {
        const z = ENG.nextQuestion(s, ENG.stageOf(m.to), rng)
        s = ENG.answerQuestion(z.state, z.question, rng() < p, 'zombie').state
      }
      invariant(`เกม ${seed} หลังเดิน`)
    }
    s = ENG.endTurn(s)
  }
  return { cured: s.cured, rounds: s.round, firstDoor }
}

check('จำลอง 600 เกม: ไม่มีสถานะหลุดกติกา และทุกเกมสร้าง Z-CURE ได้', () => {
  let games = 0
  for (const easy of [false, true]) {
    for (const n of [1, 2, 3, 4]) {
      for (let g = 0; g < 50; g += 1) {
        const p = [0.9, 0.7, 0.55][g % 3]
        const r = simulate(n, easy, p, 500 + g * 7 + n)
        assert(r.cured, `เกม ${n} คน ง่าย=${easy} p=${p} ไม่จบใน 80 รอบ`)
        games += 1
      }
    }
  }
  equal(games, 400, 'จำนวนเกมที่จำลอง')
})

check('ความยาวเกมพอดีคาบ: เด็กตอบถูกราว 70% จบใน 10–22 รอบ และภารกิจสุดท้ายไม่จบทันทีที่ถึงประตู', () => {
  for (const n of [1, 2, 4]) {
    const rounds = []
    const afterDoor = []
    for (let g = 0; g < 120; g += 1) {
      const r = simulate(n, false, 0.7, 9000 + g * 3 + n)
      rounds.push(r.rounds)
      if (r.firstDoor !== null) afterDoor.push(r.rounds - r.firstDoor)
    }
    rounds.sort((a, b) => a - b)
    afterDoor.sort((a, b) => a - b)
    const median = rounds[Math.floor(rounds.length / 2)]
    const doorMedian = afterDoor[Math.floor(afterDoor.length / 2)]
    assert(median >= 10 && median <= 22, `${n} คน: ค่ากลางจำนวนรอบ ${median}`)
    assert(doorMedian >= 1 && doorMedian <= 6, `${n} คน: ถึงประตูแล้วอีก ${doorMedian} รอบถึงสร้างยาได้`)
  }
})

/* ── สมุดวัคซีน ───────────────────────────────────────── */

const BOOK = load('zombieRescue/vaccineBook')

check('สมุดวัคซีนมี 50 ช่อง: แม่ 2 3 4 5 10 คูณ 1–10', () => {
  const facts = BOOK.allFacts(BOOK.emptyBook())
  equal(facts.length, 50, 'จำนวนช่อง')
  equal(BOOK.FACT_COUNT, 50, 'FACT_COUNT')
  equal(new Set(facts.map((f) => `${f.each}x${f.groups}`)).size, 50, 'ช่องไม่ซ้ำ')
  assert(facts.every((f) => f.status === 'new'), 'สมุดใหม่ทุกช่องยังไม่เคยเจอ')
})

check('ถูก 2 ครั้งติดกันได้สติกเกอร์ ผิดคั่นกลางต้องเริ่มนับใหม่', () => {
  const q = { each: 3, groups: 7 }
  let r = BOOK.noteAnswer(BOOK.emptyBook(), q, true)
  equal(r.newSticker, false, 'ถูกครั้งแรกยังไม่ได้')
  equal(BOOK.statusOf(BOOK.entryOf(r.book, 3, 7)), 'trying', 'ถูกครั้งเดียวคือกำลังลอง')
  r = BOOK.noteAnswer(r.book, q, false)
  equal(BOOK.statusOf(BOOK.entryOf(r.book, 3, 7)), 'weak', 'ผิดล่าสุดคือยังพลาด')
  r = BOOK.noteAnswer(r.book, q, true)
  equal(r.newSticker, false, 'ถูกหลังผิดเพิ่งนับ 1')
  r = BOOK.noteAnswer(r.book, q, true)
  equal(r.newSticker, true, 'ถูกติดกันครบ 2 ได้สติกเกอร์')
  equal(BOOK.curedCount(r.book), 1, 'นับสติกเกอร์')
  equal(BOOK.curedCount(r.book, 3), 1, 'นับสติกเกอร์ของแม่ 3')
  equal(BOOK.curedCount(r.book, 2), 0, 'แม่อื่นไม่นับ')
  r = BOOK.noteAnswer(r.book, q, true)
  equal(r.newSticker, false, 'ได้แล้วไม่ประกาศซ้ำ')
})

check('สติกเกอร์ไม่หายเมื่อตอบผิดทีหลัง แต่ข้อนั้นกลับไปอยู่ในข้อที่ยังพลาด', () => {
  const q = { each: 5, groups: 9 }
  let book = BOOK.noteAnswer(BOOK.emptyBook(), q, true).book
  book = BOOK.noteAnswer(book, q, true).book
  book = BOOK.noteAnswer(book, q, false).book
  const entry = BOOK.entryOf(book, 5, 9)
  equal(entry.got, true, 'สติกเกอร์ยังอยู่')
  equal(BOOK.statusOf(entry), 'weak', 'ขึ้นเป็นข้อที่ยังพลาด')
  equal(BOOK.weakFacts(book).length, 1, 'อยู่ในรายการข้อที่ยังพลาด')
  book = BOOK.noteAnswer(book, q, true).book
  equal(BOOK.statusOf(BOOK.entryOf(book, 5, 9)), 'cured', 'ถูกอีกครั้งพ้นรายการ')
})

check('สมุดไม่จดข้อนอกสูตรคูณ ป.2 และไม่แก้สมุดเดิม', () => {
  const book = BOOK.emptyBook()
  equal(BOOK.noteAnswer(book, { each: 3, groups: 11 }, true).book, book, 'เกิน 10 กลุ่ม')
  equal(BOOK.noteAnswer(book, { each: 6, groups: 2 }, true).book, book, 'แม่ 6 ไม่อยู่ในสมุด')
  BOOK.noteAnswer(book, { each: 2, groups: 2 }, true)
  equal(Object.keys(book.facts).length, 0, 'สมุดเดิมต้องไม่ถูกแก้')
})

check('ทุกโจทย์ที่เกมสร้างจดลงสมุดได้ (แม่กับจำนวนกลุ่มอยู่ในสมุดเสมอ)', () => {
  const rng = seeded(4242)
  for (const stage of [1, 2, 3, 4, 5, 'boss']) {
    for (let i = 0; i < 2000; i += 1) {
      const q = Q.makeQuestion(stage, rng, { easy: i % 2 === 0 })
      assert(BOOK.isBookFact(q.each, q.groups), `โจทย์ ${stage} ${q.groups}×${q.each} ไม่อยู่ในสมุด`)
    }
  }
})

check('ชุดฝึกข้อที่ยังพลาด: 10 ข้อ ไม่ซ้ำ ข้อที่พลาดมาก่อน เฉลยถูก', () => {
  let book = BOOK.emptyBook()
  const weak = [[3, 7], [4, 8], [10, 6]]
  for (const [each, groups] of weak) book = BOOK.noteAnswer(book, { each, groups }, false).book
  for (let seed = 1; seed <= 200; seed += 1) {
    const set = BOOK.buildFocusSet(book, seeded(seed))
    equal(set.length, Q.PRACTICE_LENGTH, 'จำนวนข้อ')
    const keys = set.map((q) => `${q.each}x${q.groups}`)
    equal(new Set(keys).size, keys.length, 'ไม่มีข้อซ้ำ')
    for (const [each, groups] of weak) assert(keys.includes(`${each}x${groups}`), `ต้องมีข้อที่พลาด ${groups}×${each}`)
    for (const q of set) {
      equal(q.product, q.groups * q.each, 'ผลคูณ')
      assert(Q.checkAnswer(q, { kind: 'number', value: Q.expectedNumber(q) }) || q.ask === 'sentence', 'เฉลยต้องตรวจผ่าน')
      if (q.ask === 'missing') assert(q.groups >= 2, 'ข้อหา □ ต้องมีอย่างน้อย 2 กลุ่ม')
    }
  }
})

check('ชุดฝึกข้อที่ยังพลาดยังได้ 10 ข้อเมื่อได้สติกเกอร์ครบทั้งสมุด', () => {
  let book = BOOK.emptyBook()
  for (const f of BOOK.allFacts(book)) {
    book = BOOK.noteAnswer(book, f, true).book
    book = BOOK.noteAnswer(book, f, true).book
  }
  equal(BOOK.curedCount(book), 50, 'ครบสมุด')
  equal(BOOK.buildFocusSet(book, seeded(9)).length, Q.PRACTICE_LENGTH, 'ยังฝึกได้')
})

check('จำนวนสติกเกอร์ในบันทึกผู้เล่น: เพดานตรงกับสมุด และเก็บค่าที่มากที่สุด', () => {
  const REC = load('services/recordService')
  equal(REC.ZOMBIE_STICKER_MAX, BOOK.FACT_COUNT, 'เพดานต้องเท่าจำนวนช่องในสมุด')
  const player = { records: REC.createEmptyRecords() }
  equal(player.records.zombieStickers, 0, 'เริ่มที่ 0')
  player.records = REC.recordZombieStickers(player, 12)
  equal(player.records.zombieStickers, 12, 'เพิ่มได้')
  player.records = REC.recordZombieStickers(player, 5)
  equal(player.records.zombieStickers, 12, 'ไม่ลดลง')
  player.records = REC.recordZombieStickers(player, 999)
  equal(player.records.zombieStickers, 50, 'ไม่เกินเพดาน')
  equal(REC.recordsOf({ records: { zombieStickers: 80 } }).zombieStickers, 50, 'ค่าที่ถูกแก้ต้องถูกตัด')
})

check('อ่านสมุดที่เก็บไว้: ข้อมูลเสียทิ้งทีละช่อง ไม่ทิ้งทั้งเล่ม', () => {
  const parsed = BOOK.parseBook({
    facts: {
      '2x3': { r: 2, w: 1, s: 2, got: true },
      '3x4': 'เสีย',
      '6x2': { r: 5, w: 0, s: 5, got: true },
      '4x4': { r: -3, w: 1.7, s: 'x', got: 'yes' },
    },
  })
  equal(JSON.stringify(parsed.facts['2x3']), JSON.stringify({ r: 2, w: 1, s: 2, got: true }), 'ช่องดีอยู่ครบ')
  equal(parsed.facts['3x4'], undefined, 'ช่องเสียถูกทิ้ง')
  equal(parsed.facts['6x2'], undefined, 'ช่องนอกสมุดถูกทิ้ง')
  equal(JSON.stringify(parsed.facts['4x4']), JSON.stringify({ r: 0, w: 1, s: 0, got: false }), 'ค่าเพี้ยนถูกตัด')
  equal(Object.keys(BOOK.parseBook(null).facts).length, 0, 'null ได้สมุดเปล่า')
  equal(Object.keys(BOOK.parseBook({ facts: 7 }).facts).length, 0, 'facts ผิดชนิดได้สมุดเปล่า')
})

/* ── ชุดพิมพ์ zombie-rescue.html ───────────────────────── */

/**
 * ชุดพิมพ์กับเกมบนเว็บต้องเป็นเกมเดียวกัน
 * ข้อมูลในชุดพิมพ์สร้างจาก scripts/zombie-kit-data.mjs ถ้าแก้เกมบนเว็บแล้วลืมสร้างใหม่ ตรงนี้จะฟ้อง
 * วิธีแก้: npx tsc -p tsconfig.tests.json --outDir /tmp/logic && node scripts/zombie-kit-data.mjs /tmp/logic
 */
const KIT_HTML = fs.readFileSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'zombie-rescue.html'), 'utf8')
const KIT = (() => {
  const m = KIT_HTML.match(/<script id="kit-data" type="application\/json">([\s\S]*?)<\/script>/)
  return m && m[1].trim() ? JSON.parse(m[1]) : null
})()
const REGEN = ' (สร้างข้อมูลชุดพิมพ์ใหม่ด้วย scripts/zombie-kit-data.mjs)'

check('ชุดพิมพ์: การ์ดโจทย์ 70 ใบ เขตละ 12 และ ดร.ซอมโบ 10 · รหัสไม่ซ้ำ', () => {
  assert(KIT, 'ไม่พบข้อมูลในชุดพิมพ์' + REGEN)
  equal(KIT.cards.length, 70, 'จำนวนการ์ดโจทย์')
  for (const [stage, count] of [[1, 12], [2, 12], [3, 12], [4, 12], [5, 12], ['boss', 10]]) {
    equal(KIT.cards.filter((c) => c.stage === stage).length, count, `กองของเขต ${stage}`)
  }
  const ids = KIT.cards.map((c) => c.id)
  equal(new Set(ids).size, ids.length, 'รหัสการ์ดซ้ำ')
})

check('ชุดพิมพ์: เฉลยทุกใบถูก ใช้แม่ของเขต และโจทย์กับคำใบ้ไม่เผยคำตอบ', () => {
  for (const c of KIT.cards) {
    const q = { ...c, hidden: c.hidden ?? undefined }
    equal(c.product, c.groups * c.each, `${c.id} ผลคูณ`)
    assert(c.groups >= 2 && c.groups <= 10, `${c.id} จำนวนกลุ่ม ${c.groups}`)
    if (typeof c.stage === 'number' && Q.ZONE_TABLE[c.stage]) equal(c.each, Q.ZONE_TABLE[c.stage], `${c.id} แม่ของเขต`)
    equal(c.answer, Q.expectedNumber(q), `${c.id} คำตอบ`)
    if (c.ask === 'sentence') {
      assert(Q.checkAnswer(q, { kind: 'sentence', x: c.each, y: c.groups, z: c.product }), `${c.id} สลับที่ต้องถูก`)
      assert(c.short.includes(`= ${c.product}`), `${c.id} เฉลยบนการ์ด`)
    } else {
      assert(Q.checkAnswer(q, { kind: 'number', value: c.answer }), `${c.id} ตอบถูกต้องถูก`)
      assert(hasNumber(c.short, c.answer), `${c.id} เฉลยบนการ์ด`)
    }
    const given = c.ask === 'missing' ? [c.product, c.hidden === 'each' ? c.groups : c.each] : [c.groups, c.each]
    const answer = c.ask === 'sentence' ? c.product : c.answer
    if (!given.includes(answer)) {
      const shown = c.text + ' ' + (c.visual.text || '') + ' ' + (c.visual.tag || '')
      assert(!hasNumber(shown, answer), `${c.id} โจทย์เผยคำตอบ`)
      assert(!hasNumber(c.hint, answer), `${c.id} คำใบ้เผยคำตอบ`)
    }
    const v = c.visual
    if (v.kind === 'groups') assert(v.groups * v.each <= 30, `${c.id} ภาพเยอะเกิน`)
    if (v.kind === 'array') assert(v.rows * v.cols <= 30, `${c.id} ภาพเยอะเกิน`)
  }
})

check('ชุดพิมพ์ตรงกับเกมบนเว็บ: กระดาน ตัวละคร เขต ราคา การ์ดพิเศษ และเป้าหลอดพลัง', () => {
  equal(KIT.board.svg, ART.boardArt(), 'กระดาน' + REGEN)
  equal(KIT.chars.zombo, ART.charInner('zombo'), 'ตัวละคร' + REGEN)
  equal(JSON.stringify(KIT.zones), JSON.stringify(BOARD.ZONES), 'เขต' + REGEN)
  equal(JSON.stringify(KIT.items), JSON.stringify(ENG.ITEM_INFO), 'อุปกรณ์และราคา' + REGEN)
  equal(JSON.stringify(KIT.events.map((e) => e.key)), JSON.stringify(ENG.EVENT_DECK), 'การ์ดพิเศษ' + REGEN)
  equal(JSON.stringify(KIT.supplyTable), JSON.stringify(ENG.SUPPLY_TABLE), 'กล่องเสบียง' + REGEN)
  equal(KIT.targets.normal.join(), [1, 2, 3, 4].map((n) => ENG.targetFor(n, false)).join(), 'เป้าหลอดพลัง' + REGEN)
  equal(KIT.targets.easy.join(), [1, 2, 3, 4].map((n) => ENG.targetFor(n, true)).join(), 'เป้าหลอดพลังระดับง่าย' + REGEN)
  equal(KIT.rules.maxLives, ENG.MAX_LIVES, 'พลังชีวิต' + REGEN)
  equal(KIT.rules.bag, ENG.BAG_LIMIT, 'กระเป๋า' + REGEN)
})

check('สมุดวัคซีนกระดาษในชุดพิมพ์ใช้แม่และจำนวนครั้งเดียวกับสมุดในเกม', () => {
  assert(KIT && KIT.book, 'ไม่พบข้อมูลสมุดวัคซีนในชุดพิมพ์' + REGEN)
  equal(JSON.stringify(KIT.book.tables), JSON.stringify(Q.TABLES), 'แม่สูตรคูณ' + REGEN)
  equal(KIT.book.streak, BOOK.STREAK_TO_CURE, 'ถูกติดกันกี่ครั้งถึงได้สติกเกอร์' + REGEN)
  equal(KIT.book.count, BOOK.FACT_COUNT, 'จำนวนช่อง' + REGEN)
  for (const t of Q.TABLES) assert(KIT.tableColor[t], `แม่ ${t} ต้องมีสีประจำ`)
})

check('ชาวเมือง 50 คน: ชื่อไม่ซ้ำ หน้าตาไม่ซ้ำ ตรงกับช่องในสมุดทีละช่อง', () => {
  const VIL = load('zombieRescue/villagers')
  equal(VIL.VILLAGER_COUNT, BOOK.FACT_COUNT, 'จำนวนชาวเมืองเท่าจำนวนช่อง')
  const all = Array.from({ length: VIL.VILLAGER_COUNT }, (_, i) => VIL.villagerAt(i))
  equal(new Set(all.map((v) => v.name)).size, 50, 'ชื่อไม่ซ้ำ')
  equal(new Set(all.map((v) => `${v.style}/${v.accessory}`)).size, 50, 'ทรงผมกับของประจำตัวไม่ซ้ำ')
  const idx = BOOK.allFacts(BOOK.emptyBook()).map((f) => VIL.villagerIndexOf(f.each, f.groups))
  equal(JSON.stringify(idx), JSON.stringify(Array.from({ length: 50 }, (_, i) => i)), 'ช่องในสมุดเรียงตรงกับลำดับชาวเมือง')
  equal(JSON.stringify(VIL.villagerAt(7)), JSON.stringify(VIL.villagerAt(7)), 'หน้าตาเดิมทุกครั้ง')
  for (const v of all) {
    for (const svg of [VIL.villagerInner(v), VIL.villagerZombieInner(v)]) {
      assert(!/NaN|undefined|null/.test(svg), `ภาพของน้อง${v.name} มีค่าเสีย`)
      assert(svg.length > 200, `ภาพของน้อง${v.name} ว่าง`)
    }
    assert(VIL.villagerZombieInner(v).includes('#A9DB8C'), `น้อง${v.name} ตอนเป็นซอมบี้ต้องหน้าเขียว`)
    assert(!VIL.villagerInner(v).includes('#A9DB8C'), `น้อง${v.name} ที่หายป่วยต้องไม่หน้าเขียว`)
    assert(VIL.thanksOf(v).length > 0, 'มีคำขอบคุณ')
  }
})

check('สมุดวัคซีนกระดาษใช้ชาวเมืองชุดเดียวกับเกม', () => {
  const VIL = load('zombieRescue/villagers')
  assert(KIT.villagers, 'ไม่พบชาวเมืองในชุดพิมพ์' + REGEN)
  equal(KIT.villagers.viewBox, VIL.VILLAGER_VIEWBOX, 'viewBox' + REGEN)
  for (let i = 0; i < VIL.VILLAGER_COUNT; i += 1) {
    const v = VIL.villagerAt(i)
    equal(KIT.villagers.names[i], v.name, `ชื่อคนที่ ${i}` + REGEN)
    equal(KIT.villagers.zombies[i], VIL.villagerZombieInner(v), `ภาพซอมบี้คนที่ ${i}` + REGEN)
    equal(KIT.villagers.cured[i], VIL.villagerInner(v), `ภาพหายป่วยคนที่ ${i}` + REGEN)
  }
})

check('ลิงก์ใบประกาศ: ชุดพิมพ์อ่านพารามิเตอร์เดียวกับที่เกมส่ง และรับทุกแม่ในสมุด', () => {
  const url = BOOK.certificateUrl(3, '  มิ้นท์ & <ป.2>  ')
  assert(url.startsWith('zombie-rescue.html?'), 'ต้องชี้ไปที่ชุดพิมพ์ข้างแอป')
  const qs = new URLSearchParams(url.split('?')[1])
  equal(qs.get('cert'), '3', 'แม่')
  equal(qs.get('name'), 'มิ้นท์ & <ป.2>', 'ชื่อตัดช่องว่างหัวท้ายแล้วส่งครบ')
  equal(new URLSearchParams(BOOK.certificateUrl('all', 'ก'.repeat(60)).split('?')[1]).get('name').length, 40, 'ชื่อยาวถูกตัดที่ 40')
  assert(KIT_HTML.includes("QS.get('cert')") && KIT_HTML.includes("QS.get('name')"), 'ชุดพิมพ์ต้องอ่าน cert และ name')
  assert(/certHtml\(certWhich, who,/.test(KIT_HTML), 'ชุดพิมพ์ต้องวางชื่อผ่าน certHtml ซึ่ง escape ข้อความ')
  assert(/\(name \? esc\(name\)/.test(KIT_HTML), 'ชื่อบนใบประกาศต้องผ่าน esc()')
  for (const t of Q.TABLES) assert(KIT.book.tables.includes(t), `ชุดพิมพ์ต้องรู้จักแม่ ${t}`)
})

check('ตั้งชื่อตัวละครได้ทุกคน: ไม่ใส่ใช้ชื่อตัวละคร ชื่อซ้ำเติมเลข ยาวเกินถูกตัด', () => {
  const names = ENG.playerNames([
    { hero: 'scientist', name: '  ข้าว  ' },
    { hero: 'doctor', name: 'ข้าว' },
    { hero: 'scout', name: '' },
    { hero: 'dog', name: 'ก'.repeat(30) },
  ])
  equal(names[0], 'ข้าว', 'ตัดช่องว่างหัวท้าย')
  equal(names[1], 'ข้าว 2', 'ชื่อซ้ำเติมเลข')
  equal(names[2], ENG.HERO_INFO.scout.name, 'ไม่ใส่ใช้ชื่อตัวละคร')
  equal(names[3].length, ENG.NAME_MAX, 'ยาวเกินถูกตัด')
  const dup = ENG.playerNames([{ hero: 'scout', name: '' }, { hero: 'doctor', name: ENG.HERO_INFO.scout.name }])
  equal(new Set(dup).size, 2, 'ชื่อที่พิมพ์ซ้ำกับชื่อตัวละครของอีกคนต้องไม่ซ้ำกัน')
  const game = ENG.createGame([{ hero: 'scientist', name: 'มิ้นท์' }, { hero: 'dog', name: 'มิ้นท์' }], false, seeded(1))
  equal(JSON.stringify(game.players.map((p) => p.name)), JSON.stringify(['มิ้นท์', 'มิ้นท์ 2']), 'เกมใช้ชื่อที่ไม่ซ้ำ')
})

check('สุ่มชื่อน่ารักไม่ซ้ำกับคนในวง และไม่ซ้ำชื่อชาวเมือง', () => {
  const VIL = load('zombieRescue/villagers')
  for (const n of ENG.CUTE_NAMES) {
    assert(!VIL.VILLAGER_NAMES.includes(n), `ชื่อ ${n} ซ้ำกับชาวเมือง`)
    assert(Array.from(n).length <= ENG.NAME_MAX, `ชื่อ ${n} ยาวเกิน`)
  }
  const rng = seeded(77)
  for (let i = 0; i < 300; i += 1) {
    const taken = ENG.CUTE_NAMES.slice(0, i % ENG.CUTE_NAMES.length)
    assert(!taken.includes(ENG.randomCuteName(rng, taken)), 'ต้องไม่ซ้ำกับชื่อที่มีคนใช้แล้ว')
  }
  assert(ENG.CUTE_NAMES.includes(ENG.randomCuteName(rng, ENG.CUTE_NAMES)), 'ชื่อถูกใช้หมดก็ยังสุ่มได้')
})

check('⚡ ซอมบี้บุก!: สำรับครบทุกข้อของแม่ ไม่ถามข้อเดิมติดกัน ทุกข้ออยู่ในสมุด', () => {
  const RUSH = load('zombieRescue/rush')
  for (const table of RUSH.RUSH_TABLES) {
    for (let seed = 1; seed <= 30; seed += 1) {
      const next = RUSH.rushDeck(table, seeded(seed * 31 + 7))
      const size = table === 'mix' ? 50 : 10
      const first = Array.from({ length: size }, () => next())
      equal(new Set(first.map((f) => `${f.each}x${f.groups}`)).size, size, `สำรับแรกของ ${table} ต้องครบไม่ซ้ำ`)
      let prev = first[first.length - 1]
      for (let i = 0; i < size * 4; i += 1) {
        const f = next()
        assert(!(f.each === prev.each && f.groups === prev.groups), `${table} ถามข้อเดิมติดกัน`)
        assert(BOOK.isBookFact(f.each, f.groups), 'ทุกข้อต้องอยู่ในสมุดวัคซีน')
        if (table !== 'mix') equal(f.each, table, 'แม่ต้องตรงกับที่เลือก')
        prev = f
      }
    }
  }
})

check('⚡ ซอมบี้บุก!: ดาว เหรียญ และสถิติดีสุดแยกแม่', () => {
  const RUSH = load('zombieRescue/rush')
  equal(RUSH.rushStars(0), 0, 'ไม่ได้ดาว')
  equal(RUSH.rushStars(RUSH.RUSH_STAR_AT[0]), 1, 'ดาวแรก')
  equal(RUSH.rushStars(RUSH.RUSH_STAR_AT[2]), 3, 'ดาวครบ')
  equal(RUSH.rushReward(0), 0, 'ไม่ได้เหรียญ')
  equal(RUSH.rushReward(7), 3, '2 ข้อต่อเหรียญ')
  equal(RUSH.rushReward(999), 15, 'เหรียญมีเพดาน')
  let best = RUSH.parseRushBest({ 2: 8, 3: -1, 5: 'x', mix: 12.7, 7: 40 })
  equal(JSON.stringify(best), JSON.stringify({ 2: 8, mix: 12 }), 'ทิ้งค่าเสียและแม่ที่ไม่มี')
  let r = RUSH.withRushResult(best, 2, 6)
  equal(r.record, false, 'น้อยกว่าเดิมไม่ใช่สถิติใหม่')
  r = RUSH.withRushResult(best, 2, 9)
  equal(r.record, true, 'มากกว่าเดิมคือสถิติใหม่')
  equal(r.best['2'], 9, 'เก็บสถิติใหม่')
  equal(r.best.mix, 12, 'แม่อื่นไม่เปลี่ยน')
  equal(RUSH.withRushResult({}, 3, 0).record, false, 'ได้ 0 ไม่นับเป็นสถิติ')
})

/* ── การต่อเข้ากับแอป ─────────────────────────────────── */

check('ตัวชี้วัดการคูณ ป.2 ต่อท้ายรายการและไม่นับเป็นตัวชี้วัด ป.4', () => {
  const IND = load('teacher/indicators')
  const last = IND.INDICATORS[IND.INDICATORS.length - 1]
  equal(last.id, IND.ZOMBIE_INDICATOR, 'ต้องต่อท้ายรายการ รหัสเก่าของครูจึงอ่านได้เหมือนเดิม')
  equal(last.level, 'review', 'ต้องไม่ใช่ตัวชี้วัดหลักของ ป.4')
  equal(last.verified, false, 'รหัสที่เกมโยงเองต้องบอกครูว่ายังไม่ได้ทาน')
})

check('สมุดสถิติ: นับเกม นับครั้งที่สร้างยาสำเร็จ และนับข้อที่ถูกรวมโหมดฝึก', () => {
  const REC = load('services/recordService')
  const player = { records: REC.createEmptyRecords() }
  player.records = REC.recordZombieRescue(player, { cured: false, correct: 12 })
  player.records = REC.recordZombieRescue(player, { cured: true, correct: 20 })
  player.records = REC.recordZombiePractice(player, 9)
  equal(player.records.zombiePlays, 2, 'เกมที่เล่น')
  equal(player.records.zombieCures, 1, 'สร้างยาสำเร็จ')
  equal(player.records.zombieCorrect, 41, 'ข้อที่ถูกรวม')
  equal(REC.recordsOf({ records: { zombieCorrect: -5 } }).zombieCorrect, 0, 'ค่าที่ถูกแก้ต้องถูกตัด')
})

console.log(`\nZOMBIE RESCUE: ผ่าน ${passed} ข้อ${failures.length ? ` · ไม่ผ่าน ${failures.length} ข้อ` : ''}`)
if (failures.length) {
  for (const failure of failures) console.log(`  ✗ ${failure}`)
  process.exit(1)
}
