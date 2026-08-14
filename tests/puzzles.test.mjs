/**
 * ชุดทดสอบปริศนาคณิตศาสตร์
 *
 * ปริศนาคือกิจกรรมที่เพิ่มเข้ามาเพื่อแก้ปัญหา "ทุกด่านทำอย่างเดียวซ้ำ ๆ"
 * สิ่งที่ต้องรับประกัน: คำตอบถูกต้องทางคณิตศาสตร์จริง และแก้ได้เสมอ
 * ปริศนาที่แก้ไม่ได้จะทำให้เด็กติดค้างจนเล่นต่อไม่ได้
 *
 * วิธีใช้
 *   npx tsc -p tsconfig.tests.json --outDir /tmp/logic
 *   node tests/puzzles.test.mjs /tmp/logic
 */

import path from 'path'
import { createRequire } from 'module'

const OUT = process.argv[2]
if (!OUT) {
  console.error('ใช้: node tests/puzzles.test.mjs <โฟลเดอร์ JS ที่คอมไพล์แล้ว>')
  process.exit(1)
}

const require = createRequire(import.meta.url)
const load = (name) => require(path.resolve(OUT, name + '.js'))

const G = load('puzzles/generators')
const E = load('puzzles/puzzleEngine')

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

const DIFFICULTIES = ['easy', 'medium', 'hard', 'expert']
const GRADES = [4, 5, 6]

/** แก้ปริศนาให้จบโดยใส่คำตอบที่ถูกทุกช่อง */
function solveAll(puzzle) {
  let progress = E.createPuzzleProgress(puzzle)
  for (let i = 0; i < puzzle.slots.length; i += 1) {
    const outcome = E.fillSlot(puzzle, progress, i, puzzle.slots[i].answer)
    assert(outcome, `ช่อง ${i}: ใส่คำตอบไม่ได้`)
    assert(outcome.correct, `ช่อง ${i}: คำตอบที่ถูกกลับนับว่าผิด`)
    progress = outcome.progress
  }
  return progress
}

// ══ ตัวสร้างปริศนา ══

check('สร้างปริศนาได้ครบทุกชนิด ทุกระดับความยาก ทุกชั้นเรียน', () => {
  for (const kind of G.PUZZLE_KINDS) {
    for (const difficulty of DIFFICULTIES) {
      for (const grade of GRADES) {
        const puzzle = G.generatePuzzle({ kind, difficulty, grade, seed: `${kind}-${difficulty}-${grade}` })
        assert(puzzle, `${kind}/${difficulty}/ป.${grade}: สร้างไม่ได้`)
        equal(puzzle.kind, kind, 'ชนิดปริศนาไม่ตรง')
      }
    }
  }
})

check('มีปริศนาอย่างน้อย 5 ชนิด ตามที่สเปกกำหนด', () => {
  assert(G.PUZZLE_KINDS.length >= 5, `มีแค่ ${G.PUZZLE_KINDS.length} ชนิด`)
})

check('ทุกปริศนามีเรื่องราวบอกว่าทำไมต้องแก้ ไม่ใช่แค่โจทย์ลอย ๆ', () => {
  for (const kind of G.PUZZLE_KINDS) {
    const puzzle = G.generatePuzzle({ kind, difficulty: 'medium', grade: 5, seed: 's' })
    assert(puzzle.title.length > 0, `${kind}: ไม่มีชื่อ`)
    assert(puzzle.story.length > 20, `${kind}: เรื่องราวสั้นเกินไป`)
    assert(puzzle.instruction.length > 0, `${kind}: ไม่มีคำสั่งว่าต้องทำอะไร`)
    assert(puzzle.successText.length > 0, `${kind}: ไม่มีข้อความตอนแก้สำเร็จ`)
    // ข้อความสำเร็จต้องเล่าว่าเกิดอะไรขึ้นในโลกของเกม ไม่ใช่แค่บอกว่า "ถูกต้อง"
    assert(!/^(ถูกต้อง|ถูก|เยี่ยม)$/.test(puzzle.successText.trim()),
      `${kind}: ข้อความสำเร็จควรเล่าว่าเกิดอะไรขึ้น`)
  }
})

