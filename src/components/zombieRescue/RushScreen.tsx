import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { Button } from '../Button'
import { playSfx } from '../../services/audioService'
import { RUSH_SECONDS, RUSH_STAR_AT, RUSH_TABLES, rushDeck, rushStars } from '../../zombieRescue/rush'
import type { RushBest, RushFact, RushTable } from '../../zombieRescue/rush'
import type { QAnswer } from '../../zombieRescue/questions'
import { villagerFor } from '../../zombieRescue/villagers'
import { AnswerPad, Char, HeartBurst, StickerToast, VillagerArt } from './ZrParts'

/**
 * ⚡ ซอมบี้บุก! ตอบสูตรคูณให้ได้มากที่สุดใน 60 วินาที
 *
 * ชาวเมืองที่ยังเป็นซอมบี้เดินเข้ามาทีละคน ตอบถูกคนนั้นหายป่วยแล้วไปต่อแถวข้างล่าง
 * ตอบผิดเห็นเฉลยสั้น ๆ แล้วไปคนถัดไป เสียแค่เวลา
 * ตรรกะ (สำรับโจทย์ ดาว เหรียญ สถิติ) อยู่ใน src/zombieRescue/rush.ts
 * การจ่ายเหรียญ บันทึกสถิติ สมุดวัคซีน และแผงคุณครู ทำที่หน้าหลักผ่าน onAnswer / onFinish
 */

const COLORS = { '--c': '#E0453A', '--bg': '#FFF0EC' } as CSSProperties
const LABEL: Record<string, string> = { '2': '×2', '3': '×3', '4': '×4', '5': '×5', '10': '×10', mix: 'รวม' }
const tableName = (t: RushTable) => (t === 'mix' ? 'รวมทุกแม่' : `แม่ ${t}`)
/** เวลาที่ค้างผลให้เห็นก่อนไปคนถัดไป (ถูกสั้น ผิดนานพอให้อ่านเฉลย) */
const SHOW_RIGHT_MS = 380
const SHOW_WRONG_MS = 1300

interface Round {
  table: RushTable
  fact: RushFact
  /** ลำดับข้อ ใช้เป็น key ให้แป้นตอบล้างค่าทุกข้อ */
  n: number
  cured: RushFact[]
  missed: RushFact[]
  feedback: { correct: boolean; sticker: boolean } | null
}

type Phase =
  | { kind: 'choose' }
  | { kind: 'count'; table: RushTable; left: number }
  | { kind: 'play'; round: Round }
  | { kind: 'done'; round: Round; reward: number; record: boolean }

interface Props {
  best: RushBest
  reduceMotion: boolean
  /** จดผลหนึ่งข้อ (สมุดวัคซีน แผงคุณครู) คืน true เมื่อได้สติกเกอร์ใหม่ */
  onAnswer: (fact: RushFact, correct: boolean) => boolean
  /** จบรอบ: หน้าหลักจ่ายเหรียญ บันทึกสถิติ แล้วคืนเหรียญที่ได้และบอกว่าทำลายสถิติไหม */
  onFinish: (table: RushTable, cured: number, answered: number) => { reward: number; record: boolean }
  onPlayingChange: (playing: boolean) => void
}

