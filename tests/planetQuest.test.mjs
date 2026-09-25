/**
 * ชุดทดสอบภารกิจแปดดาว (วิทยาศาสตร์ ป.6 เรื่องระบบสุริยะ)
 *
 * สามเรื่องที่ถ้าพังแล้วเด็กเสียหายจริง
 *
 * หนึ่ง — เนื้อหาต้องไม่ขัดกันเอง คำตอบที่ถูกต้องห้ามไปโผล่ในตัวเลือกผิด
 *         ตัวเลือกห้ามซ้ำ และปีในเส้นเวลาห้ามซ้ำ ไม่งั้นลำดับที่ถูกจะมีได้สองแบบ
 * สอง — ทุกเกมต้องเล่นจบได้ และให้ดาวตามกติกาที่บอกเด็กไว้
 * สาม — ห้องทดลองอุปราคาต้องตรงกับบทเรียน
 *         สุริยุปราคาเกิดเฉพาะวันจันทร์ดับ จันทรุปราคาเกิดเฉพาะวันจันทร์เพ็ญ
 *         และสุริยุปราคาวงแหวนเกิดเมื่อดวงจันทร์อยู่ไกลโลก
 *
 * วิธีใช้
 *   npx tsc -p tsconfig.tests.json --outDir /tmp/logic
 *   node tests/planetQuest.test.mjs /tmp/logic
 */

import path from 'path'
import { createRequire } from 'module'

const OUT = process.argv[2]
if (!OUT) {
  console.error('ใช้: node tests/planetQuest.test.mjs <โฟลเดอร์ JS ที่คอมไพล์แล้ว>')
  process.exit(1)
}

const require = createRequire(import.meta.url)
const load = (name) => require(path.resolve(OUT, name + '.js'))

const C = load('planetQuest/content')
const G = load('planetQuest/games')
const E = load('planetQuest/eclipse')
const St = load('planetQuest/stages')
const Store = load('planetQuest/storage')
const Engine = load('minigames/engine')
const P = load('solar/planets')
const L = load('planetQuest/lessons')
const Bd = load('planetQuest/buddies')

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

const SEEDS = Array.from({ length: 300 }, (_, index) => `seed-${index}`)
const unique = (items) => new Set(items).size === items.length

// ---------- ด่านบนดาว ----------

check('ดาวทั้งแปดดวงมีด่านของตัวเอง และทุกด่านเล่นคนละแบบ', () => {
  assert(St.STAGES.length === 8, `มี ${St.STAGES.length} ด่าน`)
  assert(unique(St.STAGES.map((stage) => stage.planet)), 'มีดาวที่ได้สองด่าน')
  assert(unique(St.STAGES.map((stage) => stage.kind)), 'มีสองดาวที่เล่นเกมแบบเดียวกัน')
  for (const planet of P.PLANETS) {
    const stage = St.stageFor(planet.id)
    assert(stage.planet === planet.id, `${planet.name} ไม่มีด่าน`)
    assert(stage.title && stage.topic && stage.howTo, `${planet.name} ข้อความด่านไม่ครบ`)
  }
})

// ---------- เนื้อหา ----------

check('ลักษณะเด่นของดาวไม่ซ้ำกันและสั้นพอใส่ในไพ่ใบเล็ก', () => {
  const traits = P.PLANETS.map((planet) => C.PLANET_TRAITS[planet.id])
  assert(traits.every(Boolean), 'มีดาวที่ไม่มีลักษณะเด่น')
  assert(unique(traits), 'ลักษณะเด่นซ้ำกัน')
  for (const trait of traits) assert(trait.length <= 16, `"${trait}" ยาวเกินไพ่`)
})

check('ข้อความจริงหรือไม่ มีทั้งจริงและไม่จริงพอให้สุ่มครึ่งต่อครึ่ง และมีคำอธิบายทุกข้อ', () => {
  assert(unique(C.STATEMENTS.map((item) => item.id)), 'รหัสซ้ำ')
  assert(unique(C.STATEMENTS.map((item) => item.text)), 'ข้อความซ้ำ')
  const truths = C.STATEMENTS.filter((item) => item.truth).length
  const myths = C.STATEMENTS.length - truths
  assert(truths >= G.TRUE_FALSE_COUNT / 2 && myths >= G.TRUE_FALSE_COUNT / 2, `จริง ${truths} ไม่จริง ${myths}`)
  for (const item of C.STATEMENTS) assert(item.explain.length > 10, `${item.id} ไม่มีคำอธิบาย`)
})

