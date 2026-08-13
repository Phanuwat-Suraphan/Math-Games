export interface Npc {
  id: string
  name: string
  avatar: string
  role: string
}

/**
 * ตัวละครผู้ช่วยในเกม
 * Part 3 ใช้แค่แสดงชื่อและบทพูดสั้น ๆ ก่อนเริ่มด่าน
 * ระบบบทสนทนาเต็มรูปแบบจะทำใน Part ถัดไป
 */
export const NPCS: Npc[] = [
  {
    id: 'elder',
    name: 'ปราชญ์เฒ่า',
    avatar: '👴',
    role: 'ผู้เฝ้าตำราแห่งหมู่บ้าน',
  },
  {
    id: 'explorer',
    name: 'ใบเตย นักสำรวจ',
    avatar: '👧',
    role: 'รู้จักทุกเส้นทางในป่า',
  },
  {
    id: 'mage',
    name: 'มาโนช นักเวท',
    avatar: '🧙',
    role: 'ร่ายเวทด้วยสูตรคูณ',
  },
  {
    id: 'squirrel',
    name: 'จี๊ด กระรอกน้อย',
    avatar: '🐿️',
    role: 'เพื่อนร่วมทางตัวจิ๋ว',
  },
  {
    id: 'guardian',
    name: 'ผู้พิทักษ์จำนวน',
    avatar: '🐲',
    role: 'มินิบอสผู้เฝ้าคริสตัล',
  },
]

const NPC_BY_ID = new Map<string, Npc>(NPCS.map((npc) => [npc.id, npc]))

export function getNpc(npcId: string | undefined): Npc | undefined {
  if (!npcId) return undefined
  return NPC_BY_ID.get(npcId)
}
