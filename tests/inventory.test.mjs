/**
 * ชุดทดสอบร้านค้า กระเป๋าของ และการสวมใส่
 *
 * ระบบนี้แตะ "เหรียญ" ซึ่งเป็นสิ่งที่เด็กใช้เวลาเก็บมานาน
 * บั๊กที่หักเหรียญแล้วของไม่เข้ากระเป๋า หรือสวมของใหม่แล้วของเก่าหาย
 * เป็นบั๊กที่เด็กเสียของจริงและกู้คืนไม่ได้ จึงต้องทดสอบให้ครบกว่าปกติ
 *
 * วิธีใช้
 *   npx tsc -p tsconfig.tests.json --outDir /tmp/logic
 *   node tests/inventory.test.mjs /tmp/logic
 */

import path from 'path'
import { createRequire } from 'module'

const OUT = process.argv[2]
if (!OUT) {
  console.error('ใช้: node tests/inventory.test.mjs <โฟลเดอร์ JS ที่คอมไพล์แล้ว>')
  process.exit(1)
}

const require = createRequire(import.meta.url)
const load = (name) => require(path.resolve(OUT, name + '.js'))

const INV = load('services/inventoryService')
const ITEMS = load('data/items')
const STORAGE = load('services/storage')
const UP = load('services/upgradeService')
const AV = load('services/avatarService')
const AVATARS = load('data/avatars')

let passed = 0
const failures = []

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

function check(name, fn) {
  try {
    fn()
    passed += 1
  } catch (error) {
    failures.push(`${name}: ${error.message}`)
  }
}

/** ผู้เล่นทดสอบ ปรับเหรียญกับเลเวลได้ตามต้องการ */
function makePlayer(overrides = {}) {
  return { ...STORAGE.createPlayer('เด็กทดสอบ', 'warrior'), ...overrides }
}

// ---------- ข้อมูลของ ----------

check('ของทุกชิ้นมีข้อมูลครบและราคาสมเหตุสมผล', () => {
  const ids = new Set()
  for (const item of ITEMS.ITEMS) {
    assert(!ids.has(item.id), `รหัสซ้ำ: ${item.id}`)
    ids.add(item.id)
    assert(item.name.length >= 3, `${item.id} ชื่อสั้นเกินไป`)
    assert(item.description.length >= 10, `${item.id} คำอธิบายสั้นเกินไป`)
    assert(item.price > 0, `${item.id} ราคาต้องมากกว่าศูนย์`)
    assert(typeof item.art === 'string' && item.art.length > 0, `${item.id} ไม่มีภาพ`)
    assert(
      ['common', 'rare', 'epic', 'legendary'].includes(item.rarity),
      `${item.id} ระดับความหายากไม่ถูกต้อง`,
    )
  }
})

check('ของทุกชิ้นต้องเพิ่มค่า ไม่มีชิ้นไหนลดค่าอะไรลง', () => {
  for (const item of ITEMS.ITEMS) {
    for (const [key, value] of Object.entries(item.stats)) {
      assert(value > 0, `${item.id} มีค่า ${key} = ${value} ซึ่งไม่เป็นบวก`)
    }
  }
})

check('ของใช้แล้วหมดต้องฟื้นพลัง ของสวมใส่ต้องไม่มี healAmount', () => {
  for (const item of ITEMS.ITEMS) {
    if (item.kind === 'consumable') {
      assert(item.healAmount > 0, `${item.id} เป็นของใช้แต่ไม่ได้ฟื้นพลัง`)
    } else {
      assert(!item.healAmount, `${item.id} เป็นของสวมใส่แต่มี healAmount`)
    }
  }
})

check('ของที่แพงกว่าต้องไม่อ่อนกว่าของถูกในช่องเดียวกัน', () => {
  for (const slot of INV.EQUIP_SLOTS) {
    const sorted = ITEMS.ITEMS.filter((item) => item.kind === slot).sort(
      (a, b) => a.price - b.price,
    )
    const power = (item) =>
      (item.stats.attack ?? 0) +
      (item.stats.defense ?? 0) +
      (item.stats.maxHp ?? 0) / 5 +
      (item.stats.expBonusPercent ?? 0) / 2 +
      (item.stats.coinBonusPercent ?? 0) / 2

    for (let i = 1; i < sorted.length; i += 1) {
      assert(
        power(sorted[i]) > power(sorted[i - 1]),
        `${sorted[i].id} แพงกว่า ${sorted[i - 1].id} แต่ไม่ได้แรงกว่า`,
      )
    }
  }
})

