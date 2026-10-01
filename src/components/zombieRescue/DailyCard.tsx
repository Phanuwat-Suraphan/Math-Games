import { useState } from 'react'
import type { CSSProperties } from 'react'
import { Button } from '../Button'
import { playSfx } from '../../services/audioService'
import { DAILY_LENGTH, calendarDays, dailySet, doneToday, liveStreak } from '../../zombieRescue/daily'
import type { DailyState } from '../../zombieRescue/daily'
import { checkAnswer } from '../../zombieRescue/questions'
import type { QAnswer, Question } from '../../zombieRescue/questions'
import { questionSpeech } from '../../zombieRescue/speech'
import type { VaccineBook } from '../../zombieRescue/vaccineBook'
import { VILLAGER_COUNT, villagerAt } from '../../zombieRescue/villagers'
import { AnswerPad, CHEER, COMFORT, Char, HeartBurst, QuestionVisual, SpeakButton, StickerToast, VillagerArt, emphasize, pick } from './ZrParts'

/**
 * 🌞 ภารกิจประจำวัน: การ์ดบนหน้าเริ่มเกม กดแล้วตอบ 5 ข้อ จบแล้วได้ตราประทับของวันนี้
 * ตรรกะ (เลือกโจทย์ นับไฟต่อเนื่อง เหรียญ) อยู่ใน src/zombieRescue/daily.ts
 */

const COLORS = { '--c': '#E08A00', '--bg': '#FFF6E0' } as CSSProperties
const DOW = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส']

/** ชาวเมืองที่มาประทับตราให้วันนั้น (เลือกจากวันที่ วันเดียวกันได้คนเดิม) */
function stampOf(day: string) {
  let h = 0
  for (const ch of day) h = (h * 31 + ch.charCodeAt(0)) % 9973
  return villagerAt(h % VILLAGER_COUNT)
}

function Calendar({ state, today }: { state: DailyState; today: string }) {
  return (
    <ol className="zr-cal" aria-label="ตราประทับ 14 วันล่าสุด">
      {calendarDays(today).map((day) => {
        const done = state.days.includes(day)
        const [y, m, d] = day.split('-').map(Number)
        const dow = DOW[new Date(y, m - 1, d).getDay()]
        return (
          <li key={day} className={`zr-cal-day ${done ? 'zr-cal-done' : ''} ${day === today ? 'zr-cal-today' : ''}`} aria-label={`${d}/${m} ${done ? 'ทำแล้ว' : 'ยังไม่ได้ทำ'}`}>
            <span className="zr-cal-dow">{dow}</span>
            {done ? <VillagerArt v={stampOf(day)} cured className="w-7" /> : <span className="zr-cal-dot">{d}</span>}
          </li>
        )
      })}
    </ol>
  )
}

type Phase =
  | { kind: 'card' }
  | { kind: 'play'; set: Question[]; index: number; results: boolean[]; result: { correct: boolean; line: string; sticker: boolean } | null }
  | { kind: 'done'; results: boolean[]; reward: number; streak: number }

interface Props {
  book: VaccineBook
  state: DailyState
  today: string
  /** จดผลหนึ่งข้อ (สมุดวัคซีน แผงคุณครู) คืน true เมื่อได้สติกเกอร์ใหม่ */
  onAnswer: (q: Question, correct: boolean) => boolean
  /** ทำครบ 5 ข้อ: หน้าหลักบันทึกไฟต่อเนื่อง จ่ายเหรียญ แล้วคืนเหรียญและไฟใหม่ */
  onFinish: (correct: number) => { reward: number; streak: number }
  onPlayingChange: (playing: boolean) => void
}

