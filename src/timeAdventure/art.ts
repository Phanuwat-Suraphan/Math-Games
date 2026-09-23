/**
 * ภาพของผจญภัยเมืองแห่งเวลา: นาฬิกา ฮีโร่ 4 ตัว กระต่าย คุณเข็ม และกระดาน
 *
 * ทุกฟังก์ชันคืนข้อความ SVG แบบเดียวกับ src/art/*.ts ของเกมหลัก
 * หน้าจอนำไปวางด้วย dangerouslySetInnerHTML ได้อย่างปลอดภัย
 * เพราะข้อความทั้งหมดสร้างจากค่าคงที่ในไฟล์นี้ ไม่มีข้อความจากผู้เล่นปนเลย
 *
 * ภาพชุดนี้ตรงกับชุดการ์ดพิมพ์ time-adventure.html ทุกเส้น
 * เด็กที่เล่นทั้งบนโต๊ะและบนจอจึงจำฮีโร่ของตัวเองได้ทันที
 *
 * กฎของหน้าปัดที่ห้ามแก้
 * · เข็มสั้นสีแดง สั้นและหนา · เข็มยาวสีน้ำเงิน ยาวและบาง (ตรงกับนาฬิกากระดาษที่ครูทำ)
 * · เวลาครึ่งชั่วโมง เข็มสั้นต้องอยู่กึ่งกลางระหว่างสองเลข ไม่ชี้ตรงเลข
 * · กระดิ่งและขาอยู่นอกหน้าปัดเสมอ ไม่บังตัวเลข
 */

import type { HeroKey } from './engine'

export const INK = '#23324A'
export const HOUR_HAND = '#E53935'
export const MINUTE_HAND = '#1E6FD9'

export interface SvgArt {
  viewBox: string
  inner: string
  label: string
}

/** มุมของเข็ม (องศา ตามเข็มนาฬิกา เริ่มที่เลข 12) */
export function handAngles(h: number, m: number): { hour: number; minute: number } {
  return { hour: (h % 12) * 30 + m * 0.5, minute: m * 6 }
}

/**
 * หน้าปัดนาฬิกา
 *
 * plain: หน้าปัดเรียบ ไม่มีกระดิ่ง ใช้กับนาฬิกาเล็กในข้อเลือก ก ข ค ให้อ่านง่าย
 * hands: false คือหน้าปัดเปล่าให้เด็กชี้เอง
 * สีขอบใช้ var(--c) ของการ์ด จึงเปลี่ยนสีตามกองการ์ดเอง
 */
