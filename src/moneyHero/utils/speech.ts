/**
 * เสียงพูดภาษาไทย (อ่านโจทย์ บทเรียน และคำชมของตัวละคร)
 *
 * - เลือกเสียงภาษาไทยของเครื่องเสมอ (รอรายชื่อเสียงโหลดก่อน เพราะ Chrome โหลดช้า
 *   ถ้าพูดทันทีจะได้เสียงภาษาอังกฤษอ่านภาษาไทย)
 * - แปลงข้อความให้อ่านเป็นภาษาไทยล้วน: ตัดอีโมจิ (ไม่ให้อ่านชื่ออีโมจิเป็นภาษาอังกฤษ)
 *   อ่านเครื่องหมายคำนวณ และคำภาษาอังกฤษในเกมเป็นคำไทย
 */

let enabled = true
let voices: SpeechSynthesisVoice[] = []
const listeners = new Set<() => void>()

export function setSpeechEnabled(on: boolean): void {
  enabled = on
  if (!on) stopSpeaking()
}

export function speechAvailable(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}

function loadVoices(): void {
  try {
    voices = window.speechSynthesis.getVoices()
  } catch {
    voices = []
  }
  listeners.forEach((fn) => fn())
}

if (speechAvailable()) {
  loadVoices()
  try {
    window.speechSynthesis.addEventListener('voiceschanged', loadVoices)
  } catch {
    // เบราว์เซอร์เก่าไม่มี event นี้ ใช้รายชื่อที่โหลดได้
  }
}

/** แจ้งเมื่อรายชื่อเสียงของเครื่องเปลี่ยน (คืนฟังก์ชันยกเลิก) */
export function onVoicesChanged(fn: () => void): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

function isThai(v: { lang: string }): boolean {
  return v.lang.toLowerCase().replace('_', '-').startsWith('th')
}

/** เลือกเสียงภาษาไทยที่ดีที่สุด (เสียงคุณภาพสูงก่อน) ไม่มีคืน null */
export function pickThaiVoice<V extends { lang: string; name: string; localService?: boolean }>(list: readonly V[]): V | null {
  const thai = list.filter(isThai)
  if (thai.length === 0) return null
  const score = (v: V) => {
    let s = 0
    if (/premium|enhanced|natural|neural/i.test(v.name)) s += 4
    if (/google/i.test(v.name)) s += 3
    if (/narisa|kanya|premwadee|achara|niwat/i.test(v.name)) s += 2
    if (v.localService) s += 1
    return s
  }
  return thai.slice().sort((a, b) => score(b) - score(a))[0]
}

export function hasThaiVoice(): boolean {
  return pickThaiVoice(voices) !== null
}

/** คำภาษาอังกฤษในเกม → คำอ่านภาษาไทย */
const WORDS: [RegExp, string][] = [
  [/MONEY\s*HERO/gi, 'มันนี่ฮีโร่'],
  [/MONEY\s*MASTER/gi, 'มันนี่มาสเตอร์'],
  [/MONEY\s*STAR/gi, 'ดาวเงินทอง'],
  [/\bMISSION\s+COMPLETE\b/gi, 'ภารกิจสำเร็จ'],
  [/\bEXP\b/gi, 'แต้มประสบการณ์'],
  [/\bBOSS\b/gi, 'บอส'],
  [/\bMISSION\b/gi, 'ภารกิจ'],
  [/\bPRACTICE\b/gi, 'ฝึกซ้อม'],
  [/\bLEARN\b/gi, 'เรียนรู้'],
  [/\bSTEP\b/gi, 'ขั้น'],
  [/\bAR\b/g, 'เออาร์'],
  [/\bOK\b/gi, 'โอเค'],
  [/\bVS\b/g, 'ปะทะ'],
]

/** แปลงข้อความให้อ่านออกเสียงเป็นภาษาไทยล้วน */
export function spoken(text: string): string {
  let s = text
    // 25.50 บาท → 25 บาท 50 สตางค์
    .replace(/(\d[\d,]*)\.(\d{2})\s*บาท/g, (_, b: string, st: string) => (st === '00' ? `${b} บาท` : `${b} บาท ${Number(st)} สตางค์`))
    .replace(/฿\s*(\d[\d,]*(?:\.\d+)?)/g, '$1 บาท')
  for (const [re, th] of WORDS) s = s.replace(re, th)
  s = s
    // เครื่องหมายคำนวณ
    .replace(/(\d)\s*[×xX*]\s*(?=\d)/g, '$1 คูณ ')
    .replace(/\s*÷\s*/g, ' หาร ')
    .replace(/(\d)\s*\+\s*(?=\d)/g, '$1 บวก ')
    .replace(/(\d)\s*[−–-]\s*(?=\d)/g, '$1 ลบ ')
    .replace(/\s*=\s*/g, ' เท่ากับ ')
    .replace(/(\d)\s*\/\s*(?=\d)/g, '$1 จาก ')
    .replace(/(\d)\s*%/g, '$1 เปอร์เซ็นต์')
    // อีโมจิ ดาว ลูกศร และสัญลักษณ์ตกแต่ง (ไม่ให้อ่านชื่อภาษาอังกฤษ)
    .replace(/[\p{Extended_Pictographic}\u{FE0F}\u{200D}\u{20E3}★☆✔✘✕↺▶◀►•·→←…]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return s
}

/** พูดข้อความ (queue = ต่อคิวหลังประโยคที่กำลังพูด ไม่ตัดทิ้ง) */
export function speak(text: string, opts: { queue?: boolean } = {}): void {
  if (!enabled || !speechAvailable()) return
  const say = spoken(text)
  if (!say) return
  let done = false
  const run = () => {
    if (done) return
    done = true
    try {
      const synth = window.speechSynthesis
      if (!opts.queue) synth.cancel()
      const u = new SpeechSynthesisUtterance(say)
      u.lang = 'th-TH'
      u.rate = 0.9
      u.pitch = 1.05
      const thai = pickThaiVoice(voices)
      if (thai) u.voice = thai
      synth.speak(u)
    } catch {
      // บางเบราว์เซอร์ไม่รองรับ ไม่ต้องทำอะไร
    }
  }
  if (voices.length === 0) loadVoices()
  if (voices.length > 0) {
    run()
    return
  }
  // รายชื่อเสียงยังไม่มา รอสักครู่ จะได้เสียงไทยแทนเสียงอังกฤษ
  const stop = onVoicesChanged(() => {
    if (voices.length === 0) return
    stop()
    run()
  })
  window.setTimeout(() => {
    stop()
    run()
  }, 700)
}

export function stopSpeaking(): void {
  if (!speechAvailable()) return
  try {
    window.speechSynthesis.cancel()
  } catch {
    // ไม่ต้องทำอะไร
  }
}
