import type { Player } from './progress'
import { MISSION_GROUPS, type MissionGroup } from './activity'
import { passedResult } from './report'

/**
 * หนังสือเดินทางนักผจญภัยเมืองเงิน (บัตรสะสมตรา REAL พิมพ์ A4 คนละแผ่น)
 *
 * ตราในเกม (ขั้น E): ได้เมื่อทำกลุ่มภารกิจนั้นอย่างน้อย MIN_ITEMS ข้อ และตอบถูกถึงเกณฑ์ของห้อง
 * ตราในห้องเรียน: กิจกรรมนอกจอ (เกมกระดาน กาดรักษ์โลก ใบงาน) ครูประทับตราจริงบนกระดาษ
 */

/** ต้องทำอย่างน้อยกี่ข้อในกลุ่มภารกิจ จึงนับว่าได้ตรา (กันได้ตราจากการเดาถูกข้อเดียว) */
export const MIN_ITEMS = 5

export interface Stamp {
  group: MissionGroup
  earned: boolean
  /** ร้อยละถูก (null = ยังไม่ได้ทำ) */
  percent: number | null
  /** เล่นล่าสุดเมื่อใด (ใช้พิมพ์วันที่บนตรา) */
  at: number | null
  /** ทำไปแล้วกี่ข้อ */
  total: number
}

export function passportStamps(p: Player, passPercent: number): Stamp[] {
  return MISSION_GROUPS.map((g) => {
    let correct = 0
    let total = 0
    let at: number | null = null
    for (const st of Object.values(p.acts ?? {})) {
      if (st.group !== g.id) continue
      correct += st.correct
      total += st.total
      at = Math.max(at ?? 0, st.lastAt)
    }
    const percent = total === 0 ? null : (correct / total) * 100
    // เทียบแบบจำนวนเต็ม เหมือนเกณฑ์ผ่านแบบทดสอบ (เลี่ยงทศนิยมคลาดเคลื่อน)
    const earned = total >= MIN_ITEMS && correct * 100 >= passPercent * total
    return { group: g.id, earned, percent, at, total }
  })
}

/** ตราในห้องเรียน (ครูประทับเอง) */
export const CLASS_STAMPS: { id: string; icon: string; name: string }[] = [
  { id: 'board', icon: '🎲', name: 'เกมกระดานตะลุยเมืองเงิน' },
  { id: 'kad', icon: '🌱', name: 'กาดรักษ์โลก' },
  { id: 'plan', icon: '🎉', name: 'ใบงานวางแผนใช้เงิน' },
  { id: 'worksheet', icon: '✏️', name: 'ใบงานฝึกทักษะ' },
]

export interface PassportSummary {
  stamps: Stamp[]
  earned: number
  preDone: boolean
  postDone: boolean
  postPassed: boolean | null
  reflected: boolean
  /** ขั้นที่ทำครบแล้ว R E A L */
  steps: { r: boolean; e: boolean; a: boolean; l: boolean }
}

export function passportSummary(p: Player, passPercent: number): PassportSummary {
  const stamps = passportStamps(p, passPercent)
  const earned = stamps.filter((s) => s.earned).length
  return {
    stamps,
    earned,
    preDone: !!p.preTest,
    postDone: !!p.postTest,
    postPassed: p.postTest ? passedResult(p.postTest, passPercent) : null,
    reflected: !!p.reflection,
    steps: {
      r: !!p.preTest,
      // ขั้น E ครบเมื่อได้ตราอย่างน้อยครึ่งหนึ่งของกลุ่มภารกิจ
      e: earned * 2 >= stamps.length,
      a: !!p.postTest,
      l: !!p.reflection,
    },
  }
}
