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
  offerCount,
  offerSkills,
  resolveQuestion,
  skipSkill,
  summarize,
  takeSkill,
} from '../survivor/engine'
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
  const worldRef = useRef<WorldState>(createWorld(`${Date.now()}`))
  const inputRef = useRef<Input>({ move: { x: 0, y: 0 } })
  const keysRef = useRef<Set<string>>(new Set())
  const lastTimeRef = useRef(0)
  const paidRef = useRef(false)

  // สถานะที่หน้าจอต้องรู้จริง ๆ เท่านั้นที่เก็บเป็น state
  const [phase, setPhase] = useState<'idle' | 'playing' | 'question' | 'choosing' | 'dead'>('idle')
  const [hud, setHud] = useState({ hp: 100, maxHp: 100, level: 1, xp: 0, xpToNext: 5, time: 0, kills: 0 })
  const [question, setQuestion] = useState<Question | null>(null)
  const [summary, setSummary] = useState<ReturnType<typeof summarize> | null>(null)

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
      const after = advance(before, elapsed, inputRef.current)
      worldRef.current = after

      draw(canvasRef.current, after)

      setHud({
        hp: Math.ceil(after.player.hp),
        maxHp: after.player.maxHp,
        level: after.player.level,
        xp: after.player.xp,
        xpToNext: after.player.xpToNext,
        time: Math.floor(after.time),
        kills: after.kills,
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
  }, [askQuestion, phase])

  /* แป้นพิมพ์สำหรับเครื่องที่มีคีย์บอร์ด */
  useEffect(() => {
    const apply = () => {
      const keys = keysRef.current
      const move = { x: 0, y: 0 }
      if (keys.has('ArrowLeft') || keys.has('a')) move.x -= 1
      if (keys.has('ArrowRight') || keys.has('d')) move.x += 1
      if (keys.has('ArrowUp') || keys.has('w')) move.y -= 1
      if (keys.has('ArrowDown') || keys.has('s')) move.y += 1
      inputRef.current = { move }
    }

    const down = (event: KeyboardEvent) => {
      keysRef.current.add(event.key)
      apply()
    }
    const up = (event: KeyboardEvent) => {
      keysRef.current.delete(event.key)
      apply()
    }

    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [])

  /** จ่ายเหรียญตอนจบ ทำที่เดียวและกันจ่ายซ้ำ */
  useEffect(() => {
    if (phase !== 'dead' || !summary || paidRef.current) return
    paidRef.current = true

    const gained = applyBonusPercent(summary.coins, totalStats(player).coinBonusPercent)
    if (gained > 0) patchPlayer({ coins: player.coins + gained })
  }, [patchPlayer, phase, player, summary])

  const start = useCallback(() => {
    paidRef.current = false
    worldRef.current = createWorld(`${Date.now()}`)
    inputRef.current = { move: { x: 0, y: 0 } }
    setSummary(null)
    setQuestion(null)
    setPhase('playing')
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
    <>
      <TopBar player={player} title="สนามรบตัวเลข" backTo="/menu" backLabel="กลับเมนู" />

      <ScreenLayout width="wide">
        {phase === 'idle' && <Intro onStart={start} />}

        {phase !== 'idle' && (
          <>
            <Hud hud={hud} />

            <div className="relative mt-3">
              <canvas
                ref={canvasRef}
                width={ARENA_WIDTH}
                height={ARENA_HEIGHT}
                className="w-full rounded-xl2 border border-white/10 bg-night-900"
                style={{ aspectRatio: `${ARENA_WIDTH} / ${ARENA_HEIGHT}`, touchAction: 'none' }}
              />

              {phase === 'question' && question && (
                <Overlay>
                  <QuestionCard question={question} onAnswer={submitAnswer} />
                </Overlay>
              )}

              {phase === 'choosing' && (
                <Overlay>
                  <SkillCards
                    world={worldRef.current}
                    onChoose={chooseSkill}
                  />
                </Overlay>
              )}

              {phase === 'dead' && summary && (
                <Overlay>
                  <DeadCard summary={summary} onRestart={start} />
                </Overlay>
              )}
            </div>

            {phase === 'playing' && <Joystick inputRef={inputRef} />}
          </>
        )}
      </ScreenLayout>
    </>
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
function draw(canvas: HTMLCanvasElement | null, world: WorldState): void {
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

  // มอนสเตอร์ สีต่างกันตามชนิด
  const COLORS: Record<string, string> = {
    'number-slime': '#34d399',
    'fraction-bat': '#a78bfa',
    'goblin-calculator': '#84cc16',
    'decimal-scorpion': '#f59e0b',
    'geometry-golem': '#94a3b8',
    'percentage-bandit': '#f87171',
  }

  for (const enemy of world.enemies) {
    ctx.fillStyle = enemy.hitFlash > 0 ? '#ffffff' : (COLORS[enemy.kind] ?? '#94a3b8')
    ctx.beginPath()
    ctx.arc(enemy.pos.x, enemy.pos.y, enemy.radius, 0, Math.PI * 2)
    ctx.fill()

    // ตาสองดวง ทำให้รู้สึกว่าเป็นสิ่งมีชีวิตที่กำลังมองเรา
    ctx.fillStyle = '#0f172a'
    const eye = enemy.radius * 0.3
    ctx.beginPath()
    ctx.arc(enemy.pos.x - eye, enemy.pos.y - eye * 0.4, enemy.radius * 0.18, 0, Math.PI * 2)
    ctx.arc(enemy.pos.x + eye, enemy.pos.y - eye * 0.4, enemy.radius * 0.18, 0, Math.PI * 2)
    ctx.fill()

    // แถบเลือดเฉพาะตัวที่โดนตีแล้ว ไม่งั้นจอรกด้วยแถบเต็มไปหมด
    if (enemy.hp < enemy.maxHp) {
      const width = enemy.radius * 2
      ctx.fillStyle = 'rgba(0,0,0,.5)'
      ctx.fillRect(enemy.pos.x - enemy.radius, enemy.pos.y - enemy.radius - 8, width, 3)
      ctx.fillStyle = '#f87171'
      ctx.fillRect(
        enemy.pos.x - enemy.radius,
        enemy.pos.y - enemy.radius - 8,
        width * (enemy.hp / enemy.maxHp),
        3,
      )
    }
  }

  // กระสุน
  ctx.fillStyle = '#fcd34d'
  for (const shot of world.projectiles) {
    ctx.beginPath()
    ctx.arc(shot.pos.x, shot.pos.y, shot.radius, 0, Math.PI * 2)
    ctx.fill()
  }

  // ดาบหมุนรอบตัว
  const blades = world.skills.orbit ?? 0
  if (blades > 0) {
    ctx.fillStyle = '#e2e8f0'
    for (let i = 0; i < blades; i += 1) {
      const angle = world.orbitAngle + (i * Math.PI * 2) / blades
      const x = world.player.pos.x + Math.cos(angle) * 62
      const y = world.player.pos.y + Math.sin(angle) * 62
      ctx.beginPath()
      ctx.arc(x, y, 8, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  // ผู้เล่น กระพริบตอนเพิ่งโดนตี
  const hurt = world.player.invulnerable > 0
  ctx.fillStyle = hurt && Math.floor(world.time * 12) % 2 === 0 ? '#fca5a5' : '#38bdf8'
  ctx.beginPath()
  ctx.arc(world.player.pos.x, world.player.pos.y, world.player.radius, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#0f172a'
  ctx.beginPath()
  ctx.arc(world.player.pos.x - 4, world.player.pos.y - 3, 2.6, 0, Math.PI * 2)
  ctx.arc(world.player.pos.x + 4, world.player.pos.y - 3, 2.6, 0, Math.PI * 2)
  ctx.fill()
}

/* ---------- ส่วนประกอบหน้าจอ ---------- */

function Intro({ onStart }: { onStart: () => void }) {
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
        <li>· ตอบถูกได้เลือกสกิล 3 ใบ ตอบผิดได้เลือก 2 ใบ</li>
        <li>· สกิลสะสมกันไปเรื่อย ๆ ยิ่งอยู่นานยิ่งแรง</li>
        <li>· บังคับด้วยการลากนิ้วบนแป้น หรือปุ่มลูกศร / WASD</li>
      </ul>
      <Button size="lg" fullWidth className="mt-6" onClick={onStart}>
        เข้าสนาม
      </Button>
    </div>
  )
}

function Hud({
  hud,
}: {
  hud: { hp: number; maxHp: number; level: number; xp: number; xpToNext: number; time: number; kills: number }
}) {
  const minutes = Math.floor(hud.time / 60)
  const seconds = hud.time % 60

  return (
    <div className="rounded-xl2 border border-white/10 bg-night-800/60 p-3">
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
      </div>

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

  // สกิลเต็มทุกใบแล้ว ต้องมีทางไปต่อ ไม่ใช่ค้างอยู่ตรงนี้ตลอดไป
  if (offer.length === 0) {
    return (
      <div className="rounded-xl2 border border-white/15 bg-night-800 p-5 text-center">
        <p className="text-white">เก่งมาก! หนูเก็บสกิลครบทุกอย่างแล้ว</p>
        <Button fullWidth className="mt-4" onClick={() => onChoose('')}>
          ลุยต่อ
        </Button>
      </div>
    )
  }

  return (
    <div>
      <p className="text-center text-sm font-bold text-white">
        {world.lastAnswerCorrect ? 'ตอบถูก! เลือกสกิล 1 อย่าง' : 'ตอบผิด แต่ยังได้เลือกนะ'}
      </p>
      <div className="mt-3 grid gap-2.5">
        {offer.map((skill) => {
          const owned = world.skills[skill.id] ?? 0
          return (
            <button
              key={skill.id}
              type="button"
              onClick={() => onChoose(skill.id)}
              className="flex items-center gap-3 rounded-xl border border-violet-400/40 bg-night-800 p-3 text-left"
            >
              <GameIcon name={skill.icon} size="h-8 w-8" />
              <div className="min-w-0 flex-1">
                <p className="font-bold text-gold-200">
                  {skill.name}
                  {owned > 0 && (
                    <span className="ml-2 text-xs text-slate-400">ชั้น {owned + 1}</span>
                  )}
                </p>
                <p className="text-sm text-slate-300">{skill.description}</p>
              </div>
            </button>
          )
        })}
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
      <p className="mt-2 text-sm text-slate-300">รอบหน้าลองเดินหลบให้นานกว่านี้นะ</p>

      <dl className="mt-4 grid grid-cols-3 gap-2 text-sm">
        <div className="rounded-lg border border-white/10 bg-white/5 py-2">
          <dt className="text-[11px] text-slate-400">เลเวล</dt>
          <dd className="text-lg font-black text-white">{summary.level}</dd>
        </div>
        <div className="rounded-lg border border-white/10 bg-white/5 py-2">
          <dt className="text-[11px] text-slate-400">ล้มมอน</dt>
          <dd className="text-lg font-black text-white">{summary.kills}</dd>
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
 * แป้นบังคับสำหรับจอสัมผัส
 *
 * ลากนิ้วจากกลางแป้น ทิศทางคือทิศที่ลากไป ระยะคือความเร็ว
 * ปล่อยนิ้วแล้วหยุดทันที
 *
 * เขียนลงใน ref ตรง ๆ ไม่ผ่าน state
 * เพราะนิ้วขยับถี่มาก ถ้า setState ทุกครั้งจะเรนเดอร์ใหม่ทั้งหน้าจนกระตุก
 */
function Joystick({ inputRef }: { inputRef: MutableRefObject<Input> }) {
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
    <div className="mt-4 flex justify-center">
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
        className="relative h-36 w-36 touch-none rounded-full border-2 border-white/15 bg-night-800/70"
      >
        <div
          className="absolute left-1/2 top-1/2 h-14 w-14 rounded-full border-2 border-sky-400/60 bg-sky-500/30"
          style={{ transform: `translate(calc(-50% + ${knob.x}px), calc(-50% + ${knob.y}px))` }}
        />
      </div>
    </div>
  )
}
