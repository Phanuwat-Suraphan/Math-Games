/**
 * รหัสผลการเรียน — ส่งผลของเด็กหนึ่งคนถึงครูโดยไม่ต้องมีเซิร์ฟเวอร์
 *
 * ปัญหาที่รหัสนี้แก้
 *
 * เกมทั้งเกมเก็บข้อมูลไว้ใน localStorage ของเบราว์เซอร์บนเครื่องนั้น
 * ครูที่นั่งอยู่หน้าเครื่องตัวเอง จึงไม่มีทางเห็นผลของเด็กสามสิบคน
 * ที่กระจายอยู่บนเครื่องสามสิบเครื่องได้เลย ไม่ว่าหน้าจอจะสวยแค่ไหน
 *
 * ทางแก้ที่ตรงไปตรงมาคือทำเซิร์ฟเวอร์ ซึ่งทำไม่ได้ในโปรเจกต์นี้
 * เพราะเว็บนี้เป็นไฟล์นิ่งบน GitHub Pages ไม่มีหลังบ้าน
 * และถึงทำได้ก็ไม่ควรทำ เพราะจะกลายเป็นการเก็บข้อมูลเด็กไว้บนอินเทอร์เน็ต
 * เพื่อแลกกับความสะดวกของการไม่ต้องคัดลอกข้อความสามสิบบรรทัด
 *
 * จึงใช้วิธีเดียวกับรหัสฟาร์ม คือย่อผลเป็นข้อความหนึ่งบรรทัด
 * เด็กกดคัดลอกแล้วส่งให้ครูทางไหนก็ได้ที่ห้องนั้นใช้กันอยู่แล้ว
 * ครูวางรวมกันในแผงของครู แล้วได้ตารางทั้งห้อง
 *
 * รหัสนี้อ่านออกด้วยตาเปล่าโดยตั้งใจ ไม่มีการเข้ารหัสลับ
 * ในนั้นมีแค่ชื่อที่เด็กตั้งเอง วันที่ และตัวเลขจำนวนข้อ
 * ไม่มีคำตอบที่เด็กพิมพ์ ไม่มีเวลาที่ใช้ ไม่มีอะไรที่เอาไปใช้ต่อได้
 * ถ้าเด็กแก้ตัวเลขในรหัสตัวเอง เลขตรวจสอบท้ายรหัสจะไม่ตรงและครูจะเห็น
 * แต่ถ้าตั้งใจแก้ให้ตรงจริง ๆ ก็ทำได้ ซึ่งรับได้ เพราะนี่คือเครื่องมือของครู
 * ไม่ใช่ระบบสอบ และครูเห็นอยู่แล้วว่าใครนั่งทำอะไรในคาบ
 */

import { hashSeed } from '../math/rng'
import { INDICATOR_ORDER } from './indicators'
import { createLog, emptyCounts } from './log'
import type { StudentLog } from './log'

/**
 * คำนำหน้ารหัสรุ่นปัจจุบัน กับรุ่นเก่าที่ยังต้องอ่านได้
 *
 * ตัวอ่านรับทั้งสองรุ่น เพราะครูอาจเก็บรหัสของคาบก่อนไว้แล้วเพิ่งมาวางทีหลัง
 * รหัสที่ครูเก็บไว้แล้วต้องอ่านได้ตลอดไป ไม่งั้นข้อมูลของเด็กหายไปเฉย ๆ
 *
 * ทำไมต้องขึ้นรุ่นใหม่ แทนที่จะใส่รูปแบบย่อลงในรุ่นเดิม
 *
 * ถ้าเบราว์เซอร์ของครูยังค้างไฟล์รุ่นเก่าอยู่ (ซึ่งเกิดขึ้นได้จริงกับเว็บนิ่ง)
 * ตัวอ่านรุ่นเก่าจะอ่านรูปแบบย่อไม่ออก แต่จะไม่รู้ตัวว่าอ่านไม่ออก
 * มันจะได้ตัวเลขที่ผิดแล้วแสดงในตารางของครูเหมือนเป็นตัวเลขที่ถูก
 * การขึ้นรุ่นทำให้กรณีนั้นกลายเป็นข้อความว่าอ่านไม่ได้ ซึ่งครูเห็นและแก้ได้
 * ตัวเลขผิดที่ดูเหมือนถูก แย่กว่าการอ่านไม่ได้เสมอ
 */
const PREFIX = 'KRU2'
const LEGACY_PREFIXES = ['KRU1', 'KRU2']

const SECTION = '~'
const FIELD = '.'
const PART = ':'

