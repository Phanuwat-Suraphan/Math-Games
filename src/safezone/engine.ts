/**
 * ตรรกะของด่านเขาวงกต (Phase 1)
 *
 * ไฟล์นี้ไม่รู้จัก React และไม่รู้จักผืนผ้าใบ รู้แค่ว่าโลกมีหน้าตาอย่างไร
 * และเวลาผ่านไปหนึ่งเสี้ยววินาทีแล้วโลกเปลี่ยนเป็นอะไร
 * แยกแบบนี้เพื่อให้ทดสอบการชนกำแพงกับหลอดความร้อนได้ด้วย Node ล้วน ๆ
 * ซึ่งเป็นสองอย่างที่ถ้าพังแล้วเด็กจะเดินทะลุกำแพงหรือแพ้โดยไม่มีสาเหตุ
 */

import { generateMaze, spawnItems } from './maze'
import {
  CAMERA_YAW,
  COOLER_RADIUS,
  COOLING_PER_SECOND,
  CELL_SIZE,
  DRONE_TRIGGER_RANGE,
  HEAT_PENALTY_WRONG,
  HEAT_PER_SECOND,
  HEAT_RELIEF_ON_PICKUP,
  MAX_HEAT,
  PLAYER_RADIUS,
  WALK_SPEED,
  cellCenterX,
  cellCenterZ,
  cellOf,
  wallAt,
} from './types'
import type { ItemState, MazeWorld, MoveInput, SurvivalItemId } from './types'

/**
 * ชนกำแพงไหม ตรวจแบบวงกลมชนสี่เหลี่ยม
 *
 * เคยใช้วิธีง่ายกว่านี้คือดูว่าจุดกึ่งกลางตัวละครอยู่ในช่องกำแพงหรือเปล่า
 * ผลคือเดินเฉียดมุมกำแพงแล้วตัวจมเข้าไปครึ่งตัวก่อนจะถูกหยุด
 * ซึ่งมองเห็นชัดมากในมุมกล้องที่อยู่ข้างหลังตัวละคร
 */
export function collidesWithWall(
  maze: MazeWorld['maze'],
  x: number,
  z: number,
  radius = PLAYER_RADIUS,
): boolean {
  const min = cellOf(x - radius, z - radius)
  const max = cellOf(x + radius, z + radius)

  for (let row = min.row; row <= max.row; row += 1) {
    for (let col = min.col; col <= max.col; col += 1) {
      if (!wallAt(maze, col, row)) continue

      const left = col * CELL_SIZE
      const top = row * CELL_SIZE
      const closestX = Math.max(left, Math.min(x, left + CELL_SIZE))
      const closestZ = Math.max(top, Math.min(z, top + CELL_SIZE))
      const dx = x - closestX
      const dz = z - closestZ
      if (dx * dx + dz * dz < radius * radius) return true
    }
  }
  return false
}

/** สร้างโลกใหม่หนึ่งใบ seed เดิมได้ด่านเดิมเสมอ */
export function createWorld(seed: string): MazeWorld {
  const maze = generateMaze(seed)
  return {
    seed,
    maze,
    x: cellCenterX(maze.start.col),
    z: cellCenterZ(maze.start.row),
    heading: 0,
    cameraYaw: CAMERA_YAW,
    moving: false,
    stride: 0,
    items: spawnItems(maze),
    heat: 0,
    elapsed: 0,
    cooling: false,
    challengeItem: null,
    meltdowns: 0,
  }
}

/** ผลต่างของมุมสองมุมในช่วง -π ถึง π ใช้หมุนไปทางที่ใกล้ที่สุดเสมอ */
export function angleDelta(from: number, to: number): number {
  let delta = (to - from) % (Math.PI * 2)
  if (delta > Math.PI) delta -= Math.PI * 2
  if (delta < -Math.PI) delta += Math.PI * 2
  return delta
}

/** ยืนอยู่บนแผ่นทำความเย็นหรือเปล่า */
export function onCooler(world: MazeWorld): boolean {
  return world.maze.coolerCells.some((cell) => {
    const dx = world.x - cellCenterX(cell.col)
    const dz = world.z - cellCenterZ(cell.row)
    return dx * dx + dz * dz < COOLER_RADIUS * COOLER_RADIUS
  })
}

