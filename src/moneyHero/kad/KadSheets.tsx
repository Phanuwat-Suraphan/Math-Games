import type { CSSProperties, ReactNode } from 'react'
import { CharacterSvg } from '../components/CharacterSvg'
import { formatBS } from '../utils/money'
import {
  CLASS_GOALS,
  CYCLE,
  ECO_MONEY,
  MISSIONS,
  PRODUCTS,
  PROFIT_USES,
  SHOPS,
  TRASH,
  priceRange,
  type EcoMoney,
  type Shop,
  type TrashPrices,
} from './kadData'
import { EcoCoin, EcoNote, MissionBadgeArt, ProductArt, TrashArt } from './KadArt'

/**
 * หน้ากระดาษ A4 ของชุดกาดรักษ์โลก แต่ละชุดคืนรายการแผ่น (<section class="kad-sheet">)
 * ขนาดตัวอักษรใช้หน่วย cqw (ร้อยละของความกว้างแผ่น) บนจอย่อตามจอ พิมพ์ออกมาเต็ม A4 พอดี
 */

/* ------------------------------------------------------------------ */
/* ชิ้นส่วนที่ใช้ร่วมกัน                                                */
/* ------------------------------------------------------------------ */

function Sheet({ land = false, title, sub, children, className = '' }: { land?: boolean; title?: string; sub?: string; children: ReactNode; className?: string }) {
  // className 'kad-spread' = กระจายเนื้อหาให้เต็มความสูงแผ่น
  return (
    <section className={`kad-sheet ${land ? 'kad-landscape' : 'kad-portrait'} ${className}`}>
      <div className="kad-sheet-in">
        {title && (
          <header className="kad-head">
            <span className="kad-logo">♻ กาดรักษ์โลก ป.3</span>
            <h2>{title}</h2>
            {sub && <p>{sub}</p>}
          </header>
        )}
        {children}
      </div>
    </section>
  )
}

const FLAG_COLORS = ['#ff6b6b', '#ffd43b', '#69db7c', '#4dabf7', '#b197fc', '#ffa94d']

function Bunting({ n = 16 }: { n?: number }) {
  return (
    <svg className="kad-bunting" viewBox={`0 0 ${n * 10} 12`} preserveAspectRatio="none" aria-hidden="true">
      <path d={`M0 1 Q${n * 5} 5 ${n * 10} 1`} stroke="#8d6e63" strokeWidth="0.6" fill="none" />
      {Array.from({ length: n }, (_, i) => (
        <path key={i} d={`M${i * 10 + 1} ${1.6 + Math.sin((i / (n - 1)) * Math.PI) * 2} h8 l-4 8 z`} fill={FLAG_COLORS[i % FLAG_COLORS.length]} />
      ))}
    </svg>
  )
}

/** ช่องเขียนชื่อ วันที่ ฯลฯ */
function Blank({ label, w = 'm' }: { label: string; w?: 's' | 'm' | 'l' }) {
  return (
    <span className="kad-blank">
      {label} <i className={`kad-line kad-line-${w}`} />
    </span>
  )
}

function GroupLine() {
  return (
    <div className="kad-fill-row">
      <Blank label="ชื่อกลุ่ม/ร้าน" w="l" />
      <Blank label="วันที่" />
    </div>
  )
}

