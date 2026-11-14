import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useGame } from '../hooks/useMoneyGame'
import type { Skill } from '../engine/types'
import { SKILLS, SKILL_NAMES } from '../data/characters'
import { fullName, INNOVATION_NAME, teacherName, type Classroom } from '../engine/classroom'
import { hasRoster, rosterList } from '../engine/roster'
import { buildWorksheet, remedialSkills, studentSeed, type SheetItem, type SheetLevel } from '../engine/worksheet'
import type { Player } from '../engine/progress'
import { MoneyPile } from '../components/Art'
import { PaperPage } from './Paper'

/**
 * ใบงานซ่อมเสริมรายทักษะ (A4) พร้อมเฉลยสำหรับครู
 * - ตามทักษะ: ครูเลือกทักษะ จำนวนข้อ ระดับ และชุดที่ ถ่ายเอกสารแจกทั้งห้อง
 * - รายบุคคล: ระบบเลือกทักษะที่นักเรียนแต่ละคนยังอ่อน คนละชุดโจทย์ (ไม่ลอกกัน) แต่พิมพ์ซ้ำได้เหมือนเดิม
 * เส้นทาง #/teacher/print/worksheets (หรือ ?id=รหัสผู้เล่น)
 */

type Mode = 'skill' | 'student'

/** รายบุคคล: ซ่อมไม่เกิน 3 ทักษะต่อแผ่น เด็กไม่ท้อ */
const MAX_STUDENT_SKILLS = 3

