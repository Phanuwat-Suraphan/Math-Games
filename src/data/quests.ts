import type { Quest } from '../types/quest'

/**
 * ภารกิจหลักและภารกิจเสริม
 * เพิ่มภารกิจใหม่ได้โดยเติมในไฟล์นี้ Quest Log และระบบนับความคืบหน้าจะรับรู้เอง
 */
export const QUESTS: Quest[] = [
  // ── ภารกิจหลักตามเนื้อเรื่อง World 1 ──────────────────────────
  {
    id: 'quest-w1-main-1',
    title: 'ตามหาคริสตัลแห่งการคำนวณ',
    description: 'ช่วยชาวบ้านเริ่มต้นการเดินทาง ด้วยการผ่านด่านแรกของป่า',
    worldId: 'world-1',
    stageId: 'world-1-stage-1',
    type: 'story',
    category: 'main',
    npcId: 'elder',
    dialogue:
      'ผู้กล้า คริสตัลแห่งการคำนวณหายไปจากหมู่บ้าน! เริ่มจากช่วยข้าตรวจนับเสบียงก่อนนะ',
    requirements: [
      {
        type: 'completeStage',
        target: 1,
        stageId: 'world-1-stage-1',
        label: 'ผ่านด่าน หมู่บ้านตัวเลข',
      },
    ],
    reward: { exp: 40, coins: 20 },
  },
  {
    id: 'quest-w1-main-2',
    title: 'ข้ามป่าให้ถึงกลางดง',
    description: 'เดินทางผ่านสะพาน หุบเขา และป่าการคูณ',
    worldId: 'world-1',
    type: 'story',
    category: 'main',
    npcId: 'explorer',
    dialogue: 'เส้นทางข้างหน้าชันขึ้นเรื่อย ๆ นะ แต่ฉันเชื่อว่าเธอทำได้!',
    requirements: [
      {
        type: 'completeStage',
        target: 1,
        stageId: 'world-1-stage-4',
        label: 'ผ่านด่าน ป่าการคูณ',
      },
    ],
    reward: { exp: 80, coins: 35 },
  },
  {
    id: 'quest-w1-main-3',
    title: 'เผชิญหน้าผู้พิทักษ์',
    description: 'ไปให้ถึงยอดป่าและเอาชนะผู้พิทักษ์จำนวน',
    worldId: 'world-1',
    stageId: 'world-1-stage-10',
    type: 'story',
    category: 'main',
    npcId: 'guardian',
    dialogue: 'มาถึงจนได้ เจ้าพร้อมจะพิสูจน์ตัวเองแล้วหรือยัง',
    requirements: [
      {
        type: 'completeStage',
        target: 1,
        stageId: 'world-1-stage-10',
        label: 'ผ่านด่าน ผู้พิทักษ์จำนวน',
      },
    ],
    reward: { exp: 150, coins: 60 },
  },

  // ── ภารกิจเสริม ─────────────────────────────────────────────
  {
    id: 'quest-w1-side-fruit',
    title: 'ช่วยชาวบ้านเก็บผลไม้',
    description: 'นับผลไม้ในสวนด้วยการคูณให้ครบ 5 ข้อ',
    worldId: 'world-1',
    type: 'practice',
    category: 'side',
    npcId: 'squirrel',
    dialogue: 'ผลไม้เยอะมากเลย! ช่วยจี๊ดนับหน่อยได้ไหม',
    requirements: [
      {
        type: 'answerSkill',
        target: 5,
        skill: 'multiplication',
        label: 'ตอบโจทย์การคูณถูก 5 ข้อ',
      },
    ],
    reward: { exp: 30, coins: 15 },
  },
  {
    id: 'quest-w1-side-share',
    title: 'แบ่งเสบียงให้เท่ากัน',
    description: 'ใช้การหารช่วยแบ่งของให้ชาวบ้านอย่างยุติธรรม',
    worldId: 'world-1',
    type: 'practice',
    category: 'side',
    npcId: 'elder',
    dialogue: 'ของมีจำกัด ต้องแบ่งให้ทุกคนได้เท่ากันนะ',
    requirements: [
      {
        type: 'answerSkill',
        target: 8,
        skill: 'division',
        label: 'ตอบโจทย์การหารถูก 8 ข้อ',
      },
    ],
    reward: { exp: 45, coins: 20 },
  },
  {
    id: 'quest-w1-side-streak',
    title: 'สมาธิของนักคำนวณ',
    description: 'ตอบถูกติดต่อกันให้ได้ 5 ข้อ',
    worldId: 'world-1',
    type: 'challenge',
    category: 'side',
    npcId: 'mage',
    dialogue: 'เวทมนตร์ที่แรงที่สุดคือสมาธิ ลองตอบให้ถูกติดกันดูสิ',
    requirements: [
      { type: 'bestStreak', target: 5, label: 'ตอบถูกติดต่อกัน 5 ข้อ' },
    ],
    reward: { exp: 35, coins: 18 },
  },
  {
    id: 'quest-w1-side-accuracy',
    title: 'แม่นยำดั่งธนู',
    description: 'ทำโจทย์ให้ครบ 20 ข้อ โดยรักษาความแม่นยำไว้ที่ 80%',
    worldId: 'world-1',
    type: 'challenge',
    category: 'side',
    npcId: 'explorer',
    dialogue: 'ไม่ต้องรีบนะ ตอบให้แม่นสำคัญกว่าตอบให้เร็ว',
    requirements: [
      { type: 'answerCorrect', target: 20, label: 'ตอบถูกรวม 20 ข้อ' },
      { type: 'accuracy', target: 80, label: 'ความแม่นยำรวม 80% ขึ้นไป' },
    ],
    reward: { exp: 60, coins: 25 },
  },
  {
    id: 'quest-w1-side-stars',
    title: 'นักสะสมดาว',
    description: 'เก็บดาวจากด่านต่าง ๆ ให้ได้ 12 ดวง',
    worldId: 'world-1',
    type: 'challenge',
    category: 'side',
    npcId: 'squirrel',
    dialogue: 'ดาวสวย ๆ พวกนี้เก็บได้จากการทำด่านให้แม่นยำนะ',
    requirements: [
      { type: 'earnStars', target: 12, label: 'สะสมดาวรวม 12 ดวง' },
    ],
    reward: { exp: 70, coins: 30 },
  },
  {
    id: 'quest-w1-side-coins',
    title: 'กระเป๋าตุง',
    description: 'สะสมเหรียญให้ได้ 300 เหรียญ',
    worldId: 'world-1',
    type: 'practice',
    category: 'side',
    npcId: 'elder',
    dialogue: 'เหรียญพวกนี้จะมีประโยชน์มากในการเดินทางข้างหน้า',
    requirements: [
      { type: 'collectCoins', target: 300, label: 'มีเหรียญสะสม 300 เหรียญ' },
    ],
    reward: { exp: 40, coins: 20 },
  },
]