export function clockArt(h: number, m: number, options: { hands?: boolean; plain?: boolean } = {}): SvgArt {
  const hands = options.hands !== false
  const plain = options.plain === true
  let s = ''
  if (!plain) {
    s += '<line x1="-29" y1="41" x2="-37" y2="54" stroke="' + INK + '" stroke-width="5" stroke-linecap="round"/>'
    s += '<line x1="29" y1="41" x2="37" y2="54" stroke="' + INK + '" stroke-width="5" stroke-linecap="round"/>'
    s += '<rect x="-5" y="-57" width="10" height="9" rx="2.5" fill="' + INK + '"/>'
    for (const d of [-1, 1]) {
      s += '<g transform="rotate(' + d * 38 + ')"><path d="M-15 -47 Q-15 -62 0 -62 Q15 -62 15 -47 Z" style="fill:var(--c,#1E88D9)" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/><circle cx="0" cy="-63.5" r="3" fill="' + INK + '"/></g>'
    }
  }
  s += '<circle r="47" fill="#FFFDF6" style="stroke:' + (plain ? INK : 'var(--c,#23324A)') + '" stroke-width="' + (plain ? 3.6 : 5) + '"/>'
  if (!plain) s += '<circle r="49.6" fill="none" stroke="' + INK + '" stroke-width="1.4"/>'
  for (let i = 0; i < 60; i += 1) {
    const major = i % 5 === 0
    s += '<line x1="0" y1="-43.5" x2="0" y2="' + (major ? -38.5 : -41.2) + '" stroke="' + (major ? INK : '#9AA6B8') + '" stroke-width="' + (major ? 2 : 1) + '" transform="rotate(' + i * 6 + ')"/>'
  }
  for (let n = 1; n <= 12; n += 1) {
    const a = (n * Math.PI) / 6
    const r = 30.5
    s += '<text x="' + (r * Math.sin(a)).toFixed(2) + '" y="' + (-r * Math.cos(a)).toFixed(2) + '" text-anchor="middle" dominant-baseline="central" font-family="Mitr,Kanit,Tahoma,sans-serif" font-weight="600" font-size="12" fill="' + INK + '">' + n + '</text>'
  }
  if (hands) {
    const angle = handAngles(h, m)
    s += '<line x1="0" y1="4" x2="0" y2="-20" stroke="' + HOUR_HAND + '" stroke-width="6.4" stroke-linecap="round" transform="rotate(' + angle.hour + ')"/>'
    s += '<line x1="0" y1="6" x2="0" y2="-35" stroke="' + MINUTE_HAND + '" stroke-width="3.4" stroke-linecap="round" transform="rotate(' + angle.minute + ')"/>'
  }
  s += '<circle r="3.6" fill="' + INK + '"/>'
  return {
    viewBox: plain ? '-50 -50 100 100' : '-55 -60 110 118',
    inner: s,
    label: hands ? 'นาฬิกาเข็ม ' + h + ':' + String(m).padStart(2, '0') : 'หน้าปัดนาฬิกาเปล่า',
  }
}

/* ── ตัวละคร ───────────────────────────────────────────── */
const SKIN = '#FFD9B8',
  HAIR = '#3A2A20',
  BLUSH = '#FF9DB0'
