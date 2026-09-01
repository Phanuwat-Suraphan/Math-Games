/**
 * ชุดทดสอบ Safe Zone Guardians
 *
 * สามเรื่องที่ถ้าพังแล้วเด็กเสียหายจริง จึงต้องตรวจทุกครั้งที่แก้โค้ด
 *
 * หนึ่ง — เขาวงกตต้องเดินถึงไอเทมได้ทุกชิ้นเสมอ
 * เขาวงกตสุ่มที่ปิดไอเทมไว้หลังกำแพงคือด่านที่เล่นยังไงก็ไม่จบ
 * ซึ่งเด็กจะโทษตัวเองว่าหาไม่เจอ ไม่ใช่โทษเกม
 *
 * สอง — เดินทะลุกำแพงไม่ได้ และหลอดความร้อนต้องขึ้นลงตามกติกา
 * ทะลุกำแพงทำให้เดินออกไปนอกฉากแล้วหลงอยู่ในความว่างเปล่า
 *
 * สาม — โจทย์คณิตศาสตร์ทุกข้อต้องถูกต้องตามตัวชี้วัด ป.4
 * เด็กที่คิดถูกแล้วถูกบอกว่าผิด จะเลิกเชื่อวิธีคิดของตัวเอง
 * ซึ่งแก้ยากกว่าการสอนเรื่องที่ยังไม่รู้มาก
 *
 * วิธีใช้
 *   npx tsc -p tsconfig.tests.json --outDir /tmp/logic
 *   node tests/safezone.test.mjs /tmp/logic
 */

import path from 'path'
import { createRequire } from 'module'

const OUT = process.argv[2]
if (!OUT) {
  console.error('ใช้: node tests/safezone.test.mjs <โฟลเดอร์ JS ที่คอมไพล์แล้ว>')
  process.exit(1)
}

const require = createRequire(import.meta.url)
const load = (name) => require(path.resolve(OUT, name + '.js'))

const T = load('safezone/types')
const Maze = load('safezone/maze')
const Engine = load('safezone/engine')
const Missions = load('safezone/missions')
const V = load('safezone/vector3')

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

const ITEM_IDS = ['oxygen', 'water', 'seed']

// ---------- เขาวงกต ----------

check('seed เดิมต้องได้เขาวงกตเดิม และ seed ต่างกันต้องได้คนละแบบ', () => {
  const a = Maze.generateMaze('เหมือนกัน')
  const b = Maze.generateMaze('เหมือนกัน')
  assert(JSON.stringify(a) === JSON.stringify(b), 'seed เดิมได้คนละเขาวงกต')

  const seen = new Set()
  for (let index = 0; index < 20; index += 1) {
    seen.add(JSON.stringify(Maze.generateMaze(`s${index}`).walls))
  }
  assert(seen.size >= 18, `20 seed ได้เขาวงกตต่างกันแค่ ${seen.size} แบบ`)
})

check('ทุกช่องที่เดินได้ต้องเดินถึงจากจุดเริ่มต้น ไม่มีห้องที่ถูกปิดตาย', () => {
  for (let index = 0; index < 120; index += 1) {
    const maze = Maze.generateMaze(`เชื่อม-${index}`)
    const distances = Maze.walkDistances(maze, maze.start)
    const stranded = Maze.openCells(maze).filter(
      (cell) => !distances.has(`${cell.col},${cell.row}`),
    )
    assert(stranded.length === 0, `seed ${index} มีช่องที่เดินไปไม่ถึง ${stranded.length} ช่อง`)
  }
})

check('ไอเทมทั้งสามต้องเดินไปถึงได้ ไม่ซ้ำช่องกัน และไม่อยู่ทับจุดเริ่มต้น', () => {
  for (let index = 0; index < 120; index += 1) {
    const maze = Maze.generateMaze(`ไอเทม-${index}`)
    const distances = Maze.walkDistances(maze, maze.start)
    const keys = new Set()

    for (const id of ITEM_IDS) {
      const cell = maze.itemCells[id]
      const key = `${cell.col},${cell.row}`
      assert(distances.has(key), `seed ${index} ไอเทม ${id} เดินไปไม่ถึง`)
      assert(
        key !== `${maze.start.col},${maze.start.row}`,
        `seed ${index} ไอเทม ${id} วางทับจุดเริ่มต้น`,
      )
      keys.add(key)
    }
    assert(keys.size === 3, `seed ${index} ไอเทมวางซ้อนกัน`)
  }
})

