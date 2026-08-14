/**
 * ชุดทดสอบระบบต่อสู้ (Part 5)
 *
 * ครอบคลุมรายการทดสอบที่สเปก Part 5 กำหนด (Test 1–13)
 * Test 14 (UI บนมือถือ) ต้องดูด้วยตาบนเบราว์เซอร์จริง
 *
 * วิธีใช้
 *   npx tsc -p tsconfig.tests.json --outDir /tmp/logic
 *   node tests/battle.test.mjs /tmp/logic
 */

import path from 'path'
import { createRequire } from 'module'

const OUT = process.argv[2]
if (!OUT) {
  console.error('ใช้: node tests/battle.test.mjs <โฟลเดอร์ JS ที่คอมไพล์แล้ว>')
  process.exit(1)
}

const require = createRequire(import.meta.url)
const load = (name) => require(path.resolve(OUT, name + '.js'))

const D = load('battle/damage')
const E = load('battle/battleEngine')
const M = load('data/monsters')
const BS = load('services/battleService')
const STAGES = load('data/stages')
const STORAGE = load('services/storage')

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

// ── ตัวช่วย ──

const testPlayer = () => ({
  id: 'p1', name: 'นักผจญภัย', avatar: 'explorer',
  level: 3, hp: 100, maxHp: 100,
})

const stageOf = (id) => STAGES.getStage(id)
const firstStage = () => STAGES.getStagesByWorld('world-1')[0]
const bossStage = () => STAGES.STAGES.find((s) => s.isBoss || s.difficulty === 'boss')

function makeBattle(stage, seed = 'test-seed') {
  return BS.startStageBattle({ player: STORAGE.createPlayer('เด็กทดสอบ', 'explorer'), stage, seed })
}

/** ตอบให้ถูกทุกข้อจนกว่าการต่อสู้จะจบ */
function fightToEnd(state, { correct = true, maxTurns = 200 } = {}) {
  let s = E.beginBattle(state)
  for (let turn = 0; turn < maxTurns && !E.isBattleOver(s); turn += 1) {
    if (s.status === 'phase_transition') { s = E.continueAfterPhase(s); continue }
    if (s.status === 'feedback') { s = E.continueToNextQuestion(s); continue }

    const question = E.currentQuestion(s)
    if (!question) break

    const answer = correct
      ? question.correctAnswer
      : question.choices.find((c) => c.text !== question.correctAnswer).text

    const outcome = E.answerAndAttack(s, { selectedAnswer: answer, timeSpent: 5000 })
    if (!outcome) break
    s = outcome.state
  }
  return s
}

// ══ ข้อมูลมอนสเตอร์ ══

check('มีมอนสเตอร์ครบ 8 ตัวตามสเปก', () => {
  assert(M.MONSTERS.length >= 8, `มีแค่ ${M.MONSTERS.length} ตัว`)
  const ids = M.MONSTERS.map((m) => m.id)
  equal(new Set(ids).size, ids.length, 'มีรหัสมอนสเตอร์ซ้ำ')
})

check('มอนสเตอร์ครบทุกประเภทและพลังชีวิตอยู่ในช่วงที่สเปกกำหนด', () => {
  for (const type of ['normal', 'elite', 'mini_boss', 'boss']) {
    assert(M.getMonstersByType(type).length > 0, `ไม่มีมอนสเตอร์ประเภท ${type}`)
  }
  const ranges = {
    normal: [50, 100], elite: [100, 180], mini_boss: [250, 400], boss: [500, 99999],
  }
  for (const monster of M.MONSTERS) {
    const [min, max] = ranges[monster.type]
    assert(monster.hp >= min && monster.hp <= max,
      `${monster.id}: HP ${monster.hp} อยู่นอกช่วงของ ${monster.type} (${min}–${max})`)
    assert(monster.attack > 0 && monster.defense >= 0, `${monster.id}: ค่าพลังผิด`)
    assert(monster.rewards.exp > 0 && monster.rewards.coins > 0, `${monster.id}: ไม่มีรางวัล`)
    assert(monster.thaiName.length > 0, `${monster.id}: ไม่มีชื่อไทย`)
  }
})

