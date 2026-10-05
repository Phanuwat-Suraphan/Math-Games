/**
 * เสียงประกอบ สังเคราะห์ด้วย Web Audio ไม่ต้องโหลดไฟล์เสียง
 * กดปุ่ม · ตอบถูก · ตอบผิด · ผ่านด่าน · รับเหรียญ · ได้ดาว · ชนะบอส
 */

export type SoundName = 'click' | 'correct' | 'wrong' | 'complete' | 'coin' | 'star' | 'boss' | 'jump' | 'unlock'

let enabled = true
let ctx: AudioContext | null = null

export function setSoundEnabled(on: boolean): void {
  enabled = on
}

export function isSoundEnabled(): boolean {
  return enabled
}

function audio(): AudioContext | null {
  if (typeof window === 'undefined') return null
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctor) return null
  if (!ctx) {
    try {
      ctx = new Ctor()
    } catch {
      return null
    }
  }
  if (ctx.state === 'suspended') void ctx.resume().catch(() => undefined)
  return ctx
}

function tone(ac: AudioContext, freq: number, start: number, dur: number, type: OscillatorType = 'sine', gain = 0.16): void {
  const osc = ac.createOscillator()
  const g = ac.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, start)
  g.gain.setValueAtTime(0.0001, start)
  g.gain.exponentialRampToValueAtTime(gain, start + 0.015)
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur)
  osc.connect(g)
  g.connect(ac.destination)
  osc.start(start)
  osc.stop(start + dur + 0.02)
}

const NOTES: Record<SoundName, [number, number, number, OscillatorType?][]> = {
  click: [[660, 0, 0.06, 'triangle']],
  correct: [
    [660, 0, 0.12, 'triangle'],
    [990, 0.1, 0.22, 'triangle'],
  ],
  // เสียงผิดนุ่ม ๆ ไม่ดุ
  wrong: [
    [392, 0, 0.16, 'sine'],
    [330, 0.14, 0.24, 'sine'],
  ],
  complete: [
    [523, 0, 0.14, 'triangle'],
    [659, 0.12, 0.14, 'triangle'],
    [784, 0.24, 0.14, 'triangle'],
    [1047, 0.36, 0.35, 'triangle'],
  ],
  coin: [
    [988, 0, 0.07, 'square'],
    [1319, 0.06, 0.16, 'square'],
  ],
  star: [
    [1175, 0, 0.1, 'sine'],
    [1568, 0.08, 0.1, 'sine'],
    [2093, 0.16, 0.25, 'sine'],
  ],
  boss: [
    [392, 0, 0.16, 'sawtooth'],
    [523, 0.15, 0.16, 'sawtooth'],
    [659, 0.3, 0.16, 'sawtooth'],
    [784, 0.45, 0.5, 'triangle'],
  ],
  jump: [[520, 0, 0.1, 'square']],
  unlock: [
    [784, 0, 0.1, 'triangle'],
    [1175, 0.1, 0.3, 'triangle'],
  ],
}

export function playSound(name: SoundName): void {
  if (!enabled) return
  const ac = audio()
  if (!ac) return
  const now = ac.currentTime + 0.01
  const quiet = name === 'click' || name === 'jump' || name === 'coin' ? 0.07 : 0.14
  for (const [freq, at, dur, type] of NOTES[name]) tone(ac, freq, now + at, dur, type, quiet)
}
