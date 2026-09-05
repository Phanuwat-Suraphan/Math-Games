import { useCallback, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { WorldSceneArt } from '../components/art/GameArt'
import { CatchBoard } from '../components/minigames/CatchBoard'
import { ConnectBoard } from '../components/minigames/ConnectBoard'
import { DragDropBoard } from '../components/minigames/DragDropBoard'
import { MatchingBoard } from '../components/minigames/MatchingBoard'
import { PathBoard } from '../components/minigames/PathBoard'
import { ScreenLayout } from '../components/ScreenLayout'
import { TopBar } from '../components/TopBar'
import { useGame } from '../context/useGame'
import { getStage } from '../data/stages'
import { getWorld } from '../data/worlds'
import { MINIGAME_KINDS, MINIGAME_LABEL, generateMinigame } from '../minigames/generators'
import { playSfx } from '../services/audioService'
import { resolveGrade } from '../services/questionService'
import { isStageUnlocked } from '../utils/stageSystem'
import type { MinigameKind } from '../minigames/types'
import type { Player } from '../types/player'
import type { Stage, StageResult } from '../types/stage'
import type { World } from '../types/world'
import { NotFoundNotice } from './NotFoundNotice'
import { questionIndicator } from '../teacher/indicators'
import { useIndicatorLog } from '../hooks/useIndicatorLog'

/**
 * หน้ามินิเกม
 *
 * รวมสี่แบบที่ไม่ใช่การเลือกตอบไว้ในหน้าเดียว
 * เพราะทั้งสี่แบบใช้โครงเดียวกันหมด คือ ฉาก เรื่องราว กระดาน แล้วจบด่าน
 * ต่างกันแค่กระดานตรงกลาง จึงไม่ควรทำเป็นสี่หน้าที่ก๊อปโค้ดกัน
 */
export function MinigameStage({ player }: { player: Player }) {
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

  return <MinigameSession key={stage.id} player={player} stage={stage} world={world} />
}

function MinigameSession({
  player,
  stage,
  world,
}: {
  player: Player
  stage: Stage
  world: World
}) {
  const navigate = useNavigate()
  const { answerQuestion, finishStage, isStageReplay } = useGame()
  const { logIndicator } = useIndicatorLog(player.name)

  const [game] = useState(() => {
    const kind = (
      MINIGAME_KINDS.includes(stage.minigameKind as MinigameKind)
        ? stage.minigameKind
        : 'matching'
    ) as MinigameKind

    /*
     * ด่านเก็บทักษะไว้เป็นรายการ (questionTypes) ไม่ใช่ค่าเดียว
     * มินิเกมหนึ่งกระดานควรฝึกทักษะเดียวจึงจะเห็นภาพชัด
     * ถ้าคละหลายทักษะในกระดานเดียว เด็กจะจับคู่ข้ามชนิดจนงง
     * จึงหยิบทักษะแรกของด่านมาใช้ และเผื่อกรณีรายการว่างไว้ด้วย
     */
    const skill = stage.questionTypes[0] ?? 'addition'

    return generateMinigame({
      kind,
      seed: stage.id,
      grade: resolveGrade(stage),
      skill,
    })
  })

  const [correct, setCorrect] = useState(0)
  const [wrong, setWrong] = useState(0)
  const [isReplay] = useState(() => isStageReplay(stage.id))

  const finishedRef = useRef(false)
  const earnedRef = useRef({ exp: 0, coins: 0 })
  const countsRef = useRef({ correct: 0, wrong: 0 })
  const answerStartedAtRef = useRef(Date.now())
  const startedAtRef = useRef(Date.now())

  /**
   * ทุกครั้งที่ตัดสินถูกผิด ส่งเข้าระบบรางวัลและสถิติชุดเดียวกับการตอบคำถาม
   *
   * ห้ามจ่ายเหรียญเองด้วย patchPlayer เด็ดขาด
   * เพราะค่า player ที่ถืออยู่เป็นค่าตอน render จะเขียนทับเหรียญที่เพิ่งได้
   * ซึ่งเป็นบั๊กที่เคยเกิดมาแล้วในหน้าปริศนา
   */
  const handleAnswer = useCallback(
    (isCorrect: boolean) => {
      countsRef.current = {
        correct: countsRef.current.correct + (isCorrect ? 1 : 0),
        wrong: countsRef.current.wrong + (isCorrect ? 0 : 1),
      }
      setCorrect(countsRef.current.correct)
      setWrong(countsRef.current.wrong)

      const reward = answerQuestion({
        questionId: `${game.id}-${countsRef.current.correct + countsRef.current.wrong}`,
        stageId: stage.id,
        skill: game.skill,
        isCorrect,
        timeMs: Date.now() - answerStartedAtRef.current,
        isReplay,
      })
      if (reward) {
        earnedRef.current = {
          exp: earnedRef.current.exp + reward.gainedExp,
          coins: earnedRef.current.coins + reward.gainedCoins,
        }
      }
      /*
       * ส่งเข้าสมุดของครูด้วย บันทึกทุกครั้งที่ตอบ ไม่ใช่เฉพาะตอนตอบถูก
       *
       * โหมดนี้สร้างโจทย์ของตัวเอง ไม่ได้ผ่านเครื่องสร้างโจทย์กลาง
       * จึงไม่มีรูปทรงกับจำนวนขั้นตอนให้ส่งไป ปลายทางจะตอบว่าไม่นับ
       * สำหรับตัวชี้วัดที่ต้องรู้สองอย่างนั้น ซึ่งเป็นฝั่งที่ปลอดภัยของความไม่รู้
       */
      const indicator = questionIndicator({ skill: game.skill, grade: game.grade })
      if (indicator) logIndicator(indicator, isCorrect)

      answerStartedAtRef.current = Date.now()

      playSfx(isCorrect ? 'correct' : 'wrong')
    },
    [answerQuestion, game.grade, game.id, game.skill, isReplay, logIndicator, stage.id],
  )

  /** ปิดจบด่าน ส่งผลเข้าระบบความคืบหน้าชุดเดิม */
  const finish = useCallback(
    (cleared: boolean) => {
      if (finishedRef.current) return
      finishedRef.current = true

      if (cleared) playSfx('levelUp')

      /*
       * มินิเกมมีจำนวน "ข้อ" ไม่เท่ากับ questionCount ของด่าน
       * จึงเทียบเป็นสัดส่วน: ผ่านเกมคือได้เต็ม ไม่ผ่านคือได้ตามสัดส่วนที่ทำถูก
       * ถ้าส่งจำนวนจริงไปตรง ๆ ดาวจะเพี้ยนเพราะตัวหารคนละตัวกับด่านอื่น
       */
      const total = countsRef.current.correct + countsRef.current.wrong
      const ratio = total === 0 ? 0 : countsRef.current.correct / total
      const scored = cleared
        ? stage.questionCount
        : Math.round(stage.questionCount * ratio)

      const outcome = finishStage({
        stage,
        correctAnswers: scored,
        totalQuestions: stage.questionCount,
        expFromAnswers: earnedRef.current.exp,
        coinsFromAnswers: earnedRef.current.coins,
      })

      if (!outcome) {
        navigate('/map', { replace: true })
        return
      }
      const result: StageResult = outcome.result
      navigate('/result', { replace: true, state: result })
    },
    [finishStage, navigate, stage],
  )

  const secondsUsed = Math.round((Date.now() - startedAtRef.current) / 1000)

  return (
    <>
      <TopBar
        player={player}
        title={game.title}
        backTo={`/world/${world.id}`}
        backLabel="ออกจากเกม"
      />

      <ScreenLayout width="normal">
        {/* ฉากและเรื่องราว บอกว่าทำไมต้องเล่นเกมนี้ */}
        <div className="relative overflow-hidden rounded-xl2 border border-white/10">
          <WorldSceneArt
            worldId={world.id}
            className="absolute inset-0 h-full w-full opacity-40"
          />
          <div aria-hidden="true" className="absolute inset-0 bg-night-900/75" />
          <div className="relative p-5">
            <span className="rounded-full border border-violet-400/40 bg-violet-500/15 px-3 py-1 text-xs font-bold text-violet-200">
              {MINIGAME_LABEL[game.kind]}
            </span>
            <h2 className="mt-2 text-xl font-bold text-white">{game.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-200">{game.story}</p>
            <p className="mt-3 rounded-xl border border-gold-400/35 bg-gold-500/10 px-3 py-2 text-sm font-semibold text-gold-300">
              {game.instruction}
            </p>
          </div>
        </div>

        {/* กระดานของเกมแต่ละแบบ */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-5"
        >
          {game.kind === 'matching' && (
            <MatchingBoard
              game={game}
              onAnswer={handleAnswer}
              onSolved={() => finish(true)}
            />
          )}
          {game.kind === 'connect' && (
            <ConnectBoard
              game={game}
              onAnswer={handleAnswer}
              onSolved={() => finish(true)}
            />
          )}
          {game.kind === 'dragdrop' && (
            <DragDropBoard
              game={game}
              onAnswer={handleAnswer}
              onSolved={() => finish(true)}
            />
          )}
          {game.kind === 'catch' && (
            <CatchBoard game={game} onAnswer={handleAnswer} onFinished={finish} />
          )}
          {game.kind === 'path' && (
            <PathBoard
              game={game}
              onAnswer={handleAnswer}
              onSolved={() => finish(true)}
              onFailed={() => finish(false)}
            />
          )}
        </motion.div>

        <div className="mt-5 flex items-center justify-between text-sm text-slate-300">
          <span>
            ถูก {correct} · ผิด {wrong}
          </span>
          <span>ใช้เวลา {secondsUsed} วินาที</span>
        </div>
      </ScreenLayout>
    </>
  )
}
