/**
 * กระดาษวาดหนึ่งแผ่น พร้อมประวัติการย้อนกลับ
 *
 * แยกออกมาเป็นตัวลดสถานะล้วน ๆ ไม่ใช่ useState กระจายอยู่ในหน้าจอ
 * เพราะปุ่มย้อนกลับคือสิ่งที่เด็กกดบ่อยที่สุดเวลาวาดพลาด
 * ถ้ามันพังหรือย้อนข้ามขั้น เด็กจะเลิกกล้าลองวาด ซึ่งเสียทั้งคาบ
 * ตรรกะอยู่ในไฟล์เดียวแบบนี้ ชุดทดสอบจึงกดย้อนกลับซ้ำ ๆ แทนเด็กได้
 */

import type { Shape } from './shapes'

export interface Board {
  shapes: Shape[]
  past: Shape[][]
  future: Shape[][]
}

export const EMPTY_BOARD: Board = { shapes: [], past: [], future: [] }

/** เก็บประวัติไว้เท่านี้ก็พอสำหรับหนึ่งคาบเรียน และไม่กินหน่วยความจำ */
export const HISTORY_LIMIT = 40

export type BoardAction =
  /** วางรูปใหม่ลงกระดาษ */
  | { type: 'add'; shape: Shape }
  /** ลบรูปที่ระบุ */
  | { type: 'remove'; id: string }
  /** จดประวัติไว้ก่อนเริ่มลากย้าย เพื่อให้การลากหนึ่งครั้งย้อนกลับได้ครั้งเดียว */
  | { type: 'mark' }
  /** เปลี่ยนรูประหว่างลาก ไม่จดประวัติเพิ่ม */
  | { type: 'live'; shapes: Shape[] }
  /** เอางานที่บันทึกไว้กลับมา เริ่มประวัติใหม่หมด */
  | { type: 'restore'; shapes: Shape[] }
  | { type: 'undo' }
  | { type: 'redo' }
  | { type: 'clear' }

function remember(board: Board, shapes: Shape[]): Board {
  return {
    shapes,
    past: [...board.past, board.shapes].slice(-HISTORY_LIMIT),
    future: [],
  }
}

export function boardReducer(board: Board, action: BoardAction): Board {
  switch (action.type) {
    case 'add':
      return remember(board, [...board.shapes, action.shape])

    case 'remove': {
      const next = board.shapes.filter((shape) => shape.id !== action.id)
      /* จิ้มพลาดโดนที่ว่าง ไม่ควรกินประวัติไปหนึ่งช่อง */
      return next.length === board.shapes.length ? board : remember(board, next)
    }

    case 'mark':
      return {
        shapes: board.shapes,
        past: [...board.past, board.shapes].slice(-HISTORY_LIMIT),
        future: [],
      }

    case 'live':
      return { ...board, shapes: action.shapes }

    case 'restore':
      /*
       * ประวัติเริ่มใหม่ ไม่สืบทอดจากคาบก่อน
       * ถ้าให้ย้อนกลับข้ามคาบได้ เด็กที่กดย้อนกลับรัว ๆ ตอนเปิดหน้า
       * จะเห็นงานของเมื่อวานค่อย ๆ หายไปทีละชิ้นโดยไม่เข้าใจว่าเกิดอะไรขึ้น
       */
      return { shapes: action.shapes, past: [], future: [] }

    case 'undo': {
      if (board.past.length === 0) return board
      const previous = board.past[board.past.length - 1]
      return {
        shapes: previous,
        past: board.past.slice(0, -1),
        future: [board.shapes, ...board.future].slice(0, HISTORY_LIMIT),
      }
    }

    case 'redo': {
      if (board.future.length === 0) return board
      const [next, ...rest] = board.future
      return {
        shapes: next,
        past: [...board.past, board.shapes].slice(-HISTORY_LIMIT),
        future: rest,
      }
    }

    case 'clear':
      return board.shapes.length === 0 ? board : remember(board, [])

    default:
      return board
  }
}

export function canUndo(board: Board): boolean {
  return board.past.length > 0
}

export function canRedo(board: Board): boolean {
  return board.future.length > 0
}
