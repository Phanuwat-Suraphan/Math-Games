import type { Monster } from '../types/battle'

/**
 * มอนสเตอร์ทั้งหมดในเกม
 *
 * ค่าพลังทั้งหมดอยู่ในไฟล์นี้ไฟล์เดียว ปรับสมดุลได้จากที่นี่
 * ห้ามเขียนค่าพลังลงใน component
 *
 * แนวคิดการออกแบบ: มอนสเตอร์ไม่ใช่ "ศัตรูที่น่ากลัว" แต่เป็นโจทย์ที่มีหน้าตา
 * คำบรรยายจึงเล่าว่ามันทำให้คณิตศาสตร์ผิดเพี้ยนอย่างไร ไม่ใช่ว่ามันดุร้ายแค่ไหน
 */

export const MONSTERS: Monster[] = [
  {
    id: 'goblin-calculator',
    name: 'Goblin Calculator',
    thaiName: 'ก็อบลินเครื่องคิดเลข',
    type: 'normal',
    level: 1,
    hp: 60,
    attack: 6,
    defense: 1,
    description: 'ก็อบลินจอมซนที่ชอบกดเครื่องคิดเลขผิดปุ่ม ทำให้คำตอบในหมู่บ้านเพี้ยนไปหมด',
    avatar: '👺',
    rewards: { exp: 30, coins: 12 },
  },
  {
    id: 'number-slime',
    name: 'Number Slime',
    thaiName: 'สไลม์ตัวเลข',
    type: 'normal',
    level: 2,
    hp: 80,
    attack: 8,
    defense: 2,
    description: 'สไลม์ที่กลืนตัวเลขบนป้ายบ้านจนคนอ่านบ้านเลขที่ไม่ออก',
    avatar: '🟢',
    rewards: { exp: 40, coins: 16 },
  },
  {
    id: 'fraction-bat',
    name: 'Fraction Bat',
    thaiName: 'ค้างคาวเศษส่วน',
    type: 'normal',
    level: 3,
    hp: 95,
    attack: 10,
    defense: 3,
    description: 'ค้างคาวที่ชอบแบ่งของเป็นชิ้นไม่เท่ากัน แล้วบอกว่าแบ่งเท่ากันแล้ว',
    avatar: '🦇',
    rewards: { exp: 50, coins: 20 },
  },
  {
    id: 'decimal-scorpion',
    name: 'Decimal Scorpion',
    thaiName: 'แมงป่องทศนิยม',
    type: 'normal',
    level: 4,
    hp: 100,
    attack: 12,
    defense: 4,
    description: 'แมงป่องที่ใช้หางเขี่ยจุดทศนิยมให้เลื่อนไปผิดตำแหน่ง ราคาของในตลาดเลยผิดหมด',
    avatar: '🦂',
    rewards: { exp: 60, coins: 24 },
  },
  {
    id: 'percentage-bandit',
    name: 'Percentage Bandit',
    thaiName: 'โจรร้อยละ',
    type: 'elite',
    level: 5,
    hp: 150,
    attack: 15,
    defense: 6,
    shield: 30,
    description: 'โจรที่ติดป้ายลดราคาปลอมทั่วเมือง ลด 20% แต่คิดเงินเหมือนไม่ได้ลด',
    avatar: '🥷',
    rewards: { exp: 100, coins: 45 },
  },
  {
    id: 'geometry-golem',
    name: 'Geometry Golem',
    thaiName: 'โกเลมเรขาคณิต',
    type: 'elite',
    level: 6,
    hp: 175,
    attack: 16,
    defense: 8,
    shield: 40,
    description: 'หุ่นหินที่สร้างกำแพงผิดขนาดจนประตูเมืองปิดไม่ลง',
    avatar: '🗿',
    rewards: { exp: 120, coins: 55 },
  },
  {
    id: 'math-guardian',
    name: 'Math Guardian',
    thaiName: 'ผู้พิทักษ์คณิต',
    type: 'mini_boss',
    level: 8,
    hp: 300,
    attack: 20,
    defense: 10,
    shield: 60,
    description: 'ผู้พิทักษ์ที่ทดสอบว่านักผจญภัยพร้อมจะเดินทางต่อหรือยัง ไม่ได้มาขวางทาง แต่มาวัดฝีมือ',
    avatar: '🛡️',
    rewards: { exp: 200, coins: 90 },
    specialAttack: { name: 'บททดสอบแห่งตัวเลข', multiplier: 1.5 },
    phases: [
      {
        hpThresholdPercent: 100,
        name: 'เฟส 1',
        message: 'ผู้พิทักษ์เริ่มทดสอบพื้นฐานของเจ้า',
        difficulty: 'medium',
      },
      {
        hpThresholdPercent: 50,
        name: 'เฟส 2',
        message: 'ผู้พิทักษ์ยอมรับฝีมือเจ้า และเพิ่มความยากขึ้น!',
        difficulty: 'hard',
      },
    ],
  },
  {
    id: 'dragon-of-numbers',
    name: 'Dragon of Numbers',
    thaiName: 'มังกรแห่งตัวเลข',
    type: 'boss',
    level: 10,
    hp: 500,
    attack: 25,
    defense: 12,
    shield: 100,
    description: 'มังกรที่กลืนคริสตัลแห่งความรู้เอาไว้ ต้องใช้คณิตศาสตร์ทุกอย่างที่เรียนมาเพื่อเอาคืน',
    avatar: '🐉',
    rewards: { exp: 400, coins: 180 },
    specialAttack: { name: 'ลมหายใจแห่งความว่างเปล่า', multiplier: 2 },
    phases: [
      {
        hpThresholdPercent: 100,
        name: 'เฟส 1',
        message: 'มังกรตื่นขึ้นแล้ว!',
        difficulty: 'medium',
      },
      {
        hpThresholdPercent: 70,
        name: 'เฟส 2',
        message: '🐉 มังกรเริ่มโกรธ โจทย์จะยากขึ้น!',
        difficulty: 'hard',
      },
      {
        hpThresholdPercent: 35,
        name: 'เฟส 3',
        message: '🔥 มังกรกำลังรวบรวมพลังทั้งหมด เตรียมตัวให้ดี!',
        difficulty: 'expert',
      },
    ],
  },
]