check('คำถามเลือกตอบทุกข้อ คำตอบที่ถูกไม่โผล่ในตัวเลือกผิด และตัวเลือกไม่ซ้ำ', () => {
  const all = [...C.ASTEROID_QUESTIONS, ...Object.values(C.ECLIPSE_QUESTIONS)]
  assert(unique(all.map((question) => question.id)), 'รหัสคำถามซ้ำ')
  for (const question of all) {
    const options = [question.answer, ...question.wrong]
    assert(unique(options), `${question.id} ตัวเลือกซ้ำ`)
    assert(!question.wrong.includes(question.answer), `${question.id} คำตอบถูกอยู่ในตัวเลือกผิด`)
    assert(question.explain.length > 10, `${question.id} ไม่มีคำอธิบาย`)
  }
  for (const question of C.ASTEROID_QUESTIONS) {
    assert(question.wrong.length === 2, `${question.id} ต้องมีสามตัวเลือกพอดีตามจำนวนอุกกาบาต`)
  }
  for (const question of Object.values(C.ECLIPSE_QUESTIONS)) {
    assert(question.wrong.length === 3, `${question.id} ต้องมีสี่ตัวเลือก`)
  }
})

check('คำถามที่ห้องทดลองอุปราคาเรียกใช้มีอยู่จริง และภารกิจทุกข้อมีเกร็ดตอนทำสำเร็จ', () => {
  for (const key of E.LAB_FINAL_QUESTIONS) assert(C.ECLIPSE_QUESTIONS[key], `ไม่มีคำถาม ${key}`)
  assert(E.LAB_FINAL_QUESTIONS.includes('safe'), 'คำถามเรื่องดูสุริยุปราคาอย่างปลอดภัยหายไป')
  for (const task of E.LAB_TASKS) assert(task.fact && task.fact.length > 10, `${task.id} ไม่มีเกร็ด`)
})

check('เส้นเวลาไม่มีปีซ้ำ ลำดับที่ถูกต้องจึงมีได้แบบเดียว', () => {
  assert(unique(C.TIMELINE_EVENTS.map((event) => event.year)), 'มีสองเหตุการณ์ในปีเดียวกัน')
  assert(unique(C.TIMELINE_EVENTS.map((event) => event.id)), 'รหัสซ้ำ')
  for (const event of C.TIMELINE_EVENTS) {
    assert(event.year >= 1600 && event.year <= 2026, `${event.id} ปี ${event.year} แปลก`)
  }
  const byId = Object.fromEntries(C.TIMELINE_EVENTS.map((event) => [event.id, event.year]))
  // จุดยึดที่ห้ามเพี้ยน เพราะเป็นปีที่อยู่ในหนังสือเรียน
  assert(byId.sputnik === 1957 && byId.apollo === 1969 && byId.gagarin === 1961, 'ปีสำคัญในหนังสือเรียนเพี้ยน')
})

check('ปริศนาทุกข้อมีใบ้สี่ข้อ ตัวเลือกหลอกสามตัว และคำตอบไม่ปนกับตัวหลอก', () => {
  assert(unique(C.RIDDLES.map((riddle) => riddle.id)), 'รหัสซ้ำ')
  assert(unique(C.RIDDLES.map((riddle) => riddle.answer)), 'คำตอบซ้ำ')
  for (const riddle of C.RIDDLES) {
    assert(riddle.clues.length === 4, `${riddle.id} มีใบ้ ${riddle.clues.length} ข้อ`)
    assert(riddle.decoys.length === 3 && unique(riddle.decoys), `${riddle.id} ตัวหลอกไม่ครบหรือซ้ำ`)
    assert(!riddle.decoys.includes(riddle.answer), `${riddle.id} คำตอบอยู่ในตัวหลอก`)
    // ใบ้ต้องไม่บอกคำตอบตรง ๆ ไม่งั้นแค่อ่านชื่อก็ได้คะแนนเต็ม
    for (const clue of riddle.clues) assert(!clue.includes(riddle.answer), `${riddle.id} ใบ้ "${clue}" บอกคำตอบตรง ๆ`)
  }
})

check('ของที่ต้องคัดแยกมีกล่องที่ถูกต้องอยู่จริง และทุกกล่องมีของให้ใส่', () => {
  for (const round of C.SORT_ROUNDS) {
    const bins = round.bins.map((bin) => bin.id)
    assert(unique(bins), `${round.id} กล่องซ้ำ`)
    assert(unique(round.items.map((item) => item.id)), `${round.id} ของซ้ำ`)
    for (const item of round.items) assert(bins.includes(item.bin), `${item.label} ไม่มีกล่องให้ใส่`)
    for (const bin of bins) assert(round.items.some((item) => item.bin === bin), `กล่อง ${bin} ไม่มีของเลย`)
    assert(round.take >= bins.length && round.take <= round.items.length, `${round.id} จำนวนที่หยิบเล่นไม่สมเหตุสมผล`)
  }
  const layers = C.SORT_ROUNDS.find((round) => round.id === 'layers')
  for (const planet of P.PLANETS) {
    const item = layers.items.find((entry) => entry.id === planet.id)
    assert(item, `ไม่มี${planet.name}ในรอบชั้นในชั้นนอก`)
    assert(item.bin === (planet.order <= 4 ? 'inner' : 'outer'), `${planet.name} อยู่ผิดชั้น`)
  }
})

