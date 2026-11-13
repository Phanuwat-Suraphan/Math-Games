/**
 * แผนภูมิ SVG สำหรับรายงานวิเคราะห์ผล (พิมพ์ A4 ได้คมชัด)
 *
 * - แท่งแนวนอนทั้งหมด มีตัวเลขกำกับทุกแท่ง และมีคำอธิบายเมื่อชี้ (title)
 * - ก่อนเรียนสีน้ำเงิน หลังเรียนสีส้ม (คู่สีเดียวกับหน้าสถิติในเกม ผ่านการตรวจสำหรับผู้มองสีบกพร่อง)
 * - ข้อความใช้สีหมึก ไม่ใช้สีของชุดข้อมูล เส้นกริดจาง ๆ เส้นเกณฑ์เป็นเส้นประ
 */

export const PRE_COLOR = '#2a78d6'
export const POST_COLOR = '#eb6834'
const INK = '#1a1a1a'
const MUTED = '#5c5c5c'
const GRID = '#d9d9d9'

const W = 640
const LABEL_W = 190
const VALUE_W = 56
const PLOT_W = W - LABEL_W - VALUE_W
const TICKS = [0, 20, 40, 60, 80, 100]

function x(v: number, max = 100): number {
  return LABEL_W + (Math.max(0, Math.min(max, v)) / max) * PLOT_W
}

function fmt(v: number | null, unit: string): string {
  return v === null ? '–' : `${Math.round(v * 100) / 100}${unit}`
}

function Axis({ top, height, max = 100, unit = '%', mark }: { top: number; height: number; max?: number; unit?: string; mark?: { value: number; label: string } }) {
  const ticks = max === 100 ? TICKS : Array.from({ length: 6 }, (_, i) => Math.round((max * i) / 5))
  return (
    <g>
      {ticks.map((t) => (
        <g key={t}>
          <line x1={x(t, max)} x2={x(t, max)} y1={top} y2={top + height} stroke={GRID} strokeWidth={1} />
          <text x={x(t, max)} y={top + height + 14} fontSize={11} fill={MUTED} textAnchor="middle">
            {t}
            {unit}
          </text>
        </g>
      ))}
      {mark && (
        <g>
          <line x1={x(mark.value, max)} x2={x(mark.value, max)} y1={top - 4} y2={top + height} stroke={INK} strokeWidth={1.5} strokeDasharray="5 4" />
          <text x={x(mark.value, max)} y={top - 7} fontSize={11} fill={INK} textAnchor="middle">
            {mark.label}
          </text>
        </g>
      )}
    </g>
  )
}

/** แท่งปลายมน 4px ด้านขวา (ฐานแท่งชิดแกน) */
function Bar({ y, h, v, max = 100, color, tip }: { y: number; h: number; v: number; max?: number; color: string; tip: string }) {
  const w = Math.max(2, x(v, max) - LABEL_W)
  const r = Math.min(4, h / 2, w / 2)
  const x0 = LABEL_W
  const d = `M${x0},${y} H${x0 + w - r} Q${x0 + w},${y} ${x0 + w},${y + r} V${y + h - r} Q${x0 + w},${y + h} ${x0 + w - r},${y + h} H${x0} Z`
  return (
    <path d={d} fill={color}>
      <title>{tip}</title>
    </path>
  )
}

export function Legend() {
  return (
    <div className="mh-an-legend">
      <span>
        <i style={{ background: PRE_COLOR }} /> ก่อนเรียน
      </span>
      <span>
        <i style={{ background: POST_COLOR }} /> หลังเรียน
      </span>
    </div>
  )
}

export interface PairRow {
  label: string
  pre: number | null
  post: number | null
}

