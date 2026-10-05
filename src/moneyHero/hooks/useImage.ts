import { useEffect, useState } from 'react'

/**
 * ตรวจว่ารูปที่ครูหรือผู้พัฒนาใส่ไว้ใน public/money-hero/ มีอยู่จริงหรือไม่
 *
 * ถ้ามี ใช้รูปจริง ถ้าไม่มี ใช้ภาพวาด SVG / อีโมจิแทน
 * ผลการตรวจเก็บไว้ในหน่วยความจำ รูปเดียวกันจึงโหลดตรวจแค่ครั้งเดียว
 * ไม่มีการขอไฟล์ซ้ำทุกครั้งที่เหรียญปรากฏบนจอ
 */

type Status = 'pending' | 'ok' | 'fail'
const cache = new Map<string, Status>()
const listeners = new Map<string, Set<(s: Status) => void>>()

export function assetUrl(path: string): string {
  return `${import.meta.env.BASE_URL}money-hero/${path}`
}

function probe(url: string): void {
  if (cache.has(url)) return
  cache.set(url, 'pending')
  const img = new Image()
  const done = (status: Status) => {
    cache.set(url, status)
    listeners.get(url)?.forEach((fn) => fn(status))
    listeners.delete(url)
  }
  img.onload = () => done(img.naturalWidth > 0 ? 'ok' : 'fail')
  img.onerror = () => done('fail')
  img.src = url
}

/** คืน URL ของรูปถ้าโหลดได้ ไม่งั้นคืน null */
export function useImage(path: string | undefined): string | null {
  const url = path ? assetUrl(path) : ''
  const [status, setStatus] = useState<Status>(() => (url ? cache.get(url) ?? 'pending' : 'fail'))

  useEffect(() => {
    if (!url) return
    const known = cache.get(url)
    if (known && known !== 'pending') {
      setStatus(known)
      return
    }
    const set = listeners.get(url) ?? new Set()
    set.add(setStatus)
    listeners.set(url, set)
    probe(url)
    return () => {
      listeners.get(url)?.delete(setStatus)
    }
  }, [url])

  return status === 'ok' ? url : null
}