// ฮีโร่ 4 ตัว: อัศวินทิม (ฮีโร่ชาย) · นางฟ้าใบเตย (ฮีโร่หญิง) · พ่อมดโมโม่ · มังกรน้อยฟูฟู
const O = 'stroke="' + INK + '" stroke-linejoin="round"'
function face(cx: number, cy: number, opt: { fang?: boolean } = {}): string {
  let s = ''
  s += '<ellipse cx="' + (cx - 4.4) + '" cy="' + cy + '" rx="1.9" ry="2.3" fill="' + INK + '"/><ellipse cx="' + (cx + 4.4) + '" cy="' + cy + '" rx="1.9" ry="2.3" fill="' + INK + '"/>'
  s += '<circle cx="' + (cx - 3.8) + '" cy="' + (cy - 0.8) + '" r=".7" fill="#fff"/><circle cx="' + (cx + 5) + '" cy="' + (cy - 0.8) + '" r=".7" fill="#fff"/>'
  s += '<ellipse cx="' + (cx - 7.2) + '" cy="' + (cy + 4) + '" rx="2.2" ry="1.25" fill="' + BLUSH + '" opacity=".85"/><ellipse cx="' + (cx + 7.2) + '" cy="' + (cy + 4) + '" rx="2.2" ry="1.25" fill="' + BLUSH + '" opacity=".85"/>'
  s += '<path d="M' + (cx - 2.6) + ' ' + (cy + 4.2) + ' Q' + cx + ' ' + (cy + 7) + ' ' + (cx + 2.6) + ' ' + (cy + 4.2) + '" fill="none" stroke="' + INK + '" stroke-width="1.1" stroke-linecap="round"/>'
  if (opt.fang) s += '<path d="M' + (cx + 0.6) + ' ' + (cy + 5.3) + ' l.9 1.6 .9-1.4" fill="#fff" stroke="' + INK + '" stroke-width=".5"/>'
  return s
}
export function heroInner(k: HeroKey): string {
  let s = ''
  if (k === 'knight') {
    s += '<path d="M12 27 L6 46 Q20 42.5 34 46 L28 27 Z" fill="#E53935" ' + O + ' stroke-width="1.2"/>'
    s += '<rect x="14" y="40" width="5" height="6.5" rx="2" fill="#AEB9C7" ' + O + ' stroke-width=".8"/><rect x="21" y="40" width="5" height="6.5" rx="2" fill="#AEB9C7" ' + O + ' stroke-width=".8"/>'
    s += '<path d="M12.6 29.5 L9.5 36" stroke="#AEB9C7" stroke-width="3.8" stroke-linecap="round"/><circle cx="9.2" cy="36.8" r="2.1" fill="#AEB9C7" ' + O + ' stroke-width=".8"/>'
    s +=
      '<path d="M35.5 21.5 L38.2 4.5" stroke="#DDE4EC" stroke-width="2.4" stroke-linecap="round"/><path d="M35.5 21.5 L38.2 4.5" stroke="' + INK + '" stroke-width=".6"/><path d="M32.2 21.2 L38.8 22.2" stroke="#E0A100" stroke-width="2" stroke-linecap="round"/>'
    s += '<path d="M27.4 29.5 L34.2 23.5" stroke="#AEB9C7" stroke-width="3.8" stroke-linecap="round"/><circle cx="34.8" cy="22.6" r="2.2" fill="#AEB9C7" ' + O + ' stroke-width=".8"/>'
    s += '<rect x="12" y="26" width="16" height="15.5" rx="5" fill="#1E88D9" ' + O + ' stroke-width="1.3"/><path d="M12.4 33.5 H27.6" stroke="#E0A100" stroke-width="2.2"/>'
    s += '<circle cx="20" cy="30.6" r="3.4" fill="#FFD233" ' + O + ' stroke-width=".9"/><path d="M20 30.6 V28.6 M20 30.6 H21.8" stroke="' + INK + '" stroke-width=".9" stroke-linecap="round"/>'
    s += '<path d="M19 5.5 Q17 0 24.5 1 Q20.5 2.5 22 5.5 Z" fill="#E53935" ' + O + ' stroke-width=".8"/>'
    s += '<circle cx="20" cy="16.5" r="10.6" fill="' + SKIN + '" ' + O + ' stroke-width="1.3"/>'
    s += '<path d="M8.6 18.5 Q8 5.2 20 5.2 Q32 5.2 31.4 18.5 L28 18.5 Q28 11.5 20 11.5 Q12 11.5 12 18.5 Z" fill="#C9D3DF" ' + O + ' stroke-width="1.2"/><path d="M20 5.4 V11.4" stroke="#8A97A8" stroke-width="1"/>'
    s += face(20, 17.6)
  } else if (k === 'fairy') {
    ;[-1, 1].forEach((d) => {
      s += '<ellipse cx="' + (20 + d * 11) + '" cy="27" rx="6.4" ry="9" fill="#BDE8FF" ' + O + ' stroke-width=".9" transform="rotate(' + d * 28 + ' ' + (20 + d * 11) + ' 27)"/>'
      s += '<ellipse cx="' + (20 + d * 10) + '" cy="36" rx="4" ry="5" fill="#FFD3EC" ' + O + ' stroke-width=".8" transform="rotate(' + d * -20 + ' ' + (20 + d * 10) + ' 36)"/>'
    })
    s += '<path d="M9 17 Q7.5 29 11 31 L29 31 Q32.5 29 31 17 Z" fill="' + HAIR + '" ' + O + ' stroke-width="1"/>'
    s += '<rect x="15" y="40" width="3.6" height="6.2" rx="1.6" fill="' + SKIN + '" ' + O + ' stroke-width=".7"/><rect x="21.4" y="40" width="3.6" height="6.2" rx="1.6" fill="' + SKIN + '" ' + O + ' stroke-width=".7"/>'
    s += '<path d="M12.6 29.5 L9.6 36" stroke="' + SKIN + '" stroke-width="3" stroke-linecap="round"/>'
    s += '<path d="M34.3 22 L37 10.5" stroke="#8B5A2B" stroke-width="1.4" stroke-linecap="round"/><path d="M37.3 5.6 l1.3 2.6 2.8.4 -2 2 .5 2.8 -2.6-1.3 -2.6 1.3 .5-2.8 -2-2 2.8-.4z" fill="#FFD233" ' + O + ' stroke-width=".6"/>'
    s += '<path d="M27.4 29.5 L33.8 23.2" stroke="' + SKIN + '" stroke-width="3" stroke-linecap="round"/><circle cx="34.3" cy="22.6" r="1.9" fill="' + SKIN + '" ' + O + ' stroke-width=".7"/>'
    s += '<path d="M14 26.5 L26 26.5 L31 42.5 Q20 45.5 9 42.5 Z" fill="#FF8FC0" ' + O + ' stroke-width="1.2"/><path d="M11 40 Q20 43 29 40" fill="none" stroke="#fff" stroke-width="1" stroke-dasharray="1.4 1.4"/>'
    s += '<circle cx="20" cy="16" r="10.6" fill="' + SKIN + '" ' + O + ' stroke-width="1.3"/>'
    s += '<path d="M9 16.5 Q8 4.5 20 4.5 Q32 4.5 31 16.5 Q27 10 20 10.5 Q14 10 9 16.5 Z" fill="' + HAIR + '" ' + O + ' stroke-width="1"/>'
    s += '<circle cx="13.5" cy="7.6" r="1.7" fill="#FF8FC0"/><circle cx="17.5" cy="5.4" r="1.7" fill="#FFD233"/><circle cx="22.5" cy="5.4" r="1.7" fill="#9EE2B0"/><circle cx="26.5" cy="7.6" r="1.7" fill="#FF8FC0"/>'
    s += face(20, 17)
  } else if (k === 'wizard') {
    s += '<path d="M34.5 12.5 V46" stroke="#8B5A2B" stroke-width="1.8" stroke-linecap="round"/><circle cx="34.5" cy="10.5" r="3.4" fill="#7FE3FF" ' + O + ' stroke-width=".9"/><circle cx="33.4" cy="9.4" r="1" fill="#fff"/>'
    s += '<path d="M12.5 28 L27.5 28 L31 46.5 L9 46.5 Z" fill="#7C4DDB" ' + O + ' stroke-width="1.2"/>'
    s += '<path d="M20 30.5 A4 4 0 1 0 23.6 36 A3.2 3.2 0 1 1 20 30.5 Z" fill="#FFD233" ' + O + ' stroke-width=".7"/>'
    s += '<path d="M13 31 L9.6 37" stroke="#7C4DDB" stroke-width="3.8" stroke-linecap="round"/><circle cx="9.3" cy="37.7" r="2" fill="' + SKIN + '" ' + O + ' stroke-width=".7"/>'
    s += '<path d="M27 31 L33 29" stroke="#7C4DDB" stroke-width="3.8" stroke-linecap="round"/><circle cx="34" cy="28.8" r="2.1" fill="' + SKIN + '" ' + O + ' stroke-width=".7"/>'
    s += '<circle cx="20" cy="19.5" r="9.8" fill="' + SKIN + '" ' + O + ' stroke-width="1.3"/>'
    s += '<path d="M10.5 20 Q9.5 15 12.5 13.5 M29.5 20 Q30.5 15 27.5 13.5" stroke="#B9763D" stroke-width="2.4" stroke-linecap="round" fill="none"/>'
    s += '<path d="M9.5 12.8 L19 1.2 Q23 -.4 25.2 3.2 L30.5 12.8 Z" fill="#6A2FA0" ' + O + ' stroke-width="1.1"/><ellipse cx="20" cy="13.2" rx="14.2" ry="3" fill="#6A2FA0" ' + O + ' stroke-width="1.1"/>'
    s += '<path d="M21 5 l.9 1.8 2 .3 -1.5 1.4 .4 2 -1.8-1 -1.8 1 .4-2 -1.5-1.4 2-.3z" fill="#FFD233"/><circle cx="15" cy="9.4" r=".8" fill="#FFD233"/><circle cx="26" cy="9.2" r=".7" fill="#FFD233"/>'
    s += face(20, 20.3)
  } else if (k === 'dragon') {
    s += '<path d="M28 40 Q37 41 38 33 L35.5 34.8 L36.5 31 Q34 36 27 36 Z" fill="#4CC06A" ' + O + ' stroke-width="1"/>'
    s += '<path d="M11 28 L2.5 21.5 L4.5 27 L1.5 29 L6.5 30.5 L7 34 Z" fill="#9BE3AE" ' + O + ' stroke-width="1"/><path d="M29 28 L37.5 21.5 L35.5 27 L38.5 29 L33.5 30.5 L33 34 Z" fill="#9BE3AE" ' + O + ' stroke-width="1"/>'
    s += '<ellipse cx="14.5" cy="45" rx="3.6" ry="2.2" fill="#3DA85A" ' + O + ' stroke-width=".8"/><ellipse cx="25.5" cy="45" rx="3.6" ry="2.2" fill="#3DA85A" ' + O + ' stroke-width=".8"/>'
    s +=
      '<ellipse cx="20" cy="36" rx="10.6" ry="9.4" fill="#4CC06A" ' +
      O +
      ' stroke-width="1.3"/><ellipse cx="20" cy="37.5" rx="6.2" ry="6.6" fill="#FFF1B8" ' +
      O +
      ' stroke-width=".8"/><path d="M15 35.5 H25 M14.6 38.5 H25.4 M15.4 41.5 H24.6" stroke="#E5CF7A" stroke-width=".8"/>'
    s += '<path d="M12.5 7.5 L11 1.5 L16.5 5.5 Z M27.5 7.5 L29 1.5 L23.5 5.5 Z" fill="#FFD233" ' + O + ' stroke-width=".8"/>'
    s += '<circle cx="20" cy="16" r="11.2" fill="#4CC06A" ' + O + ' stroke-width="1.3"/>'
    s += '<path d="M17 5.3 L18.5 2.6 L20 5 L21.5 2.6 L23 5.3" fill="#FF8F4D" ' + O + ' stroke-width=".7"/>'
    s += '<ellipse cx="20" cy="21.5" rx="7" ry="4.4" fill="#9BE3AE" ' + O + ' stroke-width=".9"/><circle cx="17.8" cy="20.4" r=".7" fill="' + INK + '"/><circle cx="22.2" cy="20.4" r=".7" fill="' + INK + '"/>'
    s += '<ellipse cx="15.6" cy="14.6" rx="2.2" ry="2.6" fill="' + INK + '"/><ellipse cx="24.4" cy="14.6" rx="2.2" ry="2.6" fill="' + INK + '"/><circle cx="16.3" cy="13.7" r=".8" fill="#fff"/><circle cx="25.1" cy="13.7" r=".8" fill="#fff"/>'
    s += '<ellipse cx="11.6" cy="19" rx="2" ry="1.2" fill="' + BLUSH + '" opacity=".85"/><ellipse cx="28.4" cy="19" rx="2" ry="1.2" fill="' + BLUSH + '" opacity=".85"/>'
    s += '<path d="M17.6 23.4 Q20 25.6 22.4 23.4" fill="none" stroke="' + INK + '" stroke-width="1" stroke-linecap="round"/><path d="M21 24.3 l.8 1.4 .8-1.3" fill="#fff" stroke="' + INK + '" stroke-width=".5"/>'
  }
  return s
}
export function bunnyInner(): string {
  let s = ''
  ;(
    [
      [13, -12],
      [27, 12],
    ] as Array<[number, number]>
  ).forEach((e) => {
    s += '<ellipse cx="' + e[0] + '" cy="12" rx="5" ry="11" fill="#fff" stroke="' + INK + '" stroke-width="1.5" transform="rotate(' + e[1] + ' ' + e[0] + ' 12)"/>'
    s += '<ellipse cx="' + e[0] + '" cy="13" rx="2.2" ry="7" fill="#FFB8C6" transform="rotate(' + e[1] + ' ' + e[0] + ' 13)"/>'
  })
  s += '<ellipse cx="20" cy="30" rx="15" ry="12.5" fill="#fff" stroke="' + INK + '" stroke-width="1.5"/>'
  s += '<path d="M9 37 Q20 43 31 37" fill="none" stroke="#E0A100" stroke-width="1.4"/><circle cx="20" cy="41" r="2.8" fill="#FFD233" stroke="' + INK + '" stroke-width=".8"/>'
  s += '<ellipse cx="14.5" cy="29" rx="1.9" ry="2.3" fill="' + INK + '"/><ellipse cx="25.5" cy="29" rx="1.9" ry="2.3" fill="' + INK + '"/><circle cx="15.1" cy="28.2" r=".7" fill="#fff"/><circle cx="26.1" cy="28.2" r=".7" fill="#fff"/>'
  s += '<ellipse cx="10.6" cy="33.2" rx="2.5" ry="1.4" fill="' + BLUSH + '" opacity=".85"/><ellipse cx="29.4" cy="33.2" rx="2.5" ry="1.4" fill="' + BLUSH + '" opacity=".85"/>'
  s += '<path d="M18.8 32 h2.4 l-1.2 1.3z" fill="#FF7F99"/><path d="M17.6 34.4 q1.2 1.3 2.4 0 q1.2 1.3 2.4 0" fill="none" stroke="' + INK + '" stroke-width="1" stroke-linecap="round"/>'
  return s
}
export function khemInner(col: string): string {
  let s = ''
  s += '<line x1="14" y1="37" x2="10" y2="42" stroke="' + INK + '" stroke-width="2.4" stroke-linecap="round"/><line x1="30" y1="37" x2="34" y2="42" stroke="' + INK + '" stroke-width="2.4" stroke-linecap="round"/>'
  s += '<circle cx="10" cy="10.5" r="5.6" fill="' + col + '" stroke="' + INK + '" stroke-width="1.3"/><circle cx="34" cy="10.5" r="5.6" fill="' + col + '" stroke="' + INK + '" stroke-width="1.3"/>'
  s += '<circle cx="22" cy="24" r="15.4" fill="#FFFDF6" stroke="' + col + '" stroke-width="3"/><circle cx="22" cy="24" r="16.9" fill="none" stroke="' + INK + '" stroke-width="1.1"/>'
  s += '<ellipse cx="17" cy="23" rx="1.8" ry="2.2" fill="' + INK + '"/><ellipse cx="27" cy="23" rx="1.8" ry="2.2" fill="' + INK + '"/><circle cx="17.6" cy="22.3" r=".6" fill="#fff"/><circle cx="27.6" cy="22.3" r=".6" fill="#fff"/>'
  s += '<ellipse cx="13.6" cy="27.6" rx="2.3" ry="1.3" fill="' + BLUSH + '" opacity=".85"/><ellipse cx="30.4" cy="27.6" rx="2.3" ry="1.3" fill="' + BLUSH + '" opacity=".85"/>'
  s += '<path d="M19 28 Q22 31 25 28" fill="none" stroke="' + INK + '" stroke-width="1.1" stroke-linecap="round"/>'
  return s
}

