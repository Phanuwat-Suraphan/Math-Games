import { useMemo, type CSSProperties } from 'react'

/**
 * เอฟเฟกต์ฉลอง ใช้ CSS ล้วน จำนวนชิ้นน้อย และหยุดเองเมื่อจบแอนิเมชัน
 * ถ้าเปิด "ลดภาพเคลื่อนไหว" จะแทบไม่ขยับ
 */

const COLORS = ['#ffd23f', '#ff7a59', '#4f8cff', '#31c48d', '#c38bff', '#ff6fa5']

/** ดาวและเหรียญแตกกระจายเล็ก ๆ ตอนตอบถูก */
export function Burst() {
  const parts = useMemo(
    () =>
      Array.from({ length: 10 }, (_, i) => {
        const angle = (i / 10) * Math.PI * 2
        const dist = 60 + (i % 3) * 18
        return { dx: Math.cos(angle) * dist, dy: Math.sin(angle) * dist, icon: i % 2 === 0 ? '⭐' : '🪙', delay: (i % 4) * 0.03 }
      }),
    [],
  )
  return (
    <div className="mh-burst" aria-hidden="true">
      {parts.map((p, i) => (
        <span
          key={i}
          style={{ '--dx': `${p.dx}px`, '--dy': `${p.dy}px`, animationDelay: `${p.delay}s` } as CSSProperties}
        >
          {p.icon}
        </span>
      ))}
    </div>
  )
}

/** กระดาษสีโปรยเต็มจอ ตอนผ่านด่าน */
export function Confetti({ count = 36 }: { count?: number }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        left: (i * 97) % 100,
        delay: (i % 12) * 0.12,
        dur: 2.2 + (i % 5) * 0.35,
        color: COLORS[i % COLORS.length],
        rotate: (i * 47) % 360,
        round: i % 3 === 0,
      })),
    [count],
  )
  return (
    <div className="mh-confetti" aria-hidden="true">
      {pieces.map((p, i) => (
        <span
          key={i}
          style={{
            left: `${p.left}%`,
            background: p.color,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.dur}s`,
            transform: `rotate(${p.rotate}deg)`,
            borderRadius: p.round ? '50%' : '2px',
          }}
        />
      ))}
    </div>
  )
}

/** เหรียญเด้งลงมาตามจำนวนที่ได้ (สูงสุด 12 เหรียญ) */
export function CoinRain({ n }: { n: number }) {
  const coins = Math.min(12, Math.max(0, n))
  return (
    <div className="mh-coin-rain" aria-hidden="true">
      {Array.from({ length: coins }, (_, i) => (
        <span key={i} style={{ animationDelay: `${0.2 + i * 0.08}s`, left: `${8 + ((i * 37) % 84)}%` }}>
          🪙
        </span>
      ))}
    </div>
  )
}
