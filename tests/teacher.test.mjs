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
  const expected = ['harvest', 'feed', 'craft', 'resource', 'forecast', 'percent', 'average']
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

console.log(`ผ่าน ${passed} ข้อ`)
if (failures.length > 0) {
  console.log(`\nไม่ผ่าน ${failures.length} ข้อ`)
  failures.forEach((line, index) => console.log(`  ${index + 1}. ${line}`))
  process.exit(1)
}
console.log('ผ่านทั้งหมด')