function Item({ item, n }: { item: SheetItem; n: number }) {
  return (
    <div className="mh-ws-item">
      <p className="mh-doc-q">
        <b>{n}.</b> {item.text}
      </p>
      {item.money && item.money.length > 0 && <MoneyPile items={item.money} base={42} className="mh-doc-money mh-ws-money" />}
      {item.table && (
        <table className="mh-doc-table mh-ws-table">
          <thead>
            <tr>
              {item.table.head.map((h) => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {item.table.rows.map((row) => (
              <tr key={row[0]}>
                {row.map((cell, i) => (
                  <td key={i} className={i >= 2 ? 'r' : i === 0 ? 'c' : undefined}>
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {item.work && <div className="mh-ws-work">แสดงวิธีทำ</div>}
    </div>
  )
}

function SheetHead({ c, title, who }: { c: Classroom; title: string; who?: Player }) {
  return (
    <header className="mh-ws-head">
      <h2>{title}</h2>
      <p>
        {INNOVATION_NAME} · เรื่อง เงิน · ชั้น {c.room}
      </p>
      {who ? (
        <p>
          <b>ชื่อ</b> {who.student ? fullName(who.student) : teacherName(who)} &nbsp; <b>เลขที่</b> {who.student?.no ?? '......'} &nbsp; <b>วันที่</b> ......................
        </p>
      ) : (
        <p className="mh-doc-line">ชื่อ – สกุล</p>
      )}
      {!who && <p className="mh-doc-fill">เลขที่ .......... ชั้น .......... วันที่ ..............................</p>}
    </header>
  )
}

function Sheet({ c, items, title, who, testId }: { c: Classroom; items: SheetItem[]; title: string; who?: Player; testId: string }) {
  const skills = SKILLS.filter((s) => items.some((i) => i.skill === s))
  let n = 0
  return (
    <article className="mh-doc mh-ws" data-testid={testId}>
      <SheetHead c={c} title={title} who={who} />
      <div className="mh-doc-box">
        <b>คำชี้แจง</b> เติมคำตอบลงในช่องว่าง ข้อที่มีกรอบ “แสดงวิธีทำ” ให้เขียนวิธีคิดด้วย · ได้ ........ / {items.length} คะแนน
      </div>
      {skills.map((s) => {
        const own = items.filter((i) => i.skill === s)
        const start = n
        n += own.length
        const head = <h3>ทักษะ: {SKILL_NAMES[s]}</h3>
        return (
          <section key={s} className="mh-ws-skill">
            {/* หัวข้อทักษะติดไปกับข้อแรกเสมอ ไม่ค้างอยู่ท้ายหน้าเดียว ๆ */}
            <div className="mh-ws-keep">
              {head}
              <Item item={own[0]} n={start + 1} />
            </div>
            {own.slice(1).map((item, i) => (
              <Item key={i} item={item} n={start + i + 2} />
            ))}
          </section>
        )
      })}
    </article>
  )
}

function KeyTable({ items, title }: { items: SheetItem[]; title: string }) {
  const order = SKILLS.flatMap((s) => items.filter((i) => i.skill === s))
  return (
    <div className="mh-ws-key">
      <h3>{title}</h3>
      <table className="mh-doc-table">
        <thead>
          <tr>
            <th style={{ width: '8%' }}>ข้อ</th>
            <th style={{ width: '24%' }}>ทักษะ</th>
            <th>เฉลย</th>
          </tr>
        </thead>
        <tbody>
          {order.map((it, i) => (
            <tr key={i}>
              <td className="c">{i + 1}</td>
              <td>{SKILL_NAMES[it.skill]}</td>
              <td>{it.answer}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function WorksheetPrintPage() {
  const { save } = useGame()
  const c = save.classroom
  const [params] = useSearchParams()
  const onlyId = params.get('id')
  const [mode, setMode] = useState<Mode>(onlyId ? 'student' : 'skill')
  const [skills, setSkills] = useState<Skill[]>(['dot', 'addsub', 'word'])
  const [perSkill, setPerSkill] = useState(4)
  const [level, setLevel] = useState<SheetLevel>(1)
  const [seed, setSeed] = useState(1)
  const [withKey, setWithKey] = useState(true)

  const rosterMode = hasRoster(save.players)
  const students = useMemo(() => rosterList(save.players).filter((p) => (!rosterMode || p.student) && (!onlyId || p.id === onlyId)), [save.players, rosterMode, onlyId])
  const bySkill = useMemo(() => buildWorksheet({ skills, perSkill, level, seed }), [skills, perSkill, level, seed])
  const perStudent = useMemo(
    () =>
      students
        .map((p) => {
          const need = remedialSkills(p, c.passPercent).slice(0, MAX_STUDENT_SKILLS)
          return { p, need, items: need.length === 0 ? [] : buildWorksheet({ skills: need, perSkill: Math.min(perSkill, 4), level, seed: studentSeed(seed, p.id) }) }
        })
        .filter((x) => x.items.length > 0),
    [students, c.passPercent, perSkill, level, seed],
  )
  const skipped = students.length - perStudent.length

  const toggle = (s: Skill) => setSkills((xs) => (xs.includes(s) ? xs.filter((x) => x !== s) : [...xs, s]))

  return (
    <PaperPage
      title="🖨️ ใบงานซ่อมเสริม"
      back="/teacher/print"
      testId="mh-print-worksheets"
      tools={
        <div className="mh-ws-tools">
          <div className="mh-ws-modes" role="radiogroup" aria-label="แบบใบงาน">
            <label>
              <input type="radio" name="ws-mode" checked={mode === 'skill'} onChange={() => setMode('skill')} data-testid="mh-ws-mode-skill" /> ตามทักษะ (แจกทั้งห้อง)
            </label>
            <label>
              <input type="radio" name="ws-mode" checked={mode === 'student'} onChange={() => setMode('student')} data-testid="mh-ws-mode-student" /> รายบุคคล (ตามทักษะที่ยังอ่อน)
            </label>
          </div>
          {mode === 'skill' && (
            <div className="mh-ws-skills">
              {SKILLS.map((s) => (
                <label key={s}>
                  <input type="checkbox" checked={skills.includes(s)} onChange={() => toggle(s)} data-testid={`mh-ws-skill-${s}`} /> {SKILL_NAMES[s]}
                </label>
              ))}
            </div>
          )}
          <label>
            ทักษะละ
            <select value={perSkill} onChange={(e) => setPerSkill(Number(e.target.value))} data-testid="mh-ws-per">
              {[2, 3, 4, 5, 6, 8].map((n) => (
                <option key={n} value={n}>
                  {n} ข้อ
                </option>
              ))}
            </select>
          </label>
          <label>
            ระดับ
            <select value={level} onChange={(e) => setLevel(Number(e.target.value) as SheetLevel)} data-testid="mh-ws-level">
              <option value={1}>พื้นฐาน</option>
              <option value={2}>ท้าทาย</option>
            </select>
          </label>
          <label>
            ชุดที่
            <select value={seed} onChange={(e) => setSeed(Number(e.target.value))} data-testid="mh-ws-seed">
              {Array.from({ length: 20 }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          <label>
            <input type="checkbox" checked={withKey} onChange={(e) => setWithKey(e.target.checked)} data-testid="mh-ws-key" /> พิมพ์เฉลยสำหรับครู
          </label>
          <span className="mh-soft">ชุดที่เดียวกันพิมพ์ซ้ำได้โจทย์และเฉลยเดิม · เปลี่ยนชุดที่เมื่ออยากได้โจทย์ใหม่</span>
        </div>
      }
    >
      {mode === 'skill' ? (
        skills.length === 0 ? (
          <div className="mh-card mh-center">เลือกทักษะอย่างน้อย 1 ทักษะ</div>
        ) : (
          <>
            <Sheet c={c} items={bySkill} title={`ใบงานฝึกทักษะเรื่องเงิน ชุดที่ ${seed}`} testId="mh-ws-sheet" />
            {withKey && (
              <article className="mh-doc mh-ws" data-testid="mh-ws-keypage">
                <KeyTable items={bySkill} title={`เฉลยใบงานฝึกทักษะเรื่องเงิน ชุดที่ ${seed} (สำหรับครู)`} />
              </article>
            )}
          </>
        )
      ) : perStudent.length === 0 ? (
        <div className="mh-card mh-center" data-testid="mh-ws-none">
          ยังไม่มีนักเรียนที่ต้องซ่อมเสริม (นับจากทักษะที่ทำผิดบ่อยในเกม และผลแบบทดสอบที่ต่ำกว่าเกณฑ์ {c.passPercent}%)
        </div>
      ) : (
        <>
          {skipped > 0 && <p className="mh-card mh-noprint">ไม่ต้องซ่อมเสริม {skipped} คน (ยังไม่มีทักษะที่ต่ำกว่าเกณฑ์)</p>}
          {perStudent.map((x) => (
            <Sheet key={x.p.id} c={c} items={x.items} who={x.p} title="ใบงานซ่อมเสริมรายบุคคล" testId="mh-ws-sheet" />
          ))}
          {withKey && (
            <article className="mh-doc mh-ws" data-testid="mh-ws-keypage">
              <h2 className="mh-ws-keytitle">เฉลยใบงานซ่อมเสริมรายบุคคล ชุดที่ {seed} (สำหรับครู)</h2>
              {perStudent.map((x) => (
                <KeyTable key={x.p.id} items={x.items} title={`${x.p.student?.no ? `${x.p.student.no}. ` : ''}${x.p.student ? fullName(x.p.student) : teacherName(x.p)}`} />
              ))}
            </article>
          )}
        </>
      )}
    </PaperPage>
  )
}
