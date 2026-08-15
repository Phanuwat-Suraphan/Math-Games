import { useCallback, useState } from 'react'
import { motion } from 'framer-motion'
import { isDragDropComplete } from '../../minigames/engine'
import type { DragDropGame } from '../../minigames/types'

/**
 * กระดานเกมลากวาง
 *
 * รองรับสองวิธีเล่นพร้อมกัน
 * 1. ลากแผ่นตัวเลขไปปล่อยในช่อง (HTML drag and drop) สำหรับเครื่องที่มีเมาส์
 * 2. แตะแผ่นแล้วแตะช่อง สำหรับแท็บเล็ตและมือถือ
 *
 * ทำไมต้องมีทั้งสองแบบ: HTML drag and drop ไม่ทำงานบนจอสัมผัสส่วนใหญ่
 * ถ้าทำแต่แบบลาก เด็กที่ใช้แท็บเล็ตจะเล่นด่านนี้ไม่ได้เลย
 * และการรอให้เด็กค้นพบเองว่าต้องแตะสองครั้งก็ไม่ยุติธรรม
 * จึงเขียนบอกไว้ใต้กระดานตรง ๆ
 */
export function DragDropBoard({
  game,
  onAnswer,
  onSolved,
}: {
  game: DragDropGame
  onAnswer: (correct: boolean) => void
  onSolved: () => void
}) {
  const [placements, setPlacements] = useState<Record<string, string>>({})
  const [heldTile, setHeldTile] = useState<string | null>(null)
  const [wrongSlot, setWrongSlot] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const place = useCallback(
    (slotId: string, tileId: string) => {
      if (done) return

      // แผ่นหนึ่งใบวางได้ช่องเดียว ถ้าย้ายมาช่องใหม่ต้องถอนจากช่องเก่าด้วย
      const next: Record<string, string> = {}
      for (const [key, value] of Object.entries(placements)) {
        if (value !== tileId) next[key] = value
      }
      next[slotId] = tileId

      setPlacements(next)
      setHeldTile(null)

      const filled = game.slots.every((slot) => Boolean(next[slot.id]))
      if (!filled) return

      const correct = isDragDropComplete(game, next)
      onAnswer(correct)

      if (correct) {
        setDone(true)
        window.setTimeout(onSolved, 480)
        return
      }

      setWrongSlot(slotId)
      window.setTimeout(() => {
        setWrongSlot(null)
        // ล้างกระดานให้ลองใหม่ ไม่ทิ้งคำตอบผิดค้างไว้ให้สับสน
        setPlacements({})
      }, 700)
    },
    [done, game, onAnswer, onSolved, placements],
  )

  const usedTiles = new Set(Object.values(placements))
  const parts = game.template.split(/(\{\w+\})/g)

  return (
    <div>
      {/* สมการพร้อมช่องว่าง */}
      <div className="flex flex-wrap items-center justify-center gap-2 rounded-xl2 border border-white/10 bg-night-800/60 p-5 text-2xl font-black text-white sm:text-3xl">
        {parts.map((part, index) => {
          const slotMatch = part.match(/^\{(\w+)\}$/)
          if (!slotMatch) {
            return part.trim() ? <span key={index}>{part}</span> : null
          }

          const slotId = slotMatch[1]
          const tileId = placements[slotId]
          const tile = game.tiles.find((entry) => entry.id === tileId)
          const isWrong = wrongSlot === slotId

          return (
            <motion.button
              key={index}
              type="button"
              onClick={() => heldTile && place(slotId, heldTile)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault()
                const dropped = event.dataTransfer.getData('text/plain')
                if (dropped) place(slotId, dropped)
              }}
              animate={isWrong ? { x: [0, -8, 8, -5, 0] } : { x: 0 }}
              transition={{ duration: 0.4 }}
              aria-label={tile ? `ช่องมีเลข ${tile.text}` : 'ช่องว่าง'}
              className={`min-w-[3.6rem] rounded-xl border-2 border-dashed px-3 py-2 ${
                isWrong
                  ? 'border-rose-400 bg-rose-500/20 text-rose-100'
                  : tile
                    ? 'border-solid border-emerald-400/70 bg-emerald-500/15 text-emerald-100'
                    : heldTile
                      ? 'border-gold-400 bg-gold-500/15 text-gold-200'
                      : 'border-white/30 text-slate-400'
              }`}
            >
              {tile ? tile.text : '?'}
            </motion.button>
          )
        })}
      </div>

      {/* กองแผ่นตัวเลข */}
      <div className="mt-5 flex flex-wrap justify-center gap-2.5">
        {game.tiles.map((tile) => {
          const used = usedTiles.has(tile.id)
          const held = heldTile === tile.id
          return (
            <motion.button
              key={tile.id}
              type="button"
              draggable={!used && !done}
              onDragStart={(event) => {
                const native = event as unknown as React.DragEvent
                native.dataTransfer?.setData('text/plain', tile.id)
                setHeldTile(tile.id)
              }}
              onClick={() => !used && setHeldTile(held ? null : tile.id)}
              disabled={used || done}
              animate={{ scale: held ? 1.12 : 1, opacity: used ? 0.25 : 1 }}
              className={`min-w-[3.2rem] cursor-grab rounded-xl border px-4 py-3 text-xl font-black active:cursor-grabbing ${
                held
                  ? 'border-gold-400 bg-gold-500/30 text-gold-100 ring-2 ring-gold-400/60'
                  : 'border-sky-400/40 bg-sky-500/15 text-sky-100'
              }`}
            >
              {tile.text}
            </motion.button>
          )
        })}
      </div>

      <p className="mt-4 text-center text-sm text-slate-300">
        ลากแผ่นไปวางในช่อง หรือแตะแผ่นแล้วแตะช่องก็ได้
      </p>
    </div>
  )
}
