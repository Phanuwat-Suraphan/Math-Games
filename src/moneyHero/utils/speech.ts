/**
 * อ่านโจทย์ให้ฟัง (ช่วยเด็กที่อ่านช้า)
 * ใช้เสียงภาษาไทยของเครื่อง ถ้าเครื่องไม่มีเสียงไทยก็ยังพยายามอ่าน
 */

let enabled = true

export function setSpeechEnabled(on: boolean): void {
  enabled = on
  if (!on) stopSpeaking()
}

export function speechAvailable(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}

/** อ่านตัวเลขเงินให้เป็นภาษาพูด เช่น 25.50 → 25 บาท 50 สตางค์ */
function spoken(text: string): string {
  return text
    .replace(/(\d[\d,]*)\.(\d{2})\s*บาท/g, (_, b: string, s: string) =>
      s === '00' ? `${b} บาท` : `${b} บาท ${Number(s)} สตางค์`,
    )
    .replace(/[🦸🐰🦊🐻🦉💡📖🔄✔✘▶]/gu, '')
}

export function speak(text: string): void {
  if (!enabled || !speechAvailable()) return
  try {
    window.speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(spoken(text))
    u.lang = 'th-TH'
    u.rate = 0.9
    const thai = window.speechSynthesis.getVoices().find((v) => v.lang.startsWith('th'))
    if (thai) u.voice = thai
    window.speechSynthesis.speak(u)
  } catch {
    // บางเบราว์เซอร์ไม่รองรับ ไม่ต้องทำอะไร
  }
}

export function stopSpeaking(): void {
  if (!speechAvailable()) return
  try {
    window.speechSynthesis.cancel()
  } catch {
    // ไม่ต้องทำอะไร
  }
}
