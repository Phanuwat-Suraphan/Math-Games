import { useCallback, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button } from '../components/Button'
import { MathQuestion, type AnswerState } from '../components/MathQuestion'
import { ScreenLayout } from '../components/ScreenLayout'
import { TopBar } from '../components/TopBar'
import { getStage } from '../data/stages'
import { getWorld } from '../data/worlds'
import { useGame } from '../context/useGame'
import type { Player } from '../types/player'
import type { Stage, StageResult } from '../types/stage'
import type { World } from '../types/world'
import { createStageSession } from '../services/questionService'
import { checkAnswer } from '../questionEngine'
import { getRequiredCorrectAnswers, isStageUnlocked } from '../utils/stageSystem'
import { playSfx } from '../services/audioService'
import { NotFoundNotice } from './NotFoundNotice'

/**
 * ตัวห่อสำหรับตรวจสอบ URL และการปลดล็อก
 * สำคัญ: ใส่ key เป็นรหัสด่าน เพื่อบังคับให้ React สร้าง component ใหม่ทุกครั้งที่เปลี่ยนด่าน
 * มิฉะนั้นการกด "ไปต่อ" จากหน้าผลลัพธ์จะทำให้คะแนนของด่านก่อนหน้าติดมาด้วย
 */
export function MathChallenge({ player }: { player: Player }) {
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

  return (
    <ChallengeSession key={stage.id} player={player} stage={stage} world={world} />
  )
}

interface ChallengeSessionProps {
  player: Player
  stage: Stage
  world: World
}