/* ── กระดาน ───────────────────────────────────────────────── */

interface Zone {
  n: number
  name: string
  deck: string
  color: string
  bg: string
  y: number
  dir: 1 | -1
  icons: [string, string, string]
  deco: string
}

const ZONES: Zone[] = [
  {
    n: 1,
    name: 'บ้านยามเช้า',
    deck: '⏰ อ่านเวลา',
    color: '#1E88D9',
    bg: '#E6F3FC',
    y: 212,
    dir: 1,
    icons: ['🐓', '⭐', '🦷'],
    deco: '🏠',
  },
  {
    n: 2,
    name: 'โรงเรียนแสนสนุก',
    deck: '🔍 หาเวลา',
    color: '#8B4FC7',
    bg: '#F2E9FB',
    y: 172,
    dir: -1,
    icons: ['🔔', '⭐', '📚'],
    deco: '🏫',
  },
  {
    n: 3,
    name: 'เมืองกิจวัตร',
    deck: '🏠 ชีวิตประจำวัน',
    color: '#3E9E4F',
    bg: '#E7F5E9',
    y: 132,
    dir: 1,
    icons: ['🍜', '⭐', '⚽'],
    deco: '🏙️',
  },
  {
    n: 4,
    name: 'สวนสนุกเวลา',
    deck: '⚔️ ท้าทาย',
    color: '#E8572E',
    bg: '#FDEBE4',
    y: 92,
    dir: -1,
    icons: ['🎠', '⭐', '🎡'],
    deco: '@dragon',
  },
  {
    n: 5,
    name: 'ปราสาทเวลา',
    deck: 'เลือกกองเอง',
    color: '#D99A00',
    bg: '#FFF5D1',
    y: 52,
    dir: 1,
    icons: ['🌉', '⭐', '🏰'],
    deco: '@gate',
  },
]
const COLUMNS = [58, 103, 148]

