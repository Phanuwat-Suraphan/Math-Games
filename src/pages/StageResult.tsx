import { useEffect, useState } from 'react'
import { StoryBeatCard } from '../components/StoryBeatCard'
import { grantFlag, pendingBeat } from '../services/storyService'
import { motion } from 'framer-motion'
import { useLocation, useNavigate } from 'react-router-dom'
import { Button } from '../components/Button'
import { ScreenLayout } from '../components/ScreenLayout'
import { StarRow } from '../components/StarRow'
import { getQuest } from '../data/quests'
import { getNextStage, getStage } from '../data/stages'
import { getWorld } from '../data/worlds'
import { useGame } from '../context/useGame'
import type { Player } from '../types/player'
import type { StageResult as StageResultData } from '../types/stage'
import { playSfx } from '../services/audioService'
import { NotFoundNotice } from './NotFoundNotice'

/** ตรวจสอบข้อมูลที่ส่งมากับ navigation state เพราะผู้เล่นอาจกดรีเฟรชหน้าได้ */
function isStageResult(value: unknown): value is StageResultData {
  if (typeof value !== 'object' || value === null) return false
  const candidate = value as Record<string, unknown>

  return (
    typeof candidate.worldId === 'string' &&
    typeof candidate.stageId === 'string' &&
    typeof candidate.totalQuestions === 'number' &&
    typeof candidate.correctAnswers === 'number' &&
    typeof candidate.accuracy === 'number' &&
    typeof candidate.stars === 'number'
  )
}

