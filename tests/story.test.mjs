/**
 * ชุดทดสอบเนื้อเรื่อง
 *
 * จุดที่พังเงียบได้ง่ายที่สุดคือ "ลำดับบทพูดของ NPC"
 * ถ้าเรียงประโยคที่ไม่มีเงื่อนไขไว้ก่อน มันจะชนะทุกครั้ง
 * NPC ก็จะพูดประโยคเริ่มต้นตลอดเกม ทั้งที่เขียนบทใหม่ไว้ครบแล้ว
 * ซึ่งเป็นบั๊กที่ไม่มี error ให้เห็นเลย
 *
 * วิธีใช้
 *   npx tsc -p tsconfig.tests.json --outDir /tmp/logic
 *   node tests/story.test.mjs /tmp/logic
 */

import path from 'path'
import { createRequire } from 'module'

const OUT = process.argv[2]
if (!OUT) {
  console.error('ใช้: node tests/story.test.mjs <โฟลเดอร์ JS ที่คอมไพล์แล้ว>')
  process.exit(1)
}

const require = createRequire(import.meta.url)
const load = (name) => require(path.resolve(OUT, name + '.js'))

const STORY = load('data/story')
const SVC = load('services/storyService')
const STAGES = load('data/stages')
const NPCS = load('data/npcs')
const WORLDS = load('data/worlds')
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

function makePlayer(flags = []) {
  return { ...STORAGE.createPlayer('เด็กทดสอบ', 'warrior'), storyFlags: flags }
}

const STAGE_IDS = new Set(STAGES.STAGES.map((stage) => stage.id))
const NPC_IDS = new Set(NPCS.NPCS.map((npc) => npc.id))

// ---------- ข้อมูลเรื่อง ----------

check('ทุกตอนต้องผูกกับด่านที่มีอยู่จริง', () => {
  for (const beat of STORY.STORY_BEATS) {
    assert(STAGE_IDS.has(beat.stageId), `${beat.id} อ้างด่าน ${beat.stageId} ที่ไม่มีอยู่`)
  }
})

check('ทุกตอนที่มีผู้พูด ต้องเป็น NPC ที่มีอยู่จริง', () => {
  for (const beat of STORY.STORY_BEATS) {
    if (!beat.npcId) continue
    assert(NPC_IDS.has(beat.npcId), `${beat.id} อ้าง NPC ${beat.npcId} ที่ไม่มีอยู่`)
  }
  for (const line of STORY.NPC_LINES) {
    assert(NPC_IDS.has(line.npcId), `บทพูดอ้าง NPC ${line.npcId} ที่ไม่มีอยู่`)
  }
})

check('รหัสตอนและรหัสธงต้องไม่ซ้ำกัน', () => {
  const ids = STORY.STORY_BEATS.map((beat) => beat.id)
  assert(new Set(ids).size === ids.length, 'มีรหัสตอนซ้ำ')

  const flags = STORY.STORY_BEATS.map((beat) => beat.grantsFlag).filter(Boolean)
  assert(new Set(flags).size === flags.length, 'มีธงที่ถูกให้จากสองตอน')
})

check('ด่านหนึ่งต้องมีตอนก่อนเข้าและหลังผ่านอย่างละไม่เกินหนึ่ง', () => {
  const seen = new Set()
  for (const beat of STORY.STORY_BEATS) {
    const key = `${beat.stageId}:${beat.moment}`
    assert(!seen.has(key), `${key} มีมากกว่าหนึ่งตอน`)
    seen.add(key)
  }
})

check('ทุกตอนต้องมีข้อความที่อ่านได้จริง ไม่ใช่ย่อหน้าว่าง', () => {
  for (const beat of STORY.STORY_BEATS) {
    assert(beat.title.length >= 4, `${beat.id} ชื่อตอนสั้นเกินไป`)
    assert(beat.lines.length >= 2, `${beat.id} มีแค่ ${beat.lines.length} ย่อหน้า`)
    for (const line of beat.lines) {
      assert(line.trim().length >= 8, `${beat.id} มีย่อหน้าสั้นผิดปกติ: "${line}"`)
    }
  }
})

