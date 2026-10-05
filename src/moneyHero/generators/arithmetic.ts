import type { AmountQ, Difficulty, ProductItem, ShopQ } from '../engine/types'
import { PRODUCTS, productsOf, type ProductDef } from '../data/products'
import { formatBS, splitSatang, toSatang } from '../utils/money'
import { int, pick, sample, uid } from '../utils/random'
import { explainAdd, explainDiv, explainMul, explainSub, hint, randomSatangPart } from './common'

/**
 * ด่าน 7: บวก–ลบ (SUPERMARKET)
 * ด่าน 8: คูณ–หาร (FACTORY MONEY)
 */

export function priceOf(p: ProductDef, d: Difficulty, maxBaht?: number): number {
  const hi = Math.max(p.min, Math.min(p.max, maxBaht ?? p.max))
  const baht = int(p.min, hi)
  const satang = p.satang && d > 1 ? randomSatangPart(d) : p.satang && d === 1 ? pick([0, 0, 50]) : 0
  return toSatang(baht, satang)
}

function cheapProducts(d: Difficulty): ProductDef[] {
  const cap = d === 1 ? 60 : d === 2 ? 400 : 5000
  return PRODUCTS.filter((p) => p.min <= cap)
}

/** บวกจำนวนเงิน */
export function generateAddMoneyQuestion(d: Difficulty): AmountQ {
  const n = d === 3 && pick([true, false]) ? 3 : 2
  const items = sample(cheapProducts(d), n)
  let prices = items.map((p) => priceOf(p, d, d === 1 ? 60 : undefined))
  if (d === 1) {
    // ระดับง่าย: สตางค์รวมไม่เกิน 99 จะได้ไม่ต้องทด
    let satangSum = 0
    prices = prices.map((v) => {
      const { baht, satang } = splitSatang(v)
      const keep = satangSum + satang < 100 ? satang : 0
      satangSum += keep
      return toSatang(baht, keep)
    })
  }
  const total = prices.reduce((s, v) => s + v, 0)
  const lines = items.map((p, i) => `${p.emoji} ${p.name} ${formatBS(prices[i])}`)

  return {
    id: uid(),
    gen: 'add',
    kind: 'amount',
    input: 'bs',
    skill: 'addsub',
    difficulty: d,
    title: `ซื้อ${items.map((p) => p.name).join(' และ ')} รวมเป็นเงินเท่าไร?`,
    story: lines.join('   '),
    visual: { type: 'calc', rows: prices.map((value, i) => ({ value, op: i === 0 ? undefined : '+' })), hideResult: true },
    answer: total,
    npc: 'bear',
    hint: hint(
      'บวกสตางค์กับสตางค์ก่อน แล้วบวกบาทกับบาท ถ้าสตางค์ครบ 100 ให้ทดเป็น 1 บาท',
      'ตั้งบาทตรงบาท สตางค์ตรงสตางค์',
      explainAdd(prices).slice(0, 2),
      { type: 'calc', rows: prices.map((value, i) => ({ value, op: i === 0 ? undefined : '+' })), hideResult: true },
    ),
    explain: explainAdd(prices),
  }
}

/** ลบจำนวนเงิน: มีเงินอยู่ ซื้อของแล้วเหลือเท่าไร */
export function generateSubtractMoneyQuestion(d: Difficulty): AmountQ {
  const product = pick(cheapProducts(d))
  let price = priceOf(product, d, d === 1 ? 60 : undefined)
  const P = splitSatang(price)
  let have: number
  if (d === 1) {
    // ไม่ต้องยืม: สตางค์ของเงินที่มี >= สตางค์ของราคา
    have = toSatang(P.baht + int(5, 40), P.satang === 50 ? 50 : pick([0, 50]))
  } else if (d === 2) {
    // ต้องยืมสตางค์
    const haveSatang = P.satang === 0 ? 0 : pick([0, 25, 50, 75].filter((s) => s < P.satang).concat([0]))
    have = toSatang(P.baht + int(10, 200), haveSatang)
    if (P.satang === 0) price = toSatang(P.baht, pick([25, 50, 75]))
  } else {
    // จำนวนเต็มร้อย ลบราคาที่มีสตางค์ (ยืมข้ามหลัก)
    if (P.satang === 0) price = toSatang(P.baht, pick([25, 50, 75]))
    const hundreds = Math.ceil((splitSatang(price).baht + 1) / 100) * 100
    have = toSatang(hundreds + pick([0, 100, 500]))
  }
  if (have <= price) have = price + toSatang(int(5, 50))
  const left = have - price

  return {
    id: uid(),
    gen: 'subtract',
    kind: 'amount',
    input: 'bs',
    skill: 'addsub',
    difficulty: d,
    title: 'เหลือเงินเท่าไร?',
    story: `มีเงิน ${formatBS(have)} ซื้อ${product.emoji} ${product.name}ราคา ${formatBS(price)}`,
    visual: { type: 'calc', rows: [{ value: have }, { value: price, op: '-' }], hideResult: true },
    answer: left,
    npc: 'bear',
    hint: hint(
      'ลบสตางค์ก่อน ถ้าสตางค์ไม่พอให้ยืม 1 บาท มาเป็น 100 สตางค์',
      'ตั้งลบ บาทตรงบาท สตางค์ตรงสตางค์',
      explainSub(have, price).slice(0, 2),
      { type: 'calc', rows: [{ value: have }, { value: price, op: '-' }], hideResult: true },
    ),
    explain: explainSub(have, price),
  }
}

function shelf(d: Difficulty, count: number): ProductItem[] {
  const source = d === 1 ? productsOf('super').concat(productsOf('market')) : cheapProducts(d)
  return sample(
    source.filter((p) => p.max <= (d === 1 ? 45 : d === 2 ? 120 : 400)),
    count,
  ).map((p) => ({ id: p.id, name: p.name, emoji: p.emoji, price: priceOf(p, d) }))
}