check('ไอเทมต้องอยู่ไกลพอที่จะต้องออกสำรวจจริง ไม่ใช่อยู่ข้างตัวตั้งแต่แรก', () => {
  for (let index = 0; index < 60; index += 1) {
    const maze = Maze.generateMaze(`ไกล-${index}`)
    const distances = Maze.walkDistances(maze, maze.start)
    for (const id of ITEM_IDS) {
      const cell = maze.itemCells[id]
      const steps = distances.get(`${cell.col},${cell.row}`)
      assert(steps >= 6, `seed ${index} ไอเทม ${id} ห่างแค่ ${steps} ช่อง`)
    }
  }
})

check('ต้องมีแผ่นทำความเย็นให้แวะพัก และทุกแผ่นต้องเดินไปถึงได้', () => {
  for (let index = 0; index < 60; index += 1) {
    const maze = Maze.generateMaze(`เย็น-${index}`)
    const distances = Maze.walkDistances(maze, maze.start)
    assert(maze.coolerCells.length >= 3, `seed ${index} มีแผ่นทำความเย็นแค่ ${maze.coolerCells.length} แผ่น`)
    for (const cell of maze.coolerCells) {
      assert(
        distances.has(`${cell.col},${cell.row}`),
        `seed ${index} มีแผ่นทำความเย็นที่เดินไปไม่ถึง`,
      )
    }
  }
})

check('ขอบนอกของเขาวงกตต้องปิดสนิท เดินหลุดออกไปนอกฉากไม่ได้', () => {
  for (let index = 0; index < 40; index += 1) {
    const maze = Maze.generateMaze(`ขอบ-${index}`)
    for (let col = 0; col < maze.cols; col += 1) {
      assert(T.wallAt(maze, col, 0), `seed ${index} ขอบบนมีรูที่ ${col}`)
      assert(T.wallAt(maze, col, maze.rows - 1), `seed ${index} ขอบล่างมีรูที่ ${col}`)
    }
    for (let row = 0; row < maze.rows; row += 1) {
      assert(T.wallAt(maze, 0, row), `seed ${index} ขอบซ้ายมีรูที่ ${row}`)
      assert(T.wallAt(maze, maze.cols - 1, row), `seed ${index} ขอบขวามีรูที่ ${row}`)
    }
  }
})

// ---------- การเดินและความร้อน ----------

check('เดินชนกำแพงยังไงก็ไม่ทะลุ แม้จะดันค้างไว้เป็นพันเฟรม', () => {
  const world = Engine.createWorld('ชนกำแพง')
  const directions = [
    { x: 1, z: 0 },
    { x: 0, z: 1 },
    { x: -1, z: 0 },
    { x: 0, z: -1 },
    { x: 0.7, z: 0.7 },
    { x: -0.7, z: 0.7 },
  ]

  for (let frame = 0; frame < 6000; frame += 1) {
    Engine.stepWorld(world, directions[frame % directions.length], 0.016)
    // ปลดโดรนออกทุกครั้ง ไม่งั้นตัวละครจะถูกหยุดแล้วเทสต์นี้ไม่ได้ทดสอบอะไร
    world.challengeItem = null
    world.heat = 0
    assert(
      !Engine.collidesWithWall(world.maze, world.x, world.z),
      `เฟรม ${frame} ตัวละครจมอยู่ในกำแพงที่ (${world.x.toFixed(2)}, ${world.z.toFixed(2)})`,
    )
  }
})

check('เฟรมที่ค้างนานต้องไม่ทำให้กระโดดข้ามกำแพง', () => {
  const world = Engine.createWorld('เฟรมค้าง')
  for (let frame = 0; frame < 300; frame += 1) {
    // สิบวินาทีในเฟรมเดียว คือสิ่งที่เกิดขึ้นจริงตอนสลับแท็บแล้วกลับมา
    Engine.stepWorld(world, { x: 0.7, z: 0.7 }, 10)
    world.challengeItem = null
    assert(
      !Engine.collidesWithWall(world.maze, world.x, world.z),
      `เฟรม ${frame} หลุดออกไปที่ (${world.x.toFixed(2)}, ${world.z.toFixed(2)})`,
    )
  }
})

