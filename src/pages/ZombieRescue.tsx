import { useCallback, useEffect, useRef, useState } from 'react'
import type { CSSProperties, ReactNode, RefObject } from 'react'
import { Button } from '../components/Button'
import { ResultCodeCard } from '../components/ResultCodeCard'
import { ScreenLayout } from '../components/ScreenLayout'
import { TopBar } from '../components/TopBar'
import { useGame } from '../context/useGame'
import { useFullscreen } from '../hooks/useFullscreen'
import { useGameSettings } from '../hooks/useGameSettings'
import { useIndicatorLog } from '../hooks/useIndicatorLog'
import { useMusic } from '../hooks/useMusic'
import { playSfx } from '../services/audioService'
import { applyBonusPercent, totalStats } from '../services/inventoryService'
import { recordZombiePractice, recordZombieRescue, recordZombieStickers, recordsOf } from '../services/recordService'
import { ZOMBIE_INDICATOR } from '../teacher/indicators'
import type { Player } from '../types/player'
import { BOARD_VIEWBOX, CURE_POSITION, SQUARE_POSITIONS, boardArt, charInner } from '../zombieRescue/art'
import { DOOR, SQUARE_INFO, ZONES, zoneOf } from '../zombieRescue/board'
import {
  EVENT_INFO,
  HERO_INFO,
  HERO_KEYS,
  ITEM_INFO,
  ITEM_KEYS,
  MAX_LIVES,
  MAX_PLAYERS,
  NAME_MAX,
  SKATE_STEPS,
  answerQuestion,
  appReward,
  buy,
  buyBlocker,
  createGame,
  current,
  drawEvent,
  endTurn,
  hasItem,
  landingOf,
  move,
  nextQuestion,
  openSupply,
  playerNames,
  randomCuteName,
  rest,
  reviewOf,
  spendItem,
  stageOf,
  topHelper,
  totalCorrect,
  takeMedkit,
} from '../zombieRescue/engine'
import type { AnswerContext, AnswerOutcome, EventDraw, HeroKey, ItemKey, SupplyReward, ZrState } from '../zombieRescue/engine'
import { TABLES, checkAnswer, practiceReward } from '../zombieRescue/questions'
import type { QAnswer, Question, Stage } from '../zombieRescue/questions'
import { clearZombieGame, loadRushBest, loadVaccineBook, loadZombieGame, saveRushBest, saveVaccineBook, saveZombieGame } from '../zombieRescue/storage'
import { rushReward, withRushResult } from '../zombieRescue/rush'
import type { RushBest, RushTable } from '../zombieRescue/rush'
import { curedCount, noteAnswer, weakFacts } from '../zombieRescue/vaccineBook'
import type { VaccineBook } from '../zombieRescue/vaccineBook'
import { villagerFor } from '../zombieRescue/villagers'
import { questionSpeech } from '../zombieRescue/speech'
import { speak, speechSupported, stopSpeaking } from '../services/speechService'
import {
  AnswerPad,
  BUDDY,
  CHEER,
  COMFORT,
  Char,
  CuredHead,
  Die,
  Hearts,
  QuestionVisual,
  HeartBurst,
  SpeakButton,
  StickerToast,
  VillagerArt,
  ZHead,
  emphasize,
  pick,
  stageColors,
} from '../components/zombieRescue/ZrParts'
import { PracticeScreen } from '../components/zombieRescue/PracticeScreen'
import { VaccineBookScreen } from '../components/zombieRescue/VaccineBookScreen'
import { RushScreen } from '../components/zombieRescue/RushScreen'
import { ClassScreen } from '../components/zombieRescue/ClassScreen'

/**
 * ZOMBIE RESCUE: ภารกิจรอดชีวิต พิชิตไวรัสซอมบี้ (เกมการคูณ ป.2)
 *
 * เดินบนแผนที่เมือง + จั่วโจทย์ ตามภาพกระดานที่ครูออกแบบ
 * ทุกตา: เจอซอมบี้ → แก้โจทย์คูณของเขตนั้น → ถูกได้พลังวัคซีนเท่าผลคูณแล้วทอยเต๋าเดิน
 * ผิด "ซอมบี้เข้ามาใกล้แล้ว!" เสีย ❤️ 1 แต่ไม่ตกรอบ เพราะเป็นเกมร่วมมือของทั้งวง
 *
 * ตรรกะทั้งหมดอยู่ใน src/zombieRescue/ ซึ่งมีชุดทดสอบของตัวเอง
 * ไฟล์นี้ทำแค่วาดหน้าจอ รับการแตะ และเล่นอนิเมชันเดินกับทอยเต๋า
 */

/* ── สถานะของหน้าต่าง ─────────────────────────────────────── */

interface QuestionModal {
  kind: 'question'
  ctx: AnswerContext
  stage: Stage
  q: Question
  buddy: string
  /** ใช้บัตรช่วยคิดกับข้อนี้ไปแล้ว */
  helped: boolean
  /** เปลี่ยนเมื่อต้องล้างแป้นตอบ (ตอบใหม่หลังใช้บัตรช่วยคิด) */
  attempt: number
  phase: 'ask' | 'offerHelp' | 'result'
  outcome: AnswerOutcome | null
  line: string
  /** ข้อนี้เพิ่งได้สติกเกอร์ในสมุดวัคซีน */
  sticker: boolean
}

type Modal =
  | QuestionModal
  | { kind: 'dice'; value: number; rolling: boolean }
  | { kind: 'supply'; reward: SupplyReward }
  | { kind: 'event'; draw: EventDraw }
  | { kind: 'rest' }
  | { kind: 'market' }
  | { kind: 'confirmEnd' }
  | { kind: 'end'; reward: number }

interface SetupState {
  count: number
  heroes: HeroKey[]
  names: string[]
  easy: boolean
  /** อ่านโจทย์ให้ฟังทุกข้อที่เปิดขึ้นมา (ไม่เก็บลงเกมค้าง เพราะเป็นความชอบของคนที่นั่งเล่นอยู่ตอนนี้) */
  autoRead: boolean
}

const whereText = (pos: number) =>
  pos >= DOOR ? 'หน้าประตู Z-CURE CENTER' : pos === 0 ? 'START · บ้านหลบภัย' : `ช่อง ${pos} · ${ZONES[zoneOf(pos)].icon} ${ZONES[zoneOf(pos)].name}`

const tableText = (stage: Stage) => {
  if (stage === 'boss') return 'ภารกิจ ดร.ซอมโบ'
  const table = ZONES[stage].table
  return table ? `แม่ ${table}` : 'รวมทุกแม่'
}

