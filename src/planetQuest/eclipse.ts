/**
 * ห้องทดลองอุปราคา — แบบจำลองดวงอาทิตย์ โลก และดวงจันทร์ แบบมองจากด้านบน
 *
 * ทำไมเป็นภาพสองมิติ ไม่ใช่สามมิติเหมือนฉากระบบสุริยะ
 *
 * หนังสือเรียน ป.6 อธิบายอุปราคาด้วยภาพมองจากด้านบนที่ดวงอาทิตย์อยู่ซ้าย
 * โลกอยู่กลาง และดวงจันทร์วางอยู่แปดตำแหน่งรอบโลก ภาพในเกมจึงหน้าตาเดียวกัน
 * เด็กจะเอาสิ่งที่เล่นไปต่อกับสิ่งที่ครูวาดบนกระดานได้ทันที
 * ส่วนภาพสามมิติที่หมุนได้ ทำให้หาแนวเส้นตรงของดาวสามดวงยากขึ้นโดยไม่ได้อะไรเพิ่ม
 *
 * ทำไมดวงจันทร์วางได้แค่แปดตำแหน่ง ไม่ได้ลากไปตรงไหนก็ได้
 *
 * แปดตำแหน่งคือแปดรูปร่างของดวงจันทร์ที่เรียนมาตั้งแต่ ป.4 (ดับ เสี้ยว ครึ่งดวง ค่อนดวง เพ็ญ)
 * และทำให้ขนาดในภาพเป็นสัดส่วนเดียวกับที่ใช้คำนวณเงาได้จริง
 * ถ้าลากได้ทุกองศา ภาพที่ย่อระยะดวงจันทร์ลงมาให้พอดีจอ จะทำให้อุปราคาเกิดได้
 * ในช่วงกว้างหลายวันรอบวันเพ็ญ ซึ่งขัดกับบทเรียนว่าเกิดได้เฉพาะวันเพ็ญและวันดับ
 *
 * เงาทุกเส้นในภาพคำนวณจากตัวเลขชุดเดียวกับที่ตัดสินว่าเกิดอุปราคาแบบไหน
 * เด็กจึงไม่มีทางเห็นดวงจันทร์อยู่ในเงามืดแต่เกมบอกว่าไม่เกิดอุปราคา
 *
 * แบบจำลองนี้วาดวงโคจรของดวงจันทร์ไม่เอียง เหมือนภาพในหนังสือ จึงเกิดอุปราคาทุกครั้งที่เรียงตรงกัน
 * หน้าจอบอกเด็กเรื่องนี้ตรง ๆ และมีคำถามว่าทำไมของจริงไม่เกิดทุกเดือน
 */

/** ขนาดของภาพ หน่วยเดียวกับ viewBox ของ SVG */
export const LAB = {
  width: 420,
  height: 260,
  earthX: 250,
  earthY: 130,
  earthRadius: 18,
  moonRadius: 6,
  /** ระยะดวงจันทร์ตอนอยู่ใกล้โลกที่สุด และไกลที่สุด */
  nearOrbit: 72,
  farOrbit: 90,
  /**
   * แทนเจนต์ของครึ่งมุมที่ดวงอาทิตย์กางกว้างเมื่อมองจากโลก กำหนดความยาวของเงามืด
   *
   * เลือกค่าให้เงามืดของดวงจันทร์ยาวพอแตะผิวโลกตอนดวงจันทร์อยู่ใกล้
   * และสั้นไม่ถึงตอนอยู่ไกล ซึ่งคือเหตุผลเดียวกับของจริงที่ทำให้มีสุริยุปราคาวงแหวน
   */
  sunSpread: 0.1,
} as const

export type EclipseKind =
  | 'none'
  | 'solar-total'
  | 'solar-annular'
  | 'solar-partial'
  | 'lunar-total'
  | 'lunar-partial'
  | 'lunar-penumbral'

export const ECLIPSE_NAMES: Record<EclipseKind, string> = {
  none: 'ไม่เกิดอุปราคา',
  'solar-total': 'สุริยุปราคาเต็มดวง',
  'solar-annular': 'สุริยุปราคาวงแหวน',
  'solar-partial': 'สุริยุปราคาบางส่วน',
  'lunar-total': 'จันทรุปราคาเต็มดวง',
  'lunar-partial': 'จันทรุปราคาบางส่วน',
  'lunar-penumbral': 'จันทรุปราคาเงามัว',
}

