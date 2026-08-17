/**
 * เครื่องแต่งเพลงของเกม
 *
 * ทำไมต้องแต่งเพลงด้วยโค้ด แทนที่จะใส่ไฟล์เพลง
 *
 * 1. ไฟล์เพลงที่ฟังไม่น่าเบื่อต้องยาวอย่างน้อยหนึ่งถึงสองนาที
 *    ซึ่งเป็นไฟล์หลักเมกะไบต์ต่อเพลง คูณห้าเพลงก็หลายเมกะไบต์
 *    เด็กหลายคนเปิดเกมผ่านเน็ตมือถือของที่บ้าน การรอโหลดขนาดนั้น
 *    ก่อนจะได้เล่นคือเหตุผลที่ดีที่สุดที่จะไม่เล่นต่อ
 *
 * 2. เพลงที่วนซ้ำทุกหนึ่งนาทีจะน่ารำคาญเร็วมากในเกมที่เล่นรอบละสิบนาที
 *    เพลงที่แต่งสดจากตัวสุ่มจะไม่ซ้ำห้องเดิมเลย แต่ยังอยู่ในคีย์เดียวกัน
 *    จึงฟังได้นานกว่ามากโดยไม่ต้องเก็บอะไรเพิ่มสักไบต์
 *
 * 3. ลิขสิทธิ์เพลงเป็นเรื่องจริงจัง โรงเรียนเอาเกมไปใช้ต่อได้สบายใจกว่า
 *    ถ้าทุกโน้ตในเกมเกิดจากสูตรที่เขียนไว้ในไฟล์นี้
 *
 * ไฟล์นี้ไม่แตะ Web Audio เลย คืนออกมาเป็นรายการโน้ตล้วน ๆ
 * ตัวขับเสียงอยู่ที่ services/musicService.ts ต่างหาก
 * แยกกันเพื่อให้ทดสอบทำนองได้จริงโดยไม่ต้องเปิดเบราว์เซอร์
 * ซึ่งสำคัญมาก เพราะข้อผิดพลาดของเพลงคือ "เพี้ยน" ไม่ใช่ "พัง"
 * และไม่มีเครื่องมือไหนจับเสียงเพี้ยนได้นอกจากกฎที่เขียนไว้เป็นตัวเลข
 */

import { createRng } from '../math/rng'

/** รูปคลื่นที่ตัวขับเสียงต้องสร้างได้ noise คือเสียงซ่าสำหรับกลอง */
export type Wave = 'sine' | 'triangle' | 'square' | 'sawtooth' | 'noise'

/** ช่องดนตรี แยกไว้ให้ตัวขับเสียงตั้งระดับเสียงและเอฟเฟกต์ต่างกันได้ */
export type Voice = 'bass' | 'chord' | 'lead' | 'drum'

export interface NoteEvent {
  /** เริ่มเล่นที่บีตที่เท่าไรของห้องนี้ */
  beat: number
  /** ยาวกี่บีต */
  beats: number
  /** ความถี่เป็นเฮิรตซ์ */
  freq: number
  /** ความดัง 0–1 */
  gain: number
  wave: Wave
  voice: Voice
}

export type TrackId = 'menu' | 'adventure' | 'arena' | 'boss' | 'victory'

/** บันไดเสียงไมเนอร์ธรรมชาติ ใช้กับเพลงที่ต้องการความลึกลับหรือตึงเครียด */
const MINOR = [0, 2, 3, 5, 7, 8, 10]
/** บันไดเสียงเมเจอร์ ใช้กับเพลงที่ต้องการความสดใส */
const MAJOR = [0, 2, 4, 5, 7, 9, 11]

export interface TrackSpec {
  id: TrackId
  /** ชื่อที่แสดงให้เด็กเห็นได้ ถ้าวันหนึ่งอยากทำหน้าเลือกเพลง */
  name: string
  bpm: number
  beatsPerBar: number
  /** โน้ต MIDI ของตัวโน้ตหลัก 60 คือโดกลาง */
  rootMidi: number
  scale: number[]
  /**
   * ลำดับคอร์ดของเพลง เก็บเป็นลำดับขั้นในบันไดเสียง ไม่ใช่ชื่อคอร์ด
   *
   * เก็บแบบนี้เพราะทำให้ย้ายคีย์ทั้งเพลงได้ด้วยการแก้ rootMidi ตัวเดียว
   * และทำให้โน้ตทำนองที่สุ่มมาอยู่ในคอร์ดเสมอโดยไม่ต้องมีตารางแปลง
   */
  progression: number[]
  /** โอกาสที่ช่องเขบ็ตหนึ่งช่องจะมีโน้ตทำนอง 0–1 */
  leadDensity: number
  /** มีกลองไหม */
  drums: boolean
  /** รูปคลื่นของเสียงเบส */
  bassWave: Wave
  /** รูปคลื่นของเสียงทำนอง */
  leadWave: Wave
}

