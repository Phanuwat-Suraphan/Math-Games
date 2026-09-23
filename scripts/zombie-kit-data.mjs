/**
 * สร้างข้อมูลของชุดพิมพ์ ZOMBIE RESCUE (zombie-rescue.html) จากตรรกะของเกมบนเว็บ
 *
 * ทำไมต้องสร้างจากโค้ดเกม
 *
 * ชุดพิมพ์กับฉบับเว็บต้องเป็นเกมเดียวกัน: กระดาน ตัวละคร เขต แม่สูตรคูณ โจทย์ และตัวเลขกติกา
 * ถ้าคัดลอกด้วยมือ วันที่แก้เกมบนเว็บ ชุดพิมพ์จะค้างเป็นของเก่าโดยไม่มีใครรู้
 * สคริปต์นี้จึงดึงทุกอย่างจาก src/zombieRescue/ แล้วเขียนทับบล็อกข้อมูลใน zombie-rescue.html
 *
 * การ์ดโจทย์เลือกแบบกำหนดผลได้ (ตัวสุ่มมี seed) รันกี่ครั้งก็ได้ชุดเดิม
 * เขตละ 12 ใบ กระจายทุกแม่แบบของเขต และกระจายจำนวนกลุ่ม 2–10 ให้ครบที่สุด
 * ภารกิจ ดร.ซอมโบ 10 ใบ กระจายทุกแม่
 *
 * วิธีใช้
 *   npx tsc -p tsconfig.tests.json --outDir /tmp/logic
 *   node scripts/zombie-kit-data.mjs /tmp/logic
 */

import fs from 'fs'
import path from 'path'
import { createRequire } from 'module'
import { fileURLToPath } from 'url'

const OUT = process.argv[2]
if (!OUT) {
  console.error('ต้องบอกโฟลเดอร์ที่คอมไพล์แล้ว เช่น node scripts/zombie-kit-data.mjs /tmp/logic')
  process.exit(1)
}
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const KIT = path.join(ROOT, 'zombie-rescue.html')
const require = createRequire(import.meta.url)
const load = (name) => require(path.resolve(OUT, name + '.js'))
const BOARD = load('zombieRescue/board')
const Q = load('zombieRescue/questions')
const ENG = load('zombieRescue/engine')
const ART = load('zombieRescue/art')

function seeded(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/* ── เลือกการ์ดโจทย์ ─────────────────────────────────────── */

const PLAN = [
  { stage: 1, letter: 'A', count: 12 },
  { stage: 2, letter: 'B', count: 12 },
  { stage: 3, letter: 'C', count: 12 },
  { stage: 4, letter: 'D', count: 12 },
  { stage: 5, letter: 'E', count: 12 },
  { stage: 'boss', letter: 'Z', count: 10 },
]

function pool(stage, rng) {
  const seen = new Map()
  for (let i = 0; i < 30000; i += 1) {
    const q = Q.makeQuestion(stage, rng)
    if (q.groups < 2) continue
    const sig = Q.signatureOf(q)
    if (!seen.has(sig)) seen.set(sig, q)
  }
  return [...seen.values()]
}

/** คำตอบสั้นบนมุมการ์ด ให้คนอ่านใช้นิ้วปิดไว้ (เฉลยเต็มอยู่ในแผ่นเฉลย) */
function shortAnswer(q) {
  if (q.ask === 'sentence') return `${q.groups} × ${q.each} = ${q.product}${q.groups === q.each ? '' : ' (สลับได้)'}`
  if (q.ask === 'missing') return `□ = ${Q.expectedNumber(q)}`
  return `${q.product}${q.unit ? ' ' + q.unit : ''}`
}

function pickCards({ stage, letter, count }, rng) {
  const all = pool(stage, rng)
  const keys = Q.TEMPLATE_KEYS[stage]
  const per = keys.map((_, i) => Math.floor(count / keys.length) + (i < count % keys.length ? 1 : 0))
  const groupsUse = {}
  const tableUse = {}
  const chosen = []
  keys.forEach((key, k) => {
    for (let n = 0; n < per[k]; n += 1) {
      const candidates = all.filter((q) => q.key === key && !chosen.includes(q))
      let best = null
      let bestScore = Infinity
      for (const q of candidates) {
        const score = (groupsUse[q.groups] || 0) * 10 + (tableUse[q.each] || 0) * 4 + rng()
        if (score < bestScore) {
          best = q
          bestScore = score
        }
      }
      if (!best) throw new Error(`แม่แบบ ${key} ไม่มีโจทย์ให้เลือกพอ`)
      chosen.push(best)
      groupsUse[best.groups] = (groupsUse[best.groups] || 0) + 1
      tableUse[best.each] = (tableUse[best.each] || 0) + 1
    }
  })
  // สลับลำดับ ให้แม่แบบเดียวกันไม่มาติดกันเป็นแพ
  for (let i = chosen.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1))
    ;[chosen[i], chosen[j]] = [chosen[j], chosen[i]]
  }
  return chosen.map((q, i) => ({
    id: letter + String(i + 1).padStart(2, '0'),
    stage,
    key: q.key,
    groups: q.groups,
    each: q.each,
    product: q.product,
    ask: q.ask,
    hidden: q.hidden ?? null,
    answer: Q.expectedNumber(q),
    text: q.text,
    visual: q.visual,
    unit: q.unit,
    short: shortAnswer(q),
    answerText: q.answerText,
    why: q.why,
    hint: q.hint,
  }))
}

