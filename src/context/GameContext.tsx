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
import type { Quest } from '../types/quest'
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
  completeStage,
  isReplayOf,
  recordAnswer,
  type AnswerInput,
  type AnswerOutcome,
  type StageInput,
  type StageOutcome,
} from '../services/rewardService'
import {
  advanceQuestsOnAnswer,
  claimQuestReward,
  ensureDailyQuests,
  refreshQuestCompletion,
  type ClaimResult,
} from '../services/questService'
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
  /** ภารกิจที่เพิ่งทำสำเร็จ รอให้ผู้เล่นรับทราบ */
  questToasts: Quest[]

  startNewGame: (name: string, avatar: string) => Player
  answerQuestion: (input: AnswerInput) => AnswerOutcome | null
  finishStage: (input: StageInput) => StageOutcome | null
  claimQuest: (questId: string) => ClaimResult | null
  patchPlayer: (changes: Partial<Player>) => void
  isStageReplay: (stageId: string) => boolean

  acknowledgeLevelUp: () => void
  dismissQuestToast: (questId: string) => void
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
  const [questToasts, setQuestToasts] = useState<Quest[]>([])

  // เก็บค่าล่าสุดไว้ใน ref เพื่อให้คำนวณรางวัลได้ทันทีแบบ synchronous
  const playerRef = useRef<Player | null>(null)
  const settingsRef = useRef<GameSettings>(DEFAULT_SETTINGS)

  useEffect(() => {
    const result = loadPlayer()

    // แจกภารกิจประจำวันชุดใหม่ทันทีถ้าขึ้นวันใหม่แล้ว
    let loaded = result.data
    if (loaded) {
      const daily = ensureDailyQuests(loaded)
      loaded = daily.player
      if (daily.didReset) savePlayer(loaded)
    }

    playerRef.current = loaded
    setPlayer(loaded)
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

  const announceQuests = useCallback((quests: Quest[]) => {
    if (quests.length === 0) return
    setQuestToasts((current) => [...current, ...quests])
    for (const quest of quests) {
      emit('QUEST_READY_TO_CLAIM', { questId: quest.id, title: quest.title })
    }
  }, [])

  const startNewGame = useCallback(
    (name: string, avatar: string): Player => {
      const fresh = createPlayer(name, avatar)
      const withDaily = ensureDailyQuests(fresh).player

      setStorageStatus('ok')
      setStorageWarning(null)
      setPendingLevelUp(null)
      setQuestToasts([])
      commitPlayer(withDaily)

      emit('PLAYER_CREATED', {
        playerId: withDaily.id,
        name: withDaily.name,
        avatar: withDaily.avatar,
      })

      return withDaily
    },
    [commitPlayer],
  )

  const isStageReplay = useCallback((stageId: string): boolean => {
    const current = playerRef.current
    return current ? isReplayOf(current, stageId) : false
  }, [])

  const answerQuestion = useCallback(
    (input: AnswerInput): AnswerOutcome | null => {
      const current = playerRef.current
      if (!current) return null

      const outcome = recordAnswer(current, input)

      // อัปเดตความคืบหน้าภารกิจจากผลการตอบข้อนี้
      const questResult = advanceQuestsOnAnswer(outcome.player, {
        skill: input.skill,
        isCorrect: input.isCorrect,
        currentStreak: outcome.currentStreak,
      })

      commitPlayer(questResult.player)
      announceQuests(questResult.newlyCompleted)

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

      return { ...outcome, player: questResult.player }
    },
    [announceQuests, commitPlayer],
  )

  const finishStage = useCallback(
    (input: StageInput): StageOutcome | null => {
      const current = playerRef.current
      if (!current) return null

      const outcome = completeStage(current, input)

      // ภารกิจแบบ "ผ่านด่าน X" จะสำเร็จได้ก็ต่อเมื่อความคืบหน้าด่านถูกบันทึกแล้ว
      const questResult = refreshQuestCompletion(outcome.player)
      commitPlayer(questResult.player)
      announceQuests(questResult.newlyCompleted)

      const result = {
        ...outcome.result,
        completedQuestIds: questResult.newlyCompleted.map((quest) => quest.id),
      }

      emit('STAGE_COMPLETED', {
        stageId: input.stage.id,
        worldId: input.stage.worldId,
        correctAnswers: input.correctAnswers,
        totalQuestions: input.totalQuestions,
        stars: outcome.result.stars,
        isFirstClear: outcome.result.isFirstClear,
        isPassed: outcome.result.isPassed,
      })

      if (result.bonusExp > 0) {
        emit('EXP_GAINED', { amount: result.bonusExp, source: 'quest' })
      }
      if (result.bonusCoins > 0) {
        emit('COIN_GAINED', { amount: result.bonusCoins, source: 'quest' })
      }
      if (outcome.healedHp !== 0) {
        emit('HP_CHANGED', {
          hp: outcome.player.hp,
          maxHp: outcome.player.maxHp,
          delta: outcome.healedHp,
        })
      }
      if (result.unlockedStageId) {
        emit('STAGE_UNLOCKED', { stageId: result.unlockedStageId })
      }
      if (result.unlockedWorldId) {
        emit('WORLD_UNLOCKED', { worldId: result.unlockedWorldId })
      }

      if (outcome.levelsGained > 0) {
        emit('LEVEL_UP', {
          level: outcome.newLevel,
          levelsGained: outcome.levelsGained,
        })
        setPendingLevelUp(outcome.newLevel)
      }

      return { ...outcome, player: questResult.player, result }
    },
    [announceQuests, commitPlayer],
  )

  const claimQuest = useCallback(
    (questId: string): ClaimResult | null => {
      const current = playerRef.current
      if (!current) return null

      const result = claimQuestReward(current, questId)
      if (!result.claimed) return result

      commitPlayer(result.player)
      setQuestToasts((toasts) =>
        toasts.filter((quest) => quest.id !== questId),
      )

      emit('QUEST_CLAIMED', {
        questId,
        exp: result.exp,
        coins: result.coins,
      })
      if (result.exp > 0) {
        emit('EXP_GAINED', { amount: result.exp, source: 'quest' })
      }
      if (result.coins > 0) {
        emit('COIN_GAINED', { amount: result.coins, source: 'quest' })
      }
      if (result.levelsGained > 0) {
        emit('LEVEL_UP', {
          level: result.newLevel,
          levelsGained: result.levelsGained,
        })
        setPendingLevelUp(result.newLevel)
      }

      playSfx('coin')
      return result
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

  const dismissQuestToast = useCallback((questId: string) => {
    setQuestToasts((toasts) => toasts.filter((quest) => quest.id !== questId))
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
    setQuestToasts([])
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
      questToasts,
      startNewGame,
      answerQuestion,
      finishStage,
      claimQuest,
      patchPlayer,
      isStageReplay,
      acknowledgeLevelUp,
      dismissQuestToast,
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
      questToasts,
      startNewGame,
      answerQuestion,
      finishStage,
      claimQuest,
      patchPlayer,
      isStageReplay,
      acknowledgeLevelUp,
      dismissQuestToast,
      updateSettings,
      resetProgress,
      dismissStorageWarning,
    ],
  )

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>
}
