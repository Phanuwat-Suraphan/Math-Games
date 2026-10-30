import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Printer } from 'lucide-react'
import { INNOVATION_NAME, termLine, type Classroom } from '../engine/classroom'
import './paper.css'

/**
 * ส่วนประกอบของเอกสาร A4 แบบราชการ (ใช้ร่วมกันทุกรายงาน)
 * บนจอแสดงเป็นแผ่นกระดาษ กดพิมพ์แล้วได้กระดาษ A4 ขอบตามแบบหนังสือราชการ
 */

export function PaperPage({ title, back = '/teacher', tools, children, testId }: { title: string; back?: string; tools?: ReactNode; children: ReactNode; testId?: string }) {
  return (
    <div className="mh-paper-page" data-testid={testId}>
      <div className="mh-paper-bar mh-noprint">
        <Link to={back} className="mh-icon-btn" aria-label="กลับ">
          <ArrowLeft size={24} />
        </Link>
        <h1 className="mh-title">{title}</h1>
        <button type="button" className="mh-btn mh-btn-gold" onClick={() => window.print()} data-testid="mh-paper-print">
          <Printer size={20} /> พิมพ์ (A4)
        </button>
      </div>
      {tools && <div className="mh-paper-tools mh-noprint">{tools}</div>}
      {children}
    </div>
  )
}

/** หัวเอกสาร: ชื่อเอกสาร นวัตกรรม วิชา ห้อง ภาคเรียน โรงเรียน (ช่องที่ครูยังไม่กรอกเว้นเส้นไว้เขียน) */
export function DocHead({ title, c, subtitle }: { title: string; c: Classroom; subtitle?: string }) {
  const blank = '......................................'
  return (
    <header className="mh-doc-head">
      <h2>{title}</h2>
      <p>
        นวัตกรรม “{INNOVATION_NAME}” {subtitle ?? 'การจัดการเรียนรู้ตามรูปแบบ REAL Model'}
      </p>
      <p>
        กลุ่มสาระการเรียนรู้คณิตศาสตร์ เรื่อง เงิน ชั้น {c.room || 'ประถมศึกษาปีที่ 3'} {termLine(c) || `ภาคเรียนที่ ...... ปีการศึกษา ..........`}
      </p>
      <p>
        {c.school ? (c.school.startsWith('โรงเรียน') ? c.school : `โรงเรียน${c.school}`) : `โรงเรียน${blank}`} {c.area ? `สังกัด ${c.area}` : ''}
      </p>
    </header>
  )
}

/** ช่องลงนาม */
export function SignBlock({ name, role }: { name: string; role: string }) {
  return (
    <div className="mh-doc-sign">
      <p>ลงชื่อ ......................................................</p>
      <p>( {name || '......................................................'} )</p>
      <p>{role}</p>
    </div>
  )
}

