import type { Puzzle, PuzzleProgress } from './types'
import { isAnswerCorrect } from '../questionEngine/answerCheck'

/**
 * ตรรกะการแก้ปริศนา
 *
 * เป็น pure function ทั้งหมดเหมือนระบบอื่นในเกม
 * หน้าจอมีหน้าที่แค่แสดงผลและส่งคำตอบเข้ามา
 *
 * แนวคิดการสอน: ตอบผิดในปริศนาไม่ทำให้แพ้
 * เด็กลองได้เรื่อย ๆ จนกว่าจะถูก แต่เรานับจำนวนครั้งไว้ให้ครูดู
 * เพราะเป้าหมายคือให้แก้ปัญหาได้ ไม่ใช่ทำให้กลัวการลองผิด
 */

export function createPuzzleProgress(puzzle: Puzzle): PuzzleProgress {
  return {
    puzzleId: puzzle.id,
    filled: puzzle.slots.map(() => null),
    mistakes: 0,
    hintsUsed: 0,
    solved: false,
  }
}

/**
 * เทียบคำตอบของช่องหนึ่ง
 *
 * เดิมเทียบข้อความตรง ๆ ซึ่งใช้ได้เพราะทุกช่องเป็นปุ่มให้กด
 * ข้อความที่เทียบจึงเป็นข้อความที่เราสร้างเองทั้งสองฝั่ง
 *
 * ตอนนี้ช่องระดับยากให้เด็กพิมพ์เอง ข้อความจะไม่มีทางตรงกันเป๊ะ
 * เด็กพิมพ์ 0.50 ในขณะที่เฉลยคือ 0.5 หรือพิมพ์ 2/4 ในขณะที่เฉลยคือ 1/2
 * ทั้งสองกรณีคือคำตอบที่ถูก และการตอบว่าผิดคือความผิดของเรา ไม่ใช่ของเด็ก
 */
export function isSlotCorrect(puzzle: Puzzle, index: number, value: string): boolean {
  const slot = puzzle.slots[index]
  if (!slot) return false
  return isAnswerCorrect(value, slot.answer)
}

export interface FillOutcome {
  progress: PuzzleProgress
  correct: boolean
  /** แก้ครบทุกช่องแล้วในครั้งนี้ */
  justSolved: boolean
}

/**
 * ใส่คำตอบลงช่องหนึ่ง
 *
 * ตอบถูกจะล็อกช่องนั้นไว้ ตอบผิดจะนับไว้แต่ไม่ล็อก เด็กลองต่อได้
 * คืน null ถ้าปริศนาแก้เสร็จแล้วหรือช่องนั้นไม่มีอยู่ กันการยิงซ้ำ
 */
export function fillSlot(
  puzzle: Puzzle,
  progress: PuzzleProgress,
  index: number,
  value: string,
): FillOutcome | null {
  if (progress.solved) return null
  if (index < 0 || index >= puzzle.slots.length) return null
  // ช่องที่ตอบถูกแล้วห้ามแก้ซ้ำ ไม่งั้นเด็กจะเผลอลบคำตอบที่ถูกทิ้ง
  if (progress.filled[index] !== null) return null

  const correct = isSlotCorrect(puzzle, index, value)

  if (!correct) {
    return {
      progress: { ...progress, mistakes: progress.mistakes + 1 },
      correct: false,
      justSolved: false,
    }
  }

  const filled = [...progress.filled]
  filled[index] = value.trim()

  const solved = filled.every((entry) => entry !== null)

  return {
    progress: { ...progress, filled, solved },
    correct: true,
    justSolved: solved,
  }
}

/** เปิดคำใบ้ของช่องหนึ่ง นับไว้ให้ครูดูว่าเด็กพึ่งคำใบ้แค่ไหน */
export function useHint(progress: PuzzleProgress): PuzzleProgress {
  return { ...progress, hintsUsed: progress.hintsUsed + 1 }
}

/** ช่องถัดไปที่ยังไม่ได้ตอบ คืน -1 ถ้าครบแล้ว */
export function nextOpenSlot(progress: PuzzleProgress): number {
  return progress.filled.findIndex((entry) => entry === null)
}

/** ความคืบหน้าเป็นร้อยละ ใช้แสดงแถบความคืบหน้า */
export function puzzlePercent(progress: PuzzleProgress): number {
  if (progress.filled.length === 0) return 0
  const done = progress.filled.filter((entry) => entry !== null).length
  return Math.round((done / progress.filled.length) * 100)
}

/**
 * รหัสที่ประกอบจากคำตอบทุกช่อง ใช้กับล็อกรหัสตัวเลข
 * ช่องที่ยังไม่ตอบแสดงเป็นขีด เด็กจึงเห็นว่าเหลืออีกกี่ช่อง
 */
export function assembledCode(progress: PuzzleProgress): string {
  return progress.filled.map((entry) => entry ?? '—').join(' ')
}

export interface PuzzleReward {
  exp: number
  coins: number
}

/**
 * รางวัลของปริศนา
 *
 * ตอบผิดหลายครั้งได้รางวัลน้อยลงเล็กน้อย แต่ไม่เคยเป็นศูนย์
 * และเปิดคำใบ้ไม่หักรางวัลเลย ตามหลักเดียวกับ Part 4
 * เพราะเราอยากให้เด็กกล้าขอความช่วยเหลือมากกว่ากลัวเสียคะแนน
 */
export const PUZZLE_REWARD = {
  baseExp: 25,
  baseCoins: 12,
  /** หักต่อการตอบผิดหนึ่งครั้ง */
  expPenaltyPerMistake: 2,
  /** ไม่ว่าผิดกี่ครั้งก็ยังได้อย่างน้อยเท่านี้ */
  minExp: 10,
  minCoins: 5,
} as const

export function puzzleReward(progress: PuzzleProgress): PuzzleReward {
  if (!progress.solved) return { exp: 0, coins: 0 }

  const penalty = progress.mistakes * PUZZLE_REWARD.expPenaltyPerMistake
  return {
    exp: Math.max(PUZZLE_REWARD.minExp, PUZZLE_REWARD.baseExp - penalty),
    coins: Math.max(PUZZLE_REWARD.minCoins, PUZZLE_REWARD.baseCoins - Math.floor(penalty / 2)),
  }
}
