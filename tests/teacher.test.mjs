/**
 * ชุดทดสอบแผงคุณครู
 *
 * สามเรื่องที่ต้องตรวจทุกครั้ง
 *
 * หนึ่ง — รหัสผลการเรียนต้องอ่านกลับได้ตรงทุกช่อง
 * เพราะมันคือสิ่งเดียวที่พาผลของเด็กจากเครื่องของเด็ก มาถึงเครื่องของครู
 * รหัสที่อ่านกลับผิดหนึ่งช่อง แปลว่าครูกรอกคะแนนผิดหนึ่งช่องเหมือนกัน
 * และไม่มีทางรู้ตัว เพราะตัวเลขที่ผิดก็ยังดูเหมือนตัวเลขที่ถูก
 *
 * สอง — ชื่อไทยต้องรอด
 * รหัสฟาร์มเคยกรองอักขระจนเหลือแต่ A-Z ซึ่งพอมาใช้กับชื่อเด็ก
 * จะทำให้ทั้งห้องกลายเป็นชื่อว่างเหมือนกันหมด ตารางของครูจึงไร้ความหมาย
 * ข้อนี้จึงมีไว้ล็อกไม่ให้ใครลอกตัวกรองของรหัสฟาร์มมาใช้ที่นี่อีก
 *
 * สาม — การตัดสินว่าตัวชี้วัดไหนควรสอนซ้ำ ต้องไม่ถูกเด็กคนเดียวลากไป
 * เด็กขยันคนเดียวที่ทำไปสามสิบข้อ ต้องไม่ทำให้ตัวชี้วัดที่ทั้งห้องยังไม่ผ่าน
 * ดูเหมือนผ่านแล้ว
 *
 * วิธีใช้
 *   npx tsc -p tsconfig.tests.json --outDir /tmp/logic
 *   node tests/teacher.test.mjs /tmp/logic
 */

import fs from 'fs'
import path from 'path'
import { createRequire } from 'module'

const OUT = process.argv[2]
if (!OUT) {
  console.error('ใช้: node tests/teacher.test.mjs <โฟลเดอร์ JS ที่คอมไพล์แล้ว>')
  process.exit(1)
}

const require = createRequire(import.meta.url)
const load = (name) => require(path.resolve(OUT, name + '.js'))

const I = load('teacher/indicators')
const FT = load('farm/types')
const FE = load('farm/engine')
const FL = load('farm/ledger')
const SM = load('safezone/missions')
const L = load('teacher/log')
const C = load('teacher/code')
const P = load('teacher/report')

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

/** สร้างสมุดที่กรอกตัวเลขไว้แล้ว ใช้ย่อการเขียนข้อทดสอบ */
function logWith(name, day, entries) {
  let log = L.createLog(name, day)
  for (const [id, attempts, correct] of entries) {
    for (let index = 0; index < attempts; index += 1) {
      log = L.recordAttempt(log, id, index < correct, day)
    }
  }
  return log
}

/* ------------------------------------------------------------------ *
 * ทะเบียนตัวชี้วัด
 * ------------------------------------------------------------------ */

check('ตัวชี้วัดทุกตัวมีรหัสไม่ซ้ำกัน', () => {
  const ids = I.INDICATORS.map((item) => item.id)
  assert(new Set(ids).size === ids.length, `มีรหัสซ้ำใน ${ids.join(' ')}`)
})

check('ลำดับตัวชี้วัดตรงกับรายการ เพราะรหัสอ่านตามตำแหน่ง', () => {
  assert(
    I.INDICATOR_ORDER.length === I.INDICATORS.length,
    'INDICATOR_ORDER ยาวไม่เท่ากับ INDICATORS',
  )
  I.INDICATORS.forEach((item, index) => {
    assert(
      I.INDICATOR_ORDER[index] === item.id,
      `ตำแหน่งที่ ${index} ควรเป็น ${item.id} แต่เป็น ${I.INDICATOR_ORDER[index]}`,
    )
  })
})

check('ภารกิจสี่ข้อของ Safe Zone โยงเข้าตัวชี้วัดของชั้น ป.4 ครบ', () => {
  for (const mission of ['energy', 'air', 'water', 'supply']) {
    const id = I.MISSION_INDICATOR[mission]
    const meta = I.findIndicator(id)
    assert(meta !== null, `ภารกิจ ${mission} โยงไปยังตัวชี้วัดที่ไม่มีอยู่จริง`)
    assert(meta.level === 'core', `ภารกิจ ${mission} ควรเป็นตัวชี้วัดของ ป.4`)
  }
})

check('ตัวชี้วัดสี่ตัวที่มาจากเอกสารออกแบบ ต้องทำเครื่องหมายว่ายืนยันแล้ว', () => {
  for (const id of ['estimate', 'unknownAddSub', 'twoStep', 'buildProblem']) {
    const meta = I.findIndicator(id)
    assert(meta.verified === true, `${id} ควรเป็นตัวชี้วัดที่ยืนยันแล้ว`)
    assert(meta.code.length > 0, `${id} ควรมีรหัสตามหลักสูตร`)
  }
})

check('ทุกแถวของสมุดบัญชีโดมสีเขียวโยงเข้าตัวชี้วัดที่มีอยู่จริง', () => {
  for (const [kind, id] of Object.entries(I.LEDGER_INDICATOR)) {
    assert(I.findIndicator(id) !== null, `แถว ${kind} โยงไปยัง ${id} ซึ่งไม่มีอยู่จริง`)
  }
})

check('แถวสร้างโจทย์เองของฟาร์มนับเป็นตัวชี้วัดเดียวกับภารกิจสร้างโจทย์ของ Safe Zone', () => {
  /*
   * สองที่นี้ต้องลงช่องเดียวกัน เพราะเหตุผลทั้งหมดที่เพิ่มแถวในฟาร์ม
   * คือเพื่อให้ตัวชี้วัดข้อนี้มีข้อมากพอจะตัดสินได้ในคาบเดียว
   * ถ้าไปลงคนละช่อง ทั้งสองช่องก็จะยังมีข้อไม่พอเหมือนเดิม
   */
  assert(
    I.LEDGER_INDICATOR.build === I.MISSION_INDICATOR.supply,
    `แถว build ลงช่อง ${I.LEDGER_INDICATOR.build} แต่ภารกิจ supply ลงช่อง ${I.MISSION_INDICATOR.supply}`,
  )
})

check('โจทย์ของโดรนไม่ถูกนับเป็นตัวชี้วัดของ ป.4', () => {
  const meta = I.findIndicator(I.DRONE_INDICATOR)
  assert(meta !== null, 'ตัวชี้วัดของโดรนไม่มีอยู่จริง')
  assert(
    meta.level === 'review',
    'โจทย์บวกลบสองหลักเป็นการทบทวน ไม่ควรถูกเอาไปกรอกเป็นคะแนน ป.4',
  )
})

/* ------------------------------------------------------------------ *
 * การนับผล
 * ------------------------------------------------------------------ */

check('บันทึกผลแล้วตัวเลขเพิ่มถูกช่อง', () => {
  const log = logWith('เด็กหญิงมานี', 20260901, [['estimate', 4, 3]])
  assert(log.counts.estimate.attempts === 4, 'จำนวนข้อที่ทำไม่ตรง')
  assert(log.counts.estimate.correct === 3, 'จำนวนข้อที่ถูกไม่ตรง')
  assert(log.counts.twoStep.attempts === 0, 'ช่องอื่นไม่ควรขยับ')
})

check('บันทึกผลไม่แก้สมุดเดิม', () => {
  const before = L.createLog('มานะ', 20260901)
  const after = L.recordAttempt(before, 'estimate', true, 20260901)
  assert(before.counts.estimate.attempts === 0, 'สมุดเดิมถูกแก้')
  assert(after.counts.estimate.attempts === 1, 'สมุดใหม่ไม่ได้บันทึก')
})

