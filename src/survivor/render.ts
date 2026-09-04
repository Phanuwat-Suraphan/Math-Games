/**
 * การวาดสนามรบลงบนผืนผ้าใบ
 *
 * ทำไมต้องแยกออกมาจากไฟล์หน้าจอ
 *
 * โค้ดวาดทั้งหมดนี้เคยอยู่ใน Survivor.tsx ซึ่งเป็นไฟล์ React
 * ที่เครื่องพัฒนาคอมไพล์ไม่ได้ เพราะติดตั้ง dependency ของ React ไม่ได้
 * ทุกครั้งที่อยากรู้ว่าเอฟเฟกต์ที่แก้ไปหน้าตาเป็นยังไง จึงต้องเดาเอา
 * หรือรอให้ครูเปิดดูแล้วบอกกลับมา
 *
 * ไฟล์นี้เป็น .ts ธรรมดาที่ไม่แตะ React เลย จึงคอมไพล์ในเครื่องได้
 * แล้วเปิดในเบราว์เซอร์หัวขาดพร้อมผืนผ้าใบจริง วาดเฟรมจริง แล้วถ่ายภาพออกมาดูได้
 *
 * เหตุผลเดียวกับที่แยกภาพ SVG ออกมาเป็นข้อมูลล้วน คือทำให้ "มองเห็น"
 * สิ่งที่กำลังแก้อยู่ ซึ่งเป็นสิ่งเดียวที่จับข้อผิดพลาดทางสายตาได้
 * และเป็นข้อผิดพลาดชนิดที่ชุดทดสอบไม่มีทางจับได้เลย
 */

import { ARENA_HEIGHT, ARENA_WIDTH } from './types'
import type { WorldState } from './types'
import { getBiome } from './biomes'
import { sceneryFor } from './scenery'
import type { Prop } from './scenery'

/**
 * สีหมึกของเส้นขอบเศษ
 *
 * ใช้ค่าเดียวกับเส้นขอบของตัวละครและมอน (ดู art/shading.ts)
 * เพื่อให้ของทุกชิ้นในฉากดูเหมือนวาดด้วยปากกาด้ามเดียวกัน
 */
const PARTICLE_INK = '#2a1533'

/**
 * ความเร็วของการสลับภาพท่าเดิน หน่วยเป็นเฟรมต่อวินาที
 *
 * แปดเฟรมต่อวินาทีกับสี่ท่า เท่ากับก้าวครบรอบวินาทีละสองครั้ง
 * ซึ่งใกล้เคียงจังหวะเดินของคนจริง ถ้าเร็วกว่านี้จะกลายเป็นวิ่งซอยเท้า
 * และไม่ตรงกับความเร็วที่ตัวละครเคลื่อนที่จริงบนจอ
 */
const WALK_FPS = 8

/**
 * เลือกภาพท่าเดินของเวลานี้
 *
 * แยกออกมาเป็นฟังก์ชันบริสุทธิ์ เพื่อให้ชุดทดสอบตรวจได้โดยไม่ต้องเปิดเบราว์เซอร์
 * ซึ่งเป็นวิธีเดียวที่จะรู้ว่าท่าเดินยังสลับอยู่จริง เพราะการดูภาพนิ่งบอกไม่ได้
 *
 * ตอนยืนนิ่งคืนศูนย์เสมอ ซึ่งเป็นท่ายืนขาชิด
 * ถ้าปล่อยให้สลับต่อไปตอนหยุด ตัวละครจะย่ำเท้าอยู่กับที่
 */
export function walkFrameIndex(time: number, count: number, moving: boolean): number {
  if (!moving || count <= 0) return 0
  return Math.floor(time * WALK_FPS) % count
}

export interface HeroView {
  /**
   * ภาพท่าเดินเรียงตามลำดับเฟรม ว่างได้เมื่อยังโหลดไม่เสร็จ
   *
   * ที่ต้องมีหลายภาพ เพราะอนิเมชันในภาพ SVG ไม่ขยับเมื่อวาดลง canvas
   * การเดินจึงต้องทำด้วยการสลับภาพเอง เหมือนสไปรต์ชีตของเกมสมัยก่อน
   */
  frames: HTMLImageElement[]
  /** ภาพมอนสเตอร์ทุกชนิด แยกตามไอดีภาพ */
  monsters: Map<string, HTMLImageElement>
  /** 1 = หันขวา -1 = หันซ้าย */
  facing: number
  moving: boolean
  /** สกิลวิเศษกำลังออกฤทธิ์อยู่ไหม ใช้วาดวงพลังรอบตัว */
  glow: string | null
}