check('เทคโนโลยีอวกาศไม่ซ้ำกัน และประโยชน์ไม่ซ้ำกัน', () => {
  assert(unique(C.TECH_PAIRS.map((pair) => pair.tech)), 'ชื่อเทคโนโลยีซ้ำ')
  assert(unique(C.TECH_PAIRS.map((pair) => pair.use)), 'ประโยชน์ซ้ำ')
  assert(C.TECH_PAIRS.length >= G.CONNECT_PAIRS, 'มีคู่ไม่พอให้เล่นหนึ่งรอบ')
})

// ---------- ตัวสร้างรอบเกม ----------

check('ไพ่จับคู่: หกคู่ สิบสองใบ แต่ละคู่มีชื่อดาวหนึ่งใบกับลักษณะเด่นหนึ่งใบ และกระดานเดิมจับคู่ได้', () => {
  for (const seed of SEEDS.slice(0, 100)) {
    const game = G.buildMemoryGame(seed)
    assert(game.cards.length === 12 && game.pairCount === 6, `ได้ ${game.cards.length} ใบ`)
    assert(unique(game.cards.map((card) => card.id)), 'รหัสไพ่ซ้ำ')
    for (const pairId of new Set(game.cards.map((card) => card.pairId))) {
      const pair = game.cards.filter((card) => card.pairId === pairId)
      assert(pair.length === 2 && pair[0].side !== pair[1].side, `คู่ ${pairId} ผิดรูป`)
      assert(Engine.isMatchingPair(game, pair[0].id, pair[1].id), `กระดานไม่ยอมรับคู่ ${pairId}`)
    }
  }
  assert(JSON.stringify(G.buildMemoryGame('same')) === JSON.stringify(G.buildMemoryGame('same')), 'seed เดิมได้ไพ่คนละชุด')
})

check('จริงหรือไม่: รอบละแปดข้อ จริงสี่ ไม่จริงสี่ ไม่ซ้ำกัน', () => {
  const firsts = new Set()
  for (const seed of SEEDS) {
    const round = G.buildTrueFalseRound(seed)
    assert(round.length === G.TRUE_FALSE_COUNT, `ได้ ${round.length} ข้อ`)
    assert(unique(round.map((item) => item.id)), 'ข้อซ้ำในรอบเดียว')
    assert(round.filter((item) => item.truth).length === G.TRUE_FALSE_COUNT / 2, 'จริงกับไม่จริงไม่เท่ากัน')
    firsts.add(round[0].id)
  }
  assert(firsts.size > 5, 'ข้อแรกของแต่ละรอบแทบไม่เปลี่ยน')
})

check('โยงเส้น: ห้าคู่ และทุกเส้นที่ถูกชี้ไปหาปลายทางที่มีอยู่จริง', () => {
  for (const seed of SEEDS.slice(0, 100)) {
    const game = G.buildConnectGame(seed)
    assert(game.left.length === G.CONNECT_PAIRS && game.right.length === G.CONNECT_PAIRS, 'จำนวนปลายเส้นไม่ครบ')
    for (const node of game.left) {
      const target = game.solution[node.id]
      assert(game.right.some((right) => right.id === target), `${node.id} ชี้ไปหาปลายทางที่ไม่มี`)
    }
    assert(Engine.isConnectComplete(game, game.solution), 'โยงตามเฉลยแล้วกระดานยังไม่ยอมจบ')
  }
})

check('คัดแยก: ทุกกล่องมีของอย่างน้อยหนึ่งชิ้นทุกรอบ และไม่มีของซ้ำ', () => {
  for (const seed of SEEDS) {
    for (const round of G.buildSortRounds(seed)) {
      const spec = C.SORT_ROUNDS.find((entry) => entry.id === round.id)
      assert(round.items.length === spec.take, `${round.id} ได้ ${round.items.length} ชิ้น`)
      assert(unique(round.items.map((item) => item.id)), `${round.id} ของซ้ำ`)
      for (const bin of round.bins) {
        assert(round.items.some((item) => item.bin === bin.id), `${round.id} seed ${seed} กล่อง ${bin.label} ว่าง`)
      }
    }
  }
})

