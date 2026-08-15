/**
 * ชุดทดสอบภาพประกอบ
 *
 * ภาพเป็น SVG ที่สร้างจากโค้ด จึงทดสอบได้เหมือนโค้ดทั่วไป
 * ข้อที่สำคัญที่สุดคือ "หมุดด่านต้องไม่ทับกัน" ซึ่งเคยพลาดมาแล้ว
 * ตอนวางสองด่านต่อแถว ทำให้เด็กกดด่านผิดหรือกดไม่โดน
 *
 * วิธีใช้
 *   npx tsc -p tsconfig.tests.json --outDir /tmp/logic
 *   node tests/art.test.mjs /tmp/logic
 */

import path from 'path'
import zlib from 'zlib'
import { createRequire } from 'module'

const OUT = process.argv[2]
if (!OUT) {
  console.error('ใช้: node tests/art.test.mjs <โฟลเดอร์ JS ที่คอมไพล์แล้ว>')
  process.exit(1)
}

const require = createRequire(import.meta.url)
const load = (name) => require(path.resolve(OUT, name + '.js'))

const MA = load('art/monsters')
const HA = load('art/heroes')
const SA = load('art/scenes')
const SM = load('art/stageMap')
const MONSTERS = load('data/monsters')
const AVATARS = load('data/avatars')
const WORLDS = load('data/worlds')
const STAGES = load('data/stages')

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

/** SVG ที่ใช้งานได้จริงต้องมีเนื้อหาและวงเล็บแท็กครบคู่ */
function assertValidSvg(markup, label) {
  assert(typeof markup === 'string' && markup.trim().length > 0, `${label}: ว่างเปล่า`)
  assert(!markup.includes('undefined'), `${label}: มีคำว่า undefined หลุดเข้ามา`)
  assert(!markup.includes('NaN'), `${label}: มีค่า NaN ในพิกัด`)

  const open = (markup.match(/</g) ?? []).length
  const close = (markup.match(/>/g) ?? []).length
  equal(open, close, `${label}: วงเล็บแท็กไม่ครบคู่`)
}

// ══ ภาพมอนสเตอร์ ══

check('มอนสเตอร์ทุกตัวในเกมมีภาพของตัวเอง ไม่มีตัวไหนใช้ภาพสำรอง', () => {
  for (const monster of MONSTERS.MONSTERS) {
    assert(MA.hasMonsterArt(monster.id),
      `${monster.id} (${monster.thaiName}) ยังไม่มีภาพ`)
  }
})

check('ภาพมอนสเตอร์ทุกตัวเป็น SVG ที่ใช้ได้จริง', () => {
  for (const id of MA.MONSTER_ART_IDS) {
    assertValidSvg(MA.monsterArt(id), `มอนสเตอร์ ${id}`)
  }
})

check('มอนสเตอร์ที่ไม่รู้จักต้องได้ภาพสำรอง ไม่ใช่ค่าว่าง', () => {
  const fallback = MA.monsterArt('ตัวที่ไม่มีจริง')
  assertValidSvg(fallback, 'ภาพสำรองของมอนสเตอร์')
  equal(MA.hasMonsterArt('ตัวที่ไม่มีจริง'), false, 'ต้องรายงานว่าไม่มีภาพจริง')
})

// ══ ภาพตัวละคร ══

check('อวตารทุกตัวที่เด็กเลือกได้มีภาพของตัวเอง', () => {
  for (const avatar of AVATARS.AVATARS) {
    assert(HA.hasHeroArt(avatar.id), `${avatar.id} (${avatar.name}) ยังไม่มีภาพ`)
  }
})

check('ภาพตัวละครทุกตัวเป็น SVG ที่ใช้ได้จริง', () => {
  for (const id of HA.HERO_ART_IDS) {
    assertValidSvg(HA.heroArt(id), `ตัวละคร ${id}`)
  }
})

// ══ ฉากประจำโลก ══

check('ทุกโลกมีฉากของตัวเอง', () => {
  for (const world of WORLDS.WORLDS) {
    assert(SA.hasWorldScene(world.id), `${world.id} (${world.name}) ยังไม่มีฉาก`)
  }
})