check('ยืนเฉย ๆ กลางแดดแล้วความร้อนต้องขึ้น และต้องเต็มในเวลาที่ตั้งใจไว้', () => {
  const world = Engine.createWorld('ร้อน')
  // ย้ายออกจากแผ่นทำความเย็นให้แน่ใจว่ากำลังวัดการขึ้นของความร้อนจริง
  assert(!Engine.onCooler(world), 'จุดเริ่มต้นดันอยู่บนแผ่นทำความเย็น')

  let seconds = 0
  while (!Engine.isOverheated(world) && seconds < 600) {
    Engine.stepWorld(world, { x: 0, z: 0 }, 0.05)
    seconds += 0.05
  }
  assert(Engine.isOverheated(world), 'ยืนตากแดดสิบนาทีแล้วความร้อนยังไม่เต็ม')
  assert(seconds > 60, `ความร้อนเต็มในแค่ ${seconds.toFixed(0)} วินาที เร็วเกินไปสำหรับเด็ก`)
  assert(seconds < 240, `ความร้อนเต็มช้าถึง ${seconds.toFixed(0)} วินาที ไม่มีความกดดันเหลือ`)
})

check('ยืนบนแผ่นทำความเย็นแล้วความร้อนต้องลดจนหมด', () => {
  const world = Engine.createWorld('เย็นลง')
  const cooler = world.maze.coolerCells[0]
  world.x = T.cellCenterX(cooler.col)
  world.z = T.cellCenterZ(cooler.row)
  world.heat = T.MAX_HEAT * 0.9

  for (let frame = 0; frame < 400; frame += 1) {
    Engine.stepWorld(world, { x: 0, z: 0 }, 0.05)
  }
  assert(world.cooling, 'ยืนบนแผ่นแล้วเกมไม่รู้ว่ากำลังทำความเย็นอยู่')
  assert(world.heat === 0, `ความร้อนเหลือ ${world.heat.toFixed(1)} ทั้งที่ยืนพักนานแล้ว`)
})

check('ความร้อนต้องอยู่ในช่วง 0 ถึงเต็มเสมอ ไม่ติดลบและไม่ล้น', () => {
  const world = Engine.createWorld('ขอบเขต')
  for (let frame = 0; frame < 3000; frame += 1) {
    Engine.stepWorld(world, { x: Math.sin(frame / 9), z: Math.cos(frame / 13) }, 0.03)
    if (world.challengeItem !== null) Engine.resolveChallenge(world, frame % 3 === 0)
    assert(world.heat >= 0, `เฟรม ${frame} ความร้อนติดลบ`)
    assert(world.heat <= T.MAX_HEAT, `เฟรม ${frame} ความร้อนล้นเพดาน`)
  }
})

// ---------- โดรนและไอเทม ----------

check('เดินเข้าใกล้ไอเทมแล้วโดรนต้องโผล่มาขวางก่อนเสมอ ไม่ใช่เก็บได้เลย', () => {
  const world = Engine.createWorld('โดรน')
  const item = world.items[0]
  world.x = item.x
  world.z = item.z + 1

  Engine.stepWorld(world, { x: 0, z: 0 }, 0.016)
  assert(world.challengeItem === item.id, 'ยืนติดไอเทมแล้วโดรนไม่โผล่')
  assert(!item.collected, 'ได้ไอเทมไปโดยไม่ต้องตอบโจทย์')
})

check('ตอบถูกได้ของ ตอบผิดร้อนขึ้นแต่ของยังอยู่ตรงนั้น', () => {
  const world = Engine.createWorld('ตอบโจทย์')
  const item = world.items[0]
  world.x = item.x
  world.z = item.z
  Engine.stepWorld(world, { x: 0, z: 0 }, 0.016)

  const before = world.heat
  Engine.resolveChallenge(world, false)
  assert(!item.collected, 'ตอบผิดแล้วยังได้ของ')
  assert(world.challengeItem === item.id, 'ตอบผิดแล้วโดรนหายไปเอง')
  assert(world.heat > before, 'ตอบผิดแล้วความร้อนไม่ขึ้น')

  Engine.resolveChallenge(world, true)
  assert(item.collected, 'ตอบถูกแล้วไม่ได้ของ')
  assert(world.challengeItem === null, 'ตอบถูกแล้วโดรนยังขวางอยู่')
})

