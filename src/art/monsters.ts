/**
 * ภาพมอนสเตอร์ วาดด้วย SVG
 *
 * ทำไมใช้ SVG ไม่ใช้ไฟล์รูป
 *   - ไฟล์เล็กมาก (2–5 KB) เทียบกับ PNG ที่ใบละหลายร้อย KB
 *     เด็กที่เปิดผ่านเน็ตมือถือในห้องเรียนจึงโหลดทันที
 *   - คมทุกขนาด ขึ้นโปรเจกเตอร์หน้าห้องก็ไม่แตก
 *   - ขยับได้ด้วย CSS โดยไม่ต้องทำไฟล์เพิ่ม
 *
 * ทุกฟังก์ชันคืน "เนื้อใน" ของ svg ไม่ใช่แท็ก svg เต็ม
 * ผู้เรียกเป็นคนกำหนดขนาดและ viewBox เอง จึงเอาไปใช้ซ้ำได้ทุกที่
 *
 * ระบบพิกัด: ทุกตัววาดในกรอบ 100 × 100
 */

export const MONSTER_VIEWBOX = '0 0 100 100'

/** ดวงตาแบบเดียวกันทุกตัว เพื่อให้มอนสเตอร์ดูเป็นชุดเดียวกัน */
function eyes(cx1: number, cx2: number, cy: number, r = 6, pupil = 3): string {
  return `
    <circle cx="${cx1}" cy="${cy}" r="${r}" fill="#fff"/>
    <circle cx="${cx2}" cy="${cy}" r="${r}" fill="#fff"/>
    <circle cx="${cx1}" cy="${cy + 1}" r="${pupil}" fill="#1a1030">
      <animate attributeName="cy" values="${cy + 1};${cy + 1};${cy - 1};${cy + 1}"
        dur="4s" repeatCount="indefinite"/>
    </circle>
    <circle cx="${cx2}" cy="${cy + 1}" r="${pupil}" fill="#1a1030">
      <animate attributeName="cy" values="${cy + 1};${cy + 1};${cy - 1};${cy + 1}"
        dur="4s" repeatCount="indefinite"/>
    </circle>`
}

/** ก็อบลินเครื่องคิดเลข — ตัวเล็ก ถือเครื่องคิดเลขที่กดผิดปุ่ม */
function goblinCalculator(): string {
  return `
    <ellipse cx="50" cy="92" rx="26" ry="5" fill="#000" opacity=".22"/>
    <path d="M24 44 L14 26 L30 34 Z" fill="#4d7c2a"/>
    <path d="M76 44 L86 26 L70 34 Z" fill="#4d7c2a"/>
    <ellipse cx="50" cy="56" rx="27" ry="30" fill="#65a30d"/>
    <ellipse cx="50" cy="50" rx="22" ry="21" fill="#84cc16"/>
    ${eyes(41, 59, 47)}
    <path d="M42 62 Q50 70 58 62" stroke="#1a1030" stroke-width="3"
      fill="none" stroke-linecap="round"/>
    <path d="M45 62 L47 67 M55 62 L53 67" stroke="#fff" stroke-width="2.5" stroke-linecap="round"/>
    <rect x="34" y="72" width="32" height="20" rx="3" fill="#334155"/>
    <rect x="37" y="75" width="26" height="6" rx="1" fill="#a3e635"/>
    <g fill="#94a3b8">
      <rect x="38" y="83" width="5" height="4" rx="1"/>
      <rect x="46" y="83" width="5" height="4" rx="1"/>
      <rect x="54" y="83" width="5" height="4" rx="1"/>
    </g>`
}

