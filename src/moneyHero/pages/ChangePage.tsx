import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import type { DenomId } from '../engine/types'
import { useGame } from '../hooks/useMoneyGame'
import { earn } from '../engine/ledger'
import {
  CHANGE_TRAY,
  PRACTICE_CUSTOMERS,
  TIMED_SECONDS,
  checkChange,
  levelFor,
  makeOrder,
  roundCoins,
  roundStars,
  serveScore,
  type ChangeCheck,
  type Order,
} from '../engine/changeGame'
import { sumDenoms } from '../data/denominations'
import { formatBS } from '../utils/money'
import { playSound } from '../utils/sound'
import { speak } from '../utils/speech'
import { AvatarArt, CharacterArt, MoneyPiece } from '../components/Art'
import { ProductArt } from '../kad/KadArt'
import { TopBar } from '../components/TopBar'
import { Bunting } from '../components/Bunting'
import { Confetti, Burst } from '../components/Effects'
import { Stars } from '../components/Stars'
import '../kad/kad.css'

/**
 * ร้านทอนไว (#/change): ลูกค้ามาซื้อของที่แผงกาด จ่ายเงินมา แตะเงินในลิ้นชักให้ทอนพอดี
 * โหมดท้าเวลา 60 วินาที (ทำคอมโบ ทำสถิติ) และโหมดฝึก 8 ลูกค้า (ไม่จับเวลา)
 */

declare global {
  interface Window {
    __MH_CHANGE?: { change: number; solution: DenomId[]; served: number }
  }
}

type Mode = 'timed' | 'practice'
type Phase = 'intro' | 'play' | 'done'

