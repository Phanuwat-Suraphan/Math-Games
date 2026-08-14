/**
 * ฉากประจำโลก วาดด้วย SVG
 *
 * ใช้เป็นภาพหัวการ์ดโลกบนแผนที่ และเป็นพื้นหลังของหน้าด่าน
 * แต่ละโลกมีสีและรูปทรงต่างกันชัดเจน เด็กจึงจำได้ว่าอยู่โลกไหน
 * โดยไม่ต้องอ่านชื่อ
 *
 * ระบบพิกัด: กรอบ 320 × 160 (แนวนอน เหมาะกับหัวการ์ด)
 */

export const SCENE_VIEWBOX = '0 0 320 160'

/** ท้องฟ้าไล่สี ใช้ร่วมกันทุกฉาก เปลี่ยนแค่คู่สี */
function sky(id: string, top: string, bottom: string): string {
  return `
    <defs>
      <linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${top}"/>
        <stop offset="100%" stop-color="${bottom}"/>
      </linearGradient>
    </defs>
    <rect width="320" height="160" fill="url(#${id})"/>`
}

/** โลก 1 — ป่าจำนวนมหัศจรรย์ */
function forest(): string {
  return `
    ${sky('sky-forest', '#0f2b1d', '#1c4532')}
    <circle cx="264" cy="34" r="18" fill="#fde68a" opacity=".9"/>
    <path d="M0 108 Q80 84 160 104 Q240 122 320 100 L320 160 L0 160 Z" fill="#14532d"/>
    <g fill="#166534">
      <polygon points="42,110 60,68 78,110"/>
      <polygon points="42,96 60,58 78,96"/>
      <polygon points="96,116 112,80 128,116"/>
      <polygon points="212,112 232,66 252,112"/>
      <polygon points="212,98 232,56 252,98"/>
      <polygon points="272,118 286,88 300,118"/>
    </g>
    <g fill="#3f2d1d">
      <rect x="56" y="106" width="8" height="18"/>
      <rect x="228" y="108" width="8" height="18"/>
    </g>
    <path d="M0 140 Q80 126 160 138 Q240 150 320 136 L320 160 L0 160 Z" fill="#22c55e" opacity=".55"/>
    <g fill="#86efac" opacity=".9">
      <circle cx="150" cy="92" r="2.5"/>
      <circle cx="186" cy="76" r="2"/>
      <circle cx="122" cy="66" r="1.8"/>
    </g>
    <g fill="#fef3c7" font-family="system-ui, sans-serif" font-weight="800" opacity=".55">
      <text x="146" y="60" font-size="15">7</text>
      <text x="196" y="46" font-size="12">3</text>
    </g>`
}

/** โลก 2 — ปราสาทเศษส่วน */
function castle(): string {
  return `
    ${sky('sky-castle', '#1e1b4b', '#3730a3')}
    <circle cx="56" cy="36" r="14" fill="#e0e7ff" opacity=".85"/>
    <g fill="#312e81">
      <rect x="96" y="62" width="128" height="70"/>
      <rect x="82" y="46" width="26" height="86"/>
      <rect x="212" y="46" width="26" height="86"/>
      <rect x="146" y="30" width="28" height="102"/>
    </g>
    <g fill="#4f46e5">
      <polygon points="82,46 95,26 108,46"/>
      <polygon points="212,46 225,26 238,46"/>
      <polygon points="146,30 160,6 174,30"/>
    </g>
    <g fill="#a5b4fc" opacity=".85">
      <rect x="118" y="80" width="12" height="18" rx="6"/>
      <rect x="190" y="80" width="12" height="18" rx="6"/>
      <rect x="154" y="56" width="12" height="18" rx="6"/>
    </g>
    <rect x="146" y="100" width="28" height="32" rx="14" fill="#1e1b4b"/>
    <rect x="0" y="132" width="320" height="28" fill="#1e1b4b"/>
    <g fill="#c7d2fe" font-family="system-ui, sans-serif" font-weight="800" opacity=".6">
      <text x="44" y="98" font-size="16">1/2</text>
      <text x="256" y="86" font-size="14">3/4</text>
    </g>`
}

/** โลก 3 — ทะเลทรายทศนิยม */
function desert(): string {
  return `
    ${sky('sky-desert', '#7c2d12', '#f59e0b')}
    <circle cx="240" cy="46" r="22" fill="#fef3c7" opacity=".95"/>
    <path d="M0 116 Q60 92 120 114 Q180 134 240 112 Q286 96 320 110 L320 160 L0 160 Z" fill="#d97706"/>
    <path d="M0 136 Q80 120 160 134 Q240 148 320 132 L320 160 L0 160 Z" fill="#fbbf24"/>
    <g fill="#166534">
      <rect x="60" y="96" width="8" height="28" rx="4"/>
      <rect x="48" y="102" width="8" height="16" rx="4"/>
      <rect x="72" y="98" width="8" height="20" rx="4"/>
    </g>
    <g fill="#92400e" opacity=".7">
      <polygon points="150,112 168,86 186,112"/>
      <polygon points="188,116 202,96 216,116"/>
    </g>
    <g fill="#78350f" font-family="system-ui, sans-serif" font-weight="800" opacity=".65">
      <text x="112" y="146" font-size="15">0.5</text>
      <text x="238" y="140" font-size="13">1.2</text>
    </g>`
}

