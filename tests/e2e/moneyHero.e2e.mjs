/**
 * MONEY HERO: เปิดเว็บที่ build แล้วใน Chromium แล้วเล่นจริงตามเส้นทางของเด็ก
 *
 *   หน้าเปิด → หน้าเริ่มเกม → สร้างผู้เล่น → เข้าแผนที่
 *   → รีเฟรชแล้วผู้เล่นยังอยู่ (localStorage) → กลับหน้าเริ่มเกมเห็นปุ่ม "เล่นต่อ"
 *
 * ตรวจทั้งจอคอมพิวเตอร์และจอมือถือ: ต้องไม่มี error และไม่มีอะไรล้นจอจนต้องเลื่อนซ้ายขวา
 *
 * วิธีใช้
 *   npm run build
 *   node tests/e2e/moneyHero.e2e.mjs dist
 */

import fs from 'fs'
import http from 'http'
import path from 'path'
import { chromium } from 'playwright'

const DIST = path.resolve(process.argv[2] ?? 'dist')
const SHOTS = path.resolve('test-results')
fs.mkdirSync(SHOTS, { recursive: true })

const TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
}

// ไฟล์ที่ไม่มีอยู่ตอบ 404 จริง (รูปตัวละครที่ยังไม่อัปโหลดต้องถอยไปใช้อีโมจิได้)
const server = http.createServer((request, response) => {
  const url = decodeURIComponent((request.url ?? '/').split('?')[0])
  const file = path.join(DIST, url === '/' ? 'money-hero.html' : url)
  if (!file.startsWith(DIST) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    response.writeHead(404)
    response.end('not found')
    return
  }
  response.writeHead(200, { 'content-type': TYPES[path.extname(file)] ?? 'application/octet-stream' })
  response.end(fs.readFileSync(file))
})
await new Promise((resolve) => server.listen(4174, resolve))
const BASE = 'http://localhost:4174/money-hero.html'

const browser = await chromium.launch()
const errors = []
let failed = false
let shot = 0

async function openPage(viewport, name) {
  // ปิดภาพเคลื่อนไหวแบบเดียวกับที่ผู้ใช้ตั้งได้ในเครื่อง ไม่งั้นปุ่มที่เต้นตุบ ๆ
  // จะไม่มีวัน "นิ่ง" พอให้ Playwright กด (ฮีโร่บนแผนที่ยังเดินได้เพราะขยับด้วยโค้ด ไม่ใช่ CSS)
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1, reducedMotion: 'reduce' })
  const page = await context.newPage()
  page.setDefaultTimeout(15_000)
  page.on('pageerror', (error) => errors.push(`[${name}] pageerror: ${error.message}`))
  page.on('console', (message) => {
    if (message.type() !== 'error') return
    const text = message.text()
    // ฟอนต์ Google และรูปที่ยังไม่อัปโหลด (404) ไม่นับเป็นความผิดของหน้าจอ
    if (/Failed to load resource|net::ERR_/.test(text)) return
    errors.push(`[${name}] console: ${text}`)
  })
  return page
}

async function snap(page, label) {
  shot += 1
  await page.screenshot({ path: path.join(SHOTS, `money-hero-${String(shot).padStart(2, '0')}-${label}.png`) })
}

async function noSideScroll(page, label) {
  const { sw, cw } = await page.evaluate(() => ({
    sw: document.documentElement.scrollWidth,
    cw: document.documentElement.clientWidth,
  }))
  if (sw > cw + 1) throw new Error(`${label}: หน้าจอล้นด้านข้าง (กว้าง ${sw} แต่จอ ${cw})`)
}

async function step(label, fn) {
  try {
    await fn()
    console.log(`✔ ${label}`)
  } catch (error) {
    failed = true
    console.log(`✘ ${label}\n   ${error.message}`)
  }
}

