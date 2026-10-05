import type { ChoiceQ, DenomId, Difficulty, NumberQ, PayQ } from '../engine/types'
import {
  ALL_DENOM_IDS,
  classifier,
  comboKey,
  decompose,
  denom,
  describeDenoms,
  sumDenoms,
} from '../data/denominations'
import { commas, formatBS, toSatang } from '../utils/money'
import { pick, shuffle, uid } from '../utils/random'
import { hint } from './common'

/**
 * ด่าน 5: การแลกเงิน (1) EXCHANGE STATION
 * ด่าน 6: การแลกเงิน (2) MONEY MAKER
 *
 * กฎทองของการแลกเงิน: จำนวนเงินก่อนแลก = จำนวนเงินหลังแลก
 */

function smallerThan(value: number): DenomId[] {
  return ALL_DENOM_IDS.filter((id) => denom(id).value < value)
}

function repeat(id: DenomId, n: number): DenomId[] {
  return Array.from({ length: n }, () => id)
}

/**
 * หาวิธีแสดงจำนวนเงินให้ได้หลายแบบที่ไม่ซ้ำกัน
 * ใช้ตอนสร้างโจทย์ MONEY MAKER เพื่อยืนยันว่ามีคำตอบครบตามที่ขอจริง
 */
export function distinctCombos(target: number, tray: DenomId[], want: number, exclude: DenomId[] = []): DenomId[][] {
  const found: DenomId[][] = []
  const seen = new Set<string>()
  const usable = tray.filter((id) => !exclude.includes(id))
  const sorted = usable.slice().sort((a, b) => denom(b).value - denom(a).value)
  // ลองตัดเงินชิ้นใหญ่ออกทีละชนิด จะได้แบบใหม่เรื่อย ๆ
  for (let skip = 0; skip <= sorted.length && found.length < want; skip += 1) {
    const allowed = sorted.slice(skip)
    const combo = decompose(target, allowed, 40)
    if (!combo) continue
    const key = comboKey(combo)
    if (seen.has(key)) continue
    seen.add(key)
    found.push(combo)
  }
  return found
}

/** EXCHANGE STATION: แลกเงินให้ได้มูลค่าเท่าเดิม */
export function generateExchangeMoneyQuestion(d: Difficulty): PayQ {
  let give: DenomId[]
  let tray: DenomId[]
  let title: string

  if (d === 3 && pick([true, false])) {
    // แลกขึ้น: เหรียญเล็กหลายเหรียญ แลกเป็นเงินชิ้นใหญ่
    const plan = pick([
      { small: 'b1', n: 5 },
      { small: 'b2', n: 5 },
      { small: 'b5', n: 4 },
      { small: 'b10', n: 5 },
      { small: 's25', n: 4 },
      { small: 's50', n: 4 },
      { small: 'b20', n: 5 },
    ] as { small: DenomId; n: number }[])
    give = repeat(plan.small, plan.n)
    const value = sumDenoms(give)
    tray = ALL_DENOM_IDS.filter((id) => id !== plan.small && denom(id).value <= value)
    title = `แลก${denom(plan.small).name} ${plan.n} ${classifier(plan.small)} เป็นเงินชนิดอื่น ให้มีค่าเท่าเดิม`
  } else {
    const pool: DenomId[] =
      d === 1 ? ['s50', 'b1', 'b2', 'b5', 'b10'] : d === 2 ? ['b10', 'b20', 'b50', 'b100'] : ['b100', 'b500', 'b1000']
    const big = pick(pool)
    give = [big]
    tray = smallerThan(denom(big).value)
    // ระดับ 1 ให้ถาดเงินเล็กลง จะได้ไม่สับสน
    if (d === 1) tray = tray.slice(-4)
    title = `แลก${denom(big).name} เป็นเงินชิ้นเล็กกว่า ให้มีค่าเท่าเดิม`
  }

  const target = sumDenoms(give)
  const samples = distinctCombos(target, tray, 1)
  if (samples.length === 0) throw new Error(`แลก ${target} ด้วย ${tray.join(',')} ไม่ได้`)

  return {
    id: uid(),
    gen: 'exchange',
    kind: 'pay',
    mode: 'exchange',
    skill: 'exchange',
    difficulty: d,
    title,
    target,
    tray,
    give,
    rule: { exclude: give.slice(0, 1) },
    sample: samples,
    npc: 'rabbit',
    hint: hint(
      'เงินหลังแลกต้องรวมกันได้เท่ากับเงินก่อนแลกพอดี',
      `เงินก่อนแลกมีค่า ${formatBS(target)}`,
      [`ลองเริ่มจาก${denom(samples[0][0]).name}`, `จะต้องหาเพิ่มอีก ${formatBS(target - denom(samples[0][0]).value)}`],
      { type: 'big', text: formatBS(target), sub: 'ก่อนแลก = หลังแลก' },
    ),
    explain: [
      `ก่อนแลก: ${describeDenoms(give)} = ${formatBS(target)}`,
      `ตัวอย่างหลังแลก: ${describeDenoms(samples[0])} = ${formatBS(target)}`,
      'ก่อนแลก = หลังแลก ✔',
    ],
  }
}

