import type { AmountQ, ChoiceQ, DenomId, LedgerRow, NpcId, Question } from '../engine/types'
import { ALL_DENOM_IDS, decompose, denom, sumDenoms } from '../data/denominations'
import { productsOf, THAI_MONTHS } from '../data/products'
import { formatBS, formatDot, toSatang } from '../utils/money'
import { int, pick, shuffle, uid } from '../utils/random'
import { explainDiv, explainMul, hint } from './common'
import { explainCount } from './counting'
import { explainCompare } from './compare'
import { generateExchangeCountQuestion } from './exchange'
import { generateShopQuestion, priceOf } from './arithmetic'
import { generateIncomeExpenseQuestion, generateLedgerQuestion, thaiYear } from './ledger'

/**
 * FINAL MONEY MASTER: สถานการณ์จำลอง 1 วันเต็ม
 * 🏦 ธนาคาร → 🛒 ตลาด → 🍱 ร้านอาหาร → 📚 ร้านเครื่องเขียน → 🏪 ร้านค้า → 🏠 บ้าน
 *
 * เงินในกระเป๋าเปลี่ยนตามเหตุการณ์จริงของวัน
 * ร้านเครื่องเขียนให้เด็กเลือกของเอง ยอดเงินหลังจากนั้นจึงคำนวณตอนเล่น
 * สมุดบัญชีที่บ้านสร้างจากเหตุการณ์ทั้งวันที่เกิดขึ้นจริง
 */

export interface JourneyEvent {
  item: string
  type: 'in' | 'out'
  amount: number
}

export interface JourneyStation {
  id: string
  icon: string
  name: string
  npc: NpcId
  intro: string
  questions: Question[]
  /** เหตุการณ์เงินเข้า–ออกที่ทราบล่วงหน้า */
  events: JourneyEvent[]
  /** สถานีนี้มีร้านค้าที่เด็กเลือกของเอง */
  shop?: boolean
}

export const JOURNEY_START_POCKET = toSatang(20)

