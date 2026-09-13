/**
 * ห้องเรขาคณิตแสนน่ารัก
 *
 * โต๊ะทำงานหนึ่งโต๊ะสำหรับสอนเรื่องรูปหลายเหลี่ยม มีของครบเหมือนกล่องดินสอจริง
 * วงเวียน ครึ่งวงกลมวัดมุม ไม้บรรทัด ดินสอ ยางลบ และกระดาษที่มีเส้นตาราง
 *
 * ทำไมต้องเลียนแบบของจริง แทนที่จะให้กดปุ่ม "สร้างหกเหลี่ยม" ทีเดียวจบ
 *
 * เพราะสิ่งที่เด็กต้องได้จากคาบนี้ไม่ใช่รูปหกเหลี่ยม แต่คือวิธีสร้างมันขึ้นมา
 * ปุ่มสำเร็จรูปให้ภาพที่สวยกว่าและเร็วกว่า แต่ไม่ได้สอนอะไรเลย
 * ที่นี่จึงต้องปักเข็มวงเวียนเอง กางรัศมีเอง แล้วหมุนเอง เหมือนบนกระดาษจริง
 * ส่วนปุ่มสำเร็จรูปยังมีอยู่ (รูปด้านเท่า) ไว้ใช้ตอนครูอยากยกตัวอย่างเร็ว ๆ
 */

import { useEffect, useReducer, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGame } from '../context/useGame'
import { playSfx } from '../services/audioService'
import { CompassArt } from '../geometry/CompassArt'
import type { CompassPart } from '../geometry/CompassArt'
import { Mascot } from '../geometry/Mascot'
import { ProtractorOverlay } from '../geometry/ProtractorOverlay'
import type { ProtractorPart } from '../geometry/ProtractorOverlay'
import { RulerOverlay } from '../geometry/RulerOverlay'
import type { RulerPart } from '../geometry/RulerOverlay'
import { ShapeView } from '../geometry/ShapeView'
import { EMPTY_BOARD, boardReducer, canRedo, canUndo } from '../geometry/board'
import { MISSIONS, nextMissionIndex } from '../geometry/missions'
import { PENCIL_COLORS, PENCIL_WIDTHS, TOOLS, findTool } from '../geometry/tools'
import type { ToolId } from '../geometry/tools'
import {
  describeBoard,
  describeShape,
  findShapeAt,
  nearestSnapPoint,
  translateShape,
} from '../geometry/shapes'
import type { Shape } from '../geometry/shapes'
import {
  PX_PER_CM,
  accumulateSweep,
  angleOf,
  arcPath,
  distance,
  distanceToSegment,
  formatCm,
  formatDeg,
  normalizeDeg,
  pointAt,
  pointLabel,
  polygonName,
  projectOnLine,
  regularPolygon,
  snapDeg,
  snapEnd,
  snapToGrid,
  toCm,
} from '../geometry/geo'
import type { Point } from '../geometry/geo'

/** ขนาดกระดาษในระบบพิกัดของ SVG เท่ากับ 25 x 17 เซนติเมตร */
const VIEW_WIDTH = 1000
const VIEW_HEIGHT = 680

/** แม่เหล็กดูดเข้าเส้นตารางทีละครึ่งเซนติเมตร */
const GRID_STEP = PX_PER_CM / 2
/** ระยะที่ปลายดินสอจะวิ่งไปชนจุดเดิมที่มีอยู่แล้ว */
const ANCHOR_RADIUS = 16
const PROTRACTOR_RADIUS = 200
const RULER_LENGTH_CM = 20
/** ระยะจากขอบไม้บรรทัดที่ถือว่ากำลังลากดินสอตามไม้บรรทัด */
const RULER_GUIDE_RANGE = 30

/**
 * วงเวียนที่วางค้างอยู่บนกระดาษ
 *
 * เก็บไว้ตลอด ไม่ได้หายไปหลังวาดเสร็จเหมือนเวอร์ชันแรก
 * เพราะงานวงเวียนเกือบทุกอย่างต้องย้ายเข็มไปปักที่ใหม่โดยไม่เปลี่ยนระยะกาง
 * เช่น การแบ่งเส้นรอบวงเป็นหกส่วนเพื่อสร้างหกเหลี่ยมด้านเท่า
 */
interface CompassState {
  center: Point
  radius: number
  /** ทิศที่ปลายดินสอชี้อยู่ */
  angle: number
}

type Drag =
  | { kind: 'none' }
  | { kind: 'pen'; start: Point; end: Point; guided: boolean }
  | { kind: 'regular'; center: Point; edge: Point }
  /** ลากเข็มเพื่อย้ายวงเวียน โดย grab คือระยะเยื้องจากปลายนิ้วถึงเข็ม */
  | { kind: 'compass-move'; grab: Point }
  /** ลากขาดินสอเพื่อกางรัศมี ไม่มีการวาดเกิดขึ้น */
  | { kind: 'compass-spread' }
  /** จับหัวหรือปลายดินสอหมุนวาด รัศมีถูกล็อกไว้ */
  | { kind: 'compass-draw'; start: number; sweep: number; last: number }
  | { kind: 'move'; id: string; last: Point; marked: boolean }
  | { kind: 'protractor'; part: ProtractorPart; grab: Point }
  | { kind: 'ruler'; part: RulerPart; grab: Point }

