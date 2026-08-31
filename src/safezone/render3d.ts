/**
 * การวาดฉากสามมิติของ Safe Zone Guardians ลงบนผืนผ้าใบ
 *
 * ทั้งฉากประกอบขึ้นจากกล่องสี่เหลี่ยมล้วน ๆ ไม่มีโมเดลจากไฟล์เลยสักชิ้น
 * เลือกแบบนี้ด้วยเหตุผลสองข้อ
 *
 * ข้อแรก กล่องคือรูปทรงที่ "เขียนเป็นโค้ดแล้วยังอ่านรู้เรื่อง"
 * ครูที่อยากเปลี่ยนสีตึกหรือทำกำแพงให้เตี้ยลงแก้ได้จากตัวเลขไม่กี่ตัว
 * ข้อสอง สไตล์ low-poly ที่เอกสารออกแบบขอไว้เกิดจากหน้าเรียบที่รับแสงต่างกัน
 * ซึ่งเป็นสิ่งที่กล่องให้ได้อยู่แล้วโดยไม่ต้องมีพื้นผิวหรือเงาแบบคำนวณจริง
 *
 * ลำดับการวาดในหนึ่งเฟรม
 *   ท้องฟ้า → โดม Safe Zone ที่ขอบฟ้า → ฉากสามมิติ → พายุฝุ่น → HUD บนจอ
 *
 * ฉากสามมิติใช้วิธีจิตรกร คือเรียงหน้าทั้งหมดจากไกลไปใกล้แล้ววาดทับกันไป
 * ใช้ได้เพราะของในฉากนี้ไม่มีชิ้นไหนทะลุกันเลย ถ้าวันหนึ่งมีของที่ทะลุกัน
 * จะเห็นอาการเป็นหน้าที่สลับหน้าหลังกันเป็นบางมุม ต้องแบ่งหน้านั้นออกเป็นชิ้นย่อย
 */

import {
  CELL_SIZE,
  FOG_END,
  FOG_START,
  MAX_HEAT,
  WALL_HEIGHT,
  cellCenterX,
  cellCenterZ,
  findItem,
  wallAt,
} from './types'
import type { MazeWorld } from './types'
import { emitBox, emitFloorTile, paintScene } from '../render3d/scene'
import type { SceneFace } from '../render3d/scene'
import { mixHex, projectionScale, scaleHex, toView, vec3 } from './vector3'
import type { Camera, Viewport } from './vector3'

export { emitBox } from '../render3d/scene'
export type { BoxOptions } from '../render3d/scene'

/** สีของฝุ่นที่ขอบฟ้า ทุกอย่างที่อยู่ไกลจะค่อย ๆ กลายเป็นสีนี้ */
const FOG_COLOR = '#c8703a'
const SKY_TOP = '#5b1f3d'
const SKY_MID = '#c2542c'
const SKY_HORIZON = '#f0a35c'

/**
 * กล้องมุมบุคคลที่สาม อยู่หลังและ "สูงกว่ากำแพง"
 *
 * ความสูงคือค่าที่สำคัญที่สุดในสี่ค่านี้ และเคยตั้งไว้ต่ำกว่านี้มาก
 * ผลคือกล้องจมเข้าไปในตึกที่อยู่ข้างหลังแทบตลอดเวลา เพราะในเขาวงกต
 * ข้างหลังตัวละครคือกำแพงเป็นปกติ ไม่ใช่กรณีพิเศษ
 * เคยแก้ด้วยการดึงกล้องเข้าหาตัวเมื่อชน แต่กลายเป็นกล้องที่เด้งเข้าออกตลอดเวลา
 * และตอนถูกดึงจนสุดก็เห็นแต่หลังตัวละครเต็มจอจนมองไม่เห็นทางเดิน
 *
 * การยกกล้องขึ้นเหนือหลังคาแก้ทั้งสองปัญหาพร้อมกัน ไม่ต้องมีโค้ดตรวจการชนเลย
 * และได้ผลพลอยได้ที่สำคัญกว่า คือมองข้ามกำแพงไปเห็นทางข้างหน้าได้
 * ซึ่งเปลี่ยนเขาวงกตจาก "เดินชนกำแพงไปเรื่อย ๆ" เป็น "วางแผนเส้นทาง"
 */
