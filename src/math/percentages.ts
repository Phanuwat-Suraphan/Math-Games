/**
 * ร้อยละ — คำนวณผ่านชั้นทศนิยมเพื่อไม่ให้เจอปัญหา floating point
 *
 * ตัวอย่างที่พังถ้าคำนวณตรง ๆ: 35% ของ 70 = 0.35 * 70 = 24.499999999999996
 */

import { multiplyDecimals, divideDecimals, roundTo } from './decimals'

/** หาค่า: percent% ของ base เป็นเท่าไร */
export function percentOf(percent: number, base: number): number {
  return roundTo(multiplyDecimals(base, percent) / 100, 4)
}

/** หาว่า part เป็นกี่เปอร์เซ็นต์ของ whole */
export function whatPercent(part: number, whole: number): number {
  if (whole === 0) {
    throw new Error('หาร้อยละจากฐานศูนย์ไม่ได้')
  }
  return roundTo(divideDecimals(part, whole, 6) * 100, 4)
}

/** เพิ่มขึ้น percent% จากค่าเดิม เช่น ราคา 100 เพิ่ม 20% = 120 */
export function increaseByPercent(base: number, percent: number): number {
  return roundTo(base + percentOf(percent, base), 4)
}

/** ลดลง percent% จากค่าเดิม เช่น ราคา 500 ลด 10% = 450 */
export function decreaseByPercent(base: number, percent: number): number {
  return roundTo(base - percentOf(percent, base), 4)
}

/** หาค่าเดิมเมื่อรู้ผลลัพธ์หลังเพิ่ม/ลดแล้ว */
export function baseFromPercent(amount: number, percent: number): number {
  if (percent === 0) {
    throw new Error('หาฐานจากร้อยละศูนย์ไม่ได้')
  }
  return roundTo(divideDecimals(amount * 100, percent, 6), 4)
}

/** ส่วนลดคิดเป็นจำนวนเงิน */
export function discountAmount(price: number, percent: number): number {
  return percentOf(percent, price)
}
