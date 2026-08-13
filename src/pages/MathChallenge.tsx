import { useCallback, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button } from '../components/Button'
import { MathQuestion, type AnswerState } from '../components/MathQuestion'
import { ScreenLayout } from '../components/ScreenLayout'
import { TopBar } from '../components/TopBar'
import { getLevel } from '../data/levels'
import { getWorld } from '../data/worlds'
import { useGame } from '../context/useGame'
import type { Player } from '../types/player'
import type { Level, LevelResult } from '../types/level'
import type { World } from '../types/world'
import { getQuestionsForLevel } from '../utils/questionGenerator'
import { isLevelUnlocked } from '../utils/progression'
import { playSfx } from '../utils/sfx'
import { NotFoundNotice } from './NotFoundNotice'

/**
 * ตัวห่อสำหรับตรวจสอบ URL และการปลดล็อก
 * สำคัญ: ใส่ key เป็นรหัสด่าน เพื่อบังคับให้ React สร้าง component ใหม่ทุกครั้งที่เปลี่ยนด่าน
 * มิฉะนั้นการกด "ไปต่อ" จากหน้ารางวัลจะทำให้คะแนนและข้อที่ค้างอยู่ของด่านก่อนหน้าติดมาด้วย
 */
export function MathChallenge({ player }: { player: Player }) {
  const { worldId, levelId } = useParams<{ worldId: string; levelId: string }>()

  const level = levelId ? getLevel(levelId) : undefined
  const world = worldId ? getWorld(worldId) : undefined

  if (!level || !world || level.worldId !== world.id) {
    return (
      <NotFoundNotice
        title="ไม่พบด่านนี้"
        message="ด่านที่หนูเลือกอาจถูกย้ายไปแล้ว ลองเลือกด่านใหม่จากแผนที่นะ"
        actionLabel="กลับไปแผนที่โลก"
        actionTo="/map"
      />
    )
  }

  if (!isLevelUnlocked(level.id, player.completedLevels)) {
    return (
      <NotFoundNotice
        title="ด่านนี้ยังไม่เปิด"
        message={`🔒 ต้องผ่านด่านที่ ${level.order - 1} ของ ${world.name} ก่อนนะ`}
        actionLabel={`กลับไป ${world.name}`}
        actionTo={`/world/${world.id}`}
      />
    )
  }

  return (
    <ChallengeSession key={level.id} player={player} level={level} world={world} />
  )
}

interface ChallengeSessionProps {
  player: Player
  level: Level
  world: World
}

function ChallengeSession({ player, level, world }: ChallengeSessionProps) {
  const navigate = useNavigate()
  const { rewardCorrectAnswer, completeLevel } = useGame()

  // สร้างชุดโจทย์ครั้งเดียวตอน mount ชุดโจทย์จึงไม่สลับระหว่างเล่น
  const [questions] = useState(() => getQuestionsForLevel(level))

  const [questionIndex, setQuestionIndex] = useState(0)
  const [answerState, setAnswerState] = useState<AnswerState>('idle')
  const [wrongChoices, setWrongChoices] = useState<number[]>([])
  const [correctCount, setCorrectCount] = useState(0)
  const [attemptedWrong, setAttemptedWrong] = useState(false)

  // เก็บยอดที่ได้รับจริงระหว่างเล่น เพื่อให้หน้ารางวัลแสดงตัวเลขตรงกับที่ผู้เล่นได้จริง
  const earnedRef = useRef({ exp: 0, coins: 0 })

  const currentQuestion = questions[questionIndex]

  const handleAnswer = useCallback(
    (choice: number) => {
      if (!currentQuestion || answerState === 'correct') return

      if (choice === currentQuestion.answer) {
        playSfx('correct')
        setAnswerState('correct')

        if (!attemptedWrong) {
          setCorrectCount((count) => count + 1)
        }

        const outcome = rewardCorrectAnswer()
        earnedRef.current = {
          exp: earnedRef.current.exp + outcome.gainedExp,
          coins: earnedRef.current.coins + outcome.gainedCoins,
        }
        playSfx('coin')
        return
      }

      playSfx('wrong')
      setAnswerState('wrong')
      setAttemptedWrong(true)
      setWrongChoices((current) =>
        current.includes(choice) ? current : [...current, choice],
      )
    },
    [answerState, attemptedWrong, currentQuestion, rewardCorrectAnswer],
  )

  const handleNext = useCallback(() => {
    if (questionIndex < questions.length - 1) {
      setQuestionIndex((index) => index + 1)
      setAnswerState('idle')
      setWrongChoices([])
      setAttemptedWrong(false)
      return
    }

    const result: LevelResult = completeLevel(level, {
      correctAnswers: correctCount,
      totalQuestions: questions.length,
      expFromAnswers: earnedRef.current.exp,
      coinsFromAnswers: earnedRef.current.coins,
    })
    navigate('/reward', { replace: true, state: result })
  }, [
    completeLevel,
    correctCount,
    level,
    navigate,
    questionIndex,
    questions.length,
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

  return (
    <>
      <TopBar
        player={player}
        title={`${level.emoji} ${level.name}`}
        backTo={`/world/${world.id}`}
        backLabel="ออกจากด่าน"
      />

      <ScreenLayout width="normal">
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
          onAnswer={handleAnswer}
        />

        {answerState === 'correct' ? (
          <div className="mt-5">
            <p
              className="mb-3 text-center text-sm font-semibold text-slate-300"
              aria-live="polite"
            >
              ได้รับ <span className="text-arcane-400">+10 EXP</span> และ{' '}
              <span className="text-gold-300">+5 เหรียญ</span>
            </p>
            <Button
              size="lg"
              variant="success"
              fullWidth
              icon={isLastQuestion ? '🏁' : '➡️'}
              onClick={handleNext}
              autoFocus
            >
              {isLastQuestion ? 'จบด่าน รับรางวัล!' : 'ข้อถัดไป'}
            </Button>
          </div>
        ) : null}

        <p className="mt-6 text-center text-sm text-slate-400">
          ตอบถูกครั้งแรกแล้ว {correctCount} ข้อ · ตอบผิดได้ ไม่เสียพลังชีวิตนะ
        </p>
      </ScreenLayout>
    </>
  )
}