check('ยิงอุกกาบาต: หกคลื่น คลื่นละสามก้อน มีคำตอบถูกหนึ่งก้อนเสมอ', () => {
  for (const seed of SEEDS) {
    const round = G.buildAsteroidRound(seed)
    assert(round.length === G.ASTEROID_COUNT, `ได้ ${round.length} คลื่น`)
    assert(unique(round.map((item) => item.question.id)), 'คำถามซ้ำในรอบเดียว')
    for (const item of round) {
      assert(item.options.length === 3 && unique(item.options), 'ก้อนอุกกาบาตไม่ครบหรือซ้ำ')
      assert(item.options.filter((option) => option === item.question.answer).length === 1, 'ไม่มีก้อนที่ถูก')
    }
  }
})

check('อะไรมาก่อน: หกคู่ ทุกคู่เป็นคนละเหตุการณ์ และเฉลยคือเหตุการณ์ที่ปีน้อยกว่า', () => {
  const sides = new Set()
  for (const seed of SEEDS) {
    const duels = G.buildTimelineDuels(seed)
    assert(duels.length === G.DUEL_COUNT, `ได้ ${duels.length} คู่`)
    for (const duel of duels) {
      assert(duel.left.id !== duel.right.id, 'ประลองเหตุการณ์เดียวกันกับตัวเอง')
      const first = G.earlierOf(duel)
      assert(first.year === Math.min(duel.left.year, duel.right.year), 'เฉลยไม่ใช่เหตุการณ์ที่เกิดก่อน')
      sides.add(first === duel.left ? 'left' : 'right')
    }
    const firstSix = duels.flatMap((duel) => [duel.left.id, duel.right.id])
    assert(unique(firstSix), 'เหตุการณ์ออกซ้ำในรอบเดียว ทั้งที่มีเหตุการณ์พอ')
  }
  assert(sides.size === 2, 'เฉลยอยู่ฝั่งเดียวตลอด เด็กจับทางได้')
  assert(G.duelStars(G.DUEL_COUNT) === 3 && G.duelStars(G.DUEL_COUNT - 2) === 2 && G.duelStars(0) === 1, 'ดาวของการประลองคิดผิด')
})

check('ฉันคือใคร: ห้าข้อ ข้อละสี่ตัวเลือก และคะแนนลดลงตามใบ้ที่ใช้แต่ไม่ต่ำกว่าหนึ่ง', () => {
  for (const seed of SEEDS.slice(0, 100)) {
    const round = G.buildRiddleRound(seed)
    assert(round.length === G.RIDDLE_COUNT && unique(round.map((item) => item.id)), 'ปริศนาไม่ครบหรือซ้ำ')
    for (const item of round) assert(item.options.length === 4 && item.options.includes(item.answer), 'ตัวเลือกไม่ครบ')
  }
  assert(G.riddlePoints(1, 0) === 4, 'ตอบได้จากใบ้แรกต้องได้ 4')
  assert(G.riddlePoints(2, 0) === 3 && G.riddlePoints(1, 1) === 3, 'เปิดใบ้หรือตอบผิดต้องเสีย 1 คะแนน')
  assert(G.riddlePoints(4, 0) === 1 && G.riddlePoints(4, 5) === 1, 'คะแนนต่ำกว่า 1')
  assert(G.RIDDLE_MAX_POINTS === G.RIDDLE_COUNT * 4, 'คะแนนเต็มคิดผิด')
})

check('ดาวของทุกเกมอยู่ระหว่าง 1–3 ดวง ทำดีที่สุดได้ 3 ดวง ทำแย่ที่สุดยังได้ 1 ดวง', () => {
  const cases = [
    [G.memoryStars(0), 3],
    [G.memoryStars(50), 1],
    [G.connectStars(0), 3],
    [G.connectStars(9), 1],
    [G.sortStars(0), 3],
    [G.sortStars(20), 1],
    [G.asteroidStars(0), 3],
    [G.asteroidStars(12), 1],
    [G.duelStars(G.DUEL_COUNT), 3],
    [G.duelStars(0), 1],
    [G.trueFalseStars(G.TRUE_FALSE_COUNT), 3],
    [G.trueFalseStars(0), 1],
    [G.riddleStars(G.RIDDLE_MAX_POINTS), 3],
    [G.riddleStars(G.RIDDLE_COUNT), 1],
    [G.labStars(0), 3],
    [G.labStars(30), 1],
  ]
  cases.forEach(([got, want], index) => assert(got === want, `กรณีที่ ${index + 1} ได้ ${got} ดาว ไม่ใช่ ${want}`))
  for (let mistakes = 0; mistakes < 20; mistakes += 1) {
    assert(G.memoryStars(mistakes) >= G.memoryStars(mistakes + 1), 'พลาดมากขึ้นแต่ได้ดาวมากขึ้น')
    assert(G.sortStars(mistakes) >= G.sortStars(mistakes + 1), 'พลาดมากขึ้นแต่ได้ดาวมากขึ้น')
  }
})

