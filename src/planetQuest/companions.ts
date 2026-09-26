/**
 * เพื่อนร่วมทาง · มอนสเตอร์อวกาศตัวน้อยที่นั่งยานไปกับเด็ก
 *
 * เพื่อนแต่ละตัวมีเรื่องที่ชอบเป็นของตัวเอง และเล่าเรื่องนั้นระหว่างยานบิน
 * ทุกเรื่องที่เล่าอยู่ในหลักสูตรวิทยาศาสตร์ ป.6 เรื่องระบบสุริยะ
 *   ปุ๊กปิ๊ก   ดาวฤกษ์          โมโม่    ดวงจันทร์กับอุปราคา
 *   บ็อบบี้   สะเก็ดดาวกับอุกกาบาต ฟูฟู    ดาวหาง
 *   ตุ๊บตั๊บ   เทคโนโลยีอวกาศ     ดราโก้   ดาวเคราะห์ทั้งแปด
 *
 * เพื่อนใหม่มาเมื่อเล่นครบเงื่อนไข เงื่อนไขกระจายไปทั้งสามโหมด
 * (ปลุกเพื่อนดาว อ่านบทเรียน เก็บดาว) เด็กที่ชอบแต่โหมดเดียวจึงได้ลองโหมดอื่นด้วย
 */

export type CompanionId = 'pukpik' | 'momo' | 'bobby' | 'fufu' | 'tubtab' | 'draco'

/** ตัวเลขที่ใช้ตัดสินว่าเพื่อนตัวไหนมาแล้ว */
export interface JourneyStats {
  /** เพื่อนดาวที่ตื่นแล้ว (รวมโลกซึ่งตื่นอยู่เสมอ) */
  awake: number
  lessons: number
  stars: number
}

export type Unlock =
  | { kind: 'start' }
  | { kind: 'awake'; count: number }
  | { kind: 'lessons'; count: number }
  | { kind: 'stars'; count: number }

export interface Companion {
  id: CompanionId
  name: string
  /** มอนสเตอร์ชนิดไหน */
  kind: string
  /** แนะนำตัวตอนเจอกันครั้งแรก */
  intro: string
  unlock: Unlock
  /** พูดตอนยานออกบิน {planet} ถูกแทนด้วยชื่อดาวปลายทาง */
  takeoff: readonly string[]
  /** พูดตอนยานถึง */
  arrive: readonly string[]
  /** เรื่องที่ชอบ เล่าระหว่างยานบิน */
  facts: readonly string[]
}

