import type { SkillId } from './stats'

/**
 * รายการเหตุการณ์กลางของเกม
 * ส่วนอื่น ๆ (เช่น ระบบความสำเร็จ หรือ Part ถัดไป) สามารถ subscribe ได้โดยไม่ต้องแก้โค้ดต้นทาง
 */
export interface GameEventMap {
  PLAYER_CREATED: { playerId: string; name: string; avatar: string }
  QUESTION_ANSWERED: {
    questionId: string
    skill: SkillId
    isCorrect: boolean
    timeMs: number
  }
  QUESTION_CORRECT: { questionId: string; skill: SkillId; streak: number }
  QUESTION_WRONG: { questionId: string; skill: SkillId }
  STAGE_COMPLETED: {
    stageId: string
    worldId: string
    correctAnswers: number
    totalQuestions: number
    stars: number
    isFirstClear: boolean
    isPassed: boolean
  }
  STAGE_UNLOCKED: { stageId: string }
  WORLD_UNLOCKED: { worldId: string }
  QUEST_READY_TO_CLAIM: { questId: string; title: string }
  QUEST_CLAIMED: { questId: string; exp: number; coins: number }
  EXP_GAINED: { amount: number; source: 'answer' | 'quest' }
  COIN_GAINED: { amount: number; source: 'answer' | 'quest' | 'streak' }
  LEVEL_UP: { level: number; levelsGained: number }
  HP_CHANGED: { hp: number; maxHp: number; delta: number }
  STREAK_CHANGED: { currentStreak: number; bestStreak: number; isBest: boolean }
}

export type GameEventName = keyof GameEventMap

export type GameEventHandler<K extends GameEventName> = (
  payload: GameEventMap[K],
) => void
