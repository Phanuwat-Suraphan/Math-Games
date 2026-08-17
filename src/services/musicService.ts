/**
 * ตัวขับดนตรีประกอบ
 *
 * หน้าที่เดียวของไฟล์นี้คือเอารายการโน้ตจาก audio/theme.ts ไปเล่นจริง
 * ไม่มีการตัดสินใจทางดนตรีอยู่ในนี้เลยแม้แต่จุดเดียว
 * ถ้าอยากแก้ว่าเพลงควรฟังเป็นอย่างไร ให้ไปแก้ที่ theme.ts
 *
 * ทำไมต้องตั้งเวลาล่วงหน้าเป็นห้อง แทนที่จะเล่นทีละโน้ตตามนาฬิกาของหน้าจอ
 *
 * setTimeout กับ requestAnimationFrame คลาดเคลื่อนได้หลายสิบมิลลิวินาที
 * และคลาดมากเป็นพิเศษตอนเบราว์เซอร์ยุ่ง ซึ่งในเกมนี้คือตอนที่มอนเต็มจอพอดี
 * ความคลาดขนาดนั้นในดนตรีคือ "จังหวะเพี้ยน" ที่ได้ยินชัดมาก
 *
 * นาฬิกาของ Web Audio เดินด้วยฮาร์ดแวร์เสียงและไม่สะดุดตามหน้าจอ
 * เราจึงใช้ตัวจับเวลาธรรมดาแค่มา "ถามเป็นระยะว่าถึงเวลาจองคิวรอบใหม่หรือยัง"
 * แล้วจองโน้ตล่วงหน้าไว้กับนาฬิกาเสียง ซึ่งเป็นวิธีมาตรฐานของงานลักษณะนี้
 */

import { getAudioContext } from './audioService'
import { barSeconds, renderBar, trackSpec } from '../audio/theme'
import type { NoteEvent, TrackId, Voice } from '../audio/theme'

/** ถามทุกกี่มิลลิวินาทีว่าถึงเวลาจองคิวรอบใหม่หรือยัง */
const TICK_MS = 60

/** จองโน้ตล่วงหน้ากี่วินาที ต้องมากกว่า TICK_MS พอสมควรกันคิวขาด */
const SCHEDULE_AHEAD = 0.35

/**
 * ความดังรวมของดนตรี
 *
 * ต่ำกว่าเสียงประกอบอย่างตั้งใจ ดนตรีเป็นพื้นหลัง ไม่ใช่ข้อมูล
 * เสียงที่บอกเด็กว่าตอบถูกหรือโดนตี ต้องดังกว่าเสมอไม่ว่าเพลงกำลังทำอะไรอยู่
 */
const MASTER_GAIN = 0.13

/** ความดังของแต่ละช่องดนตรี เทียบกับความดังรวม */
const VOICE_GAIN: Record<Voice, number> = {
  bass: 0.9,
  chord: 0.55,
  lead: 0.75,
  drum: 0.5,
}

let musicEnabled = true
let currentTrack: TrackId | null = null
let bus: GainNode | null = null
let timer: number | null = null
let nextBarIndex = 0
let nextBarAt = 0
let noiseBuffer: AudioBuffer | null = null

function getNoise(context: AudioContext): AudioBuffer {
  if (noiseBuffer && noiseBuffer.sampleRate === context.sampleRate) {
    return noiseBuffer
  }
  const frames = Math.floor(context.sampleRate * 0.4)
  const buffer = context.createBuffer(1, frames, context.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < frames; i += 1) data[i] = Math.random() * 2 - 1
  noiseBuffer = buffer
  return buffer
}

