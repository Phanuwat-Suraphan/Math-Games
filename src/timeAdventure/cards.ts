/**
 * การ์ดของผจญภัยเมืองแห่งเวลา (เกมอ่านเวลา ป.2)
 *
 * การ์ดชุดนี้เป็นชุดเดียวกับชุดพิมพ์ time-adventure.html ทุกใบ
 * ครูที่ใช้ทั้งสองแบบในห้องเดียวกันจึงเฉลยจากใบเฉลยแผ่นเดียวได้
 * ต่างกันแค่วิธีตอบ: บนโต๊ะเด็กพูดหรือชี้ ส่วนบนจอเด็กแตะ
 *
 * ทำไมเก็บภาพบนการ์ดเป็นข้อมูล ไม่ใช่ HTML
 *
 * ไฟล์นี้ต้องทดสอบได้ใน Node โดยไม่มีเบราว์เซอร์
 * ชุดทดสอบจึงตรวจได้ว่านาฬิกาบนการ์ดตรงกับเฉลยจริง
 * เช่น การ์ดที่วาดนาฬิกา 8:30 ต้องมีเฉลยเป็น 08:30 ไม่ใช่ 09:30
 * ข้อผิดพลาดแบบนี้ไม่มีอะไรฟ้องเลยนอกจากเด็กที่ตอบถูกแต่เกมบอกว่าผิด
 *
 * ทำไมไม่มีเวลาช่วงตี 1 ถึงตี 5
 *
 * เวลาแบบ 03:30 น. คือตีสามครึ่ง ไม่ใช่บ่ายสามโมงครึ่ง
 * เด็ก ป.2 ไม่มีกิจวัตรในช่วงนั้น และจะจำผิดว่าหน้าปัดบอกเวลาแบบ 24 ชั่วโมงได้
 * หน้าปัดที่อาจเป็นได้ทั้งเช้าและบ่ายจึงมีป้ายบอกช่วงเวลากำกับไว้
 */

export type DeckType = 'time' | 'find' | 'daily' | 'chal'

/** ภาพบนการ์ด หน้าจอเป็นคนตัดสินใจว่าจะวาดอย่างไร */
export type CardVisual =
  | { kind: 'clock'; h: number; m: number; tag?: string }
  | { kind: 'emptyClock'; tag?: string }
  | { kind: 'word'; text: string; blank?: boolean; emoji?: string; tag?: string }
  | { kind: 'clocks'; clocks: Array<[number, number]>; word?: string; tag?: string }
  | { kind: 'rows'; rows: ActivityRow[] }

export interface ActivityRow {
  emoji: string
  label: string
  /** เวลาแบบที่เขียนบนการ์ด เช่น "07:30 น." */
  time: string
}

interface CardBase {
  id: string
  deck: DeckType
  /** จำนวนดาว = จำนวนช่องที่เดินเมื่อตอบถูก */
  stars: 1 | 2 | 3
  question: string
  visual?: CardVisual
  /** เฉลยแบบข้อความ แสดงเมื่อตอบผิด */
  answerText: string
  /** วิธีคิดสั้น ๆ แสดงทุกครั้งหลังตอบ */
  why: string
}

export interface ChoiceCard extends CardBase {
  kind: 'choice'
  options: Array<string | ActivityRow>
  answer: number
  /**
   * ห้ามสลับตัวเลือก
   *
   * ใช้กับการ์ดที่ตัวเลือกผูกกับภาพ (ก ข ค ใต้นาฬิกา)
   * หรือเป็นลำดับตามธรรมชาติ (เช้า บ่าย กลางคืน · ก่อน หลัง)
   */
  fixedOrder?: boolean
}

export interface OrderCard extends CardBase {
  kind: 'order'
  items: ActivityRow[]
  /** ลำดับที่ถูก เป็นตำแหน่งของ items จากก่อนไปหลัง */
  order: number[]
}

export interface SetClockCard extends CardBase {
  kind: 'set'
  start: [number, number]
  target: [number, number]
}

export type TimeCard = ChoiceCard | OrderCard | SetClockCard

const MORNING = '🌅 ตอนเช้า'
const row = (emoji: string, label: string, time: string): ActivityRow => ({ emoji, label, time })

