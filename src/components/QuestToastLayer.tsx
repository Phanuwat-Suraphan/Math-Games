import { AnimatePresence, motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useGame } from '../context/useGame'

/**
 * แจ้งเตือนเมื่อภารกิจครบเงื่อนไขระหว่างเล่น
 * ไม่จ่ายรางวัลอัตโนมัติ ผู้เล่นต้องไปกดรับเองที่หน้าภารกิจ
 */
export function QuestToastLayer() {
  const navigate = useNavigate()
  const { questToasts, dismissQuestToast } = useGame()

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-40 flex flex-col items-center gap-2 px-4">
      <AnimatePresence>
        {questToasts.map((quest) => (
          <motion.div
            key={quest.id}
            initial={{ opacity: 0, y: 24, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ type: 'spring', stiffness: 260, damping: 22 }}
            role="status"
            className="pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-2xl border border-gold-400/50 bg-night-800/95 p-3 shadow-card backdrop-blur"
          >
            <span aria-hidden="true" className="text-2xl">
              🎁
            </span>

            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-gold-300">
                ภารกิจสำเร็จ!
              </p>
              <p className="truncate text-sm font-bold text-white">
                {quest.title}
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                dismissQuestToast(quest.id)
                navigate('/quests')
              }}
              className="min-h-[40px] shrink-0 rounded-xl bg-gold-500/25 px-3 text-sm font-bold text-gold-300 transition-colors hover:bg-gold-500/40"
            >
              รับรางวัล
            </button>

            <button
              type="button"
              onClick={() => dismissQuestToast(quest.id)}
              aria-label={`ปิดการแจ้งเตือนภารกิจ ${quest.title}`}
              className="min-h-[40px] min-w-[40px] shrink-0 rounded-xl text-slate-400 transition-colors hover:bg-white/10"
            >
              ✕
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
