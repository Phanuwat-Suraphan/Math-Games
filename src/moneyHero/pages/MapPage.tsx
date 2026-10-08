import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as RPointerEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { List } from 'lucide-react'
import type { NpcId, Question } from '../engine/types'
import { useGame, useMusic } from '../hooks/useMoneyGame'
import { LEVELS, TOTAL_LESSONS, type LevelDef } from '../data/levels'
import { CHARACTERS } from '../data/characters'
import {
  BRIDGE,
  RIVER,
  ECO_GARDEN,
  ECO_MARKET,
  ECO_SPOT,
  TOWN_COINS,
  TOWN_NPCS,
  dailyTrash,
  routeToLane,
  TREES,
  WORLD,
  dist,
  doorOf,
  routeTo,
  walkable,
  type Pt,
  type TownCoin,
} from '../data/town'
import { StageChips } from '../components/StageChips'
import { readyChests } from '../engine/starRoad'
import { canTakePostTest, isLevelPassed, isLevelUnlocked, lessonsPassed, levelRecord, nextLevelId, pendingMistakes } from '../engine/progress'
import { AvatarArt, CharacterArt, PetSvg } from '../components/Art'
import { TopBar } from '../components/TopBar'
import { Stars } from '../components/Stars'
import { TownTerrain, TreeSprite } from '../components/TownArt'
import { BuildingArt } from '../components/BuildingArt'
import { dayKey, doneToday, liveStreak } from '../engine/daily'
import { BAG_MAX, ecoStage, pickTrash } from '../engine/eco'
import { TrashArt } from '../kad/KadArt'
import { TreeStage } from '../kad/KadSheets'
import { trashName } from '../engine/eco'
import { earn } from '../engine/ledger'
import { NPC_QUESTS, QUEST_REWARD, isQuestNpc, makeQuest, questAvailable, recordQuest, type QuestNpc } from '../engine/npcQuest'
import { StepRunner } from '../components/StepRunner'
import { Confetti } from '../components/Effects'
import { playSound } from '../utils/sound'
import { speak } from '../utils/speech'

/**
 * แผนที่ "เมืองเงินทอง" แบบเกม 2 มิติมองจากด้านบน
 *
 * เดินได้ทุกทิศ: ลูกศร / WASD บนคีย์บอร์ด หรือจอยสติกบนจอสัมผัส
 * แตะอาคารแล้วฮีโร่เดินตามถนนไปเอง · เก็บเหรียญริมถนน · คุยกับเพื่อน ๆ · เข้าประตูเพื่อเล่นด่าน
 *
 * ตำแหน่งฮีโร่อัปเดตทุกเฟรมผ่าน ref โดยตรง ไม่ผ่าน state ของ React จึงลื่นแม้บนแท็บเล็ต
 */

const SPEED = 240
/** จำนวนก้อนฝุ่นที่หมุนเวียนใช้ตอนเดิน */
const PUFFS = 6
const NEAR_DOOR = 70
const NEAR_NPC = 70

/** ด่านที่เล่นได้แล้วในเวอร์ชันนี้ ด่านที่เหลือเปิดในส่วนถัดไป */
export const PLAYABLE_MAX = 12

const TIPS: Record<'rabbit' | 'fox' | 'bear' | 'owl', string[]> = {
  rabbit: ['100 สตางค์ = 1 บาท นะ!', 'นับเงินจากค่ามากไปน้อย จะนับง่ายขึ้น', 'เก็บเหรียญริมถนนได้ด้วยนะ!'],
  fox: ['เทียบบาทก่อน ถ้าบาทเท่ากันค่อยดูสตางค์', 'อ่านโจทย์ให้ดี ถามอะไร บอกอะไร'],
  bear: ['ซื้อของแล้วอย่าลืมคิดเงินทอนนะ', 'สตางค์เกิน 100 ต้องทดเป็น 1 บาท'],
  owl: ['คงเหลือ = เดิม + รายรับ − รายจ่าย', 'จดบัญชีทุกวัน จะรู้ว่าเงินไปไหน'],
}

/** ผีเสื้อบินวนในเมือง */
const BUTTERFLIES = [
  { x: 520, y: 1080, c: '#ff9fc4' },
  { x: 1180, y: 1420, c: '#ffd23f' },
  { x: 900, y: 760, c: '#9fd8ff' },
  { x: 1640, y: 470, c: '#ffb066' },
  { x: 1960, y: 1050, c: '#c9a6ff' },
]

function stepLabel(stepDone: number): string {
  return ['ยังไม่เริ่ม', 'เรียนแล้ว', 'ฝึกแล้ว', 'ภารกิจเสร็จ', 'ผ่านแล้ว'][Math.min(4, stepDone)]
}

function startPoint(mapX?: number, mapY?: number, next = 0): Pt {
  if (mapX !== undefined && mapY !== undefined && walkable({ x: mapX, y: mapY })) return { x: mapX, y: mapY }
  const d = doorOf(next)
  // ยืนบนถนนข้างประตูด่านที่ควรเล่นต่อ
  const p = { x: d.x + 90, y: d.y }
  return walkable(p) ? p : d
}

