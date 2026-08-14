/**
 * ชุดทดสอบระบบความก้าวหน้าของ Math Adventure (Part 1–3)
 *
 * ครอบคลุมรายการทดสอบที่สเปก Part 3 กำหนดไว้ (Test 1–9)
 * ส่วน Test 10 (UI บนมือถือ) ต้องดูด้วยตาบนเบราว์เซอร์ ทดสอบอัตโนมัติแทนไม่ได้
 *
 * ทดสอบเฉพาะตรรกะล้วน ไม่แตะ React จึงรันได้โดยไม่ต้องติดตั้ง dependency
 *
 * วิธีใช้
 *   tsc --ignoreConfig src/types/*.ts src/data/*.ts src/utils/*.ts \
 *     src/services/storage.ts src/services/rewardService.ts src/services/questService.ts \
 *     --outDir /tmp/ma --target ES2020 --module commonjs --strict --skipLibCheck --lib ES2020,DOM
 *   node tests/progression.test.mjs /tmp/ma
 */

import path from 'path'
import { createRequire } from 'module'

const OUT = process.argv[2]
if (!OUT) {
  console.error('ใช้: node tests/progression.test.mjs <โฟลเดอร์ JS ที่คอมไพล์แล้ว>')
  process.exit(1)
}

/** localStorage จำลอง เพราะ storage.ts อ่านจาก window.localStorage โดยตรง */
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

const WORLDS = load('data/worlds')
const STAGES = load('data/stages')
const QUESTS = load('data/quests')
const SS = load('utils/stageSystem')
const EXP = load('utils/experience')
const STORAGE = load('services/storage')
const RW = load('services/rewardService')
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

const WORLD_1 = 'world-1'
const world1Stages = () => STAGES.getStagesByWorld(WORLD_1)
const fresh = () => STORAGE.createPlayer('เด็กทดสอบ', 'explorer')

/** เล่นด่านให้จบด้วยจำนวนข้อที่ถูกตามต้องการ */
function playStage(player, stage, correct) {
  return RW.completeStage(player, {
    stage,
    correctAnswers: correct,
    totalQuestions: stage.questionCount,
    expFromAnswers: 0,
    coinsFromAnswers: 0,
  })
}

/** เล่นให้ผ่านเกณฑ์แบบพอดี ๆ */
function clearStage(player, stage) {
  return playStage(player, stage, SS.getRequiredCorrectAnswers(stage)).player
}

// ══ โครงสร้างข้อมูล ══

check('มีโลกครบ 6 โลกตามสเปก', () => {
  equal(WORLDS.WORLDS.length, 6, 'จำนวนโลกไม่ครบ')
  const orders = WORLDS.WORLDS.map((w) => w.order)
  equal(new Set(orders).size, 6, 'ลำดับโลกซ้ำกัน')
})

check('World 1 มีอย่างน้อย 10 ด่าน', () => {
  assert(world1Stages().length >= 10, `World 1 มี ${world1Stages().length} ด่าน`)
})

check('ทุกด่านมี passingScore และรางวัลครบ ไม่ hard-code', () => {
  for (const stage of STAGES.STAGES) {
    assert(stage.passingScore > 0 && stage.passingScore <= 100,
      `${stage.id}: passingScore ผิดช่วง (${stage.passingScore})`)
    assert(stage.questionCount > 0, `${stage.id}: ไม่มี questionCount`)
    assert(stage.firstClearReward && stage.replayReward, `${stage.id}: รางวัลไม่ครบ`)
    assert(Array.isArray(stage.questionTypes) && stage.questionTypes.length > 0,
      `${stage.id}: ไม่ได้กำหนด questionTypes`)
  }
})

check('รางวัลเล่นซ้ำต้องน้อยกว่ารางวัลผ่านครั้งแรก', () => {
  for (const stage of STAGES.STAGES) {
    assert(stage.replayReward.exp < stage.firstClearReward.exp,
      `${stage.id}: EXP เล่นซ้ำไม่น้อยกว่าครั้งแรก`)
  }
})

