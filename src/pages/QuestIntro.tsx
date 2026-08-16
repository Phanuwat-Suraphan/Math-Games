import { useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate, useParams } from 'react-router-dom'
import { Button } from '../components/Button'
import { ScreenLayout } from '../components/ScreenLayout'
import { StarRow } from '../components/StarRow'
import { StoryBeatCard } from '../components/StoryBeatCard'
import { useGame } from '../context/useGame'
import { grantFlag, pendingBeat } from '../services/storyService'
import { getNpc } from '../data/npcs'
import { getStage } from '../data/stages'
import { getSkillMeta } from '../data/skills'
import { getWorld } from '../data/worlds'
import { stageRoute } from '../utils/stageRoute'
import type { Player } from '../types/player'
import {
  getRequiredCorrectAnswers,
  getStageProgress,
  isStageUnlocked,
} from '../utils/stageSystem'
import { NotFoundNotice } from './NotFoundNotice'

/** หน้าคั่นก่อนเริ่มด่าน ให้ NPC เล่าภารกิจสั้น ๆ เพื่อให้รู้สึกเป็นการผจญภัย */
export function QuestIntro({ player }: { player: Player }) {
  const navigate = useNavigate()
  const { worldId, stageId } = useParams<{ worldId: string; stageId: string }>()

  /*
   * hook ทุกตัวต้องถูกเรียกก่อน early return เสมอ
   * ถ้าวางไว้หลัง if ที่ return ออกไป จะมีรอบที่ React เห็น hook ไม่ครบ
   * แล้วพังทั้งหน้าด้วย "Rendered fewer hooks than expected"
   * ซึ่งเกิดตอนเด็กกดเข้าด่านที่ไม่มีอยู่ ซึ่งเป็นตอนที่ไม่ควรพังที่สุด
   */
  const { patchPlayer } = useGame()
  const [beatDone, setBeatDone] = useState(false)

  const stage = stageId ? getStage(stageId) : undefined
  const world = worldId ? getWorld(worldId) : undefined

  if (!stage || !world || stage.worldId !== world.id) {
    return (
      <NotFoundNotice
        title="ไม่พบภารกิจนี้"
        message="ด่านที่หนูเลือกอาจถูกย้ายไปแล้ว ลองเลือกใหม่จากแผนที่นะ"
        actionLabel="กลับไปแผนที่โลก"
        actionTo="/map"
      />
    )
  }

  if (!isStageUnlocked(player, stage)) {
    return (
      <NotFoundNotice
        title="ด่านนี้ยังไม่เปิด"
        message="ผ่านด่านก่อนหน้าเพื่อปลดล็อกด่านนี้ก่อนนะ"
        actionLabel={`กลับไป ${world.name}`}
        actionTo={`/world/${world.id}`}
        emoji="🔒"
      />
    )
  }

  const npc = getNpc(stage.npcId)
  const progress = getStageProgress(player, stage.id)

  /*
   * ตอนเปิดเรื่องของด่านนี้ ถ้ายังไม่เคยอ่าน
   *
   * อ่านจบแล้วบันทึกธงทันที ไม่รอให้ผ่านด่านก่อน
   * เพราะถ้ารอ เด็กที่อ่านแล้วออกไปทำอย่างอื่นจะต้องอ่านซ้ำตอนกลับมา
   */
  const beat = pendingBeat(player, stage.id, 'before')
  const finishBeat = () => {
    setBeatDone(true)
    if (beat?.grantsFlag) patchPlayer(grantFlag(player, beat.grantsFlag))
  }

  if (beat && !beatDone) {
    return (
      <ScreenLayout width="narrow" className="flex min-h-screen flex-col justify-center">
        <StoryBeatCard beat={beat} onFinish={finishBeat} />
      </ScreenLayout>
    )
  }
  const isReplay = progress.completed
  const reward = isReplay ? stage.replayReward : stage.firstClearReward

  return (
    <ScreenLayout
      width="narrow"
      className="flex min-h-screen flex-col justify-center"
    >
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="surface-card relative overflow-hidden p-6"
        aria-labelledby="quest-intro-title"
      >
        <div
          aria-hidden="true"
          className={`absolute inset-0 bg-gradient-to-br ${world.theme.background} opacity-60`}
        />

        <div className="relative">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-200">
            {world.emoji} {world.name} · ด่านที่ {stage.order}
          </p>
          <h1
            id="quest-intro-title"
            className="title-hero mt-1 text-2xl font-black sm:text-3xl"
          >
            {stage.emoji} {stage.name}
          </h1>
          <p className="mt-2 text-slate-200">{stage.description}</p>

          {/* กล่องบทสนทนาของ NPC */}
          {npc ? (
            <motion.div
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15, duration: 0.3 }}
              className="mt-5 flex gap-3 rounded-2xl border border-white/15 bg-night-900/70 p-4"
            >
              <span aria-hidden="true" className="text-4xl">
                {npc.avatar}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-gold-300">{npc.name}</p>
                <p className="text-xs text-slate-400">{npc.role}</p>
                <p className="mt-2 text-slate-100">
                  “{stage.questIntro ?? 'พร้อมออกเดินทางหรือยัง'}”
                </p>
              </div>
            </motion.div>
          ) : null}

          <dl className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-night-900/60 p-3 text-center">
              <dt className="text-xs text-slate-400">จำนวนข้อ</dt>
              <dd className="mt-1 text-xl font-bold tabular-nums text-white">
                {stage.questionCount}
              </dd>
            </div>
            <div className="rounded-2xl bg-night-900/60 p-3 text-center">
              <dt className="text-xs text-slate-400">ผ่านเมื่อตอบถูก</dt>
              <dd className="mt-1 text-xl font-bold tabular-nums text-leaf-400">
                {getRequiredCorrectAnswers(stage)} ข้อ
              </dd>
            </div>
            <div className="rounded-2xl bg-night-900/60 p-3 text-center">
              <dt className="text-xs text-slate-400">รางวัลเมื่อผ่าน</dt>
              <dd className="mt-1 text-sm font-bold text-arcane-400">
                ✨ {reward.exp} EXP
                <span className="text-gold-300"> · 🪙 {reward.coins}</span>
              </dd>
            </div>
            <div className="rounded-2xl bg-night-900/60 p-3 text-center">
              <dt className="text-xs text-slate-400">ดาวที่เก็บได้</dt>
              <dd className="mt-1 flex justify-center">
                <StarRow stars={progress.stars} />
              </dd>
            </div>
          </dl>

          <p className="mt-4 text-center text-sm text-slate-300">
            ฝึกเรื่อง:{' '}
            {stage.questionTypes
              .map((skill) => getSkillMeta(skill).name)
              .join(' · ')}
          </p>

          {isReplay ? (
            <p className="mt-3 rounded-2xl border border-sky-400/30 bg-sky-600/15 px-4 py-2.5 text-center text-sm font-semibold text-sky-400">
              🔁 ด่านนี้ผ่านแล้ว เล่นซ้ำได้เพื่อเก็บดาวเพิ่ม แต่รางวัลจะน้อยลง
            </p>
          ) : null}

          <div className="mt-6 space-y-3">
            <Button
              size="lg"
              fullWidth
              icon="⚔️"
              onClick={() => navigate(stageRoute(world.id, stage))}
              autoFocus
            >
              รับภารกิจ
            </Button>
            <Button
              size="lg"
              variant="ghost"
              fullWidth
              onClick={() => navigate(`/world/${world.id}`)}
            >
              ไว้ก่อน กลับไปเลือกด่าน
            </Button>
          </div>
        </div>
      </motion.section>
    </ScreenLayout>
  )
}