export const BOARD_VIEWBOX = '0 0 190 250'

/** จุดกึ่งกลางของช่อง 0 (START) ถึง 16 (ในปราสาท) บนกระดาน */
export const SQUARE_POSITIONS: Array<[number, number]> = (() => {
  const points: Array<[number, number]> = [[16, 234]]
  for (const zone of ZONES) {
    const xs = zone.dir === 1 ? COLUMNS : [...COLUMNS].reverse()
    for (const x of xs) points.push([x, zone.y + 22])
  }
  points.push([152, 26])
  return points
})()

const FONT = 'font-family="Mitr,Kanit,Tahoma,sans-serif"'

/** กระดานทั้งแผ่น ยกเว้นตัวเดิน (หน้าจอวาดตัวเดินเองเพื่อให้ขยับได้) */
export function boardArt(): string {
  let s = ''
  s += '<text x="4" y="14" ' + FONT + ' font-weight="600" font-size="8.5" fill="' + INK + '">เมืองแห่งเวลา</text>'
  s += '<text x="4" y="22.5" ' + FONT + ' font-size="4" fill="#51607A">ตอบถูก ➜ 🪙 +1 และเดินตาม ★</text>'
  s += '<text x="4" y="29" ' + FONT + ' font-size="4" fill="#51607A">จบตาที่ ⭐ ➜ ได้การ์ดพิเศษ</text>'
  s += '<text x="4" y="35.5" ' + FONT + ' font-size="4" fill="#51607A">ถึงประตูปราสาท ตอบ ⚔️ ถูก = ชนะ!</text>'
  for (const zone of ZONES) {
    s += '<rect x="2" y="' + zone.y + '" width="186" height="36" rx="6" fill="' + zone.bg + '" stroke="' + zone.color + '" stroke-width=".8"/>'
  }
  const road =
    SQUARE_POSITIONS.slice(0, 16)
      .map((point) => point.join(','))
      .join(' ') + ' 148,40'
  s += '<polyline points="' + road + '" fill="none" stroke="#C9D6E6" stroke-width="9" stroke-linejoin="round" stroke-linecap="round"/>'
  s += '<polyline points="' + road + '" fill="none" stroke="#fff" stroke-width="1" stroke-dasharray="3 3" stroke-linejoin="round"/>'
  s += '<rect x="118" y="3" width="68" height="44" rx="7" fill="#FFF5D1" stroke="#D99A00" stroke-width="1.2"/>'
  s += '<text x="152" y="25" text-anchor="middle" font-size="19">🏰</text>'
  s += '<text x="152" y="36" text-anchor="middle" ' + FONT + ' font-weight="600" font-size="4.8" fill="#7A5700">ห้องคุณเข็ม 👑</text>'
  s += '<svg x="120" y="7" width="13" height="15" viewBox="0 0 40 44">' + bunnyInner() + '</svg>'
  s += '<svg x="171" y="8" width="13" height="13" viewBox="0 0 44 44">' + khemInner('#D99A00') + '</svg>'

  let square = 0
  for (const zone of ZONES) {
    const lx = zone.dir === 1 ? 6 : 184
    const anchor = zone.dir === 1 ? 'start' : 'end'
    const cy = zone.y + 22
    s += '<text x="' + lx + '" y="' + (zone.y + 6.5) + '" text-anchor="' + anchor + '" ' + FONT + ' font-weight="600" font-size="4.4" fill="' + zone.color + '">ด่าน ' + zone.n + ' · ' + zone.name + '</text>'
    s += '<text x="' + lx + '" y="' + (zone.y + 11.2) + '" text-anchor="' + anchor + '" ' + FONT + ' font-size="3.3" fill="#3B4A63">จั่ว: ' + zone.deck + '</text>'
    if (zone.deco === '@dragon') {
      s += '<svg x="4" y="' + (cy - 10) + '" width="17" height="21" viewBox="0 0 40 48">' + heroInner('dragon') + '</svg>'
    } else if (zone.deco === '@gate') {
      s += '<text x="174" y="' + (cy - 1.5) + '" text-anchor="middle" ' + FONT + ' font-weight="600" font-size="3.6" fill="#7A5700">ประตู</text>'
      s += '<text x="174" y="' + (cy + 3) + '" text-anchor="middle" ' + FONT + ' font-weight="600" font-size="3.6" fill="#7A5700">ปราสาท</text>'
    } else {
      s += '<text x="' + (zone.dir === 1 ? 177 : 13) + '" y="' + (cy + 4) + '" text-anchor="middle" font-size="10">' + zone.deco + '</text>'
    }
    const xs = zone.dir === 1 ? COLUMNS : [...COLUMNS].reverse()
    xs.forEach((x, i) => {
      square += 1
      const star = i === 1
      const gate = square === 15
      s += '<circle cx="' + x + '" cy="' + cy + '" r="11" fill="' + (star ? '#FFE27A' : '#fff') + '" stroke="' + (gate ? '#B98400' : zone.color) + '" stroke-width="' + (gate ? 2.2 : 1.6) + '"/>'
      s += '<text x="' + x + '" y="' + (cy - 4.8) + '" text-anchor="middle" ' + FONT + ' font-weight="600" font-size="3.4" fill="' + INK + '">' + square + '</text>'
      s += '<text x="' + x + '" y="' + (cy + 4) + '" text-anchor="middle" font-size="8">' + zone.icons[i] + '</text>'
    })
  }
  const [sx, sy] = SQUARE_POSITIONS[0]
  s += '<circle cx="' + sx + '" cy="' + sy + '" r="9" fill="' + INK + '"/>'
  s += '<text x="' + sx + '" y="' + (sy - 1) + '" text-anchor="middle" font-size="5.5">🚩</text>'
  s += '<text x="' + sx + '" y="' + (sy + 5.2) + '" text-anchor="middle" ' + FONT + ' font-weight="600" font-size="3.2" fill="#fff">START</text>'
  return s
}