check('ด่านทุกด่านอ้างถึงโลกที่มีจริง และด่านก่อนหน้าที่มีจริง', () => {
  const stageIds = new Set(STAGES.STAGES.map((s) => s.id))
  for (const stage of STAGES.STAGES) {
    assert(WORLDS.getWorld(stage.worldId), `${stage.id}: โลก ${stage.worldId} ไม่มีอยู่จริง`)
    if (stage.requiredStageId) {
      assert(stageIds.has(stage.requiredStageId),
        `${stage.id}: ด่านก่อนหน้า ${stage.requiredStageId} ไม่มีอยู่จริง`)
    }
  }
})

// ══ Test 1 — World 1 เปิด World 2–6 ล็อก ══

check('Test 1 — ผู้เล่นใหม่: World 1 เปิด World อื่นล็อกหมด', () => {
  const player = fresh()
  equal(player.unlockedWorlds.length, 1, 'ควรเปิดแค่โลกเดียว')
  equal(player.unlockedWorlds[0], WORLD_1, 'โลกที่เปิดต้องเป็น World 1')
  for (const world of WORLDS.WORLDS) {
    const state = SS.getWorldLockState(player, world)
    if (world.id === WORLD_1) assert(state.isUnlocked, 'World 1 ต้องเปิด')
    else assert(!state.isUnlocked, `${world.id} ต้องยังล็อก`)
  }
})

check('โลกที่ล็อกต้องบอกเงื่อนไขปลดล็อก ไม่ใช่แค่คำว่า LOCKED', () => {
  const player = fresh()
  const world2 = WORLDS.WORLDS.find((w) => w.order === 2)
  const state = SS.getWorldLockState(player, world2)
  assert(typeof state.reason === 'string' && state.reason.length > 0,
    'ต้องมีข้อความอธิบายว่าต้องทำอะไรถึงจะปลดล็อก')
})

// ══ Test 2 — ด่านแรกเล่นได้ ด่านสองล็อก ══

check('Test 2 — ผู้เล่นใหม่: ด่าน 1 เล่นได้ ด่าน 2 ล็อก', () => {
  const player = fresh()
  const [first, second] = world1Stages()
  equal(SS.getStageStatus(player, first), 'AVAILABLE', 'ด่าน 1 ต้องเล่นได้')
  equal(SS.getStageStatus(player, second), 'LOCKED', 'ด่าน 2 ต้องล็อก')
})

// ══ Test 3 — ผ่านด่าน 1 แล้วด่าน 2 เปิด ══

check('Test 3 — ผ่านด่าน 1 แล้วด่าน 2 ปลดล็อก', () => {
  const [first, second] = world1Stages()
  const outcome = playStage(fresh(), first, SS.getRequiredCorrectAnswers(first))
  assert(outcome.result.isPassed, 'ควรผ่านเกณฑ์')
  equal(outcome.result.unlockedStageId, second.id, 'ควรรายงานว่าปลดล็อกด่าน 2')
  equal(SS.getStageStatus(outcome.player, second), 'AVAILABLE', 'ด่าน 2 ต้องเล่นได้แล้ว')
})

check('ทำคะแนนไม่ถึงเกณฑ์ ด่านถัดไปต้องยังไม่เปิด', () => {
  const [first, second] = world1Stages()
  const need = SS.getRequiredCorrectAnswers(first)
  const outcome = playStage(fresh(), first, Math.max(0, need - 1))
  assert(!outcome.result.isPassed, 'ไม่ควรผ่านเกณฑ์')
  equal(SS.getStageStatus(outcome.player, second), 'LOCKED', 'ด่าน 2 ต้องยังล็อก')
})

