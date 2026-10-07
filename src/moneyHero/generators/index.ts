import type { Difficulty, Question, StepId } from '../engine/types'
import {
  generateIdentifyMoneyQuestion,
  generateMatchMoneyQuestion,
  generateMoneyKindQuestion,
  generatePayQuestion,
} from './notes'
import { generateCountChoiceQuestion, generateCountingMoneyQuestion, generateRepeatCountQuestion } from './counting'
import {
  generateDotChoiceQuestion,
  generateDotMatchQuestion,
  generateDotReadQuestion,
  generateDotWriteQuestion,
  generateSatangConvertQuestion,
} from './dot'
import { generateCompareMoneyQuestion, generateSortMoneyQuestion, generateWhoHasMoreQuestion } from './compare'
import {
  generateEqualValueQuestion,
  generateExchangeCountQuestion,
  generateExchangeMoneyQuestion,
  generateMoneyMakerQuestion,
  generateNotEqualQuestion,
  generateRuleMakerQuestion,
} from './exchange'
import {
  generateAddMoneyQuestion,
  generateDivideMoneyQuestion,
  generateMultiplyMoneyQuestion,
  generateShopQuestion,
  generateSubtractMoneyQuestion,
} from './arithmetic'
import { generateWordProblemQuestion } from './word'
import { generateIncomeExpenseQuestion, generateLedgerQuestion, generateLedgerSet } from './ledger'
import { shuffle } from '../utils/random'

/**
 * ทะเบียนตัวสร้างโจทย์ทั้งหมด
 *
 * ชื่อตรงกับช่อง gen ของคำถาม จึงสร้างโจทย์ "แบบเดียวกันแต่ตัวเลขใหม่" ได้เสมอ
 * ใช้ตอนฝึกซ้ำข้อที่ทำผิด และตอนสร้างชุดคำถามของแต่ละด่าน
 *
 * ตัวสร้างบางตัวคืนคำถามหลายข้อ (เช่นสมุดบัญชีที่ตามด้วยคำถามจากสมุดเล่มเดียวกัน)
 */
type Generator = (d: Difficulty) => Question | Question[]

export const GENERATORS: Record<string, Generator> = {
  identify: generateIdentifyMoneyQuestion,
  matchMoney: generateMatchMoneyQuestion,
  moneyKind: generateMoneyKindQuestion,
  pay: generatePayQuestion,
  countMoney: generateCountingMoneyQuestion,
  countChoice: generateCountChoiceQuestion,
  repeatCount: generateRepeatCountQuestion,
  dotWrite: generateDotWriteQuestion,
  dotRead: generateDotReadQuestion,
  dotMatch: generateDotMatchQuestion,
  dotChoice: generateDotChoiceQuestion,
  satangConvert: generateSatangConvertQuestion,
  compare: generateCompareMoneyQuestion,
  sortMoney: generateSortMoneyQuestion,
  whoMore: generateWhoHasMoreQuestion,
  exchange: generateExchangeMoneyQuestion,
  exchangeCount: generateExchangeCountQuestion,
  equalValue: generateEqualValueQuestion,
  moneyMaker: generateMoneyMakerQuestion,
  ruleMaker: generateRuleMakerQuestion,
  notEqual: generateNotEqualQuestion,
  add: generateAddMoneyQuestion,
  subtract: generateSubtractMoneyQuestion,
  shop: generateShopQuestion,
  multiply: generateMultiplyMoneyQuestion,
  divide: generateDivideMoneyQuestion,
  wordAddSub: (d) => generateWordProblemQuestion(d, 'addsub'),
  wordMulDiv: (d) => generateWordProblemQuestion(d, 'muldiv', ['op', 'calc', 'check']),
  wordAll: (d) => generateWordProblemQuestion(d, 'all'),
  wordQuick: (d) => generateWordProblemQuestion(d, 'all', ['calc']),
  ledgerFill: (d) => generateLedgerQuestion(d),
  incomeExpense: (d) => generateIncomeExpenseQuestion(d),
  ledgerSetA: (d) => generateLedgerSet(d, ['in', 'out', 'balance']),
  ledgerSetB: (d) => generateLedgerSet(d, ['in', 'dayIn', 'out', 'balance']),
  ledgerSetC: (d) => generateLedgerSet(d, ['maxDay', 'out', 'balance']),
}

/** ชื่อเรียกแบบที่ผู้ใช้ระบุไว้ในเอกสาร ใช้ได้ทั้งสองชื่อ */
export {
  generateCountingMoneyQuestion,
  generateCompareMoneyQuestion,
  generateExchangeMoneyQuestion,
  generateAddMoneyQuestion,
  generateSubtractMoneyQuestion,
  generateMultiplyMoneyQuestion,
  generateDivideMoneyQuestion,
  generateWordProblemQuestion,
  generateIncomeExpenseQuestion,
}

