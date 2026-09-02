/**
 * ชุดทดสอบโหมดเอาชีวิตรอด
 *
 * เกมแอ็กชันทดสอบยากเพราะทุกอย่างเกิดพร้อมกันบนจอ
 * แต่เครื่องยนต์นี้เป็นฟังก์ชันบริสุทธิ์ล้วน จึงจำลองการเล่นเป็นนาที
 * แล้วตรวจสถานะทีละก้าวได้โดยไม่ต้องเปิดเบราว์เซอร์เลย
 *
 * ข้อที่สำคัญที่สุดคือ "เกมต้องเล่นได้จริง"
 * ถ้าเวลาเดินแล้วไม่มีมอนโผล่ หรือยิงแล้วไม่โดน หรือเก็บคริสตัลแล้วไม่ขึ้นเลเวล
 * เกมจะดูเหมือนทำงานอยู่แต่ไม่มีอะไรเกิดขึ้น ซึ่งไม่มี error ให้เห็นเลย
 *
 * วิธีใช้
 *   npx tsc -p tsconfig.tests.json --outDir /tmp/logic
 *   node tests/survivor.test.mjs /tmp/logic
 */

import path from 'path'
import { createRequire } from 'module'

const OUT = process.argv[2]
if (!OUT) {
  console.error('ใช้: node tests/survivor.test.mjs <โฟลเดอร์ JS ที่คอมไพล์แล้ว>')
  process.exit(1)
}

const require = createRequire(import.meta.url)
const load = (name) => require(path.resolve(OUT, name + '.js'))

const E = load('survivor/engine')
const S = load('survivor/skills')
const T = load('survivor/types')
const W = load('survivor/weapons')
const U = load('survivor/ultimates')
const AV = load('data/avatars')
const ART = load('art/heroes')
const PERK = load('data/perks')
const PS = load('services/perkService')
const SC = load('survivor/scenery')
const R = load('survivor/render')
const STORAGE = load('services/storage')

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

const STILL = { move: { x: 0, y: 0 } }

/**
 * จำลองการเล่น โดยผ่านด่านเลเวลอัปให้อัตโนมัติ
 * คืนสถานะสุดท้ายกับจำนวนครั้งที่เลเวลอัป
 */
function simulate(seconds, { input = STILL, answerCorrect = true, seed = 'ทดสอบ' } = {}) {
  let world = E.createWorld(seed)
  let levelUps = 0
  const steps = Math.round(seconds / E.FIXED_STEP)

  for (let i = 0; i < steps; i += 1) {
    if (world.phase === 'question') {
      world = E.resolveQuestion(world, answerCorrect)
      continue
    }
    if (world.phase === 'choosing') {
      const offer = E.offerSkills(world, E.offerCount(world.lastAnswerCorrect))
      if (offer.length > 0) world = E.takeSkill(world, offer[0].id)
      levelUps += 1
      continue
    }
    if (world.phase === 'dead') break
    world = E.step(world, input)
  }

  return { world, levelUps }
}

// ---------- โลกตั้งต้น ----------

check('โลกใหม่ต้องเริ่มกลางสนาม เลือดเต็ม และยังไม่มีมอน', () => {
  const world = E.createWorld('เริ่ม')
  assert(world.player.pos.x === T.ARENA_WIDTH / 2, 'ไม่ได้อยู่กลางสนามแนวนอน')
  assert(world.player.pos.y === T.ARENA_HEIGHT / 2, 'ไม่ได้อยู่กลางสนามแนวตั้ง')
  assert(world.player.hp === world.player.maxHp, 'เลือดไม่เต็ม')
  assert(world.enemies.length === 0, 'เริ่มมาก็มีมอนแล้ว')
  assert(world.phase === 'playing', `phase เริ่มต้นคือ ${world.phase}`)
})

check('seed เดิมต้องได้การเล่นเดิมทุกครั้ง', () => {
  const a = simulate(12, { seed: 'ซ้ำ' }).world
  const b = simulate(12, { seed: 'ซ้ำ' }).world
  assert(a.kills === b.kills, `จำนวนที่ล้มได้ต่างกัน ${a.kills} กับ ${b.kills}`)
  assert(a.enemies.length === b.enemies.length, 'จำนวนมอนต่างกัน')
  assert(a.player.level === b.player.level, 'เลเวลต่างกัน')
})

// ---------- การเดิน ----------

check('ผู้เล่นต้องเดินได้จริงตามทิศที่กด', () => {
  let world = E.createWorld('เดิน')
  const startX = world.player.pos.x

  for (let i = 0; i < 30; i += 1) {
    world = E.step(world, { move: { x: 1, y: 0 } })
  }
  assert(world.player.pos.x > startX, 'กดขวาแล้วไม่ขยับ')
})

check('ผู้เล่นต้องออกนอกสนามไม่ได้ทุกด้าน', () => {
  const dirs = [
    { x: -1, y: 0 },
    { x: 1, y: 0 },
    { x: 0, y: -1 },
    { x: 0, y: 1 },
  ]

  for (const move of dirs) {
    let world = E.createWorld('ขอบ')
    for (let i = 0; i < 600; i += 1) world = E.step(world, { move })

    const { pos, radius } = world.player
    assert(pos.x >= radius - 0.001, `หลุดขอบซ้าย: ${pos.x}`)
    assert(pos.x <= T.ARENA_WIDTH - radius + 0.001, `หลุดขอบขวา: ${pos.x}`)
    assert(pos.y >= radius - 0.001, `หลุดขอบบน: ${pos.y}`)
    assert(pos.y <= T.ARENA_HEIGHT - radius + 0.001, `หลุดขอบล่าง: ${pos.y}`)
  }
})

check('เดินทแยงต้องไม่เร็วกว่าเดินตรง', () => {
  let straight = E.createWorld('ตรง')
  let diagonal = E.createWorld('ทแยง')

  for (let i = 0; i < 30; i += 1) {
    straight = E.step(straight, { move: { x: 1, y: 0 } })
    diagonal = E.step(diagonal, { move: { x: 1, y: 1 } })
  }

  const straightDist = straight.player.pos.x - T.ARENA_WIDTH / 2
  const diagDist = Math.hypot(
    diagonal.player.pos.x - T.ARENA_WIDTH / 2,
    diagonal.player.pos.y - T.ARENA_HEIGHT / 2,
  )
  assert(
    diagDist <= straightDist + 0.5,
    `เดินทแยงได้ ${diagDist.toFixed(1)} เดินตรงได้ ${straightDist.toFixed(1)} ซึ่งเร็วกว่า`,
  )
})

// ---------- ปุ่มบังคับ ----------

check('WASD ต้องเดินได้ทุกทิศ และตรงกับปุ่มลูกศร', () => {
  const cases = [
    [['KeyW'], { x: 0, y: -1 }],
    [['KeyS'], { x: 0, y: 1 }],
    [['KeyA'], { x: -1, y: 0 }],
    [['KeyD'], { x: 1, y: 0 }],
    [['ArrowUp'], { x: 0, y: -1 }],
    [['ArrowDown'], { x: 0, y: 1 }],
    [['ArrowLeft'], { x: -1, y: 0 }],
    [['ArrowRight'], { x: 1, y: 0 }],
    [['KeyW', 'KeyD'], { x: 1, y: -1 }],
  ]

  for (const [codes, expected] of cases) {
    const move = E.moveFromKeys(new Set(codes))
    assert(
      move.x === expected.x && move.y === expected.y,
      `${codes.join('+')} ได้ (${move.x},${move.y}) ควรเป็น (${expected.x},${expected.y})`,
    )
  }
})

check('กดสองทิศตรงข้ามพร้อมกันต้องหักล้างกัน ไม่ไถลไปทางใดทางหนึ่ง', () => {
  const leftRight = E.moveFromKeys(new Set(['KeyA', 'KeyD']))
  assert(leftRight.x === 0, `ซ้าย+ขวาได้ x = ${leftRight.x}`)

  const upDown = E.moveFromKeys(new Set(['KeyW', 'KeyS']))
  assert(upDown.y === 0, `บน+ล่างได้ y = ${upDown.y}`)
})

check('ไม่กดอะไรเลยต้องอยู่นิ่ง', () => {
  const move = E.moveFromKeys(new Set())
  assert(move.x === 0 && move.y === 0, 'ไม่กดปุ่มแต่ขยับ')
})

check('ปุ่มที่ไม่เกี่ยวกับการเดินต้องไม่ทำอะไร', () => {
  const move = E.moveFromKeys(new Set(['Space', 'Enter', 'KeyQ', 'ShiftLeft']))
  assert(move.x === 0 && move.y === 0, 'ปุ่มอื่นทำให้ขยับ')

  assert(!E.isMoveKey('Space'), 'Space ถูกนับเป็นปุ่มเดิน')
  assert(!E.isMoveKey('KeyQ'), 'Q ถูกนับเป็นปุ่มเดิน')
  assert(E.isMoveKey('KeyW'), 'W ไม่ถูกนับเป็นปุ่มเดิน')
  assert(E.isMoveKey('ArrowUp'), 'ลูกศรขึ้นไม่ถูกนับเป็นปุ่มเดิน')
})

check('รหัสปุ่มต้องเป็นรหัสตำแหน่งบนแป้น ไม่ใช่ตัวอักษรที่พิมพ์ออกมา', () => {
  /*
   * ถ้าเผลอกลับไปใช้ event.key รายการนี้จะกลายเป็น 'w' 'a' 's' 'd'
   * ซึ่งจะพังทันทีเมื่อเด็กเปิดแป้นภาษาไทยหรือ Caps Lock
   * ข้อนี้จึงเฝ้าไม่ให้ถอยกลับไปแบบนั้นโดยไม่ตั้งใจ
   */
  for (const code of E.MOVE_KEY_CODES) {
    assert(
      code.startsWith('Key') || code.startsWith('Arrow'),
      `${code} ไม่ใช่รหัสตำแหน่งปุ่ม`,
    )
  }

  // ตัวอักษรไทยที่ได้จากการกด WASD บนแป้นภาษาไทย ต้องไม่ถูกนับว่าเป็นปุ่มเดิน
  for (const thai of ['ไ', 'ฟ', 'ห', 'ก']) {
    assert(!E.isMoveKey(thai), `ตัวอักษรไทย ${thai} ถูกนับเป็นปุ่มเดิน`)
  }
  // ตัวอักษรอังกฤษตัวเล็กก็ต้องไม่ถูกนับ เพราะนั่นคือค่าจาก event.key
  for (const letter of ['w', 'a', 's', 'd', 'W']) {
    assert(!E.isMoveKey(letter), `ตัวอักษร ${letter} ถูกนับเป็นปุ่มเดิน ซึ่งแปลว่ากลับไปใช้ event.key`)
  }
})

check('ทิศจากปุ่มต้องขับเคลื่อนตัวละครได้จริงในเกม', () => {
  let world = E.createWorld('ปุ่มจริง')
  const startY = world.player.pos.y

  for (let i = 0; i < 30; i += 1) {
    world = E.step(world, { move: E.moveFromKeys(new Set(['KeyW'])) })
  }
  assert(world.player.pos.y < startY, 'กด W แล้วไม่เดินขึ้น')
})

// ---------- มอนสเตอร์ ----------

check('มอนต้องโผล่มาเองเมื่อเวลาผ่านไป', () => {
  const { world } = simulate(6)
  assert(world.enemies.length > 0 || world.kills > 0, 'เล่นไป 6 วินาทีแล้วยังไม่มีมอนเลย')
})

check('มอนต้องเกิดที่ขอบสนาม ไม่ใช่ทับตัวผู้เล่น', () => {
  let world = E.createWorld('เกิด')
  const center = { x: T.ARENA_WIDTH / 2, y: T.ARENA_HEIGHT / 2 }

  for (let i = 0; i < 120; i += 1) {
    const before = world.enemies.map((enemy) => enemy.id)
    world = E.step(world, STILL)
    if (world.phase !== 'playing') break

    for (const enemy of world.enemies) {
      if (before.includes(enemy.id)) continue
      const dist = Math.hypot(enemy.pos.x - center.x, enemy.pos.y - center.y)
      assert(dist > 150, `มอนเกิดห่างจากผู้เล่นแค่ ${dist.toFixed(0)} หน่วย`)
    }
  }
})

check('มอนต้องเดินเข้าหาผู้เล่น', () => {
  let world = E.createWorld('ไล่')
  for (let i = 0; i < 90; i += 1) world = E.step(world, STILL)
  assert(world.enemies.length > 0, 'ไม่มีมอนให้ทดสอบ')

  const target = world.enemies[0]
  const before = Math.hypot(
    target.pos.x - world.player.pos.x,
    target.pos.y - world.player.pos.y,
  )

  for (let i = 0; i < 30; i += 1) world = E.step(world, STILL)
  const after = world.enemies.find((enemy) => enemy.id === target.id)
  if (!after) return

  const now = Math.hypot(after.pos.x - world.player.pos.x, after.pos.y - world.player.pos.y)
  assert(now < before, `มอนไม่ได้เข้าใกล้ขึ้น (${before.toFixed(0)} → ${now.toFixed(0)})`)
})

check('มอนต้องแข็งขึ้นตามเวลา', () => {
  const early = simulate(8).world
  const late = simulate(150).world
  if (early.enemies.length === 0 || late.enemies.length === 0) return

  const earlyHp = Math.max(...early.enemies.map((enemy) => enemy.maxHp))
  const lateHp = Math.max(...late.enemies.map((enemy) => enemy.maxHp))
  assert(lateHp > earlyHp, `เล่นนานแล้วมอนไม่แข็งขึ้น (${earlyHp} → ${lateHp})`)
})

// ---------- ยิงอัตโนมัติ ----------

check('ผู้เล่นต้องยิงเองโดยไม่ต้องกดปุ่ม และยิงโดนจนล้มมอนได้', () => {
  const { world } = simulate(25)
  assert(world.kills > 0, 'เล่นไป 25 วินาทีแล้วยังล้มมอนไม่ได้เลย')
})

check('ไม่มีมอนก็ต้องไม่ยิงทิ้ง', () => {
  let world = E.createWorld('ว่าง')
  for (let i = 0; i < 20; i += 1) world = E.step(world, STILL)
  assert(world.projectiles.length === 0, 'ยิงทั้งที่ยังไม่มีมอน')
})

check('กระสุนต้องหายไปเอง ไม่สะสมจนเครื่องหน่วง', () => {
  const { world } = simulate(90)
  assert(
    world.projectiles.length < 200,
    `กระสุนค้างอยู่ ${world.projectiles.length} ลูก มากผิดปกติ`,
  )
})

check('สกิลกระสุนแตกต้องทำให้ยิงหลายนัดจริง', () => {
  let world = E.createWorld('แตก')
  for (let i = 0; i < 90; i += 1) world = E.step(world, STILL)
  if (world.phase !== 'playing' || world.enemies.length === 0) return

  // ดาบไม่ยิงกระสุน จึงต้องทดสอบกับเวทน้ำแข็งซึ่งยิงกระสุนจริง
  const plain = E.step(
    { ...world, weapons: { ice: 1 }, weaponCooldowns: {}, projectiles: [] },
    STILL,
  )
  const boosted = E.step(
    { ...world, weapons: { ice: 1 }, weaponCooldowns: {}, projectiles: [], skills: { multishot: 3 } },
    STILL,
  )

  assert(plain.projectiles.length > 0, 'เวทน้ำแข็งไม่ยิงเลย')
  assert(
    boosted.projectiles.length > plain.projectiles.length,
    `ปกติยิง ${plain.projectiles.length} นัด มีสกิลยิง ${boosted.projectiles.length} นัด`,
  )
})

// ---------- อาวุธสี่แบบ ----------

/** วางมอนไว้ตรงตำแหน่งที่กำหนด เพื่อทดสอบอาวุธแบบควบคุมได้ */
function withEnemiesAt(seed, positions, hp = 9999) {
  const base = E.createWorld(seed)
  return {
    ...base,
    // ปิดการเกิดมอนใหม่ระหว่างทดสอบ จะได้เหลือแต่ตัวที่วางเอง
    spawnCooldown: 999,
    eliteCooldown: 999,
    enemies: positions.map((pos, index) => ({
      id: 100 + index,
      pos: { ...pos },
      hp,
      maxHp: hp,
      speed: 0,
      radius: 14,
      damage: 0,
      kind: 'number-slime',
      xpValue: 1,
      hitFlash: 0,
      behavior: 'chase',
      clock: 0,
      slowFor: 0,
      burnFor: 0,
      burnDps: 0,
      elite: false,
      splitInto: 0,
      shootCooldown: 99,
    })),
  }
}

check('อาวุธทุกชิ้นต้องมีครบห้าระดับ และแรงขึ้นทุกระดับ', () => {
  for (const weapon of W.WEAPONS) {
    assert(
      weapon.levels.length === W.MAX_WEAPON_LEVEL,
      `${weapon.name} มี ${weapon.levels.length} ระดับ`,
    )
    for (let i = 1; i < weapon.levels.length; i += 1) {
      const now = weapon.levels[i]
      const prev = weapon.levels[i - 1]
      assert(now.damage > prev.damage, `${weapon.name} ระดับ ${i + 1} ไม่แรงขึ้น`)
      assert(now.interval <= prev.interval, `${weapon.name} ระดับ ${i + 1} โจมตีช้าลง`)
      assert(now.range >= prev.range, `${weapon.name} ระดับ ${i + 1} ระยะสั้นลง`)
    }
    assert(weapon.playstyle.length > 10, `${weapon.name} ไม่ได้อธิบายว่าเล่นยังไง`)
  }
})

check('ขอค่าของระดับที่เกินเพดานต้องได้ระดับสูงสุด ไม่ใช่ค่าว่าง', () => {
  const top = W.weaponStats('sword', W.MAX_WEAPON_LEVEL)
  assert(W.weaponStats('sword', 99).damage === top.damage, 'ระดับเกินเพดานไม่ได้ถูกหนีบ')
  assert(W.weaponStats('sword', 0).damage === W.weaponStats('sword', 1).damage, 'ระดับศูนย์ผิด')
  assert(!W.weaponStats('อาวุธปลอม', 1), 'อาวุธปลอมกลับมีค่า')
})

check('เริ่มเกมต้องได้ดาบมาหนึ่งชิ้น ไม่ใช่มือเปล่า', () => {
  const world = E.createWorld('เริ่มอาวุธ')
  assert(world.weapons[W.STARTING_WEAPON] === 1, 'ไม่ได้อาวุธเริ่มต้น')
  assert(Object.keys(world.weapons).length === 1, 'เริ่มมาได้อาวุธหลายชิ้น')
})

check('ดาบต้องฟันโดนทุกตัวที่อยู่ในวง และไม่โดนตัวที่อยู่ไกล', () => {
  const near = W.weaponStats('sword', 1).range - 20
  const world = withEnemiesAt('ดาบ', [
    { x: T.ARENA_WIDTH / 2 + near, y: T.ARENA_HEIGHT / 2 },
    { x: T.ARENA_WIDTH / 2 - near, y: T.ARENA_HEIGHT / 2 },
    { x: T.ARENA_WIDTH / 2 + 300, y: T.ARENA_HEIGHT / 2 },
  ])

  const after = E.step({ ...world, weapons: { sword: 1 }, weaponCooldowns: {} }, STILL)

  assert(after.enemies[0].hp < 9999, 'ตัวใกล้ทางขวาไม่โดนฟัน')
  assert(after.enemies[1].hp < 9999, 'ตัวใกล้ทางซ้ายไม่โดนฟัน')
  assert(after.enemies[2].hp === 9999, 'ตัวที่อยู่ไกลกลับโดนฟันด้วย')
  assert(after.projectiles.length === 0, 'ดาบไม่ควรยิงกระสุนออกไป')
  assert(after.effects.some((e) => e.kind === 'slash'), 'ไม่มีเอฟเฟกต์รอยฟัน')
})