check('มอนสเตอร์ที่แรงกว่าให้รางวัลมากกว่า', () => {
  const order = ['normal', 'elite', 'mini_boss', 'boss']
  let previousMax = 0
  for (const type of order) {
    const minExp = Math.min(...M.getMonstersByType(type).map((m) => m.rewards.exp))
    assert(minExp >= previousMax, `${type} ให้รางวัลน้อยกว่าประเภทที่อ่อนกว่า`)
    previousMax = minExp
  }
})

check('บอสมีเฟส และเฟสเรียงจากพลังชีวิตมากไปน้อย', () => {
  const boss = M.getMonstersByType('boss')[0]
  assert(boss.phases && boss.phases.length >= 3, 'บอสต้องมีอย่างน้อย 3 เฟส')
  for (let i = 1; i < boss.phases.length; i += 1) {
    assert(boss.phases[i].hpThresholdPercent < boss.phases[i - 1].hpThresholdPercent,
      'เกณฑ์เฟสต้องลดลงเรื่อย ๆ')
  }
  assert(boss.specialAttack, 'บอสต้องมีท่าไม้ตาย')
})

check('ด่านบอสได้มอนสเตอร์ประเภทบอส', () => {
  const stage = bossStage()
  assert(stage, 'ควรมีด่านบอส')
  equal(M.pickMonsterForStage(stage).type, 'boss', 'ด่านบอสต้องเจอบอส')
})

check('ด่านเดิมเจอมอนสเตอร์ตัวเดิมเสมอ ไม่สุ่ม', () => {
  for (const stage of STAGES.STAGES) {
    const a = M.pickMonsterForStage(stage)
    const b = M.pickMonsterForStage(stage)
    equal(a.id, b.id, `${stage.id}: เจอมอนสเตอร์ไม่ตรงกันสองครั้ง`)
  }
})

// ══ Test 5, 6 — การคำนวณดาเมจ ══

check('Test 6 — ดาเมจไม่ติดลบและไม่เป็นศูนย์แม้เจอพลังป้องกันสูงมาก', () => {
  const result = D.calculatePlayerDamage({
    attackPower: 5, difficulty: 'easy', combo: 0, monsterDefense: 9999, isCritical: false,
  })
  equal(result.damage, D.BATTLE_CONFIG.minimumDamage, 'ต้องเหลือดาเมจขั้นต่ำ')
  assert(result.damage > 0, 'ดาเมจต้องมากกว่าศูนย์')

  equal(D.calculateMonsterDamage(1, 9999), D.BATTLE_CONFIG.minimumDamage,
    'ดาเมจของมอนสเตอร์ก็ต้องไม่ติดลบ')
})

check('Test 5 — คริติคอลทำดาเมจเป็นสองเท่าก่อนหักพลังป้องกัน', () => {
  const base = { attackPower: 20, difficulty: 'easy', combo: 0, monsterDefense: 0 }
  const normal = D.calculatePlayerDamage({ ...base, isCritical: false })
  const critical = D.calculatePlayerDamage({ ...base, isCritical: true })
  equal(critical.damage, normal.damage * 2, 'คริติคอลต้องเป็นสองเท่า')
  equal(critical.isCritical, true, 'ต้องรายงานว่าเป็นคริติคอล')
})

check('โจทย์ยากทำดาเมจมากกว่าโจทย์ง่าย', () => {
  const make = (difficulty) => D.calculatePlayerDamage({
    attackPower: 20, difficulty, combo: 0, monsterDefense: 0, isCritical: false,
  }).damage

  assert(make('medium') > make('easy'), 'medium ต้องแรงกว่า easy')
  assert(make('hard') > make('medium'), 'hard ต้องแรงกว่า medium')
  assert(make('expert') > make('hard'), 'expert ต้องแรงกว่า hard')
})

check('Test 4 — โบนัสคอมโบเพิ่มตามจำนวนตอบถูกติดกัน และมีเพดาน', () => {
  equal(D.comboBonusPercent(0), 0, 'ยังไม่มีคอมโบ')
  equal(D.comboBonusPercent(1), 5, 'คอมโบ 1')
  equal(D.comboBonusPercent(3), 15, 'คอมโบ 3')
  equal(D.comboBonusPercent(4), 20, 'คอมโบ 4')
  equal(D.comboBonusPercent(100), D.BATTLE_CONFIG.maxComboBonusPercent, 'ต้องมีเพดาน')

  const low = D.calculatePlayerDamage({
    attackPower: 20, difficulty: 'easy', combo: 0, monsterDefense: 0, isCritical: false,
  }).damage
  const high = D.calculatePlayerDamage({
    attackPower: 20, difficulty: 'easy', combo: 4, monsterDefense: 0, isCritical: false,
  }).damage
  assert(high > low, 'คอมโบต้องทำให้ดาเมจสูงขึ้น')
})