/** แลกได้กี่เหรียญ / กี่ใบ */
export function generateExchangeCountQuestion(d: Difficulty): NumberQ {
  const table: Record<Difficulty, { big: DenomId; n: number; small: DenomId }[]> = {
    1: [
      { big: 'b1', n: 1, small: 's25' },
      { big: 'b1', n: 1, small: 's50' },
      { big: 'b2', n: 1, small: 'b1' },
      { big: 'b5', n: 1, small: 'b1' },
      { big: 'b10', n: 1, small: 'b5' },
      { big: 'b10', n: 1, small: 'b2' },
      { big: 'b10', n: 1, small: 'b1' },
      { big: 'b20', n: 1, small: 'b10' },
      { big: 'b20', n: 1, small: 'b5' },
    ],
    2: [
      { big: 'b50', n: 1, small: 'b10' },
      { big: 'b100', n: 1, small: 'b20' },
      { big: 'b100', n: 1, small: 'b50' },
      { big: 'b100', n: 1, small: 'b10' },
      { big: 'b20', n: 1, small: 'b2' },
      { big: 'b50', n: 1, small: 'b5' },
      { big: 'b500', n: 1, small: 'b100' },
      { big: 'b5', n: 1, small: 's50' },
      { big: 'b2', n: 1, small: 's25' },
    ],
    3: [
      { big: 'b1000', n: 1, small: 'b100' },
      { big: 'b500', n: 1, small: 'b50' },
      { big: 'b100', n: 3, small: 'b20' },
      { big: 'b50', n: 2, small: 'b5' },
      { big: 'b1', n: 4, small: 's25' },
      { big: 'b1000', n: 1, small: 'b20' },
      { big: 'b20', n: 3, small: 'b2' },
      { big: 'b10', n: 3, small: 's50' },
    ],
  }
  const plan = pick(table[d])
  const total = denom(plan.big).value * plan.n
  const each = denom(plan.small).value
  const answer = total / each
  if (!Number.isInteger(answer)) throw new Error('แลกเงินไม่ลงตัว')
  const unit = classifier(plan.small)

  return {
    id: uid(),
    gen: 'exchangeCount',
    kind: 'number',
    unit,
    skill: 'exchange',
    difficulty: d,
    title: `${denom(plan.big).name} ${plan.n} ${classifier(plan.big)} แลก${denom(plan.small).name} ได้กี่${unit}?`,
    visual: { type: 'exchange', left: repeat(plan.big, plan.n), right: [plan.small] },
    answer,
    npc: 'rabbit',
    hint: hint(
      `นับเพิ่มทีละ ${formatBS(each)} จนได้ ${formatBS(total)}`,
      'ลองวางเงินชิ้นเล็กทีละชิ้น',
      [`${denom(plan.small).name} 2 ${unit} = ${formatBS(each * 2)}`],
      { type: 'exchange', left: repeat(plan.big, plan.n), right: repeat(plan.small, Math.min(answer, 4)) },
    ),
    explain: [
      `${denom(plan.big).name} ${plan.n} ${classifier(plan.big)} = ${formatBS(total)}`,
      each < 100
        ? `${formatBS(total)} = ${commas(total)} สตางค์ → ${commas(total)} ÷ ${each} = ${answer}`
        : `${commas(total / 100)} ÷ ${each / 100} = ${answer}`,
      `ได้${denom(plan.small).name} ${answer} ${unit}`,
    ],
  }
}

