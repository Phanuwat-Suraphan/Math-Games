/**
 * บันทึกงานที่วาดค้างไว้ในเครื่อง
 *
 * ปัญหาที่แก้
 *
 * เด็กวาดมาทั้งคาบ แล้วกดรีเฟรชหรือเผลอปิดแท็บ งานหายหมดทันที
 * ที่แย่กว่านั้นคือมันหายแบบเงียบ ๆ ไม่มีอะไรเตือนว่ากำลังจะหาย
 * และสิ่งที่หายคือสี่สิบนาทีของเด็กคนหนึ่ง ซึ่งเอาคืนไม่ได้
 *
 * เรื่องที่ต้องระวังที่สุดคือการอ่านกลับ ไม่ใช่การเขียน
 *
 * ข้อมูลใน localStorage เป็นของที่แก้ด้วยมือได้ ค้างมาจากเวอร์ชันเก่าได้
 * และเสียหายกลางทางได้ ถ้าเอามาใช้ตรง ๆ โดยไม่ตรวจ
 * หน้าจอจะพังตั้งแต่เปิด แล้วเด็กจะเข้าห้องเรขาคณิตไม่ได้อีกเลยจนกว่าจะล้างข้อมูล
 * ซึ่งเด็กทำเองไม่เป็น ทุกอย่างที่อ่านกลับมาจึงถูกตรวจทีละช่อง
 * ช่องไหนใช้ไม่ได้ก็ทิ้งเฉพาะช่องนั้น ไม่ใช่ทิ้งทั้งงาน
 */

import { PENCIL_COLORS, PENCIL_WIDTHS } from './tools'
import { PAPER_THEMES } from './cute'
import { FILL_COLORS, NO_FILL } from './paint'
import { clampLeash } from './labels'
import type { LabelOffsets } from './labels'
import type { Point } from './geo'
import type { Shape } from './shapes'

export const SAVE_KEY = 'math-adventure:geometry'
export const SAVE_VERSION = 1

export interface SavedPrefs {
  themeId: string
  color: string
  /** สีที่เลือกไว้ในถังสี */
  fillColor: string
  width: number
  showGrid: boolean
  snapOn: boolean
  showLengths: boolean
  showAngles: boolean
  showFaces: boolean
}

export interface SavedBoard {
  shapes: Shape[]
  labels: LabelOffsets
  prefs: SavedPrefs
  savedAt: number
}

