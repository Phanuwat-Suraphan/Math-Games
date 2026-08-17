/**
 * ชุดทดสอบสมุดสถิติและถ้วยรางวัล
 *
 * ทำไมต้องมี
 *
 * ถ้วยรางวัลทุกใบเป็นฟังก์ชันที่อ่านข้อมูลผู้เล่นแล้วตอบว่าได้หรือยัง
 * ถ้าใบไหนอ่านฟิลด์ที่ไม่มีอยู่จริง มันจะไม่พังเสียงดัง
 * แต่จะได้ undefined แล้วเปรียบเทียบเป็นเท็จเงียบ ๆ
 * ผลคือถ้วยใบนั้นไม่มีวันได้ ไม่ว่าเด็กจะทำอะไรก็ตาม
 * และไม่มีใครรู้ เพราะบนหน้าจอมันดูเหมือนถ้วยที่ยังไม่ถึงเป้าธรรมดา
 *
 * ชุดนี้จึงเรียกทุกใบสองรอบ รอบแรกกับผู้เล่นใหม่เอี่ยม
 * รอบสองกับผู้เล่นที่ทำทุกอย่างจนสุดแล้ว แล้วบังคับว่าผลต้องต่างกัน
 * ใบไหนที่ให้ผลเหมือนกันทั้งสองรอบ แปลว่าเงื่อนไขของมันแตะไม่ถึง
 *
 * วิธีใช้
 *   npx tsc -p tsconfig.tests.json --outDir /tmp/logic
 *   node tests/records.test.mjs /tmp/logic
 */

import path from 'path'
import { createRequire } from 'module'

const OUT = process.argv[2]
if (!OUT) {
  console.error('ใช้: node tests/records.test.mjs <โฟลเดอร์ JS ที่คอมไพล์แล้ว>')
  process.exit(1)
}

class MemoryStorage {
  constructor() { this.map = new Map() }
  getItem(key) { return this.map.has(key) ? this.map.get(key) : null }
  setItem(key, value) { this.map.set(key, String(value)) }
  removeItem(key) { this.map.delete(key) }
  clear() { this.map.clear() }
}
globalThis.window = { localStorage: new MemoryStorage() }

const require = createRequire(import.meta.url)
const load = (name) => require(path.resolve(OUT, name + '.js'))

const REC = load('services/recordService')
const STORAGE = load('services/storage')
const ACH = load('data/achievements')
const STAGES = load('data/stages')
const STORY = load('data/story')
const AVATARS = load('data/avatars')
const PERKS = load('data/perks')
const WEAPONS = load('survivor/weapons')
const ITEMS = load('data/items')
const UP = load('services/upgradeService')
const QUESTS = load('data/quests')
const QS = load('services/questService')

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

const fresh = () => STORAGE.createPlayer('เด็กทดสอบ', 'warrior')

/* ── สมุดสถิติ ───────────────────────────────────────────── */

check('ผู้เล่นใหม่มีสมุดสถิติที่ว่างเปล่าครบทุกช่อง', () => {
  const player = fresh()
  const records = player.records
  assert(records, 'ผู้เล่นใหม่ต้องมีฟิลด์ records')
  for (const [key, value] of Object.entries(records)) {
    if (Array.isArray(value)) equal(value.length, 0, `${key} ต้องเริ่มจากรายการว่าง`)
    else equal(value, 0, `${key} ต้องเริ่มจากศูนย์`)
  }
})

check('บันทึกรอบสนามรบแล้วตัวนับสะสมเพิ่ม และสถิติที่ดีที่สุดใช้ค่าสูงกว่า', () => {
  let player = fresh()
  player = { ...player, records: REC.recordSurvivorRun(player, {
    survivedSeconds: 200, kills: 120, bossesDown: 3, evolvedIds: ['sword'], ultimatesUsed: 4,
  }) }
  equal(player.records.survivorRuns, 1, 'รอบแรกต้องนับเป็นหนึ่ง')
  equal(player.records.survivorBestSeconds, 200, 'เวลาดีที่สุดต้องเป็น 200')

  // รอบที่สองแย่กว่าเดิม เวลาดีที่สุดต้องไม่ถอยลง แต่ยอดสะสมต้องเพิ่ม
  player = { ...player, records: REC.recordSurvivorRun(player, {
    survivedSeconds: 40, kills: 10, bossesDown: 0, evolvedIds: [], ultimatesUsed: 1,
  }) }
  equal(player.records.survivorRuns, 2, 'ต้องนับเป็นสองรอบ')
  equal(player.records.survivorBestSeconds, 200, 'รอบที่แย่กว่าต้องไม่ทับสถิติเดิม')
  equal(player.records.survivorKills, 130, 'ยอดล้มต้องสะสมต่อ')
  equal(player.records.survivorUltimates, 5, 'จำนวนสกิลวิเศษต้องสะสมต่อ')
})

