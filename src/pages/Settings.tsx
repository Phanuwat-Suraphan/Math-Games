import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../components/Button'
import { ScreenLayout } from '../components/ScreenLayout'
import { useGame } from '../context/useGame'
import { useGameSettings } from '../hooks/useGameSettings'
import { playSfx } from '../services/audioService'

export function Settings() {
  const navigate = useNavigate()
  const { player, resetProgress } = useGame()
  const { settings, toggleSound, toggleMusic, toggleAnimations } =
    useGameSettings()
  const [confirmingReset, setConfirmingReset] = useState(false)

  function handleReset() {
    resetProgress()
    setConfirmingReset(false)
    navigate('/', { replace: true })
  }

  return (
    <ScreenLayout width="narrow">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate(player ? '/menu' : '/')}
          aria-label="ย้อนกลับ"
          className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-white/15 text-slate-200 transition-colors hover:bg-white/10"
        >
          <span aria-hidden="true">←</span>
        </button>
        <h1 className="title-hero text-2xl font-black">⚙️ ตั้งค่า</h1>
      </div>

      <div className="surface-card mt-5 divide-y divide-white/10">
        <ToggleRow
          id="setting-sound"
          label="เสียงประกอบ"
          description="เสียงตอนตอบถูก ได้เหรียญ และเลเวลอัป"
          emoji="🔊"
          checked={settings.soundEnabled}
          onChange={(checked) => {
            toggleSound()
            if (checked) playSfx('correct')
          }}
        />

        <ToggleRow
          id="setting-music"
          label="ดนตรีประกอบ"
          description="เพลงประกอบที่เปลี่ยนไปตามหน้าและตามสถานการณ์ในเกม"
          emoji="🎵"
          checked={settings.musicEnabled}
          onChange={toggleMusic}
        />

        <ToggleRow
          id="setting-animations"
          label="เอฟเฟกต์การเคลื่อนไหว"
          description="ปิดได้ถ้ารู้สึกว่าภาพเคลื่อนไหวมากเกินไป"
          emoji="✨"
          checked={settings.animationsEnabled}
          onChange={toggleAnimations}
        />
      </div>

      <div className="surface-card mt-5 p-5">
        <h2 className="text-lg font-bold text-white">ข้อมูลการเล่น</h2>
        <p className="mt-1 text-sm text-slate-300">
          เกมนี้บันทึกข้อมูลไว้ในเบราว์เซอร์ของหนูเอง ไม่ได้ส่งออกไปที่อื่น
        </p>

        {player ? (
          <>
            <p className="mt-3 rounded-xl bg-night-900/60 px-4 py-3 text-sm text-slate-300">
              ตัวละครปัจจุบัน:{' '}
              <span className="font-bold text-white">{player.name}</span> · เลเวล{' '}
              {player.level} · ผ่านแล้ว {player.completedStages.length} ด่าน
            </p>

            {confirmingReset ? (
              <div
                role="alertdialog"
                aria-labelledby="reset-warning"
                className="mt-4 rounded-2xl border border-ember-500/40 bg-ember-600/15 p-4"
              >
                <p id="reset-warning" className="font-bold text-ember-400">
                  แน่ใจหรือไม่?
                </p>
                <p className="mt-1 text-sm text-slate-200">
                  ข้อมูลตัวละคร เลเวล เหรียญ และด่านที่ผ่านทั้งหมดจะถูกลบถาวร
                </p>
                <div className="mt-4 flex flex-col gap-2 sm:flex-row-reverse">
                  <Button variant="danger" fullWidth onClick={handleReset}>
                    ลบข้อมูลเลย
                  </Button>
                  <Button
                    variant="ghost"
                    fullWidth
                    onClick={() => setConfirmingReset(false)}
                    autoFocus
                  >
                    ยกเลิก
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                variant="danger"
                fullWidth
                className="mt-4"
                icon="🗑️"
                onClick={() => setConfirmingReset(true)}
              >
                ลบข้อมูลและเริ่มใหม่
              </Button>
            )}
          </>
        ) : (
          <p className="mt-3 text-sm text-slate-400">
            ยังไม่มีข้อมูลตัวละครที่บันทึกไว้
          </p>
        )}
      </div>

      <p className="mt-6 text-center text-xs text-slate-500">
        Math Adventure · Part 3 (ต้นแบบ)
      </p>
    </ScreenLayout>
  )
}

interface ToggleRowProps {
  id: string
  label: string
  description: string
  emoji: string
  checked: boolean
  onChange: (checked: boolean) => void
}

function ToggleRow({
  id,
  label,
  description,
  emoji,
  checked,
  onChange,
}: ToggleRowProps) {
  return (
    <div className="flex items-center gap-4 p-5">
      <span aria-hidden="true" className="text-2xl">
        {emoji}
      </span>

      <label htmlFor={id} className="min-w-0 flex-1 cursor-pointer">
        <span className="block font-bold text-white">{label}</span>
        <span className="block text-sm text-slate-400">{description}</span>
      </label>

      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={`${label}: ${checked ? 'เปิด' : 'ปิด'}`}
        onClick={() => onChange(!checked)}
        className={`relative h-8 w-14 shrink-0 rounded-full border-2 transition-colors ${
          checked
            ? 'border-leaf-500 bg-leaf-500/70'
            : 'border-night-500 bg-night-700'
        }`}
      >
        <span
          aria-hidden="true"
          className={`absolute top-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-white text-xs font-bold text-night-900 transition-all ${
            checked ? 'left-[26px]' : 'left-0.5'
          }`}
        >
          {checked ? '✓' : '✕'}
        </span>
      </button>
    </div>
  )
}
