import { useMemo, useState } from 'react'
import { useGame } from '../hooks/useMoneyGame'
import { fullName, teacherName } from '../engine/classroom'
import { hasRoster, rosterList } from '../engine/roster'
import { bingoCard, buildBingo, CELLS, POOL, winAt, type BingoCell, type BingoSet } from '../engine/bingo'
import { formatBS, formatDotNumber } from '../utils/money'
import type { Player } from '../engine/progress'
import { PaperPage } from './Paper'
import { CharacterArt } from '../components/Art'
import type { NpcId } from '../engine/types'

const MASCOTS: NpcId[] = ['rabbit', 'fox', 'bear', 'owl', 'hero']

/**
 * บิงโกเงินทอง: การ์ด 5×5 (A4 หน้าละ 2 ใบ) ใบเรียกโจทย์ของครูพร้อมเฉลย ตารางตรวจผู้ชนะ
 * และโหมดเรียกโจทย์บนจอ (ฉายโปรเจกเตอร์)
 * เส้นทาง #/teacher/print/bingo
 */

type Who = { n: number; p: Player | null }

function Card({ set, who, cells }: { set: BingoSet; who: Who; cells: BingoCell[] }) {
  return (
    <div className={`mh-bingo-card is-m${who.n % MASCOTS.length}`} data-testid="mh-bingo-card">
      <CharacterArt id={MASCOTS[who.n % MASCOTS.length]} size={46} mood="happy" className="mh-bingo-mascot" />
      <div className="mh-bingo-head">
        <b>🎱 บิงโกเงินทอง</b>
        <span>
          ชุดที่ {set.seed} · ใบที่ {who.n}
        </span>
      </div>
      <p className={who.p ? 'mh-bingo-name' : 'mh-doc-line'}>
        ชื่อ {who.p ? `${who.p.student?.no ? `${who.p.student.no}. ` : ''}${who.p.student ? fullName(who.p.student) : teacherName(who.p)}` : ''}
      </p>
      <div className="mh-bingo-grid">
        {cells.map((c, i) => (
          <div key={i} className={`mh-bingo-cell ${c.value === null ? 'is-free' : ''}`}>
            {c.value === null ? (
              <>
                <CharacterArt id={MASCOTS[who.n % MASCOTS.length]} size={34} portrait className="mh-bingo-free-face" />
                ฟรี
              </>
            ) : (
              c.label
            )}
          </div>
        ))}
      </div>
      <p className="mh-bingo-rule">
        ฟังโจทย์ คิดคำตอบ แล้วกากบาท ✗ ช่องที่ตรงกัน · ครบ 1 แถว (แนวนอน แนวตั้ง หรือแนวทแยง) ตะโกน <b className="mh-bingo-shout">📣 บิงโก!</b>
      </p>
    </div>
  )
}

function Caller({ set }: { set: BingoSet }) {
  const [i, setI] = useState(0)
  const [show, setShow] = useState(false)
  const call = set.calls[i]
  return (
    <section className="mh-card mh-bingo-caller mh-noprint" data-testid="mh-bingo-caller">
      <div className="mh-bingo-caller-top">
        <b>
          ข้อ {i + 1} / {set.calls.length}
        </b>
        <div className="mh-row-buttons">
          <button type="button" className="mh-btn mh-btn-soft" disabled={i === 0} onClick={() => (setI(i - 1), setShow(false))} data-testid="mh-bingo-prev">
            ◀ ก่อนหน้า
          </button>
          <button type="button" className="mh-btn mh-btn-gold" onClick={() => setShow((s) => !s)} data-testid="mh-bingo-reveal">
            {show ? 'ซ่อนคำตอบ' : 'เฉลย'}
          </button>
          <button type="button" className="mh-btn mh-btn-go" disabled={i === set.calls.length - 1} onClick={() => (setI(i + 1), setShow(false))} data-testid="mh-bingo-next">
            ถัดไป ▶
          </button>
        </div>
      </div>
      <p className="mh-bingo-call" data-testid="mh-bingo-call-text">
        {call.text}
      </p>
      <p className="mh-bingo-answer" data-testid="mh-bingo-answer">
        {show ? `${formatDotNumber(call.answer)} บาท (${formatBS(call.answer)})` : '❓'}
      </p>
      <p className="mh-soft">
        เรียกไปแล้ว: {set.calls
          .slice(0, i)
          .map((c) => formatDotNumber(c.answer))
          .join(' · ') || '–'}
      </p>
    </section>
  )
}