check('ของชิ้นแรกของทุกช่องต้องซื้อได้ตั้งแต่เลเวล 1', () => {
  for (const slot of INV.EQUIP_SLOTS) {
    const cheapest = ITEMS.ITEMS.filter((item) => item.kind === slot).sort(
      (a, b) => a.price - b.price,
    )[0]
    assert(cheapest, `ช่อง ${slot} ไม่มีของเลย`)
    // สัตว์เลี้ยงยอมให้ล็อกเลเวลต่ำ ๆ ได้ แต่ห้ามเกินเลเวล 2
    assert(
      (cheapest.requiredLevel ?? 1) <= 2,
      `${cheapest.id} เป็นของถูกสุดของช่อง ${slot} แต่ล็อกถึงเลเวล ${cheapest.requiredLevel}`,
    )
  }
})

// ---------- การซื้อ ----------

check('ซื้อของแล้วเหรียญต้องลดเท่าราคา และของเข้ากระเป๋าหนึ่งชิ้น', () => {
  const player = makePlayer({ coins: 500 })
  const item = ITEMS.getItem('w-pencil')
  const after = INV.buyItem(player, 'w-pencil')

  assert(after, 'ซื้อไม่สำเร็จทั้งที่เงินพอ')
  assert(after.coins === 500 - item.price, `เหรียญเหลือ ${after.coins} ไม่ตรงกับราคา`)
  assert(INV.countOf(after, 'w-pencil') === 1, 'ของไม่เข้ากระเป๋า')
  assert(player.coins === 500, 'ผู้เล่นเดิมถูกแก้ไข ทั้งที่ต้องคืนของใหม่')
})

check('เงินไม่พอต้องซื้อไม่ได้ และเหรียญต้องไม่ถูกหัก', () => {
  const player = makePlayer({ coins: 10 })
  assert(INV.buyItem(player, 'w-pencil') === null, 'เงินไม่พอแต่ซื้อได้')
  assert(player.coins === 10, 'เหรียญถูกหักทั้งที่ซื้อไม่สำเร็จ')
  const reason = INV.buyBlockedReason(player, 'w-pencil')
  assert(reason && reason.includes('ขาดอีก'), `เหตุผลไม่ชัดเจน: ${reason}`)
})

check('เลเวลไม่ถึงต้องซื้อไม่ได้ แม้เงินจะเหลือเฟือ', () => {
  const player = makePlayer({ coins: 999_999, level: 1 })
  assert(INV.buyItem(player, 'w-infinity') === null, 'เลเวลไม่ถึงแต่ซื้อได้')
  const reason = INV.buyBlockedReason(player, 'w-infinity')
  assert(reason && reason.includes('เลเวล'), `เหตุผลไม่ชัดเจน: ${reason}`)
})

check('ของสวมใส่ซื้อซ้ำไม่ได้ เพราะสวมได้ทีละชิ้น ซื้อซ้ำคือเสียเหรียญเปล่า', () => {
  let player = makePlayer({ coins: 5000 })
  player = INV.buyItem(player, 'w-pencil')
  assert(INV.buyItem(player, 'w-pencil') === null, 'ซื้อของสวมใส่ซ้ำได้')

  // แม้จะสวมไปแล้วก็ยังต้องซื้อซ้ำไม่ได้
  const equipped = INV.equipItem(player, 'w-pencil')
  assert(INV.buyItem(equipped, 'w-pencil') === null, 'สวมอยู่แล้วยังซื้อซ้ำได้')
})

check('ของใช้แล้วหมดซื้อซ้ำได้ และนับสะสมขึ้นเรื่อย ๆ', () => {
  let player = makePlayer({ coins: 5000 })
  for (let i = 0; i < 3; i += 1) {
    const next = INV.buyItem(player, 'u-potion')
    assert(next, `ซื้อยาครั้งที่ ${i + 1} ไม่สำเร็จ`)
    player = next
  }
  assert(INV.countOf(player, 'u-potion') === 3, 'จำนวนยาไม่ตรง')
})

check('ซื้อของที่ไม่มีอยู่จริงต้องไม่พัง', () => {
  const player = makePlayer({ coins: 5000 })
  assert(INV.buyItem(player, 'ของปลอม') === null, 'ซื้อของปลอมได้')
  assert(player.coins === 5000, 'เหรียญหายไปกับของปลอม')
})

// ---------- การสวมใส่ ----------

