import { createRng } from '../math/rng'
import type { ShipLook } from '../solar/render'
import type { Planet } from '../solar/planets'
import { angleGap, sunScale } from './surface'
import type { Poi, PoiKind, Surface, WalkState } from './surface'
import { SUN_ANGLE, daylight, sunHeight } from './surfaceWorld'
import type { Native, Sparkle } from './surfaceWorld'

/**
 * วาดผิวดาวลงผืนผ้าใบ
 *
 * ดาวเป็นวงกลมใหญ่ ผู้เล่นยืนอยู่บนยอดวงกลมเสมอ เวลาเดินคือหมุนทั้งดาวไปใต้เท้า
 * ของบนพื้นทุกชิ้นวางด้วยมุมรอบดาว แล้วหมุนตามมุมนั้น จึงตั้งฉากกับผิวดาวเสมอเหมือนดาวเจ้าชายน้อย
 *
 * เรียงชั้นจากหลังไปหน้า: ท้องฟ้า ดวงอาทิตย์และของบนฟ้า พื้นดาว ของบนพื้น ยาน เพื่อนร่วมทาง ผู้เล่น
 * ทุกขนาดคิดจาก unit ซึ่งผูกกับความสูงของผืนผ้าใบ จอเล็กจอใหญ่จึงหน้าตาเหมือนกัน
 * รัศมีทุกตัวผ่าน Math.max ก่อนวาด เพราะรัศมีติดลบทำให้เบราว์เซอร์โยน error แล้วฉากค้าง
 */

const TAU = Math.PI * 2

export interface SurfaceLayout {
  /** รัศมีของดาว หน่วยเดียวกับ width/height ที่ส่งเข้ามา */
  radius: number
  cx: number
  cy: number
  /** ระดับพื้นตรงที่ผู้เล่นยืน */
  groundY: number
  /** ขนาดอ้างอิงของของทุกชิ้น */
  unit: number
}

export function surfaceLayout(width: number, height: number): SurfaceLayout {
  const groundY = height * 0.74
  const radius = Math.max(width * 0.95, height * 1.4)
  return { radius, cx: width / 2, cy: groundY + radius, groundY, unit: height / 360 }
}

export interface SurfaceFrame {
  surface: Surface
  planet: Planet
  state: WalkState
  /** มุมของเพื่อนร่วมทาง เดินตามหลังผู้เล่นช้า ๆ */
  companionAngle: number
  discovered: readonly string[]
  /** จุดสำรวจที่อยู่ในระยะ */
  near: string | null
  companion: HTMLImageElement | null
  shipLook: ShipLook
  now: number
  reduceMotion: boolean
  pixelRatio: number
  /** ดาวแสงของดาวดวงนี้ กับลำดับของดวงที่เก็บไปแล้ว */
  sparkles?: readonly Sparkle[]
  collected?: readonly number[]
  /** ชาวดาว กับว่าอยู่ใกล้พอจะคุยไหม และให้ของฝากไปแล้วหรือยัง */
  native?: Native
  nativeNear?: boolean
  gifted?: boolean
}

/* ---------------- สี ---------------- */

function parseHex(color: string): [number, number, number] {
  const hex = color.replace('#', '')
  const value = Number.parseInt(hex.length === 3 ? hex.replace(/./g, (c) => c + c) : hex, 16)
  if (!Number.isFinite(value)) return [0, 0, 0]
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255]
}

/** ผสมสีสองสีแบบเส้นตรง t = 0 ได้สีแรก t = 1 ได้สีที่สอง */
export function mixColor(from: string, to: string, t: number): string {
  const a = parseHex(from)
  const b = parseHex(to)
  const k = Math.min(1, Math.max(0, t))
  const channel = (index: 0 | 1 | 2): number => Math.round(a[index] + (b[index] - a[index]) * k)
  return `rgb(${channel(0)}, ${channel(1)}, ${channel(2)})`
}

const NIGHT_SKY: readonly [string, string] = ['#020617', '#111a3a']

const r = (value: number): number => Math.max(0.1, value)

/* ---------------- ท้องฟ้า ---------------- */