check('ทุกช่องมีคำตอบ ตัวเลือก และคำใบ้ครบ', () => {
  for (const kind of G.PUZZLE_KINDS) {
    for (const difficulty of DIFFICULTIES) {
      const puzzle = G.generatePuzzle({ kind, difficulty, grade: 5, seed: `${kind}-${difficulty}` })
      assert(puzzle.slots.length > 0, `${kind}: ไม่มีช่องให้เติม`)

      for (const [index, slot] of puzzle.slots.entries()) {
        assert(slot.clue.length > 0, `${kind} ช่อง ${index}: ไม่มีโจทย์`)
        assert(slot.answer.length > 0, `${kind} ช่อง ${index}: ไม่มีคำตอบ`)
        assert(slot.hint && slot.hint.length > 0, `${kind} ช่อง ${index}: ไม่มีคำใบ้`)
        assert(!slot.answer.includes('NaN'), `${kind} ช่อง ${index}: คำตอบเป็น NaN`)
        assert(!slot.answer.startsWith('-'), `${kind} ช่อง ${index}: คำตอบติดลบ`)
      }
    }
  }
})

check('ตัวเลือกไม่ซ้ำ และมีคำตอบที่ถูกอยู่เสมอ', () => {
  for (const kind of G.PUZZLE_KINDS) {
    for (let i = 0; i < 20; i += 1) {
      const puzzle = G.generatePuzzle({ kind, difficulty: 'medium', grade: 5, seed: `${kind}-c-${i}` })
      for (const [index, slot] of puzzle.slots.entries()) {
        if (!slot.choices) continue
        equal(new Set(slot.choices).size, slot.choices.length,
          `${kind} ช่อง ${index}: มีตัวเลือกซ้ำ — ${slot.choices.join(', ')}`)
        assert(slot.choices.includes(slot.answer),
          `${kind} ช่อง ${index}: ไม่มีคำตอบที่ถูกในตัวเลือก`)
        assert(slot.choices.length >= 3, `${kind} ช่อง ${index}: ตัวเลือกน้อยเกินไป`)
      }
    }
  }
})

// ══ ความถูกต้องทางคณิตศาสตร์ ══

check('ล็อกรหัส: โจทย์ทุกข้อคำนวณถูกต้องจริง', () => {
  for (let i = 0; i < 60; i += 1) {
    const puzzle = G.generatePuzzle({ kind: 'numberLock', difficulty: 'medium', grade: 5, seed: `lock-${i}` })
    for (const slot of puzzle.slots) {
      const nums = slot.clue.match(/\d+/g).map(Number)
      let expected
      if (slot.clue.includes('+')) expected = nums[0] + nums[1]
      else if (slot.clue.includes('−')) expected = nums[0] - nums[1]
      else expected = nums[0] / nums[1]

      equal(Number(slot.answer), expected, `คำนวณผิด: ${slot.clue}`)
      assert(Number.isInteger(expected), `ผลลัพธ์ไม่เป็นจำนวนเต็ม: ${slot.clue}`)
    }
  }
})

check('เติมเลขที่หายไป: คำตอบทำให้สมการเป็นจริง', () => {
  for (let i = 0; i < 60; i += 1) {
    const puzzle = G.generatePuzzle({ kind: 'missingNumber', difficulty: 'hard', grade: 6, seed: `miss-${i}` })
    const slot = puzzle.slots[0]
    const [known, total] = slot.clue.match(/\d+/g).map(Number)
    equal(known + Number(slot.answer), total, `สมการไม่เป็นจริง: ${slot.clue}`)
    assert(Number(slot.answer) > 0, `คำตอบต้องมากกว่าศูนย์: ${slot.clue}`)
  }
})

check('ลำดับตัวเลข: ตัวถัดไปต่อจากลำดับได้จริง', () => {
  for (let i = 0; i < 60; i += 1) {
    const puzzle = G.generatePuzzle({ kind: 'sequence', difficulty: 'medium', grade: 5, seed: `seq-${i}` })
    const slot = puzzle.slots[0]
    const shown = slot.clue.replace(', ?', '').split(',').map((t) => Number(t.trim()))

    // ลำดับต้องเป็นแบบบวกคงที่หรือคูณคงที่อย่างใดอย่างหนึ่ง
    const diffs = shown.slice(1).map((v, idx) => v - shown[idx])
    const ratios = shown.slice(1).map((v, idx) => v / shown[idx])
    const isArithmetic = diffs.every((d) => d === diffs[0])
    const isGeometric = ratios.every((r) => r === ratios[0])

    assert(isArithmetic || isGeometric, `ลำดับไม่มีกฎที่แน่นอน: ${slot.clue}`)

    const expected = isArithmetic
      ? shown[shown.length - 1] + diffs[0]
      : shown[shown.length - 1] * ratios[0]
    equal(Number(slot.answer), expected, `ตัวถัดไปผิด: ${slot.clue}`)
  }
})