check('กดถอยออกจากโดรนแล้วต้องออกพ้นระยะจริง ไม่วนขึ้นโจทย์ซ้ำไม่รู้จบ', () => {
  for (let index = 0; index < 60; index += 1) {
    const world = Engine.createWorld(`ถอย-${index}`)
    for (const item of world.items) {
      world.x = item.x
      world.z = item.z
      Engine.stepWorld(world, { x: 0, z: 0 }, 0.016)
      assert(world.challengeItem === item.id, `seed ${index} โดรนไม่โผล่`)

      Engine.leaveChallenge(world)
      assert(world.challengeItem === null, `seed ${index} ถอยแล้วโดรนยังอยู่`)
      assert(
        !Engine.collidesWithWall(world.maze, world.x, world.z),
        `seed ${index} ถอยแล้วไปโผล่ในกำแพง`,
      )

      // เฟรมถัดไปต้องไม่เข้าเงื่อนไขระยะใกล้อีก ไม่งั้นคือวนไม่รู้จบ
      Engine.stepWorld(world, { x: 0, z: 0 }, 0.016)
      assert(
        world.challengeItem === null,
        `seed ${index} ไอเทม ${item.id} ถอยแล้วโจทย์เด้งขึ้นมาใหม่ทันที`,
      )
      item.collected = true
    }
  }
})

check('ความร้อนเต็มแล้วเริ่มใหม่ ของที่เก็บได้แล้วต้องไม่หายไป', () => {
  const world = Engine.createWorld('เริ่มใหม่')
  world.items[0].collected = true
  world.items[1].collected = true
  world.heat = T.MAX_HEAT

  Engine.respawn(world)
  assert(world.heat === 0, 'เริ่มใหม่แล้วความร้อนไม่ถูกรีเซ็ต')
  assert(world.meltdowns === 1, 'ไม่ได้นับจำนวนครั้งที่ความร้อนเต็ม')
  assert(Engine.collectedIds(world).length === 2, 'เริ่มใหม่แล้วของที่เก็บได้หายไป')
  assert(
    world.x === T.cellCenterX(world.maze.start.col) &&
      world.z === T.cellCenterZ(world.maze.start.row),
    'เริ่มใหม่แล้วไม่ได้กลับไปจุดเริ่มต้น',
  )
})

check('เก็บครบสามชิ้นแล้วเกมต้องรู้ว่าจบช่วงที่หนึ่ง', () => {
  const world = Engine.createWorld('ครบ')
  assert(!Engine.allCollected(world), 'เพิ่งเริ่มก็ครบแล้ว')
  world.items.forEach((item) => {
    item.collected = true
  })
  assert(Engine.allCollected(world), 'เก็บครบแล้วเกมยังไม่รู้')
})

// ---------- โจทย์ของโดรน ----------

check('โจทย์โดรนต้องเป็นบวกลบเลขสองหลักที่คำนวณถูก และไม่มีคำตอบติดลบ', () => {
  for (let attempt = 0; attempt < 600; attempt += 1) {
    const puzzle = Missions.generateDronePuzzle('โดรน', ITEM_IDS[attempt % 3], attempt)
    const expected =
      puzzle.operator === '+' ? puzzle.left + puzzle.right : puzzle.left - puzzle.right

    assert(puzzle.answer === expected, `ข้อ ${attempt} คำตอบไม่ตรงกับการคำนวณ`)
    assert(puzzle.answer >= 0, `ข้อ ${attempt} คำตอบติดลบ ซึ่ง ป.4 ยังไม่เรียน`)
    assert(puzzle.left >= 10 && puzzle.left <= 99, `ข้อ ${attempt} ตัวตั้งไม่ใช่เลขสองหลัก`)
    assert(puzzle.right >= 10 && puzzle.right <= 99, `ข้อ ${attempt} ตัวบวกลบไม่ใช่เลขสองหลัก`)
  }
})

check('ตัวเลือกของโดรนต้องมีสี่ตัวไม่ซ้ำ มีคำตอบที่ถูก และไม่มีค่าติดลบ', () => {
  for (let attempt = 0; attempt < 600; attempt += 1) {
    const puzzle = Missions.generateDronePuzzle('ตัวเลือก', ITEM_IDS[attempt % 3], attempt)
    assert(puzzle.choices.length === 4, `ข้อ ${attempt} มีตัวเลือก ${puzzle.choices.length} ตัว`)
    assert(new Set(puzzle.choices).size === 4, `ข้อ ${attempt} ตัวเลือกซ้ำกัน`)
    assert(puzzle.choices.includes(puzzle.answer), `ข้อ ${attempt} ไม่มีคำตอบที่ถูกในตัวเลือก`)
    assert(
      puzzle.choices.every((choice) => choice >= 0),
      `ข้อ ${attempt} มีตัวเลือกติดลบ`,
    )
  }
})

