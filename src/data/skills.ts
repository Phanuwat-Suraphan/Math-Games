import type { MathOperation, Question } from '../types/question'
import type { SkillId } from '../types/stats'

export interface SkillMeta {
  id: SkillId
  name: string
  emoji: string
  /** ข้อความชวนฝึกต่อ ใช้แทนการบอกว่าเด็ก "ทำได้ไม่ดี" */
  practiceHint: string
}

export const SKILLS: SkillMeta[] = [
  {
    id: 'addition',
    name: 'การบวก',
    emoji: '➕',
    practiceHint: 'ภารกิจต่อไป: ฝึกการบวกอีกนิด 💪',
  },
  {
    id: 'subtraction',
    name: 'การลบ',
    emoji: '➖',
    practiceHint: 'ภารกิจต่อไป: ฝึกการลบอีกนิด 💪',
  },
  {
    id: 'multiplication',
    name: 'การคูณ',
    emoji: '✖️',
    practiceHint: 'ภารกิจต่อไป: ทบทวนสูตรคูณอีกนิด 💪',
  },
  {
    id: 'division',
    name: 'การหาร',
    emoji: '➗',
    practiceHint: 'ภารกิจต่อไป: ฝึกการหารอีกนิด 💪',
  },
  {
    id: 'fractions',
    name: 'เศษส่วน',
    emoji: '🍰',
    practiceHint: 'ภารกิจต่อไป: ฝึกเศษส่วนอีกนิด 💪',
  },
  {
    id: 'decimals',
    name: 'ทศนิยม',
    emoji: '🔢',
    practiceHint: 'ภารกิจต่อไป: ฝึกทศนิยมอีกนิด 💪',
  },
  {
    id: 'percentages',
    name: 'ร้อยละ',
    emoji: '💯',
    practiceHint: 'ภารกิจต่อไป: ฝึกร้อยละอีกนิด 💪',
  },
  {
    id: 'geometry',
    name: 'เรขาคณิต',
    emoji: '📐',
    practiceHint: 'ภารกิจต่อไป: ฝึกเรขาคณิตอีกนิด 💪',
  },
  {
    id: 'wordProblems',
    name: 'โจทย์ปัญหา',
    emoji: '🧩',
    practiceHint: 'ภารกิจต่อไป: ฝึกอ่านโจทย์ปัญหาอีกนิด 💪',
  },
]

export const SKILL_IDS: SkillId[] = SKILLS.map((skill) => skill.id)

const SKILL_BY_ID = new Map<SkillId, SkillMeta>(
  SKILLS.map((skill) => [skill.id, skill]),
)

export function getSkillMeta(id: SkillId): SkillMeta {
  return SKILL_BY_ID.get(id) ?? SKILLS[0]
}

/** ทักษะที่แสดงในหน้าโปรไฟล์เป็นหลัก (World 1 ใช้สี่ทักษะนี้) */
export const CORE_SKILL_IDS: SkillId[] = [
  'addition',
  'subtraction',
  'multiplication',
  'division',
]

const OPERATION_TO_SKILL: Record<MathOperation, SkillId> = {
  add: 'addition',
  subtract: 'subtraction',
  multiply: 'multiplication',
  divide: 'division',
}

/** หาทักษะของโจทย์ ถ้าโจทย์ไม่ได้ระบุไว้ ให้อนุมานจากชนิดการดำเนินการ */
export function getQuestionSkill(question: Question): SkillId {
  return question.skill ?? OPERATION_TO_SKILL[question.operation]
}

export function getSkillForOperation(operation: MathOperation): SkillId {
  return OPERATION_TO_SKILL[operation]
}

/**
 * ทักษะที่ยังไม่มีคลังโจทย์ของตัวเอง (เศษส่วน ทศนิยม ฯลฯ) จะใช้โจทย์การบวกไปก่อน
 * Part 4 จะแทนที่ด้วย Question Engine ที่สร้างโจทย์ของแต่ละทักษะได้จริง
 */
const SKILL_TO_OPERATION: Record<SkillId, MathOperation> = {
  addition: 'add',
  subtraction: 'subtract',
  multiplication: 'multiply',
  division: 'divide',
  fractions: 'divide',
  decimals: 'add',
  percentages: 'multiply',
  geometry: 'multiply',
  wordProblems: 'add',
}

export function getOperationForSkill(skill: SkillId): MathOperation {
  return SKILL_TO_OPERATION[skill]
}
