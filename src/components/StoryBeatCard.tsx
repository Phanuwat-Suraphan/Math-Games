import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { getNpc } from '../data/npcs'
import type { StoryBeat } from '../types/story'

/**
 * การ์ดเล่าเรื่องหนึ่งตอน
 *
 * แสดงทีละย่อหน้า แล้วให้เด็กกดเพื่อดูย่อหน้าถัดไป
 *
 * ทำไมไม่แสดงทั้งก้อนทีเดียว: เด็ก ป.4 อ่านข้อความยาว ๆ ทีเดียวแล้วข้ามทันที
 * การให้กดทีละย่อหน้าทำให้จังหวะการอ่านช้าลงพอที่จะอ่านจริง
 * และการกดเองทำให้รู้สึกว่าควบคุมเรื่องอยู่ ไม่ใช่ถูกบังคับให้ดู
 *
 * ปุ่มข้ามมีเสมอ เพราะเด็กที่เล่นซ้ำไม่ควรต้องอ่านเรื่องเดิมทุกครั้ง
 */
export function StoryBeatCard({
  beat,
  onFinish,
}: {
  beat: StoryBeat
  onFinish: () => void
}) {
  const [shown, setShown] = useState(1)
  const npc = beat.npcId ? getNpc(beat.npcId) : undefined
  const isLast = shown >= beat.lines.length

  // เปลี่ยนตอนแล้วต้องเริ่มนับย่อหน้าใหม่ ไม่งั้นตอนใหม่จะโผล่มาแบบอ่านจบแล้ว
  useEffect(() => {
    setShown(1)
  }, [beat.id])

  return (
    <div className="rounded-xl2 border border-gold-400/30 bg-night-800/70 p-5">
      <div className="flex items-center gap-2">
        <span className="rounded-full border border-gold-400/40 bg-gold-500/15 px-3 py-1 text-xs font-bold text-gold-200">
          เรื่องราว
        </span>
        {npc && <span className="text-sm text-slate-300">{npc.name}</span>}
      </div>

      <h3 className="mt-2 text-lg font-bold text-white">{beat.title}</h3>

      <div className="mt-3 space-y-2">
        <AnimatePresence initial={false}>
          {beat.lines.slice(0, shown).map((line, index) => (
            <motion.p
              key={index}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-sm leading-relaxed text-slate-200"
            >
              {line}
            </motion.p>
          ))}
        </AnimatePresence>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <span className="text-xs text-slate-400">
          {Math.min(shown, beat.lines.length)} / {beat.lines.length}
        </span>
        <div className="flex gap-2">
          {!isLast && (
            <button
              type="button"
              onClick={onFinish}
              className="rounded-lg px-3 py-2 text-sm text-slate-400 underline"
            >
              ข้าม
            </button>
          )}
          <button
            type="button"
            onClick={() => (isLast ? onFinish() : setShown((n) => n + 1))}
            className="rounded-lg border border-gold-400/50 bg-gold-500/20 px-5 py-2 text-sm font-bold text-gold-100"
          >
            {isLast ? 'ไปต่อ' : 'อ่านต่อ'}
          </button>
        </div>
      </div>
    </div>
  )
}
