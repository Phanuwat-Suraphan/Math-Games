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

/**
 * พฤติกรรมการเคลื่อนที่ของมอน
 *
 * ต้องต่างกันจริง ไม่ใช่ต่างแค่ความเร็ว
 * ถ้าทุกตัวเดินตรงเข้าหาเหมือนกันหมด เด็กจะเรียนรู้ท่าเดียวแล้วใช้ได้ตลอดเกม
 *
 *   chase   เดินตรงเข้าหา เป็นพื้นฐาน
 *   zigzag  ส่ายไปมาระหว่างเข้าหา ยิงโดนยากกว่า
 *   dash    หยุดนิ่งแล้วพุ่งเป็นช่วง ๆ ต้องดูจังหวะ
 *   ranged  หยุดที่ระยะหนึ่งแล้วยิงใส่ ต้องเข้าไปจัดการ
 *   tank    ช้ามากแต่ถึกและเจ็บ ต้องหลบไปเรื่อย ๆ
 */
export type EnemyBehavior = 'chase' | 'zigzag' | 'dash' | 'ranged' | 'tank'

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

  behavior: EnemyBehavior
  /** นาฬิกาประจำตัว ใช้คุมจังหวะส่ายและจังหวะพุ่ง */
  clock: number
  /** วินาทีที่เหลือของการถูกทำให้เดินช้า */
  slowFor: number
  /** วินาทีที่เหลือของการติดไฟ */
  burnFor: number
  /** ความเสียหายจากไฟต่อวินาที */
  burnDps: number
  /** ตัวใหญ่พิเศษที่โผล่เป็นระยะ ให้ XP เยอะและถึกมาก */
  elite: boolean
  /** ตายแล้วแตกเป็นตัวเล็กกี่ตัว 0 = ไม่แตก */
  splitInto: number
  /** วินาทีที่เหลือก่อนยิงนัดถัดไป ใช้เฉพาะพวกยิงไกล */
  shootCooldown: number
}

/** กระสุนของมอนฝ่ายตรงข้าม */
export interface EnemyShot {
  id: number
  pos: Vec
  vel: Vec
  damage: number
  radius: number
  life: number
}

/**
 * เอฟเฟกต์ภาพชั่วคราว
 *
 * เก็บไว้ในสถานะเกมด้วย ไม่ใช่ให้หน้าจอคิดเอง
 * เพราะการฟันดาบหรือระเบิดเกิดขึ้นในเฟรมเดียว
 * ถ้าไม่บันทึกไว้ เด็กจะเห็นมอนเลือดลดโดยไม่เห็นว่าอะไรไปโดน
 */
export interface Effect {
  id: number
  kind: 'slash' | 'blast' | 'bolt'
  pos: Vec
  /** ปลายทางของสายฟ้า ใช้เฉพาะ bolt */
  to?: Vec
  radius: number
  life: number
  maxLife: number
}

export interface ProjectileEntity {
  id: number
  /** อาวุธที่ยิงลูกนี้ ใช้เลือกสีและผลพิเศษตอนโดน */
  weapon: string
  pos: Vec
  vel: Vec
  damage: number
  radius: number
  /** ระเบิดเป็นวงรัศมีเท่านี้เมื่อโดน 0 = ไม่ระเบิด */
  blastRadius: number
  /** ทำให้มอนเดินช้ากี่วินาที 0 = ไม่ทำ */
  slowFor: number
  /** ทำให้มอนติดไฟกี่วินาที 0 = ไม่ทำ */
  burnFor: number
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

/**
 * ค่าจากสกิลติดตัว
 *
 * เป็น "ตัวคูณ" ที่ไปคูณกับค่าของอาวุธ ไม่ใช่ค่าดิบของการโจมตี
 * ค่าดิบเป็นของอาวุธแต่ละชิ้น (ดู weapons.ts)
 * สกิลติดตัวจึงช่วยอาวุธทุกชิ้นพร้อมกัน ไม่ใช่ช่วยเฉพาะชิ้นเดียว
 */
export interface CombatStats {
  /** คูณความเสียหายของอาวุธทุกชิ้น */
  damageMultiplier: number
  /** คูณเวลารอระหว่างโจมตี ยิ่งน้อยยิ่งถี่ */
  cooldownMultiplier: number
  /** ยิงเพิ่มกี่นัดต่อครั้ง ใช้กับอาวุธที่ยิงกระสุน */
  extraProjectiles: number
  /** กระสุนทะลุมอนได้อีกกี่ตัว */
  pierce: number
  /** คูณความเร็วกระสุน */
  projectileSpeed: number
  /** ระยะทำการของอาวุธ คูณเข้าไป */
  rangeMultiplier: number
  moveSpeed: number
  maxHp: number
  /** ระยะที่คริสตัลจะถูกดูดเข้าหาตัว */
  magnetRange: number
  /** ตัวคูณ XP ที่ได้ */
  xpMultiplier: number
}

export type Phase = 'playing' | 'question' | 'choosing' | 'dead'

export interface WorldState {
  seed: string
  /** วินาทีที่ผ่านไปตั้งแต่เริ่ม */
  time: number
  player: PlayerEntity
  enemies: EnemyEntity[]
  projectiles: ProjectileEntity[]
  enemyShots: EnemyShot[]
  effects: Effect[]
  gems: GemEntity[]
  /** สกิลติดตัวที่เลือกมาแล้ว นับจำนวนชั้น */
  skills: Record<string, number>
  /** อาวุธที่ถืออยู่ พร้อมระดับของแต่ละชิ้น */
  weapons: Record<string, number>
  /** วินาทีที่เหลือก่อนโจมตีครั้งถัดไป แยกตามอาวุธ */
  weaponCooldowns: Record<string, number>
  /** วินาทีที่เหลือก่อนมอนตัวใหญ่พิเศษโผล่ */
  eliteCooldown: number
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
