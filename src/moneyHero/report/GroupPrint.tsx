import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useGame } from '../hooks/useMoneyGame'
import { fullName, teacherName, thaiDate } from '../engine/classroom'
import { rosterList } from '../engine/roster'
import { teamList } from '../engine/teams'
import { BEHAVIOR_CRITERIA, BEHAVIOR_LEVELS, behaviorLevel, behaviorTotal } from '../engine/behavior'
import { DocHead, PaperPage, SignBlock } from './Paper'

/**
 * แบบสังเกตพฤติกรรมการเรียนรู้เชิงรุกขณะทำกิจกรรมกลุ่ม (A4)
 * รายชื่อแยกตามกลุ่ม + เกณฑ์ 4 ระดับ (ดีเยี่ยม ดี พอใช้ ควรปรับปรุง) ให้ครูกรอกขณะสังเกต
 * เส้นทาง #/teacher/print/groups
 */

export function GroupPrintPage() {
  const { save } = useGame()
  const c = save.classroom
  const [filled, setFilled] = useState(false)
  const roster = useMemo(() => rosterList(save.players).filter((p) => p.student), [save.players])
  const teams = teamList(roster)
  const noTeam = roster.filter((p) => !p.student?.team)
  const blocks = [...teams.map((t) => ({ title: `กลุ่มที่ ${t.team}`, members: t.members })), ...(noTeam.length > 0 ? [{ title: teams.length > 0 ? 'ยังไม่ได้จัดกลุ่ม' : 'นักเรียนทั้งหมด', members: noTeam }] : [])]

  return (
    <PaperPage
      title="🖨️ แบบสังเกตพฤติกรรมกลุ่ม"
      back="/teacher/students"
      testId="mh-print-groups"
      tools={
        <>
          <label>
            <input type="checkbox" checked={filled} onChange={(e) => setFilled(e.target.checked)} data-testid="mh-groups-filled" /> พิมพ์พร้อมคะแนนที่บันทึกไว้ในเกม
          </label>
          <Link to="/teacher/behavior" className="mh-chip">
            ✍️ บันทึกคะแนนพฤติกรรม
          </Link>
        </>
      }
    >
      <article className="mh-doc">
        <DocHead title="แบบสังเกตพฤติกรรมการเรียนรู้เชิงรุกขณะทำกิจกรรมกลุ่ม" c={c} />
        <p className="mh-doc-fill">กิจกรรม ........................................................................ วันที่ ...................................</p>
        <table className="mh-doc-table mh-doc-rubric">
          <thead>
            <tr>
              <th style={{ width: '19%' }}>ด้านที่สังเกต</th>
              {BEHAVIOR_LEVELS.map((l, i) => (
                <th key={l}>
                  {l} ({4 - i})
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {BEHAVIOR_CRITERIA.map((c) => (
              <tr key={c.name}>
                <td>
                  <b>{c.name}</b>
                </td>
                {c.levels.map((l) => (
                  <td key={l}>{l}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mh-doc-note">เกณฑ์ระดับคุณภาพ (คะแนนรวม 16): 14–16 ดีเยี่ยม · 11–13 ดี · 8–10 พอใช้ · ต่ำกว่า 8 ควรปรับปรุง</p>
        {blocks.map((b) => (
          <section key={b.title} className="mh-doc-group" data-testid="mh-print-group">
            <h3>
              {b.title} ({b.members.length} คน)
            </h3>
            <table className="mh-doc-table">
              <thead>
                <tr>
                  <th style={{ width: '7%' }}>เลขที่</th>
                  <th>ชื่อ – สกุล</th>
                  {BEHAVIOR_CRITERIA.map((c) => (
                    <th key={c.name} style={{ width: '11%' }}>
                      {c.name}
                      <br />
                      (4)
                    </th>
                  ))}
                  <th style={{ width: '8%' }}>รวม (16)</th>
                  <th style={{ width: '11%' }}>ระดับ</th>
                </tr>
              </thead>
              <tbody>
                {b.members.map((p) => (
                  <tr key={p.id}>
                    <td className="c">{p.student?.no ?? ''}</td>
                    <td>{p.student ? fullName(p.student) : teacherName(p)}</td>
                    {BEHAVIOR_CRITERIA.map((c, i) => (
                      <td key={c.name} className="c">
                        {filled && p.behavior?.scores[i] ? p.behavior.scores[i] : ''}
                      </td>
                    ))}
                    <td className="c">{filled ? (behaviorTotal(p.behavior) ?? '') : ''}</td>
                    <td className="c">{filled && behaviorTotal(p.behavior) !== null ? behaviorLevel(behaviorTotal(p.behavior)!) : ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ))}
        <p className="mh-doc-note">พิมพ์เมื่อ {thaiDate(Date.now())} · ผลการทำภารกิจกลุ่มในเกมบันทึกแยกรายคนในแผงคุณครู</p>
        <SignBlock name={c.teacher} role="ผู้สังเกต / ครูผู้สอน" />
      </article>
    </PaperPage>
  )
}
