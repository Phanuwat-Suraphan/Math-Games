/**
 * เครื่องยนต์จำลองโหมดเอาชีวิตรอด
 *
 * ทั้งไฟล์ไม่แตะ DOM ไม่แตะ canvas ไม่แตะเวลาจริง
 * รับสถานะกับช่วงเวลาเข้ามา คืนสถานะใหม่ออกไป
 * จึงจำลองการเล่นเป็นนาทีได้ในชุดทดสอบโดยไม่ต้องเปิดเบราว์เซอร์
 *
 * เรื่องก้าวเวลา: ใช้ก้าวคงที่ (fixed timestep)
 * ถ้าใช้เวลาจริงของแต่ละเฟรมตรง ๆ เครื่องที่ช้าจะได้ก้าวใหญ่
 * แล้วมอนจะกระโดดข้ามตัวผู้เล่นไปเลยโดยไม่ชน
 * ซึ่งกลายเป็นว่าเครื่องยิ่งช้ายิ่งเล่นง่าย ซึ่งไม่ยุติธรรม
 */

import { createRng } from '../math/rng'
import type { Rng } from '../math/rng'
import { MAX_SKILL_SLOTS, SKILLS, getSkill, statsFrom } from './skills'
import {
  MAX_WEAPON_LEVEL,
  MAX_WEAPON_SLOTS,
  STARTING_WEAPON,
  WEAPONS,
  activeStats,
  getWeapon,
  weaponDisplayName,
  weaponStats,
} from './weapons'
import {
  ARENA_HEIGHT,
  ARENA_WIDTH,
  type DamageNumber,
  type Effect,
  type EnemyBehavior,
  type EnemyEntity,
  type EnemyShot,
  type GemEntity,
  type Particle,
  type SoundCue,
  type Input,
  type Notice,
  type PickupEntity,
  type PickupKind,
  type ProjectileEntity,
  type UltimateState,
  type Vec,
  type WorldState,
} from './types'
import { ultimateFor } from './ultimates'

/** ก้าวเวลาคงที่ 1/60 วินาที */
export const FIXED_STEP = 1 / 60

/** ก้าวสูงสุดที่ยอมประมวลผลในหนึ่งเฟรม กันการค้างยาวแล้วคำนวณย้อนหลังเป็นพันก้าว */
export const MAX_STEPS_PER_FRAME = 5

/**
 * เศษที่มีอยู่พร้อมกันได้มากที่สุด
 *
 * เลือกจากงบเวลาวาดต่อเฟรม ไม่ใช่จากความสวย
 * ที่ 240 ชิ้น การวาดยังใช้เวลาน้อยกว่าการวาดมอนเต็มจอมาก
 * ส่วนตอนมอนตายพร้อมกันสิบตัว จะได้เศษราว 60 ชิ้น จึงไม่เคยชนเพดานจริง
 * เพดานมีไว้กันกรณีสุดขั้ว เช่นระเบิดทั้งสนามตอนมอนแน่นที่สุด
 */
const MAX_PARTICLES = 240

/** ตัวเลขความเสียหายที่แสดงพร้อมกันได้มากที่สุด */
const MAX_DAMAGE_NUMBERS = 40

const XP_BASE = 5
const XP_GROWTH = 1.2

/** ชนิดมอนสเตอร์ที่โผล่ตามเวลา */
interface EnemyKind {
  kind: string
  /**
   * ไอดีภาพจากชุดมอนสเตอร์ของโหมดเควส
   *
   * ใช้ภาพชุดเดียวกันทั้งเกมโดยตั้งใจ
   * มอนที่เด็กเจอในเควสกับที่เจอในสนามรบต้องเป็นตัวเดียวกัน
   * ไม่งั้นสองโหมดจะรู้สึกเหมือนเป็นคนละเกมที่บังเอิญอยู่ในแอปเดียวกัน
   */
  art: string
  hp: number
  speed: number
  damage: number
  radius: number
  xpValue: number
  behavior: EnemyBehavior
  /** ตายแล้วแตกเป็นตัวเล็กกี่ตัว */
  splitInto: number
  /** วินาทีที่เริ่มโผล่ได้ */
  fromTime: number
}

/**
 * มอนสิบชนิด ไล่จากง่ายไปยาก
 *
 * แต่ละตัวมีวิธีรับมือต่างกัน ไม่ใช่แค่เลือดเยอะขึ้น
 * เด็กจึงต้องเปลี่ยนวิธีเล่นเมื่อเจอชนิดใหม่ ไม่ใช่ทำท่าเดิมไปเรื่อย ๆ
 */
const ENEMY_KINDS: EnemyKind[] = [
  /*
   * ความเร็วมอนตั้งไว้ที่ราว 55–85% ของความเร็วผู้เล่น (190) โดยตั้งใจ
   *
   * ตอนแรกตั้งไว้ช้ากว่านี้มาก (46–80) แล้วพบว่าเกมพังทั้งเกม
   * เพราะผู้เล่นวิ่งหนีได้ตลอดจนไม่มีมอนตัวไหนเข้ามาในระยะดาบเลย
   * ผลคือเดินหนีอย่างเดียวได้ 1–4 ตัวใน 45 วินาที ยังเลเวล 1 อยู่
   * ส่วนคนที่ยืนนิ่งกลับได้ 32–42 ตัว ซึ่งกลับหัวกลับหางกับที่ควรเป็น
   *
   * พอมอนตามได้ทัน มันจะไล่ต่อกันเป็นหางยาวตามหลังผู้เล่น
   * ซึ่งเป็นจังหวะหลักของเกมแนวนี้ คือวิ่งวนแล้วกวาดตัวที่ตามมาติด ๆ
   */
  { kind: 'number-slime', art: 'number-slime', hp: 22, speed: 108, damage: 8, radius: 16, xpValue: 1,
    behavior: 'chase', splitInto: 0, fromTime: 0 },
  { kind: 'fraction-bat', art: 'fraction-bat', hp: 16, speed: 150, damage: 6, radius: 13, xpValue: 2,
    behavior: 'zigzag', splitInto: 0, fromTime: 20 },
  { kind: 'goblin-calculator', art: 'goblin-calculator', hp: 48, speed: 98, damage: 12, radius: 19, xpValue: 3,
    behavior: 'chase', splitInto: 0, fromTime: 45 },
  { kind: 'decimal-scorpion', art: 'decimal-scorpion', hp: 34, speed: 230, damage: 10, radius: 16, xpValue: 3,
    behavior: 'dash', splitInto: 0, fromTime: 70 },
  { kind: 'big-slime', art: 'number-slime', hp: 80, speed: 88, damage: 12, radius: 26, xpValue: 4,
    behavior: 'chase', splitInto: 3, fromTime: 95 },
  { kind: 'percentage-bandit', art: 'percentage-bandit', hp: 50, speed: 120, damage: 14, radius: 18, xpValue: 5,
    behavior: 'ranged', splitInto: 0, fromTime: 120 },
  { kind: 'geometry-golem', art: 'geometry-golem', hp: 170, speed: 72, damage: 18, radius: 26, xpValue: 7,
    behavior: 'tank', splitInto: 0, fromTime: 150 },
  { kind: 'math-guardian', art: 'math-guardian', hp: 100, speed: 158, damage: 15, radius: 19, xpValue: 6,
    behavior: 'zigzag', splitInto: 0, fromTime: 185 },
  { kind: 'fraction-ghost', art: 'fraction-bat', hp: 66, speed: 260, damage: 12, radius: 15, xpValue: 6,
    behavior: 'dash', splitInto: 0, fromTime: 215 },
  { kind: 'dragon-of-numbers', art: 'dragon-of-numbers', hp: 240, speed: 126, damage: 22, radius: 28, xpValue: 12,
    behavior: 'chase', splitInto: 0, fromTime: 250 },

  /*
   * ชุดที่สอง โผล่ตั้งแต่นาทีที่สองเป็นต้นไป
   *
   * เพิ่มเพราะช่วงหลังนาทีที่สามเดิมเจอมอนชุดเดิมวนซ้ำจนจำหมดแล้ว
   * ตอนนี้รอบหนึ่งยาวขึ้นเป็นสามถึงหกนาที ช่วงท้ายจึงต้องมีของใหม่ให้เจอ
   * ไม่งั้นช่วงที่ควรตื่นเต้นที่สุดกลับเป็นช่วงที่ซ้ำที่สุด
   */
  { kind: 'decimal-worm', art: 'decimal-worm', hp: 58, speed: 142, damage: 10, radius: 17, xpValue: 4,
    behavior: 'zigzag', splitInto: 0, fromTime: 110 },
  { kind: 'equation-wraith', art: 'equation-wraith', hp: 44, speed: 165, damage: 11, radius: 15, xpValue: 5,
    behavior: 'chase', splitInto: 0, fromTime: 140 },
  { kind: 'chaos-cube', art: 'chaos-cube', hp: 92, speed: 104, damage: 16, radius: 19, xpValue: 7,
    behavior: 'ranged', splitInto: 0, fromTime: 175 },
  { kind: 'prime-knight', art: 'prime-knight', hp: 210, speed: 86, damage: 20, radius: 24, xpValue: 9,
    behavior: 'tank', splitInto: 0, fromTime: 205 },
  { kind: 'wraith-swarm', art: 'equation-wraith', hp: 120, speed: 148, damage: 14, radius: 20, xpValue: 8,
    behavior: 'dash', splitInto: 3, fromTime: 240 },
  { kind: 'cube-sentinel', art: 'chaos-cube', hp: 300, speed: 112, damage: 24, radius: 26, xpValue: 14,
    behavior: 'ranged', splitInto: 0, fromTime: 280 },
]

/**
 * บอสประจำนาที
 *
 * ตัวแรกโผล่ที่ 60 วินาที แล้วทุก 60 วินาทีหลังจากนั้น
 * ไล่ตามลำดับในรายการนี้ พอหมดรายการก็วนกลับมาตัวแรกแต่แข็งขึ้นตามเวลา
 *
 * ทำไมต้องมีบอส ทั้งที่มีตัวใหญ่พิเศษอยู่แล้ว
 * ตัวใหญ่พิเศษเป็นแค่ถุง XP ที่เดินได้ ล้มหรือไม่ล้มก็ได้
 * แต่บอสทำหีบตก ซึ่งเป็นทางเดียวที่จะได้ร่างสมบูรณ์ของอาวุธ
 * เด็กจึงมีเหตุผลที่จะ "หันกลับไปสู้" แทนที่จะวิ่งหนีอย่างเดียวจนหมดเวลา
 * ซึ่งเปลี่ยนรูปเกมช่วงกลางรอบไปทั้งหมด
 */
const BOSS_KINDS: EnemyKind[] = [
  { kind: 'boss-slime-king', art: 'number-slime', hp: 300, speed: 96, damage: 20,
    radius: 40, xpValue: 40, behavior: 'chase', splitInto: 4, fromTime: 0 },
  { kind: 'boss-math-guardian', art: 'math-guardian', hp: 430, speed: 118, damage: 22,
    radius: 40, xpValue: 50, behavior: 'zigzag', splitInto: 0, fromTime: 0 },
  { kind: 'boss-golem-king', art: 'geometry-golem', hp: 640, speed: 78, damage: 28,
    radius: 46, xpValue: 62, behavior: 'tank', splitInto: 0, fromTime: 0 },
  { kind: 'boss-number-dragon', art: 'dragon-of-numbers', hp: 820, speed: 132, damage: 30,
    radius: 46, xpValue: 78, behavior: 'ranged', splitInto: 0, fromTime: 0 },
  { kind: 'boss-prime-knight', art: 'prime-knight', hp: 1050, speed: 92, damage: 32,
    radius: 44, xpValue: 90, behavior: 'tank', splitInto: 0, fromTime: 0 },
  { kind: 'boss-chaos-cube', art: 'chaos-cube', hp: 1250, speed: 120, damage: 34,
    radius: 44, xpValue: 105, behavior: 'ranged', splitInto: 0, fromTime: 0 },
]

