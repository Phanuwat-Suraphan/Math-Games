# วิธีเปิดเล่น Math Adventure บนเครื่องของครู

เกมนี้เป็นเว็บแอป (React) ต้องติดตั้ง dependency ก่อนถึงจะเปิดได้
ทำครั้งเดียว ครั้งต่อไปเปิดด้วยคำสั่งเดียว

> **ทำไมต้องทำเอง:** เครื่องที่ผมพัฒนาอยู่เข้า npm registry ไม่ได้ (ถูกบล็อก 403)
> ผมจึงติดตั้ง React ไม่ได้และเปิดเว็บให้ดูจากฝั่งผมไม่ได้
> ส่วนเกมการ์ด Divisor Duel เปิดได้เลยเพราะเป็นไฟล์ HTML ไฟล์เดียวที่ไม่ต้องติดตั้งอะไร

---

## 1. ติดตั้ง Node.js (ทำครั้งเดียว)

ดาวน์โหลดจาก https://nodejs.org เลือกรุ่น **LTS**
ติดตั้งเสร็จแล้วเปิด Terminal (macOS) หรือ Command Prompt (Windows) แล้วพิมพ์

```bash
node -v
```

ถ้าขึ้นเลขเวอร์ชัน เช่น `v22.x.x` แปลว่าติดตั้งสำเร็จ

## 2. ดาวน์โหลดโค้ด

**วิธีที่ 1 — ใช้ git**

```bash
git clone https://github.com/Phanuwat-Suraphan/Math-Games.git
cd Math-Games
git checkout claude/math-adventure-part-1-n7zxcx
```

**วิธีที่ 2 — โหลดเป็นไฟล์ ZIP**

เปิด https://github.com/Phanuwat-Suraphan/Math-Games/tree/claude/math-adventure-part-1-n7zxcx
กดปุ่มเขียว **Code → Download ZIP** แล้วแตกไฟล์
จากนั้นเปิด Terminal เข้าไปที่โฟลเดอร์นั้น

## 3. ติดตั้งและเปิดเกม

```bash
npm install
npm run dev
```

รอสักครู่จะขึ้นข้อความประมาณนี้

```
  ➜  Local:   http://localhost:5173/
```

เปิดเบราว์เซอร์ไปที่ `http://localhost:5173/` แล้วเล่นได้เลย

**ครั้งต่อไป** ไม่ต้อง `npm install` ซ้ำ พิมพ์แค่ `npm run dev`

**หยุดเซิร์ฟเวอร์** กด `Ctrl + C` ใน Terminal

---

## เล่นบนมือถือในห้องเรียน

ให้มือถืออยู่ Wi-Fi วงเดียวกับคอมพิวเตอร์ แล้วเปิดด้วย

```bash
npm run dev -- --host
```

จะมีบรรทัด **Network:** ขึ้นมาพร้อมเลข IP เช่น `http://192.168.1.42:5173/`
พิมพ์ที่อยู่นั้นในเบราว์เซอร์มือถือได้เลย

---

## ถ้าเจอ error

**`npm install` ค้างหรือล้มเหลว** — ตรวจว่าอินเทอร์เน็ตใช้งานได้ แล้วลองใหม่
ถ้าอยู่หลังไฟร์วอลล์ของโรงเรียนอาจต้องใช้เน็ตอื่น

**`npm run dev` ขึ้น error สีแดง** — ก๊อบข้อความ error ทั้งหมดส่งมาให้ผม
ผมยังคอมไพล์ไฟล์ React (`.tsx`) ในเครื่องผมไม่ได้ จึงยังมีโอกาสเจอ error ตอน build ครั้งแรก
ส่งมาแล้วผมแก้ให้ทันที

**หน้าเว็บขาว ๆ ไม่มีอะไร** — กด F12 เปิด Console ในเบราว์เซอร์ ถ่ายภาพข้อความสีแดงส่งมา

**อยากล้างข้อมูลผู้เล่นเพื่อเริ่มใหม่** — เข้าหน้า ตั้งค่า แล้วกดเริ่มใหม่
หรือกด F12 → Application → Local Storage → ลบ `math-adventure:player:v1`

---

## เกมการ์ด Divisor Duel

อันนี้ไม่ต้องติดตั้งอะไรเลย เปิดได้ทันทีสองทาง

1. **ลิงก์ที่ผมเผยแพร่ไว้** — https://claude.ai/code/artifact/4e5bd922-e928-49f8-ac5e-36458ca793a1
2. **ไฟล์ในโปรเจกต์** — ดับเบิลคลิก `divisor-duel.html` เปิดในเบราว์เซอร์ได้เลย
   ส่งไฟล์นี้ให้เด็กทางไลน์หรือก๊อบใส่ USB ก็เล่นได้ รูปการ์ดติดไปกับไฟล์แล้ว

---

## ตรวจระบบด้วยชุดทดสอบ

ถ้าอยากดูว่าตรรกะของเกมทำงานถูกต้องไหม (ไม่ต้อง `npm install`)

```bash
npx tsc --ignoreConfig src/types/*.ts src/data/*.ts src/utils/*.ts src/math/*.ts \
  src/questionEngine/*.ts src/questionEngine/**/*.ts \
  src/services/storage.ts src/services/rewardService.ts \
  src/services/questService.ts src/services/questionService.ts \
  --outDir /tmp/qe --target ES2020 --module commonjs --strict --skipLibCheck --lib ES2020,DOM

node tests/progression.test.mjs /tmp/qe      # ระบบความก้าวหน้า Part 1–3
node tests/questionEngine.test.mjs /tmp/qe   # เครื่องยนต์โจทย์ Part 4
node tests/stageQuestions.test.mjs /tmp/qe   # การต่อด่านเข้ากับเครื่องยนต์โจทย์
```

รายละเอียดว่าแต่ละชุดตรวจอะไรบ้าง ดูใน `tests/README.md`
