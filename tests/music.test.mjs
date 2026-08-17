/**
 * ชุดทดสอบเครื่องแต่งเพลง
 *
 * ทำไมต้องมี
 *
 * ข้อผิดพลาดของเพลงไม่ทำให้อะไรพัง ไม่มี error ไม่มีจอขาว
 * มันแค่ "ฟังแล้วเพี้ยน" ซึ่งเป็นสิ่งที่เครื่องมือทั่วไปมองไม่เห็นเลย
 * และคนที่จะเจอคนแรกคือเด็กในห้องเรียน ไม่ใช่เรา
 *
 * สิ่งที่ตรวจได้จริงคือกฎทางดนตรีที่เขียนเป็นตัวเลขได้
 *
 *   1. โน้ตทุกตัวต้องอยู่ในบันไดเสียงของเพลง ตัวที่หลุดออกไปคือเสียงเพี้ยน
 *   2. โน้ตในจังหวะหนักต้องเป็นเสียงในคอร์ด ไม่งั้นจะฟังเหมือนกดผิดคีย์
 *   3. ความถี่ต้องอยู่ในย่านที่ลำโพงแท็บเล็ตเล่นได้ และหูเด็กฟังสบาย
 *   4. ห้องเดียวกันต้องได้โน้ตชุดเดิมเสมอ ไม่งั้นตัวจองคิวล่วงหน้าจะเพี้ยน
 *   5. ห้องต่างกันต้องไม่เหมือนกันหมด ไม่งั้นก็คือเพลงวนห้องเดียว
 *   6. ต้องมีเบสลงตรงจังหวะที่หนึ่งเสมอ เพราะเป็นหลักให้หูจับจังหวะ
 *
 * วิธีใช้
 *   npx tsc -p tsconfig.tests.json --outDir /tmp/logic
 *   node tests/music.test.mjs /tmp/logic
 */

import path from 'path'
import { createRequire } from 'module'

const OUT = process.argv[2]
if (!OUT) {
  console.error('ใช้: node tests/music.test.mjs <โฟลเดอร์ JS ที่คอมไพล์แล้ว>')
  process.exit(1)
}

const require = createRequire(import.meta.url)
const THEME = require(path.resolve(OUT, 'audio/theme.js'))

let passed = 0
const failures = []

