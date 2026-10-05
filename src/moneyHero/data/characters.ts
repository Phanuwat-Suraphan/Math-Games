import type { NpcId, Skill } from '../engine/types'

/**
 * ตัวละครในเมืองเงินทอง
 *
 * รูปจริงวางไว้ที่ public/money-hero/characters/<id>.png
 * ถ้ายังไม่มีไฟล์ เกมจะแสดงอีโมจิในวงกลมแทนอัตโนมัติ
 */
export interface Character {
  id: NpcId
  name: string
  role: string
  emoji: string
  image: string
  /** สีพื้นหลังวงกลมเมื่อยังไม่มีรูป */
  tint: string
  /** ประโยคทักทายสั้น ๆ */
  greet: string
}

export const CHARACTERS: Record<NpcId, Character> = {
  hero: {
    id: 'hero',
    name: 'MONEY HERO',
    role: 'ฮีโร่แห่งเมืองเงินทอง',
    emoji: '🦸',
    image: 'characters/hero.png',
    tint: '#4f8cff',
    greet: 'ไปช่วยเมืองเงินทองกันเถอะ!',
  },
  rabbit: {
    id: 'rabbit',
    name: 'กระต่ายนับเงิน',
    role: 'นักนับเงินมือไว',
    emoji: '🐰',
    image: 'characters/rabbit.png',
    tint: '#ffb3c7',
    greet: 'มานับเงินด้วยกันนะ!',
  },
  fox: {
    id: 'fox',
    name: 'จิ้งจอกนักคิด',
    role: 'นักแก้โจทย์ปัญหา',
    emoji: '🦊',
    image: 'characters/fox.png',
    tint: '#ffb066',
    greet: 'อ่านโจทย์ให้ดี แล้วค่อยคิดนะ',
  },
  bear: {
    id: 'bear',
    name: 'หมีเจ้าของร้าน',
    role: 'เจ้าของร้านค้าใจดี',
    emoji: '🐻',
    image: 'characters/bear.png',
    tint: '#c99b6d',
    greet: 'ยินดีต้อนรับสู่ร้านของลุงหมี!',
  },
  owl: {
    id: 'owl',
    name: 'นกฮูกนักบัญชี',
    role: 'ผู้ดูแลสมุดบัญชี',
    emoji: '🦉',
    image: 'characters/owl.png',
    tint: '#8fb3e8',
    greet: 'จดทุกบาท รู้ทุกสตางค์',
  },
}

export interface Avatar {
  id: string
  name: string
  emoji: string
  /** ตัวที่ใช้รูป MONEY HERO เดินบนแผนที่ */
  image?: string
}

export const AVATARS: Avatar[] = [
  { id: 'hero', name: 'ฮีโร่การเงิน', emoji: '🦸', image: 'characters/hero.png' },
  { id: 'adventurer', name: 'นักผจญภัย', emoji: '🧒' },
  { id: 'calculator', name: 'นักคำนวณ', emoji: '👧' },
  { id: 'wizard', name: 'นักเวทเงินทอง', emoji: '🧙' },
]

export function avatarById(id: string): Avatar {
  return AVATARS.find((a) => a.id === id) ?? AVATARS[0]
}

/** ชื่อทักษะภาษาไทยสำหรับแผงสถิติ */
export const SKILL_NAMES: Record<Skill, string> = {
  notes: 'ธนบัตรและเหรียญ',
  count: 'การบอกจำนวนเงิน',
  dot: 'การเขียนแบบจุด',
  compare: 'การเปรียบเทียบ',
  exchange: 'การแลกเงิน',
  addsub: 'บวก–ลบ',
  muldiv: 'คูณ–หาร',
  word: 'โจทย์ปัญหา',
  ledger: 'รายรับรายจ่าย',
}

export const SKILL_ICONS: Record<Skill, string> = {
  notes: '🪙',
  count: '🔢',
  dot: '✏️',
  compare: '⚖️',
  exchange: '🔄',
  addsub: '➕',
  muldiv: '✖️',
  word: '🧩',
  ledger: '📒',
}

export const SKILLS: Skill[] = [
  'notes',
  'count',
  'dot',
  'compare',
  'exchange',
  'addsub',
  'muldiv',
  'word',
  'ledger',
]

/** คำให้กำลังใจเมื่อตอบผิด ไม่ตำหนิ */
export const ENCOURAGE = [
  'ใกล้แล้ว! ลองคิดอีกครั้งนะ',
  'เก่งมากที่ลองคิดเอง',
  'มาดูวิธีคิดอีกครั้งกัน',
  'ไม่เป็นไร ทุกฮีโร่เคยพลาด',
  'ค่อย ๆ คิดทีละขั้นนะ',
]

export const PRAISE = [
  'เก่งมาก!',
  'ถูกต้อง! ยอดเยี่ยม',
  'สุดยอดฮีโร่!',
  'ใช่เลย!',
  'เยี่ยมไปเลย!',
  'คิดได้ถูกต้อง!',
]
