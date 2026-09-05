import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Button } from '../components/Button'
import { GameIcon } from '../components/art/GameArt'
import { ScreenLayout } from '../components/ScreenLayout'
import { TopBar } from '../components/TopBar'
import { useGame } from '../context/useGame'
import { generateQuestion } from '../questionEngine'
import {
  advanceFloor,
  answerCorrect,
  answerWrong,
  buildFloor,
  offerBoons,
  payout,
  restHeal,
  startRun,
  takeBoon,
  useSkip,
} from '../roguelike/engine'
import { playSfx } from '../services/audioService'
import { applyBonusPercent, totalStats } from '../services/inventoryService'
import { recordTowerRun } from '../services/recordService'
import type { Floor, RunState } from '../roguelike/types'
import type { Question } from '../questionEngine/types'
import type { Player } from '../types/player'
import { useMusic } from '../hooks/useMusic'
import { questionIndicator } from '../teacher/indicators'
import { useIndicatorLog } from '../hooks/useIndicatorLog'

type Phase = 'intro' | 'floor' | 'boon' | 'over'

/**
 * หอคอยไม่รู้จบ — โหมดโร้คไลค์
 *
 * ด่านในแผนที่มีจำนวนจำกัด เด็กที่เล่นเก่งจะเล่นจบแล้วไม่มีอะไรทำต่อ
 * โหมดนี้ไม่มีวันจบ ยิ่งขึ้นสูงยิ่งยาก และแต่ละรอบสุ่มไม่เหมือนกัน
 *
 * รอบหนึ่งไม่ถูกบันทึกลงที่เก็บข้อมูล ตั้งใจให้เป็นแบบนั้นตามกติกาโร้คไลค์
 * ปิดแอปกลางรอบคือจบรอบ แต่สิ่งที่ติดมือกลับไปคือเหรียญกับสถิติทักษะ
 * ซึ่งบันทึกทันทีทุกข้อ ไม่รอจบรอบ
 */