function check(name, fn) {
  try { fn(); passed += 1 }
  catch (err) { failures.push(`${name}\n      ${err.message}`) }
}
function assert(condition, message) { if (!condition) throw new Error(message) }
function equal(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message} — ได้ ${JSON.stringify(actual)} คาดว่า ${JSON.stringify(expected)}`)
  }
}

/** แปลงความถี่กลับเป็นเลขโน้ต MIDI เพื่อตรวจว่าอยู่ในบันไดเสียงไหม */
function freqToMidi(freq) {
  return Math.round(69 + 12 * Math.log2(freq / 440))
}

/** ระยะครึ่งเสียงจากโน้ตหลัก โดยไม่สนใจว่าอยู่อ็อกเทฟไหน */
function pitchClass(spec, midi) {
  return ((midi - spec.rootMidi) % 12 + 12) % 12
}

const BARS_TO_CHECK = 32

check('มีเพลงครบทุกรหัสที่ประกาศไว้', () => {
  assert(THEME.TRACK_IDS.length >= 5, 'ควรมีเพลงอย่างน้อยห้าเพลง')
  for (const id of THEME.TRACK_IDS) {
    const spec = THEME.trackSpec(id)
    assert(spec, `ไม่พบข้อมูลเพลง ${id}`)
    equal(spec.id, id, `รหัสในข้อมูลเพลงไม่ตรงกับคีย์ของ ${id}`)
    assert(spec.name.length > 0, `เพลง ${id} ไม่มีชื่อ`)
  }
})

check('ค่าพื้นฐานของทุกเพลงอยู่ในช่วงที่เล่นได้จริง', () => {
  for (const id of THEME.TRACK_IDS) {
    const spec = THEME.trackSpec(id)
    assert(spec.bpm >= 60 && spec.bpm <= 200, `${id} จังหวะ ${spec.bpm} อยู่นอกช่วงที่ใช้ได้`)
    assert(spec.beatsPerBar >= 2, `${id} ห้องสั้นเกินไป`)
    assert(spec.progression.length >= 2, `${id} มีคอร์ดเดียวจะฟังเหมือนเสียงค้าง`)
    assert(
      spec.leadDensity > 0 && spec.leadDensity <= 1,
      `${id} ความหนาแน่นของทำนอง ${spec.leadDensity} ต้องอยู่ระหว่าง 0 ถึง 1`,
    )
    assert(spec.scale.length === 7, `${id} บันไดเสียงต้องมีเจ็ดขั้น`)
  }
})

check('โน้ตทุกตัวที่มีระดับเสียงต้องอยู่ในบันไดเสียงของเพลง', () => {
  for (const id of THEME.TRACK_IDS) {
    const spec = THEME.trackSpec(id)
    const allowed = new Set(spec.scale)

    for (let bar = 0; bar < BARS_TO_CHECK; bar += 1) {
      for (const note of THEME.renderBar(id, bar)) {
        // กลองไม่มีระดับเสียง เป็นเสียงซ่าที่ถูกกรอง จึงไม่ต้องอยู่ในบันไดเสียง
        if (note.voice === 'drum') continue

        const pc = pitchClass(spec, freqToMidi(note.freq))
        assert(
          allowed.has(pc),
          `${id} ห้อง ${bar} มีโน้ตนอกบันไดเสียง (ห่างจากโน้ตหลัก ${pc} ครึ่งเสียง) ` +
            'ซึ่งจะได้ยินเป็นเสียงเพี้ยน',
        )
      }
    }
  }
})

check('โน้ตทำนองในจังหวะหนักต้องเป็นเสียงในคอร์ดของห้องนั้น', () => {
  for (const id of THEME.TRACK_IDS) {
    const spec = THEME.trackSpec(id)

    for (let bar = 0; bar < BARS_TO_CHECK; bar += 1) {
      const degree = spec.progression[bar % spec.progression.length]
      const chord = new Set(
        [degree, degree + 2, degree + 4].map((d) =>
          pitchClass(spec, THEME.scaleNote(spec, d, 0)),
        ),
      )

      for (const note of THEME.renderBar(id, bar)) {
        if (note.voice !== 'lead') continue
        if (!Number.isInteger(note.beat)) continue // จังหวะเบา ปล่อยได้

        const pc = pitchClass(spec, freqToMidi(note.freq))
        assert(
          chord.has(pc),
          `${id} ห้อง ${bar} จังหวะ ${note.beat} มีโน้ตนอกคอร์ดในจังหวะหนัก ` +
            'ซึ่งจะฟังเหมือนกดผิดคีย์',
        )
      }
    }
  }
})

check('ความถี่ทุกตัวอยู่ในย่านที่ลำโพงแท็บเล็ตเล่นได้', () => {
  for (const id of THEME.TRACK_IDS) {
    for (let bar = 0; bar < BARS_TO_CHECK; bar += 1) {
      for (const note of THEME.renderBar(id, bar)) {
        assert(
          Number.isFinite(note.freq) && note.freq >= 30 && note.freq <= 9000,
          `${id} ห้อง ${bar} มีความถี่ ${note.freq} ซึ่งอยู่นอกย่านที่ใช้งานได้`,
        )
        assert(
          note.gain > 0 && note.gain <= 1,
          `${id} ห้อง ${bar} มีความดัง ${note.gain} ซึ่งอยู่นอกช่วง 0 ถึง 1`,
        )
        assert(note.beats > 0, `${id} ห้อง ${bar} มีโน้ตความยาวศูนย์ ซึ่งจะไม่ได้ยิน`)
        assert(
          note.beat >= 0 && note.beat < THEME.trackSpec(id).beatsPerBar,
          `${id} ห้อง ${bar} มีโน้ตเริ่มนอกห้องที่ตำแหน่ง ${note.beat}`,
        )
      }
    }
  }
})

check('ห้องเดียวกันต้องได้โน้ตชุดเดิมทุกครั้งที่เรียก', () => {
  /*
   * ตัวขับเสียงจองคิวล่วงหน้าและอาจเรียกห้องเดิมซ้ำได้
   * ถ้าผลไม่เหมือนเดิม เพลงจะกระตุกเป็นช่วง ๆ โดยหาสาเหตุแทบไม่ได้
   */
  for (const id of THEME.TRACK_IDS) {
    for (const bar of [0, 1, 7, 31]) {
      const first = JSON.stringify(THEME.renderBar(id, bar))
      const second = JSON.stringify(THEME.renderBar(id, bar))
      equal(second, first, `${id} ห้อง ${bar} ให้ผลไม่เหมือนเดิมเมื่อเรียกซ้ำ`)
    }
  }
})

check('ห้องต่าง ๆ ต้องไม่ซ้ำกันหมด ไม่งั้นก็คือเพลงวนห้องเดียว', () => {
  for (const id of THEME.TRACK_IDS) {
    const shapes = new Set()
    for (let bar = 0; bar < BARS_TO_CHECK; bar += 1) {
      const lead = THEME.renderBar(id, bar)
        .filter((note) => note.voice === 'lead')
        .map((note) => `${note.beat}:${Math.round(note.freq)}`)
        .join(',')
      shapes.add(lead)
    }
    assert(
      shapes.size >= 8,
      `${id} มีทำนองต่างกันแค่ ${shapes.size} แบบใน ${BARS_TO_CHECK} ห้อง ` +
        'ซึ่งจะได้ยินเป็นเพลงวนซ้ำเร็วเกินไป',
    )
  }
})

check('ทุกห้องต้องมีเบสลงที่จังหวะแรก', () => {
  for (const id of THEME.TRACK_IDS) {
    for (let bar = 0; bar < BARS_TO_CHECK; bar += 1) {
      const notes = THEME.renderBar(id, bar)
      const downbeat = notes.some(
        (note) => note.voice === 'bass' && note.beat === 0,
      )
      assert(downbeat, `${id} ห้อง ${bar} ไม่มีเบสที่จังหวะแรก หูจะจับจังหวะไม่ได้`)
    }
  }
})

check('ทุกห้องต้องมีคอร์ดรองพื้น และเบสต้องต่ำกว่าทำนองเสมอ', () => {
  for (const id of THEME.TRACK_IDS) {
    for (let bar = 0; bar < 8; bar += 1) {
      const notes = THEME.renderBar(id, bar)
      const chord = notes.filter((note) => note.voice === 'chord')
      assert(chord.length >= 3, `${id} ห้อง ${bar} คอร์ดไม่ครบสามเสียง`)

      const bass = notes.filter((note) => note.voice === 'bass')
      const lead = notes.filter((note) => note.voice === 'lead')
      if (lead.length === 0) continue

      const highestBass = Math.max(...bass.map((note) => note.freq))
      const lowestLead = Math.min(...lead.map((note) => note.freq))
      assert(
        highestBass < lowestLead,
        `${id} ห้อง ${bar} เบสสูงกว่าทำนอง เสียงจะตีกันจนฟังไม่ออกว่าอันไหนเป็นอันไหน`,
      )
    }
  }
})

check('เพลงที่มีกลองต้องมีกลองครบทุกห้อง เพลงที่ไม่มีต้องไม่มีเลย', () => {
  for (const id of THEME.TRACK_IDS) {
    const spec = THEME.trackSpec(id)
    for (let bar = 0; bar < 8; bar += 1) {
      const drums = THEME.renderBar(id, bar).filter((note) => note.voice === 'drum')
      if (spec.drums) {
        assert(drums.length > 0, `${id} ห้อง ${bar} ควรมีกลองแต่ไม่มี`)
      } else {
        equal(drums.length, 0, `${id} ห้อง ${bar} ไม่ควรมีกลองแต่กลับมี`)
      }
    }
  }
})

check('ความยาวห้องคำนวณตรงกับจังหวะที่ตั้งไว้', () => {
  for (const id of THEME.TRACK_IDS) {
    const spec = THEME.trackSpec(id)
    const expected = (spec.beatsPerBar * 60) / spec.bpm
    const actual = THEME.barSeconds(id)
    assert(
      Math.abs(actual - expected) < 1e-9,
      `${id} ความยาวห้อง ${actual} ไม่ตรงกับที่ควรเป็น ${expected}`,
    )
    assert(actual > 0.5 && actual < 6, `${id} ความยาวห้อง ${actual} วินาที ผิดปกติ`)
  }
})

check('scaleNote ขึ้นอ็อกเทฟให้เองเมื่อลำดับขั้นเกินบันไดเสียง', () => {
  /*
   * จุดนี้เคยเป็นกับดัก: คอร์ดคือขั้นที่ 0, 2, 4
   * ขั้นที่ 4 ของคอร์ดลำดับที่ 5 จะเลยความยาวบันไดเสียงไปแล้ว
   * ถ้าวนกลับมาขั้นต่ำ ๆ คอร์ดจะกลายเป็นคนละคอร์ดโดยที่โค้ดดูเหมือนถูก
   */
  const spec = THEME.trackSpec('menu')
  const low = THEME.scaleNote(spec, 0, 0)
  const wrapped = THEME.scaleNote(spec, 7, 0)
  equal(wrapped - low, 12, 'ขั้นที่เจ็ดต้องสูงกว่าขั้นแรกพอดีหนึ่งอ็อกเทฟ')

  const negative = THEME.scaleNote(spec, -7, 0)
  equal(low - negative, 12, 'ขั้นติดลบต้องลงอ็อกเทฟ ไม่ใช่พังหรือวนขึ้น')
})

check('midiToFreq ตรงกับค่ามาตรฐาน', () => {
  assert(Math.abs(THEME.midiToFreq(69) - 440) < 1e-9, 'โน้ต 69 ต้องเป็น 440 เฮิรตซ์')
  assert(Math.abs(THEME.midiToFreq(81) - 880) < 1e-9, 'สูงขึ้นหนึ่งอ็อกเทฟต้องได้ความถี่สองเท่า')
  assert(Math.abs(THEME.midiToFreq(60) - 261.6255653) < 1e-4, 'โด กลาง ต้องเป็นราว 261.63 เฮิรตซ์')
})

const totalNotes = THEME.TRACK_IDS.reduce(
  (sum, id) => sum + THEME.renderBar(id, 0).length,
  0,
)
console.log(
  `ผ่าน ${passed} ข้อ · เพลง ${THEME.TRACK_IDS.length} เพลง · ` +
    `ตรวจห้องละ ${BARS_TO_CHECK} ห้อง · ห้องแรกรวม ${totalNotes} โน้ต`,
)
if (failures.length > 0) {
  console.log(`\nไม่ผ่าน ${failures.length} ข้อ`)
  failures.forEach((line, i) => console.log(`  ${i + 1}. ${line}`))
  process.exit(1)
}
console.log('ผ่านทั้งหมด')
