/**
 * เครื่องยนต์ของ ZOMBIE RESCUE: ภารกิจรอดชีวิต พิชิตไวรัสซอมบี้
 *
 * ทุกฟังก์ชันรับสถานะเดิม แล้วคืนสถานะใหม่ ไม่แก้ของเดิม
 * ไม่แตะ React ไม่แตะ localStorage และรับตัวสุ่มจากข้างนอก
 * ชุดทดสอบจึงเล่นเกมทั้งเกมได้แบบกำหนดผลได้ โดยไม่ต้องเปิดเบราว์เซอร์
 *
 * วงจรของเกม: สำรวจ → เจอซอมบี้ → แก้โจทย์คูณ → ได้ทรัพยากร → สร้างยา → รักษาผู้ติดเชื้อ
 *
 * เป็นเกมร่วมมือ ทุกคนในวงคือ "ทีมผู้รอดชีวิต" เดียวกัน
 * ผลคูณของทุกข้อที่ตอบถูกเข้าหลอดพลังวัคซีนของทีม
 * เมื่อหลอดเต็มและมีคนไปถึงหน้าประตู Z-CURE CENTER แล้วทำภารกิจของ ดร.ซอมโบ ได้ ทั้งทีมชนะ
 * ตั้งใจไม่ให้มีคนแพ้ เพราะเด็กที่คิดช้าต้องยังอยากเล่นต่อ และยังช่วยทีมได้ทุกข้อที่ตอบถูก
 *
 * ทรัพยากร 4 อย่างตามแนวคิดของเกม
 * ❤️ พลังชีวิต (คนละ 3 ดวง) · 💉 ยา (ไอเทมในกระเป๋า) · 🥫 เสบียง (ใช้ซื้อของที่ตลาด)
 * 🧪 พลังวัคซีน (ของทีม)
 */

import { DOOR, START, checkpointFor, squareKind, zoneOf } from './board'
import type { SquareKind } from './board'
import { TABLES, makeQuestion, signatureOf } from './questions'
import type { Question, Rng, Stage, Table } from './questions'

export type HeroKey = 'scientist' | 'doctor' | 'scout' | 'dog'
export type ItemKey = 'medkit' | 'help' | 'radio' | 'shield' | 'skate'
export type EventKey = 'heli' | 'share' | 'vaccine' | 'rain' | 'sniff' | 'chase' | 'power' | 'again'
export type AnswerContext = 'turn' | 'zombie' | 'boss'

export const HERO_KEYS: HeroKey[] = ['scientist', 'doctor', 'scout', 'dog']
export const HERO_INFO: Record<HeroKey, { name: string; role: string; color: string }> = {
  scientist: { name: 'มิ้นท์', role: 'นักวิทยาศาสตร์ตัวน้อย', color: '#E85D9E' },
  doctor: { name: 'ภู', role: 'หมอน้อย', color: '#1E88D9' },
  scout: { name: 'ต้น', role: 'ลูกเสือนักสำรวจ', color: '#F28C28' },
  dog: { name: 'บิสกิต', role: 'หมาดมกลิ่น', color: '#9A6433' },
}

export const ITEM_KEYS: ItemKey[] = ['medkit', 'help', 'radio', 'shield', 'skate']
export const ITEM_INFO: Record<ItemKey, { emoji: string; name: string; effect: string; when: string; price: number }> = {
  medkit: { emoji: '💉', name: 'ยา', effect: 'ฟื้น ❤️ 1 ดวง', when: 'ใช้ตอนเริ่มตา', price: 2 },
  help: { emoji: '💡', name: 'บัตรช่วยคิด', effect: 'ดูคำใบ้แล้วตอบใหม่ได้ 1 ครั้ง', when: 'ใช้หลังตอบผิด', price: 2 },
  radio: { emoji: '📻', name: 'วิทยุ', effect: 'ขอเปลี่ยนเป็นโจทย์ข้อใหม่', when: 'ใช้ก่อนตอบ', price: 2 },
  shield: { emoji: '🛡️', name: 'โล่', effect: 'กันไม่ให้เสีย ❤️ 1 ครั้ง', when: 'ใช้เองตอนจะเสีย ❤️', price: 3 },
  skate: { emoji: '🛹', name: 'สเก็ตบอร์ด', effect: 'เดินเพิ่มอีก 2 ช่อง', when: 'ใช้หลังทอยลูกเต๋า', price: 3 },
}

