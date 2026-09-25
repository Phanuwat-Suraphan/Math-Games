/**
 * วาดระบบสุริยะลงผืนผ้าใบ
 *
 * ลำดับการวาดในหนึ่งเฟรม
 *   1. พื้นหลังอวกาศกับดาวฤกษ์ไกล ๆ (หมุนตามกล้องแต่ไม่เลื่อนตาม เพราะอยู่ไกลไม่สิ้นสุด)
 *   2. เส้นวงโคจรและแถบดาวเคราะห์น้อย
 *   3. ดวงอาทิตย์ ดาวเคราะห์ ดวงจันทร์ และยาน เรียงจากไกลไปใกล้
 *   4. ป้ายชื่อ วงเลือก และเส้นเล็งปลายทาง ซึ่งต้องอยู่บนสุดเสมอ
 *
 * ดาวแต่ละดวงวาดเป็นวงกลมแล้วระบายเงาด้านกลางคืนทับ (ดูเหตุผลใน space.ts)
 * เส้นแบ่งกลางวันกลางคืนคำนวณจากตำแหน่งดวงอาทิตย์จริง
 * พอหมุนกล้องไปมองจากด้านหลังดาว จะเห็นดาวเป็นเสี้ยวเหมือนดวงจันทร์ข้างขึ้น
 * ซึ่งเป็นภาพที่ถูกต้อง และเป็นคำถามที่ดีให้ครูชวนคิดต่อว่าทำไม
 *
 * ทุกขนาดเป็นพิกเซลของผืนผ้าใบจริง คูณ pixelRatio แล้ว ภาพจึงคมบนจอความละเอียดสูง
 */

import { createRng } from '../math/rng'
import { NEAR_PLANE, toView, vec3 } from '../safezone/vector3'
import type { Camera, Vec3, Viewport } from '../safezone/vector3'
import { ASTEROID_BELT, EARTH_MOON, PLANETS, SUN } from './planets'
import type { Planet, PlanetId } from './planets'
import {
  bodiesOnScreen,
  cameraFor,
  directionToView,
  moonPosition,
  phaseOf,
  planetPosition,
  planetToWorld,
  projectPoint,
  projectSphere,
  surfaceToDisc,
  visualSpin,
} from './space'
import type { BodyId, BodyOnScreen, OrbitView, Phase, ScreenDisc } from './space'

export interface SolarFrame {
  /** เวลาในแบบจำลอง หน่วยวันนับจาก J2000 */
  days: number
  /** เวลาที่ใช้หมุนดาวรอบตัวเอง หน่วยวินาที (ดู visualSpin) */
  spinSeconds: number
  view: OrbitView
  selected: BodyId | null
  /** วงโคจรที่ต้องเรืองแสงเป็นคำใบ้ */
  highlight: PlanetId | null
  /** ดาวที่ได้ตราประทับแล้วในทริปนี้ ป้ายชื่อจะมีเครื่องหมายถูก */
  stamped: readonly PlanetId[]
  /** ดาวที่เลือกผิดไปแล้ว ป้ายชื่อจะจางลง */
  ruledOut: readonly PlanetId[]
  ship: Vec3 | null
  /** ทิศที่ยานหันหน้าไป */
  shipHeading: Vec3 | null
  thrust: boolean
  /** เส้นประจากยานไปดาวที่เลือก ใช้ตอนเลือกปลายทาง */
  aim: boolean
  showLabels: boolean
  showOrbits: boolean
  /** มิลลิวินาทีของนาฬิกาจริง ใช้กับของที่กะพริบ */
  now: number
  reduceMotion: boolean
  pixelRatio: number
}

/* ------------------------------------------------------------------ *
 * ของที่สร้างครั้งเดียว
 * ------------------------------------------------------------------ */

interface BackgroundStar {
  direction: Vec3
  size: number
  alpha: number
  twinkle: number
}

/** ดาวฤกษ์พื้นหลัง สุ่มครั้งเดียวด้วย seed คงที่ ทุกเครื่องจึงเห็นท้องฟ้าเดียวกัน */
const STARS: BackgroundStar[] = (() => {
  const rng = createRng('solar-background-stars')
  const stars: BackgroundStar[] = []
  for (let index = 0; index < 520; index += 1) {
    // สุ่มจุดบนทรงกลมให้กระจายเท่ากัน ไม่กองกันที่ขั้ว
    const y = rng.next() * 2 - 1
    const angle = rng.next() * Math.PI * 2
    const ring = Math.sqrt(1 - y * y)
    stars.push({
      direction: vec3(ring * Math.cos(angle), y, ring * Math.sin(angle)),
      size: rng.chance(0.08) ? 1.6 : rng.chance(0.3) ? 1.1 : 0.7,
      alpha: 0.35 + rng.next() * 0.6,
      twinkle: rng.next() * Math.PI * 2,
    })
  }
  return stars
})()

