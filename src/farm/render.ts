/**
 * การวาดฟาร์มในโดม
 *
 * ใช้แกนกลางชุดเดียวกับฉากเขาวงกตของ Safe Zone Guardians
 * ต่างกันที่กล้อง เขาวงกตใช้เพอร์สเปกทีฟเพราะต้องรู้สึกว่ากำลังยืนอยู่ในนั้น
 * ส่วนฟาร์มใช้ออร์โทกราฟิก ด้วยเหตุผลที่เป็นเรื่องของคณิตศาสตร์โดยตรง
 *
 * โจทย์หลักของโหมดนี้คือ "แปลง 6 คูณ 8 ปลูกได้กี่ต้น" ซึ่งเด็กควรนับจากภาพได้
 * ถ้าใช้เพอร์สเปกทีฟ แถวหลังของแปลงเดียวกันจะดูแคบกว่าแถวหน้าเสมอ
 * เด็กที่พยายามนับจากภาพจะนับผิด และจะสรุปว่าตัวเองคิดผิดทั้งที่คิดถูก
 * ออร์โทกราฟิกทำให้ทุกช่องเท่ากันหมดจริง ๆ ตารางบนจอจึงเชื่อถือได้
 */

import { emitBox, emitFloorRect, emitFloorTile, paintScene } from '../render3d/scene'
import type { SceneFace } from '../render3d/scene'
import { projectionScale, toView, vec3 } from '../safezone/vector3'
import type { Camera, Vec3, Viewport } from '../safezone/vector3'
import { BUILDINGS, MAX_PLOTS, findAnimal, findCrop } from './types'
import type { FarmState, Plot } from './types'
import { isReady } from './engine'

/** ความละเอียดของฉาก ตรึงไว้เหมือนโหมดอื่นแล้วยืดด้วย CSS */
export const FARM_STAGE_WIDTH = 960
export const FARM_STAGE_HEIGHT = 560

/** ขนาดหนึ่งช่องปลูกในหน่วยของโลก */
const CELL = 0.62

/** มุมกล้องแบบสามส่วนสี่ ค่าก้มคือมุมไอโซเมตริกจริง คือ atan(1/√2) */
const CAMERA_YAW = Math.PI / 4
const CAMERA_PITCH = Math.atan(1 / Math.SQRT2)

/** สีของฉาก เลือกให้ต่างจากทะเลทรายข้างนอกให้มากที่สุด */
const SKY_TOP = '#0d2a3a'
const SKY_HORIZON = '#7fc9b4'
const FOG_COLOR = '#9fd4c4'
const GRASS = '#4f8f52'
const GRASS_ALT = '#569a58'
const PATH = '#bda677'
const SOIL = '#6b4a32'
const SOIL_WET = '#4f3524'

/** ตำแหน่งกลางแปลงแต่ละแปลง จัดเป็นสามคอลัมน์สองแถว */
export function plotAnchor(index: number): Vec3 {
  const column = index % 3
  const row = Math.floor(index / 3)
  return vec3((column - 1) * 7.6, 0, row === 0 ? -4.2 : 4.2)
}

/** ตำแหน่งคอกสัตว์ */
function penAnchor(index: number): Vec3 {
  return vec3((index - 1) * 6.4, 0, 12.4)
}

/** ตำแหน่งอาคาร */
function buildingAnchor(index: number): Vec3 {
  return vec3((index - 1) * 6.4, 0, -12.4)
}

/**
 * ขอบเขตของฉากทั้งหมดในพิกัดโลก
 *
 * ตรึงไว้ ไม่ได้คำนวณจากของที่มีอยู่จริง เพราะถ้าคำนวณตามของจริง
 * ภาพจะซูมเข้าออกเองทุกครั้งที่เปิดแปลงใหม่หรือซื้อสัตว์เพิ่ม
 * ซึ่งอ่านเป็นกล้องที่ควบคุมไม่ได้ ไม่ใช่ฟาร์มที่กำลังโต
 */