/** กองไหนมีค่าเท่ากับเงินที่กำหนด */
export function generateEqualValueQuestion(d: Difficulty): ChoiceQ {
  const pool: DenomId[] = d === 1 ? ['b5', 'b10', 'b20'] : d === 2 ? ['b20', 'b50', 'b100'] : ['b100', 'b500', 'b1000']
  const target = pick(pool)
  const value = denom(target).value
  const right = distinctCombos(value, smallerThan(value), 3)
  const correct = pick(right)
  // ตัวลวง: มากไปหรือน้อยไป
  const smallest = smallerThan(value).slice(-1)[0]
  const wrong1 = decompose(value + denom(smallest === 's25' ? 'b1' : smallest).value, smallerThan(value), 40)!
  const wrong2 = decompose(value - denom(smallerThan(value).includes('b1') ? 'b1' : 's25').value, smallerThan(value), 40)!
  const piles = shuffle([correct, wrong1, wrong2])
  const options = piles.map((pile, i) => ({ id: `p${i}`, label: `แบบที่ ${i + 1}`, money: pile }))
  const answer = options[piles.indexOf(correct)].id

  return {
    id: uid(),
    gen: 'equalValue',
    kind: 'choice',
    skill: 'exchange',
    difficulty: d,
    title: `แบบไหนมีค่าเท่ากับ${denom(target).name}?`,
    visual: { type: 'money', items: [target] },
    layout: 'list',
    options,
    answer,
    npc: 'rabbit',
    hint: hint(
      `รวมเงินแต่ละแบบ แล้วดูว่าแบบไหนได้ ${formatBS(value)} พอดี`,
      'เงินที่ต้องการ',
      [`แบบที่ 1 รวมได้ ${formatBS(sumDenoms(piles[0]))}`],
      { type: 'big', text: formatBS(value) },
    ),
    explain: piles.map(
      (pile, i) => `แบบที่ ${i + 1}: ${formatBS(sumDenoms(pile))}${pile === correct ? ' = ' + denom(target).name + ' ✔' : ''}`,
    ),
  }
}

function makerTarget(d: Difficulty): number {
  if (d === 1) return toSatang(pick([5, 10, 20]))
  if (d === 2) return toSatang(pick([20, 50, 100]))
  return pick([toSatang(100), toSatang(150), toSatang(500), toSatang(75, 50), toSatang(35, 50)])
}

/** MONEY MAKER: สร้างจำนวนเงินเดียวกันให้ได้หลายแบบ */
export function generateMoneyMakerQuestion(d: Difficulty): PayQ {
  const target = makerTarget(d)
  const ways = d === 1 ? 2 : 3
  const tray = ALL_DENOM_IDS.filter((id) => denom(id).value <= target && (d > 1 || denom(id).value >= 100))
  const samples = distinctCombos(target, tray, ways)
  if (samples.length < ways) throw new Error(`MONEY MAKER หาได้แค่ ${samples.length} แบบ`)

  return {
    id: uid(),
    gen: 'moneyMaker',
    kind: 'pay',
    mode: 'make',
    skill: 'exchange',
    difficulty: d,
    title: `สร้างเงิน ${formatBS(target)} ให้ได้ ${ways} แบบที่ไม่ซ้ำกัน`,
    target,
    tray,
    ways,
    sample: samples,
    npc: 'rabbit',
    hint: hint(
      'แบบแรกลองใช้เงินชิ้นใหญ่ แบบต่อไปลองแตกเป็นชิ้นเล็กลง',
      'ตัวอย่างหนึ่งแบบ',
      [`แบบที่ 1 เช่น ${describeDenoms(samples[0])}`],
      { type: 'money', items: samples[0] },
    ),
    explain: [
      `${formatBS(target)} แสดงได้หลายแบบ เช่น`,
      ...samples.map((combo, i) => `แบบที่ ${i + 1}: ${describeDenoms(combo)}`),
      'จำนวนเงินเท่ากัน แม้ใช้เงินต่างชนิดกัน',
    ],
  }
}