/** ชื่อบอสที่แสดงตอนโผล่ ไล่ตามลำดับเดียวกับ BOSS_KINDS */
const BOSS_NAMES = [
  'ราชาสไลม์',
  'ผู้พิทักษ์คณิต',
  'ราชาโกเลม',
  'มังกรแห่งตัวเลข',
  'อัศวินจำนวนเฉพาะ',
  'ลูกบาศก์วุ่นวาย',
]

/** ชื่อบอสตัวที่เท่าไร ใช้ทั้งตอนประกาศและตอนสรุปผล */
export function bossNameAt(index: number): string {
  const name = BOSS_NAMES[index % BOSS_NAMES.length]
  const lap = Math.floor(index / BOSS_NAMES.length)
  // วนรอบที่สองเป็นต้นไปใส่ดาวกำกับ ให้รู้ว่าตัวนี้แข็งกว่าตัวเดิมที่เคยเจอ
  return lap > 0 ? `${name} ${'★'.repeat(Math.min(3, lap))}` : name
}

/** ตัวเล็กที่แตกออกมาจากสไลม์ใหญ่ */
const SPLIT_CHILD: EnemyKind = {
  kind: 'number-slime',
  art: 'number-slime',
  hp: 18,
  speed: 132,
  damage: 6,
  radius: 11,
  xpValue: 1,
  behavior: 'chase',
  splitInto: 0,
  fromTime: 0,
}

function length(v: Vec): number {
  return Math.hypot(v.x, v.y)
}

function normalize(v: Vec): Vec {
  const len = length(v)
  if (len === 0) return { x: 0, y: 0 }
  return { x: v.x / len, y: v.y / len }
}

