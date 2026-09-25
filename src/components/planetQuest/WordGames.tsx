import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '../Button'
import { ConnectBoard } from '../minigames/ConnectBoard'
import { MatchingBoard } from '../minigames/MatchingBoard'
import { playSfx } from '../../services/audioService'
import {
  DUEL_COUNT,
  RIDDLE_COUNT,
  RIDDLE_MAX_POINTS,
  TRUE_FALSE_SECONDS,
  buildConnectGame,
  buildMemoryGame,
  buildRiddleRound,
  buildSortRounds,
  buildTimelineDuels,
  buildTrueFalseRound,
  comboPoints,
  connectStars,
  duelStars,
  earlierOf,
  memoryStars,
  riddlePoints,
  riddleStars,
  sortStars,
  trueFalseStars,
} from '../../planetQuest/games'
import type { TimelineEvent } from '../../planetQuest/content'
import { ChoiceList, Explain, ProgressDots, ScoreBar } from './QuestParts'
import type { StageGameProps } from './QuestParts'

/**
 * เกมบนดาวที่เล่นด้วยการแตะ (ทุกด่านยกเว้นโลกและดาวเสาร์)
 *
 * ทุกเกมมีคะแนนและคอมโบให้ลุ้นระหว่างเล่น ตอบถูกติดกันคะแนนพุ่ง
 * แต่ดาวที่ได้ตอนจบยังคิดจากจำนวนครั้งที่พลาด ไม่ได้คิดจากคะแนน
 * เด็กที่คิดช้าแต่รอบคอบจึงได้ดาวเท่าเด็กที่กดเร็ว
 *
 * ดาวพุธกับดาวอังคารใช้กระดานของมินิเกมคณิตศาสตร์ตัวเดิม
 */

/** คะแนนกับคอมโบของเกมหนึ่งรอบ */
function useCombo() {
  const [score, setScore] = useState(0)
  const [streak, setStreak] = useState(0)
  const [pop, setPop] = useState<{ id: number; points: number; streak: number } | null>(null)
  const streakRef = useRef(0)

  const hit = useCallback(() => {
    streakRef.current += 1
    const points = comboPoints(streakRef.current)
    setStreak(streakRef.current)
    setScore((total) => total + points)
    setPop({ id: Date.now(), points, streak: streakRef.current })
  }, [])

  const miss = useCallback(() => {
    streakRef.current = 0
    setStreak(0)
  }, [])

  return { score, streak, pop, hit, miss }
}

/* ---------- ดาวพุธ · ไพ่ความจำ ---------- */

export function MemoryStage({ seed, onFinish }: StageGameProps) {
  const game = useMemo(() => buildMemoryGame(seed), [seed])
  const misses = useRef(0)
  const [misCount, setMisCount] = useState(0)
  const [seconds, setSeconds] = useState(0)
  const [solvedAt, setSolvedAt] = useState<number | null>(null)
  const combo = useCombo()

  // นาฬิกาจับเวลาแข่งกับความเร็วของดาวพุธ มีไว้ลุ้นเฉย ๆ ไม่ได้ใช้ตัดสินดาว
  useEffect(() => {
    if (solvedAt !== null) return
    const timer = window.setInterval(() => setSeconds((value) => value + 1), 1000)
    return () => window.clearInterval(timer)
  }, [solvedAt])

  const { hit, miss } = combo
  const answer = useCallback(
    (correct: boolean) => {
      if (correct) {
        playSfx('correct')
        hit()
        return
      }
      playSfx('wrong')
      miss()
      misses.current += 1
      setMisCount(misses.current)
    },
    [hit, miss],
  )

  const solved = useCallback(() => {
    playSfx('victory')
    setSolvedAt(Date.now())
    onFinish({
      stars: memoryStars(misses.current),
      summary: `จับคู่ครบ ${game.pairCount} คู่ เปิดผิด ${misses.current} ครั้ง`,
    })
  }, [game.pairCount, onFinish])

  return (
    <div className="space-y-3">
      <ScoreBar score={combo.score} streak={combo.streak} pop={combo.pop}>
        ⏱️ {seconds} วินาที · เปิดผิด {misCount}
      </ScoreBar>
      <p className="text-sm text-slate-300">ไพ่สีฟ้า = ชื่อดาว · ไพ่สีทอง = จุดเด่น · จับคู่ให้ไวเหมือนดาวพุธ!</p>
      <MatchingBoard game={game} onAnswer={answer} onSolved={solved} />
    </div>
  )
}

