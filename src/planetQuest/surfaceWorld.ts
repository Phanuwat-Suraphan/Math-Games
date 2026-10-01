import { getPlanet } from '../solar/planets'
import type { Planet, PlanetId } from '../solar/planets'
import type { ChoiceQuestion } from './content'
import { angleGap, jumpHeight } from './surface'
import type { WalkState } from './surface'

/**
 * ของบนผิวดาวที่ทำให้การเดินเล่นมีเรื่องให้ทำ
 *
 *   กลางวันกลางคืน  ดวงอาทิตย์อยู่ทางเดียวเสมอ เดินไปอีกฝั่งของดาว ฝั่งนั้นหันหนีดวงอาทิตย์จึงมืด
 *                  เด็กได้เห็นเองว่ากลางวันกลางคืนเกิดจากด้านไหนของดาวหันเข้าหาดวงอาทิตย์
 *   ดาวแสง         ลอยอยู่สูงต่างกัน ความสูงคิดจากแรงโน้มถ่วงของดาวดวงนั้น ทุกดวงกระโดดถึงได้บนดาวของมันเอง
 *                  บนดาวอังคารมีดวงที่สูงเกินกว่าที่จะกระโดดถึงได้บนโลก เด็กจึงรู้สึกได้ว่าแรงโน้มถ่วงต่างกันจริง
 *   ชาวดาว         มอนสเตอร์ประจำดาว ถามคำถามหนึ่งข้อเกี่ยวกับดาวบ้านเกิด ตอบถูกได้ของฝาก ตอบผิดถามใหม่ได้ ไม่เสียอะไร
 */

/* ---------------- กลางวันกลางคืน ---------------- */

/** มุมรอบดาวที่ดวงอาทิตย์อยู่ตรงหัวพอดี ยานจอดอยู่ฝั่งกลางวันใกล้ ๆ เที่ยง */
export const SUN_ANGLE = 0.3

/** ดวงอาทิตย์สูงจากขอบฟ้าแค่ไหน 1 คือตรงหัว 0 คือขอบฟ้า ติดลบคือตกไปแล้ว */
export function sunHeight(angle: number): number {
  return Math.cos(angleGap(SUN_ANGLE, angle))
}

/** ความสว่างของท้องฟ้า 0 ถึง 1 ไล่นุ่ม ๆ ตอนเช้าและเย็น ไม่ใช่สว่างวาบมืดวาบ */
export function daylight(angle: number): number {
  const t = Math.min(1, Math.max(0, (sunHeight(angle) + 0.15) / 0.4))
  return t * t * (3 - 2 * t)
}

export type TimeOfDay = 'day' | 'dusk' | 'night'

export function timeOfDay(angle: number): TimeOfDay {
  const light = daylight(angle)
  if (light > 0.85) return 'day'
  if (light > 0.05) return 'dusk'
  return 'night'
}

export function timeLine(time: TimeOfDay, planet: Planet): string {
  if (time === 'day') return '☀️ กลางวัน · ฝั่งนี้ของดาวหันเข้าหาดวงอาทิตย์'
  if (time === 'dusk') {
    return planet.id === 'mars'
      ? '🌅 ใกล้ค่ำ · พระอาทิตย์ตกบนดาวอังคารเป็นสีฟ้า ไม่ใช่สีส้มเหมือนบนโลก'
      : '🌅 ใกล้ค่ำ · ดวงอาทิตย์กำลังลับขอบฟ้า'
  }
  return '🌙 กลางคืน · ฝั่งนี้หันหนีดวงอาทิตย์ กลางวันกลางคืนเกิดจากดาวหันด้านไหนเข้าหาดวงอาทิตย์'
}

/* ---------------- ดาวแสง ---------------- */

export interface Sparkle {
  angle: number
  /** ความสูงจากพื้น หน่วยพิกเซลบนจอ */
  height: number
}

/** มุมของดาวแสงทั้งห้าดวง เว้นช่องไม่ให้ทับจุดสำรวจ ชาวดาว และยาน */
const SPARKLE_ANGLES = [0.55, 1.85, 3.55, 5.05, 6.1] as const
/** ความสูงเป็นสัดส่วนของที่กระโดดได้สูงสุด ดวงแรกติดพื้น เดินผ่านก็เก็บได้ */
const SPARKLE_LIFTS = [0.08, 0.45, 0.85, 0.65, 0.9] as const

export function sparklesFor(planet: Planet): Sparkle[] {
  const top = jumpHeight(planet)
  return SPARKLE_ANGLES.map((angle, index) => ({ angle, height: Math.round(top * (SPARKLE_LIFTS[index] ?? 0.5)) }))
}

/** ตัวผู้เล่นสูงราวเท่านี้ (พิกเซล) ดาวแสงที่อยู่ระหว่างเท้าถึงหัวถือว่าเก็บได้ */
export const BODY_HEIGHT = 52
const CATCH_WIDTH = 22

