/**
 * ข้อมูลห้องเรียนสำหรับใช้เกมเป็นนวัตกรรม (ว.PA)
 *
 * - ทะเบียนนักเรียน: เลขที่ เลขประจำตัว คำนำหน้า ชื่อ นามสกุล ห้อง (แนบไว้กับผู้เล่นแต่ละคน)
 * - การตั้งค่าของครู: ข้อมูลโรงเรียนสำหรับหัวรายงาน เกณฑ์ผ่าน เป้าหมายของห้อง รหัสครู
 *
 * ไฟล์นี้ไม่พึ่ง progress.ts (กันการ import วนกัน) จึงรับผู้เล่นเป็นรูปแบบย่อ
 */

/** ชื่อนวัตกรรมที่ใช้ในรายงานและเอกสาร */
export const INNOVATION_NAME = 'เกมเศรษฐี ตะลุยเมืองเงิน ป.3'

export interface StudentInfo {
  /** เลขที่ในห้อง (ไม่มี = null) */
  no: number | null
  /** เลขประจำตัวนักเรียน */
  code: string
  /** ด.ช. / ด.ญ. */
  prefix: string
  first: string
  last: string
  /** ห้อง เช่น ป.3/1 */
  room: string
}

export interface Classroom {
  /** รหัสครู 4–6 หลัก (ว่าง = ยังไม่ตั้ง ใครก็เปิดหน้าครูได้) */
  pin: string
  /** รหัสสำรอง ใช้ล้างรหัสครูเมื่อลืม */
  recovery: string
  school: string
  /** สังกัด เช่น สพป.เชียงใหม่ เขต 1 */
  area: string
  teacher: string
  /** ผู้บริหารสถานศึกษา (ใช้ในช่องลงนามของรายงาน) */
  director: string
  /** ห้องที่สอน เช่น ป.3/1 (ค่าเริ่มต้นของห้องเมื่อเพิ่มนักเรียน) */
  room: string
  term: string
  year: string
  /** เกณฑ์ผ่านของนักเรียนแต่ละคน: ร้อยละของคะแนนเต็ม */
  passPercent: number
  /** เป้าหมายของห้อง: ร้อยละของนักเรียนที่ผ่านเกณฑ์ */
  targetPercent: number
  /** ให้นักเรียนเข้าเกมด้วยการเลือกชื่อจากทะเบียนเท่านั้น (สร้างผู้เล่นเองไม่ได้) */
  rosterOnly: boolean
}

export const DEFAULT_CLASSROOM: Classroom = {
  pin: '',
  recovery: '',
  school: '',
  area: '',
  teacher: '',
  director: '',
  room: 'ป.3',
  term: '',
  year: '',
  passPercent: 70,
  targetPercent: 80,
  rosterOnly: false,
}

function clampPercent(v: unknown, fallback: number): number {
  const n = Math.round(Number(v))
  return Number.isFinite(n) && n >= 1 && n <= 100 ? n : fallback
}

function text(v: unknown, max = 80): string {
  return typeof v === 'string' ? v.trim().slice(0, max) : ''
}

/** ซ่อมการตั้งค่าห้องเรียนจากไฟล์ (ค่าที่หายหรือผิดรูปใช้ค่าเริ่มต้น) */
export function repairClassroom(raw: unknown): Classroom {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Partial<Record<keyof Classroom, unknown>>
  const pin = typeof r.pin === 'string' && /^\d{4,6}$/.test(r.pin) ? r.pin : ''
  return {
    pin,
    recovery: pin ? text(r.recovery, 12) : '',
    school: text(r.school),
    area: text(r.area),
    teacher: text(r.teacher),
    director: text(r.director),
    room: text(r.room, 20) || DEFAULT_CLASSROOM.room,
    term: text(r.term, 4),
    year: text(r.year, 8),
    passPercent: clampPercent(r.passPercent, DEFAULT_CLASSROOM.passPercent),
    targetPercent: clampPercent(r.targetPercent, DEFAULT_CLASSROOM.targetPercent),
    rosterOnly: r.rosterOnly === true,
  }
}

/** ครูกรอกข้อมูลห้องเรียนไว้แล้วหรือยัง (ใช้ตัดสินตอนรวมไฟล์ว่าจะรับการตั้งค่าจากไฟล์หรือไม่) */
export function classroomConfigured(c: Classroom): boolean {
  return c.pin !== '' || c.school !== '' || c.teacher !== ''
}

