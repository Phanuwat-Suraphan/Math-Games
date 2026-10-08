import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Printer } from 'lucide-react'
import { cartItems, cartTotal, cheapestPlan, PLAN_EVENTS, priciestPlan, type PlanEvent } from '../engine/budget'
import { formatBS } from '../utils/money'
import { CharacterArt } from '../components/Art'
import '../kad/kad.css'
import './planPrint.css'

/**
 * ใบงาน "วางแผนใช้เงิน" สำหรับพิมพ์ A4 (หนึ่งงานต่อหนึ่งแผ่น) และเฉลยสำหรับครู
 * ใช้ขนาดกระดาษและการพิมพ์แบบเดียวกับชุดสื่อกาดรักษ์โลก
 * เส้นทาง #/plan/print
 */

function Worksheet({ event }: { event: PlanEvent }) {
  const rows = Object.values(event.needs).reduce((a, b) => a + b, 0) + 1
  return (
    <section className="kad-sheet kad-portrait pp-sheet" data-testid={`pp-sheet-${event.id}`}>
      <div className="kad-sheet-in">
        <header className="kad-head pp-head">
          <span className="kad-logo pp-logo">🎉 วางแผนใช้เงิน ป.3 · MONEY HERO</span>
          <h2>
            {event.icon} {event.title}
          </h2>
          <p>ชื่อ ...................................................... ชั้น ............ เลขที่ ............</p>
        </header>

        <div className="pp-story">
          <CharacterArt id={event.npc} size={88} />
          <div className="pp-story-text">{event.story}</div>
          <div className="pp-budget">
            <small>งบ</small>
            <b>{formatBS(event.budget)}</b>
          </div>
        </div>

        <div className="pp-needs">
          <b>ต้องซื้อ:</b>
          {Object.entries(event.needs).map(([cat, n]) => (
            <span key={cat} className="pp-need">
              ☐ {event.catNames[cat]} {n} อย่าง
            </span>
          ))}
        </div>

        <div className="pp-shelf">
          {event.items.map((i) => (
            <div key={i.id} className="pp-item">
              <span className="pp-item-icon">{i.icon}</span>
              <span className="pp-item-name">{i.name}</span>
              <span className="pp-item-cat">{event.catNames[i.cat]}</span>
              <span className="pp-price">{formatBS(i.price)}</span>
            </div>
          ))}
        </div>

        <table className="pp-table">
          <thead>
            <tr>
              <th>ของที่เลือก</th>
              <th>หมวด</th>
              <th>ราคา</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }, (_, i) => (
              <tr key={i}>
                <td />
                <td />
                <td className="pp-money">{event.satang ? '...... บาท ...... สต.' : '...... บาท'}</td>
              </tr>
            ))}
            <tr className="pp-total">
              <td colSpan={2}>รวมทั้งหมด</td>
              <td className="pp-money">{event.satang ? '...... บาท ...... สต.' : '...... บาท'}</td>
            </tr>
          </tbody>
        </table>

        <div className="pp-calc">
          <span>
            งบ <b>{formatBS(event.budget)}</b> − รวม ............... = เหลือ ............... {event.satang && '(บาทกับบาท สตางค์กับสตางค์)'}
          </span>
          <span>☐ ไม่เกินงบ &nbsp; ☐ เกินงบ ต้องเปลี่ยนของ</span>
        </div>

        <div className="pp-challenge">
          <b>⭐ ท้าทาย:</b> ถ้าเลือกของที่แพงที่สุดในทุกหมวด จะใช้เงินกี่บาท เกินงบหรือไม่ เกินกี่บาท?
          <span className="kad-write" />
        </div>
      </div>
    </section>
  )
}

function AnswerKey() {
  return (
    <section className="kad-sheet kad-portrait pp-sheet pp-key" data-testid="pp-key">
      <div className="kad-sheet-in">
        <header className="kad-head pp-head">
          <span className="kad-logo pp-logo">🎉 วางแผนใช้เงิน ป.3 · สำหรับครู</span>
          <h2>🔑 แนวเฉลย</h2>
          <p>คำตอบของนักเรียนต่างกันได้ ขอให้ครบรายการ ไม่เกินงบ และคิดยอดรวม/เงินเหลือถูก</p>
        </header>
        {PLAN_EVENTS.map((e) => {
          const cheap = cheapestPlan(e)
          const cheapTotal = cartTotal(e, cheap)
          const rich = priciestPlan(e)
          const richTotal = cartTotal(e, rich)
          return (
            <div key={e.id} className="pp-key-row">
              <h3>
                {e.icon} {e.title} · งบ {formatBS(e.budget)}
              </h3>
              <p>
                <b>ตัวอย่างแผนที่ถูกที่สุด:</b> {cartItems(e, cheap).map((i) => `${i.name} ${formatBS(i.price)}`).join(' + ')}
              </p>
              <p>
                รวม <b>{formatBS(cheapTotal)}</b> · เหลือ <b>{formatBS(e.budget - cheapTotal)}</b>
              </p>
              <p>
                <b>ท้าทาย:</b> แพงที่สุด {cartItems(e, rich).map((i) => i.name).join(', ')} รวม <b>{formatBS(richTotal)}</b> → เกินงบ <b>{formatBS(richTotal - e.budget)}</b>
              </p>
            </div>
          )
        })}
      </div>
    </section>
  )
}

export function PlanPrintPage() {
  const [key, setKey] = useState(false)
  return (
    <div className="kad-page" data-testid="pp-page">
      <div className="kad-noprint">
        <div className="mh-page-head">
          <Link to="/teacher" className="mh-icon-btn" aria-label="กลับแผงคุณครู">
            <ArrowLeft size={24} />
          </Link>
          <h1 className="mh-title">🎉 ใบงานวางแผนใช้เงิน</h1>
          <button type="button" className="mh-btn mh-btn-gold" onClick={() => window.print()} data-testid="pp-print">
            <Printer size={20} /> พิมพ์
          </button>
        </div>
        <p className="kad-intro">
          ใบงานคู่กับมินิเกม "วางแผนใช้เงิน" ในเกม: งานละหนึ่งแผ่น A4 นักเรียนเลือกของจากชั้นวางให้ครบ เขียนลงตาราง คิดยอดรวม เช็กว่าไม่เกินงบ แล้วคิดเงินที่เหลือ
        </p>
        <label className="pp-toggle">
          <input type="checkbox" checked={key} onChange={(e) => setKey(e.target.checked)} data-testid="pp-key-toggle" /> พิมพ์แนวเฉลยสำหรับครูด้วย
        </label>
      </div>
      <div className="kad-sheets">
        {PLAN_EVENTS.map((e) => (
          <Worksheet key={e.id} event={e} />
        ))}
        {key && <AnswerKey />}
      </div>
    </div>
  )
}
