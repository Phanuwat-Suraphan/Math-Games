import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Printer } from 'lucide-react'
import { formatBS } from '../utils/money'
import { TRASH, defaultPrices, type TrashPrices } from './kadData'
import { BankSheets, DocSheets, MissionSheets, MoneySheets, PosterSheets, ProductSheets, ShopSheets, TrashCardSheets } from './KadSheets'
import { TrashArt } from './KadArt'
import { KadLibrary } from './KadLibrary'
import './kad.css'

/**
 * ชุดกิจกรรม "กาดรักษ์โลก ป.3" สำหรับพิมพ์เล่นจริงในห้องเรียน (#/kad)
 * เลือกชุด → ดูตัวอย่างบนจอ → กดพิมพ์ (A4 แต่ละแผ่นแนวตั้ง/แนวนอนตามชุด)
 */

const PRICE_KEY = 'moneyHero.kad.prices.v1'

function loadPrices(): TrashPrices {
  try {
    const raw = JSON.parse(globalThis.localStorage?.getItem(PRICE_KEY) ?? 'null') as TrashPrices | null
    const base = defaultPrices()
    if (!raw) return base
    for (const t of TRASH) if (Number.isFinite(raw[t.id]) && raw[t.id] >= 0) base[t.id] = Math.round(raw[t.id])
    return base
  } catch {
    return defaultPrices()
  }
}

interface KadSet {
  id: string
  icon: string
  name: string
  desc: string
  sheets: number
  render: (prices: TrashPrices) => JSX.Element
}

const SETS: KadSet[] = [
  { id: 'poster', icon: '🖼️', name: 'โปสเตอร์', desc: 'ป้ายหลักกาดรักษ์โลก + วงจรกิจกรรมและกำไร', sheets: 2, render: () => <PosterSheets /> },
  { id: 'trash', icon: '♻️', name: 'บัตรขยะ', desc: 'ขยะ 6 ชนิด ชนิดละ 2 ใบ พร้อมราคารับซื้อ', sheets: 1, render: (p) => <TrashCardSheets prices={p} /> },
  { id: 'money', icon: '💰', name: 'เงินจำลอง', desc: 'เหรียญ 50 สต.–10 บาท และธนบัตร 20 / 50 / 100 ของกาด', sheets: 4, render: () => <MoneySheets /> },
  { id: 'bank', icon: '🏦', name: 'ธนาคารขยะ', desc: 'ป้ายธนาคาร ป้ายราคา ป้ายจุดคัดแยก/ชั่ง/รับซื้อ ใบรับซื้อ', sheets: 4, render: (p) => <BankSheets prices={p} /> },
  { id: 'products', icon: '🛍️', name: 'บัตรสินค้า', desc: 'สินค้า 12 อย่างจากวัสดุเหลือใช้ มีช่องตั้งราคาเอง', sheets: 2, render: () => <ProductSheets /> },
  { id: 'shops', icon: '🏪', name: 'ป้ายร้าน', desc: 'ป้ายร้าน 5 กลุ่ม + แบบเปล่าให้ออกแบบเอง', sheets: 6, render: () => <ShopSheets /> },
  { id: 'docs', icon: '🧾', name: 'เอกสารเล่นจริง', desc: 'วางแผน ต้นทุน ใบสั่งซื้อ ใบเสร็จ เงินทอน รายรับ–รายจ่าย บัญชี กำไร ใช้กำไร นักช้อป', sheets: 10, render: () => <DocSheets /> },
  { id: 'missions', icon: '🏆', name: 'ภารกิจและรางวัล', desc: 'ตราภารกิจ 7 อย่าง บัตรสะสม และภารกิจปลดล็อกต้นไม้', sheets: 3, render: () => <MissionSheets /> },
]