check('ตัวชี้วัดที่ไม่รู้จักถูกทิ้งเงียบ ๆ ไม่ทำให้เกมพัง', () => {
  const log = L.createLog('ปิติ', 20260901)
  const after = L.recordAttempt(log, 'ไม่มีตัวชี้วัดนี้', true, 20260901)
  assert(after === log, 'ควรคืนสมุดเดิมกลับไปตรง ๆ')
})

check('ยังไม่ถึงจำนวนข้อขั้นต่ำ ต้องยังตัดสินไม่ได้', () => {
  const tally = { attempts: L.MIN_ATTEMPTS_FOR_MASTERY - 1, correct: L.MIN_ATTEMPTS_FOR_MASTERY - 1 }
  assert(
    L.masteryOf(tally) === 'none',
    'ทำถูกหมดแต่ทำไปน้อยข้อ ยังไม่ควรนับว่าผ่านตัวชี้วัด',
  )
})

check('ยังไม่เคยทำ ต้องไม่แสดงเป็นศูนย์เปอร์เซ็นต์', () => {
  assert(L.accuracy({ attempts: 0, correct: 0 }) === null, 'ควรคืน null ไม่ใช่ 0')
})

check('รวมผลสองคาบของคนเดียวกัน', () => {
  const first = logWith('สมชาย', 20260901, [['estimate', 3, 2]])
  const second = logWith('สมชาย', 20260908, [['estimate', 2, 2], ['twoStep', 4, 1]])
  const merged = L.mergeLogs(first, second)
  assert(merged.counts.estimate.attempts === 5, 'จำนวนข้อรวมไม่ตรง')
  assert(merged.counts.estimate.correct === 4, 'จำนวนข้อถูกรวมไม่ตรง')
  assert(merged.counts.twoStep.attempts === 4, 'ตัวชี้วัดที่มีเฉพาะคาบหลังหายไป')
  assert(merged.day === 20260908, 'ควรเก็บวันที่ล่าสุด')
})

/* ------------------------------------------------------------------ *
 * รหัสผลการเรียน
 * ------------------------------------------------------------------ */

check('รหัสอ่านกลับได้ตรงทุกช่อง', () => {
  const log = logWith('เด็กชายวีระ', 20260901, [
    ['estimate', 5, 4],
    ['unknownAddSub', 3, 1],
    ['twoStep', 7, 7],
    ['average', 2, 0],
  ])
  const result = C.decodeLog(C.encodeLog(log))
  assert(result.ok, `อ่านรหัสไม่ได้: ${result.reason}`)
  assert(JSON.stringify(result.log) === JSON.stringify(log), 'ข้อมูลที่อ่านกลับมาไม่ตรงกับต้นฉบับ')
})

check('ชื่อภาษาไทยต้องรอดจากการเข้ารหัส', () => {
  const name = 'เด็กหญิงกัญญาณัฐ'
  const result = C.decodeLog(C.encodeLog(L.createLog(name, 20260901)))
  assert(result.ok, 'อ่านรหัสไม่ได้')
  assert(result.log.name === name, `ชื่อเพี้ยนเป็น "${result.log.name}"`)
})

check('ชื่อที่มีตัวคั่นปนมา ต้องถูกตัดออกไม่ให้รหัสแยกส่วนผิด', () => {
  const result = C.decodeLog(C.encodeLog(L.createLog('มา~นี.ที่~หนึ่ง', 20260901)))
  assert(result.ok, 'ชื่อที่มีตัวคั่นทำให้รหัสพัง')
  assert(result.log.name === 'มานีที่หนึ่ง', `ชื่อเป็น "${result.log.name}"`)
})

check('ชื่อว่างได้ชื่อแทน ไม่ใช่ช่องว่างในตารางของครู', () => {
  assert(C.safeName('   ') === 'ไม่ระบุชื่อ', 'ชื่อว่างควรมีข้อความแทน')
})

check('ชื่อยาวเกินไปถูกตัด ไม่ให้ตารางล้น', () => {
  const long = 'ก'.repeat(80)
  assert(C.safeName(long).length === C.MAX_NAME_LENGTH, 'ชื่อยาวไม่ถูกตัด')
})

check('รหัสของเด็กที่เล่นแค่ Safe Zone ต้องสั้น เพราะเด็กต้องคัดลอกเอง', () => {
  const log = logWith('มานี', 20260901, [
    ['estimate', 2, 2],
    ['unknownAddSub', 2, 1],
    ['twoStep', 2, 2],
    ['buildProblem', 1, 1],
    ['basicAddSub', 6, 5],
  ])
  const code = C.encodeLog(log)
  assert(code.length <= 90, `รหัสยาว ${code.length} ตัวอักษร ซึ่งยาวเกินไป`)
  const back = C.decodeLog(code)
  assert(back.ok && JSON.stringify(back.log) === JSON.stringify(log), 'ตัดท้ายแล้วอ่านกลับไม่ตรง')
})

check('รหัสที่ถูกแก้ตัวเลขต้องถูกจับได้', () => {
  const code = C.encodeLog(logWith('มานี', 20260901, [['estimate', 3, 1]]))
  const tampered = code.replace('3:1', '3:3')
  assert(tampered !== code, 'ข้อทดสอบนี้แก้รหัสไม่สำเร็จ')
  const result = C.decodeLog(tampered)
  assert(!result.ok, 'รหัสที่ถูกแก้ควรอ่านไม่ผ่าน')
})

check('รหัสที่คัดลอกมาไม่ครบต้องถูกจับได้', () => {
  const code = C.encodeLog(logWith('มานี', 20260901, [['estimate', 3, 1]]))
  const result = C.decodeLog(code.slice(0, code.length - 4))
  assert(!result.ok, 'รหัสที่ขาดท้ายควรอ่านไม่ผ่าน')
})

check('รหัสฟาร์มที่วางผิดช่องต้องได้ข้อความที่บอกว่าผิดตรงไหน', () => {
  const result = C.decodeLog('DOME2~4.1.12.400~0:0~abc123')
  assert(!result.ok, 'รหัสฟาร์มไม่ควรอ่านผ่านที่นี่')
  assert(result.reason.includes('DOME'), `ข้อความควรบอกว่าเป็นรหัสฟาร์ม แต่ได้ "${result.reason}"`)
})

check('ข้อถูกมากกว่าข้อที่ทำ ต้องถูกตัดลงมา ไม่ใช่ปฏิเสธทั้งรหัส', () => {
  // สร้างรหัสที่ตัวเลขขัดแย้งกันเอง แต่เลขตรวจสอบถูกต้อง
  const broken = logWith('มานี', 20260901, [['estimate', 2, 2]])
  broken.counts.estimate = { attempts: 2, correct: 9 }
  const result = C.decodeLog(C.encodeLog(broken))
  assert(result.ok, 'ควรอ่านผ่านแล้วซ่อมตัวเลข')
  assert(result.log.counts.estimate.correct === 2, 'ข้อถูกควรถูกตัดลงมาเท่าข้อที่ทำ')
})

check('อ่านหลายบรรทัดพร้อมกัน และบอกได้ว่าบรรทัดไหนผิด', () => {
  const good = C.encodeLog(logWith('มานี', 20260901, [['estimate', 3, 3]]))
  const text = ['', good, '  ', 'ขยะที่เด็กวางผิด', good].join('\n')
  const parsed = C.parseCodes(text)
  assert(parsed.length === 3, `ควรได้ 3 บรรทัดที่ไม่ว่าง แต่ได้ ${parsed.length}`)
  assert(parsed[0].result.ok && parsed[2].result.ok, 'บรรทัดที่ถูกควรอ่านผ่าน')
  assert(!parsed[1].result.ok, 'บรรทัดขยะควรอ่านไม่ผ่าน')
  assert(parsed[1].line === 4, `ควรบอกว่าเป็นบรรทัดที่ 4 แต่บอกว่า ${parsed[1].line}`)
})

check('รหัสของเด็กที่ยังไม่เคยตอบอะไร ยังต้องอ่านกลับได้', () => {
  const result = C.decodeLog(C.blankCode('มานี', 20260901))
  assert(result.ok, 'รหัสเปล่าอ่านไม่ผ่าน')
  assert(L.totalsOf(result.log).attempts === 0, 'รหัสเปล่าไม่ควรมีข้อที่ทำ')
})

