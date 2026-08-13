import { useNavigate } from 'react-router-dom'
import { ScreenLayout } from '../components/ScreenLayout'
import { TopBar } from '../components/TopBar'
import { WorldCard } from '../components/WorldCard'
import { WORLDS } from '../data/worlds'
import type { Player } from '../types/player'
import { getWorldLockState, getWorldProgress } from '../utils/progression'

export function WorldMap({ player }: { player: Player }) {
  const navigate = useNavigate()

  return (
    <>
      <TopBar player={player} title="แผนที่โลก" backTo="/menu" backLabel="เมนูหลัก" />

      <ScreenLayout width="wide">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white sm:text-3xl">
            เลือกโลกที่จะไปผจญภัย 🗺️
          </h2>
          <p className="mt-2 text-slate-300">
            ผ่านทุกด่านในโลกหนึ่ง เพื่อปลดล็อกโลกถัดไป
          </p>
        </div>

        <ul className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          {WORLDS.map((world) => {
            const lockState = getWorldLockState(world, player.completedLevels)
            const progress = getWorldProgress(world.id, player.completedLevels)

            return (
              <li key={world.id}>
                <WorldCard
                  world={world}
                  isUnlocked={lockState.isUnlocked}
                  lockReason={lockState.reason}
                  progress={progress}
                  onSelect={(selected) => navigate(`/world/${selected.id}`)}
                />
              </li>
            )
          })}
        </ul>
      </ScreenLayout>
    </>
  )
}
