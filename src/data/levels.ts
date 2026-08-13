import type { Level } from '../types/level'

export const LEVELS: Level[] = [
  {
    id: 'world-1-level-1',
    worldId: 'world-1',
    order: 1,
    name: 'หมู่บ้านตัวเลข',
    description: 'ชาวบ้านต้องการความช่วยเหลือเรื่องการบวกเลข',
    emoji: '🏡',
    difficulty: 'easy',
    questionCount: 5,
    operations: ['add'],
    maxOperand: 200,
    reward: { exp: 50, coins: 20 },
    isBoss: false,
  },
  {
    id: 'world-1-level-2',
    worldId: 'world-1',
    order: 2,
    name: 'สะพานการคำนวณ',
    description: 'ข้ามสะพานด้วยการบวกและลบให้ถูกต้อง',
    emoji: '🌉',
    difficulty: 'easy',
    questionCount: 5,
    operations: ['add', 'subtract'],
    maxOperand: 300,
    reward: { exp: 60, coins: 25 },
    isBoss: false,
  },
  {
    id: 'world-1-level-3',
    worldId: 'world-1',
    order: 3,
    name: 'ป่าลึกลับ',
    description: 'ในป่ามีต้นไม้เรียงเป็นแถว ลองคูณดูสิ',
    emoji: '🌲',
    difficulty: 'normal',
    questionCount: 5,
    operations: ['multiply'],
    maxOperand: 12,
    reward: { exp: 70, coins: 30 },
    isBoss: false,
  },
  {
    id: 'world-1-level-4',
    worldId: 'world-1',
    order: 4,
    name: 'หอคอยตัวเลข',
    description: 'แบ่งสมบัติในหอคอยให้เท่ากันด้วยการหาร',
    emoji: '🗼',
    difficulty: 'normal',
    questionCount: 5,
    operations: ['multiply', 'divide'],
    maxOperand: 12,
    reward: { exp: 80, coins: 35 },
    isBoss: false,
  },
  {
    id: 'world-1-level-5',
    worldId: 'world-1',
    order: 5,
    name: 'มินิบอส: ยักษ์เฝ้าป่า',
    description: 'รวมทุกวิธีคิดที่เรียนมา เพื่อเอาชนะยักษ์เฝ้าป่า',
    emoji: '👹',
    difficulty: 'boss',
    questionCount: 5,
    operations: ['add', 'subtract', 'multiply', 'divide'],
    maxOperand: 400,
    reward: { exp: 120, coins: 50 },
    isBoss: true,
  },
]

export function getLevelsByWorld(worldId: string): Level[] {
  return LEVELS.filter((level) => level.worldId === worldId).sort(
    (a, b) => a.order - b.order,
  )
}

export function getLevel(levelId: string): Level | undefined {
  return LEVELS.find((level) => level.id === levelId)
}
