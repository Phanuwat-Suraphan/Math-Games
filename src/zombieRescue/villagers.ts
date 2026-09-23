/**
 * ชาวเมือง 50 คนในสมุดวัคซีน: หนึ่งช่องสูตรคูณ หนึ่งคน
 *
 * ทำไมต้องมี
 *
 * สมุดที่ทุกช่องเป็นหัวซอมบี้เหมือนกันหมดดูเป็นตาราง ไม่ใช่ของสะสม
 * แต่ละช่องจึงเป็นชาวเมืองคนละคน มีชื่อ ทรงผม และของประจำตัวไม่ซ้ำกัน
 * ก่อนรักษาเป็นซอมบี้งัวเงียที่ยังใส่โบว์หรือหมวกของตัวเองอยู่ รักษาแล้วกลับเป็นคนหน้าเดิม
 * เด็กจึงรู้สึกว่า "ช่วยน้องมะปรางได้แล้ว" ไม่ใช่แค่ "ได้ช่องที่ 23"
 *
 * กฎที่ห้ามแก้
 * · หน้าตาคำนวณจากลำดับช่องอย่างเดียว (ไม่มีการสุ่ม) ชุดพิมพ์กับเกมบนเว็บจึงเป็นคนเดียวกัน
 * · ทรงผมกับของประจำตัวไม่ซ้ำกันทั้ง 50 คน (ชุดทดสอบตรวจ)
 * · ซอมบี้ยังน่ารักแบบเดียวกับตัวอื่นในเกม ตาปรือ แก้มชมพู ไม่มีเลือด
 *
 * ภาพทุกภาพอยู่ใน viewBox 0 0 24 24 ศีรษะอยู่ตรงกลาง มีที่ว่างด้านบนให้หูกระต่าย โบว์ และจุกผม
 */

import { TABLES } from './questions'

export const VILLAGER_VIEWBOX = '0 0 24 24'
export const VILLAGER_COUNT = TABLES.length * 10

const INK = '#23324A'
const O = 'stroke="' + INK + '" stroke-linejoin="round"'
const BLUSH = '#FF9DB0'
const ZSKIN = '#A9DB8C'

export const VILLAGER_NAMES = [
  'ส้มโอ', 'ข้าวปั้น', 'ปุยฝ้าย', 'มะปราง', 'โดนัท', 'ขนมปัง', 'น้ำหวาน', 'ใบเตย', 'ถั่วแระ', 'ลูกชุบ',
  'ทองหยอด', 'มะลิ', 'ฟ้าใส', 'ต้นกล้า', 'พุดดิ้ง', 'คุกกี้', 'มะนาว', 'เจลลี่', 'บัวลอย', 'ส้มจี๊ด',
  'ลำไย', 'มังคุด', 'ขนุน', 'ชมพู่', 'น้ำผึ้ง', 'กล้วยหอม', 'พีช', 'เต้าหู้', 'ข้าวหอม', 'ข้าวโพด',
  'มะพร้าว', 'แพนเค้ก', 'วาฟเฟิล', 'ขนมครก', 'ตะโก้', 'ฝอยทอง', 'สายไหม', 'ดาว', 'ครีม', 'นมสด',
  'โมจิ', 'ปิ่นโต', 'ไอติม', 'เผือก', 'มันม่วง', 'ซาลาเปา', 'เมฆ', 'น้ำตาล', 'ถั่วเขียว', 'แตงโม',
]

const STYLES = ['bob', 'spiky', 'pigtails', 'bun', 'curly', 'long', 'tuft'] as const
const ACCESSORIES = ['bow', 'cap', 'flower', 'glasses', 'bunny', 'headband', 'plaster', 'cat', 'sprout', 'star', 'beanie', 'none'] as const
const EYES = ['dot', 'happy', 'sparkle', 'wink'] as const
const MOUTHS = ['smile', 'open', 'cat'] as const
const SKINS = ['#FFD9B8', '#F6C9A0', '#E9B48A', '#D29A6E']
const HAIRS = ['#3A2A20', '#6B3F23', '#1F1B2E', '#A0522D', '#E0B04A', '#8C5A3C', '#E77BA0', '#6A8BE0']
const ACCENTS = ['#FF7FA8', '#FFB020', '#5CC8E8', '#9B7BEA', '#7ED957', '#FF8A5C']

