import { motion } from 'framer-motion'
import { solutionSteps } from '../questionEngine/solution'
import type { Question } from '../questionEngine/types'

/**
 * เฉลยทีละขั้นของโจทย์หนึ่งข้อ
 *
 * แสดงเป็นลำดับที่มีเลขกำกับ ไม่ใช่ย่อหน้ายาว
 * เพราะสิ่งที่เด็กที่ทำไม่เป็นต้องการคือ "ทำอะไรก่อน ทำอะไรต่อ"
 * ข้อความยาวก้อนเดียวตอบคำถามนั้นไม่ได้ ต่อให้เนื้อหาถูกต้องครบถ้วน
 *
 * ขั้นสุดท้ายเน้นด้วยสีทองเสมอ เด็กที่อยากดูแค่คำตอบจะได้หาเจอทันที
 * โดยไม่ต้องไล่อ่านทุกขั้น ซึ่งถ้าหาไม่เจอเด็กจะเลิกอ่านทั้งหมด
 */
export function SolutionSteps({ question }: { question: Question }) {
  const steps = solutionSteps(question)

  return (
    <div className="panel p-4">
      <p className="text-xs font-bold text-gold-300">วิธีคิดทีละขั้น</p>

      <ol className="mt-3 space-y-2">
        {steps.map((step, index) => {
          const isLast = index === steps.length - 1

          return (
            <motion.li
              key={`${step.title}-${index}`}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              // ไล่ทีละขั้น ทำให้สายตาอ่านตามลำดับโดยไม่ต้องพยายาม
              transition={{ delay: index * 0.06, duration: 0.22 }}
              className={`flex gap-3 rounded-xl border p-2.5 ${
                isLast
                  ? 'border-gold-400/45 bg-gold-500/10'
                  : 'border-white/10 bg-white/5'
              }`}
            >
              <span
                aria-hidden="true"
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-black ${
                  isLast ? 'bg-gold-400 text-night-900' : 'bg-white/10 text-slate-200'
                }`}
              >
                {index + 1}
              </span>

              <div className="min-w-0 flex-1">
                <p
                  className={`text-sm font-bold ${
                    isLast ? 'text-gold-200' : 'text-slate-200'
                  }`}
                >
                  {step.title}
                </p>
                <p className="text-sm leading-relaxed text-slate-300">{step.detail}</p>
              </div>
            </motion.li>
          )
        })}
      </ol>
    </div>
  )
}
