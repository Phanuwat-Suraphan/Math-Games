import type { CompanionId } from './companions'

/**
 * ภาพเพื่อนร่วมทาง วาดด้วย SVG ในกรอบ 100 × 100 แบบเดียวกับภาพมอนสเตอร์ของเกมหลัก
 *
 * คืนเป็นข้อความ SVG ไม่ใช่ JSX เพราะใช้สองที่
 *   - บนการ์ดในหน้าจอ (ใส่ใน svg ผ่าน innerHTML)
 *   - นั่งบนยานในฉากสามมิติ (แปลงเป็นรูปแล้ววาดลงผืนผ้าใบ)
 * ภาพบนผืนผ้าใบใช้ filter ของ SVG ไม่ได้ทุกเบราว์เซอร์ จึงใช้แค่ไล่สีกับรูปทรง
 *
 * ทุกตัวแสงมาจากซ้ายบน ตาโต แก้มแดง และมีเงาบนพื้นเหมือนกัน ดูเป็นแก๊งเดียวกัน
 */

export const COMPANION_VIEWBOX = '0 0 100 100'

const INK = '#1b1537'

function radial(id: string, light: string, mid: string, dark: string): string {
  return `<radialGradient id="${id}" cx="38%" cy="32%" r="75%">
    <stop offset="0%" stop-color="${light}"/><stop offset="55%" stop-color="${mid}"/><stop offset="100%" stop-color="${dark}"/>
  </radialGradient>`
}

function shadow(cx: number, cy: number, rx: number): string {
  return `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${(rx * 0.22).toFixed(1)}" fill="#000" opacity="0.22"/>`
}

function eye(x: number, y: number, r: number): string {
  return `<ellipse cx="${x}" cy="${y}" rx="${(r * 0.86).toFixed(2)}" ry="${r}" fill="${INK}"/>
    <circle cx="${(x - r * 0.3).toFixed(2)}" cy="${(y - r * 0.36).toFixed(2)}" r="${(r * 0.38).toFixed(2)}" fill="#fff"/>
    <circle cx="${(x + r * 0.32).toFixed(2)}" cy="${(y + r * 0.3).toFixed(2)}" r="${(r * 0.16).toFixed(2)}" fill="#fff"/>`
}

function blush(x: number, y: number): string {
  return `<ellipse cx="${x}" cy="${y}" rx="5.5" ry="3.2" fill="#ff8fb0" opacity="0.6"/>`
}

function gloss(x: number, y: number, rx: number, ry: number): string {
  return `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="#fff" opacity="0.35" transform="rotate(-25 ${x} ${y})"/>`
}

/** ปุ๊กปิ๊ก · วุ้นสีเขียว หนวดเดียวปลายเป็นดาว */
function pukpik(): string {
  return `<defs>${radial('pk-body', '#d9f99d', '#4ade80', '#15803d')}</defs>
    ${shadow(50, 91, 32)}
    <path d="M52 32 Q50 20 57 11" stroke="#15803d" stroke-width="3" fill="none" stroke-linecap="round"/>
    <path d="M57 3 L59.4 8.6 L65.4 9 L60.8 12.8 L62.3 18.7 L57 15.5 L51.7 18.7 L53.2 12.8 L48.6 9 L54.6 8.6 Z" fill="#fcd34d" stroke="#d97706" stroke-width="1.2" stroke-linejoin="round"/>
    <path d="M16 86 C12 62 24 30 50 30 C76 30 88 62 84 86 Q76 92 70 87 Q64 93 57 88 Q50 93 43 88 Q36 93 30 87 Q24 92 16 86 Z" fill="url(#pk-body)" stroke="#166534" stroke-opacity="0.4" stroke-width="2"/>
    ${gloss(36, 44, 9, 5)}
    ${eye(39, 58, 7)}${eye(61, 58, 7)}
    ${blush(29, 69)}${blush(71, 69)}
    <path d="M42 70 Q50 80 58 70 Z" fill="${INK}"/><ellipse cx="50" cy="75" rx="3.6" ry="2" fill="#ff7a98"/>`
}

