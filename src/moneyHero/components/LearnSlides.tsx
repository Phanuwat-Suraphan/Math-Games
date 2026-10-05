import { useState } from 'react'
import type { LearnSlide } from '../data/levels'
import { CHARACTERS } from '../data/characters'
import { speak } from '../utils/speech'
import { playSound } from '../utils/sound'
import { CharacterArt } from './Art'
import { VisualView } from './Visual'

/**
 * บทเรียนแบบสไลด์: ตัวละครพูดทีละประโยคสั้น ๆ พร้อมภาพเงินจำลอง
 * ใช้ทั้งในขั้น LEARN และในปุ่ม 📖 เรียนรู้ใหม่ ระหว่างทำโจทย์
 */
export function LearnSlides({
  slides,
  onDone,
  doneLabel = 'พร้อมแล้ว! ไปฝึกกัน ▶',
}: {
  slides: LearnSlide[]
  onDone: () => void
  doneLabel?: string
}) {
  const [i, setI] = useState(0)
  const slide = slides[i]
  const last = i === slides.length - 1
  const c = CHARACTERS[slide.npc]

  return (
    <div className="mh-learn">
      <div className="mh-learn-dots" aria-hidden="true">
        {slides.map((_, k) => (
          <span key={k} className={k === i ? 'is-on' : k < i ? 'is-done' : ''} />
        ))}
      </div>
      <div className="mh-learn-slide" key={i}>
        <div className="mh-learn-npc">
          <CharacterArt id={slide.npc} size={96} />
          <span className="mh-learn-npc-name">{c.name}</span>
        </div>
        <div className="mh-learn-body">
          <h2 className="mh-learn-title">
            {slide.title}
            <button
              type="button"
              className="mh-speak"
              aria-label="ฟัง"
              onClick={() => speak(`${slide.title} ${slide.lines.join(' ')}`)}
            >
              🔈
            </button>
          </h2>
          <ul className="mh-learn-lines">
            {slide.lines.map((line, k) => (
              <li key={k}>{line}</li>
            ))}
          </ul>
        </div>
      </div>
      {slide.visual && (
        <div className="mh-learn-visual">
          <VisualView visual={slide.visual} />
        </div>
      )}
      <div className="mh-row-buttons">
        <button
          type="button"
          className="mh-btn mh-btn-soft"
          disabled={i === 0}
          onClick={() => {
            playSound('click')
            setI(i - 1)
          }}
        >
          ◀ ย้อนกลับ
        </button>
        {last ? (
          <button type="button" className="mh-btn mh-btn-gold" onClick={onDone} data-testid="mh-learn-done">
            {doneLabel}
          </button>
        ) : (
          <button
            type="button"
            className="mh-btn mh-btn-go"
            data-testid="mh-learn-next"
            onClick={() => {
              playSound('click')
              setI(i + 1)
            }}
          >
            ต่อไป ▶
          </button>
        )}
      </div>
    </div>
  )
}
