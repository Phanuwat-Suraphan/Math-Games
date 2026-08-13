import type { World } from '../types/world'

export const WORLDS: World[] = [
  {
    id: 'world-1',
    order: 1,
    name: 'ป่าจำนวนมหัศจรรย์',
    subtitle: 'จำนวนและการคำนวณ',
    description:
      'ป่าใหญ่ที่เต็มไปด้วยตัวเลข บวก ลบ คูณ หาร รอให้หนูมาปราบ',
    story:
      'ณ ดินแดนแห่งตัวเลข หมู่บ้านเล็ก ๆ กลางป่ากำลังเดือดร้อน เพราะคริสตัลแห่งการคำนวณหายไป ชาวบ้านคิดเลขไม่ได้อีกเลย หนูคือผู้กล้าที่จะออกตามหาคริสตัลกลับคืนมา',
    emoji: '🌳',
    difficulty: 'easy',
    skills: ['addition', 'subtraction', 'multiplication', 'division'],
    regions: [
      { id: 'w1-village', name: 'ชายป่าและหมู่บ้าน', emoji: '🏡' },
      { id: 'w1-deep', name: 'กลางป่าลึก', emoji: '🌲' },
      { id: 'w1-peak', name: 'ยอดป่าศักดิ์สิทธิ์', emoji: '🗼' },
    ],
    theme: {
      background: 'from-leaf-600/40 via-night-800 to-night-900',
      primary: 'text-leaf-400',
      secondary: 'bg-leaf-600/25',
      accent: 'border-leaf-400/50',
      path: 'bg-leaf-500/40',
    },
  },
  {
    id: 'world-2',
    order: 2,
    name: 'ปราสาทเศษส่วน',
    subtitle: 'เศษส่วน',
    description: 'ปราสาทลึกลับที่ทุกประตูถูกแบ่งออกเป็นส่วน ๆ',
    story:
      'ปราสาทโบราณหลังนี้มีประตูนับร้อย แต่ละบานเปิดได้ก็ต่อเมื่อบอกได้ว่ามันถูกแบ่งเป็นกี่ส่วน และหนูถือกุญแจอยู่กี่ส่วนของทั้งหมด',
    emoji: '🏰',
    difficulty: 'medium',
    skills: ['fractions'],
    regions: [{ id: 'w2-gate', name: 'ลานหน้าปราสาท', emoji: '🚪' }],
    theme: {
      background: 'from-arcane-600/40 via-night-800 to-night-900',
      primary: 'text-arcane-400',
      secondary: 'bg-arcane-600/25',
      accent: 'border-arcane-400/50',
      path: 'bg-arcane-500/40',
    },
    requiredWorldId: 'world-1',
  },
  {
    id: 'world-3',
    order: 3,
    name: 'ทะเลทรายทศนิยม',
    subtitle: 'ทศนิยม',
    description: 'ทะเลทรายกว้างใหญ่ที่ซ่อนจุดทศนิยมไว้ใต้เม็ดทราย',
    story:
      'ใต้ผืนทรายมีเมืองโบราณที่ทุกป้ายบอกทางเขียนด้วยทศนิยม ถ้าอ่านค่าประจำหลักผิดแม้แต่นิดเดียว ก็จะหลงทางในทะเลทรายตลอดกาล',
    emoji: '🏜️',
    difficulty: 'medium',
    skills: ['decimals'],
    regions: [{ id: 'w3-dune', name: 'เนินทรายแรก', emoji: '🐫' }],
    theme: {
      background: 'from-gold-500/40 via-night-800 to-night-900',
      primary: 'text-gold-300',
      secondary: 'bg-gold-500/25',
      accent: 'border-gold-400/50',
      path: 'bg-gold-500/40',
    },
    requiredWorldId: 'world-2',
  },
  {
    id: 'world-4',
    order: 4,
    name: 'เมืองร้อยละ',
    subtitle: 'ร้อยละ',
    description: 'เมืองการค้าที่ทุกป้ายราคามีส่วนลดเป็นเปอร์เซ็นต์',
    story:
      'ตลาดใหญ่ใจกลางเมืองติดป้ายลดราคาเต็มไปหมด พ่อค้าบางคนคิดเลขผิด หนูต้องช่วยชาวเมืองตรวจว่าป้ายไหนคุ้มจริง ป้ายไหนหลอกตา',
    emoji: '🏙️',
    difficulty: 'hard',
    skills: ['percentages'],
    regions: [{ id: 'w4-market', name: 'ตลาดกลางเมือง', emoji: '🏪' }],
    theme: {
      background: 'from-sky-600/40 via-night-800 to-night-900',
      primary: 'text-sky-400',
      secondary: 'bg-sky-600/25',
      accent: 'border-sky-400/50',
      path: 'bg-sky-500/40',
    },
    requiredWorldId: 'world-3',
  },
  {
    id: 'world-5',
    order: 5,
    name: 'ภูเขาเรขาคณิต',
    subtitle: 'เรขาคณิต',
    description: 'ยอดเขาที่เต็มไปด้วยรูปทรงและมุมแปลกตา',
    story:
      'ภูเขาลูกนี้ถูกสร้างจากรูปทรงเรขาคณิตล้วน ๆ สะพานแต่ละช่วงจะปรากฏขึ้นก็ต่อเมื่อหนูวัดมุมและหาพื้นที่ได้ถูกต้อง',
    emoji: '⛰️',
    difficulty: 'hard',
    skills: ['geometry'],
    regions: [{ id: 'w5-base', name: 'เชิงเขา', emoji: '📐' }],
    theme: {
      background: 'from-slate-500/40 via-night-800 to-night-900',
      primary: 'text-slate-200',
      secondary: 'bg-slate-500/25',
      accent: 'border-slate-300/50',
      path: 'bg-slate-400/40',
    },
    requiredWorldId: 'world-4',
  },
  {
    id: 'world-6',
    order: 6,
    name: 'ถ้ำมังกรคณิต',
    subtitle: 'โจทย์ปัญหาและการประยุกต์',
    description: 'ถ้ำสุดท้ายที่มังกรจะถามโจทย์ปัญหาที่ยากที่สุด',
    story:
      'ลึกที่สุดของถ้ำมีมังกรผู้เฝ้าคริสตัลทุกดวง มันจะไม่สู้ด้วยกำลัง แต่จะถามโจทย์ที่ต้องใช้ทุกอย่างที่หนูเรียนมาทั้งหมดรวมกัน',
    emoji: '🐉',
    difficulty: 'expert',
    skills: ['wordProblems'],
    regions: [{ id: 'w6-lair', name: 'ปากถ้ำ', emoji: '🔥' }],
    theme: {
      background: 'from-ember-600/40 via-night-800 to-night-900',
      primary: 'text-ember-400',
      secondary: 'bg-ember-600/25',
      accent: 'border-ember-400/50',
      path: 'bg-ember-500/40',
    },
    requiredWorldId: 'world-5',
  },
]

export function getWorld(worldId: string): World | undefined {
  return WORLDS.find((world) => world.id === worldId)
}

export function getWorldRegion(worldId: string, regionId: string) {
  return getWorld(worldId)?.regions.find((region) => region.id === regionId)
}
