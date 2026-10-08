import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useGame } from '../hooks/useMoneyGame'
import {
  cartItems,
  cartTotal,
  cheapestPlan,
  explainLeft,
  explainTotal,
  missingNeeds,
  needsMet,
  PLAN_EVENTS,
  planReward,
  planStars,
  recordPlan,
  type PlanEvent,
} from '../engine/budget'
import { readBahtSatang } from '../engine/check'
import { formatBS } from '../utils/money'
import { TopBar } from '../components/TopBar'
import { CharacterArt } from '../components/Art'
import { Stars } from '../components/Stars'
import { Confetti } from '../components/Effects'
import { BigField } from '../components/inputs/AmountInput'
import { playSound } from '../utils/sound'
import { speak } from '../utils/speech'

/**
 * วางแผนใช้เงิน: ช่วยเพื่อนจัดงานภายในงบ
 * เลือกของให้ครบ → คิดยอดรวมเอง (เกินงบต้องกลับไปเปลี่ยน) → คิดเงินที่เหลือ
 * เส้นทาง #/plan
 */

type Phase = 'choose' | 'pick' | 'total' | 'left' | 'done'

declare global {
  interface Window {
    __MH_PLAN?: { total: number; left: number; cheapest: string[] }
  }
}

export function PlanPage() {
  const { player, updatePlayer } = useGame()
  const [event, setEvent] = useState<PlanEvent | null>(null)
  const [phase, setPhase] = useState<Phase>('choose')
  const [cart, setCart] = useState<string[]>([])
  const [mistakes, setMistakes] = useState(0)
  const [over, setOver] = useState(0)
  const [result, setResult] = useState<{ stars: number; coins: number } | null>(null)

  const total = event ? cartTotal(event, cart) : 0
  useEffect(() => {
    if (event) window.__MH_PLAN = { total, left: event.budget - total, cheapest: cheapestPlan(event) }
    return () => {
      window.__MH_PLAN = undefined
    }
  }, [event, total])

  if (!player) return null

  const start = (e: PlanEvent) => {
    playSound('click')
    setEvent(e)
    setCart([])
    setMistakes(0)
    setOver(0)
    setResult(null)
    setPhase('pick')
    speak(`${e.title} ${e.story}`)
  }

  const finish = (e: PlanEvent, wrong: number) => {
    const stars = planStars(wrong, over)
    const first = (player.plan?.best[e.id] ?? 0) === 0
    updatePlayer((p) => recordPlan(p, e.id, stars))
    setResult({ stars, coins: planReward(stars, first) })
    setPhase('done')
    playSound('complete')
    speak(e.done, { queue: true })
  }

  return (
    <div className="mh-level theme-market">
      <TopBar />
      <div className="mh-page mh-page-narrow">
        <div className="mh-page-head">
          {phase === 'choose' ? (
            <Link to="/map" className="mh-icon-btn" aria-label="กลับแผนที่">
              <ArrowLeft size={24} />
            </Link>
          ) : (
            <button type="button" className="mh-icon-btn" aria-label="เลือกงานอื่น" onClick={() => setPhase('choose')}>
              <ArrowLeft size={24} />
            </button>
          )}
          <h1 className="mh-title">🎉 วางแผนใช้เงิน</h1>
        </div>

        {phase === 'choose' && (
          <>
            <p className="mh-help-line">เพื่อน ๆ ขอให้ช่วยจัดงาน เลือกซื้อของให้ครบ แต่ห้ามเกินงบนะ!</p>
            <div className="mh-plan-events">
              {PLAN_EVENTS.map((e) => (
                <button key={e.id} type="button" className="mh-card mh-plan-event" data-testid={`mh-plan-event-${e.id}`} onClick={() => start(e)}>
                  <CharacterArt id={e.npc} size={64} />
                  <span className="mh-plan-event-text">
                    <b>
                      {e.icon} {e.title}
                    </b>
                    <span>👛 งบ {formatBS(e.budget)}</span>
                    <Stars n={player.plan?.best[e.id] ?? 0} size={18} />
                  </span>
                </button>
              ))}
            </div>
          </>
        )}

        {event && phase !== 'choose' && (
          <div className="mh-card mh-plan-head">
            <CharacterArt id={event.npc} size={60} mood={phase === 'done' ? 'happy' : 'normal'} />
            <div className="mh-bubble">
              <b>
                {event.icon} {event.title}
              </b>
              <div>{phase === 'done' ? event.done : event.story}</div>
            </div>
            <span className="mh-plan-wallet" data-testid="mh-plan-budget">
              👛 งบ {formatBS(event.budget)}
            </span>
          </div>
        )}

        {event && phase === 'pick' && <PickShelf event={event} cart={cart} setCart={setCart} onCheckout={() => setPhase('total')} />}

        {event && phase === 'total' && (
          <AskAmount
            key="total"
            event={event}
            question="รวมทั้งหมดกี่บาท?"
            answer={total}
            lines={explainTotal(event, cart)}
            receipt={cart}
            onMistake={() => setMistakes((m) => m + 1)}
            onDone={() => {
              if (total > event.budget) {
                setOver((o) => o + 1)
                return 'over'
              }
              setPhase('left')
              return 'ok'
            }}
            onBack={() => setPhase('pick')}
          />
        )}

        {event && phase === 'left' && (
          <AskAmount
            key="left"
            event={event}
            question={`งบ ${formatBS(event.budget)} ใช้ไป ${formatBS(total)} เหลือเงินเท่าไร?`}
            answer={event.budget - total}
            lines={explainLeft(event, total)}
            onMistake={() => setMistakes((m) => m + 1)}
            onDone={() => {
              finish(event, mistakes)
              return 'ok'
            }}
          />
        )}

        {event && phase === 'done' && result && (
          <div className="mh-card mh-plan-done" data-testid="mh-plan-done">
            <Confetti count={28} />
            <div className="mh-plan-table" aria-label="ของในงาน">
              {cartItems(event, cart).map((i) => (
                <span key={i.id} className="mh-plan-table-item">
                  {i.icon}
                </span>
              ))}
            </div>
            <h2 className="mh-step-title">จัดงานสำเร็จ!</h2>
            <Stars n={result.stars} size={52} reveal />
            <p>
              ใช้ไป {formatBS(total)} · เหลือ {formatBS(event.budget - total)}
              {over > 0 && ` · เคยเกินงบ ${over} ครั้ง`}
            </p>
            <div className="mh-result-rewards">
              <span className="mh-reward">🪙 +{result.coins}</span>
            </div>
            {result.stars < 3 && <p className="mh-soft">3 ดาว: ไม่เกินงบเลย และคิดถูกตั้งแต่ครั้งแรกทั้งสองข้อ</p>}
            <div className="mh-row-buttons">
              <button type="button" className="mh-btn mh-btn-soft" data-testid="mh-plan-again" onClick={() => start(event)}>
                🔁 จัดงานนี้อีกครั้ง
              </button>
              <button type="button" className="mh-btn mh-btn-gold" data-testid="mh-plan-other" onClick={() => setPhase('choose')}>
                🎉 เลือกงานอื่น
              </button>
              <Link to="/map" className="mh-btn mh-btn-go">
                🗺 กลับแผนที่
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/** ชั้นวางของ: แตะเพื่อใส่ตะกร้า/เอาออก รายการที่ต้องมีติ๊กให้เห็น แต่ไม่บอกยอดรวม */
function PickShelf({ event, cart, setCart, onCheckout }: { event: PlanEvent; cart: string[]; setCart: (c: string[]) => void; onCheckout: () => void }) {
  const missing = missingNeeds(event, cart)
  const ready = needsMet(event, cart)
  return (
    <div className="mh-plan-pick">
      <div className="mh-plan-needs" aria-label="ของที่ต้องมี">
        {Object.entries(event.needs).map(([cat, n]) => {
          const ok = !missing[cat]
          return (
            <span key={cat} className={`mh-plan-need ${ok ? 'is-ok' : ''}`}>
              {ok ? '✅' : '⬜'} {event.catNames[cat]} {n} อย่าง
            </span>
          )
        })}
      </div>
      {Object.keys(event.needs).map((cat) => (
        <div key={cat} className="mh-plan-shelf">
          <h3 className="mh-plan-shelf-title">{event.catNames[cat]}</h3>
          <div className="mh-plan-items">
            {event.items
              .filter((i) => i.cat === cat)
              .map((i) => {
                const on = cart.includes(i.id)
                return (
                  <button
                    key={i.id}
                    type="button"
                    className={`mh-plan-item ${on ? 'is-on' : ''}`}
                    aria-pressed={on}
                    data-testid={`mh-plan-item-${i.id}`}
                    onClick={() => {
                      playSound(on ? 'click' : 'coin')
                      setCart(on ? cart.filter((x) => x !== i.id) : [...cart, i.id])
                    }}
                  >
                    <span className="mh-plan-item-icon">{i.icon}</span>
                    <span className="mh-plan-item-name">{i.name}</span>
                    <span className="mh-plan-price">{formatBS(i.price)}</span>
                    {on && <span className="mh-plan-tick">✔</span>}
                  </button>
                )
              })}
          </div>
        </div>
      ))}
      <div className="mh-card mh-plan-cart">
        <span>🧺 ในตะกร้า {cart.length} อย่าง</span>
        <span className="mh-soft">ราคารวมต้องคิดเองตอนจ่ายเงินนะ</span>
        <button type="button" className="mh-btn mh-btn-gold" disabled={!ready} data-testid="mh-plan-checkout" onClick={onCheckout}>
          🧾 ไปคิดเงิน
        </button>
      </div>
    </div>
  )
}

/** ถามจำนวนเงิน: ผิดครั้งแรกให้ลองใหม่ ผิดครั้งที่สองแสดงวิธีคิด */
function AskAmount({
  event,
  question,
  answer,
  lines,
  receipt,
  onMistake,
  onDone,
  onBack,
}: {
  event: PlanEvent
  question: string
  answer: number
  lines: string[]
  receipt?: string[]
  onMistake: () => void
  /** slips = จำนวนครั้งที่ตอบผิดในข้อนี้ · คืน 'over' ถ้ายอดเกินงบ */
  onDone: (slips: number) => 'ok' | 'over'
  onBack?: () => void
}) {
  const [baht, setBaht] = useState('')
  const [satang, setSatang] = useState('')
  const [tries, setTries] = useState(0)
  const [state, setState] = useState<'ask' | 'wrong' | 'reveal' | 'over'>('ask')
  const [error, setError] = useState('')

  const next = (slips: number) => {
    if (onDone(slips) === 'over') {
      setState('over')
      playSound('wrong')
      speak(`รวม ${formatBS(answer)} เกินงบ ${formatBS(answer - event.budget)} ลองเปลี่ยนเป็นของที่ถูกกว่านะ`)
    }
  }

  const submit = () => {
    const read = readBahtSatang(baht, event.satang ? satang : '')
    if ('error' in read) {
      setError(read.error)
      return
    }
    setError('')
    if (read.value === answer) {
      playSound('correct')
      speak(tries === 0 ? 'ถูกต้อง เก่งมาก' : 'ถูกแล้ว')
      next(tries)
      return
    }
    onMistake()
    playSound('wrong')
    const t = tries + 1
    setTries(t)
    setState(t >= 2 ? 'reveal' : 'wrong')
    speak(t >= 2 ? 'มาดูวิธีคิดกัน' : read.value > answer ? 'มากไปนิด ลองคิดอีกครั้งนะ' : 'น้อยไปหน่อย ลองคิดอีกครั้งนะ')
    if (t < 2) {
      setBaht('')
      setSatang('')
    }
  }

  return (
    <div className="mh-card mh-plan-ask" data-testid="mh-plan-ask">
      {receipt && (
        <ul className="mh-plan-receipt" aria-label="ใบเสร็จ">
          {cartItems(event, receipt).map((i) => (
            <li key={i.id}>
              <span>
                {i.icon} {i.name}
              </span>
              <b>{formatBS(i.price)}</b>
            </li>
          ))}
          <li className="mh-plan-receipt-total">
            <span>รวม</span>
            <b>?</b>
          </li>
        </ul>
      )}
      <h3 className="mh-step-title">{question}</h3>
      {state === 'over' ? (
        <div className="mh-feedback mh-feedback-wrong" role="status" data-testid="mh-plan-over">
          <strong>
            😮 รวม {formatBS(answer)} เกินงบไป {formatBS(answer - event.budget)}!
          </strong>
          <p>ลองเอาของบางอย่างออก หรือเปลี่ยนเป็นของที่ถูกกว่า</p>
          <button type="button" className="mh-btn mh-btn-go" data-testid="mh-plan-back" onClick={onBack}>
            🔁 กลับไปเปลี่ยนของ
          </button>
        </div>
      ) : state === 'reveal' ? (
        <div className="mh-feedback mh-feedback-reveal" role="status" data-testid="mh-plan-reveal">
          <strong>💡 มาดูวิธีคิดกัน</strong>
          <ol className="mh-steps mh-steps-full">
            {lines.map((l, i) => (
              <li key={i}>{l}</li>
            ))}
          </ol>
          <div className="mh-answer-line">คำตอบ: {formatBS(answer)}</div>
          <button type="button" className="mh-btn mh-btn-go mh-btn-block" data-testid="mh-plan-next" onClick={() => next(tries)}>
            เข้าใจแล้ว ไปต่อ ▶
          </button>
        </div>
      ) : (
        <div className="mh-answer-box">
          <div className="mh-fields">
            <BigField value={baht} onChange={setBaht} label="บาท" testId="mh-plan-baht" onEnter={submit} />
            {event.satang && <BigField value={satang} onChange={setSatang} label="สตางค์" testId="mh-plan-satang" width="sm" onEnter={submit} />}
          </div>
          {state === 'wrong' && (
            <p className="mh-feedback-text" role="status">
              ↺ ยังไม่ถูก ลองบวก/ลบใหม่ทีละขั้นนะ {event.satang ? '(บาทกับบาท สตางค์กับสตางค์)' : ''}
            </p>
          )}
          {error && <p className="mh-feedback-text">{error}</p>}
          <button type="button" className="mh-btn mh-btn-go" data-testid="mh-plan-submit" disabled={baht.trim() === '' && satang.trim() === ''} onClick={submit}>
            ✔ ตรวจคำตอบ
          </button>
        </div>
      )}
    </div>
  )
}
