import type {
  GameEventHandler,
  GameEventMap,
  GameEventName,
} from '../types/events'

/**
 * Event bus ขนาดเล็กแบบ type-safe ไม่ต้องพึ่ง library ภายนอก
 * ใช้ให้ระบบต่าง ๆ สื่อสารกันโดยไม่ผูกติดกันโดยตรง เพื่อให้ Part ถัดไปต่อยอดได้ง่าย
 */
type HandlerSet = Set<GameEventHandler<GameEventName>>

const listeners = new Map<GameEventName, HandlerSet>()

/** ลงทะเบียนรับเหตุการณ์ คืนฟังก์ชันสำหรับยกเลิกการรับ */
export function on<K extends GameEventName>(
  event: K,
  handler: GameEventHandler<K>,
): () => void {
  const existing = listeners.get(event) ?? new Set()
  existing.add(handler as GameEventHandler<GameEventName>)
  listeners.set(event, existing)

  return () => off(event, handler)
}

export function off<K extends GameEventName>(
  event: K,
  handler: GameEventHandler<K>,
): void {
  const existing = listeners.get(event)
  if (!existing) return

  existing.delete(handler as GameEventHandler<GameEventName>)
  if (existing.size === 0) listeners.delete(event)
}

/** ส่งเหตุการณ์ออกไป ถ้า handler ตัวใดพัง จะไม่ทำให้ตัวอื่นหรือเกมพังตาม */
export function emit<K extends GameEventName>(
  event: K,
  payload: GameEventMap[K],
): void {
  const existing = listeners.get(event)
  if (!existing) return

  for (const handler of Array.from(existing)) {
    try {
      ;(handler as GameEventHandler<K>)(payload)
    } catch (error) {
      console.error(`ตัวรับเหตุการณ์ ${event} ทำงานผิดพลาด:`, error)
    }
  }
}

/** ใช้ในการทดสอบหรือตอนรีเซ็ตเกม */
export function clearAllListeners(): void {
  listeners.clear()
}
