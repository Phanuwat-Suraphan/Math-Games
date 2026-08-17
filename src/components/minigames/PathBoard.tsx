import { useCallback, useState } from 'react'
import { motion } from 'framer-motion'
import { isPathComplete, isPathStepValid } from '../../minigames/engine'
import { playSfx } from '../../services/audioService'
import type { PathCell, PathGame } from '../../minigames/types'

/**
 * กระดานเส้นทางลับ
 *
 * เด็กเริ่มจากแผ่นที่มีดาว แล้วแตะแผ่นในแถวถัดไปทีละแถว
 * แผ่นถัดไปต้องอยู่ติดกัน (เยื้องได้ไม่เกินหนึ่งช่อง) และค่าต้องมากกว่าเดิมเท่ากับ step
 *
 * ทำไมต้องมีปุ่มถอยกลับหนึ่งก้าว
 *
 * เกมนี้ทุกก้าวขึ้นกับก้าวก่อนหน้า ต่างจากมินิเกมอื่นที่ตัดสินใจทีละครั้งอิสระ
 * เด็กที่เดินมาถึงกลางทางแล้วรู้ตัวว่าคิดผิดตั้งแต่ก้าวที่สอง
 * ถ้าไม่มีทางถอย จะต้องเริ่มใหม่ทั้งกระดาน ซึ่งลงโทษหนักเกินกว่าความผิด
 * และจะสอนให้เด็กกลัวการลอง แทนที่จะสอนให้ลองแล้วแก้
 *
 * การถอยกลับไม่นับเป็นการตอบผิด เพราะการรู้ตัวว่าเดินผิดแล้วแก้
 * คือสิ่งที่เราอยากให้เกิด ไม่ใช่สิ่งที่ควรถูกหักคะแนน
 */
export function PathBoard({
  game,
  onAnswer,
  onSolved,
  onFailed,
}: {
  game: PathGame
  /** เรียกทุกครั้งที่เด็กแตะแผ่น ไม่ว่าจะถูกหรือผิด */
  onAnswer: (correct: boolean) => void
  onSolved: () => void
  /** เหยียบผิดจนครบโควตาแล้ว */
  onFailed: () => void
}) {
  const [walked, setWalked] = useState<string[]>([game.startCellId])
  const [mistakes, setMistakes] = useState(0)
  const [wrongCellId, setWrongCellId] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const current = walked[walked.length - 1]
  const currentCell = game.cells.find((cell) => cell.id === current)
  const nextRow = currentCell ? currentCell.row + 1 : 0

  const stepOn = useCallback(
    (cell: PathCell) => {
      if (done) return
      // แตะแผ่นที่ไม่ใช่แถวถัดไป ไม่นับว่าผิด แค่ไม่เกิดอะไรขึ้น
      if (cell.row !== nextRow) return

      if (!isPathStepValid(game, current, cell.id)) {
        playSfx('wrong')
        onAnswer(false)
        setWrongCellId(cell.id)
        window.setTimeout(() => setWrongCellId(null), 500)

        const total = mistakes + 1
        setMistakes(total)
        if (total >= game.allowedMistakes) {
          setDone(true)
          onFailed()
        }
        return
      }

      playSfx('correct')
      onAnswer(true)
      const next = [...walked, cell.id]
      setWalked(next)

      if (isPathComplete(game, next)) {
        setDone(true)
        playSfx('victory')
        onSolved()
      }
    },
    [current, done, game, mistakes, nextRow, onAnswer, onFailed, onSolved, walked],
  )

  const stepBack = useCallback(() => {
    if (done || walked.length <= 1) return
    playSfx('click')
    setWalked((path) => path.slice(0, -1))
  }, [done, walked.length])

  const rows = Array.from({ length: game.rows }, (_, row) =>
    game.cells.filter((cell) => cell.row === row).sort((a, b) => a.col - b.col),
  )

  return (
    <div>
      <div className="panel p-3 text-center">
        <p className="text-sm text-slate-300">
          ยืนอยู่ที่{' '}
          <span className="font-black tabular-nums text-gold-300">
            {currentCell?.value ?? '-'}
          </span>{' '}
          · แผ่นถัดไปต้องเป็น{' '}
          <span className="font-black tabular-nums text-leaf-400">
            {currentCell ? currentCell.value + game.step : '-'}
          </span>
        </p>
        <p className="mt-1 text-xs text-slate-400">
          เหยียบผิดได้อีก {Math.max(0, game.allowedMistakes - mistakes)} ครั้ง
        </p>
      </div>

      <div className="mt-3 space-y-2">
        {rows.map((cells, row) => (
          <div
            key={row}
            className="grid gap-2"
            style={{ gridTemplateColumns: `repeat(${game.cols}, minmax(0, 1fr))` }}
          >
            {cells.map((cell) => {
              const walkedIndex = walked.indexOf(cell.id)
              const isWalked = walkedIndex >= 0
              const isCurrent = cell.id === current
              const isReachable = !done && cell.row === nextRow
              const isWrong = cell.id === wrongCellId

              return (
                <motion.button
                  key={cell.id}
                  type="button"
                  onClick={() => stepOn(cell)}
                  animate={isWrong ? { x: [0, -6, 6, -4, 0] } : { x: 0 }}
                  transition={{ duration: 0.35 }}
                  className={`min-h-[54px] rounded-xl border-b-4 text-lg font-black tabular-nums transition ${
                    isWrong
                      ? 'border-ember-700 bg-ember-600 text-white'
                      : isCurrent
                        ? 'border-gold-600 bg-gold-500 text-night-900'
                        : isWalked
                          ? 'border-leaf-600 bg-leaf-500 text-night-900'
                          : isReachable
                            ? 'border-arcane-600 bg-arcane-500/80 text-white hover:bg-arcane-500'
                            : 'border-night-600 bg-night-800 text-slate-400'
                  }`}
                >
                  {cell.id === game.startCellId && walkedIndex === 0 ? '⭐ ' : ''}
                  {cell.value}
                </motion.button>
              )
            })}
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={stepBack}
        disabled={done || walked.length <= 1}
        className="mt-3 w-full rounded-xl border border-night-500 bg-night-800 px-4 py-3 text-sm font-bold text-slate-300 transition hover:bg-night-700 disabled:cursor-not-allowed disabled:opacity-40"
      >
        ↩︎ ถอยกลับหนึ่งก้าว (ไม่นับว่าผิด)
      </button>
    </div>
  )
}