/** ไอเทมชิ้นที่ยังไม่ได้เก็บและอยู่ใกล้ที่สุด ใช้ชี้เข็มทิศบน HUD */
export function nearestUncollected(world: MazeWorld): ItemState | null {
  let best: ItemState | null = null
  let bestDistance = Infinity
  for (const item of world.items) {
    if (item.collected) continue
    const dx = item.x - world.x
    const dz = item.z - world.z
    const distance = dx * dx + dz * dz
    if (distance < bestDistance) {
      bestDistance = distance
      best = item
    }
  }
  return best
}

export function allCollected(world: MazeWorld): boolean {
  return world.items.every((item) => item.collected)
}

/**
 * เดินหน้าไปหนึ่งเฟรม
 *
 * แก้ค่าในวัตถุเดิมแล้วคืนวัตถุเดิมกลับไป ไม่ได้สร้างใหม่ทุกเฟรม
 * เพราะฟังก์ชันนี้ถูกเรียกหกสิบครั้งต่อวินาที การสร้างวัตถุใหม่ทุกครั้ง
 * ทำให้ตัวเก็บขยะทำงานถี่จนภาพกระตุกเป็นจังหวะบนเครื่องของโรงเรียน
 */
export function stepWorld(world: MazeWorld, input: MoveInput, dt: number): MazeWorld {
  // กันเฟรมที่ค้างนาน เช่นสลับแท็บแล้วกลับมา ไม่งั้นจะกระโดดทะลุกำแพง
  const step = Math.max(0, Math.min(dt, 0.05))
  world.elapsed += step

  const magnitude = Math.hypot(input.x, input.z)
  const moving = magnitude > 0.05 && world.challengeItem === null
  world.moving = moving

  if (moving) {
    const dirX = input.x / magnitude
    const dirZ = input.z / magnitude
    const distance = WALK_SPEED * step

    /*
     * ขยับทีละแกน
     *
     * ถ้าขยับพร้อมกันแล้วชน จะต้องหยุดสนิททั้งสองแกน ผลคือเด็กที่เดินเฉียง
     * เข้าหากำแพงจะติดหนึบอยู่กับที่โดยไม่เข้าใจว่าทำไม
     * การแยกแกนทำให้ตัวละครไถลไปตามกำแพงแทน ซึ่งเป็นสิ่งที่มือคาดหวัง
     */
    const nextX = world.x + dirX * distance
    if (!collidesWithWall(world.maze, nextX, world.z)) world.x = nextX
    const nextZ = world.z + dirZ * distance
    if (!collidesWithWall(world.maze, world.x, nextZ)) world.z = nextZ

    world.stride += distance

    // หันตัวตามทิศที่เดิน แบบค่อย ๆ หมุน ไม่ใช่สะบัดทันที
    const target = Math.atan2(dirX, dirZ)
    world.heading += angleDelta(world.heading, target) * Math.min(1, step * 12)
  }

  world.cooling = onCooler(world)
  world.heat = Math.max(
    0,
    Math.min(
      MAX_HEAT,
      world.heat + (world.cooling ? -COOLING_PER_SECOND : HEAT_PER_SECOND) * step,
    ),
  )

  // โดรนโผล่มาขวางเมื่อเข้าใกล้ไอเทมที่ยังไม่ได้เก็บ
  if (world.challengeItem === null) {
    for (const item of world.items) {
      if (item.collected) continue
      const dx = item.x - world.x
      const dz = item.z - world.z
      if (dx * dx + dz * dz <= DRONE_TRIGGER_RANGE * DRONE_TRIGGER_RANGE) {
        world.challengeItem = item.id
        world.moving = false
        break
      }
    }
  }

  return world
}

/**
 * ตอบโจทย์ของโดรนแล้วเกิดอะไรขึ้น
 *
 * ตอบผิดไม่ได้ทำให้ไอเทมหายไปไหน โดรนแค่ยังไม่ยอมหลบ
 * บทลงโทษเป็นความร้อนที่เพิ่มขึ้นซึ่งกดดันแต่แก้ได้ ต่างจากการตัดสิทธิ์
 * ที่ทำให้เด็กที่คิดผิดหนึ่งครั้งเล่นต่อไม่ได้เลย
 */
