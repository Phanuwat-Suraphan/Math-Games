/**
 * ผังเมืองเงินทองแบบมองจากด้านบน (top-down)
 *
 * ฮีโร่เริ่มที่ค่ายริมแม่น้ำ (ด่าน 0) ข้ามสะพานไม้ แล้วเดินตามถนนที่คดเคี้ยว
 * ผ่านอาคารของด่าน 1 → 12 จนถึงปราสาท FINAL MONEY MASTER ด้านบน
 *
 * ทุกอย่างในไฟล์นี้เป็นข้อมูลล้วน (ไม่แตะหน้าจอ) จึงตรวจด้วยชุดทดสอบได้ว่า
 * ต้นไม้ไม่ขวางถนน ประตูทุกด่านอยู่บนถนน และเหรียญทุกเหรียญเก็บได้จริง
 */

export interface Pt {
  x: number
  y: number
}

export const WORLD = { w: 2240, h: 1640 }

/** แม่น้ำแนวนอนด้านล่างของเมือง */
export const RIVER = { top: 1300, bottom: 1400 }

/** สะพานไม้ข้ามแม่น้ำ */
export const BRIDGE = { x: 290, w: 110 }

/**
 * ถนนหลัก (เส้นผ่านกลางถนน) เรียงจากค่ายไปปราสาท
 * จุดที่มี level คือหน้าประตูอาคารของด่านนั้น
 */
export const ROAD: (Pt & { level?: number })[] = [
  // แถวล่างสุด: ค่ายริมแม่น้ำ แล้วเลี้ยวขึ้นข้ามสะพาน
  { x: 150, y: 1520, level: 0 },
  { x: 345, y: 1520 },
  // แถว B: ไปทางขวา
  { x: 345, y: 1200 },
  { x: 640, y: 1200, level: 1 },
  { x: 1020, y: 1200, level: 2 },
  { x: 1400, y: 1200, level: 3 },
  { x: 1780, y: 1200, level: 4 },
  { x: 2060, y: 1200 },
  // แถว C: ย้อนกลับไปทางซ้าย
  { x: 2060, y: 900 },
  { x: 1840, y: 900, level: 5 },
  { x: 1440, y: 900, level: 6 },
  { x: 1040, y: 900, level: 7 },
  { x: 640, y: 900, level: 8 },
  { x: 300, y: 900 },
  // แถว D: ไปทางขวาอีกครั้ง แล้วขึ้นปราสาท
  { x: 300, y: 600 },
  { x: 580, y: 600, level: 9 },
  { x: 980, y: 600, level: 10 },
  { x: 1380, y: 600, level: 11 },
  { x: 1780, y: 600 },
  { x: 1780, y: 330, level: 12 },
]

export const ROAD_WIDTH = 74

/**
 * ถนนรักษ์โลก: ทางเดินดินใต้แม่น้ำ แยกจากเชิงสะพานไปทางขวา
 * มีแผงกาดรักษ์โลก (เข้าเล่นโหมดกาด) และสวนของฮีโร่ (ต้นไม้โตตามยอดขาย)
 */
export const ECO_LANE: [Pt, Pt] = [
  { x: 345, y: 1520 },
  { x: 1180, y: 1520 },
]
export const ECO_LANE_WIDTH = 56
/** จุดยืนหน้าแผงกาด และหน้าสวน (อยู่บนถนนรักษ์โลก) */
export const ECO_MARKET: Pt = { x: 700, y: 1520 }
export const ECO_GARDEN: Pt = { x: 1000, y: 1520 }
/** ขนาดแผงและสวน (อยู่เหนือจุดยืน ใช้กันชนและกันต้นไม้) */
export const ECO_SPOT = { w: 170, h: 96, gap: 22 }

export function ecoRect(at: Pt): { x: number; y: number; w: number; h: number } {
  return { x: at.x - ECO_SPOT.w / 2, y: at.y - ECO_SPOT.gap - ECO_SPOT.h, w: ECO_SPOT.w, h: ECO_SPOT.h }
}

/** ตำแหน่งประตูของแต่ละด่าน */
export function doorOf(level: number): Pt {
  const p = ROAD.find((r) => r.level === level)
  if (!p) throw new Error(`ไม่มีประตูของด่าน ${level}`)
  return { x: p.x, y: p.y }
}