const CAMERA_DISTANCE = 8.6
const CAMERA_HEIGHT = 8.2
/** เล็งไปที่จุดข้างหน้าตัวละคร ไม่ใช่ที่ตัวละคร ตัวละครจึงอยู่ค่อนไปทางล่างของจอ */
const CAMERA_LOOK_AHEAD = 3.4
const CAMERA_LOOK_HEIGHT = 1.2
const FIELD_OF_VIEW = 1.15

/** ระยะที่ยังสร้างของในฉาก ไกลกว่านี้หมอกกลืนจนหมดอยู่แล้ว */
const DRAW_RADIUS = FOG_END + CELL_SIZE

/**
 * ตัวเลขสุ่มที่ผูกกับช่อง
 *
 * ต้องได้ค่าเดิมทุกเฟรม ไม่งั้นตึกจะเปลี่ยนความสูงและเปลี่ยนสีทุกครั้งที่วาด
 * ซึ่งมองเห็นเป็นฉากที่กะพริบทั้งฉาก ใช้ตัวเลขจากพิกัดโดยตรงจึงแน่นอนเสมอ
 */
function cellNoise(col: number, row: number, salt: number): number {
  const value = Math.sin(col * 127.1 + row * 311.7 + salt * 74.7) * 43758.5453
  return value - Math.floor(value)
}

const WALL_COLORS = ['#7d5a46', '#8a6249', '#6d4c3d', '#94705a', '#5f4438']
const GROUND_COLORS = ['#c98b52', '#d19a5f', '#bd7f4a', '#c69063']

/**
 * ตึกหลังนี้บังตัวละครอยู่ไหม
 *
 * ในเขาวงกตที่กล้องอยู่นิ่ง เรื่องนี้เกิดขึ้นตลอดเวลา ไม่ใช่นาน ๆ ครั้ง
 * ทุกครั้งที่เด็กเดินไปหลังตึกที่อยู่ฝั่งกล้อง ตัวละครจะหายไปทั้งตัว
 * แล้วเด็กจะกดปุ่มมั่ว ๆ เพื่อหาว่าตัวเองอยู่ไหน
 *
 * ทางแก้ที่เคยลองคือยกกล้องให้สูงขึ้นจนมองข้ามตึกได้ทุกกรณี
 * แต่ต้องยกสูงมากจนภาพกลายเป็นแผนที่มองจากบนหัว ซึ่งทิ้งความเป็นสามมิติไปเกือบหมด
 * การทำให้ตึกที่ขวางอยู่โปร่งแสงแทน เก็บทั้งมุมกล้องและตัวละครไว้ได้ทั้งคู่
 */
function blocksView(x: number, z: number, world: MazeWorld, camera: Camera): boolean {
  const ax = camera.position.x
  const az = camera.position.z
  const abx = world.x - ax
  const abz = world.z - az
  const lengthSquared = abx * abx + abz * abz
  if (lengthSquared < 0.001) return false

  const along = ((x - ax) * abx + (z - az) * abz) / lengthSquared
  if (along <= 0.05 || along >= 0.98) return false

  const offX = x - (ax + abx * along)
  const offZ = z - (az + abz * along)
  return offX * offX + offZ * offZ < (CELL_SIZE * 0.8) * (CELL_SIZE * 0.8)
}

