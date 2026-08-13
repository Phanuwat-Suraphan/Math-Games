import { getStage, getStagesByWorld } from '../data/stages'
import { WORLDS, getWorld } from '../data/worlds'
import type { Player } from '../types/player'
import type { Stage, StageProgress, StageStatus } from '../types/stage'
import type { World } from '../types/world'
import { calculateAccuracy } from './statistics'

export const MAX_STAGE_STARS = 3

/**
 * เกณฑ์ดาวของด่าน เรียงจากสูงไปต่ำ ปรับได้จากที่นี่ที่เดียว
 * ต่ำกว่าเกณฑ์ผ่านของด่านจะได้ 0 ดาว และยังไม่นับว่าผ่าน
 */
export const STAGE_STAR_THRESHOLDS: { minAccuracy: number; stars: number }[] = [
  { minAccuracy: 90, stars: 3 },
  { minAccuracy: 70, stars: 2 },
  { minAccuracy: 60, stars: 1 },
]

/**
 * แปลงความแม่นยำเป็นจำนวนดาว
 * passingScore ของด่านเป็นตัวกำหนดว่าต่ำกว่าเท่าไรถือว่ายังไม่ผ่าน
 */
export function calculateStageStars(
  accuracy: number,
  passingScore = 60,
): number {
  if (accuracy < passingScore) return 0

  for (const threshold of STAGE_STAR_THRESHOLDS) {
    if (accuracy >= threshold.minAccuracy) return threshold.stars
  }

  return 0
}

export function isPassingScore(accuracy: number, stage: Stage): boolean {
  return accuracy >= stage.passingScore
}

/** จำนวนข้อที่ต้องตอบถูกอย่างน้อยเพื่อผ่านด่าน */
export function getRequiredCorrectAnswers(stage: Stage): number {
  return Math.ceil((stage.passingScore / 100) * stage.questionCount)
}

export function createEmptyStageProgress(stageId: string): StageProgress {
  return {
    stageId,
    attempts: 0,
    bestScore: 0,
    bestAccuracy: 0,
    stars: 0,
    completed: false,
    mastered: false,
  }
}

export function getStageProgress(
  player: Player,
  stageId: string,
): StageProgress {
  return player.stageProgress[stageId] ?? createEmptyStageProgress(stageId)
}

/**
 * ด่านนี้เล่นได้หรือยัง
 * ด่านที่ไม่มี requiredStageId เล่นได้เสมอ ด่านอื่นต้องผ่านด่านก่อนหน้าก่อน
 */
export function isStageUnlocked(player: Player, stage: Stage): boolean {
  if (!stage.requiredStageId) return true

  const required = getStage(stage.requiredStageId)
  // ถ้าด่านที่อ้างถึงไม่มีอยู่จริง ให้เปิดไว้ ดีกว่าปล่อยให้เด็กติดตาย
  if (!required) return true

  return getStageProgress(player, required.id).completed
}

export function getStageStatus(player: Player, stage: Stage): StageStatus {
  if (!isStageUnlocked(player, stage)) return 'LOCKED'

  const progress = getStageProgress(player, stage.id)
  if (progress.mastered) return 'MASTERED'
  if (progress.completed) return 'COMPLETED'
  if (progress.attempts > 0) return 'IN_PROGRESS'

  return 'AVAILABLE'
}

export interface WorldProgressSummary {
  worldId: string
  totalStages: number
  completedStages: number
  percent: number
  stars: number
  maxStars: number
  isComplete: boolean
  hasContent: boolean
  /** ด่านถัดไปที่ควรเล่น */
  nextStage: Stage | undefined
}

export function getWorldProgress(
  player: Player,
  worldId: string,
): WorldProgressSummary {
  const stages = getStagesByWorld(worldId)

  let completed = 0
  let stars = 0
  let nextStage: Stage | undefined

  for (const stage of stages) {
    const progress = getStageProgress(player, stage.id)
    stars += progress.stars
    if (progress.completed) {
      completed += 1
    } else if (!nextStage && isStageUnlocked(player, stage)) {
      nextStage = stage
    }
  }

  return {
    worldId,
    totalStages: stages.length,
    completedStages: completed,
    percent:
      stages.length === 0 ? 0 : Math.round((completed / stages.length) * 100),
    stars,
    maxStars: stages.length * MAX_STAGE_STARS,
    isComplete: stages.length > 0 && completed === stages.length,
    hasContent: stages.length > 0,
    nextStage,
  }
}

