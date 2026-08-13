import { useCallback } from 'react'
import { useGame } from '../context/useGame'
import type { GameSettings } from '../types/player'

export interface UseGameSettingsResult {
  settings: GameSettings
  toggleSound: () => void
  toggleMusic: () => void
  toggleAnimations: () => void
  updateSettings: (partial: Partial<GameSettings>) => void
}

/** จัดการการตั้งค่าเกม ค่าทุกอย่างถูกบันทึกลง localStorage ทันทีที่เปลี่ยน */
export function useGameSettings(): UseGameSettingsResult {
  const { settings, updateSettings } = useGame()

  const toggleSound = useCallback(() => {
    updateSettings({ soundEnabled: !settings.soundEnabled })
  }, [settings.soundEnabled, updateSettings])

  const toggleMusic = useCallback(() => {
    updateSettings({ musicEnabled: !settings.musicEnabled })
  }, [settings.musicEnabled, updateSettings])

  const toggleAnimations = useCallback(() => {
    updateSettings({ animationsEnabled: !settings.animationsEnabled })
  }, [settings.animationsEnabled, updateSettings])

  return {
    settings,
    toggleSound,
    toggleMusic,
    toggleAnimations,
    updateSettings,
  }
}