check('ฉากทุกโลกเป็น SVG ที่ใช้ได้จริง และแต่ละโลกไม่เหมือนกัน', () => {
  const seen = new Set()
  for (const world of WORLDS.WORLDS) {
    const scene = SA.worldScene(world.id)
    assertValidSvg(scene, `ฉาก ${world.id}`)
    assert(!seen.has(scene), `${world.id}: ฉากซ้ำกับโลกอื่น เด็กจะแยกโลกไม่ออก`)
    seen.add(scene)
  }
})

// ══ แผนที่เส้นทางด่าน ══

check('หมุดด่านต้องไม่ทับกัน ไม่ว่าจะมีกี่ด่าน', () => {
  for (const count of [1, 2, 3, 5, 8, 10, 15, 24]) {
    const stages = Array.from({ length: count }, (_, i) => ({
      id: `s${i}`,
      isBoss: i === count - 1,
    }))
    const layout = SM.buildStageMap(stages)

    equal(layout.nodes.length, count, `${count} ด่าน: จำนวนหมุดไม่ตรง`)

    // หมุดสองอันจะไม่ทับกันเมื่อระยะห่างมากกว่าผลรวมของรัศมี
    const minGap = SM.PIN_RADIUS + SM.BOSS_PIN_RADIUS
    for (let i = 0; i < layout.nodes.length; i += 1) {
      for (let j = i + 1; j < layout.nodes.length; j += 1) {
        const a = layout.nodes[i]
        const b = layout.nodes[j]
        const distance = Math.hypot(a.x - b.x, a.y - b.y)
        assert(distance > minGap,
          `${count} ด่าน: หมุดด่าน ${i + 1} กับ ${j + 1} ห่างกันแค่ ${distance.toFixed(1)} ` +
          `ต้องมากกว่า ${minGap}`)
      }
    }
  }
})

check('หมุดทุกอันอยู่ในกรอบแผนที่ ไม่ล้นออกนอกจอ', () => {
  const stages = Array.from({ length: 12 }, (_, i) => ({ id: `s${i}`, isBoss: i === 11 }))
  const layout = SM.buildStageMap(stages)

  for (const node of layout.nodes) {
    const radius = node.isBoss ? SM.BOSS_PIN_RADIUS : SM.PIN_RADIUS
    assert(node.x - radius >= 0, `ด่าน ${node.index + 1} ล้นขอบซ้าย`)
    assert(node.x + radius <= 100, `ด่าน ${node.index + 1} ล้นขอบขวา`)
    assert(node.y - radius >= 0, `ด่าน ${node.index + 1} ล้นขอบบน`)
    assert(node.y + radius <= layout.height, `ด่าน ${node.index + 1} ล้นขอบล่าง`)
  }
})

check('ด่านเรียงจากบนลงล่างตามลำดับจริง', () => {
  const stages = Array.from({ length: 10 }, (_, i) => ({ id: `s${i}`, isBoss: false }))
  const layout = SM.buildStageMap(stages)

  for (let i = 1; i < layout.nodes.length; i += 1) {
    assert(layout.nodes[i].y > layout.nodes[i - 1].y,
      `ด่าน ${i + 1} ต้องอยู่ต่ำกว่าด่าน ${i}`)
  }
})

check('เส้นทางเชื่อมหมุดครบทุกด่าน', () => {
  const stages = Array.from({ length: 10 }, (_, i) => ({ id: `s${i}`, isBoss: i === 9 }))
  const layout = SM.buildStageMap(stages)

  assert(layout.pathD.startsWith('M '), 'เส้นทางต้องเริ่มด้วยคำสั่งย้ายจุด')
  const curves = (layout.pathD.match(/C /g) ?? []).length
  equal(curves, stages.length - 1, 'จำนวนเส้นโค้งต้องเท่ากับช่วงระหว่างด่าน')
  assert(!layout.pathD.includes('NaN'), 'เส้นทางมีค่า NaN')
})

check('แผนที่ของ World 1 จริงสร้างได้และครบทุกด่าน', () => {
  const stages = STAGES.getStagesByWorld('world-1')
  const layout = SM.buildStageMap(stages)
  equal(layout.nodes.length, stages.length, 'จำนวนหมุดไม่ตรงกับจำนวนด่านจริง')

  const bossNodes = layout.nodes.filter((node) => node.isBoss)
  assert(bossNodes.length >= 1, 'ควรมีหมุดบอสอย่างน้อยหนึ่งอัน')
  equal(bossNodes[0].index, stages.length - 1, 'ด่านบอสควรอยู่ท้ายสุด')
})