/** สร้างโจทย์อย่างปลอดภัย ถ้าตัวสร้างสุ่มได้กรณีที่ใช้ไม่ได้ ให้ลองใหม่ */
export function generate(gen: string, d: Difficulty): Question[] {
  const fn = GENERATORS[gen]
  if (!fn) throw new Error(`ไม่มีตัวสร้างโจทย์ชื่อ ${gen}`)
  let lastError: unknown = null
  for (let attempt = 0; attempt < 25; attempt += 1) {
    try {
      const out = fn(d)
      return Array.isArray(out) ? out : [out]
    } catch (error) {
      lastError = error
    }
  }
  throw lastError instanceof Error ? lastError : new Error(`สร้างโจทย์ ${gen} ไม่สำเร็จ`)
}

type Spec = [gen: string, d: Difficulty]

interface LevelPlan {
  practice: Spec[]
  mission: Spec[]
  boss: Spec[]
}

/**
 * แผนคำถามของแต่ละด่าน
 * PRACTICE 3–5 ข้อ (ง่าย) · MISSION 5–8 ภารกิจ (ปานกลาง) · BOSS 3–5 ข้อ (ท้าทาย)
 */
export const LEVEL_PLANS: Record<number, LevelPlan> = {
  0: {
    practice: [['identify', 1], ['satangConvert', 1], ['pay', 1], ['matchMoney', 1]],
    mission: [['moneyKind', 1], ['countMoney', 1], ['compare', 1], ['exchangeCount', 1], ['add', 1]],
    boss: [['countMoney', 1], ['pay', 1], ['compare', 1]],
  },
  1: {
    practice: [['identify', 1], ['matchMoney', 1], ['moneyKind', 1], ['identify', 2]],
    mission: [['matchMoney', 2], ['identify', 2], ['moneyKind', 2], ['countMoney', 1], ['pay', 1], ['pay', 2]],
    boss: [['matchMoney', 3], ['identify', 3], ['pay', 2], ['countMoney', 2]],
  },
  2: {
    practice: [['repeatCount', 1], ['countMoney', 1], ['countMoney', 1], ['countChoice', 1]],
    mission: [['countMoney', 2], ['countMoney', 2], ['countChoice', 2], ['repeatCount', 2], ['countMoney', 2], ['countChoice', 2]],
    boss: [['countMoney', 3], ['countChoice', 3], ['countMoney', 3]],
  },
  3: {
    practice: [['satangConvert', 1], ['dotWrite', 1], ['dotRead', 1], ['dotChoice', 1]],
    mission: [['dotWrite', 2], ['dotRead', 2], ['dotMatch', 2], ['dotChoice', 2], ['satangConvert', 2], ['dotWrite', 2]],
    boss: [['dotMatch', 3], ['dotWrite', 3], ['dotRead', 3], ['dotChoice', 3]],
  },
  4: {
    practice: [['compare', 1], ['compare', 1], ['sortMoney', 1], ['compare', 1]],
    mission: [['compare', 2], ['compare', 2], ['sortMoney', 2], ['whoMore', 2], ['compare', 2], ['sortMoney', 2]],
    boss: [['compare', 3], ['sortMoney', 3], ['whoMore', 3], ['compare', 3]],
  },
  5: {
    practice: [['exchangeCount', 1], ['exchange', 1], ['exchangeCount', 1], ['equalValue', 1]],
    mission: [['exchange', 1], ['exchange', 2], ['exchangeCount', 2], ['equalValue', 2], ['exchange', 2], ['exchangeCount', 2]],
    boss: [['exchange', 3], ['exchangeCount', 3], ['equalValue', 3]],
  },
  6: {
    practice: [['moneyMaker', 1], ['notEqual', 1], ['ruleMaker', 1]],
    mission: [['moneyMaker', 2], ['ruleMaker', 2], ['notEqual', 2], ['moneyMaker', 2], ['ruleMaker', 2]],
    boss: [['moneyMaker', 3], ['notEqual', 3], ['ruleMaker', 3]],
  },
  7: {
    practice: [['add', 1], ['add', 1], ['subtract', 1], ['subtract', 1]],
    mission: [['shop', 1], ['add', 2], ['subtract', 2], ['shop', 2], ['add', 2], ['subtract', 2]],
    boss: [['shop', 3], ['add', 3], ['subtract', 3]],
  },
  8: {
    practice: [['multiply', 1], ['multiply', 1], ['divide', 1], ['divide', 1]],
    mission: [['multiply', 2], ['divide', 2], ['multiply', 2], ['divide', 2], ['multiply', 2], ['divide', 2]],
    boss: [['multiply', 3], ['divide', 3], ['multiply', 3], ['divide', 3]],
  },
  9: {
    practice: [['wordAddSub', 1], ['wordAddSub', 1], ['wordAddSub', 1]],
    mission: [['wordAddSub', 2], ['wordAddSub', 2], ['wordAddSub', 2], ['wordAddSub', 2], ['wordAddSub', 2]],
    boss: [['wordAddSub', 3], ['wordAddSub', 3], ['wordAddSub', 3]],
  },
  10: {
    practice: [['wordMulDiv', 1], ['wordMulDiv', 1], ['wordMulDiv', 1]],
    mission: [['wordMulDiv', 2], ['wordMulDiv', 2], ['wordMulDiv', 2], ['wordMulDiv', 2], ['wordMulDiv', 2]],
    boss: [['wordAll', 3], ['wordAll', 3], ['wordAll', 3], ['wordAll', 3]],
  },
  11: {
    practice: [['ledgerSetA', 1]],
    mission: [['ledgerSetB', 2], ['ledgerFill', 2]],
    boss: [['ledgerSetC', 3]],
  },
  12: {
    practice: [['countMoney', 2], ['dotWrite', 2], ['compare', 2], ['exchange', 2]],
    // MISSION ของด่านสุดท้ายคือการเดินทาง 1 วัน (generators/journey.ts)
    mission: [],
    boss: [['wordAll', 3], ['shop', 3], ['divide', 3], ['incomeExpense', 3]],
  },
}