check('ทำไม่ผ่านยังได้รางวัลปลอบใจ ไม่ใช่ศูนย์', () => {
  const [first] = world1Stages()
  const outcome = playStage(fresh(), first, 1)
  assert(outcome.result.bonusExp > 0 || outcome.result.bonusCoins > 0,
    'ควรได้รางวัลเล็กน้อยแม้ไม่ผ่าน')
})

// ══ Test 4 — เล่นซ้ำได้รางวัลเล่นซ้ำ ══

check('Test 4 — เล่นด่านเดิมซ้ำ ได้รางวัลอัตราเล่นซ้ำ', () => {
  const [first] = world1Stages()
  const need = SS.getRequiredCorrectAnswers(first)

  const firstClear = playStage(fresh(), first, need)
  equal(firstClear.result.bonusExp, first.firstClearReward.exp, 'ครั้งแรกต้องได้รางวัลเต็ม')
  assert(firstClear.result.isFirstClear, 'ต้องนับเป็นการผ่านครั้งแรก')

  const replay = playStage(firstClear.player, first, need)
  equal(replay.result.bonusExp, first.replayReward.exp, 'เล่นซ้ำต้องได้รางวัลเล่นซ้ำ')
  assert(!replay.result.isFirstClear, 'เล่นซ้ำต้องไม่นับเป็นครั้งแรก')
  equal(RW.isReplayOf(firstClear.player, first.id), true, 'ต้องรู้ว่าเป็นการเล่นซ้ำ')
})

check('เล่นซ้ำแล้วทำได้ดีกว่า สถิติที่ดีที่สุดต้องถูกอัปเดต', () => {
  const [first] = world1Stages()
  const need = SS.getRequiredCorrectAnswers(first)

  let player = playStage(fresh(), first, need).player
  const before = SS.getStageProgress(player, first.id)

  player = playStage(player, first, first.questionCount).player
  const after = SS.getStageProgress(player, first.id)

  assert(after.bestScore > before.bestScore, 'คะแนนดีที่สุดต้องเพิ่ม')
  assert(after.bestAccuracy > before.bestAccuracy, 'ความแม่นยำดีที่สุดต้องเพิ่ม')
  equal(after.attempts, before.attempts + 1, 'จำนวนครั้งที่เล่นต้องเพิ่ม')
})

check('เล่นซ้ำแล้วทำได้แย่กว่า สถิติที่ดีที่สุดต้องไม่ลดลง', () => {
  const [first] = world1Stages()
  let player = playStage(fresh(), first, first.questionCount).player
  const best = SS.getStageProgress(player, first.id)

  player = playStage(player, first, 1).player
  const after = SS.getStageProgress(player, first.id)

  equal(after.bestScore, best.bestScore, 'คะแนนดีที่สุดต้องไม่ลด')
  equal(after.stars, best.stars, 'ดาวต้องไม่ลด')
  assert(after.completed, 'ด่านที่เคยผ่านต้องยังนับว่าผ่าน')
})

// ══ Test 5 — ดาวและ Mastered ══

check('calculateStageStars ให้ดาวตามเกณฑ์ความแม่นยำ', () => {
  equal(SS.calculateStageStars(100), 3, '100% ต้องได้ 3 ดาว')
  equal(SS.calculateStageStars(90), 3, '90% ต้องได้ 3 ดาว')
  equal(SS.calculateStageStars(89), 2, '89% ต้องได้ 2 ดาว')
  equal(SS.calculateStageStars(70), 2, '70% ต้องได้ 2 ดาว')
  equal(SS.calculateStageStars(69), 1, '69% ต้องได้ 1 ดาว')
  equal(SS.calculateStageStars(60), 1, '60% ต้องได้ 1 ดาว')
  equal(SS.calculateStageStars(59), 0, 'ต่ำกว่าเกณฑ์ต้องไม่ได้ดาว')
})