check('ไม่มีด่านเลยก็ต้องไม่พัง', () => {
  const layout = SM.buildStageMap([])
  equal(layout.nodes.length, 0, 'ต้องไม่มีหมุด')
  equal(layout.pathD, '', 'ต้องไม่มีเส้นทาง')
  assert(layout.height > 0, 'ความสูงต้องมากกว่าศูนย์ ไม่งั้นกรอบจะยุบ')
})

check('หมุดทุกสถานะวาดได้ และไม่ใช้สีอย่างเดียวบอกสถานะ', () => {
  const statuses = ['LOCKED', 'AVAILABLE', 'IN_PROGRESS', 'COMPLETED', 'MASTERED']
  for (const status of statuses) {
    const pin = SM.stagePin(status, '3', false)
    assertValidSvg(pin, `หมุดสถานะ ${status}`)
    // ต้องมีตัวเลขหรือสัญลักษณ์กำกับเสมอ เด็กตาบอดสีจึงอ่านออก
    assert(/<text/.test(pin), `${status}: ต้องมีตัวหนังสือหรือสัญลักษณ์กำกับ`)
  }
})

check('หมุดบอสใหญ่กว่าหมุดปกติและมีมงกุฎ', () => {
  const normal = SM.stagePin('AVAILABLE', '1', false)
  const boss = SM.stagePin('AVAILABLE', '10', true)
  assert(boss.length > normal.length, 'หมุดบอสควรมีรายละเอียดมากกว่า')
  assert(SM.BOSS_PIN_RADIUS > SM.PIN_RADIUS, 'รัศมีหมุดบอสต้องใหญ่กว่า')
})

// ══ ขนาดไฟล์ ══

/**
 * งบขนาดของภาพ
 *
 * เดิมวัดจากขนาดข้อความดิบ ซึ่งวัดผิดจุด
 * เพราะเว็บเสิร์ฟผ่าน gzip เสมอ และ SVG ที่สร้างจากโค้ดมีคำซ้ำเยอะมาก
 * (ชื่อ tag ชื่อ attribute เลขพิกัด) จึงบีบอัดได้ราวสิบเท่า
 * เน็ตมือถือจ่ายค่าข้อมูลตามขนาดที่บีบแล้ว จึงต้องคุมตัวเลขนั้น
 *
 * ยังคุมขนาดดิบไว้ด้วยแต่ตั้งเพดานหลวม ๆ
 * ไม่ใช่เพื่อค่าเน็ต แต่กันกรณีเผลอสร้างภาพวนซ้ำจนบวมผิดปกติ
 */
check('ภาพทั้งหมดรวมกันต้องเล็กพอสำหรับเน็ตมือถือ', () => {
  let all = ''
  for (const id of MA.MONSTER_ART_IDS) all += MA.monsterArt(id)
  for (const id of HA.HERO_ART_IDS) all += HA.heroArt(id)
  for (const world of WORLDS.WORLDS) all += SA.worldScene(world.id)

  const rawKb = Buffer.byteLength(all) / 1024
  const gzipKb = zlib.gzipSync(all).length / 1024
  const count = MA.MONSTER_ART_IDS.length + HA.HERO_ART_IDS.length + WORLDS.WORLDS.length

  assert(gzipKb < 45, `ภาพรวมกันหลังบีบอัด ${gzipKb.toFixed(0)} KB ใหญ่เกินไป`)
  assert(rawKb < 400, `ภาพดิบรวมกัน ${rawKb.toFixed(0)} KB ผิดปกติ อาจมีการสร้างซ้ำ`)
  console.log(
    `      ภาพทั้งหมด ${count} ภาพ รวม ${rawKb.toFixed(1)} KB` +
      ` (ส่งจริงหลัง gzip ${gzipKb.toFixed(1)} KB)`,
  )
})

console.log(`ผ่าน ${passed} ข้อ`)
if (failures.length > 0) {
  console.log(`\nไม่ผ่าน ${failures.length} ข้อ`)
  failures.forEach((line, i) => console.log(`  ${i + 1}. ${line}`))
  process.exit(1)
}
console.log('ผ่านทั้งหมด')
