/**
 * กฎการรับสัญญาณจากนิ้ว ปากกา และเมาส์
 *
 * ทำไมต้องมีไฟล์นี้แยกออกมา
 *
 * เด็กที่ใช้ปากกาบนแท็บเล็ตจะเอาฝ่ามือวางบนจอเสมอ นั่นคือวิธีจับปากกาของคนปกติ
 * ถ้ารับทุกสัญญาณเท่ากันหมด ฝ่ามือจะกลายเป็นนิ้วอีกนิ้วที่ลากเส้นของตัวเอง
 * ผลคือมีเส้นโผล่มากลางกระดาษโดยไม่มีใครรู้ว่ามาจากไหน
 * และเด็กจะสรุปว่า "โปรแกรมนี้ใช้ปากกาไม่ได้" ทั้งที่ปากกาทำงานถูกต้องทุกประการ
 *
 * กฎทั้งหมดอยู่ในไฟล์นี้เป็นฟังก์ชันล้วน ชุดทดสอบจึงจำลองฝ่ามือแตะได้
 * โดยไม่ต้องมีแท็บเล็ตจริงมาทดสอบ
 */

export type PointerKind = 'mouse' | 'pen' | 'touch'

export interface PointerGate {
  /** รหัสของนิ้วหรือปากกาที่กำลังลากอยู่ ไม่มีใครลากอยู่คือ null */
  activeId: number | null
  /** เวลาล่าสุดที่เห็นปากกา หน่วยเป็นมิลลิวินาที */
  lastPenAt: number
  /** เคยเห็นปากกาในคาบนี้แล้วหรือยัง ใช้บอกผู้ใช้ว่าโหมดกันฝ่ามือทำงานอยู่ */
  penSeen: boolean
}

export const EMPTY_GATE: PointerGate = { activeId: null, lastPenAt: 0, penSeen: false }

/**
 * ช่วงเวลาที่ยังกันนิ้วไว้หลังปากกาแตะล่าสุด
 *
 * หนึ่งวินาทีครึ่งมาจากพฤติกรรมจริงตอนเขียน คนยกปากกาขึ้นระหว่างขีดสั้น ๆ ตลอด
 * ถ้าตั้งสั้นกว่านี้ ฝ่ามือจะแทรกเข้ามาได้ในจังหวะที่ยกปากกา
 * ถ้าตั้งยาวกว่านี้ คนที่เปลี่ยนมาใช้นิ้วต่อจะรู้สึกว่าจอค้างไม่ยอมรับนิ้ว
 */
export const PEN_GUARD_MS = 1500

/**
 * นี่คือฝ่ามือที่วางบนจอระหว่างเขียนด้วยปากกาหรือเปล่า
 *
 * ต้องเช็ค penSeen ด้วย ไม่ใช่ดูแค่เวลาที่ผ่านไปจาก lastPenAt
 * เพราะห้องที่ไม่มีปากกาเลย lastPenAt จะเป็นศูนย์ตลอด
 * ถ้าเทียบเวลาอย่างเดียว นิ้วจะถูกกันทิ้งทั้งห้องโดยไม่มีปากกาสักด้าม
 */
export function isPalmDuringPen(gate: PointerGate, kind: PointerKind, now: number): boolean {
  return kind === 'touch' && gate.penSeen && now - gate.lastPenAt < PEN_GUARD_MS
}

/** สัญญาณนี้ควรถูกทิ้งไปไหม */
export function shouldIgnorePointer(
  gate: PointerGate,
  pointerId: number,
  kind: PointerKind,
  now: number,
): boolean {
  if (isPalmDuringPen(gate, kind, now)) return true
  /* กำลังลากด้วยอย่างหนึ่งอยู่ นิ้วที่แตะเพิ่มเข้ามาต้องไม่แย่งงาน */
  if (gate.activeId !== null && pointerId !== gate.activeId) return true
  return false
}

/** จดว่าเพิ่งเห็นสัญญาณอะไร ใช้กับทุกเหตุการณ์รวมถึงการเลื่อนผ่านเฉย ๆ */
export function noteInput(gate: PointerGate, kind: PointerKind, now: number): PointerGate {
  if (kind !== 'pen') return gate
  return { ...gate, lastPenAt: now, penSeen: true }
}

/** เริ่มลาก จองสิทธิ์ให้ตัวที่กดลงไปก่อน */
export function beginPointer(
  gate: PointerGate,
  pointerId: number,
  kind: PointerKind,
  now: number,
): PointerGate {
  return { ...noteInput(gate, kind, now), activeId: pointerId }
}

/** ปล่อยมือ คืนสิทธิ์ให้ตัวถัดไป */
export function endPointer(gate: PointerGate, pointerId: number): PointerGate {
  if (gate.activeId !== pointerId) return gate
  return { ...gate, activeId: null }
}

/**
 * ปลายยางลบของปากกาถูกกดอยู่ไหม
 *
 * ปากกาแท็บเล็ตส่วนใหญ่ส่งบิตที่ห้าของ buttons มาเมื่อพลิกปากกาใช้ด้านยางลบ
 * รองรับไว้เพราะเด็กที่มีปากกาแบบนี้จะพลิกลบโดยอัตโนมัติอยู่แล้ว
 */
export function isEraserTip(kind: PointerKind, buttons: number): boolean {
  return kind === 'pen' && (buttons & 32) !== 0
}

/** แปลงค่าที่เบราว์เซอร์ส่งมาให้เป็นชนิดที่ไฟล์นี้รู้จัก */
export function pointerKind(value: string): PointerKind {
  if (value === 'pen') return 'pen'
  if (value === 'touch') return 'touch'
  return 'mouse'
}