check('ร่างสมบูรณ์แบบเดิมซ้ำไม่ทำให้จำนวนแบบเพิ่มขึ้น', () => {
  let player = fresh()
  for (let i = 0; i < 5; i += 1) {
    player = { ...player, records: REC.recordSurvivorRun(player, {
      survivedSeconds: 100, kills: 1, bossesDown: 0, evolvedIds: ['fire'], ultimatesUsed: 0,
    }) }
  }
  equal(player.records.survivorEvolutions.length, 1, 'แบบเดิมซ้ำต้องนับแบบเดียว')

  player = { ...player, records: REC.recordSurvivorRun(player, {
    survivedSeconds: 100, kills: 1, bossesDown: 0, evolvedIds: ['fire', 'ice'], ultimatesUsed: 0,
  }) }
  equal(player.records.survivorEvolutions.length, 2, 'แบบใหม่ต้องถูกเพิ่ม')
})

check('บันทึกศึกผ่าสมการนับทั้งตาที่เล่นและตาที่ชนะ', () => {
  let player = fresh()
  player = { ...player, records: REC.recordDuel(player, false) }
  player = { ...player, records: REC.recordDuel(player, true) }
  equal(player.records.duelPlays, 2, 'ต้องนับสองตา')
  equal(player.records.duelWins, 1, 'ต้องนับชนะหนึ่งครั้ง')
})

check('หอคอยเก็บเฉพาะชั้นที่สูงที่สุด', () => {
  let player = fresh()
  player = { ...player, records: REC.recordTowerRun(player, 12) }
  player = { ...player, records: REC.recordTowerRun(player, 5) }
  equal(player.records.towerBestFloor, 12, 'รอบที่ต่ำกว่าต้องไม่ทับสถิติเดิม')
})

check('ค่าที่ถูกแก้มาจาก localStorage ต้องถูกดัดให้ปลอดภัย', () => {
  const broken = {
    survivorRuns: -5,
    survivorBestSeconds: Number.NaN,
    survivorKills: 1e30,
    survivorBossKills: 3.7,
    survivorEvolutions: ['sword', 'sword', 42, null],
    survivorUltimates: 'มาก',
    duelPlays: 2,
    duelWins: 1,
    towerBestFloor: -1,
  }
  const records = REC.recordsOf({ records: broken })
  equal(records.survivorRuns, 0, 'ค่าติดลบต้องกลายเป็นศูนย์')
  equal(records.survivorBestSeconds, 0, 'NaN ต้องกลายเป็นศูนย์')
  assert(Number.isSafeInteger(records.survivorKills), 'ค่ามหาศาลต้องถูกจำกัดให้อยู่ในช่วงที่ปลอดภัย')
  equal(records.survivorBossKills, 3, 'ทศนิยมต้องถูกปัดลงเป็นจำนวนเต็ม')
  equal(records.survivorEvolutions.length, 1, 'รายการต้องเหลือเฉพาะรหัสที่เป็นข้อความและไม่ซ้ำ')
  equal(records.survivorUltimates, 0, 'ค่าที่ไม่ใช่ตัวเลขต้องกลายเป็นศูนย์')
  equal(records.towerBestFloor, 0, 'ชั้นติดลบต้องกลายเป็นศูนย์')
})

