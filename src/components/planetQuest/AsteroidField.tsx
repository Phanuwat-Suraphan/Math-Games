import { useMemo, useState } from 'react'
import { Button } from '../Button'
import { playSfx } from '../../services/audioService'
import { asteroidStars, buildAsteroidRound, comboPoints } from '../../planetQuest/games'
import { Explain, ProgressDots, ScoreBar } from './QuestParts'
import type { StageGameProps } from './QuestParts'

/**
 * ด่านบนดาวเสาร์ · ฝ่าดงอุกกาบาตแห่งวงแหวน
 *
 * คำถามขึ้นบนจอ อุกกาบาตสามก้อนลอยอยู่ข้างหน้ายาน แต่ละก้อนมีคำตอบหนึ่งข้อ
 * แตะก้อนที่ถูกเพื่อยิงทำลาย ก้อนที่ผิดจะแตกร้าวแล้วยิงซ้ำไม่ได้
 *
 * ตั้งใจให้อุกกาบาตลอยอยู่กับที่แล้วโยกไปมา ไม่ได้พุ่งเข้าหาเหมือนเกมยิงทั่วไป
 * เพราะคำตอบเป็นประโยค ถ้าก้อนหินเคลื่อนที่เร็ว เด็กที่อ่านช้าจะแพ้เพราะอ่านไม่ทัน
 * ซึ่งไม่ใช่สิ่งที่ด่านนี้ต้องการวัด
 */

/** ตำแหน่งของอุกกาบาตสามก้อน เป็นร้อยละของสนาม */
const ROCK_SPOTS = [
  { x: 18, y: 42 },
  { x: 50, y: 30 },
  { x: 82, y: 44 },
]

const SHIP = { x: 50, y: 90 }

export function AsteroidStage({ seed, reduceMotion, onFinish }: StageGameProps) {
  const round = useMemo(() => buildAsteroidRound(seed), [seed])
  const [index, setIndex] = useState(0)
  const [wrong, setWrong] = useState<string[]>([])
  const [hit, setHit] = useState<string | null>(null)
  const [mistakes, setMistakes] = useState(0)
  const [laser, setLaser] = useState<{ slot: number; shot: number } | null>(null)
  const [score, setScore] = useState(0)
  const [streak, setStreak] = useState(0)
  const [pop, setPop] = useState<{ id: number; points: number; streak: number } | null>(null)

  const item = round[index]
  if (!item) return null

  const shoot = (option: string, slot: number): void => {
    if (hit || wrong.includes(option)) return
    setLaser({ slot, shot: Date.now() })
    window.setTimeout(() => setLaser(null), 260)
    if (option === item.question.answer) {
      playSfx('explode')
      setHit(option)
      // ยิงถูกตั้งแต่นัดแรกของคลื่นถึงจะนับคอมโบต่อ ยิงพลาดก่อนแล้วค่อยถูกได้คะแนนพื้นฐาน
      const nextStreak = wrong.length === 0 ? streak + 1 : 1
      const points = comboPoints(nextStreak)
      setStreak(nextStreak)
      setScore((total) => total + points)
      setPop({ id: Date.now(), points, streak: nextStreak })
      return
    }
    playSfx('hurt')
    setStreak(0)
    setMistakes((count) => count + 1)
    setWrong((current) => [...current, option])
  }

  const next = (): void => {
    if (index + 1 >= round.length) {
      onFinish({ stars: asteroidStars(mistakes), summary: `ฝ่าดงอุกกาบาตได้ ${round.length} คลื่น ยิงพลาด ${mistakes} ครั้ง · ${score} คะแนน` })
      return
    }
    setIndex(index + 1)
    setWrong([])
    setHit(null)
  }

  const target = laser ? ROCK_SPOTS[laser.slot] : undefined

  return (
    <div className="space-y-3">
      <ScoreBar score={score} streak={streak} pop={pop}>
        🛡️ ยานถูกชน {mistakes} · คลื่น {index + 1}/{round.length}
      </ScoreBar>
      <ProgressDots total={round.length} current={index} />

      <div className="sol-comms p-4">
        <p className="text-base font-black leading-relaxed text-white sm:text-lg">{item.question.text}</p>
      </div>

      <div className="pq-field" role="group" aria-label="อุกกาบาตสามก้อน แตะก้อนที่มีคำตอบถูกเพื่อยิง">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true">
          {/* วงแหวนของดาวเสาร์พาดอยู่ด้านหลัง */}
          <ellipse cx={50} cy={8} rx={70} ry={10} fill="none" stroke="#e3d1a6" strokeOpacity={0.25} strokeWidth={3} />
          <ellipse cx={50} cy={8} rx={60} ry={7} fill="none" stroke="#c9b68c" strokeOpacity={0.2} strokeWidth={2} />
          {target ? (
            <line
              x1={SHIP.x}
              y1={SHIP.y - 6}
              x2={target.x}
              y2={target.y}
              stroke="#67e8f9"
              strokeWidth={1.2}
              vectorEffect="non-scaling-stroke"
            />
          ) : null}
        </svg>

        {item.options.map((option, slot) => {
          const spot = ROCK_SPOTS[slot] ?? { x: 50, y: 40 }
          const cracked = wrong.includes(option)
          const boom = hit === option
          return (
            <button
              key={`${index}-${option}`}
              type="button"
              disabled={cracked || hit !== null}
              onClick={() => shoot(option, slot)}
              className={`pq-rock ${reduceMotion ? '' : 'pq-rock-float'} ${cracked ? 'pq-rock-cracked' : ''} ${boom ? 'pq-rock-boom' : ''}`}
              style={{ left: `${spot.x}%`, top: `${spot.y}%`, animationDelay: `${slot * 0.4}s` }}
            >
              <span>{option}</span>
              {cracked ? <span aria-label="ผิด"> ✗</span> : null}
            </button>
          )
        })}

        <span className="pq-ship" aria-hidden="true" style={{ left: `${SHIP.x}%`, top: `${SHIP.y}%` }}>
          🚀
        </span>
      </div>

      {hit ? (
        <>
          <Explain tone="good" title="💥 ตูม! ยิงโดนเป้า">
            {item.question.explain}
          </Explain>
          <div className="flex justify-end">
            <Button size="lg" onClick={next} icon="➡️">
              {index + 1 >= round.length ? 'จบด่าน' : 'คลื่นต่อไป'}
            </Button>
          </div>
        </>
      ) : wrong.length > 0 ? (
        <p className="text-sm font-semibold text-ember-200">ก้อนนั้นไม่ใช่คำตอบ ลองยิงก้อนที่เหลือ</p>
      ) : null}
    </div>
  )
}
