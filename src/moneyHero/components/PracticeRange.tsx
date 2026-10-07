import type { CSSProperties } from 'react'
import type { NpcId } from '../engine/types'
import type { Wear } from '../data/shop'
import { BALLOON_COLORS, coachLine, comboOf, type Balloon } from '../data/practice'
import { AvatarArt, CharacterArt } from './Art'

/**
 * ลานฝึกยิงลูกโป่ง (ขั้น PRACTICE): โค้ชประจำด่านเชียร์ ลูกโป่งหนึ่งลูกต่อข้อ
 * ตอบถูกลูกโป่งแตก (ถูกครั้งแรกได้ ⭐) ผิดครบ 2 ครั้งลูกโป่งลอยหนีไป
 */

function BalloonArt({ color, dark, label }: { color: string; dark: string; label: string }) {
  return (
    <svg viewBox="0 0 48 78" className="mh-pballoon-art" aria-hidden="true">
      <path d="M24 53 Q19 60 25 66 Q30 72 23 78" stroke="#8a7a9c" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      <path d="M24 2 C10 2 3 13 3 25 C3 38 14 48 24 51 C34 48 45 38 45 25 C45 13 38 2 24 2 Z" fill={color} stroke={dark} strokeWidth="2.5" />
      <path d="M20 54 L28 54 L24 49 Z" fill={dark} />
      <ellipse cx="15" cy="16" rx="4.5" ry="8" fill="#fff" opacity="0.6" transform="rotate(-22 15 16)" />
      <text x="24" y="32" textAnchor="middle" fontSize="17" fontWeight="800" fill="#fff" stroke={dark} strokeWidth="0.8">
        {label}
      </text>
    </svg>
  )
}

export function PracticeRange({
  total,
  balloons,
  nudge,
  coach,
  avatar,
  wear,
}: {
  total: number
  balloons: readonly Balloon[]
  /** เปลี่ยนค่าทุกครั้งที่ตอบผิดครั้งแรก (0 = ไม่มี) ลูกโป่งลูกปัจจุบันจะส่าย */
  nudge: number
  coach: NpcId
  avatar: string
  wear: Wear
}) {
  const done = balloons.length >= total
  const popped = balloons.filter((b) => b !== 'away').length
  const stars = balloons.filter((b) => b === 'star').length
  const combo = comboOf(balloons)
  const line = coachLine(balloons, total, nudge > 0)
  return (
    <div className={`mh-card mh-practice ${done ? 'is-done' : ''}`} data-testid="mh-practice">
      <div className="mh-practice-head">
        <CharacterArt id={coach} size={60} mood={done ? 'happy' : nudge > 0 ? 'think' : 'normal'} />
        <div className="mh-bubble mh-practice-say" aria-live="polite">
          <b>🎈 ลานฝึกยิงลูกโป่ง</b>
          <span>{line}</span>
        </div>
        <div className="mh-practice-chips">
          <span className="mh-practice-count" data-testid="mh-practice-count">
            🎈 {popped}/{total}
          </span>
          <span className="mh-practice-stars">⭐ {stars}</span>
        </div>
      </div>
      <div className="mh-practice-sky" style={{ '--n': total } as CSSProperties}>
        <span className="mh-practice-hero" aria-hidden="true">
          <AvatarArt avatar={avatar} size={58} wear={wear} mood={done || balloons[balloons.length - 1] === 'star' ? 'happy' : 'normal'} />
        </span>
        <div className="mh-practice-row">
          {Array.from({ length: total }, (_, i) => {
            const b = balloons[i]
            const [color, dark] = BALLOON_COLORS[i % BALLOON_COLORS.length]
            const now = !done && i === balloons.length
            return (
              <span
                key={now ? `now-${nudge}` : i}
                className={`mh-pballoon ${b ? `is-${b}` : ''} ${now ? 'is-now' : ''} ${now && nudge > 0 ? 'is-nudge' : ''}`}
                style={{ '--i': i } as CSSProperties}
              >
                {b === 'star' || b === 'pop' ? (
                  <span className="mh-pballoon-burst">
                    <span className="mh-pballoon-prize">{b === 'star' ? '⭐' : '👍'}</span>
                    {b === 'star' && (
                      <>
                        <i className="mh-pballoon-bit" style={{ '--a': '0deg', background: color } as CSSProperties} />
                        <i className="mh-pballoon-bit" style={{ '--a': '72deg', background: dark } as CSSProperties} />
                        <i className="mh-pballoon-bit" style={{ '--a': '144deg', background: color } as CSSProperties} />
                        <i className="mh-pballoon-bit" style={{ '--a': '216deg', background: dark } as CSSProperties} />
                        <i className="mh-pballoon-bit" style={{ '--a': '288deg', background: color } as CSSProperties} />
                      </>
                    )}
                  </span>
                ) : (
                  <span className="mh-pballoon-body">
                    <BalloonArt color={color} dark={dark} label={b === 'away' ? '💨' : String(i + 1)} />
                  </span>
                )}
              </span>
            )
          })}
        </div>
        {combo >= 2 && (
          <span key={combo} className="mh-practice-combo">
            🔥 คอมโบ ×{combo}
          </span>
        )}
      </div>
    </div>
  )
}
