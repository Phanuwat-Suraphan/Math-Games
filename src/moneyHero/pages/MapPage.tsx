import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as RPointerEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, ChevronUp, List } from 'lucide-react'
import type { NpcId } from '../engine/types'
import { useGame } from '../hooks/useMoneyGame'
import { LEVELS, TOTAL_LESSONS, type LevelDef } from '../data/levels'
import { CHARACTERS } from '../data/characters'
import { isLevelPassed, isLevelUnlocked, lessonsPassed, levelRecord, nextLevelId } from '../engine/progress'
import { AvatarArt, CharacterArt } from '../components/Art'
import { TopBar } from '../components/TopBar'
import { Stars } from '../components/Stars'
import { playSound } from '../utils/sound'
import { speak } from '../utils/speech'

/**
 * แผนที่ "เมืองเงินทอง" แบบเกม 2 มิติ
 *
 * ฮีโร่เดินซ้าย–ขวา กระโดดเก็บเหรียญ คุยกับเพื่อน ๆ และเดินเข้าอาคารเพื่อเข้าด่าน
 * ควบคุมได้ทั้งคีย์บอร์ด (← → / A D, Space กระโดด, Enter เข้า) ปุ่มบนจอ และแตะอาคารเพื่อเดินไปเอง
 *
 * ตำแหน่งฮีโร่อัปเดตทุกเฟรมผ่าน ref โดยตรง ไม่ผ่าน state ของ React จึงลื่นแม้บนแท็บเล็ต
 */

const FIRST_X = 340
const GAP = 380
const WORLD_W = FIRST_X + GAP * (LEVELS.length - 1) + 420
const SPEED = 300
const JUMP_V = 760
const GRAVITY = 2000
const NEAR = 120

/** ด่านที่เล่นได้แล้วในเวอร์ชันนี้ (-1 = ยังไม่มี) ด่านที่เหลือเปิดในส่วนถัดไป */
export const PLAYABLE_MAX = -1

function buildingX(id: number): number {
  return FIRST_X + id * GAP
}

interface MapCoin {
  id: string
  x: number
  /** ความสูงจากพื้น (px) */
  h: number
}

const COINS: MapCoin[] = LEVELS.slice(0, -1).flatMap((l) =>
  [0, 1, 2].map((k) => ({ id: `c${l.id}-${k}`, x: buildingX(l.id) + 125 + k * 62, h: k === 1 ? 150 : 46 })),
)

interface MapNpc {
  id: NpcId
  x: number
  tips: string[]
}

const NPCS: MapNpc[] = [
  { id: 'rabbit', x: buildingX(1) + 175, tips: ['100 สตางค์ = 1 บาท นะ!', 'นับเงินจากค่ามากไปน้อย จะนับง่ายขึ้น', 'กระโดดเก็บเหรียญบนฟ้าได้ด้วยนะ!'] },
  { id: 'fox', x: buildingX(4) + 175, tips: ['เทียบบาทก่อน ถ้าบาทเท่ากันค่อยดูสตางค์', 'อ่านโจทย์ให้ดี ถามอะไร บอกอะไร'] },
  { id: 'bear', x: buildingX(7) + 175, tips: ['ซื้อของแล้วอย่าลืมคิดเงินทอนนะ', 'สตางค์เกิน 100 ต้องทดเป็น 1 บาท'] },
  { id: 'owl', x: buildingX(11) + 175, tips: ['คงเหลือ = เดิม + รายรับ − รายจ่าย', 'จดบัญชีทุกวัน จะรู้ว่าเงินไปไหน'] },
]

function stepLabel(stepDone: number): string {
  return ['ยังไม่เริ่ม', 'เรียนแล้ว', 'ฝึกแล้ว', 'ภารกิจเสร็จ', 'ผ่านแล้ว'][Math.min(4, stepDone)]
}

