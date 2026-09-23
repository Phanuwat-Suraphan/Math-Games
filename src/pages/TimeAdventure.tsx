import { useCallback, useEffect, useRef, useState } from 'react'
import type { CSSProperties, PointerEvent as ReactPointerEvent, ReactNode, RefObject } from 'react'
import { Button } from '../components/Button'
import { ScreenLayout } from '../components/ScreenLayout'
import { TopBar } from '../components/TopBar'
import { useGame } from '../context/useGame'
import { useGameSettings } from '../hooks/useGameSettings'
import { useMusic } from '../hooks/useMusic'
import { playSfx } from '../services/audioService'
import { applyBonusPercent, totalStats } from '../services/inventoryService'
import { recordTimeAdventure } from '../services/recordService'
import type { Player } from '../types/player'
import {
  BOARD_VIEWBOX,
  HOUR_HAND,
  MINUTE_HAND,
  SQUARE_POSITIONS,
  boardArt,
  bunnyInner,
  clockArt,
  heroInner,
} from '../timeAdventure/art'
import { DECK_INFO, EMPHASIS_WORDS } from '../timeAdventure/cards'
import type { ActivityRow, CardVisual, DeckType, TimeCard } from '../timeAdventure/cards'
import {
  CASTLE,
  GATE,
  HERO_INFO,
  HERO_KEYS,
  MAX_PLAYERS,
  SPECIAL_INFO,
  appReward,
  applyAnswer,
  atGate,
  bunnyRemoves,
  canUse,
  cancelSpecial,
  createGame,
  deckChoices,
  drawCard,
  drawSpecial,
  endTurn,
  isCorrect,
  keepSpecial,
  landsOnStar,
  ranking,
  shuffle,
  spendSpecial,
  totalCorrect,
  travel,
  undoWrongAnswerCount,
} from '../timeAdventure/engine'
import type { Answer, AnswerOutcome, HeroKey, SpecialKey, TaState } from '../timeAdventure/engine'

/**
 * ผจญภัยเมืองแห่งเวลา: การ์ดเกมอ่านเวลาสำหรับ ป.2
 *
 * เกมนี้เริ่มจากชุดการ์ดที่ครูพิมพ์เล่นบนโต๊ะ (time-adventure.html)
 * หน้านี้คือฉบับเล่นบนจอในแอปหลัก การ์ด กติกา และฮีโร่ชุดเดียวกันทุกอย่าง
 * ครูจึงสลับระหว่างโต๊ะกับจอได้โดยไม่ต้องสอนกติกาใหม่
 *
 * เล่น 1–4 คนผลัดกันบนเครื่องเดียว เพราะห้อง ป.2 ส่วนใหญ่มีแท็บเล็ตไม่พอให้ทุกคน
 * เหรียญที่ได้เข้าบัญชีผู้เล่นของเครื่องนี้ คิดจากข้อที่ทั้งวงตอบถูก
 *
 * ตรรกะทั้งหมดอยู่ใน src/timeAdventure/engine.ts ซึ่งมีชุดทดสอบของตัวเอง
 * ไฟล์นี้ทำแค่วาดหน้าจอ รับการแตะ และเล่นอนิเมชันเดิน
 */

/* ── ชิ้นส่วนภาพ ─────────────────────────────────────────── */

/**
 * วาง SVG ที่สร้างจาก src/timeAdventure/art.ts
 * ปลอดภัยเพราะข้อความทั้งหมดมาจากค่าคงที่ในโค้ด ไม่มีข้อความจากผู้เล่นปน
 */
function Art({ viewBox, inner, label, className }: { viewBox: string; inner: string; label: string; className?: string }) {
  return <svg viewBox={viewBox} className={className} role="img" aria-label={label} dangerouslySetInnerHTML={{ __html: inner }} />
}

function Hero({ hero, className }: { hero: HeroKey; className?: string }) {
  return <Art viewBox="0 0 40 48" inner={heroInner(hero)} label={HERO_INFO[hero].name} className={className} />
}

function Clock({ h, m, hands, plain, className }: { h: number; m: number; hands?: boolean; plain?: boolean; className?: string }) {
  const art = clockArt(h, m, { hands, plain })
  return <Art viewBox={art.viewBox} inner={art.inner} label={art.label} className={className} />
}

const EMPHASIS = new RegExp(`(${[...EMPHASIS_WORDS].sort((a, b) => b.length - a.length).join('|')})`)

/** เน้นคำที่เปลี่ยนคำตอบทั้งข้อ เช่น ก่อน/หลัง ให้เด็กที่อ่านเร็วไม่พลาด */
function emphasize(text: string): ReactNode[] {
  return text.split(EMPHASIS).map((part, i) =>
    i % 2 === 1 ? (
      <em key={i} className="ta-emph">
        {part}
      </em>
    ) : (
      part
    ),
  )
}

const BUDDY: Record<DeckType, { hero: HeroKey; say: string[] }> = {
  time: { hero: 'wizard', say: ['ดูเข็มสั้นก่อนน้า~', 'เข็มสั้นบอกชั่วโมงนะ', 'เวทมนตร์คือค่อย ๆ ดู', 'หนูทำได้แน่นอน!'] },
  find: { hero: 'fairy', say: ['นางฟ้าช่วยส่องนะ ✨', 'ดูเข็มยาวด้วยน้า', 'มีข้อเดียวที่ถูกนะ', 'โบกไม้กายสิทธิ์ ชี้เลย!'] },
  daily: { hero: 'knight', say: ['วันนี้หนูทำอะไรบ้าง?', 'นึกถึงวันของหนูสิ', 'อัศวินก็ตื่นเช้านะ!', 'เลขชั่วโมงน้อย มาก่อนนะ'] },
  chal: { hero: 'dragon', say: ['มังกรน้อยท้าดวล!', 'ใกล้ถึงปราสาทแล้ว', 'คิดทีละขั้นนะ', 'เก่งมากที่มาถึงตรงนี้!'] },
}
const CHEER = ['เก่งมาก!', 'สุดยอดเลย!', 'ตรงเวลาเป๊ะ!', 'เวทมนตร์ได้ผล!', 'ฮีโร่ตัวจริง!']
const COMFORT = ['ไม่เป็นไรนะ', 'เกือบแล้ว!', 'ลองใหม่ตาหน้านะ', 'ค่อย ๆ ดูอีกทีนะ']
const pick = <T,>(list: T[]): T => list[Math.floor(Math.random() * list.length)]
const LETTERS = ['ก', 'ข', 'ค']