export function Tower({ player }: { player: Player }) {
  /* หอคอยเป็นการไต่ขึ้นไปเรื่อย ๆ ใช้เพลงเดินทางที่สดใส */
  useMusic('adventure')

  const { answerQuestion, patchPlayer } = useGame()
  const { logIndicator } = useIndicatorLog(player.name)

  const [phase, setPhase] = useState<Phase>('intro')
  const [run, setRun] = useState<RunState>(() => startRun(`${Date.now()}`))
  const [floor, setFloor] = useState<Floor | null>(null)
  const [question, setQuestion] = useState<Question | null>(null)
  const [answered, setAnswered] = useState(0)
  const [picked, setPicked] = useState<string | null>(null)
  const [secondsLeft, setSecondsLeft] = useState(0)

  const runRef = useRef(run)
  runRef.current = run
  const paidRef = useRef(false)

  /** สร้างโจทย์ข้อถัดไปของชั้นนี้ */
  const nextQuestion = useCallback((current: RunState, data: Floor, index: number) => {
    setQuestion(
      generateQuestion({
        type: data.skill,
        grade: data.grade,
        difficulty: data.index <= 4 ? 'easy' : data.index <= 10 ? 'medium' : 'hard',
        seed: `${current.seed}-f${data.index}-q${index}`,
      }),
    )
    setPicked(null)
    setSecondsLeft(data.secondsPerQuestion)
  }, [])

  const enterFloor = useCallback(
    (current: RunState) => {
      const data = buildFloor(current, current.floor)
      setFloor(data)
      setAnswered(0)
      setPhase('floor')

      if (data.kind === 'rest') {
        setQuestion(null)
        return
      }
      nextQuestion(current, data, 0)
    },
    [nextQuestion],
  )

  /*
   * ตัวจับเวลา
   *
   * หมดเวลานับเป็นตอบผิด ไม่ใช่ข้ามไปเฉย ๆ
   * ถ้าหมดเวลาแล้วไม่เสียอะไร เด็กจะรอให้หมดเวลาแทนการคิด
   * ซึ่งทำให้ตัวจับเวลาไม่มีความหมาย
   */
  useEffect(() => {
    if (phase !== 'floor' || !question || picked !== null) return
    if (!floor || floor.secondsPerQuestion === 0) return
    if (secondsLeft <= 0) {
      setPicked('หมดเวลา')
      return
    }
    const timer = window.setTimeout(() => setSecondsLeft((s) => s - 1), 1000)
    return () => window.clearTimeout(timer)
  }, [floor, phase, picked, question, secondsLeft])

  /** บันทึกผลหนึ่งข้อเข้าสถิติทักษะชุดเดียวกับโหมดปกติ */
  const record = useCallback(
    (isCorrect: boolean, data: Floor) => {
      answerQuestion({
        questionId: `tower-${data.index}-${answered}`,
        stageId: `tower-floor-${data.index}`,
        skill: data.skill,
        isCorrect,
        timeMs: 0,
        isReplay: true,
      })

      /*
       * ส่งเข้าสมุดของครูด้วย บันทึกทุกครั้งที่ตอบ ไม่ใช่เฉพาะตอนตอบถูก
       * เพราะข้อที่ตอบผิดคือข้อมูลที่ครูต้องการที่สุด
       */
      const indicator = questionIndicator({ skill: data.skill, grade: data.grade })
      if (indicator) logIndicator(indicator, isCorrect)
    },
    [answered, answerQuestion, logIndicator],
  )

  const submit = useCallback(
    (choiceText: string) => {
      if (!floor || !question || picked !== null) return
      setPicked(choiceText)

      const isCorrect = choiceText === question.correctAnswer
      record(isCorrect, floor)
      playSfx(isCorrect ? 'correct' : 'wrong')

      const next = isCorrect
        ? answerCorrect(runRef.current, floor)
        : answerWrong(runRef.current)
      setRun(next)
    },
    [floor, picked, question, record],
  )

  /** ไปข้อถัดไป หรือจบชั้นแล้วไปเลือกพร */
  const proceed = useCallback(() => {
    if (!floor) return
    const current = runRef.current

    if (current.over) {
      setPhase('over')
      return
    }

    const done = answered + 1
    if (done < floor.questionCount) {
      setAnswered(done)
      nextQuestion(current, floor, done)
      return
    }

    setPhase('boon')
  }, [answered, floor, nextQuestion])

  const chooseBoon = useCallback(
    (boonId: string) => {
      const next = advanceFloor(takeBoon(runRef.current, boonId))
      setRun(next)
      enterFloor(next)
    },
    [enterFloor],
  )

  /*
   * จ่ายเหรียญตอนจบรอบ
   *
   * ทำใน effect ที่ผูกกับ phase ไม่ใช่ตอนกดปุ่ม
   * เพราะรอบจบได้จากหลายทาง (ตอบผิดจนหัวใจหมด หรือกดเลิกเอง)
   * ถ้าเขียนไว้ทุกทางจะมีทางใดทางหนึ่งลืม แล้วเด็กเสียเหรียญที่หามาได้
   * ใช้ ref กันจ่ายซ้ำตอน React เรนเดอร์ effect รอบสอง
   */
  useEffect(() => {
    if (phase !== 'over' || paidRef.current) return
    paidRef.current = true

    const gained = applyBonusPercent(
      payout(runRef.current),
      totalStats(player).coinBonusPercent,
    )
    patchPlayer({
      coins: player.coins + Math.max(0, gained),
      records: recordTowerRun(player, runRef.current.reachedFloor),
    })
  }, [patchPlayer, phase, player])

  const restart = useCallback(() => {
    paidRef.current = false
    const fresh = startRun(`${Date.now()}`)
    setRun(fresh)
    setPhase('intro')
    setFloor(null)
    setQuestion(null)
  }, [])

  return (
    <>
      <TopBar player={player} title="หอคอยไม่รู้จบ" backTo="/menu" backLabel="กลับเมนู" />

      <ScreenLayout width="normal">
        {phase === 'intro' && (
          <IntroPanel
            onStart={() => {
              paidRef.current = false
              const fresh = startRun(`${Date.now()}`)
              setRun(fresh)
              enterFloor(fresh)
            }}
          />
        )}

        {phase !== 'intro' && <StatusBar run={run} />}

        {phase === 'floor' && floor && (
          <div className="mt-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-bold text-white">{floor.title}</h2>
              {floor.secondsPerQuestion > 0 && question && (
                <span
                  className={`rounded-lg border px-3 py-1 text-sm font-bold tabular-nums ${
                    secondsLeft <= 3
                      ? 'border-rose-400 bg-rose-500/20 text-rose-200'
                      : 'border-white/15 bg-white/5 text-slate-200'
                  }`}
                >
                  {secondsLeft} วิ
                </span>
              )}
            </div>

            {floor.kind === 'rest' ? (
              <RestRoom
                onLeave={() => {
                  const healed = restHeal(runRef.current)
                  setRun(healed)
                  setPhase('boon')
                }}
              />
            ) : question ? (
              <QuestionPanel
                question={question}
                picked={picked}
                skipsLeft={run.boons.skipOne ?? 0}
                onPick={submit}
                onSkip={() => {
                  const next = useSkip(runRef.current)
                  if (!next) return
                  setRun(next)
                  setPicked('ข้ามข้อนี้')
                }}
                onNext={proceed}
              />
            ) : null}
          </div>
        )}

        {phase === 'boon' && (
          <BoonPanel run={run} onChoose={chooseBoon} />
        )}

        {phase === 'over' && (
          <OverPanel run={run} onRestart={restart} />
        )}
      </ScreenLayout>
    </>
  )
}

