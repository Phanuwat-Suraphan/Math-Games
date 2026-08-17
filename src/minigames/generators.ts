/**
 * ตัวสร้างมินิเกมทั้งสี่แบบ
 *
 * ทุกตัวรับ seed เดียวกันแล้วได้กระดานเดิมเสมอ
 * ครูจึงเปิดกระดานเดียวกับที่เด็กเจอขึ้นมาดูซ้ำได้ และชุดทดสอบเสถียร
 *
 * ทุกเกมมีเรื่องราวกำกับ ไม่ใช่แค่ "จับคู่ให้ถูก"
 * เพราะจุดที่เด็กเบื่อไม่ใช่เนื้อคณิตศาสตร์ แต่คือการไม่รู้ว่าทำไปทำไม
 */

import { createRng } from '../math/rng'
import type { Rng } from '../math/rng'
import type { Grade } from '../questionEngine/types'
import type { SkillId } from '../types/stats'
import { buildPairs } from './pairs'
import type {
  CatchGame,
  ConnectGame,
  DragDropGame,
  FallingItem,
  MatchCard,
  Minigame,
  MinigameKind,
  MatchingGame,
  PathCell,
} from './types'

export interface MinigameRequest {
  seed: string
  grade: Grade
  skill: SkillId
  kind: MinigameKind
}

const SKILL_LABEL: Record<SkillId, string> = {
  addition: 'การบวก',
  subtraction: 'การลบ',
  multiplication: 'การคูณ',
  division: 'การหาร',
  fractions: 'เศษส่วน',
  decimals: 'ทศนิยม',
  percentages: 'ร้อยละ',
  geometry: 'เรขาคณิต',
  wordProblems: 'โจทย์ปัญหา',
}

/** เกมจับคู่ — เปิดไพ่ทีละสองใบ ถ้าค่าตรงกันไพ่จะหายไป */
function buildMatching(rng: Rng, req: MinigameRequest): MatchingGame {
  const pairs = buildPairs(rng, req.grade, req.skill, 6)

  const cards: MatchCard[] = []
  pairs.forEach((pair, index) => {
    const pairId = `p${index}`
    cards.push({ id: `${pairId}-q`, pairId, text: pair.prompt, side: 'prompt' })
    cards.push({ id: `${pairId}-a`, pairId, text: pair.answer, side: 'answer' })
  })

  return {
    id: `match-${req.seed}`,
    kind: 'matching',
    grade: req.grade,
    skill: req.skill,
    title: 'ห้องกระจกสะท้อนคำตอบ',
    story:
      'ในห้องนี้มีกระจกวิเศษเรียงกันอยู่ ทุกบานซ่อนคำตอบไว้ด้านหลัง ' +
      'ถ้าเปิดสองบานที่มีค่าเท่ากันพร้อมกัน กระจกจะแตกออกเป็นแสง',
    instruction: 'เปิดการ์ดทีละสองใบ หาคู่ที่มีค่าเท่ากัน',
    successText: 'กระจกทุกบานแตกออกเป็นแสง ทางเดินข้างหน้าเปิดแล้ว',
    cards: rng.shuffle(cards),
    pairCount: pairs.length,
  }
}

/** เกมโยงเส้น — ลากเส้นจากของฝั่งซ้ายไปหาคำตอบฝั่งขวา */
function buildConnect(rng: Rng, req: MinigameRequest): ConnectGame {
  const pairs = buildPairs(rng, req.grade, req.skill, 4)

  const left = pairs.map((pair, index) => ({
    id: `L${index}`,
    text: pair.prompt,
  }))
  const rightOrdered = pairs.map((pair, index) => ({
    id: `R${index}`,
    text: pair.answer,
  }))

  const solution: Record<string, string> = {}
  pairs.forEach((_, index) => {
    solution[`L${index}`] = `R${index}`
  })

  return {
    id: `connect-${req.seed}`,
    kind: 'connect',
    grade: req.grade,
    skill: req.skill,
    title: 'สะพานเชือกขาด',
    story:
      'สะพานข้ามหุบเหวขาดเป็นเส้น ๆ เสาฝั่งนี้กับฝั่งโน้นต้องผูกเชือกให้ถูกคู่ ' +
      'ถ้าผูกผิด เชือกจะขาดแล้วต้องเริ่มใหม่',
    instruction: 'ลากเส้นจากซ้ายไปขวา จับคู่ที่มีค่าเท่ากัน',
    successText: 'สะพานต่อกันครบทุกเส้น ข้ามไปได้แล้ว',
    left: rng.shuffle(left),
    right: rng.shuffle(rightOrdered),
    solution,
  }
}

