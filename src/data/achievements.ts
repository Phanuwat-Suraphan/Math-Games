import type { Player } from '../types/player'
import { getTotalStars } from '../utils/stageSystem'
import { calculateAccuracy } from '../utils/statistics'

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
    isUnlocked: (player) => player.completedStages.length >= 1,
    getProgressText: (player) =>
      `${Math.min(player.completedStages.length, 1)} / 1 ด่าน`,
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
    description: 'ผ่านครบทั้ง 10 ด่านของ World 1',
    emoji: '🌳',
    isUnlocked: (player) =>
      player.completedStages.filter((id) => id.startsWith('world-1-')).length >= 10,
    getProgressText: (player) =>
      `${Math.min(
        player.completedStages.filter((id) => id.startsWith('world-1-')).length,
        10,
      )} / 10 ด่าน`,
  },
  {
    id: 'boss-slayer',
    name: 'นักล่ามินิบอส',
    description: 'เอาชนะผู้พิทักษ์จำนวนได้สำเร็จ',
    emoji: '👹',
    isUnlocked: (player) => player.completedStages.includes('world-1-stage-10'),
    getProgressText: (player) =>
      player.completedStages.includes('world-1-stage-10')
        ? 'ชนะแล้ว'
        : 'ยังไม่ได้เอาชนะ',
  },
  {
    id: 'star-collector',
    name: 'นักสะสมดาว',
    description: 'สะสมดาวจากด่านต่าง ๆ ให้ได้ 15 ดวง',
    emoji: '⭐',
    isUnlocked: (player) => getTotalStars(player) >= 15,
    getProgressText: (player) => `${Math.min(getTotalStars(player), 15)} / 15 ดาว`,
  },
  {
    id: 'first-mastered',
    name: 'ความเชี่ยวชาญครั้งแรก',
    description: 'ทำด่านใดก็ได้จนได้ครบ 3 ดาว',
    emoji: '🏆',
    isUnlocked: (player) =>
      Object.values(player.stageProgress).some((progress) => progress.mastered),
    getProgressText: (player) => {
      const mastered = Object.values(player.stageProgress).filter(
        (progress) => progress.mastered,
      ).length
      return mastered > 0 ? `เชี่ยวชาญแล้ว ${mastered} ด่าน` : 'ยังไม่มีด่านที่ได้ 3 ดาว'
    },
  },
  {
    id: 'streak-5',
    name: 'ไฟกำลังลุก',
    description: 'ตอบถูกติดต่อกัน 5 ข้อ',
    emoji: '🔥',
    isUnlocked: (player) => player.bestStreak >= 5,
    getProgressText: (player) => `${Math.min(player.bestStreak, 5)} / 5 ข้อ`,
  },
  {
    id: 'streak-10',
    name: 'สายฟ้าคณิตศาสตร์',
    description: 'ตอบถูกติดต่อกัน 10 ข้อ',
    emoji: '⚡',
    isUnlocked: (player) => player.bestStreak >= 10,
    getProgressText: (player) => `${Math.min(player.bestStreak, 10)} / 10 ข้อ`,
  },
  {
    id: 'questions-50',
    name: 'นักฝึกฝนตัวยง',
    description: 'ทำโจทย์ครบ 50 ข้อ',
    emoji: '📝',
    isUnlocked: (player) => player.totalQuestions >= 50,
    getProgressText: (player) =>
      `${Math.min(player.totalQuestions, 50)} / 50 ข้อ`,
  },
  {
    id: 'sharp-shooter',
    name: 'แม่นยำเป็นเลิศ',
    description: 'ความแม่นยำ 80% ขึ้นไป หลังทำครบ 20 ข้อ',
    emoji: '🎯',
    isUnlocked: (player) =>
      player.totalQuestions >= 20 &&
      calculateAccuracy(player.correctAnswers, player.totalQuestions) >= 80,
    getProgressText: (player) =>
      player.totalQuestions < 20
        ? `ทำโจทย์อีก ${20 - player.totalQuestions} ข้อ`
        : `ความแม่นยำตอนนี้ ${calculateAccuracy(
            player.correctAnswers,
            player.totalQuestions,
          )}%`,
  },
]
