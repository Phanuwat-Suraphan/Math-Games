/**
 * สั่งสร้างรูปด้วยตัวเลข
 *
 * ทำไมต้องมี ทั้งที่ทั้งห้องนี้ตั้งใจให้เด็กสร้างรูปเองด้วยวงเวียน
 *
 * เพราะโจทย์จำนวนมากในหนังสือไม่ได้ให้สร้างรูป แต่ให้ "ใช้" รูปที่มีขนาดตามกำหนด
 * เช่น หาพื้นที่สี่เหลี่ยมผืนผ้ากว้าง 3 ยาว 5 เซนติเมตร
 * ถ้าเด็กต้องนั่งลากให้ได้ 3.0 กับ 5.0 พอดีก่อนถึงจะเริ่มคิดโจทย์ได้
 * เวลาทั้งคาบจะหมดไปกับการลากเส้น ไม่ใช่กับการคิด
 *
 * และสำหรับครู นี่คือวิธีวางตัวอย่างบนจอหน้าห้องให้ตรงเป๊ะภายในสามวินาที
 *
 * ทุกฟังก์ชันในไฟล์นี้เป็นฟังก์ชันล้วน คืนรูปที่ยังไม่มีรหัสประจำตัว
 * หน้าจอเป็นคนใส่รหัสให้ทีหลัง ชุดทดสอบจึงเรียกได้ตรง ๆ
 */

import { PX_PER_CM, pointAt, regularPolygon } from './geo'
import type { Point } from './geo'
import type { Shape } from './shapes'

export interface RecipeField {
  key: string
  label: string
  min: number
  max: number
  step: number
  unit: string
  initial: number
}

export interface Recipe {
  id: string
  emoji: string
  label: string
  /** อธิบายว่ารูปนี้ใช้ตอนไหน ขึ้นใต้ปุ่มตอนเลือก */
  hint: string
  fields: RecipeField[]
}

const cm = (value: number) => value * PX_PER_CM

export const RECIPES: Recipe[] = [
  {
    id: 'line',
    emoji: '➖',
    label: 'เส้นตรง',
    hint: 'กำหนดความยาวและมุมที่ทำกับแนวนอนได้ตรงตามโจทย์',
    fields: [
      { key: 'length', label: 'ความยาว', min: 0.5, max: 20, step: 0.5, unit: 'ซม.', initial: 5 },
      { key: 'tilt', label: 'ทำมุมกับแนวนอน', min: 0, max: 355, step: 5, unit: '°', initial: 0 },
    ],
  },
  {
    id: 'square',
    emoji: '🟪',
    label: 'สี่เหลี่ยมจัตุรัส',
    hint: 'ด้านเท่ากันทั้งสี่ด้าน ใช้กับโจทย์พื้นที่และความยาวรอบรูป',
    fields: [{ key: 'side', label: 'ด้านละ', min: 0.5, max: 12, step: 0.5, unit: 'ซม.', initial: 4 }],
  },
  {
    id: 'rect',
    emoji: '▭',
    label: 'สี่เหลี่ยมผืนผ้า',
    hint: 'กว้างกับยาวไม่เท่ากัน ตรงกับโจทย์พื้นที่ในหนังสือเรียนมากที่สุด',
    fields: [
      { key: 'width', label: 'กว้าง', min: 0.5, max: 16, step: 0.5, unit: 'ซม.', initial: 3 },
      { key: 'height', label: 'ยาว', min: 0.5, max: 12, step: 0.5, unit: 'ซม.', initial: 5 },
    ],
  },
  {
    id: 'regular',
    emoji: '⬡',
    label: 'รูปด้านเท่า',
    hint: 'เลือกจำนวนด้านและความยาวด้าน มุมภายในจะถูกต้องตามสูตรเสมอ',
    fields: [
      { key: 'sides', label: 'จำนวนด้าน', min: 3, max: 12, step: 1, unit: 'ด้าน', initial: 5 },
      { key: 'side', label: 'ด้านละ', min: 0.5, max: 8, step: 0.5, unit: 'ซม.', initial: 3 },
    ],
  },
  {
    id: 'circle',
    emoji: '⭕',
    label: 'วงกลม',
    hint: 'ใส่รัศมีที่ต้องการ ไม่ต้องกางวงเวียนให้พอดีเอง',
    fields: [{ key: 'radius', label: 'รัศมี', min: 0.5, max: 8, step: 0.5, unit: 'ซม.', initial: 3 }],
  },
  {
    id: 'arc',
    emoji: '🌙',
    label: 'ส่วนโค้ง',
    hint: 'ส่วนโค้งที่กางเป็นมุมตามที่กำหนด ใช้สอนเรื่องมุมที่จุดศูนย์กลาง',
    fields: [
      { key: 'radius', label: 'รัศมี', min: 0.5, max: 8, step: 0.5, unit: 'ซม.', initial: 3 },
      { key: 'sweep', label: 'มุมที่จุดศูนย์กลาง', min: 10, max: 350, step: 5, unit: '°', initial: 90 },
    ],
  },
  {
    id: 'angle',
    emoji: '📐',
    label: 'มุมตามองศา',
    hint: 'ได้แขนสองข้างที่กางเป็นมุมตามที่สั่งพอดี เช่น 108 องศาของห้าเหลี่ยม',
    fields: [
      { key: 'angle', label: 'ขนาดมุม', min: 5, max: 175, step: 1, unit: '°', initial: 60 },
      { key: 'arm', label: 'ความยาวแขน', min: 1, max: 12, step: 0.5, unit: 'ซม.', initial: 5 },
    ],
  },
]