/** แปดตำแหน่งของดวงจันทร์ เริ่มจากจันทร์ดับที่อยู่ระหว่างดวงอาทิตย์กับโลก แล้ววนทวนเข็มนาฬิกา */
export const MOON_SLOTS: readonly { name: string; day: string }[] = [
  { name: 'จันทร์ดับ', day: 'แรม 15 ค่ำ' },
  { name: 'เสี้ยวข้างขึ้น', day: 'ขึ้น 4 ค่ำ' },
  { name: 'ครึ่งดวงข้างขึ้น', day: 'ขึ้น 8 ค่ำ' },
  { name: 'ค่อนดวงข้างขึ้น', day: 'ขึ้น 11 ค่ำ' },
  { name: 'จันทร์เพ็ญ', day: 'ขึ้น 15 ค่ำ' },
  { name: 'ค่อนดวงข้างแรม', day: 'แรม 4 ค่ำ' },
  { name: 'ครึ่งดวงข้างแรม', day: 'แรม 8 ค่ำ' },
  { name: 'เสี้ยวข้างแรม', day: 'แรม 11 ค่ำ' },
]

export interface LabState {
  /** 0–7 ตามลำดับใน MOON_SLOTS */
  slot: number
  /** ดวงจันทร์อยู่ไกลโลก (ใกล้จุดไกลโลกที่สุดของวงโคจร) */
  far: boolean
}

export function normalizeSlot(slot: number): number {
  const count = MOON_SLOTS.length
  return ((Math.round(slot) % count) + count) % count
}

/** มุมของดวงจันทร์ วัดจากทิศที่ชี้ไปหาดวงอาทิตย์ หน่วยเรเดียน */
export function slotAngle(slot: number): number {
  return (normalizeSlot(slot) / MOON_SLOTS.length) * Math.PI * 2
}

export function orbitRadius(state: LabState): number {
  return state.far ? LAB.farOrbit : LAB.nearOrbit
}

/**
 * ตำแหน่งดวงจันทร์บนภาพ
 *
 * ดวงอาทิตย์อยู่ทางซ้าย แกน y ของภาพชี้ลง
 * มุม 0 คือด้านซ้ายของโลก แล้วเลื่อนลงล่าง ไปขวา และขึ้นบน ซึ่งคือทวนเข็มนาฬิกาบนจอ
 * ตรงกับทิศที่ดวงจันทร์โคจรจริงเมื่อมองจากด้านเหนือ
 */
export function moonPoint(state: LabState): { x: number; y: number } {
  const angle = slotAngle(state.slot)
  const radius = orbitRadius(state)
  return {
    x: LAB.earthX - radius * Math.cos(angle),
    y: LAB.earthY + radius * Math.sin(angle),
  }
}

export interface EclipseReport {
  kind: EclipseKind
  /**
   * ภาพที่มองเห็นจากโลก
   *
   * day: ท้องฟ้ากลางวันที่มีดวงอาทิตย์ ใช้ตอนดวงจันทร์อยู่ฝั่งดวงอาทิตย์และบังได้
   *      moonSize คือขนาดที่ปรากฏของดวงจันทร์เทียบกับดวงอาทิตย์ (1 = เท่ากันพอดี)
   *      offset คือระยะห่างของจุดศูนย์กลางทั้งสอง เทียบกับรัศมีดวงอาทิตย์
   * night: ท้องฟ้ากลางคืนที่เห็นดวงจันทร์ litFraction คือสัดส่วนด้านสว่าง
   *      shadow คือส่วนของดวงจันทร์ที่อยู่ในเงามืดของโลก 0–1
   */
  sky:
    | { kind: 'day'; moonSize: number; offset: number }
    | { kind: 'night'; litFraction: number; waxing: boolean; shadow: number; penumbra: boolean }
}

/**
 * ตัดสินว่าตำแหน่งนี้เกิดอุปราคาแบบไหน
 *
 * คิดในกรอบที่โลกอยู่ตรงกลางและแสงอาทิตย์วิ่งจากซ้ายไปขวา
 * along = ดวงจันทร์อยู่ห่างจากโลกไปทางซ้าย (ฝั่งดวงอาทิตย์) ติดลบ หรือทางขวาเป็นบวก
 * off   = ดวงจันทร์ห่างจากเส้นตรงที่ลากผ่านดวงอาทิตย์กับโลกเท่าไร
 */
