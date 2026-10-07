import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useGame } from '../hooks/useMoneyGame'
import { earn } from '../engine/ledger'
import {
  BINS,
  ECO_REWARD,
  PROFIT_PLAN,
  RECIPES,
  TRASH_BIN,
  allocTotal,
  countOf,
  changeQuestion,
  costQuestion,
  ecoStage,
  emptyAlloc,
  leftQuestion,
  makeCustomers,
  makeDay,
  profitQuestion,
  recipeCost,
  recordEcoDay,
  sellQuestion,
  serveCustomers,
  trashName,
  trashUnit,
  type Allocation,
  type EcoDay,
  type ProfitUse,
  type Recipe,
} from '../engine/eco'
import { CLASS_GOALS } from '../kad/kadData'
import { ProductArt, TrashArt } from '../kad/KadArt'
import { BinArt, TreeStage } from '../kad/KadSheets'
import { formatBS } from '../utils/money'
import { playSound } from '../utils/sound'
import { speak } from '../utils/speech'
import { TopBar } from '../components/TopBar'
import { StepRunner } from '../components/StepRunner'
import { AvatarArt, CharacterArt } from '../components/Art'
import { Confetti } from '../components/Effects'
import { Bunting } from '../components/Bunting'
import '../kad/kad.css'

/**
 * โหมดกาดรักษ์โลกในเกม (#/eco): เล่นครบวงจรหนึ่งวัน
 * เลือกสินค้า → คัดแยกขยะ → ขายขยะ → ซื้ออุปกรณ์ → ทำสินค้า → ตั้งราคา → ขาย/ทอน → กำไร → แบ่งกำไร
 * ยอดขายสะสมทำให้ต้นไม้ของหนูโต (100 / 200 / 300 บาท)
 */

type Phase = 'choose' | 'sort' | 'sell' | 'buy' | 'make' | 'price' | 'market' | 'profit' | 'share' | 'done'

const STEPS: { id: Phase; icon: string; label: string }[] = [
  { id: 'sort', icon: '♻️', label: 'คัดแยก' },
  { id: 'sell', icon: '🏦', label: 'ขายขยะ' },
  { id: 'buy', icon: '🛒', label: 'ซื้ออุปกรณ์' },
  { id: 'make', icon: '✂️', label: 'ทำสินค้า' },
  { id: 'price', icon: '🏷️', label: 'ตั้งราคา' },
  { id: 'market', icon: '🛍️', label: 'ขาย' },
  { id: 'profit', icon: '📈', label: 'กำไร' },
  { id: 'share', icon: '❤️', label: 'แบ่งกำไร' },
]

const MAKE_STEPS = [
  { icon: '✂️', label: 'ตัด' },
  { icon: '🧩', label: 'ประกอบ' },
  { icon: '🎨', label: 'ตกแต่ง' },
]

const EARN_LABEL = 'ตอบถูก กาดรักษ์โลก'

function Stepper({ phase }: { phase: Phase }) {
  const at = STEPS.findIndex((s) => s.id === phase)
  return (
    <ol className="eco-steps" aria-label="ขั้นตอนของวันนี้">
      {STEPS.map((s, i) => (
        <li key={s.id} className={i < at || phase === 'done' ? 'is-done' : i === at ? 'is-now' : ''}>
          <span>{i < at || phase === 'done' ? '✓' : s.icon}</span>
          <small>{s.label}</small>
        </li>
      ))}
    </ol>
  )
}

function RecipeCard({ r, onPick }: { r: Recipe; onPick: () => void }) {
  return (
    <button type="button" className="eco-recipe" onClick={onPick} data-testid={`eco-recipe-${r.id}`}>
      <span className="eco-recipe-art">
        <ProductArt id={r.id} />
      </span>
      <b>{r.name}</b>
      <small>
        ♻️ ใช้ขยะ{' '}
        {Object.entries(r.uses)
          .map(([id, n]) => `${trashName(id)} ${n} ${trashUnit(id)}`)
          .join(' + ')}
      </small>
      <small>🛒 ซื้อ {r.buy.map((m) => `${m.icon} ${m.name} ${formatBS(m.price)}`).join(' · ')}</small>
      <small>
        ✨ ทำได้ {r.makes} {r.unit} · ขาย {r.prices[0]}–{r.prices[r.prices.length - 1]} บาท
      </small>
    </button>
  )
}

