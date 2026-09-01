/**
 * คณิตศาสตร์สามมิติสำหรับ Safe Zone Guardians
 *
 * ทำไมต้องเขียนเอง ไม่ใช้ three.js
 *
 * เครื่องที่พัฒนาโปรเจกต์นี้เข้า npm registry ไม่ได้ (403)
 * การเพิ่ม dependency ใหม่จึงทำให้ทั้งโปรเจกต์คอมไพล์ในเครื่องไม่ได้ทันที
 * ต้องรอ CI ทุกรอบ ซึ่งเสียเวลารอบละหลายนาทีต่อการแก้หนึ่งบรรทัด
 *
 * ที่สำคัญกว่านั้นคือ ฉากของเกมนี้เป็นกล่องสี่เหลี่ยมวางบนตารางล้วน ๆ
 * ไม่มีโมเดลจากไฟล์ ไม่มีพื้นผิว ไม่มีเงาแบบคำนวณจริง
 * งานทั้งหมดที่ต้องใช้จึงมีแค่ "หมุนจุด ฉายลงจอ แล้วเรียงตามความลึก"
 * ซึ่งเขียนได้ในไฟล์เดียวและทดสอบได้ด้วย Node ธรรมดาโดยไม่ต้องมีเบราว์เซอร์
 *
 * ไฟล์นี้ตั้งใจไม่แตะ canvas เลย เพื่อให้ชุดทดสอบเรียกได้ตรง ๆ
 * ส่วนการวาดจริงอยู่ที่ render3d.ts
 */

export interface Vec3 {
  x: number
  /** ขึ้นด้านบนเป็นบวก พื้นอยู่ที่ y = 0 */
  y: number
  z: number
}

/**
 * กล้อง
 *
 * yaw = หันซ้ายขวา 0 คือมองไปทาง +z, π/2 คือมองไปทาง +x
 * pitch = ก้มเงย ค่าบวกคือก้มลง (กล้องมุมสามคนอยู่สูงกว่าตัวละครจึงก้มเสมอ)
 */
export interface Camera {
  position: Vec3
  yaw: number
  pitch: number
  /** มุมมองแนวตั้ง หน่วยเรเดียน */
  fov: number
}

export interface Viewport {
  width: number
  height: number
}

/** จุดบนจอพร้อมความลึก ใช้เรียงลำดับการวาด */
export interface ScreenPoint {
  x: number
  y: number
  depth: number
}

/**
 * ระนาบใกล้
 *
 * จุดที่อยู่ใกล้กว่านี้ต้องถูกตัดทิ้ง ไม่ใช่เพราะความสวยงาม
 * แต่เพราะการฉายภาพหารด้วยความลึก จุดที่ความลึกเข้าใกล้ศูนย์
 * จะได้พิกัดจอเป็นหลักแสนพิกเซล แล้วรูปจะพุ่งกระจายเต็มจอ
 */
export const NEAR_PLANE = 0.2

export function vec3(x: number, y: number, z: number): Vec3 {
  return { x, y, z }
}

export function subtract(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z }
}

export function cross(a: Vec3, b: Vec3): Vec3 {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  }
}

export function dot(a: Vec3, b: Vec3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z
}

export function length(v: Vec3): number {
  return Math.sqrt(dot(v, v))
}

export function normalize(v: Vec3): Vec3 {
  const len = length(v)
  if (len === 0) return { x: 0, y: 0, z: 0 }
  return { x: v.x / len, y: v.y / len, z: v.z / len }
}

/** ระยะทางบนพื้นราบ ใช้บ่อยเพราะการเดินและการชนไม่สนใจความสูง */
export function distanceXZ(a: Vec3, b: Vec3): number {
  const dx = a.x - b.x
  const dz = a.z - b.z
  return Math.sqrt(dx * dx + dz * dz)
}

/**
 * ย้ายจุดจากพิกัดโลกเข้าสู่พิกัดกล้อง
 *
 * ผลลัพธ์: z เป็นบวกคืออยู่ข้างหน้ากล้อง, x เป็นบวกคืออยู่ทางขวา,
 * y เป็นบวกคืออยู่ด้านบน ซึ่งเป็นระบบเดียวกับที่ตาคนใช้อ่านภาพ
 */
