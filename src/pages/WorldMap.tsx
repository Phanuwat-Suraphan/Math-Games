import { useNavigate } from 'react-router-dom'
import { ScreenLayout } from '../components/ScreenLayout'
import { TopBar } from '../components/TopBar'
import { WorldCard } from '../components/WorldCard'
import { useProgression } from '../hooks/useProgression'
import type { Player } from '../types/player'

export function WorldMap({ player }: { player: Player }) {
  const navigate = useNavigate()
  const { worlds, overall } = useProgression(player)

  return (
    <>
      <TopBar
        player={player}
        title="แผนที่โลก"
        backTo="/menu"
        backLabel="เมนูหลัก"
      />

      <ScreenLayout width="wide">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white sm:text-3xl">
            เลือกโลกที่จะไปผจญภัย 🗺️
          </h2>
          <p className="mt-2 text-slate-300">
            พิชิตทุกด่านในโลกหนึ่ง เพื่อปลดล็อกโลกถัดไป
          </p>

          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <span className="stat-chip text-gold-300">
              <span aria-hidden="true">⭐</span> {overall.stars} /{' '}
              {overall.maxStars} ดาว
            </span>
            <span className="stat-chip text-leaf-400">
              <span aria-hidden="true">🏁</span> ผ่านแล้ว{' '}
              {overall.completedStages} / {overall.totalStages} ด่าน
            </span>
            <span className="stat-chip text-arcane-400">
              <span aria-hidden="true">🌍</span> เปิดแล้ว{' '}
              {overall.unlockedWorlds} / {overall.totalWorlds} โลก
            </span>
          </div>
        </div>

        {/* เส้นทางเชื่อมโลก ทำให้รู้สึกเป็นการเดินทาง ไม่ใช่แค่รายการการ์ด */}
        <ol className="relative mt-8 space-y-5">
          <div
            aria-hidden="true"
            className="absolute bottom-6 left-[15px] top-6 w-0.5 bg-gradient-to-b from-leaf-500/50 via-arcane-500/40 to-ember-500/40 md:left-1/2"
          />

          {worlds.map((summary) => (
            <li key={summary.world.id} className="relative pl-10 md:pl-0">
              <span
                aria-hidden="true"
                className={`absolute left-0 top-6 flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-bold md:left-1/2 md:-translate-x-1/2 ${
                  summary.lock.isUnlocked
                    ? 'border-gold-300 bg-night-800 text-gold-300'
                    : 'border-night-500 bg-night-900 text-slate-500'
                }`}
              >
                {summary.progress.isComplete ? '🏆' : summary.world.order}
              </span>

              <div
                className={`md:w-[calc(50%-2rem)] ${
                  summary.world.order % 2 === 1 ? 'md:mr-auto' : 'md:ml-auto'
                }`}
              >
                <WorldCard
                  summary={summary}
                  onSelect={(worldId) => navigate(`/world/${worldId}`)}
                />
              </div>
            </li>
          ))}
        </ol>
      </ScreenLayout>
    </>
  )
}
