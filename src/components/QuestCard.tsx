import { motion } from 'framer-motion'
import { Button } from './Button'
import { getNpc } from '../data/npcs'
import type { QuestView } from '../types/quest'

interface QuestCardProps {
  view: QuestView
  onClaim: (questId: string) => void
}

const TYPE_LABEL: Record<QuestView['quest']['type'], string> = {
  story: '📖 เนื้อเรื่อง',
  practice: '✏️ ฝึกฝน',
  daily: '🌅 ประจำวัน',
  challenge: '⚡ ท้าทาย',
}

export function QuestCard({ view, onClaim }: QuestCardProps) {
  const { quest, measured, percent, isCompleted, isClaimed, canClaim } = view
  const npc = getNpc(quest.npcId)

  return (
    <motion.li
      layout
      className={`surface-card flex flex-col gap-3 p-5 ${
        canClaim ? 'ring-2 ring-gold-300/60' : ''
      }`}
    >
      <div className="flex items-start gap-3">
        {npc ? (
          <span aria-hidden="true" className="text-3xl">
            {npc.avatar}
          </span>
        ) : null}

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-night-700/70 px-2.5 py-0.5 text-xs font-semibold text-slate-300">
              {TYPE_LABEL[quest.type]}
            </span>
            {isClaimed ? (
              <span className="rounded-full bg-leaf-600/25 px-2.5 py-0.5 text-xs font-bold text-leaf-400">
                ✓ รับรางวัลแล้ว
              </span>
            ) : isCompleted ? (
              <span className="rounded-full bg-gold-500/25 px-2.5 py-0.5 text-xs font-bold text-gold-300">
                🎁 พร้อมรับรางวัล
              </span>
            ) : (
              <span className="rounded-full bg-arcane-600/25 px-2.5 py-0.5 text-xs font-bold text-arcane-400">
                ⏳ กำลังทำ
              </span>
            )}
          </div>

          <h3 className="mt-1 text-lg font-bold text-white">{quest.title}</h3>
          <p className="mt-0.5 text-sm text-slate-300">{quest.description}</p>

          {npc && quest.dialogue && !isClaimed ? (
            <p className="mt-2 rounded-xl bg-night-900/60 px-3 py-2 text-sm italic text-slate-200">
              {npc.name}: “{quest.dialogue}”
            </p>
          ) : null}
        </div>
      </div>

      {/* เงื่อนไขแต่ละข้อพร้อมความคืบหน้า */}
      <ul className="space-y-2">
        {quest.requirements.map((requirement, index) => {
          const current = Math.min(measured[index] ?? 0, requirement.target)
          const isMet = (measured[index] ?? 0) >= requirement.target
          const ratio = Math.round((current / Math.max(1, requirement.target)) * 100)

          return (
            <li key={`${quest.id}-${index}`}>
              <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
                <span className={isMet ? 'text-leaf-400' : 'text-slate-300'}>
                  {isMet ? '✓' : '•'} {requirement.label}
                </span>
                <span className="tabular-nums text-slate-400">
                  {current} / {requirement.target}
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-night-900/70">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    isMet
                      ? 'bg-gradient-to-r from-leaf-400 to-leaf-600'
                      : 'bg-gradient-to-r from-arcane-400 to-arcane-600'
                  }`}
                  style={{ width: `${ratio}%` }}
                />
              </div>
            </li>
          )
        })}
      </ul>

      <div className="flex flex-wrap items-center gap-2">
        <span className="stat-chip text-arcane-400">
          <span aria-hidden="true">✨</span> +{quest.reward.exp} EXP
        </span>
        <span className="stat-chip text-gold-300">
          <span aria-hidden="true">🪙</span> +{quest.reward.coins}
        </span>
        {!isCompleted ? (
          <span className="ml-auto text-sm tabular-nums text-slate-400">
            {percent}%
          </span>
        ) : null}
      </div>

      {canClaim ? (
        <Button
          variant="success"
          fullWidth
          icon="🎁"
          onClick={() => onClaim(quest.id)}
        >
          รับรางวัล
        </Button>
      ) : isClaimed ? (
        <p className="rounded-2xl bg-night-900/60 px-4 py-2.5 text-center text-sm font-semibold text-slate-400">
          ✓ รับรางวัลไปแล้ว
        </p>
      ) : null}
    </motion.li>
  )
}
