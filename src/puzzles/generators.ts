import { createRng, type Rng } from '../math/rng'
import { formatFraction, makeFraction, simplifyFraction } from '../math/fractions'
import type { Difficulty, Grade } from '../questionEngine/types'
import type { Puzzle, PuzzleKind, PuzzleSlot } from './types'

/**
 * ตัวสร้างปริศนา
 *
 * ทุกตัวรับ seed ได้ ครูจึงสร้างปริศนาชุดเดิมขึ้นมาดูซ้ำได้
 * และชุดทดสอบได้ผลเดิมทุกครั้ง
 *
 * หลักการเขียนเรื่อง: ปริศนาต้องมีเหตุผลว่าทำไมต้องแก้
 * "ประตูล็อกอยู่" ดีกว่า "จงหาคำตอบ" เพราะเด็กเห็นว่าคณิตศาสตร์ใช้ทำอะไรได้
 */

let counter = 0
function nextId(kind: string): string {
  counter += 1
  return `pz-${kind}-${Date.now().toString(36)}-${counter.toString(36)}`
}

/** ช่วงตัวเลขตามระดับความยาก */
function range(difficulty: Difficulty, grade: Grade): { min: number; max: number } {
  const base = {
    easy: { min: 2, max: 12 },
    medium: { min: 5, max: 40 },
    hard: { min: 12, max: 120 },
    expert: { min: 25, max: 400 },
  }[difficulty]

  const scale = grade === 6 ? 1.6 : grade === 5 ? 1.3 : 1
  return {
    min: Math.max(2, Math.round(base.min * scale)),
    max: Math.max(4, Math.round(base.max * scale)),
  }
}

/** สร้างตัวเลือกรอบ ๆ คำตอบ ไม่สุ่มมั่ว เพื่อให้ต้องคิดจริง */
function nearChoices(answer: number, rng: Rng, count = 4): string[] {
  const values = new Set<number>([answer])
  const spread = Math.max(1, Math.round(Math.abs(answer) * 0.2))

  let guard = 0
  while (values.size < count && guard < 60) {
    guard += 1
    const offset = rng.int(1, spread + 2) * (rng.chance(0.5) ? 1 : -1)
    const candidate = answer + offset
    if (candidate >= 0) values.add(candidate)
  }
  while (values.size < count) values.add(answer + values.size + 1)

  return rng.shuffle([...values]).map(String)
}

/**
 * ล็อกรหัสตัวเลข — ประตูมีรหัสหลายหลัก แต่ละหลักมาจากโจทย์หนึ่งข้อ
 * เป็นปริศนาที่เข้าใจง่ายที่สุด เหมาะเป็นด่านแรกที่เด็กเจอปริศนา
 */
function numberLock(difficulty: Difficulty, grade: Grade, rng: Rng): Puzzle {
  const { min, max } = range(difficulty, grade)
  const digits = difficulty === 'easy' ? 2 : 3

  const slots: PuzzleSlot[] = Array.from({ length: digits }, (_, index) => {
    const style = rng.int(0, 2)
    let clue: string
    let answer: number

    if (style === 0) {
      const a = rng.int(min, max)
      const b = rng.int(min, max)
      clue = `${a} + ${b}`
      answer = a + b
    } else if (style === 1) {
      const a = rng.int(min + max, max * 2)
      const b = rng.int(min, max)
      clue = `${a} − ${b}`
      answer = a - b
    } else {
      const divisor = rng.int(2, 9)
      const quotient = rng.int(2, Math.max(3, Math.floor(max / 4)))
      clue = `${divisor * quotient} ÷ ${divisor}`
      answer = quotient
    }

    return {
      id: `slot-${index}`,
      clue: `${clue} = ?`,
      answer: String(answer),
      choices: nearChoices(answer, rng),
      hint: 'คิดทีละข้อ ได้คำตอบแล้วค่อยใส่ลงช่อง',
    }
  })

  return {
    id: nextId('lock'),
    kind: 'numberLock',
    title: 'ประตูหินโบราณ',
    story:
      'ประตูหินปิดสนิทมาหลายร้อยปี บนประตูมีช่องใส่ตัวเลขเรียงกันอยู่ ' +
      'และมีโจทย์สลักไว้ข้าง ๆ แต่ละช่อง',
    instruction: `แก้โจทย์ทั้ง ${digits} ข้อ แล้วใส่คำตอบลงช่องให้ครบเพื่อเปิดประตู`,
    slots,
    successText: 'เสียงหินครูดดังขึ้น ประตูเปิดออกแล้ว! ทางข้างหน้าโล่งแล้ว',
    skill: 'wordProblems',
    difficulty,
    grade,
    emoji: '🚪',
  }
}

