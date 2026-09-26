import { useEffect, useId, useMemo, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { createRng } from '../../math/rng'
import { COMBO_FROM, comboLine, lineFor, readyLine } from '../../planetQuest/buddies'
import type { Buddy } from '../../planetQuest/buddies'
import type { Planet } from '../../solar/planets'
import type { BodyId } from '../../solar/space'
import type { Reaction } from './QuestParts'

/**
 * เพื่อนดาว · ดาวเคราะห์หน้าตาน่ารักที่คุยกับเด็กระหว่างเล่น
 *
 * วาดด้วย SVG จากสี แถบเมฆ จุดบนผิว และวงแหวนชุดเดียวกับฉากสามมิติ
 * ดาวแต่ละดวงจึงดูเป็นตัวของมันเอง ดาวพฤหัสบดีมีลายและจุดแดงใหญ่ โลกมีทวีป ดาวเสาร์มีวงแหวน
 * ยูเรนัสวงแหวนตั้งตรงเพราะนอนตะแคง ตรงกับเรื่องที่ตัวมันเองเล่า
 */

export type BuddyMood = 'happy' | 'wow' | 'oops' | 'sleep' | 'love'

const INK = '#1b1537'
const CX = 50
const CY = 54
const R = 38

function Eyes({ mood, blink, order }: { mood: BuddyMood; blink: boolean; order: number }) {
  if (mood === 'sleep') {
    return (
      <g fill="none" stroke={INK} strokeWidth={3} strokeLinecap="round">
        <path d="M33 50 Q38 55 43 50" />
        <path d="M57 50 Q62 55 67 50" />
      </g>
    )
  }
  if (mood === 'oops') {
    return (
      <g fill="none" stroke={INK} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
        <path d="M34 46 L41 51 L34 56" />
        <path d="M66 46 L59 51 L66 56" />
      </g>
    )
  }
  if (mood === 'love') {
    const heart = (x: number) =>
      `M${x} 57 C${x - 9} 50 ${x - 6} 43 ${x} 47 C${x + 6} 43 ${x + 9} 50 ${x} 57 Z`
    return (
      <g fill="#ff4f7b" stroke="#c81e5b" strokeWidth={1}>
        <path d={heart(38)} />
        <path d={heart(62)} />
      </g>
    )
  }
  const big = mood === 'wow'
  const rx = big ? 5.6 : 4.6
  const ry = big ? 6.6 : 5.4
  return (
    // แต่ละดวงกะพริบไม่พร้อมกัน ดาวแปดดวงบนหน้าจอเดียวกันจะได้ไม่ดูเหมือนหุ่นยนต์
    <g className={blink ? 'pq-blink' : undefined} style={blink ? { animationDelay: `${-order * 0.83}s` } : undefined}>
      {[38, 62].map((x) => (
        <g key={x}>
          <ellipse cx={x} cy={51} rx={rx} ry={ry} fill={INK} />
          <circle cx={x - rx * 0.32} cy={51 - ry * 0.38} r={rx * 0.4} fill="#fff" />
          <circle cx={x + rx * 0.34} cy={51 + ry * 0.3} r={rx * 0.17} fill="#fff" />
        </g>
      ))}
    </g>
  )
}

function Mouth({ mood }: { mood: BuddyMood }) {
  if (mood === 'wow' || mood === 'love') {
    return (
      <g>
        <path d="M42 61 Q50 73 58 61 Z" fill={INK} />
        <ellipse cx={50} cy={66.5} rx={4} ry={2.2} fill="#ff7a98" />
      </g>
    )
  }
  if (mood === 'oops') {
    return <path d="M43 65 Q46.5 61.5 50 65 Q53.5 68.5 57 65" fill="none" stroke={INK} strokeWidth={2.6} strokeLinecap="round" />
  }
  if (mood === 'sleep') {
    return <ellipse cx={50} cy={64} rx={2.4} ry={3} fill="none" stroke={INK} strokeWidth={2.2} />
  }
  // ปากแมว ω
  return (
    <path d="M43 61 Q46.5 66 50 61 Q53.5 66 57 61" fill="none" stroke={INK} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" />
  )
}

function Crown() {
  return (
    <g>
      <path d="M36 20 L37 5 L44 13 L50 2 L56 13 L63 5 L64 20 Z" fill="#fcd34d" stroke="#b45309" strokeWidth={1.6} strokeLinejoin="round" />
      <circle cx={50} cy={14} r={2.4} fill="#f43f5e" />
      <circle cx={41} cy={16} r={1.6} fill="#38bdf8" />
      <circle cx={59} cy={16} r={1.6} fill="#38bdf8" />
    </g>
  )
}

/** ลวดลายบนผิวดาว ใช้ข้อมูลเดียวกับที่ฉากสามมิติวาด */
function Surface({ planet }: { planet: Planet }) {
  const front = planet.spots?.[0]?.lon ?? 0
  return (
    <>
      {(planet.bands ?? []).map((band, index) => {
        const height = Math.max(2.5, band.width * R)
        return (
          <rect
            key={`band-${index}`}
            x={CX - R}
            y={CY - band.lat * R - height / 2}
            width={R * 2}
            height={height}
            fill={band.color}
            opacity={0.85}
          />
        )
      })}
      {(planet.spots ?? []).map((spot, index) => {
        const facing = Math.cos(spot.lon - front)
        if (facing <= 0) return null
        return (
          <ellipse
            key={`spot-${index}`}
            cx={CX + R * Math.cos(spot.lat) * Math.sin(spot.lon - front) * 0.95}
            cy={CY - R * Math.sin(spot.lat)}
            rx={spot.size * R * 0.75 * (0.45 + 0.55 * facing)}
            ry={spot.size * R * 0.65}
            fill={spot.color}
            opacity={0.9}
          />
        )
      })}
    </>
  )
}

/**
 * วงแหวนแบ่งเป็นครึ่งหลัง (วาดก่อนตัวดาว) กับครึ่งหน้า (วาดทับตัวดาว) เหมือนในฉากสามมิติ
 * ระยะของแต่ละชั้นย่อให้พอดีกรอบ แต่ยังเรียงลำดับและหนาบางตามข้อมูลจริง
 * ดาวที่แกนเอียงเกิน 60 องศา (ยูเรนัส) วาดวงแหวนตั้งตรง
 */
function RingHalf({ planet, half }: { planet: Planet; half: 'back' | 'front' }) {
  const rings = planet.rings
  if (!rings || rings.length === 0) return null
  const upright = planet.tiltDeg > 60
  const widest = Math.max(...rings.map((ring) => ring.outer))
  const reach = upright ? 54 : 60
  const scale = (reach - R) / Math.max(0.01, widest - 1)
  return (
    <g transform={`rotate(${upright ? 10 : -12} ${CX} ${CY})`} fill="none">
      {rings.map((ring, index) => {
        const long = R + ((ring.inner + ring.outer) / 2 - 1) * scale
        const short = long * (upright ? 0.17 : 0.22)
        const d = upright
          ? `M${CX} ${CY - long} A ${short} ${long} 0 0 ${half === 'back' ? 0 : 1} ${CX} ${CY + long}`
          : `M${CX - long} ${CY} A ${long} ${short} 0 0 ${half === 'back' ? 1 : 0} ${CX + long} ${CY}`
        return (
          <path
            key={index}
            d={d}
            stroke={ring.color}
            strokeOpacity={Math.min(1, ring.alpha + 0.15)}
            strokeWidth={Math.max(2.5, (ring.outer - ring.inner) * scale)}
          />
        )
      })}
    </g>
  )
}

export function PlanetBuddy({
  planet,
  size = 64,
  mood = 'happy',
  crown = false,
  animate = true,
  className = '',
}: {
  planet: Planet
  /** พิกเซล หรือความยาวแบบ CSS เช่น "min(9.5vw, 56px)" ให้ย่อขยายตามจอ */
  size?: number | string
  mood?: BuddyMood
  crown?: boolean
  /** ปิดเมื่อผู้เล่นปิดการเคลื่อนไหวในการตั้งค่า */
  animate?: boolean
  className?: string
}) {
  const id = useId().replace(/:/g, '')
  const fill = `pq-buddy-fill-${id}`
  const clip = `pq-buddy-clip-${id}`
  const shade = `pq-buddy-shade-${id}`

  return (
    <span
      aria-hidden="true"
      className={`pq-buddy ${mood === 'sleep' ? 'pq-buddy-sleep' : ''} ${className}`}
      style={{ width: size, height: size }}
    >
      <svg viewBox="-12 -14 124 124" width="100%" height="100%">
        <defs>
          <radialGradient id={fill} cx="36%" cy="32%" r="75%">
            <stop offset="0%" stopColor={planet.highlight} />
            <stop offset="75%" stopColor={planet.color} />
          </radialGradient>
          <radialGradient id={shade} cx="50%" cy="50%" r="50%">
            <stop offset="70%" stopColor="#000010" stopOpacity={0} />
            <stop offset="100%" stopColor="#000010" stopOpacity={0.28} />
          </radialGradient>
          <clipPath id={clip}>
            <circle cx={CX} cy={CY} r={R} />
          </clipPath>
        </defs>

        <RingHalf planet={planet} half="back" />
        {planet.atmosphere ? <circle cx={CX} cy={CY} r={R + 3} fill={planet.atmosphere} opacity={0.25} /> : null}
        <circle cx={CX} cy={CY} r={R} fill={`url(#${fill})`} />
        <g clipPath={`url(#${clip})`}>
          <Surface planet={planet} />
          <circle cx={CX} cy={CY} r={R} fill={`url(#${shade})`} />
        </g>
        {/* เงาวาวแบบลูกกวาด */}
        <ellipse cx={37} cy={30} rx={10} ry={5} fill="#fff" opacity={0.35} transform="rotate(-28 37 30)" />

        <ellipse cx={29} cy={64} rx={6.5} ry={4} fill="#ff8fb0" opacity={0.6} />
        <ellipse cx={71} cy={64} rx={6.5} ry={4} fill="#ff8fb0" opacity={0.6} />
        <Eyes mood={mood} blink={animate} order={planet.order} />
        <Mouth mood={mood} />
        {mood === 'oops' ? <path d="M80 30 Q74 40 80 43 Q86 40 80 30 Z" fill="#9fd8ff" stroke="#38bdf8" strokeWidth={1} /> : null}

        <RingHalf planet={planet} half="front" />
        {crown ? <Crown /> : null}
        {mood === 'sleep' ? (
          <g fill="#e0f2fe" fontWeight={900} fontFamily="sans-serif">
            <text x={84} y={20} fontSize={16} className={animate ? 'pq-zzz' : undefined}>
              z
            </text>
            <text x={96} y={4} fontSize={12} className={animate ? 'pq-zzz pq-zzz-late' : undefined}>
              z
            </text>
          </g>
        ) : null}
      </svg>
    </span>
  )
}

/** ดาวที่เพิ่งถูกจิ้ม ทั้งในฉากสามมิติ (scene) และบนการ์ด (card) */
export interface PokeState {
  id: BodyId
  /** นับเพิ่มทุกครั้งที่จิ้ม ใช้เล่นอนิเมชันใหม่และหมุนเวียนประโยค */
  count: number
  source: 'scene' | 'card'
}

/**
 * ปุ่มจิ้มเพื่อนดาว แตะแล้วดาวเด้งดึ๋ง ใช้ครอบเพื่อนดาวที่ไม่ได้อยู่ในปุ่มอื่น
 * (ปุ่มซ้อนปุ่มใช้ไม่ได้ เพื่อนดาวบนปุ่มเลือกดาวจึงจิ้มไม่ได้)
 */
export function PokeButton({
  label,
  count,
  reduceMotion,
  onPoke,
  children,
}: {
  label: string
  /** จำนวนครั้งที่ดาวดวงนี้ถูกจิ้ม 0 คือยังไม่ถูกจิ้ม */
  count: number
  reduceMotion: boolean
  onPoke: () => void
  children: ReactNode
}) {
  return (
    <button type="button" className="pq-poke" aria-label={label} onClick={onPoke}>
      <span key={count} className={count > 0 && !reduceMotion ? 'pq-squish' : 'inline-block'}>
        {children}
      </span>
    </button>
  )
}

/** กล่องคำพูด หางชี้ไปทางเพื่อนดาว */
export function Bubble({ children, tail = 'left', className = '' }: { children: ReactNode; tail?: 'left' | 'top'; className?: string }) {
  return <div className={`pq-bubble ${tail === 'top' ? 'pq-bubble-top' : 'pq-bubble-left'} ${className}`}>{children}</div>
}

const BITS = ['⭐', '✨', '💖', '🌟', '💫', '🪐']

/**
 * พลุดาวกระจายจากกลางกล่อง
 * ตัวกล่องปิดขอบไว้ (overflow hidden) ดาวที่บินไกลจึงไม่ดันหน้าจอให้เลื่อนซ้ายขวาบนมือถือ
 * ผู้เรียกต้องไม่ใส่พลุเลยเมื่อปิดการเคลื่อนไหว
 */
export function Confetti({ seed, count = 16, spread = 120 }: { seed: string | number; count?: number; spread?: number }) {
  const bits = useMemo(() => {
    const rng = createRng(`pq-confetti-${seed}`)
    return Array.from({ length: count }, (_, index) => {
      const angle = (index / count) * Math.PI * 2 + rng.next() * 0.6
      const distance = spread * (0.55 + rng.next() * 0.45)
      return {
        icon: BITS[index % BITS.length],
        dx: Math.round(Math.cos(angle) * distance),
        dy: Math.round(Math.sin(angle) * distance - spread * 0.2),
        rot: Math.round((rng.next() * 2 - 1) * 200),
        delay: Math.round(rng.next() * 150) / 1000,
      }
    })
  }, [count, seed, spread])

  return (
    <span className="pq-confetti" aria-hidden="true">
      {bits.map((bit, index) => (
        <span
          key={index}
          style={
            {
              '--dx': `${bit.dx}px`,
              '--dy': `${bit.dy}px`,
              '--rot': `${bit.rot}deg`,
              animationDelay: `${bit.delay}s`,
            } as CSSProperties
          }
        >
          {bit.icon}
        </span>
      ))}
    </span>
  )
}

export interface ReactionEvent {
  /** นับเพิ่มทีละหนึ่งทุกครั้งที่มีปฏิกิริยา ใช้ทั้งเล่นอนิเมชันใหม่และหมุนเวียนประโยค */
  id: number
  kind: Reaction
  streak: number
}

/**
 * แถบเพื่อนดาวเหนือเกม ดาวเจ้าบ้านเชียร์เมื่อตอบถูก ปลอบเมื่อพลาด
 * สีหน้าเปลี่ยนแป๊บเดียวแล้วกลับมายิ้ม ส่วนคำพูดค้างไว้จนกว่าจะตอบข้อต่อไป
 */
export function BuddyBar({
  planet,
  buddy,
  reaction,
  reduceMotion,
}: {
  planet: Planet
  buddy: Buddy
  reaction: ReactionEvent | null
  reduceMotion: boolean
}) {
  const [mood, setMood] = useState<BuddyMood>('happy')

  useEffect(() => {
    if (!reaction) return
    setMood(reaction.kind === 'oops' ? 'oops' : reaction.streak >= COMBO_FROM ? 'love' : 'wow')
    const timer = window.setTimeout(() => setMood('happy'), 1600)
    return () => window.clearTimeout(timer)
  }, [reaction])

  const text = !reaction
    ? readyLine(buddy)
    : reaction.kind === 'oops'
      ? lineFor(buddy.oops, reaction.id)
      : reaction.streak >= COMBO_FROM
        ? comboLine(reaction.streak)
        : lineFor(buddy.cheers, reaction.id)

  const motion = reduceMotion || !reaction ? '' : reaction.kind === 'oops' ? 'pq-shake' : 'pq-hop'
  const party = !reduceMotion && reaction?.kind === 'good' && reaction.streak >= COMBO_FROM

  return (
    <div className="pq-buddybar mb-3">
      <span key={reaction?.id ?? 0} className={`relative shrink-0 ${motion}`}>
        <PlanetBuddy planet={planet} size={58} mood={mood} animate={!reduceMotion} className={reduceMotion ? '' : 'pq-bob'} />
      </span>
      <Bubble className="min-w-0 flex-1">
        <span className="text-xs font-bold text-slate-500">{buddy.nickname}</span>
        <span className="block text-sm font-black sm:text-base">{text}</span>
      </Bubble>
      {party ? <Confetti key={reaction?.id} seed={reaction?.id ?? 0} count={10} spread={70} /> : null}
    </div>
  )
}
