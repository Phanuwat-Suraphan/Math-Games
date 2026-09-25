import type { CSSProperties } from 'react'
import type { Planet } from '../../solar/planets'

/**
 * ชิ้นส่วนเล็ก ๆ ที่เกมอวกาศทั้งสองเกมใช้ร่วมกัน
 * (ยานสำรวจระบบสุริยะ และภารกิจแปดดาว)
 */

/** ดาวสามดวงแบบเต็มหรือว่าง บอกผลด้วยจำนวนดาวและข้อความอ่านออกเสียง ไม่ใช่สีอย่างเดียว */
export function Stars({ count, max = 3 }: { count: number; max?: number }) {
  return (
    <span aria-label={`ได้ ${count} ดาวจาก ${max} ดาว`} className="whitespace-nowrap">
      {Array.from({ length: max }, (_, index) => (
        <span key={index} aria-hidden="true" className={index < count ? 'text-gold-300' : 'text-slate-600'}>
          ★
        </span>
      ))}
    </span>
  )
}

/** จุดสีของดาว ใช้ในปุ่มเลือกดาวและตราประทับ */
export function PlanetDot({ planet, size = 18 }: { planet: Planet; size?: number }) {
  return (
    <span
      aria-hidden="true"
      className="sol-dot"
      style={
        {
          width: size,
          height: size,
          '--dot': planet.color,
          '--dot-light': planet.highlight,
        } as CSSProperties
      }
    />
  )
}