export function eclipseAt(state: LabState): EclipseReport {
  const moon = moonPoint(state)
  const along = moon.x - LAB.earthX
  const off = Math.abs(moon.y - LAB.earthY)
  const angle = slotAngle(state.slot)
  const litFraction = (1 - Math.cos(angle)) / 2
  const waxing = angle > 0 && angle < Math.PI

  if (along < 0) {
    // ดวงจันทร์อยู่ฝั่งดวงอาทิตย์ เงาของดวงจันทร์ทอดไปทางโลก
    const hitsEarth = off <= LAB.earthRadius
    const reach = -along - (hitsEarth ? Math.sqrt(LAB.earthRadius ** 2 - off ** 2) : 0)
    const umbra = LAB.moonRadius - reach * LAB.sunSpread
    const penumbra = LAB.moonRadius + reach * LAB.sunSpread

    const sunSize = Math.atan(LAB.sunSpread)
    const moonSize = Math.atan(LAB.moonRadius / reach) / sunSize
    const offset = Math.atan(Math.max(0, off - LAB.earthRadius) / reach) / sunSize

    let kind: EclipseKind = 'none'
    if (hitsEarth) kind = umbra > 0 ? 'solar-total' : 'solar-annular'
    else if (off <= LAB.earthRadius + penumbra) kind = 'solar-partial'

    if (kind !== 'none') return { kind, sky: { kind: 'day', moonSize, offset } }
    return { kind, sky: { kind: 'night', litFraction, waxing, shadow: 0, penumbra: false } }
  }

  // ดวงจันทร์อยู่ฝั่งตรงข้ามดวงอาทิตย์ อาจเข้าไปอยู่ในเงาของโลก
  const umbra = LAB.earthRadius - along * LAB.sunSpread
  const penumbra = LAB.earthRadius + along * LAB.sunSpread
  const r = LAB.moonRadius

  let kind: EclipseKind = 'none'
  if (off + r <= umbra) kind = 'lunar-total'
  else if (off - r < umbra) kind = 'lunar-partial'
  else if (off - r < penumbra) kind = 'lunar-penumbral'

  // ส่วนของดวงจันทร์ที่จมในเงามืด คิดแบบเส้นตรงตามแนวที่ดวงจันทร์ตัดขอบเงา พอสำหรับแรเงาภาพ
  const shadow = Math.max(0, Math.min(1, (umbra - (off - r)) / (2 * r)))
  return {
    kind,
    sky: { kind: 'night', litFraction, waxing, shadow, penumbra: kind === 'lunar-penumbral' },
  }
}

export function isSolar(kind: EclipseKind): boolean {
  return kind.startsWith('solar')
}

export function isLunar(kind: EclipseKind): boolean {
  return kind.startsWith('lunar')
}

/** รูปหลายเหลี่ยมของเงาบนภาพ ใช้วาด SVG ตรง ๆ */
export interface ShadowShapes {
  earthUmbra: [number, number][]
  earthPenumbra: [number, number][]
  moonUmbra: [number, number][]
  moonPenumbra: [number, number][]
}

/**
 * เงาของโลกและของดวงจันทร์ ยาวถึงขอบขวาของภาพ
 *
 * เงามืดเป็นกรวยที่แคบลงเรื่อย ๆ เพราะดวงอาทิตย์ใหญ่กว่าโลก
 * เงามัวเป็นกรวยที่บานออก เป็นบริเวณที่แสงอาทิตย์ถูกบังเพียงบางส่วน
 */
export function shadowShapes(state: LabState): ShadowShapes {
  const moon = moonPoint(state)
  const edge = LAB.width + 20

  const cone = (x: number, y: number, radius: number): [number, number][] => {
    const length = radius / LAB.sunSpread
    const tipX = Math.min(edge, x + length)
    const halfAtTip = Math.max(0, radius - (tipX - x) * LAB.sunSpread)
    return [
      [x, y - radius],
      [tipX, y - halfAtTip],
      [tipX, y + halfAtTip],
      [x, y + radius],
    ]
  }
  const fan = (x: number, y: number, radius: number, length: number): [number, number][] => {
    const tipX = Math.min(edge, x + length)
    const half = radius + (tipX - x) * LAB.sunSpread
    return [
      [x, y - radius],
      [tipX, y - half],
      [tipX, y + half],
      [x, y + radius],
    ]
  }

  return {
    earthUmbra: cone(LAB.earthX, LAB.earthY, LAB.earthRadius),
    earthPenumbra: fan(LAB.earthX, LAB.earthY, LAB.earthRadius, edge - LAB.earthX),
    moonUmbra: cone(moon.x, moon.y, LAB.moonRadius),
    // เงามัวของดวงจันทร์วาดยาวแค่เลยโลกไปเล็กน้อย ไม่ให้บังภาพเงาของโลกจนอ่านไม่ออก
    moonPenumbra: fan(moon.x, moon.y, LAB.moonRadius, Math.max(0, LAB.earthX + LAB.earthRadius - moon.x)),
  }
}

/* ------------------------------------------------------------------ *
 * ภารกิจในห้องทดลอง
 * ------------------------------------------------------------------ */

export interface LabTask {
  id: string
  goal: EclipseKind
  instruction: string
  hint: string
  start: LabState
  /** เปิดปุ่มสลับระยะใกล้ไกลให้ใช้ได้หรือยัง */
  allowFar: boolean
  /** เกร็ดสั้น ๆ ที่ขึ้นตอนทำสำเร็จ แทนคำถามท้ายภารกิจ ให้ได้รู้โดยไม่ต้องหยุดตอบข้อสอบ */
  fact: string
}