const TRACKS: Record<TrackId, TrackSpec> = {
  /*
   * หน้าเมนู: ช้า ใส ไม่มีกลอง
   * เด็กอยู่หน้านี้นานกว่าที่คิด ทั้งตอนเลือกโหมดและตอนรอเพื่อน
   * เพลงที่มีจังหวะกระตุ้นจะกลายเป็นความกดดันให้รีบเลือก
   */
  menu: {
    id: 'menu',
    name: 'ลมหายใจของหมู่บ้าน',
    bpm: 82,
    beatsPerBar: 4,
    rootMidi: 57, // ลา
    scale: MINOR,
    progression: [0, 5, 2, 6],
    leadDensity: 0.3,
    drums: false,
    bassWave: 'sine',
    leadWave: 'sine',
  },

  /* ระหว่างผจญภัยในด่าน: สดใส มีกลองเบา ๆ ให้รู้สึกว่ากำลังเดินหน้า */
  adventure: {
    id: 'adventure',
    name: 'เส้นทางของนักผจญภัย',
    bpm: 106,
    beatsPerBar: 4,
    rootMidi: 60, // โด
    scale: MAJOR,
    progression: [0, 4, 5, 3],
    leadDensity: 0.45,
    drums: true,
    bassWave: 'triangle',
    leadWave: 'triangle',
  },

  /* สนามรบ: เร็ว ดัน ไม่หยุด เพราะมอนก็ไม่หยุดเหมือนกัน */
  arena: {
    id: 'arena',
    name: 'สนามรบตัวเลข',
    bpm: 134,
    beatsPerBar: 4,
    rootMidi: 57,
    scale: MINOR,
    progression: [0, 6, 5, 6],
    leadDensity: 0.6,
    drums: true,
    bassWave: 'sawtooth',
    leadWave: 'square',
  },

  /*
   * บอส: ต่ำ หนัก และคอร์ดที่ไม่ลงตัว
   * ขั้นที่ 1 ในลำดับคอร์ดคือคอร์ดดิมินิช ซึ่งฟังแล้วรู้สึกไม่มั่นคง
   * ใส่ไว้ตั้งใจให้เด็กรู้ว่ามีอะไรผิดปกติก่อนจะเห็นบอสด้วยซ้ำ
   */
  boss: {
    id: 'boss',
    name: 'เงาที่เข้ามาใกล้',
    bpm: 150,
    beatsPerBar: 4,
    rootMidi: 50, // เร ต่ำ
    scale: MINOR,
    progression: [0, 1, 5, 4],
    leadDensity: 0.55,
    drums: true,
    bassWave: 'sawtooth',
    leadWave: 'sawtooth',
  },

  /* ชนะแล้ว: สว่าง สูง และจบลงที่คอร์ดหลัก */
  victory: {
    id: 'victory',
    name: 'กลับบ้านพร้อมชัยชนะ',
    bpm: 118,
    beatsPerBar: 4,
    rootMidi: 62, // เร
    scale: MAJOR,
    progression: [0, 3, 4, 0],
    leadDensity: 0.7,
    drums: true,
    bassWave: 'triangle',
    leadWave: 'square',
  },
}

export const TRACK_IDS: TrackId[] = [
  'menu',
  'adventure',
  'arena',
  'boss',
  'victory',
]

export function trackSpec(id: TrackId): TrackSpec {
  return TRACKS[id]
}

/** แปลงเลขโน้ต MIDI เป็นความถี่ ลา กลาง (69) คือ 440 เฮิรตซ์ */
export function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12)
}

/**
 * โน้ต MIDI ของลำดับขั้นหนึ่งในบันไดเสียง
 *
 * รับลำดับขั้นเกินความยาวของบันไดเสียงได้ จะขึ้นอ็อกเทฟให้เอง
 * ทำแบบนี้เพราะคอร์ดคือขั้นที่ 0, 2, 4 ซึ่งขั้นที่ 4 ของขั้นที่ 5
 * จะเลยความยาวของบันไดเสียงไปแล้ว การวนกลับมาที่ขั้นต่ำ ๆ
 * จะทำให้คอร์ดกลายเป็นคนละคอร์ดโดยที่โค้ดดูเหมือนถูกต้อง
 */
export function scaleNote(spec: TrackSpec, degree: number, octave = 0): number {
  const size = spec.scale.length
  const wrapped = ((degree % size) + size) % size
  const octaveShift = Math.floor(degree / size)
  return spec.rootMidi + spec.scale[wrapped] + (octave + octaveShift) * 12
}

/**
 * สามเสียงของคอร์ดที่ลำดับขั้นนี้
 *
 * คืนเป็นลำดับขั้น ไม่ใช่เลขโน้ต เพราะการแปลงเป็นเลขโน้ตต้องรู้อ็อกเทฟด้วย
 * ซึ่งต่างกันระหว่างเบส คอร์ด และทำนอง จึงปล่อยให้ผู้เรียกแปลงเอง
 */
function chordTones(degree: number): number[] {
  return [degree, degree + 2, degree + 4]
}

/**
 * โน้ตทั้งหมดของห้องหนึ่ง
 *
 * ผลลัพธ์ขึ้นกับ trackId กับหมายเลขห้องเท่านั้น เรียกกี่ครั้งก็ได้เหมือนเดิม
 * ตัวขับเสียงจึงเรียกล่วงหน้าได้อย่างปลอดภัย และชุดทดสอบตรวจซ้ำได้
 */