export function draw(canvas: HTMLCanvasElement | null, world: WorldState, hero: HeroView): void {
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  ctx.clearRect(0, 0, ARENA_WIDTH, ARENA_HEIGHT)

  /*
   * กล้องสั่น
   *
   * เลื่อนทั้งฉากแทนการเลื่อนของทีละชิ้น เพราะถ้าเลื่อนบางชิ้น
   * สายตาจะอ่านเป็น "ของชิ้นนั้นขยับ" ไม่ใช่ "จอสั่น" ซึ่งคนละความรู้สึกกัน
   *
   * ขนาดสูงสุดจงใจให้เล็ก (สิบพิกเซล) เพราะจอที่สั่นแรงกว่านี้
   * ทำให้เด็กบางคนเวียนหัว และทำให้เล็งการหลบมอนยากขึ้นจริง ๆ
   * ซึ่งเป็นการลงโทษเด็กสำหรับเหตุการณ์ที่เขาไม่ได้ทำอะไรผิด
   */
  const shake = Math.max(0, Math.min(1, world.shake))
  ctx.save()
  if (shake > 0.01) {
    const power = shake * 10
    ctx.translate(
      (Math.random() - 0.5) * power,
      (Math.random() - 0.5) * power,
    )
  }

  /*
   * พื้นสนามสีสว่างแบบทุ่งขนมหวาน
   *
   * เดิมเป็นสีม่วงเกือบดำ (#0f0a1e) ซึ่งสวยดีในแบบของมัน
   * แต่พอเปลี่ยนตัวละครกับมอนเป็นสไตล์เส้นขอบหนา เส้นขอบสีเข้ม
   * จะจมหายไปกับพื้นมืดจนมองไม่เห็นเลยแม้แต่นิดเดียว
   * เรนเดอร์เทียบสองพื้นหลังแล้วเห็นชัดมากว่าสไตล์นี้ต้องการพื้นสว่าง
   *
   * ไล่สีจากฟ้าอ่อนด้านบนลงมาเขียวอ่อนด้านล่าง อ่านเป็นท้องฟ้ากับพื้นหญ้า
   * ซึ่งทำให้สนามรู้สึกเป็น "ที่" จริง ๆ ไม่ใช่กระดานสีเดียว
   */
  const palette = getBiome(world.biome).palette
  const ground = ctx.createLinearGradient(0, 0, 0, ARENA_HEIGHT)
  ground.addColorStop(0, palette.skyTop)
  ground.addColorStop(0.55, palette.skyMid)
  ground.addColorStop(1, palette.ground)
  ctx.fillStyle = ground
  ctx.fillRect(0, 0, ARENA_WIDTH, ARENA_HEIGHT)
  ctx.strokeStyle = palette.grid
  ctx.lineWidth = 1
  for (let x = 0; x <= ARENA_WIDTH; x += 50) {
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, ARENA_HEIGHT)
    ctx.stroke()
  }
  for (let y = 0; y <= ARENA_HEIGHT; y += 50) {
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(ARENA_WIDTH, y)
    ctx.stroke()
  }

  drawScenery(ctx, world.seed, world.biome)

  // คริสตัล
  for (const gem of world.gems) {
    ctx.fillStyle = '#a78bfa'
    ctx.beginPath()
    ctx.moveTo(gem.pos.x, gem.pos.y - 6)
    ctx.lineTo(gem.pos.x + 5, gem.pos.y)
    ctx.lineTo(gem.pos.x, gem.pos.y + 6)
    ctx.lineTo(gem.pos.x - 5, gem.pos.y)
    ctx.closePath()
    ctx.fill()
  }

  /*
   * ของที่ตกอยู่บนพื้น
   * วาดก่อนมอน เพื่อให้มอนที่เดินผ่านทับได้ตามธรรมชาติ
   * แต่หีบวาดใหญ่และกะพริบ เพราะเป็นของที่ห้ามพลาด
   */
  for (const pickup of world.pickups) {
    const pulse = 1 + Math.sin(world.time * 6) * 0.12

    if (pickup.kind === 'chest') {
      ctx.fillStyle = '#fbbf24'
      ctx.fillRect(pickup.pos.x - 13 * pulse, pickup.pos.y - 10 * pulse, 26 * pulse, 20 * pulse)
      ctx.fillStyle = '#92400e'
      ctx.fillRect(pickup.pos.x - 13 * pulse, pickup.pos.y - 2, 26 * pulse, 4)
      ctx.strokeStyle = '#fff7ed'
      ctx.lineWidth = 2
      ctx.strokeRect(pickup.pos.x - 13 * pulse, pickup.pos.y - 10 * pulse, 26 * pulse, 20 * pulse)
      continue
    }

    const LOOK: Record<string, string> = {
      heart: '#fb7185',
      bomb: '#f8fafc',
      magnet: '#c084fc',
    }
    ctx.fillStyle = LOOK[pickup.kind] ?? '#e2e8f0'
    ctx.beginPath()
    ctx.arc(pickup.pos.x, pickup.pos.y, 9 * pulse, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = 'rgba(255,255,255,.85)'
    ctx.lineWidth = 2
    ctx.stroke()
  }

  // มอนสเตอร์ สีต่างกันตามชนิด
  const COLORS: Record<string, string> = {
    'number-slime': '#34d399',
    'fraction-bat': '#a78bfa',
    'goblin-calculator': '#84cc16',
    'decimal-scorpion': '#f59e0b',
    'big-slime': '#10b981',
    'percentage-bandit': '#f87171',
    'geometry-golem': '#94a3b8',
    'math-guardian': '#60a5fa',
    'fraction-ghost': '#c4b5fd',
    'dragon-of-numbers': '#dc2626',
    'boss-slime-king': '#059669',
    'boss-math-guardian': '#7c3aed',
    'boss-golem-king': '#64748b',
    'boss-number-dragon': '#b91c1c',
    'decimal-worm': '#f59e0b',
    'equation-wraith': '#a5b4fc',
    'chaos-cube': '#e11d48',
    'prime-knight': '#94a3b8',
    'wraith-swarm': '#818cf8',
    'cube-sentinel': '#be123c',
    'boss-prime-knight': '#cbd5e1',
    'boss-chaos-cube': '#fb7185',
  }

  for (const enemy of world.enemies) {
    const sprite = hero.monsters.get(enemy.art)

    if (sprite && sprite.complete) {
      /*
       * ภาพจริงจากโหมดเควส วาดใหญ่กว่ารัศมีการชนเล็กน้อย
       * ให้ตัวมอนดูเต็มตาแต่ระยะชนยังเป็นวงกลมเดิม
       * ถ้าให้ระยะชนเท่ากับขอบภาพ เด็กจะโดนชนตั้งแต่ยังดูเหมือนไม่ติดกัน
       */
      // คูณ 3.3 ไม่ใช่ 2 เท่าของรัศมี เพราะภาพมีขอบว่างในตัวราวหนึ่งในห้า
      // ถ้าใช้เท่ารัศมีพอดี ตัวมอนจะดูเล็กกว่าระยะชนจริงจนเด็กงงว่าทำไมโดน
      const size = enemy.radius * 3.3
      const sway = Math.sin(world.time * 3 + enemy.id) * 2

      ctx.save()
      ctx.translate(enemy.pos.x, enemy.pos.y + sway)
      // หันหน้าเข้าหาผู้เล่นเสมอ ทำให้ฝูงมอนดูกำลังไล่ล่าจริง ๆ
      if (enemy.pos.x > world.player.pos.x) ctx.scale(-1, 1)
      ctx.drawImage(sprite, -size / 2, -size / 2, size, size)

      // กระพริบขาวตอนโดนตี ทับลงบนภาพเดิม
      if (enemy.hitFlash > 0) {
        ctx.globalAlpha = 0.75
        ctx.globalCompositeOperation = 'lighter'
        ctx.drawImage(sprite, -size / 2, -size / 2, size, size)
        ctx.globalCompositeOperation = 'source-over'
        ctx.globalAlpha = 1
      }
      ctx.restore()
    } else {
      // ภาพยังไม่พร้อม วาดวงกลมสีประจำชนิดไปก่อน
      ctx.fillStyle = enemy.hitFlash > 0 ? '#ffffff' : (COLORS[enemy.kind] ?? '#94a3b8')
      ctx.beginPath()
      ctx.arc(enemy.pos.x, enemy.pos.y, enemy.radius, 0, Math.PI * 2)
      ctx.fill()
    }

    // ตัวใหญ่พิเศษมีวงแหวนทองรอบตัว ให้เห็นแต่ไกลว่าตัวนี้ไม่ธรรมดา
    if (enemy.elite) {
      ctx.strokeStyle = '#fbbf24'
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.arc(enemy.pos.x, enemy.pos.y, enemy.radius + 5, 0, Math.PI * 2)
      ctx.stroke()
    }

    /*
     * บอสมีมงกุฎหนามสองชั้นและวงแหวนแดง
     * ต้องแยกออกจากตัวใหญ่พิเศษได้ในพริบตา เพราะสองอย่างนี้ทำคนละหน้าที่
     * ตัวใหญ่พิเศษล้มหรือไม่ล้มก็ได้ แต่บอสคือของที่ต้องล้มให้ได้เพื่อเอาหีบ
     */
    if (enemy.boss) {
      ctx.strokeStyle = '#f43f5e'
      ctx.lineWidth = 4
      ctx.beginPath()
      ctx.arc(enemy.pos.x, enemy.pos.y, enemy.radius + 7, 0, Math.PI * 2)
      ctx.stroke()

      ctx.fillStyle = '#fbbf24'
      const spikes = 5
      const top = enemy.pos.y - enemy.radius - 10
      ctx.beginPath()
      for (let i = 0; i < spikes; i += 1) {
        const x = enemy.pos.x - enemy.radius * 0.6 + (i * enemy.radius * 1.2) / (spikes - 1)
        ctx.moveTo(x - 4, top + 8)
        ctx.lineTo(x, top - 4)
        ctx.lineTo(x + 4, top + 8)
      }
      ctx.fill()
    }

    // ติดไฟกับโดนแช่แข็งต้องเห็นได้ทันที ไม่งั้นเด็กไม่รู้ว่าอาวุธทำงานอยู่
    if (enemy.burnFor > 0) {
      ctx.strokeStyle = 'rgba(249,115,22,.9)'
      ctx.lineWidth = 2.5
      ctx.beginPath()
      ctx.arc(enemy.pos.x, enemy.pos.y, enemy.radius + 3, 0, Math.PI * 2)
      ctx.stroke()
    }
    if (enemy.slowFor > 0) {
      ctx.fillStyle = 'rgba(103,232,249,.35)'
      ctx.beginPath()
      ctx.arc(enemy.pos.x, enemy.pos.y, enemy.radius + 2, 0, Math.PI * 2)
      ctx.fill()
    }

    // ตาสองดวงเฉพาะตอนที่ยังไม่มีภาพจริง ภาพจริงมีตาอยู่แล้ว
    if (!sprite || !sprite.complete) {
      ctx.fillStyle = '#0f172a'
      const eye = enemy.radius * 0.3
      ctx.beginPath()
      ctx.arc(enemy.pos.x - eye, enemy.pos.y - eye * 0.4, enemy.radius * 0.18, 0, Math.PI * 2)
      ctx.arc(enemy.pos.x + eye, enemy.pos.y - eye * 0.4, enemy.radius * 0.18, 0, Math.PI * 2)
      ctx.fill()
    }

    // แถบเลือดเฉพาะตัวที่โดนตีแล้ว ไม่งั้นจอรกด้วยแถบเต็มไปหมด
    if (enemy.hp < enemy.maxHp) {
      const width = enemy.radius * 2
      ctx.fillStyle = 'rgba(0,0,0,.5)'
      ctx.fillRect(enemy.pos.x - enemy.radius, enemy.pos.y - enemy.radius - 8, width, 3)
      ctx.fillStyle = '#f87171'
      ctx.fillRect(
        enemy.pos.x - enemy.radius,
        enemy.pos.y - enemy.radius - 8,
        width * Math.max(0, enemy.hp / enemy.maxHp),
        3,
      )
    }
  }

  // กระสุนของมอน สีแดงเข้มให้ต่างจากกระสุนของเราชัดเจน
  ctx.fillStyle = '#ef4444'
  for (const shot of world.enemyShots) {
    ctx.beginPath()
    ctx.arc(shot.pos.x, shot.pos.y, shot.radius, 0, Math.PI * 2)
    ctx.fill()
  }

  /*
   * แอ่งบนพื้น วาดก่อนทุกอย่าง เพราะมันอยู่บนพื้นจริง ๆ
   * ถ้าวาดทีหลังจะทับตัวมอนที่ยืนอยู่ในแอ่ง แล้วดูเหมือนหมอกลอยแทนที่จะเป็นแอ่ง
   */
  for (const pool of world.pools) {
    const fade = Math.max(0, pool.life / pool.maxLife)
    ctx.globalAlpha = 0.16 + fade * 0.2
    ctx.fillStyle = pool.color
    ctx.beginPath()
    ctx.arc(pool.pos.x, pool.pos.y, pool.radius, 0, Math.PI * 2)
    ctx.fill()

    // ขอบเข้มขึ้นอีกนิด เพื่อให้เห็นชัดว่าขอบแอ่งอยู่ตรงไหน จะได้เดินเลี่ยงถูก
    ctx.globalAlpha = 0.3 + fade * 0.3
    ctx.lineWidth = 2
    ctx.strokeStyle = pool.color
    ctx.stroke()
  }
  ctx.globalAlpha = 1

  // กระสุนของเรา สีตามอาวุธที่ยิง
  const SHOT_COLORS: Record<string, string> = {
    fire: '#f97316',
    ice: '#67e8f9',
    orbit: '#38bdf8',
    boomerang: '#fbbf24',
  }
  for (const shot of world.projectiles) {
    const color = SHOT_COLORS[shot.weapon] ?? '#fcd34d'

    // โล่หมุนวาดเป็นวงแหวนโปร่ง ไม่ใช่ลูกกลมทึบ จะได้ไม่บังมอนที่อยู่ข้างหลัง
    if (shot.orbit) {
      ctx.strokeStyle = color
      ctx.lineWidth = 3.5
      ctx.beginPath()
      ctx.arc(shot.pos.x, shot.pos.y, shot.radius, 0, Math.PI * 2)
      ctx.stroke()
      ctx.globalAlpha = 0.28
      ctx.fillStyle = color
      ctx.fill()
      ctx.globalAlpha = 1
      continue
    }

    /*
     * หางตามหลังกระสุน
     *
     * ลากย้อนไปตามทิศที่มันบินมา ทำให้ตาอ่านทิศทางและความเร็วได้ทันที
     * โดยไม่ต้องเก็บตำแหน่งเก่าไว้ในสถานะเกม ซึ่งจะทำให้ข้อมูลบวมขึ้นมาก
     * เพราะกระสุนมีหลายสิบลูกพร้อมกัน
     *
     * โล่หมุนไม่มีหาง เพราะมันวนอยู่กับที่ หางจะกลายเป็นวงเลอะ ๆ รอบตัว
     */
    const speed = Math.hypot(shot.vel.x, shot.vel.y)
    if (!shot.orbit && speed > 40) {
      const tail = Math.min(46, speed * 0.09)
      const trail = ctx.createLinearGradient(
        shot.pos.x,
        shot.pos.y,
        shot.pos.x - (shot.vel.x / speed) * tail,
        shot.pos.y - (shot.vel.y / speed) * tail,
      )
      trail.addColorStop(0, color)
      trail.addColorStop(1, 'rgba(255,255,255,0)')

      ctx.globalCompositeOperation = 'lighter'
      ctx.globalAlpha = 0.6
      ctx.strokeStyle = trail
      ctx.lineCap = 'round'
      ctx.lineWidth = shot.radius * 1.5
      ctx.beginPath()
      ctx.moveTo(shot.pos.x, shot.pos.y)
      ctx.lineTo(
        shot.pos.x - (shot.vel.x / speed) * tail,
        shot.pos.y - (shot.vel.y / speed) * tail,
      )
      ctx.stroke()
      ctx.globalCompositeOperation = 'source-over'
      ctx.globalAlpha = 1
    }

    /*
     * กระสุนวาดสามชั้น: แสงเรืองรอบ ตัวกระสุน แล้วไส้ขาวตรงกลาง
     *
     * ชั้นเดียวอ่านเป็น "จุดสี" ธรรมดา ไม่ได้อ่านเป็นพลังงาน
     * ไส้ขาวคือสิ่งที่ทำให้ตาอ่านว่าของชิ้นนี้ "ร้อน" หรือ "สว่างจากข้างใน"
     * ซึ่งเป็นวิธีที่เกมยิงทุกเกมใช้ และเป็นเหตุผลว่าทำไมกระสุนถึงดูมีพลัง
     */
    ctx.globalCompositeOperation = 'lighter'
    ctx.globalAlpha = 0.55
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.arc(shot.pos.x, shot.pos.y, shot.radius * 2.1, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalCompositeOperation = 'source-over'
    ctx.globalAlpha = 1

    ctx.fillStyle = color
    ctx.beginPath()
    ctx.arc(shot.pos.x, shot.pos.y, shot.radius, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = 'rgba(255,255,255,.9)'
    ctx.beginPath()
    ctx.arc(shot.pos.x, shot.pos.y, shot.radius * 0.45, 0, Math.PI * 2)
    ctx.fill()
  }

  /*
   * เอฟเฟกต์อาวุธ
   * จางลงตามอายุที่เหลือ จึงดูเหมือนแสงที่ค่อย ๆ หายไป
   * ไม่ใช่รูปที่โผล่มาแล้วหายวับซึ่งตาจับไม่ทัน
   */
  for (const effect of world.effects) {
    const fade = Math.max(0, effect.life / effect.maxLife)

    if (effect.kind === 'slash') {
      /*
       * วงฟันดาบ เขียนใหม่ทั้งหมดเพราะของเดิมเป็นเส้นขาวจาง
       * ซึ่งบนพื้นสว่างมองแทบไม่เห็นเลย (เห็นกับตาตอนเรนเดอร์เฟรมจริงออกมาดู)
       *
       * ตอนนี้เป็นสามชั้น: ขอบเข้มด้านนอก แถบสีม่วงสว่าง แล้วไส้ขาว
       * ขอบเข้มคือชั้นที่ทำให้มันอ่านออกบนพื้นสว่าง ซึ่งเป็นหลักการเดียว
       * กับเส้นขอบหนาของตัวละคร
       */
      const grow = effect.radius * (1.15 - fade * 0.15)

      ctx.strokeStyle = `rgba(49,10,72,${fade * 0.55})`
      ctx.lineWidth = 11 * fade + 3
      ctx.beginPath()
      ctx.arc(effect.pos.x, effect.pos.y, grow, 0, Math.PI * 2)
      ctx.stroke()

      ctx.strokeStyle = `rgba(196,132,252,${fade})`
      ctx.lineWidth = 7 * fade + 2
      ctx.beginPath()
      ctx.arc(effect.pos.x, effect.pos.y, grow, 0, Math.PI * 2)
      ctx.stroke()

      ctx.strokeStyle = `rgba(255,255,255,${fade})`
      ctx.lineWidth = 2.5 * fade + 1
      ctx.beginPath()
      ctx.arc(effect.pos.x, effect.pos.y, grow, 0, Math.PI * 2)
      ctx.stroke()
    } else if (effect.kind === 'blast') {
      /*
       * ระเบิดไล่สีจากไส้ขาวร้อนออกไปเป็นส้มแล้วจางหาย
       * ใช้การวาดแบบบวกแสง (lighter) ซึ่งทำให้ตรงกลางสว่างจ้าขึ้นเอง
       * เมื่อวงซ้อนกัน เป็นวิธีที่ได้ความรู้สึก "ระเบิด" โดยไม่ต้องวาดหลายสิบชั้น
       */
      const grow = effect.radius * (1.4 - fade * 0.4)
      const heat = ctx.createRadialGradient(
        effect.pos.x, effect.pos.y, 0,
        effect.pos.x, effect.pos.y, Math.max(1, grow),
      )
      heat.addColorStop(0, `rgba(255,255,255,${fade * 0.95})`)
      heat.addColorStop(0.35, `rgba(253,224,71,${fade * 0.8})`)
      heat.addColorStop(0.7, `rgba(249,115,22,${fade * 0.55})`)
      heat.addColorStop(1, 'rgba(239,68,68,0)')

      ctx.globalCompositeOperation = 'lighter'
      ctx.fillStyle = heat
      ctx.beginPath()
      ctx.arc(effect.pos.x, effect.pos.y, grow, 0, Math.PI * 2)
      ctx.fill()
      ctx.globalCompositeOperation = 'source-over'

      // ขอบวงระเบิด บอกขอบเขตที่โดนจริง เพื่อให้เด็กเรียนรู้ระยะของอาวุธได้
      ctx.strokeStyle = `rgba(255,237,213,${fade * 0.9})`
      ctx.lineWidth = 2.5
      ctx.beginPath()
      ctx.arc(effect.pos.x, effect.pos.y, grow, 0, Math.PI * 2)
      ctx.stroke()
    } else if (effect.kind === 'spark') {
      /*
       * ประกายตอนตีโดน วาดเป็นเส้นแฉกสั้น ๆ ไม่ใช่วงกลม
       *
       * วงกลมอ่านเป็น "แสงเรือง" ส่วนแฉกอ่านเป็น "การกระแทก"
       * ซึ่งเป็นสิ่งที่เราอยากบอก คือของสองชิ้นเพิ่งชนกันตรงนี้
       *
       * มุมของแฉกคำนวณจากไอดี ไม่ได้สุ่มใหม่ทุกเฟรม
       * ไม่งั้นประกายชิ้นเดิมจะหมุนกระตุกตลอดอายุของมัน
       */
      const spikes = 6
      const grow = effect.radius * (1.5 - fade * 0.5)
      const color = effect.color ?? '#fcd34d'

      ctx.globalCompositeOperation = 'lighter'
      ctx.strokeStyle = color
      ctx.lineCap = 'round'
      ctx.lineWidth = 3 * fade + 1

      for (let i = 0; i < spikes; i += 1) {
        const angle = (i / spikes) * Math.PI * 2 + effect.id * 0.7
        const inner = grow * 0.35
        ctx.beginPath()
        ctx.moveTo(
          effect.pos.x + Math.cos(angle) * inner,
          effect.pos.y + Math.sin(angle) * inner,
        )
        ctx.lineTo(
          effect.pos.x + Math.cos(angle) * grow,
          effect.pos.y + Math.sin(angle) * grow,
        )
        ctx.stroke()
      }

      ctx.fillStyle = `rgba(255,255,255,${fade})`
      ctx.beginPath()
      ctx.arc(effect.pos.x, effect.pos.y, grow * 0.28, 0, Math.PI * 2)
      ctx.fill()
      ctx.globalCompositeOperation = 'source-over'
    } else if (effect.kind === 'bolt' && effect.to) {
      /*
       * สายฟ้าเป็นเส้นหักซิกแซก ไม่ใช่เส้นตรง
       *
       * เส้นตรงอ่านเป็น "เส้นเลเซอร์" ส่วนเส้นหักอ่านเป็นสายฟ้า
       * จุดหักคำนวณจากตำแหน่งของเอฟเฟกต์เอง ไม่ได้สุ่มใหม่ทุกเฟรม
       * ไม่งั้นสายฟ้าเส้นเดิมจะกระตุกเปลี่ยนรูปทุกเฟรมจนดูเหมือนภาพเสีย
       */
      const from = effect.pos
      const to = effect.to
      const segments = 5
      const points: { x: number; y: number }[] = [from]
      for (let i = 1; i < segments; i += 1) {
        const t = i / segments
        const wobble = Math.sin((effect.id + i) * 2.399) * 14 * (1 - Math.abs(t - 0.5) * 2)
        const nx = to.y - from.y
        const ny = from.x - to.x
        const len = Math.hypot(nx, ny) || 1
        points.push({
          x: from.x + (to.x - from.x) * t + (nx / len) * wobble,
          y: from.y + (to.y - from.y) * t + (ny / len) * wobble,
        })
      }
      points.push(to)

      const trace = () => {
        ctx.beginPath()
        ctx.moveTo(points[0].x, points[0].y)
        for (const point of points.slice(1)) ctx.lineTo(point.x, point.y)
        ctx.stroke()
      }

      ctx.lineJoin = 'round'
      ctx.lineCap = 'round'

      ctx.globalCompositeOperation = 'lighter'
      ctx.strokeStyle = `rgba(56,189,248,${fade * 0.7})`
      ctx.lineWidth = 12
      trace()
      ctx.globalCompositeOperation = 'source-over'

      ctx.strokeStyle = `rgba(30,58,138,${fade * 0.8})`
      ctx.lineWidth = 6
      trace()
      ctx.strokeStyle = `rgba(255,255,255,${fade})`
      ctx.lineWidth = 2.5
      trace()
    }
  }

  // ---------- ผู้เล่น ----------
  const { pos, radius } = world.player
  const hurt = world.player.invulnerable > 0
  const blink = hurt && Math.floor(world.time * 12) % 2 === 0

  /*
   * วงพลังตอนใช้สกิลวิเศษ วาดใต้ตัวละคร
   * ต้องเห็นชัดมาก เพราะเป็นช่วงที่เด็กกล้าเดินเข้าไปกลางฝูงได้
   * ถ้าดูไม่ออกว่ายังเปิดอยู่ไหม จะเดินอยู่กลางฝูงต่อจนตายพอดี
   */
  if (hero.glow) {
    const wave = 1 + Math.sin(world.time * 9) * 0.08
    ctx.strokeStyle = hero.glow
    ctx.globalAlpha = 0.85
    ctx.lineWidth = 4
    ctx.beginPath()
    ctx.arc(pos.x, pos.y, radius * 2.6 * wave, 0, Math.PI * 2)
    ctx.stroke()
    ctx.globalAlpha = 0.16
    ctx.fillStyle = hero.glow
    ctx.beginPath()
    ctx.arc(pos.x, pos.y, radius * 2.6 * wave, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalAlpha = 1
  }

  // เงาใต้เท้า ทำให้ตัวละครดูยืนอยู่บนพื้น ไม่ใช่ลอยอยู่เฉย ๆ
  ctx.fillStyle = 'rgba(0,0,0,.38)'
  ctx.beginPath()
  ctx.ellipse(pos.x, pos.y + radius * 0.82, radius * 0.9, radius * 0.34, 0, 0, Math.PI * 2)
  ctx.fill()

  if (hero.frames.length > 0) {
    /*
     * ท่าเดิน: สลับภาพขาตามเวลา บวกกับขยับขึ้นลงและเอียงตัวเล็กน้อย
     *
     * การสลับภาพคือสิ่งที่ทำให้ขาเดินจริง เพราะอนิเมชันในภาพ SVG
     * ไม่ขยับเลยเมื่อวาดลง canvas ส่วนการขยับขึ้นลงเป็นของเดิมที่ยังเก็บไว้
     * เพราะมันเพิ่มน้ำหนักให้ก้าวเดิน ไม่ได้ทำหน้าที่แทนขา
     *
     * ตอนยืนนิ่งใช้เฟรมแรกเสมอ ซึ่งเป็นท่ายืนขาชิด
     * ถ้าปล่อยให้สลับต่อไปตอนหยุด ตัวละครจะย่ำเท้าอยู่กับที่
     */
    const size = radius * 3.6
    const bob = hero.moving
      ? Math.abs(Math.sin(world.time * 11)) * -4
      : Math.sin(world.time * 2.3) * 1.1

    const frame = walkFrameIndex(world.time, hero.frames.length, hero.moving)
    const sprite = hero.frames[frame] ?? hero.frames[0]

    ctx.save()
    ctx.translate(pos.x, pos.y + bob)
    if (hero.facing < 0) ctx.scale(-1, 1)
    // เอียงตัวเล็กน้อยตอนเดิน ทำให้รู้สึกว่ากำลังออกแรง
    if (hero.moving) ctx.rotate(Math.sin(world.time * 11) * 0.05)
    if (blink) ctx.globalAlpha = 0.55
    if (sprite) ctx.drawImage(sprite, -size / 2, -size * 0.78, size, size)
    ctx.restore()
    ctx.globalAlpha = 1
  } else {
    // ภาพยังโหลดไม่เสร็จ วาดวงกลมไปก่อน ดีกว่าให้ตัวละครหายไปเฉย ๆ
    ctx.fillStyle = blink ? '#fca5a5' : '#38bdf8'
    ctx.beginPath()
    ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2)
    ctx.fill()
  }

  // วงแดงบางตอนเพิ่งโดนตี บอกว่ากำลังอยู่ในช่วงอมตะสั้น ๆ
  if (hurt) {
    ctx.strokeStyle = 'rgba(248,113,113,.75)'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(pos.x, pos.y, radius * 1.5, 0, Math.PI * 2)
    ctx.stroke()
  }

  /*
   * เศษที่กระเด็นจากมอนที่แตก
   * วาดหลังตัวละคร เพราะเป็นของที่ควรพุ่งผ่านหน้าทุกอย่าง
   */
  for (const particle of world.particles) {
    const fade = Math.max(0, particle.life / particle.maxLife)

    /*
     * วงแหวนคิดคนละแบบกับเศษชิ้นอื่นทั้งหมด
     *
     * เศษชิ้นอื่นเล็กลงตอนจาง แต่วงแหวนต้อง "ขยายออก" ตอนจาง
     * เพราะสิ่งที่มันเล่าคือคลื่นที่แผ่ออกจากจุดระเบิด
     * ถ้าให้มันหดลงเหมือนชิ้นอื่น จะอ่านเป็นของที่ถูกดูดเข้าไปแทน
     * ซึ่งเป็นความหมายตรงข้ามกับที่ต้องการพอดี
     */
    if (particle.shape === 'ring') {
      const grow = particle.size * (1.15 - fade * 0.85)
      ctx.globalAlpha = fade
      ctx.lineCap = 'butt'

      // เส้นขอบสีหมึกรองข้างหลังก่อน ทำให้วงอ่านออกบนพื้นสว่างเหมือนภาพทั้งเกม
      ctx.strokeStyle = PARTICLE_INK
      ctx.lineWidth = 4 + fade * 8
      ctx.beginPath()
      ctx.arc(particle.pos.x, particle.pos.y, Math.max(1, grow), 0, Math.PI * 2)
      ctx.stroke()

      ctx.strokeStyle = particle.color
      ctx.lineWidth = 2 + fade * 6
      ctx.beginPath()
      ctx.arc(particle.pos.x, particle.pos.y, Math.max(1, grow), 0, Math.PI * 2)
      ctx.stroke()
      ctx.globalAlpha = 1
      continue
    }

    const size = particle.size * (0.4 + fade * 0.6)
    ctx.save()
    ctx.translate(particle.pos.x, particle.pos.y)
    ctx.rotate(particle.angle)
    ctx.globalAlpha = fade
    ctx.fillStyle = particle.color
    /*
     * เส้นขอบสีหมึกรอบเศษทุกชิ้น
     *
     * เป็นเรื่องเดียวกับที่ตัวละครและมอนทุกตัวมีเส้นขอบหนา
     * ถ้าเศษไม่มีเส้นขอบ มันจะเป็นของชิ้นเดียวในฉากที่ไม่มี
     * แล้วจะดูเหมือนหลุดมาจากเกมอื่น ทั้งที่ยังเห็นได้ก็จริง
     */
    ctx.strokeStyle = PARTICLE_INK
    ctx.lineWidth = 1.6
    ctx.lineJoin = 'round'

    if (particle.shape === 'star') {
      /*
       * ดาวห้าแฉก วาดจากสิบจุดสลับรัศมีนอกกับใน
       *
       * ห้าแฉกไม่ใช่หกหรือแปด เพราะห้าแฉกคือรูปที่เด็กวาดเองในสมุด
       * มันจึงอ่านออกว่า "ดาว" ทันทีแม้จะเล็กแค่ไม่กี่พิกเซล
       * ส่วนหกแฉกอ่านเป็นเกล็ดหิมะ และแปดแฉกอ่านเป็นประกายแสง
       */
      ctx.beginPath()
      for (let i = 0; i < 10; i += 1) {
        const reach = i % 2 === 0 ? size : size * 0.44
        const angle = (i / 10) * Math.PI * 2 - Math.PI / 2
        const x = Math.cos(angle) * reach
        const y = Math.sin(angle) * reach
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.closePath()
      ctx.fill()
      ctx.stroke()
    } else if (particle.shape === 'shard') {
      /*
       * เศษแหลม เป็นสี่เหลี่ยมข้าวหลามตัดที่ยืดยาวไปตามทิศที่หมุนอยู่
       *
       * ยืดยาวสองเท่าครึ่ง ไม่ใช่จัตุรัส เพราะของที่ยาวบอกทิศได้
       * เศษที่บอกทิศทำให้ทั้งกำอ่านเป็น "ระเบิดออกจากตรงกลาง"
       * ส่วนจัตุรัสที่ไม่มีทิศ อ่านเป็นแค่จุดสีที่ลอยอยู่เฉย ๆ
       */
      ctx.beginPath()
      ctx.moveTo(size * 1.25, 0)
      ctx.lineTo(0, size * 0.42)
      ctx.lineTo(-size * 0.9, 0)
      ctx.lineTo(0, -size * 0.42)
      ctx.closePath()
      ctx.fill()
      ctx.stroke()
    } else {
      ctx.beginPath()
      ctx.arc(0, 0, size * 0.6, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
    }

    /*
     * แกนขาวตรงกลางของชิ้นที่ควรดูเปล่งแสง
     *
     * วาดทับลงไปตรง ๆ ไม่ใช่บวกแสง เพราะบนพื้นสนามที่สว่างอยู่แล้ว
     * การบวกแสงแทบไม่ทำให้อะไรเปลี่ยน (เรนเดอร์ดูแล้วหายไปทั้งหมดจริง ๆ)
     * ส่วนจุดขาวทึบเห็นชัดบนพื้นทุกสี เพราะไม่ได้พึ่งค่าสีของพื้นเลย
     */
    if (particle.glow) {
      ctx.fillStyle = 'rgba(255,255,255,.92)'
      ctx.beginPath()
      ctx.arc(0, 0, size * 0.3, 0, Math.PI * 2)
      ctx.fill()
    }

    ctx.restore()
  }
  ctx.globalAlpha = 1

  /*
   * ตัวเลขความเสียหาย
   *
   * ลอยขึ้นและจางลงพร้อมกัน มีเงาดำรองข้างหลังทุกตัว
   * เพราะพื้นสนามมีทั้งส่วนมืดและส่วนที่มีมอนสีสว่างทับอยู่
   * ตัวเลขสีเดียวล้วนจะอ่านไม่ออกบนพื้นบางแบบ ซึ่งเท่ากับไม่ได้ใส่มา
   */
  ctx.textAlign = 'center'
  for (const entry of world.damageNumbers) {
    const fade = Math.max(0, entry.life / entry.maxLife)
    const rise = (1 - fade) * 30
    const x = entry.pos.x + entry.drift * (1 - fade)
    const y = entry.pos.y - rise

    ctx.font = entry.big
      ? 'bold 23px system-ui, sans-serif'
      : 'bold 15px system-ui, sans-serif'

    /*
     * ตีเส้นขอบรอบตัวเลข แทนการวางเงาเยื้องไปข้างหนึ่ง
     *
     * เงาเยื้องช่วยได้เฉพาะทิศเดียว ตัวเลขจึงยังจมกับพื้นในทิศที่เหลือ
     * เห็นชัดตอนเรนเดอร์เฟรมจริงบนพื้นสว่าง ตัวเลขจาง ๆ อ่านแทบไม่ออกเลย
     *
     * เส้นขอบรอบตัวอักษรอ่านออกบนทุกพื้นหลัง ทั้งพื้นหญ้าสว่าง
     * ตัวมอนสีเข้ม และแอ่งพิษสีเขียว ซึ่งในหนึ่งเฟรมมีครบทั้งสามอย่าง
     * เป็นหลักการเดียวกับเส้นขอบหนาของตัวละคร
     */
    ctx.lineJoin = 'round'
    ctx.lineWidth = entry.big ? 5 : 3.5
    ctx.strokeStyle = `rgba(255,255,255,${fade * 0.92})`
    ctx.strokeText(`${entry.amount}`, x, y)

    ctx.fillStyle = entry.big
      ? `rgba(190,45,10,${fade})`
      : `rgba(45,20,65,${fade})`
    ctx.fillText(`${entry.amount}`, x, y)
  }
  ctx.textAlign = 'start'

  /*
   * ข้อความแจ้งเหตุการณ์สำคัญ วาดท้ายสุดให้อยู่บนสุดเสมอ
   * ลอยขึ้นและจางลงพร้อมกัน ตาจึงจับได้แม้กำลังโฟกัสที่การหลบมอนอยู่
   */
  ctx.textAlign = 'center'
  world.notices.forEach((notice, index) => {
    const fade = Math.max(0, Math.min(1, notice.life / notice.maxLife))
    const rise = (1 - fade) * 26
    const y = 96 + index * 30 - rise

    ctx.font = 'bold 24px system-ui, sans-serif'
    ctx.lineJoin = 'round'
    ctx.lineWidth = 6
    ctx.strokeStyle = `rgba(255,255,255,${fade * 0.95})`
    ctx.strokeText(notice.text, ARENA_WIDTH / 2, y)
    ctx.fillStyle = `rgba(190,45,10,${fade})`
    ctx.fillText(notice.text, ARENA_WIDTH / 2, y)
  })
  ctx.textAlign = 'start'

  /*
   * แสงวาบเต็มจอ วาดท้ายสุดจึงคลุมทุกอย่าง
   *
   * ตั้งไว้ที่ 0.34 ตอนแรกแล้วเรนเดอร์ดู ปรากฏว่าทั้งจอซีดจนมอนแทบหายไป
   * ซึ่งคือปัญหาที่คอมเมนต์บรรทัดถัดไปเขียนเตือนตัวเองไว้พอดี
   * แต่ตัวเลขที่ตั้งยังสูงเกินอยู่ดี — เห็นได้เพราะถ่ายภาพเฟรมจริงออกมาดู
   *
   * สาเหตุคือพื้นสนามสว่างอยู่แล้ว การบวกแสงขาวทับเข้าไปอีก
   * จึงทะลุเพดานความสว่างเร็วกว่าตอนพื้นมืดมาก
   *
   * แสงวาบที่ขาวโพลนทั้งจอทำให้เด็กบางคนตกใจ และที่สำคัญกว่านั้น
   * คือมันบังมอนในจังหวะที่มอนกำลังเข้ามาหา ซึ่งเป็นการลงโทษ
   * เด็กสำหรับเหตุการณ์ที่ตัวเองเป็นคนทำให้เกิด (กดสกิลวิเศษ)
   */
  const flashPower = Math.max(0, Math.min(1, world.flash.power))
  if (flashPower > 0.01) {
    ctx.globalCompositeOperation = 'lighter'
    ctx.globalAlpha = flashPower * 0.15
    ctx.fillStyle = world.flash.color
    ctx.fillRect(0, 0, ARENA_WIDTH, ARENA_HEIGHT)
    ctx.globalCompositeOperation = 'source-over'
    ctx.globalAlpha = 1
  }

  ctx.restore()
}

/* ------------------------------------------------------------------ *
 * องค์ประกอบของสนาม
 * ------------------------------------------------------------------ */

/**
 * เงาใต้ของประดับ ทำให้มันดูวางอยู่บนพื้น ไม่ใช่ลอยอยู่
 *
 * ใช้หลักเดียวกับเงาใต้เท้าตัวละคร คือรีแบน ๆ สีดำจาง
 * ถ้าไม่มีเงา ต้นไม้จะดูเหมือนสติกเกอร์ที่แปะทับพื้นไว้เฉย ๆ
 */
function propShadow(ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  ctx.fillStyle = 'rgba(40,60,30,.16)'
  ctx.beginPath()
  ctx.ellipse(x, y, r, r * 0.36, 0, 0, Math.PI * 2)
  ctx.fill()
}

function drawTree(ctx: CanvasRenderingContext2D, prop: Prop): void {
  const s = prop.scale
  propShadow(ctx, prop.x, prop.y + 2, 15 * s)

  ctx.fillStyle = '#7c5a3a'
  ctx.fillRect(prop.x - 2.5 * s, prop.y - 20 * s, 5 * s, 20 * s)

  // พุ่มใบสามก้อนซ้อนกัน อ่านเป็นทรงพุ่มโดยไม่ต้องวาดใบทีละใบ
  ctx.fillStyle = prop.tint
  for (const [dx, dy, r] of [
    [0, -32, 15],
    [-10, -24, 11],
    [10, -25, 11],
  ] as const) {
    ctx.beginPath()
    ctx.arc(prop.x + dx * s, prop.y + dy * s, r * s, 0, Math.PI * 2)
    ctx.fill()
  }

  // แสงบนยอดพุ่ม บอกว่าแดดมาจากซ้ายบน เหมือนของทุกชิ้นในเกม
  ctx.fillStyle = 'rgba(255,255,255,.22)'
  ctx.beginPath()
  ctx.arc(prop.x - 5 * s, prop.y - 36 * s, 6 * s, 0, Math.PI * 2)
  ctx.fill()
}

function drawBush(ctx: CanvasRenderingContext2D, prop: Prop): void {
  const s = prop.scale
  propShadow(ctx, prop.x, prop.y + 1, 11 * s)
  ctx.fillStyle = prop.tint
  for (const [dx, dy, r] of [
    [0, -7, 9],
    [-7, -4, 7],
    [7, -4, 7],
  ] as const) {
    ctx.beginPath()
    ctx.arc(prop.x + dx * s, prop.y + dy * s, r * s, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.fillStyle = 'rgba(255,255,255,.18)'
  ctx.beginPath()
  ctx.arc(prop.x - 3 * s, prop.y - 11 * s, 4 * s, 0, Math.PI * 2)
  ctx.fill()
}

function drawRock(ctx: CanvasRenderingContext2D, prop: Prop): void {
  const s = prop.scale
  propShadow(ctx, prop.x, prop.y + 1, 9 * s)
  ctx.fillStyle = prop.tint
  ctx.beginPath()
  ctx.moveTo(prop.x - 9 * s, prop.y)
  ctx.lineTo(prop.x - 5 * s, prop.y - 8 * s)
  ctx.lineTo(prop.x + 4 * s, prop.y - 9 * s)
  ctx.lineTo(prop.x + 9 * s, prop.y)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = 'rgba(255,255,255,.25)'
  ctx.beginPath()
  ctx.moveTo(prop.x - 5 * s, prop.y - 8 * s)
  ctx.lineTo(prop.x + 4 * s, prop.y - 9 * s)
  ctx.lineTo(prop.x + 1 * s, prop.y - 5 * s)
  ctx.closePath()
  ctx.fill()
}

function drawFlower(ctx: CanvasRenderingContext2D, prop: Prop, stem: string): void {
  const s = prop.scale
  /*
   * ก้านดอกใช้สีใบของสนามนั้น ไม่ใช่สีเขียวตายตัว
   * ก้านสีเขียวในทุ่งน้ำแข็งกับในดินแดนลาวาเป็นจุดเดียวที่หลุดจากชุดสี
   * เล็กมากจนแทบไม่เห็น แต่ถ้าปล่อยไว้ ทุกครั้งที่เพิ่มสนามใหม่
   * จะต้องมีคนมานั่งสงสัยว่าทำไมมีสีเขียวโผล่มาในสนามที่ไม่มีอะไรเขียวเลย
   */
  ctx.strokeStyle = stem
  ctx.lineWidth = 1.4 * s
  ctx.beginPath()
  ctx.moveTo(prop.x, prop.y)
  ctx.lineTo(prop.x, prop.y - 7 * s)
  ctx.stroke()

  ctx.fillStyle = prop.tint
  for (let i = 0; i < 5; i += 1) {
    const angle = (Math.PI * 2 * i) / 5
    ctx.beginPath()
    ctx.arc(
      prop.x + Math.cos(angle) * 2.6 * s,
      prop.y - 7 * s + Math.sin(angle) * 2.6 * s,
      2.2 * s,
      0,
      Math.PI * 2,
    )
    ctx.fill()
  }
  ctx.fillStyle = '#fbbf24'
  ctx.beginPath()
  ctx.arc(prop.x, prop.y - 7 * s, 1.6 * s, 0, Math.PI * 2)
  ctx.fill()
}

function drawGrass(ctx: CanvasRenderingContext2D, prop: Prop): void {
  const s = prop.scale
  ctx.strokeStyle = prop.tint
  ctx.lineWidth = 1.6 * s
  ctx.lineCap = 'round'
  for (const lean of [-3, 0, 3]) {
    ctx.beginPath()
    ctx.moveTo(prop.x + lean * s * 0.7, prop.y)
    ctx.quadraticCurveTo(
      prop.x + lean * s * 1.4,
      prop.y - 5 * s,
      prop.x + lean * s * 2.2,
      prop.y - 8 * s,
    )
    ctx.stroke()
  }
}

/**
 * วาดฉากทั้งหมดของสนาม
 *
 * ลำดับ: เขาไกล → ทางเดิน → ของบนพื้นเรียงตามความลึก
 * ทุกชั้นวาดด้วยความทึบต่ำ เพราะสิ่งที่ต้องอ่านออกที่สุดบนจอนี้
 * คือมอนกับตัวละคร ไม่ใช่ฉาก
 */
function drawScenery(ctx: CanvasRenderingContext2D, seed: string, biomeId: string): void {
  const scenery = sceneryFor(seed, biomeId)
  const palette = getBiome(biomeId).palette

  /*
   * ตัดทุกอย่างให้อยู่ในกรอบสนาม
   *
   * เขากับทางเดินจงใจให้จุดปลายเลยขอบออกไป เพื่อไม่ให้เห็นหัวท้ายของมัน
   * ซึ่งจะอ่านเป็น "เส้นที่จบกลางอากาศ" แทนที่จะเป็นทางที่ทอดต่อไปไกล ๆ
   * แต่ถ้าไม่ตัดกรอบ ส่วนที่เลยออกไปจะไปวาดทับพื้นหลังของหน้าเว็บจริง ๆ
   * ซึ่งเห็นชัดมากตอนเรนเดอร์ออกมาดู
   */
  ctx.save()
  ctx.beginPath()
  ctx.rect(0, 0, ARENA_WIDTH, ARENA_HEIGHT)
  ctx.clip()

  /*
   * ---- เขาไกล ๆ ที่ขอบฟ้า ----
   *
   * เตี้ยและจางมาก เพราะมันอยู่ในแถบ "ท้องฟ้า" ด้านบนของสนาม
   * ซึ่งเป็นแถบที่มอนเดินลงมาจากขอบบนพอดี
   * ลองทำให้สูงและเข้มกว่านี้แล้วเรนเดอร์ดู กลายเป็นก้อนเขียวใหญ่
   * ที่สายตาสับสนกับฝูงมอนสีเขียว ซึ่งเป็นสิ่งที่ห้ามเกิดที่สุดในสนามนี้
   */
  ctx.globalAlpha = 0.28
  ctx.fillStyle = palette.hill
  for (const hill of scenery.hills) {
    ctx.beginPath()
    ctx.ellipse(hill.x, hill.y + 14, hill.r, hill.r * 0.42, 0, Math.PI, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalAlpha = 1

  // ---- ทางเดินดิน ----
  ctx.globalAlpha = 0.3
  ctx.strokeStyle = palette.path
  ctx.lineWidth = 34
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.beginPath()
  const [start, ...rest] = scenery.path
  if (start) {
    ctx.moveTo(start.x, start.y)
    for (let i = 0; i < rest.length; i += 1) {
      const point = rest[i]
      const next = rest[i + 1]
      if (!point) continue
      if (next) {
        ctx.quadraticCurveTo(point.x, point.y, (point.x + next.x) / 2, (point.y + next.y) / 2)
      } else {
        ctx.lineTo(point.x, point.y)
      }
    }
    ctx.stroke()
  }
  ctx.restore()

  // ---- ของบนพื้น ----
  ctx.save()
  ctx.beginPath()
  ctx.rect(0, 0, ARENA_WIDTH, ARENA_HEIGHT)
  ctx.clip()
  ctx.globalAlpha = 0.78
  for (const prop of scenery.props) {
    if (prop.kind === 'tree') drawTree(ctx, prop)
    else if (prop.kind === 'bush') drawBush(ctx, prop)
    else if (prop.kind === 'rock') drawRock(ctx, prop)
    else if (prop.kind === 'flower') drawFlower(ctx, prop, palette.leafTints[0] ?? '#5ba85f')
    else drawGrass(ctx, prop)
  }
  ctx.restore()
}
