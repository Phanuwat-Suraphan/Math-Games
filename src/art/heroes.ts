/**
 * ภาพตัวละครที่เด็กเลือกเป็นอวตาร วาดด้วย SVG
 *
 * ออกแบบให้เป็นชุดเดียวกัน: หัวกลมโต ตาโต สัดส่วนแบบการ์ตูนเด็ก
 * ต่างกันที่ทรงผม สีเสื้อ และของประจำตัวที่บอกอาชีพ
 *
 * ระบบพิกัด: กรอบ 100 × 100 เหมือนมอนสเตอร์ จึงสลับกันแสดงได้
 */

export const HERO_VIEWBOX = '0 0 100 100'

/** สีผิวกลาง ใช้ทุกตัวเพื่อไม่ให้สื่อว่ามีสีผิวไหนเป็นค่ามาตรฐาน */
const SKIN = '#e8b48c'
const SKIN_SHADE = '#d19a72'

/** หน้าตาแบบเดียวกันทุกตัว มีตากะพริบ */
function face(): string {
  return `
    <circle cx="50" cy="40" r="20" fill="${SKIN}"/>
    <path d="M30 44 Q50 54 70 44 L70 40 Q50 48 30 40 Z" fill="${SKIN_SHADE}" opacity=".35"/>
    <g>
      <ellipse cx="43" cy="39" rx="3.4" ry="4.2" fill="#2a1a3e"/>
      <ellipse cx="57" cy="39" rx="3.4" ry="4.2" fill="#2a1a3e"/>
      <animate attributeName="opacity" values="1;1;1;1;1;0;1"
        dur="5s" repeatCount="indefinite"/>
    </g>
    <circle cx="44.2" cy="37.6" r="1.2" fill="#fff"/>
    <circle cx="58.2" cy="37.6" r="1.2" fill="#fff"/>
    <path d="M44 48 Q50 53 56 48" stroke="#2a1a3e" stroke-width="2"
      fill="none" stroke-linecap="round"/>
    <circle cx="35" cy="46" r="3" fill="#f87171" opacity=".35"/>
    <circle cx="65" cy="46" r="3" fill="#f87171" opacity=".35"/>`
}

/** ลำตัวพร้อมแขน สีเปลี่ยนตามอาชีพ */
function body(main: string, dark: string): string {
  return `
    <path d="M28 96 Q28 66 50 62 Q72 66 72 96 Z" fill="${main}"/>
    <path d="M28 78 L18 90" stroke="${main}" stroke-width="9" stroke-linecap="round"/>
    <path d="M72 78 L82 90" stroke="${main}" stroke-width="9" stroke-linecap="round"/>
    <circle cx="18" cy="90" r="5" fill="${SKIN}"/>
    <circle cx="82" cy="90" r="5" fill="${SKIN}"/>
    <path d="M42 62 Q50 70 58 62 L58 66 Q50 74 42 66 Z" fill="${dark}"/>`
}

/** นักรบ — หมวกเหล็กและโล่ */
function warrior(): string {
  return `
    <ellipse cx="50" cy="97" rx="26" ry="4" fill="#000" opacity=".22"/>
    ${body('#dc2626', '#991b1b')}
    ${face()}
    <path d="M28 34 Q28 16 50 16 Q72 16 72 34 L72 30 Q50 22 28 30 Z" fill="#94a3b8"/>
    <rect x="46" y="16" width="8" height="18" rx="2" fill="#cbd5e1"/>
    <path d="M28 30 Q50 22 72 30 L72 36 Q50 28 28 36 Z" fill="#64748b"/>
    <g transform="translate(4 62)">
      <path d="M0 0 Q-6 16 6 26 Q18 16 12 0 Q6 -3 0 0 Z" fill="#facc15"/>
      <path d="M3 4 Q0 14 6 20 Q12 14 9 4 Z" fill="#fde68a"/>
    </g>`
}

/** นักเวท — หมวกแหลมและไม้เท้าเรืองแสง */
function mage(): string {
  return `
    <ellipse cx="50" cy="97" rx="26" ry="4" fill="#000" opacity=".22"/>
    ${body('#7c3aed', '#4c1d95')}
    ${face()}
    <path d="M24 30 L50 -2 L76 30 Z" fill="#6d28d9"/>
    <path d="M22 30 Q50 22 78 30 L78 36 Q50 28 22 36 Z" fill="#4c1d95"/>
    <circle cx="50" cy="8" r="4" fill="#fcd34d">
      <animate attributeName="opacity" values="1;.4;1" dur="2s" repeatCount="indefinite"/>
    </circle>
    <path d="M84 92 L84 54" stroke="#78350f" stroke-width="4" stroke-linecap="round"/>
    <circle cx="84" cy="50" r="7" fill="#38bdf8" opacity=".9">
      <animate attributeName="r" values="7;8.5;7" dur="2.2s" repeatCount="indefinite"/>
    </circle>
    <circle cx="84" cy="50" r="3" fill="#e0f2fe"/>`
}