check('คะแนนคอมโบเพิ่มขึ้นเมื่อตอบถูกติดกัน และไม่ติดลบ', () => {
  assert(G.comboPoints(1) === 100 && G.comboPoints(2) === 150 && G.comboPoints(5) === 300, 'คะแนนคอมโบคิดผิด')
  assert(G.comboPoints(0) === 100, 'ยังไม่มีคอมโบแต่คะแนนผิด')
  assert(G.TRUE_FALSE_SECONDS >= 10, 'ให้เวลาดาวศุกร์น้อยเกินไปสำหรับเด็กที่อ่านช้า')
})

// ---------- บทเรียน ----------

check('บทเรียนหกบท ครอบคลุมหัวข้อ ป.6 ครบ ทุกบทมีการ์ดและคำถามเช็กความเข้าใจ', () => {
  assert(L.LESSONS.length === 6, `มี ${L.LESSONS.length} บท`)
  assert(unique(L.LESSONS.map((lesson) => lesson.id)), 'รหัสบทซ้ำ')
  for (const id of ['family', 'stars', 'planets', 'solar-eclipse', 'lunar-eclipse', 'tech']) {
    assert(L.lessonById(id), `ไม่มีบท ${id}`)
  }
  for (const lesson of L.LESSONS) {
    assert(lesson.slides.length >= 3 && lesson.slides.length <= 4, `${lesson.id} มี ${lesson.slides.length} การ์ด`)
    assert(unique(lesson.slides.map((slide) => slide.id)), `${lesson.id} การ์ดซ้ำ`)
    assert(P.isPlanetId(lesson.practice), `${lesson.id} ชี้ไปฝึกที่ดาวที่ไม่มีอยู่`)
    const check = lesson.check
    assert(check.wrong.length === 3 && unique([check.answer, ...check.wrong]), `${lesson.id} ตัวเลือกไม่ครบหรือซ้ำ`)
    for (const slide of lesson.slides) {
      assert(slide.lines.length >= 1 && slide.lines.length <= 3, `${lesson.id}/${slide.id} ยาวเกินไปสำหรับการ์ดเดียว`)
      for (const line of slide.lines) assert(line.length <= 140, `${lesson.id}/${slide.id} มีประโยคยาวเกินไป`)
      if (slide.focus && slide.focus !== 'overview' && slide.focus !== 'sun') {
        assert(P.isPlanetId(slide.focus), `${slide.id} บินไปหาดาวที่ไม่มีอยู่`)
      }
      if (slide.reveals) assert(unique(slide.reveals.map((reveal) => reveal.label)), `${slide.id} ปุ่มเปิดดูซ้ำ`)
    }
  }
})

check('จบบทเรียนแล้วพาไปฝึกที่ดาวที่ใช้ความรู้บทนั้นจริง', () => {
  const kindOf = (id) => St.stageFor(L.lessonById(id).practice).kind
  assert(kindOf('solar-eclipse') === 'eclipse' && kindOf('lunar-eclipse') === 'eclipse', 'บทอุปราคาไม่ได้พาไปห้องทดลองอุปราคา')
  assert(kindOf('tech') === 'connect' || kindOf('tech') === 'timeline', 'บทเทคโนโลยีอวกาศไม่ได้พาไปด่านเทคโนโลยี')
  assert(kindOf('family') === 'sort', 'บทครอบครัวระบบสุริยะไม่ได้พาไปด่านคัดแยกสมาชิก')
})

check('ภาพประกอบบทอุปราคาตรงกับเนื้อหาที่เขียน', () => {
  const solar = L.lessonById('solar-eclipse')
  const lunar = L.lessonById('lunar-eclipse')
  const solarDiagram = solar.slides.find((slide) => slide.diagram?.kind === 'eclipse')
  const lunarDiagram = lunar.slides.find((slide) => slide.diagram?.kind === 'eclipse')
  assert(E.isSolar(E.eclipseAt(solarDiagram.diagram.state).kind), 'ภาพในบทสุริยุปราคาไม่ได้เป็นสุริยุปราคา')
  assert(E.isLunar(E.eclipseAt(lunarDiagram.diagram.state).kind), 'ภาพในบทจันทรุปราคาไม่ได้เป็นจันทรุปราคา')
  const annular = solar.slides.find((slide) => slide.id === 'types')
  assert(E.eclipseAt(annular.diagram.state).kind === 'solar-annular', 'ภาพสุริยุปราคาวงแหวนไม่ได้เป็นวงแหวน')
})

// ---------- ห้องทดลองอุปราคา ----------

