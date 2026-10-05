import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import type { NpcId } from '../engine/types'
import { CharacterArt } from '../components/Art'
import { Sky } from '../components/Sky'

/**
 * หน้าที่กำลังสร้างในส่วนถัดไป
 * มีปุ่มกลับเสมอ เกมจึงไม่มีทางตัน แม้บางส่วนยังไม่เสร็จ
 */
export function ComingSoonPage({ title, npc = 'owl', back = '/start' }: { title: string; npc?: NpcId; back?: string }) {
  return (
    <div className="mh-page mh-page-narrow">
      <Sky city={false} />
      <div className="mh-page-head">
        <Link to={back} className="mh-icon-btn" aria-label="กลับ">
          <ArrowLeft size={24} />
        </Link>
        <h1 className="mh-title">{title}</h1>
      </div>
      <div className="mh-card mh-soon">
        <CharacterArt id={npc} size={110} />
        <p className="mh-soon-text">🛠️ ส่วนนี้กำลังสร้างอยู่ จะเปิดให้เล่นในส่วนถัดไปนะ</p>
        <Link to={back} className="mh-btn mh-btn-gold">
          กลับ
        </Link>
      </div>
    </div>
  )
}
