import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Download, Printer } from 'lucide-react'
import type { Skill } from '../engine/types'
import { useGame } from '../hooks/useMoneyGame'
import { SKILLS, SKILL_ICONS, SKILL_NAMES } from '../data/characters'
import { TOTAL_LESSONS } from '../data/levels'
import { lessonsPassed, overallAccuracy, pendingMistakes, totalStars, weakSkills, type Player } from '../engine/progress'
import { buildCsv, classSummary, improvement, minutes, percent, skillPercent, stageTable, testPercent } from '../engine/report'
import { challengesCleared, stageStars } from '../engine/stages'
import { allStars, CHESTS, MAX_STARS } from '../engine/starRoad'
import { AvatarArt, CharacterArt } from '../components/Art'
import { BeforeAfter, SkillBars, StatTile } from '../components/Charts'
import { Sky } from '../components/Sky'

/**
 * แผงคุณครู: ภาพรวมทั้งห้อง ตารางนักเรียน รายละเอียดรายคน และดาวน์โหลด CSV
 * อ่านข้อมูลจากเครื่องนี้ (localStorage) เหมาะกับแท็บเล็ตที่นักเรียนผลัดกันเล่น
 * เส้นทาง #/teacher
 */

function fmt(v: number | null, suffix = '%'): string {
  return v === null ? '–' : `${v}${suffix}`
}

