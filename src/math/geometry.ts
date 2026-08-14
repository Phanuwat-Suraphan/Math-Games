/**
 * เรขาคณิต — ทะเบียนสูตร
 *
 * เก็บสูตรไว้ที่เดียวเพื่อให้ตัวสร้างโจทย์ ตัวเฉลย และตัวสร้างตัวเลือกลวง
 * ใช้สูตรชุดเดียวกัน ถ้าแยกกันเมื่อไร เฉลยกับคำตอบจะไม่ตรงกัน
 */

import { multiplyDecimals, roundTo } from './decimals'

export type ShapeId = 'rectangle' | 'square' | 'triangle' | 'parallelogram' | 'circle'

export interface ShapeMeta {
  id: ShapeId
  name: string
  emoji: string
}

export const SHAPES: ShapeMeta[] = [
  { id: 'rectangle', name: 'สี่เหลี่ยมผืนผ้า', emoji: '▭' },
  { id: 'square', name: 'สี่เหลี่ยมจัตุรัส', emoji: '⬜' },
  { id: 'triangle', name: 'สามเหลี่ยม', emoji: '🔺' },
  { id: 'parallelogram', name: 'สี่เหลี่ยมด้านขนาน', emoji: '▰' },
  { id: 'circle', name: 'วงกลม', emoji: '⭕' },
]

export function getShapeMeta(id: ShapeId): ShapeMeta {
  return SHAPES.find((shape) => shape.id === id) ?? SHAPES[0]!
}

// ── พื้นที่ ──

export function rectangleArea(width: number, height: number): number {
  return roundTo(multiplyDecimals(width, height), 4)
}

export function squareArea(side: number): number {
  return roundTo(multiplyDecimals(side, side), 4)
}

/** พื้นที่สามเหลี่ยม = 1/2 × ฐาน × สูง */
export function triangleArea(base: number, height: number): number {
  return roundTo(multiplyDecimals(base, height) / 2, 4)
}

export function parallelogramArea(base: number, height: number): number {
  return roundTo(multiplyDecimals(base, height), 4)
}

/** ใช้ π = 3.14 ตามที่หลักสูตรประถมกำหนด */
export const PI_APPROX = 3.14

export function circleArea(radius: number): number {
  return roundTo(multiplyDecimals(multiplyDecimals(radius, radius), PI_APPROX), 4)
}

// ── เส้นรอบรูป ──

export function rectanglePerimeter(width: number, height: number): number {
  return roundTo(2 * (width + height), 4)
}

export function squarePerimeter(side: number): number {
  return roundTo(4 * side, 4)
}

export function trianglePerimeter(a: number, b: number, c: number): number {
  return roundTo(a + b + c, 4)
}

export function parallelogramPerimeter(base: number, side: number): number {
  return roundTo(2 * (base + side), 4)
}

export function circleCircumference(radius: number): number {
  return roundTo(multiplyDecimals(2 * radius, PI_APPROX), 4)
}

/**
 * ด้านสามด้านประกอบเป็นสามเหลี่ยมได้จริงไหม
 * ต้องเช็คก่อนสร้างโจทย์ ไม่งั้นจะได้โจทย์ที่รูปนั้นไม่มีอยู่จริง
 */
export function isValidTriangle(a: number, b: number, c: number): boolean {
  if (a <= 0 || b <= 0 || c <= 0) return false
  return a + b > c && a + c > b && b + c > a
}
