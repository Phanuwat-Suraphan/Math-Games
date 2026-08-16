import { useCallback, useEffect, useRef, useState } from 'react'
import type { MutableRefObject, ReactNode } from 'react'
import { Button } from '../components/Button'
import { GameIcon } from '../components/art/GameArt'
import { ScreenLayout } from '../components/ScreenLayout'
import { TopBar } from '../components/TopBar'
import { useGame } from '../context/useGame'
import { generateQuestion } from '../questionEngine'
import { playSfx } from '../services/audioService'
import { applyBonusPercent, totalStats } from '../services/inventoryService'
import {
  advance,
  createWorld,
  isMoveKey,
  moveFromKeys,
  offerCount,
  offerSkills,
  readyToEvolve,
  ultimateProgress,
  ultimateReady,
  resolveQuestion,
  skipSkill,
  summarize,
  takeSkill,
} from '../survivor/engine'
import { getWeapon, weaponDisplayName } from '../survivor/weapons'
import { ultimateFor } from '../survivor/ultimates'
import type { Ultimate } from '../survivor/ultimates'
import { HERO_VIEWBOX, heroArt } from '../art/heroes'
import { MONSTER_ART_IDS, MONSTER_VIEWBOX, monsterArt } from '../art/monsters'
import { ARENA_HEIGHT, ARENA_WIDTH } from '../survivor/types'
import type { Input, WorldState } from '../survivor/types'
import type { Question } from '../questionEngine/types'
import type { SkillId } from '../types/stats'
import type { Player } from '../types/player'

/** ทักษะที่โจทย์ตอนเลเวลอัปจะถาม ไล่ยากขึ้นตามเลเวล */
const SKILL_BY_LEVEL: SkillId[] = [
  'addition',
  'subtraction',
  'multiplication',
  'division',
  'fractions',
  'decimals',
  'percentages',
  'geometry',
  'wordProblems',
]

/** ท่าทางของตัวละครที่หน้าจอต้องรู้เพื่อวาด */
interface HeroView {
  image: HTMLImageElement | null
  /** ภาพมอนสเตอร์ทุกชนิด แยกตามไอดีภาพ */
  monsters: Map<string, HTMLImageElement>
  /** 1 = หันขวา -1 = หันซ้าย */
  facing: number
  moving: boolean
  /** สกิลวิเศษกำลังออกฤทธิ์อยู่ไหม ใช้วาดวงพลังรอบตัว */
  glow: string | null
}

/**
 * แปลงภาพ SVG ของตัวละครเป็นภาพที่ canvas วาดได้
 *
 * ทำไมต้องแปลง: สนามวาดด้วย canvas ล้วนเพื่อความเร็ว
 * canvas วาด SVG ที่เป็นข้อความไม่ได้ ต้องผ่าน Image ก่อน
 *
 * แปลงครั้งเดียวตอนเปลี่ยนตัวละคร ไม่ใช่ทุกเฟรม
 * เพราะการสร้าง Image ใหม่ 60 ครั้งต่อวินาทีจะกินหน่วยความจำจนเครื่องค้าง
 *
 * ข้อจำกัดที่ยอมรับ: อนิเมชัน SMIL ในภาพจะไม่ขยับเมื่อวาดลง canvas
 * จึงทำท่าเดินเอาเองด้วยการขยับขึ้นลงและพลิกซ้ายขวาแทน
 * ซึ่งได้ผลดีกว่าด้วยซ้ำ เพราะจังหวะตรงกับการเดินจริงของเด็ก
 */
function svgToImage(inner: string, viewBox: string, size: number): HTMLImageElement {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" ` +
    `width="${size}" height="${size}">${inner}</svg>`

  const image = new Image()
  image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
  return image
}

/**
 * ภาพมอนสเตอร์ทุกตัวจากโหมดเควส แปลงไว้ล่วงหน้าครั้งเดียว
 *
 * แปลงตอนเข้าหน้าเลย ไม่ใช่ตอนมอนตัวนั้นโผล่ครั้งแรก
 * เพราะถ้าแปลงตอนโผล่ มอนตัวแรกของแต่ละชนิดจะหายไปหนึ่งเสี้ยววินาที
 * ซึ่งเป็นเสี้ยววินาทีที่เด็กกำลังต้องหลบมันพอดี
 *
 * เก็บเป็น Map เดียวใช้ทั้งเกม ภาพหนึ่งใบวาดซ้ำได้ไม่จำกัด
 * การวาดภาพที่แปลงไว้แล้วเร็วกว่าการวาดรูปทรงด้วยมือเสียอีก
 */
function useMonsterImages(): MutableRefObject<Map<string, HTMLImageElement>> {
  const ref = useRef<Map<string, HTMLImageElement>>(new Map())

  useEffect(() => {
    const cache = new Map<string, HTMLImageElement>()
    for (const id of MONSTER_ART_IDS) {
      cache.set(id, svgToImage(monsterArt(id), MONSTER_VIEWBOX, 128))
    }
    ref.current = cache

    return () => {
      ref.current = new Map()
    }
  }, [])

  return ref
}

function useHeroImage(avatarId: string): MutableRefObject<HTMLImageElement | null> {
  const ref = useRef<HTMLImageElement | null>(null)

  useEffect(() => {
    const image = svgToImage(heroArt(avatarId), HERO_VIEWBOX, 128)
    image.onload = () => {
      ref.current = image
    }

    return () => {
      ref.current = null
    }
  }, [avatarId])

  return ref
}

/**
 * โหมดเอาชีวิตรอด — เดินหลบ มอนวิ่งเข้าหา ยิงอัตโนมัติ
 *
 * วาดด้วย canvas ไม่ใช่ React
 *
 * เหตุผล: บนจอมีของเป็นร้อยชิ้นขยับพร้อมกัน 60 ครั้งต่อวินาที
 * ถ้าให้ React เรนเดอร์ทุกชิ้นทุกเฟรม เครื่องจะหน่วงจนเล่นไม่ได้
 * React จึงดูแลแค่เปลือกกับหน้าจอซ้อน ส่วนสนามวาดเองด้วย canvas
 *
 * สถานะเกมเก็บใน ref ไม่ใช่ state ด้วยเหตุผลเดียวกัน
 * การ setState ทุกเฟรมคือการสั่งให้ React ทำงานหนักโดยไม่จำเป็น
 */