check('สุริยุปราคาเกิดเฉพาะวันจันทร์ดับ จันทรุปราคาเกิดเฉพาะวันจันทร์เพ็ญ', () => {
  for (const far of [false, true]) {
    E.MOON_SLOTS.forEach((slot, index) => {
      const kind = E.eclipseAt({ slot: index, far }).kind
      if (E.isSolar(kind)) assert(slot.day === 'แรม 15 ค่ำ', `เกิด${E.ECLIPSE_NAMES[kind]}ในวัน${slot.day}`)
      if (E.isLunar(kind)) assert(slot.day === 'ขึ้น 15 ค่ำ', `เกิด${E.ECLIPSE_NAMES[kind]}ในวัน${slot.day}`)
      if (index !== 0 && index !== 4) assert(kind === 'none', `ตำแหน่ง${slot.name}เกิด${E.ECLIPSE_NAMES[kind]}`)
    })
  }
})

check('ดวงจันทร์ใกล้โลกได้สุริยุปราคาเต็มดวง ไกลโลกได้วงแหวน และจันทรุปราคาเต็มดวงได้ทั้งสองระยะ', () => {
  assert(E.eclipseAt({ slot: 0, far: false }).kind === 'solar-total', 'ใกล้โลกแต่ไม่เต็มดวง')
  assert(E.eclipseAt({ slot: 0, far: true }).kind === 'solar-annular', 'ไกลโลกแต่ไม่เป็นวงแหวน')
  assert(E.eclipseAt({ slot: 4, far: false }).kind === 'lunar-total', 'ใกล้โลกแต่จันทรุปราคาไม่เต็มดวง')
  assert(E.eclipseAt({ slot: 4, far: true }).kind === 'lunar-total', 'ไกลโลกแต่จันทรุปราคาไม่เต็มดวง')
})

check('ภาพท้องฟ้าจากโลกตรงกับชนิดของอุปราคา', () => {
  const total = E.eclipseAt({ slot: 0, far: false }).sky
  const annular = E.eclipseAt({ slot: 0, far: true }).sky
  assert(total.kind === 'day' && total.moonSize > 1 && total.offset === 0, 'เต็มดวงแต่ดวงจันทร์ดูเล็กกว่าดวงอาทิตย์')
  assert(annular.kind === 'day' && annular.moonSize < 1 && annular.offset === 0, 'วงแหวนแต่ดวงจันทร์ดูใหญ่กว่าดวงอาทิตย์')
  const full = E.eclipseAt({ slot: 4, far: false }).sky
  assert(full.kind === 'night' && full.litFraction > 0.99 && full.shadow === 1, 'จันทรุปราคาเต็มดวงแต่ดวงจันทร์ไม่จมเงาทั้งดวง')
  const quarter = E.eclipseAt({ slot: 2, far: false }).sky
  assert(quarter.kind === 'night' && Math.abs(quarter.litFraction - 0.5) < 1e-9 && quarter.waxing, 'ครึ่งดวงข้างขึ้นผิด')
  const waning = E.eclipseAt({ slot: 6, far: false }).sky
  assert(waning.kind === 'night' && !waning.waxing, 'ครึ่งดวงข้างแรมถูกบอกว่าเป็นข้างขึ้น')
})

check('ภารกิจทุกข้อเริ่มจากตำแหน่งที่ยังไม่สำเร็จ และทำสำเร็จได้ด้วยปุ่มที่เปิดให้ใช้', () => {
  for (const task of E.LAB_TASKS) {
    assert(E.eclipseAt(task.start).kind !== task.goal, `${task.id} สำเร็จตั้งแต่ยังไม่ได้ขยับ`)
    const distances = task.allowFar ? [false, true] : [task.start.far]
    const reachable = distances.some((far) =>
      E.MOON_SLOTS.some((_, slot) => E.eclipseAt({ slot, far }).kind === task.goal),
    )
    assert(reachable, `${task.id} ไม่มีทางทำสำเร็จ`)
  }
})

check('ดวงจันทร์วนทวนเข็มนาฬิกา และเลื่อนเลยตำแหน่งสุดท้ายแล้ววนกลับมาเริ่มใหม่', () => {
  assert(E.normalizeSlot(8) === 0 && E.normalizeSlot(-1) === 7, 'เลื่อนเลยขอบแล้วหลุดตำแหน่ง')
  const newMoon = E.moonPoint({ slot: 0, far: false })
  const crescent = E.moonPoint({ slot: 1, far: false })
  const full = E.moonPoint({ slot: 4, far: false })
  assert(newMoon.x < E.LAB.earthX && full.x > E.LAB.earthX, 'จันทร์ดับไม่ได้อยู่ฝั่งดวงอาทิตย์')
  // บนจอแกน y ชี้ลง จากซ้ายเลื่อนลงล่างคือทวนเข็มนาฬิกา
  assert(crescent.y > E.LAB.earthY, 'ดวงจันทร์วนตามเข็มนาฬิกา')
})

