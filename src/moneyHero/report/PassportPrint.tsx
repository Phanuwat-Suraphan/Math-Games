import { useMemo, useState, type ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useGame } from '../hooks/useMoneyGame'
import { fullName, INNOVATION_NAME, teacherName, type Classroom } from '../engine/classroom'
import { hasRoster, rosterList } from '../engine/roster'
import { groupInfo, FEELINGS, MISSION_GROUPS } from '../engine/activity'
import { CLASS_STAMPS, passportSummary, type Stamp } from '../engine/passport'
import { pctOf, scoreLevel } from '../engine/stats'
import type { Player } from '../engine/progress'
import { PaperPage } from './Paper'

/**
 * หนังสือเดินทางนักผจญภัยเมืองเงิน (A4 คนละแผ่น)
 * เรียงตามขั้น R E A L · ตราภารกิจในเกมพิมพ์ให้อัตโนมัติเมื่อผ่านเกณฑ์ ช่องว่างให้ครูประทับตราหรือติดสติกเกอร์
 * เส้นทาง #/teacher/print/passport (หรือ ?id=รหัสผู้เล่น)
 */

function shortDate(ms: number): string {
  const d = new Date(ms)
  return `${d.getDate()}/${d.getMonth() + 1}/${String(d.getFullYear() + 543).slice(2)}`
}

function Step({ letter, title, sub, done, children }: { letter: string; title: string; sub: string; done: boolean | null; children: ReactNode }) {
  return (
    <section className={`mh-pp-step is-${letter.toLowerCase()}`}>
      <div className="mh-pp-letter" aria-hidden="true">
        {letter}
      </div>
      <div className="mh-pp-body">
        <h3>
          {title} <small>{sub}</small>
          {done !== null && <span className={`mh-pp-check ${done ? 'is-done' : ''}`}>{done ? '☑ ทำแล้ว' : '☐ ยังไม่ได้ทำ'}</span>}
        </h3>
        {children}
      </div>
    </section>
  )
}