check('Test 5 — ตอบถูกหมดได้ 3 ดาวและกลายเป็น MASTERED', () => {
  const [first] = world1Stages()
  const outcome = playStage(fresh(), first, first.questionCount)
  equal(outcome.result.stars, 3, 'ตอบถูกหมดต้องได้ 3 ดาว')
  assert(outcome.result.isMastered, 'ต้องเป็น Mastered')
  equal(SS.getStageStatus(outcome.player, first), 'MASTERED', 'สถานะด่านต้องเป็น MASTERED')
})

check('ผ่านแบบพอดีเกณฑ์ได้สถานะ COMPLETED ไม่ใช่ MASTERED', () => {
  const [first] = world1Stages()
  const player = clearStage(fresh(), first)
  const status = SS.getStageStatus(player, first)
  assert(status === 'COMPLETED' || status === 'MASTERED', 'ต้องผ่านแล้ว')
  if (SS.getStageProgress(player, first.id).stars < 3) {
    equal(status, 'COMPLETED', 'ยังไม่ครบ 3 ดาวต้องเป็น COMPLETED')
  }
})

// ══ Test 6 — ผ่านทุกด่านใน World 1 แล้ว World 2 เปิด ══

check('Test 6 — พิชิต World 1 ครบทุกด่าน แล้ว World 2 ปลดล็อก', () => {
  let player = fresh()
  for (const stage of world1Stages()) player = clearStage(player, stage)

  assert(SS.isWorldConquered(player, WORLD_1), 'World 1 ต้องถูกพิชิต')
  const world2 = WORLDS.WORLDS.find((w) => w.order === 2)
  assert(player.unlockedWorlds.includes(world2.id), `${world2.id} ต้องปลดล็อกแล้ว`)

  const summary = SS.getWorldProgress(player, WORLD_1)
  equal(summary.completedStages, world1Stages().length, 'ต้องนับว่าผ่านครบทุกด่าน')
  equal(summary.percent, 100, 'ความคืบหน้าต้องเป็น 100%')
})

check('ยังผ่านไม่ครบ World 2 ต้องยังล็อก', () => {
  let player = fresh()
  const stages = world1Stages()
  for (const stage of stages.slice(0, stages.length - 1)) player = clearStage(player, stage)

  const world2 = WORLDS.WORLDS.find((w) => w.order === 2)
  assert(!player.unlockedWorlds.includes(world2.id), 'World 2 ต้องยังไม่ปลดล็อก')
})

check('แก้ข้อมูลใน localStorage เพื่อโกงปลดล็อกโลกไม่ได้', () => {
  const player = fresh()
  // ยัดโลกที่ยังไม่ได้พิชิตเข้าไปตรง ๆ
  const cheated = { ...player, unlockedWorlds: WORLDS.WORLDS.map((w) => w.id) }
  const resolved = SS.resolveUnlockedWorlds(cheated)
  equal(resolved.length, 1, 'ต้องคำนวณใหม่จากความคืบหน้าจริง')
  equal(resolved[0], WORLD_1, 'ต้องเหลือแค่ World 1')
})

// ══ Test 7 — ภารกิจรับรางวัลได้ครั้งเดียว ══

check('Test 7 — ภารกิจที่สำเร็จ รับรางวัลได้ครั้งเดียวเท่านั้น', () => {
  // ภารกิจเก็บเหรียญ วัดจากยอดเหรียญปัจจุบัน จึงทำให้สำเร็จได้ตรง ๆ
  const quest = QUESTS.ALL_QUESTS.find((q) =>
    q.requirements.length === 1 && q.requirements[0].type === 'collectCoins')
  assert(quest, 'ควรมีภารกิจแบบเก็บเหรียญไว้ทดสอบ')

  let player = { ...fresh(), coins: quest.requirements[0].target + 500 }
  player = QS.refreshQuestCompletion(player).player

  const view = QS.buildQuestView(player, quest)
  assert(view.isCompleted, 'ภารกิจควรสำเร็จแล้ว')
  assert(view.canClaim, 'ควรกดรับรางวัลได้')

  const first = QS.claimQuestReward(player, quest.id)
  assert(first.claimed, 'ครั้งแรกต้องรับรางวัลได้')
  assert(first.exp > 0 || first.coins > 0, 'ต้องได้รางวัลจริง')

  const second = QS.claimQuestReward(first.player, quest.id)
  assert(!second.claimed, 'ครั้งที่สองต้องรับซ้ำไม่ได้')
  equal(second.exp, 0, 'รับซ้ำต้องไม่ได้ EXP')
  equal(second.coins, 0, 'รับซ้ำต้องไม่ได้เหรียญ')
  equal(second.player.coins, first.player.coins, 'เหรียญต้องไม่เพิ่มอีก')
})

