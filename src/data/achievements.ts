import type { Player } from '../types/player'

export interface Achievement {
  id: string
  name: string
  description: string
  emoji: string
  /** เงื่อนไขคำนวณจากข้อมูลผู้เล่นจริง ไม่ได้ hard-code สถานะไว้ */
  isUnlocked: (player: Player) => boolean
  getProgressText: (player: Player) => string
}

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first-step',
    name: 'ก้าวแรกของนักผจญภัย',
    description: 'ผ่านด่านแรกได้สำเร็จ',
    emoji: '👣',
    isUnlocked: (player) => player.completedLevels.length >= 1,
    getProgressText: (player) =>
      `${Math.min(player.completedLevels.length, 1)} / 1 ด่าน`,
  },
  {
    id: 'level-3',
    name: 'นักเรียนขยัน',
    description: 'ไปถึงเลเวล 3',
    emoji: '📚',
    isUnlocked: (player) => player.level >= 3,
    getProgressText: (player) => `เลเวล ${Math.min(player.level, 3)} / 3`,
  },
  {
    id: 'level-5',
    name: 'ผู้กล้าแห่งตัวเลข',
    description: 'ไปถึงเลเวล 5',
    emoji: '🗡️',
    isUnlocked: (player) => player.level >= 5,
    getProgressText: (player) => `เลเวล ${Math.min(player.level, 5)} / 5`,
  },
  {
    id: 'coin-300',
    name: 'นักสะสมเหรียญ',
    description: 'มีเหรียญสะสม 300 เหรียญ',
    emoji: '💰',
    isUnlocked: (player) => player.coins >= 300,
    getProgressText: (player) => `${Math.min(player.coins, 300)} / 300 เหรียญ`,
  },
  {
    id: 'world-1-clear',
    name: 'ผู้พิชิตป่าจำนวน',
    description: 'ผ่านครบทั้ง 5 ด่านของ World 1',
    emoji: '🌳',
    isUnlocked: (player) =>
      player.completedLevels.filter((id) => id.startsWith('world-1-')).length >= 5,
    getProgressText: (player) =>
      `${Math.min(
        player.completedLevels.filter((id) => id.startsWith('world-1-')).length,
        5,
      )} / 5 ด่าน`,
  },
  {
    id: 'boss-slayer',
    name: 'นักล่ามินิบอส',
    description: 'เอาชนะยักษ์เฝ้าป่าได้สำเร็จ',
    emoji: '👹',
    isUnlocked: (player) => player.completedLevels.includes('world-1-level-5'),
    getProgressText: (player) =>
      player.completedLevels.includes('world-1-level-5')
        ? 'ชนะแล้ว'
        : 'ยังไม่ได้เอาชนะ',
  },
]
