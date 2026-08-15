import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { PlayerCard } from '../components/PlayerCard'
import { ScreenLayout } from '../components/ScreenLayout'
import { useGame } from '../context/useGame'
import { useProgression } from '../hooks/useProgression'
import { getOverallAccuracy } from '../utils/statistics'
import type { Player } from '../types/player'

interface MenuItem {
  to: string
  emoji: string
  label: string
  description: string
  accent: string
}

const MENU_ITEMS: MenuItem[] = [
  {
    to: '/map',
    emoji: '🗺️',
    label: 'แผนที่โลก',
    description: 'ออกเดินทางไปยังโลกต่าง ๆ',
    accent: 'from-leaf-500/30 to-leaf-600/10',
  },
  {
    to: '/quests',
    emoji: '📜',
    label: 'ภารกิจ',
    description: 'ดูภารกิจที่กำลังทำอยู่',
    accent: 'from-gold-500/30 to-gold-600/10',
  },
  {
    to: '/tower',
    emoji: '🗼',
    label: 'หอคอยไม่รู้จบ',
    description: 'ปีนให้สูงที่สุด ยิ่งสูงยิ่งยาก ตายแล้วเริ่มใหม่',
    accent: 'from-arcane-500/30 to-ember-600/10',
  },
  {
    to: '/journal',
    emoji: '📖',
    label: 'สมุดบันทึก',
    description: 'อ่านเรื่องราวที่ค้นพบมาแล้ว',
    accent: 'from-gold-500/25 to-gold-600/10',
  },
  {
    to: '/shop',
    emoji: '🛒',
    label: 'ร้านค้า',
    description: 'ใช้เหรียญซื้อของ แล้วสวมใส่ได้เลย',
    accent: 'from-ember-500/30 to-ember-600/10',
  },
  {
    to: '/character',
    emoji: '👤',
    label: 'ตัวละคร',
    description: 'ดูข้อมูลและความสามารถ',
    accent: 'from-arcane-500/30 to-arcane-600/10',
  },
  {
    to: '/achievements',
    emoji: '🏆',
    label: 'ความสำเร็จ',
    description: 'สะสมถ้วยรางวัลจากการผจญภัย',
    accent: 'from-sky-500/30 to-sky-600/10',
  },
  {
    to: '/settings',
    emoji: '⚙️',
    label: 'ตั้งค่า',
    description: 'เสียง การเคลื่อนไหว และข้อมูล',
    accent: 'from-slate-500/30 to-slate-600/10',
  },
]

export function MainMenu({ player }: { player: Player }) {
  const navigate = useNavigate()
  const { storageWarning, dismissStorageWarning } = useGame()
  const progress = useProgression(player)
  const accuracy = getOverallAccuracy(player.totalQuestions, player.correctAnswers)

  return (
    <ScreenLayout width="normal">
      {storageWarning ? (
        <div
          role="alert"
          className="mb-5 flex items-start gap-3 rounded-2xl border border-gold-400/40 bg-gold-500/15 p-4"
        >
          <span aria-hidden="true" className="text-xl">
            ⚠️
          </span>
          <p className="flex-1 text-sm font-semibold text-gold-300">
            {storageWarning}
          </p>
          <button
            type="button"
            onClick={dismissStorageWarning}
            aria-label="ปิดข้อความแจ้งเตือน"
            className="rounded-lg px-2 py-1 text-gold-300 hover:bg-white/10"
          >
            ✕
          </button>
        </div>
      ) : null}

      <PlayerCard player={player} />

      <p className="mt-4 text-center text-sm text-slate-400">
        ความคืบหน้ารวม: ผ่านแล้ว {progress.overall.completedStages} จาก{' '}
        {progress.overall.totalStages} ด่าน · ⭐ {progress.overall.stars} /{' '}
        {progress.overall.maxStars} · เปิดโลกแล้ว {progress.overall.unlockedWorlds}{' '}
        จาก {progress.overall.totalWorlds} โลก
        {accuracy.hasData
          ? ` · ความแม่นยำ ${accuracy.accuracy}% จาก ${accuracy.totalQuestions} ข้อ`
          : ''}
      </p>

      <nav aria-label="เมนูหลัก" className="mt-6">
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {MENU_ITEMS.map((item, index) => (
            <li key={item.to} className={index === 0 ? 'sm:col-span-2' : ''}>
              <motion.button
                type="button"
                whileHover={{ y: -3 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate(item.to)}
                className={`relative flex w-full items-center gap-4 overflow-hidden rounded-xl2 border border-white/10 bg-gradient-to-br ${item.accent} p-5 text-left transition-colors hover:border-white/25`}
              >
                <span aria-hidden="true" className="text-3xl sm:text-4xl">
                  {item.emoji}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-lg font-bold text-white">
                    {item.label}
                  </span>
                  <span className="block text-sm text-slate-300">
                    {item.description}
                  </span>
                </span>
                <span aria-hidden="true" className="text-xl text-slate-400">
                  →
                </span>
              </motion.button>
            </li>
          ))}
        </ul>
      </nav>
    </ScreenLayout>
  )
}