export type HairStyle = (typeof STYLES)[number]
export type Accessory = (typeof ACCESSORIES)[number]

export interface Villager {
  index: number
  name: string
  style: HairStyle
  accessory: Accessory
  eyes: (typeof EYES)[number]
  mouth: (typeof MOUTHS)[number]
  skin: string
  hair: string
  accent: string
}

/**
 * ชาวเมืองคนที่ index (0–49) ลำดับเดียวกับช่องในสมุด: แม่ 2 ครบ 10 ช่อง แล้วแม่ 3 …
 * ทรงผมใช้ index mod 7 ของประจำตัวใช้ (5·index + 3) mod 12 ตัวคูณ 5 ไม่มีตัวประกอบร่วมกับ 12
 * คู่ (ทรงผม, ของประจำตัว) จึงวนซ้ำทุก 84 คน ไม่ซ้ำกันภายใน 50 คน
 */
export function villagerAt(index: number): Villager {
  const i = ((Math.floor(index) % VILLAGER_COUNT) + VILLAGER_COUNT) % VILLAGER_COUNT
  return {
    index: i,
    name: VILLAGER_NAMES[i],
    style: STYLES[i % STYLES.length],
    accessory: ACCESSORIES[(i * 5 + 3) % ACCESSORIES.length],
    eyes: EYES[(i * 3 + 1) % EYES.length],
    mouth: MOUTHS[(i * 2 + Math.floor(i / 5)) % MOUTHS.length],
    skin: SKINS[(i * 7 + 2) % SKINS.length],
    hair: HAIRS[(i * 3 + Math.floor(i / 7)) % HAIRS.length],
    accent: ACCENTS[(i * 5 + Math.floor(i / 6)) % ACCENTS.length],
  }
}

/** ลำดับช่องในสมุดของข้อ groups × each */
export function villagerIndexOf(each: number, groups: number): number {
  const t = (TABLES as number[]).indexOf(each)
  return Math.max(0, t) * 10 + Math.min(10, Math.max(1, groups)) - 1
}

export const villagerFor = (each: number, groups: number): Villager => villagerAt(villagerIndexOf(each, groups))

/* ── ชิ้นส่วนภาพ ─────────────────────────────────────────── */

const CX = 12
const CY = 13.2
const R = 8.2
const FRINGE = 'M4.1 12.2 Q3.9 4.5 12 4.5 Q20.1 4.5 19.9 12.2 Q17 8.6 12 9 Q7 8.6 4.1 12.2 Z'

/** ผมและของที่อยู่หลังศีรษะ */
function backLayer(v: Villager, hair: string): string {
  let s = ''
  if (v.accessory === 'bunny') {
    for (const x of [8.4, 15.6]) {
      s += '<ellipse cx="' + x + '" cy="4.3" rx="1.8" ry="3.6" fill="#fff" ' + O + ' stroke-width=".8"/>'
      s += '<ellipse cx="' + x + '" cy="4.5" rx=".8" ry="2.4" fill="#FFB8CB"/>'
    }
  }
  if (v.accessory === 'cat') {
    s += '<path d="M4.6 9.4 L5.2 2.8 L10 6.2 Z" fill="' + hair + '" ' + O + ' stroke-width=".8"/><path d="M5.8 7.4 L6.1 4.6 L8.2 6.1 Z" fill="#FFB8CB"/>'
    s += '<path d="M19.4 9.4 L18.8 2.8 L14 6.2 Z" fill="' + hair + '" ' + O + ' stroke-width=".8"/><path d="M18.2 7.4 L17.9 4.6 L15.8 6.1 Z" fill="#FFB8CB"/>'
  }
  if (v.style === 'bob') s += '<rect x="3.2" y="8" width="17.6" height="11.4" rx="4.4" fill="' + hair + '" ' + O + ' stroke-width=".8"/>'
  if (v.style === 'long') s += '<path d="M3.5 13 Q2.9 3.7 12 3.7 Q21.1 3.7 20.5 13 L21.2 21.4 Q18.6 22.6 17.2 20.6 L6.8 20.6 Q5.4 22.6 2.8 21.4 Z" fill="' + hair + '" ' + O + ' stroke-width=".8"/>'
  if (v.style === 'bun') s += '<circle cx="12" cy="3.9" r="3.1" fill="' + hair + '" ' + O + ' stroke-width=".8"/>'
  if (v.style === 'pigtails') {
    for (const x of [3.3, 20.7]) s += '<circle cx="' + x + '" cy="14" r="2.9" fill="' + hair + '" ' + O + ' stroke-width=".8"/>'
    s += '<circle cx="5.1" cy="12.1" r=".9" fill="' + v.accent + '"/><circle cx="18.9" cy="12.1" r=".9" fill="' + v.accent + '"/>'
  }
  return s
}