/** สร้างกำแพงและพื้นรอบตัวผู้เล่น */
function emitTerrain(out: SceneFace[], world: MazeWorld, camera: Camera): void {
  const reach = Math.ceil(DRAW_RADIUS / CELL_SIZE)
  const here = {
    col: Math.floor(world.x / CELL_SIZE),
    row: Math.floor(world.z / CELL_SIZE),
  }

  for (let row = here.row - reach; row <= here.row + reach; row += 1) {
    for (let col = here.col - reach; col <= here.col + reach; col += 1) {
      const centerX = cellCenterX(col)
      const centerZ = cellCenterZ(row)
      const dx = centerX - world.x
      const dz = centerZ - world.z
      if (dx * dx + dz * dz > DRAW_RADIUS * DRAW_RADIUS) continue

      const outside =
        col < 0 || row < 0 || col >= world.maze.cols || row >= world.maze.rows

      if (!wallAt(world.maze, col, row)) {
        const shade = GROUND_COLORS[
          Math.floor(cellNoise(col, row, 3) * GROUND_COLORS.length)
        ] as string
        emitFloorTile(out, centerX, centerZ, CELL_SIZE, 0, shade)
        continue
      }

      /*
       * นอกขอบเขาวงกตวาดเป็นเนินทรายเตี้ย ไม่ใช่ตึก
       *
       * ถ้าวาดเป็นตึกเหมือนกันหมด ผู้เล่นจะไม่มีทางรู้เลยว่าขอบสนามอยู่ตรงไหน
       * เนินเตี้ยทำให้มองข้ามไปเห็นทะเลทรายกับโดมที่ขอบฟ้าได้ ซึ่งเป็นทั้ง
       * จุดสังเกตสำหรับหาทาง และเป็นการเล่าเรื่องว่าข้างนอกนั้นไม่มีอะไรเลย
       */
      if (outside) {
        emitFloorTile(out, centerX, centerZ, CELL_SIZE, 0, '#d8a066')
        emitBox(out, {
          center: vec3(centerX, 0.35, centerZ),
          size: vec3(CELL_SIZE * 0.96, 0.7, CELL_SIZE * 0.96),
          color: '#cf9760',
          topColor: '#e0ad72',
          outline: null,
          skipBottom: true,
        })
        continue
      }

      const height = WALL_HEIGHT * (0.72 + cellNoise(col, row, 1) * 0.55)
      const tint = WALL_COLORS[
        Math.floor(cellNoise(col, row, 2) * WALL_COLORS.length)
      ] as string
      const ghost = blocksView(centerX, centerZ, world, camera)

      emitBox(out, {
        center: vec3(centerX, height / 2, centerZ),
        size: vec3(CELL_SIZE, height, CELL_SIZE),
        color: tint,
        topColor: mixHex(tint, '#f2c08a', 0.35),
        // ตึกโปร่งแสงไม่ตีเส้นขอบ เส้นทึบบนตัวโปร่งอ่านเป็นภาพผิดพลาด
        outline: ghost ? null : '#3a2318',
        alpha: ghost ? 0.26 : 1,
        skipBottom: true,
      })
      if (ghost) continue

      /*
       * หน้าต่างเรืองแสงบนตึกบางหลัง
       *
       * ไม่ได้ใส่เพื่อความสวยอย่างเดียว แต่เพื่อบอกว่านี่เคยเป็นเมืองที่มีคนอยู่
       * ซึ่งเป็นใจความของเรื่องทั้งเรื่อง กำแพงเปล่า ๆ อ่านเป็นเขาวงกต
       * กำแพงที่มีหน้าต่างอ่านเป็นซากบ้านของใครสักคน
       */
      if (cellNoise(col, row, 5) > 0.72 && height > WALL_HEIGHT * 0.9) {
        emitBox(out, {
          center: vec3(centerX, height * 0.62, centerZ),
          size: vec3(CELL_SIZE * 1.01, 0.5, CELL_SIZE * 0.34),
          color: '#f8d38a',
          outline: null,
          emissive: true,
          alpha: 0.75,
        })
      }
    }
  }

  // แผ่นทำความเย็น วาดทับพื้นทรายอีกชั้นให้เห็นชัดแต่ไกล
  for (const cell of world.maze.coolerCells) {
    const x = cellCenterX(cell.col)
    const z = cellCenterZ(cell.row)
    const dx = x - world.x
    const dz = z - world.z
    if (dx * dx + dz * dz > DRAW_RADIUS * DRAW_RADIUS) continue

    emitFloorTile(out, x, z, CELL_SIZE * 0.92, 0.02, '#0e7490')
    emitFloorTile(out, x, z, CELL_SIZE * 0.62, 0.04, '#22d3ee', 0.85)
    emitBox(out, {
      center: vec3(x, 1.1, z),
      size: vec3(0.45, 2.2, 0.45),
      color: '#67e8f9',
      outline: null,
      emissive: true,
      alpha: 0.35,
    })
  }
}

