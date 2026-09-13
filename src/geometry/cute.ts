/**
 * ของน่ารักประจำห้องเรขาคณิต
 *
 * ทำไมความน่ารักถึงเป็นเรื่องที่ต้องออกแบบ ไม่ใช่ของแถม
 *
 * หน้านี้เป็นเครื่องมือที่เด็กต้องอยู่กับมันทั้งคาบ สี่สิบนาที
 * เครื่องมือที่หน้าตาเหมือนแบบฟอร์มราชการ เด็กจะทำเท่าที่ครูสั่งแล้วหยุด
 * ส่วนเครื่องมือที่มีของให้เล่นด้วย เด็กจะวาดต่อเองหลังทำโจทย์เสร็จ
 * และการวาดต่อเองนั่นแหละคือตอนที่เขาได้ฝึกจริง ๆ โดยไม่รู้ตัว
 *
 * ของทุกชิ้นในไฟล์นี้จึงมีหน้าที่ด้วย ไม่ได้สวยอย่างเดียว
 */

/** สติกเกอร์ที่แปะลงกระดาษได้ */
export const STICKERS = [
  { emoji: '⭐', label: 'ดาว' },
  { emoji: '🌸', label: 'ดอกไม้' },
  { emoji: '🐱', label: 'แมว' },
  { emoji: '🦋', label: 'ผีเสื้อ' },
  { emoji: '🌈', label: 'รุ้ง' },
  { emoji: '🍰', label: 'เค้ก' },
  { emoji: '🎈', label: 'ลูกโป่ง' },
  { emoji: '🍀', label: 'ใบไม้' },
]

export interface PaperTheme {
  id: string
  emoji: string
  label: string
  /** สีพื้นกระดาษ ใช้ทั้งบนจอและในไฟล์ภาพที่บันทึก */
  paper: string
  /** สีเส้นตารางเล็กและใหญ่ */
  minor: string
  major: string
  /** เส้นตารางเป็นจุดไข่ปลาแทนเส้นตรง */
  dotted?: boolean
}

/**
 * ธีมกระดาษ
 *
 * สีพื้นทุกธีมจงใจเลือกให้อ่อนมาก เพราะสิ่งที่ต้องเด่นที่สุดบนจอ
 * คือเส้นดินสอของเด็ก ไม่ใช่กระดาษ ธีมที่สีจัดกว่านี้จะกลืนเส้นสีอ่อนหายไป
 */
export const PAPER_THEMES: PaperTheme[] = [
  {
    id: 'cream',
    emoji: '📜',
    label: 'ครีม',
    paper: '#fffdf7',
    minor: '#e7e5e4',
    major: '#d6d3d1',
  },
  {
    id: 'blossom',
    emoji: '🌸',
    label: 'ชมพูจุด',
    paper: '#fff5f8',
    minor: '#fbcfe8',
    major: '#f9a8d4',
    dotted: true,
  },
  {
    id: 'mint',
    emoji: '🌿',
    label: 'มิ้นท์',
    paper: '#f3fdfa',
    minor: '#ccfbf1',
    major: '#99f6e4',
  },
  {
    id: 'sky',
    emoji: '☁️',
    label: 'ฟ้าใส',
    paper: '#f5faff',
    minor: '#dbeafe',
    major: '#bfdbfe',
    dotted: true,
  },
]

export function findTheme(id: string): PaperTheme {
  return PAPER_THEMES.find((theme) => theme.id === id) ?? PAPER_THEMES[0]
}

/**
 * คำเชียร์ตามจำนวนรูปที่วาดไปแล้ว
 *
 * ขึ้นเฉพาะตอนถึงหมุดที่กำหนด ไม่ใช่ทุกครั้งที่วาด
 * คำชมที่มาทุกครั้งจะกลายเป็นเสียงรบกวนที่เด็กเลิกอ่านภายในสามนาที
 * คืน null เมื่อยังไม่ถึงหมุด แปลว่าน้องวงเวียนพูดเรื่องเครื่องมือตามปกติ
 */
export function encouragementFor(count: number): string | null {
  const lines: Record<number, string> = {
    1: 'เส้นแรกของวันนี้ เริ่มแล้วนะ เก่งมาก',
    3: 'สามรูปแล้ว มือเริ่มอยู่มือแล้วใช่ไหม',
    5: 'ห้ารูปแล้ว ลองกดปุ่ม 🤏 แล้วจิ้มรูปดูสิ มีตัวเลขให้อ่านเพียบเลย',
    10: 'สิบรูปแล้ว เก่งจริง ๆ ลองทำภารกิจทางขวาต่อไหม',
    15: 'สิบห้ารูป กระดาษเริ่มแน่นแล้ว สวยมากเลย',
    20: 'ยี่สิบรูป นี่คือผลงานชิ้นใหญ่แล้วนะ อย่าลืมกดบันทึกรูปเก็บไว้',
  }
  return lines[count] ?? null
}

/**
 * ตำแหน่งของประกายที่กระเด็นออกมาตอนวาดรูปเสร็จ
 *
 * กระจายรอบวงเป็นมุมเท่า ๆ กัน แต่สลับระยะใกล้ไกล
 * เพราะประกายที่อยู่ห่างเท่ากันหมดจะดูเหมือนวงกลมจุดไข่ปลา ไม่ใช่ประกาย
 */
export function sparkleOffsets(count = 6, radius = 34) {
  return Array.from({ length: count }, (_, index) => {
    const angle = (360 / count) * index - 90
    const away = index % 2 === 0 ? radius : radius * 0.62
    const radian = (angle * Math.PI) / 180
    return {
      x: Math.cos(radian) * away,
      y: Math.sin(radian) * away,
      delay: (index % 3) * 60,
    }
  })
}