export function KadPage() {
  const [setId, setSetId] = useState(() => {
    try {
      return globalThis.localStorage?.getItem('moneyHero.kad.tab') ?? 'poster'
    } catch {
      return 'poster'
    }
  })
  const [prices, setPrices] = useState<TrashPrices>(loadPrices)
  const [editing, setEditing] = useState(false)
  const library = setId === 'library'
  const current = SETS.find((s) => s.id === setId) ?? SETS[0]

  useEffect(() => {
    try {
      globalThis.localStorage?.setItem('moneyHero.kad.tab', library ? 'library' : current.id)
    } catch {
      /* ไม่เป็นไร */
    }
  }, [current.id, library])

  const changePrice = (id: string, baht: string) => {
    // ปัดเป็น 25 สตางค์ เพราะเงินที่ใช้กันจริงเล็กสุดคือเหรียญ 25 สตางค์
    const v = Math.max(0, Math.round(Number(baht) * 4) * 25)
    if (!Number.isFinite(v)) return
    const next = { ...prices, [id]: v }
    setPrices(next)
    try {
      globalThis.localStorage?.setItem(PRICE_KEY, JSON.stringify(next))
    } catch {
      /* ไม่เป็นไร */
    }
  }

  return (
    <div className="kad-page" data-testid="kad-page">
      <div className="kad-noprint">
        <div className="mh-page-head">
          <Link to="/teacher" className="mh-icon-btn" aria-label="กลับแผงคุณครู">
            <ArrowLeft size={24} />
          </Link>
          <h1 className="mh-title">🌱 กาดรักษ์โลก ป.3</h1>
          <Link to="/kad/class" className="mh-btn mh-btn-go" data-testid="kad-to-class">
            📺 แดชบอร์ดตลาดนัด
          </Link>
          {!library && (
            <button type="button" className="mh-btn mh-btn-gold" onClick={() => window.print()} data-testid="kad-print">
              <Printer size={20} /> พิมพ์ชุดนี้
            </button>
          )}
        </div>
        <p className="kad-intro">
          <b>เปลี่ยนขยะให้เป็นเงิน เปลี่ยนเงินให้เป็นไอเดีย</b> — ชุดสื่อสำหรับเล่นตลาดนัดจริงในห้อง: เก็บขยะ → คัดแยก → ขายให้ธนาคารขยะ → ซื้ออุปกรณ์ → สร้างสินค้า → ตั้งราคา → ขาย → ทอน → คิดกำไร → ออม/ลงทุน
          เลือกชุดด้านล่าง แล้วกด "พิมพ์ชุดนี้" (กระดาษ A4 ตั้งค่า "พิมพ์ภาพพื้นหลัง" ให้สีออกครบ)
        </p>

        <div className="kad-tabs" role="tablist" aria-label="ชุดสื่อ">
          {SETS.map((s, i) => (
            <button
              key={s.id}
              type="button"
              role="tab"
              aria-selected={!library && s.id === current.id}
              className={`kad-tab ${!library && s.id === current.id ? 'is-on' : ''}`}
              onClick={() => setSetId(s.id)}
              data-testid={`kad-tab-${s.id}`}
            >
              <span className="kad-tab-icon">{s.icon}</span>
              <b>
                ชุดที่ {i + 1} {s.name}
              </b>
              <small>{s.sheets} แผ่น</small>
            </button>
          ))}
          <button
            type="button"
            role="tab"
            aria-selected={library}
            className={`kad-tab kad-tab-lib ${library ? 'is-on' : ''}`}
            onClick={() => setSetId('library')}
            data-testid="kad-tab-library"
          >
            <span className="kad-tab-icon">🖼️</span>
            <b>คลังภาพ</b>
            <small>ดาวน์โหลด PNG/SVG</small>
          </button>
        </div>
        <p className="kad-set-desc">
          {library ? (
            <>
              🖼️ <b>คลังภาพ</b> — ดาวน์โหลดภาพแต่ละชิ้นไปทำสื่อเอง (PNG ภาพใหญ่ 1200 พิกเซล · SVG ขยายได้ไม่แตก)
            </>
          ) : (
            <>
              {current.icon} <b>{current.name}</b> — {current.desc}
            </>
          )}
        </p>
        {library && <KadLibrary />}

        {!library && (current.id === 'trash' || current.id === 'bank') && (
          <div className="mh-card kad-price-editor">
            <button type="button" className="mh-btn mh-btn-soft mh-btn-sm" onClick={() => setEditing((v) => !v)} aria-expanded={editing}>
              ⚙️ ตั้งราคาขยะ {editing ? '▲' : '▼'}
            </button>
            {editing && (
              <div className="kad-price-inputs">
                {TRASH.map((t) => (
                  <label key={t.id}>
                    <span className="kad-price-input-art">
                      <TrashArt id={t.id} />
                    </span>
                    {t.name}
                    <input
                      type="number"
                      min={0}
                      step={0.25}
                      inputMode="decimal"
                      value={prices[t.id] / 100}
                      onChange={(e) => changePrice(t.id, e.target.value)}
                    />
                    บาท/{t.unit}
                    <small>({formatBS(prices[t.id])})</small>
                  </label>
                ))}
                <button
                  type="button"
                  className="mh-btn mh-btn-soft mh-btn-sm"
                  onClick={() => {
                    setPrices(defaultPrices())
                    try {
                      globalThis.localStorage?.removeItem(PRICE_KEY)
                    } catch {
                      /* ไม่เป็นไร */
                    }
                  }}
                >
                  คืนค่าเดิม
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {!library && (
        <div className="kad-sheets" data-testid="kad-sheets">
          {current.render(prices)}
        </div>
      )}
    </div>
  )
}
