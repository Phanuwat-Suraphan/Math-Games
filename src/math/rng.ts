/**
 * ตัวสุ่มที่กำหนด seed ได้
 *
 * ทำไมไม่ใช้ Math.random ตรง ๆ: ถ้าเด็กเจอโจทย์ที่มีปัญหา ครูต้องสร้างชุดเดิม
 * ขึ้นมาดูซ้ำได้ และการทดสอบต้องได้ผลเดิมทุกครั้ง ไม่งั้นเทสต์จะไม่เสถียร
 *
 * ใช้ mulberry32 เพราะสั้น เร็ว และกระจายตัวดีพอสำหรับการสุ่มโจทย์
 */

export interface Rng {
  /** เลขทศนิยมในช่วง [0, 1) */
  next(): number
  /** จำนวนเต็มในช่วง [min, max] รวมปลายทั้งสองข้าง */
  int(min: number, max: number): number
  /** หยิบสมาชิกหนึ่งตัวจากรายการ */
  pick<T>(items: readonly T[]): T
  /** สลับลำดับรายการ คืนชุดใหม่เสมอ ไม่แก้ของเดิม */
  shuffle<T>(items: readonly T[]): T[]
  /** true ตามความน่าจะเป็นที่กำหนด */
  chance(probability: number): boolean
}

/** แปลงข้อความ seed เป็นตัวเลข 32 บิต */
export function hashSeed(seed: string): number {
  let hash = 2166136261
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

/**
 * สร้างตัวสุ่ม ถ้าไม่ระบุ seed จะสุ่มจากเวลาปัจจุบัน
 * ระบุ seed เดิมเมื่อไร ได้ลำดับตัวเลขเดิมทุกครั้ง
 */
export function createRng(seed?: string | number): Rng {
  let state =
    typeof seed === 'number'
      ? seed >>> 0
      : typeof seed === 'string'
        ? hashSeed(seed)
        : (Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0

  const next = (): number => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }

  const int = (min: number, max: number): number => {
    const low = Math.ceil(Math.min(min, max))
    const high = Math.floor(Math.max(min, max))
    if (high <= low) return low
    return low + Math.floor(next() * (high - low + 1))
  }

  return {
    next,
    int,
    pick<T>(items: readonly T[]): T {
      if (items.length === 0) {
        throw new Error('pick: รายการว่าง')
      }
      return items[int(0, items.length - 1)] as T
    },
    shuffle<T>(items: readonly T[]): T[] {
      const result = items.slice()
      for (let i = result.length - 1; i > 0; i -= 1) {
        const j = int(0, i)
        const a = result[i] as T
        const b = result[j] as T
        result[i] = b
        result[j] = a
      }
      return result
    },
    chance(probability: number): boolean {
      return next() < probability
    },
  }
}
