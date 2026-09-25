/**
 * ทดสอบเกมอวกาศทั้งสองเกมในเบราว์เซอร์จริง (ยานสำรวจระบบสุริยะ และภารกิจแปดดาว)
 *
 * ทำไมต้องมี
 *
 * ชุดทดสอบอื่นตรวจแค่ตรรกะ ไม่ได้เปิดหน้าจอ React เลย
 * เครื่องที่พัฒนาเกมนี้ลง React ไม่ได้ (npm ถูกบล็อก) หน้าจอจึงไม่เคยถูกกดเล่นจริงก่อนขึ้นเว็บ
 * ไฟล์นี้เปิดเว็บที่ build แล้วใน Chromium สร้างตัวละคร แล้วเล่นทุกโหมดจนจบจริง ๆ
 *   - ภารกิจแปดดาว: โหมดสำรวจ · อ่านบทเรียนครบหกบท · เล่นแปดดาวจนจบทีละดาว
 *   - ยานสำรวจระบบสุริยะ: ทริปสั้นหนึ่งทริปจนถึงหน้าสรุป
 * ถ้ามี error ใด ๆ ในหน้าเว็บ หรือปุ่มที่ควรกดได้ไม่ขึ้นมา ข้อนี้จะตก
 *
 * บอตในไฟล์นี้อ่านเฉลยจากไฟล์เนื้อหาตัวจริง (คอมไพล์ด้วย tsconfig.tests.json)
 * จึงเล่นได้ถูกทุกข้อ และตรวจได้ด้วยว่าเล่นถูกหมดแล้วได้สามดาวจริง
 * ยกเว้นไพ่จับคู่ ซึ่งต้องเปิดดูก่อนถึงจะรู้ว่าใบไหนอยู่ตรงไหน
 *
 * วิธีใช้ (ต้องมี playwright ในเครื่อง)
 *   npm run build
 *   npx tsc -p tsconfig.tests.json --outDir /tmp/logic
 *   node tests/e2e/space.e2e.mjs dist /tmp/logic
 */

import fs from 'fs'
import http from 'http'
import path from 'path'
import { createRequire } from 'module'
import { chromium } from 'playwright'

const DIST = path.resolve(process.argv[2] ?? 'dist')
const LOGIC = path.resolve(process.argv[3] ?? '/tmp/logic')
const SHOTS = path.resolve('test-results')
fs.mkdirSync(SHOTS, { recursive: true })

const require = createRequire(import.meta.url)
const load = (name) => require(path.join(LOGIC, `${name}.js`))
const Content = load('planetQuest/content')
const Lessons = load('planetQuest/lessons')
const Stages = load('planetQuest/stages')
const Eclipse = load('planetQuest/eclipse')
const Planets = load('solar/planets')
const Buddies = load('planetQuest/buddies')

/* ---------------- เว็บเซิร์ฟเวอร์เล็ก ๆ สำหรับไฟล์ที่ build แล้ว ---------------- */

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.json': 'application/json' }