/** ดาวรวมทุกโลก ใช้กับภารกิจประเภทสะสมดาว */
export function getTotalStars(player: Player): number {
  return Object.values(player.stageProgress).reduce(
    (sum, progress) => sum + Math.max(0, progress.stars),
    0,
  )
}

export interface StageAttemptSummary {
  accuracy: number
  stars: number
  isPassed: boolean
}

/** โลกนี้ถูกพิชิตครบทุกด่านแล้วหรือยัง */
export function isWorldConquered(player: Player, worldId: string): boolean {
  const stages = getStagesByWorld(worldId)
  return (
    stages.length > 0 &&
    stages.every((stage) => getStageProgress(player, stage.id).completed)
  )
}

/**
 * โลกทั้งหมดที่ควรเปิดอยู่ ตามความคืบหน้าปัจจุบัน
 * คำนวณใหม่จากความคืบหน้าจริงเสมอ ไม่เชื่อรายชื่อที่บันทึกไว้ใน localStorage
 */
export function resolveUnlockedWorlds(player: Player): string[] {
  const unlocked: string[] = []

  for (const world of [...WORLDS].sort((a, b) => a.order - b.order)) {
    if (!world.requiredWorldId) {
      unlocked.push(world.id)
      continue
    }
    if (isWorldConquered(player, world.requiredWorldId)) {
      unlocked.push(world.id)
    }
  }

  return unlocked
}

export interface WorldLockState {
  isUnlocked: boolean
  /** อธิบายว่าต้องทำอะไรถึงจะเปิด แทนการบอกแค่ว่า "ล็อกอยู่" */
  reason: string | null
  requiredWorldName: string | null
}

export function getWorldLockState(
  player: Player,
  world: World,
): WorldLockState {
  if (!world.requiredWorldId) {
    return { isUnlocked: true, reason: null, requiredWorldName: null }
  }

  const required = getWorld(world.requiredWorldId)
  if (!required) {
    return { isUnlocked: true, reason: null, requiredWorldName: null }
  }

  if (isWorldConquered(player, required.id)) {
    return { isUnlocked: true, reason: null, requiredWorldName: required.name }
  }

  return {
    isUnlocked: false,
    reason: `ปลดล็อกเมื่อพิชิต ${required.name}`,
    requiredWorldName: required.name,
  }
}

export interface OverallProgress {
  completedStages: number
  totalStages: number
  stars: number
  maxStars: number
  unlockedWorlds: number
  totalWorlds: number
  conqueredWorlds: number
}

export function getOverallProgress(player: Player): OverallProgress {
  let totalStages = 0
  let maxStars = 0
  let conqueredWorlds = 0

  for (const world of WORLDS) {
    const stages = getStagesByWorld(world.id)
    totalStages += stages.length
    maxStars += stages.length * MAX_STAGE_STARS
    if (isWorldConquered(player, world.id)) conqueredWorlds += 1
  }

  return {
    completedStages: player.completedStages.length,
    totalStages,
    stars: getTotalStars(player),
    maxStars,
    unlockedWorlds: resolveUnlockedWorlds(player).length,
    totalWorlds: WORLDS.length,
    conqueredWorlds,
  }
}

/** สรุปผลการเล่นหนึ่งครั้ง ก่อนนำไปบันทึกลงความคืบหน้า */
export function summarizeAttempt(
  stage: Stage,
  correctAnswers: number,
  totalQuestions: number,
): StageAttemptSummary {
  const accuracy = calculateAccuracy(correctAnswers, totalQuestions)
  const isPassed = isPassingScore(accuracy, stage)

  return {
    accuracy,
    stars: calculateStageStars(accuracy, stage.passingScore),
    isPassed,
  }
}