/** ไอเทมยังชีพ หมุนช้า ๆ พร้อมลำแสงที่มองเห็นได้แต่ไกล */
function emitItems(out: SceneFace[], world: MazeWorld, time: number): void {
  for (const state of world.items) {
    if (state.collected) continue
    const dx = state.x - world.x
    const dz = state.z - world.z
    if (dx * dx + dz * dz > DRAW_RADIUS * DRAW_RADIUS) continue

    const item = findItem(state.id)
    const bob = Math.sin(time * 0.0022 + state.x) * 0.18

    // ลำแสงที่พุ่งขึ้นฟ้า คือสิ่งเดียวที่ทำให้หาไอเทมเจอโดยไม่ต้องเดินชนทุกซอย
    emitBox(out, {
      center: vec3(state.x, 4.6, state.z),
      size: vec3(0.5, 9.2, 0.5),
      color: item.color,
      outline: null,
      emissive: true,
      alpha: 0.3,
    })
    emitBox(out, {
      center: vec3(state.x, 1.15 + bob, state.z),
      size: vec3(1.05, 1.05, 1.05),
      yaw: time * 0.0012,
      color: item.color,
      topColor: item.accent,
      outline: '#0b2a33',
    })
    emitFloorTile(out, state.x, state.z, 2.4, 0.03, item.color, 0.4)
  }
}

/** โดรนรักษาความปลอดภัยที่โผล่มาขวางไอเทม */
function emitDrone(out: SceneFace[], world: MazeWorld, time: number): void {
  if (world.challengeItem === null) return
  const state = world.items.find((item) => item.id === world.challengeItem)
  if (!state) return

  const bob = Math.sin(time * 0.004) * 0.22
  const yaw = time * 0.0016
  const y = 2.35 + bob

  emitBox(out, {
    center: vec3(state.x, y, state.z),
    size: vec3(1.5, 0.8, 1.5),
    yaw,
    color: '#334155',
    topColor: '#475569',
    outline: '#0f172a',
  })
  emitBox(out, {
    center: vec3(state.x, y - 0.55, state.z),
    size: vec3(0.7, 0.5, 0.7),
    yaw,
    color: '#f43f5e',
    outline: null,
    emissive: true,
  })
  // ใบพัดสองข้าง หมุนสวนทางกับตัวเครื่องให้ดูเหมือนกำลังลอยตัวอยู่จริง
  for (const side of [-1, 1]) {
    emitBox(out, {
      center: vec3(state.x + side * 1.0, y + 0.3, state.z),
      size: vec3(1.5, 0.08, 0.25),
      yaw: -time * 0.02,
      color: '#94a3b8',
      outline: null,
      alpha: 0.6,
    })
  }
}

