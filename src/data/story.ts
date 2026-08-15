/**
 * เนื้อเรื่องหลัก: คริสตัลแห่งความรู้
 *
 * เขียนให้เด็ก ป.4 อ่านออกเอง ประโยคสั้น คำง่าย ไม่มีศัพท์ยาก
 *
 * หลักการเขียน: ทุกตอนต้องตอบคำถามว่า "แล้วไงต่อ"
 * ถ้าตอนไหนตัดออกแล้วเรื่องไม่เปลี่ยน แปลว่าตอนนั้นไม่จำเป็น
 * และทุกตอนต้องเชื่อมกับสิ่งที่เด็กเพิ่งทำในด่าน ไม่ใช่เล่าลอย ๆ
 */

import type { NpcLine, StoryBeat, StoryChapter } from '../types/story'

/** ธงเรื่องทั้งหมด รวมไว้ที่เดียวเพื่อไม่ให้พิมพ์ผิดแล้วเงียบ */
export const FLAGS = {
  heardCrystalBroke: 'heard-crystal-broke',
  helpedVillage: 'helped-village',
  crossedBridge: 'crossed-bridge',
  metSquirrel: 'met-squirrel',
  foundFirstShard: 'found-first-shard',
  learnedGuardianName: 'learned-guardian-name',
  sawDragonShadow: 'saw-dragon-shadow',
  wonFirstBattle: 'won-first-battle',
  reachedPeak: 'reached-peak',
  crystalRestored: 'crystal-restored',
} as const

