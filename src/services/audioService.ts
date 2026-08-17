/**
 * เสียงประกอบแบบสังเคราะห์ด้วย Web Audio API
 * ไม่ต้องโหลดไฟล์เสียงจากภายนอก และถ้าเบราว์เซอร์ไม่รองรับก็จะเงียบไปเฉย ๆ ไม่ทำให้เกมพัง
 */

/**
 * เสียงประกอบทั้งหมดของเกม
 *
 * เดิมมีอยู่ห้าเสียง ซึ่งพอสำหรับหน้าจอที่มีแต่ปุ่มกับคำตอบถูกผิด
 * แต่สนามรบมีมอนเป็นร้อยตัวล้มลงต่อรอบโดยไม่มีเสียงอะไรเลยสักเสียง
 * เกมที่ภาพขยับแต่ไม่มีเสียงตอบกลับ จะรู้สึกเหมือนดูมากกว่าเหมือนเล่น
 */
export type SfxName =
  | 'correct'
  | 'wrong'
  | 'coin'
  | 'levelUp'
  | 'click'
  // เสียงของการต่อสู้
  | 'hit'
  | 'kill'
  | 'crit'
  | 'explode'
  | 'zap'
  | 'freeze'
  | 'hurt'
  // เสียงของเหตุการณ์ใหญ่
  | 'bossRoar'
  | 'evolve'
  | 'ultimate'
  | 'chest'
  | 'heal'
  | 'pickup'
  | 'gameOver'
  | 'victory'

let audioContext: AudioContext | null = null
let soundEnabled = true

interface ToneStep {
  frequency: number
  /**
   * ถ้าใส่ค่านี้ เสียงจะกวาดจาก frequency ไปหาค่านี้ตลอดความยาว
   *
   * การกวาดความถี่คือสิ่งที่แยก "เสียงปี๊บ" ออกจาก "เสียงของเหตุการณ์"
   * เสียงระเบิดคือกวาดลง เสียงเก็บของคือกวาดขึ้น
   * ถ้าไม่มีการกวาด ทุกเสียงในเกมจะฟังเหมือนกันหมดต่างกันแค่ระดับเสียง
   */
  sweepTo?: number
  duration: number
  delay: number
  type: OscillatorType
  gain: number
  /** ใช้เสียงซ่าแทนคลื่นเสียง สำหรับเสียงตี เสียงระเบิด และเสียงลม */
  noise?: boolean
  /** กรองเสียงซ่าให้เหลือย่านนี้ ใช้ได้เฉพาะกับ noise */
  filterHz?: number
}