/** ตัวละครผู้เล่น เด็กในชุดกันความร้อนพร้อมถังอากาศบนหลัง */
function emitPlayer(out: SceneFace[], world: MazeWorld): void {
  const yaw = world.heading
  const forward = { x: Math.sin(yaw), z: Math.cos(yaw) }
  const swing = world.moving ? Math.sin(world.stride * 2.4) * 0.28 : 0
  const bounce = world.moving ? Math.abs(Math.sin(world.stride * 2.4)) * 0.08 : 0

  emitFloorTile(out, world.x, world.z, 1.5, 0.05, '#5b3a22', 0.45)

  for (const side of [-1, 1]) {
    const step = side === 1 ? swing : -swing
    const offsetX = forward.x * step + Math.cos(yaw) * side * 0.24
    const offsetZ = forward.z * step - Math.sin(yaw) * side * 0.24
    emitBox(out, {
      center: vec3(world.x + offsetX, 0.42 + bounce, world.z + offsetZ),
      size: vec3(0.34, 0.84, 0.34),
      yaw,
      color: '#3f3f46',
      outline: '#18181b',
    })
  }

  emitBox(out, {
    center: vec3(world.x, 1.24 + bounce, world.z),
    size: vec3(0.86, 0.94, 0.62),
    yaw,
    color: '#f97316',
    topColor: '#fdba74',
    outline: '#7c2d12',
  })
  // ถังอากาศบนหลัง อยู่ตรงข้ามกับทิศที่หันหน้า
  emitBox(out, {
    center: vec3(world.x - forward.x * 0.5, 1.3 + bounce, world.z - forward.z * 0.5),
    size: vec3(0.6, 0.8, 0.34),
    yaw,
    color: '#0ea5e9',
    outline: '#0c4a6e',
  })
  emitBox(out, {
    center: vec3(world.x, 1.94 + bounce, world.z),
    size: vec3(0.68, 0.62, 0.62),
    yaw,
    color: '#fed7aa',
    topColor: '#ffedd5',
    outline: '#7c2d12',
  })
  // กระจกหมวก เรืองแสงเพื่อให้รู้ทันทีว่าตัวละครหันหน้าไปทางไหน
  emitBox(out, {
    center: vec3(world.x + forward.x * 0.33, 1.96 + bounce, world.z + forward.z * 0.33),
    size: vec3(0.5, 0.3, 0.1),
    yaw,
    color: '#7dd3fc',
    outline: null,
    emissive: true,
    alpha: 0.9,
  })
}

/**
 * กล้องตามหลัง พร้อมดึงเข้าหาตัวเมื่อมีกำแพงขวาง
 *
 * ถ้าไม่ดึงเข้า กล้องจะจมเข้าไปในกำแพงทุกครั้งที่เดินชิดมุม
 * แล้วผู้เล่นจะเห็นด้านในของกำแพงบังทั้งจอ ซึ่งอ่านเป็นภาพพัง ไม่ใช่ภาพกล้องติด
 */
export function cameraFor(world: MazeWorld): Camera {
  const yaw = world.cameraYaw

  /*
   * มุมก้มคำนวณจากตำแหน่งกล้องทุกครั้ง ไม่ได้ตั้งเป็นค่าคงที่แยกต่างหาก
   * เพราะถ้าตั้งแยก พอปรับความสูงกล้องทีหนึ่งต้องมานั่งไล่ปรับมุมก้มตามอีกที
   * และถ้าลืมปรับ ตัวละครจะค่อย ๆ เลื่อนหลุดออกนอกจอโดยไม่มีอะไรฟ้อง
   */
  return {
    position: vec3(
      world.x - Math.sin(yaw) * CAMERA_DISTANCE,
      CAMERA_HEIGHT,
      world.z - Math.cos(yaw) * CAMERA_DISTANCE,
    ),
    yaw,
    pitch: Math.atan2(
      CAMERA_HEIGHT - CAMERA_LOOK_HEIGHT,
      CAMERA_DISTANCE + CAMERA_LOOK_AHEAD,
    ),
    fov: FIELD_OF_VIEW,
  }
}