export const COMPANIONS: readonly Companion[] = [
  {
    id: 'pukpik',
    name: 'ปุ๊กปิ๊ก',
    kind: 'มอนสเตอร์วุ้นอวกาศ',
    intro: 'ปุ๊กปิ๊กเป็นวุ้นอวกาศ เด้งดึ๋งได้ทั้งวัน ชอบดาวระยิบระยับที่สุดเลย!',
    unlock: { kind: 'start' },
    takeoff: ['ปุ๊กปิ๊ก! ไป{planet}กันเลย!', 'เด้งดึ๋ง~ มุ่งหน้าสู่{planet}!'],
    arrive: ['ถึง{planet}แล้ว! ระยิบระยับจัง ✨', 'ว้าว {planet}สวยกว่าในรูปอีก!'],
    facts: [
      'ดาวที่กะพริบบนฟ้าตอนกลางคืนส่วนใหญ่เป็นดาวฤกษ์ ส่องแสงได้เองเหมือนดวงอาทิตย์',
      'ดวงอาทิตย์ก็เป็นดาวฤกษ์ เห็นใหญ่กว่าดวงอื่นเพราะอยู่ใกล้เราที่สุด',
      'ดาวฤกษ์สีฟ้าร้อนกว่าดาวฤกษ์สีแดงนะ',
    ],
  },
  {
    id: 'momo',
    name: 'โมโม่',
    kind: 'กระต่ายมอนสเตอร์จากดวงจันทร์',
    intro: 'โมโม่มาจากดวงจันทร์ หูยาวฟังเสียงดาวได้ ขอไปเที่ยวด้วยคนนะ!',
    unlock: { kind: 'awake', count: 3 },
    takeoff: ['กระโดดทีเดียวถึง{planet}เลย!', 'หูตั้งแล้ว พร้อมไป{planet}!'],
    arrive: ['{planet}จ๋า โมโม่มาแล้ว!', 'ถึง{planet}แล้ว~ แต่คิดถึงดวงจันทร์นิดนึง 🌙'],
    facts: [
      'ดวงจันทร์ไม่มีแสงในตัวเอง ที่เห็นสว่างเพราะสะท้อนแสงอาทิตย์',
      'จันทรุปราคาเกิดตอนดวงจันทร์เข้าไปอยู่ในเงาของโลก ดวงจันทร์จะกลายเป็นสีแดงอิฐ',
      'ดวงจันทร์หันด้านเดิมเข้าหาโลกเสมอ เราจึงไม่เคยเห็นด้านหลังจากบนโลก',
    ],
  },
  {
    id: 'bobby',
    name: 'บ็อบบี้',
    kind: 'มอนสเตอร์หินจากแถบดาวเคราะห์น้อย',
    intro: 'บ็อบบี้เป็นก้อนหินอวกาศที่ตื่นขึ้นมา ตัวแข็งแต่ใจดีนะ!',
    unlock: { kind: 'lessons', count: 2 },
    takeoff: ['บ็อบ บ็อบ! กลิ้งไป{planet}กัน!', 'หินน้อยพร้อมลุยสู่{planet}!'],
    arrive: ['ถึง{planet}แล้ว! ไม่ชนอะไรเลย เก่งมาก', '{planet}ใหญ่กว่าบ็อบบี้เยอะเลย!'],
    facts: [
      'บ้านของบ็อบบี้คือแถบดาวเคราะห์น้อย อยู่ระหว่างวงโคจรของดาวอังคารกับดาวพฤหัสบดี',
      'สะเก็ดดาวคือหินที่ลุกไหม้ในอากาศจนเห็นเป็นแสงวาบ คนไทยเรียกว่าผีพุ่งไต้',
      'ถ้าไหม้ไม่หมดแล้วตกถึงพื้นโลก เราเรียกก้อนนั้นว่าอุกกาบาต',
    ],
  },
  {
    id: 'fufu',
    name: 'ฟูฟู',
    kind: 'ผีน้อยดาวหาง',
    intro: 'ฟูฟูเป็นผีน้อยดาวหาง ไม่น่ากลัวหรอก หางวิบวับสวยมากเลยนะ~',
    unlock: { kind: 'stars', count: 6 },
    takeoff: ['ฟิ้ววว~ ฟูฟูลากหางไป{planet}!', 'ตามหางฟูฟูมาเลย ไป{planet}!'],
    arrive: ['ถึง{planet}แล้ว หางฟูฟูยังวิบวับอยู่เลย', 'สวัสดี{planet}! ฟูฟูมาเยี่ยม~'],
    facts: [
      'ดาวหางเป็นก้อนน้ำแข็งปนฝุ่น พอเข้าใกล้ดวงอาทิตย์จะละลายจนมีหางยาว',
      'หางของดาวหางชี้ออกจากดวงอาทิตย์เสมอ ไม่ได้ลากตามหลังเหมือนว่าว',
      'ดาวหางฮัลเลย์กลับมาให้คนบนโลกเห็นทุกประมาณ 76 ปี',
    ],
  },
  {
    id: 'tubtab',
    name: 'ตุ๊บตั๊บ',
    kind: 'มอนสเตอร์ตาเดียวนักประดิษฐ์',
    intro: 'ตุ๊บตั๊บตาเดียวแต่มองเห็นไกลมาก ชอบประดิษฐ์ของเล่นอวกาศ!',
    unlock: { kind: 'awake', count: 8 },
    takeoff: ['ตรวจเครื่องยนต์แล้ว ไป{planet}!', 'ตุ๊บตั๊บคำนวณเส้นทางไป{planet}เรียบร้อย'],
    arrive: ['ลงจอดที่{planet}สมบูรณ์แบบ!', 'ขอจดบันทึกเรื่อง{planet}หน่อยนะ 📝'],
    facts: [
      'ดาวเทียมช่วยพยากรณ์อากาศ ถ่ายทอดสด และบอกตำแหน่งนำทางให้เรา',
      'สถานีอวกาศนานาชาติโคจรรอบโลกวันละประมาณ 16 รอบ',
      'กล้องโทรทรรศน์อวกาศลอยอยู่เหนืออากาศของโลก จึงถ่ายภาพดาวได้ชัดมาก',
    ],
  },
  {
    id: 'draco',
    name: 'ดราโก้',
    kind: 'ลูกมังกรอวกาศ',
    intro: 'ดราโก้เป็นลูกมังกรอวกาศ บินเก่งที่สุดในกาแล็กซี แต่ยังพ่นไฟไม่เป็นเลย',
    unlock: { kind: 'stars', count: 18 },
    takeoff: ['กร๊าว~ ดราโก้กางปีกไป{planet}!', 'ไม่มีใครบินเร็วกว่ามังกร ไป{planet}!'],
    arrive: ['ถึง{planet}แล้ว! ดราโก้ไม่พ่นไฟใส่นะ สัญญา', '{planet}อุ่นดีไหมนะ~'],
    facts: [
      'ดาวเคราะห์ทั้งแปดดวงโคจรรอบดวงอาทิตย์ไปในทิศทางเดียวกัน',
      'ดาวเคราะห์ชั้นในเป็นดาวหิน ส่วนดาวเคราะห์ชั้นนอกเป็นดาวแก๊สขนาดใหญ่',
      'ยิ่งอยู่ไกลดวงอาทิตย์ ดาวเคราะห์ยิ่งใช้เวลาโคจรครบรอบนานขึ้น',
    ],
  },
]