check('ธงทุกอันใน FLAGS ต้องถูกใช้จริง ไม่มีธงที่ประกาศทิ้งไว้เฉย ๆ', () => {
  const granted = new Set(
    STORY.STORY_BEATS.map((beat) => beat.grantsFlag).filter(Boolean),
  )
  const required = new Set()
  for (const line of STORY.NPC_LINES) {
    for (const flag of line.requiresFlags ?? []) required.add(flag)
    for (const flag of line.hiddenByFlags ?? []) required.add(flag)
  }

  for (const [key, flag] of Object.entries(STORY.FLAGS)) {
    assert(
      granted.has(flag) || required.has(flag),
      `ธง ${key} ประกาศไว้แต่ไม่มีตอนไหนให้ และไม่มีบทพูดไหนใช้`,
    )
  }
})

check('บทพูดที่ต้องใช้ธง ต้องอ้างธงที่มีตอนให้จริง', () => {
  const granted = new Set(
    STORY.STORY_BEATS.map((beat) => beat.grantsFlag).filter(Boolean),
  )
  for (const line of STORY.NPC_LINES) {
    for (const flag of [...(line.requiresFlags ?? []), ...(line.hiddenByFlags ?? [])]) {
      assert(granted.has(flag), `บทพูดของ ${line.npcId} อ้างธง ${flag} ที่ไม่มีใครให้`)
    }
  }
})

check('NPC ทุกคนที่มีบทพูด ต้องมีประโยคเริ่มต้นที่ไม่ต้องใช้ธง', () => {
  const withLines = new Set(STORY.NPC_LINES.map((line) => line.npcId))
  for (const npcId of withLines) {
    const fallback = STORY.NPC_LINES.find(
      (line) => line.npcId === npcId && !line.requiresFlags?.length,
    )
    assert(fallback, `${npcId} ไม่มีประโยคเริ่มต้น เด็กใหม่จะเจอ NPC ที่พูดไม่ได้`)
  }
})

check('บทพูดต้องเรียงจากเงื่อนไขมากไปน้อยในแต่ละ NPC', () => {
  const byNpc = new Map()
  for (const line of STORY.NPC_LINES) {
    const list = byNpc.get(line.npcId) ?? []
    list.push((line.requiresFlags ?? []).length)
    byNpc.set(line.npcId, list)
  }
  for (const [npcId, counts] of byNpc) {
    for (let i = 1; i < counts.length; i += 1) {
      assert(
        counts[i] <= counts[i - 1],
        `${npcId} เรียงบทพูดผิด ประโยคเงื่อนไขน้อยอยู่ก่อนประโยคเงื่อนไขมาก` +
          ' ประโยคหลังจะไม่มีวันถูกเลือก',
      )
    }
  }
})

// ---------- ตรรกะ ----------

check('เพิ่มธงแล้วต้องไม่ซ้ำ และผู้เล่นเดิมต้องไม่ถูกแก้', () => {
  const player = makePlayer()
  const once = SVC.grantFlag(player, STORY.FLAGS.helpedVillage)
  assert(SVC.hasFlag(once, STORY.FLAGS.helpedVillage), 'ธงไม่เข้า')
  assert(player.storyFlags.length === 0, 'ผู้เล่นเดิมถูกแก้ไข')

  const twice = SVC.grantFlag(once, STORY.FLAGS.helpedVillage)
  assert(twice.storyFlags.length === 1, 'ธงซ้ำถูกเพิ่มเข้าไปอีก')
  assert(twice === once, 'ธงซ้ำแล้วยังสร้าง object ใหม่ ทำให้หน้าจอเรนเดอร์เกินจำเป็น')
})

check('ธงว่างเปล่าต้องไม่ถูกเพิ่ม', () => {
  const player = makePlayer()
  assert(SVC.grantFlag(player, '').storyFlags.length === 0, 'ธงว่างถูกเพิ่ม')
})

check('ตอนที่ยังไม่อ่านต้องถูกเสนอ และอ่านแล้วต้องไม่เสนอซ้ำ', () => {
  const player = makePlayer()
  const beat = SVC.pendingBeat(player, 'world-1-stage-1', 'before')
  assert(beat, 'ตอนเปิดเรื่องไม่ถูกเสนอ')
  assert(beat.id === 'b1-open', `เสนอผิดตอน: ${beat.id}`)

  const after = SVC.grantFlag(player, beat.grantsFlag)
  assert(
    !SVC.pendingBeat(after, 'world-1-stage-1', 'before'),
    'อ่านแล้วยังถูกเสนอซ้ำ',
  )
})

