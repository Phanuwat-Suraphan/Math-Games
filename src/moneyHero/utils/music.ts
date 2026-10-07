/**
 * เพลงประกอบเบา ๆ สังเคราะห์สด ไม่ต้องโหลดไฟล์เสียง
 *
 * ทำนองสดใสบันไดเสียงเพนทาโทนิก (โด เร มี ซอล ลา) วนซ้ำ 8 ห้อง พร้อมเบสและเสียงกุ๊งกิ๊ง
 * เล่นเฉพาะหน้าเริ่มเกมกับแผนที่ ตอนทำโจทย์จะเงียบ เด็กจะได้มีสมาธิ
 *
 * เบราว์เซอร์ไม่ยอมให้เล่นเสียงเองก่อนผู้ใช้แตะจอ จึงรอแตะครั้งแรกแล้วค่อยเริ่ม
 */

const BPM = 112
const EIGHTH = 60 / BPM / 2
const VOLUME = 0.055

/** ทำนอง: [โน้ต MIDI หรือ null = เงียบ, ความยาวเป็นตัวเขบ็ต 1 ชั้น] */
const MELODY: [number | null, number][] = [
  [76, 1], [79, 1], [81, 2], [79, 1], [76, 1], [74, 2],
  [72, 1], [74, 1], [76, 2], [79, 2], [76, 2],
  [76, 1], [79, 1], [84, 2], [81, 1], [79, 1], [76, 2],
  [74, 1], [76, 1], [74, 1], [72, 1], [72, 4],
  [79, 1], [81, 1], [84, 2], [81, 1], [79, 1], [76, 2],
  [79, 1], [76, 1], [74, 2], [72, 2], [74, 2],
  [76, 1], [79, 1], [81, 1], [84, 1], [81, 2], [79, 2],
  [76, 1], [74, 1], [72, 2], [null, 4],
]

/** เบส: ห้องละ 1 ตัว (C G Am F วนสองรอบ) */
const BASS = [48, 43, 45, 41, 48, 43, 45, 41]

const LOOP_EIGHTHS = MELODY.reduce((s, [, len]) => s + len, 0)

function hz(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12)
}

let ctx: AudioContext | null = null
let master: GainNode | null = null
let timer: number | null = null
let wanted = false
let enabled = true
let loopStart = 0
let scheduledUntil = 0

function audio(): AudioContext | null {
  if (typeof window === 'undefined') return null
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctor) return null
  if (!ctx) {
    try {
      ctx = new Ctor()
      master = ctx.createGain()
      master.gain.value = VOLUME
      master.connect(ctx.destination)
    } catch {
      return null
    }
  }
  return ctx
}

function note(ac: AudioContext, freq: number, start: number, dur: number, type: OscillatorType, gain: number): void {
  if (!master) return
  const osc = ac.createOscillator()
  const g = ac.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, start)
  g.gain.setValueAtTime(0.0001, start)
  g.gain.exponentialRampToValueAtTime(gain, start + 0.02)
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur)
  osc.connect(g)
  g.connect(master)
  osc.start(start)
  osc.stop(start + dur + 0.05)
}

/** จองโน้ตล่วงหน้าราว 1 วินาที (ตัวจับเวลาเรียกทุก 250ms) */
function schedule(): void {
  const ac = ctx
  if (!ac || ac.state !== 'running') return
  // เพิ่งปลดล็อกเสียง (หรือแท็บกลับมา) ให้เริ่มทำนองใหม่จากตอนนี้ ไม่ใช่เล่นโน้ตค้างพร้อมกันหมด
  if (scheduledUntil < ac.currentTime) {
    loopStart = ac.currentTime + 0.1
    scheduledUntil = loopStart
  }
  const horizon = ac.currentTime + 1
  while (scheduledUntil < horizon) {
    const loopLen = LOOP_EIGHTHS * EIGHTH
    const loopIndex = Math.floor((scheduledUntil - loopStart) / loopLen)
    const base = loopStart + loopIndex * loopLen
    let t = base
    for (const [m, len] of MELODY) {
      if (t >= scheduledUntil && t < scheduledUntil + loopLen && m !== null) {
        note(ac, hz(m), t, len * EIGHTH * 0.95, 'triangle', 0.5)
        // เสียงกุ๊งกิ๊งสูงขึ้นหนึ่งคู่แปด เบา ๆ
        if (len >= 2) note(ac, hz(m + 12), t, 0.18, 'sine', 0.12)
      }
      t += len * EIGHTH
    }
    BASS.forEach((m, bar) => {
      const bt = base + bar * 8 * EIGHTH
      for (const beat of [0, 4]) note(ac, hz(m), bt + beat * EIGHTH, EIGHTH * 3, 'sine', 0.42)
    })
    scheduledUntil = base + loopLen
  }
}

function begin(): void {
  const ac = audio()
  if (!ac || timer !== null) return
  if (ac.state === 'suspended') void ac.resume().catch(() => undefined)
  if (master) {
    master.gain.cancelScheduledValues(ac.currentTime)
    master.gain.setValueAtTime(0.0001, ac.currentTime)
    master.gain.exponentialRampToValueAtTime(VOLUME, ac.currentTime + 0.8)
  }
  loopStart = ac.currentTime + 0.1
  scheduledUntil = loopStart
  schedule()
  timer = window.setInterval(schedule, 250)
}

function end(): void {
  if (timer !== null) {
    window.clearInterval(timer)
    timer = null
  }
  const ac = ctx
  if (ac && master) {
    // ค่อย ๆ เบาลงแล้วตัดโน้ตที่จองไว้ (สร้าง gain ใหม่ โน้ตเก่าจะไม่ดังต่อ)
    const old = master
    old.gain.cancelScheduledValues(ac.currentTime)
    old.gain.setValueAtTime(Math.max(0.0001, old.gain.value), ac.currentTime)
    old.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 0.3)
    window.setTimeout(() => old.disconnect(), 400)
    master = ac.createGain()
    master.gain.value = VOLUME
    master.connect(ac.destination)
  }
}

function sync(): void {
  const hidden = typeof document !== 'undefined' && document.visibilityState === 'hidden'
  if (wanted && enabled && !hidden) begin()
  else end()
}

let gestureHooked = false
function hookGesture(): void {
  if (gestureHooked || typeof window === 'undefined') return
  gestureHooked = true
  const kick = () => {
    if (ctx?.state === 'suspended') void ctx.resume().then(sync, () => undefined)
    else sync()
  }
  window.addEventListener('pointerdown', kick, { passive: true })
  window.addEventListener('keydown', kick)
  document.addEventListener('visibilitychange', sync)
}

export function setMusicEnabled(on: boolean): void {
  enabled = on
  sync()
}

/** เรียกเมื่อเข้าหน้าที่มีเพลง (true) และออก (false) */
export function wantMusic(on: boolean): void {
  wanted = on
  hookGesture()
  sync()
}
