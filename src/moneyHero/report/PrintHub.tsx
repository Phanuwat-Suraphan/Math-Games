import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Sky } from '../components/Sky'

/**
 * ศูนย์เอกสารพิมพ์ (A4): รวมทุกเอกสารและสื่อพิมพ์ของนวัตกรรมไว้ที่เดียว
 * เรียงตามลำดับการใช้งานจริง ก่อนสอน → ระหว่างสอน → หลังสอน → รายงาน ว.PA
 * เส้นทาง #/teacher/print
 */

interface Doc {
  to: string
  icon: string
  name: string
  desc: string
  pages: string
  id: string
}

const SECTIONS: { title: string; docs: Doc[] }[] = [
  {
    title: 'ก่อนสอน (ขั้น R)',
    docs: [
      { id: 'roster', to: '/teacher/print/roster', icon: '📋', name: 'แบบบันทึกรายชื่อและการเข้าร่วม', desc: 'รายชื่อนักเรียน พร้อมช่องคะแนนก่อน/หลังเรียน', pages: '1–2 แผ่น' },
      { id: 'passport', to: '/teacher/print/passport', icon: '🧭', name: 'หนังสือเดินทางนักผจญภัยเมืองเงิน', desc: 'บัตรสะสมตราตามขั้น REAL ให้นักเรียนเก็บตลอดหน่วย ตราภารกิจในเกมพิมพ์ให้อัตโนมัติ', pages: '1 แผ่นต่อคน' },
      { id: 'test-pre', to: '/teacher/print/test/pre', icon: '📝', name: 'แบบทดสอบก่อนเรียน', desc: 'ข้อสอบ กระดาษคำตอบ เฉลย และตารางวิเคราะห์จุดประสงค์', pages: 'หลายแผ่น' },
    ],
  },
  {
    title: 'ระหว่างสอน (ขั้น E) สื่อเล่นจริง',
    docs: [
      { id: 'board', to: '/board', icon: '🎲', name: 'เกมกระดานตะลุยเมืองเงิน', desc: 'กระดาน การ์ดภารกิจ การ์ดโชค ธนบัตรจำลอง ใบจดเงิน', pages: '9 ชุด' },
      { id: 'bingo', to: '/teacher/print/bingo', icon: '🎱', name: 'บิงโกเงินทอง', desc: 'เกมเล่นทั้งห้อง ครูอ่านโจทย์ นักเรียนหาคำตอบบนการ์ด การ์ดไม่ซ้ำกัน มีใบเรียกโจทย์และตารางตรวจผู้ชนะ', pages: 'หน้าละ 2 ใบ' },
      { id: 'colour', to: '/teacher/print/colour', icon: '🖍️', name: 'ระบายสีภาพปริศนา', desc: 'คิดเงินในแต่ละช่อง แล้วระบายสีตามคำตอบ จะเห็นภาพน่ารัก 8 ภาพ มีเฉลยภาพสี เล่นคู่กับเมนูภาพปริศนาในเกม', pages: 'แผ่นละภาพ' },
      { id: 'kad', to: '/kad', icon: '🌱', name: 'กาดรักษ์โลก', desc: 'ป้ายร้าน ใบสั่งของ เงินจำลอง ใบบันทึกกำไร', pages: '8 ชุด' },
      { id: 'plan', to: '/plan/print', icon: '🎉', name: 'ใบงานวางแผนใช้เงิน', desc: 'วางแผนจัดงานให้พองบ มีเฉลย', pages: '4 แผ่น' },
      { id: 'groups', to: '/teacher/print/groups', icon: '👥', name: 'แบบสังเกตพฤติกรรมกลุ่ม', desc: 'เกณฑ์ 4 ด้าน 4 ระดับ แยกตามกลุ่ม พิมพ์ว่างหรือพร้อมคะแนนได้', pages: '1–2 แผ่น' },
    ],
  },
  {
    title: 'หลังสอน (ขั้น A และ L)',
    docs: [
      { id: 'test-post', to: '/teacher/print/test/post', icon: '🎓', name: 'แบบทดสอบหลังเรียน', desc: 'ฉบับคู่ขนานกับก่อนเรียน', pages: 'หลายแผ่น' },
      { id: 'students', to: '/teacher/print/students', icon: '👧', name: 'รายงานผลการเรียนรู้รายบุคคล', desc: 'ผลสอบ รายทักษะ ภารกิจ พฤติกรรม ข้อเสนอแนะ ช่องลงนามผู้ปกครอง', pages: '1 แผ่นต่อคน' },
      { id: 'worksheets', to: '/teacher/print/worksheets', icon: '✏️', name: 'ใบงานซ่อมเสริมรายทักษะ', desc: 'สร้างโจทย์ใหม่ได้ไม่จำกัด เลือกทักษะเอง หรือให้ระบบเลือกทักษะที่แต่ละคนยังอ่อน พร้อมเฉลย', pages: '1–2 แผ่นต่อชุด' },
      { id: 'certs', to: '/teacher/print/certificates', icon: '🏅', name: 'เกียรติบัตร', desc: 'ผ่านเกณฑ์ · พัฒนาการดีเด่น · เข้าร่วมกิจกรรม แก้ข้อความได้', pages: 'A4 แนวนอน 1 แผ่นต่อคน' },
    ],
  },
  {
    title: 'รายงาน ว.PA',
    docs: [
      { id: 'analysis', to: '/teacher/analysis', icon: '📊', name: 'รายงานผลการวิเคราะห์ข้อมูล', desc: 'x̄ S.D. t-test E.I. E1/E2 ระดับคุณภาพ แผนภูมิ รายชื่อซ่อมเสริม', pages: 'ประมาณ 4–6 แผ่น' },
      { id: 'summary', to: '/teacher/print/summary', icon: '🔁', name: 'รายงานสรุปผลการใช้นวัตกรรม (PDCA)', desc: 'P D C A ตามขั้น REAL Model พร้อมบันทึกของครู ลงนามผู้บริหาร', pages: '2–3 แผ่น' },
    ],
  },
]