const SCENE_BOUNDS = { minX: -13, maxX: 13, minZ: -16, maxZ: 16, maxY: 4 }

/**
 * กล้องที่พอดีกับฉากเสมอ
 *
 * คำนวณตัวคูณจากขอบเขตของฉากจริง ๆ แทนการเดาตัวเลขแล้วลองปรับ
 * เพราะออร์โทกราฟิกไม่มีระยะใกล้ไกลมาช่วยจัดองค์ประกอบให้
 * ตั้งผิดนิดเดียวคือของหลุดขอบจอ หรือฉากเล็กจ้อยอยู่กลางจอ
 */
export function farmCamera(): Camera {
  const center = vec3(0, 0, 0)
  const forward = vec3(
    Math.sin(CAMERA_YAW) * Math.cos(CAMERA_PITCH),
    -Math.sin(CAMERA_PITCH),
    Math.cos(CAMERA_YAW) * Math.cos(CAMERA_PITCH),
  )
  return {
    position: vec3(
      center.x - forward.x * 80,
      center.y - forward.y * 80,
      center.z - forward.z * 80,
    ),
    yaw: CAMERA_YAW,
    pitch: CAMERA_PITCH,
    fov: 1,
  }
}

/**
 * มุมมองของฟาร์ม ตัวคูณและระยะเลื่อนภาพ
 *
 * ทั้งการวาดฉากและการวางปุ่มโปร่งใสทับแปลง ต้องใช้ค่าชุดเดียวกันเป๊ะ
 * ถ้าคำนวณแยกกันสองที่ วันที่ปรับมุมกล้องแล้วลืมแก้อีกที่
 * อาการคือปุ่มกดไม่ตรงกับแปลงที่เห็น ซึ่งเป็นบั๊กที่หาสาเหตุยากมาก
 * เพราะทั้งภาพและปุ่มต่างก็ดู "เกือบถูก" ทั้งคู่
 */
export interface FarmView {
  camera: Camera
  scale: number
  offsetX: number
  offsetY: number
}

export function farmView(viewport: Viewport): FarmView {
  const camera = farmCamera()
  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity

  for (const x of [SCENE_BOUNDS.minX, SCENE_BOUNDS.maxX]) {
    for (const z of [SCENE_BOUNDS.minZ, SCENE_BOUNDS.maxZ]) {
      for (const y of [0, SCENE_BOUNDS.maxY]) {
        const view = toView(vec3(x, y, z), camera)
        if (view.x < minX) minX = view.x
        if (view.x > maxX) maxX = view.x
        if (view.y < minY) minY = view.y
        if (view.y > maxY) maxY = view.y
      }
    }
  }

  const width = Math.max(0.001, maxX - minX)
  const height = Math.max(0.001, maxY - minY)
  const scale = Math.min(viewport.width / width, viewport.height / height) * 0.94

  // จุดกึ่งกลางของภาพที่ออกมา ไม่ใช่จุดกำเนิดของโลก
  return {
    camera,
    scale,
    offsetX: -((minX + maxX) / 2) * scale,
    offsetY: ((minY + maxY) / 2) * scale,
  }
}

/** จุดในโลกอยู่ตรงไหนบนจอ ใช้วางป้ายและปุ่มทับฉาก */
export function projectPoint(point: Vec3, viewport: Viewport): { x: number; y: number } {
  const view = farmView(viewport)
  const camera = toView(point, view.camera)
  return {
    x: viewport.width / 2 + camera.x * view.scale + view.offsetX,
    y: viewport.height / 2 - camera.y * view.scale + view.offsetY,
  }
}

/** ตำแหน่งบนจอของทุกแปลง ใช้วางปุ่มโปร่งใสให้กดเลือกแปลงจากภาพได้ */
export function plotScreenPositions(
  farm: FarmState,
  viewport: Viewport,
): { index: number; x: number; y: number }[] {
  return farm.plots.map((_, index) => {
    const anchor = plotAnchor(index)
    const point = projectPoint(vec3(anchor.x, 1.4, anchor.z), viewport)
    return { index, x: point.x, y: point.y }
  })
}