/**
 * เกมลากวาง — เติมตัวเลขลงในช่องว่างของสมการ
 *
 * ให้ตัวลวงมากกว่าช่องว่างเสมอ ไม่งั้นเด็กจะวางมั่วจนครบแล้วถูกเอง
 */
function buildDragDrop(rng: Rng, req: MinigameRequest): DragDropGame {
  const a = rng.int(2, req.grade === 4 ? 9 : 12)
  const b = rng.int(2, req.grade === 4 ? 9 : 12)
  const useMultiply = req.skill === 'multiplication' || req.skill === 'division'
  const result = useMultiply ? a * b : a + b
  const operator = useMultiply ? '×' : '+'

  const correctTiles = [
    { id: 't-a', text: `${a}` },
    { id: 't-b', text: `${b}` },
  ]

  // ตัวลวงต้องไม่ตรงกับคำตอบที่ถูก ไม่งั้นจะมีสองทางที่ถูกเหมือนกัน
  const decoyValues = new Set<number>()
  const taken = new Set([a, b])
  for (let attempt = 0; attempt < 40 && decoyValues.size < 3; attempt += 1) {
    const candidate = rng.int(2, useMultiply ? 14 : 20)
    if (taken.has(candidate) || decoyValues.has(candidate)) continue
    decoyValues.add(candidate)
  }
  const decoys = Array.from(decoyValues).map((value, index) => ({
    id: `d${index}`,
    text: `${value}`,
  }))

  return {
    id: `drag-${req.seed}`,
    kind: 'dragdrop',
    grade: req.grade,
    skill: req.skill,
    title: 'แท่นศิลาที่หายไป',
    story:
      'ประตูหินมีร่องว่างสองร่อง มีแผ่นศิลาสลักตัวเลขวางกระจัดกระจายอยู่รอบ ๆ ' +
      'ใส่แผ่นที่ถูกลงไปให้ครบ ประตูจึงจะเลื่อนเปิด',
    instruction: `ลากแผ่นตัวเลขไปวางในช่องว่าง ให้ผลลัพธ์เท่ากับ ${result}`,
    successText: 'ประตูหินเลื่อนเปิดออกช้า ๆ',
    template: `{a} ${operator} {b} = ${result}`,
    slots: [
      { id: 'a', correctTileId: 't-a' },
      { id: 'b', correctTileId: 't-b' },
    ],
    tiles: rng.shuffle([...correctTiles, ...decoys]),
  }
}

/** กฎของเกมรับของ แต่ละกฎบอกวิธีตัดสินว่าเลขไหนคือของที่ต้องรับ */
interface CatchRule {
  rule: string
  isCorrect: (value: number) => boolean
  /** ช่วงตัวเลขที่จะโปรยลงมา */
  range: readonly [number, number]
}

