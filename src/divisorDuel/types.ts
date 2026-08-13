/**
 * Divisor Duel — ศึกผ่าสมการในตำนาน
 * นิยามข้อมูลการ์ด ถอดจากรูปการ์ดจริงทั้ง 4 เซต
 *
 * ไฟล์ในโฟลเดอร์นี้แยกออกจาก Math Adventure โดยสิ้นเชิง
 * ย้ายไปโปรเจกต์ของตัวเองได้ทันทีโดยไม่กระทบเกมเดิม
 */

export type CardSet = 'monster' | 'operator' | 'hero' | 'number'

/** สัญลักษณ์ที่ใช้สร้างสมการ */
export type OperatorSymbol = '+' | '-' | '*' | '/' | '(' | ')'

/** ระดับของการ์ดตัวเลข แบ่งตามงานศิลป์บนการ์ดจริง */
export type NumberTier = 'basic' | 'advanced' | 'legendary' | 'void'

export interface CardBase {
  id: string
  /** ชื่อบนการ์ด ตามที่พิมพ์จริง */
  name: string
  set: CardSet
  /** ข้อความบรรยายบนการ์ด เป็นเนื้อเรื่อง ไม่มีผลต่อกติกา */
  flavor?: string
}

export interface MonsterCard extends CardBase {
  set: 'monster'
  hp: number
  /** เกราะของมอนสเตอร์ ผลลัพธ์สมการต้องหารด้วยเลขนี้ */
  divisor: number
  isBoss: boolean
}

export interface OperatorCard extends CardBase {
  set: 'operator'
  symbol: OperatorSymbol
}

/** ความสามารถของฮีโร่ แยกตามจังหวะที่ทำงาน */
export type HeroAbilityTiming = 'passive' | 'beforeCalculation' | 'endOfTurn'

export interface HeroAbility {
  /** ชื่อภาษาอังกฤษบนการ์ด */
  name: string
  /** ชื่อไทยในวงเล็บบนการ์ด */
  nameTh: string
  timing: HeroAbilityTiming
  /** ข้อความความสามารถตามที่พิมพ์บนการ์ด */
  description: string
}

export interface HeroCard extends CardBase {
  set: 'hero'
  hp: number
  divisor: number
  ability: HeroAbility
}

export interface NumberCard extends CardBase {
  set: 'number'
  value: number
  tier: NumberTier
}

export type Card = MonsterCard | OperatorCard | HeroCard | NumberCard