/** พื้นของโดมทั้งผืน สลับสีเป็นตารางจาง ๆ ให้อ่านเป็นพื้นที่ ไม่ใช่สีเดียวเรียบ */
function emitGround(out: SceneFace[]): void {
  for (let x = SCENE_BOUNDS.minX; x < SCENE_BOUNDS.maxX; x += 2) {
    for (let z = SCENE_BOUNDS.minZ; z < SCENE_BOUNDS.maxZ; z += 2) {
      const alternate = (Math.floor(x / 2) + Math.floor(z / 2)) % 2 === 0
      emitFloorTile(out, x + 1, z + 1, 2, 0, alternate ? GRASS : GRASS_ALT)
    }
  }
  // ทางเดินกลางโดม ทำให้ฉากมีทิศทางและแยกโซนแปลงออกจากโซนอาคาร
  emitFloorRect(out, 0, 0, SCENE_BOUNDS.maxX * 2, 1.6, 0.02, PATH)
  emitFloorRect(out, 0, 8.3, 1.6, 8.4, 0.02, PATH)
  emitFloorRect(out, 0, -8.3, 1.6, 8.4, 0.02, PATH)
}

/** ต้นพืชหนึ่งต้น สูงตามความคืบหน้าของการรดน้ำ */
function emitPlant(
  out: SceneFace[],
  x: number,
  z: number,
  plot: Plot,
  time: number,
): void {
  if (!plot.planting) return
  const crop = findCrop(plot.planting.crop)
  const progress = Math.min(1, plot.planting.watered / crop.growDays)
  const ready = isReady(plot)

  /*
   * ต้นไม้เอนตามลมนิดหน่อย
   *
   * ใช้การเอนแทนการขยับขึ้นลง เพราะการขยับขึ้นลงทำให้ต้นไม้ลอยพ้นดิน
   * ซึ่งเห็นชัดมากในมุมมองแบบนี้ ส่วนการเอนยังติดอยู่กับพื้นเสมอ
   */
  const sway = Math.sin(time * 0.0012 + x * 1.7 + z) * 0.05

  const height = 0.16 + progress * 0.5
  emitBox(out, {
    center: vec3(x, height / 2, z),
    size: vec3(CELL * 0.34, height, CELL * 0.34),
    yaw: sway,
    color: crop.color,
    outline: null,
    skipBottom: true,
  })

  if (ready) {
    emitBox(out, {
      center: vec3(x, height + 0.16, z),
      size: vec3(CELL * 0.52, CELL * 0.52, CELL * 0.52),
      yaw: sway * 2,
      color: crop.fruitColor,
      outline: null,
    })
  }
}

/** แปลงหนึ่งแปลง พร้อมขอบแปลงและต้นพืชทุกช่อง */
function emitPlot(out: SceneFace[], plot: Plot, index: number, time: number): void {
  const anchor = plotAnchor(index)
  const width = plot.size.cols * CELL
  const depth = plot.size.rows * CELL
  const wet = plot.planting?.wateredToday ?? false

  // ขอบแปลงยกสูงเล็กน้อย ทำให้อ่านเป็น "แปลง" ไม่ใช่สีที่ทาไว้บนพื้น
  emitBox(out, {
    center: vec3(anchor.x, 0.09, anchor.z),
    size: vec3(width + 0.5, 0.18, depth + 0.5),
    color: '#8a6b4a',
    topColor: '#a08059',
    outline: '#3d2a1c',
    skipBottom: true,
  })
  emitFloorRect(out, anchor.x, anchor.z, width, depth, 0.19, wet ? SOIL_WET : SOIL)

  if (!plot.planting) return
  for (let col = 0; col < plot.size.cols; col += 1) {
    for (let row = 0; row < plot.size.rows; row += 1) {
      const x = anchor.x - width / 2 + (col + 0.5) * CELL
      const z = anchor.z - depth / 2 + (row + 0.5) * CELL
      emitPlant(out, x, z, plot, time)
    }
  }
}

