import type { BarPart, Difficulty, Op, Visual, WordQ, WordStep } from '../engine/types'
import { KID_NAMES, PRODUCTS } from '../data/products'
import { formatBS, toSatang } from '../utils/money'
import { int, pick, sample, shuffle, uid } from '../utils/random'
import { bahtRange, explainAdd, explainDiv, explainMul, explainSub, hint, randomSatangPart } from './common'

/**
 * ด่าน 9: โจทย์ปัญหาบวก–ลบ
 * ด่าน 10: โจทย์ปัญหาคูณ–หาร
 *
 * ทุกโจทย์มีขั้นตอน 4 ขั้น: อ่านและทำความเข้าใจ → วางแผน → คำนวณ → ตรวจสอบ
 * หน้าจอแยกถามว่า "โจทย์บอกอะไร?" "โจทย์ถามอะไร?" "ต้องใช้วิธีใด?"
 */

export type WordFamily = 'addsub' | 'muldiv' | 'all'

interface Built {
  story: string
  op: Op
  a: number
  b: number
  bPlain: boolean
  answer: number
  givenRight: string
  givenWrong: string[]
  askedRight: string
  askedWrong: string[]
  bar: Visual
  check: string
  explain: string[]
}

function amount(d: Difficulty): number {
  const [lo, hi] = bahtRange(d)
  return toSatang(int(lo, Math.min(hi, d === 1 ? 99 : hi)), randomSatangPart(d))
}

function bar(mode: 'join' | 'separate' | 'compare' | 'equal', parts: BarPart[], total: BarPart, count?: number): Visual {
  return { type: 'bar', mode, parts, total, count }
}

