import { HEROES, MONSTERS } from '../cards'
import { RULES } from '../rules'
import type { HeroCard } from '../types'
import { calculateDamage, type DamageResult, type HeroPassive } from './damage'
import { detectDeadHand, type DeadHandCase } from './deadHand'
import { buildDeck, drawCards, shuffle, type HandCard } from './deck'
import { createEmptyEquation, evaluate, type Equation } from './equation'

/**
 * สถานะและกฎการเดินเกมทั้งหมด
 * เขียนเป็น pure function ทุกตัว รับสถานะเข้า คืนสถานะใหม่ออก
 * ทำให้ทดสอบได้โดยไม่ต้องมี React และย้อนสถานะได้ในอนาคต
 */

export type PlayerSide = 'p1' | 'p2'
export type ControlMode = 'human' | 'ai'

export interface GuardState {
  /** รหัสการ์ดมอนสเตอร์จาก MONSTERS */
  monsterId: string
  name: string
  emoji: string
  hp: number
  maxHp: number
  divisor: number
  /** เกราะที่เพิ่มชั่วคราวจากความสามารถ Divine Aegis */
  divisorBonus: number
  isBoss: boolean
}

export interface PlayerState {
  side: PlayerSide
  name: string
  control: ControlMode

  heroId: string
  heroName: string
  heroHp: number
  heroMaxHp: number
  heroDivisor: number

  guards: GuardState[]

  hand: HandCard[]
  drawPile: HandCard[]
  discardPile: HandCard[]

  comboStreak: number
  redrawsUsedThisTurn: number
  /** Arcanus ใช้ได้เทิร์นละครั้ง */
  skillUsedThisTurn: boolean
}

export type GamePhase = 'build' | 'resolved' | 'finished'

export interface LogEntry {
  id: number
  side: PlayerSide
  text: string
  tone: 'info' | 'critical' | 'blocked' | 'system'
}

export interface GameState {
  players: Record<PlayerSide, PlayerState>
  turn: PlayerSide
  turnNumber: number
  phase: GamePhase
  equation: Equation
  /** ผลการโจมตีล่าสุด ใช้แสดงบนหน้าจอ */
  lastResult: (DamageResult & { targetName: string; power: number }) | null
  winner: PlayerSide | null
  log: LogEntry[]
  deadHand: DeadHandCase
  /**
   * การ์ดที่ถูกใช้ไปในเทิร์นนี้ จะถูกทิ้งตอนจบเทิร์นแล้วจั่วใหม่มาแทน
   * สำคัญมาก: กติกามือตายก็ต้องบันทึกตรงนี้ด้วย ไม่งั้นมือจะค้างเป็นมือตายวนไม่จบ
   */
  usedCardIds: string[]
}

export interface NewGameOptions {
  p1HeroId: string
  p2HeroId: string
  p2Control: ControlMode
  p1Name?: string
  p2Name?: string
  random?: () => number
}

const MONSTER_EMOJI: Record<string, string> = {
  'stone-gargoyle': '🗿',
  'swamp-troll': '👹',
  'crimson-wyvern': '🐲',
  'iron-golem': '🤖',
  'skeleton-king': '💀',
  'void-dragon': '🐉',
}

function heroById(id: string): HeroCard {
  return HEROES.find((hero) => hero.id === id) ?? HEROES[0]!
}

function passiveOf(heroId: string): HeroPassive {
  if (heroId === 'knight-commander-valerius') return 'precisionStrike'
  if (heroId === 'lich-queen-morwenna') return 'soulSiphon'
  return null
}

/** เลือกมอนสเตอร์องครักษ์ให้ผู้เล่น ไล่จากอ่อนไปแข็งเพื่อให้ด่านค่อย ๆ ยากขึ้น */
function scaleHp(hp: number): number {
  return Math.max(1, Math.round(hp * RULES.hpScale))
}

function pickGuards(count: number): GuardState[] {
  return MONSTERS.slice(0, Math.min(count, MONSTERS.length)).map((monster) => ({
    monsterId: monster.id,
    name: monster.name,
    emoji: MONSTER_EMOJI[monster.id] ?? '👾',
    hp: scaleHp(monster.hp),
    maxHp: scaleHp(monster.hp),
    divisor: monster.divisor,
    divisorBonus: 0,
    isBoss: monster.isBoss,
  }))
}

