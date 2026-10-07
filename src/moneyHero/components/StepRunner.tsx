import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { BookOpen, Lightbulb, RotateCcw } from 'lucide-react'
import type { CheckResult, Question, Response } from '../engine/types'
import type { LearnSlide } from '../data/levels'
import { ENCOURAGE, PRAISE } from '../data/characters'
import { answerText, checkAnswer } from '../engine/check'
import { recordAnswer } from '../engine/progress'
import { earn } from '../engine/ledger'
import { scoreAnswer } from '../engine/scoring'
import { regenerate } from '../generators'
import { useGame } from '../hooks/useMoneyGame'
import { pick } from '../utils/random'
import { playSound } from '../utils/sound'
import { speak, stopSpeaking } from '../utils/speech'
import { HintPanel, QuestionView } from './QuestionView'
import { LearnSlides } from './LearnSlides'
import { Burst } from './Effects'
import { AvatarArt, CharacterArt } from './Art'

/**
 * ตัวเดินโจทย์ของขั้น PRACTICE / MISSION / BOSS / แบบทดสอบ / ฝึกข้อที่เคยผิด
 *
 * ตอบผิดครั้งแรก: "ลองคิดอีกครั้ง" + คำแนะนำเฉพาะจุด + วิธีคิดบางส่วน แล้วให้ตอบใหม่
 * ตอบผิดครั้งที่สอง: แสดงวิธีคิดทีละขั้นพร้อมคำตอบ แล้วเพิ่มโจทย์ "แบบเดียวกันแต่ตัวเลขใหม่"
 *                    ต่อท้ายให้ฝึกซ้ำ (ข้อฝึกซ้ำไม่นับดาว แต่ได้ EXP)
 * โหมดแบบทดสอบ: ไม่บอกถูกผิด บันทึกผลแล้วไปข้อต่อไปทันที
 */

export type RunMode = 'practice' | 'mission' | 'boss' | 'test' | 'review'

export interface RunSummary {
  /** จำนวนข้อหลัก (ไม่นับข้อฝึกซ้ำ) */
  originals: number
  /** ถูกตั้งแต่ครั้งแรก */
  firstTry: number
  /** ถูกภายใน 2 ครั้ง */
  within2: number
  hints: number
  ms: number
  exp: number
  coins: number
  bySkill: Record<string, { correct: number; total: number }>
}

interface Item {
  q: Question
  retry: boolean
}

type Phase = 'answer' | 'right' | 'wrong' | 'reveal'

declare global {
  interface Window {
    __MH_DEBUG?: { question: Question; phase: string; index: number; total: number }
  }
}