/**
 * เครื่องหมายย่อช่วงที่ยังไม่เคยทำ เขียนเป็น -N แทน 0:0 ที่ติดกัน N ช่อง
 *
 * ทำไมต้องมี
 *
 * ตอนทะเบียนมีเก้าตัว รหัสของเด็กที่เล่นโหมดเดียวยาวราว 69 ตัวอักษร
 * พอเพิ่มเป็นสิบสองตัว ยาวขึ้นเป็น 85 และวัดแล้วพบว่า 58% ของส่วนตัวเลข
 * เป็น 0:0 ล้วน ๆ คือช่องของตัวชี้วัดที่เด็กคนนั้นไม่ได้แตะเลย
 * ทุกครั้งที่ทะเบียนโตขึ้นหนึ่งตัว รหัสของเด็ก "ทุกคน" จะยาวขึ้นสี่ตัวอักษร
 * รวมทั้งเด็กที่ไม่มีวันได้แตะตัวชี้วัดนั้น
 *
 * ตัวตัดท้ายที่มีอยู่เดิมช่วยได้เฉพาะตอนช่องท้าย ๆ เป็นศูนย์
 * ซึ่งไม่ช่วยเลยกับเด็กที่เล่นสนามรบ เพราะช่องที่เป็นศูนย์ของเขาอยู่ต้นแถว
 * (ตัวชี้วัดแกนหกตัวแรก) ส่วนช่องท้ายมีเลขอยู่
 *
 * เครื่องหมายนี้แยกจากคู่ตัวเลขได้แน่นอน เพราะคู่ตัวเลขมี : เสมอ
 * และไม่มีทางขึ้นต้นด้วยเครื่องหมายลบ
 */
const GAP = '-'

/** จำนวนส่วนของรหัสที่ถูกต้อง: คำนำหน้า ชื่อ วันที่ ตัวเลข เลขตรวจสอบ */
const SECTIONS = 5

/** ความยาวสูงสุดของชื่อในรหัส ยาวกว่านี้ตารางของครูจะล้น */
export const MAX_NAME_LENGTH = 24

function checksum(payload: string): string {
  return hashSeed(payload).toString(36).slice(0, 6)
}

/**
 * ตัดอักขระที่จะทำให้รหัสแยกส่วนผิดออกจากชื่อ
 *
 * ตัดเฉพาะตัวคั่นกับช่องว่างซ้ำเท่านั้น ห้ามตัดตัวอักษรไทย
 *
 * ที่ต้องเขียนเตือนไว้ เพราะรหัสฟาร์มเคยพลาดเรื่องนี้มาแล้ว
 * ตัวกรองของรหัสฟาร์มเก็บไว้แต่ A-Z 0-9 ซึ่งเหมาะกับ seed ที่เป็นรหัสสุ่ม
 * แต่ที่นี่ข้อมูลคือชื่อเด็ก ซึ่งเป็นภาษาไทยแทบทั้งห้อง
 * ถ้าลอกตัวกรองนั้นมาใช้ ทั้งห้องจะกลายเป็นชื่อว่างเหมือนกันหมด
 */