/** ตารางสำหรับเขียน มีหัวคอลัมน์และบรรทัดว่าง */
function FormTable({ cols, rows, widths, first, total, grow = false }: { cols: string[]; rows: number; widths?: string[]; first?: ReactNode[]; total?: string; grow?: boolean }) {
  const table = (
    <table className="kad-form">
      <colgroup>
        {cols.map((c, i) => (
          <col key={c} style={widths ? { width: widths[i] } : undefined} />
        ))}
      </colgroup>
      <thead>
        <tr>
          {cols.map((c) => (
            <th key={c}>{c}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {first && (
          <tr className="kad-form-example">
            {first.map((v, i) => (
              <td key={i}>{v}</td>
            ))}
          </tr>
        )}
        {Array.from({ length: rows }, (_, r) => (
          <tr key={r}>
            {cols.map((c) => (
              <td key={c} />
            ))}
          </tr>
        ))}
      </tbody>
      {total && (
        <tfoot>
          <tr>
            <th colSpan={cols.length - 1}>{total}</th>
            <td />
          </tr>
        </tfoot>
      )}
    </table>
  )
  // grow = ยืดตารางให้เต็มที่ว่างที่เหลือของแผ่น (บรรทัดสูงขึ้น เขียนง่าย)
  return grow ? <div className="kad-grow">{table}</div> : table
}

function Box({ label, unit = 'บาท' }: { label: string; unit?: string }) {
  return (
    <span className="kad-eq-box">
      <i />
      <small>
        {label} ({unit})
      </small>
    </span>
  )
}

/* ------------------------------------------------------------------ */
/* ชุดที่ 1 โปสเตอร์                                                    */
/* ------------------------------------------------------------------ */

export function BinArt({ color, label }: { color: string; label: string }) {
  return (
    <div className="kad-bin">
      <svg viewBox="0 0 60 70" aria-hidden="true">
        <rect x="6" y="8" width="48" height="8" rx="3" fill={color} stroke="#2b2350" strokeWidth="2" />
        <path d="M9 16 h42 l-4 50 h-34 z" fill={color} stroke="#2b2350" strokeWidth="2" strokeLinejoin="round" />
        <path d="M18 24 v34 M30 24 v34 M42 24 v34" stroke="#fff" strokeWidth="2" opacity="0.35" />
        <text x="30" y="47" fontSize="18" textAnchor="middle" fill="#fff" fontWeight="700">
          {'♻︎'}
        </text>
      </svg>
      <span style={{ background: color }}>{label}</span>
    </div>
  )
}

function Booth() {
  return (
    <svg viewBox="0 0 140 130" className="kad-booth" aria-hidden="true">
      <rect x="18" y="40" width="104" height="80" fill="#fff4e6" stroke="#2b2350" strokeWidth="2.5" />
      <path d="M8 44 L70 8 L132 44 Z" fill="#2f9e44" stroke="#2b2350" strokeWidth="2.5" strokeLinejoin="round" />
      {[0, 1, 2, 3, 4, 5, 6].map((i) => (
        <path key={i} d={`M${12 + i * 17} 44 q8.5 10 17 0`} fill={i % 2 ? '#fff' : '#69db7c'} stroke="#2b2350" strokeWidth="1.5" />
      ))}
      <rect x="32" y="18" width="76" height="20" rx="5" fill="#fff" stroke="#2b2350" strokeWidth="2" />
      <text x="70" y="33" fontSize="12" textAnchor="middle" fontWeight="800" fill="#2f9e44" fontFamily="Kanit, sans-serif">
        ธนาคารขยะ
      </text>
      <rect x="18" y="86" width="104" height="34" fill="#d9a066" stroke="#2b2350" strokeWidth="2.5" />
      <rect x="40" y="70" width="30" height="16" rx="3" fill="#ced4da" stroke="#2b2350" strokeWidth="2" />
      <path d="M44 70 v-6 h22 v6" stroke="#2b2350" strokeWidth="2" fill="#adb5bd" />
      <circle cx="96" cy="78" r="7" fill="#ffd43b" stroke="#b07d00" strokeWidth="1.5" />
      <circle cx="104" cy="82" r="6" fill="#ffd43b" stroke="#b07d00" strokeWidth="1.5" />
      <text x="70" y="108" fontSize="9" textAnchor="middle" fill="#fff" fontWeight="700" fontFamily="Kanit, sans-serif">
        รับซื้อ · คัดแยก · ชั่ง
      </text>
    </svg>
  )
}

function Stall({ shop }: { shop: Shop }) {
  return (
    <div className="kad-stall" style={{ '--kad-c': shop.color, '--kad-soft': shop.soft } as CSSProperties}>
      <svg viewBox="0 0 100 26" className="kad-awning" preserveAspectRatio="none" aria-hidden="true">
        {Array.from({ length: 6 }, (_, i) => (
          <path key={i} d={`M${i * 16.6} 0 h16.6 v18 q-8.3 8 -16.6 0 z`} fill={i % 2 ? '#fff' : shop.color} stroke="#2b2350" strokeWidth="0.8" />
        ))}
      </svg>
      <div className="kad-stall-name">
        {shop.icon} {shop.name}
      </div>
      <div className="kad-stall-goods">
        {shop.products.slice(0, 3).map((id) => {
          const p = PRODUCTS.find((x) => x.id === id)!
          return (
            <span key={id} className="kad-stall-item">
              <ProductArt id={id} />
              <b>{p.min} ฿</b>
            </span>
          )
        })}
      </div>
    </div>
  )
}

export function PosterSheets() {
  return (
    <>
      <Sheet land className="kad-poster">
        <Bunting n={18} />
        <h1 className="kad-poster-title">
          <span>♻</span> กาดรักษ์โลก <b>ป.3</b>
        </h1>
        <p className="kad-poster-sub">เปลี่ยนขยะให้เป็นเงิน · เปลี่ยนเงินให้เป็นไอเดีย</p>
        <svg className="kad-hills" viewBox="0 0 300 80" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0 60 Q40 20 90 46 T190 40 T300 50 V80 H0 Z" fill="#c3fae8" />
          <path d="M0 70 Q60 40 130 62 T300 58 V80 H0 Z" fill="#b2f2bb" />
          {[
            [30, 46],
            [62, 40],
            [218, 38],
            [262, 44],
          ].map(([x, y]) => (
            <g key={x}>
              <rect x={x - 1.4} y={y} width="2.8" height="9" fill="#8d6e63" />
              <ellipse cx={x} cy={y - 3} rx="7" ry="8" fill="#51cf66" stroke="#2b8a3e" strokeWidth="0.8" />
            </g>
          ))}
          {[
            [80, 14],
            [150, 8],
            [235, 16],
          ].map(([x, y]) => (
            <g key={`c${x}`} fill="#fff">
              <ellipse cx={x} cy={y} rx="12" ry="4.5" />
              <ellipse cx={x - 6} cy={y - 2} rx="6" ry="4.5" />
              <ellipse cx={x + 5} cy={y - 3} rx="7" ry="5" />
            </g>
          ))}
        </svg>
        <div className="kad-scene">
          <Booth />
          <div className="kad-sorting">
            <div className="kad-kid">
              <CharacterSvg kind="hero" mood="happy" />
            </div>
            <div className="kad-bins">
              <BinArt color="#1c7ed6" label="ขวด" />
              <BinArt color="#f59f00" label="กระป๋อง" />
              <BinArt color="#2f9e44" label="กระดาษ" />
            </div>
            <div className="kad-kid">
              <CharacterSvg kind="calculator" mood="happy" />
            </div>
          </div>
          <Stall shop={SHOPS[0]} />
        </div>
        <div className="kad-ground">
          {['bottle', 'can', 'box', 'cap'].map((id) => (
            <span key={id}>
              <TrashArt id={id} />
            </span>
          ))}
          {ECO_MONEY.filter((m) => m.kind === 'coin')
            .slice(1, 4)
            .map((m) => (
              <span key={m.value} className="kad-ground-coin">
                <EcoCoin money={m} />
              </span>
            ))}
          {['pot', 'piggy', 'pencil'].map((id) => (
            <span key={id}>
              <ProductArt id={id} />
            </span>
          ))}
        </div>
        <div className="kad-chips">
          {['♻️ สิ่งแวดล้อม', '💰 เงิน', '🧮 คณิตศาสตร์', '🎨 ความคิดสร้างสรรค์', '🤝 ทีม', '🌱 ลงมือทำจริง'].map((c) => (
            <span key={c}>{c}</span>
          ))}
        </div>
      </Sheet>

      <Sheet land title="วงจรกาดรักษ์โลก" sub="ทำครบหนึ่งรอบ แล้วนำกำไรไปลงทุนรอบใหม่">
        <div className="kad-cycle-wrap">
          <div className="kad-cycle">
            <svg viewBox="0 0 100 100" className="kad-cycle-ring" aria-hidden="true">
              <defs>
                <marker id="kad-arrow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="5" markerHeight="5" orient="auto">
                  <path d="M0 0 L10 5 L0 10 z" fill="#2f9e44" />
                </marker>
              </defs>
              {CYCLE.map((_, i) => {
                const a1 = ((-90 + i * 36 + 11) * Math.PI) / 180
                const a2 = ((-90 + (i + 1) * 36 - 11) * Math.PI) / 180
                const r = 39
                return (
                  <path
                    key={i}
                    d={`M${(50 + r * Math.cos(a1)).toFixed(2)} ${(50 + r * Math.sin(a1)).toFixed(2)} A${r} ${r} 0 0 1 ${(50 + r * Math.cos(a2)).toFixed(2)} ${(50 + r * Math.sin(a2)).toFixed(2)}`}
                    stroke="#2f9e44"
                    strokeWidth="1.2"
                    fill="none"
                    markerEnd="url(#kad-arrow)"
                  />
                )
              })}
            </svg>
            {CYCLE.map((c, i) => {
              const a = ((-90 + i * 36) * Math.PI) / 180
              return (
                <div key={i} className="kad-cycle-node" style={{ left: `${50 + 39 * Math.cos(a)}%`, top: `${50 + 39 * Math.sin(a)}%` }}>
                  <span className="kad-cycle-icon">{c.icon}</span>
                  <b>
                    {i + 1}. {c.label}
                  </b>
                </div>
              )
            })}
            <div className="kad-cycle-center">
              <b>ได้เรียนเรื่องเงินครบทั้งหน่วย</b>
              <span>หาเงิน → ซื้อ → ขาย → ทอน → ต้นทุน → กำไร → ออม → ลงทุน</span>
            </div>
          </div>
          <div className="kad-cycle-side">
            <h3>🏆 กำไรคืออะไร?</h3>
            <p className="kad-eq">
              รายได้ − ต้นทุน = <b>กำไร</b>
            </p>
            <div className="kad-example">
              <b>ตัวอย่าง กลุ่มกระถาง</b>
              <span>ขายขยะได้เงิน 40 บาท</span>
              <span>ซื้ออุปกรณ์ 20 บาท</span>
              <span>ทำกระถาง 3 ใบ ขายใบละ 15 บาท</span>
              <span>
                รายได้ = 3 × 15 = <b>45 บาท</b>
              </span>
              <span>
                กำไร = 45 − 20 = <b>25 บาท</b>
              </span>
            </div>
            <h3>นำกำไรไป…</h3>
            <div className="kad-uses">
              {PROFIT_USES.map((u) => (
                <span key={u.label}>
                  {u.icon} {u.label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </Sheet>
    </>
  )
}

/* ------------------------------------------------------------------ */
/* ชุดที่ 2 บัตรขยะ                                                     */
/* ------------------------------------------------------------------ */

export function TrashCardSheets({ prices }: { prices: TrashPrices }) {
  const cards = [...TRASH, ...TRASH]
  return (
    <Sheet title="บัตรขยะ" sub="ตัดตามเส้นประ ใช้แทนขยะจริงตอนฝึกขายให้ธนาคารขยะ (ชนิดละ 2 ใบ)">
      <div className="kad-grid kad-grid-3 kad-cut">
        {cards.map((t, i) => (
          <div key={`${t.id}-${i}`} className="kad-card kad-trash-card">
            <div className="kad-card-art">
              <TrashArt id={t.id} />
            </div>
            <b className="kad-card-name">{t.name}</b>
            <span className="kad-price-chip">
              รับซื้อ {formatBS(prices[t.id] ?? t.price)} / {t.unit}
            </span>
            <small>{t.hint}</small>
          </div>
        ))}
      </div>
    </Sheet>
  )
}

/* ------------------------------------------------------------------ */
/* ชุดที่ 3 เงินจำลอง                                                   */
/* ------------------------------------------------------------------ */

function NotePage({ money }: { money: EcoMoney }) {
  return (
    <Sheet title={`ธนบัตรจำลอง ${money.label}`} sub="เงินของกาดรักษ์โลก ใช้เล่นในห้องเรียนเท่านั้น (ตัดตามเส้นประ)">
      <div className="kad-grid kad-grid-2 kad-cut kad-notes">
        {Array.from({ length: 10 }, (_, i) => (
          <div key={i} className="kad-note-cell">
            <EcoNote money={money} />
          </div>
        ))}
      </div>
    </Sheet>
  )
}

export function MoneySheets() {
  const coins = ECO_MONEY.filter((m) => m.kind === 'coin')
  // แถวเหรียญ: ชนิดที่ใช้บ่อยพิมพ์มากกว่า
  const rows: EcoMoney[] = [coins[0], coins[1], coins[1], coins[2], coins[3], coins[3], coins[4], coins[4]]
  return (
    <>
      <Sheet title="เหรียญจำลอง" sub="50 สตางค์ · 1 บาท · 2 บาท · 5 บาท · 10 บาท (ตัดตามวงกลม ติดกระดาษแข็งจะทนขึ้น)">
        <div className="kad-coin-rows">
          {rows.map((m, r) => (
            <div key={r} className="kad-coin-row">
              {Array.from({ length: 6 }, (_, i) => (
                <span key={i} className="kad-coin-cell">
                  <EcoCoin money={m} />
                </span>
              ))}
            </div>
          ))}
        </div>
      </Sheet>
      {ECO_MONEY.filter((m) => m.kind === 'note').map((m) => (
        <NotePage key={m.value} money={m} />
      ))}
    </>
  )
}

/* ------------------------------------------------------------------ */
/* ชุดที่ 4 ธนาคารขยะ                                                   */
/* ------------------------------------------------------------------ */

function BuySlip({ prices }: { prices: TrashPrices }) {
  return (
    <div className="kad-slip">
      <div className="kad-slip-head">
        <b>♻ ใบรับซื้อขยะ</b>
        <span>ธนาคารขยะกาดรักษ์โลก</span>
        <Blank label="เลขที่" w="s" />
      </div>
      <GroupLine />
      <table className="kad-form">
        <thead>
          <tr>
            <th>ชนิดขยะ</th>
            <th>จำนวน</th>
            <th>ราคาต่อหน่วย</th>
            <th>เป็นเงิน (บาท)</th>
          </tr>
        </thead>
        <tbody>
          {TRASH.map((t) => (
            <tr key={t.id}>
              <td>{t.name}</td>
              <td>
                <span className="kad-unit">{t.unit}</span>
              </td>
              <td>{formatBS(prices[t.id] ?? t.price)}</td>
              <td />
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <th colSpan={3}>รวมเป็นเงิน</th>
            <td />
          </tr>
        </tfoot>
      </table>
      <div className="kad-fill-row">
        <Blank label="ผู้ขาย" />
        <Blank label="ผู้รับซื้อ" />
      </div>
    </div>
  )
}

export function BankSheets({ prices }: { prices: TrashPrices }) {
  return (
    <>
      <Sheet land className="kad-sign kad-bank-sign">
        <Bunting n={18} />
        <div className="kad-sign-body">
          <Booth />
          <div>
            <h1 className="kad-sign-title">ธนาคารขยะ</h1>
            <p className="kad-sign-sub">เปิดรับซื้อขยะสะอาด คัดแยกแล้ว</p>
            <div className="kad-sign-steps">
              <span>1 คัดแยก</span>
              <span>2 ชั่ง/นับ</span>
              <span>3 รับซื้อ</span>
            </div>
          </div>
        </div>
        <div className="kad-ground">
          {TRASH.map((t) => (
            <span key={t.id}>
              <TrashArt id={t.id} />
            </span>
          ))}
        </div>
      </Sheet>

      <Sheet title="ป้ายราคารับซื้อขยะ" sub="ราคาจำลอง ครูปรับได้ที่ช่อง 'ตั้งราคาขยะ' ก่อนพิมพ์">
        <div className="kad-price-board">
          {TRASH.map((t) => (
            <div key={t.id} className="kad-price-row">
              <span className="kad-price-art">
                <TrashArt id={t.id} />
              </span>
              <b>{t.name}</b>
              <span className="kad-price-big">
                {formatBS(prices[t.id] ?? t.price)}
                <small> / {t.unit}</small>
              </span>
            </div>
          ))}
        </div>
        <p className="kad-note-text">💡 ถามเด็ก: ถ้านำขวดมา 6 ขวด และกระป๋อง 4 ใบ จะได้เงินเท่าไร?</p>
      </Sheet>

      <Sheet land className="kad-stations">
        {[
          ['1', 'คัดแยก', '♻️', 'แยกขวด กระป๋อง กระดาษ ฝาขวด ออกจากกัน', '#1c7ed6'],
          ['2', 'ชั่ง / นับ', '⚖️', 'นับจำนวนแต่ละชนิด แล้วจดลงใบรับซื้อ', '#f59f00'],
          ['3', 'รับซื้อ', '💰', 'คิดเงิน จ่ายเงิน และเซ็นชื่อทั้งสองฝ่าย', '#2f9e44'],
        ].map(([n, name, icon, how, c]) => (
          <div key={n} className="kad-station" style={{ '--kad-c': c } as CSSProperties}>
            <span className="kad-station-n">{n}</span>
            <span className="kad-station-icon">{icon}</span>
            <b>{name}</b>
            <small>{how}</small>
          </div>
        ))}
      </Sheet>

      <Sheet title="ใบรับซื้อขยะ" sub="หน้าละ 2 ใบ ตัดครึ่ง">
        <div className="kad-halves kad-cut">
          <BuySlip prices={prices} />
          <BuySlip prices={prices} />
        </div>
      </Sheet>
    </>
  )
}

/* ------------------------------------------------------------------ */
/* ชุดที่ 5 บัตรสินค้า                                                  */
/* ------------------------------------------------------------------ */

export function ProductSheets() {
  const pages = [PRODUCTS.slice(0, 6), PRODUCTS.slice(6, 12)]
  return (
    <>
      {pages.map((list, i) => (
        <Sheet key={i} title={`บัตรสินค้า (${i + 1}/2)`} sub="วางหน้าร้าน แล้วให้กลุ่มตั้งราคาขายเอง">
          <div className="kad-grid kad-grid-2 kad-cut kad-products">
            {list.map((p) => (
              <div key={p.id} className="kad-card kad-product-card">
                <div className="kad-card-art">
                  <ProductArt id={p.id} />
                </div>
                <b className="kad-card-name">{p.name}</b>
                <small>ทำจาก {p.material}</small>
                <small>ราคาแนะนำ {priceRange(p)}</small>
                <div className="kad-tag">
                  ราคาขาย <i className="kad-line kad-line-s" /> บาท
                </div>
              </div>
            ))}
          </div>
        </Sheet>
      ))}
    </>
  )
}

/* ------------------------------------------------------------------ */
/* ชุดที่ 6 ป้ายร้าน                                                    */
/* ------------------------------------------------------------------ */

export function ShopSheets() {
  return (
    <>
      {SHOPS.map((s) => (
        <Sheet key={s.id} land className="kad-sign kad-shop-sign">
          <div className="kad-shop-sign-in" style={{ '--kad-c': s.color, '--kad-soft': s.soft } as CSSProperties}>
            <svg viewBox="0 0 100 14" className="kad-awning kad-awning-big" preserveAspectRatio="none" aria-hidden="true">
              {Array.from({ length: 10 }, (_, i) => (
                <path key={i} d={`M${i * 10} 0 h10 v9 q-5 6 -10 0 z`} fill={i % 2 ? '#fff' : s.color} stroke="#2b2350" strokeWidth="0.4" />
              ))}
            </svg>
            <span className="kad-shop-letter">ร้าน {s.letter}</span>
            <h1 className="kad-shop-name">
              {s.icon} {s.name}
            </h1>
            <p className="kad-shop-thai">{s.thai}</p>
            <div className="kad-shop-goods">
              {s.products.map((id) => (
                <span key={id}>
                  <ProductArt id={id} />
                  <small>{PRODUCTS.find((p) => p.id === id)?.name}</small>
                </span>
              ))}
            </div>
            <p className="kad-shop-open">🌱 เปิดแล้ว! ยินดีต้อนรับ</p>
          </div>
        </Sheet>
      ))}
      <Sheet land className="kad-sign kad-shop-sign">
        <div className="kad-shop-sign-in kad-shop-blank" style={{ '--kad-c': '#495057', '--kad-soft': '#f8f9fa' } as CSSProperties}>
          <svg viewBox="0 0 100 14" className="kad-awning kad-awning-big" preserveAspectRatio="none" aria-hidden="true">
            {Array.from({ length: 10 }, (_, i) => (
              <path key={i} d={`M${i * 10} 0 h10 v9 q-5 6 -10 0 z`} fill={i % 2 ? '#fff' : FLAG_COLORS[i % FLAG_COLORS.length]} stroke="#2b2350" strokeWidth="0.4" />
            ))}
          </svg>
          <span className="kad-shop-letter">
            ร้าน <i className="kad-line kad-line-s" />
          </span>
          <h1 className="kad-shop-name">
            ชื่อร้าน <i className="kad-line kad-line-l" />
          </h1>
          <p className="kad-shop-thai">ออกแบบป้ายร้านของกลุ่มเอง วาดสินค้าเด่นในกรอบด้านล่าง</p>
          <div className="kad-draw-box" />
        </div>
      </Sheet>
    </>
  )
}

/* ------------------------------------------------------------------ */
/* ชุดที่ 7 เอกสารเล่นจริง                                               */
/* ------------------------------------------------------------------ */

function Receipt() {
  return (
    <div className="kad-slip kad-receipt">
      <div className="kad-slip-head">
        <b>🧾 ใบเสร็จรับเงิน</b>
        <Blank label="ร้าน" />
        <Blank label="เลขที่" w="s" />
      </div>
      <FormTable cols={['รายการ', 'จำนวน', 'เป็นเงิน (บาท)']} widths={['52%', '18%', '30%']} rows={3} total="รวม" grow />
      <div className="kad-fill-row">
        <Blank label="รับเงินมา" w="s" />
        <Blank label="เงินทอน" w="s" />
        <Blank label="ผู้รับเงิน" />
      </div>
    </div>
  )
}

function OrderForm() {
  return (
    <div className="kad-slip">
      <div className="kad-slip-head">
        <b>🛒 ใบสั่งซื้อ</b>
        <Blank label="ถึงร้าน" />
        <Blank label="วันที่" w="s" />
      </div>
      <Blank label="จากกลุ่ม" w="l" />
      <FormTable cols={['สินค้า/อุปกรณ์', 'จำนวน', 'ราคาต่อชิ้น', 'เป็นเงิน (บาท)']} widths={['40%', '16%', '20%', '24%']} rows={5} total="รวมเป็นเงิน" grow />
      <div className="kad-fill-row">
        <Blank label="ผู้สั่งซื้อ" />
        <Blank label="ผู้ขาย" />
      </div>
    </div>
  )
}

export function DocSheets() {
  return (
    <>
      <Sheet title="ใบวางแผนธุรกิจของกลุ่ม" sub="ตอบให้ครบก่อนเปิดร้าน" className="kad-spread">
        <GroupLine />
        <div className="kad-fill-row">
          <Blank label="สมาชิก" w="l" />
        </div>
        <div className="kad-qa">
          {[
            ['♻️', 'เราจะใช้ขยะอะไรสร้างสินค้า?'],
            ['🛍️', 'สินค้าของเราคืออะไร? ทำได้กี่ชิ้น?'],
            ['🛒', 'ต้องใช้เงินซื้ออะไรบ้าง?'],
            ['🧮', 'ต้นทุนเท่าไร?'],
            ['🏷️', 'เราจะขายชิ้นละกี่บาท? ทำไมจึงตั้งราคานี้?'],
            ['💵', 'ถ้าลูกค้าจ่าย 50 บาท ต้องทอนเท่าไร?'],
          ].map(([icon, q]) => (
            <div key={q} className="kad-qa-item">
              <b>
                {icon} {q}
              </b>
              <i className="kad-write" />
              <i className="kad-write" />
              <i className="kad-write" />
            </div>
          ))}
        </div>
      </Sheet>

      <Sheet title="ใบคำนวณต้นทุน" sub="ต้นทุน = เงินที่ใช้ซื้ออุปกรณ์ทั้งหมด (ขยะที่เก็บมาเองไม่ต้องจ่ายเงิน)">
        <GroupLine />
        <FormTable
          cols={['อุปกรณ์ที่ซื้อ', 'จำนวน', 'ราคาต่อชิ้น (บาท)', 'เป็นเงิน (บาท)']}
          widths={['40%', '16%', '22%', '22%']}
          first={['ตัวอย่าง: กาว', '1 หลอด', '10', '10']}
          rows={8}
          total="รวมต้นทุน"
          grow
        />
        <div className="kad-eq-row">
          ขยะที่ใช้ (ได้ฟรี): <i className="kad-line kad-line-l" />
        </div>
        <div className="kad-eq-row">
          ทำสินค้าได้ <i className="kad-line kad-line-s" /> ชิ้น · ถ้าขายชิ้นละ <i className="kad-line kad-line-s" /> บาท จะได้เงิน <i className="kad-line kad-line-s" /> บาท
        </div>
      </Sheet>

      <Sheet title="ใบสั่งซื้อ" sub="หน้าละ 2 ใบ ตัดครึ่ง">
        <div className="kad-halves kad-cut">
          <OrderForm />
          <OrderForm />
        </div>
      </Sheet>

      <Sheet title="ใบเสร็จรับเงิน" sub="หน้าละ 3 ใบ">
        <div className="kad-thirds kad-cut">
          <Receipt />
          <Receipt />
          <Receipt />
        </div>
      </Sheet>

      <Sheet title="ใบคำนวณเงินทอน" sub="เงินทอน = เงินที่ลูกค้าจ่าย − ราคาสินค้า">
        <GroupLine />
        <FormTable
          cols={['ข้อ', 'ราคาสินค้า (บาท)', 'ลูกค้าจ่าย (บาท)', 'เงินทอน (บาท)', 'ทอนด้วยเงินอะไรบ้าง']}
          widths={['8%', '20%', '20%', '20%', '32%']}
          first={['ตย.', '35', '50', '50 − 35 = 15', '10 + 5']}
          rows={10}
          grow
        />
        <div className="kad-money-strip">
          {ECO_MONEY.map((m) => (
            <span key={m.value} className={m.kind === 'coin' ? 'kad-strip-coin' : 'kad-strip-note'}>
              {m.kind === 'coin' ? <EcoCoin money={m} /> : <EcoNote money={m} />}
            </span>
          ))}
        </div>
      </Sheet>

      <Sheet title="ใบบันทึกรายรับ–รายจ่าย" sub="รายรับ = เงินที่ได้มา · รายจ่าย = เงินที่จ่ายไป">
        <GroupLine />
        <div className="kad-two-col">
          <div>
            <h3 className="kad-in">💚 รายรับ</h3>
            <FormTable cols={['รายการ', 'บาท']} widths={['70%', '30%']} first={['ขายขยะ', '40']} rows={10} total="รายรับรวม" grow />
          </div>
          <div>
            <h3 className="kad-out">❤️ รายจ่าย</h3>
            <FormTable cols={['รายการ', 'บาท']} widths={['70%', '30%']} first={['ซื้อกาว', '10']} rows={10} total="รายจ่ายรวม" grow />
          </div>
        </div>
        <div className="kad-eq-line">
          <Box label="รายรับรวม" /> − <Box label="รายจ่ายรวม" /> = <Box label="คงเหลือ" />
        </div>
      </Sheet>

      <Sheet title="สมุดบัญชีเงินของกลุ่ม" sub="จดทุกครั้งที่เงินเข้าหรือออก แล้วหาเงินคงเหลือ">
        <GroupLine />
        <FormTable
          cols={['วัน/เดือน', 'รายการ', 'รายรับ (บาท)', 'รายจ่าย (บาท)', 'คงเหลือ (บาท)']}
          widths={['14%', '38%', '16%', '16%', '16%']}
          first={['', 'ยอดยกมา (เงินตั้งต้น)', '', '', '100']}
          rows={14}
          grow
        />
        <p className="kad-note-text">✔ ตรวจคำตอบ: ยอดยกมา + รายรับรวม − รายจ่ายรวม = คงเหลือบรรทัดสุดท้าย</p>
      </Sheet>

      <Sheet title="ใบสรุปกำไร" sub="รายได้ − ต้นทุน = กำไร" className="kad-spread">
        <GroupLine />
        <div className="kad-example kad-example-wide">
          <b>ตัวอย่าง กลุ่มกระถาง</b>
          <span>ซื้ออุปกรณ์ 20 บาท (ต้นทุน) · ทำกระถาง 3 ใบ ขายใบละ 15 บาท</span>
          <span>
            รายได้ = 3 × 15 = <b>45 บาท</b> · กำไร = 45 − 20 = <b>25 บาท</b>
          </span>
        </div>
        <h3 className="kad-sub-title">ของกลุ่มเรา</h3>
        <div className="kad-eq-line">
          ขายได้ <Box label="จำนวน" unit="ชิ้น" /> × ชิ้นละ <Box label="ราคา" /> = <Box label="รายได้" />
        </div>
        <div className="kad-eq-line">
          <Box label="รายได้" /> − <Box label="ต้นทุน" /> = <Box label="กำไร" />
        </div>
        <div className="kad-check-row">
          <span>☐ กำไร (รายได้มากกว่าต้นทุน)</span>
          <span>☐ เท่าทุน</span>
          <span>☐ ขาดทุน (รายได้น้อยกว่าต้นทุน)</span>
        </div>
        <div className="kad-qa-item">
          <b>ถ้ารอบหน้าอยากได้กำไรมากขึ้น กลุ่มเราจะทำอย่างไร?</b>
          <i className="kad-write" />
          <i className="kad-write" />
          <i className="kad-write" />
        </div>
      </Sheet>

      <Sheet title="ใบวางแผนใช้กำไร" sub="แบ่งกำไรไปใช้ แต่ละส่วนรวมกันต้องเท่ากับกำไรพอดี" className="kad-spread">
        <GroupLine />
        <div className="kad-eq-row kad-profit-total">
          กำไรของกลุ่ม <i className="kad-line kad-line-s" /> บาท
        </div>
        <div className="kad-uses-plan">
          {PROFIT_USES.map((u) => (
            <div key={u.label} className="kad-use-card">
              <span className="kad-use-icon">{u.icon}</span>
              <b>{u.label}</b>
              <span>
                <i className="kad-line kad-line-s" /> บาท
              </span>
            </div>
          ))}
        </div>
        <div className="kad-eq-row">
          รวม <i className="kad-line kad-line-s" /> + <i className="kad-line kad-line-s" /> + <i className="kad-line kad-line-s" /> + <i className="kad-line kad-line-s" /> = <i className="kad-line kad-line-s" /> บาท (ต้องเท่ากับกำไร)
        </div>
        <div className="kad-qa-item">
          <b>ทำไมกลุ่มเราจึงเลือกแบ่งแบบนี้?</b>
          <i className="kad-write" />
          <i className="kad-write" />
          <i className="kad-write" />
        </div>
      </Sheet>

      <Sheet title="ใบนักช้อปตัวน้อย (เดินตลาดนัด)" sub="แต่ละคนได้เงินจำลอง แล้วเดินซื้อสินค้าของเพื่อน">
        <div className="kad-fill-row">
          <Blank label="ชื่อ" w="l" />
          <span className="kad-blank">
            ฉันมีเงิน <i className="kad-line kad-line-s" /> บาท
          </span>
        </div>
        <FormTable
          cols={['ร้าน', 'สินค้าที่ซื้อ', 'ราคา (บาท)', 'เงินเหลือ (บาท)']}
          widths={['16%', '40%', '20%', '24%']}
          first={['A', 'กระถางต้นไม้', '25', '100 − 25 = 75']}
          rows={7}
          total="รวมจ่าย"
          grow
        />
        <div className="kad-eq-line">
          มีเงิน <Box label="มี" /> − จ่าย <Box label="รวมจ่าย" /> = เหลือ <Box label="เหลือ" />
        </div>
        <div className="kad-qa-item">
          <b>ถ้าอยากซื้อของราคา 45 บาทอีกหนึ่งชิ้น เงินพอไหม? ☐ พอ ☐ ไม่พอ เพราะ</b>
          <i className="kad-write" />
        </div>
      </Sheet>
    </>
  )
}

/* ------------------------------------------------------------------ */
/* ชุดที่ 8 ภารกิจและรางวัล                                              */
/* ------------------------------------------------------------------ */

export function TreeStage({ stage }: { stage: number }) {
  return (
    <svg viewBox="0 0 80 80" className="kad-tree" aria-hidden="true">
      <ellipse cx="40" cy="74" rx="30" ry="4" fill="#2b2350" opacity="0.12" />
      {stage === 0 && (
        <g>
          <path d="M40 72 v-22" stroke="#2f9e44" strokeWidth="3" />
          <path d="M40 54 q-14 -2 -16 -14 q14 0 16 14 z M40 50 q12 -2 14 -14 q-12 0 -14 14 z" fill="#69db7c" stroke="#2b2350" strokeWidth="1.5" />
          <path d="M22 72 h36" stroke="#8d6e63" strokeWidth="4" strokeLinecap="round" />
        </g>
      )}
      {stage === 1 && (
        <g>
          <rect x="35" y="44" width="10" height="28" fill="#8d6e63" stroke="#2b2350" strokeWidth="1.5" />
          <circle cx="40" cy="30" r="20" fill="#51cf66" stroke="#2b2350" strokeWidth="1.8" />
          <circle cx="28" cy="40" r="11" fill="#69db7c" stroke="#2b2350" strokeWidth="1.8" />
          <circle cx="52" cy="40" r="11" fill="#69db7c" stroke="#2b2350" strokeWidth="1.8" />
          <circle cx="34" cy="26" r="3" fill="#ff6b6b" />
          <circle cx="48" cy="22" r="3" fill="#ff6b6b" />
        </g>
      )}
      {stage === 2 && (
        <g>
          <path d="M40 50 v-18 M40 40 q-10 -4 -12 -12 M40 36 q10 -4 12 -12" stroke="#2f9e44" strokeWidth="3" fill="none" />
          <circle cx="28" cy="27" r="6" fill="#ff8fb3" stroke="#2b2350" strokeWidth="1.4" />
          <circle cx="52" cy="23" r="6" fill="#ffd43b" stroke="#2b2350" strokeWidth="1.4" />
          <path d="M22 50 h36 l-5 22 h-26 z" fill="#ff922b" stroke="#2b2350" strokeWidth="2" strokeLinejoin="round" />
          <path d="M20 50 h40 v6 h-40 z" fill="#e8590c" stroke="#2b2350" strokeWidth="2" />
        </g>
      )}
      {stage === 3 && (
        <g>
          <path d="M4 72 h72" stroke="#8d6e63" strokeWidth="5" strokeLinecap="round" />
          <path d="M10 70 v-40 l14 -12 l14 12 v40 z" fill="#ffe8cc" stroke="#2b2350" strokeWidth="1.8" strokeLinejoin="round" />
          <rect x="19" y="50" width="10" height="20" fill="#8d6e63" />
          <circle cx="56" cy="40" r="14" fill="#51cf66" stroke="#2b2350" strokeWidth="1.8" />
          <rect x="53" y="52" width="6" height="18" fill="#8d6e63" />
          {[44, 52, 60, 68].map((x, i) => (
            <circle key={x} cx={x} cy="68" r="3" fill={FLAG_COLORS[i]} />
          ))}
        </g>
      )}
    </svg>
  )
}

export function MissionSheets() {
  return (
    <>
      <Sheet title="ตราภารกิจ" sub="ตัดเป็นเหรียญตรา/สติกเกอร์ มอบเมื่อทำภารกิจสำเร็จ">
        <div className="kad-grid kad-grid-2 kad-cut kad-missions">
          {MISSIONS.map((m) => (
            <div key={m.id} className="kad-card kad-mission-card">
              <span className="kad-mission-art">
                <MissionBadgeArt icon={m.icon} color={m.color} />
              </span>
              <div>
                <b className="kad-card-name" style={{ color: m.color }}>
                  ภารกิจ{m.name}
                </b>
                <small>{m.task}</small>
              </div>
            </div>
          ))}
          <div className="kad-card kad-mission-card">
            <span className="kad-mission-art">
              <MissionBadgeArt icon="⭐" color="#fab005" />
            </span>
            <div>
              <b className="kad-card-name">ภารกิจพิเศษ</b>
              <small>
                ครูกำหนดเอง: <i className="kad-line kad-line-m" />
              </small>
            </div>
          </div>
        </div>
      </Sheet>

      <Sheet title="บัตรสะสมภารกิจของกลุ่ม" sub="ทำภารกิจสำเร็จ ครูประทับตราหรือติดสติกเกอร์ในช่อง (หน้าละ 2 ใบ)">
        <div className="kad-halves kad-cut">
          {[0, 1].map((k) => (
            <div key={k} className="kad-slip kad-stamp-card">
              <div className="kad-slip-head">
                <b>🏆 บัตรสะสมภารกิจ</b>
                <Blank label="กลุ่ม" w="l" />
              </div>
              <div className="kad-stamps">
                {MISSIONS.map((m) => (
                  <span key={m.id} className="kad-stamp" style={{ borderColor: m.color }}>
                    <i>{m.icon}</i>
                    <small>{m.name}</small>
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Sheet>

      <Sheet land title="ภารกิจปลดล็อกต้นไม้ของทั้งห้อง" sub="ระบายช่องละ 10 บาท ทุกครั้งที่ยอดขายรวมของห้องเพิ่มขึ้น">
        <div className="kad-unlock">
          <div className="kad-unlock-goals">
            <span>
              <TreeStage stage={0} />
              <small>เริ่มต้น 0 บาท</small>
            </span>
            {CLASS_GOALS.map((g, i) => (
              <span key={g.at}>
                <TreeStage stage={i + 1} />
                <b>
                  {g.icon} {g.at} บาท
                </b>
                <small>{g.label}</small>
              </span>
            ))}
          </div>
          <div className="kad-unlock-bar">
            {Array.from({ length: 30 }, (_, i) => (
              <span key={i} className={(i + 1) % 10 === 0 ? 'is-goal' : ''}>
                {(i + 1) * 10}
              </span>
            ))}
          </div>
          <p className="kad-note-text">🌳 สุดท้ายนำเงินจำลองที่หาได้ไปแลกอุปกรณ์ปลูกต้นไม้จริงที่ครูเตรียมไว้</p>
        </div>
      </Sheet>
    </>
  )
}
