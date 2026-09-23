/**
 * เครื่องยนต์ของผจญภัยเมืองแห่งเวลา
 *
 * ทุกฟังก์ชันรับสถานะเดิม แล้วคืนสถานะใหม่ ไม่แก้ของเดิม
 * ไม่แตะ React ไม่แตะ localStorage และรับตัวสุ่มจากข้างนอก
 * ชุดทดสอบจึงเล่นเกมทั้งเกมได้แบบกำหนดผลได้ โดยไม่ต้องเปิดเบราว์เซอร์
 *
 * กติกาเหมือนชุดการ์ดที่พิมพ์เล่นบนโต๊ะทุกข้อ
 * ต่างกันแค่การ์ดกระต่ายช่วยคิด ซึ่งบนโต๊ะคือชวนเพื่อนมาคิดด้วย
 * แต่บนจอไม่มีเพื่อนข้าง ๆ ให้ชวน จึงเปลี่ยนเป็นตัดคำตอบผิดออก 1 ข้อ
 *
 * กระดาน: START คือช่อง 0 · ช่อง 1–15 แบ่งเป็น 5 ด่าน ด่านละ 3 ช่อง
 * ช่อง 15 คือประตูปราสาท · ช่อง 16 คือในปราสาท (ชนะแล้ว)
 */

import { TIME_CARDS, getTimeCard } from './cards'
import type { DeckType, TimeCard } from './cards'

export type HeroKey = 'knight' | 'fairy' | 'wizard' | 'dragon'
export type SpecialKey = 'boost' | 'lucky' | 'travel' | 'shield' | 'fast' | 'chest' | 'bunny'
export type Rng = () => number

export const HERO_KEYS: HeroKey[] = ['knight', 'fairy', 'wizard', 'dragon']
export const HERO_INFO: Record<HeroKey, { name: string; color: string }> = {
  knight: { name: 'อัศวินทิม', color: '#1E88D9' },
  fairy: { name: 'นางฟ้าใบเตย', color: '#E85D9E' },
  wizard: { name: 'พ่อมดโมโม่', color: '#7C4DDB' },
  dragon: { name: 'มังกรน้อยฟูฟู', color: '#3E9E4F' },
}

export const SPECIAL_INFO: Record<SpecialKey, { emoji: string; name: string; effect: string; when: string }> = {
  boost: { emoji: '⏰', name: 'TIME BOOST', effect: 'ตอบถูก รับเหรียญเพิ่มอีก 1 เหรียญ', when: 'กดก่อนตอบ' },
  lucky: { emoji: '🍀', name: 'LUCKY HOUR', effect: 'ไม่อยากตอบใบนี้? เปลี่ยนการ์ดใหม่ได้', when: 'กดก่อนตอบ' },
  travel: { emoji: '🔄', name: 'TIME TRAVEL', effect: 'วาร์ปไปข้างหน้า 1 ช่องทันที', when: 'กดตอนเริ่มตา' },
  shield: { emoji: '🛡️', name: 'TIME SHIELD', effect: 'ตอบผิด? ได้ตอบใหม่อีก 1 ครั้ง', when: 'ใช้หลังตอบผิด' },
  fast: { emoji: '🚀', name: 'FAST TIME', effect: 'ตอบถูก เดินเพิ่มอีก 2 ช่อง', when: 'กดก่อนตอบ' },
  chest: { emoji: '🎁', name: 'TIME CHEST', effect: 'เปิดหีบ! รับ 2 เหรียญทันที', when: 'เปิดทันที' },
  bunny: { emoji: '🐰', name: 'กระต่ายช่วยคิด', effect: 'กระต่ายช่วยตัดคำตอบผิดออก 1 ข้อ', when: 'กดก่อนตอบ' },
}

/** การ์ดพิเศษ 8 ใบ เหมือนชุดพิมพ์ (โล่มี 2 ใบ) */
export const SPECIAL_DECK: SpecialKey[] = ['boost', 'lucky', 'travel', 'shield', 'shield', 'fast', 'chest', 'bunny']
export const STAR_SQUARES = [2, 5, 8, 11, 14]
export const GATE = 15
export const CASTLE = 16
export const HAND_LIMIT = 2
export const MAX_PLAYERS = 4

export interface TaPlayer {
  name: string
  hero: HeroKey
  pos: number
  coins: number
  hand: SpecialKey[]
  /** ตอบถูกไปกี่ข้อ ใช้คิดรางวัลและบันทึกสถิติ */
  correct: number
  answered: number
  /**
   * การ์ดที่ตอบไปแล้วตามลำดับ ใช้สรุปท้ายเกมว่าควรฝึกอะไรเพิ่ม
   * เก็บแค่รหัสการ์ดกับถูกผิด ไม่ได้เก็บว่าเด็กตอบอะไร
   */
  history: AnswerRecord[]
}