check('เวทไฟฟ้าต้องฟาดทันทีโดยไม่ต้องรอกระสุนบิน และกระโดดต่อหลายตัว', () => {
  const cx = T.ARENA_WIDTH / 2
  const cy = T.ARENA_HEIGHT / 2
  const world = withEnemiesAt('ฟ้า', [
    { x: cx + 90, y: cy },
    { x: cx + 150, y: cy },
    { x: cx + 210, y: cy },
  ])

  const after = E.step({ ...world, weapons: { lightning: 2 }, weaponCooldowns: {} }, STILL)

  const hitCount = after.enemies.filter((enemy) => enemy.hp < 9999).length
  assert(hitCount >= 2, `สายฟ้าโดนแค่ ${hitCount} ตัว ควรกระโดดต่อ`)
  assert(after.projectiles.length === 0, 'สายฟ้าไม่ควรมีกระสุนบิน')
  assert(after.effects.some((e) => e.kind === 'bolt'), 'ไม่มีเอฟเฟกต์สายฟ้า')
})

check('เวทไฟต้องระเบิดเป็นวงและทำให้มอนติดไฟต่อเนื่อง', () => {
  const cx = T.ARENA_WIDTH / 2
  const cy = T.ARENA_HEIGHT / 2
  let world = withEnemiesAt('ไฟ', [
    { x: cx + 60, y: cy },
    { x: cx + 78, y: cy },
  ])
  world = { ...world, weapons: { fire: 1 }, weaponCooldowns: {} }

  // เดินหลายเฟรมให้ลูกไฟบินไปโดน
  for (let i = 0; i < 30; i += 1) world = E.step(world, STILL)

  const burning = world.enemies.filter((enemy) => enemy.burnFor > 0)
  assert(burning.length > 0, 'โดนลูกไฟแล้วไม่ติดไฟเลย')

  // ตัวที่อยู่ข้าง ๆ ต้องโดนแรงระเบิดด้วย แม้ลูกไฟจะไม่ได้พุ่งชนตรง ๆ
  const hurtCount = world.enemies.filter((enemy) => enemy.hp < 9999).length
  assert(hurtCount === 2, `ระเบิดโดน ${hurtCount} ตัว ควรโดนทั้งสองตัว`)

  // ไฟต้องกัดเลือดต่อแม้ไม่ได้ยิงเพิ่ม
  const before = world.enemies[0].hp
  const frozenSpawn = { ...world, weapons: {}, weaponCooldowns: {} }
  let later = frozenSpawn
  for (let i = 0; i < 30; i += 1) later = E.step(later, STILL)
  assert(later.enemies[0].hp < before, 'ติดไฟแล้วเลือดไม่ลดต่อ')
})

check('เวทน้ำแข็งต้องทำให้มอนเดินช้าลงจริง', () => {
  const cx = T.ARENA_WIDTH / 2
  const cy = T.ARENA_HEIGHT / 2
  let world = withEnemiesAt('แข็ง', [{ x: cx + 70, y: cy }])
  world = {
    ...world,
    weapons: { ice: 1 },
    weaponCooldowns: {},
    enemies: [{ ...world.enemies[0], speed: 100 }],
  }

  for (let i = 0; i < 20; i += 1) world = E.step(world, STILL)
  assert(world.enemies[0].slowFor > 0, 'โดนน้ำแข็งแล้วไม่ติดสถานะเดินช้า')

  // เทียบระยะที่เดินได้ระหว่างตัวที่โดนน้ำแข็งกับตัวที่ไม่โดน
  const chilled = { ...world.enemies[0], pos: { x: cx + 200, y: cy } }
  const normal = { ...chilled, id: 777, slowFor: 0 }
  let arena = { ...world, weapons: {}, weaponCooldowns: {}, enemies: [chilled, normal] }
  for (let i = 0; i < 30; i += 1) arena = E.step(arena, STILL)

  const chilledMoved = cx + 200 - arena.enemies[0].pos.x
  const normalMoved = cx + 200 - arena.enemies[1].pos.x
  assert(chilledMoved < normalMoved, `ตัวที่โดนน้ำแข็งเดินได้ ${chilledMoved.toFixed(1)} ตัวปกติ ${normalMoved.toFixed(1)}`)
})

check('อาวุธถือพร้อมกันได้ไม่เกินจำนวนช่อง', () => {
  let world = E.createWorld('ช่อง')
  for (const weapon of W.WEAPONS) {
    world = { ...E.takeSkill(world, weapon.id), phase: 'choosing' }
  }
  assert(
    Object.keys(world.weapons).length <= W.MAX_WEAPON_SLOTS,
    `ถืออาวุธ ${Object.keys(world.weapons).length} ชิ้น เกินช่อง`,
  )
})

check('อัปเกรดอาวุธเกินระดับสูงสุดไม่ได้', () => {
  let world = { ...E.createWorld('อัปเกิน'), phase: 'choosing' }
  for (let i = 0; i < 20; i += 1) {
    world = { ...E.takeSkill(world, 'sword'), phase: 'choosing' }
  }
  assert(world.weapons.sword === W.MAX_WEAPON_LEVEL, `ดาบไประดับ ${world.weapons.sword}`)
})

check('ตัวเลือกตอนเลเวลอัปต้องมีทั้งอาวุธและสกิล ไม่ใช่มีแต่สกิล', () => {
  let sawWeapon = false
  let sawSkill = false

  for (let level = 1; level <= 25; level += 1) {
    const world = { ...E.createWorld(`ผสม${level}`), player: { ...E.createWorld('x').player, level } }
    for (const offer of E.offerSkills(world, 3)) {
      if (offer.kind === 'weapon') sawWeapon = true
      if (offer.kind === 'skill') sawSkill = true
      assert(offer.name.length > 0, 'ตัวเลือกไม่มีชื่อ')
      assert(offer.description.length > 0, 'ตัวเลือกไม่มีคำอธิบาย')
    }
  }
  assert(sawWeapon, 'ไม่เคยเสนออาวุธเลย')
  assert(sawSkill, 'ไม่เคยเสนอสกิลติดตัวเลย')
})

// ---------- พฤติกรรมมอน ----------

check('มอนต้องมีพฤติกรรมหลากหลาย ไม่ใช่เดินตรงเข้าหาเหมือนกันหมด', () => {
  const seen = new Set()
  for (let t = 0; t <= 300; t += 10) {
    const world = { ...E.createWorld(`พฤติ${t}`), time: t }
    for (let i = 0; i < 8; i += 1) {
      const enemy = E.spawnOne(world, `${t}-${i}`)
      seen.add(enemy.behavior)
    }
  }
  assert(seen.size >= 4, `เจอพฤติกรรมแค่ ${seen.size} แบบ: ${[...seen].join(', ')}`)
})

check('มอนตัวใหญ่พิเศษต้องโผล่มาเมื่อเล่นไปสักพัก และถึกกว่ามาก', () => {
  const { world } = simulate(100, { input: { move: { x: 0.6, y: 0.4 } } })
  const everSeen = world.enemies.some((enemy) => enemy.elite)
  const normalHp = Math.max(
    1,
    ...world.enemies.filter((enemy) => !enemy.elite).map((enemy) => enemy.maxHp),
  )

  if (everSeen) {
    const eliteHp = Math.max(...world.enemies.filter((enemy) => enemy.elite).map((e) => e.maxHp))
    assert(eliteHp > normalHp * 2, `ตัวใหญ่พิเศษเลือด ${eliteHp} ตัวปกติ ${normalHp}`)
  }
})

check('สไลม์ใหญ่ตายแล้วต้องแตกเป็นตัวเล็ก', () => {
  const cx = T.ARENA_WIDTH / 2
  const world = withEnemiesAt('แตกตัว', [{ x: cx + 200, y: T.ARENA_HEIGHT / 2 }], 1)
  const splitting = {
    ...world,
    weapons: {},
    weaponCooldowns: {},
    // เลือดเป็นศูนย์แล้ว เฟรมถัดไปต้องตายและแตกตัว
    enemies: [{ ...world.enemies[0], hp: 0, splitInto: 3, speed: 0 }],
  }

  const after = E.step(splitting, STILL)
  assert(after.enemies.length === 3, `แตกได้ ${after.enemies.length} ตัว ควรเป็น 3`)
  assert(after.kills === 1, 'ไม่ได้นับว่าล้มตัวแม่')
  for (const child of after.enemies) {
    assert(child.splitInto === 0, 'ตัวลูกยังแตกต่อได้อีก จะแตกไม่รู้จบ')
  }
})

check('มอนที่ยิงไกลต้องยิงกระสุนใส่ผู้เล่นจริง', () => {
  const cx = T.ARENA_WIDTH / 2
  const cy = T.ARENA_HEIGHT / 2
  let world = withEnemiesAt('ยิงไกล', [{ x: cx + 240, y: cy }])
  world = {
    ...world,
    weapons: {},
    weaponCooldowns: {},
    enemies: [{ ...world.enemies[0], behavior: 'ranged', speed: 20, damage: 10, shootCooldown: 0.1 }],
  }

  let sawShot = false
  for (let i = 0; i < 60; i += 1) {
    world = E.step(world, STILL)
    if (world.enemyShots.length > 0) sawShot = true
  }
  assert(sawShot, 'มอนยิงไกลไม่เคยยิงเลย')
})

check('กระสุนของมอนต้องทำให้ผู้เล่นเสียเลือดได้', () => {
  const base = E.createWorld('โดนยิง')
  const world = {
    ...base,
    spawnCooldown: 999,
    eliteCooldown: 999,
    weapons: {},
    enemyShots: [
      {
        id: 1,
        pos: { ...base.player.pos },
        vel: { x: 0, y: 0 },
        damage: 12,
        radius: 6,
        life: 2,
      },
    ],
  }

  const after = E.step(world, STILL)
  assert(after.player.hp < base.player.hp, 'กระสุนมอนทับตัวแล้วไม่เสียเลือด')
  assert(after.enemyShots.length === 0, 'กระสุนที่โดนแล้วยังอยู่')
})

check('มอนที่พุ่งเป็นช่วงต้องมีจังหวะหยุดให้ตั้งหลัก', () => {
  const cx = T.ARENA_WIDTH / 2
  const cy = T.ARENA_HEIGHT / 2
  let world = withEnemiesAt('พุ่ง', [{ x: cx + 300, y: cy }])
  world = {
    ...world,
    weapons: {},
    weaponCooldowns: {},
    enemies: [{ ...world.enemies[0], behavior: 'dash', speed: 150, clock: 0 }],
  }

  let stillFrames = 0
  let movingFrames = 0
  let previous = world.enemies[0].pos.x

  for (let i = 0; i < 150; i += 1) {
    world = E.step(world, STILL)
    if (world.enemies.length === 0) break
    const now = world.enemies[0].pos.x
    if (Math.abs(now - previous) < 0.01) stillFrames += 1
    else movingFrames += 1
    previous = now
  }

  assert(stillFrames > 10, `หยุดแค่ ${stillFrames} เฟรม ไม่มีจังหวะให้ตั้งหลัก`)
  assert(movingFrames > 10, `พุ่งแค่ ${movingFrames} เฟรม แทบไม่ขยับเลย`)
})

// ---------- คริสตัลและเลเวล ----------

check('ล้มมอนแล้วต้องได้คริสตัล และเก็บแล้วต้องขึ้นเลเวล', () => {
  const { world, levelUps } = simulate(45)
  assert(world.kills > 0, 'ไม่ได้ล้มมอนเลย')
  assert(levelUps > 0, 'ล้มมอนแล้วแต่ไม่เคยขึ้นเลเวลเลย')
  assert(world.player.level > 1, `เลเวลยังเป็น ${world.player.level}`)
})

check('เลเวลอัปต้องหยุดเกมเพื่อถามโจทย์ ไม่ใช่ขึ้นเงียบ ๆ', () => {
  let world = E.createWorld('หยุด')
  let sawQuestion = false

  for (let i = 0; i < 60 * 60; i += 1) {
    if (world.phase === 'question') {
      sawQuestion = true
      break
    }
    if (world.phase === 'dead') break
    world = E.step(world, STILL)
  }
  assert(sawQuestion, 'เล่นจนขึ้นเลเวลแล้วแต่ไม่เคยหยุดถามโจทย์')
})

check('ตอนหยุดถามโจทย์ เวลาในเกมต้องหยุดสนิท', () => {
  const world = { ...E.createWorld('หยุดเวลา'), phase: 'question' }
  const after = E.step(world, { move: { x: 1, y: 0 } })
  assert(after === world, 'เวลาเดินต่อระหว่างถามโจทย์')
})

check('XP ที่ต้องใช้ต้องเพิ่มขึ้นทุกเลเวล', () => {
  for (let level = 1; level < 30; level += 1) {
    assert(
      E.xpNeededFor(level + 1) > E.xpNeededFor(level),
      `เลเวล ${level + 1} ใช้ XP ไม่มากกว่าเลเวล ${level}`,
    )
  }
})

check('XP ส่วนเกินต้องยกไปเลเวลถัดไป ไม่หายไปเฉย ๆ', () => {
  const world = {
    ...E.createWorld('ส่วนเกิน'),
    player: { ...E.createWorld('ส่วนเกิน').player, xp: 12, xpToNext: 5 },
    phase: 'choosing',
  }
  const after = E.takeSkill(world, 'power')
  assert(after.player.xp === 7, `XP เหลือ ${after.player.xp} ควรเป็น 7`)
  assert(after.player.level === 2, `เลเวลเป็น ${after.player.level}`)
})

// ---------- สกิล ----------

check('เสนอสกิลต้องได้ตามจำนวนและไม่ซ้ำกัน', () => {
  const world = E.createWorld('สกิล')
  for (const count of [2, 3]) {
    const offer = E.offerSkills(world, count)
    assert(offer.length === count, `ขอ ${count} ใบ ได้ ${offer.length} ใบ`)
    const ids = offer.map((skill) => skill.id)
    assert(new Set(ids).size === ids.length, `เสนอซ้ำ: ${ids.join(', ')}`)
  }
})

check('ตอบถูกได้เลือกสามใบ ตอบผิดได้สองใบ', () => {
  assert(E.offerCount(true) === 3, 'ตอบถูกไม่ได้สามใบ')
  assert(E.offerCount(false) === 2, 'ตอบผิดไม่ได้สองใบ')
  assert(E.offerCount(false) > 0, 'ตอบผิดแล้วไม่ได้อะไรเลย ซึ่งลงโทษหนักเกินไป')
})

/** สถานะที่เก็บครบทุกอย่างแล้ว ทั้งสกิลและอาวุธ */
function everythingMaxed(seed) {
  const skills = {}
  for (const skill of S.SKILLS) skills[skill.id] = skill.maxStacks
  const weapons = {}
  for (const weapon of W.WEAPONS) weapons[weapon.id] = W.MAX_WEAPON_LEVEL
  return { ...E.createWorld(seed), skills, weapons }
}

check('ของที่เต็มแล้วต้องไม่ถูกเสนออีก', () => {
  assert(E.offerSkills(everythingMaxed('เต็ม'), 3).length === 0, 'เต็มทุกอย่างแล้วยังเสนออีก')

  const partial = { ...E.createWorld('บางส่วน'), skills: { power: 6 } }
  for (const offer of E.offerSkills(partial, 3)) {
    assert(offer.id !== 'power', 'พลังโจมตีเต็มแล้วแต่ยังถูกเสนอ')
  }

  const maxedSword = { ...E.createWorld('ดาบเต็ม'), weapons: { sword: W.MAX_WEAPON_LEVEL } }
  for (const offer of E.offerSkills(maxedSword, 3)) {
    assert(offer.id !== 'sword', 'ดาบเต็มระดับแล้วแต่ยังถูกเสนอ')
  }
})

check('รับสกิลเกินเพดานไม่ได้', () => {
  let world = { ...E.createWorld('เกิน'), phase: 'choosing' }
  for (let i = 0; i < 20; i += 1) {
    world = { ...E.takeSkill(world, 'power'), phase: 'choosing' }
  }
  const cap = S.getSkill('power').maxStacks
  assert(world.skills.power === cap, `สะสมได้ ${world.skills.power} เกินเพดาน ${cap}`)
})

check('รับสกิลที่ไม่มีอยู่จริงต้องไม่ทำให้สถานะเสีย', () => {
  const world = E.createWorld('ปลอม')
  assert(E.takeSkill(world, 'สกิลปลอม') === world, 'สกิลปลอมเปลี่ยนสถานะ')
})

check('ทุกสกิลต้องเปลี่ยนค่าอย่างน้อยหนึ่งอย่างจริง', () => {
  const base = S.statsFrom({})
  for (const skill of S.SKILLS) {
    const boosted = S.statsFrom({ [skill.id]: 1 })
    const changed = Object.keys(base).some((key) => base[key] !== boosted[key])
    assert(changed, `สกิล ${skill.id} เลือกแล้วไม่มีอะไรเปลี่ยนเลย`)
  }
})

check('ไม่มีสกิลไหนทำให้แย่ลง', () => {
  const base = S.statsFrom({})
  // ค่าที่ยิ่งน้อยยิ่งดี ต้องเทียบกลับด้าน
  const lowerIsBetter = new Set(['cooldownMultiplier'])

  for (const skill of S.SKILLS) {
    const boosted = S.statsFrom({ [skill.id]: skill.maxStacks })
    for (const key of Object.keys(base)) {
      if (lowerIsBetter.has(key)) {
        assert(boosted[key] <= base[key], `${skill.id} ทำให้ ${key} แย่ลง`)
      } else {
        assert(boosted[key] >= base[key], `${skill.id} ทำให้ ${key} แย่ลง`)
      }
    }
  }
})

check('ยิงไวต้องมีพื้นล่าง ไม่ถี่จนเฟรมเดียวโจมตีหลายครั้ง', () => {
  const maxed = S.statsFrom({ rapid: S.getSkill('rapid').maxStacks })
  assert(maxed.cooldownMultiplier > 0, 'ตัวคูณเวลารอเป็นศูนย์หรือติดลบ')

  // อาวุธที่โจมตีถี่ที่สุดเมื่ออัปเต็มและมีสกิลยิงไวเต็ม ก็ยังต้องช้ากว่าหนึ่งเฟรม
  for (const weapon of W.WEAPONS) {
    const fastest = W.weaponStats(weapon.id, W.MAX_WEAPON_LEVEL)
    const interval = fastest.interval * maxed.cooldownMultiplier
    assert(
      interval >= E.FIXED_STEP,
      `${weapon.name} โจมตีทุก ${interval.toFixed(3)} วินาที ซึ่งถี่กว่าหนึ่งเฟรม`,
    )
  }
})

check('สกิลพลังชีวิตต้องฟื้นเลือดให้ทันที ไม่ใช่เพิ่มแต่เพดาน', () => {
  const world = E.createWorld('ฟื้น')
  const hurt = {
    ...world,
    player: { ...world.player, hp: 40 },
    phase: 'choosing',
  }
  const after = E.takeSkill(hurt, 'vitality')
  assert(after.player.hp > 40, `เลือดยังเป็น ${after.player.hp}`)
  assert(after.player.maxHp > world.player.maxHp, 'เพดานเลือดไม่ขึ้น')
})