/*
 * ── ภารกิจของโหมดที่จบในรอบเดียว ─────────────────────────────
 *
 * ทุกข้อในกลุ่มนี้วัดจากสมุดสถิติ ซึ่งเก็บค่าสะสมถาวร
 * จึงต้องเป็นภารกิจถาวรเท่านั้น ห้ามเอาไปใส่ในภารกิจประจำวันเด็ดขาด
 *
 * เหตุผล: ภารกิจประจำวันรีเซ็ตด้วยการล้างตัวนับของตัวเอง
 * แต่สมุดสถิติไม่ได้รีเซ็ตตามไปด้วย เงื่อนไขที่อ่านจากสมุดสถิติ
 * จึงจะค้างเป็น "สำเร็จแล้ว" ตลอดไปตั้งแต่วันที่ผ่านครั้งแรก
 * และเด็กจะได้รางวัลประจำวันฟรีทุกวันโดยไม่ต้องทำอะไรเลย
 *
 * มีชุดทดสอบบังคับกฎข้อนี้ไว้แล้ว จะได้ไม่พลาดตอนเพิ่มภารกิจใหม่
 */
const ARENA_QUESTS: Quest[] = [
  {
    id: 'quest-arena-first',
    title: 'ก้าวแรกในสนามรบ',
    description: 'ลองลงสนามรบตัวเลข แล้วรอดให้ได้หนึ่งนาที',
    worldId: 'world-1',
    type: 'practice',
    category: 'side',
    npcId: 'explorer',
    dialogue: 'สนามรบเปิดแล้วนะ! ไม่ต้องกดยิงเลย แค่เดินหลบให้เก่งพอ',
    requirements: [
      { type: 'survivorTime', target: 60, label: 'รอดในสนามรบ 60 วินาที' },
    ],
    reward: { exp: 50, coins: 30 },
  },
  {
    id: 'quest-arena-three-minutes',
    title: 'ยืนหยัดสามนาที',
    description: 'รอดในสนามรบให้ได้สามนาทีในรอบเดียว',
    worldId: 'world-1',
    type: 'challenge',
    category: 'side',
    npcId: 'mage',
    dialogue: 'สามนาทีนี่ไม่ใช่เรื่องเล่น ๆ นะ เลือกสกิลให้ดี ๆ',
    requirements: [
      { type: 'survivorTime', target: 180, label: 'รอดในสนามรบ 180 วินาที' },
    ],
    reward: { exp: 90, coins: 70 },
  },
  {
    id: 'quest-arena-kills',
    title: 'กวาดสนามให้เรียบ',
    description: 'ล้มมอนสเตอร์ในสนามรบรวมกัน 300 ตัว',
    worldId: 'world-1',
    type: 'practice',
    category: 'side',
    npcId: 'squirrel',
    requirements: [
      { type: 'survivorKills', target: 300, label: 'ล้มมอนสเตอร์ 300 ตัว' },
    ],
    reward: { exp: 70, coins: 50 },
  },
  {
    id: 'quest-arena-boss',
    title: 'ล่าบอสห้าตัว',
    description: 'ล้มบอสในสนามรบให้ได้ห้าตัว',
    worldId: 'world-1',
    type: 'challenge',
    category: 'side',
    npcId: 'elder',
    dialogue: 'บอสโผล่ทุกหนึ่งนาที ล้มได้จะมีหีบสมบัติตกให้ด้วยนะ',
    requirements: [
      { type: 'survivorBossKills', target: 5, label: 'ล้มบอส 5 ตัว' },
    ],
    reward: { exp: 110, coins: 90 },
  },
  {
    id: 'quest-arena-evolve',
    title: 'ปลุกร่างสมบูรณ์',
    description: 'ทำให้อาวุธกลายเป็นร่างสมบูรณ์ให้ได้สองแบบ',
    worldId: 'world-1',
    type: 'challenge',
    category: 'side',
    npcId: 'mage',
    dialogue:
      'อาวุธที่อัปจนสุดแล้ว ถ้าเจอหีบสมบัติกับสกิลที่ถูกคู่ จะกลายร่างได้',
    requirements: [
      { type: 'survivorEvolutions', target: 2, label: 'ปลุกร่างสมบูรณ์ 2 แบบ' },
    ],
    reward: { exp: 130, coins: 110 },
  },
  {
    id: 'quest-duel-win',
    title: 'ผ่าสมการให้ลงตัว',
    description: 'ชนะศึกผ่าสมการให้ได้สามครั้ง',
    worldId: 'world-1',
    type: 'challenge',
    category: 'side',
    npcId: 'elder',
    dialogue:
      'เกมนี้ต้องคิดเรื่องตัวประกอบให้ขาด สมการที่หารลงตัวเท่านั้นถึงจะทำดาเมจ',
    requirements: [
      { type: 'duelWins', target: 3, label: 'ชนะศึกผ่าสมการ 3 ครั้ง' },
    ],
    reward: { exp: 100, coins: 80 },
  },
  {
    id: 'quest-duel-brave',
    title: 'ไม่ยอมแพ้ง่าย ๆ',
    description: 'ลงศึกผ่าสมการรวม 10 ตา ไม่ว่าจะแพ้หรือชนะ',
    worldId: 'world-1',
    type: 'practice',
    category: 'side',
    npcId: 'squirrel',
    /*
     * นับตาที่เล่น ไม่ใช่ตาที่ชนะ โดยตั้งใจ
     * ภารกิจที่นับแต่ชัยชนะจะลงโทษเด็กที่กล้าลองกับคู่ต่อสู้ที่ยากกว่า
     * ทั้งที่การกล้าลองคือสิ่งที่เราอยากให้เกิดที่สุด
     */
    requirements: [
      { type: 'duelPlays', target: 10, label: 'ลงศึกผ่าสมการ 10 ตา' },
    ],
    reward: { exp: 60, coins: 45 },
  },
  {
    id: 'quest-tower-climb',
    title: 'ไต่หอคอยให้ถึงชั้นแปด',
    description: 'ขึ้นหอคอยไม่รู้จบให้ถึงชั้น 8',
    worldId: 'world-1',
    type: 'challenge',
    category: 'side',
    npcId: 'explorer',
    requirements: [
      { type: 'towerFloor', target: 8, label: 'ขึ้นถึงชั้น 8' },
    ],
    reward: { exp: 85, coins: 65 },
  },
  {
    id: 'quest-perk-invest',
    title: 'ลงทุนกับพลังถาวร',
    description: 'ซื้อพลังถาวรของสนามรบรวมกันห้าชั้น',
    worldId: 'world-1',
    type: 'practice',
    category: 'side',
    npcId: 'mage',
    dialogue: 'พลังถาวรซื้อครั้งเดียวติดตัวทุกรอบ คุ้มกว่าที่คิดนะ',
    requirements: [
      { type: 'perkLevels', target: 5, label: 'ซื้อพลังถาวรรวม 5 ชั้น' },
    ],
    reward: { exp: 70, coins: 40 },
  },
  {
    id: 'quest-upgrade-stars',
    title: 'ช่างตีเหล็กฝึกหัด',
    description: 'ตีบวกของสวมใส่ให้ได้รวมกันหกดาว',
    worldId: 'world-1',
    type: 'practice',
    category: 'side',
    npcId: 'elder',
    dialogue: 'ของชิ้นเก่าไม่ใช่ของทิ้งนะ ตีบวกแล้วใช้ได้ยาวเลย',
    requirements: [
      { type: 'upgradeStars', target: 6, label: 'ตีบวกรวม 6 ดาว' },
    ],
    reward: { exp: 65, coins: 40 },
  },
  {
    id: 'quest-avatar-team',
    title: 'หาเพื่อนร่วมทาง',
    description: 'ปลดล็อกตัวละครให้มีสองตัว',
    worldId: 'world-1',
    type: 'practice',
    category: 'side',
    npcId: 'squirrel',
    requirements: [
      { type: 'ownAvatars', target: 2, label: 'มีตัวละคร 2 ตัว' },
    ],
    reward: { exp: 55, coins: 35 },
  },
]


