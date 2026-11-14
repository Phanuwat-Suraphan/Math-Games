import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useGame } from '../hooks/useMoneyGame'
import { fullName, INNOVATION_NAME, teacherName, termLine, thaiDate, type Classroom } from '../engine/classroom'
import { hasRoster, rosterList } from '../engine/roster'
import { passedResult } from '../engine/report'
import { pctOf } from '../engine/stats'
import type { Player } from '../engine/progress'
import { PaperPage } from './Paper'

/**
 * เกียรติบัตร (A4 แนวนอน หนึ่งคนต่อแผ่น)
 * - ผ่านเกณฑ์: นักเรียนที่คะแนนหลังเรียนถึงเกณฑ์ของห้อง
 * - พัฒนาการดีเด่น: คะแนนเพิ่มขึ้นมากที่สุด (เลือกจำนวนคน)
 * - เข้าร่วมกิจกรรม: ทุกคนในทะเบียน
 * เส้นทาง #/teacher/print/certificates (หรือ ?id=รหัสผู้เล่น)
 */

type Kind = 'passed' | 'improved' | 'all'

const REASON: Record<Kind, string> = {
  passed: 'ผ่านเกณฑ์การประเมินผลการเรียนรู้ เรื่อง เงิน',
  improved: 'มีพัฒนาการทางการเรียนดีเด่น เรื่อง เงิน',
  all: 'เข้าร่วมกิจกรรมการเรียนรู้ตามรูปแบบ REAL Model ครบทุกขั้นตอน',
}

const KIND_LABEL: Record<Kind, string> = {
  passed: 'ผ่านเกณฑ์',
  improved: 'พัฒนาการดีเด่น',
  all: 'เข้าร่วมกิจกรรม',
}

function gain(p: Player): number | null {
  return p.preTest && p.postTest ? pctOf(p.postTest) - pctOf(p.preTest) : null
}

/** ผู้รับเกียรติบัตรแต่ละแบบ เรียงตามเลขที่ (พัฒนาการดีเด่นเรียงจากเพิ่มมากที่สุด) */
export function certificateList(players: Player[], kind: Kind, passPercent: number, top: number): Player[] {
  if (kind === 'passed') return players.filter((p) => p.postTest && passedResult(p.postTest, passPercent))
  if (kind === 'improved') {
    return players
      .filter((p) => (gain(p) ?? 0) > 0)
      .sort((a, b) => (gain(b) ?? 0) - (gain(a) ?? 0))
      .slice(0, top)
  }
  return players
}

function Corner({ pos }: { pos: string }) {
  // ลายมุมรูปเหรียญซ้อนกัน (วาดเอง ไม่ใช้ภาพจากที่อื่น)
  return (
    <svg className={`mh-cert-corner is-${pos}`} viewBox="0 0 60 60" aria-hidden="true">
      <circle cx="18" cy="18" r="14" fill="#f2c94c" stroke="#b7791f" strokeWidth="2.5" />
      <text x="18" y="23" fontSize="13" textAnchor="middle" fill="#7a4b00" fontWeight="700">
        ฿
      </text>
      <circle cx="40" cy="14" r="9" fill="#d9d9d9" stroke="#8c8c8c" strokeWidth="2" />
      <circle cx="14" cy="41" r="9" fill="#e8b273" stroke="#b7793b" strokeWidth="2" />
    </svg>
  )
}

