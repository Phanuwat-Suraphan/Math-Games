import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useGame } from '../hooks/useMoneyGame'
import { earn } from '../engine/ledger'
import { logActivity } from '../engine/activity'
import { buildPuzzle } from '../engine/daily'
import {
  PALETTE,
  PICTURES,
  PUZZLE_COINS,
  PUZZLE_QUESTIONS,
  SIZE,
  cellColor,
  collectPicture,
  guessChoices,
  nextPicture,
  revealOrder,
  revealedCount,
  type Picture,
} from '../engine/pictures'
import { TopBar } from '../components/TopBar'
import { StepRunner } from '../components/StepRunner'
import { AvatarArt, CharacterArt } from '../components/Art'
import { Confetti } from '../components/Effects'
import { playSound } from '../utils/sound'

/**
 * ภาพปริศนา: ตอบถูกแต่ละข้อ ภาพพิกเซลน่ารักค่อย ๆ เผย ครบแล้วทายว่าเป็นภาพอะไร เก็บเข้าสมุดภาพ
 * เส้นทาง #/puzzle
 */

type Phase = 'pick' | 'run' | 'guess' | 'done'

/** ตารางภาพ: ช่องที่เผยแล้วมีสี ช่องที่ยังไม่เผยเป็นป้ายคำถามสีพาสเทล */
export function PixelPicture({ pic, shown, size = 'big', testId }: { pic: Picture; shown: Set<number> | 'all'; size?: 'big' | 'mini'; testId?: string }) {
  return (
    <div className={`mh-pix is-${size}`} role="img" aria-label={shown === 'all' ? pic.name : 'ภาพปริศนา'} data-testid={testId}>
      {Array.from({ length: SIZE * SIZE }, (_, i) => {
        const c = cellColor(pic, i)
        const open = shown === 'all' || shown.has(i)
        if (!open) return <span key={i} className="mh-pix-cell is-hidden" />
        return <span key={i} className={`mh-pix-cell ${open && c !== 0 ? 'is-open' : 'is-blank'}`} style={c !== 0 ? { background: PALETTE[c].hex } : undefined} />
      })}
    </div>
  )
}