/* ------------------------------------------------------------------ *
 * สรุปทั้งห้อง
 * ------------------------------------------------------------------ */

check('สรุปทั้งห้องนับเฉพาะเด็กที่มีข้อมูลพอ', () => {
  const logs = [
    logWith('ก', 20260901, [['estimate', 10, 10]]),
    logWith('ข', 20260901, [['estimate', 1, 1]]),
    logWith('ค', 20260901, [['estimate', 4, 1]]),
  ]
  const rows = L.summarizeClass(logs)
  const row = rows.find((item) => item.indicator === 'estimate')
  assert(row.assessed === 2, `ควรตัดสินได้ 2 คน แต่ได้ ${row.assessed}`)
  assert(row.passed === 1, `ควรผ่าน 1 คน แต่ได้ ${row.passed}`)
})

check('เด็กขยันคนเดียวต้องไม่ทำให้ตัวชี้วัดที่ทั้งห้องยังไม่ผ่าน ดูเหมือนผ่านแล้ว', () => {
  const logs = [
    logWith('ขยัน', 20260901, [['twoStep', 40, 40]]),
    ...['ก', 'ข', 'ค', 'ง'].map((name) =>
      logWith(name, 20260901, [['twoStep', 4, 1]]),
    ),
  ]
  const rows = L.summarizeClass(logs)
  const reteach = L.needsReteaching(rows).map((row) => row.indicator)
  assert(
    reteach.includes('twoStep'),
    'สัดส่วนข้อถูกรวมทั้งห้องสูงเพราะเด็กคนเดียว แต่ยังต้องขึ้นว่าควรสอนซ้ำ',
  )
})

check('ตัวชี้วัดที่เกินชั้น ป.4 ไม่ขึ้นในรายการที่ควรสอนซ้ำ', () => {
  const logs = ['ก', 'ข', 'ค'].map((name) =>
    logWith(name, 20260901, [['average', 5, 0], ['percent', 5, 0]]),
  )
  const reteach = L.needsReteaching(L.summarizeClass(logs)).map((row) => row.indicator)
  assert(!reteach.includes('average'), 'ค่าเฉลี่ยเป็นเรื่องต่อยอด ไม่ใช่เรื่องที่ต้องสอนซ้ำใน ป.4')
  assert(!reteach.includes('percent'), 'ร้อยละเป็นเรื่องต่อยอด ไม่ใช่เรื่องที่ต้องสอนซ้ำใน ป.4')
})

check('ตัวชี้วัดที่ยังไม่มีใครทำ ไม่ขึ้นว่าควรสอนซ้ำ', () => {
  const logs = [logWith('ก', 20260901, [['estimate', 5, 5]])]
  const reteach = L.needsReteaching(L.summarizeClass(logs)).map((row) => row.indicator)
  assert(
    reteach.length === 0,
    `ยังไม่มีข้อมูลของตัวชี้วัดอื่นเลย แต่ขึ้นว่าควรสอนซ้ำ ${reteach.join(' ')}`,
  )
})

check('ห้องว่างไม่ทำให้พัง', () => {
  const rows = L.summarizeClass([])
  assert(rows.length === I.INDICATORS.length, 'ควรได้ครบทุกตัวชี้วัดถึงจะยังไม่มีเด็ก')
  assert(L.needsReteaching(rows).length === 0, 'ห้องว่างไม่ควรมีอะไรให้สอนซ้ำ')
})

/* ------------------------------------------------------------------ *
 * ตารางที่ครูเอาไปกรอกคะแนน
 * ------------------------------------------------------------------ */

check('CSV มีหัวตารางและหนึ่งบรรทัดต่อเด็กหนึ่งคน', () => {
  const logs = [
    logWith('มานี', 20260901, [['estimate', 4, 3]]),
    logWith('มานะ', 20260901, [['twoStep', 2, 1]]),
  ]
  const lines = P.toCsv(logs).split('\n')
  assert(lines.length === 3, `ควรมี 3 บรรทัด แต่มี ${lines.length}`)
  assert(lines[1].startsWith('มานี,20260901,'), `บรรทัดแรกเป็น "${lines[1]}"`)
})

check('ทุกบรรทัดของ CSV มีจำนวนช่องเท่ากับหัวตาราง', () => {
  const logs = [logWith('มานี', 20260901, [['estimate', 4, 3]])]
  const lines = P.toCsv(logs).split('\n')
  const columns = lines.map((line) => line.split(',').length)
  assert(columns[0] === columns[1], `หัวตารางมี ${columns[0]} ช่อง แต่บรรทัดข้อมูลมี ${columns[1]}`)
})

check('ชื่อที่มีจุลภาคไม่ทำให้ช่องของ CSV เลื่อน', () => {
  const log = L.createLog('มานี, มานะ', 20260901)
  // ชื่อผ่าน safeName ตอนเข้ารหัสอยู่แล้ว แต่ CSV รับสมุดตรง ๆ ได้ด้วย
  const line = P.toCsv([log]).split('\n')[1]
  assert(line.startsWith('"มานี, มานะ"'), `ควรครอบด้วยอัญประกาศ แต่ได้ "${line}"`)
})

/* ------------------------------------------------------------------ *
 * ต่อกับโจทย์จริงของทั้งสองโหมด
 *
 * ข้อสองข้อนี้เป็นข้อที่จับบั๊กที่จะเกิดขึ้นจริงในอนาคต
 * วันที่มีคนเพิ่มแถวใหม่ในสมุดบัญชี หรือเพิ่มภารกิจใหม่ในห้องควบคุม
 * แล้วลืมโยงเข้าตัวชี้วัด โจทย์นั้นจะหายไปจากตารางของครูเงียบ ๆ
 * เกมยังเล่นได้ปกติ เด็กยังตอบได้ปกติ ต่างกันแค่ครูไม่เห็นว่าเด็กทำข้อนั้น
 * ------------------------------------------------------------------ */

/**
 * เล่นฟาร์มแบบตั้งใจ แล้วเก็บว่าสมุดบัญชีสร้างแถวชนิดไหนออกมาบ้าง
 *
 * ต้องเล่นจริง ไม่ใช่แค่กดปิดวันไปเรื่อย ๆ
 *
 * เขียนครั้งแรกเป็นแบบกดปิดวันเปล่า ๆ แล้วข้อทดสอบผ่านสบาย
 * แต่พอไปนับดูจริง ๆ พบว่ามันเห็นแถวแค่สองชนิดจากเจ็ดชนิด
 * คือแถวที่เกิดเองโดยไม่ต้องทำอะไร ส่วนแถวเก็บเกี่ยว อาหารสัตว์ และแปรรูป
 * ไม่มีทางเกิดเลยถ้าไม่มีใครปลูก ไม่มีใครซื้อสัตว์ และไม่มีใครสั่งแปรรูป
 * ข้อทดสอบที่ผ่านโดยไม่ได้ตรวจอะไร แย่กว่าไม่มีข้อทดสอบ
 * เพราะมันทำให้คนอ่านเชื่อว่าตรงนั้นมีคนดูแลอยู่
 */
