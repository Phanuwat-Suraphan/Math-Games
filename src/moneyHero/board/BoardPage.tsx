import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Printer } from 'lucide-react'
import { useGame } from '../hooks/useMoneyGame'
import { MoneySheets } from '../kad/KadSheets'
import { BoardSheets, LedgerSheets, ListSheets, LuckSheets, PieceSheets, PriceSheets, QuestSheets, RuleSheets } from './BoardSheets'
import '../kad/kad.css'
import './board.css'

/**
 * เกมกระดาน "ตะลุยเมืองเงิน ป.3" ฉบับพิมพ์เล่นจริง (#/board)
 * เลือกชุด → ดูตัวอย่างบนจอ → กดพิมพ์ (กระดาษ A4)
 */

interface BoardSet {
  id: string
  icon: string
  name: string
  desc: string
  sheets: (size: 'a3' | 'a4') => number
  render: (size: 'a3' | 'a4') => JSX.Element
}

const SETS: BoardSet[] = [
  { id: 'rules', icon: '📜', name: 'กติกาและคู่มือครู', desc: 'วิธีเล่นทีละตา ช่องบนกระดาน การนับดาว และคู่มือครู (ทักษะที่ฝึก ขั้นตอนในชั่วโมง เฉลยยอดบัตรรายการ)', sheets: () => 2, render: () => <RuleSheets /> },
  { id: 'board', icon: '🗺️', name: 'กระดาน', desc: 'ถนน 40 ช่องจากบ้านไปธนาคาร · แบบ 2 แผ่นต่อกันได้ขนาด A3 หรือแบบแผ่นเดียว A4', sheets: (s) => (s === 'a3' ? 2 : 1), render: (s) => <BoardSheets size={s} /> },
  { id: 'prices', icon: '🏪', name: 'ป้ายราคาร้าน', desc: '6 ร้าน ร้านละ 4 อย่าง ราคาเขียนแบบบาท–สตางค์และแบบใช้จุด', sheets: () => 2, render: () => <PriceSheets /> },
  { id: 'lists', icon: '🛒', name: 'บัตรรายการซื้อของ', desc: '8 ใบ แต่ละใบต้องซื้อของ 3 อย่างจากหลายร้าน มีช่องให้รวมราคาก่อนเล่น', sheets: () => 1, render: () => <ListSheets /> },
  { id: 'quests', icon: '⭐', name: 'การ์ดภารกิจคณิต', desc: '32 ใบ: นับเงิน แลกเงิน เปรียบเทียบ เขียนจำนวนเงิน รวมเงิน เงินทอน คูณหาร รายรับรายจ่าย + แผ่นเฉลย', sheets: () => 5, render: () => <QuestSheets /> },
  { id: 'luck', icon: '🎁', name: 'การ์ดโชคดี', desc: '16 ใบ: ได้เงิน จ่ายเงิน ออม แบ่งปัน และเดินพิเศษ', sheets: () => 2, render: () => <LuckSheets /> },
  { id: 'ledger', icon: '📒', name: 'สมุดบัญชีและใบสรุป', desc: 'สมุดรายรับรายจ่าย (พิมพ์คนละแผ่น) และใบสรุปคะแนนกลุ่มพร้อมช่องเขียนสิ่งที่ได้เรียนรู้', sheets: () => 2, render: () => <LedgerSheets /> },
  { id: 'pieces', icon: '♟️', name: 'หมากเดินและลูกเต๋า', desc: 'หมาก 4 ตัวละครแบบพับตั้ง และรูปคลี่ลูกเต๋า 2 ลูก', sheets: () => 1, render: () => <PieceSheets /> },
  { id: 'money', icon: '💰', name: 'เงินจำลอง', desc: 'ชุดเดียวกับกาดรักษ์โลก: เหรียญ 50 สตางค์–10 บาท และธนบัตร 20 / 50 / 100 บาท (กลุ่มละ 1 ชุด)', sheets: () => 4, render: () => <MoneySheets /> },
]

const TAB_KEY = 'moneyHero.board.tab'

export function BoardPage() {
  const { player } = useGame()
  const [setId, setSetId] = useState(() => {
    try {
      return globalThis.localStorage?.getItem(TAB_KEY) ?? 'rules'
    } catch {
      return 'rules'
    }
  })
  const [size, setSize] = useState<'a3' | 'a4'>('a3')
  const current = SETS.find((s) => s.id === setId) ?? SETS[0]

  useEffect(() => {
    try {
      globalThis.localStorage?.setItem(TAB_KEY, current.id)
    } catch {
      /* ไม่เป็นไร */
    }
  }, [current.id])

  return (
    <div className="kad-page bd-page" data-testid="bd-page">
      <div className="kad-noprint">
        <div className="mh-page-head">
          <Link to={player ? '/map' : '/start'} className="mh-icon-btn" aria-label="กลับ">
            <ArrowLeft size={24} />
          </Link>
          <h1 className="mh-title">🎲 เกมกระดาน ตะลุยเมืองเงิน ป.3</h1>
          <button type="button" className="mh-btn mh-btn-gold" onClick={() => window.print()} data-testid="bd-print">
            <Printer size={20} /> พิมพ์ชุดนี้ (A4)
          </button>
        </div>
        <p className="kad-intro">
          <b>เกมเศรษฐีตัวน้อย ฉบับพิมพ์เล่นจริง</b> — ผู้เล่นเดินจากบ้านไปธนาคาร ซื้อของตามบัตรรายการให้ครบ ตอบภารกิจคณิตเพื่อรับเงิน ออมเงิน แลกเงิน และจดรายรับรายจ่ายทุกครั้ง
          พิมพ์ทุกชุดบนกระดาษ A4 (ตั้งค่า "พิมพ์ภาพพื้นหลัง" ให้สีออกครบ)
        </p>
        <div className="kad-tabs" role="tablist" aria-label="ชุดสื่อ">
          {SETS.map((s, i) => (
            <button
              key={s.id}
              type="button"
              role="tab"
              aria-selected={s.id === current.id}
              className={`kad-tab ${s.id === current.id ? 'is-on' : ''}`}
              onClick={() => setSetId(s.id)}
              data-testid={`bd-tab-${s.id}`}
            >
              <span className="kad-tab-icon">{s.icon}</span>
              <b>
                ชุดที่ {i + 1} {s.name}
              </b>
              <small>{s.sheets(size)} แผ่น</small>
            </button>
          ))}
        </div>
        <p className="kad-set-desc">
          {current.icon} <b>{current.name}</b> — {current.desc}
        </p>
        {current.id === 'board' && (
          <div className="mh-chips bd-size" role="radiogroup" aria-label="ขนาดกระดาน">
            <button type="button" role="radio" aria-checked={size === 'a3'} className={`mh-chip ${size === 'a3' ? 'is-on' : ''}`} onClick={() => setSize('a3')} data-testid="bd-size-a3">
              📐 2 แผ่นต่อกัน (ได้ขนาด A3)
            </button>
            <button type="button" role="radio" aria-checked={size === 'a4'} className={`mh-chip ${size === 'a4' ? 'is-on' : ''}`} onClick={() => setSize('a4')} data-testid="bd-size-a4">
              📄 แผ่นเดียว (A4 แนวนอน)
            </button>
          </div>
        )}
      </div>
      <div className="kad-sheets" data-testid="bd-sheets">
        {current.render(size)}
      </div>
    </div>
  )
}