export function catchesSparkle(state: WalkState, sparkle: Sparkle, radius: number): boolean {
  const across = Math.abs(angleGap(state.angle, sparkle.angle)) * radius
  return across <= CATCH_WIDTH && sparkle.height >= state.height - 8 && sparkle.height <= state.height + BODY_HEIGHT
}

/** ดาวแสงดวงนี้สูงเกินกว่าที่จะกระโดดถึงได้บนโลกไหม ใช้บอกเด็กตอนเก็บได้ */
export function tooHighOnEarth(sparkle: Sparkle): boolean {
  return sparkle.height - BODY_HEIGHT > jumpHeight(getPlanet('earth'))
}

/* ---------------- ชาวดาว ---------------- */

export interface NativeLook {
  color: string
  eyes: 1 | 2 | 3
  antennae: 0 | 1 | 2
  /** ของประจำตัว */
  extra?: 'horns' | 'leaf' | 'ring' | 'cloud'
  /** ยูเรนัสนอนตะแคง ชาวดาวยูเรนัสก็นอนตะแคงด้วย */
  sideways?: boolean
}

export interface Native {
  planet: PlanetId
  name: string
  angle: number
  look: NativeLook
  hello: string
  question: ChoiceQuestion
  gift: { emoji: string; name: string }
}

