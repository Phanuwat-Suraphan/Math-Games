import { useCallback, useEffect, useState } from 'react'

/**
 * เปิด/ปิดโหมดเต็มจอของทั้งหน้า (ใช้ตอนครูเปิดเกมขึ้นจอใหญ่หรือโปรเจกเตอร์หน้าห้อง)
 *
 * ขยายทั้ง document ไม่ใช่แค่กระดาน เพราะหน้าต่างโจทย์ ลูกเต๋า และร้านค้าลอยอยู่นอกกระดาน
 * Safari บน iPad ยังใช้ชื่อ webkit อยู่ ส่วน iPhone ขยายเต็มจอไม่ได้เลย จึงซ่อนปุ่มเมื่อ supported เป็น false
 */

type WebkitDocument = Document & {
  webkitFullscreenEnabled?: boolean
  webkitFullscreenElement?: Element | null
  webkitExitFullscreen?: () => Promise<void> | void
}
type WebkitElement = HTMLElement & { webkitRequestFullscreen?: () => Promise<void> | void }

function currentElement(): Element | null {
  if (typeof document === 'undefined') return null
  const doc = document as WebkitDocument
  return doc.fullscreenElement ?? doc.webkitFullscreenElement ?? null
}

export function useFullscreen() {
  const doc = typeof document === 'undefined' ? null : (document as WebkitDocument)
  const supported = !!doc && (doc.fullscreenEnabled === true || doc.webkitFullscreenEnabled === true)
  const [active, setActive] = useState(() => currentElement() !== null)

  useEffect(() => {
    const update = () => setActive(currentElement() !== null)
    document.addEventListener('fullscreenchange', update)
    document.addEventListener('webkitfullscreenchange', update)
    return () => {
      document.removeEventListener('fullscreenchange', update)
      document.removeEventListener('webkitfullscreenchange', update)
    }
  }, [])

  const toggle = useCallback(async () => {
    const d = document as WebkitDocument
    try {
      if (currentElement()) {
        if (d.exitFullscreen) await d.exitFullscreen()
        else await d.webkitExitFullscreen?.()
      } else {
        const el = document.documentElement as WebkitElement
        if (el.requestFullscreen) await el.requestFullscreen()
        else await el.webkitRequestFullscreen?.()
      }
    } catch {
      // เบราว์เซอร์ปฏิเสธ (เช่น ไม่ได้มาจากการแตะของผู้ใช้) ก็แค่อยู่ขนาดเดิม
    }
  }, [])

  return { supported, active, toggle }
}
