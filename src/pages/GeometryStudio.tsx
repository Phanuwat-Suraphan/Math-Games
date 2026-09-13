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

import { useCallback, useEffect, useReducer, useRef, useState } from 'react'
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
import { PointerCursor } from '../geometry/PointerCursor'
import { ShapesLayer } from '../geometry/ShapesLayer'
import {
  EMPTY_GATE,
  beginPointer,
  endPointer,
  isEraserTip,
  isPalmDuringPen,
  isTap,
  noteInput,
  pointerKind,
  shouldIgnorePointer,
} from '../geometry/input'
import type { PointerGate } from '../geometry/input'
import {
  DEFAULT_VIEW,
  clampScale,
  visibleSize,
  panBy,
  screenToPaper,
  viewBoxOf,
  viewPlacing,
  zoomAt,
  zoomLabel,
} from '../geometry/view'
import type { View } from '../geometry/view'
import { EMPTY_BOARD, boardReducer, canRedo, canUndo } from '../geometry/board'
import { MISSIONS, nextMissionIndex } from '../geometry/missions'
import { LABEL_LEASH, clampLeash, offsetOf } from '../geometry/labels'
import {
  RECIPES,
  buildShapes,
  findRecipe,
  initialValues,
  valueOf,
} from '../geometry/recipes'
import { ShapeView } from '../geometry/ShapeView'
import {
  PROTRACTOR_DEFAULT,
  RULER_DEFAULT_CM,
  RULER_MAX_CM,
  RULER_MIN_CM,
  PROTRACTOR_MAX,
  PROTRACTOR_MIN,
  clampProtractorRadius,
  clampRulerLength,
  protractorRadiusFromPointer,
  rulerLengthFromPointer,
} from '../geometry/instruments'
import type { LabelOffsets } from '../geometry/labels'
import {
  PAPER_THEMES,
  STICKERS,
  encouragementFor,
  findTheme,
  sparkleOffsets,
} from '../geometry/cute'
import { PENCIL_COLORS, PENCIL_WIDTHS, TOOLS, findTool } from '../geometry/tools'
import type { ToolId } from '../geometry/tools'
import {
  HIT_TOLERANCE,
  applyField,
  describeBoard,
  describeShape,
  editableFields,
  findShapeAt,
  rotateShape,
  scaleShape,
  shapeCenter,
  shapeReach,
  nearestSnapPoint,
  translateShape,
} from '../geometry/shapes'
import type { Shape, ShapeField } from '../geometry/shapes'
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
  /** ลากกระดาษไปมาตอนซูมเข้า เก็บจุดเริ่มเป็นพิกัดบนจอ เพราะพิกัดกระดาษขยับตามไปด้วย */
  | { kind: 'pan'; startClient: Point; startView: View }
  /** ลากป้ายตัวเลขหลบไม่ให้บังเส้น เก็บจุดเริ่มไว้เพื่อให้ป้ายไม่กระโดดตอนจับ */
  | { kind: 'label'; key: string; startOffset: Point; startPoint: Point }
  /** ลากปุ่มย่อขยายรูปที่เลือกอยู่ */
  | { kind: 'scale-shape'; id: string; origin: Point; startReach: number; start: Shape; marked: boolean }
  /** ลากปุ่มหมุนรูปที่เลือกอยู่ */
  | { kind: 'rotate-shape'; id: string; origin: Point; startAngle: number; start: Shape; marked: boolean }
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
  const [showFaces, setShowFaces] = useState(true)
  const [showRuler, setShowRuler] = useState(false)
  const [showProtractor, setShowProtractor] = useState(false)

  const [ruler, setRuler] = useState({
    origin: { x: 110, y: 560 },
    rotation: 0,
    lengthCm: RULER_DEFAULT_CM,
  })
  const [protractor, setProtractor] = useState({
    center: { x: 520, y: 430 },
    rotation: 0,
    radius: PROTRACTOR_DEFAULT,
  })

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
  /** ตำแหน่งที่ปลายดินสอจะลงจริง หลังผ่านแม่เหล็กแล้ว ใช้วาดวงแหวนเคอร์เซอร์ */
  const [cursor, setCursor] = useState<{ point: Point; onTarget: boolean } | null>(null)
  /** เคยเห็นปากกาในคาบนี้แล้ว ใช้บอกผู้ใช้ว่าโหมดกันฝ่ามือทำงานอยู่ */
  const [penMode, setPenMode] = useState(false)
  const [view, setView] = useState<View>(DEFAULT_VIEW)
  const [cheering, setCheering] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [missionIndex, setMissionIndex] = useState(0)
  const [themeId, setThemeId] = useState(PAPER_THEMES[0].id)
  const [sticker, setSticker] = useState(STICKERS[0].emoji)
  /** กล่องถามจำนวนด้านกับความยาวด้าน ตอนจิ้มด้วยเครื่องมือรูปด้านเท่า */
  const [polygonAsk, setPolygonAsk] = useState<Point | null>(null)
  const [askSideCm, setAskSideCm] = useState(3)
  const [recipeId, setRecipeId] = useState(RECIPES[0].id)
  const [recipeValues, setRecipeValues] = useState<Record<string, number>>(() =>
    initialValues(RECIPES[0]),
  )
  /** ประกายที่กระเด็นอยู่ตอนนี้ หายไปเองใน 1 วินาที */
  const [sparkles, setSparkles] = useState<{ id: number; at: Point }[]>([])
  /** คำเชียร์ที่น้องวงเวียนกำลังพูดอยู่ หมดเวลาแล้วกลับไปพูดเรื่องเครื่องมือตามเดิม */
  const [praise, setPraise] = useState<string | null>(null)
  /**
   * ป้ายตัวเลขถูกลากหลบไปไว้ตรงไหนแล้วบ้าง
   *
   * เก็บแยกจากประวัติการย้อนกลับโดยตั้งใจ การขยับป้ายไม่ใช่การแก้รูป
   * ถ้าเอาไปปนกัน เด็กที่กดย้อนกลับเพื่อลบเส้นจะได้ป้ายกระโดดกลับที่เดิมแถมมาด้วย
   */
  const [labelOffsets, setLabelOffsets] = useState<LabelOffsets>({})

  const svgRef = useRef<SVGSVGElement | null>(null)
  const idRef = useRef(1)
  /*
   * ตัวนับชื่อจุด นับขึ้นอย่างเดียว ไม่ลดลงตอนลบจุดทิ้ง
   * ถ้านับจากจำนวนจุดที่มีอยู่ พอลบจุด B แล้วปักใหม่จะได้ชื่อ C ซ้ำกับจุดที่มีอยู่
   * แล้วเด็กจะเขียนคำตอบว่า "มุม ABC" โดยที่มีจุด C สองจุดบนกระดาษ
   */
  const labelRef = useRef(0)
  const cheerTimer = useRef<number | null>(null)
  /*
   * ด่านกรองสัญญาณ เก็บใน ref ไม่ใช่ state เพราะมันเปลี่ยนทุกเหตุการณ์ของปลายปากกา
   * ถ้าเก็บเป็น state หน้าจอจะถูกวาดใหม่เพิ่มอีกรอบโดยที่ไม่มีอะไรบนจอเปลี่ยนเลย
   */
  const gateRef = useRef<PointerGate>(EMPTY_GATE)
  const sparkleId = useRef(0)
  const sparkleTimers = useRef<number[]>([])
  const praiseTimer = useRef<number | null>(null)
  const labelOffsetsRef = useRef<LabelOffsets>({})
  labelOffsetsRef.current = labelOffsets
  /* สำเนาของมุมมองล่าสุด ไว้ให้ตัวรับล้อเมาส์ซึ่งผูกไว้ครั้งเดียวอ่านค่าปัจจุบันได้ */
  const viewRef = useRef<View>(DEFAULT_VIEW)
  /** นิ้วที่แตะอยู่ตอนนี้ทั้งหมด ใช้ดูว่ามีสองนิ้วหนีบเพื่อซูมหรือเปล่า */
  const touchesRef = useRef(new Map<number, { x: number; y: number }>())
  /** ท่าหนีบสองนิ้วที่กำลังทำอยู่ */
  const pinchRef = useRef<{
    startDistance: number
    startView: View
    startPaper: Point
  } | null>(null)

  viewRef.current = view
  const noticeTimer = useRef<number | null>(null)

  const toolInfo = findTool(tool)
  const theme = findTheme(themeId)
  const recipe = findRecipe(recipeId)
  const mission = MISSIONS[missionIndex]
  const selected = board.shapes.find((shape) => shape.id === selectedId) ?? null

  /* เก็บกวาดตัวจับเวลาตอนออกจากหน้า ไม่งั้น React จะเตือนว่าอัปเดตของที่ถูกถอดไปแล้ว */
  useEffect(() => {
    return () => {
      if (cheerTimer.current !== null) window.clearTimeout(cheerTimer.current)
      if (noticeTimer.current !== null) window.clearTimeout(noticeTimer.current)
      for (const timer of sparkleTimers.current) window.clearTimeout(timer)
      if (praiseTimer.current !== null) window.clearTimeout(praiseTimer.current)
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
    placeShapes([shape])
  }

  /**
   * วางรูปลงกระดาษ ครั้งละหนึ่งชิ้นหรือหลายชิ้นก็ได้
   *
   * แบบที่สั่งสร้างบางแบบได้หลายชิ้นพร้อมกัน เช่น มุมหนึ่งมุมได้แขนสองข้างกับป้ายองศา
   * ทั้งชุดต้องฉลองครั้งเดียวและโปรยประกายจุดเดียว ไม่ใช่สามรอบซ้อนกัน
   */
  function placeShapes(drafts: Shape[]) {
    if (drafts.length === 0) return
    const ready = drafts.map((draft) => ({ ...draft, id: makeId() }))
    for (const shape of ready) dispatch({ type: 'add', shape })
    playSfx('pickup')
    celebrate()
    burstSparkles(shapeCenter(ready[0]))

    /*
     * คำชมออกจากปากน้องวงเวียน ไม่ใช่ป้ายแจ้งเตือน
     * เพราะป้ายแจ้งเตือนคือที่ที่เด็กเรียนรู้ว่าจะมองข้ามได้ ส่วนตัวการ์ตูนยังถูกอ่านอยู่
     * และพูดเฉพาะตอนถึงหมุดที่ตั้งไว้ คำชมที่มาทุกครั้งจะกลายเป็นเสียงรบกวนใน 3 นาที
     */
    const praise = encouragementFor(board.shapes.length + ready.length)
    if (praise) {
      setPraise(praise)
      if (praiseTimer.current !== null) window.clearTimeout(praiseTimer.current)
      praiseTimer.current = window.setTimeout(() => setPraise(null), 5000)
    }
  }

  /** โปรยประกายตรงใจกลางรูปที่เพิ่งวาดเสร็จ */
  function burstSparkles(at: Point) {
    sparkleId.current += 1
    const id = sparkleId.current
    setSparkles((current) => [...current, { id, at }])
    const timer = window.setTimeout(() => {
      setSparkles((current) => current.filter((item) => item.id !== id))
      sparkleTimers.current = sparkleTimers.current.filter((value) => value !== timer)
    }, 1000)
    sparkleTimers.current.push(timer)
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
    return screenToPaper(
      viewRef.current,
      (event.clientX - rect.left) / rect.width,
      (event.clientY - rect.top) / rect.height,
      VIEW_WIDTH,
      VIEW_HEIGHT,
    )
  }

  /*
   * ระยะดูดและระยะจิ้มโดน ต้องหารด้วยกำลังขยายเสมอ
   *
   * ค่าพวกนี้เป็นพิกัดกระดาษ แต่สิ่งที่ต้องคงที่คือระยะบนจอที่นิ้วเอื้อมถึง
   * ถ้าไม่หาร ตอนย่อจอครึ่งหนึ่งจะจิ้มโดนยากขึ้นเท่าตัว
   * และตอนขยายสี่เท่าจะดูดจุดที่อยู่ห่างออกไปตั้งสี่เซนติเมตรบนกระดาษจริง
   */
  const anchorRange = ANCHOR_RADIUS / view.scale
  const hitRange = HIT_TOLERANCE / view.scale

  /** จุดกระดาษที่อยู่กลางจอตอนนี้ ใช้เป็นจุดตรึงตอนซูมด้วยปุ่ม */
  function centerOfView(): Point {
    return screenToPaper(viewRef.current, 0.5, 0.5, VIEW_WIDTH, VIEW_HEIGHT)
  }

  /** ซูมโดยตรึงจุดที่เล็งอยู่ไว้กับที่ */
  function zoomBy(factor: number) {
    setView(zoomAt(viewRef.current, factor, centerOfView(), VIEW_WIDTH, VIEW_HEIGHT))
    playSfx('click')
  }

  function resetView() {
    setView(DEFAULT_VIEW)
    playSfx('click')
  }

  const rulerStart = ruler.origin
  const rulerEnd = pointAt(ruler.origin, ruler.lengthCm * PX_PER_CM, ruler.rotation)

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
  function snapWithInfo(p: Point): { point: Point; onTarget: boolean } {
    const target = nearestSnapPoint(board.shapes, p, anchorRange)
    if (target) return { point: target, onTarget: true }
    for (const point of draft) {
      if (distance(point, p) <= anchorRange) return { point, onTarget: true }
    }
    return { point: snapOn ? snapToGrid(p, GRID_STEP) : p, onTarget: false }
  }

  function snapPoint(p: Point): Point {
    return snapWithInfo(p).point
  }

  /** ปลายเส้นระหว่างลาก ดูดเข้าจุดเดิม จุดตัด มุมที่ลงตัว หรือขอบไม้บรรทัด */
  function penEnd(start: Point, raw: Point, guided: boolean): Point {
    const target = nearestSnapPoint(board.shapes, raw, anchorRange)
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

  /**
   * จับป้ายตัวเลขเพื่อลากหลบ
   *
   * ทำเป็น useCallback ที่ไม่ขึ้นกับอะไรเลย เพราะมันถูกส่งลงไปให้ชั้นรูปที่จำผลไว้
   * ถ้าสร้างใหม่ทุกครั้งที่วาดจอ การจำผลจะใช้ไม่ได้ และรูปทั้งกระดาษ
   * จะถูกคิดใหม่ทุกครั้งที่ปลายปากกาขยับหนึ่งพิกเซล
   */
  const handleLabelGrab = useCallback(
    (key: string, event: ReactPointerEvent<SVGElement>) => {
      event.stopPropagation()
      const svg = svgRef.current
      if (!svg) return
      svg.setPointerCapture(event.pointerId)
      const rect = svg.getBoundingClientRect()
      if (rect.width === 0 || rect.height === 0) return
      const start = screenToPaper(
        viewRef.current,
        (event.clientX - rect.left) / rect.width,
        (event.clientY - rect.top) / rect.height,
        VIEW_WIDTH,
        VIEW_HEIGHT,
      )
      setDrag({
        kind: 'label',
        key,
        startOffset: offsetOf(labelOffsetsRef.current, key),
        startPoint: start,
      })
    },
    [],
  )

  /**
   * แทนที่รูปที่เลือกด้วยรูปที่แก้แล้ว
   *
   * จดประวัติหนึ่งขั้นต่อการแก้หนึ่งครั้ง เด็กจึงกดย้อนกลับทีละขั้นได้
   * เหมือนกับการลบเส้นทีละเส้น ไม่ใช่ย้อนกลับทีเดียวหายทั้งชุด
   */
  function editSelected(next: Shape) {
    dispatch({ type: 'mark' })
    dispatch({
      type: 'live',
      shapes: board.shapes.map((shape) => (shape.id === next.id ? next : shape)),
    })
  }

  function changeField(field: ShapeField, raw: number) {
    if (!selected) return
    const value = Math.min(field.max, Math.max(field.min, Math.round(raw * 100) / 100))
    editSelected(applyField(selected, field.key, value))
  }

  function spinSelected(deg: number) {
    if (!selected) return
    editSelected(rotateShape(selected, deg, shapeCenter(selected)))
    playSfx('click')
  }

  /** จับปุ่มย่อขยายหรือปุ่มหมุนของรูปที่เลือกอยู่ */
  function handleShapeHandleGrab(
    part: 'scale' | 'rotate',
    event: ReactPointerEvent<SVGElement>,
  ) {
    event.stopPropagation()
    if (!selected) return
    const kind = pointerKind(event.pointerType)
    const now = Date.now()
    if (shouldIgnorePointer(gateRef.current, event.pointerId, kind, now)) return
    gateRef.current = beginPointer(gateRef.current, event.pointerId, kind, now)

    const raw = toPaper(event)
    svgRef.current?.setPointerCapture(event.pointerId)
    const origin = shapeCenter(selected)

    if (part === 'scale') {
      setDrag({
        kind: 'scale-shape',
        id: selected.id,
        origin,
        startReach: Math.max(12, distance(origin, raw)),
        start: selected,
        marked: false,
      })
      return
    }

    setDrag({
      kind: 'rotate-shape',
      id: selected.id,
      origin,
      startAngle: angleOf(origin, raw),
      start: selected,
      marked: false,
    })
  }

  /** ระยะและจุดกึ่งกลางของสองนิ้วที่แตะอยู่ หน่วยเป็นพิกเซลบนจอ */
  function touchSpan(): { distance: number; middle: Point } | null {
    const points = [...touchesRef.current.values()]
    if (points.length < 2) return null
    const [a, b] = points
    return {
      distance: Math.hypot(b.x - a.x, b.y - a.y),
      middle: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
    }
  }

  /**
   * เริ่มท่าหนีบสองนิ้ว
   *
   * เส้นที่กำลังลากค้างอยู่ด้วยนิ้วแรกถูกทิ้งไป เพราะนิ้วที่สองที่แตะเข้ามา
   * แปลว่าเด็กเปลี่ยนใจไปซูมแล้ว ไม่ได้ตั้งใจจะได้เส้นนั้น
   */
  function startPinch() {
    const span = touchSpan()
    const svg = svgRef.current
    if (!span || !svg) return
    const rect = svg.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) return
    pinchRef.current = {
      startDistance: span.distance,
      startView: viewRef.current,
      startPaper: screenToPaper(
        viewRef.current,
        (span.middle.x - rect.left) / rect.width,
        (span.middle.y - rect.top) / rect.height,
        VIEW_WIDTH,
        VIEW_HEIGHT,
      ),
    }
    setDrag({ kind: 'none' })
    setCursor(null)
  }

  /** ระหว่างหนีบ ระยะระหว่างนิ้วคือกำลังขยาย จุดกึ่งกลางคือจุดที่ตรึงไว้ */
  function updatePinch() {
    const pinch = pinchRef.current
    const span = touchSpan()
    const svg = svgRef.current
    if (!pinch || !span || !svg || pinch.startDistance === 0) return
    const rect = svg.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) return
    setView(
      viewPlacing(
        clampScale(pinch.startView.scale * (span.distance / pinch.startDistance)),
        pinch.startPaper,
        (span.middle.x - rect.left) / rect.width,
        (span.middle.y - rect.top) / rect.height,
        VIEW_WIDTH,
        VIEW_HEIGHT,
      ),
    )
  }

  function handlePointerDown(event: ReactPointerEvent<SVGSVGElement>) {
    const kind = pointerKind(event.pointerType)
    const now = Date.now()

    /* จดนิ้วที่แตะไว้ก่อนเข้าด่านกรอง เพราะนิ้วที่สองคือสัญญาณว่าจะหนีบซูม ไม่ใช่สัญญาณที่ต้องทิ้ง */
    if (kind === 'touch' && !isPalmDuringPen(gateRef.current, kind, now)) {
      touchesRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
      if (touchesRef.current.size >= 2) {
        startPinch()
        return
      }
    }

    /* ฝ่ามือที่วางบนจอระหว่างเขียนด้วยปากกา ต้องไม่กลายเป็นเส้นที่ไม่มีใครตั้งใจวาด */
    if (shouldIgnorePointer(gateRef.current, event.pointerId, kind, now)) return
    gateRef.current = beginPointer(gateRef.current, event.pointerId, kind, now)
    if (kind === 'pen' && !penMode) setPenMode(true)

    const raw = toPaper(event)
    svgRef.current?.setPointerCapture(event.pointerId)
    setPointer(raw)
    setCursor(cursorAt(raw))

    /* ปุ่มกลางของเมาส์ใช้เลื่อนกระดาษได้ทุกเครื่องมือ เหมือนโปรแกรมวาดรูปทั่วไป */
    if (tool === 'pan' || event.button === 1) {
      setDrag({
        kind: 'pan',
        startClient: { x: event.clientX, y: event.clientY },
        startView: viewRef.current,
      })
      return
    }

    /* พลิกปากกาใช้ด้านยางลบ ลบได้เลยโดยไม่ต้องเปลี่ยนเครื่องมือ */
    if (isEraserTip(kind, event.buttons)) {
      const found = findShapeAt(board.shapes, raw, hitRange)
      if (found) {
        dispatch({ type: 'remove', id: found.id })
        if (selectedId === found.id) setSelectedId(null)
        playSfx('click')
      }
      return
    }

    switch (tool) {
      case 'select': {
        const found = findShapeAt(board.shapes, raw, hitRange)
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
        if (draft.length >= 3 && distance(point, draft[0]) <= anchorRange + 6 / view.scale) {
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

      case 'build': {
        placeShapes(buildShapes(recipe, recipeValues, snapPoint(raw), { color, width }))
        return
      }

      case 'sticker': {
        addShape({
          kind: 'sticker',
          id: makeId(),
          color,
          width,
          at: snapPoint(raw),
          emoji: sticker,
          size: 46,
        })
        return
      }

      case 'eraser': {
        const found = findShapeAt(board.shapes, raw, hitRange)
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

  /** ตำแหน่งและสถานะของวงแหวนเคอร์เซอร์ ณ จุดที่ปลายปากกาอยู่ */
  function cursorAt(raw: Point): { point: Point; onTarget: boolean } {
    /* สองเครื่องมือนี้ไม่ได้วาดอะไร จึงไม่ควรหลอกว่าปลายดินสอจะไปลงที่จุดอื่น */
    if (tool === 'select' || tool === 'eraser') return { point: raw, onTarget: false }
    return snapWithInfo(raw)
  }

  function handlePointerMove(event: ReactPointerEvent<SVGSVGElement>) {
    const kind = pointerKind(event.pointerType)
    const now = Date.now()

    if (kind === 'touch' && touchesRef.current.has(event.pointerId)) {
      touchesRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
    }
    if (pinchRef.current) {
      updatePinch()
      return
    }

    if (shouldIgnorePointer(gateRef.current, event.pointerId, kind, now)) return
    gateRef.current = noteInput(gateRef.current, kind, now)
    if (kind === 'pen' && !penMode) setPenMode(true)

    const raw = toPaper(event)
    setPointer(raw)
    setCursor(cursorAt(raw))

    switch (drag.kind) {
      case 'pen':
        setDrag({ ...drag, end: penEnd(drag.start, raw, drag.guided) })
        return

      case 'regular':
        setDrag({ kind: 'regular', center: drag.center, edge: raw })
        return

      case 'scale-shape': {
        /* ย่อขยายรอบใจกลางรูปเอง รูปจึงไม่วิ่งหนีออกจากที่เดิมตอนลาก */
        const factor = Math.min(6, Math.max(0.15, distance(drag.origin, raw) / drag.startReach))
        if (!drag.marked) dispatch({ type: 'mark' })
        dispatch({
          type: 'live',
          shapes: board.shapes.map((shape) =>
            shape.id === drag.id ? scaleShape(drag.start, factor, drag.origin) : shape,
          ),
        })
        setDrag({ ...drag, marked: true })
        return
      }

      case 'rotate-shape': {
        const turned = angleOf(drag.origin, raw) - drag.startAngle
        if (!drag.marked) dispatch({ type: 'mark' })
        dispatch({
          type: 'live',
          shapes: board.shapes.map((shape) =>
            shape.id === drag.id ? rotateShape(drag.start, turned, drag.origin) : shape,
          ),
        })
        setDrag({ ...drag, marked: true })
        return
      }

      case 'label': {
        setLabelOffsets((current) => ({
          ...current,
          [drag.key]: clampLeash({
            x: drag.startOffset.x + (raw.x - drag.startPoint.x),
            y: drag.startOffset.y + (raw.y - drag.startPoint.y),
          }),
        }))
        return
      }

      case 'pan': {
        const svg = svgRef.current
        if (!svg) return
        const rect = svg.getBoundingClientRect()
        if (rect.width === 0) return
        /* หนึ่งพิกเซลบนจอ เท่ากับกี่หน่วยบนกระดาษ ขึ้นกับกำลังขยายตอนเริ่มลาก */
        const perPixel = VIEW_WIDTH / drag.startView.scale / rect.width
        setView(
          panBy(
            drag.startView,
            -(event.clientX - drag.startClient.x) * perPixel,
            -(event.clientY - drag.startClient.y) * perPixel,
            VIEW_WIDTH,
            VIEW_HEIGHT,
          ),
        )
        return
      }

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
        if (drag.part === 'resize') {
          setProtractor({ ...protractor, radius: protractorRadiusFromPointer(protractor.center, raw) })
        } else if (drag.part === 'rotate') {
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
        if (drag.part === 'resize') {
          setRuler({ ...ruler, lengthCm: rulerLengthFromPointer(ruler.origin, ruler.rotation, raw) })
        } else if (drag.part === 'rotate') {
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
    const kind = pointerKind(event.pointerType)

    /* ต้องเอานิ้วออกจากรายการก่อนด่านกรอง ไม่งั้นนิ้วที่สองจะค้างอยู่ตลอดกาล */
    if (kind === 'touch') {
      touchesRef.current.delete(event.pointerId)
      if (touchesRef.current.size < 2) pinchRef.current = null
    }

    if (shouldIgnorePointer(gateRef.current, event.pointerId, kind, Date.now())) return
    gateRef.current = endPointer(gateRef.current, event.pointerId)

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
        /*
         * จิ้มเฉย ๆ ไม่ใช่การลาก แปลว่าเด็กยังไม่ได้บอกขนาด
         * ถามให้ชัดดีกว่าเดาขนาดให้ เพราะโจทย์มักกำหนดความยาวด้านมาแล้ว
         */
        if (isTap(distance(drag.center, drag.edge), view.scale)) {
          setPolygonAsk(drag.center)
          playSfx('click')
          break
        }
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
  /**
   * ระบบยึดสัญญาณไปเอง เช่น นิ้วที่สองแตะจอ หรือปากกาหลุดออกนอกจอ
   * ต้องคืนสิทธิ์ให้ตัวถัดไป ไม่งั้นจะวาดอะไรไม่ได้อีกเลยจนกว่าจะรีเฟรช
   */
  function handlePointerCancel(event: ReactPointerEvent<SVGSVGElement>) {
    touchesRef.current.delete(event.pointerId)
    if (touchesRef.current.size < 2) pinchRef.current = null
    gateRef.current = endPointer(gateRef.current, event.pointerId)
    setDrag({ kind: 'none' })
    setCursor(null)
  }

  function handleCompassGrab(part: CompassPart, event: ReactPointerEvent<SVGElement>) {
    event.stopPropagation()
    const kind = pointerKind(event.pointerType)
    const now = Date.now()
    if (shouldIgnorePointer(gateRef.current, event.pointerId, kind, now)) return
    gateRef.current = beginPointer(gateRef.current, event.pointerId, kind, now)

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
    const kind = pointerKind(event.pointerType)
    const now = Date.now()
    if (shouldIgnorePointer(gateRef.current, event.pointerId, kind, now)) return
    gateRef.current = beginPointer(gateRef.current, event.pointerId, kind, now)

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
        b: pointAt(protractor.center, protractor.radius, protractor.rotation + deg),
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
    const kind = pointerKind(event.pointerType)
    const now = Date.now()
    if (shouldIgnorePointer(gateRef.current, event.pointerId, kind, now)) return
    gateRef.current = beginPointer(gateRef.current, event.pointerId, kind, now)

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
    setPolygonAsk(null)
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
    setLabelOffsets({})
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
    /*
     * ภาพที่บันทึกต้องเป็นกระดาษทั้งแผ่นเสมอ ไม่ใช่เฉพาะส่วนที่ซูมค้างไว้ตอนกดปุ่ม
     * ไม่งั้นเด็กที่ซูมดูมุมหนึ่งอยู่ จะได้ไฟล์ที่มีแต่มุมนั้นโดยไม่รู้ตัว
     */
    clone.setAttribute('viewBox', `0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`)
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
      context.fillStyle = theme.paper
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

  /**
   * ล้อเมาส์คือซูม
   *
   * ต้องผูกเองด้วย passive: false เพราะตัวรับของ React เป็นแบบ passive
   * ซึ่งสั่ง preventDefault ไม่ได้ แล้วหน้าเว็บทั้งหน้าจะเลื่อนตามล้อไปด้วย
   * กลายเป็นซูมกระดาษพร้อมกับหน้าเลื่อนหนีไปข้างล่างในเวลาเดียวกัน
   */
  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return

    const onWheel = (event: WheelEvent) => {
      event.preventDefault()
      const rect = svg.getBoundingClientRect()
      if (rect.width === 0 || rect.height === 0) return
      const focus = screenToPaper(
        viewRef.current,
        (event.clientX - rect.left) / rect.width,
        (event.clientY - rect.top) / rect.height,
        VIEW_WIDTH,
        VIEW_HEIGHT,
      )
      setView(zoomAt(viewRef.current, event.deltaY < 0 ? 1.15 : 1 / 1.15, focus, VIEW_WIDTH, VIEW_HEIGHT))
    }

    svg.addEventListener('wheel', onWheel, { passive: false })
    return () => svg.removeEventListener('wheel', onWheel)
  }, [])

  /* ปุ่มลัดสำหรับครูที่ใช้คีย์บอร์ด เด็กใช้ปุ่มบนจอได้เหมือนกัน */
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setDraft([])
        setAnglePicks([])
        setPolygonAsk(null)
        /* ยกเลิกการหมุนที่ค้างอยู่ ส่วนโค้งที่กวาดไว้จะไม่ถูกวางลงกระดาษ */
        setDrag({ kind: 'none' })
        return
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
        event.preventDefault()
        dispatch({ type: event.shiftKey ? 'redo' : 'undo' })
        return
      }
      if (event.ctrlKey || event.metaKey) {
        if (event.key === '+' || event.key === '=') {
          event.preventDefault()
          setView(zoomAt(viewRef.current, 1.25, centerOfView(), VIEW_WIDTH, VIEW_HEIGHT))
        } else if (event.key === '-') {
          event.preventDefault()
          setView(zoomAt(viewRef.current, 1 / 1.25, centerOfView(), VIEW_WIDTH, VIEW_HEIGHT))
        } else if (event.key === '0') {
          event.preventDefault()
          setView(DEFAULT_VIEW)
        }
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
    if (away < protractor.radius - 70 || away > protractor.radius + 34) return null
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
  const fields = selected ? editableFields(selected) : []
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

          {tool === 'build' ? (
            <div className="mt-3 rounded-2xl bg-white/70 p-3">
              <p className="text-sm font-bold text-slate-600">เลือกแบบที่จะสร้าง</p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {RECIPES.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setRecipeId(item.id)
                      setRecipeValues(initialValues(item))
                      playSfx('click')
                    }}
                    className={`geo-recipe ${recipeId === item.id ? 'geo-recipe-on' : ''}`}
                  >
                    <span aria-hidden="true">{item.emoji}</span>
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>

              <p className="mt-2 text-[11px] font-semibold text-slate-500">{recipe.hint}</p>

              <div className="mt-3 space-y-3">
                {recipe.fields.map((field) => {
                  const value = valueOf(recipe, recipeValues, field.key)
                  const set = (next: number) =>
                    setRecipeValues({
                      ...recipeValues,
                      [field.key]: Math.min(field.max, Math.max(field.min, next)),
                    })
                  return (
                    <div key={field.key}>
                      <div className="geo-field">
                        <span className="flex-1">{field.label}</span>
                        <button type="button" onClick={() => set(value - field.step)} aria-label={`ลด${field.label}`}>
                          −
                        </button>
                        <input
                          type="number"
                          value={value}
                          min={field.min}
                          max={field.max}
                          step={field.step}
                          onChange={(event) => set(Number(event.target.value))}
                          aria-label={field.label}
                        />
                        <span className="w-10 text-left">{field.unit}</span>
                        <button type="button" onClick={() => set(value + field.step)} aria-label={`เพิ่ม${field.label}`}>
                          +
                        </button>
                      </div>
                      {/* แถบเลื่อน สำหรับคนที่ถนัดเลื่อนมากกว่าพิมพ์ */}
                      <input
                        type="range"
                        min={field.min}
                        max={field.max}
                        step={field.step}
                        value={value}
                        onChange={(event) => set(Number(event.target.value))}
                        aria-label={`เลื่อนตั้ง${field.label}`}
                        className="mt-1 w-full accent-emerald-500"
                      />
                    </div>
                  )
                })}
              </div>

              <button
                type="button"
                onClick={() =>
                  placeShapes(
                    buildShapes(recipe, recipeValues, screenToPaper(viewRef.current, 0.5, 0.5, VIEW_WIDTH, VIEW_HEIGHT), {
                      color,
                      width,
                    }),
                  )
                }
                className="geo-chip geo-chip-strong mt-3 w-full"
              >
                ⬇️ วางกลางจอ
              </button>
              <p className="mt-1 text-[11px] font-semibold text-slate-500">
                หรือจิ้มบนกระดาษตรงที่อยากวางก็ได้ เงาจาง ๆ ที่ปลายเคอร์เซอร์คือรูปที่กำลังจะได้
              </p>
            </div>
          ) : null}

          {tool === 'sticker' ? (
            <div className="mt-3 rounded-2xl bg-white/70 p-3">
              <p className="text-sm font-bold text-slate-600">เลือกสติกเกอร์</p>
              <div className="mt-2 grid grid-cols-4 gap-2">
                {STICKERS.map((item) => (
                  <button
                    key={item.emoji}
                    type="button"
                    onClick={() => setSticker(item.emoji)}
                    aria-label={item.label}
                    title={item.label}
                    className={`geo-sticker ${sticker === item.emoji ? 'geo-sticker-on' : ''}`}
                  >
                    {item.emoji}
                  </button>
                ))}
              </div>
            </div>
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

          {tool === 'select' ? (
            <div className="mt-3 rounded-2xl bg-white/70 p-3">
              <p className="text-xs font-semibold text-slate-500">
                ตัวเลขบังเส้นอยู่ใช่ไหม ลากตัวเลขหลบได้เลย ไกลสุด {formatCm(LABEL_LEASH)}{' '}
                จากที่เดิม และมีเส้นประบอกว่าตัวเลขนั้นเป็นของด้านไหน
              </p>
              <button
                type="button"
                onClick={() => {
                  setLabelOffsets({})
                  playSfx('click')
                }}
                disabled={Object.keys(labelOffsets).length === 0}
                className="geo-chip mt-2 w-full"
              >
                ↩️ จัดตัวเลขกลับที่เดิม
              </button>
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

          <h2 className="geo-heading mt-4">🎀 กระดาษ</h2>
          <div className="grid grid-cols-2 gap-2">
            {PAPER_THEMES.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setThemeId(item.id)
                  playSfx('click')
                }}
                style={{ backgroundColor: item.paper }}
                className={`geo-theme ${themeId === item.id ? 'geo-theme-on' : ''}`}
              >
                <span aria-hidden="true">{item.emoji}</span>
                <span>{item.label}</span>
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
            <ToggleRow
              label="👀 ใส่หน้าให้รูป"
              on={showFaces}
              onToggle={() => setShowFaces(!showFaces)}
            />
          </div>
          {showProtractor ? (
            <div className="mt-2 rounded-2xl bg-white/70 p-3">
              <label
                htmlFor="protractor-size"
                className="flex items-center justify-between text-xs font-bold text-slate-600"
              >
                📐 ขนาดครึ่งวงกลม
                <span className="geo-badge">{formatCm(protractor.radius)}</span>
              </label>
              <input
                id="protractor-size"
                type="range"
                min={PROTRACTOR_MIN}
                max={PROTRACTOR_MAX}
                step={10}
                value={Math.round(protractor.radius)}
                onChange={(event) =>
                  setProtractor({
                    ...protractor,
                    radius: clampProtractorRadius(Number(event.target.value)),
                  })
                }
                className="mt-1 w-full accent-pink-500"
              />
              <p className="text-[11px] font-semibold text-slate-500">
                อันใหญ่อ่านง่ายบนจอหน้าห้อง อันเล็กไม่บังงาน · มุมไม่ขึ้นกับขนาด วัดได้ตรงกันทุกอัน
              </p>
            </div>
          ) : null}

          {showRuler ? (
            <div className="mt-2 rounded-2xl bg-white/70 p-3">
              <label
                htmlFor="ruler-size"
                className="flex items-center justify-between text-xs font-bold text-slate-600"
              >
                📏 ความยาวไม้บรรทัด
                <span className="geo-badge">{ruler.lengthCm} ซม.</span>
              </label>
              <input
                id="ruler-size"
                type="range"
                min={RULER_MIN_CM}
                max={RULER_MAX_CM}
                step={0.5}
                value={ruler.lengthCm}
                onChange={(event) =>
                  setRuler({ ...ruler, lengthCm: clampRulerLength(Number(event.target.value)) })
                }
                className="mt-1 w-full accent-amber-500"
              />
              <p className="text-[11px] font-semibold text-slate-500">
                ยืดแล้วได้ขีดเพิ่ม ไม่ใช่ขีดห่างขึ้น หนึ่งเซนติเมตรบนไม้บรรทัดเท่ากับหนึ่งเซนติเมตรบนกระดาษเสมอ
              </p>
            </div>
          ) : null}

          <p className="mt-2 text-xs font-semibold text-slate-500">
            ไม้บรรทัดกับครึ่งวงกลมวางทับกระดาษเหมือนของจริง วาดตรงที่มันทับไม่ได้
            ใช้เสร็จแล้วปิดสวิตช์เก็บเข้ากล่องก่อนนะ
          </p>
        </aside>

        {/* กระดาษวาด */}
        <main className="order-1 lg:order-2">
          <div className="geo-paper-frame relative">
            {/*
              onContextMenu ถูกปิดไว้เพราะการกดค้างด้วยปากกาหรือนิ้วบนวินโดวส์
              จะเด้งเมนูคลิกขวาขึ้นมากลางการวาด แล้วเส้นที่กำลังลากอยู่จะขาดตรงนั้นพอดี
            */}
            <svg
              ref={svgRef}
              viewBox={viewBoxOf(view, VIEW_WIDTH, VIEW_HEIGHT)}
              className="geo-canvas w-full"
              role="application"
              aria-label="กระดาษวาดรูปเรขาคณิต"
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerCancel}
              onPointerLeave={() => {
                setPointer(null)
                setCursor(null)
              }}
              onContextMenu={(event) => event.preventDefault()}
            >
              <defs>
                <pattern id="geo-grid-small" width={GRID_STEP} height={GRID_STEP} patternUnits="userSpaceOnUse">
                  {theme.dotted ? (
                    <circle cx={GRID_STEP / 2} cy={GRID_STEP / 2} r={1.3} fill={theme.minor} />
                  ) : (
                    <path
                      d={`M ${GRID_STEP} 0 L 0 0 0 ${GRID_STEP}`}
                      fill="none"
                      stroke={theme.minor}
                      strokeWidth={1}
                    />
                  )}
                </pattern>
                <pattern id="geo-grid-big" width={PX_PER_CM} height={PX_PER_CM} patternUnits="userSpaceOnUse">
                  {theme.dotted ? (
                    <circle cx={PX_PER_CM / 2} cy={PX_PER_CM / 2} r={2.6} fill={theme.major} />
                  ) : (
                    <path
                      d={`M ${PX_PER_CM} 0 L 0 0 0 ${PX_PER_CM}`}
                      fill="none"
                      stroke={theme.major}
                      strokeWidth={1.6}
                    />
                  )}
                </pattern>
              </defs>

              <rect x={0} y={0} width={VIEW_WIDTH} height={VIEW_HEIGHT} fill={theme.paper} />
              {showGrid ? (
                <g pointerEvents="none">
                  <rect x={0} y={0} width={VIEW_WIDTH} height={VIEW_HEIGHT} fill="url(#geo-grid-small)" />
                  <rect x={0} y={0} width={VIEW_WIDTH} height={VIEW_HEIGHT} fill="url(#geo-grid-big)" />
                </g>
              ) : null}

              <ShapesLayer
                shapes={board.shapes}
                selectedId={selectedId}
                showLengths={showLengths}
                showAngles={showAngles}
                showFaces={showFaces}
                offsets={labelOffsets}
                /*
                 * ลากป้ายได้เฉพาะตอนใช้เครื่องมือเลือก
                 * ตอนกำลังวาด ป้ายต้องให้คลิกทะลุผ่านไปได้ ไม่งั้นเด็กที่ลากเส้น
                 * ผ่านป้ายพอดี จะกลายเป็นลากป้ายแทนที่จะได้เส้น
                 */
                onLabelGrab={tool === 'select' ? handleLabelGrab : undefined}
              />

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
                    lengthCm={ruler.lengthCm}
                    onGrab={handleRulerGrab}
                  />
                ) : null}

                {showProtractor ? (
                  <ProtractorOverlay
                    center={protractor.center}
                    rotation={protractor.rotation}
                    radius={protractor.radius}
                    highlight={protractorHighlight}
                    onGrab={handleProtractorGrab}
                  />
                ) : null}

                {/*
                  ปุ่มย่อขยายกับปุ่มหมุนของรูปที่เลือกอยู่
                  ขนาดปุ่มหารด้วยกำลังขยาย ปุ่มจึงเท่าเดิมบนจอทุกระดับซูม
                */}
                {selected && tool === 'select'
                  ? (() => {
                      const origin = shapeCenter(selected)
                      const reach = shapeReach(selected) + 30 / view.scale
                      const knob = 15 / view.scale
                      const grip = 24 / view.scale
                      const scaleAt = pointAt(origin, reach, 45)
                      const spinAt = pointAt(origin, reach, 135)
                      return (
                        <g>
                          <g
                            transform={`translate(${scaleAt.x} ${scaleAt.y})`}
                            onPointerDown={(event) => handleShapeHandleGrab('scale', event)}
                            className="cursor-grab"
                          >
                            <circle r={grip} fill="transparent" />
                            <circle r={knob} fill="#ede9fe" stroke="#7c3aed" strokeWidth={3 / view.scale} />
                            <text
                              textAnchor="middle"
                              y={5 / view.scale}
                              fontSize={15 / view.scale}
                              fill="#5b21b6"
                            >
                              ⤢
                            </text>
                          </g>
                          <g
                            transform={`translate(${spinAt.x} ${spinAt.y})`}
                            onPointerDown={(event) => handleShapeHandleGrab('rotate', event)}
                            className="cursor-grab"
                          >
                            <circle r={grip} fill="transparent" />
                            <circle r={knob} fill="#fce7f3" stroke="#db2777" strokeWidth={3 / view.scale} />
                            <text
                              textAnchor="middle"
                              y={5 / view.scale}
                              fontSize={15 / view.scale}
                              fill="#9d174d"
                            >
                              ↻
                            </text>
                          </g>
                        </g>
                      )
                    })()
                  : null}

                {/* เงาจาง ๆ ของรูปที่สั่งไว้ ตามปลายเคอร์เซอร์ไปจนกว่าจะจิ้มวาง */}
                {tool === 'build' && cursor ? (
                  <g opacity={0.5} pointerEvents="none">
                    {buildShapes(recipe, recipeValues, cursor.point, { color, width }).map((draft) => (
                      <ShapeView
                        key={draft.id}
                        shape={draft}
                        selected={false}
                        showLengths={showLengths}
                        showAngles={showAngles}
                        showFaces={false}
                        offsets={{}}
                      />
                    ))}
                  </g>
                ) : null}

                {/* ประกายตอนวาดเสร็จ หายไปเองในหนึ่งวินาที ไม่ติดไปในไฟล์ภาพ */}
                {sparkles.map((sparkle) => (
                  <g
                    key={sparkle.id}
                    transform={`translate(${sparkle.at.x} ${sparkle.at.y})`}
                    pointerEvents="none"
                  >
                    {sparkleOffsets().map((offset, index) => (
                      <text
                        key={index}
                        className="geo-spark"
                        x={offset.x / view.scale}
                        y={offset.y / view.scale}
                        fontSize={22 / view.scale}
                        textAnchor="middle"
                        dominantBaseline="central"
                        style={{ animationDelay: `${offset.delay}ms` }}
                      >
                        ✨
                      </text>
                    ))}
                  </g>
                ))}

                {/* วงแหวนเคอร์เซอร์อยู่บนสุดเสมอ ไม่งั้นไม้บรรทัดจะบังจุดที่กำลังเล็งอยู่ */}
                {cursor ? (
                  <PointerCursor
                    at={cursor.point}
                    color={color}
                    onTarget={cursor.onTarget}
                    drawing={drag.kind !== 'none'}
                    scale={view.scale}
                  />
                ) : null}
              </g>
            </svg>

            {polygonAsk ? (
              <>
                {/* ฉากหลังจาง ๆ จิ้มตรงไหนก็ปิดกล่องถาม */}
                <div
                  className="absolute inset-0 z-10 rounded-[26px] bg-slate-900/10"
                  onPointerDown={() => setPolygonAsk(null)}
                />
                <div
                  className="geo-ask"
                  style={(() => {
                    const size = visibleSize(view, VIEW_WIDTH, VIEW_HEIGHT)
                    const x = ((polygonAsk.x - view.x) / size.width) * 100
                    const y = ((polygonAsk.y - view.y) / size.height) * 100
                    return {
                      left: `${Math.min(88, Math.max(12, x))}%`,
                      top: `${Math.min(82, Math.max(18, y))}%`,
                    }
                  })()}
                >
                  <p className="text-sm font-extrabold text-violet-700">
                    🔷 จะวางรูปกี่เหลี่ยม ด้านละเท่าไร
                  </p>

                  <div className="mt-2 flex flex-wrap gap-1">
                    {[3, 4, 5, 6, 8, 12].map((count) => (
                      <button
                        key={count}
                        type="button"
                        onClick={() => setSides(count)}
                        className={`geo-ask-chip ${sides === count ? 'geo-ask-chip-on' : ''}`}
                      >
                        {count}
                      </button>
                    ))}
                  </div>

                  <div className="geo-field mt-2">
                    <span className="flex-1">จำนวนด้าน</span>
                    <button type="button" onClick={() => setSides(Math.max(3, sides - 1))} aria-label="ลดจำนวนด้าน">
                      −
                    </button>
                    <input
                      type="number"
                      min={3}
                      max={12}
                      step={1}
                      value={sides}
                      onChange={(event) =>
                        setSides(Math.min(12, Math.max(3, Math.round(Number(event.target.value)))))
                      }
                      aria-label="จำนวนด้าน"
                    />
                    <span className="w-8 text-left">ด้าน</span>
                    <button type="button" onClick={() => setSides(Math.min(12, sides + 1))} aria-label="เพิ่มจำนวนด้าน">
                      +
                    </button>
                  </div>

                  <div className="geo-field mt-2">
                    <span className="flex-1">ด้านละ</span>
                    <button
                      type="button"
                      onClick={() => setAskSideCm(Math.max(0.5, askSideCm - 0.5))}
                      aria-label="ลดความยาวด้าน"
                    >
                      −
                    </button>
                    <input
                      type="number"
                      min={0.5}
                      max={8}
                      step={0.5}
                      value={askSideCm}
                      onChange={(event) =>
                        setAskSideCm(Math.min(8, Math.max(0.5, Number(event.target.value))))
                      }
                      aria-label="ความยาวด้าน"
                    />
                    <span className="w-8 text-left">ซม.</span>
                    <button
                      type="button"
                      onClick={() => setAskSideCm(Math.min(8, askSideCm + 0.5))}
                      aria-label="เพิ่มความยาวด้าน"
                    >
                      +
                    </button>
                  </div>

                  <input
                    type="range"
                    min={0.5}
                    max={8}
                    step={0.5}
                    value={askSideCm}
                    onChange={(event) => setAskSideCm(Number(event.target.value))}
                    aria-label="เลื่อนตั้งความยาวด้าน"
                    className="mt-1 w-full accent-violet-500"
                  />

                  {/* บอกผลลัพธ์ล่วงหน้า เด็กจะเห็นความสัมพันธ์ระหว่างจำนวนด้านกับมุมทันที */}
                  <p className="mt-1 rounded-xl bg-violet-100/70 p-2 text-[11px] font-bold text-violet-700">
                    {polygonName(sides)}ด้านเท่า · มุมภายในมุมละ{' '}
                    {Math.round(((sides - 2) * 180) / sides)}° · รวมทั้งรูป {(sides - 2) * 180}° ·
                    รอบรูป {(sides * askSideCm).toFixed(1)} ซม.
                  </p>

                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        placeShapes(
                          buildShapes(
                            findRecipe('regular'),
                            { sides, side: askSideCm },
                            polygonAsk,
                            { color, width },
                          ),
                        )
                        setPolygonAsk(null)
                      }}
                      className="geo-chip geo-chip-strong flex-1"
                    >
                      ✅ วางเลย
                    </button>
                    <button type="button" onClick={() => setPolygonAsk(null)} className="geo-chip">
                      ยกเลิก
                    </button>
                  </div>
                </div>
              </>
            ) : null}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <div className="geo-zoom">
              <button
                type="button"
                onClick={() => zoomBy(1 / 1.25)}
                aria-label="ย่อกระดาษ"
                title="ย่อ (Ctrl และ -)"
              >
                −
              </button>
              <span aria-live="polite">{zoomLabel(view)}</span>
              <button
                type="button"
                onClick={() => zoomBy(1.25)}
                aria-label="ขยายกระดาษ"
                title="ขยาย (Ctrl และ +)"
              >
                +
              </button>
              <button type="button" onClick={resetView} title="กลับมาเห็นทั้งแผ่น (Ctrl และ 0)">
                พอดีจอ
              </button>
            </div>
            <span className="geo-badge">{toolInfo.emoji} {toolInfo.label}</span>
            {penMode ? (
              <span className="geo-badge" title="ฝ่ามือที่วางบนจอระหว่างเขียนจะไม่กลายเป็นเส้น">
                🖊️ โหมดปากกา · กันฝ่ามือ
              </span>
            ) : null}
            <p className="flex-1 text-sm font-semibold text-slate-600">{liveReadout}</p>
            {notice ? <span className="geo-notice">{notice}</span> : null}
          </div>
        </main>

        {/* แผงข้อมูลและภารกิจ */}
        <aside className="geo-panel order-3">
          <Mascot message={praise ?? toolInfo.hint} cheering={cheering} />

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
              {fields.length > 0 ? (
                <div className="mt-3 space-y-2">
                  {fields.map((field) => (
                    <div key={field.key} className="geo-field">
                      <span className="flex-1">{field.label}</span>
                      <button
                        type="button"
                        onClick={() => changeField(field, field.value - field.step)}
                        aria-label={`ลด${field.label}`}
                      >
                        −
                      </button>
                      <input
                        type="number"
                        value={field.value}
                        min={field.min}
                        max={field.max}
                        step={field.step}
                        onChange={(event) => changeField(field, Number(event.target.value))}
                        aria-label={field.label}
                      />
                      <span className="w-8 text-left">{field.unit}</span>
                      <button
                        type="button"
                        onClick={() => changeField(field, field.value + field.step)}
                        aria-label={`เพิ่ม${field.label}`}
                      >
                        +
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}

              <div className="mt-2 flex gap-2">
                <button type="button" onClick={() => spinSelected(15)} className="geo-chip flex-1">
                  ↺ 15°
                </button>
                <button type="button" onClick={() => spinSelected(-15)} className="geo-chip flex-1">
                  ↻ 15°
                </button>
              </div>

              <p className="mt-2 text-xs font-semibold text-slate-500">
                บนกระดาษมีปุ่ม ⤢ ไว้ลากย่อขยาย และปุ่ม ↻ ไว้ลากหมุน
                ทั้งสองอย่างทำรอบใจกลางรูป รูปจึงอยู่ที่เดิม
              </p>

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
