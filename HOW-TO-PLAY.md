# วิธีเปิดเล่น Math Adventure

มีสองทาง เลือกทางไหนก็ได้

| | ทาง ก — เปิดเป็นลิงก์ | ทาง ข — รันในเครื่องตัวเอง |
| --- | --- | --- |
| ต้องติดตั้งอะไรไหม | **ไม่ต้องเลย** | ต้องลง Node.js |
| ต้องใช้ Terminal ไหม | **ไม่ต้อง** | ต้องใช้ |
| เหมาะกับ | เอาไปให้เด็กเล่น ส่งลิงก์ในไลน์ | แก้โค้ดแล้วเห็นผลทันที |
| ตั้งค่าครั้งแรก | คลิก 3 ครั้งในหน้าเว็บ GitHub | ~5 นาที |

**แนะนำทาง ก ครับ** โดยเฉพาะถ้าจะเอาไปใช้ในห้องเรียนจริง

---

# ทาง ก — เปิดเป็นลิงก์ (ไม่ต้องติดตั้งอะไร)

GitHub จะสร้างเว็บให้อัตโนมัติทุกครั้งที่โค้ดเปลี่ยน แล้วครูเปิดเป็นลิงก์ธรรมดา
เปิดได้ทั้งคอมพิวเตอร์ แท็บเล็ต และมือถือของเด็ก

## เปิดใช้งานครั้งแรก (ทำครั้งเดียว)

1. เข้า https://github.com/Phanuwat-Suraphan/Math-Games
2. กดแท็บ **Settings** (ด้านบนขวา รูปเฟือง)
3. เมนูซ้ายมือ เลื่อนหาแล้วกด **Pages**
4. ตรงหัวข้อ **Source** เลือกเป็น **GitHub Actions**

เท่านี้เสร็จ รอสัก 2–3 นาที เว็บจะขึ้นที่

```
https://phanuwat-suraphan.github.io/Math-Games/
```

เกมการ์ดอยู่ที่

```
https://phanuwat-suraphan.github.io/Math-Games/divisor-duel.html
```

> **หมายเหตุ:** ลิงก์นี้เปิดได้จากทุกที่ ใครมีลิงก์ก็เข้าได้
> เหมาะกับการส่งให้เด็กในห้อง แต่ถ้าไม่ต้องการให้คนนอกเห็น ให้ใช้ทาง ข แทน

## ครั้งต่อ ๆ ไป

ไม่ต้องทำอะไรเลย ทุกครั้งที่ผมแก้โค้ดแล้ว push เว็บจะอัปเดตเองภายในไม่กี่นาที
กด **Ctrl + Shift + R** ในเบราว์เซอร์เพื่อโหลดหน้าใหม่ล่าสุด

## ดูว่า build ผ่านไหม

เข้า https://github.com/Phanuwat-Suraphan/Math-Games/actions

* ✅ เขียว = สร้างเว็บสำเร็จ เปิดเล่นได้
* ❌ แดง = มี error กดเข้าไปดูได้ว่าพังตรงไหน แล้วส่งมาให้ผมแก้

---

# ทาง ข — รันในเครื่องตัวเอง

เหมาะกับตอนอยากแก้โค้ดแล้วเห็นผลทันที

> **ทำไมผมเปิดให้ดูจากฝั่งผมไม่ได้:** เครื่องที่ผมพัฒนาอยู่เข้า npm registry ไม่ได้
> (ถูกบล็อก 403) จึงติดตั้ง React ไม่ได้ ผมเลยให้ GitHub สร้างเว็บแทน ตามทาง ก

## 0. เปิด Terminal

**Windows** — กดปุ่ม `Windows` ค้างไว้แล้วกด `R` พิมพ์ `cmd` แล้วกด Enter
(หรือกดปุ่ม Windows แล้วพิมพ์ `cmd` จะขึ้น "Command Prompt" ให้คลิก)

**Mac** — กด `Command` + `Space` พิมพ์ `terminal` แล้วกด Enter

จะได้หน้าต่างที่มีเคอร์เซอร์กะพริบ พิมพ์คำสั่งลงไปแล้วกด Enter ทีละบรรทัด

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

## 3. เข้าไปในโฟลเดอร์โปรเจกต์

ขั้นนี้ห้ามข้าม ถ้ายังอยู่ที่ `C:\Users\ชื่อคุณ` npm จะหาไฟล์โปรเจกต์ไม่เจอ
แล้วขึ้น error `ENOENT: no such file or directory ... package.json`

```
cd Downloads\Math-Games-claude-math-adventure-part-1-n7zxcx
```

(ชื่อโฟลเดอร์อาจต่างจากนี้ ให้ดูจากที่แตก ZIP ไว้จริง)
พิมพ์ `dir` แล้วกด Enter ถ้าเห็นไฟล์ `package.json` แปลว่าอยู่ถูกที่แล้ว

## 4. ติดตั้งและเปิดเกม

พิมพ์ทีละบรรทัด กด Enter แล้วรอให้เสร็จก่อนพิมพ์บรรทัดถัดไป

```
npm install
```

```
npm run dev
```

> **ห้ามพิมพ์คำอธิบายภาษาไทยต่อท้ายคำสั่ง** บน Windows เครื่องหมาย `#`
> ไม่ใช่คำอธิบาย มันจะถูกอ่านเป็นชื่อแพ็กเกจแล้วขึ้น error `EINVALIDTAGNAME`

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