export function buildJourney(): JourneyStation[] {
  /* 🏦 ธนาคาร: นับเงินที่ถอน + แลกเงิน */
  const withdrawPile: DenomId[] = shuffle(['b100', 'b100', 'b100', pick(['b100', 'b50'] as DenomId[]), 'b20', 'b20', 'b10'])
  const withdraw = sumDenoms(withdrawPile)
  const bankCount: AmountQ = {
    id: uid(),
    gen: 'countMoney',
    kind: 'amount',
    input: 'bs',
    skill: 'count',
    difficulty: 2,
    title: 'พนักงานธนาคารให้เงินมา นับดูว่าได้เงินเท่าไร?',
    visual: { type: 'money', items: withdrawPile },
    answer: withdraw,
    npc: 'rabbit',
    hint: hint(
      'นับธนบัตรใบละ 100 ก่อน แล้วนับใบที่เล็กลง',
      'เรียงจากมากไปน้อย',
      explainCount(withdrawPile).slice(0, 2),
      { type: 'money', items: withdrawPile.slice().sort((a, b) => denom(b).value - denom(a).value) },
    ),
    explain: explainCount(withdrawPile),
  }
  const bankExchange = generateExchangeCountQuestion(1)

  /* 🛒 ตลาด: เปรียบเทียบราคา + อ่านป้ายราคาแบบจุด */
  const fruit = pick(productsOf('market'))
  const baseBaht = int(Math.max(fruit.min, 8), fruit.max)
  const [pa, pb] = shuffle([toSatang(baseBaht, 25), toSatang(baseBaht, 50)])
  const cheaper = Math.min(pa, pb)
  const marketCompare: ChoiceQ = {
    id: uid(),
    gen: 'compare',
    kind: 'choice',
    skill: 'compare',
    difficulty: 2,
    title: `${fruit.emoji} ${fruit.name}ร้านไหนถูกกว่า?`,
    layout: 'list',
    options: [
      { id: 'a', label: `ร้านป้าแดง ${formatDot(pa)}` },
      { id: 'b', label: `ร้านลุงดำ ${formatDot(pb)}` },
    ],
    answer: pa < pb ? 'a' : 'b',
    npc: 'bear',
    hint: hint(
      'บาทเท่ากัน ให้ดูสตางค์หลังจุด',
      'แยกบาทกับสตางค์',
      [`${formatDot(pa)} = ${formatBS(pa)}`],
      { type: 'pair', a: pa, b: pb, aLabel: formatDot(pa), bLabel: formatDot(pb) },
    ),
    explain: explainCompare(pa, pb, 'ร้านป้าแดง', 'ร้านลุงดำ').concat([`ร้านที่ถูกกว่าขาย ${formatBS(cheaper)}`]),
  }
  const marketRead: AmountQ = {
    id: uid(),
    gen: 'dotRead',
    kind: 'amount',
    input: 'bs',
    skill: 'dot',
    difficulty: 2,
    title: 'ป้ายราคานี้คือกี่บาทกี่สตางค์?',
    visual: { type: 'big', text: formatDot(cheaper), sub: `ราคา${fruit.name}ร้านที่ถูกกว่า` },
    answer: cheaper,
    npc: 'bear',
    hint: hint('หน้าจุดคือบาท หลังจุดคือสตางค์', 'แยกหน้าจุดกับหลังจุด', [`หน้าจุดคือ ${formatBS(toSatang(baseBaht))}`], {
      type: 'split',
      value: cheaper,
    }),
    explain: [`${formatDot(cheaper)} = ${formatBS(cheaper)}`],
  }

  /* 🍱 ร้านอาหาร: คูณ + หาร */
  const dish = pick(productsOf('food'))
  const dishPrice = toSatang(int(dish.min, dish.max))
  const people = 4
  const foodTotal = dishPrice * people
  const myShare = foodTotal / 2
  const foodMul: AmountQ = {
    id: uid(),
    gen: 'multiply',
    kind: 'amount',
    input: 'bs',
    skill: 'muldiv',
    difficulty: 2,
    title: `ซื้อ${dish.name}ให้ครอบครัว ${people} จาน ราคารวมเท่าไร?`,
    story: `${dish.emoji} ${dish.name} จานละ ${formatBS(dishPrice)}`,
    visual: { type: 'calc', rows: [{ value: dishPrice }, { value: people, op: '×', plain: true }], hideResult: true },
    answer: foodTotal,
    npc: 'bear',
    hint: hint('ราคาต่อจาน × จำนวนจาน', 'คูณบาท', explainMul(dishPrice, people).slice(0, 2)),
    explain: explainMul(dishPrice, people),
  }
  const foodDiv: AmountQ = {
    id: uid(),
    gen: 'divide',
    kind: 'amount',
    input: 'bs',
    skill: 'muldiv',
    difficulty: 2,
    title: 'พี่ช่วยจ่ายครึ่งหนึ่ง เราต้องจ่ายเท่าไร?',
    story: `ค่าอาหารรวม ${formatBS(foodTotal)} แบ่งจ่ายกับพี่ 2 คนเท่า ๆ กัน`,
    visual: { type: 'calc', rows: [{ value: foodTotal }, { value: 2, op: '÷', plain: true }], hideResult: true },
    answer: myShare,
    npc: 'bear',
    hint: hint('แบ่ง 2 ส่วนเท่า ๆ กัน ใช้การหาร', 'หารบาทก่อน', explainDiv(foodTotal, 2).slice(0, 2)),
    explain: explainDiv(foodTotal, 2),
  }

  /* 📚 ร้านเครื่องเขียน: เลือกซื้อเอง */
  const pocketAtStationery = JOURNEY_START_POCKET + withdraw - cheaper - myShare
  const stationeryShop = generateShopQuestion(2)
  stationeryShop.products = productsOf('stationery')
    .slice(0, 6)
    .map((p) => ({ id: p.id, name: p.name, emoji: p.emoji, price: priceOf(p, 2, 60) }))
  stationeryShop.budget = pocketAtStationery
  stationeryShop.story = `ในกระเป๋ามีเงิน ${formatBS(pocketAtStationery)}`
  stationeryShop.title = 'เลือกซื้อเครื่องเขียน 2 ชิ้น แล้วหาเงินรวมและเงินที่เหลือ'
  stationeryShop.npc = 'fox'

  /* 🏪 ร้านค้า: จ่ายเงินพอดี */
  const drink = pick(productsOf('super').filter((p) => p.max <= 30))
  const drinkPrice = toSatang(int(drink.min, drink.max), pick([0, 50]))
  const tray = ALL_DENOM_IDS.filter((id) => denom(id).value <= drinkPrice)
  const exact = decompose(drinkPrice, tray)!
  const storePay: Question = {
    id: uid(),
    gen: 'pay',
    kind: 'pay',
    mode: 'pay',
    skill: 'notes',
    difficulty: 2,
    title: `จ่ายค่า${drink.name}ให้พอดี ${formatBS(drinkPrice)}`,
    story: `${drink.emoji} ${drink.name} ราคา ${formatBS(drinkPrice)}`,
    target: drinkPrice,
    tray,
    sample: [exact],
    product: { name: drink.name, emoji: drink.emoji },
    npc: 'bear',
    hint: hint('เลือกเงินชิ้นใหญ่ที่ไม่เกินราคาก่อน', 'ตัวอย่างเงินชิ้นแรก', [`เริ่มจาก${denom(exact[0]).name}`], {
      type: 'money',
      items: exact.slice(0, 1),
    }),
    explain: [`ราคา ${formatBS(drinkPrice)} จ่ายได้ เช่น ${exact.map((id) => denom(id).name).join(' + ')}`],
  }

  return [
    {
      id: 'bank',
      icon: '🏦',
      name: 'ธนาคาร',
      npc: 'rabbit',
      intro: 'เช้านี้ไปถอนเงินค่าขนมที่ธนาคาร',
      questions: [bankCount, bankExchange],
      events: [{ item: 'ถอนเงินจากธนาคาร', type: 'in', amount: withdraw }],
    },
    {
      id: 'market',
      icon: '🛒',
      name: 'ตลาด',
      npc: 'bear',
      intro: `ไปตลาดซื้อ${fruit.name} เลือกร้านที่ถูกกว่า`,
      questions: [marketCompare, marketRead],
      events: [{ item: `ซื้อ${fruit.name}`, type: 'out', amount: cheaper }],
    },
    {
      id: 'food',
      icon: '🍱',
      name: 'ร้านอาหาร',
      npc: 'bear',
      intro: 'ถึงเวลากลางวัน ซื้ออาหารให้ครอบครัว',
      questions: [foodMul, foodDiv],
      events: [{ item: `ค่า${dish.name} (ครึ่งหนึ่ง)`, type: 'out', amount: myShare }],
    },
    {
      id: 'stationery',
      icon: '📚',
      name: 'ร้านเครื่องเขียน',
      npc: 'fox',
      intro: 'ซื้อเครื่องเขียนไปโรงเรียน',
      questions: [stationeryShop],
      events: [],
      shop: true,
    },
    {
      id: 'store',
      icon: '🏪',
      name: 'ร้านค้า',
      npc: 'bear',
      intro: 'แวะซื้อเครื่องดื่มก่อนกลับบ้าน',
      questions: [storePay],
      events: [{ item: `ซื้อ${drink.name}`, type: 'out', amount: drinkPrice }],
    },
    {
      id: 'home',
      icon: '🏠',
      name: 'บ้าน',
      npc: 'owl',
      intro: 'กลับถึงบ้าน มาบันทึกรายรับรายจ่ายของวันนี้กัน',
      questions: [],
      events: [],
    },
  ]
}

/** สมุดบัญชีที่บ้าน สร้างจากเหตุการณ์ทั้งวัน */
export function buildHomeQuestions(events: JourneyEvent[]): Question[] {
  const today = new Date()
  const rows: LedgerRow[] = events.map((e) => ({
    day: today.getDate(),
    month: THAI_MONTHS[today.getMonth()],
    year: thaiYear(),
    item: e.item,
    type: e.type,
    amount: e.amount,
  }))
  const sheet = { owner: 'MONEY HERO', start: JOURNEY_START_POCKET, rows }
  const fill = generateLedgerQuestion(2, sheet)
  fill.title = 'บันทึกรายรับรายจ่ายของวันนี้'
  return [
    fill,
    generateIncomeExpenseQuestion(2, sheet, 'out'),
    generateIncomeExpenseQuestion(2, sheet, 'balance'),
  ]
}

/** เงินในกระเป๋าหลังเหตุการณ์ทั้งหมด */
export function walletAfter(events: JourneyEvent[]): number {
  return events.reduce((sum, e) => sum + (e.type === 'in' ? e.amount : -e.amount), JOURNEY_START_POCKET)
}
