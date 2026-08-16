import { motion } from 'framer-motion'
import type { CSSProperties } from 'react'
import { useNavigate } from 'react-router-dom'
import { PlayerCard } from '../components/PlayerCard'
import { ScreenLayout } from '../components/ScreenLayout'
import { MonsterArt, WorldSceneArt } from '../components/art/GameArt'
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
  /**
   * ภาพประกอบของโหมดนี้
   *
   * โหมดที่เป็น "การเล่น" จะมีภาพจริง ส่วนโหมดที่เป็นการตั้งค่าใช้อิโมจิพอ
   * ตั้งใจให้ต่างกัน เพราะถ้าทุกใบเด่นเท่ากันก็เท่ากับไม่มีใบไหนเด่น
   * เด็กที่เพิ่งเข้าเมนูควรถูกดึงไปที่ "ไปเล่น" ก่อน ไม่ใช่ไปหน้าตั้งค่า
   */
  art?: { kind: 'scene'; id: string } | { kind: 'monster'; id: string }
  /** สีเรืองแสงประจำใบ ใช้ตอนชี้ */
  glow?: string
}

const MENU_ITEMS: MenuItem[] = [
  {
    to: '/map',
    emoji: '🗺️',
    art: { kind: 'scene', id: 'world-1' },
    glow: '#4ade80',
    label: 'แผนที่โลก',
    description: 'ออกเดินทางไปยังโลกต่าง ๆ',
    accent: 'from-leaf-500/30 to-leaf-600/10',
  },
  {
    to: '/quests',
    emoji: '📜',
    art: { kind: 'monster', id: 'math-guardian' },
    glow: '#fbbf24',
    label: 'ภารกิจ',
    description: 'ดูภารกิจที่กำลังทำอยู่',
    accent: 'from-gold-500/30 to-gold-600/10',
  },
  {
    to: '/arena',
    emoji: '⚔️',
    art: { kind: 'monster', id: 'dragon-of-numbers' },
    glow: '#f43f5e',
    label: 'สนามรบตัวเลข',
    description: 'เดินหลบมอน ยิงเอง เลเวลอัปสุ่มสกิล',
    accent: 'from-ember-500/30 to-arcane-600/10',
  },
  {
    to: '/tower',
    emoji: '🗼',
    art: { kind: 'monster', id: 'geometry-golem' },
    glow: '#a78bfa',
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
                whileHover={{ y: -4 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate(item.to)}
                style={
                  item.glow
                    ? ({ '--glow': item.glow } as CSSProperties)
                    : undefined
                }
                className={`menu-tile group relative flex w-full items-center gap-4 overflow-hidden rounded-xl2 border border-white/10 bg-gradient-to-br ${item.accent} p-5 text-left`}
              >
                {/*
                  ภาพประกอบวางไว้ขวาสุดและถูกตัดขอบ
                  ทำให้การ์ดดูเหมือนหน้าต่างที่มองเข้าไปเห็นโหมดนั้นจริง ๆ
                  ต่างจากไอคอนกลม ๆ ที่วางไว้เฉย ๆ ซึ่งอ่านเป็นปุ่มเมนูทั่วไป
                */}
                {item.art ? (
                  <span
                    aria-hidden="true"
                    className="menu-tile-art pointer-events-none absolute -right-4 top-1/2 h-[130%] w-32 -translate-y-1/2 opacity-45 transition-all duration-300 group-hover:scale-110 group-hover:opacity-65 sm:w-40"
                  >
                    {item.art.kind === 'scene' ? (
                      <WorldSceneArt worldId={item.art.id} className="h-full w-full" />
                    ) : (
                      <MonsterArt monsterId={item.art.id} className="h-full w-full" />
                    )}
                  </span>
                ) : null}

                <span aria-hidden="true" className="relative text-3xl sm:text-4xl">
                  {item.emoji}
                </span>
                <span className="relative min-w-0 flex-1">
                  <span className="block text-lg font-black text-white">
                    {item.label}
                  </span>
                  <span className="block text-sm text-slate-300">
                    {item.description}
                  </span>
                </span>
                <span
                  aria-hidden="true"
                  className="relative text-xl text-slate-400 transition-transform duration-200 group-hover:translate-x-1 group-hover:text-white"
                >
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