/** ผมด้านหน้า */
function frontHair(v: Villager, hair: string): string {
  switch (v.style) {
    case 'spiky':
      return (
        '<path d="M4.2 11.4 Q4 4.8 12 4.8 Q20 4.8 19.8 11.4 Q17.2 8.2 14.6 8.9 L13 6.9 L11.4 8.7 L9.4 7.1 L8.5 9.1 Q6 8.7 4.2 11.4 Z" fill="' + hair + '" ' + O + ' stroke-width=".7"/>' +
        '<path d="M11 5 Q11.8 1.8 14.2 3 Q12.6 3.6 12.8 5 Z" fill="' + hair + '" ' + O + ' stroke-width=".6"/>'
      )
    case 'curly':
      return [[5.3, 9.8, 2.5], [7.8, 6.7, 2.7], [12, 5.3, 3], [16.2, 6.7, 2.7], [18.7, 9.8, 2.5]]
        .map(([x, y, r]) => '<circle cx="' + x + '" cy="' + y + '" r="' + r + '" fill="' + hair + '" ' + O + ' stroke-width=".7"/>')
        .join('')
    case 'long':
      return '<path d="M4.1 12.2 Q4.3 4.5 12 4.5 Q19.9 4.5 19.9 12.2 Q18.7 8 15 7.6 Q10 9.9 4.1 12.2 Z" fill="' + hair + '" ' + O + ' stroke-width=".7"/>'
    case 'tuft':
      return '<path d="M11.4 5.3 Q10.2 1.6 13.4 2.2 Q11.9 3.1 12.9 5.1" fill="none" stroke="' + hair + '" stroke-width="1.5" stroke-linecap="round"/>'
    default:
      return '<path d="' + FRINGE + '" fill="' + hair + '" ' + O + ' stroke-width=".7"/>'
  }
}