export const NATIVES: readonly Native[] = [
  {
    planet: 'mercury',
    name: 'ปิ๊กซี่',
    angle: 5.6,
    look: { color: '#fbbf24', eyes: 2, antennae: 1 },
    hello: 'ฉันปิ๊กซี่ วิ่งไวที่สุดในดาวพุธเลยนะ ตอบคำถามฉันได้ไหม?',
    question: {
      id: 'native-mercury',
      text: 'ดาวพุธโคจรรอบดวงอาทิตย์ครบหนึ่งรอบ ใช้เวลากี่วันของโลก',
      answer: '88 วัน',
      wrong: ['365 วัน', '30 วัน', '176 วัน'],
      explain: 'ดาวพุธอยู่ใกล้ดวงอาทิตย์ที่สุด จึงโคจรครบรอบเร็วที่สุด ใช้แค่ 88 วัน (ส่วน 176 วันคือความยาวของหนึ่งวันบนดาวพุธ)',
    },
    gift: { emoji: '🏃', name: 'เหรียญนักวิ่งเร็วที่สุด' },
  },
  {
    planet: 'venus',
    name: 'วีนี่',
    angle: 5.6,
    look: { color: '#fb923c', eyes: 3, antennae: 0, extra: 'horns' },
    hello: 'ร้อนจังเลยวันนี้~ ฉันวีนี่ ช่วยตอบคำถามเรื่องบ้านฉันหน่อย',
    question: {
      id: 'native-venus',
      text: 'ทำไมดาวศุกร์ร้อนที่สุด ทั้งที่ดาวพุธอยู่ใกล้ดวงอาทิตย์กว่า',
      answer: 'อากาศหนาทึบกักความร้อนไว้',
      wrong: ['ดาวศุกร์มีภูเขาไฟเยอะที่สุด', 'ดาวศุกร์หมุนรอบตัวเองเร็วที่สุด', 'ดาวศุกร์ใหญ่ที่สุด'],
      explain: 'อากาศของดาวศุกร์หนาทึบมาก ความร้อนเข้ามาแล้วออกไปไม่ได้ เหมือนรถที่ปิดกระจกจอดกลางแดด',
    },
    gift: { emoji: '🌋', name: 'หินภูเขาไฟร้อน ๆ' },
  },
  {
    planet: 'earth',
    name: 'ต้นกล้า',
    angle: 5.6,
    look: { color: '#4ade80', eyes: 2, antennae: 0, extra: 'leaf' },
    hello: 'ยินดีต้อนรับกลับบ้าน ฉันต้นกล้า ภูตต้นไม้แห่งโลก ลองตอบคำถามฉันดูนะ',
    question: {
      id: 'native-earth',
      text: 'โลกมีดวงจันทร์บริวารกี่ดวง',
      answer: '1 ดวง',
      wrong: ['2 ดวง', 'ไม่มีเลย', '3 ดวง'],
      explain: 'โลกมีดวงจันทร์บริวารดวงเดียว คือดวงจันทร์ที่เราเห็นทุกคืน',
    },
    gift: { emoji: '🌱', name: 'เมล็ดพันธุ์จากโลก' },
  },
  {
    planet: 'mars',
    name: 'มาร์ตี้',
    angle: 5.6,
    look: { color: '#f87171', eyes: 2, antennae: 2 },
    hello: 'โย่! ฉันมาร์ตี้ ชาวดาวอังคาร ตอบถูกแล้วจะให้ของฝากนะ',
    question: {
      id: 'native-mars',
      text: 'ดาวอังคารได้ชื่อว่าดาวเคราะห์สีแดงเพราะอะไร',
      answer: 'ดินและหินมีสนิมเหล็กปนอยู่มาก',
      wrong: ['มีลาวาไหลอยู่ทั้งดวง', 'อยู่ใกล้ดวงอาทิตย์มากที่สุด', 'มีต้นไม้สีแดงขึ้นเต็มดาว'],
      explain: 'ดินและหินบนดาวอังคารมีสนิมเหล็กปนอยู่มาก ทั้งดวงจึงเป็นสีแดงอมส้ม',
    },
    gift: { emoji: '🧲', name: 'หินสนิมเหล็กสีแดง' },
  },
  {
    planet: 'jupiter',
    name: 'จูปี้',
    angle: 5.6,
    look: { color: '#fdba74', eyes: 2, antennae: 1, extra: 'cloud' },
    hello: 'ฉันจูปี้ ลอยตามลมอยู่บนเมฆทั้งวัน มาเล่นทายปัญหากันไหม?',
    question: {
      id: 'native-jupiter',
      text: 'ดาวพฤหัสบดีเป็นดาวเคราะห์แบบไหน',
      answer: 'ดาวแก๊สขนาดใหญ่',
      wrong: ['ดาวหินขนาดเล็ก', 'ดาวฤกษ์', 'ดาวเคราะห์แคระ'],
      explain: 'ดาวพฤหัสบดีเป็นดาวแก๊สขนาดใหญ่ ไม่มีพื้นแข็งให้ยืน เราถึงต้องลอยอยู่เหนือเมฆ',
    },
    gift: { emoji: '🌀', name: 'ขวดพายุจิ๋ว' },
  },
  {
    planet: 'saturn',
    name: 'ริงโก้',
    angle: 5.6,
    look: { color: '#fde68a', eyes: 2, antennae: 1, extra: 'ring' },
    hello: 'ดูห่วงของฉันสิ เหมือนวงแหวนดาวเสาร์เลย! ฉันริงโก้ ตอบคำถามฉันหน่อย',
    question: {
      id: 'native-saturn',
      text: 'วงแหวนของดาวเสาร์ทำจากอะไร',
      answer: 'ก้อนน้ำแข็งและหิน',
      wrong: ['แก๊สร้อน', 'ทองคำ', 'แสงจากดวงอาทิตย์'],
      explain: 'วงแหวนของดาวเสาร์คือก้อนน้ำแข็งและหินจำนวนมหาศาลที่โคจรรอบดาวเสาร์',
    },
    gift: { emoji: '💍', name: 'ก้อนน้ำแข็งจากวงแหวน' },
  },
  {
    planet: 'uranus',
    name: 'ยูริ',
    angle: 5.6,
    look: { color: '#67e8f9', eyes: 2, antennae: 2, sideways: true },
    hello: 'ฮ้าว~ ฉันยูริ ชอบนอนตะแคงเหมือนดาวบ้านเกิด ตอบคำถามฉันได้ไหม',
    question: {
      id: 'native-uranus',
      text: 'ดาวยูเรนัสหมุนรอบตัวเองแบบไหน',
      answer: 'นอนตะแคง แกนหมุนเอียงเกือบ 98 องศา',
      wrong: ['ตั้งตรงเหมือนลูกข่าง', 'ไม่หมุนรอบตัวเองเลย', 'หมุนเร็วที่สุดในระบบสุริยะ'],
      explain: 'ดาวยูเรนัสหมุนแบบนอนตะแคง แกนหมุนเอียงเกือบ 98 องศา ฉันเลยนอนตะแคงตามบ้านไง',
    },
    gift: { emoji: '🧊', name: 'เกล็ดน้ำแข็งสีฟ้า' },
  },
  {
    planet: 'neptune',
    name: 'เนปปี้',
    angle: 5.6,
    look: { color: '#60a5fa', eyes: 1, antennae: 1 },
    hello: 'ฟิ้ววว~ ลมแรงจนจะปลิวแล้ว ฉันเนปปี้ ตอบคำถามสุดท้ายของระบบสุริยะได้ไหม',
    question: {
      id: 'native-neptune',
      text: 'ดาวเนปจูนเป็นดาวเคราะห์ลำดับที่เท่าไรนับจากดวงอาทิตย์',
      answer: 'ลำดับที่ 8',
      wrong: ['ลำดับที่ 7', 'ลำดับที่ 6', 'ลำดับที่ 9'],
      explain: 'ดาวเนปจูนอยู่ไกลดวงอาทิตย์ที่สุด เป็นดาวเคราะห์ลำดับที่ 8 ซึ่งเป็นดวงสุดท้าย',
    },
    gift: { emoji: '🌬️', name: 'ขวดลมที่เร็วที่สุด' },
  },
]

export function nativeFor(id: PlanetId): Native {
  const found = NATIVES.find((native) => native.planet === id)
  if (!found) throw new Error(`ไม่มีชาวดาวของ ${id}`)
  return found
}

/** อยู่ใกล้ชาวดาวพอจะคุยได้ไหม ใช้ระยะเดียวกับจุดสำรวจ */
export function nearNative(state: WalkState, native: Native, radius: number, reach: number): boolean {
  return Math.abs(angleGap(state.angle, native.angle)) * radius <= reach
}
