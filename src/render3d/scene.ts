/**
 * แกนกลางของการวาดฉากสามมิติ ใช้ร่วมกันทุกโหมด
 *
 * เดิมโค้ดชุดนี้อยู่ใน safezone/render3d.ts ไฟล์เดียว
 * พอจะทำฟาร์มในโดมซึ่งเป็นฉากสามมิติเหมือนกัน จึงมีทางเลือกสองทาง
 * คือคัดลอกไปทั้งชุด หรือแยกส่วนที่ไม่รู้จักเนื้อหาของฉากออกมา
 *
 * เลือกทางหลัง เพราะส่วนที่คัดลอกจะเป็นส่วนที่แก้ยากที่สุดพอดี
 * คือการตัดระนาบใกล้ การเรียงลำดับวาด และสูตรแสงกับหมอก
 * ถ้ามีสองสำเนา วันที่แก้บั๊กเรื่องการเรียงลำดับ จะแก้ที่เดียวแล้วลืมอีกที่แน่นอน
 * และอาการของบั๊กชนิดนี้คือภาพเพี้ยนเป็นบางมุม ซึ่งไม่มีชุดทดสอบไหนจับได้
 *
 * ไฟล์นี้ไม่รู้จักเขาวงกต ไม่รู้จักฟาร์ม รู้แค่ว่ามีหน้าอยู่ชุดหนึ่ง
 * กล้องอยู่ตรงไหน แล้วต้องระบายลงผืนผ้าใบอย่างไรให้ลำดับหน้าหลังถูกต้อง
 */

import {
  clipNearPlane,
  faceBrightness,
  parseHex,
  projectionScale,
  toView,
  vec3,
} from '../safezone/vector3'
import type { Camera, Face, Vec3, Viewport } from '../safezone/vector3'

/**
 * หน้าหนึ่งหน้าในฉาก
 *
 * เพิ่มจาก Face สองอย่าง คือความโปร่งใส และชั้นการวาด
 *
 * เรื่องชั้นการวาดมีที่มา วิธีจิตรกรเรียงหน้าตามความลึกของจุดกึ่งกลาง
 * ซึ่งใช้ได้กับของขนาดใกล้เคียงกัน แต่พื้นหนึ่งแผ่นกว้างหลายหน่วยวางราบ
 * มีจุดกึ่งกลางเดียวแต่กินความลึกยาวมาก จึงสลับหน้าหลังกับตัวละครได้ง่าย
 * อาการคือพื้นแผ่นที่อยู่ข้างหลังโผล่มาทับตัวละครเป็นสามเหลี่ยม
 *
 * แต่กล้องของเกมกลุ่มนี้อยู่สูงกว่าของทุกชิ้นเสมอและก้มลงเสมอ
 * แปลว่าพื้นที่ y ใกล้ศูนย์ไม่มีวันบังอะไรได้เลย เพราะไม่มีอะไรอยู่ต่ำกว่าพื้น
 * จึงวาดพื้นให้จบก่อนแล้วค่อยวาดของที่ตั้งอยู่บนพื้น ซึ่งถูกต้องเสมอ
 * โดยไม่ต้องแบ่งพื้นเป็นชิ้นเล็ก ๆ ให้ต้องวาดเพิ่มอีกหลายเท่า
 */
export interface SceneFace extends Face {
  alpha: number
  /** 0 = แผ่นพื้นที่วางราบ, 1 = ของที่ตั้งอยู่บนพื้น */
  layer: 0 | 1
}

/** ด้านทั้งหกของกล่องหนึ่งใบ พิกัดเป็นสัดส่วนของครึ่งขนาด */
const BOX_FACES: readonly {
  normal: readonly [number, number, number]
  corners: readonly (readonly [number, number, number])[]
}[] = [
  {
    normal: [0, 1, 0],
    corners: [
      [-1, 1, -1],
      [1, 1, -1],
      [1, 1, 1],
      [-1, 1, 1],
    ],
  },
  {
    normal: [0, -1, 0],
    corners: [
      [-1, -1, 1],
      [1, -1, 1],
      [1, -1, -1],
      [-1, -1, -1],
    ],
  },
  {
    normal: [0, 0, -1],
    corners: [
      [-1, 1, -1],
      [-1, -1, -1],
      [1, -1, -1],
      [1, 1, -1],
    ],
  },
  {
    normal: [0, 0, 1],
    corners: [
      [1, 1, 1],
      [1, -1, 1],
      [-1, -1, 1],
      [-1, 1, 1],
    ],
  },
  {
    normal: [-1, 0, 0],
    corners: [
      [-1, 1, 1],
      [-1, -1, 1],
      [-1, -1, -1],
      [-1, 1, -1],
    ],
  },
  {
    normal: [1, 0, 0],
    corners: [
      [1, 1, -1],
      [1, -1, -1],
      [1, -1, 1],
      [1, 1, 1],
    ],
  },
]

