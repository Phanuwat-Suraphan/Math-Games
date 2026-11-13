import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import type { Question } from '../engine/types'
import { useGame } from '../hooks/useMoneyGame'
import { buildTeam } from '../generators'
import { earn } from '../engine/ledger'
import { logActivity } from '../engine/activity'
import { publicName } from '../engine/classroom'
import { teamList } from '../engine/teams'
import { rosterList } from '../engine/roster'
import type { Player } from '../engine/progress'
import { StepRunner } from '../components/StepRunner'
import { AvatarArt, CharacterArt } from '../components/Art'
import { Confetti } from '../components/Effects'
import { Sky } from '../components/Sky'
import { playSound } from '../utils/sound'
import { speak } from '../utils/speech'

/**
 * ภารกิจกลุ่ม: สมาชิก 2–5 คนเล่นบนเครื่องเดียวกัน ผลัดกันตอบคนละข้อ
 * เพื่อนช่วยคิดและอธิบายได้ แต่เจ้าของตาเป็นคนกดตอบ
 * คะแนน สถิติทักษะ และเหรียญของแต่ละข้อบันทึกให้เจ้าของตาคนนั้น (ไม่ใช่คะแนนรวมของกลุ่ม)
 * เส้นทาง #/team
 */

interface Member {
  /** รหัสผู้เล่นในทะเบียน (ไม่มี = ชื่อที่พิมพ์เอง ไม่บันทึกผล) */
  id?: string
  name: string
  avatar?: string
}

interface Tally {
  total: number
  correct: number
  wrong: number
  ms: number
}

const TEAM_BONUS = 5
const PER_MEMBER = 3