function Certificate({ p, c, reason, kind }: { p: Player; c: Classroom; reason: string; kind: Kind }) {
  const school = c.school ? (c.school.startsWith('โรงเรียน') ? c.school : `โรงเรียน${c.school}`) : 'โรงเรียน......................................'
  const g = gain(p)
  return (
    <article className="mh-doc is-landscape mh-cert" data-testid="mh-cert">
      <div className="mh-cert-frame">
        <Corner pos="tl" />
        <Corner pos="tr" />
        <Corner pos="bl" />
        <Corner pos="br" />
        <p className="mh-cert-school">{school}</p>
        {c.area && <p className="mh-cert-area">{c.area}</p>}
        <h2 className="mh-cert-title">เกียรติบัตร</h2>
        <p>ขอมอบเกียรติบัตรฉบับนี้ไว้เพื่อแสดงว่า</p>
        <p className="mh-cert-name">{p.student ? fullName(p.student) : teacherName(p)}</p>
        <p>นักเรียนชั้น {p.student?.room || c.room}</p>
        <p className="mh-cert-reason">{reason}</p>
        <p>
          จากการเรียนรู้ด้วยนวัตกรรม “{INNOVATION_NAME}”
          {kind === 'improved' && g !== null ? ` (คะแนนเพิ่มขึ้น ${Math.round(g)} จุดร้อยละ)` : ''}
          {kind === 'passed' && p.postTest ? ` (คะแนนหลังเรียน ${p.postTest.score}/${p.postTest.total})` : ''}
        </p>
        <p>ขอให้มีความสุข ความเจริญ และตั้งใจเรียนต่อไป</p>
        <p className="mh-cert-date">
          ให้ไว้ ณ วันที่ {thaiDate(Date.now())} {termLine(c) ? `(${termLine(c)})` : ''}
        </p>
        <div className="mh-cert-signs">
          <div>
            <p>ลงชื่อ ..............................................</p>
            <p>( {c.teacher || '..............................................'} )</p>
            <p>ครูผู้สอน</p>
          </div>
          <div>
            <p>ลงชื่อ ..............................................</p>
            <p>( {c.director || '..............................................'} )</p>
            <p>ผู้อำนวยการ{school}</p>
          </div>
        </div>
      </div>
    </article>
  )
}

export function CertificatePrintPage() {
  const { save } = useGame()
  const c = save.classroom
  const [params] = useSearchParams()
  const onlyId = params.get('id')
  const [kind, setKind] = useState<Kind>(onlyId ? 'all' : 'passed')
  const [top, setTop] = useState(5)
  const [reasons, setReasons] = useState<Record<Kind, string>>(REASON)
  const rosterMode = hasRoster(save.players)
  const players = useMemo(() => rosterList(save.players).filter((p) => (!rosterMode || p.student) && (!onlyId || p.id === onlyId)), [save.players, rosterMode, onlyId])
  const list = onlyId ? players : certificateList(players, kind, c.passPercent, top)

  return (
    <PaperPage
      title="🏅 เกียรติบัตร"
      back="/teacher/print"
      testId="mh-print-certs"
      tools={
        <>
          {!onlyId &&
            (Object.keys(KIND_LABEL) as Kind[]).map((k) => (
              <label key={k}>
                <input type="radio" name="cert-kind" checked={kind === k} onChange={() => setKind(k)} data-testid={`mh-cert-kind-${k}`} /> {KIND_LABEL[k]}
              </label>
            ))}
          {kind === 'improved' && !onlyId && (
            <label>
              จำนวน
              <select value={top} onChange={(e) => setTop(Number(e.target.value))} data-testid="mh-cert-top">
                {[1, 3, 5, 10].map((n) => (
                  <option key={n} value={n}>
                    {n} คน
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="mh-cert-reason-edit">
            ข้อความ
            <input className="mh-text-input" value={reasons[kind]} maxLength={120} onChange={(e) => setReasons((r) => ({ ...r, [kind]: e.target.value }))} data-testid="mh-cert-reason" />
          </label>
          <span>
            {list.length} แผ่น · A4 แนวนอน
          </span>
        </>
      }
    >
      {list.length === 0 ? (
        <div className="mh-card mh-center" data-testid="mh-cert-none">
          {kind === 'passed' ? `ยังไม่มีนักเรียนที่ผ่านเกณฑ์ ${c.passPercent}% จากแบบทดสอบหลังเรียน` : kind === 'improved' ? 'ยังไม่มีนักเรียนที่ทำครบทั้งก่อนและหลังเรียนและคะแนนเพิ่มขึ้น' : 'ยังไม่มีนักเรียน'}
        </div>
      ) : (
        list.map((p) => <Certificate key={p.id} p={p} c={c} reason={reasons[kind]} kind={kind} />)
      )}
    </PaperPage>
  )
}