export function BingoPrintPage() {
  const { save } = useGame()
  const [seed, setSeed] = useState(1)
  const [byName, setByName] = useState(true)
  const [count, setCount] = useState(30)
  const [caller, setCaller] = useState(false)
  const rosterMode = hasRoster(save.players)
  const students = useMemo(() => rosterList(save.players).filter((p) => !rosterMode || p.student), [save.players, rosterMode])
  const set = useMemo(() => buildBingo(seed), [seed])
  const useNames = byName && students.length > 0
  const whos: Who[] = useNames ? students.map((p, i) => ({ n: i + 1, p })) : Array.from({ length: count }, (_, i) => ({ n: i + 1, p: null }))
  const cards = whos.map((w) => ({ w, cells: bingoCard(set, w.n) }))
  const pages: (typeof cards)[] = []
  for (let i = 0; i < cards.length; i += 2) pages.push(cards.slice(i, i + 2))
  const wins = cards
    .map((c) => ({ n: c.w.n, p: c.w.p, at: winAt(set, c.cells) }))
    .sort((a, b) => (a.at ?? 99) - (b.at ?? 99) || a.n - b.n)

  return (
    <PaperPage
      title="🎱 บิงโกเงินทอง"
      back="/teacher/print"
      testId="mh-print-bingo"
      tools={
        <>
          <label>
            ชุดที่
            <select value={seed} onChange={(e) => setSeed(Number(e.target.value))} data-testid="mh-bingo-seed">
              {Array.from({ length: 20 }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          {students.length > 0 && (
            <label>
              <input type="checkbox" checked={byName} onChange={(e) => setByName(e.target.checked)} data-testid="mh-bingo-byname" /> ใส่ชื่อนักเรียน ({students.length} ใบ)
            </label>
          )}
          {!useNames && (
            <label>
              จำนวนการ์ด
              <select value={count} onChange={(e) => setCount(Number(e.target.value))} data-testid="mh-bingo-count">
                {[10, 20, 30, 40].map((n) => (
                  <option key={n} value={n}>
                    {n} ใบ
                  </option>
                ))}
              </select>
            </label>
          )}
          <button type="button" className="mh-btn mh-btn-go" onClick={() => setCaller((c) => !c)} data-testid="mh-bingo-caller-toggle">
            {caller ? 'ปิดจอเรียกโจทย์' : '📣 เรียกโจทย์บนจอ'}
          </button>
          <span className="mh-soft">A4 หน้าละ 2 ใบ · ทุกใบไม่เหมือนกัน · ชุดเดิมพิมพ์ซ้ำได้การ์ดเดิม</span>
        </>
      }
    >
      {caller && <Caller set={set} />}

      {pages.map((pg, i) => (
        <article key={i} className="mh-doc mh-bingo-page" data-testid="mh-bingo-page">
          {pg.map((c) => (
            <Card key={c.w.n} set={set} who={c.w} cells={c.cells} />
          ))}
        </article>
      ))}

      <article className="mh-doc mh-bingo-calls" data-testid="mh-bingo-calls">
        <h2 className="mh-ws-keytitle">ใบเรียกโจทย์บิงโกเงินทอง ชุดที่ {set.seed} (สำหรับครู)</h2>
        <div className="mh-doc-box">
          <b>วิธีเล่น</b> แจกการ์ดคนละใบ ครูอ่านโจทย์ตามลำดับ ให้เวลาคิดข้อละประมาณ 20–30 วินาที นักเรียนกากบาทช่องที่เป็นคำตอบ (ช่องกลางฟรี) ใครครบ 1 แถวก่อนชนะ
          ให้ผู้ชนะอ่านคำตอบในแถวนั้นพร้อมอธิบายวิธีคิด แล้วครูเทียบกับตารางตรวจด้านล่าง · ชุดนี้มีคำตอบ {POOL} จำนวน แต่ละการ์ดมี {CELLS - 1} ช่อง
        </div>
        <table className="mh-doc-table">
          <thead>
            <tr>
              <th style={{ width: '7%' }}>ข้อ</th>
              <th>โจทย์</th>
              <th style={{ width: '20%' }}>คำตอบ</th>
              <th style={{ width: '7%' }}>✓</th>
            </tr>
          </thead>
          <tbody>
            {set.calls.map((c, i) => (
              <tr key={i}>
                <td className="c">{i + 1}</td>
                <td>{c.text}</td>
                <td>
                  {formatDotNumber(c.answer)} บาท
                </td>
                <td />
              </tr>
            ))}
          </tbody>
        </table>
        <h3>ตารางตรวจผู้ชนะ (การ์ดใบไหนครบแถวเมื่ออ่านถึงข้อใด)</h3>
        <table className="mh-doc-table" data-testid="mh-bingo-wins">
          <thead>
            <tr>
              <th style={{ width: '12%' }}>ใบที่</th>
              <th>ชื่อ</th>
              <th style={{ width: '22%' }}>ได้บิงโกที่ข้อ</th>
            </tr>
          </thead>
          <tbody>
            {wins.map((w) => (
              <tr key={w.n}>
                <td className="c">{w.n}</td>
                <td>{w.p ? (w.p.student ? fullName(w.p.student) : teacherName(w.p)) : ''}</td>
                <td className="c">{w.at ?? 'ไม่ครบแถว'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </article>
    </PaperPage>
  )
}