check('ภารกิจที่ยังไม่สำเร็จ กดรับรางวัลไม่ได้', () => {
  const quest = QUESTS.QUESTS[0]
  const result = QS.claimQuestReward(fresh(), quest.id)
  assert(!result.claimed, 'ยังไม่สำเร็จต้องรับรางวัลไม่ได้')
})

check('ภารกิจที่ไม่มีอยู่จริง ต้องไม่ทำให้ระบบพัง', () => {
  const result = QS.claimQuestReward(fresh(), 'quest-ที่ไม่มีจริง')
  assert(!result.claimed, 'ต้องรับไม่ได้')
  assert(result.player, 'ต้องคืนผู้เล่นกลับมาเสมอ')
})

// ══ Test 8 — ภารกิจประจำวันรีเซ็ตเมื่อขึ้นวันใหม่ ══

check('Test 8 — ภารกิจประจำวันรีเซ็ตเมื่อเปลี่ยนวัน', () => {
  const player = fresh()
  const today = QS.ensureDailyQuests(player)
  assert(today.player.dailyQuests.questIds.length > 0, 'ต้องได้ภารกิจประจำวัน')
  assert(today.player.dailyQuests.date.length > 0, 'ต้องบันทึกวันที่')

  // เรียกซ้ำวันเดิมต้องไม่เปลี่ยนชุด
  const again = QS.ensureDailyQuests(today.player)
  assert(!again.didReset, 'วันเดิมต้องไม่รีเซ็ต')
  equal(again.player.dailyQuests.questIds.join(','),
    today.player.dailyQuests.questIds.join(','), 'ชุดภารกิจต้องเหมือนเดิม')

  // ย้อนวันที่ให้เป็นเมื่อวาน แล้วต้องรีเซ็ต
  const stale = { ...today.player, dailyQuests: { ...today.player.dailyQuests, date: '2000-01-01' } }
  const reset = QS.ensureDailyQuests(stale)
  assert(reset.didReset, 'ขึ้นวันใหม่ต้องรีเซ็ต')
  assert(reset.player.dailyQuests.date !== '2000-01-01', 'วันที่ต้องถูกอัปเดต')
})

check('ภารกิจประจำวันรีเซ็ตแล้ว ความคืบหน้าเดิมต้องถูกล้าง', () => {
  const player = fresh()
  const today = QS.ensureDailyQuests(player).player
  const dailyId = today.dailyQuests.questIds[0]

  const withProgress = {
    ...today,
    questProgress: {
      ...today.questProgress,
      [dailyId]: { questId: dailyId, counters: [99], completed: true, claimed: true },
    },
    dailyQuests: { ...today.dailyQuests, date: '2000-01-01' },
  }

  const reset = QS.ensureDailyQuests(withProgress).player
  const after = reset.questProgress[dailyId]
  if (reset.dailyQuests.questIds.includes(dailyId)) {
    assert(!after || (!after.claimed && (after.counters[0] ?? 0) === 0),
      'ภารกิจประจำวันที่ถูกแจกใหม่ต้องเริ่มนับจากศูนย์')
  }
})

// ══ Test 9 — บันทึกแล้วโหลดกลับ ความคืบหน้าไม่หาย ══