function playAndCollectKinds(grade, seed, days) {
  const farm = FE.createFarm(seed, grade)
  const kinds = new Set()

  /*
   * ซื้อไก่สองตัวกับอาหารนิดหน่อยเท่านั้นในวันแรก
   *
   * เคยเขียนให้ซื้อสัตว์ทุกชนิดชนิดละสองตัวตั้งแต่ต้น ผลคือเงินสี่ร้อยหมดเกลี้ยง
   * แล้วปลูกอะไรไม่ได้เลยทั้งสามสิบวัน แถวเก็บเกี่ยวกับแถวแปรรูปจึงไม่เคยเกิด
   * ซึ่งเป็นความผิดของผู้เล่นจำลอง ไม่ใช่ของเกม
   * สัตว์ตัวอื่นซื้อเพิ่มทีหลังตอนมีเงินเหลือ เหมือนที่คนจริงจะทำ
   */
  FE.buyAnimal(farm, 'chicken', 2)
  FE.buyFeed(farm, 20)

  for (let step = 0; step < days; step += 1) {
    farm.plots.forEach((plot, index) => {
      if (plot.planting && !FE.isReady(plot)) FE.waterPlot(farm, index)
    })
    farm.plots.forEach((plot, index) => {
      if (plot.planting) return
      for (const crop of FT.CROPS) {
        if (FE.plantPlot(farm, index, crop.id).ok) break
      }
    })

    /*
     * สั่งแปรรูปก่อนขาย ไม่ใช่ขายก่อน
     *
     * เคยเขียนให้ขายก่อน ผลคือของในคลังหมดทุกวัน แล้วไม่เคยมีวัตถุดิบพอจะแปรรูป
     * แถวแปรรูปจึงไม่เคยเกิดตลอดสามสิบวัน ทั้งที่ผู้เล่นจำลองซื้อโรงแปรรูปแล้ว
     */
    if (farm.kitchens > 0) {
      for (const recipe of [...FT.RECIPES].reverse()) {
        const units = FE.craftableUnits(farm, recipe.id)
        if (units > 0) FE.startCraft(farm, recipe.id, units)
      }
    }

    // ขายของที่เหลือเพื่อให้มีเงินไปซื้อเมล็ด อาหารสัตว์ และอาคาร
    for (const [key, amount] of Object.entries(farm.stock)) {
      if (amount > 0) FE.sellStock(farm, key, amount)
    }

    if (farm.kitchens === 0 && farm.coins > FT.KITCHEN_COST) FE.buyKitchen(farm)
    if (farm.feed < 20 && farm.coins > 200) FE.buyFeed(farm, 40)
    for (const animal of FT.ANIMALS) {
      if (farm.coins > animal.cost + 600) FE.buyAnimal(farm, animal.id, 2)
    }
    for (const building of FT.BUILDINGS) {
      if (FE.daysRemaining(farm, building.produces) < 12) FE.buyBuilding(farm, building.id)
    }

    const plan = FL.planDay(farm)
    for (const row of FL.buildLedger(farm, plan)) kinds.add(row.kind)
    FL.closeDay(farm, plan, true)
  }
  return kinds
}

check('การจำลองต้องเห็นแถวสมุดบัญชีครบทุกชนิด ไม่งั้นข้อถัดไปไม่ได้ตรวจอะไร', () => {
  const kinds = new Set()
  for (const grade of [4, 5, 6]) {
    for (let seed = 0; seed < 4; seed += 1) {
      for (const kind of playAndCollectKinds(grade, `ตรวจตัวชี้วัด-${seed}`, 30)) {
        kinds.add(kind)
      }
    }
  }
  const expected = [
    'harvest',
    'feed',
    'craft',
    'resource',
    'forecast',
    'percent',
    'average',
    'build',
    'unknown',
  ]
  const unseen = expected.filter((kind) => !kinds.has(kind))
  assert(unseen.length === 0, `จำลองแล้วไม่เคยเห็นแถวชนิด ${unseen.join(' ')}`)
})

check('ทุกแถวที่สมุดบัญชีสร้างได้จริง ต้องมีตัวชี้วัดรองรับ', () => {
  const kinds = new Set()
  for (const grade of [4, 5, 6]) {
    for (let seed = 0; seed < 4; seed += 1) {
      for (const kind of playAndCollectKinds(grade, `ตรวจตัวชี้วัด-${seed}`, 30)) {
        kinds.add(kind)
      }
    }
  }
  const missing = [...kinds].filter((kind) => !I.LEDGER_INDICATOR[kind])
  assert(
    missing.length === 0,
    `แถวชนิด ${missing.join(' ')} ไม่ได้โยงเข้าตัวชี้วัด เด็กจะตอบแล้วครูไม่เห็น`,
  )
})

check('ทุกภารกิจที่ห้องควบคุมสร้างได้จริง ต้องมีตัวชี้วัดรองรับ', () => {
  const ids = new Set()
  for (let seed = 0; seed < 6; seed += 1) {
    for (const mission of SM.buildMissions(`ตรวจภารกิจ-${seed}`)) ids.add(mission.id)
  }
  assert(ids.size > 0, 'สร้างภารกิจไม่ได้เลย ข้อทดสอบนี้จึงไม่ได้ตรวจอะไร')
  const missing = [...ids].filter((id) => !I.MISSION_INDICATOR[id])
  assert(
    missing.length === 0,
    `ภารกิจ ${missing.join(' ')} ไม่ได้โยงเข้าตัวชี้วัด เด็กจะตอบแล้วครูไม่เห็น`,
  )
})

check('ตัวชี้วัดที่เขียนบนจอในภารกิจ ตรงกับรหัสที่แผงคุณครูใช้', () => {
  /*
   * ข้อความตัวชี้วัดบนจอกับรหัสในแผงคุณครู เป็นข้อมูลคนละชุดที่ต้องตรงกัน
   * ถ้าไม่ตรง ครูจะเห็นบนจอว่าเด็กทำ ป.4/7 แต่ในตารางไปขึ้นช่องอื่น
   * ซึ่งแย่กว่าไม่มีตารางเลย เพราะเป็นตัวเลขที่ผิดแต่ดูน่าเชื่อถือ
   */
  for (const mission of SM.buildMissions('ตรวจข้อความตัวชี้วัด')) {
    const meta = I.findIndicator(I.MISSION_INDICATOR[mission.id])
    assert(meta !== null, `ภารกิจ ${mission.id} ไม่มีตัวชี้วัด`)
    const number = meta.code.split(' ').pop()
    assert(
      mission.indicator.includes(number),
      `ภารกิจ ${mission.id} เขียนบนจอว่า "${mission.indicator}" แต่แผงคุณครูนับเป็น ${meta.code}`,
    )
  }
})

/* ------------------------------------------------------------------ *
 * ตัวชี้วัดทุกข้อต้องวัดได้จริงในหนึ่งคาบ
 * ------------------------------------------------------------------ */

check('ทุกตัวชี้วัดของชั้น ป.4 ต้องมีข้อมากพอให้ครูตัดสินได้ภายในหนึ่งคาบ', () => {
  /*
   * ข้อนี้ดักบั๊กทั้งตระกูล ไม่ใช่บั๊กเดียว
   *
   * ตัวชี้วัดที่มีที่มาเดียวคือภารกิจใน Safe Zone จะตอบได้ครั้งเดียวต่อการเล่นหนึ่งรอบ
   * แต่แผงคุณครูต้องเห็นอย่างน้อยสามข้อถึงจะตัดสินได้ว่าเด็กผ่านหรือยัง
   * แปลว่าครูต้องให้เด็กเล่นจบสามรอบเพื่อวัดตัวชี้วัดเดียว ซึ่งไม่มีคาบไหนทำได้
   * ตัวชี้วัดข้อนั้นจึงอยู่ในตารางของครูโดยที่ไม่มีวันมีข้อมูลพอจะตัดสิน
   *
   * เรื่องนี้เกิดขึ้นจริงสองครั้ง ครั้งแรกกับ ป.4/12 ครั้งที่สองกับ ป.4/8
   * ครั้งที่สองเกิดเพราะตอนแก้ครั้งแรกไปแก้เฉพาะข้อที่เห็น ไม่ได้ไล่ดูทั้งชุด
   * ข้อทดสอบนี้จึงไล่ทั้งชุดให้แทน และจะดักข้อถัดไปที่ยังไม่มีใครเพิ่มเข้ามา
   *
   * จำลองหนึ่งคาบ = เล่นฟาร์มสิบวัน บวกกับเล่น Safe Zone จบหนึ่งรอบ
   */
  const counts = new Map()
  const bump = (indicator, times) => {
    if (!indicator) return
    counts.set(indicator, (counts.get(indicator) ?? 0) + times)
  }

  // ฝั่ง Safe Zone: ภารกิจละหนึ่งข้อต่อการเล่นหนึ่งรอบ
  for (const mission of SM.buildMissions('หนึ่งคาบ')) {
    bump(I.MISSION_INDICATOR[mission.id], 1)
  }

  // ฝั่งฟาร์ม: นับแถวที่เกิดขึ้นจริงตลอดสิบวัน
  const farm = FE.createFarm('หนึ่งคาบ', 4)
  FE.buyAnimal(farm, 'chicken', 2)
  FE.buyFeed(farm, 20)
  for (let day = 0; day < 10; day += 1) {
    farm.plots.forEach((plot, index) => {
      if (plot.planting && !FE.isReady(plot)) FE.waterPlot(farm, index)
    })
    farm.plots.forEach((plot, index) => {
      if (plot.planting) return
      for (const crop of FT.CROPS) {
        if (FE.plantPlot(farm, index, crop.id).ok) break
      }
    })
    for (const [key, amount] of Object.entries(farm.stock)) {
      if (amount > 0) FE.sellStock(farm, key, amount)
    }
    if (farm.feed < 20 && farm.coins > 200) FE.buyFeed(farm, 40)

    const plan = FL.planDay(farm)
    for (const row of FL.buildLedger(farm, plan)) bump(I.LEDGER_INDICATOR[row.kind], 1)
    FL.closeDay(farm, plan, true)
  }

  const short = I.INDICATORS.filter(
    (item) => item.level === 'core' && (counts.get(item.id) ?? 0) < L.MIN_ATTEMPTS_FOR_MASTERY,
  ).map((item) => `${item.code} ${item.short} ได้แค่ ${counts.get(item.id) ?? 0} ข้อ`)

  assert(
    short.length === 0,
    `ตัวชี้วัดที่หนึ่งคาบยังทำไม่ถึง ${L.MIN_ATTEMPTS_FOR_MASTERY} ข้อ จึงวัดไม่ได้จริง: ${short.join(' · ')}`,
  )
})

