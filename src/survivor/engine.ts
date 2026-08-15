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
import { SKILLS, getSkill, statsFrom } from './skills'
import type { Skill } from './skills'
import {
  ARENA_HEIGHT,
  ARENA_WIDTH,
  type EnemyEntity,
  type GemEntity,
  type Input,
  type ProjectileEntity,
  type Vec,
  type WorldState,
} from './types'

/** ก้าวเวลาคงที่ 1/60 วินาที */
export const FIXED_STEP = 1 / 60

/** ก้าวสูงสุดที่ยอมประมวลผลในหนึ่งเฟรม กันการค้างยาวแล้วคำนวณย้อนหลังเป็นพันก้าว */
export const MAX_STEPS_PER_FRAME = 5

const XP_BASE = 5
const XP_GROWTH = 1.35

/** ชนิดมอนสเตอร์ที่โผล่ตามเวลา */
interface EnemyKind {
  kind: string
  hp: number
  speed: number
  damage: number
  radius: number
  xpValue: number
  /** วินาทีที่เริ่มโผล่ได้ */
  fromTime: number
}

const ENEMY_KINDS: EnemyKind[] = [
  { kind: 'number-slime', hp: 20, speed: 46, damage: 8, radius: 16, xpValue: 1, fromTime: 0 },
  { kind: 'fraction-bat', hp: 14, speed: 78, damage: 6, radius: 13, xpValue: 2, fromTime: 25 },
  { kind: 'goblin-calculator', hp: 42, speed: 40, damage: 12, radius: 19, xpValue: 3, fromTime: 55 },
  { kind: 'decimal-scorpion', hp: 30, speed: 64, damage: 10, radius: 16, xpValue: 3, fromTime: 85 },
  { kind: 'geometry-golem', hp: 95, speed: 32, damage: 16, radius: 24, xpValue: 6, fromTime: 120 },
  { kind: 'percentage-bandit', hp: 60, speed: 70, damage: 14, radius: 18, xpValue: 5, fromTime: 160 },
]

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

export function createWorld(seed: string): WorldState {
  const stats = statsFrom({})

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
    gems: [],
    skills: {},
    attackCooldown: 0,
    orbitAngle: 0,
    spawnCooldown: 1,
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
  return {
    count: Math.min(8, 1 + Math.floor(minutes * 2)),
    interval: Math.max(0.45, 1.8 - minutes * 0.3),
  }
}

/** ตัวคูณพลังมอนตามเวลา ทำให้มอนตัวเดิมแข็งขึ้นเรื่อย ๆ */
function difficultyScale(time: number): number {
  return 1 + time / 90
}

