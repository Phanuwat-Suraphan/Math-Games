import { useRef } from 'react'
import type { PointerEvent as ReactPointerEvent, ReactNode } from 'react'
import { Button } from '../Button'
import { playSfx } from '../../services/audioService'
import { HOUR_HAND, MINUTE_HAND, clockArt, heroInner } from '../../timeAdventure/art'
import { EMPHASIS_WORDS } from '../../timeAdventure/cards'
import type { ActivityRow, CardVisual, DeckType, TimeCard } from '../../timeAdventure/cards'
import { HERO_INFO } from '../../timeAdventure/engine'
import type { HeroKey } from '../../timeAdventure/engine'

/**
 * ชิ้นส่วนหน้าจอของการ์ดเมืองแห่งเวลา ใช้ร่วมกันระหว่างเกมกระดานกับโหมดฝึกอ่านนาฬิกา
 *
 * แยกออกมาเพื่อให้การ์ดทั้งสองโหมดหน้าตาเหมือนกันทุกจุด
 * เด็กที่ฝึกในโหมดฝึกแล้วไปเล่นเกมกระดาน จะเจอหน้าปัดและปุ่มหมุนเข็มแบบเดียวกัน
 */

/* ── ชิ้นส่วนภาพ ─────────────────────────────────────────── */

/**
 * วาง SVG ที่สร้างจาก src/timeAdventure/art.ts
 * ปลอดภัยเพราะข้อความทั้งหมดมาจากค่าคงที่ในโค้ด ไม่มีข้อความจากผู้เล่นปน
 */
export function Art({ viewBox, inner, label, className }: { viewBox: string; inner: string; label: string; className?: string }) {
  return <svg viewBox={viewBox} className={className} role="img" aria-label={label} dangerouslySetInnerHTML={{ __html: inner }} />
}

export function Hero({ hero, className }: { hero: HeroKey; className?: string }) {
  return <Art viewBox="0 0 40 48" inner={heroInner(hero)} label={HERO_INFO[hero].name} className={className} />
}

export function Clock({ h, m, hands, plain, className }: { h: number; m: number; hands?: boolean; plain?: boolean; className?: string }) {
  const art = clockArt(h, m, { hands, plain })
  return <Art viewBox={art.viewBox} inner={art.inner} label={art.label} className={className} />
}

const EMPHASIS = new RegExp(`(${[...EMPHASIS_WORDS].sort((a, b) => b.length - a.length).join('|')})`)

/** เน้นคำที่เปลี่ยนคำตอบทั้งข้อ เช่น ก่อน/หลัง ให้เด็กที่อ่านเร็วไม่พลาด */
export function emphasize(text: string): ReactNode[] {
  return text.split(EMPHASIS).map((part, i) =>
    i % 2 === 1 ? (
      <em key={i} className="ta-emph">
        {part}
      </em>
    ) : (
      part
    ),
  )
}

export const BUDDY: Record<DeckType, { hero: HeroKey; say: string[] }> = {
  time: { hero: 'wizard', say: ['ดูเข็มสั้นก่อนน้า~', 'เข็มสั้นบอกชั่วโมงนะ', 'เวทมนตร์คือค่อย ๆ ดู', 'หนูทำได้แน่นอน!'] },
  find: { hero: 'fairy', say: ['นางฟ้าช่วยส่องนะ ✨', 'ดูเข็มยาวด้วยน้า', 'มีข้อเดียวที่ถูกนะ', 'โบกไม้กายสิทธิ์ ชี้เลย!'] },
  daily: { hero: 'knight', say: ['วันนี้หนูทำอะไรบ้าง?', 'นึกถึงวันของหนูสิ', 'อัศวินก็ตื่นเช้านะ!', 'เลขชั่วโมงน้อย มาก่อนนะ'] },
  chal: { hero: 'dragon', say: ['มังกรน้อยท้าดวล!', 'ใกล้ถึงปราสาทแล้ว', 'คิดทีละขั้นนะ', 'เก่งมากที่มาถึงตรงนี้!'] },
}
export const CHEER = ['เก่งมาก!', 'สุดยอดเลย!', 'ตรงเวลาเป๊ะ!', 'เวทมนตร์ได้ผล!', 'ฮีโร่ตัวจริง!']
export const COMFORT = ['ไม่เป็นไรนะ', 'เกือบแล้ว!', 'ลองใหม่ตาหน้านะ', 'ค่อย ๆ ดูอีกทีนะ']
export const pick = <T,>(list: T[]): T => list[Math.floor(Math.random() * list.length)]
export const LETTERS = ['ก', 'ข', 'ค']