function IntroPanel({ onStart }: { onStart: () => void }) {
  return (
    <div className="rounded-xl2 border border-violet-400/30 bg-night-800/60 p-6 text-center">
      <h2 className="title-hero text-2xl font-black">หอคอยไม่รู้จบ</h2>
      <p className="mt-3 text-sm leading-relaxed text-slate-200">
        ปีนหอคอยให้สูงที่สุดเท่าที่จะทำได้ ทุกชั้นยากขึ้นเรื่อย ๆ
        และทุกรอบสุ่มไม่เหมือนกัน จำทางไม่ได้ ต้องคิดจริง
      </p>
      <ul className="mx-auto mt-4 max-w-sm space-y-1.5 text-left text-sm text-slate-300">
        <li>· มีหัวใจ 3 ดวง ตอบผิดเสียหนึ่งดวง</li>
        <li>· หัวใจหมดคือจบรอบ ต้องเริ่มจากชั้น 1 ใหม่</li>
        <li>· ผ่านชั้นแล้วได้เลือกพร 1 อย่างจาก 3 อย่าง</li>
        <li>· ทุก 5 ชั้นมีลานพักใจให้ฟื้นหัวใจ</li>
        <li>· ถึงแพ้ก็ยังได้เหรียญกลับบ้านครึ่งหนึ่ง</li>
      </ul>
      <Button size="lg" fullWidth className="mt-6" onClick={onStart}>
        เริ่มปีนหอคอย
      </Button>
    </div>
  )
}

function StatusBar({ run }: { run: RunState }) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl2 border border-white/10 bg-night-800/60 p-3">
      <span className="flex items-center gap-1">
        {Array.from({ length: run.maxHearts }).map((_, index) => (
          <GameIcon
            key={index}
            name="heart"
            className={index < run.hearts ? '' : 'opacity-20 grayscale'}
            size="h-6 w-6"
          />
        ))}
      </span>

      {run.shields > 0 && (
        <span className="flex items-center gap-1 rounded-lg border border-sky-400/40 bg-sky-500/10 px-2 py-1 text-xs font-bold text-sky-200">
          <GameIcon name="shield" size="h-4 w-4" /> ×{run.shields}
        </span>
      )}

      <span className="ml-auto flex items-center gap-1 text-sm font-bold text-gold-300">
        <GameIcon name="coin" size="h-4 w-4" />
        {run.coinsEarned}
      </span>
      {run.combo > 1 && (
        <span className="flex items-center gap-1 text-sm font-bold text-orange-300">
          <GameIcon name="flame" size="h-4 w-4" />
          {run.combo}
        </span>
      )}
    </div>
  )
}