function drawSky(ctx: CanvasRenderingContext2D, width: number, height: number, frame: SurfaceFrame, unit: number): void {
  const { surface, now, reduceMotion } = frame
  const light = daylight(frame.state.angle)
  const sky = ctx.createLinearGradient(0, 0, 0, height)
  sky.addColorStop(0, mixColor(NIGHT_SKY[0], surface.sky[0], light))
  sky.addColorStop(1, mixColor(NIGHT_SKY[1], surface.sky[1], light))
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, width, height)

  // แสงเย็นที่ขอบฟ้า บนดาวอังคารเป็นสีฟ้า ซึ่งเป็นเรื่องจริงที่รถสำรวจถ่ายภาพไว้ได้
  const dusk = 1 - Math.min(1, Math.abs(light - 0.45) * 2.2)
  if (dusk > 0) {
    const glow = ctx.createLinearGradient(0, height * 0.35, 0, height * 0.8)
    const tint = surface.planet === 'mars' ? '96, 165, 250' : '251, 146, 60'
    glow.addColorStop(0, `rgba(${tint}, 0)`)
    glow.addColorStop(1, `rgba(${tint}, ${(0.55 * dusk).toFixed(3)})`)
    ctx.fillStyle = glow
    ctx.fillRect(0, 0, width, height)
  }

  const extras = surface.skyExtras
  // ดาวบนฟ้าเห็นตอนกลางคืนทุกดวง ส่วนดาวที่ไม่มีอากาศอย่างดาวพุธเห็นได้แม้กลางวัน
  const starAlpha = Math.max(extras.includes('stars') ? 1 : 0, 1 - light)
  if (starAlpha > 0.02) {
    const rng = createRng(`surface-stars-${surface.planet}`)
    ctx.fillStyle = '#ffffff'
    for (let index = 0; index < 70; index += 1) {
      const x = rng.next() * width
      const y = rng.next() * height * 0.7
      const twinkle = reduceMotion ? 0.7 : 0.45 + 0.45 * Math.sin(now / 600 + index)
      ctx.globalAlpha = twinkle * starAlpha
      ctx.beginPath()
      ctx.arc(x, y, r((0.6 + rng.next() * 1.1) * unit), 0, TAU)
      ctx.fill()
    }
    ctx.globalAlpha = 1
  }

  if (extras.includes('rings')) {
    // วงแหวนดาวเสาร์มองจากใต้วงแหวน พาดเป็นโค้งใหญ่เต็มฟ้า
    ctx.save()
    ctx.translate(width * 0.5, height * 1.05)
    ctx.rotate(-0.16)
    const bands: readonly [number, string, number][] = [
      [0.98, '#c9b68c', 0.55],
      [0.9, '#e3d1a6', 0.85],
      [0.82, '#8a7a5e', 0.45],
    ]
    for (const [scale, color, alpha] of bands) {
      ctx.globalAlpha = alpha
      ctx.strokeStyle = color
      ctx.lineWidth = 16 * unit
      ctx.beginPath()
      ctx.ellipse(0, 0, r(width * scale), r(height * 0.78 * scale), 0, Math.PI, TAU)
      ctx.stroke()
    }
    ctx.restore()
    ctx.globalAlpha = 1
  }

  if (extras.includes('uprightRings')) {
    ctx.save()
    ctx.globalAlpha = 0.35
    ctx.strokeStyle = '#e0f2fe'
    ctx.lineWidth = 3 * unit
    ctx.beginPath()
    ctx.ellipse(width * 0.2, height * 0.36, r(width * 0.035), r(height * 0.42), 0.12, 0, TAU)
    ctx.stroke()
    ctx.restore()
  }

  drawSun(ctx, width, height, frame, unit)

  if (extras.includes('moon')) {
    ctx.globalAlpha = 0.55
    ctx.fillStyle = '#f8fafc'
    ctx.beginPath()
    ctx.arc(width * 0.18, height * 0.2, r(13 * unit), 0, TAU)
    ctx.fill()
    ctx.globalAlpha = 1
  }
  if (extras.includes('moons')) {
    // ไอโอ ยูโรปา แกนีมีด ดวงจันทร์ดวงใหญ่ของดาวพฤหัสบดี
    const moons: readonly [number, number, number, string][] = [
      [0.16, 0.18, 6, '#fde047'],
      [0.32, 0.1, 4.5, '#f8fafc'],
      [0.6, 0.14, 7, '#d6d3d1'],
    ]
    for (const [x, y, size, color] of moons) {
      ctx.fillStyle = color
      ctx.beginPath()
      ctx.arc(width * x, height * y, r(size * unit), 0, TAU)
      ctx.fill()
    }
  }
  if (extras.includes('triton')) {
    ctx.fillStyle = '#fbcfe8'
    ctx.beginPath()
    ctx.arc(width * 0.22, height * 0.16, r(6 * unit), 0, TAU)
    ctx.fill()
  }

  if (extras.includes('clouds')) {
    ctx.fillStyle = mixColor('#475569', '#ffffff', light)
    for (let index = 0; index < 4; index += 1) {
      const drift = reduceMotion ? 0 : now / 90_000
      const x = (((index * 0.31 + drift) % 1.3) - 0.15) * width
      const y = height * (0.12 + (index % 2) * 0.12)
      ctx.globalAlpha = 0.85
      for (const [dx, dy, size] of [
        [0, 0, 16],
        [18, -6, 20],
        [38, 0, 15],
      ] as const) {
        ctx.beginPath()
        ctx.arc(x + dx * unit, y + dy * unit, r(size * unit), 0, TAU)
        ctx.fill()
      }
    }
    ctx.globalAlpha = 1
  }

  if (extras.includes('haze')) {
    const haze = ctx.createLinearGradient(0, height * 0.35, 0, height)
    haze.addColorStop(0, 'rgba(255, 237, 213, 0)')
    haze.addColorStop(1, 'rgba(255, 237, 213, 0.35)')
    ctx.fillStyle = haze
    ctx.fillRect(0, 0, width, height)
  }
}

function drawSun(ctx: CanvasRenderingContext2D, width: number, height: number, frame: SurfaceFrame, unit: number): void {
  // ดวงอาทิตย์อยู่ทิศเดิมเสมอ เดินไปทางไหนดวงอาทิตย์ก็เลื่อนตามมุมที่เดิน ตกลับขอบฟ้าเมื่อเดินไปอีกฝั่ง
  const rel = angleGap(frame.state.angle, SUN_ANGLE)
  const groundY = height * 0.74
  const x = width / 2 + Math.sin(rel) * width * 0.42
  const y = groundY - sunHeight(frame.state.angle) * groundY * 0.82
  if (y > groundY + 40 * unit) return
  if (!frame.surface.sunVisible) {
    // มองไม่เห็นดวงอาทิตย์ เห็นแค่แสงเรือง ๆ ผ่านเมฆ
    const glow = ctx.createRadialGradient(x, y, r(4 * unit), x, y, r(120 * unit))
    glow.addColorStop(0, 'rgba(255, 247, 214, 0.55)')
    glow.addColorStop(1, 'rgba(255, 247, 214, 0)')
    ctx.fillStyle = glow
    ctx.fillRect(0, 0, width, height)
    return
  }
  const size = Math.min(62 * unit, Math.max(2 * unit, 18 * unit * sunScale(frame.planet)))
  const glow = ctx.createRadialGradient(x, y, r(size * 0.5), x, y, r(size * 3.2 + 6 * unit))
  glow.addColorStop(0, 'rgba(255, 220, 120, 0.7)')
  glow.addColorStop(1, 'rgba(255, 180, 60, 0)')
  ctx.fillStyle = glow
  ctx.beginPath()
  ctx.arc(x, y, r(size * 3.2 + 6 * unit), 0, TAU)
  ctx.fill()
  ctx.fillStyle = '#fff7d6'
  ctx.beginPath()
  ctx.arc(x, y, r(size), 0, TAU)
  ctx.fill()
  if (size < 6 * unit) {
    // ดวงอาทิตย์ที่ไกลมากเหลือแค่จุด วาดประกายแฉกให้เด็กยังหาเจอ
    ctx.strokeStyle = 'rgba(255, 247, 214, 0.85)'
    ctx.lineWidth = Math.max(1, unit)
    ctx.beginPath()
    ctx.moveTo(x - 9 * unit, y)
    ctx.lineTo(x + 9 * unit, y)
    ctx.moveTo(x, y - 9 * unit)
    ctx.lineTo(x, y + 9 * unit)
    ctx.stroke()
  }
}