export function RowLabel({ row }: { row: ActivityRow }) {
  return (
    <>
      <span aria-hidden="true" className="text-2xl leading-none">
        {row.emoji}
      </span>
      <span>{row.label}</span>
      <span className="ml-auto whitespace-nowrap font-display text-base tabular-nums" style={{ color: 'var(--c)' }}>
        {row.time}
      </span>
    </>
  )
}

export function Tag({ text }: { text?: string }) {
  if (!text) return null
  return (
    <p className="font-display text-sm" style={{ color: 'var(--c)' }}>
      {text}
    </p>
  )
}

export function Visual({ visual }: { visual: CardVisual }) {
  switch (visual.kind) {
    case 'clock':
      return (
        <>
          <Tag text={visual.tag} />
          <Clock h={visual.h} m={visual.m} className="w-[min(190px,56vw)]" />
        </>
      )
    case 'emptyClock':
      return (
        <>
          <Tag text={visual.tag} />
          <Clock h={0} m={0} hands={false} className="w-[min(180px,52vw)]" />
        </>
      )
    case 'word':
      return (
        <>
          <Tag text={visual.tag} />
          {visual.emoji ? <span className="text-5xl leading-none">{visual.emoji}</span> : null}
          <p className="rounded-2xl bg-white px-4 py-1.5 text-center font-display text-xl">{visual.text}</p>
          {visual.blank ? <p className="font-display text-3xl tracking-[0.12em] text-slate-400">__ : __</p> : null}
        </>
      )
    case 'clocks':
      return (
        <>
          <Tag text={visual.tag} />
          {visual.word ? <p className="rounded-2xl bg-white px-4 py-1.5 text-center font-display text-xl">{visual.word}</p> : null}
          <div className="flex justify-center gap-2">
            {visual.clocks.map(([h, m], i) => (
              <figure key={i} className="flex flex-col items-center">
                <Clock h={h} m={m} plain className="w-[min(104px,26vw)]" />
                <figcaption className="font-display text-lg" style={{ color: 'var(--c)' }}>
                  {LETTERS[i]}.
                </figcaption>
              </figure>
            ))}
          </div>
        </>
      )
    case 'rows':
      return (
        <div className="grid w-full gap-2">
          {visual.rows.map((row) => (
            <div key={row.label} className="ta-opt pointer-events-none" style={{ boxShadow: 'none', borderWidth: 2 }}>
              <RowLabel row={row} />
            </div>
          ))}
        </div>
      )
    default:
      return null
  }
}

/**
 * หน้าปัดที่หมุนเข็มได้
 *
 * กดปุ่มหมุนทีละชั่วโมงหรือทีละ 5 นาที หรือลากเข็มยาวบนหน้าปัด
 * หมุนเข็มยาวเลย 12 แล้วเข็มสั้นขยับตามเหมือนนาฬิกาจริง
 * ตั้งใจไม่มีตัวเลขบอกเวลาข้าง ๆ เพราะเด็กจะกดจนตัวเลขตรงโดยไม่ดูเข็มเลย
 */