function QuestionPanel({
  question,
  picked,
  skipsLeft,
  onPick,
  onSkip,
  onNext,
}: {
  question: Question
  picked: string | null
  skipsLeft: number
  onPick: (text: string) => void
  onSkip: () => void
  onNext: () => void
}) {
  const isCorrect = picked === question.correctAnswer

  return (
    <div className="mt-3">
      <div className="rounded-xl2 border border-white/10 bg-night-800/60 p-5 text-center">
        <p className="text-2xl font-black text-white sm:text-3xl">{question.prompt}</p>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2.5">
        {question.choices.map((choice) => {
          const chosen = picked === choice.text
          const right = choice.text === question.correctAnswer
          return (
            <button
              key={choice.id}
              type="button"
              disabled={picked !== null}
              onClick={() => onPick(choice.text)}
              className={`rounded-xl border px-4 py-4 text-lg font-bold transition ${
                picked === null
                  ? 'border-white/15 bg-white/5 text-white'
                  : right
                    ? 'border-emerald-400 bg-emerald-500/20 text-emerald-100'
                    : chosen
                      ? 'border-rose-400 bg-rose-500/20 text-rose-100'
                      : 'border-white/10 bg-white/5 text-slate-500'
              }`}
            >
              {choice.text}
            </button>
          )
        })}
      </div>

      {picked === null && skipsLeft > 0 && (
        <button
          type="button"
          onClick={onSkip}
          className="mt-3 w-full rounded-xl border border-dashed border-gold-400/40 px-4 py-2.5 text-sm font-bold text-gold-200"
        >
          ใช้ตั๋วข้ามข้อ (เหลือ {skipsLeft} ใบ)
        </button>
      )}

      <AnimatePresence>
        {picked !== null && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4"
          >
            <p
              className={`text-center text-sm font-bold ${
                isCorrect ? 'text-emerald-300' : 'text-rose-300'
              }`}
            >
              {picked === 'ข้ามข้อนี้'
                ? 'ข้ามข้อนี้ไปแล้ว'
                : isCorrect
                  ? 'ถูกต้อง!'
                  : `คำตอบคือ ${question.correctAnswer}`}
            </p>
            <p className="mt-1 text-center text-xs text-slate-400">
              {question.explanation}
            </p>
            <Button size="lg" fullWidth className="mt-3" onClick={onNext} autoFocus>
              ไปต่อ
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function RestRoom({ onLeave }: { onLeave: () => void }) {
  return (
    <div className="mt-3 rounded-xl2 border border-emerald-400/30 bg-emerald-500/10 p-6 text-center">
      <h3 className="text-lg font-bold text-emerald-100">ลานพักใจ</h3>
      <p className="mt-2 text-sm leading-relaxed text-slate-200">
        มีน้ำพุเล็ก ๆ อยู่กลางลาน นั่งพักสักครู่แล้วค่อยไปต่อ
        หัวใจจะฟื้นขึ้นมาบางส่วน
      </p>
      <Button size="lg" fullWidth className="mt-5" onClick={onLeave}>
        พักแล้วไปต่อ
      </Button>
    </div>
  )
}

function BoonPanel({ run, onChoose }: { run: RunState; onChoose: (id: string) => void }) {
  const offer = offerBoons(run)

  return (
    <div className="mt-4">
      <h2 className="text-center text-lg font-bold text-white">เลือกพร 1 อย่าง</h2>
      <p className="mt-1 text-center text-sm text-slate-300">
        การเลือกของหนูคือสิ่งที่ทำให้แต่ละรอบไม่เหมือนกัน
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {offer.map((boon) => (
          <button
            key={boon.id}
            type="button"
            onClick={() => onChoose(boon.id)}
            className="rounded-xl2 border border-violet-400/40 bg-night-800/60 p-4 text-left transition hover:border-gold-400"
          >
            <p className="font-bold text-gold-200">{boon.name}</p>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-300">
              {boon.description}
            </p>
            {run.boons[boon.id] ? (
              <p className="mt-2 text-xs text-slate-400">
                ถืออยู่แล้ว {run.boons[boon.id]} ชั้น
              </p>
            ) : null}
          </button>
        ))}
      </div>
    </div>
  )
}

function OverPanel({ run, onRestart }: { run: RunState; onRestart: () => void }) {
  const gained = payout(run)

  return (
    <div className="mt-4 rounded-xl2 border border-white/10 bg-night-800/60 p-6 text-center">
      <h2 className="title-gold text-2xl font-black">จบรอบที่ชั้น {run.reachedFloor}</h2>
      <p className="mt-2 text-sm text-slate-300">
        ไม่เป็นไร รอบหน้าขึ้นได้สูงกว่านี้แน่นอน
      </p>

      <dl className="mt-5 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
        <Stat label="ชั้นสูงสุด" value={`${run.reachedFloor}`} />
        <Stat label="ตอบถูก" value={`${run.correct}`} />
        <Stat label="คอมโบสูงสุด" value={`${run.bestCombo}`} />
        <Stat label="เหรียญที่ได้" value={`${gained}`} />
      </dl>

      <Button size="lg" fullWidth className="mt-6" onClick={onRestart}>
        ปีนใหม่อีกรอบ
      </Button>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/5 px-2 py-2">
      <dt className="text-[11px] text-slate-400">{label}</dt>
      <dd className="text-lg font-black text-white">{value}</dd>
    </div>
  )
}
