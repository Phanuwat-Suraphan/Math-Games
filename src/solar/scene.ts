/**
 * ตัวควบคุมฉากสามมิติของยานสำรวจระบบสุริยะ
 *
 * รวมทุกอย่างที่ต้องทำหกสิบครั้งต่อวินาทีไว้ที่นี่ คือเดินเวลา ขยับกล้อง บินยาน
 * รับนิ้วกับเมาส์ แล้ววาด หน้าจอ React แค่สั่งงานและรับเหตุการณ์กลับไป
 *
 * ทำไมไม่เขียนไว้ในหน้าจอ React ตรง ๆ เหมือน Safe Zone
 *
 * ฉากนี้มีสถานะที่เปลี่ยนทุกเฟรมเยอะกว่าเขาวงกตมาก ทั้งกล้องที่ไล่ตามเป้าหมาย
 * นิ้วสองนิ้วที่กำลังซูม และยานที่กำลังบิน ถ้าเก็บใน ref ของหน้าจอ
 * หน้าจอจะยาวเป็นพันบรรทัดและทดสอบไม่ได้เลย เพราะเครื่องที่พัฒนาโปรเจกต์นี้
 * ลง React ไม่ได้ แยกออกมาเป็นคลาสธรรมดาจึงเปิดในเบราว์เซอร์เปล่า ๆ
 * แล้วลองลากลองแตะด้วยเครื่องมืออัตโนมัติได้จริง
 */

import { vec3 } from '../safezone/vector3'
import type { Vec3 } from '../safezone/vector3'
import { SUN, getPlanet } from './planets'
import type { PlanetId } from './planets'
import { drawSolarSystem } from './render'
import {
  MAX_PITCH,
  MIN_PITCH,
  OVERVIEW,
  clampView,
  closeUpDistance,
  easeView,
  flightPosition,
  flightSeconds,
  parkingSpot,
  pickBody,
  planetPosition,
  sunSideYaw,
} from './space'
import type { BodyId, BodyOnScreen, OrbitView } from './space'
import type { ShipLook } from './render'

export interface SceneEvents {
  /** แตะโดนดาวหรือดวงอาทิตย์ แตะที่ว่างได้ null */
  onPick: (id: BodyId | null) => void
  /** ยานบินถึงปลายทางแล้ว */
  onArrive: (id: PlanetId) => void
  /** เวลาในแบบจำลองเปลี่ยน ส่งมาไม่ถี่เกินสี่ครั้งต่อวินาที */
  onClock?: (days: number) => void
}

export interface SceneOptions {
  days: number
  reduceMotion: boolean
  /** ยานเริ่มจอดที่ดาวดวงไหน */
  parkedAt: PlanetId
}

type Focus = { kind: 'body'; id: BodyId } | { kind: 'ship' } | { kind: 'point'; point: Vec3 }

interface Flight {
  from: Vec3
  to: PlanetId
  elapsed: number
  duration: number
}

/** นิ้วขยับน้อยกว่านี้ (พิกเซลของจอ) นับเป็นการแตะ ไม่ใช่การลาก */
const TAP_SLOP = 8
/** ความไวของการลากหมุนกล้อง เรเดียนต่อพิกเซลของจอ */
const DRAG_SPEED = 0.006

export class SolarScene {
  private readonly canvas: HTMLCanvasElement
  private readonly ctx: CanvasRenderingContext2D | null
  private readonly events: SceneEvents

  private frame = 0
  private last = 0
  private running = false

  private days: number
  private spinSeconds = 0
  private speed = 2
  private clockSent = 0

  private view: OrbitView = { ...OVERVIEW }
  private goal: OrbitView = { ...OVERVIEW }
  private focusOn: Focus = { kind: 'body', id: 'sun' }
  private autoSpin = false

  private parkedAt: PlanetId
  private flight: Flight | null = null
  private ship: Vec3
  private heading: Vec3 | null = null

