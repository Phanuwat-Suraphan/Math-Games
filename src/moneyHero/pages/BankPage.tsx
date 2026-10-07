import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useGame } from '../hooks/useMoneyGame'
import { SHOP_ITEMS, shopItem } from '../data/shop'
import { denom } from '../data/denominations'
import { setGoal } from '../engine/progress'
import { goalProgress, ledgerBook, ledgerQuiz, type LedgerQuiz } from '../engine/ledger'
import { fewestPieces, summarize } from '../engine/sandbox'
import { CharacterArt, MoneyPiece } from '../components/Art'
import { PiggyBank } from '../components/PiggyBank'
import { TopBar } from '../components/TopBar'
import { Bunting } from '../components/Bunting'
import { Burst, Confetti } from '../components/Effects'
import { playSound } from '../utils/sound'
import { speak } from '../utils/speech'
import { ItemPreview } from './ShopPage'

/**
 * กระปุกออมสินของฮีโร่ (#/bank)
 * - กระปุกหมูแตะแล้วดุ๊กดิก บอกว่ามีเงินเท่าไร และถ้าเป็นเงินบาทจะแลกเป็นธนบัตร/เหรียญอย่างไร
 * - ตั้งเป้าหมายการออม (ของในร้าน) แล้วดูว่าขาดอีกเท่าไร
 * - สมุดบัญชีรายรับรายจ่ายของเด็กเอง (ยอดยกมา + รายรับ − รายจ่าย = คงเหลือ)
 * - นกฮูกตั้งคำถามจากสมุดของเด็กเอง
 */

const MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']
const SHORT_ROWS = 10

