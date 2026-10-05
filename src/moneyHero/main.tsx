import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles/money.css'

/**
 * จุดเริ่มของ MONEY HERO (แยกจากเกมอื่นในโปรเจกต์ เปิดที่ money-hero.html)
 */
const container = document.getElementById('root')
if (!container) throw new Error('ไม่พบ #root')

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Progressive Web App: ติดตั้งลงเครื่องและเปิดได้แม้ออฟไลน์ (เฉพาะตอน build จริง)
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}money-hero-sw.js`).catch(() => undefined)
  })
}