check('โอกาสคริติคอลเพิ่มตามความยาก แต่ไม่เกิน 100%', () => {
  assert(D.criticalChance('expert') > D.criticalChance('easy'), 'โจทย์ยากต้องคริติคอลง่ายกว่า')
  for (const difficulty of ['easy', 'medium', 'hard', 'expert']) {
    const chance = D.criticalChance(difficulty)
    assert(chance >= 0 && chance <= 1, `โอกาสผิดช่วง: ${chance}`)
  }
})

check('ดาเมจเข้าโล่ก่อนแล้วค่อยเข้าพลังชีวิต', () => {
  const a = D.applyDamage(100, 30, 20)
  equal(a.shield, 10, 'โล่ควรเหลือ 10')
  equal(a.hp, 100, 'พลังชีวิตยังไม่ควรลด')

  const b = D.applyDamage(100, 30, 50)
  equal(b.shield, 0, 'โล่ควรแตก')
  equal(b.hp, 80, 'ส่วนที่ทะลุโล่ต้องเข้าพลังชีวิต')
  equal(b.hpLost, 20, 'รายงานพลังชีวิตที่เสียไป')

  const c = D.applyDamage(10, 0, 999)
  equal(c.hp, 0, 'พลังชีวิตต้องไม่ติดลบ')
})

check('ฟื้นพลังชีวิตไม่เกินค่าสูงสุด', () => {
  equal(D.healUp(50, 100, 20), 70, 'ฟื้นปกติ')
  equal(D.healUp(95, 100, 50), 100, 'ต้องไม่เกินค่าสูงสุด')
  equal(D.healUp(50, 100, -10), 50, 'ค่าติดลบต้องไม่ทำให้เสียพลัง')
})

// ══ Test 1, 2, 3 — การไหลของการต่อสู้ ══

check('Test 1 — เริ่มการต่อสู้ได้และมีสถานะตั้งต้นถูกต้อง', () => {
  const state = makeBattle(firstStage())
  equal(state.status, 'intro', 'ต้องเริ่มที่ฉากเปิด')
  equal(state.combo, 0, 'คอมโบเริ่มที่ 0')
  equal(state.rewardCommitted, false, 'ยังไม่จ่ายรางวัล')
  assert(state.questions.length > 0, 'ต้องมีโจทย์')
  assert(state.monster.hp > 0, 'มอนสเตอร์ต้องมีพลังชีวิต')
  assert(state.player.hp > 0, 'ผู้เล่นต้องมีพลังชีวิต')

  const begun = E.beginBattle(state)
  equal(begun.status, 'question', 'เริ่มแล้วต้องเข้าสู่โจทย์')
})

check('Test 2 — ตอบถูกแล้วพลังชีวิตมอนสเตอร์ลดลง', () => {
  const state = E.beginBattle(makeBattle(firstStage()))
  const question = E.currentQuestion(state)
  const before = state.monster.hp + state.monster.shield

  const outcome = E.answerAndAttack(state, {
    selectedAnswer: question.correctAnswer, timeSpent: 4000,
  })

  assert(outcome.correct, 'ควรตอบถูก')
  assert(outcome.playerDamage, 'ต้องมีรายละเอียดดาเมจ')
  const after = outcome.state.monster.hp + outcome.state.monster.shield
  assert(after < before, 'มอนสเตอร์ต้องเสียพลังชีวิตหรือโล่')
  equal(outcome.state.combo, 1, 'คอมโบต้องเพิ่ม')
  equal(outcome.state.damageDealt, outcome.playerDamage.damage, 'ต้องสะสมดาเมจที่ทำได้')
})

check('Test 3 — ตอบผิดแล้วคอมโบขาด และไม่ทำดาเมจ', () => {
  const state = E.beginBattle(makeBattle(firstStage()))
  const question = E.currentQuestion(state)
  const wrong = question.choices.find((c) => c.text !== question.correctAnswer).text
  const before = state.monster.hp

  const outcome = E.answerAndAttack(state, { selectedAnswer: wrong, timeSpent: 4000 })

  assert(!outcome.correct, 'ควรตอบผิด')
  equal(outcome.state.combo, 0, 'คอมโบต้องเป็นศูนย์')
  equal(outcome.state.monster.hp, before, 'ตอบผิดต้องไม่ทำดาเมจ')
  equal(outcome.playerDamage, null, 'ไม่ควรมีดาเมจของผู้เล่น')
})