check('สวมของแล้วของต้องออกจากกระเป๋าไปอยู่ในช่อง', () => {
  let player = makePlayer({ coins: 5000 })
  player = INV.buyItem(player, 'w-pencil')
  const after = INV.equipItem(player, 'w-pencil')

  assert(after, 'สวมไม่สำเร็จ')
  assert(after.equipped.weapon === 'w-pencil', 'ของไม่เข้าช่องอาวุธ')
  assert(INV.countOf(after, 'w-pencil') === 0, 'ของยังค้างอยู่ในกระเป๋าด้วย')
})

check('สวมของใหม่ทับ ของเก่าต้องกลับเข้ากระเป๋า ไม่ใช่หายไป', () => {
  let player = makePlayer({ coins: 9999, level: 20 })
  player = INV.buyItem(player, 'w-pencil')
  player = INV.buyItem(player, 'w-ruler')
  player = INV.equipItem(player, 'w-pencil')
  player = INV.equipItem(player, 'w-ruler')

  assert(player.equipped.weapon === 'w-ruler', 'ของใหม่ไม่ได้สวม')
  assert(INV.countOf(player, 'w-pencil') === 1, 'ของเก่าหายไปแทนที่จะกลับเข้ากระเป๋า')
})

check('สวมของที่ไม่มีในกระเป๋าไม่ได้', () => {
  const player = makePlayer()
  assert(INV.equipItem(player, 'w-pencil') === null, 'สวมของที่ไม่มีได้')
})

check('สวมของใช้แล้วหมดไม่ได้', () => {
  let player = makePlayer({ coins: 5000 })
  player = INV.buyItem(player, 'u-potion')
  assert(INV.equipItem(player, 'u-potion') === null, 'สวมยาได้')
})

check('ถอดของแล้วต้องกลับเข้ากระเป๋าครบ', () => {
  let player = makePlayer({ coins: 5000 })
  player = INV.buyItem(player, 'a-notebook')
  player = INV.equipItem(player, 'a-notebook')
  const after = INV.unequipSlot(player, 'armor')

  assert(after, 'ถอดไม่สำเร็จ')
  assert(!after.equipped.armor, 'ยังสวมอยู่')
  assert(INV.countOf(after, 'a-notebook') === 1, 'ของไม่กลับเข้ากระเป๋า')
})

check('ถอดช่องที่ว่างอยู่ต้องไม่พังและไม่สร้างของขึ้นมาเอง', () => {
  const player = makePlayer()
  assert(INV.unequipSlot(player, 'weapon') === null, 'ถอดช่องว่างแล้วได้ผลลัพธ์')
})

check('สวมแล้วถอดวนหลายรอบ ของต้องไม่เพิ่มขึ้นเอง', () => {
  let player = makePlayer({ coins: 5000 })
  player = INV.buyItem(player, 'w-pencil')

  for (let i = 0; i < 20; i += 1) {
    player = INV.equipItem(player, 'w-pencil')
    player = INV.unequipSlot(player, 'weapon')
  }
  assert(
    INV.countOf(player, 'w-pencil') === 1,
    `สวมถอด 20 รอบแล้วมีของ ${INV.countOf(player, 'w-pencil')} ชิ้น`,
  )
})

// ---------- ค่าที่ได้จากของ ----------

check('ไม่สวมอะไรเลย ค่าทุกอย่างต้องเป็นศูนย์', () => {
  const stats = INV.totalStats(makePlayer())
  for (const [key, value] of Object.entries(stats)) {
    assert(value === 0, `ไม่ได้สวมอะไรแต่ ${key} = ${value}`)
  }
})

check('ค่าจากของหลายช่องต้องรวมกันถูกต้อง', () => {
  let player = makePlayer({ coins: 99_999, level: 20 })
  player = INV.buyItem(player, 'w-pencil')
  player = INV.buyItem(player, 'a-notebook')
  player = INV.equipItem(player, 'w-pencil')
  player = INV.equipItem(player, 'a-notebook')

  const stats = INV.totalStats(player)
  assert(stats.attack === 3, `พลังโจมตี ${stats.attack} ไม่ตรง`)
  assert(stats.defense === 2, `พลังป้องกัน ${stats.defense} ไม่ตรง`)
  assert(stats.maxHp === 10, `พลังชีวิต ${stats.maxHp} ไม่ตรง`)
})