/** ของประจำตัวที่อยู่หน้าผม (โบว์ ดอกไม้ หมวก ฯลฯ) */
function accessoryLayer(v: Villager): string {
  const a = v.accent
  switch (v.accessory) {
    case 'bow':
      return (
        '<path d="M16.6 5.6 L13.6 3.4 L13.8 7.8 Z M16.6 5.6 L19.6 3.4 L19.4 7.8 Z" fill="' + a + '" ' + O + ' stroke-width=".7"/>' +
        '<circle cx="16.6" cy="5.6" r="1.1" fill="' + a + '" ' + O + ' stroke-width=".7"/>'
      )
    case 'flower': {
      let s = ''
      for (let k = 0; k < 5; k += 1) {
        const ang = (k * 72 - 90) * (Math.PI / 180)
        s += '<circle cx="' + (6.6 + Math.cos(ang) * 1.5).toFixed(2) + '" cy="' + (6.4 + Math.sin(ang) * 1.5).toFixed(2) + '" r="1.25" fill="' + a + '" ' + O + ' stroke-width=".5"/>'
      }
      return s + '<circle cx="6.6" cy="6.4" r=".9" fill="#FFE27A"/>'
    }
    case 'cap':
      return (
        '<path d="M3.9 10.6 Q3.9 3.4 12 3.4 Q20.1 3.4 20.1 10.6 Z" fill="' + a + '" ' + O + ' stroke-width=".8"/>' +
        '<path d="M12 10 Q19.2 9.3 23 10.9 Q18.8 12 12 11.3 Z" fill="' + a + '" ' + O + ' stroke-width=".8"/><circle cx="12" cy="3.6" r=".8" fill="' + a + '" ' + O + ' stroke-width=".5"/>'
      )
    case 'beanie':
      return (
        '<path d="M4.1 10.2 Q3.9 3.6 12 3.4 Q20.1 3.6 19.9 10.2 Z" fill="' + a + '" ' + O + ' stroke-width=".8"/>' +
        '<rect x="3.6" y="8.6" width="16.8" height="2.6" rx="1.2" fill="#fff" ' + O + ' stroke-width=".7"/>' +
        '<circle cx="12" cy="2.8" r="1.7" fill="#fff" ' + O + ' stroke-width=".7"/>'
      )
    case 'headband':
      return '<path d="M4.4 10 Q12 3.4 19.6 10" fill="none" stroke="' + a + '" stroke-width="1.7" stroke-linecap="round"/><circle cx="12" cy="6.3" r="1" fill="#fff"/>'
    case 'sprout':
      return (
        '<path d="M12 5 V2.4" stroke="#4E9A3E" stroke-width=".9" stroke-linecap="round"/>' +
        '<path d="M12 3 Q9.4 1 8.6 3.2 Q10.4 4.2 12 3 Z M12 2.6 Q14.4 .4 15.4 2.6 Q13.6 3.8 12 2.6 Z" fill="#7ED957" ' + O + ' stroke-width=".5"/>'
      )
    case 'star':
      return '<path d="M17 3.6 L17.8 5.5 L19.8 5.6 L18.3 6.9 L18.8 8.9 L17 7.8 L15.2 8.9 L15.7 6.9 L14.2 5.6 L16.2 5.5 Z" fill="#FFD233" ' + O + ' stroke-width=".6"/>'
    default:
      return ''
  }
}

function cheeks(): string {
  return '<ellipse cx="6.3" cy="15.9" rx="1.6" ry=".95" fill="' + BLUSH + '" opacity=".9"/><ellipse cx="17.7" cy="15.9" rx="1.6" ry=".95" fill="' + BLUSH + '" opacity=".9"/>'
}

function eyes(v: Villager): string {
  const L = 8.6
  const Rx = 15.4
  const y = 13.1
  const dot = (x: number, big = false) =>
    '<ellipse cx="' + x + '" cy="' + y + '" rx="' + (big ? 1.45 : 1.1) + '" ry="' + (big ? 1.75 : 1.4) + '" fill="' + INK + '"/>' +
    '<circle cx="' + (x + 0.45) + '" cy="' + (y - 0.55) + '" r="' + (big ? 0.55 : 0.4) + '" fill="#fff"/>' +
    (big ? '<circle cx="' + (x - 0.5) + '" cy="' + (y + 0.6) + '" r=".3" fill="#fff"/>' : '')
  const arc = (x: number) => '<path d="M' + (x - 1.3) + ' ' + (y + 0.5) + ' Q' + x + ' ' + (y - 1.3) + ' ' + (x + 1.3) + ' ' + (y + 0.5) + '" fill="none" stroke="' + INK + '" stroke-width="1" stroke-linecap="round"/>'
  if (v.eyes === 'happy') return arc(L) + arc(Rx)
  if (v.eyes === 'sparkle') return dot(L, true) + dot(Rx, true)
  if (v.eyes === 'wink') return dot(L) + arc(Rx)
  return dot(L) + dot(Rx)
}

function mouth(v: Villager): string {
  if (v.mouth === 'open') {
    return '<path d="M10.5 16.1 Q12 18.9 13.5 16.1 Z" fill="#8A3B4A" ' + O + ' stroke-width=".6"/><ellipse cx="12" cy="17.4" rx=".75" ry=".45" fill="#FF8FA8"/>'
  }
  if (v.mouth === 'cat') {
    return '<path d="M10.3 16.2 Q11.15 17.3 12 16.2 Q12.85 17.3 13.7 16.2" fill="none" stroke="' + INK + '" stroke-width=".9" stroke-linecap="round"/>'
  }
  return '<path d="M10.5 16.2 Q12 17.7 13.5 16.2" fill="none" stroke="' + INK + '" stroke-width=".95" stroke-linecap="round"/>'
}

