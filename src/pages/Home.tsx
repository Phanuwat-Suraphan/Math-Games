import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Button } from '../components/Button'
import { ScreenLayout } from '../components/ScreenLayout'
import { AvatarBadge } from '../components/AvatarBadge'
import { getAvatar } from '../data/avatars'
import { useGame } from '../context/useGame'

export function Home() {
  const navigate = useNavigate()
  const { player, isLoading } = useGame()

  if (isLoading) {
    return (
      <ScreenLayout width="narrow" className="text-center">
        <p className="mt-20 animate-pulse text-lg text-slate-300">
          กำลังเปิดหนังสือผจญภัย...
        </p>
      </ScreenLayout>
    )
  }

  const hasSave = player !== null

  return (
    <ScreenLayout width="narrow" className="flex min-h-screen flex-col justify-center">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="text-center"
      >
        <motion.p
          aria-hidden="true"
          className="text-6xl sm:text-7xl"
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        >
          🧭
        </motion.p>

        <h1 className="mt-4 bg-gradient-to-r from-gold-300 via-arcane-400 to-sky-400 bg-clip-text text-4xl font-bold text-transparent sm:text-6xl">
          Math Adventure
        </h1>
        <p className="mt-3 text-base text-slate-300 sm:text-lg">
          ผจญภัยไปกับตัวเลข สำหรับนักเรียนชั้น ป.4 – ป.6
        </p>
      </motion.div>

      {hasSave ? (
        <div className="surface-card mt-8 flex items-center gap-4 p-4">
          <AvatarBadge avatar={getAvatar(player.avatar)} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-lg font-bold text-white">{player.name}</p>
            <p className="text-sm text-slate-300">
              เลเวล {player.level} · ผ่านแล้ว {player.completedStages.length} ด่าน
            </p>
          </div>
        </div>
      ) : null}

      <div className="mt-8 space-y-3">
        <Button
          size="lg"
          fullWidth
          icon="⚔️"
          onClick={() => navigate(hasSave ? '/menu' : '/create')}
        >
          {hasSave ? 'เล่นต่อ' : 'เริ่มผจญภัย'}
        </Button>

        <Button
          size="lg"
          variant="secondary"
          fullWidth
          icon="📂"
          disabled={!hasSave}
          onClick={() => navigate('/menu')}
          aria-label={
            hasSave ? 'โหลดเกมที่บันทึกไว้' : 'ยังไม่มีเกมที่บันทึกไว้'
          }
        >
          โหลดเกม
        </Button>

        {hasSave ? (
          <Button
            size="lg"
            variant="ghost"
            fullWidth
            icon="✨"
            onClick={() => navigate('/create')}
          >
            สร้างตัวละครใหม่
          </Button>
        ) : null}

        <Button
          size="lg"
          variant="ghost"
          fullWidth
          icon="⚙️"
          onClick={() => navigate('/settings')}
        >
          ตั้งค่า
        </Button>
      </div>

      {!hasSave ? (
        <p className="mt-6 text-center text-sm text-slate-400">
          ยังไม่มีตัวละคร กด “เริ่มผจญภัย” เพื่อสร้างตัวละครของหนูได้เลย
        </p>
      ) : null}
    </ScreenLayout>
  )
}
