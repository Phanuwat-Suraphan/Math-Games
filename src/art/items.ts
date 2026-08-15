/**
 * ภาพของที่ซื้อได้ในร้าน วาดด้วย SVG
 *
 * ระบบพิกัด: กรอบ 64 × 64 เล็กกว่าตัวละครเพราะแสดงในการ์ดร้านค้า
 *
 * ของทุกชิ้นมี prefix ประจำตัวเหมือนภาพอื่น ๆ
 * เพราะการ์ดร้านค้าทุกใบอยู่บนหน้าเดียวกัน ถ้า id ไล่สีชนกันจะสีเพี้ยนทั้งร้าน
 */

import { blurFilter, glowFilter, specular, sphereGradient, verticalGradient } from './shading'
import { bob, flicker } from './motion'

export const ITEM_VIEWBOX = '0 0 64 64'

/** เงาใต้ของ ใช้ร่วมกันได้เพราะนิยามเหมือนกันทุกชิ้น */
const SHADOW = `
  <ellipse cx="32" cy="58" rx="16" ry="3.4" fill="#000" opacity=".35"
    filter="url(#itemBlur)"/>`

const SHARED = blurFilter('itemBlur', 2)

/** ดินสอนักคำนวณ */
function pencil(): string {
  const p = 'it-pencil'
  return `
    <defs>${SHARED}${verticalGradient(`${p}-wood`, '#fbbf24', '#b45309')}</defs>
    ${SHADOW}
    ${bob(`
      <g transform="rotate(-34 32 32)">
        <rect x="28" y="10" width="8" height="34" fill="url(#${p}-wood)"/>
        <rect x="28" y="10" width="2.6" height="34" fill="#fef3c7" opacity=".55"/>
        <polygon points="32,52 27,44 37,44" fill="#f5d0a9"/>
        <polygon points="32,52 30,47 34,47" fill="#1f2937"/>
        <rect x="28" y="6" width="8" height="5" rx="1.6" fill="#f472b6"/>
        <rect x="28" y="11" width="8" height="2.4" fill="#94a3b8"/>
      </g>`, 3.2, 2)}`
}

/** ไม้บรรทัดเหล็ก */
function ruler(): string {
  const p = 'it-ruler'
  return `
    <defs>${SHARED}${verticalGradient(`${p}-steel`, '#e2e8f0', '#64748b')}</defs>
    ${SHADOW}
    ${bob(`
      <g transform="rotate(-30 32 32)">
        <rect x="24" y="8" width="16" height="44" rx="2" fill="url(#${p}-steel)"/>
        <rect x="24" y="8" width="4" height="44" fill="#f8fafc" opacity=".6"/>
        <g stroke="#334155" stroke-width="1.4" opacity=".7">
          <path d="M24 16 L33 16 M24 24 L36 24 M24 32 L33 32 M24 40 L36 40 M24 48 L33 48"/>
        </g>
        ${specular(28, 16, 2, 7, -8, 0.5)}
      </g>`, 3.6, 2)}`
}

/** วงเวียนต้องมนต์ */
function compass(): string {
  const p = 'it-compass'
  return `
    <defs>${SHARED}${glowFilter(`${p}-glow`, 2)}
      ${sphereGradient(`${p}-metal`, '#e0f2fe', '#7dd3fc', '#0369a1')}</defs>
    ${SHADOW}
    ${bob(`
      <circle cx="32" cy="34" r="20" fill="none" stroke="#38bdf8"
        stroke-width="1.6" opacity=".45" stroke-dasharray="4 5">
        <animateTransform attributeName="transform" type="rotate"
          from="0 32 34" to="360 32 34" dur="14s" repeatCount="indefinite"/>
      </circle>
      <path d="M32 12 L20 50" stroke="url(#${p}-metal)" stroke-width="5"
        stroke-linecap="round"/>
      <path d="M32 12 L44 50" stroke="url(#${p}-metal)" stroke-width="5"
        stroke-linecap="round"/>
      <circle cx="32" cy="11" r="5" fill="#7dd3fc" filter="url(#${p}-glow)"/>
      <polygon points="44,50 41,44 47,44" fill="#1f2937"/>
      ${specular(29, 22, 1.6, 6, -18, 0.5)}`, 3.4, 2.4)}`
}