const MONSTER_BY_ID = new Map(MONSTERS.map((monster) => [monster.id, monster]))

export function getMonster(monsterId: string): Monster | undefined {
  return MONSTER_BY_ID.get(monsterId)
}

export function getMonstersByType(type: Monster['type']): Monster[] {
  return MONSTERS.filter((monster) => monster.type === type)
}

/**
 * เลือกมอนสเตอร์ให้เหมาะกับด่าน
 *
 * ด่านบอสได้บอส ด่านยากได้ elite ที่เหลือได้มอนสเตอร์ธรรมดา
 * เลือกแบบวนตามลำดับด่าน ไม่สุ่ม เพื่อให้เด็กเจอตัวเดิมเมื่อเล่นด่านเดิมซ้ำ
 * และครูรู้ล่วงหน้าว่าด่านไหนเจออะไร
 */
export function pickMonsterForStage(stage: {
  id: string
  order: number
  difficulty: string
  isBoss: boolean
}): Monster {
  if (stage.isBoss || stage.difficulty === 'boss') {
    const bosses = getMonstersByType('boss')
    return bosses[0] ?? (MONSTERS[MONSTERS.length - 1] as Monster)
  }

  if (stage.difficulty === 'hard') {
    const pool = [...getMonstersByType('elite'), ...getMonstersByType('mini_boss')]
    return pool[Math.abs(stage.order) % pool.length] ?? (pool[0] as Monster)
  }

  const pool = getMonstersByType('normal')
  return pool[Math.abs(stage.order) % pool.length] ?? (pool[0] as Monster)
}
