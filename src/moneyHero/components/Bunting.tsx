import type { CSSProperties } from 'react'

/**
 * ธงราวสามเหลี่ยมหลากสี แกว่งไปมาทีละผืน (แบบงานวัด/งานโรงเรียน)
 * ธงเรียงตามเส้นเชือกที่หย่อนตรงกลาง
 */

const COLORS = ['#ff6f91', '#ffd23f', '#4fc3f7', '#7ed957', '#c38bff', '#ff9a3c']

export function Bunting({ count = 14, className = '' }: { count?: number; className?: string }) {
  const flags = Array.from({ length: count }, (_, i) => {
    const t = count === 1 ? 0.5 : i / (count - 1)
    // เชือกหย่อนเป็นรูปพาราโบลา ตรงกลางต่ำสุด
    const sag = 12 * (1 - (2 * t - 1) ** 2)
    return { y: sag, color: COLORS[i % COLORS.length], delay: `${(i % 5) * -0.35}s` }
  })
  return (
    <div className={`mh-bunting ${className}`} aria-hidden="true">
      <svg className="mh-bunting-string" viewBox="0 0 100 20" preserveAspectRatio="none">
        <path d="M0 3 Q50 27 100 3" fill="none" stroke="#8a5a33" strokeWidth="1.2" vectorEffect="non-scaling-stroke" />
      </svg>
      {flags.map((f, i) => (
        <span key={i} className="mh-bunting-flag" style={{ '--y': `${f.y}px`, background: f.color, animationDelay: f.delay } as CSSProperties} />
      ))}
    </div>
  )
}

/** ลูกโป่งลอยขึ้นฟ้าช้า ๆ (ฉากหลัง) */
export function Balloon({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 40 80" width="40" height="80" aria-hidden="true">
      <path d="M20 47 Q16 58 21 66 Q26 74 19 80" fill="none" stroke="rgba(43,35,80,0.35)" strokeWidth="1.2" />
      <ellipse cx="20" cy="22" rx="16" ry="20" fill={color} />
      <path d="M17 41 L23 41 L20 46 Z" fill={color} />
      <ellipse cx="13" cy="14" rx="4.5" ry="7" fill="#fff" opacity="0.45" transform="rotate(-20 13 14)" />
    </svg>
  )
}
