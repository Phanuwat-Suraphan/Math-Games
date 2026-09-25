import { useCallback, useEffect, useRef, useState } from 'react'
import type { ReactElement } from 'react'
import { Button } from '../components/Button'
import { ScreenLayout } from '../components/ScreenLayout'
import { TopBar } from '../components/TopBar'
import { AsteroidStage } from '../components/planetQuest/AsteroidField'
import { EclipseLab } from '../components/planetQuest/EclipseLab'
import { ExplorePanel } from '../components/planetQuest/ExplorePanel'
import { LearnPanel } from '../components/planetQuest/LearnPanel'
import type { LessonFocus } from '../components/planetQuest/LearnPanel'
import type { StageGameProps, StageOutcome } from '../components/planetQuest/QuestParts'
import {
  ConnectStage,
  MemoryStage,
  RiddleStage,
  SortStage,
  TimelineStage,
  TrueFalseStage,
} from '../components/planetQuest/WordGames'
import { PlanetDot, Stars } from '../components/solar/SpaceParts'
import { useGame } from '../context/useGame'
import { useMusic } from '../hooks/useMusic'
import { playSfx } from '../services/audioService'
import { LESSONS } from '../planetQuest/lessons'
import { COINS_PER_STAR, STAGES, stageFor } from '../planetQuest/stages'
import type { StageKind } from '../planetQuest/stages'
import {
  clearedCount,
  loadProgress,
  markLesson,
  markVisited,
  recordStage,
  saveProgress,
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
 */

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

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const sceneRef = useRef<SolarScene | null>(null)

  const stage = stageFor(selected)
  const planet = getPlanet(selected)

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
      if (id === null || id === 'sun') return
      const canPick = mode === 'explore' || (mode === 'practice' && phase === 'hub')
      if (!canPick) return
      playSfx('click')
      setSelected(id)
    },
    arrive: (id) => {
      setShipAt(id)
      setFlying(false)
      // บินไปถึงดาวไหนก็ได้ของที่ระลึกของดาวนั้น ไม่ว่าจะอยู่โหมดไหนตอนยานถึง
      updateProgress((current) => markVisited(current, id))
      if (mode === 'practice' && phase === 'flying') {
        playSfx('pickup')
        setPhase('landed')
        return
      }
      playSfx('chest')
      setNotice(`📸 ถึง${getPlanet(id).name}แล้ว! ได้ของที่ระลึกของ${getPlanet(id).name}`)
    },
  }

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
  }, [flying, mode, phase, progress, selected, shipAt])

  const enterMode = useCallback((next: Mode) => {
    playSfx('click')
    const scene = sceneRef.current
    scene?.setAutoSpin(next === 'home')
    scene?.overview()
    setNotice(null)
    setOutcome(null)
    setPhase('hub')
    setMode(next)
  }, [])

  const fly = useCallback((target: PlanetId) => {
    const scene = sceneRef.current
    if (!scene || scene.isFlying() || target === shipAt) return
    playSfx('click')
    setNotice(null)
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
          {flying ? (
            <div className="sol-hud pointer-events-none absolute bottom-3 left-3">
              <p className="text-sm font-bold text-cyan-200">🚀 กำลังบินไป{planet.name}…</p>
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

        {/* ---------------- หน้าแรก เลือกโหมด ---------------- */}
        {mode === 'home' ? (
          <section className="mt-4">
            <h2 className="title-hero text-2xl font-black sm:text-3xl">ภารกิจแปดดาว 🛸</h2>
            <p className="mt-1 text-sm text-slate-300">
              ออกเดินทางไปรู้จักระบบสุริยะ จะเที่ยวเล่น อ่านบทเรียน หรือลุยเกมก่อนก็ได้
            </p>
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
            reduceMotion={reduceMotion}
            onSelect={(id) => handlersRef.current.pick(id)}
            onFly={fly}
          />
        ) : null}

        {/* ---------------- เรียนรู้ ---------------- */}
        {mode === 'learn' ? <LearnPanel finished={progress.lessons} onFocus={focusLesson} onComplete={completeLesson} /> : null}

        {/* ---------------- ฝึกฝน ---------------- */}
        {mode === 'practice' && phase === 'hub' ? (
          <section className="mt-4 space-y-3">
            <nav aria-label="เลือกดาว">
              <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {STAGES.map((item) => {
                  const best = progress.best[item.planet]
                  return (
                    <li key={item.planet}>
                      <button
                        type="button"
                        aria-pressed={selected === item.planet}
                        onClick={() => handlersRef.current.pick(item.planet)}
                        className={`sol-option ${selected === item.planet ? 'sol-option-on' : ''}`}
                      >
                        <span className="flex items-center gap-2">
                          <PlanetDot planet={getPlanet(item.planet)} size={22} />
                          <span className="font-black text-white">{getPlanet(item.planet).name}</span>
                        </span>
                        <span className="mt-1 block text-xs text-slate-300">
                          {item.icon} {item.title}
                        </span>
                        <span className="mt-1 block text-sm">
                          {best !== undefined ? <Stars count={best} /> : <span className="text-xs text-slate-500">ยังไม่ได้ลงจอด</span>}
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </nav>

            <div className="sol-comms p-4 sm:p-5">
              <div className="flex items-center gap-3">
                <PlanetDot planet={planet} size={40} />
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-300">ดาวปลายทาง</p>
                  <h2 className="text-xl font-black text-white">
                    {stage.icon} {planet.name}: {stage.title}
                  </h2>
                </div>
              </div>
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
          <p className="sol-panel mt-4 p-4 text-sm text-slate-200">
            ยานกำลังเดินทางไป{planet.name} ระหว่างนี้ลองลากฉากเพื่อหมุนดูระบบสุริยะได้
          </p>
        ) : null}

        {mode === 'practice' && phase === 'landed' ? (
          <section className="sol-comms mt-4 p-5 sm:p-6">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-300">🛬 ลงจอดที่{planet.name}แล้ว</p>
            <h2 className="mt-1 text-2xl font-black text-white">
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
            <Game key={seed} seed={seed} reduceMotion={reduceMotion} onFinish={finish} />
          </section>
        ) : null}

        {mode === 'practice' && phase === 'result' && outcome ? (
          <section className="sol-panel mt-4 p-5 text-center sm:p-7">
            <div className="sol-stamp-big mx-auto">
              <PlanetDot planet={planet} size={60} />
              <p className="mt-2 text-lg font-black text-white">{planet.name}</p>
              <p className="text-2xl">
                <Stars count={outcome.stars} />
              </p>
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