/* ---------------- พื้นดาว ---------------- */

function drawGround(ctx: CanvasRenderingContext2D, layout: SurfaceLayout, frame: SurfaceFrame): void {
  const { cx, cy, radius, unit } = layout
  const { surface, state, now, reduceMotion } = frame
  const body = ctx.createRadialGradient(cx, cy - radius * 0.85, r(radius * 0.1), cx, cy, r(radius))
  body.addColorStop(0, surface.ground[0])
  body.addColorStop(1, surface.ground[1])
  ctx.fillStyle = body
  ctx.beginPath()
  ctx.arc(cx, cy, r(radius), 0, TAU)
  ctx.fill()

  ctx.save()
  ctx.translate(cx, cy)
  ctx.rotate(-state.angle)
  if (surface.kind === 'gas') {
    // ยอดเมฆเป็นแถบวงกลมซ้อนกัน ไหลช้า ๆ ให้รู้ว่าเป็นแก๊ส ไม่ใช่พื้นแข็ง
    ctx.lineCap = 'round'
    for (let band = 0; band < 7; band += 1) {
      ctx.strokeStyle = band % 2 === 0 ? surface.ground[0] : surface.ground[1]
      ctx.globalAlpha = 0.45
      ctx.lineWidth = 9 * unit
      ctx.setLineDash([60 * unit, 26 * unit])
      ctx.lineDashOffset = reduceMotion ? 0 : (now / 25) * (band % 2 === 0 ? 1 : -1)
      ctx.beginPath()
      ctx.arc(0, 0, r(radius - (6 + band * 14) * unit), 0, TAU)
      ctx.stroke()
    }
    ctx.setLineDash([])
    ctx.globalAlpha = 1
  } else {
    // หิน หลุม และเนินเล็ก ๆ รอบดาว วางด้วยค่าสุ่มที่คงที่ต่อดาว เดินวนกลับมาจะเจอที่เดิม
    const rng = createRng(`surface-ground-${surface.planet}`)
    for (let index = 0; index < 36; index += 1) {
      const angle = rng.next() * TAU
      const depth = (4 + rng.next() * 40) * unit
      const size = (3 + rng.next() * 9) * unit
      const x = Math.sin(angle) * (radius - depth)
      const y = -Math.cos(angle) * (radius - depth)
      ctx.globalAlpha = 0.35
      ctx.fillStyle = surface.ground[1]
      ctx.beginPath()
      ctx.ellipse(x, y, r(size * 1.4), r(size * 0.7), angle, 0, TAU)
      ctx.fill()
    }
    ctx.globalAlpha = 1
  }
  ctx.restore()

  // ขอบผิวดาวสว่างนิด ๆ ให้เห็นเส้นขอบฟ้าชัด
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)'
  ctx.lineWidth = 2 * unit
  ctx.beginPath()
  ctx.arc(cx, cy, r(radius), Math.PI * 1.05, Math.PI * 1.95)
  ctx.stroke()
}

/* ---------------- ของบนพื้น ---------------- */

/** วางของที่มุมรอบดาว แล้วเรียก draw ในพิกัดที่ฐานของอยู่ที่ (0, 0) และ "ขึ้น" คือ y ติดลบ */
function onSurface(
  ctx: CanvasRenderingContext2D,
  layout: SurfaceLayout,
  playerAngle: number,
  angle: number,
  lift: number,
  draw: () => void,
): boolean {
  const rel = angleGap(playerAngle, angle)
  // ไกลเกินขอบจอไม่ต้องวาด
  if (Math.abs(rel) * layout.radius > layout.cx * 1.6) return false
  ctx.save()
  ctx.translate(layout.cx + Math.sin(rel) * (layout.radius + lift), layout.cy - Math.cos(rel) * (layout.radius + lift))
  ctx.rotate(rel)
  draw()
  ctx.restore()
  return true
}

const STORM_COLOR: Partial<Record<string, string>> = { jupiter: '#c2410c', neptune: '#1e3a8a' }

/** ความสูงของของแต่ละชนิด ใช้วางป้าย ? ไว้เหนือของ */
const SPRITE_HEIGHT: Record<PoiKind, number> = {
  crater: 10,
  ice: 30,
  sign: 46,
  volcano: 60,
  probe: 44,
  cloud: 34,
  tree: 64,
  water: 14,
  mountain: 84,
  rover: 38,
  storm: 24,
  lightning: 60,
  crystal: 34,
  telescope: 46,
}

/** ของที่ลอยอยู่เหนือยอดเมฆบนดาวแก๊ส ส่วนบนดาวหินวางติดพื้น */
function liftOf(kind: PoiKind, surface: Surface): number {
  if (surface.kind !== 'gas') return 0
  return kind === 'probe' || kind === 'telescope' ? 46 : 0
}

