/**
 * ตัวตัดสินถูกผิดของมินิเกม
 *
 * แยกออกจากหน้าจอโดยตั้งใจ
 * ถ้าปล่อยให้แต่ละหน้าจอตัดสินเอง สี่เกมจะมีนิยามคำว่า "ถูก" คนละแบบ
 * และเวลาแก้บั๊กต้องไล่แก้สี่ที่
 *
 * ทุกฟังก์ชันเป็นฟังก์ชันบริสุทธิ์ ไม่เก็บสถานะไว้ข้างใน
 */

import type {
  CatchGame,
  ConnectGame,
  DragDropGame,
  MatchingGame,
  MinigameResult,
} from './types'

/** สองใบนี้เป็นคู่กันไหม */
export function isMatchingPair(
  game: MatchingGame,
  firstCardId: string,
  secondCardId: string,
): boolean {
  if (firstCardId === secondCardId) return false
  const first = game.cards.find((card) => card.id === firstCardId)
  const second = game.cards.find((card) => card.id === secondCardId)
  if (!first || !second) return false
  // ต้องเป็นโจทย์คู่กับคำตอบ ไม่ใช่โจทย์คู่โจทย์
  if (first.side === second.side) return false
  return first.pairId === second.pairId
}

/** เส้นที่ลากจากซ้ายไปขวาเส้นนี้ถูกไหม */
export function isConnectionCorrect(
  game: ConnectGame,
  leftId: string,
  rightId: string,
): boolean {
  return game.solution[leftId] === rightId
}

/** โยงครบและถูกทุกเส้นหรือยัง */
export function isConnectComplete(
  game: ConnectGame,
  links: Readonly<Record<string, string>>,
): boolean {
  const expected = Object.keys(game.solution)
  return expected.every((leftId) => links[leftId] === game.solution[leftId])
}

/** แผ่นที่วางในช่องนี้ถูกไหม */
export function isDropCorrect(
  game: DragDropGame,
  slotId: string,
  tileId: string,
): boolean {
  const slot = game.slots.find((entry) => entry.id === slotId)
  return slot ? slot.correctTileId === tileId : false
}

/**
 * วางครบทุกช่องและถูกหมดหรือยัง
 *
 * รับกรณีที่สลับที่กันได้ด้วย เช่น 3 + 5 กับ 5 + 3
 * ถ้าเครื่องหมายเป็นบวกหรือคูณ การสลับที่ให้ผลเท่ากัน
 * ตัดสินว่าผิดทั้งที่ผลลัพธ์ถูก จะทำให้เด็กงงว่าตัวเองผิดตรงไหน
 */
export function isDragDropComplete(
  game: DragDropGame,
  placements: Readonly<Record<string, string>>,
): boolean {
  const allFilled = game.slots.every((slot) => Boolean(placements[slot.id]))
  if (!allFilled) return false

  const exact = game.slots.every(
    (slot) => placements[slot.id] === slot.correctTileId,
  )
  if (exact) return true

  const commutative = game.template.includes('+') || game.template.includes('×')
  if (!commutative) return false

  const placed = game.slots
    .map((slot) => placements[slot.id])
    .filter((tileId): tileId is string => Boolean(tileId))
  if (new Set(placed).size !== placed.length) return false

  const expected = game.slots.map((slot) => slot.correctTileId)
  return [...placed].sort().join('|') === [...expected].sort().join('|')
}

/**
 * ตะกร้ารับชิ้นนี้ได้ไหม
 *
 * เทียบด้วยระยะห่างของจุดกึ่งกลาง ไม่ใช่การซ้อนทับแบบเป๊ะ
 * เพราะนิ้วเด็กเลื่อนไม่ละเอียดเท่าเมาส์ ถ้าเข้มไปจะรู้สึกว่าเกมโกง
 * ทุกค่าเป็นสัดส่วน 0–1 ของความกว้างจอ จอเล็กจอใหญ่จึงเล่นยากเท่ากัน
 */
export function isCaught(
  basketCenter: number,
  itemLane: number,
  basketHalfWidth = 0.12,
): boolean {
  return Math.abs(basketCenter - itemLane) <= basketHalfWidth
}

/** เล่นเกมรับของจบแล้วผ่านไหม */
export function isCatchCleared(
  game: CatchGame,
  caughtCorrect: number,
  caughtWrong: number,
): boolean {
  return caughtCorrect >= game.targetCatches && caughtWrong <= game.allowedMistakes
}

/**
 * แปลงผลการเล่นเป็นตัวเลขที่ระบบรางวัลกับสถิติทักษะใช้ได้
 *
 * ตั้งใจให้ทุกมินิเกมส่งค่าออกมาหน้าตาเดียวกัน
 * หน้าผลลัพธ์กับ rewardService จึงไม่ต้องรู้ว่าเด็กเพิ่งเล่นเกมแบบไหนมา
 */
export function summarizeResult(
  kind: MinigameResult['kind'],
  correct: number,
  wrong: number,
  cleared: boolean,
  secondsUsed: number,
): MinigameResult {
  return {
    kind,
    correct: Math.max(0, Math.round(correct)),
    wrong: Math.max(0, Math.round(wrong)),
    cleared,
    secondsUsed: Math.max(0, Math.round(secondsUsed)),
  }
}
