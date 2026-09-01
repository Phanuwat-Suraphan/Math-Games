/**
 * ตรวจว่าคลาส CSS ที่หน้าจอใช้ มีนิยามอยู่จริงใน index.css
 *
 * ทำไมต้องมี
 *
 * คลาสที่หายไปไม่ทำให้อะไรพังเลย ไม่มี error ไม่มีคำเตือน
 * build ผ่านปกติ CI เขียวปกติ หน้าเว็บเปิดได้ปกติ
 * ต่างกันแค่ของบนจอเป็นกล่องเปล่า ๆ แทนที่จะเป็นแผงที่ออกแบบไว้
 * ซึ่งไม่มีใครรู้จนกว่าจะมีคนเปิดดูด้วยตา
 *
 * เหตุการณ์จริงที่ทำให้ต้องมีไฟล์นี้: ตอนย้ายระบบดีไซน์เข้าโปรเจกต์
 * สคริปต์แทรกข้อความใช้สตริงที่ย่อหน้าไม่ตรงกับไฟล์จริง
 * replace จึงไม่เจอและไม่แทรกอะไรเลย โดยไม่แจ้งอะไรทั้งสิ้น
 * กฎ CSS ทั้งชุดหายไป เหลือแต่ keyframes ที่ต่อท้ายด้วยวิธีอื่น
 * จับได้เพราะบังเอิญเรนเดอร์ภาพออกมาดู ไม่ใช่เพราะมีอะไรเตือน
 *
 * ตัวตรวจนี้ไม่ต้องใช้ dependency ใด ๆ อ่านไฟล์เป็นข้อความล้วน
 *
 * วิธีใช้
 *   node tests/styles.test.mjs
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const CSS = fs.readFileSync(path.join(ROOT, 'src', 'index.css'), 'utf8')

let passed = 0
const failures = []

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

function check(name, fn) {
  try {
    fn()
    passed += 1
  } catch (error) {
    failures.push(`${name}: ${error.message}`)
  }
}

/**
 * คลาสของระบบดีไซน์ที่ต้องมีนิยามเสมอ
 *
 * เขียนรายการไว้ตรง ๆ แทนการไล่อ่านจากไฟล์ .tsx ทั้งหมด
 * เพราะการไล่อ่านจะเจอคลาสของ Tailwind ปนมาเป็นพัน ๆ ตัว
 * แล้วต้องมีรายการยกเว้นที่ยาวกว่ารายการที่อยากตรวจเสียอีก
 *
 * ตัวไหนถูกเลิกใช้จริง ๆ ให้ลบออกจากรายการนี้พร้อมกับลบออกจาก CSS
 * การลบทีละฝั่งคือสิ่งที่ตัวตรวจนี้ตั้งใจดักไว้
 */
const REQUIRED_CLASSES = [
  // ชั้นบรรยากาศของทั้งเกม
  'ambient',
  'ambient-stars',
  'ambient-vignette',
  'ambient-grain',

  // วัสดุของแผง
  'panel',
  'surface-card',
  'panel-hero',
  'panel-corners',
  'sheen',
  'lift',
  'topbar',
  'stat-chip',

  // ตัวอักษรและเส้นคั่น
  'title-hero',
  'title-gold',
  'divider-ornate',

  // ปุ่มและแถบ
  'btn-3d',
  'bar-track',
  'bar-fill',

  // ภาพหลักหน้าแรก
  'stage',
  'stage-rays',
  'stage-pedestal',
  'float-symbol',
  'cta-glow',

  // การ์ดโหมดในเมนู
  'menu-tile',
  'menu-tile-art',

  // การ์ดของเกมศึกผ่าสมการ
  'duel-card',
  'duel-card-corner',
  'duel-guard',
  'duel-guard-selected',
  'duel-guard-dead',
  'card-basic',
  'card-advanced',
  'card-legendary',
  'card-void',
  'card-operator',

  // Safe Zone Guardians
  'sz-stage',
  'sz-terminal',
  'sz-scanline',
  'sz-slot',
  'sz-slot-filled',
  'sz-heat',
  'sz-heat-critical',
  'sz-pad',
  'sz-hologram',

  // โดมสีเขียว
  'farm-stage',
  'farm-chip',
  'farm-hotspot',
  'farm-tab',
  'farm-tab-active',
  'farm-pill',
  'farm-pill-active',
  'farm-pill-up',
  'farm-pill-down',
  'farm-option',
  'farm-terminal',
  'farm-grow',
  'farm-alarm',
  'farm-ledger-row',
  'farm-ledger-done',
  'farm-ledger-num',
]

