import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useGame } from '../hooks/useMoneyGame'
import { SKILLS, SKILL_NAMES } from '../data/characters'
import { fullName, teacherName, thaiDate } from '../engine/classroom'
import { hasRoster, rosterList } from '../engine/roster'
import { MISSION_GROUPS, strongWeakGroups } from '../engine/activity'
import { BEHAVIOR_CRITERIA, BEHAVIOR_FULL, behaviorLevel, behaviorTotal } from '../engine/behavior'
import { feelingText, groupRows, passedResult, skillPercent, testSkillPercent } from '../engine/report'
import { pctOf, scoreLevel } from '../engine/stats'
import { weakSkills, type Player, type TestResult } from '../engine/progress'
import type { Classroom } from '../engine/classroom'
import { DocHead, PaperPage } from './Paper'

/**
 * รายงานผลการเรียนรู้รายบุคคล (A4 หนึ่งแผ่นต่อคน) แจกผู้ปกครองหรือแนบแฟ้มสะสมงาน
 * เส้นทาง #/teacher/print/students (ทั้งห้อง) หรือ ?id=รหัสผู้เล่น (คนเดียว)
 */

function pct(v: number | null): string {
  return v === null ? '–' : `${Math.round(v)}`
}

function TestRow({ label, t, pass }: { label: string; t?: TestResult; pass: number }) {
  if (!t) {
    return (
      <tr>
        <td>{label}</td>
        <td className="c" colSpan={4}>
          ยังไม่ได้ทำ
        </td>
      </tr>
    )
  }
  const p = pctOf(t)
  return (
    <tr>
      <td>{label}</td>
      <td className="c">
        {t.score}/{t.total}
      </td>
      <td className="c">{p.toFixed(2)}</td>
      <td className="c">{scoreLevel(p).name}</td>
      <td className="c">{passedResult(t, pass) ? 'ผ่าน' : 'ไม่ผ่าน'}</td>
    </tr>
  )
}