function playNote(
  context: AudioContext,
  destination: GainNode,
  note: NoteEvent,
  barStart: number,
  secondsPerBeat: number,
): void {
  const startAt = barStart + note.beat * secondsPerBeat
  const endAt = startAt + note.beats * secondsPerBeat
  const peak = note.gain * VOICE_GAIN[note.voice]

  const gainNode = context.createGain()

  /*
   * ซองเสียง: ไต่ขึ้น ตกลงมานิดหนึ่ง ค้างไว้ แล้วค่อยปล่อย
   *
   * เดิมใช้การไต่ลงจนสุดตลอดความยาวโน้ต ซึ่งเป็นซองของเสียงเคาะ
   * ผลคือคอร์ดที่ควรค้างทั้งห้องจะหายไปตั้งแต่ยังไม่ถึงครึ่ง
   * และเพลงทั้งเพลงเบาผิดปกติ เพราะเสียงส่วนใหญ่กำลังจางอยู่ตลอดเวลา
   * วัดได้จริงตอนเรนเดอร์ออกมาเป็นไฟล์: ค่าเฉลี่ยอยู่ราว -44 dBFS
   * ซึ่งบนลำโพงแท็บเล็ตกลางห้องเรียนคือแทบไม่ได้ยิน
   *
   * กลองยังใช้ซองแบบเคาะเหมือนเดิม เพราะกลองต้องจบเร็วจริง ๆ
   */
  const percussive = note.voice === 'drum'
  const attack = note.voice === 'chord' ? 0.09 : 0.008
  const length = Math.max(0.02, endAt - startAt)

  gainNode.gain.setValueAtTime(0.0001, startAt)
  gainNode.gain.exponentialRampToValueAtTime(peak, startAt + Math.min(attack, length * 0.4))

  if (percussive) {
    gainNode.gain.exponentialRampToValueAtTime(0.0001, endAt)
  } else {
    // ตกลงมาที่ระดับค้าง แล้วอยู่ตรงนั้นจนถึงช่วงปล่อยท้ายโน้ต
    const sustain = peak * 0.62
    const decayEnd = startAt + Math.min(attack + 0.08, length * 0.5)
    const release = Math.min(0.14, length * 0.3)
    const releaseAt = Math.max(decayEnd, endAt - release)

    gainNode.gain.exponentialRampToValueAtTime(sustain, decayEnd)
    gainNode.gain.setValueAtTime(sustain, releaseAt)
    gainNode.gain.exponentialRampToValueAtTime(0.0001, endAt)
  }

  let tail: AudioNode = gainNode
  if (note.wave === 'noise') {
    /* กลองเป็นเสียงซ่าที่ถูกกรอง ความถี่ของโน้ตกลายเป็นความถี่ของฟิลเตอร์
     * กระเดื่องคือย่านต่ำ สแนร์คือย่านกลาง ฉาบคือย่านสูง */
    const filter = context.createBiquadFilter()
    filter.type = note.freq > 3000 ? 'highpass' : 'bandpass'
    filter.frequency.setValueAtTime(note.freq, startAt)
    gainNode.connect(filter)
    tail = filter
  }
  tail.connect(destination)

  if (note.wave === 'noise') {
    const source = context.createBufferSource()
    source.buffer = getNoise(context)
    source.connect(gainNode)
    source.start(startAt)
    source.stop(endAt + 0.02)
    return
  }

  const oscillator = context.createOscillator()
  oscillator.type = note.wave
  oscillator.frequency.setValueAtTime(note.freq, startAt)
  oscillator.connect(gainNode)
  oscillator.start(startAt)
  oscillator.stop(endAt + 0.02)
}

function tick(): void {
  const context = getAudioContext()
  if (!context || !currentTrack || !bus) return

  /*
   * เบราว์เซอร์ห้ามเล่นเสียงก่อนที่ผู้ใช้จะแตะหน้าจอ บริบทจึงหยุดอยู่ตอนแรก
   * ระหว่างนั้นนาฬิกาเสียงไม่เดิน ถ้าเรายังจองคิวต่อไปเรื่อย ๆ
   * พอเด็กกดปุ่มแรก เพลงทั้งหมดที่ค้างอยู่จะดังพร้อมกันทีเดียว
   */
  if (context.state !== 'running') {
    void context.resume()
    nextBarAt = 0
    return
  }

  const spec = trackSpec(currentTrack)
  const secondsPerBeat = 60 / spec.bpm
  const length = barSeconds(currentTrack)

  // ตั้งจุดเริ่มใหม่ถ้ายังไม่เคยตั้ง หรือถ้าตกขบวนไปไกล (เช่นสลับแท็บไปนาน)
  if (nextBarAt === 0 || nextBarAt < context.currentTime - length) {
    nextBarAt = context.currentTime + 0.08
  }

  while (nextBarAt < context.currentTime + SCHEDULE_AHEAD) {
    for (const note of renderBar(currentTrack, nextBarIndex)) {
      playNote(context, bus, note, nextBarAt, secondsPerBeat)
    }
    nextBarAt += length
    nextBarIndex += 1
  }
}