export function MapPage() {
  const { player, updatePlayer } = useGame()
  const navigate = useNavigate()
  useMusic()
  const viewRef = useRef<HTMLDivElement>(null)
  const worldRef = useRef<HTMLDivElement>(null)
  const heroRef = useRef<HTMLDivElement>(null)
  const puffRefs = useRef<(HTMLSpanElement | null)[]>([])
  const petRef = useRef<HTMLDivElement>(null)
  const knobRef = useRef<HTMLDivElement>(null)

  const start = useMemo(
    () => startPoint(player?.mapX, player?.mapY, player ? nextLevelId(player) : 0),
    // ตำแหน่งเริ่มคิดครั้งเดียวตอนเปิดหน้า
    [],
  )

  const sim = useRef({
    x: start.x,
    y: start.y,
    dir: 1,
    keys: { up: false, down: false, left: false, right: false },
    joy: { x: 0, y: 0 },
    route: null as Pt[] | null,
    walking: false,
    petX: start.x - 40,
    petY: start.y + 6,
  })
  const collectedRef = useRef(new Set(player?.mapCoins ?? []))
  const [collected, setCollected] = useState(() => new Set(player?.mapCoins ?? []))
  const [nearLevel, setNearLevel] = useState<number | null>(null)
  const [nearNpc, setNearNpc] = useState<NpcId | null>(null)
  const [nearEco, setNearEco] = useState<'market' | 'garden' | null>(null)
  // ขยะรายวันบนถนน (จุดที่เก็บแล้ววันนี้ไม่แสดง)
  const today = useMemo(() => dayKey(), [])
  const trash = useMemo(() => dailyTrash(today), [today])
  const pickedRef = useRef(new Set(player && player.eco.pickDay === today ? player.eco.picked : []))
  const [picked, setPicked] = useState(() => new Set(pickedRef.current))
  const bagFull = useRef(false)
  const ecoRef = useRef(player?.eco)
  ecoRef.current = player?.eco
  const [talk, setTalk] = useState<{ npc: NpcId; text: string; quest?: boolean } | null>(null)
  const [quest, setQuest] = useState<{ npc: QuestNpc; q: Question } | null>(null)
  const [questDone, setQuestDone] = useState<{ npc: QuestNpc; ok: boolean } | null>(null)
  const modalOpen = useRef(false)
  modalOpen.current = quest !== null || questDone !== null
  const [showList, setShowList] = useState(false)
  const [pop, setPop] = useState<{ x: number; y: number; key: number } | null>(null)
  const tipIndex = useRef<Record<string, number>>({})
  const nearRef = useRef<{ level: number | null; npc: NpcId | null; eco: 'market' | 'garden' | null }>({ level: null, npc: null, eco: null })

  const savePosition = useCallback(() => {
    const x = Math.round(sim.current.x)
    const y = Math.round(sim.current.y)
    updatePlayer((p) => (p.mapX === x && p.mapY === y ? p : { ...p, mapX: x, mapY: y }))
  }, [updatePlayer])

  const collect = useCallback(
    (coin: TownCoin) => {
      if (collectedRef.current.has(coin.id)) return
      collectedRef.current.add(coin.id)
      setCollected(new Set(collectedRef.current))
      setPop({ x: coin.x, y: coin.y, key: Date.now() })
      playSound('coin')
      updatePlayer((p) => (p.mapCoins.includes(coin.id) ? p : { ...earn(p, 1, 'เก็บเหรียญในเมือง', '🪙'), mapCoins: [...p.mapCoins, coin.id] }))
    },
    [updatePlayer],
  )

  const pickUp = useCallback(
    (t: (typeof trash)[number]) => {
      if (pickedRef.current.has(t.id) || bagFull.current) return
      const r = ecoRef.current ? pickTrash(ecoRef.current, t.id, t.kind, today) : null
      if (!r) return
      if (r.full) {
        bagFull.current = true
        setTalk({ npc: 'rabbit', text: `🧺 ถุงขยะเต็มแล้ว (${BAG_MAX} ชิ้น) ไปขายที่แผงกาดรักษ์โลกก่อนนะ` })
        return
      }
      pickedRef.current.add(t.id)
      setPicked(new Set(pickedRef.current))
      setPop({ x: t.x, y: t.y, key: Date.now() })
      playSound('jump')
      updatePlayer((p) => ({ ...p, eco: pickTrash(p.eco, t.id, t.kind, today).rec }))
    },
    [today, updatePlayer],
  )

  /** แตะแผงกาด/สวน: เดินไปตามถนนรักษ์โลก */
  const walkToEco = useCallback((at: Pt) => {
    const s = sim.current
    s.route = routeToLane({ x: s.x, y: s.y }, at)
    playSound('click')
  }, [])

  const enter = useCallback(
    (level: LevelDef) => {
      if (!player) return
      if (!isLevelUnlocked(player, level.id)) {
        playSound('wrong')
        setTalk({ npc: 'hero', text: `🔒 ผ่านด่าน ${level.id - 1} ก่อน ด่านนี้จึงจะเปิดนะ` })
        return
      }
      if (level.id > PLAYABLE_MAX) {
        setTalk({ npc: 'owl', text: '🛠️ ด่านนี้กำลังสร้าง จะเปิดให้เล่นในส่วนถัดไปนะ' })
        return
      }
      playSound('unlock')
      savePosition()
      const rec = levelRecord(player, level.id)
      const step = rec.stepDone >= 4 ? 'learn' : ['learn', 'practice', 'mission', 'boss'][rec.stepDone]
      navigate(`/level/${level.id}/${step}`)
    },
    [player, navigate, savePosition],
  )

  /** แตะอาคาร: เดินตามถนนไปหน้าประตู */
  const walkTo = useCallback((level: number) => {
    const s = sim.current
    s.route = routeTo({ x: s.x, y: s.y }, level)
    playSound('click')
  }, [])

  /** คุยกับเพื่อน: ถ้าวันนี้ยังไม่ได้ช่วย จะชวนทำภารกิจ ไม่งั้นบอกเคล็ดลับ */
  const talkTo = useCallback(
    (npc: NpcId) => {
      if (!player || npc === 'hero') return
      playSound('click')
      if (isQuestNpc(npc) && questAvailable(player, npc)) {
        const text = NPC_QUESTS[npc].ask
        setTalk({ npc, text, quest: true })
        speak(text)
        return
      }
      const tips = TIPS[npc as keyof typeof TIPS]
      const i = tipIndex.current[npc] ?? 0
      tipIndex.current[npc] = i + 1
      const text = tips[i % tips.length]
      setTalk({ npc, text })
      speak(text)
    },
    [player],
  )

  const action = useCallback(() => {
    const { level, npc } = nearRef.current
    if (npc && npc !== 'hero') {
      talkTo(npc)
      return
    }
    if (level !== null) enter(LEVELS[level])
    else if (nearRef.current.eco === 'market') {
      savePosition()
      navigate('/eco')
    }
  }, [enter, talkTo, navigate, savePosition])

  /* ---------------- ลูปเกม ---------------- */
  useEffect(() => {
    let raf = 0
    let last = performance.now()
    let puffClock = 0
    let puffNext = 0
    const calm = () =>
      document.documentElement.classList.contains('mh-reduce-motion') || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      const s = sim.current

      let vx = (s.keys.right ? 1 : 0) - (s.keys.left ? 1 : 0) + s.joy.x
      let vy = (s.keys.down ? 1 : 0) - (s.keys.up ? 1 : 0) + s.joy.y
      const manual = Math.hypot(vx, vy) > 0.15
      if (manual) s.route = null

      if (!manual && s.route && s.route.length > 0) {
        // เดินตามถนนอัตโนมัติ (ไม่ต้องตรวจชน เพราะถนนโล่งเสมอ)
        const target = s.route[0]
        const d = dist(s, target)
        const step = SPEED * 1.15 * dt
        vx = target.x - s.x
        vy = target.y - s.y
        if (d <= step) {
          s.x = target.x
          s.y = target.y
          s.route.shift()
          if (s.route.length === 0) s.route = null
        } else {
          s.x += ((target.x - s.x) / d) * step
          s.y += ((target.y - s.y) / d) * step
        }
        s.walking = true
      } else if (manual) {
        const len = Math.max(1, Math.hypot(vx, vy))
        const nx = s.x + (vx / len) * SPEED * dt
        const ny = s.y + (vy / len) * SPEED * dt
        // เลื่อนแยกแกน จะได้ไถลไปตามขอบต้นไม้/อาคาร ไม่ติดหนึบ
        if (walkable({ x: nx, y: s.y })) s.x = nx
        if (walkable({ x: s.x, y: ny })) s.y = ny
        s.walking = true
      } else {
        s.walking = false
      }
      if (Math.abs(vx) > 0.1) s.dir = vx > 0 ? 1 : -1

      const view = viewRef.current
      // จอเล็กซูมออก จะได้เห็นเมืองกว้างขึ้น ไม่ใช่เห็นทีละบ้าน
      const zoom = (view?.clientWidth ?? 800) < 600 ? 0.68 : 1
      const vw = (view?.clientWidth ?? 800) / zoom
      const vh = (view?.clientHeight ?? 500) / zoom
      const camX = Math.max(0, Math.min(WORLD.w - vw, s.x - vw / 2))
      const camY = Math.max(0, Math.min(WORLD.h - vh, s.y - vh / 2))
      if (worldRef.current) {
        worldRef.current.style.transform = `translate3d(${-camX * zoom}px,${-camY * zoom}px,0) scale(${zoom})`
      }
      if (heroRef.current) {
        const h = heroRef.current
        h.style.transform = `translate3d(${s.x - 37}px,${s.y - 90}px,0)`
        h.style.zIndex = String(Math.round(s.y) + 1)
        h.classList.toggle('is-walking', s.walking)
        h.classList.toggle('is-left', s.dir < 0)
      }

      // ฝุ่นฟุ้งเล็ก ๆ ที่เท้าตอนเดิน
      puffClock += dt
      if (s.walking && puffClock > 0.2 && !calm()) {
        puffClock = 0
        const puff = puffRefs.current[puffNext]
        puffNext = (puffNext + 1) % PUFFS
        if (puff?.animate) {
          const x = s.x - 8 - s.dir * 14
          const y = s.y - 8
          puff.animate(
            [
              { transform: `translate(${x}px, ${y}px) scale(0.4)`, opacity: 0.8 },
              { transform: `translate(${x - s.dir * 10}px, ${y - 12}px) scale(1.5)`, opacity: 0 },
            ],
            { duration: 520, easing: 'ease-out' },
          )
        }
      }

      // สัตว์เลี้ยงเดินตามหลังฮีโร่ (ค่อย ๆ ไล่ตาม ไม่วาร์ป)
      if (petRef.current) {
        const tx = s.x - s.dir * 46
        const ty = s.y + 8
        const k = Math.min(1, dt * 5)
        s.petX += (tx - s.petX) * k
        s.petY += (ty - s.petY) * k
        const moving = Math.hypot(tx - s.petX, ty - s.petY) > 6
        const pet = petRef.current
        pet.style.transform = `translate3d(${s.petX - 22}px,${s.petY - 44}px,0)`
        pet.style.zIndex = String(Math.round(s.petY))
        pet.classList.toggle('is-walking', moving)
        pet.classList.toggle('is-left', s.petX > s.x)
      }

      for (const c of TOWN_COINS) {
        if (!collectedRef.current.has(c.id) && dist(s, c) < 30) collect(c)
      }
      for (const t of trash) {
        if (!pickedRef.current.has(t.id) && dist(s, t) < 32) pickUp(t)
      }

      let level: number | null = null
      for (const l of LEVELS) if (dist(s, doorOf(l.id)) < NEAR_DOOR) level = l.id
      let npc: NpcId | null = null
      for (const n of TOWN_NPCS) if (dist(s, n) < NEAR_NPC) npc = n.id
      const eco = dist(s, ECO_MARKET) < NEAR_DOOR ? 'market' : dist(s, ECO_GARDEN) < NEAR_DOOR ? 'garden' : null
      if (level !== nearRef.current.level || npc !== nearRef.current.npc || eco !== nearRef.current.eco) {
        nearRef.current = { level, npc, eco }
        setNearLevel(level)
        setNearNpc(npc)
        setNearEco(eco)
      }

      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [collect, pickUp, trash])

  /* ---------------- คีย์บอร์ด ---------------- */
  useEffect(() => {
    type Dir = 'up' | 'down' | 'left' | 'right'
    const keyOf = (k: string): Dir | null => {
      if (k === 'ArrowLeft' || k === 'a' || k === 'A') return 'left'
      if (k === 'ArrowRight' || k === 'd' || k === 'D') return 'right'
      if (k === 'ArrowUp' || k === 'w' || k === 'W') return 'up'
      if (k === 'ArrowDown' || k === 's' || k === 'S') return 'down'
      return null
    }
    const down = (e: KeyboardEvent) => {
      if (modalOpen.current || document.activeElement instanceof HTMLInputElement) return
      const k = keyOf(e.key)
      if (k) {
        sim.current.keys[k] = true
        e.preventDefault()
      } else if (e.key === 'Enter' || e.key === 'e' || e.key === 'E' || e.key === ' ') {
        e.preventDefault()
        action()
      }
    }
    const up = (e: KeyboardEvent) => {
      const k = keyOf(e.key)
      if (k) sim.current.keys[k] = false
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [action])

  // คำพูดหายไปเองหลังอ่านจบ แผงเข้าด่านจึงกลับมา
  useEffect(() => {
    if (!talk || talk.quest) return
    const t = window.setTimeout(() => setTalk(null), 3500)
    return () => window.clearTimeout(t)
  }, [talk])

  // บันทึกตำแหน่งตอนออกจากแผนที่
  useEffect(() => () => savePosition(), [savePosition])

  /* ---------------- จอยสติก ---------------- */
  const joyOrigin = useRef<{ x: number; y: number } | null>(null)
  const joyMove = (e: RPointerEvent<HTMLDivElement>) => {
    const o = joyOrigin.current
    if (!o) return
    const dx = e.clientX - o.x
    const dy = e.clientY - o.y
    const len = Math.hypot(dx, dy)
    const max = 44
    const k = len > max ? max / len : 1
    sim.current.joy = { x: (dx * k) / max, y: (dy * k) / max }
    if (knobRef.current) knobRef.current.style.transform = `translate(${dx * k}px, ${dy * k}px)`
  }
  const joyEnd = () => {
    joyOrigin.current = null
    sim.current.joy = { x: 0, y: 0 }
    if (knobRef.current) knobRef.current.style.transform = 'translate(0, 0)'
  }

  if (!player) return null
  const passed = lessonsPassed(player)
  const left = TOTAL_LESSONS - passed
  const near = nearLevel !== null ? LEVELS[nearLevel] : null

  return (
    <div className="mh-map-page">
      <TopBar />

      <section className="mh-card mh-map-progress" aria-label="ความก้าวหน้า">
        <div className="mh-map-progress-text">
          <strong>คุณเรียนรู้แล้ว {passed} / {TOTAL_LESSONS} ด่าน</strong>
          <span>{left > 0 ? `เหลืออีก ${left} ด่านเพื่อเป็น MONEY MASTER!` : '🏆 คุณคือ MONEY MASTER ป.3!'}</span>
        </div>
        <div className="mh-progress" role="progressbar" aria-valuenow={passed} aria-valuemin={0} aria-valuemax={TOTAL_LESSONS}>
          <div style={{ width: `${(passed / TOTAL_LESSONS) * 100}%` }} />
        </div>
        <div className="mh-map-chips">
          {LEVELS.slice(1).map((l) => (
            <span key={l.id} className={`mh-mini-chip ${isLevelPassed(player, l.id) ? 'is-done' : isLevelUnlocked(player, l.id) ? 'is-open' : ''}`}>
              {l.id} {isLevelPassed(player, l.id) ? '✅' : isLevelUnlocked(player, l.id) ? '▶' : '🔒'}
            </span>
          ))}
        </div>
      </section>

      <div className="mh-town-view" ref={viewRef} data-testid="mh-world">
        <div className="mh-town" ref={worldRef} style={{ width: WORLD.w, height: WORLD.h }}>
          <TownTerrain />
          {/* ประกายน้ำไหล (เว้นช่วงสะพาน) */}
          <div className="mh-river-shine" style={{ left: 0, top: RIVER.top + 8, width: BRIDGE.x, height: RIVER.bottom - RIVER.top - 16 }} aria-hidden="true">
            <i />
          </div>
          <div
            className="mh-river-shine"
            style={{ left: BRIDGE.x + BRIDGE.w, top: RIVER.top + 8, width: WORLD.w - BRIDGE.x - BRIDGE.w, height: RIVER.bottom - RIVER.top - 16 }}
            aria-hidden="true"
          >
            <i />
          </div>

          {TREES.map((t, i) => (
            <TreeSprite key={i} tree={t} />
          ))}

          {LEVELS.map((l) => {
            const unlocked = isLevelUnlocked(player, l.id)
            const rec = levelRecord(player, l.id)
            const done = rec.stepDone >= 4
            const soon = l.id > PLAYABLE_MAX
            const d = doorOf(l.id)
            const castle = l.id === 12
            const w = castle ? 190 : 160
            return (
              <button
                key={l.id}
                type="button"
                className={`mh-house ${unlocked ? 'is-open' : 'is-locked'} ${nearLevel === l.id ? 'is-near' : ''}`}
                style={{ left: d.x - w / 2, top: d.y - (castle ? 222 : 188), width: w, zIndex: Math.round(d.y) - 30 }}
                data-testid={`mh-building-${l.id}`}
                onClick={() => walkTo(l.id)}
                aria-label={`ด่าน ${l.id} ${l.name}`}
              >
                <span className="mh-house-sign">
                  <b>{l.id}</b> {l.name}
                </span>
                <BuildingArt level={l.id} locked={!unlocked} />
                <span className="mh-house-status">
                  {!unlocked ? '🔒' : done ? <Stars n={rec.bestStars} size={14} /> : soon ? '🛠️' : rec.stepDone > 0 ? `▶ ${stepLabel(rec.stepDone)}` : '✨ ใหม่!'}
                </span>
              </button>
            )
          })}

          {TOWN_NPCS.map((n) => (
            <button
              key={n.id}
              type="button"
              className={`mh-town-npc ${nearNpc === n.id ? 'is-near' : ''}`}
              style={{ left: n.x - 32, top: n.y - 80, zIndex: n.y, animationDelay: `${(n.x % 7) * -0.6}s` }}
              onClick={() => talkTo(n.id)}
              aria-label={`คุยกับ${CHARACTERS[n.id].name}`}
              data-testid={`mh-npc-${n.id}`}
            >
              {questAvailable(player, n.id) ? (
                <span className="mh-npc-quest" aria-label="มีภารกิจ">
                  ❗
                </span>
              ) : (
                nearNpc === n.id && <span className="mh-npc-hint">💬</span>
              )}
              <CharacterArt id={n.id} size={64} mood={nearNpc === n.id ? 'happy' : 'normal'} />
            </button>
          ))}

          {TOWN_COINS.map((c) =>
            collected.has(c.id) ? null : (
              <span key={c.id} className="mh-town-coin" style={{ left: c.x - 15, top: c.y - 38, zIndex: c.y - 1 }} aria-hidden="true">
                <span className="mh-coin-spin">฿</span>
              </span>
            ),
          )}
          {/* ขยะของวันนี้บนถนน เดินผ่านเพื่อเก็บใส่ถุง */}
          {trash.map((t) =>
            picked.has(t.id) ? null : (
              <span key={t.id} className="mh-town-trash" style={{ left: t.x - 20, top: t.y - 40, zIndex: t.y - 1 }} data-testid={`mh-trash-${t.id}`} aria-label={trashName(t.kind)}>
                <TrashArt id={t.kind} />
              </span>
            ),
          )}
          {/* แผงกาดรักษ์โลก */}
          <button
            type="button"
            className={`mh-eco-stall ${nearEco === 'market' ? 'is-near' : ''}`}
            style={{ left: ECO_MARKET.x - ECO_SPOT.w / 2, top: ECO_MARKET.y - ECO_SPOT.gap - ECO_SPOT.h - 40, width: ECO_SPOT.w, zIndex: ECO_MARKET.y - 30 }}
            onClick={() => (nearRef.current.eco === 'market' ? action() : walkToEco(ECO_MARKET))}
            aria-label="แผงกาดรักษ์โลก"
            data-testid="mh-eco-stall"
          >
            <span className="mh-house-sign">
              <b>🌱</b> กาดรักษ์โลก
            </span>
            <svg viewBox="0 0 170 120" aria-hidden="true">
              <rect x="22" y="44" width="126" height="64" rx="6" fill="#fff4e6" stroke="#2b2350" strokeWidth="3" />
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <path key={i} d={`M${16 + i * 23} 22 h23 v24 q-11.5 10 -23 0 z`} fill={i % 2 ? '#fff' : '#40c057'} stroke="#2b2350" strokeWidth="2" />
              ))}
              <rect x="16" y="14" width="138" height="10" rx="4" fill="#2f9e44" stroke="#2b2350" strokeWidth="2" />
              <rect x="22" y="80" width="126" height="28" fill="#d9a066" stroke="#2b2350" strokeWidth="3" />
              <circle cx="54" cy="72" r="8" fill="#69db7c" stroke="#2b2350" strokeWidth="2" />
              <rect x="74" y="64" width="16" height="16" rx="3" fill="#a5d8ff" stroke="#2b2350" strokeWidth="2" />
              <circle cx="114" cy="72" r="8" fill="#ffc9de" stroke="#2b2350" strokeWidth="2" />
              <text x="85" y="100" fontSize="13" textAnchor="middle" fill="#fff" fontWeight="800">
                {'\u267B\uFE0E'}
              </text>
            </svg>
            {player.eco.bag.length > 0 && <span className="mh-eco-bag">🧺 {player.eco.bag.length}</span>}
          </button>
          {/* สวนของฮีโร่: ต้นไม้โตตามยอดขายสะสม ดอกไม้ตามเงินบริจาค */}
          <button
            type="button"
            className={`mh-eco-garden ${nearEco === 'garden' ? 'is-near' : ''}`}
            style={{ left: ECO_GARDEN.x - ECO_SPOT.w / 2, top: ECO_GARDEN.y - ECO_SPOT.gap - ECO_SPOT.h - 40, width: ECO_SPOT.w, zIndex: ECO_GARDEN.y - 30 }}
            onClick={() => walkToEco(ECO_GARDEN)}
            aria-label={`สวนของ${player.name}`}
            data-testid="mh-eco-garden"
          >
            <span className="mh-house-sign">🌳 สวนของ{player.name}</span>
            <span className="mh-eco-garden-plot">
              <span className="mh-eco-tree">
                <TreeStage stage={ecoStage(player.eco).stage} />
              </span>
              {Array.from({ length: Math.min(10, Math.floor(player.eco.donated / 100)) }, (_, i) => (
                <span key={i} className="mh-eco-flower" style={{ left: `${8 + ((i * 37) % 84)}%`, top: `${62 + ((i * 13) % 26)}%` }}>
                  {['🌷', '🌼', '🌸', '🌻'][i % 4]}
                </span>
              ))}
            </span>
          </button>
          {BUTTERFLIES.map((b, i) => (
            <span key={i} className="mh-butterfly" style={{ left: b.x, top: b.y, animationDelay: `${i * -2.3}s` }} aria-hidden="true">
              <svg viewBox="-12 -10 24 20" width="22" height="18">
                <g className="mh-wing">
                  <ellipse cx="-6" cy="-3" rx="6" ry="5" fill={b.c} />
                  <ellipse cx="-5" cy="4" rx="4" ry="3.4" fill={b.c} opacity="0.85" />
                </g>
                <g className="mh-wing mh-wing-r">
                  <ellipse cx="6" cy="-3" rx="6" ry="5" fill={b.c} />
                  <ellipse cx="5" cy="4" rx="4" ry="3.4" fill={b.c} opacity="0.85" />
                </g>
                <rect x="-1" y="-6" width="2" height="12" rx="1" fill="#3b2a20" />
              </svg>
            </span>
          ))}
          {/* เงาเมฆลอยผ่านเมือง */}
          <div className="mh-cloud-shadow" style={{ top: 120 }} aria-hidden="true" />
          <div className="mh-cloud-shadow mh-cloud-2" style={{ top: 760 }} aria-hidden="true" />
          <div className="mh-cloud-shadow mh-cloud-3" style={{ top: 1180 }} aria-hidden="true" />
          {pop && (
            <span key={pop.key} className="mh-coin-pop" style={{ left: pop.x - 24, top: pop.y - 80, zIndex: 5000 }}>
              +1 🪙
            </span>
          )}

          {Array.from({ length: PUFFS }, (_, i) => (
            <span
              key={`p${i}`}
              className="mh-puff"
              ref={(el) => {
                puffRefs.current[i] = el
              }}
              aria-hidden="true"
            />
          ))}
          {player.wear?.pet && (
            <div className="mh-town-pet" ref={petRef} data-testid="mh-pet" aria-hidden="true">
              <PetSvg id={player.wear.pet} />
            </div>
          )}
          <div className="mh-walker mh-town-walker" ref={heroRef} data-testid="mh-hero">
            <span className="mh-walker-shadow" />
            <div className="mh-walker-inner">
              <AvatarArt avatar={player.avatar} size={74} wear={player.wear} />
            </div>
          </div>
        </div>

        <div className="mh-world-overlay">
          {talk && (
            <div className="mh-card mh-talk" aria-live="polite">
              <CharacterArt id={talk.npc} size={52} />
              <div className="mh-talk-body">
                <strong>{CHARACTERS[talk.npc].name}</strong>
                <p>{talk.text}</p>
                {talk.quest && isQuestNpc(talk.npc) && (
                  <div className="mh-row-buttons mh-talk-buttons">
                    <button type="button" className="mh-btn mh-btn-soft mh-btn-sm" onClick={() => setTalk(null)}>
                      ไว้ก่อนนะ
                    </button>
                    <button
                      type="button"
                      className="mh-btn mh-btn-gold mh-btn-sm"
                      data-testid="mh-quest-accept"
                      onClick={() => {
                        const npc = talk.npc as QuestNpc
                        playSound('unlock')
                        setTalk(null)
                        setQuest({ npc, q: makeQuest(npc) })
                      }}
                    >
                      🎁 ช่วยเลย! (+{QUEST_REWARD.coins} 🪙)
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
          {nearEco && !near && !talk && (
            <div className="mh-card mh-level-panel" data-testid="mh-eco-panel">
              <div className="mh-level-panel-icon mh-eco-panel-icon">
                {nearEco === 'market' ? '🌱' : <TreeStage stage={ecoStage(player.eco).stage} />}
              </div>
              <div className="mh-level-panel-info">
                {nearEco === 'market' ? (
                  <>
                    <strong>แผงกาดรักษ์โลก</strong>
                    <span>เปลี่ยนขยะให้เป็นเงิน เปลี่ยนเงินให้เป็นไอเดีย</span>
                    <span className="mh-level-panel-game">🧺 ขยะในถุง {player.eco.bag.length}/{BAG_MAX} ชิ้น</span>
                  </>
                ) : (
                  <>
                    <strong>สวนของ{player.name}</strong>
                    <span>
                      ยอดขายสะสม {Math.floor(player.eco.sales / 100)} บาท
                      {ecoStage(player.eco).next ? ` · อีก ${ecoStage(player.eco).need} บาท ${ecoStage(player.eco).next?.label}` : ' · สวนสมบูรณ์แล้ว 🎉'}
                    </span>
                    <span className="mh-level-panel-game">🌷 บริจาคกองทุนต้นไม้แล้ว {Math.floor(player.eco.donated / 100)} บาท</span>
                  </>
                )}
              </div>
              {nearEco === 'market' && (
                <button type="button" className="mh-btn mh-btn-gold" onClick={action} data-testid="mh-eco-enter">
                  ▶ เปิดร้าน
                </button>
              )}
            </div>
          )}
          {near && !talk && (
            <div className="mh-card mh-level-panel" data-testid="mh-level-panel">
              <div className="mh-level-panel-icon">
                <BuildingArt level={near.id} locked={!isLevelUnlocked(player, near.id)} className="mh-thumb-bld" />
              </div>
              <div className="mh-level-panel-info">
                <strong>
                  ด่าน {near.id}: {near.name}
                </strong>
                <span>{near.topic}</span>
                <span className="mh-level-panel-game">🎮 {near.game}</span>
                {isLevelPassed(player, near.id) && <StageChips player={player} level={near.id} />}
              </div>
              <button
                type="button"
                className="mh-btn mh-btn-gold"
                onClick={() => enter(near)}
                data-testid="mh-enter"
                disabled={!isLevelUnlocked(player, near.id)}
              >
                {isLevelUnlocked(player, near.id) ? '▶ เข้าด่าน' : '🔒 ล็อก'}
              </button>
            </div>
          )}
        </div>

        <div
          className="mh-joystick"
          aria-label="จอยสติก ลากเพื่อเดิน"
          data-testid="mh-joystick"
          onPointerDown={(e) => {
            e.preventDefault()
            const r = e.currentTarget.getBoundingClientRect()
            joyOrigin.current = { x: r.left + r.width / 2, y: r.top + r.height / 2 }
            try {
              e.currentTarget.setPointerCapture(e.pointerId)
            } catch {
              // ไม่รองรับก็ไม่เป็นไร
            }
            joyMove(e)
          }}
          onPointerMove={joyMove}
          onPointerUp={joyEnd}
          onPointerCancel={joyEnd}
        >
          <div className="mh-joystick-knob" ref={knobRef} />
        </div>
        <button
          type="button"
          className={`mh-action-btn ${nearLevel !== null || nearNpc || nearEco === 'market' ? 'is-ready' : ''}`}
          onClick={action}
          aria-label="ทำ"
          data-testid="mh-action"
        >
          {nearNpc ? '💬' : nearLevel !== null ? '🚪' : '✋'}
          <span>{nearNpc ? 'คุย' : nearLevel !== null ? 'เข้า' : 'ทำ'}</span>
        </button>
      </div>

      <p className="mh-help-line mh-map-help">
        ⌨️ ลูกศร / WASD เดิน · Enter เข้าอาคาร · 📱 ลากจอยสติกเพื่อเดิน · 👆 แตะอาคารให้ฮีโร่เดินไปเอง
      </p>

      {!doneToday(player.daily) && (
        <Link to="/daily" className="mh-card mh-test-banner is-daily" data-testid="mh-daily-banner">
          <span className="mh-test-banner-icon" aria-hidden="true">
            🌞
          </span>
          <span>
            <b>ภารกิจประจำวัน · {liveStreak(player.daily) > 0 ? `🔥 ${liveStreak(player.daily)} วันติดกัน` : 'เริ่มสตรีคกันเลย!'}</b>
            <span>วันละ 5 ข้อ ได้เหรียญและตราประทับ ⭐</span>
          </span>
          <span className="mh-btn mh-btn-gold mh-btn-sm">ทำเลย ▶</span>
        </Link>
      )}
      {!player.preTest && (
        <Link to="/test/pre" className="mh-card mh-test-banner" data-testid="mh-pretest-banner">
          <span className="mh-test-banner-icon" aria-hidden="true">
            🧭
          </span>
          <span>
            <b>วัดพลังก่อนออกผจญภัย!</b>
            <span>แบบทดสอบก่อนเรียน 18 ข้อ · ได้ตรา “นักสำรวจพลัง”</span>
          </span>
          <span className="mh-btn mh-btn-gold mh-btn-sm">ทำเลย ▶</span>
        </Link>
      )}
      {canTakePostTest(player) && !player.postTest && (
        <Link to="/test/post" className="mh-card mh-test-banner is-post" data-testid="mh-posttest-banner">
          <span className="mh-test-banner-icon" aria-hidden="true">
            🎓
          </span>
          <span>
            <b>แบบทดสอบหลังเรียนเปิดแล้ว!</b>
            <span>20 ข้อ · ดูว่าเก่งขึ้นจากก่อนเรียนเท่าไร</span>
          </span>
          <span className="mh-btn mh-btn-gold mh-btn-sm">ทำเลย ▶</span>
        </Link>
      )}

      <nav className="mh-map-menu" aria-label="เมนูฮีโร่">
        <Link to="/badges" className="mh-menu-tile">
          <span aria-hidden="true">🏆</span>ตรา
        </Link>
        <Link to="/profile" className="mh-menu-tile">
          <span aria-hidden="true">👤</span>โปรไฟล์
        </Link>
        <Link to="/stats" className="mh-menu-tile">
          <span aria-hidden="true">📊</span>สถิติ
        </Link>
        <Link to="/sandbox" className="mh-menu-tile mh-menu-sandbox" data-testid="mh-menu-sandbox">
          <span aria-hidden="true">🧮</span>โต๊ะนับเงิน
        </Link>
        <Link to="/stars" className="mh-menu-tile mh-menu-stars" data-testid="mh-menu-stars">
          <span aria-hidden="true">🧰</span>ถนนดาว
          {readyChests(player).length > 0 && <em className="mh-menu-badge">{readyChests(player).length}</em>}
        </Link>
        <Link to="/shop" className="mh-menu-tile mh-menu-shop" data-testid="mh-menu-shop">
          <span aria-hidden="true">🛍️</span>ร้านของฮีโร่
        </Link>
        <Link to="/duel" className="mh-menu-tile mh-menu-duel" data-testid="mh-menu-duel">
          <span aria-hidden="true">⚔️</span>ดวลสองคน
        </Link>
        <Link to="/plan" className="mh-menu-tile mh-menu-plan" data-testid="mh-menu-plan">
          <span aria-hidden="true">🎉</span>วางแผนใช้เงิน
        </Link>
        <Link to="/change" className="mh-menu-tile mh-menu-change" data-testid="mh-menu-change">
          <span aria-hidden="true">💵</span>ร้านทอนไว
        </Link>
        <Link to="/eco" className="mh-menu-tile mh-menu-eco" data-testid="mh-menu-eco">
          <span aria-hidden="true">🌱</span>กาดรักษ์โลก
        </Link>
        <Link to="/bank" className="mh-menu-tile mh-menu-bank" data-testid="mh-menu-bank">
          <span aria-hidden="true">🐷</span>กระปุกออมสิน
        </Link>
        <Link to="/ar" className="mh-menu-tile mh-menu-ar" data-testid="mh-menu-ar">
          <span aria-hidden="true">📷</span>ล่าเหรียญ AR
        </Link>
        <Link to="/review" className="mh-menu-tile" data-testid="mh-menu-review">
          <span aria-hidden="true">🔁</span>ฝึกข้อที่ผิด
          {pendingMistakes(player).length > 0 && <em className="mh-menu-badge">{pendingMistakes(player).length}</em>}
        </Link>
      </nav>

      <div className="mh-row-buttons">
        <button type="button" className="mh-btn mh-btn-soft" onClick={() => setShowList((v) => !v)} data-testid="mh-level-list-toggle">
          <List size={22} /> {showList ? 'ซ่อนรายการด่าน' : 'ดูรายการด่าน'}
        </button>
      </div>

      {quest && (
        <div className="mh-modal mh-quest-modal" role="dialog" aria-label={`ภารกิจของ${CHARACTERS[quest.npc].name}`}>
          <div className="mh-card mh-modal-card mh-quest-card" data-testid="mh-quest">
            <div className="mh-quest-title">🎁 ภารกิจของ{CHARACTERS[quest.npc].name}</div>
            <StepRunner
              questions={[quest.q]}
              levelId={-1}
              mode="practice"
              earnLabel={`ตอบถูก ภารกิจของ${CHARACTERS[quest.npc].name}`}
              onFinish={(s) => {
                const ok = s.within2 > 0
                updatePlayer((p) => recordQuest(p, quest.npc, ok))
                setQuestDone({ npc: quest.npc, ok })
                setQuest(null)
                playSound(ok ? 'complete' : 'click')
              }}
            />
          </div>
        </div>
      )}
      {questDone && (
        <div className="mh-modal mh-quest-modal" role="dialog" aria-label="ผลภารกิจ">
          <div className="mh-card mh-modal-card mh-center" data-testid="mh-quest-done">
            {questDone.ok && <Confetti count={24} />}
            <CharacterArt id={questDone.npc} size={96} mood={questDone.ok ? 'happy' : 'normal'} />
            <h2 className="mh-step-title">{questDone.ok ? 'ขอบใจมากนะ! 💖' : 'ไม่เป็นไรนะ พรุ่งนี้มาช่วยกันใหม่'}</h2>
            {questDone.ok && (
              <p>
                ได้ +{QUEST_REWARD.coins} 🪙 · +{QUEST_REWARD.exp} EXP
              </p>
            )}
            <button type="button" className="mh-btn mh-btn-gold" onClick={() => setQuestDone(null)} data-testid="mh-quest-close">
              กลับไปเดินเล่น ▶
            </button>
          </div>
        </div>
      )}

      {showList && (
        <div className="mh-level-list" data-testid="mh-level-list">
          {LEVELS.map((l) => {
            const unlocked = isLevelUnlocked(player, l.id)
            const rec = levelRecord(player, l.id)
            return (
              <button
                key={l.id}
                type="button"
                className={`mh-level-card ${unlocked ? '' : 'is-locked'}`}
                onClick={() => enter(l)}
                data-testid={`mh-level-card-${l.id}`}
              >
                <span className="mh-level-card-icon">
                  <BuildingArt level={l.id} locked={!unlocked} className="mh-thumb-bld" />
                </span>
                <span className="mh-level-card-body">
                  <b>
                    ด่าน {l.id} {rec.stepDone >= 4 ? '✅' : ''}
                  </b>
                  <span>{l.name}</span>
                  <Stars n={rec.bestStars} />
                </span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