export function RushScreen({ best, reduceMotion, onAnswer, onFinish, onPlayingChange }: Props) {
  const [phase, setPhase] = useState<Phase>({ kind: 'choose' })
  const [table, setTable] = useState<RushTable>(2)
  const [left, setLeft] = useState(RUSH_SECONDS)
  const deck = useRef<() => RushFact>(() => ({ each: 2, groups: 1 }))
  const startedAt = useRef(0)
  const roundRef = useRef<Round | null>(null)
  const timers = useRef<number[]>([])
  const finished = useRef(false)
  /* นาฬิกาเรียก finish จากรอบ render แรก จึงต้องอ่าน onFinish ล่าสุดผ่าน ref
     ไม่งั้นหน้าหลักจะได้ข้อมูลผู้เล่นเก่า แล้วเขียนทับสิ่งที่เปลี่ยนระหว่างรอบ (เช่น จำนวนสติกเกอร์) */
  const onFinishRef = useRef(onFinish)
  onFinishRef.current = onFinish

  const clearTimers = () => {
    timers.current.forEach((id) => window.clearTimeout(id))
    timers.current = []
  }
  useEffect(() => clearTimers, [])

  const setRound = (round: Round) => {
    roundRef.current = round
    setPhase({ kind: 'play', round })
  }

  const finish = () => {
    const round = roundRef.current
    if (!round || finished.current) return
    finished.current = true
    clearTimers()
    const { reward, record } = onFinishRef.current(round.table, round.cured.length, round.cured.length + round.missed.length)
    playSfx(record || rushStars(round.cured.length) === 3 ? 'victory' : 'coin')
    setPhase({ kind: 'done', round: { ...round, feedback: null }, reward, record })
  }

  /* นาฬิกานับถอยหลังระหว่างเล่น คำนวณจากเวลาจริง ไม่เพี้ยนแม้แท็บช้า */
  const playing = phase.kind === 'play'
  useEffect(() => {
    if (!playing) return
    const id = window.setInterval(() => {
      const remain = Math.max(0, RUSH_SECONDS - (Date.now() - startedAt.current) / 1000)
      setLeft(remain)
      if (remain <= 0) finish()
    }, 200)
    return () => window.clearInterval(id)
    // finish อ่านรอบล่าสุดจาก ref จึงไม่ต้องอยู่ใน dependency
  }, [playing])

  const begin = (chosen: RushTable) => {
    playSfx('click')
    clearTimers()
    setTable(chosen)
    onPlayingChange(true)
    finished.current = false
    deck.current = rushDeck(chosen, Math.random)
    const go = () => {
      startedAt.current = Date.now()
      setLeft(RUSH_SECONDS)
      setRound({ table: chosen, fact: deck.current(), n: 0, cured: [], missed: [], feedback: null })
      playSfx('levelUp')
    }
    if (reduceMotion) {
      go()
      return
    }
    // นับ 3 2 1 ให้ตั้งตัวก่อนเวลาเริ่มเดิน
    ;[3, 2, 1].forEach((n, i) =>
      timers.current.push(
        window.setTimeout(() => {
          setPhase({ kind: 'count', table: chosen, left: n })
          playSfx('click')
        }, i * 700),
      ),
    )
    timers.current.push(window.setTimeout(go, 3 * 700))
  }

  const stop = () => {
    clearTimers()
    finished.current = true
    setPhase({ kind: 'choose' })
    onPlayingChange(false)
  }

  const answer = (value: QAnswer) => {
    const round = roundRef.current
    if (!round || round.feedback || finished.current || value.kind !== 'number') return
    const { fact } = round
    const correct = value.value === fact.each * fact.groups
    const sticker = onAnswer(fact, correct)
    playSfx(correct ? 'correct' : 'wrong')
    const shown: Round = {
      ...round,
      cured: correct ? [...round.cured, fact] : round.cured,
      missed: correct ? round.missed : [...round.missed, fact],
      feedback: { correct, sticker },
    }
    setRound(shown)
    timers.current.push(
      window.setTimeout(
        () => {
          if (finished.current) return
          setRound({ ...shown, fact: deck.current(), n: shown.n + 1, feedback: null })
        },
        correct && !sticker ? SHOW_RIGHT_MS : SHOW_WRONG_MS,
      ),
    )
  }

  /* ── เลือกแม่ ── */
  if (phase.kind === 'choose') {
    return (
      <div className="panel panel-hero panel-corners p-6">
        <div className="flex items-end justify-center gap-1" aria-hidden="true">
          <Char k="scout" className="zr-bob w-16" />
          <Char k="zombie" className="zr-sway w-14" />
          <Char k="zombie" className="zr-sway w-12" />
        </div>
        <h2 className="title-gold mt-1 text-center text-2xl font-black">⚡ ซอมบี้บุก!</h2>
        <p className="mt-1 text-center text-sm leading-relaxed text-slate-300">
          ชาวเมืองติดเชื้อเดินเข้ามาทีละคน ตอบสูตรคูณให้ถูกเพื่อฉีดวัคซีน
          <br />
          รักษาให้ได้มากที่สุดใน {RUSH_SECONDS} วินาที · ตอบผิดไม่เสียอะไร นอกจากเวลา
        </p>
        <fieldset className="mt-5">
          <legend className="mb-2 text-sm font-bold text-white">เลือกแม่สูตรคูณ</legend>
          <div className="grid grid-cols-3 gap-2">
            {RUSH_TABLES.map((t) => (
              <button
                key={String(t)}
                type="button"
                aria-pressed={table === t}
                onClick={() => setTable(t)}
                className={`rounded-xl border p-3 text-center transition ${
                  table === t ? 'border-gold-300 bg-gold-500/15' : 'border-white/15 bg-white/5 hover:border-white/30'
                }`}
              >
                <span className="block font-display text-2xl text-white">{LABEL[String(t)]}</span>
                <span className="block text-xs text-slate-300">{best[String(t)] ? `ดีสุด ${best[String(t)]} คน` : 'ยังไม่เคยเล่น'}</span>
              </button>
            ))}
          </div>
        </fieldset>
        <ul className="mt-5 space-y-1.5 text-sm text-slate-300">
          <li>
            · ⭐ {RUSH_STAR_AT[0]} คน · ⭐⭐ {RUSH_STAR_AT[1]} คน · ⭐⭐⭐ {RUSH_STAR_AT[2]} คน
          </li>
          <li>· ตอบถูกนับลงสมุดวัคซีนด้วย ได้สติกเกอร์ชาวเมืองได้เหมือนโหมดอื่น</li>
        </ul>
        <Button size="lg" fullWidth className="mt-6" onClick={() => begin(table)}>
          ⚡ เริ่มเลย!
        </Button>
      </div>
    )
  }

  /* ── นับถอยหลัง ── */
  if (phase.kind === 'count') {
    return (
      <div className="ta-card ta-cute mx-auto" style={COLORS}>
        <div className="ta-card-head">
          <span>⚡ ซอมบี้บุก! · {tableName(phase.table)}</span>
        </div>
        <div className="grid place-items-center gap-2 px-5 py-10 text-center">
          <p key={phase.left} className="zr-count font-display text-7xl">
            {phase.left}
          </p>
          <p className="font-bold">เตรียมเข็มวัคซีนให้พร้อม!</p>
        </div>
      </div>
    )
  }

  /* ── จบรอบ ── */
  if (phase.kind === 'done') {
    const { round, reward, record } = phase
    const stars = rushStars(round.cured.length)
    const missed = round.missed.filter((f, i, list) => list.findIndex((g) => g.each === f.each && g.groups === f.groups) === i)
    return (
      <div className="ta-card ta-cute ta-card-pop mx-auto" style={COLORS}>
        <div className="ta-card-head">
          <span>⚡ หมดเวลา! · {tableName(round.table)}</span>
          <span className="text-[#FFE27A]">
            {'★'.repeat(stars)}
            {'☆'.repeat(3 - stars)}
          </span>
        </div>
        <div className="grid gap-3 px-5 pb-5 pt-1 text-center">
          <p className="text-2xl font-bold">รักษาได้ {round.cured.length} คน</p>
          {record ? <p className="zr-sticker-toast rounded-2xl bg-[#FFF4C2] px-3 py-2 font-bold text-amber-800">🏆 ทำลายสถิติ{tableName(round.table)}!</p> : null}
          {round.cured.length ? (
            <ul className="flex flex-wrap justify-center gap-1" aria-label="ชาวเมืองที่รักษาได้">
              {round.cured.map((f, i) => (
                <li key={i}>
                  <VillagerArt v={villagerFor(f.each, f.groups)} cured className="zr-bob w-9" />
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-slate-600">ไม่เป็นไร ลองใหม่อีกรอบนะ ค่อย ๆ ตอบก็ได้</p>
          )}
          <p className="text-sm text-slate-600">
            ตอบทั้งหมด {round.cured.length + round.missed.length} ข้อ · ดีสุด {Math.max(best[String(round.table)] ?? 0, round.cured.length)} คน
          </p>
          <p className="rounded-2xl bg-white px-3 py-2 font-bold text-amber-700">ได้ 🪙 {reward} เหรียญเข้ากระเป๋า</p>
          {missed.length ? (
            <div className="rounded-2xl bg-white px-3 py-2 text-left text-sm">
              <p className="font-bold">🔁 ข้อที่ควรทวน</p>
              <p className="mt-1">{missed.map((f) => `${f.groups} × ${f.each} = ${f.groups * f.each}`).join(' · ')}</p>
            </div>
          ) : null}
          <div className="flex flex-wrap justify-center gap-3">
            <Button variant="secondary" onClick={stop}>
              เปลี่ยนแม่
            </Button>
            <Button onClick={() => begin(round.table)}>⚡ อีกรอบ</Button>
          </div>
        </div>
      </div>
    )
  }

  /* ── กำลังเล่น ── */
  const { round } = phase
  const { fact, feedback } = round
  const v = villagerFor(fact.each, fact.groups)
  const pct = Math.max(0, Math.min(100, (left / RUSH_SECONDS) * 100))
  return (
    <div className="grid gap-3">
      <div className="flex items-center justify-between gap-2">
        <p className={`font-display text-2xl tabular-nums ${left <= 10 ? 'text-ember-300' : 'text-white'}`} aria-live="off">
          ⏱ {Math.ceil(left)}
        </p>
        <p className="font-bold text-white">💉 รักษาแล้ว {round.cured.length} คน</p>
        <Button variant="ghost" onClick={stop}>
          หยุด
        </Button>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-label="เวลาที่เหลือ" aria-valuemin={0} aria-valuemax={RUSH_SECONDS} aria-valuenow={Math.ceil(left)}>
        <div className={`h-full rounded-full ${left <= 10 ? 'bg-ember-500' : 'zr-energy'}`} style={{ width: `${pct}%` }} />
      </div>

      <div key={round.n} className="ta-card ta-cute ta-card-pop mx-auto" style={COLORS}>
        <div className="ta-card-head">
          <span>⚡ ซอมบี้บุก!</span>
          <span className="text-sm">{tableName(round.table)}</span>
        </div>
        <div className="relative flex flex-col gap-3 px-[18px] pb-[18px] pt-2">
          {feedback?.correct ? <HeartBurst /> : null}
          <div className="flex items-center justify-center gap-4">
            <VillagerArt v={v} cured={feedback?.correct === true} className={`w-24 flex-none ${feedback?.correct ? 'zr-bob' : 'zr-sway'}`} />
            <div className="text-left">
              <p className="text-sm font-bold text-slate-500">น้อง{v.name}</p>
              <p className="font-display text-4xl tabular-nums">
                {fact.groups} × {fact.each} = {feedback ? <span className={feedback.correct ? 'text-green-700' : 'text-red-600'}>{fact.groups * fact.each}</span> : '?'}
              </p>
              {feedback ? (
                <p className={`font-bold ${feedback.correct ? 'text-green-700' : 'text-red-600'}`}>{feedback.correct ? 'หายป่วยแล้ว! 💉' : 'ยังไม่ใช่ จำไว้นะ'}</p>
              ) : null}
            </div>
          </div>
          {feedback?.sticker ? <StickerToast each={fact.each} groups={fact.groups} /> : null}
          <AnswerPad key={round.n} ask="product" unit="" disabled={!!feedback} onSubmit={answer} />
        </div>
      </div>

      {round.cured.length ? (
        <ul className="flex flex-wrap justify-center gap-1" aria-label="ชาวเมืองที่รักษาได้แล้ว">
          {round.cured.map((f, i) => (
            <li key={i}>
              <VillagerArt v={villagerFor(f.each, f.groups)} cured className="w-8" />
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