// ---------- ความเสียหายและการตาย ----------

check('มอนชนแล้วต้องเสียเลือด และมีช่วงอมตะสั้น ๆ กันโดนรุมตายทันที', () => {
  let world = E.createWorld('ชน')
  const enemy = {
    id: 999,
    pos: { ...world.player.pos },
    hp: 9999,
    maxHp: 9999,
    speed: 0,
    radius: 16,
    damage: 8,
    kind: 'number-slime',
    xpValue: 1,
    hitFlash: 0,
  }
  world = { ...world, enemies: [enemy, { ...enemy, id: 998 }, { ...enemy, id: 997 }] }

  const hpBefore = world.player.hp
  world = E.step(world, STILL)
  assert(world.player.hp < hpBefore, 'มอนทับตัวแล้วไม่เสียเลือด')

  // ถึงจะมีสามตัวทับกัน ก็ต้องเสียเลือดครั้งเดียวในเฟรมนั้น
  assert(
    world.player.hp === hpBefore - 8,
    `เสียเลือด ${hpBefore - world.player.hp} ทั้งที่ควรเสียครั้งเดียว`,
  )
  assert(world.player.invulnerable > 0, 'ไม่มีช่วงอมตะหลังโดนตี')
})

check('เลือดหมดต้องจบเกม', () => {
  let world = E.createWorld('ตาย')
  world = { ...world, player: { ...world.player, hp: 1 } }
  world = {
    ...world,
    enemies: [
      {
        id: 1,
        pos: { ...world.player.pos },
        hp: 9999,
        maxHp: 9999,
        speed: 0,
        radius: 16,
        damage: 50,
        kind: 'number-slime',
        xpValue: 1,
        hitFlash: 0,
      },
    ],
  }

  world = E.step(world, STILL)
  assert(world.phase === 'dead', `phase คือ ${world.phase}`)
  assert(world.player.hp === 0, `เลือดเหลือ ${world.player.hp} ไม่ควรติดลบ`)
})

check('ตายแล้วเวลาต้องหยุด ไม่เดินต่อ', () => {
  const dead = { ...E.createWorld('หยุดตาย'), phase: 'dead' }
  assert(E.step(dead, STILL) === dead, 'ตายแล้วเวลายังเดิน')
})

// ---------- ก้าวเวลา ----------

check('ก้าวเวลาต้องคงที่ เครื่องช้าเครื่องเร็วต้องเล่นเหมือนกัน', () => {
  let smooth = E.createWorld('เท่ากัน')
  let choppy = E.createWorld('เท่ากัน')

  // เครื่องเร็ว: ก้าวละเฟรม 60 ครั้ง
  for (let i = 0; i < 60; i += 1) smooth = E.advance(smooth, E.FIXED_STEP, STILL)
  // เครื่องช้า: ก้าวละ 3 เฟรม 20 ครั้ง
  for (let i = 0; i < 20; i += 1) choppy = E.advance(choppy, E.FIXED_STEP * 3, STILL)

  assert(
    Math.abs(smooth.time - choppy.time) < 0.001,
    `เวลาต่างกัน ${smooth.time} กับ ${choppy.time}`,
  )
  assert(smooth.kills === choppy.kills, 'ผลการเล่นต่างกันตามความเร็วเครื่อง')
})

check('สลับแท็บไปนานแล้วกลับมา ต้องไม่คำนวณย้อนหลังเป็นพันก้าว', () => {
  const world = E.createWorld('สลับแท็บ')
  const after = E.advance(world, 300, STILL)
  const maxTime = E.MAX_STEPS_PER_FRAME * E.FIXED_STEP + 0.001
  assert(
    after.time <= maxTime,
    `หายไป 5 นาทีแล้วกลับมา เกมเดินไป ${after.time.toFixed(2)} วินาทีรวด`,
  )
})

// ---------- เล่นทั้งรอบ ----------

check('เล่นสามนาทีต้องไม่มีสถานะเพี้ยนและไม่ค้าง', () => {
  const { world } = simulate(180, { input: { move: { x: 0.6, y: 0.4 } } })

  assert(world.player.hp >= 0, `เลือดติดลบ: ${world.player.hp}`)
  assert(world.player.hp <= world.player.maxHp, 'เลือดเกินเพดาน')
  assert(world.player.level >= 1, 'เลเวลต่ำกว่าหนึ่ง')
  assert(Number.isFinite(world.player.pos.x), 'ตำแหน่งกลายเป็น NaN')
  assert(Number.isFinite(world.player.pos.y), 'ตำแหน่งกลายเป็น NaN')
  assert(world.enemies.length < 500, `มอนสะสม ${world.enemies.length} ตัว มากผิดปกติ`)
  assert(world.gems.length < 500, `คริสตัลสะสม ${world.gems.length} เม็ด มากผิดปกติ`)

  for (const enemy of world.enemies) {
    assert(Number.isFinite(enemy.pos.x), `มอน ${enemy.id} ตำแหน่งเป็น NaN`)
    assert(enemy.hp > 0, `มอน ${enemy.id} เลือดหมดแล้วแต่ยังอยู่ในสนาม`)
  }
})

check('ยืนนิ่งเฉย ๆ ต้องตายในที่สุด ไม่ใช่รอดตลอดกาล', () => {
  const { world } = simulate(300, { input: STILL })
  assert(world.phase === 'dead', 'ยืนนิ่งห้านาทีแล้วยังไม่ตาย เกมง่ายเกินไป')
})

check('ตอบผิดทุกครั้งต้องยังเล่นต่อได้ ไม่ใช่ตันทันที', () => {
  const { levelUps } = simulate(60, {
    input: { move: { x: 0.7, y: 0.3 } },
    answerCorrect: false,
  })
  assert(levelUps > 0, 'ตอบผิดแล้วขึ้นเลเวลไม่ได้เลย')
})

check('เก็บสกิลครบทุกใบแล้วต้องยังเล่นต่อได้ ไม่ค้างและไม่วนไม่รู้จบ', () => {
  const base = everythingMaxed('ครบ')
  const world = {
    ...base,
    // จงใจกอง XP ไว้เยอะ เพื่อบังคับให้ขึ้นเลเวลติดกันหลายครั้ง
    player: { ...base.player, xp: 99, xpToNext: 5 },
    phase: 'choosing',
  }

  assert(E.offerSkills(world, 3).length === 0, 'ยังมีของให้เลือกอยู่ ทดสอบผิดกรณี')

  /*
   * การขึ้นเลเวลติดกันหลายครั้งเป็นเรื่องปกติของเกมแนวนี้
   * ถ้าเก็บ XP ไว้เยอะแล้วขึ้นทีเดียวสามเลเวล ก็ต้องได้เลือกสกิลสามครั้ง
   * สิ่งที่ต้องไม่เกิดคือ "วนโดยไม่คืบหน้า"
   * คือขึ้นเลเวลไม่ได้ หรือ XP ไม่ลดลงสักที
   */
  let live = world
  let rounds = 0
  let lastLevel = live.player.level

  while (live.phase === 'choosing' && rounds < 100) {
    live = E.skipSkill(live)
    rounds += 1

    assert(live.player.level > lastLevel, `รอบที่ ${rounds} ข้ามแล้วเลเวลไม่ขึ้น`)
    lastLevel = live.player.level

    if (live.player.xp >= live.player.xpToNext) {
      // ยังมี XP ค้างพอขึ้นอีกเลเวล จำลองว่าเกมถามโจทย์แล้วเด็กตอบ
      live = E.resolveQuestion(live, true)
    }
  }

  assert(live.phase === 'playing', `ออกจากวงวนด้วย phase ${live.phase}`)
  assert(rounds < 100, 'วนเกินร้อยรอบโดยไม่จบ')
  assert(live.player.xp < live.player.xpToNext, 'ออกมาแล้ว XP ยังล้นอยู่ จะเด้งกลับทันที')

  // เดินต่ออีกหลายเฟรมต้องไม่ค้างอยู่ที่หน้าเลือกสกิลโดยไม่มีอะไรให้เลือก
  let stuck = 0
  for (let i = 0; i < 300; i += 1) {
    if (live.phase === 'choosing') {
      stuck += 1
      live = E.skipSkill(live)
      continue
    }
    if (live.phase === 'question') {
      live = E.resolveQuestion(live, true)
      continue
    }
    if (live.phase === 'dead') break
    live = E.step(live, STILL)
  }
  assert(stuck < 60, `ค้างอยู่ที่หน้าเลือกสกิล ${stuck} ครั้ง ซึ่งบ่อยผิดปกติ`)
})

// ---------- ความสมดุล ----------

/** จำลองการเล่นแบบวิ่งวน โดยคุมความแรงของก้านบังคับได้ */
function playCircling(seed, magnitude, maxSeconds = 400) {
  let world = E.createWorld(seed)
  const steps = Math.round(maxSeconds / E.FIXED_STEP)

  for (let i = 0; i < steps; i += 1) {
    if (world.phase === 'question') {
      world = E.resolveQuestion(world, true)
      continue
    }
    if (world.phase === 'choosing') {
      const offer = E.offerSkills(world, 3)
      world = offer.length > 0 ? E.takeSkill(world, offer[0].id) : E.skipSkill(world)
      continue
    }
    if (world.phase === 'dead') break

    const angle = (i / 60) * 1.1
    world = E.step(world, {
      move: { x: Math.cos(angle) * magnitude, y: Math.sin(angle) * magnitude },
    })
  }
  return world
}

check('ก้านบังคับต้องคุมความเร็วได้จริง ไม่ใช่วิ่งเต็มสปีดตลอด', () => {
  let slow = E.createWorld('ช้า')
  let fast = E.createWorld('เร็ว')

  for (let i = 0; i < 30; i += 1) {
    slow = E.step(slow, { move: { x: 0.35, y: 0 } })
    fast = E.step(fast, { move: { x: 1, y: 0 } })
  }

  const slowMoved = slow.player.pos.x - T.ARENA_WIDTH / 2
  const fastMoved = fast.player.pos.x - T.ARENA_WIDTH / 2
  assert(
    slowMoved < fastMoved * 0.6,
    `เอียงก้าน 35% เดินได้ ${slowMoved.toFixed(0)} เต็มก้านได้ ${fastMoved.toFixed(0)} ` +
      'ซึ่งแปลว่าความแรงของก้านถูกทิ้ง',
  )
  assert(slowMoved > 0, 'เอียงก้านเบา ๆ แล้วไม่ขยับเลย')
})

check('ก้านที่เกินความยาวหนึ่งต้องถูกหนีบ ไม่ให้โกงความเร็ว', () => {
  let normal = E.createWorld('ปกติ')
  let cheat = E.createWorld('โกง')

  for (let i = 0; i < 30; i += 1) {
    normal = E.step(normal, { move: { x: 1, y: 0 } })
    cheat = E.step(cheat, { move: { x: 50, y: 0 } })
  }
  assert(
    Math.abs(normal.player.pos.x - cheat.player.pos.x) < 0.001,
    'ส่งค่าก้านเกินหนึ่งแล้ววิ่งเร็วกว่าปกติ',
  )
})

check('เดินหลบต้องได้ผลดีกว่ายืนนิ่ง ทั้งเรื่องเวลาและของที่เก็บได้', () => {
  /*
   * ข้อนี้จับการถดถอยที่เคยเกิดขึ้นจริง
   *
   * ตอนแรกมอนเดินช้ากว่าผู้เล่นมาก (46 เทียบกับ 190)
   * ผู้เล่นที่วิ่งหนีจึงไม่มีมอนเข้าระยะดาบเลย ได้ 1–4 ตัวใน 45 วินาที
   * ส่วนคนที่ยืนนิ่งกลับได้ 32–42 ตัว ซึ่งกลับหัวกลับหางกับที่ควรเป็น
   * ถ้าความเร็วมอนถูกปรับกลับไปช้าเมื่อไร ข้อนี้จะจับได้ทันที
   */
  const seeds = ['ก', 'ข', 'ค']

  let movingKills = 0
  let stillKills = 0
  let movingLevels = 0
  let stillLevels = 0

  for (const seed of seeds) {
    const moving = playCircling(seed, 0.8)
    const still = playCircling(seed, 0)
    movingKills += moving.kills
    stillKills += still.kills
    movingLevels += moving.player.level
    stillLevels += still.player.level
  }

  assert(
    movingKills > stillKills,
    `เดินหลบล้มได้ ${movingKills} ตัว ยืนนิ่งล้มได้ ${stillKills} ตัว ` +
      'การเล่นถูกวิธีต้องได้ผลดีกว่า',
  )
  assert(
    movingLevels >= stillLevels,
    `เดินหลบได้เลเวลรวม ${movingLevels} ยืนนิ่งได้ ${stillLevels}`,
  )
})

check('ผู้เล่นที่เล่นเป็นต้องอยู่ได้นานพอจะได้ลองอาวุธชิ้นที่สอง', () => {
  const seeds = ['ง', 'จ', 'ฉ', 'ช']
  let totalTime = 0
  let sawSecondWeapon = 0

  for (const seed of seeds) {
    const world = playCircling(seed, 0.8)
    totalTime += world.time
    if (Object.keys(world.weapons).length >= 2) sawSecondWeapon += 1
  }

  const average = totalTime / seeds.length
  assert(
    average >= 45,
    `รอดเฉลี่ยแค่ ${average.toFixed(0)} วินาที สั้นเกินกว่าจะสนุก`,
  )
  assert(
    sawSecondWeapon >= seeds.length / 2,
    `ได้อาวุธชิ้นที่สองแค่ ${sawSecondWeapon} จาก ${seeds.length} รอบ`,
  )
})

check('สรุปผลตอนจบต้องให้รางวัลทั้งจากเวลาที่รอดและจำนวนที่ล้มได้', () => {
  const { world } = simulate(60, { input: { move: { x: 0.5, y: 0.5 } } })
  const summary = E.summarize(world)

  assert(summary.survivedSeconds > 0, 'เวลาที่รอดเป็นศูนย์')
  assert(summary.coins > 0, 'ไม่ได้เหรียญเลย')
  assert(summary.level === world.player.level, 'เลเวลในสรุปไม่ตรงกับในเกม')
  assert(summary.kills === world.kills, 'จำนวนที่ล้มได้ไม่ตรง')

  // รอดนานอย่างเดียวโดยไม่ล้มมอนเลย ก็ยังต้องได้เหรียญ
  const passive = E.summarize({ ...world, kills: 0 })
  assert(passive.coins > 0, 'รอดนานแต่ไม่ล้มมอนแล้วได้ศูนย์')
})


// ---------- บอส หีบ และร่างสมบูรณ์ ----------

check('บอสต้องโผล่ที่นาทีแรก และเป็นคนละอย่างกับตัวใหญ่พิเศษ', () => {
  /*
   * เติมเลือดให้เต็มทุกเฟรม เพราะข้อนี้ตรวจ "จังหวะที่บอสโผล่"
   * ไม่ได้ตรวจว่าผู้เล่นรอดถึงนาทีแรกไหม
   *
   * เดิมเขียนไว้ว่าเดินไปหกสิบสองวินาทีแล้วต้องเจอบอส ซึ่งผูกอยู่กับ
   * ความสามารถในการรอดของผู้เล่นจำลองด้วยเมล็ดสุ่มตัวเดียว
   * พอเพิ่มอาวุธใหม่เข้ามา ไพ่ที่จั่วได้เปลี่ยนไป ผู้เล่นเมล็ดนั้นตายที่ 52 วินาที
   * ข้อนี้จึงไม่ผ่าน ทั้งที่เรื่องบอสไม่ได้เปลี่ยนอะไรเลยสักนิด
   *
   * (วัดค่ากลางของเวลารอดจาก 25 เมล็ดแล้ว ขึ้นจาก 143 เป็น 160 วินาที
   *  จึงยืนยันได้ว่าไม่ใช่การถอยหลังของสมดุล แต่เป็นความแปรปรวนรายเมล็ด)
   */
  let world = E.createWorld('บอสนาทีแรก')
  for (let i = 0; i < 62 * 60; i += 1) {
    world = E.step(world, { move: { x: 0.4, y: 0.3 } })
    if (world.phase === 'question') world = E.skipSkill(E.resolveQuestion(world, true))
    world = { ...world, player: { ...world.player, hp: world.player.maxHp } }
    if (world.enemies.some((enemy) => enemy.boss)) break
  }
  const bosses = world.enemies.filter((enemy) => enemy.boss)

  assert(bosses.length > 0 || world.bossesDown > 0, 'เล่นไปเกินหนึ่งนาทีแล้วยังไม่เจอบอสเลย')

  // บอสกับตัวใหญ่พิเศษต้องไม่ใช่ตัวเดียวกัน ไม่งั้นระบบหีบจะพังเงียบ ๆ
  for (const boss of bosses) {
    assert(!boss.elite, 'บอสถูกทำเครื่องหมายเป็นตัวใหญ่พิเศษด้วย ซึ่งไม่ควรซ้อนกัน')
    assert(boss.maxHp > 200, `บอสเลือดแค่ ${boss.maxHp} ซึ่งน้อยเกินกว่าจะเป็นบอส`)
  }
})

check('ล้มบอสแล้วต้องมีหีบตก ไม่ใช่หายไปเฉย ๆ', () => {
  let world = E.createWorld('หีบ')
  // วางบอสเลือดน้อยไว้ติดตัวผู้เล่น แล้วปล่อยให้ดาบฟันจนตาย
  world = {
    ...world,
    enemies: [
      {
        id: 999, pos: { x: world.player.pos.x + 70, y: world.player.pos.y },
        hp: 1, maxHp: 300, speed: 0, radius: 20, damage: 0, kind: 'boss-slime-king',
        xpValue: 40, hitFlash: 0, behavior: 'chase', clock: 0, slowFor: 0,
        burnFor: 0, burnDps: 0, elite: false, boss: true, splitInto: 0, shootCooldown: 9,
      },
    ],
  }

  for (let i = 0; i < 90 && world.phase === 'playing'; i += 1) {
    world = E.step(world, { move: { x: 0, y: 0 } })
  }

  assert(world.bossesDown === 1, `ล้มบอสแล้วนับได้ ${world.bossesDown} ตัว`)
  assert(
    world.pickups.some((pickup) => pickup.kind === 'chest'),
    'ล้มบอสแล้วไม่มีหีบตกเลย ซึ่งตัดทางเข้าถึงร่างสมบูรณ์ทั้งหมด',
  )
})

check('ร่างสมบูรณ์ต้องครบทั้งสามเงื่อนไข ขาดข้อใดข้อหนึ่งไม่ได้', () => {
  const base = E.createWorld('เงื่อนไข')
  const weapon = W.getWeapon('sword')
  const need = weapon.evolution

  // ครบทุกอย่าง
  const ready = {
    ...base,
    weapons: { sword: W.MAX_WEAPON_LEVEL },
    skills: { [need.requiresSkill]: need.requiresStacks },
  }
  assert(E.readyToEvolve(ready).includes('sword'), 'ครบเงื่อนไขแล้วแต่ยังไม่พร้อม')

  // อาวุธยังไม่เต็มระดับ
  const lowWeapon = { ...ready, weapons: { sword: W.MAX_WEAPON_LEVEL - 1 } }
  assert(E.readyToEvolve(lowWeapon).length === 0, 'อาวุธยังไม่เต็มระดับแต่กลับพร้อม')

  // ยังไม่มีสกิลคู่ควบ
  const noSkill = { ...ready, skills: {} }
  assert(E.readyToEvolve(noSkill).length === 0, 'ไม่มีสกิลคู่ควบแต่กลับพร้อม')

  // สมบูรณ์ไปแล้วต้องไม่พร้อมซ้ำ
  const done = { ...ready, evolved: ['sword'] }
  assert(E.readyToEvolve(done).length === 0, 'อาวุธที่สมบูรณ์แล้วยังถูกนับว่าพร้อมอีก')
})