function addSubTemplates(d: Difficulty): (() => Built)[] {
  const [n1, n2] = sample(KID_NAMES, 2)
  const item = pick(PRODUCTS.filter((p) => p.max <= (d === 1 ? 60 : 500)))
  return [
    // เงินของเพื่อน 2 คนรวมกัน
    () => {
      const a = amount(d)
      const b = amount(d)
      return {
        story: `${n1}มีเงิน ${formatBS(a)} ${n2}มีเงิน ${formatBS(b)}`,
        op: '+',
        a,
        b,
        bPlain: false,
        answer: a + b,
        givenRight: `${n1}มี ${formatBS(a)} และ${n2}มี ${formatBS(b)}`,
        givenWrong: [`${n1}มี ${formatBS(b + 100)} และ${n2}มี ${formatBS(a)}`, `${n1}มี ${formatBS(a + b)}`],
        askedRight: 'สองคนมีเงินรวมกันเท่าไร',
        askedWrong: [`${n1}มีเงินมากกว่า${n2}เท่าไร`, 'แต่ละคนต้องจ่ายเท่าไร'],
        bar: bar('join', [
          { label: n1, value: a },
          { label: n2, value: b },
        ], { label: 'รวม', unknown: true }),
        check: `ตรวจ: เงินรวม ${formatBS(a + b)} − ${formatBS(b)} = ${formatBS(a)} ✔ และเงินรวมต้องมากกว่าเงินของแต่ละคน`,
        explain: explainAdd([a, b]),
      }
    },
    // ซื้อของแล้วเหลือเงิน
    () => {
      const price = amount(d)
      const have = toSatang(Math.ceil((price + 1) / 10000) * 100 + pick([0, 100]))
      return {
        story: `${n1}มีเงิน ${formatBS(have)} ซื้อ${item.name}ราคา ${formatBS(price)}`,
        op: '-',
        a: have,
        b: price,
        bPlain: false,
        answer: have - price,
        givenRight: `มีเงิน ${formatBS(have)} ซื้อของราคา ${formatBS(price)}`,
        givenWrong: [`มีเงิน ${formatBS(price)} ซื้อของราคา ${formatBS(have)}`, `ซื้อของ 2 ชิ้น ราคา ${formatBS(price)}`],
        askedRight: `${n1}เหลือเงินเท่าไร`,
        askedWrong: ['ของราคาเท่าไร', `${n1}มีเงินทั้งหมดกี่บาท`],
        bar: bar('separate', [
          { label: 'จ่าย', value: price },
          { label: 'เหลือ', unknown: true },
        ], { label: 'มีอยู่', value: have }),
        check: `ตรวจ: เหลือ ${formatBS(have - price)} + จ่าย ${formatBS(price)} = ${formatBS(have)} ✔ และเงินเหลือต้องน้อยกว่าเงินที่มี`,
        explain: explainSub(have, price),
      }
    },
    // วันนี้ขายได้น้อยกว่าเมื่อวาน
    () => {
      const yesterday = amount(d) + toSatang(d === 1 ? 20 : 200)
      const less = toSatang(int(d === 1 ? 5 : 20, d === 1 ? 19 : 180), randomSatangPart(d))
      return {
        story: `เมื่อวานร้าน${n1}ขายของได้ ${formatBS(yesterday)} วันนี้ขายได้น้อยกว่าเมื่อวาน ${formatBS(less)}`,
        op: '-',
        a: yesterday,
        b: less,
        bPlain: false,
        answer: yesterday - less,
        givenRight: `เมื่อวานขายได้ ${formatBS(yesterday)} วันนี้ได้น้อยกว่า ${formatBS(less)}`,
        givenWrong: [
          `เมื่อวานขายได้ ${formatBS(yesterday)} วันนี้ได้มากกว่า ${formatBS(less)}`,
          `วันนี้ขายได้ ${formatBS(yesterday)}`,
        ],
        askedRight: 'วันนี้ขายของได้เงินเท่าไร',
        askedWrong: ['สองวันขายได้รวมกันเท่าไร', 'เมื่อวานขายได้เท่าไร'],
        bar: bar('compare', [
          { label: 'เมื่อวาน', value: yesterday },
          { label: 'วันนี้', unknown: true },
        ], { label: `น้อยกว่า ${formatBS(less)}`, value: less }),
        check: `ตรวจ: วันนี้ ${formatBS(yesterday - less)} + ${formatBS(less)} = เมื่อวาน ${formatBS(yesterday)} ✔`,
        explain: ['"น้อยกว่า" จึงใช้การลบ', ...explainSub(yesterday, less)],
      }
    },
    // มีเงินอยู่แล้วได้เพิ่ม
    () => {
      const a = amount(d)
      const b = toSatang(pick(d === 1 ? [10, 20, 50] : [50, 100, 500]))
      return {
        story: `${n1}มีเงินเก็บ ${formatBS(a)} คุณแม่ให้เพิ่มอีก ${formatBS(b)}`,
        op: '+',
        a,
        b,
        bPlain: false,
        answer: a + b,
        givenRight: `มีเงินเก็บ ${formatBS(a)} ได้เพิ่ม ${formatBS(b)}`,
        givenWrong: [`มีเงินเก็บ ${formatBS(b)} ใช้ไป ${formatBS(a)}`, `ได้เงินเพิ่ม ${formatBS(a + b)}`],
        askedRight: `ตอนนี้${n1}มีเงินทั้งหมดเท่าไร`,
        askedWrong: ['คุณแม่ให้เงินเท่าไร', `${n1}ใช้เงินไปเท่าไร`],
        bar: bar('join', [
          { label: 'เงินเก็บ', value: a },
          { label: 'ได้เพิ่ม', value: b },
        ], { label: 'ทั้งหมด', unknown: true }),
        check: `ตรวจ: ${formatBS(a + b)} − ${formatBS(b)} = ${formatBS(a)} ✔ ได้เงินเพิ่ม เงินต้องมากขึ้น`,
        explain: explainAdd([a, b]),
      }
    },
    // ใครมีมากกว่ากันเท่าไร
    () => {
      const small = amount(d)
      const big = small + toSatang(int(d === 1 ? 3 : 15, d === 1 ? 40 : 300), randomSatangPart(d))
      return {
        story: `${n1}มีเงิน ${formatBS(big)} ${n2}มีเงิน ${formatBS(small)}`,
        op: '-',
        a: big,
        b: small,
        bPlain: false,
        answer: big - small,
        givenRight: `${n1}มี ${formatBS(big)} ${n2}มี ${formatBS(small)}`,
        givenWrong: [`${n1}มี ${formatBS(small)} ${n2}มี ${formatBS(big)}`, `สองคนมีเงินรวม ${formatBS(big)}`],
        askedRight: `${n1}มีเงินมากกว่า${n2}เท่าไร`,
        askedWrong: ['สองคนมีเงินรวมกันเท่าไร', `${n2}ใช้เงินไปเท่าไร`],
        bar: bar('compare', [
          { label: n1, value: big },
          { label: n2, value: small },
        ], { label: 'ผลต่าง', unknown: true }),
        check: `ตรวจ: ${formatBS(small)} + ${formatBS(big - small)} = ${formatBS(big)} ✔`,
        explain: ['หาว่ามากกว่ากันเท่าไร ใช้การลบ (มาก − น้อย)', ...explainSub(big, small)],
      }
    },
  ]
}

