/**
 * การบันทึกฟาร์มลงเครื่อง
 *
 * เก็บเป็น "รหัสฟาร์ม" ชุดเดียวกับที่เด็กคัดลอกไปวางเครื่องอื่นได้
 * ไม่ได้เก็บเป็น JSON แยกอีกรูปแบบหนึ่ง ซึ่งเป็นการตัดสินใจที่ตั้งใจ
 *
 * ข้อดีคือมีรูปแบบเดียวและมีตัวตรวจตัวเดียว รหัสที่พังเพราะ localStorage เสีย
 * กับรหัสที่พังเพราะเด็กคัดลอกมาไม่ครบ เดินผ่านโค้ดเส้นเดียวกัน
 * ซึ่งเป็นเส้นที่มีชุดทดสอบยิงข้อความมั่ว ๆ ใส่แล้ว
 * ถ้าแยกเป็นสองรูปแบบ เส้นที่ใช้บ่อยกว่าจะได้รับการทดสอบดีกว่าเสมอ
 * แล้ววันที่อีกเส้นพัง จะพังเงียบ ๆ ตอนเด็กกำลังจะกู้ฟาร์มคืนพอดี
 *
 * เก็บแยกจากข้อมูลผู้เล่นหลัก (math-adventure:player:v1) โดยตั้งใจ
 * เอกสารออกแบบเสนอให้ขยับเวอร์ชันข้อมูลผู้เล่นเป็น 9 แล้วใส่ฟาร์มเข้าไป
 * แต่การแยกคีย์ปลอดภัยกว่า เพราะฟาร์มที่ข้อมูลเสียจะทำให้เสียแค่ฟาร์ม
 * ไม่ลามไปทำให้ด่าน ดาว และเหรียญที่เด็กสะสมมาทั้งหมดหายไปด้วย
 */

import { decodeFarm, encodeFarm } from './save'
import type { FarmState } from './types'

const FARM_KEY = 'math-adventure:farm:v1'

function getStorage(): Storage | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null
    // ทดสอบเขียนจริง เพราะโหมดส่วนตัวของบางเบราว์เซอร์จะโยน error ตอนเขียน
    const probe = '__farm_probe__'
    window.localStorage.setItem(probe, '1')
    window.localStorage.removeItem(probe)
    return window.localStorage
  } catch {
    return null
  }
}

/** บันทึกฟาร์ม คืน false เมื่อเขียนไม่ได้ เพื่อให้หน้าจอเตือนเด็กได้ */
export function saveFarm(farm: FarmState): boolean {
  const storage = getStorage()
  if (!storage) return false
  try {
    storage.setItem(FARM_KEY, encodeFarm(farm))
    return true
  } catch {
    return false
  }
}

/** อ่านฟาร์มที่บันทึกไว้ คืน null เมื่อไม่มีหรืออ่านไม่ได้ */
export function loadFarm(): FarmState | null {
  const storage = getStorage()
  if (!storage) return null
  try {
    const code = storage.getItem(FARM_KEY)
    if (!code) return null
    const result = decodeFarm(code)
    return result.ok ? result.farm : null
  } catch {
    return null
  }
}

/** ลบฟาร์มที่บันทึกไว้ ใช้ตอนเริ่มฟาร์มใหม่ */
export function clearFarm(): void {
  const storage = getStorage()
  if (!storage) return
  try {
    storage.removeItem(FARM_KEY)
  } catch {
    // เขียนไม่ได้ก็ไม่เป็นไร ฟาร์มใหม่จะทับของเดิมตอนบันทึกครั้งถัดไปอยู่แล้ว
  }
}

/** มีฟาร์มที่เล่นค้างไว้ไหม ใช้ตัดสินว่าจะแสดงปุ่ม "เล่นต่อ" หรือไม่ */
export function hasSavedFarm(): boolean {
  return loadFarm() !== null
}
