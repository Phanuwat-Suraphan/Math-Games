import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useGame } from '../hooks/useMoneyGame'
import { SKILLS, SKILL_NAMES } from '../data/characters'
import { fullName, teacherName, thaiDate } from '../engine/classroom'
import { hasRoster, rosterList } from '../engine/roster'
import { MISSION_GROUPS } from '../engine/activity'
import { analyzeClass, f2, pctOf, processPercent, pText, REMEDIAL_REASON, SCORE_LEVELS, scoreLevel, tSummary, tText, type TestDescribe } from '../engine/stats'
import type { Player } from '../engine/progress'
import { passedResult } from '../engine/report'
import { DocHead, PaperPage, SignBlock } from './Paper'
import { downloadXlsx } from './exportExcel'
import { DumbbellSvg, PairBarsSvg, SingleBarsSvg } from './AnalysisCharts'

/**
 * วิเคราะห์ผลการเรียนรู้ทั้งห้อง (แผงสถิติของครู + พิมพ์ A4 แนบรายงาน ว.PA)
 * ค่าเฉลี่ย S.D. ร้อยละ t-test แบบไม่อิสระ ดัชนีประสิทธิผล E1/E2 รายทักษะ รายกลุ่มภารกิจ และรายชื่อซ่อมเสริม
 * เส้นทาง #/teacher/analysis
 */

function who(p: Player): string {
  return p.student ? fullName(p.student) : teacherName(p)
}

function shortWho(p: Player): string {
  const name = p.student ? `${p.student.first}${p.student.last ? ` ${p.student.last.slice(0, 1)}.` : ''}` : p.name
  return `${p.student?.no ? `${p.student.no}. ` : ''}${name}`.slice(0, 26)
}

function rawCell(d: TestDescribe, key: 'rawMean' | 'rawSd'): string {
  return d.full === null ? '–' : f2(d[key])
}

function eiText(ei: number | null): string {
  if (ei === null) return '–'
  return `${ei.toFixed(4)} (ร้อยละ ${(ei * 100).toFixed(2)})`
}