export const TIME_CARDS: TimeCard[] = [
  // ── ⏰ อ่านเวลา ────────────────────────────────────────────
  {
    id: 'T01', deck: 'time', stars: 1, kind: 'choice',
    visual: { kind: 'clock', h: 7, m: 0, tag: MORNING },
    question: 'นาฬิกาบอกเวลาเท่าไร?',
    options: ['07:00 น.', '12:00 น.', '08:00 น.'], answer: 0,
    answerText: '07:00 น. (เจ็ดโมงเช้า)', why: 'เข็มยาวชี้ 12 = ตรงชั่วโมง · เข็มสั้นชี้ 7',
  },
  {
    id: 'T02', deck: 'time', stars: 1, kind: 'choice',
    visual: { kind: 'clock', h: 11, m: 0 },
    question: 'นาฬิกาบอกเวลาเท่าไร?',
    options: ['11:00 น.', '12:00 น.', '10:00 น.'], answer: 0,
    answerText: '11:00 น. (สิบเอ็ดโมง)', why: 'เข็มยาวชี้ 12 = ตรงชั่วโมง · เข็มสั้นชี้ 11 (ไม่ใช่ 12)',
  },
  {
    id: 'T03', deck: 'time', stars: 1, kind: 'set', start: [12, 0], target: [10, 0],
    question: 'หมุนเข็มให้เป็น 10:00 น.',
    answerText: 'เข็มสั้นชี้ 10 · เข็มยาวชี้ 12', why: 'ตรงชั่วโมง เข็มยาวอยู่ที่ 12 เสมอ',
  },
  {
    id: 'T04', deck: 'time', stars: 1, kind: 'choice',
    visual: { kind: 'emptyClock', tag: MORNING },
    question: 'เข็มยาวชี้ 12 เข็มสั้นชี้ 6 เป็นเวลาเท่าไร?',
    options: ['06:00 น.', '12:30 น.', '07:00 น.'], answer: 0,
    answerText: '06:00 น. (หกโมงเช้า)', why: 'เข็มยาวชี้ 12 = ตรงชั่วโมง · เข็มสั้นชี้ 6',
  },
  {
    id: 'T05', deck: 'time', stars: 1, kind: 'choice',
    visual: { kind: 'word', text: 'แปดนาฬิกา', blank: true },
    question: 'เขียนเป็นตัวเลขอย่างไร?',
    options: ['08:00', '00:08', '18:00'], answer: 0,
    answerText: '08:00 น.', why: '8 ชั่วโมง 0 นาที ➜ 08:00',
  },
  {
    id: 'T06', deck: 'time', stars: 1, kind: 'choice',
    visual: { kind: 'emptyClock', tag: '☀️ เที่ยงวัน' },
    question: 'เที่ยงวัน เข็มสั้นและเข็มยาวชี้เลขอะไร?',
    options: ['ชี้ 12 ทั้งสองเข็ม', 'เข็มสั้นชี้ 12 · เข็มยาวชี้ 6', 'เข็มสั้นชี้ 6 · เข็มยาวชี้ 12'], answer: 0,
    answerText: 'ชี้เลข 12 ทั้งสองเข็ม', why: 'เที่ยงวัน = 12:00 น. สองเข็มทับกันที่ 12',
  },
  {
    id: 'T07', deck: 'time', stars: 2, kind: 'choice',
    visual: { kind: 'clock', h: 8, m: 30, tag: MORNING },
    question: 'นาฬิกาบอกเวลาเท่าไร?',
    options: ['08:30 น.', '09:30 น.', '08:06 น.'], answer: 0,
    answerText: '08:30 น. (แปดโมงครึ่ง)', why: 'เข็มยาวชี้ 6 = 30 นาที · เข็มสั้นเลย 8 มาแล้ว',
  },
  {
    id: 'T08', deck: 'time', stars: 2, kind: 'choice',
    visual: { kind: 'emptyClock', tag: '🌤️ ตอนบ่าย' },
    question: 'เข็มยาวชี้ 6 เข็มสั้นอยู่ระหว่าง 3 กับ 4 เป็นเวลาเท่าไร?',
    options: ['บ่ายสามโมงครึ่ง', 'บ่ายสี่โมงครึ่ง', 'บ่ายสามโมงหกนาที'], answer: 0,
    answerText: 'บ่ายสามโมงครึ่ง (15:30 น.)', why: 'เข็มยาวชี้ 6 = ครึ่ง · เข็มสั้นเลย 3 มาแล้ว · ตอนบ่าย',
  },
  {
    id: 'T09', deck: 'time', stars: 2, kind: 'set', start: [12, 0], target: [9, 30],
    question: 'หมุนเข็มให้เป็น 09:30 น.',
    answerText: 'เข็มยาวชี้ 6 · เข็มสั้นอยู่ระหว่าง 9 กับ 10', why: 'ครึ่งชั่วโมง = 30 นาที เข็มยาวไปครึ่งวง',
  },
  {
    id: 'T10', deck: 'time', stars: 2, kind: 'choice',
    visual: { kind: 'word', text: 'สิบนาฬิกาสามสิบนาที', blank: true },
    question: 'เขียนเป็นตัวเลขอย่างไร?',
    options: ['10:30', '30:10', '10:03'], answer: 0,
    answerText: '10:30 น.', why: 'ชั่วโมงไว้หน้า : นาทีไว้หลัง :',
  },
  {
    id: 'T11', deck: 'time', stars: 3, kind: 'choice',
    visual: { kind: 'clock', h: 7, m: 15, tag: MORNING },
    question: 'นาฬิกาบอกเวลาเท่าไร?',
    options: ['07:15 น.', '07:03 น.', '08:15 น.'], answer: 0,
    answerText: '07:15 น. (เจ็ดโมงสิบห้านาที)', why: 'เข็มยาวชี้ 3 ➜ นับ 5, 10, 15 · เข็มสั้นเลย 7',
  },
  {
    id: 'T12', deck: 'time', stars: 3, kind: 'choice',
    visual: { kind: 'emptyClock', tag: MORNING },
    question: 'เข็มยาวชี้ 9 เข็มสั้นอยู่ระหว่าง 8 กับ 9 เป็นเวลาเท่าไร?',
    options: ['08:45 น.', '09:45 น.', '08:09 น.'], answer: 0,
    answerText: '08:45 น.', why: 'นับทีละ 5 ถึงเลข 9 = 45 · เข็มสั้นยังไม่ถึง 9 ➜ 8 โมง',
  },

  // ── 🔍 หาเวลา ─────────────────────────────────────────────
  {
    id: 'F01', deck: 'find', stars: 1, kind: 'choice',
    visual: { kind: 'clock', h: 6, m: 0 }, question: 'เวลาใดตรงกับนาฬิกานี้?',
    options: ['06:00 น.', '07:00 น.', '12:00 น.'], answer: 0,
    answerText: '06:00 น.', why: 'เข็มยาวชี้ 12 · เข็มสั้นชี้ 6',
  },
  {
    id: 'F02', deck: 'find', stars: 1, kind: 'choice',
    visual: { kind: 'clock', h: 9, m: 0 }, question: 'เวลาใดตรงกับนาฬิกานี้?',
    options: ['08:00 น.', '09:00 น.', '10:00 น.'], answer: 1,
    answerText: '09:00 น.', why: 'เข็มยาวชี้ 12 · เข็มสั้นชี้ 9 พอดี',
  },
  {
    id: 'F03', deck: 'find', stars: 1, kind: 'choice',
    visual: { kind: 'clock', h: 12, m: 0 }, question: 'เวลาใดตรงกับนาฬิกานี้?',
    options: ['06:00 น.', '12:00 น. เที่ยงวัน', '11:00 น.'], answer: 1,
    answerText: '12:00 น. เที่ยงวัน', why: 'สองเข็มชี้ 12',
  },
  {
    id: 'F04', deck: 'find', stars: 2, kind: 'choice',
    visual: { kind: 'clock', h: 9, m: 30 }, question: 'เวลาใดตรงกับนาฬิกานี้?',
    options: ['เก้าโมงครึ่ง', 'สิบโมงครึ่ง', 'เก้าโมงหกนาที'], answer: 0,
    answerText: 'เก้าโมงครึ่ง (09:30 น.)', why: 'เข็มยาวชี้ 6 = 30 นาที ไม่ใช่ 6 นาที',
  },
  {
    id: 'F05', deck: 'find', stars: 2, kind: 'choice',
    visual: { kind: 'clock', h: 7, m: 30 }, question: 'เวลาใดตรงกับนาฬิกานี้?',
    options: ['08:30 น.', '07:30 น.', '07:06 น.'], answer: 1,
    answerText: '07:30 น.', why: 'เข็มสั้นเลย 7 แต่ยังไม่ถึง 8 ➜ 7 โมงครึ่ง',
  },
  {
    id: 'F06', deck: 'find', stars: 2, kind: 'choice',
    visual: { kind: 'clock', h: 11, m: 30 }, question: 'เวลาใดตรงกับนาฬิกานี้?',
    options: ['11:30 น.', '12:30 น.', '11:06 น.'], answer: 0,
    answerText: '11:30 น.', why: 'เข็มยาวชี้ 6 = 30 นาที · เข็มสั้นเลย 11',
  },
  {
    id: 'F07', deck: 'find', stars: 2, kind: 'choice', fixedOrder: true,
    visual: { kind: 'clocks', word: 'สิบนาฬิกาสามสิบนาที', clocks: [[10, 30], [10, 0], [6, 50]] },
    question: 'ตรงกับนาฬิกาเรือนไหน?', options: ['ก.', 'ข.', 'ค.'], answer: 0,
    answerText: 'ก.', why: 'เข็มยาวชี้ 6 · เข็มสั้นระหว่าง 10 กับ 11',
  },
  {
    id: 'F08', deck: 'find', stars: 2, kind: 'choice', fixedOrder: true,
    visual: { kind: 'clocks', word: 'หกนาฬิกาสามสิบนาที', clocks: [[6, 0], [7, 30], [6, 30]] },
    question: 'ตรงกับนาฬิกาเรือนไหน?', options: ['ก.', 'ข.', 'ค.'], answer: 2,
    answerText: 'ค.', why: 'เข็มยาวชี้ 6 · เข็มสั้นระหว่าง 6 กับ 7',
  },

  // ── 🏠 ชีวิตประจำวัน ─────────────────────────────────────────
  {
    id: 'D01', deck: 'daily', stars: 1, kind: 'choice', question: 'ทำอะไร ก่อน?',
    options: [row('🛏️', 'ตื่นนอน', '06:00 น.'), row('🦷', 'แปรงฟัน', '06:30 น.')], answer: 0,
    answerText: 'ตื่นนอน', why: '06:00 มาก่อน 06:30',
  },
  {
    id: 'D02', deck: 'daily', stars: 1, kind: 'choice', question: 'ทำอะไร ก่อน?',
    options: [row('🚌', 'ไปโรงเรียน', '07:30 น.'), row('🍳', 'กินข้าวเช้า', '07:00 น.')], answer: 1,
    answerText: 'กินข้าวเช้า', why: 'ชั่วโมงเท่ากัน · 00 นาทีมาก่อน 30 นาที',
  },
  {
    id: 'D03', deck: 'daily', stars: 1, kind: 'choice', question: 'ทำอะไร หลัง?',
    options: [row('🍚', 'กินข้าวกลางวัน', '12:00 น.'), row('🎵', 'เข้าแถวเคารพธงชาติ', '08:00 น.')], answer: 0,
    answerText: 'กินข้าวกลางวัน', why: '12:00 มาหลัง 08:00',
  },
  {
    id: 'D04', deck: 'daily', stars: 1, kind: 'choice', question: 'ทำอะไร หลัง?',
    options: [row('🏡', 'กลับบ้าน', '16:00 น.'), row('😴', 'เข้านอน', '20:00 น.')], answer: 1,
    answerText: 'เข้านอน', why: '20:00 (สองทุ่ม) มาหลัง 16:00 (สี่โมงเย็น)',
  },
  {
    id: 'D05', deck: 'daily', stars: 1, kind: 'choice',
    visual: { kind: 'word', text: 'เที่ยงวัน', emoji: '☀️🍚' },
    question: 'เที่ยงวันเขียนเป็นตัวเลขอย่างไร?',
    options: ['12:00 น.', '10:00 น.', '00:12 น.'], answer: 0,
    answerText: '12:00 น.', why: 'เที่ยงวัน = 12:00 น. เป็นเวลาพักกินข้าวกลางวัน',
  },
  {
    id: 'D06', deck: 'daily', stars: 2, kind: 'order', question: 'แตะเรียงจาก ก่อน ➜ หลัง',
    items: [row('😴', 'เข้านอน', '20:00 น.'), row('🍛', 'กินข้าวเย็น', '18:00 น.'), row('🛁', 'อาบน้ำ', '19:00 น.')],
    order: [1, 2, 0],
    answerText: 'กินข้าวเย็น ➜ อาบน้ำ ➜ เข้านอน', why: '18 ➜ 19 ➜ 20',
  },
  {
    id: 'D07', deck: 'daily', stars: 2, kind: 'order', question: 'แตะเรียงจาก ก่อน ➜ หลัง',
    items: [row('📚', 'เรียนหนังสือ', '09:00 น.'), row('⏰', 'ตื่นนอน', '06:00 น.'), row('🍚', 'กินข้าวกลางวัน', '12:00 น.')],
    order: [1, 0, 2],
    answerText: 'ตื่นนอน ➜ เรียนหนังสือ ➜ กินข้าวกลางวัน', why: '6 ➜ 9 ➜ 12',
  },
  {
    id: 'D08', deck: 'daily', stars: 2, kind: 'choice',
    visual: { kind: 'word', text: 'น้องมะลิ', emoji: '👧' },
    question: 'น้องมะลิทำอะไร ก่อน?',
    options: [row('⚽', 'เล่นฟุตบอล', '16:30 น.'), row('📝', 'ทำการบ้าน', '17:30 น.')], answer: 0,
    answerText: 'เล่นฟุตบอล', why: 'นาทีเท่ากัน · 16 มาก่อน 17',
  },
  {
    id: 'D09', deck: 'daily', stars: 2, kind: 'choice', fixedOrder: true,
    visual: { kind: 'word', text: '20:00 น.' },
    question: 'เป็นตอนเช้า ตอนบ่าย หรือตอนกลางคืน?',
    options: ['🌅 ตอนเช้า', '☀️ ตอนบ่าย', '🌙 ตอนกลางคืน'], answer: 2,
    answerText: 'ตอนกลางคืน (สองทุ่ม)', why: 'หลัง 18:00 น. ฟ้ามืดแล้ว',
  },
  {
    /*
     * บนโต๊ะ ใบนี้คือการทายท่าทาง ซึ่งทำบนจอไม่ได้
     * จึงถามเรื่องเดียวกันเป็นตัวเลือกแทน: เวลา 07:00 น. เป็นเวลาทำอะไร
     */
    id: 'D10', deck: 'daily', stars: 2, kind: 'choice',
    visual: { kind: 'word', text: '07:00 น.' },
    question: 'ตอนนี้เด็ก ๆ มักทำอะไร?',
    options: ['🍳 กินข้าวเช้า', '😴 เข้านอน', '🍛 กินข้าวเย็น'], answer: 0,
    answerText: 'กินข้าวเช้า', why: '07:00 น. เป็นเวลาเช้า ก่อนเข้าเรียน',
  },

  // ── ⚔️ ท้าทาย ─────────────────────────────────────────────
  {
    id: 'C01', deck: 'chal', stars: 2, kind: 'choice', question: 'เวลาใด มาก่อน?',
    options: ['08:00 น.', '09:00 น.'], answer: 0,
    answerText: '08:00 น.', why: '8 น้อยกว่า 9 ➜ มาก่อน',
  },
  {
    id: 'C02', deck: 'chal', stars: 2, kind: 'choice', question: 'เวลาใด มาทีหลัง?',
    options: ['10:30 น.', '10:00 น.'], answer: 0,
    answerText: '10:30 น.', why: 'ชั่วโมงเท่ากัน · 30 นาทีมาหลัง 0 นาที',
  },
  {
    id: 'C03', deck: 'chal', stars: 2, kind: 'order', question: 'แตะเรียงจาก ก่อน ➜ หลัง',
    items: [row('🕖', '', '07:00 น.'), row('🕕', '', '06:00 น.'), row('🕗', '', '08:00 น.')],
    order: [1, 0, 2],
    answerText: '06:00 ➜ 07:00 ➜ 08:00', why: 'เรียงเลขชั่วโมง 6, 7, 8',
  },
  {
    id: 'C04', deck: 'chal', stars: 2, kind: 'choice', fixedOrder: true,
    visual: { kind: 'rows', rows: [row('🏫', 'เข้าเรียน', '08:00 น.'), row('🛏️', 'ตื่นนอน', '07:00 น.')] },
    question: 'ตื่นนอน ก่อน หรือ หลัง เข้าเรียน?', options: ['ก่อน', 'หลัง'], answer: 0,
    answerText: 'ก่อน', why: '7 มาก่อน 8',
  },
  {
    id: 'C05', deck: 'chal', stars: 2, kind: 'order', question: 'แตะเรียงจาก ก่อน ➜ หลัง',
    items: [row('🕤', '', '09:30 น.'), row('🕘', '', '09:00 น.'), row('🕙', '', '10:00 น.')],
    order: [1, 0, 2],
    answerText: '09:00 ➜ 09:30 ➜ 10:00', why: '09:30 อยู่กลางระหว่าง 9 โมงกับ 10 โมง',
  },
  {
    id: 'C06', deck: 'chal', stars: 3, kind: 'set', start: [8, 0], target: [9, 0],
    question: 'ตอนนี้ 08:00 น. หมุนเข็มไปอีก 1 ชั่วโมง',
    answerText: '09:00 น.', why: 'เข็มยาวหมุนครบ 1 รอบ เข็มสั้นขยับไป 1 เลข',
  },
  {
    id: 'C07', deck: 'chal', stars: 3, kind: 'choice',
    visual: { kind: 'word', text: 'ครึ่งชั่วโมง = ? นาที', tag: '💡 1 ชั่วโมง = 60 นาที' },
    question: 'ครึ่งชั่วโมงมีกี่นาที?', options: ['30 นาที', '60 นาที', '6 นาที'], answer: 0,
    answerText: '30 นาที', why: 'ครึ่งของ 60 = 30 · เข็มยาวชี้ 6',
  },
  {
    id: 'C08', deck: 'chal', stars: 3, kind: 'choice', fixedOrder: true,
    visual: { kind: 'clocks', clocks: [[11, 0], [10, 30]], tag: '🌅 ตอนเช้าทั้งคู่' },
    question: 'นาฬิกาเรือนไหน มาก่อน?', options: ['ก.', 'ข.'], answer: 1,
    answerText: 'ข. (10:30 น.)', why: 'ก. = 11:00 · ข. = 10:30 · 10 มาก่อน 11',
  },
  {
    id: 'C09', deck: 'chal', stars: 3, kind: 'choice', fixedOrder: true,
    visual: { kind: 'rows', rows: [row('🚌', 'รถโรงเรียนออก', '07:00 น.'), row('🧒', 'หนูถึงป้ายรถ', '07:30 น.')] },
    question: 'หนูขึ้นรถทันไหม?', options: ['ทัน', 'ไม่ทัน'], answer: 1,
    answerText: 'ไม่ทัน', why: '07:30 มาหลัง 07:00 · ถึงหลังรถออก',
  },
  {
    id: 'C10', deck: 'chal', stars: 3, kind: 'choice', fixedOrder: true,
    visual: { kind: 'rows', rows: [row('🧸', 'ร้านของเล่นเปิด', '09:00 น.'), row('🧒', 'หนูไปถึง', '08:30 น.')] },
    question: 'หนูต้องรอไหม?', options: ['ต้องรอ', 'ไม่ต้องรอ'], answer: 0,
    answerText: 'ต้องรอ', why: '08:30 มาก่อน 09:00 · ถึงก่อนร้านเปิด 30 นาที',
  },
]

const BY_ID = new Map(TIME_CARDS.map((card) => [card.id, card]))

export function getTimeCard(id: string): TimeCard | undefined {
  return BY_ID.get(id)
}

/** คำในโจทย์ที่ต้องเน้นให้เด็กเห็น เพราะเปลี่ยนคำตอบทั้งข้อ */
export const EMPHASIS_WORDS = ['ก่อน', 'หลัง', 'มาก่อน', 'มาทีหลัง', '1 ชั่วโมง']

export const DECK_INFO: Record<DeckType, { icon: string; name: string; color: string; bg: string }> = {
  time: { icon: '⏰', name: 'อ่านเวลา', color: '#1E88D9', bg: '#E6F3FC' },
  find: { icon: '🔍', name: 'หาเวลา', color: '#8B4FC7', bg: '#F2E9FB' },
  daily: { icon: '🏠', name: 'ชีวิตประจำวัน', color: '#3E9E4F', bg: '#E7F5E9' },
  chal: { icon: '⚔️', name: 'ท้าทาย', color: '#E8572E', bg: '#FDEBE4' },
}
