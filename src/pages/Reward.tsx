import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useLocation, useNavigate } from 'react-router-dom'
import { Button } from '../components/Button'
import { ScreenLayout } from '../components/ScreenLayout'
import { getLevel, getLevelsByWorld } from '../data/levels'
import { getWorld } from '../data/worlds'
import type { LevelResult } from '../types/level'
import type { Player } from '../types/player'
import { playSfx } from '../services/audioService'
import { NotFoundNotice } from './NotFoundNotice'

/** ตรวจสอบข้อมูลที่ส่งมากับ navigation state เพราะผู้เล่นอาจกดรีเฟรชหน้าได้ */
function isLevelResult(value: unknown): value is LevelResult {
  if (typeof value !== 'object' || value === null) return false
  const candidate = value as Record<string, unknown>

  return (
    typeof candidate.worldId === 'string' &&
    typeof candidate.levelId === 'string' &&
    typeof candidate.totalQuestions === 'number' &&
    typeof candidate.correctAnswers === 'number' &&
    typeof candidate.expFromAnswers === 'number' &&
    typeof candidate.coinsFromAnswers === 'number' &&
    typeof candidate.bonusExp === 'number' &&
    typeof candidate.bonusCoins === 'number'
  )
}

export function Reward({ player }: { player: Player }) {
  const navigate = useNavigate()
  const location = useLocation()
  const result = isLevelResult(location.state) ? location.state : null
  const [showConfetti, setShowConfetti] = useState(false)

  useEffect(() => {
    if (!result) return
    playSfx('coin')
    setShowConfetti(true)
    const timer = window.setTimeout(() => setShowConfetti(false), 2200)
    return () => window.clearTimeout(timer)
  }, [result])

  if (!result) {
    return (
      <NotFoundNotice
        title="ยังไม่มีผลการเล่น"
        message="หน้ารางวัลจะแสดงหลังจากเล่นจบด่าน ลองเลือกด่านจากแผนที่ดูนะ"
        actionLabel="ไปที่แผนที่โลก"
        actionTo="/map"
        emoji="🎁"
      />
    )
  }

  const level = getLevel(result.levelId)
  const world = getWorld(result.worldId)
  const totalExp = result.expFromAnswers + result.bonusExp
  const totalCoins = result.coinsFromAnswers + result.bonusCoins
  const accuracy = result.accuracy

  const nextLevel = level
    ? getLevelsByWorld(level.worldId).find((item) => item.order === level.order + 1)
    : undefined

  const gradeMessage =
    accuracy === 100
      ? 'สมบูรณ์แบบ! เก่งมากเลย 🌟'
      : accuracy >= 80
        ? 'เยี่ยมมาก! ทำได้ดีจริง ๆ 👏'
        : accuracy >= 50
          ? 'ทำได้ดีแล้ว ฝึกอีกนิดจะเก่งขึ้นอีก 💪'
          : 'ไม่เป็นไรนะ ทุกคนเริ่มจากตรงนี้ ลองอีกครั้งกัน 🌱'

  return (
    <ScreenLayout width="narrow" className="flex min-h-screen flex-col justify-center">
      {showConfetti ? <Confetti /> : null}

      <motion.section
        initial={{ opacity: 0, scale: 0.92, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 180, damping: 18 }}
        className="surface-card relative overflow-hidden p-6 text-center sm:p-8"
        aria-labelledby="reward-title"
      >
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-gold-300 via-arcane-400 to-leaf-400"
        />

        <motion.p
          aria-hidden="true"
          className="text-6xl"
          animate={{ rotate: [0, -10, 10, 0] }}
          transition={{ duration: 1.2, repeat: 1 }}
        >
          🎉
        </motion.p>

        <h1 id="reward-title" className="mt-3 text-3xl font-bold text-gold-300">
          QUEST COMPLETE!
        </h1>
        <p className="mt-1 text-slate-300">
          {level ? `${level.emoji} ${level.name}` : 'ผ่านด่านเรียบร้อย'}
          {world ? ` · ${world.name}` : ''}
        </p>

        {result.isFirstClear ? (
          <p className="mt-3 inline-flex rounded-full bg-leaf-600/25 px-3 py-1 text-sm font-bold text-leaf-400">
            ✨ ผ่านด่านนี้ครั้งแรก!
          </p>
        ) : (
          <p className="mt-3 inline-flex rounded-full bg-sky-600/25 px-3 py-1 text-sm font-bold text-sky-400">
            🔁 ฝึกซ้ำ — รางวัลน้อยกว่าครั้งแรก แต่สถิติเก่งขึ้นแน่นอน
          </p>
        )}

        <dl className="mt-6 grid grid-cols-2 gap-3">
          <RewardStat
            label="EXP ที่ได้รับ"
            value={`+${totalExp}`}
            detail={`ตอบถูก +${result.expFromAnswers} · โบนัส +${result.bonusExp}`}
            className="text-arcane-400"
            emoji="✨"
          />
          <RewardStat
            label="เหรียญที่ได้รับ"
            value={`+${totalCoins}`}
            detail={`ตอบถูก +${result.coinsFromAnswers} · โบนัส +${result.bonusCoins}`}
            className="text-gold-300"
            emoji="🪙"
          />
          <RewardStat
            label="ตอบถูก"
            value={`${result.correctAnswers} / ${result.totalQuestions}`}
            detail="นับเฉพาะข้อที่ตอบถูกในครั้งแรก"
            className="text-leaf-400"
            emoji="✅"
          />
          <RewardStat
            label="ความแม่นยำ"
            value={`${accuracy}%`}
            detail={gradeMessage}
            className="text-sky-400"
            emoji="🎯"
          />
        </dl>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-white/10 bg-night-900/50 p-3 text-center">
            <p className="text-xs text-slate-400">
              <span aria-hidden="true">❤️</span> พลังชีวิตที่ฟื้น
            </p>
            <p className="mt-1 text-xl font-bold tabular-nums text-ember-400">
              +{result.hpHealed}
            </p>
            <p className="mt-1 text-[11px] text-slate-500">
              ตอนนี้ {player.hp} / {player.maxHp}
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-night-900/50 p-3 text-center">
            <p className="text-xs text-slate-400">
              <span aria-hidden="true">🔥</span> ตอบถูกติดต่อกัน
            </p>
            <p className="mt-1 text-xl font-bold tabular-nums text-gold-300">
              {player.currentStreak}
            </p>
            <p className="mt-1 text-[11px] text-slate-500">
              สถิติดีที่สุด {player.bestStreak}
            </p>
          </div>
        </div>

        <div className="mt-4 rounded-2xl bg-night-900/60 p-4">
          <p className="text-sm text-slate-300">ตอนนี้หนูอยู่ที่</p>
          <p className="mt-1 text-xl font-bold text-white">
            เลเวล {player.level} · 🪙 {player.coins.toLocaleString('th-TH')} เหรียญ
          </p>
        </div>

        <div className="mt-6 space-y-3">
          {nextLevel ? (
            <Button
              size="lg"
              fullWidth
              icon="➡️"
              onClick={() =>
                navigate(`/play/${nextLevel.worldId}/${nextLevel.id}`, {
                  replace: true,
                })
              }
            >
              ไปต่อ: {nextLevel.name}
            </Button>
          ) : (
            <Button
              size="lg"
              fullWidth
              icon="🏅"
              onClick={() => navigate('/menu', { replace: true })}
            >
              ไปต่อที่เมนูหลัก
            </Button>
          )}

          <Button
            size="lg"
            variant="secondary"
            fullWidth
            icon="🗺️"
            onClick={() => navigate('/map', { replace: true })}
          >
            กลับแผนที่
          </Button>

          <Button
            size="lg"
            variant="ghost"
            fullWidth
            icon="👤"
            onClick={() => navigate('/character', { replace: true })}
          >
            ดูโปรไฟล์ของฉัน
          </Button>
        </div>
      </motion.section>
    </ScreenLayout>
  )
}

