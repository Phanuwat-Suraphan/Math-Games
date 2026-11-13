import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useGame } from '../hooks/useMoneyGame'
import { SKILLS, SKILL_ICONS, SKILL_LEVELS, SKILL_NAMES } from '../data/characters'
import { FEELINGS, MISSION_GROUPS, groupSummary, groupsPlayed, strongWeakGroups, groupInfo, type Feeling, type Reflection } from '../engine/activity'
import { testState } from '../engine/exam'
import { pendingMistakes, weakSkills, type Player } from '../engine/progress'
import { passedResult, testPercent, testSkillPercent } from '../engine/report'
import { TopBar } from '../components/TopBar'
import { BeforeAfter } from '../components/Charts'
import { CharacterArt } from '../components/Art'
import { playSound } from '../utils/sound'
import { speak } from '../utils/speech'

/**
 * เส้นทางฮีโร่ R-E-A-L (หน้าของนักเรียน)
 *   R ทบทวนและวัดพลังก่อนเรียน → E ตะลุยภารกิจ 6 กลุ่ม → A วัดผลหลังเรียน → L เรียนรู้และเลเวลอัป
 * เส้นทาง #/real
 */

type StepState = 'done' | 'now' | 'wait'

function StepHead({ letter, title, sub, state }: { letter: string; title: string; sub: string; state: StepState }) {
  return (
    <div className="mh-real-head">
      <span className={`mh-real-letter is-${letter.toLowerCase()}`}>{letter}</span>
      <div>
        <h2>{title}</h2>
        <small>{sub}</small>
      </div>
      <span className={`mh-real-state is-${state}`}>{state === 'done' ? '✅ เสร็จแล้ว' : state === 'now' ? '▶ ทำตอนนี้' : '⏳ ถัดไป'}</span>
    </div>
  )
}

