import type { Avatar } from '../types/player'

export const AVATARS: Avatar[] = [
  {
    id: 'warrior',
    name: 'นักรบ',
    emoji: '🛡️',
    description: 'กล้าหาญ ไม่ยอมแพ้โจทย์ยาก',
    accent: 'ember',
  },
  {
    id: 'mage',
    name: 'นักเวท',
    emoji: '🔮',
    description: 'คิดเลขในใจได้รวดเร็ว',
    accent: 'arcane',
  },
  {
    id: 'explorer',
    name: 'นักสำรวจ',
    emoji: '🧭',
    description: 'ชอบค้นหาเส้นทางใหม่ ๆ',
    accent: 'leaf',
  },
  {
    id: 'inventor',
    name: 'นักประดิษฐ์',
    emoji: '⚙️',
    description: 'สร้างวิธีลัดในการคำนวณ',
    accent: 'gold',
  },
  {
    id: 'scientist',
    name: 'นักวิทยาศาสตร์',
    emoji: '🔬',
    description: 'ชอบทดลองและตรวจสอบคำตอบ',
    accent: 'sky',
  },
  {
    id: 'adventurer',
    name: 'นักผจญภัย',
    emoji: '🎒',
    description: 'พร้อมออกเดินทางทุกเมื่อ',
    accent: 'rose',
  },
]

export const DEFAULT_AVATAR_ID = 'warrior'

export function getAvatar(avatarId: string): Avatar {
  return AVATARS.find((avatar) => avatar.id === avatarId) ?? AVATARS[0]
}

export function isValidAvatarId(avatarId: string): boolean {
  return AVATARS.some((avatar) => avatar.id === avatarId)
}