export function TeamMissionPage() {
  const { save, player, updateSave } = useGame()
  // ทุกคนในเครื่อง (นักเรียนในทะเบียนก่อน) · กลุ่มมาจากทะเบียนนักเรียน
  const roster = useMemo(() => rosterList(save.players), [save.players])
  const teams = useMemo(() => teamList(roster), [roster])
  const [members, setMembers] = useState<Member[] | null>(null)
  const [label, setLabel] = useState('')
  const [questions, setQuestions] = useState<Question[]>([])
  const [turn, setTurn] = useState<number | null>(0)
  const [tally, setTally] = useState<Tally[]>([])
  const [done, setDone] = useState(false)
  const turnRef = useRef<number | null>(0)
  const qStart = useRef(Date.now())
  const startedAt = useRef(Date.now())

  const begin = (list: Member[], name: string) => {
    playSound('click')
    setMembers(list)
    setLabel(name)
    setQuestions(buildTeam(Math.min(15, Math.max(9, list.length * PER_MEMBER))))
    setTally(list.map(() => ({ total: 0, correct: 0, wrong: 0, ms: 0 })))
    setTurn(0)
    turnRef.current = 0
    setDone(false)
    startedAt.current = Date.now()
    speak(`เริ่มภารกิจกลุ่ม ตาของ${list[0].name}ก่อน`)
  }

  /** บันทึกผลของข้อนี้ให้เจ้าของตา (ชื่อที่พิมพ์เองไม่มีที่บันทึก) */
  const record = (fn: (p: Player) => Player) => {
    const t = turnRef.current
    const m = t === null || !members ? undefined : members[t]
    if (!m?.id) return
    const id = m.id
    updateSave((s) => (s.players[id] ? { ...s, players: { ...s.players, [id]: fn(s.players[id]) } } : s))
  }

  const finish = () => {
    if (!members) return
    const elapsed = Date.now() - startedAt.current
    members.forEach((m, i) => {
      if (!m.id) return
      const t = tally[i]
      const id = m.id
      updateSave((s) => {
        const p = s.players[id]
        if (!p) return s
        const paid = earn(p, TEAM_BONUS, 'ร่วมภารกิจกลุ่ม', '🤝')
        const logged = logActivity(paid, {
          act: 'team-mission',
          group: 'team',
          label: `ภารกิจกลุ่ม${label ? ` (${label})` : ''}`,
          correct: t.correct,
          total: t.total,
          wrong: t.wrong,
          timeMs: t.ms || Math.round(elapsed / members.length),
          points: TEAM_BONUS,
        })
        return { ...s, players: { ...s.players, [id]: { ...logged, lastPlayed: Date.now() } } }
      })
    })
    setDone(true)
    playSound('complete')
    speak('เก่งมาก ช่วยกันทำภารกิจกลุ่มสำเร็จแล้ว')
  }

  const current = members && turn !== null ? members[turn] : null

  return (
    <div className="mh-page mh-team-page" data-testid="mh-team-page">
      <Sky city={false} />
      <div className="mh-page-head">
        <Link to={player ? '/map' : '/start'} className="mh-icon-btn" aria-label="กลับ">
          <ArrowLeft size={24} />
        </Link>
        <h1 className="mh-title">👥 ภารกิจกลุ่ม</h1>
      </div>

      {!members && <TeamSetup teams={teams.map((t) => ({ team: t.team, members: t.members }))} roster={roster} onStart={begin} />}

      {members && !done && (
        <>
          <div className="mh-card mh-team-bar" data-testid="mh-team-bar">
            {members.map((m, i) => (
              <span key={`${m.name}-${i}`} className={`mh-team-member ${turn === i ? 'is-turn' : ''}`} data-testid={`mh-team-member-${i}`}>
                {m.avatar ? <AvatarArt avatar={m.avatar} size={40} portrait /> : <span className="mh-roster-noavatar">{m.name.slice(0, 1)}</span>}
                <b>{m.name}</b>
                <small>
                  ⭐ {tally[i]?.correct ?? 0}/{tally[i]?.total ?? 0}
                </small>
              </span>
            ))}
          </div>
          <p className="mh-team-turn" role="status" data-testid="mh-team-turn">
            {current ? (
              <>
                👉 ตาของ <b>{current.name}</b> · เพื่อนช่วยคิดได้ แต่ให้ {current.name} เป็นคนกดตอบนะ
              </>
            ) : (
              <>🤝 ข้อฝึกซ้ำ: ช่วยกันคิดทั้งกลุ่ม</>
            )}
          </p>
          <StepRunner
            questions={questions}
            levelId={-1}
            mode="mission"
            earnLabel="ตอบถูก ภารกิจกลุ่ม"
            record={record}
            onIndex={(index, retry) => {
              const t = retry ? null : index % members.length
              turnRef.current = t
              setTurn(t)
              qStart.current = Date.now()
              if (t !== null) speak(`ตาของ${members[t].name}`)
            }}
            onAnswer={(_q, _r, correct, info) => {
              const t = turnRef.current
              if (info.retry || t === null) return
              setTally((list) =>
                list.map((x, i) => {
                  if (i !== t) return x
                  if (info.attempt === 1) return { total: x.total + 1, correct: x.correct + (correct ? 1 : 0), wrong: x.wrong + (correct ? 0 : 1), ms: x.ms + (Date.now() - qStart.current) }
                  return correct ? x : { ...x, wrong: x.wrong + 1 }
                }),
              )
            }}
            onFinish={finish}
          />
        </>
      )}

      {members && done && (
        <div className="mh-card mh-team-result" data-testid="mh-team-result">
          <Confetti count={30} />
          <CharacterArt id="hero" size={96} mood="happy" />
          <h2 className="mh-step-title">🎉 ภารกิจกลุ่มสำเร็จ!</h2>
          <p className="mh-soft">
            ทั้งกลุ่มตอบถูกครั้งแรก {tally.reduce((s, t) => s + t.correct, 0)} จาก {tally.reduce((s, t) => s + t.total, 0)} ข้อ · ทุกคนได้โบนัสร่วมมือ +{TEAM_BONUS} 🪙
          </p>
          <ul className="mh-team-scores">
            {members.map((m, i) => (
              <li key={`${m.name}-${i}`}>
                {m.avatar ? <AvatarArt avatar={m.avatar} size={36} portrait /> : <span className="mh-roster-noavatar">{m.name.slice(0, 1)}</span>}
                <b>{m.name}</b>
                <span>
                  ถูก {tally[i].correct}/{tally[i].total} ข้อ {tally[i].wrong > 0 ? `· ลองใหม่ ${tally[i].wrong} ครั้ง` : ''}
                </span>
                {!m.id && <small className="mh-soft">(ไม่ได้บันทึก)</small>}
              </li>
            ))}
          </ul>
          <p className="mh-help-line">คะแนนของแต่ละข้อบันทึกให้เจ้าของตาคนนั้นแล้ว 💾</p>
          <div className="mh-row-buttons">
            <button type="button" className="mh-btn mh-btn-gold" onClick={() => begin(members, label)} data-testid="mh-team-again">
              🔁 เล่นอีกรอบ
            </button>
            <button type="button" className="mh-btn mh-btn-soft" onClick={() => setMembers(null)}>
              👥 เปลี่ยนกลุ่ม
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function TeamSetup({ teams, roster, onStart }: { teams: { team: string; members: Player[] }[]; roster: Player[]; onStart: (m: Member[], label: string) => void }) {
  const [picked, setPicked] = useState<string[]>([])
  const [guests, setGuests] = useState<string[]>(['', ''])
  const asMember = (p: Player): Member => ({ id: p.id, name: p.name, avatar: p.needsAvatar ? undefined : p.avatar })
  const custom: Member[] = [...roster.filter((p) => picked.includes(p.id)).map(asMember), ...guests.filter((g) => g.trim()).map((g) => ({ name: g.trim().slice(0, 14) }))]

  return (
    <div className="mh-team-setup">
      <p className="mh-card mh-team-how">
        🤝 สมาชิก 2–5 คนใช้เครื่องเดียวกัน <b>ผลัดกันตอบคนละข้อ</b> ช่วยกันคิดและอธิบายวิธีคิดให้เพื่อนฟังได้ แต่ให้เจ้าของตาเป็นคนกดตอบ คะแนนของแต่ละข้อบันทึกให้เจ้าของตา
      </p>
      {teams.length > 0 && (
        <>
          <h2 className="mh-section-title">เลือกกลุ่มของเรา</h2>
          <div className="mh-team-grid">
            {teams.map((t) => (
              <button
                key={t.team}
                type="button"
                className="mh-card mh-team-card"
                data-testid={`mh-team-pick-${t.team}`}
                disabled={t.members.length < 2}
                onClick={() => onStart(t.members.slice(0, 5).map(asMember), `กลุ่ม ${t.team}`)}
              >
                <b>👥 กลุ่ม {t.team}</b>
                <span className="mh-team-faces">
                  {t.members.slice(0, 5).map((p) =>
                    p.needsAvatar ? (
                      <span key={p.id} className="mh-roster-noavatar">
                        {p.name.slice(0, 1)}
                      </span>
                    ) : (
                      <AvatarArt key={p.id} avatar={p.avatar} size={36} portrait />
                    ),
                  )}
                </span>
                <small>{t.members.map((p) => publicName(p)).join(' · ')}</small>
              </button>
            ))}
          </div>
        </>
      )}
      <h2 className="mh-section-title">{teams.length > 0 ? 'หรือเลือกสมาชิกเอง' : 'เลือกสมาชิก'}</h2>
      <div className="mh-card">
        {roster.length > 0 && (
          <div className="mh-team-picks" role="group" aria-label="เลือกสมาชิกจากทะเบียน">
            {roster.map((p) => {
              const on = picked.includes(p.id)
              return (
                <button
                  key={p.id}
                  type="button"
                  className={`mh-chip ${on ? 'is-on' : ''}`}
                  aria-pressed={on}
                  disabled={!on && custom.length >= 5}
                  data-testid={`mh-team-add-${p.student?.no ?? p.id}`}
                  onClick={() => setPicked((list) => (on ? list.filter((x) => x !== p.id) : [...list, p.id]))}
                >
                  {publicName(p)}
                </button>
              )
            })}
          </div>
        )}
        <p className="mh-soft">เพื่อนที่ไม่มีชื่อในเครื่องนี้ พิมพ์ชื่อเล่นได้ (เล่นได้ แต่ไม่บันทึกคะแนน)</p>
        <div className="mh-team-guests">
          {guests.map((g, i) => (
            <input
              key={i}
              className="mh-text-input"
              value={g}
              maxLength={14}
              placeholder={`ชื่อเพื่อน ${i + 1}`}
              aria-label={`ชื่อเพื่อน ${i + 1}`}
              data-testid={`mh-team-guest-${i}`}
              onChange={(e) => setGuests((list) => list.map((x, k) => (k === i ? e.target.value : x)))}
            />
          ))}
        </div>
        <button
          type="button"
          className="mh-btn mh-btn-gold mh-btn-xl mh-btn-block"
          disabled={custom.length < 2 || custom.length > 5}
          onClick={() => onStart(custom, '')}
          data-testid="mh-team-start"
        >
          ▶ เริ่มภารกิจกลุ่ม ({custom.length} คน)
        </button>
        {custom.length > 5 && <p className="mh-pin-error">กลุ่มละไม่เกิน 5 คน</p>}
      </div>
    </div>
  )
}