export function toView(point: Vec3, camera: Camera): Vec3 {
  const dx = point.x - camera.position.x
  const dy = point.y - camera.position.y
  const dz = point.z - camera.position.z

  const cosYaw = Math.cos(camera.yaw)
  const sinYaw = Math.sin(camera.yaw)
  const rx = dx * cosYaw - dz * sinYaw
  const rz = dx * sinYaw + dz * cosYaw

  const cosPitch = Math.cos(camera.pitch)
  const sinPitch = Math.sin(camera.pitch)
  return {
    x: rx,
    y: dy * cosPitch + rz * sinPitch,
    z: -dy * sinPitch + rz * cosPitch,
  }
}

/**
 * ตัวคูณจากพิกัดกล้องไปเป็นพิกเซล
 *
 * อิงความสูงของจอ ไม่ใช่ความกว้าง เพราะจอของเด็กมีทั้งแนวตั้งและแนวนอน
 * ถ้าอิงความกว้าง พอหมุนเป็นแนวตั้งแล้วภาพจะซูมเข้าจนมองไม่เห็นทาง
 */
export function projectionScale(viewport: Viewport, fov: number): number {
  return viewport.height / 2 / Math.tan(fov / 2)
}

/** ฉายจุดในพิกัดกล้องลงบนจอ คืน null ถ้าจุดอยู่หลังระนาบใกล้ */
export function projectView(
  viewPoint: Vec3,
  viewport: Viewport,
  fov: number,
): ScreenPoint | null {
  if (viewPoint.z < NEAR_PLANE) return null
  const scale = projectionScale(viewport, fov)
  return {
    x: viewport.width / 2 + (viewPoint.x * scale) / viewPoint.z,
    // ลบเพราะแกน y ของผืนผ้าใบชี้ลง แต่แกน y ของโลกชี้ขึ้น
    y: viewport.height / 2 - (viewPoint.y * scale) / viewPoint.z,
    depth: viewPoint.z,
  }
}

/**
 * ตัดรูปหลายเหลี่ยมด้วยระนาบใกล้ (Sutherland–Hodgman เฉพาะระนาบเดียว)
 *
 * ทำไมต้องตัดแทนที่จะทิ้งทั้งรูปเมื่อมีมุมใดมุมหนึ่งอยู่หลังกล้อง
 * เพราะกำแพงที่ผู้เล่นเดินชิดอยู่จะมีมุมล่างอยู่หลังกล้องเสมอ
 * ถ้าทิ้งทั้งรูป กำแพงที่อยู่ติดหน้าจะหายไปทั้งแผ่น เห็นทะลุออกไปนอกเขาวงกต
 * ซึ่งเป็นข้อผิดพลาดที่สังเกตเห็นได้ทันทีและทำให้ฉากดูพัง
 */
export function clipNearPlane(polygon: readonly Vec3[]): Vec3[] {
  if (polygon.length === 0) return []

  const output: Vec3[] = []
  for (let index = 0; index < polygon.length; index += 1) {
    const current = polygon[index] as Vec3
    const previous = polygon[(index + polygon.length - 1) % polygon.length] as Vec3

    const currentInside = current.z >= NEAR_PLANE
    const previousInside = previous.z >= NEAR_PLANE

    if (currentInside !== previousInside) {
      const t = (NEAR_PLANE - previous.z) / (current.z - previous.z)
      output.push({
        x: previous.x + (current.x - previous.x) * t,
        y: previous.y + (current.y - previous.y) * t,
        z: NEAR_PLANE,
      })
    }
    if (currentInside) output.push(current)
  }
  return output
}

/**
 * หน้าหนึ่งหน้าของวัตถุ
 *
 * เก็บเส้นตั้งฉาก (normal) ไว้ตรง ๆ แทนการคำนวณจากลำดับจุด
 * เพราะการคำนวณจากลำดับจุดต้องอาศัยกฎว่าทุกหน้าเรียงจุดทิศเดียวกันเสมอ
 * ซึ่งเป็นกฎที่ผิดพลาดได้ง่ายมากเวลาเพิ่มวัตถุใหม่ และเมื่อผิดแล้ว
 * อาการคือหน้าหายไปเป็นรู ๆ ซึ่งหาสาเหตุยากกว่าการพิมพ์ normal เพิ่มสามตัวเลข
 */
