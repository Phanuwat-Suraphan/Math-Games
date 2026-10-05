/*
 * Service Worker ของ MONEY HERO
 *
 * แบบ "เครือข่ายก่อน แคชสำรอง": ออนไลน์ได้ไฟล์ใหม่เสมอ ออฟไลน์ใช้ไฟล์ที่เคยโหลดไว้
 * วางไว้ที่รากของเว็บเพราะหน้าเกม (money-hero.html) อยู่ที่ราก
 * ขอบเขตจึงครอบทั้งเว็บ แต่ทำแค่เก็บสำเนาไฟล์ ไม่เปลี่ยนพฤติกรรมของเกมอื่น
 */
const CACHE = 'money-hero-v1'

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(['./money-hero.html', './money-hero/manifest.webmanifest', './money-hero/icon.svg']))
      .catch(() => undefined),
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('money-hero-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  // เก็บเฉพาะไฟล์จากเว็บเดียวกัน และฟอนต์จาก Google
  const sameOrigin = url.origin === self.location.origin
  const font = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com'
  if (!sameOrigin && !font) return

  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res && (res.ok || res.type === 'opaque')) {
          const copy = res.clone()
          caches.open(CACHE).then((cache) => cache.put(req, copy)).catch(() => undefined)
        }
        return res
      })
      .catch(() =>
        caches.match(req).then((hit) => {
          if (hit) return hit
          // ออฟไลน์และไม่มีสำเนา: เฉพาะหน้าเกมเงินเท่านั้นที่ส่งหน้าหลักกลับไป
          if (req.mode === 'navigate' && url.pathname.endsWith('money-hero.html')) return caches.match('./money-hero.html')
          return Response.error()
        }),
      ),
  )
})
