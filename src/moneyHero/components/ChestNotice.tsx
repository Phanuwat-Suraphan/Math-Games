import { Link } from 'react-router-dom'
import type { Player } from '../engine/progress'
import { nextChest, readyChests } from '../engine/starRoad'

/** แจ้งบนหน้าจบด่าน: มีหีบสมบัติรอเปิด หรืออีกกี่ดาวถึงหีบถัดไป */
export function ChestNotice({ player }: { player: Player }) {
  const ready = readyChests(player).length
  const next = nextChest(player)
  if (ready > 0) {
    return (
      <Link to="/stars" className="mh-chest-notice is-ready" data-testid="mh-chest-ready">
        🧰 มีหีบสมบัติรอเปิด {ready} หีบ! ไปถนนดาว ▶
      </Link>
    )
  }
  if (!next) return null
  return (
    <Link to="/stars" className="mh-chest-notice">
      🧰 อีก {next.need} ดาวจะได้เปิดหีบสมบัติ
    </Link>
  )
}