check('ผู้เล่นที่ไม่มีฟิลด์ records เลย ต้องอ่านได้โดยไม่พัง', () => {
  const records = REC.recordsOf({})
  equal(records.survivorRuns, 0, 'ต้องได้สมุดเปล่า ไม่ใช่ error')
  equal(records.survivorEvolutions.length, 0, 'รายการต้องเป็นอาร์เรย์ว่าง')
})

/* ── การย้ายข้อมูลเก่า ───────────────────────────────────── */

check('ข้อมูลบันทึกเวอร์ชันเก่าถูกเติมสมุดสถิติให้ โดยของเดิมไม่หาย', () => {
  const storage = globalThis.window.localStorage
  storage.clear()

  const old = fresh()
  delete old.records
  storage.setItem(
    'math-adventure:player:v1',
    JSON.stringify({ version: 7, player: { ...old, coins: 777, bestStreak: 9 } }),
  )

  const result = STORAGE.loadPlayer()
  assert(result.data, 'ต้องอ่านข้อมูลเก่าได้')
  equal(result.data.coins, 777, 'เหรียญเดิมต้องอยู่ครบ')
  equal(result.data.bestStreak, 9, 'สถิติเดิมต้องอยู่ครบ')
  assert(result.data.records, 'ต้องได้สมุดสถิติเพิ่มมาให้')
  equal(result.data.records.survivorRuns, 0, 'สมุดสถิติของผู้เล่นเก่าต้องเริ่มจากศูนย์')
})

check('สมุดสถิติเดินทางผ่านการบันทึกและอ่านกลับได้ครบ', () => {
  const storage = globalThis.window.localStorage
  storage.clear()

  let player = fresh()
  player = { ...player, records: REC.recordSurvivorRun(player, {
    survivedSeconds: 321, kills: 88, bossesDown: 2, evolvedIds: ['ice', 'lightning'], ultimatesUsed: 7,
  }) }
  STORAGE.savePlayer(player)

  const loaded = STORAGE.loadPlayer().data
  equal(loaded.records.survivorBestSeconds, 321, 'เวลาดีที่สุดต้องถูกบันทึกไว้')
  equal(loaded.records.survivorEvolutions.length, 2, 'ร่างสมบูรณ์ต้องถูกบันทึกไว้ครบ')
})

/* ── ถ้วยรางวัล ─────────────────────────────────────────── */

/** ผู้เล่นที่ทำทุกอย่างในเกมจนสุดแล้ว ใช้ตรวจว่าทุกถ้วยแตะถึงได้จริง */
function maxedPlayer() {
  const base = fresh()

  const stageProgress = {}
  for (const stage of STAGES.STAGES) {
    stageProgress[stage.id] = {
      stageId: stage.id,
      completed: true,
      mastered: true,
      stars: 3,
      bestScore: 100,
      attempts: 1,
      lastPlayedAt: new Date().toISOString(),
    }
  }

  const statistics = {}
  for (const key of Object.keys(base.statistics)) {
    statistics[key] = { attempts: 50, correct: 50, accuracy: 100 }
  }

  /*
   * ตีบวกของทุกชิ้นจนเต็ม ไม่ใช่แค่ชิ้นเดียว
   *
   * ตอนแรกผมใส่แค่ชิ้นเดียวแล้วเงื่อนไข "ตีบวกรวมหกดาว" ก็แตะไม่ถึง
   * ซึ่งชุดทดสอบรายงานว่าเป็นภารกิจที่ทำไม่ได้ ทั้งที่ของจริงทำได้สบาย
   * ตัวอย่างผู้เล่นที่ควรแปลว่า "ทำทุกอย่างจนสุดแล้ว" ต้องสุดจริงทุกช่อง
   * ไม่งั้นมันจะรายงานว่าของที่ใช้ได้จริงนั้นใช้ไม่ได้
   */
  const upgrades = {}
  for (const item of ITEMS.ITEMS) upgrades[item.id] = UP.MAX_STARS

  const perks = {}
  for (const perk of PERKS.PERKS) perks[perk.id] = perk.maxLevel

  return {
    ...base,
    level: 20,
    coins: 99_999,
    totalQuestions: 2000,
    correctAnswers: 2000,
    bestStreak: 100,
    completedStages: Object.keys(stageProgress),
    stageProgress,
    statistics,
    upgrades,
    perks,
    ownedAvatars: AVATARS.AVATARS.map((avatar) => avatar.id),
    storyFlags: STORY.STORY_BEATS.map((beat) => beat.grantsFlag).filter(Boolean),
    records: {
      survivorRuns: 100,
      survivorBestSeconds: 900,
      survivorKills: 5000,
      survivorBossKills: 50,
      survivorEvolutions: WEAPONS.WEAPONS.map((weapon) => weapon.id),
      survivorUltimates: 200,
      duelPlays: 100,
      duelWins: 60,
      towerBestFloor: 40,
    },
  }
}