export function findRecipe(id: string): Recipe {
  return RECIPES.find((recipe) => recipe.id === id) ?? RECIPES[0]
}

/** ค่าตั้งต้นของแบบหนึ่ง ใช้ตอนเพิ่งเลือกแบบนั้น */
export function initialValues(recipe: Recipe): Record<string, number> {
  const values: Record<string, number> = {}
  for (const field of recipe.fields) values[field.key] = field.initial
  return values
}

/** อ่านค่าช่องหนึ่ง ถ้ายังไม่มีให้ใช้ค่าตั้งต้นของช่องนั้น */
export function valueOf(
  recipe: Recipe,
  values: Record<string, number>,
  key: string,
): number {
  const field = recipe.fields.find((item) => item.key === key)
  const raw = values[key]
  if (!field) return raw ?? 0
  if (!Number.isFinite(raw)) return field.initial
  return Math.min(field.max, Math.max(field.min, raw))
}

/**
 * สร้างรูปตามแบบที่สั่ง วางให้จุดกึ่งกลางรูปอยู่ตรงที่จิ้ม
 *
 * รูปที่คืนออกมายังไม่มีรหัสประจำตัว ใช้คำว่า draft ไปก่อน
 * หน้าจอจะใส่รหัสจริงให้ตอนวางลงกระดาษ
 */
export function buildShapes(
  recipe: Recipe,
  values: Record<string, number>,
  at: Point,
  style: { color: string; width: number },
): Shape[] {
  const base = { color: style.color, width: style.width }
  const get = (key: string) => valueOf(recipe, values, key)

  switch (recipe.id) {
    case 'line': {
      const length = cm(get('length'))
      const tilt = get('tilt')
      /* วางให้กึ่งกลางเส้นอยู่ตรงที่จิ้ม เส้นจะได้ไม่เลยขอบกระดาษไปข้างเดียว */
      const half = length / 2
      return [
        {
          ...base,
          kind: 'segment',
          id: 'draft-line',
          a: pointAt(at, half, tilt + 180),
          b: pointAt(at, half, tilt),
        },
      ]
    }

    case 'square': {
      const side = cm(get('side')) / 2
      return [
        {
          ...base,
          kind: 'polygon',
          id: 'draft-square',
          closed: true,
          fill: `${style.color}22`,
          points: [
            { x: at.x - side, y: at.y - side },
            { x: at.x + side, y: at.y - side },
            { x: at.x + side, y: at.y + side },
            { x: at.x - side, y: at.y + side },
          ],
        },
      ]
    }

    case 'rect': {
      const halfWidth = cm(get('width')) / 2
      const halfHeight = cm(get('height')) / 2
      return [
        {
          ...base,
          kind: 'polygon',
          id: 'draft-rect',
          closed: true,
          fill: `${style.color}22`,
          points: [
            { x: at.x - halfWidth, y: at.y - halfHeight },
            { x: at.x + halfWidth, y: at.y - halfHeight },
            { x: at.x + halfWidth, y: at.y + halfHeight },
            { x: at.x - halfWidth, y: at.y + halfHeight },
          ],
        },
      ]
    }

    case 'regular': {
      const sides = Math.round(get('sides'))
      const side = cm(get('side'))
      /*
       * รัศมีของรูปด้านเท่าที่มีด้านยาว s
       * มาจากการที่ด้านหนึ่งรองรับมุมที่จุดศูนย์กลาง 360/n องศา
       * ครึ่งหนึ่งของด้านจึงเท่ากับ R sin(180/n)
       */
      const radius = side / (2 * Math.sin(Math.PI / sides))
      return [
        {
          ...base,
          kind: 'polygon',
          id: 'draft-regular',
          closed: true,
          fill: `${style.color}22`,
          points: regularPolygon(at, radius, sides, 90),
        },
      ]
    }

    case 'circle':
      return [
        {
          ...base,
          kind: 'circle',
          id: 'draft-circle',
          center: { ...at },
          radius: cm(get('radius')),
          fill: 'none',
        },
      ]

    case 'arc': {
      const sweep = get('sweep')
      return [
        {
          ...base,
          kind: 'arc',
          id: 'draft-arc',
          center: { ...at },
          radius: cm(get('radius')),
          start: -sweep / 2,
          sweep,
        },
      ]
    }

    case 'angle': {
      const size = get('angle')
      const arm = cm(get('arm'))
      /* วางให้มุมกางขึ้นอย่างสมมาตรรอบแนวดิ่ง อ่านง่ายกว่าให้แขนข้างหนึ่งนอนราบ */
      const first = pointAt(at, arm, 90 - size / 2)
      const second = pointAt(at, arm, 90 + size / 2)
      return [
        { ...base, kind: 'segment', id: 'draft-arm-a', a: { ...at }, b: first },
        { ...base, kind: 'segment', id: 'draft-arm-b', a: { ...at }, b: second },
        { ...base, kind: 'angle', id: 'draft-angle', vertex: { ...at }, a: first, b: second },
      ]
    }

    default:
      return []
  }
}