export function StageResult({ player }: { player: Player }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { settings, patchPlayer } = useGame()

  const result = isStageResult(location.state) ? location.state : null
  const [showConfetti, setShowConfetti] = useState(false)
  const [beatDone, setBeatDone] = useState(false)

  useEffect(() => {
    if (!result) return
    playSfx('coin')

    if (!settings.animationsEnabled || !result.isPassed) return
    setShowConfetti(true)
    const timer = window.setTimeout(() => setShowConfetti(false), 2200)
    return () => window.clearTimeout(timer)
  }, [result, settings.animationsEnabled])

  if (!result) {
    return (
      <NotFoundNotice
        title="ยังไม่มีผลการเล่น"
        message="หน้าผลลัพธ์จะแสดงหลังจากเล่นจบด่าน ลองเลือกด่านจากแผนที่ดูนะ"
        actionLabel="ไปที่แผนที่โลก"
        actionTo="/map"
        emoji="🎁"
      />
    )
  }

  /*
   * ตอนปิดของด่านนี้ เล่าหลังผ่านด่านเท่านั้น
   *
   * ไม่เล่าถ้าเด็กยังไม่ผ่านเกณฑ์ เพราะเรื่องจะเดินไปข้างหน้าทั้งที่เด็กยังไม่ได้ทำสำเร็จ
   * แล้วพอกลับมาเล่นซ้ำจนผ่านจริง จะไม่มีอะไรให้อ่านอีก
   */
  const beat = result.isPassed
    ? pendingBeat(player, result.stageId, 'after')
    : undefined

  if (beat && !beatDone) {
    return (
      <ScreenLayout width="narrow" className="flex min-h-screen flex-col justify-center">
        <StoryBeatCard
          beat={beat}
          onFinish={() => {
            setBeatDone(true)
            if (beat.grantsFlag) patchPlayer(grantFlag(player, beat.grantsFlag))
          }}
        />
      </ScreenLayout>
    )
  }

  const stage = getStage(result.stageId)
  const world = getWorld(result.worldId)
  const nextStage = stage ? getNextStage(stage) : undefined
  const totalExp = result.expFromAnswers + result.bonusExp
  const totalCoins = result.coinsFromAnswers + result.bonusCoins

  const headline = !result.isPassed
    ? 'เกือบแล้ว! ลองอีกครั้งนะ'
    : result.isMastered
      ? 'สุดยอด! เชี่ยวชาญด่านนี้แล้ว'
      : result.isFirstClear
        ? 'STAGE COMPLETE!'
        : 'เก่งขึ้นอีกแล้ว!'

  const encouragement = !result.isPassed
    ? `ต้องตอบถูก ${Math.ceil(((stage?.passingScore ?? 60) / 100) * result.totalQuestions)} ข้อถึงจะผ่าน ครั้งนี้ได้ ${result.correctAnswers} ข้อ — ใกล้แล้วนะ ลองอีกรอบ 💪`
    : result.accuracy >= 90
      ? 'แม่นยำมาก เก็บครบ 3 ดาวแล้ว 🌟'
      : result.accuracy >= 70
        ? 'ทำได้ดีมาก! ฝึกอีกนิดก็ได้ 3 ดาวแล้ว 👏'
        : 'ผ่านแล้ว! เล่นซ้ำเพื่อเก็บดาวเพิ่มได้นะ 🌱'

  return (
    <ScreenLayout
      width="narrow"
      className="flex min-h-screen flex-col justify-center"
    >
      {showConfetti ? <Confetti /> : null}

      {/*
        ด่านที่ผ่านได้ใช้แผงแบบเด่นพร้อมมุมประดับ ด่านที่เก็บดาวครบมีแสงกวาดผ่านด้วย
        ส่วนด่านที่ยังไม่ผ่านใช้แผงธรรมดา
        ความต่างตรงนี้คือสิ่งแรกที่เด็กเห็นก่อนจะได้อ่านตัวหนังสือใด ๆ
        และต้องบอกผลได้ทันทีโดยไม่ต้องอ่าน
      */}
      <motion.section
        initial={{ opacity: 0, scale: 0.92, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 180, damping: 18 }}
        className={`panel relative overflow-hidden p-6 text-center sm:p-8 ${
          result.isPassed ? 'panel-hero panel-corners' : ''
        } ${result.isMastered ? 'sheen' : ''}`}
        aria-labelledby="stage-result-title"
      >

        <motion.p
          aria-hidden="true"
          className="text-6xl"
          animate={settings.animationsEnabled ? { rotate: [0, -10, 10, 0] } : undefined}
          transition={{ duration: 1.2, repeat: 1 }}
        >
          {result.isPassed ? (result.isMastered ? '🏆' : '🎉') : '💪'}
        </motion.p>

        <h1
          id="stage-result-title"
          className={`mt-3 text-2xl font-black sm:text-3xl ${
            result.isPassed ? 'title-gold' : 'title-hero'
          }`}
        >
          {headline}
        </h1>
        <p className="mt-1 text-slate-300">
          {stage ? `${stage.emoji} ${stage.name}` : 'จบด่านเรียบร้อย'}
          {world ? ` · ${world.name}` : ''}
        </p>

        {/* ดาวเป็นตัวเอกของหน้านี้ */}
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 220, damping: 14, delay: 0.15 }}
          className="mt-5 flex justify-center"
        >
          <StarRow stars={result.stars} size="lg" />
        </motion.div>

        {result.isMastered ? (
          <p className="mt-2 inline-flex rounded-full bg-gold-500/25 px-4 py-1 text-sm font-bold text-gold-300">
            🏆 MASTERED
          </p>
        ) : result.stars > result.previousStars && result.previousStars > 0 ? (
          <p className="mt-2 inline-flex rounded-full bg-leaf-600/25 px-4 py-1 text-sm font-bold text-leaf-400">
            ⬆️ ทำลายสถิติเดิม! จาก {result.previousStars} เป็น {result.stars} ดาว
          </p>
        ) : null}

        <dl className="mt-6 grid grid-cols-2 gap-3">
          <ResultStat
            label="ตอบถูก"
            value={`${result.correctAnswers} / ${result.totalQuestions}`}
            detail="นับเฉพาะข้อที่ตอบถูกในครั้งแรก"
            tone="text-leaf-400"
            emoji="✅"
          />
          <ResultStat
            label="ความแม่นยำ"
            value={`${result.accuracy}%`}
            detail={`เกณฑ์ผ่าน ${stage?.passingScore ?? 60}%`}
            tone="text-sky-400"
            emoji="🎯"
          />
          <ResultStat
            label="EXP ที่ได้รับ"
            value={`+${totalExp}`}
            detail={`ตอบถูก +${result.expFromAnswers} · โบนัส +${result.bonusExp}`}
            tone="text-arcane-400"
            emoji="✨"
          />
          <ResultStat
            label="เหรียญที่ได้รับ"
            value={`+${totalCoins}`}
            detail={`ตอบถูก +${result.coinsFromAnswers} · โบนัส +${result.bonusCoins}`}
            tone="text-gold-300"
            emoji="🪙"
          />
        </dl>

        <p className="mt-4 rounded-2xl bg-night-900/60 p-3 text-sm text-slate-200">
          {encouragement}
        </p>

        {/* การปลดล็อกและภารกิจที่สำเร็จ */}
        <div className="mt-4 space-y-2">
          {result.unlockedStageId ? (
            <p className="rounded-2xl border border-leaf-500/40 bg-leaf-600/20 p-3 font-bold text-leaf-400">
              🔓 ปลดล็อกด่านใหม่: {getStage(result.unlockedStageId)?.name}
            </p>
          ) : null}

          {result.isWorldComplete && world ? (
            <p className="rounded-2xl border border-gold-400/40 bg-gold-500/15 p-3 font-bold text-gold-300">
              🎉 WORLD COMPLETE! หนูพิชิต “{world.name}” แล้ว
            </p>
          ) : null}

          {result.unlockedWorldId ? (
            <motion.p
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              className="rounded-2xl border border-arcane-400/50 bg-arcane-600/25 p-3 font-bold text-arcane-400"
            >
              🔓 {getWorld(result.unlockedWorldId)?.name} ปลดล็อกแล้ว!
            </motion.p>
          ) : null}

          {result.completedQuestIds.length > 0 ? (
            <div className="rounded-2xl border border-gold-400/30 bg-gold-500/10 p-3 text-left">
              <p className="text-sm font-bold text-gold-300">
                📜 ภารกิจสำเร็จ {result.completedQuestIds.length} รายการ
              </p>
              <ul className="mt-1 space-y-0.5">
                {result.completedQuestIds.map((questId) => (
                  <li key={questId} className="text-sm text-slate-200">
                    • {getQuest(questId)?.title ?? questId}
                  </li>
                ))}
              </ul>
              <p className="mt-1 text-xs text-slate-400">
                ไปที่หน้าภารกิจเพื่อกดรับรางวัล
              </p>
            </div>
          ) : null}
        </div>

        <div className="mt-4 rounded-2xl bg-night-900/60 p-4">
          <p className="text-sm text-slate-300">ตอนนี้หนูอยู่ที่</p>
          <p className="mt-1 text-lg font-bold text-white">
            เลเวล {player.level} · 🪙 {player.coins.toLocaleString('th-TH')} ·
            ❤️ {player.hp}/{player.maxHp}
          </p>
        </div>

        <div className="mt-6 space-y-3">
          {result.isPassed && nextStage ? (
            <Button
              size="lg"
              fullWidth
              icon="➡️"
              onClick={() =>
                navigate(`/quest/${nextStage.worldId}/${nextStage.id}`, {
                  replace: true,
                })
              }
            >
              ไปต่อ: {nextStage.name}
            </Button>
          ) : !result.isPassed && stage ? (
            <Button
              size="lg"
              fullWidth
              icon="🔄"
              onClick={() =>
                navigate(`/quest/${stage.worldId}/${stage.id}`, {
                  replace: true,
                })
              }
            >
              ลองด่านนี้อีกครั้ง
            </Button>
          ) : null}

          <Button
            size="lg"
            variant="secondary"
            fullWidth
            icon="🗺️"
            onClick={() =>
              navigate(world ? `/world/${world.id}` : '/map', { replace: true })
            }
          >
            กลับไปเลือกด่าน
          </Button>

          {result.completedQuestIds.length > 0 ? (
            <Button
              size="lg"
              variant="ghost"
              fullWidth
              icon="📜"
              onClick={() => navigate('/quests', { replace: true })}
            >
              ไปรับรางวัลภารกิจ
            </Button>
          ) : null}
        </div>
      </motion.section>
    </ScreenLayout>
  )
}

interface ResultStatProps {
  label: string
  value: string
  detail: string
  tone: string
  emoji: string
}

function ResultStat({ label, value, detail, tone, emoji }: ResultStatProps) {
  return (
    <div className="rounded-2xl border border-white/10 bg-night-900/50 p-3 text-center">
      <dt className="text-xs font-semibold text-slate-400">
        <span aria-hidden="true">{emoji}</span> {label}
      </dt>
      <dd className={`mt-1 text-2xl font-bold tabular-nums ${tone}`}>{value}</dd>
      <p className="mt-1 text-[11px] leading-tight text-slate-500">{detail}</p>
    </div>
  )
}

/** เอฟเฟกต์ฉลองเบา ๆ ใช้ div ไม่กี่ชิ้นเพื่อไม่ให้เครื่องช้า */
function Confetti() {
  const pieces = Array.from({ length: 14 }, (_, index) => index)
  const colors = ['#fcd34d', '#a78bfa', '#4ade80', '#38bdf8', '#fb7185']

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-40 overflow-hidden"
    >
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
