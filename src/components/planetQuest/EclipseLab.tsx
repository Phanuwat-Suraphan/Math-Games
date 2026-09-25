import { useEffect, useMemo, useState } from 'react'
import { Button } from '../Button'
import { playSfx } from '../../services/audioService'
import { createRng } from '../../math/rng'
import { ECLIPSE_QUESTIONS } from '../../planetQuest/content'
import {
  ECLIPSE_NAMES,
  LAB,
  LAB_FINAL_QUESTIONS,
  LAB_TASKS,
  MOON_SLOTS,
  eclipseAt,
  moonPhasePath,
  moonPoint,
  normalizeSlot,
  orbitRadius,
  shadowShapes,
  slotAngle,
} from '../../planetQuest/eclipse'
import type { EclipseReport, LabState, LabTask } from '../../planetQuest/eclipse'
import { labStars } from '../../planetQuest/games'
import { ChoiceList, Explain, ProgressDots } from './QuestParts'
import type { StageGameProps } from './QuestParts'

/**
 * ด่านบนโลก · ห้องทดลองอุปราคา
 *
 * สามภารกิจที่ต้องขยับดวงจันทร์เอง (สุริยุปราคาเต็มดวง จันทรุปราคาเต็มดวง สุริยุปราคาวงแหวน)
 * ทำสำเร็จแล้วได้เกร็ดสั้น ๆ หนึ่งบรรทัด แล้วปิดท้ายด้วยคำถามข้อเดียว
 *
 * ภาพมีสองส่วน ด้านซ้ายคือภาพมองจากด้านบนแบบในหนังสือเรียน
 * ด้านขวาคือ "ท้องฟ้าที่มองจากโลก" ซึ่งเป็นส่วนที่หนังสือวาดให้ไม่ได้
 * เด็กจะเห็นว่าการเรียงตัวแบบนี้ทำให้ท้องฟ้าหน้าตาเป็นอย่างไรจริง ๆ
 */

type Step = { kind: 'task'; task: LabTask } | { kind: 'question'; key: string }

const FINAL_COUNT = 1

function points(shape: [number, number][]): string {
  return shape.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
}