/** นักสำรวจ — หมวกปีกกว้างและเข็มทิศ */
function explorer(): string {
  return `
    <ellipse cx="50" cy="97" rx="26" ry="4" fill="#000" opacity=".22"/>
    ${body('#16a34a', '#14532d')}
    ${face()}
    <path d="M32 24 Q32 10 50 10 Q68 10 68 24 Z" fill="#a16207"/>
    <ellipse cx="50" cy="26" rx="30" ry="6" fill="#ca8a04"/>
    <rect x="32" y="21" width="36" height="5" fill="#78350f"/>
    <g transform="translate(72 70)">
      <circle r="9" fill="#fbbf24"/>
      <circle r="6.5" fill="#fef3c7"/>
      <path d="M0 -5 L2.5 0 L0 5 L-2.5 0 Z" fill="#dc2626"/>
    </g>`
}

/** นักประดิษฐ์ — แว่นตาช่างและประแจ */
function inventor(): string {
  return `
    <ellipse cx="50" cy="97" rx="26" ry="4" fill="#000" opacity=".22"/>
    ${body('#ea580c', '#7c2d12')}
    ${face()}
    <path d="M28 26 Q28 12 50 12 Q72 12 72 26 L72 24 Q50 18 28 24 Z" fill="#78350f"/>
    <g transform="translate(0 -14)">
      <rect x="30" y="20" width="40" height="4" rx="2" fill="#57534e"/>
      <circle cx="40" cy="22" r="7" fill="#0ea5e9" opacity=".55" stroke="#57534e" stroke-width="2.5"/>
      <circle cx="60" cy="22" r="7" fill="#0ea5e9" opacity=".55" stroke="#57534e" stroke-width="2.5"/>
    </g>
    <g transform="rotate(28 80 74)">
      <rect x="77" y="60" width="6" height="26" rx="2" fill="#94a3b8"/>
      <path d="M74 60 L74 54 L79 57 L84 54 L84 60 Z" fill="#cbd5e1"/>
    </g>`
}

/** นักวิทยาศาสตร์ — เสื้อกาวน์และหลอดทดลอง */
function scientist(): string {
  return `
    <ellipse cx="50" cy="97" rx="26" ry="4" fill="#000" opacity=".22"/>
    ${body('#e2e8f0', '#94a3b8')}
    <path d="M50 62 L50 96" stroke="#94a3b8" stroke-width="1.6"/>
    ${face()}
    <path d="M28 32 Q26 14 50 14 Q74 14 72 32 Q64 22 50 24 Q36 22 28 32 Z" fill="#0ea5e9"/>
    <g transform="translate(76 66)">
      <path d="M0 0 L0 14 Q0 22 6 22 Q12 22 12 14 L12 0 Z" fill="#a5f3fc" opacity=".7"
        stroke="#0891b2" stroke-width="2"/>
      <path d="M0 12 L12 12 L12 14 Q12 22 6 22 Q0 22 0 14 Z" fill="#22d3ee"/>
      <circle cx="6" cy="8" r="1.6" fill="#22d3ee">
        <animate attributeName="cy" values="16;4;16" dur="2.4s" repeatCount="indefinite"/>
      </circle>
    </g>`
}

/** นักผจญภัย — เป้สะพายหลังและผ้าพันคอ */
function adventurer(): string {
  return `
    <ellipse cx="50" cy="97" rx="26" ry="4" fill="#000" opacity=".22"/>
    <rect x="14" y="66" width="18" height="24" rx="5" fill="#a16207"/>
    <rect x="16" y="72" width="14" height="7" rx="2" fill="#78350f"/>
    ${body('#e11d48', '#881337')}
    ${face()}
    <path d="M30 58 Q50 66 70 58 L72 64 Q50 74 28 64 Z" fill="#fbbf24"/>
    <path d="M30 22 Q34 12 50 12 Q66 12 70 22 Q60 16 50 18 Q40 16 30 22 Z" fill="#78350f"/>
    <path d="M28 24 Q30 34 26 40 Q34 36 32 26 Z" fill="#78350f"/>`
}

const HERO_ART: Record<string, () => string> = {
  warrior,
  mage,
  explorer,
  inventor,
  scientist,
  adventurer,
}

/** ภาพของอวตารหนึ่งตัว คืนภาพสำรองถ้ายังไม่มีของตัวนั้น */
export function heroArt(avatarId: string): string {
  const draw = HERO_ART[avatarId]
  if (draw) return draw()

  return `
    <ellipse cx="50" cy="97" rx="26" ry="4" fill="#000" opacity=".22"/>
    ${body('#64748b', '#334155')}
    ${face()}`
}

export function hasHeroArt(avatarId: string): boolean {
  return avatarId in HERO_ART
}

export const HERO_ART_IDS = Object.keys(HERO_ART)
