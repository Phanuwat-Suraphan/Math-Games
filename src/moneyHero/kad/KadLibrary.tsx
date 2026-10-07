import { useRef } from 'react'
import { ECO_MONEY, MISSIONS, PRODUCTS, TRASH } from './kadData'
import { EcoCoin, EcoNote, MissionBadgeArt, ProductArt, TrashArt } from './KadArt'

/**
 * คลังภาพกาดรักษ์โลก: ดาวน์โหลดภาพแต่ละชิ้นเป็น PNG (ภาพใหญ่ใช้ใน Canva/PowerPoint ได้)
 * หรือ SVG (ขยายได้ไม่แตก) เพื่อให้ครูนำไปทำสื่อเองต่อ
 */

interface LibItem {
  id: string
  name: string
  art: JSX.Element
  wide?: boolean
}

const GROUPS: { title: string; items: LibItem[] }[] = [
  { title: '♻️ ขยะ', items: TRASH.map((t) => ({ id: `trash-${t.id}`, name: t.name, art: <TrashArt id={t.id} /> })) },
  { title: '🛍️ สินค้าจากวัสดุเหลือใช้', items: PRODUCTS.map((p) => ({ id: `product-${p.id}`, name: p.name, art: <ProductArt id={p.id} /> })) },
  {
    title: '💰 เงินจำลอง',
    items: ECO_MONEY.map((m) => ({
      id: `money-${m.kind}-${m.value}`,
      name: m.label,
      art: m.kind === 'coin' ? <EcoCoin money={m} /> : <EcoNote money={m} />,
      wide: m.kind === 'note',
    })),
  },
  { title: '🏆 ตราภารกิจ', items: MISSIONS.map((m) => ({ id: `badge-${m.id}`, name: m.name, art: <MissionBadgeArt icon={m.icon} color={m.color} /> })) },
]

/** ขนาดภาพ PNG ด้านยาว (พิกเซล) */
const PNG_SIZE = 1200

function svgSource(svg: SVGSVGElement): { text: string; w: number; h: number } {
  const vb = svg.viewBox.baseVal
  const scale = PNG_SIZE / Math.max(vb.width, vb.height)
  const w = Math.round(vb.width * scale)
  const h = Math.round(vb.height * scale)
  const clone = svg.cloneNode(true) as SVGSVGElement
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
  clone.setAttribute('width', String(w))
  clone.setAttribute('height', String(h))
  clone.setAttribute('font-family', 'Kanit, "Noto Sans Thai", sans-serif')
  return { text: new XMLSerializer().serializeToString(clone), w, h }
}

function save(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1500)
}

async function savePng(svg: SVGSVGElement, name: string) {
  const { text, w, h } = svgSource(svg)
  const img = new Image()
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(text)}`
  await img.decode()
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  canvas.getContext('2d')?.drawImage(img, 0, 0, w, h)
  const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, 'image/png'))
  if (blob) save(blob, `${name}.png`)
}

function Item({ item }: { item: LibItem }) {
  const box = useRef<HTMLDivElement>(null)
  const svg = () => box.current?.querySelector('svg') ?? null
  return (
    <figure className={`kad-lib-item ${item.wide ? 'is-wide' : ''}`} data-testid={`kad-lib-${item.id}`}>
      <div ref={box} className="kad-lib-art">
        {item.art}
      </div>
      <figcaption>{item.name}</figcaption>
      <div className="kad-lib-buttons">
        <button
          type="button"
          className="mh-btn mh-btn-gold mh-btn-sm"
          onClick={() => {
            const el = svg()
            if (el) void savePng(el, `kad-${item.id}`)
          }}
          data-testid={`kad-png-${item.id}`}
        >
          PNG
        </button>
        <button
          type="button"
          className="mh-btn mh-btn-soft mh-btn-sm"
          onClick={() => {
            const el = svg()
            if (el) save(new Blob([svgSource(el).text], { type: 'image/svg+xml' }), `kad-${item.id}.svg`)
          }}
          data-testid={`kad-svg-${item.id}`}
        >
          SVG
        </button>
      </div>
    </figure>
  )
}

export function KadLibrary() {
  return (
    <div className="kad-lib" data-testid="kad-library">
      {GROUPS.map((g) => (
        <section key={g.title} className="mh-card kad-lib-group">
          <h3 className="mh-card-title">{g.title}</h3>
          <div className="kad-lib-grid">
            {g.items.map((item) => (
              <Item key={item.id} item={item} />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