function shortDate(ms: number): string {
  const d = new Date(ms)
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`
}

export function BankPage() {
  const { player, updatePlayer } = useGame()
  const [wiggle, setWiggle] = useState(0)
  const [all, setAll] = useState(false)
  const [picking, setPicking] = useState(false)
  const [quiz, setQuiz] = useState<LedgerQuiz | null>(null)
  const [picked, setPicked] = useState<number | null>(null)
  const coins = player?.coins ?? 0
  const pieces = useMemo(() => summarize(fewestPieces(coins * 100)).groups, [coins])
  if (!player) return null

  const total = player.ledger.length
  const book = ledgerBook(player, all ? undefined : SHORT_ROWS)
  const goal = shopItem(player.goal)
  const prog = goal ? goalProgress(player.coins, goal.price) : null
  const choices = SHOP_ITEMS.filter((i) => !player.owned.includes(i.id))

  const shake = () => {
    setWiggle((n) => n + 1)
    playSound(wiggle % 2 === 0 ? 'jingle' : 'oink')
    speak(`ในกระปุกมี ${player.coins} เหรียญ`)
  }

  const newQuiz = () => {
    playSound('click')
    setPicked(null)
    setQuiz(ledgerQuiz(ledgerBook(player)))
  }

  const answer = (v: number) => {
    if (!quiz || picked !== null) return
    setPicked(v)
    const ok = v === quiz.answer
    playSound(ok ? 'correct' : 'wrong')
    speak(ok ? `ถูกต้อง! ${quiz.answer} เหรียญ` : `ยังไม่ใช่ คำตอบคือ ${quiz.answer} เหรียญ`)
  }

  return (
    <div className="mh-level theme-start">
      <TopBar />
      <div className="mh-page">
        <div className="mh-page-head">
          <Link to="/map" className="mh-icon-btn" aria-label="กลับแผนที่">
            <ArrowLeft size={24} />
          </Link>
          <h1 className="mh-title mh-level-title">🐷 กระปุกออมสิน</h1>
        </div>

        <div className="mh-bank-top">
          <div className="mh-card mh-bank-stage">
            <Bunting count={10} />
            <button type="button" className="mh-piggy-btn" onClick={shake} aria-label="เขย่ากระปุก" data-testid="mh-piggy">
              <span key={wiggle} className={`mh-piggy-wrap ${wiggle > 0 ? 'is-shake' : ''}`}>
                <PiggyBank fill={prog ? prog.ratio : Math.min(1, player.coins / 300)} happy={wiggle > 0 || !!prog?.done} />
                {wiggle > 0 &&
                  [0, 1, 2].map((i) => (
                    <span key={i} className={`mh-piggy-coin mh-piggy-coin-${i}`} aria-hidden="true">
                      🪙
                    </span>
                  ))}
              </span>
            </button>
            <div className="mh-bank-balance" data-testid="mh-bank-balance">
              มีอยู่ <b>{player.coins}</b> เหรียญ
            </div>
            <p className="mh-soft mh-center">แตะกระปุกเพื่อเขย่า 🎶</p>
          </div>

          <div className="mh-card mh-bank-pieces">
            <h3 className="mh-card-title">💱 ถ้าเหรียญของหนูเป็นเงินบาท</h3>
            <p className="mh-soft">แลกเป็นธนบัตรและเหรียญได้ "น้อยชิ้นที่สุด" แบบนี้</p>
            <div className="mh-bank-piece-row" data-testid="mh-bank-pieces">
              {pieces.length === 0 && <span className="mh-soft">ยังไม่มีเงินในกระปุก</span>}
              {pieces.map((g) => (
                <span key={g.id} className="mh-bank-piece" title={g.label}>
                  <MoneyPiece id={g.id} base={denom(g.id).kind === 'coin' ? 40 : 30} />
                  <b>× {g.count}</b>
                </span>
              ))}
            </div>
            {pieces.length > 0 && (
              <p className="mh-bank-sum">
                {pieces.map((g) => `${denom(g.id).value / 100}×${g.count}`).join(' + ')} = <b>{player.coins}</b> บาท
              </p>
            )}
          </div>
        </div>

        <div className="mh-card mh-goal-card" data-testid="mh-goal">
          {prog?.done && <Confetti count={20} />}
          <h3 className="mh-card-title">🎯 เป้าหมายการออม</h3>
          {goal && prog && !picking ? (
            <div className="mh-goal-body">
              <div className="mh-goal-preview">
                <ItemPreview item={goal} />
              </div>
              <div className="mh-goal-info">
                <b className="mh-goal-name">
                  {goal.icon} {goal.name} · 🪙 {goal.price}
                </b>
                <div className="mh-goal-track" role="progressbar" aria-valuemin={0} aria-valuemax={goal.price} aria-valuenow={prog.have}>
                  <div className="mh-goal-fill" style={{ width: `${Math.round(prog.ratio * 100)}%` }}>
                    <span className="mh-goal-pig" aria-hidden="true">
                      🐷
                    </span>
                  </div>
                </div>
                <p className="mh-goal-text" data-testid="mh-goal-text">
                  {prog.done ? (
                    <>
                      เก็บครบแล้ว! มี {player.coins} เหรียญ ซื้อได้เลย 🎉
                    </>
                  ) : (
                    <>
                      มี {player.coins} เหรียญ ราคา {goal.price} เหรียญ → ขาดอีก <b>{prog.need}</b> เหรียญ
                      <br />
                      <span className="mh-soft">
                        ({goal.price} − {player.coins} = {prog.need})
                      </span>
                    </>
                  )}
                </p>
                <div className="mh-row-buttons">
                  {prog.done && (
                    <Link to="/shop" className="mh-btn mh-btn-gold" data-testid="mh-goal-shop">
                      🛍️ ไปซื้อที่ร้าน
                    </Link>
                  )}
                  <button type="button" className="mh-btn mh-btn-soft mh-btn-sm" onClick={() => setPicking(true)}>
                    เปลี่ยนเป้าหมาย
                  </button>
                </div>
              </div>
            </div>
          ) : choices.length === 0 ? (
            <p className="mh-soft">หนูมีของในร้านครบทุกชิ้นแล้ว เก่งมาก! 🎉</p>
          ) : (
            <>
              <p className="mh-soft">อยากได้อะไรจากร้านของลุงหมี? เลือกเป็นเป้าหมาย แล้วค่อย ๆ ออมเหรียญไปให้ถึง</p>
              <div className="mh-goal-choices">
                {choices.map((i) => (
                  <button
                    key={i.id}
                    type="button"
                    className={`mh-goal-choice ${player.goal === i.id ? 'is-on' : ''}`}
                    onClick={() => {
                      playSound('star')
                      updatePlayer((p) => setGoal(p, i.id))
                      setPicking(false)
                    }}
                    data-testid={`mh-goal-${i.id}`}
                  >
                    <span className="mh-goal-choice-art">
                      <ItemPreview item={i} />
                    </span>
                    <span>{i.name}</span>
                    <b>🪙 {i.price}</b>
                  </button>
                ))}
              </div>
              {goal && (
                <button type="button" className="mh-btn mh-btn-soft mh-btn-sm" onClick={() => setPicking(false)}>
                  ยกเลิก
                </button>
              )}
            </>
          )}
        </div>

        <div className="mh-card mh-ledger-card">
          <h3 className="mh-card-title">📒 สมุดบัญชีรายรับรายจ่ายของ{player.name}</h3>
          <div className="mh-table-wrap">
            <table className="mh-table mh-ledger" data-testid="mh-ledger">
              <thead>
                <tr>
                  <th>วันที่</th>
                  <th>รายการ</th>
                  <th className="mh-num">รายรับ</th>
                  <th className="mh-num">รายจ่าย</th>
                  <th className="mh-num">คงเหลือ</th>
                </tr>
              </thead>
              <tbody>
                <tr className="mh-ledger-open">
                  <td>–</td>
                  <td>ยอดยกมา</td>
                  <td className="mh-num"></td>
                  <td className="mh-num"></td>
                  <td className="mh-num">{book.opening}</td>
                </tr>
                {book.rows.map((r, i) => (
                  <tr key={`${r.at}-${i}`} data-testid="mh-ledger-row">
                    <td>{shortDate(r.at)}</td>
                    <td>
                      <span aria-hidden="true">{r.icon}</span> {r.label}
                    </td>
                    <td className="mh-num mh-in">{r.amount > 0 ? r.amount : ''}</td>
                    <td className="mh-num mh-out">{r.amount < 0 ? -r.amount : ''}</td>
                    <td className="mh-num">{r.balance}</td>
                  </tr>
                ))}
                {book.rows.length === 0 && (
                  <tr>
                    <td colSpan={5} className="mh-soft mh-center">
                      ยังไม่มีรายการ ไปเล่นด่านรับเหรียญ แล้วกลับมาดูสมุดนะ
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot>
                <tr>
                  <th colSpan={2}>รวม</th>
                  <th className="mh-num mh-in" data-testid="mh-ledger-income">
                    {book.income}
                  </th>
                  <th className="mh-num mh-out" data-testid="mh-ledger-expense">
                    {book.expense}
                  </th>
                  <th className="mh-num">{book.closing}</th>
                </tr>
              </tfoot>
            </table>
          </div>
          <p className="mh-ledger-eq" data-testid="mh-ledger-eq">
            ยอดยกมา <b>{book.opening}</b> + รายรับ <b className="mh-in">{book.income}</b> − รายจ่าย <b className="mh-out">{book.expense}</b> = คงเหลือ <b>{book.closing}</b>
          </p>
          {total > SHORT_ROWS && (
            <button type="button" className="mh-btn mh-btn-soft mh-btn-sm" onClick={() => setAll((v) => !v)}>
              {all ? `ดูเฉพาะ ${SHORT_ROWS} รายการล่าสุด` : `ดูทั้งหมด ${total} รายการ`}
            </button>
          )}
        </div>

        <div className="mh-card mh-ledger-quiz" data-testid="mh-ledger-quiz">
          <div className="mh-ledger-quiz-head">
            <CharacterArt id="owl" size={76} mood={picked !== null && quiz && picked === quiz.answer ? 'happy' : 'normal'} />
            <div className="mh-bubble">
              {quiz ? quiz.text : total > 0 ? 'นกฮูกมีคำถามจากสมุดบัญชีของหนู ลองตอบดูไหม?' : 'พอมีรายการในสมุดแล้ว นกฮูกจะมาถามคำถามนะ'}
            </div>
          </div>
          {quiz && (
            <div className="mh-ledger-choices">
              {picked !== null && picked === quiz.answer && <Burst />}
              {quiz.choices.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`mh-choice ${picked === null ? '' : c === quiz.answer ? 'is-right' : c === picked ? 'is-wrong' : ''}`}
                  onClick={() => answer(c)}
                  disabled={picked !== null}
                  data-testid="mh-ledger-choice"
                >
                  {c} เหรียญ
                </button>
              ))}
            </div>
          )}
          {quiz && picked !== null && (
            <p className="mh-ledger-explain" data-testid="mh-ledger-explain">
              {quiz.entry.amount > 0 ? `${quiz.before} + ${quiz.entry.amount} = ${quiz.answer}` : `${quiz.before} − ${-quiz.entry.amount} = ${quiz.answer}`} เหรียญ
              {picked === quiz.answer ? ' ✔ ถูกต้อง!' : ''}
            </p>
          )}
          {total > 0 && (
            <button type="button" className="mh-btn mh-btn-go" onClick={newQuiz} data-testid="mh-ledger-ask">
              {quiz ? '🦉 ข้อใหม่' : '🦉 ถามเลย'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