const server = http.createServer((request, response) => {
  const url = decodeURIComponent((request.url ?? '/').split('?')[0])
  let file = path.join(DIST, url)
  if (!file.startsWith(DIST) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(DIST, 'index.html')
  response.writeHead(200, { 'content-type': TYPES[path.extname(file)] ?? 'application/octet-stream' })
  response.end(fs.readFileSync(file))
})
await new Promise((resolve) => server.listen(4173, resolve))
const BASE = 'http://localhost:4173'

/* ---------------- เบราว์เซอร์ ---------------- */

const browser = await chromium.launch()
const errors = []
let page

async function openPage(viewport) {
  const context = await browser.newContext({ viewport })
  const opened = await context.newPage()
  opened.setDefaultTimeout(15_000)
  opened.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`))
  opened.on('console', (message) => {
    if (message.type() !== 'error') return
    const text = message.text()
    // ฟอนต์จาก Google หรือไฟล์ที่ไม่เกี่ยวกับเกมโหลดไม่ขึ้น ไม่นับเป็นความผิดของหน้าจอ
    if (/Failed to load resource|net::ERR_/.test(text)) return
    errors.push(`console: ${text}`)
  })
  return opened
}

let stepNumber = 0
async function step(name, run) {
  stepNumber += 1
  const label = `${String(stepNumber).padStart(2, '0')} ${name}`
  const started = Date.now()
  try {
    await run()
    console.log(`✓ ${label} (${((Date.now() - started) / 1000).toFixed(1)} วินาที)`)
  } catch (error) {
    console.log(`✗ ${label}`)
    await page.screenshot({ path: path.join(SHOTS, `fail-${stepNumber}.png`), fullPage: true }).catch(() => undefined)
    const body = await page.locator('main').innerText().catch(() => '(อ่านหน้าจอไม่ได้)')
    console.log(`--- ข้อความบนจอตอนตก ---\n${body.slice(0, 2000)}\n---`)
    throw error
  }
}

const shot = (name) => page.screenshot({ path: path.join(SHOTS, `${name}.png`), fullPage: true })
const wait = (ms) => page.waitForTimeout(ms)
const button = (name) => page.getByRole('button', { name, exact: true })
const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** ปิดหน้าต่างเลเวลอัปถ้าเด้งขึ้นมา มันบังปุ่มทั้งหน้า */
async function dismissModals() {
  const levelUp = button('ไปต่อกันเลย!')
  if (await levelUp.isVisible().catch(() => false)) await levelUp.click()
}

/** กดปุ่มตัวแรกที่เห็นในรายชื่อ ใช้กับปุ่มที่ชื่อเปลี่ยนตามข้อสุดท้าย เช่น "ข้อต่อไป" กับ "จบด่าน" */
async function clickFirstVisible(names, timeout = 10_000) {
  const deadline = Date.now() + timeout
  while (Date.now() < deadline) {
    await dismissModals()
    for (const name of names) {
      const target = button(name)
      if (await target.isVisible().catch(() => false)) {
        await target.click()
        return name
      }
    }
    await wait(100)
  }
  throw new Error(`ไม่เจอปุ่ม ${names.join(' / ')}`)
}

async function visibleText(texts) {
  for (const text of texts) {
    if (await page.getByText(text, { exact: true }).first().isVisible().catch(() => false)) return text
  }
  return null
}

/**
 * เลื่อนแถบเลื่อนไปที่ค่าหนึ่ง
 * fill ของ Playwright ใช้กับแถบเลื่อนไม่ได้ และตั้งค่าตรง ๆ React จะไม่รู้ตัว
 * จึงต้องใช้ตัวตั้งค่าของเบราว์เซอร์เองแล้วส่งเหตุการณ์ input ตามไป
 */
async function setRange(label, value) {
  await page.getByLabel(label).evaluate((element, next) => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set
    setter.call(element, next)
    element.dispatchEvent(new Event('input', { bubbles: true }))
  }, String(value))
}

/** ป้ายแจ้งรางวัลลอยทับปุ่มด้านล่างจอ ซ่อนไว้ระหว่างทดสอบ ไม่เกี่ยวกับเกมที่ทดสอบ */
async function go(route) {
  await page.goto(`${BASE}/${route}`)
  await page.addStyleTag({ content: '.pointer-events-none.fixed { display: none !important; }' })
}

/** ปุ่มเลือกดาวในโหมดฝึกฝน เทียบชื่อดาวแบบตรงตัว ไม่ให้ "โลก" ไปโดนคำอื่น */
function planetOption(name) {
  return page
    .locator('nav[aria-label="เลือกดาว"] button.sol-option')
    .filter({ has: page.locator('span.font-black', { hasText: new RegExp(`^${escapeRegex(name)}$`) }) })
}

const resultButton = () => button('ไปดาวดวงต่อไป')
const atResult = () => resultButton().isVisible().catch(() => false)

/** ตัวเลือกแบบ sol-opt ที่ข้อความตรงกับคำตอบเป๊ะ */
function option(text) {
  return page.locator('button.sol-opt').filter({ has: page.locator('span', { hasText: new RegExp(`^${escapeRegex(text)}$`) }) })
}

/* ---------------- เกมบนแต่ละดาว ---------------- */

const PLANET_BY_NAME = new Map(Planets.PLANETS.map((planet) => [planet.name, planet]))

async function playMemory() {
  const partner = new Map()
  for (const planet of Planets.PLANETS) {
    partner.set(planet.name, Content.PLANET_TRAITS[planet.id])
    partner.set(Content.PLANET_TRAITS[planet.id], planet.name)
  }
  const cards = page.locator('button.select-none')
  const known = new Map()
  const labels = async () => cards.evaluateAll((elements) => elements.map((element) => element.getAttribute('aria-label')))
  const flip = async (index) => {
    await cards.nth(index).click()
    await wait(380)
    const text = (await labels())[index]
    known.set(index, text)
    return text
  }

  for (let guard = 0; guard < 40 && !(await atResult()); guard += 1) {
    const now = await labels()
    const closed = now.map((label, index) => (label === 'การ์ดคว่ำ' ? index : -1)).filter((index) => index >= 0)
    if (closed.length === 0) {
      await wait(500)
      continue
    }
    // รู้ครบทั้งคู่แล้ว เปิดคู่นั้นเลย
    let pair = null
    for (const a of closed) {
      for (const b of closed) {
        if (a !== b && known.has(a) && known.has(b) && partner.get(known.get(a)) === known.get(b)) pair = [a, b]
      }
    }
    if (pair) {
      await cards.nth(pair[0]).click()
      await wait(150)
      await cards.nth(pair[1]).click()
    } else {
      const first = closed.find((index) => !known.has(index)) ?? closed[0]
      const text = await flip(first)
      const match = closed.find((index) => index !== first && known.get(index) === partner.get(text))
      const second = match ?? closed.find((index) => index !== first && !known.has(index)) ?? closed.find((index) => index !== first)
      await flip(second)
    }
    await wait(950)
  }
}

async function playTrueFalse() {
  const truth = new Map(Content.STATEMENTS.map((item) => [item.text, item.truth]))
  for (let guard = 0; guard < 12 && !(await atResult()); guard += 1) {
    const text = await visibleText([...truth.keys()])
    if (!text) throw new Error('ไม่เจอข้อความจริงหรือไม่บนจอ')
    await button(truth.get(text) ? '👍 จริง' : '👎 ไม่จริง').click()
    await clickFirstVisible(['ข้อต่อไป', 'จบด่าน'])
  }
}

async function playEclipse() {
  for (const task of Eclipse.LAB_TASKS) {
    await page.getByText(task.instruction, { exact: true }).waitFor()
    if (task.goal === 'solar-annular') await button('🔭 ดวงจันทร์อยู่ใกล้โลก').click()
    const target = task.goal.startsWith('solar') ? 'จันทร์ดับ' : 'จันทร์เพ็ญ'
    for (let move = 0; move < 8; move += 1) {
      const status = await page.getByText(/^ดวงจันทร์: /).first().innerText()
      if (status.startsWith(`ดวงจันทร์: ${target} ·`)) break
      await button('เลื่อนดวงจันทร์ไปข้างหน้า').click()
    }
    await button('ยืนยันตำแหน่ง').click()
    await page.getByText(/^🎉 สำเร็จ!/).waitFor()
    await button('ต่อไป').click()
  }
  const questions = Object.values(Content.ECLIPSE_QUESTIONS)
  const text = await visibleText(questions.map((question) => question.text))
  const question = questions.find((entry) => entry.text === text)
  if (!question) throw new Error('ไม่เจอคำถามปิดท้ายห้องทดลอง')
  await option(question.answer).click()
  await clickFirstVisible(['จบด่าน'])
}

async function playConnect() {
  const uses = new Map(Content.TECH_PAIRS.map((pair) => [pair.tech, pair.use]))
  const columns = page.locator('.grid.grid-cols-2.gap-8 > div')
  const left = columns.nth(0).locator('button')
  const count = await left.count()
  for (let index = 0; index < count; index += 1) {
    const tech = (await left.nth(index).innerText()).trim()
    await left.nth(index).click()
    await columns.nth(1).locator('button', { hasText: uses.get(tech) }).click()
    await wait(250)
  }
}

async function playSort() {
  for (let guard = 0; guard < 20 && !(await atResult()); guard += 1) {
    const header = await page.getByText(/^สายพานที่ \d\/\d: /).innerText()
    const round = Content.SORT_ROUNDS.find((entry) => header.endsWith(entry.title))
    const label = (await page.locator('.sol-comms p.text-3xl').innerText()).trim()
    const item = round.items.find((entry) => entry.label === label)
    if (!item) throw new Error(`ไม่รู้จักของชิ้น "${label}"`)
    const bin = round.bins.find((entry) => entry.id === item.bin)
    await page.locator('button.pq-bin').filter({ has: page.locator('span', { hasText: new RegExp(`^📦 ${escapeRegex(bin.label)}$`) }) }).click()
    // วางถูกแล้วไปชิ้นต่อไปเอง รอให้ของชิ้นใหม่หรือหน้าผลขึ้นมา
    await page.waitForFunction(
      (previous) => {
        const next = document.querySelector('.sol-comms p.text-3xl')
        return !next || next.textContent.trim() !== previous || [...document.querySelectorAll('button')].some((b) => b.textContent.includes('ไปดาวดวงต่อไป'))
      },
      label,
      { timeout: 5000 },
    ).catch(() => undefined)
    await wait(200)
  }
}

async function playAsteroid() {
  for (let guard = 0; guard < 10 && !(await atResult()); guard += 1) {
    const text = await visibleText(Content.ASTEROID_QUESTIONS.map((question) => question.text))
    const question = Content.ASTEROID_QUESTIONS.find((entry) => entry.text === text)
    if (!question) throw new Error('ไม่เจอคำถามของดงอุกกาบาต')
    await page.locator('button.pq-rock').filter({ has: page.locator('span', { hasText: new RegExp(`^${escapeRegex(question.answer)}$`) }) }).click()
    await page.getByText('💥 ตูม! ยิงโดนเป้า').waitFor()
    await clickFirstVisible(['คลื่นต่อไป', 'จบด่าน'])
  }
}

async function playTimeline() {
  for (let guard = 0; guard < 10 && !(await atResult()); guard += 1) {
    const cards = page.locator('button.pq-duel')
    await cards.first().waitFor()
    const texts = await cards.allInnerTexts()
    const events = texts.map((text) => Content.TIMELINE_EVENTS.find((event) => text.includes(event.text)))
    if (events.some((event) => !event)) throw new Error('ไม่รู้จักเหตุการณ์บนการ์ด')
    await cards.nth(events[0].year < events[1].year ? 0 : 1).click()
    await clickFirstVisible(['คู่ต่อไป', 'จบด่าน'])
  }
}

async function playRiddle() {
  for (let guard = 0; guard < 10 && !(await atResult()); guard += 1) {
    // เทียบทั้งประโยค ใบ้แรกของบางดวงเป็นส่วนหนึ่งของอีกดวง เช่น "ชั้นนอก" กับ "ชั้นนอกสีน้ำเงิน"
    const first = (await page.locator('.sol-comms ol li').first().innerText()).replace(/^ใบ้ \d+\s*/, '').trim()
    const riddle = Content.RIDDLES.find((entry) => entry.clues[0] === first)
    if (!riddle) throw new Error(`ไม่รู้จักปริศนา "${first}"`)
    await option(riddle.answer).click()
    await clickFirstVisible(['คดีต่อไป', 'ปิดคดี'])
  }
}

const PLAYERS = {
  memory: playMemory,
  truefalse: playTrueFalse,
  eclipse: playEclipse,
  connect: playConnect,
  sort: playSort,
  asteroid: playAsteroid,
  timeline: playTimeline,
  riddle: playRiddle,
}

/* ---------------- ลำดับการทดสอบ ---------------- */

try {
  page = await openPage({ width: 1100, height: 1000 })

  await step('สร้างตัวละคร', async () => {
    await go('#/create')
    await page.getByPlaceholder('เช่น น้องมิว').fill('บอตทดสอบ')
    await page.locator('button[type="submit"]').click()
    await page.waitForURL(/#\/menu/)
  })

  await step('เมนูหลักมีทางเข้าเกมอวกาศทั้งสอง', async () => {
    await page.getByRole('button', { name: /ภารกิจแปดดาว/ }).waitFor()
    await page.getByRole('button', { name: /ยานสำรวจระบบสุริยะ/ }).waitFor()
  })

  await step('ภารกิจแปดดาว: หน้าแรกมีสามโหมด', async () => {
    await go('#/planets')
    for (const title of ['โหมดสำรวจ', 'โหมดเรียนรู้', 'โหมดฝึกฝน']) {
      await page.locator('button.pq-mode', { hasText: title }).waitFor()
    }
    const parade = await page.locator('.pq-parade .pq-buddy').count()
    if (parade !== 8) throw new Error(`หน้าแรกมีเพื่อนดาว ${parade} ดวง`)
    await page.getByText(Buddies.WELCOME_LINE, { exact: true }).waitFor()
    await wait(800)
    await shot('planets-home')
  })

  await step('โหมดสำรวจ: บินไปเที่ยวดาวอังคารแล้วได้ของที่ระลึก', async () => {
    await page.locator('button.pq-mode', { hasText: 'โหมดสำรวจ' }).click()
    await page.locator('button.sol-chip', { hasText: 'ดาวอังคาร' }).click()
    await button('บินไปเที่ยวดาวอังคาร').click()
    await page.getByText('📸 ถึงดาวอังคารแล้ว! ได้ของที่ระลึกของดาวอังคาร').waitFor({ timeout: 20_000 })
    // ไปถึงครั้งแรก ดาวอังคารเพิ่งตื่น ทักด้วยประโยคตื่นนอน
    await page.getByText(Buddies.wakeLine(Buddies.buddyFor('mars')), { exact: true }).waitFor()
  })

  await step('โหมดสำรวจ: เลื่อนน้ำหนักแล้วตาชั่งบนดาวอังคารอ่านค่าถูก', async () => {
    await setRange('น้ำหนักบนโลก กิโลกรัม', 50)
    await page.getByText('20 กก.', { exact: true }).waitFor()
    await setRange('อายุบนโลก ปี', 15)
    await page.getByText('8.0 ปี', { exact: true }).waitFor()
  })

  await step('โหมดสำรวจ: ห้องทดลองอุปราคาแบบเล่นอิสระหมุนดวงจันทร์เองได้', async () => {
    await button('เปิดห้องทดลอง').click()
    await button('▶️ ให้ดวงจันทร์หมุนเอง').click()
    await page.getByText('จันทรุปราคาเต็มดวง', { exact: true }).waitFor({ timeout: 15_000 })
    await button('⏸ หยุดหมุน').click()
    await shot('planets-explore')
  })

  await step('โหมดเรียนรู้: อ่านครบทั้งหกบทและตอบคำถามท้ายบท', async () => {
    await button('📖 โหมดเรียนรู้').click()
    for (const lesson of Lessons.LESSONS) {
      await page.locator('button.sol-option', { hasText: lesson.title }).click()
      for (let slide = 0; slide < lesson.slides.length; slide += 1) {
        const reveals = page.locator('button.pq-reveal')
        for (let index = 0; index < (await reveals.count()); index += 1) await reveals.nth(index).click()
        await clickFirstVisible(['ต่อไป', 'ไปเช็กความเข้าใจ'])
      }
      await option(lesson.check.answer).click()
      await page.getByText('ถูกต้อง! จบบทนี้แล้ว 🎉').waitFor()
      if (lesson.id === 'solar-eclipse') await shot('planets-lesson')
      await button('เลือกบทต่อไป').click()
    }
    await page.getByText(`อ่านจบแล้ว ${Lessons.LESSONS.length}/${Lessons.LESSONS.length} บท · เลือกบทไหนก่อนก็ได้`).waitFor()
  })

  await step('โหมดเรียนรู้: จบบทแล้วปุ่มไปฝึกพาไปดาวที่ใช้ความรู้บทนั้น', async () => {
    const lesson = Lessons.LESSONS.find((item) => item.id === 'solar-eclipse')
    const name = Planets.getPlanet(lesson.practice).name
    await page.locator('button.sol-option', { hasText: lesson.title }).click()
    for (let slide = 0; slide < lesson.slides.length; slide += 1) await clickFirstVisible(['ต่อไป', 'ไปเช็กความเข้าใจ'])
    await option(lesson.check.answer).click()
    await button(`ไปฝึกที่${name}`).click()
    // ยานอาจจอดอยู่ที่ดาวนั้นแล้วหรือยังไม่ถึง ปุ่มจึงเป็นได้สองชื่อ
    await button(`บินไป${name}`).or(button(`ลงจอดที่${name}`)).waitFor()
    await planetOption(name).and(page.locator('[aria-pressed="true"]')).waitFor()
  })

  await step('โหมดฝึกฝน: เข้าได้และเห็นดาวครบแปดดวง ดาวที่ยังไม่เคยไปหลับอยู่', async () => {
    await button('🎮 โหมดฝึกฝน').click()
    await page.locator('nav[aria-label="เลือกดาว"] button.sol-option').nth(7).waitFor()
    await planetOption('ดาวพุธ').filter({ hasText: '💤 ยังหลับอยู่' }).waitFor()
    const marsAsleep = await planetOption('ดาวอังคาร').filter({ hasText: '💤 ยังหลับอยู่' }).count()
    if (marsAsleep > 0) throw new Error('ดาวอังคารไปเที่ยวมาแล้วแต่ยังหลับอยู่')
  })

  for (const stage of Stages.STAGES) {
    const name = Planets.getPlanet(stage.planet).name
    await step(`โหมดฝึกฝน · ${name}: ${stage.title}`, async () => {
      const buddy = Buddies.buddyFor(stage.planet)
      await planetOption(name).click()
      await clickFirstVisible([`บินไป${name}`, `ลงจอดที่${name}`])
      await button('เริ่มเลย!').waitFor({ timeout: 20_000 })
      // ดาวเจ้าบ้านทักตอนลงจอด ถ้าเพิ่งถูกปลุกจะทักด้วยประโยคตื่นนอนแทน
      await page.getByText(buddy.invite, { exact: true }).or(page.getByText(Buddies.wakeLine(buddy), { exact: true })).waitFor()
      await button('เริ่มเลย!').click()
      await page.getByText(Buddies.readyLine(buddy), { exact: true }).waitFor()
      await PLAYERS[stage.kind]()
      await resultButton().waitFor({ timeout: 10_000 })
      if (stage.kind !== 'memory') {
        await page.locator('.sol-stamp-big [aria-label="ได้ 3 ดาวจาก 3 ดาว"]').waitFor()
        await page.getByText(Buddies.goodbyeLine(buddy, 3), { exact: true }).waitFor()
      }
      await shot(`planets-${stage.planet}`)
      await resultButton().click()
    })
  }

  await step('โหมดฝึกฝน: ลงจอดครบแปดดาวแล้วขึ้นใบประกาศ', async () => {
    await page.getByText('นักบินอวกาศตัวจริง!', { exact: true }).waitFor()
  })

  await step('ยานสำรวจระบบสุริยะ: ทริปสั้นหนึ่งทริปจนถึงหน้าสรุป', async () => {
    await go('#/solar')
    await button('ออกเดินทาง').click()
    for (let leg = 0; leg < 4; leg += 1) {
      // ลองเลือกดาวไล่ไปทีละดวงจนกว่ายานจะออกบิน เลือกผิดได้คำใบ้ ไม่ทำให้เกมพัง
      const chips = page.locator('nav[aria-label="เลือกดาว"] button.sol-chip')
      let launched = false
      for (let index = 0; index < 8 && !launched; index += 1) {
        const chip = chips.nth(index)
        const text = await chip.innerText()
        if (text.includes('📍') || text.includes('✗')) continue
        await chip.click()
        const planet = PLANET_BY_NAME.get(text.replace(/[📍✗]/gu, '').trim())
        await button(`บินไป${planet.name}`).click()
        launched = await page.getByText(/^🚀 กำลังเดินทางไป/).isVisible().catch(() => false)
      }
      if (!launched) throw new Error('เลือกดาวครบทุกดวงแล้วยานยังไม่ออกบิน')
      await page.getByText(/โจทย์รับตราประทับ/).waitFor({ timeout: 20_000 })
      const options = page.locator('button.sol-opt')
      for (let index = 0; index < (await options.count()); index += 1) {
        if (await page.locator('button.sol-opt-right').count()) break
        if (await options.nth(index).isEnabled()) await options.nth(index).click()
        await dismissModals()
      }
      await button('รับตราประทับ').click()
      await clickFirstVisible(['ภารกิจต่อไป', 'ดูสรุปภารกิจ'])
    }
    await page.getByRole('heading', { name: 'ภารกิจสำเร็จ!' }).waitFor()
    await shot('solar-summary')
  })

  await step('จอโทรศัพท์: ทั้งสองเกมไม่ล้นขอบจอด้านข้าง', async () => {
    const phone = await openPage({ width: 390, height: 844 })
    for (const route of ['#/planets', '#/solar']) {
      // ใช้ข้อมูลผู้เล่นชุดเดียวกัน คัดลอก localStorage ข้ามมา
      const storage = await page.evaluate(() => JSON.stringify({ ...localStorage }))
      await phone.goto(`${BASE}/`)
      await phone.evaluate((data) => {
        for (const [key, value] of Object.entries(JSON.parse(data))) localStorage.setItem(key, value)
      }, storage)
      await phone.goto(`${BASE}/${route}`)
      await phone.waitForTimeout(1200)
      const overflow = await phone.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
      if (overflow > 1) throw new Error(`${route} ล้นขอบจอไป ${overflow} พิกเซล`)
      await phone.screenshot({ path: path.join(SHOTS, `phone-${route.slice(2)}.png`), fullPage: true })
    }
    await phone.context().close()
  })
} catch (error) {
  console.log(`\nทดสอบไม่ผ่าน: ${error.message}`)
  errors.unshift(error.message)
} finally {
  await browser.close()
  server.close()
}

if (errors.length > 0) {
  console.log(`\nพบปัญหา ${errors.length} รายการ`)
  errors.forEach((line, index) => console.log(`  ${index + 1}. ${line}`))
  process.exit(1)
}
console.log('\nเล่นครบทุกโหมดในเบราว์เซอร์จริงแล้ว ไม่พบ error')
