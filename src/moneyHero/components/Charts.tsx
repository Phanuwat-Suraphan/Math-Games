import type { Skill } from '../engine/types'
import type { TestResult } from '../engine/progress'
import { SKILLS, SKILL_ICONS, SKILL_NAMES } from '../data/characters'
import { testPercent, testSkillPercent } from '../engine/report'

/**
 * แผนภูมิของหน้าสถิติ โปรไฟล์ แบบทดสอบ และแผงคุณครู
 *
 * ใช้แท่งแนวนอนทั้งหมด อ่านค่าได้ตรงกว่าแผนภูมิใยแมงมุม
 * ทุกแท่งมีตัวเลขกำกับ และมีคำอธิบายเมื่อชี้ (title) จึงไม่ต้องดูจากสีอย่างเดียว
 * สองชุดข้อมูล (ก่อน/หลังเรียน) ใช้สีน้ำเงินกับส้ม ผ่านการตรวจสำหรับผู้ที่มองสีบกพร่องแล้ว
 */

/** ต่ำกว่านี้ถือว่ายังควรฝึก (ตรงกับ weakSkills ใน engine/progress.ts) */
export const WEAK_BELOW = 70

export function StatTile({ icon, label, value, sub }: { icon: string; label: string; value: string | number; sub?: string }) {
  return (
    <div className="mh-stat-tile">
      <span className="mh-stat-tile-icon" aria-hidden="true">
        {icon}
      </span>
      <span className="mh-stat-tile-value">{value}</span>
      <span className="mh-stat-tile-label">{label}</span>
      {sub && <span className="mh-stat-tile-sub">{sub}</span>}
    </div>
  )
}

/** แท่งความแม่นยำรายทักษะ (ชุดเดียว สีเดียว) */
export function SkillBars({
  values,
  counts,
  caption = 'ตอบถูกครั้งแรก (%) แยกตามทักษะ',
}: {
  values: Record<Skill, number | null>
  counts?: Record<Skill, number>
  caption?: string
}) {
  return (
    <figure className="mh-chart" data-testid="mh-skill-bars">
      <figcaption className="mh-chart-caption">{caption}</figcaption>
      <ul className="mh-bars">
        {SKILLS.map((s) => {
          const v = values[s]
          const weak = v !== null && v < WEAK_BELOW
          const tip = v === null ? `${SKILL_NAMES[s]}: ยังไม่มีข้อมูล` : `${SKILL_NAMES[s]}: ${v}%${counts ? ` จาก ${counts[s]} ข้อ` : ''}`
          return (
            <li key={s} className="mh-bar-row" title={tip}>
              <span className="mh-bar-label">
                <span aria-hidden="true">{SKILL_ICONS[s]}</span> {SKILL_NAMES[s]}
              </span>
              <span className="mh-meter-track">
                {v !== null && <span className="mh-meter-fill" style={{ width: `${Math.max(2, v)}%` }} />}
              </span>
              <span className="mh-bar-value">
                {v === null ? <span className="mh-soft">–</span> : `${v}%`}
                {weak && (
                  <span className="mh-weak-tag">
                    ⚠<span className="mh-weak-text"> ควรฝึก</span>
                  </span>
                )}
              </span>
            </li>
          )
        })}
      </ul>
    </figure>
  )
}

/** เปรียบเทียบก่อนเรียน → หลังเรียน รวมและรายทักษะ */
export function BeforeAfter({ pre, post }: { pre?: TestResult; post?: TestResult }) {
  const rows: { key: string; label: string; icon: string; a: number | null; b: number | null; total?: boolean }[] = [
    { key: 'all', label: 'คะแนนรวม', icon: '⭐', a: testPercent(pre), b: testPercent(post), total: true },
    ...SKILLS.map((s) => ({ key: s, label: SKILL_NAMES[s], icon: SKILL_ICONS[s], a: testSkillPercent(pre, s), b: testSkillPercent(post, s) })),
  ].filter((r) => r.a !== null || r.b !== null)

  return (
    <figure className="mh-chart" data-testid="mh-before-after">
      <figcaption className="mh-chart-caption">คะแนนก่อนเรียน → หลังเรียน (%)</figcaption>
      <div className="mh-legend" aria-hidden="true">
        <span>
          <i className="mh-swatch mh-swatch-pre" /> ก่อนเรียน
        </span>
        <span>
          <i className="mh-swatch mh-swatch-post" /> หลังเรียน
        </span>
      </div>
      <ul className="mh-pairs">
        {rows.map((r) => {
          const diff = r.a !== null && r.b !== null ? r.b - r.a : null
          return (
            <li key={r.key} className={`mh-pair-row ${r.total ? 'is-total' : ''}`}>
              <span className="mh-bar-label">
                <span aria-hidden="true">{r.icon}</span> {r.label}
              </span>
              <span className="mh-pair-bars">
                <span className="mh-meter-track is-thin" title={`ก่อนเรียน ${r.a ?? '–'}%`}>
                  {r.a !== null && <span className="mh-meter-fill mh-fill-pre" style={{ width: `${Math.max(2, r.a)}%` }} />}
                </span>
                <span className="mh-meter-track is-thin" title={`หลังเรียน ${r.b ?? '–'}%`}>
                  {r.b !== null && <span className="mh-meter-fill mh-fill-post" style={{ width: `${Math.max(2, r.b)}%` }} />}
                </span>
              </span>
              <span className="mh-bar-value mh-pair-value">
                {r.a ?? '–'} → {r.b ?? '–'}
                {diff !== null && diff !== 0 && <span className={`mh-diff ${diff > 0 ? 'is-up' : 'is-down'}`}>{diff > 0 ? `▲ ${diff}` : `▼ ${-diff}`}</span>}
              </span>
            </li>
          )
        })}
      </ul>
    </figure>
  )
}