check('ตัวชี้วัด ป.4 ทุกข้อต้องมีที่มาจากโดมสีเขียวด้วย ไม่ใช่จาก Safe Zone อย่างเดียว', () => {
  /*
   * ข้อข้างบนวัดผลลัพธ์ ข้อนี้วัดสาเหตุ
   *
   * ตัวชี้วัดที่มีที่มาจาก Safe Zone อย่างเดียว จะพอวัดได้ก็ต่อเมื่อเด็กเล่นซ้ำหลายรอบ
   * ซึ่งเป็นสิ่งที่ครูควบคุมไม่ได้ ข้อนี้จึงบังคับให้ทุกตัวชี้วัดของ ป.4
   * มีแถวในสมุดบัญชีรองรับด้วย เพราะแถวในสมุดบัญชีเกิดซ้ำได้ทุกวันที่เล่น
   */
  const fromFarm = new Set(Object.values(I.LEDGER_INDICATOR))
  const missing = I.INDICATORS.filter(
    (item) => item.level === 'core' && !fromFarm.has(item.id),
  ).map((item) => `${item.code} ${item.short}`)

  assert(
    missing.length === 0,
    `ตัวชี้วัดที่ยังไม่มีแถวในสมุดบัญชีรองรับ: ${missing.join(' · ')}`,
  )
})

/* ------------------------------------------------------------------ *
 * สนามรบตัวเลข กับสมุดของครู
 * ------------------------------------------------------------------ */

const QZ = load('survivor/quiz')
const QE = load('questionEngine/index')

/** สร้างโจทย์ของเลเวลหนึ่งจริง ๆ แล้วบอกว่ามันถูกนับเป็นตัวชี้วัดไหน */
function askAtLevel(level, seed) {
  const plan = QZ.quizPlanFor(level)
  const question = QE.generateQuestion({
    type: plan.skill,
    grade: plan.grade,
    difficulty: plan.difficulty,
    seed,
  })
  return {
    plan,
    question,
    indicator: I.questionIndicator({
      skill: plan.skill,
      grade: plan.grade,
      shape: question.metadata.geometryShape,
      steps: question.metadata.steps,
    }),
  }
}

check('ลำดับตัวชี้วัดเก้าตัวแรกต้องไม่เปลี่ยน เพราะรหัสของครูอ่านตามตำแหน่ง', () => {
  /*
   * ตำแหน่งในทะเบียนคือตำแหน่งตัวเลขในรหัสผลการเรียนที่ครูเก็บไว้จากคาบก่อน
   * การแทรกตัวใหม่ไว้กลางรายการจะทำให้ตัวเลขของเด็กในรหัสเก่าเลื่อนช่องกันหมด
   * และไม่มีอะไรฟ้องเลย เพราะรหัสยังอ่านได้ปกติ แค่ความหมายเปลี่ยนไปทั้งใบ
   *
   * ข้อนี้มาจากความผิดพลาดจริง ตอนเพิ่มตัวชี้วัดคูณหารเข้าไป
   * เขียนครั้งแรกแทรกไว้ก่อน percent เพราะอ่านแล้วเข้ากลุ่มกว่า
   * ซึ่งจะทำให้รหัสเก่าทุกใบเลื่อนสองช่อง จับได้ตอนอ่านทวนเอง ไม่ใช่ตอนทดสอบ
   * จึงเขียนข้อนี้ไว้ ไม่ให้ครั้งหน้าต้องอาศัยการอ่านทวน
   */
  const FROZEN = [
    'estimate',
    'unknownAddSub',
    'unknownMulDiv',
    'twoStep',
    'buildProblem',
    'areaPerimeter',
    'basicAddSub',
    'percent',
    'average',
  ]

  const actual = I.INDICATOR_ORDER.slice(0, FROZEN.length)
  assert(
    actual.join(',') === FROZEN.join(','),
    `ลำดับเก้าตัวแรกเปลี่ยนไปเป็น ${actual.join(',')} ` +
      'ตัวชี้วัดใหม่ต้องต่อท้ายรายการเสมอ ห้ามแทรกกลาง',
  )
  assert(
    I.INDICATOR_ORDER.length >= FROZEN.length,
    'ตัวชี้วัดหายไปจากทะเบียน ซึ่งทำให้รหัสเก่าอ่านไม่ตรงเช่นกัน',
  )
})

check('ทุกทักษะที่สนามรบถาม ต้องตัดสินไว้ชัดว่าโยงหรือไม่โยง', () => {
  /*
   * ช่องที่ลืมใส่จะกลายเป็น undefined ซึ่งวิ่งผ่านโค้ดไปได้เงียบ ๆ
   * แล้วโจทย์ทั้งชนิดนั้นก็หายไปจากสมุดของครูโดยไม่มีใครรู้
   * การเขียน null ไว้ตรง ๆ คือการบอกว่า "ตัดสินแล้วว่าไม่โยง" ไม่ใช่ "ลืม"
   */
  const skills = [
    'addition', 'subtraction', 'multiplication', 'division',
    'fractions', 'decimals', 'percentages', 'geometry', 'wordProblems',
  ]
  for (const skill of skills) {
    assert(
      skill in I.QUESTION_INDICATOR,
      `ทักษะ ${skill} ไม่มีในตารางโยงของสนามรบ`,
    )
    const id = I.QUESTION_INDICATOR[skill]
    assert(
      id === null || I.findIndicator(id) !== null,
      `ทักษะ ${skill} โยงไปหาตัวชี้วัด "${id}" ที่ไม่มีในทะเบียน`,
    )
  }
})

