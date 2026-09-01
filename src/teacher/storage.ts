/**
 * การเก็บผลรายตัวชี้วัดลงเครื่อง
 *
 * เก็บเป็นรหัสผลการเรียนบรรทัดละคน ไม่ได้เก็บเป็น JSON อีกรูปแบบหนึ่ง
 * เหตุผลเดียวกับที่รหัสฟาร์มทำ คือมีรูปแบบเดียวและมีตัวตรวจตัวเดียว
 * ทางที่ใช้ทุกวันกับทางที่ใช้ปีละครั้ง จึงเดินผ่านโค้ดเส้นเดียวกัน
 *
 * ที่ต้องเก็บหลายคนในเครื่องเดียว เพราะเครื่องของโรงเรียนใช้ร่วมกัน
 * คาบเช้ากับคาบบ่ายเป็นคนละห้อง แต่เป็นเครื่องเดียวกัน
 * ถ้าเก็บได้คนเดียว ผลของคาบเช้าจะหายไปตอนคาบบ่ายเริ่มเล่นพอดี
 * ซึ่งเป็นตอนที่ครูยังไม่ได้เก็บรหัสของคาบเช้า
 *
 * แยกคีย์จากข้อมูลผู้เล่นหลักและจากฟาร์ม ด้วยเหตุผลเดิม
 * ข้อมูลชุดนี้เสีย ควรเสียแค่ชุดนี้ ไม่ลามไปทำให้ด่านและเหรียญของเด็กหาย
 */

import { decodeLog, encodeLog } from './code'
import type { StudentLog } from './log'
import { createLog, mergeLogs } from './log'

const LOG_KEY = 'math-adventure:indicators:v1'

/**
 * จำนวนคนสูงสุดที่เก็บไว้ในเครื่องเดียว
 *
 * ห้องหนึ่งราวสี่สิบคน แต่เครื่องหนึ่งไม่ได้มีเด็กเล่นสี่สิบคน
 * ตั้งไว้ที่ห้าสิบเพื่อเผื่อเครื่องที่ทั้งห้องผลัดกันใช้ในคาบคอมพิวเตอร์
 * เกินกว่านี้จะทิ้งคนที่เก่าที่สุด เพราะครูเก็บรหัสของคาบก่อนไปแล้ว
 */
const MAX_LOGS = 50

function getStorage(): Storage | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null
    // ทดสอบเขียนจริง เพราะโหมดส่วนตัวของบางเบราว์เซอร์จะโยน error ตอนเขียน
    const probe = '__teacher_probe__'
    window.localStorage.setItem(probe, '1')
    window.localStorage.removeItem(probe)
    return window.localStorage
  } catch {
    return null
  }
}

/** วันที่วันนี้เป็นเลข YYYYMMDD ใช้ให้ครูรู้ว่ารหัสมาจากคาบไหน */
export function todayNumber(now: Date = new Date()): number {
  return now.getFullYear() * 10_000 + (now.getMonth() + 1) * 100 + now.getDate()
}

/** อ่านผลของทุกคนที่เคยเล่นบนเครื่องนี้ */
export function loadLogs(): StudentLog[] {
  const storage = getStorage()
  if (!storage) return []
  try {
    const raw = storage.getItem(LOG_KEY)
    if (!raw) return []
    return raw
      .split('\n')
      .map((line) => decodeLog(line))
      .filter((result): result is { ok: true; log: StudentLog } => result.ok)
      .map((result) => result.log)
  } catch {
    return []
  }
}

function writeLogs(logs: readonly StudentLog[]): boolean {
  const storage = getStorage()
  if (!storage) return false
  try {
    storage.setItem(LOG_KEY, logs.slice(-MAX_LOGS).map(encodeLog).join('\n'))
    return true
  } catch {
    return false
  }
}

/** อ่านผลของเด็กคนหนึ่ง คืนสมุดเปล่าเมื่อยังไม่เคยเล่น */
export function loadLog(name: string, day: number = todayNumber()): StudentLog {
  const found = loadLogs().find((log) => log.name === name)
  return found ?? createLog(name, day)
}

/**
 * บันทึกผลของเด็กคนหนึ่ง ทับของเดิมที่ชื่อเดียวกัน
 *
 * ทับ ไม่ใช่บวกเพิ่ม เพราะผู้เรียกถือสมุดที่บวกมาแล้วอยู่ในมือ
 * ถ้าบวกซ้ำที่นี่อีก ทุกข้อจะถูกนับสองครั้ง
 */
export function saveLog(log: StudentLog): boolean {
  const others = loadLogs().filter((item) => item.name !== log.name)
  return writeLogs([...others, log])
}

/** รวมผลจากรหัสที่ครูวางเข้ามา เข้ากับที่มีอยู่แล้วในเครื่อง */
export function mergeIntoStorage(incoming: readonly StudentLog[]): StudentLog[] {
  const byName = new Map<string, StudentLog>()
  for (const log of [...loadLogs(), ...incoming]) {
    const existing = byName.get(log.name)
    byName.set(log.name, existing ? mergeLogs(existing, log) : log)
  }
  const merged = [...byName.values()]
  writeLogs(merged)
  return merged
}

/** ลบผลทั้งหมดในเครื่องนี้ ใช้ตอนครูขึ้นห้องใหม่ */
export function clearLogs(): void {
  const storage = getStorage()
  if (!storage) return
  try {
    storage.removeItem(LOG_KEY)
  } catch {
    // ลบไม่ได้ก็ไม่เป็นไร รายการใหม่จะทับของเดิมตอนบันทึกครั้งถัดไป
  }
}
