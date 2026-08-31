import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Button } from '../components/Button'
import { ScreenLayout } from '../components/ScreenLayout'
import { TopBar } from '../components/TopBar'
import { useGame } from '../context/useGame'
import { useMusic } from '../hooks/useMusic'
import { playSfx } from '../services/audioService'
import {
  allCollected,
  createWorld,
  isOverheated,
  leaveChallenge,
  resolveChallenge,
  respawn,
  stepWorld,
} from '../safezone/engine'
import {
  buildMissions,
  builderAnswer,
  formatNumber,
  generateDronePuzzle,
} from '../safezone/missions'
import { drawScene } from '../safezone/render3d'
import {
  MAX_HEAT,
  STAGE_HEIGHT,
  STAGE_WIDTH,
  SURVIVAL_ITEMS,
  findItem,
} from '../safezone/types'
import type { DronePuzzle, Mission } from '../safezone/missions'
import type {
  MazeWorld,
  MoveInput,
  SafeZonePhase,
  SurvivalItemId,
} from '../safezone/types'
import type { SkillId } from '../types/stats'
import type { Player } from '../types/player'

/**
 * Safe Zone Guardians — วิกฤตโลกร้อน
 *
 * โครงของเกมมาจากเอกสารออกแบบของครู แบ่งเป็นสามช่วงที่ต่อกันเป็นเรื่องเดียว
 *
 *   ช่วงที่ 1  ออกไปหาไอเทมยังชีพสามชิ้นในซากเมืองสามมิติ
 *              โดรนขวางทางไว้ ต้องตอบบวกลบเลขสองหลักก่อนถึงจะได้ของ
 *   ช่วงที่ 2  ห้องกักตัวหน้าประตูโดม ไม่มีอะไรให้กด ตั้งใจให้หยุดคุยกันในห้องเรียน
 *   ช่วงที่ 3  ห้องควบคุมของโดม แก้โจทย์ตามตัวชี้วัด ป.4 สี่ข้อ
 *
 * ทำไมต้องมีช่วงที่ 2 ทั้งที่ไม่มีการเล่นเลย
 *
 * เพราะเป้าหมายของเกมนี้มีสองอย่าง ไม่ใช่อย่างเดียว
 * อย่างแรกคือคณิตศาสตร์ ซึ่งอยู่ในช่วงที่ 1 กับ 3
 * อย่างที่สองคือความรู้สึกต่อคนที่ไม่ได้เข้าโดม ซึ่งเกมทำเองไม่ได้
 * สิ่งที่เกมทำได้คือหยุดทุกอย่างไว้ตรงหน้าประตู แล้วส่งคำถามให้ครูถามต่อ
 */

/** ปุ่มบนคีย์บอร์ดที่นับเป็นทิศเดียวกัน รองรับทั้งลูกศรและ WASD */
const KEY_DIRECTIONS: Record<string, MoveInput> = {
  ArrowUp: { x: 0, z: 1 },
  ArrowDown: { x: 0, z: -1 },
  ArrowLeft: { x: -1, z: 0 },
  ArrowRight: { x: 1, z: 0 },
  w: { x: 0, z: 1 },
  s: { x: 0, z: -1 },
  a: { x: -1, z: 0 },
  d: { x: 1, z: 0 },
  W: { x: 0, z: 1 },
  S: { x: 0, z: -1 },
  A: { x: -1, z: 0 },
  D: { x: 1, z: 0 },
}

/** คำถามชวนคิดของช่วงที่ 2 เขียนไว้ให้ครูอ่านออกเสียงได้เลย */
const REFLECTION_PROMPTS = [
  {
    icon: '🚪',
    question: 'ถ้าหนูได้เข้าไปในโดม หนูจะรู้สึกอย่างไรกับคนที่ยังอยู่ข้างนอก',
    note: 'ไม่มีคำตอบถูกผิด ให้เด็กพูดความรู้สึกจริง ๆ ออกมาก่อน',
  },
  {
    icon: '🤝',
    question: 'เราจะช่วยคนที่อยู่ข้างนอกซึ่งมีเวลาเหลือไม่มากได้อย่างไรบ้าง',
    note: 'ชวนคิดทั้งวิธีที่ทำได้ทันที และวิธีที่ต้องอาศัยคนหลายคนช่วยกัน',
  },
  {
    icon: '💡',
    question: 'วันนี้เราทำอะไรได้บ้าง เพื่อไม่ให้อนาคตกลายเป็นแบบในเกม',
    note: 'ดึงกลับมาที่ของใกล้ตัว เช่น ปิดไฟ ปิดน้ำ แยกขยะ ปลูกต้นไม้',
  },
]

/** คำสัญญาที่เด็กเลือกเองตอนจบเกม เชื่อมเรื่องในเกมกลับมาที่ชีวิตจริง */
const PLEDGES = [
  'ปิดไฟทุกครั้งที่ออกจากห้อง',
  'ปิดน้ำระหว่างถูสบู่และแปรงฟัน',
  'ใช้กระดาษให้ครบทั้งสองหน้า',
  'พกขวดน้ำของตัวเองไปโรงเรียน',
  'ชวนเพื่อนช่วยกันแยกขยะ',
  'ปลูกต้นไม้หรือดูแลต้นไม้ที่บ้าน',
]

/** ภารกิจแต่ละข้อบันทึกลงสถิติทักษะไหน */
const MISSION_SKILL: Record<Mission['id'], SkillId> = {
  energy: 'addition',
  air: 'subtraction',
  water: 'wordProblems',
  supply: 'wordProblems',
}

/** อ่านตัวเลขที่เด็กพิมพ์ คืน null เมื่อยังพิมพ์ไม่เสร็จหรือพิมพ์ไม่เป็นตัวเลข */
function readNumber(text: string): number | null {
  const digits = text.replace(/[^0-9]/g, '')
  if (digits.length === 0) return null
  return Number.parseInt(digits, 10)
}