/** ปิดสายเสียงเดิมแบบค่อย ๆ เบาลง โน้ตที่จองค้างไว้จะเงียบไปกับมัน */
function retireBus(context: AudioContext, node: GainNode): void {
  const now = context.currentTime
  try {
    node.gain.cancelScheduledValues(now)
    node.gain.setValueAtTime(node.gain.value, now)
    node.gain.exponentialRampToValueAtTime(0.0001, now + 0.35)
  } catch {
    // ถ้าตั้งค่าไม่ได้ ก็ปล่อยให้ตัดการเชื่อมต่อด้านล่างจัดการแทน
  }
  window.setTimeout(() => {
    try {
      node.disconnect()
    } catch {
      // ตัดการเชื่อมต่อซ้ำไม่เป็นไร
    }
  }, 600)
}

function stopTimer(): void {
  if (timer !== null) {
    window.clearInterval(timer)
    timer = null
  }
}

/**
 * เริ่มเล่นเพลง เรียกซ้ำด้วยเพลงเดิมไม่ทำอะไร
 *
 * การเรียกซ้ำแล้วไม่ทำอะไรสำคัญมาก เพราะหน้าจอ React เรนเดอร์ซ้ำได้ตลอด
 * ถ้าเริ่มใหม่ทุกครั้ง เพลงจะสะดุดกลับไปต้นห้องทุกครั้งที่มีอะไรเปลี่ยนบนจอ
 */
export function playMusic(track: TrackId): void {
  if (currentTrack === track && bus) return

  const context = getAudioContext()
  if (!context) return

  if (bus) retireBus(context, bus)

  currentTrack = track
  nextBarIndex = 0
  nextBarAt = 0

  const node = context.createGain()
  node.gain.setValueAtTime(0.0001, context.currentTime)
  node.gain.exponentialRampToValueAtTime(
    musicEnabled ? MASTER_GAIN : 0.0001,
    context.currentTime + 0.6,
  )
  node.connect(context.destination)
  bus = node

  stopTimer()
  if (!musicEnabled) return

  tick()
  timer = window.setInterval(tick, TICK_MS)
}

export function stopMusic(): void {
  const context = getAudioContext()
  stopTimer()
  if (context && bus) retireBus(context, bus)
  bus = null
  currentTrack = null
  nextBarAt = 0
}

/**
 * เปิดหรือปิดดนตรี
 *
 * ปิดแล้วต้องหยุดจริง ๆ ไม่ใช่แค่หรี่เสียงลง
 * เพราะเหตุผลหลักที่คนปิดเพลงในเกมสำหรับเด็กคือครูกำลังพูดอยู่หน้าห้อง
 * หรือเด็กใส่หูฟังร่วมกับคนอื่น การหรี่ไม่สุดคือการไม่ทำตามที่ขอ
 */
export function setMusicEnabled(value: boolean): void {
  if (musicEnabled === value) return
  musicEnabled = value

  if (!value) {
    const track = currentTrack
    stopMusic()
    // จำเพลงที่ค้างไว้ เพื่อให้เปิดกลับมาแล้วได้เพลงเดิมของหน้านั้น
    currentTrack = track
    stopTimer()
    return
  }

  const track = currentTrack
  currentTrack = null
  if (track) playMusic(track)
}

export function isMusicEnabled(): boolean {
  return musicEnabled
}

/** เพลงที่กำลังเล่นอยู่ ใช้ในชุดทดสอบและการหาสาเหตุ */
export function currentMusic(): TrackId | null {
  return currentTrack
}