export function RealPage() {
  const { player, save } = useGame()
  if (!player) return null
  const c = save.classroom
  const groups = groupSummary(player)
  const played = groupsPlayed(player)
  const preState = testState(player, save.bank.pre)
  const postState = testState(player, save.bank.post)
  const done = {
    r: !!player.preTest,
    e: played >= MISSION_GROUPS.length || !!player.postTest,
    a: !!player.postTest,
    l: !!player.reflection,
  }
  const order: (keyof typeof done)[] = ['r', 'e', 'a', 'l']
  const nowKey = order.find((k) => !done[k])
  const state = (k: keyof typeof done): StepState => (done[k] ? 'done' : k === nowKey ? 'now' : 'wait')

  return (
    <div className="mh-level theme-library">
      <TopBar compact />
      <div className="mh-page mh-page-narrow mh-real" data-testid="mh-real">
        <div className="mh-page-head">
          <Link to="/map" className="mh-icon-btn" aria-label="กลับแผนที่">
            <ArrowLeft size={24} />
          </Link>
          <h1 className="mh-title mh-level-title">🧭 เส้นทางฮีโร่ R-E-A-L</h1>
        </div>
        <div className="mh-real-track" aria-label="ความคืบหน้า">
          {order.map((k) => (
            <span key={k} className={`mh-real-dot is-${state(k)}`}>
              {k.toUpperCase()}
            </span>
          ))}
        </div>

        {/* R */}
        <section className="mh-card mh-real-step" data-testid="mh-real-r">
          <StepHead letter="R" title="ทบทวนและวัดพลังก่อนเรียน" sub="Recall & Review" state={state('r')} />
          <p className="mh-real-lead">เป้าหมายของเรา: ใช้เงินให้เป็น ทั้ง 6 เรื่องนี้</p>
          <ul className="mh-real-goals">
            {MISSION_GROUPS.map((g) => (
              <li key={g.id}>
                <span aria-hidden="true">{g.icon}</span> {g.name}
              </li>
            ))}
          </ul>
          <p className="mh-soft">กติกา: ตอบผิดได้ ลองใหม่ได้ ช่วยเพื่อนคิดได้ และทำแบบทดสอบอย่างตั้งใจด้วยตัวเอง</p>
          {player.preTest ? (
            <p className="mh-real-score" data-testid="mh-real-pre">
              🧭 แบบทดสอบก่อนเรียน: <b>{player.preTest.score}/{player.preTest.total}</b> คะแนน ({testPercent(player.preTest)}%)
            </p>
          ) : preState === 'ready' ? (
            <Link to="/test/pre" className="mh-btn mh-btn-gold mh-btn-block" data-testid="mh-real-pre-go">
              🧭 ทำแบบทดสอบก่อนเรียน
            </Link>
          ) : (
            <p className="mh-soft">🔒 รอคุณครูเปิดแบบทดสอบก่อนเรียน</p>
          )}
        </section>

        {/* E */}
        <section className="mh-card mh-real-step" data-testid="mh-real-e">
          <StepHead letter="E" title="ตะลุยภารกิจ" sub={`Engage & Experience · ทำแล้ว ${played}/${MISSION_GROUPS.length} กลุ่มภารกิจ`} state={state('e')} />
          <div className="mh-meter-track" aria-hidden="true">
            <span className="mh-meter-fill mh-fill-post" style={{ width: `${Math.max(3, (played / MISSION_GROUPS.length) * 100)}%` }} />
          </div>
          <div className="mh-real-groups">
            {MISSION_GROUPS.map((g) => {
              const s = groups[g.id]
              return (
                <div key={g.id} className={`mh-real-group ${s.plays > 0 ? 'is-played' : ''}`} data-testid={`mh-real-group-${g.id}`}>
                  <div className="mh-real-group-title">
                    <span aria-hidden="true">{g.icon}</span>
                    <b>{g.name}</b>
                  </div>
                  <small>
                    {s.plays > 0 ? `✅ เล่นแล้ว ${s.plays} ครั้ง${s.percent !== null ? ` · ถูก ${s.percent}%` : ''}` : g.desc}
                  </small>
                  <div className="mh-real-links">
                    {(g.id === 'team' ? [{ to: '/team', label: '👥 ภารกิจกลุ่ม' }, ...g.links] : g.links).map((l) => (
                      <Link key={l.to} to={l.to} className="mh-chip">
                        {l.label}
                      </Link>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        {/* A */}
        <section className="mh-card mh-real-step" data-testid="mh-real-a">
          <StepHead letter="A" title="วัดผลหลังเรียน" sub="Assess & Analyze" state={state('a')} />
          {player.postTest ? (
            <>
              <p className="mh-real-score" data-testid="mh-real-post">
                🎓 แบบทดสอบหลังเรียน: <b>{player.postTest.score}/{player.postTest.total}</b> คะแนน ({testPercent(player.postTest)}%){' '}
                {passedResult(player.postTest, c.passPercent) ? <span className="mh-pass-tag is-pass">ผ่านเกณฑ์ {c.passPercent}%</span> : <span className="mh-pass-tag is-fail">ยังไม่ถึงเกณฑ์ {c.passPercent}%</span>}
              </p>
              {player.preTest && <BeforeAfter pre={player.preTest} post={player.postTest} />}
            </>
          ) : postState === 'ready' ? (
            <>
              <p className="mh-soft">ทำภารกิจครบแล้ว มาดูกันว่าเก่งขึ้นแค่ไหน</p>
              <Link to="/test/post" className="mh-btn mh-btn-gold mh-btn-block" data-testid="mh-real-post-go">
                🎓 ทำแบบทดสอบหลังเรียน
              </Link>
            </>
          ) : (
            <p className="mh-soft">🔒 แบบทดสอบหลังเรียนจะเปิดเมื่อคุณครูเปิดให้ หรือเมื่อผ่านด่าน 12</p>
          )}
        </section>

        {/* L */}
        <section className="mh-card mh-real-step" data-testid="mh-real-l">
          <StepHead letter="L" title="เรียนรู้และเลเวลอัป" sub="Learn & Level Up" state={state('l')} />
          <Remedial p={player} passPercent={c.passPercent} />
          <ReflectionForm />
        </section>
      </div>
    </div>
  )
}

/** ทักษะที่ควรฝึกเพิ่ม: จากแบบทดสอบหลังเรียน (ถ้ามี) หรือจากการเล่นในเกม */
function remedialSkills(p: Player, passPercent: number) {
  if (p.postTest) return SKILLS.filter((s) => {
    const v = testSkillPercent(p.postTest, s)
    return v !== null && v < passPercent
  })
  return weakSkills(p)
}

function Remedial({ p, passPercent }: { p: Player; passPercent: number }) {
  const skills = remedialSkills(p, passPercent)
  const { strong, weak } = strongWeakGroups(p, passPercent)
  const mistakes = pendingMistakes(p, 20).length
  return (
    <div className="mh-real-remedial" data-testid="mh-real-remedial">
      {strong.length > 0 && (
        <p>
          🌟 <b>เก่งมาก:</b> {strong.map((g) => `${groupInfo(g).icon} ${groupInfo(g).name}`).join(' · ')}
        </p>
      )}
      {skills.length === 0 && weak.length === 0 ? (
        <p>💪 ยังไม่พบเรื่องที่ต้องฝึกเพิ่ม เก่งมาก! ลองด่านท้าทาย หรือช่วยสอนเพื่อนในกลุ่มนะ</p>
      ) : (
        <>
          <p>
            <b>🎯 ควรฝึกเพิ่ม:</b>
          </p>
          <ul className="mh-real-fix">
            {skills.map((s) => (
              <li key={s}>
                <span>
                  {SKILL_ICONS[s]} {SKILL_NAMES[s]}
                </span>
                <Link to={`/level/${SKILL_LEVELS[s][0]}/learn`} className="mh-chip" data-testid={`mh-real-fix-${s}`}>
                  ทบทวนด่าน {SKILL_LEVELS[s].join(', ')} ▶
                </Link>
              </li>
            ))}
            {weak
              .filter((g) => !groupInfo(g).skills.some((s) => skills.includes(s)))
              .map((g) => (
                <li key={g}>
                  <span>
                    {groupInfo(g).icon} {groupInfo(g).name}
                  </span>
                  <Link to={groupInfo(g).links[0].to} className="mh-chip">
                    ฝึก{groupInfo(g).links[0].label} ▶
                  </Link>
                </li>
              ))}
          </ul>
        </>
      )}
      {mistakes > 0 && (
        <Link to="/review" className="mh-btn mh-btn-soft mh-btn-block">
          🔁 ฝึกข้อที่เคยผิด ({mistakes} ข้อ)
        </Link>
      )}
    </div>
  )
}

function ReflectionForm() {
  const { player, updatePlayer, pushToast } = useGame()
  const old = player?.reflection
  const [feeling, setFeeling] = useState<Feeling | null>(old?.feeling ?? null)
  const [good, setGood] = useState(old?.good ?? '')
  const [improve, setImprove] = useState(old?.improve ?? '')
  const [apply, setApply] = useState(old?.apply ?? '')
  const ready = feeling !== null && (good.trim() || improve.trim() || apply.trim())

  const save = () => {
    if (!feeling) return
    const r: Reflection = { at: Date.now(), feeling, good: good.trim(), improve: improve.trim(), apply: apply.trim() }
    updatePlayer((p) => ({ ...p, reflection: r }))
    playSound('complete')
    pushToast('📝', 'บันทึกสิ่งที่ได้เรียนรู้แล้ว')
    speak('บันทึกแล้ว เก่งมากที่ทบทวนตัวเอง')
  }

  return (
    <div className="mh-reflect" data-testid="mh-reflect">
      <h3 className="mh-card-title">📝 ฉันได้เรียนรู้อะไรบ้าง</h3>
      <div className="mh-reflect-feel" role="radiogroup" aria-label="ความรู้สึก">
        {FEELINGS.map((f) => (
          <button
            key={f.id}
            type="button"
            role="radio"
            aria-checked={feeling === f.id}
            className={`mh-reflect-face ${feeling === f.id ? 'is-on' : ''}`}
            data-testid={`mh-feel-${f.id}`}
            onClick={() => {
              playSound('click')
              setFeeling(f.id)
            }}
          >
            <span>{f.icon}</span>
            <small>{f.label}</small>
          </button>
        ))}
      </div>
      {(
        [
          ['สิ่งที่ฉันทำได้ดี', good, setGood, 'mh-reflect-good', 'เช่น ทอนเงินได้เร็ว'],
          ['สิ่งที่ฉันอยากฝึกเพิ่ม', improve, setImprove, 'mh-reflect-improve', 'เช่น โจทย์ปัญหาหลายขั้น'],
          ['ฉันจะใช้เรื่องเงินในชีวิตจริงอย่างไร', apply, setApply, 'mh-reflect-apply', 'เช่น วางแผนก่อนซื้อขนม'],
        ] as const
      ).map(([label, value, set, id, ph]) => (
        <label key={id} className="mh-reflect-field">
          {label}
          <textarea className="mh-text-input" rows={2} maxLength={300} value={value} placeholder={ph} data-testid={id} onChange={(e) => set(e.target.value)} />
        </label>
      ))}
      <button type="button" className="mh-btn mh-btn-gold mh-btn-block" disabled={!ready} onClick={save} data-testid="mh-reflect-save">
        💾 บันทึก{old ? 'การแก้ไข' : ''}
      </button>
      {old && <p className="mh-soft">บันทึกล่าสุดแล้ว · แก้ไขได้ทุกเมื่อ</p>}
      <div className="mh-real-hero">
        <CharacterArt id="owl" size={64} />
        <span>คุณครูจะอ่านบันทึกนี้ แล้วช่วยแนะนำเพิ่มเติมนะ</span>
      </div>
    </div>
  )
}