check('เก็บหีบไว้ก่อนได้ แล้วต้องทำงานเองทันทีที่อาวุธพร้อม', () => {
  /*
   * ข้อนี้จับข้อจำกัดที่เคยทำให้ระบบทั้งระบบเข้าไม่ถึง
   *
   * ตอนแรกหีบใช้ได้เฉพาะ "ตอนที่มีอาวุธพร้อมพอดี" ถ้ายังไม่พร้อมก็เสียไปเปล่า
   * จำลอง 40 รอบแล้วได้ร่างสมบูรณ์แค่ 3 ครั้ง ทั้งที่ล้มบอสได้หลายตัว
   * เพราะจังหวะที่บอสตายกับจังหวะที่อาวุธเต็มระดับแทบไม่เคยตรงกันเลย
   */
  const weapon = W.getWeapon('sword')
  const need = weapon.evolution

  // มีหีบเก็บไว้ แต่ยังไม่มีอะไรพร้อม
  let world = {
    ...E.createWorld('เก็บหีบ'),
    chests: 1,
    weapons: { sword: W.MAX_WEAPON_LEVEL },
    skills: {},
  }
  world = E.step(world, { move: { x: 0, y: 0 } })
  assert(world.evolved.length === 0, 'ยังไม่มีสกิลคู่ควบแต่หีบทำงานไปแล้ว')
  assert(world.chests === 1, 'หีบหายไปทั้งที่ยังใช้ไม่ได้')

  // พอได้สกิลคู่ควบครบ หีบที่เก็บไว้ต้องทำงานเอง
  world = { ...world, skills: { [need.requiresSkill]: need.requiresStacks } }
  world = E.step(world, { move: { x: 0, y: 0 } })

  assert(world.evolved.includes('sword'), 'พร้อมครบแล้วแต่หีบที่เก็บไว้ไม่ทำงาน')
  assert(world.chests === 0, 'ใช้หีบแล้วแต่ยอดหีบไม่ลด')
  assert(
    world.notices.some((notice) => notice.text.includes(need.name)),
    'ได้ร่างสมบูรณ์แล้วแต่ไม่มีข้อความบอกเด็กเลย',
  )
})

check('ร่างสมบูรณ์ต้องแรงกว่าระดับสูงสุดจริง ไม่ใช่แค่เปลี่ยนชื่อ', () => {
  for (const weapon of W.WEAPONS) {
    const top = W.weaponStats(weapon.id, W.MAX_WEAPON_LEVEL)
    const evo = W.activeStats(weapon.id, W.MAX_WEAPON_LEVEL, true)

    assert(evo.damage > top.damage * 1.4, `${weapon.name} ร่างสมบูรณ์แรงขึ้นน้อยเกินไป`)
    assert(evo.interval < top.interval, `${weapon.name} ร่างสมบูรณ์ยังโจมตีช้าเท่าเดิม`)
    assert(
      W.weaponDisplayName(weapon.id, true) === weapon.evolution.name,
      `${weapon.name} ไม่ได้เปลี่ยนชื่อเมื่อสมบูรณ์`,
    )
  }
})

check('สกิลคู่ควบของอาวุธแต่ละชิ้นต้องไม่ซ้ำกัน', () => {
  // ถ้าซ้ำ เด็กจะเก็บสกิลตัวเดียวแล้วได้ร่างสมบูรณ์พร้อมกันหมด
  // ซึ่งทำให้การเลือกทางเดินของบิลด์ไม่มีความหมาย
  const used = W.WEAPONS.map((weapon) => weapon.evolution.requiresSkill)
  assert(new Set(used).size === used.length, `สกิลคู่ควบซ้ำกัน: ${used.join(', ')}`)

  // และต้องเป็นสกิลที่มีอยู่จริง ไม่ใช่ชื่อที่พิมพ์ผิด
  for (const weapon of W.WEAPONS) {
    assert(
      S.getSkill(weapon.evolution.requiresSkill),
      `${weapon.name} อ้างสกิล "${weapon.evolution.requiresSkill}" ที่ไม่มีอยู่จริง`,
    )
  }
})

// ---------- ของที่ตกจากมอน ----------

check('เก็บหัวใจแล้วต้องฟื้นเลือดจริง', () => {
  let world = E.createWorld('หัวใจ')
  world = {
    ...world,
    player: { ...world.player, hp: 20 },
    pickups: [{ id: 1, kind: 'heart', pos: { ...world.player.pos }, life: 10 }],
  }
  world = E.step(world, { move: { x: 0, y: 0 } })

  assert(world.player.hp > 20, `เก็บหัวใจแล้วเลือดยังเท่าเดิมที่ ${world.player.hp}`)
  assert(world.pickups.length === 0, 'เก็บหัวใจแล้วของยังอยู่บนพื้น')
})

check('เก็บระเบิดแล้วต้องทำร้ายมอนทั้งสนาม', () => {
  let world = E.createWorld('ระเบิด')
  const far = { x: world.player.pos.x + 300, y: world.player.pos.y + 200 }
  world = {
    ...world,
    enemies: [
      {
        id: 1, pos: far, hp: 500, maxHp: 500, speed: 0, radius: 16, damage: 0,
        kind: 'number-slime', xpValue: 1, hitFlash: 0, behavior: 'chase', clock: 0,
        slowFor: 0, burnFor: 0, burnDps: 0, elite: false, boss: false,
        splitInto: 0, shootCooldown: 9,
      },
    ],
    pickups: [{ id: 2, kind: 'bomb', pos: { ...world.player.pos }, life: 10 }],
  }
  world = E.step(world, { move: { x: 0, y: 0 } })

  assert(world.enemies[0].hp < 500, 'เก็บระเบิดแล้วมอนที่อยู่ไกลไม่โดนอะไรเลย')
})

check('เก็บแม่เหล็กแล้วต้องได้คริสตัลทั้งสนาม', () => {
  let world = E.createWorld('แม่เหล็ก')
  world = {
    ...world,
    gems: [
      { id: 1, pos: { x: 10, y: 10 }, value: 5 },
      { id: 2, pos: { x: 790, y: 590 }, value: 5 },
    ],
    pickups: [{ id: 3, kind: 'magnet', pos: { ...world.player.pos }, life: 10 }],
  }
  const before = world.player.xp
  world = E.step(world, { move: { x: 0, y: 0 } })

  assert(world.gems.length === 0, 'เก็บแม่เหล็กแล้วยังมีคริสตัลค้างอยู่')
  assert(world.player.xp > before, 'ดูดคริสตัลเข้ามาแล้วแต่ไม่ได้ XP')
})

// ---------- ความยาวรอบ ----------

check('การ์ดที่สุ่มมาต้องมีอาวุธอย่างน้อยหนึ่งใบเสมอ', () => {
  /*
   * ข้อนี้จับวงจรที่เคยทำให้เกมพัง
   *
   * เดิมการ์ดสุ่มล้วน รอบที่ดวงไม่ดีจะไม่ได้อัปอาวุธเลยหลายเลเวลติด
   * พอความแรงไม่ขึ้นก็ล้มมอนไม่ทัน พอล้มไม่ทัน XP ก็ไม่เข้า แล้ววนแย่ลงจนตาย
   * วัดได้ว่ารอบแบบนั้นตายที่ 60 วินาทีด้วยดาบระดับ 1 ทั้งที่เล่นถูกวิธี
   * ส่วนรอบที่ดวงดีอยู่ได้เกินเจ็ดนาที ต่างกันเกินเจ็ดเท่าโดยฝีมือเท่ากัน
   */
  for (const seed of ['ก', 'ข', 'ค', 'ง', 'จ']) {
    for (let level = 1; level <= 6; level += 1) {
      const world = { ...E.createWorld(seed), player: { ...E.createWorld(seed).player, level } }
      const offers = E.offerSkills(world, 3)
      assert(
        offers.some((offer) => offer.kind === 'weapon'),
        `เมล็ด ${seed} เลเวล ${level} สุ่มการ์ดมาแล้วไม่มีอาวุธเลยสักใบ`,
      )
    }
  }
})

check('รอบหนึ่งต้องยาวพอให้ได้ตอบโจทย์หลายข้อ', () => {
  /*
   * ข้อนี้เป็นข้อกำหนดทางการเรียน ไม่ใช่แค่เรื่องความสนุก
   * เลเวลอัปหนึ่งครั้งคือโจทย์หนึ่งข้อ
   * เคยวัดได้ว่ารอบจบใน 50–96 วินาที ซึ่งได้ตอบแค่ห้าข้อต่อรอบ
   * น้อยเกินไปสำหรับการใช้ในคาบเรียน
   */
  let total = 0
  const seeds = ['ก', 'ข', 'ค', 'ง']

  for (const seed of seeds) {
    // ต้องเดินวน ไม่ใช่เดินตรง เพราะเดินตรงจะไปติดขอบจอแล้วยืนนิ่งอยู่ตรงนั้น
    let world = E.createWorld(seed)
    let levelUps = 0
    const steps = Math.round(240 / E.FIXED_STEP)

    for (let i = 0; i < steps; i += 1) {
      if (world.phase === 'question') {
        world = E.resolveQuestion(world, true)
        continue
      }
      if (world.phase === 'choosing') {
        const offer = E.offerSkills(world, 3)
        world = offer.length > 0 ? E.takeSkill(world, offer[0].id) : E.skipSkill(world)
        levelUps += 1
        continue
      }
      if (world.phase === 'dead') break

      const angle = (i / 60) * 1.1
      world = E.step(world, { move: { x: Math.cos(angle) * 0.7, y: Math.sin(angle) * 0.7 } })
    }
    total += levelUps
  }

  const average = total / seeds.length
  assert(average >= 9, `เฉลี่ยได้ตอบโจทย์แค่ ${average.toFixed(1)} ข้อต่อรอบ ซึ่งน้อยเกินไป`)
})



// ---------- สกิลวิเศษประจำตัวละคร ----------

/** โลกที่ชาร์จสกิลเต็มแล้ว พร้อมกด */
function chargedWorld(avatarId, extra = {}) {
  const base = E.createWorld('สกิล', avatarId)
  const spec = U.ultimateFor(avatarId)
  return {
    ...base,
    ...extra,
    ultimate: { ...base.ultimate, charge: spec.cost },
  }
}

check('ตัวละครทุกตัวต้องมีสกิลวิเศษ และต้องไม่ซ้ำกัน', () => {
  const ids = U.ULTIMATE_IDS
  assert(ids.length >= 6, `มีสกิลวิเศษแค่ ${ids.length} แบบ`)

  const kinds = ids.map((id) => U.ultimateFor(id).kind)
  assert(new Set(kinds).size === kinds.length, `สกิลวิเศษทำงานซ้ำแบบกัน: ${kinds.join(', ')}`)

  for (const id of ids) {
    const spec = U.ultimateFor(id)
    assert(spec.cost > 0, `${spec.name} ชาร์จเต็มโดยไม่ต้องล้มมอนเลย`)
    assert(spec.name && spec.description, `${id} ไม่มีชื่อหรือคำอธิบาย`)
  }

  // อวตารที่ไม่รู้จักต้องได้สกิลสำรอง ไม่ใช่ undefined
  assert(U.ultimateFor('ไม่มีตัวนี้'), 'อวตารที่ไม่รู้จักไม่ได้สกิลสำรอง')
})

check('สกิลวิเศษต้องกดไม่ได้จนกว่าจะชาร์จเต็ม', () => {
  let world = E.createWorld('ยังไม่เต็ม', 'warrior')
  assert(!E.ultimateReady(world), 'เพิ่งเริ่มเกมแต่กดสกิลได้แล้ว')

  // กดตอนยังไม่เต็มต้องไม่มีอะไรเกิดขึ้น และต้องไม่ล้างพลังที่สะสมไว้
  world = { ...world, ultimate: { ...world.ultimate, charge: 5 } }
  const after = E.step(world, { move: { x: 0, y: 0 }, useUltimate: true })
  assert(after.ultimate.used === 0, 'กดตอนยังไม่เต็มแล้วกลับใช้ได้')
  assert(after.ultimate.charge === 5, 'กดตอนยังไม่เต็มแล้วพลังที่สะสมหายไป')
})

check('ล้มมอนแล้วต้องชาร์จสกิล และบอสให้มากกว่ามอนธรรมดา', () => {
  const make = (boss) => ({
    id: 1, pos: { x: 400, y: 300 }, hp: -1, maxHp: 100, speed: 0, radius: 16,
    damage: 0, kind: boss ? 'boss-slime-king' : 'number-slime', xpValue: 1, hitFlash: 0,
    behavior: 'chase', clock: 0, slowFor: 0, burnFor: 0, burnDps: 0,
    elite: false, boss, splitInto: 0, shootCooldown: 9,
  })

  const normal = E.step({ ...E.createWorld('ชาร์จ', 'warrior'), enemies: [make(false)] }, STILL)
  const boss = E.step({ ...E.createWorld('ชาร์จ', 'warrior'), enemies: [make(true)] }, STILL)

  assert(normal.ultimate.charge === 1, `ล้มมอนธรรมดาได้ ${normal.ultimate.charge} หน่วย`)
  assert(boss.ultimate.charge > normal.ultimate.charge, 'ล้มบอสชาร์จได้ไม่มากกว่ามอนธรรมดา')
})

check('ตวัดพายุต้องกวาดมอนที่รุมอยู่รอบตัว', () => {
  const near = {
    id: 1, pos: { x: 420, y: 300 }, hp: 500, maxHp: 500, speed: 0, radius: 16,
    damage: 0, kind: 'number-slime', xpValue: 1, hitFlash: 0, behavior: 'chase',
    clock: 0, slowFor: 0, burnFor: 0, burnDps: 0, elite: false, boss: false,
    splitInto: 0, shootCooldown: 9,
  }
  const world = chargedWorld('warrior', { enemies: [near] })
  const after = E.step(world, { move: { x: 0, y: 0 }, useUltimate: true })

  assert(after.enemies[0].hp < 500, 'ใช้ตวัดพายุแล้วมอนที่อยู่ติดตัวไม่เจ็บเลย')
  assert(after.ultimate.used === 1, 'ใช้สกิลแล้วไม่ได้นับ')
  assert(after.ultimate.charge === 0, 'ใช้สกิลแล้วพลังไม่ถูกใช้')
})

check('หยุดเวลาต้องทำให้มอนเกือบหยุดนิ่งจริง', () => {
  const enemy = () => ({
    id: 1, pos: { x: 100, y: 300 }, hp: 999, maxHp: 999, speed: 150, radius: 16,
    damage: 0, kind: 'number-slime', xpValue: 1, hitFlash: 0, behavior: 'chase',
    clock: 0, slowFor: 0, burnFor: 0, burnDps: 0, elite: false, boss: false,
    splitInto: 0, shootCooldown: 9,
  })

  let frozen = chargedWorld('scientist', { enemies: [enemy()] })
  let normal = chargedWorld('scientist', { enemies: [enemy()] })

  frozen = E.step(frozen, { move: { x: 0, y: 0 }, useUltimate: true })
  normal = E.step(normal, { move: { x: 0, y: 0 } })

  for (let i = 0; i < 30; i += 1) {
    frozen = E.step(frozen, { move: { x: 0, y: 0 } })
    normal = E.step(normal, { move: { x: 0, y: 0 } })
  }

  const frozenMoved = frozen.enemies[0].pos.x - 100
  const normalMoved = normal.enemies[0].pos.x - 100
  assert(
    frozenMoved < normalMoved * 0.35,
    `หยุดเวลาแล้วมอนยังเดินได้ ${frozenMoved.toFixed(1)} เทียบกับปกติ ${normalMoved.toFixed(1)}`,
  )
})

check('ลมกรดกับโล่พลังงานต้องทำให้ไม่เจ็บจริง', () => {
  const hugging = {
    id: 1, pos: { x: 400, y: 300 }, hp: 9999, maxHp: 9999, speed: 0, radius: 20,
    damage: 40, kind: 'number-slime', xpValue: 1, hitFlash: 0, behavior: 'chase',
    clock: 0, slowFor: 0, burnFor: 0, burnDps: 0, elite: false, boss: false,
    splitInto: 0, shootCooldown: 9,
  }

  for (const avatar of ['explorer', 'inventor']) {
    let world = chargedWorld(avatar, { enemies: [{ ...hugging }] })
    world = { ...world, player: { ...world.player, pos: { x: 400, y: 300 } } }
    world = E.step(world, { move: { x: 0, y: 0 }, useUltimate: true })
    const hp = world.player.hp

    for (let i = 0; i < 120; i += 1) world = E.step(world, { move: { x: 0, y: 0 } })

    assert(
      world.player.hp >= hp,
      `${U.ultimateFor(avatar).name} เปิดอยู่แต่ยังเจ็บ เลือดลดจาก ${hp} เหลือ ${world.player.hp}`,
    )
  }
})

check('ลมกรดต้องทำให้เดินเร็วขึ้นจริง', () => {
  let fast = chargedWorld('explorer')
  let normal = chargedWorld('explorer')

  fast = E.step(fast, { move: { x: 1, y: 0 }, useUltimate: true })
  normal = E.step(normal, { move: { x: 1, y: 0 } })

  assert(
    fast.player.pos.x > normal.player.pos.x,
    'เปิดลมกรดแล้วเดินไม่ได้เร็วกว่าปกติ',
  )
})

check('ขุมทรัพย์ต้องดูดคริสตัลทั้งสนามและฟื้นเลือด', () => {
  let world = chargedWorld('adventurer', {
    gems: [
      { id: 1, pos: { x: 20, y: 20 }, value: 4 },
      { id: 2, pos: { x: 780, y: 580 }, value: 4 },
    ],
  })
  world = { ...world, player: { ...world.player, hp: 30 } }

  const after = E.step(world, { move: { x: 0, y: 0 }, useUltimate: true })

  assert(after.gems.length === 0, 'ใช้ขุมทรัพย์แล้วยังมีคริสตัลค้างอยู่ในสนาม')
  assert(after.player.hp > 30, 'ใช้ขุมทรัพย์แล้วเลือดไม่ฟื้น')
})

check('อุกกาบาตถล่มต้องตกหลายลูก ไม่ใช่ลูกเดียว', () => {
  let world = chargedWorld('mage')
  let blasts = 0

  world = E.step(world, { move: { x: 0, y: 0 }, useUltimate: true })
  blasts += world.effects.filter((effect) => effect.kind === 'blast').length

  // เดินต่อจนสกิลหมดฤทธิ์ แล้วนับลูกที่ตกระหว่างนั้น
  const seen = new Set(world.effects.map((effect) => effect.id))
  for (let i = 0; i < 120 && world.ultimate.activeFor > 0; i += 1) {
    world = E.step(world, { move: { x: 0, y: 0 } })
    for (const effect of world.effects) {
      if (effect.kind === 'blast' && !seen.has(effect.id)) {
        seen.add(effect.id)
        blasts += 1
      }
    }
  }

  assert(blasts >= 4, `อุกกาบาตตกแค่ ${blasts} ลูก ซึ่งน้อยเกินกว่าจะเรียกว่าถล่ม`)
})

