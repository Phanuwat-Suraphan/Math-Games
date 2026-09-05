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
import { allPerkLevels, buyPerk, perkBlockedReason, perkLevel } from '../services/perkService'
import { recordSurvivorRun } from '../services/recordService'
import { useMusic } from '../hooks/useMusic'
import { PERKS, perkCost } from '../data/perks'
import { biomeBlurb, getBiome, type Biome } from '../survivor/biomes'
import { quizPlanFor } from '../survivor/quiz'
import { survivorIndicator } from '../teacher/indicators'
import { useIndicatorLog } from '../hooks/useIndicatorLog'
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
import { HERO_VIEWBOX, WALK_FRAMES, heroArt, walkPose } from '../art/heroes'
import { MONSTER_ART_IDS, MONSTER_VIEWBOX, monsterArt } from '../art/monsters'
import { ARENA_HEIGHT, ARENA_WIDTH } from '../survivor/types'
import { draw } from '../survivor/render'
import type { HeroView } from '../survivor/render'
import type { Input, WorldState } from '../survivor/types'
import type { Question } from '../questionEngine/types'
import type { Player } from '../types/player'

/** ท่าทางของตัวละครที่หน้าจอต้องรู้เพื่อวาด */
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

/**
 * ภาพท่าเดินของตัวละคร เตรียมไว้หลายท่าแล้วสลับกันตอนวาด
 *
 * ทำไมต้องเตรียมหลายภาพ แทนที่จะให้ภาพเดียวขยับเอง
 *
 * ภาพตัวละครมีอนิเมชัน SMIL อยู่ในตัวอยู่แล้ว และมันขยับจริงในหน้าเลือกตัวละคร
 * แต่ไม่ขยับเลยเมื่อวาดลง canvas ซึ่งทดลองยืนยันแล้วด้วยการวาดภาพเดียวกัน
 * สองครั้งห่างกันครึ่งวินาทีแล้วเทียบพิกเซล ได้ผลว่าเหมือนกันทุกจุด
 *
 * ผลคือตอนใส่ขาให้ตัวละครรอบแรก ขามีให้เห็นแต่แข็งค้างอยู่ท่าเดียว
 * ตัวละครจึงไถลไปกับพื้นแทนที่จะเดิน ซึ่งดูแย่กว่าตอนยังไม่มีขาด้วยซ้ำ
 * เพราะสายตาคาดหวังให้ขาขยับทันทีที่เห็นว่ามีขา
 *
 * เตรียมภาพครั้งเดียวตอนเปลี่ยนตัวละคร ไม่ใช่ทุกเฟรม
 */
