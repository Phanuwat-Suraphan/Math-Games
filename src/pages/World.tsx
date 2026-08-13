import { useNavigate, useParams } from 'react-router-dom'
import { Button } from '../components/Button'
import { LevelCard } from '../components/LevelCard'
import { ScreenLayout } from '../components/ScreenLayout'
import { TopBar } from '../components/TopBar'
import { getLevelsByWorld } from '../data/levels'
import { getWorld } from '../data/worlds'
import type { Player } from '../types/player'
import {
  getWorldLockState,
  getWorldProgress,
  isLevelUnlocked,
} from '../utils/progression'
import { NotFoundNotice } from './NotFoundNotice'

export function World({ player }: { player: Player }) {
  const navigate = useNavigate()
  const { worldId } = useParams<{ worldId: string }>()

  const world = worldId ? getWorld(worldId) : undefined

  if (!world) {
    return (
      <NotFoundNotice
        title="ไม่พบโลกนี้"
        message="โลกที่หนูเลือกอาจถูกย้ายไปแล้ว ลองกลับไปที่แผนที่โลกอีกครั้งนะ"
        actionLabel="กลับไปแผนที่โลก"
        actionTo="/map"
      />
    )
  }

  const lockState = getWorldLockState(world, player.completedLevels)

  if (!lockState.isUnlocked) {
    return (
      <NotFoundNotice
        title="โลกนี้ยังถูกล็อกอยู่"
        message={`🔒 ${lockState.reason ?? 'ยังเข้าไม่ได้'}`}
        actionLabel="กลับไปแผนที่โลก"
        actionTo="/map"
      />
    )
  }

  const levels = getLevelsByWorld(world.id)
  const progress = getWorldProgress(world.id, player.completedLevels)

  return (
    <>
      <TopBar
        player={player}
        title={world.name}
        backTo="/map"
        backLabel="แผนที่โลก"
      />

      <ScreenLayout width="wide">
        <section className="surface-card relative overflow-hidden p-5 sm:p-6">
          <div
            aria-hidden="true"
            className={`absolute inset-0 bg-gradient-to-br ${world.theme.gradient} opacity-20`}
          />
          <div className="relative flex items-start gap-4">
            <span aria-hidden="true" className="text-5xl">
              {world.emoji}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                โลกที่ {world.order} · {world.topic}
              </p>
              <h2 className="mt-1 text-2xl font-bold text-white sm:text-3xl">
                {world.name}
              </h2>
              <p className="mt-2 text-sm text-slate-200">{world.description}</p>

              {progress.hasContent ? (
                <div className="mt-4">
                  <div className="mb-1 flex items-center justify-between text-sm text-slate-200">
                    <span>ความคืบหน้าในโลกนี้</span>
                    <span className="tabular-nums">
                      {progress.completedLevels} / {progress.totalLevels} ด่าน
                    </span>
                  </div>
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-night-900/70">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-leaf-400 to-leaf-600 transition-all duration-500"
                      style={{ width: `${progress.percent}%` }}
                    />
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </section>

        {levels.length === 0 ? (
          <div className="surface-card mt-6 p-8 text-center">
            <p aria-hidden="true" className="text-5xl">
              🚧
            </p>
            <h3 className="mt-3 text-xl font-bold text-white">
              ด่านของโลกนี้กำลังสร้างอยู่
            </h3>
            <p className="mt-2 text-slate-300">
              ตอนนี้เปิดให้เล่นเฉพาะ {`"ป่าจำนวนมหัศจรรย์"`} ก่อนนะ
            </p>
            <Button
              className="mt-5"
              size="lg"
              icon="🗺️"
              onClick={() => navigate('/map')}
            >
              กลับไปแผนที่โลก
            </Button>
          </div>
        ) : (
          <ul className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
            {levels.map((level) => (
              <li key={level.id}>
                <LevelCard
                  level={level}
                  isUnlocked={isLevelUnlocked(level.id, player.completedLevels)}
                  isCompleted={player.completedLevels.includes(level.id)}
                  onStart={(selected) =>
                    navigate(`/play/${selected.worldId}/${selected.id}`)
                  }
                />
              </li>
            ))}
          </ul>
        )}
      </ScreenLayout>
    </>
  )
}
