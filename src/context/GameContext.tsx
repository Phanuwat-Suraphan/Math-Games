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
import {
  DEFAULT_SETTINGS,
  clearPlayer,
  createPlayer,
  loadPlayer,
  loadSettings,
  savePlayer,
  saveSettings,
  updatePlayer as persistPlayerChanges,
  type StorageStatus,
} from '../services/storage'
import {
  completeQuest,
  isReplayOf,
  recordAnswer,
  type AnswerInput,
  type AnswerOutcome,
  type QuestInput,
  type QuestOutcome,
} from '../services/rewardService'
import { emit } from '../services/eventBus'
import {
  playSfx,
  setMusicEnabled,
  setSoundEnabled,
} from '../services/audioService'

export interface GameContextValue {
  player: Player | null
  settings: GameSettings
  isLoading: boolean
  storageStatus: StorageStatus
  storageWarning: string | null
  pendingLevelUp: number | null

  startNewGame: (name: string, avatar: string) => Player
  answerQuestion: (input: AnswerInput) => AnswerOutcome | null
  finishQuest: (input: QuestInput) => QuestOutcome | null
  patchPlayer: (changes: Partial<Player>) => void
  isLevelReplay: (levelId: string) => boolean

  acknowledgeLevelUp: () => void
  updateSettings: (partial: Partial<GameSettings>) => void
  resetProgress: () => void
  dismissStorageWarning: () => void
}

export const GameContext = createContext<GameContextValue | null>(null)

const STORAGE_WARNINGS: Partial<Record<StorageStatus, string>> = {
  corrupted: 'ข้อมูลเดิมเสียหาย จึงต้องเริ่มการผจญภัยใหม่ ขออภัยด้วยนะ',
  repaired: 'อัปเดตรูปแบบข้อมูลให้ทันสมัยแล้ว ความคืบหน้าเดิมยังอยู่ครบ',
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
  const settingsRef = useRef<GameSettings>(DEFAULT_SETTINGS)

  useEffect(() => {
    const result = loadPlayer()
    playerRef.current = result.data
    setPlayer(result.data)
    setStorageStatus(result.status)
    setStorageWarning(STORAGE_WARNINGS[result.status] ?? null)

    const loadedSettings = loadSettings()
    settingsRef.current = loadedSettings
    setSettings(loadedSettings)
    setSoundEnabled(loadedSettings.soundEnabled)
    setMusicEnabled(loadedSettings.musicEnabled)
    setIsLoading(false)
  }, [])

  // ให้การตั้งค่าอนิเมชันมีผลจริงกับทั้งแอปผ่าน data attribute
  useEffect(() => {
    if (typeof document === 'undefined') return
    document.documentElement.dataset.animations = settings.animationsEnabled
      ? 'on'
      : 'off'
  }, [settings.animationsEnabled])

  /** บันทึกผู้เล่นลง state และ localStorage — เรียกเฉพาะตอนข้อมูลสำคัญเปลี่ยนจริง */
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

      emit('PLAYER_CREATED', {
        playerId: next.id,
        name: next.name,
        avatar: next.avatar,
      })

      return next
    },
    [commitPlayer],
  )

  const isLevelReplay = useCallback((levelId: string): boolean => {
    const current = playerRef.current
    return current ? isReplayOf(current, levelId) : false
  }, [])

  const answerQuestion = useCallback(
    (input: AnswerInput): AnswerOutcome | null => {
      const current = playerRef.current
      if (!current) return null

      const outcome = recordAnswer(current, input)
      commitPlayer(outcome.player)

      emit('QUESTION_ANSWERED', {
        questionId: input.questionId,
        skill: input.skill,
        isCorrect: input.isCorrect,
        timeMs: input.timeMs,
      })

      if (input.isCorrect) {
        emit('QUESTION_CORRECT', {
          questionId: input.questionId,
          skill: input.skill,
          streak: outcome.currentStreak,
        })
        if (outcome.gainedExp > 0) {
          emit('EXP_GAINED', { amount: outcome.gainedExp, source: 'answer' })
        }
        if (outcome.gainedCoins > 0) {
          emit('COIN_GAINED', {
            amount: outcome.gainedCoins,
            source: outcome.streakBonus ? 'streak' : 'answer',
          })
        }
      } else {
        emit('QUESTION_WRONG', {
          questionId: input.questionId,
          skill: input.skill,
        })
        if (outcome.hpDelta !== 0) {
          emit('HP_CHANGED', {
            hp: outcome.player.hp,
            maxHp: outcome.player.maxHp,
            delta: outcome.hpDelta,
          })
        }
      }

      emit('STREAK_CHANGED', {
        currentStreak: outcome.currentStreak,
        bestStreak: outcome.bestStreak,
        isBest: outcome.isNewBestStreak,
      })

      if (outcome.levelsGained > 0) {
        emit('LEVEL_UP', {
          level: outcome.newLevel,
          levelsGained: outcome.levelsGained,
        })
        setPendingLevelUp(outcome.newLevel)
      }

      return outcome
    },
    [commitPlayer],
  )

  const finishQuest = useCallback(
    (input: QuestInput): QuestOutcome | null => {
      const current = playerRef.current
      if (!current) return null

      const outcome = completeQuest(current, input)
      commitPlayer(outcome.player)

      emit('QUEST_COMPLETED', {
        levelId: input.level.id,
        worldId: input.level.worldId,
        correctAnswers: input.correctAnswers,
        totalQuestions: input.totalQuestions,
        isFirstClear: outcome.result.isFirstClear,
      })

      if (outcome.result.bonusExp > 0) {
        emit('EXP_GAINED', { amount: outcome.result.bonusExp, source: 'quest' })
      }
      if (outcome.result.bonusCoins > 0) {
        emit('COIN_GAINED', {
          amount: outcome.result.bonusCoins,
          source: 'quest',
        })
      }
      if (outcome.healedHp !== 0) {
        emit('HP_CHANGED', {
          hp: outcome.player.hp,
          maxHp: outcome.player.maxHp,
          delta: outcome.healedHp,
        })
      }

      if (outcome.levelsGained > 0) {
        emit('LEVEL_UP', {
          level: outcome.newLevel,
          levelsGained: outcome.levelsGained,
        })
        setPendingLevelUp(outcome.newLevel)
      }

      return outcome
    },
    [commitPlayer],
  )

  const patchPlayer = useCallback((changes: Partial<Player>) => {
    const current = playerRef.current
    if (!current) return

    const next = persistPlayerChanges(current, changes)
    playerRef.current = next
    setPlayer(next)
  }, [])

  const acknowledgeLevelUp = useCallback(() => {
    setPendingLevelUp(null)
  }, [])

  /** ปรับการตั้งค่าแบบ synchronous เพื่อให้เสียงและอนิเมชันมีผลทันทีในคลิกเดียวกัน */
  const updateSettings = useCallback((partial: Partial<GameSettings>) => {
    const next: GameSettings = { ...settingsRef.current, ...partial }
    settingsRef.current = next

    setSoundEnabled(next.soundEnabled)
    setMusicEnabled(next.musicEnabled)
    saveSettings(next)
    setSettings(next)
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
      answerQuestion,
      finishQuest,
      patchPlayer,
      isLevelReplay,
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
      answerQuestion,
      finishQuest,
      patchPlayer,
      isLevelReplay,
      acknowledgeLevelUp,
      updateSettings,
      resetProgress,
      dismissStorageWarning,
    ],
  )

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>
}