function useHeroFrames(avatarId: string): MutableRefObject<HTMLImageElement[]> {
  const ref = useRef<HTMLImageElement[]>([])

  useEffect(() => {
    const frames: HTMLImageElement[] = []
    for (let frame = 0; frame < WALK_FRAMES; frame += 1) {
      const image = svgToImage(heroArt(avatarId, walkPose(frame)), HERO_VIEWBOX, 128)
      image.onload = () => {
        frames[frame] = image
        ref.current = frames.filter(Boolean)
      }
    }

    return () => {
      ref.current = []
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
  const { logIndicator } = useIndicatorLog(player.name)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const worldRef = useRef<WorldState>(
    createWorld(`${Date.now()}`, player.avatar, allPerkLevels(player)),
  )
  const heroFramesRef = useHeroFrames(player.avatar)
  const monsterImagesRef = useMonsterImages()
  const heroViewRef = useRef<HeroView>({
    frames: [],
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
  /*
   * สนามของรอบนี้ ไม่ได้อยู่ใน hud เพราะ hud ถูกตั้งใหม่หกสิบครั้งต่อวินาที
   * ส่วนสนามเปลี่ยนแค่ตอนเริ่มรอบใหม่เท่านั้น
   */
  const [arena, setArena] = useState(() => getBiome(worldRef.current.biome))
  const [question, setQuestion] = useState<Question | null>(null)
  const [summary, setSummary] = useState<ReturnType<typeof summarize> | null>(null)
  const [immersive, setImmersive] = useState(false)
  const [weaponBar, setWeaponBar] = useState<
    { id: string; level: number; name: string; color: string; evolved: boolean; ready: boolean }[]
  >([])
  const [chests, setChests] = useState(0)
  const [ultBar, setUltBar] = useState({ progress: 0, ready: false })
  /*
   * มีบอสอยู่บนสนามไหม ใช้เปลี่ยนเพลงอย่างเดียว ไม่ได้ใช้วาดอะไร
   *
   * เก็บเป็น state ทั้งที่ข้อมูลอยู่ในเวิลด์อยู่แล้ว เพราะเพลงเป็นเรื่องของ React
   * แต่เวิลด์อยู่ใน ref ที่ React ไม่รู้ว่าเปลี่ยน จึงต้องมีสะพานให้หนึ่งเส้น
   */
  const [bossActive, setBossActive] = useState(false)
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
    const plan = quizPlanFor(level)

    setQuestion(
      generateQuestion({
        type: plan.skill,
        grade: plan.grade,
        difficulty: plan.difficulty,
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
      view.frames = heroFramesRef.current
      view.monsters = monsterImagesRef.current
      view.moving = Math.hypot(move.x, move.y) > 0.06
      if (move.x > 0.06) view.facing = 1
      else if (move.x < -0.06) view.facing = -1
      view.glow = after.ultimate.activeFor > 0 ? ultimate.color : null

      /*
       * เล่นเสียงที่เครื่องยนต์สั่งไว้ในเฟรมนี้
       *
       * เครื่องยนต์เล่นเสียงเองไม่ได้ เพราะต้องเป็นฟังก์ชันบริสุทธิ์
       * ที่รันในชุดทดสอบโดยไม่มีเบราว์เซอร์ได้ จึงบอกเป็นชื่อไว้ให้ตรงนี้มาอ่าน
       *
       * ตัวกันเสียงถี่เกินอยู่ใน audioService แล้ว ตรงนี้จึงส่งไปตรง ๆ ได้
       * ไม่ต้องกรองซ้ำ ซึ่งถ้ากรองสองที่จะเดาไม่ออกว่าเสียงหายเพราะตัวไหน
       */
      for (const cue of after.sounds) playSfx(cue)

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
      setBossActive(after.enemies.some((enemy) => enemy.boss))

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
        // เสียงจบรอบของตัวเอง เดิมใช้เสียง "ตอบผิด" ซึ่งสื่อผิดเรื่อง
        // รอดมาได้ห้านาทีแล้วตายไม่ใช่การตอบผิด และไม่ควรฟังเหมือนกัน
        playSfx('gameOver')
        setSummary(summarize(after))
        setPhase('dead')
        return
      }

      frame = requestAnimationFrame(loop)
    }

    frame = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(frame)
  }, [askQuestion, heroFramesRef, monsterImagesRef, phase, ultimate.color])

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

    /*
     * บันทึกสถิติพร้อมกับจ่ายเหรียญในจังหวะเดียวกัน
     *
     * ทำที่เดียวกันโดยตั้งใจ เพราะสองอย่างนี้ต้องเกิดหรือไม่เกิดพร้อมกันเสมอ
     * ถ้าแยกเป็นสอง effect จะมีทางที่รอบหนึ่งได้เหรียญแต่ไม่ถูกนับสถิติ
     * ซึ่งเด็กจะเห็นว่า "เล่นแล้วแต่จำนวนรอบไม่ขึ้น" โดยไม่มีอะไรอธิบายได้
     */
    const gained = applyBonusPercent(summary.coins, totalStats(player).coinBonusPercent)
    patchPlayer({
      coins: player.coins + Math.max(0, gained),
      records: recordSurvivorRun(player, {
        survivedSeconds: summary.survivedSeconds,
        kills: summary.kills,
        bossesDown: summary.bossesDown,
        evolvedIds: summary.evolvedIds,
        ultimatesUsed: summary.ultimatesUsed,
      }),
    })
  }, [patchPlayer, phase, player, summary])

  /*
   * เพลงของหน้านี้
   *
   * ระหว่างเล่นใช้เพลงสนามรบ และสลับเป็นเพลงบอสทันทีที่บอสโผล่
   * ตั้งใจให้เด็กได้ยินก่อนจะทันเห็นตัว เพราะบอสเดินเข้ามาจากขอบจอ
   * เสียงที่เปลี่ยนคือคำเตือนที่มาถึงก่อนภาพเสมอ
   */
  useMusic(phase === 'playing' ? (bossActive ? 'boss' : 'arena') : 'menu')

  const start = useCallback(() => {
    paidRef.current = false
    worldRef.current = createWorld(`${Date.now()}`, player.avatar, allPerkLevels(player))
    setArena(getBiome(worldRef.current.biome))
    inputRef.current = { move: { x: 0, y: 0 } }
    setSummary(null)
    setQuestion(null)
    setWeaponBar([])
    setChests(0)
    setUltBar({ progress: 0, ready: false })
    setBossActive(false)
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
      const plan = quizPlanFor(level)

      answerQuestion({
        questionId: `survivor-${worldRef.current.seed}-${level}`,
        stageId: 'survivor-arena',
        skill: plan.skill,
        isCorrect: correct,
        timeMs: 0,
        isReplay: true,
      })

      /*
       * ส่งเข้าสมุดของครูด้วย
       *
       * โหมดนี้เป็นโหมดที่เด็กตอบโจทย์มากที่สุดในทั้งแอป รอบหนึ่งเลเวลอัปสิบกว่าครั้ง
       * แต่เดิมไม่เคยส่งอะไรเข้าแผงคุณครูเลยสักข้อ
       * ครูที่ห้องเล่นแต่โหมดนี้จึงเห็นตารางว่าง ทั้งที่เด็กตอบไปเป็นร้อยข้อ
       *
       * บันทึกทุกครั้งที่ตอบ ไม่ใช่เฉพาะตอนตอบถูก
       * เพราะข้อที่ตอบผิดคือข้อมูลที่ครูต้องการที่สุด
       *
       * ส่งรูปทรงกับจำนวนขั้นตอนไปด้วย เพื่อให้ปลายทางตัดสินได้ว่า
       * ข้อนี้ตรงกับถ้อยคำของตัวชี้วัดจริงไหม ไม่ใช่ตัดสินจากชนิดทักษะอย่างเดียว
       */
      const indicator = survivorIndicator({
        skill: plan.skill,
        grade: plan.grade,
        shape: question.metadata.geometryShape,
        steps: question.metadata.steps,
      })
      if (indicator) logIndicator(indicator, correct)
      playSfx(correct ? 'correct' : 'wrong')

      worldRef.current = resolveQuestion(worldRef.current, correct)
      setPhase('choosing')
    },
    [answerQuestion, logIndicator, question],
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
    // เสียงเลเวลอัป ไม่ใช่เสียงเหรียญ เพราะสิ่งที่เพิ่งเกิดคือการขึ้นเลเวล
    // และภาพที่กำลังจะเห็นตอนกลับลงสนามคือดาวฉลองเลเวลอัปพอดี
    playSfx('levelUp')
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
            {phase === 'idle' && (
              <>
                <Intro onStart={start} ultimate={ultimate} />
                <PerkShop player={player} />
              </>
            )}
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
              arena={arena}
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

/* ---------- ส่วนประกอบหน้าจอ ---------- */

function Intro({ onStart, ultimate }: { onStart: () => void; ultimate: Ultimate }) {
  return (
    <div className="rounded-xl2 border border-sky-400/30 bg-night-800/60 p-6 text-center">
      <h2 className="title-hero text-2xl font-black">สนามรบตัวเลข</h2>
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


/**
 * ร้านพลังถาวร วางไว้ใต้คำแนะนำของหน้าเริ่ม
 *
 * ทำไมวางตรงนี้ ไม่ใช่ในหน้าร้านค้ารวม
 * เพราะพลังพวกนี้มีผลเฉพาะในสนามรบ การเห็นมันตอนกำลังจะเข้าสนาม
 * ทำให้เด็กเชื่อมโยงได้ทันทีว่า "ซื้อแล้วรอบหน้าจะดีขึ้นยังไง"
 * ถ้าไปอยู่ในร้านรวมกับเสื้อเกราะ เด็กจะไม่รู้ว่ามันเกี่ยวกับโหมดไหน
 *
 * และที่สำคัญกว่านั้น มันคือหน้าจอที่เด็กเห็นทันทีหลังตาย
 * ซึ่งเป็นจังหวะที่ต้องบอกให้ได้ว่า "รอบที่เพิ่งเสียไปไม่ได้สูญเปล่า"
 */
function PerkShop({ player }: { player: Player }) {
  const { patchPlayer } = useGame()
  const [notice, setNotice] = useState<string | null>(null)

  const buy = (perkId: string) => {
    const next = buyPerk(player, perkId)
    if (!next) {
      playSfx('wrong')
      setNotice(perkBlockedReason(player, perkId) ?? 'ซื้อไม่ได้')
      return
    }
    playSfx('levelUp')
    patchPlayer(next)
    setNotice(null)
  }

  return (
    <div className="panel panel-corners mt-5 p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="title-gold text-lg font-black">พลังถาวร</h3>
        <p className="text-xs text-slate-400">
          ซื้อครั้งเดียว ติดตัวทุกรอบ · มี {player.coins.toLocaleString('th-TH')} เหรียญ
        </p>
      </div>
      <p className="mt-1 text-xs leading-relaxed text-slate-400">
        เหรียญที่ได้จากทุกรอบเอามาใช้ตรงนี้ได้ แม้แต่รอบที่แพ้ก็ยังได้เหรียญกลับไป
      </p>

      {notice ? (
        <p className="mt-2 rounded-lg border border-gold-400/40 bg-gold-500/10 px-3 py-1.5 text-xs font-bold text-gold-200">
          {notice}
        </p>
      ) : null}

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {PERKS.map((perk) => {
          const level = perkLevel(player, perk.id)
          const cost = perkCost(perk.id, level)
          const blocked = perkBlockedReason(player, perk.id)
          const maxed = level >= perk.maxLevel

          return (
            <div
              key={perk.id}
              className={`flex gap-3 rounded-xl border p-3 ${
                maxed ? 'border-gold-400/45 bg-gold-500/10' : 'border-white/10 bg-white/5'
              }`}
            >
              <GameIcon name={perk.icon} size="h-8 w-8" />

              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="truncate font-bold text-white">{perk.name}</p>
                  <span className="shrink-0 text-xs font-bold text-gold-300">
                    {level}/{perk.maxLevel}
                  </span>
                </div>
                <p className="text-xs leading-relaxed text-slate-300">{perk.description}</p>
                <p className="mt-0.5 text-xs font-bold text-emerald-300">
                  ชั้นละ {perk.perLevel}
                </p>

                <div className="mt-2 flex justify-end">
                  {maxed ? (
                    <span className="text-xs font-bold text-gold-300">เต็มแล้ว</span>
                  ) : (
                    <Button
                      size="md"
                      variant={blocked ? 'ghost' : 'secondary'}
                      onClick={() => buy(perk.id)}
                    >
                      {blocked && !blocked.startsWith('ยังขาด')
                        ? blocked
                        : `ซื้อ ${cost} เหรียญ`}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function Hud({
  hud,
  arena,
  weapons,
  chests,
  immersive,
  onToggleFullscreen,
  onEndRun,
}: {
  hud: { hp: number; maxHp: number; level: number; xp: number; xpToNext: number; time: number; kills: number }
  arena: Biome
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

      {/*
        สนามของรอบนี้ กับกติกาที่มันแก้จริง ๆ

        ข้อความสร้างจากตัวคูณโดยตรง (ดู biomeBlurb) ไม่ได้พิมพ์มือ
        จึงเป็นไปไม่ได้ที่บรรทัดนี้จะบอกเด็กในสิ่งที่เกมไม่ได้ทำ

        แสดงตลอดรอบ ไม่ใช่แค่ตอนเริ่ม เพราะมันคือข้อมูลที่ใช้ตัดสินใจได้จริง
        เช่น รู้ว่ามอนเลือดหนาขึ้น 35% ก็จะเลือกการ์ดพลังโจมตีแทนการ์ดยิงไว
      */}
      <div className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-[11px]">
        <span className="font-bold text-leaf-200">{arena.name}</span>
        <span className="text-slate-400">{biomeBlurb(arena.rules)}</span>
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