/** ภาพมองจากด้านบน */
export function TopView({
  state,
  report,
  onSlot,
  interactive,
}: {
  state: LabState
  report: EclipseReport
  onSlot: (slot: number) => void
  interactive: boolean
}) {
  const shadows = shadowShapes(state)
  const moon = moonPoint(state)
  const radius = orbitRadius(state)
  const lunarTotal = report.kind === 'lunar-total'
  const lunarPart = report.kind === 'lunar-partial'
  const solarTotal = report.kind === 'solar-total'
  const solarAny = report.kind.startsWith('solar')

  return (
    <svg
      viewBox={`0 0 ${LAB.width} ${LAB.height}`}
      className="block h-auto w-full"
      role="img"
      aria-label={`ภาพมองจากด้านบน ดวงจันทร์อยู่ตำแหน่ง${MOON_SLOTS[state.slot]?.name ?? ''} ${ECLIPSE_NAMES[report.kind]}`}
    >
      <defs>
        <radialGradient id="pq-sun" cx="0.7" cy="0.5" r="0.6">
          <stop offset="0%" stopColor="#fff7d1" />
          <stop offset="60%" stopColor="#ffc93c" />
          <stop offset="100%" stopColor="#f08a12" />
        </radialGradient>
      </defs>
      <rect width={LAB.width} height={LAB.height} fill="#050818" />
      {/* แสงอาทิตย์ทาบทั้งภาพจาง ๆ เงาจึงเห็นเป็นกรวยสีเข้มที่ตัดผ่านแสง ไม่กลืนไปกับพื้นหลัง */}
      <rect width={LAB.width} height={LAB.height} fill="#fde68a" fillOpacity={0.1} />

      {/* แสงอาทิตย์ส่องมาจากทางซ้ายเป็นแนวขนาน */}
      {[40, 70, 100, 160, 190, 220].map((y) => (
        <line key={y} x1={60} y1={y} x2={LAB.width} y2={y} stroke="#fde68a" strokeOpacity={0.12} strokeWidth={1} />
      ))}
      <circle cx={-70} cy={LAB.earthY} r={125} fill="url(#pq-sun)" />
      <text x={8} y={20} fill="#fde68a" fontSize={12} fontWeight={700}>
        ดวงอาทิตย์
      </text>

      <polygon points={points(shadows.earthPenumbra)} fill="#0f172a" fillOpacity={0.45} />
      <polygon points={points(shadows.earthUmbra)} fill="#020617" fillOpacity={0.85} />
      <polygon points={points(shadows.moonPenumbra)} fill="#0f172a" fillOpacity={0.5} />
      <polygon points={points(shadows.moonUmbra)} fill="#020617" fillOpacity={0.9} />

      <text x={LAB.width - 70} y={LAB.earthY + 4} fill="#94a3b8" fontSize={10}>
        เงามืดของโลก
      </text>

      <circle
        cx={LAB.earthX}
        cy={LAB.earthY}
        r={radius}
        fill="none"
        stroke="#94a3b8"
        strokeOpacity={0.35}
        strokeDasharray="3 5"
      />

      {/* โลก ด้านซ้ายเป็นกลางวัน ด้านขวาเป็นกลางคืน */}
      <circle cx={LAB.earthX} cy={LAB.earthY} r={LAB.earthRadius} fill="#12305c" />
      <path
        d={`M ${LAB.earthX} ${LAB.earthY - LAB.earthRadius} A ${LAB.earthRadius} ${LAB.earthRadius} 0 0 0 ${LAB.earthX} ${LAB.earthY + LAB.earthRadius} Z`}
        fill="#3b82f6"
      />
      {solarAny ? (
        // จุดที่เงาของดวงจันทร์ตกบนผิวโลก เงามัวกว้าง เงามืดเป็นจุดเล็ก
        <>
          <circle cx={LAB.earthX - LAB.earthRadius + 2} cy={LAB.earthY} r={7} fill="#020617" fillOpacity={0.45} />
          {solarTotal ? (
            <circle cx={LAB.earthX - LAB.earthRadius + 1.5} cy={LAB.earthY} r={2.2} fill="#020617" />
          ) : null}
        </>
      ) : null}
      <text x={LAB.earthX - 10} y={LAB.earthY + LAB.earthRadius + 14} fill="#bfdbfe" fontSize={11} fontWeight={700}>
        โลก
      </text>

      {/* จุดวางดวงจันทร์ทั้งแปดตำแหน่ง */}
      {MOON_SLOTS.map((slot, index) => {
        const angle = slotAngle(index)
        const x = LAB.earthX - radius * Math.cos(angle)
        const y = LAB.earthY + radius * Math.sin(angle)
        const here = index === state.slot
        return (
          <g
            key={slot.name}
            onClick={interactive ? () => onSlot(index) : undefined}
            style={{ cursor: interactive ? 'pointer' : 'default' }}
          >
            <circle cx={x} cy={y} r={13} fill="transparent" />
            {here ? null : <circle cx={x} cy={y} r={3} fill="#cbd5e1" fillOpacity={0.5} />}
          </g>
        )
      })}

      {/* ดวงจันทร์ ด้านที่หันหาดวงอาทิตย์สว่างเสมอ */}
      <circle
        cx={moon.x}
        cy={moon.y}
        r={LAB.moonRadius}
        fill={lunarTotal ? '#9a3412' : '#334155'}
        stroke="#67e8f9"
        strokeWidth={1.2}
      />
      {lunarTotal ? null : (
        <path
          d={`M ${moon.x} ${moon.y - LAB.moonRadius} A ${LAB.moonRadius} ${LAB.moonRadius} 0 0 0 ${moon.x} ${moon.y + LAB.moonRadius} Z`}
          fill={lunarPart ? '#7c2d12' : '#e2e8f0'}
        />
      )}
      <text x={moon.x + 9} y={moon.y - 8} fill="#e2e8f0" fontSize={10}>
        ดวงจันทร์
      </text>
    </svg>
  )
}