/** คลาสนี้ถูกนิยามไว้ในไฟล์ไหม */
function isDefined(className) {
  // ต้องเป็นตัวเลือกจริง ไม่ใช่คำที่บังเอิญโผล่ในคอมเมนต์
  const selector = new RegExp(`\\.${className}(?![\\w-])[^{]*\\{`)
  return selector.test(CSS)
}

check('คลาสของระบบดีไซน์ต้องมีนิยามครบทุกตัว', () => {
  const missing = REQUIRED_CLASSES.filter((name) => !isDefined(name))

  assert(
    missing.length === 0,
    `ไม่พบนิยามของ ${missing.length} คลาส: ${missing.join(', ')}\n` +
      '      คลาสที่หายไปทำให้ของบนจอกลายเป็นกล่องเปล่าโดยไม่มี error ให้เห็น',
  )
})

check('อนิเมชันที่ถูกเรียกใช้ต้องมี keyframes จริง', () => {
  /*
   * อนิเมชันที่ชี้ไปยัง keyframes ที่ไม่มีอยู่จะไม่ขยับเลย และไม่มีคำเตือน
   * เป็นข้อผิดพลาดชนิดเดียวกับคลาสที่หายไป คือเงียบสนิท
   */
  const used = new Set()
  for (const match of CSS.matchAll(/animation:\s*([\w-]+)/g)) {
    used.add(match[1])
  }

  const defined = new Set()
  for (const match of CSS.matchAll(/@keyframes\s+([\w-]+)/g)) {
    defined.add(match[1])
  }

  assert(used.size > 0, 'ไม่พบการเรียกใช้อนิเมชันเลย ซึ่งผิดปกติ')

  const missing = [...used].filter((name) => !defined.has(name))
  assert(missing.length === 0, `เรียกใช้อนิเมชันที่ไม่มี keyframes: ${missing.join(', ')}`)
})

check('keyframes ต้องอยู่นอก @layer ไม่งั้นจะถูกตัดทิ้ง', () => {
  /*
   * Tailwind ตัด keyframes ที่อยู่ใน @layer components ทิ้งตอน build
   * ผลคืออนิเมชันหายไปเงียบ ๆ เฉพาะตอน build จริงเท่านั้น
   * ในเครื่องพัฒนาจะดูปกติทุกอย่าง ซึ่งเป็นกับดักที่หาสาเหตุยากมาก
   */
  const layerStart = CSS.indexOf('@layer components')
  if (layerStart === -1) return

  // หาตำแหน่งปิดวงเล็บของ @layer components
  let depth = 0
  let layerEnd = CSS.length
  for (let i = CSS.indexOf('{', layerStart); i < CSS.length; i += 1) {
    if (CSS[i] === '{') depth += 1
    if (CSS[i] === '}') {
      depth -= 1
      if (depth === 0) {
        layerEnd = i
        break
      }
    }
  }

  const inside = CSS.slice(layerStart, layerEnd)
  assert(
    !inside.includes('@keyframes'),
    'มี @keyframes อยู่ใน @layer components ซึ่งจะถูกตัดทิ้งตอน build',
  )
})

check('ต้องไม่มีคลาสของระบบดีไซน์ที่นิยามไว้แต่ไม่มีใครใช้', () => {
  /*
   * ตรวจย้อนกลับอีกทาง กันไม่ให้ CSS บวมขึ้นเรื่อย ๆ จากของที่เลิกใช้แล้ว
   * ตรวจเฉพาะรายการที่เราดูแลเอง ไม่แตะคลาสของ Tailwind
   */
  const files = []
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) walk(full)
      else if (/\.tsx?$/.test(entry.name)) files.push(full)
    }
  }
  walk(path.join(ROOT, 'src'))

  const source = files.map((file) => fs.readFileSync(file, 'utf8')).join('\n')
  const unused = REQUIRED_CLASSES.filter((name) => {
    // surface-card กับ panel เป็นชื่อพ้องกัน ใช้ตัวใดตัวหนึ่งก็พอ
    if (name === 'surface-card' || name === 'panel') return false
    return !new RegExp(`[\\s"'\`]${name}[\\s"'\`]`).test(source)
  })

  assert(
    unused.length === 0,
    `นิยามไว้แต่ไม่มีใครใช้ ${unused.length} คลาส: ${unused.join(', ')}`,
  )
})