export function ClockSetter({
  card,
  set,
  result,
  onSet,
  onCheck,
}: {
  card: TimeCard
  set: [number, number]
  result: { correct: boolean } | null
  onSet: (set: [number, number]) => void
  onCheck: () => void
}) {
  const svgRef = useRef<SVGSVGElement>(null)
  const dragging = useRef(false)
  const done = result !== null
  const [h, m] = done && !result?.correct && card.kind === 'set' ? card.target : set

  const turnMinutes = (delta: number) => {
    let [hh, mm] = set
    mm += delta
    if (mm >= 60) {
      mm -= 60
      hh = (hh % 12) + 1
    }
    if (mm < 0) {
      mm += 60
      hh = ((hh + 10) % 12) + 1
    }
    playSfx('click')
    onSet([hh, mm])
  }

  const turnHours = (delta: number) => {
    playSfx('click')
    onSet([((set[0] + delta + 11) % 12) + 1, set[1]])
  }

  const fromPointer = (event: ReactPointerEvent<SVGSVGElement>) => {
    const box = svgRef.current?.getBoundingClientRect()
    if (!box) return
    // จุดกึ่งกลางหน้าปัดอยู่ที่ (0,0) ใน viewBox -55 -60 110 118
    const cx = box.left + (box.width * 55) / 110
    const cy = box.top + (box.height * 60) / 118
    let angle = (Math.atan2(event.clientX - cx, -(event.clientY - cy)) * 180) / Math.PI
    if (angle < 0) angle += 360
    const minute = (Math.round(angle / 30) * 5) % 60
    if (minute !== set[1]) {
      playSfx('click')
      onSet([set[0], minute])
    }
  }

  const art = clockArt(h, m)
  return (
    <div className="flex flex-col items-center gap-2.5">
      <svg
        ref={svgRef}
        viewBox={art.viewBox}
        role="img"
        aria-label={done ? art.label : 'หน้าปัดที่หมุนเข็มได้'}
        className={`w-[min(230px,66vw)] ${done ? '' : 'cursor-grab touch-none'}`}
        dangerouslySetInnerHTML={{ __html: art.inner }}
        onPointerDown={(event) => {
          if (done) return
          dragging.current = true
          event.currentTarget.setPointerCapture(event.pointerId)
          fromPointer(event)
        }}
        onPointerMove={(event) => dragging.current && !done && fromPointer(event)}
        onPointerUp={() => (dragging.current = false)}
        onPointerCancel={() => (dragging.current = false)}
      />
      {!done ? (
        <>
          <div className="grid w-full grid-cols-2 gap-2.5">
            {[
              { label: 'เข็มสั้น (ชั่วโมง)', color: HOUR_HAND, back: () => turnHours(-1), forward: () => turnHours(1), what: 'เข็มสั้น' },
              { label: 'เข็มยาว (นาที)', color: MINUTE_HAND, back: () => turnMinutes(-5), forward: () => turnMinutes(5), what: 'เข็มยาว' },
            ].map((control) => (
              <div key={control.label} className="flex flex-col items-center gap-1 rounded-2xl bg-white p-2">
                <span className="text-sm font-bold">
                  <i className="mr-1.5 inline-block h-2.5 w-2.5 rounded-full" style={{ background: control.color }} />
                  {control.label}
                </span>
                <div className="flex gap-2">
                  <button type="button" onClick={control.back} aria-label={`ถอย${control.what}`} className="h-11 w-14 rounded-xl border-[3px] border-slate-200 bg-white font-display text-xl">
                    ⟲
                  </button>
                  <button type="button" onClick={control.forward} aria-label={`หมุน${control.what}ไปข้างหน้า`} className="h-11 w-14 rounded-xl border-[3px] border-slate-200 bg-white font-display text-xl">
                    ⟳
                  </button>
                </div>
              </div>
            ))}
          </div>
          <p className="text-sm text-slate-600">ลากเข็มยาวบนหน้าปัดได้ด้วย</p>
          <Button onClick={onCheck}>✔ ตรวจคำตอบ</Button>
        </>
      ) : !result?.correct ? (
        <p className="text-sm text-slate-600">นี่คือเข็มที่ถูกต้อง</p>
      ) : null}
    </div>
  )
}

