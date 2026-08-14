/**
 * ทดสอบการต่อ Question Engine (Part 4) เข้ากับข้อมูลด่าน (Part 3)
 *
 * ข้อนี้สำคัญเพราะเป็นจุดที่ระบบสองระบบมาเจอกัน
 * ถ้าด่านใดด่านหนึ่งตั้งค่าไว้ผิด เด็กจะเปิดด่านนั้นแล้วเล่นไม่ได้
 * จึงต้องไล่ตรวจ "ทุกด่านที่มีอยู่จริง" ไม่ใช่สุ่มตรวจบางด่าน
 *
 * วิธีใช้
 *   node tests/stageQuestions.test.mjs /tmp/qe
 */

import path from 'path'
import { createRequire } from 'module'

const OUT = process.argv[2]
if (!OUT) {
  console.error('ใช้: node tests/stageQuestions.test.mjs <โฟลเดอร์ JS ที่คอมไพล์แล้ว>')
  process.exit(1)
}

const require = createRequire(import.meta.url)
const load = (name) => require(path.resolve(OUT, name + '.js'))

const STAGES = load('data/stages')
const QS = load('services/questionService')
const S = load('questionEngine/session')
const V = load('questionEngine/validators')

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

const ALL_STAGES = STAGES.STAGES

check('ทุกด่านแปลงเป็นคำสั่งสร้างชุดโจทย์ได้', () => {
  for (const stage of ALL_STAGES) {
    const config = QS.buildSessionConfig(stage)
    assert(config.questionTypes.length > 0, `${stage.id}: ไม่มีชนิดโจทย์`)
    assert([4, 5, 6].includes(config.grade), `${stage.id}: ระดับชั้นผิด (${config.grade})`)
    assert(['easy', 'medium', 'hard', 'expert'].includes(config.difficulty),
      `${stage.id}: ระดับความยากผิด (${config.difficulty})`)
    equal(config.questionCount, stage.questionCount, `${stage.id}: จำนวนข้อไม่ตรงกับที่ด่านกำหนด`)
  }
})

check('ด่านบอสเทียบเป็นระดับ expert', () => {
  const boss = ALL_STAGES.find((stage) => stage.difficulty === 'boss')
  assert(boss, 'ควรมีด่านบอสอย่างน้อยหนึ่งด่าน')
  equal(QS.resolveDifficulty(boss), 'expert', 'ด่านบอสต้องเป็น expert')
})

check('ชนิดโจทย์ของด่านตรงกับที่ Question Engine รู้จักทุกตัว', () => {
  for (const stage of ALL_STAGES) {
    const resolved = QS.resolveQuestionTypes(stage)
    equal(resolved.length, stage.questionTypes.length,
      `${stage.id}: มีชนิดโจทย์ที่เครื่องยนต์ไม่รู้จัก — ${stage.questionTypes.join(', ')}`)
  }
})

check('ด่านที่ข้อมูลเสียต้องยังเล่นได้ ไม่ทำให้เกมพัง', () => {
  const broken = { ...ALL_STAGES[0], questionTypes: ['ชนิดที่ไม่มีจริง'] }
  const resolved = QS.resolveQuestionTypes(broken)
  assert(resolved.length > 0, 'ต้องมีชนิดโจทย์สำรอง')
  const session = QS.createStageSession(broken)
  assert(session.questions.length > 0, 'ต้องยังสร้างโจทย์ได้')
})

check('ทุกด่านสร้างชุดโจทย์ได้จริง และทุกข้อผ่านการตรวจสอบ', () => {
  let totalQuestions = 0

  for (const stage of ALL_STAGES) {
    const session = QS.createStageSession(stage, `test-${stage.id}`)

    equal(session.questions.length, stage.questionCount,
      `${stage.id}: จำนวนโจทย์ไม่ตรงกับที่ด่านกำหนด`)
    equal(session.stageId, stage.id, `${stage.id}: รหัสด่านไม่ตรง`)

    for (const question of session.questions) {
      const result = V.validateQuestion(question)
      assert(result.valid, `${stage.id} — ${question.prompt}: ${result.errors.join(', ')}`)
      assert(!question.tags.includes('fallback'),
        `${stage.id}: ต้องใช้โจทย์สำรอง แปลว่าตัวสร้างของชนิดนี้มีปัญหา`)
      totalQuestions += 1
    }
  }

  // ต้องตรวจครบทุกข้อของทุกด่านจริง ๆ ไม่ใช่ตัวเลขที่ตั้งขึ้นมาลอย ๆ
  const expected = ALL_STAGES.reduce((sum, stage) => sum + stage.questionCount, 0)
  equal(totalQuestions, expected, 'ตรวจไม่ครบทุกข้อของทุกด่าน')
  console.log(`      ตรวจ ${ALL_STAGES.length} ด่าน รวม ${totalQuestions} ข้อ`)
})