check('ตาชั่ง: น้ำหนักรวมหารด้วยจำนวนชิ้นลงตัวเสมอ', () => {
  for (let i = 0; i < 60; i += 1) {
    const puzzle = G.generatePuzzle({ kind: 'balance', difficulty: 'medium', grade: 5, seed: `bal-${i}` })
    const slot = puzzle.slots[0]
    const nums = slot.clue.match(/\d+/g).map(Number)
    const count = nums[0]
    const total = nums[1]

    equal(total % count, 0, `หารไม่ลงตัว: ${slot.clue}`)
    equal(Number(slot.answer), total / count, `คำตอบผิด: ${slot.clue}`)
  }
})

check('ประตูเศษส่วน: คำตอบมีค่าเท่ากับเศษส่วนบนประตูจริง', () => {
  const toValue = (text) => {
    const [n, d] = text.split('/').map(Number)
    return d === undefined ? n : n / d
  }

  for (let i = 0; i < 60; i += 1) {
    const puzzle = G.generatePuzzle({ kind: 'fractionDoor', difficulty: 'medium', grade: 5, seed: `frac-${i}` })
    const slot = puzzle.slots[0]
    const target = slot.clue.split(' ')[0]

    assert(Math.abs(toValue(slot.answer) - toValue(target)) < 1e-9,
      `${slot.answer} ไม่เท่ากับ ${target}`)

    // ตัวเลือกลวงต้องไม่เท่ากับคำตอบ ไม่งั้นจะมีคำตอบถูกสองข้อ
    for (const choice of slot.choices) {
      if (choice === slot.answer) continue
      assert(Math.abs(toValue(choice) - toValue(target)) > 1e-9,
        `ตัวเลือก ${choice} ก็ถูกด้วย ทำให้มีคำตอบถูกมากกว่าหนึ่ง`)
    }
  }
})

// ══ การแก้ปริศนา ══

check('แก้ปริศนาได้จนจบทุกชนิด', () => {
  for (const kind of G.PUZZLE_KINDS) {
    for (const difficulty of DIFFICULTIES) {
      const puzzle = G.generatePuzzle({ kind, difficulty, grade: 5, seed: `solve-${kind}-${difficulty}` })
      const progress = solveAll(puzzle)
      assert(progress.solved, `${kind}/${difficulty}: แก้ครบแล้วแต่ยังไม่นับว่าสำเร็จ`)
      equal(progress.mistakes, 0, `${kind}: ตอบถูกหมดแต่นับว่าผิด`)
    }
  }
})

check('ตอบผิดไม่ทำให้แพ้ ลองใหม่ได้เรื่อย ๆ', () => {
  const puzzle = G.generatePuzzle({ kind: 'numberLock', difficulty: 'easy', grade: 4, seed: 'retry' })
  let progress = E.createPuzzleProgress(puzzle)

  const wrong = puzzle.slots[0].choices.find((c) => c !== puzzle.slots[0].answer)
  for (let i = 0; i < 5; i += 1) {
    const outcome = E.fillSlot(puzzle, progress, 0, wrong)
    assert(outcome, 'ตอบผิดแล้วต้องยังตอบต่อได้')
    assert(!outcome.correct, 'ควรนับว่าผิด')
    progress = outcome.progress
  }
  equal(progress.mistakes, 5, 'ต้องนับจำนวนครั้งที่ผิด')
  equal(progress.filled[0], null, 'ช่องต้องยังว่างอยู่')

  // ตอบถูกทีหลังก็ยังผ่านได้
  const good = E.fillSlot(puzzle, progress, 0, puzzle.slots[0].answer)
  assert(good.correct, 'ตอบถูกทีหลังต้องผ่าน')
})

