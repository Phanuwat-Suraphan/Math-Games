import type { ChoiceQ, DenomId, Difficulty, MatchQ, PayQ } from '../engine/types'
import {
  ALL_DENOM_IDS,
  COIN_IDS,
  NOTE_IDS,
  decompose,
  denom,
  describeDenoms,
} from '../data/denominations'
import { PRODUCTS } from '../data/products'
import { formatBS, toSatang } from '../utils/money'
import { int, pick, sample, shuffle, uid } from '../utils/random'
import { hint, randomSatangPart } from './common'

/**
 * ด่าน 1: ธนบัตรและเงินเหรียญ
 */

function valueLabel(id: DenomId): string {
  return formatBS(denom(id).value)
}

/** แตะเงินที่โจทย์บอกชื่อ */
export function generateIdentifyMoneyQuestion(d: Difficulty): ChoiceQ {
  const target = pick(ALL_DENOM_IDS)
  const t = denom(target)

  // ระดับสูงขึ้นจะเลือกตัวลวงที่ "คล้ายกัน" เช่น 50 สตางค์ กับ 50 บาท
  let pool = ALL_DENOM_IDS.filter((id) => id !== target)
  if (d >= 2) {
    const sameFace = pool.filter((id) => denom(id).face === t.face)
    const sameKind = pool.filter((id) => denom(id).kind === t.kind)
    pool = Array.from(new Set([...sameFace, ...shuffle(sameKind), ...shuffle(pool)]))
  } else {
    pool = shuffle(pool)
  }
  const distractors = pool.slice(0, d === 1 ? 2 : 3)
  const ids = shuffle([target, ...distractors])

  const askByValue = d === 3
  const title = askByValue
    ? `แตะเงินที่มีค่า ${valueLabel(target)}`
    : `แตะ${t.name}`

  return {
    id: uid(),
    gen: 'identify',
    kind: 'choice',
    skill: 'notes',
    difficulty: d,
    title,
    layout: 'grid',
    options: ids.map((id) => ({ id, label: denom(id).name, money: [id] })),
    answer: target,
    npc: 'rabbit',
    hint: hint(
      t.kind === 'coin' ? 'สิ่งที่หาเป็น "เหรียญ" ทรงกลม ลองดูตัวเลขบนเหรียญ' : 'สิ่งที่หาเป็น "ธนบัตร" ทรงสี่เหลี่ยม ลองดูตัวเลขบนธนบัตร',
      `${t.name} หน้าตาแบบนี้ (${t.colorName})`,
      [`ตัวเลขบนเงินคือ ${t.face}`, `หน่วยคือ ${t.unit}`],
      { type: 'money', items: [target] },
    ),
    explain: [
      `${t.name} มีตัวเลข ${t.face} และเป็น${t.kind === 'coin' ? 'เหรียญ' : 'ธนบัตร'}${t.colorName}`,
      `มีค่า ${valueLabel(target)}`,
    ],
  }
}

/** จับคู่ภาพเงินกับค่าของมัน */
export function generateMatchMoneyQuestion(d: Difficulty): MatchQ {
  const n = d === 1 ? 3 : d === 2 ? 4 : 5
  let ids: DenomId[]
  if (d === 3) {
    // ระดับท้าทาย: ใส่คู่ที่ตัวเลขเหมือนกันแต่หน่วยต่างกัน
    ids = sample(['s50', 'b50'] as DenomId[], 2).concat(
      sample(ALL_DENOM_IDS.filter((id) => id !== 's50' && id !== 'b50'), n - 2),
    )
  } else {
    ids = sample(ALL_DENOM_IDS, n)
  }
  const pairs = ids.map((id) => ({
    id,
    left: { label: denom(id).name, money: [id] },
    right: { label: valueLabel(id) },
  }))
  return {
    id: uid(),
    gen: 'matchMoney',
    kind: 'match',
    skill: 'notes',
    difficulty: d,
    title: 'จับคู่เงินกับค่าของมัน',
    pairs,
    rightOrder: shuffle(ids),
    npc: 'rabbit',
    hint: hint(
      'ดูตัวเลขบนเงิน แล้วดูว่าเป็น "บาท" หรือ "สตางค์"',
      'เหรียญเล็กสีทองแดงมีค่าเป็นสตางค์ ส่วนเหรียญอื่นกับธนบัตรมีค่าเป็นบาท',
      [`${denom(ids[0]).name} มีค่า ${valueLabel(ids[0])}`],
      { type: 'money', items: ids },
    ),
    explain: ids.map((id) => `${denom(id).name} = ${valueLabel(id)}`),
  }
}

