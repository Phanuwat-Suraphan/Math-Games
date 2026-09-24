import { useCallback, useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { Button } from '../Button'
import { playSfx } from '../../services/audioService'
import { CLASS_COUNTS, CLASS_THINK, buildClassSet, classMissed, classStars, classVisual } from '../../zombieRescue/classroom'
import type { ClassResult } from '../../zombieRescue/classroom'
import { RUSH_TABLES } from '../../zombieRescue/rush'
import type { RushFact, RushTable } from '../../zombieRescue/rush'
import { villagerFor } from '../../zombieRescue/villagers'
import { Char, HeartBurst, QuestionVisual, VillagerArt } from './ZrParts'

/**
 * 📺 ทั้งห้องเรียน: ครูเปิดเกมขึ้นจอใหญ่ ถามทั้งห้องทีละข้อ
 *
 * ไม่มีแป้นตอบ เด็กตอบด้วยปากหรือกระดานเล็ก ครูกด "เฉลย" แล้วบันทึกว่าห้องตอบถูกไหม
 * ใช้คีย์บอร์ดหรือรีโมตพรีเซนต์ได้: ถัดไป (Space Enter → PageDown) = เฉลย/ห้องตอบถูก · ย้อน (← PageUp) = ยังไม่ถูก
 * ผลเป็นของทั้งห้อง จึงไม่จดลงสมุดวัคซีน ไม่ส่งแผงคุณครู และไม่ให้เหรียญ (ดู src/zombieRescue/classroom.ts)
 */

const COLORS = { '--c': '#1E9AAE', '--bg': '#E4F7FA' } as CSSProperties
const LABEL: Record<string, string> = { '2': '×2', '3': '×3', '4': '×4', '5': '×5', '10': '×10', mix: 'รวม' }
const tableName = (t: RushTable) => (t === 'mix' ? 'รวมทุกแม่' : `แม่ ${t}`)
const CURE_MS = 900

interface Round {
  table: RushTable
  set: RushFact[]
  index: number
  results: ClassResult[]
  revealed: boolean
  /** ครูบันทึกข้อนี้แล้ว กำลังเล่นภาพหายป่วยก่อนไปข้อถัดไป */
  marked: boolean | null
  shownAt: number
}

type Phase = { kind: 'setup' } | { kind: 'play'; round: Round } | { kind: 'done'; round: Round }

export function ClassScreen({ onPlayingChange }: { onPlayingChange: (playing: boolean) => void }) {
  const [phase, setPhase] = useState<Phase>({ kind: 'setup' })
  const [table, setTable] = useState<RushTable>(2)
  const [count, setCount] = useState<number>(CLASS_COUNTS[0])
  const [think, setThink] = useState<number>(10)
  const [now, setNow] = useState(() => Date.now())
  const roundRef = useRef<Round | null>(null)
  const timer = useRef<number | null>(null)

  useEffect(() => () => {
    if (timer.current) window.clearTimeout(timer.current)
  }, [])

  const put = (round: Round) => {
    roundRef.current = round
    setPhase({ kind: 'play', round })
  }

  const start = (chosen: RushTable, set: RushFact[]) => {
    playSfx('levelUp')
    onPlayingChange(true)
    setTable(chosen)
    put({ table: chosen, set, index: 0, results: [], revealed: false, marked: null, shownAt: Date.now() })
  }

  const reveal = useCallback(() => {
    const round = roundRef.current
    if (!round || round.revealed) return
    playSfx('zap')
    put({ ...round, revealed: true })
  }, [])

  const mark = useCallback((correct: boolean) => {
    const round = roundRef.current
    if (!round || !round.revealed || round.marked !== null) return
    playSfx(correct ? 'correct' : 'wrong')
    const results = [...round.results, { fact: round.set[round.index], correct }]
    put({ ...round, results, marked: correct })
    timer.current = window.setTimeout(() => {
      const r = roundRef.current
      if (!r) return
      if (r.index + 1 >= r.set.length) {
        playSfx(classStars(results) === 3 ? 'victory' : 'coin')
        roundRef.current = null
        setPhase({ kind: 'done', round: { ...r, results } })
        return
      }
      put({ ...r, results, index: r.index + 1, revealed: false, marked: null, shownAt: Date.now() })
    }, CURE_MS)
  }, [])

  const quit = () => {
    if (timer.current) window.clearTimeout(timer.current)
    roundRef.current = null
    setPhase({ kind: 'setup' })
    onPlayingChange(false)
  }

  /* จับเวลาคิด: ครบแล้วเฉลยเอง */
  const playing = phase.kind === 'play'
  useEffect(() => {
    if (!playing || think === 0) return
    const id = window.setInterval(() => {
      setNow(Date.now())
      const r = roundRef.current
      if (r && !r.revealed && Date.now() - r.shownAt >= think * 1000) reveal()
    }, 200)
    return () => window.clearInterval(id)
  }, [playing, think, reveal])

  /* คีย์บอร์ดและรีโมตพรีเซนต์ */
  useEffect(() => {
    if (!playing) return
    const onKey = (e: KeyboardEvent) => {
      const r = roundRef.current
      if (!r) return
      const forward = e.key === ' ' || e.key === 'Enter' || e.key === 'ArrowRight' || e.key === 'PageDown'
      const back = e.key === 'ArrowLeft' || e.key === 'PageUp'
      if (!forward && !back) return
      e.preventDefault()
      if (!r.revealed) {
        if (forward) reveal()
        return
      }
      mark(forward)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [playing, reveal, mark])

  /* ── ตั้งค่า ── */
  if (phase.kind === 'setup') {
    const choice = (active: boolean) =>
      `rounded-xl border p-3 text-center transition ${active ? 'border-gold-300 bg-gold-500/15' : 'border-white/15 bg-white/5 hover:border-white/30'}`
    return (
      <div className="panel panel-hero panel-corners p-6">
        <div className="flex items-end justify-center gap-1" aria-hidden="true">
          <Char k="doctor" className="zr-bob w-14" />
          <Char k="scientist" className="zr-bob w-14" />
          <Char k="scout" className="zr-bob w-14" />
          <Char k="zombie" className="zr-sway w-14" />
        </div>
        <h2 className="title-gold mt-1 text-center text-2xl font-black">📺 ทั้งห้องเรียน</h2>
        <p className="mt-1 text-center text-sm leading-relaxed text-slate-300">
          ครูเปิดขึ้นจอใหญ่ ทั้งห้องช่วยกันตอบทีละข้อ ครูกดเฉลย แล้วบันทึกว่าห้องตอบถูกไหม
          <br />
          กด ⛶ เต็มจอ ด้านบนก่อนเริ่ม จะเห็นชัดทั้งห้อง
        </p>
        <fieldset className="mt-5">
          <legend className="mb-2 text-sm font-bold text-white">แม่สูตรคูณ</legend>
          <div className="grid grid-cols-3 gap-2">
            {RUSH_TABLES.map((t) => (
              <button key={String(t)} type="button" aria-pressed={table === t} onClick={() => setTable(t)} className={choice(table === t)}>
                <span className="font-display text-2xl text-white">{LABEL[String(t)]}</span>
              </button>
            ))}
          </div>
        </fieldset>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <fieldset>
            <legend className="mb-2 text-sm font-bold text-white">จำนวนข้อ</legend>
            <div className="grid grid-cols-2 gap-2">
              {CLASS_COUNTS.map((n) => (
                <button key={n} type="button" aria-pressed={count === n} onClick={() => setCount(n)} className={choice(count === n)}>
                  <span className="font-bold text-white">{n} ข้อ</span>
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend className="mb-2 text-sm font-bold text-white">เวลาคิดก่อนเฉลย</legend>
            <div className="grid grid-cols-4 gap-2">
              {CLASS_THINK.map((s) => (
                <button key={s} type="button" aria-pressed={think === s} onClick={() => setThink(s)} className={choice(think === s)}>
                  <span className="text-sm font-bold text-white">{s === 0 ? 'กดเอง' : `${s} วิ`}</span>
                </button>
              ))}
            </div>
          </fieldset>
        </div>
        <ul className="mt-5 space-y-1.5 text-sm text-slate-300">
          <li>· ใช้คีย์บอร์ดหรือรีโมตพรีเซนต์ได้: ปุ่มถัดไป = เฉลย แล้วกดอีกครั้ง = ห้องตอบถูก · ปุ่มย้อน = ยังไม่ถูก</li>
          <li>· {table === 'mix' ? 'รวมทุกแม่มี 50 ข้อ' : 'หนึ่งแม่มี 10 ข้อ'} ในรอบเดียวไม่ถามข้อเดิมซ้ำ</li>
          <li>· ผลเป็นของทั้งห้อง จึงไม่นับลงสมุดวัคซีนและไม่ให้เหรียญ</li>
        </ul>
        <Button size="lg" fullWidth className="mt-6" onClick={() => start(table, buildClassSet(table, count, Math.random))}>
          📺 เริ่มถามทั้งห้อง
        </Button>
      </div>
    )
  }

  /* ── สรุปท้ายรอบ ── */
  if (phase.kind === 'done') {
    const { results } = phase.round
    const right = results.filter((r) => r.correct)
    const missed = classMissed(results)
    const stars = classStars(results)
    return (
      <div className="ta-card ta-cute ta-card-pop mx-auto zr-class-card" style={COLORS}>
        <div className="ta-card-head">
          <span>📺 จบรอบ · {tableName(phase.round.table)}</span>
          <span className="text-[#FFE27A]">
            {'★'.repeat(stars)}
            {'☆'.repeat(3 - stars)}
          </span>
        </div>
        <div className="grid gap-3 px-5 pb-5 pt-1 text-center">
          <p className="font-display text-4xl">
            ทั้งห้องรักษาได้ {right.length} / {results.length} คน
          </p>
          <ul className="flex flex-wrap justify-center gap-1.5" aria-label="ชาวเมืองที่ห้องช่วยรักษา">
            {right.map((r, i) => (
              <li key={i}>
                <VillagerArt v={villagerFor(r.fact.each, r.fact.groups)} cured className="zr-bob w-14" />
              </li>
            ))}
          </ul>
          {missed.length ? (
            <div className="rounded-2xl bg-white px-3 py-2 text-left">
              <p className="font-bold">🔁 ข้อที่ห้องควรทวน</p>
              <p className="mt-1 text-lg">{missed.map((f) => `${f.groups} × ${f.each} = ${f.groups * f.each}`).join(' · ')}</p>
            </div>
          ) : (
            <p className="text-xl font-bold text-green-700">ทั้งห้องตอบถูกทุกข้อ เก่งมาก! 🎉</p>
          )}
          <div className="flex flex-wrap justify-center gap-3">
            <Button variant="secondary" onClick={quit}>
              ตั้งค่าใหม่
            </Button>
            {missed.length ? <Button onClick={() => start(phase.round.table, missed)}>🔁 ซ่อมเฉพาะข้อที่พลาด ({missed.length})</Button> : null}
            <Button onClick={() => start(phase.round.table, buildClassSet(phase.round.table, phase.round.set.length, Math.random))}>📺 อีกรอบ</Button>
          </div>
        </div>
      </div>
    )
  }

  /* ── กำลังถาม ── */
  const { round } = phase
  const fact = round.set[round.index]
  const v = villagerFor(fact.each, fact.groups)
  const leftMs = think === 0 ? 0 : Math.max(0, think * 1000 - (now - round.shownAt))
  const cured = round.marked === true
  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2 text-white">
        <p className="font-bold">
          ข้อ {round.index + 1} / {round.set.length} <span className="font-normal text-slate-400">· {tableName(round.table)}</span>
        </p>
        <p className="font-bold">💉 รักษาแล้ว {round.results.filter((r) => r.correct).length} คน</p>
        <Button variant="ghost" onClick={quit}>
          จบรอบ
        </Button>
      </div>
      <ol className="flex gap-1" aria-label="ผลแต่ละข้อ">
        {round.set.map((_, i) => (
          <li
            key={i}
            className={`h-2.5 flex-1 rounded-full ${
              i < round.results.length ? (round.results[i].correct ? 'bg-leaf-500' : 'bg-ember-500') : i === round.index ? 'bg-gold-300' : 'bg-white/15'
            }`}
          />
        ))}
      </ol>

      <div key={round.index} className="ta-card ta-cute ta-card-pop mx-auto zr-class-card" style={COLORS}>
        <div className="ta-card-head">
          <span>📺 ถามทั้งห้อง</span>
          <span className="text-sm">น้อง{v.name} ต้องการความช่วยเหลือ!</span>
        </div>
        <div className="relative flex flex-col items-center gap-4 px-5 pb-6 pt-3 text-center">
          {cured ? <HeartBurst /> : null}
          <div className="flex flex-wrap items-center justify-center gap-6">
            <VillagerArt v={v} cured={cured} className={`zr-class-villager flex-none ${cured ? 'zr-bob' : 'zr-sway'}`} />
            <p className="zr-class-expr font-display tabular-nums">
              {fact.groups} × {fact.each} = {round.revealed ? <span className="text-green-700">{fact.groups * fact.each}</span> : '?'}
            </p>
          </div>
          {!round.revealed && think > 0 ? (
            <div className="h-3 w-full max-w-xl overflow-hidden rounded-full bg-[#CFE9EE]" aria-hidden="true">
              <div className="h-full rounded-full bg-[#1E9AAE] transition-[width] duration-200" style={{ width: `${(leftMs / (think * 1000)) * 100}%` }} />
            </div>
          ) : null}
          {round.revealed ? (
            <div className="zr-class-visual">
              <QuestionVisual visual={classVisual(fact)} />
              <p className="mt-2 text-lg font-bold text-slate-600">
                {fact.groups} กลุ่ม กลุ่มละ {fact.each} รวมเป็น {fact.groups * fact.each}
              </p>
            </div>
          ) : (
            <p className="text-xl font-bold text-slate-600">🤔 ช่วยกันคิด แล้วตอบพร้อมกันนะ!</p>
          )}
          {round.marked !== null ? (
            <p className={`text-2xl font-bold ${cured ? 'text-green-700' : 'text-red-600'}`}>
              {cured ? `น้อง${v.name}หายป่วยแล้ว! ขอบคุณทุกคน 💉` : 'ไม่เป็นไร จำไว้แล้วลองใหม่นะ'}
            </p>
          ) : round.revealed ? (
            <div className="flex flex-wrap justify-center gap-3">
              <Button size="lg" variant="secondary" onClick={() => mark(false)}>
                ✘ ยังไม่ถูก
              </Button>
              <Button size="lg" onClick={() => mark(true)}>
                ✔ ทั้งห้องตอบถูก
              </Button>
            </div>
          ) : (
            <Button size="lg" onClick={reveal}>
              💡 เฉลย
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