export const DEFAULT_COMPANION: CompanionId = 'pukpik'

export function isCompanionId(value: unknown): value is CompanionId {
  return typeof value === 'string' && COMPANIONS.some((companion) => companion.id === value)
}

export function companionFor(id: CompanionId): Companion {
  return COMPANIONS.find((companion) => companion.id === id) ?? (COMPANIONS[0] as Companion)
}

export function isUnlocked(companion: Companion, stats: JourneyStats): boolean {
  const rule = companion.unlock
  switch (rule.kind) {
    case 'start':
      return true
    case 'awake':
      return stats.awake >= rule.count
    case 'lessons':
      return stats.lessons >= rule.count
    case 'stars':
      return stats.stars >= rule.count
  }
}

export function unlockedCompanions(stats: JourneyStats): CompanionId[] {
  return COMPANIONS.filter((companion) => isUnlocked(companion, stats)).map((companion) => companion.id)
}

/** บอกเด็กว่าต้องทำอะไรเพื่อน้องตัวนี้จะมา พร้อมบอกว่าทำไปแล้วเท่าไร */
export function unlockHint(companion: Companion, stats: JourneyStats): string {
  const rule = companion.unlock
  switch (rule.kind) {
    case 'start':
      return 'มาด้วยกันตั้งแต่แรก'
    case 'awake':
      return `ปลุกเพื่อนดาวให้ตื่น ${rule.count} ดวง (ตอนนี้ ${Math.min(stats.awake, rule.count)})`
    case 'lessons':
      return `อ่านบทเรียนจบ ${rule.count} บท (ตอนนี้ ${Math.min(stats.lessons, rule.count)})`
    case 'stars':
      return `เก็บดาวในโหมดฝึกฝนรวม ${rule.count} ดวง (ตอนนี้ ${Math.min(stats.stars, rule.count)})`
  }
}

/** เพื่อนที่มาแล้วแต่ยังไม่เคยทักทายกัน ตัวแรกในรายการจะขึ้นการ์ดเพื่อนใหม่ */
export function newFriends(stats: JourneyStats, met: readonly CompanionId[]): CompanionId[] {
  return unlockedCompanions(stats).filter((id) => !met.includes(id))
}

function fill(line: string, planetName: string): string {
  return line.split('{planet}').join(planetName)
}

function pick(lines: readonly string[], count: number): string {
  if (lines.length === 0) return ''
  return lines[((count % lines.length) + lines.length) % lines.length] as string
}

export function takeoffLine(companion: Companion, planetName: string, flight: number): string {
  return fill(pick(companion.takeoff, flight), planetName)
}

export function arriveLine(companion: Companion, planetName: string, flight: number): string {
  return fill(pick(companion.arrive, flight), planetName)
}

export function flightFact(companion: Companion, flight: number): string {
  return pick(companion.facts, flight)
}

/** เพื่อนร่วมทางดีใจกับผลของด่าน */
export function celebrateLine(companion: Companion, stars: number): string {
  if (stars >= 3) return `${companion.name}เต้นระบำฉลองสามดาว! 💃`
  if (stars === 2) return `${companion.name}ปรบมือให้ดังมาก! 👏`
  return `${companion.name}บอกว่า ครั้งหน้าลุยด้วยกันอีกนะ!`
}