function pickCatchRule(rng: Rng, grade: Grade, skill: SkillId): CatchRule {
  const max = grade === 4 ? 60 : grade === 5 ? 100 : 144

  /**
   * ทุกกฎต้องเหลือคำตอบที่ถูกอย่างน้อย 8 จำนวนในช่วงที่โปรย
   *
   * ถ้าไม่คุมตรงนี้ กฎอย่าง "หารด้วย 12 ลงตัว" ในช่วงถึง 60
   * จะมีคำตอบแค่ 5 จำนวน หรือ "มากกว่า 58" ในช่วงถึง 60 จะเหลือแค่ 2 จำนวน
   * ด่านนั้นจะกลายเป็นด่านที่เล่นถูกทุกชิ้นก็ยังไม่ผ่าน
   */
  const MIN_CORRECT = 8

  if (skill === 'multiplication' || skill === 'division') {
    // ตัวหารมากสุดที่ยังเหลือพหุคูณครบ 8 จำนวนในช่วง
    const maxFactor = Math.max(3, Math.min(grade === 4 ? 8 : 12, Math.floor(max / MIN_CORRECT)))
    const factor = rng.int(3, maxFactor)
    return {
      rule: `รับเฉพาะจำนวนที่หารด้วย ${factor} ลงตัว`,
      isCorrect: (value) => value % factor === 0,
      range: [2, max],
    }
  }

  if (skill === 'addition' || skill === 'subtraction') {
    // เส้นแบ่งต้องต่ำพอให้เหลือจำนวนที่มากกว่านั้นอย่างน้อย 8 จำนวน
    const lowest = grade === 4 ? 20 : 40
    const highest = Math.max(lowest, max - MIN_CORRECT)
    const target = rng.int(lowest, highest)
    return {
      rule: `รับเฉพาะจำนวนที่มากกว่า ${target}`,
      isCorrect: (value) => value > target,
      range: [2, max],
    }
  }

  if (skill === 'fractions' || skill === 'decimals' || skill === 'percentages') {
    return {
      rule: 'รับเฉพาะจำนวนคู่',
      isCorrect: (value) => value % 2 === 0,
      range: [2, max],
    }
  }

  // เรขาคณิตกับโจทย์ปัญหาไม่มีกฎเฉพาะของตัวเอง ใช้จำนวนเฉพาะซึ่งฝึกการสังเกต
  return {
    rule: 'รับเฉพาะจำนวนเฉพาะ',
    isCorrect: (value) => {
      if (value < 2) return false
      for (let d = 2; d * d <= value; d += 1) if (value % d === 0) return false
      return true
    },
    range: [2, 60],
  }
}

/**
 * เกมรับของ — เลื่อนตะกร้าซ้ายขวารับตัวเลขที่ตรงกฎ
 *
 * ออกแบบให้ของถูกกับของผิดสลับกันพอ ๆ กัน
 * ถ้าของถูกเยอะเกินไป เด็กจะรับทุกชิ้นแล้วผ่าน โดยไม่ต้องคิดเลย
 */
function buildCatch(rng: Rng, req: MinigameRequest): CatchGame {
  const spec = pickCatchRule(rng, req.grade, req.skill)

  /**
   * ไล่ค่าทั้งช่วงแล้วค่อยแบ่งฝั่ง ไม่ใช้วิธีสุ่มแล้วคัดทิ้ง
   *
   * ของเดิมสุ่มทีละตัวแล้วคัด ซึ่งพังกับกฎที่มีคำตอบน้อย
   * เช่น "หารด้วย 12 ลงตัว" ในช่วง 2–60 มีแค่ 5 จำนวน
   * เกมจึงโปรยของถูกลงมาแค่ 3–5 ชิ้น ทั้งที่ต้องรับให้ได้ 6 ชิ้นจึงผ่าน
   * เด็กเล่นถูกทุกชิ้นก็ยังแพ้ ซึ่งเป็นด่านที่ชนะไม่ได้เลย
   *
   * การไล่ทั้งช่วงทำให้รู้จำนวนที่มีอยู่จริงก่อนตั้งเป้า
   */
  const [lo, hi] = spec.range
  const allWanted: number[] = []
  const allUnwanted: number[] = []
  for (let value = lo; value <= hi; value += 1) {
    if (spec.isCorrect(value)) allWanted.push(value)
    else allUnwanted.push(value)
  }

  const wanted = rng.shuffle(allWanted).slice(0, 8)
  const unwanted = rng.shuffle(allUnwanted).slice(0, 8)

  const values = rng.shuffle([
    ...wanted.map((value) => ({ value, correct: true })),
    ...unwanted.map((value) => ({ value, correct: false })),
  ])

  // ไล่ให้ตกเร็วขึ้นทีละนิด เกมจึงตึงขึ้นเรื่อย ๆ แทนที่จะจังหวะเดียวตลอด
  const items: FallingItem[] = values.map((entry, index) => ({
    id: `f${index}`,
    text: `${entry.value}`,
    value: entry.value,
    correct: entry.correct,
    lane: rng.int(0, 4) / 4,
    dropAt: Number((index * 1.15).toFixed(2)),
    fallSeconds: Number(Math.max(2.4, 4.6 - index * 0.12).toFixed(2)),
  }))

  return {
    id: `catch-${req.seed}`,
    kind: 'catch',
    grade: req.grade,
    skill: req.skill,
    title: 'ฝนตัวเลขในหุบเขา',
    story:
      'ตัวเลขร่วงลงมาจากฟ้าเหมือนสายฝน มีทั้งที่ใช้ได้และที่เป็นของปลอม ' +
      'ถือตะกร้าวิ่งรับให้ทัน แต่อย่ารับของปลอมเข้ามา',
    rule: spec.rule,
    instruction: `เลื่อนตะกร้าซ้ายขวา ${spec.rule}`,
    successText: 'ตะกร้าเต็มไปด้วยตัวเลขที่ใช้ได้ทั้งหมด',
    items,
    // เป้าต้องไม่เกินจำนวนของถูกที่โปรยลงมาจริง ไม่งั้นด่านนี้ชนะไม่ได้
    targetCatches: Math.min(6, wanted.length),
    allowedMistakes: 3,
  }
}