function createPlayer(
  side: PlayerSide,
  heroId: string,
  control: ControlMode,
  name: string,
  random: () => number,
): PlayerState {
  const hero = heroById(heroId)
  const deck = shuffle(buildDeck(), random)
  const drawn = drawCards([], deck, [], RULES.handSize, random)

  return {
    side,
    name,
    control,
    heroId: hero.id,
    heroName: hero.name,
    heroHp: scaleHp(hero.hp),
    heroMaxHp: scaleHp(hero.hp),
    heroDivisor: hero.divisor,
    guards: pickGuards(RULES.guardsPerPlayer),
    hand: drawn.hand,
    drawPile: drawn.drawPile,
    discardPile: drawn.discardPile,
    comboStreak: 0,
    redrawsUsedThisTurn: 0,
    skillUsedThisTurn: false,
  }
}

let logCounter = 0
function addLog(
  state: GameState,
  side: PlayerSide,
  text: string,
  tone: LogEntry['tone'] = 'info',
): LogEntry[] {
  logCounter += 1
  return [...state.log, { id: logCounter, side, text, tone }].slice(-40)
}

export function createGame(options: NewGameOptions): GameState {
  const random = options.random ?? Math.random

  const players: Record<PlayerSide, PlayerState> = {
    p1: createPlayer('p1', options.p1HeroId, 'human', options.p1Name ?? 'ผู้เล่น 1', random),
    p2: createPlayer(
      'p2',
      options.p2HeroId,
      options.p2Control,
      options.p2Name ?? (options.p2Control === 'ai' ? 'คอมพิวเตอร์' : 'ผู้เล่น 2'),
      random,
    ),
  }

  const state: GameState = {
    players,
    turn: 'p1',
    turnNumber: 1,
    phase: 'build',
    equation: createEmptyEquation(),
    lastResult: null,
    winner: null,
    log: [],
    deadHand: detectDeadHand(players.p1.hand),
    usedCardIds: [],
  }

  return { ...state, log: addLog(state, 'p1', 'เริ่มการดวล!', 'system') }
}

export function opponentOf(side: PlayerSide): PlayerSide {
  return side === 'p1' ? 'p2' : 'p1'
}

export function currentPlayer(state: GameState): PlayerState {
  return state.players[state.turn]
}

/** เกราะจริงของมอนสเตอร์ รวมโบนัสชั่วคราวแล้ว */
export function effectiveDivisor(guard: GuardState): number {
  return guard.divisor + guard.divisorBonus
}

export interface TargetOption {
  kind: 'guard' | 'hero'
  index: number
  name: string
  emoji: string
  hp: number
  maxHp: number
  divisor: number
  /** ตีได้ไหม ฮีโร่จะตีได้เมื่อองครักษ์หมดแล้วเท่านั้น */
  isAttackable: boolean
}

/**
 * รายชื่อเป้าหมายฝั่งตรงข้าม
 * ต้องล้มองครักษ์ให้หมดก่อนถึงจะตีฮีโร่ได้ ตามที่หน้ากติกากำหนด
 */
export function getTargets(state: GameState): TargetOption[] {
  const enemy = state.players[opponentOf(state.turn)]
  const aliveGuards = enemy.guards.filter((guard) => guard.hp > 0)

  const guardTargets: TargetOption[] = enemy.guards.map((guard, index) => ({
    kind: 'guard',
    index,
    name: guard.name,
    emoji: guard.emoji,
    hp: guard.hp,
    maxHp: guard.maxHp,
    divisor: effectiveDivisor(guard),
    isAttackable: guard.hp > 0,
  }))

  const heroTarget: TargetOption = {
    kind: 'hero',
    index: -1,
    name: enemy.heroName,
    emoji: '👑',
    hp: enemy.heroHp,
    maxHp: enemy.heroMaxHp,
    divisor: enemy.heroDivisor,
    isAttackable: aliveGuards.length === 0,
  }

  return [...guardTargets, heroTarget]
}

