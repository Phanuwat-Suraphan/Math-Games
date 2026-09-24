/**
 * อ่านออกเสียงภาษาไทยด้วยเสียงของเครื่อง (Web Speech API)
 *
 * ไม่ต้องโหลดไฟล์เสียง ใช้ได้แม้ออฟไลน์ ถ้าเครื่องมีเสียงภาษาไทย (Android, iPhone, iPad, Mac มีเกือบทุกเครื่อง
 * Windows บางเครื่องต้องติดตั้งภาษาไทยในตั้งค่าเสียงพูดก่อน) เครื่องที่ไม่มี Web Speech เลยจะซ่อนปุ่มฟังโจทย์
 */

export function speechSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window && typeof window.SpeechSynthesisUtterance !== 'undefined'
}

/** อ่านข้อความ ตัดเสียงที่กำลังอ่านอยู่ก่อนเสมอ (กดซ้ำคือเริ่มอ่านใหม่ ไม่ซ้อนกัน) */
export function speak(text: string): void {
  if (!speechSupported() || !text) return
  try {
    const synth = window.speechSynthesis
    synth.cancel()
    const u = new window.SpeechSynthesisUtterance(text)
    u.lang = 'th-TH'
    const thai = synth.getVoices().find((v) => v.lang.toLowerCase().replace('_', '-').startsWith('th'))
    if (thai) u.voice = thai
    // เด็กเล็กฟังทันเมื่อช้ากว่าปกติเล็กน้อย
    u.rate = 0.85
    synth.speak(u)
  } catch {
    // อ่านไม่ได้ก็เงียบไป เกมเล่นต่อได้ตามปกติ
  }
}

export function stopSpeaking(): void {
  if (!speechSupported()) return
  try {
    window.speechSynthesis.cancel()
  } catch {
    // ไม่เป็นไร
  }
}
