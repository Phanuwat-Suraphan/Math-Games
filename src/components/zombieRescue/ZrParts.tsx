import { useCallback, useEffect, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { useGameSettings } from '../../hooks/useGameSettings'
import { playSfx } from '../../services/audioService'
import { speak, speechSupported } from '../../services/speechService'
import { CHAR_NAMES, charInner, curedHeadInner, zheadInner } from '../../zombieRescue/art'
import type { CharKey } from '../../zombieRescue/art'
import { ZONES } from '../../zombieRescue/board'
import type { AskKind, QAnswer, QVisual, Stage } from '../../zombieRescue/questions'
import { VILLAGER_VIEWBOX, thanksOf, villagerFor, villagerInner, villagerZombieInner } from '../../zombieRescue/villagers'
import type { Villager } from '../../zombieRescue/villagers'
import { buildWorksheet, newSheetSeed, worksheetHtml } from '../../zombieRescue/worksheet'
import type { SheetTable } from '../../zombieRescue/worksheet'

/**
 * ชิ้นส่วนหน้าจอของ ZOMBIE RESCUE ใช้ร่วมกันระหว่างเกมกระดานกับโหมดฝึกสูตรคูณ
 *
 * การ์ดโจทย์ใช้คลาส ta-* ชุดเดียวกับเมืองแห่งเวลา (การ์ดสว่างบนฉากมืด หัวการ์ดขอบหยัก)
 * เด็กที่เล่นทั้งสองเกมจึงรู้ทันทีว่าตรงไหนคือโจทย์ ตรงไหนคือปุ่มตอบ
 */

/**
 * วาง SVG ที่สร้างจาก src/zombieRescue/art.ts
 * ปลอดภัยเพราะข้อความทั้งหมดมาจากค่าคงที่ในโค้ด ไม่มีข้อความจากผู้เล่นปน
 */
export function Art({ viewBox, inner, label, className }: { viewBox: string; inner: string; label: string; className?: string }) {
  return <svg viewBox={viewBox} className={className} role="img" aria-label={label} dangerouslySetInnerHTML={{ __html: inner }} />
}

export function Char({ k, className }: { k: CharKey; className?: string }) {
  return <Art viewBox="0 0 40 48" inner={charInner(k)} label={CHAR_NAMES[k]} className={className} />
}

export function ZHead({ className }: { className?: string }) {
  return <Art viewBox="0 0 20 20" inner={zheadInner()} label="ซอมบี้" className={className} />
}

export function CuredHead({ className }: { className?: string }) {
  return <Art viewBox="0 0 20 20" inner={curedHeadInner()} label="หายป่วยแล้ว" className={className} />
}

/* ── สีและเพื่อนร่วมทางของแต่ละด่าน ───────────────────────── */

export const BOSS_COLORS = { color: '#1E9AAE', bg: '#E4F7FA' }

export function stageColors(stage: Stage | 'practice'): { color: string; bg: string } {
  if (stage === 'boss') return BOSS_COLORS
  if (stage === 'practice') return { color: '#2E9E4F', bg: '#E6F5EA' }
  return { color: ZONES[stage].color, bg: ZONES[stage].bg }
}

export const BUDDY: Record<Stage | 'zombie', { k: CharKey; say: string[] }> = {
  1: { k: 'scientist', say: ['บวกซ้ำก็คือการคูณนะ', 'ค่อย ๆ นับทีละ 2 นะ', 'ที่นี่ปลอดภัย มาฝึกกัน!'] },
  2: { k: 'scout', say: ['นับเป็นกล่อง ๆ นะ', 'ของกลุ่มละ 3 ชิ้น', 'หาเสบียงกันเถอะ!'] },
  3: { k: 'zombie', say: ['คูณ… คูณ…', 'นับพวกเราเป็นกลุ่มสิ~', 'ง่วงจัง… ช่วยนับหน่อย'] },
  4: { k: 'doctor', say: ['ใช้การคูณทำยากัน!', 'คนละ 5 ขวดนะ', 'ใกล้ได้วัคซีนแล้ว!'] },
  5: { k: 'dog', say: ['โฮ่ง! ทุกแม่มารวมกัน', 'ใกล้ถึง Z-CURE แล้ว!', 'ดมเจอสูตรยาแล้ว!'] },
  boss: { k: 'zombo', say: ['ช่วยข้าหาสูตรรักษาที…', 'ผสมยาให้ถูกนะ เด็ก ๆ', 'ข้าอยากกลับเป็นคนแล้ว~'] },
  zombie: { k: 'zombie', say: ['ซอมบี้โผล่มา! ตอบให้ถูกเพื่อรักษา', 'คูณ… คูณ… ช่วยรักษาที~', 'ง่วงจัง… อยากหายป่วยแล้ว'] },
}

export const CHEER = ['เก่งมาก!', 'สุดยอดเลย!', 'ถูกต้อง!', 'ฮีโร่ตัวจริง!', 'คิดเลขเก่งจัง!']
export const COMFORT = ['ไม่เป็นไรนะ', 'เกือบแล้ว!', 'ลองใหม่ตาหน้านะ', 'ค่อย ๆ คิดอีกทีนะ']
export const pick = <T,>(list: T[]): T => list[Math.floor(Math.random() * list.length)]

/* ── ภาพบนการ์ดโจทย์ ─────────────────────────────────────── */

function Item({ item, className }: { item: string; className?: string }) {
  if (item === 'Z') return <ZHead className={className ?? 'h-6 w-6'} />
  return (
    <span aria-hidden="true" className="leading-none">
      {item}
    </span>
  )
}

/** จำนวนคอลัมน์ในกล่องกลุ่ม ให้แต่ละกลุ่มเป็นก้อนสวย ๆ นับง่าย */
const groupCols = (each: number) => (each <= 3 ? each : each === 4 ? 2 : each <= 6 ? 3 : 5)

export function QuestionVisual({ visual }: { visual: QVisual }) {
  switch (visual.kind) {
    case 'expr':
      return <p className="rounded-2xl bg-white px-5 py-2 text-center font-display text-4xl tabular-nums shadow-[0_3px_0_rgba(35,50,74,0.12)]">{visual.text}</p>
    case 'add':
      return (
        <p className="rounded-2xl bg-white px-4 py-2 text-center font-display text-3xl tabular-nums shadow-[0_3px_0_rgba(35,50,74,0.12)]">
          {Array.from({ length: visual.times }, () => visual.addend).join(' + ')}
        </p>
      )
    case 'groups':
      return (
        <div className="flex max-w-full flex-wrap justify-center gap-2" role="img" aria-label={`${visual.groups} กลุ่ม กลุ่มละ ${visual.each}`}>
          {Array.from({ length: visual.groups }, (_, g) => (
            <div
              key={g}
              className="grid place-items-center gap-0.5 rounded-xl border-2 border-dashed bg-white/80 p-1.5 text-xl"
              style={{ gridTemplateColumns: `repeat(${groupCols(visual.each)}, auto)`, borderColor: 'var(--c)' }}
            >
              {Array.from({ length: visual.each }, (_, i) => (
                <Item key={i} item={visual.item} className="h-5 w-5" />
              ))}
            </div>
          ))}
        </div>
      )
    case 'array':
      return (
        <div
          className="grid place-items-center gap-1 rounded-2xl bg-white p-2 text-xl"
          style={{ gridTemplateColumns: `repeat(${visual.cols}, auto)` }}
          role="img"
          aria-label={`${visual.rows} แถว แถวละ ${visual.cols}`}
        >
          {Array.from({ length: visual.rows * visual.cols }, (_, i) => (
            <Item key={i} item={visual.item} className="h-6 w-6" />
          ))}
        </div>
      )
    case 'zombies':
      return (
        <div className="flex max-w-full flex-wrap justify-center gap-2" role="img" aria-label={`ซอมบี้ ${visual.count} ตัว ตัวละ ${visual.power} พลัง`}>
          {Array.from({ length: visual.count }, (_, i) => (
            <span key={i} className="relative inline-flex">
              <ZHead className="h-9 w-9" />
              <span className="absolute -bottom-1 -right-2 rounded-full border-2 border-white px-1.5 text-xs font-black text-white" style={{ background: 'var(--c)' }}>
                ⚡{visual.power}
              </span>
            </span>
          ))}
        </div>
      )
    case 'scene':
      return (
        <div className="flex flex-col items-center gap-1.5">
          <div className="flex max-w-full flex-wrap justify-center gap-1.5 text-3xl" role="img" aria-label={`${visual.count} ชิ้น`}>
            {Array.from({ length: visual.count }, (_, i) => (
              <Item key={i} item={visual.item} className="h-8 w-8" />
            ))}
          </div>
          <span className="rounded-full bg-white px-3 py-0.5 text-sm font-bold" style={{ color: 'var(--c)' }}>
            {visual.tag}
          </span>
        </div>
      )
  }
}

/** เน้นคำที่เปลี่ยนความหมายของโจทย์ ให้เด็กที่อ่านเร็วไม่พลาด */
export function emphasize(text: string): ReactNode[] {
  return text.split(/(ทั้งหมด|ประโยคการคูณ|□)/).map((part, i) =>
    i % 2 === 1 ? (
      <em key={i} className="ta-emph">
        {part}
      </em>
    ) : (
      part
    ),
  )
}

/* ── แป้นตอบ ─────────────────────────────────────────────── */

const DIGITS = ['7', '8', '9', '4', '5', '6', '1', '2', '3']

/**
 * แป้นตอบในการ์ด: ช่องเดียวสำหรับผลคูณหรือค่า □ และสามช่อง □ × □ = □ สำหรับเขียนประโยค
 *
 * ทำแป้นเองด้วยเหตุผลเดียวกับ NumberPad ของเกมหลัก (แป้นของแท็บเล็ตบังโจทย์)
 * แต่เป็นสีสว่างให้เข้ากับการ์ด และไม่มีปุ่มจุดทศนิยมกับเศษส่วนที่เด็ก ป.2 ไม่ได้ใช้
 * กดตัวเลขบนคีย์บอร์ดได้ด้วย เผื่อครูเปิดบนคอมพิวเตอร์หน้าห้อง
 */
export function AnswerPad({
  ask,
  unit,
  disabled,
  onSubmit,
}: {
  ask: AskKind
  unit: string
  disabled?: boolean
  onSubmit: (answer: QAnswer) => void
}) {
  const count = ask === 'sentence' ? 3 : 1
  const [values, setValues] = useState<string[]>(() => Array.from({ length: count }, () => ''))
  const [active, setActive] = useState(0)
  const ready = values.every((v) => v.length > 0)

  const press = useCallback(
    (digit: string) => {
      if (disabled) return
      playSfx('click')
      setValues((list) => list.map((v, i) => (i === active ? (v === '0' ? digit : (v + digit).slice(0, 3)) : v)))
    },
    [active, disabled],
  )

  const back = useCallback(() => {
    if (disabled) return
    // ช่องนี้ว่างแล้ว กดลบอีกทีคือถอยไปแก้ช่องก่อนหน้า
    if (values[active].length === 0 && active > 0) {
      setActive(active - 1)
      return
    }
    setValues((list) => list.map((v, i) => (i === active ? v.slice(0, -1) : v)))
  }, [active, disabled, values])

  const next = useCallback(() => setActive((a) => (a + 1) % count), [count])

  const submit = useCallback(() => {
    if (disabled || !values.every((v) => v.length > 0)) return
    const nums = values.map(Number)
    onSubmit(count === 3 ? { kind: 'sentence', x: nums[0], y: nums[1], z: nums[2] } : { kind: 'number', value: nums[0] })
  }, [count, disabled, onSubmit, values])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement) return
      if (/^[0-9]$/.test(event.key)) press(event.key)
      else if (event.key === 'Backspace') back()
      else if (event.key === 'Enter') submit()
      else if (event.key === 'ArrowRight' || event.key === 'Tab') {
        if (count > 1) {
          event.preventDefault()
          next()
        }
      } else if (event.key === 'ArrowLeft' && count > 1) setActive((a) => (a + count - 1) % count)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [back, count, next, press, submit])

  const slot = (i: number, label: string) => (
    <button
      key={i}
      type="button"
      aria-label={label}
      aria-pressed={active === i}
      disabled={disabled}
      onClick={() => setActive(i)}
      className={`zr-slot ${active === i && !disabled ? 'zr-slot-on' : ''}`}
    >
      {values[i] || <span className="text-slate-300">□</span>}
    </button>
  )

  return (
    <div className="grid gap-2.5">
      <div className="flex flex-wrap items-center justify-center gap-2 font-display text-3xl">
        {count === 3 ? (
          <>
            {slot(0, 'ตัวคูณตัวแรก')}
            <span>×</span>
            {slot(1, 'ตัวคูณตัวที่สอง')}
            <span>=</span>
            {slot(2, 'ผลคูณ')}
          </>
        ) : (
          <>
            {ask === 'missing' ? <span>□ =</span> : <span>=</span>}
            {slot(0, 'คำตอบ')}
          </>
        )}
        {unit && ask !== 'missing' ? <span className="text-xl">{unit}</span> : null}
      </div>
      {count === 3 ? <p className="text-center text-sm text-slate-500">แตะช่องที่จะเติม หรือกด ➜ เพื่อไปช่องถัดไป</p> : null}
      <div className="grid grid-cols-3 gap-2">
        {DIGITS.map((d) => (
          <button key={d} type="button" className="zr-key" disabled={disabled} onClick={() => press(d)}>
            {d}
          </button>
        ))}
        <button type="button" className="zr-key zr-key-muted" disabled={disabled} onClick={back} aria-label="ลบ">
          ⌫
        </button>
        <button type="button" className="zr-key" disabled={disabled} onClick={() => press('0')}>
          0
        </button>
        {count === 3 ? (
          <button type="button" className="zr-key zr-key-muted" disabled={disabled} onClick={next} aria-label="ช่องถัดไป">
            ➜
          </button>
        ) : (
          <span />
        )}
      </div>
      <button type="button" className="zr-go" disabled={disabled || !ready} onClick={submit}>
        ✔ ตอบ
      </button>
    </div>
  )
}

