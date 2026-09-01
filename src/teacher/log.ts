/**
 * สมุดบันทึกผลรายตัวชี้วัดของเด็กหนึ่งคน
 *
 * เก็บแค่สองตัวเลขต่อหนึ่งตัวชี้วัด คือทำไปกี่ข้อ และถูกกี่ข้อ
 * ตั้งใจไม่เก็บว่าตอบอะไรไปบ้างหรือตอบตอนกี่โมง
 *
 * เหตุผลไม่ใช่เรื่องพื้นที่เก็บข้อมูล แต่เป็นเรื่องสิ่งที่ครูต้องใช้จริง
 * ครูที่ยืนอยู่หน้าห้องต้องการรู้ว่า "ตัวชี้วัดไหนที่ทั้งห้องยังไม่ผ่าน"
 * ซึ่งตอบได้จากสองตัวเลขนี้ ส่วนบันทึกรายข้อว่าเด็กพิมพ์อะไรลงไป
 * เป็นข้อมูลของเด็กที่ละเอียดเกินความจำเป็น และจะถูกคัดลอกไปมาในรหัส
 * ที่เด็กส่งต่อกันได้ จึงไม่ควรมีตั้งแต่แรก
 *
 * ทุกฟังก์ชันในไฟล์นี้ไม่แก้ของเดิม คืนของใหม่เสมอ
 * เพื่อให้ React เห็นว่าข้อมูลเปลี่ยน และให้ชุดทดสอบเทียบผลได้ตรงไปตรงมา
 */

import { INDICATOR_ORDER, findIndicator } from './indicators'
import type { IndicatorId } from './indicators'

export interface IndicatorTally {
  attempts: number
  correct: number
}

export interface StudentLog {
  /** ชื่อที่เด็กตั้งไว้ตอนสร้างตัวละคร ใช้เป็นตัวระบุคนในตารางของครู */
  name: string
  /** วันที่บันทึกครั้งล่าสุด เป็นเลข YYYYMMDD ใช้ให้ครูรู้ว่าเป็นผลของคาบไหน */
  day: number
  counts: Record<IndicatorId, IndicatorTally>
}

/** ระดับผลของตัวชี้วัดหนึ่งตัว ใช้เลือกสีในตาราง */
export type Mastery = 'none' | 'weak' | 'fair' | 'good'

/**
 * เกณฑ์ตัดระดับ
 *
 * ใช้เกณฑ์เดียวกับดาวของโหมดหลัก (60 / 70 / 90) ไม่ได้
 * เพราะที่นี่จำนวนข้อน้อยกว่ามาก เด็กที่ทำสองข้อถูกสองข้อ
 * ไม่ควรถูกนับว่า "ผ่านตัวชี้วัดนี้แล้ว" เท่ากับเด็กที่ทำสิบข้อถูกเก้าข้อ
 * จึงต้องมีจำนวนข้อขั้นต่ำก่อน ต่ำกว่านั้นถือว่ายังไม่มีข้อมูลพอ
 */
export const MIN_ATTEMPTS_FOR_MASTERY = 3
const GOOD = 0.8
const FAIR = 0.5

export function emptyCounts(): Record<IndicatorId, IndicatorTally> {
  const counts = {} as Record<IndicatorId, IndicatorTally>
  for (const id of INDICATOR_ORDER) counts[id] = { attempts: 0, correct: 0 }
  return counts
}

export function createLog(name: string, day: number): StudentLog {
  return { name, day, counts: emptyCounts() }
}

/** สัดส่วนข้อถูก คืน null เมื่อยังไม่เคยทำ เพื่อไม่ให้แสดงศูนย์เปอร์เซ็นต์ทั้งที่ยังไม่ได้ทำ */
export function accuracy(tally: IndicatorTally): number | null {
  if (tally.attempts <= 0) return null
  return tally.correct / tally.attempts
}

export function masteryOf(tally: IndicatorTally): Mastery {
  if (tally.attempts < MIN_ATTEMPTS_FOR_MASTERY) return 'none'
  const rate = tally.correct / tally.attempts
  if (rate >= GOOD) return 'good'
  if (rate >= FAIR) return 'fair'
  return 'weak'
}