/* ---------- ดาวศุกร์ · จริงหรือไม่ ---------- */

export function TrueFalseStage({ seed, onFinish }: StageGameProps) {
  const round = useMemo(() => buildTrueFalseRound(seed), [seed])
  const [index, setIndex] = useState(0)
  const [correct, setCorrect] = useState(0)
  const [answered, setAnswered] = useState<boolean | 'timeout' | null>(null)
  const [left, setLeft] = useState(TRUE_FALSE_SECONDS)
  const combo = useCombo()

  const item = round[index]
  const wrongSoFar = index + (answered === null ? 0 : 1) - correct
  const heat = Math.min(100, Math.round((wrongSoFar / 4) * 100))

  // นับถอยหลังทีละสิบส่วนวินาที หมดเวลาแล้วนับเป็นตอบไม่ทัน ยานร้อนขึ้นหนึ่งขั้น
  useEffect(() => {
    if (answered !== null) return
    const timer = window.setInterval(() => {
      setLeft((value) => Math.max(0, value - 0.1))
    }, 100)
    return () => window.clearInterval(timer)
  }, [answered, index])

  const { miss } = combo
  useEffect(() => {
    if (left > 0 || answered !== null) return
    playSfx('hurt')
    miss()
    setAnswered('timeout')
  }, [answered, left, miss])

  if (!item) return null

  const choose = (value: boolean): void => {
    if (answered !== null) return
    const right = value === item.truth
    playSfx(right ? 'correct' : 'wrong')
    setAnswered(value)
    if (right) {
      setCorrect((count) => count + 1)
      combo.hit()
    } else {
      combo.miss()
    }
  }

  const next = (): void => {
    if (index + 1 >= round.length) {
      onFinish({ stars: trueFalseStars(correct), summary: `ตอบถูก ${correct} จาก ${round.length} ข้อ · ${combo.score} คะแนน` })
      return
    }
    setIndex(index + 1)
    setAnswered(null)
    setLeft(TRUE_FALSE_SECONDS)
  }

  const right = answered !== null && answered !== 'timeout' && answered === item.truth

  return (
    <div className="space-y-3">
      <ScoreBar score={combo.score} streak={combo.streak} pop={combo.pop}>
        ข้อ {index + 1}/{round.length}
      </ScoreBar>
      <div className="flex items-center gap-3 text-xs font-bold text-slate-300">
        <span>🌡️ ยานร้อน</span>
        <div className="bar-track h-2.5 flex-1">
          <div className="bar-fill pq-heat h-full" style={{ width: `${Math.max(4, heat)}%` }} />
        </div>
      </div>

      <div className="sol-comms p-5 text-center">
        <div className="bar-track mx-auto h-1.5 max-w-sm">
          <div
            className={`bar-fill h-full ${left < 4 ? 'pq-heat' : ''}`}
            style={{ width: `${(left / TRUE_FALSE_SECONDS) * 100}%` }}
          />
        </div>
        <p className="mt-3 text-xl font-black leading-relaxed text-white sm:text-2xl">{item.text}</p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          {[true, false].map((value) => {
            const chosen = answered === value
            const reveal = answered !== null && value === item.truth
            return (
              <button
                key={String(value)}
                type="button"
                disabled={answered !== null}
                onClick={() => choose(value)}
                className={`sol-opt pq-opt-center min-h-[64px] text-xl ${reveal ? 'sol-opt-right' : chosen ? 'sol-opt-wrong' : ''}`}
              >
                {value ? '👍 จริง' : '👎 ไม่จริง'}
              </button>
            )
          })}
        </div>
        {answered !== null ? (
          <div className="text-left">
            <Explain
              tone={right ? 'good' : 'bad'}
              title={right ? 'ถูกเผง! 🎯' : answered === 'timeout' ? `หมดเวลา! ข้อนี้${item.truth ? 'จริง' : 'ไม่จริง'}` : `อุ๊ย! ข้อนี้${item.truth ? 'จริง' : 'ไม่จริง'}`}
            >
              {item.explain}
            </Explain>
          </div>
        ) : null}
      </div>

      {answered !== null ? (
        <div className="flex justify-end">
          <Button size="lg" onClick={next} icon="➡️">
            {index + 1 >= round.length ? 'จบด่าน' : 'ข้อต่อไป'}
          </Button>
        </div>
      ) : null}
    </div>
  )
}

/* ---------- ดาวอังคาร · โยงเส้นเทคโนโลยี ---------- */