check('เงามืดของโลกยาวเลยวงโคจรของดวงจันทร์ ส่วนเงามืดของดวงจันทร์ยาวพอแตะโลกเฉพาะตอนอยู่ใกล้', () => {
  const umbraLength = E.LAB.earthRadius / E.LAB.sunSpread
  assert(umbraLength > E.LAB.farOrbit + E.LAB.moonRadius, 'เงามืดของโลกสั้นกว่าวงโคจร')
  const moonUmbra = E.LAB.moonRadius / E.LAB.sunSpread
  assert(moonUmbra > E.LAB.nearOrbit - E.LAB.earthRadius, 'ตอนใกล้โลกเงามืดของดวงจันทร์ยังไม่ถึงโลก')
  assert(moonUmbra < E.LAB.farOrbit - E.LAB.earthRadius, 'ตอนไกลโลกเงามืดของดวงจันทร์ยังถึงโลก')
  for (const far of [false, true]) {
    for (let slot = 0; slot < 8; slot += 1) {
      const shapes = E.shadowShapes({ slot, far })
      for (const shape of Object.values(shapes)) {
        for (const [x, y] of shape) assert(Number.isFinite(x) && Number.isFinite(y), 'จุดของเงาไม่ใช่ตัวเลข')
      }
    }
  }
})

check('รูปร่างดวงจันทร์บนท้องฟ้าวาดได้ทุกข้างขึ้นข้างแรม จันทร์ดับไม่มีด้านสว่าง', () => {
  assert(E.moonPhasePath(60, 60, 30, 0, true) === null, 'จันทร์ดับยังมีด้านสว่าง')
  for (let slot = 1; slot < 8; slot += 1) {
    const sky = E.eclipseAt({ slot, far: false }).sky
    const path = E.moonPhasePath(60, 60, 30, sky.litFraction, sky.waxing)
    assert(typeof path === 'string' && !/NaN|undefined/.test(path), `ตำแหน่ง ${slot} วาดไม่ได้`)
  }
})

// ---------- ความคืบหน้า ----------

check('ความคืบหน้าที่เสียหรือเป็นของคนอื่นไม่ทำให้พัง และเก็บดาวที่ดีที่สุดไว้', () => {
  for (const raw of [null, 7, 'x', { owner: 'อื่น', best: { mars: 3 } }]) {
    const progress = Store.parseProgress(raw, 'ต้นกล้า')
    assert(Store.clearedCount(progress) === 0 && progress.plays === 0, `อ่าน ${JSON.stringify(raw)} แล้วได้ข้อมูล`)
  }
  const mixed = Store.parseProgress({ owner: 'ต้นกล้า', plays: 4, best: { mars: 2, pluto: 3, venus: 9, earth: 'x' } }, 'ต้นกล้า')
  assert(Store.clearedCount(mixed) === 1 && mixed.best.mars === 2 && mixed.plays === 4, 'อ่านช่องที่ถูกต้องไม่ครบ')
  let progress = Store.emptyProgress('ต้นกล้า')
  progress = Store.recordStage(progress, 'saturn', 3)
  progress = Store.recordStage(progress, 'saturn', 1)
  assert(progress.best.saturn === 3 && progress.plays === 2, 'ดาวที่ดีที่สุดถูกทับ')
  assert(Store.totalStars(progress) === 3, 'รวมดาวผิด')
  const again = Store.parseProgress(JSON.parse(JSON.stringify(progress)), 'ต้นกล้า')
  assert(JSON.stringify(again) === JSON.stringify(progress), 'บันทึกแล้วอ่านกลับได้ไม่เหมือนเดิม')
})

check('ของที่ระลึกและบทเรียนที่อ่านจบถูกเก็บไม่ซ้ำ และทิ้งค่าที่ไม่รู้จัก', () => {
  let progress = Store.emptyProgress('ต้นกล้า')
  progress = Store.markVisited(progress, 'mars')
  progress = Store.markVisited(progress, 'mars')
  progress = Store.markLesson(progress, 'tech')
  progress = Store.markLesson(progress, 'tech')
  assert(progress.visited.length === 1 && progress.lessons.length === 1, 'เก็บซ้ำ')
  const parsed = Store.parseProgress(
    { owner: 'ต้นกล้า', visited: ['mars', 'pluto', 'mars', 5], lessons: ['tech', 'gone', 'tech', null] },
    'ต้นกล้า',
  )
  assert(parsed.visited.join() === 'mars', `ของที่ระลึกอ่านได้ ${parsed.visited.join()}`)
  assert(parsed.lessons.join() === 'tech', `บทเรียนอ่านได้ ${parsed.lessons.join()}`)
  const old = Store.parseProgress({ owner: 'ต้นกล้า', best: { venus: 2 }, plays: 1 }, 'ต้นกล้า')
  assert(old.visited.length === 0 && old.lessons.length === 0 && old.best.venus === 2, 'ข้อมูลรุ่นก่อนที่ยังไม่มีสองช่องนี้อ่านไม่ได้')
})

// ---------- เพื่อนดาว ----------

