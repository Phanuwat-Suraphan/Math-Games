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
import { MAX_WEAPON_LEVEL, MAX_WEAPON_SLOTS, STARTING_WEAPON, WEAPONS, getWeapon, weaponStats } from './weapons'
import {
  ARENA_HEIGHT,
  ARENA_WIDTH,
  type Effect,
  type EnemyBehavior,
  type EnemyEntity,
  type EnemyShot,
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
const XP_GROWTH = 1.27

/** ชนิดมอนสเตอร์ที่โผล่ตามเวลา */
interface EnemyKind {
  kind: string
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
  { kind: 'number-slime', hp: 22, speed: 108, damage: 8, radius: 16, xpValue: 1,
    behavior: 'chase', splitInto: 0, fromTime: 0 },
  { kind: 'fraction-bat', hp: 16, speed: 150, damage: 6, radius: 13, xpValue: 2,
    behavior: 'zigzag', splitInto: 0, fromTime: 20 },
  { kind: 'goblin-calculator', hp: 48, speed: 98, damage: 12, radius: 19, xpValue: 3,
    behavior: 'chase', splitInto: 0, fromTime: 45 },
  { kind: 'decimal-scorpion', hp: 34, speed: 230, damage: 10, radius: 16, xpValue: 3,
    behavior: 'dash', splitInto: 0, fromTime: 70 },
  { kind: 'big-slime', hp: 80, speed: 88, damage: 12, radius: 26, xpValue: 4,
    behavior: 'chase', splitInto: 3, fromTime: 95 },
  { kind: 'percentage-bandit', hp: 50, speed: 120, damage: 14, radius: 18, xpValue: 5,
    behavior: 'ranged', splitInto: 0, fromTime: 120 },
  { kind: 'geometry-golem', hp: 170, speed: 72, damage: 18, radius: 26, xpValue: 7,
    behavior: 'tank', splitInto: 0, fromTime: 150 },
  { kind: 'math-guardian', hp: 100, speed: 158, damage: 15, radius: 19, xpValue: 6,
    behavior: 'zigzag', splitInto: 0, fromTime: 185 },
  { kind: 'fraction-ghost', hp: 66, speed: 260, damage: 12, radius: 15, xpValue: 6,
    behavior: 'dash', splitInto: 0, fromTime: 215 },
  { kind: 'dragon-of-numbers', hp: 240, speed: 126, damage: 22, radius: 28, xpValue: 12,
    behavior: 'chase', splitInto: 0, fromTime: 250 },
]

/** ตัวเล็กที่แตกออกมาจากสไลม์ใหญ่ */
const SPLIT_CHILD: EnemyKind = {
  kind: 'number-slime',
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
    enemyShots: [],
    effects: [],
    gems: [],
    skills: {},
    weapons: { [STARTING_WEAPON]: 1 },
    weaponCooldowns: {},
    spawnCooldown: 1,
    eliteCooldown: 45,
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
   * เด็กที่ตายใน 40 วินาทีทุกครั้งจะเลิกเล่นเร็วมาก
   *
   * ชุดนี้ให้ช่วงต้นหายใจได้ แล้วค่อยบีบขึ้นเรื่อย ๆ
   * เป้าหมายคือผู้เล่นที่เล่นดีควรอยู่ได้หลายนาที ไม่ใช่ไม่กี่สิบวินาที
   */
  return {
    count: Math.min(6, 1 + Math.floor(minutes * 1.1)),
    interval: Math.max(0.85, 2.6 - minutes * 0.25),
  }
}

/** ตัวคูณพลังมอนตามเวลา ทำให้มอนตัวเดิมแข็งขึ้นเรื่อย ๆ */
function difficultyScale(time: number): number {
  return 1 + time / 130
}

function makeEnemy(
  id: number,
  template: EnemyKind,
  pos: Vec,
  scale: number,
  elite: boolean,
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
    xpValue: template.xpValue * (elite ? 10 : 1),
    hitFlash: 0,
    behavior: template.behavior,
    // นาฬิกาเริ่มไม่ตรงกัน มอนที่เกิดพร้อมกันจึงไม่ส่ายพร้อมกันเป็นแถว
    clock: (id % 17) * 0.31,
    slowFor: 0,
    burnFor: 0,
    burnDps: 0,
    elite,
    splitInto: template.splitInto,
    shootCooldown: 1.2,
  }
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

/** ความเสียหายที่มอนได้รับ พร้อมเอฟเฟกต์กระพริบ */
function hurt(enemy: EnemyEntity, amount: number): void {
  enemy.hp -= amount
  enemy.hitFlash = 0.12
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
  const raw = input.move
  const rawLength = length(raw)
  const dir =
    rawLength > 1 ? { x: raw.x / rawLength, y: raw.y / rawLength } : raw
  const player = { ...world.player }
  player.maxHp = stats.maxHp
  player.speed = stats.moveSpeed
  player.pos = {
    x: clamp(player.pos.x + dir.x * stats.moveSpeed * dt, player.radius, ARENA_WIDTH - player.radius),
    y: clamp(player.pos.y + dir.y * stats.moveSpeed * dt, player.radius, ARENA_HEIGHT - player.radius),
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

    // น้ำแข็งทำให้เดินช้าลงครึ่งหนึ่ง
    const slowed = enemy.slowFor > 0
    if (slowed) enemy.slowFor -= dt
    const speed = enemy.speed * (slowed ? 0.45 : 1)

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

  for (const [weaponId, level] of Object.entries(world.weapons)) {
    const spec = weaponStats(weaponId, level)
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
        hurt(enemy, damage)
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
        hurt(current, damage)
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
        slowFor: weaponId === 'ice' ? 2.2 : 0,
        burnFor: weaponId === 'fire' ? 3 : 0,
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

      hurt(enemy, moved.damage)
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
          hurt(other, moved.damage * 0.6)
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
  let hp = player.hp
  let invulnerable = player.invulnerable
  const survivingEnemyShots: EnemyShot[] = []

  for (const shot of enemyShots) {
    const moved: EnemyShot = {
      ...shot,
      pos: { x: shot.pos.x + shot.vel.x * dt, y: shot.pos.y + shot.vel.y * dt },
      life: shot.life - dt,
    }
    if (moved.life <= 0) continue

    if (invulnerable <= 0 && distance(moved.pos, player.pos) <= player.radius + moved.radius) {
      hp -= moved.damage
      invulnerable = 0.9
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
  let kills = world.kills

  for (const enemy of enemies) {
    if (enemy.hp > 0) {
      aliveEnemies.push(enemy)
      continue
    }
    kills += 1
    gems.push({ id: nextId, pos: { ...enemy.pos }, value: enemy.xpValue })
    nextId += 1

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

  // ---------- มอนชนผู้เล่น ----------
  if (invulnerable <= 0) {
    for (const enemy of aliveEnemies) {
      if (distance(enemy.pos, player.pos) > enemy.radius + player.radius) continue
      hp -= enemy.damage
      // ช่วงอมตะสั้น ๆ กันโดนรุมจนเลือดหมดในเสี้ยววินาทีโดยไม่มีทางหนี
      invulnerable = 0.9
      break
    }
  }

  const leveledUp = xp >= player.xpToNext
  const dead = hp <= 0

  return {
    ...world,
    time,
    player: {
      ...player,
      hp: Math.max(0, Math.min(stats.maxHp, hp)),
      xp,
      invulnerable,
    },
    enemies: aliveEnemies,
    projectiles: survivingProjectiles,
    enemyShots: survivingEnemyShots,
    effects,
    gems: remainingGems,
    weaponCooldowns,
    spawnCooldown,
    eliteCooldown,
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
        weight: 8,
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
    const gain =
      next && now
        ? `แรงขึ้น ${Math.round((next.damage / now.damage - 1) * 100)}%` +
          (next.count > now.count ? ` และเพิ่มเป็น ${next.count} เป้า` : '')
        : 'แรงขึ้น'

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

  for (const skill of SKILLS) {
    if ((world.skills[skill.id] ?? 0) >= skill.maxStacks) continue
    out.push({
      weight: skill.weight,
      offer: {
        kind: 'skill',
        id: skill.id,
        name: skill.name,
        description: skill.description,
        icon: skill.icon,
        color: '#a78bfa',
        isNew: false,
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
  for (let attempt = 0; attempt < 120 && picked.length < count; attempt += 1) {
    if (pool.length === 0) break
    const offer = rng.pick(pool)
    if (picked.some((entry) => entry.id === offer.id)) continue
    picked.push(offer)
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
  const statsAfter = statsFrom(skills)

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
