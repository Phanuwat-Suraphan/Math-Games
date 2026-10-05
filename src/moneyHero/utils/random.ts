/**
 * ตัวสุ่มของตัวสร้างโจทย์
 *
 * ปกติใช้ Math.random แต่ชุดทดสอบตั้ง seed ได้
 * เพื่อให้ผลซ้ำได้เมื่อเจอโจทย์ที่ผิด
 */

let source: () => number = Math.random

/** ตัวสุ่มแบบ mulberry32 ใช้ตั้ง seed */
export function seedRandom(seed: number): void {
  let a = seed >>> 0
  source = () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function useMathRandom(): void {
  source = Math.random
}

export function rand(): number {
  return source()
}

/** จำนวนเต็มตั้งแต่ min ถึง max (รวมทั้งสองข้าง) */
export function int(min: number, max: number): number {
  return min + Math.floor(rand() * (max - min + 1))
}

export function pick<T>(items: readonly T[]): T {
  if (items.length === 0) throw new Error('pick จากรายการว่าง')
  return items[Math.floor(rand() * items.length)]
}

export function shuffle<T>(items: readonly T[]): T[] {
  const copy = items.slice()
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1))
    const tmp = copy[i]
    copy[i] = copy[j]
    copy[j] = tmp
  }
  return copy
}

/** เลือก n ตัวไม่ซ้ำ */
export function sample<T>(items: readonly T[], n: number): T[] {
  return shuffle(items).slice(0, n)
}

export function chance(p: number): boolean {
  return rand() < p
}

let counter = 0
export function uid(prefix = 'q'): string {
  counter += 1
  return `${prefix}-${Date.now().toString(36)}-${counter.toString(36)}-${Math.floor(rand() * 1e6).toString(36)}`
}
