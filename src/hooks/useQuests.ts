import { useMemo } from 'react'
import { useGame } from '../context/useGame'
import { buildQuestLog, type QuestLogSections } from '../services/questService'
import type { Player } from '../types/player'

export interface UseQuestsResult extends QuestLogSections {
  claimQuest: (questId: string) => void
}

/** รวมข้อมูลภารกิจพร้อมความคืบหน้า สำหรับหน้า Quest Log และเมนูหลัก */
export function useQuests(player: Player): UseQuestsResult {
  const { claimQuest } = useGame()

  const sections = useMemo(() => buildQuestLog(player), [player])

  return {
    ...sections,
    claimQuest: (questId: string) => {
      claimQuest(questId)
    },
  }
}