export interface AttackInput {
  target: { kind: 'guard' | 'hero'; index: number }
  /** พลังโจมตีที่คำนวณไว้แล้ว ใช้กับกรณีมือตายที่ไม่ได้มาจากสมการ */
  overridePower?: number
  /** กรณีมือตายห้ามใช้สกิลฮีโร่ */
  allowPassive?: boolean
  /** การ์ดที่ถูกใช้ไป ถ้าไม่ระบุจะใช้การ์ดในสมการ */
  usedCardIds?: string[]
}

export interface AttackOutcome {
  state: GameState
  result: DamageResult | null
  message: string
}

/** ลงมือโจมตี คำนวณดาเมจ หักเลือด และตรวจผู้ชนะ */
export function attack(state: GameState, input: AttackInput): AttackOutcome {
  if (state.phase !== 'build' || state.winner) {
    return { state, result: null, message: 'ยังโจมตีตอนนี้ไม่ได้' }
  }

  const attackerSide = state.turn
  const defenderSide = opponentOf(attackerSide)
  const attacker = state.players[attackerSide]
  const defender = state.players[defenderSide]

  const power = input.overridePower ?? evaluate(state.equation) ?? 0

  const targets = getTargets(state)
  const target = targets.find(
    (option) => option.kind === input.target.kind && option.index === input.target.index,
  )

  if (!target) {
    return { state, result: null, message: 'ไม่พบเป้าหมายนี้' }
  }
  if (!target.isAttackable) {
    return {
      state,
      result: null,
      message:
        target.kind === 'hero'
          ? 'ต้องล้มองครักษ์ให้หมดก่อนถึงจะตีฮีโร่ได้'
          : 'องครักษ์ตัวนี้ล้มไปแล้ว',
    }
  }

  const result = calculateDamage({
    power,
    divisor: target.divisor,
    comboStreak: attacker.comboStreak,
    passive: input.allowPassive === false ? null : passiveOf(attacker.heroId),
  })

  // หักเลือดเป้าหมาย
  let nextDefender: PlayerState
  if (target.kind === 'guard') {
    const guards = defender.guards.map((guard, index) =>
      index === target.index
        ? { ...guard, hp: Math.max(0, guard.hp - result.damage) }
        : guard,
    )
    nextDefender = { ...defender, guards }
  } else {
    nextDefender = {
      ...defender,
      heroHp: Math.max(0, defender.heroHp - result.damage),
    }
  }

  const nextAttacker: PlayerState = {
    ...attacker,
    comboStreak: result.nextComboStreak,
  }

  const winner = nextDefender.heroHp <= 0 ? attackerSide : null

  let next: GameState = {
    ...state,
    players: {
      ...state.players,
      [attackerSide]: nextAttacker,
      [defenderSide]: nextDefender,
    } as Record<PlayerSide, PlayerState>,
    phase: winner ? 'finished' : 'resolved',
    winner,
    lastResult: { ...result, targetName: target.name, power },
    usedCardIds: input.usedCardIds ?? [
      ...state.equation.slots.map((slot) => slot.cardId),
      ...state.equation.brackets.map((bracket) => bracket.cardId),
    ],
  }

  const headline = result.isCritical
    ? `⚔️ Critical Hit! ${power} หาร ${target.divisor} ลงตัว → ${target.name} เสีย ${result.damage}`
    : result.damage > 0
      ? `🛡️ Blocked — เศษ ${result.remainder} → ${target.name} เสียแค่ ${result.damage}`
      : `🛡️ Blocked — เศษ ${result.remainder} ทำให้ดาเมจเหลือ 0`

  next = {
    ...next,
    log: addLog(
      next,
      attackerSide,
      headline,
      result.isCritical ? 'critical' : 'blocked',
    ),
  }

  if (winner) {
    next = {
      ...next,
      log: addLog(next, winner, `🏆 ${attacker.name} ชนะการดวล!`, 'system'),
    }
  }

  return { state: next, result, message: headline }
}

/**
 * โจมตีด้วยกติกามือตาย (Raw Magic Gathering หรือ Desperate Strike)
 * ห้ามใช้ความสามารถฮีโร่ และทิ้งทั้งมือหลังโจมตีเพื่อไม่ให้ติดมือตายวนซ้ำ
 */
