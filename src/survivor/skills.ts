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
    id: 'reach',
    name: 'ระยะเอื้อม',
    description: 'ระยะทำการของอาวุธทุกชิ้นกว้างขึ้น 18%',
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
  {
    id: 'armor',
    name: 'เกราะหนา',
    description: 'ความเสียหายที่ได้รับลดลง 12%',
    maxStacks: 5,
    weight: 4,
    icon: 'shield',
  },
  {
    id: 'regen',
    name: 'ฟื้นฟู',
    description: 'ฟื้นเลือดเองเรื่อย ๆ ตลอดเวลา',
    maxStacks: 4,
    weight: 4,
    icon: 'heart',
  },
  {
    id: 'thorns',
    name: 'หนามสะท้อน',
    description: 'มอนที่ชนเราจะเจ็บกลับไปด้วย',
    maxStacks: 4,
    weight: 3,
    icon: 'sword',
  },
  {
    id: 'lifesteal',
    name: 'ดูดพลัง',
    description: 'ล้มมอนแล้วฟื้นเลือดเล็กน้อยทุกตัว',
    maxStacks: 4,
    weight: 3,
    icon: 'heart',
  },
  {
    id: 'luck',
    name: 'โชคดี',
    description: 'ของตกจากมอนบ่อยขึ้นเท่าตัว',
    maxStacks: 3,
    weight: 3,
    icon: 'coin',
  },
  {
    id: 'charge',
    name: 'พลังล้น',
    description: 'ชาร์จสกิลวิเศษเร็วขึ้น 35%',
    maxStacks: 3,
    weight: 3,
    icon: 'star',
  },
  {
    id: 'grace',
    name: 'ตั้งหลัก',
    description: 'หลังโดนตีจะไร้เทียมทานนานขึ้น หนีออกจากวงล้อมได้ง่ายขึ้น',
    maxStacks: 3,
    weight: 3,
    icon: 'shield',
  },
  {
    id: 'frost',
    name: 'ไอเย็น',
    description: 'มอนที่เข้ามาใกล้ตัวจะเดินช้าลงเอง',
    maxStacks: 3,
    weight: 3,
    icon: 'shield',
  },
  {
    id: 'bloom',
    name: 'ระเบิดลูกโซ่',
    description: 'มอนที่ถูกล้มจะระเบิดใส่ตัวที่อยู่ข้าง ๆ',
    maxStacks: 4,
    weight: 3,
    icon: 'flame',
  },
]

const SKILL_BY_ID = new Map(SKILLS.map((skill) => [skill.id, skill]))

export function getSkill(id: string): Skill | undefined {
  return SKILL_BY_ID.get(id)
}

/** ค่าตั้งต้นก่อนมีสกิลใด ๆ */
export const BASE_STATS: CombatStats = {
  damageMultiplier: 1,
  cooldownMultiplier: 1,
  extraProjectiles: 0,
  pierce: 0,
  projectileSpeed: 1,
  rangeMultiplier: 1,
  moveSpeed: 190,
  maxHp: 130,
  magnetRange: 70,
  xpMultiplier: 1,

  damageReduction: 0,
  regenPerSecond: 0,
  thornsDamage: 0,
  lifestealPerKill: 0,
  luckMultiplier: 1,
  ultimateChargeMultiplier: 1,
  graceSeconds: 0.9,
  frostAuraRadius: 0,
  bloomDamage: 0,
}

/**
 * คำนวณค่าจริงจากสกิลที่สะสมไว้
 *
 * ใช้การคูณต่อชั้นสำหรับค่าที่เป็นเปอร์เซ็นต์ ไม่ใช่การบวกเปอร์เซ็นต์เข้าไปตรง ๆ
 * เพราะการบวกจะทำให้ชั้นหลัง ๆ รู้สึกอ่อนลงเรื่อย ๆ จนไม่อยากเลือกซ้ำ
 *
 * ส่วนยิงไวมีพื้นล่างที่ 0.12 วินาที ไม่ให้ถี่จนเฟรมเดียวยิงหลายนัด
 */