for (const [name, viewport] of [
  ['desktop', { width: 1280, height: 860 }],
  ['mobile', { width: 390, height: 844 }],
]) {
  const page = await openPage(viewport, name)

  await step(`[${name}] หน้าเปิดแสดงโลโก้ แล้วไปหน้าเริ่มเกมเอง`, async () => {
    await page.goto(BASE)
    await page.getByTestId('mh-splash').waitFor()
    await snap(page, `${name}-splash`)
    await page.getByTestId('mh-start').waitFor({ timeout: 6000 })
    await page.getByText('MONEY HERO').first().waitFor()
    await snap(page, `${name}-start`)
    await noSideScroll(page, 'หน้าเริ่มเกม')
  })

  await step(`[${name}] กดเริ่มเกม → สร้างผู้เล่น`, async () => {
    await page.getByTestId('mh-start').click()
    await page.getByTestId('mh-name').waitFor()
    // ยังไม่พิมพ์ชื่อ ปุ่มต้องกดไม่ได้
    if (!(await page.getByTestId('mh-create').isDisabled())) throw new Error('ยังไม่มีชื่อแต่ปุ่มกดได้')
    await page.getByTestId('mh-name').fill('ทดสอบ')
    await page.getByTestId('mh-avatar-wizard').click()
    await snap(page, `${name}-create`)
    await noSideScroll(page, 'หน้าสร้างผู้เล่น')
    await page.getByTestId('mh-create').click()
    await page.waitForURL(/#\/map/)
  })

  await step(`[${name}] แผนที่ 2 มิติ: เดิน กระโดด เก็บเหรียญ และถึงอาคารด่าน 0`, async () => {
    await page.getByTestId('mh-world').waitFor()
    await page.getByText('คุณเรียนรู้แล้ว 0 / 12 ด่าน').waitFor()
    await snap(page, `${name}-map`)
    await noSideScroll(page, 'แผนที่')
    const heroX = () =>
      page.getByTestId('mh-hero').evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).m41)
    const before = await heroX()
    if (name === 'desktop') {
      await page.keyboard.down('ArrowRight')
      await page.waitForTimeout(1300)
      await page.keyboard.up('ArrowRight')
      await page.keyboard.press('Space')
    } else {
      const pad = page.getByRole('button', { name: 'เดินขวา' })
      const box = await pad.boundingBox()
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
      await page.mouse.down()
      await page.waitForTimeout(1300)
      await page.mouse.up()
      await page.getByRole('button', { name: 'กระโดด' }).click()
    }
    const after = await heroX()
    if (!(after > before + 200)) throw new Error(`ฮีโร่ไม่เดิน (จาก ${before} ไป ${after})`)
    const coins = await page.getByTestId('mh-coins').innerText()
    if (!/🪙\s*[1-9]/.test(coins)) throw new Error(`เดินผ่านเหรียญแล้วแต่ไม่ได้เหรียญ (${coins})`)
    // แตะอาคารด่าน 0 ฮีโร่ต้องเดินไปเอง แล้วแผงด่านขึ้น
    await page.getByTestId('mh-building-0').evaluate((el) => el.click())
    await page.getByTestId('mh-level-panel').waitFor({ timeout: 8000 })
    await page.getByText('ด่าน 0: เริ่มต้น MONEY HERO').waitFor()
    await snap(page, `${name}-map-near`)
    await page.getByTestId('mh-enter').click()
    await page.getByText('กำลังสร้าง').first().waitFor()
    // รายการด่านสำหรับคนที่ไม่อยากเดิน
    await page.getByTestId('mh-level-list-toggle').click()
    await page.getByTestId('mh-level-card-12').waitFor()
    await noSideScroll(page, 'แผนที่ + รายการด่าน')
  })

  await step(`[${name}] รีเฟรชแล้วผู้เล่นยังอยู่`, async () => {
    await page.reload()
    await page.waitForURL(/#\/map/)
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('moneyHero.save.v1') ?? '{}'))
    const players = Object.values(saved.players ?? {})
    if (players.length !== 1 || players[0].name !== 'ทดสอบ' || players[0].avatar !== 'wizard' || players[0].coins < 1) {
      throw new Error(`ข้อมูลผู้เล่นไม่ถูกต้อง: ${JSON.stringify(players).slice(0, 200)}`)
    }
    await page.goto(`${BASE}#/start`)
    await page.getByText('เล่นต่อ').waitFor()
    await page.getByText('ทดสอบ').first().waitFor()
    await snap(page, `${name}-continue`)
    await noSideScroll(page, 'หน้าเริ่มเกม (ผู้เล่นเดิม)')
  })

  await step(`[${name}] ปุ่มบนหน้าเริ่มเกมไม่มีทางตัน`, async () => {
    for (const label of ['โหมดคุณครู', 'เปลี่ยนผู้เล่น']) {
      await page.goto(`${BASE}#/start`)
      await page.getByText(label).click()
      await page.getByRole('link', { name: 'กลับ' }).first().click()
      await page.getByTestId('mh-start').waitFor()
    }
    await page.getByTestId('mh-sound').click()
    const sound = await page.evaluate(() => JSON.parse(localStorage.getItem('moneyHero.save.v1')).settings.sound)
    if (sound !== false) throw new Error('กดปิดเสียงแล้วค่าไม่ถูกบันทึก')
  })

  await page.context().close()
}

await browser.close()
server.close()

if (errors.length > 0) {
  failed = true
  console.log('\nพบ error บนหน้าเว็บ:')
  for (const e of errors) console.log(`  ${e}`)
}
if (failed) process.exit(1)
console.log('\nMONEY HERO เล่นในเบราว์เซอร์ได้ทั้งหมด')
