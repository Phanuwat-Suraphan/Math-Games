/**
 * โหมดเอาชีวิตรอด — ผู้เล่นเดินได้ มอนสเตอร์วิ่งเข้าหา
 *
 * เกมแนวนี้ (survivor-like) มีกติกาหลักสี่ข้อ
 * 1. ผู้เล่นทำได้อย่างเดียวคือ "เดิน" การโจมตีเป็นอัตโนมัติ
 *    ทำให้เด็กเล็กเล่นได้ทันทีโดยไม่ต้องกดหลายปุ่มพร้อมกัน
 * 2. มอนสเตอร์เดินเข้าหาผู้เล่นเสมอ ความกดดันจึงมาจากตำแหน่ง ไม่ใช่ความไว
 * 3. ฆ่ามอนได้คริสตัล เก็บครบแล้วเลเวลอัป
 * 4. เลเวลอัปแล้วเลือกสกิล การเลือกสะสมกันไปเรื่อย ๆ จนกลายเป็นบิลด์
 *
 * ส่วนที่เป็นของเกมนี้เอง: เลเวลอัปแล้วต้องตอบโจทย์ก่อนจึงจะได้เลือกสกิล
 * ตอบถูกได้เลือกจากสามใบ ตอบผิดได้เลือกจากสองใบ
 * ตั้งใจให้ตอบผิดแล้ว "ได้น้อยลง" ไม่ใช่ "ไม่ได้เลย"
 * เพราะการลงโทษหนักในเกมที่ตายง่ายอยู่แล้วจะทำให้เด็กเลิกเล่น
 *
 * ทุกอย่างในไฟล์นี้เป็นข้อมูลล้วน ไม่มี DOM ไม่มี canvas
 * การจำลองทั้งเกมจึงทดสอบได้แบบไม่ต้องเปิดเบราว์เซอร์
 */

import type { SkillId } from '../types/stats'

/** ขนาดสนาม เป็นหน่วยของเกม ไม่ใช่พิกเซล */
export const ARENA_WIDTH = 800
export const ARENA_HEIGHT = 600

export interface Vec {
  x: number
  y: number
}

export interface PlayerEntity {
  pos: Vec
  hp: number
  maxHp: number
  /** หน่วยต่อวินาที */
  speed: number
  radius: number
  level: number
  xp: number
  /** XP ที่ต้องใช้เพื่อขึ้นเลเวลถัดไป */
  xpToNext: number
  /** วินาทีที่ยังบาดเจ็บอยู่ ระหว่างนี้ไม่รับความเสียหายซ้ำ */
  invulnerable: number
}

export interface EnemyEntity {
  id: number
  pos: Vec
  hp: number
  maxHp: number
  speed: number
  radius: number
  damage: number
  /** ชนิดที่ใช้เลือกภาพ */
  kind: string
  /** ให้ XP เท่าไรเมื่อตาย */
  xpValue: number
  /** วินาทีที่เพิ่งโดนตี ใช้ทำเอฟเฟกต์กระพริบ */
  hitFlash: number
}

export interface ProjectileEntity {
  id: number
  pos: Vec
  vel: Vec
  damage: number
  radius: number
  /**
   * ยังตีมอนได้อีกกี่ตัวก่อนจะหายไป
   *
   * เก็บเป็น "จำนวนครั้งที่เหลือ" ไม่ใช่ "ทะลุได้อีกกี่ตัว"
   * เพราะแบบหลังต้องบวกหนึ่งทุกครั้งที่เทียบ แล้วพลาดง่ายมาก
   * กระสุนธรรมดา (pierce 0) คือ hitsLeft = 1
   */
  hitsLeft: number
  /** วินาทีที่เหลือก่อนหายไปเอง */
  life: number
  /** ตัวที่โดนไปแล้ว กันไม่ให้ตีตัวเดิมซ้ำในลูกเดียว */
  hitIds: number[]
}

export interface GemEntity {
  id: number
  pos: Vec
  value: number
}

/** ค่าที่สกิลไปเปลี่ยน รวมไว้ที่เดียวเพื่อคำนวณครั้งเดียวต่อเฟรม */
export interface CombatStats {
  damage: number
  /** วินาทีระหว่างการยิงแต่ละครั้ง */
  attackInterval: number
  projectiles: number
  pierce: number
  projectileSpeed: number
  moveSpeed: number
  maxHp: number
  /** ระยะที่คริสตัลจะถูกดูดเข้าหาตัว */
  magnetRange: number
  /** ตัวคูณ XP ที่ได้ */
  xpMultiplier: number
  /** ดาบหมุนรอบตัวกี่เล่ม */
  orbitBlades: number
}

export type Phase = 'playing' | 'question' | 'choosing' | 'dead'

export interface WorldState {
  seed: string
  /** วินาทีที่ผ่านไปตั้งแต่เริ่ม */
  time: number
  player: PlayerEntity
  enemies: EnemyEntity[]
  projectiles: ProjectileEntity[]
  gems: GemEntity[]
  /** สกิลที่เลือกมาแล้ว นับจำนวนชั้น */
  skills: Record<string, number>
  /** วินาทีที่เหลือก่อนยิงนัดถัดไป */
  attackCooldown: number
  /** มุมของดาบหมุน หน่วยเรเดียน */
  orbitAngle: number
  /** วินาทีที่เหลือก่อนมอนกลุ่มถัดไปโผล่ */
  spawnCooldown: number
  nextId: number
  phase: Phase
  kills: number
  /** ทักษะที่โจทย์ตอนเลเวลอัปครั้งถัดไปจะถาม */
  pendingSkill?: SkillId
  /** ตอบโจทย์ล่าสุดถูกไหม ใช้ตัดสินว่าจะให้เลือกสกิลกี่ใบ */
  lastAnswerCorrect: boolean
}

/** ปุ่มบังคับ ทิศทางเป็นเวกเตอร์หน่วย ความยาวไม่เกิน 1 */
export interface Input {
  move: Vec
}
