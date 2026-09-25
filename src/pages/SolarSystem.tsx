import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../components/Button'
import { ScreenLayout } from '../components/ScreenLayout'
import { TopBar } from '../components/TopBar'
import { useGame } from '../context/useGame'
import { useMusic } from '../hooks/useMusic'
import { playSfx } from '../services/audioService'
import {
  MOON_COUNT_YEAR,
  PLANETS,
  SUN,
  formatNumber,
  getPlanet,
  orbitYears,
} from '../solar/planets'
import type { Planet, PlanetId } from '../solar/planets'
import { TIERS, formatAnswer } from '../solar/questions'
import type { Tier } from '../solar/questions'
import { SolarScene } from '../solar/scene'
import { dateFromDays, daysSinceJ2000 } from '../solar/space'
import type { BodyId } from '../solar/space'
import {
  STOPS_BEFORE_HOME,
  advance,
  answerLeg,
  createTrip,
  currentLeg,
  departurePlanet,
  isFinished,
  legStars,
  navHintLevel,
  pickDestination,
  questionHintVisible,
  summarize,
} from '../solar/trip'
import type { Trip, TripLength } from '../solar/trip'
import {
  finishTrip,
  loadPassport,
  savePassport,
  stampCount,
  stampPlanet,
} from '../solar/storage'
import type { Passport } from '../solar/storage'
import type { SkillId } from '../types/stats'
import type { Player } from '../types/player'

/**
 * ยานสำรวจระบบสุริยะ
 *
 * ฉากสามมิติของระบบสุริยะที่หมุน ซูม และแตะเลือกดาวได้ พร้อมสองวิธีเล่น
 *
 *   ทริปสำรวจ   ศูนย์บัญชาการส่งใบ้พิกัดมา เด็กถอดใบ้แล้วเลือกดาวในฉาก ยานบินไปจริง
 *               พอถึงแล้วต้องแก้โจทย์จากข้อมูลจริงของดาวดวงนั้นเพื่อรับตราประทับ
 *   สำรวจอิสระ  ไม่มีโจทย์ แตะดาวดูข้อมูล เร่งเวลาดูการโคจร ครูใช้เปิดบนจอหน้าห้องได้
 *
 * ฉากทั้งหมดอยู่ใน solar/scene.ts หน้านี้แค่ส่งคำสั่งและแสดงแผงข้อมูล
 * ผืนผ้าใบถูกวางไว้ตลอดทุกช่วงของหน้านี้ ไม่ได้สร้างใหม่ตอนเปลี่ยนช่วง
 * เพราะการสร้างฉากใหม่ทำให้กล้องกระโดดกลับจุดเริ่ม และยานหายไปจากตำแหน่งที่จอดอยู่
 */

type Phase = 'briefing' | 'explore' | 'navigate' | 'flying' | 'question' | 'stamp' | 'summary'

const SPEEDS = [
  { icon: '⏸️', label: 'หยุด', note: 'หยุดเวลาไว้', days: 0 },
  { icon: '🐢', label: 'ช้า', note: '2 วันต่อวินาที', days: 2 },
  { icon: '🐇', label: 'เร็ว', note: '1 เดือนต่อวินาที', days: 30 },
  { icon: '🚀', label: 'เร็วมาก', note: '1 ปีต่อวินาที', days: 365 },
] as const

const THAI_MONTHS = [
  'ม.ค.',
  'ก.พ.',
  'มี.ค.',
  'เม.ย.',
  'พ.ค.',
  'มิ.ย.',
  'ก.ค.',
  'ส.ค.',
  'ก.ย.',
  'ต.ค.',
  'พ.ย.',
  'ธ.ค.',
]

/** วันที่แบบไทย ปีพุทธศักราช เขียนเองเพื่อให้ได้ผลเหมือนกันทุกเครื่อง */
function thaiDate(days: number): string {
  const date = dateFromDays(days)
  return `${date.getUTCDate()} ${THAI_MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear() + 543}`
}

function todayDays(): number {
  return daysSinceJ2000(new Date())
}

function Stars({ count, max = 3 }: { count: number; max?: number }) {
  return (
    <span aria-label={`ได้ ${count} ดาวจาก ${max} ดาว`} className="whitespace-nowrap">
      {Array.from({ length: max }, (_, index) => (
        <span key={index} aria-hidden="true" className={index < count ? 'text-gold-300' : 'text-slate-600'}>
          ★
        </span>
      ))}
    </span>
  )
}

/** จุดสีของดาว ใช้ในปุ่มเลือกดาวและตราประทับ */
function PlanetDot({ planet, size = 18 }: { planet: Planet; size?: number }) {
  return (
    <span
      aria-hidden="true"
      className="sol-dot"
      style={
        {
          width: size,
          height: size,
          '--dot': planet.color,
          '--dot-light': planet.highlight,
        } as CSSProperties
      }
    />
  )
}

/**
 * แถบเทียบขนาดจริง
 *
 * ฉากสามมิติขยายดาวดวงเล็กให้มองเห็นได้ จึงเทียบขนาดจากฉากไม่ได้
 * แถบนี้วาดทุกดวงตามสัดส่วนเส้นผ่านศูนย์กลางจริง ดาวพุธจึงเล็กเป็นจุด
 * ข้างดาวพฤหัสบดีที่ใหญ่เต็มแถบ ซึ่งคือความจริงที่ภาพในฉากบอกไม่ได้
 */