/** ท้องฟ้าที่มองจากโลก */
export function SkyView({ report }: { report: EclipseReport }) {
  const sky = report.sky
  const cx = 60
  const cy = 60

  if (sky.kind === 'day') {
    const sunR = 34
    const moonR = sunR * sky.moonSize
    const covered = report.kind === 'solar-total'
    return (
      <svg viewBox="0 0 120 120" className="h-auto w-full" role="img" aria-label={`มองจากโลก: ${ECLIPSE_NAMES[report.kind]}`}>
        <defs>
          <radialGradient id="pq-corona">
            <stop offset="45%" stopColor="#f8fafc" stopOpacity={0.9} />
            <stop offset="100%" stopColor="#f8fafc" stopOpacity={0} />
          </radialGradient>
        </defs>
        <rect width={120} height={120} fill={covered ? '#0b1026' : '#1e3a8a'} />
        {covered ? <circle cx={cx} cy={cy} r={sunR * 1.7} fill="url(#pq-corona)" /> : null}
        <circle cx={cx} cy={cy} r={sunR} fill="#fcd34d" />
        <circle cx={cx + sky.offset * sunR} cy={cy} r={moonR} fill="#0b1026" />
      </svg>
    )
  }

  const r = 34
  const inShadow = report.kind === 'lunar-total' || report.kind === 'lunar-partial'
  const path = moonPhasePath(cx, cy, r, sky.litFraction, sky.waxing)
  return (
    <svg viewBox="0 0 120 120" className="h-auto w-full" role="img" aria-label={`มองจากโลก: ${ECLIPSE_NAMES[report.kind]}`}>
      <rect width={120} height={120} fill="#050818" />
      {[
        [14, 18],
        [98, 22],
        [20, 96],
        [104, 88],
        [60, 10],
      ].map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r={1} fill="#e2e8f0" />
      ))}
      <circle cx={cx} cy={cy} r={r} fill="#1e293b" />
      {report.kind === 'lunar-total' ? (
        <circle cx={cx} cy={cy} r={r} fill="#b45309" />
      ) : path ? (
        <path d={path} fill="#e5e7eb" opacity={sky.penumbra ? 0.7 : 1} />
      ) : null}
      {report.kind === 'lunar-partial' && inShadow ? (
        <rect x={cx - r} y={cy - r} width={r * 2 * sky.shadow} height={r * 2} fill="#7c2d12" opacity={0.8} />
      ) : null}
    </svg>
  )
}