export function EcoPage() {
  const { player, updatePlayer } = useGame()
  const [phase, setPhase] = useState<Phase>('choose')
  const [day, setDay] = useState<EcoDay | null>(null)
  const [sorted, setSorted] = useState<number[]>([])
  const [selected, setSelected] = useState<number | null>(null)
  const [shake, setShake] = useState<string | null>(null)
  const [made, setMade] = useState(0)
  const [price, setPrice] = useState<number | null>(null)
  const [alloc, setAlloc] = useState<Allocation>(emptyAlloc)
  const [reward, setReward] = useState<{ coins: number; saved: number; stageUp: boolean } | null>(null)
  const recipe = day?.recipe ?? null
  const customers = useMemo(() => (day ? makeCustomers(day.recipe) : []), [day])
  const serves = useMemo(() => (recipe && price !== null ? serveCustomers(customers, price, recipe.makes) : []), [customers, price, recipe])
  const sales = serves.flatMap((s) => (s.sale ? [s.sale] : []))
  const income = sales.reduce((s, x) => s + x.total, 0)
  const cost = recipe ? recipeCost(recipe) : 0
  const profit = income - cost
  // โจทย์ของแต่ละช่วง สร้างครั้งเดียวต่อวัน
  const sellQs = useMemo(() => (day ? [sellQuestion(day)] : []), [day])
  const buyQs = useMemo(() => (day ? [costQuestion(day.recipe), leftQuestion(day.start + day.payout, day.cost)] : []), [day])
  const marketQs = useMemo(() => (recipe && price !== null ? sales.map((s) => changeQuestion(s, recipe, price)) : []), [recipe, price, serves])
  const profitQs = useMemo(() => {
    const q = price !== null ? profitQuestion(income, cost) : null
    return q ? [q] : []
  }, [price, income, cost])

  if (!player) return null
  const eco = player.eco
  const stage = ecoStage(eco)

  const start = (r: Recipe) => {
    playSound('click')
    setDay(makeDay(r, eco.invest, undefined, eco.bag))
    setSorted([])
    setSelected(null)
    setMade(0)
    setPrice(null)
    setAlloc(emptyAlloc())
    setReward(null)
    setPhase('sort')
    speak(`วันนี้เราจะทำ${r.name} มาคัดแยกขยะกันก่อน`)
  }

  const dropIn = (bin: string) => {
    if (!day || selected === null) return
    const id = day.pile[selected]
    if (TRASH_BIN[id] === bin) {
      playSound('coin')
      const next = [...sorted, selected]
      setSorted(next)
      setSelected(null)
      if (next.length === day.pile.length) speak('คัดแยกครบแล้ว เก่งมาก!')
    } else {
      playSound('wrong')
      setShake(bin)
      window.setTimeout(() => setShake(null), 450)
      const right = BINS.find((b) => b.id === TRASH_BIN[id])?.name ?? ''
      speak(`${trashName(id)} ต้องใส่ถัง${right}นะ`)
    }
  }

  const finishDay = (a: Allocation) => {
    if (!recipe) return
    const savedCoins = Math.floor(a.save / 100)
    const before = ecoStage(eco).stage
    const after = ecoStage({ ...eco, sales: eco.sales + income }).stage
    updatePlayer((p) => {
      let next = earn(p, ECO_REWARD.coins, 'รางวัลกาดรักษ์โลก', '🌱')
      next = earn(next, savedCoins, 'ออมจากกาดรักษ์โลก', '💰')
      return { ...next, exp: next.exp + ECO_REWARD.exp, eco: recordEcoDay(p.eco, { sales: income, profit, alloc: a }) }
    })
    setReward({ coins: ECO_REWARD.coins + savedCoins, saved: savedCoins, stageUp: after > before })
    setPhase('done')
    playSound('complete')
    if (after > before) window.setTimeout(() => playSound('unlock'), 500)
  }

  const step = (id: ProfitUse, d: number) => {
    const left = profit - allocTotal(alloc)
    const v = Math.max(0, Math.min(alloc[id] + d * 100, alloc[id] + left))
    if (v === alloc[id]) return
    playSound('click')
    setAlloc({ ...alloc, [id]: v })
  }

  return (
    <div className="mh-level theme-start eco-page">
      <TopBar compact />
      <div className="mh-page">
        <div className="mh-page-head">
          <Link to="/map" className="mh-icon-btn" aria-label="กลับแผนที่">
            <ArrowLeft size={24} />
          </Link>
          <h1 className="mh-title mh-level-title">🌱 กาดรักษ์โลก</h1>
          <span className="eco-day-chip">วันที่ {eco.days + 1}</span>
        </div>
        {phase !== 'choose' && <Stepper phase={phase} />}

        {phase === 'choose' && (
          <div className="eco-choose" data-testid="eco-choose">
            <div className="mh-card eco-tree-card">
              <Bunting count={12} />
              <div className="eco-tree">
                <TreeStage stage={stage.stage} />
              </div>
              <div>
                <h2 className="mh-step-title">เปลี่ยนขยะให้เป็นเงิน เปลี่ยนเงินให้เป็นไอเดีย</h2>
                <p>
                  ยอดขายสะสม <b>{formatBS(eco.sales)}</b> ·{' '}
                  {stage.next ? (
                    <>
                      อีก {stage.need} บาท {stage.next.icon} {stage.next.label}
                    </>
                  ) : (
                    'สวนรักษ์โลกเสร็จสมบูรณ์แล้ว 🎉'
                  )}
                </p>
                {eco.invest > 0 && <p className="eco-note">🌱 มีทุนยกมาจากเมื่อวาน {formatBS(eco.invest)}</p>}
                <p className="eco-note" data-testid="eco-bag">
                  🧺 ถุงขยะที่เก็บจากถนนในเมือง:{' '}
                  {eco.bag.length > 0
                    ? `${Object.entries(countOf(eco.bag))
                        .map(([id, n]) => `${trashName(id)} ${n}`)
                        .join(' · ')} (จะขายได้เงินเพิ่ม!)`
                    : 'ยังว่าง เดินเก็บขยะบนถนนในแผนที่ได้วันละ 6 ชิ้น'}
                </p>
              </div>
            </div>
            <h2 className="mh-section-title">วันนี้อยากทำสินค้าอะไรขาย?</h2>
            <div className="eco-recipes">
              {RECIPES.map((r) => (
                <RecipeCard key={r.id} r={r} onPick={() => start(r)} />
              ))}
            </div>
          </div>
        )}

        {phase === 'sort' && day && (
          <div className="mh-card eco-sort" data-testid="eco-sort">
            <div className="eco-say">
              <CharacterArt id="rabbit" size={64} mood="happy" />
              <p>
                แตะขยะ 1 ชิ้น แล้วแตะถังที่ถูกต้อง · <b>พลาสติก</b> ขวด ฝา ภาชนะ · <b>โลหะ</b> กระป๋อง · <b>กระดาษ</b> กล่อง กระดาษ
              </p>
            </div>
            <div className="eco-pile">
              {day.pile.map((id, i) =>
                sorted.includes(i) ? null : (
                  <button
                    key={i}
                    type="button"
                    className={`eco-trash ${selected === i ? 'is-on' : ''}`}
                    onClick={() => {
                      playSound('click')
                      setSelected(i)
                    }}
                    aria-label={trashName(id)}
                    data-bin={TRASH_BIN[id]}
                    data-testid={`eco-trash-${i}`}
                  >
                    <TrashArt id={id} />
                  </button>
                ),
              )}
              {sorted.length === day.pile.length && <p className="eco-done-msg">✨ คัดแยกครบ {day.pile.length} ชิ้นแล้ว!</p>}
            </div>
            <div className="eco-bins">
              {BINS.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  className={`eco-bin ${shake === b.id ? 'is-shake' : ''}`}
                  onClick={() => dropIn(b.id)}
                  disabled={selected === null}
                  data-testid={`eco-bin-${b.id}`}
                >
                  <BinArt color={b.color} label={b.name} />
                  <small>{day.pile.filter((id, i) => sorted.includes(i) && TRASH_BIN[id] === b.id).length} ชิ้น</small>
                </button>
              ))}
            </div>
            {sorted.length === day.pile.length && (
              <button
                type="button"
                className="mh-btn mh-btn-gold mh-btn-block"
                onClick={() => {
                  playSound('click')
                  setPhase('sell')
                }}
                data-testid="eco-to-sell"
              >
                🏦 นำขยะไปขายให้ธนาคารขยะ ▶
              </button>
            )}
          </div>
        )}

        {phase === 'sell' && day && (
          <div className="eco-runner" data-testid="eco-sell">
            <div className="mh-card eco-info">
              <span>
                🧺 เก็บไว้ทำ{day.recipe.name}:{' '}
                {Object.entries(day.keep)
                  .map(([id, n]) => `${trashName(id)} ${n} ${trashUnit(id)}`)
                  .join(' · ')}
              </span>
              <span>🏦 ที่เหลือขายให้ธนาคารขยะ</span>
            </div>
            <StepRunner key="sell" questions={sellQs} levelId={-1} mode="practice" earnLabel={EARN_LABEL} onFinish={() => setPhase('buy')} />
          </div>
        )}

        {phase === 'buy' && day && (
          <div className="eco-runner" data-testid="eco-buy">
            <div className="mh-card eco-info">
              <span>
                💰 ได้เงินจากขยะ <b>{formatBS(day.payout)}</b>
                {day.start > 0 && <> + ทุนยกมา {formatBS(day.start)}</>}
              </span>
              <span>🛒 ไปร้านลุงหมีซื้ออุปกรณ์</span>
            </div>
            <StepRunner key="buy" questions={buyQs} levelId={-1} mode="practice" earnLabel={EARN_LABEL} onFinish={() => setPhase('make')} />
          </div>
        )}

        {phase === 'make' && recipe && (
          <div className="mh-card eco-make mh-center" data-testid="eco-make">
            {made >= MAKE_STEPS.length && <Confetti count={24} />}
            <h2 className="mh-step-title">ลงมือทำ{recipe.name}!</h2>
            <div className={`eco-make-stage ${made >= MAKE_STEPS.length ? 'is-done' : ''}`}>
              {made < MAKE_STEPS.length ? (
                <>
                  {Object.entries(recipe.uses).map(([id]) => (
                    <span key={id} className="eco-make-trash">
                      <TrashArt id={id} />
                    </span>
                  ))}
                  <span className="eco-make-plus">+</span>
                  {recipe.buy.map((m) => (
                    <span key={m.name} className="eco-make-mat">
                      {m.icon}
                    </span>
                  ))}
                </>
              ) : (
                Array.from({ length: recipe.makes }, (_, i) => (
                  <span key={i} className="eco-made">
                    <ProductArt id={recipe.id} />
                  </span>
                ))
              )}
            </div>
            {made < MAKE_STEPS.length ? (
              <div className="mh-row-buttons">
                {MAKE_STEPS.map((m, i) => (
                  <button
                    key={m.label}
                    type="button"
                    className={`mh-btn ${i < made ? 'mh-btn-soft' : i === made ? 'mh-btn-go' : 'mh-btn-soft'}`}
                    disabled={i !== made}
                    onClick={() => {
                      playSound(i === MAKE_STEPS.length - 1 ? 'star' : 'jump')
                      setMade(i + 1)
                    }}
                    data-testid={`eco-make-${i}`}
                  >
                    {i < made ? '✓' : m.icon} {m.label}
                  </button>
                ))}
              </div>
            ) : (
              <>
                <p>
                  ได้{recipe.name} <b>{recipe.makes}</b> {recipe.unit} พร้อมขายแล้ว! ต้นทุน {formatBS(cost)}
                </p>
                <button
                  type="button"
                  className="mh-btn mh-btn-gold mh-btn-block"
                  onClick={() => {
                    playSound('click')
                    setPhase('price')
                  }}
                  data-testid="eco-to-price"
                >
                  🏷️ ไปตั้งราคา ▶
                </button>
              </>
            )}
          </div>
        )}

        {phase === 'price' && recipe && (
          <div className="mh-card eco-price mh-center" data-testid="eco-price">
            <h2 className="mh-step-title">ตั้งราคา{recipe.name} {recipe.unit}ละกี่บาท?</h2>
            <p className="eco-note">💡 ราคาถูก ลูกค้าซื้อหลายคน · ราคาแพง ได้เงินต่อชิ้นมาก แต่ลูกค้าบางคนอาจไม่ซื้อ · ต้นทุน {formatBS(cost)}</p>
            <div className="eco-price-row">
              {recipe.prices.map((v) => (
                <button
                  key={v}
                  type="button"
                  className="eco-price-tag"
                  onClick={() => {
                    playSound('coin')
                    setPrice(v)
                    setPhase('market')
                  }}
                  data-testid={`eco-price-${v}`}
                >
                  <span className="eco-price-art">
                    <ProductArt id={recipe.id} />
                  </span>
                  <b>{v} บาท</b>
                </button>
              ))}
            </div>
          </div>
        )}

        {phase === 'market' && recipe && price !== null && (
          <div className="eco-runner" data-testid="eco-market">
            <div className="mh-card eco-queue">
              <b>
                🛍️ เปิดร้าน! {recipe.name} {recipe.unit}ละ {price} บาท (มี {recipe.makes} {recipe.unit})
              </b>
              <div className="eco-customers">
                {serves.map((s) => (
                  <span key={s.customer.npc} className={`eco-customer is-${s.result}`}>
                    <CharacterArt id={s.customer.npc} size={56} mood={s.result === 'sold' ? 'happy' : 'think'} />
                    <small>
                      {s.customer.name}:{' '}
                      {s.result === 'sold' ? `ซื้อ ${s.sale?.qty} ${recipe.unit}` : s.result === 'pricey' ? 'แพงไปหน่อย ไม่ซื้อ' : 'ของหมดแล้ว'}
                    </small>
                  </span>
                ))}
              </div>
            </div>
            {marketQs.length > 0 ? (
              <StepRunner key={`market-${price}`} questions={marketQs} levelId={-1} mode="practice" earnLabel={EARN_LABEL} onFinish={() => setPhase('profit')} />
            ) : (
              <div className="mh-card mh-center">
                <p>วันนี้ยังขายไม่ได้เลย ราคาอาจแพงไปสำหรับลูกค้า</p>
                <button type="button" className="mh-btn mh-btn-go" onClick={() => setPhase('profit')} data-testid="eco-to-profit">
                  📈 ไปดูกำไร/ขาดทุน ▶
                </button>
              </div>
            )}
          </div>
        )}

        {phase === 'profit' && recipe && (
          <div className="eco-runner" data-testid="eco-profit">
            <div className="mh-card eco-info">
              <span>
                🛍️ รายได้จากการขาย <b>{formatBS(income)}</b>
              </span>
              <span>
                🛒 ต้นทุน (ค่าอุปกรณ์) <b>{formatBS(cost)}</b>
              </span>
            </div>
            {profitQs.length > 0 ? (
              <StepRunner key="profit" questions={profitQs} levelId={-1} mode="practice" earnLabel={EARN_LABEL} onFinish={() => (profit > 0 ? setPhase('share') : finishDay(emptyAlloc()))} />
            ) : (
              <div className="mh-card mh-center">
                <p>รายได้เท่ากับต้นทุนพอดี = เท่าทุน ไม่กำไร ไม่ขาดทุน</p>
                <button type="button" className="mh-btn mh-btn-go" onClick={() => finishDay(emptyAlloc())} data-testid="eco-finish">
                  ✔ สรุปวันนี้
                </button>
              </div>
            )}
          </div>
        )}

        {phase === 'share' && (
          <div className="mh-card eco-share" data-testid="eco-share">
            <h2 className="mh-step-title">แบ่งกำไร {formatBS(profit)} ไปใช้ทำอะไรดี?</h2>
            <p className="eco-note">
              เหลือให้แบ่งอีก <b data-testid="eco-share-left">{formatBS(profit - allocTotal(alloc))}</b> · ทุกส่วนรวมกันต้องเท่ากับกำไรพอดี
            </p>
            <div className="eco-plan">
              {PROFIT_PLAN.map((u) => (
                <div key={u.id} className="eco-plan-row">
                  <span className="eco-plan-icon">{u.icon}</span>
                  <span className="eco-plan-text">
                    <b>{u.label}</b>
                    <small>{u.note}</small>
                  </span>
                  <span className="eco-plan-ctl">
                    <button type="button" className="mh-icon-btn" onClick={() => step(u.id, -1)} aria-label={`ลด ${u.label}`} data-testid={`eco-alloc-${u.id}-minus`}>
                      −
                    </button>
                    <b className="eco-plan-amt">{formatBS(alloc[u.id])}</b>
                    <button type="button" className="mh-icon-btn" onClick={() => step(u.id, 1)} aria-label={`เพิ่ม ${u.label}`} data-testid={`eco-alloc-${u.id}-plus`}>
                      +
                    </button>
                    <button type="button" className="mh-btn mh-btn-soft mh-btn-sm" onClick={() => step(u.id, 1e6)} data-testid={`eco-alloc-${u.id}-rest`}>
                      ใส่ที่เหลือ
                    </button>
                  </span>
                </div>
              ))}
            </div>
            <p className="eco-eq">
              {PROFIT_PLAN.map((u) => formatBS(alloc[u.id])).join(' + ')} = {formatBS(allocTotal(alloc))}
              {allocTotal(alloc) === profit ? ' ✔' : ''}
            </p>
            <button
              type="button"
              className="mh-btn mh-btn-gold mh-btn-block"
              disabled={allocTotal(alloc) !== profit}
              onClick={() => finishDay(alloc)}
              data-testid="eco-share-done"
            >
              ✔ ยืนยันการแบ่งกำไร
            </button>
          </div>
        )}

        {phase === 'done' && recipe && reward && (
          <div className="mh-card eco-done mh-center" data-testid="eco-done">
            <Confetti />
            <div className="mh-result-banner">จบวันที่ {eco.days} แล้ว!</div>
            <div className="mh-result-cast">
              <AvatarArt avatar={player.avatar} size={100} mood="happy" wear={player.wear} pet />
              <div className={`eco-tree ${reward.stageUp ? 'is-grow' : ''}`}>
                <TreeStage stage={stage.stage} />
              </div>
            </div>
            {reward.stageUp && <p className="eco-unlock">🎉 ปลดล็อก {CLASS_GOALS[stage.stage - 1]?.label ?? ''}!</p>}
            <table className="mh-table eco-book" data-testid="eco-book">
              <tbody>
                {day && day.start > 0 && (
                  <tr>
                    <td>🌱 ทุนยกมา</td>
                    <td className="eco-in">+{formatBS(day.start)}</td>
                  </tr>
                )}
                <tr>
                  <td>♻️ ขายขยะ</td>
                  <td className="eco-in">+{formatBS(day?.payout ?? 0)}</td>
                </tr>
                <tr>
                  <td>🛒 ซื้ออุปกรณ์ (ต้นทุน)</td>
                  <td className="eco-out">−{formatBS(cost)}</td>
                </tr>
                <tr>
                  <td>🛍️ ขาย{recipe.name}</td>
                  <td className="eco-in">+{formatBS(income)}</td>
                </tr>
                <tr className="eco-book-profit">
                  <td>{profit >= 0 ? '📈 กำไร' : '📉 ขาดทุน'} (ขาย − ต้นทุน)</td>
                  <td>{formatBS(Math.abs(profit))}</td>
                </tr>
              </tbody>
            </table>
            <p>
              ได้ +{reward.coins} 🪙{reward.saved > 0 ? ` (รวมเงินออม ${reward.saved} เหรียญลงกระปุก)` : ''} · +{ECO_REWARD.exp} EXP
            </p>
            <div className="mh-row-buttons">
              <button
                type="button"
                className="mh-btn mh-btn-go"
                onClick={() => {
                  playSound('click')
                  setPhase('choose')
                }}
                data-testid="eco-again"
              >
                🌞 เล่นวันต่อไป
              </button>
              <Link to="/map" className="mh-btn mh-btn-gold">
                🗺 กลับแผนที่
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