const PATTERNS: Record<SfxName, ToneStep[]> = {
  correct: [
    { frequency: 660, duration: 0.11, delay: 0, type: 'sine', gain: 0.16 },
    { frequency: 880, duration: 0.16, delay: 0.1, type: 'sine', gain: 0.16 },
  ],
  wrong: [
    { frequency: 240, sweepTo: 150, duration: 0.18, delay: 0, type: 'triangle', gain: 0.12 },
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

  /*
   * เสียงตีต้องสั้นมากและเบามาก เพราะดังหลายสิบครั้งต่อวินาที
   * เสียงตีที่ดังกำลังดีตอนฟังทีละครั้ง จะกลายเป็นเสียงรบกวนต่อเนื่องในเกมจริง
   */
  hit: [
    { frequency: 900, duration: 0.045, delay: 0, type: 'square', gain: 0.045, noise: true, filterHz: 1800 },
  ],
  kill: [
    { frequency: 420, sweepTo: 150, duration: 0.11, delay: 0, type: 'square', gain: 0.07 },
  ],
  crit: [
    { frequency: 1200, sweepTo: 500, duration: 0.09, delay: 0, type: 'square', gain: 0.1 },
    { frequency: 300, duration: 0.08, delay: 0.03, type: 'sawtooth', gain: 0.07 },
  ],
  explode: [
    { frequency: 240, sweepTo: 40, duration: 0.34, delay: 0, type: 'sine', gain: 0.16, noise: true, filterHz: 420 },
    { frequency: 90, sweepTo: 35, duration: 0.3, delay: 0, type: 'sine', gain: 0.14 },
  ],
  zap: [
    { frequency: 2400, sweepTo: 700, duration: 0.09, delay: 0, type: 'sawtooth', gain: 0.08 },
    { frequency: 1600, duration: 0.05, delay: 0.05, type: 'square', gain: 0.05 },
  ],
  freeze: [
    { frequency: 1800, sweepTo: 2600, duration: 0.18, delay: 0, type: 'sine', gain: 0.07 },
    { frequency: 3200, duration: 0.12, delay: 0.08, type: 'sine', gain: 0.045 },
  ],
  /* เสียงตอนเด็กโดนตี ต้องต่ำและทู่ ให้รู้ได้โดยไม่ต้องมองแถบเลือด */
  hurt: [
    { frequency: 200, sweepTo: 90, duration: 0.2, delay: 0, type: 'sawtooth', gain: 0.13 },
  ],

  bossRoar: [
    { frequency: 130, sweepTo: 58, duration: 0.75, delay: 0, type: 'sawtooth', gain: 0.2 },
    { frequency: 260, sweepTo: 110, duration: 0.6, delay: 0.05, type: 'square', gain: 0.09 },
    { frequency: 300, sweepTo: 80, duration: 0.5, delay: 0.1, type: 'sine', gain: 0.12, noise: true, filterHz: 300 },
  ],
  evolve: [
    { frequency: 392, duration: 0.14, delay: 0, type: 'sine', gain: 0.16 },
    { frequency: 523, duration: 0.14, delay: 0.12, type: 'sine', gain: 0.16 },
    { frequency: 659, duration: 0.14, delay: 0.24, type: 'sine', gain: 0.16 },
    { frequency: 784, duration: 0.16, delay: 0.36, type: 'square', gain: 0.13 },
    { frequency: 1046, duration: 0.45, delay: 0.48, type: 'sine', gain: 0.18 },
  ],
  ultimate: [
    { frequency: 120, sweepTo: 1400, duration: 0.35, delay: 0, type: 'sawtooth', gain: 0.13 },
    { frequency: 1400, sweepTo: 200, duration: 0.4, delay: 0.3, type: 'square', gain: 0.12 },
    { frequency: 600, sweepTo: 120, duration: 0.5, delay: 0.32, type: 'sine', gain: 0.14, noise: true, filterHz: 900 },
  ],
  chest: [
    { frequency: 700, duration: 0.08, delay: 0, type: 'square', gain: 0.09 },
    { frequency: 1046, duration: 0.1, delay: 0.08, type: 'square', gain: 0.09 },
    { frequency: 1568, duration: 0.28, delay: 0.17, type: 'sine', gain: 0.12 },
  ],
  heal: [
    { frequency: 523, sweepTo: 784, duration: 0.26, delay: 0, type: 'sine', gain: 0.12 },
  ],
  pickup: [
    { frequency: 880, sweepTo: 1320, duration: 0.07, delay: 0, type: 'sine', gain: 0.055 },
  ],
  gameOver: [
    { frequency: 392, duration: 0.22, delay: 0, type: 'triangle', gain: 0.14 },
    { frequency: 330, duration: 0.22, delay: 0.2, type: 'triangle', gain: 0.14 },
    { frequency: 262, duration: 0.55, delay: 0.4, type: 'triangle', gain: 0.14 },
  ],
  victory: [
    { frequency: 523, duration: 0.13, delay: 0, type: 'square', gain: 0.13 },
    { frequency: 659, duration: 0.13, delay: 0.12, type: 'square', gain: 0.13 },
    { frequency: 784, duration: 0.13, delay: 0.24, type: 'square', gain: 0.13 },
    { frequency: 1046, duration: 0.5, delay: 0.36, type: 'square', gain: 0.15 },
  ],
}

/**
 * บริบทเสียงที่ใช้ร่วมกันทั้งเกม
 *
 * เบราว์เซอร์จำกัดจำนวน AudioContext ต่อหน้าไว้ไม่กี่ตัว
 * ถ้าเสียงประกอบกับดนตรีต่างคนต่างสร้าง จะมีบางเครื่องที่ตัวที่สองสร้างไม่ได้
 * แล้วดนตรีจะเงียบเฉพาะบนเครื่องนั้นโดยไม่มีอะไรฟ้อง
 */
export function getAudioContext(): AudioContext | null {
  return getContext()
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
 * บัฟเฟอร์เสียงซ่า สร้างครั้งเดียวแล้วใช้ซ้ำ
 *
 * สร้างใหม่ทุกครั้งที่เล่นเสียงจะกินซีพียูจนเฟรมตกในสนามรบ
 * เพราะเสียงตีดังหลายสิบครั้งต่อวินาที
 */
let noiseBuffer: AudioBuffer | null = null

function getNoiseBuffer(context: AudioContext): AudioBuffer {
  if (noiseBuffer && noiseBuffer.sampleRate === context.sampleRate) {
    return noiseBuffer
  }

  const frames = Math.floor(context.sampleRate * 0.6)
  const buffer = context.createBuffer(1, frames, context.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < frames; i += 1) data[i] = Math.random() * 2 - 1

  noiseBuffer = buffer
  return buffer
}

/** ต่อแหล่งเสียงหนึ่งขั้นเข้ากับปลายทาง แล้วสั่งเล่น */
function playStep(context: AudioContext, step: ToneStep, now: number): void {
  const startAt = now + step.delay
  const endAt = startAt + step.duration
  const gainNode = context.createGain()

  /*
   * ใช้ exponentialRamp เพราะหูคนรับความดังเป็นสัดส่วน ไม่ใช่เป็นเส้นตรง
   * การไต่แบบเส้นตรงจะได้ยินเป็น "ดังทันที แล้วหางยาว" ซึ่งฟังเหมือนเสียงรั่ว
   * ค่าเริ่มต้นต้องไม่เป็นศูนย์ เพราะ exponential ผ่านศูนย์ไม่ได้
   */
  gainNode.gain.setValueAtTime(0.0001, startAt)
  gainNode.gain.exponentialRampToValueAtTime(step.gain, startAt + 0.015)
  gainNode.gain.exponentialRampToValueAtTime(0.0001, endAt)

  let tail: AudioNode = gainNode
  if (step.noise && step.filterHz) {
    const filter = context.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.setValueAtTime(step.filterHz, startAt)
    gainNode.connect(filter)
    tail = filter
  }
  tail.connect(context.destination)

  if (step.noise) {
    const source = context.createBufferSource()
    source.buffer = getNoiseBuffer(context)
    source.connect(gainNode)
    source.start(startAt)
    source.stop(endAt + 0.02)
    return
  }

  const oscillator = context.createOscillator()
  oscillator.type = step.type
  oscillator.frequency.setValueAtTime(step.frequency, startAt)
  if (step.sweepTo !== undefined) {
    // ความถี่ต้องไม่ถึงศูนย์ ด้วยเหตุผลเดียวกับความดัง
    oscillator.frequency.exponentialRampToValueAtTime(
      Math.max(20, step.sweepTo),
      endAt,
    )
  }
  oscillator.connect(gainNode)
  oscillator.start(startAt)
  oscillator.stop(endAt + 0.02)
}

/**
 * เวลาที่เล่นเสียงแต่ละชนิดไปล่าสุด
 *
 * สนามรบยิงเสียงตีพร้อมกันได้หลายสิบครั้งในเฟรมเดียว
 * ถ้าเล่นทุกครั้ง เสียงจะซ้อนกันจนดังกว่าเสียงอื่นทั้งหมดรวมกัน
 * และเบราว์เซอร์จะสร้าง oscillator ไม่ทันจนเฟรมตก
 * จึงกันไม่ให้เสียงชนิดเดียวกันเล่นถี่เกินช่วงเวลาที่กำหนด
 */
const lastPlayedAt = new Map<SfxName, number>()

/** เสียงที่ดังถี่มากจนต้องกันไว้ พร้อมช่วงห่างขั้นต่ำเป็นวินาที */
const MIN_GAP: Partial<Record<SfxName, number>> = {
  hit: 0.055,
  kill: 0.05,
  zap: 0.07,
  freeze: 0.09,
  pickup: 0.06,
  crit: 0.08,
  explode: 0.09,
  hurt: 0.25,
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

    const gap = MIN_GAP[name]
    if (gap !== undefined) {
      const previous = lastPlayedAt.get(name)
      if (previous !== undefined && now - previous < gap) return
      lastPlayedAt.set(name, now)
    }

    for (const step of PATTERNS[name]) {
      playStep(context, step, now)
    }
  } catch {
    // ถ้าเล่นเสียงไม่ได้ ให้เกมทำงานต่อโดยไม่มีเสียง
  }
}
