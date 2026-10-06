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
// ด่านสุดท้ายที่เปิดให้เล่นในเวอร์ชันนี้ (ตรงกับ PLAYABLE_MAX ใน MapPage.tsx)
const LAST_LEVEL = 12

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


/* ---------------- บอตตอบโจทย์ (อ่านเฉลยจากโจทย์ที่เกมสุ่มมา) ---------------- */

function dotText(v) {
  return `${Math.floor(v / 100).toLocaleString('en-US')}.${String(v % 100).padStart(2, '0')}`
}

async function currentQuestion(page) {
  return page.evaluate(() => window.__MH_DEBUG?.question ?? null)
}

async function answer(page, q, { wrong = false } = {}) {
  const t = (id) => page.getByTestId(id)
  switch (q.kind) {
    case 'choice': {
      const id = wrong ? q.options.find((o) => o.id !== q.answer).id : q.answer
      await t(`mh-opt-${id}`).click()
      return
    }
    case 'amount': {
      const v = wrong ? q.answer + 100 : q.answer
      if (q.input === 'dot') await t('mh-dot').fill(dotText(v))
      else {
        await t('mh-baht').fill(String(Math.floor(v / 100)))
        if (q.input === 'bs') await t('mh-satang').fill(String(v % 100))
      }
      await t('mh-submit').click()
      return
    }
    case 'number':
      await t('mh-number').fill(String(wrong ? q.answer + 1 : q.answer))
      await t('mh-submit').click()
      return
    case 'pay': {
      const combos = q.sample.slice(0, q.mode === 'make' ? q.ways : 1)
      for (const combo of combos) {
        for (const id of wrong ? [...combo, 'b1'].filter((x) => q.tray.includes(x)) : combo) await t(`mh-tray-${id}`).click()
        if (wrong && !combo.length) await t(`mh-tray-${q.tray[0]}`).click()
        await t(q.mode === 'make' ? 'mh-save-way' : 'mh-submit').click()
        if (wrong) return
      }
      return
    }
    case 'match': {
      const ids = q.pairs.map((p) => p.id)
      for (let i = 0; i < ids.length; i += 1) {
        await t(`mh-left-${ids[i]}`).click()
        await t(`mh-right-${wrong ? ids[(i + 1) % ids.length] : ids[i]}`).click()
      }
      await t('mh-submit').click()
      return
    }
    case 'sort': {
      const order = q.items
        .slice()
        .sort((a, b) => (q.order === 'asc' ? a.value - b.value : b.value - a.value))
        .map((it) => it.id)
      for (const id of wrong ? order.slice().reverse() : order) await t(`mh-sort-item-${id}`).click()
      await t('mh-submit').click()
      return
    }
    case 'shop': {
      const picked = q.products.slice(0, q.pick)
      for (const p of picked) await t(`mh-product-${p.id}`).click()
      const total = picked.reduce((sum, p) => sum + p.price, 0) + (wrong ? 100 : 0)
      await t('mh-total-baht').fill(String(Math.floor(total / 100)))
      await t('mh-total-satang').fill(String(total % 100))
      if (q.budget !== undefined) {
        const change = q.budget - total
        await t('mh-change-baht').fill(String(Math.floor(change / 100)))
        await t('mh-change-satang').fill(String(change % 100))
      }
      await t('mh-submit').click()
      return
    }
    case 'word': {
      const words = { '+': 'บวก', '-': 'ลบ', '×': 'คูณ', '÷': 'หาร' }
      for (const stepName of q.steps) {
        if (stepName === 'given') await t(`mh-given-${q.given.answer}`).click()
        if (stepName === 'asked') await t(`mh-asked-${q.asked.answer}`).click()
        if (stepName === 'op') await t(`mh-op-${words[q.op]}`).click()
      }
      const v = wrong ? q.answer + 100 : q.answer
      await t('mh-baht').fill(String(Math.floor(v / 100)))
      await t('mh-satang').fill(String(v % 100))
      await t('mh-submit').click()
      return
    }
    case 'ledger': {
      for (let i = 0; i < q.sheet.rows.length; i += 1) {
        const r = q.sheet.rows[i]
        const text = r.amount % 100 === 0 ? String(r.amount / 100) : dotText(r.amount).replace(/,/g, '')
        const income = (r.type === 'in') !== (wrong && i === 0)
        await t(income ? `mh-in-${i}` : `mh-out-${i}`).fill(text)
      }
      await t('mh-submit').click()
      return
    }
    default:
      throw new Error(`บอตยังไม่รู้จักโจทย์แบบ ${q.kind}`)
  }
}