function drawSprite(ctx: CanvasRenderingContext2D, kind: PoiKind, unit: number, frame: SurfaceFrame): void {
  const u = unit
  const dark = frame.surface.ground[1]
  switch (kind) {
    case 'crater': {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.35)'
      ctx.beginPath()
      ctx.ellipse(0, 2 * u, r(34 * u), r(9 * u), 0, 0, TAU)
      ctx.fill()
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)'
      ctx.lineWidth = 3 * u
      ctx.beginPath()
      ctx.ellipse(0, 0, r(36 * u), r(10 * u), 0, Math.PI, TAU)
      ctx.stroke()
      return
    }
    case 'ice':
    case 'crystal': {
      const colors = kind === 'ice' ? ['#e0f2fe', '#7dd3fc'] : ['#f5f3ff', '#a5f3fc']
      for (const [x, h, w] of [
        [-12, 22, 9],
        [0, 32, 11],
        [13, 18, 8],
      ] as const) {
        ctx.fillStyle = colors[x === 0 ? 0 : 1] as string
        ctx.beginPath()
        ctx.moveTo((x - w) * u, 0)
        ctx.lineTo(x * u, -h * u)
        ctx.lineTo((x + w) * u, 0)
        ctx.closePath()
        ctx.fill()
      }
      if (kind === 'crystal') {
        const glint = frame.reduceMotion ? 0.8 : 0.5 + 0.5 * Math.sin(frame.now / 250)
        ctx.globalAlpha = glint
        ctx.strokeStyle = '#ffffff'
        ctx.lineWidth = 1.5 * u
        ctx.beginPath()
        ctx.moveTo(-6 * u, -38 * u)
        ctx.lineTo(6 * u, -38 * u)
        ctx.moveTo(0, -44 * u)
        ctx.lineTo(0, -32 * u)
        ctx.stroke()
        ctx.globalAlpha = 1
      }
      return
    }
    case 'sign': {
      ctx.fillStyle = '#92400e'
      ctx.fillRect(-2.5 * u, -40 * u, 5 * u, 40 * u)
      ctx.fillStyle = '#fbbf24'
      ctx.fillRect(-18 * u, -46 * u, 36 * u, 18 * u)
      ctx.fillStyle = '#78350f'
      ctx.fillRect(-12 * u, -41 * u, 24 * u, 2.5 * u)
      ctx.fillRect(-12 * u, -35 * u, 16 * u, 2.5 * u)
      return
    }
    case 'volcano':
    case 'mountain': {
      const tall = kind === 'mountain' ? 84 : 58
      const wide = kind === 'mountain' ? 60 : 56
      ctx.fillStyle = dark
      ctx.beginPath()
      ctx.moveTo(-wide * u, 0)
      ctx.lineTo(-wide * 0.18 * u, -tall * u)
      ctx.lineTo(wide * 0.18 * u, -tall * u)
      ctx.lineTo(wide * u, 0)
      ctx.closePath()
      ctx.fill()
      if (kind === 'volcano') {
        ctx.fillStyle = '#f97316'
        ctx.beginPath()
        ctx.ellipse(0, -tall * u, r(wide * 0.18 * u), r(4 * u), 0, 0, TAU)
        ctx.fill()
        const puff = frame.reduceMotion ? 0 : (frame.now / 1400) % 1
        ctx.fillStyle = 'rgba(120, 113, 108, 0.6)'
        ctx.beginPath()
        ctx.arc(4 * u, (-tall - 12 - puff * 18) * u, r((7 + puff * 6) * u), 0, TAU)
        ctx.fill()
      } else {
        ctx.fillStyle = '#f8fafc'
        ctx.beginPath()
        ctx.moveTo(-wide * 0.32 * u, -tall * 0.62 * u)
        ctx.lineTo(-wide * 0.18 * u, -tall * u)
        ctx.lineTo(wide * 0.18 * u, -tall * u)
        ctx.lineTo(wide * 0.3 * u, -tall * 0.64 * u)
        ctx.closePath()
        ctx.fill()
      }
      return
    }
    case 'probe': {
      ctx.strokeStyle = '#cbd5e1'
      ctx.lineWidth = 2.5 * u
      ctx.beginPath()
      ctx.moveTo(-14 * u, 0)
      ctx.lineTo(-8 * u, -14 * u)
      ctx.moveTo(14 * u, 0)
      ctx.lineTo(8 * u, -14 * u)
      ctx.stroke()
      ctx.fillStyle = '#e2e8f0'
      ctx.fillRect(-11 * u, -28 * u, 22 * u, 15 * u)
      ctx.fillStyle = '#facc15'
      ctx.fillRect(-11 * u, -20 * u, 22 * u, 3 * u)
      ctx.fillStyle = '#94a3b8'
      ctx.beginPath()
      ctx.ellipse(0, -36 * u, r(12 * u), r(5 * u), -0.3, 0, TAU)
      ctx.fill()
      ctx.fillStyle = '#1d4ed8'
      ctx.fillRect(-30 * u, -26 * u, 16 * u, 8 * u)
      ctx.fillRect(14 * u, -26 * u, 16 * u, 8 * u)
      return
    }
    case 'cloud': {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.75)'
      for (const [x, y, size] of [
        [-16, -12, 12],
        [0, -20, 15],
        [16, -12, 11],
      ] as const) {
        ctx.beginPath()
        ctx.arc(x * u, y * u, r(size * u), 0, TAU)
        ctx.fill()
      }
      return
    }
    case 'tree': {
      ctx.fillStyle = '#92400e'
      ctx.fillRect(-4 * u, -26 * u, 8 * u, 26 * u)
      ctx.fillStyle = '#16a34a'
      for (const [x, y, size] of [
        [0, -48, 18],
        [-12, -36, 13],
        [12, -36, 13],
      ] as const) {
        ctx.beginPath()
        ctx.arc(x * u, y * u, r(size * u), 0, TAU)
        ctx.fill()
      }
      return
    }
    case 'water': {
      ctx.fillStyle = '#38bdf8'
      ctx.beginPath()
      ctx.ellipse(0, 3 * u, r(46 * u), r(12 * u), 0, 0, TAU)
      ctx.fill()
      ctx.strokeStyle = '#e0f2fe'
      ctx.lineWidth = 2 * u
      const wave = frame.reduceMotion ? 0 : Math.sin(frame.now / 400) * 3 * u
      ctx.beginPath()
      ctx.moveTo(-24 * u + wave, 0)
      ctx.quadraticCurveTo(-16 * u + wave, -4 * u, -8 * u + wave, 0)
      ctx.moveTo(6 * u - wave, 2 * u)
      ctx.quadraticCurveTo(14 * u - wave, -2 * u, 22 * u - wave, 2 * u)
      ctx.stroke()
      return
    }
    case 'rover': {
      ctx.fillStyle = '#334155'
      for (const x of [-16, 0, 16]) {
        ctx.beginPath()
        ctx.arc(x * u, -5 * u, r(5 * u), 0, TAU)
        ctx.fill()
      }
      ctx.fillStyle = '#f8fafc'
      ctx.fillRect(-22 * u, -20 * u, 44 * u, 11 * u)
      ctx.fillStyle = '#94a3b8'
      ctx.fillRect(10 * u, -36 * u, 3 * u, 16 * u)
      ctx.fillStyle = '#e2e8f0'
      ctx.fillRect(6 * u, -40 * u, 12 * u, 6 * u)
      ctx.fillStyle = '#0ea5e9'
      ctx.fillRect(13 * u, -38 * u, 3 * u, 2.5 * u)
      return
    }
    case 'storm': {
      const color = STORM_COLOR[frame.surface.planet] ?? '#9a3412'
      const spin = frame.reduceMotion ? 0 : frame.now / 900
      ctx.save()
      ctx.translate(0, -10 * u)
      ctx.fillStyle = color
      ctx.globalAlpha = 0.85
      ctx.beginPath()
      ctx.ellipse(0, 0, r(40 * u), r(13 * u), 0, 0, TAU)
      ctx.fill()
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)'
      ctx.lineWidth = 2 * u
      ctx.beginPath()
      ctx.ellipse(0, 0, r(26 * u), r(7 * u), 0, spin, spin + Math.PI * 1.3)
      ctx.stroke()
      ctx.restore()
      ctx.globalAlpha = 1
      return
    }
    case 'lightning': {
      ctx.fillStyle = 'rgba(68, 64, 60, 0.85)'
      for (const [x, y, size] of [
        [-14, -50, 14],
        [4, -56, 17],
        [20, -48, 12],
      ] as const) {
        ctx.beginPath()
        ctx.arc(x * u, y * u, r(size * u), 0, TAU)
        ctx.fill()
      }
      const flash = frame.reduceMotion ? 1 : Math.sin(frame.now / 160) > 0.3 ? 1 : 0.15
      ctx.globalAlpha = flash
      ctx.strokeStyle = '#fde047'
      ctx.lineWidth = 3.5 * u
      ctx.lineJoin = 'round'
      ctx.beginPath()
      ctx.moveTo(2 * u, -40 * u)
      ctx.lineTo(-6 * u, -24 * u)
      ctx.lineTo(4 * u, -24 * u)
      ctx.lineTo(-4 * u, -6 * u)
      ctx.stroke()
      ctx.globalAlpha = 1
      return
    }
    case 'telescope': {
      ctx.strokeStyle = '#475569'
      ctx.lineWidth = 2.5 * u
      ctx.beginPath()
      ctx.moveTo(-12 * u, 0)
      ctx.lineTo(0, -24 * u)
      ctx.lineTo(12 * u, 0)
      ctx.moveTo(0, -24 * u)
      ctx.lineTo(0, 0)
      ctx.stroke()
      ctx.save()
      ctx.translate(0, -28 * u)
      ctx.rotate(-0.7)
      ctx.fillStyle = '#f8fafc'
      ctx.fillRect(-6 * u, -18 * u, 12 * u, 30 * u)
      ctx.fillStyle = '#38bdf8'
      ctx.fillRect(-6 * u, -18 * u, 12 * u, 4 * u)
      ctx.restore()
      return
    }
  }
}

