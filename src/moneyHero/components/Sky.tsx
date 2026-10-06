import type { DenomId } from '../engine/types'
import { BuildingArt } from './BuildingArt'
import { CoinSvg } from './MoneyArt'

/**
 * ฉากหลังของทั้งเกม: ท้องฟ้า ดวงอาทิตย์ เมฆ เหรียญลอย
 * และ (หน้าเริ่มเกม) เนินหญ้ากับอาคารของเมืองเงินทอง
 * ภาพเคลื่อนไหวใช้ transform ล้วน จึงไม่หนักเครื่อง
 */
const CLOUDS = [
  { top: '8%', w: 150, h: 46, delay: '-8s', dur: '70s' },
  { top: '22%', w: 110, h: 34, delay: '-34s', dur: '85s' },
  { top: '14%', w: 190, h: 54, delay: '-52s', dur: '95s' },
]

const COINS: { left: string; top: string; delay: string; id: DenomId }[] = [
  { left: '6%', top: '30%', delay: '0s', id: 'b10' },
  { left: '89%', top: '26%', delay: '1.2s', id: 'b5' },
  { left: '14%', top: '56%', delay: '2.1s', id: 'b2' },
  { left: '82%', top: '52%', delay: '0.7s', id: 'b1' },
  { left: '48%', top: '5%', delay: '1.8s', id: 's50' },
]

/** อาคารบนเนินหญ้า (ตำแหน่งอยู่ใน CSS: จอกว้างกับมือถือจัดต่างกัน ไม่ให้แผงปุ่มบังปราสาท) */
const SKYLINE = [5, 1, 7, 4, 12]

const TREES = [
  { left: 36, bottom: 11, s: 1 },
  { left: 41, bottom: 14, s: 0.8 },
  { left: 58, bottom: 13, s: 0.9 },
  { left: 62, bottom: 9, s: 1.1 },
]

function Hills() {
  return (
    <svg className="mh-hills" viewBox="0 0 1600 300" preserveAspectRatio="none" aria-hidden="true">
      <path d="M0 150 C 200 60, 420 70, 640 130 S 1100 40, 1300 110 S 1520 90, 1600 120 L1600 300 L0 300 Z" fill="#9fdc8a" opacity="0.75" />
      <path d="M0 190 C 260 120, 520 150, 800 165 S 1300 110, 1600 170 L1600 300 L0 300 Z" fill="#7cc35a" />
      <path d="M0 230 C 300 200, 600 215, 800 210 S 1300 200, 1600 225 L1600 300 L0 300 Z" fill="#5fae47" />
      <path d="M0 192 C 260 122, 520 152, 800 167" fill="none" stroke="#c7f2b0" strokeWidth="5" opacity="0.7" />
    </svg>
  )
}

function Tree({ s }: { s: number }) {
  return (
    <svg viewBox="-30 -70 60 75" width={60 * s} height={75 * s} aria-hidden="true">
      <ellipse cx="2" cy="2" rx="22" ry="5" fill="#1e3c14" opacity="0.2" />
      <rect x="-4" y="-22" width="8" height="24" rx="3" fill="#8a5a33" />
      <circle cx="-11" cy="-32" r="15" fill="#3a8f41" />
      <circle cx="11" cy="-32" r="15" fill="#33803b" />
      <circle cx="0" cy="-44" r="19" fill="#4caf54" />
      <circle cx="-7" cy="-52" r="7" fill="#8ad97c" opacity="0.75" />
    </svg>
  )
}

export function Sky({ city = true }: { city?: boolean }) {
  return (
    <div className="mh-sky" aria-hidden="true">
      <div className="mh-sun">
        <i />
      </div>
      {CLOUDS.map((c, i) => (
        <div
          key={i}
          className="mh-cloud"
          style={{ top: c.top, width: c.w, height: c.h, animationDelay: c.delay, animationDuration: c.dur }}
        />
      ))}
      {COINS.map((c, i) => (
        <div key={i} className="mh-float-coin" style={{ left: c.left, top: c.top, animationDelay: c.delay }}>
          <CoinSvg id={c.id} />
        </div>
      ))}
      {city && (
        <div className="mh-city">
          <Hills />
          {TREES.map((t, i) => (
            <span key={`t${i}`} className="mh-city-tree" style={{ left: `${t.left}%`, bottom: `${t.bottom}%` }}>
              <Tree s={t.s} />
            </span>
          ))}
          {SKYLINE.map((level) => (
            <span key={level} className={`mh-city-bld mh-city-b${level}`}>
              <BuildingArt level={level} className="mh-city-svg" />
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