/** แปลงที่ยังไม่ได้เปิด วาดเป็นพื้นที่ว่างที่มองเห็นว่ารออยู่ */
function emitLockedPlot(out: SceneFace[], index: number): void {
  const anchor = plotAnchor(index)
  emitFloorRect(out, anchor.x, anchor.z, 3.4, 3.4, 0.02, '#3f6b45', 0.55)
  for (const corner of [
    [-1.7, -1.7],
    [1.7, -1.7],
    [1.7, 1.7],
    [-1.7, 1.7],
  ]) {
    emitBox(out, {
      center: vec3(anchor.x + (corner[0] as number), 0.24, anchor.z + (corner[1] as number)),
      size: vec3(0.12, 0.48, 0.12),
      color: '#cfe3d0',
      outline: null,
      alpha: 0.7,
      skipBottom: true,
    })
  }
}

/** คอกสัตว์หนึ่งคอก แสดงตัวสัตว์ไม่เกินแปดตัวต่อคอก */
function emitPen(out: SceneFace[], farm: FarmState, index: number, time: number): void {
  const herd = farm.herds[index]
  const anchor = penAnchor(index)

  emitFloorRect(out, anchor.x, anchor.z, 5, 4, 0.02, herd ? '#a8935f' : '#6f8a6f', herd ? 1 : 0.5)
  // เสารั้วสี่มุม อ่านเป็นคอกโดยไม่ต้องวาดรั้วทั้งแถบ ซึ่งกินหน้ามาก
  for (const corner of [
    [-2.4, -1.9],
    [2.4, -1.9],
    [2.4, 1.9],
    [-2.4, 1.9],
  ]) {
    emitBox(out, {
      center: vec3(anchor.x + (corner[0] as number), 0.3, anchor.z + (corner[1] as number)),
      size: vec3(0.16, 0.6, 0.16),
      color: '#8a6b4a',
      outline: null,
      skipBottom: true,
    })
  }
  if (!herd || herd.count === 0) return

  const animal = findAnimal(herd.animal)
  const shown = Math.min(8, herd.count)
  for (let n = 0; n < shown; n += 1) {
    const across = n % 4
    const back = Math.floor(n / 4)
    const x = anchor.x - 1.5 + across * 1
    const z = anchor.z - 0.6 + back * 1.2
    const bob = Math.sin(time * 0.002 + n * 1.3) * 0.04

    emitBox(out, {
      center: vec3(x, 0.28 + bob, z),
      size: vec3(0.52, 0.4, 0.36),
      yaw: Math.sin(time * 0.0008 + n) * 0.3,
      color: animal.color,
      outline: '#3d3226',
      skipBottom: true,
    })
    emitBox(out, {
      center: vec3(x + 0.28, 0.5 + bob, z),
      size: vec3(0.24, 0.24, 0.24),
      color: animal.color,
      outline: '#3d3226',
    })
  }
}