check('ถ้วยรางวัลทุกใบมีรหัสไม่ซ้ำกัน', () => {
  const ids = ACH.ACHIEVEMENTS.map((item) => item.id)
  equal(new Set(ids).size, ids.length, `มีรหัสซ้ำ: ${ids.filter((id, i) => ids.indexOf(id) !== i)}`)
})

check('ถ้วยรางวัลทุกใบอยู่ในหมวดที่มีอยู่จริง', () => {
  const known = new Set(ACH.CATEGORY_INFO.map((category) => category.id))
  const stray = ACH.ACHIEVEMENTS.filter((item) => !known.has(item.category))
  equal(stray.length, 0, `อยู่ในหมวดที่ไม่มีอยู่จริง: ${stray.map((i) => i.id)}`)
})

check('ทุกหมวดต้องมีถ้วยอย่างน้อยหนึ่งใบ', () => {
  for (const category of ACH.CATEGORY_INFO) {
    const count = ACH.ACHIEVEMENTS.filter((item) => item.category === category.id).length
    assert(count > 0, `หมวด ${category.name} ไม่มีถ้วยเลย จะกลายเป็นหัวข้อว่าง ๆ บนหน้าจอ`)
  }
})

check('ผู้เล่นใหม่ต้องยังไม่ได้ถ้วยใบไหนเลย', () => {
  const player = fresh()
  const early = ACH.ACHIEVEMENTS.filter((item) => item.isUnlocked(player))
  equal(early.length, 0, `ได้ถ้วยตั้งแต่ยังไม่เล่น: ${early.map((i) => i.id)}`)
})

check('ผู้เล่นที่ทำทุกอย่างจนสุดต้องได้ถ้วยครบทุกใบ', () => {
  const player = maxedPlayer()
  const missing = ACH.ACHIEVEMENTS.filter((item) => !item.isUnlocked(player))
  equal(
    missing.length,
    0,
    `ถ้วยที่แตะไม่ถึงแม้ทำทุกอย่างแล้ว: ${missing.map((i) => i.id)}\n` +
      '      ถ้วยแบบนี้จะไม่มีวันได้ และไม่มีอะไรฟ้องบนหน้าจอ',
  )
})

check('ข้อความความคืบหน้าต้องอ่านได้จริงทั้งสองสถานะ ไม่มี undefined หรือ NaN', () => {
  for (const player of [fresh(), maxedPlayer()]) {
    for (const item of ACH.ACHIEVEMENTS) {
      const text = item.getProgressText(player)
      assert(typeof text === 'string' && text.length > 0, `${item.id} ให้ข้อความว่าง`)
      assert(!text.includes('undefined'), `${item.id} มีคำว่า undefined ในข้อความ: ${text}`)
      assert(!text.includes('NaN'), `${item.id} มีคำว่า NaN ในข้อความ: ${text}`)
      assert(!text.includes('Infinity'), `${item.id} มีคำว่า Infinity ในข้อความ: ${text}`)
    }
  }
})

check('ถ้วยที่นับเป็นจำนวนต้องไม่แสดงค่าเกินเป้าหมาย', () => {
  const player = maxedPlayer()
  for (const item of ACH.ACHIEVEMENTS) {
    const text = item.getProgressText(player)
    const match = text.match(/^([\d,]+)\s*\/\s*([\d,]+)/)
    if (!match) continue
    const value = Number(match[1].replace(/,/g, ''))
    const goal = Number(match[2].replace(/,/g, ''))
    assert(value <= goal, `${item.id} แสดงค่าเกินเป้าหมาย: ${text}`)
  }
})

