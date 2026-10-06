import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import type { Skill } from '../engine/types'
import { useGame } from '../hooks/useMoneyGame'
import { SKILLS, SKILL_ICONS, SKILL_LEVELS, SKILL_NAMES } from '../data/characters'
import { LEVELS } from '../data/levels'
import { isLevelUnlocked, levelRecord, pendingMistakes, weakSkills } from '../engine/progress'
import { skillPercent } from '../engine/report'
import { TopBar } from '../components/TopBar'
import { CharacterArt } from '../components/Art'
import { BuildingArt } from '../components/BuildingArt'
import { SkillBars } from '../components/Charts'
import { Stars } from '../components/Stars'

/**
 * สถิติทักษะของผู้เล่น: แท่งแยกทักษะ ทักษะที่ควรฝึก ดาวรายด่าน และปุ่มฝึกข้อที่เคยผิด
 * เส้นทาง #/stats
 */
export function StatsPage() {
  const { player } = useGame()
  if (!player) return null
  const values = {} as Record<Skill, number | null>
  const counts = {} as Record<Skill, number>
  for (const s of SKILLS) {
    values[s] = skillPercent(player, s)
    counts[s] = player.skills[s].attempts
  }
  const weak = weakSkills(player)
  const pending = pendingMistakes(player)

  return (
    <div className="mh-level theme-mission">
      <TopBar />
      <div className="mh-page">
        <div className="mh-page-head">
          <Link to="/map" className="mh-icon-btn" aria-label="กลับแผนที่">
            <ArrowLeft size={24} />
          </Link>
          <h1 className="mh-title mh-level-title">📊 สถิติทักษะ</h1>
        </div>

        <div className="mh-stats-grid">
          <div className="mh-card">
            <SkillBars values={values} counts={counts} />
          </div>

          <div className="mh-stats-side">
            <div className="mh-card mh-review-card" data-testid="mh-review-card">
              <CharacterArt id="fox" size={72} />
              <div>
                <h3 className="mh-card-title">🔁 ฝึกข้อที่เคยผิด</h3>
                {pending.length > 0 ? (
                  <>
                    <p>มีโจทย์ {pending.length} แบบที่เคยพลาด มาฝึกให้เก่งกันเถอะ!</p>
                    <Link to="/review" className="mh-btn mh-btn-gold" data-testid="mh-review-go">
                      ▶ เริ่มฝึก
                    </Link>
                  </>
                ) : (
                  <p className="mh-soft">ยังไม่มีข้อที่ต้องฝึก เก่งมาก! 🎉</p>
                )}
              </div>
            </div>

            <div className="mh-card">
              <h3 className="mh-card-title">💡 คำแนะนำ</h3>
              {weak.length === 0 ? (
                <p className="mh-soft">{player.answered < 5 ? 'เล่นเพิ่มอีกนิด แล้วจะมีคำแนะนำให้นะ' : 'ทุกทักษะไปได้ดี! ลองเก็บ 3 ดาวทุกด่านดูไหม?'}</p>
              ) : (
                <ul className="mh-advice">
                  {weak.map((s) => (
                    <li key={s}>
                      <span aria-hidden="true">{SKILL_ICONS[s]}</span> <b>{SKILL_NAMES[s]}</b> ยังทำได้ {values[s]}% ·{' '}
                      {SKILL_LEVELS[s].map((id) => (
                        <Link key={id} to={`/level/${id}/learn`} className="mh-link">
                          ทบทวนด่าน {id}
                        </Link>
                      ))}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>

        <h2 className="mh-section-title">🏙️ ดาวรายด่าน</h2>
        <div className="mh-level-stars">
          {LEVELS.map((l) => {
            const rec = levelRecord(player, l.id)
            return (
              <div key={l.id} className={`mh-level-star ${rec.stepDone >= 4 ? 'is-done' : ''}`}>
                <BuildingArt level={l.id} locked={!isLevelUnlocked(player, l.id)} className="mh-thumb-bld" />
                <b>ด่าน {l.id}</b>
                <Stars n={rec.bestStars} />
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
