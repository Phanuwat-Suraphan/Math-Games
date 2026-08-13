import type { World } from '../types/world'

export const WORLDS: World[] = [
  {
    id: 'world-1',
    order: 1,
    name: 'ป่าจำนวนมหัศจรรย์',
    topic: 'จำนวนและการคำนวณ',
    description: 'ป่าใหญ่ที่เต็มไปด้วยตัวเลข บวก ลบ คูณ หาร รอให้หนูมาปราบ',
    emoji: '🌳',
    theme: {
      gradient: 'from-leaf-500 to-emerald-700',
      ring: 'ring-leaf-400',
      badge: 'bg-leaf-500',
    },
    unlockAfterWorldId: null,
  },
  {
    id: 'world-2',
    order: 2,
    name: 'ปราสาทเศษส่วน',
    topic: 'เศษส่วน',
    description: 'ปราสาทลึกลับที่ทุกประตูถูกแบ่งออกเป็นส่วน ๆ',
    emoji: '🏰',
    theme: {
      gradient: 'from-arcane-500 to-indigo-700',
      ring: 'ring-arcane-400',
      badge: 'bg-arcane-500',
    },
    unlockAfterWorldId: 'world-1',
  },
  {
    id: 'world-3',
    order: 3,
    name: 'ทะเลทรายทศนิยม',
    topic: 'ทศนิยม',
    description: 'ทะเลทรายกว้างใหญ่ที่ซ่อนจุดทศนิยมไว้ใต้เม็ดทราย',
    emoji: '🏜️',
    theme: {
      gradient: 'from-gold-400 to-orange-600',
      ring: 'ring-gold-300',
      badge: 'bg-gold-500',
    },
    unlockAfterWorldId: 'world-2',
  },
  {
    id: 'world-4',
    order: 4,
    name: 'เมืองร้อยละ',
    topic: 'ร้อยละ',
    description: 'เมืองการค้าที่ทุกป้ายราคามีส่วนลดเป็นเปอร์เซ็นต์',
    emoji: '🏙️',
    theme: {
      gradient: 'from-sky-500 to-cyan-700',
      ring: 'ring-sky-400',
      badge: 'bg-sky-500',
    },
    unlockAfterWorldId: 'world-3',
  },
  {
    id: 'world-5',
    order: 5,
    name: 'ภูเขาเรขาคณิต',
    topic: 'เรขาคณิต',
    description: 'ยอดเขาที่เต็มไปด้วยรูปทรงและมุมแปลกตา',
    emoji: '⛰️',
    theme: {
      gradient: 'from-slate-400 to-slate-700',
      ring: 'ring-slate-300',
      badge: 'bg-slate-500',
    },
    unlockAfterWorldId: 'world-4',
  },
  {
    id: 'world-6',
    order: 6,
    name: 'ถ้ำมังกรคณิต',
    topic: 'โจทย์ปัญหา',
    description: 'ถ้ำสุดท้ายที่มังกรจะถามโจทย์ปัญหาที่ยากที่สุด',
    emoji: '🐉',
    theme: {
      gradient: 'from-ember-500 to-rose-700',
      ring: 'ring-ember-400',
      badge: 'bg-ember-500',
    },
    unlockAfterWorldId: 'world-5',
  },
]

export function getWorld(worldId: string): World | undefined {
  return WORLDS.find((world) => world.id === worldId)
}
