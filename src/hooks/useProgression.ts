import { useMemo } from 'react'
import { CORE_SKILL_IDS, SKILLS, getSkillMeta } from '../data/skills'
import { STAGES } from '../data/stages'
import { WORLDS } from '../data/worlds'
import type { Player } from '../types/player'
import type { Stage } from '../types/stage'
import type { World } from '../types/world'
import type { SkillId, SkillStatistic } from '../types/stats'
import { getStarRating, getSkillToPractice } from '../utils/statistics'
import {
  getOverallProgress,
  getWorldLockState,
  getWorldProgress,
  isStageUnlocked,
  type OverallProgress,
  type WorldLockState,
  type WorldProgressSummary,
} from '../utils/stageSystem'

export interface SkillSummary {
  id: SkillId
  name: string
  emoji: string
  practiceHint: string
  statistic: SkillStatistic
  /** null = ยังไม่เคยฝึกทักษะนี้ ต้องแสดงว่า "ยังไม่มีข้อมูล" แทนดาว 0 ดวง */
  stars: number | null
}

export interface WorldSummary {
  world: World
  lock: WorldLockState
  progress: WorldProgressSummary
}

export interface UseProgressionResult {
  /** ทักษะหลักสี่อย่างของ World 1 ใช้แสดงในหน้าโปรไฟล์ */
  coreSkills: SkillSummary[]
  /** ทุกทักษะ รวมทักษะของโลกที่ยังไม่เปิด */
  allSkills: SkillSummary[]
  /** ทักษะที่ควรชวนไปฝึกต่อ */
  skillToPractice: SkillSummary | null
  worlds: WorldSummary[]
  /** ด่านถัดไปที่ควรเล่น ข้ามโลกได้ถ้าโลกปัจจุบันจบแล้ว */
  nextStage: Stage | undefined
  overall: OverallProgress
}

function toSummary(player: Player, id: SkillId): SkillSummary {
  const meta = getSkillMeta(id)
  const statistic = player.statistics[id] ?? {
    attempts: 0,
    correct: 0,
    accuracy: 0,
  }

  return {
    id,
    name: meta.name,
    emoji: meta.emoji,
    practiceHint: meta.practiceHint,
    statistic,
    stars: getStarRating(statistic),
  }
}

/** สรุปความก้าวหน้าของผู้เล่น ใช้ร่วมกันระหว่างหน้าโปรไฟล์ แผนที่ และภารกิจ */
export function useProgression(player: Player): UseProgressionResult {
  return useMemo(() => {
    const practiceId = getSkillToPractice(player.statistics)

    const worlds: WorldSummary[] = WORLDS.map((world) => ({
      world,
      lock: getWorldLockState(player, world),
      progress: getWorldProgress(player, world.id),
    }))

    const nextStage = STAGES.filter(
      (stage) =>
        isStageUnlocked(player, stage) &&
        !player.completedStages.includes(stage.id),
    ).sort((a, b) => a.order - b.order)[0]

    return {
      coreSkills: CORE_SKILL_IDS.map((id) => toSummary(player, id)),
      allSkills: SKILLS.map((skill) => toSummary(player, skill.id)),
      skillToPractice: practiceId ? toSummary(player, practiceId) : null,
      worlds,
      nextStage,
      overall: getOverallProgress(player),
    }
  }, [player])
}
