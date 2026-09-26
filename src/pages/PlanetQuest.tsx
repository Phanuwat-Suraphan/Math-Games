import { useCallback, useEffect, useRef, useState } from 'react'
import type { ReactElement } from 'react'
import { Button } from '../components/Button'
import { ScreenLayout } from '../components/ScreenLayout'
import { TopBar } from '../components/TopBar'
import { AsteroidStage } from '../components/planetQuest/AsteroidField'
import { Bubble, BuddyBar, Confetti, PlanetBuddy, PokeButton } from '../components/planetQuest/Buddy'
import type { BuddyMood, PokeState, ReactionEvent } from '../components/planetQuest/Buddy'
import { CompanionSay, NewFriendCard } from '../components/planetQuest/Companion'
import { EclipseLab } from '../components/planetQuest/EclipseLab'
import { ExplorePanel } from '../components/planetQuest/ExplorePanel'
import { LearnPanel } from '../components/planetQuest/LearnPanel'
import type { LessonFocus } from '../components/planetQuest/LearnPanel'
import { ReactionContext } from '../components/planetQuest/QuestParts'
import type { Reaction, StageGameProps, StageOutcome } from '../components/planetQuest/QuestParts'
import {
  ConnectStage,
  MemoryStage,
  RiddleStage,
  SortStage,
  TimelineStage,
  TrueFalseStage,
} from '../components/planetQuest/WordGames'
import { Stars } from '../components/solar/SpaceParts'
import { useGame } from '../context/useGame'
import { useMusic } from '../hooks/useMusic'
import { playSfx } from '../services/audioService'
import {
  BUDDIES,
  WELCOME_LINE,
  awakePlanets,
  buddyFor,
  buddyStatus,
  goodbyeLine,
  pokeLine,
  sleepyLine,
  wakeLine,
} from '../planetQuest/buddies'
import type { BuddyStatus } from '../planetQuest/buddies'
import { companionSvgFile } from '../planetQuest/companionArt'
import { arriveLine, celebrateLine, companionFor, flightFact, newFriends, takeoffLine } from '../planetQuest/companions'
import type { CompanionId, JourneyStats } from '../planetQuest/companions'
import { LESSONS } from '../planetQuest/lessons'
import { shipColor } from '../planetQuest/ship'
import type { ShipColorId } from '../planetQuest/ship'
import { COINS_PER_STAR, STAGES, stageFor } from '../planetQuest/stages'
import type { StageKind } from '../planetQuest/stages'
import {
  clearedCount,
  loadProgress,
  markLesson,
  markMet,
  markVisited,
  recordStage,
  saveProgress,
  setShip,
  totalStars,
} from '../planetQuest/storage'
import type { QuestProgress } from '../planetQuest/storage'
import { PLANETS, getPlanet } from '../solar/planets'
import type { PlanetId } from '../solar/planets'
import { SolarScene } from '../solar/scene'
import { daysSinceJ2000 } from '../solar/space'
import type { BodyId } from '../solar/space'
import type { Player } from '../types/player'

/**
 * ภารกิจแปดดาว · วิทยาศาสตร์ ป.6 เรื่องระบบสุริยะ
 *
 * สามโหมดใช้ฉากระบบสุริยะสามมิติชุดเดียวกัน
 *
 *   🔭 สำรวจ   บินเที่ยว ชั่งน้ำหนัก นับอายุบนดาวต่าง ๆ เล่นห้องทดลองอุปราคา ไม่มีถูกผิด
 *   📖 เรียนรู้ บทเรียนสั้น ๆ หกบท ฉากบินไปหาดาวที่การ์ดกำลังพูดถึง
 *   🎮 ฝึกฝน   ลงจอดทีละดาว แต่ละดาวมีเกมไม่เหมือนกัน ใช้ความรู้เก็บดาว
 *
 * สลับโหมดได้ตลอดโดยฉากไม่ถูกสร้างใหม่ ยานยังจอดอยู่ที่เดิม
 * ระหว่างเล่นเกมในโหมดฝึกฝน ฉากหดเหลือแถบเตี้ย ๆ ไม่ดันตัวเกมลงไปใต้จอ
 *
 * ดาวทุกดวงเป็นเพื่อนดาวที่มีหน้าตาและนิสัยของตัวเอง (ดู planetQuest/buddies.ts)
 * ดาวที่ยังไม่มีใครไปเยี่ยมหลับอยู่ บินไปถึงแล้วดาวจะตื่น เป็นเป้าหมายเล็ก ๆ ให้อยากไปให้ครบ
 * ระหว่างเล่นเกม ดาวเจ้าบ้านเชียร์เมื่อตอบถูกและปลอบเมื่อพลาด
 */

