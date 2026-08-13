import { getLevel, getLevelsByWorld } from '../data/levels'
import { WORLDS, getWorld } from '../data/worlds'
import type { Player } from '../types/player'
import type { World } from '../types/world'

export interface WorldProgress {
  totalLevels: number
  completedLevels: number
  percent: number
  isComplete: boolean
  hasContent: boolean
}

export function getWorldProgress(
  worldId: string,
  completedLevels: readonly string[],
): WorldProgress {
  const levels = getLevelsByWorld(worldId)
  const completed = levels.filter((level) =>
    completedLevels.includes(level.id),
  ).length

  return {
    totalLevels: levels.length,
    completedLevels: completed,
    percent: levels.length === 0 ? 0 : Math.round((completed / levels.length) * 100),
    isComplete: levels.length > 0 && completed === levels.length,
    hasContent: levels.length > 0,
  }
}

export interface WorldLockState {
  isUnlocked: boolean
  reason: string | null
}

export function getWorldLockState(
  world: World,
  completedLevels: readonly string[],
): WorldLockState {
  if (!world.unlockAfterWorldId) {
    return { isUnlocked: true, reason: null }
  }

  const requiredWorld = getWorld(world.unlockAfterWorldId)
  if (!requiredWorld) {
    return { isUnlocked: true, reason: null }
  }

  const progress = getWorldProgress(requiredWorld.id, completedLevels)
  if (progress.isComplete) {
    return { isUnlocked: true, reason: null }
  }

  return {
    isUnlocked: false,
    reason: `ต้องผ่าน ${requiredWorld.name} ก่อน`,
  }
}

/** ด่านแรกของโลกเล่นได้เสมอ ด่านถัดไปต้องผ่านด่านก่อนหน้า */
export function isLevelUnlocked(
  levelId: string,
  completedLevels: readonly string[],
): boolean {
  const target = getLevel(levelId)
  if (!target) return false
  if (target.order <= 1) return true

  const previous = getLevelsByWorld(target.worldId).find(
    (level) => level.order === target.order - 1,
  )
  if (!previous) return true

  return completedLevels.includes(previous.id)
}

export interface OverallProgress {
  completedLevels: number
  totalLevels: number
  unlockedWorlds: number
  totalWorlds: number
}

export function getOverallProgress(player: Player): OverallProgress {
  const totalLevels = WORLDS.reduce(
    (sum, world) => sum + getLevelsByWorld(world.id).length,
    0,
  )
  const unlockedWorlds = WORLDS.filter(
    (world) => getWorldLockState(world, player.completedLevels).isUnlocked,
  ).length

  return {
    completedLevels: player.completedLevels.length,
    totalLevels,
    unlockedWorlds,
    totalWorlds: WORLDS.length,
  }
}