export function deadHandAttack(
  state: GameState,
  input: { target: AttackInput['target']; power: number; usedCardIds: string[] },
): AttackOutcome {
  const outcome = attack(state, {
    target: input.target,
    overridePower: input.power,
    allowPassive: false,
    usedCardIds: input.usedCardIds,
  })

  if (!outcome.result || !RULES.refreshHandAfterDeadHand) return outcome

  const side = state.turn
  const player = outcome.state.players[side]

  // ทิ้งทั้งมือแล้วจั่วใหม่ ป้องกันไม่ให้มือตายค้างอยู่ข้ามเทิร์น
  const discard = [...player.discardPile, ...player.hand]
  const drawn = drawCards([], player.drawPile, discard, RULES.handSize)

  const refreshed: PlayerState = {
    ...player,
    hand: drawn.hand,
    drawPile: drawn.drawPile,
    discardPile: drawn.discardPile,
  }

  return {
    ...outcome,
    state: {
      ...outcome.state,
      players: { ...outcome.state.players, [side]: refreshed } as Record<
        PlayerSide,
        PlayerState
      >,
      usedCardIds: [],
    },
  }
}

/** จั่วใหม่ทั้งมือโดยแลกกับ HP ฮีโร่ — กติกาที่ผู้ออกแบบเพิ่มเข้ามา */
export function getRedrawCost(): number {
  return scaleHp(RULES.redraw.hpCost)
}

export function redrawHand(state: GameState): {
  state: GameState
  ok: boolean
  message: string
} {
  if (state.phase !== 'build') {
    return { state, ok: false, message: 'จั่วใหม่ได้เฉพาะตอนสร้างสมการ' }
  }

  const side = state.turn
  const player = state.players[side]

  if (player.redrawsUsedThisTurn >= RULES.redraw.perTurn) {
    return { state, ok: false, message: 'เทิร์นนี้จั่วใหม่ไปแล้ว' }
  }
  const redrawCost = scaleHp(RULES.redraw.hpCost)

  if (player.heroHp <= redrawCost) {
    return {
      state,
      ok: false,
      message: `HP ไม่พอ ต้องมีมากกว่า ${redrawCost} ถึงจะจั่วใหม่ได้`,
    }
  }

  const discard = [...player.discardPile, ...player.hand]
  const drawn = drawCards([], player.drawPile, discard, RULES.handSize)

  const nextPlayer: PlayerState = {
    ...player,
    hand: drawn.hand,
    drawPile: drawn.drawPile,
    discardPile: drawn.discardPile,
    heroHp: player.heroHp - redrawCost,
    redrawsUsedThisTurn: player.redrawsUsedThisTurn + 1,
  }

  const next: GameState = {
    ...state,
    players: { ...state.players, [side]: nextPlayer } as Record<PlayerSide, PlayerState>,
    equation: createEmptyEquation(),
    deadHand: detectDeadHand(nextPlayer.hand),
    usedCardIds: [],
  }

  return {
    state: {
      ...next,
      log: addLog(
        next,
        side,
        `♻️ จั่วมือใหม่ แลกกับ HP ${redrawCost}`,
        'system',
      ),
    },
    ok: true,
    message: `จั่วใหม่แล้ว เสีย HP ${redrawCost}`,
  }
}

/** Tactical Reset — ทิ้งทั้งมือ จั่วใหม่ ไม่เสีย HP แต่ข้ามการโจมตีเทิร์นนี้ */
export function tacticalReset(state: GameState): GameState {
  const side = state.turn
  const player = state.players[side]

  const discard = [...player.discardPile, ...player.hand]
  const drawn = drawCards([], player.drawPile, discard, RULES.handSize)

  const nextPlayer: PlayerState = {
    ...player,
    hand: drawn.hand,
    drawPile: drawn.drawPile,
    discardPile: drawn.discardPile,
  }

  const next: GameState = {
    ...state,
    players: { ...state.players, [side]: nextPlayer } as Record<PlayerSide, PlayerState>,
    equation: createEmptyEquation(),
    phase: 'resolved',
    deadHand: detectDeadHand(nextPlayer.hand),
    usedCardIds: [],
  }

  return {
    ...next,
    log: addLog(next, side, '♻️ Tactical Reset — ทิ้งทั้งมือ ข้ามการโจมตี', 'system'),
  }
}