export function ZombieRescue({ player }: { player: Player }) {
  useMusic('adventure')
  const { patchPlayer } = useGame()
  const { settings } = useGameSettings()
  const fullscreen = useFullscreen()
  /* ส่งผลให้แผงคุณครูเฉพาะผู้เล่นคนที่ 1 ซึ่งเป็นเจ้าของบัญชีในเครื่องนี้ (เหตุผลเดียวกับเมืองแห่งเวลา) */
  const { logIndicator, currentCode } = useIndicatorLog(player.name)
  const [saved, setSaved] = useState<ZrState | null>(() => loadZombieGame(player.name))
  const [mode, setMode] = useState<'board' | 'practice' | 'rush' | 'class' | 'book'>('board')
  const [practicing, setPracticing] = useState(false)
  const [practiceFocus, setPracticeFocus] = useState(false)

  /*
   * สมุดวัคซีนจดทุกข้อที่ตอบบนเครื่องนี้ ทั้งของคนที่ 1 และเพื่อนในวง
   * เหตุผลเดียวกับตัวนับ zombieCorrect: เกมผลัดกันเล่นบนเครื่องเดียว สมุดจึงเป็นของทั้งวง
   * ใช้ ref คู่กับ state เพราะตอบสองครั้งติดกัน (ผิดแล้วใช้บัตรช่วยคิด) ต้องต่อจากสมุดล่าสุด
   */
  const [book, setBook] = useState<VaccineBook>(() => loadVaccineBook(player.name))
  /* สติกเกอร์ที่ได้ระหว่างเกมกระดานนี้ ไว้แห่ขบวนชาวเมืองตอนจบเกม (เกมที่เล่นต่อจากของค้างเริ่มนับใหม่) */
  const [gameStickers, setGameStickers] = useState<Array<{ each: number; groups: number }>>([])
  const bookRef = useRef(book)
  const noteFact = (q: Pick<Question, 'each' | 'groups'>, correct: boolean): boolean => {
    const noted = noteAnswer(bookRef.current, q, correct)
    bookRef.current = noted.book
    setBook(noted.book)
    saveVaccineBook(player.name, noted.book)
    return noted.newSticker
  }

  /* ⚡ ซอมบี้บุก!: สถิติดีสุดแยกแม่ เหรียญจ่ายตอนจบรอบ ข้อที่ถูกนับรวมกับ zombieCorrect เหมือนโหมดฝึก */
  const [rushBest, setRushBest] = useState<RushBest>(() => loadRushBest(player.name))
  const finishRush = (table: RushTable, cured: number) => {
    const { best, record } = withRushResult(rushBest, table, cured)
    if (record) {
      setRushBest(best)
      saveRushBest(player.name, best)
    }
    const reward = applyBonusPercent(rushReward(cured), totalStats(player).coinBonusPercent)
    patchPlayer({ coins: player.coins + Math.max(0, reward), records: recordZombiePractice(player, cured) })
    return { reward, record }
  }

  /* จำนวนสติกเกอร์เข้าบันทึกผู้เล่น ให้ถ้วยรางวัลกับหอเกียรติยศเห็น (สมุดที่ได้มาก่อนมีถ้วยก็นับด้วย) */
  const stickers = curedCount(book)
  useEffect(() => {
    if (stickers > recordsOf(player).zombieStickers) patchPlayer({ records: recordZombieStickers(player, stickers) })
  }, [stickers, player, patchPlayer])

  const finishPractice = (correct: number, total: number) => {
    const reward = applyBonusPercent(practiceReward(correct, total), totalStats(player).coinBonusPercent)
    patchPlayer({ coins: player.coins + Math.max(0, reward), records: recordZombiePractice(player, correct) })
    return reward
  }

  const [setup, setSetup] = useState<SetupState>({ count: 2, heroes: [...HERO_KEYS], names: [player.name, '', '', ''], easy: false, autoRead: false })
  const [game, setGame] = useState<ZrState | null>(null)
  const [modal, setModal] = useState<Modal | null>(null)
  const [freshModal, setFreshModal] = useState(0)
  const [walking, setWalking] = useState<{ index: number; pos: number } | null>(null)
  const timers = useRef<number[]>([])
  const paidRef = useRef(false)
  const rewardRef = useRef(0)

  useEffect(() => () => timers.current.forEach((id) => window.clearTimeout(id)), [])

  /* บันทึกเกมทุกครั้งที่เปลี่ยน เกมที่จบแล้วไม่ต้องเก็บ */
  useEffect(() => {
    if (game && !game.cured && !paidRef.current) saveZombieGame(player.name, game)
  }, [game, player.name])

  const later = (fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms))
  }

  const show = useCallback((next: Modal | null) => {
    setModal(next)
    setFreshModal((n) => n + 1)
  }, [])

  const start = () => {
    paidRef.current = false
    playSfx('click')
    const players = setup.heroes.slice(0, setup.count).map((hero, i) => ({ hero, name: setup.names[i] ?? '' }))
    setGame(createGame(players, setup.easy, Math.random))
    setGameStickers([])
    setSaved(null)
    setWalking(null)
    show(null)
  }

  const resume = () => {
    if (!saved) return
    paidRef.current = false
    playSfx('click')
    setGame(saved)
    setGameStickers([])
    setSaved(null)
    setWalking(null)
    show(null)
  }

  /* ── จบเกมและจ่ายรางวัล (ครั้งเดียวต่อเกม) ── */
  const finish = useCallback(
    (state: ZrState) => {
      if (paidRef.current) {
        show({ kind: 'end', reward: rewardRef.current })
        return
      }
      paidRef.current = true
      clearZombieGame()
      const reward = applyBonusPercent(appReward(state), totalStats(player).coinBonusPercent)
      rewardRef.current = reward
      patchPlayer({
        coins: player.coins + Math.max(0, reward),
        records: recordZombieRescue(player, { cured: state.cured, correct: totalCorrect(state) }),
      })
      playSfx('victory')
      show({ kind: 'end', reward })
    },
    [patchPlayer, player, show],
  )

  /* ── เปิดโจทย์ ── */
  const openQuestion = (state: ZrState, ctx: AnswerContext, stage: Stage) => {
    const drawn = nextQuestion(state, stage, Math.random)
    setGame(drawn.state)
    const buddy = ctx === 'zombie' ? BUDDY.zombie : BUDDY[stage]
    show({ kind: 'question', ctx, stage, q: drawn.question, buddy: pick(buddy.say), helped: false, attempt: 0, phase: 'ask', outcome: null, line: '', sticker: false })
    if (setup.autoRead) speak(questionSpeech(drawn.question))
  }

  const explore = () => {
    if (!game) return
    playSfx('click')
    const stage = stageOf(current(game).pos)
    openQuestion(game, stage === 'boss' ? 'boss' : 'turn', stage)
  }

  /* ── ตอบ ── */
  const finalize = (m: QuestionModal, state: ZrState, correct: boolean) => {
    const outcome = answerQuestion(state, m.q, correct, m.ctx)
    setGame(outcome.state)
    if (correct) {
      playSfx(outcome.cured ? 'victory' : 'correct')
      later(() => playSfx('coin'), 250)
    } else {
      playSfx(outcome.shieldUsed ? 'heal' : 'hurt')
    }
    setModal({ ...m, phase: 'result', outcome, line: pick(correct ? CHEER : COMFORT) })
  }

  const submit = (answer: QAnswer) => {
    if (!game || !modal || modal.kind !== 'question' || modal.phase !== 'ask') return
    const correct = checkAnswer(modal.q, answer)
    if (game.turn === 0) logIndicator(ZOMBIE_INDICATOR, correct)
    const sticker = noteFact(modal.q, correct)
    if (sticker) setGameStickers((list) => [...list, { each: modal.q.each, groups: modal.q.groups }])
    if (!correct && !modal.helped && hasItem(game, 'help')) {
      playSfx('wrong')
      setModal({ ...modal, phase: 'offerHelp' })
      return
    }
    finalize({ ...modal, sticker }, game, correct)
  }

  const applyHelp = () => {
    if (!game || !modal || modal.kind !== 'question') return
    setGame(spendItem(game, 'help'))
    playSfx('zap')
    setModal({ ...modal, helped: true, phase: 'ask', attempt: modal.attempt + 1 })
  }

  const giveUp = () => {
    if (!game || !modal || modal.kind !== 'question') return
    finalize(modal, game, false)
  }

  const applyRadio = () => {
    if (!game || !modal || modal.kind !== 'question' || modal.phase !== 'ask' || modal.helped || !hasItem(game, 'radio')) return
    playSfx('zap')
    openQuestion(spendItem(game, 'radio'), modal.ctx, modal.stage)
  }

  /* ── เดินตัวเดินทีละช่อง ── */
  const walk = (index: number, from: number, to: number, done: () => void) => {
    if (to === from || !settings.animationsEnabled) {
      done()
      return
    }
    const dir = to > from ? 1 : -1
    let pos = from
    setWalking({ index, pos })
    const step = () => {
      pos += dir
      setWalking({ index, pos })
      playSfx('click')
      if (pos === to) {
        later(() => {
          setWalking(null)
          done()
        }, 260)
      } else {
        later(step, 330)
      }
    }
    later(step, 330)
  }

  /* หน้าต่างโจทย์ปิดแล้วหยุดเสียงอ่านที่ค้างอยู่ */
  useEffect(() => {
    if (modal?.kind !== 'question') stopSpeaking()
  }, [modal?.kind])

  const nextTurn = (state: ZrState) => {
    setGame(endTurn(state))
    show(null)
  }

  /* ── หลังตอบ ── */
  const afterAnswer = () => {
    if (!game || !modal || modal.kind !== 'question' || !modal.outcome) return
    const { outcome, ctx } = modal
    if (outcome.cured) {
      finish(game)
      return
    }
    if (ctx === 'turn' && outcome.correct) {
      rollDice()
      return
    }
    nextTurn(game)
  }

  const rollDice = () => {
    show({ kind: 'dice', value: 1 + Math.floor(Math.random() * 6), rolling: true })
    playSfx('click')
    const spin = settings.animationsEnabled ? 750 : 0
    later(() => {
      const value = 1 + Math.floor(Math.random() * 6)
      setModal({ kind: 'dice', value, rolling: false })
      playSfx('pickup')
    }, spin)
  }

  const walkDice = (value: number, skate: boolean) => {
    if (!game) return
    let state = game
    let steps = value
    if (skate) {
      state = spendItem(state, 'skate')
      steps += SKATE_STEPS
      playSfx('zap')
    }
    const moved = move(state, steps)
    setGame(moved.state)
    show(null)
    walk(moved.state.turn, moved.from, moved.to, () => land(moved.state, moved.from, moved.to))
  }

  /* ── ทำตามช่องที่หยุด ── */
  const land = (state: ZrState, from: number, to: number) => {
    const kind = landingOf(from, to)
    if (kind === 'rest') {
      setGame(rest(state))
      playSfx('heal')
      show({ kind: 'rest' })
    } else if (kind === 'item') {
      const opened = openSupply(state, Math.random)
      setGame(opened.state)
      playSfx('chest')
      show({ kind: 'supply', reward: opened.reward })
    } else if (kind === 'event') {
      const drawn = drawEvent(state)
      setGame(drawn.state)
      playSfx('pickup')
      show({ kind: 'event', draw: drawn })
    } else if (kind === 'market') {
      playSfx('coin')
      show({ kind: 'market' })
    } else if (kind === 'zombie') {
      playSfx('bossRoar')
      openQuestion(state, 'zombie', zoneOf(to))
    } else {
      nextTurn(state)
    }
  }

  const closeLanding = () => {
    if (!game || !modal) return
    if (modal.kind === 'event' && modal.draw.to !== modal.draw.from) {
      const { from, to } = modal.draw
      const state = game
      show(null)
      walk(state.turn, from, to, () => nextTurn(state))
      return
    }
    nextTurn(game)
  }

  /* ── หน้าตั้งค่า ── */
  if (!game) {
    return (
      <>
        <TopBar player={player} title="ZOMBIE RESCUE" backTo="/menu" backLabel="กลับเมนู" />
        <ScreenLayout width={mode === 'class' ? 'wide' : 'normal'} className={fullscreen.active && mode === 'class' ? 'zr-fullscreen' : ''}>
          <FullscreenButton state={fullscreen} className="mb-3 ml-auto" />
          {!practicing ? (
            <div className="zr-tabs mb-4 grid grid-cols-2 gap-2 sm:grid-cols-5" role="tablist" aria-label="เลือกโหมด">
              {(
                [
                  ['board', '🗺️ ผจญภัยในเมือง', 'เล่นด้วยกัน 1–4 คน'],
                  ['practice', '🎯 ฝึกสูตรคูณ', 'คูณและหาร รอบละ 10 ข้อ'],
                  ['rush', '⚡ ซอมบี้บุก!', 'ท้าเวลา 60 วินาที'],
                  ['class', '📺 ทั้งห้องเรียน', 'ครูเปิดขึ้นจอใหญ่'],
                  ['book', '📒 สมุดวัคซีน', `สติกเกอร์ ${curedCount(book)}/50${weakFacts(book).length ? ` · พลาด ${weakFacts(book).length}` : ''}`],
                ] as const
              ).map(([key, label, note]) => (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={mode === key}
                  onClick={() => {
                    setMode(key)
                    setPracticeFocus(false)
                  }}
                  className={`rounded-2xl border-2 px-3 py-2.5 text-left transition ${
                    mode === key ? 'border-gold-300 bg-gold-500/15' : 'border-white/10 bg-white/5 hover:border-white/25'
                  }`}
                >
                  <span className="block font-black text-white">{label}</span>
                  <span className="block text-xs text-slate-300">{note}</span>
                </button>
              ))}
            </div>
          ) : null}
          {mode === 'board' ? (
            <SetupPanel setup={setup} onChange={setSetup} onStart={start} saved={saved} onResume={resume} />
          ) : mode === 'class' ? (
            <ClassScreen onPlayingChange={setPracticing} />
          ) : mode === 'rush' ? (
            <RushScreen
              best={rushBest}
              reduceMotion={!settings.animationsEnabled}
              onAnswer={(fact, correct) => {
                logIndicator(ZOMBIE_INDICATOR, correct)
                return noteFact(fact, correct)
              }}
              onFinish={finishRush}
              onPlayingChange={setPracticing}
            />
          ) : mode === 'book' ? (
            <VaccineBookScreen
              book={book}
              playerName={player.name}
              onPractice={() => {
                playSfx('click')
                setPracticeFocus(true)
                setMode('practice')
              }}
            />
          ) : (
            <PracticeScreen
              key={practiceFocus ? 'focus' : 'pick'}
              playerName={player.name}
              book={book}
              startFocus={practiceFocus}
              onAnswer={(q, correct) => {
                // ข้อหาร (แบ่งวัคซีน) ไม่ใช่ตัวชี้วัดการคูณ และไม่ใช่ข้อในสมุดวัคซีน
                if (q.key.startsWith('div-')) return false
                logIndicator(ZOMBIE_INDICATOR, correct)
                return noteFact(q, correct)
              }}
              onFinish={finishPractice}
              onPlayingChange={setPracticing}
            />
          )}
        </ScreenLayout>
      </>
    )
  }

  const me = current(game)
  const busy = walking !== null || modal !== null
  const shownPos = (index: number) => (walking && walking.index === index ? walking.pos : game.players[index].pos)
  const stage = stageOf(me.pos)
  const energyPct = Math.min(100, Math.round((game.team.energy / game.target) * 100))

  return (
    <>
      <TopBar player={player} title="ZOMBIE RESCUE" backTo="/menu" backLabel="กลับเมนู" />
      <ScreenLayout width="wide" className={fullscreen.active ? 'zr-fullscreen' : ''}>
        <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="ta-board zr-board">
            <svg viewBox={BOARD_VIEWBOX} className="mx-auto block h-auto max-h-[calc(100vh-140px)] w-full" role="img" aria-label="แผนที่เมือง ZOMBIE RESCUE">
              <g dangerouslySetInnerHTML={{ __html: boardArt() }} />
              {game.players
                .map((_, i) => i)
                .sort((a, b) => Number(a === game.turn) - Number(b === game.turn))
                .map((i) => {
                  const p = game.players[i]
                  const cured = game.curedBy === i
                  const [x, y] = cured ? CURE_POSITION : SQUARE_POSITIONS[shownPos(i)]
                  const offset = [[-4, -4], [4, -4], [-4, 4], [4, 4]][i]
                  const now = i === game.turn
                  // ตัวบนติดป้ายชื่อไว้เหนือหัว ตัวล่างไว้ใต้เท้า ตัวซ้ายชิดขวาไปทางซ้าย ตัวขวาเริ่มไปทางขวา
                  // ป้ายของคนที่ยืนช่องเดียวกันจึงไม่ทับกัน
                  const tagY = offset[1] < 0 ? -8.2 : 10.4
                  const tag = pawnTag(p.name)
                  return (
                    <g key={i} className={`ta-pawn ${now ? 'ta-pawn-now' : ''}`} style={{ transform: `translate(${x + offset[0]}px, ${y + offset[1]}px)` }}>
                      <g>
                        <ellipse cx="0" cy="6.2" rx="4.4" ry="1.4" fill="rgba(35,50,74,.3)" />
                        <circle r="5.8" fill="#fff" stroke={HERO_INFO[p.hero].color} strokeWidth={now ? 1.6 : 1} />
                        <svg x="-4.9" y="-5.9" width="9.8" height="11.8" viewBox="0 0 40 48" dangerouslySetInnerHTML={{ __html: charInner(p.hero) }} />
                      </g>
                      <text
                        className="zr-pawn-tag"
                        x={offset[0] < 0 ? 2.2 : -2.2}
                        y={tagY}
                        textAnchor={offset[0] < 0 ? 'end' : 'start'}
                        fill={HERO_INFO[p.hero].color}
                        fontSize={now ? 3.6 : 3.1}
                      >
                        {tag}
                      </text>
                    </g>
                  )
                })}
            </svg>
          </div>

          <div className="flex flex-col gap-3">
            <FullscreenButton state={fullscreen} className="self-end" />
            <section className="panel panel-corners p-4" aria-live="polite">
              <div className="flex items-center gap-3">
                <Char k={me.hero} className="w-16 flex-none" />
                <div className="min-w-0">
                  <p className="text-lg font-black text-white">ตาของ {me.name}</p>
                  <p className="text-sm text-slate-300">
                    รอบที่ {game.round} · {whereText(me.pos)}
                  </p>
                  <p className="mt-0.5 text-sm">
                    <Hearts lives={me.lives} max={MAX_LIVES} /> <span className="ml-1 text-slate-200">🥫 {me.supplies}</span>
                    {me.boost ? <span className="ml-1 text-gold-300">⚡×2</span> : null}
                  </p>
                </div>
              </div>
              {game.cured ? (
                <Button className="mt-4" fullWidth onClick={() => finish(game)}>
                  💉 ดูผลภารกิจ
                </Button>
              ) : (
                <div className="mt-4 grid gap-2">
                  <Button size="lg" fullWidth disabled={busy} onClick={explore} silent>
                    {stage === 'boss' ? '💉 ภารกิจ ดร.ซอมโบ' : `🧟 ออกสำรวจ · ${tableText(stage)}`}
                  </Button>
                  {me.lives < MAX_LIVES && me.items.includes('medkit') ? (
                    <Button
                      variant="secondary"
                      fullWidth
                      disabled={busy}
                      silent
                      onClick={() => {
                        setGame(takeMedkit(game))
                        playSfx('heal')
                      }}
                    >
                      💉 ใช้ยา ฟื้น ❤️ 1 ดวง
                    </Button>
                  ) : null}
                  {stage === 'boss' ? (
                    <p className="text-sm text-gold-200">
                      ตอบถูกได้พลังวัคซีนเข้าหลอดของทีม หลอดเต็มเมื่อไร ยา Z-CURE ก็สำเร็จ!
                    </p>
                  ) : null}
                </div>
              )}
            </section>

            <section className="panel p-4" aria-label="พลังวัคซีนของทีม">
              <div className="flex items-baseline justify-between gap-2">
                <p className="font-bold text-white">🧪 พลังวัคซีนของทีม</p>
                <p className="font-display tabular-nums text-sky-300">
                  {game.team.energy.toLocaleString('th-TH')} / {game.target.toLocaleString('th-TH')}
                </p>
              </div>
              <div className="mt-2 h-4 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-valuemin={0} aria-valuemax={game.target} aria-valuenow={game.team.energy}>
                <div className="zr-energy h-full rounded-full" style={{ width: `${energyPct}%` }} />
              </div>
              <p className="mt-2 flex items-center gap-1.5 text-sm text-slate-300">
                <ZHead className="h-5 w-5" /> ➜ <CuredHead className="h-5 w-5" /> รักษาผู้ติดเชื้อแล้ว {game.team.rescued} คน
              </p>
            </section>

            <ul className="grid gap-2" aria-label="ทีมผู้รอดชีวิต">
              {game.players.map((p, i) => (
                <li
                  key={i}
                  className={`flex items-center gap-3 rounded-2xl border-2 bg-white/5 px-3 py-2 ${i === game.turn ? '' : 'border-transparent'}`}
                  style={i === game.turn ? { borderColor: HERO_INFO[p.hero].color } : undefined}
                >
                  <Char k={p.hero} className="w-10 flex-none" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold text-white">{p.name}</p>
                    <p className="text-xs text-slate-400">{game.curedBy === i ? '💉 อยู่ใน Z-CURE CENTER' : whereText(p.pos)}</p>
                    <p className="mt-0.5 text-sm">
                      <Hearts lives={p.lives} max={MAX_LIVES} /> <span className="text-slate-300">🥫 {p.supplies}</span>
                    </p>
                    {p.items.length ? (
                      <p className="mt-1 flex flex-wrap gap-1">
                        {p.items.map((key, k) => (
                          <span key={k} title={ITEM_INFO[key].effect} className="rounded-full border border-sky-400/40 bg-sky-500/15 px-2 py-0.5 text-[11px] font-bold text-sky-100">
                            {ITEM_INFO[key].emoji} {ITEM_INFO[key].name}
                          </span>
                        ))}
                      </p>
                    ) : null}
                  </div>
                  <span className="font-display text-lg tabular-nums text-sky-300" aria-label={`หาพลังวัคซีนได้ ${p.energy}`}>
                    🧪 {p.energy}
                  </span>
                </li>
              ))}
            </ul>

            <Button variant="secondary" fullWidth disabled={busy} onClick={() => show({ kind: 'confirmEnd' })}>
              🏁 จบเกม ดูผลของทีม
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
            onSubmit={submit}
            onHelp={applyHelp}
            onGiveUp={giveUp}
            onRadio={applyRadio}
            onAfterAnswer={afterAnswer}
            onWalk={walkDice}
            onCloseLanding={closeLanding}
            onBuy={(key) => {
              setGame(buy(game, key))
              playSfx('coin')
            }}
            onEndNow={() => finish(game)}
            onClose={() => show(null)}
            onAgain={() => {
              setGame(null)
              show(null)
            }}
            resultCode={game.players[0].answered > 0 ? currentCode() : null}
            stickers={gameStickers}
            reduceMotion={!settings.animationsEnabled}
          />
        </div>
      ) : null}
    </>
  )
}

