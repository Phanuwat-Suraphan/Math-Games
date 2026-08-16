import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Button } from '../components/Button'
import { ScreenLayout } from '../components/ScreenLayout'
import { AvatarBadge } from '../components/AvatarBadge'
import { HeroArt, MonsterArt, WorldSceneArt } from '../components/art/GameArt'
import { getAvatar } from '../data/avatars'
import { useGame } from '../context/useGame'

/**
 * สัญลักษณ์ที่ลอยขึ้นบนภาพหลัก
 *
 * ตำแหน่งกับจังหวะกำหนดไว้ตายตัว ไม่ได้สุ่ม
 * เพราะการสุ่มทุกครั้งที่เข้าหน้าทำให้บางครั้งสัญลักษณ์ไปกองอยู่มุมเดียว
 * ซึ่งดูเหมือนภาพเสียมากกว่าดูเป็นบรรยากาศ
 */
const FLOATING = [
  { char: '+', left: '10%', bottom: '22%', delay: '0s', size: '1.5rem' },
  { char: '×', left: '24%', bottom: '46%', delay: '2.4s', size: '1.1rem' },
  { char: '÷', left: '41%', bottom: '62%', delay: '4.8s', size: '1.3rem' },
  { char: '√', left: '63%', bottom: '34%', delay: '1.4s', size: '1.4rem' },
  { char: '−', left: '79%', bottom: '55%', delay: '3.6s', size: '1.2rem' },
  { char: '=', left: '90%', bottom: '26%', delay: '6.2s', size: '1rem' },
]

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
      {/*
        ภาพหลักของเกม
        ซ้อนสามชั้นแบบฉากละคร ฉากหลัง ตัวละคร และแสง
        เป้าหมายคือให้ภาพเดียวบอกครบว่าเราคือใคร อยู่ที่ไหน และจะไปสู้กับอะไร
      */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="stage panel panel-hero mx-auto aspect-[16/10] w-full max-w-xl"
      >
        {/* ฉากหลัง หรี่ลงและเบลอเล็กน้อย เพื่อไม่ให้แย่งสายตากับตัวละคร */}
        <div className="absolute inset-0 opacity-55 blur-[1px]">
          <WorldSceneArt worldId="world-1" className="h-full w-full object-cover" />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-night-900 via-night-900/45 to-transparent" />

        <div className="stage-rays" aria-hidden="true" />

        {/* มอนสองตัวยืนขนาบ เล็กกว่าและมืดกว่า ทำให้ตัวเอกเด่นขึ้นโดยไม่ต้องขยาย */}
        <div className="absolute bottom-[14%] left-[6%] w-[22%] opacity-70 brightness-75">
          <MonsterArt monsterId="number-slime" className="h-full w-full" />
        </div>
        <div className="absolute bottom-[16%] right-[5%] w-[24%] opacity-70 brightness-75">
          <MonsterArt monsterId="dragon-of-numbers" className="h-full w-full" />
        </div>

        <div className="stage-pedestal" aria-hidden="true" />

        {/* ตัวเอก ขยับขึ้นลงช้า ๆ ให้รู้สึกว่ากำลังหายใจอยู่ */}
        <motion.div
          className="absolute bottom-[12%] left-1/2 w-[34%] -translate-x-1/2"
          animate={{ y: [0, -7, 0] }}
          transition={{ duration: 3.4, repeat: Infinity, ease: 'easeInOut' }}
        >
          <HeroArt
            avatarId={player?.avatar ?? 'warrior'}
            className="h-full w-full drop-shadow-[0_10px_24px_rgba(252,211,77,0.35)]"
          />
        </motion.div>

        {FLOATING.map((item) => (
          <span
            key={item.char + item.left}
            aria-hidden="true"
            className="float-symbol"
            style={{
              left: item.left,
              bottom: item.bottom,
              animationDelay: item.delay,
              fontSize: item.size,
            }}
          >
            {item.char}
          </span>
        ))}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.15 }}
        className="text-center"
      >
        <h1 className="title-gold mt-6 text-4xl font-black tracking-tight sm:text-6xl">
          Math Adventure
        </h1>
        <p className="mt-3 text-base text-slate-300 sm:text-lg">
          ผจญภัยไปกับตัวเลข สำหรับนักเรียนชั้น ป.4 – ป.6
        </p>
        <div className="divider-ornate mx-auto mt-5 max-w-xs text-sm">◆</div>
      </motion.div>

      {hasSave ? (
        <div className="surface-card panel-hero panel-corners lift mt-8 flex items-center gap-4 p-5">
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
          className="cta-glow"
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