export function roadIndexOf(level: number): number {
  return ROAD.findIndex((r) => r.level === level)
}

/** อาคารตั้งอยู่เหนือประตู (ขนาดโดยประมาณสำหรับชน) */
export const BUILDING = { w: 150, h: 120, gap: 26 }

export function buildingRect(level: number): { x: number; y: number; w: number; h: number } {
  const d = doorOf(level)
  return { x: d.x - BUILDING.w / 2, y: d.y - BUILDING.gap - BUILDING.h, w: BUILDING.w, h: BUILDING.h }
}

/* ------------------------------------------------------------------ */
/* เรขาคณิตง่าย ๆ                                                       */
/* ------------------------------------------------------------------ */

export function dist(a: Pt, b: Pt): number {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

/** ระยะจากจุดถึงส่วนของเส้นตรง และจุดที่ใกล้ที่สุดบนเส้น */
export function nearestOnSegment(p: Pt, a: Pt, b: Pt): { pt: Pt; d: number; t: number } {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const len2 = dx * dx + dy * dy || 1
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2))
  const pt = { x: a.x + dx * t, y: a.y + dy * t }
  return { pt, d: dist(p, pt), t }
}

/** ระยะจากจุดถึงถนน และตำแหน่งบนถนน (segment ที่ใกล้ที่สุด) */
export function nearestOnRoad(p: Pt): { pt: Pt; d: number; seg: number } {
  let best = { pt: ROAD[0] as Pt, d: Infinity, seg: 0 }
  for (let i = 0; i < ROAD.length - 1; i += 1) {
    const r = nearestOnSegment(p, ROAD[i], ROAD[i + 1])
    if (r.d < best.d) best = { pt: r.pt, d: r.d, seg: i }
  }
  return best
}

/**
 * เส้นทางเดินอัตโนมัติไปยังประตูด่าน: เดินเข้าถนน แล้วเดินตามถนนจนถึงประตู
 * (ใช้ตอนเด็กแตะอาคาร ฮีโร่จะไม่ติดต้นไม้เพราะเดินบนถนนเสมอ)
 */
export function routeTo(from: Pt, level: number): Pt[] {
  const target = roadIndexOf(level)
  const near = nearestOnRoad(from)
  const route: Pt[] = [near.pt]
  if (target > near.seg) {
    for (let i = near.seg + 1; i <= target; i += 1) route.push(ROAD[i])
  } else {
    for (let i = near.seg; i >= target; i -= 1) route.push(ROAD[i])
  }
  return route
}

/** ระยะจากจุดถึงถนนรักษ์โลก */
export function nearestOnLane(p: Pt): { pt: Pt; d: number } {
  const r = nearestOnSegment(p, ECO_LANE[0], ECO_LANE[1])
  return { pt: r.pt, d: r.d }
}

/** เส้นทางไปจุดบนถนนรักษ์โลก: อยู่บนถนนรักษ์โลกแล้วเดินตรงไปเลย ไม่งั้นเดินตามถนนมาเชิงสะพานก่อน */
export function routeToLane(from: Pt, target: Pt): Pt[] {
  if (nearestOnLane(from).d < ROAD_WIDTH) return [nearestOnLane(from).pt, target]
  const near = nearestOnRoad(from)
  const route: Pt[] = [near.pt]
  // ถนนช่วง 0–1 คือแถวล่างสุด เชิงสะพานคือ ROAD[1]
  if (near.seg >= 1) for (let i = near.seg; i >= 1; i -= 1) route.push(ROAD[i])
  else route.push(ROAD[1])
  route.push(target)
  return route
}

/* ------------------------------------------------------------------ */
/* เพื่อนในเมือง                                                       */
/* ------------------------------------------------------------------ */

export const TOWN_NPCS: { id: 'rabbit' | 'fox' | 'bear' | 'owl'; x: number; y: number }[] = [
  { id: 'rabbit', x: 470, y: 1268 },
  { id: 'fox', x: 1590, y: 1268 },
  { id: 'bear', x: 1240, y: 968 },
  { id: 'owl', x: 1180, y: 668 },
]