check('ชนิดโจทย์ในชุดตรงกับที่ด่านกำหนดเท่านั้น', () => {
  for (const stage of ALL_STAGES) {
    const allowed = new Set(QS.resolveQuestionTypes(stage))
    const session = QS.createStageSession(stage, `type-${stage.id}`)
    for (const question of session.questions) {
      assert(allowed.has(question.type),
        `${stage.id}: เจอโจทย์ชนิด ${question.type} ที่ด่านไม่ได้กำหนด`)
    }
  }
})

check('ด่านที่มีหลายชนิดโจทย์ ต้องออกครบทุกชนิด ไม่ใช่ชนิดเดียวรวด', () => {
  const mixed = ALL_STAGES.filter((stage) => stage.questionTypes.length >= 3)
  assert(mixed.length > 0, 'ควรมีด่านโจทย์ผสมอย่างน้อยหนึ่งด่าน')

  for (const stage of mixed) {
    const session = QS.createStageSession(stage, `mix-${stage.id}`)
    const seen = new Set(session.questions.map((question) => question.type))
    equal(seen.size, stage.questionTypes.length,
      `${stage.id}: ออกโจทย์แค่ ${seen.size} ชนิด จากที่กำหนด ${stage.questionTypes.length} ชนิด`)
  }
})

check('เล่นด่านจนจบได้จริงทุกด่าน และผลสรุปตรงกับเกณฑ์ผ่านของด่าน', () => {
  for (const stage of ALL_STAGES) {
    let session = QS.createStageSession(stage, `play-${stage.id}`)

    // ตอบถูกหมดทุกข้อ
    while (!S.isSessionComplete(session)) {
      const question = S.currentQuestion(session)
      const outcome = S.answerCurrent(session, {
        selectedAnswer: question.correctAnswer,
        timeSpent: 5000,
      })
      assert(outcome, `${stage.id}: ตอบไม่ได้`)
      assert(outcome.correct, `${stage.id}: ตอบคำตอบที่ถูกแล้วยังนับว่าผิด — ${question.prompt}`)
      session = outcome.session
    }

    const summary = S.summarizeSession(session)
    equal(summary.total, stage.questionCount, `${stage.id}: จำนวนข้อ`)
    equal(summary.accuracy, 100, `${stage.id}: ตอบถูกหมดต้องได้ 100%`)
    equal(summary.stars, 3, `${stage.id}: ตอบถูกหมดต้องได้ 3 ดาว`)
    assert(summary.correct >= Math.ceil((stage.passingScore / 100) * stage.questionCount),
      `${stage.id}: ตอบถูกหมดแล้วยังไม่ผ่านเกณฑ์`)
  }
})

check('ตอบผิดหมดทุกข้อก็ต้องไม่ทำให้ระบบพัง', () => {
  const stage = ALL_STAGES[0]
  let session = QS.createStageSession(stage, 'all-wrong')

  while (!S.isSessionComplete(session)) {
    const question = S.currentQuestion(session)
    const wrong = question.choices.find((choice) => choice.text !== question.correctAnswer)
    session = S.answerCurrent(session, { selectedAnswer: wrong.text, timeSpent: 3000 }).session
  }

  const summary = S.summarizeSession(session)
  equal(summary.correct, 0, 'ต้องตอบถูก 0 ข้อ')
  equal(summary.accuracy, 0, 'ความแม่นยำต้องเป็น 0')
  equal(summary.stars, 0, 'ต้องไม่ได้ดาว')
  equal(summary.score, 0, 'คะแนนต้องเป็น 0 ไม่ติดลบ')
})

check('ความยากปรับตามผลการตอบผ่านตัวเชื่อมได้', () => {
  const stage = ALL_STAGES.find((item) => item.difficulty === 'easy') ?? ALL_STAGES[0]
  const base = QS.resolveDifficulty(stage)

  const allCorrect = [{ correct: true }, { correct: true }, { correct: true }]
  const harder = QS.difficultyForNextQuestion(stage, allCorrect)
  assert(harder !== base || base === 'expert', 'ตอบถูกติดกันควรยากขึ้น')

  const mixed = [{ correct: true }, { correct: false }, { correct: true }]
  equal(QS.difficultyForNextQuestion(stage, mixed), base, 'ถูกบ้างผิดบ้างต้องไม่เปลี่ยน')
})

console.log(`ผ่าน ${passed} ข้อ`)
if (failures.length > 0) {
  console.log(`\nไม่ผ่าน ${failures.length} ข้อ`)
  failures.forEach((line, i) => console.log(`  ${i + 1}. ${line}`))
  process.exit(1)
}
console.log('ผ่านทั้งหมด')