check('โจทย์เรขาคณิตที่ไม่ใช่สี่เหลี่ยมมุมฉาก ต้องไม่ถูกนับเป็น ค 2.1 ป.4/3', () => {
  /*
   * ตัวชี้วัดข้อนี้พูดถึง "รูปสี่เหลี่ยมมุมฉาก" เท่านั้น
   * แต่เครื่องสร้างโจทย์ผลิตสามเหลี่ยมกับวงกลมออกมาด้วยในชั้นเดียวกัน
   * ถ้านับรวมหมด ครูจะเห็นว่าเด็กผ่าน ค 2.1 ป.4/3 ด้วยข้อที่หาพื้นที่วงกลม
   * ซึ่งไม่ใช่แค่โจทย์ที่ยากไปหรือง่ายไป แต่เป็นการรายงานผิดเรื่อง
   *
   * วัดจาก metadata ที่เครื่องสร้างโจทย์ใส่มาให้ ไม่ได้แกะจากข้อความในโจทย์
   * เพราะการแกะข้อความจะพังเงียบ ๆ ในวันที่มีคนแก้คำในโจทย์
   */
  let rectangles = 0
  let others = 0

  for (let i = 0; i < 150; i += 1) {
    const question = QE.generateQuestion({
      type: 'geometry',
      grade: 4,
      difficulty: 'medium',
      seed: `รูปทรง-${i}`,
    })
    const shape = question.metadata.geometryShape
    const id = I.questionIndicator({ skill: 'geometry', grade: 4, shape })

    if (shape === 'square' || shape === 'rectangle') {
      rectangles += 1
      assert(id === 'areaPerimeter', `โจทย์ ${shape} ควรนับเป็น ป.4/3 แต่ได้ ${id}`)
    } else {
      others += 1
      assert(id === null, `โจทย์ ${shape} ถูกนับเป็น ${id} ทั้งที่ไม่ใช่สี่เหลี่ยมมุมฉาก`)
    }
  }

  assert(rectangles > 0, 'ไม่เจอโจทย์สี่เหลี่ยมมุมฉากเลย เทียบอะไรไม่ได้')
  assert(others > 0, 'ไม่เจอโจทย์รูปอื่นเลย ข้อนี้จึงยังไม่ได้ตรวจสิ่งที่ตั้งใจตรวจ')
})

check('โจทย์ปัญหาขั้นตอนเดียว ต้องไม่ถูกนับเป็น ป.4/11 ซึ่งเป็นโจทย์สองขั้นตอน', () => {
  let oneStep = 0
  let twoStep = 0

  for (let i = 0; i < 150; i += 1) {
    const question = QE.generateQuestion({
      type: 'wordProblems',
      grade: 4,
      difficulty: 'hard',
      seed: `ขั้นตอน-${i}`,
    })
    const steps = question.metadata.steps
    const id = I.questionIndicator({ skill: 'wordProblems', grade: 4, steps })

    if ((steps ?? 1) >= 2) {
      twoStep += 1
      assert(id === 'twoStep', `โจทย์ ${steps} ขั้นตอนควรนับเป็น ป.4/11 แต่ได้ ${id}`)
    } else {
      oneStep += 1
      assert(id === null, `โจทย์ขั้นตอนเดียวถูกนับเป็น ${id}`)
    }
  }

  assert(twoStep > 0, 'ไม่เจอโจทย์สองขั้นตอนเลย')
  assert(oneStep > 0, 'ไม่เจอโจทย์ขั้นตอนเดียวเลย ข้อนี้จึงยังไม่ได้ตรวจสิ่งที่ตั้งใจตรวจ')
})

check('โจทย์ชั้นที่สูงกว่า ป.4 ต้องไม่ถูกนับเป็นตัวชี้วัดแกนของ ป.4', () => {
  /*
   * สนามรบไล่ชั้นขึ้นเป็น ป.5 และ ป.6 ตามเลเวล
   * การนับข้อ ป.6 เป็นตัวชี้วัด ป.4 คือการบอกครูว่าเด็กผ่านตัวชี้วัดชั้นนี้
   * ด้วยหลักฐานที่มาจากชั้นอื่น ซึ่งครูจะเอาไปใช้ตัดสินใจสอนซ่อมไม่ได้เลย
   */
  for (const grade of [5, 6]) {
    const geometry = I.questionIndicator({ skill: 'geometry', grade, shape: 'rectangle' })
    const word = I.questionIndicator({ skill: 'wordProblems', grade, steps: 2 })
    assert(geometry === null, `โจทย์เรขาคณิต ป.${grade} ถูกนับเป็น ${geometry}`)
    assert(word === null, `โจทย์ปัญหา ป.${grade} ถูกนับเป็น ${word}`)
  }

  // ส่วนตัวทบทวนกับตัวต่อยอดไม่มีรหัสชั้นกำกับ จึงรับได้ทุกชั้นตามที่ตั้งใจ
  assert(
    I.questionIndicator({ skill: 'addition', grade: 6 }) === 'basicAddSub',
    'ตัวชี้วัดทบทวนกลับถูกกันออกเพราะเรื่องชั้น ทั้งที่ไม่มีรหัสชั้นกำกับ',
  )
})

check('เล่นสนามรบหนึ่งรอบต้องได้ข้อของตัวชี้วัด รวมทั้งตัวชี้วัดแกนอย่างน้อยหนึ่งตัว', () => {
  /*
   * ข้อนี้คือข้อที่จับปัญหาที่ใหญ่ที่สุดของเรื่องนี้ได้
   *
   * ตอนแรกโยงตารางเสร็จแล้วดูเหมือนเรียบร้อยดี แต่พอไล่เลเวลจริงออกมาดู
   * พบว่าตอนที่โจทย์ยังเป็นชั้น ป.4 อยู่ สนามรบถามแค่บวก ลบ และคูณเท่านั้น
   * ส่วนเรขาคณิตกับโจทย์ปัญหาโผล่ที่เลเวลสิบสี่ขึ้นไป ซึ่งเป็นชั้น ป.6 ไปแล้ว
   * แปลว่าตัวชี้วัดแกนไม่มีวันถูกบันทึกจากโหมดนี้เลย
   * ทั้งที่ตารางการโยงถูกต้องทุกช่อง และไม่มีอะไรผิดให้เห็น
   *
   * จึงต้องตรวจที่ "เล่นจริงแล้วได้อะไร" ไม่ใช่ตรวจที่ตารางว่าเขียนถูกไหม
   */
  const got = new Set()
  for (let seed = 0; seed < 12; seed += 1) {
    for (let level = 1; level <= 9; level += 1) {
      const { indicator } = askAtLevel(level, `รอบ-${seed}-lv${level}`)
      if (indicator) got.add(indicator)
    }
  }

  assert(got.size >= 3, `เล่นครบช่วง ป.4 แล้วได้ตัวชี้วัดแค่ ${got.size} ตัว`)

  const core = [...got].filter((id) => I.findIndicator(id)?.level === 'core')
  assert(
    core.length > 0,
    'เล่นครบช่วง ป.4 แล้วไม่ได้ตัวชี้วัดแกนเลยสักตัว ' +
      'แปลว่าโหมดนี้ไม่เคยถามโจทย์ที่ตรงกับตัวชี้วัดตอนที่ยังเป็นชั้น ป.4',
  )
})

check('ช่วงชั้น ป.4 ของสนามรบต้องถามครบทุกทักษะ ไม่ใช่แค่สามอย่างแรก', () => {
  const skills = new Set()
  for (let level = 1; level <= 9; level += 1) {
    const plan = QZ.quizPlanFor(level)
    assert(plan.grade === 4, `เลเวล ${level} เป็นชั้น ป.${plan.grade} แล้ว`)
    skills.add(plan.skill)
  }
  assert(skills.size === 9, `ช่วง ป.4 ถามแค่ ${skills.size} ทักษะ จากทั้งหมด 9`)
})