/** สไลม์ตัวเลข — ก้อนวุ้นที่กลืนตัวเลขเข้าไป */
function numberSlime(): string {
  return `
    <ellipse cx="50" cy="90" rx="30" ry="6" fill="#000" opacity=".22"/>
    <path d="M20 84 Q16 46 50 42 Q84 46 80 84 Z" fill="#22c55e" opacity=".92">
      <animate attributeName="d"
        values="M20 84 Q16 46 50 42 Q84 46 80 84 Z;
                M18 84 Q18 50 50 46 Q82 50 82 84 Z;
                M20 84 Q16 46 50 42 Q84 46 80 84 Z"
        dur="3s" repeatCount="indefinite"/>
    </path>
    <ellipse cx="38" cy="58" rx="8" ry="10" fill="#fff" opacity=".35"/>
    ${eyes(40, 60, 64)}
    <path d="M43 76 Q50 82 57 76" stroke="#14532d" stroke-width="3"
      fill="none" stroke-linecap="round"/>
    <g fill="#bbf7d0" font-family="system-ui, sans-serif" font-weight="700" opacity=".85">
      <text x="30" y="52" font-size="11">7</text>
      <text x="63" y="56" font-size="9">3</text>
      <text x="50" y="88" font-size="8">5</text>
    </g>`
}

/** ค้างคาวเศษส่วน — ปีกแบ่งเป็นส่วน ๆ ไม่เท่ากัน */
function fractionBat(): string {
  return `
    <ellipse cx="50" cy="92" rx="20" ry="4" fill="#000" opacity=".22"/>
    <g>
      <animateTransform attributeName="transform" type="rotate"
        values="-4 50 50; 4 50 50; -4 50 50" dur="2.4s" repeatCount="indefinite"/>
      <path d="M38 52 Q14 36 6 52 Q18 54 12 66 Q26 62 38 66 Z" fill="#7c3aed"/>
      <path d="M62 52 Q86 36 94 52 Q82 54 88 66 Q74 62 62 66 Z" fill="#7c3aed"/>
      <path d="M30 50 L30 64 M22 52 L22 64" stroke="#4c1d95" stroke-width="1.6"/>
      <path d="M70 50 L70 64 M78 52 L78 64" stroke="#4c1d95" stroke-width="1.6"/>
    </g>
    <ellipse cx="50" cy="58" rx="16" ry="18" fill="#8b5cf6"/>
    <path d="M38 44 L34 30 L46 40 Z" fill="#8b5cf6"/>
    <path d="M62 44 L66 30 L54 40 Z" fill="#8b5cf6"/>
    ${eyes(44, 56, 54, 5, 2.5)}
    <path d="M45 66 L48 71 L51 66 L54 71 L57 66" stroke="#fff"
      stroke-width="2" fill="none" stroke-linecap="round"/>
    <g fill="#ede9fe" font-family="system-ui, sans-serif" font-weight="700">
      <text x="42" y="86" font-size="12">1/2</text>
    </g>`
}

/** แมงป่องทศนิยม — หางเป็นจุดทศนิยม */
function decimalScorpion(): string {
  return `
    <ellipse cx="50" cy="90" rx="28" ry="5" fill="#000" opacity=".22"/>
    <path d="M70 66 Q88 62 86 44 Q84 30 72 30" stroke="#b45309"
      stroke-width="7" fill="none" stroke-linecap="round"/>
    <circle cx="71" cy="28" r="7" fill="#f59e0b">
      <animate attributeName="r" values="7;8.5;7" dur="1.6s" repeatCount="indefinite"/>
    </circle>
    <circle cx="71" cy="28" r="3" fill="#fff"/>
    <ellipse cx="46" cy="66" rx="24" ry="15" fill="#d97706"/>
    <ellipse cx="46" cy="62" rx="19" ry="10" fill="#f59e0b"/>
    <g stroke="#92400e" stroke-width="4" stroke-linecap="round">
      <path d="M30 72 L18 82 M40 76 L34 88 M56 76 L60 88"/>
    </g>
    <path d="M24 60 Q12 54 14 46 Q22 48 26 56 Z" fill="#d97706"/>
    <path d="M24 68 Q10 70 10 78 Q20 76 26 70 Z" fill="#d97706"/>
    ${eyes(40, 52, 58, 4.5, 2.2)}
    <g fill="#fef3c7" font-family="system-ui, sans-serif" font-weight="700">
      <text x="36" y="76" font-size="9">0.5</text>
    </g>`
}

