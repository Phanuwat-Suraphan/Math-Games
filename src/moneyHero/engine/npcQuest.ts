import type { Difficulty, Question } from './types'
import type { Player } from './progress'
import { generate } from '../generators'
import { dayKey } from './daily'

/**
 * ภารกิจเสริมจากเพื่อนในเมือง: คุยกับเพื่อนบนแผนที่ แล้วรับโจทย์ 1 ข้อตามความถนัดของเพื่อนคนนั้น
 * เพื่อนแต่ละคนให้ภารกิจได้วันละครั้ง ตอบถูก (ภายใน 2 ครั้ง) ได้เหรียญ
 */

export type QuestNpc = 'rabbit' | 'fox' | 'bear' | 'owl'

export const NPC_QUESTS: Record<QuestNpc, { gen: string; d: Difficulty; ask: string }> = {
  rabbit: { gen: 'countMoney', d: 1, ask: 'ช่วยกระต่ายนับเงินในกระปุกหน่อยได้ไหม?' },
  fox: { gen: 'compare', d: 1, ask: 'จิ้งจอกมีปริศนาเปรียบเทียบเงินมาท้า กล้าไหม?' },
  bear: { gen: 'subtract', d: 1, ask: 'ลุงหมีคิดเงินทอนไม่ทัน ช่วยหน่อยนะ!' },
  owl: { gen: 'incomeExpense', d: 1, ask: 'นกฮูกจดบัญชีอยู่ ช่วยคิดเงินคงเหลือหน่อย' },
}

export const QUEST_REWARD = { coins: 8, exp: 10 }

export function isQuestNpc(id: string): id is QuestNpc {
  return id in NPC_QUESTS
}

export function questAvailable(p: Player, npc: QuestNpc, today = dayKey()): boolean {
  return p.npcQuests[npc] !== today
}

export function makeQuest(npc: QuestNpc): Question {
  const q = NPC_QUESTS[npc]
  return { ...generate(q.gen, q.d)[0], npc }
}

/** บันทึกว่าทำภารกิจของเพื่อนคนนี้แล้ววันนี้ (ได้รางวัลถ้าตอบถูก) */
export function recordQuest(p: Player, npc: QuestNpc, success: boolean, today = dayKey()): Player {
  if (!questAvailable(p, npc, today)) return p
  const reward = success ? QUEST_REWARD : { coins: 0, exp: 0 }
  return {
    ...p,
    coins: p.coins + reward.coins,
    exp: p.exp + reward.exp,
    npcQuests: { ...p.npcQuests, [npc]: today },
    questsDone: p.questsDone + (success ? 1 : 0),
  }
}