export const DEFAULT_PREFS: SavedPrefs = {
  themeId: PAPER_THEMES[0].id,
  color: PENCIL_COLORS[0].value,
  fillColor: FILL_COLORS[0].value,
  width: PENCIL_WIDTHS[1].value,
  showGrid: true,
  snapOn: true,
  showLengths: true,
  showAngles: true,
  showFaces: true,
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const num = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null

function point(value: unknown): Point | null {
  if (!isRecord(value)) return null
  const x = num(value.x)
  const y = num(value.y)
  return x === null || y === null ? null : { x, y }
}

function points(value: unknown): Point[] | null {
  if (!Array.isArray(value)) return null
  const list: Point[] = []
  for (const item of value) {
    const p = point(item)
    if (!p) return null
    list.push(p)
  }
  return list
}

const text = (value: unknown, fallback: string): string =>
  typeof value === 'string' && value.length > 0 ? value : fallback

/**
 * ตรวจรูปหนึ่งรูปที่อ่านกลับมา
 *
 * คืน null เมื่อรูปนั้นใช้ไม่ได้ ผู้เรียกจะข้ามไปเฉพาะรูปนั้น
 * ดีกว่าทิ้งทั้งกระดาษเพราะมีรูปเดียวที่เสีย
 */
export function sanitizeShape(value: unknown): Shape | null {
  if (!isRecord(value)) return null
  const id = text(value.id, '')
  const color = text(value.color, '#0f172a')
  const width = num(value.width) ?? 3
  if (id === '') return null
  const base = { id, color, width }

  switch (value.kind) {
    case 'segment': {
      const a = point(value.a)
      const b = point(value.b)
      return a && b ? { ...base, kind: 'segment', a, b } : null
    }
    case 'circle': {
      const center = point(value.center)
      const radius = num(value.radius)
      return center && radius !== null && radius > 0
        ? { ...base, kind: 'circle', center, radius, fill: text(value.fill, 'none') }
        : null
    }
    case 'arc': {
      const center = point(value.center)
      const radius = num(value.radius)
      const start = num(value.start)
      const sweep = num(value.sweep)
      return center && radius !== null && radius > 0 && start !== null && sweep !== null
        ? { ...base, kind: 'arc', center, radius, start, sweep }
        : null
    }
    case 'polygon': {
      const list = points(value.points)
      if (!list || list.length < 2) return null
      return {
        ...base,
        kind: 'polygon',
        points: list,
        closed: value.closed === true,
        fill: text(value.fill, 'none'),
      }
    }
    case 'dot': {
      const at = point(value.at)
      return at ? { ...base, kind: 'dot', at, label: text(value.label, '?') } : null
    }
    case 'angle': {
      const vertex = point(value.vertex)
      const a = point(value.a)
      const b = point(value.b)
      return vertex && a && b ? { ...base, kind: 'angle', vertex, a, b } : null
    }
    case 'sticker': {
      const at = point(value.at)
      const size = num(value.size)
      return at && size !== null && size > 0
        ? { ...base, kind: 'sticker', at, emoji: text(value.emoji, '⭐'), size }
        : null
    }
    case 'photo': {
      const at = point(value.at)
      const imageWidth = num(value.imageWidth)
      const imageHeight = num(value.imageHeight)
      const src = text(value.src, '')
      const fade = num(value.fade) ?? 0
      /*
       * รับเฉพาะรูปที่ฝังมาเป็น data URL เท่านั้น
       * ค่าที่อ่านกลับมาจากเครื่องอาจถูกแก้มือได้ ถ้าปล่อยให้เป็นที่อยู่อะไรก็ได้
       * หน้าเว็บจะยิงไปโหลดรูปจากปลายทางนั้นให้เองทุกครั้งที่เปิดห้องเรขาคณิต
       */
      return at &&
        imageWidth !== null &&
        imageWidth > 0 &&
        imageHeight !== null &&
        imageHeight > 0 &&
        src.startsWith('data:image/')
        ? {
            ...base,
            kind: 'photo',
            at,
            imageWidth,
            imageHeight,
            src,
            fade: Math.min(0.8, Math.max(0, fade)),
          }
        : null
    }
    default:
      return null
  }
}

function sanitizeLabels(value: unknown): LabelOffsets {
  if (!isRecord(value)) return {}
  const labels: LabelOffsets = {}
  for (const [key, raw] of Object.entries(value)) {
    const offset = point(raw)
    /* ดึงกลับเข้าเชือกด้วย เผื่อไฟล์เก่าหรือค่าที่ถูกแก้มือมาไกลเกินกว่าที่อนุญาต */
    if (offset) labels[key] = clampLeash(offset)
  }
  return labels
}

function sanitizePrefs(value: unknown): SavedPrefs {
  if (!isRecord(value)) return { ...DEFAULT_PREFS }
  const bool = (raw: unknown, fallback: boolean) => (typeof raw === 'boolean' ? raw : fallback)
  const themeId = text(value.themeId, DEFAULT_PREFS.themeId)
  const color = text(value.color, DEFAULT_PREFS.color)
  const fillColor = text(value.fillColor, DEFAULT_PREFS.fillColor)
  const width = num(value.width)
  return {
    /* ธีมหรือสีที่ไม่รู้จัก ให้กลับไปใช้ค่าตั้งต้น ไม่ใช่ปล่อยให้กระดาษกลายเป็นสีแปลก ๆ */
    themeId: PAPER_THEMES.some((theme) => theme.id === themeId) ? themeId : DEFAULT_PREFS.themeId,
    color: PENCIL_COLORS.some((item) => item.value === color) ? color : DEFAULT_PREFS.color,
    /* ยอมรับ none ด้วย เพราะปุ่มไม่ระบายก็เป็นตัวเลือกหนึ่งในจานสี */
    fillColor:
      fillColor === NO_FILL || FILL_COLORS.some((item) => item.value === fillColor)
        ? fillColor
        : DEFAULT_PREFS.fillColor,
    width: width !== null && width > 0 && width <= 20 ? width : DEFAULT_PREFS.width,
    showGrid: bool(value.showGrid, DEFAULT_PREFS.showGrid),
    snapOn: bool(value.snapOn, DEFAULT_PREFS.snapOn),
    showLengths: bool(value.showLengths, DEFAULT_PREFS.showLengths),
    showAngles: bool(value.showAngles, DEFAULT_PREFS.showAngles),
    showFaces: bool(value.showFaces, DEFAULT_PREFS.showFaces),
  }
}

/** แปลงงานเป็นข้อความสำหรับเก็บ */
export function encodeBoard(shapes: Shape[], labels: LabelOffsets, prefs: SavedPrefs): string {
  return JSON.stringify({
    version: SAVE_VERSION,
    savedAt: Date.now(),
    shapes,
    labels,
    prefs,
  })
}

/**
 * อ่านงานกลับจากข้อความ
 *
 * คืน null เมื่อข้อความนั้นไม่ใช่งานของห้องนี้เลย เช่น อ่านไม่ออกหรือคนละเวอร์ชัน
 * ส่วนงานที่อ่านได้แต่มีบางรูปเสีย จะคืนเฉพาะรูปที่ยังดีอยู่
 */
export function decodeBoard(raw: string | null): SavedBoard | null {
  if (!raw) return null

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return null
  }

  if (!isRecord(parsed)) return null
  if (parsed.version !== SAVE_VERSION) return null
  if (!Array.isArray(parsed.shapes)) return null

  const shapes: Shape[] = []
  for (const item of parsed.shapes) {
    const shape = sanitizeShape(item)
    if (shape) shapes.push(shape)
  }

  return {
    shapes,
    labels: sanitizeLabels(parsed.labels),
    prefs: sanitizePrefs(parsed.prefs),
    savedAt: num(parsed.savedAt) ?? 0,
  }
}

/**
 * เขียนลงเครื่อง คืน false เมื่อเขียนไม่ได้
 *
 * เขียนไม่ได้เกิดขึ้นจริงในโหมดไม่ระบุตัวตนและตอนพื้นที่เต็ม
 * ต้องไม่ทำให้หน้าพัง แค่บอกเด็กว่าให้กดบันทึกรูปเองก่อนปิด
 */
export function writeBoard(raw: string): boolean {
  try {
    window.localStorage.setItem(SAVE_KEY, raw)
    return true
  } catch {
    return false
  }
}

export function readBoard(): SavedBoard | null {
  try {
    return decodeBoard(window.localStorage.getItem(SAVE_KEY))
  } catch {
    return null
  }
}

export function forgetBoard(): void {
  try {
    window.localStorage.removeItem(SAVE_KEY)
  } catch {
    /* ลบไม่ได้ก็ไม่เป็นไร ครั้งหน้าที่บันทึกสำเร็จจะทับของเก่าเอง */
  }
}