  private selected: BodyId | null = null
  private highlight: PlanetId | null = null
  private stamped: PlanetId[] = []
  private ruledOut: PlanetId[] = []
  private aim = false
  private labels = true
  private orbits = true
  private reduceMotion: boolean
  private faces = false
  private awake: BodyId[] | undefined = undefined
  private poked: { id: BodyId; at: number } | null = null
  private shipLook: ShipLook | undefined = undefined
  private companion: HTMLImageElement | null = null

  private bodies: BodyOnScreen[] = []
  private readonly pointers = new Map<number, { x: number; y: number }>()
  private press: { x: number; y: number; moved: boolean } | null = null
  private pinchGap = 0

  constructor(canvas: HTMLCanvasElement, events: SceneEvents, options: SceneOptions) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')
    this.events = events
    this.days = options.days
    this.reduceMotion = options.reduceMotion
    this.parkedAt = options.parkedAt
    this.ship = parkingSpot(options.parkedAt, options.days)
    this.view = { ...OVERVIEW, distance: this.overviewDistance() }
    this.goal = { ...this.view }

    canvas.addEventListener('pointerdown', this.handleDown)
    canvas.addEventListener('pointermove', this.handleMove)
    canvas.addEventListener('pointerup', this.handleUp)
    canvas.addEventListener('pointercancel', this.handleCancel)
    canvas.addEventListener('lostpointercapture', this.handleCancel)
    // ต้องไม่เป็น passive ไม่งั้นเรียก preventDefault ไม่ได้ แล้วหมุนล้อเมาส์เพื่อซูมจะเลื่อนทั้งหน้าไปด้วย
    canvas.addEventListener('wheel', this.handleWheel, { passive: false })
  }

  start(): void {
    if (this.running) return
    this.running = true
    this.last = performance.now()
    this.frame = requestAnimationFrame(this.tick)
  }

  destroy(): void {
    this.running = false
    cancelAnimationFrame(this.frame)
    this.canvas.removeEventListener('pointerdown', this.handleDown)
    this.canvas.removeEventListener('pointermove', this.handleMove)
    this.canvas.removeEventListener('pointerup', this.handleUp)
    this.canvas.removeEventListener('pointercancel', this.handleCancel)
    this.canvas.removeEventListener('lostpointercapture', this.handleCancel)
    this.canvas.removeEventListener('wheel', this.handleWheel)
  }

  /* ---------------- ตั้งค่าจากหน้าจอ ---------------- */

  setSpeed(daysPerSecond: number): void {
    this.speed = Math.max(0, daysPerSecond)
  }

  setDays(days: number): void {
    this.days = days
    this.events.onClock?.(days)
  }

  getDays(): number {
    return this.days
  }

  setReduceMotion(value: boolean): void {
    this.reduceMotion = value
  }

  setSelected(id: BodyId | null): void {
    this.selected = id
  }

  setHighlight(id: PlanetId | null): void {
    this.highlight = id
  }

  setStamped(ids: readonly PlanetId[]): void {
    this.stamped = [...ids]
  }

  setRuledOut(ids: readonly PlanetId[]): void {
    this.ruledOut = [...ids]
  }

  setAim(value: boolean): void {
    this.aim = value
  }

  /** หน้าตาน่ารักบนดาว ภารกิจแปดดาวเปิด เกมยานสำรวจปิดไว้ */
  setFaces(value: boolean): void {
    this.faces = value
  }

  /** ดาวที่ตื่นแล้ว ดวงอื่นวาดเป็นหลับตามี z ลอย ส่ง undefined คือตื่นทุกดวง */
  setAwake(ids: readonly BodyId[] | undefined): void {
    this.awake = ids ? [...ids] : undefined
  }

  /** ให้ดาวดวงนี้เด้งดึ๋งแล้วหัวเราะ ใช้ตอนเด็กแตะดาว */
  poke(id: BodyId): void {
    this.poked = { id, at: performance.now() }
  }

  /** สียานกับรูปเพื่อนร่วมทางจากอู่ต่อยาน ส่ง undefined กับ null คือยานสีเดิมไม่มีใครนั่งด้วย */
  setShipLook(look: ShipLook | undefined, companion: HTMLImageElement | null): void {
    this.shipLook = look
    this.companion = companion
  }

  setLabels(value: boolean): void {
    this.labels = value
  }

  setOrbits(value: boolean): void {
    this.orbits = value
  }

  /** หมุนกล้องรอบฉากเองช้า ๆ ใช้ตอนหน้าแรกที่ยังไม่มีใครแตะ */
  setAutoSpin(value: boolean): void {
    this.autoSpin = value
  }

  isFlying(): boolean {
    return this.flight !== null
  }

  /* ---------------- กล้อง ---------------- */

  /** ถอยกล้องออกมาเห็นทั้งระบบ มุมหมุนเดิมยังอยู่ เด็กจะได้ไม่หลงทิศ */
  overview(): void {
    this.focusOn = { kind: 'body', id: 'sun' }
    this.goal = clampView({ ...this.goal, target: vec3(0, 0, 0), distance: this.overviewDistance(), pitch: OVERVIEW.pitch })
  }

  /**
   * ระยะที่เห็นวงโคจรของดาวเนปจูนครบ
   *
   * การฉายภาพอิงความสูงของจอ จอที่แคบกว่าปกติ (โทรศัพท์ แท็บเล็ตแนวตั้ง)
   * จึงตัดขอบซ้ายขวาของระบบสุริยะทิ้ง ต้องถอยกล้องออกไปอีกตามสัดส่วน
   */
  private overviewDistance(): number {
    const width = this.canvas.clientWidth
    const height = this.canvas.clientHeight
    if (width <= 0 || height <= 0) return OVERVIEW.distance
    return OVERVIEW.distance * Math.max(1, 1.45 / (width / height))
  }

  /** ซูมเข้าไปดูดาวดวงเดียว มองจากฝั่งที่โดนแสง */
  focusBody(id: BodyId): void {
    this.focusOn = { kind: 'body', id }
    if (id === 'sun') {
      this.goal = clampView({ ...this.goal, target: vec3(0, 0, 0), distance: SUN.sceneRadius * 7, pitch: 0.35 })
      return
    }
    const planet = getPlanet(id)
    const center = planetPosition(planet, this.days)
    this.goal = clampView({
      target: center,
      yaw: sunSideYaw(center),
      pitch: 0.3,
      distance: closeUpDistance(planet),
    })
  }

  zoom(factor: number): void {
    this.goal = clampView({ ...this.goal, distance: this.goal.distance * factor })
  }

  rotate(yaw: number, pitch: number): void {
    this.goal = clampView({ ...this.goal, yaw: this.goal.yaw + yaw, pitch: this.goal.pitch + pitch })
  }

  /* ---------------- ยาน ---------------- */

  /** วางยานไว้ที่ดาวดวงหนึ่งทันที ไม่ต้องบิน ใช้ตอนเริ่มทริปใหม่ */
  parkAt(id: PlanetId): void {
    this.flight = null
    this.parkedAt = id
    this.ship = parkingSpot(id, this.days)
    this.heading = null
  }

  /**
   * ออกบินไปดาวดวงหนึ่ง
   *
   * ถ้าปิดการเคลื่อนไหวไว้ ยานไปถึงทันทีในเฟรมถัดไป
   * ไม่ได้ข้ามการแจ้งว่าถึงแล้ว หน้าจอจึงทำงานเหมือนเดิมทุกอย่าง
   */
  flyTo(id: PlanetId): void {
    const destination = parkingSpot(id, this.days)
    this.flight = {
      from: { ...this.ship },
      to: id,
      elapsed: 0,
      duration: this.reduceMotion ? 0 : flightSeconds(this.ship, destination),
    }
    this.focusOn = { kind: 'ship' }
    const center = planetPosition(getPlanet(id), this.days)
    this.goal = clampView({
      target: { ...this.ship },
      yaw: sunSideYaw(center),
      pitch: 0.32,
      distance: Math.max(closeUpDistance(getPlanet(id)) * 1.6, 14),
    })
  }

  /* ---------------- ใช้ในชุดทดสอบและหน้าจอ ---------------- */

  /** ตำแหน่งบนผืนผ้าใบของดาวดวงหนึ่งในเฟรมล่าสุด (พิกเซลของผืนผ้าใบ) */
  screenPositionOf(id: BodyId): { x: number; y: number; radius: number } | null {
    const body = this.bodies.find((candidate) => candidate.id === id)
    return body ? { x: body.x, y: body.y, radius: body.radius } : null
  }

  currentView(): OrbitView {
    return { ...this.view, target: { ...this.view.target } }
  }

  /* ---------------- วงวนหลัก ---------------- */

  private readonly tick = (now: number): void => {
    if (!this.running) return
    // เฟรมที่ห่างกันมาก (สลับแท็บกลับมา) ถูกตัดเหลือ 0.1 วินาที ไม่งั้นยานจะวาร์ปไปถึงทันที
    const dt = Math.min(0.1, Math.max(0, (now - this.last) / 1000))
    this.last = now
    this.step(dt)
    this.draw(now)
    this.frame = requestAnimationFrame(this.tick)
  }

  private step(dt: number): void {
    this.days += this.speed * dt
    if (this.speed > 0) this.spinSeconds += dt

    if (this.autoSpin && this.pointers.size === 0 && !this.reduceMotion) {
      this.goal = { ...this.goal, yaw: this.goal.yaw + dt * 0.05 }
    }

    if (this.flight) {
      const flight = this.flight
      flight.elapsed += dt
      const destination = parkingSpot(flight.to, this.days)
      const t = flight.duration === 0 ? 1 : flight.elapsed / flight.duration
      const next = t >= 1 ? destination : flightPosition(flight.from, destination, t)
      const moved = vec3(next.x - this.ship.x, next.y - this.ship.y, next.z - this.ship.z)
      if (Math.hypot(moved.x, moved.y, moved.z) > 1e-4) this.heading = moved
      this.ship = next
      if (t >= 1) {
        this.flight = null
        this.parkedAt = flight.to
        this.heading = null
        this.focusBody(flight.to)
        this.events.onArrive(flight.to)
      }
    } else {
      // ยานจอดลอยขึ้นลงเบา ๆ ข้างดาว ให้รู้ว่ายังมีชีวิต ไม่ได้ค้าง
      const spot = parkingSpot(this.parkedAt, this.days)
      const bob = this.reduceMotion ? 0 : Math.sin(this.spinSeconds * 1.8) * 0.06
      this.ship = vec3(spot.x, spot.y + bob, spot.z)
    }

    // เป้าหมายของกล้องเลื่อนตามสิ่งที่กำลังดู เพราะดาวไม่เคยหยุดโคจร
    const focus = this.focusOn
    if (focus.kind === 'ship') {
      this.goal = { ...this.goal, target: { ...this.ship } }
    } else if (focus.kind === 'body') {
      this.goal = {
        ...this.goal,
        target: focus.id === 'sun' ? vec3(0, 0, 0) : planetPosition(getPlanet(focus.id), this.days),
      }
    }

    this.view = this.reduceMotion ? { ...this.goal } : easeView(this.view, this.goal, dt, 4.5)

    if (this.events.onClock && performance.now() - this.clockSent > 250) {
      this.clockSent = performance.now()
      this.events.onClock(this.days)
    }
  }

  private pixelRatio(): number {
    return Math.min(2, typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1)
  }

  private draw(now: number): void {
    const ctx = this.ctx
    if (!ctx) return

    // ตั้งขนาดผืนผ้าใบให้ตรงกับขนาดที่แสดงจริงทุกเฟรม หมุนจอหรือย่อหน้าต่างแล้วภาพไม่เบลอ
    const ratio = this.pixelRatio()
    const width = Math.max(1, Math.round(this.canvas.clientWidth * ratio))
    const height = Math.max(1, Math.round(this.canvas.clientHeight * ratio))
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width
      this.canvas.height = height
    }

    this.bodies = drawSolarSystem(ctx, { width, height }, {
      days: this.days,
      spinSeconds: this.spinSeconds,
      view: this.view,
      selected: this.selected,
      highlight: this.highlight,
      stamped: this.stamped,
      ruledOut: this.ruledOut,
      ship: this.ship,
      shipHeading: this.heading,
      thrust: this.flight !== null,
      aim: this.aim && this.flight === null,
      showLabels: this.labels,
      showOrbits: this.orbits,
      now,
      reduceMotion: this.reduceMotion,
      pixelRatio: ratio,
      faces: this.faces,
      awake: this.awake,
      poke: this.poked,
      shipLook: this.shipLook,
      companion: this.companion,
    })
  }

  /* ---------------- นิ้วและเมาส์ ---------------- */

  /** แปลงพิกัดของเหตุการณ์เป็นพิกเซลของผืนผ้าใบ */
  private toCanvas(event: PointerEvent | WheelEvent): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect()
    const scaleX = rect.width > 0 ? this.canvas.width / rect.width : 1
    const scaleY = rect.height > 0 ? this.canvas.height / rect.height : 1
    return { x: (event.clientX - rect.left) * scaleX, y: (event.clientY - rect.top) * scaleY }
  }

  private spread(): number {
    const points = [...this.pointers.values()]
    if (points.length < 2) return 0
    const [a, b] = points as [{ x: number; y: number }, { x: number; y: number }]
    return Math.hypot(a.x - b.x, a.y - b.y)
  }

  private readonly handleDown = (event: PointerEvent): void => {
    this.autoSpin = false
    this.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY })
    try {
      this.canvas.setPointerCapture(event.pointerId)
    } catch {
      // บางเบราว์เซอร์ปฏิเสธการจับนิ้วที่ไม่ได้เริ่มบนผืนผ้าใบ ไม่เป็นไร ลากต่อได้ตามปกติ
    }
    if (this.pointers.size === 1) {
      this.press = { x: event.clientX, y: event.clientY, moved: false }
    } else {
      // นิ้วที่สองลงมา แปลว่ากำลังจะซูม ไม่ใช่แตะเลือกดาว
      this.press = null
      this.pinchGap = this.spread()
    }
  }

  private readonly handleMove = (event: PointerEvent): void => {
    const previous = this.pointers.get(event.pointerId)
    if (!previous) return
    const dx = event.clientX - previous.x
    const dy = event.clientY - previous.y
    this.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY })

    if (this.pointers.size >= 2) {
      const gap = this.spread()
      if (this.pinchGap > 0 && gap > 0) this.zoom(this.pinchGap / gap)
      this.pinchGap = gap
      return
    }

    if (this.press && !this.press.moved) {
      const travelled = Math.hypot(event.clientX - this.press.x, event.clientY - this.press.y)
      if (travelled < TAP_SLOP) return
      this.press.moved = true
    }
    /*
     * ลากไปทางขวาแล้วฉากหมุนตามนิ้วไปทางขวา เหมือนหมุนลูกโลกบนโต๊ะ
     * แปลว่ากล้องต้องโคจรไปทางซ้าย มุม yaw จึงลดลง
     */
    this.goal = clampView({
      ...this.goal,
      yaw: this.goal.yaw - dx * DRAG_SPEED,
      pitch: Math.max(MIN_PITCH, Math.min(MAX_PITCH, this.goal.pitch + dy * DRAG_SPEED)),
    })
    if (this.reduceMotion) this.view = { ...this.goal }
  }

  private readonly handleUp = (event: PointerEvent): void => {
    const press = this.press
    this.pointers.delete(event.pointerId)
    if (this.pointers.size < 2) this.pinchGap = 0
    if (this.pointers.size > 0) return
    this.press = null
    if (!press || press.moved) return

    const point = this.toCanvas(event)
    this.events.onPick(pickBody(point.x, point.y, this.bodies, 26 * this.pixelRatio()))
  }

  private readonly handleCancel = (event: PointerEvent): void => {
    this.pointers.delete(event.pointerId)
    if (this.pointers.size < 2) this.pinchGap = 0
    if (this.pointers.size === 0) this.press = null
  }

  private readonly handleWheel = (event: WheelEvent): void => {
    event.preventDefault()
    this.autoSpin = false
    this.zoom(Math.exp(Math.max(-1, Math.min(1, event.deltaY * 0.0015))))
  }
}
