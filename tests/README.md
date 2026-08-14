# ชุดทดสอบ Math Adventure

ทดสอบเฉพาะตรรกะล้วน (ไม่แตะ React) จึงรันได้โดยไม่ต้องติดตั้ง dependency
ใช้ `tsc` คอมไพล์เป็น CommonJS แล้วรันด้วย Node

> **หมายเหตุสำคัญ:** เครื่องที่พัฒนาอยู่นี้เข้า npm registry ไม่ได้ (403)
> จึงยังรัน `npm run build` และทดสอบหน้าจอ React ไม่ได้
> ชุดทดสอบนี้ครอบคลุมเฉพาะชั้นตรรกะและคณิตศาสตร์

## รันทั้งหมด

```bash
# Part 1–3 — ระบบความก้าวหน้า
tsc --ignoreConfig src/types/*.ts src/data/*.ts src/utils/*.ts \
  src/services/storage.ts src/services/rewardService.ts src/services/questService.ts \
  --outDir /tmp/ma --target ES2020 --module commonjs --strict --skipLibCheck --lib ES2020,DOM
node tests/progression.test.mjs /tmp/ma

# Part 4 — Question Engine และ Math Engine
tsc --ignoreConfig src/types/*.ts src/data/*.ts src/utils/*.ts src/math/*.ts \
  src/questionEngine/*.ts src/questionEngine/**/*.ts \
  src/services/storage.ts src/services/rewardService.ts src/services/questService.ts \
  --outDir /tmp/qe --target ES2020 --module commonjs --strict --skipLibCheck --lib ES2020,DOM
node tests/questionEngine.test.mjs /tmp/qe

# เกมการ์ด Divisor Duel
tsc --ignoreConfig src/divisorDuel/*.ts src/divisorDuel/engine/*.ts \
  --outDir /tmp/dd --target ES2020 --module commonjs --strict --skipLibCheck --lib ES2020,DOM
node src/divisorDuel/web/test.mjs /tmp/dd
```

## ครอบคลุมอะไรบ้าง

### `progression.test.mjs` — 33 ข้อ
ตรงตามรายการทดสอบที่สเปก Part 3 กำหนด (Test 1–9)

| หัวข้อ | ตรวจอะไร |
| --- | --- |
| ปลดล็อกโลก | World 1 เปิด · World 2–6 ล็อก · แก้ localStorage เพื่อโกงไม่ได้ |
| ปลดล็อกด่าน | ด่าน 1 เล่นได้ · ผ่านแล้วด่านถัดไปเปิด · ไม่ผ่านเกณฑ์ก็ไม่เปิด |
| ดาวและ Mastery | เกณฑ์ดาว 60/70/90% · 3 ดาว = MASTERED |
| เล่นซ้ำ | รางวัลลดลง · สถิติที่ดีที่สุดไม่ลดลงเมื่อเล่นแย่กว่าเดิม |
| ภารกิจ | รับรางวัลได้ครั้งเดียว · ภารกิจประจำวันรีเซ็ตเมื่อขึ้นวันใหม่ |
| บันทึกข้อมูล | บันทึก/โหลดครบ · ข้อมูลเสียไม่ทำให้พัง · migration v1→v2→v3 |

Test 10 (UI บนมือถือ) ต้องดูด้วยตาบนเบราว์เซอร์จริง ทดสอบอัตโนมัติแทนไม่ได้

### `questionEngine.test.mjs` — 49 ข้อ
เน้นความถูกต้องทางคณิตศาสตร์ เพราะโจทย์ผิดคือความเสียหายต่อเด็กโดยตรง

| หัวข้อ | ตรวจอะไร |
| --- | --- |
| ตัวสุ่ม | seed เดิมให้ผลเดิม · ค่าอยู่ในช่วง · shuffle ไม่ทำสมาชิกหาย |
| เศษส่วน | ตัวส่วนศูนย์โยน error · ทอนรูปอย่างต่ำ · เทียบข้ามตัวส่วน · จำนวนคละ · สมบัติสลับที่ (สุ่มทดสอบ 300 คู่) |
| ทศนิยม | `0.1 + 0.2 = 0.3` พอดี · `1.1 × 1.1 = 1.21` · เทียบค่า · กันหารด้วยศูนย์ |
| ร้อยละ | `35% ของ 70 = 24.5` ไม่เพี้ยน · เพิ่ม/ลดราคา · กันฐานศูนย์ |
| เรขาคณิต | สูตรพื้นที่และเส้นรอบรูป · ตรวจว่าสามด้านเป็นสามเหลี่ยมได้จริง |
| ตัวสร้างโจทย์ | สร้างได้ครบ 9 ชนิด × 4 ระดับ × 3 ชั้นเรียน โดยไม่ต้องใช้โจทย์สำรอง |
| ความถูกต้องของโจทย์ | สุ่มตรวจกว่า 900 ข้อ ทุกข้อผ่าน `validateQuestion` |
| ตัวเลือก | 4 ตัวไม่ซ้ำ · มีคำตอบที่ถูกเสมอ · ไม่มีค่าติดลบ/NaN/ตัวส่วนศูนย์ |
| คณิตศาสตร์ในโจทย์ | บวกลบคูณคำนวณถูกจริง · **โจทย์หารลงตัวเสมอ ไม่มีเศษหลุด** |
| ชุดโจทย์ | กระจายชนิดสมดุล · ไม่มีโจทย์ซ้ำในชุด · จบชุดถูกต้อง · สรุปผลถูก |
| คะแนน | **ตอบถูกช้า ได้คะแนนมากกว่าตอบผิดเร็ว** · โบนัสความเร็ว < 20% ของคะแนนตอบถูก |
| ความยากปรับตามผู้เล่น | ถูก 3 ข้อติดยากขึ้น · ผิด 3 ข้อติดง่ายลง · ขยับทีละขั้นเท่านั้น |
