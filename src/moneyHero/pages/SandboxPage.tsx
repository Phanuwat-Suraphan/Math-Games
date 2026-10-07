import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import type { DenomId } from '../engine/types'
import { useGame } from '../hooks/useMoneyGame'
import { ALL_DENOM_IDS, denom, sortDenomsDesc } from '../data/denominations'
import { SANDBOX_MAX, fewestPieces, summarize } from '../engine/sandbox'
import { formatBS, formatDot } from '../utils/money'
import { MoneyPiece, CharacterArt } from '../components/Art'
import { TopBar } from '../components/TopBar'
import { playSound } from '../utils/sound'
import { speak } from '../utils/speech'

/**
 * โต๊ะนับเงิน: เล่นอิสระ ไม่มีถูกผิด
 * แตะเงินในลิ้นชักเพื่อวางบนโต๊ะ แตะเงินบนโต๊ะเพื่อเก็บคืน
 * ยอดรวมแสดงทั้งแบบบาท–สตางค์ และแบบใช้จุด พร้อมแยกนับตามชนิด
 * ปุ่ม "แลกให้น้อยชิ้นที่สุด" สอนเรื่องการแลกเงินไปในตัว
 * เส้นทาง #/sandbox (ใช้ได้โดยไม่ต้องมีผู้เล่น เหมาะให้ครูสาธิตหน้าห้อง)
 */
export function SandboxPage() {
  const { player } = useGame()
  const [mat, setMat] = useState<DenomId[]>([])
  const [note, setNote] = useState('แตะเงินในลิ้นชักด้านล่าง เพื่อวางบนโต๊ะ')
  const { total, groups } = summarize(mat)

  const add = (id: DenomId) => {
    if (mat.length >= SANDBOX_MAX) {
      setNote(`โต๊ะเต็มแล้ว (${SANDBOX_MAX} ชิ้น) ลองกด "แลกให้น้อยชิ้นที่สุด" ดูนะ`)
      return
    }
    playSound('coin')
    setMat((m) => [...m, id])
    setNote(`วาง${denom(id).name}`)
  }

  const remove = (i: number) => {
    playSound('click')
    setMat((m) => m.filter((_, k) => k !== i))
  }

  const tidy = () => {
    if (mat.length === 0) return
    const fewest = fewestPieces(total)
    playSound(fewest.length < mat.length ? 'unlock' : 'click')
    setNote(
      fewest.length < mat.length
        ? `แลกแล้ว! จาก ${mat.length} ชิ้น เหลือ ${fewest.length} ชิ้น เงินรวมเท่าเดิม ${formatBS(total)}`
        : `ตอนนี้น้อยชิ้นที่สุดแล้ว (${mat.length} ชิ้น)`,
    )
    setMat(fewest)
  }

  return (
    <div className="mh-level theme-bank">
      {player && <TopBar compact />}
      <div className="mh-page">
        <div className="mh-page-head">
          <Link to={player ? '/map' : '/start'} className="mh-icon-btn" aria-label="กลับ">
            <ArrowLeft size={24} />
          </Link>
          <h1 className="mh-title mh-level-title">🧮 โต๊ะนับเงิน</h1>
        </div>

        <div className="mh-card mh-sandbox-total" data-testid="mh-sandbox-total">
          <CharacterArt id="rabbit" size={70} mood={total > 0 ? 'happy' : 'normal'} />
          <div>
            <div className="mh-sandbox-big">{formatBS(total)}</div>
            <div className="mh-sandbox-dot">
              เขียนแบบใช้จุด: <b>{formatDot(total)}</b> · {mat.length} ชิ้น
            </div>
            <p className="mh-soft mh-sandbox-note" aria-live="polite">
              {note}
            </p>
          </div>
        </div>

        <div className="mh-sandbox-mat" aria-label="เงินบนโต๊ะ แตะเพื่อเก็บคืน" data-testid="mh-sandbox-mat">
          {mat.length === 0 && <span className="mh-sandbox-empty">โต๊ะว่างอยู่ 🪙</span>}
          {sortDenomsDesc(mat).map((id, k) => {
            // แตะชิ้นไหนก็เก็บชิ้นชนิดเดียวกันคืนหนึ่งชิ้น
            const index = mat.indexOf(id)
            return (
              <button key={`${id}-${k}`} type="button" className="mh-sandbox-piece" onClick={() => remove(index)} aria-label={`เก็บ${denom(id).name}คืน`}>
                <MoneyPiece id={id} base={46} />
              </button>
            )
          })}
        </div>

        {groups.length > 0 && (
          <div className="mh-card mh-sandbox-groups">
            <b>แยกนับตามชนิด</b>
            <ul>
              {groups.map((g) => (
                <li key={g.id}>
                  <span>{g.label}</span>
                  <b>{formatBS(g.subtotal)}</b>
                </li>
              ))}
              <li className="is-total">
                <span>รวมทั้งหมด</span>
                <b>{formatBS(total)}</b>
              </li>
            </ul>
          </div>
        )}

        <div className="mh-row-buttons">
          <button type="button" className="mh-btn mh-btn-soft" onClick={() => setMat([])} disabled={mat.length === 0}>
            🧹 ล้างโต๊ะ
          </button>
          <button type="button" className="mh-btn mh-btn-soft" onClick={() => speak(`รวม ${formatBS(total)}`)} disabled={mat.length === 0}>
            🔈 อ่านยอดรวม
          </button>
          <button type="button" className="mh-btn mh-btn-gold" onClick={tidy} disabled={mat.length === 0} data-testid="mh-sandbox-tidy">
            🔄 แลกให้น้อยชิ้นที่สุด
          </button>
        </div>

        <div className="mh-card mh-sandbox-drawer" aria-label="ลิ้นชักเงิน">
          {ALL_DENOM_IDS.map((id) => (
            <button key={id} type="button" className="mh-sandbox-pick" onClick={() => add(id)} data-testid={`mh-sandbox-add-${id}`}>
              <MoneyPiece id={id} base={44} />
              <span>{denom(id).name.replace('เหรียญ ', '').replace('ธนบัตร ', '')}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