export function MapPage() {
  const { player, updatePlayer } = useGame()
  const navigate = useNavigate()
  const viewRef = useRef<HTMLDivElement>(null)
  const worldRef = useRef<HTMLDivElement>(null)
  const heroRef = useRef<HTMLDivElement>(null)
  const farRef = useRef<HTMLDivElement>(null)
  const midRef = useRef<HTMLDivElement>(null)

  const startX = useMemo(() => {
    if (!player) return FIRST_X
    return player.mapX ?? buildingX(nextLevelId(player)) - 150
    // ตำแหน่งเริ่มคิดครั้งเดียวตอนเปิดหน้า
  }, [])

  const sim = useRef({ x: startX, y: 0, vy: 0, dir: 1, left: false, right: false, target: null as number | null })
  const collectedRef = useRef(new Set(player?.mapCoins ?? []))
  const [collected, setCollected] = useState(() => new Set(player?.mapCoins ?? []))
  const [nearLevel, setNearLevel] = useState<number | null>(null)
  const [nearNpc, setNearNpc] = useState<NpcId | null>(null)
  const [talk, setTalk] = useState<{ npc: NpcId; text: string } | null>(null)
  const [showList, setShowList] = useState(false)
  const [pop, setPop] = useState<{ x: number; h: number; key: number } | null>(null)
  const tipIndex = useRef<Record<string, number>>({})
  const nearRef = useRef<{ level: number | null; npc: NpcId | null }>({ level: null, npc: null })

  const savePosition = useCallback(() => {
    const x = Math.round(sim.current.x)
    updatePlayer((p) => (p.mapX === x ? p : { ...p, mapX: x }))
  }, [updatePlayer])

  const collect = useCallback(
    (coin: MapCoin) => {
      if (collectedRef.current.has(coin.id)) return
      collectedRef.current.add(coin.id)
      setCollected(new Set(collectedRef.current))
      setPop({ x: coin.x, h: coin.h, key: Date.now() })
      playSound('coin')
      updatePlayer((p) => (p.mapCoins.includes(coin.id) ? p : { ...p, coins: p.coins + 1, mapCoins: [...p.mapCoins, coin.id] }))
    },
    [updatePlayer],
  )

  const jump = useCallback(() => {
    const s = sim.current
    if (s.y > 0.5) return
    s.vy = JUMP_V
    playSound('jump')
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

  const action = useCallback(() => {
    const { level, npc } = nearRef.current
    if (npc) {
      const def = NPCS.find((n) => n.id === npc)!
      const i = tipIndex.current[npc] ?? 0
      tipIndex.current[npc] = i + 1
      const text = def.tips[i % def.tips.length]
      setTalk({ npc, text })
      speak(text)
      playSound('click')
      return
    }
    if (level !== null) enter(LEVELS[level])
  }, [enter])

  /* ---------------- ลูปเกม ---------------- */
  useEffect(() => {
    let raf = 0
    let last = performance.now()
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      const s = sim.current

      let vx = 0
      if (s.left) vx -= SPEED
      if (s.right) vx += SPEED
      if (vx !== 0) s.target = null
      if (s.target !== null) {
        const d = s.target - s.x
        if (Math.abs(d) < 6) s.target = null
        else vx = Math.sign(d) * SPEED
      }
      if (vx !== 0) s.dir = vx > 0 ? 1 : -1
      s.x = Math.max(80, Math.min(WORLD_W - 80, s.x + vx * dt))

      if (s.y > 0 || s.vy > 0) {
        s.vy -= GRAVITY * dt
        s.y = Math.max(0, s.y + s.vy * dt)
        if (s.y === 0) s.vy = 0
      }

      const viewW = viewRef.current?.clientWidth ?? 800
      const cam = Math.max(0, Math.min(WORLD_W - viewW, s.x - viewW / 2))
      if (worldRef.current) worldRef.current.style.transform = `translate3d(${-cam}px,0,0)`
      if (farRef.current) farRef.current.style.transform = `translate3d(${-cam * 0.25}px,0,0)`
      if (midRef.current) midRef.current.style.transform = `translate3d(${-cam * 0.55}px,0,0)`
      if (heroRef.current) {
        heroRef.current.style.transform = `translate3d(${s.x - 45}px,${-s.y}px,0)`
        heroRef.current.classList.toggle('is-walking', vx !== 0 && s.y === 0)
        heroRef.current.classList.toggle('is-left', s.dir < 0)
      }

      // เก็บเหรียญ
      for (const c of COINS) {
        if (collectedRef.current.has(c.id)) continue
        if (Math.abs(s.x - c.x) < 34 && Math.abs(s.y + 60 - c.h) < 62) collect(c)
      }

      // อยู่ใกล้อาคารหรือเพื่อนคนไหน
      let level: number | null = null
      for (const l of LEVELS) if (Math.abs(s.x - buildingX(l.id)) < NEAR) level = l.id
      let npc: NpcId | null = null
      for (const n of NPCS) if (Math.abs(s.x - n.x) < 60) npc = n.id
      if (level !== nearRef.current.level || npc !== nearRef.current.npc) {
        nearRef.current = { level, npc }
        setNearLevel(level)
        setNearNpc(npc)
        if (npc === null) setTalk(null)
      }

      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [collect])

  /* ---------------- คีย์บอร์ด ---------------- */
  useEffect(() => {
    const isTyping = () => document.activeElement instanceof HTMLInputElement
    const down = (e: KeyboardEvent) => {
      if (isTyping()) return
      const s = sim.current
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') s.left = true
      else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') s.right = true
      else if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        e.preventDefault()
        jump()
      } else if (e.key === 'Enter' || e.key === 'e' || e.key === 'E') action()
      else return
      if (e.key.startsWith('Arrow') || e.key === ' ') e.preventDefault()
    }
    const up = (e: KeyboardEvent) => {
      const s = sim.current
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') s.left = false
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') s.right = false
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [jump, action])

  // บันทึกตำแหน่งตอนออกจากแผนที่
  useEffect(() => () => savePosition(), [savePosition])

  if (!player) return null
  const passed = lessonsPassed(player)
  const left = TOTAL_LESSONS - passed
  const near = nearLevel !== null ? LEVELS[nearLevel] : null

  const hold = (dir: 'left' | 'right') => ({
    onPointerDown: (e: RPointerEvent) => {
      e.preventDefault()
      sim.current[dir] = true
    },
    onPointerUp: () => {
      sim.current[dir] = false
    },
    onPointerLeave: () => {
      sim.current[dir] = false
    },
    onPointerCancel: () => {
      sim.current[dir] = false
    },
  })

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

      <div className="mh-world-view" ref={viewRef} data-testid="mh-world">
        <div className="mh-layer mh-layer-far" ref={farRef} aria-hidden="true">
          {Array.from({ length: 14 }, (_, i) => (
            <span key={i} className="mh-hill" style={{ left: i * 260 }} />
          ))}
        </div>
        <div className="mh-layer mh-layer-mid" ref={midRef} aria-hidden="true">
          {Array.from({ length: 22 }, (_, i) => (
            <span key={i} className="mh-tree" style={{ left: i * 230 + 60 }}>
              {i % 3 === 0 ? '🌳' : i % 3 === 1 ? '🌲' : '🌴'}
            </span>
          ))}
        </div>

        <div className="mh-world" ref={worldRef} style={{ width: WORLD_W }}>
          <div className="mh-road" />
          {LEVELS.map((l) => {
            const unlocked = isLevelUnlocked(player, l.id)
            const rec = levelRecord(player, l.id)
            const done = rec.stepDone >= 4
            const soon = l.id > PLAYABLE_MAX
            return (
              <button
                key={l.id}
                type="button"
                className={`mh-building ${l.theme} ${unlocked ? 'is-open' : 'is-locked'} ${nearLevel === l.id ? 'is-near' : ''}`}
                style={{ left: buildingX(l.id) - 110 }}
                data-testid={`mh-building-${l.id}`}
                onClick={() => {
                  sim.current.target = buildingX(l.id)
                  playSound('click')
                }}
                aria-label={`ด่าน ${l.id} ${l.name}`}
              >
                <span className="mh-building-sign">
                  <b>ด่าน {l.id}</b> {l.name}
                </span>
                <span className="mh-building-art">{l.building}</span>
                <span className="mh-building-status">
                  {!unlocked ? '🔒 ล็อก' : done ? <Stars n={rec.bestStars} /> : soon ? '🛠️ เร็ว ๆ นี้' : rec.stepDone > 0 ? `▶ ${stepLabel(rec.stepDone)}` : '✨ ใหม่!'}
                </span>
                {done && <span className="mh-building-done">✅</span>}
              </button>
            )
          })}

          {NPCS.map((n) => (
            <div key={n.id} className={`mh-npc ${nearNpc === n.id ? 'is-near' : ''}`} style={{ left: n.x - 36 }}>
              {nearNpc === n.id && <span className="mh-npc-hint">💬</span>}
              <CharacterArt id={n.id} size={72} />
            </div>
          ))}

          {COINS.map((c) =>
            collected.has(c.id) ? null : (
              <span key={c.id} className="mh-map-coin" style={{ left: c.x - 17, bottom: 96 + c.h - 17 }} aria-hidden="true">
                ฿
              </span>
            ),
          )}
          {pop && (
            <span key={pop.key} className="mh-coin-pop" style={{ left: pop.x - 20, bottom: 96 + pop.h + 10 }}>
              +1 🪙
            </span>
          )}

          <div className="mh-walker" ref={heroRef} data-testid="mh-hero">
            <div className="mh-walker-inner">
              <AvatarArt avatar={player.avatar} size={90} />
            </div>
            <span className="mh-walker-shadow" />
          </div>
        </div>
      </div>

      {talk && (
        <div className="mh-card mh-talk" aria-live="polite">
          <CharacterArt id={talk.npc} size={56} />
          <div>
            <strong>{CHARACTERS[talk.npc].name}</strong>
            <p>{talk.text}</p>
          </div>
        </div>
      )}

      {near && !talk && (
        <div className="mh-card mh-level-panel" data-testid="mh-level-panel">
          <div className="mh-level-panel-icon">{near.icon}</div>
          <div className="mh-level-panel-info">
            <strong>
              ด่าน {near.id}: {near.name}
            </strong>
            <span>{near.topic}</span>
            <span className="mh-level-panel-game">🎮 {near.game}</span>
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

      <div className="mh-controls">
        <button type="button" className="mh-pad" aria-label="เดินซ้าย" {...hold('left')}>
          <ChevronLeft size={34} />
        </button>
        <button type="button" className="mh-pad" aria-label="เดินขวา" {...hold('right')}>
          <ChevronRight size={34} />
        </button>
        <button type="button" className="mh-pad mh-pad-jump" aria-label="กระโดด" onClick={jump}>
          <ChevronUp size={34} />
          <span>กระโดด</span>
        </button>
        <button
          type="button"
          className={`mh-pad mh-pad-action ${nearLevel !== null || nearNpc ? 'is-ready' : ''}`}
          aria-label="ทำ"
          onClick={action}
        >
          {nearNpc ? '💬 คุย' : nearLevel !== null ? '🚪 เข้า' : '✋'}
        </button>
      </div>
      <p className="mh-help-line mh-map-help">⌨️ ลูกศร ← → เดิน · Space กระโดด · Enter เข้า · หรือแตะอาคารเพื่อเดินไปเอง</p>

      <div className="mh-row-buttons">
        <button type="button" className="mh-btn mh-btn-soft" onClick={() => setShowList((v) => !v)} data-testid="mh-level-list-toggle">
          <List size={22} /> {showList ? 'ซ่อนรายการด่าน' : 'ดูรายการด่าน'}
        </button>
      </div>

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
                <span className="mh-level-card-icon">{unlocked ? l.icon : '🔒'}</span>
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