/** เงินชนิดใดมีค่ามากที่สุด / น้อยที่สุด / เป็นธนบัตร / เป็นเหรียญ */
export function generateMoneyKindQuestion(d: Difficulty): ChoiceQ {
  const mode = d === 1 ? pick(['note', 'coin'] as const) : pick(['max', 'min', 'note', 'coin'] as const)
  let ids: DenomId[]
  let answer: DenomId
  let title: string
  let reason: string

  if (mode === 'note' || mode === 'coin') {
    const wanted = mode === 'note' ? NOTE_IDS : COIN_IDS
    const other = mode === 'note' ? COIN_IDS : NOTE_IDS
    answer = pick(wanted)
    ids = shuffle([answer, ...sample(other, 3)])
    title = mode === 'note' ? 'ข้อใดเป็น "ธนบัตร"' : 'ข้อใดเป็น "เหรียญ"'
    reason = mode === 'note' ? 'ธนบัตรเป็นกระดาษสี่เหลี่ยม' : 'เหรียญเป็นโลหะทรงกลม'
  } else {
    ids = sample(ALL_DENOM_IDS, 4)
    const sorted = ids.slice().sort((a, b) => denom(a).value - denom(b).value)
    answer = mode === 'max' ? sorted[sorted.length - 1] : sorted[0]
    title = mode === 'max' ? 'เงินชนิดใดมีค่า "มากที่สุด"' : 'เงินชนิดใดมีค่า "น้อยที่สุด"'
    reason = `เรียงจากน้อยไปมาก: ${sorted.map(valueLabel).join(' < ')}`
  }

  return {
    id: uid(),
    gen: 'moneyKind',
    kind: 'choice',
    skill: 'notes',
    difficulty: d,
    title,
    layout: 'grid',
    options: ids.map((id) => ({ id, label: denom(id).name, money: [id] })),
    answer,
    npc: 'rabbit',
    hint: hint(
      mode === 'max' || mode === 'min'
        ? 'อย่าลืมว่า 100 สตางค์ = 1 บาท สตางค์จึงมีค่าน้อยกว่าบาท'
        : 'ธนบัตรเป็นกระดาษ เหรียญเป็นโลหะกลม ๆ',
      'ดูค่าของเงินแต่ละชนิด',
      [reason],
      { type: 'rules', items: ids.map((id) => `${denom(id).name} = ${valueLabel(id)}`) },
    ),
    explain: [reason, `คำตอบคือ ${denom(answer).name}`],
  }
}

/** จ่ายเงินซื้อของให้ครบพอดี */
export function generatePayQuestion(d: Difficulty): PayQ {
  const candidates = PRODUCTS.filter((p) => (d === 1 ? p.max <= 40 : d === 2 ? p.max <= 400 : true))
  const product = pick(candidates)
  const hi = d === 1 ? Math.min(product.max, 40) : d === 2 ? Math.min(product.max, 400) : product.max
  const lo = Math.min(product.min, hi)
  const baht = int(lo, hi)
  const satang = d === 1 || !product.satang ? 0 : randomSatangPart(d)
  const price = toSatang(baht, satang)

  // ถาดเงิน: เงินทุกชนิดที่ไม่เกินราคา (ระดับง่ายตัดสตางค์ออกถ้าไม่ต้องใช้)
  let tray = ALL_DENOM_IDS.filter((id) => denom(id).value <= price)
  if (satang === 0 && d === 1) tray = tray.filter((id) => denom(id).value >= 100)
  const exact = decompose(price, tray)
  if (!exact) throw new Error(`จ่าย ${price} ไม่ได้ด้วย ${tray.join(',')}`)

  return {
    id: uid(),
    gen: 'pay',
    kind: 'pay',
    mode: 'pay',
    skill: 'notes',
    difficulty: d,
    title: `จ่ายเงินซื้อ${product.name}ให้พอดี ${formatBS(price)}`,
    story: `${product.emoji} ${product.name} ราคา ${formatBS(price)}`,
    target: price,
    tray,
    sample: [exact],
    product: { name: product.name, emoji: product.emoji },
    npc: 'bear',
    hint: hint(
      'เริ่มจากเงินที่มีค่ามากแต่ไม่เกินราคา แล้วค่อยเติมเงินที่เล็กลง',
      'ตัวอย่างการเลือกเงินชิ้นใหญ่ก่อน',
      [`เลือก${denom(exact[0]).name}ก่อน จะเหลือต้องจ่ายอีก ${formatBS(price - denom(exact[0]).value)}`],
      { type: 'money', items: exact.slice(0, Math.max(1, Math.ceil(exact.length / 2))) },
    ),
    explain: [
      `ราคา ${formatBS(price)}`,
      `ตัวอย่างวิธีจ่าย: ${describeDenoms(exact)}`,
      'จ่ายแบบอื่นก็ได้ ถ้ารวมแล้วเท่ากับราคาพอดี',
    ],
  }
}
