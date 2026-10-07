import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useGame } from '../hooks/useMoneyGame'
import { SHOP_ITEMS, type ShopItem, type ShopSlot } from '../data/shop'
import { buyItem, toggleWear } from '../engine/progress'
import { AvatarArt, CharacterArt, PetSvg } from '../components/Art'
import { CharacterSvg } from '../components/CharacterSvg'
import { TopBar } from '../components/TopBar'
import { Bunting } from '../components/Bunting'
import { Confetti } from '../components/Effects'
import { playSound } from '../utils/sound'
import { speak } from '../utils/speech'

/**
 * ร้านของฮีโร่: ใช้เหรียญที่สะสมซื้อหมวก แว่น และสัตว์เลี้ยง
 * ทุกครั้งที่ซื้อ ลุงหมีจะคิดเงินให้ดู "มี … จ่าย … เหลือ …" (ฝึกการลบไปในตัว)
 * ซื้อไม่ได้ก็บอกว่า "ขาดอีกกี่เหรียญ"
 * เส้นทาง #/shop
 */

const SLOTS: { id: ShopSlot; label: string }[] = [
  { id: 'hat', label: '🎩 หมวก' },
  { id: 'face', label: '👓 แว่นตา' },
  { id: 'pet', label: '🐾 สัตว์เลี้ยง' },
]

export function ItemPreview({ item }: { item: ShopItem }) {
  if (item.slot === 'pet') return <PetSvg id={item.id} />
  // ลองสวมบนฮีโร่ให้ดูก่อนซื้อ (เฉพาะส่วนหัว)
  return <CharacterSvg kind="hero" portrait wear={item.slot === 'hat' ? { hat: item.id } : { face: item.id }} />
}

export function ShopPage() {
  const { player, updatePlayer } = useGame()
  const [slot, setSlot] = useState<ShopSlot>('hat')
  const [talk, setTalk] = useState('ยินดีต้อนรับสู่ร้านของลุงหมี! เลือกของที่ชอบได้เลย')
  const [party, setParty] = useState(0)
  if (!player) return null

  const buy = (item: ShopItem) => {
    const r = buyItem(player, item.id)
    if (!r.ok) {
      if (r.reason === 'short') {
        playSound('wrong')
        const msg = `${item.name} ราคา ${item.price} เหรียญ มีอยู่ ${player.coins} เหรียญ ยังขาดอีก ${r.short} เหรียญ ไปเล่นด่านเก็บเหรียญเพิ่มนะ`
        setTalk(msg)
        speak(msg)
      }
      return
    }
    playSound('coin')
    window.setTimeout(() => playSound('complete'), 200)
    updatePlayer(() => r.player)
    setParty((n) => n + 1)
    const msg = `มี ${player.coins} เหรียญ จ่าย ${item.price} เหรียญ เหลือ ${r.left} เหรียญ ขอบใจนะ!`
    setTalk(msg)
    speak(msg)
  }

  const wearToggle = (item: ShopItem) => {
    playSound('click')
    updatePlayer((p) => toggleWear(p, item.id))
  }

  return (
    <div className="mh-level theme-super">
      <TopBar />
      <div className="mh-page">
        <div className="mh-page-head">
          <Link to="/map" className="mh-icon-btn" aria-label="กลับแผนที่">
            <ArrowLeft size={24} />
          </Link>
          <h1 className="mh-title mh-level-title">🛍️ ร้านของฮีโร่</h1>
        </div>

        <div className="mh-shop-top">
          <div className="mh-card mh-shop-stage">
            {party > 0 && <Confetti key={party} count={24} />}
            <Bunting count={10} />
            <div className="mh-pedestal">
              <AvatarArt avatar={player.avatar} size={130} wear={player.wear} pet mood={party > 0 ? 'happy' : 'normal'} />
            </div>
            <div className="mh-shop-wallet" data-testid="mh-shop-wallet">
              🪙 มีอยู่ <b>{player.coins}</b> เหรียญ
            </div>
          </div>
          <div className="mh-card mh-shop-keeper">
            <CharacterArt id="bear" size={86} mood={party > 0 ? 'happy' : 'normal'} />
            <div className="mh-bubble" aria-live="polite" data-testid="mh-shop-talk">
              {talk}
            </div>
          </div>
        </div>

        <div className="mh-shop-tabs" role="tablist" aria-label="หมวดของ">
          {SLOTS.map((s) => (
            <button
              key={s.id}
              type="button"
              role="tab"
              aria-selected={slot === s.id}
              className={`mh-shop-tab ${slot === s.id ? 'is-on' : ''}`}
              onClick={() => {
                playSound('click')
                setSlot(s.id)
              }}
              data-testid={`mh-shop-tab-${s.id}`}
            >
              {s.label}
            </button>
          ))}
        </div>

        <div className="mh-shop-grid">
          {SHOP_ITEMS.filter((i) => i.slot === slot).map((item) => {
            const owned = player.owned.includes(item.id)
            const wearing = player.wear[item.slot] === item.id
            const short = Math.max(0, item.price - player.coins)
            return (
              <div key={item.id} className={`mh-shop-item ${owned ? 'is-owned' : ''} ${wearing ? 'is-wearing' : ''}`} data-testid={`mh-shop-item-${item.id}`}>
                <div className="mh-shop-preview">
                  <ItemPreview item={item} />
                </div>
                <b className="mh-shop-name">
                  {item.icon} {item.name}
                </b>
                {owned ? (
                  <button type="button" className={`mh-btn mh-btn-sm ${wearing ? 'mh-btn-soft' : 'mh-btn-go'}`} onClick={() => wearToggle(item)} data-testid={`mh-wear-${item.id}`}>
                    {wearing ? '✓ สวมอยู่ (ถอด)' : 'สวมเลย'}
                  </button>
                ) : (
                  <>
                    <span className="mh-price-tag">🪙 {item.price}</span>
                    <button
                      type="button"
                      className={`mh-btn mh-btn-sm ${short > 0 ? 'mh-btn-soft' : 'mh-btn-gold'}`}
                      onClick={() => buy(item)}
                      data-testid={`mh-buy-${item.id}`}
                    >
                      {short > 0 ? `ขาดอีก ${short}` : 'ซื้อ'}
                    </button>
                  </>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