function drawMarker(ctx: CanvasRenderingContext2D, poi: Poi, unit: number, frame: SurfaceFrame): void {
  const found = frame.discovered.includes(poi.id)
  const near = frame.near === poi.id
  const bob = frame.reduceMotion ? 0 : Math.sin(frame.now / 300 + poi.angle) * 3 * unit
  const y = -(SPRITE_HEIGHT[poi.kind] + 20) * unit + bob
  if (near) {
    ctx.fillStyle = 'rgba(252, 211, 77, 0.35)'
    ctx.beginPath()
    ctx.arc(0, y, r(19 * unit), 0, TAU)
    ctx.fill()
  }
  ctx.fillStyle = found ? '#22c55e' : '#fcd34d'
  ctx.strokeStyle = '#1e1b4b'
  ctx.lineWidth = 2 * unit
  ctx.beginPath()
  ctx.arc(0, y, r(12 * unit), 0, TAU)
  ctx.fill()
  ctx.stroke()
  ctx.fillStyle = '#1e1b4b'
  ctx.font = `900 ${Math.round(15 * unit)}px sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(found ? '✓' : '?', 0, y + unit)
}

/** ดาวแสง ห้าแฉก หมุนช้า ๆ และเรืองแสง ยิ่งมืดยิ่งเห็นชัด */
function drawSparkle(ctx: CanvasRenderingContext2D, unit: number, frame: SurfaceFrame, index: number): void {
  const u = unit
  const spin = frame.reduceMotion ? 0 : frame.now / 700 + index
  const glow = ctx.createRadialGradient(0, 0, r(2 * u), 0, 0, r(20 * u))
  glow.addColorStop(0, 'rgba(253, 224, 71, 0.6)')
  glow.addColorStop(1, 'rgba(253, 224, 71, 0)')
  ctx.fillStyle = glow
  ctx.beginPath()
  ctx.arc(0, 0, r(20 * u), 0, TAU)
  ctx.fill()
  ctx.save()
  ctx.rotate(spin)
  ctx.fillStyle = '#fde047'
  ctx.strokeStyle = '#ca8a04'
  ctx.lineWidth = 1.5 * u
  ctx.beginPath()
  for (let point = 0; point < 10; point += 1) {
    const size = (point % 2 === 0 ? 10 : 4.2) * u
    const angle = (point / 10) * TAU - Math.PI / 2
    if (point === 0) ctx.moveTo(Math.cos(angle) * size, Math.sin(angle) * size)
    else ctx.lineTo(Math.cos(angle) * size, Math.sin(angle) * size)
  }
  ctx.closePath()
  ctx.fill()
  ctx.stroke()
  ctx.restore()
}

/**
 * ชาวดาว ตัวกลม ๆ แบบเดียวกันทุกดาว ต่างกันที่สี จำนวนตา หนวด และของประจำตัว
 * ชาวดาวยูเรนัสนอนตะแคงเหมือนดาวบ้านเกิด
 */
function drawNative(ctx: CanvasRenderingContext2D, unit: number, frame: SurfaceFrame, native: Native): void {
  const u = unit
  const look = native.look
  const wave = frame.reduceMotion ? 0 : Math.sin(frame.now / 180) * (frame.nativeNear ? 0.7 : 0.2)
  ctx.save()
  if (look.sideways) {
    ctx.translate(0, -16 * u)
    ctx.rotate(Math.PI / 2)
    ctx.translate(0, 16 * u)
  }
  if (look.extra === 'cloud') {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)'
    for (const [x, size] of [
      [-14, 9],
      [0, 12],
      [14, 9],
    ] as const) {
      ctx.beginPath()
      ctx.arc(x * u, -2 * u, r(size * u), 0, TAU)
      ctx.fill()
    }
  }
  const body = ctx.createRadialGradient(-6 * u, -26 * u, r(3 * u), 0, -16 * u, r(22 * u))
  body.addColorStop(0, '#ffffff')
  body.addColorStop(0.25, look.color)
  body.addColorStop(1, mixColor(look.color, '#1e1b4b', 0.45))
  // แขนโบกมือ
  ctx.strokeStyle = look.color
  ctx.lineWidth = 5 * u
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(14 * u, -18 * u)
  ctx.lineTo((22 + wave * 6) * u, (-30 - wave * 6) * u)
  ctx.moveTo(-14 * u, -16 * u)
  ctx.lineTo(-21 * u, -8 * u)
  ctx.stroke()
  for (let index = 0; index < look.antennae; index += 1) {
    const side = look.antennae === 1 ? 0 : index === 0 ? -1 : 1
    ctx.strokeStyle = mixColor(look.color, '#1e1b4b', 0.3)
    ctx.lineWidth = 2 * u
    ctx.beginPath()
    ctx.moveTo(side * 6 * u, -32 * u)
    ctx.lineTo(side * 11 * u, -44 * u)
    ctx.stroke()
    ctx.fillStyle = '#fde047'
    ctx.beginPath()
    ctx.arc(side * 11 * u, -45 * u, r(3.2 * u), 0, TAU)
    ctx.fill()
  }
  if (look.extra === 'horns') {
    ctx.fillStyle = '#fef3c7'
    for (const side of [-1, 1]) {
      ctx.beginPath()
      ctx.moveTo(side * 6 * u, -32 * u)
      ctx.lineTo(side * 13 * u, -42 * u)
      ctx.lineTo(side * 13 * u, -30 * u)
      ctx.closePath()
      ctx.fill()
    }
  }
  if (look.extra === 'leaf') {
    ctx.fillStyle = '#15803d'
    ctx.beginPath()
    ctx.ellipse(5 * u, -38 * u, r(7 * u), r(3.5 * u), -0.6, 0, TAU)
    ctx.fill()
  }
  ctx.fillStyle = body
  ctx.beginPath()
  ctx.ellipse(0, -16 * u, r(16 * u), r(17 * u), 0, 0, TAU)
  ctx.fill()
  if (look.extra === 'ring') {
    ctx.strokeStyle = '#d97706'
    ctx.lineWidth = 2.5 * u
    ctx.beginPath()
    ctx.ellipse(0, -12 * u, r(24 * u), r(6 * u), -0.15, 0, TAU)
    ctx.stroke()
  }
  // ตา
  const eyes = look.eyes === 1 ? [0] : look.eyes === 2 ? [-6, 6] : [-8, 0, 8]
  for (const x of eyes) {
    const size = look.eyes === 1 ? 6 : 3.6
    ctx.fillStyle = '#ffffff'
    ctx.beginPath()
    ctx.arc(x * u, -20 * u, r((size + 1.4) * u), 0, TAU)
    ctx.fill()
    ctx.fillStyle = '#1b1537'
    ctx.beginPath()
    ctx.arc(x * u, -19.5 * u, r(size * u), 0, TAU)
    ctx.fill()
    ctx.fillStyle = '#ffffff'
    ctx.beginPath()
    ctx.arc((x - size * 0.35) * u, -21 * u, r(size * 0.35 * u), 0, TAU)
    ctx.fill()
  }
  ctx.fillStyle = 'rgba(255, 143, 176, 0.7)'
  ctx.beginPath()
  ctx.ellipse(-10 * u, -12 * u, r(3.5 * u), r(2 * u), 0, 0, TAU)
  ctx.ellipse(10 * u, -12 * u, r(3.5 * u), r(2 * u), 0, 0, TAU)
  ctx.fill()
  ctx.strokeStyle = '#1b1537'
  ctx.lineWidth = 2 * u
  ctx.beginPath()
  ctx.arc(0, -12 * u, r(4 * u), 0.15 * Math.PI, 0.85 * Math.PI)
  ctx.stroke()
  ctx.restore()
}

function drawNativeMarker(ctx: CanvasRenderingContext2D, unit: number, frame: SurfaceFrame, native: Native): void {
  const bob = frame.reduceMotion ? 0 : Math.sin(frame.now / 300 + native.angle) * 3 * unit
  const y = (native.look.sideways ? -44 : -64) * unit + bob
  if (frame.nativeNear) {
    ctx.fillStyle = 'rgba(252, 211, 77, 0.35)'
    ctx.beginPath()
    ctx.arc(0, y, r(19 * unit), 0, TAU)
    ctx.fill()
  }
  ctx.fillStyle = frame.gifted ? '#22c55e' : '#f472b6'
  ctx.strokeStyle = '#1e1b4b'
  ctx.lineWidth = 2 * unit
  ctx.beginPath()
  ctx.arc(0, y, r(12 * unit), 0, TAU)
  ctx.fill()
  ctx.stroke()
  ctx.fillStyle = '#1e1b4b'
  ctx.font = `900 ${Math.round(15 * unit)}px sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(frame.gifted ? '✓' : '!', 0, y + unit)
}

