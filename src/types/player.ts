export interface Player {
  id: string
  name: string
  avatar: string
  level: number
  exp: number
  coins: number
  hp: number
  maxHp: number
  completedLevels: string[]
  createdAt: string
  updatedAt: string
}

export interface Avatar {
  id: string
  name: string
  emoji: string
  description: string
  accent: AvatarAccent
}

export type AvatarAccent = 'ember' | 'arcane' | 'leaf' | 'gold' | 'sky' | 'rose'

export interface GameSettings {
  soundEnabled: boolean
  reduceMotion: boolean
}