function Passport({ p, c, fill }: { p: Player | null; c: Classroom; fill: boolean }) {
  const sum = p && fill ? passportSummary(p, c.passPercent) : null
  const s = p?.student
  const pre = fill && p?.preTest ? p.preTest : null
  const post = fill && p?.postTest ? p.postTest : null
  return (
    <article className="mh-doc mh-pp" data-testid="mh-passport">
      <header className="mh-pp-head">
        <div className="mh-pp-emblem" aria-hidden="true">
          🧭
        </div>
        <div>
          <h2>หนังสือเดินทางนักผจญภัยเมืองเงิน</h2>
          <p>{INNOVATION_NAME} · เรื่อง เงิน</p>
        </div>
        <div className="mh-pp-count" aria-label="ตราที่ได้">
          <b>{sum ? sum.earned : '..'}</b>/6
          <small>ตราภารกิจ</small>
        </div>
      </header>
      <p className="mh-pp-who">
        <b>ชื่อ</b> {p ? (s ? fullName(s) : teacherName(p)) : '.......................................................'} &nbsp; <b>เลขที่</b> {s?.no ?? '......'} &nbsp; <b>ชั้น</b> {s?.room || c.room}{' '}
        &nbsp; <b>กลุ่ม</b> {s?.team ?? '......'}
      </p>

      <Step letter="R" title="ทบทวนและตั้งเป้าหมาย" sub="Recall & Review" done={sum ? sum.steps.r : null}>
        <div className="mh-pp-row">
          <div className="mh-pp-score">
            คะแนนก่อนเรียน
            <b>{pre ? `${pre.score}/${pre.total}` : '....../......'}</b>
          </div>
          <div className="mh-pp-lines">
            <p className="mh-doc-line">เป้าหมายของฉัน</p>
            <p className="mh-doc-line" />
          </div>
        </div>
      </Step>

      <Step letter="E" title="ตะลุยภารกิจ" sub="Engage & Experience" done={sum ? sum.steps.e : null}>
        <p className="mh-pp-note">ได้ตราเมื่อทำภารกิจในเกมครบ 5 ข้อขึ้นไป และตอบถูกตั้งแต่ร้อยละ {c.passPercent}</p>
        <div className="mh-pp-stamps">
          {(sum?.stamps ?? MISSION_GROUPS.map((g): Stamp => ({ group: g.id, earned: false, percent: null, at: null, total: 0 }))).map((st) => {
            const g = groupInfo(st.group)
            return (
              <div key={st.group} className={`mh-pp-stamp ${st.earned ? 'is-earned' : ''}`} data-testid={`mh-stamp-${st.group}`}>
                <div className="mh-pp-ring">
                  {st.earned ? (
                    <>
                      <span className="mh-pp-ring-icon" aria-hidden="true">
                        {g.icon}
                      </span>
                      <span className="mh-pp-ring-ok">ผ่านแล้ว</span>
                      {st.at && <span className="mh-pp-ring-date">{shortDate(st.at)}</span>}
                    </>
                  ) : (
                    <span className="mh-pp-ring-icon is-faint" aria-hidden="true">
                      {g.icon}
                    </span>
                  )}
                </div>
                <span className="mh-pp-stamp-name">{g.name}</span>
              </div>
            )
          })}
        </div>
        <p className="mh-pp-note">ตรากิจกรรมในห้องเรียน (ครูประทับ)</p>
        <div className="mh-pp-stamps is-class">
          {CLASS_STAMPS.map((cs) => (
            <div key={cs.id} className="mh-pp-stamp">
              <div className="mh-pp-ring is-small">
                <span className="mh-pp-ring-icon is-faint" aria-hidden="true">
                  {cs.icon}
                </span>
              </div>
              <span className="mh-pp-stamp-name">{cs.name}</span>
            </div>
          ))}
        </div>
      </Step>

      <Step letter="A" title="วัดผลและวิเคราะห์" sub="Assess & Analyze" done={sum ? sum.steps.a : null}>
        <div className="mh-pp-row">
          <div className="mh-pp-score">
            คะแนนหลังเรียน
            <b>{post ? `${post.score}/${post.total}` : '....../......'}</b>
          </div>
          <div className="mh-pp-score">
            ระดับ
            <b>{post ? scoreLevel(pctOf(post)).name : '..............'}</b>
          </div>
          <div className="mh-pp-score">
            เพิ่มขึ้น
            <b>{pre && post ? `${Math.round(pctOf(post) - pctOf(pre))}%` : '.......'}</b>
          </div>
        </div>
      </Step>

      <Step letter="L" title="เรียนรู้และก้าวต่อไป" sub="Learn & Level Up" done={sum ? sum.steps.l : null}>
        <p className="mh-pp-faces">
          วงกลมรอบหน้าที่ตรงกับความรู้สึก:
          {FEELINGS.map((f) => (
            <span key={f.id} className={fill && p?.reflection?.feeling === f.id ? 'is-picked' : undefined}>
              {f.icon} {f.label}
            </span>
          ))}
        </p>
        <p className="mh-doc-line">สิ่งที่ฉันภูมิใจ {fill && p?.reflection?.good ? `: ${p.reflection.good}` : ''}</p>
        <p className="mh-doc-line">ฉันจะนำไปใช้ที่บ้าน {fill && p?.reflection?.apply ? `: ${p.reflection.apply}` : ''}</p>
      </Step>

      <div className="mh-pp-signs">
        <p>ลงชื่อ ........................................ ครู</p>
        <p>ลงชื่อ ........................................ ผู้ปกครอง</p>
      </div>
    </article>
  )
}

export function PassportPrintPage() {
  const { save } = useGame()
  const c = save.classroom
  const [params] = useSearchParams()
  const onlyId = params.get('id')
  const [fill, setFill] = useState(true)
  const rosterMode = hasRoster(save.players)
  const list = useMemo(() => rosterList(save.players).filter((p) => (!rosterMode || p.student) && (!onlyId || p.id === onlyId)), [save.players, rosterMode, onlyId])

  return (
    <PaperPage
      title="🧭 หนังสือเดินทางนักผจญภัย"
      back="/teacher/print"
      testId="mh-print-passport"
      tools={
        <>
          <label>
            <input type="checkbox" checked={fill} onChange={(e) => setFill(e.target.checked)} data-testid="mh-pp-fill" /> เติมคะแนนและตราจากเกม
          </label>
          <span>{list.length > 0 ? `${list.length} แผ่น (คนละแผ่น)` : 'ยังไม่มีรายชื่อ พิมพ์แบบว่าง 1 แผ่นไปถ่ายเอกสาร'}</span>
          <span className="mh-soft">ปิด “เติมคะแนน” เพื่อพิมพ์ตั้งแต่วันแรก แล้วให้นักเรียนสะสมตราจริงตลอดหน่วย</span>
        </>
      }
    >
      {list.length === 0 ? <Passport p={null} c={c} fill={false} /> : list.map((p) => <Passport key={p.id} p={p} c={c} fill={fill} />)}
    </PaperPage>
  )
}
