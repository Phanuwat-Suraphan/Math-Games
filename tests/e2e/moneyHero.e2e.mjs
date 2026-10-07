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

// กล้องจำลองของ Chromium (ภาพทดสอบ) และอนุญาตกล้องอัตโนมัติ ใช้ทดสอบโหมด AR ด้วยกล้อง
const browser = await chromium.launch({ args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'] })
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

/** ทำแบบทดสอบ (ไม่มีการบอกถูกผิด ตอบแล้วไปข้อต่อไปทันที) ตอบผิด wrongFirst ข้อแรก */
async function playTest(page, wrongFirst = 0) {
  for (let i = 0; i < 40; i += 1) {
    if (await page.getByTestId('mh-test-result').isVisible().catch(() => false)) return
    const q = await currentQuestion(page)
    if (!q) {
      await page.waitForTimeout(150)
      continue
    }
    await answer(page, q, { wrong: i < wrongFirst && q.kind !== 'pay' })
    await page.waitForFunction((id) => window.__MH_DEBUG?.question?.id !== id, q.id, { timeout: 5000 }).catch(() => undefined)
  }
  throw new Error('ทำแบบทดสอบเกิน 40 ข้อแล้วยังไม่จบ')
}

async function savedPlayer(page) {
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('moneyHero.save.v1')))
  return Object.values(saved.players)[0]
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
    await page.getByRole('heading', { name: /MONEY HERO/ }).waitFor()
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
      await page.getByTestId('mh-joystick').scrollIntoViewIfNeeded()
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

  await step(`[${name}] แบบทดสอบก่อนเรียน: ป้ายบนแผนที่ → ทำครบ 18 ข้อ → เห็นคะแนนรายทักษะ`, async () => {
    await page.goto(`${BASE}#/map`)
    await page.getByTestId('mh-pretest-banner').click()
    await page.waitForURL(/#\/test\/pre/)
    await page.getByTestId('mh-test-intro').waitFor()
    await snap(page, `${name}-pretest-intro`)
    await noSideScroll(page, 'หน้าแบบทดสอบ')
    await page.getByTestId('mh-test-start').click()
    await page.getByTestId('mh-question').waitFor()
    // ระหว่างทำต้องไม่มีปุ่มตัวช่วย
    if (await page.getByTestId('mh-hint-btn').isVisible().catch(() => false)) throw new Error('แบบทดสอบมีปุ่มตัวช่วย')
    await playTest(page, 6)
    await page.getByTestId('mh-skill-bars').waitFor()
    await snap(page, `${name}-pretest-result`)
    await noSideScroll(page, 'ผลแบบทดสอบ')
    const p = await savedPlayer(page)
    if (!p.preTest || p.preTest.total !== 18) throw new Error(`ผลก่อนเรียนไม่ถูกบันทึก: ${JSON.stringify(p.preTest)?.slice(0, 120)}`)
    if (!(p.preTest.score <= 12)) throw new Error(`ตอบผิด 6 ข้อแต่ได้ ${p.preTest.score}`)
    if (!p.badges.includes('pretest')) throw new Error('ไม่ได้ตรานักสำรวจพลัง')
    await page.getByTestId('mh-test-to-map').click()
    await page.getByTestId('mh-world').waitFor()
    if (await page.getByTestId('mh-pretest-banner').isVisible().catch(() => false)) throw new Error('ทำแล้วป้ายยังอยู่')
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

  await step(`[${name}] ฝึกข้อที่เคยผิด: เมนูบนแผนที่ → สถิติ → ฝึกจนถูก แล้วข้อนั้นหายจากรายการ`, async () => {
    await page.goto(`${BASE}#/map`)
    await page.getByTestId('mh-menu-review').waitFor()
    await page.goto(`${BASE}#/stats`)
    await page.getByTestId('mh-skill-bars').waitFor()
    await snap(page, `${name}-stats`)
    await noSideScroll(page, 'หน้าสถิติ')
    await page.getByTestId('mh-review-go').click()
    await page.waitForURL(/#\/review/)
    await page.getByTestId('mh-question').waitFor()
    await playUntil(page, 'mh-review-done')
    await snap(page, `${name}-review-done`)
    const p = await savedPlayer(page)
    if (!p.mistakes.every((m) => m.fixed)) throw new Error('ฝึกถูกแล้วแต่ยังไม่ถูกนับว่าแก้ได้')
  })

  if (name === 'desktop') {
    await step(`[${name}] เล่นต่อด่าน 1–${LAST_LEVEL} จนจบทุกด่าน`, async () => {
      for (let id = 1; id <= LAST_LEVEL; id += 1) {
        if (id === 1) await page.goto(`${BASE}#/level/1/learn`)
        else await page.getByTestId('mh-next-level').click()
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

    await step(`[${name}] แบบทดสอบหลังเรียน: เปิดหลังผ่านด่าน 12 และเห็นกราฟก่อน → หลังเรียน`, async () => {
      await page.getByTestId('mh-posttest-banner').click()
      await page.getByTestId('mh-test-start').click()
      await playTest(page, 0)
      await page.getByTestId('mh-before-after').waitFor()
      await snap(page, `${name}-posttest-result`)
      const p = await savedPlayer(page)
      if (!p.postTest || p.postTest.total !== 20 || p.postTest.score !== 20) throw new Error(`ผลหลังเรียนผิด: ${JSON.stringify(p.postTest)?.slice(0, 120)}`)
      for (const b of ['posttest', 'improver']) if (!p.badges.includes(b)) throw new Error(`ไม่ได้ตรา ${b}`)
    })
  }

  await step(`[${name}] ล่าเหรียญ AR (เล่นแบบไม่ใช้กล้อง): เก็บเงินพอดีครบ 5 รอบ`, async () => {
    await page.goto(`${BASE}#/map`)
    await page.getByTestId('mh-menu-ar').click()
    await page.getByTestId('mh-ar-intro').waitFor()
    await snap(page, `${name}-ar-intro`)
    await noSideScroll(page, 'หน้าล่าเหรียญ')
    await page.getByTestId('mh-ar-play').click()
    for (let r = 0; r < 5; r += 1) {
      await page.getByTestId('mh-ar-target').waitFor()
      const info = await page.evaluate(() => window.__MH_AR)
      if (!info || info.round !== r) throw new Error(`ข้อมูลรอบไม่ตรง: ${JSON.stringify(info)}`)
      if (r === 0) {
        // ตรวจก่อนเก็บครบ ต้องบอกว่ายังขาด
        await page.getByTestId(`mh-ar-coin-${info.solution[0]}`).evaluate((el) => el.click())
        await page.getByTestId('mh-ar-check').click()
        await page.getByTestId('mh-ar-wrong').waitFor()
        for (const k of info.solution.slice(1)) await page.getByTestId(`mh-ar-coin-${k}`).evaluate((el) => el.click())
      } else {
        for (const k of info.solution) await page.getByTestId(`mh-ar-coin-${k}`).evaluate((el) => el.click())
      }
      if (r === 2) await snap(page, `${name}-ar-play`)
      await page.getByTestId('mh-ar-check').click()
      await page.getByTestId('mh-ar-right').waitFor()
      await page.getByTestId('mh-ar-next').click()
    }
    await page.getByTestId('mh-ar-done').waitFor()
    await snap(page, `${name}-ar-done`)
    await noSideScroll(page, 'ผลล่าเหรียญ')
    const p = await savedPlayer(page)
    if (!p.badges.includes('ar-hunter')) throw new Error('ไม่ได้ตรานักล่าเหรียญ AR')
  })

  await step(`[${name}] ล่าเหรียญ AR ด้วยกล้อง: จีบนิ้วเก็บเหรียญและกดปุ่มตรวจได้ โหลดตัวตรวจจับมือไม่ได้ก็ยังเล่นต่อได้`, async () => {
    // ตัดการโหลดโมเดลจาก CDN ให้ผลแน่นอน (บอตไม่มีมือจริงให้กล้องเห็นอยู่แล้ว)
    const cdn = /cdn\.jsdelivr\.net|unpkg\.com|storage\.googleapis\.com/
    await page.route(cdn, (r) => r.abort())
    try {
      // ขั้นก่อนจบที่หน้าผลของ AR (#/ar) ต้องออกไปแผนที่ก่อน หน้าจะได้เริ่มใหม่
      await page.goto(`${BASE}#/map`)
      await page.getByTestId('mh-menu-ar').click()
      await page.getByTestId('mh-ar-camera').click()
      await page.waitForFunction(() => (document.querySelector('video.mh-ar-video')?.videoWidth ?? 0) > 0, null, { timeout: 15_000 })
      await page.waitForFunction(() => document.querySelector('[data-testid="mh-ar-hand"]')?.getAttribute('data-state') === 'error', null, { timeout: 30_000 })
      await page.getByTestId('mh-ar-hand').getByText('แตะจอแทนได้').waitFor()
      // จีบนิ้ว (จำลองที่ตำแหน่งบนจอ) ตรงเหรียญชุดคำตอบ แล้วจีบปุ่มตรวจ
      const info = await page.evaluate(() => window.__MH_AR)
      const pinchOn = async (testId, dx = 0) => {
        const box = await page.getByTestId(testId).boundingBox()
        if (!box) throw new Error(`มองไม่เห็น ${testId}`)
        const ok = await page.evaluate(([x, y]) => window.__MH_PINCH?.(x, y) ?? false, [box.x + box.width / 2 + dx, box.y + box.height / 2])
        if (!ok) throw new Error(`จีบนิ้วตรง ${testId} แล้วไม่ได้เลือก`)
      }
      for (const [i, k] of info.solution.entries()) await pinchOn(`mh-ar-coin-${k}`, i === 0 ? 4 : 0)
      await snap(page, `${name}-ar-camera`)
      await pinchOn('mh-ar-check')
      await page.getByTestId('mh-ar-right').waitFor()
      // จีบตรงที่ว่างไกลจากทุกอย่าง ต้องไม่เลือกอะไร
      const empty = await page.evaluate(() => window.__MH_PINCH?.(2, 2) ?? true)
      if (empty) throw new Error('จีบตรงที่ว่างแล้วกลับไปเลือกบางอย่าง')
      await pinchOn('mh-ar-next')
      await page.getByTestId('mh-ar-round').getByText('รอบ 2/5').waitFor()
      await page.goto(`${BASE}#/map`)
      // ออกจากหน้า AR แล้วกล้องต้องปิด
      const live = await page.evaluate(() => document.querySelectorAll('video').length)
      if (live !== 0) throw new Error('ออกจากหน้า AR แล้วยังมีวิดีโอกล้องค้างอยู่')
    } finally {
      await page.unroute(cdn)
    }
  })

  await step(`[${name}] ภารกิจประจำวัน: ทำ 5 ข้อ ได้ตราประทับวันนี้ และป้ายบนแผนที่หายไป`, async () => {
    await page.goto(`${BASE}#/map`)
    await page.getByTestId('mh-daily-banner').click()
    await page.getByTestId('mh-daily-intro').waitFor()
    await noSideScroll(page, 'ภารกิจประจำวัน')
    await page.getByTestId('mh-daily-start').click()
    await page.getByTestId('mh-question').waitFor()
    await playUntil(page, 'mh-daily-done')
    await page.getByTestId('mh-daily-streak').getByText('1').waitFor()
    await snap(page, `${name}-daily`)
    const p = await savedPlayer(page)
    if (p.daily.streak !== 1 || !p.daily.last) throw new Error(`ไม่ได้บันทึกภารกิจประจำวัน: ${JSON.stringify(p.daily)}`)
    await page.getByTestId('mh-daily-to-map').click()
    await page.getByTestId('mh-world').waitFor()
    if (await page.getByTestId('mh-daily-banner').isVisible().catch(() => false)) throw new Error('ทำแล้วป้ายยังอยู่')
  })

  await step(`[${name}] ภารกิจจากเพื่อนในเมือง: แตะลุงหมี รับภารกิจ ตอบถูก ได้เหรียญ`, async () => {
    await page.goto(`${BASE}#/map`)
    await page.getByTestId('mh-world').waitFor()
    const before = (await savedPlayer(page)).coins
    await page.getByTestId('mh-npc-bear').evaluate((el) => el.click())
    await page.getByTestId('mh-quest-accept').click()
    await page.getByTestId('mh-quest').waitFor()
    await page.getByTestId('mh-question').waitFor()
    await snap(page, `${name}-quest`)
    await playUntil(page, 'mh-quest-done')
    await page.getByText('ขอบใจมากนะ').waitFor()
    await page.getByTestId('mh-quest-close').click()
    const p = await savedPlayer(page)
    // ได้รางวัลภารกิจ 8 เหรียญ บวกเหรียญปกติของการตอบถูกอีกเล็กน้อย
    if (p.coins < before + 8 || p.questsDone !== 1) throw new Error(`รางวัลภารกิจไม่ถูก (${before} → ${p.coins}, ${p.questsDone})`)
    // ทำแล้ววันนี้ แตะอีกครั้งต้องได้เคล็ดลับแทน
    await page.getByTestId('mh-npc-bear').evaluate((el) => el.click())
    if (await page.getByTestId('mh-quest-accept').isVisible().catch(() => false)) throw new Error('ทำแล้วยังรับภารกิจซ้ำได้')
  })

  await step(`[${name}] โต๊ะนับเงิน: วางเงิน เห็นยอดรวม แล้วแลกให้น้อยชิ้นที่สุด`, async () => {
    await page.goto(`${BASE}#/map`)
    await page.getByTestId('mh-menu-sandbox').click()
    for (const id of ['b10', 'b10', 'b5', 'b5', 's50', 's50']) await page.getByTestId(`mh-sandbox-add-${id}`).click()
    await page.getByTestId('mh-sandbox-total').getByText('31 บาท').first().waitFor()
    await page.getByTestId('mh-sandbox-tidy').click()
    await page.getByText('จาก 6 ชิ้น เหลือ 3 ชิ้น').waitFor()
    await snap(page, `${name}-sandbox`)
    await noSideScroll(page, 'โต๊ะนับเงิน')
  })

  await step(`[${name}] ร้านของฮีโร่: ซื้อดอกไม้ติดผมและลูกเจี๊ยบ แล้วลูกเจี๊ยบเดินตามบนแผนที่`, async () => {
    await page.goto(`${BASE}#/map`)
    await page.getByTestId('mh-menu-shop').click()
    await page.getByTestId('mh-shop-wallet').waitFor()
    await noSideScroll(page, 'ร้านของฮีโร่')
    const before = (await savedPlayer(page)).coins
    await page.getByTestId('mh-buy-hat-flower').click()
    await page.getByTestId('mh-wear-hat-flower').waitFor()
    await page.getByTestId('mh-shop-tab-pet').click()
    await page.getByTestId('mh-buy-pet-chick').click()
    await page.getByTestId('mh-wear-pet-chick').waitFor()
    await page.getByText('เหลือ').first().waitFor()
    await snap(page, `${name}-shop`)
    const p = await savedPlayer(page)
    if (p.coins !== before - 40) throw new Error(`เหรียญไม่ถูกตัด (${before} → ${p.coins})`)
    if (p.wear.hat !== 'hat-flower' || p.wear.pet !== 'pet-chick') throw new Error(`ไม่ได้สวม: ${JSON.stringify(p.wear)}`)
    await page.goto(`${BASE}#/map`)
    await page.getByTestId('mh-pet').waitFor()
    await snap(page, `${name}-map-pet`)
  })

  await step(`[${name}] กระปุกออมสิน: สมุดบัญชีตรงกับเหรียญ ตั้งเป้าหมาย ออมจนซื้อได้ และนกฮูกถามจากสมุด`, async () => {
    await page.goto(`${BASE}#/map`)
    await page.getByTestId('mh-menu-bank').click()
    await page.getByTestId('mh-bank-balance').waitFor()
    await noSideScroll(page, 'กระปุกออมสิน')
    let p = await savedPlayer(page)
    // ทุกเหรียญที่ได้และจ่ายตั้งแต่สร้างผู้เล่น ต้องลงสมุดครบ ผลรวมสมุดจึงเท่ากับเหรียญที่มี
    const sum = p.ledger.reduce((a, e) => a + e.amount, 0)
    if (sum !== p.coins) throw new Error(`สมุดบัญชีไม่ครบ: ผลรวม ${sum} แต่มี ${p.coins} เหรียญ`)
    if (!p.ledger.some((e) => e.amount < 0)) throw new Error('การซื้อของในร้านไม่ลงสมุดเป็นรายจ่าย')
    await page.getByTestId('mh-ledger-eq').getByText(`คงเหลือ ${p.coins}`).waitFor()
    const rows = await page.getByTestId('mh-ledger-row').count()
    if (rows < 1) throw new Error('สมุดบัญชีไม่มีรายการ')
    await page.getByTestId('mh-piggy').click()

    // ตั้งเป้าหมายเป็นของแพง แล้วต้องบอกว่าขาดอีกเท่าไรถูกต้อง
    await page.getByTestId('mh-goal-pet-unicorn').click()
    const need = Math.max(0, 200 - p.coins)
    await page.getByTestId('mh-goal-text').getByText(need > 0 ? `ขาดอีก ${need} เหรียญ` : 'เก็บครบแล้ว').first().waitFor()
    await snap(page, `${name}-bank`)

    // นกฮูกถามจากสมุด: เลือกคำตอบที่ถูก (คำนวณจากสมุดเอง)
    await page.getByTestId('mh-ledger-ask').click()
    const text = await page.locator('.mh-ledger-quiz .mh-bubble').innerText()
    const m = text.match(/มีอยู่ (\d+) เหรียญ แล้ว(ได้รับ|จ่ายไป) (\d+) เหรียญ/)
    if (!m) throw new Error(`อ่านคำถามนกฮูกไม่ได้: ${text}`)
    const right = m[2] === 'ได้รับ' ? Number(m[1]) + Number(m[3]) : Number(m[1]) - Number(m[3])
    await page.getByTestId('mh-ledger-choice').filter({ hasText: new RegExp(`^${right} เหรียญ$`) }).click()
    await page.getByTestId('mh-ledger-explain').getByText('ถูกต้อง').waitFor()

    // เปลี่ยนเป้าเป็นหมวกแก๊ป (15 เหรียญ) ออมครบแล้วไปซื้อที่ร้าน → ได้ตรานักออม
    p = await savedPlayer(page)
    if (p.coins >= 15) {
      await page.getByRole('button', { name: 'เปลี่ยนเป้าหมาย' }).click()
      await page.getByTestId('mh-goal-hat-cap').click()
      await page.getByTestId('mh-goal-shop').click()
      await page.getByTestId('mh-buy-hat-cap').click()
      await page.getByTestId('mh-wear-hat-cap').waitFor()
      p = await savedPlayer(page)
      if (p.goalsDone !== 1 || p.goal) throw new Error(`ออมครบแล้วซื้อ แต่ไม่นับว่าสำเร็จ (${p.goalsDone}, ${p.goal})`)
      if (!p.badges.includes('saver')) throw new Error('ไม่ได้ตรานักออม')
    }
  })

  await step(`[${name}] กาดรักษ์โลกในเกม: ทำกระถาง คัดแยกขยะ ขายขยะ ซื้ออุปกรณ์ ทำสินค้า ขาย ทอนเงิน คิดกำไร และแบ่งกำไร`, async () => {
    await page.goto(`${BASE}#/map`)
    // ขยะของวันนี้วางอยู่บนถนน 6 ชิ้น
    const onStreet = await page.locator('[data-testid^="mh-trash-"]').count()
    if (onStreet < 1 || onStreet > 6) throw new Error(`ขยะบนถนนผิดจำนวน (${onStreet})`)
    // แตะแผงกาด: ฮีโร่เดินตามถนนไปเอง แล้วเปิดร้าน
    await page.getByTestId('mh-eco-stall').evaluate((el) => el.click())
    await page.getByTestId('mh-eco-panel').waitFor({ timeout: 40_000 })
    await snap(page, `${name}-map-eco`)
    await page.getByTestId('mh-eco-enter').click()
    await page.getByTestId('eco-choose').waitFor()
    await page.getByTestId('eco-bag').waitFor()
    await noSideScroll(page, 'กาดรักษ์โลกในเกม')
    const before = await savedPlayer(page)
    await page.getByTestId('eco-recipe-pot').click()
    await page.getByTestId('eco-sort').waitFor()
    const items = page.locator('[data-testid^="eco-trash-"]')
    const total = await items.count()
    // ใส่ผิดถังก่อนหนึ่งครั้ง ต้องไม่นับ
    const firstBin = await items.first().getAttribute('data-bin')
    await items.first().click()
    await page.getByTestId(`eco-bin-${['plastic', 'metal', 'paper'].find((b) => b !== firstBin)}`).click()
    if ((await items.count()) !== total) throw new Error('ใส่ผิดถังแล้วขยะหายไป')
    for (let guard = 0; guard < 40 && (await items.count()) > 0; guard += 1) {
      const bin = await items.first().getAttribute('data-bin')
      await items.first().click()
      await page.getByTestId(`eco-bin-${bin}`).click()
    }
    if ((await items.count()) !== 0) throw new Error('คัดแยกไม่หมด')
    await snap(page, `${name}-eco-sort`)
    await page.getByTestId('eco-to-sell').click()
    // ขายขยะ + ซื้ออุปกรณ์ (โจทย์ 3 ข้อ)
    await playUntil(page, 'eco-make')
    for (let i = 0; i < 3; i += 1) await page.getByTestId(`eco-make-${i}`).click()
    await page.getByTestId('eco-to-price').click()
    await noSideScroll(page, 'ตั้งราคา')
    // ราคาถูกสุดขายหมด 2 ใบ: รายได้ 30 ต้นทุน 11 กำไร 19
    await page.getByTestId('eco-price-15').click()
    await page.getByTestId('eco-market').waitFor()
    await snap(page, `${name}-eco-market`)
    await playUntil(page, 'eco-share')
    for (let i = 0; i < 4; i += 1) await page.getByTestId('eco-alloc-save-plus').click()
    await page.getByTestId('eco-alloc-donate-rest').click()
    await page.getByTestId('eco-share-left').getByText('0 บาท').waitFor()
    await page.getByTestId('eco-share-done').click()
    await page.getByTestId('eco-done').waitFor()
    await snap(page, `${name}-eco-done`)
    await noSideScroll(page, 'สรุปกาดรักษ์โลก')
    const p = await savedPlayer(page)
    if (p.eco.days !== before.eco.days + 1) throw new Error(`จำนวนวันไม่เพิ่ม (${p.eco.days})`)
    if (p.eco.sales !== before.eco.sales + 3000) throw new Error(`ยอดขายไม่ถูก (${p.eco.sales})`)
    if (p.eco.saved !== before.eco.saved + 400 || p.eco.donated !== before.eco.donated + 1500) throw new Error(`แบ่งกำไรไม่ถูก ${JSON.stringify(p.eco)}`)
    if (!p.badges.includes('eco-seller')) throw new Error('ไม่ได้ตราพ่อค้าแม่ค้ารักษ์โลก')
    if (!p.ledger.some((e) => e.label === 'ออมจากกาดรักษ์โลก' && e.amount === 4)) throw new Error('เงินออมไม่ลงกระปุก/สมุดบัญชี')
    const sum = p.ledger.reduce((a, e) => a + e.amount, 0)
    if (sum !== p.coins) throw new Error(`สมุดบัญชีไม่ครบหลังเล่นกาด: ${sum} ≠ ${p.coins}`)
  })

  await step(`[${name}] ร้านทอนไว (โหมดฝึก): ทอนผิดต้องบอกว่าเกิน แล้วทอนถูกครบ 8 ลูกค้า`, async () => {
    await page.goto(`${BASE}#/map`)
    await page.getByTestId('mh-menu-change').click()
    await page.getByTestId('change-intro').waitFor()
    await noSideScroll(page, 'ร้านทอนไว')
    const coinsBefore = (await savedPlayer(page)).coins
    await page.getByTestId('change-practice').click()
    // ทอนเกินด้วยแบงก์ 100 (เงินทอนน้อยกว่า 100 เสมอ)
    await page.getByTestId('change-tray-b100').click()
    await page.getByTestId('change-give').click()
    await page.getByTestId('change-wrong').getByText('ทอนเกิน').waitFor()
    await page.getByRole('button', { name: '↺ ล้าง' }).click()
    for (let k = 0; k < 8; k += 1) {
      const info = await page.evaluate(() => window.__MH_CHANGE)
      if (!info || info.served !== k) throw new Error(`ข้อมูลลูกค้าไม่ตรง: ${JSON.stringify(info)}`)
      for (const id of info.solution) await page.getByTestId(`change-tray-${id}`).click()
      if (k === 2) await snap(page, `${name}-change-play`)
      await page.getByTestId('change-give').click()
      await page.getByTestId('change-right').waitFor()
      if (k < 7) await page.waitForFunction((n) => window.__MH_CHANGE?.served === n && !document.querySelector('[data-testid="change-right"]'), k + 1)
    }
    await page.getByTestId('change-done').waitFor()
    await snap(page, `${name}-change-done`)
    await noSideScroll(page, 'ผลร้านทอนไว')
    const p = await savedPlayer(page)
    if (p.coins !== coinsBefore + 8) throw new Error(`รางวัลร้านทอนไวไม่ถูก (${coinsBefore} → ${p.coins})`)
    if (!p.ledger.some((e) => e.label === 'ร้านทอนไว')) throw new Error('รางวัลร้านทอนไวไม่ลงสมุดบัญชี')
  })

  await step(`[${name}] หน้าตรา โปรไฟล์ และแผงคุณครู (ดาวน์โหลด CSV ได้)`, async () => {
    await page.goto(`${BASE}#/badges`)
    await page.getByTestId('mh-badge-pretest').waitFor()
    if (!(await page.getByTestId('mh-badge-pretest').getAttribute('class')).includes('is-earned')) throw new Error('ตราที่ได้แล้วไม่แสดงว่าได้')
    await snap(page, `${name}-badges`)
    await noSideScroll(page, 'หน้าตรา')
    await page.goto(`${BASE}#/profile`)
    await page.getByTestId('mh-profile').waitFor()
    await snap(page, `${name}-profile`)
    await noSideScroll(page, 'หน้าโปรไฟล์')
    await page.goto(`${BASE}#/teacher`)
    await page.getByTestId('mh-teacher-table').waitFor()
    await page.getByRole('button', { name: 'ทดสอบ' }).click()
    await page.getByTestId('mh-student-detail').waitFor()
    // เล่นกาดมาแล้วหนึ่งวัน (ขายกระถาง 30 บาท) ต้องเห็นในรายละเอียดนักเรียน
    await page.getByTestId('mh-student-eco').getByText('ยอดขายสะสม 30 บาท').waitFor()
    await snap(page, `${name}-teacher`)
    await noSideScroll(page, 'แผงคุณครู')
    const [download] = await Promise.all([page.waitForEvent('download'), page.getByTestId('mh-csv').click()])
    const csv = fs.readFileSync(await download.path(), 'utf8')
    if (csv.charCodeAt(0) !== 0xfeff || !csv.includes('ทดสอบ') || !csv.includes('Pre-test')) throw new Error(`ไฟล์ CSV ไม่ถูกต้อง: ${csv.slice(0, 80)}`)
  })

  await step(`[${name}] กาดรักษ์โลก: สื่อพิมพ์ครบ 8 ชุด ไม่มีเนื้อหาล้นแผ่น และพิมพ์ได้แผ่นละหนึ่งหน้า A4`, async () => {
    await page.goto(`${BASE}#/teacher`)
    await page.getByTestId('mh-teacher-kad').click()
    await page.getByTestId('kad-page').waitFor()
    const expected = { poster: 2, trash: 1, money: 4, bank: 4, products: 2, shops: 6, docs: 10, missions: 3 }
    for (const [id, n] of Object.entries(expected)) {
      await page.getByTestId(`kad-tab-${id}`).click()
      const count = await page.locator('.kad-sheet').count()
      if (count !== n) throw new Error(`ชุด ${id} มี ${count} แผ่น ควรมี ${n}`)
      await noSideScroll(page, `กาดรักษ์โลก ${id}`)
      if (name !== 'desktop') continue
      // ทุกแผ่นต้องจบในกระดาษ ไม่มีอะไรล้นจนถูกตัดตอนพิมพ์
      const spill = await page.evaluate(() =>
        [...document.querySelectorAll('.kad-sheet-in')].map((el, i) => (el.scrollHeight > el.clientHeight + 2 || el.scrollWidth > el.clientWidth + 2 ? i + 1 : 0)).filter(Boolean),
      )
      if (spill.length > 0) throw new Error(`ชุด ${id} แผ่นที่ ${spill.join(', ')} เนื้อหาล้นกระดาษ`)
      await page.locator('.kad-sheet').first().screenshot({ path: path.join(SHOTS, `money-hero-kad-${id}.png`) })
    }
    // คลังภาพ: ดาวน์โหลดภาพเป็น PNG และ SVG ได้จริง
    await page.getByTestId('kad-tab-library').click()
    await page.getByTestId('kad-library').waitFor()
    await noSideScroll(page, 'คลังภาพกาดรักษ์โลก')
    for (const kind of ['png', 'svg']) {
      const [download] = await Promise.all([page.waitForEvent('download'), page.getByTestId(`kad-${kind}-money-note-2000`).click()])
      const file = download.suggestedFilename()
      if (file !== `kad-money-note-2000.${kind}`) throw new Error(`ชื่อไฟล์ภาพไม่ถูก: ${file}`)
      const size = fs.statSync(await download.path()).size
      if (size < 2000) throw new Error(`ไฟล์ภาพ ${file} เล็กผิดปกติ (${size} ไบต์)`)
    }
    if (name === 'desktop') {
      for (const [id, n] of [
        ['docs', 10],
        ['shops', 6],
      ]) {
        await page.getByTestId(`kad-tab-${id}`).click()
        const pdf = await page.pdf({ preferCSSPageSize: true, printBackground: true })
        const pages = (pdf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) ?? []).length
        if (pages !== n) throw new Error(`พิมพ์ชุด ${id} ได้ ${pages} หน้า ควรได้ ${n}`)
      }
    }
  })

  await step(`[${name}] แดชบอร์ดตลาดนัด: จดเงินกลุ่ม คิดกำไร ต้นไม้ของห้องโต และคิดเงินทอน`, async () => {
    await page.goto(`${BASE}#/kad`)
    await page.getByTestId('kad-to-class').click()
    await page.getByTestId('kad-class-page').waitFor()
    await noSideScroll(page, 'แดชบอร์ดตลาดนัด')
    // กลุ่ม Green Garden: ขายขยะ 40 ซื้ออุปกรณ์ 20 ขายกระถาง 45 → กำไร 25 คงเหลือ 165
    const add = async (kind, amount) => {
      await page.getByTestId(`kad-kind-garden-${kind}`).click()
      await page.getByTestId('kad-amount-garden').fill(String(amount))
      await page.getByTestId('kad-add-garden').click()
    }
    await add('trash', 40)
    await add('buy', 20)
    await add('sale', 45)
    await page.getByTestId('kad-profit-garden').getByText('กำไร 25 บาท').waitFor()
    await page.getByTestId('kad-balance-garden').getByText('165 บาท').waitFor()
    await page.getByTestId('kad-class-sales').getByText('45 บาท').waitFor()
    await page.getByTestId('kad-class-next').getByText('อีก 55 บาท').waitFor()
    // ขายอีก 60 บาท ยอดรวม 105 → ปลดล็อกต้นไม้ต้นแรก
    await add('sale', 60)
    await page.getByTestId('kad-class-next').getByText('อีก 95 บาท').waitFor()
    // เครื่องคิดเงินทอน: 35 บาท จ่าย 50 → ทอน 15
    await page.getByTestId('kad-change-price').fill('35')
    await page.getByTestId('kad-change-paid').fill('50')
    await page.getByTestId('kad-change-result').getByText('ทอน 15 บาท').waitFor()
    await snap(page, `${name}-kad-class`)
    // รีเฟรชแล้วข้อมูลยังอยู่
    await page.reload()
    await page.getByTestId('kad-balance-garden').getByText('225 บาท').waitFor()
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
