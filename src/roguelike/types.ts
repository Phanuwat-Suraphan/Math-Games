/**
 * โหมดโร้คไลค์ — หอคอยไม่รู้จบ
 *
 * ทำไมต้องมี: ด่านในแผนที่มีจำนวนจำกัด เด็กที่เล่นเก่งจะเล่นจบแล้วไม่มีอะไรทำต่อ
 * โหมดนี้ไม่มีวันจบ ยิ่งขึ้นสูงยิ่งยาก และแต่ละรอบไม่เหมือนกัน
 *
 * กติกาแบบโร้คไลค์ที่ยึดไว้
 * 1. ตายแล้วเริ่มใหม่จากชั้น 1 ไม่มีการเซฟกลางทาง
 * 2. ทุกรอบสุ่มไม่เหมือนกัน จำทางไม่ได้ ต้องคิดจริง
 * 3. ระหว่างชั้นได้เลือกพรหนึ่งอย่างจากสามอย่าง การเลือกคือสิ่งที่ทำให้แต่ละรอบต่างกัน
 *
 * ข้อที่ปรับให้เหมาะกับเด็ก
 * - ตายแล้วยังได้เหรียญกับสถิติทักษะติดมือกลับไป ไม่ใช่เสียเปล่า
 *   เด็กที่เล่นแล้วได้ศูนย์ทุกครั้งจะเลิกเล่นเร็วมาก
 * - มีหัวใจสำรอง ตอบผิดครั้งเดียวไม่ตายทันที
 */

import type { Grade } from '../questionEngine/types'
import type { SkillId } from '../types/stats'

/** ชนิดของห้องในแต่ละชั้น */
export type RoomKind = 'question' | 'elite' | 'rest' | 'treasure'

/** พรที่เลือกได้ระหว่างชั้น */
export type BoonId =
  | 'extraHeart'
  | 'shield'
  | 'doubleCoin'
  | 'timeSlow'
  | 'skipOne'
  | 'healFull'
  | 'comboBoost'
  | 'secondChance'

export interface Boon {
  id: BoonId
  name: string
  description: string
  /** ถือได้หลายชั้นซ้อนกันไหม */
  stackable: boolean
  /** ระดับความหายาก คุมโอกาสที่จะถูกเสนอ */
  weight: number
}

/** หนึ่งชั้นของหอคอย */
export interface Floor {
  index: number
  kind: RoomKind
  /** ทักษะที่ชั้นนี้ถาม */
  skill: SkillId
  grade: Grade
  /** จำนวนข้อที่ต้องตอบให้ผ่านชั้นนี้ */
  questionCount: number
  /** วินาทีต่อข้อ 0 = ไม่จับเวลา */
  secondsPerQuestion: number
  /** ชื่อชั้นที่เด็กเห็น */
  title: string
}

/** สถานะของการเล่นหนึ่งรอบ */
export interface RunState {
  seed: string
  floor: number
  hearts: number
  maxHearts: number
  shields: number
  /** พรที่ถืออยู่ นับจำนวนชั้นของพรที่ซ้อนได้ */
  boons: Record<string, number>
  coinsEarned: number
  correct: number
  wrong: number
  bestCombo: number
  combo: number
  /** จบรอบแล้วหรือยัง */
  over: boolean
  /** ชั้นที่ไปถึงตอนจบ ใช้บันทึกสถิติ */
  reachedFloor: number
}

/** สถิติที่เก็บข้ามรอบ */
export interface RogueRecord {
  bestFloor: number
  totalRuns: number
  totalCoins: number
}