check('ด่านที่ไม่มีตอนต้องคืนค่าว่าง ไม่ใช่พัง', () => {
  const player = makePlayer()
  assert(!SVC.pendingBeat(player, 'world-1-stage-9', 'before'), 'ด่านที่ไม่มีตอนกลับมีตอน')
  assert(!SVC.pendingBeat(player, 'ด่านปลอม', 'after'), 'ด่านปลอมกลับมีตอน')
})

check('บทพูดของ NPC ต้องเปลี่ยนจริงเมื่อความคืบหน้าเปลี่ยน', () => {
  const fresh = makePlayer()
  const early = SVC.lineFor(fresh, 'elder')
  assert(early, 'เด็กใหม่ไม่ได้ยินอะไรจากปราชญ์เฒ่าเลย')

  const helped = makePlayer([STORY.FLAGS.helpedVillage])
  const mid = SVC.lineFor(helped, 'elder')
  assert(mid !== early, 'ช่วยหมู่บ้านแล้วปราชญ์เฒ่ายังพูดประโยคเดิม')

  const done = makePlayer([
    STORY.FLAGS.helpedVillage,
    STORY.FLAGS.reachedPeak,
    STORY.FLAGS.crystalRestored,
  ])
  const late = SVC.lineFor(done, 'elder')
  assert(late !== mid, 'จบบทแล้วปราชญ์เฒ่ายังพูดประโยคกลางเกม')
})

check('ทุก NPC ที่มีบทพูดต้องพูดได้ตั้งแต่ยังไม่มีธงเลย', () => {
  const fresh = makePlayer()
  for (const npcId of new Set(STORY.NPC_LINES.map((line) => line.npcId))) {
    assert(SVC.lineFor(fresh, npcId), `${npcId} พูดไม่ได้ตอนเริ่มเกม`)
  }
})

check('ถามบทพูดของ NPC ที่ไม่มีบทต้องคืนค่าว่าง ไม่ใช่พัง', () => {
  assert(!SVC.lineFor(makePlayer(), 'ไม่มีตัวนี้'), 'NPC ปลอมกลับพูดได้')
})

check('ความคืบหน้าของเรื่องต้องอยู่ระหว่าง 0 ถึง 100 เสมอ', () => {
  assert(SVC.storyPercent(makePlayer()) === 0, 'เด็กใหม่ไม่ได้เริ่มที่ศูนย์')

  const allFlags = STORY.STORY_BEATS.map((beat) => beat.grantsFlag).filter(Boolean)
  assert(SVC.storyPercent(makePlayer(allFlags)) === 100, 'อ่านครบแล้วไม่ถึงร้อย')

  const half = makePlayer(allFlags.slice(0, Math.floor(allFlags.length / 2)))
  const percent = SVC.storyPercent(half)
  assert(percent > 0 && percent < 100, `อ่านครึ่งเดียวได้ ${percent}%`)
})

check('ธงแปลกปลอมต้องไม่ทำให้ความคืบหน้าเกินร้อย', () => {
  const player = makePlayer(['ธงที่ไม่มีจริง', 'ธงปลอมอีกอัน'])
  assert(SVC.storyPercent(player) === 0, 'ธงปลอมนับเป็นความคืบหน้า')
})

check('สมุดบันทึกต้องแสดงเฉพาะตอนที่อ่านแล้ว', () => {
  const player = makePlayer([STORY.FLAGS.heardCrystalBroke])
  const beats = SVC.unlockedBeats(player)
  assert(beats.length === 1, `แสดง ${beats.length} ตอน ควรเป็น 1`)
  assert(beats[0].id === 'b1-open', `แสดงผิดตอน: ${beats[0].id}`)
})

check('บทของการผจญภัยต้องนับความคืบหน้าได้ถูก', () => {
  const chapters = SVC.chapterProgress(makePlayer())
  assert(chapters.length >= 1, 'ไม่มีบทเลย')
  for (const entry of chapters) {
    assert(entry.readCount === 0, 'เด็กใหม่กลับอ่านไปแล้ว')
    assert(entry.totalCount > 0, `${entry.chapter.id} ไม่มีตอนที่เป็นหมุดหมาย`)
    assert(entry.beats.length > 0, `${entry.chapter.id} ไม่มีตอนเลย`)
  }

  const allFlags = STORY.STORY_BEATS.map((beat) => beat.grantsFlag).filter(Boolean)
  for (const entry of SVC.chapterProgress(makePlayer(allFlags))) {
    assert(
      entry.readCount === entry.totalCount,
      `${entry.chapter.id} อ่านครบแล้วแต่นับได้ ${entry.readCount}/${entry.totalCount}`,
    )
  }
})