function spawnEnemy(world: WorldState, rng: Rng): EnemyEntity {
  const available = ENEMY_KINDS.filter((kind) => world.time >= kind.fromTime)
  const template = rng.pick(available)
  const scale = difficultyScale(world.time)

  /*
   * เกิดที่ขอบสนามเสมอ ไม่เกิดกลางสนาม
   * ถ้าเกิดตรงไหนก็ได้ มอนจะโผล่ทับตัวผู้เล่นแล้วชนทันทีโดยไม่มีทางหลบ
   * ซึ่งเป็นความตายที่ผู้เล่นไม่ได้ทำอะไรผิดเลย
   */
  const side = rng.int(0, 3)
  const pos: Vec =
    side === 0
      ? { x: rng.int(0, ARENA_WIDTH), y: -20 }
      : side === 1
        ? { x: ARENA_WIDTH + 20, y: rng.int(0, ARENA_HEIGHT) }
        : side === 2
          ? { x: rng.int(0, ARENA_WIDTH), y: ARENA_HEIGHT + 20 }
          : { x: -20, y: rng.int(0, ARENA_HEIGHT) }

  const hp = Math.round(template.hp * scale)

  return {
    id: world.nextId,
    pos,
    hp,
    maxHp: hp,
    speed: template.speed,
    radius: template.radius,
    damage: template.damage,
    kind: template.kind,
    xpValue: template.xpValue,
    hitFlash: 0,
  }
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
 * เดินหน้าโลกไปหนึ่งก้าวคงที่
 *
 * ทำงานเฉพาะตอน phase เป็น playing
 * ตอนหยุดถามโจทย์หรือเลือกสกิล เวลาในเกมต้องหยุดสนิท
 * ไม่งั้นเด็กจะโดนมอนรุมตายระหว่างกำลังอ่านโจทย์อยู่
 */
export function step(world: WorldState, input: Input): WorldState {
  if (world.phase !== 'playing') return world

  const dt = FIXED_STEP
  const stats = statsFrom(world.skills)

  let next: WorldState = { ...world, time: world.time + dt }

  // ---------- ผู้เล่น ----------
  const dir = normalize(input.move)
  const player = { ...next.player }
  player.maxHp = stats.maxHp
  player.speed = stats.moveSpeed
  player.pos = {
    x: clamp(player.pos.x + dir.x * stats.moveSpeed * dt, player.radius, ARENA_WIDTH - player.radius),
    y: clamp(player.pos.y + dir.y * stats.moveSpeed * dt, player.radius, ARENA_HEIGHT - player.radius),
  }
  player.invulnerable = Math.max(0, player.invulnerable - dt)
  next.player = player

  // ---------- เกิดมอน ----------
  let enemies = next.enemies.map((enemy) => ({
    ...enemy,
    hitFlash: Math.max(0, enemy.hitFlash - dt),
  }))

  let spawnCooldown = next.spawnCooldown - dt
  let nextId = next.nextId
  if (spawnCooldown <= 0) {
    const plan = spawnPlan(next.time)
    for (let i = 0; i < plan.count; i += 1) {
      const enemy = spawnEnemy({ ...next, nextId }, createRng(`${world.seed}-spawn-${nextId}`))
      enemies.push(enemy)
      nextId += 1
    }
    spawnCooldown = plan.interval
  }

  // ---------- มอนเดินเข้าหาผู้เล่น ----------
  enemies = enemies.map((enemy) => {
    const toPlayer = normalize({
      x: player.pos.x - enemy.pos.x,
      y: player.pos.y - enemy.pos.y,
    })
    return {
      ...enemy,
      pos: {
        x: enemy.pos.x + toPlayer.x * enemy.speed * dt,
        y: enemy.pos.y + toPlayer.y * enemy.speed * dt,
      },
    }
  })

  // ---------- ยิงอัตโนมัติ ----------
  let projectiles = next.projectiles
  let attackCooldown = next.attackCooldown - dt

  if (attackCooldown <= 0) {
    const target = nearestEnemy({ ...next, enemies })
    if (target) {
      const base = Math.atan2(target.pos.y - player.pos.y, target.pos.x - player.pos.x)
      const spread = 0.18

      const shots: ProjectileEntity[] = []
      for (let i = 0; i < stats.projectiles; i += 1) {
        // กระจายนัดรอบทิศเป้าหมาย นัดกลางตรงเป้าเสมอ
        const offset = (i - (stats.projectiles - 1) / 2) * spread
        const angle = base + offset
        shots.push({
          id: nextId,
          pos: { ...player.pos },
          vel: {
            x: Math.cos(angle) * stats.projectileSpeed,
            y: Math.sin(angle) * stats.projectileSpeed,
          },
          damage: stats.damage,
          radius: 6,
          hitsLeft: stats.pierce + 1,
          life: 1.6,
          hitIds: [],
        })
        nextId += 1
      }
      projectiles = [...projectiles, ...shots]
      attackCooldown = stats.attackInterval
    } else {
      // ไม่มีเป้าก็ไม่ยิง แต่ไม่ต้องรอรอบใหม่ พร้อมยิงทันทีที่มอนโผล่
      attackCooldown = 0
    }
  }

  // ---------- กระสุนเคลื่อนที่และชน ----------
  const survivingProjectiles: ProjectileEntity[] = []
  let kills = next.kills
  const gems: GemEntity[] = [...next.gems]

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

      enemy.hp -= moved.damage
      enemy.hitFlash = 0.12
      hitIds.push(enemy.id)
      hitsLeft -= 1
    }

    if (hitsLeft > 0) survivingProjectiles.push({ ...moved, hitsLeft, hitIds })
  }

  // ---------- ดาบหมุนรอบตัว ----------
  let orbitAngle = next.orbitAngle
  if (stats.orbitBlades > 0) {
    orbitAngle = (orbitAngle + dt * 3.2) % (Math.PI * 2)
    const radius = 62

    for (let i = 0; i < stats.orbitBlades; i += 1) {
      const angle = orbitAngle + (i * Math.PI * 2) / stats.orbitBlades
      const bladePos: Vec = {
        x: player.pos.x + Math.cos(angle) * radius,
        y: player.pos.y + Math.sin(angle) * radius,
      }
      for (const enemy of enemies) {
        if (enemy.hp <= 0) continue
        if (distance(bladePos, enemy.pos) > enemy.radius + 12) continue
        // ดาบตีต่อเนื่อง จึงคิดความเสียหายต่อวินาที ไม่ใช่ต่อครั้ง
        enemy.hp -= stats.damage * 2.2 * dt
        enemy.hitFlash = 0.1
      }
    }
  }

  // ---------- มอนที่ตายแล้วกลายเป็นคริสตัล ----------
  const aliveEnemies: EnemyEntity[] = []
  for (const enemy of enemies) {
    if (enemy.hp > 0) {
      aliveEnemies.push(enemy)
      continue
    }
    kills += 1
    gems.push({ id: nextId, pos: { ...enemy.pos }, value: enemy.xpValue })
    nextId += 1
  }

  // ---------- คริสตัลถูกดูดเข้าหาตัว ----------
  const remainingGems: GemEntity[] = []
  let xp = player.xp

  for (const gem of gems) {
    const dist = distance(gem.pos, player.pos)

    if (dist <= player.radius + 8) {
      xp += gem.value * stats.xpMultiplier
      continue
    }

    if (dist <= stats.magnetRange) {
      const pull = normalize({ x: player.pos.x - gem.pos.x, y: player.pos.y - gem.pos.y })
      // ยิ่งใกล้ยิ่งดูดแรง ทำให้เก็บได้ไวและรู้สึกดี
      const pullSpeed = 240 * (1 - dist / stats.magnetRange) + 90
      remainingGems.push({
        ...gem,
        pos: { x: gem.pos.x + pull.x * pullSpeed * dt, y: gem.pos.y + pull.y * pullSpeed * dt },
      })
      continue
    }

    remainingGems.push(gem)
  }

  // ---------- มอนชนผู้เล่น ----------
  let hp = player.hp
  let invulnerable = player.invulnerable

  if (invulnerable <= 0) {
    for (const enemy of aliveEnemies) {
      if (distance(enemy.pos, player.pos) > enemy.radius + player.radius) continue
      hp -= enemy.damage
      // ช่วงอมตะสั้น ๆ กันโดนรุมจนเลือดหมดในเสี้ยววินาทีโดยไม่มีทางหนี
      invulnerable = 0.6
      break
    }
  }

  // ---------- สรุปสถานะ ----------
  const leveledUp = xp >= player.xpToNext
  const dead = hp <= 0

  next = {
    ...next,
    player: {
      ...player,
      hp: Math.max(0, Math.min(stats.maxHp, hp)),
      xp,
      invulnerable,
    },
    enemies: aliveEnemies,
    projectiles: survivingProjectiles,
    gems: remainingGems,
    attackCooldown,
    orbitAngle,
    spawnCooldown,
    nextId,
    kills,
    phase: dead ? 'dead' : leveledUp ? 'question' : 'playing',
  }

  return next
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
  for (let i = 0; i < steps; i += 1) {
    next = step(next, input)
    if (next.phase !== 'playing') break
  }
  return next
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
 * สกิลที่เสนอให้เลือก
 *
 * ตอบโจทย์ถูกได้เลือกสามใบ ตอบผิดได้สองใบ
 * ตัดสกิลที่เต็มชั้นแล้วออกก่อนเสมอ
 * ถ้าเสนอสกิลที่เลือกไปก็ไม่ได้อะไร เด็กจะรู้สึกว่าโดนโกงตาเลือก
 */