check('ทุกเฉดสีของโปรเจกต์ที่หน้าจอใช้ ต้องมีนิยามใน tailwind.config.js', () => {
  /*
   * บั๊กชนิดเดียวกับที่ทำให้ต้องมีไฟล์นี้ แต่คนละที่
   *
   * ชื่อสีอย่าง gold leaf ember night arcane ไม่ใช่ชื่อของ Tailwind
   * เป็นชื่อที่โปรเจกต์ตั้งเอง Tailwind จึงสร้างคลาสให้เฉพาะเฉดที่เขียนไว้ในคอนฟิก
   * เขียน text-gold-200 ทั้งที่คอนฟิกมีแต่ 300 ขึ้นไป จะไม่มีคลาสนั้นเกิดขึ้นเลย
   * ไม่มี error ไม่มีคำเตือน build ผ่าน หน้าเปิดได้ ตัวหนังสือแค่ได้สีที่สืบทอดมา
   * ซึ่งบางทีก็ดูใกล้เคียงพอจนไม่มีใครสังเกต
   *
   * ตอนเขียนข้อนี้ครั้งแรก เจอของแบบนี้ค้างอยู่ราวสามสิบจุด
   * แก้ด้วยการเติมเฉดที่ขาดในคอนฟิก แล้วเก็บข้อนี้ไว้กันไม่ให้กลับมาอีก
   */
  const config = fs.readFileSync(path.join(ROOT, 'tailwind.config.js'), 'utf8')

  // อ่านเฉพาะบล็อก colors ของคอนฟิก เก็บเป็นชุดของ "ชื่อ-เฉด" ที่มีจริง
  const colorsBlock = config.slice(config.indexOf('colors: {'))
  const defined = new Set()
  let family = null
  for (const line of colorsBlock.split('\n')) {
    const open = line.match(/^\s*([a-z]+):\s*\{\s*$/)
    if (open) {
      family = open[1]
      continue
    }
    const shade = line.match(/^\s*(\d{2,3}):\s*'/)
    if (shade && family) defined.add(`${family}-${shade[1]}`)
  }
  assert(defined.size > 0, 'อ่านชุดสีจาก tailwind.config.js ไม่ได้เลย')

  // ตรวจเฉพาะชื่อที่โปรเจกต์ตั้งเอง ชื่อของ Tailwind อย่าง slate มีครบทุกเฉดอยู่แล้ว
  const families = [...new Set([...defined].map((key) => key.split('-')[0]))].filter(
    (name) => name !== 'sky',
  )

  const files = []
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) walk(full)
      else if (/\.tsx?$/.test(entry.name)) files.push(full)
    }
  }
  walk(path.join(ROOT, 'src'))

  const pattern = new RegExp(`\\b(?:${families.join('|')})-(\\d{2,3})\\b`, 'g')
  const missing = new Map()
  for (const file of files) {
    const text = fs.readFileSync(file, 'utf8')
    for (const match of text.matchAll(pattern)) {
      if (defined.has(match[0])) continue
      const where = missing.get(match[0]) ?? new Set()
      where.add(path.relative(ROOT, file))
      missing.set(match[0], where)
    }
  }

  const report = [...missing.entries()]
    .map(([key, where]) => `${key} (${[...where].slice(0, 3).join(', ')})`)
    .join(' · ')
  assert(missing.size === 0, `เฉดที่ไม่มีนิยาม ${missing.size} แบบ: ${report}`)
})

console.log(`ผ่าน ${passed} ข้อ · ตรวจ ${REQUIRED_CLASSES.length} คลาส`)
if (failures.length > 0) {
  console.log(`\nไม่ผ่าน ${failures.length} ข้อ`)
  failures.forEach((line, i) => console.log(`  ${i + 1}. ${line}`))
  process.exit(1)
}
console.log('ผ่านทั้งหมด')
