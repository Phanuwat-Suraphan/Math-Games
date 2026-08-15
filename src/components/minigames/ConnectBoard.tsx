import { useCallback, useLayoutEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { isConnectComplete, isConnectionCorrect } from '../../minigames/engine'
import type { ConnectGame } from '../../minigames/types'

interface Point {
  x: number
  y: number
}

/**
 * กระดานเกมโยงเส้น
 *
 * แตะจุดฝั่งซ้ายหนึ่งจุด แล้วแตะจุดฝั่งขวาที่คิดว่าคู่กัน
 *
 * ทำไมใช้ "แตะแล้วแตะ" ไม่ใช่ "ลากค้าง":
 * เด็กเล่นบนแท็บเล็ตที่นิ้วบังจอ การลากค้างทำให้มองไม่เห็นปลายทาง
 * และถ้านิ้วหลุดกลางทางเส้นจะหายไปโดยไม่รู้สาเหตุ
 * การแตะสองครั้งยกเลิกง่ายกว่าและพลาดยากกว่า
 *
 * เส้นวาดด้วย SVG ที่ทาบบนกระดาน โดยอ่านตำแหน่งจริงของปุ่มจาก DOM
 * ไม่ใช่คำนวณจากลำดับ เพราะความสูงของแต่ละปุ่มไม่เท่ากันเมื่อข้อความยาวต่างกัน
 */
export function ConnectBoard({
  game,
  onAnswer,
  onSolved,
}: {
  game: ConnectGame
  onAnswer: (correct: boolean) => void
  onSolved: () => void
}) {
  const [links, setLinks] = useState<Record<string, string>>({})
  const [activeLeft, setActiveLeft] = useState<string | null>(null)
  const [wrongPair, setWrongPair] = useState<string | null>(null)

  const boardRef = useRef<HTMLDivElement>(null)
  const nodeRefs = useRef<Record<string, HTMLButtonElement | null>>({})
  const [anchors, setAnchors] = useState<Record<string, Point>>({})

  /**
   * วัดตำแหน่งจุดต่อสายใหม่ทุกครั้งที่ขนาดกระดานเปลี่ยน
   * ถ้าวัดครั้งเดียวตอน mount เส้นจะเพี้ยนทันทีที่หมุนจอหรือย่อหน้าต่าง
   */
  useLayoutEffect(() => {
    const measure = () => {
      const board = boardRef.current
      if (!board) return
      const base = board.getBoundingClientRect()
      const next: Record<string, Point> = {}

      for (const [id, element] of Object.entries(nodeRefs.current)) {
        if (!element) continue
        const box = element.getBoundingClientRect()
        const isLeft = game.left.some((node) => node.id === id)
        next[id] = {
          x: (isLeft ? box.right : box.left) - base.left,
          y: box.top + box.height / 2 - base.top,
        }
      }
      setAnchors(next)
    }

    measure()
    const observer = new ResizeObserver(measure)
    if (boardRef.current) observer.observe(boardRef.current)
    window.addEventListener('resize', measure)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [game])

  const tapRight = useCallback(
    (rightId: string) => {
      if (!activeLeft) return

      const correct = isConnectionCorrect(game, activeLeft, rightId)
      onAnswer(correct)

      if (!correct) {
        setWrongPair(`${activeLeft}->${rightId}`)
        window.setTimeout(() => setWrongPair(null), 600)
        setActiveLeft(null)
        return
      }

      const next = { ...links, [activeLeft]: rightId }
      setLinks(next)
      setActiveLeft(null)
      if (isConnectComplete(game, next)) onSolved()
    },
    [activeLeft, game, links, onAnswer, onSolved],
  )

  const usedRight = new Set(Object.values(links))

  return (
    <div ref={boardRef} className="relative">
      {/* เส้นที่ผูกแล้ว วาดอยู่ใต้ปุ่ม จึงไม่บังตัวเลข */}
      <svg
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full"
      >
        {Object.entries(links).map(([leftId, rightId]) => {
          const from = anchors[leftId]
          const to = anchors[rightId]
          if (!from || !to) return null
          return (
            <motion.line
              key={`${leftId}-${rightId}`}
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 0.35 }}
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
              stroke="#34d399"
              strokeWidth={3}
              strokeLinecap="round"
            />
          )
        })}
      </svg>

      <div className="relative grid grid-cols-2 gap-8">
        <div className="space-y-2.5">
          {game.left.map((node) => {
            const linked = Boolean(links[node.id])
            const isActive = activeLeft === node.id
            return (
              <button
                key={node.id}
                type="button"
                ref={(element) => {
                  nodeRefs.current[node.id] = element
                }}
                disabled={linked}
                onClick={() => setActiveLeft(isActive ? null : node.id)}
                className={`w-full rounded-xl border px-3 py-3 text-center text-base font-bold transition ${
                  linked
                    ? 'border-emerald-400/60 bg-emerald-500/15 text-emerald-100'
                    : isActive
                      ? 'border-gold-400 bg-gold-500/25 text-gold-100 ring-2 ring-gold-400/60'
                      : 'border-sky-400/40 bg-sky-500/10 text-sky-100'
                }`}
              >
                {node.text}
              </button>
            )
          })}
        </div>

        <div className="space-y-2.5">
          {game.right.map((node) => {
            const linked = usedRight.has(node.id)
            const isWrong = wrongPair?.endsWith(`->${node.id}`)
            return (
              <motion.button
                key={node.id}
                type="button"
                ref={(element) => {
                  nodeRefs.current[node.id] = element
                }}
                disabled={linked || !activeLeft}
                onClick={() => tapRight(node.id)}
                animate={isWrong ? { x: [0, -7, 7, -4, 0] } : { x: 0 }}
                transition={{ duration: 0.4 }}
                className={`w-full rounded-xl border px-3 py-3 text-center text-base font-bold transition ${
                  linked
                    ? 'border-emerald-400/60 bg-emerald-500/15 text-emerald-100'
                    : isWrong
                      ? 'border-rose-400 bg-rose-500/25 text-rose-100'
                      : activeLeft
                        ? 'border-gold-400/50 bg-gold-500/10 text-gold-100'
                        : 'border-white/15 bg-white/5 text-slate-200'
                }`}
              >
                {node.text}
              </motion.button>
            )
          })}
        </div>
      </div>

      {!activeLeft && Object.keys(links).length < game.left.length && (
        <p className="mt-4 text-center text-sm text-slate-300">
          แตะช่องทางซ้ายก่อน แล้วแตะคำตอบทางขวา
        </p>
      )}
    </div>
  )
}