/** โมโม่ · กระต่ายขนฟูสีม่วงจากดวงจันทร์ มีรอยจันทร์เสี้ยวบนหน้าผาก */
function momo(): string {
  return `<defs>${radial('mo-body', '#faf5ff', '#c4b5fd', '#7c3aed')}</defs>
    ${shadow(50, 92, 28)}
    <ellipse cx="36" cy="26" rx="8" ry="21" fill="url(#mo-body)" transform="rotate(-12 36 26)"/>
    <ellipse cx="36" cy="28" rx="3.6" ry="14" fill="#fbcfe8" transform="rotate(-12 36 28)"/>
    <ellipse cx="64" cy="26" rx="8" ry="21" fill="url(#mo-body)" transform="rotate(12 64 26)"/>
    <ellipse cx="64" cy="28" rx="3.6" ry="14" fill="#fbcfe8" transform="rotate(12 64 28)"/>
    <circle cx="50" cy="63" r="28" fill="url(#mo-body)" stroke="#6d28d9" stroke-opacity="0.35" stroke-width="2"/>
    <path d="M47 42 A7 7 0 1 0 55 50 A5.5 5.5 0 1 1 47 42 Z" fill="#fde047"/>
    ${gloss(38, 50, 8, 4.5)}
    ${eye(40, 62, 6.5)}${eye(60, 62, 6.5)}
    ${blush(30, 72)}${blush(70, 72)}
    <path d="M47 71 Q50 74 53 71" stroke="${INK}" stroke-width="2.4" fill="none" stroke-linecap="round"/>
    <path d="M50 70.5 L50 74" stroke="${INK}" stroke-width="2" stroke-linecap="round"/>
    <ellipse cx="38" cy="89" rx="8" ry="4.5" fill="#ede9fe"/><ellipse cx="62" cy="89" rx="8" ry="4.5" fill="#ede9fe"/>`
}

/** บ็อบบี้ · ก้อนหินอวกาศมีหลุม บนหัวมีผลึกสีฟ้า */
function bobby(): string {
  return `<defs>${radial('bo-body', '#f5f5f4', '#a8a29e', '#57534e')}
    <linearGradient id="bo-gem" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#cffafe"/><stop offset="100%" stop-color="#06b6d4"/></linearGradient></defs>
    ${shadow(50, 91, 32)}
    <path d="M44 30 L48 16 L53 30 Z" fill="url(#bo-gem)" stroke="#0e7490" stroke-width="1.2" stroke-linejoin="round"/>
    <path d="M54 31 L61 20 L62 33 Z" fill="url(#bo-gem)" stroke="#0e7490" stroke-width="1.2" stroke-linejoin="round"/>
    <path d="M20 70 C16 50 28 30 48 29 C70 27 86 42 84 62 C86 78 74 90 52 89 C32 90 22 84 20 70 Z" fill="url(#bo-body)" stroke="#44403c" stroke-opacity="0.45" stroke-width="2"/>
    <circle cx="72" cy="48" r="5" fill="#78716c" opacity="0.55"/><circle cx="28" cy="76" r="4" fill="#78716c" opacity="0.5"/><circle cx="66" cy="80" r="3" fill="#78716c" opacity="0.5"/>
    ${gloss(36, 42, 9, 5)}
    ${eye(40, 58, 6.5)}${eye(60, 58, 6.5)}
    ${blush(30, 68)}${blush(70, 68)}
    <path d="M40 69 Q50 78 60 69" stroke="${INK}" stroke-width="3" fill="none" stroke-linecap="round"/>
    <rect x="47.5" y="70.5" width="5" height="4" rx="1" fill="#fff"/>
    <path d="M20 66 Q10 62 12 54" stroke="#78716c" stroke-width="5" fill="none" stroke-linecap="round"/>
    <path d="M84 64 Q93 58 90 50" stroke="#78716c" stroke-width="5" fill="none" stroke-linecap="round"/>`
}

/** ฟูฟู · ผีน้อยดาวหางสีฟ้าน้ำแข็ง ลากหางวิบวับ */
function fufu(): string {
  return `<defs>${radial('fu-body', '#ffffff', '#bae6fd', '#38bdf8')}
    <linearGradient id="fu-tail" x1="1" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#e0f2fe" stop-opacity="0.95"/><stop offset="100%" stop-color="#818cf8" stop-opacity="0"/></linearGradient></defs>
    ${shadow(58, 91, 22)}
    <path d="M44 44 C30 50 18 64 6 88 C22 76 30 72 42 70 C30 80 26 86 22 96 C38 82 48 76 60 72 Z" fill="url(#fu-tail)"/>
    <path d="M58 22 C76 22 84 38 82 56 C81 70 76 80 72 84 Q68 78 64 84 Q60 78 56 84 Q52 78 48 82 C42 72 36 60 38 46 C40 32 46 22 58 22 Z" fill="url(#fu-body)" stroke="#0284c7" stroke-opacity="0.35" stroke-width="2"/>
    ${gloss(50, 34, 8, 4.5)}
    ${eye(52, 50, 6.5)}${eye(70, 50, 6.5)}
    ${blush(45, 61)}${blush(77, 61)}
    <ellipse cx="61" cy="63" rx="3.6" ry="4.2" fill="${INK}"/>
    <path d="M18 30 l2 5 l5 2 l-5 2 l-2 5 l-2 -5 l-5 -2 l5 -2 Z" fill="#fef9c3"/>
    <path d="M86 16 l1.5 3.5 l3.5 1.5 l-3.5 1.5 l-1.5 3.5 l-1.5 -3.5 l-3.5 -1.5 l3.5 -1.5 Z" fill="#fef9c3"/>`
}