/** สีหน้าของเพื่อนดาวบนปุ่มเลือกดาว */
const STATUS_MOOD: Record<BuddyStatus, BuddyMood> = { sleep: 'sleep', happy: 'happy', star: 'love' }

type Mode = 'home' | 'explore' | 'learn' | 'practice'
type PracticePhase = 'hub' | 'flying' | 'landed' | 'playing' | 'result'

const GAMES: Record<StageKind, (props: StageGameProps) => ReactElement | null> = {
  memory: MemoryStage,
  truefalse: TrueFalseStage,
  eclipse: EclipseLab,
  connect: ConnectStage,
  sort: SortStage,
  asteroid: AsteroidStage,
  timeline: TimelineStage,
  riddle: RiddleStage,
}

const MODES: readonly { id: Exclude<Mode, 'home'>; icon: string; title: string; note: string }[] = [
  { id: 'explore', icon: '🔭', title: 'โหมดสำรวจ', note: 'บินเที่ยว ชั่งน้ำหนักบนดาวอื่น เล่นห้องทดลองอุปราคา' },
  { id: 'learn', icon: '📖', title: 'โหมดเรียนรู้', note: 'บทเรียนสั้น ๆ 6 บท แตะดูทีละการ์ด' },
  { id: 'practice', icon: '🎮', title: 'โหมดฝึกฝน', note: 'ลงจอด 8 ดาว 8 เกม ใช้ความรู้เก็บดาว' },
]

