/**
 * ใบงานสำหรับพิมพ์ลงกระดาษ
 *
 * ห้องเรียนไทยส่วนใหญ่มีคอมพิวเตอร์เครื่องเดียวคือของครู เด็กทั้งห้องไม่ได้มีแท็บเล็ตคนละเครื่อง
 * ของบนจอจึงใช้สอนหน้าชั้นได้ แต่ให้เด็กฝึกพร้อมกันทั้งห้องไม่ได้
 * ใบงานที่พิมพ์ออกกระดาษคือสะพานระหว่างสองอย่างนี้ ครูสุ่มโจทย์ชุดใหม่ได้ทุกคาบ
 * และไม่ต้องนั่งวาดมุมด้วยมือทีละข้อเหมือนที่ทำกันอยู่
 *
 * เฉลยถูกสร้างมาจากตัวเลขชุดเดียวกับโจทย์ จึงไม่มีทางหลุดจากกันเหมือนเฉลยที่พิมพ์แยก
 *
 * ไฟล์นี้เป็นตรรกะล้วน ไม่แตะ React
 */

import { pointAt } from './geo'
import type { Point } from './geo'
import type { PracticeLevel } from './practice'

/** โจทย์หนึ่งข้อมีสองแบบ วัดมุมที่ให้มา กับวาดมุมตามที่สั่ง */
export type ItemKind = 'measure' | 'draw'

export interface WorksheetItem {
  kind: ItemKind
  /** องศาที่เป็นคำตอบ หรือองศาที่สั่งให้วาด */
  answer: number
  /** ทิศของแขนล่าง เอียงเล็กน้อยเพื่อไม่ให้เดาจากรูปร่างได้ */
  start: number
}

export const SHEET_COUNTS = [6, 8, 12]

export const ITEM_KINDS: { id: ItemKind; label: string }[] = [
  { id: 'measure', label: 'วัดมุมที่ให้มา' },
  { id: 'draw', label: 'วาดมุมตามที่สั่ง' },
]

export interface SheetOptions {
  count: number
  kinds: ItemKind[]
  level: PracticeLevel
}

/** ความยาวแขนในกรอบของแต่ละข้อบนใบงาน */
export const ITEM_ARM = 82

/**
 * สุ่มโจทย์ทั้งใบ
 *
 * ห้ามมีองศาซ้ำกันในใบเดียว สองเหตุผล
 * หนึ่ง ใบงานที่มีมุมเท่ากันสองข้อดูเหมือนครูทำลวก ๆ
 * สอง เด็กที่เห็นว่าสองข้อเหมือนกันจะลอกคำตอบข้ามข้อแทนที่จะวัด
 */
export function makeSheet(options: SheetOptions, random: () => number): WorksheetItem[] {
  const { level } = options
  const kinds = options.kinds.length > 0 ? options.kinds : (['measure'] as ItemKind[])
  const steps = Math.floor((level.max - level.min) / level.step) + 1
  const wanted = Math.min(options.count, steps)

  const used = new Set<number>()
  const items: WorksheetItem[] = []
  /*
   * วนได้จำกัดจำนวนครั้ง ไม่ใช่วนจนกว่าจะครบ
   * ถ้าตัวสุ่มเสียหรือช่วงองศาแคบกว่าจำนวนข้อที่ขอ การวนแบบไม่จำกัดจะค้างทั้งหน้า
   */
  for (let guard = 0; guard < steps * 20 && items.length < wanted; guard += 1) {
    const pick = Math.min(steps - 1, Math.floor(random() * steps))
    const answer = level.min + pick * level.step
    if (used.has(answer)) continue
    used.add(answer)

    const kind = kinds[items.length % kinds.length]
    const tilt = Math.round((random() * 2 - 1) * 20)
    items.push({ kind, answer, start: tilt })
  }
  return items
}

/** ปลายแขนของข้อหนึ่งข้อ เทียบกับจุดยอดที่กำหนด */
export function itemArms(
  item: WorksheetItem,
  vertex: Point,
  arm = ITEM_ARM,
): { a: Point; b: Point } {
  return {
    a: pointAt(vertex, arm, item.start),
    b: pointAt(vertex, arm, item.start + item.answer),
  }
}

/** คำสั่งของข้อนั้นตามที่พิมพ์ลงใบงาน */
export function itemPrompt(item: WorksheetItem): string {
  return item.kind === 'measure'
    ? 'วัดมุมนี้ แล้วเขียนคำตอบ'
    : `วาดมุม ${item.answer}° โดยใช้เส้นที่ให้มาเป็นแขนล่าง`
}

/** บรรทัดเฉลยของข้อนั้น */
export function answerLine(item: WorksheetItem, index: number): string {
  return item.kind === 'measure'
    ? `ข้อ ${index + 1} = ${item.answer}°`
    : `ข้อ ${index + 1} วาดมุม ${item.answer}° (ตรวจด้วยครึ่งวงกลม คลาดได้ ±2°)`
}

/** หัวใบงาน บอกว่าในใบนี้มีอะไรบ้าง */
export function sheetSubtitle(items: WorksheetItem[]): string {
  const measure = items.filter((item) => item.kind === 'measure').length
  const draw = items.length - measure
  const parts: string[] = []
  if (measure > 0) parts.push(`วัดมุม ${measure} ข้อ`)
  if (draw > 0) parts.push(`วาดมุม ${draw} ข้อ`)
  return `${parts.join(' · ')} · ใช้ครึ่งวงกลมวัด`
}
