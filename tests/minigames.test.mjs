/**
 * ชุดทดสอบมินิเกมที่ไม่ใช่การเลือกตอบ
 *
 * ข้อที่สำคัญที่สุดคือ "ความยุติธรรม"
 * เกมพวกนี้ตัดสินถูกผิดจากการจับคู่ ไม่ใช่จากการกดปุ่มเดียว
 * ถ้ากระดานมีคำตอบซ้ำกันสองที่ เด็กจะจับคู่ถูกตามความเข้าใจ
 * แต่ระบบบอกว่าผิด ซึ่งเป็นบั๊กที่เด็กไม่มีทางรู้ว่าไม่ใช่ความผิดตัวเอง
 *
 * วิธีใช้
 *   npx tsc -p tsconfig.tests.json --outDir /tmp/logic
 *   node tests/minigames.test.mjs /tmp/logic
 */

import path from 'path'
import { createRequire } from 'module'

const OUT = process.argv[2]
if (!OUT) {
  console.error('ใช้: node tests/minigames.test.mjs <โฟลเดอร์ JS ที่คอมไพล์แล้ว>')
  process.exit(1)
}

const require = createRequire(import.meta.url)
const load = (name) => require(path.resolve(OUT, name + '.js'))

const GEN = load('minigames/generators')
const ENGINE = load('minigames/engine')
const PAIRS = load('minigames/pairs')
const RNG = load('math/rng')

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

const SKILLS = [
  'addition',
  'subtraction',
  'multiplication',
  'division',
  'fractions',
  'decimals',
  'percentages',
  'geometry',
  'wordProblems',
]
const GRADES = [4, 5, 6]

/** สร้างทุกเกม ทุกทักษะ ทุกชั้น หลาย seed ใช้ตรวจข้อที่ต้องจริงทุกกรณี */
function everyGame(seedCount = 6) {
  const games = []
  for (const kind of GEN.MINIGAME_KINDS) {
    for (const skill of SKILLS) {
      for (const grade of GRADES) {
        for (let s = 0; s < seedCount; s += 1) {
          games.push(GEN.generateMinigame({ seed: `s${s}`, grade, skill, kind }))
        }
      }
    }
  }
  return games
}

const ALL = everyGame()

check('สร้างได้ครบทุกชนิด ทุกทักษะ ทุกชั้น', () => {
  assert(ALL.length === 4 * 9 * 3 * 6, `สร้างได้ ${ALL.length} เกม`)
  assert(
    ALL.every((game) => game && typeof game.id === 'string' && game.id.length > 0),
    'มีเกมที่ไม่มี id',
  )
})

check('ทุกเกมมีคำสั่งและเรื่องราวที่อ่านรู้เรื่อง', () => {
  for (const game of ALL) {
    assert(game.title.length >= 4, `${game.id} ชื่อสั้นเกินไป`)
    assert(game.instruction.length >= 10, `${game.id} คำสั่งสั้นเกินไป`)
    assert(game.story.length >= 20, `${game.id} เรื่องราวสั้นเกินไป`)
    assert(game.successText.length >= 8, `${game.id} ข้อความตอนผ่านสั้นเกินไป`)
  }
})

check('seed เดิมต้องได้กระดานเดิมเสมอ', () => {
  for (const kind of GEN.MINIGAME_KINDS) {
    const a = GEN.generateMinigame({ seed: 'ซ้ำ', grade: 5, skill: 'multiplication', kind })
    const b = GEN.generateMinigame({ seed: 'ซ้ำ', grade: 5, skill: 'multiplication', kind })
    assert(JSON.stringify(a) === JSON.stringify(b), `${kind} สร้างสองครั้งได้คนละกระดาน`)
  }
})

check('seed ต่างกันต้องได้กระดานต่างกัน', () => {
  for (const kind of GEN.MINIGAME_KINDS) {
    const seen = new Set()
    for (let s = 0; s < 12; s += 1) {
      const game = GEN.generateMinigame({
        seed: `v${s}`,
        grade: 5,
        skill: 'multiplication',
        kind,
      })
      seen.add(JSON.stringify(game).replace(/-v\d+/g, ''))
    }
    assert(seen.size >= 8, `${kind} สร้าง 12 ครั้งได้กระดานต่างกันแค่ ${seen.size} แบบ`)
  }
})