check('ตอบผิดแล้วขอโจทย์ใหม่ ต้องได้คนละข้อ ไม่ใช่ข้อเดิมวนซ้ำ', () => {
  const seen = new Set()
  for (let attempt = 1; attempt <= 12; attempt += 1) {
    seen.add(Missions.generateDronePuzzle('ซ้ำ', 'oxygen', attempt).expression)
  }
  assert(seen.size >= 8, `ขอโจทย์ 12 ครั้งได้แค่ ${seen.size} แบบ`)
})

// ---------- ภารกิจห้องควบคุม ----------

check('ภารกิจทั้งสี่ต้องผ่านการตรวจความถูกต้องทุก seed', () => {
  for (let index = 0; index < 400; index += 1) {
    const missions = Missions.buildMissions(`ภารกิจ-${index}`)
    assert(missions.length === 4, `seed ${index} สร้างภารกิจได้ ${missions.length} ข้อ`)
    for (const mission of missions) {
      const problems = Missions.validateMission(mission)
      assert(problems.length === 0, `seed ${index} ภารกิจ ${mission.id}: ${problems.join(' · ')}`)
    }
  }
})

check('ภารกิจต้องเรียงตามลำดับตัวชี้วัดที่ครูวางไว้', () => {
  const missions = Missions.buildMissions('ลำดับ')
  assert(missions[0].id === 'energy' && missions[0].kind === 'estimate', 'ข้อ 1 ไม่ใช่การประมาณค่า')
  assert(missions[1].id === 'air' && missions[1].kind === 'unknown', 'ข้อ 2 ไม่ใช่ตัวไม่ทราบค่า')
  assert(missions[2].id === 'water' && missions[2].kind === 'twoStep', 'ข้อ 3 ไม่ใช่โจทย์สองขั้นตอน')
  assert(missions[3].id === 'supply' && missions[3].kind === 'builder', 'ข้อ 4 ไม่ใช่การสร้างโจทย์เอง')

  for (const mission of missions) {
    assert(mission.indicator.startsWith('ป.4/'), `ภารกิจ ${mission.id} ไม่ได้ระบุตัวชี้วัด`)
  }
})

check('ป.4/7 — ปัดทีละจำนวนแล้วบวก ต้องได้เท่ากับบวกแล้วค่อยปัดเสมอ', () => {
  for (let index = 0; index < 400; index += 1) {
    const [mission] = Missions.buildMissions(`ประมาณ-${index}`)
    assert(
      mission.answer === Missions.roundToMillion(mission.exact),
      `seed ${index} สองวิธีให้คำตอบต่างกัน (${mission.solar} + ${mission.wind})`,
    )
    // ตัวเลือกต้องห่างกันอย่างน้อยหนึ่งล้าน ไม่งั้นการประมาณค่าแยกไม่ออก
    const sorted = [...mission.choices].sort((a, b) => a - b)
    for (let i = 1; i < sorted.length; i += 1) {
      assert(sorted[i] - sorted[i - 1] >= 1000000, `seed ${index} ตัวเลือกใกล้กันเกินไป`)
    }
  }
})

check('ป.4/8 — ค่าที่หาได้บวกกับค่าที่มีอยู่ ต้องได้เป้าหมายพอดี', () => {
  for (let index = 0; index < 400; index += 1) {
    const mission = Missions.buildMissions(`ตัวไม่ทราบค่า-${index}`)[1]
    assert(
      mission.answer + mission.known === mission.target,
      `seed ${index} ประโยคสัญลักษณ์ไม่สมดุล`,
    )
    assert(mission.answer > 0, `seed ${index} คำตอบไม่ใช่จำนวนนับ`)
    assert(mission.target > 100000, `seed ${index} จำนวนไม่ถึงหลักแสน ไม่ตรงตัวชี้วัด`)
  }
})