function mulDivTemplates(d: Difficulty): (() => Built)[] {
  const [n1] = sample(KID_NAMES, 1)
  const item = pick(PRODUCTS.filter((p) => p.max <= (d === 1 ? 40 : 150)))
  const price = (): number => {
    const baht = int(d === 1 ? 5 : 10, d === 1 ? 40 : d === 2 ? 99 : 250)
    return toSatang(baht, d === 1 ? 0 : pick([0, 25, 50, 75]))
  }
  const count = (): number => (d === 1 ? int(2, 5) : d === 2 ? int(2, 6) : int(3, 9))
  return [
    // ซื้อของจำนวนเท่ากันหลายชิ้น
    () => {
      const p = price()
      const n = count()
      return {
        story: `${n1}ซื้อ${item.name} ${n} ชิ้น ราคาชิ้นละ ${formatBS(p)}`,
        op: '×',
        a: p,
        b: n,
        bPlain: true,
        answer: p * n,
        givenRight: `ราคาชิ้นละ ${formatBS(p)} ซื้อ ${n} ชิ้น`,
        givenWrong: [`ราคาทั้งหมด ${formatBS(p)} มี ${n} ชิ้น`, `ราคาชิ้นละ ${formatBS(p)} ซื้อ ${n + 1} ชิ้น`],
        askedRight: 'ต้องจ่ายเงินทั้งหมดเท่าไร',
        askedWrong: ['ราคาชิ้นละเท่าไร', 'เหลือเงินเท่าไร'],
        bar: bar('equal', Array.from({ length: n }, () => ({ label: formatBS(p), value: p })), { label: 'ทั้งหมด', unknown: true }, n),
        check: `ตรวจ: ${formatBS(p * n)} ÷ ${n} = ${formatBS(p)} ✔`,
        explain: ['ราคาต่อชิ้น × จำนวนชิ้น', ...explainMul(p, n)],
      }
    },
    // ซื้อของเป็นชุด
    () => {
      const p = price()
      const n = count()
      return {
        story: `ขนม 1 ชุด ราคา ${formatBS(p)} คุณครูซื้อ ${n} ชุด`,
        op: '×',
        a: p,
        b: n,
        bPlain: true,
        answer: p * n,
        givenRight: `1 ชุดราคา ${formatBS(p)} ซื้อ ${n} ชุด`,
        givenWrong: [`${n} ชุดราคา ${formatBS(p)}`, `1 ชุดราคา ${formatBS(p * n)}`],
        askedRight: 'คุณครูจ่ายเงินทั้งหมดเท่าไร',
        askedWrong: ['ขนมชุดละเท่าไร', 'คุณครูซื้อกี่ชุด'],
        bar: bar('equal', Array.from({ length: n }, () => ({ label: formatBS(p), value: p })), { label: 'ทั้งหมด', unknown: true }, n),
        check: `ตรวจ: ${formatBS(p * n)} ÷ ${n} = ${formatBS(p)} ✔`,
        explain: ['ซื้อหลายชุดราคาเท่ากัน ใช้การคูณ', ...explainMul(p, n)],
      }
    },
    // เงินทั้งหมดแบ่งเท่า ๆ กัน
    () => {
      const n = d === 1 ? int(2, 5) : int(2, 6)
      const each = d === 1 ? toSatang(int(5, 50)) : toSatang(int(10, 200), pick([0, 25, 50, 75]))
      const total = each * n
      return {
        story: `คุณยายมีเงิน ${formatBS(total)} แบ่งให้หลาน ${n} คน เท่า ๆ กัน`,
        op: '÷',
        a: total,
        b: n,
        bPlain: true,
        answer: each,
        givenRight: `เงิน ${formatBS(total)} แบ่งให้ ${n} คนเท่า ๆ กัน`,
        givenWrong: [`แต่ละคนได้ ${formatBS(total)}`, `เงิน ${formatBS(total)} แบ่งให้ ${n + 1} คน`],
        askedRight: 'หลานได้เงินคนละเท่าไร',
        askedWrong: ['คุณยายมีเงินทั้งหมดเท่าไร', 'มีหลานกี่คน'],
        bar: bar('equal', Array.from({ length: n }, () => ({ label: '?', unknown: true })), { label: formatBS(total), value: total }, n),
        check: `ตรวจ: ${formatBS(each)} × ${n} = ${formatBS(total)} ✔`,
        explain: ['แบ่งเท่า ๆ กัน ใช้การหาร', ...explainDiv(total, n)],
      }
    },
    // ค่าใช้จ่ายต่อคน
    () => {
      const n = d === 1 ? int(2, 4) : int(2, 6)
      const each = d === 1 ? toSatang(int(20, 60)) : toSatang(int(25, 180), pick([0, 25, 50, 75]))
      const total = each * n
      return {
        story: `เพื่อน ${n} คน ไปกินข้าวด้วยกัน ค่าอาหารรวม ${formatBS(total)} หารกันจ่ายเท่า ๆ กัน`,
        op: '÷',
        a: total,
        b: n,
        bPlain: true,
        answer: each,
        givenRight: `ค่าอาหารรวม ${formatBS(total)} มีเพื่อน ${n} คน`,
        givenWrong: [`ค่าอาหารคนละ ${formatBS(total)}`, `ค่าอาหารรวม ${formatBS(total + 1000)} มีเพื่อน ${n} คน`],
        askedRight: 'ต้องจ่ายเงินคนละเท่าไร',
        askedWrong: ['ค่าอาหารรวมเท่าไร', 'มีเพื่อนกี่คน'],
        bar: bar('equal', Array.from({ length: n }, () => ({ label: '?', unknown: true })), { label: formatBS(total), value: total }, n),
        check: `ตรวจ: ${formatBS(each)} × ${n} = ${formatBS(total)} ✔`,
        explain: ['หารกันจ่าย ใช้การหาร', ...explainDiv(total, n)],
      }
    },
    // ราคาต่อชิ้น
    () => {
      const n = d === 1 ? int(2, 5) : int(3, 8)
      const each = d === 1 ? toSatang(int(3, 30)) : toSatang(int(5, 90), pick([0, 25, 50, 75]))
      const total = each * n
      return {
        story: `${item.name} ${n} ชิ้น ราคารวม ${formatBS(total)} ทุกชิ้นราคาเท่ากัน`,
        op: '÷',
        a: total,
        b: n,
        bPlain: true,
        answer: each,
        givenRight: `${n} ชิ้น ราคารวม ${formatBS(total)}`,
        givenWrong: [`1 ชิ้น ราคา ${formatBS(total)}`, `${n} ชิ้น ราคาชิ้นละ ${formatBS(total)}`],
        askedRight: `${item.name}ราคาชิ้นละเท่าไร`,
        askedWrong: ['ราคารวมเท่าไร', 'มีกี่ชิ้น'],
        bar: bar('equal', Array.from({ length: n }, () => ({ label: '?', unknown: true })), { label: formatBS(total), value: total }, n),
        check: `ตรวจ: ${formatBS(each)} × ${n} = ${formatBS(total)} ✔`,
        explain: ['หาราคาต่อชิ้น ใช้การหาร', ...explainDiv(total, n)],
      }
    },
  ]
}

