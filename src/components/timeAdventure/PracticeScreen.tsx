import { useState } from 'react'
import type { CSSProperties } from 'react'
import { Button } from '../Button'
import { playSfx } from '../../services/audioService'
import { DECK_INFO } from '../../timeAdventure/cards'
import type { TimeCard } from '../../timeAdventure/cards'
import { isCorrect } from '../../timeAdventure/engine'
import type { Answer } from '../../timeAdventure/engine'
import { PRACTICE_LEVELS, PRACTICE_RETRY_LIMIT, buildPracticeSet } from '../../timeAdventure/practice'
import type { PracticeLevel } from '../../timeAdventure/practice'
import { CHEER, COMFORT, ClockSetter, Hero, LETTERS, Visual, emphasize, pick } from './CardParts'

/**
 * โหมดฝึกอ่านนาฬิกา: รอบละ 10 ข้อ สุ่มเวลาใหม่ทุกข้อ
 *
 * ต่างจากเกมกระดานตรงที่ไม่มีดวง ไม่มีการ์ดพิเศษ และเล่นคนเดียว
 * ข้อที่ผิดจะวนกลับมาให้ตอบใหม่ท้ายรอบ เพราะการได้ลองอีกครั้งหลังเห็นเฉลย
 * คือจังหวะที่เด็กจำวิธีอ่านได้จริง ไม่ใช่ตอนที่เห็นเฉลยแล้วผ่านไปเลย
 *
 * การจ่ายเหรียญและการส่งผลให้ครูทำที่หน้าหลัก ไม่ใช่ที่นี่
 * เพราะสมุดตัวชี้วัดต้องมีสำเนาเดียวทั้งหน้า ถ้าต่างคนต่างถือ
 * ฝั่งหนึ่งจะเขียนทับผลที่อีกฝั่งเพิ่งบันทึกไป
 */

interface Props {
  playerName: string
  /** บันทึกผลหนึ่งข้อให้แผงคุณครู เรียกเฉพาะรอบแรก ไม่เรียกในรอบแก้ตัว */
  onAnswer: (correct: boolean) => void
  /** จบรอบ: หน้าหลักจ่ายเหรียญแล้วคืนจำนวนที่ได้ */
  onFinish: (firstTryCorrect: number, total: number) => number
  /** กำลังฝึกอยู่หรือไม่ หน้าหลักใช้ซ่อนแถบเลือกโหมดระหว่างฝึก */
  onPlayingChange: (playing: boolean) => void
}

interface Round {
  level: PracticeLevel
  questions: TimeCard[]
  index: number
  /** ผลรอบแรกของแต่ละข้อ ตามลำดับ */
  results: boolean[]
  /** ข้อที่ผิด รอตอบใหม่ท้ายรอบ */
  retry: TimeCard[]
  retrying: boolean
  retryIndex: number
  retryResults: boolean[]
}

type Phase = { kind: 'choose' } | { kind: 'play'; round: Round } | { kind: 'done'; round: Round; reward: number }

const TIME_COLORS = { '--c': DECK_INFO.time.color, '--bg': DECK_INFO.time.bg } as CSSProperties

