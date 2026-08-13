/**
 * ย่อรูปการ์ดให้เล็กลงก่อนนำไปฝังในไฟล์เกม
 *
 * ทำไมต้องมีไฟล์นี้: รูปต้นฉบับของมอนสเตอร์เป็น PNG ใบละ 660–790 KB
 * พอแปลงเป็น base64 เพื่อฝังในไฟล์ HTML จะพองอีก 33%
 * รวมแล้วไฟล์เกมจะเกิน 8 MB ซึ่งเด็กที่เปิดผ่านเน็ตมือถือจะโหลดนาน
 *
 * วิธีแก้: ใช้ Chromium วาดรูปลง canvas แล้ว export เป็น WebP
 * (เทคนิคเดียวกับที่หน้าเกมใช้ตอนครูอัปรูปเอง)
 *
 * วิธีใช้
 *   node src/divisorDuel/web/optimize.mjs <โฟลเดอร์ต้นฉบับ> <โฟลเดอร์ผลลัพธ์>
 *
 * รูปต้นฉบับยังอยู่ครบไม่ถูกแตะต้อง ผลลัพธ์เขียนลงอีกโฟลเดอร์เสมอ
 */

import fs from 'fs'
import path from 'path'
import pw from '/opt/node22/lib/node_modules/playwright/index.js'

const { chromium } = pw

/** ด้านยาวสุดของรูปหลังย่อ — 600px คมพอสำหรับการ์ดบนจอมือถือและโปรเจกเตอร์ */
const MAX_EDGE = 600
/** คุณภาพ WebP 0–1 — 0.82 ยังไม่เห็นรอยบล็อกบนภาพวาดสีไล่เฉด */
const QUALITY = 0.82

const SOURCE_EXT = new Set(['.png', '.jpg', '.jpeg', '.webp'])

const MIME = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
}

async function main() {
  const [srcDir, outDir] = process.argv.slice(2)

  if (!srcDir || !outDir) {
    console.error('ใช้: node optimize.mjs <โฟลเดอร์ต้นฉบับ> <โฟลเดอร์ผลลัพธ์>')
    process.exit(1)
  }
  if (!fs.existsSync(srcDir)) {
    console.error(`ไม่พบโฟลเดอร์ต้นฉบับ: ${srcDir}`)
    process.exit(1)
  }

  const files = fs
    .readdirSync(srcDir)
    .filter((name) => SOURCE_EXT.has(path.extname(name).toLowerCase()))
    .sort()

  if (files.length === 0) {
    console.error(`ไม่พบไฟล์รูปใน ${srcDir}`)
    process.exit(1)
  }

  fs.mkdirSync(outDir, { recursive: true })

  const browser = await chromium.launch()
  const page = await browser.newPage()

  let beforeTotal = 0
  let afterTotal = 0

  try {
    for (const name of files) {
      const srcFile = path.join(srcDir, name)
      const ext = path.extname(name).toLowerCase()
      const base = path.basename(name, ext)
      const bytes = fs.readFileSync(srcFile)
      const dataUri = `data:${MIME[ext]};base64,${bytes.toString('base64')}`

      const result = await page.evaluate(
        async ({ uri, maxEdge, quality }) => {
          const img = new Image()
          img.src = uri
          await img.decode()

          const scale = Math.min(1, maxEdge / Math.max(img.width, img.height))
          const width = Math.round(img.width * scale)
          const height = Math.round(img.height * scale)

          const canvas = document.createElement('canvas')
          canvas.width = width
          canvas.height = height

          const ctx = canvas.getContext('2d')
          if (!ctx) throw new Error('สร้าง canvas ไม่สำเร็จ')
          ctx.imageSmoothingQuality = 'high'
          // การ์ดต้นฉบับบางใบเป็น PNG โปร่งใส วาดพื้นดำรองไว้กัน WebP ขอบขาว
          ctx.fillStyle = '#000'
          ctx.fillRect(0, 0, width, height)
          ctx.drawImage(img, 0, 0, width, height)

          return {
            width,
            height,
            sourceWidth: img.width,
            sourceHeight: img.height,
            uri: canvas.toDataURL('image/webp', quality),
          }
        },
        { uri: dataUri, maxEdge: MAX_EDGE, quality: QUALITY },
      )

      const out = Buffer.from(result.uri.split(',')[1], 'base64')
      fs.writeFileSync(path.join(outDir, base + '.webp'), out)

      beforeTotal += bytes.length
      afterTotal += out.length

      const before = (bytes.length / 1024).toFixed(0).padStart(4)
      const after = (out.length / 1024).toFixed(0).padStart(4)
      const saved = (100 - (out.length / bytes.length) * 100).toFixed(0).padStart(3)
      console.log(
        `  ${base.padEnd(28)} ${result.sourceWidth}×${result.sourceHeight} → ` +
          `${result.width}×${result.height}   ${before} → ${after} KB  (ลด ${saved}%)`,
      )
    }
  } finally {
    await browser.close()
  }

  const mb = (n) => (n / 1024 / 1024).toFixed(2)
  console.log(
    `\nย่อครบ ${files.length} ใบ — ${mb(beforeTotal)} MB → ${mb(afterTotal)} MB ` +
      `(ลด ${(100 - (afterTotal / beforeTotal) * 100).toFixed(0)}%)`,
  )
  console.log(`ผลลัพธ์อยู่ที่ ${outDir}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
