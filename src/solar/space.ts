/**
 * คณิตศาสตร์สามมิติของยานสำรวจระบบสุริยะ
 *
 * ใช้เครื่องมือชุดเดียวกับ Safe Zone (safezone/vector3.ts) ไม่ได้เขียนการฉายภาพใหม่
 * ไฟล์นี้เพิ่มเฉพาะสิ่งที่ฉากอวกาศต้องใช้แต่เขาวงกตไม่ต้องใช้ คือ
 *
 *   - ตำแหน่งของดาวแต่ละดวงตามเวลา (โคจรเป็นวงกลมด้วยคาบจริง)
 *   - กล้องที่หมุนรอบจุดที่มอง แทนกล้องที่เดินตามตัวละคร
 *   - การฉายลูกทรงกลม และการหาว่าด้านไหนของดาวโดนแสง
 *   - เส้นทางบินของยาน และการหาว่านิ้วแตะโดนดาวดวงไหน
 *
 * ทำไมฉากนี้ไม่ใช้ paintScene ของ render3d/scene.ts
 *
 * ฉากนั้นสร้างจากหน้าสี่เหลี่ยม ซึ่งเหมาะกับกล่องและกำแพง
 * ลูกทรงกลมที่ทำจากหน้าสี่เหลี่ยมต้องใช้หลายร้อยหน้าต่อดวงถึงจะกลม
 * แต่ลูกทรงกลมที่ฉายลงจอคือวงกลมเสมอ การวาดวงกลมหนึ่งวงแล้วระบายเงาทับ
 * จึงได้ภาพที่กลมกว่าและเร็วกว่าหลายสิบเท่า
 *
 * ไฟล์นี้ไม่แตะ canvas เลย เพื่อให้ชุดทดสอบเรียกได้ตรง ๆ ด้วย Node
 */

import { NEAR_PLANE, normalize, projectionScale, toView, vec3 } from '../safezone/vector3'
import type { Camera, Vec3, Viewport } from '../safezone/vector3'
import { EARTH_MOON, PLANETS, SUN, getPlanet, tiltRadians } from './planets'
import type { Planet, PlanetId } from './planets'

const TAU = Math.PI * 2
const DEG = Math.PI / 180

/** เที่ยงวันที่ 1 มกราคม ค.ศ. 2000 ตามเวลาสากล จุดเริ่มนับของค่าลองจิจูดในข้อมูลดาว */
export const J2000_MS = Date.UTC(2000, 0, 1, 12)
export const MS_PER_DAY = 86_400_000

/** จำนวนวันนับจากจุดเริ่ม J2000 ใช้วางดาวให้ตรงตำแหน่งจริงของวันนั้น */
export function daysSinceJ2000(date: Date): number {
  return (date.getTime() - J2000_MS) / MS_PER_DAY
}

/** วันที่ในปฏิทินของเวลาในแบบจำลอง */
export function dateFromDays(days: number): Date {
  return new Date(J2000_MS + days * MS_PER_DAY)
}

/* ------------------------------------------------------------------ *
 * ตำแหน่งของดาว
 * ------------------------------------------------------------------ */

/**
 * มุมของดาวบนวงโคจร หน่วยเรเดียน
 *
 * นับจากลองจิจูดจริงในวัน J2000 แล้วเดินไปด้วยคาบการโคจรจริง
 * วงโคจรจริงเป็นวงรีเล็กน้อย การใช้วงกลมจึงคลาดไปได้ไม่กี่องศา
 * ซึ่งพอสำหรับให้เด็กเห็นว่าคืนนี้ดาวเคราะห์ดวงไหนอยู่ฝั่งเดียวกับโลก
 */
export function orbitAngle(planet: Planet, days: number): number {
  return planet.longitudeJ2000 * DEG + (TAU * days) / planet.orbitDays
}

/**
 * ตำแหน่งของดาวในฉาก
 *
 * วางบนระนาบ y = 0 ทุกดวง มุมเพิ่มขึ้นจากแกน +x ไปหาแกน +z
 * ซึ่งเมื่อมองลงมาจากด้านบน (ทิศเหนือของระบบสุริยะ) คือทวนเข็มนาฬิกา
 * ตรงกับทิศที่ดาวเคราะห์ทุกดวงโคจรจริง
 */
export function planetPosition(planet: Planet, days: number): Vec3 {
  const angle = orbitAngle(planet, days)
  return vec3(planet.sceneOrbit * Math.cos(angle), 0, planet.sceneOrbit * Math.sin(angle))
}