export function PuzzlePage() {
  const { player, updatePlayer } = useGame()
  const [phase, setPhase] = useState<Phase>('pick')
  const [pic, setPic] = useState<Picture>(() => (player ? nextPicture(player) : PICTURES[0]))
  const [correct, setCorrect] = useState(0)
  const [round, setRound] = useState(0)
  const [guessWrong, setGuessWrong] = useState<string[]>([])
  const [bonus, setBonus] = useState(0)
  const questions = useMemo(() => (player && phase === 'run' ? buildPuzzle(player, pic.id, round, PUZZLE_QUESTIONS) : []), [phase === 'run', pic.id, round])
  const order = useMemo(() => revealOrder(pic), [pic])
  if (!player) return null

  const have = new Set(player.puzzles ?? [])
  const shown = new Set(order.slice(0, revealedCount(pic, correct)))
  const choices = guessChoices(pic)

  const start = (p: Picture) => {
    setPic(p)
    setCorrect(0)
    setGuessWrong([])
    setBonus(0)
    setRound((r) => r + 1)
    setPhase('run')
    playSound('click')
  }

  const finishGuess = (name: string) => {
    if (name !== pic.name) {
      setGuessWrong((w) => [...w, name])
      playSound('wrong')
      return
    }
    const extra = guessWrong.length === 0 ? 5 : 0
    setBonus(extra)
    updatePlayer((p) => collectPicture({ ...earn(p, PUZZLE_COINS + extra, `ภาพปริศนา: ${pic.name}`, pic.emoji), exp: p.exp + 10 }, pic.id))
    playSound('complete')
    setPhase('done')
  }

  return (
    <div className="mh-level theme-start">
      <TopBar compact />
      <div className="mh-page mh-page-narrow mh-puzzle" data-testid="mh-puzzle">
        <div className="mh-page-head">
          <Link to="/map" className="mh-icon-btn" aria-label="กลับแผนที่">
            <ArrowLeft size={24} />
          </Link>
          <h1 className="mh-title mh-level-title">🖼️ ภาพปริศนา</h1>
        </div>

        {phase === 'pick' && (
          <div className="mh-card">
            <div className="mh-puzzle-intro">
              <CharacterArt id="rabbit" size={84} mood="happy" />
              <p>
                ตอบให้ถูก แล้วภาพลับจะค่อย ๆ โผล่ออกมาทีละนิด! ครบ {PUZZLE_QUESTIONS} ข้อแล้วทายว่าเป็นภาพอะไร เก็บเข้าสมุดภาพได้ <b>{have.size}</b>/{PICTURES.length} ภาพ
              </p>
            </div>
            <div className="mh-puzzle-album" data-testid="mh-puzzle-album">
              {PICTURES.map((p) => {
                const got = have.has(p.id)
                return (
                  <button
                    key={p.id}
                    type="button"
                    className={`mh-puzzle-slot ${got ? 'is-got' : ''} ${pic.id === p.id ? 'is-picked' : ''}`}
                    onClick={() => setPic(p)}
                    data-testid={`mh-puzzle-pick-${p.id}`}
                    aria-pressed={pic.id === p.id}
                  >
                    {got ? <PixelPicture pic={p} shown="all" size="mini" /> : <span className="mh-puzzle-q">?</span>}
                    <span>{got ? p.name : 'ภาพลับ'}</span>
                  </button>
                )
              })}
            </div>
            <button type="button" className="mh-btn mh-btn-go mh-btn-big" onClick={() => start(pic)} data-testid="mh-puzzle-start">
              {have.has(pic.id) ? `▶ เล่นภาพ “${pic.name}” อีกครั้ง` : '▶ เริ่มเผยภาพลับ'}
            </button>
          </div>
        )}

        {phase !== 'pick' && (
          <div className={`mh-card mh-puzzle-board is-${phase}`}>
            {phase === 'done' && <Confetti />}
            <PixelPicture pic={pic} shown={phase === 'run' ? shown : 'all'} testId="mh-puzzle-grid" />
            <div className="mh-puzzle-meter" aria-live="polite">
              {phase === 'run' ? (
                <>
                  <span className="mh-puzzle-dots" aria-hidden="true">
                    {Array.from({ length: PUZZLE_QUESTIONS }, (_, i) => (
                      <i key={i} className={i < correct ? 'is-on' : ''} />
                    ))}
                  </span>
                  เผยแล้ว {Math.min(correct, PUZZLE_QUESTIONS)}/{PUZZLE_QUESTIONS}
                </>
              ) : phase === 'guess' ? (
                <b className="mh-puzzle-ask">ภาพนี้คืออะไรนะ? 🤔</b>
              ) : (
                <b data-testid="mh-puzzle-name">
                  {pic.emoji} {pic.name} เก็บเข้าสมุดภาพแล้ว!
                </b>
              )}
            </div>
          </div>
        )}

        {phase === 'run' && (
          <StepRunner
            questions={questions}
            levelId={-1}
            mode="mission"
            earnLabel="ตอบถูก ภาพปริศนา"
            onAnswer={(_q, _r, ok, info) => {
              if (ok && !info.retry) setCorrect((c) => c + 1)
            }}
            onFinish={(s) => {
              setCorrect(PUZZLE_QUESTIONS)
              updatePlayer((p) =>
                logActivity(p, {
                  act: 'puzzle',
                  group: 'other',
                  label: `ภาพปริศนา: ${pic.name}`,
                  correct: s.firstTry,
                  total: s.originals,
                  wrong: s.originals - s.firstTry,
                  timeMs: s.ms,
                  points: s.coins,
                }),
              )
              playSound('star')
              setPhase('guess')
            }}
          />
        )}

        {phase === 'guess' && (
          <div className="mh-card mh-puzzle-guess" data-testid="mh-puzzle-guess">
            <div className="mh-row-buttons">
              {choices.map((name, i) => (
                <button
                  key={name}
                  type="button"
                  className={`mh-btn ${guessWrong.includes(name) ? 'mh-btn-soft is-wrong' : 'mh-btn-gold'}`}
                  disabled={guessWrong.includes(name)}
                  onClick={() => finishGuess(name)}
                  data-testid={`mh-puzzle-guess-${i}`}
                >
                  {name}
                </button>
              ))}
            </div>
            {guessWrong.length > 0 && <p className="mh-soft">ยังไม่ใช่ ลองดูรูปทรงกับสีอีกนิดนะ 🙂</p>}
          </div>
        )}

        {phase === 'done' && (
          <div className="mh-card mh-puzzle-done" data-testid="mh-puzzle-done">
            <AvatarArt avatar={player.avatar} size={90} mood="happy" wear={player.wear} pet />
            <p>
              ได้ <b>🪙 {PUZZLE_COINS + bonus}</b> เหรียญ{bonus > 0 ? ' (ทายถูกตั้งแต่ครั้งแรก +5)' : ''} · สมุดภาพ {have.size + (have.has(pic.id) ? 0 : 1)}/{PICTURES.length}
            </p>
            <div className="mh-row-buttons">
              <button type="button" className="mh-btn mh-btn-go" onClick={() => (setPic(nextPicture({ ...player, puzzles: [...have, pic.id] })), setPhase('pick'))} data-testid="mh-puzzle-next">
                🖼️ ภาพต่อไป
              </button>
              <Link to="/map" className="mh-btn mh-btn-soft">
                กลับแผนที่
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