export function StepRunner({
  questions,
  levelId,
  mode,
  learn,
  earnLabel,
  onAnswer,
  onFinish,
}: {
  questions: Question[]
  levelId: number
  mode: RunMode
  learn?: LearnSlide[]
  /** ชื่อรายการในสมุดบัญชีเมื่อได้เหรียญจากการตอบถูก */
  earnLabel?: string
  onAnswer?: (q: Question, r: Response, correct: boolean) => void
  onFinish: (s: RunSummary) => void
}) {
  const { updatePlayer, player } = useGame()
  const [items, setItems] = useState<Item[]>(() => questions.map((q) => ({ q, retry: false })))
  const [index, setIndex] = useState(0)
  const [attempt, setAttempt] = useState(1)
  const [phase, setPhase] = useState<Phase>('answer')
  const [result, setResult] = useState<CheckResult | null>(null)
  const [hintLevel, setHintLevel] = useState(0)
  const [inputKey, setInputKey] = useState(0)
  const [showLearn, setShowLearn] = useState(false)
  const [gain, setGain] = useState<{ exp: number; coins: number; bonuses: string[] } | null>(null)
  const [message, setMessage] = useState('')
  const started = useRef(Date.now())
  const streak = useRef(player?.streak ?? 0)
  const summary = useRef<RunSummary>({ originals: 0, firstTry: 0, within2: 0, hints: 0, ms: 0, exp: 0, coins: 0, bySkill: {} })
  const finished = useRef(false)
  const feedbackRef = useRef<HTMLDivElement>(null)

  const item = items[index]
  const q = item?.q
  const isTest = mode === 'test'
  const originals = items.filter((it) => !it.retry).length

  useEffect(() => {
    if (q) window.__MH_DEBUG = { question: q, phase, index, total: items.length }
  }, [q, phase, index, items.length])

  useEffect(() => () => stopSpeaking(), [])

  // บนมือถือแผงผลการตอบอยู่ใต้โจทย์ เลื่อนให้เห็นเองทันที เด็กจะได้ไม่พลาด
  useEffect(() => {
    if (phase === 'answer') return
    feedbackRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [phase])

  const finish = useCallback(() => {
    if (finished.current) return
    finished.current = true
    window.__MH_DEBUG = undefined
    onFinish({ ...summary.current })
  }, [onFinish])

  const next = useCallback(() => {
    playSound('click')
    stopSpeaking()
    if (index + 1 >= items.length) {
      finish()
      return
    }
    setIndex(index + 1)
    setAttempt(1)
    setPhase('answer')
    setResult(null)
    setHintLevel(0)
    setGain(null)
    setInputKey((k) => k + 1)
    started.current = Date.now()
  }, [index, items.length, finish])

  const submit = useCallback(
    (r: Response) => {
      if (!q || phase !== 'answer') return
      const res = checkAnswer(q, r)
      const ms = Date.now() - started.current
      onAnswer?.(q, r, res.correct)

      // บันทึกสถิติทักษะเฉพาะการตอบครั้งแรกของแต่ละข้อ
      if (attempt === 1) {
        const s = summary.current
        if (!item.retry) {
          s.originals += 1
          if (res.correct) s.firstTry += 1
          const sk = (s.bySkill[q.skill] ??= { correct: 0, total: 0 })
          sk.total += 1
          if (res.correct) sk.correct += 1
        }
        s.ms += ms
        s.hints += hintLevel
        updatePlayer((p) => recordAnswer(p, q, isTest ? -1 : levelId, res.correct, ms, hintLevel))
      }

      if (isTest) {
        setMessage('บันทึกแล้ว ✔')
        window.setTimeout(() => setMessage(''), 600)
        if (index + 1 >= items.length) finish()
        else {
          setIndex(index + 1)
          setInputKey((k) => k + 1)
          started.current = Date.now()
        }
        return
      }

      if (res.correct) {
        const score = scoreAnswer({ correct: true, attempt, streak: streak.current, ms, hintsUsed: hintLevel })
        streak.current += attempt === 1 ? 1 : 0
        if (attempt > 1) streak.current = 0
        if (!item.retry) summary.current.within2 += 1
        summary.current.exp += score.exp
        summary.current.coins += score.coins
        updatePlayer((p) => ({
          ...earn(p, score.coins, earnLabel ?? (levelId >= 0 ? `ตอบถูก ด่าน ${levelId}` : 'ตอบโจทย์ถูก'), '✅'),
          exp: p.exp + score.exp,
          fixedMistakes: item.retry || mode === 'review' ? p.fixedMistakes + 1 : p.fixedMistakes,
        }))
        setGain(score)
        setResult(res)
        setPhase('right')
        playSound('correct')
        window.setTimeout(() => playSound('coin'), 250)
        return
      }

      streak.current = 0
      setResult(res)
      playSound('wrong')
      if (attempt === 1) {
        setPhase('wrong')
      } else {
        setPhase('reveal')
        // ฝึกซ้ำ: โจทย์แบบเดียวกันแต่ตัวเลขใหม่ ต่อท้ายชุด (ข้อละครั้ง)
        if (!item.retry && mode !== 'review') {
          try {
            const again = regenerate(q.gen, q.difficulty)
            setItems((list) => [...list, { q: again, retry: true }])
          } catch {
            // สร้างโจทย์ซ้ำไม่ได้ ข้ามไป
          }
        }
      }
    },
    [q, phase, attempt, item, hintLevel, isTest, levelId, updatePlayer, onAnswer, index, items.length, finish, mode],
  )

  const tryAgain = () => {
    playSound('click')
    setAttempt((a) => a + 1)
    setPhase('answer')
    setResult(null)
    setInputKey((k) => k + 1)
  }

  const praise = useMemo(() => pick(PRAISE), [index, phase])
  const encourage = useMemo(() => pick(ENCOURAGE), [index, attempt])

  if (!q) return null
  const explain = result?.explain ?? q.explain
  const progress = Math.round((index / items.length) * 100)

  return (
    <div className={`mh-runner mh-mode-${mode}`}>
      <div className="mh-runner-top">
        <span className="mh-runner-count" data-testid="mh-count">
          {item.retry ? '🔁 ฝึกซ้ำ' : `ข้อ ${Math.min(index + 1, originals)} / ${originals}`}
        </span>
        <div className="mh-progress mh-runner-bar">
          <div style={{ width: `${progress}%` }} />
        </div>
        {!isTest && streak.current >= 2 && <span className="mh-streak">🔥 {streak.current}</span>}
      </div>

      <div className="mh-card mh-q-card">
        <QuestionView
          q={q}
          inputKey={inputKey}
          disabled={phase !== 'answer'}
          wrongKeys={phase === 'wrong' || phase === 'reveal' ? result?.wrongKeys : undefined}
          onSubmit={submit}
        />

        {!isTest && phase === 'answer' && (
          <div className="mh-q-tools">
            <button
              type="button"
              className="mh-tool"
              data-testid="mh-hint-btn"
              disabled={hintLevel >= 3}
              onClick={() => {
                playSound('click')
                setHintLevel((h) => Math.min(3, h + 1))
              }}
            >
              <Lightbulb size={20} /> ตัวช่วย {hintLevel > 0 ? `(${hintLevel}/3)` : ''}
            </button>
            {learn && learn.length > 0 && (
              <button type="button" className="mh-tool" onClick={() => setShowLearn(true)}>
                <BookOpen size={20} /> เรียนรู้ใหม่
              </button>
            )}
            <button type="button" className="mh-tool" onClick={() => setInputKey((k) => k + 1)}>
              <RotateCcw size={20} /> ลองอีกครั้ง
            </button>
          </div>
        )}
        {!isTest && phase === 'answer' && <HintPanel q={q} level={hintLevel} />}
        {message && <div className="mh-saved">{message}</div>}
      </div>

      {phase === 'right' && (
        <div className="mh-feedback mh-feedback-right" data-testid="mh-feedback" role="status" ref={feedbackRef}>
          <Burst />
          {player && <AvatarArt avatar={player.avatar} size={68} mood="happy" wear={player.wear} className="mh-feedback-char" />}
          <div className="mh-feedback-head">
            <span className="mh-feedback-icon" aria-hidden="true">
              ✔
            </span>
            <strong>{praise}</strong>
            {gain && (
              <span className="mh-gain">
                +{gain.exp} EXP · +{gain.coins} 🪙
              </span>
            )}
          </div>
          {gain && gain.bonuses.length > 0 && <div className="mh-bonuses">{gain.bonuses.join(' · ')}</div>}
          <details className="mh-explain">
            <summary>📖 ดูวิธีคิด</summary>
            <ol className="mh-steps">
              {explain.map((line, i) => (
                <li key={i}>{line}</li>
              ))}
            </ol>
          </details>
          <button type="button" className="mh-btn mh-btn-go mh-btn-block" onClick={next} data-testid="mh-next">
            ไปต่อ ▶
          </button>
        </div>
      )}

      {phase === 'wrong' && (
        <div className="mh-feedback mh-feedback-wrong" data-testid="mh-feedback" role="status" ref={feedbackRef}>
          <CharacterArt id={q.npc ?? 'fox'} size={64} mood="think" className="mh-feedback-char" />
          <div className="mh-feedback-head">
            <span className="mh-feedback-icon is-wrong" aria-hidden="true">
              ↺
            </span>
            <strong>ลองคิดอีกครั้ง</strong>
          </div>
          <p className="mh-feedback-text">
            {result?.feedback ?? encourage} <span className="mh-soft">· {encourage}</span>
          </p>
          <div className="mh-explain-box">
            <b>มาดูวิธีคิดกัน</b>
            <ol className="mh-steps">
              {q.hint.partial.map((line, i) => (
                <li key={i}>{line}</li>
              ))}
              <li className="mh-steps-more">… ขั้นต่อไปลองคิดเองนะ</li>
            </ol>
          </div>
          <div className="mh-row-buttons">
            <button
              type="button"
              className="mh-btn mh-btn-soft"
              onClick={() => {
                speak(`${result?.feedback ?? ''} ${q.hint.partial.join(' ')}`)
              }}
            >
              🔈 ฟัง
            </button>
            <button type="button" className="mh-btn mh-btn-go" onClick={tryAgain} data-testid="mh-try-again">
              🔄 ลองอีกครั้ง
            </button>
          </div>
        </div>
      )}

      {phase === 'reveal' && (
        <div className="mh-feedback mh-feedback-reveal" data-testid="mh-feedback" role="status" ref={feedbackRef}>
          <CharacterArt id="owl" size={64} className="mh-feedback-char" />
          <div className="mh-feedback-head">
            <span className="mh-feedback-icon is-info" aria-hidden="true">
              💡
            </span>
            <strong>มาดูวิธีคิดทีละขั้นกัน</strong>
          </div>
          <p className="mh-feedback-text">เก่งมากที่ลองคิดเอง! ข้อนี้คิดแบบนี้นะ</p>
          <ol className="mh-steps mh-steps-full">
            {explain.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ol>
          <div className="mh-answer-line">คำตอบ: {answerText(q)}</div>
          {!item.retry && mode !== 'review' && <p className="mh-soft">🔁 เดี๋ยวจะมีข้อแบบเดียวกันให้ฝึกอีกครั้งนะ</p>}
          <button type="button" className="mh-btn mh-btn-go mh-btn-block" onClick={next} data-testid="mh-next">
            เข้าใจแล้ว ไปต่อ ▶
          </button>
        </div>
      )}

      {showLearn && learn && (
        <div className="mh-modal" role="dialog" aria-label="เรียนรู้ใหม่">
          <div className="mh-card mh-modal-card">
            <LearnSlides slides={learn} onDone={() => setShowLearn(false)} doneLabel="กลับไปทำโจทย์ ▶" />
            <button type="button" className="mh-modal-close" aria-label="ปิด" onClick={() => setShowLearn(false)}>
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