export interface BoxOptions {
  center: Vec3
  size: Vec3
  /** หมุนรอบแกนตั้ง หน่วยเรเดียน */
  yaw?: number
  color: string
  /** สีของหน้าบน ใส่เมื่ออยากให้หลังคาต่างจากผนัง */
  topColor?: string
  outline?: string | null
  /**
   * หน้านี้เรืองแสงเอง ไม่รับแสงอาทิตย์และไม่จมหมอก
   * ใช้กับจอโฮโลแกรมและไฟ ซึ่งต้องเห็นชัดแม้อยู่ไกล
   */
  emissive?: boolean
  alpha?: number
  /** ข้ามหน้าล่าง ใช้กับของที่ตั้งอยู่บนพื้นซึ่งไม่มีวันเห็นก้น */
  skipBottom?: boolean
}

/** แตกกล่องหนึ่งใบออกเป็นหน้า แล้วต่อท้ายรายการที่ส่งเข้ามา */
export function emitBox(out: SceneFace[], options: BoxOptions): void {
  const yaw = options.yaw ?? 0
  const cos = Math.cos(yaw)
  const sin = Math.sin(yaw)
  const half = {
    x: options.size.x / 2,
    y: options.size.y / 2,
    z: options.size.z / 2,
  }

  for (const face of BOX_FACES) {
    if (options.skipBottom && face.normal[1] === -1) continue

    const rotate = (x: number, z: number): { x: number; z: number } => ({
      x: x * cos + z * sin,
      z: -x * sin + z * cos,
    })

    const rotatedNormal = rotate(face.normal[0], face.normal[2])
    const points = face.corners.map((corner) => {
      const spun = rotate(corner[0] * half.x, corner[2] * half.z)
      return vec3(
        options.center.x + spun.x,
        options.center.y + corner[1] * half.y,
        options.center.z + spun.z,
      )
    })

    out.push({
      points,
      normal: vec3(rotatedNormal.x, face.normal[1], rotatedNormal.z),
      color: face.normal[1] === 1 ? (options.topColor ?? options.color) : options.color,
      outline: options.outline ?? null,
      emissive: options.emissive,
      alpha: options.alpha ?? 1,
      layer: 1,
    })
  }
}

/** แผ่นราบวางบนพื้น ใช้กับพื้นดิน แผ่นปูทาง และเงาใต้ของ */
export function emitFloorTile(
  out: SceneFace[],
  x: number,
  z: number,
  size: number,
  y: number,
  color: string,
  alpha = 1,
): void {
  const half = size / 2
  out.push({
    points: [
      vec3(x - half, y, z - half),
      vec3(x + half, y, z - half),
      vec3(x + half, y, z + half),
      vec3(x - half, y, z + half),
    ],
    normal: vec3(0, 1, 0),
    color,
    outline: null,
    alpha,
    layer: 0,
  })
}

/** แผ่นราบที่ไม่ใช่สี่เหลี่ยมจัตุรัส ใช้กับแปลงปลูกที่กว้างยาวไม่เท่ากัน */
export function emitFloorRect(
  out: SceneFace[],
  x: number,
  z: number,
  width: number,
  depth: number,
  y: number,
  color: string,
  alpha = 1,
): void {
  const hw = width / 2
  const hd = depth / 2
  out.push({
    points: [
      vec3(x - hw, y, z - hd),
      vec3(x + hw, y, z - hd),
      vec3(x + hw, y, z + hd),
      vec3(x - hw, y, z + hd),
    ],
    normal: vec3(0, 1, 0),
    color,
    outline: null,
    alpha,
    layer: 0,
  })
}