/* ------------------------------------------------------------------ */
/* ต้นไม้ ก้อนหิน ดอกไม้ (สุ่มแบบกำหนด seed ทุกเครื่องได้ผังเดียวกัน)   */
/* ------------------------------------------------------------------ */

function seeded(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export interface Tree extends Pt {
  r: number
  kind: 0 | 1 | 2
}

function inRiver(p: Pt, pad = 0): boolean {
  return p.y > RIVER.top - pad && p.y < RIVER.bottom + pad
}

function nearBuilding(p: Pt, pad: number): boolean {
  for (const r of ROAD) {
    if (r.level === undefined) continue
    const b = buildingRect(r.level)
    if (p.x > b.x - pad && p.x < b.x + b.w + pad && p.y > b.y - pad && p.y < r.y + pad) return true
  }
  return false
}

/** ใกล้ถนนรักษ์โลก แผงกาด หรือสวน (ต้นไม้และของตกแต่งต้องหลบ) */
function nearEco(p: Pt, pad: number): boolean {
  if (nearestOnLane(p).d < ECO_LANE_WIDTH / 2 + pad) return true
  for (const at of [ECO_MARKET, ECO_GARDEN]) {
    const b = ecoRect(at)
    if (p.x > b.x - pad && p.x < b.x + b.w + pad && p.y > b.y - pad && p.y < at.y + pad) return true
  }
  return false
}

function generateTrees(): Tree[] {
  const rnd = seeded(2569)
  const trees: Tree[] = []
  // แนวต้นไม้หนาทึบรอบขอบเมือง + ต้นไม้กระจายด้านใน
  for (let i = 0; i < 900 && trees.length < 95; i += 1) {
    const edge = i % 3 === 0
    const p = edge
      ? { x: rnd() < 0.5 ? 40 + rnd() * 120 : WORLD.w - 40 - rnd() * 120, y: 60 + rnd() * (WORLD.h - 120) }
      : { x: 60 + rnd() * (WORLD.w - 120), y: 60 + rnd() * (WORLD.h - 120) }
    const r = 34 + Math.floor(rnd() * 18)
    if (inRiver(p, r + 10)) continue
    if (nearestOnRoad(p).d < ROAD_WIDTH / 2 + r + 30) continue
    if (nearBuilding(p, r + 40)) continue
    if (nearEco(p, r + 30)) continue
    if (trees.some((t) => dist(t, p) < t.r + r + 8)) continue
    // เว้นที่ว่างรอบค่ายเริ่มต้น และรอบเพื่อน ๆ ในเมือง
    if (dist(p, ROAD[0]) < 170) continue
    if (TOWN_NPCS.some((n) => dist(n, p) < r + 50)) continue
    trees.push({ ...p, r, kind: (Math.floor(rnd() * 3) as 0 | 1 | 2) })
  }
  return trees
}

export const TREES: Tree[] = generateTrees()

export interface Decor extends Pt {
  kind: 'rock' | 'flower' | 'bush' | 'mushroom'
}

function generateDecor(): Decor[] {
  const rnd = seeded(77)
  const out: Decor[] = []
  const kinds: Decor['kind'][] = ['flower', 'flower', 'bush', 'rock', 'mushroom']
  for (let i = 0; i < 600 && out.length < 70; i += 1) {
    const p = { x: 40 + rnd() * (WORLD.w - 80), y: 40 + rnd() * (WORLD.h - 80) }
    if (inRiver(p, 20)) continue
    if (nearestOnRoad(p).d < ROAD_WIDTH / 2 + 14) continue
    if (nearBuilding(p, 20)) continue
    if (nearEco(p, 14)) continue
    if (TREES.some((t) => dist(t, p) < t.r + 16)) continue
    if (TOWN_NPCS.some((n) => dist(n, p) < 40)) continue
    out.push({ ...p, kind: kinds[Math.floor(rnd() * kinds.length)] })
  }
  return out
}

export const DECOR: Decor[] = generateDecor()

/* ------------------------------------------------------------------ */
/* เหรียญบนแผนที่                                                      */
/* ------------------------------------------------------------------ */

export interface TownCoin extends Pt {
  id: string
}

/** เหรียญวางเป็นแถวข้างถนน ระหว่างประตูด่าน */
function generateCoins(): TownCoin[] {
  const coins: TownCoin[] = []
  for (let i = 0; i < ROAD.length - 1; i += 1) {
    const a = ROAD[i]
    const b = ROAD[i + 1]
    const len = dist(a, b)
    const n = Math.floor(len / 150)
    for (let k = 1; k <= n; k += 1) {
      const t = k / (n + 1)
      coins.push({ id: `t${i}-${k}`, x: Math.round(a.x + (b.x - a.x) * t), y: Math.round(a.y + (b.y - a.y) * t) })
    }
  }
  return coins
}

export const TOWN_COINS: TownCoin[] = generateCoins()

/* ------------------------------------------------------------------ */
/* การชน                                                               */
/* ------------------------------------------------------------------ */

export const HERO_R = 18

/** จุดนี้ฮีโร่ยืนได้หรือไม่ (ไม่ชนต้นไม้ อาคาร แม่น้ำ และไม่ออกนอกแผนที่) */
export function walkable(p: Pt): boolean {
  if (p.x < 30 || p.y < 40 || p.x > WORLD.w - 30 || p.y > WORLD.h - 20) return false
  if (inRiver(p, 6) && !(p.x > BRIDGE.x + 8 && p.x < BRIDGE.x + BRIDGE.w - 8)) return false
  for (const t of TREES) if (dist(t, p) < t.r * 0.55 + HERO_R) return false
  for (const r of ROAD) {
    if (r.level === undefined) continue
    const b = buildingRect(r.level)
    if (p.x > b.x + 10 && p.x < b.x + b.w - 10 && p.y > b.y + 30 && p.y < b.y + b.h + 4) return false
  }
  for (const at of [ECO_MARKET, ECO_GARDEN]) {
    const b = ecoRect(at)
    if (p.x > b.x + 10 && p.x < b.x + b.w - 10 && p.y > b.y + 24 && p.y < b.y + b.h + 4) return false
  }
  for (const n of TOWN_NPCS) if (dist(n, p) < 26) return false
  return true
}

/* ------------------------------------------------------------------ */
/* ขยะรายวันบนถนน (ขั้น "เก็บขยะ" ของกาดรักษ์โลก)                      */
/* ------------------------------------------------------------------ */

export interface TrashSpot extends Pt {
  id: string
}

/** จุดที่อาจมีขยะ: กึ่งกลางระหว่างเหรียญบนถนนทุกช่วง และบนถนนรักษ์โลก */
function generateTrashSpots(): TrashSpot[] {
  const spots: TrashSpot[] = []
  const lines: [Pt, Pt, string][] = ROAD.slice(0, -1).map((a, i) => [a, ROAD[i + 1], `w${i}`])
  lines.push([ECO_LANE[0], ECO_LANE[1], 'eco'])
  for (const [a, b, key] of lines) {
    const n = Math.floor(dist(a, b) / 150)
    for (let k = 0; k <= n; k += 1) {
      const t = (k + 0.5) / (n + 1)
      spots.push({ id: `${key}-${k}`, x: Math.round(a.x + (b.x - a.x) * t), y: Math.round(a.y + (b.y - a.y) * t) })
    }
  }
  return spots
}

export const TRASH_SPOTS: TrashSpot[] = generateTrashSpots()

export const TRASH_KINDS = ['bottle', 'can', 'box', 'paper', 'cap', 'jar'] as const

export interface DailyTrash extends TrashSpot {
  kind: (typeof TRASH_KINDS)[number]
}

/** ขยะของวันนี้ 6 ชิ้น (ทุกเครื่องเห็นเหมือนกันในวันเดียวกัน) */
export function dailyTrash(day: string, count = 6): DailyTrash[] {
  let h = 2166136261
  for (let i = 0; i < day.length; i += 1) h = Math.imul(h ^ day.charCodeAt(i), 16777619)
  const rnd = seeded(h >>> 0)
  const pool = TRASH_SPOTS.slice()
  const out: DailyTrash[] = []
  while (out.length < count && pool.length > 0) {
    const spot = pool.splice(Math.floor(rnd() * pool.length), 1)[0]
    if (out.some((o) => dist(o, spot) < 120)) continue
    out.push({ ...spot, kind: TRASH_KINDS[Math.floor(rnd() * TRASH_KINDS.length)] })
  }
  return out
}