export function ConnectStage({ seed, onFinish }: StageGameProps) {
  const game = useMemo(() => buildConnectGame(seed), [seed])
  const wrongLinks = useRef(0)
  const [wrongCount, setWrongCount] = useState(0)
  const combo = useCombo()

  const { hit, miss } = combo
  const answer = useCallback(
    (correct: boolean) => {
      playSfx(correct ? 'correct' : 'wrong')
      if (correct) {
        hit()
        return
      }
      miss()
      wrongLinks.current += 1
      setWrongCount(wrongLinks.current)
    },
    [hit, miss],
  )

  const solved = useCallback(() => {
    playSfx('victory')
    onFinish({
      stars: connectStars(wrongLinks.current),
      summary: `ต่อสายครบ ${Object.keys(game.solution).length} เส้น ต่อผิด ${wrongLinks.current} ครั้ง`,
    })
  }, [game.solution, onFinish])

  return (
    <div className="space-y-3">
      <ScoreBar score={combo.score} streak={combo.streak} pop={combo.pop}>
        ต่อผิด {wrongCount}
      </ScoreBar>
      <p className="text-sm text-slate-300">ระบบของฐานบนดาวอังคารสายหลุด! แตะเครื่องมือทางซ้าย แล้วแตะหน้าที่ของมันทางขวา</p>
      <ConnectBoard game={game} onAnswer={answer} onSolved={solved} />
    </div>
  )
}

/* ---------- ดาวพฤหัสบดี · คัดแยกลงกล่อง ---------- */

export function SortStage({ seed, reduceMotion, onFinish }: StageGameProps) {
  const rounds = useMemo(() => buildSortRounds(seed), [seed])
  const [roundIndex, setRoundIndex] = useState(0)
  const [itemIndex, setItemIndex] = useState(0)
  const [placed, setPlaced] = useState<Record<string, string[]>>({})
  const [mistakes, setMistakes] = useState(0)
  const [feedback, setFeedback] = useState<{ right: boolean; text: string; bin: string } | null>(null)
  const combo = useCombo()

  const round = rounds[roundIndex]
  const item = round?.items[itemIndex]
  const total = rounds.reduce((sum, entry) => sum + entry.items.length, 0)
  const done = rounds.slice(0, roundIndex).reduce((sum, entry) => sum + entry.items.length, 0) + itemIndex

  const next = useCallback(() => {
    setFeedback(null)
    const current = rounds[roundIndex]
    if (!current) return
    if (itemIndex + 1 < current.items.length) {
      setItemIndex(itemIndex + 1)
      return
    }
    if (roundIndex + 1 < rounds.length) {
      setRoundIndex(roundIndex + 1)
      setItemIndex(0)
      setPlaced({})
      return
    }
    onFinish({ stars: sortStars(mistakes), summary: `คัดแยกครบ ${total} ชิ้น วางผิด ${mistakes} ครั้ง · ${combo.score} คะแนน` })
  }, [combo.score, itemIndex, mistakes, onFinish, roundIndex, rounds, total])

  /*
   * วางถูกแล้วไปชิ้นต่อไปเองในไม่ถึงวินาที เกมจึงเดินเร็วเหมือนสายพานคัดของ
   * วางผิดจะรอให้กดเอง เพราะต้องมีเวลาอ่านว่าที่ถูกคือกล่องไหน
   */
  useEffect(() => {
    if (!feedback?.right) return
    const timer = window.setTimeout(next, reduceMotion ? 1400 : 1000)
    return () => window.clearTimeout(timer)
  }, [feedback, next, reduceMotion])

  if (!round || !item) return null

  const choose = (binId: string): void => {
    if (feedback) return
    const right = binId === item.bin
    playSfx(right ? 'correct' : 'wrong')
    if (right) combo.hit()
    else {
      combo.miss()
      setMistakes((count) => count + 1)
    }
    const binLabel = round.bins.find((bin) => bin.id === item.bin)?.label ?? ''
    setFeedback({ right, text: item.explain, bin: binLabel })
    // ของถูกวางลงกล่องที่ถูกเสมอ เด็กจะได้เห็นภาพที่ถูกต้องค้างไว้
    setPlaced((current) => ({ ...current, [item.bin]: [...(current[item.bin] ?? []), item.label] }))
  }

  return (
    <div className="space-y-3">
      <ScoreBar score={combo.score} streak={combo.streak} pop={combo.pop}>
        ชิ้นที่ {Math.min(done + 1, total)}/{total}
      </ScoreBar>
      <ProgressDots total={total} current={done} />
      <p className="text-sm font-bold text-cyan-200">
        สายพานที่ {roundIndex + 1}/{rounds.length}: {round.title}
      </p>

      <div className="sol-comms p-5 text-center">
        <p className="text-xs font-bold text-slate-400">ของชิ้นนี้ลงกล่องไหนดี?</p>
        <p key={`${roundIndex}-${itemIndex}`} className={`mt-1 text-3xl font-black text-white ${reduceMotion ? '' : 'pq-drop-in'}`}>
          {item.label}
        </p>
      </div>

      <div className={`grid gap-2 ${round.bins.length > 3 ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5' : 'grid-cols-2'}`}>
        {round.bins.map((bin) => (
          <button
            key={bin.id}
            type="button"
            disabled={feedback !== null}
            onClick={() => choose(bin.id)}
            className={`pq-bin ${feedback && feedback.bin === bin.label ? 'pq-bin-on' : ''}`}
          >
            <span className="block text-base font-black text-white">📦 {bin.label}</span>
            <span className="block text-xs text-slate-300">{bin.hint}</span>
            {(placed[bin.id] ?? []).length > 0 ? (
              <span className="mt-2 block text-xs font-semibold text-leaf-200">{(placed[bin.id] ?? []).join(' · ')}</span>
            ) : null}
          </button>
        ))}
      </div>

      {feedback ? (
        <>
          <Explain
            tone={feedback.right ? 'good' : 'bad'}
            title={feedback.right ? 'ลงกล่องถูก! 📦✨' : `อุ๊ย! ${item.label} อยู่กล่อง "${feedback.bin}"`}
          >
            {feedback.text}
          </Explain>
          {feedback.right ? null : (
            <div className="flex justify-end">
              <Button onClick={next} icon="➡️">
                เข้าใจแล้ว ไปต่อ
              </Button>
            </div>
          )}
        </>
      ) : null}
    </div>
  )
}

