import { useMemo, useState } from 'react'
import { useGame } from '../hooks/useMoneyGame'
import { INNOVATION_NAME } from '../engine/classroom'
import { colourSheet, PALETTE, PICTURES, type ColourLevel, type ColourSheet } from '../engine/pictures'
import { PixelPicture } from '../pages/PuzzlePage'
import { CharacterArt } from '../components/Art'
import type { NpcId } from '../engine/types'
import { PaperPage } from './Paper'

/** ตัวละครถือดินสอสีทักทายที่หัวใบงาน วนกันไปทีละภาพ */
const MASCOTS: NpcId[] = ['rabbit', 'fox', 'bear', 'owl', 'hero']

/**
 * ระบายสีภาพปริศนา (A4 แผ่นละภาพ): แต่ละช่องมีโจทย์เงินสั้น ๆ คำตอบบอกว่าต้องระบายสีอะไร
 * ระบายครบแล้วจะเห็นภาพน่ารัก · หน้าสุดท้ายเป็นเฉลยภาพสีสำหรับครู
 * เส้นทาง #/teacher/print/colour
 */

function Sheet({ s, room, n }: { s: ColourSheet; room: string; n: number }) {
  return (
    <article className="mh-doc mh-colour" data-testid="mh-colour-sheet">
      <header className="mh-ws-head">
        <CharacterArt id={MASCOTS[n % MASCOTS.length]} size={40} mood="happy" className="mh-ws-mascot" />
        <h2>🖍️ ระบายสีภาพปริศนา</h2>
        <p>
          {INNOVATION_NAME} · เรื่อง เงิน · ชั้น {room}
        </p>
        <p className="mh-doc-line">ชื่อ – สกุล</p>
      </header>
      <div className="mh-doc-box">
        <b>วิธีทำ</b> คิดเงินในแต่ละช่อง (หน่วยเป็นบาท) แล้วระบายสีตามคำตอบในตารางสี ช่องว่างไม่ต้องระบาย ระบายครบแล้วจะเห็นภาพอะไรนะ?
      </div>
      <div className="mh-colour-legend">
        {s.legend.map((l) => (
          <span key={l.color} className="mh-colour-key">
            <svg className="mh-colour-crayon" viewBox="0 0 44 20" aria-hidden="true">
              <path d="M3 3H30L41 10L30 17H3Z" fill="#fff" stroke={PALETTE[l.color].hex} strokeWidth={3.2} strokeLinejoin="round" />
              <path d="M9 3V17M30 3V17" stroke={PALETTE[l.color].hex} strokeWidth={2} />
            </svg>
            ได้ <b>{l.answer} บาท</b> ระบายสี<b>{PALETTE[l.color].name}</b>
          </span>
        ))}
      </div>
      <div className="mh-colour-grid">
        {s.cells.map((c, i) => (
          <div key={i} className={`mh-colour-cell ${c.expr ? '' : 'is-empty'}`}>
            {c.expr}
          </div>
        ))}
      </div>
      <p className="mh-doc-line mh-colour-guess">🔍 ภาพของฉันคือ</p>
    </article>
  )
}

export function ColourPrintPage() {
  const { save } = useGame()
  const [which, setWhich] = useState<string>('all')
  const [level, setLevel] = useState<ColourLevel>(1)
  const [seed, setSeed] = useState(1)
  const [withKey, setWithKey] = useState(true)
  const pics = which === 'all' ? PICTURES : PICTURES.filter((p) => p.id === which)
  const sheets = useMemo(() => pics.map((p) => colourSheet(p, seed, level)), [which, seed, level])

  return (
    <PaperPage
      title="🖍️ ระบายสีภาพปริศนา"
      back="/teacher/print"
      testId="mh-print-colour"
      tools={
        <>
          <label>
            ภาพ
            <select value={which} onChange={(e) => setWhich(e.target.value)} data-testid="mh-colour-which">
              <option value="all">ทุกภาพ ({PICTURES.length} แผ่น)</option>
              {PICTURES.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.emoji} {p.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            ระดับ
            <select value={level} onChange={(e) => setLevel(Number(e.target.value) as ColourLevel)} data-testid="mh-colour-level">
              <option value={1}>บวก ลบ</option>
              <option value={2}>บวก ลบ คูณ</option>
            </select>
          </label>
          <label>
            ชุดที่
            <select value={seed} onChange={(e) => setSeed(Number(e.target.value))} data-testid="mh-colour-seed">
              {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          <label>
            <input type="checkbox" checked={withKey} onChange={(e) => setWithKey(e.target.checked)} data-testid="mh-colour-key" /> พิมพ์เฉลยภาพสี
          </label>
          <span className="mh-soft">พิมพ์ขาวดำได้ นักเรียนระบายด้วยสีไม้เอง · ภาพเดียวกันมีให้เล่นในเกมเมนู “ภาพปริศนา”</span>
        </>
      }
    >
      {sheets.map((s, i) => (
        <Sheet key={s.pic.id} s={s} room={save.classroom.room} n={i} />
      ))}
      {withKey && (
        <article className="mh-doc" data-testid="mh-colour-answers">
          <h2 className="mh-ws-keytitle">เฉลยระบายสีภาพปริศนา ชุดที่ {seed} (สำหรับครู)</h2>
          <div className="mh-colour-keys">
            {sheets.map((s) => (
              <figure key={s.pic.id}>
                <PixelPicture pic={s.pic} shown="all" />
                <figcaption>
                  {s.pic.emoji} {s.pic.name} · {s.legend.map((l) => `${l.answer} = ${PALETTE[l.color].name}`).join(' · ')}
                </figcaption>
              </figure>
            ))}
          </div>
        </article>
      )}
    </PaperPage>
  )
}