check('ดาวทั้งแปดมีเพื่อนดาวของตัวเอง ชื่อเล่นไม่ซ้ำ และมีประโยคครบทุกช่อง', () => {
  assert(Bd.BUDDIES.length === P.PLANETS.length, `มีเพื่อนดาว ${Bd.BUDDIES.length} ดวง`)
  for (const planet of P.PLANETS) {
    const buddy = Bd.buddyFor(planet.id)
    assert(buddy.nickname && buddy.intro && buddy.invite, `${planet.name} ขาดชื่อเล่นหรือประโยคแนะนำตัว`)
    assert(buddy.cheers.length >= 3, `${planet.name} มีประโยคเชียร์แค่ ${buddy.cheers.length} แบบ`)
    assert(buddy.oops.length >= 2, `${planet.name} มีประโยคปลอบแค่ ${buddy.oops.length} แบบ`)
  }
  const names = Bd.BUDDIES.map((buddy) => buddy.nickname)
  assert(new Set(names).size === names.length, 'ชื่อเล่นซ้ำกัน')
})

check('ประโยคของเพื่อนดาวสั้นพอใส่กล่องคำพูดบนจอโทรศัพท์ และประโยคเดียวกันไม่อยู่สองที่', () => {
  const seen = new Set()
  for (const buddy of Bd.BUDDIES) {
    for (const line of [buddy.intro, buddy.invite, ...buddy.cheers, ...buddy.oops]) {
      assert(line.length <= 80, `${buddy.nickname}: "${line}" ยาว ${line.length} ตัวอักษร`)
      assert(!seen.has(line), `ประโยค "${line}" ซ้ำ`)
      seen.add(line)
    }
  }
})

check('ประโยคปลอบตอนพลาดไม่มีคำตำหนิ เด็กพลาดแล้วยังอยากเล่นต่อ', () => {
  for (const buddy of Bd.BUDDIES) {
    for (const line of buddy.oops) {
      for (const word of ['ผิด', 'แย่', 'โง่', 'ไม่เก่ง', 'ห่วย']) {
        assert(!line.includes(word), `${buddy.nickname}: "${line}" มีคำว่า "${word}"`)
      }
    }
  }
})

check('ดาวยังหลับจนกว่าจะไปเยี่ยม ได้สามดาวแล้วสวมมงกุฎ และโลกตื่นอยู่เสมอ', () => {
  assert(Bd.buddyStatus('mars', undefined, []) === 'sleep', 'ดาวที่ยังไม่เคยไปไม่หลับ')
  assert(Bd.buddyStatus('mars', undefined, ['mars']) === 'happy', 'ไปเยี่ยมแล้วยังไม่ตื่น')
  assert(Bd.buddyStatus('mars', 2, []) === 'happy', 'เล่นแล้วได้สองดาวยังหลับอยู่')
  assert(Bd.buddyStatus('mars', 3, ['mars']) === 'star', 'ได้สามดาวแล้วไม่ได้มงกุฎ')
  assert(Bd.buddyStatus('earth', undefined, []) === 'happy', 'โลกหลับทั้งที่เราอยู่ที่นี่')
  const awake = Bd.awakePlanets({ saturn: 1 }, ['venus'])
  assert(awake.join() === 'venus,earth,saturn', `ดาวที่ตื่นคือ ${awake.join()}`)
})

check('ประโยคหมุนเวียนไม่ซ้ำติดกัน คอมโบเริ่มพูดตั้งแต่สามข้อ และคำลาเปลี่ยนตามจำนวนดาว', () => {
  const buddy = Bd.buddyFor('saturn')
  for (let count = 0; count < 12; count += 1) {
    assert(Bd.lineFor(buddy.cheers, count) !== Bd.lineFor(buddy.cheers, count + 1), `ข้อ ${count} กับ ${count + 1} พูดซ้ำกัน`)
  }
  assert(Bd.lineFor([], 3) === '', 'รายการว่างทำให้พัง')
  assert(Bd.comboLine(Bd.COMBO_FROM).includes(String(Bd.COMBO_FROM)), 'ประโยคคอมโบไม่บอกจำนวน')
  const byStars = [1, 2, 3].map((stars) => Bd.goodbyeLine(buddy, stars))
  assert(new Set(byStars).size === 3, 'คำลาเหมือนกันทุกจำนวนดาว')
  assert(byStars.every((line) => line.includes(buddy.nickname)), 'คำลาไม่มีชื่อเล่นของดาว')
})

console.log(`ผ่าน ${passed} ข้อ`)
if (failures.length > 0) {
  console.log(`\nไม่ผ่าน ${failures.length} ข้อ`)
  failures.forEach((line, index) => console.log(`  ${index + 1}. ${line}`))
  process.exit(1)
}
console.log('ผ่านทั้งหมด')