export function moonPosition(days: number): Vec3 {
  const earth = planetPosition(getPlanet('earth'), days)
  const angle = (TAU * days) / EARTH_MOON.orbitDays
  return vec3(
    earth.x + EARTH_MOON.sceneOrbit * Math.cos(angle),
    0,
    earth.z + EARTH_MOON.sceneOrbit * Math.sin(angle),
  )
}

/**
 * รัศมีที่ของรอบดาวกินที่ในฉาก รวมวงแหวนด้วย
 * ใช้กำหนดว่ายานจอดห่างแค่ไหน และกล้องต้องถอยออกมาไกลแค่ไหนถึงจะเห็นทั้งดวง
 */
export function bodyExtent(planet: Planet): number {
  const ringOuter = planet.rings?.reduce((most, ring) => Math.max(most, ring.outer), 1) ?? 1
  return planet.sceneRadius * ringOuter
}

/**
 * เปลี่ยนพิกัดบนตัวดาว (แกนหมุนชี้ขึ้นตามแกน y) ไปเป็นทิศในฉาก
 *
 * หมุนรอบแกนตัวเองก่อน แล้วค่อยเอียงแกนไปตามความเอียงจริงของดาว
 * แกนเอียงไปทางเดิมตลอดทั้งปี ไม่ได้หมุนตามวงโคจร ซึ่งตรงกับของจริง
 * ผลที่ได้ฟรีคือวงแหวนของดาวเสาร์จะเห็นเป็นเส้นบางเมื่อโคจรไปบางตำแหน่ง
 */
export function planetToWorld(planet: Planet, local: Vec3, spin: number): Vec3 {
  const cosSpin = Math.cos(spin)
  const sinSpin = Math.sin(spin)
  const x = local.x * cosSpin + local.z * sinSpin
  const z = -local.x * sinSpin + local.z * cosSpin

  const tilt = tiltRadians(planet)
  const cosTilt = Math.cos(tilt)
  const sinTilt = Math.sin(tilt)
  return vec3(x, local.y * cosTilt - z * sinTilt, local.y * sinTilt + z * cosTilt)
}

/**
 * มุมหมุนรอบตัวเองที่ใช้วาด
 *
 * ตั้งใจไม่ผูกกับเวลาในแบบจำลอง เพราะเมื่อเร่งเวลาเป็นหลายสิบวันต่อวินาที
 * โลกจะหมุนสิบรอบต่อวินาทีจนภาพกะพริบ จึงให้หมุนช้า ๆ ตามเวลาจริงแทน
 * แต่ยังรักษาสัดส่วนความเร็วไว้ ดาวพฤหัสบดีจึงหมุนเร็วกว่าโลกราวสองเท่าครึ่ง
 *
 * ใช้ค่าสัมบูรณ์ของคาบ เพราะดาวที่หมุนกลับทิศ (ดาวศุกร์ ดาวยูเรนัส)
 * ถูกบอกไว้แล้วด้วยแกนที่เอียงเกิน 90 องศา ถ้าใช้เครื่องหมายลบซ้ำอีก
 * ดาวจะกลับมาหมุนทิศเดียวกับโลก ซึ่งผิด
 */
export function visualSpin(planet: Planet, seconds: number): number {
  const turnsPerSecond = 0.06 * (24 / Math.abs(planet.spinHours))
  return TAU * turnsPerSecond * seconds
}

/* ------------------------------------------------------------------ *
 * กล้องหมุนรอบจุด
 * ------------------------------------------------------------------ */

export interface OrbitView {
  /** จุดที่กล้องมอง */
  target: Vec3
  yaw: number
  /** ก้มลงเป็นบวก */
  pitch: number
  distance: number
}

export const FIELD_OF_VIEW = 0.9
export const MIN_PITCH = 0.06
export const MAX_PITCH = 1.48
export const MIN_DISTANCE = 2.2
export const MAX_DISTANCE = 110

/** มุมมองเริ่มต้นที่เห็นดาวครบทั้งแปดดวง */
export const OVERVIEW: OrbitView = {
  target: vec3(0, 0, 0),
  yaw: -0.5,
  pitch: 0.62,
  distance: 66,
}

/** ทิศที่กล้องมอง ตรงกับการหมุนใน toView ทุกประการ */
export function forwardOf(yaw: number, pitch: number): Vec3 {
  return vec3(Math.sin(yaw) * Math.cos(pitch), -Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch))
}

