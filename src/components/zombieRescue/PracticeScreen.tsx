import { useState } from 'react'
import type { CSSProperties } from 'react'
import { Button } from '../Button'
import { playSfx } from '../../services/audioService'
import { PRACTICE_LENGTH, buildPracticeSet, checkAnswer } from '../../zombieRescue/questions'
import type { PracticeTable, QAnswer, Question } from '../../zombieRescue/questions'
import { AnswerPad, CHEER, COMFORT, Char, QuestionVisual, emphasize, pick } from './ZrParts'

/**
 * โหมดฝึกสูตรคูณ: เลือกแม่ แล้วตอบรอบละ 10 ข้อ
 *
 * แม่เดียวใช้จำนวนกลุ่ม 1–10 ครบทุกตัวแบบสลับลำดับ (ดู buildPracticeSet)
 * ข้อที่ผิดวนกลับมาให้ตอบใหม่ท้ายรอบ ไม่เกิน 3 ข้อ เหตุผลเดียวกับโหมดฝึกอ่านนาฬิกา
 * การจ่ายเหรียญและการส่งผลให้ครูทำที่หน้าหลัก ไม่ใช่ที่นี่
 */

const RETRY_LIMIT = 3
const COLORS = { '--c': '#2E9E4F', '--bg': '#E6F5EA' } as CSSProperties
const CHOICES: Array<{ key: PracticeTable; label: string; note: string }> = [
  { key: 2, label: '×2', note: 'แม่ 2' },
  { key: 3, label: '×3', note: 'แม่ 3' },
  { key: 4, label: '×4', note: 'แม่ 4' },
  { key: 5, label: '×5', note: 'แม่ 5' },
  { key: 10, label: '×10', note: 'แม่ 10' },
  { key: 'mix', label: 'รวม', note: 'ทุกแม่ปนกัน' },
]

interface Props {
  playerName: string
  /** บันทึกผลหนึ่งข้อให้แผงคุณครู เรียกเฉพาะรอบแรก ไม่เรียกในรอบแก้ตัว */
  onAnswer: (correct: boolean) => void
  /** จบรอบ: หน้าหลักจ่ายเหรียญแล้วคืนจำนวนที่ได้ */
  onFinish: (firstTryCorrect: number, total: number) => number
  onPlayingChange: (playing: boolean) => void
}

interface Round {
  table: PracticeTable
  questions: Question[]
  index: number
  results: boolean[]
  retry: Question[]
  retrying: boolean
  retryIndex: number
}

type Phase = { kind: 'choose' } | { kind: 'play'; round: Round } | { kind: 'done'; round: Round; reward: number }

const tableName = (table: PracticeTable) => (table === 'mix' ? 'รวมทุกแม่' : `แม่ ${table}`)