/* ── ป้ายชื่อบนกระดาน ── */

/** สระบน สระล่าง และวรรณยุกต์ของไทยไม่กินที่ในแนวนอน จึงไม่นับเป็นตัวอักษร */
const THAI_MARK = /[\u0E31\u0E34-\u0E3A\u0E47-\u0E4E]/
const TAG_MAX = 8

/** ย่อชื่อให้พอดีป้ายเล็กบนกระดาน แต่เก็บเลขท้ายของชื่อซ้ำ (ต้น 2) ไว้เสมอ */
function pawnTag(name: string): string {
  const chars = Array.from(name)
  const width = (list: string[]) => list.filter((c) => !THAI_MARK.test(c)).length
  if (width(chars) <= TAG_MAX) return name
  const suffix = name.match(/ \d+$/)?.[0] ?? ''
  const head = Array.from(name.slice(0, name.length - suffix.length))
  const out: string[] = []
  for (const c of head) {
    if (!THAI_MARK.test(c) && width(out) >= TAG_MAX - 2 - Array.from(suffix).length) break
    out.push(c)
  }
  return out.join('') + '…' + suffix
}

/* ── ปุ่มเต็มจอ (ซ่อนเองบนเครื่องที่ขยายเต็มจอไม่ได้ เช่น iPhone) ── */