/* ---------- ดาวยูเรนัส · อะไรมาก่อน ---------- */

function DuelCard({
  event,
  onPick,
  state,
}: {
  event: TimelineEvent
  onPick: () => void
  state: 'idle' | 'right' | 'wrong' | 'other'
}) {
  return (
    <button
      type="button"
      disabled={state !== 'idle'}
      onClick={onPick}
      className={`pq-duel ${state === 'right' ? 'pq-duel-right' : state === 'wrong' ? 'pq-duel-wrong' : ''}`}
    >
      <span className="text-4xl" aria-hidden="true">
        {event.icon}
      </span>
      <span className="mt-2 block text-base font-bold leading-snug text-white">{event.text}</span>
      {state !== 'idle' ? <span className="mt-2 block text-lg font-black text-gold-300">ค.ศ. {event.year}</span> : null}
    </button>
  )
}

export function TimelineStage({ seed, onFinish }: StageGameProps) {
  const duels = useMemo(() => buildTimelineDuels(seed), [seed])
  const [index, setIndex] = useState(0)
  const [picked, setPicked] = useState<string | null>(null)
  const [correct, setCorrect] = useState(0)
  const combo = useCombo()

  const duel = duels[index]
  if (!duel) return null
  const first = earlierOf(duel)

  const pick = (event: TimelineEvent): void => {
    if (picked) return
    setPicked(event.id)
    if (event.id === first.id) {
      playSfx('correct')
      setCorrect((count) => count + 1)
      combo.hit()
    } else {
      playSfx('wrong')
      combo.miss()
    }
  }

  const next = (): void => {
    if (index + 1 >= duels.length) {
      onFinish({ stars: duelStars(correct), summary: `ทายถูก ${correct} จาก ${duels.length} คู่ · ${combo.score} คะแนน` })
      return
    }
    setIndex(index + 1)
    setPicked(null)
  }

  const stateOf = (event: TimelineEvent): 'idle' | 'right' | 'wrong' | 'other' => {
    if (!picked) return 'idle'
    if (event.id === first.id) return 'right'
    return event.id === picked ? 'wrong' : 'other'
  }

  const gap = Math.abs(duel.left.year - duel.right.year)

  return (
    <div className="space-y-3">
      <ScoreBar score={combo.score} streak={combo.streak} pop={combo.pop}>
        คู่ที่ {index + 1}/{DUEL_COUNT}
      </ScoreBar>
      <p className="text-center text-lg font-black text-white">⏳ เรื่องไหนเกิดขึ้น <span className="text-gold-300">ก่อน</span>?</p>

      <div className="grid grid-cols-2 items-stretch gap-3">
        <DuelCard event={duel.left} state={stateOf(duel.left)} onPick={() => pick(duel.left)} />
        <DuelCard event={duel.right} state={stateOf(duel.right)} onPick={() => pick(duel.right)} />
      </div>

      {picked ? (
        <>
          <Explain tone={picked === first.id ? 'good' : 'bad'} title={picked === first.id ? 'ถูกต้อง! ⏪' : 'อุ๊ย! สลับกัน'}>
            {first.text} เกิดก่อน ห่างกัน {gap} ปี
          </Explain>
          <div className="flex justify-end">
            <Button size="lg" onClick={next} icon="➡️">
              {index + 1 >= duels.length ? 'จบด่าน' : 'คู่ต่อไป'}
            </Button>
          </div>
        </>
      ) : null}
    </div>
  )
}