export function PracticeScreen({ playerName, onAnswer, onFinish, onPlayingChange }: Props) {
  const [phase, setPhase] = useState<Phase>({ kind: 'choose' })
  const [table, setTable] = useState<PracticeTable>(2)
  const [result, setResult] = useState<{ correct: boolean; line: string } | null>(null)

  const begin = (chosen: PracticeTable) => {
    playSfx('click')
    setTable(chosen)
    setResult(null)
    setPhase({ kind: 'play', round: { table: chosen, questions: buildPracticeSet(chosen, Math.random), index: 0, results: [], retry: [], retrying: false, retryIndex: 0 } })
    onPlayingChange(true)
  }

  const stop = () => {
    setPhase({ kind: 'choose' })
    setResult(null)
    onPlayingChange(false)
  }

  if (phase.kind === 'choose') {
    return (
      <div className="panel panel-hero panel-corners p-6">
        <div className="flex justify-center gap-1" aria-hidden="true">
          <Char k="scientist" className="w-16" />
          <Char k="zombie" className="w-16" />
        </div>
        <h2 className="title-gold mt-1 text-center text-2xl font-black">ฝึกสูตรคูณ</h2>
        <p className="mt-1 text-center text-sm leading-relaxed text-slate-300">
          รอบละ {PRACTICE_LENGTH} ข้อ เลือกแม่ที่อยากฝึก ข้อที่ผิดจะกลับมาให้ลองใหม่ท้ายรอบ
        </p>
        <fieldset className="mt-5">
          <legend className="mb-2 text-sm font-bold text-white">เลือกแม่สูตรคูณ</legend>
          <div className="grid grid-cols-3 gap-2">
            {CHOICES.map((choice) => (
              <button
                key={String(choice.key)}
                type="button"
                aria-pressed={table === choice.key}
                onClick={() => setTable(choice.key)}
                className={`rounded-xl border p-3 text-center transition ${
                  table === choice.key ? 'border-gold-300 bg-gold-500/15' : 'border-white/15 bg-white/5 hover:border-white/30'
                }`}
              >
                <span className="block font-display text-2xl text-white">{choice.label}</span>
                <span className="block text-xs text-slate-300">{choice.note}</span>
              </button>
            ))}
          </div>
        </fieldset>
        <ul className="mt-5 space-y-1.5 text-sm text-slate-300">
          <li>· ถูกข้อละ 🪙 1 เหรียญ ถูกหมดทั้งรอบได้โบนัส</li>
          <li>· ผลของ {playerName} ส่งให้แผงคุณครูในตัวชี้วัด "การคูณ (ป.2)"</li>
        </ul>
        <Button size="lg" fullWidth className="mt-6" onClick={() => begin(table)}>
          🎯 เริ่มฝึก
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
      <div className="ta-card ta-cute ta-card-pop mx-auto" style={COLORS}>
        <div className="ta-card-head">
          <span>🎯 จบรอบฝึก · {tableName(round.table)}</span>
          <span className="text-[#FFE27A]">{'★'.repeat(stars)}{'☆'.repeat(3 - stars)}</span>
        </div>
        <div className="grid gap-3 px-5 pb-5 pt-1 text-center">
          <Char k={stars >= 2 ? 'scientist' : 'dog'} className="mx-auto w-24" />
          <p className="text-2xl font-bold">
            ถูก {correct} จาก {total} ข้อ
          </p>
          <p className="rounded-2xl bg-white px-3 py-2 font-bold text-amber-700">ได้ 🪙 {reward} เหรียญเข้ากระเป๋า</p>
          {missed.length ? (
            <div className="grid gap-1.5 text-left">
              <p className="text-center font-bold">🔁 ข้อที่ควรจำไว้</p>
              {missed.map((q, i) => (
                <p key={i} className="rounded-2xl bg-white px-3 py-2 text-sm leading-snug">
                  <b>
                    {q.groups} × {q.each} = {q.product}
                  </b>
                  <span className="text-slate-500"> · {q.why}</span>
                </p>
              ))}
            </div>
          ) : (
            <p className="font-bold text-green-700">ถูกทุกข้อตั้งแต่รอบแรก เก่งมาก! 🎉</p>
          )}
          <div className="flex flex-wrap justify-center gap-3">
            <Button variant="secondary" onClick={stop}>
              เปลี่ยนแม่
            </Button>
            <Button onClick={() => begin(round.table)}>🔁 ฝึกอีกรอบ</Button>
          </div>
        </div>
      </div>
    )
  }

  const { round } = phase
  const q = round.retrying ? round.retry[round.retryIndex] : round.questions[round.index]
  const answeredCount = round.results.length
  const cardKey = `${round.retrying ? 'r' : 'q'}${round.retrying ? round.retryIndex : round.index}`

  const answer = (value: QAnswer) => {
    if (result) return
    const correct = checkAnswer(q, value)
    playSfx(correct ? 'correct' : 'wrong')
    setResult({ correct, line: pick(correct ? CHEER : COMFORT) })
    if (round.retrying) return
    onAnswer(correct)
    const retry = !correct && round.retry.length < RETRY_LIMIT ? [...round.retry, q] : round.retry
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
    setPhase({ kind: 'play', round: nextRound })
  }

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-bold text-white">
          {round.retrying ? `🔁 รอบแก้ตัว ข้อ ${round.retryIndex + 1} / ${round.retry.length}` : `ข้อ ${round.index + 1} / ${round.questions.length}`}
          <span className="ml-2 font-normal text-slate-400">{tableName(round.table)}</span>
        </p>
        <Button variant="ghost" onClick={stop}>
          หยุดฝึก
        </Button>
      </div>
      <ol className="flex gap-1" aria-label="ผลรอบแรก">
        {round.questions.map((_, i) => (
          <li
            key={i}
            className={`h-2.5 flex-1 rounded-full ${
              i < answeredCount ? (round.results[i] ? 'bg-leaf-500' : 'bg-ember-500') : i === round.index && !round.retrying ? 'bg-gold-300' : 'bg-white/15'
            }`}
            aria-label={i < answeredCount ? (round.results[i] ? `ข้อ ${i + 1} ถูก` : `ข้อ ${i + 1} ผิด`) : `ข้อ ${i + 1}`}
          />
        ))}
      </ol>

      <div key={cardKey} className="ta-card ta-cute ta-card-pop mx-auto" style={COLORS}>
        <div className="ta-card-head">
          <span>🎯 ฝึกสูตรคูณ</span>
          <span className="text-sm">{round.retrying ? 'ลองอีกครั้ง!' : tableName(round.table)}</span>
        </div>
        <div className="flex flex-col gap-3 px-[18px] pb-[18px] pt-1.5">
          <div className="flex flex-col items-center gap-2">
            <QuestionVisual visual={q.visual} />
          </div>
          <p className="text-balance text-center text-[21px] font-bold leading-snug">{emphasize(q.text)}</p>
          {result ? (
            <>
              <div className="flex items-center gap-3 rounded-2xl bg-white p-3">
                <Char k={result.correct ? 'scientist' : 'zombie'} className="w-14 flex-none" />
                <div>
                  <p className={`text-xl font-bold ${result.correct ? 'text-green-700' : 'text-red-600'}`}>{result.line}</p>
                  {!result.correct ? (
                    <p>
                      คำตอบคือ <b>{q.answerText}</b>
                    </p>
                  ) : null}
                  <p className="text-sm text-slate-600">💡 {q.why}</p>
                </div>
              </div>
              <Button size="lg" fullWidth onClick={next}>
                ข้อต่อไป ➜
              </Button>
            </>
          ) : (
            <AnswerPad key={cardKey} ask={q.ask} unit={q.unit} onSubmit={answer} />
          )}
        </div>
      </div>
    </div>
  )
}