interface Rock {
  radius: number
  angle: number
  height: number
  /** คาบการโคจร หน่วยวัน ก้อนที่อยู่ไกลกว่าโคจรช้ากว่า */
  period: number
  size: number
}

const ROCKS: Rock[] = (() => {
  const rng = createRng('solar-asteroid-belt')
  const rocks: Rock[] = []
  for (let index = 0; index < 320; index += 1) {
    const spread = rng.next()
    const radius = ASTEROID_BELT.inner + (ASTEROID_BELT.outer - ASTEROID_BELT.inner) * spread
    rocks.push({
      radius,
      angle: rng.next() * Math.PI * 2,
      height: (rng.next() - 0.5) * 0.7,
      // แถบดาวเคราะห์น้อยจริงโคจรครบรอบในราว 3–6 ปี
      period: 1_200 + spread * 1_000,
      size: rng.chance(0.15) ? 1.6 : 1,
    })
  }
  return rocks
})()

/* ------------------------------------------------------------------ *
 * ชิ้นส่วนการวาด
 * ------------------------------------------------------------------ */

function drawBackground(ctx: CanvasRenderingContext2D, viewport: Viewport, camera: Camera, frame: SolarFrame): void {
  const { width, height } = viewport
  const sky = ctx.createRadialGradient(width * 0.5, height * 0.45, 0, width * 0.5, height * 0.5, Math.max(width, height) * 0.8)
  sky.addColorStop(0, '#0b1233')
  sky.addColorStop(0.6, '#050818')
  sky.addColorStop(1, '#02030b')
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, width, height)

  const scale = height / 2 / Math.tan(camera.fov / 2)
  const ratio = frame.pixelRatio
  for (const star of STARS) {
    const view = directionToView(star.direction, camera)
    if (view.z <= 0.05) continue
    const x = width / 2 + (view.x / view.z) * scale
    const y = height / 2 - (view.y / view.z) * scale
    if (x < -2 || x > width + 2 || y < -2 || y > height + 2) continue
    const twinkle = frame.reduceMotion ? 1 : 0.75 + 0.25 * Math.sin(frame.now / 900 + star.twinkle)
    ctx.globalAlpha = star.alpha * twinkle
    ctx.fillStyle = '#e8eeff'
    ctx.fillRect(x, y, star.size * ratio, star.size * ratio)
  }
  ctx.globalAlpha = 1
}

/** เส้นวงกลมบนระนาบวงโคจร ตัดส่วนที่อยู่หลังกล้องทิ้งเป็นช่วง ๆ */
function strokeRing(
  ctx: CanvasRenderingContext2D,
  radius: number,
  center: Vec3,
  camera: Camera,
  viewport: Viewport,
  segments: number,
): void {
  ctx.beginPath()
  let drawing = false
  for (let index = 0; index <= segments; index += 1) {
    const angle = (index / segments) * Math.PI * 2
    const point = projectPoint(
      vec3(center.x + radius * Math.cos(angle), center.y, center.z + radius * Math.sin(angle)),
      camera,
      viewport,
    )
    if (!point) {
      drawing = false
      continue
    }
    if (drawing) ctx.lineTo(point.x, point.y)
    else ctx.moveTo(point.x, point.y)
    drawing = true
  }
  ctx.stroke()
}

function drawOrbits(ctx: CanvasRenderingContext2D, viewport: Viewport, camera: Camera, frame: SolarFrame): void {
  const origin = vec3(0, 0, 0)
  const ratio = frame.pixelRatio
  for (const planet of PLANETS) {
    const lit = planet.id === frame.highlight
    const chosen = planet.id === frame.selected
    if (!frame.showOrbits && !lit && !chosen) continue
    if (lit) {
      const pulse = frame.reduceMotion ? 1 : 0.7 + 0.3 * Math.sin(frame.now / 260)
      ctx.strokeStyle = `rgba(252, 211, 77, ${0.9 * pulse})`
      ctx.lineWidth = 2.6 * ratio
    } else if (chosen) {
      ctx.strokeStyle = 'rgba(165, 243, 252, 0.6)'
      ctx.lineWidth = 1.6 * ratio
    } else {
      ctx.strokeStyle = 'rgba(148, 163, 214, 0.22)'
      ctx.lineWidth = 1 * ratio
    }
    strokeRing(ctx, planet.sceneOrbit, origin, camera, viewport, 160)
  }
}