check('บททุกบทต้องอ้างตอนที่มีอยู่จริง', () => {
  const ids = new Set(STORY.STORY_BEATS.map((beat) => beat.id))
  for (const chapter of STORY.STORY_CHAPTERS) {
    assert(chapter.beatIds.length > 0, `${chapter.id} ไม่มีตอนเลย`)
    for (const beatId of chapter.beatIds) {
      assert(ids.has(beatId), `${chapter.id} อ้างตอน ${beatId} ที่ไม่มีอยู่`)
    }
  }
})

// ---------- การบันทึก ----------

const PLAYER_KEY = 'math-adventure:player:v1'

function useFakeStorage() {
  const data = new Map()
  const store = {
    getItem: (key) => (data.has(key) ? data.get(key) : null),
    setItem: (key, value) => data.set(key, String(value)),
    removeItem: (key) => data.delete(key),
    clear: () => data.clear(),
  }
  globalThis.window = { localStorage: store }
  globalThis.localStorage = store
  return store
}

check('ธงเรื่องต้องอยู่ครบหลังบันทึกและอ่านกลับ', () => {
  useFakeStorage()

  const player = makePlayer([STORY.FLAGS.helpedVillage, STORY.FLAGS.crossedBridge])
  assert(STORAGE.savePlayer(player), 'บันทึกไม่สำเร็จ')

  const restored = STORAGE.loadPlayer().data
  assert(restored, 'อ่านกลับไม่ได้')
  assert(restored.storyFlags.length === 2, `ธงเหลือ ${restored.storyFlags.length} อัน`)
})

check('ธงปลอมในไฟล์บันทึกต้องถูกทิ้ง', () => {
  useFakeStorage()

  const player = makePlayer()
  STORAGE.savePlayer(player)

  const raw = JSON.parse(globalThis.localStorage.getItem(PLAYER_KEY))
  raw.player.storyFlags = ['ธงปลอม', STORY.FLAGS.helpedVillage, STORY.FLAGS.helpedVillage]
  globalThis.localStorage.setItem(PLAYER_KEY, JSON.stringify(raw))

  const restored = STORAGE.loadPlayer().data
  assert(restored, 'อ่านกลับไม่ได้')
  assert(
    restored.storyFlags.length === 1 &&
      restored.storyFlags[0] === STORY.FLAGS.helpedVillage,
    `ธงหลังกรองคือ ${JSON.stringify(restored.storyFlags)}`,
  )
})

check('ผู้เล่นเวอร์ชันก่อนมีเนื้อเรื่อง ต้องเปิดเกมได้และเริ่มอ่านจากต้น', () => {
  useFakeStorage()

  const player = makePlayer()
  delete player.storyFlags
  globalThis.localStorage.setItem(PLAYER_KEY, JSON.stringify({ version: 4, player }))

  const restored = STORAGE.loadPlayer().data
  assert(restored, 'ผู้เล่นเวอร์ชันเก่าเปิดเกมไม่ได้')
  assert(Array.isArray(restored.storyFlags), 'ไม่มีสนามธงเรื่อง')
  assert(restored.storyFlags.length === 0, 'ผู้เล่นเก่ากลับมีธงมาแล้ว')
  assert(SVC.pendingBeat(restored, 'world-1-stage-1', 'before'), 'ไม่ได้เริ่มอ่านจากต้น')
})


// ---------- ความครบถ้วนของเนื้อหาทั้งเกม ----------

