import { RULES } from '../rules'
import { countNumbers, countOperators, type HandCard } from './deck'

/**
 * กติกาพิเศษ "มือตาย" ตามหน้ากติกาของเกม
 * มีไว้ให้เกมเดินต่อได้เสมอ ไม่ว่าจั่วได้อะไรมาก็ตาม
 *
 *   ตัวเลขล้วน ไม่มีเครื่องหมาย  → Raw Magic Gathering  (เลือกเลข 2 ใบมาบวกกัน)
 *   ไม่มีตัวเลขเลย               → Tactical Reset       (ทิ้งทั้งมือ จั่วใหม่ ข้ามการโจมตี)
 *   มีตัวเลขใบเดียว              → Desperate Strike     (ใช้เลขนั้นโจมตี แต่ลดครึ่ง)
 */

export type DeadHandCase =
  | 'none'
  | 'rawMagicGathering'
  | 'tacticalReset'
  | 'desperateStrike'

export interface DeadHandInfo {
  kind: DeadHandCase
  title: string
  condition: string
  steps: string[]
  canAttack: boolean
  canUseHeroSkill: boolean
  emoji: string
}

const INFO: Record<Exclude<DeadHandCase, 'none'>, DeadHandInfo> = {
  rawMagicGathering: {
    kind: 'rawMagicGathering',
    title: 'Raw Magic Gathering',
    condition: 'มีแต่ตัวเลข ไม่มีเครื่องหมายเลย',
    steps: [
      'โชว์การ์ดในมือให้ฝ่ายตรงข้ามยืนยัน',
      'เลือกตัวเลข 2 ใบ',
      'ระบบจะนำสองตัวเลขมาบวกกันเป็นพลังโจมตี',
    ],
    canAttack: true,
    canUseHeroSkill: false,
    emoji: '🔥',
  },
  tacticalReset: {
    kind: 'tacticalReset',
    title: 'Tactical Reset',
    condition: 'ไม่มีตัวเลขในมือเลย',
    steps: [
      'โชว์การ์ดในมือให้ฝ่ายตรงข้ามยืนยัน',
      'ทิ้งการ์ดทั้งหมด',
      `จั่วการ์ดใหม่ ${RULES.handSize} ใบทันที`,
    ],
    canAttack: false,
    canUseHeroSkill: false,
    emoji: '♻️',
  },
  desperateStrike: {
    kind: 'desperateStrike',
    title: 'Desperate Strike',
    condition: 'มีตัวเลขแค่ 1 ใบ ที่เหลือเป็นเครื่องหมาย',
    steps: [
      'โชว์การ์ดในมือให้ฝ่ายตรงข้ามยืนยัน',
      'ใช้ตัวเลขใบนั้นโจมตี',
      'พลังโจมตีถูกลดครึ่งหนึ่ง ปัดเศษลง',
    ],
    canAttack: true,
    canUseHeroSkill: false,
    emoji: '⚡',
  },
}

/** ตรวจว่ามือนี้เข้าเงื่อนไขมือตายแบบใด */
export function detectDeadHand(hand: readonly HandCard[]): DeadHandCase {
  const numbers = countNumbers(hand)
  const operators = countOperators(hand)

  if (numbers === 0) return 'tacticalReset'
  if (operators === 0 && numbers >= 2) return 'rawMagicGathering'
  if (numbers === 1) return 'desperateStrike'

  return 'none'
}

export function getDeadHandInfo(kind: DeadHandCase): DeadHandInfo | null {
  return kind === 'none' ? null : INFO[kind]
}

/** พลังโจมตีจาก Raw Magic Gathering คือผลบวกของตัวเลขสองใบที่เลือก */
export function rawMagicPower(first: number, second: number): number {
  return Math.max(0, Math.floor(first) + Math.floor(second))
}

/** พลังโจมตีจาก Desperate Strike คือครึ่งหนึ่งของตัวเลขใบเดียวที่มี ปัดลง */
export function desperateStrikePower(value: number): number {
  return Math.max(0, Math.floor(value / RULES.desperateStrikeDivisor))
}
