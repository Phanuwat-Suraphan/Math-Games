/**
 * โหมดฝึกวัดมุมพร้อมเฉลย
 *
 * เครื่องมือวัดมุมอย่างเดียวยังไม่ทำให้เด็กวัดเป็น เพราะไม่มีอะไรบอกว่าที่วัดมานั้นถูกไหม
 * เด็กที่วางครึ่งวงกลมผิดตั้งแต่แรกจะวัดผิดแบบเดิมทั้งคาบโดยไม่รู้ตัว
 * โหมดนี้สุ่มมุมมาให้วัด แล้วตรวจให้ทันทีว่าถูกหรือยัง
 *
 * ที่ตั้งใจที่สุดคือการจับ "อ่านสลับแถว" ของครึ่งวงกลม
 * ครึ่งวงกลมมีตัวเลขสองแถวสวนทางกัน เด็กที่อ่านแถวผิดจะได้ 180 ลบคำตอบจริงเสมอ
 * ความผิดพลาดนี้พบบ่อยที่สุดในห้องเรียน และถ้าบอกแค่ว่า "ผิด" เด็กจะไม่มีวันรู้ว่าพลาดตรงไหน
 *
 * ไฟล์นี้เป็นตรรกะล้วน ไม่แตะ React ชุดทดสอบจึงสุ่มข้อแทนเด็กได้เป็นร้อยข้อ
 */

import { normalizeDeg, pointAt } from './geo'
import type { Point } from './geo'

export interface PracticeLevel {
  id: string
  label: string
  /** คำตอบเป็นจำนวนเท่าของค่านี้ ระดับง่ายจึงได้เลขกลม ๆ อ่านง่าย */
  step: number
  min: number
  max: number
  /** คลาดเคลื่อนได้กี่องศาถึงยังนับว่าถูก */
  tolerance: number
}

export const PRACTICE_LEVELS: PracticeLevel[] = [
  { id: 'easy', label: 'ง่าย', step: 10, min: 20, max: 160, tolerance: 4 },
  { id: 'medium', label: 'กลาง', step: 5, min: 15, max: 175, tolerance: 3 },
  { id: 'hard', label: 'ยาก', step: 1, min: 10, max: 179, tolerance: 2 },
]

export function findLevel(id: string): PracticeLevel {
  return PRACTICE_LEVELS.find((level) => level.id === id) ?? PRACTICE_LEVELS[0]
}

export interface AngleQuestion {
  vertex: Point
  /** ทิศของแขนข้างแรก องศาแบบห้องเรียน ศูนย์คือทางขวา */
  start: number
  /** คำตอบจริงเป็นองศา */
  answer: number
  /** ความยาวแขน ยาวพอให้ครึ่งวงกลมทาบได้เต็ม */
  arm: number
}

export const ARM_LENGTH = 190

/**
 * สุ่มโจทย์หนึ่งข้อ
 *
 * รับตัวสุ่มเข้ามาแทนที่จะเรียก Math.random เอง ชุดทดสอบจึงบังคับค่าได้
 * แล้วตรวจได้ว่าคำตอบไม่มีวันหลุดออกนอกช่วงของระดับที่เลือก
 */
export function makeQuestion(level: PracticeLevel, random: () => number): AngleQuestion {
  const steps = Math.floor((level.max - level.min) / level.step) + 1
  const pick = Math.min(steps - 1, Math.floor(random() * steps))
  const answer = level.min + pick * level.step

  /*
   * แขนล่างเอียงได้นิดหน่อย ไม่ใช่แนวนอนเป๊ะทุกข้อ
   * เพราะถ้าแขนล่างนอนเสมอ เด็กจะอ่านมุมจากรูปร่างได้โดยไม่ต้องวางครึ่งวงกลมเลย
   */
  const tilt = Math.round((random() * 2 - 1) * 25)
  const start = normalizeDeg(tilt)

  /* วางจุดยอดค่อนไปทางซ้ายล่างของกระดาษ เพื่อให้แขนทั้งสองข้างมีที่ให้กางเต็ม */
  const vertex = {
    x: 260 + Math.round(random() * 200),
    y: 380 + Math.round(random() * 90),
  }
  return { vertex, start, answer, arm: ARM_LENGTH }
}

