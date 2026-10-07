import type { Difficulty, Question } from './types'
import type { Player } from './progress'
import { generate } from '../generators'
import { dayKey } from './daily'
import { earn } from './ledger'

/**
 * ภารกิจเสริมจากเพื่อนในเมือง: คุยกับเพื่อนบนแผนที่ แล้วรับโจทย์ 1 ข้อตามความถนัดของเพื่อนคนนั้น
 * เพื่อนแต่ละคนให้ภารกิจได้วันละครั้ง ตอบถูก (ภายใน 2 ครั้ง) ได้เหรียญ
 */

export type QuestNpc = 'rabbit' | 'fox' | 'bear' | 'owl'

export const NPC_QUESTS: Record<QuestNpc, { gen: string; d: Difficulty; ask: string; name: string; icon: string }> = {
  rabbit: { gen: 'countMoney', d: 1, ask: 'ช่วยกระต่ายนับเงินในกระปุกหน่อยได้ไหม?', name: 'กระต่าย', icon: '🐰' },
  fox: { gen: 'compare', d: 1, ask: 'จิ้งจอกมีปริศนาเปรียบเทียบเงินมาท้า กล้าไหม?', name: 'จิ้งจอก', icon: '🦊' },
  bear: { gen: 'subtract', d: 1, ask: 'ลุงหมีคิดเงินทอนไม่ทัน ช่วยหน่อยนะ!', name: 'ลุงหมี', icon: '🐻' },
  owl: { gen: 'incomeExpense', d: 1, ask: 'นกฮูกจดบัญชีอยู่ ช่วยคิดเงินคงเหลือหน่อย', name: 'นกฮูก', icon: '🦉' },
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
  const paid = earn(p, reward.coins, `ช่วย${NPC_QUESTS[npc].name}`, NPC_QUESTS[npc].icon)
  return {
    ...paid,
    exp: p.exp + reward.exp,
    npcQuests: { ...p.npcQuests, [npc]: today },
    questsDone: p.questsDone + (success ? 1 : 0),
  }
}
