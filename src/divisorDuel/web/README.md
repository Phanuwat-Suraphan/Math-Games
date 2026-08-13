# หน้าเว็บของ Divisor Duel

เกมนี้ถูกสร้างเป็นไฟล์ HTML ไฟล์เดียวที่เปิดเล่นได้เลย ไม่ต้องติดตั้งอะไร
เหมาะกับการเอาไปให้เด็กเล่นในห้องเรียนบนมือถือหรือแท็บเล็ต

## วิธี build ใหม่หลังแก้กติกา

```bash
# 1. คอมไพล์เครื่องยนต์เกมเป็น JavaScript
npx tsc --ignoreConfig src/divisorDuel/*.ts src/divisorDuel/engine/*.ts \
  --outDir /tmp/dd --target ES2020 --module ESNext --moduleResolution bundler \
  --strict --skipLibCheck --lib ES2020,DOM

# 2. รวมโมดูลทั้งหมดเป็นไฟล์เดียว
node src/divisorDuel/web/bundle.mjs /tmp/dd /tmp/engine-bundle.js

# 3. ฝังเครื่องยนต์ลงในหน้า HTML
node -e "
const fs=require('fs');
const html=fs.readFileSync('src/divisorDuel/web/index.template.html','utf8');
const js=fs.readFileSync('/tmp/engine-bundle.js','utf8');
fs.writeFileSync('divisor-duel.html', html.replace('/*__ENGINE_BUNDLE__*/', js));
"
```

ได้ไฟล์ `divisor-duel.html` เปิดในเบราว์เซอร์ได้ทันที

## ฝังรูปการ์ดจริงลงในไฟล์เกม

รูปต้นฉบับอยู่ใน `assets/cards/` แต่ **ห้ามฝังตรง ๆ** เพราะ PNG ของมอนสเตอร์
ใบละ 660–790 KB พอแปลงเป็น base64 จะพองอีก 33% ไฟล์เกมจะเกิน 8 MB

```bash
# 4. ย่อรูปก่อน (5.83 MB → 0.77 MB) — ต้นฉบับไม่ถูกแตะต้อง
node src/divisorDuel/web/optimize.mjs assets/cards assets/cards-web

# 5. ฝังรูปลงไฟล์เกม (รันซ้ำได้ ไฟล์ไม่บวม)
node src/divisorDuel/web/bake.mjs assets/cards-web divisor-duel.html
```

ได้ไฟล์เกมขนาด ~1.1 MB ที่มีรูปการ์ดครบ 26 ใบติดไปด้วยทุกที่ที่ส่งลิงก์ไป

> **ข้อควรรู้:** ขั้นตอนที่ 5 จะเขียน `<meta charset="utf-8">` ไว้บรรทัดแรกเสมอ
> ห้ามย้ายออก เบราว์เซอร์อ่านแค่ ~1 KB แรกเพื่อหารหัสอักขระ
> ถ้า base64 ของรูปไปอยู่ก่อน เบราว์เซอร์จะเดาเป็น windows-1252
> แล้วภาษาไทยทั้งเกมจะกลายเป็น `à¸ à¹ˆ`

## แก้กติกาที่ไหน

ทุกค่าอยู่ใน `src/divisorDuel/rules.ts` ไฟล์เดียว
ค่าที่ทำเครื่องหมาย `[สมมติ]` คือค่าที่ยังต้องยืนยันกับผู้ออกแบบเกม
