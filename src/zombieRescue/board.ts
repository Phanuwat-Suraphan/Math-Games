/**
 * กระดานของ ZOMBIE RESCUE: ภารกิจรอดชีวิต พิชิตไวรัสซอมบี้
 *
 * ทางเดินเส้นเดียว START → ช่อง 1–35 → หน้าประตู Z-CURE CENTER
 * แบ่งเป็น 5 เขต เขตละ 7 ช่อง และแต่ละเขตฝึกแม่สูตรคูณแม่เดียว
 * เด็กจึงค่อย ๆ ปลดล็อกแม่ใหม่ตามระยะทาง แล้วเจอทุกแม่รวมกันในเขตสุดท้าย
 *
 * ช่องมีสัญลักษณ์ตามภาพกระดานที่ครูออกแบบ
 * ➕ ได้ไอเทม/ยา · ⚙️ การ์ดพิเศษ · ⚠️ เจอซอมบี้ · 💧 พักฟื้น · 🛒 ตลาด
 * ช่องพักฟื้นท้ายทุกเขตเป็นจุดเซฟด้วย คนที่หมดแรงจะกลับมาเริ่มที่จุดนี้
 * ไม่ต้องกลับไป START เพราะเด็กที่คิดช้าต้องยังเล่นต่อได้
 *
 * ไฟล์นี้ไม่มีพิกัดภาพ พิกัดอยู่ใน art.ts
 * เครื่องยนต์และชุดทดสอบจึงใช้กระดานได้โดยไม่ต้องแตะเรื่องภาพ
 */

export type ZoneId = 1 | 2 | 3 | 4 | 5
export type SquareKind = 'start' | 'plain' | 'item' | 'event' | 'zombie' | 'rest' | 'market' | 'door'

export const START = 0
export const LAST_SQUARE = 35
/** หน้าประตู Z-CURE CENTER: ยืนตรงนี้แล้วทำภารกิจของ ดร.ซอมโบ */
export const DOOR = 36

export interface ZoneInfo {
  id: ZoneId
  name: string
  /** ชื่อบนป้ายตึกในภาพ เขียนแบบเดียวกับกระดานที่ครูออกแบบ */
  sign: string
  icon: string
  /** แม่สูตรคูณของเขตนี้ · 0 คือรวมทุกแม่ */
  table: number
  from: number
  to: number
  color: string
  bg: string
  /** สิ่งที่เขตนี้ฝึก พูดสั้น ๆ ให้เด็กฟัง */
  skill: string
}

export const ZONES: Record<ZoneId, ZoneInfo> = {
  1: { id: 1, name: 'บ้านหลบภัย', sign: 'SAFE HOUSE', icon: '🏠', table: 2, from: 1, to: 7, color: '#2E9E4F', bg: '#E6F5EA', skill: 'ฝึกคูณพื้นฐาน · คูณคือการบวกซ้ำ' },
  2: { id: 2, name: 'ตลาดเสบียง', sign: 'SUPPLY MARKET', icon: '🏪', table: 3, from: 8, to: 14, color: '#D9730D', bg: '#FFF1DE', skill: 'การคูณกับสิ่งของ' },
  3: { id: 3, name: 'โรงเรียนซอมบี้', sign: 'ZOMBIE SCHOOL', icon: '🏫', table: 4, from: 15, to: 21, color: '#1E78D9', bg: '#E6F1FC', skill: 'นับซอมบี้เป็นกลุ่มและเป็นแถว' },
  4: { id: 4, name: 'ห้องทดลองลับ', sign: 'SECRET LAB', icon: '🧪', table: 5, from: 22, to: 28, color: '#8B4FC7', bg: '#F2E9FB', skill: 'ใช้การคูณทำภารกิจ' },
  5: { id: 5, name: 'Z-CURE CENTER', sign: 'Z-CURE CENTER', icon: '🏥', table: 0, from: 29, to: 35, color: '#E0453A', bg: '#FDE8E6', skill: 'รวมทุกแม่ ช่วย ดร.ซอมโบ' },
}

export const ZONE_IDS: ZoneId[] = [1, 2, 3, 4, 5]

/**
 * ชนิดของช่อง 1–35 ตามลำดับ
 *
 * ทุกเขตจบด้วยช่องพักฟื้น (จุดเซฟ) และมีช่องเจอผู้ติดเชื้อมากขึ้นเรื่อย ๆ
 * ตลาดอยู่ต้นเขต 2 สองช่อง เพราะเป็นเขตตลาด และมีอีกช่องในเขต 4 กับเขต 5
 * ให้ทุกคนมีโอกาสได้ใช้เสบียงก่อนถึงด่านสุดท้าย
 */
const KINDS: SquareKind[] = [
  // เขต 1 · 1–7
  'plain', 'item', 'plain', 'zombie', 'event', 'plain', 'rest',
  // เขต 2 · 8–14
  'market', 'plain', 'zombie', 'item', 'market', 'event', 'rest',
  // เขต 3 · 15–21
  'plain', 'zombie', 'event', 'item', 'zombie', 'plain', 'rest',
  // เขต 4 · 22–28
  'market', 'zombie', 'item', 'event', 'zombie', 'plain', 'rest',
  // เขต 5 · 29–35
  'item', 'zombie', 'event', 'market', 'zombie', 'rest', 'zombie',
]

export function squareKind(pos: number): SquareKind {
  if (pos <= START) return 'start'
  if (pos >= DOOR) return 'door'
  return KINDS[pos - 1]
}

export function zoneOf(pos: number): ZoneId {
  if (pos >= ZONES[5].from) return 5
  if (pos >= ZONES[4].from) return 4
  if (pos >= ZONES[3].from) return 3
  if (pos >= ZONES[2].from) return 2
  return 1
}

/** จุดเซฟที่อยู่ข้างหลังหรือตรงตำแหน่งนี้ (ช่องพักฟื้น หรือ START) */
export function checkpointFor(pos: number): number {
  for (let p = Math.min(pos, LAST_SQUARE); p > START; p -= 1) {
    if (squareKind(p) === 'rest') return p
  }
  return START
}

export const SQUARE_INFO: Record<Exclude<SquareKind, 'start' | 'door' | 'plain'>, { icon: string; name: string; effect: string; color: string }> = {
  item: { icon: '➕', name: 'ได้ไอเทม/ยา', effect: 'เปิดกล่องเสบียง สุ่มได้ของ 1 อย่าง', color: '#2E9E4F' },
  event: { icon: '⚙️', name: 'การ์ดพิเศษ', effect: 'จั่วการ์ดเหตุการณ์ 1 ใบ', color: '#8B4FC7' },
  zombie: { icon: '⚠️', name: 'เจอซอมบี้', effect: 'ตอบถูก = รักษาได้ · ผิด = เสีย ❤️ 1', color: '#E0453A' },
  rest: { icon: '💧', name: 'พักฟื้น', effect: 'ฟื้น ❤️ 1 ดวง และเป็นจุดเซฟ', color: '#1E78D9' },
  market: { icon: '🛒', name: 'ตลาด', effect: 'ใช้ 🥫 เสบียงซื้ออุปกรณ์', color: '#D9730D' },
}