export function statsFrom(
  skills: Readonly<Record<string, number>>,
  perks: Readonly<Record<string, number>> = {},
): CombatStats {
  const level = (id: string) => skills[id] ?? 0
  /*
   * พลังถาวรคูณทับค่าที่ได้จากสกิลในรอบ ไม่ใช่บวกเข้าไปตรง ๆ
   *
   * เลือกคูณเพราะทำให้พลังถาวรมีค่าเท่ากันตลอดรอบ
   * ถ้าบวกเป็นค่าคงที่ มันจะรู้สึกมากตอนต้นรอบและแทบไม่มีผลตอนท้ายรอบ
   * ซึ่งตรงข้ามกับสิ่งที่ต้องการ คือช่วยให้ "อยู่ได้นานขึ้น" ตลอดทั้งรอบ
   */
  const perk = (id: string) => perks[id] ?? 0

  return {
    damageMultiplier: Math.pow(1.4, level('power')) * (1 + perk('might') * 0.08),
    // มีพื้นล่างที่ 0.3 เท่า กันไม่ให้ถี่จนเฟรมเดียวโจมตีหลายครั้ง
    cooldownMultiplier: Math.max(0.3, Math.pow(0.82, level('rapid'))),
    extraProjectiles: level('multishot'),
    pierce: level('pierce'),
    projectileSpeed: Math.pow(1.25, level('velocity')),
    rangeMultiplier: Math.pow(1.18, level('reach')),
    moveSpeed:
      BASE_STATS.moveSpeed * Math.pow(1.15, level('swift')) * (1 + perk('boots') * 0.04),
    maxHp: BASE_STATS.maxHp + level('vitality') * 20 + perk('vigor') * 14,
    magnetRange:
      BASE_STATS.magnetRange * Math.pow(2, level('magnet')) * (1 + perk('lodestone') * 0.3),
    xpMultiplier: Math.pow(1.25, level('wisdom')),

    /*
     * การลดความเสียหายใช้การคูณต่อชั้น ไม่ใช่การบวกเปอร์เซ็นต์
     * ถ้าบวกตรง ๆ ห้าชั้นจะได้ 60% แต่ถ้าเผลอทำให้เกิน 100% เมื่อไร
     * ผู้เล่นจะกลายเป็นอมตะถาวรและเกมจบลงทันที
     * การคูณเข้าหาศูนย์ไปเรื่อย ๆ จึงปลอดภัยกว่าโดยธรรมชาติ
     */
    damageReduction: 1 - Math.pow(0.88, level('armor')),
    regenPerSecond: level('regen') * 1.6,
    thornsDamage: level('thorns') * 26,
    lifestealPerKill: level('lifesteal') * 1.4,
    luckMultiplier: Math.pow(2, level('luck')),
    ultimateChargeMultiplier: Math.pow(1.35, level('charge')),
    graceSeconds: 0.9 + level('grace') * 0.35,
    frostAuraRadius: level('frost') > 0 ? 70 + level('frost') * 34 : 0,
    bloomDamage: level('bloom') * 30,
  }
}

/**
 * จำนวนสกิลติดตัวที่ถือพร้อมกันได้
 *
 * ทำไมต้องจำกัด: เดิมไม่จำกัด เด็กจึงเก็บสกิลได้ทุกใบในรอบเดียว
 * ผลคือทุกบิลด์ลงเอยเหมือนกันหมด และการเลือกการ์ดไม่มีความหมาย
 * เพราะยังไงก็ได้ทุกอย่างอยู่ดี แค่ช้าหรือเร็วกว่ากัน
 *
 * พอจำกัดช่อง การเลือกใบแรก ๆ กลายเป็นการตัดสินใจว่าจะเดินทางไหน
 * และเมื่อช่องเต็มแล้ว การ์ดจะเสนอแต่การอัปสกิลที่เลือกไว้แล้วเท่านั้น
 * ซึ่งเป็นวิธีที่เกมแนวนี้ใช้กันทั่วไป และทำให้บิลด์ลึกขึ้นแทนที่จะกว้างขึ้น
 */
export const MAX_SKILL_SLOTS = 5
