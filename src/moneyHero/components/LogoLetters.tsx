import type { CSSProperties } from 'react'

/** โลโก้ตัวอักษรหลากสี เด้งเป็นคลื่นทีละตัว */
const HUES: [string, string][] = [
  ['#fff3a6', '#ffb800'],
  ['#ffd2e0', '#ff4f8b'],
  ['#c9f3ff', '#1fa2ff'],
  ['#d8ffc4', '#2fbf4a'],
  ['#ead9ff', '#8b5cf6'],
  ['#ffe0c2', '#ff7a1a'],
]

export function LogoLetters({ text }: { text: string }) {
  let k = 0
  return (
    <span className="mh-logo-main" aria-hidden="true">
      {Array.from(text).map((ch, i) => {
        if (ch === ' ') return <span key={i} className="mh-logo-space" />
        const [a, b] = HUES[k % HUES.length]
        const style = { '--la': a, '--lb': b, animationDelay: `${k * 0.09}s` } as CSSProperties
        k += 1
        return (
          <span key={i} className="mh-logo-letter" style={style}>
            {ch}
          </span>
        )
      })}
    </span>
  )
}
