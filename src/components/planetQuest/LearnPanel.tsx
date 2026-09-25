import { useEffect, useMemo, useState } from 'react'
import { Button } from '../Button'
import { playSfx } from '../../services/audioService'
import { createRng } from '../../math/rng'
import { eclipseAt } from '../../planetQuest/eclipse'
import { LESSONS } from '../../planetQuest/lessons'
import type { Lesson, LessonDiagram, LessonSlide } from '../../planetQuest/lessons'
import { PLANETS, getPlanet } from '../../solar/planets'
import type { PlanetId } from '../../solar/planets'
import { stageFor } from '../../planetQuest/stages'
import { ChoiceList, Explain, ProgressDots } from './QuestParts'
import { SkyView, TopView } from './EclipseLab'

/**
 * โหมดเรียนรู้ · บทเรียนสั้น ๆ ทีละการ์ด
 *
 * การ์ดหนึ่งใบมีประโยคสั้นไม่กี่ประโยค ปุ่มแตะเปิดดู และภาพประกอบถ้ามี
 * ฉากสามมิติด้านบนบินไปหาดาวที่การ์ดกำลังพูดถึง เด็กจึงเห็นของจริงไปพร้อมกับอ่าน
 * จบบทแล้วมีคำถามเช็กความเข้าใจหนึ่งข้อ ตอบถูกแล้วบทนั้นได้เครื่องหมายถูก
 */

export type LessonFocus = NonNullable<LessonSlide['focus']>

/** ดาวเคราะห์เรียงตามระยะ แบ่งชั้นในชั้นนอก และแถบดาวเคราะห์น้อยตรงกลาง */
function LayersDiagram() {
  const width = 420
  const y = 60
  const xs = [60, 100, 140, 180, 250, 300, 350, 395]
  // ขนาดเรียงตามจริง (ดาวพุธเล็กสุด ดาวพฤหัสบดีใหญ่สุด) แต่ไม่ได้ตามสัดส่วนจริง ไม่งั้นดาวชั้นในจะเป็นแค่จุด
  const radii = [4, 6.5, 7, 5, 16, 14, 10, 10]
  return (
    <svg viewBox={`0 0 ${width} 120`} className="block h-auto w-full" role="img" aria-label="ดาวเคราะห์ชั้นในสี่ดวง แถบดาวเคราะห์น้อย และดาวเคราะห์ชั้นนอกสี่ดวง">
      <rect width={width} height={120} fill="#050818" />
      <circle cx={-10} cy={y} r={40} fill="#fbbf24" />
      <rect x={200} y={20} width={24} height={80} fill="#9b8f80" opacity={0.25} rx={6} />
      <text x={212} y={112} fill="#94a3b8" fontSize={9} textAnchor="middle">
        แถบดาวเคราะห์น้อย
      </text>
      <text x={120} y={16} fill="#fca5a5" fontSize={11} fontWeight={700} textAnchor="middle">
        ชั้นใน · ดาวหิน
      </text>
      <text x={322} y={16} fill="#93c5fd" fontSize={11} fontWeight={700} textAnchor="middle">
        ชั้นนอก · ดาวแก๊ส
      </text>
      {PLANETS.map((planet, index) => (
        <g key={planet.id}>
          <circle cx={xs[index]} cy={y} r={radii[index]} fill={planet.color} />
          <text x={xs[index]} y={y + 32} fill="#e2e8f0" fontSize={9} textAnchor="middle">
            {planet.name.replace('ดาว', '')}
          </text>
        </g>
      ))}
    </svg>
  )
}

