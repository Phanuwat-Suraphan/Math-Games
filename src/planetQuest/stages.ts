/**
 * ด่านบนดาวแต่ละดวง
 *
 * ดาวแต่ละดวงได้เกมที่เล่นต่างกันโดยตั้งใจ และเลือกให้เข้ากับตัวดาว
 * ดาวพุธที่โคจรเร็วที่สุดได้เกมความจำที่ต้องไว ดาวอังคารที่มีรถหุ่นยนต์ได้เรื่องเทคโนโลยี
 * ดาวยูเรนัสที่ถูกค้นพบด้วยกล้องโทรทรรศน์ได้เรื่องประวัติการสำรวจอวกาศ
 * ความเข้ากันนี้ช่วยให้เด็กจำได้ว่าดาวดวงไหนเป็นอย่างไร โดยไม่ต้องท่อง
 */

import type { PlanetId } from '../solar/planets'

export type StageKind =
  | 'memory'
  | 'truefalse'
  | 'eclipse'
  | 'connect'
  | 'sort'
  | 'asteroid'
  | 'timeline'
  | 'riddle'

export interface Stage {
  planet: PlanetId
  kind: StageKind
  icon: string
  title: string
  /** หัวข้อในหนังสือเรียนที่ด่านนี้ฝึก */
  topic: string
  howTo: string
}

export const STAGES: readonly Stage[] = [
  {
    planet: 'mercury',
    kind: 'memory',
    icon: '🃏',
    title: 'ไพ่ความจำความเร็วแสง',
    topic: 'ลักษณะเด่นของดาวเคราะห์แต่ละดวง',
    howTo: 'เปิดไพ่ทีละสองใบ จับคู่ชื่อดาวกับลักษณะเด่นของดาว',
  },
  {
    planet: 'venus',
    kind: 'truefalse',
    icon: '🌡️',
    title: 'จริงหรือไม่ ใต้เมฆร้อนระอุ',
    topic: 'ดาวฤกษ์ ดาวเคราะห์ และสมาชิกของระบบสุริยะ',
    howTo: 'อ่านข้อความแล้วตัดสินว่าจริงหรือไม่จริง ตอบผิดแล้วยานจะร้อนขึ้น',
  },
  {
    planet: 'earth',
    kind: 'eclipse',
    icon: '🌒',
    title: 'ห้องทดลองอุปราคา',
    topic: 'การเกิดสุริยุปราคาและจันทรุปราคา',
    howTo: 'เลื่อนดวงจันทร์ไปรอบโลกให้เกิดอุปราคาตามภารกิจ แล้วตอบคำถาม',
  },
  {
    planet: 'mars',
    kind: 'connect',
    icon: '🛰️',
    title: 'ศูนย์เทคโนโลยีอวกาศ',
    topic: 'เทคโนโลยีอวกาศและการนำมาใช้ประโยชน์',
    howTo: 'โยงเส้นจับคู่เทคโนโลยีอวกาศกับประโยชน์ของมัน',
  },
  {
    planet: 'jupiter',
    kind: 'sort',
    icon: '📦',
    title: 'คัดแยกวัตถุท้องฟ้า',
    topic: 'องค์ประกอบของระบบสุริยะ ดาวเคราะห์ชั้นในและชั้นนอก',
    howTo: 'จัดวัตถุท้องฟ้าแต่ละชิ้นลงกล่องที่ถูกต้อง',
  },
  {
    planet: 'saturn',
    kind: 'asteroid',
    icon: '☄️',
    title: 'ฝ่าดงอุกกาบาตแห่งวงแหวน',
    topic: 'ดาวเคราะห์น้อย ดาวหาง สะเก็ดดาว และอุกกาบาต',
    howTo: 'อ่านคำถาม แล้วยิงอุกกาบาตก้อนที่มีคำตอบถูก',
  },
  {
    planet: 'uranus',
    kind: 'timeline',
    icon: '⏳',
    title: 'เส้นเวลาการสำรวจอวกาศ',
    topic: 'พัฒนาการของเทคโนโลยีอวกาศ',
    howTo: 'เรียงเหตุการณ์จากเกิดก่อนไปเกิดหลัง',
  },
  {
    planet: 'neptune',
    kind: 'riddle',
    icon: '🕵️',
    title: 'ปริศนาฉันคือใคร',
    topic: 'ทบทวนสมาชิกทั้งหมดของระบบสุริยะ',
    howTo: 'อ่านใบ้ทีละข้อแล้วทายว่าเป็นอะไร ยิ่งใช้ใบ้น้อยยิ่งได้คะแนนมาก',
  },
]

export function stageFor(planet: PlanetId): Stage {
  return STAGES.find((stage) => stage.planet === planet) ?? (STAGES[0] as Stage)
}

/** เหรียญต่อหนึ่งดาวที่ได้ ได้ทุกครั้งที่เล่นจบ เหมือนโหมดฝึกของเกมอื่น */
export const COINS_PER_STAR = 5
