import { useEffect, useId } from 'react'
import { speak } from '../utils/speech'
import type { Boss } from '../data/bosses'
import type { Wear } from '../data/shop'
import { AvatarArt } from './Art'

/**
 * สนามสู้บอส (ขั้น BOSS ของทุกด่าน)
 * ตอบถูก = ฮีโร่ปาเหรียญใส่บอส พลังบอสลด · ตอบผิด = บอสหัวเราะเยาะ
 * พลังบอสเท่ากับจำนวนข้อที่ต้องตอบถูกเพื่อชนะพอดี หมดพลัง = ชนะแน่นอน
 */

export type BossMood = 'idle' | 'hit' | 'laugh' | 'ko'

export function BossArt({ boss, mood = 'idle' }: { boss: Boss; mood?: BossMood }) {
  const uid = useId().replace(/:/g, '')
  const g = `boss-${uid}`
  const ink = '#2b2350'
  return (
    <svg viewBox="0 0 160 160" className={`mh-boss-art is-${mood}`} aria-hidden="true">
      <defs>
        <radialGradient id={g} cx="0.38" cy="0.3" r="0.8">
          <stop offset="0" stopColor="#fff" stopOpacity="0.85" />
          <stop offset="0.3" stopColor={boss.color} />
          <stop offset="1" stopColor={boss.dark} />
        </radialGradient>
      </defs>
      <ellipse cx="80" cy="150" rx="46" ry="7" fill={ink} opacity="0.18" />
      {/* ของบนหัว */}
      {boss.top === 'horns' && (
        <g fill="#fff4e6" stroke={ink} strokeWidth="3" strokeLinejoin="round">
          <path d="M44 44 L34 12 L60 34 Z" />
          <path d="M116 44 L126 12 L100 34 Z" />
        </g>
      )}
      {boss.top === 'ears' && (
        <g fill={boss.color} stroke={ink} strokeWidth="3">
          <circle cx="42" cy="38" r="17" />
          <circle cx="118" cy="38" r="17" />
          <circle cx="42" cy="38" r="8" fill="#ffc9de" stroke="none" />
          <circle cx="118" cy="38" r="8" fill="#ffc9de" stroke="none" />
        </g>
      )}
      {boss.top === 'crown' && (
        <g>
          <path d="M50 34 L48 6 L64 20 L80 2 L96 20 L112 6 L110 34 Z" fill="#ffd43b" stroke={ink} strokeWidth="3" strokeLinejoin="round" />
          <circle cx="80" cy="22" r="4" fill="#fa5252" />
        </g>
      )}
      {boss.top === 'antenna' && (
        <g stroke={ink} strokeWidth="3" strokeLinecap="round">
          <path d="M62 30 Q54 14 46 10" fill="none" />
          <path d="M98 30 Q106 14 114 10" fill="none" />
          <circle cx="46" cy="10" r="7" fill="#ffd43b" />
          <circle cx="114" cy="10" r="7" fill="#ffd43b" />
        </g>
      )}
      {boss.top === 'hat' && (
        <g stroke={ink} strokeWidth="3" strokeLinejoin="round">
          <path d="M56 34 L80 -4 Q84 -8 88 -2 L104 34 Z" fill={boss.dark} />
          <path d="M40 36 Q80 24 120 36 Q80 46 40 36 Z" fill={boss.dark} />
          <circle cx="82" cy="12" r="4" fill="#ffd43b" stroke="none" />
        </g>
      )}
      {/* ตัว: ก้อนกลมนุ่มนิ่ม */}
      <g className="mh-boss-body">
        <path d="M24 98 Q20 32 80 30 Q140 32 136 98 Q138 146 80 146 Q22 146 24 98 Z" fill={`url(#${g})`} stroke={ink} strokeWidth="4" />
        {/* แขนเล็ก ๆ */}
        <path d="M26 98 Q8 92 12 76" stroke={ink} strokeWidth="4" fill="none" strokeLinecap="round" className="mh-boss-arm" />
        <path d="M134 98 Q152 92 148 76" stroke={ink} strokeWidth="4" fill="none" strokeLinecap="round" className="mh-boss-arm mh-boss-arm-r" />
        {/* ท้องมีของประจำตัว */}
        <ellipse cx="80" cy="124" rx="21" ry="17" fill="#fff" opacity="0.85" stroke={ink} strokeWidth="2.5" />
        <text x="80" y="132" fontSize="21" textAnchor="middle">
          {boss.icon}
        </text>
        {/* ตา */}
        {mood === 'ko' ? (
          <g stroke={ink} strokeWidth="4" strokeLinecap="round">
            <path d="M48 62 l14 14 M62 62 l-14 14" />
            <path d="M98 62 l14 14 M112 62 l-14 14" />
          </g>
        ) : mood === 'laugh' ? (
          <g stroke={ink} strokeWidth="4" strokeLinecap="round" fill="none">
            <path d="M46 72 q9 -10 18 0" />
            <path d="M96 72 q9 -10 18 0" />
          </g>
        ) : (
          <g>
            <ellipse cx="56" cy="68" rx="11" ry={mood === 'hit' ? 4 : 13} fill="#fff" stroke={ink} strokeWidth="3" />
            <ellipse cx="104" cy="68" rx="11" ry={mood === 'hit' ? 4 : 13} fill="#fff" stroke={ink} strokeWidth="3" />
            {mood !== 'hit' && (
              <>
                <circle cx="58" cy="70" r="5.5" fill={ink} />
                <circle cx="106" cy="70" r="5.5" fill={ink} />
                <circle cx="60" cy="67" r="2" fill="#fff" />
                <circle cx="108" cy="67" r="2" fill="#fff" />
              </>
            )}
            {/* คิ้วเจ้าเล่ห์ */}
            <path d="M42 50 l22 8 M118 50 l-22 8" stroke={ink} strokeWidth="4" strokeLinecap="round" />
          </g>
        )}
        {/* ปาก */}
        {mood === 'laugh' ? (
          <path d="M60 86 Q80 104 100 86 Z" fill="#c92a2a" stroke={ink} strokeWidth="3" strokeLinejoin="round" />
        ) : mood === 'ko' || mood === 'hit' ? (
          <path d="M66 92 q7 -6 14 0 q7 6 14 0" stroke={ink} strokeWidth="3.5" fill="none" strokeLinecap="round" />
        ) : (
          <g>
            <path d="M64 88 Q80 98 96 88" stroke={ink} strokeWidth="3.5" fill="none" strokeLinecap="round" />
            <path d="M70 90 l3 6 l3 -5 M84 91 l3 5 l3 -6" fill="#fff" stroke={ink} strokeWidth="1.5" strokeLinejoin="round" />
          </g>
        )}
        <ellipse cx="40" cy="86" rx="7" ry="4.5" fill="#ff8fb3" opacity="0.7" />
        <ellipse cx="120" cy="86" rx="7" ry="4.5" fill="#ff8fb3" opacity="0.7" />
        {mood === 'ko' && (
          <g className="mh-boss-stars" fontSize="16">
            <text x="40" y="34">⭐</text>
            <text x="104" y="30">💫</text>
          </g>
        )}
      </g>
    </svg>
  )
}