export const LAB_TASKS: readonly LabTask[] = [
  {
    id: 'make-solar',
    goal: 'solar-total',
    instruction: 'เลื่อนดวงจันทร์ไปยังตำแหน่งที่ทำให้เกิดสุริยุปราคาเต็มดวง',
    hint: 'สุริยุปราคาคือดวงจันทร์บังดวงอาทิตย์ ดวงจันทร์ต้องไปอยู่ระหว่างดวงอาทิตย์กับโลก',
    start: { slot: 2, far: false },
    allowFar: false,
    fact: 'ดวงจันทร์อยู่ตรงกลางแล้วบังดวงอาทิตย์ เกิดได้เฉพาะวันจันทร์ดับ (แรม 15 ค่ำ) และเห็นได้แค่บางที่บนโลก',
  },
  {
    id: 'make-lunar',
    goal: 'lunar-total',
    instruction: 'เลื่อนดวงจันทร์ไปยังตำแหน่งที่ทำให้เกิดจันทรุปราคาเต็มดวง',
    hint: 'จันทรุปราคาคือดวงจันทร์เข้าไปอยู่ในเงาของโลก ดูว่าเงาสีเข้มของโลกทอดไปทางไหน',
    start: { slot: 6, far: false },
    allowFar: false,
    fact: 'ดวงจันทร์หลบเข้าไปในเงาโลกแล้วกลายเป็นสีแดงอิฐ เกิดได้เฉพาะคืนจันทร์เพ็ญ (ขึ้น 15 ค่ำ) คนไทยสมัยก่อนเรียกว่าราหูอมจันทร์',
  },
  {
    id: 'make-annular',
    goal: 'solar-annular',
    instruction: 'ตอนนี้เป็นสุริยุปราคาเต็มดวง ลองทำให้กลายเป็นสุริยุปราคาวงแหวน',
    hint: 'ดวงจันทร์อยู่ตำแหน่งถูกแล้ว ลองกดปุ่มให้ดวงจันทร์อยู่ไกลโลก แล้วดูว่าเงามืดยังแตะโลกไหม',
    start: { slot: 0, far: false },
    allowFar: true,
    fact: 'ดวงจันทร์อยู่ไกลจนดูเล็กกว่าดวงอาทิตย์ บังไม่มิด เลยเห็นขอบดวงอาทิตย์เป็นวงแหวนไฟ',
  },
]

/**
 * คำถามปิดท้ายห้องทดลอง สุ่มถามข้อเดียวหลังทำภารกิจครบ
 *
 * ตั้งใจให้เหลือข้อเดียว เพราะหัวใจของด่านนี้คือการได้ขยับดวงจันทร์เอง
 * คำถามเรียงยาวต่อท้ายทำให้ด่านที่สนุกที่สุดกลายเป็นแบบทดสอบ
 * ข้อเรื่องความปลอดภัยออกบ่อยที่สุดโดยตั้งใจ เพราะเป็นเรื่องที่เด็กต้องรู้จริงก่อนออกไปดูของจริง
 */
export const LAB_FINAL_QUESTIONS: readonly string[] = ['safe', 'safe', 'red', 'monthly', 'rahu']

/**
 * เส้นขอบด้านสว่างของดวงจันทร์ สำหรับ SVG
 *
 * ครึ่งวงกลมด้านที่หันหาแสง ต่อด้วยครึ่งวงรีของเส้นแบ่งกลางวันกลางคืน
 * ข้างขึ้นสว่างทางขวา ข้างแรมสว่างทางซ้าย ตามที่คนในประเทศไทยมองเห็นจริง
 * คืน null เมื่อไม่มีด้านสว่างเลย (จันทร์ดับ) หน้าจอจะวาดแค่ดวงมืด
 */
export function moonPhasePath(cx: number, cy: number, r: number, litFraction: number, waxing: boolean): string | null {
  const f = Math.max(0, Math.min(1, litFraction))
  if (f < 0.01) return null
  const top = `${cx} ${cy - r}`
  const bottom = `${cx} ${cy + r}`
  if (f > 0.99) {
    return `M ${top} A ${r} ${r} 0 1 1 ${bottom} A ${r} ${r} 0 1 1 ${top} Z`
  }
  const rx = Math.abs(1 - 2 * f) * r
  const gibbous = f > 0.5
  const edgeSweep = waxing ? 1 : 0
  const terminatorSweep = waxing ? (gibbous ? 1 : 0) : gibbous ? 0 : 1
  return `M ${top} A ${r} ${r} 0 0 ${edgeSweep} ${bottom} A ${rx} ${r} 0 0 ${terminatorSweep} ${top} Z`
}