check('ใช้สกิลแล้วต้องรอชาร์จใหม่ กดรัวไม่ได้', () => {
  let world = chargedWorld('warrior')
  world = E.step(world, { move: { x: 0, y: 0 }, useUltimate: true })
  assert(world.ultimate.used === 1, 'กดครั้งแรกไม่ทำงาน')

  for (let i = 0; i < 10; i += 1) {
    world = E.step(world, { move: { x: 0, y: 0 }, useUltimate: true })
  }
  assert(world.ultimate.used === 1, `กดรัวแล้วใช้ได้ ${world.ultimate.used} ครั้งติด`)
})



// ---------- ช่องสกิลและการเสนอการ์ด ----------

check('มีสกิลให้เลือกหลากหลายพอที่บิลด์สองรอบจะไม่เหมือนกัน', () => {
  assert(S.SKILLS.length >= 18, `มีสกิลแค่ ${S.SKILLS.length} แบบ`)

  const ids = new Set(S.SKILLS.map((skill) => skill.id))
  assert(ids.size === S.SKILLS.length, 'มีรหัสสกิลซ้ำกัน')

  for (const skill of S.SKILLS) {
    assert(skill.name.length >= 3, `${skill.id} ชื่อสั้นเกินไป`)
    assert(skill.description.length >= 10, `${skill.id} คำอธิบายสั้นเกินไป`)
    assert(skill.maxStacks >= 1, `${skill.id} เลือกไม่ได้เลย`)
  }
})

check('สกิลทุกตัวต้องมีผลจริงต่อค่าที่ใช้คำนวณ ไม่ใช่มีแต่ชื่อ', () => {
  /*
   * ข้อนี้ดักความผิดพลาดที่เงียบที่สุดแบบหนึ่ง
   * คือเพิ่มสกิลใหม่ในตารางแล้วลืมต่อเข้ากับ statsFrom
   * เด็กจะเลือกสกิลนั้นแล้วไม่มีอะไรเกิดขึ้นเลย โดยไม่มี error ให้เห็น
   */
  const base = S.statsFrom({})

  for (const skill of S.SKILLS) {
    const withSkill = S.statsFrom({ [skill.id]: skill.maxStacks })
    const changed = Object.keys(base).some((key) => base[key] !== withSkill[key])
    assert(changed, `สกิล "${skill.name}" ไม่ได้เปลี่ยนค่าอะไรเลย`)
  }
})

check('ช่องสกิลเต็มแล้วต้องเสนอเฉพาะสกิลที่ถืออยู่', () => {
  const base = E.createWorld('ช่องเต็ม')
  const chosen = S.SKILLS.slice(0, S.MAX_SKILL_SLOTS).map((skill) => skill.id)

  const skills = {}
  for (const id of chosen) skills[id] = 1

  // ตัดอาวุธออกให้หมดก่อน เพื่อให้เหลือแต่การ์ดสกิลให้ตรวจ
  const world = {
    ...base,
    skills,
    weapons: { sword: 5, fire: 5, lightning: 5, ice: 5 },
  }

  for (let level = 1; level <= 12; level += 1) {
    const offers = E.offerSkills({ ...world, player: { ...world.player, level } }, 3)
    for (const offer of offers) {
      if (offer.kind !== 'skill') continue
      assert(
        chosen.includes(offer.id),
        `ช่องเต็มแล้วแต่ยังเสนอสกิลใหม่ "${offer.name}" ซึ่งทำให้บิลด์ไม่มีทิศทาง`,
      )
    }
  }
})

check('ยังไม่เต็มช่องต้องเสนอสกิลใหม่ได้อยู่', () => {
  const world = {
    ...E.createWorld('ยังไม่เต็ม'),
    weapons: { sword: 5, fire: 5, lightning: 5, ice: 5 },
  }

  let sawNew = false
  for (let level = 1; level <= 12; level += 1) {
    const offers = E.offerSkills({ ...world, player: { ...world.player, level } }, 3)
    if (offers.some((offer) => offer.kind === 'skill' && offer.isNew)) sawNew = true
  }
  assert(sawNew, 'ยังไม่มีสกิลเลยแต่ไม่เสนอสกิลใหม่ให้')
})

check('การ์ดใบแรกต้องไม่ใช่อาวุธเสมอไป', () => {
  /*
   * ข้อนี้จับข้อบกพร่องที่เคยเกิดขึ้นจริง
   *
   * กติกา "ต้องมีอาวุธอย่างน้อยหนึ่งใบ" ทำโดยใส่ใบอาวุธเข้าไปเป็นใบแรกเสมอ
   * ผลคือผู้เล่นที่กดใบแรกตลอด ซึ่งเด็กเล็กทำแบบนี้จริง จะได้แต่อาวุธ
   * จำลองแล้ววัดได้ว่าถือสกิลติดตัวเฉลี่ย 0.0 ใบตลอดรอบ
   * ทั้งที่มีสกิลให้เลือกสิบเก้าแบบ ระบบสกิลทั้งระบบจึงไม่มีอยู่จริงสำหรับเด็กกลุ่มนั้น
   */
  let firstIsWeapon = 0
  let rounds = 0

  for (const seed of ['ก', 'ข', 'ค', 'ง', 'จ', 'ฉ', 'ช', 'ซ']) {
    const base = E.createWorld(seed)
    for (let level = 1; level <= 8; level += 1) {
      const offers = E.offerSkills({ ...base, player: { ...base.player, level } }, 3)
      if (offers.length === 0) continue
      rounds += 1
      if (offers[0].kind === 'weapon') firstIsWeapon += 1
    }
  }

  assert(rounds > 20, 'ตัวอย่างน้อยเกินกว่าจะสรุปได้')
  assert(
    firstIsWeapon < rounds,
    `การ์ดใบแรกเป็นอาวุธทั้ง ${rounds} ครั้ง เด็กที่กดใบแรกตลอดจะไม่ได้สกิลเลย`,
  )
})

check('การันตีว่าต้องมีอาวุธอย่างน้อยหนึ่งใบยังต้องอยู่', () => {
  // สลับตำแหน่งแล้วต้องไม่ทำให้การันตีหายไป
  for (const seed of ['ก', 'ข', 'ค', 'ง', 'จ']) {
    const base = E.createWorld(seed)
    for (let level = 1; level <= 8; level += 1) {
      const offers = E.offerSkills({ ...base, player: { ...base.player, level } }, 3)
      assert(
        offers.some((offer) => offer.kind === 'weapon'),
        `เมล็ด ${seed} เลเวล ${level} ไม่มีการ์ดอาวุธเลย`,
      )
    }
  }
})

// ---------- สกิลกลุ่มที่เปลี่ยนวิธีเล่น ----------

check('เกราะหนาต้องลดความเสียหายจริง และไม่มีทางทำให้อมตะ', () => {
  const hugging = (id) => ({
    id, pos: { x: 400, y: 300 }, hp: 9999, maxHp: 9999, speed: 0, radius: 20,
    damage: 40, kind: 'number-slime', art: 'number-slime', xpValue: 1, hitFlash: 0,
    behavior: 'chase', clock: 0, slowFor: 0, burnFor: 0, burnDps: 0,
    elite: false, boss: false, splitInto: 0, shootCooldown: 99,
  })

  const run = (skills) => {
    let world = { ...E.createWorld('เกราะ'), skills, enemies: [hugging(1)] }
    world = { ...world, player: { ...world.player, pos: { x: 400, y: 300 } } }
    for (let i = 0; i < 240; i += 1) world = E.step(world, STILL)
    return world.player.hp
  }

  const plain = run({})
  const armored = run({ armor: 5 })
  assert(armored > plain, `ใส่เกราะแล้วเลือดไม่ได้เหลือมากกว่า (${armored} เทียบ ${plain})`)

  // เกราะเต็มต้องยังเจ็บอยู่ ไม่ใช่อมตะ ไม่งั้นเกมจบลงตรงนั้น
  const stats = S.statsFrom({ armor: 99 })
  assert(stats.damageReduction < 1, `ลดความเสียหายได้ ${stats.damageReduction} ซึ่งทำให้อมตะ`)
})

check('ฟื้นฟูต้องค่อย ๆ เติมเลือดเองโดยไม่ต้องทำอะไร', () => {
  let world = E.createWorld('ฟื้นฟู', 'warrior')
  world = { ...world, skills: { regen: 3 }, player: { ...world.player, hp: 20 } }

  for (let i = 0; i < 120; i += 1) world = E.step(world, STILL)
  assert(world.player.hp > 20, `ผ่านไปสองวินาทีแล้วเลือดยังอยู่ที่ ${world.player.hp}`)
})

check('หนามสะท้อนต้องทำให้ตัวที่ชนเราเจ็บ', () => {
  const enemy = {
    id: 1, pos: { x: 400, y: 300 }, hp: 9999, maxHp: 9999, speed: 0, radius: 20,
    damage: 5, kind: 'number-slime', art: 'number-slime', xpValue: 1, hitFlash: 0,
    behavior: 'chase', clock: 0, slowFor: 0, burnFor: 0, burnDps: 0,
    elite: false, boss: false, splitInto: 0, shootCooldown: 99,
  }

  let world = {
    ...E.createWorld('หนาม'),
    skills: { thorns: 4 },
    enemies: [enemy],
    // ตัดอาวุธออกให้หมด เพื่อพิสูจน์ว่าเลือดที่ลดมาจากหนามจริง ไม่ใช่จากดาบ
    weapons: {},
  }
  world = { ...world, player: { ...world.player, pos: { x: 400, y: 300 } } }
  world = E.step(world, STILL)

  assert(world.enemies[0].hp < 9999, 'มอนชนเราแล้วไม่เจ็บจากหนามเลย')
})

check('ไอเย็นรอบตัวต้องทำให้มอนที่เข้าใกล้เดินช้าลง', () => {
  const enemy = () => ({
    id: 1, pos: { x: 340, y: 300 }, hp: 9999, maxHp: 9999, speed: 150, radius: 16,
    damage: 0, kind: 'number-slime', art: 'number-slime', xpValue: 1, hitFlash: 0,
    behavior: 'chase', clock: 0, slowFor: 0, burnFor: 0, burnDps: 0,
    elite: false, boss: false, splitInto: 0, shootCooldown: 99,
  })

  const run = (skills) => {
    let world = { ...E.createWorld('ไอเย็น'), skills, enemies: [enemy()], weapons: {} }
    world = { ...world, player: { ...world.player, pos: { x: 400, y: 300 } } }
    for (let i = 0; i < 20; i += 1) world = E.step(world, STILL)
    return world.enemies[0].pos.x - 340
  }

  assert(run({ frost: 3 }) < run({}) * 0.75, 'ไอเย็นไม่ได้ทำให้มอนที่เข้าใกล้ช้าลง')
})

check('ระเบิดลูกโซ่ต้องลามไปยังตัวที่อยู่ข้าง ๆ', () => {
  const at = (id, x, hp) => ({
    id, pos: { x, y: 300 }, hp, maxHp: 9999, speed: 0, radius: 16,
    damage: 0, kind: 'number-slime', art: 'number-slime', xpValue: 1, hitFlash: 0,
    behavior: 'chase', clock: 0, slowFor: 0, burnFor: 0, burnDps: 0,
    elite: false, boss: false, splitInto: 0, shootCooldown: 99,
  })

  // ตัวแรกตายในเฟรมนี้ ตัวที่สองอยู่ข้าง ๆ และต้องโดนลูกหลง
  let world = {
    ...E.createWorld('ลูกโซ่'),
    skills: { bloom: 4 },
    weapons: {},
    enemies: [at(1, 200, -1), at(2, 240, 9999)],
  }
  world = E.step(world, STILL)

  const neighbour = world.enemies.find((enemy) => enemy.id === 2)
  assert(neighbour && neighbour.hp < 9999, 'มอนตายแล้วไม่ระเบิดใส่ตัวข้าง ๆ')
})

check('ดูดพลังต้องฟื้นเลือดเมื่อล้มมอน', () => {
  const dying = {
    id: 1, pos: { x: 200, y: 300 }, hp: -1, maxHp: 100, speed: 0, radius: 16,
    damage: 0, kind: 'number-slime', art: 'number-slime', xpValue: 1, hitFlash: 0,
    behavior: 'chase', clock: 0, slowFor: 0, burnFor: 0, burnDps: 0,
    elite: false, boss: false, splitInto: 0, shootCooldown: 99,
  }

  let world = { ...E.createWorld('ดูดพลัง'), skills: { lifesteal: 4 }, enemies: [dying] }
  world = { ...world, player: { ...world.player, hp: 50 } }
  world = E.step(world, STILL)

  assert(world.player.hp > 50, `ล้มมอนแล้วเลือดไม่ฟื้น อยู่ที่ ${world.player.hp}`)
})

check('พลังล้นต้องชาร์จสกิลวิเศษเร็วขึ้นจริง', () => {
  const dying = (id) => ({
    id, pos: { x: 200, y: 300 }, hp: -1, maxHp: 100, speed: 0, radius: 16,
    damage: 0, kind: 'number-slime', art: 'number-slime', xpValue: 1, hitFlash: 0,
    behavior: 'chase', clock: 0, slowFor: 0, burnFor: 0, burnDps: 0,
    elite: false, boss: false, splitInto: 0, shootCooldown: 99,
  })

  const run = (skills) =>
    E.step({ ...E.createWorld('พลังล้น', 'warrior'), skills, enemies: [dying(1)] }, STILL)
      .ultimate.charge

  assert(run({ charge: 3 }) > run({}), 'พลังล้นไม่ได้ทำให้ชาร์จเร็วขึ้น')
})

// ---------- มอนสเตอร์ชุดใหม่ ----------

check('มอนต้องมีหลากหลายพอ และทุกตัวต้องมีภาพที่มีอยู่จริง', () => {
  const seen = new Map()

  // ไล่เวลาไปจนสุดเพื่อให้เจอมอนทุกชนิดที่ปลดล็อกตามเวลา
  for (let t = 0; t <= 320; t += 10) {
    for (let i = 0; i < 60; i += 1) {
      const enemy = E.spawnOne({ ...E.createWorld('ชนิด'), time: t, nextId: i + 1 }, `s${t}-${i}`)
      seen.set(enemy.kind, enemy.art)
    }
  }

  assert(seen.size >= 14, `เจอมอนแค่ ${seen.size} ชนิด ซึ่งน้อยเกินไปสำหรับรอบยาวหลายนาที`)

  const ART = load('art/monsters')
  for (const [kind, art] of seen) {
    assert(ART.hasMonsterArt(art), `มอน "${kind}" อ้างภาพ "${art}" ที่ไม่มีอยู่จริง`)
  }
})

check('บอสทุกตัวต้องมีชื่อและภาพที่มีอยู่จริง', () => {
  const ART = load('art/monsters')
  const names = new Set()

  for (let index = 0; index < 6; index += 1) {
    const name = E.bossNameAt(index)
    assert(name && name.length >= 3, `บอสตัวที่ ${index} ไม่มีชื่อ`)
    names.add(name)
  }
  assert(names.size === 6, 'ชื่อบอลซ้ำกันภายในรอบเดียว')

  // วนรอบที่สองต้องมีเครื่องหมายกำกับว่าแข็งกว่าเดิม
  assert(E.bossNameAt(6) !== E.bossNameAt(0), 'บอสวนรอบสองใช้ชื่อเดิมเป๊ะ')
})



// ---------- พลังถาวรข้ามรอบ ----------

check('พลังถาวรทุกตัวมีข้อมูลครบและราคาขึ้นตามชั้น', () => {
  assert(PERK.PERKS.length >= 5, `มีพลังถาวรแค่ ${PERK.PERKS.length} แบบ`)

  const ids = new Set()
  for (const perk of PERK.PERKS) {
    assert(!ids.has(perk.id), `รหัสซ้ำ: ${perk.id}`)
    ids.add(perk.id)
    assert(perk.maxLevel >= 1, `${perk.id} ซื้อไม่ได้เลย`)
    assert(perk.description.length >= 10, `${perk.id} คำอธิบายสั้นเกินไป`)

    for (let level = 1; level < perk.maxLevel; level += 1) {
      const before = PERK.perkCost(perk.id, level - 1)
      const current = PERK.perkCost(perk.id, level)
      assert(current >= before, `${perk.id} ชั้นที่ ${level + 1} ไม่ได้แพงกว่าชั้นก่อน`)
    }
    assert(PERK.perkCost(perk.id, perk.maxLevel) === null, `${perk.id} ยังคืนราคาทั้งที่เต็มแล้ว`)
  }
})

check('ซื้อพลังถาวรแล้วหักเหรียญและขึ้นชั้นจริง', () => {
  const perk = PERK.PERKS[0]
  const base = { ...STORAGE.createPlayer('เด็กทดสอบ', 'warrior'), coins: 99999 }
  const cost = PERK.perkCost(perk.id, 0)

  const after = PS.buyPerk(base, perk.id)
  assert(after, 'ซื้อไม่สำเร็จทั้งที่เหรียญพอ')
  assert(after.coins === 99999 - cost, `หักเหรียญผิด เหลือ ${after.coins}`)
  assert(PS.perkLevel(after, perk.id) === 1, 'ซื้อแล้วชั้นไม่ขึ้น')

  const poor = { ...base, coins: cost - 1 }
  assert(PS.buyPerk(poor, perk.id) === null, 'เหรียญไม่พอแต่ซื้อได้')
})

check('ซื้อเกินเพดานไม่ได้', () => {
  const perk = PERK.PERKS[0]
  let player = { ...STORAGE.createPlayer('เด็กทดสอบ', 'warrior'), coins: 9999999 }

  for (let i = 0; i < perk.maxLevel; i += 1) {
    const next = PS.buyPerk(player, perk.id)
    assert(next, `ซื้อชั้นที่ ${i + 1} ไม่สำเร็จ`)
    player = next
  }
  assert(PS.buyPerk(player, perk.id) === null, 'ซื้อเกินเพดานได้')
})

check('พลังถาวรต้องมีผลจริงตั้งแต่วินาทีแรกของรอบ', () => {
  /*
   * ข้อนี้ดักความผิดพลาดที่เงียบที่สุด
   * คือเพิ่มพลังใหม่ในตารางแล้วลืมต่อเข้ากับการคำนวณค่าจริง
   * เด็กจะจ่ายเหรียญไปแล้วไม่มีอะไรเปลี่ยน โดยไม่มี error ให้เห็นเลย
   */
  const plain = E.createWorld('ไม่มีพลัง', 'warrior', {})

  const tough = E.createWorld('มีพลัง', 'warrior', { vigor: 5 })
  assert(tough.player.maxHp > plain.player.maxHp, 'ร่างกายแข็งแรงไม่ได้เพิ่มพลังชีวิต')

  const fast = E.createWorld('เร็ว', 'warrior', { boots: 5 })
  assert(fast.player.speed > plain.player.speed, 'รองเท้าวิเศษไม่ได้ทำให้เดินเร็วขึ้น')

  const trained = E.createWorld('ฝึกมา', 'warrior', { training: 3 })
  assert(
    trained.weapons.sword > plain.weapons.sword,
    'ฝึกฝนมาก่อนไม่ได้ทำให้เริ่มด้วยดาบที่แรงกว่า',
  )

  const phoenix = E.createWorld('ฟีนิกซ์', 'warrior', { phoenix: 1 })
  assert(phoenix.revivesLeft === 1, 'ขนนกฟีนิกซ์ไม่ได้ให้โอกาสฟื้น')

  // ความแรงต้องเพิ่มจริง เทียบผ่านค่าที่ใช้คำนวณ
  const strong = S.statsFrom({}, { might: 5 })
  const normal = S.statsFrom({}, {})
  assert(
    strong.damageMultiplier > normal.damageMultiplier,
    'พลังติดตัวไม่ได้เพิ่มความเสียหาย',
  )

  const magnet = S.statsFrom({}, { lodestone: 4 })
  assert(magnet.magnetRange > normal.magnetRange, 'หินดูดคริสตัลไม่ได้เพิ่มระยะดูด')
})

