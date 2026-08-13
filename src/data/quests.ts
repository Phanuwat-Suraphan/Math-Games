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
    id: 'daily-stage-1',
    title: 'ผจญภัยประจำวัน',
    description: 'เล่นด่านให้จบ 1 ด่านในวันนี้',
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

export const ALL_QUESTS: Quest[] = [...QUESTS, ...DAILY_QUESTS]

const QUEST_BY_ID = new Map<string, Quest>(
  ALL_QUESTS.map((quest) => [quest.id, quest]),
)

export function getQuest(questId: string): Quest | undefined {
  return QUEST_BY_ID.get(questId)
}

export function getQuestsByWorld(worldId: string): Quest[] {
  return QUESTS.filter((quest) => quest.worldId === worldId)
}