check('Test 4 — ตอบถูกติดกันหลายข้อ คอมโบสะสมถูกต้อง', () => {
  let state = E.beginBattle(makeBattle(bossStage()))
  for (let i = 0; i < 5; i += 1) {
    if (state.status === 'phase_transition') state = E.continueAfterPhase(state)
    if (state.status === 'feedback') state = E.continueToNextQuestion(state)
    const question = E.currentQuestion(state)
    if (!question || E.isBattleOver(state)) break
    state = E.answerAndAttack(state, {
      selectedAnswer: question.correctAnswer, timeSpent: 3000,
    }).state
  }
  assert(state.maxCombo >= 5 || E.isBattleOver(state),
    `คอมโบสูงสุดควรถึง 5 แต่ได้ ${state.maxCombo}`)
})

check('ตอบถูกแล้วมอนสเตอร์ต้องไม่โจมตีกลับ', () => {
  const state = E.beginBattle(makeBattle(firstStage()))
  const question = E.currentQuestion(state)
  const outcome = E.answerAndAttack(state, {
    selectedAnswer: question.correctAnswer, timeSpent: 3000,
  })
  equal(outcome.monsterDamage, 0, 'ตอบถูกต้องไม่โดนโจมตี')
  equal(outcome.state.player.hp, state.player.hp, 'พลังชีวิตต้องไม่ลด')
})

// ══ Test 7, 8 — แพ้และชนะ ══

check('Test 8 — ตอบถูกหมดจนมอนสเตอร์หมดพลัง = ชนะ', () => {
  const state = fightToEnd(makeBattle(firstStage()), { correct: true })
  equal(state.status, 'victory', 'ควรชนะ')
  assert(state.monster.hp <= 0, 'มอนสเตอร์ต้องหมดพลังชีวิต')
  assert(state.endedAt, 'ต้องบันทึกเวลาที่จบ')
})

check('ชนะได้ทุกด่าน ถ้าตอบถูกหมด', () => {
  for (const stage of STAGES.STAGES) {
    const state = fightToEnd(makeBattle(stage, `win-${stage.id}`), { correct: true })
    equal(state.status, 'victory',
      `${stage.id}: ตอบถูกหมดแล้วยังไม่ชนะ (มอนสเตอร์เหลือ ${state.monster.hp} HP)`)
  }
})

check('Test 7 — ตอบผิดหมดจนพลังชีวิตหมด = แพ้', () => {
  const state = fightToEnd(makeBattle(bossStage(), 'lose'), { correct: false })
  equal(state.status, 'defeat', 'ควรแพ้')
  assert(state.player.hp <= 0 || state.questionIndex >= state.questions.length,
    'ต้องแพ้เพราะพลังชีวิตหมดหรือโจทย์หมด')
})

check('แพ้แล้วต้องไม่เสีย EXP และไม่ได้รางวัลจากมอนสเตอร์', () => {
  const state = fightToEnd(makeBattle(bossStage(), 'lose2'), { correct: false })
  const summary = BS.summarizeBattle(state)
  equal(summary.won, false, 'ต้องเป็นการแพ้')
  equal(summary.monsterExp, 0, 'แพ้ต้องไม่ได้ EXP จากมอนสเตอร์')
  equal(summary.monsterCoins, 0, 'แพ้ต้องไม่ได้เหรียญ')
})

// ══ Test 9 — กันรับรางวัลซ้ำ ══

check('Test 9 — รับรางวัลได้ครั้งเดียวเท่านั้น', () => {
  const won = fightToEnd(makeBattle(firstStage(), 'reward'), { correct: true })
  equal(won.status, 'victory', 'ต้องชนะก่อน')

  const first = E.commitReward(won)
  assert(first, 'ครั้งแรกต้องรับได้')
  equal(first.rewardCommitted, true, 'ต้องทำเครื่องหมายว่าจ่ายแล้ว')

  equal(E.commitReward(first), null, 'ครั้งที่สองต้องรับไม่ได้')
  equal(E.commitReward(first), null, 'กดรัวก็ต้องรับไม่ได้')
})

