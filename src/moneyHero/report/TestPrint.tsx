import { useState } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { useGame } from '../hooks/useMoneyGame'
import { INNOVATION_NAME, termLine } from '../engine/classroom'
import { answerText, CHOICE_LABELS, fullScore, KIND_NAME, skillCounts } from '../engine/testBank'
import { SKILLS, SKILL_NAMES } from '../data/characters'
import { MoneyPile } from '../components/Art'
import { PaperPage, SignBlock } from './Paper'

/**
 * พิมพ์แบบทดสอบก่อนเรียน/หลังเรียนลงกระดาษ A4 (ใช้สอบแบบกระดาษได้ เช่นห้องที่แท็บเล็ตไม่พอ)
 * เลือกแนบกระดาษคำตอบ และเฉลยสำหรับครู (พร้อมตารางวิเคราะห์จุดประสงค์)
 * เส้นทาง #/teacher/print/test/pre และ #/teacher/print/test/post
 */
export function TestPrintPage() {
  const params = useParams<{ kind: string }>()
  const kind = params.kind === 'post' ? 'post' : params.kind === 'pre' ? 'pre' : null
  const { save } = useGame()
  const [sheet, setSheet] = useState(false)
  const [key, setKey] = useState(true)
  if (!kind) return <Navigate to="/teacher/tests" replace />
  const c = save.classroom
  const form = save.bank[kind]
  const title = form.title || KIND_NAME[kind]
  const total = fullScore(form)
  const counts = skillCounts(form)
  const hasNumber = form.items.some((i) => i.type === 'number')

  return (
    <PaperPage
      title={`🖨️ ${title}`}
      back="/teacher/tests"
      testId="mh-print-test"
      tools={
        <>
          <label>
            <input type="checkbox" checked={sheet} onChange={(e) => setSheet(e.target.checked)} data-testid="mh-print-sheet" /> แนบกระดาษคำตอบ
          </label>
          <label>
            <input type="checkbox" checked={key} onChange={(e) => setKey(e.target.checked)} data-testid="mh-print-key" /> แนบเฉลยสำหรับครู
          </label>
        </>
      }
    >
      <article className="mh-doc mh-doc-test" data-testid="mh-print-test-paper">
        <header className="mh-doc-head">
          <h2>{title}</h2>
          <p>
            นวัตกรรม “{INNOVATION_NAME}” กลุ่มสาระการเรียนรู้คณิตศาสตร์ เรื่อง เงิน ชั้น {c.room || 'ประถมศึกษาปีที่ 3'}
          </p>
          <p>
            {c.school ? (c.school.startsWith('โรงเรียน') ? c.school : `โรงเรียน${c.school}`) : 'โรงเรียน......................................'} {termLine(c)}
          </p>
        </header>
        <p className="mh-doc-fill">ชื่อ – สกุล ........................................................................ เลขที่ .......... ชั้น ..........</p>
        <div className="mh-doc-box">
          <b>คำชี้แจง</b> แบบทดสอบมี {form.items.length} ข้อ คะแนนเต็ม {total} คะแนน{form.minutes > 0 ? ` ใช้เวลา ${form.minutes} นาที` : ''}{' '}
          {sheet ? 'ให้นักเรียนตอบในกระดาษคำตอบ' : 'ให้นักเรียนกากบาท (✗) ทับตัวอักษรหน้าคำตอบที่ถูกที่สุดเพียงคำตอบเดียว'}
          {hasNumber ? ' ข้อที่มีช่องว่างให้เขียนคำตอบเป็นตัวเลข' : ''}
        </div>
        <ol className="mh-doc-items">
          {form.items.map((item, n) => (
            <li key={item.id} className="mh-doc-item">
              <p className="mh-doc-q">
                <b>{n + 1}.</b> {item.text}
                {item.points > 1 && <span className="mh-doc-note"> ({item.points} คะแนน)</span>}
              </p>
              {item.money.length > 0 && <MoneyPile items={item.money} base={34} className="mh-doc-money" />}
              {item.type === 'choice' ? (
                <ol className={`mh-doc-choices ${item.choices.some((x) => x.length > 22) ? 'is-long' : ''}`}>
                  {item.choices.map((ch, i) => (
                    <li key={i}>
                      {CHOICE_LABELS[i]}. {ch}
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="mh-doc-blank">ตอบ ................................ {item.unit}</p>
              )}
            </li>
          ))}
        </ol>
      </article>

      {sheet && (
        <article className="mh-doc" data-testid="mh-print-test-sheet">
          <header className="mh-doc-head">
            <h2>กระดาษคำตอบ {title}</h2>
            <p>นวัตกรรม “{INNOVATION_NAME}”</p>
          </header>
          <p className="mh-doc-fill">ชื่อ – สกุล ........................................................................ เลขที่ .......... ชั้น ..........</p>
          <table className="mh-doc-table mh-doc-sheet">
            <thead>
              <tr>
                <th style={{ width: '12%' }}>ข้อ</th>
                <th>คำตอบ</th>
                <th style={{ width: '12%' }}>ข้อ</th>
                <th>คำตอบ</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: Math.ceil(form.items.length / 2) }, (_, r) => {
                const half = Math.ceil(form.items.length / 2)
                const cells = [form.items[r], form.items[r + half]]
                return (
                  <tr key={r}>
                    {cells.map((item, k) =>
                      item ? (
                        [
                          <td key={`n${k}`} className="c">
                            {r + 1 + k * half}
                          </td>,
                          <td key={`a${k}`}>
                            {item.type === 'choice' ? (
                              <span className="mh-doc-bubbles">
                                {CHOICE_LABELS.map((l) => (
                                  <span key={l}>{l}</span>
                                ))}
                              </span>
                            ) : (
                              `...................... ${item.unit}`
                            )}
                          </td>,
                        ]
                      ) : (
                        [<td key={`n${k}`} />, <td key={`a${k}`} />]
                      ),
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
          <p className="mh-doc-summary">คะแนนที่ได้ ............ / {total} คะแนน</p>
        </article>
      )}

      {key && (
        <article className="mh-doc" data-testid="mh-print-test-key">
          <header className="mh-doc-head">
            <h2>เฉลย{title} (สำหรับครู)</h2>
            <p>
              {form.items.length} ข้อ คะแนนเต็ม {total} คะแนน
            </p>
          </header>
          <table className="mh-doc-table">
            <thead>
              <tr>
                <th style={{ width: '8%' }}>ข้อ</th>
                <th>คำตอบที่ถูก</th>
                <th style={{ width: '30%' }}>จุดประสงค์</th>
                <th style={{ width: '10%' }}>คะแนน</th>
              </tr>
            </thead>
            <tbody>
              {form.items.map((item, n) => (
                <tr key={item.id}>
                  <td className="c">{n + 1}</td>
                  <td>{answerText(item)}</td>
                  <td>{SKILL_NAMES[item.skill]}</td>
                  <td className="c">{item.points}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <h3>ตารางวิเคราะห์จุดประสงค์</h3>
          <table className="mh-doc-table">
            <thead>
              <tr>
                <th>จุดประสงค์</th>
                <th style={{ width: '18%' }}>จำนวนข้อ</th>
                <th style={{ width: '38%' }}>ข้อที่</th>
              </tr>
            </thead>
            <tbody>
              {SKILLS.filter((s) => counts[s] > 0).map((s) => (
                <tr key={s}>
                  <td>{SKILL_NAMES[s]}</td>
                  <td className="c">{counts[s]}</td>
                  <td>
                    {form.items
                      .map((it, i) => (it.skill === s ? i + 1 : 0))
                      .filter(Boolean)
                      .join(', ')}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td>รวม</td>
                <td className="c">{form.items.length}</td>
                <td />
              </tr>
            </tfoot>
          </table>
          <SignBlock name={c.teacher} role="ครูผู้สอน" />
        </article>
      )}
    </PaperPage>
  )
}

