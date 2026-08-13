import type {
  HeroCard,
  MonsterCard,
  NumberCard,
  NumberTier,
  OperatorCard,
} from './types'

/**
 * ข้อมูลการ์ดทั้งหมดของ Divisor Duel
 * ถอดจากรูปการ์ดจริงที่ได้รับ ค่าตัวเลขทุกตัวอ่านจากหน้าการ์ดโดยตรง
 *
 * ยังไม่ครบ: การ์ดเครื่องหมาย ÷ และวงเล็บ ( ) — ดูหมายเหตุที่ท้ายส่วน OPERATORS
 */

// ── เซต 1: มอนสเตอร์ (องครักษ์ที่ขวางหน้าฮีโร่) ─────────────────
export const MONSTERS: MonsterCard[] = [
  {
    id: 'stone-gargoyle',
    name: 'Stone Gargoyle',
    set: 'monster',
    hp: 150,
    divisor: 4,
    isBoss: false,
  },
  {
    id: 'swamp-troll',
    name: 'Swamp Troll',
    set: 'monster',
    hp: 200,
    divisor: 7,
    isBoss: false,
  },
  {
    id: 'crimson-wyvern',
    name: 'Crimson Wyvern',
    set: 'monster',
    hp: 250,
    divisor: 9,
    isBoss: false,
  },
  {
    id: 'iron-golem',
    name: 'Iron Golem',
    set: 'monster',
    hp: 350,
    divisor: 12,
    isBoss: false,
  },
  {
    id: 'skeleton-king',
    name: 'Skeleton King',
    set: 'monster',
    hp: 400,
    divisor: 15,
    isBoss: false,
  },
  {
    id: 'void-dragon',
    name: 'The Void Dragon',
    set: 'monster',
    hp: 600,
    divisor: 25,
    isBoss: true,
  },
]

// ── เซต 2: เครื่องหมาย ────────────────────────────────────────
export const OPERATORS: OperatorCard[] = [
  {
    id: 'blade-of-union',
    name: 'Blade of Union',
    set: 'operator',
    symbol: '+',
    flavor:
      'ดาบอัศวินคู่ที่ไขว้กัน สื่อถึงการรวมพลังศรัทธา พลังโจมตีจะเพิ่มขึ้นเมื่อศาสตราสองสิ่งมารวมเป็นหนึ่ง',
  },
  {
    id: 'scythe-of-severance',
    name: 'Scythe of Severance',
    set: 'operator',
    symbol: '-',
    flavor:
      'เคียวมรณะที่ตัดทอนพลังชีวิต ศัตรูจะอ่อนแอลงเมื่อคมมีดนี้วาดผ่าน',
  },
  {
    id: 'flail-of-multiplication',
    name: 'Flail of Multiplication',
    set: 'operator',
    symbol: '*',
    flavor:
      'ลูกตุ้มทวีคูณที่แยกตัวออกเป็นหลายหัว พลังทำลายล้างจะขยายตัวอย่างรวดเร็วเมื่อฟาดฟัน',
  },
  // TODO: ยังไม่ได้รับรูปการ์ด ÷ และวงเล็บ ( )
  // ลายหลังการ์ดเซตนี้มีสัญลักษณ์ + − × ÷ และ ( ) เรียงอยู่ในวงเวท
  // จึงเชื่อว่าเซตเต็มมีมากกว่า 3 ใบ
]

// ── เซต 3: ฮีโร่ ──────────────────────────────────────────────
/** ฮีโร่ทุกใบมีค่าพื้นฐานเท่ากัน ต่างกันที่ความสามารถเท่านั้น */
export const HERO_BASE_HP = 1000
export const HERO_BASE_DIVISOR = 10

