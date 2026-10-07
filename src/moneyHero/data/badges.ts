/**
 * ตราสัญลักษณ์ (Badges) ที่สะสมได้
 */
export interface BadgeDef {
  id: string
  icon: string
  name: string
  how: string
}

export const LEVEL_BADGES: BadgeDef[] = [
  { id: 'level-0', icon: '🚩', name: 'ฮีโร่ฝึกหัด', how: 'ผ่านด่านเริ่มต้น' },
  { id: 'level-1', icon: '🏦', name: 'ผู้รู้จักเงินไทย', how: 'ผ่านด่าน 1 ธนาคาร' },
  { id: 'level-2', icon: '🔢', name: 'นักนับเงินมือไว', how: 'ผ่านด่าน 2 ตลาดนับเงิน' },
  { id: 'level-3', icon: '🏷️', name: 'นักเขียนราคา', how: 'ผ่านด่าน 3 ร้านเขียนราคา' },
  { id: 'level-4', icon: '⚖️', name: 'ผู้ชนะ MONEY BATTLE', how: 'ผ่านด่าน 4 หอคอยเปรียบเทียบ' },
  { id: 'level-5', icon: '🔄', name: 'นายสถานีแลกเหรียญ', how: 'ผ่านด่าน 5 สถานีแลกเหรียญ' },
  { id: 'level-6', icon: '💱', name: 'MONEY MAKER', how: 'ผ่านด่าน 6 ธนาคารแลกเงิน' },
  { id: 'level-7', icon: '🛍️', name: 'นักช้อปคำนวณเก่ง', how: 'ผ่านด่าน 7 ซูเปอร์มาร์เก็ต' },
  { id: 'level-8', icon: '🏭', name: 'วิศวกรโรงงานเงิน', how: 'ผ่านด่าน 8 โรงงานคูณ–หาร' },
  { id: 'level-9', icon: '🧩', name: 'นักไขปริศนา', how: 'ผ่านด่าน 9 ร้านค้าปริศนา' },
  { id: 'level-10', icon: '🎯', name: 'นักวางแผนการเงิน', how: 'ผ่านด่าน 10 ศูนย์ภารกิจ' },
  { id: 'level-11', icon: '📒', name: 'นักบัญชีน้อย', how: 'ผ่านด่าน 11 สมุดบัญชี' },
  { id: 'level-12', icon: '🏆', name: 'MONEY MASTER ป.3', how: 'ผ่าน FINAL MONEY MASTER' },
]

export const SPECIAL_BADGES: BadgeDef[] = [
  { id: 'pretest', icon: '🧭', name: 'นักสำรวจพลัง', how: 'ทำแบบทดสอบก่อนเรียน' },
  { id: 'posttest', icon: '🎓', name: 'บัณฑิตเมืองเงินทอง', how: 'ทำแบบทดสอบหลังเรียน' },
  { id: 'improver', icon: '📈', name: 'เก่งขึ้นทุกวัน', how: 'คะแนนหลังเรียนสูงกว่าก่อนเรียน' },
  { id: 'streak5', icon: '🔥', name: 'ไฟลุก 5 ข้อ', how: 'ตอบถูกติดกัน 5 ข้อ' },
  { id: 'streak10', icon: '⚡', name: 'สายฟ้า 10 ข้อ', how: 'ตอบถูกติดกัน 10 ข้อ' },
  { id: 'nohint-boss', icon: '🧠', name: 'คิดเองล้วน ๆ', how: 'ชนะบอสโดยไม่ใช้ตัวช่วย' },
  { id: 'stars-15', icon: '🌟', name: 'นักสะสมดาว', how: 'สะสมดาวครบ 15 ดวง' },
  { id: 'perfect', icon: '💎', name: 'สมบูรณ์แบบ', how: 'ได้ 3 ดาวในด่านใดก็ได้' },
  { id: 'coins-300', icon: '💰', name: 'เศรษฐีน้อย', how: 'สะสม 300 เหรียญ' },
  { id: 'explorer', icon: '🪙', name: 'นักเก็บเหรียญ', how: 'เก็บเหรียญบนแผนที่ 15 เหรียญ' },
  { id: 'comeback', icon: '💪', name: 'ไม่ยอมแพ้', how: 'ฝึกข้อที่เคยผิดจนถูก 5 ข้อ' },
  { id: 'helper', icon: '🤝', name: 'เพื่อนผู้ช่วยเหลือ', how: 'ช่วยเพื่อนในเมืองทำภารกิจสำเร็จ 4 ครั้ง' },
  { id: 'daily3', icon: '📅', name: 'ขยันทุกวัน', how: 'ทำภารกิจประจำวันติดกัน 3 วัน' },
  { id: 'shopper', icon: '🛍️', name: 'นักช้อปตัวน้อย', how: 'ซื้อของชิ้นแรกที่ร้านของฮีโร่' },
  { id: 'quick-change', icon: '⚡', name: 'ทอนไวทันใจ', how: 'ร้านทอนไว: ทอนเงินถูก 8 คนขึ้นไปใน 60 วินาที' },
  { id: 'eco-seller', icon: '♻️', name: 'พ่อค้าแม่ค้ารักษ์โลก', how: 'เล่นกาดรักษ์โลกครบหนึ่งวัน (ขายขยะ ทำสินค้า ขาย และคิดกำไร)' },
  { id: 'eco-garden', icon: '🏡', name: 'สวนรักษ์โลก', how: 'ขายสินค้าในกาดรักษ์โลกรวม 300 บาท จนต้นไม้กลายเป็นสวน' },
  { id: 'saver', icon: '🐷', name: 'นักออมตัวจริง', how: 'ตั้งเป้าหมายในกระปุกออมสิน แล้วออมจนซื้อของชิ้นนั้นได้' },
  { id: 'challenger', icon: '🔥', name: 'นักล่าความท้าทาย', how: 'ผ่านด่านย่อยท้าทาย (X-3) ครบ 3 ด่าน' },
  { id: 'ar-hunter', icon: '📷', name: 'นักล่าเหรียญ AR', how: 'เก็บเงินพอดีครบ 5 รอบในเกมล่าเหรียญ' },
]

export const ALL_BADGES: BadgeDef[] = [...LEVEL_BADGES, ...SPECIAL_BADGES]

export function badgeById(id: string): BadgeDef | undefined {
  return ALL_BADGES.find((b) => b.id === id)
}
