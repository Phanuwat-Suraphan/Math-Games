import type { Player } from '../engine/progress'
import { compareStudents, type Classroom } from '../engine/classroom'
import { hasRoster } from '../engine/roster'
import { buildXlsx, XLSX_TYPE } from '../engine/xlsx'
import { classWorkbook, workbookFileName } from '../engine/workbook'

/** ไฟล์ Excel แยกชีต (คิดเฉพาะนักเรียนในทะเบียนถ้ามีทะเบียน ตรงกับหน้าวิเคราะห์ผล) */
export function downloadXlsx(all: Record<string, Player>, c: Classroom) {
  const roster = hasRoster(all)
  const list = Object.values(all)
    .filter((p) => !roster || p.student)
    .sort(compareStudents)
  const bytes = buildXlsx(classWorkbook(list, c))
  // buildXlsx สร้าง Uint8Array ใหม่ทั้งก้อน buffer จึงยาวพอดีกับข้อมูล
  const blob = new Blob([bytes.buffer as ArrayBuffer], { type: XLSX_TYPE })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = workbookFileName(c)
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