check('ยังไม่ชนะ รับรางวัลไม่ได้', () => {
  const state = E.beginBattle(makeBattle(firstStage()))
  equal(E.commitReward(state), null, 'ระหว่างสู้ต้องรับรางวัลไม่ได้')

  const lost = fightToEnd(makeBattle(bossStage(), 'nolose'), { correct: false })
  equal(E.commitReward(lost), null, 'แพ้แล้วต้องรับรางวัลไม่ได้')
})

// ══ Test 10 — เริ่มใหม่ ══

check('Test 10 — เริ่มการต่อสู้ใหม่ได้ และสถานะถูกล้างจริง', () => {
  const lost = fightToEnd(makeBattle(bossStage(), 'restart'), { correct: false })
  const fresh = E.restartBattle(lost, lost.questions, 100)

  equal(fresh.status, 'intro', 'ต้องกลับไปที่ฉากเปิด')
  equal(fresh.questionIndex, 0, 'ต้องเริ่มข้อแรกใหม่')
  equal(fresh.results.length, 0, 'ผลการตอบเดิมต้องถูกล้าง')
  equal(fresh.combo, 0, 'คอมโบต้องเป็นศูนย์')
  equal(fresh.damageDealt, 0, 'ดาเมจสะสมต้องเป็นศูนย์')
  equal(fresh.rewardCommitted, false, 'ต้องยังไม่จ่ายรางวัล')
  equal(fresh.player.hp, 100, 'พลังชีวิตต้องถูกตั้งใหม่')
  equal(fresh.monster.hp, fresh.monster.maxHp, 'มอนสเตอร์ต้องเต็มพลัง')
  assert(fresh.battleId !== lost.battleId, 'ต้องเป็นการต่อสู้รอบใหม่')
})

// ══ Test 11 — เฟสบอส ══

check('Test 11 — บอสเปลี่ยนเฟสตามพลังชีวิตที่เหลือ', () => {
  const boss = M.getMonstersByType('boss')[0]
  const state = makeBattle(bossStage(), 'phase')

  // เฟสแรกตอนเต็มพลัง
  equal(E.resolvePhase(state).index, 0, 'เต็มพลังต้องอยู่เฟสแรก')

  // ลดพลังชีวิตลงทีละขั้นแล้วดูว่าเฟสขยับตาม
  for (let i = 1; i < boss.phases.length; i += 1) {
    const threshold = boss.phases[i].hpThresholdPercent
    const hurt = {
      ...state,
      monster: { ...state.monster, hp: Math.floor(state.monster.maxHp * (threshold / 100)) },
    }
    equal(E.resolvePhase(hurt).index, i, `พลังชีวิต ${threshold}% ต้องอยู่เฟสที่ ${i}`)
  }
})

check('เข้าเฟสใหม่แล้วโจทย์ยากขึ้น', () => {
  const boss = M.getMonstersByType('boss')[0]
  const state = makeBattle(bossStage(), 'phase2')
  const order = ['easy', 'medium', 'hard', 'expert']

  let previous = -1
  for (let i = 0; i < boss.phases.length; i += 1) {
    const threshold = boss.phases[i].hpThresholdPercent
    const hurt = {
      ...state,
      monster: { ...state.monster, hp: Math.floor(state.monster.maxHp * (threshold / 100)) },
    }
    const rank = order.indexOf(E.difficultyForBattle(hurt, 'easy'))
    assert(rank >= previous, `เฟส ${i} โจทย์ต้องไม่ง่ายลงกว่าเฟสก่อน`)
    previous = rank
  }
})

check('มอนสเตอร์ที่ไม่ใช่บอสไม่มีเฟส และใช้ความยากของด่านตามเดิม', () => {
  const state = makeBattle(firstStage())
  equal(E.resolvePhase(state).phase, null, 'มอนสเตอร์ธรรมดาต้องไม่มีเฟส')
  equal(E.difficultyForBattle(state, 'medium'), 'medium', 'ต้องใช้ความยากของด่าน')
})

// ══ สถานะและการหยุดชั่วคราว ══

check('หยุดชั่วคราวแล้วเล่นต่อได้ กลับไปที่สถานะเดิม', () => {
  const state = E.beginBattle(makeBattle(firstStage()))
  const paused = E.pauseBattle(state)
  equal(paused.status, 'paused', 'ต้องหยุด')

  const resumed = E.resumeBattle(paused)
  equal(resumed.status, 'question', 'ต้องกลับไปทำโจทย์ต่อ')
  equal(resumed.statusBeforePause, undefined, 'ต้องล้างสถานะที่จำไว้')
})