check('ฝึกฝนมาก่อนต้องไม่ดันดาบข้ามเพดานปกติ', () => {
  // ถ้าข้ามเพดานได้ จะกลายเป็นร่างสมบูรณ์ตั้งแต่ยังไม่ล้มบอส
  // ซึ่งทำให้ระบบร่างสมบูรณ์ทั้งระบบไม่มีความหมาย
  const world = E.createWorld('เกินเพดาน', 'warrior', { training: 99 })
  assert(
    world.weapons.sword <= W.MAX_WEAPON_LEVEL,
    `เริ่มด้วยดาบระดับ ${world.weapons.sword} ซึ่งเกินเพดาน ${W.MAX_WEAPON_LEVEL}`,
  )
})

check('ฟื้นคืนชีพต้องช่วยได้จริง และช่วยได้ครั้งเดียวต่อรอบ', () => {
  const hugging = (id) => ({
    id, pos: { x: 400, y: 300 }, hp: 99999, maxHp: 99999, speed: 0, radius: 20,
    damage: 9999, kind: 'number-slime', art: 'number-slime', xpValue: 1, hitFlash: 0,
    behavior: 'chase', clock: 0, slowFor: 0, burnFor: 0, burnDps: 0,
    elite: false, boss: false, splitInto: 0, shootCooldown: 99,
  })

  let world = E.createWorld('ฟื้น', 'warrior', { phoenix: 1 })
  world = {
    ...world,
    weapons: {},
    enemies: [hugging(1)],
    player: { ...world.player, pos: { x: 400, y: 300 }, hp: 1, invulnerable: 0 },
  }

  world = E.step(world, STILL)
  assert(world.phase !== 'dead', 'มีขนนกฟีนิกซ์แต่ตายทันที')
  assert(world.revivesLeft === 0, 'ฟื้นแล้วแต่ยอดไม่ลด')
  assert(world.player.hp > 1, 'ฟื้นแล้วเลือดไม่เพิ่ม')

  // มอนต้องถูกผลักออกไป ไม่งั้นจะโดนตีตายซ้ำทันที
  const gap = Math.hypot(
    world.enemies[0].pos.x - world.player.pos.x,
    world.enemies[0].pos.y - world.player.pos.y,
  )
  assert(gap > 100, `ฟื้นแล้วมอนยังอยู่ห่างแค่ ${Math.round(gap)} หน่วย`)

  // ครั้งที่สองต้องตายจริง
  let again = {
    ...world,
    player: { ...world.player, hp: 1, invulnerable: 0 },
    enemies: [hugging(2)],
  }
  again = E.step(again, STILL)
  assert(again.phase === 'dead', 'ฟื้นได้เกินหนึ่งครั้งต่อรอบ')
})

check('พลังถาวรครบชุดต้องทำให้อยู่ได้นานขึ้นจริง', () => {
  /*
   * วัดผลรวม ไม่ใช่ดูแค่ว่าตัวเลขเปลี่ยน
   * เพราะจุดประสงค์ของระบบนี้คือทำให้รอบถัดไปดีขึ้น ไม่ใช่แค่มีตัวเลขสวย
   */
  const full = { vigor: 5, might: 5, boots: 5, training: 3, lodestone: 4 }
  const seeds = ['ก', 'ข', 'ค', 'ง']

  const survive = (perks) => {
    let total = 0
    for (const seed of seeds) {
      let world = E.createWorld(seed, 'warrior', perks)
      for (let i = 0; i < 240 / E.FIXED_STEP; i += 1) {
        if (world.phase === 'question') { world = E.resolveQuestion(world, true); continue }
        if (world.phase === 'choosing') {
          const offer = E.offerSkills(world, 3)
          world = offer.length > 0 ? E.takeSkill(world, offer[0].id) : E.skipSkill(world)
          continue
        }
        if (world.phase === 'dead') break
        const angle = (i / 60) * 1.1
        world = E.step(world, {
          move: { x: Math.cos(angle) * 0.7, y: Math.sin(angle) * 0.7 },
        })
      }
      total += world.time
    }
    return total / seeds.length
  }

  const withPerks = survive(full)
  const without = survive({})
  assert(
    withPerks > without,
    `ซื้อพลังครบแล้วรอดเฉลี่ย ${withPerks.toFixed(0)} วินาที ` +
      `เทียบกับไม่ซื้อเลย ${without.toFixed(0)} วินาที ซึ่งไม่ได้ดีขึ้น`,
  )
})


/* ── ความรู้สึกของเกม: ตัวเลข เศษ เสียง และจอสั่น ────────── */

check('โลกใหม่เริ่มจากไม่มีตัวเลข ไม่มีเศษ ไม่มีเสียง และจอไม่สั่น', () => {
  const world = E.createWorld('ความรู้สึก')
  assert(world.damageNumbers.length === 0, 'ต้องเริ่มจากไม่มีตัวเลขความเสียหาย')
  assert(world.particles.length === 0, 'ต้องเริ่มจากไม่มีเศษ')
  assert(world.sounds.length === 0, 'ต้องเริ่มจากไม่มีเสียงค้าง')
  assert(world.shake === 0, 'ต้องเริ่มจากจอไม่สั่น')
})

check('ตีโดนแล้วต้องมีตัวเลขความเสียหายขึ้น พร้อมเสียงตี', () => {
  /*
   * จุดนี้คือหัวใจของทั้งเรื่อง ถ้าตีโดนแล้วไม่มีตัวเลขขึ้น
   * เด็กจะไม่มีทางรู้เลยว่าสกิลเพิ่มพลังที่เพิ่งเลือกไปได้ผลจริงหรือเปล่า
   */
  let world = withEnemiesAt('ตัวเลข', [{ x: 470, y: 300 }])
  let seen = null
  for (let i = 0; i < 240 && !seen; i += 1) {
    world = E.step(world, STILL)
    if (world.damageNumbers.length > 0) seen = world
  }

  assert(seen, 'ตีโดนมาสี่วินาทีแล้วยังไม่มีตัวเลขความเสียหายขึ้นเลย')
  const entry = seen.damageNumbers[0]
  assert(entry.amount > 0, `ตัวเลขความเสียหายต้องมากกว่าศูนย์ แต่ได้ ${entry.amount}`)
  assert(Number.isInteger(entry.amount), 'ตัวเลขต้องเป็นจำนวนเต็ม เด็กอ่านทศนิยมกลางสนามไม่ทัน')
  assert(seen.sounds.includes('hit'), 'ตีโดนแล้วต้องมีเสียงตี')
})

check('ตัวเลขความเสียหายหมดอายุเองและไม่สะสมไม่รู้จบ', () => {
  let world = withEnemiesAt('หมดอายุ', [{ x: 470, y: 300 }])
  let peak = 0
  for (let i = 0; i < 900; i += 1) {
    world = E.step(world, STILL)
    peak = Math.max(peak, world.damageNumbers.length)
  }
  assert(peak > 0, 'ตลอดสิบห้าวินาทีควรมีตัวเลขขึ้นบ้าง')
  assert(
    world.damageNumbers.length <= 40,
    `ตัวเลขค้างอยู่ ${world.damageNumbers.length} ตัว ซึ่งเกินเพดานที่ตั้งไว้`,
  )
})

check('มอนตายแล้วต้องมีเศษกระเด็นและเสียง', () => {
  let world = withEnemiesAt('เศษ', [{ x: 470, y: 300 }], 1)
  let burst = null
  for (let i = 0; i < 300 && !burst; i += 1) {
    world = E.step(world, STILL)
    if (world.particles.length > 0) burst = world
  }
  assert(burst, 'มอนตายแล้วแต่ไม่มีเศษกระเด็นออกมาเลย')
  assert(
    burst.sounds.includes('kill') || burst.sounds.includes('explode'),
    'มอนตายแล้วต้องมีเสียง',
  )
})

check('เศษหายไปเองและไม่เกินเพดาน แม้มอนตายพร้อมกันทั้งสนาม', () => {
  /*
   * กรณีที่ต้องกันจริง ๆ คือตอนมอนแน่นแล้วตายพร้อมกันหมด
   * ถ้าเศษไม่มีเพดาน เฟรมจะตกในจังหวะที่มันส์ที่สุดของรอบพอดี
   */
  const positions = []
  for (let i = 0; i < 60; i += 1) {
    positions.push({ x: 440 + (i % 10) * 12, y: 280 + Math.floor(i / 10) * 12 })
  }
  let world = withEnemiesAt('ล้นสนาม', positions, 1)

  /*
   * ต้องปลดเฟสถามโจทย์ทุกครั้ง ไม่งั้นการทดสอบจะหยุดนิ่งตั้งแต่เลเวลอัปแรก
   *
   * ล้มมอนหกสิบตัวรวดเดียวทำให้เลเวลอัปทันที แล้ว step จะคืนโลกเดิมกลับมาเฉย ๆ
   * ครั้งแรกที่เขียนข้อนี้ผมไม่ได้ปลด แล้วสรุปผิดว่าเศษไม่ยอมหายไปเอง
   * ทั้งที่จริงคือเวลาในเกมหยุดเดินไปตั้งนานแล้ว
   */
  const keepPlaying = (state) =>
    state.phase === 'question'
      ? E.skipSkill(E.resolveQuestion(state, true))
      : state

  let peak = 0
  for (let i = 0; i < 600; i += 1) {
    world = keepPlaying(E.step(world, STILL))
    peak = Math.max(peak, world.particles.length)
  }
  assert(peak > 0, 'ควรมีเศษเกิดขึ้นบ้าง')
  assert(peak <= 240, `เศษขึ้นไปถึง ${peak} ชิ้น ซึ่งเกินเพดานที่ตั้งไว้`)

  /*
   * ตรวจว่าเศษหายไปเอง ต้องหยุดไม่ให้มีมอนตายเพิ่มก่อน
   *
   * ครั้งแรกที่เขียนข้อนี้ ผมนับเศษที่เหลือหลังเดินต่อสิบวินาทีแล้วคาดว่าเป็นศูนย์
   * ซึ่งผิด เพราะเครื่องยนต์ปล่อยมอนใหม่มาตลอดและมันก็ตายตลอด
   * เศษที่เห็นตอนท้ายจึงเป็นเศษชุดใหม่ ไม่ใช่ชุดเดิมที่ไม่ยอมหาย
   */
  let quiet = {
    ...world,
    phase: 'playing',
    enemies: [],
    spawnCooldown: 9999,
    bossCooldown: 9999,
    eliteCooldown: 9999,
  }
  const before = quiet.particles.length
  for (let i = 0; i < 90; i += 1) quiet = E.step(quiet, STILL)
  assert(
    quiet.particles.length === 0,
    `เศษ ${before} ชิ้นยังเหลืออยู่ ${quiet.particles.length} ชิ้น` +
      ' หลังผ่านไปหนึ่งวินาทีครึ่งโดยไม่มีมอนตายเพิ่ม ซึ่งแปลว่ามันไม่หายไปเอง',
  )
})

check('จอสั่นแล้วต้องนิ่งลงเอง และไม่มีทางสั่นเกินหนึ่ง', () => {
  /*
   * ถ้าแรงสั่นบวกสะสมกันได้ ตอนมอนตายพร้อมกันสิบตัวจอจะสั่นจนอ่านอะไรไม่ออก
   * เครื่องยนต์จึงใช้ค่าที่แรงที่สุดในก้าวนั้น ไม่ใช่ผลรวม
   */
  const positions = []
  for (let i = 0; i < 40; i += 1) positions.push({ x: 450 + i, y: 300 })
  let world = withEnemiesAt('สั่น', positions, 1)

  let peak = 0
  for (let i = 0; i < 300; i += 1) {
    world = E.step(world, STILL)
    peak = Math.max(peak, world.shake)
  }
  assert(peak > 0, 'มอนตายเยอะขนาดนี้จอควรสั่นบ้าง')
  assert(peak <= 1, `จอสั่นแรงถึง ${peak.toFixed(2)} ซึ่งเกินหนึ่ง แปลว่าค่าถูกบวกสะสม`)

  for (let i = 0; i < 200; i += 1) world = E.step(world, STILL)
  assert(
    world.shake === 0,
    `จอยังสั่นอยู่ที่ ${world.shake.toFixed(3)} หลังไม่มีอะไรเกิดขึ้นสามวินาที`,
  )
})

check('รายการเสียงล้างใหม่ทุกก้าว ไม่ค้างข้ามก้าว', () => {
  /*
   * ถ้าไม่ล้าง เสียงเดียวจะดังซ้ำทุกเฟรมจนกลายเป็นเสียงหึ่งต่อเนื่อง
   */
  let world = withEnemiesAt('ล้างเสียง', [{ x: 470, y: 300 }], 1)
  for (let i = 0; i < 400; i += 1) {
    world = E.step(world, STILL)
    assert(
      world.sounds.length <= 8,
      `ก้าวเดียวมีเสียง ${world.sounds.length} เสียง ซึ่งแปลว่าเสียงค้างสะสมข้ามก้าว`,
    )
  }
})

check('advance รวมเสียงจากทุกก้าวย่อย ไม่ใช่เอาแค่ก้าวสุดท้าย', () => {
  /*
   * หนึ่งเฟรมของหน้าจอกินหลายก้าวของเครื่องยนต์
   * ถ้าเอาแค่ก้าวสุดท้าย เสียงจะหายมากขึ้นบนเครื่องที่เฟรมตก
   * ซึ่งเป็นข้อผิดพลาดที่เกิดเฉพาะบนเครื่องช้าและหาสาเหตุยากที่สุด
   */
  let world = withEnemiesAt('รวมเสียง', [{ x: 470, y: 300 }], 1)

  let heard = false
  for (let i = 0; i < 80 && !heard; i += 1) {
    // เดินทีละหนึ่งในสิบวินาที ซึ่งเท่ากับหกก้าวของเครื่องยนต์
    world = E.advance(world, 0.1, STILL)
    if (world.sounds.length > 0) heard = true
  }
  assert(heard, 'เดินผ่าน advance แล้วไม่ได้ยินเสียงอะไรเลย')
})

check('บอสโผล่แล้วต้องมีเสียงคำรามและจอสั่น', () => {
  let world = E.createWorld('บอสมา')
  let roar = null
  // บอสตัวแรกโผล่ที่หกสิบวินาที เดินให้เลยไปหน่อย
  for (let i = 0; i < 60 * 70 && !roar; i += 1) {
    world = E.step(world, STILL)
    if (world.sounds.includes('bossRoar')) roar = world
    if (world.phase !== 'playing') {
      world = { ...world, phase: 'playing', player: { ...world.player, hp: world.player.maxHp } }
    }
  }
  assert(roar, 'ผ่านไปเจ็ดสิบวินาทีแล้วยังไม่ได้ยินเสียงบอสเลย')
  assert(roar.shake > 0, 'บอสโผล่แล้วจอควรสั่น')
})

/* ── ตัวละครทุกตัวต้องเป็นตัวละครจริง ไม่ใช่ร่างสำรอง ───────── */

check('ตัวละครทุกตัวต้องมีภาพวาดของตัวเอง', () => {
  /*
   * heroArt คืน "ร่างสำรอง" สีเทาให้กับอวตารที่ยังไม่มีภาพ
   * ซึ่งเป็นทางเลือกที่ถูกแล้ว เพราะดีกว่าปล่อยให้ตัวละครหายไปทั้งตัว
   *
   * แต่มันแปลว่าตัวละครที่ลืมวาดจะไม่พังอะไรเลย
   * มันจะกลายเป็นคนสีเทาที่หน้าตาเหมือนกันหมด และไม่มีอะไรฟ้อง
   * เด็กที่เก็บเงินตั้งนานเพื่อซื้อจะได้ร่างสำรองไปแทน
   */
  const missing = AV.AVATARS.filter((avatar) => !ART.hasHeroArt(avatar.id))
  assert(
    missing.length === 0,
    `ยังไม่มีภาพวาด: ${missing.map((a) => a.id).join(', ')} — จะกลายเป็นร่างสำรองสีเทา`,
  )
})

check('ตัวละครทุกตัวต้องมีสกิลวิเศษของตัวเอง ไม่ใช่ของตัวอื่น', () => {
  /*
   * ultimateFor คืนสกิลของนักผจญภัยให้กับอวตารที่ไม่มีในตาราง
   * ตัวละครที่ลืมใส่สกิลจึงเล่นได้ปกติ แต่เล่นเหมือนนักผจญภัยเป๊ะ ๆ
   * ซึ่งขัดกับเหตุผลทั้งหมดที่เราผูกสกิลเข้ากับตัวละครตั้งแต่แรก
   */
  for (const avatar of AV.AVATARS) {
    const spec = U.ultimateFor(avatar.id)
    assert(
      spec.id === avatar.id,
      `${avatar.id} ได้สกิลของ ${spec.id} แทนที่จะเป็นของตัวเอง`,
    )
  }
})

