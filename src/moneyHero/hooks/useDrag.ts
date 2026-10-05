import { useCallback, useRef, useState, type PointerEvent } from 'react'

/**
 * ลากวางด้วย Pointer Events ใช้ได้ทั้งเมาส์และนิ้ว (HTML5 drag ใช้กับจอสัมผัสไม่ได้)
 *
 * ปลายทางคือ element ที่มี data-drop="..." ค่าของ data-drop ส่งกลับมาให้ onDrop
 * ถ้านิ้วขยับไม่ถึง 8px ถือว่าเป็นการ "แตะ" ให้ onClick ทำงานตามปกติ
 */
export interface Ghost<T> {
  x: number
  y: number
  payload: T
}

export function useDrag<T>(onDrop: (payload: T, target: string) => void) {
  const [ghost, setGhost] = useState<Ghost<T> | null>(null)
  const start = useRef<{ x: number; y: number; payload: T; moved: boolean } | null>(null)
  const suppressClick = useRef(false)

  const bind = useCallback(
    (payload: T) => ({
      onPointerDown: (e: PointerEvent<HTMLElement>) => {
        if (e.button !== 0 && e.pointerType === 'mouse') return
        start.current = { x: e.clientX, y: e.clientY, payload, moved: false }
        try {
          e.currentTarget.setPointerCapture(e.pointerId)
        } catch {
          // บางเบราว์เซอร์จับ pointer ไม่ได้ ไม่เป็นไร
        }
      },
      onPointerMove: (e: PointerEvent<HTMLElement>) => {
        const s = start.current
        if (!s) return
        if (!s.moved && Math.hypot(e.clientX - s.x, e.clientY - s.y) > 8) s.moved = true
        if (s.moved) setGhost({ x: e.clientX, y: e.clientY, payload: s.payload })
      },
      onPointerUp: (e: PointerEvent<HTMLElement>) => {
        const s = start.current
        start.current = null
        if (!s || !s.moved) return
        suppressClick.current = true
        setGhost(null)
        const el = document.elementFromPoint(e.clientX, e.clientY)
        const target = el?.closest('[data-drop]')?.getAttribute('data-drop')
        if (target) onDrop(s.payload, target)
      },
      onPointerCancel: () => {
        start.current = null
        setGhost(null)
      },
    }),
    [onDrop],
  )

  /** เรียกใน onClick: คืน true ถ้าคลิกนี้เกิดจากการลาก (ให้ข้ามไป) */
  const consumeClick = useCallback(() => {
    if (suppressClick.current) {
      suppressClick.current = false
      return true
    }
    return false
  }, [])

  return { ghost, bind, consumeClick }
}
