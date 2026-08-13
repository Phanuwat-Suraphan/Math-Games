/**
 * เสียงประกอบแบบสังเคราะห์ด้วย Web Audio API
 * ไม่ต้องโหลดไฟล์เสียงจากภายนอก และถ้าเบราว์เซอร์ไม่รองรับก็จะเงียบไปเฉย ๆ ไม่ทำให้เกมพัง
 */

export type SfxName = 'correct' | 'wrong' | 'coin' | 'levelUp' | 'click'

let audioContext: AudioContext | null = null
let soundEnabled = true
let musicEnabled = true

interface ToneStep {
  frequency: number
  duration: number
  delay: number
  type: OscillatorType
  gain: number
}

const PATTERNS: Record<SfxName, ToneStep[]> = {
  correct: [
    { frequency: 660, duration: 0.11, delay: 0, type: 'sine', gain: 0.16 },
    { frequency: 880, duration: 0.16, delay: 0.1, type: 'sine', gain: 0.16 },
  ],
  wrong: [
    { frequency: 240, duration: 0.16, delay: 0, type: 'triangle', gain: 0.12 },
  ],
  coin: [
    { frequency: 1046, duration: 0.07, delay: 0, type: 'square', gain: 0.07 },
    { frequency: 1318, duration: 0.09, delay: 0.06, type: 'square', gain: 0.07 },
  ],
  levelUp: [
    { frequency: 523, duration: 0.12, delay: 0, type: 'sine', gain: 0.15 },
    { frequency: 659, duration: 0.12, delay: 0.11, type: 'sine', gain: 0.15 },
    { frequency: 784, duration: 0.12, delay: 0.22, type: 'sine', gain: 0.15 },
    { frequency: 1046, duration: 0.24, delay: 0.33, type: 'sine', gain: 0.15 },
  ],
  click: [
    { frequency: 420, duration: 0.05, delay: 0, type: 'sine', gain: 0.08 },
  ],
}

function getContext(): AudioContext | null {
  if (typeof window === 'undefined') return null

  if (!audioContext) {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext

    if (!Ctor) return null

    try {
      audioContext = new Ctor()
    } catch {
      return null
    }
  }

  return audioContext
}

export function setSoundEnabled(value: boolean): void {
  soundEnabled = value
}

export function isSoundEnabled(): boolean {
  return soundEnabled
}

/**
 * เปิด/ปิดดนตรีประกอบ
 * Part 2 ยังไม่มีไฟล์เพลง จึงเก็บสถานะไว้ก่อนเพื่อให้ Part ถัดไปต่อยอดได้ทันที
 */
export function setMusicEnabled(value: boolean): void {
  musicEnabled = value
}

export function isMusicEnabled(): boolean {
  return musicEnabled
}

export function playSfx(name: SfxName): void {
  if (!soundEnabled) return

  const context = getContext()
  if (!context) return

  try {
    if (context.state === 'suspended') {
      void context.resume()
    }

    const now = context.currentTime
    for (const step of PATTERNS[name]) {
      const oscillator = context.createOscillator()
      const gainNode = context.createGain()

      oscillator.type = step.type
      oscillator.frequency.setValueAtTime(step.frequency, now + step.delay)

      gainNode.gain.setValueAtTime(0.0001, now + step.delay)
      gainNode.gain.exponentialRampToValueAtTime(
        step.gain,
        now + step.delay + 0.02,
      )
      gainNode.gain.exponentialRampToValueAtTime(
        0.0001,
        now + step.delay + step.duration,
      )

      oscillator.connect(gainNode)
      gainNode.connect(context.destination)
      oscillator.start(now + step.delay)
      oscillator.stop(now + step.delay + step.duration + 0.02)
    }
  } catch {
    // ถ้าเล่นเสียงไม่ได้ ให้เกมทำงานต่อโดยไม่มีเสียง
  }
}