export function PracticeScreen({ playerName, onAnswer, onFinish, onPlayingChange }: Props) {
  const [phase, setPhase] = useState<Phase>({ kind: 'choose' })
  const [level, setLevel] = useState<PracticeLevel>('half')
  const [set, setSet] = useState<[number, number]>([12, 0])
  const [result, setResult] = useState<{ correct: boolean; picked: number | null; line: string } | null>(null)

  const begin = (chosen: PracticeLevel) => {
    const questions = buildPracticeSet(chosen, Math.random)
    playSfx('click')
    setLevel(chosen)
    setResult(null)
    setSet(questions[0].kind === 'set' ? [...questions[0].start] : [12, 0])
    setPhase({ kind: 'play', round: { level: chosen, questions, index: 0, results: [], retry: [], retrying: false, retryIndex: 0, retryResults: [] } })
    onPlayingChange(true)
  }

  if (phase.kind === 'choose') {
    return (
      <div className="panel panel-hero panel-corners p-6">
        <div className="flex justify-center" aria-hidden="true">
          <Hero hero="wizard" className="w-20" />
        </div>
        <h2 className="title-gold mt-1 text-center text-2xl font-black">ฝึกอ่านนาฬิกา</h2>
        <p className="mt-1 text-center text-sm leading-relaxed text-slate-300">
          รอบละ 10 ข้อ สุ่มเวลาใหม่ทุกครั้ง มีทั้งอ่านหน้าปัด หมุนเข็ม และเขียนเวลาเป็นตัวเลข
          <br />
          ข้อที่ผิดจะกลับมาให้ลองใหม่ท้ายรอบ
        </p>
        <fieldset className="mt-5">
          <legend className="mb-2 text-sm font-bold text-white">เลือกระดับ</legend>
          <div className="grid gap-2 sm:grid-cols-3">
            {(Object.keys(PRACTICE_LEVELS) as PracticeLevel[]).map((key) => (
              <button
                key={key}
                type="button"
                aria-pressed={level === key}
                onClick={() => setLevel(key)}
                className={`rounded-xl border p-3 text-left transition ${
                  level === key ? 'border-gold-300 bg-gold-500/15' : 'border-white/15 bg-white/5 hover:border-white/30'
                }`}
              >
                <span className="block font-bold text-white">{PRACTICE_LEVELS[key].name}</span>
                <span className="mt-0.5 block text-xs leading-relaxed text-slate-300">{PRACTICE_LEVELS[key].hint}</span>
              </button>
            ))}
          </div>
        </fieldset>
        <ul className="mt-5 space-y-1.5 text-sm text-slate-300">
          <li>· ถูกข้อละ 🪙 1 เหรียญ ถูกหมดทั้งรอบได้โบนัส</li>
          <li>· ผลของ {playerName} ส่งให้แผงคุณครูในตัวชี้วัด "เวลา (ป.2)"</li>
        </ul>
        <Button size="lg" fullWidth className="mt-6" onClick={() => begin(level)}>
          ⏱️ เริ่มฝึก
        </Button>
      </div>
    )
  }

  if (phase.kind === 'done') {
    const { round, reward } = phase
    const correct = round.results.filter(Boolean).length
    const total = round.results.length
    const stars = correct === total ? 3 : correct >= 8 ? 2 : correct >= 5 ? 1 : 0
    const missed = round.questions.filter((_, i) => !round.results[i])
    return (
      <div className="ta-card ta-cute ta-card-pop mx-auto" style={TIME_COLORS}>
        <div className="ta-card-head">
          <span>⏱️ จบรอบฝึก · {PRACTICE_LEVELS[round.level].name}</span>
          <span className="text-[#FFE27A]">{'★'.repeat(stars)}{'☆'.repeat(3 - stars)}</span>
        </div>
        <div className="grid gap-3 px-5 pb-5 pt-1 text-center">
          <Hero hero={stars >= 2 ? 'fairy' : 'wizard'} className="mx-auto w-24" />
          <p className="text-2xl font-bold">
            ถูก {correct} จาก {total} ข้อ
          </p>
          <p className="rounded-2xl bg-white px-3 py-2 font-bold text-amber-700">ได้ 🪙 {reward} เหรียญเข้ากระเป๋า</p>
          {missed.length ? (
            <div className="grid gap-1.5 text-left">
              <p className="text-center font-bold">🔁 ข้อที่ควรจำไว้</p>
              {missed.map((card) => (
                <p key={card.id} className="rounded-2xl bg-white px-3 py-2 text-sm leading-snug">
                  <b>{card.answerText}</b>
                  <span className="text-slate-500"> · {card.why}</span>
                </p>
              ))}
            </div>
          ) : (
            <p className="font-bold text-green-700">ถูกทุกข้อตั้งแต่รอบแรก เก่งมาก! 🎉</p>
          )}
          <div className="flex flex-wrap justify-center gap-3">
            <Button
              variant="secondary"
              onClick={() => {
                setPhase({ kind: 'choose' })
                onPlayingChange(false)
              }}
            >
              เปลี่ยนระดับ
            </Button>
            <Button onClick={() => begin(round.level)}>🔁 ฝึกอีกรอบ</Button>
          </div>
        </div>
      </div>
    )
  }

  const { round } = phase
  const card = round.retrying ? round.retry[round.retryIndex] : round.questions[round.index]
  const done = result !== null
  const answeredCount = round.results.length

  const answer = (value: Answer, picked: number | null) => {
    if (done) return
    const correct = isCorrect(card, value)
    playSfx(correct ? 'correct' : 'wrong')
    setResult({ correct, picked, line: pick(correct ? CHEER : COMFORT) })
    if (round.retrying) {
      setPhase({ kind: 'play', round: { ...round, retryResults: [...round.retryResults, correct] } })
      return
    }
    onAnswer(correct)
    const retry = !correct && round.retry.length < PRACTICE_RETRY_LIMIT ? [...round.retry, card] : round.retry
    setPhase({ kind: 'play', round: { ...round, results: [...round.results, correct], retry } })
  }

  const next = () => {
    const nextRound: Round = round.retrying
      ? { ...round, retryIndex: round.retryIndex + 1 }
      : round.index + 1 < round.questions.length
        ? { ...round, index: round.index + 1 }
        : { ...round, retrying: true, retryIndex: 0 }
    const upcoming = nextRound.retrying ? nextRound.retry[nextRound.retryIndex] : nextRound.questions[nextRound.index]
    setResult(null)
    if (!upcoming) {
      const correct = nextRound.results.filter(Boolean).length
      const reward = onFinish(correct, nextRound.results.length)
      playSfx(correct === nextRound.results.length ? 'victory' : 'coin')
      setPhase({ kind: 'done', round: nextRound, reward })
      return
    }
    setSet(upcoming.kind === 'set' ? [...upcoming.start] : [12, 0])
    setPhase({ kind: 'play', round: nextRound })
  }

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-bold text-white">
          {round.retrying
            ? `🔁 รอบแก้ตัว ข้อ ${round.retryIndex + 1} / ${round.retry.length}`
            : `ข้อ ${round.index + 1} / ${round.questions.length}`}
          <span className="ml-2 font-normal text-slate-400">ระดับ{PRACTICE_LEVELS[round.level].name}</span>
        </p>
        <Button
          variant="ghost"
          onClick={() => {
            setPhase({ kind: 'choose' })
            setResult(null)
            onPlayingChange(false)
          }}
        >
          หยุดฝึก
        </Button>
      </div>
      <ol className="flex gap-1" aria-label="ผลรอบแรก">
        {round.questions.map((q, i) => (
          <li
            key={q.id + i}
            className={`h-2.5 flex-1 rounded-full ${
              i < answeredCount ? (round.results[i] ? 'bg-leaf-500' : 'bg-ember-500') : i === round.index && !round.retrying ? 'bg-gold-300' : 'bg-white/15'
            }`}
            aria-label={i < answeredCount ? (round.results[i] ? `ข้อ ${i + 1} ถูก` : `ข้อ ${i + 1} ผิด`) : `ข้อ ${i + 1}`}
          />
        ))}
      </ol>

      <div key={`${round.retrying ? 'r' : 'q'}${round.retrying ? round.retryIndex : round.index}`} className="ta-card ta-cute ta-card-pop mx-auto" style={TIME_COLORS}>
        <div className="ta-card-head">
          <span>⏱️ ฝึกอ่านนาฬิกา</span>
          <span className="text-sm">{round.retrying ? 'ลองอีกครั้ง!' : PRACTICE_LEVELS[round.level].name}</span>
        </div>
        <div className="flex flex-col gap-3 px-[18px] pb-[18px] pt-1.5">
          {card.visual ? (
            <div className="flex flex-col items-center gap-2">
              <Visual visual={card.visual} />
            </div>
          ) : null}
          <p className="text-balance text-center text-[21px] font-bold leading-snug">{emphasize(card.question)}</p>

          {card.kind === 'choice' ? (
            <div className="grid gap-2.5">
              {card.options.map((option, i) => {
                const classes = ['ta-opt']
                if (done && i === card.answer) classes.push('ta-opt-right')
                if (done && result?.picked === i && !result.correct) classes.push('ta-opt-wrong')
                return (
                  <button key={i} type="button" className={classes.join(' ')} disabled={done} onClick={() => answer({ kind: 'choice', index: i }, i)}>
                    <span className="inline-flex h-[30px] min-w-[30px] flex-none items-center justify-center rounded-[10px] font-display text-[15px] text-white" style={{ background: 'var(--c)' }}>
                      {LETTERS[i]}
                    </span>
                    {typeof option === 'string' ? option : option.label}
                  </button>
                )
              })}
            </div>
          ) : null}

          {card.kind === 'set' ? (
            <ClockSetter card={card} set={set} result={result} onSet={setSet} onCheck={() => answer({ kind: 'set', h: set[0], m: set[1] }, null)} />
          ) : null}

          {result ? (
            <>
              <div className="flex items-center gap-3 rounded-2xl bg-white p-3">
                <Hero hero={result.correct ? 'fairy' : 'wizard'} className="w-14 flex-none" />
                <div>
                  <p className={`text-xl font-bold ${result.correct ? 'text-green-700' : 'text-red-600'}`}>{result.line}</p>
                  {!result.correct ? (
                    <p>
                      คำตอบคือ <b>{card.answerText}</b>
                    </p>
                  ) : null}
                  <p className="text-sm text-slate-600">💡 {card.why}</p>
                </div>
              </div>
              <Button size="lg" fullWidth onClick={next}>
                ข้อต่อไป ➜
              </Button>
            </>
          ) : null}
        </div>
      </div>
    </div>
  )
}