/** ตุ๊บตั๊บ · มอนสเตอร์ตาเดียวสีส้ม หนวดคู่ ขาหนวดปลาหมึกสามขา */
function tubtab(): string {
  return `<defs>${radial('tt-body', '#fed7aa', '#fb923c', '#c2410c')}</defs>
    ${shadow(50, 92, 30)}
    <path d="M38 30 Q32 18 26 14" stroke="#c2410c" stroke-width="3" fill="none" stroke-linecap="round"/><circle cx="25" cy="13" r="4.5" fill="#a3e635"/>
    <path d="M62 30 Q68 18 74 14" stroke="#c2410c" stroke-width="3" fill="none" stroke-linecap="round"/><circle cx="75" cy="13" r="4.5" fill="#a3e635"/>
    <path d="M30 80 Q24 92 16 90" stroke="#ea580c" stroke-width="7" fill="none" stroke-linecap="round"/>
    <path d="M50 84 L50 94" stroke="#ea580c" stroke-width="7" stroke-linecap="round"/>
    <path d="M70 80 Q76 92 84 90" stroke="#ea580c" stroke-width="7" fill="none" stroke-linecap="round"/>
    <path d="M50 28 C72 28 82 46 80 64 C78 80 66 88 50 88 C34 88 22 80 20 64 C18 46 28 28 50 28 Z" fill="url(#tt-body)" stroke="#9a3412" stroke-opacity="0.4" stroke-width="2"/>
    ${gloss(36, 40, 8, 4.5)}
    <circle cx="50" cy="54" r="15" fill="#fff" stroke="#475569" stroke-width="3.5"/>
    ${eye(50, 55, 9)}
    ${blush(30, 68)}${blush(70, 68)}
    <path d="M38 72 Q50 84 62 72" stroke="${INK}" stroke-width="3" fill="none" stroke-linecap="round"/>
    <rect x="46" y="75" width="4.5" height="4.5" rx="1" fill="#fff"/>`
}

/** ดราโก้ · ลูกมังกรอวกาศสีเขียวอมฟ้า ปีกม่วง เขาสีทอง */
function draco(): string {
  return `<defs>${radial('dr-body', '#ccfbf1', '#2dd4bf', '#0f766e')}
    <linearGradient id="dr-wing" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#e9d5ff"/><stop offset="100%" stop-color="#a855f7"/></linearGradient></defs>
    ${shadow(50, 92, 28)}
    <path d="M28 58 C10 50 6 36 10 28 C16 38 22 40 30 44 Z" fill="url(#dr-wing)" stroke="#7e22ce" stroke-opacity="0.4" stroke-width="1.5"/>
    <path d="M72 58 C90 50 94 36 90 28 C84 38 78 40 70 44 Z" fill="url(#dr-wing)" stroke="#7e22ce" stroke-opacity="0.4" stroke-width="1.5"/>
    <path d="M76 80 Q92 82 94 70" stroke="#14b8a6" stroke-width="6" fill="none" stroke-linecap="round"/>
    <ellipse cx="50" cy="72" rx="24" ry="18" fill="url(#dr-body)"/>
    <ellipse cx="50" cy="76" rx="13" ry="11" fill="#fef3c7"/>
    <path d="M36 22 L39 10 L44 21 Z" fill="#fcd34d" stroke="#b45309" stroke-width="1.2" stroke-linejoin="round"/>
    <path d="M56 21 L61 10 L64 22 Z" fill="#fcd34d" stroke="#b45309" stroke-width="1.2" stroke-linejoin="round"/>
    <circle cx="50" cy="42" r="24" fill="url(#dr-body)" stroke="#115e59" stroke-opacity="0.35" stroke-width="2"/>
    ${gloss(40, 30, 8, 4.5)}
    ${eye(40, 42, 6.5)}${eye(60, 42, 6.5)}
    ${blush(31, 53)}${blush(69, 53)}
    <path d="M44 54 Q50 60 56 54" stroke="${INK}" stroke-width="2.6" fill="none" stroke-linecap="round"/>
    <circle cx="46" cy="50" r="1.2" fill="#115e59"/><circle cx="54" cy="50" r="1.2" fill="#115e59"/>
    <ellipse cx="38" cy="89" rx="7" ry="4" fill="#0f766e"/><ellipse cx="62" cy="89" rx="7" ry="4" fill="#0f766e"/>`
}

const ART: Record<CompanionId, () => string> = { pukpik, momo, bobby, fufu, tubtab, draco }

export function companionArt(id: CompanionId): string {
  return (ART[id] ?? pukpik)()
}

/** SVG เต็มไฟล์ ใช้แปลงเป็นรูปให้ผืนผ้าใบวาด (ต้องมี xmlns และขนาด ไม่งั้น Safari ไม่ยอมวาด) */
export function companionSvgFile(id: CompanionId): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${COMPANION_VIEWBOX}" width="100" height="100">${companionArt(id)}</svg>`
}