check('สกิลวิเศษทุกแบบต้องเปลี่ยนผลของรอบจริง เทียบกับไม่กด', () => {
  /*
   * ข้อนี้สำคัญที่สุดในกลุ่มนี้
   *
   * เครื่องยนต์ตัดสินใจว่าสกิลทำอะไรด้วยการเทียบ kind ทีละแบบ
   * ถ้าเพิ่ม kind ใหม่เข้าไปแต่ลืมเขียนว่ามันทำอะไร โค้ดจะคอมไพล์ผ่าน
   * ปุ่มจะกดได้ พลังจะถูกหักไปจริง แต่ไม่มีอะไรเกิดขึ้นบนจอเลย
   *
   * วิธีตรวจที่เขียนครั้งแรกใช้ไม่ได้ และผมพิสูจน์แล้วว่าใช้ไม่ได้จริง
   *
   * ครั้งแรกผมตรวจว่า "มีอะไรเปลี่ยนไหม" คือเลือดมอนลด เลือดผู้เล่นเพิ่ม
   * หรือมอนขยับ แล้วลองปิดผลของคลื่นเสียงทิ้งดู ปรากฏว่ายังผ่านอยู่ดี
   * เพราะมอนเดินเข้าหาผู้เล่นตลอดเวลาอยู่แล้ว เงื่อนไข "มอนขยับ" จึงจริงเสมอ
   * เป็นข้อทดสอบที่ดูเหมือนตรวจอะไรอยู่ แต่ไม่ได้ตรวจอะไรเลย
   *
   * วิธีที่ถูกคือเทียบกับรอบที่ไม่ได้กดสกิล ด้วยเมล็ดสุ่มเดียวกันทุกอย่าง
   * ถ้าผลออกมาเหมือนกันเป๊ะ แปลว่าการกดสกิลไม่มีความหมาย
   */
  for (const avatar of AV.AVATARS) {
    const spec = U.ultimateFor(avatar.id)

    const positions = []
    for (let i = 0; i < 10; i += 1) {
      const angle = (i / 10) * Math.PI * 2
      positions.push({
        x: 480 + Math.cos(angle) * 120,
        y: 300 + Math.sin(angle) * 120,
      })
    }

    const build = () => {
      const base = withEnemiesAt(`สกิล-${avatar.id}`, positions, 4000)
      return {
        ...base,
        /*
         * ต้องใส่ความเร็วให้มอนเอง
         *
         * withEnemiesAt วางมอนด้วย speed 0 เพราะข้อทดสอบส่วนใหญ่ต้องการ
         * ให้มอนอยู่นิ่ง ๆ ที่ตำแหน่งที่วางไว้ ซึ่งเหมาะกับการตรวจเรื่องอาวุธ
         *
         * แต่สกิลหยุดเวลาทำงานด้วยการลดความเร็วมอนลงเหลือหนึ่งในสิบ
         * กับมอนที่ความเร็วเป็นศูนย์อยู่แล้ว มันจึงไม่มีอะไรให้หยุด
         * ข้อทดสอบจับได้ตรงนี้จริง ซึ่งถูกต้องแล้ว เป็นความผิดของฉากทดสอบ
         */
        enemies: base.enemies.map((enemy) => ({ ...enemy, speed: 120 })),
        player: { ...base.player, hp: base.player.maxHp * 0.5 },
        ultimate: { ...base.ultimate, id: avatar.id, charge: spec.cost },
      }
    }

    /*
     * ต้องให้ผู้เล่นเดินด้วย ไม่ใช่ยืนนิ่ง
     *
     * สกิลพุ่งทะยานทำงานด้วยการเพิ่มความเร็วและทำให้ชนไม่เข้า
     * ถ้าผู้เล่นยืนนิ่ง ความเร็วที่เพิ่มขึ้นจึงไม่มีผลอะไรเลย
     * และข้อทดสอบนี้จับได้จริงตอนแรกที่เขียนให้ยืนนิ่ง ซึ่งถูกต้องแล้ว
     * เป็นความผิดของฉากทดสอบ ไม่ใช่ของเครื่องยนต์
     */
    /*
     * ต้องให้ผู้เล่นเดินด้วย ไม่ใช่ยืนนิ่ง
     *
     * สกิลพุ่งทะยานทำงานด้วยการเพิ่มความเร็วและทำให้ชนไม่เข้า
     * ถ้าผู้เล่นยืนนิ่ง ความเร็วที่เพิ่มขึ้นจึงไม่มีผลอะไรเลย
     */
    const WALK = { x: 1, y: 0 }
    const frames = Math.ceil((spec.duration + 0.4) * 60)

    /*
     * เก็บลายเซ็นของ "ทั้งรอบ" ไม่ใช่แค่ภาพสุดท้าย
     *
     * ตอนแรกเทียบเฉพาะสถานะตอนจบ แล้วสกิลหยุดเวลาไม่ผ่าน
     * เพราะพอหมดเวลาหยุด มอนก็เดินตามมากองรวมกันที่ตัวผู้เล่นเหมือนกันทั้งสองรอบ
     * ความต่างที่เกิดขึ้นระหว่างทางจึงหายไปหมดตอนถ่ายภาพสุดท้าย
     * การรวมทุกเฟรมทำให้ความต่างที่เกิดขึ้นแม้ชั่วครู่ก็ยังนับ
     */
    const run = (useUltimate) => {
      let world = E.step(build(), { move: WALK, useUltimate })
      let signature = ''
      for (let i = 0; i < frames; i += 1) {
        if (world.phase !== 'playing') break
        world = E.step(world, { move: WALK })
        signature +=
          `${Math.round(world.player.hp)};` +
          `${Math.round(world.player.pos.x)};` +
          `${Math.round(world.enemies.reduce((sum, e) => sum + e.hp, 0))};` +
          `${Math.round(world.enemies.reduce((sum, e) => sum + e.pos.x + e.pos.y, 0))}|`
      }
      return { used: world.ultimate.used, signature }
    }

    const pressed = run(true)
    const control = run(false)

    assert(pressed.used === 1, `${avatar.id}: กดสกิลแล้วไม่ถูกนับว่าใช้`)
    assert(control.used === 0, `${avatar.id}: ไม่ได้กดแต่กลับถูกนับว่าใช้`)

    const changed = pressed.signature !== control.signature

    assert(
      changed,
      `${avatar.id} (${spec.kind}): กดสกิลแล้วผลออกมาเหมือนไม่กดเลยทุกอย่าง ` +
        'น่าจะยังไม่ได้เขียนผลของชนิดนี้ในเครื่องยนต์',
    )
  }
})

check('ราคาตัวละครต้องไม่ซ้ำกัน และตัวเริ่มต้นต้องฟรี', () => {
  /*
   * ราคาซ้ำกันทำให้เด็กที่เก็บเงินได้ก้อนหนึ่งต้องเลือกระหว่างสองตัว
   * โดยไม่มีข้อมูลพอจะตัดสินใจ ซึ่งเปลี่ยนเป้าหมายที่ชัดเจนให้กลายเป็นความลังเล
   */
  const paid = AV.AVATARS.filter((avatar) => avatar.price > 0).map((a) => a.price)
  assert(
    new Set(paid).size === paid.length,
    `มีตัวละครราคาเท่ากัน: ${paid.sort((a, b) => a - b).join(', ')}`,
  )
  /*
   * ครูทักมาว่า "ตอนสร้างตัวละคร มีสองอาชีพเหรอ"
   *
   * ตอนนั้นมีสองตัวจริง ซึ่งเคยพอดีตอนมีตัวละครทั้งหมดหกตัว
   * แต่พอเพิ่มเป็นสิบ สองตัวกลายเป็นหน้าจอแรกที่ดูแห้งมาก
   * ตั้งขั้นต่ำไว้ที่สี่ เพื่อไม่ให้ถอยกลับไปจุดเดิมโดยไม่มีใครสังเกต
   */
  assert(
    AV.STARTER_AVATAR_IDS.length >= 4,
    `ตัวละครที่เลือกได้ฟรีมีแค่ ${AV.STARTER_AVATAR_IDS.length} ตัว ` +
      'หน้าสร้างผู้เล่นจะมีตัวเลือกน้อยเกินไปสำหรับหน้าจอแรกของเกม',
  )

  /*
   * ตัวที่เลือกได้ฟรีต้องมีสกิลวิเศษต่างกันทุกตัว
   * ไม่งั้นการเลือกตอนเริ่มเกมจะเป็นการเลือกรูป ไม่ใช่เลือกวิธีเล่น
   */
  const starterKinds = AV.STARTER_AVATAR_IDS.map((id) => U.ultimateFor(id).kind)
  assert(
    new Set(starterKinds).size === starterKinds.length,
    `ตัวเริ่มต้นมีสกิลซ้ำแบบกัน: ${starterKinds.join(', ')}`,
  )
})

/* ── อาวุธสามชิ้นใหม่ ────────────────────────────────────── */

/** วางมอนเป็นวงรอบผู้เล่นจริง ที่ระยะที่กำหนด */
function ringAround(seed, count, spread, hp = 9_000_000) {
  const base = E.createWorld(seed)
  const at = base.player.pos
  const enemies = []
  for (let i = 0; i < count; i += 1) {
    const angle = (i / count) * Math.PI * 2
    enemies.push({
      id: 200 + i,
      pos: { x: at.x + Math.cos(angle) * spread, y: at.y + Math.sin(angle) * spread },
      hp, maxHp: hp, speed: 0, radius: 14, damage: 0, kind: 'number-slime',
      behavior: 'chase', hitFlash: 0, xpValue: 1, slowFor: 0, burnFor: 0,
      burnDps: 0, elite: false, boss: false, shootCooldown: 99, clock: 0,
    })
  }
  return { ...base, spawnCooldown: 999, eliteCooldown: 999, bossCooldown: 999, enemies }
}

/** ความเสียหายต่อวินาทีของอาวุธหนึ่งชิ้น ที่ระยะหนึ่ง */
function weaponDps(weaponId, spread, seconds = 10) {
  let world = { ...ringAround(`วัด-${weaponId}-${spread}`, 8, spread), weapons: { [weaponId]: 5 } }
  const before = world.enemies.reduce((sum, e) => sum + e.hp, 0)
  for (let i = 0; i < seconds * 60; i += 1) world = E.step(world, STILL)
  return (before - world.enemies.reduce((sum, e) => sum + e.hp, 0)) / seconds
}

check('อาวุธทุกชิ้นต้องทำความเสียหายได้จริงในระยะที่ตัวเองถนัด', () => {
  /*
   * อาวุธที่ทำความเสียหายเป็นศูนย์ทุกระยะคืออาวุธที่เสีย
   * แต่จะไม่มีอะไรฟ้อง เพราะเด็กจะเห็นแค่ว่า "มอนตายช้า"
   * ซึ่งแยกไม่ออกจากการที่ตัวเองเลือกอาวุธไม่เก่ง
   */
  for (const weapon of W.WEAPONS) {
    const best = Math.max(
      weaponDps(weapon.id, 30),
      weaponDps(weapon.id, 90),
      weaponDps(weapon.id, 200),
    )
    assert(best > 0, `${weapon.name} ทำความเสียหายเป็นศูนย์ทุกระยะ`)
  }
})

check('โล่หมุนต้องกันตัวได้ตอนมอนประชิด ซึ่งเป็นเหตุผลเดียวที่มันมีอยู่', () => {
  /*
   * ข้อนี้เกิดจากบั๊กจริงที่วัดเจอตอนเพิ่มอาวุธชิ้นนี้
   *
   * ครั้งแรกตั้งรัศมีวงโคจรไว้ที่ 72–96 ซึ่งกว้างกว่าระยะที่มอนมากองอยู่
   * ผลคือมอนที่ไล่ทันจนประชิดตัวจะอยู่ "ข้างใน" วง ส่วนโล่หมุนอยู่ข้างนอก
   * ทั้งสองไม่เคยแตะกันเลย ความเสียหายตอนโดนรุมจึงเป็นศูนย์เป๊ะ
   *
   * แปลว่ามันใช้ไม่ได้เลยในจังหวะที่คำอธิบายของมันเองบอกว่าเหมาะที่สุด
   * และไม่มีชุดทดสอบไหนตอนนั้นจับได้ เพราะทุกข้อวัดที่ระยะกลาง
   */
  const close = weaponDps('orbit', 30)
  assert(
    close > 0,
    'โล่หมุนทำความเสียหายเป็นศูนย์ตอนมอนประชิดตัว ' +
      'ซึ่งเป็นสถานการณ์เดียวที่อาวุธชิ้นนี้ควรเก่งที่สุด',
  )

  // และต้องเก่งตอนประชิดมากกว่าตอนมอนอยู่ไกล ตามที่โฆษณาไว้
  assert(
    close > weaponDps('orbit', 200),
    'โล่หมุนทำความเสียหายตอนมอนอยู่ไกลได้มากกว่าตอนประชิด ซึ่งกลับด้านกับที่ควรเป็น',
  )
})

check('อาวุธใหม่ต้องไม่แรงกว่าอาวุธเดิมอย่างเห็นได้ชัด', () => {
  /*
   * ดาบเป็นอาวุธประชิดที่ต้องเข้าไปยืนสู้จริง จึงใช้เป็นเส้นเทียบ
   * อาวุธที่แค่โยนทิ้งไว้แล้วเดินหนีไม่ควรแรงกว่ามันมาก
   *
   * ตอนตั้งค่าครั้งแรก แอ่งพิษทำได้ 1,709 ต่อวินาทีเทียบกับดาบ 915
   * ซึ่งแปลว่าไม่มีเหตุผลอะไรที่จะเลือกอาวุธอื่นอีกเลย
   */
  const swordClose = weaponDps('sword', 30)
  for (const id of ['orbit', 'poison', 'boomerang']) {
    const close = weaponDps(id, 30)
    assert(
      close <= swordClose * 1.25,
      `${id} ทำได้ ${close.toFixed(0)} ต่อวินาทีตอนประชิด เทียบกับดาบ ${swordClose.toFixed(0)} ` +
        'ซึ่งแรงเกินไปจนอาวุธอื่นไม่มีเหตุผลให้เลือก',
    )
  }
})

check('แอ่งพิษต้องหายไปเองและไม่สะสมไม่รู้จบ', () => {
  let world = { ...ringAround('แอ่ง', 4, 60), weapons: { poison: 5 } }
  let peak = 0
  for (let i = 0; i < 900; i += 1) {
    world = E.step(world, STILL)
    peak = Math.max(peak, world.pools.length)
  }
  assert(peak > 0, 'เล่นไป 15 วินาทีแล้วไม่มีแอ่งเกิดขึ้นเลย')

  // หยุดวางแล้วแอ่งต้องหายหมด
  let quiet = { ...world, weapons: {} }
  for (let i = 0; i < 600; i += 1) quiet = E.step(quiet, STILL)
  assert(
    quiet.pools.length === 0,
    `แอ่ง ${quiet.pools.length} วงยังค้างอยู่หลังหยุดวางไปสิบวินาที`,
  )
})

check('บูมเมอแรงต้องวนกลับมาหาผู้เล่น ไม่ใช่บินหายไปเลย', () => {
  /*
   * ถ้าลืมเขียนส่วนวนกลับ มันจะกลายเป็นกระสุนธรรมดาที่ยิงช้ากว่าชาวบ้าน
   * และไม่มีอะไรฟ้อง เพราะมันยังทำความเสียหายได้อยู่
   */
  let world = { ...ringAround('บูม', 1, 260), weapons: { boomerang: 5 } }

  let launched = null
  for (let i = 0; i < 240 && !launched; i += 1) {
    world = E.step(world, STILL)
    const shot = world.projectiles.find((p) => p.weapon === 'boomerang')
    if (shot) launched = shot
  }
  assert(launched, 'ยิงบูมเมอแรงไปแล้วแต่ไม่พบลูกไหนบนสนามเลย')

  let farthest = 0
  let cameBack = false
  for (let i = 0; i < 240; i += 1) {
    world = E.step(world, STILL)
    const shot = world.projectiles.find((p) => p.id === launched.id)
    if (!shot) break
    const gap = Math.hypot(shot.pos.x - world.player.pos.x, shot.pos.y - world.player.pos.y)
    farthest = Math.max(farthest, gap)
    if (farthest > 80 && gap < farthest - 40) cameBack = true
  }
  assert(cameBack, `บูมเมอแรงบินออกไปไกลสุด ${farthest.toFixed(0)} แล้วไม่วนกลับมาเลย`)
})

check('โล่หมุนต้องติดตามผู้เล่นไปด้วย ไม่ใช่ค้างอยู่ที่เดิม', () => {
  let world = { ...ringAround('ตามตัว', 1, 400), weapons: { orbit: 5 } }
  for (let i = 0; i < 60; i += 1) world = E.step(world, STILL)

  const shots = world.projectiles.filter((p) => p.orbit)
  assert(shots.length > 0, 'ไม่มีโล่เกิดขึ้นเลย')

  // เดินไปทางขวาสักพัก โล่ต้องยังอยู่รอบตัว ไม่ใช่ทิ้งไว้ข้างหลัง
  for (let i = 0; i < 120; i += 1) world = E.step(world, { move: { x: 1, y: 0 } })

  for (const shot of world.projectiles.filter((p) => p.orbit)) {
    const gap = Math.hypot(shot.pos.x - world.player.pos.x, shot.pos.y - world.player.pos.y)
    assert(
      gap < 120,
      `โล่ห่างจากผู้เล่น ${gap.toFixed(0)} หลังเดินไปไกล ซึ่งแปลว่ามันไม่ได้ตามตัวมาด้วย`,
    )
  }
})

check('ตีโดนแล้วต้องมีประกายขึ้นตรงจุดที่โดน และเป็นสีของอาวุธนั้น', () => {
  /*
   * ก่อนหน้านี้ตอนกระสุนโดนมอน สิ่งเดียวที่เกิดขึ้นคือมอนกะพริบขาวหนึ่งเฟรม
   * ซึ่งจับตาแทบไม่ทันเมื่อมีมอนหลายสิบตัว
   *
   * ประกายต้องเป็นสีของอาวุธ ไม่ใช่สีเดียวกันหมด
   * เพราะเด็กถืออาวุธพร้อมกันได้สี่ชิ้น ถ้าประกายสีเดียวกันหมด
   * จะแยกไม่ออกว่าชิ้นไหนกำลังทำงานอยู่
   */
  let world = { ...ringAround('ประกาย', 6, 120), weapons: { ice: 5 } }

  let seen = null
  for (let i = 0; i < 300 && !seen; i += 1) {
    world = E.step(world, STILL)
    seen = world.effects.find((effect) => effect.kind === 'spark')
  }

  assert(seen, 'ยิงโดนมอนแล้วแต่ไม่มีประกายขึ้นเลย')
  assert(seen.color, 'ประกายไม่มีสี จะวาดออกมาเป็นสีปริยายเหมือนกันหมด')
  assert(seen.life > 0 && seen.life <= 0.5, `ประกายอยู่นาน ${seen.life} วินาที ซึ่งนานเกินไปจนจอเลอะ`)
})

check('แสงวาบเต็มจอต้องเกิดตอนใช้สกิลวิเศษ และจางหายเองเร็ว', () => {
  /*
   * แสงที่ค้างนานจะบังมอนในจังหวะที่มอนกำลังเข้ามาหา
   * ซึ่งเป็นการลงโทษเด็กสำหรับเหตุการณ์ที่ตัวเองเป็นคนทำให้เกิด
   */
  const spec = U.ultimateFor('warrior')
  let world = {
    ...ringAround('แสงวาบ', 6, 90),
    ultimate: { ...E.createWorld('x', 'warrior').ultimate, id: 'warrior', charge: spec.cost },
  }
  assert(world.flash.power === 0, 'ยังไม่ได้กดอะไรแต่จอวาบอยู่แล้ว')

  world = E.step(world, { move: { x: 0, y: 0 }, useUltimate: true })
  assert(world.flash.power > 0.3, `กดสกิลวิเศษแล้วแสงวาบแค่ ${world.flash.power}`)

  // เดินต่อหนึ่งวินาที แสงต้องหายไปหมดแล้ว
  for (let i = 0; i < 60; i += 1) world = E.step(world, STILL)
  assert(
    world.flash.power === 0,
    `แสงวาบยังค้างอยู่ที่ ${world.flash.power.toFixed(2)} หลังผ่านไปหนึ่งวินาที`,
  )
})

const PARTICLE_SHAPES = ['star', 'shard', 'ring', 'dot']

/** ตรวจว่าเศษชิ้นหนึ่งมีของครบทุกอย่างที่หน้าจอต้องใช้วาด */
function assertParticleIsDrawable(particle, where) {
  assert(
    PARTICLE_SHAPES.includes(particle.shape),
    `${where}: เศษมีรูปร่าง "${particle.shape}" ซึ่งหน้าจอไม่รู้จัก`,
  )
  assert(typeof particle.angle === 'number', `${where}: เศษไม่มีมุม จะหมุนไม่ได้`)
  assert(typeof particle.spin === 'number', `${where}: เศษไม่มีความเร็วหมุน`)
  assert(typeof particle.gravity === 'number', `${where}: เศษไม่มีค่าแรงโน้มถ่วง`)
  assert(typeof particle.glow === 'boolean', `${where}: เศษไม่ได้บอกว่าเป็นแสงหรือไม่`)
  assert(particle.size > 0, `${where}: เศษขนาด ${particle.size} จะมองไม่เห็น`)
}