export const STORY_BEATS: StoryBeat[] = [
  {
    id: 'b1-open',
    stageId: 'world-1-stage-1',
    moment: 'before',
    npcId: 'elder',
    title: 'คืนที่คริสตัลแตก',
    lines: [
      'เมื่อคืนนี้เอง คริสตัลแห่งความรู้ที่อยู่กลางหมู่บ้านแตกออกเป็นเสี่ยง',
      'เศษของมันกระเด็นหายไปทั่วทั้งหกโลก',
      'ตั้งแต่นั้นมา ตัวเลขในหมู่บ้านก็เริ่มสับสน นับของยังไงก็ไม่ตรงสักที',
      'เจ้าคือคนเดียวที่ยังนับได้ถูก ช่วยข้าตรวจเสบียงก่อนนะ',
    ],
    grantsFlag: FLAGS.heardCrystalBroke,
  },
  {
    id: 'b1-after',
    stageId: 'world-1-stage-1',
    moment: 'after',
    npcId: 'elder',
    title: 'ตัวเลขกลับมาตรง',
    lines: [
      'เสบียงตรงแล้ว! ชาวบ้านโล่งใจกันใหญ่',
      'เห็นไหม พอมีคนนับถูกสักคน ทุกอย่างก็เริ่มเข้าที่',
      'ทางเหนือมีสะพานเก่าอยู่ ถ้าข้ามไปได้ เจ้าอาจเจอเศษคริสตัลชิ้นแรก',
    ],
    grantsFlag: FLAGS.helpedVillage,
  },
  {
    id: 'b2-after',
    stageId: 'world-1-stage-2',
    moment: 'after',
    npcId: 'squirrel',
    title: 'เพื่อนตัวจิ๋ว',
    lines: [
      'จี๊ด! เจ้ากระรอกน้อยกระโดดขึ้นมาเกาะไหล่',
      'มันชี้ไปที่โพรงไม้ ข้างในมีเศษแก้วเปล่งแสงอ่อน ๆ อยู่',
      'เศษคริสตัลชิ้นแรก! มันอุ่น ๆ อยู่ในมือ',
    ],
    grantsFlag: FLAGS.crossedBridge,
  },
  {
    id: 'b3-after',
    stageId: 'world-1-stage-3',
    moment: 'after',
    title: 'ฝนตัวเลข',
    lines: [
      'ตัวเลขร่วงลงมาจากฟ้าเหมือนสายฝน',
      'จี๊ดกระโดดรับด้วยความตื่นเต้น แต่รับผิดทีไรก็ร้องเอี๊ยดทุกที',
      'ดูเหมือนเศษคริสตัลที่กระจายอยู่ กำลังทำให้ตัวเลขในโลกนี้ปลิวว่อน',
    ],
    grantsFlag: FLAGS.metSquirrel,
  },
  {
    id: 'b4-after',
    stageId: 'world-1-stage-4',
    moment: 'after',
    npcId: 'mage',
    title: 'กระจกที่จำได้',
    lines: [
      'มาโนชนักเวทเดินออกมาจากหลังต้นไม้',
      '"กระจกพวกนี้จำคู่ของมันได้เสมอ" เขาว่า',
      '"เศษคริสตัลก็เหมือนกัน มันอยากกลับไปหาชิ้นอื่น ๆ"',
      'เขายื่นเศษที่สองให้ แล้วชี้ไปทางป่าลึก',
    ],
    grantsFlag: FLAGS.foundFirstShard,
  },
  {
    id: 'b5-before',
    stageId: 'world-1-stage-5',
    moment: 'before',
    npcId: 'guardian',
    title: 'ผู้พิทักษ์ตื่นขึ้น',
    lines: [
      'พื้นดินสั่น มีเงาใหญ่ยืนขวางทางอยู่',
      '"ข้าคือผู้พิทักษ์จำนวน" มันพูดเสียงก้อง',
      '"ถ้าเจ้าจะเอาเศษคริสตัลไป เจ้าต้องพิสูจน์ว่าเจ้าคำนวณได้จริง"',
    ],
    grantsFlag: FLAGS.learnedGuardianName,
  },
  {
    id: 'b5-after',
    stageId: 'world-1-stage-5',
    moment: 'after',
    npcId: 'guardian',
    title: 'ผู้พิทักษ์ยอมรับ',
    lines: [
      'ผู้พิทักษ์ค่อย ๆ คุกเข่าลง',
      '"เจ้าคำนวณได้จริง ข้ายอมรับ"',
      '"แต่ระวังไว้ ในถ้ำลึกมีบางอย่างที่เก็บเศษไว้เยอะกว่าข้ามาก"',
      'มันเงยหน้ามองไปทางภูเขา ดวงตาเต็มไปด้วยความกังวล',
    ],
    grantsFlag: FLAGS.wonFirstBattle,
  },
  {
    id: 'b6-after',
    stageId: 'world-1-stage-6',
    moment: 'after',
    npcId: 'explorer',
    title: 'สะพานที่ต่อกลับ',
    lines: [
      'ใบเตยนักสำรวจผูกเชือกเส้นสุดท้ายเสร็จพอดี',
      '"ฉันเดินทางนี้มาสิบปี ไม่เคยเห็นสะพานขาดแบบนี้เลย"',
      '"ตั้งแต่คริสตัลแตก ของที่เคยต่อกันก็หลุดจากกันหมด"',
    ],
  },
  {
    id: 'b7-after',
    stageId: 'world-1-stage-7',
    moment: 'after',
    title: 'ยอดหอคอย',
    lines: [
      'จากยอดหอคอย มองเห็นได้ไกลจนสุดขอบฟ้า',
      'แสงเล็ก ๆ กะพริบอยู่หลายจุด กระจายไปทั่วทุกโลก',
      'นั่นคือเศษคริสตัลที่เหลือ ยังมีอีกเยอะมาก',
    ],
    grantsFlag: FLAGS.reachedPeak,
  },
  {
    id: 'b8-after',
    stageId: 'world-1-stage-8',
    moment: 'after',
    npcId: 'mage',
    title: 'ประตูหินเปิดออก',
    lines: [
      'แผ่นศิลาเข้าที่ ประตูเลื่อนเปิดออกช้า ๆ',
      'ลมเย็นพัดออกมาจากข้างใน พร้อมกลิ่นควันจาง ๆ',
      'มาโนชหน้าซีดลง "กลิ่นนี้... มังกร"',
    ],
    grantsFlag: FLAGS.sawDragonShadow,
  },
  {
    id: 'b10-after',
    stageId: 'world-1-stage-10',
    moment: 'after',
    npcId: 'elder',
    title: 'เศษแรกกลับบ้าน',
    lines: [
      'เจ้าวางเศษคริสตัลทั้งหมดที่เก็บมาลงบนแท่นกลางหมู่บ้าน',
      'มันเรืองแสงขึ้นพร้อมกัน แล้วค่อย ๆ เชื่อมติดกันเป็นชิ้นเดียว',
      'ยังไม่เต็มดวง แต่หมู่บ้านสว่างขึ้นกว่าเดิมมาก',
      'ปราชญ์เฒ่ายิ้ม "นี่เพิ่งโลกแรกเองนะ ยังเหลืออีกห้าโลก"',
    ],
    grantsFlag: FLAGS.crystalRestored,
  },
]