interface RewardStatProps {
  label: string
  value: string
  detail: string
  className: string
  emoji: string
}

function RewardStat({ label, value, detail, className, emoji }: RewardStatProps) {
  return (
    <div className="rounded-2xl border border-white/10 bg-night-900/50 p-3 text-center">
      <dt className="text-xs font-semibold text-slate-400">
        <span aria-hidden="true">{emoji}</span> {label}
      </dt>
      <dd className={`mt-1 text-2xl font-bold tabular-nums ${className}`}>
        {value}
      </dd>
      <p className="mt-1 text-[11px] leading-tight text-slate-500">{detail}</p>
    </div>
  )
}

/** เอฟเฟกต์ฉลองเบา ๆ ใช้ div ไม่กี่ชิ้นเพื่อไม่ให้เครื่องช้า */
function Confetti() {
  const pieces = Array.from({ length: 14 }, (_, index) => index)
  const colors = ['#fcd34d', '#a78bfa', '#4ade80', '#38bdf8', '#fb7185']

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-40 overflow-hidden">
      {pieces.map((piece) => (
        <motion.span
          key={piece}
          className="absolute top-0 h-2.5 w-2.5 rounded-sm"
          style={{
            left: `${(piece * 7 + 5) % 100}%`,
            backgroundColor: colors[piece % colors.length],
          }}
          initial={{ y: -20, opacity: 0, rotate: 0 }}
          animate={{ y: '100vh', opacity: [0, 1, 1, 0], rotate: 360 }}
          transition={{
            duration: 1.8 + (piece % 5) * 0.2,
            delay: (piece % 7) * 0.08,
            ease: 'easeIn',
          }}
        />
      ))}
    </div>
  )
}
