import { useNavigate } from 'react-router-dom'
import { AvatarBadge } from '../components/AvatarBadge'
import { Button } from '../components/Button'
import { CoinDisplay } from '../components/CoinDisplay'
import { ExpBar } from '../components/ExpBar'
import { HpDisplay } from '../components/HpDisplay'
import { ScreenLayout } from '../components/ScreenLayout'
import { SkillCard } from '../components/SkillCard'
import { StreakBadge } from '../components/StreakBadge'
import { TopBar } from '../components/TopBar'
import { getAvatar } from '../data/avatars'
import { useProgression } from '../hooks/useProgression'
import type { Player } from '../types/player'
import { getExpProgress, getTotalExp } from '../utils/experience'
import { getOverallAccuracy } from '../utils/statistics'

export function Character({ player }: { player: Player }) {
  const navigate = useNavigate()
  const avatar = getAvatar(player.avatar)
  const progression = useProgression(player)
  const expProgress = getExpProgress(player)
  const accuracy = getOverallAccuracy(player.totalQuestions, player.correctAnswers)

  return (
    <>
      <TopBar player={player} title="ตัวละคร" backTo="/menu" backLabel="เมนูหลัก" />

      <ScreenLayout width="wide">
        {/* แถบหัว: อวาตาร์ ชื่อ เลเวล EXP HP เหรียญ */}
        <section
          aria-label="ข้อมูลตัวละคร"
          className="surface-card p-5 sm:p-6"
        >
          <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start">
            <AvatarBadge avatar={avatar} size="lg" />

            <div className="w-full min-w-0 flex-1">
              <div className="flex flex-col items-center gap-2 sm:flex-row sm:items-baseline sm:justify-between">
                <div className="text-center sm:text-left">
                  <h2 className="text-2xl font-bold text-white sm:text-3xl">
                    {player.name}
                  </h2>
                  <p className="mt-0.5 text-sm text-arcane-400">
                    {avatar.emoji} {avatar.name}
                  </p>
                </div>

                <span className="rounded-full border border-gold-400/40 bg-gold-500/15 px-4 py-1.5 text-lg font-bold text-gold-300">
                  LEVEL {player.level}
                </span>
              </div>

              <div className="mt-5 space-y-4">
                <ExpBar level={player.level} exp={player.exp} />
                <HpDisplay hp={player.hp} maxHp={player.maxHp} />

                <div className="flex flex-wrap items-center gap-2">
                  <CoinDisplay coins={player.coins} />
                  <span className="stat-chip text-slate-300">
                    <span aria-hidden="true">📈</span> EXP สะสมทั้งหมด{' '}
                    {getTotalExp(player).toLocaleString('th-TH')}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* สถิติรวม + สถิติต่อเนื่อง */}
        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
          <section
            aria-label="สถิติการเล่น"
            className="surface-card p-5 md:col-span-2"
          >
            <h3 className="text-lg font-bold text-white">📊 สถิติการเล่น</h3>

            {accuracy.hasData ? (
              <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <StatBox
                  label="คำถามทั้งหมด"
                  value={player.totalQuestions.toLocaleString('th-TH')}
                />
                <StatBox
                  label="ตอบถูก"
                  value={player.correctAnswers.toLocaleString('th-TH')}
                  tone="text-leaf-400"
                />
                <StatBox
                  label="ตอบผิด"
                  value={player.wrongAnswers.toLocaleString('th-TH')}
                  tone="text-slate-300"
                />
                <StatBox
                  label="ความแม่นยำ"
                  value={`${accuracy.accuracy}%`}
                  tone="text-sky-400"
                />
              </dl>
            ) : (
              <p className="mt-4 rounded-2xl bg-night-900/60 p-5 text-center text-slate-300">
                ยังไม่มีข้อมูล — ไปเล่นด่านแรกกันเลย แล้วสถิติจะเริ่มบันทึกให้ทันที
              </p>
            )}

            <p className="mt-4 text-sm text-slate-400">
              ผ่านด่านแล้ว {progression.overall.completedStages} จาก{' '}
              {progression.overall.totalStages} ด่าน · ⭐ {progression.overall.stars} /{' '}
              {progression.overall.maxStars} · เปิดโลกแล้ว{' '}
              {progression.overall.unlockedWorlds} จาก {progression.overall.totalWorlds} โลก
            </p>
          </section>

          <StreakBadge
            currentStreak={player.currentStreak}
            bestStreak={player.bestStreak}
            className="flex flex-col justify-center"
          />
        </div>

        {/* การ์ดทักษะ */}
        <section aria-label="ทักษะคณิตศาสตร์" className="surface-card mt-5 p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="text-lg font-bold text-white">🧠 ทักษะคณิตศาสตร์</h3>
            <p className="text-sm text-slate-400">
              ดาวคำนวณจากความแม่นยำของแต่ละทักษะ
            </p>
          </div>

          <ul className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
            {progression.coreSkills.map((skill) => (
              <SkillCard key={skill.id} skill={skill} />
            ))}
          </ul>

          {progression.skillToPractice ? (
            <div className="mt-4 rounded-2xl border border-arcane-400/30 bg-arcane-600/15 p-4">
              <p className="font-bold text-arcane-400">
                {progression.skillToPractice.practiceHint}
              </p>
              <p className="mt-1 text-sm text-slate-300">
                ทุกคนเก่งขึ้นได้ด้วยการฝึก ลองเล่นด่านที่มี
                {progression.skillToPractice.name}ดูอีกรอบนะ
              </p>
            </div>
          ) : (
            <p className="mt-4 text-sm text-slate-400">
              ฝึกให้ครบทุกทักษะแล้วระบบจะแนะนำว่าควรฝึกอะไรต่อ
            </p>
          )}
        </section>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          {progression.nextStage ? (
            <Button
              size="lg"
              fullWidth
              icon="⚔️"
              onClick={() =>
                navigate(
                  `/quest/${progression.nextStage?.worldId}/${progression.nextStage?.id}`,
                )
              }
            >
              ไปทำภารกิจต่อ
            </Button>
          ) : null}

          <Button
            size="lg"
            variant="secondary"
            fullWidth
            icon="🗺️"
            onClick={() => navigate('/map')}
          >
            ไปแผนที่โลก
          </Button>
        </div>

        <p className="mt-5 text-center text-xs text-slate-500">
          เริ่มผจญภัยเมื่อ {formatThaiDate(player.createdAt)} · เลเวลถัดไปอีก{' '}
          {expProgress.remaining.toLocaleString('th-TH')} EXP
        </p>
      </ScreenLayout>
    </>
  )
}

interface StatBoxProps {
  label: string
  value: string
  tone?: string
}

function StatBox({ label, value, tone = 'text-white' }: StatBoxProps) {
  return (
    <div className="rounded-2xl border border-white/10 bg-night-900/50 p-3 text-center">
      <dt className="text-xs text-slate-400">{label}</dt>
      <dd className={`mt-1 text-xl font-bold tabular-nums ${tone}`}>{value}</dd>
    </div>
  )
}

function formatThaiDate(isoDate: string): string {
  try {
    const date = new Date(isoDate)
    if (Number.isNaN(date.getTime())) return 'ไม่ทราบ'
    return date.toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  } catch {
    return 'ไม่ทราบ'
  }
}
