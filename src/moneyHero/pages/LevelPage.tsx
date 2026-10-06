import { useCallback, useMemo, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import type { StepId } from '../engine/types'
import { LEVELS, levelById, type LevelDef } from '../data/levels'
import { useGame } from '../hooks/useMoneyGame'
import { emptyLevel, isLevelUnlocked, levelRecord, type LevelRecord } from '../engine/progress'
import { BOSS_PASS, levelReward, starsFor } from '../engine/scoring'
import { buildStep } from '../generators'
import { TopBar } from '../components/TopBar'
import { LearnSlides } from '../components/LearnSlides'
import { StepRunner, type RunSummary } from '../components/StepRunner'
import { JourneyMission } from '../components/JourneyMission'
import { AvatarArt, CharacterArt } from '../components/Art'
import { BuildingArt } from '../components/BuildingArt'
import { Stars } from '../components/Stars'
import { CoinRain, Confetti } from '../components/Effects'
import { playSound } from '../utils/sound'
import { PLAYABLE_MAX } from './MapPage'

/**
 * หน้าด่าน: LEARN → PRACTICE → MISSION → BOSS → ผลลัพธ์
 * เส้นทาง #/level/:id/:step
 */

const STEPS: { id: StepId; label: string; icon: string }[] = [
  { id: 'learn', label: 'LEARN', icon: '📖' },
  { id: 'practice', label: 'PRACTICE', icon: '✏️' },
  { id: 'mission', label: 'MISSION', icon: '🎯' },
  { id: 'boss', label: 'BOSS', icon: '👑' },
]

const STEP_NAME: Record<StepId, string> = {
  learn: 'เรียนรู้ก่อนเล่น',
  practice: 'ฝึกง่าย ๆ',
  mission: 'ภารกิจในเมือง',
  boss: 'ด่านบอส',
}

export interface LevelResult {
  passed: boolean
  stars: number
  accuracy: number
  exp: number
  coins: number
  firstClear: boolean
  bossWithin2: number
  bossTotal: number
}

function StepTrack({ level, rec, current }: { level: LevelDef; rec: LevelRecord; current: StepId | 'result' }) {
  return (
    <ol className="mh-step-track" aria-label="ขั้นของด่าน">
      {STEPS.map((s, i) => {
        const done = rec.stepDone > i
        const on = s.id === current
        return (
          <li key={s.id} className={`${done ? 'is-done' : ''} ${on ? 'is-on' : ''}`}>
            <span className="mh-step-dot">{done ? '✔' : s.icon}</span>
            <span className="mh-step-name">
              STEP {i + 1} {s.label}
            </span>
          </li>
        )
      })}
      <li className="mh-step-level">
        {level.icon} ด่าน {level.id}
      </li>
    </ol>
  )
}

export function LevelPage() {
  const params = useParams<{ id: string; step: string }>()
  const id = Number(params.id)
  const step = params.step as StepId | 'result'
  const level = levelById(id)
  const { player } = useGame()

  if (!player || !level || Number.isNaN(id)) return <Navigate to="/map" replace />
  if (!isLevelUnlocked(player, id) || id > PLAYABLE_MAX) return <Navigate to="/map" replace />

  const rec = levelRecord(player, id)
  const order: StepId[] = ['learn', 'practice', 'mission', 'boss']
  if (step !== 'result') {
    const need = order.indexOf(step)
    if (need < 0) return <Navigate to={`/level/${id}/learn`} replace />
    // ยังไม่ผ่านขั้นก่อนหน้า ให้กลับไปขั้นที่ควรทำ
    if (need > rec.stepDone) return <Navigate to={`/level/${id}/${order[rec.stepDone]}`} replace />
  }

  return (
    <div className={`mh-level ${level.theme}`}>
      <TopBar compact />
      <div className="mh-page mh-level-page">
        <div className="mh-level-head mh-level-scene">
          <Link to="/map" className="mh-icon-btn" aria-label="กลับแผนที่">
            <ArrowLeft size={24} />
          </Link>
          <div className="mh-level-scene-text">
            <div className="mh-level-kicker">
              ด่าน {level.id} · {level.game}
            </div>
            <h1 className="mh-title mh-level-title">{level.name}</h1>
          </div>
          <div className="mh-level-scene-art" aria-hidden="true">
            <BuildingArt level={level.id} className="mh-level-scene-bld" />
            <CharacterArt id={level.npc} size={64} className="mh-level-scene-npc" />
          </div>
        </div>
        <StepTrack level={level} rec={rec} current={step} />
        {step === 'result' ? <ResultView level={level} /> : <StepView key={`${id}-${step}`} level={level} step={step} />}
      </div>
    </div>
  )
}

function StepView({ level, step }: { level: LevelDef; step: StepId }) {
  const { updatePlayer, player } = useGame()
  const navigate = useNavigate()
  const [done, setDone] = useState<RunSummary | null>(null)
  const [bossFail, setBossFail] = useState<RunSummary | null>(null)
  const [round, setRound] = useState(0)

  const questions = useMemo(
    () => (step === 'learn' || (level.id === 12 && step === 'mission') ? [] : buildStep(level.id, step)),
    // round เปลี่ยนเมื่อเล่นบอสใหม่ จะได้โจทย์ชุดใหม่
    [level.id, step, round],
  )

  const markStep = useCallback(
    (n: number, s?: RunSummary) => {
      updatePlayer((p) => {
        const rec = { ...emptyLevel(), ...p.levels[level.id] }
        if (n === 2) {
          // เริ่มนับคะแนนรอบใหม่ที่ขั้น PRACTICE
          rec.runCorrect = 0
          rec.runTotal = 0
          rec.runHints = 0
        }
        if (s) {
          rec.runCorrect += s.firstTry
          rec.runTotal += s.originals
          rec.runHints += s.hints
        }
        rec.stepDone = Math.max(rec.stepDone, n)
        return { ...p, levels: { ...p.levels, [level.id]: rec } }
      })
    },
    [updatePlayer, level.id],
  )

  const finishBoss = useCallback(
    (s: RunSummary) => {
      const passRate = s.originals === 0 ? 1 : s.within2 / s.originals
      if (passRate < BOSS_PASS) {
        playSound('wrong')
        setBossFail(s)
        return
      }
      if (!player) return
      // คิดผลจากข้อมูลปัจจุบัน แล้วบันทึกด้วยสูตรเดียวกัน
      const summarize = (prev: LevelRecord) => {
        const correct = prev.runCorrect + s.firstTry
        const total = prev.runTotal + s.originals
        const accuracy = total === 0 ? 1 : correct / total
        const stars = starsFor(accuracy)
        const firstClear = prev.stepDone < 4
        return { correct, total, accuracy, stars, firstClear, reward: levelReward(stars, firstClear) }
      }
      const now = summarize({ ...emptyLevel(), ...player.levels[level.id] })
      const result: LevelResult = {
        passed: true,
        stars: now.stars,
        accuracy: now.accuracy,
        exp: now.reward.exp,
        coins: now.reward.coins,
        firstClear: now.firstClear,
        bossWithin2: s.within2,
        bossTotal: s.originals,
      }
      updatePlayer(
        (p) => {
          const prev = { ...emptyLevel(), ...p.levels[level.id] }
          const r = summarize(prev)
          const rec: LevelRecord = {
            ...prev,
            stepDone: 4,
            bestStars: Math.max(prev.bestStars, r.stars),
            bestAccuracy: Math.max(prev.bestAccuracy, r.accuracy),
            plays: prev.plays + 1,
            completedAt: prev.completedAt ?? Date.now(),
            runCorrect: r.correct,
            runTotal: r.total,
            runHints: prev.runHints + s.hints,
          }
          return { ...p, exp: p.exp + r.reward.exp, coins: p.coins + r.reward.coins, levels: { ...p.levels, [level.id]: rec } }
        },
        s.hints === 0 ? ['nohint-boss'] : [],
      )
      playSound('boss')
      navigate(`/level/${level.id}/result`, { state: result })
    },
    [updatePlayer, level.id, navigate, player],
  )

  if (step === 'learn') {
    return (
      <div className="mh-card mh-step-card">
        <h2 className="mh-step-title">📖 STEP 1 · {STEP_NAME.learn}</h2>
        <LearnSlides
          slides={level.learn}
          onDone={() => {
            playSound('unlock')
            markStep(1)
            navigate(`/level/${level.id}/practice`)
          }}
        />
      </div>
    )
  }

  if (bossFail) {
    return (
      <div className="mh-card mh-step-card mh-center">
        <CharacterArt id="fox" size={110} mood="think" />
        <h2 className="mh-step-title">เกือบแล้ว! 💪</h2>
        <p>
          ตอบถูก {bossFail.within2} จาก {bossFail.originals} ข้อ ต้องถูกอย่างน้อย {Math.ceil(bossFail.originals * BOSS_PASS)} ข้อ
          จึงจะชนะบอส
        </p>
        <p className="mh-soft">ไม่เป็นไรนะ ทุกฮีโร่เคยพลาด ลองทบทวนบทเรียนแล้วสู้ใหม่!</p>
        <div className="mh-row-buttons">
          <Link to={`/level/${level.id}/learn`} className="mh-btn mh-btn-soft">
            📖 เรียนรู้ใหม่
          </Link>
          <button
            type="button"
            className="mh-btn mh-btn-gold"
            data-testid="mh-boss-retry"
            onClick={() => {
              setBossFail(null)
              setRound((r) => r + 1)
            }}
          >
            👑 สู้บอสอีกครั้ง
          </button>
        </div>
      </div>
    )
  }

  if (done) {
    const nextStep = step === 'practice' ? 'mission' : 'boss'
    return (
      <div className="mh-card mh-step-card mh-center" data-testid="mh-step-done">
        <div className="mh-step-done-icon">{step === 'practice' ? '✏️' : '🎯'}</div>
        <h2 className="mh-step-title">{step === 'practice' ? 'ฝึกครบแล้ว!' : 'ภารกิจสำเร็จ!'}</h2>
        <p>
          ตอบถูกตั้งแต่ครั้งแรก {done.firstTry} / {done.originals} ข้อ · ได้ +{done.exp} EXP · +{done.coins} 🪙
        </p>
        <button
          type="button"
          className="mh-btn mh-btn-gold mh-btn-xl"
          data-testid="mh-next-step"
          onClick={() => {
            playSound('click')
            navigate(`/level/${level.id}/${nextStep}`)
          }}
        >
          ไป {nextStep === 'mission' ? 'MISSION 🎯' : 'BOSS 👑'}
        </button>
      </div>
    )
  }

  const stepNo = step === 'practice' ? 2 : step === 'mission' ? 3 : 4
  return (
    <div className="mh-step-wrap">
      <h2 className="mh-step-title mh-step-title-out">
        {step === 'practice' ? '✏️' : step === 'mission' ? '🎯' : '👑'} STEP {stepNo} · {STEP_NAME[step]}
      </h2>
      {level.id === 12 && step === 'mission' ? (
        <JourneyMission
          learn={level.learn}
          onDone={(s) => {
            playSound('complete')
            markStep(3, s)
            setDone(s)
          }}
        />
      ) : (
      <StepRunner
        key={round}
        questions={questions}
        levelId={level.id}
        mode={step}
        learn={level.learn}
        onFinish={(s) => {
          if (step === 'boss') {
            finishBoss(s)
            return
          }
          playSound('complete')
          markStep(stepNo, s)
          setDone(s)
        }}
      />
      )}
    </div>
  )
}

function ResultView({ level }: { level: LevelDef }) {
  const { player } = useGame()
  const location = useLocation()
  const navigate = useNavigate()
  const result = location.state as LevelResult | null
  if (!player) return null
  const rec = levelRecord(player, level.id)
  const stars = result?.stars ?? rec.bestStars
  const next = LEVELS.find((l) => l.id === level.id + 1)
  const nextOpen = next && next.id <= PLAYABLE_MAX

  return (
    <div className="mh-card mh-result" data-testid="mh-result">
      <Confetti />
      <CoinRain n={result?.coins ?? 6} />
      <div className="mh-result-banner">MISSION COMPLETE!</div>
      <div className="mh-result-cast">
        <AvatarArt avatar={player.avatar} size={120} mood="happy" />
        {level.npc !== 'hero' && <CharacterArt id={level.npc} size={96} mood="happy" />}
      </div>
      <div className="mh-result-stars" aria-label={`ได้ ${stars} ดาว`}>
        <Stars n={stars} />
      </div>
      <p className="mh-result-grade">{stars === 3 ? '⭐⭐⭐ ยอดเยี่ยม!' : stars === 2 ? '⭐⭐ ดีมาก!' : '⭐ ผ่านแล้ว!'}</p>
      {result && (
        <div className="mh-result-rewards">
          <span className="mh-reward">✨ +{result.exp} EXP</span>
          <span className="mh-reward">🪙 +{result.coins}</span>
          <span className="mh-reward">🌟 MONEY STAR × {stars}</span>
          <span className="mh-reward">🎯 ถูกครั้งแรก {Math.round(result.accuracy * 100)}%</span>
        </div>
      )}
      {level.id === 12 && (
        <div className="mh-master" data-testid="mh-master">
          <div className="mh-master-badge">🏆</div>
          <b>MONEY MASTER ป.3</b>
          <p>คุณผ่านเนื้อหาเรื่องเงินครบทุกหัวข้อแล้ว!</p>
          <p className="mh-soft">ธนบัตรและเหรียญ · บอกจำนวนเงิน · เขียนแบบจุด · เปรียบเทียบ · แลกเงิน · บวก ลบ คูณ หาร · โจทย์ปัญหา · รายรับรายจ่าย</p>
        </div>
      )}
      {next && (
        <div className="mh-unlock">
          {nextOpen ? (
            <>
              🔓 ปลดล็อก <b>ด่าน {next.id}: {next.name}</b> แล้ว!
            </>
          ) : (
            <>🛠️ ด่าน {next.id} กำลังสร้าง จะเปิดในส่วนถัดไป</>
          )}
        </div>
      )}
      <div className="mh-row-buttons">
        <button
          type="button"
          className="mh-btn mh-btn-soft"
          onClick={() => {
            playSound('click')
            navigate(`/level/${level.id}/learn`)
          }}
        >
          🔄 เล่นด่านนี้อีกครั้ง
        </button>
        <Link to="/map" className="mh-btn mh-btn-go" data-testid="mh-back-map">
          🗺 กลับแผนที่
        </Link>
        {nextOpen && (
          <Link to={`/level/${next.id}/learn`} className="mh-btn mh-btn-gold" data-testid="mh-next-level">
            ▶ ด่านต่อไป
          </Link>
        )}
      </div>
    </div>
  )
}