check('พลังชีวิตสูงสุดต้องลดกลับเมื่อถอดเกราะ ไม่พองขึ้นเรื่อย ๆ', () => {
  let player = makePlayer({ coins: 99_999 })
  const base = INV.effectiveMaxHp(player)

  player = INV.buyItem(player, 'a-notebook')

  // สวมแล้วถอดสิบรอบ ถ้าบวกสะสมจะเห็นชัดมาก
  for (let i = 0; i < 10; i += 1) {
    player = INV.equipItem(player, 'a-notebook')
    assert(
      INV.effectiveMaxHp(player) === base + 10,
      `รอบที่ ${i + 1} สวมแล้วได้ ${INV.effectiveMaxHp(player)} ควรเป็น ${base + 10}`,
    )
    player = INV.unequipSlot(player, 'armor')
    assert(
      INV.effectiveMaxHp(player) === base,
      `รอบที่ ${i + 1} ถอดแล้วได้ ${INV.effectiveMaxHp(player)} ควรกลับเป็น ${base}`,
    )
  }
})

check('โบนัสร้อยละต้องปัดลง และไม่ทำให้ค่าศูนย์กลายเป็นบวก', () => {
  assert(INV.applyBonusPercent(100, 10) === 110, 'คิดโบนัส 10% ผิด')
  assert(INV.applyBonusPercent(10, 15) === 11, 'ไม่ได้ปัดลง')
  assert(INV.applyBonusPercent(0, 50) === 0, 'ค่าศูนย์กลับได้โบนัส')
  assert(INV.applyBonusPercent(5, 0) === 5, 'ไม่มีโบนัสแต่ค่าเปลี่ยน')
  assert(INV.applyBonusPercent(5, -20) === 5, 'โบนัสติดลบกลับลดรางวัล')
})

check('พลังโจมตีและป้องกันที่รวมของแล้วต้องบวกจากค่าพื้นฐาน', () => {
  let player = makePlayer({ coins: 99_999 })
  player = INV.buyItem(player, 'w-pencil')
  player = INV.equipItem(player, 'w-pencil')

  assert(INV.attackWithGear(player, 10) === 13, 'พลังโจมตีไม่รวมอาวุธ')
  assert(INV.defenseWithGear(player, 4) === 4, 'ไม่ได้สวมเกราะแต่พลังป้องกันเปลี่ยน')
})

// ---------- ของใช้แล้วหมด ----------

check('ใช้ยาแล้วพลังชีวิตต้องเพิ่ม และยาต้องหายไปหนึ่งขวด', () => {
  let player = makePlayer({ coins: 5000, hp: 20 })
  player = INV.buyItem(player, 'u-potion')
  const after = INV.useConsumable(player, 'u-potion', 100)

  assert(after, 'ใช้ยาไม่สำเร็จ')
  assert(after.hp === 50, `พลังชีวิต ${after.hp} ไม่ตรง`)
  assert(INV.countOf(after, 'u-potion') === 0, 'ยาไม่ได้หายไป')
})

check('ใช้ยาแล้วพลังชีวิตต้องไม่เกินค่าสูงสุด', () => {
  let player = makePlayer({ coins: 5000, hp: 90 })
  player = INV.buyItem(player, 'u-potion')
  const after = INV.useConsumable(player, 'u-potion', 100)
  assert(after.hp === 100, `พลังชีวิตล้นเป็น ${after.hp}`)
})

check('พลังชีวิตเต็มแล้วต้องใช้ยาไม่ได้ เพื่อไม่ให้เด็กเสียของฟรี', () => {
  let player = makePlayer({ coins: 5000, hp: 100 })
  player = INV.buyItem(player, 'u-potion')
  assert(INV.useConsumable(player, 'u-potion', 100) === null, 'เลือดเต็มแต่ใช้ยาได้')
  assert(INV.countOf(player, 'u-potion') === 1, 'ยาหายไปทั้งที่ใช้ไม่สำเร็จ')
})

check('ใช้ยาที่ไม่มีในกระเป๋าไม่ได้', () => {
  const player = makePlayer({ hp: 10 })
  assert(INV.useConsumable(player, 'u-potion', 100) === null, 'ใช้ยาที่ไม่มีได้')
})

// ---------- การบันทึกและอ่านกลับ ----------

check('ผู้เล่นใหม่ต้องมีกระเป๋าว่างและไม่ได้สวมอะไร', () => {
  const player = STORAGE.createPlayer('เด็กใหม่', 'mage')
  assert(player.inventory && Object.keys(player.inventory).length === 0, 'กระเป๋าไม่ว่าง')
  assert(player.equipped && Object.keys(player.equipped).length === 0, 'สวมของมาตั้งแต่แรก')
})