check('ตอบโจทย์ระหว่างหยุดชั่วคราวไม่ได้', () => {
  const state = E.pauseBattle(E.beginBattle(makeBattle(firstStage())))
  equal(E.answerAndAttack(state, { selectedAnswer: '1', timeSpent: 100 }), null,
    'ต้องตอบไม่ได้')
})

check('การต่อสู้ที่จบแล้วหยุดชั่วคราวหรือตอบต่อไม่ได้', () => {
  const won = fightToEnd(makeBattle(firstStage(), 'over'), { correct: true })
  equal(E.pauseBattle(won).status, 'victory', 'จบแล้วต้องหยุดไม่ได้')
  equal(E.answerAndAttack(won, { selectedAnswer: '1', timeSpent: 100 }), null,
    'จบแล้วต้องตอบต่อไม่ได้')
})

// ══ การเชื่อมกับระบบอื่น ══

check('การต่อสู้ใช้โจทย์จาก Question Engine ตรงกับที่ด่านกำหนด', () => {
  for (const stage of STAGES.STAGES) {
    const state = makeBattle(stage, `types-${stage.id}`)
    const allowed = new Set(stage.questionTypes)
    for (const question of state.questions) {
      assert(allowed.has(question.type),
        `${stage.id}: เจอโจทย์ชนิด ${question.type} ที่ด่านไม่ได้กำหนด`)
    }
  }
})

check('จำนวนโจทย์มากพอจะล้มมอนสเตอร์ได้', () => {
  for (const stage of STAGES.STAGES) {
    const state = makeBattle(stage, `count-${stage.id}`)
    assert(state.questions.length >= stage.questionCount,
      `${stage.id}: โจทย์น้อยกว่าที่ด่านกำหนด`)
  }
})

check('สรุปผลการต่อสู้ถูกต้อง', () => {
  const won = fightToEnd(makeBattle(firstStage(), 'sum'), { correct: true })
  const summary = BS.summarizeBattle(won)

  equal(summary.won, true, 'ต้องเป็นการชนะ')
  equal(summary.accuracy, 100, 'ตอบถูกหมดต้องได้ 100%')
  equal(summary.correctAnswers, summary.totalQuestions, 'ตอบถูกทุกข้อ')
  assert(summary.monsterExp > 0, 'ชนะต้องได้ EXP')
  assert(summary.damageDealt > 0, 'ต้องมีดาเมจสะสม')
})

check('บันทึกประวัติการต่อสู้ และจำกัดจำนวนไม่ให้โตไม่สิ้นสุด', () => {
  const won = fightToEnd(makeBattle(firstStage(), 'hist'), { correct: true })

  let history = []
  for (let i = 0; i < BS.MAX_BATTLE_HISTORY + 8; i += 1) {
    history = BS.appendHistory(history, won)
  }
  equal(history.length, BS.MAX_BATTLE_HISTORY, 'ต้องเก็บไม่เกินที่กำหนด')

  const entry = history[0]
  equal(entry.result, 'victory', 'ต้องบันทึกผล')
  equal(entry.stageId, firstStage().id, 'ต้องบันทึกรหัสด่าน')
  assert(entry.startedAt && entry.endedAt, 'ต้องบันทึกเวลา')
})

check('การต่อสู้ที่ยังไม่จบไม่ถูกบันทึกลงประวัติ', () => {
  const ongoing = E.beginBattle(makeBattle(firstStage()))
  equal(BS.appendHistory([], ongoing).length, 0, 'ยังไม่จบต้องไม่บันทึก')
})

check('สถิติการต่อสู้สะสมถูกต้อง', () => {
  let stats = BS.createEmptyBattleStatistics()
  const won = fightToEnd(makeBattle(firstStage(), 's1'), { correct: true })
  const lost = fightToEnd(makeBattle(bossStage(), 's2'), { correct: false })

  stats = BS.updateBattleStatistics(stats, won)
  stats = BS.updateBattleStatistics(stats, lost)

  equal(stats.battleCount, 2, 'จำนวนการต่อสู้')
  equal(stats.victories, 1, 'จำนวนครั้งที่ชนะ')
  equal(stats.defeats, 1, 'จำนวนครั้งที่แพ้')
  assert(stats.bestCombo >= won.maxCombo, 'คอมโบสูงสุดต้องถูกบันทึก')
  assert(stats.highestDamage >= won.damageDealt, 'ดาเมจสูงสุดต้องถูกบันทึก')
})