/** อาคารผลิตทรัพยากร แต่ละชนิดรูปทรงต่างกันให้แยกออกแต่ไกล */
function emitBuilding(out: SceneFace[], farm: FarmState, index: number): void {
  const spec = BUILDINGS[index]
  if (!spec) return
  const count = farm.buildings[spec.id] ?? 0
  const anchor = buildingAnchor(index)

  emitFloorRect(out, anchor.x, anchor.z, 5, 4, 0.02, '#7d8a8f', count > 0 ? 1 : 0.45)
  if (count === 0) return

  const shown = Math.min(4, count)
  for (let n = 0; n < shown; n += 1) {
    const x = anchor.x - 1.4 + (n % 2) * 2.8
    const z = anchor.z - 0.8 + Math.floor(n / 2) * 1.6

    if (spec.id === 'solar') {
      // แผงเอียงรับแสง ใช้การหมุนรอบแกนตั้งอย่างเดียวไม่ได้ จึงทำเป็นสองชั้นซ้อน
      emitBox(out, {
        center: vec3(x, 0.35, z),
        size: vec3(0.18, 0.7, 0.18),
        color: '#5c6670',
        outline: '#232a30',
        skipBottom: true,
      })
      emitBox(out, {
        center: vec3(x, 0.78, z),
        size: vec3(1.9, 0.14, 1.3),
        yaw: 0.35,
        color: spec.color,
        topColor: '#5f86c4',
        outline: '#1d2836',
      })
    } else if (spec.id === 'purifier') {
      emitBox(out, {
        center: vec3(x, 0.55, z),
        size: vec3(1.1, 1.1, 1.1),
        color: spec.color,
        topColor: '#57b0cc',
        outline: '#14323d',
        skipBottom: true,
      })
      emitBox(out, {
        center: vec3(x, 1.25, z),
        size: vec3(0.5, 0.3, 0.5),
        color: '#9fdcea',
        outline: null,
        emissive: true,
        alpha: 0.85,
      })
    } else {
      emitBox(out, {
        center: vec3(x, 0.85, z),
        size: vec3(0.8, 1.7, 0.8),
        color: spec.color,
        topColor: '#8fd0dd',
        outline: '#1b3b42',
        skipBottom: true,
      })
    }
  }
}

/** เสาค้ำโดมที่ขอบฉาก ทำให้รู้ว่าอยู่ในที่ปิด ไม่ใช่ทุ่งโล่ง */
function emitDomeFrame(out: SceneFace[]): void {
  for (const [x, z] of [
    [SCENE_BOUNDS.minX, SCENE_BOUNDS.minZ],
    [SCENE_BOUNDS.maxX, SCENE_BOUNDS.minZ],
    [SCENE_BOUNDS.maxX, SCENE_BOUNDS.maxZ],
    [SCENE_BOUNDS.minX, SCENE_BOUNDS.maxZ],
  ] as const) {
    emitBox(out, {
      center: vec3(x, 1.8, z),
      size: vec3(0.5, 3.6, 0.5),
      color: '#cfe3dd',
      topColor: '#e6f3ee',
      outline: '#5d7d75',
      skipBottom: true,
    })
  }
}

/** ท้องฟ้าที่มองผ่านกระจกโดมออกไป */
function drawSky(ctx: CanvasRenderingContext2D, viewport: Viewport): void {
  const sky = ctx.createLinearGradient(0, 0, 0, viewport.height)
  sky.addColorStop(0, SKY_TOP)
  sky.addColorStop(0.62, SKY_HORIZON)
  sky.addColorStop(1, FOG_COLOR)
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, viewport.width, viewport.height)
}

/** เส้นกระจกของโดมที่โค้งคลุมทั้งฉาก วาดทับท้องฟ้าก่อนวาดของในฉาก */
function drawDomeShell(ctx: CanvasRenderingContext2D, viewport: Viewport): void {
  const centerX = viewport.width / 2
  const baseY = viewport.height * 0.93
  const radius = viewport.width * 0.62

  ctx.save()
  ctx.beginPath()
  ctx.arc(centerX, baseY, radius, Math.PI, Math.PI * 2)
  ctx.closePath()
  const glass = ctx.createLinearGradient(centerX, baseY - radius, centerX, baseY)
  glass.addColorStop(0, 'rgba(226, 247, 240, 0.30)')
  glass.addColorStop(1, 'rgba(150, 214, 196, 0.05)')
  ctx.fillStyle = glass
  ctx.fill()

  ctx.lineWidth = 2
  ctx.strokeStyle = 'rgba(233, 250, 244, 0.55)'
  ctx.stroke()

  ctx.lineWidth = 1
  ctx.strokeStyle = 'rgba(233, 250, 244, 0.22)'
  for (let step = 1; step <= 5; step += 1) {
    const angle = Math.PI + (Math.PI * step) / 6
    ctx.beginPath()
    ctx.moveTo(centerX, baseY)
    ctx.lineTo(centerX + Math.cos(angle) * radius, baseY + Math.sin(angle) * radius)
    ctx.stroke()
  }
  ctx.restore()
}