check('ทุกโลกต้องมีด่านให้เล่นจริง', () => {
  /*
   * ข้อนี้จับปัญหาที่เคยเกิดขึ้นจริงและร้ายแรงที่สุดข้อหนึ่ง
   *
   * โลกที่ 2 ถึง 6 เคยไม่มีด่านเลยสักด่าน ทั้งที่มีชื่อโลก มีคำอธิบาย
   * และมีภาพฉากครบทุกโลก เด็กที่เล่นจบโลกแรกจึงเจอทางตัน
   * โดยไม่มีอะไรบอกว่าเกิดอะไรขึ้น และไม่มี error ให้ใครเห็นด้วย
   *
   * ความว่างเปล่าแบบนี้ไม่ทำให้โปรแกรมพัง จึงไม่มีทางถูกจับได้เอง
   * ต้องมีข้อทดสอบที่ถามตรง ๆ ว่า "มีของให้เล่นไหม" เท่านั้น
   */
  for (const world of WORLDS.WORLDS) {
    const stages = STAGES.getStagesByWorld(world.id)
    assert(
      stages.length >= 5,
      `${world.name} มีแค่ ${stages.length} ด่าน ซึ่งน้อยเกินกว่าจะเรียกว่าโลกหนึ่งโลก`,
    )

    // ต้องมีบอสปิดโลก ไม่งั้นจบโลกแล้วไม่รู้สึกว่าจบ
    assert(
      stages.some((stage) => stage.isBoss),
      `${world.name} ไม่มีด่านบอสปิดโลก`,
    )

    // ด่านต้องต่อกันเป็นเส้นเดียว ไม่มีด่านไหนที่เข้าไม่ถึง
    for (let i = 1; i < stages.length; i += 1) {
      assert(
        stages[i].requiredStageId === stages[i - 1].id,
        `${stages[i].id} ไม่ได้ต่อจาก ${stages[i - 1].id} ทำให้เดินไปไม่ถึง`,
      )
    }
  }
})

check('ทุกด่านต้องมีข้อมูลครบและสมเหตุสมผล', () => {
  const ids = new Set()

  for (const stage of STAGES.STAGES) {
    assert(!ids.has(stage.id), `รหัสด่านซ้ำ: ${stage.id}`)
    ids.add(stage.id)

    assert(stage.name.length >= 3, `${stage.id} ชื่อสั้นเกินไป`)
    assert(stage.description.length >= 10, `${stage.id} คำอธิบายสั้นเกินไป`)
    assert(stage.questionCount >= 3, `${stage.id} มีโจทย์แค่ ${stage.questionCount} ข้อ`)
    assert(
      stage.passingScore >= 50 && stage.passingScore <= 90,
      `${stage.id} เกณฑ์ผ่าน ${stage.passingScore}% ซึ่งผิดปกติ`,
    )
    assert(stage.questionTypes.length >= 1, `${stage.id} ไม่ได้ระบุชนิดโจทย์`)
    assert(
      stage.numberRange.min < stage.numberRange.max,
      `${stage.id} ช่วงตัวเลขกลับหัว`,
    )
    assert(
      stage.firstClearReward.exp > stage.replayReward.exp,
      `${stage.id} เล่นซ้ำได้ EXP ไม่น้อยกว่าครั้งแรก`,
    )
  }
})

check('ทุกโลกต้องมีเนื้อเรื่องของตัวเอง', () => {
  // โลกที่มีด่านให้เล่นแต่ไม่มีเรื่องเลย จะรู้สึกเหมือนด่านฝึกซ้อม ไม่ใช่การผจญภัย
  for (const world of WORLDS.WORLDS) {
    const beats = STORY.STORY_BEATS.filter((beat) =>
      beat.stageId.startsWith(`${world.id}-`),
    )
    assert(beats.length >= 2, `${world.name} มีเนื้อเรื่องแค่ ${beats.length} ตอน`)
  }

  assert(
    STORY.STORY_CHAPTERS.length === WORLDS.WORLDS.length,
    `มีบท ${STORY.STORY_CHAPTERS.length} บท แต่มี ${WORLDS.WORLDS.length} โลก`,
  )
  for (const chapter of STORY.STORY_CHAPTERS) {
    assert(chapter.beatIds.length > 0, `${chapter.title} ไม่มีตอนอยู่ในบทเลย`)
  }
})

check('ทุกตอนของเนื้อเรื่องต้องผูกกับด่านที่มีอยู่จริง', () => {
  // ตอนที่ผูกกับด่านที่ไม่มีอยู่จะไม่มีวันถูกแสดง และไม่มีใครรู้ว่ามันหายไป
  for (const beat of STORY.STORY_BEATS) {
    assert(
      STAGES.getStage(beat.stageId),
      `ตอน "${beat.title}" ผูกกับด่าน ${beat.stageId} ที่ไม่มีอยู่จริง`,
    )
    assert(beat.lines.length >= 2, `ตอน "${beat.title}" สั้นเกินไป`)
  }
})


console.log(`ผ่าน ${passed} ข้อ`)
if (failures.length > 0) {
  console.log(`\nไม่ผ่าน ${failures.length} ข้อ`)
  failures.forEach((line, i) => console.log(`  ${i + 1}. ${line}`))
  process.exit(1)
}
console.log('ผ่านทั้งหมด')