/** สร้างจำนวนเงินตามเงื่อนไข เช่น ห้ามใช้ธนบัตร 20 บาท */
export function generateRuleMakerQuestion(d: Difficulty): PayQ {
  const target = makerTarget(d)
  const tray = ALL_DENOM_IDS.filter((id) => denom(id).value <= target && (d > 1 || denom(id).value >= 100))
  const sorted = tray.slice().sort((a, b) => denom(b).value - denom(a).value)
  const useMin = pick([true, false])
  let rule: PayQ['rule']
  let samples: DenomId[][]

  if (useMin) {
    const minPieces = d === 1 ? 3 : d === 2 ? 4 : 5
    // หาแบบที่ใช้อย่างน้อย minPieces ชิ้น โดยตัดเงินชิ้นใหญ่ออกไปเรื่อย ๆ
    samples = distinctCombos(target, tray, tray.length).filter((c) => c.length >= minPieces).slice(0, 1)
    rule = { minPieces, label: `ใช้เงินอย่างน้อย ${minPieces} ชิ้น` }
  } else {
    const banned = sorted[0]
    samples = distinctCombos(target, tray, 1, [banned])
    rule = { exclude: [banned], label: `ห้ามใช้${denom(banned).name}` }
  }
  if (samples.length === 0) throw new Error('ไม่มีคำตอบตามเงื่อนไข')

  return {
    id: uid(),
    gen: 'ruleMaker',
    kind: 'pay',
    mode: 'make',
    skill: 'exchange',
    difficulty: d,
    title: `สร้างเงิน ${formatBS(target)} (${rule.label})`,
    target,
    tray,
    ways: 1,
    rule,
    sample: samples,
    npc: 'rabbit',
    hint: hint(
      `อ่านเงื่อนไขให้ดี: ${rule.label}`,
      'ตัวอย่างเงินที่ใช้ได้',
      [`ลองเริ่มจาก${denom(samples[0][0]).name}`],
      { type: 'money', items: samples[0].slice(0, 2) },
    ),
    explain: [`ตัวอย่างคำตอบ: ${describeDenoms(samples[0])} = ${formatBS(target)}`, `ตรงตามเงื่อนไข: ${rule.label} ✔`],
  }
}

/** ข้อใด "ไม่" เท่ากับจำนวนเงินที่กำหนด */
export function generateNotEqualQuestion(d: Difficulty): ChoiceQ {
  const target = makerTarget(d)
  const tray = ALL_DENOM_IDS.filter((id) => denom(id).value <= target)
  const equal = distinctCombos(target, tray, 3)
  if (equal.length < 3) throw new Error('หาแบบที่เท่ากันไม่ครบ')
  const offBy = target >= toSatang(10) ? toSatang(pick([1, 2, 5])) : 50
  const wrong = decompose(target + (pick([true, false]) ? offBy : -offBy), tray, 40)!
  const piles = shuffle([...equal, wrong])
  const options = piles.map((pile, i) => ({ id: `p${i}`, label: `แบบที่ ${i + 1}`, money: pile }))
  const answer = options[piles.indexOf(wrong)].id

  return {
    id: uid(),
    gen: 'notEqual',
    kind: 'choice',
    skill: 'exchange',
    difficulty: d,
    title: `แบบไหน "ไม่" เท่ากับ ${formatBS(target)}?`,
    layout: 'list',
    options,
    answer,
    npc: 'rabbit',
    hint: hint(
      'รวมเงินทีละแบบ แบบที่รวมได้ไม่เท่าคือคำตอบ',
      'จำนวนเงินเป้าหมาย',
      [`แบบที่ 1 รวมได้ ${formatBS(sumDenoms(piles[0]))}`],
      { type: 'big', text: formatBS(target) },
    ),
    explain: piles.map((pile, i) => `แบบที่ ${i + 1}: ${formatBS(sumDenoms(pile))}${pile === wrong ? ' ✘ ไม่เท่า' : ' ✔'}`),
  }
}
