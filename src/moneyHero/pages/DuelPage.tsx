import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import type { ChoiceQ } from '../engine/types'
import { useGame } from '../hooks/useMoneyGame'
import { buildDuel, DUEL_ROUNDS, duelWinner, nextDuel, startDuel, tapDuel, type DuelState, type Side } from '../engine/duel'
import { MoneyPile } from '../components/Art'
import { VisualView } from '../components/Visual'
import { Confetti } from '../components/Effects'
import { playSound } from '../utils/sound'
import { speak } from '../utils/speech'

/**
 * ดวลสองคน: แตะคำตอบที่ถูกก่อนได้แต้ม เล่นบนเครื่องเดียว
 * แบบนั่งตรงข้ามกัน (ฝั่งบนหมุนกลับหัว) หรือนั่งข้างกัน (ซ้าย/ขวา)
 * เส้นทาง #/duel
 */

declare global {
  interface Window {
    __MH_DUEL?: { answer: string; index: number }
  }
}

const COLORS = ['red', 'blue'] as const

function Zone({
  side,
  name,
  q,
  state,
  onTap,
}: {
  side: Side
  name: string
  q: ChoiceQ
  state: DuelState
  onTap: (side: Side, id: string) => void
}) {
  const done = state.winner !== null
  const won = state.winner === side
  const locked = state.locked[side]
  return (
    <div className={`mh-duel-zone is-${COLORS[side]} ${won ? 'is-won' : ''} ${locked ? 'is-locked' : ''}`} data-testid={`mh-duel-zone-${side}`}>
      <div className="mh-duel-zone-head">
        <b>{name}</b>
        <span className="mh-duel-score" data-testid={`mh-duel-score-${side}`}>
          ⭐ {state.scores[side]}
        </span>
      </div>
      <p className="mh-duel-title">{q.title}</p>
      <div className={`mh-choices mh-choices-${q.layout} mh-duel-choices`} role="group" aria-label={`ตัวเลือกของ${name}`}>
        {q.options.map((o) => {
          const hasMoney = !!o.money && o.money.length > 0
          const isAnswer = done && o.id === q.answer
          const isWrong = state.wrong[side] === o.id
          return (
            <button
              key={o.id}
              type="button"
              data-testid={`mh-duel-opt-${side}-${o.id}`}
              className={`mh-choice ${hasMoney ? 'has-money' : ''} ${isAnswer ? 'is-answer' : ''} ${isWrong ? 'is-wrong' : ''}`}
              disabled={done || locked}
              onClick={() => onTap(side, o.id)}
              aria-label={o.label}
            >
              {o.symbol && <span className="mh-choice-symbol">{o.symbol}</span>}
              {hasMoney && <MoneyPile items={o.money!} base={q.layout === 'grid' ? 48 : 36} />}
              {(!hasMoney || q.layout !== 'grid') && <span className="mh-choice-label">{o.label}</span>}
              {isWrong && <span className="mh-mark-wrong">✗</span>}
            </button>
          )
        })}
      </div>
      {won && <div className="mh-duel-flag">✔ ตอบถูกก่อน! +1</div>}
      {locked && !done && <div className="mh-duel-flag is-wait">❌ ข้อนี้รอเพื่อนนะ</div>}
    </div>
  )
}

