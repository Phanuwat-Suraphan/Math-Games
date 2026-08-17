import type { Avatar } from '../types/player'

/**
 * ตัวละครที่เลือกได้
 *
 * ราคาตั้งจากสิ่งที่ซื้อจริง ๆ คือ "สกิลวิเศษ" ในสนามรบตัวเลข
 * ไม่ใช่จากรูปที่ต่างกัน ตัวละครแต่ละตัวเล่นไม่เหมือนกันจริง
 * (ดู src/survivor/ultimates.ts) การซื้อจึงเป็นการเปิดวิธีเล่นใหม่
 *
 * ตัวที่สกิลเปลี่ยนเกมมากที่สุดตั้งราคาแพงที่สุด
 * หยุดเวลากับโล่พลังงานทำให้รอดจากการโดนรุมได้ตรง ๆ จึงแพงกว่าตัวอื่น
 *
 * ราคาเทียบกับรายได้จริง: เล่นสนามรบสามนาทีได้ราว 150–250 เหรียญ
 * ตัวที่สองจึงซื้อได้ในสองสามรอบ ส่วนตัวสุดท้ายเป็นเป้าหมายระยะยาว
 * ตั้งใจไม่ให้ซื้อได้หมดในวันเดียว แต่ก็ต้องไม่ไกลจนเลิกหวัง
 */
export const AVATARS: Avatar[] = [
  {
    id: 'warrior',
    name: 'นักรบ',
    emoji: '🛡️',
    description: 'กล้าหาญ ไม่ยอมแพ้โจทย์ยาก',
    accent: 'ember',
    price: 0,
  },
  {
    id: 'mage',
    name: 'นักเวท',
    emoji: '🔮',
    description: 'คิดเลขในใจได้รวดเร็ว',
    accent: 'arcane',
    price: 0,
  },
  {
    id: 'explorer',
    name: 'นักสำรวจ',
    emoji: '🧭',
    description: 'ชอบค้นหาเส้นทางใหม่ ๆ',
    accent: 'leaf',
    price: 400,
  },
  {
    id: 'inventor',
    name: 'นักประดิษฐ์',
    emoji: '⚙️',
    description: 'สร้างวิธีลัดในการคำนวณ',
    accent: 'gold',
    price: 900,
    requiredLevel: 5,
  },
  {
    id: 'scientist',
    name: 'นักวิทยาศาสตร์',
    emoji: '🔬',
    description: 'ชอบทดลองและตรวจสอบคำตอบ',
    accent: 'sky',
    price: 1400,
    requiredLevel: 8,
  },
  {
    id: 'adventurer',
    name: 'นักผจญภัย',
    emoji: '🎒',
    description: 'พร้อมออกเดินทางทุกเมื่อ',
    accent: 'rose',
    price: 250,
  },

  /*
   * สี่ตัวล่างนี้เพิ่มทีหลัง เพื่อให้มีวิธีเล่นให้ลองมากขึ้น
   *
   * ราคาไล่จากถูกไปแพงตามว่าสกิลเปลี่ยนเกมมากแค่ไหน เหมือนกลุ่มเดิม
   * และเว้นช่วงราคาไว้ระหว่างตัวเดิมกับตัวใหม่ ไม่ให้มีสองตัวราคาเท่ากัน
   * เพราะเวลาเด็กเก็บเงินได้ก้อนหนึ่ง ควรมีเป้าหมายถัดไปที่ชัดเจนตัวเดียว
   * ไม่ใช่ต้องมานั่งเลือกระหว่างสองตัวที่ราคาเท่ากันโดยไม่มีข้อมูลพอ
   */
  {
    id: 'athlete',
    name: 'นักกีฬา',
    emoji: '🏅',
    description: 'ว่องไวและไม่ยอมหยุดกลางคัน',
    accent: 'rose',
    price: 550,
  },
  {
    id: 'musician',
    name: 'นักดนตรี',
    emoji: '🎵',
    description: 'จับจังหวะของตัวเลขได้แม่นยำ',
    accent: 'sky',
    price: 750,
    requiredLevel: 4,
  },
  {
    id: 'healer',
    name: 'หมอยา',
    emoji: '🌿',
    description: 'ดูแลเพื่อนร่วมทางให้ไปต่อได้เสมอ',
    accent: 'leaf',
    price: 1100,
    requiredLevel: 6,
  },
  {
    id: 'astronomer',
    name: 'นักดาราศาสตร์',
    emoji: '🔭',
    description: 'มองเห็นแบบแผนที่คนอื่นมองไม่เห็น',
    accent: 'arcane',
    price: 1800,
    requiredLevel: 10,
  },
]

export const DEFAULT_AVATAR_ID = 'warrior'

/**
 * ตัวละครที่เลือกได้ตั้งแต่ยังไม่มีเหรียญเลย
 *
 * ต้องมีมากกว่าหนึ่งตัว เพราะหน้าสร้างผู้เล่นคือที่แรกที่เด็กได้เลือกอะไรเอง
 * ถ้าเหลือให้เลือกตัวเดียว มันไม่ใช่การเลือก และเสียโอกาสแรกที่จะรู้สึกเป็นเจ้าของ
 */
export const STARTER_AVATAR_IDS = AVATARS.filter((avatar) => avatar.price === 0).map(
  (avatar) => avatar.id,
)

export function isStarterAvatar(avatarId: string): boolean {
  return STARTER_AVATAR_IDS.includes(avatarId)
}

export function getAvatar(avatarId: string): Avatar {
  return AVATARS.find((avatar) => avatar.id === avatarId) ?? AVATARS[0]
}

export function isValidAvatarId(avatarId: string): boolean {
  return AVATARS.some((avatar) => avatar.id === avatarId)
}
