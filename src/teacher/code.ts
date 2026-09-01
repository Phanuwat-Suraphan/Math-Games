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

const PREFIX = 'KRU1'
const SECTION = '~'
const FIELD = '.'
const PART = ':'

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
    return `${attempts}${PART}${correct}`
  })

  /*
   * ตัดช่องท้ายที่ยังไม่เคยทำทิ้ง
   *
   * เด็กที่เล่นแค่ Safe Zone จะมีตัวเลขอยู่ห้าช่องแรก ที่เหลือเป็นศูนย์
   * การตัดทิ้งทำให้รหัสสั้นลงเกือบครึ่ง ซึ่งสำคัญเพราะเด็ก ป.4 ต้องคัดลอกเอง
   * ตัวอ่านเติมศูนย์ให้ครบเองอยู่แล้ว จึงไม่เสียข้อมูลอะไร
   */
  while (pairs.length > 0 && pairs[pairs.length - 1] === `0${PART}0`) pairs.pop()

  const payload = [safeName(log.name), String(log.day), pairs.join(FIELD)].join(SECTION)
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
  if (sections[0] !== PREFIX) {
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

  const entries = (sections[3] ?? '').split(FIELD).filter((entry) => entry.length > 0)
  entries.forEach((entry, index) => {
    const id = INDICATOR_ORDER[index]
    if (!id) return
    const parts = entry.split(PART)
    const attempts = toInt(parts[0])
    // ข้อถูกมากกว่าข้อที่ทำเป็นไปไม่ได้ ตัดลงมาแทนที่จะปฏิเสธทั้งรหัส
    const correct = Math.min(attempts, toInt(parts[1]))
    counts[id] = { attempts, correct }
  })

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
