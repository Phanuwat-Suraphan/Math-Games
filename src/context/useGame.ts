import { useContext } from 'react'
import { GameContext, type GameContextValue } from './GameContext'

export function useGame(): GameContextValue {
  const context = useContext(GameContext)
  if (!context) {
    throw new Error('useGame ต้องถูกเรียกใช้ภายใน <GameProvider> เท่านั้น')
  }
  return context
}