check('ทุกหน้าจอที่บันทึกการตอบโจทย์ ต้องส่งเข้าสมุดของครูด้วย', () => {
  /*
   * ข้อนี้อ่านไฟล์ต้นฉบับตรง ๆ ไม่ได้เรียกโมดูลที่คอมไพล์แล้วเหมือนข้ออื่น
   * เพราะสิ่งที่ต้องตรวจคือ "มีหน้าจอไหนลืมต่อสายบ้าง" ซึ่งเป็นคำถามเกี่ยวกับ
   * โครงสร้างของโปรเจกต์ ไม่ใช่เกี่ยวกับพฤติกรรมของฟังก์ชันใดฟังก์ชันหนึ่ง
   * และหน้าจอเป็นไฟล์ React ที่ชุดทดสอบเรียกใช้ไม่ได้อยู่แล้ว
   *
   * ทำไมต้องมีข้อนี้
   *
   * ตอนแรกมีแค่สองโหมดที่ส่งผลเข้าแผงคุณครู อีกหกโหมดไม่เคยส่งอะไรเลยสักข้อ
   * ทั้งที่รวมกันแล้วเป็นโจทย์ส่วนใหญ่ที่เด็กตอบในหนึ่งคาบ
   * และไม่มีอะไรฟ้องเลย เพราะทุกโหมดก็ทำงานถูกต้องของมันเอง แค่ครูไม่เห็น
   *
   * แล้วตอนแก้ก็ยังแก้เฉพาะโหมดที่เห็นก่อนโหมดเดียว ก่อนจะมาไล่ทั้งชุดทีหลัง
   * ซึ่งเป็นความผิดพลาดแบบเดียวกับตอนแก้ ป.4/12 แล้วไม่ได้ไล่หาข้ออื่นที่เหมือนกัน
   * ข้อนี้จึงมีไว้ไล่แทนคน เพื่อไม่ให้ครั้งหน้าต้องอาศัยการสังเกตเอา
   */
  const dir = path.resolve('src/pages')
  const missing = []

  for (const file of fs.readdirSync(dir)) {
    if (!file.endsWith('.tsx')) continue
    const source = fs.readFileSync(path.join(dir, file), 'utf8')
    if (!source.includes('answerQuestion({')) continue
    if (!source.includes('logIndicator(')) missing.push(file)
  }

  assert(
    missing.length === 0,
    `หน้าจอที่เด็กตอบโจทย์แล้วครูไม่เห็น: ${missing.join(' · ')} ` +
      '(ต้องเรียก logIndicator ด้วย หรือถ้าตั้งใจไม่ส่ง ให้เขียนเหตุผลไว้แล้วแก้ข้อนี้)',
  )
})

check('โจทย์ที่ไม่มี metadata ต้องไม่ถูกนับเป็นตัวชี้วัดที่ต้องรู้เนื้อโจทย์', () => {
  /*
   * ปริศนากับมินิเกมสร้างโจทย์ของตัวเอง ไม่ได้ผ่านเครื่องสร้างโจทย์กลาง
   * จึงไม่มีรูปทรงกับจำนวนขั้นตอนให้ส่งมา
   * เมื่อไม่รู้ ต้องตอบว่าไม่นับ ไม่ใช่เดาว่าน่าจะใช่
   * เพราะการเดาผิดคือการรายงานให้ครูผิด ส่วนการไม่รายงานแค่ทำให้ข้อมูลน้อยลง
   */
  assert(
    I.questionIndicator({ skill: 'geometry', grade: 4 }) === null,
    'โจทย์เรขาคณิตที่ไม่รู้รูปทรง ถูกนับเป็นตัวชี้วัดสี่เหลี่ยมมุมฉาก',
  )
  assert(
    I.questionIndicator({ skill: 'wordProblems', grade: 4 }) === null,
    'โจทย์ปัญหาที่ไม่รู้จำนวนขั้นตอน ถูกนับเป็นตัวชี้วัดโจทย์สองขั้นตอน',
  )
  // ส่วนทักษะที่ไม่ต้องรู้เนื้อโจทย์ ยังนับได้ตามปกติ
  assert(
    I.questionIndicator({ skill: 'multiplication', grade: 4 }) === 'basicMulDiv',
    'โจทย์คูณที่ไม่มี metadata กลับไม่ถูกนับ ทั้งที่ไม่ต้องรู้เนื้อโจทย์',
  )
})


check('ตัวชี้วัดที่ไม่มีรหัส ต้องไม่ถูกนับเป็นเกณฑ์ของชั้น ป.4', () => {
  /*
   * เศษส่วนกับทศนิยมรายงานให้ครูดูเป็นข้อมูลประกอบ แต่ยังไม่มีรหัสตัวชี้วัด
   * เพราะทะเบียนนี้ใส่รหัสเฉพาะที่ยืนยันถ้อยคำมาจากเอกสารแล้ว
   *
   * สิ่งที่ต้องกันคือมันหลุดไปอยู่ในกลุ่มที่ครูเอาไปกรอกคะแนน
   * ซึ่งจะทำให้ครูกรอกคะแนนตัวชี้วัดจากเรื่องที่ยังไม่รู้ด้วยซ้ำว่ารหัสอะไร
   */
  for (const item of I.INDICATORS) {
    if (item.level === 'core') {
      assert(item.code !== '', `ตัวชี้วัดแกน ${item.id} ไม่มีรหัส`)
    } else {
      assert(
        item.code === '',
        `ตัวชี้วัด ${item.id} ไม่ใช่ระดับแกนแต่มีรหัส ${item.code} ` +
          'ครูอาจเผลอเอาไปกรอกเป็นคะแนน',
      )
    }
  }

  // สองตัวที่เพิ่งเพิ่มต้องอยู่ในกลุ่มที่ไม่ถูกนับเป็นเกณฑ์จริง ๆ
  for (const id of ['fractionSense', 'decimalSense']) {
    const meta = I.findIndicator(id)
    assert(meta !== null, `ไม่พบตัวชี้วัด ${id}`)
    assert(meta.level !== 'core', `${id} ถูกนับเป็นตัวชี้วัดแกน`)
  }
})

check('เรื่องที่ยังไม่ระบุรหัส ต้องไม่ทำให้ระบบบอกว่าควรสอนซ้ำ', () => {
  /*
   * การตัดสินว่าตัวชี้วัดไหนควรสอนซ้ำ นับเฉพาะตัวชี้วัดแกน
   * ถ้าเศษส่วนหลุดเข้าไปในการนับนั้น ครูจะถูกบอกให้ไปสอนซ่อมเรื่องที่
   * ทะเบียนนี้ยังไม่ได้ยืนยันด้วยซ้ำว่าเป็นตัวชี้วัดข้อไหน
   *
   * เขียนครั้งแรกใช้ชื่อช่องผิด (assessed แทน attempts) ผลคือสมุดที่ป้อนเข้าไป
   * ไม่มีข้อมูลเลยสักข้อ ฟังก์ชันจึงคืนรายการว่าง แล้วข้อนี้ก็ผ่านไปเฉย ๆ
   * โดยไม่ได้ตรวจอะไรจริง ๆ สักอย่าง
   *
   * จึงตรวจสองด้านคู่กัน คือตัวชี้วัดแกนที่อ่อนต้องถูกเสนอจริง
   * ถ้าด้านนั้นไม่ผ่าน แปลว่าสมุดที่ป้อนเข้าไปไม่ถูกต้อง และอีกด้านก็เชื่อไม่ได้
   */
  const weakTally = { attempts: 10, correct: 1 }
  const classLog = ['เด็กหนึ่ง', 'เด็กสอง', 'เด็กสาม'].map((name) => ({
    name,
    day: 20260101,
    counts: {
      estimate: { ...weakTally },
      fractionSense: { ...weakTally },
      decimalSense: { ...weakTally },
    },
  }))

  const weak = L.needsReteaching(L.summarizeClass(classLog))
  const ids = weak.map((row) => row.indicator)

  assert(
    ids.includes('estimate'),
    'ตัวชี้วัดแกนที่ทั้งห้องทำได้ 10% กลับไม่ถูกเสนอให้สอนซ้ำ ' +
      'แปลว่าสมุดที่ป้อนเข้าไปไม่ถูกต้อง ข้อนี้จึงยังไม่ได้ตรวจสิ่งที่ตั้งใจตรวจ',
  )
  for (const id of ['fractionSense', 'decimalSense']) {
    assert(
      !ids.includes(id),
      `${id} ถูกเสนอให้สอนซ้ำ ทั้งที่ยังไม่ใช่ตัวชี้วัดที่มีรหัส`,
    )
  }
})


