import { useCallback, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { BattleArena } from '../components/battle/BattleArena'
import { Button } from '../components/Button'
import { GameIcon } from '../components/art/GameArt'
import { MathQuestion, type AnswerState } from '../components/MathQuestion'
import { ScreenLayout } from '../components/ScreenLayout'
import { TopBar } from '../components/TopBar'
import { useGame } from '../context/useGame'
import { getStage } from '../data/stages'
import { getWorld } from '../data/worlds'
import { playSfx } from '../services/audioService'
import { startStageBattle, summarizeBattle } from '../services/battleService'
import {
  answerAndAttack,
  beginBattle,
  commitReward,
  continueAfterPhase,
  continueToNextQuestion,
  currentQuestion,
  isBattleOver,
  pauseBattle,
  restartBattle,
  resumeBattle,
} from '../battle/battleEngine'
import { isStageUnlocked } from '../utils/stageSystem'
import type { BattleState } from '../types/battle'
import type { Player } from '../types/player'
import type { Stage, StageResult } from '../types/stage'
import type { World } from '../types/world'
import { NotFoundNotice } from './NotFoundNotice'

/**
 * หน้าต่อสู้
 *
 * เครื่องยนต์ทั้งหมดอยู่ใน battle/battleEngine.ts ซึ่งเป็น pure function
 * หน้านี้มีหน้าที่แค่แสดงผลและส่งคำสั่งเข้าเครื่องยนต์
 * ทำให้ตรรกะการต่อสู้ทดสอบได้โดยไม่ต้องเปิดเบราว์เซอร์
 */

export function Battle({ player }: { player: Player }) {
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

  // key บังคับให้เริ่มการต่อสู้ใหม่ทุกครั้งที่เปลี่ยนด่าน
  return <BattleSession key={stage.id} player={player} stage={stage} world={world} />
}

interface BattleSessionProps {
  player: Player
  stage: Stage
  world: World
}

function BattleSession({ player, stage, world }: BattleSessionProps) {
  const navigate = useNavigate()
  const { answerQuestion, finishStage, isStageReplay } = useGame()

  const [state, setState] = useState<BattleState>(() =>
    startStageBattle({ player, stage }),
  )
  const [isReplay] = useState(() => isStageReplay(stage.id))

  const [answerState, setAnswerState] = useState<AnswerState>('idle')
  const [wrongChoices, setWrongChoices] = useState<string[]>([])
  const [hintShown, setHintShown] = useState(false)
  const [popup, setPopup] = useState<
    { text: string; tone: 'damage' | 'heal' | 'critical' } | null
  >(null)
  const [monsterHurt, setMonsterHurt] = useState(false)

  const earnedRef = useRef({ exp: 0, coins: 0 })
  const questionStartedAtRef = useRef(Date.now())
  // กันการจ่ายรางวัลซ้ำจากการกดปุ่มรัวหรือ re-render
  const rewardDoneRef = useRef(false)

  const question = currentQuestion(state)
  const summary = summarizeBattle(state)

  const start = useCallback(() => {
    setState((current) => beginBattle(current))
    questionStartedAtRef.current = Date.now()
  }, [])

  const handleAnswer = useCallback(
    (choice: string) => {
      if (!question || answerState === 'correct') return

      const outcome = answerAndAttack(state, {
        selectedAnswer: choice,
        timeSpent: Date.now() - questionStartedAtRef.current,
        usedHint: hintShown,
      })
      if (!outcome) return

      // บันทึกผลลงระบบสถิติและรางวัลของ Part 2 ไม่คำนวณรางวัลเอง
      const reward = answerQuestion({
        questionId: question.id,
        stageId: stage.id,
        skill: question.skill,
        isCorrect: outcome.correct,
        timeMs: Date.now() - questionStartedAtRef.current,
        isReplay,
      })

      if (reward) {
        earnedRef.current = {
          exp: earnedRef.current.exp + reward.gainedExp,
          coins: earnedRef.current.coins + reward.gainedCoins,
        }
      }

      setState(outcome.state)

      if (outcome.correct) {
        playSfx(outcome.playerDamage?.isCritical ? 'levelUp' : 'correct')
        setAnswerState('correct')
        setMonsterHurt(true)
        window.setTimeout(() => setMonsterHurt(false), 400)

        setPopup({
          text: outcome.healed > 0
            ? `+${outcome.healed} HP`
            : `-${outcome.playerDamage?.damage ?? 0}`,
          tone: outcome.playerDamage?.isCritical
            ? 'critical'
            : outcome.healed > 0
              ? 'heal'
              : 'damage',
        })
      } else {
        playSfx('wrong')
        setAnswerState('wrong')
        setWrongChoices((current) =>
          current.includes(choice) ? current : [...current, choice],
        )
        if (outcome.monsterDamage > 0) {
          setPopup({ text: `-${outcome.monsterDamage}`, tone: 'damage' })
        }
      }
    },
    [answerQuestion, answerState, hintShown, isReplay, question, stage.id, state],
  )

  const goNext = useCallback(() => {
    setState((current) =>
      current.status === 'phase_transition'
        ? continueAfterPhase(current)
        : continueToNextQuestion(current),
    )
    setAnswerState('idle')
    setWrongChoices([])
    setHintShown(false)
    setPopup(null)
    questionStartedAtRef.current = Date.now()
  }, [])

  /** จบการต่อสู้แล้วส่งผลเข้าระบบความคืบหน้าของ Part 3 */
  const finish = useCallback(() => {
    if (rewardDoneRef.current) return
    rewardDoneRef.current = true

    const committed = commitReward(state)
    if (committed) setState(committed)

    const outcome = finishStage({
      stage,
      correctAnswers: summary.correctAnswers,
      totalQuestions: summary.totalQuestions,
      expFromAnswers: earnedRef.current.exp,
      coinsFromAnswers: earnedRef.current.coins,
    })

    if (!outcome) {
      navigate('/map', { replace: true })
      return
    }

    const result: StageResult = outcome.result
    navigate('/result', { replace: true, state: result })
  }, [finishStage, navigate, stage, state, summary])

  const retry = useCallback(() => {
    rewardDoneRef.current = false
    earnedRef.current = { exp: 0, coins: 0 }
    const fresh = startStageBattle({ player, stage })
    setState(restartBattle(fresh, fresh.questions, player.maxHp))
    setAnswerState('idle')
    setWrongChoices([])
    setHintShown(false)
    setPopup(null)
  }, [player, stage])

  return (
    <>
      <TopBar
        player={player}
        title={`${stage.emoji} ${stage.name}`}
        backTo={`/world/${world.id}`}
        backLabel="ออกจากการต่อสู้"
        showStreak
      />

      <ScreenLayout width="normal">
        <BattleArena
          state={state}
          worldId={world.id}
          popup={popup}
          monsterHurt={monsterHurt}
        />

        {/* แถบคอมโบและความคืบหน้า */}
        <div className="mt-3 flex items-center justify-between text-sm font-bold">
          <span className="flex items-center gap-1 text-gold-300">
            {state.combo >= 2 ? (
              <>
                <GameIcon name="flame" size="h-5 w-5" />
                คอมโบ x{state.combo}
              </>
            ) : null}
          </span>
          <span className="text-slate-300">
            ข้อ {Math.min(state.questionIndex + 1, state.questions.length)} /{' '}
            {state.questions.length}
          </span>
        </div>

        {state.status === 'intro' ? (
          <div className="mt-6 text-center">
            <p className="mb-4 text-lg font-bold text-white">
              {state.monster.thaiName} ขวางทางอยู่!
            </p>
            <p className="mb-5 text-sm text-slate-300">
              แก้โจทย์ให้ถูกเพื่อสร้างพลังโจมตี ยิ่งตอบถูกติดกันยิ่งแรง
            </p>
            <Button size="lg" variant="success" fullWidth onClick={start} autoFocus>
              เริ่มต่อสู้!
            </Button>
          </div>
        ) : null}

        {state.status === 'phase_transition' ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            role="status"
            className="mt-6 rounded-2xl border border-gold-400/40 bg-gold-500/15 p-5 text-center"
          >
            <p className="text-xl font-bold text-gold-300">
              {state.log[state.log.length - 1]?.text ?? 'มอนสเตอร์เปลี่ยนท่าที!'}
            </p>
            <Button className="mt-4" size="lg" fullWidth onClick={goNext} autoFocus>
              สู้ต่อ!
            </Button>
          </motion.div>
        ) : null}

        {(state.status === 'question' || state.status === 'feedback') && question ? (
          <div className="mt-4">
            <MathQuestion
              question={question}
              questionNumber={state.questionIndex + (answerState === 'idle' ? 1 : 0)}
              totalQuestions={state.questions.length}
              answerState={answerState}
              wrongChoices={wrongChoices}
              hintShown={hintShown}
              onAnswer={handleAnswer}
              onRequestHint={() => setHintShown(true)}
            />

            {answerState !== 'idle' ? (
              <Button
                className="mt-4"
                size="lg"
                variant={answerState === 'correct' ? 'success' : 'primary'}
                fullWidth
                onClick={goNext}
                autoFocus
              >
                {answerState === 'correct' ? 'โจมตีต่อ!' : 'ลองข้อต่อไป'}
              </Button>
            ) : null}
          </div>
        ) : null}

        {isBattleOver(state) ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            role="status"
            className={`mt-6 rounded-2xl border p-6 text-center ${
              state.status === 'victory'
                ? 'border-leaf-500/40 bg-leaf-600/20'
                : 'border-sky-400/40 bg-sky-600/15'
            }`}
          >
            {state.status === 'victory' ? (
              <>
                <GameIcon name="trophy" size="h-14 w-14" className="mx-auto" />
                <p className="mt-2 text-2xl font-bold text-leaf-400">ชนะแล้ว!</p>
                <p className="mt-1 text-sm text-slate-200">
                  คณิตศาสตร์ของหนูเอาชนะ{state.monster.thaiName}ได้
                </p>
                <p className="mt-3 flex items-center justify-center gap-4 text-sm font-bold">
                  <span className="flex items-center gap-1 text-arcane-400">
                    <GameIcon name="exp" size="h-5 w-5" /> +{summary.monsterExp}
                  </span>
                  <span className="flex items-center gap-1 text-gold-300">
                    <GameIcon name="coin" size="h-5 w-5" /> +{summary.monsterCoins}
                  </span>
                </p>
                <Button className="mt-5" size="lg" variant="success" fullWidth onClick={finish} autoFocus>
                  รับรางวัล
                </Button>
              </>
            ) : (
              <>
                <p className="text-2xl font-bold text-sky-300">
                  ทุกการต่อสู้ทำให้เราเก่งขึ้น
                </p>
                <p className="mt-2 text-sm text-slate-200">
                  ลองดูวิธีคิดอีกครั้งแล้วมาสู้ใหม่นะ ไม่เสีย EXP ที่เก็บมาแล้วเลย
                </p>
                <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                  <Button size="lg" fullWidth onClick={retry} autoFocus>
                    สู้อีกครั้ง
                  </Button>
                  <Button
                    size="lg"
                    variant="ghost"
                    fullWidth
                    onClick={() => navigate(`/world/${world.id}`)}
                  >
                    กลับไปเลือกด่าน
                  </Button>
                </div>
              </>
            )}
          </motion.div>
        ) : null}

        {/* บันทึกการต่อสู้ ย่อไว้ไม่ให้บังโจทย์ */}
        {state.log.length > 1 && !isBattleOver(state) ? (
          <div className="mt-4 max-h-24 overflow-y-auto rounded-2xl border border-white/10 bg-black/25 p-3">
            {state.log
              .slice(-4)
              .reverse()
              .map((entry, index) => (
                <p
                  key={`${entry.text}-${index}`}
                  className={`py-0.5 text-xs ${
                    entry.tone === 'critical'
                      ? 'text-gold-300'
                      : entry.tone === 'player'
                        ? 'text-leaf-400'
                        : entry.tone === 'monster'
                          ? 'text-ember-400'
                          : 'text-slate-400'
                  }`}
                >
                  {entry.text}
                </p>
              ))}
          </div>
        ) : null}

        {/* ปุ่มหยุดชั่วคราว มีเฉพาะตอนกำลังสู้ */}
        {!isBattleOver(state) && state.status !== 'intro' ? (
          <div className="mt-4 flex justify-center">
            {state.status === 'paused' ? (
              <Button variant="ghost" onClick={() => setState(resumeBattle(state))}>
                เล่นต่อ
              </Button>
            ) : (
              <Button variant="ghost" onClick={() => setState(pauseBattle(state))}>
                หยุดพัก
              </Button>
            )}
          </div>
        ) : null}
      </ScreenLayout>
    </>
  )
}