function shuffledChoice(right: string, wrong: string[]): { options: string[]; answer: number } {
  const options = shuffle(Array.from(new Set([right, ...wrong])))
  return { options, answer: options.indexOf(right) }
}

const OP_WORD: Record<Op, string> = { '+': 'บวก', '-': 'ลบ', '×': 'คูณ', '÷': 'หาร' }

export function generateWordProblemQuestion(
  d: Difficulty,
  family: WordFamily = 'addsub',
  steps: WordStep[] = ['given', 'asked', 'op', 'calc', 'check'],
): WordQ {
  const templates =
    family === 'addsub' ? addSubTemplates(d) : family === 'muldiv' ? mulDivTemplates(d) : [...addSubTemplates(d), ...mulDivTemplates(d)]
  const built = pick(templates)()
  const opHint: Record<Op, string> = {
    '+': 'คำว่า "รวมกัน" "ได้เพิ่ม" "ทั้งหมด" มักใช้การบวก',
    '-': 'คำว่า "เหลือ" "น้อยกว่า" "มากกว่าเท่าไร" มักใช้การลบ',
    '×': 'ของราคาเท่ากันหลายชิ้น หลายชุด มักใช้การคูณ',
    '÷': 'คำว่า "แบ่งเท่า ๆ กัน" "คนละ" "ชิ้นละ" มักใช้การหาร',
  }

  return {
    id: uid(),
    gen: family === 'addsub' ? 'wordAddSub' : family === 'muldiv' ? 'wordMulDiv' : 'wordAll',
    kind: 'word',
    skill: 'word',
    difficulty: d,
    title: 'แก้โจทย์ปัญหาทีละขั้น',
    story: built.story,
    steps,
    given: shuffledChoice(built.givenRight, built.givenWrong),
    asked: shuffledChoice(built.askedRight, built.askedWrong),
    op: built.op,
    a: built.a,
    b: built.b,
    bPlain: built.bPlain,
    answer: built.answer,
    check: built.check,
    visual: built.bar,
    npc: 'fox',
    hint: hint(
      opHint[built.op],
      'ลองดูแผนภาพบาร์โมเดล',
      [`ใช้การ${OP_WORD[built.op]}`, built.explain[1] ?? built.explain[0]],
      built.bar,
    ),
    explain: [
      `โจทย์บอก: ${built.givenRight}`,
      `โจทย์ถาม: ${built.askedRight}`,
      `วิธีคิด: ใช้การ${OP_WORD[built.op]}`,
      ...built.explain.filter((line) => !line.startsWith('ตรวจ')),
      built.check,
    ],
  }
}