check('รหัสรุ่นเก่าที่ครูเก็บไว้แล้ว ต้องยังอ่านได้ตรงทุกช่อง', () => {
  /*
   * นี่คือข้อที่สำคัญที่สุดของการเปลี่ยนรูปแบบรหัส
   *
   * ครูอาจเก็บรหัสของคาบก่อนไว้ในไฟล์แล้วเพิ่งมาวางทีหลัง
   * ถ้าอ่านไม่ได้ ผลของเด็กทั้งคาบนั้นหายไปเฉย ๆ และไม่มีทางกู้กลับ
   *
   * สร้างรหัสรุ่นเก่าขึ้นมาเองในข้อนี้ โดยเขียนคู่ตัวเลขเรียงทุกช่องแบบไม่ย่อ
   * แล้วคำนวณเลขตรวจสอบด้วยสูตรเดียวกับที่ code.ts ใช้
   * ที่ต้องเขียนสูตรซ้ำตรงนี้ เพราะเป็นวิธีเดียวที่จะได้รหัสรุ่นเก่าของจริง
   * ถ้าวันหนึ่งสูตรเปลี่ยน ข้อนี้จะล้มทันทีที่บรรทัด ok ด้านล่าง ไม่ใช่ผ่านไปเงียบ ๆ
   */
  const RNG = load('math/rng')
  const legacyChecksum = (payload) => RNG.hashSeed(payload).toString(36).slice(0, 6)

  const want = {
    estimate: { attempts: 4, correct: 3 },
    twoStep: { attempts: 6, correct: 2 },
    basicAddSub: { attempts: 9, correct: 8 },
  }

  // รูปแบบรุ่นเก่า คือเขียนทุกช่องเรียงกัน ไม่มีเครื่องหมายย่อ
  const pairs = I.INDICATOR_ORDER.map((id) => {
    const tally = want[id] ?? { attempts: 0, correct: 0 }
    return `${tally.attempts}:${tally.correct}`
  })
  while (pairs.length > 0 && pairs[pairs.length - 1] === '0:0') pairs.pop()

  const payload = ['เด็กคาบก่อน', '20260401', pairs.join('.')].join('~')
  const legacy = `KRU1~${payload}~${legacyChecksum(payload)}`

  const back = C.decodeLog(legacy)
  assert(back.ok, `อ่านรหัสรุ่นเก่าไม่ได้: ${back.ok ? '' : back.reason}`)
  assert(back.log.name === 'เด็กคาบก่อน', 'ชื่อจากรหัสรุ่นเก่าเพี้ยน')
  assert(back.log.day === 20260401, 'วันที่จากรหัสรุ่นเก่าเพี้ยน')

  for (const id of I.INDICATOR_ORDER) {
    const expected = want[id] ?? { attempts: 0, correct: 0 }
    const got = back.log.counts[id]
    assert(
      got.attempts === expected.attempts && got.correct === expected.correct,
      `ช่อง ${id} จากรหัสรุ่นเก่าได้ ${got.attempts}:${got.correct} ` +
        `แต่ควรเป็น ${expected.attempts}:${expected.correct}`,
    )
  }
})

check('รหัสต้องไม่ยาวขึ้นตามจำนวนตัวชี้วัดที่เด็กไม่ได้แตะ', () => {
  /*
   * นี่คือกติกาที่ทำให้ทะเบียนโตต่อไปได้โดยไม่ทำร้ายเด็ก
   *
   * ก่อนมีการย่อ ทุกครั้งที่ทะเบียนโตขึ้นหนึ่งตัว รหัสของเด็กทุกคนจะยาวขึ้น
   * สี่ตัวอักษร รวมทั้งเด็กที่ไม่มีวันได้แตะตัวชี้วัดนั้น
   * วัดตอนทะเบียนมีสิบสองตัวแล้วพบว่า 58% ของส่วนตัวเลขเป็นศูนย์ล้วน
   *
   * ข้อนี้ผูกความยาวไว้กับ "จำนวนช่องที่เด็กทำจริง" ไม่ใช่ขนาดของทะเบียน
   * ถ้าใครเอาการย่อออก ข้อนี้จะล้มทันที
   */
  const one = logWith('ก', 20260905, [['estimate', 3, 2]])
  const digits = (code) => code.split('~')[3]

  assert(
    digits(C.encodeLog(one)).length <= 8,
    `เด็กที่ทำแค่ตัวชี้วัดเดียว ได้ส่วนตัวเลขยาว ${digits(C.encodeLog(one)).length} ตัวอักษร`,
  )

  // ช่องศูนย์ที่อยู่กลางแถวต้องถูกย่อด้วย ไม่ใช่แค่ที่อยู่ท้ายแถว
  const gapped = logWith('ข', 20260905, [
    ['estimate', 3, 2],
    ['basicAddSub', 4, 4],
  ])
  const section = digits(C.encodeLog(gapped))
  assert(
    !section.includes('0:0'),
    `ส่วนตัวเลขยังมี 0:0 อยู่: ${section} ซึ่งแปลว่าช่องศูนย์กลางแถวไม่ถูกย่อ`,
  )
  const back = C.decodeLog(C.encodeLog(gapped))
  assert(back.ok && JSON.stringify(back.log) === JSON.stringify(gapped), 'ย่อแล้วอ่านกลับไม่ตรง')
})

check('รหัสของเด็กที่เล่นครบทุกเรื่อง ต้องยังอยู่ในความยาวที่คัดลอกเองไหว', () => {
  /*
   * ข้อเดิมวัดเฉพาะเด็กที่เล่นแค่ Safe Zone ซึ่งเป็นกรณีที่สั้นที่สุด
   * เพดาน 90 ที่ตั้งไว้จึงไม่เคยถูกทดสอบจริงเลยสักครั้ง
   * วัดกรณีที่ยาวที่สุดแล้วพบว่ายาว 117 ตัวอักษร คือเกินเพดานไปมาก
   * และไม่มีข้อทดสอบไหนจับได้
   *
   * การย่อช่องศูนย์ไม่ช่วยกรณีนี้เลย เพราะเด็กที่ทำครบทุกตัวชี้วัดไม่มีช่องศูนย์
   * ความยาวที่เหลือเป็นชื่อ 24 ตัวอักษร กับคู่ตัวเลขสิบสองคู่ ซึ่งตัดอะไรไม่ได้อีก
   * นอกจากจะเข้ารหัสตัวเลขให้อ่านด้วยตาไม่ออก ซึ่งขัดกับเจตนาของรหัสนี้
   *
   * เพดานตรงนี้จึงเป็นสัญญาณเตือน ไม่ใช่เป้าหมาย
   * ตั้งไว้เหนือค่าที่วัดได้จริงเล็กน้อย เพื่อให้วันที่ใครเพิ่มตัวชี้วัดอีกหลายตัว
   * ข้อนี้ล้มขึ้นมาแล้วมีคนต้องมาคิดว่าจะทำยังไงกับความยาวที่โตขึ้น
   * ไม่ใช่ปล่อยให้มันยาวขึ้นเรื่อย ๆ จนเด็กคัดลอกไม่ไหวโดยไม่มีใครสังเกต
   */
  const heavy = logWith(
    'ก'.repeat(C.MAX_NAME_LENGTH),
    20260905,
    I.INDICATOR_ORDER.map((id) => [id, 24, 18]),
  )
  const code = C.encodeLog(heavy)
  assert(
    code.length <= 120,
    `รหัสกรณีหนักสุดยาว ${code.length} ตัวอักษร ซึ่งเกินสัญญาณเตือน ` +
      'ถ้าเพิ่งเพิ่มตัวชี้วัดเข้าไป ต้องตัดสินใจก่อนว่าเด็กจะคัดลอกไหวไหม',
  )

  const back = C.decodeLog(code)
  assert(back.ok && JSON.stringify(back.log) === JSON.stringify(heavy), 'รหัสยาวแล้วอ่านกลับไม่ตรง')
})

console.log(`ผ่าน ${passed} ข้อ`)
if (failures.length > 0) {
  console.log(`\nไม่ผ่าน ${failures.length} ข้อ`)
  failures.forEach((line, index) => console.log(`  ${index + 1}. ${line}`))
  process.exit(1)
}
console.log('ผ่านทั้งหมด')