/* ---------- ดาวเนปจูน · ฉันคือใคร ---------- */

export function RiddleStage({ seed, onFinish }: StageGameProps) {
  const round = useMemo(() => buildRiddleRound(seed), [seed])
  const [index, setIndex] = useState(0)
  const [shown, setShown] = useState(1)
  const [wrong, setWrong] = useState<string[]>([])
  const [solved, setSolved] = useState(false)
  const [points, setPoints] = useState(0)
  const [gained, setGained] = useState(0)

  const riddle = round[index]
  if (!riddle) return null

  const pick = (option: string): void => {
    if (solved) return
    if (option === riddle.answer) {
      const earned = riddlePoints(shown, wrong.length)
      playSfx(earned >= 3 ? 'levelUp' : 'correct')
      setSolved(true)
      setGained(earned)
      setPoints((total) => total + earned)
      return
    }
    playSfx('wrong')
    setWrong((current) => [...current, option])
    // ตอบผิดแล้วเปิดใบ้ถัดไปให้เลย เด็กจะไม่ติดอยู่กับใบ้ที่อ่านแล้วไม่รู้
    setShown((count) => Math.min(riddle.clues.length, count + 1))
  }

  const next = (): void => {
    if (index + 1 >= round.length) {
      onFinish({ stars: riddleStars(points), summary: `ได้ ${points} จาก ${RIDDLE_MAX_POINTS} คะแนนนักสืบ` })
      return
    }
    setIndex(index + 1)
    setShown(1)
    setWrong([])
    setSolved(false)
  }

  const worth = riddlePoints(shown, wrong.length)

  return (
    <div className="space-y-3">
      <ProgressDots total={RIDDLE_COUNT} current={index} />
      <div className="flex items-center justify-between text-sm font-bold">
        <span className="text-cyan-200">
          🕵️ คดีที่ {index + 1}/{round.length}
        </span>
        <span className="text-gold-300">🔎 คะแนนนักสืบ {points}</span>
      </div>

      <div className="sol-comms p-4">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-300">
          ฉันคือใคร? {solved ? '' : `· ทายตอนนี้ได้ ${worth} คะแนน`}
        </p>
        <ol className="mt-2 space-y-1.5">
          {riddle.clues.slice(0, solved ? riddle.clues.length : shown).map((clue, order) => (
            <li key={clue} className="rounded-lg bg-white/5 px-3 py-2 text-base font-semibold text-white">
              <span className="mr-2 text-xs text-cyan-300">ใบ้ {order + 1}</span>
              {clue}
            </li>
          ))}
        </ol>
        {!solved && shown < riddle.clues.length ? (
          <div className="mt-2">
            <Button variant="ghost" onClick={() => setShown((count) => count + 1)} icon="💡">
              ขอใบ้เพิ่ม
            </Button>
          </div>
        ) : null}
      </div>

      <ChoiceList options={riddle.options} answer={riddle.answer} wrong={wrong} solved={solved} onPick={pick} />

      {solved ? (
        <>
          <Explain tone="good" title={`จับได้แล้ว! ฉันคือ${riddle.answer} · +${gained} คะแนน`}>
            {gained >= 4 ? 'ทายได้ตั้งแต่ใบ้แรก สุดยอดนักสืบ!' : 'เก่งมาก ลองทายให้เร็วขึ้นในคดีต่อไปนะ'}
          </Explain>
          <div className="flex justify-end">
            <Button size="lg" onClick={next} icon="➡️">
              {index + 1 >= round.length ? 'ปิดคดี' : 'คดีต่อไป'}
            </Button>
          </div>
        </>
      ) : null}
    </div>
  )
}