/** เล่นจนกว่าจะเจอหน้าจบขั้น หรือหน้าผลลัพธ์ */
async function playUntil(page, doneTestId, { makeMistake = false } = {}) {
  let mistakes = makeMistake
  for (let guard = 0; guard < 90; guard += 1) {
    if (await page.getByTestId(doneTestId).isVisible().catch(() => false)) return
    // ด่านสุดท้าย: เดินเข้าแต่ละสถานีของวัน
    const enter = page.getByTestId('mh-journey-enter')
    if (await enter.isVisible().catch(() => false)) {
      await enter.click()
      await page.getByTestId('mh-question').waitFor()
      continue
    }
    const q = await currentQuestion(page)
    if (!q) {
      await page.waitForTimeout(150)
      continue
    }
    const before = q.id
    if (mistakes && q.kind !== 'pay') {
      // ตอบผิดสองครั้ง: ต้องเห็น "ลองคิดอีกครั้ง" แล้วเห็นวิธีคิดทีละขั้น
      mistakes = false
      await answer(page, q, { wrong: true })
      await page.getByText('ลองคิดอีกครั้ง', { exact: true }).waitFor()
      await page.getByTestId('mh-try-again').click()
      await answer(page, q, { wrong: true })
      await page.getByText('มาดูวิธีคิดทีละขั้นกัน', { exact: true }).waitFor()
      await page.getByText('เดี๋ยวจะมีข้อแบบเดียวกันให้ฝึกอีกครั้ง').waitFor()
    } else {
      await answer(page, q)
      const fb = page.getByTestId('mh-feedback')
      await fb.waitFor()
      const text = await fb.innerText()
      if (!/✔/.test(text)) throw new Error(`ตอบตามเฉลยแล้วไม่ถูก (${q.gen}): ${text.slice(0, 160)}`)
    }
    await page.getByTestId('mh-next').click()
    await page.waitForFunction((id) => window.__MH_DEBUG?.question?.id !== id, before, { timeout: 5000 }).catch(() => undefined)
  }
  throw new Error(`เล่นเกิน 90 ข้อแล้วยังไม่จบ (${doneTestId})`)
}

