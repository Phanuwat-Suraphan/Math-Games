/**
 * ฉากหลังของทั้งเกม: ท้องฟ้า เมฆ เหรียญลอย และเส้นขอบฟ้าเมืองเงินทอง
 * ใช้ CSS ล้วน จำนวนชิ้นน้อย จึงไม่หนักเครื่อง
 */
const CLOUDS = [
  { top: '8%', w: 150, h: 46, delay: '-8s', dur: '70s' },
  { top: '22%', w: 110, h: 34, delay: '-34s', dur: '85s' },
  { top: '14%', w: 190, h: 54, delay: '-52s', dur: '95s' },
]

const COINS = [
  { left: '7%', top: '30%', delay: '0s', face: '฿' },
  { left: '88%', top: '24%', delay: '1.2s', face: '5' },
  { left: '16%', top: '58%', delay: '2.1s', face: '10' },
  { left: '80%', top: '55%', delay: '0.7s', face: '1' },
  { left: '50%', top: '6%', delay: '1.8s', face: '2' },
]

export function Sky({ city = true }: { city?: boolean }) {
  return (
    <div className="mh-sky" aria-hidden="true">
      {CLOUDS.map((c, i) => (
        <div
          key={i}
          className="mh-cloud"
          style={{ top: c.top, width: c.w, height: c.h, animationDelay: c.delay, animationDuration: c.dur }}
        />
      ))}
      {COINS.map((c, i) => (
        <div key={i} className="mh-float-coin" style={{ left: c.left, top: c.top, animationDelay: c.delay }}>
          {c.face}
        </div>
      ))}
      {city && (
        <div className="mh-city">
          <span>🏦</span>
          <span>🏪</span>
          <span>🏰</span>
          <span>🏭</span>
          <span>📚</span>
        </div>
      )}
    </div>
  )
}