/**
 * ที่เก็บข้อมูลจำลอง ใช้ทดสอบเส้นทางบันทึกและอ่านกลับของจริง
 *
 * ต้องผ่าน savePlayer/loadPlayer จริง ไม่ใช่ก๊อป object ด้วย JSON
 * เพราะจุดที่พังได้คือตัวอ่าน (parseInventory/parseEquipped)
 * ซึ่งการก๊อป object ไม่ได้เรียกเลย ทดสอบแบบนั้นจึงไม่ได้ทดสอบอะไร
 */
const PLAYER_KEY = 'math-adventure:player:v1'

function useFakeStorage() {
  const data = new Map()
  const store = {
    getItem: (key) => (data.has(key) ? data.get(key) : null),
    setItem: (key, value) => data.set(key, String(value)),
    removeItem: (key) => data.delete(key),
    clear: () => data.clear(),
  }
  // storage.ts อ่านผ่าน window.localStorage จึงต้องมี window ให้ด้วย
  globalThis.window = { localStorage: store }
  globalThis.localStorage = store
  return store
}

check('ของที่ซื้อไว้ต้องยังอยู่หลังบันทึกและอ่านกลับจริง', () => {
  useFakeStorage()

  let player = makePlayer({ coins: 9999, level: 20 })
  player = INV.buyItem(player, 'w-ruler')
  player = INV.equipItem(player, 'w-ruler')
  player = INV.buyItem(player, 'u-potion')

  assert(STORAGE.savePlayer(player), 'บันทึกไม่สำเร็จ')
  const result = STORAGE.loadPlayer()
  const restored = result.data ?? result.player ?? result.value
  assert(restored, `อ่านกลับไม่ได้: ${JSON.stringify(result).slice(0, 120)}`)

  assert(restored.equipped.weapon === 'w-ruler', 'ของที่สวมหายหลังอ่านกลับ')
  assert(restored.inventory['u-potion'] === 1, 'ของในกระเป๋าหายหลังอ่านกลับ')
})

check('แก้ไฟล์บันทึกให้สวมของผิดช่องต้องถูกปฏิเสธ', () => {
  useFakeStorage()

  const player = makePlayer({ coins: 100 })
  STORAGE.savePlayer(player)

  // เอาอาวุธไปยัดในช่องเกราะ ถ้ายอมรับ จะได้ค่าพลังซ้อนสองช่องจากของชิ้นเดียว
  const raw = JSON.parse(globalThis.localStorage.getItem(PLAYER_KEY))
  raw.player.equipped = { armor: 'w-pencil', weapon: 'a-notebook' }
  globalThis.localStorage.setItem(PLAYER_KEY, JSON.stringify(raw))

  const result = STORAGE.loadPlayer()
  const restored = result.data ?? result.player ?? result.value
  assert(restored, 'อ่านกลับไม่ได้')
  assert(!restored.equipped.armor, 'ยอมให้อาวุธอยู่ในช่องเกราะ')
  assert(!restored.equipped.weapon, 'ยอมให้เกราะอยู่ในช่องอาวุธ')
})

check('ของที่ไม่มีอยู่จริงในไฟล์บันทึกต้องถูกทิ้ง ไม่ทำให้หน้าจอพัง', () => {
  useFakeStorage()

  const player = makePlayer({ coins: 100 })
  STORAGE.savePlayer(player)

  const raw = JSON.parse(globalThis.localStorage.getItem(PLAYER_KEY))
  raw.player.inventory = { 'ของที่ถูกลบไปแล้ว': 5, 'u-potion': 2 }
  globalThis.localStorage.setItem(PLAYER_KEY, JSON.stringify(raw))

  const result = STORAGE.loadPlayer()
  const restored = result.data ?? result.player ?? result.value
  assert(restored, 'อ่านกลับไม่ได้')
  assert(!restored.inventory['ของที่ถูกลบไปแล้ว'], 'ของที่ไม่มีอยู่จริงยังอยู่')
  assert(restored.inventory['u-potion'] === 2, 'ของที่ถูกต้องหายไปด้วย')
})

check('ผู้เล่นเวอร์ชันเก่าที่ยังไม่มีระบบของ ต้องเปิดเกมได้และได้กระเป๋าว่าง', () => {
  useFakeStorage()

  const player = makePlayer({ coins: 300 })
  delete player.inventory
  delete player.equipped
  globalThis.localStorage.setItem(PLAYER_KEY, JSON.stringify({ version: 3, player }))

  const result = STORAGE.loadPlayer()
  const restored = result.data ?? result.player ?? result.value
  assert(restored, 'ผู้เล่นเวอร์ชันเก่าเปิดเกมไม่ได้')
  assert(restored.coins === 300, 'เหรียญเดิมหายไปตอนอัปเกรด')
  assert(
    restored.inventory && Object.keys(restored.inventory).length === 0,
    'กระเป๋าไม่ว่างหลังอัปเกรด',
  )
})