/** เติมตัวเลขที่หายไป — สะพานมีไม้กระดานหายไปหนึ่งแผ่น */
function missingNumber(difficulty: Difficulty, grade: Grade, rng: Rng): Puzzle {
  const { min, max } = range(difficulty, grade)

  const total = rng.int(min + max, max * 2)
  const known = rng.int(min, total - min)
  const missing = total - known

  return {
    id: nextId('missing'),
    kind: 'missingNumber',
    title: 'สะพานไม้ที่หายไปหนึ่งแผ่น',
    story:
      'สะพานข้ามลำธารมีไม้กระดานหายไปหนึ่งแผ่น ช่างไม้บอกว่าความยาวรวมต้องได้พอดี ' +
      'ถึงจะเดินข้ามได้ปลอดภัย',
    instruction: 'หาว่าไม้แผ่นที่หายไปยาวเท่าไร',
    slots: [
      {
        id: 'slot-0',
        clue: `${known} + ? = ${total}`,
        answer: String(missing),
        choices: nearChoices(missing, rng),
        hint: `ลองคิดกลับกัน: ${total} − ${known} เท่ากับเท่าไร`,
      },
    ],
    successText: 'ไม้แผ่นใหม่พอดีเป๊ะ! สะพานใช้ข้ามได้แล้ว',
    skill: 'addition',
    difficulty,
    grade,
    emoji: '🌉',
  }
}

/** ลำดับตัวเลข — รอยเท้าบนพื้นทรายหายไปบางรอย */
function sequence(difficulty: Difficulty, grade: Grade, rng: Rng): Puzzle {
  const { min } = range(difficulty, grade)

  const start = rng.int(min, min + 10)
  const step = difficulty === 'easy' ? rng.int(2, 5) : rng.int(3, 12)
  const isMultiply = difficulty !== 'easy' && rng.chance(0.35)

  const values: number[] = []
  let current = start
  for (let i = 0; i < 5; i += 1) {
    values.push(current)
    current = isMultiply ? current * 2 : current + step
  }

  const answer = values[4] as number
  const shown = values.slice(0, 4).join(', ')

  return {
    id: nextId('seq'),
    kind: 'sequence',
    title: 'รอยเท้าบนพื้นทราย',
    story:
      'มีรอยเท้าเรียงเป็นแนวบนพื้นทราย แต่ละรอยมีตัวเลขกำกับ ' +
      'รอยสุดท้ายถูกลมพัดจนเลือนหายไป',
    instruction: 'ดูว่าตัวเลขเพิ่มขึ้นแบบไหน แล้วบอกว่ารอยสุดท้ายคือเลขอะไร',
    slots: [
      {
        id: 'slot-0',
        clue: `${shown}, ?`,
        answer: String(answer),
        choices: nearChoices(answer, rng),
        hint: isMultiply
          ? 'ลองดูว่าแต่ละตัวเป็นกี่เท่าของตัวก่อนหน้า'
          : `ลองดูว่าแต่ละตัวห่างกันเท่าไร`,
      },
    ],
    successText: 'รอยเท้าครบแล้ว! เส้นทางชี้ไปทางทิศที่ถูกต้อง',
    skill: 'wordProblems',
    difficulty,
    grade,
    emoji: '👣',
  }
}

/** ตาชั่ง — ต้องหาว่าของชิ้นเดียวหนักเท่าไร */
function balance(difficulty: Difficulty, grade: Grade, rng: Rng): Puzzle {
  const { min, max } = range(difficulty, grade)

  const each = rng.int(min, Math.max(min + 2, Math.floor(max / 3)))
  const count = rng.int(2, 5)
  const total = each * count
  const item = rng.pick(['🍎 แอปเปิล', '🎃 ฟักทอง', '📦 กล่อง', '🥥 มะพร้าว'])

  return {
    id: nextId('balance'),
    kind: 'balance',
    title: 'ตาชั่งของพ่อค้า',
    story:
      'พ่อค้าในตลาดชั่งของรวมกันแล้ว แต่ลืมว่าชิ้นเดียวหนักเท่าไร ' +
      'ลูกค้ากำลังรอซื้อแค่ชิ้นเดียวอยู่',
    instruction: 'หาว่าของหนึ่งชิ้นหนักกี่กรัม',
    slots: [
      {
        id: 'slot-0',
        clue: `${item} × ${count} หนักรวม ${total} กรัม — หนึ่งชิ้นหนักเท่าไร`,
        answer: String(each),
        choices: nearChoices(each, rng),
        hint: `แบ่งน้ำหนักรวมออกเป็น ${count} ส่วนเท่า ๆ กัน`,
      },
    ],
    successText: 'พ่อค้าขอบคุณใหญ่เลย! ลูกค้าได้ของในราคาที่ถูกต้อง',
    skill: 'division',
    difficulty,
    grade,
    emoji: '⚖️',
  }
}