export function safeName(name: string): string {
  const cleaned = name
    .replace(/[~.:,]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  return cleaned.length > 0 ? cleaned.slice(0, MAX_NAME_LENGTH) : 'ไม่ระบุชื่อ'
}

/** ย่อผลของเด็กหนึ่งคนเป็นข้อความหนึ่งบรรทัด */
export function encodeLog(log: StudentLog): string {
  const pairs = INDICATOR_ORDER.map((id) => {
    const tally = log.counts[id] ?? { attempts: 0, correct: 0 }
    const attempts = Math.max(0, Math.round(tally.attempts))
    const correct = Math.max(0, Math.round(tally.correct))
    return { attempts, correct }
  })

  /*
   * ตัดช่องท้ายที่ยังไม่เคยทำทิ้ง
   *
   * เด็กที่เล่นแค่ Safe Zone จะมีตัวเลขอยู่ห้าช่องแรก ที่เหลือเป็นศูนย์
   * การตัดทิ้งทำให้รหัสสั้นลงเกือบครึ่ง ซึ่งสำคัญเพราะเด็ก ป.4 ต้องคัดลอกเอง
   * ตัวอ่านเติมศูนย์ให้ครบเองอยู่แล้ว จึงไม่เสียข้อมูลอะไร
   */
  while (pairs.length > 0 && (pairs[pairs.length - 1]?.attempts ?? 0) === 0
    && (pairs[pairs.length - 1]?.correct ?? 0) === 0) {
    pairs.pop()
  }

  // ย่อช่องที่ยังไม่เคยทำซึ่งอยู่กลางแถวด้วย ไม่ใช่แค่ที่อยู่ท้ายแถว
  const entries: string[] = []
  let gap = 0
  const flush = () => {
    if (gap > 0) entries.push(`${GAP}${gap}`)
    gap = 0
  }
  for (const pair of pairs) {
    if (pair.attempts === 0 && pair.correct === 0) {
      gap += 1
      continue
    }
    flush()
    entries.push(`${pair.attempts}${PART}${pair.correct}`)
  }
  flush()

  const payload = [safeName(log.name), String(log.day), entries.join(FIELD)].join(SECTION)
  return `${PREFIX}${SECTION}${payload}${SECTION}${checksum(payload)}`
}

export type DecodeLogResult =
  | { ok: true; log: StudentLog }
  | { ok: false; reason: string }

function toInt(text: string | undefined): number {
  const value = Number.parseInt((text ?? '').trim(), 10)
  return Number.isFinite(value) && value > 0 ? value : 0
}

/**
 * อ่านรหัสกลับเป็นผลของเด็กหนึ่งคน
 *
 * ทุกเส้นทางที่ผิดพลาดคืนข้อความไทยที่บอกว่าให้ทำอะไรต่อ
 * คนที่จะได้อ่านข้อความนี้คือครูที่กำลังรีบตรวจงานท้ายคาบ
 */
export function decodeLog(code: string): DecodeLogResult {
  const trimmed = code.trim()
  if (trimmed.length === 0) return { ok: false, reason: 'บรรทัดนี้ว่าง' }

  const sections = trimmed.split(SECTION)
  if (!LEGACY_PREFIXES.includes(sections[0] ?? '')) {
    return { ok: false, reason: 'ไม่ใช่รหัสผลการเรียน อาจเป็นรหัสฟาร์มที่ขึ้นต้นด้วย DOME' }
  }
  if (sections.length !== SECTIONS) {
    return { ok: false, reason: 'รหัสไม่ครบ อาจคัดลอกมาไม่หมด ต้องคัดลอกทั้งบรรทัด' }
  }

  const payload = sections.slice(1, SECTIONS - 1).join(SECTION)
  if (checksum(payload) !== sections[SECTIONS - 1]) {
    return { ok: false, reason: 'ตัวเลขท้ายรหัสไม่ตรงกับเนื้อรหัส อาจถูกแก้หรือคัดลอกมาไม่ครบ' }
  }

  const name = safeName(sections[1] ?? '')
  const day = toInt(sections[2])
  const counts = emptyCounts()

  /*
   * เดินทีละช่อง โดยที่เครื่องหมาย -N ข้ามไป N ช่องแทนที่จะกินหนึ่งช่อง
   *
   * รหัสรุ่นเก่าไม่มีเครื่องหมายนี้ จึงเดินทีละช่องเหมือนเดิมทุกประการ
   * ตัวอ่านตัวเดียวจึงอ่านได้ทั้งสองรุ่น ไม่ต้องแยกทางเดินตามคำนำหน้า
   */
  const entries = (sections[3] ?? '').split(FIELD).filter((entry) => entry.length > 0)
  let slot = 0
  for (const entry of entries) {
    if (entry.startsWith(GAP)) {
      slot += Math.max(1, toInt(entry.slice(GAP.length)))
      continue
    }
    const id = INDICATOR_ORDER[slot]
    slot += 1
    if (!id) continue
    const parts = entry.split(PART)
    const attempts = toInt(parts[0])
    // ข้อถูกมากกว่าข้อที่ทำเป็นไปไม่ได้ ตัดลงมาแทนที่จะปฏิเสธทั้งรหัส
    const correct = Math.min(attempts, toInt(parts[1]))
    counts[id] = { attempts, correct }
  }

  return { ok: true, log: { name, day, counts } }
}

export interface ParsedLine {
  line: number
  code: string
  result: DecodeLogResult
}

/**
 * อ่านรหัสหลายบรรทัดในครั้งเดียว
 *
 * ครูจะวางทั้งก้อนที่รวบรวมมาจากเด็กทั้งห้อง ซึ่งมีบรรทัดว่างปนแน่นอน
 * และมีบรรทัดที่เด็กคัดลอกมาไม่ครบด้วย ซึ่งต้องบอกให้ได้ว่าเป็นบรรทัดที่เท่าไร
 * ไม่ใช่แค่บอกว่ามีรหัสผิดแล้วให้ครูไล่หาเอง
 */
export function parseCodes(text: string): ParsedLine[] {
  return text
    .split(/\r?\n/)
    .map((raw, index) => ({ line: index + 1, code: raw.trim() }))
    .filter((entry) => entry.code.length > 0)
    .map((entry) => ({ ...entry, result: decodeLog(entry.code) }))
}

/** รหัสของเด็กที่ยังไม่เคยตอบอะไรเลย ใช้เป็นค่าเริ่มต้นและในชุดทดสอบ */
export function blankCode(name: string, day: number): string {
  return encodeLog(createLog(safeName(name), day))
}