/**
 * เส้นทางลับ — เดินจากบนลงล่าง ทุกก้าวต้องเพิ่มขึ้นเท่ากันเสมอ
 *
 * วิธีสร้าง: วางเส้นทางที่ถูกต้องลงไปก่อน แล้วค่อยเติมช่องที่เหลือ
 *
 * ทำไมต้องทำตามลำดับนี้ ไม่ใช่สุ่มทั้งกระดานแล้วค่อยหาเส้นทาง
 * เพราะการสุ่มทั้งกระดานไม่รับประกันว่าจะมีเส้นทางอยู่จริง
 * กระดานที่เดินไม่ได้คือด่านที่เด็กเล่นยังไงก็ไม่ผ่าน
 * และจะเกิดเป็นบางเมล็ดสุ่มเท่านั้น ซึ่งเป็นบั๊กที่หาเจอยากที่สุด
 *
 * ช่องที่ไม่ได้อยู่บนเส้นทางต้องไม่บังเอิญเป็นก้าวที่ถูกด้วย
 * ไม่งั้นจะมีเส้นทางที่สองที่เราไม่ได้ตั้งใจ แล้วเด็กที่เดินทางนั้น
 * จะโดนบอกว่าผิดทั้งที่เดินตามกฎทุกอย่าง ซึ่งไม่ยุติธรรมอย่างยิ่ง
 */