export const STORY_CHAPTERS: StoryChapter[] = [
  {
    id: 'chapter-1',
    worldId: 'world-1',
    title: 'บทที่ 1 · ป่าจำนวนมหัศจรรย์',
    summary: 'คริสตัลแห่งความรู้แตกเป็นเสี่ยง การตามหาเศษชิ้นแรกจึงเริ่มขึ้น',
    beatIds: STORY_BEATS.filter((beat) => beat.stageId.startsWith('world-1')).map(
      (beat) => beat.id,
    ),
  },
]

/**
 * บทพูดของ NPC ที่เปลี่ยนตามความคืบหน้า
 *
 * เรียงจากเงื่อนไขมากไปน้อย ตัวเลือกแรกที่ผ่านเงื่อนไขคือประโยคที่ใช้
 * ทำให้ประโยคใหม่ทับประโยคเก่าเองโดยไม่ต้องเขียน if ซ้อนกัน
 */
export const NPC_LINES: NpcLine[] = [
  {
    npcId: 'elder',
    requiresFlags: [FLAGS.crystalRestored],
    text: 'เจ้าทำได้จริง ๆ ข้าภูมิใจมาก พักก่อนนะ แล้วค่อยไปโลกต่อไป',
  },
  {
    npcId: 'elder',
    requiresFlags: [FLAGS.reachedPeak],
    text: 'เจ้าขึ้นไปถึงยอดหอคอยแล้วสินะ เห็นแสงพวกนั้นหรือเปล่า',
  },
  {
    npcId: 'elder',
    requiresFlags: [FLAGS.helpedVillage],
    text: 'ชาวบ้านยังพูดถึงเจ้าอยู่เลย ขอบใจที่ช่วยนับเสบียงให้',
  },
  {
    npcId: 'elder',
    text: 'ระวังตัวด้วยนะ ตั้งแต่คริสตัลแตก อะไร ๆ ก็ไม่เหมือนเดิม',
  },

  {
    npcId: 'squirrel',
    requiresFlags: [FLAGS.wonFirstBattle],
    text: 'จี๊ด! (มันกระโดดดีใจ แล้วชี้ไปทางถ้ำอย่างกล้าหาญกว่าเดิม)',
  },
  {
    npcId: 'squirrel',
    requiresFlags: [FLAGS.crossedBridge],
    text: 'จี๊ด จี๊ด! (มันเอาลูกโอ๊กมาให้ ดูเหมือนอยากเป็นเพื่อนด้วย)',
  },
  {
    npcId: 'squirrel',
    text: 'จี๊ด? (มันมองเจ้าอย่างระแวง แล้วซ่อนตัวหลังต้นไม้)',
  },

  {
    npcId: 'mage',
    requiresFlags: [FLAGS.sawDragonShadow],
    text: 'กลิ่นควันนั่นยังติดจมูกข้าอยู่เลย เตรียมตัวให้ดีก่อนเข้าถ้ำนะ',
  },
  {
    npcId: 'mage',
    requiresFlags: [FLAGS.foundFirstShard],
    text: 'เศษคริสตัลอยากกลับไปหากันเสมอ เก็บให้ครบแล้วมันจะรวมกันเอง',
  },
  {
    npcId: 'mage',
    text: 'สูตรคูณคือเวทมนตร์ที่แข็งแรงที่สุด จำไว้นะ',
  },

  {
    npcId: 'guardian',
    requiresFlags: [FLAGS.wonFirstBattle],
    text: 'ข้ายอมรับเจ้าแล้ว ถ้าต้องการฝึกอีก ข้ายินดีเป็นคู่ซ้อมให้',
  },
  {
    npcId: 'guardian',
    text: 'อย่าเพิ่งเข้ามา จนกว่าเจ้าจะพิสูจน์ว่าคำนวณได้จริง',
  },

  {
    npcId: 'explorer',
    requiresFlags: [FLAGS.reachedPeak],
    text: 'ขึ้นไปถึงยอดได้แล้วเหรอ เก่งกว่าฉันตอนอายุเท่านั้นอีก',
  },
  {
    npcId: 'explorer',
    text: 'เส้นทางในป่านี้ฉันจำได้หมด ถามได้เลยถ้าหลง',
  },
]