export function cameraFor(view: OrbitView): Camera {
  const forward = forwardOf(view.yaw, view.pitch)
  return {
    position: vec3(
      view.target.x - forward.x * view.distance,
      view.target.y - forward.y * view.distance,
      view.target.z - forward.z * view.distance,
    ),
    yaw: view.yaw,
    pitch: view.pitch,
    fov: FIELD_OF_VIEW,
  }
}

export function clampView(view: OrbitView): OrbitView {
  return {
    target: view.target,
    yaw: view.yaw,
    pitch: Math.max(MIN_PITCH, Math.min(MAX_PITCH, view.pitch)),
    distance: Math.max(MIN_DISTANCE, Math.min(MAX_DISTANCE, view.distance)),
  }
}

/** มุมที่ต่างกันน้อยที่สุด ใช้หมุนกล้องไปทางที่สั้นกว่า ไม่หมุนอ้อมเกือบรอบ */
function angleDelta(from: number, to: number): number {
  let delta = (to - from) % TAU
  if (delta > Math.PI) delta -= TAU
  if (delta < -Math.PI) delta += TAU
  return delta
}

/**
 * ขยับกล้องเข้าหามุมที่ต้องการทีละนิด
 *
 * ใช้การไล่แบบเลขชี้กำลังซึ่งไม่ขึ้นกับจำนวนเฟรมต่อวินาที
 * เครื่องช้าที่วาดได้ 20 เฟรมกับเครื่องเร็วที่วาดได้ 120 เฟรม
 * จึงเห็นกล้องเลื่อนไปถึงในเวลาเท่ากัน
 */
export function easeView(current: OrbitView, goal: OrbitView, dt: number, rate = 4): OrbitView {
  const k = 1 - Math.exp(-rate * Math.max(0, dt))
  return {
    target: vec3(
      current.target.x + (goal.target.x - current.target.x) * k,
      current.target.y + (goal.target.y - current.target.y) * k,
      current.target.z + (goal.target.z - current.target.z) * k,
    ),
    yaw: current.yaw + angleDelta(current.yaw, goal.yaw) * k,
    pitch: current.pitch + (goal.pitch - current.pitch) * k,
    distance: current.distance * Math.pow(goal.distance / current.distance, k),
  }
}

/** ระยะกล้องที่เห็นดาวหนึ่งดวงเต็มตาพร้อมยานที่จอดอยู่ข้าง ๆ */
export function closeUpDistance(planet: Planet): number {
  return Math.max(MIN_DISTANCE + 1, bodyExtent(planet) * 3.6 + 2.4)
}

/**
 * มุมกล้องที่มองดาวจากฝั่งดวงอาทิตย์ เบี่ยงออกไปเล็กน้อย
 *
 * ถ้ากล้องอยู่ฝั่งเดียวกับดวงอาทิตย์พอดี ดาวจะสว่างเต็มดวงแต่แบนเหมือนแผ่นกระดาษ
 * ถ้าอยู่ฝั่งตรงข้าม ดาวจะมืดเกือบทั้งดวง เด็กที่เพิ่งบินมาถึงจะเห็นแค่เงาดำ
 * เบี่ยงราวสี่สิบองศาได้ดาวที่สว่างเกือบเต็มดวง แต่ยังมีขอบเงาให้เห็นว่ากลม
 */
export function sunSideYaw(center: Vec3, offset = 0.7): number {
  return Math.atan2(center.x, center.z) + offset
}

/* ------------------------------------------------------------------ *
 * การฉายลงจอ
 * ------------------------------------------------------------------ */

export interface ScreenDisc {
  x: number
  y: number
  radius: number
  depth: number
}

/** หมุนทิศหนึ่งทิศเข้าพิกัดกล้อง โดยไม่เลื่อนตำแหน่ง ใช้กับแสงและดาวพื้นหลัง */
export function directionToView(direction: Vec3, camera: Camera): Vec3 {
  return toView(
    vec3(
      camera.position.x + direction.x,
      camera.position.y + direction.y,
      camera.position.z + direction.z,
    ),
    camera,
  )
}

/** ฉายจุดหนึ่งจุดลงจอ คืน null เมื่ออยู่หลังกล้อง */
export function projectPoint(point: Vec3, camera: Camera, viewport: Viewport): ScreenDisc | null {
  const view = toView(point, camera)
  if (view.z < NEAR_PLANE) return null
  const scale = projectionScale(viewport, camera.fov) / view.z
  return {
    x: viewport.width / 2 + view.x * scale,
    y: viewport.height / 2 - view.y * scale,
    radius: 0,
    depth: view.z,
  }
}