function distance(a: Vec, b: Vec): number {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

/** XP ที่ต้องใช้เพื่อขึ้นจากเลเวลนี้ */
export function xpNeededFor(level: number): number {
  return Math.round(XP_BASE * Math.pow(XP_GROWTH, level - 1))
}

export function createWorld(
  seed: string,
  avatarId = 'adventurer',
  perks: Readonly<Record<string, number>> = {},
): WorldState {
  const stats = statsFrom({}, perks)

  /*
   * พลังถาวร "ฝึกฝนมาก่อน" ทำให้เริ่มรอบด้วยดาบที่อัประดับมาแล้ว
   * หนีบไม่ให้เกินเพดานปกติ ไม่งั้นจะข้ามไปเป็นร่างสมบูรณ์ตั้งแต่ยังไม่ล้มบอส
   * ซึ่งจะทำให้ระบบร่างสมบูรณ์ทั้งระบบไม่มีความหมาย
   */
  const startingLevel = Math.min(MAX_WEAPON_LEVEL, 1 + (perks.training ?? 0))

  return {
    seed,
    time: 0,
    player: {
      pos: { x: ARENA_WIDTH / 2, y: ARENA_HEIGHT / 2 },
      hp: stats.maxHp,
      maxHp: stats.maxHp,
      speed: stats.moveSpeed,
      radius: 14,
      level: 1,
      xp: 0,
      xpToNext: xpNeededFor(1),
      invulnerable: 0,
    },
    enemies: [],
    projectiles: [],
    enemyShots: [],
    effects: [],
    damageNumbers: [],
    particles: [],
    shake: 0,
    sounds: [],
    gems: [],
    pickups: [],
    notices: [],
    skills: {},
    weapons: { [STARTING_WEAPON]: startingLevel },
    evolved: [],
    chests: 0,
    weaponCooldowns: {},
    spawnCooldown: 1,
    eliteCooldown: 45,
    bossCooldown: 60,
    bossesDown: 0,
    ultimate: { id: avatarId, charge: 0, activeFor: 0, used: 0 },
    perks: { ...perks },
    revivesLeft: perks.phoenix ?? 0,
    nextId: 1,
    phase: 'playing',
    kills: 0,
    lastAnswerCorrect: true,
  }
}

/**
 * จำนวนมอนที่โผล่พร้อมกันและความถี่ ณ เวลาหนึ่ง
 *
 * เพิ่มขึ้นตามเวลาแต่มีเพดาน ไม่งั้นเล่นไปห้านาทีจะมีมอนเป็นพันตัว
 * ซึ่งทั้งเครื่องช้าและมองไม่เห็นอะไรเลย
 */
function spawnPlan(time: number): { count: number; interval: number } {
  const minutes = time / 60

  /*
   * ตัวเลขชุดนี้ปรับจากการจำลองการเล่นจริง ไม่ได้เดาเอา
   *
   * ชุดแรกโหดเกินไปมาก ผู้เล่นที่เล่นถูกวิธีตายที่ราว 40 วินาทีทุกรอบ
   * ซึ่งสั้นเกินกว่าจะได้ลองอาวุธชิ้นที่สองด้วยซ้ำ
   *
   * ชุดที่สองยังสั้นอยู่ดี วัดได้ 50–96 วินาที
   * ตอนนั้นเกมมีอาวุธสี่ชิ้น ชิ้นละห้าระดับ และร่างสมบูรณ์
   * ซึ่งเป็นเนื้อหาของรอบยาวสี่ห้านาที เด็กจึงไม่มีวันได้เห็นเลยสักอย่าง
   * สาเหตุคือมอนเกิดเร็วกว่าที่ผู้เล่นจะล้มได้ตั้งแต่วินาทีแรก
   * จำนวนมอนบนจอจึงพอกขึ้นเรื่อย ๆ (4 → 6 → 10 → 18 ตัวใน 60 วินาที)
   * แล้วจบลงด้วยการโดนรุมตายเสมอ ไม่ว่าจะเล่นดีแค่ไหน
   *
   * ชุดนี้ลดแรงกดดันช่วงต้นลง เพื่อให้ผู้เล่นตามทันตั้งแต่แรก
   * และยังบีบขึ้นเรื่อย ๆ อยู่ แค่ช้าลงจนไล่ตามได้
   *
   * อีกเหตุผลที่สำคัญไม่แพ้กัน: เลเวลอัปหนึ่งครั้งคือโจทย์หนึ่งข้อ
   * รอบที่ยาว 60 วินาทีได้ตอบโจทย์แค่ห้าข้อ ซึ่งน้อยเกินไปสำหรับคาบเรียน
   */
  return {
    count: Math.min(5, 1 + Math.floor(minutes * 0.8)),
    interval: Math.max(1.05, 2.8 - minutes * 0.2),
  }
}

/** วินาทีที่เริ่มเร่งความยากขั้นสุดท้าย */
const ENDGAME_FROM = 420

/**
 * ตัวคูณพลังมอนตามเวลา ทำให้มอนตัวเดิมแข็งขึ้นเรื่อย ๆ
 *
 * หลังนาทีที่เจ็ดจะเร่งขึ้นอีกชั้น เพื่อให้รอบหนึ่ง "จบได้จริง"
 *
 * ที่ต้องมีเพราะจำลองแล้วพบว่าบิลด์ที่สมบูรณ์แล้วไม่ตายเลย
 * เล่นถึงสิบห้านาทีก็ยังไม่ตาย ซึ่งฟังดูดีแต่กลับเป็นปัญหา
 * เพราะเหรียญจ่ายตอนจบรอบเท่านั้น เด็กที่เก่งที่สุดจึงไม่ได้รางวัลสักที
 * และในคาบเรียนจริงก็ต้องมีจุดจบที่คาดเดาได้ ไม่ใช่เล่นยาวจนหมดคาบ
 */
function difficultyScale(time: number): number {
  const base = 1 + time / 200
  if (time <= ENDGAME_FROM) return base
  return base * (1 + (time - ENDGAME_FROM) / 150)
}

function makeEnemy(
  id: number,
  template: EnemyKind,
  pos: Vec,
  scale: number,
  elite: boolean,
  boss = false,
): EnemyEntity {
  // ตัวใหญ่พิเศษถึกกว่ามาก ตัวโตกว่า และให้ XP คุ้มกับที่ต้องออกแรง
  const hp = Math.round(template.hp * scale * (elite ? 8 : 1))

  return {
    id,
    pos,
    hp,
    maxHp: hp,
    speed: template.speed * (elite ? 0.7 : 1),
    radius: template.radius * (elite ? 1.7 : 1),
    damage: Math.round(template.damage * (elite ? 1.6 : 1)),
    kind: template.kind,
    art: template.art,
    xpValue: template.xpValue * (elite ? 10 : 1),
    hitFlash: 0,
    behavior: template.behavior,
    // นาฬิกาเริ่มไม่ตรงกัน มอนที่เกิดพร้อมกันจึงไม่ส่ายพร้อมกันเป็นแถว
    clock: (id % 17) * 0.31,
    slowFor: 0,
    burnFor: 0,
    burnDps: 0,
    elite,
    boss,
    splitInto: template.splitInto,
    shootCooldown: 1.2,
  }
}

/**
 * สร้างบอสประจำนาที
 *
 * เกิดที่ขอบสนามเหมือนตัวอื่น ไม่โผล่กลางจอ
 * บอสที่โผล่ทับตัวผู้เล่นคือความตายที่หลบไม่ได้ ซึ่งไม่ยุติธรรมเป็นพิเศษ
 * เพราะบอสแรงกว่ามอนธรรมดาหลายเท่า
 */
function makeBoss(id: number, index: number, time: number, rng: Rng): EnemyEntity {
  const template = BOSS_KINDS[index % BOSS_KINDS.length]
  // วนรอบที่สองเป็นต้นไปแข็งขึ้นอีกชั้น ไม่งั้นบอสตัวเดิมจะกลายเป็นของง่าย
  const lap = Math.floor(index / BOSS_KINDS.length)
  const scale = difficultyScale(time) * (1 + lap * 0.6)
  return makeEnemy(id, template, edgeSpawn(rng), scale, false, true)
}

/** สุ่มตำแหน่งเกิดที่ขอบสนาม */
function edgeSpawn(rng: Rng): Vec {
  /*
   * เกิดที่ขอบสนามเสมอ ไม่เกิดกลางสนาม
   * ถ้าเกิดตรงไหนก็ได้ มอนจะโผล่ทับตัวผู้เล่นแล้วชนทันทีโดยไม่มีทางหลบ
   * ซึ่งเป็นความตายที่ผู้เล่นไม่ได้ทำอะไรผิดเลย
   */
  const side = rng.int(0, 3)
  if (side === 0) return { x: rng.int(0, ARENA_WIDTH), y: -20 }
  if (side === 1) return { x: ARENA_WIDTH + 20, y: rng.int(0, ARENA_HEIGHT) }
  if (side === 2) return { x: rng.int(0, ARENA_WIDTH), y: ARENA_HEIGHT + 20 }
  return { x: -20, y: rng.int(0, ARENA_HEIGHT) }
}

function spawnEnemy(world: WorldState, rng: Rng, elite = false): EnemyEntity {
  const available = ENEMY_KINDS.filter((kind) => world.time >= kind.fromTime)
  const template = rng.pick(available)
  return makeEnemy(world.nextId, template, edgeSpawn(rng), difficultyScale(world.time), elite)
}

/** สร้างมอนหนึ่งตัวสำหรับชุดทดสอบ ใช้ตรวจว่าพฤติกรรมหลากหลายจริง */
export function spawnOne(world: WorldState, seed: string): EnemyEntity {
  return spawnEnemy(world, createRng(`${world.seed}-${seed}`))
}

/**
 * อาวุธที่พร้อมจะกลายเป็นร่างสมบูรณ์ทันทีที่เปิดหีบ
 *
 * เงื่อนไข: อาวุธเต็มระดับ + มีสกิลคู่ควบครบชั้น + ยังไม่เคยสมบูรณ์
 *
 * แยกออกมาเป็นฟังก์ชันเดี่ยวเพราะถูกใช้สองที่ที่ต้องตรงกันเป๊ะ
 * คือตอนเปิดหีบจริง กับตอนบอกเด็กบนหน้าจอว่า "อาวุธนี้พร้อมแล้ว"
 * ถ้าเขียนแยกกันสองชุด วันหนึ่งจะเพี้ยนจากกันแล้วเด็กจะรู้สึกว่าโดนหลอก
 */
export function readyToEvolve(world: WorldState): string[] {
  const out: string[] = []

  for (const [weaponId, level] of Object.entries(world.weapons)) {
    if (level < MAX_WEAPON_LEVEL) continue
    if (world.evolved.includes(weaponId)) continue

    const weapon = getWeapon(weaponId)
    if (!weapon) continue

    const stacks = world.skills[weapon.evolution.requiresSkill] ?? 0
    if (stacks < weapon.evolution.requiresStacks) continue

    out.push(weaponId)
  }
  return out
}

/**
 * ความคืบหน้าของสกิลวิเศษ 0 ถึง 1
 *
 * คืนเป็นสัดส่วนเพื่อให้หน้าจอวาดแถบได้ตรง ๆ
 * แต่หน้าจอยังแสดงเป็นจำนวนตัวที่เหลือควบคู่ไปด้วย
 * เพราะ "อีก 6 ตัว" เป็นเป้าหมายที่ชัดกว่า "อีก 20%"
 */
export function ultimateProgress(world: WorldState): number {
  const spec = ultimateFor(world.ultimate.id)
  return Math.min(1, world.ultimate.charge / spec.cost)
}

/** ใช้สกิลวิเศษได้ตอนนี้ไหม */
export function ultimateReady(world: WorldState): boolean {
  const spec = ultimateFor(world.ultimate.id)
  return world.ultimate.charge >= spec.cost && world.ultimate.activeFor <= 0
}

/** มอนที่อยู่ใกล้ผู้เล่นที่สุด ใช้เล็งเป้าอัตโนมัติ */
export function nearestEnemy(world: WorldState): EnemyEntity | undefined {
  let best: EnemyEntity | undefined
  let bestDist = Infinity

  for (const enemy of world.enemies) {
    const dist = distance(enemy.pos, world.player.pos)
    if (dist < bestDist) {
      bestDist = dist
      best = enemy
    }
  }
  return best
}

/**
 * บันทึกความเสียหายหนึ่งครั้ง ก่อนจะแปลงเป็นตัวเลขลอยตอนท้ายก้าว
 *
 * แยกเป็นชนิดของตัวเองแทนการสร้าง DamageNumber ตรงนี้เลย
 * เพราะ DamageNumber ต้องมี id ที่ไม่ซ้ำ ซึ่งตัวนับ id อยู่ที่ระดับ step
 * การส่งตัวนับ id ลงมาถึงทุกจุดที่ตีโดนคือการลากสถานะไปทั่วโดยไม่จำเป็น
 */
interface HitRecord {
  pos: Vec
  amount: number
  big: boolean
}

/**
 * ความเสียหายที่มอนได้รับ พร้อมเอฟเฟกต์กระพริบ
 *
 * log เป็นตัวเลือก เพราะบางจุดที่ตีโดน (เช่นระเบิดลูกโซ่ที่ตีพร้อมกันสิบตัว)
 * ไม่ควรขึ้นตัวเลขทุกตัว ไม่งั้นจอจะเต็มไปด้วยตัวเลขจนมองไม่เห็นมอน
 */
function hurt(
  enemy: EnemyEntity,
  amount: number,
  log?: HitRecord[],
): void {
  enemy.hp -= amount
  enemy.hitFlash = 0.12
  if (log) {
    log.push({
      pos: { x: enemy.pos.x, y: enemy.pos.y - enemy.radius },
      amount,
      // ตีแรงคือตีทีเดียวหายเกินหนึ่งในสี่ของเลือดเต็ม
      big: amount >= enemy.maxHp * 0.25,
    })
  }
}

/**
 * เดินหน้าโลกไปหนึ่งก้าวคงที่
 *
 * ทำงานเฉพาะตอน phase เป็น playing
 * ตอนหยุดถามโจทย์หรือเลือกสกิล เวลาในเกมต้องหยุดสนิท
 * ไม่งั้นเด็กจะโดนมอนรุมตายระหว่างกำลังอ่านโจทย์อยู่
 */
export function step(world: WorldState, input: Input): WorldState {
  if (world.phase !== 'playing') return world

  const dt = FIXED_STEP
  const stats = statsFrom(world.skills, world.perks)

  /*
   * สมุดบันทึกของก้าวนี้
   *
   * ทั้งสองอย่างเริ่มจากว่างทุกก้าว ไม่สะสมข้ามก้าว
   * เสียงที่ค้างจากก้าวก่อนจะดังซ้ำ และตัวเลขที่ค้างจะถูกสร้าง id ซ้ำ
   */
  const hits: HitRecord[] = []
  const sounds: SoundCue[] = []

  /*
   * เศษเดินต่อด้วยแรงต้านและแรงโน้มถ่วงลง
   * ทำให้มันตกลงและช้าลงแทนที่จะพุ่งเป็นเส้นตรงตลอด
   * ซึ่งอ่านออกเป็น "ของแตก" มากกว่า "จุดที่วิ่งหนี"
   */
  const particles: Particle[] = []
  for (const particle of world.particles) {
    const life = particle.life - dt
    if (life <= 0) continue
    const drag = Math.pow(0.12, dt)
    particles.push({
      ...particle,
      life,
      pos: {
        x: particle.pos.x + particle.vel.x * dt,
        y: particle.pos.y + particle.vel.y * dt,
      },
      vel: {
        x: particle.vel.x * drag,
        y: particle.vel.y * drag + 320 * dt,
      },
    })
  }
  /** สั่งจอสั่น ใช้ค่าที่แรงที่สุดในก้าวนี้ ไม่ใช่บวกกัน ไม่งั้นจะสั่นจนอ่านจอไม่ออก */
  let shake = Math.max(0, world.shake - dt * 2.6)
  const addShake = (amount: number) => {
    shake = Math.min(1, Math.max(shake, amount))
  }
  const time = world.time + dt
  let nextId = world.nextId

  // ---------- ผู้เล่น ----------
  /*
   * ใช้ความยาวของก้านบังคับเป็นความเร็วจริง ไม่ normalize ทิ้ง
   *
   * เดิมเรียก normalize() ซึ่งบังคับให้ความยาวเป็น 1 เสมอ
   * ผลคือเด็กเอียงก้านนิดเดียวก็วิ่งเต็มสปีด และ "เดินช้า" ไม่ได้เลย
   * ซึ่งพังกับเกมนี้โดยตรง เพราะดาบต้องรอให้มอนเข้ามาใกล้
   * ถ้าวิ่งเต็มสปีดตลอดเวลา มอนจะตามไม่ทันจนไม่มีอะไรเข้าระยะดาบเลย
   * จำลองแล้วได้ 1–4 ตัวใน 45 วินาที ทั้งที่เล่นถูกวิธี
   *
   * หนีบความยาวไม่ให้เกิน 1 แทน เดินทแยงจึงยังไม่เร็วกว่าเดินตรง
   */
  /*
   * สกิลวิเศษ ต้องคิดก่อนการเคลื่อนที่
   * เพราะสกิลของนักสำรวจเพิ่มความเร็วเดิน ซึ่งต้องมีผลในเฟรมเดียวกันที่กด
   */
  const ultSpec = ultimateFor(world.ultimate.id)
  const previousActive = world.ultimate.activeFor
  let ultimate: UltimateState = {
    ...world.ultimate,
    activeFor: Math.max(0, previousActive - dt),
  }

  const canUseUltimate = ultimate.charge >= ultSpec.cost && previousActive <= 0
  const justActivated = Boolean(input.useUltimate) && canUseUltimate
  if (justActivated) {
    ultimate = {
      ...ultimate,
      charge: 0,
      // สกิลที่ออกฤทธิ์ทันทีตั้งเวลาสั้น ๆ ไว้ เพื่อให้เอฟเฟกต์ภาพทันได้เห็น
      activeFor: Math.max(ultSpec.duration, 0.35),
      used: ultimate.used + 1,
    }
  }
  const ultimateOn = ultimate.activeFor > 0
  /** ระหว่างใช้สกิลบางอย่างจะไม่เจ็บเลย ไม่ใช่แค่ลดความเสียหาย */
  const ultimateGuard = ultimateOn && (ultSpec.kind === 'dash' || ultSpec.kind === 'shield')

  const raw = input.move
  const rawLength = length(raw)
  const dir =
    rawLength > 1 ? { x: raw.x / rawLength, y: raw.y / rawLength } : raw
  const player = { ...world.player }
  player.maxHp = stats.maxHp
  const moveSpeed = stats.moveSpeed * (ultimateOn && ultSpec.kind === 'dash' ? 1.85 : 1)
  player.speed = moveSpeed
  player.pos = {
    x: clamp(player.pos.x + dir.x * moveSpeed * dt, player.radius, ARENA_WIDTH - player.radius),
    y: clamp(player.pos.y + dir.y * moveSpeed * dt, player.radius, ARENA_HEIGHT - player.radius),
  }
  player.invulnerable = Math.max(0, player.invulnerable - dt)

  // ---------- เกิดมอน ----------
  const enemies: EnemyEntity[] = world.enemies.map((enemy) => ({ ...enemy }))

  let spawnCooldown = world.spawnCooldown - dt
  if (spawnCooldown <= 0) {
    const plan = spawnPlan(time)
    for (let i = 0; i < plan.count; i += 1) {
      enemies.push(
        spawnEnemy({ ...world, time, nextId }, createRng(`${world.seed}-spawn-${nextId}`)),
      )
      nextId += 1
    }
    spawnCooldown = plan.interval
  }

  /*
   * มอนตัวใหญ่พิเศษโผล่เป็นระยะ
   * เป็นจังหวะ "ตื่นเต้น" ที่ทำให้การเล่นยาว ๆ ไม่ราบเรียบไปหมด
   * และให้ XP ก้อนใหญ่ เป็นรางวัลของการกล้าสู้แทนที่จะหนีอย่างเดียว
   */
  let eliteCooldown = world.eliteCooldown - dt
  if (eliteCooldown <= 0 && time > 30) {
    enemies.push(
      spawnEnemy({ ...world, time, nextId }, createRng(`${world.seed}-elite-${nextId}`), true),
    )
    nextId += 1
    eliteCooldown = 45
  }

  /*
   * บอสประจำนาที
   * นับจากจำนวนที่โผล่มาแล้ว ไม่ใช่จากเวลา เพราะเวลาเป็นทศนิยม
   * การหารเวลาเพื่อหาว่าเป็นบอสตัวที่เท่าไรจะคลาดเคลื่อนได้
   */
  let bossCooldown = world.bossCooldown - dt
  const notices: Notice[] = world.notices
    .map((notice) => ({ ...notice, life: notice.life - dt }))
    .filter((notice) => notice.life > 0)

  if (bossCooldown <= 0) {
    const index = Math.max(0, Math.round((time - 60) / 60))
    enemies.push(makeBoss(nextId, index, time, createRng(`${world.seed}-boss-${nextId}`)))
    /* บอสเดินเข้ามาจากขอบจอ เสียงกับแรงสั่นจึงมาถึงก่อนภาพเสมอ */
    sounds.push('bossRoar')
    addShake(0.55)
    nextId += 1
    bossCooldown = 60
    notices.push({
      id: nextId,
      text: `${bossNameAt(index)} ปรากฏตัว! ล้มให้ได้จะมีหีบตก`,
      life: 3,
      maxLife: 3,
    })
    nextId += 1
  }

  // ---------- มอนเคลื่อนที่ตามพฤติกรรมของตัวเอง ----------
  const enemyShots: EnemyShot[] = world.enemyShots.map((shot) => ({ ...shot }))

  for (const enemy of enemies) {
    enemy.hitFlash = Math.max(0, enemy.hitFlash - dt)
    enemy.clock += dt

    // ไฟที่ติดอยู่กัดกินเลือดต่อเนื่อง แม้ผู้เล่นจะไม่ได้ทำอะไรเพิ่ม
    if (enemy.burnFor > 0) {
      enemy.burnFor -= dt
      enemy.hp -= enemy.burnDps * dt
    }

    // น้ำแข็งทำให้เดินช้าลงครึ่งหนึ่ง ส่วนสกิลหยุดเวลาแทบหยุดสนิท
    const slowed = enemy.slowFor > 0
    if (slowed) enemy.slowFor -= dt
    const frozen = ultimateOn && ultSpec.kind === 'freeze'
    // ไอเย็นรอบตัวทำงานตลอดเวลา ไม่ต้องยิงโดน จึงช่วยตอนโดนรุมได้จริง
    const chilled =
      stats.frostAuraRadius > 0 && distance(enemy.pos, player.pos) <= stats.frostAuraRadius
    const speed = enemy.speed * (frozen ? 0.1 : slowed ? 0.45 : chilled ? 0.55 : 1)

    // โล่พลังงานเผาทุกตัวที่เข้ามาใกล้ตลอดเวลาที่เปิดอยู่
    if (ultimateOn && ultSpec.kind === 'shield' && distance(enemy.pos, player.pos) < 96) {
      enemy.hp -= 70 * stats.damageMultiplier * dt
      enemy.hitFlash = 0.1
    }

    const toPlayer = normalize({
      x: player.pos.x - enemy.pos.x,
      y: player.pos.y - enemy.pos.y,
    })
    const dist = distance(enemy.pos, player.pos)

    let vx = toPlayer.x * speed
    let vy = toPlayer.y * speed

    if (enemy.behavior === 'zigzag') {
      // ส่ายตั้งฉากกับทิศที่วิ่ง ทำให้ยิงนำยาก
      const wave = Math.sin(enemy.clock * 5) * speed * 0.75
      vx += -toPlayer.y * wave
      vy += toPlayer.x * wave
    } else if (enemy.behavior === 'dash') {
      /*
       * พุ่งเป็นช่วง หยุดนิ่งเป็นช่วง
       * ช่วงหยุดสำคัญพอ ๆ กับช่วงพุ่ง เพราะเป็นจังหวะที่เด็กได้ตั้งหลัก
       * ถ้าพุ่งตลอดเวลาจะกลายเป็นไล่ทันเสมอและหลบไม่ได้เลย
       */
      const phase = enemy.clock % 2.2
      const dashing = phase > 1.5
      vx = dashing ? vx : 0
      vy = dashing ? vy : 0
    } else if (enemy.behavior === 'ranged') {
      // เข้ามาถึงระยะแล้วหยุดยิง ไม่เดินชนเอง
      const KEEP = 190
      if (dist < KEEP) {
        vx = -toPlayer.x * speed * 0.6
        vy = -toPlayer.y * speed * 0.6
      }

      enemy.shootCooldown -= dt
      if (enemy.shootCooldown <= 0 && dist < 320) {
        enemyShots.push({
          id: nextId,
          pos: { ...enemy.pos },
          vel: { x: toPlayer.x * 210, y: toPlayer.y * 210 },
          damage: Math.round(enemy.damage * 0.7),
          radius: 6,
          life: 3,
        })
        nextId += 1
        enemy.shootCooldown = 2.2
      }
    }

    enemy.pos = { x: enemy.pos.x + vx * dt, y: enemy.pos.y + vy * dt }
  }

  // ---------- อาวุธ ----------
  const projectiles: ProjectileEntity[] = world.projectiles.map((shot) => ({ ...shot }))
  const effects: Effect[] = world.effects
    .map((effect) => ({ ...effect, life: effect.life - dt }))
    .filter((effect) => effect.life > 0)

  const weaponCooldowns = { ...world.weaponCooldowns }

  /*
   * ผลของสกิลวิเศษที่ออกฤทธิ์เป็นจังหวะ
   *
   * ตวัดพายุฟันสามครั้ง อุกกาบาตตกหลายลูก
   * ทำเป็นจังหวะแทนที่จะรวบเป็นครั้งเดียว เพราะการเห็นมันเกิดต่อเนื่อง
   * คือสิ่งที่ทำให้รู้สึกว่า "ท่าไม้ตายกำลังทำงานอยู่"
   * ถ้ารวบเป็นเฟรมเดียว เด็กจะเห็นแค่มอนหายไปเฉย ๆ โดยไม่รู้ว่าเพราะอะไร
   */
  const ultDuration = Math.max(ultSpec.duration, 0.35)
  const ultElapsedAfter = ultDuration - ultimate.activeFor
  const ultElapsedBefore = justActivated ? 0 : ultDuration - previousActive
  const ultPulse = (period: number): boolean =>
    justActivated ||
    (ultimateOn && Math.floor(ultElapsedBefore / period) !== Math.floor(ultElapsedAfter / period))

  /** ดูดคริสตัลทั้งสนามในเฟรมนี้ ใช้โดยสกิลขุมทรัพย์ */
  let harvestNow = false

  if (ultimateOn || justActivated) {
    if (ultSpec.kind === 'sweep' && ultPulse(0.3)) {
      const radius = 210 * stats.rangeMultiplier
      for (const enemy of enemies) {
        if (enemy.hp <= 0) continue
        if (distance(enemy.pos, player.pos) > radius + enemy.radius) continue
        hurt(enemy, 130 * stats.damageMultiplier, hits)
      }
      effects.push({
        id: nextId,
        kind: 'slash',
        pos: { ...player.pos },
        radius,
        life: 0.3,
        maxLife: 0.3,
      })
      nextId += 1
    }

    if (ultSpec.kind === 'meteor' && ultPulse(0.2)) {
      const rng = createRng(`${world.seed}-meteor-${Math.round(ultElapsedAfter * 100)}`)
      const at = { x: rng.int(60, ARENA_WIDTH - 60), y: rng.int(60, ARENA_HEIGHT - 60) }
      const radius = 130

      for (const enemy of enemies) {
        if (enemy.hp <= 0) continue
        if (distance(enemy.pos, at) > radius + enemy.radius) continue
        hurt(enemy, 120 * stats.damageMultiplier, hits)
        enemy.burnFor = Math.max(enemy.burnFor, 3)
        enemy.burnDps = Math.max(enemy.burnDps, 30)
      }
      effects.push({ id: nextId, kind: 'blast', pos: at, radius, life: 0.42, maxLife: 0.42 })
      nextId += 1
    }

    if (ultSpec.kind === 'harvest' && justActivated) harvestNow = true

    /*
     * คลื่นเสียง — วงขยายออกไปเรื่อย ๆ ตีเฉพาะตัวที่อยู่ในขอบวงตอนนั้น
     *
     * ตีเฉพาะขอบวง ไม่ใช่ทั้งวงเต็ม เพราะถ้าตีทั้งวงเต็มทุกจังหวะ
     * ตัวที่อยู่ใกล้จะโดนซ้ำทุกระลอก ซึ่งกลายเป็นตวัดพายุที่แรงกว่าเดิม
     * การตีเฉพาะขอบทำให้มันเป็น "คลื่นที่วิ่งผ่าน" จริง ๆ
     * และเป็นเหตุผลว่าทำไมมันแผ่ไกลได้แต่แรงต่อตัวน้อยกว่า
     */
    if (ultSpec.kind === 'echo' && ultPulse(0.28)) {
      const progress = Math.min(1, ultElapsedAfter / Math.max(0.1, ultSpec.duration))
      const outer = (110 + progress * 520) * stats.rangeMultiplier
      const inner = Math.max(0, outer - 130)

      for (const enemy of enemies) {
        if (enemy.hp <= 0) continue
        const gap = distance(enemy.pos, player.pos)
        if (gap > outer + enemy.radius || gap < inner) continue
        hurt(enemy, 72 * stats.damageMultiplier, hits)
        enemy.slowFor = Math.max(enemy.slowFor, 1.2)
      }

      effects.push({
        id: nextId,
        kind: 'blast',
        pos: { ...player.pos },
        radius: outer,
        life: 0.32,
        maxLife: 0.32,
      })
      nextId += 1
      sounds.push('zap')
    }

    /*
     * แรงโน้มถ่วง — ดูดมอนเข้าหาตัวตลอดเวลาที่ออกฤทธิ์ แล้วระเบิดตอนจบ
     *
     * ระหว่างดูดไม่ทำความเสียหายเลย ตั้งใจให้เป็นแบบนั้น
     * เพราะพลังของมันคือการ "จัดตำแหน่ง" ไม่ใช่การตี
     * เด็กที่กดตอนมอนกระจายอยู่ทั่วสนามจะได้ผลมากกว่าเด็กที่กดตอนโดนรุมอยู่แล้ว
     * ซึ่งเป็นการตัดสินใจที่ต้องคิด ไม่ใช่กดทันทีที่ชาร์จเต็ม
     *
     * ตอนดูดผู้เล่นยังโดนตีได้ตามปกติ จึงมีความเสี่ยงจริงถ้ากดผิดจังหวะ
     */
    if (ultSpec.kind === 'gravity') {
      if (ultimateOn) {
        for (const enemy of enemies) {
          if (enemy.hp <= 0) continue
          const away = normalize({
            x: player.pos.x - enemy.pos.x,
            y: player.pos.y - enemy.pos.y,
          })
          const pull = 240 * dt
          enemy.pos = {
            x: clamp(enemy.pos.x + away.x * pull, 0, ARENA_WIDTH),
            y: clamp(enemy.pos.y + away.y * pull, 0, ARENA_HEIGHT),
          }
        }
      }

      // ระเบิดครั้งเดียวตอนหมดเวลา ซึ่งเป็นตอนที่มอนกองรวมกันแน่นที่สุดพอดี
      if (previousActive > 0 && ultimate.activeFor <= 0) {
        const radius = 260
        for (const enemy of enemies) {
          if (enemy.hp <= 0) continue
          if (distance(enemy.pos, player.pos) > radius + enemy.radius) continue
          hurt(enemy, 260 * stats.damageMultiplier, hits)
        }
        effects.push({
          id: nextId,
          kind: 'blast',
          pos: { ...player.pos },
          radius,
          life: 0.5,
          maxLife: 0.5,
        })
        nextId += 1
        sounds.push('explode')
        addShake(0.8)
      }
    }

    /*
     * ยาฟื้นฟู — ออกฤทธิ์ครั้งเดียวตอนกด
     *
     * เป็นสกิลเดียวที่ซื้อ "เวลา" ตรง ๆ ไม่ได้ซื้อด้วยการฆ่ามอน
     * จึงต้องผลักมอนออกด้วย ไม่ใช่เติมเลือดอย่างเดียว
     * เพราะจังหวะที่เลือดจะหมดคือจังหวะที่ถูกรุมอยู่เสมอ
     * ถ้าเติมเลือดแล้วยังยืนอยู่กลางวงเดิม เลือดที่เพิ่งเติมจะหายไปในไม่กี่วินาที
     * ซึ่งเท่ากับกดสกิลทิ้งเปล่า ๆ (บทเรียนเดียวกับขนนกฟีนิกซ์)
     */
    if (ultSpec.kind === 'mend' && justActivated) {
      const PUSH = 200
      for (const enemy of enemies) {
        if (enemy.hp <= 0) continue
        if (distance(enemy.pos, player.pos) > PUSH) continue
        const away = normalize({
          x: enemy.pos.x - player.pos.x,
          y: enemy.pos.y - player.pos.y,
        })
        const dirX = away.x === 0 && away.y === 0 ? 0 : away.x
        const dirY = away.x === 0 && away.y === 0 ? -1 : away.y
        enemy.pos = {
          x: clamp(player.pos.x + dirX * PUSH, 0, ARENA_WIDTH),
          y: clamp(player.pos.y + dirY * PUSH, 0, ARENA_HEIGHT),
        }
        enemy.slowFor = Math.max(enemy.slowFor, 1.5)
      }

      effects.push({
        id: nextId,
        kind: 'blast',
        pos: { ...player.pos },
        radius: PUSH,
        life: 0.5,
        maxLife: 0.5,
      })
      nextId += 1
      sounds.push('heal')
    }

    /*
     * รัวหมัดสายฟ้า — ตีตัวที่ใกล้ที่สุดซ้ำ ๆ ทีละตัว
     *
     * เล็งตัวที่ใกล้ที่สุดใหม่ทุกจังหวะ ไม่ใช่ล็อกตัวเดียวตั้งแต่แรก
     * เพราะตัวที่อันตรายที่สุดคือตัวที่ประชิดอยู่ตอนนี้ ไม่ใช่ตัวที่ประชิดเมื่อวินาทีก่อน
     * ผลคือมันเก็บตัวที่ไล่ติดหลังได้ทีละตัว ซึ่งเป็นสถานการณ์ที่สกิลอื่นแก้ไม่ตรงจุด
     */
    if (ultSpec.kind === 'blitz' && ultPulse(0.22)) {
      let target: EnemyEntity | undefined
      let best = Infinity
      for (const enemy of enemies) {
        if (enemy.hp <= 0) continue
        const gap = distance(enemy.pos, player.pos)
        if (gap < best) {
          best = gap
          target = enemy
        }
      }

      if (target) {
        hurt(target, 300 * stats.damageMultiplier, hits)
        effects.push({
          id: nextId,
          kind: 'slash',
          pos: { ...target.pos },
          radius: 70,
          life: 0.22,
          maxLife: 0.22,
        })
        nextId += 1
        sounds.push('crit')
      }
    }
  }

  if (justActivated) {
    notices.push({ id: nextId, text: `${ultSpec.name}!`, life: 1.8, maxLife: 1.8 })
    sounds.push('ultimate')
    addShake(0.75)
    nextId += 1
  }

  for (const [weaponId, level] of Object.entries(world.weapons)) {
    const evolved = world.evolved.includes(weaponId)
    const spec = activeStats(weaponId, level, evolved)
    if (!spec) continue

    const cooldown = (weaponCooldowns[weaponId] ?? 0) - dt
    if (cooldown > 0) {
      weaponCooldowns[weaponId] = cooldown
      continue
    }

    const damage = spec.damage * stats.damageMultiplier
    const range = spec.range * stats.rangeMultiplier
    const target = nearestEnemy({ ...world, enemies, player })

    if (weaponId === 'sword') {
      /*
       * ดาบฟันเป็นวงรอบตัวทันที ไม่มีกระสุนให้บิน
       * จึงไม่ต้องมีเป้าหมาย ฟันได้แม้ไม่มีมอนอยู่ใกล้
       * แต่ถ้าไม่มีมอนเลยก็ไม่ต้องเสียแรงวาดเอฟเฟกต์
       */
      let hitAny = false
      for (const enemy of enemies) {
        if (enemy.hp <= 0) continue
        if (distance(enemy.pos, player.pos) > range + enemy.radius) continue
        hurt(enemy, damage, hits)
        hitAny = true
      }
      if (hitAny || enemies.length > 0) {
        effects.push({
          id: nextId,
          kind: 'slash',
          pos: { ...player.pos },
          radius: range,
          life: 0.22,
          maxLife: 0.22,
        })
        nextId += 1
      }
      weaponCooldowns[weaponId] = spec.interval * stats.cooldownMultiplier
      continue
    }

    if (weaponId === 'lightning') {
      /*
       * สายฟ้าฟาดทันทีแล้วกระโดดต่อ ไม่ต้องเล็งและไม่มีเวลาเดินทาง
       * เลือกเป้าถัดไปจากตัวที่ใกล้ตัวที่เพิ่งโดนที่สุด
       * และห้ามซ้ำตัวเดิม ไม่งั้นจะเด้งไปมาระหว่างสองตัวจนไร้ประโยชน์
       */
      if (!target) {
        weaponCooldowns[weaponId] = 0
        continue
      }

      const hitIds = new Set<number>()
      let from = player.pos
      let current: EnemyEntity | undefined = target

      for (let jump = 0; jump < spec.count && current; jump += 1) {
        hurt(current, damage, hits)
        hitIds.add(current.id)
        effects.push({
          id: nextId,
          kind: 'bolt',
          pos: { ...from },
          to: { ...current.pos },
          radius: 0,
          life: 0.16,
          maxLife: 0.16,
        })
        nextId += 1

        from = current.pos
        const previous: EnemyEntity = current
        current = undefined
        let best = range * 0.55

        for (const candidate of enemies) {
          if (candidate.hp <= 0 || hitIds.has(candidate.id)) continue
          const gap = distance(candidate.pos, previous.pos)
          if (gap < best) {
            best = gap
            current = candidate
          }
        }
      }

      weaponCooldowns[weaponId] = spec.interval * stats.cooldownMultiplier
      continue
    }

    // เวทไฟกับเวทน้ำแข็งยิงกระสุนออกไป จึงต้องมีเป้าหมายก่อน
    if (!target) {
      weaponCooldowns[weaponId] = 0
      continue
    }

    const base = Math.atan2(target.pos.y - player.pos.y, target.pos.x - player.pos.x)
    const shots = spec.count + stats.extraProjectiles
    const spread = 0.2

    for (let i = 0; i < shots; i += 1) {
      const angle = base + (i - (shots - 1) / 2) * spread
      const speed = (weaponId === 'fire' ? 320 : 460) * stats.projectileSpeed

      projectiles.push({
        id: nextId,
        weapon: weaponId,
        pos: { ...player.pos },
        vel: { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed },
        damage,
        radius: weaponId === 'fire' ? 9 : 6,
        blastRadius: weaponId === 'fire' ? range : 0,
        // ร่างสมบูรณ์ของน้ำแข็งแช่ได้นานเท่าตัว และของไฟไหม้นานกว่าเดิม
        slowFor: weaponId === 'ice' ? (evolved ? 4.4 : 2.2) : 0,
        burnFor: weaponId === 'fire' ? (evolved ? 5.5 : 3) : 0,
        hitsLeft: 1 + stats.pierce,
        life: 1.8,
        hitIds: [],
      })
      nextId += 1
    }

    weaponCooldowns[weaponId] = spec.interval * stats.cooldownMultiplier
  }

  // ---------- กระสุนเคลื่อนที่และชน ----------
  const survivingProjectiles: ProjectileEntity[] = []

  for (const shot of projectiles) {
    const moved: ProjectileEntity = {
      ...shot,
      pos: { x: shot.pos.x + shot.vel.x * dt, y: shot.pos.y + shot.vel.y * dt },
      life: shot.life - dt,
    }

    if (
      moved.life <= 0 ||
      moved.pos.x < -40 ||
      moved.pos.x > ARENA_WIDTH + 40 ||
      moved.pos.y < -40 ||
      moved.pos.y > ARENA_HEIGHT + 40
    ) {
      continue
    }

    let hitsLeft = moved.hitsLeft
    const hitIds = [...moved.hitIds]

    for (const enemy of enemies) {
      if (hitsLeft <= 0) break
      if (enemy.hp <= 0) continue
      // ตีตัวเดิมซ้ำในกระสุนลูกเดียวไม่ได้ ไม่งั้นลูกที่ค้างอยู่บนตัวมอน
      // จะตีรัวทุกเฟรมจนมอนตายทันที ซึ่งทำให้สกิลทะลุทะลวงไร้ความหมาย
      if (hitIds.includes(enemy.id)) continue
      if (distance(moved.pos, enemy.pos) > enemy.radius + moved.radius) continue

      hurt(enemy, moved.damage, hits)
      hitIds.push(enemy.id)
      hitsLeft -= 1

      if (moved.slowFor > 0) enemy.slowFor = Math.max(enemy.slowFor, moved.slowFor)
      if (moved.burnFor > 0) {
        enemy.burnFor = Math.max(enemy.burnFor, moved.burnFor)
        enemy.burnDps = Math.max(enemy.burnDps, moved.damage * 0.35)
      }

      // ลูกไฟระเบิดใส่ทุกตัวรอบจุดที่โดน
      if (moved.blastRadius > 0) {
        for (const other of enemies) {
          if (other.id === enemy.id || other.hp <= 0) continue
          if (distance(other.pos, moved.pos) > moved.blastRadius + other.radius) continue
          hurt(other, moved.damage * 0.6, hits)
          other.burnFor = Math.max(other.burnFor, moved.burnFor)
          other.burnDps = Math.max(other.burnDps, moved.damage * 0.25)
        }
        effects.push({
          id: nextId,
          kind: 'blast',
          pos: { ...moved.pos },
          radius: moved.blastRadius,
          life: 0.28,
          maxLife: 0.28,
        })
        nextId += 1
        hitsLeft = 0
      }
    }

    if (hitsLeft > 0) survivingProjectiles.push({ ...moved, hitsLeft, hitIds })
  }

  // ---------- กระสุนของมอน ----------
  let hp = Math.min(stats.maxHp, player.hp + stats.regenPerSecond * dt)
  let invulnerable = player.invulnerable
  const survivingEnemyShots: EnemyShot[] = []

  for (const shot of enemyShots) {
    const moved: EnemyShot = {
      ...shot,
      pos: { x: shot.pos.x + shot.vel.x * dt, y: shot.pos.y + shot.vel.y * dt },
      life: shot.life - dt,
    }
    if (moved.life <= 0) continue

    if (
      invulnerable <= 0 &&
      !ultimateGuard &&
      distance(moved.pos, player.pos) <= player.radius + moved.radius
    ) {
      hp -= moved.damage * (1 - stats.damageReduction)
      sounds.push('hurt')
      addShake(0.35)
      invulnerable = stats.graceSeconds
      continue
    }

    if (
      moved.pos.x < -40 || moved.pos.x > ARENA_WIDTH + 40 ||
      moved.pos.y < -40 || moved.pos.y > ARENA_HEIGHT + 40
    ) {
      continue
    }
    survivingEnemyShots.push(moved)
  }

  // ---------- มอนที่ตายแล้ว ----------
  const aliveEnemies: EnemyEntity[] = []
  const gems: GemEntity[] = [...world.gems]
  const pickups: PickupEntity[] = world.pickups
    .map((pickup) => ({ ...pickup, life: pickup.life - dt }))
    .filter((pickup) => pickup.life > 0)
  let kills = world.kills
  let bossesDown = world.bossesDown
  /** เลือดที่ดูดได้จากการล้มมอนในก้าวนี้ รวมทีเดียวตอนท้าย */
  let lifestealHeal = 0

  for (const enemy of enemies) {
    if (enemy.hp > 0) {
      aliveEnemies.push(enemy)
      continue
    }
    kills += 1

    /*
     * เศษที่กระเด็นตอนแตก
     *
     * บอสให้เศษเยอะกว่าและกระเด็นแรงกว่ามาก เพราะการล้มบอสได้
     * คือเหตุการณ์ที่ใหญ่ที่สุดในรอบ ควรดูต่างจากการล้มสไลม์ตัวหนึ่งอย่างชัดเจน
     *
     * ตรวจเพดานก่อนสร้างทุกครั้ง ไม่ใช่ตัดทีหลัง เพราะจุดที่ต้องกันคือ
     * ตอนมอนตายพร้อมกันสิบตัว ซึ่งเป็นตอนที่สร้างของแพงที่สุดพอดี
     */
    const burst = enemy.boss ? 26 : enemy.elite ? 12 : 6
    for (let i = 0; i < burst && particles.length < MAX_PARTICLES; i += 1) {
      const angle = (i / burst) * Math.PI * 2 + world.time
      const speed = (enemy.boss ? 200 : 120) * (0.45 + ((i * 37) % 100) / 100)
      particles.push({
        id: nextId,
        pos: { ...enemy.pos },
        vel: { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed },
        life: enemy.boss ? 0.9 : 0.5,
        maxLife: enemy.boss ? 0.9 : 0.5,
        color: enemy.boss ? '#fbbf24' : enemy.elite ? '#a78bfa' : '#f87171',
        size: enemy.boss ? 5 : 3,
      })
      nextId += 1
    }
    sounds.push(enemy.boss ? 'explode' : 'kill')
    if (enemy.boss) addShake(0.85)

    // ชาร์จสกิลวิเศษด้วยการล้มมอน บอสกับตัวใหญ่พิเศษนับหลายตัว
    ultimate = {
      ...ultimate,
      charge:
        ultimate.charge +
        (enemy.boss ? 10 : enemy.elite ? 5 : 1) * stats.ultimateChargeMultiplier,
    }

    lifestealHeal += stats.lifestealPerKill

    // ระเบิดลูกโซ่ ทำให้ฝูงที่เบียดกันแน่นล้มต่อกันเป็นทอด ๆ
    if (stats.bloomDamage > 0) {
      for (const other of enemies) {
        if (other.id === enemy.id || other.hp <= 0) continue
        if (distance(other.pos, enemy.pos) > 96) continue
        hurt(other, stats.bloomDamage * stats.damageMultiplier)
      }
      effects.push({
        id: nextId,
        kind: 'blast',
        pos: { ...enemy.pos },
        radius: 96,
        life: 0.22,
        maxLife: 0.22,
      })
      nextId += 1
    }
    gems.push({ id: nextId, pos: { ...enemy.pos }, value: enemy.xpValue })
    nextId += 1

    if (enemy.boss) {
      bossesDown += 1
      // หีบไม่มีวันหมดอายุ เด็กที่กำลังหนีอยู่จะได้ไม่เสียรางวัลที่หามาได้
      pickups.push({ id: nextId, kind: 'chest', pos: { ...enemy.pos }, life: Infinity })
      nextId += 1
    } else {
      /*
       * ของตกจากมอนธรรมดา
       *
       * โอกาสตั้งไว้ต่ำโดยตั้งใจ ประมาณหนึ่งในยี่สิบตัว
       * ถ้าตกบ่อยกว่านี้ เลือดจะเต็มตลอดเวลาจนไม่มีความกดดันเหลือเลย
       * แต่ถ้าไม่มีเลย ช่วงกลางรอบจะเงียบสนิทเพราะไม่มีอะไรเกิดขึ้น
       */
      const roll = createRng(`${world.seed}-drop-${enemy.id}`).next() / stats.luckMultiplier
      const kind: PickupKind | undefined =
        roll < 0.028 ? 'heart' : roll < 0.045 ? 'bomb' : roll < 0.062 ? 'magnet' : undefined

      if (kind) {
        pickups.push({ id: nextId, kind, pos: { ...enemy.pos }, life: 12 })
        nextId += 1
      }
    }

    // สไลม์ใหญ่แตกเป็นตัวเล็ก ทำให้การล้มมันไม่ใช่จุดจบทันที
    for (let i = 0; i < enemy.splitInto; i += 1) {
      const angle = (i / enemy.splitInto) * Math.PI * 2
      aliveEnemies.push(
        makeEnemy(
          nextId,
          SPLIT_CHILD,
          {
            x: clamp(enemy.pos.x + Math.cos(angle) * 22, 0, ARENA_WIDTH),
            y: clamp(enemy.pos.y + Math.sin(angle) * 22, 0, ARENA_HEIGHT),
          },
          difficultyScale(time),
          false,
        ),
      )
      nextId += 1
    }
  }

  // ---------- คริสตัลถูกดูดเข้าหาตัว ----------
  const remainingGems: GemEntity[] = []
  let xp = player.xp

  for (const gem of gems) {
    const dist = distance(gem.pos, player.pos)

    // สกิลขุมทรัพย์กวาดคริสตัลทั้งสนามเข้ามาในเฟรมเดียว ไม่ต้องเดินไปเก็บ
    if (harvestNow) {
      xp += gem.value * stats.xpMultiplier
      continue
    }

    if (dist <= player.radius + 8) {
      xp += gem.value * stats.xpMultiplier
      continue
    }

    if (dist <= stats.magnetRange) {
      const pull = normalize({ x: player.pos.x - gem.pos.x, y: player.pos.y - gem.pos.y })
      const pullSpeed = 240 * (1 - dist / stats.magnetRange) + 90
      remainingGems.push({
        ...gem,
        pos: { x: gem.pos.x + pull.x * pullSpeed * dt, y: gem.pos.y + pull.y * pullSpeed * dt },
      })
      continue
    }

    remainingGems.push(gem)
  }

  if (lifestealHeal > 0) hp = Math.min(stats.maxHp, hp + lifestealHeal)
  if (harvestNow) hp = Math.min(stats.maxHp, hp + stats.maxHp * 0.5)

  // ---------- เก็บของที่ตกอยู่ ----------
  const remainingPickups: PickupEntity[] = []
  const evolved = [...world.evolved]
  let chests = world.chests
  let gemsAfterPickups = remainingGems

  for (const pickup of pickups) {
    if (distance(pickup.pos, player.pos) > player.radius + 16) {
      remainingPickups.push(pickup)
      continue
    }

    if (pickup.kind === 'heart') {
      hp = Math.min(stats.maxHp, hp + stats.maxHp * 0.25)
      notices.push({ id: nextId, text: 'ฟื้นเลือด!', life: 1.4, maxLife: 1.4 })
      sounds.push('heal')
      nextId += 1
    } else if (pickup.kind === 'bomb') {
      // ระเบิดทั้งสนาม เป็นปุ่มหนีตายที่ได้มาจากโชค ไม่ใช่จากการกดปุ่ม
      for (const enemy of aliveEnemies) hurt(enemy, 120 * stats.damageMultiplier)
      effects.push({
        id: nextId,
        kind: 'blast',
        pos: { ...player.pos },
        radius: 420,
        life: 0.5,
        maxLife: 0.5,
      })
      nextId += 1
      notices.push({ id: nextId, text: 'ระเบิดทั้งสนาม!', life: 1.4, maxLife: 1.4 })
      sounds.push('explode')
      addShake(0.7)
      nextId += 1
    } else if (pickup.kind === 'magnet') {
      for (const gem of gemsAfterPickups) xp += gem.value * stats.xpMultiplier
      gemsAfterPickups = []
      notices.push({ id: nextId, text: 'ดูดคริสตัลทั้งสนาม!', life: 1.4, maxLife: 1.4 })
      sounds.push('pickup')
      nextId += 1
    } else {
      /*
       * หีบจากบอส
       *
       * ถ้ามีอาวุธที่พร้อมจะสมบูรณ์ ให้อันนั้นก่อนเสมอ
       * ถ้ายังไม่มีอะไรพร้อม ต้องไม่ปล่อยให้ได้ "หีบเปล่า"
       * เพราะการล้มบอสได้แล้วไม่ได้อะไรเลยคือความผิดหวังที่แรงมาก
       * จึงให้ XP ก้อนใหญ่แทน ซึ่งมักดันให้เลเวลอัปทันทีอยู่ดี
       */
      chests += 1
      // ได้ XP ด้วยเสมอ หีบจึงคุ้มค่าทันทีแม้ยังไม่มีอาวุธไหนพร้อม
      xp += player.xpToNext * 0.5
      notices.push({ id: nextId, text: 'ได้หีบสมบัติ!', life: 2, maxLife: 2 })
      sounds.push('chest')
      nextId += 1
    }
  }

  /*
   * ใช้หีบที่เก็บไว้ทันทีที่มีอาวุธพร้อม
   *
   * ตรวจทุกเฟรม ไม่ใช่ตอนเปิดหีบอย่างเดียว
   * เพราะสิ่งที่ทำให้อาวุธ "พร้อม" คือการเลือกการ์ดตอนเลเวลอัป
   * ซึ่งเกิดคนละจังหวะกับการเปิดหีบเสมอ
   */
  while (chests > 0) {
    const ready = readyToEvolve({ ...world, weapons: world.weapons, skills: world.skills, evolved })
    if (ready.length === 0) break

    const weaponId = ready[0]
    evolved.push(weaponId)
    sounds.push('evolve')
    addShake(0.5)
    chests -= 1
    notices.push({
      id: nextId,
      text: `${weaponDisplayName(weaponId, true)} สมบูรณ์แล้ว!`,
      life: 3.4,
      maxLife: 3.4,
    })
    nextId += 1
  }

  // ---------- มอนชนผู้เล่น ----------
  if (invulnerable <= 0 && !ultimateGuard) {
    for (const enemy of aliveEnemies) {
      if (distance(enemy.pos, player.pos) > enemy.radius + player.radius) continue
      hp -= enemy.damage * (1 - stats.damageReduction)
      sounds.push('hurt')
      addShake(0.4)
      // หนามสะท้อนใส่ตัวที่ชน ทำให้การยืนสู้มีทางเล่นของตัวเอง
      if (stats.thornsDamage > 0) hurt(enemy, stats.thornsDamage * stats.damageMultiplier)
      // ช่วงอมตะสั้น ๆ กันโดนรุมจนเลือดหมดในเสี้ยววินาทีโดยไม่มีทางหนี
      invulnerable = stats.graceSeconds
      break
    }
  }

  const leveledUp = xp >= player.xpToNext

  /*
   * ฟื้นคืนชีพ
   *
   * ต้องผลักมอนรอบตัวออกไปด้วย ไม่ใช่แค่เติมเลือด
   * เพราะจังหวะที่เลือดหมดคือจังหวะที่โดนรุมอยู่พอดีเสมอ
   * ถ้าฟื้นแล้วยังยืนอยู่กลางวงเดิม จะโดนตีตายซ้ำในเสี้ยววินาทีถัดมา
   * ซึ่งเท่ากับจ่ายเงินซื้อของที่ไม่ได้ช่วยอะไรเลย
   */
  let revivesLeft = world.revivesLeft
  let revivedEnemies = aliveEnemies

  if (hp <= 0 && revivesLeft > 0) {
    revivesLeft -= 1
    hp = stats.maxHp * 0.6
    invulnerable = 2.4

    const PUSH = 230
    revivedEnemies = aliveEnemies.map((enemy) => {
      const gap = distance(enemy.pos, player.pos)
      if (gap > PUSH) return enemy

      const away = normalize({
        x: enemy.pos.x - player.pos.x,
        y: enemy.pos.y - player.pos.y,
      })
      // มอนที่ทับตัวผู้เล่นพอดีจะไม่มีทิศ จึงผลักขึ้นบนเป็นค่าเริ่มต้น
      const dirX = away.x === 0 && away.y === 0 ? 0 : away.x
      const dirY = away.x === 0 && away.y === 0 ? -1 : away.y

      return {
        ...enemy,
        pos: {
          x: clamp(player.pos.x + dirX * PUSH, 0, ARENA_WIDTH),
          y: clamp(player.pos.y + dirY * PUSH, 0, ARENA_HEIGHT),
        },
        slowFor: Math.max(enemy.slowFor, 1.5),
      }
    })

    effects.push({
      id: nextId,
      kind: 'blast',
      pos: { ...player.pos },
      radius: PUSH,
      life: 0.6,
      maxLife: 0.6,
    })
    nextId += 1
    notices.push({ id: nextId, text: 'ขนนกฟีนิกซ์ช่วยไว้!', life: 2.6, maxLife: 2.6 })
    nextId += 1
  }

  const dead = hp <= 0

  /*
   * ตัวเลขความเสียหาย: ของเดิมที่ยังไม่หมดอายุ บวกของใหม่ในก้าวนี้
   *
   * จำกัดจำนวนไว้ เพราะตอนอาวุธครบและมอนแน่น จะมีการตีโดนหลายสิบครั้งต่อก้าว
   * ตัวเลขที่ซ้อนกันหนาขนาดนั้นอ่านไม่ออกอยู่ดี และบังมอนจนเล่นไม่ได้
   * เลือกทิ้งของเก่าก่อน เพราะของใหม่คือสิ่งที่เด็กกำลังมองอยู่
   */
  const agedNumbers = world.damageNumbers
    .map((entry) => ({ ...entry, life: entry.life - dt }))
    .filter((entry) => entry.life > 0)

  const damageNumbers: DamageNumber[] = [...agedNumbers]
  for (const hit of hits) {
    damageNumbers.push({
      id: nextId,
      pos: { ...hit.pos },
      amount: Math.max(1, Math.round(hit.amount)),
      big: hit.big,
      life: hit.big ? 0.85 : 0.6,
      maxLife: hit.big ? 0.85 : 0.6,
      // กระจายซ้ายขวาเล็กน้อย ไม่งั้นการตีรัวจะเห็นเป็นตัวเลขทับกันตัวเดียว
      drift: ((nextId % 7) - 3) * 11,
    })
    nextId += 1
    if (hit.big) addShake(0.12)
  }
  if (hits.length > 0) sounds.push('hit')

  const trimmedNumbers =
    damageNumbers.length > MAX_DAMAGE_NUMBERS
      ? damageNumbers.slice(damageNumbers.length - MAX_DAMAGE_NUMBERS)
      : damageNumbers

  return {
    ...world,
    time,
    player: {
      ...player,
      hp: Math.max(0, Math.min(stats.maxHp, hp)),
      xp,
      invulnerable,
    },
    enemies: revivedEnemies,
    projectiles: survivingProjectiles,
    enemyShots: survivingEnemyShots,
    effects,
    damageNumbers: trimmedNumbers,
    particles,
    shake,
    sounds,
    gems: gemsAfterPickups,
    pickups: remainingPickups,
    notices,
    evolved,
    chests,
    weaponCooldowns,
    spawnCooldown,
    eliteCooldown,
    bossCooldown,
    bossesDown,
    ultimate,
    revivesLeft,
    nextId,
    kills,
    phase: dead ? 'dead' : leveledUp ? 'question' : 'playing',
  }
}

/**
 * เดินหน้าโลกตามเวลาจริงที่ผ่านไป
 *
 * แบ่งเป็นก้าวคงที่หลายก้าว และจำกัดจำนวนก้าวต่อเฟรม
 * ถ้าผู้เล่นสลับแท็บไปนาน เวลาที่ค้างอยู่จะเยอะมาก
 * ถ้าไล่คำนวณให้ครบ เกมจะค้างไปหลายวินาทีแล้วเด็กตายโดยไม่รู้ตัว
 * ยอมทิ้งเวลาส่วนเกินดีกว่า
 */
export function advance(world: WorldState, elapsedSeconds: number, input: Input): WorldState {
  const steps = Math.min(MAX_STEPS_PER_FRAME, Math.floor(elapsedSeconds / FIXED_STEP))
  let next = world
  /*
   * เสียงต้องรวมจากทุกก้าวย่อย ไม่ใช่เอาแค่ก้าวสุดท้าย
   *
   * หนึ่งเฟรมของหน้าจอกินเวลาหลายก้าวของเครื่องยนต์
   * ถ้าเอาแค่ก้าวสุดท้าย เสียงของก้าวก่อนหน้าจะหายไปเงียบ ๆ
   * ซึ่งแปลว่าบนเครื่องที่เฟรมตก เสียงจะหายไปมากกว่าเครื่องที่ลื่น
   * เป็นข้อผิดพลาดที่หาสาเหตุยากมาก เพราะเกิดเฉพาะบนเครื่องช้า
   */
  const collected: SoundCue[] = []
  for (let i = 0; i < steps; i += 1) {
    next = step(next, input)
    for (const cue of next.sounds) {
      if (!collected.includes(cue)) collected.push(cue)
    }
    if (next.phase !== 'playing') break
  }
  return steps > 0 ? { ...next, sounds: collected } : next
}

/**
 * ปุ่มที่ใช้เดิน เก็บเป็นรหัสตำแหน่งปุ่มบนแป้น ไม่ใช่ตัวอักษรที่พิมพ์ออกมา
 *
 * ต้องใช้ event.code ไม่ใช่ event.key
 * event.key คือตัวอักษรที่พิมพ์ออกมา ซึ่งเปลี่ยนตามผังแป้นพิมพ์
 * เด็กที่เปิดแป้นภาษาไทยค้างไว้ กด W จะได้ "ไ" กด A จะได้ "ฟ"
 * WASD จะใช้ไม่ได้ทั้งชุด ซึ่งในห้องเรียนไทยเกิดขึ้นแน่นอน
 * และถ้าเปิด Caps Lock ไว้ event.key จะเป็นตัวใหญ่ซึ่งก็ไม่ตรงอีก
 */
export const MOVE_KEY_CODES = [
  'ArrowLeft',
  'ArrowRight',
  'ArrowUp',
  'ArrowDown',
  'KeyA',
  'KeyD',
  'KeyW',
  'KeyS',
] as const

export function isMoveKey(code: string): boolean {
  return (MOVE_KEY_CODES as readonly string[]).includes(code)
}

/**
 * แปลงปุ่มที่กดค้างอยู่เป็นทิศทางเดิน
 *
 * กดซ้ายกับขวาพร้อมกันต้องได้ศูนย์ ไม่ใช่เอียงไปทางใดทางหนึ่ง
 * เด็กกดรัวสองปุ่มพร้อมกันบ่อยมาก ถ้าไม่หักล้างกันตัวละครจะไถลเอง
 */
export function moveFromKeys(codes: ReadonlySet<string>): Vec {
  const move = { x: 0, y: 0 }
  if (codes.has('ArrowLeft') || codes.has('KeyA')) move.x -= 1
  if (codes.has('ArrowRight') || codes.has('KeyD')) move.x += 1
  if (codes.has('ArrowUp') || codes.has('KeyW')) move.y -= 1
  if (codes.has('ArrowDown') || codes.has('KeyS')) move.y += 1
  return move
}

/**
 * ตัวเลือกหนึ่งใบตอนเลเวลอัป
 *
 * รวมสามอย่างไว้ในรูปแบบเดียว: อาวุธใหม่ อัปเกรดอาวุธ และสกิลติดตัว
 * หน้าจอจึงวาดการ์ดแบบเดียวได้ทั้งหมด ไม่ต้องแยกสามชนิด
 */
export interface Offer {
  /** 'weapon' คืออาวุธใหม่หรืออัปเกรด 'skill' คือสกิลติดตัว */
  kind: 'weapon' | 'skill'
  id: string
  name: string
  description: string
  icon: string
  color: string
  /** ระดับที่จะได้ถ้าเลือกใบนี้ ใช้เฉพาะอาวุธ */
  nextLevel?: number
  /** ใบนี้เป็นอาวุธชิ้นใหม่ที่ยังไม่เคยมี */
  isNew: boolean
}

/**
 * ตัวเลือกทั้งหมดที่ให้เลือกได้ตอนนี้
 *
 * ลำดับความสำคัญที่ตั้งใจ: อาวุธใหม่มีน้ำหนักสูงที่สุด
 * เพราะอาวุธชิ้นที่สองเปลี่ยนวิธีเล่นทั้งรอบ ต่างจากสกิลที่เพิ่มตัวเลข
 * เด็กควรได้เจอทางเลือกที่เปลี่ยนเกมก่อน แล้วค่อยไปสะสมตัวเลขทีหลัง
 */
function availableOffers(world: WorldState): { offer: Offer; weight: number }[] {
  const out: { offer: Offer; weight: number }[] = []
  const owned = Object.keys(world.weapons)

  for (const weapon of WEAPONS) {
    const level = world.weapons[weapon.id] ?? 0

    if (level === 0) {
      // ถือครบช่องแล้วก็รับอาวุธชิ้นใหม่ไม่ได้
      if (owned.length >= MAX_WEAPON_SLOTS) continue
      out.push({
        // อาวุธชิ้นใหม่ยังสำคัญ แต่ไม่ควรแย่งที่การอัปของที่ถืออยู่แล้ว
        weight: owned.length >= 2 ? 4 : 8,
        offer: {
          kind: 'weapon',
          id: weapon.id,
          name: weapon.name,
          description: `${weapon.description} — ${weapon.playstyle}`,
          icon: weapon.icon,
          color: weapon.color,
          nextLevel: 1,
          isNew: true,
        },
      })
      continue
    }

    if (level >= MAX_WEAPON_LEVEL) continue

    const next = weaponStats(weapon.id, level + 1)
    const now = weaponStats(weapon.id, level)
    let gain =
      next && now
        ? `แรงขึ้น ${Math.round((next.damage / now.damage - 1) * 100)}%` +
          (next.count > now.count ? ` และเพิ่มเป็น ${next.count} เป้า` : '')
        : 'แรงขึ้น'

    /*
     * ใบที่จะทำให้อาวุธเต็มระดับต้องบอกด้วยว่าต่อไปต้องทำอะไร
     * ไม่งั้นเด็กจะอัปจนเต็มแล้วไม่รู้เลยว่ามีร่างสมบูรณ์อยู่
     * ระบบที่ต้องเปิดคู่มืออ่านถึงจะรู้ว่ามีอยู่ เท่ากับไม่มี
     */
    if (level + 1 >= MAX_WEAPON_LEVEL) {
      gain += ` · เต็มระดับแล้ว! มี${weapon.evolution.requiresLabel}แล้วล้มบอสเอาหีบ จะได้ ${weapon.evolution.name}`
    }

    out.push({
      weight: 6,
      offer: {
        kind: 'weapon',
        id: weapon.id,
        name: `${weapon.name} ระดับ ${level + 1}`,
        description: gain,
        icon: weapon.icon,
        color: weapon.color,
        nextLevel: level + 1,
        isNew: false,
      },
    })
  }

  /*
   * ช่องสกิลเต็มแล้วจะเสนอเฉพาะสกิลที่ถืออยู่ ไม่เสนอสกิลใหม่อีก
   *
   * นี่คือกติกาที่เกมแนวนี้ใช้กันทั่วไป และเป็นสิ่งที่ทำให้บิลด์ "ลึก" ขึ้น
   * ถ้าเสนอสกิลใหม่ได้ไม่จำกัด เด็กจะเก็บครบทุกใบในรอบเดียว
   * ทุกรอบจะจบลงที่บิลด์เดียวกันหมด แล้วการเลือกการ์ดก็ไม่มีความหมาย
   *
   * พอจำกัดช่อง ใบแรก ๆ กลายเป็นการตัดสินใจว่าจะเดินทางไหน
   * และเมื่อเลือกแล้ว การ์ดถัดไปจะช่วยดันทางนั้นให้สุด
   */
  const ownedSkills = Object.keys(world.skills).filter((id) => (world.skills[id] ?? 0) > 0)
  const skillSlotsFull = ownedSkills.length >= MAX_SKILL_SLOTS

  for (const skill of SKILLS) {
    const stacks = world.skills[skill.id] ?? 0
    if (stacks >= skill.maxStacks) continue
    if (skillSlotsFull && stacks === 0) continue

    /*
     * สกิลที่ถืออยู่แล้วมีน้ำหนักสูงกว่าสกิลใหม่เสมอ
     * ทำให้ทางที่เด็กเลือกไว้เดินหน้าต่อได้จริง ไม่ใช่ถูกของใหม่แย่งที่ตลอด
     */
    out.push({
      weight: stacks > 0 ? skill.weight + 4 : skill.weight,
      offer: {
        kind: 'skill',
        id: skill.id,
        name: stacks > 0 ? `${skill.name} ชั้น ${stacks + 1}` : skill.name,
        description: skill.description,
        icon: skill.icon,
        color: '#a78bfa',
        isNew: stacks === 0,
      },
    })
  }

  return out
}

/**
 * สุ่มตัวเลือกให้เลือก
 *
 * ตัดของที่เต็มแล้วออกก่อนเสมอ
 * ถ้าเสนอของที่เลือกไปก็ไม่ได้อะไร เด็กจะรู้สึกว่าโดนโกงตาเลือก
 */
export function offerSkills(world: WorldState, count: number): Offer[] {
  const rng = createRng(`${world.seed}-lvl-${world.player.level}`)
  const available = availableOffers(world)

  const pool: Offer[] = []
  for (const entry of available) {
    for (let i = 0; i < entry.weight; i += 1) pool.push(entry.offer)
  }

  const picked: Offer[] = []

  /*
   * ใบแรกต้องเป็นอาวุธเสมอ ถ้ายังมีอาวุธให้เลือกอยู่
   *
   * ข้อนี้ไม่ใช่การปรับสมดุลเล็ก ๆ แต่เป็นการตัดวงจรที่ทำให้เกมพัง
   *
   * จำลองแล้วพบว่ารอบที่ดวงไม่ดีจะไม่ได้อัปอาวุธเลยหลายเลเวลติด
   * พอความแรงไม่ขึ้น ก็ล้มมอนไม่ทัน พอล้มไม่ทัน XP ก็ไม่เข้า
   * พอไม่ได้เลเวลก็ยิ่งไม่ได้อัปอาวุธ แล้ววนกลับไปแย่ลงเรื่อย ๆ จนตาย
   * วัดได้ว่ารอบแบบนี้ตายที่ 60 วินาทีด้วยดาบระดับ 1 ทั้งที่เล่นถูกวิธี
   * ส่วนรอบที่ดวงดีอยู่ได้เกินเจ็ดนาที ต่างกันเกินเจ็ดเท่าโดยที่ฝีมือเท่ากัน
   *
   * เด็กที่เจอรอบแบบนั้นจะสรุปว่า "เกมนี้เล่นยังไงก็ตาย" ซึ่งไม่จริง
   * และไม่มีทางรู้เลยว่าที่ตายเพราะดวง ไม่ใช่เพราะเล่นผิด
   */
  const weaponOffers = available.filter((entry) => entry.offer.kind === 'weapon')
  if (weaponOffers.length > 0 && count > 0) {
    const weaponPool: Offer[] = []
    for (const entry of weaponOffers) {
      for (let i = 0; i < entry.weight; i += 1) weaponPool.push(entry.offer)
    }
    picked.push(rng.pick(weaponPool))
  }

  for (let attempt = 0; attempt < 120 && picked.length < count; attempt += 1) {
    if (pool.length === 0) break
    const offer = rng.pick(pool)
    if (picked.some((entry) => entry.id === offer.id)) continue
    picked.push(offer)
  }

  /*
   * สลับตำแหน่งก่อนคืนออกไป
   *
   * จำเป็นเพราะใบอาวุธที่การันตีไว้ถูกใส่เข้ามาเป็นใบแรกเสมอ
   * จำลองแล้วพบว่าผู้เล่นที่กดใบแรกตลอด (ซึ่งเด็กเล็กทำแบบนี้จริง)
   * จะได้แต่อาวุธ ไม่ได้สกิลติดตัวเลยสักใบตลอดทั้งรอบ
   * วัดได้ว่าถือสกิลเฉลี่ย 0.0 ใบ ทั้งที่มีสกิลให้เลือกสิบเก้าแบบ
   *
   * การการันตียังอยู่ครบ เปลี่ยนแค่ว่ามันจะโผล่ตำแหน่งไหน
   */
  return rng.shuffle(picked)
}

/** จำนวนใบที่ได้เลือก ตอบถูกได้สาม ตอบผิดได้สอง */
export function offerCount(correct: boolean): number {
  return correct ? 3 : 2
}

/** บันทึกผลการตอบโจทย์ แล้วเปิดหน้าจอเลือกสกิล */
export function resolveQuestion(world: WorldState, correct: boolean): WorldState {
  return { ...world, lastAnswerCorrect: correct, phase: 'choosing' }
}

/**
 * รับตัวเลือกแล้วกลับไปเล่นต่อ
 *
 * เลเวลขึ้นตรงนี้ ไม่ใช่ตอนที่ XP ครบ
 * เพราะถ้าขึ้นตอน XP ครบ แล้วเด็กปิดหน้าจอเลือกทิ้ง
 * จะได้เลเวลฟรีโดยไม่ได้อะไร ซึ่งทำให้ XP ที่ต้องใช้พุ่งขึ้นเปล่า ๆ
 */
export function takeSkill(world: WorldState, id: string): WorldState {
  const weapon = getWeapon(id)
  const skill = getSkill(id)
  if (!weapon && !skill) return world

  let skills = world.skills
  let weapons = world.weapons

  if (weapon) {
    const level = world.weapons[id] ?? 0
    if (level >= MAX_WEAPON_LEVEL) return world
    if (level === 0 && Object.keys(world.weapons).length >= MAX_WEAPON_SLOTS) return world
    weapons = { ...world.weapons, [id]: level + 1 }
  } else if (skill) {
    const current = world.skills[id] ?? 0
    if (current >= skill.maxStacks) return world
    skills = { ...world.skills, [id]: current + 1 }
  }

  const level = world.player.level + 1
  const leftover = Math.max(0, world.player.xp - world.player.xpToNext)
  const statsAfter = statsFrom(skills, world.perks)

  return {
    ...world,
    skills,
    weapons,
    player: {
      ...world.player,
      level,
      xp: leftover,
      xpToNext: xpNeededFor(level),
      maxHp: statsAfter.maxHp,
      // เลือกพลังชีวิตแล้วต้องฟื้นให้ทันที ไม่ใช่แค่เพิ่มเพดานเปล่า ๆ
      hp: Math.min(statsAfter.maxHp, world.player.hp + (id === 'vitality' ? 20 : 0)),
    },
    phase: 'playing',
  }
}

/**
 * ขึ้นเลเวลโดยไม่รับสกิล
 *
 * ใช้ตอนที่เก็บสกิลครบทุกใบแล้วจนไม่มีอะไรให้เลือก
 *
 * จำเป็นต้องมี ไม่ใช่ของฟุ่มเฟือย
 * ถ้าไม่มีทางนี้ หน้าจอเลือกสกิลจะค้างอยู่ตลอดไปเพราะไม่มีปุ่มไหนกดได้
 * และถ้าแค่สั่งให้กลับไปเล่นต่อโดยไม่ขึ้นเลเวล
 * XP ที่ล้นอยู่จะสั่งให้หยุดถามโจทย์ใหม่ทันทีในเฟรมถัดไป วนไม่รู้จบ
 */
export function skipSkill(world: WorldState): WorldState {
  const level = world.player.level + 1
  const leftover = Math.max(0, world.player.xp - world.player.xpToNext)

  return {
    ...world,
    player: {
      ...world.player,
      level,
      xp: leftover,
      xpToNext: xpNeededFor(level),
    },
    phase: 'playing',
  }
}

/** สรุปผลตอนจบเกม ใช้จ่ายรางวัลและโชว์สถิติ */
export interface RunSummary {
  survivedSeconds: number
  kills: number
  level: number
  coins: number
  bossesDown: number
  /** ชื่อร่างสมบูรณ์ที่ทำได้ในรอบนี้ ใช้แสดงบนหน้าจอสรุป */
  evolvedNames: string[]
  /**
   * รหัสอาวุธที่ปลุกร่างสมบูรณ์ได้ในรอบนี้
   *
   * แยกจาก evolvedNames เพราะสมุดสถิติต้องเก็บรหัสที่ไม่เปลี่ยน
   * ถ้าเก็บชื่อที่แปลแล้ว วันไหนแก้ชื่อร่างสมบูรณ์ให้เพราะขึ้น
   * ของที่เด็กเคยเก็บได้จะกลายเป็นของคนละใบทันที
   */
  evolvedIds: string[]
  /** ใช้สกิลวิเศษไปกี่ครั้ง */
  ultimatesUsed: number
}

export function summarize(world: WorldState): RunSummary {
  return {
    survivedSeconds: Math.floor(world.time),
    kills: world.kills,
    level: world.player.level,
    /*
     * เหรียญมาจากเวลาที่รอด จำนวนที่ล้มได้ และบอสที่ล้มได้
     * เล่นสไตล์ไหนก็ได้รางวัล แต่การล้มบอลให้ก้อนโตที่สุด
     * เพราะเป็นสิ่งที่ต้องกล้าหันกลับไปสู้ ไม่ใช่แค่รอดไปเรื่อย ๆ
     */
    coins: Math.floor(world.time / 3) + world.kills * 2 + world.bossesDown * 25,
    bossesDown: world.bossesDown,
    evolvedNames: world.evolved.map((id) => weaponDisplayName(id, true)),
    evolvedIds: [...world.evolved],
    ultimatesUsed: world.ultimate.used,
  }
}