check('ชนะบอสแล้วนับจำนวนบอสที่กำจัดได้', () => {
  const won = fightToEnd(makeBattle(bossStage(), 'bosswin'), { correct: true })
  const stats = BS.updateBattleStatistics(BS.createEmptyBattleStatistics(), won)
  if (won.status === 'victory') {
    equal(stats.bossesDefeated, 1, 'ต้องนับบอสที่กำจัดได้')
  }
})

// ══ Test 13 — ข้อมูลผู้เล่นไม่เสีย ══

check('Test 13 — การต่อสู้ไม่แก้ข้อมูลผู้เล่นตัวจริง', () => {
  const player = STORAGE.createPlayer('เด็กทดสอบ', 'explorer')
  const snapshot = JSON.stringify(player)

  const state = fightToEnd(
    BS.startStageBattle({ player, stage: firstStage(), seed: 'nomutate' }),
    { correct: false },
  )

  equal(JSON.stringify(player), snapshot, 'ข้อมูลผู้เล่นตัวจริงต้องไม่ถูกแก้ระหว่างต่อสู้')
  assert(state.player.hp <= player.hp, 'พลังชีวิตในการต่อสู้แยกจากข้อมูลจริง')
})

check('ทุกฟังก์ชันคืนสถานะชุดใหม่ ไม่แก้ของเดิม', () => {
  const state = E.beginBattle(makeBattle(firstStage()))
  const before = JSON.stringify(state)
  const question = E.currentQuestion(state)

  E.answerAndAttack(state, { selectedAnswer: question.correctAnswer, timeSpent: 1000 })
  equal(JSON.stringify(state), before, 'สถานะเดิมต้องไม่ถูกแก้')
})

// ══ สมดุลเกม ══

check('การต่อสู้ไม่สั้นหรือยาวเกินไป', () => {
  const turns = []
  for (const stage of STAGES.STAGES) {
    const state = fightToEnd(makeBattle(stage, `bal-${stage.id}`), { correct: true })
    turns.push({ id: stage.id, turns: state.results.length })
  }

  for (const item of turns) {
    assert(item.turns >= 3, `${item.id}: จบใน ${item.turns} ข้อ เร็วเกินไป`)
    assert(item.turns <= 40, `${item.id}: ใช้ ${item.turns} ข้อ ยาวเกินไป`)
  }

  const average = turns.reduce((sum, t) => sum + t.turns, 0) / turns.length
  console.log(`      เฉลี่ย ${average.toFixed(1)} ข้อต่อการต่อสู้ · น้อยสุด ${Math.min(...turns.map(t => t.turns))} · มากสุด ${Math.max(...turns.map(t => t.turns))}`)
})

check('คณิตศาสตร์สำคัญกว่าโชค — คริติคอลไม่ใช่ตัวตัดสินแพ้ชนะ', () => {
  // ดาเมจจากคริติคอลล้วน เทียบกับดาเมจจากการตอบถูกต่อเนื่อง
  const noCrit = D.calculatePlayerDamage({
    attackPower: 20, difficulty: 'expert', combo: 4, monsterDefense: 0, isCritical: false,
  }).damage
  const critEasy = D.calculatePlayerDamage({
    attackPower: 20, difficulty: 'easy', combo: 0, monsterDefense: 0, isCritical: true,
  }).damage

  // ตอบโจทย์ยากต่อเนื่องโดยไม่คริติคอล ต้องไม่ด้อยกว่าคริติคอลจากโจทย์ง่ายมากนัก
  assert(noCrit >= critEasy * 0.6,
    `ตอบโจทย์ยากต่อเนื่อง (${noCrit}) ด้อยกว่าคริติคอลข้อง่าย (${critEasy}) มากเกินไป`)
})

console.log(`ผ่าน ${passed} ข้อ`)
if (failures.length > 0) {
  console.log(`\nไม่ผ่าน ${failures.length} ข้อ`)
  failures.forEach((line, i) => console.log(`  ${i + 1}. ${line}`))
  process.exit(1)
}
console.log('ผ่านทั้งหมด')
