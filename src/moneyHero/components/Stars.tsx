import { useId } from 'react'

/** ดาวทองแบบวาด มีแสงเงา (ดวงที่ยังไม่ได้เป็นสีเทา) */
export function StarIcon({ on = true, size = 22, className = '' }: { on?: boolean; size?: number; className?: string }) {
  const id = `st${useId().replace(/[^a-zA-Z0-9]/g, '')}`
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} className={`mh-star-svg ${on ? '' : 'mh-star-off'} ${className}`} aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={on ? '#fff3a6' : '#e9e7f1'} />
          <stop offset="55%" stopColor={on ? '#ffcf2e' : '#cdc9da'} />
          <stop offset="100%" stopColor={on ? '#f39a00' : '#a9a4bb'} />
        </linearGradient>
      </defs>
      <path
        d="M24 3.5 L30 17 L44.5 18.4 L33.5 28.3 L36.8 42.6 L24 35.1 L11.2 42.6 L14.5 28.3 L3.5 18.4 L18 17 Z"
        fill={`url(#${id})`}
        stroke={on ? '#c97a00' : '#9a95ad'}
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      <path d="M18 19 L22 10" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" opacity={on ? 0.75 : 0.5} />
    </svg>
  )
}

/** ดาว 0–3 ดวง (มีตัวเลขกำกับสำหรับโปรแกรมอ่านหน้าจอ) */
export function Stars({ n, max = 3, size = 20, reveal = false }: { n: number; max?: number; size?: number; reveal?: boolean }) {
  return (
    <span className={`mh-stars ${reveal ? 'is-reveal' : ''}`} aria-label={`${n} ดาว จาก ${max}`} role="img">
      {Array.from({ length: max }, (_, i) => (
        <StarIcon key={i} on={i < n} size={size} />
      ))}
    </span>
  )
}