export function offerSkills(world: WorldState, count: number): Skill[] {
  const rng = createRng(`${world.seed}-lvl-${world.player.level}`)

  const available = SKILLS.filter(
    (skill) => (world.skills[skill.id] ?? 0) < skill.maxStacks,
  )

  const pool: Skill[] = []
  for (const skill of available) {
    for (let i = 0; i < skill.weight; i += 1) pool.push(skill)
  }

  const picked: Skill[] = []
  for (let attempt = 0; attempt < 80 && picked.length < count; attempt += 1) {
    if (pool.length === 0) break
    const skill = rng.pick(pool)
    if (picked.some((entry) => entry.id === skill.id)) continue
    picked.push(skill)
  }
  return picked
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
 * รับสกิลแล้วกลับไปเล่นต่อ
 *
 * เลเวลขึ้นตรงนี้ ไม่ใช่ตอนที่ XP ครบ
 * เพราะถ้าขึ้นตอน XP ครบ แล้วเด็กปิดหน้าจอเลือกสกิลทิ้ง
 * จะได้เลเวลฟรีโดยไม่ได้สกิล ซึ่งทำให้ XP ที่ต้องใช้พุ่งขึ้นโดยไม่ได้อะไรตอบแทน
 */
export function takeSkill(world: WorldState, skillId: string): WorldState {
  const skill = getSkill(skillId)
  if (!skill) return world

  const current = world.skills[skillId] ?? 0
  if (current >= skill.maxStacks) return world

  const skills = { ...world.skills, [skillId]: current + 1 }
  const level = world.player.level + 1
  const leftover = Math.max(0, world.player.xp - world.player.xpToNext)
  const statsAfter = statsFrom(skills)

  return {
    ...world,
    skills,
    player: {
      ...world.player,
      level,
      xp: leftover,
      xpToNext: xpNeededFor(level),
      maxHp: statsAfter.maxHp,
      // เลือกพลังชีวิตแล้วต้องฟื้นให้ทันที ไม่ใช่แค่เพิ่มเพดานเปล่า ๆ
      hp: Math.min(
        statsAfter.maxHp,
        world.player.hp + (skillId === 'vitality' ? 20 : 0),
      ),
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
}

export function summarize(world: WorldState): RunSummary {
  return {
    survivedSeconds: Math.floor(world.time),
    kills: world.kills,
    level: world.player.level,
    // เหรียญมาจากทั้งเวลาที่รอดและจำนวนที่ล้มได้ เล่นสไตล์ไหนก็ได้รางวัล
    coins: Math.floor(world.time / 3) + world.kills * 2,
  }
}
