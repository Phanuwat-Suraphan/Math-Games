/**
 * การสุ่มเขาวงกตซากเมือง
 *
 * เขาวงกตที่ดีสำหรับเด็ก ป.4 ไม่ใช่เขาวงกตที่ยากที่สุด
 * แต่เป็นเขาวงกตที่ "หลงได้แต่ไม่จนมุม" งานหลักของไฟล์นี้จึงมีสองส่วน
 * ส่วนแรกคือขุดทางเดินให้ทั่วถึงด้วยวิธีถอยหลังกลับ (recursive backtracker)
 * ส่วนที่สองคือทุบกำแพงบางส่วนทิ้งเพื่อทำทางลัดวนกลับ
 *
 * ส่วนที่สองสำคัญกว่าที่คิด เขาวงกตแบบขุดล้วนมีทางเดินเดียวระหว่างสองจุดเสมอ
 * แปลว่าเดินผิดทางทีหนึ่งต้องเดินย้อนกลับมาทั้งเส้น ซึ่งกับหลอดความร้อนที่เดินอยู่
 * กลายเป็นการลงโทษที่หนักเกินกว่าความผิดพลาด และไม่ได้สอนอะไรเลย
 */

import { createRng } from '../math/rng'
import type { Rng } from '../math/rng'
import {
  MAZE_COLS,
  MAZE_ROWS,
  SURVIVAL_ITEMS,
  cellCenterX,
  cellCenterZ,
  wallAt,
} from './types'
import type { Cell, ItemState, Maze, SurvivalItemId } from './types'

/** ทิศทั้งสี่ ก้าวทีละสองช่องเพราะช่องคู่เป็นกำแพงระหว่างห้อง */
const STEPS: readonly Cell[] = [
  { col: 0, row: -2 },
  { col: 2, row: 0 },
  { col: 0, row: 2 },
  { col: -2, row: 0 },
]

function index(cols: number, col: number, row: number): number {
  return row * cols + col
}

/** ขุดทางเดินให้ทั่วทั้งตาราง คืนตารางที่ยังเป็นเขาวงกตทางเดียว */
function carve(walls: boolean[], cols: number, rows: number, rng: Rng): void {
  const start: Cell = { col: 1, row: 1 }
  walls[index(cols, start.col, start.row)] = false

  /*
   * ใช้กองซ้อน (stack) แทนการเรียกฟังก์ชันซ้อนตัวเอง
   * เพราะตารางขนาดใหญ่ทำให้การเรียกซ้อนลึกเกินขีดจำกัดของเบราว์เซอร์ได้
   * และเมื่อเกินแล้วอาการคือหน้าขาวเปล่า ไม่ใช่ข้อความบอกว่าเขาวงกตพัง
   */
  const stack: Cell[] = [start]
  while (stack.length > 0) {
    const current = stack[stack.length - 1] as Cell
    const options = rng.shuffle(STEPS).filter((step) => {
      const col = current.col + step.col
      const row = current.row + step.row
      if (col < 1 || row < 1 || col >= cols - 1 || row >= rows - 1) return false
      return walls[index(cols, col, row)] === true
    })

    const step = options[0]
    if (!step) {
      stack.pop()
      continue
    }

    const col = current.col + step.col
    const row = current.row + step.row
    // ทุบทั้งห้องปลายทางและกำแพงที่คั่นอยู่ตรงกลาง
    walls[index(cols, col, row)] = false
    walls[index(cols, current.col + step.col / 2, current.row + step.row / 2)] = false
    stack.push({ col, row })
  }
}

/**
 * ทุบกำแพงเพิ่มเพื่อทำทางวน
 *
 * เลือกเฉพาะกำแพงที่คั่นระหว่างทางเดินสองฝั่งพอดี ไม่ทุบกำแพงขอบนอก
 * ถ้าทุบขอบนอก ผู้เล่นจะเดินหลุดออกไปนอกฉากแล้วเห็นแต่ทะเลทรายว่างเปล่า
 */
function openShortcuts(walls: boolean[], cols: number, rows: number, rng: Rng): void {
  for (let row = 1; row < rows - 1; row += 1) {
    for (let col = 1; col < cols - 1; col += 1) {
      if (!walls[index(cols, col, row)]) continue

      const horizontal =
        !walls[index(cols, col - 1, row)] && !walls[index(cols, col + 1, row)]
      const vertical =
        !walls[index(cols, col, row - 1)] && !walls[index(cols, col, row + 1)]
      if (!horizontal && !vertical) continue

      // หนึ่งในห้า มากกว่านี้เขาวงกตจะกลายเป็นลานโล่งที่ไม่ต้องหาทางเลย
      if (rng.chance(0.2)) walls[index(cols, col, row)] = false
    }
  }
}

/** ช่องที่เดินได้ทั้งหมด */
export function openCells(maze: Maze): Cell[] {
  const cells: Cell[] = []
  for (let row = 0; row < maze.rows; row += 1) {
    for (let col = 0; col < maze.cols; col += 1) {
      if (!wallAt(maze, col, row)) cells.push({ col, row })
    }
  }
  return cells
}

/**
 * ระยะทางเดินจริงจากช่องเริ่มต้นไปทุกช่อง (ค้นตามความกว้าง)
 *
 * ใช้ระยะทางเดินจริง ไม่ใช่ระยะเส้นตรง เพราะสองช่องที่อยู่ติดกันบนแผนที่
 * อาจต้องเดินอ้อมครึ่งเขาวงกตถึงจะถึงกัน ถ้าวางไอเทมด้วยระยะเส้นตรง
 * ไอเทมที่ดู "ใกล้" อาจกลายเป็นไอเทมที่ไกลที่สุดจริง ๆ
 */