function FullscreenButton({ state, className = '' }: { state: ReturnType<typeof useFullscreen>; className?: string }) {
  if (!state.supported) return null
  return (
    <button type="button" onClick={() => void state.toggle()} className={`zr-fs-btn ${className}`} aria-pressed={state.active}>
      {state.active ? '🗗 ออกจากเต็มจอ' : '⛶ เต็มจอ (ขึ้นจอใหญ่)'}
    </button>
  )
}

/* ── หน้าตั้งค่า ─────────────────────────────────────────── */

function SetupPanel({
  setup,
  onChange,
  onStart,
  saved,
  onResume,
}: {
  setup: SetupState
  onChange: (next: SetupState) => void
  onStart: () => void
  saved: ZrState | null
  onResume: () => void
}) {
  const chooseHero = (slot: number, hero: HeroKey) => {
    const heroes = [...setup.heroes]
    const other = heroes.indexOf(hero)
    heroes[other] = heroes[slot]
    heroes[slot] = hero
    onChange({ ...setup, heroes })
  }

  return (
    <div className="panel panel-hero panel-corners p-6">
      <div className="flex items-end justify-center gap-1" aria-hidden="true">
        {HERO_KEYS.map((hero) => (
          <Char key={hero} k={hero} className="zr-bob w-14 sm:w-16" />
        ))}
        <Char k="zombo" className="zr-sway ml-2 w-16 sm:w-20" />
      </div>
      <h2 className="mt-2 text-center font-display text-3xl font-black tracking-wide">
        <span className="text-[#7ED957]">ZOMBIE</span> <span className="text-[#FFB020]">RESCUE</span>
      </h2>
      <p className="text-center font-bold text-slate-200">ภารกิจรอดชีวิต พิชิตไวรัสซอมบี้</p>
      {saved ? (
        <div className="mt-4 rounded-2xl border border-gold-400/40 bg-gold-500/10 p-4">
          <p className="font-bold text-gold-200">มีเกมที่เล่นค้างไว้</p>
          <p className="mt-1 text-sm text-slate-300">
            {saved.players.map((p) => `${p.name} ${p.pos >= DOOR ? 'หน้าประตู' : p.pos === 0 ? 'START' : `ช่อง ${p.pos}`}`).join(' · ')} · 🧪 {saved.team.energy}/{saved.target}
          </p>
          <Button className="mt-3" fullWidth onClick={onResume}>
            ▶ เล่นต่อเกมเดิม
          </Button>
        </div>
      ) : null}
      <p className="mt-2 text-center text-sm leading-relaxed text-slate-300">
        ใช้ความรู้เรื่องการคูณ ช่วยกันหายา รักษาเมือง และพาเพื่อน ๆ กลับมาอย่างปลอดภัย!
        <br />
        เกมร่วมมือ 1–4 คน ผลัดกันเล่นบนเครื่องนี้
      </p>

      <fieldset className="mt-5">
        <legend className="mb-2 text-sm font-bold text-white">มีผู้รอดชีวิตกี่คน?</legend>
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
        <legend className="mb-2 text-sm font-bold text-white">เลือกตัวละครของแต่ละคน</legend>
        <div className="grid gap-3">
          {Array.from({ length: setup.count }, (_, slot) => (
            <div key={slot} className="rounded-2xl border border-white/10 bg-white/5 p-3">
              <div className="flex items-center gap-3">
                <Char k={setup.heroes[slot]} className="zr-bob w-12 flex-none" />
                <div className="min-w-0 flex-1">
                  <label htmlFor={`zr-name-${slot}`} className="block text-sm font-bold text-slate-200">
                    คนที่ {slot + 1} · ✏️ ตั้งชื่อตัวละคร
                  </label>
                  <div className="mt-1 flex gap-2">
                    <input
                      id={`zr-name-${slot}`}
                      value={setup.names[slot] ?? ''}
                      maxLength={NAME_MAX}
                      placeholder={`เช่น ข้าวปั้น (ไม่ใส่ = ${HERO_INFO[setup.heroes[slot]].name})`}
                      onChange={(event) => {
                        const names = [...setup.names]
                        names[slot] = event.target.value
                        onChange({ ...setup, names })
                      }}
                      className="zr-name-input min-w-0 flex-1"
                    />
                    <button
                      type="button"
                      className="zr-dice-name"
                      aria-label={`สุ่มชื่อน่ารักให้คนที่ ${slot + 1}`}
                      title="สุ่มชื่อ"
                      onClick={() => {
                        const names = [...setup.names]
                        names[slot] = randomCuteName(Math.random, names.slice(0, setup.count).filter((_, i) => i !== slot))
                        onChange({ ...setup, names })
                      }}
                    >
                      🎲
                    </button>
                  </div>
                </div>
              </div>
              <div className="mt-2 grid grid-cols-4 gap-2" role="group" aria-label={`ตัวละครของคนที่ ${slot + 1}`}>
                {HERO_KEYS.map((hero) => (
                  <button
                    key={hero}
                    type="button"
                    aria-pressed={setup.heroes[slot] === hero}
                    onClick={() => chooseHero(slot, hero)}
                    className={`ta-hero-tile ta-cute ${setup.heroes[slot] === hero ? 'ta-hero-tile-on' : ''}`}
                    style={{ '--hc': HERO_INFO[hero].color } as CSSProperties}
                  >
                    <Char k={hero} className="w-11" />
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
              {easy ? '🌱 ง่าย (ไม่เกิน 5 กลุ่ม มียาติดตัว)' : '⭐ ปกติ (1–10 กลุ่ม)'}
            </button>
          ))}
        </div>
      </fieldset>

      <ul className="mt-5 space-y-1.5 text-sm text-slate-300">
        <li>· 5 เขต 5 แม่: 🏠 ×2 · 🏪 ×3 · 🏫 ×4 · 🧪 ×5 · 🏥 รวมทุกแม่</li>
        <li>· ตอบถูก ได้พลังวัคซีนเท่าผลคูณ แล้วทอยลูกเต๋าเดิน · ตอบผิด ซอมบี้เข้ามาใกล้ เสีย ❤️ 1</li>
        <li>· ช่อง ➕ ได้ยา/อุปกรณ์ · ⚙️ การ์ดพิเศษ · ⚠️ เจอซอมบี้ · 💧 พักฟื้น · 🛒 ตลาด</li>
        <li>· เก็บพลังวัคซีนของทีมให้เต็ม แล้วช่วย ดร.ซอมโบ ผสมยา Z-CURE = ทั้งทีมชนะ!</li>
        <li>· เหรียญที่ทั้งวงทำได้เข้ากระเป๋าผู้เล่นเครื่องนี้ · ผลของคนที่ 1 ส่งให้แผงคุณครู</li>
      </ul>

      {speechSupported() ? (
        <button
          type="button"
          aria-pressed={setup.autoRead}
          onClick={() => onChange({ ...setup, autoRead: !setup.autoRead })}
          className={`mt-4 w-full rounded-xl border px-3 py-2 text-sm font-bold transition ${
            setup.autoRead ? 'border-gold-300 bg-gold-500/15 text-gold-200' : 'border-white/15 bg-white/5 text-slate-300'
          }`}
        >
          🔊 อ่านโจทย์ให้ฟังทุกข้อ: {setup.autoRead ? 'เปิด' : 'ปิด'} <span className="font-normal">(เหมาะกับน้องที่ยังอ่านไม่คล่อง)</span>
        </button>
      ) : null}
      <p className="mt-5 text-center text-sm text-slate-300">
        ทีมของเรา:{' '}
        <b className="text-white">
          {playerNames(setup.heroes.slice(0, setup.count).map((hero, i) => ({ hero, name: setup.names[i] ?? '' }))).join(' · ')}
        </b>
      </p>
      <Button size="lg" fullWidth className="mt-3" onClick={onStart}>
        🧟 เริ่มภารกิจ!
      </Button>
      <p className="mt-4 text-center text-sm text-slate-300">
        อยากเล่นบนโต๊ะในห้องเรียน?{' '}
        <a href="zombie-rescue.html" target="_blank" rel="noopener" className="font-bold text-gold-200 underline underline-offset-2">
          🖨️ เปิดชุดพิมพ์บอร์ดเกม
        </a>
      </p>
    </div>
  )
}

/* ── สรุปท้ายเกม: แม่ไหนคล่องแล้ว แม่ไหนควรฝึกอีก ─────────── */

function ReviewPanel({ game }: { game: ZrState }) {
  if (game.players.every((p) => p.history.length === 0)) return null
  return (
    <div className="grid gap-2 text-left">
      <p className="text-center font-bold">📊 ตอบถูกแต่ละแม่สูตรคูณ</p>
      <div className="overflow-x-auto rounded-2xl bg-white p-2">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="px-1 text-left font-bold">ผู้เล่น</th>
              {TABLES.map((t) => (
                <th key={t} className="px-1 text-center font-display">
                  ×{t}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {game.players.map((p, i) => {
              const review = reviewOf(p)
              return (
                <tr key={i} className="border-t border-slate-100">
                  <td className="max-w-[7rem] truncate px-1 py-1 font-bold">{p.name}</td>
                  {TABLES.map((t) => {
                    const tally = review[t]
                    const tone =
                      tally.total === 0 ? 'text-slate-300' : tally.right === tally.total ? 'text-green-700' : tally.right * 2 >= tally.total ? 'text-amber-700' : 'text-red-600'
                    return (
                      <td key={t} className={`px-1 text-center font-display tabular-nums ${tone}`}>
                        {tally.total === 0 ? '–' : `${tally.right}/${tally.total}`}
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <p className="text-center text-xs text-slate-500">สีแดงคือแม่ที่ควรไปฝึกต่อในโหมด 🎯 ฝึกสูตรคูณ</p>
    </div>
  )
}

/* ── หน้าต่างต่าง ๆ ──────────────────────────────────────── */

interface ModalViewProps {
  modal: Modal
  game: ZrState
  onSubmit: (answer: QAnswer) => void
  onHelp: () => void
  onGiveUp: () => void
  onRadio: () => void
  onAfterAnswer: () => void
  onWalk: (value: number, skate: boolean) => void
  onCloseLanding: () => void
  onBuy: (key: ItemKey) => void
  onEndNow: () => void
  onClose: () => void
  onAgain: () => void
  resultCode: string | null
  reduceMotion: boolean
  /** สติกเกอร์สมุดวัคซีนที่ได้ในเกมนี้ */
  stickers: Array<{ each: number; groups: number }>
}

function Sheet({
  containerRef,
  title,
  right,
  color,
  bg,
  label,
  pop,
  children,
}: {
  containerRef: RefObject<HTMLDivElement>
  title: string
  right?: string
  color: string
  bg: string
  label: string
  pop: string
  children: ReactNode
}) {
  return (
    <div ref={containerRef} className={`ta-card ta-cute ${pop}`} role="dialog" aria-modal="true" aria-label={label} style={{ '--c': color, '--bg': bg } as CSSProperties}>
      <div className="ta-card-head">
        <span>{title}</span>
        {right ? <span className="text-[#FFE27A]">{right}</span> : null}
      </div>
      <div className="grid gap-3 px-5 pb-5 pt-1 text-center">{children}</div>
    </div>
  )
}

function ModalView(props: ModalViewProps) {
  const { modal, game, reduceMotion } = props
  const pop = reduceMotion ? '' : 'ta-card-pop'
  const ref = useRef<HTMLDivElement>(null)
  const me = current(game)

  useEffect(() => {
    ref.current?.querySelector<HTMLButtonElement>('button:not([disabled])')?.focus({ preventScroll: true })
  }, [])

  if (modal.kind === 'question') return <QuestionView {...props} modal={modal} pop={pop} containerRef={ref} />

  if (modal.kind === 'dice') {
    const skate = !modal.rolling && me.items.includes('skate')
    return (
      <Sheet containerRef={ref} title="🎲 ทอยลูกเต๋า" color="#2E9E4F" bg="#E6F5EA" label="ทอยลูกเต๋า" pop={pop}>
        <Die value={modal.value} rolling={modal.rolling} className="mx-auto w-28" />
        {modal.rolling ? (
          <p className="text-xl font-bold">กำลังทอย…</p>
        ) : (
          <>
            <p className="text-2xl font-bold">ได้ {modal.value} แต้ม!</p>
            {skate ? (
              <div className="flex flex-wrap justify-center gap-3">
                <Button onClick={() => props.onWalk(modal.value, true)}>🛹 ใช้สเก็ตบอร์ด เดิน {modal.value + SKATE_STEPS} ช่อง</Button>
                <Button variant="secondary" onClick={() => props.onWalk(modal.value, false)}>
                  เดิน {modal.value} ช่อง
                </Button>
              </div>
            ) : (
              <Button size="lg" onClick={() => props.onWalk(modal.value, false)}>
                👣 เดินเลย!
              </Button>
            )}
          </>
        )}
      </Sheet>
    )
  }

  if (modal.kind === 'supply') {
    const { reward } = modal
    const info = reward.kind === 'item' ? ITEM_INFO[reward.item] : null
    return (
      <Sheet containerRef={ref} title="➕ กล่องเสบียง" color={SQUARE_INFO.item.color} bg="#E6F5EA" label="กล่องเสบียง" pop={pop}>
        <div className="ta-burst">{info ? info.emoji : '🥫'}</div>
        {info ? (
          <>
            <p className="mx-auto rounded-full bg-white px-5 py-1.5 font-display text-2xl">{info.name}</p>
            <p className="text-lg font-bold">{info.effect}</p>
            {reward.kind === 'item' && !reward.kept ? <p className="text-slate-600">กระเป๋าเต็มแล้ว เลยได้ 🥫 เสบียง 2 แทน</p> : <p className="text-slate-600">ใช้ได้เมื่อ: {info.when}</p>}
          </>
        ) : (
          <p className="text-xl font-bold">ได้ 🥫 เสบียง {reward.kind === 'supplies' ? reward.amount : 0} กระป๋อง!</p>
        )}
        <Button size="lg" onClick={props.onCloseLanding}>
          เก็บใส่กระเป๋า ✨
        </Button>
      </Sheet>
    )
  }

  if (modal.kind === 'event') {
    const info = EVENT_INFO[modal.draw.event]
    return (
      <Sheet containerRef={ref} title="⚙️ การ์ดพิเศษ" color={SQUARE_INFO.event.color} bg="#F2E9FB" label="การ์ดพิเศษ" pop={pop}>
        <div className="ta-burst">{info.emoji}</div>
        <p className="mx-auto rounded-full bg-white px-5 py-1.5 font-display text-2xl">{info.name}</p>
        <p className="text-lg font-bold">{info.effect}</p>
        {modal.draw.bagFull ? <p className="text-slate-600">กระเป๋าเต็มแล้ว เลยได้ 🥫 เสบียง 2 แทน</p> : null}
        <Button size="lg" onClick={props.onCloseLanding}>
          โอเค! ➜
        </Button>
      </Sheet>
    )
  }

  if (modal.kind === 'rest') {
    return (
      <Sheet containerRef={ref} title="💧 พักฟื้น" color={SQUARE_INFO.rest.color} bg="#E6F1FC" label="พักฟื้น" pop={pop}>
        <Char k={me.hero} className="mx-auto w-24" />
        <p className="text-xl font-bold">ได้พักดื่มน้ำ ฟื้น ❤️ 1 ดวง</p>
        <p>
          <Hearts lives={me.lives} max={MAX_LIVES} />
        </p>
        <p className="text-slate-600">ที่นี่เป็นจุดเซฟ ถ้าหมดแรงจะกลับมาเริ่มที่นี่</p>
        <Button size="lg" onClick={props.onCloseLanding}>
          ไปต่อ ➜
        </Button>
      </Sheet>
    )
  }

  if (modal.kind === 'market') {
    return (
      <Sheet containerRef={ref} title="🛒 ตลาดเสบียง" right={`🥫 ${me.supplies}`} color={SQUARE_INFO.market.color} bg="#FFF1DE" label="ตลาด" pop={pop}>
        <p className="text-lg font-bold">ใช้ 🥫 เสบียงแลกอุปกรณ์ (กระเป๋าใส่ได้ 4 ชิ้น)</p>
        <div className="grid gap-2">
          {ITEM_KEYS.map((key) => {
            const info = ITEM_INFO[key]
            const blocker = buyBlocker(game, key)
            return (
              <button key={key} type="button" className="ta-opt" disabled={blocker !== null} onClick={() => props.onBuy(key)} style={blocker ? { opacity: 0.5 } : undefined}>
                <span className="text-3xl leading-none">{info.emoji}</span>
                <span className="text-left">
                  <span className="block">{info.name}</span>
                  <span className="block text-sm font-normal text-slate-500">{info.effect}</span>
                </span>
                <span className="ml-auto whitespace-nowrap font-display" style={{ color: 'var(--c)' }}>
                  🥫 {info.price}
                </span>
              </button>
            )
          })}
        </div>
        <p className="text-sm text-slate-600">ในกระเป๋า: {me.items.length ? me.items.map((k) => ITEM_INFO[k].emoji).join(' ') : 'ยังว่าง'}</p>
        <Button size="lg" onClick={props.onCloseLanding}>
          เสร็จแล้ว ➜
        </Button>
      </Sheet>
    )
  }

  if (modal.kind === 'confirmEnd') {
    return (
      <Sheet containerRef={ref} title="🏁 จบเกม" color="#23324A" bg="#F4F7FB" label="จบเกม" pop={pop}>
        <p className="text-xl font-bold">หยุดภารกิจแล้วดูผลของทีมเลยไหม?</p>
        <div className="flex flex-wrap justify-center gap-3">
          <Button variant="secondary" onClick={props.onClose}>
            เล่นต่อ
          </Button>
          <Button onClick={props.onEndNow}>ดูผลของทีม</Button>
        </div>
      </Sheet>
    )
  }

  // สรุปท้ายเกม
  const helper = game.players[topHelper(game)]
  return (
    <Sheet
      containerRef={ref}
      title={game.cured ? '💉 Z-CURE สำเร็จ!' : '🏁 จบภารกิจ'}
      right={game.cured ? '✦✦✦' : undefined}
      color={game.cured ? '#1E9AAE' : '#23324A'}
      bg={game.cured ? '#E4F7FA' : '#F4F7FB'}
      label="ผลของทีม"
      pop={pop}
    >
      {game.cured ? (
        <>
          <div className="flex items-end justify-center gap-2">
            <Char k="zombo" className="w-20" />
            <span className="text-3xl">➜</span>
            <CuredHead className="w-16" />
          </div>
          <p className="text-xl font-bold">
            {game.players[game.curedBy ?? 0].name} ผสมยา Z-CURE สำเร็จ!
            <br />
            ดร.ซอมโบหายป่วย เมืองกลับมาเป็นปกติแล้ว 🌈
          </p>
        </>
      ) : (
        <p className="text-xl font-bold">
          ทีมเก็บพลังวัคซีนได้ {game.team.energy} จาก {game.target}
          <br />
          คราวหน้าไปให้ถึง Z-CURE CENTER นะ!
        </p>
      )}
      <div className="grid grid-cols-3 gap-2">
        <Stat label="พลังวัคซีน" value={`🧪 ${game.team.energy}`} />
        <Stat label="รักษาผู้ติดเชื้อ" value={`😊 ${game.team.rescued} คน`} />
        <Stat label="ตอบถูก" value={`✔ ${totalCorrect(game)} ข้อ`} />
      </div>
      <ol className="grid gap-2 text-left">
        {game.players.map((p, i) => (
          <li key={i} className="flex items-center gap-3 rounded-2xl bg-white px-3 py-1.5 font-bold">
            <Char k={p.hero} className="w-9" />
            <span className="min-w-0 flex-1 truncate">
              {p.name}
              {p === helper && helper.energy > 0 ? ' ⭐' : ''}
            </span>
            <span className="text-sm font-normal text-slate-500">
              ถูก {p.correct}/{p.answered}
            </span>
            <span className="tabular-nums text-sky-700">🧪 {p.energy}</span>
          </li>
        ))}
      </ol>
      {helper.energy > 0 ? <p className="text-sm text-slate-600">⭐ = หาพลังวัคซีนให้ทีมได้มากที่สุด</p> : null}
      {props.stickers.length ? (
        <div className="rounded-2xl bg-white p-3">
          <p className="font-bold text-green-700">💉 ชาวเมืองที่หายป่วยในเกมนี้ {props.stickers.length} คน</p>
          <ul className="mt-2 flex flex-wrap justify-center gap-2">
            {props.stickers.map((f, i) => {
              const v = villagerFor(f.each, f.groups)
              return (
                <li key={i} className="flex w-16 flex-col items-center text-xs leading-tight">
                  <VillagerArt v={v} cured className="zr-bob w-12" />
                  <b className="mt-0.5">{v.name}</b>
                  <span className="text-slate-500">
                    {f.groups} × {f.each}
                  </span>
                </li>
              )
            })}
          </ul>
          <p className="mt-1 text-xs text-slate-500">ดูทุกคนได้ในแท็บ 📒 สมุดวัคซีน</p>
        </div>
      ) : null}
      <ReviewPanel game={game} />
      <p className="rounded-2xl bg-white px-3 py-2 font-bold text-amber-700">ได้ 🪙 {modal.reward} เหรียญเข้ากระเป๋า</p>
      {props.resultCode ? (
        <div className="rounded-2xl bg-night-900 p-1 text-left">
          <ResultCodeCard code={props.resultCode} hint={`ผลของ ${game.players[0].name} (คนที่ 1) รวมกับโหมดอื่น ส่งรหัสบรรทัดนี้ให้คุณครูท้ายคาบ`} />
        </div>
      ) : null}
      <div className="flex flex-wrap justify-center gap-3">
        <Button size="lg" onClick={props.onAgain}>
          🔁 เล่นอีกครั้ง
        </Button>
      </div>
    </Sheet>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white px-2 py-2">
      <p className="font-display text-lg tabular-nums">{value}</p>
      <p className="text-xs text-slate-500">{label}</p>
    </div>
  )
}

function QuestionView(props: ModalViewProps & { modal: QuestionModal; pop: string; containerRef: RefObject<HTMLDivElement> }) {
  const { modal, game } = props
  const { q, outcome } = modal
  const me = current(game)
  const colors = modal.ctx === 'zombie' ? { color: SQUARE_INFO.zombie.color, bg: '#FDE8E6' } : stageColors(modal.stage)
  const buddyKey = modal.ctx === 'zombie' ? BUDDY.zombie.k : BUDDY[modal.stage].k
  const title =
    modal.ctx === 'boss'
      ? '💉 ภารกิจ ดร.ซอมโบ'
      : modal.ctx === 'zombie'
        ? '⚠️ เจอซอมบี้!'
        : `${ZONES[modal.stage === 'boss' ? 5 : modal.stage].icon} ${ZONES[modal.stage === 'boss' ? 5 : modal.stage].name}`
  const right = modal.stage === 'boss' ? 'รวมทุกแม่' : q.each ? `แม่ ${q.each}` : ''

  return (
    <div
      ref={props.containerRef}
      className={`ta-card ta-cute ${props.pop}`}
      role="dialog"
      aria-modal="true"
      aria-label={title}
      style={{ '--c': colors.color, '--bg': colors.bg } as CSSProperties}
    >
      <div className="ta-card-head">
        <span>{title}</span>
        <span className="text-[#FFE27A]">{right}</span>
      </div>
      <div className="flex flex-col gap-3 px-[18px] pb-[18px] pt-1.5">
        {modal.phase !== 'result' ? (
          <div className="flex items-center gap-2">
            <span className="flex h-[50px] w-[50px] flex-none items-end justify-center overflow-hidden rounded-full border-[2.5px] bg-white" style={{ borderColor: 'var(--c)' }}>
              <Char k={buddyKey} className="w-11" />
            </span>
            <span className="ta-bubble">{modal.buddy}</span>
          </div>
        ) : null}

        <div className="flex flex-col items-center gap-2">
          <QuestionVisual visual={q.visual} />
        </div>
        <p className="text-balance text-center text-[21px] font-bold leading-snug">{emphasize(q.text)}</p>
        <SpeakButton text={questionSpeech(q)} className="mx-auto" />

        {modal.helped && modal.phase === 'ask' ? (
          <p className="rounded-2xl border-2 border-dashed bg-white px-3 py-2 text-center font-bold" style={{ borderColor: 'var(--c)' }}>
            💡 {q.hint}
          </p>
        ) : null}

        {modal.phase === 'ask' ? (
          <>
            <AnswerPad key={modal.attempt} ask={q.ask} unit={q.unit} onSubmit={props.onSubmit} />
            {!modal.helped && me.items.includes('radio') ? (
              <button type="button" onClick={props.onRadio} className="mx-auto rounded-full border-2 border-sky-300 bg-sky-50 px-3 py-1.5 text-sm font-bold">
                📻 ใช้วิทยุ ขอโจทย์ข้อใหม่
              </button>
            ) : null}
          </>
        ) : null}

        {modal.phase === 'offerHelp' ? (
          <div className="grid gap-3 rounded-2xl bg-white p-3 text-center">
            <p className="text-xl font-bold text-red-600">ยังไม่ถูกนะ ซอมบี้ใกล้เข้ามาแล้ว!</p>
            <p>ใช้ 💡 บัตรช่วยคิด ดูคำใบ้แล้วตอบใหม่ได้ 1 ครั้ง</p>
            <div className="flex flex-wrap justify-center gap-3">
              <Button onClick={props.onHelp}>💡 ใช้บัตรช่วยคิด</Button>
              <Button variant="secondary" onClick={props.onGiveUp}>
                ไม่ใช้
              </Button>
            </div>
          </div>
        ) : null}

        {modal.phase === 'result' && outcome ? (
          <>
            <div className="relative flex items-center gap-3 rounded-2xl bg-white p-3 text-left">
              {outcome.correct ? <HeartBurst /> : null}
              {outcome.correct && modal.ctx !== 'turn' ? (
                <CuredHead className="zr-bob w-14 flex-none" />
              ) : (
                <Char k={outcome.correct ? me.hero : 'zombie'} className={`w-14 flex-none ${outcome.correct ? 'zr-bob' : 'zr-sway'}`} />
              )}
              <div>
                <p className={`text-xl font-bold ${outcome.correct ? 'text-green-700' : 'text-red-600'}`}>{modal.line}</p>
                {outcome.correct ? (
                  <p>
                    ได้ 🧪 พลังวัคซีน <b>+{outcome.energy}</b>
                    {outcome.energy > q.product ? ' (⚡ สองเท่า!)' : ''} · 🥫 +{outcome.supplies}
                  </p>
                ) : (
                  <p>
                    คำตอบคือ <b>{q.answerText}</b>
                  </p>
                )}
                {outcome.rescued ? <p className="font-bold text-green-700">รักษาผู้ติดเชื้อได้แล้ว! 🧟 ➜ 😊</p> : null}
                {outcome.cured ? <p className="font-bold text-sky-700">หลอดพลังเต็มแล้ว! ยา Z-CURE สำเร็จ! 💉</p> : null}
                {!outcome.correct ? (
                  <p className="font-bold">
                    {outcome.shieldUsed
                      ? '🛡️ โล่กันไว้ได้! ไม่เสีย ❤️'
                      : outcome.knockedOut
                        ? `หมดแรง! กลับไปพักที่${outcome.to === 0 ? ' START' : `ช่อง ${outcome.to}`} แล้วฟื้นเต็ม ❤️❤️❤️`
                        : 'ซอมบี้เข้ามาใกล้แล้ว! ❤️ −1'}
                  </p>
                ) : null}
                <p className="text-sm text-slate-600">💡 {q.why}</p>
              </div>
            </div>
            {modal.sticker ? <StickerToast each={q.each} groups={q.groups} /> : null}
            <Button size="lg" fullWidth onClick={props.onAfterAnswer}>
              {outcome.cured ? '💉 ดูผลภารกิจ' : modal.ctx === 'turn' && outcome.correct ? '🎲 ทอยลูกเต๋า' : 'ไปต่อ ➜'}
            </Button>
          </>
        ) : null}
      </div>
    </div>
  )
}