/* ── ลูกเต๋า ─────────────────────────────────────────────── */

const PIPS: Record<number, Array<[number, number]>> = {
  1: [[15, 15]],
  2: [[8, 8], [22, 22]],
  3: [[8, 8], [15, 15], [22, 22]],
  4: [[8, 8], [22, 8], [8, 22], [22, 22]],
  5: [[8, 8], [22, 8], [15, 15], [8, 22], [22, 22]],
  6: [[8, 8], [22, 8], [8, 15], [22, 15], [8, 22], [22, 22]],
}

export function Die({ value, rolling, className }: { value: number; rolling?: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 30 30" className={`${className ?? ''} ${rolling ? 'zr-die-roll' : ''}`} role="img" aria-label={`ลูกเต๋าออก ${value}`}>
      <rect x="1" y="1" width="28" height="28" rx="6" fill="#fff" stroke="#23324A" strokeWidth="1.4" />
      {(PIPS[value] ?? PIPS[1]).map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="2.7" fill={value === 1 ? '#E0453A' : '#23324A'} />
      ))}
    </svg>
  )
}

/** ❤️ ที่เหลือ กับหัวใจว่างที่เสียไป */
export function Hearts({ lives, max = 3 }: { lives: number; max?: number }) {
  return (
    <span aria-label={`พลังชีวิต ${lives} จาก ${max}`} className="tracking-tight">
      {'❤️'.repeat(Math.max(0, lives))}
      {'🤍'.repeat(Math.max(0, max - lives))}
    </span>
  )
}