export function walkDistances(maze: Maze, from: Cell): Map<string, number> {
  const key = (cell: Cell): string => `${cell.col},${cell.row}`
  const distances = new Map<string, number>()
  if (wallAt(maze, from.col, from.row)) return distances

  distances.set(key(from), 0)
  const queue: Cell[] = [from]
  let head = 0
  while (head < queue.length) {
    const current = queue[head] as Cell
    head += 1
    const distance = distances.get(key(current)) ?? 0

    const neighbours: Cell[] = [
      { col: current.col, row: current.row - 1 },
      { col: current.col + 1, row: current.row },
      { col: current.col, row: current.row + 1 },
      { col: current.col - 1, row: current.row },
    ]
    for (const neighbour of neighbours) {
      if (wallAt(maze, neighbour.col, neighbour.row)) continue
      if (distances.has(key(neighbour))) continue
      distances.set(key(neighbour), distance + 1)
      queue.push(neighbour)
    }
  }
  return distances
}

/**
 * เลือกช่องที่กระจายห่างกัน
 *
 * ไล่ผ่อนเงื่อนไขระยะห่างลงเรื่อย ๆ แทนที่จะยอมแพ้เมื่อหาไม่ครบ
 * เพราะเขาวงกตที่สุ่มมาบางอันแคบกว่าอันอื่นจริง ๆ และการคืนรายการไม่ครบ
 * แปลว่าเกมจะขาดไอเทมไปหนึ่งชิ้นโดยที่ไม่มีอะไรฟ้อง
 */
function spreadOut(
  candidates: readonly Cell[],
  count: number,
  minimumGap: number,
): Cell[] {
  for (let gap = minimumGap; gap >= 0; gap -= 1) {
    const chosen: Cell[] = []
    for (const cell of candidates) {
      const tooClose = chosen.some(
        (other) =>
          Math.abs(other.col - cell.col) + Math.abs(other.row - cell.row) < gap,
      )
      if (tooClose) continue
      chosen.push(cell)
      if (chosen.length === count) return chosen
    }
    if (chosen.length === count) return chosen
  }
  return candidates.slice(0, count)
}

/** สร้างเขาวงกตหนึ่งอันจาก seed เดิม seed เดิมได้เขาวงกตเดิมเสมอ */
export function generateMaze(seed: string): Maze {
  const rng = createRng(`safezone-maze-${seed}`)
  const cols = MAZE_COLS
  const rows = MAZE_ROWS
  const walls = new Array<boolean>(cols * rows).fill(true)

  carve(walls, cols, rows, rng)
  openShortcuts(walls, cols, rows, rng)

  const start: Cell = { col: 1, row: 1 }
  const base: Maze = {
    cols,
    rows,
    walls,
    start,
    // เติมค่าชั่วคราวก่อน เพราะการเลือกตำแหน่งต้องใช้ตัวเขาวงกตที่สร้างเสร็จแล้ว
    itemCells: { oxygen: start, water: start, seed: start },
    coolerCells: [],
  }

  const distances = walkDistances(base, start)
  const reachable = openCells(base).filter((cell) =>
    distances.has(`${cell.col},${cell.row}`),
  )
  const farthest = reachable.reduce(
    (best, cell) => Math.max(best, distances.get(`${cell.col},${cell.row}`) ?? 0),
    0,
  )

  /*
   * ไอเทมต้องอยู่ไกลพอที่จะต้องออกสำรวจจริง
   * ครึ่งหนึ่งของระยะที่ไกลที่สุดคือเส้นแบ่งที่ทำให้ทั้งสามชิ้น
   * อยู่คนละมุมของเขาวงกตโดยไม่ต้องกำหนดมุมไว้ตายตัว
   */
  const itemCandidates = rng.shuffle(
    reachable.filter(
      (cell) => (distances.get(`${cell.col},${cell.row}`) ?? 0) >= farthest * 0.5,
    ),
  )
  const itemCells = spreadOut(itemCandidates, SURVIVAL_ITEMS.length, 10)

  const taken = new Set(itemCells.map((cell) => `${cell.col},${cell.row}`))
  taken.add(`${start.col},${start.row}`)
  const coolerCandidates = rng.shuffle(
    reachable.filter((cell) => {
      if (taken.has(`${cell.col},${cell.row}`)) return false
      const distance = distances.get(`${cell.col},${cell.row}`) ?? 0
      // ไม่วางติดจุดเริ่มต้น ที่พักที่อยู่ตรงหน้าตั้งแต่ต้นไม่มีค่าอะไร
      return distance >= 4
    }),
  )
  const coolerCells = spreadOut(coolerCandidates, 5, 6)

  return {
    ...base,
    itemCells: {
      oxygen: itemCells[0] ?? start,
      water: itemCells[1] ?? start,
      seed: itemCells[2] ?? start,
    },
    coolerCells,
  }
}

/** แปลงตำแหน่งไอเทมบนตารางเป็นสถานะไอเทมในโลกสามมิติ */
export function spawnItems(maze: Maze): ItemState[] {
  return SURVIVAL_ITEMS.map((item) => {
    const cell = maze.itemCells[item.id as SurvivalItemId]
    return {
      id: item.id,
      x: cellCenterX(cell.col),
      z: cellCenterZ(cell.row),
      collected: false,
    }
  })
}