export function resolveChallenge(world: MazeWorld, correct: boolean): MazeWorld {
  const itemId = world.challengeItem
  if (itemId === null) return world

  if (!correct) {
    world.heat = Math.min(MAX_HEAT, world.heat + HEAT_PENALTY_WRONG)
    return world
  }

  const item = world.items.find((candidate) => candidate.id === itemId)
  if (item) item.collected = true
  world.challengeItem = null
  world.heat = Math.max(0, world.heat - HEAT_RELIEF_ON_PICKUP)
  return world
}

/** ยกเลิกการเผชิญหน้าโดยไม่ตอบ ใช้ตอนเด็กกดถอยเพื่อไปพักก่อน */
export function leaveChallenge(world: MazeWorld): MazeWorld {
  const itemId = world.challengeItem
  if (itemId === null) return world

  /*
   * ดันตัวละครถอยออกจากไอเทมก่อน ไม่งั้นเฟรมถัดไปจะเข้าเงื่อนไข
   * ระยะใกล้อีกครั้งทันที แล้วหน้าจอโจทย์จะเด้งขึ้นมาไม่หยุด
   */
  const item = world.items.find((candidate) => candidate.id === itemId)
  if (item) {
    const dx = world.x - item.x
    const dz = world.z - item.z
    const away = Math.atan2(dx, dz)
    const push = DRONE_TRIGGER_RANGE + 0.6

    /*
     * ลองหลายทิศ ไม่ใช่แค่ทิศตรงข้ามไอเทม
     *
     * ทิศตรงข้ามคือทิศที่อยากได้ที่สุด แต่ในซอยตันมันคือกำแพงพอดี
     * ถ้าดันไม่สำเร็จแล้วปล่อยผ่าน ผู้เล่นจะยังยืนอยู่ในระยะที่โดรนตรวจจับ
     * เฟรมถัดไปหน้าจอโจทย์ก็เด้งขึ้นมาใหม่ทันที กลายเป็นวนไม่รู้จบ
     * และเป็นการวนที่กดปุ่มถอยกี่ครั้งก็ออกไม่ได้ ต้องปิดเกมทิ้งอย่างเดียว
     */
    for (let step = 0; step < 12; step += 1) {
      // สลับซ้ายขวาทีละ 30 องศา ทิศที่ใกล้ทิศตรงข้ามที่สุดจึงถูกลองก่อนเสมอ
      const spread = Math.ceil(step / 2) * (Math.PI / 6) * (step % 2 === 0 ? 1 : -1)
      const angle = away + spread
      const pushedX = item.x + Math.sin(angle) * push
      const pushedZ = item.z + Math.cos(angle) * push
      if (!collidesWithWall(world.maze, pushedX, pushedZ)) {
        world.x = pushedX
        world.z = pushedZ
        break
      }
    }
  }
  world.challengeItem = null
  return world
}

export function isOverheated(world: MazeWorld): boolean {
  return world.heat >= MAX_HEAT
}

/**
 * ความร้อนเต็มแล้วเริ่มใหม่
 *
 * ไอเทมที่เก็บได้แล้วไม่หายไป ตั้งใจให้เป็นแบบนั้น
 * เพราะการบังคับให้ตอบโจทย์ที่ตอบถูกไปแล้วซ้ำอีกรอบ ไม่ได้สอนอะไรเพิ่ม
 * มันแค่ทำให้เด็กที่พลาดต้องนั่งทำงานเดิมซ้ำ จนเลิกอยากลองใหม่
 */
export function respawn(world: MazeWorld): MazeWorld {
  world.x = cellCenterX(world.maze.start.col)
  world.z = cellCenterZ(world.maze.start.row)
  world.heat = 0
  world.heading = 0
  world.cameraYaw = CAMERA_YAW
  world.moving = false
  world.challengeItem = null
  world.meltdowns += 1
  return world
}

/** ไอเทมชิ้นไหนเก็บได้แล้วบ้าง ใช้วาดช่องเก็บของ */
export function collectedIds(world: MazeWorld): SurvivalItemId[] {
  return world.items.filter((item) => item.collected).map((item) => item.id)
}