export function GeometryStudio() {
  const navigate = useNavigate()
  const { player } = useGame()

  const [board, dispatch] = useReducer(boardReducer, EMPTY_BOARD)
  const [tool, setTool] = useState<ToolId>('pen')
  const [color, setColor] = useState(PENCIL_COLORS[0].value)
  const [width, setWidth] = useState(PENCIL_WIDTHS[1].value)
  const [sides, setSides] = useState(6)

  const [showGrid, setShowGrid] = useState(true)
  const [snapOn, setSnapOn] = useState(true)
  const [showLengths, setShowLengths] = useState(true)
  const [showAngles, setShowAngles] = useState(true)
  const [showRuler, setShowRuler] = useState(false)
  const [showProtractor, setShowProtractor] = useState(false)

  const [ruler, setRuler] = useState({ origin: { x: 110, y: 560 }, rotation: 0 })
  const [protractor, setProtractor] = useState({ center: { x: 520, y: 430 }, rotation: 0 })

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [draft, setDraft] = useState<Point[]>([])
  const [anglePicks, setAnglePicks] = useState<Point[]>([])
  const [compass, setCompass] = useState<CompassState>({
    center: { x: 300, y: 340 },
    radius: 3 * PX_PER_CM,
    angle: 60,
  })
  const [drag, setDrag] = useState<Drag>({ kind: 'none' })
  const [pointer, setPointer] = useState<Point | null>(null)
  const [cheering, setCheering] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [missionIndex, setMissionIndex] = useState(0)

  const svgRef = useRef<SVGSVGElement | null>(null)
  const idRef = useRef(1)
  /*
   * ตัวนับชื่อจุด นับขึ้นอย่างเดียว ไม่ลดลงตอนลบจุดทิ้ง
   * ถ้านับจากจำนวนจุดที่มีอยู่ พอลบจุด B แล้วปักใหม่จะได้ชื่อ C ซ้ำกับจุดที่มีอยู่
   * แล้วเด็กจะเขียนคำตอบว่า "มุม ABC" โดยที่มีจุด C สองจุดบนกระดาษ
   */
  const labelRef = useRef(0)
  const cheerTimer = useRef<number | null>(null)
  const noticeTimer = useRef<number | null>(null)

  const toolInfo = findTool(tool)
  const mission = MISSIONS[missionIndex]
  const selected = board.shapes.find((shape) => shape.id === selectedId) ?? null

  /* เก็บกวาดตัวจับเวลาตอนออกจากหน้า ไม่งั้น React จะเตือนว่าอัปเดตของที่ถูกถอดไปแล้ว */
  useEffect(() => {
    return () => {
      if (cheerTimer.current !== null) window.clearTimeout(cheerTimer.current)
      if (noticeTimer.current !== null) window.clearTimeout(noticeTimer.current)
    }
  }, [])

  function makeId(): string {
    idRef.current += 1
    return `shape-${idRef.current}`
  }

  function say(message: string) {
    setNotice(message)
    if (noticeTimer.current !== null) window.clearTimeout(noticeTimer.current)
    noticeTimer.current = window.setTimeout(() => setNotice(null), 2600)
  }

  function celebrate() {
    setCheering(true)
    if (cheerTimer.current !== null) window.clearTimeout(cheerTimer.current)
    cheerTimer.current = window.setTimeout(() => setCheering(false), 1400)
  }

  function addShape(shape: Shape) {
    dispatch({ type: 'add', shape })
    playSfx('pickup')
    celebrate()
  }

  /* ------------------------------------------------------------------ */
  /* พิกัดและแม่เหล็ก                                                     */
  /* ------------------------------------------------------------------ */

  /**
   * แปลงตำแหน่งนิ้วบนจอเป็นพิกัดบนกระดาษ
   *
   * ใช้สัดส่วนของกรอบเทียบกับ viewBox ตรง ๆ ไม่ใช้เมทริกซ์ของ SVG
   * เพราะกระดาษถูกย่อขยายตามความกว้างจอโดยรักษาสัดส่วนอยู่แล้ว
   * วิธีนี้จึงให้ผลเท่ากันแต่ไม่ต้องพึ่ง API ที่บางเบราว์เซอร์คืน null
   */
  function toPaper(event: { clientX: number; clientY: number }): Point {
    const svg = svgRef.current
    if (!svg) return { x: 0, y: 0 }
    const rect = svg.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) return { x: 0, y: 0 }
    return {
      x: ((event.clientX - rect.left) / rect.width) * VIEW_WIDTH,
      y: ((event.clientY - rect.top) / rect.height) * VIEW_HEIGHT,
    }
  }

  const rulerStart = ruler.origin
  const rulerEnd = pointAt(ruler.origin, RULER_LENGTH_CM * PX_PER_CM, ruler.rotation)

  function alongRuler(p: Point): boolean {
    return showRuler && distanceToSegment(p, rulerStart, rulerEnd) <= RULER_GUIDE_RANGE
  }

  /**
   * ดูดจุดเข้าหาสิ่งที่มีอยู่แล้วก่อน ถ้าไม่มีค่อยดูดเข้าเส้นตาราง
   *
   * ลำดับคือ จุดยอดที่มองเห็น แล้วจึงเป็นจุดที่เส้นโค้งสองเส้นตัดกัน
   * จุดตัดสำคัญมากในงานวงเวียน เพราะเป็นปลายทางของเส้นที่ต้องลากเกือบทุกครั้ง
   * แต่มันไม่ได้ถูกวาดไว้ให้เห็น ถ้าไม่ดูดให้ เด็กจะกะเอาเองแล้วรูปเพี้ยน
   */
  function snapPoint(p: Point): Point {
    const target = nearestSnapPoint(board.shapes, p, ANCHOR_RADIUS)
    if (target) return target
    for (const point of draft) {
      if (distance(point, p) <= ANCHOR_RADIUS) return point
    }
    return snapOn ? snapToGrid(p, GRID_STEP) : p
  }

  /** ปลายเส้นระหว่างลาก ดูดเข้าจุดเดิม จุดตัด มุมที่ลงตัว หรือขอบไม้บรรทัด */
  function penEnd(start: Point, raw: Point, guided: boolean): Point {
    const target = nearestSnapPoint(board.shapes, raw, ANCHOR_RADIUS)
    const end = target ?? (snapOn ? snapEnd(start, raw, 15, 0.5) : raw)
    return guided ? projectOnLine(end, rulerStart, rulerEnd) : end
  }

  /* ------------------------------------------------------------------ */
  /* เครื่องมือแต่ละชิ้นตอนถูกใช้งาน                                        */
  /* ------------------------------------------------------------------ */

  /** วางวงกลมเต็มวงจากตำแหน่งและระยะกางของวงเวียนตอนนี้ */
  function drawFullCircle() {
    addShape({
      kind: 'circle',
      id: makeId(),
      color,
      width,
      center: { ...compass.center },
      radius: compass.radius,
    })
    say(`วาดวงกลมรัศมี ${formatCm(compass.radius)} แล้ว`)
  }

  /**
   * วางส่วนโค้งที่เพิ่งหมุนวาดลงกระดาษ
   *
   * หมุนเกือบครบรอบถือว่าตั้งใจวาดวงกลม เพราะรอยต่อที่ขาดไปสององศา
   * มองด้วยตาเหมือนวงกลมทุกประการ แต่เวลาเอาไปหาจุดตัดจะพลาดตรงรอยต่อพอดี
   */
  function commitSweep(start: number, sweep: number) {
    if (Math.abs(sweep) < 3) return
    if (Math.abs(sweep) >= 358) {
      drawFullCircle()
      return
    }
    addShape({
      kind: 'arc',
      id: makeId(),
      color,
      width,
      center: { ...compass.center },
      radius: compass.radius,
      start,
      sweep,
    })
  }

  function closeDraftPolygon() {
    if (draft.length < 3) {
      setDraft([])
      return
    }
    addShape({
      kind: 'polygon',
      id: makeId(),
      color,
      width,
      points: draft,
      closed: true,
      fill: `${color}22`,
    })
    playSfx('correct')
    say(`ปิดรูปแล้ว ได้${polygonName(draft.length)}เรียบร้อย`)
    setDraft([])
  }

  function handlePointerDown(event: ReactPointerEvent<SVGSVGElement>) {
    const raw = toPaper(event)
    svgRef.current?.setPointerCapture(event.pointerId)

    switch (tool) {
      case 'select': {
        const found = findShapeAt(board.shapes, raw)
        setSelectedId(found ? found.id : null)
        /*
         * ยังไม่จดประวัติตรงนี้ รอจนกว่านิ้วจะขยับจริง
         * เพราะการจิ้มเพื่อ "ดู" ว่ารูปนี้ยาวเท่าไร เป็นสิ่งที่เด็กทำบ่อยมาก
         * ถ้าจดทุกครั้งที่จิ้ม ปุ่มย้อนกลับจะเต็มไปด้วยขั้นที่ไม่มีอะไรเปลี่ยน
         * แล้วเด็กจะกดย้อนกลับสิบครั้งโดยที่ภาพบนจอไม่ขยับเลย
         */
        if (found) {
          setDrag({ kind: 'move', id: found.id, last: raw, marked: false })
        }
        return
      }

      case 'pen': {
        const guided = alongRuler(raw)
        const start = guided ? projectOnLine(snapPoint(raw), rulerStart, rulerEnd) : snapPoint(raw)
        setDrag({ kind: 'pen', start, end: start, guided })
        return
      }

      case 'regular': {
        const center = snapPoint(raw)
        setDrag({ kind: 'regular', center, edge: center })
        return
      }

      case 'compass': {
        /*
         * แตะที่ว่างบนกระดาษคือการย้ายเข็มไปปักที่ใหม่ ไม่ใช่การวาด
         * การวาดเกิดขึ้นเฉพาะตอนจับหัววงเวียนหรือปลายดินสอหมุนเท่านั้น
         * เวอร์ชันแรกวาดทันทีที่แตะกระดาษ ซึ่งทำให้ได้เส้นที่ไม่ได้ตั้งใจตลอดเวลา
         */
        setCompass({ ...compass, center: snapPoint(raw) })
        playSfx('click')
        return
      }

      case 'polygon': {
        const point = snapPoint(raw)
        if (draft.length >= 3 && distance(point, draft[0]) <= ANCHOR_RADIUS + 6) {
          closeDraftPolygon()
          return
        }
        setDraft([...draft, point])
        playSfx('click')
        return
      }

      case 'angle': {
        const point = snapPoint(raw)
        const picks = [...anglePicks, point]
        if (picks.length < 3) {
          setAnglePicks(picks)
          playSfx('click')
          return
        }
        addShape({
          kind: 'angle',
          id: makeId(),
          color,
          width,
          a: picks[0],
          vertex: picks[1],
          b: picks[2],
        })
        setAnglePicks([])
        return
      }

      case 'dot': {
        const label = pointLabel(labelRef.current)
        labelRef.current += 1
        addShape({
          kind: 'dot',
          id: makeId(),
          color,
          width,
          at: snapPoint(raw),
          label,
        })
        return
      }

      case 'eraser': {
        const found = findShapeAt(board.shapes, raw)
        if (!found) return
        dispatch({ type: 'remove', id: found.id })
        if (selectedId === found.id) setSelectedId(null)
        playSfx('click')
        return
      }

      default:
        return
    }
  }

  function handlePointerMove(event: ReactPointerEvent<SVGSVGElement>) {
    const raw = toPaper(event)
    /*
     * เก็บตำแหน่งนิ้วเฉพาะตอนที่มีของรอใช้ค่านี้จริง ๆ
     * คือเส้นยางยืดของรูปหลายเหลี่ยม กับขีดองศาที่สว่างขึ้นบนครึ่งวงกลม
     * ถ้าเก็บทุกครั้ง หน้าจอจะวาดใหม่ทั้งหน้าทุกการขยับนิ้ว โดยไม่มีอะไรเปลี่ยน
     */
    if (tool === 'polygon' || showProtractor) setPointer(raw)

    switch (drag.kind) {
      case 'pen':
        setDrag({ ...drag, end: penEnd(drag.start, raw, drag.guided) })
        return

      case 'regular':
        setDrag({ kind: 'regular', center: drag.center, edge: raw })
        return

      case 'compass-move':
        setCompass({
          ...compass,
          center: snapPoint({ x: raw.x + drag.grab.x, y: raw.y + drag.grab.y }),
        })
        return

      case 'compass-spread':
        /* กางหรือหุบขา ระยะเปลี่ยน ทิศของปลายดินสอเดินตามนิ้วไปด้วย แต่ยังไม่วาดอะไร */
        setCompass({
          ...compass,
          radius: snappedRadius(compass.center, raw),
          angle: angleOf(compass.center, raw),
        })
        return

      case 'compass-draw': {
        /* รัศมีถูกล็อกไว้เหมือนวงเวียนจริงที่ขันน็อตแล้ว มีแต่มุมที่เปลี่ยน */
        const now = angleOf(compass.center, raw)
        setCompass({ ...compass, angle: now })
        setDrag({
          kind: 'compass-draw',
          start: drag.start,
          sweep: accumulateSweep(drag.sweep, drag.last, now),
          last: now,
        })
        return
      }

      case 'move': {
        const dx = raw.x - drag.last.x
        const dy = raw.y - drag.last.y
        if (!drag.marked) dispatch({ type: 'mark' })
        dispatch({
          type: 'live',
          shapes: board.shapes.map((shape) =>
            shape.id === drag.id ? translateShape(shape, dx, dy) : shape,
          ),
        })
        setDrag({ kind: 'move', id: drag.id, last: raw, marked: true })
        return
      }

      case 'protractor':
        if (drag.part === 'rotate') {
          setProtractor({
            ...protractor,
            rotation: snapDeg(angleOf(protractor.center, raw), snapOn ? 5 : 1),
          })
        } else {
          setProtractor({
            ...protractor,
            center: { x: raw.x + drag.grab.x, y: raw.y + drag.grab.y },
          })
        }
        return

      case 'ruler':
        if (drag.part === 'rotate') {
          setRuler({ ...ruler, rotation: snapDeg(angleOf(ruler.origin, raw), snapOn ? 5 : 1) })
        } else {
          setRuler({ ...ruler, origin: { x: raw.x + drag.grab.x, y: raw.y + drag.grab.y } })
        }
        return

      default:
        break
    }
  }

  function handlePointerUp(event: ReactPointerEvent<SVGSVGElement>) {
    const raw = toPaper(event)

    switch (drag.kind) {
      case 'pen': {
        const end = penEnd(drag.start, raw, drag.guided)
        if (distance(drag.start, end) >= 6) {
          addShape({ kind: 'segment', id: makeId(), color, width, a: drag.start, b: end })
        }
        break
      }

      case 'regular': {
        const radius = snappedRadius(drag.center, drag.edge)
        if (radius >= 14) {
          addShape({
            kind: 'polygon',
            id: makeId(),
            color,
            width,
            points: regularPolygon(drag.center, radius, sides, regularRotation(drag.center, drag.edge)),
            closed: true,
            fill: `${color}22`,
          })
          say(`ได้${polygonName(sides)}ด้านเท่าแล้ว ลองวัดมุมดูสิ`)
        }
        break
      }

      case 'compass-draw':
        /* ปล่อยมือจากหัววงเวียน ถือว่าวางส่วนโค้งที่เพิ่งหมุนลงกระดาษ */
        commitSweep(drag.start, drag.sweep)
        break

      default:
        break
    }

    setDrag({ kind: 'none' })
  }

  /**
   * จับวงเวียนตรงไหน ได้ผลต่างกันตามของจริง
   *
   * เข็มคือย้าย ขาดินสอคือกาง หัวกับปลายดินสอคือหมุนวาด
   * การแยกแบบนี้ทำให้ "แตะแล้วมีเส้นโผล่มาโดยไม่ได้ตั้งใจ" หมดไป
   */
  function handleCompassGrab(part: CompassPart, event: ReactPointerEvent<SVGElement>) {
    event.stopPropagation()
    const raw = toPaper(event)
    svgRef.current?.setPointerCapture(event.pointerId)

    if (part === 'move') {
      setDrag({
        kind: 'compass-move',
        grab: { x: compass.center.x - raw.x, y: compass.center.y - raw.y },
      })
      return
    }

    if (part === 'spread') {
      setDrag({ kind: 'compass-spread' })
      return
    }

    const startAngle = angleOf(compass.center, raw)
    setCompass({ ...compass, angle: startAngle })
    setDrag({ kind: 'compass-draw', start: startAngle, sweep: 0, last: startAngle })
  }

  function handleProtractorGrab(part: ProtractorPart, event: ReactPointerEvent<SVGElement>) {
    event.stopPropagation()
    const raw = toPaper(event)
    svgRef.current?.setPointerCapture(event.pointerId)

    if (part === 'scale') {
      const local = normalizeDeg(angleOf(protractor.center, raw) - protractor.rotation)
      if (local > 180) return
      const deg = Math.round(local)
      addShape({
        kind: 'segment',
        id: makeId(),
        color,
        width,
        a: { ...protractor.center },
        b: pointAt(protractor.center, PROTRACTOR_RADIUS, protractor.rotation + deg),
      })
      say(`ยิงเส้นที่มุม ${deg}° ออกไปแล้ว`)
      return
    }

    setDrag({
      kind: 'protractor',
      part,
      grab:
        part === 'move'
          ? { x: protractor.center.x - raw.x, y: protractor.center.y - raw.y }
          : { x: 0, y: 0 },
    })
  }

  function handleRulerGrab(part: RulerPart, event: ReactPointerEvent<SVGElement>) {
    event.stopPropagation()
    const raw = toPaper(event)
    svgRef.current?.setPointerCapture(event.pointerId)
    setDrag({
      kind: 'ruler',
      part,
      grab: part === 'move' ? { x: ruler.origin.x - raw.x, y: ruler.origin.y - raw.y } : { x: 0, y: 0 },
    })
  }

  /**
   * รัศมีระหว่างลาก ทั้งของวงเวียนและของรูปด้านเท่า
   *
   * ดูดเป็นครึ่งเซนติเมตรเมื่อเปิดแม่เหล็ก เพราะเลขที่เด็กต้องจดลงสมุด
   * ควรเป็น 3.0 หรือ 3.5 ไม่ใช่ 3.27 ซึ่งวัดซ้ำทีหลังแล้วไม่มีทางตรง
   */
  function snappedRadius(center: Point, edge: Point): number {
    const raw = distance(center, edge)
    if (!snapOn) return raw
    const step = PX_PER_CM / 2
    return Math.max(step, Math.round(raw / step) * step)
  }

  function regularRotation(center: Point, edge: Point): number {
    const raw = angleOf(center, edge)
    return snapOn ? snapDeg(raw, 15) : raw
  }

  /* ------------------------------------------------------------------ */
  /* ปุ่มจัดการกระดาษ                                                     */
  /* ------------------------------------------------------------------ */

  function chooseTool(next: ToolId) {
    setTool(next)
    setDraft([])
    setAnglePicks([])
    /* วงเวียนไม่ถูกเก็บทิ้ง มันรอเราอยู่ที่เดิมด้วยระยะกางเดิมเมื่อกลับมาใช้ */
    playSfx('click')
  }

  function removeSelected() {
    if (!selected) return
    dispatch({ type: 'remove', id: selected.id })
    setSelectedId(null)
    playSfx('click')
  }

  function clearBoard() {
    if (board.shapes.length === 0) return
    dispatch({ type: 'clear' })
    labelRef.current = 0
    setSelectedId(null)
    setDraft([])
    setAnglePicks([])
    say('ล้างกระดาษแล้ว กดย้อนกลับได้ถ้าเปลี่ยนใจ')
  }

  /**
   * บันทึกกระดาษเป็นไฟล์ภาพ
   *
   * ก๊อบปี้ SVG ออกมาก่อนแล้วลบของที่ไม่ควรติดไปในภาพทิ้ง
   * เช่น ไม้บรรทัด ครึ่งวงกลม และเส้นตัวอย่างระหว่างลาก
   * เด็กจะได้ภาพผลงานล้วน ๆ ไม่ใช่ภาพหน้าจอที่มีอุปกรณ์วางเกะกะ
   */
  function saveImage() {
    const svg = svgRef.current
    if (!svg) return
    const clone = svg.cloneNode(true) as SVGSVGElement
    clone.setAttribute('width', String(VIEW_WIDTH))
    clone.setAttribute('height', String(VIEW_HEIGHT))
    for (const node of Array.from(clone.querySelectorAll('.geo-no-export'))) {
      node.remove()
    }

    const source = new XMLSerializer().serializeToString(clone)
    const url = URL.createObjectURL(new Blob([source], { type: 'image/svg+xml;charset=utf-8' }))
    const image = new Image()

    image.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = VIEW_WIDTH * 2
      canvas.height = VIEW_HEIGHT * 2
      const context = canvas.getContext('2d')
      URL.revokeObjectURL(url)
      if (!context) {
        say('เครื่องนี้บันทึกภาพไม่ได้ ลองแคปหน้าจอแทนนะ')
        return
      }
      context.fillStyle = '#fffdf7'
      context.fillRect(0, 0, canvas.width, canvas.height)
      context.drawImage(image, 0, 0, canvas.width, canvas.height)
      const link = document.createElement('a')
      link.href = canvas.toDataURL('image/png')
      link.download = 'ผลงานเรขาคณิต.png'
      link.click()
      say('บันทึกรูปลงเครื่องแล้ว 🎉')
    }

    image.onerror = () => {
      URL.revokeObjectURL(url)
      say('บันทึกรูปไม่สำเร็จ ลองใหม่อีกครั้งนะ')
    }

    image.src = url
  }

  /* ปุ่มลัดสำหรับครูที่ใช้คีย์บอร์ด เด็กใช้ปุ่มบนจอได้เหมือนกัน */
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setDraft([])
        setAnglePicks([])
        /* ยกเลิกการหมุนที่ค้างอยู่ ส่วนโค้งที่กวาดไว้จะไม่ถูกวางลงกระดาษ */
        setDrag({ kind: 'none' })
        return
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
        event.preventDefault()
        dispatch({ type: event.shiftKey ? 'redo' : 'undo' })
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  /* ------------------------------------------------------------------ */
  /* ข้อมูลที่แสดงระหว่างทำงาน                                             */
  /* ------------------------------------------------------------------ */

  const protractorHighlight = (() => {
    if (!showProtractor || !pointer) return null
    const away = distance(pointer, protractor.center)
    if (away < PROTRACTOR_RADIUS - 70 || away > PROTRACTOR_RADIUS + 34) return null
    const local = normalizeDeg(angleOf(protractor.center, pointer) - protractor.rotation)
    return local <= 180 ? local : null
  })()

  const liveReadout = (() => {
    if (drag.kind === 'pen') {
      return `ยาว ${formatCm(distance(drag.start, drag.end))} · ทำมุม ${formatDeg(
        angleOf(drag.start, drag.end),
      )}${drag.guided ? ' · แนบไม้บรรทัด' : ''}`
    }
    if (drag.kind === 'regular') {
      const radius = snappedRadius(drag.center, drag.edge)
      const points = regularPolygon(drag.center, radius, sides, regularRotation(drag.center, drag.edge))
      return `${polygonName(sides)}ด้านเท่า · ด้านละ ${formatCm(distance(points[0], points[1]))}`
    }
    if (drag.kind === 'compass-spread') {
      return `กางวงเวียน ${formatCm(compass.radius)}`
    }
    if (drag.kind === 'compass-draw') {
      return `รัศมี ${formatCm(compass.radius)} · หมุนไปแล้ว ${formatDeg(Math.abs(drag.sweep))}`
    }
    if (drag.kind === 'compass-move') {
      return 'ย้ายเข็มวงเวียน ปล่อยตรงที่จะปัก'
    }
    if (tool === 'compass') {
      return `วงเวียนกางอยู่ ${formatCm(compass.radius)} · จับหัวหรือปลายดินสอแล้วหมุนเพื่อวาด`
    }
    if (draft.length > 0) {
      return `กำลังวาดรูปหลายเหลี่ยม มี ${draft.length} จุดแล้ว · จิ้มจุดแรกเพื่อปิดรูป`
    }
    if (anglePicks.length > 0) {
      return `เลือกจุดที่ ${anglePicks.length} จาก 3 แล้ว`
    }
    return toolInfo.steps.join(' → ')
  })()

  const report = selected ? describeShape(selected) : null
  const boardLines = describeBoard(board.shapes)

  const previewPolygon =
    drag.kind === 'regular'
      ? regularPolygon(
          drag.center,
          snappedRadius(drag.center, drag.edge),
          sides,
          regularRotation(drag.center, drag.edge),
        )
      : null

  return (
    <div className="geo-page min-h-screen pb-10">
      <header className="sticky top-0 z-30 border-b border-white/50 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-3 px-4 py-3">
          <button
            type="button"
            onClick={() => {
              playSfx('click')
              navigate(player ? '/menu' : '/')
            }}
            className="geo-chip"
          >
            ← กลับ
          </button>
          <h1 className="geo-title flex-1 text-lg font-extrabold sm:text-2xl">
            🎨 ห้องเรขาคณิตแสนน่ารัก
          </h1>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                dispatch({ type: 'undo' })
                playSfx('click')
              }}
              disabled={!canUndo(board)}
              className="geo-chip"
            >
              ↩️ ย้อนกลับ
            </button>
            <button
              type="button"
              onClick={() => {
                dispatch({ type: 'redo' })
                playSfx('click')
              }}
              disabled={!canRedo(board)}
              className="geo-chip"
            >
              ↪️ ทำซ้ำ
            </button>
            <button type="button" onClick={saveImage} className="geo-chip geo-chip-strong">
              💾 บันทึกรูป
            </button>
            <button type="button" onClick={clearBoard} className="geo-chip">
              🧹 ล้างกระดาษ
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1400px] gap-4 px-3 pt-4 lg:grid-cols-[230px_minmax(0,1fr)_310px]">
        {/* กล่องดินสอ */}
        <aside className="geo-panel order-2 lg:order-1">
          <h2 className="geo-heading">🧰 กล่องเครื่องมือ</h2>
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-1">
            {TOOLS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => chooseTool(item.id)}
                style={tool === item.id ? { backgroundColor: item.tint } : undefined}
                className={`geo-tool ${tool === item.id ? 'geo-tool-active' : ''}`}
              >
                <span className="text-xl" aria-hidden="true">
                  {item.emoji}
                </span>
                <span>{item.label}</span>
              </button>
            ))}
          </div>

          {tool === 'regular' ? (
            <div className="mt-3 rounded-2xl bg-white/70 p-3">
              <label className="flex items-center justify-between text-sm font-bold text-slate-600">
                จำนวนด้าน
                <span className="geo-badge">{sides} ด้าน</span>
              </label>
              <input
                type="range"
                min={3}
                max={12}
                step={1}
                value={sides}
                onChange={(event) => setSides(Number(event.target.value))}
                className="mt-2 w-full accent-violet-500"
                aria-label="จำนวนด้านของรูปหลายเหลี่ยมด้านเท่า"
              />
              <p className="mt-1 text-xs font-semibold text-slate-500">
                มุมภายในของ{polygonName(sides)}ด้านเท่า = {Math.round(((sides - 2) * 180) / sides)}°
              </p>
            </div>
          ) : null}

          {tool === 'polygon' && draft.length >= 3 ? (
            <button type="button" onClick={closeDraftPolygon} className="geo-chip mt-3 w-full">
              🔗 ปิดรูปเดี๋ยวนี้
            </button>
          ) : null}

          {tool === 'compass' ? (
            <div className="mt-3 rounded-2xl bg-white/70 p-3">
              <label
                htmlFor="compass-radius"
                className="flex items-center justify-between text-sm font-bold text-slate-600"
              >
                ระยะกางวงเวียน
                <span className="geo-badge">{formatCm(compass.radius)}</span>
              </label>
              <input
                id="compass-radius"
                type="range"
                min={0.5}
                max={8}
                step={0.5}
                value={Math.round(toCm(compass.radius) * 2) / 2}
                onChange={(event) =>
                  setCompass({ ...compass, radius: Number(event.target.value) * PX_PER_CM })
                }
                className="mt-2 w-full accent-violet-500"
              />
              <button
                type="button"
                onClick={drawFullCircle}
                className="geo-chip geo-chip-strong mt-2 w-full"
              >
                ⭕ วาดวงกลมเต็มวง
              </button>
              {/*
                ป้ายบอกที่จับ อยู่ตรงนี้แทนที่จะเขียนกำกับบนกระดาษ
                เพราะตัวหนังสือบนกระดาษจะบังงานที่เด็กกำลังวาดอยู่พอดี
              */}
              <ul className="mt-3 space-y-1 text-xs font-semibold text-slate-500">
                <li>⚪ เข็ม — ลากเพื่อย้ายไปปักที่ใหม่</li>
                <li>↔ ปุ่มกางบนขาดินสอ — ลากเพื่อกางหรือหุบ</li>
                <li>🟣 หัววงเวียน หรือ ✏️ ปลายดินสอ — ลากหมุนเพื่อวาด</li>
              </ul>
            </div>
          ) : null}

          <h2 className="geo-heading mt-4">🖍️ สีดินสอ</h2>
          <div className="flex flex-wrap gap-2">
            {PENCIL_COLORS.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setColor(item.value)}
                aria-label={`สี${item.label}`}
                title={item.label}
                style={{ backgroundColor: item.value }}
                className={`h-9 w-9 rounded-full border-4 transition ${
                  color === item.value ? 'border-white shadow-lg scale-110' : 'border-white/60'
                }`}
              />
            ))}
          </div>

          <h2 className="geo-heading mt-4">✒️ ความหนา</h2>
          <div className="flex gap-2">
            {PENCIL_WIDTHS.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setWidth(item.value)}
                className={`geo-chip flex-1 ${width === item.value ? 'geo-chip-strong' : ''}`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <h2 className="geo-heading mt-4">🔧 อุปกรณ์ช่วย</h2>
          <div className="grid gap-2">
            <ToggleRow
              label="📐 ครึ่งวงกลมวัดมุม"
              on={showProtractor}
              onToggle={() => setShowProtractor(!showProtractor)}
            />
            <ToggleRow
              label="📏 ไม้บรรทัด"
              on={showRuler}
              onToggle={() => setShowRuler(!showRuler)}
            />
            <ToggleRow label="🔲 เส้นตาราง" on={showGrid} onToggle={() => setShowGrid(!showGrid)} />
            <ToggleRow label="🧲 แม่เหล็กดูดจุด" on={snapOn} onToggle={() => setSnapOn(!snapOn)} />
            <ToggleRow
              label="🔢 โชว์ความยาว"
              on={showLengths}
              onToggle={() => setShowLengths(!showLengths)}
            />
            <ToggleRow label="📐 โชว์มุม" on={showAngles} onToggle={() => setShowAngles(!showAngles)} />
          </div>
          <p className="mt-2 text-xs font-semibold text-slate-500">
            ไม้บรรทัดกับครึ่งวงกลมวางทับกระดาษเหมือนของจริง วาดตรงที่มันทับไม่ได้
            ใช้เสร็จแล้วปิดสวิตช์เก็บเข้ากล่องก่อนนะ
          </p>
        </aside>

        {/* กระดาษวาด */}
        <main className="order-1 lg:order-2">
          <div className="geo-paper-frame">
            <svg
              ref={svgRef}
              viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
              className="geo-canvas w-full"
              role="application"
              aria-label="กระดาษวาดรูปเรขาคณิต"
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerLeave={() => setPointer(null)}
            >
              <defs>
                <pattern id="geo-grid-small" width={GRID_STEP} height={GRID_STEP} patternUnits="userSpaceOnUse">
                  <path
                    d={`M ${GRID_STEP} 0 L 0 0 0 ${GRID_STEP}`}
                    fill="none"
                    stroke="#e7e5e4"
                    strokeWidth={1}
                  />
                </pattern>
                <pattern id="geo-grid-big" width={PX_PER_CM} height={PX_PER_CM} patternUnits="userSpaceOnUse">
                  <path
                    d={`M ${PX_PER_CM} 0 L 0 0 0 ${PX_PER_CM}`}
                    fill="none"
                    stroke="#d6d3d1"
                    strokeWidth={1.6}
                  />
                </pattern>
              </defs>

              <rect x={0} y={0} width={VIEW_WIDTH} height={VIEW_HEIGHT} fill="#fffdf7" />
              {showGrid ? (
                <g pointerEvents="none">
                  <rect x={0} y={0} width={VIEW_WIDTH} height={VIEW_HEIGHT} fill="url(#geo-grid-small)" />
                  <rect x={0} y={0} width={VIEW_WIDTH} height={VIEW_HEIGHT} fill="url(#geo-grid-big)" />
                </g>
              ) : null}

              {board.shapes.map((shape) => (
                <ShapeView
                  key={shape.id}
                  shape={shape}
                  selected={shape.id === selectedId}
                  showLengths={showLengths}
                  showAngles={showAngles}
                />
              ))}

              {/* ของชั่วคราวระหว่างวาด ไม่ติดไปในไฟล์ภาพที่บันทึก */}
              <g className="geo-no-export">
                {draft.length > 0 ? (
                  <g pointerEvents="none">
                    <polyline
                      points={draft
                        .concat(pointer && tool === 'polygon' ? [pointer] : [])
                        .map((point) => `${point.x},${point.y}`)
                        .join(' ')}
                      fill="none"
                      stroke={color}
                      strokeWidth={width}
                      strokeDasharray="10 7"
                      strokeLinecap="round"
                    />
                    {draft.map((point, index) => (
                      <circle
                        key={index}
                        cx={point.x}
                        cy={point.y}
                        r={index === 0 ? 8 : 5}
                        fill={index === 0 ? '#ffffff' : color}
                        stroke={color}
                        strokeWidth={2.5}
                      />
                    ))}
                  </g>
                ) : null}

                {anglePicks.map((point, index) => (
                  <g key={`pick${index}`} pointerEvents="none">
                    <circle cx={point.x} cy={point.y} r={7} fill="#fb7185" stroke="#ffffff" strokeWidth={2} />
                    <text
                      x={point.x + 10}
                      y={point.y - 8}
                      fontSize={13}
                      fontWeight={700}
                      fill="#be185d"
                      fontFamily="Kanit, sans-serif"
                    >
                      {index === 1 ? 'จุดยอด' : 'แขน'}
                    </text>
                  </g>
                ))}

                {drag.kind === 'pen' ? (
                  <g pointerEvents="none">
                    <line
                      x1={drag.start.x}
                      y1={drag.start.y}
                      x2={drag.end.x}
                      y2={drag.end.y}
                      stroke={color}
                      strokeWidth={width}
                      strokeLinecap="round"
                      opacity={0.75}
                    />
                    <circle cx={drag.start.x} cy={drag.start.y} r={5} fill={color} />
                    <circle cx={drag.end.x} cy={drag.end.y} r={5} fill={color} />
                  </g>
                ) : null}

                {previewPolygon ? (
                  <polygon
                    points={previewPolygon.map((point) => `${point.x},${point.y}`).join(' ')}
                    fill={`${color}18`}
                    stroke={color}
                    strokeWidth={width}
                    strokeDasharray="10 6"
                    pointerEvents="none"
                  />
                ) : null}

                {tool === 'compass' ? (
                  <g>
                    {drag.kind === 'compass-draw' ? (
                      <ArcPreview
                        center={compass.center}
                        radius={compass.radius}
                        start={drag.start}
                        sweep={drag.sweep}
                        color={color}
                        width={width}
                      />
                    ) : null}
                    <CompassArt
                      center={compass.center}
                      radius={compass.radius}
                      angle={compass.angle}
                      sweep={drag.kind === 'compass-draw' ? drag.sweep : 0}
                      color={color}
                      onGrab={handleCompassGrab}
                    />
                  </g>
                ) : null}

                {showRuler ? (
                  <RulerOverlay
                    origin={ruler.origin}
                    rotation={ruler.rotation}
                    lengthCm={RULER_LENGTH_CM}
                    onGrab={handleRulerGrab}
                  />
                ) : null}

                {showProtractor ? (
                  <ProtractorOverlay
                    center={protractor.center}
                    rotation={protractor.rotation}
                    radius={PROTRACTOR_RADIUS}
                    highlight={protractorHighlight}
                    onGrab={handleProtractorGrab}
                  />
                ) : null}
              </g>
            </svg>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="geo-badge">{toolInfo.emoji} {toolInfo.label}</span>
            <p className="flex-1 text-sm font-semibold text-slate-600">{liveReadout}</p>
            {notice ? <span className="geo-notice">{notice}</span> : null}
          </div>
        </main>

        {/* แผงข้อมูลและภารกิจ */}
        <aside className="geo-panel order-3">
          <Mascot message={toolInfo.hint} cheering={cheering} />

          <h2 className="geo-heading mt-4">🔍 สิ่งที่วาดอยู่</h2>
          {report ? (
            <div className="rounded-2xl bg-white/80 p-3">
              <p className="text-base font-extrabold text-slate-700">
                {report.emoji} {report.title}
              </p>
              <ul className="mt-1 space-y-1 text-sm font-semibold text-slate-600">
                {report.lines.map((line) => (
                  <li key={line}>• {line}</li>
                ))}
              </ul>
              <button type="button" onClick={removeSelected} className="geo-chip mt-3 w-full">
                🗑️ ลบรูปนี้
              </button>
            </div>
          ) : (
            <div className="rounded-2xl bg-white/80 p-3 text-sm font-semibold text-slate-600">
              <ul className="space-y-1">
                {boardLines.map((line) => (
                  <li key={line}>• {line}</li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-slate-500">
                เลือกเครื่องมือ 🤏 แล้วจิ้มรูป เพื่อดูความยาวด้านและมุมภายในของรูปนั้น
              </p>
            </div>
          )}

          <h2 className="geo-heading mt-4">🎯 ภารกิจวันนี้</h2>
          <div className="rounded-2xl bg-white/80 p-3">
            <p className="text-base font-extrabold text-slate-700">
              {mission.emoji} {mission.title}
            </p>
            <ol className="mt-2 space-y-1 text-sm font-semibold text-slate-600">
              {mission.steps.map((step, index) => (
                <li key={step}>
                  <span className="geo-step">{index + 1}</span> {step}
                </li>
              ))}
            </ol>
            <p className="mt-2 rounded-xl bg-violet-100/70 p-2 text-xs font-bold text-violet-700">
              💡 {mission.learn}
            </p>
            <button
              type="button"
              onClick={() => {
                setMissionIndex(nextMissionIndex(missionIndex))
                playSfx('click')
              }}
              className="geo-chip mt-3 w-full"
            >
              🔄 ภารกิจถัดไป
            </button>
          </div>
        </aside>
      </div>
    </div>
  )
}

/** สวิตช์เปิดปิดอุปกรณ์ช่วย ทำเป็นแถวยาวให้นิ้วเด็กกดง่าย */
function ToggleRow({
  label,
  on,
  onToggle,
}: {
  label: string
  on: boolean
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      onClick={() => {
        playSfx('click')
        onToggle()
      }}
      aria-pressed={on}
      className={`geo-toggle ${on ? 'geo-toggle-on' : ''}`}
    >
      <span>{label}</span>
      <span className="geo-toggle-dot" aria-hidden="true" />
    </button>
  )
}

/** ส่วนโค้งที่กำลังกวาดอยู่ แยกออกมาเพื่อให้ส่วนวาดหลักอ่านง่าย */
function ArcPreview({
  center,
  radius,
  start,
  sweep,
  color,
  width,
}: {
  center: Point
  radius: number
  start: number
  sweep: number
  color: string
  width: number
}) {
  if (Math.abs(sweep) < 0.5) return null
  return (
    <path
      d={arcPath(center, radius, start, sweep)}
      fill="none"
      stroke={color}
      strokeWidth={width}
      strokeLinecap="round"
      opacity={0.8}
      pointerEvents="none"
    />
  )
}
