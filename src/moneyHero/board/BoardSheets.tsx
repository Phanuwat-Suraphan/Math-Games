import type { ReactNode } from 'react'
import { CharacterSvg, type CharacterKind } from '../components/CharacterSvg'
import { formatBS, formatDot } from '../utils/money'
import { SKILL_NAMES } from '../data/characters'
import { BoardArt } from './BoardArt'
import {
  BOARD_SHOPS,
  LUCK_CARDS,
  QUEST_KIND_INFO,
  SCORE_RULES,
  SHOPPING_LISTS,
  SPACE_INFO,
  START_MONEY,
  boardItem,
  buildQuestCards,
  listTotal,
  pieceName,
  startTotal,
  type BoardShop,
} from './boardData'

/**
 * แผ่นพิมพ์ของเกมกระดาน "ตะลุยเมืองเงิน ป.3" (A4 ทุกแผ่น)
 * ใช้แผ่นกระดาษชุดเดียวกับกาดรักษ์โลก (kad.css): ตัวอักษรเป็น cqw ของความกว้างแผ่น พิมพ์แล้วเต็ม A4 พอดี
 */

function Sheet({ land = false, title, sub, children, className = '' }: { land?: boolean; title?: string; sub?: string; children: ReactNode; className?: string }) {
  return (
    <section className={`kad-sheet ${land ? 'kad-landscape' : 'kad-portrait'} bd-sheet ${className}`}>
      <div className="kad-sheet-in">
        {title && (
          <header className="kad-head bd-head">
            <span className="kad-logo bd-logo">🎲 เกมกระดาน ตะลุยเมืองเงิน ป.3</span>
            <h2>{title}</h2>
            {sub && <p>{sub}</p>}
          </header>
        )}
        {children}
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* ชุดที่ 1 กติกา                                                        */
/* ------------------------------------------------------------------ */

export function RuleSheets() {
  const kinds = ['home', 'quest', 'luck', 'shop', 'save', 'exchange', 'bus', 'work', 'bank'] as const
  return (
    <>
      <Sheet title="กติกาการเล่น" sub="ผู้เล่น 2–4 คน + นายธนาคาร 1 คน (คุณครูหรือนักเรียน) · ใช้เวลา 30–40 นาที">
        <div className="bd-rules">
          <section>
            <h3>🎯 เป้าหมาย</h3>
            <p>ซื้อของตาม <b>บัตรรายการซื้อของ</b> ให้ครบ ใช้เงินอย่างคุ้มค่า จดรายรับรายจ่ายให้ถูก แล้วไปให้ถึงธนาคาร คนที่ได้ดาวมากที่สุดชนะ</p>
          </section>
          <section>
            <h3>🧰 เตรียมก่อนเล่น</h3>
            <ol>
              <li>วางกระดาน การ์ดภารกิจ ⭐ และการ์ดโชคดี 🎁 คว่ำไว้ข้างกระดาน วางป้ายราคาร้านทั้ง 6 ร้านให้ทุกคนเห็น</li>
              <li>
                ผู้เล่นแต่ละคนรับเงินตั้งต้น <b>{formatBS(startTotal())}</b> ({START_MONEY.map(([v, n]) => `${pieceName(v).name} ${n} ${pieceName(v).unit}`).join(' · ')})
              </li>
              <li>จั่วบัตรรายการซื้อของคนละ 1 ใบ แล้ว <b>คิดก่อนว่าต้องใช้เงินรวมเท่าไร</b> เขียนลงบัตร</li>
              <li>รับสมุดรายรับรายจ่ายคนละ 1 แผ่น เขียนเงินตั้งต้นในบรรทัดแรก วางหมากที่ช่องบ้าน 🏠</li>
            </ol>
          </section>
          <section>
            <h3>🎲 เล่นทีละตา</h3>
            <ol>
              <li>ทอยลูกเต๋า เดินตามลูกศรเท่าจำนวนแต้ม</li>
              <li>ทำตามช่องที่หยุด (ดูตารางด้านล่าง)</li>
              <li>
                ซื้อของ: จ่ายเงินให้นายธนาคาร <b>บอกเงินทอนเองก่อน</b> นายธนาคารตรวจแล้วทอนให้
              </li>
              <li>
                เงินเข้าหรือออกทุกครั้ง <b>จดลงสมุดรายรับรายจ่าย</b> และเขียนยอดคงเหลือ
              </li>
            </ol>
          </section>
          <section>
            <h3>🗺️ ช่องบนกระดาน</h3>
            <table className="kad-form bd-legend">
              <tbody>
                {kinds.map((k) => (
                  <tr key={k}>
                    <td className="bd-legend-icon">{SPACE_INFO[k].icon}</td>
                    <td>
                      <b>{k === 'shop' ? 'ร้านค้า 6 ร้าน' : SPACE_INFO[k].name}</b>
                    </td>
                    <td>{SPACE_INFO[k].rule}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
          <section>
            <h3>🏁 จบเกมและนับดาว</h3>
            <p>เกมจบเมื่อมีคนซื้อของครบและถึงธนาคาร (คนอื่นเล่นต่อให้ครบรอบนั้น) หรือเมื่อหมดเวลาที่คุณครูกำหนด แล้วนับดาวในใบสรุปคะแนน</p>
            <ul className="bd-score-list">
              {SCORE_RULES.map((r) => (
                <li key={r.icon}>
                  {r.icon} {r.text}
                </li>
              ))}
            </ul>
          </section>
        </div>
      </Sheet>
      <Sheet title="คู่มือครู" sub="ใช้ในขั้น E (Engage & Experience) ของรูปแบบ REAL Model หลังเรียนเรื่องเงินครบแล้ว">
        <div className="bd-rules">
          <section>
            <h3>📚 นักเรียนได้ฝึกอะไร</h3>
            <table className="kad-form">
              <thead>
                <tr>
                  <th style={{ width: '32%' }}>ทักษะ</th>
                  <th>ฝึกจากส่วนไหนของเกม</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>{SKILL_NAMES.count} · {SKILL_NAMES.notes}</td>
                  <td>จ่ายเงินซื้อของ นับเงินในมือ การ์ดภารกิจนับเงิน</td>
                </tr>
                <tr>
                  <td>{SKILL_NAMES.exchange}</td>
                  <td>ช่องแลกเงิน การ์ดแลกเงิน แลกเงินย่อยไว้จ่าย</td>
                </tr>
                <tr>
                  <td>{SKILL_NAMES.addsub} · {SKILL_NAMES.word}</td>
                  <td>รวมราคาในบัตรรายการ บอกเงินทอนทุกครั้งที่ซื้อ</td>
                </tr>
                <tr>
                  <td>{SKILL_NAMES.muldiv}</td>
                  <td>ซื้อของหลายชิ้นราคาเท่ากัน การ์ดภารกิจคูณ หาร</td>
                </tr>
                <tr>
                  <td>{SKILL_NAMES.dot} · {SKILL_NAMES.compare}</td>
                  <td>ป้ายราคาแบบใช้จุด การ์ดเขียน/เปรียบเทียบจำนวนเงิน</td>
                </tr>
                <tr>
                  <td>{SKILL_NAMES.ledger}</td>
                  <td>สมุดรายรับรายจ่ายตลอดเกม ช่องออมสิน วางแผนใช้เงินให้พอ</td>
                </tr>
              </tbody>
            </table>
          </section>
          <section>
            <h3>👩‍🏫 ขั้นตอนในชั่วโมงเรียน</h3>
            <ol>
              <li>แบ่งกลุ่มละ 3–5 คน เลือกนายธนาคาร 1 คน (ถือเงินกลาง การ์ด และแผ่นเฉลย)</li>
              <li>อธิบายกติกาและสาธิต 1 ตา (5 นาที)</li>
              <li>เล่นเกม 25–30 นาที ครูเดินสังเกตการนับเงิน การทอน และการจดบัญชี</li>
              <li>นับดาวลงใบสรุปคะแนน และให้นักเรียนเขียนสิ่งที่ได้เรียนรู้ (5 นาที)</li>
              <li>สรุปร่วมกัน: ซื้อของอย่างไรให้เงินพอ ทำไมต้องจดรายรับรายจ่าย</li>
            </ol>
          </section>
          <section>
            <h3>💡 ข้อแนะนำ</h3>
            <ul>
              <li>ใช้เงินจำลองชุดเดียวกับกาดรักษ์โลก (เหรียญ 50 สตางค์ – ธนบัตร 100 บาท) กลุ่มละ 1 ชุด</li>
              <li>พิมพ์กระดานสองแผ่น ตัดขอบตามเส้นประ แล้วต่อกันได้ขนาด A3 หรือพิมพ์แผ่นเดียวขนาด A4 ก็ได้</li>
              <li>ติดการ์ดและป้ายราคาบนกระดาษแข็งจะใช้ได้หลายรอบ</li>
              <li>นักเรียนที่ยังไม่คล่อง ให้เพื่อนในกลุ่มช่วยนับ หรือให้ดูแผ่นราคาแบบเขียนเต็ม</li>
              <li>เก็บสมุดรายรับรายจ่ายและใบสรุปคะแนนไว้เป็นหลักฐานการเรียนรู้</li>
            </ul>
          </section>
          <section>
            <h3>🛒 เฉลยยอดเงินในบัตรรายการซื้อของ</h3>
            <table className="kad-form">
              <tbody>
                {SHOPPING_LISTS.map((l) => (
                  <tr key={l.no}>
                    <td style={{ width: '8%' }}>{l.no}</td>
                    <td>
                      {l.emoji} {l.title}
                    </td>
                    <td style={{ width: '30%' }}>
                      <b>{formatBS(listTotal(l))}</b>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </div>
      </Sheet>
    </>
  )
}

/* ------------------------------------------------------------------ */
/* ชุดที่ 2 กระดาน                                                       */
/* ------------------------------------------------------------------ */

export function BoardSheets({ size }: { size: 'a3' | 'a4' }) {
  if (size === 'a4') {
    return (
      <section className="kad-sheet kad-landscape bd-sheet bd-board-sheet">
        <div className="bd-board-in">
          <BoardArt part="full" />
        </div>
      </section>
    )
  }
  return (
    <>
      {(['left', 'right'] as const).map((part) => (
        <section key={part} className="kad-sheet kad-portrait bd-sheet bd-board-sheet">
          <div className="bd-board-in">
            <BoardArt part={part} />
          </div>
        </section>
      ))}
    </>
  )
}

/* ------------------------------------------------------------------ */
/* ชุดที่ 3 ป้ายราคาร้าน                                                  */
/* ------------------------------------------------------------------ */

function ShopCard({ shop }: { shop: BoardShop }) {
  return (
    <div className="bd-shop" style={{ borderColor: shop.color, background: shop.light }}>
      <div className="bd-shop-head" style={{ background: shop.color }}>
        <span>{shop.icon}</span> {shop.name}
      </div>
      <div className="bd-shop-items">
        {shop.items.map((it) => (
          <div key={it.id} className="bd-shop-item">
            <span className="bd-shop-emoji">{it.emoji}</span>
            <span className="bd-shop-name">
              {it.name}
              <small>ราคา{it.unit}ละ</small>
            </span>
            <span className="bd-shop-price">
              <b>{formatBS(it.price)}</b>
              <small>({formatDot(it.price)})</small>
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function PriceSheets() {
  return (
    <>
      {[BOARD_SHOPS.slice(0, 3), BOARD_SHOPS.slice(3)].map((shops, i) => (
        <Sheet key={i} title={`ป้ายราคาร้านค้า ${i + 1}/2`} sub="วางไว้กลางโต๊ะให้ทุกคนเห็น ร้านละ 4 อย่าง (ราคาเขียนทั้งแบบบาท–สตางค์ และแบบใช้จุด)">
          <div className="bd-shops">
            {shops.map((s) => (
              <ShopCard key={s.id} shop={s} />
            ))}
          </div>
        </Sheet>
      ))}
    </>
  )
}

/* ------------------------------------------------------------------ */
/* ชุดที่ 4 บัตรรายการซื้อของ                                             */
/* ------------------------------------------------------------------ */

export function ListSheets() {
  return (
    <Sheet title="บัตรรายการซื้อของ" sub="ตัดตามเส้นประ ผู้เล่นจั่วคนละ 1 ใบ แล้วรวมราคาก่อนออกเดินทาง">
      <div className="kad-grid kad-grid-2 kad-cut bd-cards">
        {SHOPPING_LISTS.map((l) => (
          <div key={l.no} className="bd-card bd-list">
            <div className="bd-card-top">
              <span>🛒 บัตรรายการที่ {l.no}</span>
            </div>
            <b className="bd-list-title">
              {l.emoji} {l.title}
            </b>
            <ul>
              {l.lines.map((line) => {
                const { item, shop } = boardItem(line.item)
                return (
                  <li key={line.item}>
                    <span>{item.emoji}</span> {item.name} {line.qty} {item.unit}
                    <small>
                      {' '}
                      ({shop.icon} {shop.short})
                    </small>
                  </li>
                )
              })}
            </ul>
            <p className="bd-list-sum">รวมต้องใช้เงิน ................. บาท</p>
          </div>
        ))}
      </div>
    </Sheet>
  )
}

/* ------------------------------------------------------------------ */
/* ชุดที่ 5 การ์ดภารกิจคณิต + เฉลย                                         */
/* ------------------------------------------------------------------ */

export function QuestSheets() {
  const cards = buildQuestCards()
  const pages = [0, 1, 2, 3].map((p) => cards.slice(p * 8, p * 8 + 8))
  return (
    <>
      {pages.map((page, p) => (
        <Sheet key={p} title={`การ์ดภารกิจคณิต ${p + 1}/4`} sub="ตัดตามเส้นประ วางคว่ำ · เฉลยกลับหัวอยู่ใต้การ์ด (พับหรือปิดไว้ได้) และมีแผ่นเฉลยสำหรับนายธนาคาร">
          <div className="kad-grid kad-grid-2 kad-cut bd-cards">
            {page.map((c) => (
              <div key={c.no} className="bd-card bd-quest">
                <div className="bd-card-top">
                  <span>⭐ ภารกิจที่ {c.no}</span>
                  <span className="bd-tag">{QUEST_KIND_INFO[c.kind].name}</span>
                </div>
                <p className="bd-quest-text">{c.text}</p>
                <div className="bd-reward">ตอบถูก รับ {formatBS(c.reward)}</div>
                <div className="bd-answer-flip">เฉลย: {c.answer}</div>
              </div>
            ))}
          </div>
        </Sheet>
      ))}
      <Sheet title="เฉลยการ์ดภารกิจ (สำหรับนายธนาคาร)" sub="ตอบถูกจ่ายรางวัลตามการ์ด · ตอบผิดให้ดูเฉลยแล้วคิดใหม่ด้วยกัน ไม่ได้เงิน">
        <table className="kad-form bd-key">
          <thead>
            <tr>
              <th style={{ width: '8%' }}>ที่</th>
              <th style={{ width: '22%' }}>ชนิด</th>
              <th>คำตอบ</th>
              <th style={{ width: '14%' }}>รางวัล</th>
            </tr>
          </thead>
          <tbody>
            {cards.map((c) => (
              <tr key={c.no}>
                <td>{c.no}</td>
                <td>{QUEST_KIND_INFO[c.kind].name}</td>
                <td>
                  <b>{c.answer}</b>
                </td>
                <td>{formatBS(c.reward)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Sheet>
    </>
  )
}

/* ------------------------------------------------------------------ */
/* ชุดที่ 6 การ์ดโชคดี                                                   */
/* ------------------------------------------------------------------ */

export function LuckSheets() {
  const pages = [LUCK_CARDS.slice(0, 8), LUCK_CARDS.slice(8)]
  return (
    <>
      {pages.map((page, p) => (
        <Sheet key={p} title={`การ์ดโชคดี ${p + 1}/2`} sub="ตัดตามเส้นประ วางคว่ำ จั่วเมื่อหยุดที่ช่องโชคดี 🎁 แล้วจดเงินที่ได้หรือจ่ายลงสมุดบัญชี">
          <div className="kad-grid kad-grid-2 kad-cut bd-cards">
            {page.map((c) => (
              <div key={c.no} className="bd-card bd-luck">
                <div className="bd-card-top">
                  <span>🎁 โชคดี {c.no}</span>
                  {c.money !== 0 && <span className={`bd-tag ${c.money > 0 ? 'is-in' : 'is-out'}`}>{c.money > 0 ? `+${formatBS(c.money)}` : `−${formatBS(-c.money)}`}</span>}
                </div>
                <span className="bd-luck-icon">{c.icon}</span>
                <p className="bd-luck-text">{c.text}</p>
                {c.star > 0 && <span className="bd-star">🌟 ได้ดาว {c.star} ดวง</span>}
              </div>
            ))}
          </div>
        </Sheet>
      ))}
    </>
  )
}

/* ------------------------------------------------------------------ */
/* ชุดที่ 7 สมุดรายรับรายจ่าย และใบสรุปคะแนน                               */
/* ------------------------------------------------------------------ */

export function LedgerSheets() {
  return (
    <>
      <Sheet title="สมุดรายรับรายจ่าย" sub="ทุกครั้งที่ได้เงินหรือจ่ายเงิน เขียน 1 บรรทัด แล้วคิดเงินคงเหลือ">
        <p className="bd-fill">
          ชื่อ ........................................ เลขที่ ........ บัตรรายการที่ ........ ต้องใช้เงิน ................ บาท
        </p>
        <table className="kad-form bd-ledger">
          <thead>
            <tr>
              <th style={{ width: '9%' }}>ครั้งที่</th>
              <th>รายการ</th>
              <th style={{ width: '17%' }}>รายรับ (บาท)</th>
              <th style={{ width: '17%' }}>รายจ่าย (บาท)</th>
              <th style={{ width: '18%' }}>คงเหลือ (บาท)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>1</td>
              <td>เงินตั้งต้น</td>
              <td>{startTotal() / 100}</td>
              <td>–</td>
              <td>{startTotal() / 100}</td>
            </tr>
            {Array.from({ length: 19 }, (_, i) => (
              <tr key={i}>
                <td>{i + 2}</td>
                <td />
                <td />
                <td />
                <td />
              </tr>
            ))}
          </tbody>
        </table>
        <div className="bd-check">
          <p>นับเงินในมือได้ .............. บาท เงินออม .............. บาท</p>
          <p>ยอดคงเหลือในสมุดตรงกับเงินในมือหรือไม่ ☐ ตรง ☐ ไม่ตรง (ต่างกัน .............. บาท)</p>
        </div>
      </Sheet>
      <Sheet title="ใบสรุปคะแนนกลุ่ม" sub="นับดาวเมื่อจบเกม แล้วช่วยกันตรวจ">
        <p className="bd-fill">กลุ่มที่ ........ นายธนาคาร ............................................ วันที่ ................................</p>
        <table className="kad-form bd-score">
          <thead>
            <tr>
              <th style={{ width: '22%' }}>ชื่อผู้เล่น</th>
              {SCORE_RULES.map((r) => (
                <th key={r.icon}>
                  {r.icon}
                  <small>{r.text}</small>
                </th>
              ))}
              <th style={{ width: '10%' }}>รวมดาว</th>
            </tr>
          </thead>
          <tbody>
            {[1, 2, 3, 4].map((n) => (
              <tr key={n}>
                <td>{n}.</td>
                {SCORE_RULES.map((r) => (
                  <td key={r.icon} />
                ))}
                <td />
              </tr>
            ))}
          </tbody>
        </table>
        <div className="bd-reflect">
          <h3>✍️ สิ่งที่ฉันได้เรียนรู้จากการเล่น</h3>
          {[1, 2, 3, 4].map((n) => (
            <p key={n}>
              {n}. ....................................................................................................................
            </p>
          ))}
          <h3>🤔 ครั้งหน้าฉันจะใช้เงินให้ดีขึ้นโดย</h3>
          <p>....................................................................................................................</p>
          <p>....................................................................................................................</p>
        </div>
      </Sheet>
    </>
  )
}

/* ------------------------------------------------------------------ */
/* ชุดที่ 8 หมากเดินและลูกเต๋า                                            */
/* ------------------------------------------------------------------ */

const PAWNS: CharacterKind[] = ['hero', 'rabbit', 'fox', 'bear']
const PIPS: Record<number, [number, number][]> = {
  1: [[50, 50]],
  2: [[28, 28], [72, 72]],
  3: [[25, 25], [50, 50], [75, 75]],
  4: [[28, 28], [72, 28], [28, 72], [72, 72]],
  5: [[26, 26], [74, 26], [50, 50], [26, 74], [74, 74]],
  6: [[28, 24], [72, 24], [28, 50], [72, 50], [28, 76], [72, 76]],
}

function DieNet() {
  // รูปคลี่ลูกบาศก์แบบกากบาท (ด้านตรงข้ามรวมกันได้ 7)
  const faces: [number, number, number][] = [
    [1, 1, 0],
    [2, 0, 1],
    [3, 1, 1],
    [5, 2, 1],
    [4, 3, 1],
    [6, 1, 2],
  ]
  return (
    <svg viewBox="-4 -4 408 308" className="bd-die" role="img" aria-label="รูปคลี่ลูกเต๋า">
      {faces.map(([n, cx, cy]) => (
        <g key={n} transform={`translate(${cx * 100} ${cy * 100})`}>
          <rect width={100} height={100} fill="#fff" stroke="#212529" strokeWidth={2} />
          {PIPS[n].map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r={9} fill={n === 1 ? '#e03131' : '#212529'} />
          ))}
        </g>
      ))}
    </svg>
  )
}

export function PieceSheets() {
  return (
    <Sheet title="หมากเดินและลูกเต๋า" sub="หมาก: ตัดรอบนอก พับตามเส้นกลาง ตั้งเป็นรูปจั่ว · ลูกเต๋า: ตัดรอบนอก พับตามเส้นเป็นกล่อง แล้วใช้เทปใสติดขอบ (มีลูกเต๋าจริงใช้แทนได้)">
      <div className="bd-pawns kad-cut">
        {PAWNS.map((k) => (
          <div key={k} className="bd-pawn">
            <div className="bd-pawn-face bd-pawn-flip">
              <CharacterSvg kind={k} mood="happy" />
            </div>
            <div className="bd-pawn-face">
              <CharacterSvg kind={k} mood="happy" />
            </div>
          </div>
        ))}
      </div>
      <div className="bd-dice">
        <DieNet />
        <DieNet />
      </div>
    </Sheet>
  )
}
