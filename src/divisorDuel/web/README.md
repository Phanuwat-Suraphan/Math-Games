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

## ทดสอบเครื่องยนต์เกม

```bash
tsc --ignoreConfig src/divisorDuel/*.ts src/divisorDuel/engine/*.ts \
  --outDir /tmp/dd-cjs --target ES2020 --module commonjs \
  --strict --skipLibCheck --lib ES2020,DOM
node src/divisorDuel/web/test.mjs /tmp/dd-cjs
```

## ระบบแนะนำสมการ

อยู่ใน `src/divisorDuel/engine/suggest.ts` ให้คำใบ้ทีละชั้น ไม่เฉลยรวดเดียว

| ชั้น | เด็กได้รู้ | ยังต้องคิดเองว่า |
| --- | --- | --- |
| 1 | ต้องทำผลลัพธ์ให้หารด้วยเกราะลงตัว และมือนี้ทำได้กี่แบบ | จะจัดการ์ดยังไง |
| 2 | ผลลัพธ์ที่มือนี้ทำได้จริงมีค่าอะไรบ้าง | จะเรียงการ์ดยังไงให้ได้ค่านั้น |
| 3 | เฉลยสมการ พร้อมปุ่มวางการ์ดให้ | — |

ระดับคำใบ้รีเซ็ตทุกเทิร์นและทุกครั้งที่จั่วมือใหม่ เด็กจึงต้องเริ่มคิดเองเสมอ
หน้าจบเกมสรุปให้ครูดูว่าแต่ละฝ่ายเปิดคำใบ้ไปกี่ครั้ง

ตัวประกอบสมการ (`buildCandidates`) อยู่ในไฟล์เดียวกับระบบแนะนำ
และ `ai.ts` เรียกใช้ตัวเดียวกันนี้ — ห้ามแยกเป็นสองชุด
ไม่งั้นคำแนะนำที่เด็กได้จะไม่ตรงกับที่คอมพิวเตอร์เล่นจริง

## แก้กติกาที่ไหน

ทุกค่าอยู่ใน `src/divisorDuel/rules.ts` ไฟล์เดียว
ค่าที่ทำเครื่องหมาย `[สมมติ]` คือค่าที่ยังต้องยืนยันกับผู้ออกแบบเกม
