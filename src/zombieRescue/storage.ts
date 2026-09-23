/**
 * เก็บเกม ZOMBIE RESCUE ที่เล่นค้างไว้ในเครื่อง
 *
 * เหตุผลเดียวกับเมืองแห่งเวลา: เกมในห้องเรียนมักค้างเพราะหมดคาบหรือแบตหมด
 * เก็บแยกคีย์จากข้อมูลผู้เล่นหลัก และผูกกับชื่อผู้เล่น
 * เหรียญจริงจ่ายตอนจบเกมเท่านั้น การเล่นต่อจากเกมค้างจึงไม่เปิดช่องปั๊มเหรียญ
 */

import { parseSavedGame } from './engine'
import type { ZrState } from './engine'

const KEY = 'math-adventure:zombie:v1'

function getStorage(): Storage | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null
    return window.localStorage
  } catch {
    return null
  }
}

export function saveZombieGame(owner: string, state: ZrState): boolean {
  const storage = getStorage()
  if (!storage) return false
  try {
    storage.setItem(KEY, JSON.stringify({ owner, state }))
    return true
  } catch {
    return false
  }
}

/** อ่านเกมค้างของผู้เล่นคนนี้ คืน null เมื่อไม่มี ข้อมูลเสีย เป็นของคนอื่น หรือจบไปแล้ว */
export function loadZombieGame(owner: string): ZrState | null {
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
    return state && !state.cured ? state : null
  } catch {
    return null
  }
}

export function clearZombieGame(): void {
  const storage = getStorage()
  if (!storage) return
  try {
    storage.removeItem(KEY)
  } catch {
    // ลบไม่ได้ก็ไม่เป็นไร เกมใหม่จะบันทึกทับตอนเริ่มเล่นอยู่แล้ว
  }
}