export interface PaintOptions {
  /** สีที่ของไกล ๆ จะค่อย ๆ กลายเป็น */
  fogColor: string
  /** ระยะที่หมอกเริ่มจับ */
  fogStart: number
  /** ระยะที่หมอกกลืนจนหมด */
  fogEnd: number
  /** ไกลกว่านี้ไม่ต้องวาด */
  cullDistance: number
  /**
   * ใส่ค่านี้เมื่อต้องการกล้องออร์โทกราฟิก ค่าคือจำนวนพิกเซลต่อหนึ่งหน่วยโลก
   *
   * ฉากเขาวงกตใช้เพอร์สเปกทีฟเพราะต้องรู้สึกว่ากำลังยืนอยู่ในนั้น
   * ส่วนฟาร์มใช้ออร์โทกราฟิก เพราะสิ่งที่ต้องอ่านคือ "แปลงนี้กว้างกี่ช่อง"
   * ซึ่งเพอร์สเปกทีฟทำให้ผิดพลาดได้ แถวหลังของแปลงเดียวกันจะดูแคบกว่าแถวหน้า
   * ทั้งที่เป็นแปลงสี่เหลี่ยมผืนผ้าปกติ ซึ่งขัดกับโจทย์เรื่องพื้นที่โดยตรง
   */
  orthographic?: number
  /** ระยะที่เส้นขอบจางหายไปหมด ไม่ใส่ = ใช้สองเท่าของ fogStart */
  outlineFade?: number
  /**
   * เลื่อนภาพทั้งฉากบนจอ หน่วยพิกเซล
   *
   * จำเป็นกับกล้องออร์โทกราฟิก เพราะจุดที่ฉายไปตรงกลางจอคือจุดกำเนิดของโลก
   * ซึ่งไม่ใช่จุดกึ่งกลางของ "ภาพที่ออกมา" เลย พอฉากไม่ได้สมมาตรรอบจุดกำเนิด
   * ในสายตาของกล้องเอียง ภาพจะเบี้ยวไปมุมใดมุมหนึ่งแล้วเหลือที่ว่างอีกมุม
   */
  offsetX?: number
  offsetY?: number
}

function clampChannel(value: number): number {
  return Math.round(Math.max(0, Math.min(255, value)))
}

/** สีสุดท้ายของหน้าหนึ่งหน้า หลังคิดแสงอาทิตย์และหมอกแล้ว */
function shadeFace(
  face: SceneFace,
  depth: number,
  fog: { r: number; g: number; b: number },
  fogStart: number,
  fogEnd: number,
): string {
  const base = parseHex(face.color)
  const light = face.emissive ? 1.05 : faceBrightness(face.normal)
  const amount = face.emissive
    ? 0
    : Math.max(0, Math.min(1, (depth - fogStart) / (fogEnd - fogStart))) * 0.92

  const r = clampChannel(base.r * light + (fog.r - base.r * light) * amount)
  const g = clampChannel(base.g * light + (fog.g - base.g * light) * amount)
  const b = clampChannel(base.b * light + (fog.b - base.b * light) * amount)
  return `rgb(${r}, ${g}, ${b})`
}

/**
 * ระบายหน้าทั้งชุดลงผืนผ้าใบ
 *
 * ทำสามอย่างในรอบเดียว คือทิ้งหน้าที่หันหลังให้กล้อง ตัดส่วนที่อยู่หลังกล้อง
 * แล้วแปลงเป็นพิกัดจอ การรวมไว้รอบเดียวสำคัญกว่าที่คิด เพราะสามงานนี้
 * ต้องทำกับทุกหน้าในทุกเฟรม การแยกเป็นสามรอบคือการวนสามพันครั้งต่อวินาที
 */