check('Test 9 — บันทึกแล้วโหลดใหม่ ความคืบหน้าอยู่ครบ', () => {
  window.localStorage.clear()

  let player = fresh()
  const stages = world1Stages()
  player = playStage(player, stages[0], stages[0].questionCount).player
  player = clearStage(player, stages[1])
  player = { ...player, coins: 1234 }

  assert(STORAGE.savePlayer(player), 'ต้องบันทึกได้')

  const loaded = STORAGE.loadPlayer()
  equal(loaded.status, 'ok', 'สถานะการโหลดต้องปกติ')

  const after = loaded.data
  equal(after.name, player.name, 'ชื่อต้องอยู่ครบ')
  equal(after.coins, player.coins, 'เหรียญต้องอยู่ครบ')
  equal(after.level, player.level, 'เลเวลต้องอยู่ครบ')
  equal(after.completedStages.length, player.completedStages.length, 'จำนวนด่านที่ผ่านต้องเท่าเดิม')
  equal(SS.getTotalStars(after), SS.getTotalStars(player), 'ดาวรวมต้องเท่าเดิม')
  equal(SS.getStageProgress(after, stages[0].id).stars,
    SS.getStageProgress(player, stages[0].id).stars, 'ดาวรายด่านต้องเท่าเดิม')
})

check('ข้อมูลเสียหายต้องไม่ทำให้เกมพัง', () => {
  for (const junk of ['{', 'null', '[]', '{"version":3}', '{"version":3,"player":{}}', 'ไม่ใช่ JSON']) {
    window.localStorage.clear()
    window.localStorage.setItem('math-adventure:player:v1', junk)
    const result = STORAGE.loadPlayer()
    assert(['corrupted', 'empty', 'ok', 'repaired'].includes(result.status),
      `สถานะแปลก ๆ สำหรับ ${junk}: ${result.status}`)
  }
})

check('ค่าที่ขัดแย้งกันในไฟล์บันทึกต้องถูกซ่อมตอนโหลด', () => {
  window.localStorage.clear()
  const broken = {
    version: 3,
    player: {
      ...fresh(),
      totalQuestions: 10,
      correctAnswers: 999,   // ถูกมากกว่าที่ทำทั้งหมด เป็นไปไม่ได้
      currentStreak: 500,    // มากกว่าสถิติที่ดีที่สุด เป็นไปไม่ได้
      bestStreak: 3,
      coins: -50,            // เหรียญติดลบ เป็นไปไม่ได้
    },
  }
  window.localStorage.setItem('math-adventure:player:v1', JSON.stringify(broken))

  const after = STORAGE.loadPlayer().data
  assert(after, 'ต้องซ่อมแล้วโหลดได้')
  assert(after.correctAnswers <= after.totalQuestions, 'จำนวนที่ถูกต้องไม่เกินจำนวนที่ทำ')
  assert(after.currentStreak <= after.bestStreak, 'streak ปัจจุบันต้องไม่เกินสถิติดีที่สุด')
  assert(after.coins >= 0, 'เหรียญต้องไม่ติดลบ')
})

// ══ Data migration — ข้อมูลเก่าต้องไม่หาย ══

check('ข้อมูล Part 1 (ไม่มีเลขเวอร์ชัน) ต้องอัปเกรดได้โดยไม่เสียความคืบหน้า', () => {
  window.localStorage.clear()
  const v1 = {
    id: 'p-1', name: 'เด็กเก่า', avatar: 'explorer',
    level: 3, exp: 20, coins: 250, hp: 80, maxHp: 100,
    completedLevels: ['world-1-level-1', 'world-1-level-2'],
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-02T00:00:00.000Z',
  }
  window.localStorage.setItem('math-adventure:player:v1', JSON.stringify(v1))

  const result = STORAGE.loadPlayer()
  const after = result.data
  assert(after, 'ต้องอัปเกรดแล้วโหลดได้')
  equal(after.name, 'เด็กเก่า', 'ชื่อต้องอยู่')
  equal(after.coins, 250, 'เหรียญต้องอยู่')
  equal(after.level, 3, 'เลเวลต้องอยู่')
  equal(after.completedStages.length, 2, 'ด่านที่เคยผ่านต้องถูกย้ายมาครบ')
  assert(after.completedStages.every((id) => id.includes('-stage-')),
    'ด่านเดิมต้องถูกแปลงเป็นรูปแบบใหม่')
})