/** ปลายแขนทั้งสองข้างของโจทย์ */
export function armEnds(question: AngleQuestion): { a: Point; b: Point } {
  return {
    a: pointAt(question.vertex, question.arm, question.start),
    b: pointAt(question.vertex, question.arm, question.start + question.answer),
  }
}

export type Verdict = 'correct' | 'flipped' | 'close' | 'wrong'

export interface Judgement {
  verdict: Verdict
  /** ประโยคที่น้องวงเวียนพูด */
  say: string
}

/** มุมแหลม มุมฉาก หรือมุมป้าน ใช้ใบ้ตอนตอบผิดไกล */
export function angleFamily(deg: number): string {
  if (deg < 88) return 'มุมแหลม'
  if (deg <= 92) return 'มุมฉาก'
  if (deg < 180) return 'มุมป้าน'
  return 'มุมตรง'
}

/**
 * ตรวจคำตอบหนึ่งข้อ
 *
 * ลำดับการตรวจสำคัญ ต้องเช็ก "ถูก" ก่อน "อ่านสลับแถว" เสมอ
 * เพราะมุมใกล้ 90° ทั้งสองกรณีให้เลขเกือบเท่ากัน ถ้าเช็กสลับลำดับ
 * เด็กที่ตอบ 90° ถูกเป๊ะจะโดนบอกว่าอ่านผิดแถว ซึ่งทำให้เลิกเชื่อเครื่องตรวจไปเลย
 */
export function judgeAnswer(
  question: AngleQuestion,
  guess: number,
  level: PracticeLevel,
): Judgement {
  const off = Math.abs(guess - question.answer)
  if (off <= level.tolerance) {
    return {
      verdict: 'correct',
      say:
        off === 0
          ? `ถูกเป๊ะเลย ${question.answer}° เก่งมาก`
          : `ถูกต้อง คำตอบคือ ${question.answer}° ที่ตอบมาห่างแค่ ${off}° ถือว่าผ่าน`,
    }
  }

  const flipped = Math.abs(guess - (180 - question.answer))
  if (flipped <= level.tolerance) {
    return {
      verdict: 'flipped',
      say: `ใกล้มาก แต่อ่านสลับแถวของครึ่งวงกลมนะ ให้อ่านแถวที่เริ่มจาก 0 ตรงแขนล่าง คำตอบคือ ${question.answer}°`,
    }
  }

  if (off <= level.tolerance * 3) {
    return {
      verdict: 'close',
      say: `เกือบแล้ว ลองเลื่อนจุดกึ่งกลางของครึ่งวงกลมให้ตรงจุดยอดพอดีอีกที (ห่างอยู่ ${Math.round(off)}°)`,
    }
  }

  return {
    verdict: 'wrong',
    say: `ยังไม่ใช่นะ ใบ้ให้ว่ามุมนี้เป็น${angleFamily(question.answer)} ลองวัดใหม่อีกครั้ง`,
  }
}

/** ตอบถูกแล้วนับต่อ ตอบผิดเริ่มนับใหม่ */
export function nextStreak(streak: number, verdict: Verdict): number {
  return verdict === 'correct' ? streak + 1 : 0
}

/** คำชมตามจำนวนข้อที่ถูกติดกัน */
export function streakCheer(streak: number): string | null {
  if (streak >= 10) return 'สิบข้อติด! วัดมุมเก่งระดับครูแล้ว 🏆'
  if (streak >= 5) return 'ห้าข้อติดแล้ว เยี่ยมมาก ⭐'
  if (streak >= 3) return 'สามข้อติด กำลังมาเลย ✨'
  return null
}

/**
 * ตำแหน่งที่ควรวางครึ่งวงกลมให้ตอนเริ่มข้อใหม่
 *
 * วางจุดกึ่งกลางไว้ใกล้จุดยอดแต่ไม่ทับพอดี ตั้งใจให้เด็กต้องเลื่อนเอง
 * เพราะการเล็งจุดกึ่งกลางให้ตรงจุดยอดคือทักษะที่กำลังฝึกอยู่ ไม่ใช่สิ่งที่ควรทำให้ฟรี
 */
export function protractorStart(question: AngleQuestion): { center: Point; rotation: number } {
  return {
    center: { x: question.vertex.x + 70, y: question.vertex.y - 60 },
    rotation: 0,
  }
}