export const EVENT_INFO: Record<EventKey, { emoji: string; name: string; effect: string }> = {
  heli: { emoji: '🚁', name: 'เฮลิคอปเตอร์กู้ภัย', effect: 'บินไปข้างหน้า 3 ช่อง' },
  share: { emoji: '🎒', name: 'แบ่งเสบียง', effect: 'ทุกคนในทีมได้ 🥫 1' },
  vaccine: { emoji: '🧪', name: 'เจอหลอดวัคซีน', effect: 'ทีมได้พลังวัคซีน +10' },
  rain: { emoji: '🌧️', name: 'ฝนยาวิเศษ', effect: 'ทุกคนในทีมฟื้น ❤️ 1' },
  sniff: { emoji: '🐶', name: 'บิสกิตดมเจอ!', effect: 'ได้ 💡 บัตรช่วยคิด 1 ใบ' },
  chase: { emoji: '🧟', name: 'ซอมบี้วิ่งตาม!', effect: 'ถอยหลัง 2 ช่อง' },
  power: { emoji: '⚡', name: 'พลังคูณสอง', effect: 'ข้อถัดไปที่ตอบถูก ได้พลังวัคซีน 2 เท่า' },
  again: { emoji: '🎲', name: 'โชคดี!', effect: 'เล่นต่ออีก 1 ตา' },
}
export const EVENT_DECK: EventKey[] = ['heli', 'share', 'vaccine', 'rain', 'sniff', 'chase', 'power', 'again']

export const MAX_PLAYERS = 4
export const MAX_LIVES = 3
export const BAG_LIMIT = 4
export const START_SUPPLIES = 2
export const SKATE_STEPS = 2
export const HELI_STEPS = 3
export const CHASE_STEPS = 2
export const EVENT_VACCINE = 10
export const SUPPLY_COINS = 2
export const RECENT_LIMIT = 8

/**
 * พลังวัคซีนที่ทีมต้องเก็บให้ครบ
 *
 * ปรับจากการจำลองเกมหลายพันเกมในชุดทดสอบ
 * คนแรกที่ถึงหน้าประตูมักต้องทำภารกิจของ ดร.ซอมโบ อีก 1–2 ข้อหลอดถึงจะเต็ม
 * ภารกิจสุดท้ายจึงเป็นด่านจริง ไม่ใช่ถึงปุ๊บชนะปั๊บ และยังไม่ลากยาวจนเด็กเบื่อ
 * คนแรกคิดเต็ม ส่วนคนต่อไปคิดน้อยกว่า เพราะตอนคนแรกถึงประตู เพื่อน ๆ ยังเดินตามหลังอยู่
 * ระดับง่ายใช้เป้าต่ำกว่า เพราะโจทย์มีไม่เกิน 5 กลุ่ม ผลคูณจึงเล็กกว่า
 */
export const TARGET = { normal: { first: 300, more: 200 }, easy: { first: 190, more: 110 } }

export function targetFor(players: number, easy: boolean): number {
  const count = Math.max(1, Math.min(MAX_PLAYERS, players))
  const t = easy ? TARGET.easy : TARGET.normal
  return t.first + t.more * (count - 1)
}

export interface AnswerRecord {
  /** แม่สูตรคูณของข้อนั้น ใช้สรุปท้ายเกมว่าแม่ไหนยังสะดุด */
  t: Table
  ok: boolean
}

export interface ZrPlayer {
  name: string
  hero: HeroKey
  pos: number
  lives: number
  supplies: number
  items: ItemKey[]
  /** พลังวัคซีนที่คนนี้หามาให้ทีม */
  energy: number
  /** ผู้ติดเชื้อที่คนนี้รักษาได้ */
  rescued: number
  correct: number
  answered: number
  knockouts: number
  /** ⚡ ข้อถัดไปที่ตอบถูกได้พลังสองเท่า */
  boost: boolean
  history: AnswerRecord[]
}