function buildPath(rng: Rng, req: MinigameRequest): Minigame {
  const hard = req.grade >= 6
  const rows = hard ? 6 : 5
  const cols = hard ? 5 : 4

  // ขนาดก้าวเลือกจากชั้น ตัวเลขที่นับเพิ่มในใจได้แต่ไม่ง่ายจนไม่ต้องคิด
  const stepChoices = req.grade <= 4 ? [3, 4, 5] : hard ? [7, 8, 9, 12] : [6, 7, 8]
  const step = rng.pick(stepChoices)
  const start = rng.int(2, 9) * (req.grade <= 4 ? 2 : 3)

  // 1. วางเส้นทาง: แถวละหนึ่งช่อง เลื่อนซ้ายขวาได้ไม่เกินหนึ่งช่อง
  const pathCols: number[] = [rng.int(0, cols - 1)]
  for (let row = 1; row < rows; row += 1) {
    const previous = pathCols[row - 1]
    const options = [previous - 1, previous, previous + 1].filter(
      (col) => col >= 0 && col < cols,
    )
    pathCols.push(rng.pick(options))
  }

  const pathValues = pathCols.map((_, row) => start + row * step)

  /*
   * 2. เติมช่องที่เหลือ
   *
   * ค่าที่ห้ามใช้คือค่าที่ทำให้เกิดก้าวที่ถูกต้องโดยไม่ได้ตั้งใจ
   * นั่นคือ (ค่าของช่องข้างบนที่เดินถึงได้) + step
   * และห้ามซ้ำกับค่าบนเส้นทางในแถวเดียวกันด้วย เพื่อไม่ให้สับสน
   */
  const cells: PathCell[] = []
  const valueAt = new Map<string, number>()
  const key = (row: number, col: number) => `${row}:${col}`

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      if (col === pathCols[row]) {
        valueAt.set(key(row, col), pathValues[row])
        continue
      }

      const banned = new Set<number>([pathValues[row]])
      if (row > 0) {
        for (const above of [col - 1, col, col + 1]) {
          if (above < 0 || above >= cols) continue
          const value = valueAt.get(key(row - 1, above))
          if (value !== undefined) banned.add(value + step)
        }
      }

      let candidate = 0
      let guard = 0
      do {
        guard += 1
        candidate = pathValues[row] + rng.int(1, step * 3) * (rng.chance(0.5) ? 1 : -1)
      } while ((banned.has(candidate) || candidate < 1) && guard < 60)

      // ถ้าสุ่มไม่ผ่านจริง ๆ ให้เลือกค่าที่ปลอดภัยแน่นอนแทนการยอมให้ผิดกฎ
      if (banned.has(candidate) || candidate < 1) {
        candidate = pathValues[row] + 1
        while (banned.has(candidate)) candidate += 1
      }
      valueAt.set(key(row, col), candidate)
    }
  }

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      cells.push({
        id: `c${row}-${col}`,
        value: valueAt.get(key(row, col)) ?? 0,
        row,
        col,
      })
    }
  }

  const solution = pathCols.map((col, row) => `c${row}-${col}`)

  return {
    id: `path-${req.seed}`,
    kind: 'path',
    grade: req.grade,
    skill: req.skill,
    title: 'สะพานหินลอยฟ้า',
    story:
      'หุบเหวเบื้องล่างลึกจนมองไม่เห็นก้น มีแผ่นหินลอยอยู่เป็นชั้น ๆ ' +
      'แผ่นที่เหยียบได้จะเรืองแสงขึ้นมาเอง แต่ต้องเหยียบให้ถูกลำดับเท่านั้น',
    step,
    rows,
    cols,
    cells,
    startCellId: solution[0],
    solution,
    instruction: `เริ่มจากแผ่นที่มีดาว แล้วเดินลงทีละแถว แผ่นถัดไปต้องมากกว่าเดิม ${step}`,
    successText: 'ข้ามหุบเหวมาได้แล้ว แผ่นหินเรืองแสงเป็นทางยาวข้างหลัง',
    allowedMistakes: 3,
  }
}

const BUILDERS: Record<MinigameKind, (rng: Rng, req: MinigameRequest) => Minigame> = {
  matching: buildMatching,
  connect: buildConnect,
  dragdrop: buildDragDrop,
  catch: buildCatch,
  path: buildPath,
}

export const MINIGAME_KINDS: MinigameKind[] = [
  'matching',
  'connect',
  'dragdrop',
  'catch',
  'path',
]

/** ชื่อชนิดเกมที่แสดงให้เด็กและครูเห็น */
export const MINIGAME_LABEL: Record<MinigameKind, string> = {
  matching: 'จับคู่',
  connect: 'โยงเส้น',
  dragdrop: 'ลากวาง',
  catch: 'รับของที่ตกลงมา',
  path: 'เส้นทางลับ',
}

/** สร้างมินิเกมหนึ่งกระดาน */
export function generateMinigame(req: MinigameRequest): Minigame {
  const rng = createRng(`${req.kind}-${req.skill}-${req.grade}-${req.seed}`)
  return BUILDERS[req.kind](rng, req)
}

/** ชื่อทักษะแบบภาษาไทย ใช้บนหน้าจอ */
export function skillLabel(skill: SkillId): string {
  return SKILL_LABEL[skill] ?? skill
}
