/**
 * ต่อการตอบโจทย์ในเกมเข้ากับสมุดบันทึกรายตัวชี้วัดของครู
 *
 * ทำไมไม่ดักที่ event bus ซึ่งมี QUESTION_ANSWERED ผ่านอยู่แล้ว
 *
 * เพราะเหตุการณ์นั้นบอกได้แค่ทักษะกว้าง ๆ อย่าง addition กับ wordProblems
 * ส่วนตัวชี้วัดต้องรู้ว่าเป็นโจทย์ข้อไหนของโหมดไหน ซึ่งรู้ได้เฉพาะที่หน้าจอนั้น
 * ทางเลือกอีกทางคือแกะจาก questionId ที่เป็นข้อความอย่าง safezone-mission-water
 * แต่นั่นคือการผูกความหมายไว้กับรูปแบบของสตริง ซึ่งจะพังเงียบ ๆ
 * ในวันที่มีคนเปลี่ยนชื่อ id โดยไม่รู้ว่ามีใครอ่านมันอยู่
 *
 * จึงให้หน้าจอบอกตัวชี้วัดมาตรง ๆ เป็นค่าที่ TypeScript ตรวจได้
 * แลกกับการต้องแก้จุดที่เรียกสามจุด ซึ่งน้อยกว่าราคาของบั๊กเงียบ
 */

import { useCallback, useRef } from 'react'
import { encodeLog } from '../teacher/code'
import type { IndicatorId } from '../teacher/indicators'
import { recordAttempt } from '../teacher/log'
import type { StudentLog } from '../teacher/log'
import { loadLog, saveLog, todayNumber } from '../teacher/storage'

export interface UseIndicatorLogResult {
  /** บันทึกผลหนึ่งข้อ เรียกได้จากทุกจุดที่เด็กตอบจริง */
  logIndicator: (id: IndicatorId, isCorrect: boolean) => void
  /** รหัสผลการเรียนล่าสุดของเด็กคนนี้ ใช้แสดงให้คัดลอกท้ายคาบ */
  currentCode: () => string
}

export function useIndicatorLog(playerName: string): UseIndicatorLogResult {
  /*
   * เก็บสมุดไว้ใน ref ไม่ใช่ state โดยตั้งใจ
   *
   * ตัวเลขชุดนี้ไม่มีอะไรบนจอที่ต้องวาดใหม่ตอนมันเปลี่ยน
   * ถ้าใช้ state จะทำให้ฉากสามมิติทั้งฉากถูกวาดใหม่ทุกครั้งที่เด็กตอบหนึ่งข้อ
   * ซึ่งเป็นค่าใช้จ่ายที่จ่ายไปโดยไม่ได้อะไรกลับมาเลย
   */
  const logRef = useRef<StudentLog | null>(null)

  const ensure = useCallback((): StudentLog => {
    const current = logRef.current
    if (current && current.name === playerName) return current
    const loaded = loadLog(playerName)
    logRef.current = loaded
    return loaded
  }, [playerName])

  const logIndicator = useCallback(
    (id: IndicatorId, isCorrect: boolean) => {
      const next = recordAttempt(ensure(), id, isCorrect, todayNumber())
      logRef.current = next
      saveLog(next)
    },
    [ensure],
  )

  const currentCode = useCallback(() => encodeLog(ensure()), [ensure])

  return { logIndicator, currentCode }
}
