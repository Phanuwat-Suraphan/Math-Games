import type { SkillId } from './stats'

export type WorldDifficulty = 'easy' | 'medium' | 'hard' | 'expert'

/**
 * ชุดสีของโลก เก็บเป็นคลาส Tailwind เพื่อให้ component ไม่ต้อง hard-code สี
 * เปลี่ยนธีมของทั้งโลกได้จากไฟล์ data ไฟล์เดียว
 */
export interface WorldTheme {
  /** ไล่สีพื้นหลังของการ์ดและหัวหน้าจอ */
  background: string
  primary: string
  secondary: string
  accent: string
  /** สีเส้นทางบนแผนที่ด่าน */
  path: string
}

/** กลุ่มของด่านภายในโลกหนึ่ง ใช้แบ่งเส้นทางบนแผนที่ */
export interface WorldRegion {
  id: string
  name: string
  emoji: string
}

export interface World {
  id: string
  order: number

  name: string
  subtitle: string
  description: string
  /** เรื่องเล่าสั้น ๆ ก่อนเข้าโลก */
  story: string

  emoji: string
  difficulty: WorldDifficulty

  /** ทักษะที่โลกนี้ฝึก ใช้แสดงบนการ์ดและเชื่อมกับสถิติของผู้เล่น */
  skills: SkillId[]

  regions: WorldRegion[]
  theme: WorldTheme

  /** โลกนี้จะปลดล็อกเมื่อผู้เล่นผ่านทุกด่านของโลกที่ระบุไว้แล้ว */
  requiredWorldId?: string
}