/** ปากกาอนันต์ */
function infinityPen(): string {
  const p = 'it-inf'
  return `
    <defs>${SHARED}${glowFilter(`${p}-glow`, 2.6)}
      ${verticalGradient(`${p}-body`, '#fef08a', '#a16207')}</defs>
    ${SHADOW}
    ${bob(`
      <g transform="rotate(-32 32 32)">
        <rect x="28" y="12" width="8" height="32" rx="2" fill="url(#${p}-body)"/>
        <rect x="28" y="12" width="2.4" height="32" fill="#fffbeb" opacity=".6"/>
        <polygon points="32,52 27,44 37,44" fill="#fcd34d"/>
        <rect x="27" y="8" width="10" height="6" rx="2" fill="#78350f"/>
      </g>
      ${/*
        เครื่องหมายอนันต์ต้องเป็นเส้นโค้งสองห่วงที่อ่านออกจริง
        ของเดิมเขียนพาธสั้นเกินไปจนม้วนทับตัวเอง
        พอใส่ฟิลเตอร์เรืองแสงเข้าไปเลยกลายเป็นก้อนเบลอทับปลายปากกา
        คราวนี้วางไว้มุมบนขวาซึ่งเป็นที่ว่าง ไม่ทับตัวปากกาที่เอียงอยู่
      */ ''}
      ${flicker(`
        <path d="M42 16 C40 10 32 10 32 16 C32 22 40 22 42 16
                 C44 10 52 10 52 16 C52 22 44 22 42 16 Z"
          fill="none" stroke="#fde68a" stroke-width="2.2"
          stroke-linecap="round" filter="url(#${p}-glow)"/>`, 2.6, 0.4)}`, 3, 2.6)}`
}

/** สมุดกันกระแทก */
function notebook(): string {
  const p = 'it-note'
  return `
    <defs>${SHARED}${verticalGradient(`${p}-cover`, '#60a5fa', '#1e3a8a')}</defs>
    ${SHADOW}
    ${bob(`
      <rect x="14" y="12" width="34" height="40" rx="3" fill="#0f172a" opacity=".5"/>
      <rect x="12" y="10" width="34" height="40" rx="3" fill="url(#${p}-cover)"/>
      <rect x="12" y="10" width="6" height="40" rx="3" fill="#1e40af"/>
      <g fill="#e2e8f0" opacity=".85">
        <rect x="22" y="19" width="18" height="2.4" rx="1.2"/>
        <rect x="22" y="26" width="18" height="2.4" rx="1.2"/>
        <rect x="22" y="33" width="12" height="2.4" rx="1.2"/>
      </g>
      ${specular(20, 16, 3, 5, -25, 0.35)}`, 3.8, 1.6)}`
}

/** เกราะลูกคิด */
function abacus(): string {
  const p = 'it-abacus'
  return `
    <defs>${SHARED}${verticalGradient(`${p}-frame`, '#a16207', '#451a03')}</defs>
    ${SHADOW}
    ${bob(`
      <rect x="10" y="12" width="44" height="38" rx="4" fill="url(#${p}-frame)"/>
      <rect x="14" y="16" width="36" height="30" rx="2" fill="#1c1917" opacity=".6"/>
      <g stroke="#78350f" stroke-width="1.6">
        <path d="M14 23 L50 23 M14 31 L50 31 M14 39 L50 39"/>
      </g>
      <g fill="#f59e0b">
        <circle cx="20" cy="23" r="3.4"/><circle cx="29" cy="23" r="3.4"/>
        <circle cx="44" cy="23" r="3.4"/>
        <circle cx="20" cy="31" r="3.4"/><circle cx="38" cy="31" r="3.4"/>
        <circle cx="47" cy="31" r="3.4"/>
        <circle cx="24" cy="39" r="3.4"/><circle cx="33" cy="39" r="3.4"/>
      </g>
      <g fill="#fff" opacity=".45">
        <circle cx="18.8" cy="21.8" r="1"/><circle cx="27.8" cy="21.8" r="1"/>
        <circle cx="42.8" cy="21.8" r="1"/>
      </g>`, 4.2, 1.4)}`
}

