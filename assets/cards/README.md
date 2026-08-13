# วางรูปการ์ดไว้ที่นี่

รูปในโฟลเดอร์นี้จะถูกฝังลงในไฟล์เกมแบบถาวร
ทุกคนที่เปิดลิงก์จะเห็นรูปเหมือนกันหมด โดยไม่ต้องอัปเอง

## ตั้งชื่อไฟล์ให้ตรงกับการ์ด

นามสกุลใช้ได้ทั้ง `.png` `.jpg` `.jpeg` `.webp` `.gif` `.svg`

| การ์ด | ชื่อไฟล์ |
| --- | --- |
| Stone Gargoyle | `stone-gargoyle` |
| Swamp Troll | `swamp-troll` |
| Crimson Wyvern | `crimson-wyvern` |
| Iron Golem | `iron-golem` |
| Skeleton King | `skeleton-king` |
| The Void Dragon | `void-dragon` |
| High Priestess Elara | `high-priestess-elara` |
| Grand Wizard Arcanus | `grand-wizard-arcanus` |
| Knight Commander Valerius | `knight-commander-valerius` |
| Lich Queen Morwenna | `lich-queen-morwenna` |
| การ์ดตัวเลข | `1` `2` `3` `4` `5` `6` `7` `8` `9` `10` `20` `50` |
| ดาบ (+) | `plus` |
| เคียว (−) | `minus` |
| ลูกตุ้ม (×) | `multiply` |
| ถุงมือ ( ) | `bracket` |

ไม่ต้องใส่ครบทุกใบก็ได้ ช่องที่ไม่มีรูปจะใช้ภาพสัญลักษณ์เดิม

## ขนาดรูปที่แนะนำ

**ด้านยาวสุดไม่เกิน 600px และไฟล์ละไม่เกิน 150 KB**

เพราะรูปทุกใบถูกฝังลงในไฟล์ HTML ไฟล์เดียว ถ้ารูปใหญ่เกินไป
ไฟล์จะโตจนเด็กเปิดผ่านเน็ตมือถือได้ช้า และเกิน 16 MB จะเผยแพร่ไม่ได้

## สร้างไฟล์เกมพร้อมรูป

```bash
node src/divisorDuel/web/bake.mjs assets/cards divisor-duel.html
```

สคริปต์จะบอกว่าฝังรูปใบไหนไปแล้วบ้าง ใบไหนยังขาด และไฟล์ใหญ่แค่ไหน
รันซ้ำได้เรื่อย ๆ รูปชุดเดิมจะถูกแทนที่ ไม่ทับซ้อนกัน