check('ข้อมูล Part 2 (เวอร์ชัน 2) ต้องอัปเกรดเป็นเวอร์ชัน 3 ได้', () => {
  window.localStorage.clear()
  const v2 = {
    version: 2,
    player: {
      id: 'p-2', name: 'เด็กพาร์ทสอง', avatar: 'explorer',
      level: 2, exp: 10, coins: 90, hp: 100, maxHp: 100,
      totalQuestions: 20, correctAnswers: 16, wrongAnswers: 4,
      currentStreak: 2, bestStreak: 5,
      completedLevels: ['world-1-level-1'],
      levelRecords: { 'world-1-level-1': { completions: 2, bestCorrect: 9, bestAccuracy: 90 } },
      createdAt: '2025-02-01T00:00:00.000Z',
      updatedAt: '2025-02-02T00:00:00.000Z',
    },
  }
  window.localStorage.setItem('math-adventure:player:v1', JSON.stringify(v2))

  const after = STORAGE.loadPlayer().data
  assert(after, 'ต้องอัปเกรดแล้วโหลดได้')
  equal(after.bestStreak, 5, 'สถิติ streak ต้องอยู่')
  equal(after.correctAnswers, 16, 'สถิติการตอบต้องอยู่')
  equal(after.completedStages.length, 1, 'ด่านที่ผ่านต้องถูกย้ายมา')
  const progress = SS.getStageProgress(after, 'world-1-stage-1')
  equal(progress.stars, 3, 'ความแม่นยำ 90% ต้องได้ 3 ดาว')
  equal(progress.bestAccuracy, 90, 'ความแม่นยำที่ดีที่สุดต้องอยู่')
})

check('บันทึกใหม่ต้องเขียนเลขเวอร์ชันปัจจุบันเสมอ', () => {
  window.localStorage.clear()
  STORAGE.savePlayer(fresh())
  const raw = JSON.parse(window.localStorage.getItem('math-adventure:player:v1'))
  equal(raw.version, STORAGE.CURRENT_SAVE_VERSION, 'เลขเวอร์ชันไม่ตรง')
})

// ══ EXP และเลเวล (Part 2 ที่ Part 3 ต้องไม่ทำพัง) ══

check('เส้นโค้ง EXP เพิ่มขึ้นตามเลเวลเสมอ', () => {
  for (let level = 1; level < 20; level += 1) {
    assert(EXP.getRequiredExp(level + 1) > EXP.getRequiredExp(level),
      `เลเวล ${level + 1} ต้องใช้ EXP มากกว่าเลเวล ${level}`)
  }
})

check('ได้ EXP ก้อนใหญ่แล้วขึ้นหลายเลเวลได้ถูกต้อง', () => {
  const result = EXP.addExp(fresh(), 500)
  // 100 + 150 + 225 = 475 พอขึ้นถึงเลเวล 4 เหลือ 25
  equal(result.newLevel, 4, 'EXP 500 ต้องได้เลเวล 4')
  equal(result.player.exp, 25, 'EXP ที่เหลือต้องเป็น 25')
  equal(result.levelsGained, 3, 'ต้องขึ้น 3 เลเวล')
})

// ══ สรุป ══

console.log(`ผ่าน ${passed} ข้อ`)
if (failures.length > 0) {
  console.log(`\nไม่ผ่าน ${failures.length} ข้อ`)
  failures.forEach((line, i) => console.log(`  ${i + 1}. ${line}`))
  process.exit(1)
}
console.log('ผ่านทั้งหมด')