function downloadCsv(players: Player[]) {
  const blob = new Blob([buildCsv(players)], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const d = new Date()
  a.href = url
  a.download = `money-hero-${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}.csv`
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function TeacherPage() {
  const { save } = useGame()
  const players = useMemo(() => Object.values(save.players).sort((a, b) => a.name.localeCompare(b.name, 'th')), [save.players])
  const [openId, setOpenId] = useState<string | null>(null)
  const sum = useMemo(() => classSummary(players), [players])
  const open = players.find((p) => p.id === openId) ?? null

  return (
    <div className="mh-page mh-teacher" data-testid="mh-teacher">
      <Sky city={false} />
      <div className="mh-page-head">
        <Link to="/start" className="mh-icon-btn" aria-label="กลับ">
          <ArrowLeft size={24} />
        </Link>
        <h1 className="mh-title">🍎 แผงคุณครู</h1>
        <div className="mh-teacher-actions">
          <Link to="/kad" className="mh-btn mh-btn-go" data-testid="mh-teacher-kad">
            🌱 กาดรักษ์โลก (สื่อพิมพ์)
          </Link>
          <Link to="/sandbox" className="mh-btn mh-btn-soft">
            🧮 โต๊ะนับเงิน (สาธิต)
          </Link>
          <button type="button" className="mh-btn mh-btn-soft" onClick={() => window.print()} disabled={players.length === 0}>
            <Printer size={20} /> พิมพ์
          </button>
          <button type="button" className="mh-btn mh-btn-gold" onClick={() => downloadCsv(players)} disabled={players.length === 0} data-testid="mh-csv">
            <Download size={20} /> ดาวน์โหลด CSV
          </button>
        </div>
      </div>

      {players.length === 0 ? (
        <div className="mh-card mh-center">
          <CharacterArt id="owl" size={110} />
          <p>ยังไม่มีนักเรียนเล่นบนเครื่องนี้ ให้นักเรียนสร้างตัวละครแล้วเริ่มเล่นได้เลย</p>
          <Link to="/create" className="mh-btn mh-btn-gold">
            + สร้างผู้เล่น
          </Link>
        </div>
      ) : (
        <>
          <div className="mh-stat-tiles mh-teacher-tiles">
            <StatTile icon="👧" label="นักเรียน" value={sum.players} />
            <StatTile icon="🎯" label="ตอบถูกเฉลี่ย" value={fmt(sum.accuracy)} />
            <StatTile icon="🧭" label="ก่อนเรียนเฉลี่ย" value={fmt(sum.pre)} />
            <StatTile icon="🎓" label="หลังเรียนเฉลี่ย" value={fmt(sum.post)} />
            <StatTile icon="📈" label="พัฒนาการเฉลี่ย" value={sum.improvement === null ? '–' : `${sum.improvement > 0 ? '+' : ''}${sum.improvement}%`} />
            <StatTile icon="🌱" label={`กาดรักษ์โลก (${sum.ecoPlayers} คน) ยอดขายรวม`} value={`${sum.ecoSales} ฿`} />
            <StatTile icon="🧰" label={`ดาวรวมเฉลี่ย (เต็ม ${MAX_STARS})`} value={sum.avgStars === null ? '–' : `⭐ ${sum.avgStars}`} />
            <StatTile icon="🔥" label={`เล่นด่านย่อย ${sum.stagePlayers} คน · ผ่านด่านท้าทาย`} value={`${sum.challengePlayers} คน`} />
          </div>

          <div className="mh-stats-grid">
            <div className="mh-card">
              <SkillBars values={sum.skills} caption="ทั้งห้อง: ตอบถูกครั้งแรกเฉลี่ย (%) แยกตามทักษะ" />
            </div>
            <div className="mh-card">
              <h3 className="mh-card-title">⚠ ทักษะที่นักเรียนยังอ่อน</h3>
              <ul className="mh-weak-list">
                {SKILLS.filter((s) => sum.weakCount[s] > 0)
                  .sort((a, b) => sum.weakCount[b] - sum.weakCount[a])
                  .map((s) => (
                    <li key={s}>
                      <span aria-hidden="true">{SKILL_ICONS[s]}</span> {SKILL_NAMES[s]} <b>{sum.weakCount[s]} คน</b>
                    </li>
                  ))}
                {SKILLS.every((s) => sum.weakCount[s] === 0) && <li className="mh-soft">ยังไม่พบทักษะที่อ่อน (นับเมื่อทำทักษะนั้นอย่างน้อย 3 ข้อ)</li>}
              </ul>
            </div>
          </div>

          <h2 className="mh-section-title">📋 นักเรียนรายคน</h2>
          <div className="mh-card mh-table-wrap">
            <table className="mh-table" data-testid="mh-teacher-table">
              <thead>
                <tr>
                  <th>ชื่อ</th>
                  <th>ด่านที่ผ่าน</th>
                  <th>ดาว</th>
                  <th>ด่านย่อย</th>
                  <th>ตอบถูก</th>
                  <th>ก่อนเรียน</th>
                  <th>หลังเรียน</th>
                  <th>พัฒนาการ</th>
                  <th>เวลา</th>
                  <th>ควรฝึก</th>
                  <th>กาด</th>
                </tr>
              </thead>
              <tbody>
                {players.map((p) => {
                  const imp = improvement(p)
                  return (
                    <tr key={p.id} className={openId === p.id ? 'is-open' : ''}>
                      <td>
                        <button type="button" className="mh-table-name" onClick={() => setOpenId(openId === p.id ? null : p.id)} aria-expanded={openId === p.id}>
                          <AvatarArt avatar={p.avatar} size={32} portrait />
                          {p.name}
                        </button>
                      </td>
                      <td>
                        {lessonsPassed(p)}/{TOTAL_LESSONS}
                      </td>
                      <td>⭐ {totalStars(p)}</td>
                      <td>{stageStars(p) > 0 ? `⭐ ${stageStars(p)} · 🔥 ${challengesCleared(p)}` : '–'}</td>
                      <td>{p.answered ? `${percent(overallAccuracy(p))}%` : '–'}</td>
                      <td>{fmt(testPercent(p.preTest))}</td>
                      <td>{fmt(testPercent(p.postTest))}</td>
                      <td>{imp === null ? '–' : <span className={imp > 0 ? 'mh-up' : imp < 0 ? 'mh-down' : ''}>{`${imp > 0 ? '▲ +' : imp < 0 ? '▼ ' : ''}${imp}%`}</span>}</td>
                      <td>{minutes(p.totalTimeMs)} น.</td>
                      <td className="mh-table-weak">{weakSkills(p).map((s) => SKILL_ICONS[s]).join(' ') || '–'}</td>
                      <td>{p.eco.days > 0 ? `${p.eco.days} วัน · ${p.eco.sales / 100} ฿` : '–'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            <p className="mh-soft mh-table-note">แตะชื่อนักเรียนเพื่อดูรายละเอียด · ไอคอนในช่อง "ควรฝึก" คือทักษะที่ตอบถูกต่ำกว่า 70%</p>
          </div>

          {open && <StudentDetail p={open} />}
        </>
      )}
    </div>
  )
}

function StudentDetail({ p }: { p: Player }) {
  const values = {} as Record<Skill, number | null>
  const counts = {} as Record<Skill, number>
  for (const s of SKILLS) {
    values[s] = skillPercent(p, s)
    counts[s] = p.skills[s].attempts
  }
  const mistakes = pendingMistakes(p, 12)
  return (
    <div className="mh-card mh-student" data-testid="mh-student-detail">
      <div className="mh-student-head">
        <AvatarArt avatar={p.avatar} size={64} />
        <div>
          <h3 className="mh-card-title">{p.name}</h3>
          <span className="mh-soft">
            ทำโจทย์ {p.answered} ข้อ · ใช้ตัวช่วย {p.hintsUsed} ครั้ง · ถูกติดกันสูงสุด {p.bestStreak} ข้อ · เล่นล่าสุด {new Date(p.lastPlayed).toLocaleString('th-TH')}
          </span>
        </div>
      </div>
      <div className="mh-stats-grid">
        <div className="mh-student-left">
          <SkillBars values={values} counts={counts} />
          <StageStars p={p} />
        </div>
        <div>
          {p.preTest || p.postTest ? <BeforeAfter pre={p.preTest} post={p.postTest} /> : <p className="mh-soft">ยังไม่ได้ทำแบบทดสอบ</p>}
          <h4 className="mh-card-title">🌱 กาดรักษ์โลก</h4>
          {p.eco.days > 0 ? (
            <p className="mh-soft" data-testid="mh-student-eco">
              เล่น {p.eco.days} วัน · ยอดขายสะสม {p.eco.sales / 100} บาท · กำไรสูงสุด {p.eco.bestProfit / 100} บาท · ออม {p.eco.saved / 100} บาท · บริจาคกองทุนต้นไม้{' '}
              {p.eco.donated / 100} บาท
            </p>
          ) : (
            <p className="mh-soft">ยังไม่ได้เล่นกาดรักษ์โลก</p>
          )}
          <h4 className="mh-card-title">🧰 ถนนดาว</h4>
          <p className="mh-soft">
            ดาวรวม {allStars(p)}/{MAX_STARS} · เปิดหีบสมบัติ {(p.chests ?? []).length}/{CHESTS.length} หีบ
          </p>
          <h4 className="mh-card-title">โจทย์ที่ยังพลาด ({mistakes.length})</h4>
          <ul className="mh-mistake-list">
            {mistakes.map((m) => (
              <li key={`${m.gen}-${m.at}`}>
                <span aria-hidden="true">{SKILL_ICONS[m.skill]}</span> ด่าน {m.levelId} · {m.title}
              </li>
            ))}
            {mistakes.length === 0 && <li className="mh-soft">ไม่มี 🎉</li>}
          </ul>
        </div>
      </div>
    </div>
  )
}

/** ดาวรายด่าน: ผจญภัย · ฝึกเก่ง · ท้าทาย (ครูเห็นว่านักเรียนเล่นถึงระดับไหนในแต่ละหัวข้อ) */
function StageStars({ p }: { p: Player }) {
  const rows = stageTable(p)
  const stars = (n: number) => (n > 0 ? '★'.repeat(n) + '☆'.repeat(3 - n) : '–')
  return (
    <div className="mh-student-stages" data-testid="mh-student-stages">
      <h4 className="mh-card-title">🎮 ดาวรายด่าน</h4>
      <div className="mh-stage-scroll">
      <table className="mh-table mh-stage-table">
        <thead>
          <tr>
            <th>ด่าน</th>
            <th>🗺️ ผจญภัย</th>
            <th>🎈 ฝึกเก่ง</th>
            <th>🔥 ท้าทาย</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.level}>
              <td>
                {r.level} · {r.name}
              </td>
              {r.stars.map((n, i) => (
                <td key={i} className={n > 0 ? 'mh-stage-cell is-on' : 'mh-stage-cell'} data-testid={`mh-stage-cell-${r.level}-${i + 1}`}>
                  {stars(n)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  )
}
