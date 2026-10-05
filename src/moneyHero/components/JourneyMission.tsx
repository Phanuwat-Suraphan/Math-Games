import { useMemo, useRef, useState } from 'react'
import type { Question, Response } from '../engine/types'
import type { LearnSlide } from '../data/levels'
import { CHARACTERS } from '../data/characters'
import { buildHomeQuestions, buildJourney, walletAfter, type JourneyEvent } from '../generators/journey'
import { formatBS } from '../utils/money'
import { playSound } from '../utils/sound'
import { speak } from '../utils/speech'
import { useGame } from '../hooks/useMoneyGame'
import { AvatarArt, CharacterArt } from './Art'
import { StepRunner, type RunSummary } from './StepRunner'

/**
 * FINAL MONEY MASTER · MISSION: หนึ่งวันในเมืองเงินทอง
 * 🏦 → 🛒 → 🍱 → 📚 → 🏪 → 🏠 เงินในกระเป๋าเปลี่ยนตามเหตุการณ์จริงของวัน
 * ร้านเครื่องเขียนให้เลือกของเอง และสมุดบัญชีที่บ้านสร้างจากสิ่งที่เกิดขึ้นทั้งวัน
 */
export function JourneyMission({ learn, onDone }: { learn: LearnSlide[]; onDone: (s: RunSummary) => void }) {
  const { player } = useGame()
  const stations = useMemo(() => buildJourney(), [])
  const [at, setAt] = useState(0)
  const [inside, setInside] = useState(false)
  const [events, setEvents] = useState<JourneyEvent[]>([])
  const picks = useRef<string[] | null>(null)
  const total = useRef<RunSummary>({ originals: 0, firstTry: 0, within2: 0, hints: 0, ms: 0, exp: 0, coins: 0, bySkill: {} })

  const station = stations[at]
  const questions = useMemo<Question[]>(
    () => (station.id === 'home' ? buildHomeQuestions(events) : station.questions),
    // สมุดบัญชีที่บ้านสร้างตอนเดินถึงบ้าน จากเหตุการณ์ทั้งวัน
    [at, inside],
  )
  const wallet = walletAfter(events)

  const onAnswer = (q: Question, r: Response) => {
    if (q.kind === 'shop' && r.kind === 'shop' && r.picked.length === q.pick) picks.current = r.picked
  }

  const leave = (s: RunSummary) => {
    const t = total.current
    t.originals += s.originals
    t.firstTry += s.firstTry
    t.within2 += s.within2
    t.hints += s.hints
    t.ms += s.ms
    t.exp += s.exp
    t.coins += s.coins
    for (const [k, v] of Object.entries(s.bySkill)) {
      const cur = (t.bySkill[k] ??= { correct: 0, total: 0 })
      cur.correct += v.correct
      cur.total += v.total
    }

    const added: JourneyEvent[] = []
    if (station.shop) {
      const shop = station.questions.find((q) => q.kind === 'shop')
      if (shop && shop.kind === 'shop') {
        const ids = picks.current ?? shop.products.slice(0, shop.pick).map((p) => p.id)
        const chosen = shop.products.filter((p) => ids.includes(p.id))
        added.push({
          item: `ซื้อ${chosen.map((p) => p.name).join(' และ ')}`,
          type: 'out',
          amount: chosen.reduce((sum, p) => sum + p.price, 0),
        })
      }
    }
    added.push(...station.events)
    setEvents((list) => [...list, ...added])
    setInside(false)
    playSound('complete')
    if (at + 1 >= stations.length) {
      onDone({ ...t })
      return
    }
    setAt(at + 1)
  }

  return (
    <div className="mh-journey" data-testid="mh-journey">
      <div className="mh-card mh-journey-map">
        <div className="mh-journey-track">
          {stations.map((s, i) => (
            <div key={s.id} className={`mh-journey-stop ${i < at ? 'is-done' : i === at ? 'is-on' : ''}`}>
              <span className="mh-journey-icon">{s.icon}</span>
              <span className="mh-journey-name">{s.name}</span>
              {i < at && <span className="mh-journey-check">✔</span>}
            </div>
          ))}
          <div className="mh-journey-walker" style={{ left: `${(at / (stations.length - 1)) * 100}%` }}>
            {player && <AvatarArt avatar={player.avatar} size={44} />}
          </div>
        </div>
        <div className="mh-wallet-chip" data-testid="mh-journey-wallet">
          👛 เงินในกระเป๋า <b>{formatBS(wallet)}</b>
        </div>
      </div>

      {!inside ? (
        <div className="mh-card mh-journey-intro">
          <CharacterArt id={station.npc} size={90} />
          <div className="mh-bubble">
            <span className="mh-q-npc">{CHARACTERS[station.npc].name}</span>
            <p>
              <b>
                {station.icon} {station.name}
              </b>
              : {station.intro}
            </p>
          </div>
          <button
            type="button"
            className="mh-btn mh-btn-gold mh-btn-xl"
            data-testid="mh-journey-enter"
            onClick={() => {
              playSound('unlock')
              speak(station.intro)
              picks.current = null
              setInside(true)
            }}
          >
            🚶 เข้าไปที่{station.name}
          </button>
        </div>
      ) : (
        <StepRunner key={station.id} questions={questions} levelId={12} mode="mission" learn={learn} onAnswer={onAnswer} onFinish={leave} />
      )}
    </div>
  )
}