check('ป.4/11 — สองขั้นตอนต้องต่อกันได้จริง และน้ำที่เหลือต้องไม่ติดลบ', () => {
  for (let index = 0; index < 400; index += 1) {
    const mission = Missions.buildMissions(`สองขั้น-${index}`)[2]
    assert(
      mission.stepOne === mission.farm + mission.hospital,
      `seed ${index} ขั้นที่ 1 ไม่ตรง`,
    )
    assert(
      mission.answer === mission.total - mission.stepOne,
      `seed ${index} ขั้นที่ 2 ไม่ตรง`,
    )
    assert(mission.answer > 0, `seed ${index} จ่ายน้ำเกินที่มีอยู่`)
    assert(mission.total > 100000, `seed ${index} จำนวนไม่ถึงหลักแสน`)
  }
})

check('ป.4/12 — ทุกชุดที่เด็กเลือกได้ ต้องได้คำตอบที่เป็นจำนวนนับ', () => {
  for (let index = 0; index < 200; index += 1) {
    const mission = Missions.buildMissions(`สร้างโจทย์-${index}`)[3]
    for (const start of mission.startOptions) {
      for (const give of mission.giveOptions) {
        for (const grow of mission.growOptions) {
          const answer = Missions.builderAnswer(start, give, grow)
          assert(
            answer === start - give + grow,
            `seed ${index} สูตรคำตอบไม่ตรงกับโจทย์ที่เล่าไว้`,
          )
          assert(answer > 0, `seed ${index} ชุด ${start}/${give}/${grow} ทำให้เสบียงติดลบ`)
        }
      }
    }
  }
})

check('ตัวจัดรูปตัวเลขต้องใส่ลูกน้ำคั่นหลักพันให้เด็กอ่านหลักได้', () => {
  assert(Missions.formatNumber(1234567) === '1,234,567', 'หลักล้านคั่นผิด')
  assert(Missions.formatNumber(250000) === '250,000', 'หลักแสนคั่นผิด')
  assert(Missions.formatNumber(0) === '0', 'ศูนย์เพี้ยน')
})

// ---------- คณิตศาสตร์ของภาพสามมิติ ----------

check('จุดที่อยู่ตรงหน้ากล้องพอดี ต้องฉายลงกลางจอ', () => {
  const camera = { position: V.vec3(0, 0, 0), yaw: 0, pitch: 0, fov: 1.15 }
  const viewport = { width: 800, height: 600 }
  const screen = V.projectView(V.toView(V.vec3(0, 0, 10), camera), viewport, camera.fov)

  assert(screen !== null, 'จุดข้างหน้ากล้องถูกตัดทิ้ง')
  assert(Math.abs(screen.x - 400) < 0.001, `ฉายไปที่ x = ${screen.x} ไม่ใช่กลางจอ`)
  assert(Math.abs(screen.y - 300) < 0.001, `ฉายไปที่ y = ${screen.y} ไม่ใช่กลางจอ`)
})

check('หันกล้องไปทางไหน จุดในทิศนั้นต้องมาอยู่ข้างหน้า', () => {
  const viewport = { width: 800, height: 600 }
  for (const yaw of [0, Math.PI / 2, Math.PI, -Math.PI / 2, 0.7]) {
    const camera = { position: V.vec3(0, 0, 0), yaw, pitch: 0, fov: 1.15 }
    const ahead = V.vec3(Math.sin(yaw) * 12, 0, Math.cos(yaw) * 12)
    const view = V.toView(ahead, camera)
    assert(view.z > 11.9, `yaw ${yaw.toFixed(2)} จุดข้างหน้ากลับไปอยู่ที่ความลึก ${view.z.toFixed(2)}`)
    const screen = V.projectView(view, viewport, camera.fov)
    assert(Math.abs(screen.x - 400) < 0.001, `yaw ${yaw.toFixed(2)} จุดข้างหน้าไม่อยู่กลางจอ`)
  }
})

check('จุดทางขวาของกล้องต้องฉายไปทางขวาของจอ และจุดที่สูงกว่าต้องอยู่สูงกว่า', () => {
  const camera = { position: V.vec3(0, 0, 0), yaw: 0, pitch: 0, fov: 1.15 }
  const viewport = { width: 800, height: 600 }
  const right = V.projectView(V.toView(V.vec3(3, 0, 10), camera), viewport, camera.fov)
  const up = V.projectView(V.toView(V.vec3(0, 3, 10), camera), viewport, camera.fov)

  assert(right.x > 400, 'จุดทางขวากลับไปอยู่ทางซ้ายของจอ')
  assert(up.y < 300, 'จุดที่สูงกว่ากลับไปอยู่ล่างจอ')
})