/** ยานจอดตั้งตรงอยู่ที่มุม 0 สีเดียวกับยานที่แต่งในอู่ */
function drawShip(ctx: CanvasRenderingContext2D, unit: number, frame: SurfaceFrame): void {
  const u = unit
  const look = frame.shipLook
  ctx.fillStyle = look.fin
  ctx.beginPath()
  ctx.moveTo(-14 * u, -16 * u)
  ctx.lineTo(-24 * u, 0)
  ctx.lineTo(-8 * u, -6 * u)
  ctx.closePath()
  ctx.moveTo(14 * u, -16 * u)
  ctx.lineTo(24 * u, 0)
  ctx.lineTo(8 * u, -6 * u)
  ctx.closePath()
  ctx.fill()
  const body = ctx.createLinearGradient(-12 * u, 0, 12 * u, 0)
  body.addColorStop(0, look.bodyTop)
  body.addColorStop(1, look.bodyBottom)
  ctx.fillStyle = body
  ctx.beginPath()
  ctx.moveTo(0, -78 * u)
  ctx.quadraticCurveTo(18 * u, -50 * u, 12 * u, -4 * u)
  ctx.lineTo(-12 * u, -4 * u)
  ctx.quadraticCurveTo(-18 * u, -50 * u, 0, -78 * u)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = look.fin
  ctx.beginPath()
  ctx.moveTo(0, -78 * u)
  ctx.quadraticCurveTo(9 * u, -68 * u, 11 * u, -60 * u)
  ctx.lineTo(-11 * u, -60 * u)
  ctx.quadraticCurveTo(-9 * u, -68 * u, 0, -78 * u)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = look.window
  ctx.beginPath()
  ctx.arc(0, -40 * u, r(6.5 * u), 0, TAU)
  ctx.fill()
}

