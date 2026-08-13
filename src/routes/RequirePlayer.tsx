import type { ReactElement } from 'react'
import { Navigate } from 'react-router-dom'
import { useGame } from '../context/useGame'
import type { Player } from '../types/player'

interface RequirePlayerProps {
  /** ได้รับ player ที่ยืนยันแล้วว่าไม่เป็น null จึงไม่ต้องเช็คซ้ำในทุกหน้า */
  render: (player: Player) => ReactElement
}

export function RequirePlayer({ render }: RequirePlayerProps) {
  const { player, isLoading } = useGame()

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <p className="animate-pulse text-lg text-slate-300">
          กำลังโหลดข้อมูลผู้เล่น...
        </p>
      </div>
    )
  }

  if (!player) {
    return <Navigate to="/create" replace />
  }

  return render(player)
}
