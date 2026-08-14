import { useCallback, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Button } from '../components/Button'
import { GameIcon, WorldSceneArt } from '../components/art/GameArt'
import { ScreenLayout } from '../components/ScreenLayout'
import { TopBar } from '../components/TopBar'
import { useGame } from '../context/useGame'
import { getStage } from '../data/stages'
import { getWorld } from '../data/worlds'
import { generatePuzzle, PUZZLE_KINDS } from '../puzzles/generators'
import {
  assembledCode,
  createPuzzleProgress,
  fillSlot,
  puzzlePercent,
  puzzleReward,
  useHint,
} from '../puzzles/puzzleEngine'
import { resolveDifficulty, resolveGrade } from '../services/questionService'
import { playSfx } from '../services/audioService'
import { isStageUnlocked } from '../utils/stageSystem'
import type { PuzzleKind } from '../puzzles/types'
import type { Player } from '../types/player'
import type { Stage, StageResult } from '../types/stage'
import type { World } from '../types/world'
import { NotFoundNotice } from './NotFoundNotice'

/**
 * หน้าปริศนา
 *
 * ต่างจากหน้าตอบคำถามตรงที่มีเรื่องราวว่าทำไมต้องแก้
 * และคำตอบไม่ใช่จุดจบ แต่เป็นกุญแจไปเปิดประตู ซ่อมสะพาน หรือช่วยพ่อค้า
 */