// ---------- ตีบวกของ ----------

check('ตีบวกแล้วค่าต้องขึ้นจริง และหักเหรียญถูกต้อง', () => {
  const item = ITEMS.ITEMS.find((entry) => entry.kind === 'weapon')
  let player = makePlayer({ coins: 99999, inventory: { [item.id]: 1 } })

  const before = INV.totalStats(INV.equipItem(player, item.id)).attack
  const cost = UP.upgradeCost(item.id, 0)

  player = UP.upgradeItem(player, item.id)
  assert(player, 'ตีบวกไม่สำเร็จทั้งที่เหรียญพอ')
  assert(player.coins === 99999 - cost, `หักเหรียญผิด เหลือ ${player.coins}`)
  assert(UP.starsOf(player, item.id) === 1, 'ตีบวกแล้วดาวไม่ขึ้น')

  const after = INV.totalStats(INV.equipItem(player, item.id)).attack
  assert(after > before, `ตีบวกแล้วพลังโจมตีเท่าเดิมที่ ${after}`)
})

check('ตีบวกได้ถึงเพดานแล้วต้องหยุด', () => {
  const item = ITEMS.ITEMS.find((entry) => entry.kind === 'armor')
  let player = makePlayer({ coins: 9999999, inventory: { [item.id]: 1 } })

  for (let i = 0; i < UP.MAX_STARS; i += 1) {
    const next = UP.upgradeItem(player, item.id)
    assert(next, `ตีบวกดาวที่ ${i + 1} ไม่สำเร็จ`)
    player = next
  }

  assert(UP.starsOf(player, item.id) === UP.MAX_STARS, 'ดาวไม่ถึงเพดาน')
  assert(UP.upgradeItem(player, item.id) === null, 'ตีบวกเกินเพดานได้')
  assert(UP.upgradeCost(item.id, UP.MAX_STARS) === null, 'ยังคืนราคาทั้งที่ตีบวกต่อไม่ได้')
})

check('ตีบวกของที่ไม่มีในกระเป๋าไม่ได้', () => {
  const item = ITEMS.ITEMS.find((entry) => entry.kind === 'weapon')
  const player = makePlayer({ coins: 99999, inventory: {}, equipped: {} })

  assert(UP.upgradeItem(player, item.id) === null, 'ตีบวกของที่ยังไม่มีได้')
  assert(
    UP.upgradeBlockedReason(player, item.id).includes('ต้องมีของ'),
    'ไม่ได้บอกเหตุผลว่ายังไม่มีของ',
  )
})

check('ตีบวกของที่สวมอยู่ได้ ไม่ต้องถอดออกก่อน', () => {
  /*
   * ข้อนี้สำคัญเพราะเด็กจะตีบวกของที่ใช้อยู่เป็นหลัก
   * ถ้าบังคับให้ถอดก่อน เด็กจะไม่รู้ว่าต้องทำอะไร แล้วคิดว่าตีบวกของชิ้นนั้นไม่ได้
   */
  const item = ITEMS.ITEMS.find((entry) => entry.kind === 'weapon')
  let player = makePlayer({ coins: 99999, inventory: { [item.id]: 1 } })
  player = INV.equipItem(player, item.id)

  assert(INV.countOf(player, item.id) === 0, 'สวมแล้วของยังอยู่ในกระเป๋า')
  assert(UP.canUpgrade(player, item.id), 'ตีบวกของที่สวมอยู่ไม่ได้')
})

check('เหรียญไม่พอต้องตีบวกไม่ได้ และบอกว่าขาดเท่าไร', () => {
  const item = ITEMS.ITEMS.find((entry) => entry.kind === 'weapon')
  const cost = UP.upgradeCost(item.id, 0)
  const player = makePlayer({ coins: cost - 1, inventory: { [item.id]: 1 } })

  assert(UP.upgradeItem(player, item.id) === null, 'เหรียญไม่พอแต่ตีบวกได้')
  assert(
    UP.upgradeBlockedReason(player, item.id).includes('ขาดอีก 1'),
    `ข้อความบอกเหตุผลผิด: ${UP.upgradeBlockedReason(player, item.id)}`,
  )
})