/** เกราะคริสตัลความรู้ */
function crystalArmor(): string {
  const p = 'it-crystal'
  return `
    <defs>${SHARED}${glowFilter(`${p}-glow`, 2.4)}
      ${sphereGradient(`${p}-gem`, '#ddd6fe', '#8b5cf6', '#4c1d95')}</defs>
    ${SHADOW}
    ${bob(`
      <path d="M32 8 L52 16 L52 34 Q52 48 32 54 Q12 48 12 34 L12 16 Z"
        fill="url(#${p}-gem)" filter="url(#${p}-glow)"/>
      <path d="M32 8 L52 16 L52 34 Q52 48 32 54 Z" fill="#3b0764" opacity=".3"/>
      <path d="M32 16 L42 22 L32 44 L22 22 Z" fill="#f5f3ff" opacity=".55"/>
      ${specular(23, 20, 3.4, 6, -25, 0.45)}`, 3.4, 2.2)}`
}

/** จี้สามใบเถา */
function clover(): string {
  const p = 'it-clover'
  return `
    <defs>${SHARED}${sphereGradient(`${p}-leaf`, '#bbf7d0', '#22c55e', '#14532d')}</defs>
    ${SHADOW}
    ${bob(`
      <path d="M32 14 L32 6" stroke="#a16207" stroke-width="2.4" stroke-linecap="round"/>
      <circle cx="32" cy="6" r="3.4" fill="#facc15"/>
      <g fill="url(#${p}-leaf)">
        <ellipse cx="24" cy="28" rx="9" ry="11" transform="rotate(-32 24 28)"/>
        <ellipse cx="40" cy="28" rx="9" ry="11" transform="rotate(32 40 28)"/>
        <ellipse cx="32" cy="42" rx="9" ry="11"/>
      </g>
      ${specular(22, 24, 2.6, 4, -30, 0.4)}`, 3.6, 2)}`
}

/** นาฬิกาทรายนักคิด */
function hourglass(): string {
  const p = 'it-hour'
  return `
    <defs>${SHARED}${verticalGradient(`${p}-wood`, '#d97706', '#78350f')}</defs>
    ${SHADOW}
    ${bob(`
      <rect x="14" y="8" width="36" height="5" rx="2" fill="url(#${p}-wood)"/>
      <rect x="14" y="49" width="36" height="5" rx="2" fill="url(#${p}-wood)"/>
      <path d="M20 13 L44 13 L34 31 L44 49 L20 49 L30 31 Z"
        fill="#bae6fd" opacity=".35" stroke="#7dd3fc" stroke-width="1.6"/>
      <path d="M22 15 L42 15 L33 30 Z" fill="#fbbf24" opacity=".9">
        <animate attributeName="opacity" values=".9;.35;.9" dur="5s" repeatCount="indefinite"/>
      </path>
      <path d="M24 47 L40 47 L32 34 Z" fill="#fbbf24" opacity=".5">
        <animate attributeName="opacity" values=".5;.95;.5" dur="5s" repeatCount="indefinite"/>
      </path>
      <line x1="32" y1="31" x2="32" y2="45" stroke="#fcd34d" stroke-width="1.4">
        <animate attributeName="opacity" values="1;.2;1" dur="1.1s" repeatCount="indefinite"/>
      </line>`, 4, 1.6)}`
}

