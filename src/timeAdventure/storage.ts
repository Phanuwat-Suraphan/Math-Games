/**
 * เก็บเกมเมืองแห่งเวลาที่เล่นค้างไว้ในเครื่อง
 *
 * ในห้องเรียน เกมมักถูกทิ้งกลางทางเพราะหมดคาบ แท็บเล็ตแบตหมด
 * หรือเด็กกดกลับเมนูเพราะนึกว่าเป็นปุ่มอื่น
 * ถ้าไม่เก็บไว้ กลุ่มนั้นต้องเริ่มจาก START ใหม่ทั้งที่ใกล้ถึงปราสาทแล้ว
 *
 * เก็บแยกคีย์จากข้อมูลผู้เล่นหลักด้วยเหตุผลเดียวกับฟาร์ม
 * เกมค้างที่ข้อมูลเสียจะทำให้เสียแค่เกมนั้น ไม่ลามไปถึงเหรียญและด่านที่สะสมมา
 * และผูกกับชื่อผู้เล่น เพื่อไม่ให้เครื่องที่ใช้ร่วมกันเห็นเกมค้างของคนอื่น
 *
 * เหรียญจริงจ่ายตอนจบเกมเท่านั้น การเล่นต่อจากเกมค้างจึงไม่เปิดช่องปั๊มเหรียญ
 */

import { parseSavedGame } from './engine'
import type { TaState } from './engine'

const KEY = 'math-adventure:time:v1'

function getStorage(): Storage | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null
    return window.localStorage
  } catch {
    return null
  }
}

export function saveTimeGame(owner: string, state: TaState): boolean {
  const storage = getStorage()
  if (!storage) return false
  try {
    storage.setItem(KEY, JSON.stringify({ owner, state }))
    return true
  } catch {
    return false
  }
}

/** อ่านเกมค้างของผู้เล่นคนนี้ คืน null เมื่อไม่มี ข้อมูลเสีย หรือเป็นของคนอื่น */
export function loadTimeGame(owner: string): TaState | null {
  const storage = getStorage()
  if (!storage) return null
  try {
    const text = storage.getItem(KEY)
    if (!text) return null
    const raw: unknown = JSON.parse(text)
    if (typeof raw !== 'object' || raw === null) return null
    const record = raw as { owner?: unknown; state?: unknown }
    if (record.owner !== owner) return null
    const state = parseSavedGame(record.state)
    // เกมที่มีผู้ชนะแล้วคือเกมที่จบไปแล้ว ไม่ต้องเสนอให้เล่นต่อ
    return state && state.winner === null ? state : null
  } catch {
    return null
  }
}

export function clearTimeGame(): void {
  const storage = getStorage()
  if (!storage) return
  try {
    storage.removeItem(KEY)
  } catch {
    // ลบไม่ได้ก็ไม่เป็นไร เกมใหม่จะบันทึกทับตอนเริ่มเล่นอยู่แล้ว
  }
}
