import { Link } from 'react-router-dom'
import type { Player } from '../engine/progress'
import { isLevelPassed, levelRecord } from '../engine/progress'
import { isStageUnlocked, stageRecord, STAGES, type StageNo } from '../engine/stages'

/**
 * ป้ายด่านย่อย X-1 · X-2 · X-3 พร้อมดาว
 * ด่านย่อยที่ยังล็อกแสดงแม่กุญแจ ด่านที่เปิดแล้วกดเข้าเล่นได้
 */
export function StageChips({ player, level, current }: { player: Player; level: number; current?: 1 | StageNo }) {
  const main = levelRecord(player, level)
  const chips: { n: 1 | StageNo; name: string; icon: string; stars: number; open: boolean; to: string }[] = [
    { n: 1, name: 'ผจญภัย', icon: '🗺️', stars: main.bestStars, open: true, to: `/level/${level}/learn` },
    ...([2, 3] as StageNo[]).map((n) => ({
      n,
      name: STAGES[n].name,
      icon: STAGES[n].icon,
      stars: stageRecord(player, level, n).stars,
      open: isStageUnlocked(player, level, n),
      to: `/level/${level}/stage/${n}`,
    })),
  ]
  return (
    <div className="mh-stage-chips" data-testid="mh-stage-chips" aria-label="ด่านย่อย">
      {chips.map((c) => {
        const body = (
          <>
            <span className="mh-stage-chip-no">
              {level}-{c.n}
            </span>
            <span className="mh-stage-chip-name">
              {c.open ? c.icon : '🔒'} {c.name}
            </span>
            <span className="mh-stage-chip-stars" aria-label={`${c.stars} ดาว`}>
              {[1, 2, 3].map((i) => (
                <span key={i} className={i <= c.stars ? 'is-on' : ''}>
                  ★
                </span>
              ))}
            </span>
          </>
        )
        const cls = `mh-stage-chip ${c.open ? '' : 'is-locked'} ${current === c.n ? 'is-current' : ''} ${c.n === 1 && isLevelPassed(player, level) ? 'is-clear' : ''}`
        return c.open && current !== c.n ? (
          <Link key={c.n} to={c.to} className={cls} data-testid={`mh-stage-go-${c.n}`}>
            {body}
          </Link>
        ) : (
          <span key={c.n} className={cls} title={c.open ? undefined : c.n === 2 ? 'ผ่านด่านผจญภัยก่อนนะ' : 'ผ่านด่านฝึกเก่งก่อนนะ'}>
            {body}
          </span>
        )
      })}
    </div>
  )
}