export interface FarmDrawOptions {
  time: number
  reduceMotion?: boolean
  /** แปลงที่กำลังถูกเลือกอยู่ วาดกรอบเรืองแสงรอบ ๆ */
  selectedPlot?: number | null
}

/** วงแหวนบอกว่าแปลงไหนถูกเลือกอยู่ วาดเป็นภาพสองมิติทับฉาก */
function drawSelection(
  ctx: CanvasRenderingContext2D,
  viewport: Viewport,
  index: number,
): void {
  const anchor = plotAnchor(index)
  const point = projectPoint(vec3(anchor.x, 0.2, anchor.z), viewport)
  const { scale } = farmView(viewport)

  ctx.save()
  ctx.translate(point.x, point.y)
  ctx.scale(1, Math.sin(CAMERA_PITCH))
  ctx.beginPath()
  ctx.arc(0, 0, scale * 3.1, 0, Math.PI * 2)
  ctx.strokeStyle = 'rgba(253, 224, 71, 0.95)'
  ctx.lineWidth = 3
  ctx.stroke()
  ctx.restore()
}

/** วาดหนึ่งเฟรม */
export function drawFarm(
  canvas: HTMLCanvasElement | null,
  farm: FarmState,
  options: FarmDrawOptions,
): void {
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const viewport: Viewport = { width: canvas.width, height: canvas.height }
  const time = options.reduceMotion ? 0 : options.time

  ctx.clearRect(0, 0, viewport.width, viewport.height)
  drawSky(ctx, viewport)
  drawDomeShell(ctx, viewport)

  const faces: SceneFace[] = []
  emitGround(faces)
  emitDomeFrame(faces)
  for (let index = 0; index < MAX_PLOTS; index += 1) {
    const plot = farm.plots[index]
    if (plot) emitPlot(faces, plot, index, time)
    else emitLockedPlot(faces, index)
  }
  for (let index = 0; index < 3; index += 1) {
    emitPen(faces, farm, index, time)
    emitBuilding(faces, farm, index)
  }

  /*
   * ปิดหมอกด้วยการตั้งระยะไว้ไกลกว่าทุกอย่างในฉาก
   *
   * หมอกมีไว้บอกระยะ ซึ่งใช้ได้ดีกับเขาวงกตที่ของอยู่คนละระยะกันจริง ๆ
   * แต่กล้องออร์โทกราฟิกวางไว้ห่างฉากแปดสิบหน่วย ของทุกชิ้นในฟาร์ม
   * จึงอยู่ที่ความลึกใกล้เคียงกันหมด ตอนแรกตั้งหมอกไว้ที่สี่สิบหก
   * ผลคือทั้งฉากจมหมอกเท่ากันหมด กลายเป็นภาพสีเขียวซีดที่แยกอะไรไม่ออกเลย
   */
  const view = farmView(viewport)
  paintScene(ctx, faces, view.camera, viewport, {
    fogColor: FOG_COLOR,
    fogStart: 400,
    fogEnd: 800,
    cullDistance: Infinity,
    orthographic: view.scale,
    outlineFade: Infinity,
    offsetX: view.offsetX,
    offsetY: view.offsetY,
  })

  if (options.selectedPlot !== null && options.selectedPlot !== undefined) {
    drawSelection(ctx, viewport, options.selectedPlot)
  }
}

/** ตัวคูณของกล้อง เผื่อหน้าจอต้องใช้คำนวณขนาดปุ่มให้พอดีกับแปลง */
export { projectionScale }