// ---------- เกมจับคู่ ----------

const MATCHING = ALL.filter((game) => game.kind === 'matching')

check('จับคู่: ไพ่ต้องครบคู่ ไม่มีใบโดด', () => {
  for (const game of MATCHING) {
    assert(game.cards.length === game.pairCount * 2, `${game.id} จำนวนไพ่ไม่ครบคู่`)
    const byPair = new Map()
    for (const card of game.cards) {
      byPair.set(card.pairId, (byPair.get(card.pairId) ?? 0) + 1)
    }
    for (const [pairId, count] of byPair) {
      assert(count === 2, `${game.id} คู่ ${pairId} มี ${count} ใบ`)
    }
  }
})

check('จับคู่: แต่ละคู่ต้องมีโจทย์หนึ่งใบและคำตอบหนึ่งใบ', () => {
  for (const game of MATCHING) {
    const sides = new Map()
    for (const card of game.cards) {
      const list = sides.get(card.pairId) ?? []
      list.push(card.side)
      sides.set(card.pairId, list)
    }
    for (const [pairId, list] of sides) {
      assert(
        list.includes('prompt') && list.includes('answer'),
        `${game.id} คู่ ${pairId} ไม่ได้เป็นโจทย์คู่คำตอบ`,
      )
    }
  }
})

check('จับคู่: ห้ามมีข้อความคำตอบซ้ำกันในกระดานเดียว', () => {
  for (const game of MATCHING) {
    const answers = game.cards.filter((card) => card.side === 'answer').map((card) => card.text)
    assert(
      new Set(answers).size === answers.length,
      `${game.id} มีคำตอบซ้ำ: ${answers.join(', ')}`,
    )
  }
})

check('จับคู่: ตัวตัดสินต้องยอมเฉพาะคู่ที่ถูกจริง', () => {
  for (const game of MATCHING.slice(0, 60)) {
    for (const card of game.cards) {
      for (const other of game.cards) {
        const expected =
          card.id !== other.id && card.pairId === other.pairId && card.side !== other.side
        assert(
          ENGINE.isMatchingPair(game, card.id, other.id) === expected,
          `${game.id} ตัดสิน ${card.id}+${other.id} ผิด`,
        )
      }
    }
  }
})

check('จับคู่: เปิดใบเดียวกันสองครั้งต้องไม่นับว่าเป็นคู่', () => {
  const game = MATCHING[0]
  const card = game.cards[0]
  assert(!ENGINE.isMatchingPair(game, card.id, card.id), 'ใบเดียวกันกลับนับเป็นคู่')
})

// ---------- เกมโยงเส้น ----------

const CONNECT = ALL.filter((game) => game.kind === 'connect')

check('โยงเส้น: จำนวนจุดสองฝั่งต้องเท่ากันและมีเฉลยครบ', () => {
  for (const game of CONNECT) {
    assert(game.left.length === game.right.length, `${game.id} จำนวนสองฝั่งไม่เท่ากัน`)
    assert(game.left.length >= 3, `${game.id} มีแค่ ${game.left.length} คู่ น้อยเกินไป`)
    assert(
      Object.keys(game.solution).length === game.left.length,
      `${game.id} เฉลยไม่ครบทุกเส้น`,
    )
    for (const [leftId, rightId] of Object.entries(game.solution)) {
      assert(
        game.left.some((node) => node.id === leftId),
        `${game.id} เฉลยอ้างจุดซ้าย ${leftId} ที่ไม่มีอยู่`,
      )
      assert(
        game.right.some((node) => node.id === rightId),
        `${game.id} เฉลยอ้างจุดขวา ${rightId} ที่ไม่มีอยู่`,
      )
    }
  }
})