export function Survivor({ player }: { player: Player }) {
  const { answerQuestion, patchPlayer } = useGame()

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const worldRef = useRef<WorldState>(createWorld(`${Date.now()}`, player.avatar))
  const heroImageRef = useHeroImage(player.avatar)
  const monsterImagesRef = useMonsterImages()
  const heroViewRef = useRef<HeroView>({
    image: null,
    monsters: new Map(),
    facing: 1,
    moving: false,
    glow: null,
  })
  const ultimate = ultimateFor(player.avatar)
  const inputRef = useRef<Input>({ move: { x: 0, y: 0 } })
  const keysRef = useRef<Set<string>>(new Set())
  const lastTimeRef = useRef(0)
  const paidRef = useRef(false)
  const shellRef = useRef<HTMLDivElement>(null)

  // สถานะที่หน้าจอต้องรู้จริง ๆ เท่านั้นที่เก็บเป็น state
  const [phase, setPhase] = useState<'idle' | 'playing' | 'question' | 'choosing' | 'dead'>('idle')
  const [hud, setHud] = useState({ hp: 100, maxHp: 100, level: 1, xp: 0, xpToNext: 5, time: 0, kills: 0 })
  const [question, setQuestion] = useState<Question | null>(null)
  const [summary, setSummary] = useState<ReturnType<typeof summarize> | null>(null)
  const [immersive, setImmersive] = useState(false)
  const [weaponBar, setWeaponBar] = useState<
    { id: string; level: number; name: string; color: string; evolved: boolean; ready: boolean }[]
  >([])
  const [chests, setChests] = useState(0)
  const [ultBar, setUltBar] = useState({ progress: 0, ready: false })
  const ultimateRequestRef = useRef(false)

  /*
   * โหมดเต็มจอ
   *
   * ทำสองชั้นซ้อนกันโดยตั้งใจ
   * 1. ขอ Fullscreen API จากเบราว์เซอร์ ซึ่งซ่อนแถบที่อยู่และแถบแท็บได้จริง
   * 2. ขยายเต็มหน้าต่างด้วย CSS ควบคู่ไปด้วยเสมอ
   *
   * ที่ต้องมีชั้นที่สองเพราะ Safari บน iPhone ไม่รองรับ Fullscreen API
   * กับ element ทั่วไป (รองรับเฉพาะวิดีโอ)
   * ถ้าพึ่ง API อย่างเดียว เด็กที่ใช้ iPhone จะกดปุ่มแล้วไม่มีอะไรเกิดขึ้นเลย
   * ส่วน iPad รุ่นใหม่รองรับ จึงได้เต็มจอจริง
   */
  const toggleImmersive = useCallback(async () => {
    const next = !immersive
    setImmersive(next)

    try {
      if (next) {
        if (shellRef.current?.requestFullscreen && !document.fullscreenElement) {
          await shellRef.current.requestFullscreen()
        }
      } else if (document.fullscreenElement) {
        await document.exitFullscreen()
      }
    } catch {
      // เบราว์เซอร์ปฏิเสธหรือไม่รองรับ ไม่เป็นไร ชั้น CSS ยังทำงานอยู่
    }
  }, [immersive])

  /* กดปุ่ม Esc ออกจากเต็มจอ ต้องให้ CSS กลับมาตรงกันด้วย */
  useEffect(() => {
    const sync = () => {
      if (!document.fullscreenElement) setImmersive(false)
    }
    document.addEventListener('fullscreenchange', sync)
    return () => document.removeEventListener('fullscreenchange', sync)
  }, [])

  /** ขอใช้สกิลวิเศษ ลูปหลักจะหยิบไปใช้ในเฟรมถัดไป */
  const onUltimate = useCallback(() => {
    ultimateRequestRef.current = true
  }, [])

  /** ตั้งโจทย์สำหรับเลเวลอัปครั้งนี้ */
  const askQuestion = useCallback(() => {
    const world = worldRef.current
    const level = world.player.level
    const skill = SKILL_BY_LEVEL[Math.min(SKILL_BY_LEVEL.length - 1, Math.floor(level / 2))]

    setQuestion(
      generateQuestion({
        type: skill,
        grade: level <= 4 ? 4 : level <= 9 ? 5 : 6,
        difficulty: level <= 3 ? 'easy' : level <= 8 ? 'medium' : 'hard',
        seed: `${world.seed}-lv${level}`,
      }),
    )
    setPhase('question')
  }, [])

  /* ลูปหลักของเกม */
  useEffect(() => {
    if (phase !== 'playing') return

    let frame = 0
    lastTimeRef.current = performance.now()

    const loop = (now: number) => {
      const elapsed = (now - lastTimeRef.current) / 1000
      lastTimeRef.current = now

      const before = worldRef.current
      const after = advance(before, elapsed, {
        ...inputRef.current,
        useUltimate: ultimateRequestRef.current,
      })
      // คำขอใช้สกิลมีผลเฟรมเดียว ไม่งั้นกดค้างแล้วจะใช้ซ้ำทันทีที่ชาร์จเต็ม
      ultimateRequestRef.current = false
      worldRef.current = after

      const move = inputRef.current.move
      const view = heroViewRef.current
      view.image = heroImageRef.current
      view.monsters = monsterImagesRef.current
      view.moving = Math.hypot(move.x, move.y) > 0.06
      if (move.x > 0.06) view.facing = 1
      else if (move.x < -0.06) view.facing = -1
      view.glow = after.ultimate.activeFor > 0 ? ultimate.color : null

      draw(canvasRef.current, after, view)

      setHud({
        hp: Math.ceil(after.player.hp),
        maxHp: after.player.maxHp,
        level: after.player.level,
        xp: after.player.xp,
        xpToNext: after.player.xpToNext,
        time: Math.floor(after.time),
        kills: after.kills,
      })
      setChests(after.chests)
      setUltBar({ progress: ultimateProgress(after), ready: ultimateReady(after) })

      /*
       * แถบอาวุธเปลี่ยนเฉพาะตอนเลเวลอัป ไม่ใช่ทุกเฟรม
       * จึงเทียบจำนวนก่อนสั่งอัปเดต ไม่งั้นจะสร้างอาเรย์ใหม่ 60 ครั้งต่อวินาที
       * แล้ว React เรนเดอร์แถบสถานะใหม่ทั้งแถบโดยไม่จำเป็น
       */
      const owned = Object.entries(after.weapons)
      const ready = readyToEvolve(after)
      setWeaponBar((current) => {
        if (
          current.length === owned.length &&
          current.every(
            (entry) =>
              after.weapons[entry.id] === entry.level &&
              after.evolved.includes(entry.id) === entry.evolved &&
              ready.includes(entry.id) === entry.ready,
          )
        ) {
          return current
        }
        return owned.map(([id, level]) => {
          const weapon = getWeapon(id)
          const evolved = after.evolved.includes(id)
          return {
            id,
            level,
            evolved,
            ready: ready.includes(id),
            name: weaponDisplayName(id, evolved),
            color: weapon?.color ?? '#e2e8f0',
          }
        })
      })

      if (after.phase === 'question') {
        playSfx('levelUp')
        askQuestion()
        return
      }
      if (after.phase === 'dead') {
        playSfx('wrong')
        setSummary(summarize(after))
        setPhase('dead')
        return
      }

      frame = requestAnimationFrame(loop)
    }

    frame = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(frame)
  }, [askQuestion, heroImageRef, monsterImagesRef, phase, ultimate.color])

  /*
   * แป้นพิมพ์ WASD และปุ่มลูกศร
   *
   * ใช้ event.code ไม่ใช่ event.key เด็ดขาด
   *
   * event.key คือ "ตัวอักษรที่พิมพ์ออกมา" ซึ่งเปลี่ยนตามผังแป้นพิมพ์
   * ถ้าเด็กเปิดแป้นภาษาไทยค้างไว้ กด W จะได้ "ไ" กด A จะได้ "ฟ"
   * WASD จะใช้ไม่ได้เลยทั้งชุด ซึ่งในห้องเรียนไทยเกิดขึ้นแน่นอน
   * และถ้าเปิด Caps Lock ไว้ event.key จะเป็น "W" ตัวใหญ่ซึ่งก็ไม่ตรงอีก
   *
   * event.code คือ "ปุ่มไหนบนแป้น" ไม่ขึ้นกับภาษาและไม่ขึ้นกับ Caps Lock
   */
  useEffect(() => {
    const apply = () => {
      inputRef.current = { move: moveFromKeys(keysRef.current) }
    }


    const down = (event: KeyboardEvent) => {
      /*
       * เว้นวรรคใช้สกิลวิเศษ
       * ใช้ event.code เหมือนปุ่มเดิน จึงไม่ขึ้นกับผังแป้นพิมพ์
       * และต้องกัน preventDefault ด้วย ไม่งั้นเว้นวรรคจะเลื่อนหน้าเว็บลง
       */
      if (event.code === 'Space') {
        event.preventDefault()
        if (!event.repeat) onUltimate()
        return
      }
      if (!isMoveKey(event.code)) return
      // กันปุ่มลูกศรเลื่อนหน้าเว็บระหว่างเล่น ซึ่งทำให้สนามหลุดจอ
      event.preventDefault()
      keysRef.current.add(event.code)
      apply()
    }
    const up = (event: KeyboardEvent) => {
      if (!isMoveKey(event.code)) return
      keysRef.current.delete(event.code)
      apply()
    }

    /*
     * สลับแท็บหรือคลิกออกไปนอกหน้าต่างระหว่างกดปุ่มค้างอยู่
     * เบราว์เซอร์จะไม่ส่ง keyup มาให้ ปุ่มจะค้างว่ากดอยู่ตลอด
     * แล้วตัวละครจะเดินชนขอบจอไปเรื่อย ๆ ทั้งที่เด็กปล่อยมือแล้ว
     */
    const clearKeys = () => {
      keysRef.current.clear()
      apply()
    }

    window.addEventListener('keydown', down, { passive: false })
    window.addEventListener('keyup', up)
    window.addEventListener('blur', clearKeys)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      window.removeEventListener('blur', clearKeys)
    }
  }, [onUltimate])

  /** จ่ายเหรียญตอนจบ ทำที่เดียวและกันจ่ายซ้ำ */
  useEffect(() => {
    if (phase !== 'dead' || !summary || paidRef.current) return
    paidRef.current = true

    const gained = applyBonusPercent(summary.coins, totalStats(player).coinBonusPercent)
    if (gained > 0) patchPlayer({ coins: player.coins + gained })
  }, [patchPlayer, phase, player, summary])

  const start = useCallback(() => {
    paidRef.current = false
    worldRef.current = createWorld(`${Date.now()}`, player.avatar)
    inputRef.current = { move: { x: 0, y: 0 } }
    setSummary(null)
    setQuestion(null)
    setWeaponBar([])
    setChests(0)
    setUltBar({ progress: 0, ready: false })
    ultimateRequestRef.current = false
    setPhase('playing')
  }, [])

  /** จบรอบเองโดยไม่ต้องรอตาย เพื่อรับเหรียญที่สะสมไว้ */
  const endRun = useCallback(() => {
    setSummary(summarize(worldRef.current))
    setPhase('dead')
  }, [])

  const submitAnswer = useCallback(
    (choiceText: string) => {
      if (!question) return
      const correct = choiceText === question.correctAnswer
      const level = worldRef.current.player.level
      const skill = SKILL_BY_LEVEL[Math.min(SKILL_BY_LEVEL.length - 1, Math.floor(level / 2))]

      answerQuestion({
        questionId: `survivor-${worldRef.current.seed}-${level}`,
        stageId: 'survivor-arena',
        skill,
        isCorrect: correct,
        timeMs: 0,
        isReplay: true,
      })
      playSfx(correct ? 'correct' : 'wrong')

      worldRef.current = resolveQuestion(worldRef.current, correct)
      setPhase('choosing')
    },
    [answerQuestion, question],
  )

  const chooseSkill = useCallback((skillId: string) => {
    /*
     * รหัสว่างแปลว่าเก็บสกิลครบทุกใบแล้ว จึงต้องขึ้นเลเวลแบบไม่รับสกิล
     * ถ้าแค่สั่งกลับไปเล่นต่อเฉย ๆ XP ที่ล้นอยู่จะสั่งให้หยุดถามโจทย์
     * ใหม่ทันทีในเฟรมถัดไป แล้ววนไม่รู้จบ
     */
    worldRef.current = skillId
      ? takeSkill(worldRef.current, skillId)
      : skipSkill(worldRef.current)
    playSfx('coin')
    setPhase('playing')
  }, [])

  return (
    <div
      ref={shellRef}
      className={
        immersive
          ? 'fixed inset-0 z-50 flex flex-col items-center justify-center bg-night-900 p-2'
          : ''
      }
    >
      {!immersive && (
        <TopBar player={player} title="สนามรบตัวเลข" backTo="/menu" backLabel="กลับเมนู" />
      )}

      <div className={immersive ? 'flex h-full w-full flex-col' : ''}>
        {!immersive && (
          <ScreenLayout width="wide">
            {phase === 'idle' && <Intro onStart={start} ultimate={ultimate} />}
          </ScreenLayout>
        )}

        {phase !== 'idle' && (
          <div
            className={
              immersive
                ? 'flex h-full w-full flex-col gap-2'
                : 'mx-auto w-full max-w-5xl px-4 pb-8'
            }
          >
            <Hud
              hud={hud}
              weapons={weaponBar}
              chests={chests}
              immersive={immersive}
              onToggleFullscreen={toggleImmersive}
              onEndRun={phase === 'playing' ? endRun : undefined}
            />

            {/*
              กรอบสนาม
              เต็มจอใช้ min-h-0 เพื่อให้ flex ย่อกรอบลงได้จริง
              ถ้าไม่ใส่ กรอบจะดันความสูงจนแป้นบังคับหลุดออกนอกจอ
            */}
            <div
              className={
                immersive
                  ? 'relative flex min-h-0 flex-1 items-center justify-center'
                  : 'relative mt-3'
              }
            >
              <canvas
                ref={canvasRef}
                width={ARENA_WIDTH}
                height={ARENA_HEIGHT}
                className={
                  immersive
                    ? 'max-h-full max-w-full rounded-lg border border-white/10 bg-night-900'
                    : 'w-full rounded-xl2 border border-white/10 bg-night-900'
                }
                style={{
                  aspectRatio: `${ARENA_WIDTH} / ${ARENA_HEIGHT}`,
                  touchAction: 'none',
                }}
              />

              {phase === 'question' && question && (
                <Overlay>
                  <QuestionCard question={question} onAnswer={submitAnswer} />
                </Overlay>
              )}

              {phase === 'choosing' && (
                <Overlay>
                  <SkillCards world={worldRef.current} onChoose={chooseSkill} />
                </Overlay>
              )}

              {phase === 'dead' && summary && (
                <Overlay>
                  <DeadCard summary={summary} onRestart={start} />
                </Overlay>
              )}
            </div>

            {phase === 'playing' && (
              <div
                className={
                  immersive
                    ? 'flex shrink-0 items-center justify-center gap-6 py-1'
                    : 'mt-4 flex items-center justify-center gap-8'
                }
              >
                <Joystick inputRef={inputRef} compact={immersive} />
                <UltimateButton
                  ultimate={ultimate}
                  progress={ultBar.progress}
                  ready={ultBar.ready}
                  compact={immersive}
                  onUse={onUltimate}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

/* ---------- การวาด ---------- */

/**
 * วาดสนามทั้งหมดลง canvas
 *
 * วาดเป็นรูปทรงเรียบ ๆ ไม่ใช้ภาพ SVG ของมอนสเตอร์
 * เพราะการแปลง SVG เป็นภาพแล้ววาดร้อยตัวต่อเฟรมช้าเกินไป
 * รูปทรงกับสีที่ต่างกันชัดเจนพอให้เด็กแยกชนิดมอนได้อยู่แล้ว
 */
function draw(canvas: HTMLCanvasElement | null, world: WorldState, hero: HeroView): void {
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  ctx.clearRect(0, 0, ARENA_WIDTH, ARENA_HEIGHT)

  // พื้นสนามพร้อมตารางจาง ๆ ช่วยให้รู้สึกว่าตัวเองกำลังเคลื่อนที่
  ctx.fillStyle = '#0f0a1e'
  ctx.fillRect(0, 0, ARENA_WIDTH, ARENA_HEIGHT)
  ctx.strokeStyle = 'rgba(148,163,184,.08)'
  ctx.lineWidth = 1
  for (let x = 0; x <= ARENA_WIDTH; x += 50) {
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, ARENA_HEIGHT)
    ctx.stroke()
  }
  for (let y = 0; y <= ARENA_HEIGHT; y += 50) {
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(ARENA_WIDTH, y)
    ctx.stroke()
  }

  // คริสตัล
  for (const gem of world.gems) {
    ctx.fillStyle = '#a78bfa'
    ctx.beginPath()
    ctx.moveTo(gem.pos.x, gem.pos.y - 6)
    ctx.lineTo(gem.pos.x + 5, gem.pos.y)
    ctx.lineTo(gem.pos.x, gem.pos.y + 6)
    ctx.lineTo(gem.pos.x - 5, gem.pos.y)
    ctx.closePath()
    ctx.fill()
  }

  /*
   * ของที่ตกอยู่บนพื้น
   * วาดก่อนมอน เพื่อให้มอนที่เดินผ่านทับได้ตามธรรมชาติ
   * แต่หีบวาดใหญ่และกะพริบ เพราะเป็นของที่ห้ามพลาด
   */
  for (const pickup of world.pickups) {
    const pulse = 1 + Math.sin(world.time * 6) * 0.12

    if (pickup.kind === 'chest') {
      ctx.fillStyle = '#fbbf24'
      ctx.fillRect(pickup.pos.x - 13 * pulse, pickup.pos.y - 10 * pulse, 26 * pulse, 20 * pulse)
      ctx.fillStyle = '#92400e'
      ctx.fillRect(pickup.pos.x - 13 * pulse, pickup.pos.y - 2, 26 * pulse, 4)
      ctx.strokeStyle = '#fff7ed'
      ctx.lineWidth = 2
      ctx.strokeRect(pickup.pos.x - 13 * pulse, pickup.pos.y - 10 * pulse, 26 * pulse, 20 * pulse)
      continue
    }

    const LOOK: Record<string, string> = {
      heart: '#fb7185',
      bomb: '#f8fafc',
      magnet: '#c084fc',
    }
    ctx.fillStyle = LOOK[pickup.kind] ?? '#e2e8f0'
    ctx.beginPath()
    ctx.arc(pickup.pos.x, pickup.pos.y, 9 * pulse, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = 'rgba(255,255,255,.85)'
    ctx.lineWidth = 2
    ctx.stroke()
  }

  // มอนสเตอร์ สีต่างกันตามชนิด
  const COLORS: Record<string, string> = {
    'number-slime': '#34d399',
    'fraction-bat': '#a78bfa',
    'goblin-calculator': '#84cc16',
    'decimal-scorpion': '#f59e0b',
    'big-slime': '#10b981',
    'percentage-bandit': '#f87171',
    'geometry-golem': '#94a3b8',
    'math-guardian': '#60a5fa',
    'fraction-ghost': '#c4b5fd',
    'dragon-of-numbers': '#dc2626',
    'boss-slime-king': '#059669',
    'boss-math-guardian': '#7c3aed',
    'boss-golem-king': '#64748b',
    'boss-number-dragon': '#b91c1c',
    'decimal-worm': '#f59e0b',
    'equation-wraith': '#a5b4fc',
    'chaos-cube': '#e11d48',
    'prime-knight': '#94a3b8',
    'wraith-swarm': '#818cf8',
    'cube-sentinel': '#be123c',
    'boss-prime-knight': '#cbd5e1',
    'boss-chaos-cube': '#fb7185',
  }

  for (const enemy of world.enemies) {
    const sprite = hero.monsters.get(enemy.art)

    if (sprite && sprite.complete) {
      /*
       * ภาพจริงจากโหมดเควส วาดใหญ่กว่ารัศมีการชนเล็กน้อย
       * ให้ตัวมอนดูเต็มตาแต่ระยะชนยังเป็นวงกลมเดิม
       * ถ้าให้ระยะชนเท่ากับขอบภาพ เด็กจะโดนชนตั้งแต่ยังดูเหมือนไม่ติดกัน
       */
      // คูณ 3.3 ไม่ใช่ 2 เท่าของรัศมี เพราะภาพมีขอบว่างในตัวราวหนึ่งในห้า
      // ถ้าใช้เท่ารัศมีพอดี ตัวมอนจะดูเล็กกว่าระยะชนจริงจนเด็กงงว่าทำไมโดน
      const size = enemy.radius * 3.3
      const sway = Math.sin(world.time * 3 + enemy.id) * 2

      ctx.save()
      ctx.translate(enemy.pos.x, enemy.pos.y + sway)
      // หันหน้าเข้าหาผู้เล่นเสมอ ทำให้ฝูงมอนดูกำลังไล่ล่าจริง ๆ
      if (enemy.pos.x > world.player.pos.x) ctx.scale(-1, 1)
      ctx.drawImage(sprite, -size / 2, -size / 2, size, size)

      // กระพริบขาวตอนโดนตี ทับลงบนภาพเดิม
      if (enemy.hitFlash > 0) {
        ctx.globalAlpha = 0.75
        ctx.globalCompositeOperation = 'lighter'
        ctx.drawImage(sprite, -size / 2, -size / 2, size, size)
        ctx.globalCompositeOperation = 'source-over'
        ctx.globalAlpha = 1
      }
      ctx.restore()
    } else {
      // ภาพยังไม่พร้อม วาดวงกลมสีประจำชนิดไปก่อน
      ctx.fillStyle = enemy.hitFlash > 0 ? '#ffffff' : (COLORS[enemy.kind] ?? '#94a3b8')
      ctx.beginPath()
      ctx.arc(enemy.pos.x, enemy.pos.y, enemy.radius, 0, Math.PI * 2)
      ctx.fill()
    }

    // ตัวใหญ่พิเศษมีวงแหวนทองรอบตัว ให้เห็นแต่ไกลว่าตัวนี้ไม่ธรรมดา
    if (enemy.elite) {
      ctx.strokeStyle = '#fbbf24'
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.arc(enemy.pos.x, enemy.pos.y, enemy.radius + 5, 0, Math.PI * 2)
      ctx.stroke()
    }

    /*
     * บอสมีมงกุฎหนามสองชั้นและวงแหวนแดง
     * ต้องแยกออกจากตัวใหญ่พิเศษได้ในพริบตา เพราะสองอย่างนี้ทำคนละหน้าที่
     * ตัวใหญ่พิเศษล้มหรือไม่ล้มก็ได้ แต่บอสคือของที่ต้องล้มให้ได้เพื่อเอาหีบ
     */
    if (enemy.boss) {
      ctx.strokeStyle = '#f43f5e'
      ctx.lineWidth = 4
      ctx.beginPath()
      ctx.arc(enemy.pos.x, enemy.pos.y, enemy.radius + 7, 0, Math.PI * 2)
      ctx.stroke()

      ctx.fillStyle = '#fbbf24'
      const spikes = 5
      const top = enemy.pos.y - enemy.radius - 10
      ctx.beginPath()
      for (let i = 0; i < spikes; i += 1) {
        const x = enemy.pos.x - enemy.radius * 0.6 + (i * enemy.radius * 1.2) / (spikes - 1)
        ctx.moveTo(x - 4, top + 8)
        ctx.lineTo(x, top - 4)
        ctx.lineTo(x + 4, top + 8)
      }
      ctx.fill()
    }

    // ติดไฟกับโดนแช่แข็งต้องเห็นได้ทันที ไม่งั้นเด็กไม่รู้ว่าอาวุธทำงานอยู่
    if (enemy.burnFor > 0) {
      ctx.strokeStyle = 'rgba(249,115,22,.9)'
      ctx.lineWidth = 2.5
      ctx.beginPath()
      ctx.arc(enemy.pos.x, enemy.pos.y, enemy.radius + 3, 0, Math.PI * 2)
      ctx.stroke()
    }
    if (enemy.slowFor > 0) {
      ctx.fillStyle = 'rgba(103,232,249,.35)'
      ctx.beginPath()
      ctx.arc(enemy.pos.x, enemy.pos.y, enemy.radius + 2, 0, Math.PI * 2)
      ctx.fill()
    }

    // ตาสองดวงเฉพาะตอนที่ยังไม่มีภาพจริง ภาพจริงมีตาอยู่แล้ว
    if (!sprite || !sprite.complete) {
      ctx.fillStyle = '#0f172a'
      const eye = enemy.radius * 0.3
      ctx.beginPath()
      ctx.arc(enemy.pos.x - eye, enemy.pos.y - eye * 0.4, enemy.radius * 0.18, 0, Math.PI * 2)
      ctx.arc(enemy.pos.x + eye, enemy.pos.y - eye * 0.4, enemy.radius * 0.18, 0, Math.PI * 2)
      ctx.fill()
    }

    // แถบเลือดเฉพาะตัวที่โดนตีแล้ว ไม่งั้นจอรกด้วยแถบเต็มไปหมด
    if (enemy.hp < enemy.maxHp) {
      const width = enemy.radius * 2
      ctx.fillStyle = 'rgba(0,0,0,.5)'
      ctx.fillRect(enemy.pos.x - enemy.radius, enemy.pos.y - enemy.radius - 8, width, 3)
      ctx.fillStyle = '#f87171'
      ctx.fillRect(
        enemy.pos.x - enemy.radius,
        enemy.pos.y - enemy.radius - 8,
        width * Math.max(0, enemy.hp / enemy.maxHp),
        3,
      )
    }
  }

  // กระสุนของมอน สีแดงเข้มให้ต่างจากกระสุนของเราชัดเจน
  ctx.fillStyle = '#ef4444'
  for (const shot of world.enemyShots) {
    ctx.beginPath()
    ctx.arc(shot.pos.x, shot.pos.y, shot.radius, 0, Math.PI * 2)
    ctx.fill()
  }

  // กระสุนของเรา สีตามอาวุธที่ยิง
  const SHOT_COLORS: Record<string, string> = { fire: '#f97316', ice: '#67e8f9' }
  for (const shot of world.projectiles) {
    ctx.fillStyle = SHOT_COLORS[shot.weapon] ?? '#fcd34d'
    ctx.beginPath()
    ctx.arc(shot.pos.x, shot.pos.y, shot.radius, 0, Math.PI * 2)
    ctx.fill()
  }

  /*
   * เอฟเฟกต์อาวุธ
   * จางลงตามอายุที่เหลือ จึงดูเหมือนแสงที่ค่อย ๆ หายไป
   * ไม่ใช่รูปที่โผล่มาแล้วหายวับซึ่งตาจับไม่ทัน
   */
  for (const effect of world.effects) {
    const fade = Math.max(0, effect.life / effect.maxLife)

    if (effect.kind === 'slash') {
      ctx.strokeStyle = `rgba(226,232,240,${fade})`
      ctx.lineWidth = 5 * fade + 1
      ctx.beginPath()
      ctx.arc(effect.pos.x, effect.pos.y, effect.radius * (1.15 - fade * 0.15), 0, Math.PI * 2)
      ctx.stroke()
    } else if (effect.kind === 'blast') {
      ctx.fillStyle = `rgba(249,115,22,${fade * 0.45})`
      ctx.beginPath()
      ctx.arc(effect.pos.x, effect.pos.y, effect.radius * (1.4 - fade * 0.4), 0, Math.PI * 2)
      ctx.fill()
    } else if (effect.kind === 'bolt' && effect.to) {
      ctx.strokeStyle = `rgba(56,189,248,${fade})`
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.moveTo(effect.pos.x, effect.pos.y)
      ctx.lineTo(effect.to.x, effect.to.y)
      ctx.stroke()
    }
  }

  // ---------- ผู้เล่น ----------
  const { pos, radius } = world.player
  const hurt = world.player.invulnerable > 0
  const blink = hurt && Math.floor(world.time * 12) % 2 === 0

  /*
   * วงพลังตอนใช้สกิลวิเศษ วาดใต้ตัวละคร
   * ต้องเห็นชัดมาก เพราะเป็นช่วงที่เด็กกล้าเดินเข้าไปกลางฝูงได้
   * ถ้าดูไม่ออกว่ายังเปิดอยู่ไหม จะเดินอยู่กลางฝูงต่อจนตายพอดี
   */
  if (hero.glow) {
    const wave = 1 + Math.sin(world.time * 9) * 0.08
    ctx.strokeStyle = hero.glow
    ctx.globalAlpha = 0.85
    ctx.lineWidth = 4
    ctx.beginPath()
    ctx.arc(pos.x, pos.y, radius * 2.6 * wave, 0, Math.PI * 2)
    ctx.stroke()
    ctx.globalAlpha = 0.16
    ctx.fillStyle = hero.glow
    ctx.beginPath()
    ctx.arc(pos.x, pos.y, radius * 2.6 * wave, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalAlpha = 1
  }

  // เงาใต้เท้า ทำให้ตัวละครดูยืนอยู่บนพื้น ไม่ใช่ลอยอยู่เฉย ๆ
  ctx.fillStyle = 'rgba(0,0,0,.38)'
  ctx.beginPath()
  ctx.ellipse(pos.x, pos.y + radius * 0.82, radius * 0.9, radius * 0.34, 0, 0, Math.PI * 2)
  ctx.fill()

  if (hero.image) {
    /*
     * ท่าเดิน: ขยับขึ้นลงเร็วตอนเดิน ช้าตอนยืนนิ่ง และพลิกตามทิศที่เดิน
     * เป็นการเคลื่อนไหวที่น้อยที่สุดที่ทำให้ตัวละครดูมีชีวิต
     * โดยไม่ต้องมีภาพหลายเฟรมให้ต้องวาดเพิ่มทีละตัว
     */
    const size = radius * 3.6
    const bob = hero.moving
      ? Math.abs(Math.sin(world.time * 11)) * -4
      : Math.sin(world.time * 2.3) * 1.1

    ctx.save()
    ctx.translate(pos.x, pos.y + bob)
    if (hero.facing < 0) ctx.scale(-1, 1)
    // เอียงตัวเล็กน้อยตอนเดิน ทำให้รู้สึกว่ากำลังออกแรง
    if (hero.moving) ctx.rotate(Math.sin(world.time * 11) * 0.05)
    if (blink) ctx.globalAlpha = 0.55
    ctx.drawImage(hero.image, -size / 2, -size * 0.78, size, size)
    ctx.restore()
    ctx.globalAlpha = 1
  } else {
    // ภาพยังโหลดไม่เสร็จ วาดวงกลมไปก่อน ดีกว่าให้ตัวละครหายไปเฉย ๆ
    ctx.fillStyle = blink ? '#fca5a5' : '#38bdf8'
    ctx.beginPath()
    ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2)
    ctx.fill()
  }

  // วงแดงบางตอนเพิ่งโดนตี บอกว่ากำลังอยู่ในช่วงอมตะสั้น ๆ
  if (hurt) {
    ctx.strokeStyle = 'rgba(248,113,113,.75)'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(pos.x, pos.y, radius * 1.5, 0, Math.PI * 2)
    ctx.stroke()
  }

  /*
   * ข้อความแจ้งเหตุการณ์สำคัญ วาดท้ายสุดให้อยู่บนสุดเสมอ
   * ลอยขึ้นและจางลงพร้อมกัน ตาจึงจับได้แม้กำลังโฟกัสที่การหลบมอนอยู่
   */
  ctx.textAlign = 'center'
  world.notices.forEach((notice, index) => {
    const fade = Math.max(0, Math.min(1, notice.life / notice.maxLife))
    const rise = (1 - fade) * 26
    const y = 96 + index * 30 - rise

    ctx.font = 'bold 22px system-ui, sans-serif'
    ctx.fillStyle = `rgba(15,10,30,${fade * 0.7})`
    ctx.fillText(notice.text, ARENA_WIDTH / 2 + 2, y + 2)
    ctx.fillStyle = `rgba(253,224,71,${fade})`
    ctx.fillText(notice.text, ARENA_WIDTH / 2, y)
  })
  ctx.textAlign = 'start'
}

/* ---------- ส่วนประกอบหน้าจอ ---------- */

function Intro({ onStart, ultimate }: { onStart: () => void; ultimate: Ultimate }) {
  return (
    <div className="rounded-xl2 border border-sky-400/30 bg-night-800/60 p-6 text-center">
      <h2 className="text-2xl font-black text-white">สนามรบตัวเลข</h2>
      <p className="mt-3 text-sm leading-relaxed text-slate-200">
        มอนสเตอร์จะวิ่งเข้าหาหนูเรื่อย ๆ หน้าที่ของหนูคือ <b>เดินหลบ</b> อย่างเดียว
        การโจมตียิงเองอัตโนมัติ ไม่ต้องกดปุ่มยิง
      </p>
      <ul className="mx-auto mt-4 max-w-md space-y-1.5 text-left text-sm text-slate-300">
        <li>· ล้มมอนแล้วจะได้คริสตัลสีม่วง เดินไปเก็บเพื่อสะสม XP</li>
        <li>· XP เต็มแล้วจะเลเวลอัป เกมจะหยุดแล้วมีโจทย์ขึ้นมา</li>
        <li>· ตอบถูกได้เลือก 3 ใบ ตอบผิดได้เลือก 2 ใบ</li>
        <li>· มีอาวุธ 4 แบบ: ดาบ · เวทไฟ · เวทไฟฟ้า · เวทน้ำแข็ง</li>
        <li>· แต่ละแบบอัปได้ 5 ระดับ และถือพร้อมกันได้ 4 ชิ้น</li>
        <li>· ทุก 1 นาทีจะมี <b>บอส</b> โผล่มา ล้มได้จะมี <b>หีบสมบัติ</b> ตก</li>
        <li>· อาวุธเต็มระดับ + สกิลคู่ควบ + หีบ = <b>ร่างสมบูรณ์</b> ที่แรงขึ้นเท่าตัว</li>
        <li>· บังคับด้วยการลากนิ้วบนแป้น หรือปุ่มลูกศร / WASD</li>
      </ul>

      {/* สกิลวิเศษต่างกันตามตัวละคร จึงต้องบอกก่อนเข้าสนามว่าของตัวนี้คืออะไร */}
      <div
        className="mx-auto mt-5 flex max-w-md items-center gap-3 rounded-xl border p-3 text-left"
        style={{ borderColor: `${ultimate.color}55`, background: 'rgba(255,255,255,.04)' }}
      >
        <GameIcon name={ultimate.icon} size="h-10 w-10" />
        <div>
          <p className="text-xs text-slate-400">สกิลวิเศษประจำตัวของหนู</p>
          <p className="font-black" style={{ color: ultimate.color }}>
            {ultimate.name}
          </p>
          <p className="text-sm text-slate-300">{ultimate.description}</p>
          <p className="mt-1 text-xs text-slate-400">
            ล้มมอนให้ครบ {ultimate.cost} ตัวเพื่อชาร์จ แล้วกดปุ่มวงกลม หรือเคาะเว้นวรรค
          </p>
        </div>
      </div>
      <Button size="lg" fullWidth className="mt-6" onClick={onStart}>
        เข้าสนาม
      </Button>
    </div>
  )
}

function Hud({
  hud,
  weapons,
  chests,
  immersive,
  onToggleFullscreen,
  onEndRun,
}: {
  hud: { hp: number; maxHp: number; level: number; xp: number; xpToNext: number; time: number; kills: number }
  weapons: { id: string; level: number; name: string; color: string; evolved: boolean; ready: boolean }[]
  chests: number
  immersive: boolean
  onToggleFullscreen: () => void
  onEndRun?: () => void
}) {
  const minutes = Math.floor(hud.time / 60)
  const seconds = hud.time % 60

  return (
    <div
      className={
        immersive
          ? 'shrink-0 rounded-lg border border-white/10 bg-night-800/60 px-3 py-2'
          : 'rounded-xl2 border border-white/10 bg-night-800/60 p-3'
      }
    >
      <div className="flex flex-wrap items-center gap-3 text-sm font-bold">
        <span className="flex items-center gap-1 text-rose-300">
          <GameIcon name="heart" size="h-4 w-4" />
          {hud.hp} / {hud.maxHp}
        </span>
        <span className="flex items-center gap-1 text-violet-300">
          <GameIcon name="exp" size="h-4 w-4" />
          เลเวล {hud.level}
        </span>
        <span className="flex items-center gap-1 text-slate-300">
          <GameIcon name="sword" size="h-4 w-4" />
          {hud.kills}
        </span>
        <span className="ml-auto tabular-nums text-gold-300">
          {minutes}:{String(seconds).padStart(2, '0')}
        </span>
        <button
          type="button"
          onClick={onToggleFullscreen}
          aria-label={immersive ? 'ออกจากเต็มจอ' : 'เล่นเต็มจอ'}
          className="rounded-lg border border-white/20 bg-white/5 px-2.5 py-1 text-xs font-bold text-slate-200"
        >
          {immersive ? 'ย่อจอ' : 'เต็มจอ'}
        </button>
        {/*
          ปุ่มจบรอบ จำเป็นเพราะบิลด์ที่สมบูรณ์แล้วแทบไม่ตาย
          จำลองแล้วมีรอบที่เล่นถึงสิบห้านาทีก็ยังไม่ตาย
          และเหรียญจ่ายตอนจบรอบเท่านั้น เด็กที่เก่งที่สุดจึงไม่ได้รางวัลสักที
        */}
        {onEndRun && (
          <button
            type="button"
            onClick={onEndRun}
            className="rounded-lg border border-rose-400/40 bg-rose-500/10 px-2.5 py-1 text-xs font-bold text-rose-200"
          >
            จบรอบ
          </button>
        )}
      </div>

      {/* อาวุธที่ถืออยู่ พร้อมระดับของแต่ละชิ้น */}
      {weapons.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {weapons.map(({ id, level, name, color, evolved, ready }) => (
            <span
              key={id}
              className={`rounded border px-1.5 py-0.5 text-[11px] font-bold ${
                evolved ? 'ring-1 ring-gold-300' : ''
              }`}
              style={{
                borderColor: evolved ? '#fcd34d' : `${color}66`,
                color: evolved ? '#fcd34d' : color,
              }}
            >
              {name} {evolved ? '★' : level}
              {/* บอกทันทีว่าอาวุธนี้รอแค่หีบแล้ว เด็กจะได้รู้ว่าต้องไปล้มบอส */}
              {ready && <span className="ml-1 text-gold-200">พร้อม!</span>}
            </span>
          ))}
          {chests > 0 && (
            <span className="rounded border border-gold-400/60 bg-gold-500/15 px-1.5 py-0.5 text-[11px] font-bold text-gold-200">
              หีบเก็บไว้ {chests}
            </span>
          )}
        </div>
      )}

      {/* แถบเลือดกับแถบ XP */}
      <div className="mt-2 space-y-1">
        <div className="h-2 overflow-hidden rounded-full bg-night-900">
          <div
            className="h-full rounded-full bg-gradient-to-r from-rose-500 to-rose-400 transition-all"
            style={{ width: `${Math.max(0, (hud.hp / hud.maxHp) * 100)}%` }}
          />
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-night-900">
          <div
            className="h-full rounded-full bg-gradient-to-r from-violet-500 to-violet-300"
            style={{ width: `${Math.min(100, (hud.xp / hud.xpToNext) * 100)}%` }}
          />
        </div>
      </div>
    </div>
  )
}

function Overlay({ children }: { children: ReactNode }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center rounded-xl2 bg-night-900/85 p-4">
      <div className="w-full max-w-lg">{children}</div>
    </div>
  )
}

function QuestionCard({
  question,
  onAnswer,
}: {
  question: Question
  onAnswer: (text: string) => void
}) {
  return (
    <div className="rounded-xl2 border border-gold-400/40 bg-night-800 p-5">
      <p className="text-center text-xs font-bold text-gold-300">เลเวลอัป! ตอบโจทย์เพื่อรับสกิล</p>
      <p className="mt-3 text-center text-2xl font-black text-white">{question.prompt}</p>

      <div className="mt-4 grid grid-cols-2 gap-2.5">
        {question.choices.map((choice) => (
          <button
            key={choice.id}
            type="button"
            onClick={() => onAnswer(choice.text)}
            className="rounded-xl border border-white/15 bg-white/5 px-4 py-4 text-lg font-bold text-white"
          >
            {choice.text}
          </button>
        ))}
      </div>

      <p className="mt-3 text-center text-xs text-slate-400">
        ตอบถูกได้เลือกสกิล 3 ใบ · ตอบผิดได้ 2 ใบ
      </p>
    </div>
  )
}

function SkillCards({
  world,
  onChoose,
}: {
  world: WorldState
  onChoose: (id: string) => void
}) {
  const offer = offerSkills(world, offerCount(world.lastAnswerCorrect))

  // เก็บครบทุกอย่างแล้ว ต้องมีทางไปต่อ ไม่ใช่ค้างอยู่ตรงนี้ตลอดไป
  if (offer.length === 0) {
    return (
      <div className="rounded-xl2 border border-white/15 bg-night-800 p-5 text-center">
        <p className="text-white">เก่งมาก! หนูเก็บอาวุธและสกิลครบทุกอย่างแล้ว</p>
        <Button fullWidth className="mt-4" onClick={() => onChoose('')}>
          ลุยต่อ
        </Button>
      </div>
    )
  }

  return (
    <div>
      <p className="text-center text-sm font-bold text-white">
        {world.lastAnswerCorrect ? 'ตอบถูก! เลือก 1 อย่าง' : 'ตอบผิด แต่ยังได้เลือกนะ'}
      </p>
      <div className="mt-3 grid gap-2.5">
        {offer.map((entry) => (
          <button
            key={entry.id}
            type="button"
            onClick={() => onChoose(entry.id)}
            className="flex items-center gap-3 rounded-xl border p-3 text-left"
            style={{ borderColor: `${entry.color}66`, background: 'rgba(15,10,30,.9)' }}
          >
            <GameIcon name={entry.icon} size="h-8 w-8" />
            <div className="min-w-0 flex-1">
              <p className="font-bold" style={{ color: entry.color }}>
                {entry.name}
                {entry.isNew && (
                  <span className="ml-2 rounded bg-gold-500/25 px-1.5 py-0.5 text-[11px] text-gold-200">
                    อาวุธใหม่
                  </span>
                )}
              </p>
              <p className="text-sm text-slate-300">{entry.description}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

function DeadCard({
  summary,
  onRestart,
}: {
  summary: ReturnType<typeof summarize>
  onRestart: () => void
}) {
  const minutes = Math.floor(summary.survivedSeconds / 60)
  const seconds = summary.survivedSeconds % 60

  return (
    <div className="rounded-xl2 border border-white/15 bg-night-800 p-6 text-center">
      <h2 className="text-2xl font-black text-white">
        รอดได้ {minutes}:{String(seconds).padStart(2, '0')}
      </h2>
      <p className="mt-2 text-sm text-slate-300">
        {summary.evolvedNames.length > 0
          ? 'สุดยอด! ทำอาวุธให้สมบูรณ์ได้ด้วย'
          : 'ลองอัปอาวุธชิ้นเดียวให้เต็ม แล้วเก็บสกิลคู่ควบดูนะ'}
      </p>

      {summary.evolvedNames.length > 0 && (
        <div className="mt-3 flex flex-wrap justify-center gap-1.5">
          {summary.evolvedNames.map((name) => (
            <span
              key={name}
              className="rounded-full border border-gold-400/60 bg-gold-500/15 px-2.5 py-1 text-xs font-bold text-gold-200"
            >
              ★ {name}
            </span>
          ))}
        </div>
      )}

      <dl className="mt-4 grid grid-cols-4 gap-2 text-sm">
        <div className="rounded-lg border border-white/10 bg-white/5 py-2">
          <dt className="text-[11px] text-slate-400">เลเวล</dt>
          <dd className="text-lg font-black text-white">{summary.level}</dd>
        </div>
        <div className="rounded-lg border border-white/10 bg-white/5 py-2">
          <dt className="text-[11px] text-slate-400">ล้มมอน</dt>
          <dd className="text-lg font-black text-white">{summary.kills}</dd>
        </div>
        <div className="rounded-lg border border-white/10 bg-white/5 py-2">
          <dt className="text-[11px] text-slate-400">ล้มบอส</dt>
          <dd className="text-lg font-black text-rose-300">{summary.bossesDown}</dd>
        </div>
        <div className="rounded-lg border border-white/10 bg-white/5 py-2">
          <dt className="text-[11px] text-slate-400">เหรียญ</dt>
          <dd className="text-lg font-black text-gold-300">{summary.coins}</dd>
        </div>
      </dl>

      <Button size="lg" fullWidth className="mt-5" onClick={onRestart}>
        ลุยใหม่อีกรอบ
      </Button>
    </div>
  )
}


/**
 * ปุ่มสกิลวิเศษ
 *
 * แสดงทั้งแถบความคืบหน้าและจำนวนที่เหลือ
 * แถบอย่างเดียวบอกได้แค่ "ใกล้แล้ว" แต่ตัวเลขบอกได้ว่า "อีกกี่ตัว"
 * ซึ่งเปลี่ยนจากการรอเฉย ๆ เป็นเป้าหมายที่ไล่ล่าได้
 */
function UltimateButton({
  ultimate,
  progress,
  ready,
  compact,
  onUse,
}: {
  ultimate: Ultimate
  progress: number
  ready: boolean
  compact: boolean
  onUse: () => void
}) {
  const size = compact ? 'h-20 w-20' : 'h-28 w-28'

  return (
    <div className="flex flex-col items-center gap-1">
      <button
        type="button"
        onClick={onUse}
        disabled={!ready}
        aria-label={`ใช้สกิล ${ultimate.name}`}
        className={`relative ${size} rounded-full border-4 transition ${
          ready
            ? 'animate-pulse border-gold-300 bg-gold-500/25'
            : 'border-white/15 bg-night-800/70'
        }`}
        style={ready ? { borderColor: ultimate.color } : undefined}
      >
        {/* แถบความคืบหน้าเป็นวงแหวนรอบปุ่ม เห็นได้โดยไม่ต้องละสายตาจากสนาม */}
        <span
          className="absolute inset-1 rounded-full"
          style={{
            background: `conic-gradient(${ultimate.color} ${progress * 360}deg, rgba(255,255,255,.08) 0deg)`,
          }}
        />
        <span className="absolute inset-2.5 flex items-center justify-center rounded-full bg-night-900">
          <GameIcon name={ultimate.icon} size={compact ? 'h-7 w-7' : 'h-9 w-9'} />
        </span>
      </button>

      <span
        className="text-[11px] font-bold"
        style={{ color: ready ? ultimate.color : '#94a3b8' }}
      >
        {ready ? `${ultimate.name}!` : `${Math.round(progress * 100)}%`}
      </span>
    </div>
  )
}

/**
 * แป้นบังคับสำหรับจอสัมผัส
 *
 * ลากนิ้วจากกลางแป้น ทิศทางคือทิศที่ลากไป ระยะคือความเร็ว
 * ปล่อยนิ้วแล้วหยุดทันที
 *
 * เขียนลงใน ref ตรง ๆ ไม่ผ่าน state
 * เพราะนิ้วขยับถี่มาก ถ้า setState ทุกครั้งจะเรนเดอร์ใหม่ทั้งหน้าจนกระตุก
 */
function Joystick({
  inputRef,
  compact = false,
}: {
  inputRef: MutableRefObject<Input>
  compact?: boolean
}) {
  const padRef = useRef<HTMLDivElement>(null)
  const [knob, setKnob] = useState({ x: 0, y: 0 })

  const update = useCallback(
    (clientX: number, clientY: number) => {
      const pad = padRef.current
      if (!pad) return
      const box = pad.getBoundingClientRect()
      const cx = box.left + box.width / 2
      const cy = box.top + box.height / 2

      const dx = clientX - cx
      const dy = clientY - cy
      const max = box.width / 2
      const dist = Math.hypot(dx, dy)
      const scale = dist > max ? max / dist : 1

      const nx = (dx * scale) / max
      const ny = (dy * scale) / max

      inputRef.current = { move: { x: nx, y: ny } }
      setKnob({ x: nx * max * 0.6, y: ny * max * 0.6 })
    },
    [inputRef],
  )

  const release = useCallback(() => {
    inputRef.current = { move: { x: 0, y: 0 } }
    setKnob({ x: 0, y: 0 })
  }, [inputRef])

  return (
    <div className="flex justify-center">
      <div
        ref={padRef}
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId)
          update(event.clientX, event.clientY)
        }}
        onPointerMove={(event) => {
          if (event.buttons === 0 && event.pointerType === 'mouse') return
          update(event.clientX, event.clientY)
        }}
        onPointerUp={release}
        onPointerCancel={release}
        className={`relative touch-none rounded-full border-2 border-white/15 bg-night-800/70 ${
          compact ? 'h-24 w-24' : 'h-36 w-36'
        }`}
      >
        <div
          className={`absolute left-1/2 top-1/2 rounded-full border-2 border-sky-400/60 bg-sky-500/30 ${
            compact ? 'h-10 w-10' : 'h-14 w-14'
          }`}
          style={{ transform: `translate(calc(-50% + ${knob.x}px), calc(-50% + ${knob.y}px))` }}
        />
      </div>
    </div>
  )
}
