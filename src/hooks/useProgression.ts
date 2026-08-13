import { useMemo } from 'react'
import { LEVELS } from '../data/levels'
import { CORE_SKILL_IDS, SKILLS, getSkillMeta } from '../data/skills'
import type { Level } from '../types/level'
import type { Player } from '../types/player'
import type { SkillId, SkillStatistic } from '../types/stats'
import { getStarRating, getSkillToPractice } from '../utils/statistics'
import { getOverallProgress, isLevelUnlocked } from '../utils/progression'

export interface SkillSummary {
  id: SkillId
  name: string
  emoji: string
  practiceHint: string
  statistic: SkillStatistic
  /** null = ยังไม่เคยฝึกทักษะนี้ ต้องแสดงว่า "ยังไม่มีข้อมูล" แทนดาว 0 ดวง */
  stars: number | null
}

export interface UseProgressionResult {
  /** ทักษะหลักสี่อย่างของ World 1 ใช้แสดงในหน้าโปรไฟล์ */
  coreSkills: SkillSummary[]
  /** ทุกทักษะ รวมทักษะของโลกที่ยังไม่เปิด */
  allSkills: SkillSummary[]
  /** ทักษะที่ควรชวนไปฝึกต่อ */
  skillToPractice: SkillSummary | null
  nextLevel: Level | undefined
  completedLevels: number
  totalLevels: number
  unlockedWorlds: number
  totalWorlds: number
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

/** สรุปความก้าวหน้าของผู้เล่น ใช้ร่วมกันระหว่างหน้าโปรไฟล์ ภารกิจ และความสำเร็จ */
export function useProgression(player: Player): UseProgressionResult {
  return useMemo(() => {
    const practiceId = getSkillToPractice(player.statistics)
    const overall = getOverallProgress(player)

    const nextLevel = LEVELS.filter(
      (level) =>
        isLevelUnlocked(level.id, player.completedLevels) &&
        !player.completedLevels.includes(level.id),
    ).sort((a, b) => a.order - b.order)[0]

    return {
      coreSkills: CORE_SKILL_IDS.map((id) => toSummary(player, id)),
      allSkills: SKILLS.map((skill) => toSummary(player, skill.id)),
      skillToPractice: practiceId ? toSummary(player, practiceId) : null,
      nextLevel,
      completedLevels: overall.completedLevels,
      totalLevels: overall.totalLevels,
      unlockedWorlds: overall.unlockedWorlds,
      totalWorlds: overall.totalWorlds,
    }
  }, [player])
}