/**
 * ฉายลูกทรงกลมลงจอ ได้เป็นวงกลม
 *
 * ทิ้งเมื่อผิวลูกด้านหน้าเลยระนาบใกล้ไปแล้ว ไม่ใช่เมื่อจุดศูนย์กลางเลย
 * เพราะตอนซูมเข้าไปใกล้ ๆ ดาวดวงใหญ่ จุดศูนย์กลางยังอยู่หน้ากล้อง
 * แต่วงกลมที่ได้จะใหญ่กว่าจอหลายเท่าจนเห็นเป็นสีเดียวเต็มจอ
 */
export function projectSphere(
  center: Vec3,
  radius: number,
  camera: Camera,
  viewport: Viewport,
): ScreenDisc | null {
  const view = toView(center, camera)
  if (view.z - radius < NEAR_PLANE) return null
  const scale = projectionScale(viewport, camera.fov) / view.z
  return {
    x: viewport.width / 2 + view.x * scale,
    y: viewport.height / 2 - view.y * scale,
    radius: radius * scale,
    depth: view.z,
  }
}

/**
 * ด้านสว่างของดาวเมื่อมองจากกล้อง
 *
 * angle คือทิศบนจอที่ชี้ไปหาด้านสว่าง (เรเดียน วัดแบบผืนผ้าใบที่แกน y ชี้ลง)
 * terminator คือตำแหน่งของเส้นแบ่งกลางวันกลางคืนบนวงกลม
 *   −1 = สว่างเต็มดวง (ดวงอาทิตย์อยู่ข้างหลังกล้อง)
 *    0 = สว่างครึ่งดวง
 *    1 = มืดทั้งดวง (ดวงอาทิตย์อยู่ข้างหลังดาว)
 *
 * เส้นแบ่งคือวงกลมใหญ่ที่ตั้งฉากกับแสง เมื่อฉายลงจอจะเป็นวงรี
 * ที่กว้างเท่าดาวในแนวหนึ่ง และกว้าง |terminator| เท่าในอีกแนว
 * นี่คือเหตุผลเดียวกับที่ดวงจันทร์มีข้างขึ้นข้างแรม
 */
export interface Phase {
  angle: number
  terminator: number
  /** สัดส่วนของวงกลมที่สว่าง 0–1 */
  litFraction: number
}

export function phaseOf(center: Vec3, camera: Camera): Phase {
  const toSun = normalize(vec3(-center.x, -center.y, -center.z))
  const light = directionToView(toSun, camera)
  return {
    angle: Math.atan2(-light.y, light.x),
    terminator: light.z,
    litFraction: (1 - light.z) / 2,
  }
}

/** ตำแหน่งบนผิวดาวที่หันหากล้อง ได้พิกัดบนวงกลมหนึ่งหน่วย คืน null เมื่ออยู่ด้านหลังดาว */
export function surfaceToDisc(
  worldDirection: Vec3,
  camera: Camera,
): { x: number; y: number; facing: number } | null {
  const view = directionToView(worldDirection, camera)
  // กล้องมองไปทาง +z ผิวที่หันหากล้องจึงมี z ติดลบ
  if (view.z >= 0) return null
  return { x: view.x, y: -view.y, facing: -view.z }
}

/* ------------------------------------------------------------------ *
 * ร่างกายทั้งหมดในฉาก และการแตะเลือก
 * ------------------------------------------------------------------ */

export type BodyId = PlanetId | 'sun'

export interface BodyOnScreen extends ScreenDisc {
  id: BodyId
}

/** ฉายดวงอาทิตย์และดาวทุกดวงลงจอ ใช้ทั้งตอนวาดและตอนแตะเลือก จึงตรงกันเสมอ */
export function bodiesOnScreen(days: number, camera: Camera, viewport: Viewport): BodyOnScreen[] {
  const found: BodyOnScreen[] = []
  const sun = projectSphere(vec3(0, 0, 0), SUN.sceneRadius, camera, viewport)
  if (sun) found.push({ id: 'sun', ...sun })
  for (const planet of PLANETS) {
    const disc = projectSphere(planetPosition(planet, days), planet.sceneRadius, camera, viewport)
    if (disc) found.push({ id: planet.id, ...disc })
  }
  return found
}

