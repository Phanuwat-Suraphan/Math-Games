import { useState, type FormEvent } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Button } from '../components/Button'
import { ScreenLayout } from '../components/ScreenLayout'
import { AVATARS, DEFAULT_AVATAR_ID } from '../data/avatars'
import { useGame } from '../context/useGame'
import { sanitizeName } from '../services/storage'

const MAX_NAME_LENGTH = 20

export function CreatePlayer() {
  const navigate = useNavigate()
  const { player, startNewGame } = useGame()

  const [name, setName] = useState('')
  const [avatarId, setAvatarId] = useState(DEFAULT_AVATAR_ID)
  const [error, setError] = useState<string | null>(null)

  const isReplacing = player !== null

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const cleanName = sanitizeName(name)
    if (cleanName.length === 0) {
      setError('กรุณาตั้งชื่อตัวละครก่อนนะ')
      return
    }
    if (cleanName.length < 2) {
      setError('ชื่อต้องมีอย่างน้อย 2 ตัวอักษร')
      return
    }

    setError(null)
    startNewGame(cleanName, avatarId)
    navigate('/menu', { replace: true })
  }

  return (
    <ScreenLayout width="normal">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-white sm:text-4xl">
          สร้างตัวละครของหนู
        </h1>
        <p className="mt-2 text-slate-300">
          ตั้งชื่อและเลือกอาชีพที่ชอบ แล้วออกเดินทางกันเลย!
        </p>
      </div>

      {isReplacing ? (
        <p
          role="alert"
          className="mt-5 rounded-2xl border border-gold-400/40 bg-gold-500/15 p-4 text-center text-sm font-semibold text-gold-300"
        >
          ⚠️ ถ้าสร้างตัวละครใหม่ ความคืบหน้าของ “{player.name}” จะถูกแทนที่
        </p>
      ) : null}

      <form onSubmit={handleSubmit} className="mt-6">
        <div className="surface-card p-5">
          <label
            htmlFor="player-name"
            className="block text-lg font-bold text-white"
          >
            ชื่อตัวละคร
          </label>
          <input
            id="player-name"
            type="text"
            value={name}
            onChange={(event) => {
              setName(event.target.value)
              if (error) setError(null)
            }}
            maxLength={MAX_NAME_LENGTH}
            autoComplete="off"
            placeholder="เช่น น้องมิว"
            aria-describedby="player-name-help"
            aria-invalid={error !== null}
            className="mt-3 w-full rounded-2xl border-2 border-night-500 bg-night-900/70 px-4 py-3.5 text-lg text-white placeholder:text-slate-500 focus:border-arcane-400 focus:outline-none"
          />
          <div
            id="player-name-help"
            className="mt-2 flex items-center justify-between text-sm text-slate-400"
          >
            <span>ใช้ได้ 2 – {MAX_NAME_LENGTH} ตัวอักษร</span>
            <span className="tabular-nums">
              {name.length} / {MAX_NAME_LENGTH}
            </span>
          </div>

          {error ? (
            <p
              role="alert"
              className="mt-3 rounded-xl bg-ember-600/20 px-3 py-2 text-sm font-semibold text-ember-400"
            >
              ⚠️ {error}
            </p>
          ) : null}
        </div>

        <fieldset className="mt-6">
          <legend className="mb-3 text-lg font-bold text-white">
            เลือกอาชีพ
          </legend>

          {/*
            แสดงเฉพาะอาชีพที่เลือกได้ฟรี
            ตัวที่ต้องซื้อไม่เอามาโชว์ตรงนี้ เพราะเด็กที่เพิ่งเปิดเกมยังไม่มีเหรียญเลย
            การโชว์ของที่กดไม่ได้ตั้งแต่หน้าจอแรกทำให้รู้สึกว่าถูกกันไว้ก่อนจะได้เริ่มด้วยซ้ำ
            ตัวที่เหลือไปเจอในร้านค้าตอนมีเหรียญแล้ว ซึ่งเป็นจังหวะที่ซื้อได้จริง
          */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {AVATARS.filter((avatar) => avatar.price === 0).map((avatar) => {
              const isSelected = avatar.id === avatarId

              return (
                <motion.button
                  key={avatar.id}
                  type="button"
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setAvatarId(avatar.id)}
                  aria-pressed={isSelected}
                  aria-label={`เลือกอาชีพ ${avatar.name}: ${avatar.description}`}
                  className={[
                    'flex min-h-[132px] flex-col items-center justify-center gap-1 rounded-xl2 border-2 p-3 text-center transition-all',
                    isSelected
                      ? 'border-gold-300 bg-arcane-600/25 shadow-glow'
                      : 'border-white/10 bg-night-800/70 hover:border-white/30',
                  ].join(' ')}
                >
                  <span aria-hidden="true" className="text-4xl">
                    {avatar.emoji}
                  </span>
                  <span className="mt-1 text-base font-bold text-white">
                    {avatar.name}
                  </span>
                  <span className="text-xs leading-tight text-slate-400">
                    {avatar.description}
                  </span>
                  {isSelected ? (
                    <span className="mt-1 text-xs font-bold text-gold-300">
                      ✓ เลือกอยู่
                    </span>
                  ) : null}
                </motion.button>
              )
            })}
          </div>
        </fieldset>

        <div className="mt-7 flex flex-col gap-3 sm:flex-row-reverse">
          <Button type="submit" size="lg" fullWidth icon="🚀">
            สร้างตัวละคร
          </Button>
          <Button
            type="button"
            size="lg"
            variant="ghost"
            fullWidth
            onClick={() => navigate('/')}
          >
            ย้อนกลับ
          </Button>
        </div>
      </form>
    </ScreenLayout>
  )
}
