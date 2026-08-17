import { ScreenLayout } from '../components/ScreenLayout'
import { TopBar } from '../components/TopBar'
import { ACHIEVEMENTS, CATEGORY_INFO } from '../data/achievements'
import type { Achievement } from '../data/achievements'
import type { Player } from '../types/player'

export function Achievements({ player }: { player: Player }) {
  const unlockedCount = ACHIEVEMENTS.filter((achievement) =>
    achievement.isUnlocked(player),
  ).length
  const percent = Math.round((unlockedCount / ACHIEVEMENTS.length) * 100)

  return (
    <>
      <TopBar
        player={player}
        title="ความสำเร็จ"
        backTo="/menu"
        backLabel="เมนูหลัก"
      />

      <ScreenLayout width="normal">
        <div className="panel panel-hero panel-corners p-5 text-center">
          <p aria-hidden="true" className="text-5xl">
            🏆
          </p>
          <h2 className="title-gold mt-2 text-3xl font-black">ถ้วยรางวัลของหนู</h2>
          <p className="mt-1 text-slate-300">
            ปลดล็อกแล้ว{' '}
            <span className="font-black tabular-nums text-gold-300">
              {unlockedCount}
            </span>{' '}
            จาก {ACHIEVEMENTS.length} รายการ
          </p>
          <div className="bar-track mx-auto mt-4 h-3 w-full max-w-sm">
            <div className="bar-fill h-full" style={{ width: `${percent}%` }} />
          </div>
          <p className="mt-2 text-xs font-bold tabular-nums text-slate-400">
            {percent}%
          </p>
        </div>

        {CATEGORY_INFO.map((category) => {
          const items = ACHIEVEMENTS.filter(
            (achievement) => achievement.category === category.id,
          )
          if (items.length === 0) return null

          const done = items.filter((item) => item.isUnlocked(player)).length

          return (
            <section key={category.id} className="mt-6">
              <div className="flex items-center gap-2">
                <span aria-hidden="true" className="text-xl">
                  {category.emoji}
                </span>
                <h3 className="text-lg font-black text-white">{category.name}</h3>
                <span className="rounded-full bg-night-800 px-2 py-0.5 text-xs font-bold tabular-nums text-slate-300">
                  {done} / {items.length}
                </span>
                <span className="divider-ornate ml-1 hidden flex-1 sm:block" />
              </div>

              <ul className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {items.map((achievement) => (
                  <AchievementCard
                    key={achievement.id}
                    achievement={achievement}
                    player={player}
                  />
                ))}
              </ul>
            </section>
          )
        })}
      </ScreenLayout>
    </>
  )
}

function AchievementCard({
  achievement,
  player,
}: {
  achievement: Achievement
  player: Player
}) {
  const unlocked = achievement.isUnlocked(player)

  return (
    <li
      className={`panel lift flex items-start gap-3 p-4 ${
        unlocked ? 'sheen border-gold-400/40' : 'opacity-75'
      }`}
    >
      <span
        aria-hidden="true"
        className={`text-3xl ${unlocked ? '' : 'grayscale opacity-60'}`}
      >
        {unlocked ? achievement.emoji : '🔒'}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h4 className="font-bold text-white">{achievement.name}</h4>
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-bold ${
              unlocked
                ? 'bg-gold-500/25 text-gold-300'
                : 'bg-night-700 text-slate-400'
            }`}
          >
            {unlocked ? '✓ ปลดล็อกแล้ว' : 'ยังไม่ปลดล็อก'}
          </span>
        </div>
        <p className="mt-1 text-sm text-slate-300">{achievement.description}</p>
        <p className="mt-1 text-xs tabular-nums text-slate-400">
          ความคืบหน้า: {achievement.getProgressText(player)}
        </p>
      </div>
    </li>
  )
}