check('ถ้วยทุกใบต้องมีชื่อ คำอธิบาย และไอคอน', () => {
  for (const item of ACH.ACHIEVEMENTS) {
    assert(item.name && item.name.length > 0, `${item.id} ไม่มีชื่อ`)
    assert(item.description && item.description.length > 0, `${item.id} ไม่มีคำอธิบาย`)
    assert(item.emoji && item.emoji.length > 0, `${item.id} ไม่มีไอคอน`)
  }
})

check('ถ้วยของสนามรบต้องตอบสนองต่อสมุดสถิติจริง ไม่ใช่อ่านฟิลด์ที่ไม่มี', () => {
  /*
   * ตรวจเจาะจงหมวดนี้ เพราะเป็นหมวดที่อ่านข้อมูลจากที่ใหม่
   * ถ้าอ่านชื่อฟิลด์ผิด ถ้วยจะค้างที่ศูนย์ตลอดโดยไม่มี error
   */
  let player = fresh()
  const before = ACH.ACHIEVEMENTS.filter((item) => item.category === 'arena')
    .map((item) => item.getProgressText(player))

  player = { ...player, records: REC.recordSurvivorRun(player, {
    survivedSeconds: 150, kills: 60, bossesDown: 2, evolvedIds: ['sword'], ultimatesUsed: 3,
  }) }
  const after = ACH.ACHIEVEMENTS.filter((item) => item.category === 'arena')
    .map((item) => item.getProgressText(player))

  const moved = after.filter((text, index) => text !== before[index]).length
  equal(moved, before.length, 'ถ้วยสนามรบทุกใบต้องขยับหลังเล่นจบหนึ่งรอบ')
})

/* ── ภารกิจที่วัดจากสมุดสถิติ ─────────────────────────────── */

/**
 * เงื่อนไขที่อ่านค่าสะสมจากสมุดสถิติหรือของที่สะสมไว้
 * ค่าพวกนี้ไม่เคยลดลง และไม่รีเซ็ตตอนขึ้นวันใหม่
 */
const CUMULATIVE_TYPES = [
  'survivorTime',
  'survivorKills',
  'survivorBossKills',
  'survivorEvolutions',
  'duelWins',
  'duelPlays',
  'towerFloor',
  'perkLevels',
  'upgradeStars',
  'ownAvatars',
]

check('ภารกิจประจำวันต้องไม่ใช้เงื่อนไขที่วัดจากค่าสะสม', () => {
  /*
   * กับดักที่ข้อนี้ดักไว้
   *
   * ภารกิจประจำวันรีเซ็ตด้วยการลบตัวนับของตัวเองทิ้งตอนขึ้นวันใหม่
   * แต่สมุดสถิติไม่ได้ถูกลบตามไปด้วย เพราะเป็นสถิติถาวรของผู้เล่น
   *
   * ถ้าเอาเงื่อนไขที่อ่านจากสมุดสถิติมาใส่ในภารกิจประจำวัน
   * มันจะค้างเป็น "สำเร็จแล้ว" ตลอดไปตั้งแต่วันที่ผ่านครั้งแรก
   * แล้วเด็กจะกดรับรางวัลประจำวันฟรีทุกวันโดยไม่ต้องทำอะไรเลย
   * ซึ่งไม่มีอะไรฟ้อง เพราะบนหน้าจอมันดูเหมือนภารกิจที่สำเร็จตามปกติ
   */
  const offenders = []
  for (const quest of QUESTS.DAILY_QUESTS) {
    for (const requirement of quest.requirements) {
      if (CUMULATIVE_TYPES.includes(requirement.type)) {
        offenders.push(`${quest.id} ใช้ ${requirement.type}`)
      }
    }
  }
  equal(
    offenders.length,
    0,
    `ภารกิจประจำวันใช้เงื่อนไขค่าสะสม: ${offenders.join(', ')}` +
      ' — ภารกิจแบบนี้จะสำเร็จค้างตลอดไปและแจกรางวัลฟรีทุกวัน',
  )
})