/** แท่งคู่ ก่อน / หลังเรียน ต่อหนึ่งหัวข้อ */
export function PairBarsSvg({ rows, max = 100, unit = '%', mark, title, testId }: { rows: PairRow[]; max?: number; unit?: string; mark?: { value: number; label: string }; title: string; testId?: string }) {
  const BAR = 12
  const GAP = 2
  const ROW = BAR * 2 + GAP + 14
  const top = mark ? 22 : 8
  const h = rows.length * ROW
  return (
    <figure className="mh-an-chart" data-testid={testId}>
      <figcaption>{title}</figcaption>
      <Legend />
      <svg viewBox={`0 0 ${W} ${top + h + 22}`} role="img" aria-label={title}>
        <Axis top={top} height={h} max={max} unit={unit} mark={mark} />
        {rows.map((r, i) => {
          const y = top + i * ROW + 7
          return (
            <g key={r.label}>
              <text x={LABEL_W - 8} y={y + BAR + 4} fontSize={12} fill={INK} textAnchor="end">
                {r.label}
              </text>
              {r.pre !== null && <Bar y={y} h={BAR} v={r.pre} max={max} color={PRE_COLOR} tip={`${r.label} ก่อนเรียน ${fmt(r.pre, unit)}`} />}
              {r.post !== null && <Bar y={y + BAR + GAP} h={BAR} v={r.post} max={max} color={POST_COLOR} tip={`${r.label} หลังเรียน ${fmt(r.post, unit)}`} />}
              <text x={W - VALUE_W + 6} y={y + BAR - 2} fontSize={11} fill={INK}>
                {fmt(r.pre, unit)}
              </text>
              <text x={W - VALUE_W + 6} y={y + BAR * 2 + GAP - 2} fontSize={11} fill={INK}>
                {fmt(r.post, unit)}
              </text>
            </g>
          )
        })}
      </svg>
    </figure>
  )
}

/** แท่งชุดเดียว (เช่น ร้อยละถูกรายกลุ่มภารกิจ) */
export function SingleBarsSvg({ rows, mark, title, testId }: { rows: { label: string; value: number | null; note?: string }[]; mark?: { value: number; label: string }; title: string; testId?: string }) {
  const BAR = 16
  const ROW = BAR + 12
  const top = mark ? 22 : 8
  const h = rows.length * ROW
  return (
    <figure className="mh-an-chart" data-testid={testId}>
      <figcaption>{title}</figcaption>
      <svg viewBox={`0 0 ${W} ${top + h + 22}`} role="img" aria-label={title}>
        <Axis top={top} height={h} mark={mark} />
        {rows.map((r, i) => {
          const y = top + i * ROW + 6
          return (
            <g key={r.label}>
              <text x={LABEL_W - 8} y={y + BAR - 3} fontSize={12} fill={INK} textAnchor="end">
                {r.label}
              </text>
              {r.value !== null ? (
                <Bar y={y} h={BAR} v={r.value} color={PRE_COLOR} tip={`${r.label} ${fmt(r.value, '%')}${r.note ? ` (${r.note})` : ''}`} />
              ) : (
                <text x={LABEL_W + 6} y={y + BAR - 3} fontSize={11} fill={MUTED}>
                  ยังไม่มีข้อมูล
                </text>
              )}
              <text x={W - VALUE_W + 6} y={y + BAR - 3} fontSize={11} fill={INK}>
                {fmt(r.value, '%')}
              </text>
            </g>
          )
        })}
      </svg>
    </figure>
  )
}

/** รายคน: จุดก่อนเรียน → จุดหลังเรียน (ดัมเบล) พร้อมเส้นเกณฑ์ผ่าน */
export function DumbbellSvg({ rows, pass, title }: { rows: { label: string; pre: number | null; post: number | null }[]; pass: number; title: string }) {
  const ROW = 20
  const top = 22
  const h = rows.length * ROW
  return (
    <figure className="mh-an-chart" data-testid="mh-an-dumbbell">
      <figcaption>{title}</figcaption>
      <Legend />
      <svg viewBox={`0 0 ${W} ${top + h + 22}`} role="img" aria-label={title}>
        <Axis top={top} height={h} mark={{ value: pass, label: `เกณฑ์ ${pass}%` }} />
        {rows.map((r, i) => {
          const cy = top + i * ROW + ROW / 2
          const tip = `${r.label}: ก่อน ${fmt(r.pre, '%')} → หลัง ${fmt(r.post, '%')}`
          return (
            <g key={`${r.label}-${i}`}>
              <title>{tip}</title>
              <text x={LABEL_W - 8} y={cy + 4} fontSize={11} fill={INK} textAnchor="end">
                {r.label}
              </text>
              {r.pre !== null && r.post !== null && <line x1={x(r.pre)} x2={x(r.post)} y1={cy} y2={cy} stroke={MUTED} strokeWidth={2} />}
              {r.pre !== null && <circle cx={x(r.pre)} cy={cy} r={5} fill={PRE_COLOR} stroke="#fff" strokeWidth={2} />}
              {r.post !== null && <circle cx={x(r.post)} cy={cy} r={5} fill={POST_COLOR} stroke="#fff" strokeWidth={2} />}
              <text x={W - VALUE_W + 6} y={cy + 4} fontSize={11} fill={INK}>
                {r.pre === null ? '–' : Math.round(r.pre)}→{r.post === null ? '–' : Math.round(r.post)}
              </text>
            </g>
          )
        })}
      </svg>
    </figure>
  )
}
