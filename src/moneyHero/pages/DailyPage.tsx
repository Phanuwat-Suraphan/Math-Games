import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useGame } from '../hooks/useMoneyGame'
import { DAILY_COUNT, buildDaily, dailyReward, dayKey, doneToday, liveStreak, recordDaily, shiftDay } from '../engine/daily'
import { TopBar } from '../components/TopBar'
import { StepRunner, type RunSummary } from '../components/StepRunner'
import { AvatarArt, CharacterArt } from '../components/Art'
import { Confetti } from '../components/Effects'
import { Bunting } from '../components/Bunting'
import { playSound } from '../utils/sound'

/**
 * ภารกิจประจำวัน: วันละ 5 ข้อ จากเรื่องที่เรียนแล้ว ทำทุกวันได้สตรีคและตราประทับ
 * เส้นทาง #/daily
 */

const DAY_NAMES = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส']

/** ปฏิทิน 7 วันล่าสุด วันไหนทำแล้วมีตราประทับ */
function StampWeek({ days, today }: { days: string[]; today: string }) {
  const week = Array.from({ length: 7 }, (_, i) => shiftDay(today, i - 6))
  return (
    <div className="mh-stamp-week" aria-label="ตราประทับ 7 วันล่าสุด">
      {week.map((d) => {
        const [y, m, dd] = d.split('-').map(Number)
        const name = DAY_NAMES[new Date(y, m - 1, dd, 12).getDay()]
        const done = days.includes(d)
        return (
          <div key={d} className={`mh-stamp-day ${done ? 'is-done' : ''} ${d === today ? 'is-today' : ''}`}>
            <span className="mh-stamp-name">{d === today ? 'วันนี้' : name}</span>
            <span className="mh-stamp" aria-label={done ? 'ทำแล้ว' : 'ยังไม่ได้ทำ'}>
              {done ? '⭐' : dd}
            </span>
          </div>
        )
      })}
    </div>
  )
}

export function DailyPage() {
  const { player, updatePlayer } = useGame()
  const today = useMemo(() => dayKey(), [])
  const [phase, setPhase] = useState<'intro' | 'run' | 'done'>(() => (player && doneToday(player.daily, today) ? 'done' : 'intro'))
  const [summary, setSummary] = useState<RunSummary | null>(null)
  const [reward, setReward] = useState<{ coins: number; exp: number } | null>(null)
  const questions = useMemo(() => (player ? buildDaily(player, today) : []), [today])
  if (!player) return null

  const streak = liveStreak(player.daily, today)

  return (
    <div className="mh-level theme-start">
      <TopBar compact />
      <div className="mh-page mh-page-narrow">
        <div className="mh-page-head">
          <Link to="/map" className="mh-icon-btn" aria-label="กลับแผนที่">
            <ArrowLeft size={24} />
          </Link>
          <h1 className="mh-title mh-level-title">🌞 ภารกิจประจำวัน</h1>
        </div>

        {phase !== 'run' && (
          <div className="mh-card mh-daily-card" data-testid={phase === 'done' ? 'mh-daily-done' : 'mh-daily-intro'}>
            {phase === 'done' && reward && <Confetti />}
            <Bunting count={12} />
            <div className="mh-daily-head">
              {phase === 'done' ? (
                <AvatarArt avatar={player.avatar} size={96} mood="happy" wear={player.wear} pet />
              ) : (
                <CharacterArt id="owl" size={90} />
              )}
              <div>
                <div className="mh-daily-streak" data-testid="mh-daily-streak">
                  🔥 <b>{streak}</b> วันติดกัน
                </div>
                <p className="mh-soft">สูงสุด {player.daily.best} วัน</p>
              </div>
            </div>
            <StampWeek days={player.daily.days} today={today} />

            {phase === 'intro' ? (
              <>
                <p className="mh-daily-lead">
                  วันนี้มีโจทย์ {DAILY_COUNT} ข้อ จากเรื่องที่หนูเรียนมาแล้ว ทำครบได้ +{dailyReward(streak + 1).coins} 🪙 และตราประทับ ⭐
                </p>
                <button
                  type="button"
                  className="mh-btn mh-btn-gold mh-btn-xl mh-btn-block"
                  onClick={() => {
                    playSound('click')
                    setPhase('run')
                  }}
                  data-testid="mh-daily-start"
                >
                  ▶ เริ่มภารกิจวันนี้
                </button>
              </>
            ) : (
              <>
                <p className="mh-daily-lead">
                  {reward
                    ? `เก่งมาก! ตอบถูกตั้งแต่ครั้งแรก ${summary?.firstTry ?? 0}/${summary?.originals ?? DAILY_COUNT} ข้อ ได้ +${reward.coins} 🪙 +${reward.exp} EXP`
                    : 'วันนี้ทำภารกิจแล้ว พรุ่งนี้มาใหม่นะ จะได้สตรีคต่อเนื่อง 🔥'}
                </p>
                <Link to="/map" className="mh-btn mh-btn-go mh-btn-block" data-testid="mh-daily-to-map">
                  🗺 กลับแผนที่
                </Link>
              </>
            )}
          </div>
        )}

        {phase === 'run' && (
          <StepRunner
            questions={questions}
            levelId={-1}
            mode="mission"
            onFinish={(s) => {
              const nextStreak = liveStreak(player.daily, today) + 1
              const r = dailyReward(nextStreak)
              updatePlayer((p) => ({ ...p, coins: p.coins + r.coins, exp: p.exp + r.exp, daily: recordDaily(p.daily, today) }))
              setSummary(s)
              setReward(r)
              setPhase('done')
              playSound('complete')
            }}
          />
        )}
      </div>
    </div>
  )
}