check('ช่องที่ตอบถูกแล้วแก้ซ้ำไม่ได้ กันเด็กเผลอลบคำตอบที่ถูกทิ้ง', () => {
  const puzzle = G.generatePuzzle({ kind: 'numberLock', difficulty: 'easy', grade: 4, seed: 'lock2' })
  let progress = E.createPuzzleProgress(puzzle)
  progress = E.fillSlot(puzzle, progress, 0, puzzle.slots[0].answer).progress

  equal(E.fillSlot(puzzle, progress, 0, '999'), null, 'ต้องแก้ซ้ำไม่ได้')
  assert(progress.filled[0] !== null, 'คำตอบเดิมต้องยังอยู่')
})

check('แก้เสร็จแล้วส่งคำตอบเพิ่มไม่ได้', () => {
  const puzzle = G.generatePuzzle({ kind: 'balance', difficulty: 'easy', grade: 4, seed: 'done' })
  const progress = solveAll(puzzle)
  equal(E.fillSlot(puzzle, progress, 0, '1'), null, 'แก้เสร็จแล้วต้องส่งเพิ่มไม่ได้')
})

check('ช่องที่ไม่มีอยู่จริงต้องไม่ทำให้ระบบพัง', () => {
  const puzzle = G.generatePuzzle({ kind: 'sequence', difficulty: 'easy', grade: 4, seed: 'oob' })
  const progress = E.createPuzzleProgress(puzzle)
  equal(E.fillSlot(puzzle, progress, 99, '1'), null, 'ช่องเกินขอบเขต')
  equal(E.fillSlot(puzzle, progress, -1, '1'), null, 'ช่องติดลบ')
})

check('ความคืบหน้าและรหัสที่ประกอบได้ถูกต้อง', () => {
  const puzzle = G.generatePuzzle({ kind: 'numberLock', difficulty: 'hard', grade: 6, seed: 'code' })
  let progress = E.createPuzzleProgress(puzzle)

  equal(E.puzzlePercent(progress), 0, 'เริ่มต้นต้องเป็น 0%')
  assert(E.assembledCode(progress).includes('—'), 'ช่องที่ยังไม่ตอบต้องแสดงเป็นขีด')
  equal(E.nextOpenSlot(progress), 0, 'ช่องถัดไปต้องเป็นช่องแรก')

  progress = E.fillSlot(puzzle, progress, 0, puzzle.slots[0].answer).progress
  equal(E.nextOpenSlot(progress), 1, 'ช่องถัดไปต้องขยับ')

  progress = solveAll(puzzle)
  equal(E.puzzlePercent(progress), 100, 'แก้ครบต้องเป็น 100%')
  equal(E.nextOpenSlot(progress), -1, 'ไม่ควรมีช่องเหลือ')
  assert(!E.assembledCode(progress).includes('—'), 'รหัสต้องครบทุกหลัก')
})

// ══ รางวัล ══

check('ยังแก้ไม่เสร็จต้องไม่ได้รางวัล', () => {
  const puzzle = G.generatePuzzle({ kind: 'numberLock', difficulty: 'easy', grade: 4, seed: 'rw' })
  const reward = E.puzzleReward(E.createPuzzleProgress(puzzle))
  equal(reward.exp, 0, 'ยังไม่เสร็จต้องไม่ได้ EXP')
  equal(reward.coins, 0, 'ยังไม่เสร็จต้องไม่ได้เหรียญ')
})

check('ตอบผิดหลายครั้งได้รางวัลน้อยลง แต่ไม่เคยเป็นศูนย์', () => {
  const puzzle = G.generatePuzzle({ kind: 'balance', difficulty: 'easy', grade: 4, seed: 'rw2' })

  const clean = { ...solveAll(puzzle), mistakes: 0 }
  const messy = { ...solveAll(puzzle), mistakes: 30 }

  const a = E.puzzleReward(clean)
  const b = E.puzzleReward(messy)

  assert(a.exp > b.exp, 'ตอบผิดเยอะควรได้รางวัลน้อยกว่า')
  assert(b.exp >= E.PUZZLE_REWARD.minExp, `ผิดเยอะแค่ไหนก็ต้องได้อย่างน้อย ${E.PUZZLE_REWARD.minExp} EXP`)
  assert(b.coins >= E.PUZZLE_REWARD.minCoins, 'เหรียญขั้นต่ำต้องยังได้')
})

check('เปิดคำใบ้ไม่หักรางวัลเลย', () => {
  const puzzle = G.generatePuzzle({ kind: 'sequence', difficulty: 'easy', grade: 4, seed: 'hint' })
  const solved = solveAll(puzzle)

  let withHints = solved
  for (let i = 0; i < 5; i += 1) withHints = E.useHint(withHints)

  equal(E.puzzleReward(withHints).exp, E.puzzleReward(solved).exp,
    'เปิดคำใบ้ต้องไม่ทำให้ได้ EXP น้อยลง')
  equal(withHints.hintsUsed, 5, 'ต้องนับจำนวนคำใบ้ไว้ให้ครูดู')
})