export interface AnswerRecord {
  id: string
  ok: boolean
}

export interface TaState {
  players: TaPlayer[]
  turn: number
  round: number
  easy: boolean
  decks: Record<DeckType, string[]>
  specials: SpecialKey[]
  /** ใช้การ์ดพิเศษไปแล้วในตานี้หรือยัง (ใช้ได้ตาละ 1 ใบ) */
  usedSpecial: boolean
  winner: number | null
}

export type Answer =
  | { kind: 'choice'; index: number }
  | { kind: 'order'; order: number[] }
  | { kind: 'set'; h: number; m: number }

export function shuffle<T>(list: readonly T[], rng: Rng): T[] {
  const out = list.slice()
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

function freshDeck(deck: DeckType, easy: boolean, rng: Rng): string[] {
  return shuffle(
    TIME_CARDS.filter((card) => card.deck === deck && !(easy && card.stars === 3)).map((card) => card.id),
    rng,
  )
}

export interface NewPlayer {
  name: string
  hero: HeroKey
}

export function createGame(players: NewPlayer[], easy: boolean, rng: Rng): TaState {
  const count = Math.max(1, Math.min(MAX_PLAYERS, players.length))
  return {
    players: players.slice(0, count).map((player) => ({
      name: player.name.trim() || HERO_INFO[player.hero].name,
      hero: player.hero,
      pos: 0,
      coins: 0,
      hand: [],
      correct: 0,
      answered: 0,
      history: [],
    })),
    turn: 0,
    round: 1,
    easy,
    decks: {
      time: freshDeck('time', easy, rng),
      find: freshDeck('find', easy, rng),
      daily: freshDeck('daily', easy, rng),
      chal: freshDeck('chal', easy, rng),
    },
    specials: shuffle(SPECIAL_DECK, rng),
    usedSpecial: false,
    winner: null,
  }
}

/** ด่านของช่องนั้น START นับเป็นด่าน 1 */
export function zoneOf(pos: number): 1 | 2 | 3 | 4 | 5 {
  if (pos <= 3) return 1
  if (pos <= 6) return 2
  if (pos <= 9) return 3
  if (pos <= 12) return 4
  return 5
}

const ZONE_DECK: Record<1 | 2 | 3 | 4, DeckType> = { 1: 'time', 2: 'find', 3: 'daily', 4: 'chal' }

/**
 * กองที่ผู้เล่นคนนี้จั่วได้
 *
 * ด่าน 1–4 มีกองเดียวตามด่าน ด่าน 5 เลือกได้ทุกกอง
 * ส่วนประตูปราสาทต้องเป็นการ์ดท้าทายเท่านั้น
 */
export function deckChoices(state: TaState): DeckType[] {
  const pos = state.players[state.turn].pos
  if (pos === GATE) return ['chal']
  const zone = zoneOf(pos)
  if (zone === 5) return ['time', 'find', 'daily', 'chal']
  return [ZONE_DECK[zone]]
}

export function atGate(state: TaState): boolean {
  return state.players[state.turn].pos === GATE
}

/** จั่วการ์ดใบบนสุด กองหมดแล้วสับใหม่ทั้งกอง */
export function drawCard(state: TaState, deck: DeckType, rng: Rng): { state: TaState; card: TimeCard } {
  let pile = state.decks[deck]
  if (pile.length === 0) pile = freshDeck(deck, state.easy, rng)
  const [id, ...rest] = pile
  const card = getTimeCard(id)
  if (!card) throw new Error(`ไม่พบการ์ด ${id}`)
  return { state: { ...state, decks: { ...state.decks, [deck]: rest } }, card }
}

export function isCorrect(card: TimeCard, answer: Answer): boolean {
  if (card.kind === 'choice') return answer.kind === 'choice' && answer.index === card.answer
  if (card.kind === 'order') {
    return (
      answer.kind === 'order' &&
      answer.order.length === card.order.length &&
      answer.order.every((value, i) => value === card.order[i])
    )
  }
  // ตรวจเฉพาะตำแหน่งบนหน้าปัด 12 ชั่วโมง จึงเทียบชั่วโมงแบบหาร 12 ลงตัว
  return answer.kind === 'set' && answer.h % 12 === card.target[0] % 12 && answer.m === card.target[1]
}

function updatePlayer(state: TaState, index: number, changes: Partial<TaPlayer>): TaState {
  return {
    ...state,
    players: state.players.map((player, i) => (i === index ? { ...player, ...changes } : player)),
  }
}

/** มีการ์ดพิเศษใบนี้และยังใช้ได้ในตานี้หรือไม่ */
export function canUse(state: TaState, key: SpecialKey): boolean {
  return !state.usedSpecial && state.winner === null && state.players[state.turn].hand.includes(key)
}

/** ใช้การ์ดพิเศษ: ออกจากมือ กลับไปใต้กอง และนับว่าตานี้ใช้แล้ว */
export function spendSpecial(state: TaState, key: SpecialKey): TaState {
  if (!canUse(state, key)) return state
  const player = state.players[state.turn]
  const hand = player.hand.slice()
  hand.splice(hand.indexOf(key), 1)
  return { ...updatePlayer(state, state.turn, { hand }), specials: [...state.specials, key], usedSpecial: true }
}

/** ยกเลิก BOOST หรือ FAST ที่กดไว้ ก่อนตอบ (เด็กกดพลาดบ่อย) */
export function cancelSpecial(state: TaState, key: SpecialKey): TaState {
  const at = state.specials.lastIndexOf(key)
  if (at < 0 || !state.usedSpecial) return state
  const specials = state.specials.slice()
  specials.splice(at, 1)
  const player = state.players[state.turn]
  return { ...updatePlayer(state, state.turn, { hand: [...player.hand, key] }), specials, usedSpecial: false }
}

/** TIME TRAVEL: เดิน 1 ช่องทันทีตอนเริ่มตา ไม่เกินประตูปราสาท */
export function travel(state: TaState): TaState {
  if (!canUse(state, 'travel') || atGate(state)) return state
  const used = spendSpecial(state, 'travel')
  const pos = Math.min(GATE, used.players[used.turn].pos + 1)
  return updatePlayer(used, used.turn, { pos })
}

/** กระต่ายช่วยคิด: เลือกตัวเลือกผิด 1 ข้อที่จะตัดออก คืน -1 ถ้าใช้ไม่ได้ */
export function bunnyRemoves(card: TimeCard, alreadyGone: number[], rng: Rng): number {
  if (card.kind !== 'choice' || card.options.length < 3) return -1
  const wrong = card.options.map((_, i) => i).filter((i) => i !== card.answer && !alreadyGone.includes(i))
  if (wrong.length === 0) return -1
  return wrong[Math.floor(rng() * wrong.length)]
}

export interface AnswerOutcome {
  state: TaState
  correct: boolean
  coinsGained: number
  from: number
  to: number
  won: boolean
}

/**
 * บันทึกผลการตอบ
 *
 * boost กับ fast คือการ์ดพิเศษที่กดใช้ไว้ก่อนตอบ (ถูกนำออกจากมือไปแล้ว)
 * ตอบถูก: ได้เหรียญและเดินตามดาว · ที่ประตูปราสาทตอบถูกคือชนะ
 * ตอบผิด: อยู่ที่เดิม ไม่เสียอะไร
 */
export function applyAnswer(
  state: TaState,
  card: TimeCard,
  correct: boolean,
  options: { boost?: boolean; fast?: boolean } = {},
): AnswerOutcome {
  const index = state.turn
  const player = state.players[index]
  const from = player.pos
  const answered = player.answered + 1
  const history = [...player.history, { id: card.id, ok: correct }]

  if (!correct) {
    return { state: updatePlayer(state, index, { answered, history }), correct, coinsGained: 0, from, to: from, won: false }
  }

  const coinsGained = options.boost ? 2 : 1
  const base = { coins: player.coins + coinsGained, correct: player.correct + 1, answered, history }

  if (from === GATE) {
    const won = { ...updatePlayer(state, index, { ...base, pos: CASTLE }), winner: index }
    return { state: won, correct, coinsGained, from, to: CASTLE, won: true }
  }

  const to = Math.min(GATE, from + card.stars + (options.fast ? 2 : 0))
  return { state: updatePlayer(state, index, { ...base, pos: to }), correct, coinsGained, from, to, won: false }
}

/** ตอบผิดไปแล้วแต่ขอใช้โล่ตอบใหม่: ไม่นับเป็นการตอบเพิ่ม */
export function undoWrongAnswerCount(state: TaState): TaState {
  const player = state.players[state.turn]
  const last = player.history[player.history.length - 1]
  return updatePlayer(state, state.turn, {
    answered: Math.max(0, player.answered - 1),
    history: last && !last.ok ? player.history.slice(0, -1) : player.history,
  })
}

export interface DeckTally {
  right: number
  total: number
}

export interface PlayerReview {
  byDeck: Record<DeckType, DeckTally>
  /** การ์ดที่เคยตอบผิด ไม่ซ้ำ เรียงตามที่เจอ */
  missed: string[]
}

/**
 * สรุปของผู้เล่นหนึ่งคน สำหรับหน้าจอท้ายเกม
 *
 * การ์ดที่ผิดแล้วภายหลังตอบถูกยังอยู่ในรายการ เพราะหน้าจอท้ายเกม
 * มีไว้บอกว่าอะไรที่เคยสะดุด ไม่ใช่บอกว่าอะไรยังไม่ผ่าน
 */
export function reviewOf(player: TaPlayer): PlayerReview {
  const byDeck: Record<DeckType, DeckTally> = {
    time: { right: 0, total: 0 },
    find: { right: 0, total: 0 },
    daily: { right: 0, total: 0 },
    chal: { right: 0, total: 0 },
  }
  const missed: string[] = []
  for (const entry of player.history) {
    const card = getTimeCard(entry.id)
    if (!card) continue
    byDeck[card.deck].total += 1
    if (entry.ok) byDeck[card.deck].right += 1
    else if (!missed.includes(card.id)) missed.push(card.id)
  }
  return { byDeck, missed }
}

/* ── เกมที่เล่นค้าง ───────────────────────────────────────── */

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
const isCount = (value: unknown, max: number): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= max
const DECKS: DeckType[] = ['time', 'find', 'daily', 'chal']
const SPECIAL_KEYS = Object.keys(SPECIAL_INFO) as SpecialKey[]

/**
 * ตรวจเกมที่อ่านกลับมาจาก localStorage ก่อนใช้
 *
 * ข้อมูลในเครื่องแก้ด้วยมือได้ และอาจเป็นของเวอร์ชันเก่าที่รูปร่างต่างไป
 * ถ้าใช้ตรง ๆ หน้าจอจะพังกลางคาบ ซึ่งแย่กว่าการเริ่มเกมใหม่มาก
 * อะไรที่ดูไม่ถูกต้องจึงคืน null แล้วให้เด็กเริ่มใหม่ ไม่พยายามซ่อม
 * การ์ดพิเศษต้องครบ 8 ใบเท่าเดิม ไม่งั้นแก้ข้อมูลเพื่อเสกการ์ดได้
 */
export function parseSavedGame(raw: unknown): TaState | null {
  if (!isRecord(raw) || !Array.isArray(raw.players) || !isRecord(raw.decks) || !Array.isArray(raw.specials)) return null
  const count = raw.players.length
  if (count < 1 || count > MAX_PLAYERS) return null

  const players: TaPlayer[] = []
  for (const item of raw.players) {
    if (!isRecord(item)) return null
    const hero = item.hero as HeroKey
    if (!HERO_KEYS.includes(hero) || typeof item.name !== 'string' || item.name.length > 40) return null
    if (!isCount(item.pos, CASTLE) || !isCount(item.coins, 9999) || !isCount(item.correct, 9999) || !isCount(item.answered, 9999)) return null
    if (!Array.isArray(item.hand) || item.hand.length > HAND_LIMIT || !item.hand.every((k) => SPECIAL_KEYS.includes(k as SpecialKey))) return null
    const history: AnswerRecord[] = []
    if (Array.isArray(item.history)) {
      for (const entry of item.history) {
        if (isRecord(entry) && typeof entry.id === 'string' && getTimeCard(entry.id) && typeof entry.ok === 'boolean') {
          history.push({ id: entry.id, ok: entry.ok })
        }
      }
    }
    players.push({
      name: item.name,
      hero,
      pos: item.pos,
      coins: item.coins,
      correct: item.correct,
      answered: item.answered,
      hand: item.hand as SpecialKey[],
      history,
    })
  }

  const decks = {} as Record<DeckType, string[]>
  for (const deck of DECKS) {
    const pile = raw.decks[deck]
    if (!Array.isArray(pile) || !pile.every((id) => typeof id === 'string' && getTimeCard(id)?.deck === deck)) return null
    decks[deck] = pile as string[]
  }

  if (!raw.specials.every((k) => SPECIAL_KEYS.includes(k as SpecialKey))) return null
  const specials = raw.specials as SpecialKey[]
  const inHands = players.reduce((sum, player) => sum + player.hand.length, 0)
  if (specials.length + inHands !== SPECIAL_DECK.length) return null

  const winner = raw.winner === null ? null : isCount(raw.winner, count - 1) ? raw.winner : undefined
  if (winner === undefined || !isCount(raw.turn, count - 1) || !isCount(raw.round, 9999) || raw.round < 1) return null

  return {
    players,
    turn: raw.turn,
    round: raw.round,
    easy: raw.easy === true,
    decks,
    specials,
    usedSpecial: raw.usedSpecial === true,
    winner,
  }
}

/**
 * จบตาบนช่องดาวหรือไม่
 *
 * นับเฉพาะเมื่อตานี้ได้เดินมาหยุดที่ช่องดาวจริง
 * คนที่ตอบผิดแล้วยืนอยู่บนดาวเดิมจะไม่ได้การ์ดซ้ำทุกตา
 */
export function landsOnStar(from: number, to: number): boolean {
  return to !== from && STAR_SQUARES.includes(to)
}

export interface StarDraw {
  state: TaState
  special: SpecialKey | null
  /** ต้องเลือกทิ้ง เพราะมือเต็ม */
  mustDrop: boolean
}

/** จั่วการ์ดพิเศษ หีบสมบัติเปิดทันทีแล้วกลับเข้ากอง ใบอื่นรอให้เก็บ */
export function drawSpecial(state: TaState): StarDraw {
  if (state.specials.length === 0) return { state, special: null, mustDrop: false }
  const [special, ...rest] = state.specials
  const player = state.players[state.turn]
  if (special === 'chest') {
    const next = updatePlayer({ ...state, specials: [...rest, 'chest'] }, state.turn, { coins: player.coins + 2 })
    return { state: next, special, mustDrop: false }
  }
  return { state: { ...state, specials: rest }, special, mustDrop: player.hand.length >= HAND_LIMIT }
}

/**
 * เก็บการ์ดพิเศษที่จั่วได้ ถ้ามือเต็มต้องบอกว่าทิ้งใบไหน
 * dropIndex นับจากมือเดิมต่อด้วยใบใหม่ (ใบใหม่คือตำแหน่งสุดท้าย)
 */
export function keepSpecial(state: TaState, special: SpecialKey, dropIndex?: number): TaState {
  const player = state.players[state.turn]
  const all = [...player.hand, special]
  let dropped: SpecialKey | null = null
  if (all.length > HAND_LIMIT) {
    const at = dropIndex !== undefined && dropIndex >= 0 && dropIndex < all.length ? dropIndex : all.length - 1
    dropped = all.splice(at, 1)[0]
  }
  const next = updatePlayer(state, state.turn, { hand: all })
  return dropped ? { ...next, specials: [...next.specials, dropped] } : next
}

export function endTurn(state: TaState): TaState {
  const turn = (state.turn + 1) % state.players.length
  return { ...state, turn, round: turn === 0 ? state.round + 1 : state.round, usedSpecial: false }
}

/** อันดับ: เข้าปราสาทก่อน · เหรียญมากกว่า · อยู่ใกล้ปราสาทกว่า */
export function ranking(state: TaState): number[] {
  return state.players
    .map((_, i) => i)
    .sort((a, b) => {
      const A = state.players[a]
      const B = state.players[b]
      return (
        Number(B.pos === CASTLE) - Number(A.pos === CASTLE) || B.coins - A.coins || B.pos - A.pos
      )
    })
}

/**
 * เหรียญที่ผู้เล่นในแอปได้เมื่อจบเกม
 *
 * คิดจากข้อที่ตอบถูกของทุกคนในวง เพราะเกมนี้เล่นกันหลายคนบนเครื่องเดียว
 * และเครื่องนั้นมีบัญชีผู้เล่นแค่บัญชีเดียว
 * มีเพดาน เพื่อไม่ให้การนั่งเล่นเกมนี้ยาว ๆ กลายเป็นทางปั๊มเหรียญที่ง่ายกว่าโหมดอื่น
 */
export const REWARD_BASE = 10
export const REWARD_PER_CORRECT = 2
export const REWARD_CASTLE = 15
export const REWARD_MAX = 80

export function appReward(state: TaState): number {
  const correct = state.players.reduce((sum, player) => sum + player.correct, 0)
  const castle = state.winner !== null ? REWARD_CASTLE : 0
  return Math.min(REWARD_MAX, REWARD_BASE + correct * REWARD_PER_CORRECT + castle)
}

export function totalCorrect(state: TaState): number {
  return state.players.reduce((sum, player) => sum + player.correct, 0)
}
