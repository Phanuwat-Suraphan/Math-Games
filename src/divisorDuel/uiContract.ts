/**
 * สัญญาระหว่างหน้าจอกับเครื่องยนต์เกมการ์ด
 *
 * ทำไมต้องมีไฟล์นี้
 *
 * หน้าจอของเกมนี้เป็นไฟล์ .tsx ซึ่งคอมไพล์ในเครื่องพัฒนาไม่ได้
 * เพราะติดตั้ง dependency ของ React ไม่ได้ ทุกครั้งที่เรียกฟังก์ชันผิด
 * จึงต้องรอ CI สองนาทีถึงจะรู้ และรู้ทีละจุดเดียวด้วย
 *
 * ตอนต่อหน้าจอเข้ากับเครื่องยนต์ครั้งแรก ผมเรียกผิดไปห้าจุด
 * ทั้งชื่อพารามิเตอร์ รูปร่างข้อมูลที่คืนกลับ และค่าที่ยอมรับได้ของ ControlMode
 * ทุกจุดเกิดจากการเดาจากความคุ้นเคยแทนที่จะเปิดไฟล์ต้นทางดู
 *
 * ไฟล์นี้เรียกทุกฟังก์ชันที่หน้าจอใช้ ด้วยค่าชนิดเดียวกับที่หน้าจอส่งจริง
 * และเป็น .ts ธรรมดาที่อยู่ใน tsconfig.duel.json จึงคอมไพล์ในเครื่องได้ทันที
 * ถ้าหน้าจอเรียกผิด ไฟล์นี้จะคอมไพล์ไม่ผ่านตั้งแต่ในเครื่อง
 *
 * ไฟล์นี้ไม่ถูกเรียกใช้ตอนเล่นจริง มีไว้ให้คอมไพเลอร์ตรวจอย่างเดียว
 */

import { HEROES } from './cards'
import { planTurn } from './engine/ai'
import type { AiLevel } from './engine/ai'
import {
  desperateStrikePower,
  getDeadHandInfo,
  rawMagicPower,
} from './engine/deadHand'
import { evaluate, toDisplayString, validate } from './engine/equation'
import {
  addBracket,
  attack,
  clearEquation,
  createGame,
  deadHandAttack,
  endTurn,
  getRedrawCost,
  getTargets,
  placeCard,
  redrawHand,
  tacticalReset,
  undoLastCard,
} from './engine/game'
import type { GameState, TargetOption } from './engine/game'

/**
 * เดินครบทุกอย่างที่หน้าจอทำได้ หนึ่งรอบ
 *
 * คืนค่าที่หน้าจอต้องใช้จริง เพื่อให้คอมไพเลอร์ตรวจชนิดของค่าที่คืนกลับด้วย
 * ไม่ใช่ตรวจแค่ว่าเรียกฟังก์ชันถูกอย่างเดียว
 */
