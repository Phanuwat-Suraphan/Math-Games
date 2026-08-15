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

console.log(`ผ่าน ${passed} ข้อ`)
if (failures.length > 0) {
  console.log(`\nไม่ผ่าน ${failures.length} ข้อ`)
  failures.forEach((line, i) => console.log(`  ${i + 1}. ${line}`))
  process.exit(1)
}
console.log('ผ่านทั้งหมด')