function drawAsteroids(ctx: CanvasRenderingContext2D, viewport: Viewport, camera: Camera, frame: SolarFrame): void {
  ctx.fillStyle = '#9b8f80'
  const ratio = frame.pixelRatio
  for (const rock of ROCKS) {
    const angle = rock.angle + (Math.PI * 2 * frame.days) / rock.period
    const point = projectPoint(
      vec3(rock.radius * Math.cos(angle), rock.height, rock.radius * Math.sin(angle)),
      camera,
      viewport,
    )
    if (!point) continue
    ctx.globalAlpha = Math.max(0.25, Math.min(0.85, 30 / point.depth))
    const size = rock.size * ratio
    ctx.fillRect(point.x - size / 2, point.y - size / 2, size, size)
  }
  ctx.globalAlpha = 1
}

function drawSun(ctx: CanvasRenderingContext2D, disc: ScreenDisc, frame: SolarFrame): void {
  const pulse = frame.reduceMotion ? 1 : 1 + 0.03 * Math.sin(frame.now / 700)
  const glow = ctx.createRadialGradient(disc.x, disc.y, disc.radius * 0.6, disc.x, disc.y, disc.radius * 3.4 * pulse)
  glow.addColorStop(0, 'rgba(255, 196, 80, 0.55)')
  glow.addColorStop(0.35, 'rgba(255, 150, 40, 0.18)')
  glow.addColorStop(1, 'rgba(255, 120, 20, 0)')
  ctx.fillStyle = glow
  ctx.beginPath()
  ctx.arc(disc.x, disc.y, disc.radius * 3.4 * pulse, 0, Math.PI * 2)
  ctx.fill()

  const core = ctx.createRadialGradient(
    disc.x - disc.radius * 0.25,
    disc.y - disc.radius * 0.25,
    disc.radius * 0.1,
    disc.x,
    disc.y,
    disc.radius,
  )
  core.addColorStop(0, '#fffbe8')
  core.addColorStop(0.45, '#ffd84d')
  core.addColorStop(0.85, '#ffa21f')
  core.addColorStop(1, '#f07a12')
  ctx.fillStyle = core
  ctx.beginPath()
  ctx.arc(disc.x, disc.y, disc.radius, 0, Math.PI * 2)
  ctx.fill()
}

/**
 * ระบายด้านกลางคืน
 *
 * ครึ่งวงกลมฝั่งตรงข้ามแสง ต่อด้วยครึ่งวงรีของเส้นแบ่งกลางวันกลางคืน
 * วาดซ้อนหลายชั้น แต่ละชั้นเลื่อนเส้นแบ่งเข้าหาด้านสว่างทีละนิดและจางมาก
 * ขอบเงาจึงไล่ความมืดนุ่ม ๆ เหมือนแสงเย็นบนลูกบอลจริง
 * ถ้าวาดชั้นเดียว เส้นแบ่งจะคมเหมือนตัดด้วยกรรไกร ดาวดูเป็นแผ่นกระดาษสองสี
 *
 * ด้านกลางคืนไม่มืดสนิท เพราะดาวที่มืดทั้งดวงบนพื้นหลังสีดำคือดาวที่หายไป
 * เด็กจะหาดาวดวงนั้นไม่เจอเลยเมื่อหมุนกล้องไปมองจากด้านหลัง
 */
const NIGHT_LAYERS = 10
const NIGHT_SPREAD = 0.3
const NIGHT_ALPHA = 0.74

function fillNightSide(ctx: CanvasRenderingContext2D, disc: ScreenDisc, phase: Phase): void {
  ctx.save()
  ctx.translate(disc.x, disc.y)
  ctx.rotate(phase.angle)
  // ความทึบของแต่ละชั้นคิดให้ซ้อนกันครบทุกชั้นแล้วได้ NIGHT_ALPHA พอดี
  const layerAlpha = 1 - Math.pow(1 - NIGHT_ALPHA, 1 / NIGHT_LAYERS)
  ctx.fillStyle = `rgba(2, 4, 16, ${layerAlpha})`
  for (let layer = 0; layer < NIGHT_LAYERS; layer += 1) {
    const bulge = Math.max(-1, Math.min(1, phase.terminator + NIGHT_SPREAD * (layer / (NIGHT_LAYERS - 1) - 0.5)))
    ctx.beginPath()
    ctx.arc(0, 0, disc.radius, Math.PI / 2, (Math.PI * 3) / 2)
    ctx.ellipse(0, 0, Math.abs(bulge) * disc.radius, disc.radius, 0, (Math.PI * 3) / 2, Math.PI / 2, bulge < 0)
    ctx.closePath()
    ctx.fill()
  }
  ctx.restore()
}

