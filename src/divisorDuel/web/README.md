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

## แก้กติกาที่ไหน

ทุกค่าอยู่ใน `src/divisorDuel/rules.ts` ไฟล์เดียว
ค่าที่ทำเครื่องหมาย `[สมมติ]` คือค่าที่ยังต้องยืนยันกับผู้ออกแบบเกม