check('โยงเส้น: จุดขวาหนึ่งจุดต้องเป็นคำตอบของจุดซ้ายได้แค่จุดเดียว', () => {
  for (const game of CONNECT) {
    const targets = Object.values(game.solution)
    assert(new Set(targets).size === targets.length, `${game.id} มีจุดขวาที่ถูกใช้ซ้ำ`)
    const texts = game.right.map((node) => node.text)
    assert(new Set(texts).size === texts.length, `${game.id} จุดขวามีข้อความซ้ำ`)
  }
})

check('โยงเส้น: โยงถูกครบทุกเส้นจึงจะผ่าน', () => {
  for (const game of CONNECT.slice(0, 40)) {
    assert(ENGINE.isConnectComplete(game, game.solution), `${game.id} เฉลยแท้ ๆ กลับไม่ผ่าน`)

    const partial = { ...game.solution }
    delete partial[Object.keys(partial)[0]]
    assert(!ENGINE.isConnectComplete(game, partial), `${game.id} โยงไม่ครบกลับผ่าน`)

    const keys = Object.keys(game.solution)
    if (keys.length >= 2) {
      const swapped = { ...game.solution }
      const [k0, k1] = keys
      swapped[k0] = game.solution[k1]
      swapped[k1] = game.solution[k0]
      assert(!ENGINE.isConnectComplete(game, swapped), `${game.id} สลับคู่กันแล้วยังผ่าน`)
    }
  }
})

// ---------- เกมลากวาง ----------

const DRAG = ALL.filter((game) => game.kind === 'dragdrop')

check('ลากวาง: ต้องมีตัวลวงมากกว่าช่องว่าง', () => {
  for (const game of DRAG) {
    assert(
      game.tiles.length > game.slots.length,
      `${game.id} มีแผ่น ${game.tiles.length} ช่อง ${game.slots.length} ไม่มีตัวลวง`,
    )
  }
})

check('ลากวาง: แผ่นที่เป็นเฉลยต้องมีอยู่จริงในกองแผ่น', () => {
  for (const game of DRAG) {
    for (const slot of game.slots) {
      assert(
        game.tiles.some((tile) => tile.id === slot.correctTileId),
        `${game.id} ช่อง ${slot.id} อ้างแผ่น ${slot.correctTileId} ที่ไม่มีในกอง`,
      )
    }
  }
})

check('ลากวาง: ตัวลวงต้องไม่ซ้ำค่ากับแผ่นเฉลย', () => {
  for (const game of DRAG) {
    const correctIds = new Set(game.slots.map((slot) => slot.correctTileId))
    const correctTexts = new Set(
      game.tiles.filter((tile) => correctIds.has(tile.id)).map((tile) => tile.text),
    )
    for (const tile of game.tiles) {
      if (correctIds.has(tile.id)) continue
      assert(
        !correctTexts.has(tile.text),
        `${game.id} ตัวลวง ${tile.text} ซ้ำค่ากับแผ่นเฉลย`,
      )
    }
  }
})

check('ลากวาง: ช่องว่างในสมการต้องตรงกับรายการช่อง', () => {
  for (const game of DRAG) {
    const inTemplate = [...game.template.matchAll(/\{(\w+)\}/g)].map((m) => m[1])
    const declared = game.slots.map((slot) => slot.id)
    assert(
      inTemplate.length === declared.length,
      `${game.id} สมการมี ${inTemplate.length} ช่อง แต่ประกาศไว้ ${declared.length}`,
    )
    for (const id of inTemplate) {
      assert(declared.includes(id), `${game.id} สมการอ้างช่อง ${id} ที่ไม่ได้ประกาศ`)
    }
  }
})

check('ลากวาง: วางถูกทุกช่องจึงผ่าน วางไม่ครบไม่ผ่าน', () => {
  for (const game of DRAG.slice(0, 40)) {
    const right = {}
    for (const slot of game.slots) right[slot.id] = slot.correctTileId
    assert(ENGINE.isDragDropComplete(game, right), `${game.id} เฉลยแท้ ๆ กลับไม่ผ่าน`)

    const partial = { ...right }
    delete partial[game.slots[0].id]
    assert(!ENGINE.isDragDropComplete(game, partial), `${game.id} วางไม่ครบกลับผ่าน`)

    const wrongTile = game.tiles.find(
      (tile) => !game.slots.some((slot) => slot.correctTileId === tile.id),
    )
    if (wrongTile) {
      const wrong = { ...right, [game.slots[0].id]: wrongTile.id }
      assert(!ENGINE.isDragDropComplete(game, wrong), `${game.id} วางตัวลวงแล้วยังผ่าน`)
    }
  }
})