export function AnalysisPage() {
  const { save } = useGame()
  const c = save.classroom
  const rosterMode = hasRoster(save.players)
  const players = useMemo(() => rosterList(save.players).filter((p) => !rosterMode || p.student), [save.players, rosterMode])
  const a = useMemo(() => analyzeClass(players, c), [players, c])
  const both = players.filter((p) => p.preTest && p.postTest)

  if (players.length === 0) {
    return (
      <PaperPage title="📊 วิเคราะห์ผลการเรียนรู้" testId="mh-analysis">
        <div className="mh-card mh-center">
          <p>ยังไม่มีข้อมูลนักเรียนในเครื่องนี้</p>
          <Link to="/teacher/students" className="mh-btn mh-btn-gold">
            👧 นำเข้ารายชื่อนักเรียน
          </Link>
        </div>
      </PaperPage>
    )
  }

  const tiles: { label: string; value: string; testId: string }[] = [
    { label: 'นักเรียนทั้งหมด', value: `${a.total} คน`, testId: 'mh-an-total' },
    { label: 'ทำแบบทดสอบก่อนเรียน', value: `${a.preDone} คน`, testId: 'mh-an-pre-done' },
    { label: 'ทำภารกิจในเกม', value: `${a.played} คน`, testId: 'mh-an-played' },
    { label: 'ทำแบบทดสอบหลังเรียน', value: `${a.postDone} คน`, testId: 'mh-an-post-done' },
    { label: 'ก่อนเรียนเฉลี่ย', value: a.pre.mean === null ? '–' : `${f2(a.pre.mean)}%`, testId: 'mh-an-pre-mean' },
    { label: 'หลังเรียนเฉลี่ย', value: a.post.mean === null ? '–' : `${f2(a.post.mean)}%`, testId: 'mh-an-post-mean' },
    { label: 'พัฒนาการเฉลี่ย', value: a.gain === null ? '–' : `${a.gain >= 0 ? '+' : ''}${f2(a.gain)}%`, testId: 'mh-an-gain' },
    { label: `ผ่านเกณฑ์ ${c.passPercent}%`, value: a.postDone === 0 ? '–' : `${a.passed} คน (${f2(a.passRate)}%)`, testId: 'mh-an-passed' },
    { label: `เป้าหมาย ${c.targetPercent}% ของห้อง`, value: a.targetMet === null ? 'รอผลหลังเรียน' : a.targetMet ? '✅ บรรลุ' : '❌ ยังไม่บรรลุ', testId: 'mh-an-target' },
    { label: 'ดัชนีประสิทธิผล (E.I.)', value: a.ei === null ? '–' : a.ei.toFixed(2), testId: 'mh-an-ei' },
    { label: 'E1 / E2', value: `${f2(a.e1.mean)} / ${f2(a.e2)}`, testId: 'mh-an-e1e2' },
    { label: 'ควรซ่อมเสริม', value: `${a.remedial.length} คน`, testId: 'mh-an-remedial-count' },
  ]

  return (
    <PaperPage
      title="📊 วิเคราะห์ผลการเรียนรู้"
      testId="mh-analysis"
      tools={
        <span>
          คิดจาก{rosterMode ? 'นักเรียนในทะเบียน' : 'ผู้เล่นทุกคนในเครื่องนี้'} · เกณฑ์ผ่าน {c.passPercent}% · เป้าหมาย {c.targetPercent}% ของห้อง{' '}
          <Link to="/teacher/settings" className="mh-chip">
            ⚙️ เปลี่ยนเกณฑ์
          </Link>{' '}
          <button type="button" className="mh-chip" onClick={() => downloadXlsx(save.players, c)} data-testid="mh-an-xlsx">
            📗 ดาวน์โหลด Excel
          </button>
        </span>
      }
    >
      <div className="mh-an-tiles mh-noprint" data-testid="mh-an-tiles">
        {tiles.map((t) => (
          <div key={t.testId} className="mh-an-tile" data-testid={t.testId}>
            <b>{t.value}</b>
            <span>{t.label}</span>
          </div>
        ))}
      </div>

      <article className="mh-doc">
        <DocHead title="รายงานผลการวิเคราะห์ข้อมูลการใช้นวัตกรรม" c={c} />

        <h3>1. การเข้าร่วมกิจกรรม</h3>
        <table className="mh-doc-table" data-testid="mh-an-participation">
          <thead>
            <tr>
              <th>รายการ</th>
              <th style={{ width: '18%' }}>จำนวน (คน)</th>
              <th style={{ width: '18%' }}>ร้อยละ</th>
            </tr>
          </thead>
          <tbody>
            {[
              ['นักเรียนทั้งหมด', a.total],
              ['ทำแบบทดสอบก่อนเรียน', a.preDone],
              ['ทำภารกิจในเกม (ขั้น E)', a.played],
              ['ทำแบบทดสอบหลังเรียน', a.postDone],
              ['ทำครบทั้งก่อนและหลังเรียน', a.bothDone],
            ].map(([label, n]) => (
              <tr key={label}>
                <td>{label}</td>
                <td className="c">{n}</td>
                <td className="c">{f2(((n as number) / Math.max(1, a.total)) * 100)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <h3>2. ผลสัมฤทธิ์ก่อนเรียนและหลังเรียน</h3>
        <table className="mh-doc-table" data-testid="mh-an-desc">
          <thead>
            <tr>
              <th>การทดสอบ</th>
              <th>n</th>
              <th>คะแนนเต็ม</th>
              <th>x̄</th>
              <th>S.D.</th>
              <th>ร้อยละเฉลี่ย</th>
              <th>S.D. (ร้อยละ)</th>
              <th>ต่ำสุด–สูงสุด (%)</th>
            </tr>
          </thead>
          <tbody>
            {(
              [
                ['ก่อนเรียน', a.pre],
                ['หลังเรียน', a.post],
              ] as const
            ).map(([label, d]) => (
              <tr key={label}>
                <td>{label}</td>
                <td className="c">{d.n}</td>
                <td className="c">{d.full ?? '–'}</td>
                <td className="c">{rawCell(d, 'rawMean')}</td>
                <td className="c">{rawCell(d, 'rawSd')}</td>
                <td className="c">{f2(d.mean)}</td>
                <td className="c">{f2(d.sd)}</td>
                <td className="c">{d.min === null ? '–' : `${Math.round(d.min)}–${Math.round(d.max ?? 0)}`}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <h3>3. เปรียบเทียบก่อนเรียนและหลังเรียน (t-test แบบไม่อิสระ ทางเดียว)</h3>
        <table className="mh-doc-table" data-testid="mh-an-ttest">
          <thead>
            <tr>
              <th>n</th>
              <th>x̄ ก่อน (%)</th>
              <th>x̄ หลัง (%)</th>
              <th>D̄</th>
              <th>S.D. ของ D</th>
              <th>t</th>
              <th>df</th>
              <th>p (ทางเดียว)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="c">{a.t.n}</td>
              <td className="c">{f2(a.pairedPre.mean)}</td>
              <td className="c">{f2(a.pairedPost.mean)}</td>
              <td className="c">{f2(a.t.meanDiff)}</td>
              <td className="c">{f2(a.t.sdDiff)}</td>
              <td className="c">
                {tText(a.t.t)}
                {a.t.sig01 ? '**' : a.t.sig05 ? '*' : ''}
              </td>
              <td className="c">{a.t.n >= 2 ? a.t.df : '–'}</td>
              <td className="c">{pText(a.t.p)}</td>
            </tr>
          </tbody>
        </table>
        <p className="mh-doc-note" data-testid="mh-an-tsummary">
          {tSummary(a.t)} {a.t.n >= 2 && `(คะแนนสูงขึ้น ${a.improvedCount} จาก ${a.t.n} คน)`} · * p &lt; .05 ** p &lt; .01 · คิดจากร้อยละของคะแนน
        </p>

        <h3>4. ดัชนีประสิทธิผลและประสิทธิภาพของนวัตกรรม</h3>
        <table className="mh-doc-table" data-testid="mh-an-ei-table">
          <tbody>
            <tr>
              <td style={{ width: '45%' }}>ดัชนีประสิทธิผล (E.I.)</td>
              <td>
                {eiText(a.ei)}
                {a.ei !== null && <> — นักเรียนมีความก้าวหน้าทางการเรียนเพิ่มขึ้นร้อยละ {(a.ei * 100).toFixed(2)}</>}
              </td>
            </tr>
            <tr>
              <td>ประสิทธิภาพของกระบวนการ (E1) จากภารกิจระหว่างเรียน</td>
              <td>
                {f2(a.e1.mean)} (n = {a.e1.n})
              </td>
            </tr>
            <tr>
              <td>ประสิทธิภาพของผลลัพธ์ (E2) จากแบบทดสอบหลังเรียน</td>
              <td>
                {f2(a.e2)} (n = {a.postDone})
              </td>
            </tr>
            <tr>
              <td>เทียบเกณฑ์ 80/80</td>
              <td>{a.e1.mean === null || a.e2 === null ? 'รอข้อมูลให้ครบ' : a.e1.mean >= 80 && a.e2 >= 80 ? 'สูงกว่าเกณฑ์ 80/80' : 'ยังต่ำกว่าเกณฑ์ 80/80'}</td>
            </tr>
            <tr>
              <td>
                นักเรียนผ่านเกณฑ์ร้อยละ {c.passPercent} (เป้าหมายร้อยละ {c.targetPercent} ของห้อง)
              </td>
              <td>
                {a.passed} จาก {a.total} คน คิดเป็นร้อยละ {f2(a.passRate)} {a.targetMet === null ? '' : a.targetMet ? '— บรรลุเป้าหมาย' : '— ยังไม่บรรลุเป้าหมาย'}
              </td>
            </tr>
          </tbody>
        </table>

        <PairBarsSvg
          title="ภาพที่ 1 คะแนนเฉลี่ยก่อนเรียนและหลังเรียน (ร้อยละ)"
          testId="mh-an-mean-chart"
          rows={[{ label: 'คะแนนเฉลี่ยทั้งห้อง', pre: a.pre.mean, post: a.post.mean }]}
          mark={{ value: c.passPercent, label: `เกณฑ์ ${c.passPercent}%` }}
        />

        <h3>5. ระดับคุณภาพของนักเรียน</h3>
        <table className="mh-doc-table" data-testid="mh-an-levels">
          <thead>
            <tr>
              <th>ระดับคุณภาพ</th>
              <th>ช่วงร้อยละ</th>
              <th>ก่อนเรียน (คน)</th>
              <th>ร้อยละ</th>
              <th>หลังเรียน (คน)</th>
              <th>ร้อยละ</th>
            </tr>
          </thead>
          <tbody>
            {SCORE_LEVELS.map((l, i) => (
              <tr key={l.id}>
                <td>{l.name}</td>
                <td className="c">{i === 0 ? `${l.min}–100` : `${l.min}–${SCORE_LEVELS[i - 1].min - 1}`}</td>
                <td className="c">{a.levels[l.id].pre}</td>
                <td className="c">{f2(a.preDone === 0 ? null : (a.levels[l.id].pre / a.preDone) * 100)}</td>
                <td className="c">{a.levels[l.id].post}</td>
                <td className="c">{f2(a.postDone === 0 ? null : (a.levels[l.id].post / a.postDone) * 100)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <h3>6. ผลรายทักษะ</h3>
        <PairBarsSvg
          title="ภาพที่ 2 ร้อยละตอบถูกรายทักษะ ก่อนเรียนและหลังเรียน"
          testId="mh-an-skill-chart"
          rows={SKILLS.filter((s) => a.skills[s].pre !== null || a.skills[s].post !== null).map((s) => ({ label: SKILL_NAMES[s], pre: a.skills[s].pre, post: a.skills[s].post }))}
          mark={{ value: c.passPercent, label: `เกณฑ์ ${c.passPercent}%` }}
        />

        <h3>7. ผลรายกลุ่มภารกิจ (ขั้น E ระหว่างเรียน)</h3>
        <table className="mh-doc-table" data-testid="mh-an-groups">
          <thead>
            <tr>
              <th>กลุ่มภารกิจ</th>
              <th>นักเรียนที่ทำ</th>
              <th>จำนวนครั้ง</th>
              <th>ถูก / ทั้งหมด</th>
              <th>ร้อยละถูก</th>
              <th>ต่ำกว่าเกณฑ์ (คน)</th>
            </tr>
          </thead>
          <tbody>
            {MISSION_GROUPS.map((g) => {
              const r = a.groups[g.id]
              return (
                <tr key={g.id}>
                  <td>
                    {g.icon} {g.name}
                  </td>
                  <td className="c">{r.players}</td>
                  <td className="c">{r.plays}</td>
                  <td className="c">{r.total === 0 ? '–' : `${r.correct} / ${r.total}`}</td>
                  <td className="c">{f2(r.percent)}</td>
                  <td className="c">{r.below}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
        <SingleBarsSvg
          title="ภาพที่ 3 ร้อยละตอบถูกรายกลุ่มภารกิจ"
          testId="mh-an-group-chart"
          rows={MISSION_GROUPS.map((g) => ({ label: g.name, value: a.groups[g.id].percent, note: `${a.groups[g.id].players} คน` }))}
          mark={{ value: c.passPercent, label: `เกณฑ์ ${c.passPercent}%` }}
        />

        <h3>8. ผลรายบุคคล</h3>
        <table className="mh-doc-table" data-testid="mh-an-students">
          <thead>
            <tr>
              <th style={{ width: '7%' }}>เลขที่</th>
              <th>ชื่อ – สกุล</th>
              <th>ก่อน</th>
              <th>หลัง</th>
              <th>ผลต่าง (%)</th>
              <th>ภารกิจ (%)</th>
              <th>ระดับ</th>
              <th>ผล</th>
            </tr>
          </thead>
          <tbody>
            {players.map((p) => {
              const pre = p.preTest ? pctOf(p.preTest) : null
              const post = p.postTest ? pctOf(p.postTest) : null
              const proc = processPercent(p)
              return (
                <tr key={p.id}>
                  <td className="c">{p.student?.no ?? ''}</td>
                  <td>{who(p)}</td>
                  <td className="c">{p.preTest ? `${p.preTest.score}/${p.preTest.total}` : '–'}</td>
                  <td className="c">{p.postTest ? `${p.postTest.score}/${p.postTest.total}` : '–'}</td>
                  <td className="c">{pre !== null && post !== null ? `${post - pre >= 0 ? '+' : ''}${f2(post - pre)}` : '–'}</td>
                  <td className="c">{f2(proc)}</td>
                  <td className="c">{post === null ? '–' : scoreLevel(post).name}</td>
                  <td className="c">{p.postTest ? (passedResult(p.postTest, c.passPercent) ? 'ผ่าน' : 'ไม่ผ่าน') : 'รอสอบ'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {both.length > 0 && (
          <DumbbellSvg
            title={`ภาพที่ 4 คะแนนก่อนเรียน → หลังเรียน รายบุคคล (ร้อยละ, ${both.length} คน)`}
            pass={c.passPercent}
            rows={both.map((p) => ({ label: shortWho(p), pre: pctOf(p.preTest!), post: pctOf(p.postTest!) }))}
          />
        )}

        <h3>9. นักเรียนที่ควรได้รับการซ่อมเสริม</h3>
        {a.remedial.length === 0 ? (
          <p data-testid="mh-an-remedial-none">ไม่มีนักเรียนที่ต่ำกว่าเกณฑ์จากข้อมูลที่มีอยู่</p>
        ) : (
          <table className="mh-doc-table" data-testid="mh-an-remedial">
            <thead>
              <tr>
                <th style={{ width: '7%' }}>เลขที่</th>
                <th>ชื่อ – สกุล</th>
                <th>เหตุผล</th>
                <th>ร้อยละ</th>
                <th>ทักษะ / ภารกิจที่ควรฝึก</th>
              </tr>
            </thead>
            <tbody>
              {a.remedial.map((r) => (
                <tr key={r.player.id}>
                  <td className="c">{r.player.student?.no ?? ''}</td>
                  <td>{who(r.player)}</td>
                  <td>{REMEDIAL_REASON[r.reason]}</td>
                  <td className="c">{f2(r.percent)}</td>
                  <td>
                    {[...r.weakSkills.map((s) => SKILL_NAMES[s]), ...r.weakGroups.map((g) => MISSION_GROUPS.find((m) => m.id === g)?.name ?? g)].join(', ') || 'ทบทวนภาพรวม'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {(a.missingPre.length > 0 || a.missingPost.length > 0) && (
          <p className="mh-doc-note" data-testid="mh-an-missing">
            {a.missingPre.length > 0 && <>ยังไม่ทำก่อนเรียน: {a.missingPre.map(shortWho).join(', ')}. </>}
            {a.missingPost.length > 0 && <>ยังไม่ทำหลังเรียน: {a.missingPost.map(shortWho).join(', ')}</>}
          </p>
        )}

        <p className="mh-doc-note">
          สูตรที่ใช้: S.D. แบบกลุ่มตัวอย่าง (หาร n − 1) · t = D̄ / (S.D. ของ D ÷ √n) · E.I. = (ผลรวมหลังเรียน − ผลรวมก่อนเรียน) ÷ (n × คะแนนเต็ม − ผลรวมก่อนเรียน) · E1 = ร้อยละตอบถูกเฉลี่ยในภารกิจระหว่างเรียน · E2 = ร้อยละเฉลี่ยหลังเรียน ·
          ข้อมูล ณ {thaiDate(Date.now())}
        </p>
        <SignBlock name={c.teacher} role="ครูผู้สอน / ผู้รายงาน" />
      </article>
    </PaperPage>
  )
}
