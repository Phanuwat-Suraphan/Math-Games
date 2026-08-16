import { useNavigate, useParams } from 'react-router-dom'
import { Button } from '../components/Button'
import { ScreenLayout } from '../components/ScreenLayout'
import { StageCard } from '../components/StageCard'
import { StagePathMap } from '../components/StagePathMap'
import { TopBar } from '../components/TopBar'
import { getStage, getStagesByWorld } from '../data/stages'
import { getWorld } from '../data/worlds'
import type { Player } from '../types/player'
import type { Stage } from '../types/stage'
import {
  getStageProgress,
  getStageStatus,
  getWorldLockState,
  getWorldProgress,
} from '../utils/stageSystem'
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

  const lock = getWorldLockState(player, world)

  if (!lock.isUnlocked) {
    return (
      <NotFoundNotice
        title={`🔒 ${world.name} ยังไม่เปิด`}
        message={lock.reason ?? 'ยังเข้าไม่ได้'}
        actionLabel="กลับไปแผนที่โลก"
        actionTo="/map"
        emoji={world.emoji}
      />
    )
  }

  const stages = getStagesByWorld(world.id)
  const progress = getWorldProgress(player, world.id)

  // จัดกลุ่มด่านตามภูมิภาค เพื่อให้แผนที่อ่านเป็นเส้นทางการเดินทาง
  const regions = world.regions
    .map((region) => ({
      region,
      stages: stages.filter((stage) => stage.regionId === region.id),
    }))
    .filter((group) => group.stages.length > 0)

  const startStage = (stage: Stage) =>
    navigate(`/quest/${stage.worldId}/${stage.id}`)

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
            className={`absolute inset-0 bg-gradient-to-br ${world.theme.background} opacity-70`}
          />
          <div className="relative flex items-start gap-4">
            <span aria-hidden="true" className="text-5xl">
              {world.emoji}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-200">
                โลกที่ {world.order} · {world.subtitle}
              </p>
              <h2 className="title-hero mt-1 text-2xl font-black sm:text-3xl">
                {world.name}
              </h2>
              <p className="mt-3 rounded-2xl bg-night-900/50 p-3 text-sm italic text-slate-200">
                “{world.story}”
              </p>

              {progress.hasContent ? (
                <div className="mt-4">
                  <div className="mb-1 flex flex-wrap items-center justify-between gap-2 text-sm text-slate-100">
                    <span>ความคืบหน้าในโลกนี้</span>
                    <span className="tabular-nums">
                      {progress.completedStages} / {progress.totalStages} ด่าน ·{' '}
                      <span className="text-gold-300">
                        ⭐ {progress.stars} / {progress.maxStars}
                      </span>
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

              {progress.isComplete ? (
                <p className="mt-4 rounded-2xl border border-gold-400/40 bg-gold-500/15 p-3 text-center font-bold text-gold-300">
                  🎉 WORLD COMPLETE! หนูพิชิต “{world.name}” แล้ว
                </p>
              ) : null}
            </div>
          </div>
        </section>

        {stages.length === 0 ? (
          <div className="surface-card mt-6 p-8 text-center">
            <p aria-hidden="true" className="text-5xl">
              🚧
            </p>
            <h3 className="mt-3 text-xl font-bold text-white">
              ด่านของโลกนี้กำลังสร้างอยู่
            </h3>
            <p className="mt-2 text-slate-300">
              ตอนนี้เปิดให้เล่นเฉพาะ “ป่าจำนวนมหัศจรรย์” ก่อนนะ
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
          <div className="mt-6 space-y-8">
            {/* แผนที่เส้นทางเป็นตัวนำทางหลัก การ์ดด้านล่างไว้ดูรายละเอียด */}
            <StagePathMap
              player={player}
              worldId={world.id}
              stages={regions.flatMap((group) => group.stages)}
              onSelect={startStage}
            />

            {regions.map((group) => (
              <section key={group.region.id}>
                <h3 className="mb-3 flex items-center gap-2 text-lg font-bold text-white">
                  <span aria-hidden="true">{group.region.emoji}</span>
                  {group.region.name}
                </h3>

                <ul className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  {group.stages.map((stage) => (
                    <li key={stage.id}>
                      <StageCard
                        stage={stage}
                        status={getStageStatus(player, stage)}
                        progress={getStageProgress(player, stage.id)}
                        previousStageName={
                          stage.requiredStageId
                            ? getStage(stage.requiredStageId)?.name
                            : undefined
                        }
                        onStart={startStage}
                      />
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </ScreenLayout>
    </>
  )
}