/** ดาวทองของครู */
function goldStar(): string {
  const p = 'it-star'
  return `
    <defs>${SHARED}${glowFilter(`${p}-glow`, 2.6)}
      ${sphereGradient(`${p}-gold`, '#fef9c3', '#facc15', '#a16207')}</defs>
    ${SHADOW}
    ${bob(`
      <path d="M32 8 L39 25 L57 27 L44 39 L48 57 L32 47 L16 57 L20 39 L7 27 L25 25 Z"
        fill="url(#${p}-gold)" filter="url(#${p}-glow)"/>
      <path d="M32 15 L37 27 L49 29 L40 37 L43 49 L32 43 Z" fill="#fffbeb" opacity=".5"/>
      ${flicker(`<circle cx="44" cy="20" r="2.4" fill="#fff"/>`, 3.2, 0, 1)}`, 3.2, 2.4)}`
}

/** สไลม์น้อย */
function petSlime(): string {
  const p = 'it-pslime'
  return `
    <defs>${SHARED}
      <radialGradient id="${p}-body" cx="35%" cy="25%" r="80%">
        <stop offset="0%" stop-color="#bbf7d0" stop-opacity=".97"/>
        <stop offset="45%" stop-color="#34d399" stop-opacity=".92"/>
        <stop offset="100%" stop-color="#047857" stop-opacity=".95"/>
      </radialGradient></defs>
    ${SHADOW}
    <path d="M12 52 Q10 26 32 24 Q54 26 52 52 Z" fill="url(#${p}-body)">
      <animate attributeName="d"
        values="M12 52 Q10 26 32 24 Q54 26 52 52 Z;
                M11 52 Q13 30 32 27 Q51 30 53 52 Z;
                M12 52 Q10 26 32 24 Q54 26 52 52 Z"
        dur="3.2s" repeatCount="indefinite"/>
    </path>
    ${specular(23, 34, 4, 6, -22, 0.45)}
    <g fill="#fdfdff">
      <circle cx="26" cy="38" r="4.4"/><circle cx="38" cy="38" r="4.4"/>
    </g>
    <g fill="#064e3b">
      <circle cx="26" cy="39" r="2.2"/><circle cx="38" cy="39" r="2.2"/>
    </g>
    <path d="M28 46 Q32 50 36 46" stroke="#065f46" stroke-width="2"
      fill="none" stroke-linecap="round"/>`
}

/** นกฮูกนักคิด */
function petOwl(): string {
  const p = 'it-powl'
  return `
    <defs>${SHARED}${sphereGradient(`${p}-body`, '#fde68a', '#b45309', '#451a03')}</defs>
    ${SHADOW}
    ${bob(`
      <path d="M18 22 L14 10 L26 18 Z" fill="#78350f"/>
      <path d="M46 22 L50 10 L38 18 Z" fill="#78350f"/>
      <ellipse cx="32" cy="36" rx="19" ry="20" fill="url(#${p}-body)"/>
      <ellipse cx="32" cy="42" rx="12" ry="12" fill="#fef3c7" opacity=".55"/>
      <g fill="#fffbeb">
        <circle cx="25" cy="32" r="7"/><circle cx="39" cy="32" r="7"/>
      </g>
      <g fill="#1f2937">
        <circle cx="25" cy="32" r="3.4"/><circle cx="39" cy="32" r="3.4"/>
      </g>
      <g fill="#fff" opacity=".9">
        <circle cx="23.6" cy="30.6" r="1.2"/><circle cx="37.6" cy="30.6" r="1.2"/>
      </g>
      <polygon points="32,36 29,41 35,41" fill="#f59e0b"/>
      ${specular(23, 24, 3.4, 5, -28, 0.35)}`, 3.4, 1.8)}`
}