async function playLevel(page, id, { makeMistake = false, label = '' } = {}) {
  await page.waitForURL(new RegExp(`#/level/${id}/learn`))
  for (let i = 0; i < 10; i += 1) {
    if (await page.getByTestId('mh-learn-done').isVisible().catch(() => false)) break
    await page.getByTestId('mh-learn-next').click()
  }
  await snap(page, `${label}level${id}-learn`)
  await page.getByTestId('mh-learn-done').click()
  await page.waitForURL(new RegExp(`#/level/${id}/practice`))
  await page.getByTestId('mh-question').waitFor()
  await snap(page, `${label}level${id}-practice`)
  await playUntil(page, 'mh-step-done', { makeMistake })
  await page.getByTestId('mh-next-step').click()
  await page.waitForURL(new RegExp(`#/level/${id}/mission`))
  await playUntil(page, 'mh-step-done')
  await page.getByTestId('mh-next-step').click()
  await page.waitForURL(new RegExp(`#/level/${id}/boss`))
  await playUntil(page, 'mh-result')
  await page.getByText('MISSION COMPLETE!').waitFor()
  await snap(page, `${label}level${id}-result`)
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

  await step(`[${name}] แผนที่ 2 มิติแบบมองจากด้านบน: แตะอาคารเดินตามถนน เก็บเหรียญ และเดินเองได้`, async () => {
    await page.getByTestId('mh-world').waitFor()
    await page.getByText('คุณเรียนรู้แล้ว 0 / 12 ด่าน').waitFor()
    await snap(page, `${name}-map`)
    await noSideScroll(page, 'แผนที่')
    const heroPos = () =>
      page.getByTestId('mh-hero').evaluate((el) => {
        const m = new DOMMatrix(getComputedStyle(el).transform)
        return { x: m.m41, y: m.m42 }
      })
    const before = await heroPos()
    // แตะอาคารด่าน 1: ฮีโร่ต้องเดินตามถนนข้ามสะพานไปเอง
    await page.getByTestId('mh-building-1').evaluate((el) => el.click())
    await page.getByText('ด่าน 1: ธนาคารแห่งเมืองเงินทอง').waitFor({ timeout: 12000 })
    const atBank = await heroPos()
    if (!(Math.hypot(atBank.x - before.x, atBank.y - before.y) > 300)) throw new Error(`ฮีโร่ไม่เดินไปที่อาคาร (${JSON.stringify(before)} → ${JSON.stringify(atBank)})`)
    const coins = await page.getByTestId('mh-coins').innerText()
    if (!/🪙\s*[1-9]/.test(coins)) throw new Error(`เดินผ่านเหรียญแล้วแต่ไม่ได้เหรียญ (${coins})`)
    await snap(page, `${name}-map-bank`)
    // เดินเองบนถนน (ไปทางซ้าย)
    if (name === 'desktop') {
      await page.keyboard.down('ArrowLeft')
      await page.waitForTimeout(700)
      await page.keyboard.up('ArrowLeft')
    } else {
      const joy = await page.getByTestId('mh-joystick').boundingBox()
      await page.mouse.move(joy.x + joy.width / 2, joy.y + joy.height / 2)
      await page.mouse.down()
      await page.mouse.move(joy.x + joy.width / 2 - 40, joy.y + joy.height / 2, { steps: 4 })
      await page.waitForTimeout(700)
      await page.mouse.up()
    }
    const walked = await heroPos()
    if (!(walked.x < atBank.x - 80)) throw new Error(`เดินเองไม่ได้ (${atBank.x} → ${walked.x})`)
    // แตะค่ายด่าน 0 แล้วแผงเข้าด่านต้องขึ้น
    await page.getByTestId('mh-building-0').evaluate((el) => el.click())
    await page.getByTestId('mh-level-panel').waitFor({ timeout: 12000 })
    await page.getByText('ด่าน 0: เริ่มต้น MONEY HERO').waitFor()
    await snap(page, `${name}-map-near`)
    // รายการด่านสำหรับคนที่ไม่อยากเดิน
    await page.getByTestId('mh-level-list-toggle').click()
    await page.getByTestId('mh-level-card-12').waitFor()
    await noSideScroll(page, 'แผนที่ + รายการด่าน')
    // ด่านที่ยังล็อกต้องเข้าไม่ได้
    await page.getByTestId('mh-level-card-3').click()
    await page.getByText('ผ่านด่าน 2 ก่อน').waitFor()
    await page.getByTestId('mh-enter').click()
    await page.waitForURL(/#\/level\/0\/learn/)
    await page.goto(`${BASE}#/map`)
    await page.getByTestId('mh-world').waitFor()
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

  await step(`[${name}] เล่นด่าน 0 ครบ 4 ขั้น (ตอบผิดก่อนหนึ่งข้อ) ใช้ตัวช่วย และได้ดาว`, async () => {
    await page.goto(`${BASE}#/map`)
    await page.getByTestId('mh-level-list-toggle').click()
    await page.getByTestId('mh-level-card-0').click()
    await page.waitForURL(/#\/level\/0\/learn/)
    // ข้ามขั้นไม่ได้: เปิด BOSS ตรง ๆ ต้องถูกพากลับ LEARN
    await page.goto(`${BASE}#/level/0/boss`)
    await page.waitForURL(/#\/level\/0\/learn/)
    await page.getByTestId('mh-learn-next').waitFor()
    await playLevel(page, 0, { makeMistake: true, label: `${name}-` })
    await noSideScroll(page, 'หน้าผลลัพธ์')
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('moneyHero.save.v1')))
    const p = Object.values(saved.players)[0]
    if (p.levels[0].stepDone !== 4) throw new Error('ผ่านด่าน 0 แล้วแต่ไม่ได้บันทึก')
    if (!(p.levels[0].bestStars >= 1)) throw new Error('ผ่านด่านแล้วไม่ได้ดาว')
    if (!(p.exp > 0)) throw new Error('ไม่ได้ EXP')
    if (p.mistakes.length < 1) throw new Error('ข้อที่ตอบผิดไม่ถูกบันทึก')
  })

  if (name === 'desktop') {
    await step(`[${name}] เล่นต่อด่าน 1–${LAST_LEVEL} จนจบทุกด่าน`, async () => {
      for (let id = 1; id <= LAST_LEVEL; id += 1) {
        await page.getByTestId('mh-next-level').click()
        await playLevel(page, id)
      }
      if (LAST_LEVEL === 12) {
        await page.getByTestId('mh-master').waitFor()
        await page.getByText('คุณผ่านเนื้อหาเรื่องเงินครบทุกหัวข้อแล้ว').waitFor()
        await snap(page, `${name}-money-master`)
      }
      await page.getByTestId('mh-back-map').click()
      const passedText = `คุณเรียนรู้แล้ว ${LAST_LEVEL} / 12 ด่าน`
      await page.getByText(passedText).waitFor()
      await page.reload()
      await page.getByText(passedText).waitFor()
      await snap(page, `${name}-map-after-all`)
    })
  }

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