export function buildStep(levelId: number, step: Exclude<StepId, 'learn'>): Question[] {
  const plan = LEVEL_PLANS[levelId]
  if (!plan) throw new Error(`ไม่มีด่าน ${levelId}`)
  return plan[step].flatMap(([gen, d]) => generate(gen, d))
}

/* ------------------------------------------------------------------ */
/* ด่านย่อย X-2 / X-3                                                  */
/* ------------------------------------------------------------------ */

/** ชนิดโจทย์ทั้งหมดของด่าน (ไม่ซ้ำ) ใช้สร้างด่านย่อย */
export function stageGens(levelId: number): string[] {
  const plan = LEVEL_PLANS[levelId]
  if (!plan) throw new Error(`ไม่มีด่าน ${levelId}`)
  return Array.from(new Set([...plan.practice, ...plan.mission, ...plan.boss].map(([gen]) => gen)))
}

/** โจทย์ของด่านย่อย: วนชนิดโจทย์ของด่าน (สลับลำดับ) ที่ระดับความยากของด่านย่อย จนได้จำนวนข้อตามเป้า */
export function buildStage(levelId: number, difficulty: Difficulty, target: number): Question[] {
  const gens = shuffle(stageGens(levelId))
  const out: Question[] = []
  for (let i = 0; out.length < target; i += 1) out.push(...generate(gens[i % gens.length], difficulty))
  return out
}

/* ------------------------------------------------------------------ */
/* แบบทดสอบก่อนเรียน / หลังเรียน                                       */
/* ------------------------------------------------------------------ */

const PRE_TEST: Spec[] = [
  ['identify', 2],
  ['moneyKind', 2],
  ['countMoney', 1],
  ['countChoice', 2],
  ['dotWrite', 1],
  ['dotChoice', 2],
  ['compare', 1],
  ['compare', 2],
  ['exchangeCount', 1],
  ['equalValue', 2],
  ['add', 1],
  ['subtract', 2],
  ['multiply', 1],
  ['divide', 1],
  ['wordQuick', 1],
  ['wordQuick', 2],
  ['incomeExpense', 1],
  ['incomeExpense', 2],
]

const POST_TEST: Spec[] = [
  ['identify', 3],
  ['moneyKind', 2],
  ['countMoney', 2],
  ['countChoice', 2],
  ['dotWrite', 2],
  ['dotChoice', 2],
  ['compare', 2],
  ['compare', 3],
  ['exchangeCount', 2],
  ['equalValue', 2],
  ['add', 2],
  ['subtract', 2],
  ['multiply', 2],
  ['divide', 2],
  ['wordQuick', 2],
  ['wordQuick', 2],
  ['incomeExpense', 2],
  ['incomeExpense', 2],
  ['add', 2],
  ['dotRead', 2],
]

export function buildTest(kind: 'pre' | 'post'): Question[] {
  return (kind === 'pre' ? PRE_TEST : POST_TEST).flatMap(([gen, d]) => generate(gen, d))
}

/** โจทย์ใหม่แบบเดียวกับข้อที่เคยผิด */
export function regenerate(gen: string, d: Difficulty): Question {
  return generate(gen, d)[0]
}
