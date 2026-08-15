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
  if (world.phase !== 'playing') return

  const single = world.projectiles.length
  const boosted = { ...world, skills: { multishot: 3 }, attackCooldown: 0 }
  const after = E.step(boosted, STILL)
  assert(
    after.projectiles.length > single,
    `มีสกิลแล้วยิงได้ ${after.projectiles.length} เท่าเดิม`,
  )
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

check('สกิลที่เต็มชั้นแล้วต้องไม่ถูกเสนออีก', () => {
  const maxed = {}
  for (const skill of S.SKILLS) maxed[skill.id] = skill.maxStacks

  const world = { ...E.createWorld('เต็ม'), skills: maxed }
  assert(E.offerSkills(world, 3).length === 0, 'เต็มทุกสกิลแล้วยังเสนออีก')

  const partial = { ...E.createWorld('บางส่วน'), skills: { power: 6 } }
  for (const skill of E.offerSkills(partial, 3)) {
    assert(skill.id !== 'power', 'พลังโจมตีเต็มแล้วแต่ยังถูกเสนอ')
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
  const lowerIsBetter = new Set(['attackInterval'])

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

check('ยิงไวต้องมีพื้นล่าง ไม่ถี่จนเฟรมเดียวยิงหลายนัด', () => {
  const maxed = S.statsFrom({ rapid: S.getSkill('rapid').maxStacks })
  assert(
    maxed.attackInterval >= E.FIXED_STEP,
    `ยิงทุก ${maxed.attackInterval} วินาที ซึ่งถี่กว่าหนึ่งเฟรม`,
  )
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
  const maxed = {}
  for (const skill of S.SKILLS) maxed[skill.id] = skill.maxStacks

  const base = E.createWorld('ครบ')
  const world = {
    ...base,
    skills: maxed,
    // จงใจกอง XP ไว้เยอะ เพื่อบังคับให้ขึ้นเลเวลติดกันหลายครั้ง
    player: { ...base.player, xp: 99, xpToNext: 5 },
    phase: 'choosing',
  }

  assert(E.offerSkills(world, 3).length === 0, 'ยังมีสกิลให้เลือกอยู่ ทดสอบผิดกรณี')

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