// ══ ความหลากหลาย ══

check('seed เดิมได้ปริศนาเดิม seed ต่างได้ปริศนาต่าง', () => {
  for (const kind of G.PUZZLE_KINDS) {
    const a = G.generatePuzzle({ kind, difficulty: 'medium', grade: 5, seed: 'fixed' })
    const b = G.generatePuzzle({ kind, difficulty: 'medium', grade: 5, seed: 'fixed' })
    equal(a.slots[0].clue, b.slots[0].clue, `${kind}: seed เดิมได้โจทย์คนละอัน`)

    const clues = new Set()
    for (let i = 0; i < 25; i += 1) {
      clues.add(G.generatePuzzle({ kind, difficulty: 'medium', grade: 5, seed: `v${i}` }).slots[0].clue)
    }
    assert(clues.size > 12, `${kind}: ปริศนาซ้ำมากเกินไป ได้ ${clues.size} แบบจาก 25 ครั้ง`)
  }
})

// ══ ข้อมูลด่านที่ใช้ปริศนา ══

const STAGES = load('data/stages')

check('ด่านที่เป็นปริศนาระบุชนิดปริศนาที่มีอยู่จริง', () => {
  for (const stage of STAGES.STAGES) {
    if (stage.activity !== 'puzzle') continue
    assert(stage.puzzleKind, `${stage.id}: เป็นด่านปริศนาแต่ไม่ได้ระบุชนิด`)
    assert(G.PUZZLE_KINDS.includes(stage.puzzleKind),
      `${stage.id}: ชนิดปริศนา ${stage.puzzleKind} ไม่มีอยู่จริง`)
  }
})

check('ด่านที่เป็นปริศนาสร้างและแก้ได้จริงทุกด่าน', () => {
  for (const stage of STAGES.STAGES) {
    if (stage.activity !== 'puzzle') continue
    const puzzle = G.generatePuzzle({
      kind: stage.puzzleKind,
      difficulty: stage.difficulty === 'boss' ? 'expert' : stage.difficulty,
      grade: stage.grade ?? 4,
      seed: `stage-${stage.id}`,
    })
    const progress = solveAll(puzzle)
    assert(progress.solved, `${stage.id}: แก้ปริศนาไม่สำเร็จ`)
  }
})

check('World 1 ต้องมีกิจกรรมหลายชนิด ไม่ใช่แบบเดียวทั้งโลก', () => {
  const stages = STAGES.getStagesByWorld('world-1')
  const kinds = new Set(stages.map((s) => s.activity ?? 'quiz'))
  assert(kinds.size >= 3,
    `World 1 มีกิจกรรมแค่ ${kinds.size} ชนิด (${[...kinds].join(', ')}) เล่นแล้วจะรู้สึกซ้ำ`)

  const counts = {}
  for (const stage of stages) {
    const key = stage.activity ?? 'quiz'
    counts[key] = (counts[key] ?? 0) + 1
  }
  console.log('      กิจกรรมใน World 1:',
    Object.entries(counts).map(([k, v]) => `${k} ${v} ด่าน`).join(' · '))
})

check('ไม่มีกิจกรรมชนิดเดียวติดกันเกินสามด่าน', () => {
  const stages = STAGES.getStagesByWorld('world-1')
  let run = 1
  for (let i = 1; i < stages.length; i += 1) {
    const a = stages[i - 1].activity ?? 'quiz'
    const b = stages[i].activity ?? 'quiz'
    run = a === b ? run + 1 : 1
    assert(run <= 3,
      `ด่าน ${i - run + 2} ถึง ${i + 1} เป็น ${b} ติดกัน ${run} ด่าน เล่นแล้วจะรู้สึกซ้ำ`)
  }
})

console.log(`ผ่าน ${passed} ข้อ`)
if (failures.length > 0) {
  console.log(`\nไม่ผ่าน ${failures.length} ข้อ`)
  failures.forEach((line, i) => console.log(`  ${i + 1}. ${line}`))
  process.exit(1)
}
console.log('ผ่านทั้งหมด')