export function PlanetQuest({ player }: { player: Player }) {
  const { settings, patchPlayer } = useGame()
  const reduceMotion = !settings.animationsEnabled

  const [mode, setMode] = useState<Mode>('home')
  const [phase, setPhase] = useState<PracticePhase>('hub')
  useMusic(phase === 'result' && mode === 'practice' ? 'victory' : phase === 'playing' && mode === 'practice' ? 'adventure' : 'menu')

  const [selected, setSelected] = useState<PlanetId>('mercury')
  const [shipAt, setShipAt] = useState<PlanetId>('earth')
  const [flying, setFlying] = useState(false)
  const [progress, setProgress] = useState<QuestProgress>(() => loadProgress(player.name))
  const [outcome, setOutcome] = useState<(StageOutcome & { coins: number; best: boolean }) | null>(null)
  const [seed, setSeed] = useState(() => `${player.name}-${Date.now()}`)
  const [notice, setNotice] = useState<string | null>(null)
  /** ดาวที่เพิ่งถูกปลุกเป็นครั้งแรก ดาวดวงนั้นจะทักด้วยประโยคตื่นนอน */
  const [justWoke, setJustWoke] = useState<PlanetId | null>(null)
  const [reaction, setReaction] = useState<ReactionEvent | null>(null)
  const reactionCount = useRef(0)
  /** ดาวที่เพิ่งถูกจิ้ม หายไปเองหลังห้าวินาที */
  const [poke, setPoke] = useState<PokeState | null>(null)
  const pokeCount = useRef(0)
  /** นับเที่ยวบิน ใช้หมุนเวียนประโยคของเพื่อนร่วมทาง */
  const [flight, setFlight] = useState(0)
  /** เพื่อนร่วมทางทักตอนยานถึงในโหมดสำรวจ */
  const [arrived, setArrived] = useState<PlanetId | null>(null)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const sceneRef = useRef<SolarScene | null>(null)

  const stage = stageFor(selected)
  const planet = getPlanet(selected)
  const buddy = buddyFor(selected)
  const statusOf = (id: PlanetId): BuddyStatus => buddyStatus(id, progress.best[id], progress.visited)
  const companion = companionFor(progress.ship.companion)
  const stats: JourneyStats = {
    awake: awakePlanets(progress.best, progress.visited).length,
    lessons: progress.lessons.length,
    stars: totalStars(progress),
  }
  /*
   * จิ้มในฉาก ดาวตอบในกล่องคำพูดบนฉาก ส่วนจิ้มบนการ์ด ดาวตอบในกล่องคำพูดของการ์ด
   * แยกกันแบบนี้ประโยคเดียวกันจึงไม่ขึ้นสองที่พร้อมกัน
   */
  const cardPoke = poke?.source === 'card' ? poke : null
  const scenePoke =
    poke?.source === 'scene' ? pokeLine(poke.id, poke.count, poke.id !== 'sun' && statusOf(poke.id) === 'sleep') : null
  /** ประโยคตอนจิ้มดาวดวงนี้ ถ้าดวงนี้เพิ่งถูกจิ้มบนการ์ด ไม่งั้นคืน null */
  const pokedText = (id: PlanetId): string | null =>
    cardPoke && cardPoke.id === id ? pokeLine(id, cardPoke.count, statusOf(id) === 'sleep').text : null

  const updateProgress = useCallback((change: (current: QuestProgress) => QuestProgress) => {
    setProgress((current) => {
      const next = change(current)
      if (next !== current) saveProgress(next)
      return next
    })
  }, [])

  /* ฉากเรียกกลับผ่าน ref เพราะฉากถูกสร้างครั้งเดียว (เหตุผลเดียวกับหน้ายานสำรวจ) */
  const handlersRef = useRef<{ pick: (id: BodyId | null) => void; arrive: (id: PlanetId) => void }>({
    pick: () => undefined,
    arrive: () => undefined,
  })
  handlersRef.current = {
    pick: (id) => {
      if (id === null) return
      // ระหว่างเล่นเกม ฉากหดเหลือแถบเล็ก จิ้มดาวแล้วจะเสียสมาธิเปล่า ๆ
      if (mode === 'practice' && (phase === 'playing' || phase === 'result')) return
      pokeBody(id, 'scene')
      if (id === 'sun') return
      const canPick = mode === 'explore' || (mode === 'practice' && phase === 'hub')
      if (!canPick) return
      setSelected(id)
    },
    arrive: (id) => {
      setShipAt(id)
      setFlying(false)
      if (buddyStatus(id, progress.best[id], progress.visited) === 'sleep') setJustWoke(id)
      // บินไปถึงดาวไหนก็ได้ของที่ระลึกของดาวนั้น ไม่ว่าจะอยู่โหมดไหนตอนยานถึง
      updateProgress((current) => markVisited(current, id))
      if (mode === 'practice' && phase === 'flying') {
        playSfx('pickup')
        setPhase('landed')
        return
      }
      playSfx('chest')
      setNotice(`📸 ถึง${getPlanet(id).name}แล้ว! ได้ของที่ระลึกของ${getPlanet(id).name}`)
      setArrived(id)
    },
  }

  /** จิ้มดาว ดาวเด้งดึ๋งในฉาก หัวเราะ แล้วเล่าเรื่องของตัวเอง ใช้ทั้งตอนแตะในฉากและแตะบนการ์ด */
  function pokeBody(id: BodyId, source: PokeState['source']): void {
    playSfx('boing')
    sceneRef.current?.poke(id)
    pokeCount.current += 1
    setPoke({ id, count: pokeCount.current, source })
  }

  /** เลือกดาวจากปุ่ม ต่างจากแตะในฉากตรงที่ไม่นับเป็นการจิ้ม */
  const choose = useCallback((id: PlanetId) => {
    playSfx('click')
    setSelected(id)
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const scene = new SolarScene(
      canvas,
      {
        onPick: (id) => handlersRef.current.pick(id),
        onArrive: (id) => handlersRef.current.arrive(id),
      },
      { days: daysSinceJ2000(new Date()), reduceMotion: !settings.animationsEnabled, parkedAt: 'earth' },
    )
    scene.setSpeed(2)
    scene.setAutoSpin(true)
    scene.setFaces(true)
    scene.start()
    sceneRef.current = scene
    return () => {
      scene.destroy()
      sceneRef.current = null
    }
    // สร้างฉากครั้งเดียวต่อการเปิดหน้า ค่าที่เปลี่ยนภายหลังส่งเข้าไปด้วย effect ข้างล่าง
  }, [])

  useEffect(() => {
    sceneRef.current?.setReduceMotion(reduceMotion)
  }, [reduceMotion])

  useEffect(() => {
    const scene = sceneRef.current
    if (!scene) return
    const choosing = mode === 'explore' || (mode === 'practice' && phase === 'hub')
    scene.setSelected(choosing ? selected : null)
    scene.setAim(choosing && selected !== shipAt && !flying)
    scene.setStamped(
      mode === 'explore'
        ? progress.visited
        : PLANETS.filter((item) => progress.best[item.id] !== undefined).map((item) => item.id),
    )
    scene.setAwake(awakePlanets(progress.best, progress.visited))
  }, [flying, mode, phase, progress, selected, shipAt])

  // ดาวที่ถูกจิ้มหัวเราะอยู่สักพักแล้วกลับไปพูดประโยคปกติ
  useEffect(() => {
    if (!poke) return
    const timer = window.setTimeout(() => setPoke(null), 5000)
    return () => window.clearTimeout(timer)
  }, [poke])

  /*
   * สียานกับเพื่อนร่วมทางจากอู่ต่อยาน
   * ภาพเพื่อนเป็น SVG ต้องแปลงเป็นรูปก่อนผืนผ้าใบถึงจะวาดได้ ระหว่างรอรูปโหลดยานบินไปก่อนแบบยังไม่มีเพื่อน
   */
  useEffect(() => {
    const scene = sceneRef.current
    if (!scene) return
    const look = shipColor(progress.ship.color)
    let current = true
    scene.setShipLook(look, null)
    const image = new Image()
    image.onload = () => {
      if (current) sceneRef.current?.setShipLook(look, image)
    }
    image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(companionSvgFile(progress.ship.companion))}`
    return () => {
      current = false
    }
  }, [progress.ship.color, progress.ship.companion])

  const changeShip = useCallback(
    (change: { color?: ShipColorId; companion?: CompanionId }) => {
      playSfx(change.companion ? 'pickup' : 'click')
      updateProgress((current) => setShip(current, change))
    },
    [updateProgress],
  )

  const friend = newFriends(stats, progress.met)[0] ?? null
  const friendShown = friend !== null && !(mode === 'practice' && (phase === 'playing' || phase === 'flying'))
  useEffect(() => {
    if (friend) playSfx('chest')
  }, [friend])

  const meetFriend = useCallback(
    (id: CompanionId, takeAlong: boolean) => {
      playSfx(takeAlong ? 'levelUp' : 'click')
      updateProgress((current) => markMet(takeAlong ? setShip(current, { companion: id }) : current, id))
    },
    [updateProgress],
  )

  const react = useCallback((kind: Reaction, streak = 1) => {
    reactionCount.current += 1
    setReaction({ id: reactionCount.current, kind, streak })
  }, [])

  const enterMode = useCallback((next: Mode) => {
    playSfx('click')
    const scene = sceneRef.current
    scene?.setAutoSpin(next === 'home')
    scene?.overview()
    setNotice(null)
    setOutcome(null)
    setJustWoke(null)
    setArrived(null)
    setPoke(null)
    setPhase('hub')
    setMode(next)
  }, [])

  const fly = useCallback((target: PlanetId) => {
    const scene = sceneRef.current
    if (!scene || scene.isFlying() || target === shipAt) return
    playSfx('click')
    setNotice(null)
    setArrived(null)
    setFlight((count) => count + 1)
    setFlying(true)
    scene.flyTo(target)
  }, [shipAt])

  /* ---------------- เรียนรู้ ---------------- */

  const focusLesson = useCallback((focus: LessonFocus) => {
    const scene = sceneRef.current
    if (!scene) return
    if (focus === 'overview') scene.overview()
    else scene.focusBody(focus)
  }, [])

  const completeLesson = useCallback(
    (lessonId: string) => {
      playSfx('levelUp')
      updateProgress((current) => markLesson(current, lessonId))
    },
    [updateProgress],
  )

  /** จบบทเรียนแล้วไปเล่นดาวที่ใช้ความรู้บทนั้นต่อทันที */
  const practiceFromLesson = useCallback((planet: PlanetId) => {
    playSfx('click')
    const scene = sceneRef.current
    scene?.setAutoSpin(false)
    scene?.overview()
    setNotice(null)
    setOutcome(null)
    setSelected(planet)
    setPhase('hub')
    setMode('practice')
  }, [])

  /* ---------------- ฝึกฝน ---------------- */

  const flyOrLand = useCallback(() => {
    const scene = sceneRef.current
    if (!scene || scene.isFlying()) return
    if (selected === shipAt) {
      playSfx('click')
      scene.focusBody(selected)
      setPhase('landed')
      return
    }
    setPhase('flying')
    fly(selected)
  }, [fly, selected, shipAt])

  const startGame = useCallback(() => {
    setSeed(`${player.name}-${selected}-${Date.now()}`)
    setOutcome(null)
    setNotice(null)
    setJustWoke(null)
    setReaction(null)
    setPhase('playing')
  }, [player.name, selected])

  const finish = useCallback(
    (result: StageOutcome) => {
      const previous = progress.best[selected] ?? 0
      updateProgress((current) => recordStage(current, selected, result.stars))
      const coins = result.stars * COINS_PER_STAR
      patchPlayer({ coins: player.coins + coins })
      playSfx(result.stars === 3 ? 'levelUp' : 'coin')
      setOutcome({ ...result, coins, best: result.stars > previous })
      setPhase('result')
    },
    [patchPlayer, player.coins, progress.best, selected, updateProgress],
  )

  const backToShip = useCallback(() => {
    sceneRef.current?.overview()
    setOutcome(null)
    // เลือกดาวดวงถัดไปที่ยังไม่ได้เล่นให้เลย เด็กจะไม่ต้องหาเองว่าเหลือดวงไหน
    const next = PLANETS.find((item) => progress.best[item.id] === undefined)
    if (next) setSelected(next.id)
    setPhase('hub')
  }, [progress.best])

  const Game = GAMES[stage.kind]
  const cleared = clearedCount(progress)
  const miniStage = mode === 'practice' && (phase === 'playing' || phase === 'result')

  return (
    <>
      <TopBar player={player} title="ภารกิจแปดดาว · วิทยาศาสตร์ ป.6" backTo="/menu" />
      <ScreenLayout width="wide">
        <div className={`sol-stage ${miniStage ? 'pq-stage-mini' : ''}`}>
          <canvas
            ref={canvasRef}
            className="sol-canvas"
            role="img"
            aria-label="ฉากสามมิติของระบบสุริยะ ลากเพื่อหมุน แตะดาวเพื่อเลือก"
          />
          <div className="sol-hud pointer-events-none absolute left-3 top-3">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-cyan-300">ภารกิจแปดดาว</p>
            <p className="text-sm font-black text-white">
              📸 {progress.visited.length}/8 · 📖 {progress.lessons.length}/{LESSONS.length} · ⭐ {totalStars(progress)}/24
            </p>
          </div>
          {scenePoke ? (
            <div className="pointer-events-none absolute inset-x-3 bottom-3 flex justify-center">
              <Bubble className="max-w-md">
                <span className="text-xs font-bold text-slate-500">{scenePoke.nickname}</span>
                <span className="block text-sm font-black">{scenePoke.text}</span>
              </Bubble>
            </div>
          ) : flying ? (
            <div className="pointer-events-none absolute inset-x-3 bottom-3 flex justify-center">
              <div className="w-full max-w-md">
                <CompanionSay id={companion.id} reduceMotion={reduceMotion} size={44}>
                  🚀 {takeoffLine(companion, planet.name, flight)}
                </CompanionSay>
              </div>
            </div>
          ) : null}
        </div>

        {mode !== 'home' ? (
          <nav aria-label="เลือกโหมด" className="mt-3 flex flex-wrap gap-2">
            <button type="button" className="sol-toggle" onClick={() => enterMode('home')}>
              🏠 หน้าแรก
            </button>
            {MODES.map((item) => (
              <button
                key={item.id}
                type="button"
                aria-pressed={mode === item.id}
                onClick={() => enterMode(item.id)}
                className={`sol-toggle ${mode === item.id ? 'sol-toggle-on' : ''}`}
              >
                {item.icon} {item.title}
              </button>
            ))}
          </nav>
        ) : null}

        {notice ? (
          <p role="status" className="mt-3 rounded-2xl border border-leaf-400/50 bg-leaf-500/15 px-4 py-3 text-sm font-semibold text-leaf-200">
            {notice}
          </p>
        ) : null}
        {mode === 'explore' && arrived ? (
          <div className="mt-2">
            <CompanionSay id={companion.id} reduceMotion={reduceMotion} size={44}>
              {arriveLine(companion, getPlanet(arrived).name, flight)}
            </CompanionSay>
          </div>
        ) : null}

        {friendShown && friend ? (
          <NewFriendCard
            key={friend}
            id={friend}
            reduceMotion={reduceMotion}
            onTakeAlong={() => meetFriend(friend, true)}
            onLater={() => meetFriend(friend, false)}
          />
        ) : null}

        {/* ---------------- หน้าแรก เลือกโหมด ---------------- */}
        {mode === 'home' ? (
          <section className="mt-4">
            <h2 className="title-hero text-2xl font-black sm:text-3xl">ภารกิจแปดดาว 🛸</h2>
            <p className="mt-1 text-sm text-slate-300">
              ออกเดินทางไปรู้จักระบบสุริยะ จะเที่ยวเล่น อ่านบทเรียน หรือลุยเกมก่อนก็ได้
            </p>
            <div className="pq-parade mt-4">
              {BUDDIES.map((item, index) => {
                const status = statusOf(item.id)
                const poked = cardPoke?.id === item.id ? cardPoke.count : 0
                return (
                  <span
                    key={item.id}
                    className={reduceMotion ? '' : 'pq-bob'}
                    style={{ animationDelay: `${index * -0.35}s` }}
                  >
                    <PokeButton
                      label={`จิ้ม${item.nickname}`}
                      count={poked}
                      reduceMotion={reduceMotion}
                      onPoke={() => pokeBody(item.id, 'card')}
                    >
                      <PlanetBuddy
                        planet={getPlanet(item.id)}
                        size="min(9.5vw, 56px)"
                        mood={poked && status !== 'sleep' ? 'love' : STATUS_MOOD[status]}
                        crown={status === 'star'}
                        animate={!reduceMotion}
                      />
                    </PokeButton>
                  </span>
                )
              })}
            </div>
            <Bubble tail="top" className="mx-auto mt-2 max-w-md text-center">
              {cardPoke && cardPoke.id !== 'sun' ? (
                <>
                  <span className="text-xs font-bold text-slate-500">{buddyFor(cardPoke.id).nickname}</span>
                  <span className="block text-sm font-black">{pokedText(cardPoke.id)}</span>
                </>
              ) : (
                <span className="text-sm font-black">{WELCOME_LINE}</span>
              )}
            </Bubble>
            <p className="mt-1 text-center text-xs text-slate-400">แตะเพื่อนดาวหรือแตะดาวในฉาก ดาวจะหัวเราะแล้วเล่าเรื่องของตัวเอง</p>
            <div className="mx-auto mt-3 max-w-md">
              <CompanionSay id={companion.id} reduceMotion={reduceMotion}>
                {`${companion.name}พร้อมออกเดินทางแล้ว! เปลี่ยนเพื่อนร่วมทางได้ที่อู่ต่อยานในโหมดสำรวจ`}
              </CompanionSay>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {MODES.map((item) => (
                <button key={item.id} type="button" onClick={() => enterMode(item.id)} className="pq-mode">
                  <span className="text-5xl" aria-hidden="true">
                    {item.icon}
                  </span>
                  <span className="mt-2 block text-xl font-black text-white">{item.title}</span>
                  <span className="mt-1 block text-sm text-slate-300">{item.note}</span>
                </button>
              ))}
            </div>
          </section>
        ) : null}

        {/* ---------------- สำรวจ ---------------- */}
        {mode === 'explore' ? (
          <ExplorePanel
            selected={selected}
            shipAt={shipAt}
            flying={flying}
            visited={progress.visited}
            best={progress.best}
            status={statusOf(selected)}
            justWoke={justWoke === selected}
            poke={cardPoke}
            shipColor={progress.ship.color}
            companion={progress.ship.companion}
            stats={stats}
            onPoke={(id) => pokeBody(id, 'card')}
            onShip={changeShip}
            reduceMotion={reduceMotion}
            onSelect={choose}
            onFly={fly}
          />
        ) : null}

        {/* ---------------- เรียนรู้ ---------------- */}
        {mode === 'learn' ? (
          <LearnPanel
            finished={progress.lessons}
            onFocus={focusLesson}
            onComplete={completeLesson}
            onPractice={practiceFromLesson}
          />
        ) : null}

        {/* ---------------- ฝึกฝน ---------------- */}
        {mode === 'practice' && phase === 'hub' ? (
          <section className="mt-4 space-y-3">
            <nav aria-label="เลือกดาว">
              <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {STAGES.map((item) => {
                  const best = progress.best[item.planet]
                  const status = statusOf(item.planet)
                  return (
                    <li key={item.planet}>
                      <button
                        type="button"
                        aria-pressed={selected === item.planet}
                        onClick={() => choose(item.planet)}
                        className={`sol-option ${selected === item.planet ? 'sol-option-on' : ''}`}
                      >
                        <span className="flex items-center gap-2">
                          <PlanetBuddy
                            planet={getPlanet(item.planet)}
                            size={38}
                            mood={selected === item.planet && status !== 'sleep' ? 'wow' : STATUS_MOOD[status]}
                            crown={status === 'star'}
                            animate={!reduceMotion}
                          />
                          <span className="font-black text-white">{getPlanet(item.planet).name}</span>
                        </span>
                        <span className="mt-1 block text-xs text-slate-300">
                          {item.icon} {item.title}
                        </span>
                        <span className="mt-1 block text-sm">
                          {best !== undefined ? (
                            <Stars count={best} />
                          ) : status === 'sleep' ? (
                            <span className="text-xs text-slate-400">💤 ยังหลับอยู่</span>
                          ) : (
                            <span className="text-xs text-slate-400">ยังไม่ได้เล่น</span>
                          )}
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </nav>

            <div className="sol-comms p-4 sm:p-5">
              <div className="flex items-center gap-3">
                <PokeButton
                  label={`จิ้ม${buddy.nickname}`}
                  count={cardPoke?.id === selected ? cardPoke.count : 0}
                  reduceMotion={reduceMotion}
                  onPoke={() => pokeBody(selected, 'card')}
                >
                  <PlanetBuddy
                    planet={planet}
                    size={72}
                    mood={statusOf(selected) === 'sleep' ? 'sleep' : cardPoke?.id === selected ? 'love' : 'happy'}
                    crown={statusOf(selected) === 'star'}
                    animate={!reduceMotion}
                    className={reduceMotion ? '' : 'pq-bob'}
                  />
                </PokeButton>
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-300">ดาวปลายทาง</p>
                  <h2 className="text-xl font-black text-white">
                    {stage.icon} {planet.name}: {stage.title}
                  </h2>
                </div>
              </div>
              <Bubble tail="top" className="mt-3">
                <span className="text-xs font-bold text-slate-500">{buddy.nickname}</span>
                <span className="block text-sm font-black">
                  {pokedText(selected) ?? (statusOf(selected) === 'sleep' ? sleepyLine(buddy) : buddy.invite)}
                </span>
              </Bubble>
              <p className="mt-2 text-sm text-slate-200">{stage.howTo}</p>
              <div className="mt-4">
                <Button size="lg" onClick={flyOrLand} icon={selected === shipAt ? '🛬' : '🚀'} silent disabled={flying}>
                  {selected === shipAt ? `ลงจอดที่${planet.name}` : `บินไป${planet.name}`}
                </Button>
              </div>
            </div>

            {cleared === PLANETS.length ? (
              <div className="sol-panel p-5 text-center">
                <p className="text-3xl" aria-hidden="true">
                  🏅
                </p>
                <p className="title-gold mt-1 text-xl font-black">นักบินอวกาศตัวจริง!</p>
                <p className="mt-1 text-sm text-slate-300">
                  {player.name} ลงจอดครบทั้งแปดดาวแล้ว ได้ดาวรวม {totalStars(progress)} จาก 24 ดวง
                  ลองเล่นซ้ำเพื่อเก็บให้ครบสามดาวทุกดวงนะ
                </p>
              </div>
            ) : null}
          </section>
        ) : null}

        {mode === 'practice' && phase === 'flying' ? (
          <section className="sol-panel mt-4 space-y-2 p-4">
            <CompanionSay id={companion.id} reduceMotion={reduceMotion}>
              💡 รู้ไหม {flightFact(companion, flight)}
            </CompanionSay>
            <p className="text-xs text-slate-400">ยานกำลังเดินทางไป{planet.name} ระหว่างนี้ลองลากฉากเพื่อหมุนดูระบบสุริยะได้</p>
          </section>
        ) : null}

        {mode === 'practice' && phase === 'landed' ? (
          <section className="sol-comms relative mt-4 p-5 sm:p-6">
            {justWoke === selected && !reduceMotion ? <Confetti seed={`wake-${selected}`} count={14} spread={140} /> : null}
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-300">🛬 ลงจอดที่{planet.name}แล้ว</p>
            <div className="mt-2 flex items-center gap-3">
              <span className={reduceMotion ? '' : 'pq-hop'}>
                <PokeButton
                  label={`จิ้ม${buddy.nickname}`}
                  count={cardPoke?.id === selected ? cardPoke.count : 0}
                  reduceMotion={reduceMotion}
                  onPoke={() => pokeBody(selected, 'card')}
                >
                  <PlanetBuddy
                    planet={planet}
                    size={96}
                    mood={cardPoke?.id === selected ? 'love' : 'wow'}
                    crown={statusOf(selected) === 'star'}
                    animate={!reduceMotion}
                  />
                </PokeButton>
              </span>
              <Bubble className="min-w-0 flex-1">
                <span className="text-xs font-bold text-slate-500">{buddy.nickname}</span>
                <span className="block text-base font-black">
                  {pokedText(selected) ?? (justWoke === selected ? wakeLine(buddy) : buddy.invite)}
                </span>
              </Bubble>
            </div>
            <div className="mt-2">
              <CompanionSay id={companion.id} reduceMotion={reduceMotion} size={44}>
                {arriveLine(companion, planet.name, flight)}
              </CompanionSay>
            </div>
            <h2 className="mt-3 text-2xl font-black text-white">
              {stage.icon} {stage.title}
            </h2>
            <p className="mt-2 text-sm text-slate-200">{stage.howTo}</p>
            <p className="mt-1 text-xs text-slate-400">เรื่องที่ได้ฝึก: {stage.topic}</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Button size="lg" onClick={startGame} icon="▶️">
                เริ่มเลย!
              </Button>
              <Button variant="ghost" onClick={backToShip}>
                กลับขึ้นยาน
              </Button>
            </div>
          </section>
        ) : null}

        {mode === 'practice' && phase === 'playing' ? (
          <section className="mt-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-lg font-black text-white">
                {stage.icon} {planet.name} · {stage.title}
              </h2>
              <Button variant="ghost" onClick={backToShip}>
                ออกจากด่าน
              </Button>
            </div>
            <BuddyBar planet={planet} buddy={buddy} reaction={reaction} reduceMotion={reduceMotion} />
            <ReactionContext.Provider value={react}>
              <Game key={seed} seed={seed} reduceMotion={reduceMotion} onFinish={finish} />
            </ReactionContext.Provider>
          </section>
        ) : null}

        {mode === 'practice' && phase === 'result' && outcome ? (
          <section className="sol-panel relative mt-4 p-5 text-center sm:p-7">
            {outcome.stars === 3 && !reduceMotion ? <Confetti seed={seed} count={22} spread={200} /> : null}
            <div className="sol-stamp-big mx-auto">
              <span className={reduceMotion ? '' : 'pq-hop'}>
                <PlanetBuddy
                  planet={planet}
                  size={84}
                  mood={outcome.stars === 3 ? 'love' : 'happy'}
                  crown={outcome.stars === 3}
                  animate={!reduceMotion}
                />
              </span>
              <p className="mt-1 text-lg font-black text-white">{planet.name}</p>
              <p className="text-2xl">
                <Stars count={outcome.stars} />
              </p>
            </div>
            <Bubble tail="top" className="mx-auto mt-3 max-w-md">
              <span className="text-xs font-bold text-slate-500">{buddy.nickname}</span>
              <span className="block text-base font-black">{goodbyeLine(buddy, outcome.stars)}</span>
            </Bubble>
            <div className="mx-auto mt-2 max-w-md text-left">
              <CompanionSay id={companion.id} reduceMotion={reduceMotion} size={44}>
                {celebrateLine(companion, outcome.stars)}
              </CompanionSay>
            </div>
            <p className="mt-4 text-base font-bold text-slate-100">{outcome.summary}</p>
            <p className="mt-1 text-sm text-gold-300">
              +{outcome.coins} เหรียญ{outcome.best ? ' · สถิติใหม่ของดาวดวงนี้!' : ''}
            </p>
            <p className="mx-auto mt-3 max-w-xl text-sm text-slate-300">
              รู้หรือไม่: {planet.facts[progress.plays % planet.facts.length]}
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              <Button size="lg" onClick={backToShip} icon="🚀">
                ไปดาวดวงต่อไป
              </Button>
              <Button variant="secondary" onClick={startGame} icon="🔁">
                เล่นดาวนี้อีกครั้ง
              </Button>
            </div>
          </section>
        ) : null}
      </ScreenLayout>
    </>
  )
}