/** ชาวเมืองในสมุดวัคซีน ตอนยังเป็นซอมบี้ หรือตอนหายป่วยแล้ว */
export function VillagerArt({ v, cured, className }: { v: Villager; cured: boolean; className?: string }) {
  return (
    <Art
      viewBox={VILLAGER_VIEWBOX}
      inner={cured ? villagerInner(v) : villagerZombieInner(v)}
      label={cured ? `น้อง${v.name}` : `น้อง${v.name} ตอนยังเป็นซอมบี้`}
      className={className}
    />
  )
}

/**
 * ป้าย "ได้สติกเกอร์ใหม่": ซอมบี้โยกตัวแล้วกลายเป็นชาวเมืองหน้าเดิม มีประกายรอบตัว
 * ปิดอนิเมชันในตั้งค่าแล้วเห็นแค่ชาวเมืองที่หายป่วย
 */
export function StickerToast({ each, groups }: { each: number; groups: number }) {
  const { settings } = useGameSettings()
  const v = villagerFor(each, groups)
  const moving = settings.animationsEnabled
  return (
    <div className="zr-sticker-toast flex items-center gap-3 rounded-2xl bg-[#E6F5EA] px-3 py-2 text-left text-green-800" role="status">
      <span className="relative block h-14 w-14 flex-none" aria-hidden="true">
        {moving ? <VillagerArt v={v} cured={false} className="zr-morph-from absolute left-0 top-0 h-full w-full" /> : null}
        <VillagerArt v={v} cured className={`absolute left-0 top-0 h-full w-full ${moving ? 'zr-morph-to' : ''}`} />
        {moving ? (
          <>
            <span className="zr-sparkle" style={{ left: '-6px', top: '-4px' } as CSSProperties}>✨</span>
            <span className="zr-sparkle" style={{ right: '-8px', top: '6px', animationDelay: '0.85s' } as CSSProperties}>✨</span>
            <span className="zr-sparkle" style={{ left: '4px', bottom: '-6px', animationDelay: '1s' } as CSSProperties}>💖</span>
          </>
        ) : null}
      </span>
      <span className="leading-snug">
        <b className="block">
          น้อง{v.name}หายป่วยแล้ว! “{thanksOf(v)}”
        </b>
        <span className="text-sm">
          ได้สติกเกอร์ {groups} × {each} = {each * groups} ในสมุดวัคซีน
        </span>
      </span>
    </div>
  )
}

