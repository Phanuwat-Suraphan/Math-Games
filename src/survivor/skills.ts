/**
 * สกิลที่สุ่มให้เลือกตอนเลเวลอัป
 *
 * หลักการออกแบบ: ทุกสกิลต้อง "รู้สึกได้ทันที" ในไม่กี่วินาทีหลังเลือก
 * ถ้าเลือกแล้วไม่เห็นความต่าง เด็กจะเลือกมั่วและเลิกสนใจระบบนี้ไปเลย
 *
 * ทุกสกิลมีเพดานชั้น ไม่ให้กดตัวเดียวรัวจนพัง
 * และไม่มีสกิลไหนที่ทำให้แย่ลง เพราะเป้าหมายคือให้กล้าลอง ไม่ใช่กลัวเลือกผิด
 */

import type { CombatStats } from './types'

export interface Skill {
  id: string
  name: string
  description: string
  /** เลือกซ้ำได้สูงสุดกี่ครั้ง */
  maxStacks: number
  /** โอกาสที่จะถูกเสนอ ยิ่งมากยิ่งเจอบ่อย */
  weight: number
  /** ไอคอนจากชุด GameIcon */
  icon: string
}

export const SKILLS: Skill[] = [
  {
    id: 'power',
    name: 'พลังโจมตี',
    description: 'ความเสียหายต่อนัดเพิ่มขึ้น 40%',
    maxStacks: 6,
    weight: 5,
    icon: 'sword',
  },
  {
    id: 'rapid',
    name: 'ยิงไว',
    description: 'ยิงถี่ขึ้น 22%',
    maxStacks: 6,
    weight: 5,
    icon: 'flame',
  },
  {
    id: 'multishot',
    name: 'กระสุนแตก',
    description: 'ยิงเพิ่มอีก 1 นัดต่อครั้ง',
    maxStacks: 4,
    weight: 3,
    icon: 'star',
  },
  {
    id: 'pierce',
    name: 'ทะลุทะลวง',
    description: 'กระสุนทะลุมอนได้อีก 1 ตัว',
    maxStacks: 4,
    weight: 3,
    icon: 'sword',
  },
  {
    id: 'swift',
    name: 'เท้าไว',
    description: 'เดินเร็วขึ้น 15%',
    maxStacks: 5,
    weight: 4,
    icon: 'flame',
  },
  {
    id: 'vitality',
    name: 'พลังชีวิต',
    description: 'พลังชีวิตสูงสุดเพิ่ม 20 และฟื้นให้ทันที',
    maxStacks: 6,
    weight: 4,
    icon: 'heart',
  },
  {
    id: 'magnet',
    name: 'แม่เหล็ก',
    description: 'ดูดคริสตัลได้ไกลขึ้นมาก',
    maxStacks: 3,
    weight: 3,
    icon: 'coin',
  },
  {
    id: 'wisdom',
    name: 'ปัญญา',
    description: 'ได้ XP จากคริสตัลมากขึ้น 25%',
    maxStacks: 4,
    weight: 3,
    icon: 'exp',
  },
  {
    id: 'orbit',
    name: 'ดาบหมุน',
    description: 'มีดาบลอยหมุนรอบตัว ฟันมอนที่เข้าใกล้',
    maxStacks: 4,
    weight: 3,
    icon: 'shield',
  },
  {
    id: 'velocity',
    name: 'กระสุนเร็ว',
    description: 'กระสุนพุ่งเร็วขึ้น 25% ยิงโดนง่ายขึ้น',
    maxStacks: 3,
    weight: 2,
    icon: 'star',
  },
]

const SKILL_BY_ID = new Map(SKILLS.map((skill) => [skill.id, skill]))

export function getSkill(id: string): Skill | undefined {
  return SKILL_BY_ID.get(id)
}

/** ค่าตั้งต้นก่อนมีสกิลใด ๆ */
export const BASE_STATS: CombatStats = {
  damage: 10,
  attackInterval: 0.75,
  projectiles: 1,
  pierce: 0,
  projectileSpeed: 420,
  moveSpeed: 190,
  maxHp: 100,
  magnetRange: 70,
  xpMultiplier: 1,
  orbitBlades: 0,
}

/**
 * คำนวณค่าจริงจากสกิลที่สะสมไว้
 *
 * ใช้การคูณต่อชั้นสำหรับค่าที่เป็นเปอร์เซ็นต์ ไม่ใช่การบวกเปอร์เซ็นต์เข้าไปตรง ๆ
 * เพราะการบวกจะทำให้ชั้นหลัง ๆ รู้สึกอ่อนลงเรื่อย ๆ จนไม่อยากเลือกซ้ำ
 *
 * ส่วนยิงไวมีพื้นล่างที่ 0.12 วินาที ไม่ให้ถี่จนเฟรมเดียวยิงหลายนัด
 */
export function statsFrom(skills: Readonly<Record<string, number>>): CombatStats {
  const level = (id: string) => skills[id] ?? 0

  return {
    damage: BASE_STATS.damage * Math.pow(1.4, level('power')),
    attackInterval: Math.max(
      0.12,
      BASE_STATS.attackInterval * Math.pow(0.78, level('rapid')),
    ),
    projectiles: BASE_STATS.projectiles + level('multishot'),
    pierce: BASE_STATS.pierce + level('pierce'),
    projectileSpeed: BASE_STATS.projectileSpeed * Math.pow(1.25, level('velocity')),
    moveSpeed: BASE_STATS.moveSpeed * Math.pow(1.15, level('swift')),
    maxHp: BASE_STATS.maxHp + level('vitality') * 20,
    magnetRange: BASE_STATS.magnetRange * Math.pow(2, level('magnet')),
    xpMultiplier: Math.pow(1.25, level('wisdom')),
    orbitBlades: level('orbit'),
  }
}
