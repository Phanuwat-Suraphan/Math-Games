import { useNavigate } from 'react-router-dom'
import { Button } from '../components/Button'
import { QuestCard } from '../components/QuestCard'
import { ScreenLayout } from '../components/ScreenLayout'
import { TopBar } from '../components/TopBar'
import { getWorld } from '../data/worlds'
import { useProgression } from '../hooks/useProgression'
import { useQuests } from '../hooks/useQuests'
import type { Player } from '../types/player'
import type { QuestView } from '../types/quest'

export function Quests({ player }: { player: Player }) {
  const navigate = useNavigate()
  const { main, side, daily, claimableCount, claimQuest } = useQuests(player)
  const { nextStage } = useProgression(player)

  return (
    <>
      <TopBar
        player={player}
        title="ภารกิจ"
        backTo="/menu"
        backLabel="เมนูหลัก"
      />

      <ScreenLayout width="wide">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white sm:text-3xl">
            📜 สมุดภารกิจ
          </h2>
          {claimableCount > 0 ? (
            <p className="mt-2 inline-flex rounded-full bg-gold-500/25 px-4 py-1.5 font-bold text-gold-300">
              🎁 มีรางวัลรออยู่ {claimableCount} ภารกิจ
            </p>
          ) : (
            <p className="mt-2 text-slate-300">
              ทำภารกิจให้ครบเงื่อนไข แล้วกลับมากดรับรางวัลได้เลย
            </p>
          )}
        </div>

        {/* ด่านถัดไปที่ควรไปทำ */}
        {nextStage ? (
          <section className="surface-card mt-5 p-5">
            <h3 className="text-lg font-bold text-gold-300">
              ⚔️ ด่านถัดไปของหนู
            </h3>
            <p className="mt-2 text-xl font-bold text-white">
              {nextStage.emoji} {nextStage.name}
            </p>
            <p className="mt-1 text-sm text-slate-300">
              {nextStage.description}
            </p>
            <p className="mt-2 text-sm text-slate-400">
              สถานที่: {getWorld(nextStage.worldId)?.name ?? 'ไม่ทราบ'} · รางวัล
              ✨ {nextStage.firstClearReward.exp} EXP · 🪙{' '}
              {nextStage.firstClearReward.coins}
            </p>
            <Button
              className="mt-4"
              size="lg"
              fullWidth
              icon="▶️"
              onClick={() =>
                navigate(`/quest/${nextStage.worldId}/${nextStage.id}`)
              }
            >
              ไปทำด่านนี้
            </Button>
          </section>
        ) : (
          <p className="surface-card mt-5 p-6 text-center text-slate-300">
            🎊 ผ่านทุกด่านที่เปิดให้เล่นแล้ว! ด่านใหม่จะเปิดเพิ่มในตอนต่อไป
          </p>
        )}

        <QuestSection
          title="🌅 ภารกิจประจำวัน"
          note="รีเซ็ตทุกวัน เล่นวันไหนก็ได้รางวัลวันนั้น"
          views={daily}
          onClaim={claimQuest}
        />

        <QuestSection
          title="📖 ภารกิจหลัก"
          note="เนื้อเรื่องของการผจญภัย"
          views={main}
          onClaim={claimQuest}
        />

        <QuestSection
          title="✨ ภารกิจเสริม"
          note="ทำเมื่อไรก็ได้ ไม่มีกำหนดเวลา"
          views={side}
          onClaim={claimQuest}
        />
      </ScreenLayout>
    </>
  )
}

interface QuestSectionProps {
  title: string
  note: string
  views: QuestView[]
  onClaim: (questId: string) => void
}

function QuestSection({ title, note, views, onClaim }: QuestSectionProps) {
  if (views.length === 0) return null

  // ภารกิจที่รับรางวัลได้ขึ้นก่อน แล้วตามด้วยที่ยังทำอยู่ ส่วนที่รับแล้วไปท้ายสุด
  const sorted = [...views].sort((a, b) => {
    const rank = (view: QuestView) =>
      view.canClaim ? 0 : view.isClaimed ? 2 : 1
    return rank(a) - rank(b)
  })

  return (
    <section className="mt-8">
      <div className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h3 className="text-lg font-bold text-white">{title}</h3>
        <p className="text-sm text-slate-400">{note}</p>
      </div>

      <ul className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {sorted.map((view) => (
          <QuestCard key={view.quest.id} view={view} onClaim={onClaim} />
        ))}
      </ul>
    </section>
  )
}