export function repairStudent(raw: unknown): StudentInfo | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const r = raw as Partial<Record<keyof StudentInfo, unknown>>
  const first = text(r.first, 40)
  if (!first) return undefined
  const no = Number(r.no)
  return {
    no: r.no !== null && r.no !== undefined && r.no !== '' && Number.isInteger(no) && no > 0 && no < 1000 ? no : null,
    code: text(r.code, 20),
    prefix: text(r.prefix, 12),
    first,
    last: text(r.last, 40),
    room: text(r.room, 20),
  }
}

export function fullName(s: StudentInfo): string {
  return `${s.prefix}${s.first}${s.last ? ` ${s.last}` : ''}`
}

/**
 * คีย์ประจำตัวนักเรียน ใช้จับคู่คนเดียวกันข้ามเครื่องและข้ามไฟล์
 * ใช้เลขประจำตัวก่อน ถ้าไม่มีใช้ห้อง+เลขที่ ถ้าไม่มีทั้งคู่ใช้ชื่อ-สกุล
 */
export function studentKey(s: StudentInfo): string {
  if (s.code) return `c:${s.code}`
  if (s.no !== null) return `r:${s.room}:${s.no}`
  return `n:${s.first} ${s.last}`.trim()
}

/** รหัสผู้เล่นของนักเรียนในทะเบียน: ได้รหัสเดิมทุกครั้งจากคีย์เดียวกัน (นำเข้ารายชื่อชุดเดียวกันบนหลายเครื่องแล้วรวมกันได้) */
export function rosterPlayerId(s: StudentInfo): string {
  return `st-${studentKey(s).replace(/[^0-9A-Za-z฀-๿]+/g, '_')}`
}

interface Rosterable {
  name: string
  student?: StudentInfo
}

/** เรียงตามห้อง แล้วเลขที่ แล้วชื่อ (คนที่ไม่อยู่ในทะเบียนไว้ท้าย) */
export function compareStudents(a: Rosterable, b: Rosterable): number {
  const sa = a.student
  const sb = b.student
  if (!sa || !sb) return sa ? -1 : sb ? 1 : a.name.localeCompare(b.name, 'th')
  const room = sa.room.localeCompare(sb.room, 'th', { numeric: true })
  if (room !== 0) return room
  if (sa.no !== sb.no) return (sa.no ?? 9999) - (sb.no ?? 9999)
  return sa.first.localeCompare(sb.first, 'th')
}

/** ชื่อที่แสดงบนหน้าจอนักเรียน: เลขที่ + ชื่อเล่น (ไม่แสดงนามสกุลและเลขประจำตัวต่อเพื่อน) */
export function publicName(p: Rosterable): string {
  return p.student?.no ? `เลขที่ ${p.student.no} · ${p.name}` : p.name
}

/** ชื่อเต็มสำหรับหน้าครูและรายงาน */
export function teacherName(p: Rosterable): string {
  return p.student ? fullName(p.student) : p.name
}

/* ------------------------------------------------------------------ */
/* รหัสครู                                                              */
/* ------------------------------------------------------------------ */

export function validPin(pin: string): boolean {
  return /^\d{4,6}$/.test(pin)
}

/** รหัสสำรอง 8 ตัวอักษร (ตัด 0 O 1 I ที่อ่านสับสน) */
export function newRecoveryCode(rand: () => number = Math.random): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let out = ''
  for (let i = 0; i < 8; i += 1) out += chars[Math.floor(rand() * chars.length)]
  return `${out.slice(0, 4)}-${out.slice(4)}`
}

export function recoveryMatches(c: Classroom, input: string): boolean {
  const clean = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, '')
  return c.recovery !== '' && clean(input) === clean(c.recovery)
}

/** ข้อความภาคเรียน/ปีการศึกษาสำหรับหัวรายงาน */
export function termLine(c: Classroom): string {
  const parts: string[] = []
  if (c.term) parts.push(`ภาคเรียนที่ ${c.term}`)
  if (c.year) parts.push(`ปีการศึกษา ${c.year}`)
  return parts.join(' ')
}

const THAI_MONTHS = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม']

/** วันที่แบบหนังสือราชการ เช่น 30 ตุลาคม พ.ศ. 2569 */
export function thaiDate(ms: number): string {
  const d = new Date(ms)
  return `${d.getDate()} ${THAI_MONTHS[d.getMonth()]} พ.ศ. ${d.getFullYear() + 543}`
}
