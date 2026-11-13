import { useMemo } from 'react'
import { useGame } from '../hooks/useMoneyGame'
import { SKILLS, SKILL_NAMES } from '../data/characters'
import { INNOVATION_NAME, termLine, thaiDate, type PdcaNotes } from '../engine/classroom'
import { hasRoster, rosterList } from '../engine/roster'
import { analyzeClass, f2, pText, tSummary, tText } from '../engine/stats'
import { BEHAVIOR_FULL, BEHAVIOR_LEVELS, behaviorSummary } from '../engine/behavior'
import { MISSION_GROUPS } from '../engine/activity'
import { DocHead, PaperPage } from './Paper'

/**
 * รายงานสรุปผลการใช้นวัตกรรมตามวงจร PDCA และขั้นตอน REAL Model (A4)
 * ตัวเลขทุกช่องคำนวณจากข้อมูลจริงในเครื่อง ส่วนบันทึกของครูแต่ละขั้นพิมพ์เพิ่มได้ (บันทึกอัตโนมัติ)
 * เส้นทาง #/teacher/print/summary
 */

const PDCA: { key: keyof PdcaNotes; title: string; hint: string }[] = [
  { key: 'plan', title: 'P – วางแผน (Plan)', hint: 'เช่น วิเคราะห์ปัญหา: นักเรียนทอนเงินและแก้โจทย์ปัญหาเรื่องเงินไม่คล่อง จึงออกแบบเกม…' },
  { key: 'do', title: 'D – ดำเนินการ (Do)', hint: 'เช่น สอน 8 ชั่วโมง สัปดาห์ละ 2 ชั่วโมง ใช้แท็บเล็ต 5 เครื่อง แบ่งกลุ่มละ 4 คน…' },
  { key: 'check', title: 'C – ตรวจสอบ (Check)', hint: 'เช่น สังเกตว่านักเรียนกล้าอธิบายวิธีคิดมากขึ้น กลุ่มที่ 3 ยังต้องช่วย…' },
  { key: 'act', title: 'A – ปรับปรุงและพัฒนา (Act)', hint: 'เช่น ภาคเรียนหน้าเพิ่มภารกิจโจทย์ปัญหาสองขั้น และให้เพื่อนช่วยเพื่อน…' },
]

function NoteBlock({ text }: { text: string }) {
  return text.trim() ? (
    <p className="mh-doc-notes-text">{text}</p>
  ) : (
    <>
      <p className="mh-doc-line" />
      <p className="mh-doc-line" />
    </>
  )
}

