import { ScreenLayout } from '../components/ScreenLayout'
import { TopBar } from '../components/TopBar'
import { ACHIEVEMENTS } from '../data/achievements'
import type { Player } from '../types/player'

export function Achievements({ player }: { player: Player }) {
  const unlockedCount = ACHIEVEMENTS.filter((achievement) =>
    achievement.isUnlocked(player),
  ).length

  return (
    <>
      <TopBar
        player={player}
        title="ความสำเร็จ"
        backTo="/menu"
        backLabel="เมนูหลัก"
      />

      <ScreenLayout width="normal">
        <div className="surface-card p-5 text-center">
          <p aria-hidden="true" className="text-4xl">
            🏆
          </p>
          <h2 className="mt-2 text-2xl font-bold text-white">ถ้วยรางวัลของหนู</h2>
          <p className="mt-1 text-slate-300">
            ปลดล็อกแล้ว{' '}
            <span className="font-bold text-gold-300">{unlockedCount}</span> จาก{' '}
            {ACHIEVEMENTS.length} รายการ
          </p>
          <div className="mx-auto mt-4 h-2.5 w-full max-w-sm overflow-hidden rounded-full bg-night-900/70">
            <div
              className="h-full rounded-full bg-gradient-to-r from-gold-300 to-gold-500 transition-all duration-500"
              style={{
                width: `${Math.round((unlockedCount / ACHIEVEMENTS.length) * 100)}%`,
              }}
            />
          </div>
        </div>

        <ul className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {ACHIEVEMENTS.map((achievement) => {
            const unlocked = achievement.isUnlocked(player)

            return (
              <li
                key={achievement.id}
                className={`surface-card flex items-start gap-3 p-4 ${
                  unlocked ? 'border-gold-400/40' : 'opacity-75'
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
                    <h3 className="font-bold text-white">{achievement.name}</h3>
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
                  <p className="mt-1 text-sm text-slate-300">
                    {achievement.description}
                  </p>
                  <p className="mt-1 text-xs tabular-nums text-slate-400">
                    ความคืบหน้า: {achievement.getProgressText(player)}
                  </p>
                </div>
              </li>
            )
          })}
        </ul>
      </ScreenLayout>
    </>
  )
}