function StarColoursDiagram() {
  const stops = [
    { colour: '#93c5fd', label: 'น้ำเงิน', note: 'ร้อนที่สุด' },
    { colour: '#f8fafc', label: 'ขาว', note: '' },
    { colour: '#fde047', label: 'เหลือง', note: 'ดวงอาทิตย์' },
    { colour: '#fb923c', label: 'ส้ม', note: '' },
    { colour: '#f87171', label: 'แดง', note: 'เย็นที่สุด' },
  ]
  return (
    <div className="grid grid-cols-5 gap-2 rounded-xl border border-white/10 bg-night-900 p-3 text-center">
      {stops.map((stop) => (
        <div key={stop.label}>
          <span
            aria-hidden="true"
            className="mx-auto block h-10 w-10 rounded-full"
            style={{ background: stop.colour, boxShadow: `0 0 18px ${stop.colour}` }}
          />
          <span className="mt-1 block text-xs font-bold text-white">{stop.label}</span>
          <span className="block text-[10px] text-slate-400">{stop.note}</span>
        </div>
      ))}
    </div>
  )
}

function Diagram({ diagram }: { diagram: LessonDiagram }) {
  if (diagram.kind === 'layers') return <LayersDiagram />
  if (diagram.kind === 'star-colours') return <StarColoursDiagram />
  const report = eclipseAt(diagram.state)
  return (
    <div className="grid grid-cols-[1fr_96px] gap-2 sm:grid-cols-[1fr_130px]">
      <div className="overflow-hidden rounded-xl border border-white/10">
        <TopView state={diagram.state} report={report} onSlot={() => undefined} interactive={false} />
      </div>
      <div className="overflow-hidden rounded-xl border border-white/10 self-start">
        <SkyView report={report} />
      </div>
    </div>
  )
}