export function PrintHubPage() {
  return (
    <div className="mh-page mh-teacher mh-print-hub" data-testid="mh-print-hub">
      <Sky city={false} />
      <div className="mh-page-head">
        <Link to="/teacher" className="mh-icon-btn" aria-label="กลับแผงคุณครู">
          <ArrowLeft size={24} />
        </Link>
        <h1 className="mh-title">🖨️ เอกสารพิมพ์ทั้งหมด (A4)</h1>
      </div>
      <p className="mh-card mh-print-tip">
        ทุกเอกสารพิมพ์บนกระดาษ A4 แนวตั้ง (เกมกระดานพิมพ์ต่อกัน 2 แผ่นได้) · กดเปิดแล้วกดปุ่ม “พิมพ์ (A4)” ด้านบน · ตั้งเครื่องพิมพ์เป็น “ขนาดจริง / 100%” และเปิด “พิมพ์กราฟิกพื้นหลัง” ให้สีแผนภูมิออกครบ · ต้องการตัวเลขไปทำต่อเอง กดปุ่ม “Excel แยกชีต (.xlsx)” ในแผงคุณครู (ตั้งหน้ากระดาษ A4 ไว้ให้แล้ว พิมพ์จาก Excel ได้ทันที)
      </p>
      {SECTIONS.map((s) => (
        <section key={s.title}>
          <h2 className="mh-section-title">{s.title}</h2>
          <div className="mh-print-grid">
            {s.docs.map((d) => (
              <Link key={d.id} to={d.to} className="mh-card mh-print-card" data-testid={`mh-hub-${d.id}`}>
                <span className="mh-print-icon" aria-hidden="true">
                  {d.icon}
                </span>
                <b>{d.name}</b>
                <span>{d.desc}</span>
                <small>{d.pages}</small>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