export function exerciseUi(level: AiLevel = 'normal'): {
  display: string
  power: number | null
  targetCount: number
  redrawCost: number
  logLines: string[]
} {
  // เริ่มเกม ค่าทุกตัวต้องเป็นชนิดที่ createGame ยอมรับจริง
  let state: GameState = createGame({
    p1HeroId: HEROES[0].id,
    p2HeroId: HEROES[1].id,
    p2Control: 'ai',
    p1Name: 'ผู้เล่น',
    p2Name: 'คู่ต่อสู้',
  })

  // วางการ์ด ถอยกลับ ล้าง และใส่วงเล็บ
  const first = state.players.p1.hand[0]
  if (first && first.kind !== 'bracket') {
    state = placeCard(state, first.uid)
    state = undoLastCard(state)
    state = clearEquation(state)
  }

  const bracketOutcome = addBracket(state, 0, 1)
  state = bracketOutcome.state
  const bracketOk: boolean = bracketOutcome.ok
  const bracketMessage: string = bracketOutcome.message
  void bracketOk
  void bracketMessage

  // ตรวจสมการและอ่านค่า
  const check = validate(state.equation)
  const isValid: boolean = check.isValid
  const checkMessage: string | null = check.message
  void isValid
  void checkMessage

  /*
   * ฟิลด์ขององครักษ์ที่หน้าจอใช้วาดภาพจริง
   * monsterId คือตัวที่ใช้เปิดตารางจับคู่ภาพ ถ้าเปลี่ยนชื่อฟิลด์เมื่อไร
   * หน้าจอจะวาดภาพสำรองทุกใบโดยไม่มี error ให้เห็น จึงต้องยึดไว้ตรงนี้
   */
  for (const guard of state.players.p2.guards) {
    const monsterId: string = guard.monsterId
    const caption = `${guard.emoji} ${guard.name} ÷${guard.divisor} ${guard.hp}/${guard.maxHp}`
    void monsterId
    void caption
  }
  const foeHeroId: string = state.players.p2.heroId
  void foeHeroId

  // ชนิดของการ์ดในมือ ต้องแยกได้ครบทั้งสามแบบตามที่หน้าจอวาด
  for (const card of state.players.p1.hand) {
    if (card.kind === 'number') {
      const value: number = card.value
      void value
    } else if (card.kind === 'operator') {
      const symbol: string = card.symbol
      void symbol
    }
    const label: string = card.label
    void label
  }

  // เป้าหมาย ต้องมีฟิลด์ครบตามที่หน้าจอวาด
  const targets: TargetOption[] = getTargets(state)
  for (const option of targets) {
    const label = `${option.emoji} ${option.name} ÷${option.divisor}`
    const bar = option.hp / option.maxHp
    const canHit: boolean = option.isAttackable
    void label
    void bar
    void canHit
  }

  // โจมตีด้วยสมการปกติ
  const outcome = attack(state, { target: { kind: 'guard', index: 0 } })
  state = outcome.state
  const remainder: number | undefined = outcome.result?.remainder
  void remainder
  void outcome.message

  // ท่าไม้ตายเมื่อมือตาย ต้องคิดพลังเองตามชนิดของมือตาย
  const info = getDeadHandInfo(state.deadHand)
  if (info) {
    const heading = `${info.emoji} ${info.title} — ${info.condition}`
    const steps: string[] = info.steps
    const canAttack: boolean = info.canAttack
    void heading
    void steps

    const numbers = state.players.p1.hand.flatMap((card) =>
      card.kind === 'number' ? [card] : [],
    )
    const power =
      state.deadHand === 'rawMagicGathering'
        ? rawMagicPower(numbers[0]?.value ?? 0, numbers[1]?.value ?? 0)
        : desperateStrikePower(numbers[0]?.value ?? 0)

    if (canAttack) {
      state = deadHandAttack(state, {
        target: { kind: 'guard', index: 0 },
        power,
        usedCardIds: numbers.slice(0, 2).map((card) => card.uid),
      }).state
    }
    state = tacticalReset(state)
  }

  // จั่วใหม่โดยแลกเลือด
  const redraw = redrawHand(state)
  state = redraw.state
  const redrawOk: boolean = redraw.ok
  void redrawOk
  void redraw.message

  // ตาของคอมพิวเตอร์
  const plan = planTurn(state, level)
  if (plan.fallback === 'none') {
    state = {
      ...state,
      equation: { slots: plan.slots, brackets: plan.bracket ? [plan.bracket] : [] },
    }
    state = attack(state, {
      target: plan.target,
      overridePower: evaluate(state.equation) ?? 0,
    }).state
  }

  state = endTurn(state)

  return {
    display: toDisplayString(state.equation),
    power: evaluate(state.equation),
    targetCount: targets.length,
    redrawCost: getRedrawCost(),
    logLines: state.log.map((entry) => entry.text),
  }
}
