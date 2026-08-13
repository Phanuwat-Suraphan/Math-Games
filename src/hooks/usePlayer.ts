import { useGame } from '../context/useGame'
import type { Player } from '../types/player'
import { getExpProgress, type ExpProgress } from '../utils/experience'
import { getOverallAccuracy, type OverallAccuracy } from '../utils/statistics'

export interface UsePlayerResult {
  player: Player | null
  isLoading: boolean
  /** ค่าความคืบหน้า EXP ของเลเวลปัจจุบัน คืน null เมื่อยังไม่มีตัวละคร */
  expProgress: ExpProgress | null
  accuracy: OverallAccuracy | null
  hpPercent: number
  patchPlayer: (changes: Partial<Player>) => void
}

/** รวมข้อมูลผู้เล่นที่ใช้บ่อยไว้ที่เดียว เพื่อให้หน้าอื่น ๆ ไม่ต้องคำนวณซ้ำ */
export function usePlayer(): UsePlayerResult {
  const { player, isLoading, patchPlayer } = useGame()

  if (!player) {
    return {
      player: null,
      isLoading,
      expProgress: null,
      accuracy: null,
      hpPercent: 0,
      patchPlayer,
    }
  }

  return {
    player,
    isLoading,
    expProgress: getExpProgress(player),
    accuracy: getOverallAccuracy(player.totalQuestions, player.correctAnswers),
    hpPercent: Math.round((player.hp / Math.max(1, player.maxHp)) * 100),
    patchPlayer,
  }
}
