import { useCallback, useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { isCatchCleared, isCaught } from '../../minigames/engine'
import type { CatchGame, FallingItem } from '../../minigames/types'

/** ของหนึ่งชิ้นที่กำลังตกอยู่บนจอ */
interface LiveItem {
  item: FallingItem
  /** 0 = อยู่บนสุด 1 = ถึงพื้นตะกร้า */
  progress: number
}

const BASKET_HALF_WIDTH = 0.12

/**
 * กระดานเกมรับของที่ตกลงมา
 *
 * เลื่อนตะกร้าซ้ายขวา รับเฉพาะตัวเลขที่ตรงกฎ
 *
 * เรื่องเวลา: ใช้ requestAnimationFrame กับเวลาจริงที่ผ่านไป
 * ไม่ใช่ setInterval ที่บวกทีละคงที่
 * เพราะถ้าเครื่องช้าหรือผู้เล่นสลับแท็บ setInterval จะถูกหน่วง
 * ของจะตกช้าลงจนเกมง่ายผิดปกติบนเครื่องช้า ซึ่งไม่ยุติธรรมกับคนที่เครื่องเร็ว
 *
 * เรื่องการบังคับ: รองรับทั้งลากนิ้ว เลื่อนเมาส์ และปุ่มลูกศร
 * ปุ่มลูกศรจำเป็นสำหรับเด็กที่ใช้คอมพิวเตอร์และคนที่ใช้คีย์บอร์ดอย่างเดียว
 */
export function CatchBoard({
  game,
  onAnswer,
  onFinished,
}: {
  game: CatchGame
  onAnswer: (correct: boolean) => void
  onFinished: (cleared: boolean) => void
}) {
  const [basket, setBasket] = useState(0.5)
  const [live, setLive] = useState<LiveItem[]>([])
  const [caughtRight, setCaughtRight] = useState(0)
  const [caughtWrong, setCaughtWrong] = useState(0)
  const [flash, setFlash] = useState<'good' | 'bad' | null>(null)

  const areaRef = useRef<HTMLDivElement>(null)
  const basketRef = useRef(0.5)
  const startedAtRef = useRef(0)
  const settledRef = useRef(new Set<string>())
  const finishedRef = useRef(false)
  const statsRef = useRef({ right: 0, wrong: 0 })

  // เก็บตำแหน่งตะกร้าไว้ใน ref ด้วย เพราะลูปอนิเมชันอ่าน state ไม่ทัน
  const moveBasket = useCallback((next: number) => {
    const clamped = Math.min(1, Math.max(0, next))
    basketRef.current = clamped
    setBasket(clamped)
  }, [])

  /** แปลงตำแหน่งนิ้วหรือเมาส์เป็นสัดส่วน 0–1 ของความกว้างสนาม */
  const pointTo = useCallback((clientX: number) => {
    const area = areaRef.current
    if (!area) return
    const box = area.getBoundingClientRect()
    if (box.width === 0) return
    moveBasket((clientX - box.left) / box.width)
  }, [moveBasket])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') moveBasket(basketRef.current - 0.08)
      if (event.key === 'ArrowRight') moveBasket(basketRef.current + 0.08)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [moveBasket])

  useEffect(() => {
    let frame = 0
    startedAtRef.current = performance.now()

    const tick = (now: number) => {
      const elapsed = (now - startedAtRef.current) / 1000

      const onScreen: LiveItem[] = []
      for (const item of game.items) {
        if (settledRef.current.has(item.id)) continue
        if (elapsed < item.dropAt) continue

        const progress = (elapsed - item.dropAt) / item.fallSeconds

        if (progress >= 1) {
          // ถึงระดับตะกร้าแล้ว ตัดสินครั้งเดียวแล้วเลิกติดตามชิ้นนี้
          settledRef.current.add(item.id)
          if (isCaught(basketRef.current, item.lane, BASKET_HALF_WIDTH)) {
            if (item.correct) {
              statsRef.current.right += 1
              setCaughtRight(statsRef.current.right)
              setFlash('good')
            } else {
              statsRef.current.wrong += 1
              setCaughtWrong(statsRef.current.wrong)
              setFlash('bad')
            }
            onAnswer(item.correct)
            window.setTimeout(() => setFlash(null), 220)
          }
          continue
        }

        onScreen.push({ item, progress })
      }

      setLive(onScreen)

      const allSettled = settledRef.current.size === game.items.length
      if (allSettled && !finishedRef.current) {
        finishedRef.current = true
        onFinished(
          isCatchCleared(game, statsRef.current.right, statsRef.current.wrong),
        )
        return
      }

      frame = requestAnimationFrame(tick)
    }

    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [game, onAnswer, onFinished])

  const mistakesLeft = Math.max(0, game.allowedMistakes - caughtWrong)

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-3 text-sm font-semibold">
        <span className="rounded-lg border border-emerald-400/40 bg-emerald-500/10 px-3 py-1.5 text-emerald-200">
          รับแล้ว {caughtRight} / {game.targetCatches}
        </span>
        <span
          className={`rounded-lg border px-3 py-1.5 ${
            mistakesLeft === 0
              ? 'border-rose-400/60 bg-rose-500/15 text-rose-200'
              : 'border-white/15 bg-white/5 text-slate-200'
          }`}
        >
          พลาดได้อีก {mistakesLeft} ครั้ง
        </span>
      </div>

      <div
        ref={areaRef}
        role="application"
        aria-label={game.rule}
        onPointerMove={(event) => pointTo(event.clientX)}
        onPointerDown={(event) => pointTo(event.clientX)}
        className={`relative h-80 touch-none overflow-hidden rounded-xl2 border bg-gradient-to-b from-night-800 to-night-900 sm:h-96 ${
          flash === 'good'
            ? 'border-emerald-400'
            : flash === 'bad'
              ? 'border-rose-400'
              : 'border-white/10'
        }`}
      >
        {/* กฎของด่านค้างอยู่บนจอตลอด เด็กจะได้ไม่ต้องจำ */}
        <p className="pointer-events-none absolute inset-x-0 top-2 text-center text-sm font-bold text-gold-300">
          {game.rule}
        </p>

        {live.map(({ item, progress }) => (
          <div
            key={item.id}
            className="pointer-events-none absolute flex h-11 w-11 -translate-x-1/2 items-center justify-center rounded-full border text-base font-black"
            style={{
              left: `${item.lane * 100}%`,
              top: `${8 + progress * 76}%`,
              borderColor: 'rgba(255,255,255,.25)',
              background: 'rgba(255,255,255,.08)',
              color: '#e2e8f0',
            }}
          >
            {item.text}
          </div>
        ))}

        {/* ตะกร้า */}
        <motion.div
          animate={{ left: `${basket * 100}%` }}
          transition={{ type: 'tween', duration: 0.08 }}
          className="absolute bottom-3 h-14 -translate-x-1/2"
          style={{ width: `${BASKET_HALF_WIDTH * 200}%` }}
        >
          <svg viewBox="0 0 100 46" className="h-full w-full">
            <defs>
              <linearGradient id="catch-basket" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#d97706" />
                <stop offset="100%" stopColor="#78350f" />
              </linearGradient>
            </defs>
            <ellipse cx="50" cy="6" rx="46" ry="6" fill="#92400e" />
            <path d="M4 6 L14 42 L86 42 L96 6 Z" fill="url(#catch-basket)" />
            <g stroke="#78350f" strokeWidth="2" opacity=".6">
              <path d="M22 10 L28 40 M40 10 L43 40 M60 10 L57 40 M78 10 L72 40" />
              <path d="M10 20 L90 20 M13 30 L87 30" />
            </g>
            <ellipse cx="50" cy="6" rx="46" ry="6" fill="none" stroke="#fbbf24" strokeWidth="2.5" />
          </svg>
        </motion.div>
      </div>

      <p className="mt-3 text-center text-sm text-slate-300">
        ลากนิ้วบนสนาม หรือกดปุ่มลูกศรซ้ายขวา เพื่อเลื่อนตะกร้า
      </p>
    </div>
  )
}