check('ลากวาง: สลับที่บวกกับคูณต้องนับว่าถูก เพราะผลลัพธ์เท่ากันจริง', () => {
  for (const game of DRAG.slice(0, 40)) {
    if (!(game.template.includes('+') || game.template.includes('×'))) continue
    if (game.slots.length !== 2) continue
    const swapped = {
      [game.slots[0].id]: game.slots[1].correctTileId,
      [game.slots[1].id]: game.slots[0].correctTileId,
    }
    assert(
      ENGINE.isDragDropComplete(game, swapped),
      `${game.id} สลับที่ในการบวก/คูณแล้วกลับตัดสินว่าผิด`,
    )
  }
})

// ---------- เกมรับของ ----------

const CATCH = ALL.filter((game) => game.kind === 'catch')

check('รับของ: ต้องมีทั้งของถูกและของผิด ไม่ใช่ของถูกล้วน', () => {
  for (const game of CATCH) {
    const right = game.items.filter((item) => item.correct).length
    const wrong = game.items.length - right
    assert(right >= game.targetCatches, `${game.id} ของถูกมี ${right} ชิ้น น้อยกว่าเป้า`)
    assert(wrong >= 3, `${game.id} ของผิดมีแค่ ${wrong} ชิ้น รับมั่วก็ผ่าน`)
    // เป้าต่ำกว่านี้แปลว่ากฎเหลือคำตอบน้อยเกินจนด่านสั้นผิดปกติ
    assert(game.targetCatches >= 5, `${game.id} เป้าเหลือแค่ ${game.targetCatches} ชิ้น`)
  }
})

check('รับของ: ป้ายบนของต้องตรงกับกฎที่ประกาศไว้', () => {
  for (const game of CATCH) {
    for (const item of game.items) {
      assert(
        item.text === String(item.value),
        `${game.id} ป้าย ${item.text} ไม่ตรงกับค่า ${item.value}`,
      )
    }
    // กฎ "หารด้วย n ลงตัว" ตรวจย้อนได้จากตัวกฎเอง
    const divisor = game.rule.match(/หารด้วย (\d+) ลงตัว/)
    if (divisor) {
      const n = Number(divisor[1])
      for (const item of game.items) {
        assert(
          item.correct === (item.value % n === 0),
          `${game.id} ${item.value} ติดป้ายถูกผิดไม่ตรงกฎหารด้วย ${n}`,
        )
      }
    }
    const greater = game.rule.match(/มากกว่า (\d+)/)
    if (greater) {
      const n = Number(greater[1])
      for (const item of game.items) {
        assert(
          item.correct === item.value > n,
          `${game.id} ${item.value} ติดป้ายถูกผิดไม่ตรงกฎมากกว่า ${n}`,
        )
      }
    }
    if (game.rule.includes('จำนวนคู่')) {
      for (const item of game.items) {
        assert(
          item.correct === (item.value % 2 === 0),
          `${game.id} ${item.value} ติดป้ายถูกผิดไม่ตรงกฎจำนวนคู่`,
        )
      }
    }
  }
})

check('รับของ: เลนต้องอยู่ในจอ และของต้องไม่ตกพร้อมกันจนรับไม่ทัน', () => {
  for (const game of CATCH) {
    for (const item of game.items) {
      assert(item.lane >= 0 && item.lane <= 1, `${game.id} เลน ${item.lane} หลุดจอ`)
      assert(item.fallSeconds >= 2, `${game.id} ตกเร็ว ${item.fallSeconds} วินาที เร็วเกินไป`)
    }
    const times = game.items.map((item) => item.dropAt).sort((a, b) => a - b)
    for (let i = 1; i < times.length; i += 1) {
      assert(
        times[i] - times[i - 1] >= 0.5,
        `${game.id} ของสองชิ้นตกห่างกันแค่ ${(times[i] - times[i - 1]).toFixed(2)} วินาที`,
      )
    }
  }
})

