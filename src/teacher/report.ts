/**
 * แปลงผลของทั้งห้องเป็นตารางที่เอาไปวางในโปรแกรมตารางคำนวณได้
 *
 * ทำไมต้องเป็น CSV ไม่ใช่แค่ตารางสวย ๆ บนจอ
 *
 * ตารางบนจอตอบคำถาม "คาบนี้ต้องสอนซ้ำเรื่องไหน" ได้ ซึ่งเป็นงานเร่งด่วน
 * แต่งานที่ครูต้องทำจริงอีกอย่างคือกรอกคะแนนลงแบบฟอร์มของโรงเรียน
 * ซึ่งเป็นไฟล์ตารางคำนวณเสมอ และไม่มีทางที่เว็บนี้จะรู้รูปแบบของโรงเรียนไหนได้
 *
 * การให้ข้อความ CSV ที่คัดลอกไปวางได้ จึงเป็นการยอมรับตรง ๆ ว่า
 * ปลายทางของข้อมูลนี้ไม่ได้อยู่ในเกม และไม่ควรพยายามให้อยู่ในเกม
 *
 * ใช้ตัวคั่นเป็นจุลภาค และครอบด้วยอัญประกาศเมื่อจำเป็น
 * ชื่อไทยไม่มีจุลภาคอยู่แล้ว แต่ครอบไว้ให้ปลอดภัยเพราะชื่อมาจากเด็กพิมพ์เอง
 */

import { INDICATORS } from './indicators'
import { accuracy, totalsOf } from './log'
import type { StudentLog } from './log'

function cell(text: string): string {
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

function percentText(value: number | null): string {
  return value === null ? '' : String(Math.round(value * 100))
}

/**
 * หัวตารางและหนึ่งบรรทัดต่อเด็กหนึ่งคน
 *
 * แต่ละตัวชี้วัดกินสองคอลัมน์ คือจำนวนข้อที่ทำ และจำนวนข้อที่ถูก
 * ไม่ได้ให้เป็นร้อยละอย่างเดียว เพราะครูต้องเห็นว่าเด็กทำไปกี่ข้อด้วย
 * ร้อยละร้อยจากหนึ่งข้อ กับร้อยละแปดสิบจากยี่สิบข้อ ไม่ใช่เรื่องเดียวกัน
 */
export function toCsv(logs: readonly StudentLog[]): string {
  const header = [
    'ชื่อ',
    'วันที่',
    ...INDICATORS.flatMap((item) => {
      const label = item.code || item.short
      return [`${label} ทำ`, `${label} ถูก`]
    }),
    'รวมทำ',
    'รวมถูก',
    'ร้อยละ',
  ]

  const rows = logs.map((log) => {
    const total = totalsOf(log)
    return [
      cell(log.name),
      String(log.day),
      ...INDICATORS.flatMap((item) => {
        const tally = log.counts[item.id] ?? { attempts: 0, correct: 0 }
        return [String(tally.attempts), String(tally.correct)]
      }),
      String(total.attempts),
      String(total.correct),
      percentText(accuracy(total)),
    ]
  })

  return [header.map(cell).join(','), ...rows.map((row) => row.join(','))].join('\n')
}
