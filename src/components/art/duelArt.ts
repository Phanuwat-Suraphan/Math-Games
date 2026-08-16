/**
 * จับคู่การ์ดของเกม Divisor Duel เข้ากับภาพวาดของ Math Adventure
 *
 * ทำไมต้องมีไฟล์แยก ไม่ใส่ไอดีภาพลงในการ์ดโดยตรง
 *
 * โฟลเดอร์ src/divisorDuel ตั้งใจให้แยกออกจาก Math Adventure โดยสิ้นเชิง
 * ย้ายไปเป็นโปรเจกต์ของตัวเองได้ทันทีโดยไม่ต้องแก้อะไร
 * ถ้าเขียนไอดีภาพของ Math Adventure ลงในไฟล์การ์ด ความเป็นอิสระนั้นจะหายไป
 * และการ์ดจะพังทันทีที่ย้ายออกไปโดยไม่มีภาพชุดนี้ตามไปด้วย
 *
 * การจับคู่จึงอยู่ที่ชั้นหน้าจอแทน ซึ่งเป็นชั้นที่รู้จักทั้งสองฝั่งอยู่แล้ว
 *
 * หลักการจับคู่: เลือกจากรูปร่างและสีที่ใกล้เคียงกับชื่อการ์ดจริง
 * ไม่ใช่สุ่มหรือไล่ตามลำดับ เพราะเด็กจำมอนจากรูปมากกว่าจำจากชื่อ
 * ถ้ามังกรกลายเป็นสไลม์ เด็กจะสับสนกับที่เคยเจอในโหมดอื่น
 */

/** มอนสเตอร์องครักษ์ทั้งหกตัวของเกมการ์ด */
const MONSTER_ART_BY_CARD: Record<string, string> = {
  // การ์กอยล์หิน จับคู่กับโกเลมหิน เพราะเป็นตัวหินสีเทาเหมือนกัน
  'stone-gargoyle': 'geometry-golem',
  // โทรลล์บึง จับคู่กับก็อบลิน เพราะเป็นตัวเขียวรูปร่างคล้ายคน
  'swamp-troll': 'goblin-calculator',
  // ไวเวิร์นแดง จับคู่กับค้างคาว เพราะเป็นตัวมีปีกเหมือนกัน
  'crimson-wyvern': 'fraction-bat',
  // โกเลมเหล็ก จับคู่กับอัศวินจำนวนเฉพาะ เพราะเป็นเกราะโลหะทั้งตัว
  'iron-golem': 'prime-knight',
  // ราชาโครงกระดูก จับคู่กับผีสมการ เพราะเป็นสายอมตะโปร่งแสงเหมือนกัน
  'skeleton-king': 'equation-wraith',
  // มังกรแห่งความว่างเปล่า คือบอส จับคู่กับมังกรแห่งตัวเลขซึ่งเป็นบอสของเราเช่นกัน
  'void-dragon': 'dragon-of-numbers',
}

/** ฮีโร่ทั้งสี่ของเกมการ์ด จับคู่กับอวตารของ Math Adventure */
const HERO_ART_BY_CARD: Record<string, string> = {
  // นักบวชหญิงผู้ใช้โล่ศักดิ์สิทธิ์
  'high-priestess-elara': 'mage',
  // จอมเวทผู้บิดเบือนสมการได้ ตรงกับนักวิทยาศาสตร์ที่ชอบทดลอง
  'grand-wizard-arcanus': 'scientist',
  // อัศวินผู้บัญชาการ ตรงกับนักรบโดยตรง
  'knight-commander-valerius': 'warrior',
  // ราชินีลิช สายดูดพลัง ใช้อวตารนักผจญภัยซึ่งมีโทนสีแดงเข้ากัน
  'lich-queen-morwenna': 'adventurer',
}

/** การ์ดเครื่องหมายทั้งสามใบ จับคู่กับภาพของสะสม */
const OPERATOR_ART_BY_SYMBOL: Record<string, string> = {
  '+': 'compass',
  '-': 'ruler',
  '*': 'infinityPen',
}

/**
 * ไอดีภาพมอนสเตอร์ของการ์ดใบหนึ่ง
 *
 * คืนภาพสำรองแทนที่จะคืน undefined เพราะการ์ดที่ไม่มีภาพจะกลายเป็นช่องว่าง
 * ซึ่งอ่านเป็น "แอปพัง" มากกว่าอ่านเป็น "การ์ดใบนี้ยังไม่มีรูป"
 */
export function duelMonsterArt(monsterId: string): string {
  return MONSTER_ART_BY_CARD[monsterId] ?? 'number-slime'
}

export function duelHeroArt(heroId: string): string {
  return HERO_ART_BY_CARD[heroId] ?? 'warrior'
}

export function duelOperatorArt(symbol: string): string {
  return OPERATOR_ART_BY_SYMBOL[symbol] ?? 'goldStar'
}

/**
 * ระดับของการ์ดตัวเลข ใช้เลือกสีกรอบ
 *
 * แบ่งตามช่วงเดียวกับที่ deck.ts ใช้ตอนสร้างการ์ด
 * เขียนซ้ำที่นี่แทนการนำเข้า เพราะฝั่งนั้นเป็นรายละเอียดภายในของเครื่องยนต์
 * ที่หน้าจอไม่ควรผูกติด ถ้าวันหนึ่งเครื่องยนต์เปลี่ยนช่วง หน้าจอก็ยังทำงานได้
 */
export type NumberLook = { label: string; className: string }

export function numberCardLook(value: number): NumberLook {
  if (value >= 50) {
    return { label: 'ว่างเปล่า', className: 'card-void' }
  }
  if (value >= 20) {
    return { label: 'ตำนาน', className: 'card-legendary' }
  }
  if (value >= 10) {
    return { label: 'สูง', className: 'card-advanced' }
  }
  return { label: 'พื้นฐาน', className: 'card-basic' }
}