/** Divine Aegis ของ Elara — เพิ่มเกราะให้องครักษ์ตัวที่เลือกจนถึงเทิร์นถัดไป */
export function useDivineAegis(state: GameState, guardIndex: number): GameState {
  const side = state.turn
  const player = state.players[side]

  if (player.heroId !== 'high-priestess-elara' || player.skillUsedThisTurn) {
    return state
  }

  const guards = player.guards.map((guard, index) =>
    index === guardIndex && guard.hp > 0
      ? { ...guard, divisorBonus: guard.divisorBonus + RULES.divineAegisBonus }
      : guard,
  )

  const nextPlayer: PlayerState = { ...player, guards, skillUsedThisTurn: true }
  const next: GameState = {
    ...state,
    players: { ...state.players, [side]: nextPlayer } as Record<PlayerSide, PlayerState>,
  }

  return {
    ...next,
    log: addLog(
      next,
      side,
      `🛡️ Divine Aegis — ${guards[guardIndex]?.name} เกราะ +${RULES.divineAegisBonus}`,
      'system',
    ),
  }
}

/** Arcane Manipulation ของ Arcanus — เปลี่ยนเครื่องหมายในสมการ 1 ใบ */
export function useArcaneManipulation(
  state: GameState,
  slotIndex: number,
): { state: GameState; ok: boolean; message: string } {
  const side = state.turn
  const player = state.players[side]

  if (player.heroId !== 'grand-wizard-arcanus') {
    return { state, ok: false, message: 'ฮีโร่ตัวนี้ไม่มีความสามารถนี้' }
  }
  if (player.skillUsedThisTurn) {
    return { state, ok: false, message: 'เทิร์นนี้ใช้ความสามารถไปแล้ว' }
  }

  const slot = state.equation.slots[slotIndex]
  if (!slot || slot.kind !== 'operator') {
    return { state, ok: false, message: 'เลือกการ์ดเครื่องหมายในสมการก่อน' }
  }

  // เปลี่ยนได้แค่ + เป็น × และ − เป็น + ตามที่การ์ดระบุ
  const mapping: Record<string, string> = { '+': '*', '-': '+' }
  const nextSymbol = mapping[slot.symbol ?? '']

  if (!nextSymbol) {
    return { state, ok: false, message: 'เปลี่ยนได้เฉพาะ + เป็น × หรือ − เป็น +' }
  }

  const slots = state.equation.slots.map((item, index) =>
    index === slotIndex
      ? { ...item, symbol: nextSymbol as '+' | '-' | '*' }
      : item,
  )

  const nextPlayer: PlayerState = { ...player, skillUsedThisTurn: true }
  const next: GameState = {
    ...state,
    players: { ...state.players, [side]: nextPlayer } as Record<PlayerSide, PlayerState>,
    equation: { ...state.equation, slots },
  }

  return {
    state: {
      ...next,
      log: addLog(next, side, '🔮 บิดเบือนสมการ — เปลี่ยนเครื่องหมาย 1 ใบ', 'system'),
    },
    ok: true,
    message: 'เปลี่ยนเครื่องหมายแล้ว',
  }
}