/** โจรร้อยละ — ผ้าปิดหน้า ถือป้ายลดราคาปลอม */
function percentageBandit(): string {
  return `
    <ellipse cx="50" cy="92" rx="24" ry="5" fill="#000" opacity=".22"/>
    <path d="M32 90 Q30 58 50 56 Q70 58 68 90 Z" fill="#1e293b"/>
    <path d="M36 70 L26 80 M64 70 L74 80" stroke="#1e293b"
      stroke-width="7" stroke-linecap="round"/>
    <circle cx="50" cy="42" r="19" fill="#0f172a"/>
    <circle cx="50" cy="44" r="15" fill="#f5d0a9"/>
    <rect x="34" y="36" width="32" height="9" rx="2" fill="#0f172a"/>
    <circle cx="43" cy="40.5" r="2.6" fill="#fbbf24"/>
    <circle cx="57" cy="40.5" r="2.6" fill="#fbbf24"/>
    <path d="M42 54 Q50 58 58 54" stroke="#0f172a" stroke-width="2.5"
      fill="none" stroke-linecap="round"/>
    <g transform="rotate(-12 76 62)">
      <rect x="66" y="52" width="24" height="18" rx="3" fill="#dc2626"/>
      <text x="70" y="65" fill="#fff" font-family="system-ui, sans-serif"
        font-size="11" font-weight="800">-20%</text>
    </g>`
}

/** โกเลมเรขาคณิต — ตัวประกอบจากรูปทรงเรขาคณิต */
function geometryGolem(): string {
  return `
    <ellipse cx="50" cy="93" rx="30" ry="5" fill="#000" opacity=".25"/>
    <rect x="26" y="46" width="48" height="40" rx="4" fill="#64748b"/>
    <rect x="32" y="52" width="36" height="28" rx="3" fill="#94a3b8"/>
    <polygon points="50,54 62,74 38,74" fill="#38bdf8" opacity=".9"/>
    <rect x="10" y="50" width="14" height="30" rx="3" fill="#64748b"/>
    <rect x="76" y="50" width="14" height="30" rx="3" fill="#64748b"/>
    <rect x="34" y="86" width="12" height="8" rx="2" fill="#475569"/>
    <rect x="54" y="86" width="12" height="8" rx="2" fill="#475569"/>
    <polygon points="50,10 74,42 26,42" fill="#94a3b8"/>
    <polygon points="50,18 66,40 34,40" fill="#cbd5e1"/>
    ${eyes(42, 58, 33, 5, 2.5)}
    <circle cx="50" cy="66" r="5" fill="#0ea5e9">
      <animate attributeName="opacity" values="1;.45;1" dur="2.2s" repeatCount="indefinite"/>
    </circle>`
}

/** ผู้พิทักษ์คณิต — มินิบอส ถือโล่และคทา */
function mathGuardian(): string {
  return `
    <ellipse cx="50" cy="93" rx="30" ry="5" fill="#000" opacity=".28"/>
    <path d="M64 24 L64 78" stroke="#a16207" stroke-width="5" stroke-linecap="round"/>
    <circle cx="64" cy="20" r="9" fill="#fbbf24">
      <animate attributeName="opacity" values="1;.6;1" dur="2s" repeatCount="indefinite"/>
    </circle>
    <text x="59" y="25" fill="#78350f" font-family="system-ui, sans-serif"
      font-size="12" font-weight="800">=</text>
    <path d="M30 46 Q30 34 50 32 Q70 34 70 46 L70 76 Q50 88 30 76 Z" fill="#1e40af"/>
    <path d="M36 48 Q36 40 50 38 Q64 40 64 48 L64 72 Q50 80 36 72 Z" fill="#3b82f6"/>
    <circle cx="50" cy="26" r="15" fill="#93c5fd"/>
    <path d="M35 24 Q50 8 65 24 Z" fill="#1e40af"/>
    ${eyes(44, 56, 26, 4.5, 2.2)}
    <path d="M14 44 Q10 62 22 74 Q34 62 30 44 Q22 40 14 44 Z" fill="#facc15"/>
    <path d="M18 48 Q16 60 22 68 Q28 60 26 48 Z" fill="#fde68a"/>
    <text x="18" y="62" fill="#78350f" font-family="system-ui, sans-serif"
      font-size="10" font-weight="800">÷</text>`
}