/** บันทึกผลหนึ่งข้อ ตัวชี้วัดที่ไม่รู้จักจะถูกทิ้งเงียบ ๆ ไม่ทำให้เกมพัง */
export function recordAttempt(
  log: StudentLog,
  id: IndicatorId,
  isCorrect: boolean,
  day: number,
): StudentLog {
  if (!findIndicator(id)) return log
  const current = log.counts[id] ?? { attempts: 0, correct: 0 }
  return {
    name: log.name,
    day,
    counts: {
      ...log.counts,
      [id]: {
        attempts: current.attempts + 1,
        correct: current.correct + (isCorrect ? 1 : 0),
      },
    },
  }
}

/** รวมผลทุกตัวชี้วัดของคนหนึ่งคน ใช้แสดงคอลัมน์รวมท้ายตาราง */
export function totalsOf(log: StudentLog): IndicatorTally {
  let attempts = 0
  let correct = 0
  for (const id of INDICATOR_ORDER) {
    const tally = log.counts[id]
    if (!tally) continue
    attempts += tally.attempts
    correct += tally.correct
  }
  return { attempts, correct }
}

/**
 * รวมผลสองชุดของคนเดียวกัน
 *
 * เกิดขึ้นจริงเมื่อเด็กเล่นสองคาบแล้วส่งรหัสมาสองใบ
 * ครูควรได้ผลรวมของทั้งสองคาบ ไม่ใช่ต้องเลือกว่าจะเอาใบไหน
 */
export function mergeLogs(a: StudentLog, b: StudentLog): StudentLog {
  const counts = emptyCounts()
  for (const id of INDICATOR_ORDER) {
    const left = a.counts[id] ?? { attempts: 0, correct: 0 }
    const right = b.counts[id] ?? { attempts: 0, correct: 0 }
    counts[id] = {
      attempts: left.attempts + right.attempts,
      correct: left.correct + right.correct,
    }
  }
  return { name: a.name, day: Math.max(a.day, b.day), counts }
}

export interface ClassRow {
  indicator: IndicatorId
  tally: IndicatorTally
  /** จำนวนเด็กที่ทำตัวชี้วัดนี้ถึงเกณฑ์ขั้นต่ำแล้ว และอยู่ในระดับ good */
  passed: number
  /** จำนวนเด็กที่มีข้อมูลพอจะตัดสินได้ */
  assessed: number
}

/**
 * สรุปทั้งห้องรายตัวชี้วัด
 *
 * ตัวเลขที่ครูใช้ตัดสินใจว่าจะสอนซ้ำเรื่องไหน คือ passed เทียบกับ assessed
 * ไม่ใช่สัดส่วนข้อถูกรวมทั้งห้อง เพราะเด็กคนเดียวที่ทำไปสามสิบข้อ
 * จะดึงสัดส่วนรวมของทั้งห้องไปทางที่ตัวเองทำได้ ทั้งที่เป็นข้อมูลของคนเดียว
 */
export function summarizeClass(logs: readonly StudentLog[]): ClassRow[] {
  return INDICATOR_ORDER.map((indicator) => {
    let attempts = 0
    let correct = 0
    let passed = 0
    let assessed = 0
    for (const log of logs) {
      const tally = log.counts[indicator] ?? { attempts: 0, correct: 0 }
      attempts += tally.attempts
      correct += tally.correct
      if (tally.attempts >= MIN_ATTEMPTS_FOR_MASTERY) {
        assessed += 1
        if (masteryOf(tally) === 'good') passed += 1
      }
    }
    return { indicator, tally: { attempts, correct }, passed, assessed }
  })
}

/**
 * ตัวชี้วัดที่ควรสอนซ้ำ เรียงจากที่ควรสอนก่อน
 *
 * นับเฉพาะตัวชี้วัดของชั้น ป.4 ไม่รวมของทบทวนและของต่อยอด
 * เพราะครูวางแผนคาบหน้าจากตัวชี้วัดที่ต้องสอนตามหลักสูตร
 * ตัวต่อยอดที่เด็กทำไม่ได้ ไม่ใช่เรื่องที่ต้องสอนซ้ำ
 */
export function needsReteaching(rows: readonly ClassRow[]): ClassRow[] {
  return rows
    .filter((row) => {
      const meta = findIndicator(row.indicator)
      return meta !== null && meta.level === 'core' && row.assessed > 0
    })
    .filter((row) => row.passed / row.assessed < 0.7)
    .sort((a, b) => a.passed / a.assessed - b.passed / b.assessed)
}