function RowLabel({ row }: { row: ActivityRow }) {
  return (
    <>
      <span aria-hidden="true" className="text-2xl leading-none">
        {row.emoji}
      </span>
      <span>{row.label}</span>
      <span className="ml-auto whitespace-nowrap font-display text-base tabular-nums" style={{ color: 'var(--c)' }}>
        {row.time}
      </span>
    </>
  )
}

function Tag({ text }: { text?: string }) {
  if (!text) return null
  return (
    <p className="font-display text-sm" style={{ color: 'var(--c)' }}>
      {text}
    </p>
  )
}

function Visual({ visual }: { visual: CardVisual }) {
  switch (visual.kind) {
    case 'clock':
      return (
        <>
          <Tag text={visual.tag} />
          <Clock h={visual.h} m={visual.m} className="w-[min(190px,56vw)]" />
        </>
      )
    case 'emptyClock':
      return (
        <>
          <Tag text={visual.tag} />
          <Clock h={0} m={0} hands={false} className="w-[min(180px,52vw)]" />
        </>
      )
    case 'word':
      return (
        <>
          <Tag text={visual.tag} />
          {visual.emoji ? <span className="text-5xl leading-none">{visual.emoji}</span> : null}
          <p className="rounded-2xl bg-white px-4 py-1.5 text-center font-display text-xl">{visual.text}</p>
          {visual.blank ? <p className="font-display text-3xl tracking-[0.12em] text-slate-400">__ : __</p> : null}
        </>
      )
    case 'clocks':
      return (
        <>
          <Tag text={visual.tag} />
          {visual.word ? <p className="rounded-2xl bg-white px-4 py-1.5 text-center font-display text-xl">{visual.word}</p> : null}
          <div className="flex justify-center gap-2">
            {visual.clocks.map(([h, m], i) => (
              <figure key={i} className="flex flex-col items-center">
                <Clock h={h} m={m} plain className="w-[min(104px,26vw)]" />
                <figcaption className="font-display text-lg" style={{ color: 'var(--c)' }}>
                  {LETTERS[i]}.
                </figcaption>
              </figure>
            ))}
          </div>
        </>
      )
    case 'rows':
      return (
        <div className="grid w-full gap-2">
          {visual.rows.map((row) => (
            <div key={row.label} className="ta-opt pointer-events-none" style={{ boxShadow: 'none', borderWidth: 2 }}>
              <RowLabel row={row} />
            </div>
          ))}
        </div>
      )
    default:
      return null
  }
}

/* ── สถานะของหน้าต่างการ์ด ───────────────────────────────── */

interface CardModal {
  kind: 'card'
  card: TimeCard
  gate: boolean
  /** ลำดับที่แสดงตัวเลือก (สลับแล้ว ยกเว้นการ์ดที่ห้ามสลับ) */
  order: number[]
  gone: number[]
  wrong: number[]
  picked: number[]
  set: [number, number]
  boost: boolean
  fast: boolean
  buddy: string
  retried: boolean
  result: null | { correct: boolean; outcome: AnswerOutcome; line: string; shieldOffer: boolean }
}

type Modal =
  | CardModal
  | { kind: 'special'; key: SpecialKey; mustDrop: boolean }
  | { kind: 'confirmEnd' }
  | { kind: 'end'; reward: number }

function openCardModal(card: TimeCard, gate: boolean): CardModal {
  const indexes = card.kind === 'choice' ? card.options.map((_, i) => i) : []
  return {
    kind: 'card',
    card,
    gate,
    order: card.kind === 'choice' && !card.fixedOrder ? shuffle(indexes, Math.random) : indexes,
    gone: [],
    wrong: [],
    picked: [],
    set: card.kind === 'set' ? [...card.start] : [12, 0],
    boost: false,
    fast: false,
    buddy: pick(BUDDY[card.deck].say),
    retried: false,
    result: null,
  }
}

/* ── หน้าหลัก ─────────────────────────────────────────────── */

interface SetupState {
  count: number
  heroes: HeroKey[]
  names: string[]
  easy: boolean
}