export const HEROES: HeroCard[] = [
  {
    id: 'high-priestess-elara',
    name: 'High Priestess Elara',
    set: 'hero',
    hp: HERO_BASE_HP,
    divisor: HERO_BASE_DIVISOR,
    ability: {
      name: 'Divine Aegis',
      nameTh: 'โล่ศักดิ์สิทธิ์คุ้มภัย',
      timing: 'endOfTurn',
      description:
        'เมื่อจบเทิร์นของคุณ: เลือกมอนสเตอร์องครักษ์ของคุณ 1 ตัว มอนสเตอร์ตัวนั้นจะได้เกราะป้องกัน (Divisor) เพิ่มขึ้น +5 จนกว่าจะถึงเทิร์นถัดไปของคุณ',
    },
  },
  {
    id: 'grand-wizard-arcanus',
    name: 'Grand Wizard Arcanus',
    set: 'hero',
    hp: HERO_BASE_HP,
    divisor: HERO_BASE_DIVISOR,
    ability: {
      name: 'Arcane Manipulation',
      nameTh: 'บิดเบือนสมการ',
      timing: 'beforeCalculation',
      description:
        'เทิร์นละ 1 ครั้ง ก่อนคำนวณ: เปลี่ยนการ์ดเครื่องหมาย + เป็น × หรือเปลี่ยน − เป็น + ในสมการได้ 1 ใบ',
    },
  },
  {
    id: 'knight-commander-valerius',
    name: 'Knight Commander Valerius',
    set: 'hero',
    hp: HERO_BASE_HP,
    divisor: HERO_BASE_DIVISOR,
    ability: {
      name: 'Precision Strike',
      nameTh: 'คมดาบไร้ที่ติ',
      timing: 'passive',
      description:
        'หากคำนวณการหารแล้วได้เศษเป็น 0 (หารลงตัว) ให้บวกโบนัสความเสียหายเพิ่มอีก +50 แต้มทันที',
    },
  },
  {
    id: 'lich-queen-morwenna',
    name: 'Lich Queen Morwenna',
    set: 'hero',
    hp: HERO_BASE_HP,
    divisor: HERO_BASE_DIVISOR,
    ability: {
      name: 'Soul Siphon',
      nameTh: 'ดูดกลืนเศษวิญญาณ',
      timing: 'passive',
      description:
        'หากมีเศษเหลือจากการหาร คุณจะไม่ได้รับความเสียหายจากเศษนั้น ให้นำค่าของเศษไปบวกเพิ่มเป็นความเสียหายใส่ศัตรูแทน',
    },
  },
]

// ── เซต 4: ตัวเลข ─────────────────────────────────────────────
interface NumberCardSpec {
  value: number
  name: string
  tier: NumberTier
  flavor: string
}

/** ชื่อและระดับของการ์ดตัวเลขแต่ละกลุ่ม ตามงานศิลป์บนการ์ดจริง */
const NUMBER_SPECS: NumberCardSpec[] = [
  ...Array.from({ length: 9 }, (_, index) => ({
    value: index + 1,
    name: `Stone of Power: ${index + 1}`,
    tier: 'basic' as NumberTier,
    flavor: `ผลึกพลังงานดิบที่บรรจุแก่นแท้แห่งตัวเลข ${index + 1} เหมาะสำหรับการสร้างสมการพื้นฐาน`,
  })),
  {
    value: 10,
    name: 'Arcane Capacitor: 10',
    tier: 'advanced',
    flavor:
      'อุปกรณ์เก็บกักพลังงานเวทมนตร์โบราณ ปลดปล่อยพลังงานระดับสูงสำหรับสมการที่ซับซ้อน',
  },
  {
    value: 20,
    name: 'Arcane Sphere: 20',
    tier: 'legendary',
    flavor:
      'ลูกแก้วเวทมนตร์ที่กักเก็บพายุพลังงานมหาศาล พลังงานที่ไร้ขีดจำกัดสำหรับสมการระดับตำนาน',
  },
  {
    value: 50,
    name: 'Void Core: 50',
    tier: 'void',
    flavor:
      'แกนกลางมิติที่บิดเบือนความเป็นจริง พลังงานสีม่วงที่ทำลายล้างทุกกฎเกณฑ์ เพื่อสมการที่เป็นไปไม่ได้',
  },
]

export const NUMBERS: NumberCard[] = NUMBER_SPECS.map((spec) => ({
  id: `number-${spec.value}`,
  name: spec.name,
  set: 'number',
  value: spec.value,
  tier: spec.tier,
  flavor: spec.flavor,
}))

// ── ตัวช่วยค้นหา ──────────────────────────────────────────────
export const ALL_CARDS = [...MONSTERS, ...OPERATORS, ...HEROES, ...NUMBERS]

export function getMonster(id: string): MonsterCard | undefined {
  return MONSTERS.find((card) => card.id === id)
}

export function getHero(id: string): HeroCard | undefined {
  return HEROES.find((card) => card.id === id)
}

export function getNumberCard(value: number): NumberCard | undefined {
  return NUMBERS.find((card) => card.value === value)
}

/** ค่าตัวเลขทั้งหมดที่มีในเกม ใช้ตรวจว่าสร้างผลลัพธ์ที่ต้องการได้จริงหรือไม่ */
export const NUMBER_VALUES: number[] = NUMBERS.map((card) => card.value)

/** เกราะทั้งหมดที่ผู้เล่นต้องเจอ ใช้ตรวจสมดุลของเกม */
export const ALL_DIVISORS: number[] = [
  ...new Set([
    ...MONSTERS.map((card) => card.divisor),
    ...HEROES.map((card) => card.divisor),
  ]),
].sort((a, b) => a - b)