check('ราคาตีบวกต้องขึ้นเร็วกว่าค่าที่ได้', () => {
  /*
   * ตั้งใจให้เป็นแบบนี้ เพื่อให้การกระจายตีบวกหลายชิ้นคุ้มกว่าทุ่มชิ้นเดียวจนสุด
   * ถ้าราคาขึ้นช้ากว่าค่าที่ได้ คำตอบที่ดีที่สุดจะมีแค่ทางเดียวเสมอ
   * ซึ่งทำให้ไม่มีอะไรให้ตัดสินใจเลย
   */
  const item = ITEMS.ITEMS.find((entry) => entry.kind === 'weapon')

  for (let star = 1; star < UP.MAX_STARS; star += 1) {
    const previous = UP.upgradeCost(item.id, star - 1)
    const current = UP.upgradeCost(item.id, star)
    assert(current > previous, `ดาวที่ ${star + 1} ไม่ได้แพงกว่าดาวก่อนหน้า`)
  }

  const base = UP.statsWithStars(item, 0).attack
  const full = UP.statsWithStars(item, UP.MAX_STARS).attack
  assert(full > base, 'ตีบวกจนสุดแล้วค่าไม่ขึ้นเลย')
  assert(full < base * 4, `ตีบวกจนสุดแล้วแรงขึ้น ${(full / base).toFixed(1)} เท่า ซึ่งมากเกินไป`)
})

check('ของราคาถูกที่มีค่าน้อยต้องได้ค่าเพิ่มอย่างน้อยหนึ่งหน่วยต่อดาว', () => {
  // ถ้าปัดลง ของที่มีค่าพื้นฐาน 2 จะไม่ขึ้นเลยในดาวแรก แล้วเด็กจะรู้สึกว่าจ่ายฟรี
  for (const item of ITEMS.ITEMS) {
    if (item.kind === 'consumable') continue
    const base = UP.statsWithStars(item, 0)
    const one = UP.statsWithStars(item, 1)

    for (const key of Object.keys(base)) {
      if (!base[key]) continue
      assert(one[key] > base[key], `${item.name} ค่า ${key} ไม่ขึ้นเลยตอนตีบวกดาวแรก`)
    }
  }
})

check('ดาวต้องไม่หายตอนถอดของออกแล้วใส่กลับ', () => {
  const item = ITEMS.ITEMS.find((entry) => entry.kind === 'weapon')
  let player = makePlayer({ coins: 99999, inventory: { [item.id]: 1 } })
  player = UP.upgradeItem(player, item.id)
  player = UP.upgradeItem(player, item.id)

  player = INV.equipItem(player, item.id)
  player = INV.unequipSlot(player, 'weapon')
  player = INV.equipItem(player, item.id)

  assert(UP.starsOf(player, item.id) === 2, `ดาวหายไป เหลือ ${UP.starsOf(player, item.id)}`)
})

// ---------- ซื้อและเปลี่ยนตัวละคร ----------

check('ตัวละครทุกตัวมีราคาและมีตัวเริ่มต้นให้เลือกมากกว่าหนึ่งตัว', () => {
  for (const avatar of AVATARS.AVATARS) {
    assert(typeof avatar.price === 'number' && avatar.price >= 0, `${avatar.id} ไม่มีราคา`)
  }

  assert(
    AVATARS.STARTER_AVATAR_IDS.length >= 2,
    `ตัวเริ่มต้นมีแค่ ${AVATARS.STARTER_AVATAR_IDS.length} ตัว ซึ่งไม่ถือว่าได้เลือก`,
  )
  assert(
    AVATARS.STARTER_AVATAR_IDS.includes(AVATARS.DEFAULT_AVATAR_ID),
    'ตัวละครค่าเริ่มต้นกลับต้องซื้อก่อน',
  )
  assert(
    AVATARS.AVATARS.some((avatar) => avatar.price > 0),
    'ไม่มีตัวละครที่ต้องซื้อเลย ระบบร้านตัวละครจึงไม่มีความหมาย',
  )
})

check('ผู้เล่นใหม่ต้องมีเฉพาะตัวที่เลือกไว้ ไม่ใช่มีครบทุกตัว', () => {
  const player = STORAGE.createPlayer('เด็กใหม่', 'mage')

  assert(AV.ownsAvatar(player, 'mage'), 'ตัวที่เลือกตอนสร้างกลับไม่ได้เป็นของตัวเอง')
  const paid = AVATARS.AVATARS.find((avatar) => avatar.price > 0)
  assert(!AV.ownsAvatar(player, paid.id), 'ผู้เล่นใหม่ได้ตัวละครที่ต้องซื้อไปฟรี')
})