check('ก้มกล้องลงแล้ว พื้นที่อยู่ข้างล่างต้องเลื่อนเข้ามาอยู่ในจอ', () => {
  const level = { position: V.vec3(0, 5, 0), yaw: 0, pitch: 0, fov: 1.15 }
  const looking = { position: V.vec3(0, 5, 0), yaw: 0, pitch: 0.5, fov: 1.15 }
  const viewport = { width: 800, height: 600 }

  const ground = V.vec3(0, 0, 10)
  const before = V.projectView(V.toView(ground, level), viewport, level.fov)
  const after = V.projectView(V.toView(ground, looking), viewport, looking.fov)
  assert(after.y < before.y, 'ก้มกล้องลงแล้วพื้นกลับเลื่อนลงไปอีก')
})

check('รูปที่มีมุมอยู่หลังกล้อง ต้องถูกตัดให้เหลือเฉพาะส่วนที่อยู่ข้างหน้า', () => {
  // สี่เหลี่ยมที่พาดผ่านตัวกล้อง ครึ่งหนึ่งอยู่ข้างหน้า อีกครึ่งอยู่ข้างหลัง
  const polygon = [
    V.vec3(-1, 0, -5),
    V.vec3(1, 0, -5),
    V.vec3(1, 0, 5),
    V.vec3(-1, 0, 5),
  ]
  const clipped = V.clipNearPlane(polygon)
  assert(clipped.length >= 3, 'ตัดแล้วเหลือรูปที่วาดไม่ได้')
  assert(
    clipped.every((point) => point.z >= V.NEAR_PLANE - 1e-9),
    'ตัดแล้วยังมีจุดที่อยู่หลังระนาบใกล้',
  )
})

check('รูปที่อยู่หลังกล้องทั้งรูป ต้องหายไปทั้งรูป', () => {
  const behind = [V.vec3(-1, 0, -5), V.vec3(1, 0, -5), V.vec3(1, 0, -3)]
  assert(V.clipNearPlane(behind).length === 0, 'รูปที่อยู่หลังกล้องยังถูกวาด')
})

check('หน้าที่หันเข้าหาดวงอาทิตย์ต้องสว่างกว่าหน้าที่หันหนี และไม่มีหน้าไหนดำสนิท', () => {
  const facing = V.faceBrightness(V.SUN_DIRECTION)
  const away = V.faceBrightness(V.vec3(-V.SUN_DIRECTION.x, -V.SUN_DIRECTION.y, -V.SUN_DIRECTION.z))
  assert(facing > away, 'หน้าที่รับแสงไม่ได้สว่างกว่า')
  assert(away >= 0.5, `หน้าที่หันหนีแสงมืดถึง ${away.toFixed(2)} จนมองไม่เห็นรายละเอียด`)
  assert(facing <= 1, 'ความสว่างล้นเกินหนึ่ง')
})

check('การผสมสีต้องคืนค่าเป็นรูปแบบเดียวกับที่รับเข้ามา จึงนำไปผสมซ้ำได้', () => {
  const mixed = V.mixHex('#000000', '#ffffff', 0.5)
  assert(/^#[0-9a-f]{6}$/.test(mixed), `ผสมแล้วได้ ${mixed} ซึ่งเอาไปผสมต่อไม่ได้`)

  const parsed = V.parseHex(mixed)
  assert(Math.abs(parsed.r - 128) <= 1, `ผสมครึ่งทางแล้วได้ ${parsed.r} ไม่ใช่ราว ๆ 128`)

  const scaled = V.scaleHex('#808080', 0.5)
  assert(/^#[0-9a-f]{6}$/.test(scaled), `หรี่แสงแล้วได้ ${scaled}`)
  assert(V.parseHex(scaled).r === 64, 'หรี่แสงครึ่งหนึ่งแล้วค่าไม่ถูก')

  // ผสมเกินขอบเขตต้องไม่ล้นออกนอกช่วงสี
  assert(V.mixHex('#000000', '#ffffff', 5) === '#ffffff', 'ผสมเกินหนึ่งแล้วล้น')
  assert(V.scaleHex('#ffffff', 10) === '#ffffff', 'เร่งแสงเกินแล้วล้น')
})

console.log(`ผ่าน ${passed} ข้อ`)
if (failures.length > 0) {
  console.log(`\nไม่ผ่าน ${failures.length} ข้อ`)
  failures.forEach((line, index) => console.log(`  ${index + 1}. ${line}`))
  process.exit(1)
}
console.log('ผ่านทั้งหมด')