check('เศษทุกชิ้นที่เครื่องยนต์สร้าง ต้องมีของครบพอให้หน้าจอวาดได้', () => {
  /*
   * ข้อนี้กันความผิดพลาดที่หาสาเหตุยากที่สุดชนิดหนึ่ง
   *
   * ทุกครั้งที่มีคนเพิ่มจุดที่สร้างเศษใหม่ในเครื่องยนต์ แล้วลืมใส่ shape
   * TypeScript จะจับได้ตอนคอมไพล์จริง แต่ค่าที่ "ใส่มาแล้วแต่ผิด"
   * เช่นสะกด shape ผิดเป็นชื่อที่ไม่มีอยู่ จะรอดไปถึงหน้าจอ
   * แล้วเศษชิ้นนั้นจะถูกวาดเป็นจุดกลมเงียบ ๆ โดยไม่มีใครรู้ว่าผิด
   *
   * เล่นยาวพอให้มีทั้งมอนธรรมดาตาย ตัวใหญ่พิเศษตาย และคริสตัลถูกเก็บ
   */
  let world = E.createWorld('ตรวจเศษ')
  let seen = 0

  // เล่นสองนาทีเต็ม ผ่านทั้งมอนธรรมดา ตัวใหญ่พิเศษ บอส และการเลเวลอัปหลายรอบ
  for (let i = 0; i < 120 * 60; i += 1) {
    if (world.phase === 'question') {
      world = E.resolveQuestion(world, true)
      continue
    }
    if (world.phase === 'choosing') {
      const offer = E.offerSkills(world, E.offerCount(world.lastAnswerCorrect))
      world = offer.length > 0 ? E.takeSkill(world, offer[0].id) : E.skipSkill(world)
      continue
    }
    if (world.phase === 'dead') break
    world = E.step(world, { move: { x: i % 120 < 60 ? 1 : -1, y: 0 } })

    for (const particle of world.particles) {
      assertParticleIsDrawable(particle, 'ระหว่างเล่น')
      seen += 1
    }
  }

  assert(seen > 0, 'เล่นไปสองนาทีแล้วไม่มีเศษเกิดขึ้นเลยแม้แต่ชิ้นเดียว')
})

check('มอนที่แตกต้องกระเด็นเป็นเศษแหลม ส่วนบอสต้องแตกเป็นดาว', () => {
  /*
   * แยกที่รูป ไม่ใช่แค่ที่สี เพราะตอนจอแน่นสีจะกลืนกันหมด
   * แต่รูปดาวยังอ่านออกจากหางตาว่าเพิ่งล้มอะไรตัวใหญ่ไป
   */
  const shapesFrom = (label, tweak) => {
    let world = withEnemiesAt(label, [{ x: 400, y: 300 }], 1)
    world = { ...world, enemies: world.enemies.map((e) => ({ ...e, ...tweak })) }
    world = { ...world, weapons: { sword: 5 } }
    for (let i = 0; i < 120 && world.particles.length === 0; i += 1) {
      world = E.step(world, STILL)
    }
    return world.particles.map((p) => p.shape)
  }

  const normal = shapesFrom('เศษมอนธรรมดา', {})
  assert(normal.includes('shard'), 'มอนธรรมดาตายแล้วไม่มีเศษแหลมกระเด็นเลย')
  // ดาวกับคลื่นสงวนไว้ให้เหตุการณ์ใหญ่ ถ้ามอนธรรมดาก็มีด้วย มันจะไม่เหลือความหมาย
  assert(!normal.includes('star'), 'มอนธรรมดาแตกเป็นดาว ซึ่งควรเป็นของบอสเท่านั้น')
  assert(!normal.includes('ring'), 'มอนธรรมดามีคลื่นกระแทก ซึ่งควรเป็นของตัวใหญ่ขึ้นไป')

  const boss = shapesFrom('เศษบอส', { boss: true })
  assert(boss.includes('star'), 'บอสล้มแล้วไม่มีดาวสักดวง')
  assert(boss.includes('ring'), 'บอสล้มแล้วไม่มีคลื่นกระแทกแผ่ออกมา')
})

check('เก็บคริสตัลแล้วต้องมีทั้งประกายและเสียง', () => {
  /*
   * การเก็บคริสตัลคือสิ่งที่เด็กทำบ่อยที่สุดในเกม นับได้เป็นร้อยครั้งต่อรอบ
   * ถ้าการกระทำที่ทำบ่อยที่สุดไม่มีอะไรตอบกลับเลย
   * ครึ่งหนึ่งของเวลาที่เด็กใช้ในสนามจะรู้สึกเหมือนเดินเก็บของเปล่า ๆ
   */
  const base = E.createWorld('เก็บคริสตัล')
  const world = {
    ...base,
    spawnCooldown: 999,
    eliteCooldown: 999,
    bossCooldown: 999,
    // วางไว้บนตัวเด็กพอดี จะได้ถูกเก็บในก้าวเดียว
    gems: [{ id: 1, pos: { ...base.player.pos }, value: 1 }],
  }

  const after = E.step(world, STILL)
  assert(after.gems.length === 0, 'คริสตัลอยู่บนตัวแล้วแต่ยังไม่ถูกเก็บ')
  assert(after.player.xp > world.player.xp, 'เก็บคริสตัลแล้วแต่ XP ไม่เพิ่ม')
  assert(after.particles.length > 0, 'เก็บคริสตัลแล้วไม่มีประกายขึ้นเลย')
  assert(after.sounds.includes('pickup'), 'เก็บคริสตัลแล้วไม่มีเสียง')
  for (const particle of after.particles) assertParticleIsDrawable(particle, 'ประกายคริสตัล')
  assert(
    after.particles.every((p) => p.gravity < 0),
    'ประกายคริสตัลตกลงพื้น ทำให้อ่านเป็นของที่ร่วง แทนที่จะเป็นของที่เพิ่งได้มา',
  )
})

check('เก็บคริสตัลพร้อมกันหลายเม็ด เสียงต้องดังครั้งเดียว', () => {
  /*
   * ตอนแม่เหล็กดูดเข้ามาพร้อมกันยี่สิบเม็ด เสียงยี่สิบครั้งที่ซ้อนกันสนิท
   * จะไม่ได้ยินเป็นเสียงเก็บของ แต่ได้ยินเป็นเสียงแตกพร่าครั้งเดียว
   */
  const base = E.createWorld('คริสตัลหลายเม็ด')
  const gems = []
  for (let i = 0; i < 20; i += 1) {
    gems.push({ id: i + 1, pos: { ...base.player.pos }, value: 1 })
  }

  const after = E.step(
    { ...base, spawnCooldown: 999, eliteCooldown: 999, bossCooldown: 999, gems },
    STILL,
  )
  const times = after.sounds.filter((cue) => cue === 'pickup').length
  assert(times === 1, `เก็บยี่สิบเม็ดพร้อมกันแล้วเสียงดัง ${times} ครั้ง`)

  /*
   * ประกายก็ต้องมีเพดานเหมือนกัน
   *
   * คริสตัลถูกเก็บตรงตัวเด็กพอดีเสมอ ประกายทั้งหมดจึงกองอยู่จุดเดียว
   * เรนเดอร์ดูแล้วเห็นว่ายี่สิบเม็ดกลายเป็นก้อนม่วงทึบที่บังตัวเด็กมิด
   * ในเกมที่มอนวิ่งเข้าหาตลอดเวลา การมองไม่เห็นตัวเองคือเรื่องใหญ่
   */
  assert(
    after.particles.length <= 16,
    `เก็บยี่สิบเม็ดพร้อมกันแล้วมีประกาย ${after.particles.length} จุดกองทับตัวเด็ก`,
  )
  assert(after.particles.length > 0, 'ดูดทีเดียวยี่สิบเม็ดแล้วไม่มีประกายเลย')
})

check('ขึ้นเลเวลแล้วต้องมีดาวฉลอง ทั้งตอนรับสกิลและตอนข้ามสกิล', () => {
  /*
   * ตอนข้ามสกิลเกิดขึ้นกับเด็กที่เก็บสกิลครบทุกใบแล้ว ซึ่งคือเด็กที่เล่นได้ดีที่สุด
   * ถ้าทางนั้นไม่มีการฉลอง เด็กที่เก่งที่สุดจะเป็นคนเดียวที่ไม่ได้เห็นดาว
   */
  const base = E.createWorld('ฉลองเลเวล')

  for (const [label, next] of [
    ['รับสกิล', (w) => E.takeSkill(w, 'sword')],
    ['ข้ามสกิล', (w) => E.skipSkill(w)],
  ]) {
    const before = { ...base, phase: 'choosing' }
    const after = next(before)

    assert(after.player.level === before.player.level + 1, `${label}: เลเวลไม่ขึ้น`)
    assert(after.phase === 'playing', `${label}: ไม่ได้กลับลงสนาม`)

    const stars = after.particles.filter((p) => p.shape === 'star')
    assert(stars.length > 0, `${label}: ขึ้นเลเวลแล้วไม่มีดาวสักดวง`)
    assert(
      stars.every((p) => p.gravity < 0),
      `${label}: ดาวฉลองร่วงลงพื้น ซึ่งอ่านเป็นของพัง ไม่ใช่รางวัล`,
    )
    assert(
      after.particles.some((p) => p.shape === 'ring'),
      `${label}: ไม่มีคลื่นแผ่ออกจากตัวเด็ก`,
    )
    assert(after.flash.power > 0, `${label}: จอไม่วาบเลย`)
    assert(
      after.notices.some((notice) => notice.text.includes('เลเวล')),
      `${label}: ไม่มีข้อความบอกว่าขึ้นเลเวลแล้ว`,
    )
    for (const particle of after.particles) assertParticleIsDrawable(particle, label)
  }
})

check('ดาวฉลองเลเวลต้องหายไปเอง ไม่ค้างบังจอ', () => {
  /*
   * ของที่ค้างอยู่กลางจอในเกมที่มอนวิ่งเข้าหาตลอดเวลา
   * แปลว่าเด็กมองไม่เห็นสิ่งที่กำลังจะฆ่าตัวเอง
   */
  let world = E.takeSkill({ ...E.createWorld('ดาวไม่ค้าง'), phase: 'choosing' }, 'sword')
  const born = world.particles.length
  assert(born > 0, 'ไม่มีดาวตั้งแต่แรก')

  // เดินต่อสองวินาที ดาวชุดนี้ต้องหมดอายุไปแล้ว
  for (let i = 0; i < 120; i += 1) world = E.step(world, STILL)
  assert(
    world.flash.power === 0,
    `แสงฉลองยังค้างอยู่ที่ ${world.flash.power.toFixed(2)} หลังผ่านไปสองวินาที`,
  )
  assert(
    world.particles.filter((p) => p.shape === 'star').length === 0,
    'ดาวฉลองยังค้างอยู่บนจอหลังผ่านไปสองวินาที',
  )
})

/* ------------------------------------------------------------------ *
 * องค์ประกอบของสนาม
 * ------------------------------------------------------------------ */

check('สนามเดิมต้องได้ของวางเหมือนเดิมทุกครั้ง', () => {
  /*
   * draw ถูกเรียกหกสิบครั้งต่อวินาที ถ้าของวางไม่คงที่
   * ต้นไม้จะย้ายที่ทุกเฟรมจนกลายเป็นภาพสั่นทั้งจอ
   */
  const first = SC.buildScenery('ห้องเดียวกัน')
  const second = SC.buildScenery('ห้องเดียวกัน')
  assert(
    JSON.stringify(first) === JSON.stringify(second),
    'seed เดียวกันได้สนามคนละแบบ',
  )
})

check('คนละ seed ต้องได้สนามคนละแบบ', () => {
  const a = SC.buildScenery('ห้องหนึ่ง')
  const b = SC.buildScenery('ห้องสอง')
  assert(JSON.stringify(a) !== JSON.stringify(b), 'สอง seed ได้สนามเหมือนกันเป๊ะ')
})

check('ของประดับทุกชิ้นต้องอยู่ในกรอบสนาม', () => {
  for (const seed of ['ก', 'ข', 'ค', 'ง', 'จ']) {
    for (const prop of SC.buildScenery(seed).props) {
      assert(
        prop.x >= 0 && prop.x <= T.ARENA_WIDTH,
        `seed ${seed} มีของที่ x=${prop.x} ซึ่งอยู่นอกสนาม`,
      )
      assert(
        prop.y >= 0 && prop.y <= T.ARENA_HEIGHT,
        `seed ${seed} มีของที่ y=${prop.y} ซึ่งอยู่นอกสนาม`,
      )
    }
  }
})

check('ห้ามมีของประดับใกล้จุดเกิดของตัวละคร', () => {
  /*
   * ตรงกลางคือจุดที่ตัวละครเกิดและเป็นที่ที่การต่อสู้หนาแน่นที่สุดตลอดเกม
   * ของประดับตรงนั้นจะกลายเป็นสิ่งรบกวนตลอดรอบ ไม่ใช่แค่ตอนเดินผ่าน
   */
  const cx = T.ARENA_WIDTH / 2
  const cy = T.ARENA_HEIGHT / 2
  for (const seed of ['ก', 'ข', 'ค', 'ง', 'จ']) {
    for (const prop of SC.buildScenery(seed).props) {
      const distance = Math.hypot(prop.x - cx, prop.y - cy)
      assert(
        distance >= 100,
        `seed ${seed} มีของห่างจุดเกิดแค่ ${Math.round(distance)} พิกเซล`,
      )
    }
  }
})

check('ของประดับต้องเรียงตามความลึก ไม่งั้นของไกลจะทับของใกล้', () => {
  for (const seed of ['ก', 'ข', 'ค']) {
    const props = SC.buildScenery(seed).props
    for (let i = 1; i < props.length; i += 1) {
      assert(
        props[i].y >= props[i - 1].y,
        `seed ${seed} ตำแหน่งที่ ${i} เรียงผิด (${props[i - 1].y} แล้วตามด้วย ${props[i].y})`,
      )
    }
  }
})

check('ทุก seed ต้องมีของครบทุกชนิด ไม่มี seed ที่ได้สนามโล่ง', () => {
  for (let index = 0; index < 20; index += 1) {
    const kinds = new Set(SC.buildScenery(`สนาม-${index}`).props.map((p) => p.kind))
    for (const kind of ['tree', 'bush', 'rock', 'flower', 'grass']) {
      assert(kinds.has(kind), `seed ${index} ไม่มี ${kind} เลย`)
    }
  }
})

check('เรียกซ้ำผ่านตัวเก็บของ ต้องได้ก้อนเดิมกลับมา ไม่ใช่ก้อนใหม่', () => {
  const a = SC.sceneryFor('ห้องเก็บของ')
  const b = SC.sceneryFor('ห้องเก็บของ')
  assert(a === b, 'ตัวเก็บของไม่ได้ทำงาน จึงสุ่มใหม่ทุกครั้งที่วาด')
})

/* ------------------------------------------------------------------ *
 * ท่าเดินของตัวละคร
 * ------------------------------------------------------------------ */

check('เดินอยู่ต้องสลับท่าไปเรื่อย ๆ ไม่ใช่ค้างท่าเดียว', () => {
  /*
   * เรื่องนี้ตรวจด้วยตาไม่ได้ เพราะภาพนิ่งภาพเดียวดูไม่ออกว่าขาสลับหรือไม่
   *
   * และมันเคยผิดมาแล้วจริง ๆ ตอนใส่ขาให้ตัวละครรอบแรก
   * ภาพตัวละครมีอนิเมชันอยู่ในตัว แต่อนิเมชันนั้นไม่ขยับเมื่อวาดลง canvas
   * ขาจึงมีให้เห็นแต่แข็งค้างท่าเดียว ตัวละครไถลไปกับพื้นแทนที่จะเดิน
   */
  const seen = new Set()
  for (let step = 0; step < 16; step += 1) {
    seen.add(R.walkFrameIndex(step / 8, 4, true))
  }
  assert(seen.size === 4, `เดินแล้วใช้ท่าแค่ ${seen.size} ท่า จากทั้งหมด 4 ท่า`)
})

check('ยืนนิ่งต้องค้างท่าเดียว ไม่ใช่ย่ำเท้าอยู่กับที่', () => {
  for (let step = 0; step < 16; step += 1) {
    assert(
      R.walkFrameIndex(step / 8, 4, false) === 0,
      `ยืนนิ่งแต่เลือกท่าที่ ${R.walkFrameIndex(step / 8, 4, false)}`,
    )
  }
})

check('ท่าเดินต้องวนครบรอบแล้วกลับมาเริ่มใหม่ ไม่ใช่วิ่งเลยขอบรายการ', () => {
  for (let step = 0; step < 200; step += 1) {
    const index = R.walkFrameIndex(step * 0.37, 4, true)
    assert(index >= 0 && index < 4, `ท่าที่ ${index} อยู่นอกรายการ`)
  }
})

check('ยังไม่มีภาพท่าเดินสักภาพ ต้องไม่พัง', () => {
  assert(R.walkFrameIndex(12.5, 0, true) === 0, 'ไม่มีภาพเลยแต่ยังเลือกท่าที่ไม่ใช่ศูนย์')
})

check('ท่าเดินทั้งสี่ต้องเป็นภาพคนละท่าจริง ไม่ใช่ภาพเดียวกันสี่ใบ', () => {
  /*
   * ถ้าท่าทุกท่าเหมือนกัน การสลับภาพก็ไม่มีความหมาย
   * ตัวชี้วัดคือมุมขา ซึ่งอ่านได้จากคำสั่ง rotate ในภาพ
   */
  const angles = new Set()
  for (let frame = 0; frame < ART.WALK_FRAMES; frame += 1) {
    const svg = ART.heroArt('warrior', ART.walkPose(frame))
    const match = svg.match(/rotate\((-?[0-9.]+) 43 75\)/)
    assert(match !== null, `ท่าที่ ${frame} ไม่มีขาที่โพสท่าไว้`)
    angles.add(match[1])
  }
  assert(angles.size >= 3, `สี่ท่ามีมุมขาต่างกันแค่ ${angles.size} แบบ`)
})

check('ท่ายืนนิ่งต้องเป็นขาชิด ไม่ใช่ขากางค้าง', () => {
  const svg = ART.heroArt('warrior', ART.walkPose(0))
  const match = svg.match(/rotate\((-?[0-9.]+) 43 75\)/)
  assert(match !== null, 'ไม่มีขาที่โพสท่าไว้')
  assert(Math.abs(Number(match[1])) < 0.5, `ท่าแรกขากางอยู่ ${match[1]} องศา`)
})

check('ภาพที่ไม่ได้ส่งท่ามา ต้องยังแกว่งขาเองได้ เพราะหน้าเลือกตัวละครใช้แบบนั้น', () => {
  const svg = ART.heroArt('warrior')
  assert(
    svg.includes('animateTransform'),
    'ภาพที่ไม่ได้ส่งท่ามาไม่มีอนิเมชัน หน้าเลือกตัวละครจะกลายเป็นรูปนิ่ง',
  )
})

console.log(`ผ่าน ${passed} ข้อ`)
if (failures.length > 0) {
  console.log(`\nไม่ผ่าน ${failures.length} ข้อ`)
  failures.forEach((line, i) => console.log(`  ${i + 1}. ${line}`))
  process.exit(1)
}
console.log('ผ่านทั้งหมด')
