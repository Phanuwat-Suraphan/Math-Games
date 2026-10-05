# MONEY HERO – ปฏิบัติการเมืองเงินทอง

เกมการเรียนรู้คณิตศาสตร์ ป.3 เรื่อง **เงิน** แนว Educational Adventure + Simulation + Mini Games
เปิดที่ `money-hero.html` (แยกจากเกมผจญภัยเดิมใน `index.html` แต่อยู่ในโปรเจกต์เดียวกัน)

> สถานะ: **ส่วนที่ 1** เล่นได้แล้ว: หน้าเริ่มเกม สร้างผู้เล่น แผนที่ 2 มิติ และ **ด่าน 0–6** ครบ 4 ขั้น
> ส่วนถัดไป: ด่าน 7–12 (ซูเปอร์มาร์เก็ต โรงงานคูณ–หาร โจทย์ปัญหา สมุดบัญชี FINAL) · Pre/Post-test · รางวัล · โปรไฟล์ · แผงคุณครู + CSV
> ตัวสร้างโจทย์ของ **ทุกด่าน (0–12)** และแบบทดสอบก่อน/หลังเรียน เขียนและทดสอบเสร็จแล้ว รอต่อหน้าจอ

## เล่น

```bash
npm install
npm run dev
# เปิด http://localhost:5173/money-hero.html
```

build: `npm run build` → ได้ `dist/money-hero.html`

เผยแพร่: push ขึ้น branch หลักของ repo แล้ว GitHub Actions (`deploy.yml`) จะขึ้น GitHub Pages ให้เอง
เปิดได้ที่ `https://<ชื่อผู้ใช้>.github.io/Math-Games/money-hero.html`
เป็น Progressive Web App ติดตั้งลงแท็บเล็ต/มือถือได้ และเปิดได้แม้ออฟไลน์หลังเปิดครั้งแรก

## วิธีเล่น

- **แผนที่**: ← → หรือ A D เดิน · Space กระโดด (เก็บเหรียญบนฟ้า) · Enter เข้าอาคาร
  บนแท็บเล็ต/มือถือใช้ปุ่มบนจอ หรือแตะอาคารให้ฮีโร่เดินไปเอง · มีปุ่ม "ดูรายการด่าน" สำหรับคนที่ไม่อยากเดิน
- **ทุกด่านมี 4 ขั้น**: LEARN (บทเรียนสั้น ๆ + เงินจำลอง) → PRACTICE → MISSION → BOSS
- **ตัวช่วย 3 ระดับ**: บอกแนวทาง → แสดงภาพ → วิธีคิดบางส่วน (ไม่เฉลยตั้งแต่ระดับแรก)
- **ตอบผิด**: ครั้งแรก "ลองคิดอีกครั้ง" + คำแนะนำเฉพาะจุด · ครั้งที่สองแสดงวิธีคิดทีละขั้น
  แล้วเพิ่มโจทย์แบบเดียวกันตัวเลขใหม่ให้ฝึกซ้ำท้ายชุด
- **ดาว**: ถูกตั้งแต่ครั้งแรก ≥ 90% ได้ ⭐⭐⭐ · ≥ 70% ได้ ⭐⭐ · ผ่านด่านได้อย่างน้อย ⭐
- **บอส** ต้องตอบถูก (ภายใน 2 ครั้ง) อย่างน้อย 60% ถ้าไม่ถึงให้ทบทวนแล้วสู้ใหม่ ไม่ลงโทษ

## ใส่รูปตัวละคร เหรียญ และธนบัตร

วาง PNG (พื้นหลังโปร่งใส) ตามชื่อนี้ เกมใช้ทันทีโดยไม่ต้องแก้โค้ด ถ้ายังไม่มีไฟล์จะใช้ภาพสำรองเอง

| โฟลเดอร์ | ไฟล์ |
| --- | --- |
| `public/money-hero/characters/` | `hero.png` `rabbit.png` `fox.png` `bear.png` `owl.png` |
| `public/money-hero/money/` | `s25.png` `s50.png` `b1.png` `b2.png` `b5.png` `b10.png` `b20.png` `b50.png` `b100.png` `b500.png` `b1000.png` |

สไตล์กลางสำหรับสร้างรูปเพิ่มให้เข้าชุดกัน:

> cute fantasy educational game, colorful 3D cartoon illustration, premium mobile game character,
> Thai elementary school educational game, bright cheerful lighting, soft rounded shapes, expressive face,
> child-friendly, highly detailed, clean background, full body, front-facing, consistent character design,
> no text, no letters, no watermark.

## โครงสร้างโค้ด

```
src/moneyHero/
  engine/      ชนิดข้อมูล ตรวจคำตอบ คะแนน ความก้าวหน้า localStorage รายงาน CSV
  generators/  ตัวสร้างโจทย์ทุกด่าน (แยกจากหน้าจอ) + แผนคำถามของแต่ละด่าน + แบบทดสอบ
  data/        เงิน 11 ชนิด ตัวละคร สินค้า ด่านและบทเรียน ตรา
  utils/       คณิตศาสตร์เงิน (สตางค์จำนวนเต็ม) ตัวสุ่ม เสียง อ่านออกเสียง
  hooks/       สถานะเกม รูปภาพ ลากวาง
  components/  ภาพเงิน/ตัวละคร ภาพประกอบ ช่องตอบแต่ละแบบ ตัวเดินโจทย์
  pages/       หน้าจอทั้งหมด
  styles/      money.css
```

**เงินทุกจำนวนเก็บเป็นสตางค์จำนวนเต็ม** เช่น 25.50 บาท = `2550` ไม่ใช้ทศนิยมของ JavaScript

## เพิ่มคำถามใหม่

1. เขียนฟังก์ชันใน `src/moneyHero/generators/` ที่คืน `Question` (ดูแบบใน `types.ts`)
   ต้องมี `hint` ครบ 3 ระดับ และ `explain` วิธีคิดทีละขั้น
2. ลงทะเบียนชื่อใน `GENERATORS` ของ `generators/index.ts`
3. ใส่ชื่อใน `LEVEL_PLANS` ของด่านที่ต้องการ พร้อมระดับ 1–3
4. รัน `node tests/moneyHero.test.mjs /tmp/logic` ชุดทดสอบจะสุ่มโจทย์ใหม่หลายร้อยข้อ
   ตรวจว่าทุกข้อมีคำตอบที่ถูก ตัวเลือกไม่ซ้ำ และไม่มีข้อที่กำกวม

## ทดสอบ

```bash
npx tsc -p tsconfig.tests.json --outDir /tmp/logic
node tests/moneyHero.test.mjs /tmp/logic      # คณิตศาสตร์ทุกด่าน โจทย์สุ่มหลายหมื่นข้อ
npm run build
node tests/e2e/moneyHero.e2e.mjs dist         # บอตเล่นจริงในเบราว์เซอร์ (ต้องมี Playwright)
```