check('ซื้อตัวละครแล้วต้องหักเหรียญ เป็นเจ้าของ และเปลี่ยนให้ทันที', () => {
  const paid = AVATARS.AVATARS.find((avatar) => avatar.price > 0 && !avatar.requiredLevel)
  const player = makePlayer({ coins: paid.price + 10 })

  const after = AV.buyAvatar(player, paid.id)
  assert(after, 'ซื้อไม่สำเร็จทั้งที่เหรียญพอ')
  assert(after.coins === 10, `หักเหรียญผิด เหลือ ${after.coins}`)
  assert(AV.ownsAvatar(after, paid.id), 'ซื้อแล้วไม่ได้เป็นเจ้าของ')
  assert(after.avatar === paid.id, 'ซื้อแล้วไม่ได้เปลี่ยนไปใช้ตัวใหม่ทันที')
})

check('ซื้อซ้ำไม่ได้ และเหรียญไม่พอก็ซื้อไม่ได้', () => {
  const paid = AVATARS.AVATARS.find((avatar) => avatar.price > 0 && !avatar.requiredLevel)

  const poor = makePlayer({ coins: paid.price - 1 })
  assert(AV.buyAvatar(poor, paid.id) === null, 'เหรียญไม่พอแต่ซื้อได้')

  const rich = AV.buyAvatar(makePlayer({ coins: 99999 }), paid.id)
  assert(AV.buyAvatar(rich, paid.id) === null, 'ซื้อตัวเดิมซ้ำได้')
})

check('ตัวละครที่มีเงื่อนไขเลเวลต้องกันไว้จริง', () => {
  const gated = AVATARS.AVATARS.find((avatar) => avatar.requiredLevel)
  assert(gated, 'ไม่มีตัวละครที่ใช้เงื่อนไขเลเวลเลย')

  const low = makePlayer({ coins: 999999, level: 1 })
  assert(AV.buyAvatar(low, gated.id) === null, 'เลเวลไม่ถึงแต่ซื้อได้')
  assert(
    AV.buyAvatarBlockedReason(low, gated.id).includes('เลเวล'),
    'ไม่ได้บอกว่าติดเงื่อนไขเลเวล',
  )

  const high = makePlayer({ coins: 999999, level: gated.requiredLevel })
  assert(AV.buyAvatar(high, gated.id), 'เลเวลถึงแล้วยังซื้อไม่ได้')
})

check('เปลี่ยนไปใช้ตัวที่ยังไม่มีไม่ได้ และของที่สวมอยู่ต้องไม่หาย', () => {
  const paid = AVATARS.AVATARS.find((avatar) => avatar.price > 0 && !avatar.requiredLevel)
  const item = ITEMS.ITEMS.find((entry) => entry.kind === 'weapon')

  let player = makePlayer({ coins: 99999, inventory: { [item.id]: 1 } })
  player = INV.equipItem(player, item.id)
  player = UP.upgradeItem(player, item.id)

  assert(AV.selectAvatar(player, paid.id) === null, 'เปลี่ยนไปใช้ตัวที่ยังไม่มีได้')

  const bought = AV.buyAvatar(player, paid.id)
  assert(bought.equipped.weapon === item.id, 'เปลี่ยนตัวละครแล้วของที่สวมอยู่หาย')
  assert(UP.starsOf(bought, item.id) === 1, 'เปลี่ยนตัวละครแล้วดาวตีบวกหาย')
})

check('ตัวที่ใช้อยู่ต้องนับเป็นของตัวเองเสมอ แม้ข้อมูลจะเพี้ยน', () => {
  // กันสภาพที่ออกจากไม่ได้ คือใช้ตัวละครที่ระบบบอกว่าไม่มี จึงเลือกซ้ำไม่ได้
  const broken = makePlayer({ avatar: 'scientist', ownedAvatars: [] })
  assert(AV.ownsAvatar(broken, 'scientist'), 'ตัวที่ใช้อยู่กลับไม่ถือว่าเป็นของตัวเอง')
})


console.log(`ผ่าน ${passed} ข้อ`)
if (failures.length > 0) {
  console.log(`\nไม่ผ่าน ${failures.length} ข้อ`)
  failures.forEach((line, i) => console.log(`  ${i + 1}. ${line}`))
  process.exit(1)
}
console.log('ผ่านทั้งหมด')