export function PuzzleStage({ player }: { player: Player }) {
  const { worldId, stageId } = useParams<{ worldId: string; stageId: string }>()

  const stage = stageId ? getStage(stageId) : undefined
  const world = worldId ? getWorld(worldId) : undefined

  if (!stage || !world || stage.worldId !== world.id) {
    return (
      <NotFoundNotice
        title="ไม่พบด่านนี้"
        message="ด่านที่หนูเลือกอาจถูกย้ายไปแล้ว ลองเลือกด่านใหม่จากแผนที่นะ"
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

  return <PuzzleSession key={stage.id} player={player} stage={stage} world={world} />
}

function PuzzleSession({
  player,
  stage,
  world,
}: {
  player: Player
  stage: Stage
  world: World
}) {
  const navigate = useNavigate()
  const { finishStage, patchPlayer } = useGame()

  const [puzzle] = useState(() => {
    // ชนิดที่ด่านกำหนด ถ้าไม่มีหรือชื่อผิดก็ใช้ล็อกรหัสซึ่งเข้าใจง่ายที่สุด
    const kind = (
      PUZZLE_KINDS.includes(stage.puzzleKind as PuzzleKind)
        ? stage.puzzleKind
        : 'numberLock'
    ) as PuzzleKind

    return generatePuzzle({
      kind,
      difficulty: resolveDifficulty(stage),
      grade: resolveGrade(stage),
    })
  })

  const [progress, setProgress] = useState(() => createPuzzleProgress(puzzle))
  const [activeSlot, setActiveSlot] = useState(0)
  const [shake, setShake] = useState(false)
  const [hintFor, setHintFor] = useState<number | null>(null)
  const rewardDoneRef = useRef(false)

  const handleChoice = useCallback(
    (index: number, value: string) => {
      const outcome = fillSlot(puzzle, progress, index, value)
      if (!outcome) return

      setProgress(outcome.progress)

      if (outcome.correct) {
        playSfx('correct')
        setHintFor(null)
        // ขยับไปช่องถัดไปที่ยังว่างให้อัตโนมัติ เด็กจะได้ไม่ต้องหาเอง
        const next = outcome.progress.filled.findIndex((entry) => entry === null)
        setActiveSlot(next === -1 ? index : next)
        if (outcome.justSolved) playSfx('levelUp')
      } else {
        playSfx('wrong')
        setShake(true)
        window.setTimeout(() => setShake(false), 400)
      }
    },
    [progress, puzzle],
  )

  /** ปิดจบด่าน ส่งผลเข้าระบบความคืบหน้าของ Part 3 ตามเดิม */
  const finish = useCallback(() => {
    if (rewardDoneRef.current) return
    rewardDoneRef.current = true

    const reward = puzzleReward(progress)
    // ปริศนามีช่องน้อยกว่าจำนวนข้อของด่าน จึงนับว่าผ่านเต็มเมื่อแก้สำเร็จ
    const outcome = finishStage({
      stage,
      correctAnswers: stage.questionCount,
      totalQuestions: stage.questionCount,
      expFromAnswers: reward.exp,
      coinsFromAnswers: reward.coins,
    })

    // จ่ายรางวัลของปริศนาเพิ่มจากรางวัลด่าน
    patchPlayer({
      coins: player.coins + reward.coins,
    })

    if (!outcome) {
      navigate('/map', { replace: true })
      return
    }
    const result: StageResult = outcome.result
    navigate('/result', { replace: true, state: result })
  }, [finishStage, navigate, patchPlayer, player.coins, progress, stage])

  const percent = puzzlePercent(progress)
  const reward = puzzleReward(progress)

  return (
    <>
      <TopBar
        player={player}
        title={`${puzzle.emoji} ${puzzle.title}`}
        backTo={`/world/${world.id}`}
        backLabel="ออกจากปริศนา"
      />

      <ScreenLayout width="normal">
        {/* ฉากและเรื่องราว บอกว่าทำไมต้องแก้ปริศนานี้ */}
        <div className="relative overflow-hidden rounded-xl2 border border-white/10">
          <WorldSceneArt worldId={world.id} className="absolute inset-0 h-full w-full opacity-40" />
          <div aria-hidden="true" className="absolute inset-0 bg-night-900/75" />
          <div className="relative p-5">
            <p className="text-4xl">{puzzle.emoji}</p>
            <h2 className="mt-1 text-xl font-bold text-white">{puzzle.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-200">{puzzle.story}</p>
            <p className="mt-3 rounded-xl border border-gold-400/35 bg-gold-500/10 px-3 py-2 text-sm font-semibold text-gold-300">
              {puzzle.instruction}
            </p>
          </div>
        </div>

        {/* แถบความคืบหน้า */}
        <div className="mt-4">
          <div
            className="h-2 w-full overflow-hidden rounded-full bg-night-800"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percent}
            aria-label="ความคืบหน้าของปริศนา"
          >
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-gold-300 to-gold-500"
              animate={{ width: `${percent}%` }}
              transition={{ duration: 0.35 }}
            />
          </div>
        </div>

        {/* ช่องรหัสที่ประกอบได้ มีเฉพาะปริศนาที่มีหลายช่อง */}
        {puzzle.slots.length > 1 ? (
          <motion.p
            animate={shake ? { x: [0, -8, 8, -5, 0] } : { x: 0 }}
            transition={{ duration: 0.35 }}
            className="mt-4 rounded-2xl border border-white/15 bg-black/35 py-4 text-center text-3xl font-extrabold tracking-widest text-white"
            aria-label={`รหัสตอนนี้คือ ${assembledCode(progress)}`}
          >
            {assembledCode(progress)}
          </motion.p>
        ) : null}

        {progress.solved ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            role="status"
            className="mt-5 rounded-2xl border border-leaf-500/45 bg-leaf-600/20 p-6 text-center"
          >
            <GameIcon name="check" size="h-14 w-14" className="mx-auto" />
            <p className="mt-2 text-xl font-bold text-leaf-400">แก้ปริศนาสำเร็จ!</p>
            <p className="mt-2 text-sm leading-relaxed text-slate-100">
              {puzzle.successText}
            </p>
            <p className="mt-3 flex items-center justify-center gap-4 text-sm font-bold">
              <span className="flex items-center gap-1 text-arcane-400">
                <GameIcon name="exp" size="h-5 w-5" /> +{reward.exp}
              </span>
              <span className="flex items-center gap-1 text-gold-300">
                <GameIcon name="coin" size="h-5 w-5" /> +{reward.coins}
              </span>
            </p>
            {progress.mistakes > 0 ? (
              <p className="mt-2 text-xs text-slate-300">
                ลองผิดไป {progress.mistakes} ครั้ง — การลองผิดคือส่วนหนึ่งของการคิดนะ
              </p>
            ) : null}
            <Button className="mt-5" size="lg" variant="success" fullWidth onClick={finish} autoFocus>
              เดินทางต่อ
            </Button>
          </motion.div>
        ) : (
          <div className="mt-5 space-y-5">
            {puzzle.slots.map((slot, index) => {
              const done = progress.filled[index] !== null
              const isActive = index === activeSlot && !done

              return (
                <div
                  key={slot.id}
                  className={[
                    'rounded-2xl border p-4 transition-colors',
                    done
                      ? 'border-leaf-500/40 bg-leaf-600/12'
                      : isActive
                        ? 'border-gold-400/50 bg-night-800'
                        : 'border-white/10 bg-night-800/60',
                  ].join(' ')}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-lg font-bold text-white">
                      {puzzle.slots.length > 1 ? `ช่องที่ ${index + 1} — ` : ''}
                      {slot.clue}
                    </p>
                    {done ? <GameIcon name="check" size="h-6 w-6" /> : null}
                  </div>

                  {!done && slot.choices ? (
                    <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {slot.choices.map((choice) => (
                        <button
                          key={choice}
                          type="button"
                          onClick={() => handleChoice(index, choice)}
                          className="min-h-[56px] rounded-xl border-b-4 border-night-500 bg-night-700 px-3 py-3 text-xl font-bold text-white transition hover:bg-night-600 active:translate-y-0.5 active:border-b-2"
                        >
                          {choice}
                        </button>
                      ))}
                    </div>
                  ) : null}

                  {!done && slot.hint ? (
                    <div className="mt-3">
                      <AnimatePresence mode="wait">
                        {hintFor === index ? (
                          <motion.p
                            key="hint"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            role="status"
                            className="rounded-xl border border-sky-400/40 bg-sky-600/15 px-3 py-2 text-sm font-semibold text-sky-300"
                          >
                            💡 {slot.hint}
                          </motion.p>
                        ) : (
                          <button
                            key="ask"
                            type="button"
                            onClick={() => {
                              setHintFor(index)
                              setProgress(useHint(progress))
                            }}
                            className="rounded-xl border border-sky-400/40 bg-sky-600/10 px-4 py-2 text-sm font-bold text-sky-300 hover:bg-sky-600/20"
                          >
                            💡 ขอคำใบ้ (ไม่เสียคะแนน)
                          </button>
                        )}
                      </AnimatePresence>
                    </div>
                  ) : null}
                </div>
              )
            })}
          </div>
        )}
      </ScreenLayout>
    </>
  )
}