export function DailyCard({ book, state, today, onAnswer, onFinish, onPlayingChange }: Props) {
  const [phase, setPhase] = useState<Phase>({ kind: 'card' })
  const done = doneToday(state, today)
  const streak = liveStreak(state, today)

  const begin = () => {
    playSfx('click')
    onPlayingChange(true)
    setPhase({ kind: 'play', set: dailySet(book, today), index: 0, results: [], result: null })
  }

  const close = () => {
    setPhase({ kind: 'card' })
    onPlayingChange(false)
  }

  if (phase.kind === 'card') {
    return (
      <section className="zr-daily mb-4" style={COLORS} aria-label="ภารกิจประจำวัน">
        <div className="flex items-center gap-3">
          <span className={`zr-flame ${streak ? '' : 'zr-flame-off'}`} aria-hidden="true">
            🔥
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-display text-lg leading-tight">🌞 ภารกิจประจำวัน</p>
            <p className="text-sm text-slate-600">
              {done ? 'วันนี้ทำแล้ว เก่งมาก! กลับมาใหม่พรุ่งนี้นะ' : `ตอบ ${DAILY_LENGTH} ข้อ ข้อที่ยังพลาดมาก่อน`}
              {' · '}
              <b>{streak ? `ติดต่อกัน ${streak} วัน` : 'เริ่มนับไฟวันนี้เลย'}</b>
              {state.best > 1 ? <span className="text-slate-500"> (ยาวสุด {state.best} วัน)</span> : null}
            </p>
          </div>
          {!done ? (
            <Button onClick={begin}>เริ่ม!</Button>
          ) : (
            <span className="text-2xl" aria-hidden="true">
              ✅
            </span>
          )}
        </div>
        <Calendar state={state} today={today} />
      </section>
    )
  }

  if (phase.kind === 'done') {
    const correct = phase.results.filter(Boolean).length
    return (
      <div className="ta-card ta-cute ta-card-pop mx-auto mb-4" style={COLORS}>
        <div className="ta-card-head">
          <span>🌞 ภารกิจวันนี้สำเร็จ!</span>
          <span>🔥 {phase.streak} วัน</span>
        </div>
        <div className="grid gap-3 px-5 pb-5 pt-1 text-center">
          <VillagerArt v={stampOf(today)} cured className="zr-bob mx-auto w-20" />
          <p className="text-xl font-bold">
            ถูก {correct} จาก {phase.results.length} ข้อ · ได้ตราประทับของวันนี้แล้ว
          </p>
          <p className="font-bold text-amber-700">
            {phase.streak > 1 ? `ไฟติดต่อกัน ${phase.streak} วัน! พรุ่งนี้มาต่ออีกนะ 🔥` : 'เริ่มนับไฟวันแรก พรุ่งนี้มาต่อเป็นวันที่ 2 นะ 🔥'}
          </p>
          <p className="rounded-2xl bg-white px-3 py-2 font-bold text-amber-700">ได้ 🪙 {phase.reward} เหรียญเข้ากระเป๋า</p>
          <Calendar state={{ ...state, days: [...new Set([...state.days, today])] }} today={today} />
          <Button onClick={close}>กลับ</Button>
        </div>
      </div>
    )
  }

  const { set, index, results, result } = phase
  const q = set[index]
  const answer = (value: QAnswer) => {
    if (result) return
    const correct = checkAnswer(q, value)
    playSfx(correct ? 'correct' : 'wrong')
    const sticker = onAnswer(q, correct)
    setPhase({ ...phase, results: [...results, correct], result: { correct, line: pick(correct ? CHEER : COMFORT), sticker } })
  }
  const next = () => {
    if (index + 1 < set.length) {
      setPhase({ ...phase, index: index + 1, result: null })
      return
    }
    const correct = results.filter(Boolean).length
    const { reward, streak: newStreak } = onFinish(correct)
    playSfx('victory')
    setPhase({ kind: 'done', results, reward, streak: newStreak })
  }

  return (
    <div className="mb-4 grid gap-3">
      <div className="flex items-center justify-between text-white">
        <p className="font-bold">
          🌞 ภารกิจวันนี้ ข้อ {index + 1} / {set.length}
        </p>
        <Button variant="ghost" onClick={close}>
          ไว้ทีหลัง
        </Button>
      </div>
      <div key={index} className="ta-card ta-cute ta-card-pop mx-auto" style={COLORS}>
        <div className="ta-card-head">
          <span>🌞 ภารกิจประจำวัน</span>
          <span className="text-sm">🔥 {streak} วัน</span>
        </div>
        <div className="flex flex-col gap-3 px-[18px] pb-[18px] pt-1.5">
          <div className="flex flex-col items-center gap-2">
            <QuestionVisual visual={q.visual} />
          </div>
          <p className="text-balance text-center text-[21px] font-bold leading-snug">{emphasize(q.text)}</p>
          <SpeakButton text={questionSpeech(q)} className="mx-auto" />
          {result ? (
            <>
              <div className="relative flex items-center gap-3 rounded-2xl bg-white p-3">
                {result.correct ? <HeartBurst /> : null}
                <Char k={result.correct ? 'scientist' : 'zombie'} className={`w-14 flex-none ${result.correct ? 'zr-bob' : 'zr-sway'}`} />
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
              {result.sticker ? <StickerToast each={q.each} groups={q.groups} /> : null}
              <Button size="lg" fullWidth onClick={next}>
                {index + 1 < set.length ? 'ข้อต่อไป ➜' : '🌞 ประทับตราวันนี้'}
              </Button>
            </>
          ) : (
            <AnswerPad key={index} ask={q.ask} unit={q.unit} onSubmit={answer} />
          )}
        </div>
      </div>
    </div>
  )
}