check('รับของ: ตะกร้าต้องรับได้เมื่ออยู่ตรงกัน และรับไม่ได้เมื่ออยู่ไกล', () => {
  assert(ENGINE.isCaught(0.5, 0.5), 'ตรงกันเป๊ะกลับรับไม่ได้')
  assert(ENGINE.isCaught(0.5, 0.6), 'ห่าง 0.1 ควรรับได้')
  assert(!ENGINE.isCaught(0.2, 0.8), 'ห่างคนละฝั่งจอกลับรับได้')
  assert(ENGINE.isCaught(0, 0), 'ขอบซ้ายสุดกลับรับไม่ได้')
  assert(ENGINE.isCaught(1, 1), 'ขอบขวาสุดกลับรับไม่ได้')
})

check('รับของ: เงื่อนไขผ่านต้องนับทั้งของที่รับถูกและที่รับผิด', () => {
  const game = CATCH[0]
  assert(
    ENGINE.isCatchCleared(game, game.targetCatches, 0),
    'รับครบและไม่พลาดเลยกลับไม่ผ่าน',
  )
  assert(
    !ENGINE.isCatchCleared(game, game.targetCatches - 1, 0),
    'รับไม่ครบเป้ากลับผ่าน',
  )
  assert(
    !ENGINE.isCatchCleared(game, game.targetCatches, game.allowedMistakes + 1),
    'รับของผิดเกินโควตากลับผ่าน',
  )
})

// ---------- คู่ที่ใช้ร่วมกัน ----------

check('คู่: ทุกทักษะสร้างคู่ได้จริง ไม่คืนกระดานว่าง', () => {
  for (const skill of SKILLS) {
    for (const grade of GRADES) {
      const rng = RNG.createRng(`pair-${skill}-${grade}`)
      const pairs = PAIRS.buildPairs(rng, grade, skill, 6)
      assert(pairs.length >= 4, `${skill} ป.${grade} สร้างได้แค่ ${pairs.length} คู่`)
      for (const pair of pairs) {
        assert(pair.prompt.length > 0, `${skill} มีโจทย์ว่าง`)
        assert(pair.answer.length > 0, `${skill} มีคำตอบว่าง`)
      }
    }
  }
})

check('คู่: ขอเกินจำนวนที่มีจริงต้องคืนเท่าที่หาได้ ไม่ค้าง', () => {
  const rng = RNG.createRng('เกิน')
  const pairs = PAIRS.buildPairs(rng, 5, 'decimals', 50)
  assert(pairs.length > 0, 'คืนกระดานว่าง')
  assert(pairs.length <= 50, 'คืนเกินจำนวนที่ขอ')
  const keys = pairs.map((pair) => pair.key)
  assert(new Set(keys).size === keys.length, 'มีคู่ซ้ำค่ากัน')
})

check('สรุปผล: ค่าติดลบต้องถูกปัดเป็นศูนย์', () => {
  const result = ENGINE.summarizeResult('catch', -3, -1, false, -8)
  assert(result.correct === 0, 'จำนวนข้อถูกติดลบ')
  assert(result.wrong === 0, 'จำนวนข้อผิดติดลบ')
  assert(result.secondsUsed === 0, 'เวลาติดลบ')
})

check('ชื่อชนิดเกม: ต้องมีชื่อไทยครบทุกชนิด', () => {
  for (const kind of GEN.MINIGAME_KINDS) {
    assert(
      typeof GEN.MINIGAME_LABEL[kind] === 'string' && GEN.MINIGAME_LABEL[kind].length > 0,
      `${kind} ไม่มีชื่อไทย`,
    )
  }
})

console.log(`ผ่าน ${passed} ข้อ`)
if (failures.length > 0) {
  console.log(`\nไม่ผ่าน ${failures.length} ข้อ`)
  failures.forEach((line, i) => console.log(`  ${i + 1}. ${line}`))
  process.exit(1)
}
console.log('ผ่านทั้งหมด')