/** ประตูเศษส่วน — ต้องเลือกเศษส่วนที่เท่ากัน */
function fractionDoor(difficulty: Difficulty, grade: Grade, rng: Rng): Puzzle {
  /*
   * ตัวส่วนต้องมีให้เลือกเยอะพอ ไม่งั้นเด็กจะเจอปริศนาเดิมซ้ำ ๆ
   * ชุดแรกใช้แค่ 6 ตัว ทำให้ได้โจทย์ต่างกันแค่ 9 แบบจากการสุ่ม 25 ครั้ง
   * ชุดนี้ให้เศษส่วนอย่างต่ำที่ต่างกันได้เกือบ 30 แบบ
   */
  const denominator = rng.pick([2, 3, 4, 5, 6, 7, 8, 9, 10, 12])
  const numerator = rng.int(1, denominator - 1)
  const base = simplifyFraction(makeFraction(numerator, denominator))
  const factor = rng.int(2, 5)

  const answer = formatFraction(
    makeFraction(base.numerator * factor, base.denominator * factor),
  )

  // ตัวเลือกลวงคือเศษส่วนที่หน้าตาคล้ายแต่ค่าไม่เท่า
  const wrong = new Set<string>()
  let guard = 0
  while (wrong.size < 3 && guard < 40) {
    guard += 1
    const n = base.numerator * factor + rng.int(-2, 2)
    const d = base.denominator * factor + rng.int(-1, 2)
    if (n <= 0 || d <= 1) continue
    const text = formatFraction(makeFraction(n, d))
    if (text !== answer && text !== formatFraction(base)) wrong.add(text)
  }

  return {
    id: nextId('fracdoor'),
    kind: 'fractionDoor',
    title: 'ประตูแห่งส่วนแบ่ง',
    story:
      'ประตูมีช่องเสียบแผ่นหินอยู่ช่องหนึ่ง บนประตูสลักเศษส่วนไว้ ' +
      'มีแผ่นหินหลายแผ่นวางอยู่ แต่ใส่ได้แผ่นเดียวที่มีค่าเท่ากันเท่านั้น',
    instruction: `เลือกแผ่นหินที่มีค่าเท่ากับ ${formatFraction(base)}`,
    slots: [
      {
        id: 'slot-0',
        clue: `${formatFraction(base)} เท่ากับข้อใด`,
        answer,
        choices: rng.shuffle([answer, ...wrong]),
        hint: 'เศษส่วนที่เท่ากันคือคูณทั้งตัวเศษและตัวส่วนด้วยจำนวนเดียวกัน',
      },
    ],
    successText: 'แผ่นหินเข้าล็อกพอดี ประตูเลื่อนเปิดออก!',
    skill: 'fractions',
    difficulty,
    grade,
    emoji: '🗝️',
  }
}

const GENERATORS: Record<
  PuzzleKind,
  (difficulty: Difficulty, grade: Grade, rng: Rng) => Puzzle
> = {
  numberLock,
  missingNumber,
  sequence,
  balance,
  fractionDoor,
}

export const PUZZLE_KINDS = Object.keys(GENERATORS) as PuzzleKind[]

export interface GeneratePuzzleOptions {
  kind: PuzzleKind
  difficulty: Difficulty
  grade: Grade
  seed?: string
}

/** สร้างปริศนาหนึ่งอัน */
export function generatePuzzle(options: GeneratePuzzleOptions): Puzzle {
  const draw = GENERATORS[options.kind]
  if (!draw) throw new Error(`ไม่รู้จักปริศนาชนิด: ${options.kind}`)

  return draw(options.difficulty, options.grade, createRng(options.seed))
}