function Slide({ slide }: { slide: LessonSlide }) {
  const [open, setOpen] = useState<string[]>([])
  return (
    <div className="sol-comms p-5">
      <p className="text-4xl" aria-hidden="true">
        {slide.emoji}
      </p>
      <h3 className="mt-1 text-xl font-black text-white sm:text-2xl">{slide.title}</h3>
      <ul className="mt-2 space-y-1.5 text-base leading-relaxed text-slate-100">
        {slide.lines.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>

      {slide.reveals ? (
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {slide.reveals.map((reveal) => {
            const shown = open.includes(reveal.label)
            return (
              <button
                key={reveal.label}
                type="button"
                aria-expanded={shown}
                onClick={() => {
                  playSfx('click')
                  setOpen((current) => (current.includes(reveal.label) ? current : [...current, reveal.label]))
                }}
                className={`pq-reveal ${shown ? 'pq-reveal-open' : ''}`}
              >
                <span className="block font-black text-white">{reveal.label}</span>
                <span className="block text-sm text-slate-200">{shown ? reveal.text : 'แตะเพื่อเปิดดู 👆'}</span>
              </button>
            )
          })}
        </div>
      ) : null}

      {slide.diagram ? (
        <div className="mt-3">
          <Diagram diagram={slide.diagram} />
        </div>
      ) : null}

      {slide.fact ? <p className="mt-3 rounded-xl bg-gold-500/10 p-3 text-sm text-gold-100">💡 รู้ไหม: {slide.fact}</p> : null}
    </div>
  )
}

function LessonView({
  lesson,
  done,
  onFocus,
  onComplete,
  onExit,
  onPractice,
}: {
  lesson: Lesson
  done: boolean
  onFocus: (focus: LessonFocus) => void
  onComplete: () => void
  onExit: () => void
  onPractice: (planet: PlanetId) => void
}) {
  const [index, setIndex] = useState(0)
  const [wrong, setWrong] = useState<string[]>([])
  const [solved, setSolved] = useState(false)
  const total = lesson.slides.length + 1
  const slide = lesson.slides[index]
  const options = useMemo(
    () => createRng(`pq-lesson-${lesson.id}`).shuffle([lesson.check.answer, ...lesson.check.wrong]),
    [lesson],
  )

  useEffect(() => {
    if (slide?.focus) onFocus(slide.focus)
  }, [onFocus, slide])

  const pick = (option: string): void => {
    if (solved) return
    if (option === lesson.check.answer) {
      playSfx('correct')
      setSolved(true)
      onComplete()
      return
    }
    playSfx('wrong')
    setWrong((current) => [...current, option])
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-lg font-black text-white">
          {lesson.emoji} {lesson.title} {done ? '✅' : ''}
        </p>
        <Button variant="ghost" onClick={onExit}>
          ← บทเรียนทั้งหมด
        </Button>
      </div>
      <ProgressDots total={total} current={index} />

      {slide ? (
        <Slide key={slide.id} slide={slide} />
      ) : (
        <div className="sol-comms p-5">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-300">✏️ เช็กความเข้าใจ</p>
          <p className="mt-1 text-lg font-black text-white">{lesson.check.text}</p>
          <div className="mt-3">
            <ChoiceList options={options} answer={lesson.check.answer} wrong={wrong} solved={solved} onPick={pick} columns={1} />
          </div>
          {solved ? (
            <Explain tone="good" title="ถูกต้อง! จบบทนี้แล้ว 🎉">
              {lesson.check.explain} · ลองใช้ความรู้นี้ในเกม{stageFor(lesson.practice).title}บน{getPlanet(lesson.practice).name}ดูไหม
            </Explain>
          ) : wrong.length > 0 ? (
            <p className="mt-2 text-sm font-semibold text-ember-200">ยังไม่ใช่ ลองย้อนไปอ่านการ์ดอีกครั้งก็ได้นะ</p>
          ) : null}
        </div>
      )}

      <div className="flex justify-between gap-2">
        <Button variant="secondary" disabled={index === 0} onClick={() => setIndex(index - 1)}>
          ◀ ก่อนหน้า
        </Button>
        {index < lesson.slides.length ? (
          <Button onClick={() => setIndex(index + 1)} icon="▶️">
            {index + 1 === lesson.slides.length ? 'ไปเช็กความเข้าใจ' : 'ต่อไป'}
          </Button>
        ) : solved ? (
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="secondary" onClick={() => onPractice(lesson.practice)} icon="🎮">
              {`ไปฝึกที่${getPlanet(lesson.practice).name}`}
            </Button>
            <Button onClick={onExit} icon="📚">
              เลือกบทต่อไป
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  )
}

export function LearnPanel({
  finished,
  onFocus,
  onComplete,
  onPractice,
}: {
  finished: readonly string[]
  onFocus: (focus: LessonFocus) => void
  onComplete: (lessonId: string) => void
  onPractice: (planet: PlanetId) => void
}) {
  const [open, setOpen] = useState<string | null>(null)
  const lesson = LESSONS.find((item) => item.id === open)

  if (lesson) {
    return (
      <section className="mt-4">
        <LessonView
          key={lesson.id}
          lesson={lesson}
          done={finished.includes(lesson.id)}
          onFocus={onFocus}
          onComplete={() => onComplete(lesson.id)}
          onExit={() => {
            setOpen(null)
            onFocus('overview')
          }}
          onPractice={onPractice}
        />
      </section>
    )
  }

  return (
    <section className="mt-4 space-y-3">
      <p className="text-sm text-slate-300">
        อ่านจบแล้ว {finished.length}/{LESSONS.length} บท · เลือกบทไหนก่อนก็ได้
      </p>
      <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {LESSONS.map((item, order) => (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => {
                playSfx('click')
                setOpen(item.id)
              }}
              className={`sol-option ${finished.includes(item.id) ? 'sol-option-on' : ''}`}
            >
              <span className="flex items-center gap-2">
                <span className="text-3xl" aria-hidden="true">
                  {item.emoji}
                </span>
                <span>
                  <span className="block text-xs font-bold text-slate-400">บทที่ {order + 1}</span>
                  <span className="block text-base font-black text-white">{item.title}</span>
                </span>
              </span>
              <span className="mt-1 block text-xs text-slate-300">
                {item.slides.length} การ์ด + เช็กความเข้าใจ{finished.includes(item.id) ? ' · อ่านจบแล้ว ✅' : ''}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