export interface Face {
  points: Vec3[]
  normal: Vec3
  /** สีฐานก่อนคิดแสงและหมอก */
  color: string
  /** สีเส้นขอบ ใส่ null เมื่อไม่ต้องการเส้น เช่น พื้นที่ต่อกันเป็นผืนเดียว */
  outline: string | null
  /**
   * หน้านี้เรืองแสงเอง ไม่รับแสงอาทิตย์และไม่จมหมอก
   * ใช้กับจอโฮโลแกรมและไฟของโดรน ซึ่งต้องเห็นชัดแม้อยู่ไกล
   */
  emissive?: boolean
}

/** ทิศของแสงอาทิตย์ ชี้จากฉากไปหาดวงอาทิตย์ */
export const SUN_DIRECTION: Vec3 = normalize({ x: -0.45, y: 0.78, z: -0.44 })

/** แยกสีทึบรูปแบบ #rrggbb ออกเป็นสามช่อง */
export function parseHex(hex: string): { r: number; g: number; b: number } {
  const value = hex.startsWith('#') ? hex.slice(1) : hex
  const full =
    value.length === 3
      ? value
          .split('')
          .map((character) => character + character)
          .join('')
      : value
  const number = Number.parseInt(full, 16)
  if (!Number.isFinite(number)) return { r: 255, g: 0, b: 255 }
  return {
    r: (number >> 16) & 0xff,
    g: (number >> 8) & 0xff,
    b: number & 0xff,
  }
}

function clampByte(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)))
}

/**
 * ประกอบสามช่องกลับเป็นข้อความ #rrggbb
 *
 * ตั้งใจคืนเป็นรูปแบบเดียวกับที่รับเข้ามา ไม่ใช่ rgb(...) ที่ผืนผ้าใบก็ใช้ได้
 * เพราะสีที่ผสมแล้วมักถูกส่งต่อไปผสมซ้ำอีกชั้น เช่นสีหลังคาที่ผสมจากสีผนัง
 * แล้วยังต้องเข้าสูตรแสงกับหมอกต่ออีกที ถ้าคืนเป็น rgb(...) ชั้นถัดไป
 * จะแยกสีไม่ออกแล้วได้สีชมพูบานเย็นแทน ซึ่งเป็นสิ่งที่เกิดขึ้นจริงมาแล้ว
 * และเห็นเป็นหลังคาสีชมพูสดทั้งเมืองตอนเรนเดอร์ภาพออกมาดู
 */
function toHex(r: number, g: number, b: number): string {
  const channel = (value: number): string =>
    clampByte(value).toString(16).padStart(2, '0')
  return `#${channel(r)}${channel(g)}${channel(b)}`
}

/** ผสมสองสีเข้าด้วยกัน amount = 0 ได้สีแรก, 1 ได้สีที่สอง */
export function mixHex(from: string, to: string, amount: number): string {
  const t = Math.max(0, Math.min(1, amount))
  const a = parseHex(from)
  const b = parseHex(to)
  return toHex(a.r + (b.r - a.r) * t, a.g + (b.g - a.g) * t, a.b + (b.b - a.b) * t)
}

/** คูณความสว่างของสี ใช้ทำแสงตกกระทบแบบหน้าเรียบ */
export function scaleHex(hex: string, factor: number): string {
  const { r, g, b } = parseHex(hex)
  return toHex(r * factor, g * factor, b * factor)
}

/**
 * ความสว่างของหน้าหนึ่งหน้าตามมุมที่รับแสง
 *
 * ช่วงเริ่มที่ 0.55 ไม่ใช่ 0 เพราะหน้าที่หันหนีดวงอาทิตย์สนิท
 * ควรเป็นเงาที่ยังมองเห็นรายละเอียด ไม่ใช่สี่เหลี่ยมสีดำ
 * ในโลกจริงหน้าเหล่านั้นยังได้แสงสะท้อนจากท้องฟ้าและพื้นอยู่เสมอ
 */
export function faceBrightness(normal: Vec3): number {
  return 0.55 + 0.45 * Math.max(0, dot(normal, SUN_DIRECTION))
}