/** หัวใจและประกายลอยขึ้นตอนตอบถูก (วางในกล่องที่มี relative) ปิดอนิเมชันในตั้งค่าแล้วไม่แสดง */
const BURST = ['💚', '✨', '💖', '⭐', '💉', '✨', '💛']
export function HeartBurst() {
  const { settings } = useGameSettings()
  if (!settings.animationsEnabled) return null
  return (
    <span className="zr-burst" aria-hidden="true">
      {BURST.map((emoji, i) => (
        <span key={i} style={{ '--x': `${(i - 3) * 20}px`, '--d': `${i * 70}ms` } as CSSProperties}>
          {emoji}
        </span>
      ))}
    </span>
  )
}

/**
 * เปิดใบงานสูตรคูณชุดใหม่ในแท็บใหม่ (หน้า 1 ใบงาน หน้า 2 เฉลย) ให้ครูหรือผู้ปกครองกดพิมพ์
 * เบราว์เซอร์ที่กันหน้าต่างใหม่จะได้เป็นไฟล์ดาวน์โหลดแทน
 */
export function openWorksheet(table: SheetTable): void {
  openPrintPage(worksheetHtml(buildWorksheet(table, newSheetSeed(Math.random))), 'ใบงานสูตรคูณ-zombie-rescue.html')
}

/** เปิดหน้า HTML พร้อมพิมพ์ในแท็บใหม่ (ใบงาน รายงาน) กันหน้าต่างใหม่ไว้ก็ดาวน์โหลดเป็นไฟล์แทน */
export function openPrintPage(html: string, filename: string): void {
  playSfx('click')
  const url = URL.createObjectURL(new Blob([html], { type: 'text/html' }))
  const win = window.open(url, '_blank')
  if (!win) {
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
  }
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

/** ปุ่ม 🔊 ฟังโจทย์ (ซ่อนเองบนเครื่องที่อ่านออกเสียงไม่ได้) */
export function SpeakButton({ text, className = '' }: { text: string; className?: string }) {
  if (!speechSupported()) return null
  return (
    <button type="button" className={`zr-speak ${className}`} onClick={() => speak(text)} aria-label="ฟังโจทย์ อ่านออกเสียง">
      🔊 ฟังโจทย์
    </button>
  )
}