export function ChangePage() {
  const { player, updatePlayer } = useGame()
  const [phase, setPhase] = useState<Phase>('intro')
  const [mode, setMode] = useState<Mode>('practice')
  const [order, setOrder] = useState<Order>(() => makeOrder(1))
  const [given, setGiven] = useState<DenomId[]>([])
  const [result, setResult] = useState<ChangeCheck | null>(null)
  const [served, setServed] = useState(0)
  const [combo, setCombo] = useState(0)
  const [score, setScore] = useState(0)
  const [mistakes, setMistakes] = useState(0)
  const [left, setLeft] = useState(TIMED_SECONDS)
  const [happy, setHappy] = useState(0)
  const [record, setRecord] = useState(false)
  const finished = useRef(false)

  useEffect(() => {
    window.__MH_CHANGE = phase === 'play' ? { change: order.change, solution: order.solution, served } : undefined
    return () => {
      window.__MH_CHANGE = undefined
    }
  }, [phase, order, served])

  const finish = useCallback(
    (servedNow: number) => {
      if (finished.current) return
      finished.current = true
      setPhase('done')
      playSound('complete')
      const best = mode === 'timed' && servedNow > (player?.changeBest ?? 0)
      setRecord(best)
      updatePlayer((p) => ({
        ...earn(p, roundCoins(servedNow), 'ร้านทอนไว', '💵'),
        exp: p.exp + servedNow * 3,
        changeBest: mode === 'timed' ? Math.max(p.changeBest, servedNow) : p.changeBest,
      }))
    },
    [mode, player?.changeBest, updatePlayer],
  )

  // นับถอยหลังโหมดท้าเวลา
  useEffect(() => {
    if (phase !== 'play' || mode !== 'timed') return
    if (left <= 0) {
      finish(served)
      return
    }
    const t = window.setTimeout(() => setLeft((s) => s - 1), 1000)
    return () => window.clearTimeout(t)
  }, [phase, mode, left, served, finish])

  if (!player) return null

  const start = (m: Mode) => {
    playSound('click')
    finished.current = false
    setMode(m)
    setOrder(makeOrder(1))
    setGiven([])
    setResult(null)
    setServed(0)
    setCombo(0)
    setScore(0)
    setMistakes(0)
    setLeft(TIMED_SECONDS)
    setRecord(false)
    setPhase('play')
  }

  const add = (id: DenomId) => {
    if (result?.ok) return
    playSound('coin')
    setResult(null)
    setGiven((g) => [...g, id])
  }

  const remove = (i: number) => {
    if (result?.ok) return
    playSound('click')
    setResult(null)
    setGiven((g) => g.filter((_, k) => k !== i))
  }

  const give = () => {
    const r = checkChange(order, given)
    setResult(r)
    if (!r.ok) {
      playSound('wrong')
      setCombo(0)
      if (given.length > 0) setMistakes((n) => n + 1)
      speak(r.message)
      return
    }
    playSound('correct')
    const nextServed = served + 1
    const nextCombo = combo + 1
    setServed(nextServed)
    setCombo(nextCombo)
    setScore((s) => s + serveScore(combo))
    setHappy((n) => n + 1)
    // ลูกค้าคนต่อไปเดินเข้ามา
    window.setTimeout(() => {
      if (mode === 'practice' && nextServed >= PRACTICE_CUSTOMERS) {
        finish(nextServed)
        return
      }
      setOrder((o) => makeOrder(levelFor(nextCombo), o.npc))
      setGiven([])
      setResult(null)
    }, 650)
  }

  const sum = sumDenoms(given)

  return (
    <div className="mh-level theme-start change-page">
      <TopBar compact />
      <div className="mh-page">
        <div className="mh-page-head">
          <Link to="/map" className="mh-icon-btn" aria-label="กลับแผนที่">
            <ArrowLeft size={24} />
          </Link>
          <h1 className="mh-title mh-level-title">💵 ร้านทอนไว</h1>
          {phase === 'play' && (
            <span className="change-chips">
              <span className="change-chip" data-testid="change-served">
                😊 {served}
                {mode === 'practice' ? `/${PRACTICE_CUSTOMERS}` : ''}
              </span>
              {combo >= 2 && (
                <span key={combo} className="change-chip is-combo">
                  🔥 x{combo}
                </span>
              )}
              <span className="change-chip">⭐ {score}</span>
            </span>
          )}
        </div>

        {phase === 'intro' && (
          <div className="mh-card change-intro mh-center" data-testid="change-intro">
            <Bunting count={12} />
            <div className="change-intro-cast">
              <CharacterArt id="rabbit" size={84} mood="happy" />
              <AvatarArt avatar={player.avatar} size={100} mood="happy" wear={player.wear} />
              <CharacterArt id="bear" size={84} mood="happy" />
            </div>
            <h2 className="mh-step-title">ลูกค้ามาแล้ว! ทอนเงินให้พอดีนะ</h2>
            <p>ดูราคาสินค้า ดูเงินที่ลูกค้าจ่าย แล้วแตะเงินในลิ้นชักเพื่อทอน · ทอนถูกติดกันได้คอมโบ 🔥 ยิ่งติดกันโจทย์ยิ่งยากขึ้น</p>
            <p className="mh-soft">สถิติสูงสุดโหมดท้าเวลา: {player.changeBest} คน</p>
            <div className="mh-row-buttons">
              <button type="button" className="mh-btn mh-btn-go mh-btn-xl" onClick={() => start('practice')} data-testid="change-practice">
                🌱 โหมดฝึก ({PRACTICE_CUSTOMERS} ลูกค้า)
              </button>
              <button type="button" className="mh-btn mh-btn-gold mh-btn-xl" onClick={() => start('timed')} data-testid="change-timed">
                ⏱️ ท้าเวลา {TIMED_SECONDS} วินาที
              </button>
            </div>
          </div>
        )}

        {phase === 'play' && (
          <div className="change-play" data-testid="change-play">
            {mode === 'timed' && (
              <div className="change-timer" aria-label={`เหลือเวลา ${left} วินาที`}>
                <div className={`change-timer-fill ${left <= 10 ? 'is-low' : ''}`} style={{ width: `${(left / TIMED_SECONDS) * 100}%` }} />
                <span>⏱️ {left} วิ</span>
              </div>
            )}
            <div className="mh-card change-counter">
              <svg viewBox="0 0 100 14" className="kad-awning change-awning" preserveAspectRatio="none" aria-hidden="true">
                {Array.from({ length: 10 }, (_, i) => (
                  <path key={i} d={`M${i * 10} 0 h10 v9 q-5 6 -10 0 z`} fill={i % 2 ? '#fff' : '#40c057'} stroke="#2b2350" strokeWidth="0.4" />
                ))}
              </svg>
              <div key={`${order.npc}-${served}`} className={`change-customer ${result?.ok ? 'is-happy' : ''}`}>
                {happy > 0 && result?.ok && <Burst />}
                <CharacterArt id={order.npc} size={110} mood={result?.ok ? 'happy' : result ? 'think' : 'normal'} />
                <div className="mh-bubble change-bubble" data-testid="change-order">
                  {order.name}: ขอซื้อ{order.productName}
                  {order.qty > 1 ? ` ${order.qty} ชิ้น` : ''} นะ
                  <span className="change-paid">
                    จ่าย
                    {order.paidWith.map((id, i) => (
                      <MoneyPiece key={i} id={id} base={30} />
                    ))}
                  </span>
                </div>
              </div>
              <div className="change-goods">
                {Array.from({ length: order.qty }, (_, i) => (
                  <span key={i} className="change-product">
                    <ProductArt id={order.product} />
                  </span>
                ))}
                <span className="change-tag" data-testid="change-price">
                  {order.qty > 1 ? `ชิ้นละ ${formatBS(order.price)} × ${order.qty} = ${formatBS(order.total)}` : `ราคา ${formatBS(order.total)}`}
                </span>
              </div>
            </div>

            <div className="mh-card change-drawer">
              <div className="change-math">
                ลูกค้าจ่าย <b>{formatBS(order.paid)}</b> − ราคา <b>{formatBS(order.total)}</b> = ทอน <b className="change-q">?</b>
              </div>
              <div className="change-given" aria-label="เงินทอนที่หยิบแล้ว แตะเพื่อคืน">
                {given.length === 0 && <span className="mh-soft">แตะเงินในลิ้นชักด้านล่างเพื่อหยิบเงินทอน 👇</span>}
                {given.map((id, i) => (
                  <button key={i} type="button" className="change-given-item" onClick={() => remove(i)} aria-label="คืนชิ้นนี้">
                    <MoneyPiece id={id} base={36} />
                  </button>
                ))}
                <span className="change-sum">
                  หยิบแล้ว <b>{formatBS(sum)}</b>
                </span>
              </div>
              <div className="change-tray" aria-label="ลิ้นชักเงิน">
                {CHANGE_TRAY.map((id) => (
                  <button key={id} type="button" className="change-tray-item" onClick={() => add(id)} data-testid={`change-tray-${id}`}>
                    <MoneyPiece id={id} base={40} />
                  </button>
                ))}
              </div>
              {result && (
                <div className={`mh-ar-result ${result.ok ? 'is-ok' : 'is-off'}`} role="status" data-testid={result.ok ? 'change-right' : 'change-wrong'}>
                  <span>{result.message}</span>
                </div>
              )}
              <div className="mh-row-buttons">
                <button
                  type="button"
                  className="mh-btn mh-btn-soft"
                  onClick={() => {
                    setGiven([])
                    setResult(null)
                  }}
                >
                  ↺ ล้าง
                </button>
                <button type="button" className="mh-btn mh-btn-go mh-btn-xl" onClick={give} disabled={result?.ok} data-testid="change-give">
                  💵 ทอนเงิน
                </button>
              </div>
            </div>
          </div>
        )}

        {phase === 'done' && (
          <div className="mh-card change-done mh-center mh-result" data-testid="change-done">
            <Confetti />
            <div className="mh-result-banner">{record ? 'สถิติใหม่!' : 'ปิดร้านแล้ว!'}</div>
            <div className="mh-result-cast">
              <AvatarArt avatar={player.avatar} size={100} mood="happy" wear={player.wear} pet />
              <CharacterArt id={order.npc} size={80} mood="happy" />
            </div>
            <Stars n={roundStars(served, mode, mistakes)} size={52} reveal />
            <p>
              ทอนเงินถูก <b>{served}</b> คน · คะแนน {score} · ได้ +{roundCoins(served)} 🪙 +{served * 3} EXP
            </p>
            {mode === 'timed' && <p className="mh-soft">สถิติสูงสุด {Math.max(player.changeBest, served)} คน · ทอนถูก 8 คนใน 60 วินาทีได้ตรา ⚡ ทอนไวทันใจ</p>}
            <div className="mh-row-buttons">
              <button type="button" className="mh-btn mh-btn-go" onClick={() => setPhase('intro')} data-testid="change-again">
                🔄 เล่นอีกครั้ง
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