export function DuelPage() {
  const { player } = useGame()
  const [names, setNames] = useState<[string, string]>([player?.name || 'ทีมแดง', 'ทีมฟ้า'])
  const [layout, setLayout] = useState<'face' | 'side'>('face')
  const [questions, setQuestions] = useState<ChoiceQ[] | null>(null)
  const [state, setState] = useState<DuelState>(startDuel())
  const q = questions?.[state.index]

  useEffect(() => {
    if (q) window.__MH_DUEL = { answer: q.answer, index: state.index }
    return () => {
      window.__MH_DUEL = undefined
    }
  }, [q, state.index])

  const begin = () => {
    playSound('click')
    setQuestions(buildDuel())
    setState(startDuel())
    speak('เริ่มดวลได้ ใครแตะคำตอบที่ถูกก่อนได้แต้ม')
  }

  const tap = (side: Side, id: string) => {
    if (!q) return
    const next = tapDuel(state, side, id, q.answer)
    if (next === state) return
    setState(next)
    if (next.winner === side) {
      playSound('correct')
      speak(`${names[side]} ตอบถูกก่อน`)
    } else {
      playSound('wrong')
      if (next.winner === 'none') speak('ยังไม่มีใครถูก มาดูคำตอบกัน')
    }
  }

  const finished = questions !== null && state.index >= questions.length

  useEffect(() => {
    if (!finished) return
    const w = duelWinner(state)
    playSound('complete')
    speak(w === 'tie' ? 'เสมอกัน เก่งทั้งคู่เลย' : `${names[w]} ชนะ`)
    // พูดครั้งเดียวตอนจบ
  }, [finished])

  return (
    <div className="mh-page mh-duel-page" data-testid="mh-duel-page">
      <div className="mh-page-head">
        <Link to={player ? '/map' : '/start'} className="mh-icon-btn" aria-label="กลับ">
          <ArrowLeft size={24} />
        </Link>
        <h1 className="mh-title">⚔️ ดวลสองคน</h1>
      </div>

      {!questions && (
        <div className="mh-card mh-duel-setup">
          <p>
            เล่นกับเพื่อนบนเครื่องเดียวกัน {DUEL_ROUNDS} ข้อ · ใครแตะคำตอบที่ถูก<b>ก่อน</b>ได้ 1 ดาว · แตะผิดต้องรอข้อต่อไป
          </p>
          <div className="mh-duel-names">
            {([0, 1] as Side[]).map((side) => (
              <label key={side} className={`mh-duel-name is-${COLORS[side]}`}>
                {side === 0 ? '🔴' : '🔵'}
                <input
                  value={names[side]}
                  maxLength={14}
                  data-testid={`mh-duel-name-${side}`}
                  aria-label={`ชื่อผู้เล่นฝั่ง${side === 0 ? 'แดง' : 'ฟ้า'}`}
                  onChange={(e) => {
                    const n: [string, string] = [...names]
                    n[side] = e.target.value
                    setNames(n)
                  }}
                />
              </label>
            ))}
          </div>
          <div className="mh-duel-layouts" role="radiogroup" aria-label="วิธีนั่ง">
            <button type="button" role="radio" aria-checked={layout === 'face'} className={`mh-chip ${layout === 'face' ? 'is-on' : ''}`} onClick={() => setLayout('face')}>
              🔄 นั่งตรงข้ามกัน (วางแท็บเล็ตตรงกลาง)
            </button>
            <button type="button" role="radio" aria-checked={layout === 'side'} className={`mh-chip ${layout === 'side' ? 'is-on' : ''}`} onClick={() => setLayout('side')}>
              ↔️ นั่งข้างกัน
            </button>
          </div>
          <button type="button" className="mh-btn mh-btn-gold mh-btn-xl" data-testid="mh-duel-start" onClick={begin}>
            ⚔️ เริ่มดวล!
          </button>
        </div>
      )}

      {q && !finished && (
        <div className={`mh-duel is-${layout}`}>
          <Zone side={1} name={names[1] || 'ทีมฟ้า'} q={q} state={state} onTap={tap} />
          <div className="mh-duel-mid">
            <span className="mh-duel-round" data-testid="mh-duel-round">
              ข้อ {state.index + 1}/{questions!.length}
            </span>
            {q.visual && (
              <div className="mh-duel-visual">
                <VisualView visual={q.visual} />
              </div>
            )}
            {state.winner !== null && (
              <div className="mh-duel-banner" role="status">
                {state.winner === 'none' ? '🙈 ยังไม่มีใครถูก ดูคำตอบสีเขียวนะ' : `🎉 ${names[state.winner]} ได้ 1 ดาว!`}
                <button
                  type="button"
                  className="mh-btn mh-btn-go"
                  data-testid="mh-duel-next"
                  onClick={() => {
                    playSound('click')
                    setState(nextDuel(state))
                  }}
                >
                  {state.index + 1 >= questions!.length ? 'ดูผล 🏆' : 'ข้อต่อไป ▶'}
                </button>
              </div>
            )}
          </div>
          <Zone side={0} name={names[0] || 'ทีมแดง'} q={q} state={state} onTap={tap} />
        </div>
      )}

      {finished && (
        <div className="mh-card mh-duel-result" data-testid="mh-duel-result">
          <Confetti count={30} />
          <div className="mh-duel-trophy">🏆</div>
          <h2 className="mh-step-title">
            {duelWinner(state) === 'tie' ? 'เสมอกัน! เก่งทั้งคู่' : `${names[duelWinner(state) as Side]} ชนะ!`}
          </h2>
          <div className="mh-duel-final">
            {([0, 1] as Side[]).map((side) => (
              <span key={side} className={`mh-duel-final-card is-${COLORS[side]}`}>
                <b>{names[side]}</b>
                <span>⭐ {state.scores[side]}</span>
              </span>
            ))}
          </div>
          <div className="mh-row-buttons">
            <button type="button" className="mh-btn mh-btn-gold" data-testid="mh-duel-again" onClick={begin}>
              ⚔️ ดวลอีกครั้ง
            </button>
            <button type="button" className="mh-btn mh-btn-soft" onClick={() => setQuestions(null)}>
              ✏️ เปลี่ยนชื่อ/วิธีนั่ง
            </button>
            <Link to={player ? '/map' : '/start'} className="mh-btn mh-btn-go">
              🗺 กลับ
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
