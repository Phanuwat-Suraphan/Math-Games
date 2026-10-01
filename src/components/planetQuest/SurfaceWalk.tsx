import { useEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { Button } from '../Button'
import { playSfx } from '../../services/audioService'
import { companionSvgFile } from '../../planetQuest/companionArt'
import { companionFor, discoveryLine } from '../../planetQuest/companions'
import type { CompanionId } from '../../planetQuest/companions'
import { shipColor } from '../../planetQuest/ship'
import type { ShipColorId } from '../../planetQuest/ship'
import { angleGap, jumpLine, poiInReach, startState, stepWalk, sunLine, surfaceFor } from '../../planetQuest/surface'
import type { WalkInput } from '../../planetQuest/surface'
import { drawSurface, surfaceLayout } from '../../planetQuest/surfaceRender'
import { getPlanet } from '../../solar/planets'
import type { PlanetId } from '../../solar/planets'
import { CompanionSay } from './Companion'

/**
 * เดินสำรวจผิวดาว
 *
 * กดค้างปุ่มลูกศร (หรือปุ่มลูกศรบนคีย์บอร์ด A/D) เพื่อเดินรอบดาว กดปุ่มกระโดด (หรือเว้นวรรค) เพื่อกระโดด
 * เดินไปถึงป้าย ? แล้วกดสำรวจ จะได้เรื่องจริงของจุดนั้นลงบันทึกนักสำรวจ
 *
 * ฟิสิกส์กับการวาดอยู่ใน planetQuest/surface.ts และ surfaceRender.ts ซึ่งทดสอบได้โดยไม่ต้องมีหน้าจอ
 * คอมโพเนนต์นี้มีหน้าที่แค่วนลูปทุกเฟรม รับปุ่ม และแสดงข้อความ
 */
export function SurfaceWalk({
  planetId,
  companion,
  shipColorId,
  discovered,
  reduceMotion,
  onDiscover,
  onExit,
}: {
  planetId: PlanetId
  companion: CompanionId
  shipColorId: ShipColorId
  discovered: readonly string[]
  reduceMotion: boolean
  onDiscover: (poiId: string) => void
  onExit: () => void
}) {
  const planet = getPlanet(planetId)
  const surface = surfaceFor(planetId)
  const friend = companionFor(companion)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const input = useRef<WalkInput>({ left: false, right: false, jump: false })
  const discoveredRef = useRef(discovered)
  discoveredRef.current = discovered
  const [near, setNear] = useState<string | null>(null)
  const [reading, setReading] = useState<string | null>(null)

  /* ---------------- ลูปวาดทุกเฟรม ---------------- */
  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    let state = startState()
    let companionAngle = state.angle - 0.05
    let nearId: string | null = null
    let last = performance.now()
    let frame = 0
    const image = new Image()
    image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(companionSvgFile(companion))}`
    const look = shipColor(shipColorId)

    const tick = (now: number): void => {
      const dt = (now - last) / 1000
      last = now
      const ratio = Math.min(2, window.devicePixelRatio || 1)
      const cssWidth = Math.max(1, canvas.clientWidth)
      const cssHeight = Math.max(1, canvas.clientHeight)
      const width = Math.round(cssWidth * ratio)
      const height = Math.round(cssHeight * ratio)
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width
        canvas.height = height
      }
      // ฟิสิกส์คิดในหน่วยพิกเซลของหน้าจอ (CSS) ความเร็วเดินจึงเท่ากันทุกจอ
      const radius = surfaceLayout(cssWidth, cssHeight).radius
      state = stepWalk(state, input.current, dt, radius, planet)
      input.current.jump = false
      // เพื่อนร่วมทางเดินตามหลังช้า ๆ ไม่ติดตัวแน่นเหมือนเงา
      const target = state.angle - state.facing * (52 / radius)
      companionAngle += angleGap(companionAngle, target) * Math.min(1, Math.max(0, dt) * 5)
      const reach = poiInReach(state, surface, radius)?.id ?? null
      if (reach !== nearId) {
        nearId = reach
        setNear(reach)
      }
      drawSurface(ctx, { width, height }, {
        surface,
        planet,
        state,
        companionAngle,
        discovered: discoveredRef.current,
        near: nearId,
        companion: image,
        shipLook: look,
        now,
        reduceMotion,
        pixelRatio: ratio,
      })
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [companion, planet, reduceMotion, shipColorId, surface])

  /* ---------------- คีย์บอร์ด ---------------- */
  useEffect(() => {
    const set = (event: KeyboardEvent, down: boolean): void => {
      const target = event.target as HTMLElement | null
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return
      const key = event.key
      if (key === 'ArrowLeft' || key === 'a' || key === 'A') input.current.left = down
      else if (key === 'ArrowRight' || key === 'd' || key === 'D') input.current.right = down
      else if (key === ' ' || key === 'ArrowUp' || key === 'w' || key === 'W') {
        if (down && !event.repeat) input.current.jump = true
      } else return
      event.preventDefault()
    }
    const down = (event: KeyboardEvent): void => set(event, true)
    const up = (event: KeyboardEvent): void => set(event, false)
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [])

  /** ปุ่มบนจอ กดค้างเพื่อเดิน ปล่อยนิ้วหรือลากนิ้วออกนอกปุ่มแล้วหยุด */
  const hold = (side: 'left' | 'right') => ({
    onPointerDown: (event: ReactPointerEvent<HTMLButtonElement>) => {
      event.currentTarget.setPointerCapture?.(event.pointerId)
      input.current[side] = true
    },
    onPointerUp: () => {
      input.current[side] = false
    },
    onPointerCancel: () => {
      input.current[side] = false
    },
    onLostPointerCapture: () => {
      input.current[side] = false
    },
  })

  const nearPoi = surface.pois.find((poi) => poi.id === near) ?? null
  const readingPoi = surface.pois.find((poi) => poi.id === reading) ?? null
  const foundHere = surface.pois.filter((poi) => discovered.includes(poi.id))
  const allFound = foundHere.length === surface.pois.length

  const explore = (): void => {
    if (!nearPoi) return
    const fresh = !discovered.includes(nearPoi.id)
    playSfx(fresh ? 'pickup' : 'click')
    if (fresh) onDiscover(nearPoi.id)
    setReading(nearPoi.id)
  }

  return (
    <section className="mt-3 space-y-3">
      <div className="relative">
        <canvas
          ref={canvasRef}
          className="pq-surface"
          role="img"
          aria-label={`ผิว${planet.name} มีจุดสำรวจ ${surface.pois.length} จุด สำรวจแล้ว ${foundHere.length} จุด`}
        />
        <div className="sol-hud pointer-events-none absolute left-3 top-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-cyan-300">
            {surface.kind === 'gas' ? 'ลอยเหนือเมฆ' : 'เดินสำรวจผิวดาว'}
          </p>
          <p className="text-sm font-black text-white">
            {planet.name} · 🔍 {foundHere.length}/{surface.pois.length}
          </p>
        </div>
      </div>

      <div className="pq-walkpad">
        <button type="button" className="pq-walkkey" aria-label="เดินไปทางซ้าย" {...hold('left')}>
          ◀
        </button>
        <button
          type="button"
          className="pq-walkkey pq-walkkey-jump"
          aria-label="กระโดด"
          onClick={() => {
            input.current.jump = true
          }}
        >
          ⤴ กระโดด
        </button>
        <button type="button" className="pq-walkkey" aria-label="เดินไปทางขวา" {...hold('right')}>
          ▶
        </button>
      </div>

      {nearPoi ? (
        <div className="flex justify-center">
          <Button size="lg" icon={discovered.includes(nearPoi.id) ? '📖' : '🔍'} onClick={explore} silent>
            {discovered.includes(nearPoi.id) ? `อ่านอีกครั้ง: ${nearPoi.title}` : `สำรวจ${nearPoi.title}`}
          </Button>
        </div>
      ) : (
        <p className="text-center text-xs text-slate-400">
          กดค้าง ◀ ▶ เพื่อเดินไปหาป้าย ? (หรือใช้ปุ่มลูกศรบนคีย์บอร์ด เว้นวรรคเพื่อกระโดด)
        </p>
      )}

      {readingPoi ? (
        <div className="sol-comms space-y-2 p-4">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold-300">🔍 {readingPoi.title}</p>
          <p className="text-base font-bold leading-relaxed text-white">{readingPoi.fact}</p>
          <CompanionSay id={companion} reduceMotion={reduceMotion} size={44}>
            {discoveryLine(friend, readingPoi.title)}
          </CompanionSay>
        </div>
      ) : null}

      {allFound ? (
        <p role="status" className="rounded-2xl border border-gold-400/50 bg-gold-500/15 px-4 py-3 text-center text-sm font-black text-gold-200">
          🏅 สำรวจครบทุกจุดบน{planet.name}แล้ว! นักสำรวจตัวจริง
        </p>
      ) : null}

      <div className="sol-panel space-y-1.5 p-4 text-sm text-slate-200">
        <p className="font-bold text-white">🛬 {surface.intro}</p>
        <p>{jumpLine(planet)}</p>
        <p>{surface.sunVisible ? sunLine(planet) : '☁️ เมฆหนาจนมองไม่เห็นดวงอาทิตย์ เห็นแค่แสงเรือง ๆ'}</p>
        {surface.caution ? <p className="text-ember-200">⚠️ {surface.caution}</p> : null}
      </div>

      {foundHere.length > 0 ? (
        <div className="sol-panel p-4">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-300">📒 บันทึกนักสำรวจ · {planet.name}</p>
          <ul className="mt-2 space-y-1.5">
            {foundHere.map((poi) => (
              <li key={poi.id} className="text-sm text-slate-200">
                <span className="font-black text-white">✓ {poi.title}</span> · {poi.fact}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="flex justify-center">
        <Button variant="secondary" icon="🚀" onClick={onExit}>
          กลับขึ้นยาน
        </Button>
      </div>
    </section>
  )
}
