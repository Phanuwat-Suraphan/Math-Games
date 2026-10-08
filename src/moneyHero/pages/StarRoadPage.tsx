import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useGame } from '../hooks/useMoneyGame'
import { totalStars } from '../engine/progress'
import { stageStars } from '../engine/stages'
import { allStars, chestState, CHESTS, MAX_STARS, nextChest, openChest, type Chest, type ChestReward } from '../engine/starRoad'
import { shopItem } from '../data/shop'
import { TopBar } from '../components/TopBar'
import { AvatarArt } from '../components/Art'
import { ChestArt } from '../components/ChestArt'
import { Confetti } from '../components/Effects'
import { playSound } from '../utils/sound'
import { speak } from '../utils/speech'

/**
 * ถนนดาว: ดาวทั้งหมดพาเดินไปเปิดหีบสมบัติ
 * เส้นทาง #/stars
 */
export function StarRoadPage() {
  const { player, updatePlayer } = useGame()
  const [opened, setOpened] = useState<{ chest: Chest; reward: ChestReward } | null>(null)
  if (!player) return null
  const stars = allStars(player)
  const main = totalStars(player)
  const sub = stageStars(player)
  const next = nextChest(player)
  // ฮีโร่ยืนอยู่ก่อนหีบถัดไปที่ยังเก็บดาวไม่ถึง
  const heroAt = next ? CHESTS.indexOf(next.chest) : CHESTS.length

  const open = (chest: Chest) => {
    const out = openChest(player, chest.at)
    if (!out) return
    updatePlayer((p) => openChest(p, chest.at)?.player ?? p)
    setOpened({ chest, reward: out.reward })
    playSound('unlock')
    window.setTimeout(() => playSound('coin'), 300)
    const item = shopItem(out.reward.item)
    speak(`เปิดหีบสมบัติแล้ว ได้ ${out.reward.coins + out.reward.bonus} เหรียญ${item ? ` และได้${item.name}ฟรี` : ''}`)
  }

  return (
    <div className="mh-level theme-final">
      <TopBar />
      <div className="mh-page mh-page-narrow">
        <div className="mh-page-head">
          <Link to="/map" className="mh-icon-btn" aria-label="กลับแผนที่">
            <ArrowLeft size={24} />
          </Link>
          <h1 className="mh-title">🧰 ถนนดาว</h1>
        </div>

        <div className="mh-card mh-star-total" data-testid="mh-star-total">
          <div className="mh-star-total-big">
            ⭐ <b>{stars}</b> / {MAX_STARS}
          </div>
          <div className="mh-progress mh-star-total-bar">
            <div style={{ width: `${Math.round((stars / MAX_STARS) * 100)}%` }} />
          </div>
          <div className="mh-star-total-parts">
            <span>🗺️ ด่านผจญภัย {main}/39</span>
            <span>🎈🔥 ด่านย่อย {sub}/78</span>
          </div>
          <p className="mh-soft">
            {next ? (
              <>
                เก็บดาวอีก <b>{next.need} ดวง</b> จะถึงหีบถัดไป · เล่นด่านย่อย ฝึกเก่ง 🎈 และท้าทาย 🔥 เพื่อเก็บดาวเพิ่ม
              </>
            ) : (
              <>เก็บดาวครบทุกดวงแล้ว สุดยอดฮีโร่!</>
            )}
          </p>
        </div>

        <ol className="mh-star-road" aria-label="หีบสมบัติบนถนนดาว">
          {CHESTS.map((chest, i) => {
            const state = chestState(player, chest)
            const gift = shopItem(chest.gift)
            return (
              <li key={chest.at} className={`mh-road-stop is-${state} ${i % 2 ? 'is-right' : 'is-left'}`} data-testid={`mh-chest-${chest.at}`}>
                {i === heroAt && (
                  <span className="mh-road-hero" aria-label="คุณอยู่ตรงนี้">
                    <AvatarArt avatar={player.avatar} size={54} portrait wear={player.wear} />
                  </span>
                )}
                <div className="mh-card mh-road-card">
                  <ChestArt state={state} size={state === 'ready' ? 88 : 72} />
                  <div className="mh-road-info">
                    <b className="mh-road-need">⭐ {chest.at}</b>
                    <span>
                      🪙 {chest.coins}
                      {gift && (
                        <>
                          {' '}
                          + {gift.icon} {gift.name}
                        </>
                      )}
                    </span>
                    {state === 'ready' ? (
                      <button type="button" className="mh-btn mh-btn-gold mh-btn-sm" data-testid={`mh-chest-open-${chest.at}`} onClick={() => open(chest)}>
                        🧰 เปิดหีบ!
                      </button>
                    ) : state === 'opened' ? (
                      <span className="mh-road-done">✔ เปิดแล้ว</span>
                    ) : (
                      <span className="mh-soft">อีก {chest.at - stars} ดาว</span>
                    )}
                  </div>
                </div>
              </li>
            )
          })}
          {heroAt === CHESTS.length && (
            <li className="mh-road-stop is-end">
              <span className="mh-road-hero">
                <AvatarArt avatar={player.avatar} size={64} portrait wear={player.wear} mood="happy" />
              </span>
              <b>🏆 ถึงปลายถนนดาวแล้ว!</b>
            </li>
          )}
        </ol>
      </div>

      {opened && (
        <div className="mh-modal" role="dialog" aria-label="ของในหีบสมบัติ">
          <div className="mh-card mh-modal-card mh-chest-reward" data-testid="mh-chest-reward">
            <Confetti count={30} />
            <ChestArt state="opened" size={140} />
            <h2 className="mh-step-title">เปิดหีบสมบัติแล้ว!</h2>
            <div className="mh-result-rewards">
              <span className="mh-reward">🪙 +{opened.reward.coins + opened.reward.bonus} เหรียญ</span>
              {opened.reward.item && (
                <span className="mh-reward">
                  {shopItem(opened.reward.item)?.icon} {shopItem(opened.reward.item)?.name} (ฟรี!)
                </span>
              )}
            </div>
            {opened.reward.bonus > 0 && <p className="mh-soft">มี{shopItem(opened.chest.gift)?.name}อยู่แล้ว เลยได้เหรียญเพิ่ม {opened.reward.bonus} เหรียญแทน</p>}
            {opened.reward.item && <p className="mh-soft">ไปเปลี่ยนชุดได้ที่ร้านของฮีโร่ 🛍️</p>}
            <button type="button" className="mh-btn mh-btn-go mh-btn-block" data-testid="mh-chest-close" onClick={() => setOpened(null)}>
              เก็บของ ✔
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
