import { motion } from 'framer-motion'
import { Button } from './Button'
import { StarRow } from './StarRow'
import { getRequiredCorrectAnswers } from '../utils/stageSystem'
import type { Stage, StageDifficulty, StageProgress, StageStatus } from '../types/stage'

interface StageCardProps {
  stage: Stage
  status: StageStatus
  progress: StageProgress
  previousStageName?: string
  onStart: (stage: Stage) => void
}

const DIFFICULTY_LABEL: Record<StageDifficulty, string> = {
  easy: 'ง่าย',
  medium: 'ปานกลาง',
  hard: 'ยาก',
  boss: 'บอส',
}

const DIFFICULTY_CLASS: Record<StageDifficulty, string> = {
  easy: 'bg-leaf-600/25 text-leaf-400',
  medium: 'bg-sky-600/25 text-sky-400',
  hard: 'bg-gold-600/25 text-gold-300',
  boss: 'bg-ember-600/25 text-ember-400',
}

/** ป้ายสถานะ ใช้ทั้งไอคอนและข้อความ ไม่พึ่งสีอย่างเดียว */
const STATUS_BADGE: Record<StageStatus, { label: string; className: string }> = {
  LOCKED: { label: '🔒 ยังไม่เปิด', className: 'bg-night-900/70 text-slate-300' },
  AVAILABLE: { label: '▶ พร้อมเริ่ม', className: 'bg-arcane-600/25 text-arcane-400' },
  IN_PROGRESS: { label: '⏳ กำลังดำเนินการ', className: 'bg-gold-500/25 text-gold-300' },
  COMPLETED: { label: '✓ ผ่านแล้ว', className: 'bg-leaf-600/25 text-leaf-400' },
  MASTERED: { label: '🏆 เชี่ยวชาญแล้ว', className: 'bg-gold-500/30 text-gold-300' },
}

export function StageCard({
  stage,
  status,
  progress,
  previousStageName,
  onStart,
}: StageCardProps) {
  const isLocked = status === 'LOCKED'
  const badge = STATUS_BADGE[status]
  const hasPlayed = progress.attempts > 0
  const reward = progress.completed ? stage.replayReward : stage.firstClearReward

  return (
    <motion.article
      whileHover={isLocked ? undefined : { y: -3 }}
      className={[
        'surface-card flex flex-col gap-4 p-5',
        isLocked ? 'opacity-70' : '',
        stage.isBoss && !isLocked ? 'ring-1 ring-ember-500/50' : '',
        status === 'MASTERED' ? 'ring-1 ring-gold-400/50' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="flex items-start gap-3">
        <span aria-hidden="true" className="text-3xl">
          {isLocked ? '🔒' : stage.emoji}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              ด่านที่ {stage.order}
            </p>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-bold ${badge.className}`}
            >
              {badge.label}
            </span>
          </div>

          <h3
            className={`mt-0.5 text-lg font-bold ${isLocked ? 'text-slate-400' : 'text-white'}`}
          >
            {stage.name}
          </h3>
          <p className="mt-1 text-sm text-slate-300">{stage.description}</p>
        </div>

        {!isLocked ? (
          <StarRow stars={progress.stars} className="shrink-0" />
        ) : null}
      </div>

      {isLocked ? (
        <p className="rounded-2xl bg-night-900/70 px-4 py-3 text-center text-sm font-semibold text-slate-300">
          🔒 ผ่าน{previousStageName ? ` "${previousStageName}"` : 'ด่านก่อนหน้า'}{' '}
          เพื่อปลดล็อก
        </p>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span
              className={`rounded-full px-3 py-1 font-semibold ${DIFFICULTY_CLASS[stage.difficulty]}`}
            >
              ระดับ: {DIFFICULTY_LABEL[stage.difficulty]}
            </span>
            <span className="stat-chip text-slate-300">
              <span aria-hidden="true">❓</span> {stage.questionCount} ข้อ
            </span>
            <span className="stat-chip text-slate-300">
              <span aria-hidden="true">🎯</span> ผ่านที่{' '}
              {getRequiredCorrectAnswers(stage)} ข้อ
            </span>
            <span className="stat-chip text-arcane-400">
              <span aria-hidden="true">✨</span> +{reward.exp} EXP
            </span>
            <span className="stat-chip text-gold-300">
              <span aria-hidden="true">🪙</span> +{reward.coins}
            </span>
          </div>

          {hasPlayed ? (
            <dl className="grid grid-cols-3 gap-2 rounded-2xl bg-night-900/50 p-3 text-center">
              <div>
                <dt className="text-[11px] text-slate-400">คะแนนดีที่สุด</dt>
                <dd className="text-sm font-bold tabular-nums text-white">
                  {progress.bestScore} / {stage.questionCount}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] text-slate-400">แม่นยำที่สุด</dt>
                <dd className="text-sm font-bold tabular-nums text-sky-400">
                  {progress.bestAccuracy}%
                </dd>
              </div>
              <div>
                <dt className="text-[11px] text-slate-400">เล่นไปแล้ว</dt>
                <dd className="text-sm font-bold tabular-nums text-slate-200">
                  {progress.attempts} ครั้ง
                </dd>
              </div>
            </dl>
          ) : null}

          <Button
            variant={stage.isBoss ? 'danger' : 'primary'}
            fullWidth
            icon={stage.isBoss ? '⚔️' : '▶️'}
            onClick={() => onStart(stage)}
            aria-label={`เริ่มด่าน ${stage.name}`}
          >
            {progress.completed ? 'เล่นอีกครั้ง' : 'เริ่มภารกิจ'}
          </Button>
        </>
      )}
    </motion.article>
  )
}
