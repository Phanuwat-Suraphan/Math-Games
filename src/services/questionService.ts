import { getWorld } from '../data/worlds'
import type { Stage, StageDifficulty } from '../types/stage'
import type { SkillId } from '../types/stats'
import { isValidQuestionType } from '../questionEngine/validators'
import {
  createSession,
  nextDifficulty,
  type SessionConfig,
} from '../questionEngine/session'
import type {
  Difficulty,
  Grade,
  QuestionResult,
  QuestionSession,
  QuestionType,
} from '../questionEngine/types'

/**
 * ตัวเชื่อมระหว่างข้อมูลด่าน (Part 3) กับ Question Engine (Part 4)
 *
 * หน้าที่เดียวคือแปลง Stage ให้เป็นคำสั่งสร้างชุดโจทย์
 * ตรรกะการสร้างโจทย์อยู่ใน questionEngine ทั้งหมด ที่นี่ไม่คำนวณอะไรเอง
 */

/**
 * ด่านใช้ระดับความยาก 4 ระดับที่ชื่อไม่ตรงกับของ Question Engine
 * ด่านบอสจึงเทียบเป็น expert ซึ่งเป็นระดับสูงสุดของเครื่องยนต์
 */
const STAGE_TO_ENGINE_DIFFICULTY: Record<StageDifficulty, Difficulty> = {
  easy: 'easy',
  medium: 'medium',
  hard: 'hard',
  boss: 'expert',
}

export function resolveDifficulty(stage: Stage): Difficulty {
  return STAGE_TO_ENGINE_DIFFICULTY[stage.difficulty] ?? 'easy'
}

/**
 * ระดับชั้นของด่าน
 *
 * ด่านกำหนดเองได้ผ่าน stage.grade ถ้าไม่กำหนดจะเดาจากลำดับของโลก
 * โลกต้น ๆ เป็นเนื้อหา ป.4 โลกท้าย ๆ เป็น ป.6
 *
 * ย้ำว่าระดับชั้นคุมแค่ "ขนาดตัวเลข" ไม่ได้คุมความยาก
 * ด่าน ป.4 เป็นระดับ hard ได้ และด่าน ป.6 เป็นระดับ easy ได้
 */
export function resolveGrade(stage: Stage): Grade {
  if (stage.grade === 4 || stage.grade === 5 || stage.grade === 6) {
    return stage.grade
  }

  const world = getWorld(stage.worldId)
  const order = world?.order ?? 1
  if (order <= 2) return 4
  if (order <= 4) return 5
  return 6
}

/**
 * แปลงชนิดโจทย์ของด่านให้เป็นชนิดที่เครื่องยนต์รู้จัก
 * ชนิดที่ไม่รู้จักจะถูกตัดทิ้ง ถ้าตัดจนหมดจะใช้การบวกเป็นค่าสำรอง
 * เพื่อไม่ให้ด่านที่ข้อมูลผิดพลาดกลายเป็นด่านที่เล่นไม่ได้
 */
export function resolveQuestionTypes(stage: Stage): QuestionType[] {
  const types = (stage.questionTypes as SkillId[]).filter(isValidQuestionType)
  return types.length > 0 ? types : ['addition']
}

export function buildSessionConfig(stage: Stage, seed?: string): SessionConfig {
  return {
    stageId: stage.id,
    questionTypes: resolveQuestionTypes(stage),
    grade: resolveGrade(stage),
    difficulty: resolveDifficulty(stage),
    questionCount: Math.max(1, Math.floor(stage.questionCount)),
    adaptive: true,
    seed,
  }
}

/** สร้างชุดโจทย์ของด่านหนึ่งครั้ง */
export function createStageSession(stage: Stage, seed?: string): QuestionSession {
  return createSession(buildSessionConfig(stage, seed))
}

/**
 * ความยากที่ควรใช้กับข้อถัดไป
 *
 * แยกออกมาเป็นฟังก์ชันเดียวเพื่อให้หน้าจอไม่ต้องรู้กติกาการปรับความยาก
 * และให้ Part 5 (Battle) เรียกใช้กติกาเดียวกันได้
 */
export function difficultyForNextQuestion(
  stage: Stage,
  results: readonly QuestionResult[],
): Difficulty {
  return nextDifficulty(resolveDifficulty(stage), results)
}