/** ท้องฟ้าไล่สีจากม่วงเข้มด้านบนลงมาเป็นฝุ่นส้มที่ขอบฟ้า */
function drawSky(ctx: CanvasRenderingContext2D, viewport: Viewport, camera: Camera): void {
  const horizon =
    viewport.height / 2 + Math.tan(camera.pitch) * projectionScale(viewport, camera.fov)

  const sky = ctx.createLinearGradient(0, 0, 0, Math.max(1, horizon))
  sky.addColorStop(0, SKY_TOP)
  sky.addColorStop(0.55, SKY_MID)
  sky.addColorStop(1, SKY_HORIZON)
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, viewport.width, Math.max(0, horizon))

  // ใต้เส้นขอบฟ้าเป็นสีฝุ่น เผื่อไว้สำหรับช่องว่างที่พื้นวาดไปไม่ถึง
  ctx.fillStyle = FOG_COLOR
  ctx.fillRect(0, Math.max(0, horizon), viewport.width, viewport.height)

  // ดวงอาทิตย์ที่ใหญ่และแดงเกินปกติ คือภาพจำของโลกที่ร้อนเกินไป
  const sunX = viewport.width * 0.74
  const sunY = horizon - viewport.height * 0.16
  const glow = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, viewport.height * 0.34)
  glow.addColorStop(0, 'rgba(255, 226, 150, 0.95)')
  glow.addColorStop(0.35, 'rgba(249, 168, 96, 0.45)')
  glow.addColorStop(1, 'rgba(249, 115, 22, 0)')
  ctx.fillStyle = glow
  ctx.beginPath()
  ctx.arc(sunX, sunY, viewport.height * 0.34, 0, Math.PI * 2)
  ctx.fill()
}

/**
 * โดม Safe Zone ที่ขอบฟ้า
 *
 * วาดเป็นภาพสองมิติทับท้องฟ้า ไม่ได้สร้างเป็นวัตถุสามมิติจริง
 * เพราะโดมอยู่ไกลกว่าทุกอย่างในฉากเสมอ การวาดก่อนของอื่นทั้งหมด
 * จึงให้ผลถูกต้องเหมือนกัน โดยไม่ต้องเพิ่มหน้าอีกหลายสิบหน้าในทุกเฟรม
 *
 * โดมต้องมองเห็นได้ตลอดเวลา เพราะมันคือ "เป้าหมาย" ของเรื่องทั้งเรื่อง
 * เด็กที่หลงอยู่ในเขาวงกตควรเงยหน้าแล้วเห็นว่ากำลังจะไปไหน
 */
function drawDome(
  ctx: CanvasRenderingContext2D,
  viewport: Viewport,
  camera: Camera,
  world: MazeWorld,
): void {
  const domeCenter = vec3(
    cellCenterX(world.maze.cols / 2),
    0,
    cellCenterZ(world.maze.rows) + 78,
  )
  const view = toView(domeCenter, camera)
  if (view.z < 1) return

  const scale = projectionScale(viewport, camera.fov)
  const screenX = viewport.width / 2 + (view.x * scale) / view.z
  const baseY = viewport.height / 2 - (view.y * scale) / view.z
  const radius = (34 * scale) / view.z
  if (radius < 4) return

  ctx.save()
  ctx.beginPath()
  ctx.arc(screenX, baseY, radius, Math.PI, Math.PI * 2)
  ctx.closePath()

  /*
   * โดมต้องสว่างกว่าฉากรอบตัวชัดเจน
   *
   * เคยใช้สีเขียวโปร่งบาง ๆ ซึ่งดูดีในหัว แต่พอวางบนท้องฟ้าสีม่วงเข้มจริง ๆ
   * แล้วกลายเป็นก้อนสีเทาหม่นที่แยกจากเมฆไม่ออก
   * ในเมื่อทั้งฉากเป็นสีส้มน้ำตาล สีเขียวสว่างคือสิ่งเดียวในจอที่ต่างออกไป
   * และความต่างนั้นเองคือสิ่งที่ทำให้เด็กรู้ว่า "ที่นั่นคือที่ที่ยังมีชีวิต"
   */
  const shell = ctx.createLinearGradient(screenX, baseY - radius, screenX, baseY)
  shell.addColorStop(0, 'rgba(209, 250, 229, 0.82)')
  shell.addColorStop(0.55, 'rgba(110, 231, 183, 0.62)')
  shell.addColorStop(1, 'rgba(45, 212, 191, 0.42)')
  ctx.fillStyle = shell
  ctx.fill()
  ctx.lineWidth = Math.max(1, radius * 0.035)
  ctx.strokeStyle = 'rgba(190, 242, 100, 0.75)'
  ctx.stroke()

  // เส้นแบ่งกระจกของโดม ทำให้อ่านเป็นสิ่งก่อสร้าง ไม่ใช่ฟองสบู่
  ctx.lineWidth = Math.max(0.6, radius * 0.012)
  ctx.strokeStyle = 'rgba(236, 253, 245, 0.35)'
  for (let step = 1; step <= 3; step += 1) {
    const inner = (radius * step) / 4
    ctx.beginPath()
    ctx.arc(screenX, baseY, inner, Math.PI, Math.PI * 2)
    ctx.stroke()
  }
  ctx.restore()
}

