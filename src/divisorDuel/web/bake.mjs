/**
 * ฝังรูปการ์ดลงในไฟล์เกมแบบถาวร
 *
 * รูปที่ฝังด้วยสคริปต์นี้จะติดไปกับไฟล์ HTML ทุกที่ที่ส่งลิงก์ไป
 * ต่างจากรูปที่อัปผ่านหน้าเกม ซึ่งเก็บอยู่ในเบราว์เซอร์เครื่องเดียว
 *
 * วิธีใช้
 *   node src/divisorDuel/web/bake.mjs <โฟลเดอร์รูป> <ไฟล์ HTML ที่จะแก้>
 *
 * ตั้งชื่อไฟล์รูปให้ตรงกับการ์ด (นามสกุลอะไรก็ได้: png jpg jpeg webp)
 *
 *   มอนสเตอร์      stone-gargoyle · swamp-troll · crimson-wyvern
 *                  iron-golem · skeleton-king · void-dragon
 *   ฮีโร่          high-priestess-elara · grand-wizard-arcanus
 *                  knight-commander-valerius · lich-queen-morwenna
 *   การ์ดตัวเลข    1 · 2 · 3 · 4 · 5 · 6 · 7 · 8 · 9 · 10 · 20 · 50
 *   เครื่องหมาย    plus · minus · multiply · bracket
 *
 * ตัวอย่าง: assets/cards/stone-gargoyle.png, assets/cards/7.jpg, assets/cards/plus.png
 */

import fs from 'fs'
import path from 'path'

const MONSTERS = [
  'stone-gargoyle', 'swamp-troll', 'crimson-wyvern',
  'iron-golem', 'skeleton-king', 'void-dragon',
]
const HEROES = [
  'high-priestess-elara', 'grand-wizard-arcanus',
  'knight-commander-valerius', 'lich-queen-morwenna',
]
const NUMBERS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 20, 50]
const OPERATORS = { plus: '+', minus: '-', multiply: '*', bracket: '()' }

const MIME = {
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webp': 'image/webp', '.gif': 'image/gif', '.svg': 'image/svg+xml',
}

/** หาไฟล์รูปที่ชื่อตรงกับ base ไม่ว่านามสกุลอะไร */
function findImage(dir, base) {
  for (const ext of Object.keys(MIME)) {
    const file = path.join(dir, base + ext)
    if (fs.existsSync(file)) return file
  }
  return null
}

function toDataUri(file) {
  const ext = path.extname(file).toLowerCase()
  const mime = MIME[ext]
  if (!mime) return null
  return `data:${mime};base64,${fs.readFileSync(file).toString('base64')}`
}

function collect(dir) {
  const images = {}
  const found = []
  const missing = []

  const add = (key, base, label) => {
    const file = findImage(dir, base)
    if (!file) { missing.push(label); return }
    const uri = toDataUri(file)
    if (!uri) { missing.push(label + ' (นามสกุลไม่รองรับ)'); return }
    images[key] = uri
    found.push(`${label.padEnd(28)} ${(fs.statSync(file).size / 1024).toFixed(0).padStart(5)} KB`)
  }

  MONSTERS.forEach((id) => add('mon:' + id, id, 'มอนสเตอร์ ' + id))
  HEROES.forEach((id) => add('hero:' + id, id, 'ฮีโร่ ' + id))
  NUMBERS.forEach((n) => add('num:' + n, String(n), 'เลข ' + n))
  for (const [base, symbol] of Object.entries(OPERATORS)) {
    add('op:' + symbol, base, 'เครื่องหมาย ' + base)
  }

  return { images, found, missing }
}

function main() {
  const [dir, htmlFile] = process.argv.slice(2)

  if (!dir || !htmlFile) {
    console.error('ใช้: node bake.mjs <โฟลเดอร์รูป> <ไฟล์ HTML>')
    process.exit(1)
  }
  if (!fs.existsSync(dir)) {
    console.error(`ไม่พบโฟลเดอร์รูป: ${dir}`)
    process.exit(1)
  }
  if (!fs.existsSync(htmlFile)) {
    console.error(`ไม่พบไฟล์ HTML: ${htmlFile}`)
    process.exit(1)
  }

  const { images, found, missing } = collect(dir)
  const count = Object.keys(images).length

  if (count === 0) {
    console.error('ไม่พบรูปที่ชื่อตรงกับการ์ดเลย ตรวจชื่อไฟล์อีกครั้ง (ดูรายชื่อในหัวไฟล์ bake.mjs)')
    process.exit(1)
  }

  console.log(`พบรูป ${count} ใบ`)
  found.forEach((line) => console.log('  ✅ ' + line))
  if (missing.length > 0) {
    console.log(`\nยังไม่มีรูป ${missing.length} ช่อง (จะใช้ภาพสัญลักษณ์เดิมไปก่อน):`)
    missing.slice(0, 10).forEach((label) => console.log('  — ' + label))
    if (missing.length > 10) console.log(`  — และอีก ${missing.length - 10} ช่อง`)
  }

  let html = fs.readFileSync(htmlFile, 'utf8')
  const payload = `<script>window.__BAKED_IMAGES=${JSON.stringify(images)};</script>`

  // แทนที่ของเดิมถ้าเคยฝังไว้แล้ว เพื่อให้รันซ้ำได้โดยไฟล์ไม่บวม
  const existing = /<script>window\.__BAKED_IMAGES=.*?<\/script>/s
  html = existing.test(html)
    ? html.replace(existing, payload)
    : html.replace('<title>', payload + '\n<title>')

  fs.writeFileSync(htmlFile, html)

  const mb = fs.statSync(htmlFile).size / 1024 / 1024
  console.log(`\nฝังรูปลง ${htmlFile} แล้ว — ขนาดไฟล์ ${mb.toFixed(2)} MB`)
  if (mb > 16) {
    console.warn('⚠️ ไฟล์ใหญ่เกิน 16 MB ซึ่งเกินขีดจำกัดของ Artifact — ควรย่อรูปให้เล็กลงก่อน')
  } else if (mb > 8) {
    console.warn('⚠️ ไฟล์เริ่มใหญ่ ถ้าเด็กเปิดผ่านเน็ตมือถืออาจโหลดช้า ลองย่อรูปลง')
  }
}

main()