/**
 * คลังภารกิจประจำวัน ระบบจะสุ่มเลือกมาให้ทุกวัน
 * เก็บแยกจาก QUESTS เพราะความคืบหน้าจะถูกรีเซ็ตเมื่อขึ้นวันใหม่
 */
export const DAILY_QUESTS: Quest[] = [
  {
    id: 'daily-answer-10',
    title: 'อุ่นเครื่องประจำวัน',
    description: 'ตอบโจทย์ให้ถูก 10 ข้อในวันนี้',
    worldId: 'world-1',
    type: 'daily',
    category: 'daily',
    npcId: 'squirrel',
    requirements: [
      { type: 'answerCorrect', target: 10, label: 'ตอบถูก 10 ข้อวันนี้' },
    ],
    reward: { exp: 30, coins: 15 },
  },
  {
    id: 'daily-streak-5',
    title: 'ต่อเนื่องประจำวัน',
    description: 'ตอบถูกติดต่อกัน 5 ข้อในวันนี้',
    worldId: 'world-1',
    type: 'daily',
    category: 'daily',
    npcId: 'mage',
    requirements: [
      { type: 'bestStreak', target: 5, label: 'ตอบถูกติดกัน 5 ข้อวันนี้' },
    ],
    reward: { exp: 25, coins: 12 },
  },
  {
    id: 'daily-multiplication-8',
    title: 'ฝึกสูตรคูณประจำวัน',
    description: 'ตอบโจทย์การคูณถูก 8 ข้อในวันนี้',
    worldId: 'world-1',
    type: 'daily',
    category: 'daily',
    npcId: 'mage',
    requirements: [
      {
        type: 'answerSkill',
        target: 8,
        skill: 'multiplication',
        label: 'ตอบโจทย์การคูณถูก 8 ข้อวันนี้',
      },
    ],
    reward: { exp: 30, coins: 15 },
  },
  {
    id: 'daily-division-8',
    title: 'ฝึกการหารประจำวัน',
    description: 'ตอบโจทย์การหารถูก 8 ข้อในวันนี้',
    worldId: 'world-1',
    type: 'daily',
    category: 'daily',
    npcId: 'elder',
    requirements: [
      {
        type: 'answerSkill',
        target: 8,
        skill: 'division',
        label: 'ตอบโจทย์การหารถูก 8 ข้อวันนี้',
      },
    ],
    reward: { exp: 30, coins: 15 },
  },
  {
    /*
     * ชื่อเดิมคือ "ผจญภัยประจำวัน" และคำอธิบายบอกว่าให้เล่นด่านจบหนึ่งด่าน
     * แต่เงื่อนไขที่วัดจริงคือตอบถูกห้าข้อ ซึ่งคนละอย่างกัน
     * เด็กที่อ่านแล้วไปเล่นด่านจนจบจะเห็นภารกิจขึ้นเองตั้งแต่กลางด่าน
     * หรือแย่กว่านั้นคือเล่นด่านที่มีน้อยข้อแล้วภารกิจไม่ขึ้น
     * แก้ที่ชื่อกับคำอธิบายให้ตรงกับที่วัด ไม่ใช่แก้ที่การวัด
     * เพราะ "เล่นจบหนึ่งด่านใดก็ได้" ยังไม่มีวิธีวัดในระบบตอนนี้
     */
    id: 'daily-stage-1',
    title: 'อุ่นเครื่องสั้น ๆ ประจำวัน',
    description: 'ตอบโจทย์ให้ถูก 5 ข้อในวันนี้',
    worldId: 'world-1',
    type: 'daily',
    category: 'daily',
    npcId: 'explorer',
    requirements: [
      { type: 'answerCorrect', target: 5, label: 'ตอบถูก 5 ข้อวันนี้' },
    ],
    reward: { exp: 20, coins: 10 },
  },
]

/** จำนวนภารกิจประจำวันที่แจกในแต่ละวัน */
export const DAILY_QUEST_COUNT = 2

export const ALL_QUESTS: Quest[] = [...QUESTS, ...ARENA_QUESTS, ...DAILY_QUESTS]

const QUEST_BY_ID = new Map<string, Quest>(
  ALL_QUESTS.map((quest) => [quest.id, quest]),
)

export function getQuest(questId: string): Quest | undefined {
  return QUEST_BY_ID.get(questId)
}

export function getQuestsByWorld(worldId: string): Quest[] {
  return QUESTS.filter((quest) => quest.worldId === worldId)
}