/** โลก 4 — เมืองร้อยละ */
function city(): string {
  return `
    ${sky('sky-city', '#0c4a6e', '#0891b2')}
    <circle cx="52" cy="34" r="13" fill="#e0f2fe" opacity=".8"/>
    <g fill="#075985">
      <rect x="24" y="76" width="38" height="56"/>
      <rect x="72" y="56" width="44" height="76"/>
      <rect x="126" y="88" width="34" height="44"/>
      <rect x="170" y="46" width="48" height="86"/>
      <rect x="228" y="70" width="40" height="62"/>
      <rect x="276" y="94" width="30" height="38"/>
    </g>
    <g fill="#7dd3fc" opacity=".85">
      <rect x="32" y="84" width="7" height="9"/><rect x="46" y="84" width="7" height="9"/>
      <rect x="32" y="100" width="7" height="9"/><rect x="46" y="100" width="7" height="9"/>
      <rect x="82" y="66" width="8" height="10"/><rect x="98" y="66" width="8" height="10"/>
      <rect x="82" y="84" width="8" height="10"/><rect x="98" y="84" width="8" height="10"/>
      <rect x="180" y="56" width="9" height="11"/><rect x="199" y="56" width="9" height="11"/>
      <rect x="180" y="76" width="9" height="11"/><rect x="199" y="76" width="9" height="11"/>
      <rect x="238" y="80" width="8" height="10"/><rect x="252" y="80" width="8" height="10"/>
    </g>
    <rect x="0" y="132" width="320" height="28" fill="#082f49"/>
    <g transform="rotate(-8 150 40)">
      <rect x="128" y="24" width="46" height="26" rx="4" fill="#dc2626"/>
      <text x="134" y="43" fill="#fff" font-family="system-ui, sans-serif"
        font-size="15" font-weight="800">50%</text>
    </g>`
}

/** โลก 5 — ภูเขาเรขาคณิต */
function mountain(): string {
  return `
    ${sky('sky-mountain', '#1e293b', '#64748b')}
    <circle cx="264" cy="32" r="15" fill="#f1f5f9" opacity=".85"/>
    <polygon points="0,132 70,44 140,132" fill="#475569"/>
    <polygon points="70,44 96,76 44,76" fill="#f1f5f9"/>
    <polygon points="110,132 190,30 270,132" fill="#334155"/>
    <polygon points="190,30 220,68 160,68" fill="#f8fafc"/>
    <polygon points="238,132 288,72 320,132" fill="#475569"/>
    <rect x="0" y="128" width="320" height="32" fill="#1e293b"/>
    <g fill="none" stroke="#38bdf8" stroke-width="2.5" opacity=".85">
      <rect x="36" y="94" width="26" height="20"/>
      <polygon points="248,112 262,90 276,112"/>
      <circle cx="152" cy="100" r="11"/>
    </g>
    <g fill="#bae6fd" font-family="system-ui, sans-serif" font-weight="800" opacity=".6">
      <text x="34" y="88" font-size="11">พื้นที่</text>
    </g>`
}

/** โลก 6 — ถ้ำมังกรคณิต */
function dragonCave(): string {
  return `
    ${sky('sky-cave', '#1a0b2e', '#4c1d95')}
    <path d="M0 0 L0 160 L320 160 L320 0 Q280 44 240 20 Q200 48 160 18 Q120 46 80 20 Q40 46 0 0 Z"
      fill="#1a0b2e"/>
    <path d="M0 160 L0 120 Q60 96 120 118 Q180 138 240 114 Q290 96 320 116 L320 160 Z" fill="#2e1065"/>
    <g fill="#4c1d95">
      <polygon points="30,0 40,38 20,38"/>
      <polygon points="96,0 106,30 86,30"/>
      <polygon points="200,0 212,42 188,42"/>
      <polygon points="272,0 282,32 262,32"/>
    </g>
    <g fill="#7c3aed" opacity=".8">
      <polygon points="60,160 70,124 50,124"/>
      <polygon points="164,160 176,120 152,120"/>
      <polygon points="256,160 266,128 246,128"/>
    </g>
    <ellipse cx="160" cy="80" rx="30" ry="22" fill="#7c3aed" opacity=".28">
      <animate attributeName="opacity" values=".28;.5;.28" dur="3s" repeatCount="indefinite"/>
    </ellipse>
    <g fill="#fbbf24">
      <circle cx="146" cy="76" r="6"/>
      <circle cx="174" cy="76" r="6"/>
    </g>
    <g fill="#1a0b2e">
      <ellipse cx="146" cy="76" rx="2" ry="5"/>
      <ellipse cx="174" cy="76" rx="2" ry="5"/>
    </g>
    <g fill="#fcd34d" opacity=".9">
      <circle cx="70" cy="140" r="4"/>
      <circle cx="84" cy="144" r="3"/>
      <circle cx="244" cy="142" r="3.5"/>
    </g>`
}

const SCENE_ART: Record<string, () => string> = {
  'world-1': forest,
  'world-2': castle,
  'world-3': desert,
  'world-4': city,
  'world-5': mountain,
  'world-6': dragonCave,
}

/** ภาพฉากของโลกหนึ่ง คืนภาพสำรองถ้ายังไม่มีฉากของโลกนั้น */
export function worldScene(worldId: string): string {
  const draw = SCENE_ART[worldId]
  if (draw) return draw()

  return `
    ${sky('sky-default', '#1e1b4b', '#312e81')}
    <path d="M0 120 Q80 100 160 116 Q240 132 320 112 L320 160 L0 160 Z" fill="#312e81"/>`
}

export function hasWorldScene(worldId: string): boolean {
  return worldId in SCENE_ART
}

/**
 * ฉากแบบล็อก — ฉากเดิมแต่หม่นลง ใช้กับโลกที่ยังเล่นไม่ได้
 * ยังเห็นเค้าโครงว่าโลกหน้าตาเป็นอย่างไร จึงอยากไปให้ถึง
 */
export function lockedSceneFilter(): string {
  return 'grayscale(0.85) brightness(0.45)'
}