/* ---------------- ผู้เล่น ---------------- */

/** นักบินอวกาศตัวกลม ๆ หมวกโต ขาแกว่งตอนเดิน หันตามทิศที่เดิน */
function drawAstronaut(ctx: CanvasRenderingContext2D, layout: SurfaceLayout, frame: SurfaceFrame): void {
  const u = layout.unit
  const { state, surface } = frame
  const lift = state.height * frame.pixelRatio
  const x = layout.cx
  const footY = layout.groundY - lift

  // เงาบนพื้น เล็กลงเมื่อกระโดดสูง
  const shadow = Math.max(0.25, 1 - lift / (180 * u))
  ctx.fillStyle = 'rgba(0, 0, 0, 0.25)'
  ctx.beginPath()
  ctx.ellipse(x, layout.groundY + 2 * u, r(16 * u * shadow), r(4 * u * shadow), 0, 0, TAU)
  ctx.fill()

  ctx.save()
  ctx.translate(x, footY)
  ctx.scale(state.facing, 1)

  if (surface.kind === 'gas') {
    // ยานลอยฟ้าใต้เท้า เพราะดาวแก๊สไม่มีพื้นให้ยืน
    const flame = frame.reduceMotion ? 1 : 0.8 + 0.3 * Math.sin(frame.now / 60)
    ctx.fillStyle = '#fb923c'
    ctx.beginPath()
    ctx.moveTo(-6 * u, 4 * u)
    ctx.lineTo(0, (10 + 8 * flame) * u)
    ctx.lineTo(6 * u, 4 * u)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = '#e2e8f0'
    ctx.beginPath()
    ctx.ellipse(0, 2 * u, r(22 * u), r(6 * u), 0, 0, TAU)
    ctx.fill()
    ctx.fillStyle = '#22d3ee'
    ctx.fillRect(-14 * u, 1 * u, 28 * u, 2 * u)
  }

  const swing = state.walking && state.height <= 0 && !frame.reduceMotion ? Math.sin(state.stride * 12) * 0.5 : 0
  // ขา
  ctx.fillStyle = '#e2e8f0'
  for (const [side, phase] of [
    [-1, swing],
    [1, -swing],
  ] as const) {
    ctx.save()
    ctx.translate(side * 5 * u, -14 * u)
    ctx.rotate(phase)
    ctx.fillRect(-3.5 * u, 0, 7 * u, 14 * u)
    ctx.restore()
  }
  // เป้หลัง
  ctx.fillStyle = '#94a3b8'
  ctx.fillRect(-15 * u, -34 * u, 7 * u, 18 * u)
  // ลำตัว
  ctx.fillStyle = '#f8fafc'
  ctx.beginPath()
  ctx.ellipse(0, -24 * u, r(11 * u), r(13 * u), 0, 0, TAU)
  ctx.fill()
  ctx.fillStyle = '#f97316'
  ctx.fillRect(-4 * u, -28 * u, 8 * u, 5 * u)
  // แขน
  ctx.strokeStyle = '#e2e8f0'
  ctx.lineWidth = 6 * u
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(6 * u, -28 * u)
  ctx.lineTo((12 + swing * 6) * u, -16 * u)
  ctx.stroke()
  // หมวก
  ctx.fillStyle = '#ffffff'
  ctx.beginPath()
  ctx.arc(0, -46 * u, r(15 * u), 0, TAU)
  ctx.fill()
  const visor = ctx.createLinearGradient(0, -54 * u, 0, -38 * u)
  visor.addColorStop(0, '#0ea5e9')
  visor.addColorStop(1, '#1e3a8a')
  ctx.fillStyle = visor
  ctx.beginPath()
  ctx.ellipse(4 * u, -46 * u, r(10 * u), r(8 * u), 0, 0, TAU)
  ctx.fill()
  // ตาน้อย ๆ หลังกระจกหมวก กับแก้มแดง
  ctx.fillStyle = '#ffffff'
  ctx.beginPath()
  ctx.arc(2 * u, -47 * u, r(1.6 * u), 0, TAU)
  ctx.arc(8 * u, -47 * u, r(1.6 * u), 0, TAU)
  ctx.fill()
  ctx.fillStyle = 'rgba(255, 143, 176, 0.8)'
  ctx.beginPath()
  ctx.arc(10 * u, -42.5 * u, r(1.8 * u), 0, TAU)
  ctx.fill()
  ctx.fillStyle = 'rgba(255, 255, 255, 0.55)'
  ctx.beginPath()
  ctx.ellipse(0, -50 * u, r(3.5 * u), r(2 * u), -0.5, 0, TAU)
  ctx.fill()
  ctx.restore()
}