export function StudentReportSheet({ p, c }: { p: Player; c: Classroom }) {
  const pre = p.preTest ? pctOf(p.preTest) : null
  const post = p.postTest ? pctOf(p.postTest) : null
  const skillRows = SKILLS.map((s) => ({ s, pre: testSkillPercent(p.preTest, s), post: testSkillPercent(p.postTest, s), game: skillPercent(p, s) })).filter(
    (r) => r.pre !== null || r.post !== null || r.game !== null,
  )
  const groups = groupRows(p)
  const sw = strongWeakGroups(p, c.passPercent)
  const total = behaviorTotal(p.behavior)
  const strong = [...sw.strong.map((g) => MISSION_GROUPS.find((m) => m.id === g)?.name ?? g)]
  const weak = [...weakSkills(p).map((s) => SKILL_NAMES[s]), ...sw.weak.map((g) => MISSION_GROUPS.find((m) => m.id === g)?.name ?? g)]
  const s = p.student

  return (
    <article className="mh-doc mh-doc-student" data-testid="mh-print-student">
      <DocHead title="รายงานผลการเรียนรู้รายบุคคล" c={c} />
      <p className="mh-doc-info">
        <b>ชื่อ – สกุล</b> {s ? fullName(s) : teacherName(p)} &nbsp; <b>เลขที่</b> {s?.no ?? '....'} &nbsp; <b>เลขประจำตัว</b> {s?.code || '..........'} &nbsp; <b>ชั้น</b>{' '}
        {s?.room || c.room} {s?.team ? <>&nbsp; <b>กลุ่มที่</b> {s.team}</> : null}
      </p>

      <h3>1. ผลการทดสอบ (เกณฑ์ผ่านร้อยละ {c.passPercent})</h3>
      <table className="mh-doc-table">
        <thead>
          <tr>
            <th>การทดสอบ</th>
            <th>คะแนน</th>
            <th>ร้อยละ</th>
            <th>ระดับคุณภาพ</th>
            <th>ผล</th>
          </tr>
        </thead>
        <tbody>
          <TestRow label="ก่อนเรียน" t={p.preTest} pass={c.passPercent} />
          <TestRow label="หลังเรียน" t={p.postTest} pass={c.passPercent} />
          <tr>
            <td>พัฒนาการ</td>
            <td className="c" colSpan={4}>
              {pre !== null && post !== null ? `${post - pre >= 0 ? 'เพิ่มขึ้น' : 'ลดลง'} ${Math.abs(post - pre).toFixed(2)} จุดร้อยละ` : '–'}
            </td>
          </tr>
        </tbody>
      </table>

      <div className="mh-doc-cols">
        <div>
          <h3>2. ผลรายทักษะ (ร้อยละตอบถูก)</h3>
          <table className="mh-doc-table">
            <thead>
              <tr>
                <th>ทักษะ</th>
                <th>ก่อน</th>
                <th>หลัง</th>
                <th>ในเกม</th>
              </tr>
            </thead>
            <tbody>
              {skillRows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="c">
                    ยังไม่มีข้อมูล
                  </td>
                </tr>
              ) : (
                skillRows.map((r) => (
                  <tr key={r.s}>
                    <td>{SKILL_NAMES[r.s]}</td>
                    <td className="c">{pct(r.pre)}</td>
                    <td className="c">{pct(r.post)}</td>
                    <td className="c">{pct(r.game)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div>
          <h3>3. ภารกิจระหว่างเรียน (ขั้น E)</h3>
          <table className="mh-doc-table">
            <thead>
              <tr>
                <th>กลุ่มภารกิจ</th>
                <th>ครั้ง</th>
                <th>ร้อยละถูก</th>
              </tr>
            </thead>
            <tbody>
              {groups.map((g) => (
                <tr key={g.id}>
                  <td>{g.name}</td>
                  <td className="c">{g.plays || '–'}</td>
                  <td className="c">{g.percent === null ? '–' : g.percent}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <h3>4. พฤติกรรมการเรียนรู้เชิงรุก</h3>
      <table className="mh-doc-table">
        <thead>
          <tr>
            {BEHAVIOR_CRITERIA.map((b) => (
              <th key={b.name}>{b.name} (4)</th>
            ))}
            <th>รวม ({BEHAVIOR_FULL})</th>
            <th>ระดับ</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            {BEHAVIOR_CRITERIA.map((b, i) => (
              <td key={b.name} className="c">
                {p.behavior?.scores[i] || ''}
              </td>
            ))}
            <td className="c">{total ?? ''}</td>
            <td className="c">{total === null ? '' : behaviorLevel(total)}</td>
          </tr>
        </tbody>
      </table>
      {p.behavior?.note && <p className="mh-doc-note">บันทึกของครู: {p.behavior.note}</p>}

      <h3>5. สรุปและข้อเสนอแนะ</h3>
      <p className={strong.length > 0 ? undefined : 'mh-doc-line'}>
        <b>จุดเด่น:</b> {strong.join(', ')}
      </p>
      <p className={weak.length > 0 ? undefined : 'mh-doc-line'}>
        <b>ควรพัฒนา:</b> {weak.join(', ')}
      </p>
      <p>
        <b>นักเรียนสะท้อนผล:</b>{' '}
        {p.reflection ? [feelingText(p.reflection.feeling), p.reflection.good && `ทำได้ดี: ${p.reflection.good}`, p.reflection.improve && `อยากฝึกเพิ่ม: ${p.reflection.improve}`, p.reflection.apply && `ใช้ในชีวิตจริง: ${p.reflection.apply}`].filter(Boolean).join(' · ') : '–'}
      </p>
      <p className="mh-doc-line">ความเห็นของครู</p>
      <p className="mh-doc-line" />
      <div className="mh-doc-signs">
        <div className="mh-doc-sign">
          <p>ลงชื่อ ......................................................</p>
          <p>( {c.teacher || '......................................................'} )</p>
          <p>ครูผู้สอน</p>
        </div>
        <div className="mh-doc-sign">
          <p>ลงชื่อ ......................................................</p>
          <p>( ...................................................... )</p>
          <p>ผู้ปกครอง</p>
        </div>
      </div>
      <p className="mh-doc-note">พิมพ์เมื่อ {thaiDate(Date.now())}</p>
    </article>
  )
}

export function StudentReportPage() {
  const { save } = useGame()
  const [params] = useSearchParams()
  const id = params.get('id')
  const rosterMode = hasRoster(save.players)
  const all = useMemo(() => rosterList(save.players).filter((p) => !rosterMode || p.student), [save.players, rosterMode])
  const [onlyDone, setOnlyDone] = useState(false)
  const list = id ? all.filter((p) => p.id === id) : onlyDone ? all.filter((p) => p.postTest) : all

  return (
    <PaperPage
      title="🖨️ รายงานรายบุคคล"
      testId="mh-print-students"
      tools={
        id ? (
          <span>พิมพ์เฉพาะ 1 คน</span>
        ) : (
          <>
            <span>A4 หนึ่งแผ่นต่อคน · {list.length} แผ่น</span>
            <label>
              <input type="checkbox" checked={onlyDone} onChange={(e) => setOnlyDone(e.target.checked)} data-testid="mh-students-onlydone" /> เฉพาะคนที่ทำหลังเรียนแล้ว
            </label>
          </>
        )
      }
    >
      {list.length === 0 ? <div className="mh-card mh-center">ยังไม่มีข้อมูลนักเรียน</div> : list.map((p) => <StudentReportSheet key={p.id} p={p} c={save.classroom} />)}
    </PaperPage>
  )
}