/** หน้าซอมบี้งัวเงีย: ตาปรือ ปากกลมเล็ก ฟันซี่เดียว */
function zombieFace(): string {
  let s = ''
  for (const x of [8.6, 15.4]) {
    s += '<path d="M' + (x - 1.5) + ' 13 Q' + x + ' 14.3 ' + (x + 1.5) + ' 13" fill="none" stroke="' + INK + '" stroke-width="1" stroke-linecap="round"/>'
    s += '<path d="M' + (x - 1.4) + ' 12 L' + (x + 1.4) + ' 12.4" stroke="#6FA65A" stroke-width=".7" stroke-linecap="round"/>'
  }
  s += '<ellipse cx="12" cy="17" rx="1.5" ry="1.15" fill="#5A3D4A"/><rect x="11.45" y="15.9" width="1.1" height=".9" rx=".2" fill="#fff"/>'
  return s
}

/** ชาวเมืองที่หายป่วยแล้ว */
export function villagerInner(v: Villager): string {
  let s = backLayer(v, v.hair)
  s += '<circle cx="' + CX + '" cy="' + CY + '" r="' + R + '" fill="' + v.skin + '" ' + O + ' stroke-width="1"/>'
  s += frontHair(v, v.hair) + accessoryLayer(v) + cheeks() + eyes(v) + mouth(v)
  if (v.accessory === 'glasses') {
    s += '<circle cx="8.6" cy="13.1" r="2.4" fill="#DFF6FF" fill-opacity=".3" ' + O + ' stroke-width=".75"/><circle cx="15.4" cy="13.1" r="2.4" fill="#DFF6FF" fill-opacity=".3" ' + O + ' stroke-width=".75"/>'
    s += '<path d="M11 12.9 Q12 12.2 13 12.9" fill="none" stroke="' + INK + '" stroke-width=".75"/>'
  }
  // พลาสเตอร์ตรงแก้ม: รอยฉีดวัคซีนของคนที่เพิ่งหายป่วย
  if (v.accessory === 'plaster') s += '<g transform="rotate(-24 17.6 15.4)"><rect x="15.6" y="14.6" width="4" height="1.7" rx=".8" fill="#FFD7A8" ' + O + ' stroke-width=".5"/><rect x="17.1" y="14.6" width="1" height="1.7" fill="#F2B880"/></g>'
  return s
}

/** ชาวเมืองคนเดียวกันตอนยังเป็นซอมบี้ (ผมและของประจำตัวยังอยู่ครบ) */
export function villagerZombieInner(v: Villager): string {
  let s = backLayer(v, v.hair)
  s += '<circle cx="' + CX + '" cy="' + CY + '" r="' + R + '" fill="' + ZSKIN + '" ' + O + ' stroke-width="1"/>'
  s += frontHair(v, v.hair) + accessoryLayer(v) + cheeks() + zombieFace()
  if (v.accessory === 'glasses') {
    s += '<circle cx="8.6" cy="13.1" r="2.4" fill="#DFF6FF" fill-opacity=".3" ' + O + ' stroke-width=".75"/><circle cx="15.4" cy="13.1" r="2.4" fill="#DFF6FF" fill-opacity=".3" ' + O + ' stroke-width=".75"/>'
    s += '<path d="M11 12.9 Q12 12.2 13 12.9" fill="none" stroke="' + INK + '" stroke-width=".75"/>'
  }
  return s
}

/** คำขอบคุณของชาวเมืองที่หายป่วย (เลือกตามลำดับช่อง ไม่สุ่ม) */
const THANKS = ['ขอบคุณที่ช่วยนะ!', 'หายป่วยแล้ว เย้!', 'รู้สึกสดชื่นจัง~', 'ขอบคุณหมอตัวน้อย!', 'กลับมาเล่นได้แล้ว!', 'หัวไม่ตื้อแล้วล่ะ!']
export const thanksOf = (v: Villager): string => THANKS[v.index % THANKS.length]