/** ลูกมังกรเลข */
function petDragon(): string {
  const p = 'it-pdragon'
  return `
    <defs>${SHARED}${glowFilter(`${p}-glow`, 2)}
      ${sphereGradient(`${p}-body`, '#fca5a5', '#dc2626', '#7f1d1d')}</defs>
    ${SHADOW}
    ${bob(`
      <path d="M20 30 Q6 16 4 32 Q12 34 8 44 Q18 38 24 38 Z" fill="#991b1b"/>
      <path d="M44 30 Q58 16 60 32 Q52 34 56 44 Q46 38 40 38 Z" fill="#991b1b"/>
      <path d="M22 22 L17 10 L28 18 Z" fill="#7f1d1d"/>
      <path d="M42 22 L47 10 L36 18 Z" fill="#7f1d1d"/>
      <ellipse cx="32" cy="36" rx="17" ry="16" fill="url(#${p}-body)"/>
      <ellipse cx="32" cy="41" rx="10" ry="8" fill="#fecaca" opacity=".55"/>
      <g fill="#fffbeb">
        <circle cx="26" cy="32" r="4.6"/><circle cx="38" cy="32" r="4.6"/>
      </g>
      <g fill="#7f1d1d">
        <circle cx="26" cy="33" r="2.2"/><circle cx="38" cy="33" r="2.2"/>
      </g>
      <path d="M27 43 Q32 48 37 43 Q32 46 27 43 Z" fill="#450a0a"/>
      ${specular(24, 26, 3.4, 4.6, -28, 0.4)}
      ${flicker(`<polygon points="32,16 29,8 35,8" fill="#fbbf24"
        filter="url(#${p}-glow)"/>`, 2.4, 0.35)}`, 3, 2.2)}`
}

/** ยาฟื้นพลัง ใช้ร่วมกันสองขนาด ต่างที่สีกับขนาดขวด */
function potionShape(p: string, color: string, light: string, scale: number): string {
  return `
    <defs>${SHARED}${glowFilter(`${p}-glow`, 1.8)}
      ${verticalGradient(`${p}-liquid`, light, color)}</defs>
    ${SHADOW}
    ${bob(`
      <g transform="translate(32 34) scale(${scale}) translate(-32 -34)">
        <rect x="28" y="8" width="8" height="8" rx="2" fill="#94a3b8"/>
        <path d="M26 16 L38 16 L38 26 Q48 34 48 44 Q48 54 32 54 Q16 54 16 44
                 Q16 34 26 26 Z" fill="#cbd5e1" opacity=".3"
          stroke="#e2e8f0" stroke-width="1.6"/>
        <path d="M19 38 Q16 41 16 44 Q16 54 32 54 Q48 54 48 44 Q48 41 45 38 Z"
          fill="url(#${p}-liquid)" filter="url(#${p}-glow)"/>
        <circle cx="27" cy="46" r="2" fill="#fff" opacity=".6">
          <animate attributeName="cy" values="50;40;50" dur="2.6s" repeatCount="indefinite"/>
        </circle>
        <circle cx="37" cy="48" r="1.4" fill="#fff" opacity=".45">
          <animate attributeName="cy" values="51;42;51" dur="3.3s" repeatCount="indefinite"/>
        </circle>
        ${specular(23, 32, 2, 5, -18, 0.5)}
      </g>`, 3.6, 1.8)}`
}

const potion = () => potionShape('it-potion', '#dc2626', '#fca5a5', 0.85)
const bigPotion = () => potionShape('it-bigpotion', '#7c3aed', '#c4b5fd', 1.05)

const ITEM_ART: Record<string, () => string> = {
  pencil,
  ruler,
  compass,
  infinityPen,
  notebook,
  abacus,
  crystalArmor,
  clover,
  hourglass,
  goldStar,
  petSlime,
  petOwl,
  petDragon,
  potion,
  bigPotion,
}

/** ภาพของหนึ่งชิ้น คืนกล่องเปล่าถ้ายังไม่มีภาพของชิ้นนั้น */
export function itemArt(art: string): string {
  const draw = ITEM_ART[art]
  if (draw) return draw()

  return `
    <defs>${SHARED}</defs>
    ${SHADOW}
    <rect x="16" y="16" width="32" height="32" rx="6" fill="#475569"/>
    <text x="32" y="40" text-anchor="middle" font-size="20" fill="#cbd5e1">?</text>`
}

export function hasItemArt(art: string): boolean {
  return art in ITEM_ART
}

export const ITEM_ART_NAMES = Object.keys(ITEM_ART)
