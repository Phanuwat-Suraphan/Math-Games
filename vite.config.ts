import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * ตอนเปิดในเครื่องตัวเอง เว็บอยู่ที่ราก (/) จึงใช้ค่าเริ่มต้นนี้ได้เลย
 *
 * บน GitHub Pages เว็บถูกวางไว้ใต้ชื่อโปรเจกต์ เช่น /Math-Games/
 * ถ้า base ไม่ตรง ไฟล์ JS กับ CSS จะโหลดไม่เจอแล้วหน้าเว็บจะขาวเปล่า
 * ตอน build จึงส่งค่ามาทาง command line แทน:
 *
 *   npm run build -- --base=/Math-Games/
 *
 * ตั้งใจไม่อ่านจาก process.env เพราะโปรเจกต์นี้ไม่ได้ลง @types/node
 * การอ้าง process ในไฟล์นี้จะทำให้ tsc ทั้งโปรเจกต์ไม่ผ่าน
 */
export default defineConfig({
  base: '/',
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
  },
})