const rng = seeded(20260923)
const cards = PLAN.flatMap((plan) => pickCards(plan, rng))

/* ── ภาพ ─────────────────────────────────────────────────── */

/** ซอมบี้ประจำแม่: ตัวเดียวกัน เปลี่ยนสีเสื้อตามเขต (ซอมบี้ ×2 ×3 ×4 ×5 ×10) */
const TABLE_COLOR = { 2: '#2E9E4F', 3: '#D9730D', 4: '#1E78D9', 5: '#8B4FC7', 10: '#E0453A' }
const zombie = ART.charInner('zombie')
const zombieByTable = Object.fromEntries(Object.entries(TABLE_COLOR).map(([t, c]) => [t, zombie.split('#8FB7E8').join(c)]))

const data = {
  note: 'สร้างโดย scripts/zombie-kit-data.mjs จาก src/zombieRescue/ ห้ามแก้ด้วยมือ',
  zones: BOARD.ZONES,
  squareInfo: BOARD.SQUARE_INFO,
  board: { viewBox: ART.BOARD_VIEWBOX, svg: ART.boardArt() },
  chars: Object.fromEntries(['scientist', 'doctor', 'scout', 'dog', 'zombie', 'boss', 'zombo'].map((k) => [k, ART.charInner(k)])),
  charNames: ART.CHAR_NAMES,
  zombieByTable,
  tableColor: TABLE_COLOR,
  zhead: ART.zheadInner(),
  cured: ART.curedHeadInner(),
  heroes: ENG.HERO_INFO,
  items: ENG.ITEM_INFO,
  itemCounts: { medkit: 8, help: 8, shield: 4, skate: 4, radio: 2 },
  supplyTable: ENG.SUPPLY_TABLE,
  events: ENG.EVENT_DECK.map((key) => ({ key, ...ENG.EVENT_INFO[key] })),
  targets: {
    normal: [1, 2, 3, 4].map((n) => ENG.targetFor(n, false)),
    easy: [1, 2, 3, 4].map((n) => ENG.targetFor(n, true)),
  },
  rules: {
    maxLives: ENG.MAX_LIVES,
    bag: ENG.BAG_LIMIT,
    startSupplies: ENG.START_SUPPLIES,
    skate: ENG.SKATE_STEPS,
    heli: ENG.HELI_STEPS,
    chase: ENG.CHASE_STEPS,
    eventVaccine: ENG.EVENT_VACCINE,
    supplyCoins: ENG.SUPPLY_COINS,
    squares: BOARD.LAST_SQUARE,
  },
  cards,
}

/* ── เขียนทับบล็อกข้อมูลในไฟล์ชุดพิมพ์ ───────────────────── */

const html = fs.readFileSync(KIT, 'utf8')
const start = '<script id="kit-data" type="application/json">'
const end = '</script>'
const a = html.indexOf(start)
const b = html.indexOf(end, a)
if (a < 0 || b < 0) throw new Error('ไม่พบบล็อก kit-data ใน zombie-rescue.html')
// กัน </script> ในข้อความ SVG ไม่ให้ปิดแท็กก่อนเวลา
const json = JSON.stringify(data).replace(/</g, '\\u003c')
fs.writeFileSync(KIT, html.slice(0, a + start.length) + json + html.slice(b))
const counts = PLAN.map((p) => `${p.letter}${cards.filter((c) => c.stage === p.stage).length}`).join(' ')
console.log(`เขียนข้อมูลชุดพิมพ์แล้ว: การ์ดโจทย์ ${cards.length} ใบ (${counts}) · ${(json.length / 1024).toFixed(0)} KB`)
