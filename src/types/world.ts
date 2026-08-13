export interface World {
  id: string
  order: number
  name: string
  topic: string
  description: string
  emoji: string
  theme: WorldTheme
  /** โลกนี้จะปลดล็อกเมื่อผู้เล่นผ่านทุกด่านของโลกที่ระบุไว้แล้ว */
  unlockAfterWorldId: string | null
}

export interface WorldTheme {
  gradient: string
  ring: string
  badge: string
}