/**
 * ดาวดวงไหนอยู่ใต้นิ้ว
 *
 * ดาวดวงเล็กที่อยู่ไกลอาจกว้างบนจอแค่สองสามพิกเซล ซึ่งนิ้วเด็กแตะไม่โดนแน่
 * จึงขยายพื้นที่แตะของทุกดวงให้กว้างอย่างน้อย minRadius
 * เมื่อแตะโดนหลายดวงพร้อมกัน ให้ดวงที่จุดศูนย์กลางใกล้นิ้วที่สุดชนะ
 * ไม่ใช่ดวงที่อยู่ใกล้กล้องที่สุด เพราะนิ้วเล็งที่ตัวดาว ไม่ได้เล็งที่ความลึก
 * แต่ถ้านิ้วอยู่บนตัวดาวจริง ๆ (ไม่ใช่แค่ในพื้นที่ที่ขยาย) ดวงที่อยู่หน้าสุดชนะเสมอ
 */
export function pickBody(
  x: number,
  y: number,
  bodies: readonly BodyOnScreen[],
  minRadius: number,
): BodyId | null {
  let direct: BodyOnScreen | null = null
  let nearest: BodyOnScreen | null = null
  let nearestGap = Infinity

  for (const body of bodies) {
    const gap = Math.hypot(body.x - x, body.y - y)
    if (gap <= body.radius) {
      if (!direct || body.depth < direct.depth) direct = body
      continue
    }
    if (gap <= Math.max(minRadius, body.radius) && gap < nearestGap) {
      nearest = body
      nearestGap = gap
    }
  }
  return (direct ?? nearest)?.id ?? null
}

/* ------------------------------------------------------------------ *
 * การบินของยาน
 * ------------------------------------------------------------------ */

/**
 * จุดจอดข้างดาว อยู่ด้านที่หันหาดวงอาทิตย์
 *
 * จอดด้านนี้เพราะกล้องจะตามยานมา แล้วมองเข้าหาดาวผ่านไหล่ของยาน
 * ถ้าจอดด้านหลัง เด็กจะเห็นดาวเป็นเงามืดทั้งดวงตอนมาถึง
 */
export function parkingSpot(planetId: PlanetId, days: number): Vec3 {
  const planet = getPlanet(planetId)
  const center = planetPosition(planet, days)
  const inward = normalize(vec3(-center.x, 0, -center.z))
  const gap = bodyExtent(planet) + 0.9
  return vec3(center.x + inward.x * gap, center.y + 0.35, center.z + inward.z * gap)
}

/** เร่งช่วงต้น ผ่อนช่วงท้าย ยานจึงไม่กระชากออกตัวและไม่ชนดาวตอนถึง */
export function easeInOut(t: number): number {
  const clamped = Math.max(0, Math.min(1, t))
  return clamped * clamped * (3 - 2 * clamped)
}

/**
 * ตำแหน่งของยานระหว่างบิน
 *
 * ปลายทางคือจุดจอดของดาว "ณ ตอนนี้" ไม่ใช่ตอนออกเดินทาง
 * เพราะดาวยังโคจรต่อระหว่างที่ยานบิน ถ้าเล็งจุดเดิมไว้ ยานจะไปถึงที่ว่างเปล่า
 * แล้วต้องกระโดดไปหาดาวในเฟรมสุดท้าย
 *
 * ยกเส้นทางโค้งขึ้นเหนือระนาบวงโคจร ยานจึงไม่บินทะลุดวงอาทิตย์
 * เมื่อต้นทางกับปลายทางอยู่คนละฝั่ง
 */
export function flightPosition(from: Vec3, to: Vec3, t: number): Vec3 {
  const e = easeInOut(t)
  const span = Math.hypot(to.x - from.x, to.z - from.z)
  const lift = Math.sin(Math.PI * Math.max(0, Math.min(1, t))) * Math.min(9, 1.5 + span * 0.28)
  return vec3(
    from.x + (to.x - from.x) * e,
    from.y + (to.y - from.y) * e + lift,
    from.z + (to.z - from.z) * e,
  )
}

/** เวลาที่ใช้บิน หน่วยวินาที ไกลกว่าใช้นานกว่า แต่ไม่นานจนเด็กเบื่อ */
export function flightSeconds(from: Vec3, to: Vec3): number {
  const span = Math.hypot(to.x - from.x, to.y - from.y, to.z - from.z)
  return Math.max(2.2, Math.min(5.5, 1.6 + span * 0.09))
}
