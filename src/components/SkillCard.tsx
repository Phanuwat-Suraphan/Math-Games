import { MAX_STARS } from '../utils/statistics'
import type { SkillSummary } from '../hooks/useProgression'

interface SkillCardProps {
  skill: SkillSummary
}

/**
 * การ์ดทักษะพร้อมดาว
 * ทักษะที่ยังไม่เคยฝึกจะแสดง "ยังไม่มีข้อมูล" แทนดาว 0 ดวง
 * เพื่อไม่ให้เด็กเข้าใจผิดว่าตัวเองทำได้แย่
 */
export function SkillCard({ skill }: SkillCardProps) {
  const { statistic, stars } = skill
  const hasData = statistic.attempts > 0

  return (
    <li className="flex items-center gap-3 rounded-2xl border border-white/10 bg-night-900/50 p-4">
      <span aria-hidden="true" className="text-2xl">
        {skill.emoji}
      </span>

      <div className="min-w-0 flex-1">
        <p className="font-bold text-white">{skill.name}</p>

        {hasData ? (
          <p className="text-sm text-slate-300">
            ความแม่นยำ{' '}
            <span className="font-semibold tabular-nums text-leaf-400">
              {statistic.accuracy}%
            </span>
            <span className="text-slate-400">
              {' '}
              · ทำแล้ว {statistic.correct}/{statistic.attempts} ข้อ
            </span>
          </p>
        ) : (
          <p className="text-sm text-slate-400">ยังไม่มีข้อมูล</p>
        )}
      </div>

      {hasData && stars !== null ? (
        <p
          className="shrink-0 text-base tracking-tight sm:text-lg"
          aria-label={`ระดับดาว ${stars} จาก ${MAX_STARS}`}
        >
          <span aria-hidden="true" className="text-gold-300">
            {'★'.repeat(stars)}
          </span>
          <span aria-hidden="true" className="text-night-500">
            {'★'.repeat(MAX_STARS - stars)}
          </span>
        </p>
      ) : (
        <p className="shrink-0 rounded-full bg-night-700 px-3 py-1 text-xs font-semibold text-slate-300">
          รอฝึก
        </p>
      )}
    </li>
  )
}