export function SafeZone({ player }: { player: Player }) {
  const navigate = useNavigate()
  const { settings, answerQuestion } = useGame()

  const [phase, setPhase] = useState<SafeZonePhase>('briefing')
  const phaseRef = useRef<SafeZonePhase>('briefing')
  phaseRef.current = phase

  useMusic(
    phase === 'maze' || phase === 'drone'
      ? 'arena'
      : phase === 'control'
        ? 'adventure'
        : phase === 'ending'
          ? 'victory'
          : 'menu',
  )

  const seedRef = useRef(`${Date.now()}`)

  /*
   * โลกของด่านถูกสร้างครั้งเดียวตอนเข้าหน้า แล้วถูกแก้ค่าในตัวมันเองตลอดทั้งด่าน
   *
   * ใช้ useState แบบส่งฟังก์ชันเข้าไป ไม่ใช่ useRef(createWorld(...))
   * เพราะสิ่งที่ส่งเข้า useRef ถูกคำนวณใหม่ทุกครั้งที่หน้าถูกวาดใหม่ ถึงจะไม่ถูกใช้ก็ตาม
   * แปลว่าจะสุ่มเขาวงกตใหม่ทิ้งทุกครั้งที่หลอดความร้อนขยับหนึ่งขีด
   * ส่วน useState แบบส่งฟังก์ชัน React จะเรียกให้ครั้งเดียวจริง ๆ
   */
  const [world] = useState<MazeWorld>(() => createWorld(seedRef.current))
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const inputRef = useRef<MoveInput>({ x: 0, z: 0 })
  const keysRef = useRef<Set<string>>(new Set())
  const padRef = useRef<MoveInput>({ x: 0, z: 0 })
  const droneAttemptsRef = useRef(0)

  /*
   * ข้อมูลที่หน้าจอต้องรู้ แยกจากตัวโลกที่อยู่ใน ref
   *
   * โลกถูกแก้หกสิบครั้งต่อวินาที ถ้าเก็บเป็น state ทั้งก้อน React จะวาดใหม่
   * หกสิบครั้งต่อวินาทีทั้งหน้า ซึ่งช้ากว่าการวาดฉากสามมิติเสียอีก
   * จึงส่งข้ามมาเฉพาะค่าที่เปลี่ยนแล้วต้องเห็นบนจอจริง ๆ และส่งเมื่อเปลี่ยนเท่านั้น
   */
  const [hud, setHud] = useState<{
    heat: number
    cooling: boolean
    collected: SurvivalItemId[]
  }>({ heat: 0, cooling: false, collected: [] })
  const hudRef = useRef(hud)

  const [puzzle, setPuzzle] = useState<DronePuzzle | null>(null)
  const [puzzlePick, setPuzzlePick] = useState<number | null>(null)

  const missions = useMemo(() => buildMissions(seedRef.current), [])
  const [missionIndex, setMissionIndex] = useState(0)
  const [promptIndex, setPromptIndex] = useState(0)
  const [pledges, setPledges] = useState<string[]>([])

  const startedAtRef = useRef(0)
  const [clearedSeconds, setClearedSeconds] = useState(0)

  /** บันทึกผลการตอบหนึ่งข้อเข้าสถิติชุดเดียวกับโหมดอื่นของเกม */
  const record = useCallback(
    (id: string, skill: SkillId, isCorrect: boolean) => {
      answerQuestion({
        questionId: `safezone-${id}`,
        stageId: 'safezone',
        skill,
        isCorrect,
        timeMs: 0,
        isReplay: true,
      })
    },
    [answerQuestion],
  )

  /* ---------------- ช่วงที่ 1 — วงวนของฉากสามมิติ ---------------- */

  useEffect(() => {
    if (phase !== 'maze' && phase !== 'drone') return

    let frame = 0
    let last = performance.now()

    const loop = (now: number): void => {
      stepWorld(world, inputRef.current, (now - last) / 1000)
      last = now

      drawScene(canvasRef.current, world, {
        time: now,
        reduceMotion: !settings.animationsEnabled,
      })

      const heat = Math.round(world.heat)
      const collected = world.items
        .filter((item) => item.collected)
        .map((item) => item.id)
      if (
        heat !== hudRef.current.heat ||
        world.cooling !== hudRef.current.cooling ||
        collected.length !== hudRef.current.collected.length
      ) {
        hudRef.current = { heat, cooling: world.cooling, collected }
        setHud(hudRef.current)
      }

      if (isOverheated(world)) {
        playSfx('gameOver')
        setPhase('overheated')
        return
      }

      if (world.challengeItem !== null && phaseRef.current === 'maze') {
        /*
         * เปลี่ยนค่าใน ref ทันที ไม่รอให้ React วาดหน้าใหม่
         *
         * setPhase ไม่ได้เปลี่ยนค่าให้เดี๋ยวนั้น ถ้าเบราว์เซอร์แทรกอีกหนึ่งเฟรม
         * เข้ามาก่อนที่หน้าจะถูกวาดใหม่ เงื่อนไขนี้จะเป็นจริงอีกครั้ง
         * แล้วโจทย์ที่เพิ่งสร้างจะถูกโยนทิ้งแล้วสร้างใหม่ทับทันที
         * ซึ่งเห็นเป็นโจทย์กะพริบเปลี่ยนเลขตอนหน้าจอโดรนเพิ่งเด้งขึ้นมา
         */
        phaseRef.current = 'drone'
        playSfx('bossRoar')
        droneAttemptsRef.current += 1
        setPuzzle(
          generateDronePuzzle(
            seedRef.current,
            world.challengeItem,
            droneAttemptsRef.current,
          ),
        )
        setPuzzlePick(null)
        setPhase('drone')
      }

      frame = requestAnimationFrame(loop)
    }

    frame = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(frame)
  }, [phase, settings.animationsEnabled, world])

  /* ---------------- การบังคับด้วยคีย์บอร์ด ---------------- */

  /*
   * รวมคีย์บอร์ดกับปุ่มบนจอไว้ที่เดียว
   *
   * สองทางนี้ต้องบวกกันได้ ไม่ใช่ทางใครทางมัน เพราะบนเครื่องที่มีทั้งจอสัมผัส
   * และคีย์บอร์ด เด็กใช้สลับกันไปมาโดยไม่รู้ตัว ถ้าแยกกันคิด การปล่อยนิ้ว
   * จากปุ่มบนจอจะไปล้างปุ่มลูกศรที่ยังกดค้างอยู่ แล้วตัวละครจะหยุดกลางทาง
   */
  const refreshInput = useCallback(() => {
    let x = padRef.current.x
    let z = padRef.current.z
    for (const key of keysRef.current) {
      const direction = KEY_DIRECTIONS[key]
      if (!direction) continue
      x += direction.x
      z += direction.z
    }
    inputRef.current = {
      x: Math.max(-1, Math.min(1, x)),
      z: Math.max(-1, Math.min(1, z)),
    }
  }, [])

  const pressPad = useCallback(
    (direction: MoveInput | null) => {
      padRef.current = direction ?? { x: 0, z: 0 }
      refreshInput()
    },
    [refreshInput],
  )

  useEffect(() => {
    if (phase !== 'maze') {
      keysRef.current.clear()
      padRef.current = { x: 0, z: 0 }
      inputRef.current = { x: 0, z: 0 }
      return
    }

    const refresh = refreshInput

    const down = (event: KeyboardEvent): void => {
      if (KEY_DIRECTIONS[event.key] === undefined) return
      // กันหน้าเว็บเลื่อนตามปุ่มลูกศร ซึ่งทำให้ฉากหลุดออกนอกจอระหว่างเดิน
      event.preventDefault()
      keysRef.current.add(event.key)
      refresh()
    }
    const up = (event: KeyboardEvent): void => {
      keysRef.current.delete(event.key)
      refresh()
    }
    /*
     * สลับแท็บหรือคลิกออกไปนอกหน้าต่างระหว่างกดปุ่มค้าง
     * เบราว์เซอร์จะไม่ส่ง keyup กลับมาเลย ตัวละครจึงเดินต่อไปเองไม่หยุด
     */
    const clear = (): void => {
      keysRef.current.clear()
      refresh()
    }

    window.addEventListener('keydown', down, { passive: false })
    window.addEventListener('keyup', up)
    window.addEventListener('blur', clear)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      window.removeEventListener('blur', clear)
      clear()
    }
  }, [phase, refreshInput])

  /* ---------------- การเปลี่ยนช่วง ---------------- */

  const beginMission = useCallback(() => {
    startedAtRef.current = Date.now()
    setPhase('maze')
  }, [])

  const answerDrone = useCallback(
    (choice: number) => {
      if (!puzzle || puzzlePick !== null) return
      setPuzzlePick(choice)

      const isCorrect = choice === puzzle.answer
      record(`drone-${puzzle.itemId}-${droneAttemptsRef.current}`, 'addition', isCorrect)
      playSfx(isCorrect ? 'correct' : 'wrong')

      resolveChallenge(world, isCorrect)

      if (!isCorrect) return

      playSfx('pickup')
      window.setTimeout(() => {
        setPuzzle(null)
        if (allCollected(world)) {
          setClearedSeconds(Math.round((Date.now() - startedAtRef.current) / 1000))
          playSfx('victory')
          setPhase('reflection')
        } else {
          setPhase('maze')
        }
      }, 900)
    },
    [puzzle, puzzlePick, record, world],
  )

  /** ตอบผิดแล้วขอถอยไปพักก่อน โดรนยังเฝ้าของชิ้นนั้นอยู่ กลับมาใหม่ได้เสมอ */
  const retreat = useCallback(() => {
    leaveChallenge(world)
    setPuzzle(null)
    setPuzzlePick(null)
    setPhase('maze')
  }, [world])

  const tryAgainAfterMeltdown = useCallback(() => {
    respawn(world)
    setPuzzle(null)
    setPuzzlePick(null)
    hudRef.current = { heat: 0, cooling: false, collected: hudRef.current.collected }
    setHud(hudRef.current)
    setPhase('maze')
  }, [world])

  const finishMission = useCallback(
    (mission: Mission, isCorrect: boolean) => {
      record(`mission-${mission.id}`, MISSION_SKILL[mission.id], isCorrect)
    },
    [record],
  )

  /*
   * ตั้งใจไม่ใช้รูปแบบฟังก์ชันของ setState ที่นี่
   *
   * เพราะต้องเล่นเสียงและเปลี่ยนช่วงเกมตอนภารกิจสุดท้ายจบ
   * ซึ่งเป็นผลข้างเคียง และ React ใน StrictMode เรียกฟังก์ชันอัปเดตสองครั้ง
   * เพื่อจับผลข้างเคียงแบบนี้โดยเฉพาะ ผลคือได้ยินเสียงชัยชนะซ้อนกันสองรอบ
   */
  const nextMission = useCallback(() => {
    const next = missionIndex + 1
    if (next >= missions.length) {
      playSfx('victory')
      setPhase('ending')
      return
    }
    setMissionIndex(next)
  }, [missionIndex, missions.length])

  const togglePledge = useCallback((text: string) => {
    playSfx('click')
    setPledges((current) =>
      current.includes(text)
        ? current.filter((item) => item !== text)
        : [...current, text],
    )
  }, [])

  /* ---------------- หน้าจอแต่ละช่วง ---------------- */

  if (phase === 'briefing') {
    return (
      <>
        <TopBar player={player} title="Safe Zone Guardians" backTo="/menu" />
        <ScreenLayout width="normal">
          <div className="sz-terminal sz-scanline p-6 sm:p-8">
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-cyan-300">
              บันทึกภารกิจ · ปี 2098
            </p>
            <h2 className="sz-hologram mt-2 text-2xl font-black sm:text-3xl">
              วิกฤตโลกร้อน
            </h2>
            <div className="mt-4 space-y-3 text-sm leading-relaxed text-slate-200 sm:text-base">
              <p>
                โลกข้างนอกร้อนจนอยู่ไม่ได้แล้ว ทะเลทรายกินเมืองไปหมด
                พายุฝุ่นพัดทั้งวันทั้งคืน มนุษย์ที่เหลือหนีเข้าไปอยู่ใน{' '}
                <strong className="text-leaf-400">โดม Safe Zone</strong> ที่ยังมีต้นไม้และน้ำสะอาด
              </p>
              <p>
                แต่โดมรับคนได้จำกัด และทรัพยากรก็มีจำกัด
                คนที่จะเข้าไปได้ต้องผ่านการทดสอบสองส่วน คือ{' '}
                <strong className="text-cyan-300">หาของยังชีพให้ครบ</strong> และ{' '}
                <strong className="text-cyan-300">คำนวณทรัพยากรของโดมให้ถูกต้อง</strong>
              </p>
              <p className="text-gold-300">
                หนูคือผู้พิทักษ์คนต่อไป · เวลาที่มีคือหลอดความร้อนบนชุดของหนู
              </p>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {SURVIVAL_ITEMS.map((item) => (
                <div
                  key={item.id}
                  className="rounded-xl border border-white/10 bg-white/5 p-3 text-center"
                >
                  <div aria-hidden="true" className="text-2xl">
                    {item.emoji}
                  </div>
                  <p className="mt-1 text-sm font-bold text-white">{item.name}</p>
                </div>
              ))}
            </div>

            <Button
              size="lg"
              fullWidth
              className="mt-6"
              icon="🚀"
              onClick={beginMission}
            >
              ออกไปข้างนอก
            </Button>
          </div>

          {/*
            กล่องสำหรับครู วางไว้ในหน้าเกมเลย ไม่ได้แยกไปเป็นคู่มือต่างหาก
            เพราะคู่มือที่อยู่คนละที่กับเกม คือคู่มือที่ไม่มีใครเปิดตอนสอนจริง
          */}
          <div className="panel mt-5 p-5">
            <h3 className="text-sm font-black text-gold-300">สำหรับคุณครู</h3>
            <ul className="mt-2 space-y-1.5 text-sm text-slate-300">
              <li>· ช่วงที่ 1 ทบทวนการบวกลบเลขสองหลักระหว่างเดินสำรวจ</li>
              <li>· ช่วงที่ 2 เกมจะหยุดให้ห้องเรียนอภิปรายเรื่องความเป็นธรรมและทรัพยากร</li>
              <li>
                · ช่วงที่ 3 ตัวชี้วัด ป.4/7 ประมาณค่า · ป.4/8 หาค่าตัวไม่ทราบค่า ·
                ป.4/11 โจทย์ปัญหาสองขั้นตอน · ป.4/12 สร้างโจทย์เอง
              </li>
              <li>· ใช้ปุ่มลูกศรหรือ WASD บนคีย์บอร์ด หรือปุ่มบนจอสำหรับแท็บเล็ต</li>
            </ul>
          </div>
        </ScreenLayout>
      </>
    )
  }

  if (phase === 'maze' || phase === 'drone' || phase === 'overheated') {
    const heatPercent = Math.round((hud.heat / MAX_HEAT) * 100)

    return (
      <>
        <TopBar player={player} title="ซากเมือง · ภารกิจหาของยังชีพ" backTo="/menu" />
        <ScreenLayout width="wide">
          <div className="sz-stage">
            <canvas
              ref={canvasRef}
              width={STAGE_WIDTH}
              height={STAGE_HEIGHT}
              className="block w-full"
              aria-label="ฉากซากเมืองสามมิติ"
            />

            {/* หลอดความร้อนและช่องเก็บของ วางทับฉาก ไม่กินพื้นที่ของภาพ */}
            <div className="pointer-events-none absolute left-3 top-3 w-44 sm:w-56">
              <div className="rounded-xl border border-white/15 bg-night-900/70 p-2.5 backdrop-blur">
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <span className="text-orange-300">🌡️ ความร้อน</span>
                  <span className="text-white">{heatPercent}%</span>
                </div>
                <div className="bar-track mt-1.5 h-2.5">
                  <div
                    className={`bar-fill sz-heat h-full ${heatPercent >= 75 ? 'sz-heat-critical' : ''}`}
                    style={{ width: `${heatPercent}%` }}
                  />
                </div>
                <p className="mt-1 text-[11px] text-cyan-300">
                  {hud.cooling ? '❄️ กำลังลดความร้อน' : 'หาแผ่นสีฟ้าเพื่อพักลดความร้อน'}
                </p>
              </div>

              <div className="mt-2 grid grid-cols-3 gap-2">
                {SURVIVAL_ITEMS.map((item) => {
                  const owned = hud.collected.includes(item.id)
                  return (
                    <div
                      key={item.id}
                      className={`sz-slot h-12 ${owned ? 'sz-slot-filled' : ''}`}
                      title={item.name}
                    >
                      <span aria-hidden="true" className="text-xl">
                        {owned ? item.emoji : '·'}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* ปุ่มทิศทางสำหรับแท็บเล็ต วางมุมล่างขวาให้นิ้วโป้งขวาถึง */}
            {phase === 'maze' ? (
              <div className="absolute bottom-3 right-3 grid grid-cols-3 gap-1.5">
                <span />
                <PadButton label="▲" direction={{ x: 0, z: 1 }} onPress={pressPad} />
                <span />
                <PadButton label="◀" direction={{ x: -1, z: 0 }} onPress={pressPad} />
                <span />
                <PadButton label="▶" direction={{ x: 1, z: 0 }} onPress={pressPad} />
                <span />
                <PadButton label="▼" direction={{ x: 0, z: -1 }} onPress={pressPad} />
                <span />
              </div>
            ) : null}

            <AnimatePresence>
              {phase === 'drone' && puzzle ? (
                <motion.div
                  key="drone"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 flex items-center justify-center bg-night-900/75 p-3 backdrop-blur-sm"
                >
                  <DroneTerminal
                    puzzle={puzzle}
                    picked={puzzlePick}
                    onAnswer={answerDrone}
                    onRetreat={retreat}
                  />
                </motion.div>
              ) : null}

              {phase === 'overheated' ? (
                <motion.div
                  key="overheated"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="absolute inset-0 flex items-center justify-center bg-ember-700/40 p-4 backdrop-blur"
                >
                  <div className="sz-terminal max-w-md p-6 text-center">
                    <p className="text-4xl" aria-hidden="true">
                      🥵
                    </p>
                    <h3 className="mt-2 text-xl font-black text-white">
                      ชุดกันความร้อนถึงขีดสุด
                    </h3>
                    <p className="mt-2 text-sm text-slate-300">
                      หน่วยกู้ภัยพาหนูกลับมาที่จุดเริ่มต้นแล้ว
                      ของที่เก็บได้ยังอยู่ครบ คราวนี้ลองแวะแผ่นทำความเย็นสีฟ้าระหว่างทางดูนะ
                    </p>
                    <Button className="mt-5" size="lg" icon="🔁" onClick={tryAgainAfterMeltdown}>
                      ออกไปใหม่อีกครั้ง
                    </Button>
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>

          <p className="mt-3 text-center text-sm text-slate-400">
            เก็บของยังชีพแล้ว {hud.collected.length} จาก {SURVIVAL_ITEMS.length} ชิ้น ·
            เดินด้วยปุ่มลูกศรหรือ WASD · แผนที่ย่ออยู่มุมขวาบนของฉาก
          </p>
        </ScreenLayout>
      </>
    )
  }

  if (phase === 'reflection') {
    const prompt = REFLECTION_PROMPTS[promptIndex]
    const last = promptIndex >= REFLECTION_PROMPTS.length - 1

    return (
      <>
        <TopBar player={player} title="ห้องกักตัว · หน้าประตูโดม" />
        <ScreenLayout width="normal">
          <div className="sz-terminal sz-scanline p-6 text-center sm:p-8">
            <p className="text-5xl" aria-hidden="true">
              🚪
            </p>
            <h2 className="sz-hologram mt-3 text-xl font-black sm:text-2xl">
              พื้นที่จำกัด ไม่ใช่ทุกคนที่จะได้เข้า
            </h2>
            <p className="mt-3 text-sm text-slate-300">
              ประตูโดมยังไม่เปิด ไฟสีส้มกะพริบอยู่เหนือหัว
              ด้านหลังหนูยังมีคนต่อแถวอีกยาวมาก
            </p>
          </div>

          <div className="panel mt-5 p-6">
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-gold-300">
              คำถามที่ {promptIndex + 1} จาก {REFLECTION_PROMPTS.length}
            </p>
            <p className="mt-3 text-lg font-black leading-relaxed text-white">
              <span aria-hidden="true" className="mr-2">
                {prompt?.icon}
              </span>
              {prompt?.question}
            </p>
            <p className="mt-3 rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-slate-300">
              <span className="font-bold text-gold-300">แนวทางสำหรับครู · </span>
              {prompt?.note}
            </p>

            <div className="mt-5 flex flex-wrap gap-3">
              {promptIndex > 0 ? (
                <Button
                  variant="ghost"
                  onClick={() => setPromptIndex((index) => index - 1)}
                >
                  ย้อนกลับ
                </Button>
              ) : null}
              <Button
                size="lg"
                icon={last ? '🛡️' : '→'}
                onClick={() => {
                  if (last) {
                    setPhase('control')
                    return
                  }
                  setPromptIndex((index) => index + 1)
                }}
              >
                {last ? 'ประตูเปิดแล้ว เข้าห้องควบคุม' : 'คุยกันเสร็จแล้ว ข้อต่อไป'}
              </Button>
            </div>
          </div>
        </ScreenLayout>
      </>
    )
  }

  if (phase === 'control') {
    const mission = missions[missionIndex]
    if (!mission) return null

    return (
      <>
        <TopBar player={player} title="ห้องควบคุมโดม" />
        <ScreenLayout width="normal">
          <div className="mb-4 flex items-center justify-center gap-2">
            {missions.map((item, index) => (
              <span
                key={item.id}
                aria-hidden="true"
                className={`h-2 rounded-full transition-all ${
                  index < missionIndex
                    ? 'w-8 bg-leaf-400'
                    : index === missionIndex
                      ? 'w-10 bg-cyan-300'
                      : 'w-4 bg-white/20'
                }`}
              />
            ))}
          </div>

          <MissionTerminal
            key={mission.id}
            mission={mission}
            onResult={finishMission}
            onNext={nextMission}
          />
        </ScreenLayout>
      </>
    )
  }

  return (
    <>
      <TopBar player={player} title="ยินดีต้อนรับสู่ Safe Zone" />
      <ScreenLayout width="normal">
        <div className="sz-terminal p-6 text-center sm:p-8">
          <p className="text-5xl" aria-hidden="true">
            🌳
          </p>
          <h2 className="mt-3 text-2xl font-black text-leaf-400">
            ประตูโดมเปิดออก อากาศข้างในเย็นและมีกลิ่นของใบไม้
          </h2>
          <p className="mt-3 text-sm text-slate-300">
            หนูเก็บของยังชีพครบทั้งสามชิ้น และคำนวณทรัพยากรของโดมได้ถูกต้องทั้งสี่ภารกิจ
            ตอนนี้หนูเป็นผู้พิทักษ์ของ Safe Zone อย่างเป็นทางการแล้ว
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2 text-sm">
            <span className="stat-chip">⏱️ ใช้เวลาข้างนอก {clearedSeconds} วินาที</span>
            <span className="stat-chip">
              🥵 ความร้อนเต็ม {world.meltdowns} ครั้ง
            </span>
          </div>
        </div>

        <div className="panel mt-5 p-6">
          <h3 className="text-lg font-black text-white">
            แต่โดมไม่ใช่คำตอบที่ดีที่สุด
          </h3>
          <p className="mt-2 text-sm text-slate-300">
            คำตอบที่ดีกว่าคือไม่ต้องมีโดมตั้งแต่แรก เลือกสิ่งที่หนูจะเริ่มทำตั้งแต่วันนี้
            เพื่อให้โลกข้างนอกยังเป็นที่ที่อยู่ได้
          </p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {PLEDGES.map((text) => {
              const picked = pledges.includes(text)
              return (
                <button
                  key={text}
                  type="button"
                  onClick={() => togglePledge(text)}
                  aria-pressed={picked}
                  className={`btn-3d flex items-center gap-2 rounded-xl border p-3 text-left text-sm font-semibold transition-colors ${
                    picked
                      ? 'border-leaf-400/70 bg-leaf-500/20 text-leaf-300'
                      : 'border-white/10 bg-white/5 text-slate-200 hover:bg-white/10'
                  }`}
                >
                  <span aria-hidden="true">{picked ? '✅' : '⬜'}</span>
                  {text}
                </button>
              )
            })}
          </div>
          {pledges.length > 0 ? (
            <p className="mt-4 text-center text-sm font-bold text-gold-300">
              หนูสัญญาไว้ {pledges.length} ข้อ · เอาไปเล่าให้ที่บ้านฟังด้วยนะ
            </p>
          ) : null}
        </div>

        <div className="mt-5 flex flex-wrap justify-center gap-3">
          <Button size="lg" icon="🏠" onClick={() => navigate('/menu')}>
            กลับเมนูหลัก
          </Button>
        </div>
      </ScreenLayout>
    </>
  )
}

/* ------------------------------------------------------------------ *
 * ส่วนประกอบย่อย
 * ------------------------------------------------------------------ */

interface PadButtonProps {
  label: string
  direction: MoveInput
  onPress: (direction: MoveInput | null) => void
}

/**
 * ปุ่มทิศทางหนึ่งปุ่ม
 *
 * ใช้ pointer event ชุดเดียวแทนที่จะแยก mouse กับ touch
 * เพราะแท็บเล็ตหลายรุ่นส่งทั้งสองชุดพร้อมกัน แล้วปุ่มจะถูกกดสองครั้ง
 * ที่ต้องดัก onPointerLeave กับ onPointerCancel ด้วย เพราะถ้านิ้วเลื่อนออกนอกปุ่ม
 * ระหว่างกดค้าง เบราว์เซอร์จะไม่ส่ง pointerup มาให้ แล้วตัวละครจะเดินไม่หยุด
 */
function PadButton({ label, direction, onPress }: PadButtonProps) {
  const stop = (): void => onPress(null)
  return (
    <button
      type="button"
      aria-label={`เดินทาง ${label}`}
      className="sz-pad h-12 w-12"
      onPointerDown={(event) => {
        event.preventDefault()
        onPress(direction)
      }}
      onPointerUp={stop}
      onPointerLeave={stop}
      onPointerCancel={stop}
      onContextMenu={(event) => event.preventDefault()}
    >
      <span aria-hidden="true">{label}</span>
    </button>
  )
}

interface DroneTerminalProps {
  puzzle: DronePuzzle
  picked: number | null
  onAnswer: (choice: number) => void
  onRetreat: () => void
}

function DroneTerminal({ puzzle, picked, onAnswer, onRetreat }: DroneTerminalProps) {
  const item = findItem(puzzle.itemId)
  const isCorrect = picked !== null && picked === puzzle.answer
  const isWrong = picked !== null && picked !== puzzle.answer

  return (
    <div className="sz-terminal sz-scanline w-full max-w-lg p-4 sm:p-6">
      <div className="flex items-center gap-3">
        <span aria-hidden="true" className="text-3xl">
          🤖
        </span>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-ember-400">
            GUARDIAN DRONE · LOCKED
          </p>
          <p className="text-sm text-slate-300">
            ปลดล็อก {item.emoji} {item.name} ด้วยรหัสผ่าน
          </p>
        </div>
      </div>

      <p className="sz-hologram mt-4 text-center text-3xl font-black tabular-nums sm:text-4xl">
        {puzzle.expression}
      </p>

      <div className="mt-4 grid grid-cols-2 gap-2.5">
        {puzzle.choices.map((choice) => {
          const chosen = picked === choice
          const revealCorrect = picked !== null && choice === puzzle.answer
          return (
            <button
              key={choice}
              type="button"
              disabled={picked !== null}
              onClick={() => onAnswer(choice)}
              className={`btn-3d min-h-[52px] rounded-xl border-b-4 text-xl font-black tabular-nums transition-colors ${
                revealCorrect
                  ? 'border-leaf-600 bg-leaf-500 text-night-900'
                  : chosen
                    ? 'border-ember-600 bg-ember-500 text-white'
                    : 'border-night-500 bg-night-700 text-white hover:bg-night-600 disabled:opacity-60'
              }`}
            >
              {choice}
            </button>
          )
        })}
      </div>

      {isCorrect ? (
        <p className="mt-4 text-center text-sm font-bold text-leaf-400">
          ✅ โดรนหลบทางแล้ว · {item.gained}
        </p>
      ) : null}

      {isWrong ? (
        <div className="mt-4 text-center">
          <p className="text-sm font-bold text-ember-400">
            ❌ รหัสไม่ถูกต้อง คำตอบคือ {puzzle.answer} · ชุดร้อนขึ้นแล้ว
          </p>
          <p className="mt-1 text-xs text-slate-400">
            ของชิ้นนี้ยังอยู่ตรงนี้เสมอ ถอยไปพักที่แผ่นทำความเย็นแล้วกลับมาลองใหม่ได้
          </p>
          <Button className="mt-3" variant="ghost" onClick={onRetreat}>
            ถอยออกมาก่อน
          </Button>
        </div>
      ) : null}
    </div>
  )
}

interface MissionTerminalProps {
  mission: Mission
  onResult: (mission: Mission, isCorrect: boolean) => void
  onNext: () => void
}

/**
 * จอภารกิจหนึ่งข้อ
 *
 * ทุกข้อจบด้วยการตอบถูกเสมอ ไม่มีทางเดินต่อโดยที่ยังตอบผิดค้างอยู่
 * ตั้งใจเป็นแบบนั้น เพราะนี่คือด่านที่ผูกกับตัวชี้วัดโดยตรง
 * การปล่อยผ่านทั้งที่ยังไม่เข้าใจ ทำให้ทั้งครูและเด็กเข้าใจผิดว่าผ่านแล้ว
 * สิ่งที่เปลี่ยนตามจำนวนครั้งที่ตอบผิดคือ "ตัวช่วย" ที่ค่อย ๆ เผยวิธีคิดออกมา
 */
function MissionTerminal({ mission, onResult, onNext }: MissionTerminalProps) {
  const [wrongCount, setWrongCount] = useState(0)
  const [solved, setSolved] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)

  const [text, setText] = useState('')
  const [stepOneText, setStepOneText] = useState('')
  const [stepOneDone, setStepOneDone] = useState(false)

  const [start, setStart] = useState<number | null>(null)
  const [give, setGive] = useState<number | null>(null)
  const [grow, setGrow] = useState<number | null>(null)

  const settle = useCallback(
    (isCorrect: boolean, message: string) => {
      playSfx(isCorrect ? 'correct' : 'wrong')
      setFeedback(message)
      if (isCorrect) {
        setSolved(true)
        onResult(mission, wrongCount === 0)
        return
      }
      setWrongCount((count) => count + 1)
    },
    [mission, onResult, wrongCount],
  )

  const header = (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-cyan-300">
        {mission.indicator}
      </p>
      <h2 className="sz-hologram mt-1 text-xl font-black sm:text-2xl">{mission.title}</h2>
      <p className="mt-3 text-sm leading-relaxed text-slate-200 sm:text-base">
        {mission.scenario}
      </p>
      <p className="mt-2 text-base font-bold text-gold-300">{mission.question}</p>
    </div>
  )

  const footer = solved ? (
    <Button size="lg" fullWidth className="mt-5" icon="→" onClick={onNext}>
      ยืนยันค่าเข้าระบบ · ไปภารกิจถัดไป
    </Button>
  ) : null

  if (mission.kind === 'estimate') {
    return (
      <div className="sz-terminal sz-scanline p-5 sm:p-7">
        {header}
        <div className="mt-4 grid grid-cols-2 gap-2.5">
          {mission.choices.map((choice) => (
            <button
              key={choice}
              type="button"
              disabled={solved}
              onClick={() =>
                settle(
                  choice === mission.answer,
                  choice === mission.answer
                    ? `ถูกต้อง · ${formatNumber(mission.roundedSolar)} + ${formatNumber(mission.roundedWind)} = ${formatNumber(mission.answer)} หน่วย`
                    : 'ยังไม่ใช่ ลองปัดตัวเลขแต่ละจำนวนให้เป็นหลักล้านก่อน แล้วค่อยบวกกัน',
                )
              }
              className={`btn-3d min-h-[56px] rounded-xl border-b-4 px-3 text-lg font-black tabular-nums ${
                solved && choice === mission.answer
                  ? 'border-leaf-600 bg-leaf-500 text-night-900'
                  : 'border-night-500 bg-night-700 text-white hover:bg-night-600 disabled:opacity-50'
              }`}
            >
              ประมาณ {formatNumber(choice)}
            </button>
          ))}
        </div>

        {wrongCount > 0 && !solved ? (
          <HintBox>
            <p>
              {formatNumber(mission.solar)} ปัดเป็นหลักล้านได้{' '}
              <strong className="text-cyan-300">{formatNumber(mission.roundedSolar)}</strong>
            </p>
            <p>
              {formatNumber(mission.wind)} ปัดเป็นหลักล้านได้{' '}
              <strong className="text-cyan-300">{formatNumber(mission.roundedWind)}</strong>
            </p>
            <p>แล้วนำค่าที่ปัดแล้วมาบวกกัน</p>
          </HintBox>
        ) : null}

        <Feedback text={feedback} solved={solved} />
        {solved ? (
          <p className="mt-2 text-center text-xs text-slate-400">
            ค่าจริงคือ {formatNumber(mission.exact)} หน่วย · ค่าประมาณใช้ตัดสินใจได้เร็วกว่า
          </p>
        ) : null}
        {footer}
      </div>
    )
  }

  if (mission.kind === 'unknown') {
    const typed = readNumber(text)
    return (
      <div className="sz-terminal sz-scanline p-5 sm:p-7">
        {header}

        <p className="sz-hologram mt-4 text-center text-2xl font-black tabular-nums sm:text-3xl">
          {mission.sentence}
        </p>

        {/*
          แผนภาพแท่ง
          เด็กจำนวนมากอ่านประโยคสัญลักษณ์ที่มีช่องว่างไม่ออก แต่พอเห็นแท่งยาว
          ที่ถูกแบ่งเป็นสองท่อน จะเห็นทันทีว่าท่อนที่หายไปหาได้ด้วยการลบ
        */}
        <div className="mt-5">
          <p className="text-xs font-bold text-slate-400">ต้องการทั้งหมด {formatNumber(mission.target)} ลิตร</p>
          <div className="mt-1.5 flex h-10 w-full overflow-hidden rounded-lg border border-white/15">
            <div
              className="flex items-center justify-center bg-sky-600/70 text-xs font-bold text-white"
              style={{ width: `${(mission.known / mission.target) * 100}%` }}
            >
              {formatNumber(mission.known)}
            </div>
            <div className="flex flex-1 items-center justify-center bg-white/10 text-xs font-bold text-gold-300">
              ?
            </div>
          </div>
        </div>

        <NumberField
          label="เปิดถังออกซิเจนเพิ่ม (ลิตร)"
          value={text}
          onChange={setText}
          disabled={solved}
        />

        {!solved ? (
          <Button
            fullWidth
            className="mt-3"
            disabled={typed === null}
            onClick={() =>
              settle(
                typed === mission.answer,
                typed === mission.answer
                  ? `ถูกต้อง · ${formatNumber(mission.answer)} + ${formatNumber(mission.known)} = ${formatNumber(mission.target)}`
                  : 'ยังไม่ใช่ ลองดูจากแผนภาพแท่งว่าท่อนที่หายไปยาวเท่าไร',
              )
            }
          >
            ส่งค่าเข้าเครื่องฟอกอากาศ
          </Button>
        ) : null}

        {wrongCount > 0 && !solved ? (
          <HintBox>
            <p>ส่วนที่หายไป หาได้ด้วยการลบ</p>
            <p className="text-cyan-300">
              {formatNumber(mission.target)} − {formatNumber(mission.known)} = ?
            </p>
          </HintBox>
        ) : null}

        <Feedback text={feedback} solved={solved} />
        {footer}
      </div>
    )
  }

  if (mission.kind === 'twoStep') {
    const stepOneTyped = readNumber(stepOneText)
    const stepTwoTyped = readNumber(text)

    return (
      <div className="sz-terminal sz-scanline p-5 sm:p-7">
        {header}

        <div className="mt-5 rounded-xl border border-white/10 bg-white/5 p-4">
          <p className="text-sm font-bold text-white">{mission.stepOneQuestion}</p>
          <NumberField
            label={`${formatNumber(mission.farm)} + ${formatNumber(mission.hospital)}`}
            value={stepOneText}
            onChange={setStepOneText}
            disabled={stepOneDone}
          />
          {!stepOneDone ? (
            <Button
              fullWidth
              className="mt-3"
              disabled={stepOneTyped === null}
              onClick={() => {
                if (stepOneTyped === mission.stepOne) {
                  playSfx('correct')
                  setStepOneDone(true)
                  setFeedback(null)
                  return
                }
                playSfx('wrong')
                setWrongCount((count) => count + 1)
                setFeedback('ขั้นที่ 1 ยังไม่ถูก ลองบวกน้ำของสองแผนกอีกครั้ง')
              }}
            >
              ตรวจขั้นที่ 1
            </Button>
          ) : (
            <p className="mt-2 text-sm font-bold text-leaf-400">
              ✅ จ่ายออกไปทั้งหมด {formatNumber(mission.stepOne)} ลิตร
            </p>
          )}
        </div>

        {/*
          ขั้นที่ 2 ถูกล็อกไว้จนกว่าขั้นที่ 1 จะถูก
          ตัวชี้วัด ป.4/11 วัด "การแสดงวิธีหาคำตอบ" ไม่ใช่ตัวเลขสุดท้าย
          ถ้าเปิดให้กรอกพร้อมกันทั้งสองช่อง เด็กที่คิดรวบยอดในหัวจะข้ามขั้นแรกไปเลย
          ซึ่งทำให้ทั้งครูและตัวเด็กเองไม่เห็นว่าคิดพลาดตรงไหนเวลาตอบผิด
        */}
        <div
          className={`mt-4 rounded-xl border p-4 transition-opacity ${
            stepOneDone
              ? 'border-white/10 bg-white/5'
              : 'border-white/5 bg-white/[0.02] opacity-50'
          }`}
        >
          <p className="text-sm font-bold text-white">{mission.stepTwoQuestion}</p>
          {stepOneDone ? (
            <>
              <NumberField
                label={`${formatNumber(mission.total)} − ${formatNumber(mission.stepOne)}`}
                value={text}
                onChange={setText}
                disabled={solved}
              />
              {!solved ? (
                <Button
                  fullWidth
                  className="mt-3"
                  disabled={stepTwoTyped === null}
                  onClick={() =>
                    settle(
                      stepTwoTyped === mission.answer,
                      stepTwoTyped === mission.answer
                        ? `ถูกต้อง · เหลือน้ำ ${formatNumber(mission.answer)} ลิตร`
                        : 'ยังไม่ใช่ ลองเอาน้ำทั้งหมดลบด้วยน้ำที่จ่ายออกไปอีกครั้ง',
                    )
                  }
                >
                  ตรวจขั้นที่ 2
                </Button>
              ) : null}
            </>
          ) : (
            <p className="mt-2 text-sm text-slate-400">ตอบขั้นที่ 1 ให้ถูกก่อนนะ</p>
          )}
        </div>

        <Feedback text={feedback} solved={solved} />
        {footer}
      </div>
    )
  }

  const builderTyped = readNumber(text)

  return (
    <div className="sz-terminal sz-scanline p-5 sm:p-7">
      {header}

      <div className="mt-5 space-y-3 text-sm leading-loose text-slate-200 sm:text-base">
        <p>
          โดมมีเสบียงตั้งต้น{' '}
          <OptionSelect
            label="เสบียงตั้งต้น"
            options={mission.startOptions}
            value={start}
            onChange={setStart}
            disabled={solved}
          />{' '}
          กิโลกรัม
        </p>
        <p>
          เดือนนี้แจกจ่ายให้ทุกครอบครัวไป{' '}
          <OptionSelect
            label="แจกจ่ายออกไป"
            options={mission.giveOptions}
            value={give}
            onChange={setGive}
            disabled={solved}
          />{' '}
          กิโลกรัม
        </p>
        <p>
          แล้วแปลงเกษตรในโดมปลูกเพิ่มได้อีก{' '}
          <OptionSelect
            label="ปลูกเพิ่มได้"
            options={mission.growOptions}
            value={grow}
            onChange={setGrow}
            disabled={solved}
          />{' '}
          กิโลกรัม
        </p>
      </div>

      {start !== null && give !== null && grow !== null ? (
        <>
          <NumberField
            label="คำตอบของโจทย์ที่หนูสร้าง (กิโลกรัม)"
            value={text}
            onChange={setText}
            disabled={solved}
          />
          {!solved ? (
            <Button
              fullWidth
              className="mt-3"
              disabled={builderTyped === null}
              onClick={() => {
                const expected = builderAnswer(start, give, grow)
                settle(
                  builderTyped === expected,
                  builderTyped === expected
                    ? `ถูกต้อง · ${formatNumber(start)} − ${formatNumber(give)} + ${formatNumber(grow)} = ${formatNumber(expected)}`
                    : 'ยังไม่ใช่ ลองทำทีละขั้น เอาเสบียงตั้งต้นลบส่วนที่แจกไปก่อน แล้วค่อยบวกส่วนที่ปลูกเพิ่ม',
                )
              }}
            >
              ส่งแผนเสบียงเข้าระบบ
            </Button>
          ) : null}

          {wrongCount > 0 && !solved ? (
            <HintBox>
              <p>
                ขั้นที่ 1 · {formatNumber(start)} − {formatNumber(give)} ={' '}
                <strong className="text-cyan-300">{formatNumber(start - give)}</strong>
              </p>
              <p>
                ขั้นที่ 2 · {formatNumber(start - give)} + {formatNumber(grow)} = ?
              </p>
            </HintBox>
          ) : null}
        </>
      ) : (
        <p className="mt-4 text-sm text-slate-400">
          เลือกตัวเลขให้ครบทั้งสามช่องก่อน แล้วช่องคำตอบจะเปิดขึ้นมา
        </p>
      )}

      <Feedback text={feedback} solved={solved} />
      {footer}
    </div>
  )
}

function Feedback({ text, solved }: { text: string | null; solved: boolean }) {
  if (!text) return null
  return (
    <p
      role="status"
      className={`mt-4 rounded-xl border p-3 text-center text-sm font-bold ${
        solved
          ? 'border-leaf-400/40 bg-leaf-500/15 text-leaf-300'
          : 'border-gold-400/40 bg-gold-500/10 text-gold-300'
      }`}
    >
      {text}
    </p>
  )
}

/** กล่องตัวช่วย โผล่มาหลังตอบผิดครั้งแรกเท่านั้น ไม่ได้โชว์ตั้งแต่ต้น */
function HintBox({ children }: { children: ReactNode }) {
  return (
    <div className="mt-4 space-y-1 rounded-xl border border-cyan-400/30 bg-cyan-500/10 p-3 text-sm text-slate-200">
      <p className="text-xs font-bold uppercase tracking-widest text-cyan-300">
        ตัวช่วยจากห้องควบคุม
      </p>
      {children}
    </div>
  )
}

interface NumberFieldProps {
  label: string
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}

function NumberField({ label, value, onChange, disabled }: NumberFieldProps) {
  return (
    <label className="mt-4 block">
      <span className="text-xs font-bold text-slate-400">{label}</span>
      <input
        type="text"
        inputMode="numeric"
        autoComplete="off"
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value.replace(/[^0-9]/g, ''))}
        placeholder="พิมพ์ตัวเลข"
        className="mt-1 w-full rounded-xl border border-cyan-400/40 bg-night-900/80 px-4 py-3 text-center text-2xl font-black tabular-nums text-white placeholder:text-base placeholder:font-normal placeholder:text-slate-500 disabled:opacity-60"
      />
    </label>
  )
}

interface OptionSelectProps {
  label: string
  options: number[]
  value: number | null
  onChange: (value: number) => void
  disabled?: boolean
}

/** ช่องว่างในประโยคที่เด็กเลือกตัวเลขใส่เอง หัวใจของตัวชี้วัด ป.4/12 */
function OptionSelect({ label, options, value, onChange, disabled }: OptionSelectProps) {
  return (
    <select
      aria-label={label}
      disabled={disabled}
      value={value ?? ''}
      onChange={(event) => {
        playSfx('click')
        onChange(Number.parseInt(event.target.value, 10))
      }}
      className="mx-1 rounded-lg border border-gold-400/60 bg-night-900 px-2 py-1 text-base font-black tabular-nums text-gold-300 disabled:opacity-70"
    >
      <option value="" disabled>
        เลือก
      </option>
      {options.map((option) => (
        <option key={option} value={option}>
          {formatNumber(option)}
        </option>
      ))}
    </select>
  )
}
