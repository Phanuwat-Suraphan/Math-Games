import { useCallback, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { isMatchingPair } from '../../minigames/engine'
import type { MatchingGame } from '../../minigames/types'

/**
 * กระดานเกมจับคู่
 *
 * เปิดได้ทีละสองใบ ถ้าเป็นคู่กันไพ่จะหายไป ถ้าไม่ใช่จะพลิกกลับ
 *
 * จุดที่ต้องระวัง: ระหว่างที่ไพ่ผิดคู่กำลังรอพลิกกลับ ต้องล็อกไม่ให้กดเพิ่ม
 * ถ้าไม่ล็อก เด็กจะรัวนิ้วเปิดใบที่สามได้ก่อนตัวจับเวลาทำงาน
 * แล้วไพ่สองใบแรกจะค้างเปิดอยู่ตลอดจนกระดานพัง
 */
export function MatchingBoard({
  game,
  onAnswer,
  onSolved,
}: {
  game: MatchingGame
  /** เรียกทุกครั้งที่เปิดครบสองใบ ไม่ว่าจะถูกหรือผิด */
  onAnswer: (correct: boolean) => void
  onSolved: () => void
}) {
  const [openIds, setOpenIds] = useState<string[]>([])
  const [clearedPairs, setClearedPairs] = useState<string[]>([])
  const [wrongIds, setWrongIds] = useState<string[]>([])
  const [locked, setLocked] = useState(false)

  const flip = useCallback(
    (cardId: string) => {
      if (locked) return
      if (openIds.includes(cardId)) return

      const card = game.cards.find((entry) => entry.id === cardId)
      if (!card || clearedPairs.includes(card.pairId)) return

      const next = [...openIds, cardId]
      if (next.length < 2) {
        setOpenIds(next)
        return
      }

      const [firstId, secondId] = next
      const correct = isMatchingPair(game, firstId, secondId)
      setOpenIds(next)
      setLocked(true)
      onAnswer(correct)

      if (correct) {
        const pairId = game.cards.find((entry) => entry.id === firstId)?.pairId
        window.setTimeout(() => {
          const cleared = pairId ? [...clearedPairs, pairId] : clearedPairs
          setClearedPairs(cleared)
          setOpenIds([])
          setLocked(false)
          if (cleared.length === game.pairCount) onSolved()
        }, 420)
        return
      }

      setWrongIds(next)
      window.setTimeout(() => {
        setWrongIds([])
        setOpenIds([])
        setLocked(false)
      }, 750)
    },
    [clearedPairs, game, locked, onAnswer, onSolved, openIds],
  )

  return (
    <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4">
      {game.cards.map((card) => {
        const isCleared = clearedPairs.includes(card.pairId)
        const isOpen = openIds.includes(card.id) || isCleared
        const isWrong = wrongIds.includes(card.id)

        return (
          <button
            key={card.id}
            type="button"
            onClick={() => flip(card.id)}
            disabled={isCleared || locked}
            aria-label={isOpen ? card.text : 'การ์ดคว่ำ'}
            className="relative aspect-[3/4] select-none"
          >
            <motion.div
              animate={{
                rotateY: isOpen ? 180 : 0,
                opacity: isCleared ? 0.25 : 1,
                scale: isWrong ? 0.94 : 1,
              }}
              transition={{ duration: 0.32 }}
              style={{ transformStyle: 'preserve-3d' }}
              className="h-full w-full"
            >
              {/* ด้านหลังไพ่ */}
              <div
                style={{ backfaceVisibility: 'hidden' }}
                className="absolute inset-0 flex items-center justify-center rounded-xl border border-violet-400/30 bg-gradient-to-br from-violet-700/70 to-night-900 text-2xl font-black text-violet-300/70"
              >
                ?
              </div>

              {/* ด้านหน้าไพ่ */}
              <div
                style={{
                  backfaceVisibility: 'hidden',
                  transform: 'rotateY(180deg)',
                }}
                className={`absolute inset-0 flex items-center justify-center rounded-xl border px-1 text-center text-base font-bold leading-tight sm:text-lg ${
                  isWrong
                    ? 'border-rose-400/70 bg-rose-500/20 text-rose-100'
                    : card.side === 'prompt'
                      ? 'border-sky-400/50 bg-sky-500/15 text-sky-100'
                      : 'border-gold-400/50 bg-gold-500/15 text-gold-100'
                }`}
              >
                {card.text}
              </div>
            </motion.div>

            <AnimatePresence>
              {isCleared && (
                <motion.div
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1.25, opacity: 0 }}
                  transition={{ duration: 0.55 }}
                  className="pointer-events-none absolute inset-0 rounded-xl border-2 border-emerald-300"
                />
              )}
            </AnimatePresence>
          </button>
        )
      })}
    </div>
  )
}