export function drawSurface(
  ctx: CanvasRenderingContext2D,
  viewport: { width: number; height: number },
  frame: SurfaceFrame,
): void {
  const { width, height } = viewport
  const layout = surfaceLayout(width, height)
  const unit = layout.unit
  drawSky(ctx, width, height, frame, unit)
  drawGround(ctx, layout, frame)

  const { surface, state } = frame
  const gas = surface.kind === 'gas'
  const native = frame.native
  const nativeLift = (gas ? 12 : 0) * unit + (frame.reduceMotion || !gas ? 0 : Math.sin(frame.now / 500) * 4 * unit)

  // ชั้นแรก ของบนพื้นทุกชิ้น ซึ่งจะมืดลงตอนกลางคืน
  for (const poi of surface.pois) {
    onSurface(ctx, layout, state.angle, poi.angle, liftOf(poi.kind, surface) * unit, () => drawSprite(ctx, poi.kind, unit, frame))
  }
  onSurface(ctx, layout, state.angle, 0, (gas ? 8 : 0) * unit, () => drawShip(ctx, unit, frame))
  if (native) onSurface(ctx, layout, state.angle, native.angle, nativeLift, () => drawNative(ctx, unit, frame, native))

  // กลางคืนทั้งฉากมืดลง แต่ป้าย ดาวแสง เพื่อน และตัวเราวาดทีหลัง จึงยังเห็นชัด
  const night = 1 - daylight(state.angle)
  if (night > 0.02) {
    ctx.fillStyle = `rgba(2, 6, 23, ${(night * 0.5).toFixed(3)})`
    ctx.fillRect(0, 0, width, height)
  }

  for (const poi of surface.pois) {
    onSurface(ctx, layout, state.angle, poi.angle, liftOf(poi.kind, surface) * unit, () => drawMarker(ctx, poi, unit, frame))
  }
  if (native) onSurface(ctx, layout, state.angle, native.angle, nativeLift, () => drawNativeMarker(ctx, unit, frame, native))
  const collected = frame.collected ?? []
  ;(frame.sparkles ?? []).forEach((sparkle, index) => {
    if (collected.includes(index)) return
    onSurface(ctx, layout, state.angle, sparkle.angle, (sparkle.height + 14) * frame.pixelRatio, () => drawSparkle(ctx, unit, frame, index))
  })

  // ไฟฉายบนหมวกตอนกลางคืน
  if (night > 0.3) {
    const lamp = ctx.createRadialGradient(layout.cx, layout.groundY - 30 * unit, r(6 * unit), layout.cx, layout.groundY - 30 * unit, r(90 * unit))
    lamp.addColorStop(0, `rgba(254, 249, 195, ${(0.35 * night).toFixed(3)})`)
    lamp.addColorStop(1, 'rgba(254, 249, 195, 0)')
    ctx.fillStyle = lamp
    ctx.beginPath()
    ctx.arc(layout.cx, layout.groundY - 30 * unit, r(90 * unit), 0, TAU)
    ctx.fill()
  }

  const friend = frame.companion
  if (friend && friend.complete && friend.naturalWidth > 0) {
    const bob = frame.reduceMotion ? 0 : Math.abs(Math.sin(frame.now / 220)) * 6 * unit
    const size = 46 * unit
    onSurface(ctx, layout, state.angle, frame.companionAngle, (surface.kind === 'gas' ? 14 : 0) * unit + bob, () => {
      ctx.drawImage(friend, -size / 2, -size * 0.95, size, size)
    })
  }

  drawAstronaut(ctx, layout, frame)
}