export function SummaryPrintPage() {
  const { save, updateClassroom } = useGame()
  const c = save.classroom
  const rosterMode = hasRoster(save.players)
  const players = useMemo(() => rosterList(save.players).filter((p) => !rosterMode || p.student), [save.players, rosterMode])
  const a = useMemo(() => analyzeClass(players, c), [players, c])
  const bh = useMemo(() => behaviorSummary(players), [players])
  const plays = players.reduce((s, p) => s + Object.values(p.acts ?? {}).reduce((x, st) => x + st.plays, 0), 0)
  const teamPlays = players.reduce((s, p) => s + (p.acts?.['team-mission']?.plays ?? 0) + (p.acts?.duel?.plays ?? 0), 0)
  const teams = new Set(players.map((p) => p.student?.team).filter(Boolean)).size
  const reflections = players.filter((p) => p.reflection).length
  const weakClassSkills = SKILLS.filter((s) => {
    const v = a.skills[s].post ?? a.skills[s].pre
    return v !== null && v < c.passPercent
  })
  const weakGroups = MISSION_GROUPS.filter((g) => a.groups[g.id].percent !== null && a.groups[g.id].percent! < c.passPercent)

  const setNote = (key: keyof PdcaNotes, value: string) => updateClassroom({ pdca: { ...c.pdca, [key]: value.slice(0, 1500) } })

  return (
    <PaperPage
      title="🖨️ รายงานสรุปผล (PDCA)"
      testId="mh-print-summary"
      tools={
        <div className="mh-pdca-edit">
          <p>บันทึกของครูแต่ละขั้น (บันทึกทันที พิมพ์ลงรายงาน · เว้นว่างได้ จะพิมพ์เป็นเส้นให้เขียนเอง)</p>
          {PDCA.map((s) => (
            <label key={s.key}>
              {s.title}
              <textarea className="mh-text-input" rows={3} value={c.pdca[s.key]} placeholder={s.hint} maxLength={1500} data-testid={`mh-pdca-${s.key}`} onChange={(e) => setNote(s.key, e.target.value)} />
            </label>
          ))}
        </div>
      }
    >
      <article className="mh-doc">
        <DocHead title="รายงานสรุปผลการใช้นวัตกรรมเพื่อพัฒนาผลลัพธ์การเรียนรู้" c={c} />

        <h3>1. ข้อมูลทั่วไป</h3>
        <table className="mh-doc-table">
          <tbody>
            <tr>
              <td style={{ width: '32%' }}>ชื่อนวัตกรรม</td>
              <td>{INNOVATION_NAME} ร่วมกับการจัดการเรียนรู้ตามรูปแบบ REAL Model</td>
            </tr>
            <tr>
              <td>กลุ่มเป้าหมาย</td>
              <td>
                นักเรียนชั้น {c.room} จำนวน {a.total} คน {termLine(c)}
              </td>
            </tr>
            <tr>
              <td>เป้าหมายเชิงปริมาณ</td>
              <td>
                นักเรียนร้อยละ {c.targetPercent} มีคะแนนแบบทดสอบหลังเรียนผ่านเกณฑ์ร้อยละ {c.passPercent}
              </td>
            </tr>
            <tr>
              <td>เป้าหมายเชิงคุณภาพ</td>
              <td>นักเรียนอ่าน คำนวณ จ่ายและทอนเงิน แก้โจทย์ปัญหาเรื่องเงิน และวางแผนใช้เงินได้ ทำงานร่วมกับเพื่อนและอธิบายวิธีคิดได้</td>
            </tr>
          </tbody>
        </table>

        <h3>{PDCA[0].title}</h3>
        <NoteBlock text={c.pdca.plan} />

        <h3>{PDCA[1].title} ตามขั้นตอน REAL Model</h3>
        <table className="mh-doc-table" data-testid="mh-summary-real">
          <thead>
            <tr>
              <th style={{ width: '24%' }}>ขั้น</th>
              <th>กิจกรรม</th>
              <th style={{ width: '30%' }}>หลักฐานจากระบบ</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>R – Recall &amp; Review</td>
              <td>ทบทวนความรู้เดิม ตั้งเป้าหมาย ทำแบบทดสอบก่อนเรียน</td>
              <td>
                ทำก่อนเรียน {a.preDone}/{a.total} คน
              </td>
            </tr>
            <tr>
              <td>E – Engage &amp; Experience</td>
              <td>ตะลุยภารกิจในเกม 6 กลุ่ม เล่นเป็นกลุ่ม ดวลสองคน และสื่อพิมพ์ (เกมกระดาน กาดรักษ์โลก)</td>
              <td>
                ทำภารกิจ {a.played} คน รวม {plays} ครั้ง · กิจกรรมกลุ่ม/คู่ {teamPlays} ครั้ง{teams > 0 ? ` · ${teams} กลุ่ม` : ''}
              </td>
            </tr>
            <tr>
              <td>A – Assess &amp; Analyze</td>
              <td>ทดสอบหลังเรียน วิเคราะห์ผลรายทักษะและรายกลุ่มภารกิจ สังเกตพฤติกรรม</td>
              <td>
                ทำหลังเรียน {a.postDone}/{a.total} คน · ประเมินพฤติกรรม {bh.assessed} คน
              </td>
            </tr>
            <tr>
              <td>L – Learn &amp; Level Up</td>
              <td>สะท้อนผลการเรียนรู้ ซ่อมเสริมตามทักษะที่ยังอ่อน ต่อยอดใช้ในชีวิตจริง</td>
              <td>
                สะท้อนผล {reflections} คน · ควรซ่อมเสริม {a.remedial.length} คน
              </td>
            </tr>
          </tbody>
        </table>
        <NoteBlock text={c.pdca.do} />

        <h3>{PDCA[2].title}</h3>
        <table className="mh-doc-table" data-testid="mh-summary-results">
          <thead>
            <tr>
              <th>ประเด็น</th>
              <th style={{ width: '42%' }}>ผล</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>คะแนนเฉลี่ยก่อนเรียน / หลังเรียน (ร้อยละ)</td>
              <td>
                {f2(a.pre.mean)} / {f2(a.post.mean)}
              </td>
            </tr>
            <tr>
              <td>t-test แบบไม่อิสระ (n = {a.t.n})</td>
              <td>
                t = {tText(a.t.t)}, p {a.t.p !== null && a.t.p < 0.001 ? '' : '= '}
                {pText(a.t.p)}
              </td>
            </tr>
            <tr>
              <td>ดัชนีประสิทธิผล (E.I.)</td>
              <td>{a.ei === null ? '–' : `${a.ei.toFixed(4)} (ก้าวหน้าร้อยละ ${(a.ei * 100).toFixed(2)})`}</td>
            </tr>
            <tr>
              <td>ประสิทธิภาพ E1/E2</td>
              <td>
                {f2(a.e1.mean)} / {f2(a.e2)}
              </td>
            </tr>
            <tr>
              <td>
                นักเรียนผ่านเกณฑ์ร้อยละ {c.passPercent} (เป้าหมายร้อยละ {c.targetPercent})
              </td>
              <td data-testid="mh-summary-pass">
                {a.passed}/{a.total} คน ร้อยละ {f2(a.passRate)} {a.targetMet === null ? '(รอผลหลังเรียน)' : a.targetMet ? '— บรรลุเป้าหมาย' : '— ยังไม่บรรลุเป้าหมาย'}
              </td>
            </tr>
            <tr>
              <td>พฤติกรรมการเรียนรู้เชิงรุก (เต็ม {BEHAVIOR_FULL})</td>
              <td>
                {bh.assessed === 0 ? 'ยังไม่ได้บันทึก' : `เฉลี่ย ${bh.mean!.toFixed(2)} · ระดับดีขึ้นไปร้อยละ ${bh.goodUp!.toFixed(2)} (${BEHAVIOR_LEVELS.map((l) => `${l} ${bh.levels[l]}`).join(', ')})`}
              </td>
            </tr>
          </tbody>
        </table>
        <p className="mh-doc-note">{tSummary(a.t)}</p>
        <NoteBlock text={c.pdca.check} />

        <h3>{PDCA[3].title}</h3>
        <ul className="mh-doc-list" data-testid="mh-summary-act">
          {weakClassSkills.length > 0 && <li>ทักษะที่ห้องยังต่ำกว่าเกณฑ์: {weakClassSkills.map((s) => SKILL_NAMES[s]).join(', ')}</li>}
          {weakGroups.length > 0 && <li>กลุ่มภารกิจที่ควรเพิ่มเวลา: {weakGroups.map((g) => g.name).join(', ')}</li>}
          {a.remedial.length > 0 && <li>ซ่อมเสริมรายบุคคล {a.remedial.length} คน (รายชื่อในรายงานวิเคราะห์ผล หัวข้อ 9)</li>}
          {a.missingPost.length > 0 && <li>ติดตามนักเรียนที่ยังไม่ได้ทำแบบทดสอบหลังเรียน {a.missingPost.length} คน</li>}
          {weakClassSkills.length + weakGroups.length + a.remedial.length + a.missingPost.length === 0 && <li>ผลทุกด้านผ่านเกณฑ์ ต่อยอดด้วยภารกิจท้าทายและขยายผลสู่ห้องอื่น</li>}
        </ul>
        <NoteBlock text={c.pdca.act} />

        <div className="mh-doc-signs">
          <div className="mh-doc-sign">
            <p>ลงชื่อ ......................................................</p>
            <p>( {c.teacher || '......................................................'} )</p>
            <p>ครูผู้สอน / ผู้รายงาน</p>
          </div>
          <div className="mh-doc-sign">
            <p>ลงชื่อ ......................................................</p>
            <p>( {c.director || '......................................................'} )</p>
            <p>ผู้อำนวยการสถานศึกษา</p>
          </div>
        </div>
        <p className="mh-doc-note">ข้อมูล ณ {thaiDate(Date.now())}</p>
      </article>
    </PaperPage>
  )
}