export function paintScene(
  ctx: CanvasRenderingContext2D,
  faces: readonly SceneFace[],
  camera: Camera,
  viewport: Viewport,
  options: PaintOptions,
): void {
  const scale = options.orthographic ?? projectionScale(viewport, camera.fov)
  const fog = parseHex(options.fogColor)
  const outlineFade = options.outlineFade ?? options.fogStart * 2

  const ready: {
    face: SceneFace
    screen: { x: number; y: number }[]
    depth: number
    height: number
  }[] = []

  for (const face of faces) {
    const first = face.points[0] as Vec3
    const toFace = {
      x: first.x - camera.position.x,
      y: first.y - camera.position.y,
      z: first.z - camera.position.z,
    }
    if (
      !face.emissive &&
      face.normal.x * toFace.x + face.normal.y * toFace.y + face.normal.z * toFace.z >= 0
    ) {
      continue
    }

    const viewPoints = face.points.map((point) => toView(point, camera))
    const clipped = clipNearPlane(viewPoints)
    if (clipped.length < 3) continue

    let depth = 0
    const screen = clipped.map((point) => {
      depth += point.z
      /*
       * ต่างกันแค่บรรทัดนี้บรรทัดเดียว
       *
       * เพอร์สเปกทีฟหารด้วยความลึก ของไกลจึงเล็กลง
       * ออร์โทกราฟิกไม่หาร ของขนาดเท่ากันจึงวาดเท่ากันไม่ว่าอยู่ไกลแค่ไหน
       * ความลึกยังถูกเก็บไว้อยู่ เพราะยังต้องใช้เรียงลำดับวาดและคิดหมอก
       */
      const inverse = options.orthographic === undefined ? scale / point.z : scale
      return {
        x: viewport.width / 2 + point.x * inverse + (options.offsetX ?? 0),
        y: viewport.height / 2 - point.y * inverse + (options.offsetY ?? 0),
      }
    })
    depth /= clipped.length
    if (depth > options.cullDistance) continue

    // ทิ้งหน้าที่อยู่นอกจอทั้งหน้า ประหยัดการเรียก fill ที่ไม่มีผลกับภาพ
    let minX = Infinity
    let maxX = -Infinity
    let minY = Infinity
    let maxY = -Infinity
    for (const point of screen) {
      if (point.x < minX) minX = point.x
      if (point.x > maxX) maxX = point.x
      if (point.y < minY) minY = point.y
      if (point.y > maxY) maxY = point.y
    }
    if (maxX < 0 || minX > viewport.width || maxY < 0 || minY > viewport.height) continue

    ready.push({ face, screen, depth, height: (face.points[0] as Vec3).y })
  }

  /*
   * พื้นก่อน แล้วค่อยของที่ตั้งบนพื้น
   *
   * ในกลุ่มพื้นด้วยกันเรียงตามความสูง ไม่ใช่ความลึก เพราะแผ่นพื้นคนละช่อง
   * ไม่มีทางซ้อนกันบนจอเมื่อมองจากด้านบน ที่ซ้อนกันจริงคือแผ่นที่วางทับกัน
   * ในช่องเดียวกัน เช่นแผ่นทางเดินที่วางบนพื้นดิน ซึ่งต่างกันที่ความสูง
   */
  ready.sort((a, b) => {
    if (a.face.layer !== b.face.layer) return a.face.layer - b.face.layer
    if (a.face.layer === 0) return a.height - b.height
    return b.depth - a.depth
  })

  for (const item of ready) {
    ctx.globalAlpha = item.face.alpha
    ctx.fillStyle = shadeFace(item.face, item.depth, fog, options.fogStart, options.fogEnd)
    ctx.beginPath()
    const first = item.screen[0] as { x: number; y: number }
    ctx.moveTo(first.x, first.y)
    for (let index = 1; index < item.screen.length; index += 1) {
      const point = item.screen[index] as { x: number; y: number }
      ctx.lineTo(point.x, point.y)
    }
    ctx.closePath()
    ctx.fill()

    if (item.face.outline && item.depth < outlineFade) {
      /*
       * เส้นขอบจางลงตามระยะ ไม่ใช่เข้มเท่ากันทุกระยะ
       * เส้นที่เข้มเท่ากันหมดทำให้ของไกล ๆ กลายเป็นตาข่ายสีดำทึบ
       * เพราะเส้นมีความหนาคงที่ แต่ตัวของเล็กลงเรื่อย ๆ จนเหลือแต่เส้น
       */
      ctx.globalAlpha = item.face.alpha * Math.max(0, 1 - item.depth / outlineFade)
      ctx.strokeStyle = item.face.outline
      ctx.lineWidth = 1.2
      ctx.lineJoin = 'round'
      ctx.stroke()
    }
  }
  ctx.globalAlpha = 1
}
