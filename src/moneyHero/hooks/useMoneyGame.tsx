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
import { recoveryMatches, type Classroom } from '../engine/classroom'
import { setSoundEnabled } from '../utils/sound'
import { setMusicEnabled, wantMusic } from '../utils/music'
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
  /** แก้ข้อมูลทั้งก้อน (ทะเบียนนักเรียน นำเข้าไฟล์สำรอง) */
  updateSave: (fn: (s: SaveData) => SaveData) => void
  updateClassroom: (patch: Partial<Classroom>) => void
  /** ปลดล็อกหน้าครูแล้วหรือยัง (ไม่ได้ตั้งรหัสครู = เปิดเสมอ) */
  teacherOk: boolean
  unlockTeacher: (pin: string) => boolean
  unlockWithRecovery: (code: string) => boolean
  lockTeacher: () => void
  /** ลบผู้เล่นทุกคน (การตั้งค่าและข้อมูลห้องเรียนยังอยู่) */
  resetAll: () => void
  toasts: Toast[]
  pushToast: (icon: string, text: string) => void
}

const GameContext = createContext<GameApi | null>(null)

/** ปลดล็อกหน้าครูค้างไว้ในแท็บนี้ (ปิดแท็บแล้วต้องใส่รหัสใหม่) */
const TEACHER_FLAG = 'moneyHero.teacher'

function readTeacherFlag(): boolean {
  try {
    return globalThis.sessionStorage?.getItem(TEACHER_FLAG) === '1'
  } catch {
    return false
  }
}

export function GameProvider({ children }: { children?: ReactNode }) {
  const [save, setSave] = useState<SaveData>(() => loadSave())
  const [toasts, setToasts] = useState<Toast[]>([])
  const toastId = useRef(0)
  const [unlocked, setUnlocked] = useState(() => readTeacherFlag())
  const warnedFull = useRef(false)

  // ขอให้เบราว์เซอร์เก็บข้อมูลของเกมไว้ถาวร (ไม่ลบเองเมื่อเครื่องเหลือพื้นที่น้อย)
  useEffect(() => {
    void navigator.storage?.persist?.().catch(() => false)
  }, [])

  useEffect(() => {
    setSoundEnabled(save.settings.sound)
    setMusicEnabled(save.settings.music && save.settings.sound)
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

  useEffect(() => {
    if (writeSave(save)) {
      warnedFull.current = false
      return
    }
    // บันทึกไม่ได้ (พื้นที่เต็ม หรือเบราว์เซอร์ปิดการเก็บข้อมูล) เตือนครั้งเดียว
    if (!warnedFull.current) {
      warnedFull.current = true
      pushToast('⚠️', 'บันทึกข้อมูลในเครื่องไม่ได้ ให้คุณครูดาวน์โหลดไฟล์สำรองไว้ก่อน')
    }
  }, [save])

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
    setSave((s) => ({ version: 1, players: {}, activeId: null, settings: s.settings, classroom: s.classroom, bank: s.bank }))
  }, [])

  const updateSave = useCallback((fn: (s: SaveData) => SaveData) => {
    setSave((s) => {
      const next = fn(s)
      return next.activeId && !next.players[next.activeId] ? { ...next, activeId: null } : next
    })
  }, [])

  const setTeacher = useCallback((on: boolean) => {
    setUnlocked(on)
    try {
      if (on) globalThis.sessionStorage?.setItem(TEACHER_FLAG, '1')
      else globalThis.sessionStorage?.removeItem(TEACHER_FLAG)
    } catch {
      // เปิดแบบไม่ให้เก็บข้อมูล: จำไว้เฉพาะในหน้านี้
    }
  }, [])

  const updateClassroom = useCallback(
    (patch: Partial<Classroom>) => {
      setSave((s) => ({ ...s, classroom: { ...s.classroom, ...patch } }))
      // ครูเพิ่งตั้งรหัสจากหน้าครู: ยังอยู่ในหน้าครูต่อได้ ไม่ต้องใส่รหัสซ้ำทันที
      if (patch.pin) setTeacher(true)
    },
    [setTeacher],
  )

  const unlockTeacher = useCallback(
    (pin: string) => {
      const ok = pin === save.classroom.pin
      if (ok) setTeacher(true)
      return ok
    },
    [save.classroom.pin, setTeacher],
  )

  const unlockWithRecovery = useCallback(
    (code: string) => {
      if (!recoveryMatches(save.classroom, code)) return false
      setSave((s) => ({ ...s, classroom: { ...s.classroom, pin: '', recovery: '' } }))
      setTeacher(true)
      return true
    },
    [save.classroom, setTeacher],
  )

  const lockTeacher = useCallback(() => setTeacher(false), [setTeacher])
  const teacherOk = save.classroom.pin === '' || unlocked

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
      updateSave,
      updateClassroom,
      teacherOk,
      unlockTeacher,
      unlockWithRecovery,
      lockTeacher,
      resetAll,
      toasts,
      pushToast,
    }),
    [
      save,
      createPlayer,
      selectPlayer,
      deletePlayer,
      updatePlayer,
      updateSettings,
      updateSave,
      updateClassroom,
      teacherOk,
      unlockTeacher,
      unlockWithRecovery,
      lockTeacher,
      resetAll,
      toasts,
      pushToast,
    ],
  )

  return <GameContext.Provider value={api}>{children}</GameContext.Provider>
}

export function useGame(): GameApi {
  const ctx = useContext(GameContext)
  if (!ctx) throw new Error('useGame ต้องใช้ภายใน GameProvider')
  return ctx
}

/** เปิดเพลงประกอบระหว่างที่หน้านี้แสดงอยู่ (ปิดเองเมื่อออกจากหน้า) */
export function useMusic(): void {
  useEffect(() => {
    wantMusic(true)
    return () => wantMusic(false)
  }, [])
}
