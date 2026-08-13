import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { GameSettings, Player } from '../types/player'
import type { Level, LevelResult } from '../types/level'
import {
  DEFAULT_SETTINGS,
  clearPlayer,
  createPlayer,
  loadPlayer,
  loadSettings,
  savePlayer,
  saveSettings,
  type StorageStatus,
} from '../services/storage'
import {
  COINS_PER_CORRECT_ANSWER,
  EXP_PER_CORRECT_ANSWER,
  applyExpGain,
} from '../utils/levelSystem'
import { playSfx, setSfxEnabled } from '../utils/sfx'

export interface AnswerRewardOutcome {
  gainedExp: number
  gainedCoins: number
  levelsGained: number
}

/** ยอดที่ผู้เล่นได้รับจริงระหว่างเล่นด่าน ส่งมาจากหน้า MathChallenge */
export interface LevelAttemptStats {
  correctAnswers: number
  totalQuestions: number
  expFromAnswers: number
  coinsFromAnswers: number
}

export interface GameContextValue {
  player: Player | null
  settings: GameSettings
  isLoading: boolean
  storageStatus: StorageStatus
  storageWarning: string | null
  pendingLevelUp: number | null
  startNewGame: (name: string, avatar: string) => Player
  rewardCorrectAnswer: () => AnswerRewardOutcome
  completeLevel: (level: Level, stats: LevelAttemptStats) => LevelResult
  acknowledgeLevelUp: () => void
  updateSettings: (partial: Partial<GameSettings>) => void
  resetProgress: () => void
  dismissStorageWarning: () => void
}

export const GameContext = createContext<GameContextValue | null>(null)

const STORAGE_WARNINGS: Partial<Record<StorageStatus, string>> = {
  corrupted: 'ข้อมูลเดิมเสียหาย จึงต้องเริ่มการผจญภัยใหม่ ขออภัยด้วยนะ',
  unavailable:
    'เบราว์เซอร์นี้บันทึกข้อมูลไม่ได้ ความคืบหน้าจะหายเมื่อปิดหน้าเว็บ',
}

export function GameProvider({ children }: { children: ReactNode }) {
  const [player, setPlayer] = useState<Player | null>(null)
  const [settings, setSettings] = useState<GameSettings>(DEFAULT_SETTINGS)
  const [isLoading, setIsLoading] = useState(true)
  const [storageStatus, setStorageStatus] = useState<StorageStatus>('empty')
  const [storageWarning, setStorageWarning] = useState<string | null>(null)
  const [pendingLevelUp, setPendingLevelUp] = useState<number | null>(null)

  // เก็บค่าล่าสุดไว้ใน ref เพื่อให้คำนวณรางวัลได้ทันทีแบบ synchronous
  const playerRef = useRef<Player | null>(null)

  useEffect(() => {
    const result = loadPlayer()
    playerRef.current = result.data
    setPlayer(result.data)
    setStorageStatus(result.status)
    setStorageWarning(STORAGE_WARNINGS[result.status] ?? null)

    const loadedSettings = loadSettings()
    setSettings(loadedSettings)
    setSfxEnabled(loadedSettings.soundEnabled)
    setIsLoading(false)
  }, [])

  // ให้ "ลดการเคลื่อนไหว" มีผลจริงกับทั้งแอปผ่าน data attribute
  useEffect(() => {
    if (typeof document === 'undefined') return
    document.documentElement.dataset.reduceMotion = settings.reduceMotion
      ? 'true'
      : 'false'
  }, [settings.reduceMotion])

  const commitPlayer = useCallback((next: Player) => {
    playerRef.current = next
    setPlayer(next)

    if (!savePlayer(next)) {
      setStorageStatus('unavailable')
      setStorageWarning(STORAGE_WARNINGS.unavailable ?? null)
    }
  }, [])

  const startNewGame = useCallback(
    (name: string, avatar: string): Player => {
      const next = createPlayer(name, avatar)
      setStorageStatus('ok')
      setStorageWarning(null)
      setPendingLevelUp(null)
      commitPlayer(next)
      return next
    },
    [commitPlayer],
  )

  const rewardCorrectAnswer = useCallback((): AnswerRewardOutcome => {
    const current = playerRef.current
    if (!current) {
      return { gainedExp: 0, gainedCoins: 0, levelsGained: 0 }
    }

    const gain = applyExpGain(
      current.level,
      current.exp,
      EXP_PER_CORRECT_ANSWER,
    )

    commitPlayer({
      ...current,
      level: gain.level,
      exp: gain.exp,
      coins: current.coins + COINS_PER_CORRECT_ANSWER,
    })

    if (gain.levelsGained > 0) {
      setPendingLevelUp(gain.level)
    }

    return {
      gainedExp: EXP_PER_CORRECT_ANSWER,
      gainedCoins: COINS_PER_CORRECT_ANSWER,
      levelsGained: gain.levelsGained,
    }
  }, [commitPlayer])

  const completeLevel = useCallback(
    (level: Level, stats: LevelAttemptStats): LevelResult => {
      const current = playerRef.current

      const result: LevelResult = {
        worldId: level.worldId,
        levelId: level.id,
        totalQuestions: stats.totalQuestions,
        correctAnswers: stats.correctAnswers,
        expFromAnswers: stats.expFromAnswers,
        coinsFromAnswers: stats.coinsFromAnswers,
        bonusExp: level.reward.exp,
        bonusCoins: level.reward.coins,
        isFirstClear: current ? !current.completedLevels.includes(level.id) : true,
      }

      if (!current) return result

      const gain = applyExpGain(current.level, current.exp, level.reward.exp)

      commitPlayer({
        ...current,
        level: gain.level,
        exp: gain.exp,
        coins: current.coins + level.reward.coins,
        completedLevels: current.completedLevels.includes(level.id)
          ? current.completedLevels
          : [...current.completedLevels, level.id],
      })

      if (gain.levelsGained > 0) {
        setPendingLevelUp(gain.level)
      }

      return result
    },
    [commitPlayer],
  )

  const acknowledgeLevelUp = useCallback(() => {
    setPendingLevelUp(null)
  }, [])

  const updateSettings = useCallback((partial: Partial<GameSettings>) => {
    setSettings((current) => {
      const next: GameSettings = { ...current, ...partial }
      setSfxEnabled(next.soundEnabled)
      saveSettings(next)
      return next
    })
  }, [])

  const resetProgress = useCallback(() => {
    clearPlayer()
    playerRef.current = null
    setPlayer(null)
    setPendingLevelUp(null)
    setStorageStatus('empty')
    setStorageWarning(null)
  }, [])

  const dismissStorageWarning = useCallback(() => {
    setStorageWarning(null)
  }, [])

  useEffect(() => {
    if (pendingLevelUp !== null) {
      playSfx('levelUp')
    }
  }, [pendingLevelUp])

  const value = useMemo<GameContextValue>(
    () => ({
      player,
      settings,
      isLoading,
      storageStatus,
      storageWarning,
      pendingLevelUp,
      startNewGame,
      rewardCorrectAnswer,
      completeLevel,
      acknowledgeLevelUp,
      updateSettings,
      resetProgress,
      dismissStorageWarning,
    }),
    [
      player,
      settings,
      isLoading,
      storageStatus,
      storageWarning,
      pendingLevelUp,
      startNewGame,
      rewardCorrectAnswer,
      completeLevel,
      acknowledgeLevelUp,
      updateSettings,
      resetProgress,
      dismissStorageWarning,
    ],
  )

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>
}
