import type { ChoiceQ, Difficulty } from './types'
import { generate } from '../generators'
import { shuffle } from '../utils/random'

/**
 * ดวลสองคน: เพื่อนสองคนเล่นบนแท็บเล็ตเครื่องเดียว นั่งตรงข้ามกัน (หรือข้างกัน)
 * โจทย์แบบเลือกตอบ ใครแตะคำตอบที่ถูกก่อนได้ 1 แต้ม
 * แตะผิด = ฝั่งนั้นตอบข้อนี้ไม่ได้อีก (อีกฝั่งยังตอบได้) · ผิดทั้งคู่ = ไม่มีใครได้แต้ม
 */

export const DUEL_ROUNDS = 10

/** โจทย์เลือกตอบจากหลายด่าน ง่ายก่อนแล้วค่อยยากขึ้น */
const DUEL_SPECS: [string, Difficulty][] = [
  ['identify', 1],
  ['moneyKind', 1],
  ['compare', 1],
  ['countChoice', 1],
  ['dotChoice', 1],
  ['whoMore', 1],
  ['equalValue', 1],
  ['compare', 2],
  ['countChoice', 2],
  ['notEqual', 2],
  ['dotChoice', 2],
  ['whoMore', 2],
]

export function buildDuel(rounds = DUEL_ROUNDS): ChoiceQ[] {
  const easy = shuffle(DUEL_SPECS.slice(0, 7))
  const hard = shuffle(DUEL_SPECS.slice(7))
  const specs = [...easy, ...hard].slice(0, rounds)
  while (specs.length < rounds) specs.push(DUEL_SPECS[specs.length % DUEL_SPECS.length])
  return specs.map(([gen, d]) => generate(gen, d)[0]).filter((q): q is ChoiceQ => q.kind === 'choice')
}

export type Side = 0 | 1

export interface DuelState {
  index: number
  scores: [number, number]
  /** ฝั่งที่แตะผิดในข้อนี้แล้ว */
  locked: [boolean, boolean]
  /** ข้อนี้จบแล้วหรือยัง: ฝั่งที่ได้แต้ม หรือ 'none' (ผิดทั้งคู่) */
  winner: Side | 'none' | null
  /** ตัวเลือกที่แตะผิดของแต่ละฝั่ง */
  wrong: [string | null, string | null]
}

export function startDuel(): DuelState {
  return { index: 0, scores: [0, 0], locked: [false, false], winner: null, wrong: [null, null] }
}

/** ฝั่งหนึ่งแตะตัวเลือก */
export function tapDuel(s: DuelState, side: Side, optionId: string, answer: string): DuelState {
  if (s.winner !== null || s.locked[side]) return s
  if (optionId === answer) {
    const scores: [number, number] = [...s.scores]
    scores[side] += 1
    return { ...s, scores, winner: side }
  }
  const locked: [boolean, boolean] = [...s.locked]
  locked[side] = true
  const wrong: [string | null, string | null] = [...s.wrong]
  wrong[side] = optionId
  return { ...s, locked, wrong, winner: locked[0] && locked[1] ? 'none' : null }
}

/** ไปข้อถัดไป (ข้อนี้ต้องจบก่อน) */
export function nextDuel(s: DuelState): DuelState {
  if (s.winner === null) return s
  return { ...s, index: s.index + 1, locked: [false, false], winner: null, wrong: [null, null] }
}

/** ผลการดวล: ฝั่งที่ชนะ หรือ 'tie' */
export function duelWinner(s: DuelState): Side | 'tie' {
  if (s.scores[0] === s.scores[1]) return 'tie'
  return s.scores[0] > s.scores[1] ? 0 : 1
}