function SizeCompare({ highlight }: { highlight: PlanetId | null }) {
  const biggest = Math.max(...PLANETS.map((planet) => planet.diameterKm))
  const full = 64
  let x = 4
  const circles = PLANETS.map((planet) => {
    const radius = Math.max(1.2, (planet.diameterKm / biggest) * (full / 2))
    const cx = x + radius
    x += radius * 2 + 6
    return { planet, radius, cx }
  })
  return (
    <figure className="mt-3">
      <svg viewBox={`0 0 ${x} ${full + 4}`} className="h-auto w-full" role="img" aria-label="เทียบขนาดจริงของดาวเคราะห์ทั้งแปดดวง">
        {circles.map(({ planet, radius, cx }) => (
          <circle
            key={planet.id}
            cx={cx}
            cy={full / 2 + 2}
            r={radius}
            fill={planet.color}
            opacity={highlight === null || highlight === planet.id ? 1 : 0.35}
            stroke={highlight === planet.id ? '#67e8f9' : 'none'}
            strokeWidth={1.5}
          />
        ))}
      </svg>
      <figcaption className="mt-1 text-xs text-slate-400">
        ขนาดจริงเทียบกัน เรียงจากดาวพุธถึงดาวเนปจูน (ภาพในฉากขยายดาวดวงเล็กให้มองเห็นได้ จึงไม่ใช่สัดส่วนจริง)
      </figcaption>
    </figure>
  )
}

function orbitText(planet: Planet): string {
  if (planet.orbitDays < 1_000) return `${formatNumber(planet.orbitDays)} วัน`
  return `ประมาณ ${orbitYears(planet)} ปี (${formatNumber(planet.orbitDays)} วัน)`
}

function spinText(planet: Planet): string {
  const hours = Math.abs(planet.spinHours)
  const backwards = planet.spinHours < 0 ? ' หมุนกลับทิศกับโลก' : ''
  if (hours > 48) return `ประมาณ ${formatNumber(Math.round(hours / 24))} วัน${backwards}`
  return `ประมาณ ${formatNumber(Math.round(hours * 10) / 10)} ชั่วโมง${backwards}`
}

