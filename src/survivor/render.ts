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

export interface HeroView {
  image: HTMLImageElement | null
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
  const ground = ctx.createLinearGradient(0, 0, 0, ARENA_HEIGHT)
  ground.addColorStop(0, '#bfe8ff')
  ground.addColorStop(0.55, '#d9f2c9')
  ground.addColorStop(1, '#a8dd8f')
  ctx.fillStyle = ground
  ctx.fillRect(0, 0, ARENA_WIDTH, ARENA_HEIGHT)
  ctx.strokeStyle = 'rgba(30,64,40,.10)'
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

  if (hero.image) {
    /*
     * ท่าเดิน: ขยับขึ้นลงเร็วตอนเดิน ช้าตอนยืนนิ่ง และพลิกตามทิศที่เดิน
     * เป็นการเคลื่อนไหวที่น้อยที่สุดที่ทำให้ตัวละครดูมีชีวิต
     * โดยไม่ต้องมีภาพหลายเฟรมให้ต้องวาดเพิ่มทีละตัว
     */
    const size = radius * 3.6
    const bob = hero.moving
      ? Math.abs(Math.sin(world.time * 11)) * -4
      : Math.sin(world.time * 2.3) * 1.1

    ctx.save()
    ctx.translate(pos.x, pos.y + bob)
    if (hero.facing < 0) ctx.scale(-1, 1)
    // เอียงตัวเล็กน้อยตอนเดิน ทำให้รู้สึกว่ากำลังออกแรง
    if (hero.moving) ctx.rotate(Math.sin(world.time * 11) * 0.05)
    if (blink) ctx.globalAlpha = 0.55
    ctx.drawImage(hero.image, -size / 2, -size * 0.78, size, size)
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
    ctx.globalAlpha = fade
    ctx.fillStyle = particle.color
    const size = particle.size * (0.4 + fade * 0.6)
    ctx.fillRect(particle.pos.x - size / 2, particle.pos.y - size / 2, size, size)
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

  ctx.restore()
}
