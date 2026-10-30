import { useMemo, useState } from 'react'
import { useGame } from '../hooks/useMoneyGame'
import { fullName, teacherName, thaiDate } from '../engine/classroom'
import { rosterList } from '../engine/roster'
import { lessonsPassed } from '../engine/progress'
import { classProgress, fixed2, passLabel } from '../engine/report'
import { TOTAL_LESSONS } from '../data/levels'
import { DocHead, PaperPage, SignBlock } from './Paper'

/**
 * แบบบันทึกรายชื่อและการเข้าร่วมกิจกรรม (A4 แนวตั้ง)
 * แสดงคะแนนที่มีในเครื่อง หรือพิมพ์แบบว่างไว้ให้ครูเขียนเอง
 * เส้นทาง #/teacher/print/roster
 */
export function RosterPrintPage() {
  const { save } = useGame()
  const c = save.classroom
  const [blank, setBlank] = useState(false)
  const [extra, setExtra] = useState(0)
  const all = useMemo(() => rosterList(save.players), [save.players])
  const roster = all.some((p) => p.student) ? all.filter((p) => p.student) : all
  const prog = classProgress(roster, c)
  const score = (t?: { score: number; total: number }) => (blank || !t ? '' : `${t.score}/${t.total}`)

  return (
    <PaperPage
      title="🖨️ แบบบันทึกรายชื่อ"
      back="/teacher/students"
      testId="mh-print-roster"
      tools={
        <>
          <label>
            <input type="checkbox" checked={blank} onChange={(e) => setBlank(e.target.checked)} data-testid="mh-print-blank" /> พิมพ์แบบว่าง (ไว้เขียนคะแนนเอง)
          </label>
          <label>
            เพิ่มแถวว่างท้ายตาราง
            <select value={extra} onChange={(e) => setExtra(Number(e.target.value))}>
              {[0, 3, 5, 10].map((n) => (
                <option key={n} value={n}>
                  {n} แถว
                </option>
              ))}
            </select>
          </label>
        </>
      }
    >
      <article className="mh-doc">
        <DocHead title="แบบบันทึกรายชื่อนักเรียนและการเข้าร่วมกิจกรรม" c={c} />
        <table className="mh-doc-table" data-testid="mh-print-roster-table">
          <thead>
            <tr>
              <th style={{ width: '6%' }}>เลขที่</th>
              <th style={{ width: '12%' }}>เลขประจำตัว</th>
              <th>ชื่อ – สกุล</th>
              <th style={{ width: '10%' }}>
                ก่อนเรียน
                <br />
                (คะแนน)
              </th>
              <th style={{ width: '10%' }}>
                ภารกิจในเกม
                <br />
                (ด่าน/{TOTAL_LESSONS})
              </th>
              <th style={{ width: '10%' }}>
                หลังเรียน
                <br />
                (คะแนน)
              </th>
              <th style={{ width: '12%' }}>
                ผลการประเมิน
                <br />
                (เกณฑ์ {c.passPercent}%)
              </th>
              <th style={{ width: '9%' }}>หมายเหตุ</th>
            </tr>
          </thead>
          <tbody>
            {roster.map((p, i) => (
              <tr key={p.id}>
                <td className="c">{p.student?.no ?? i + 1}</td>
                <td className="c">{p.student?.code ?? ''}</td>
                <td>{p.student ? fullName(p.student) : teacherName(p)}</td>
                <td className="c">{score(p.preTest)}</td>
                <td className="c">{blank ? '' : lessonsPassed(p) > 0 ? lessonsPassed(p) : p.answered > 0 ? '0' : ''}</td>
                <td className="c">{score(p.postTest)}</td>
                <td className="c">{blank ? '' : passLabel(p, c.passPercent)}</td>
                <td />
              </tr>
            ))}
            {Array.from({ length: extra }, (_, i) => (
              <tr key={`extra-${i}`} className="mh-doc-blank-row">
                <td>&nbsp;</td>
                <td />
                <td />
                <td />
                <td />
                <td />
                <td />
                <td />
              </tr>
            ))}
          </tbody>
        </table>
        <section className="mh-doc-summary" data-testid="mh-print-roster-summary">
          <p>
            <b>สรุป</b> นักเรียนทั้งหมด {prog.total} คน
            {blank ? (
              <> · ทำแบบทดสอบก่อนเรียน ........ คน · ร่วมภารกิจในเกม ........ คน · ทำแบบทดสอบหลังเรียน ........ คน</>
            ) : (
              <>
                {' '}
                · ทำแบบทดสอบก่อนเรียน {prog.preDone} คน · ร่วมภารกิจในเกม {prog.played} คน · ทำแบบทดสอบหลังเรียน {prog.postDone} คน
              </>
            )}
          </p>
          <p>
            ผ่านเกณฑ์ร้อยละ {c.passPercent} จำนวน {blank ? '........' : prog.passed} คน คิดเป็นร้อยละ {blank ? '........' : fixed2(prog.passRate)} ของนักเรียนทั้งหมด
            (เป้าหมายร้อยละ {c.targetPercent}
            {blank || prog.targetMet === null ? ')' : prog.targetMet ? ' — บรรลุเป้าหมาย)' : ' — ยังไม่บรรลุเป้าหมาย)'}
          </p>
          <p className="mh-doc-note">ข้อมูล ณ วันที่ {thaiDate(Date.now())} · คะแนนแสดงเป็น คะแนนที่ได้/คะแนนเต็ม</p>
        </section>
        <SignBlock name={c.teacher} role="ครูผู้สอน" />
      </article>
    </PaperPage>
  )
}
