import { useNavigate } from 'react-router-dom'
import { Button } from '../components/Button'
import { ScreenLayout } from '../components/ScreenLayout'
import { TopBar } from '../components/TopBar'
import { LEVELS } from '../data/levels'
import { getWorld } from '../data/worlds'
import type { Player } from '../types/player'
import { isLevelUnlocked } from '../utils/progression'

export function Quests({ player }: { player: Player }) {
  const navigate = useNavigate()

  // ภารกิจถัดไป = ด่านแรกที่ปลดล็อกแล้วแต่ยังไม่ผ่าน
  const nextLevel = LEVELS.filter(
    (level) =>
      isLevelUnlocked(level.id, player.completedLevels) &&
      !player.completedLevels.includes(level.id),
  ).sort((a, b) => a.order - b.order)[0]

  const completed = LEVELS.filter((level) =>
    player.completedLevels.includes(level.id),
  )

  return (
    <>
      <TopBar player={player} title="ภารกิจ" backTo="/menu" backLabel="เมนูหลัก" />

      <ScreenLayout width="normal">
        <h2 className="text-2xl font-bold text-white">📜 ภารกิจของหนู</h2>

        <section className="surface-card mt-4 p-5">
          <h3 className="text-lg font-bold text-gold-300">ภารกิจปัจจุบัน</h3>

          {nextLevel ? (
            <div className="mt-3">
              <p className="text-xl font-bold text-white">
                {nextLevel.emoji} {nextLevel.name}
              </p>
              <p className="mt-1 text-sm text-slate-300">
                {nextLevel.description}
              </p>
              <p className="mt-2 text-sm text-slate-400">
                สถานที่: {getWorld(nextLevel.worldId)?.name ?? 'ไม่ทราบ'} · รางวัล
                ✨ {nextLevel.reward.exp} EXP · 🪙 {nextLevel.reward.coins}
              </p>
              <Button
                className="mt-4"
                size="lg"
                fullWidth
                icon="▶️"
                onClick={() =>
                  navigate(`/play/${nextLevel.worldId}/${nextLevel.id}`)
                }
              >
                เริ่มภารกิจนี้
              </Button>
            </div>
          ) : (
            <div className="mt-3 text-center">
              <p aria-hidden="true" className="text-4xl">
                🎊
              </p>
              <p className="mt-2 font-bold text-white">
                ผ่านทุกภารกิจที่เปิดให้เล่นแล้ว!
              </p>
              <p className="mt-1 text-sm text-slate-300">
                ภารกิจใหม่จะเปิดเพิ่มในตอนต่อไป
              </p>
            </div>
          )}
        </section>

        <section className="mt-5">
          <h3 className="text-lg font-bold text-white">
            ภารกิจที่สำเร็จแล้ว ({completed.length})
          </h3>

          {completed.length === 0 ? (
            <p className="surface-card mt-3 p-5 text-center text-slate-300">
              ยังไม่มีภารกิจที่สำเร็จ ลองไปที่แผนที่โลกเพื่อเริ่มด่านแรกกันนะ
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {completed.map((level) => (
                <li
                  key={level.id}
                  className="surface-card flex items-center gap-3 p-4"
                >
                  <span aria-hidden="true" className="text-2xl">
                    {level.emoji}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold text-white">
                      {level.name}
                    </span>
                    <span className="block text-sm text-slate-400">
                      {getWorld(level.worldId)?.name ?? ''}
                    </span>
                  </span>
                  <span className="rounded-full bg-leaf-600/25 px-3 py-1 text-sm font-bold text-leaf-400">
                    ✅ สำเร็จ
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </ScreenLayout>
    </>
  )
}
