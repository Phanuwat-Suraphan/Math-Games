import type { ReactNode } from 'react'
import { Button } from '../Button'
import { COMPANION_VIEWBOX, companionArt } from '../../planetQuest/companionArt'
import { companionFor } from '../../planetQuest/companions'
import type { CompanionId } from '../../planetQuest/companions'
import { Bubble, Confetti } from './Buddy'

/**
 * เพื่อนร่วมทางบนหน้าจอ (ภาพกับข้อความอยู่ใน planetQuest/companions.ts และ companionArt.ts)
 * ภาพเป็นข้อความ SVG ของเราเอง ไม่มีข้อมูลจากผู้ใช้ปน จึงใส่ผ่าน innerHTML ได้ปลอดภัย
 */
export function CompanionArt({
  id,
  size = 64,
  locked = false,
  className = '',
}: {
  id: CompanionId
  size?: number | string
  /** ยังไม่มา วาดเป็นเงาดำ ให้รู้ว่ามีเพื่อนรออยู่แต่ยังไม่รู้ว่าหน้าตาเป็นอย่างไร */
  locked?: boolean
  className?: string
}) {
  return (
    <span
      aria-hidden="true"
      className={`pq-friend ${locked ? 'pq-friend-locked' : ''} ${className}`}
      style={{ width: size, height: size }}
    >
      <svg viewBox={COMPANION_VIEWBOX} width="100%" height="100%" dangerouslySetInnerHTML={{ __html: companionArt(id) }} />
    </span>
  )
}

/** เพื่อนร่วมทางพูดหนึ่งประโยค ใช้ตอนออกบิน ตอนถึง และตอนจบด่าน */
export function CompanionSay({
  id,
  reduceMotion,
  children,
  size = 52,
}: {
  id: CompanionId
  reduceMotion: boolean
  children: ReactNode
  size?: number
}) {
  const companion = companionFor(id)
  return (
    <div className="flex items-center gap-3">
      <CompanionArt id={id} size={size} className={reduceMotion ? '' : 'pq-bob'} />
      <Bubble className="min-w-0 flex-1">
        <span className="text-xs font-bold text-slate-500">{companion.name}</span>
        <span className="block text-sm font-black">{children}</span>
      </Bubble>
    </div>
  )
}

/** การ์ดเพื่อนใหม่ ขึ้นครั้งเดียวต่อตัว ตอนเล่นครบเงื่อนไขของเพื่อนตัวนั้น */
export function NewFriendCard({
  id,
  reduceMotion,
  onTakeAlong,
  onLater,
}: {
  id: CompanionId
  reduceMotion: boolean
  onTakeAlong: () => void
  onLater: () => void
}) {
  const companion = companionFor(id)
  return (
    <section className="pq-newfriend relative mt-4 overflow-hidden p-4 sm:p-5" aria-live="polite">
      {reduceMotion ? null : <Confetti seed={`friend-${id}`} count={16} spread={170} />}
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold-300">🎉 เพื่อนร่วมทางคนใหม่!</p>
      <div className="mt-2 flex items-center gap-4">
        <span className={reduceMotion ? '' : 'pq-hop'}>
          <CompanionArt id={id} size={96} />
        </span>
        <div className="min-w-0">
          <h2 className="text-2xl font-black text-white">{companion.name}</h2>
          <p className="text-xs text-slate-300">{companion.kind}</p>
          <Bubble tail="top" className="mt-2">
            <span className="block text-sm font-black">{companion.intro}</span>
          </Bubble>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button onClick={onTakeAlong} icon="🚀">
          {`ชวน${companion.name}ขึ้นยาน`}
        </Button>
        <Button variant="ghost" onClick={onLater}>
          ไว้ก่อน ไปเลือกทีหลังที่อู่ต่อยาน
        </Button>
      </div>
    </section>
  )
}
