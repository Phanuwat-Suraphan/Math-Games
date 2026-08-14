import type { Difficulty, Grade } from '../questionEngine/types'
import type { SkillId } from '../types/stats'

/**
 * ปริศนาคณิตศาสตร์
 *
 * ต่างจากโจทย์ปกติตรงที่ "คำตอบไม่ใช่จุดจบ" แต่เป็นกุญแจไปทำอย่างอื่นต่อ
 *
 *   โจทย์ปกติ   24 ÷ 6 = ?           ตอบ 4 แล้วจบ
 *   ปริศนา      ประตูมีรหัส 3 หลัก    ต้องแก้ 3 โจทย์เพื่อได้รหัสมาเปิดประตู
 *
 * ความต่างนี้สำคัญ เพราะทำให้เด็กรู้สึกว่าคณิตศาสตร์ "ใช้ทำอะไรได้"
 * ไม่ใช่แค่ตอบให้ถูกเพื่อได้คะแนน
 */

export type PuzzleKind =
  | 'numberLock'
  | 'missingNumber'
  | 'sequence'
  | 'balance'
  | 'fractionDoor'

/** ช่องหนึ่งช่องที่เด็กต้องเติม */
export interface PuzzleSlot {
  id: string
  /** โจทย์ที่ต้องแก้เพื่อให้ได้ค่าของช่องนี้ */
  clue: string
  answer: string
  /** ตัวเลือกให้เลือก ถ้าไม่มีแปลว่าต้องพิมพ์เอง */
  choices?: string[]
  hint?: string
}

export interface Puzzle {
  id: string
  kind: PuzzleKind
  /** ชื่อสิ่งที่ต้องแก้ เช่น ประตูหิน สะพานพัง */
  title: string
  /** เล่าว่าทำไมต้องแก้ปริศนานี้ */
  story: string
  /** คำสั่งว่าต้องทำอะไร */
  instruction: string

  slots: PuzzleSlot[]
  /** ข้อความตอนแก้สำเร็จ บอกว่าเกิดอะไรขึ้นในโลกของเกม */
  successText: string

  skill: SkillId
  difficulty: Difficulty
  grade: Grade
  emoji: string
}

/** ความคืบหน้าของการแก้ปริศนาหนึ่งอัน */
export interface PuzzleProgress {
  puzzleId: string
  /** คำตอบที่เด็กใส่ไปแล้ว เรียงตรงกับ slots */
  filled: (string | null)[]
  /** ช่องที่เคยตอบผิด ใช้ให้กำลังใจ ไม่ใช่ลงโทษ */
  mistakes: number
  hintsUsed: number
  solved: boolean
}