/** พายุฝุ่นที่พัดผ่านหน้าจอ วาดเป็นเส้นบนจอ ไม่ใช่วัตถุในฉาก */
function drawDust(
  ctx: CanvasRenderingContext2D,
  viewport: Viewport,
  time: number,
): void {
  ctx.save()
  ctx.strokeStyle = 'rgba(255, 224, 178, 0.28)'
  ctx.lineWidth = 1.6
  ctx.beginPath()
  for (let index = 0; index < 48; index += 1) {
    const seedY = ((index * 97) % 100) / 100
    const speed = 90 + (index % 7) * 42
    const x = ((index * 211 + time * speed * 0.001) % (viewport.width + 160)) - 80
    const y = seedY * viewport.height
    const length = 22 + (index % 5) * 12
    ctx.moveTo(x, y)
    ctx.lineTo(x + length, y + length * 0.12)
  }
  ctx.stroke()
  ctx.restore()
}

/**
 * แผนที่ย่อมุมจอ
 *
 * เกมเขาวงกตมุมบุคคลที่สามที่ไม่มีแผนที่ย่อ ทดสอบความจำของเด็กมากกว่าคณิตศาสตร์
 * ซึ่งไม่ใช่สิ่งที่เกมนี้ตั้งใจจะวัด จึงบอกตำแหน่งไอเทมให้เห็นตั้งแต่แรก
 * ความท้าทายที่เหลือคือ "หาทางไปให้ถึงก่อนความร้อนจะเต็ม" ซึ่งยังสนุกอยู่
 */
function drawMinimap(
  ctx: CanvasRenderingContext2D,
  viewport: Viewport,
  world: MazeWorld,
): void {
  const size = Math.min(150, viewport.width * 0.28)
  const pad = 14
  const left = viewport.width - size - pad
  const top = pad
  const tile = size / world.maze.cols

  /*
   * แกน z ของโลกชี้ "เข้าไปในจอ" ส่วนแกน row ของตาราง ถ้าวาดตรง ๆ จะชี้ลง
   * สองอย่างนี้สวนทางกัน ผลคือกดปุ่มขึ้นแล้วหมุดบนแผนที่วิ่งลง
   * ซึ่งอ่านยากกว่าที่คิดมาก โดยเฉพาะกับเด็กที่กำลังรีบเพราะความร้อนใกล้เต็ม
   * จึงพลิกแกนตั้งของแผนที่ให้ "ขึ้นบนแผนที่" ตรงกับ "ลึกเข้าไปในจอ"
   */
  const mapY = (row: number): number => top + (world.maze.rows - row) * tile

  ctx.save()
  ctx.globalAlpha = 0.9
  ctx.fillStyle = 'rgba(8, 15, 30, 0.78)'
  ctx.strokeStyle = 'rgba(103, 232, 249, 0.55)'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.roundRect(left - 4, top - 4, size + 8, size + 8, 10)
  ctx.fill()
  ctx.stroke()

  for (let row = 0; row < world.maze.rows; row += 1) {
    for (let col = 0; col < world.maze.cols; col += 1) {
      if (!wallAt(world.maze, col, row)) continue
      ctx.fillStyle = 'rgba(148, 163, 184, 0.35)'
      ctx.fillRect(left + col * tile, mapY(row + 1), tile, tile)
    }
  }

  for (const cell of world.maze.coolerCells) {
    ctx.fillStyle = 'rgba(34, 211, 238, 0.85)'
    ctx.fillRect(
      left + cell.col * tile + tile * 0.2,
      mapY(cell.row + 1) + tile * 0.2,
      tile * 0.6,
      tile * 0.6,
    )
  }

  for (const item of world.items) {
    const col = item.x / CELL_SIZE
    const row = item.z / CELL_SIZE
    ctx.fillStyle = item.collected
      ? 'rgba(148, 163, 184, 0.5)'
      : scaleHex(findItem(item.id).color, 1)
    ctx.beginPath()
    ctx.arc(left + col * tile, mapY(row), Math.max(2.5, tile * 0.42), 0, Math.PI * 2)
    ctx.fill()
  }

  // ตัวผู้เล่นเป็นสามเหลี่ยมชี้ไปทางที่หันหน้า จึงบอกทั้งที่อยู่และทิศในรูปเดียว
  const playerX = left + (world.x / CELL_SIZE) * tile
  const playerY = mapY(world.z / CELL_SIZE)
  ctx.translate(playerX, playerY)
  // หมุนตามเข็ม เพราะแกนตั้งของจอชี้ลง ส่วนมุม heading วัดจากแกน z ที่ชี้ขึ้นบนแผนที่
  ctx.rotate(world.heading)
  ctx.fillStyle = '#fde047'
  ctx.beginPath()
  ctx.moveTo(0, -tile * 0.75)
  ctx.lineTo(tile * 0.55, tile * 0.6)
  ctx.lineTo(-tile * 0.55, tile * 0.6)
  ctx.closePath()
  ctx.fill()
  ctx.restore()
}