export function TimeAdventure({ player }: { player: Player }) {
  /* เดินทางผ่านเมือง ใช้เพลงผจญภัยแบบเดียวกับแผนที่โลก */
  useMusic('adventure')
  const { patchPlayer } = useGame()
  const { settings } = useGameSettings()

  const [setup, setSetup] = useState<SetupState>({
    count: 2,
    heroes: [...HERO_KEYS],
    names: [player.name, '', '', ''],
    easy: false,
  })
  const [game, setGame] = useState<TaState | null>(null)
  const [modal, setModal] = useState<Modal | null>(null)
  const [freshModal, setFreshModal] = useState(0)
  /** ตำแหน่งที่ตัวเดินแสดงอยู่ระหว่างเดิน (ตำแหน่งจริงในเกมไปถึงปลายทางแล้ว) */
  const [walking, setWalking] = useState<{ index: number; pos: number } | null>(null)
  const walkTimer = useRef<number | null>(null)

  /*
   * ธงกันจ่ายรางวัลซ้ำ เหตุผลเดียวกับศึกผ่าสมการ
   * เก็บเป็น ref เพราะต้องอ่านค่าล่าสุดทันทีแม้ React จะเรนเดอร์ซ้ำ
   */
  const paidRef = useRef(false)
  const rewardRef = useRef(0)

  useEffect(() => () => {
    if (walkTimer.current !== null) window.clearInterval(walkTimer.current)
  }, [])

  const show = useCallback((next: Modal | null) => {
    setModal(next)
    setFreshModal((n) => n + 1)
  }, [])

  /* ── เริ่มเกม ── */
  const start = () => {
    paidRef.current = false
    playSfx('click')
    const players = setup.heroes.slice(0, setup.count).map((hero, i) => ({ hero, name: setup.names[i] ?? '' }))
    setGame(createGame(players, setup.easy, Math.random))
    setWalking(null)
    show(null)
  }

  /* ── จบเกมและจ่ายรางวัล (ครั้งเดียวต่อเกม) ── */
  const finish = useCallback(
    (state: TaState) => {
      if (paidRef.current) {
        show({ kind: 'end', reward: rewardRef.current })
        return
      }
      paidRef.current = true
      const reward = applyBonusPercent(appReward(state), totalStats(player).coinBonusPercent)
      rewardRef.current = reward
      patchPlayer({
        coins: player.coins + Math.max(0, reward),
        records: recordTimeAdventure(player, { reachedCastle: state.winner !== null, correct: totalCorrect(state) }),
      })
      playSfx('victory')
      show({ kind: 'end', reward })
    },
    [patchPlayer, player, show],
  )

  /* ── จั่วการ์ด ── */
  const draw = (deck: DeckType) => {
    if (!game) return
    const gate = atGate(game)
    const drawn = drawCard(game, deck, Math.random)
    setGame(drawn.state)
    playSfx('click')
    show(openCardModal(drawn.card, gate))
  }

  /* ── ตอบ ── */
  const submit = (answer: Answer, wrongIndex?: number) => {
    if (!game || !modal || modal.kind !== 'card' || modal.result) return
    const correct = isCorrect(modal.card, answer)
    const outcome = applyAnswer(game, modal.card, correct, { boost: modal.boost, fast: modal.fast })
    setGame(outcome.state)
    playSfx(correct ? 'correct' : 'wrong')
    if (correct) window.setTimeout(() => playSfx('coin'), 250)
    setModal({
      ...modal,
      wrong: wrongIndex !== undefined ? [...modal.wrong, wrongIndex] : modal.wrong,
      result: {
        correct,
        outcome,
        line: pick(correct ? CHEER : COMFORT),
        shieldOffer: !correct && !modal.retried && canUse(outcome.state, 'shield'),
      },
    })
  }

  const applyShield = () => {
    if (!game || !modal || modal.kind !== 'card') return
    setGame(undoWrongAnswerCount(spendSpecial(game, 'shield')))
    playSfx('heal')
    setModal({ ...modal, result: null, retried: true, picked: [], set: modal.card.kind === 'set' ? [...modal.card.start] : modal.set })
  }

  /* ── การ์ดพิเศษที่กดก่อนตอบ ── */
  const power = (key: SpecialKey) => {
    if (!game || !modal || modal.kind !== 'card' || modal.result) return
    if (key === 'boost' || key === 'fast') {
      const active = key === 'boost' ? modal.boost : modal.fast
      if (active) {
        setGame(cancelSpecial(game, key))
        setModal(key === 'boost' ? { ...modal, boost: false } : { ...modal, fast: false })
      } else if (canUse(game, key)) {
        setGame(spendSpecial(game, key))
        setModal(key === 'boost' ? { ...modal, boost: true } : { ...modal, fast: true })
        playSfx('zap')
      }
      return
    }
    if (!canUse(game, key)) return
    if (key === 'lucky') {
      const spent = spendSpecial(game, 'lucky')
      const drawn = drawCard(spent, modal.card.deck, Math.random)
      setGame(drawn.state)
      playSfx('zap')
      show(openCardModal(drawn.card, modal.gate))
      return
    }
    if (key === 'bunny') {
      const gone = bunnyRemoves(modal.card, modal.gone, Math.random)
      if (gone < 0) return
      setGame(spendSpecial(game, 'bunny'))
      setModal({ ...modal, gone: [...modal.gone, gone] })
      playSfx('zap')
    }
  }

  /* ── เดินตัวเดินทีละช่อง ── */
  const walk = (index: number, from: number, to: number, done: () => void) => {
    if (to === from || !settings.animationsEnabled) {
      done()
      return
    }
    let pos = from
    setWalking({ index, pos })
    walkTimer.current = window.setInterval(() => {
      pos += 1
      setWalking({ index, pos })
      playSfx('click')
      if (pos >= to) {
        if (walkTimer.current !== null) window.clearInterval(walkTimer.current)
        walkTimer.current = null
        window.setTimeout(() => {
          setWalking(null)
          done()
        }, 250)
      }
    }, 360)
  }

  const nextTurn = (state: TaState) => {
    setGame(endTurn(state))
    show(null)
  }

  /* ── หลังตอบ: เดิน → ช่องดาว → ตาถัดไป ── */
  const proceed = () => {
    if (!game || !modal || modal.kind !== 'card' || !modal.result) return
    const { outcome } = modal.result
    const state = game
    show(null)
    if (outcome.won) {
      finish(state)
      return
    }
    walk(state.turn, outcome.from, outcome.to, () => {
      if (!landsOnStar(outcome.from, outcome.to)) {
        nextTurn(state)
        return
      }
      const star = drawSpecial(state)
      if (!star.special) {
        nextTurn(star.state)
        return
      }
      setGame(star.state)
      playSfx(star.special === 'chest' ? 'chest' : 'pickup')
      show({ kind: 'special', key: star.special, mustDrop: star.mustDrop })
    })
  }

  const takeSpecial = (dropIndex?: number) => {
    if (!game || !modal || modal.kind !== 'special') return
    nextTurn(modal.key === 'chest' ? game : keepSpecial(game, modal.key, dropIndex))
  }

  const startTravel = () => {
    if (!game || !canUse(game, 'travel') || atGate(game)) return
    const from = game.players[game.turn].pos
    const next = travel(game)
    setGame(next)
    playSfx('zap')
    walk(next.turn, from, next.players[next.turn].pos, () => undefined)
  }

  /* ── หน้าตั้งค่า ── */
  if (!game) {
    return (
      <>
        <TopBar player={player} title="ผจญภัยเมืองแห่งเวลา" backTo="/menu" backLabel="กลับเมนู" />
        <ScreenLayout width="normal">
          <SetupPanel setup={setup} onChange={setSetup} onStart={start} />
        </ScreenLayout>
      </>
    )
  }

  const current = game.players[game.turn]
  const shownPos = (index: number) => (walking && walking.index === index ? walking.pos : game.players[index].pos)
  const busy = walking !== null
  const choices = deckChoices(game)

  return (
    <>
      <TopBar player={player} title="ผจญภัยเมืองแห่งเวลา" backTo="/menu" backLabel="กลับเมนู" />
      <ScreenLayout width="wide">
        <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="ta-board">
            <svg viewBox={BOARD_VIEWBOX} className="mx-auto block h-auto max-h-[calc(100vh-150px)] w-full" role="img" aria-label="กระดานเมืองแห่งเวลา">
              <g dangerouslySetInnerHTML={{ __html: boardArt() }} />
              {game.players
                .map((_, i) => i)
                .sort((a, b) => Number(a === game.turn) - Number(b === game.turn))
                .map((i) => {
                  const p = game.players[i]
                  const [x, y] = SQUARE_POSITIONS[shownPos(i)]
                  const offset = [[-4.5, -4.5], [4.5, -4.5], [-4.5, 4.5], [4.5, 4.5]][i]
                  const now = i === game.turn
                  return (
                    <g
                      key={i}
                      className={`ta-pawn ${now ? 'ta-pawn-now' : ''}`}
                      style={{ transform: `translate(${x + offset[0]}px, ${y + offset[1]}px)` }}
                    >
                      <g>
                        <ellipse cx="0" cy="7.2" rx="5" ry="1.6" fill="rgba(35,50,74,.25)" />
                        <circle r="6.4" fill="#fff" stroke={HERO_INFO[p.hero].color} strokeWidth={now ? 1.8 : 1.1} />
                        <svg x="-5.4" y="-6.4" width="10.8" height="13" viewBox="0 0 40 48" dangerouslySetInnerHTML={{ __html: heroInner(p.hero) }} />
                      </g>
                    </g>
                  )
                })}
            </svg>
          </div>

          <div className="flex flex-col gap-3">
            <section
              className="panel panel-corners p-4"
              style={{ '--hc': HERO_INFO[current.hero].color } as CSSProperties}
              aria-live="polite"
            >
              <div className="flex items-center gap-3">
                <Hero hero={current.hero} className="w-16 flex-none" />
                <div>
                  <p className="text-lg font-black text-white">ตาของ {current.name}</p>
                  <p className="text-sm text-slate-300">
                    รอบที่ {game.round} · {current.pos === 0 ? 'อยู่ที่ START' : `ช่อง ${current.pos}`}
                  </p>
                </div>
              </div>

              {game.winner === null ? (
                <div className="mt-4 grid gap-2">
                  {current.pos === GATE ? (
                    <p className="text-sm text-gold-300">ถึงประตูปราสาทแล้ว! ตอบคำถามจากคุณเข็มให้ถูกเพื่อเข้าปราสาท</p>
                  ) : choices.length > 1 ? (
                    <p className="text-sm text-slate-300">ด่านปราสาท: เลือกกองการ์ดเองได้เลย</p>
                  ) : null}
                  <div className={choices.length > 1 ? 'grid grid-cols-2 gap-2' : 'grid'}>
                    {choices.map((deck) => (
                      <Button
                        key={deck}
                        size={choices.length > 1 ? 'md' : 'lg'}
                        fullWidth
                        disabled={busy}
                        onClick={() => draw(deck)}
                        silent
                      >
                        {current.pos === GATE ? '🏰 คำถามจากคุณเข็ม ⚔️' : `จั่ว ${DECK_INFO[deck].icon} ${DECK_INFO[deck].name}`}
                      </Button>
                    ))}
                  </div>
                  {canUse(game, 'travel') && current.pos !== GATE ? (
                    <Button variant="secondary" fullWidth disabled={busy} onClick={startTravel} silent>
                      🔄 ใช้ TIME TRAVEL เดินหน้า 1 ช่อง
                    </Button>
                  ) : null}
                </div>
              ) : (
                <Button className="mt-4" fullWidth onClick={() => finish(game)}>
                  👑 ดูผู้ชนะ
                </Button>
              )}
            </section>

            <ul className="grid gap-2" aria-label="ผู้เล่น">
              {game.players.map((p, i) => (
                <li
                  key={i}
                  className={`flex items-center gap-3 rounded-2xl border-2 bg-white/5 px-3 py-2 ${i === game.turn ? '' : 'border-transparent'}`}
                  style={i === game.turn ? { borderColor: HERO_INFO[p.hero].color } : undefined}
                >
                  <Hero hero={p.hero} className="w-10 flex-none" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold text-white">{p.name}</p>
                    <p className="text-xs text-slate-400">
                      {p.pos === CASTLE ? '👑 อยู่ในปราสาท' : p.pos === 0 ? 'START' : `ช่อง ${p.pos}`}
                    </p>
                    {p.hand.length ? (
                      <p className="mt-1 flex flex-wrap gap-1">
                        {p.hand.map((key, k) => (
                          <span key={k} className="rounded-full border border-gold-400/50 bg-gold-500/15 px-2 py-0.5 text-[11px] font-bold text-gold-200">
                            {SPECIAL_INFO[key].emoji} {SPECIAL_INFO[key].name}
                          </span>
                        ))}
                      </p>
                    ) : null}
                  </div>
                  <span className="font-display text-lg tabular-nums text-gold-300" aria-label={`${p.coins} เหรียญ`}>
                    🪙 {p.coins}
                  </span>
                </li>
              ))}
            </ul>

            <Button variant="secondary" fullWidth disabled={busy} onClick={() => show({ kind: 'confirmEnd' })}>
              🏁 จบเกม นับเหรียญ
            </Button>
          </div>
        </div>
      </ScreenLayout>

      {modal ? (
        <div className="ta-overlay">
          <ModalView
            key={freshModal}
            modal={modal}
            game={game}
            onPick={(i) => {
              if (modal.kind !== 'card') return
              const card = modal.card
              if (card.kind === 'choice') submit({ kind: 'choice', index: i }, i === card.answer ? undefined : i)
            }}
            onOrder={(picked) => modal.kind === 'card' && setModal({ ...modal, picked })}
            onCheckOrder={() => modal.kind === 'card' && submit({ kind: 'order', order: modal.picked })}
            onSet={(set) => modal.kind === 'card' && setModal({ ...modal, set })}
            onCheckSet={() => modal.kind === 'card' && submit({ kind: 'set', h: modal.set[0], m: modal.set[1] })}
            onPower={power}
            onShield={applyShield}
            onProceed={proceed}
            onKeep={takeSpecial}
            onEndNow={() => finish(game)}
            onClose={() => show(null)}
            onAgain={() => {
              setGame(null)
              show(null)
            }}
            reduceMotion={!settings.animationsEnabled}
          />
        </div>
      ) : null}
    </>
  )
}

