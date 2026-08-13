import { ScreenLayout } from '../components/ScreenLayout'
import { TopBar } from '../components/TopBar'
import { AvatarBadge } from '../components/AvatarBadge'
import { ExpBar } from '../components/ExpBar'
import { HpDisplay } from '../components/HpDisplay'
import { getAvatar } from '../data/avatars'
import type { Player } from '../types/player'
import { expRequiredForLevel } from '../utils/levelSystem'
import { getOverallProgress } from '../utils/progression'

export function Character({ player }: { player: Player }) {
  const avatar = getAvatar(player.avatar)
  const progress = getOverallProgress(player)
  const createdDate = formatThaiDate(player.createdAt)

  return (
    <>
      <TopBar player={player} title="ตัวละคร" backTo="/menu" backLabel="เมนูหลัก" />

      <ScreenLayout width="normal">
        <section className="surface-card p-6 text-center">
          <div className="flex justify-center">
            <AvatarBadge avatar={avatar} size="lg" />
          </div>
          <h2 className="mt-4 text-2xl font-bold text-white sm:text-3xl">
            {player.name}
          </h2>
          <p className="mt-1 text-arcane-400">
            {avatar.emoji} {avatar.name}
          </p>
          <p className="mt-1 text-sm text-slate-400">{avatar.description}</p>

          <div className="mx-auto mt-6 max-w-md space-y-4">
            <ExpBar level={player.level} exp={player.exp} />
            <HpDisplay hp={player.hp} maxHp={player.maxHp} />
          </div>
        </section>

        <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatBox emoji="⭐" label="เลเวล" value={String(player.level)} />
          <StatBox
            emoji="✨"
            label="EXP สู่เลเวลถัดไป"
            value={`${Math.max(0, expRequiredForLevel(player.level) - player.exp)}`}
          />
          <StatBox
            emoji="🪙"
            label="เหรียญ"
            value={player.coins.toLocaleString('th-TH')}
          />
          <StatBox
            emoji="🏅"
            label="ด่านที่ผ่าน"
            value={`${progress.completedLevels} / ${progress.totalLevels}`}
          />
        </dl>

        <div className="surface-card mt-5 p-5">
          <h3 className="text-lg font-bold text-white">ข้อมูลการผจญภัย</h3>
          <ul className="mt-3 space-y-2 text-sm text-slate-300">
            <li>🗓️ เริ่มผจญภัยเมื่อ: {createdDate}</li>
            <li>
              🌍 เปิดโลกแล้ว: {progress.unlockedWorlds} จาก {progress.totalWorlds}{' '}
              โลก
            </li>
            <li>
              🎒 ระบบแต่งตัว สัตว์เลี้ยง และไอเทม จะเปิดให้เล่นในตอนต่อไป
            </li>
          </ul>
        </div>
      </ScreenLayout>
    </>
  )
}

function StatBox({
  emoji,
  label,
  value,
}: {
  emoji: string
  label: string
  value: string
}) {
  return (
    <div className="surface-card p-4 text-center">
      <dt className="text-xs text-slate-400">
        <span aria-hidden="true">{emoji}</span> {label}
      </dt>
      <dd className="mt-1 text-xl font-bold tabular-nums text-white">{value}</dd>
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