export interface ZrState {
  players: ZrPlayer[]
  turn: number
  round: number
  easy: boolean
  team: { energy: number; rescued: number }
  target: number
  events: EventKey[]
  /** คนนี้ได้เล่นต่ออีกตา (จากการ์ด 🎲) */
  again: boolean
  cured: boolean
  curedBy: number | null
  /** ลายเซ็นโจทย์ที่เพิ่งถาม */
  recent: string[]
}

export interface NewPlayer {
  name: string
  hero: HeroKey
}

export function shuffle<T>(list: readonly T[], rng: Rng): T[] {
  const out = list.slice()
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

/** ชื่อตัวละครยาวได้เท่านี้ (ช่องชื่อในหน้าเริ่มเกมก็จำกัดเท่ากัน) */
export const NAME_MAX = 16

/** ชื่อน่ารักสำหรับปุ่ม 🎲 สุ่มชื่อ (ไม่ซ้ำกับชื่อชาวเมืองในสมุดวัคซีน เพื่อไม่ให้สับสนว่าใครเป็นใคร) */
export const CUTE_NAMES = [
  'กัปตันแครอท', 'ฮีโร่ถั่วงอก', 'หมอมะม่วง', 'ไข่ดาวผู้กล้า', 'สายฟ้าจิ๋ว', 'ดาวเหนือ', 'ลูกเจี๊ยบ', 'ป๊อปคอร์น',
  'ขนมเปี๊ยะ', 'จรวดน้อย', 'ปุยนุ่น', 'เต่าทอง', 'แมวส้ม', 'ลูกโป่ง', 'หมีน้อย', 'เป็ดเหลือง',
]

/** สุ่มชื่อน่ารักที่ยังไม่มีใครในวงใช้ */
export function randomCuteName(rng: Rng, taken: string[]): string {
  const free = CUTE_NAMES.filter((n) => !taken.includes(n))
  const list = free.length ? free : CUTE_NAMES
  return list[Math.floor(rng() * list.length)]
}

/**
 * ชื่อที่ใช้ในเกมของแต่ละคน: ไม่ใส่ใช้ชื่อตัวละคร ยาวเกินตัดที่ NAME_MAX
 * ชื่อซ้ำกันเติมเลขต่อท้าย (ต้น, ต้น 2) เพราะป้าย "ตาของ…" กับป้ายชื่อบนกระดานต้องบอกได้ว่าเป็นใคร
 */
export function playerNames(players: NewPlayer[]): string[] {
  const out: string[] = []
  for (const p of players) {
    const base = p.name.trim().replace(/\s+/g, ' ').slice(0, NAME_MAX) || HERO_INFO[p.hero].name
    let name = base
    for (let n = 2; out.includes(name); n += 1) name = `${base} ${n}`
    out.push(name)
  }
  return out
}

export function createGame(players: NewPlayer[], easy: boolean, rng: Rng): ZrState {
  const list = players.slice(0, MAX_PLAYERS)
  if (list.length === 0) list.push({ name: '', hero: 'scientist' })
  const names = playerNames(list)
  return {
    players: list.map((p, i) => ({
      name: names[i],
      hero: p.hero,
      pos: START,
      lives: MAX_LIVES,
      supplies: START_SUPPLIES,
      // ระดับง่ายได้ยาติดกระเป๋าไว้ 1 ขวด เผื่อตอบผิดติด ๆ กันตอนเริ่ม
      items: easy ? ['help', 'medkit'] : ['help'],
      energy: 0,
      rescued: 0,
      correct: 0,
      answered: 0,
      knockouts: 0,
      boost: false,
      history: [],
    })),
    turn: 0,
    round: 1,
    easy,
    team: { energy: 0, rescued: 0 },
    target: targetFor(list.length, easy),
    events: shuffle(EVENT_DECK, rng),
    again: false,
    cured: false,
    curedBy: null,
    recent: [],
  }
}

export const current = (state: ZrState): ZrPlayer => state.players[state.turn]

function updatePlayer(state: ZrState, index: number, changes: Partial<ZrPlayer>): ZrState {
  return { ...state, players: state.players.map((p, i) => (i === index ? { ...p, ...changes } : p)) }
}

/** ด่านของคนที่ถึงตา: หน้าประตูคือภารกิจของ ดร.ซอมโบ */
export function stageOf(pos: number): Stage {
  return pos >= DOOR ? 'boss' : zoneOf(pos)
}

/** ขอโจทย์ใหม่ของด่านนี้ และจำไว้ว่าเพิ่งถามข้อนี้ */
export function nextQuestion(state: ZrState, stage: Stage, rng: Rng): { state: ZrState; question: Question } {
  const question = makeQuestion(stage, rng, { easy: state.easy, recent: state.recent })
  const recent = [...state.recent, signatureOf(question)].slice(-RECENT_LIMIT)
  return { state: { ...state, recent }, question }
}

/* ── ไอเทม ─────────────────────────────────────────────── */

export function hasItem(state: ZrState, key: ItemKey): boolean {
  return current(state).items.includes(key)
}

/** ใช้ไอเทม 1 ชิ้นของคนที่ถึงตา ไม่มีก็คืนสถานะเดิม */
export function spendItem(state: ZrState, key: ItemKey): ZrState {
  const player = current(state)
  const at = player.items.indexOf(key)
  if (at < 0) return state
  const items = player.items.slice()
  items.splice(at, 1)
  return updatePlayer(state, state.turn, { items })
}

/** 💉 ฟื้น ❤️ 1 ดวง ใช้ได้เมื่อยังไม่เต็ม */
export function takeMedkit(state: ZrState): ZrState {
  const player = current(state)
  if (player.lives >= MAX_LIVES || !player.items.includes('medkit')) return state
  const used = spendItem(state, 'medkit')
  return updatePlayer(used, used.turn, { lives: player.lives + 1 })
}

/** เพิ่มไอเทม ถ้ากระเป๋าเต็มได้เสบียงแทน คืนว่าได้ของจริงหรือไม่ */
function giveItem(state: ZrState, index: number, key: ItemKey): { state: ZrState; kept: boolean } {
  const player = state.players[index]
  if (player.items.length >= BAG_LIMIT) {
    return { state: updatePlayer(state, index, { supplies: player.supplies + SUPPLY_COINS }), kept: false }
  }
  return { state: updatePlayer(state, index, { items: [...player.items, key] }), kept: true }
}

/** เหตุผลที่ซื้อไม่ได้ หรือ null ถ้าซื้อได้ */
export function buyBlocker(state: ZrState, key: ItemKey): string | null {
  const player = current(state)
  if (player.supplies < ITEM_INFO[key].price) return 'เสบียงไม่พอ'
  if (player.items.length >= BAG_LIMIT) return 'กระเป๋าเต็ม'
  return null
}

export function buy(state: ZrState, key: ItemKey): ZrState {
  if (buyBlocker(state, key)) return state
  const player = current(state)
  return updatePlayer(state, state.turn, {
    supplies: player.supplies - ITEM_INFO[key].price,
    items: [...player.items, key],
  })
}

/* ── ตอบโจทย์ ───────────────────────────────────────────── */

export interface AnswerOutcome {
  state: ZrState
  correct: boolean
  energy: number
  supplies: number
  lifeLost: boolean
  shieldUsed: boolean
  knockedOut: boolean
  /** ตำแหน่งหลังหมดแรง (ถ้าหมดแรง) */
  from: number
  to: number
  rescued: boolean
  cured: boolean
}

/**
 * บันทึกผลการตอบข้อหนึ่ง (หลังใช้บัตรช่วยคิดแล้ว ถ้ามี)
 *
 * turn: โจทย์ประจำตา · zombie: เจอผู้ติดเชื้อบนช่อง ⚠️ · boss: ภารกิจของ ดร.ซอมโบ
 * ถูก: ได้พลังวัคซีนเท่าผลคูณ และเสบียง · ช่อง ⚠️ นับเป็นการรักษาผู้ติดเชื้อ 1 คน
 * ภารกิจของ ดร.ซอมโบ ตอบถูกตอนหลอดพลังเต็มแล้ว = สร้าง Z-CURE สำเร็จ
 * ผิด: "ซอมบี้เข้ามาใกล้แล้ว!" เสีย ❤️ 1 (มีโล่ใช้โล่แทน)
 * ❤️ หมด: หมดแรง กลับไปจุดพักฟื้นล่าสุด แล้วฟื้นเต็ม ไม่มีใครตกรอบ
 */
export function answerQuestion(state: ZrState, q: Question, correct: boolean, context: AnswerContext): AnswerOutcome {
  const index = state.turn
  const player = state.players[index]
  const from = player.pos
  const answered = player.answered + 1
  const history = [...player.history, { t: q.each, ok: correct }]

  if (correct) {
    const energy = q.product * (player.boost ? 2 : 1)
    const supplies = context === 'zombie' ? 2 : 1
    const rescued = context === 'zombie'
    let next = updatePlayer(state, index, {
      answered,
      history,
      correct: player.correct + 1,
      energy: player.energy + energy,
      supplies: player.supplies + supplies,
      rescued: player.rescued + (rescued ? 1 : 0),
      boost: false,
    })
    const team = { energy: state.team.energy + energy, rescued: state.team.rescued + (rescued ? 1 : 0) }
    next = { ...next, team }
    const cured = context === 'boss' && team.energy >= state.target
    if (cured) next = { ...next, cured: true, curedBy: index }
    return { state: next, correct, energy, supplies, lifeLost: false, shieldUsed: false, knockedOut: false, from, to: from, rescued, cured }
  }

  const base = { correct, energy: 0, supplies: 0, rescued: false, cured: false }
  if (player.items.includes('shield')) {
    const shielded = spendItem(updatePlayer(state, index, { answered, history }), 'shield')
    return { ...base, state: shielded, lifeLost: false, shieldUsed: true, knockedOut: false, from, to: from }
  }
  const lives = player.lives - 1
  if (lives > 0) {
    return { ...base, state: updatePlayer(state, index, { answered, history, lives }), lifeLost: true, shieldUsed: false, knockedOut: false, from, to: from }
  }
  const to = checkpointFor(from)
  const out = updatePlayer(state, index, { answered, history, lives: MAX_LIVES, pos: to, knockouts: player.knockouts + 1 })
  return { ...base, state: out, lifeLost: true, shieldUsed: false, knockedOut: true, from, to }
}

/* ── เดิน ───────────────────────────────────────────────── */

export interface Move {
  state: ZrState
  from: number
  to: number
}

/** เดินหน้า (หรือถอยหลังถ้าติดลบ) ไม่เกินหน้าประตู ไม่ต่ำกว่า START */
export function move(state: ZrState, steps: number): Move {
  const from = current(state).pos
  const to = Math.max(START, Math.min(DOOR, from + steps))
  return { state: updatePlayer(state, state.turn, { pos: to }), from, to }
}

/** ช่องที่ต้องทำตามเมื่อเดินมาหยุด ไม่ได้ขยับคือไม่มีอะไรเกิด */
export function landingOf(from: number, to: number): SquareKind | null {
  if (to === from) return null
  const kind = squareKind(to)
  return kind === 'plain' || kind === 'start' || kind === 'door' ? null : kind
}

/** 💧 พักฟื้น: ฟื้น ❤️ 1 ดวง */
export function rest(state: ZrState): ZrState {
  const player = current(state)
  return updatePlayer(state, state.turn, { lives: Math.min(MAX_LIVES, player.lives + 1) })
}

/* ── กล่องเสบียง ➕ ─────────────────────────────────────── */

export type SupplyReward = { kind: 'item'; item: ItemKey; kept: boolean } | { kind: 'supplies'; amount: number }

/**
 * กล่องเสบียงเท่ากับการทอยลูกเต๋า 1 ลูก แบบเดียวกับชุดพิมพ์ zombie-rescue.html
 * 1–2 ยา · 3 บัตรช่วยคิด · 4 โล่ · 5 สเก็ตบอร์ด · 6 เสบียง 2
 * ยาออกบ่อยที่สุด เพราะช่องนี้คือ "ได้ไอเทม/ยา" และเป็นทางฟื้นหลักของเด็กที่ตอบผิดบ่อย
 * วิทยุไม่อยู่ในกล่อง ซื้อได้ที่ตลาดเท่านั้น
 */
export const SUPPLY_TABLE: Array<[ItemKey | 'supplies', number]> = [
  ['medkit', 2],
  ['help', 1],
  ['shield', 1],
  ['skate', 1],
  ['supplies', 1],
]

export function openSupply(state: ZrState, rng: Rng): { state: ZrState; reward: SupplyReward } {
  const total = SUPPLY_TABLE.reduce((sum, [, w]) => sum + w, 0)
  let roll = rng() * total
  let pick: ItemKey | 'supplies' = 'supplies'
  for (const [key, weight] of SUPPLY_TABLE) {
    if (roll < weight) {
      pick = key
      break
    }
    roll -= weight
  }
  if (pick === 'supplies') {
    const player = current(state)
    return { state: updatePlayer(state, state.turn, { supplies: player.supplies + SUPPLY_COINS }), reward: { kind: 'supplies', amount: SUPPLY_COINS } }
  }
  const given = giveItem(state, state.turn, pick)
  return { state: given.state, reward: { kind: 'item', item: pick, kept: given.kept } }
}

/* ── การ์ดพิเศษ ⚙️ ──────────────────────────────────────── */

export interface EventDraw {
  state: ZrState
  event: EventKey
  /** การ์ดที่ทำให้ตัวเดินขยับ */
  from: number
  to: number
  /** บิสกิตดมเจอแต่กระเป๋าเต็ม จึงได้เสบียงแทน */
  bagFull: boolean
}

/** จั่วการ์ดใบบนสุด ทำตามทันที แล้วใส่กลับใต้กอง */
export function drawEvent(state: ZrState): EventDraw {
  const [event, ...others] = state.events
  let next: ZrState = { ...state, events: [...others, event] }
  const index = state.turn
  const from = next.players[index].pos
  let to = from
  let bagFull = false
  switch (event) {
    case 'heli':
    case 'chase': {
      const moved = move(next, event === 'heli' ? HELI_STEPS : -CHASE_STEPS)
      next = moved.state
      to = moved.to
      break
    }
    case 'share':
      next = { ...next, players: next.players.map((p) => ({ ...p, supplies: p.supplies + 1 })) }
      break
    case 'vaccine': {
      const p = next.players[index]
      next = updatePlayer(next, index, { energy: p.energy + EVENT_VACCINE })
      next = { ...next, team: { ...next.team, energy: next.team.energy + EVENT_VACCINE } }
      break
    }
    case 'rain':
      next = { ...next, players: next.players.map((p) => ({ ...p, lives: Math.min(MAX_LIVES, p.lives + 1) })) }
      break
    case 'sniff': {
      const given = giveItem(next, index, 'help')
      next = given.state
      bagFull = !given.kept
      break
    }
    case 'power':
      next = updatePlayer(next, index, { boost: true })
      break
    case 'again':
      next = { ...next, again: true }
      break
  }
  return { state: next, event, from, to, bagFull }
}

/* ── จบตา ───────────────────────────────────────────────── */

export function endTurn(state: ZrState): ZrState {
  if (state.again) return { ...state, again: false }
  const turn = (state.turn + 1) % state.players.length
  return { ...state, turn, round: turn === 0 ? state.round + 1 : state.round }
}

/* ── สรุป ───────────────────────────────────────────────── */

export interface TableTally {
  right: number
  total: number
}

/** ผลของแต่ละแม่สูตรคูณ ใช้บอกครูว่าเด็กคนไหนสะดุดแม่ไหน */
export function reviewOf(player: ZrPlayer): Record<Table, TableTally> {
  const out = Object.fromEntries(TABLES.map((t) => [t, { right: 0, total: 0 }])) as Record<Table, TableTally>
  for (const entry of player.history) {
    out[entry.t].total += 1
    if (entry.ok) out[entry.t].right += 1
  }
  return out
}

export function totalCorrect(state: ZrState): number {
  return state.players.reduce((sum, p) => sum + p.correct, 0)
}

/** คนที่หาพลังวัคซีนให้ทีมมากที่สุด (เสมอกันเอาคนที่ตอบถูกมากกว่า) */
export function topHelper(state: ZrState): number {
  return state.players
    .map((_, i) => i)
    .sort((a, b) => state.players[b].energy - state.players[a].energy || state.players[b].correct - state.players[a].correct)[0]
}

/**
 * เหรียญที่ผู้เล่นในแอปได้เมื่อจบเกม คิดแบบเดียวกับเมืองแห่งเวลา
 * คิดจากข้อที่ทั้งวงตอบถูก เพราะเล่นหลายคนบนเครื่องเดียวที่มีบัญชีเดียว และมีเพดานกันปั๊มเหรียญ
 */
export const REWARD_BASE = 10
export const REWARD_PER_CORRECT = 2
export const REWARD_CURE = 15
export const REWARD_MAX = 80

export function appReward(state: ZrState): number {
  return Math.min(REWARD_MAX, REWARD_BASE + totalCorrect(state) * REWARD_PER_CORRECT + (state.cured ? REWARD_CURE : 0))
}

/* ── เกมที่เล่นค้าง ───────────────────────────────────────── */

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
const isCount = (value: unknown, max: number): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= max

/**
 * ตรวจเกมที่อ่านกลับมาจาก localStorage ก่อนใช้
 *
 * อะไรที่ดูไม่ถูกต้องคืน null แล้วให้เริ่มเกมใหม่ ไม่พยายามซ่อม (เหตุผลเดียวกับเมืองแห่งเวลา)
 * พลังของทีมต้องเท่ากับผลรวมของทุกคน และเป้าต้องตรงกับจำนวนคน
 * ไม่งั้นแก้ตัวเลขในเครื่องเพื่อชนะทันทีได้
 */
export function parseSavedGame(raw: unknown): ZrState | null {
  if (!isRecord(raw) || !Array.isArray(raw.players) || !isRecord(raw.team) || !Array.isArray(raw.events)) return null
  const count = raw.players.length
  if (count < 1 || count > MAX_PLAYERS) return null

  const players: ZrPlayer[] = []
  for (const item of raw.players) {
    if (!isRecord(item)) return null
    const hero = item.hero as HeroKey
    if (!HERO_KEYS.includes(hero) || typeof item.name !== 'string' || item.name.length > 40) return null
    if (!isCount(item.pos, DOOR) || !isCount(item.lives, MAX_LIVES) || item.lives < 1) return null
    if (!isCount(item.supplies, 9999) || !isCount(item.energy, 99999) || !isCount(item.rescued, 9999)) return null
    if (!isCount(item.correct, 9999) || !isCount(item.answered, 9999) || !isCount(item.knockouts, 9999)) return null
    if (!Array.isArray(item.items) || item.items.length > BAG_LIMIT || !item.items.every((k) => ITEM_KEYS.includes(k as ItemKey))) return null
    const history: AnswerRecord[] = []
    if (Array.isArray(item.history)) {
      for (const entry of item.history) {
        if (isRecord(entry) && TABLES.includes(entry.t as Table) && typeof entry.ok === 'boolean') {
          history.push({ t: entry.t as Table, ok: entry.ok })
        }
      }
    }
    players.push({
      name: item.name,
      hero,
      pos: item.pos,
      lives: item.lives,
      supplies: item.supplies,
      items: item.items as ItemKey[],
      energy: item.energy,
      rescued: item.rescued,
      correct: item.correct,
      answered: item.answered,
      knockouts: item.knockouts,
      boost: item.boost === true,
      history,
    })
  }

  const easy = raw.easy === true
  const energy = players.reduce((sum, p) => sum + p.energy, 0)
  const rescued = players.reduce((sum, p) => sum + p.rescued, 0)
  if (raw.team.energy !== energy || raw.team.rescued !== rescued) return null
  if (raw.target !== targetFor(count, easy)) return null

  const events = raw.events as EventKey[]
  const sorted = (list: string[]) => list.slice().sort().join()
  if (!events.every((e) => typeof e === 'string') || sorted(events) !== sorted(EVENT_DECK)) return null

  if (!isCount(raw.turn, count - 1) || !isCount(raw.round, 9999) || raw.round < 1) return null
  const cured = raw.cured === true
  const curedBy = raw.curedBy === null || raw.curedBy === undefined ? null : isCount(raw.curedBy, count - 1) ? raw.curedBy : -1
  if (curedBy === -1 || cured !== (curedBy !== null)) return null
  const recent = Array.isArray(raw.recent) ? raw.recent.filter((s): s is string => typeof s === 'string').slice(-RECENT_LIMIT) : []

  return {
    players,
    turn: raw.turn,
    round: raw.round,
    easy,
    team: { energy, rescued },
    target: targetFor(count, easy),
    events,
    again: raw.again === true,
    cured,
    curedBy,
    recent,
  }
}
