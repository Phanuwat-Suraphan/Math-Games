import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * ตอนเปิดในเครื่องตัวเอง เว็บอยู่ที่ราก (/) จึงใช้ค่าเริ่มต้นได้เลย
 *
 * แต่บน GitHub Pages เว็บถูกวางไว้ใต้ชื่อโปรเจกต์ เช่น /Math-Games/
 * ถ้าไม่ตั้ง base ให้ตรง ไฟล์ JS กับ CSS จะโหลดไม่เจอ หน้าเว็บจะขาวเปล่า
 * ค่านี้ตั้งจาก workflow ตอน build ผ่านตัวแปร VITE_BASE_PATH
 */
export default defineConfig({
  base: process.env.VITE_BASE_PATH ?? '/',
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
  },
})