/** แถบเมฆตามละติจูด วาดเฉพาะส่วนที่หันหากล้อง */
function drawBands(
  ctx: CanvasRenderingContext2D,
  disc: ScreenDisc,
  planet: Planet,
  camera: Camera,
  spin: number,
): void {
  if (!planet.bands) return
  ctx.lineCap = 'round'
  for (const band of planet.bands) {
    const ring = Math.sqrt(1 - band.lat * band.lat)
    ctx.beginPath()
    let drawing = false
    for (let index = 0; index <= 48; index += 1) {
      const angle = (index / 48) * Math.PI * 2
      const world = planetToWorld(planet, vec3(ring * Math.cos(angle), band.lat, ring * Math.sin(angle)), spin)
      const spot = surfaceToDisc(world, camera)
      if (!spot) {
        drawing = false
        continue
      }
      const x = disc.x + spot.x * disc.radius
      const y = disc.y + spot.y * disc.radius
      if (drawing) ctx.lineTo(x, y)
      else ctx.moveTo(x, y)
      drawing = true
    }
    ctx.strokeStyle = band.color
    ctx.globalAlpha = 0.8
    ctx.lineWidth = band.width * disc.radius
    ctx.stroke()
  }
  ctx.globalAlpha = 1
}

/** จุดบนผิวดาว หมุนไปพร้อมดาว และแบนลงเมื่อเลื่อนไปใกล้ขอบ */
function drawSpots(
  ctx: CanvasRenderingContext2D,
  disc: ScreenDisc,
  planet: Planet,
  camera: Camera,
  spin: number,
): void {
  if (!planet.spots) return
  for (const spot of planet.spots) {
    const ring = Math.cos(spot.lat)
    const local = vec3(ring * Math.cos(spot.lon), Math.sin(spot.lat), ring * Math.sin(spot.lon))
    const place = surfaceToDisc(planetToWorld(planet, local, spin), camera)
    if (!place) continue
    const x = disc.x + place.x * disc.radius
    const y = disc.y + place.y * disc.radius
    const size = spot.size * disc.radius
    ctx.globalAlpha = Math.min(1, place.facing * 2.5)
    ctx.fillStyle = spot.color
    ctx.beginPath()
    ctx.ellipse(x, y, size * Math.max(0.2, place.facing), size, Math.atan2(place.y, place.x), 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalAlpha = 1
}

interface RingHalf {
  depth: number
  draw: () => void
}

/**
 * วงแหวนแบ่งเป็นครึ่งหลังกับครึ่งหน้า ครึ่งหลังวาดก่อนตัวดาว ครึ่งหน้าวาดทีหลัง
 * วงแหวนจึงลอดหลังดาวแล้วอ้อมมาข้างหน้าได้ถูกต้อง
 *
 * ครึ่งไหนอยู่หลังหาได้ตรง ๆ โดยไม่ต้องเรียงทีละชิ้น
 * เพราะวงแหวนเป็นวงกลมแบนวงเดียว ความลึกของจุดบนวงเปลี่ยนตามมุมเป็นคลื่นไซน์
 * ครึ่งที่อยู่ลึกกว่าจุดศูนย์กลางจึงเป็นครึ่งวงกลมที่ต่อกันเสมอ
 */
function ringHalves(
  ctx: CanvasRenderingContext2D,
  planet: Planet,
  center: Vec3,
  disc: ScreenDisc,
  camera: Camera,
  viewport: Viewport,
): { back: RingHalf | null; front: RingHalf | null } {
  if (!planet.rings) return { back: null, front: null }
  const depthAt = (angle: number): number =>
    directionToView(planetToWorld(planet, vec3(Math.cos(angle), 0, Math.sin(angle)), 0), camera).z
  const a = depthAt(0)
  const b = depthAt(Math.PI / 2)
  const deepest = Math.atan2(b, a)
  const rings = planet.rings

  const half = (from: number): (() => void) => () => {
    for (const ring of rings) {
      const outer: { x: number; y: number }[] = []
      const inner: { x: number; y: number }[] = []
      for (let index = 0; index <= 36; index += 1) {
        const angle = from + (index / 36) * Math.PI
        const direction = planetToWorld(planet, vec3(Math.cos(angle), 0, Math.sin(angle)), 0)
        const project = (reach: number): { x: number; y: number } | null => {
          const scaled = reach * planet.sceneRadius
          const view = toView(
            vec3(center.x + direction.x * scaled, center.y + direction.y * scaled, center.z + direction.z * scaled),
            camera,
          )
          if (view.z < NEAR_PLANE) return null
          const scale = viewport.height / 2 / Math.tan(camera.fov / 2) / view.z
          return { x: viewport.width / 2 + view.x * scale, y: viewport.height / 2 - view.y * scale }
        }
        const o = project(ring.outer)
        const i = project(ring.inner)
        // ส่วนใดส่วนหนึ่งเลยไปหลังกล้อง แปลว่ากล้องอยู่ในวงแหวน ไม่วาดครึ่งนี้เลยดีกว่าวาดเพี้ยน
        if (!o || !i) return
        outer.push(o)
        inner.push(i)
      }
      ctx.beginPath()
      outer.forEach((point, index) => (index === 0 ? ctx.moveTo(point.x, point.y) : ctx.lineTo(point.x, point.y)))
      for (let index = inner.length - 1; index >= 0; index -= 1) {
        const point = inner[index] as { x: number; y: number }
        ctx.lineTo(point.x, point.y)
      }
      ctx.closePath()
      ctx.globalAlpha = ring.alpha
      ctx.fillStyle = ring.color
      ctx.fill()
    }
    ctx.globalAlpha = 1
  }

  return {
    back: { depth: disc.depth + 0.001, draw: half(deepest - Math.PI / 2) },
    front: { depth: disc.depth - 0.001, draw: half(deepest + Math.PI / 2) },
  }
}

function drawPlanetBody(
  ctx: CanvasRenderingContext2D,
  disc: ScreenDisc,
  planet: Planet,
  center: Vec3,
  camera: Camera,
  spin: number,
): void {
  const phase = phaseOf(center, camera)

  if (planet.atmosphere && disc.radius > 2) {
    const halo = ctx.createRadialGradient(disc.x, disc.y, disc.radius * 0.92, disc.x, disc.y, disc.radius * 1.22)
    halo.addColorStop(0, planet.atmosphere)
    halo.addColorStop(1, 'rgba(0, 0, 0, 0)')
    ctx.globalAlpha = 0.28 + 0.4 * phase.litFraction
    ctx.fillStyle = halo
    ctx.beginPath()
    ctx.arc(disc.x, disc.y, disc.radius * 1.22, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalAlpha = 1
  }

  ctx.save()
  ctx.beginPath()
  ctx.arc(disc.x, disc.y, Math.max(0.8, disc.radius), 0, Math.PI * 2)
  ctx.clip()

  const lightX = disc.x + Math.cos(phase.angle) * disc.radius * 0.45
  const lightY = disc.y + Math.sin(phase.angle) * disc.radius * 0.45
  const base = ctx.createRadialGradient(lightX, lightY, disc.radius * 0.05, disc.x, disc.y, disc.radius * 1.05)
  base.addColorStop(0, planet.highlight)
  base.addColorStop(0.7, planet.color)
  base.addColorStop(1, planet.color)
  ctx.fillStyle = base
  ctx.fillRect(disc.x - disc.radius, disc.y - disc.radius, disc.radius * 2, disc.radius * 2)

  // รายละเอียดบนผิวเล็กเกินกว่าจะเห็นเมื่อดาวกว้างไม่ถึงหกพิกเซล ข้ามไปประหยัดเวลาวาด
  if (disc.radius > 6) {
    drawBands(ctx, disc, planet, camera, spin)
    drawSpots(ctx, disc, planet, camera, spin)
  }

  const rim = ctx.createRadialGradient(disc.x, disc.y, disc.radius * 0.55, disc.x, disc.y, disc.radius)
  rim.addColorStop(0, 'rgba(0, 0, 0, 0)')
  rim.addColorStop(1, 'rgba(0, 0, 10, 0.35)')
  ctx.fillStyle = rim
  ctx.fillRect(disc.x - disc.radius, disc.y - disc.radius, disc.radius * 2, disc.radius * 2)

  fillNightSide(ctx, disc, phase)
  ctx.restore()
}

function drawMoon(ctx: CanvasRenderingContext2D, disc: ScreenDisc, center: Vec3, camera: Camera): void {
  const phase = phaseOf(center, camera)
  ctx.save()
  ctx.beginPath()
  ctx.arc(disc.x, disc.y, Math.max(0.8, disc.radius), 0, Math.PI * 2)
  ctx.clip()
  ctx.fillStyle = '#c9c6c1'
  ctx.fillRect(disc.x - disc.radius, disc.y - disc.radius, disc.radius * 2, disc.radius * 2)
  fillNightSide(ctx, disc, phase)
  ctx.restore()
}

/** ยานสำรวจ ขนาดบนจอไม่เล็กกว่าที่เด็กมองเห็น ไม่ว่ากล้องจะถอยไปไกลแค่ไหน */
function drawShip(
  ctx: CanvasRenderingContext2D,
  position: Vec3,
  heading: Vec3 | null,
  camera: Camera,
  viewport: Viewport,
  frame: SolarFrame,
): void {
  const at = projectPoint(position, camera, viewport)
  if (!at) return
  const ratio = frame.pixelRatio
  const scale = viewport.height / 2 / Math.tan(camera.fov / 2)
  const size = Math.max(9 * ratio, Math.min(34 * ratio, (0.42 * scale) / at.depth))

  let angle = -Math.PI / 2
  if (heading) {
    const ahead = projectPoint(
      vec3(position.x + heading.x, position.y + heading.y, position.z + heading.z),
      camera,
      viewport,
    )
    if (ahead && Math.hypot(ahead.x - at.x, ahead.y - at.y) > 0.5) {
      angle = Math.atan2(ahead.y - at.y, ahead.x - at.x)
    }
  }

  // วงเรืองแสงรอบยาน ให้หาเจอเสมอแม้ยานจะเล็กมากตอนมองทั้งระบบ
  const beacon = frame.reduceMotion ? 0.5 : 0.35 + 0.25 * Math.sin(frame.now / 300)
  ctx.globalAlpha = beacon
  ctx.strokeStyle = '#67e8f9'
  ctx.lineWidth = 1.5 * ratio
  ctx.beginPath()
  ctx.arc(at.x, at.y, size * 1.25, 0, Math.PI * 2)
  ctx.stroke()
  ctx.globalAlpha = 1

  ctx.save()
  ctx.translate(at.x, at.y)
  ctx.rotate(angle)

  if (frame.thrust) {
    const flicker = frame.reduceMotion ? 1 : 0.8 + 0.4 * Math.random()
    const flame = ctx.createLinearGradient(-size * 0.5, 0, -size * (1.2 + 0.5 * flicker), 0)
    flame.addColorStop(0, 'rgba(255, 244, 200, 0.95)')
    flame.addColorStop(0.4, 'rgba(255, 170, 60, 0.85)')
    flame.addColorStop(1, 'rgba(255, 90, 30, 0)')
    ctx.fillStyle = flame
    ctx.beginPath()
    ctx.moveTo(-size * 0.45, -size * 0.18)
    ctx.lineTo(-size * (1.25 + 0.5 * flicker), 0)
    ctx.lineTo(-size * 0.45, size * 0.18)
    ctx.closePath()
    ctx.fill()
  }

  // ครีบ
  ctx.fillStyle = '#ef4444'
  ctx.beginPath()
  ctx.moveTo(-size * 0.2, -size * 0.18)
  ctx.lineTo(-size * 0.55, -size * 0.42)
  ctx.lineTo(-size * 0.5, -size * 0.1)
  ctx.closePath()
  ctx.moveTo(-size * 0.2, size * 0.18)
  ctx.lineTo(-size * 0.55, size * 0.42)
  ctx.lineTo(-size * 0.5, size * 0.1)
  ctx.closePath()
  ctx.fill()

  // ลำตัว
  const body = ctx.createLinearGradient(0, -size * 0.2, 0, size * 0.2)
  body.addColorStop(0, '#ffffff')
  body.addColorStop(1, '#b8c4dc')
  ctx.fillStyle = body
  ctx.beginPath()
  ctx.moveTo(size * 0.6, 0)
  ctx.quadraticCurveTo(size * 0.25, -size * 0.24, -size * 0.45, -size * 0.17)
  ctx.lineTo(-size * 0.45, size * 0.17)
  ctx.quadraticCurveTo(size * 0.25, size * 0.24, size * 0.6, 0)
  ctx.closePath()
  ctx.fill()

  // หน้าต่าง
  ctx.fillStyle = '#38bdf8'
  ctx.beginPath()
  ctx.arc(size * 0.12, 0, size * 0.09, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

interface LabelBox {
  x: number
  y: number
  width: number
  height: number
}

/**
 * กรอบมุมมนของป้ายชื่อ เขียนเองแทน ctx.roundRect
 * เพราะ Safari บนไอแพดรุ่นที่โรงเรียนยังใช้กันอยู่ไม่มีคำสั่งนั้น แล้วฉากทั้งฉากจะไม่ขึ้นเลย
 */
function pillPath(ctx: CanvasRenderingContext2D, box: LabelBox): void {
  const radius = box.height / 2
  ctx.beginPath()
  ctx.moveTo(box.x + radius, box.y)
  ctx.lineTo(box.x + box.width - radius, box.y)
  ctx.arc(box.x + box.width - radius, box.y + radius, radius, -Math.PI / 2, Math.PI / 2)
  ctx.lineTo(box.x + radius, box.y + box.height)
  ctx.arc(box.x + radius, box.y + radius, radius, Math.PI / 2, (Math.PI * 3) / 2)
  ctx.closePath()
}

function overlaps(a: LabelBox, b: LabelBox): boolean {
  return a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height
}

/**
 * ป้ายชื่อใต้ดาว
 *
 * ตอนมองทั้งระบบ ดาวเคราะห์ชั้นในอยู่ชิดกันจนป้ายทับกันอ่านไม่ออก
 * จึงวางป้ายของดวงที่อยู่ใกล้กล้องก่อน ป้ายที่ไปทับป้ายเดิมถูกข้ามไป
 * ยกเว้นดวงที่ถูกเลือกกับดวงที่เป็นคำใบ้ ซึ่งต้องเห็นชื่อเสมอ
 */
function drawLabels(
  ctx: CanvasRenderingContext2D,
  viewport: Viewport,
  bodies: readonly BodyOnScreen[],
  frame: SolarFrame,
): void {
  const ratio = frame.pixelRatio
  const fontSize = 12.5 * ratio
  ctx.font = `600 ${fontSize}px Kanit, "Noto Sans Thai", sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  const names = new Map<BodyId, string>(PLANETS.map((planet) => [planet.id, planet.name]))
  names.set('sun', SUN.name)

  const important = (id: BodyId): boolean => id === frame.selected || id === frame.highlight
  const ordered = [...bodies].sort((a, b) => {
    if (important(a.id) !== important(b.id)) return important(a.id) ? -1 : 1
    return a.depth - b.depth
  })

  const placed: LabelBox[] = []
  for (const body of ordered) {
    const stamped = body.id !== 'sun' && frame.stamped.includes(body.id)
    const text = `${names.get(body.id) ?? ''}${stamped ? ' ✓' : ''}`
    const width = ctx.measureText(text).width + 12 * ratio
    const height = fontSize + 8 * ratio
    // ป้ายของดาวที่อยู่ชิดขอบจอถูกดันเข้ามาในจอ ไม่ปล่อยให้ชื่อขาดครึ่ง
    const margin = 4 * ratio
    const box: LabelBox = {
      x: Math.max(margin, Math.min(viewport.width - width - margin, body.x - width / 2)),
      y: body.y + Math.max(body.radius, 3 * ratio) + 5 * ratio,
      width,
      height,
    }
    if (!important(body.id)) {
      if (placed.some((other) => overlaps(other, box))) continue
      // ป้ายของดาวไกลที่ไปทับตัวดาวดวงใหญ่ที่อยู่ใกล้กว่า อ่านแล้วเข้าใจผิดว่าเป็นชื่อของดวงหน้า
      const hidden = bodies.some(
        (near) =>
          near.depth < body.depth &&
          near.radius > 10 * ratio &&
          overlaps(box, {
            x: near.x - near.radius,
            y: near.y - near.radius,
            width: near.radius * 2,
            height: near.radius * 2,
          }),
      )
      if (hidden) continue
    }
    placed.push(box)

    const ruled = body.id !== 'sun' && frame.ruledOut.includes(body.id)
    const chosen = body.id === frame.selected
    const hinted = body.id === frame.highlight
    ctx.globalAlpha = ruled ? 0.45 : 1
    ctx.fillStyle = chosen ? 'rgba(8, 47, 73, 0.92)' : hinted ? 'rgba(69, 39, 3, 0.9)' : 'rgba(4, 8, 26, 0.72)'
    pillPath(ctx, box)
    ctx.fill()
    if (chosen || hinted) {
      ctx.strokeStyle = chosen ? '#67e8f9' : '#fcd34d'
      ctx.lineWidth = 1.2 * ratio
      ctx.stroke()
    }
    ctx.fillStyle = chosen ? '#cffafe' : hinted ? '#fde68a' : stamped ? '#bbf7d0' : '#e2e8f0'
    ctx.fillText(text, box.x + box.width / 2, box.y + height / 2 + 0.5 * ratio)
  }
  ctx.globalAlpha = 1
}

/** วงประรอบดาวที่เลือก หมุนช้า ๆ ให้รู้ว่ากำลังเลือกดวงนี้อยู่ */
function drawSelection(ctx: CanvasRenderingContext2D, body: BodyOnScreen, frame: SolarFrame, color: string): void {
  const ratio = frame.pixelRatio
  const radius = Math.max(body.radius * 1.18, body.radius + 7 * ratio, 13 * ratio)
  ctx.save()
  ctx.strokeStyle = color
  ctx.lineWidth = 2 * ratio
  ctx.setLineDash([6 * ratio, 5 * ratio])
  ctx.lineDashOffset = frame.reduceMotion ? 0 : -frame.now / 40
  ctx.beginPath()
  ctx.arc(body.x, body.y, radius, 0, Math.PI * 2)
  ctx.stroke()
  ctx.restore()
}

/* ------------------------------------------------------------------ *
 * วาดทั้งเฟรม
 * ------------------------------------------------------------------ */

export function drawSolarSystem(ctx: CanvasRenderingContext2D, viewport: Viewport, frame: SolarFrame): BodyOnScreen[] {
  const camera = cameraFor(frame.view)
  drawBackground(ctx, viewport, camera, frame)
  drawAsteroids(ctx, viewport, camera, frame)
  drawOrbits(ctx, viewport, camera, frame)

  const bodies = bodiesOnScreen(frame.days, camera, viewport)
  const items: { depth: number; draw: () => void }[] = []

  for (const body of bodies) {
    if (body.id === 'sun') {
      items.push({ depth: body.depth, draw: () => drawSun(ctx, body, frame) })
      continue
    }
    const planet = PLANETS.find((candidate) => candidate.id === body.id) as Planet
    const center = planetPosition(planet, frame.days)
    const spin = visualSpin(planet, frame.spinSeconds)
    const rings = ringHalves(ctx, planet, center, body, camera, viewport)
    if (rings.back) items.push(rings.back)
    items.push({ depth: body.depth, draw: () => drawPlanetBody(ctx, body, planet, center, camera, spin) })
    if (rings.front) items.push(rings.front)
  }

  const moonCenter = moonPosition(frame.days)
  const moon = projectSphere(moonCenter, EARTH_MOON.sceneRadius, camera, viewport)
  if (moon && moon.radius > 0.6) {
    items.push({ depth: moon.depth, draw: () => drawMoon(ctx, moon, moonCenter, camera) })
  }

  if (frame.ship) {
    const ship = frame.ship
    const depth = toView(ship, camera).z
    items.push({ depth, draw: () => drawShip(ctx, ship, frame.shipHeading, camera, viewport, frame) })
  }

  items.sort((a, b) => b.depth - a.depth)
  for (const item of items) item.draw()

  const selected = bodies.find((body) => body.id === frame.selected)
  if (frame.aim && selected && frame.ship) {
    const from = projectPoint(frame.ship, camera, viewport)
    if (from) {
      ctx.save()
      ctx.strokeStyle = 'rgba(103, 232, 249, 0.75)'
      ctx.lineWidth = 1.6 * frame.pixelRatio
      ctx.setLineDash([4 * frame.pixelRatio, 6 * frame.pixelRatio])
      ctx.lineDashOffset = frame.reduceMotion ? 0 : -frame.now / 30
      ctx.beginPath()
      ctx.moveTo(from.x, from.y)
      ctx.lineTo(selected.x, selected.y)
      ctx.stroke()
      ctx.restore()
    }
  }

  if (selected) drawSelection(ctx, selected, frame, '#67e8f9')
  const hinted = frame.highlight ? bodies.find((body) => body.id === frame.highlight) : undefined
  if (hinted && hinted.id !== frame.selected) drawSelection(ctx, hinted, frame, '#fcd34d')

  if (frame.showLabels) drawLabels(ctx, viewport, bodies, frame)
  return bodies
}