/* ── หน้าตั้งค่า ─────────────────────────────────────────── */

function SetupPanel({ setup, onChange, onStart }: { setup: SetupState; onChange: (next: SetupState) => void; onStart: () => void }) {
  const chooseHero = (slot: number, hero: HeroKey) => {
    const heroes = [...setup.heroes]
    const other = heroes.indexOf(hero)
    heroes[other] = heroes[slot]
    heroes[slot] = hero
    onChange({ ...setup, heroes })
  }

  return (
    <div className="panel panel-hero panel-corners p-6">
      <div className="flex justify-center gap-1" aria-hidden="true">
        {HERO_KEYS.map((hero) => (
          <Hero key={hero} hero={hero} className="w-16 sm:w-20" />
        ))}
      </div>
      <h2 className="title-gold mt-2 text-center text-2xl font-black">ผจญภัยเมืองแห่งเวลา</h2>
      <p className="mt-1 text-center text-sm leading-relaxed text-slate-300">
        การ์ดเกมอ่านเวลาสำหรับ ป.2 · ตอบการ์ดให้ถูกแล้วพาฮีโร่เดินไปถึงปราสาทเวลา
        <br />
        เล่นได้ 1–4 คน ผลัดกันเล่นบนเครื่องนี้
      </p>

      <fieldset className="mt-5">
        <legend className="mb-2 text-sm font-bold text-white">มีผู้เล่นกี่คน?</legend>
        <div className="flex gap-2">
          {Array.from({ length: MAX_PLAYERS }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              type="button"
              aria-pressed={setup.count === n}
              onClick={() => onChange({ ...setup, count: n })}
              className={`flex-1 rounded-xl border px-3 py-2 text-sm font-bold transition ${
                setup.count === n ? 'border-gold-300 bg-gold-500/15 text-gold-200' : 'border-white/15 bg-white/5 text-slate-300'
              }`}
            >
              {n} คน
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="mt-4">
        <legend className="mb-2 text-sm font-bold text-white">เลือกฮีโร่ของแต่ละคน</legend>
        <div className="grid gap-3">
          {Array.from({ length: setup.count }, (_, slot) => (
            <div key={slot} className="rounded-2xl border border-white/10 bg-white/5 p-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-slate-300">คนที่ {slot + 1}</span>
                <input
                  id={`ta-name-${slot}`}
                  value={setup.names[slot] ?? ''}
                  maxLength={16}
                  placeholder="ชื่อ (ไม่ใส่ก็ได้)"
                  aria-label={`ชื่อผู้เล่นคนที่ ${slot + 1}`}
                  onChange={(event) => {
                    const names = [...setup.names]
                    names[slot] = event.target.value
                    onChange({ ...setup, names })
                  }}
                  className="min-w-0 flex-1 rounded-lg border border-white/15 bg-night-900/60 px-3 py-1.5 text-sm text-white placeholder:text-slate-500"
                />
              </div>
              <div className="mt-2 grid grid-cols-4 gap-2" role="group" aria-label={`ฮีโร่ของคนที่ ${slot + 1}`}>
                {HERO_KEYS.map((hero) => (
                  <button
                    key={hero}
                    type="button"
                    aria-pressed={setup.heroes[slot] === hero}
                    onClick={() => chooseHero(slot, hero)}
                    className={`ta-hero-tile ta-cute ${setup.heroes[slot] === hero ? 'ta-hero-tile-on' : ''}`}
                    style={{ '--hc': HERO_INFO[hero].color } as CSSProperties}
                  >
                    <Hero hero={hero} className="w-11" />
                    {HERO_INFO[hero].name}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </fieldset>

      <fieldset className="mt-4">
        <legend className="mb-2 text-sm font-bold text-white">ระดับ</legend>
        <div className="flex gap-2">
          {[false, true].map((easy) => (
            <button
              key={String(easy)}
              type="button"
              aria-pressed={setup.easy === easy}
              onClick={() => onChange({ ...setup, easy })}
              className={`flex-1 rounded-xl border px-3 py-2 text-sm font-bold transition ${
                setup.easy === easy ? 'border-gold-300 bg-gold-500/15 text-gold-200' : 'border-white/15 bg-white/5 text-slate-300'
              }`}
            >
              {easy ? '🌱 ง่าย (ไม่มีการ์ด ★★★)' : '⭐ ปกติ'}
            </button>
          ))}
        </div>
      </fieldset>

      <ul className="mt-5 space-y-1.5 text-sm text-slate-300">
        <li>· จั่วการ์ดสีของด่านที่ฮีโร่ยืนอยู่ ตอบถูกได้ 🪙 และเดินตามจำนวน ★</li>
        <li>· จบตาบนช่อง ⭐ ได้การ์ดพิเศษ ถือได้ 2 ใบ ใช้ได้ตาละ 1 ใบ</li>
        <li>· ถึงประตูปราสาทแล้วตอบการ์ด ⚔️ ถูก = ชนะ! หมดคาบกดนับเหรียญได้เลย</li>
        <li>· เหรียญที่ทั้งวงทำได้ จะเข้ากระเป๋าของผู้เล่นเครื่องนี้ตอนจบเกม</li>
      </ul>

      <Button size="lg" fullWidth className="mt-6" onClick={onStart}>
        🚩 เริ่มผจญภัย!
      </Button>
    </div>
  )
}

/* ── หน้าต่างการ์ด การ์ดพิเศษ และสรุปผล ─────────────────── */

interface ModalViewProps {
  modal: Modal
  game: TaState
  onPick: (index: number) => void
  onOrder: (picked: number[]) => void
  onCheckOrder: () => void
  onSet: (set: [number, number]) => void
  onCheckSet: () => void
  onPower: (key: SpecialKey) => void
  onShield: () => void
  onProceed: () => void
  onKeep: (dropIndex?: number) => void
  onEndNow: () => void
  onClose: () => void
  onAgain: () => void
  reduceMotion: boolean
}

function ModalView(props: ModalViewProps) {
  const { modal, game, reduceMotion } = props
  const pop = reduceMotion ? '' : 'ta-card-pop'
  const firstButton = useRef<HTMLDivElement>(null)

  useEffect(() => {
    firstButton.current?.querySelector<HTMLButtonElement>('button:not([disabled])')?.focus({ preventScroll: true })
  }, [])

  if (modal.kind === 'confirmEnd') {
    return (
      <div ref={firstButton} className={`ta-card ta-cute ${pop}`} role="dialog" aria-modal="true" aria-label="จบเกม" style={{ '--c': '#23324A', '--bg': '#F4F7FB' } as CSSProperties}>
        <div className="ta-card-head">🏁 จบเกม</div>
        <div className="grid gap-4 px-5 pb-5 pt-2 text-center">
          <p className="text-xl font-bold">หยุดเล่นแล้วนับเหรียญเลยไหม?</p>
          <div className="flex flex-wrap justify-center gap-3">
            <Button variant="secondary" onClick={props.onClose}>
              เล่นต่อ
            </Button>
            <Button onClick={props.onEndNow}>นับเหรียญ 🪙</Button>
          </div>
        </div>
      </div>
    )
  }

  if (modal.kind === 'end') {
    const order = ranking(game)
    const top = game.players[game.winner ?? order[0]]
    return (
      <div ref={firstButton} className={`ta-card ta-cute ${pop}`} role="dialog" aria-modal="true" aria-label="ผลการแข่งขัน" style={{ '--c': '#D99A00', '--bg': '#FFF5D1' } as CSSProperties}>
        <div className="ta-card-head">
          <span>👑 ฮีโร่ผู้พิทักษ์เวลา</span>
          <span className="text-gold-200">✦✦✦</span>
        </div>
        <div className="grid gap-3 px-5 pb-5 pt-1 text-center">
          <p className="text-4xl leading-none">👑</p>
          <Hero hero={top.hero} className="mx-auto w-32" />
          <p className="text-xl font-bold">
            {top.name}
            <br />
            {game.winner !== null ? 'เข้าปราสาทเวลาได้สำเร็จ!' : 'มีเหรียญมากที่สุด!'}
          </p>
          <ol className="grid gap-2 text-left">
            {order.map((i, n) => {
              const p = game.players[i]
              return (
                <li key={i} className="flex items-center gap-3 rounded-2xl bg-white px-3 py-1.5 font-bold">
                  <span className="w-5">{n + 1}.</span>
                  <Hero hero={p.hero} className="w-9" />
                  <span className="flex-1">
                    {p.name}
                    {p.coins >= 5 ? ' 🏅' : ''}
                  </span>
                  <span className="tabular-nums">🪙 {p.coins}</span>
                </li>
              )
            })}
          </ol>
          <p className="text-sm text-slate-600">🏅 = มีเหรียญ 5 เหรียญขึ้นไป ได้ตรานักผจญภัยตรงเวลา</p>
          <p className="rounded-2xl bg-white px-3 py-2 font-bold text-amber-700">
            ทั้งวงตอบถูก {totalCorrect(game)} ข้อ · ได้ 🪙 {modal.reward} เหรียญเข้ากระเป๋า
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Button size="lg" onClick={props.onAgain}>
              🔁 เล่นอีกครั้ง
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (modal.kind === 'special') {
    const info = SPECIAL_INFO[modal.key]
    const hand = game.players[game.turn].hand
    return (
      <div ref={firstButton} className={`ta-card ta-cute ${pop}`} role="dialog" aria-modal="true" aria-label="การ์ดพิเศษ" style={{ '--c': '#D99A00', '--bg': '#FFF5D1' } as CSSProperties}>
        <div className="ta-card-head">
          <span>⭐ การ์ดพิเศษ</span>
          <span>✦</span>
        </div>
        <div className="grid gap-3 px-5 pb-5 pt-1 text-center">
          <div className="ta-burst">
            {modal.key === 'bunny' ? <Art viewBox="0 0 40 44" inner={bunnyInner()} label="กระต่ายติ๊กต็อก" className="w-24" /> : info.emoji}
          </div>
          <p className="mx-auto rounded-full bg-white px-5 py-1.5 font-display text-2xl text-amber-800 shadow-[0_0_0_3px_#F0CF6A]">{info.name}</p>
          <p className="text-xl font-bold">{info.effect}</p>
          {modal.key === 'chest' ? (
            <>
              <p className="text-slate-600">ได้ 🪙 2 เหรียญแล้ว!</p>
              <Button size="lg" onClick={() => props.onKeep()}>
                เย่! ไปต่อ
              </Button>
            </>
          ) : modal.mustDrop ? (
            <>
              <p className="text-slate-600">ถือการ์ดพิเศษได้แค่ 2 ใบ เลือกทิ้ง 1 ใบ</p>
              <div className="grid gap-2">
                {[...hand, modal.key].map((key, i) => (
                  <button key={i} type="button" className="ta-opt" onClick={() => props.onKeep(i)}>
                    {SPECIAL_INFO[key].emoji} ทิ้ง {SPECIAL_INFO[key].name}
                    {i === hand.length ? ' (ใบใหม่)' : ''}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <p className="text-slate-600">ใช้ได้เมื่อ: {info.when}</p>
              <Button size="lg" onClick={() => props.onKeep()}>
                เก็บไว้ในมือ ✨
              </Button>
            </>
          )}
        </div>
      </div>
    )
  }

  return <CardView {...props} modal={modal} pop={pop} containerRef={firstButton} />
}

function CardView(props: ModalViewProps & { modal: CardModal; pop: string; containerRef: RefObject<HTMLDivElement> }) {
  const { modal, game } = props
  const { card, result } = modal
  const deck = DECK_INFO[card.deck]
  const player = game.players[game.turn]
  const buddy = BUDDY[card.deck]
  const done = result !== null

  const powers = (['boost', 'fast', 'lucky', 'bunny'] as SpecialKey[]).filter((key) => {
    if (done || modal.retried) return false
    const active = (key === 'boost' && modal.boost) || (key === 'fast' && modal.fast)
    if (active) return true
    if (!canUse(game, key)) return false
    if (key === 'bunny') return card.kind === 'choice' && card.options.length > 2 && modal.gone.length === 0
    return true
  })

  return (
    <div
      ref={props.containerRef}
      className={`ta-card ta-cute ${props.pop}`}
      role="dialog"
      aria-modal="true"
      aria-label={`การ์ด${deck.name}`}
      style={{ '--c': deck.color, '--bg': deck.bg } as CSSProperties}
    >
      <div className="ta-card-head">
        <span>
          {deck.icon} {deck.name}
          {modal.gate ? ' · ประตูปราสาท' : ''}
        </span>
        <span className="tracking-wider text-[#FFE27A]" aria-label={`${card.stars} ดาว`}>
          {'★'.repeat(card.stars)}
        </span>
      </div>

      <div className="flex flex-col gap-3 px-[18px] pb-[18px] pt-1.5">
        {!done ? (
          <div className="flex items-center gap-2">
            <span className="flex h-[46px] w-[46px] flex-none items-end justify-center overflow-hidden rounded-full border-[2.5px] bg-white" style={{ borderColor: 'var(--c)' }}>
              <Hero hero={buddy.hero} className="w-10" />
            </span>
            <span className="ta-bubble">{modal.buddy}</span>
          </div>
        ) : null}

        {card.visual ? (
          <div className="flex flex-col items-center gap-2">
            <Visual visual={card.visual} />
          </div>
        ) : null}

        <p className="text-balance text-center text-[21px] font-bold leading-snug">{emphasize(card.question)}</p>

        {card.kind === 'choice' ? (
          <div className="grid gap-2.5">
            {modal.order.map((i, n) => {
              const option = card.options[i]
              const classes = ['ta-opt']
              if (modal.gone.includes(i)) classes.push('ta-opt-gone')
              if (done && i === card.answer) classes.push('ta-opt-right')
              if (modal.wrong.includes(i)) classes.push('ta-opt-wrong')
              const letter = typeof option === 'string' && !card.fixedOrder ? LETTERS[n] : null
              return (
                <button key={i} type="button" className={classes.join(' ')} disabled={done || modal.wrong.includes(i)} onClick={() => props.onPick(i)}>
                  {letter ? (
                    <span className="inline-flex h-[30px] min-w-[30px] flex-none items-center justify-center rounded-[10px] font-display text-[15px] text-white" style={{ background: 'var(--c)' }}>
                      {letter}
                    </span>
                  ) : null}
                  {typeof option === 'string' ? option : <RowLabel row={option} />}
                </button>
              )
            })}
          </div>
        ) : null}

        {card.kind === 'order' ? (
          <>
            <div className="grid gap-2.5">
              {card.items.map((item, i) => {
                const n = modal.picked.indexOf(i)
                const classes = ['ta-opt']
                if (done) classes.push(card.order.indexOf(i) === n ? 'ta-opt-right' : 'ta-opt-wrong')
                return (
                  <button
                    key={i}
                    type="button"
                    className={classes.join(' ')}
                    disabled={done}
                    onClick={() => {
                      playSfx('click')
                      props.onOrder(n >= 0 ? modal.picked.slice(0, n) : [...modal.picked, i])
                    }}
                  >
                    <RowLabel row={item} />
                    <span className={`ta-num ${n < 0 ? 'ta-num-empty' : ''}`}>{n >= 0 ? n + 1 : ''}</span>
                  </button>
                )
              })}
            </div>
            {!done ? (
              <div className="flex flex-wrap justify-center gap-3">
                <Button variant="secondary" onClick={() => props.onOrder([])}>
                  ↺ เริ่มเรียงใหม่
                </Button>
                <Button disabled={modal.picked.length < card.items.length} onClick={props.onCheckOrder}>
                  ✔ ตรวจคำตอบ
                </Button>
              </div>
            ) : null}
          </>
        ) : null}

        {card.kind === 'set' ? <ClockSetter modal={modal} onSet={props.onSet} onCheck={props.onCheckSet} /> : null}

        {powers.length ? (
          <div className="flex flex-wrap justify-center gap-2" aria-label="การ์ดพิเศษที่ใช้ได้">
            {powers.map((key) => {
              const active = (key === 'boost' && modal.boost) || (key === 'fast' && modal.fast)
              return (
                <button
                  key={key}
                  type="button"
                  aria-pressed={active}
                  onClick={() => props.onPower(key)}
                  className={`rounded-full border-2 px-3 py-1.5 text-sm font-bold ${active ? 'border-amber-700 bg-amber-300' : 'border-amber-300 bg-amber-50'}`}
                >
                  {SPECIAL_INFO[key].emoji} {SPECIAL_INFO[key].name}
                  {active ? ' ✓' : ''}
                </button>
              )
            })}
          </div>
        ) : null}

        {result ? (
          <>
            <div className="flex items-center gap-3 rounded-2xl bg-white p-3">
              <Hero hero={player.hero} className="w-16 flex-none" />
              <div>
                <p className={`text-xl font-bold ${result.correct ? 'text-green-700' : 'text-red-600'}`}>{result.line}</p>
                {result.correct ? (
                  <p>
                    {result.outcome.won
                      ? 'เปิดประตูปราสาทได้แล้ว!'
                      : `ได้ 🪙 ${result.outcome.coinsGained} เหรียญ · เดิน ${result.outcome.to - result.outcome.from} ช่อง`}
                  </p>
                ) : (
                  <p>
                    คำตอบคือ <b>{card.answerText}</b>
                  </p>
                )}
                <p className="text-sm text-slate-600">💡 {card.why}</p>
              </div>
            </div>
            {result.shieldOffer ? (
              <div className="flex flex-wrap justify-center gap-3">
                <Button onClick={props.onShield}>🛡️ ใช้ TIME SHIELD ตอบใหม่</Button>
                <Button variant="secondary" onClick={props.onProceed}>
                  ไม่ใช้ ไปต่อ
                </Button>
              </div>
            ) : (
              <Button size="lg" fullWidth onClick={props.onProceed}>
                {result.correct ? (result.outcome.won ? '👑 เข้าปราสาท!' : '👣 เดินเลย!') : 'ไปต่อ ➜'}
              </Button>
            )}
          </>
        ) : null}
      </div>
      <p className="px-4 pb-2.5 text-right font-display text-xs" style={{ color: 'var(--c)' }}>
        {card.id}
      </p>
    </div>
  )
}

/**
 * หน้าปัดที่หมุนเข็มได้
 *
 * กดปุ่มหมุนทีละชั่วโมงหรือทีละ 5 นาที หรือลากเข็มยาวบนหน้าปัด
 * หมุนเข็มยาวเลย 12 แล้วเข็มสั้นขยับตามเหมือนนาฬิกาจริง
 * ตั้งใจไม่มีตัวเลขบอกเวลาข้าง ๆ เพราะเด็กจะกดจนตัวเลขตรงโดยไม่ดูเข็มเลย
 */
function ClockSetter({ modal, onSet, onCheck }: { modal: CardModal; onSet: (set: [number, number]) => void; onCheck: () => void }) {
  const svgRef = useRef<SVGSVGElement>(null)
  const dragging = useRef(false)
  const card = modal.card
  const done = modal.result !== null
  const [h, m] = done && !modal.result?.correct && card.kind === 'set' ? card.target : modal.set

  const turnMinutes = (delta: number) => {
    let [hh, mm] = modal.set
    mm += delta
    if (mm >= 60) {
      mm -= 60
      hh = (hh % 12) + 1
    }
    if (mm < 0) {
      mm += 60
      hh = ((hh + 10) % 12) + 1
    }
    playSfx('click')
    onSet([hh, mm])
  }

  const turnHours = (delta: number) => {
    playSfx('click')
    onSet([((modal.set[0] + delta + 11) % 12) + 1, modal.set[1]])
  }

  const fromPointer = (event: ReactPointerEvent<SVGSVGElement>) => {
    const box = svgRef.current?.getBoundingClientRect()
    if (!box) return
    // จุดกึ่งกลางหน้าปัดอยู่ที่ (0,0) ใน viewBox -55 -60 110 118
    const cx = box.left + (box.width * 55) / 110
    const cy = box.top + (box.height * 60) / 118
    let angle = (Math.atan2(event.clientX - cx, -(event.clientY - cy)) * 180) / Math.PI
    if (angle < 0) angle += 360
    const minute = (Math.round(angle / 30) * 5) % 60
    if (minute !== modal.set[1]) {
      playSfx('click')
      onSet([modal.set[0], minute])
    }
  }

  const art = clockArt(h, m)
  return (
    <div className="flex flex-col items-center gap-2.5">
      <svg
        ref={svgRef}
        viewBox={art.viewBox}
        role="img"
        aria-label={done ? art.label : 'หน้าปัดที่หมุนเข็มได้'}
        className={`w-[min(230px,66vw)] ${done ? '' : 'cursor-grab touch-none'}`}
        dangerouslySetInnerHTML={{ __html: art.inner }}
        onPointerDown={(event) => {
          if (done) return
          dragging.current = true
          event.currentTarget.setPointerCapture(event.pointerId)
          fromPointer(event)
        }}
        onPointerMove={(event) => dragging.current && !done && fromPointer(event)}
        onPointerUp={() => (dragging.current = false)}
        onPointerCancel={() => (dragging.current = false)}
      />
      {!done ? (
        <>
          <div className="grid w-full grid-cols-2 gap-2.5">
            {[
              { label: 'เข็มสั้น (ชั่วโมง)', color: HOUR_HAND, back: () => turnHours(-1), forward: () => turnHours(1), what: 'เข็มสั้น' },
              { label: 'เข็มยาว (นาที)', color: MINUTE_HAND, back: () => turnMinutes(-5), forward: () => turnMinutes(5), what: 'เข็มยาว' },
            ].map((control) => (
              <div key={control.label} className="flex flex-col items-center gap-1 rounded-2xl bg-white p-2">
                <span className="text-sm font-bold">
                  <i className="mr-1.5 inline-block h-2.5 w-2.5 rounded-full" style={{ background: control.color }} />
                  {control.label}
                </span>
                <div className="flex gap-2">
                  <button type="button" onClick={control.back} aria-label={`ถอย${control.what}`} className="h-11 w-14 rounded-xl border-[3px] border-slate-200 bg-white font-display text-xl">
                    ⟲
                  </button>
                  <button type="button" onClick={control.forward} aria-label={`หมุน${control.what}ไปข้างหน้า`} className="h-11 w-14 rounded-xl border-[3px] border-slate-200 bg-white font-display text-xl">
                    ⟳
                  </button>
                </div>
              </div>
            ))}
          </div>
          <p className="text-sm text-slate-600">ลากเข็มยาวบนหน้าปัดได้ด้วย</p>
          <Button onClick={onCheck}>✔ ตรวจคำตอบ</Button>
        </>
      ) : !modal.result?.correct ? (
        <p className="text-sm text-slate-600">นี่คือเข็มที่ถูกต้อง</p>
      ) : null}
    </div>
  )
}

