/**
 * แผนที่เส้นทางของด่านในหนึ่งโลก
 *
 * เดิมด่านแสดงเป็นการ์ดเรียงกันเป็นตาราง ซึ่งทำให้รู้สึกเหมือน "รายการแบบฝึกหัด"
 * ไฟล์นี้คำนวณตำแหน่งด่านให้เป็นเส้นทางคดเคี้ยว เด็กจึงเห็นว่ากำลังเดินทาง
 *
 * คำนวณตำแหน่งจากจำนวนด่านจริง ไม่ได้เขียนพิกัดตายตัว
 * เพิ่มด่านใน data/stages.ts แล้วแผนที่ขยายตามเอง
 */

export interface MapNode {
  stageId: string
  /** พิกัดในระบบ 0–100 ทั้งสองแกน ผู้เรียกเอาไปคูณกับขนาดจริง */
  x: number
  y: number
  index: number
  isBoss: boolean
}

export interface StageMapLayout {
  nodes: MapNode[]
  /** เส้นทางเดินเป็น path ของ SVG */
  pathD: string
  /** ความสูงของแผนที่เทียบกับความกว้าง 100 หน่วย */
  height: number
}

/** รัศมีหมุดด่านปกติ ในระบบพิกัดกว้าง 100 หน่วย */
export const PIN_RADIUS = 6.5
/** หมุดบอสใหญ่กว่าเล็กน้อย ให้เห็นว่าเป็นจุดสำคัญ */
export const BOSS_PIN_RADIUS = 8.5

/**
 * ระยะห่างแนวตั้งระหว่างด่าน
 * ต้องมากกว่าเส้นผ่านศูนย์กลางหมุดบอส ไม่งั้นหมุดจะทับกันจนอ่านไม่ออก
 */
const ROW_GAP = 20
const TOP_PADDING = 14
/** ระยะแกว่งซ้ายขวาจากแนวกลาง */
const WAVE_AMPLITUDE = 26

/**
 * วางด่านเป็นเส้นทางคลื่นจากบนลงล่าง ด่านละแถว
 *
 * ทำไมด่านละแถว: ถ้าวางสองด่านต่อแถว หมุดจะอยู่ใกล้กันเกินไปจนทับกัน
 * และเด็กสับสนว่าต้องเล่นด่านไหนก่อน
 *
 * ทำไมแกว่งซ้ายขวา: เรียงตรงลงมาแถวเดียวจะดูเหมือนรายการแบบฝึกหัด
 * การแกว่งทำให้สายตาเดินตามเส้นทางเหมือนกำลังเดินทางจริง
 *
 * เส้นทางไล่จากบนลงล่าง เหมาะกับการเลื่อนดูบนมือถือ
 */
export function buildStageMap(
  stages: readonly { id: string; isBoss: boolean }[],
): StageMapLayout {
  if (stages.length === 0) {
    return { nodes: [], pathD: '', height: 40 }
  }

  const nodes: MapNode[] = stages.map((stage, index) => ({
    stageId: stage.id,
    // sin ให้ลำดับ 50 → 76 → 50 → 24 → 50 … เป็นคลื่นนุ่ม ๆ
    x: 50 + WAVE_AMPLITUDE * Math.sin((index * Math.PI) / 2),
    y: TOP_PADDING + index * ROW_GAP,
    index,
    isBoss: stage.isBoss,
  }))

  // เส้นทางโค้งเชื่อมหมุด ใช้เส้นโค้งลูกบาศก์ให้ต่อกันเนียนตลอดสาย
  let pathD = `M ${nodes[0]!.x} ${nodes[0]!.y}`
  for (let index = 1; index < nodes.length; index += 1) {
    const previous = nodes[index - 1] as MapNode
    const node = nodes[index] as MapNode
    const controlY = previous.y + ROW_GAP / 2
    pathD += ` C ${previous.x} ${controlY} ${node.x} ${controlY} ${node.x} ${node.y}`
  }

  const last = nodes[nodes.length - 1] as MapNode
  return { nodes, pathD, height: last.y + TOP_PADDING }
}

/**
 * หมุดด่านหนึ่งอัน วาดตามสถานะ
 * ไม่ใช้สีอย่างเดียวบอกสถานะ — มีสัญลักษณ์กำกับเสมอ เพื่อให้เด็กตาบอดสีอ่านออก
 */
export function stagePin(
  status: 'LOCKED' | 'AVAILABLE' | 'IN_PROGRESS' | 'COMPLETED' | 'MASTERED',
  label: string,
  isBoss: boolean,
): string {
  const size = isBoss ? BOSS_PIN_RADIUS : PIN_RADIUS

  const style = {
    LOCKED: { fill: '#334155', ring: '#1e293b', text: '#64748b', mark: '🔒' },
    AVAILABLE: { fill: '#22c55e', ring: '#86efac', text: '#052e16', mark: '' },
    IN_PROGRESS: { fill: '#f59e0b', ring: '#fcd34d', text: '#451a03', mark: '' },
    COMPLETED: { fill: '#3b82f6', ring: '#93c5fd', text: '#082f49', mark: '✓' },
    MASTERED: { fill: '#a855f7', ring: '#fbbf24', text: '#fff', mark: '★' },
  }[status]

  const pulse =
    status === 'AVAILABLE'
      ? `<circle r="${size + 4}" fill="none" stroke="${style.ring}" stroke-width="1.5" opacity=".7">
           <animate attributeName="r" values="${size};${size + 7};${size}" dur="2s" repeatCount="indefinite"/>
           <animate attributeName="opacity" values=".7;0;.7" dur="2s" repeatCount="indefinite"/>
         </circle>`
      : ''

  const crown = isBoss
    ? `<path d="M-7 -${size + 3} L-4 -${size + 8} L0 -${size + 4} L4 -${size + 8} L7 -${size + 3} Z"
         fill="#fbbf24"/>`
    : ''

  return `
    ${pulse}
    ${crown}
    <circle r="${size}" fill="${style.fill}" stroke="${style.ring}" stroke-width="2"/>
    <text y="${size * 0.38}" text-anchor="middle"
      font-family="system-ui, sans-serif" font-size="${size * 0.95}"
      font-weight="800" fill="${style.text}">${style.mark || label}</text>`
}
