import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  loadSave,
  newBadges,
  newPlayer,
  writeSave,
  type Player,
  type SaveData,
  type Settings,
} from '../engine/progress'
import { badgeById } from '../data/badges'
import { setSoundEnabled } from '../utils/sound'
import { setSpeechEnabled } from '../utils/speech'

/**
 * สถานะกลางของเกม: ผู้เล่นทุกคนในเครื่อง ผู้เล่นที่กำลังเล่น และการตั้งค่า
 * ทุกการเปลี่ยนแปลงบันทึกลง localStorage ทันที รีเฟรชหน้าแล้วข้อมูลไม่หาย
 */

export interface Toast {
  id: number
  icon: string
  text: string
}

interface GameApi {
  save: SaveData
  player: Player | null
  settings: Settings
  createPlayer: (name: string, avatar: string) => Player
  selectPlayer: (id: string | null) => void
  deletePlayer: (id: string) => void
  /** แก้ไขผู้เล่นปัจจุบัน แล้วตรวจตราใหม่ให้อัตโนมัติ */
  updatePlayer: (fn: (p: Player) => Player, extraBadges?: string[]) => void
  updateSettings: (patch: Partial<Settings>) => void
  resetAll: () => void
  toasts: Toast[]
  pushToast: (icon: string, text: string) => void
}

const GameContext = createContext<GameApi | null>(null)

export function GameProvider({ children }: { children?: ReactNode }) {
  const [save, setSave] = useState<SaveData>(() => loadSave())
  const [toasts, setToasts] = useState<Toast[]>([])
  const toastId = useRef(0)

  useEffect(() => {
    writeSave(save)
  }, [save])

  useEffect(() => {
    setSoundEnabled(save.settings.sound)
    setSpeechEnabled(save.settings.speech)
    document.documentElement.classList.toggle('mh-reduce-motion', save.settings.reduceMotion)
    document.documentElement.classList.toggle('mh-big-text', save.settings.bigText)
  }, [save.settings])

  const pushToast = useCallback((icon: string, text: string) => {
    toastId.current += 1
    const id = toastId.current
    setToasts((list) => [...list.slice(-2), { id, icon, text }])
    window.setTimeout(() => setToasts((list) => list.filter((t) => t.id !== id)), 3200)
  }, [])

  const createPlayer = useCallback((name: string, avatar: string) => {
    const p = newPlayer(name, avatar)
    setSave((s) => ({ ...s, players: { ...s.players, [p.id]: p }, activeId: p.id }))
    return p
  }, [])

  const selectPlayer = useCallback((id: string | null) => {
    setSave((s) => ({ ...s, activeId: id && s.players[id] ? id : null }))
  }, [])

  const deletePlayer = useCallback((id: string) => {
    setSave((s) => {
      const players = { ...s.players }
      delete players[id]
      return { ...s, players, activeId: s.activeId === id ? null : s.activeId }
    })
  }, [])

  const pendingBadges = useRef<string[]>([])

  const updatePlayer = useCallback((fn: (p: Player) => Player, extraBadges: string[] = []) => {
    setSave((s) => {
      if (!s.activeId || !s.players[s.activeId]) return s
      const next = fn(s.players[s.activeId])
      const earned = newBadges(next, extraBadges)
      const withBadges = earned.length > 0 ? { ...next, badges: [...next.badges, ...earned] } : next
      if (earned.length > 0) pendingBadges.current.push(...earned)
      return { ...s, players: { ...s.players, [withBadges.id]: withBadges } }
    })
  }, [])

  // แจ้งตราใหม่หลังบันทึก (แยกจาก setSave เพื่อไม่ให้เรียก setState ซ้อนกัน)
  useEffect(() => {
    if (pendingBadges.current.length === 0) return
    // StrictMode เรียกตัวอัปเดตสองรอบ จึงตัดตัวซ้ำก่อนแจ้ง
    const ids = Array.from(new Set(pendingBadges.current.splice(0)))
    for (const id of ids) {
      const b = badgeById(id)
      if (b) pushToast(b.icon, `ได้ตราใหม่: ${b.name}`)
    }
  }, [save, pushToast])

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setSave((s) => ({ ...s, settings: { ...s.settings, ...patch } }))
  }, [])

  const resetAll = useCallback(() => {
    setSave((s) => ({ version: 1, players: {}, activeId: null, settings: s.settings }))
  }, [])

  const api = useMemo<GameApi>(
    () => ({
      save,
      player: save.activeId ? save.players[save.activeId] ?? null : null,
      settings: save.settings,
      createPlayer,
      selectPlayer,
      deletePlayer,
      updatePlayer,
      updateSettings,
      resetAll,
      toasts,
      pushToast,
    }),
    [save, createPlayer, selectPlayer, deletePlayer, updatePlayer, updateSettings, resetAll, toasts, pushToast],
  )

  return <GameContext.Provider value={api}>{children}</GameContext.Provider>
}

export function useGame(): GameApi {
  const ctx = useContext(GameContext)
  if (!ctx) throw new Error('useGame ต้องใช้ภายใน GameProvider')
  return ctx
}