/** ขอบจอแดงขึ้นตามความร้อน เป็นการเตือนที่ไม่ต้องอ่านตัวเลข */
function drawHeatVignette(
  ctx: CanvasRenderingContext2D,
  viewport: Viewport,
  heat: number,
): void {
  const level = Math.max(0, Math.min(1, heat / MAX_HEAT))
  if (level < 0.35) return

  const strength = (level - 0.35) / 0.65
  const gradient = ctx.createRadialGradient(
    viewport.width / 2,
    viewport.height / 2,
    viewport.height * 0.25,
    viewport.width / 2,
    viewport.height / 2,
    viewport.height * 0.78,
  )
  gradient.addColorStop(0, 'rgba(220, 38, 38, 0)')
  gradient.addColorStop(1, `rgba(220, 38, 38, ${(strength * 0.6).toFixed(3)})`)
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, viewport.width, viewport.height)
}

export interface DrawOptions {
  /** เวลาตั้งแต่เปิดเกม หน่วยมิลลิวินาที ใช้ทำของที่ขยับเอง */
  time: number
  /** ปิดพายุฝุ่นและการสั่นไหว สำหรับเด็กที่ไวต่อการเคลื่อนไหว */
  reduceMotion?: boolean
}

/** วาดหนึ่งเฟรม */
export function drawScene(
  canvas: HTMLCanvasElement | null,
  world: MazeWorld,
  options: DrawOptions,
): void {
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const viewport: Viewport = { width: canvas.width, height: canvas.height }
  const camera = cameraFor(world)

  ctx.clearRect(0, 0, viewport.width, viewport.height)
  drawSky(ctx, viewport, camera)
  drawDome(ctx, viewport, camera, world)

  const faces: SceneFace[] = []
  emitTerrain(faces, world, camera)
  emitItems(faces, world, options.time)
  emitDrone(faces, world, options.time)
  emitPlayer(faces, world)

  paintScene(ctx, faces, camera, viewport, {
    fogColor: FOG_COLOR,
    fogStart: FOG_START,
    fogEnd: FOG_END,
    cullDistance: FOG_END + CELL_SIZE * 2,
  })

  if (!options.reduceMotion) drawDust(ctx, viewport, options.time)
  drawHeatVignette(ctx, viewport, world.heat)
  drawMinimap(ctx, viewport, world)
}