check('เงื่อนไขทุกชนิดที่ภารกิจใช้ ต้องมีวิธีวัดจริง', () => {
  /*
   * ชนิดที่ไม่มีวิธีวัดจะตกไปที่ default แล้วคืนศูนย์เสมอ
   * ภารกิจนั้นจะไม่มีวันสำเร็จ และไม่มี error ให้เห็นเลยแม้แต่นิดเดียว
   */
  const player = maxedPlayer()
  const broken = []

  for (const quest of QUESTS.ALL_QUESTS) {
    quest.requirements.forEach((requirement, index) => {
      if (!CUMULATIVE_TYPES.includes(requirement.type)) return
      const progress = { questId: quest.id, counters: [], completed: false, claimed: false }
      const value = QS.measureRequirement(player, progress, requirement, index)
      if (!(value > 0)) broken.push(`${quest.id} · ${requirement.type} วัดได้ ${value}`)
    })
  }

  equal(
    broken.length,
    0,
    `เงื่อนไขที่วัดไม่ได้: ${broken.join(', ')}` +
      ' — เงื่อนไขที่ไม่มีวิธีวัดจะคืนศูนย์เสมอ ภารกิจจึงไม่มีวันสำเร็จ',
  )
})

check('ภารกิจของโหมดใหม่เริ่มจากยังไม่สำเร็จ และสำเร็จได้เมื่อเล่นจริง', () => {
  const newPlayer = fresh()
  const maxed = maxedPlayer()

  const cumulative = QUESTS.ALL_QUESTS.filter((quest) =>
    quest.requirements.some((r) => CUMULATIVE_TYPES.includes(r.type)),
  )
  assert(cumulative.length >= 8, `ควรมีภารกิจของโหมดใหม่หลายข้อ แต่มีแค่ ${cumulative.length}`)

  for (const quest of cumulative) {
    const empty = { questId: quest.id, counters: [], completed: false, claimed: false }
    assert(
      !QS.isQuestComplete(newPlayer, quest, empty),
      `${quest.id} สำเร็จตั้งแต่ผู้เล่นยังไม่ได้เล่นอะไรเลย`,
    )
    assert(
      QS.isQuestComplete(maxed, quest, empty),
      `${quest.id} ยังไม่สำเร็จแม้ผู้เล่นทำทุกอย่างจนสุดแล้ว ซึ่งแปลว่าแตะไม่ถึง`,
    )
  }
})

check('รหัสภารกิจต้องไม่ซ้ำกัน', () => {
  const ids = QUESTS.ALL_QUESTS.map((quest) => quest.id)
  equal(new Set(ids).size, ids.length, `มีรหัสภารกิจซ้ำ: ${ids.filter((id, i) => ids.indexOf(id) !== i)}`)
})

check('ภารกิจทุกข้อมีชื่อ คำอธิบาย เงื่อนไข และรางวัล', () => {
  for (const quest of QUESTS.ALL_QUESTS) {
    assert(quest.title && quest.title.length > 0, `${quest.id} ไม่มีชื่อ`)
    assert(quest.description && quest.description.length > 0, `${quest.id} ไม่มีคำอธิบาย`)
    assert(quest.requirements.length > 0, `${quest.id} ไม่มีเงื่อนไขเลย จะสำเร็จทันที`)
    assert(quest.reward.exp > 0 || quest.reward.coins > 0, `${quest.id} ไม่มีรางวัล`)
    for (const requirement of quest.requirements) {
      assert(requirement.target > 0, `${quest.id} มีเงื่อนไขที่เป้าหมายเป็นศูนย์`)
      assert(requirement.label.length > 0, `${quest.id} มีเงื่อนไขที่ไม่มีคำอธิบาย`)
    }
  }
})

console.log(
  `ผ่าน ${passed} ข้อ · ถ้วยรางวัล ${ACH.ACHIEVEMENTS.length} ใบ ใน ${ACH.CATEGORY_INFO.length} หมวด` +
    ` · ภารกิจ ${QUESTS.ALL_QUESTS.length} ข้อ`,
)
if (failures.length > 0) {
  console.log(`\nไม่ผ่าน ${failures.length} ข้อ`)
  failures.forEach((line, i) => console.log(`  ${i + 1}. ${line}`))
  process.exit(1)
}
console.log('ผ่านทั้งหมด')