function ChallengeSession({ player, stage, world }: ChallengeSessionProps) {
  const navigate = useNavigate()
  const { answerQuestion, finishStage, isStageReplay } = useGame()

  // สร้างชุดโจทย์ครั้งเดียวตอน mount ชุดโจทย์จึงไม่สลับระหว่างเล่น
  // Question Engine ของ Part 4 สร้างโจทย์จาก questionTypes และ difficulty ของด่าน
  const [session] = useState(() => createStageSession(stage))
  const questions = session.questions
  // ตัดสินสถานะเล่นซ้ำตอนเริ่มด่าน เพื่อให้อัตรารางวัลคงที่ตลอดทั้งด่าน
  const [isReplay] = useState(() => isStageReplay(stage.id))

  const [questionIndex, setQuestionIndex] = useState(0)
  const [answerState, setAnswerState] = useState<AnswerState>('idle')
  const [wrongChoices, setWrongChoices] = useState<string[]>([])
  const [correctCount, setCorrectCount] = useState(0)
  const [attemptedWrong, setAttemptedWrong] = useState(false)
  const [hintShown, setHintShown] = useState(false)
  const [streakMessage, setStreakMessage] = useState<string | null>(null)
  const [lastGain, setLastGain] = useState<{ exp: number; coins: number } | null>(
    null,
  )

  // ยอดที่ได้รับจริงระหว่างเล่น เพื่อให้หน้าผลลัพธ์แสดงตัวเลขตรงกับที่ผู้เล่นได้จริง
  const earnedRef = useRef({ exp: 0, coins: 0 })
  // เวลาเริ่มตอบของข้อปัจจุบัน ใช้บันทึกเวลาที่ใช้ต่อข้อ
  const questionStartedAtRef = useRef(Date.now())

  const currentQuestion = questions[questionIndex]

  const handleAnswer = useCallback(
    (choice: string) => {
      if (!currentQuestion || answerState === 'correct') return

      const isCorrect = checkAnswer(currentQuestion, choice)
      const outcome = answerQuestion({
        questionId: currentQuestion.id,
        stageId: stage.id,
        skill: currentQuestion.skill,
        isCorrect,
        timeMs: Date.now() - questionStartedAtRef.current,
        isReplay,
      })

      if (isCorrect) {
        playSfx('correct')
        setAnswerState('correct')

        if (!attemptedWrong) {
          setCorrectCount((count) => count + 1)
        }

        if (outcome) {
          earnedRef.current = {
            exp: earnedRef.current.exp + outcome.gainedExp,
            coins: earnedRef.current.coins + outcome.gainedCoins,
          }
          setLastGain({ exp: outcome.gainedExp, coins: outcome.gainedCoins })
          setStreakMessage(outcome.streakBonus?.message ?? null)
        }

        playSfx('coin')
        return
      }

      playSfx('wrong')
      setAnswerState('wrong')
      setAttemptedWrong(true)
      setStreakMessage(null)
      setWrongChoices((current) =>
        current.includes(choice) ? current : [...current, choice],
      )
    },
    [
      answerQuestion,
      answerState,
      attemptedWrong,
      currentQuestion,
      isReplay,
      stage.id,
    ],
  )

  const handleNext = useCallback(() => {
    if (questionIndex < questions.length - 1) {
      setQuestionIndex((index) => index + 1)
      setAnswerState('idle')
      setWrongChoices([])
      setAttemptedWrong(false)
      // คำใบ้ต้องขอใหม่ทุกข้อ เด็กจึงได้คิดเองก่อนเสมอ
      setHintShown(false)
      setStreakMessage(null)
      setLastGain(null)
      questionStartedAtRef.current = Date.now()
      return
    }

    const outcome = finishStage({
      stage,
      correctAnswers: correctCount,
      totalQuestions: questions.length,
      expFromAnswers: earnedRef.current.exp,
      coinsFromAnswers: earnedRef.current.coins,
    })

    if (!outcome) {
      navigate('/map', { replace: true })
      return
    }

    const result: StageResult = outcome.result
    navigate('/result', { replace: true, state: result })
  }, [
    correctCount,
    finishStage,
    navigate,
    questionIndex,
    questions.length,
    stage,
  ])

  if (!currentQuestion) {
    return (
      <NotFoundNotice
        title="ยังไม่มีโจทย์ในด่านนี้"
        message="ระบบยังเตรียมโจทย์ไม่เสร็จ ลองเลือกด่านอื่นก่อนนะ"
        actionLabel={`กลับไป ${world.name}`}
        actionTo={`/world/${world.id}`}
      />
    )
  }

  const isLastQuestion = questionIndex >= questions.length - 1
  const progressPercent = Math.round((questionIndex / questions.length) * 100)
  const requiredCorrect = getRequiredCorrectAnswers(stage)

  return (
    <>
      <TopBar
        player={player}
        title={`${stage.emoji} ${stage.name}`}
        backTo={`/world/${world.id}`}
        backLabel="ออกจากด่าน"
        showStreak
      />

      <ScreenLayout width="normal">
        {isReplay ? (
          <p className="mb-4 rounded-2xl border border-sky-400/30 bg-sky-600/15 px-4 py-2.5 text-center text-sm font-semibold text-sky-400">
            🔁 กำลังฝึกซ้ำด่านนี้ — เก็บดาวเพิ่มได้ แต่รางวัลจะน้อยกว่าครั้งแรก
          </p>
        ) : null}

        <div
          className="mb-5 h-2 w-full overflow-hidden rounded-full bg-night-800"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={questions.length}
          aria-valuenow={questionIndex}
          aria-label={`ความคืบหน้าในด่าน ข้อที่ ${questionIndex + 1} จาก ${questions.length}`}
        >
          <div
            className="h-full rounded-full bg-gradient-to-r from-gold-300 to-gold-500 transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <MathQuestion
          question={currentQuestion}
          questionNumber={questionIndex + 1}
          totalQuestions={questions.length}
          answerState={answerState}
          wrongChoices={wrongChoices}
          hintShown={hintShown}
          onAnswer={handleAnswer}
          onRequestHint={() => setHintShown(true)}
        />

        {answerState === 'correct' ? (
          <div className="mt-5">
            {streakMessage ? (
              <p
                role="status"
                className="mb-3 rounded-2xl border border-ember-400/40 bg-ember-600/20 px-4 py-2 text-center text-sm font-bold text-ember-400"
              >
                🔥 {streakMessage}
              </p>
            ) : null}

            <p
              className="mb-3 text-center text-sm font-semibold text-slate-300"
              aria-live="polite"
            >
              ได้รับ{' '}
              <span className="text-arcane-400">+{lastGain?.exp ?? 0} EXP</span>{' '}
              และ{' '}
              <span className="text-gold-300">
                +{lastGain?.coins ?? 0} เหรียญ
              </span>
            </p>

            <Button
              size="lg"
              variant="success"
              fullWidth
              icon={isLastQuestion ? '🏁' : '➡️'}
              onClick={handleNext}
              autoFocus
            >
              {isLastQuestion ? 'จบด่าน ดูผลลัพธ์!' : 'ข้อถัดไป'}
            </Button>
          </div>
        ) : null}

        <p className="mt-6 text-center text-sm text-slate-400">
          ตอบถูกครั้งแรกแล้ว {correctCount} ข้อ · ผ่านด่านนี้ต้องได้{' '}
          {requiredCorrect} ข้อ
        </p>
      </ScreenLayout>
    </>
  )
}
