import { useState } from 'react'
import { buddyFor, buddyStatus } from '../../planetQuest/buddies'
import { COMPANIONS, companionFor, isUnlocked, unlockHint } from '../../planetQuest/companions'
import type { CompanionId, JourneyStats } from '../../planetQuest/companions'
import { SHIP_COLORS, shipColor } from '../../planetQuest/ship'
import type { ShipColorId } from '../../planetQuest/ship'
import { PLANETS, formatNumber } from '../../solar/planets'
import type { PlanetId } from '../../solar/planets'
import { PlanetBuddy } from './Buddy'
import { CompanionArt } from './Companion'

/**
 * ของเล่นในโหมดสำรวจ
 *
 *   📒 สมุดของที่ระลึก  โปสการ์ดหนึ่งใบต่อดาวที่ไปเยี่ยมแล้ว แตะพลิกดูความลับของดาว
 *   🛠️ อู่ต่อยาน       เลือกสียานกับเพื่อนร่วมทาง เห็นผลในฉากสามมิติทันที
 */

/* ---------------- สมุดของที่ระลึก ---------------- */

export function SouvenirAlbum({
  visited,
  best,
  reduceMotion,
}: {
  visited: readonly PlanetId[]
  best: Partial<Record<PlanetId, number>>
  reduceMotion: boolean
}) {
  const [flipped, setFlipped] = useState<PlanetId[]>([])
  const collected = PLANETS.filter((planet) => buddyStatus(planet.id, best[planet.id], visited) !== 'sleep').length

  const toggle = (id: PlanetId): void => {
    setFlipped((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]))
  }

  return (
    <div className="space-y-3">
      <p className="text-sm font-bold text-slate-200">
        {collected === PLANETS.length
          ? '🏆 สะสมโปสการ์ดครบแปดดาวแล้ว! นักสำรวจตัวจริง'
          : `เก็บได้ ${collected}/${PLANETS.length} ใบ · ใบที่ยังหลับอยู่ บินไปเยี่ยมแล้วจะได้โปสการ์ด`}
      </p>
      <ul className="pq-album">
        {PLANETS.map((planet) => {
          const buddy = buddyFor(planet.id)
          const status = buddyStatus(planet.id, best[planet.id], visited)
          if (status === 'sleep') {
            return (
              <li key={planet.id}>
                <div className="pq-card pq-card-locked">
                  <PlanetBuddy planet={planet} size={64} mood="sleep" animate={!reduceMotion} />
                  <span className="mt-1 block text-base font-black text-slate-300">{planet.name}</span>
                  <span className="block text-xs text-slate-400">💤 ยังไม่ได้ไปเยี่ยม</span>
                </div>
              </li>
            )
          }
          const open = flipped.includes(planet.id)
          const secret = planet.facts[2] ?? planet.facts[0]
          return (
            <li key={planet.id}>
              <button
                type="button"
                aria-pressed={open}
                aria-label={open ? `ความลับของ${buddy.nickname}: ${secret}` : `โปสการ์ด${planet.name} แตะเพื่อพลิกดูความลับ`}
                onClick={() => toggle(planet.id)}
                className={`pq-card ${open ? 'pq-card-on' : ''}`}
              >
                <span className="pq-card-inner">
                  <span className="pq-card-face" aria-hidden="true">
                    <PlanetBuddy
                      planet={planet}
                      size={72}
                      mood={status === 'star' ? 'love' : 'happy'}
                      crown={status === 'star'}
                      animate={!reduceMotion}
                    />
                    <span className="mt-1 block text-base font-black text-white">{buddy.nickname}</span>
                    <span className="block text-xs text-slate-300">{planet.name}</span>
                    <span className="mt-1 block text-[11px] font-bold text-cyan-300">แตะเพื่อพลิกดูความลับ ↻</span>
                  </span>
                  <span className="pq-card-face pq-card-back" aria-hidden="true">
                    <span className="block text-xs font-black text-gold-300">🤫 ความลับของ{buddy.nickname}</span>
                    <span className="mt-1 block text-sm font-semibold leading-snug text-white">{secret}</span>
                    <span className="mt-2 block text-[11px] text-slate-300">
                      🌙 ดวงจันทร์ {formatNumber(planet.moons)} ดวง · 🌡️ {formatNumber(planet.meanTempC)} °C
                    </span>
                  </span>
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

/* ---------------- อู่ต่อยาน ---------------- */

/** ภาพยานตั้งตรง สีเดียวกับยานในฉาก เพื่อนร่วมทางนั่งอยู่บนหัวยาน */
export function RocketPreview({ color, companion, animate }: { color: ShipColorId; companion: CompanionId; animate: boolean }) {
  const look = shipColor(color)
  return (
    <div className="relative mx-auto w-[120px] pt-10">
      <span className="absolute left-1/2 top-0 -translate-x-1/2">
        <CompanionArt id={companion} size={58} className={animate ? 'pq-bob' : ''} />
      </span>
      <svg viewBox="0 0 120 150" className="pq-rocket" role="img" aria-label={`ยานสี${look.name} มี${companionFor(companion).name}นั่งไปด้วย`}>
        <defs>
          <linearGradient id="pq-rocket-body" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={look.bodyTop} />
            <stop offset="100%" stopColor={look.bodyBottom} />
          </linearGradient>
        </defs>
        <g className={animate ? 'pq-flame' : undefined}>
          <path d="M48 118 Q60 150 72 118 Z" fill="#fb923c" />
          <path d="M53 118 Q60 138 67 118 Z" fill="#fde68a" />
        </g>
        <path d="M40 92 L22 118 L42 112 Z" fill={look.fin} />
        <path d="M80 92 L98 118 L78 112 Z" fill={look.fin} />
        <path
          d="M60 8 C84 30 86 80 78 118 L42 118 C34 80 36 30 60 8 Z"
          fill="url(#pq-rocket-body)"
          stroke="#1e1b4b"
          strokeOpacity={0.25}
          strokeWidth={2}
        />
        <path d="M60 8 C70 17 76 28 79 40 L41 40 C44 28 50 17 60 8 Z" fill={look.fin} />
        <circle cx={60} cy={66} r={15} fill={look.window} stroke="#1e1b4b" strokeOpacity={0.35} strokeWidth={3} />
        <circle cx={55} cy={61} r={4} fill="#fff" opacity={0.6} />
        <path d="M60 118 L60 100" stroke={look.fin} strokeWidth={4} strokeLinecap="round" />
      </svg>
    </div>
  )
}

export function ShipWorkshop({
  color,
  companion,
  stats,
  reduceMotion,
  onChange,
}: {
  color: ShipColorId
  companion: CompanionId
  stats: JourneyStats
  reduceMotion: boolean
  onChange: (change: { color?: ShipColorId; companion?: CompanionId }) => void
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-[150px_1fr] sm:items-center">
      <RocketPreview color={color} companion={companion} animate={!reduceMotion} />
      <div className="space-y-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-300">สียาน</p>
          <div className="mt-1 flex flex-wrap gap-2">
            {SHIP_COLORS.map((item) => (
              <button
                key={item.id}
                type="button"
                aria-pressed={item.id === color}
                onClick={() => onChange({ color: item.id })}
                className={`pq-swatch ${item.id === color ? 'pq-swatch-on' : ''}`}
              >
                <span aria-hidden="true" className="pq-swatch-dot" style={{ background: item.fin }} />
                <span>{item.name}</span>
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-300">เพื่อนร่วมทาง</p>
          <ul className="mt-1 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {COMPANIONS.map((item) => {
              const open = isUnlocked(item, stats)
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    disabled={!open}
                    aria-pressed={item.id === companion}
                    onClick={() => onChange({ companion: item.id })}
                    className={`pq-friend-pick ${item.id === companion ? 'pq-friend-pick-on' : ''}`}
                  >
                    <CompanionArt id={item.id} size={52} locked={!open} />
                    <span className="block text-sm font-black text-white">{open ? item.name : '???'}</span>
                    <span className="block text-[11px] leading-snug text-slate-300">
                      {open ? item.kind : `🔒 ${unlockHint(item, stats)}`}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
        <p className="text-xs text-slate-400">เพื่อนร่วมทางนั่งไปกับยานทุกเที่ยว คุยกับหนูตอนออกบิน และเล่าเรื่องที่ชอบระหว่างทาง</p>
      </div>
    </div>
  )
}
