import type { CSSProperties } from 'react'
import type { MissionScene, SlotState } from '../data/missions'
import type { Wear } from '../data/shop'
import { AvatarArt, CharacterArt } from './Art'

/**
 * แถบภารกิจ (ขั้น MISSION): เพื่อนเล่าภารกิจ ฮีโร่เดินไปตามช่องทีละข้อ
 * ช่องที่เสร็จเติมด้วยของประจำภารกิจ (ตอบผิดครบ 2 ครั้งได้ 💪 แทน)
 */
export function MissionTrack({ scene, total, slots, avatar, wear }: { scene: MissionScene; total: number; slots: readonly SlotState[]; avatar: string; wear: Wear }) {
  const done = slots.length >= total
  const at = Math.min(slots.length, total - 1)
  const good = slots.filter((s) => s === 'good').length
  return (
    <div className={`mh-card mh-mission-track ${done ? 'is-done' : ''}`} data-testid="mh-mission-track">
      <div className="mh-mission-head">
        <CharacterArt id={scene.npc} size={64} mood={done ? 'happy' : 'normal'} />
        <div className="mh-bubble mh-mission-say">
          <b>🎯 {scene.title}</b>
          <span>{done ? scene.done : scene.story}</span>
        </div>
        <span className="mh-mission-count" data-testid="mh-mission-count">
          {scene.item} {good}/{total}
        </span>
      </div>
      <div className="mh-mission-road" style={{ '--n': total } as CSSProperties}>
        {Array.from({ length: total }, (_, i) => {
          const s = slots[i]
          return (
            <span key={i} className={`mh-mission-slot ${s ? `is-${s}` : ''} ${!done && i === slots.length ? 'is-now' : ''}`}>
              {s === 'good' ? scene.item : s === 'try' ? '💪' : i + 1}
            </span>
          )
        })}
        <span className="mh-mission-hero" style={{ left: `calc(${((done ? total - 1 : at) + 0.5) / total} * 100%)` }} aria-hidden="true">
          <AvatarArt avatar={avatar} size={44} portrait wear={wear} mood={done ? 'happy' : 'normal'} />
        </span>
      </div>
    </div>
  )
}