/** มังกรแห่งตัวเลข — บอสใหญ่ */
function dragonOfNumbers(): string {
  return `
    <ellipse cx="50" cy="93" rx="34" ry="5" fill="#000" opacity=".3"/>
    <g opacity=".95">
      <animateTransform attributeName="transform" type="translate"
        values="0 0; 0 -2; 0 0" dur="3s" repeatCount="indefinite"/>
      <path d="M30 50 Q6 26 2 52 Q16 56 8 74 Q26 68 34 66 Z" fill="#7f1d1d"/>
      <path d="M70 50 Q94 26 98 52 Q84 56 92 74 Q74 68 66 66 Z" fill="#7f1d1d"/>
      <path d="M20 44 L20 62 M12 48 L12 66" stroke="#450a0a" stroke-width="1.8"/>
      <path d="M80 44 L80 62 M88 48 L88 66" stroke="#450a0a" stroke-width="1.8"/>
    </g>
    <path d="M34 60 Q30 84 46 90 Q56 92 62 84" stroke="#b91c1c"
      stroke-width="11" fill="none" stroke-linecap="round"/>
    <ellipse cx="50" cy="56" rx="23" ry="21" fill="#dc2626"/>
    <ellipse cx="50" cy="60" rx="16" ry="13" fill="#f87171"/>
    <path d="M34 40 L28 22 L44 34 Z" fill="#991b1b"/>
    <path d="M66 40 L72 22 L56 34 Z" fill="#991b1b"/>
    <path d="M50 34 L46 20 L54 20 Z" fill="#fbbf24"/>
    ${eyes(41, 59, 50, 6, 2.8)}
    <path d="M40 66 Q50 74 60 66" stroke="#450a0a" stroke-width="3"
      fill="none" stroke-linecap="round"/>
    <path d="M43 66 L45 72 M57 66 L55 72" stroke="#fff" stroke-width="2.5" stroke-linecap="round"/>
    <g fill="#fecaca" font-family="system-ui, sans-serif" font-weight="800" opacity=".9">
      <text x="20" y="34" font-size="10">8</text>
      <text x="74" y="38" font-size="9">4</text>
      <text x="26" y="80" font-size="8">2</text>
    </g>`
}

const MONSTER_ART: Record<string, () => string> = {
  'goblin-calculator': goblinCalculator,
  'number-slime': numberSlime,
  'fraction-bat': fractionBat,
  'decimal-scorpion': decimalScorpion,
  'percentage-bandit': percentageBandit,
  'geometry-golem': geometryGolem,
  'math-guardian': mathGuardian,
  'dragon-of-numbers': dragonOfNumbers,
}

/**
 * ภาพของมอนสเตอร์ตัวหนึ่ง
 * ถ้าไม่มีภาพของตัวนั้นจะคืนภาพสำรองที่ยังดูดี ไม่ใช่กรอบว่าง
 */
export function monsterArt(monsterId: string): string {
  const draw = MONSTER_ART[monsterId]
  if (draw) return draw()

  return `
    <ellipse cx="50" cy="90" rx="26" ry="5" fill="#000" opacity=".22"/>
    <circle cx="50" cy="56" r="26" fill="#64748b"/>
    ${eyes(41, 59, 50)}
    <path d="M42 66 Q50 72 58 66" stroke="#1a1030" stroke-width="3"
      fill="none" stroke-linecap="round"/>`
}

export function hasMonsterArt(monsterId: string): boolean {
  return monsterId in MONSTER_ART
}

export const MONSTER_ART_IDS = Object.keys(MONSTER_ART)