/** จบเทิร์น สลับผู้เล่น ทิ้งการ์ดที่ใช้ไป และจั่วให้ครบมือ */
export function endTurn(state: GameState): GameState {
  if (state.winner) return state

  const side = state.turn
  const nextSide = opponentOf(side)
  const player = state.players[side]

  // การ์ดที่ถูกใช้ไปในเทิร์นนี้จะถูกทิ้ง แล้วจั่วใหม่มาแทนให้ครบมือ
  const usedIds = new Set([
    ...state.usedCardIds,
    ...state.equation.slots.map((slot) => slot.cardId),
    ...state.equation.brackets.map((bracket) => bracket.cardId),
  ])

  const remainingHand = player.hand.filter((card) => !usedIds.has(card.uid))
  const usedCards = player.hand.filter((card) => usedIds.has(card.uid))

  const drawn = drawCards(
    remainingHand,
    player.drawPile,
    [...player.discardPile, ...usedCards],
    Math.max(0, RULES.handSize - remainingHand.length),
  )

  const finishedPlayer: PlayerState = {
    ...player,
    hand: drawn.hand,
    drawPile: drawn.drawPile,
    discardPile: drawn.discardPile,
    redrawsUsedThisTurn: 0,
    skillUsedThisTurn: false,
    comboStreak: RULES.comboResetsOnEndTurn ? 0 : player.comboStreak,
  }

  // โบนัสเกราะจาก Divine Aegis หมดอายุเมื่อกลับมาถึงเทิร์นของเจ้าของ
  const incoming = state.players[nextSide]
  const refreshedIncoming: PlayerState = {
    ...incoming,
    guards: incoming.guards.map((guard) => ({ ...guard, divisorBonus: 0 })),
  }

  const next: GameState = {
    ...state,
    players: {
      ...state.players,
      [side]: finishedPlayer,
      [nextSide]: refreshedIncoming,
    } as Record<PlayerSide, PlayerState>,
    turn: nextSide,
    turnNumber: state.turnNumber + 1,
    phase: 'build',
    equation: createEmptyEquation(),
    lastResult: null,
    deadHand: detectDeadHand(refreshedIncoming.hand),
    usedCardIds: [],
  }

  return {
    ...next,
    log: addLog(next, nextSide, `— เทิร์นของ ${refreshedIncoming.name} —`, 'system'),
  }
}

/** ใส่การ์ดลงในสมการ */
export function placeCard(state: GameState, uid: string): GameState {
  const player = currentPlayer(state)
  const card = player.hand.find((item) => item.uid === uid)
  if (!card || state.phase !== 'build') return state

  if (card.kind === 'bracket') return state

  const expected = state.equation.slots.length % 2 === 0 ? 'number' : 'operator'
  if (card.kind !== expected) return state

  const slot =
    card.kind === 'number'
      ? { cardId: card.uid, kind: 'number' as const, value: card.value }
      : { cardId: card.uid, kind: 'operator' as const, symbol: card.symbol }

  return { ...state, equation: { ...state.equation, slots: [...state.equation.slots, slot] } }
}

/** เอาการ์ดใบสุดท้ายออกจากสมการ */
export function undoLastCard(state: GameState): GameState {
  if (state.equation.slots.length === 0) return state

  const slots = state.equation.slots.slice(0, -1)
  const termCount = slots.filter((slot) => slot.kind === 'number').length

  // วงเล็บที่อ้างถึงตัวเลขที่หายไปต้องถูกถอดออกด้วย
  const brackets = state.equation.brackets.filter(
    (bracket) => bracket.endTerm < termCount,
  )

  return { ...state, equation: { slots, brackets } }
}

export function clearEquation(state: GameState): GameState {
  return { ...state, equation: createEmptyEquation() }
}

/** ใส่วงเล็บคร่อมตัวเลขตั้งแต่ลำดับ start ถึง end โดยใช้การ์ดถุงมือ 1 ใบ */
export function addBracket(
  state: GameState,
  startTerm: number,
  endTerm: number,
): { state: GameState; ok: boolean; message: string } {
  const player = currentPlayer(state)
  const used = new Set(state.equation.brackets.map((bracket) => bracket.cardId))
  const gauntlet = player.hand.find(
    (card) => card.kind === 'bracket' && !used.has(card.uid),
  )

  if (!gauntlet) {
    return { state, ok: false, message: 'ไม่มีการ์ดถุงมือเหลือแล้ว' }
  }
  if (startTerm >= endTerm) {
    return { state, ok: false, message: 'วงเล็บต้องคร่อมตัวเลขอย่างน้อย 2 ตัว' }
  }

  const brackets = [
    ...state.equation.brackets,
    { cardId: gauntlet.uid, startTerm, endTerm },
  ]

  return {
    state: { ...state, equation: { ...state.equation, brackets } },
    ok: true,
    message: 'ใส่วงเล็บแล้ว',
  }
}

export function removeBrackets(state: GameState): GameState {
  return { ...state, equation: { ...state.equation, brackets: [] } }
}