/** SUPERMARKET: เลือกของเอง แล้วคิดเงินรวม (และเงินทอน) */
export function generateShopQuestion(d: Difficulty): ShopQ {
  const products = shelf(d, 6)
  const pick2 = d === 3 ? 3 : 2
  const withBudget = d >= 2
  const mostExpensive = products
    .map((p) => p.price)
    .sort((a, b) => b - a)
    .slice(0, pick2)
    .reduce((s, v) => s + v, 0)
  // งบเป็นจำนวนเต็มที่สวย ๆ และพอซื้อทุกแบบ
  const step = d === 2 ? toSatang(50) : toSatang(100)
  const budget = withBudget ? Math.ceil((mostExpensive + 1) / step) * step : undefined

  return {
    id: uid(),
    gen: 'shop',
    kind: 'shop',
    skill: 'addsub',
    difficulty: d,
    title: budget
      ? `เลือกซื้อของ ${pick2} ชิ้น แล้วหาเงินรวมและเงินที่เหลือ`
      : `เลือกซื้อของ ${pick2} ชิ้น แล้วหาเงินรวม`,
    story: budget ? `มีเงิน ${formatBS(budget)}` : undefined,
    products,
    pick: pick2,
    budget,
    npc: 'bear',
    hint: hint(
      'บวกราคาของที่เลือก แยกบาทกับสตางค์ ถ้ามีเงินอยู่ ให้นำไปลบเงินรวม',
      'ราคาของบนชั้น',
      ['ขั้นที่ 1 บวกราคาของทุกชิ้นที่เลือก', 'ขั้นที่ 2 เงินที่มี − เงินรวม = เงินเหลือ'],
      { type: 'products', items: products },
    ),
    explain: ['บวกราคาของที่เลือก', 'แล้วนำเงินที่มีลบเงินรวม'],
  }
}

/** คูณจำนวนเงิน: ซื้อของชนิดเดียวกันหลายชิ้น */
export function generateMultiplyMoneyQuestion(d: Difficulty): AmountQ {
  const product = pick(PRODUCTS.filter((p) => p.max <= (d === 1 ? 50 : d === 2 ? 99 : 300)))
  const n = d === 1 ? int(2, 5) : d === 2 ? int(2, 6) : int(3, 9)
  let price = priceOf(product, d)
  if (d === 1) price = toSatang(splitSatang(price).baht)
  if (d >= 2 && splitSatang(price).satang === 0) price += pick([25, 50, 75])
  const total = price * n

  return {
    id: uid(),
    gen: 'multiply',
    kind: 'amount',
    input: 'bs',
    skill: 'muldiv',
    difficulty: d,
    title: `ซื้อ${product.name} ${n} ชิ้น ต้องจ่ายเงินเท่าไร?`,
    story: `${product.emoji} ${product.name} ชิ้นละ ${formatBS(price)}`,
    visual: { type: 'calc', rows: [{ value: price }, { value: n, op: '×', plain: true }], hideResult: true },
    answer: total,
    npc: 'bear',
    hint: hint(
      `ราคาต่อชิ้น × จำนวนชิ้น คูณบาทกับสตางค์แยกกัน`,
      `เหมือนบวกราคาเดิม ${n} ครั้ง`,
      explainMul(price, n).slice(0, 2),
      {
        type: 'bar',
        mode: 'equal',
        parts: Array.from({ length: n }, () => ({ label: formatBS(price), value: price })),
        total: { label: 'ราคารวม', unknown: true },
        count: n,
      },
    ),
    explain: explainMul(price, n),
  }
}

/** หารจำนวนเงิน: แบ่งเงินเท่า ๆ กัน */
export function generateDivideMoneyQuestion(d: Difficulty): AmountQ {
  const n = d === 1 ? int(2, 5) : d === 2 ? pick([2, 4]) : int(2, 6)
  let each: number
  if (d === 1) each = toSatang(int(5, 50))
  else if (d === 2) each = toSatang(int(20, 250), 50)
  else each = toSatang(int(20, 400), pick([25, 50, 75]))
  const total = each * n
  const scene = pick([
    { story: `แบ่งเงิน ${formatBS(total)} ให้เด็ก ${n} คน เท่า ๆ กัน`, ask: 'ได้คนละเท่าไร?' },
    { story: `เพื่อน ${n} คน กินอาหารรวม ${formatBS(total)} หารเท่า ๆ กัน`, ask: 'ต้องจ่ายคนละเท่าไร?' },
    { story: `ขนม ${n} ห่อ ราคารวม ${formatBS(total)}`, ask: 'ขนมราคาห่อละเท่าไร?' },
  ])

  return {
    id: uid(),
    gen: 'divide',
    kind: 'amount',
    input: 'bs',
    skill: 'muldiv',
    difficulty: d,
    title: scene.ask,
    story: scene.story,
    visual: { type: 'calc', rows: [{ value: total }, { value: n, op: '÷', plain: true }], hideResult: true },
    answer: each,
    npc: 'bear',
    hint: hint(
      'แบ่งบาทก่อน ถ้าเหลือเศษบาท ให้เปลี่ยนเป็นสตางค์ (1 บาท = 100 สตางค์) แล้วแบ่งต่อ',
      `แบ่งเป็น ${n} ส่วนเท่า ๆ กัน`,
      explainDiv(total, n).slice(0, 2),
      {
        type: 'bar',
        mode: 'equal',
        parts: Array.from({ length: n }, () => ({ label: '?', unknown: true })),
        total: { label: formatBS(total), value: total },
        count: n,
      },
    ),
    explain: explainDiv(total, n),
  }
}