export function EclipseLab({ seed, onFinish }: StageGameProps) {
  const steps = useMemo<Step[]>(() => {
    const rng = createRng(`pq-eclipse-${seed}`)
    const finals = rng.shuffle(LAB_FINAL_QUESTIONS).slice(0, FINAL_COUNT)
    return [
      ...LAB_TASKS.map((task): Step => ({ kind: 'task', task })),
      ...finals.map((key): Step => ({ kind: 'question', key })),
    ]
  }, [seed])

  const [index, setIndex] = useState(0)
  const [lab, setLab] = useState<LabState>(() => (LAB_TASKS[0] as LabTask).start)
  const [mistakes, setMistakes] = useState(0)
  const [taskDone, setTaskDone] = useState(false)
  const [taskMiss, setTaskMiss] = useState<string | null>(null)
  const [wrong, setWrong] = useState<string[]>([])
  const [solved, setSolved] = useState(false)

  const step = steps[index] as Step
  const report = eclipseAt(lab)
  const question = step.kind === 'question' ? ECLIPSE_QUESTIONS[step.key] : undefined
  const options = useMemo(() => {
    if (!question) return []
    return createRng(`pq-eclipse-options-${seed}-${question.id}`).shuffle([question.answer, ...question.wrong])
  }, [question, seed])

  const interactive = step.kind === 'task' && !taskDone

  const moveTo = (slot: number): void => {
    if (!interactive) return
    playSfx('click')
    setTaskMiss(null)
    setLab((current) => ({ ...current, slot: normalizeSlot(slot) }))
  }

  const confirm = (): void => {
    if (step.kind !== 'task' || taskDone) return
    if (report.kind === step.task.goal) {
      playSfx('correct')
      setTaskDone(true)
      setTaskMiss(null)
      return
    }
    playSfx('wrong')
    setMistakes((count) => count + 1)
    setTaskMiss(
      report.kind === 'none'
        ? `ตอนนี้ยังไม่เกิดอุปราคา · ${step.task.hint}`
        : `ตอนนี้เกิด${ECLIPSE_NAMES[report.kind]} ยังไม่ใช่ที่ภารกิจต้องการ · ${step.task.hint}`,
    )
  }

  const pick = (option: string): void => {
    if (!question || solved) return
    if (option === question.answer) {
      playSfx('correct')
      setSolved(true)
      return
    }
    playSfx('wrong')
    setMistakes((count) => count + 1)
    setWrong((current) => [...current, option])
  }

  const next = (): void => {
    const nextIndex = index + 1
    if (nextIndex >= steps.length) {
      const questionCount = steps.filter((item) => item.kind === 'question').length
      onFinish({
        stars: labStars(mistakes),
        summary: `สร้างอุปราคาได้ครบ ${LAB_TASKS.length} แบบ ตอบคำถาม ${questionCount} ข้อ พลาด ${mistakes} ครั้ง`,
      })
      return
    }
    const upcoming = steps[nextIndex] as Step
    if (upcoming.kind === 'task') setLab(upcoming.task.start)
    setIndex(nextIndex)
    setTaskDone(false)
    setTaskMiss(null)
    setWrong([])
    setSolved(false)
  }

  const slotInfo = MOON_SLOTS[lab.slot]

  return (
    <div className="space-y-3">
      <ProgressDots total={steps.length} current={index} />

      <div className="grid gap-3 md:grid-cols-[1fr_180px]">
        <div className="pq-lab overflow-hidden rounded-xl border border-white/10">
          <TopView state={lab} report={report} onSlot={moveTo} interactive={interactive} />
        </div>
        <div className="grid grid-cols-[120px_1fr] items-center gap-3 md:grid-cols-1">
          <div className="overflow-hidden rounded-xl border border-white/10">
            <SkyView report={report} />
          </div>
          <div className="text-sm">
            <p className="text-xs font-bold text-slate-400">มองจากโลก</p>
            <p className="font-black text-white">{ECLIPSE_NAMES[report.kind]}</p>
            <p className="mt-1 text-xs text-slate-300">
              ดวงจันทร์: {slotInfo?.name} · {slotInfo?.day}
              {lab.far ? ' · อยู่ไกลโลก' : ' · อยู่ใกล้โลก'}
            </p>
          </div>
        </div>
      </div>

      {step.kind === 'task' ? (
        <div className="sol-comms p-4">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-300">ภารกิจในห้องทดลอง</p>
          <p className="mt-1 text-base font-black text-white sm:text-lg">{step.task.instruction}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button variant="secondary" onClick={() => moveTo(lab.slot - 1)} disabled={!interactive} aria-label="เลื่อนดวงจันทร์ย้อนกลับ">
              ◀ ถอย
            </Button>
            <Button variant="secondary" onClick={() => moveTo(lab.slot + 1)} disabled={!interactive} aria-label="เลื่อนดวงจันทร์ไปข้างหน้า">
              เดินหน้า ▶
            </Button>
            {step.task.allowFar ? (
              <button
                type="button"
                aria-pressed={lab.far}
                disabled={!interactive}
                onClick={() => {
                  playSfx('click')
                  setTaskMiss(null)
                  setLab((current) => ({ ...current, far: !current.far }))
                }}
                className={`sol-toggle ${lab.far ? 'sol-toggle-on' : ''}`}
              >
                {lab.far ? '🔭 ดวงจันทร์อยู่ไกลโลก' : '🔭 ดวงจันทร์อยู่ใกล้โลก'}
              </button>
            ) : null}
            <Button onClick={confirm} disabled={taskDone} silent icon="✅">
              ยืนยันตำแหน่ง
            </Button>
          </div>
          <p className="mt-2 text-xs text-slate-400">
            แตะจุดบนวงโคจรเพื่อย้ายดวงจันทร์ได้เลย · ในภาพนี้วงโคจรไม่เอียงเหมือนในหนังสือเรียน
          </p>
          {taskMiss ? (
            <Explain tone="hint" title="ลองอีกครั้งนะ">
              {taskMiss}
            </Explain>
          ) : null}
          {taskDone ? (
            <Explain tone="good" title={`🎉 สำเร็จ! เกิด${ECLIPSE_NAMES[report.kind]}`}>
              {step.task.fact} · ดูท้องฟ้าที่มองจากโลกในกรอบเล็กด้วยนะ
            </Explain>
          ) : null}
        </div>
      ) : question ? (
        <div className="sol-comms p-4">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-300">คำถามจากห้องทดลอง</p>
          <p className="mt-1 text-base font-black text-white sm:text-lg">{question.text}</p>
          <div className="mt-3">
            <ChoiceList options={options} answer={question.answer} wrong={wrong} solved={solved} onPick={pick} columns={1} />
          </div>
          {solved ? (
            <Explain tone="good" title="ถูกต้อง!">
              {question.explain}
            </Explain>
          ) : wrong.length > 0 ? (
            <p className="mt-2 text-sm font-semibold text-ember-200">ยังไม่ถูก ลองอ่านตัวเลือกที่เหลืออีกครั้ง</p>
          ) : null}
        </div>
      ) : null}

      {(step.kind === 'task' && taskDone) || (step.kind === 'question' && solved) ? (
        <div className="flex justify-end">
          <Button size="lg" onClick={next} icon="➡️">
            {index + 1 >= steps.length ? 'จบด่าน' : 'ต่อไป'}
          </Button>
        </div>
      ) : null}
    </div>
  )
}