/** การ์ดข้อมูลของดาว ใช้ทั้งตอนสำรวจอิสระและตอนหาปลายทาง */
function BodyCard({ id }: { id: BodyId }) {
  if (id === 'sun') {
    return (
      <div className="sol-panel p-4 sm:p-5">
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-gold-300">ดาวฤกษ์ · {SUN.english}</p>
        <h3 className="mt-1 text-xl font-black text-white">☀️ {SUN.name}</h3>
        <ul className="mt-3 space-y-1.5 text-sm text-slate-200">
          {SUN.facts.map((fact) => (
            <li key={fact}>• {fact}</li>
          ))}
        </ul>
      </div>
    )
  }

  const planet = getPlanet(id)
  const rows: [string, string][] = [
    ['ลำดับจากดวงอาทิตย์', `ลำดับที่ ${planet.order}`],
    ['ระยะห่างจากดวงอาทิตย์', `${formatNumber(planet.distanceKm)} กม.`],
    ['เส้นผ่านศูนย์กลาง', `${formatNumber(planet.diameterKm)} กม.`],
    ['โคจรรอบดวงอาทิตย์ 1 รอบ', orbitText(planet)],
    ['หมุนรอบตัวเอง 1 รอบ', spinText(planet)],
    ['ดวงจันทร์', `${formatNumber(planet.moons)} ดวง`],
    ['อุณหภูมิเฉลี่ย', `${formatNumber(planet.meanTempC)} °C`],
  ]

  return (
    <div className="sol-panel p-4 sm:p-5">
      <div className="flex items-center gap-3">
        <PlanetDot planet={planet} size={34} />
        <div className="min-w-0">
          <h3 className="text-xl font-black text-white">{planet.name}</h3>
          <p className="text-xs text-slate-400">{planet.english}</p>
        </div>
      </div>
      <dl className="mt-3 grid grid-cols-1 gap-1.5 text-sm sm:grid-cols-2">
        {rows.map(([label, value]) => (
          <div key={label} className="sol-row">
            <dt className="text-slate-400">{label}</dt>
            <dd className="font-bold text-white">{value}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-2 text-xs text-slate-500">
        จำนวนดวงจันทร์นับถึงปี ค.ศ. {MOON_COUNT_YEAR} ตัวเลขนี้เพิ่มขึ้นเรื่อย ๆ เมื่อนักดาราศาสตร์ค้นพบดวงใหม่
      </p>
      <ul className="mt-3 space-y-1.5 text-sm text-slate-200">
        {planet.facts.map((fact) => (
          <li key={fact}>• {fact}</li>
        ))}
      </ul>
      <SizeCompare highlight={planet.id} />
    </div>
  )
}

export function SolarSystem({ player }: { player: Player }) {
  const navigate = useNavigate()
  const { settings, answerQuestion } = useGame()
  const reduceMotion = !settings.animationsEnabled

  const [phase, setPhase] = useState<Phase>('briefing')
  useMusic(phase === 'summary' ? 'victory' : phase === 'briefing' ? 'menu' : 'adventure')

  const [tier, setTier] = useState<Tier>(1)
  const [tripLength, setTripLength] = useState<TripLength>('short')
  const [trip, setTrip] = useState<Trip | null>(null)
  const [selected, setSelected] = useState<BodyId | null>(null)
  const [speedIndex, setSpeedIndex] = useState(2)
  const [clock, setClock] = useState(todayDays)
  const [showLabels, setShowLabels] = useState(true)
  const [showOrbits, setShowOrbits] = useState(true)
  const [notice, setNotice] = useState<{ tone: 'good' | 'bad' | 'info'; text: string } | null>(null)
  const [passport, setPassport] = useState<Passport>(() => loadPassport(player.name))
  const [exploreFlight, setExploreFlight] = useState<PlanetId | null>(null)
  /** ดาวที่ยานจอดอยู่ตอนสำรวจอิสระ ปุ่มบินไปดาวดวงเดิมจึงถูกปิดไว้ */
  const [shipAt, setShipAt] = useState<PlanetId>('earth')

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const sceneRef = useRef<SolarScene | null>(null)

  const leg = trip ? currentLeg(trip) : null
  const location: PlanetId = trip ? departurePlanet(trip) : 'earth'

  /** บันทึกผลเข้าสถิติชุดเดียวกับโหมดอื่น นับว่าถูกเมื่อถูกตั้งแต่ครั้งแรกเท่านั้น */
  const record = useCallback(
    (id: string, skill: SkillId, firstTry: boolean) => {
      answerQuestion({
        questionId: `solar-${id}`,
        stageId: 'solar',
        skill,
        isCorrect: firstTry,
        timeMs: 0,
        isReplay: true,
      })
    },
    [answerQuestion],
  )

  /*
   * ฉากเรียกกลับมาหาหน้าจอผ่าน ref นี้ ไม่ได้ผูกฟังก์ชันตรง ๆ ตอนสร้างฉาก
   * เพราะฉากถูกสร้างครั้งเดียว ถ้าผูกตรง ๆ ฉากจะเห็นแต่ค่าของรอบแรกตลอดไป
   * เช่นจะคิดว่ายังอยู่ช่วงหน้าแรกทั้งที่เริ่มทริปไปแล้ว
   */
  const handlersRef = useRef<{ pick: (id: BodyId | null) => void; arrive: (id: PlanetId) => void }>({
    pick: () => undefined,
    arrive: () => undefined,
  })

  handlersRef.current = {
    pick: (id) => {
      if (phase !== 'explore' && phase !== 'navigate' && phase !== 'briefing') return
      if (id === null) {
        // แตะที่ว่างตอนหาปลายทาง ไม่ล้างดาวที่เลือกไว้ เด็กมักแตะพลาดขอบดาวเล็ก ๆ
        if (phase === 'explore') setSelected(null)
        return
      }
      if (phase === 'navigate' && id === 'sun') {
        setNotice({ tone: 'info', text: 'ดวงอาทิตย์ร้อนเกินกว่าจะบินเข้าไปได้ ลองเลือกดาวเคราะห์ดวงอื่นนะ' })
        return
      }
      playSfx('click')
      setSelected(id)
      if (phase === 'briefing') setPhase('explore')
    },
    arrive: (id) => {
      setShipAt(id)
      if (phase === 'flying') {
        playSfx('pickup')
        setNotice(null)
        setPhase('question')
        return
      }
      if (phase === 'explore') {
        setExploreFlight(null)
        setNotice({ tone: 'good', text: `ยานมาถึง${getPlanet(id).name}แล้ว` })
      }
    },
  }

  /* ---------------- สร้างฉากครั้งเดียว ---------------- */

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const scene = new SolarScene(
      canvas,
      {
        onPick: (id) => handlersRef.current.pick(id),
        onArrive: (id) => handlersRef.current.arrive(id),
        onClock: (days) => setClock(days),
      },
      { days: todayDays(), reduceMotion: !settings.animationsEnabled, parkedAt: 'earth' },
    )
    scene.setAutoSpin(true)
    scene.start()
    sceneRef.current = scene
    return () => {
      scene.destroy()
      sceneRef.current = null
    }
    // ตั้งใจสร้างครั้งเดียวต่อการเปิดหน้า ค่าที่เปลี่ยนภายหลังส่งเข้าไปด้วย effect ข้างล่าง
  }, [])

  /* ---------------- ส่งค่าจากหน้าจอเข้าฉาก ---------------- */

  useEffect(() => {
    sceneRef.current?.setReduceMotion(reduceMotion)
  }, [reduceMotion])

  useEffect(() => {
    sceneRef.current?.setSpeed(SPEEDS[speedIndex]?.days ?? 0)
  }, [speedIndex])

  useEffect(() => {
    sceneRef.current?.setLabels(showLabels)
  }, [showLabels])

  useEffect(() => {
    sceneRef.current?.setOrbits(showOrbits)
  }, [showOrbits])

  useEffect(() => {
    sceneRef.current?.setSelected(phase === 'navigate' || phase === 'explore' ? selected : null)
  }, [phase, selected])

  const hintLevel = leg && phase === 'navigate' ? navHintLevel(leg) : 0
  useEffect(() => {
    const scene = sceneRef.current
    if (!scene) return
    scene.setHighlight(leg && hintLevel >= 2 ? leg.target : null)
    scene.setRuledOut(phase === 'navigate' && leg ? leg.wrongPicks : [])
    scene.setStamped(trip ? trip.legs.filter((item) => item.questionSolved).map((item) => item.target) : [])
    scene.setAim(phase === 'navigate' && selected !== null && selected !== 'sun' && selected !== location)
  }, [hintLevel, leg, location, phase, selected, trip])

  /* ---------------- คีย์บอร์ด ---------------- */

  const confirmRef = useRef<() => void>(() => undefined)

  useEffect(() => {
    const down = (event: KeyboardEvent): void => {
      const scene = sceneRef.current
      if (!scene) return
      const target = event.target as HTMLElement | null
      const onControl = target !== null && ['BUTTON', 'INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)

      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault()
        scene.rotate(event.key === 'ArrowLeft' ? 0.18 : -0.18, 0)
        return
      }
      if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
        event.preventDefault()
        scene.rotate(0, event.key === 'ArrowUp' ? 0.12 : -0.12)
        return
      }
      if (event.key === '+' || event.key === '=') {
        scene.zoom(0.8)
        return
      }
      if (event.key === '-' || event.key === '_') {
        scene.zoom(1.25)
        return
      }
      if (/^[0-8]$/.test(event.key)) {
        const order = Number(event.key)
        const id: BodyId | undefined = order === 0 ? 'sun' : PLANETS.find((planet) => planet.order === order)?.id
        if (id) handlersRef.current.pick(id)
        return
      }
      if (event.key === 'Enter' && !onControl) confirmRef.current()
    }
    window.addEventListener('keydown', down)
    return () => window.removeEventListener('keydown', down)
  }, [])

  /* ---------------- การกระทำของผู้เล่น ---------------- */

  const beginTrip = useCallback(() => {
    const next = createTrip(`${player.name}-${Date.now()}`, tier, tripLength)
    const scene = sceneRef.current
    scene?.setAutoSpin(false)
    scene?.parkAt('earth')
    scene?.overview()
    setShipAt('earth')
    setTrip(next)
    setSelected(null)
    setNotice(null)
    setExploreFlight(null)
    setSpeedIndex(1)
    setPhase('navigate')
  }, [player.name, tier, tripLength])

  const beginExplore = useCallback(() => {
    const scene = sceneRef.current
    scene?.setAutoSpin(false)
    scene?.overview()
    setTrip(null)
    setNotice(null)
    setSpeedIndex(2)
    setPhase('explore')
  }, [])

  const backToBriefing = useCallback(() => {
    const scene = sceneRef.current
    scene?.overview()
    scene?.setAutoSpin(true)
    setTrip(null)
    setSelected(null)
    setNotice(null)
    setExploreFlight(null)
    setPassport(loadPassport(player.name))
    setPhase('briefing')
  }, [player.name])

  const confirmDestination = useCallback(() => {
    if (phase !== 'navigate' || !trip || !leg) return
    if (selected === null || selected === 'sun') {
      setNotice({ tone: 'info', text: 'แตะดาวในฉาก หรือกดปุ่มชื่อดาวด้านล่างก่อน แล้วค่อยกดบิน' })
      return
    }
    const result = pickDestination(trip, selected)
    const name = getPlanet(selected).name
    if (result.alreadyHere) {
      setNotice({ tone: 'info', text: `ยานจอดอยู่ที่${name}อยู่แล้ว ลองอ่านใบ้อีกครั้งนะ` })
      return
    }
    setTrip(result.trip)

    if (result.correct) {
      record(`nav-${leg.clue.kind}-${leg.target}`, leg.clue.skill, leg.wrongPicks.length === 0)
      playSfx('correct')
      setNotice({ tone: 'good', text: `พิกัดถูกต้อง! กำลังบินไป${name}` })
      setPhase('flying')
      sceneRef.current?.flyTo(selected)
      return
    }

    playSfx('wrong')
    const updated = currentLeg(result.trip)
    const level = updated ? navHintLevel(updated) : 0
    setNotice({
      tone: 'bad',
      text:
        level >= 2
          ? `ยังไม่ใช่${name} ศูนย์บัญชาการส่งสัญญาณช่วยแล้ว ดูวงโคจรสีทองที่กะพริบอยู่ในฉาก`
          : `ยังไม่ใช่${name} ลองดูคำใบ้แล้วคิดอีกครั้งนะ`,
    })
  }, [leg, phase, record, selected, trip])

  confirmRef.current = confirmDestination

  const choose = useCallback(
    (value: number) => {
      if (phase !== 'question' || !trip || !leg || leg.questionSolved) return
      const result = answerLeg(trip, value)
      setTrip(result.trip)
      if (result.correct) {
        record(`q-${leg.question.kind}-${leg.target}`, leg.question.skill, leg.wrongChoices.length === 0)
        playSfx('correct')
      } else {
        playSfx('wrong')
      }
    },
    [leg, phase, record, trip],
  )

  const collectStamp = useCallback(() => {
    if (!trip || !leg || !leg.questionSolved) return
    const next = stampPlanet(passport, leg.target, legStars(leg))
    savePassport(next)
    setPassport(next)
    playSfx('chest')
    setPhase('stamp')
  }, [leg, passport, trip])

  const nextLeg = useCallback(() => {
    if (!trip) return
    const advanced = advance(trip)
    setTrip(advanced)
    setSelected(null)
    setNotice(null)
    sceneRef.current?.overview()
    if (isFinished(advanced)) {
      const next = finishTrip(passport, advanced.length, summarize(advanced))
      savePassport(next)
      setPassport(next)
      playSfx('victory')
      setPhase('summary')
      return
    }
    setPhase('navigate')
  }, [passport, trip])

  const flyInExplore = useCallback(() => {
    if (selected === null || selected === 'sun' || selected === shipAt || sceneRef.current?.isFlying()) return
    playSfx('click')
    setExploreFlight(selected)
    setNotice({ tone: 'info', text: `กำลังบินไป${getPlanet(selected).name}` })
    sceneRef.current?.flyTo(selected)
  }, [selected, shipAt])

  /* ---------------- ส่วนแสดงผล ---------------- */

  const summary = useMemo(() => (trip ? summarize(trip) : null), [trip])
  const speed = SPEEDS[speedIndex] ?? SPEEDS[0]
  const canPickPlanet = phase === 'navigate' || phase === 'explore'
  const legNumber = trip ? Math.min(trip.index + 1, trip.legs.length) : 0

  const noticeTone =
    notice?.tone === 'good'
      ? 'border-leaf-400/50 bg-leaf-500/15 text-leaf-200'
      : notice?.tone === 'bad'
        ? 'border-ember-400/50 bg-ember-500/15 text-ember-200'
        : 'border-sky-400/40 bg-sky-500/10 text-slate-100'

  return (
    <>
      <TopBar player={player} title="ยานสำรวจระบบสุริยะ" backTo="/menu" />
      <ScreenLayout width="wide">
        {/* ---------------- ฉากสามมิติ ---------------- */}
        <div className="sol-stage">
          <canvas
            ref={canvasRef}
            className="sol-canvas"
            role="img"
            aria-label="ฉากสามมิติของระบบสุริยะ ลากเพื่อหมุน หมุนล้อเมาส์หรือใช้สองนิ้วเพื่อซูม แตะดาวเพื่อเลือก"
          />

          {trip && phase !== 'briefing' && phase !== 'explore' ? (
            <div className="sol-hud pointer-events-none absolute left-3 top-3">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-cyan-300">
                ภารกิจ {legNumber}/{trip.legs.length}
              </p>
              <p className="text-sm font-black text-white">
                ⭐ {summary?.stars ?? 0} / {summary?.maxStars ?? 0}
              </p>
            </div>
          ) : null}

          <div className="sol-hud pointer-events-none absolute right-3 top-3 text-right">
            <p className="text-[11px] font-bold text-slate-400">วันที่ในแบบจำลอง</p>
            <p className="text-sm font-black text-white">{thaiDate(clock)}</p>
          </div>

          {phase === 'flying' || exploreFlight ? (
            <div className="sol-hud pointer-events-none absolute bottom-3 left-3">
              <p className="text-sm font-bold text-cyan-200">
                🚀 กำลังเดินทางไป{getPlanet(exploreFlight ?? leg?.target ?? 'earth').name}…
              </p>
            </div>
          ) : null}

          <div className="absolute bottom-3 right-3 flex flex-col gap-2">
            <button type="button" className="sol-ctrl" aria-label="ซูมเข้า" onClick={() => sceneRef.current?.zoom(0.7)}>
              ＋
            </button>
            <button type="button" className="sol-ctrl" aria-label="ซูมออก" onClick={() => sceneRef.current?.zoom(1.4)}>
              －
            </button>
            <button
              type="button"
              className="sol-ctrl"
              aria-label="ถอยออกมาดูทั้งระบบสุริยะ"
              onClick={() => sceneRef.current?.overview()}
            >
              🌌
            </button>
          </div>
        </div>

        {/* ---------------- แถบเวลาและการแสดงผล ---------------- */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-slate-400">เวลา:</span>
          {SPEEDS.map((option, index) => (
            <button
              key={option.label}
              type="button"
              aria-pressed={speedIndex === index}
              onClick={() => setSpeedIndex(index)}
              className={`sol-toggle ${speedIndex === index ? 'sol-toggle-on' : ''}`}
            >
              <span aria-hidden="true">{option.icon}</span> {option.label}
            </button>
          ))}
          <span className="text-xs text-slate-400">({speed.note})</span>
          <button type="button" className="sol-toggle" onClick={() => sceneRef.current?.setDays(todayDays())}>
            📅 กลับมาวันนี้
          </button>
          <span className="mx-1 hidden h-5 w-px bg-white/10 sm:inline-block" />
          <button
            type="button"
            aria-pressed={showLabels}
            onClick={() => setShowLabels((value) => !value)}
            className={`sol-toggle ${showLabels ? 'sol-toggle-on' : ''}`}
          >
            🏷️ ชื่อดาว
          </button>
          <button
            type="button"
            aria-pressed={showOrbits}
            onClick={() => setShowOrbits((value) => !value)}
            className={`sol-toggle ${showOrbits ? 'sol-toggle-on' : ''}`}
          >
            ⭕ วงโคจร
          </button>
        </div>

        {/* ---------------- ปุ่มเลือกดาว ---------------- */}
        {canPickPlanet ? (
          <nav aria-label="เลือกดาว" className="mt-3">
            <ul className="flex gap-2 overflow-x-auto pb-1">
              {phase === 'explore' ? (
                <li>
                  <button
                    type="button"
                    aria-pressed={selected === 'sun'}
                    onClick={() => handlersRef.current.pick('sun')}
                    className={`sol-chip ${selected === 'sun' ? 'sol-chip-on' : ''}`}
                  >
                    <span aria-hidden="true">☀️</span> {SUN.name}
                  </button>
                </li>
              ) : null}
              {PLANETS.map((planet) => {
                const missed = phase === 'navigate' && leg?.wrongPicks.includes(planet.id)
                const here = phase === 'navigate' && planet.id === location
                return (
                  <li key={planet.id}>
                    <button
                      type="button"
                      aria-pressed={selected === planet.id}
                      onClick={() => handlersRef.current.pick(planet.id)}
                      className={`sol-chip ${selected === planet.id ? 'sol-chip-on' : ''} ${missed ? 'sol-chip-miss' : ''}`}
                    >
                      <PlanetDot planet={planet} />
                      <span>{planet.name}</span>
                      {here ? <span aria-label="ยานจอดอยู่ที่นี่">📍</span> : null}
                      {missed ? <span aria-label="เลือกไปแล้ว ไม่ใช่ปลายทาง">✗</span> : null}
                    </button>
                  </li>
                )
              })}
            </ul>
          </nav>
        ) : null}

        {notice ? (
          <p role="status" className={`mt-3 rounded-2xl border px-4 py-3 text-sm font-semibold ${noticeTone}`}>
            {notice.text}
          </p>
        ) : null}

        {/* ---------------- หน้าแรก ---------------- */}
        {phase === 'briefing' ? (
          <section className="sol-panel mt-4 p-5 sm:p-7">
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-cyan-300">ศูนย์บัญชาการอวกาศ</p>
            <h2 className="title-hero mt-1 text-2xl font-black sm:text-3xl">ยานสำรวจระบบสุริยะ</h2>
            <div className="mt-3 space-y-2 text-sm leading-relaxed text-slate-200 sm:text-base">
              <p>
                ศูนย์บัญชาการจะส่ง <strong className="text-cyan-300">ใบ้พิกัด</strong> มาให้ทีละข้อ
                ถอดใบ้ให้ได้ว่าปลายทางคือดาวดวงไหน แล้วแตะดาวดวงนั้นในฉากเพื่อบินไป
              </p>
              <p>
                พอไปถึง ต้องแก้ <strong className="text-gold-300">โจทย์จากข้อมูลจริงของดาว</strong>{' '}
                ให้ถูกเพื่อรับตราประทับ เก็บให้ครบแล้วบินกลับบ้านที่โลก
              </p>
              <p className="text-slate-400">
                ลากฉากเพื่อหมุนดู ใช้สองนิ้วหรือล้อเมาส์เพื่อซูม ใช้ปุ่มลูกศรและเลข 1–8 บนคีย์บอร์ดได้ด้วย
              </p>
            </div>

            <h3 className="mt-5 text-sm font-bold text-slate-300">เลือกระดับ</h3>
            <div className="mt-2 grid gap-2 sm:grid-cols-3">
              {TIERS.map((option) => (
                <button
                  key={option.tier}
                  type="button"
                  aria-pressed={tier === option.tier}
                  onClick={() => {
                    playSfx('click')
                    setTier(option.tier)
                  }}
                  className={`sol-option ${tier === option.tier ? 'sol-option-on' : ''}`}
                >
                  <span className="text-2xl" aria-hidden="true">
                    {option.icon}
                  </span>
                  <span className="block text-base font-black text-white">{option.name}</span>
                  <span className="block text-xs text-slate-300">{option.note}</span>
                </button>
              ))}
            </div>

            <h3 className="mt-4 text-sm font-bold text-slate-300">ความยาวทริป</h3>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {(['short', 'full'] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  aria-pressed={tripLength === option}
                  onClick={() => {
                    playSfx('click')
                    setTripLength(option)
                  }}
                  className={`sol-option ${tripLength === option ? 'sol-option-on' : ''}`}
                >
                  <span className="block text-base font-black text-white">
                    {option === 'short' ? '🛰️ ทริปสั้น' : '🌌 ทริปเต็มระบบ'}
                  </span>
                  <span className="block text-xs text-slate-300">
                    แวะ {STOPS_BEFORE_HOME[option]} ดวง แล้วกลับโลก · {STOPS_BEFORE_HOME[option] + 1} ภารกิจ
                    {passport.bestTrip[option] !== undefined
                      ? ` · สถิติดีที่สุด ${passport.bestTrip[option]} ดาว`
                      : ''}
                  </span>
                </button>
              ))}
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <Button size="lg" onClick={beginTrip} icon="🚀">
                ออกเดินทาง
              </Button>
              <Button size="lg" variant="secondary" onClick={beginExplore} icon="🔭">
                สำรวจอิสระ (ไม่มีโจทย์)
              </Button>
            </div>

            <h3 className="mt-6 text-sm font-bold text-slate-300">
              สมุดตราประทับของ{player.name} · สะสมแล้ว {stampCount(passport)}/{PLANETS.length} ดวง
            </h3>
            <ul className="mt-2 grid grid-cols-4 gap-2 sm:grid-cols-8">
              {PLANETS.map((planet) => {
                const stamp = passport.stamps[planet.id]
                return (
                  <li key={planet.id} className={`sol-stamp ${stamp ? '' : 'sol-stamp-empty'}`}>
                    <PlanetDot planet={planet} size={26} />
                    <span className="mt-1 block text-[11px] font-bold text-slate-200">{planet.name}</span>
                    <Stars count={stamp?.best ?? 0} />
                  </li>
                )
              })}
            </ul>
          </section>
        ) : null}

        {/* ---------------- สำรวจอิสระ ---------------- */}
        {phase === 'explore' ? (
          <section className="mt-4 space-y-3">
            {selected ? (
              <>
                <BodyCard id={selected} />
                <div className="flex flex-wrap gap-2">
                  <Button onClick={() => sceneRef.current?.focusBody(selected)} icon="🔭">
                    ซูมเข้าไปดู
                  </Button>
                  {selected !== 'sun' ? (
                    <Button
                      variant="secondary"
                      onClick={flyInExplore}
                      icon="🚀"
                      disabled={exploreFlight !== null || selected === shipAt}
                    >
                      {selected === shipAt ? 'ยานจอดอยู่ที่นี่แล้ว' : 'ให้ยานบินไปที่นี่'}
                    </Button>
                  ) : null}
                  <Button variant="ghost" onClick={() => sceneRef.current?.overview()} icon="🌌">
                    ดูทั้งระบบ
                  </Button>
                </div>
              </>
            ) : (
              <p className="sol-panel p-4 text-sm text-slate-200">
                แตะดาวในฉาก หรือกดปุ่มชื่อดาวด้านบน เพื่อดูข้อมูลของดาวดวงนั้น ลองกด 🚀 เร็วมาก
                แล้วสังเกตว่าดาวดวงไหนโคจรครบรอบเร็วที่สุด
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <Button variant="ghost" onClick={backToBriefing} icon="←">
                กลับไปหน้าเริ่มภารกิจ
              </Button>
            </div>
          </section>
        ) : null}

        {/* ---------------- หาปลายทาง ---------------- */}
        {phase === 'navigate' && leg ? (
          <section className="mt-4 space-y-3">
            <div className="sol-comms p-4 sm:p-5">
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-cyan-300">
                📡 ศูนย์บัญชาการ · ภารกิจที่ {legNumber}
              </p>
              <p className="mt-2 text-lg font-black leading-snug text-white sm:text-xl">
                {leg.target === 'earth' && trip && trip.index === trip.legs.length - 1
                  ? 'ภารกิจสุดท้าย กลับบ้านกันเถอะ! '
                  : ''}
                ปลายทางคือ {leg.clue.text}
              </p>
              {hintLevel >= 1 ? (
                <p className="mt-2 rounded-xl border border-gold-400/40 bg-gold-500/10 p-3 text-sm text-gold-200">
                  💡 คำใบ้: {leg.clue.hint}
                </p>
              ) : null}
            </div>

            <div className="flex flex-wrap gap-3">
              <Button
                size="lg"
                onClick={confirmDestination}
                icon="🚀"
                silent
                disabled={selected === null || selected === 'sun'}
              >
                {selected && selected !== 'sun' ? `บินไป${getPlanet(selected).name}` : 'เลือกดาวปลายทางก่อน'}
              </Button>
              <Button variant="ghost" onClick={backToBriefing}>
                ยกเลิกทริป
              </Button>
            </div>

            {/* การ์ดข้อมูลคือที่ที่เด็กหาคำตอบของใบ้ เช่นจำนวนดวงจันทร์หรือขนาดจริง */}
            {selected ? <BodyCard id={selected} /> : null}
          </section>
        ) : null}

        {/* ---------------- โจทย์ประจำดาว ---------------- */}
        {phase === 'question' && leg ? (
          <section className="sol-comms mt-4 p-4 sm:p-6">
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-cyan-300">
              🛰️ ถึง{getPlanet(leg.target).name}แล้ว · โจทย์รับตราประทับ
            </p>
            <p className="mt-2 text-base font-bold leading-relaxed text-white sm:text-lg">{leg.question.text}</p>

            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {leg.question.choices.map((choice) => {
                const wrong = leg.wrongChoices.includes(choice)
                const right = leg.questionSolved && choice === leg.question.answer
                return (
                  <button
                    key={choice}
                    type="button"
                    disabled={wrong || leg.questionSolved}
                    onClick={() => choose(choice)}
                    className={`sol-opt ${wrong ? 'sol-opt-wrong' : ''} ${right ? 'sol-opt-right' : ''}`}
                  >
                    <span>{formatAnswer(leg.question, choice)}</span>
                    {wrong ? <span aria-label="ไม่ถูก">✗</span> : null}
                    {right ? <span aria-label="ถูกต้อง">✓</span> : null}
                  </button>
                )
              })}
            </div>

            {!leg.questionSolved && leg.wrongChoices.length > 0 ? (
              <p className="mt-3 text-sm font-semibold text-ember-200">
                ยังไม่ถูก ไม่เป็นไรนะ ลองคิดใหม่อีกครั้ง
              </p>
            ) : null}
            {!leg.questionSolved && questionHintVisible(leg) ? (
              <p className="mt-2 rounded-xl border border-gold-400/40 bg-gold-500/10 p-3 text-sm text-gold-200">
                💡 เริ่มจากตรงนี้: {leg.question.steps[0]}
              </p>
            ) : null}

            {leg.questionSolved ? (
              <div className="mt-4 rounded-xl border border-leaf-400/40 bg-leaf-500/10 p-4">
                <p className="font-black text-leaf-200">✓ ถูกต้อง! วิธีคิด</p>
                <ol className="mt-1 list-decimal space-y-1 pl-5 text-sm text-slate-100">
                  {leg.question.steps.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ol>
                <div className="mt-3">
                  <Button onClick={collectStamp} icon="🏅" size="lg" silent>
                    รับตราประทับ
                  </Button>
                </div>
              </div>
            ) : null}
          </section>
        ) : null}

        {/* ---------------- ตราประทับ ---------------- */}
        {phase === 'stamp' && leg && trip ? (
          <section className="sol-panel mt-4 p-5 text-center sm:p-7">
            <div className="sol-stamp-big mx-auto">
              <PlanetDot planet={getPlanet(leg.target)} size={64} />
              <p className="mt-2 text-lg font-black text-white">{getPlanet(leg.target).name}</p>
              <p className="text-2xl">
                <Stars count={legStars(leg)} />
              </p>
            </div>
            <p className="mt-4 text-sm text-slate-300">รู้หรือไม่</p>
            <p className="mx-auto mt-1 max-w-xl text-base font-semibold text-slate-100">
              {getPlanet(leg.target).facts[trip.index % getPlanet(leg.target).facts.length]}
            </p>
            <p className="mt-3 text-xs text-slate-400">
              {legStars(leg) === 3
                ? 'หาปลายทางถูกและตอบถูกตั้งแต่ครั้งแรก ได้ 3 ดาวเต็ม!'
                : 'ได้ดาวน้อยลงเมื่อต้องลองหลายครั้ง แต่ตราประทับเป็นของหนูแล้ว'}
            </p>
            <div className="mt-5 flex justify-center">
              <Button size="lg" onClick={nextLeg} icon="➡️" silent={trip.index + 1 >= trip.legs.length}>
                {trip.index + 1 >= trip.legs.length ? 'ดูสรุปภารกิจ' : 'ภารกิจต่อไป'}
              </Button>
            </div>
          </section>
        ) : null}

        {/* ---------------- สรุป ---------------- */}
        {phase === 'summary' && trip && summary ? (
          <section className="sol-panel mt-4 p-5 sm:p-7">
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-leaf-300">กลับถึงโลกแล้ว</p>
            <h2 className="title-gold mt-1 text-2xl font-black sm:text-3xl">ภารกิจสำเร็จ!</h2>
            <p className="mt-2 text-slate-200">
              ได้ดาวทั้งหมด <strong className="text-gold-300">{summary.stars}</strong> จาก {summary.maxStars} ดวง ·
              ทำได้เต็ม 3 ดาว {summary.perfectLegs} ภารกิจ
            </p>
            <ul className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {summary.legs.map((item) => (
                <li key={item.target} className="sol-stamp">
                  <PlanetDot planet={getPlanet(item.target)} size={30} />
                  <span className="mt-1 block text-xs font-bold text-slate-200">{getPlanet(item.target).name}</span>
                  <Stars count={item.stars} />
                </li>
              ))}
            </ul>
            <p className="mt-4 text-sm text-slate-300">
              สมุดตราประทับสะสมแล้ว {stampCount(passport)}/{PLANETS.length} ดวง
              {stampCount(passport) < PLANETS.length ? ' ลองทริปใหม่เพื่อเก็บดวงที่ยังขาด' : ' ครบทุกดวงแล้ว เก่งมาก!'}
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Button size="lg" onClick={beginTrip} icon="🔁">
                ออกเดินทางอีกรอบ
              </Button>
              <Button variant="secondary" onClick={backToBriefing} icon="⚙️">
                เปลี่ยนระดับ
              </Button>
              <Button variant="ghost" onClick={() => navigate('/menu')}>
                กลับเมนูหลัก
              </Button>
            </div>
          </section>
        ) : null}
      </ScreenLayout>
    </>
  )
}