export function BossArena({
  boss,
  hp,
  hits,
  event,
  avatar,
  wear,
}: {
  boss: Boss
  hp: number
  hits: number
  /** เหตุการณ์ล่าสุด (key เปลี่ยนทุกครั้งเพื่อเล่นแอนิเมชันใหม่) */
  event: { kind: 'hit' | 'miss'; key: number; text: string } | null
  avatar: string
  wear: Wear
}) {
  const left = Math.max(0, hp - hits)
  const ko = left === 0
  // บอสพูดเป็นเสียงไทยตอนเริ่ม และตอนหมดแรง
  useEffect(() => speak(boss.intro), [boss.intro])
  useEffect(() => {
    if (ko) speak(boss.lose, { queue: true })
  }, [ko, boss.lose])
  const mood: BossMood = ko ? 'ko' : event?.kind === 'hit' ? 'hit' : event?.kind === 'miss' ? 'laugh' : 'idle'
  return (
    <div className={`mh-card mh-boss-arena ${ko ? 'is-ko' : ''}`} data-testid="mh-boss-arena">
      <div className="mh-boss-hero">
        <span key={event?.kind === 'miss' ? `m${event.key}` : 'hero'} className={event?.kind === 'miss' ? 'is-shake' : ''}>
          <AvatarArt avatar={avatar} size={92} mood={ko || event?.kind === 'hit' ? 'happy' : 'normal'} wear={wear} />
        </span>
      </div>
      <div className="mh-boss-lane" aria-hidden="true">
        {event?.kind === 'hit' && (
          <span key={`c${event.key}`} className="mh-boss-shot">
            🪙
          </span>
        )}
        <span className="mh-boss-vs">VS</span>
      </div>
      <div className="mh-boss-side">
        <div className="mh-boss-name">
          👾 {boss.name}
          <span className="mh-boss-hp-text" data-testid="mh-boss-hp">
            {ko ? 'หมดแรง!' : `พลัง ${left}/${hp}`}
          </span>
        </div>
        <div className="mh-boss-hp" role="progressbar" aria-valuemin={0} aria-valuemax={hp} aria-valuenow={left} aria-label="พลังของบอส">
          {Array.from({ length: hp }, (_, i) => (
            <span key={i} className={i < left ? 'is-full' : ''} />
          ))}
        </div>
        <div key={event?.kind === 'hit' ? `h${event.key}` : 'boss'} className={`mh-boss-body-wrap ${event?.kind === 'hit' ? 'is-hit' : ''}`}>
          <BossArt boss={boss} mood={mood} />
          {event?.kind === 'hit' && !ko && <span className="mh-boss-dmg">-1</span>}
        </div>
        <div className="mh-bubble mh-boss-say" aria-live="polite">
          {ko ? boss.lose : event ? event.text : boss.intro}
        </div>
      </div>
    </div>
  )
}