/**
 * ห้องทดลองอุปราคาแบบเล่นอิสระ สำหรับโหมดสำรวจ
 *
 * ไม่มีภารกิจ ไม่มีคะแนน หมุนดวงจันทร์ไปรอบโลกได้เรื่อย ๆ แล้วดูว่าท้องฟ้าเปลี่ยนไปอย่างไร
 * ปุ่ม "หมุนเอง" พาดวงจันทร์เดินครบหนึ่งเดือนให้ดูทีละตำแหน่ง เหมือนดูภาพเคลื่อนไหว
 */
export function EclipseSandbox({ reduceMotion }: { reduceMotion: boolean }) {
  const [lab, setLab] = useState<LabState>({ slot: 2, far: false })
  const [playing, setPlaying] = useState(false)
  const report = eclipseAt(lab)
  const slotInfo = MOON_SLOTS[lab.slot]

  useEffect(() => {
    if (!playing) return
    const timer = window.setInterval(
      () => setLab((current) => ({ ...current, slot: normalizeSlot(current.slot + 1) })),
      reduceMotion ? 2200 : 1300,
    )
    return () => window.clearInterval(timer)
  }, [playing, reduceMotion])

  const move = (slot: number): void => {
    playSfx('click')
    setPlaying(false)
    setLab((current) => ({ ...current, slot: normalizeSlot(slot) }))
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-3 md:grid-cols-[1fr_180px]">
        <div className="pq-lab overflow-hidden rounded-xl border border-white/10">
          <TopView state={lab} report={report} onSlot={move} interactive />
        </div>
        <div className="grid grid-cols-[120px_1fr] items-center gap-3 md:grid-cols-1">
          <div className="overflow-hidden rounded-xl border border-white/10">
            <SkyView report={report} />
          </div>
          <div className="text-sm">
            <p className="text-xs font-bold text-slate-400">มองจากโลก</p>
            <p className="font-black text-white">{report.kind === 'none' ? slotInfo?.name : ECLIPSE_NAMES[report.kind]}</p>
            <p className="mt-1 text-xs text-slate-300">{slotInfo?.day}</p>
          </div>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="secondary" onClick={() => move(lab.slot - 1)} aria-label="เลื่อนดวงจันทร์ย้อนกลับ">
          ◀
        </Button>
        <Button variant="secondary" onClick={() => move(lab.slot + 1)} aria-label="เลื่อนดวงจันทร์ไปข้างหน้า">
          ▶
        </Button>
        <button
          type="button"
          aria-pressed={playing}
          onClick={() => setPlaying((value) => !value)}
          className={`sol-toggle ${playing ? 'sol-toggle-on' : ''}`}
        >
          {playing ? '⏸ หยุดหมุน' : '▶️ ให้ดวงจันทร์หมุนเอง'}
        </button>
        <button
          type="button"
          aria-pressed={lab.far}
          onClick={() => {
            playSfx('click')
            setLab((current) => ({ ...current, far: !current.far }))
          }}
          className={`sol-toggle ${lab.far ? 'sol-toggle-on' : ''}`}
        >
          {lab.far ? '🔭 ดวงจันทร์อยู่ไกลโลก' : '🔭 ดวงจันทร์อยู่ใกล้โลก'}
        </button>
      </div>
      <p className="text-xs text-slate-400">
        แตะจุดบนวงโคจรเพื่อย้ายดวงจันทร์ ลองหาตำแหน่งที่ทำให้เกิดอุปราคาทั้งสามแบบดูนะ
      </p>
    </div>
  )
}