export function renderBar(id: TrackId, bar: number): NoteEvent[] {
  const spec = TRACKS[id]
  const rng = createRng(`${id}-bar-${bar}`)
  const notes: NoteEvent[] = []

  const degree = spec.progression[bar % spec.progression.length]
  const tones = chordTones(degree)

  /* เบส: รากคอร์ดต่ำสองอ็อกเทฟ ลงที่จังหวะที่ 1 และ 3 เสมอ
   * ความสม่ำเสมอตรงนี้คือสิ่งที่ทำให้หูจับจังหวะได้
   * ถ้าสุ่มด้วย เพลงจะฟังเหมือนไม่มีพื้น */
  const bassMidi = scaleNote(spec, degree, -2)
  for (const beat of [0, 2]) {
    notes.push({
      beat,
      beats: 1.6,
      freq: midiToFreq(bassMidi),
      gain: 0.5,
      wave: spec.bassWave,
      voice: 'bass',
    })
  }
  // เพลงที่เร็วเติมเบสนอกจังหวะ ให้รู้สึกว่าดันไปข้างหน้า
  if (spec.bpm >= 130) {
    notes.push({
      beat: 3.5,
      beats: 0.4,
      freq: midiToFreq(bassMidi),
      gain: 0.38,
      wave: spec.bassWave,
      voice: 'bass',
    })
  }

  /* คอร์ด: ค้างยาวทั้งห้อง เบามาก ทำหน้าที่เป็นพื้นหลังของทำนอง */
  for (const tone of tones) {
    notes.push({
      beat: 0,
      beats: spec.beatsPerBar,
      freq: midiToFreq(scaleNote(spec, tone, -1)),
      gain: 0.16,
      wave: 'sine',
      voice: 'chord',
    })
  }

  /*
   * ทำนอง: ไล่ทีละครึ่งจังหวะ
   *
   * จังหวะหนัก (ตกบีตพอดี) บังคับให้เป็นเสียงในคอร์ด
   * จังหวะเบาปล่อยให้เป็นเสียงใดก็ได้ในบันไดเสียง
   *
   * กฎข้อนี้คือทั้งหมดที่ทำให้ทำนองที่สุ่มมาฟังเหมือนเพลง ไม่ใช่เสียงมั่ว
   * ถ้าปล่อยให้จังหวะหนักเป็นเสียงนอกคอร์ดได้ หูจะรู้สึกว่าเพี้ยนทันที
   */
  let previous = tones[0]
  for (let slot = 0; slot < spec.beatsPerBar * 2; slot += 1) {
    if (!rng.chance(spec.leadDensity)) continue

    const beat = slot / 2
    const onStrongBeat = slot % 2 === 0
    const choices = onStrongBeat
      ? tones
      : [tones[0], tones[0] + 1, tones[1], tones[1] + 1, tones[2]]

    /* เลือกเสียงที่ใกล้เสียงก่อนหน้าที่สุด เพื่อไม่ให้ทำนองกระโดดไปมา
     * ทำนองที่กระโดดเกินคู่ห้าตลอดเวลาฟังเหมือนเครื่องดนตรีเสีย */
    const near = choices
      .map((tone) => ({ tone, distance: Math.abs(tone - previous) }))
      .sort((a, b) => a.distance - b.distance)
    const picked = near[rng.int(0, Math.min(1, near.length - 1))].tone
    previous = picked

    notes.push({
      beat,
      beats: onStrongBeat ? 0.45 : 0.3,
      freq: midiToFreq(scaleNote(spec, picked, 1)),
      gain: onStrongBeat ? 0.2 : 0.14,
      wave: spec.leadWave,
      voice: 'lead',
    })
  }

  /* กลอง: กระเดื่องที่ 1 กับ 3 สแนร์ที่ 2 กับ 4 ฉาบทุกครึ่งจังหวะ
   * เป็นรูปแบบพื้นฐานที่สุดโดยตั้งใจ เพราะหน้าที่ของมันคือให้จังหวะ
   * ไม่ใช่เรียกร้องความสนใจไปจากสิ่งที่เด็กกำลังทำอยู่ */
  if (spec.drums) {
    for (const beat of [0, 2]) {
      notes.push({ beat, beats: 0.18, freq: 58, gain: 0.55, wave: 'sine', voice: 'drum' })
    }
    for (const beat of [1, 3]) {
      notes.push({ beat, beats: 0.12, freq: 190, gain: 0.22, wave: 'noise', voice: 'drum' })
    }
    for (let slot = 0; slot < spec.beatsPerBar * 2; slot += 1) {
      notes.push({
        beat: slot / 2,
        beats: 0.05,
        freq: 7000,
        gain: slot % 2 === 0 ? 0.07 : 0.04,
        wave: 'noise',
        voice: 'drum',
      })
    }
  }

  return notes
}

/** ความยาวของหนึ่งห้องเป็นวินาที */
export function barSeconds(id: TrackId): number {
  const spec = TRACKS[id]
  return (spec.beatsPerBar * 60) / spec.bpm
}
