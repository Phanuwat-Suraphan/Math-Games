import { AnimatePresence, motion } from 'framer-motion'
import { GameIcon, HeroArt, MonsterArt, WorldSceneArt } from '../art/GameArt'
import type { BattleState } from '../../types/battle'

/**
 * สนามรบ — ผู้เล่นฝั่งซ้าย มอนสเตอร์ฝั่งขวา
 *
 * บนจอเล็กเรียงซ้ายขวาเหมือนกัน แต่ย่อขนาดลง ไม่เรียงบนล่าง
 * เพราะถ้าเรียงบนล่างจะดันโจทย์ตกจอ ซึ่งโจทย์คือสิ่งสำคัญที่สุด
 */

interface HealthBarProps {
  current: number
  max: number
  shield: number
  tone: 'player' | 'monster'
}

function HealthBar({ current, max, shield, tone }: HealthBarProps) {
  const percent = Math.max(0, Math.min(100, (current / Math.max(1, max)) * 100))
  const shieldPercent = Math.max(0, Math.min(100, (shield / Math.max(1, max)) * 100))

  return (
    <div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-black/50">
        <motion.div
          className={`h-full rounded-full ${
            tone === 'player'
              ? 'bg-gradient-to-r from-leaf-600 to-leaf-400'
              : 'bg-gradient-to-r from-ember-600 to-ember-400'
          }`}
          animate={{ width: `${percent}%` }}
          transition={{ duration: 0.4 }}
        />
      </div>

      {/* แถบโล่แยกจากพลังชีวิต เด็กจะได้เห็นว่าต้องทำลายเกราะก่อน */}
      {shield > 0 ? (
        <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-black/50">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-sky-600 to-sky-300"
            animate={{ width: `${shieldPercent}%` }}
            transition={{ duration: 0.4 }}
          />
        </div>
      ) : null}

      <p className="mt-1 text-center text-xs font-bold tabular-nums text-slate-200">
        {current} / {max}
        {shield > 0 ? (
          <span className="ml-1 text-sky-300">
            <GameIcon name="shield" size="h-3 w-3" /> {shield}
          </span>
        ) : null}
      </p>
    </div>
  )
}

interface BattleArenaProps {
  state: BattleState
  worldId: string
  /** ตัวเลขดาเมจที่เพิ่งเกิด ใช้แสดงเป็นตัวเลขลอยขึ้น */
  popup: { text: string; tone: 'damage' | 'heal' | 'critical' } | null
  /** มอนสเตอร์เพิ่งโดนตี ให้สั่น */
  monsterHurt: boolean
}

export function BattleArena({ state, worldId, popup, monsterHurt }: BattleArenaProps) {
  return (
    <div className="relative overflow-hidden rounded-xl2 border border-white/10">
      <WorldSceneArt
        worldId={worldId}
        className="absolute inset-0 h-full w-full"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-b from-night-900/60 to-night-900/85"
      />

      <div className="relative flex items-end justify-between gap-2 p-4">
        {/* ฝั่งผู้เล่น */}
        <div className="flex-1">
          <HeroArt
            avatarId={state.player.avatar}
            className="mx-auto h-20 w-20 sm:h-28 sm:w-28"
            label={`ตัวละครของ ${state.player.name}`}
          />
          <p className="mt-1 truncate text-center text-sm font-bold text-white">
            {state.player.name}
          </p>
          <p className="mb-1 text-center text-xs text-slate-300">
            เลเวล {state.player.level}
          </p>
          <HealthBar
            current={state.player.hp}
            max={state.player.maxHp}
            shield={state.player.shield}
            tone="player"
          />
        </div>

        <div className="relative shrink-0 pb-10">
          <GameIcon name="sword" size="h-7 w-7" />
          {/* ตัวเลขดาเมจลอยขึ้นตรงกลาง เห็นชัดว่าคณิตศาสตร์ทำให้เกิดอะไร */}
          <AnimatePresence>
            {popup ? (
              <motion.p
                key={popup.text + Math.random()}
                initial={{ opacity: 0, y: 8, scale: 0.8 }}
                animate={{ opacity: 1, y: -26, scale: 1 }}
                exit={{ opacity: 0, y: -44 }}
                transition={{ duration: 0.7 }}
                className={`absolute left-1/2 top-0 -translate-x-1/2 whitespace-nowrap text-xl font-extrabold ${
                  popup.tone === 'heal'
                    ? 'text-leaf-400'
                    : popup.tone === 'critical'
                      ? 'text-gold-300'
                      : 'text-ember-400'
                }`}
              >
                {popup.text}
              </motion.p>
            ) : null}
          </AnimatePresence>
        </div>

        {/* ฝั่งมอนสเตอร์ */}
        <div className="flex-1">
          <motion.div
            animate={monsterHurt ? { x: [0, -7, 7, -4, 0] } : { x: 0 }}
            transition={{ duration: 0.35 }}
          >
            <MonsterArt
              monsterId={state.monster.monsterId}
              className="mx-auto h-20 w-20 sm:h-28 sm:w-28"
              label={state.monster.thaiName}
            />
          </motion.div>
          <p className="mt-1 truncate text-center text-sm font-bold text-white">
            {state.monster.thaiName}
          </p>
          <p className="mb-1 text-center text-xs text-slate-300">
            {state.monster.type === 'boss'
              ? 'บอส'
              : state.monster.type === 'mini_boss'
                ? 'มินิบอส'
                : state.monster.type === 'elite'
                  ? 'ชั้นสูง'
                  : 'ธรรมดา'}
          </p>
          <HealthBar
            current={state.monster.hp}
            max={state.monster.maxHp}
            shield={state.monster.shield}
            tone="monster"
          />
        </div>
      </div>
    </div>
  )
}
