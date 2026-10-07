import { useMemo, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { levelById } from '../data/levels'
import { useGame } from '../hooks/useMoneyGame'
import { isLevelUnlocked } from '../engine/progress'
import { BOSS_PASS, nextStar } from '../engine/scoring'
import { isStageNo, isStageUnlocked, recordStage, stageRecord, stageResult, stageReward, STAGES, type StageResult } from '../engine/stages'
import { buildStage } from '../generators'
import { TopBar } from '../components/TopBar'
import { StepRunner } from '../components/StepRunner'
import { CharacterArt } from '../components/Art'
import { BuildingArt } from '../components/BuildingArt'
import { Stars } from '../components/Stars'
import { Hills } from '../components/Sky'
import { Bunting } from '../components/Bunting'
import { Confetti } from '../components/Effects'
import { PracticeRange } from '../components/PracticeRange'
import { BossArena } from '../components/BossArena'
import { StageChips } from '../components/StageChips'
import { advanceBalloons, type Balloon } from '../data/practice'
import { bossHp, bossOf } from '../data/bosses'
import { playSound } from '../utils/sound'
import { PLAYABLE_MAX } from './MapPage'

/**
 * ด่านย่อย X-2 (ฝึกเก่ง) / X-3 (ท้าทาย) เส้นทาง #/level/:id/stage/:n
 * เล่นรอบเดียวจบ ดาวคิดจากข้อที่ถูกตั้งแต่ครั้งแรก ผ่านเมื่อถูก (ภายใน 2 ครั้ง) อย่างน้อย 60%
 */
export function StagePage() {
  const params = useParams<{ id: string; n: string }>()
  const id = Number(params.id)
  const n = Number(params.n)
  const level = levelById(id)
  const { player } = useGame()

  if (!player || !level || Number.isNaN(id) || !isStageNo(n)) return <Navigate to="/map" replace />
  if (!isLevelUnlocked(player, id) || id > PLAYABLE_MAX || !isStageUnlocked(player, id, n)) return <Navigate to="/map" replace />
  const def = STAGES[n]

  return (
    <div className={`mh-level ${level.theme}`}>
      <div className="mh-level-ground" aria-hidden="true">
        <Hills />
      </div>
      <TopBar compact />
      <div className="mh-page mh-level-page">
        <div className="mh-level-head mh-level-scene">
          <Bunting className="mh-scene-bunting" />
          <Link to="/map" className="mh-icon-btn" aria-label="กลับแผนที่">
            <ArrowLeft size={24} />
          </Link>
          <div className="mh-level-scene-text">
            <div className="mh-level-kicker">
              ด่านย่อย {level.id}-{n} · {def.icon} {def.name}
            </div>
            <h1 className="mh-title mh-level-title">{level.name}</h1>
          </div>
          <div className="mh-level-scene-art" aria-hidden="true">
            <BuildingArt level={level.id} className="mh-level-scene-bld" />
            <CharacterArt id={level.npc} size={64} className="mh-level-scene-npc" />
          </div>
        </div>
        <StageChips player={player} level={level.id} current={n} />
        <StageRun key={`${id}-${n}`} levelId={level.id} n={n} />
      </div>
    </div>
  )
}

function StageRun({ levelId, n }: { levelId: number; n: 2 | 3 }) {
  const { player, updatePlayer } = useGame()
  const navigate = useNavigate()
  const level = levelById(levelId)!
  const def = STAGES[n]
  const [round, setRound] = useState(0)
  const [result, setResult] = useState<(StageResult & { firstClear: boolean }) | null>(null)
  const [balloons, setBalloons] = useState<Balloon[]>([])
  const [nudge, setNudge] = useState(0)
  const [hits, setHits] = useState(0)
  const [bossEvent, setBossEvent] = useState<{ kind: 'hit' | 'miss'; key: number; text: string } | null>(null)
  const questions = useMemo(() => buildStage(levelId, def.difficulty, def.target), [levelId, def, round])
  const boss = useMemo(() => {
    const b = bossOf(levelId)
    return { ...b, name: `${b.name} ร่างโหด`, intro: `ข้ากลับมาแล้ว แข็งแกร่งกว่าเดิม! ${b.intro}` }
  }, [levelId])
  const coach = level.npc === 'hero' ? 'rabbit' : level.npc

  if (!player) return null

  const again = () => {
    playSound('click')
    setResult(null)
    setBalloons([])
    setNudge(0)
    setHits(0)
    setBossEvent(null)
    setRound((r) => r + 1)
  }

  if (result) {
    const reward = stageReward(n, result.stars, result.firstClear)
    const next = nextStar(result.firstTry, result.total)
    return (
      <div className="mh-card mh-result mh-stage-result" data-testid="mh-stage-done">
        {result.passed && <Confetti />}
        <div className="mh-result-banner">{result.passed ? `ผ่านด่านย่อย ${levelId}-${n}!` : 'เกือบแล้ว! 💪'}</div>
        {result.passed ? (
          <>
            <div className="mh-result-stars" aria-label={`ได้ ${result.stars} ดาว`}>
              <Stars n={result.stars} size={56} reveal />
            </div>
            <p className="mh-stage-score">
              ถูกตั้งแต่ครั้งแรก {result.firstTry}/{result.total} ข้อ
              {next ? ` · ถูกตั้งแต่ครั้งแรกอีก ${next.need} ข้อจะได้ ${'⭐'.repeat(next.stars)}` : ' · ได้ดาวเต็ม!'}
            </p>
            <div className="mh-result-rewards">
              <span className="mh-reward">✨ +{reward.exp} EXP</span>
              <span className="mh-reward">🪙 +{reward.coins}</span>
              {!result.firstClear && <span className="mh-reward">🔁 เล่นซ้ำได้รางวัลครึ่งหนึ่ง</span>}
            </div>
            {n === 2 && (
              <div className="mh-unlock">
                🔓 ปลดล็อก <b>ด่านย่อย {levelId}-3 ท้าทาย 🔥</b> แล้ว!
              </div>
            )}
          </>
        ) : (
          <>
            <CharacterArt id="fox" size={96} mood="think" />
            <p>
              ตอบถูก (ภายใน 2 ครั้ง) ต้องได้อย่างน้อย {Math.ceil(result.total * BOSS_PASS)} จาก {result.total} ข้อ
            </p>
            <p className="mh-soft">ไม่เป็นไรนะ ลองทบทวนด่านผจญภัยแล้วกลับมาใหม่!</p>
          </>
        )}
        <div className="mh-row-buttons">
          <button type="button" className="mh-btn mh-btn-soft" onClick={again} data-testid="mh-stage-again">
            🔄 เล่นอีกครั้ง
          </button>
          <Link to="/map" className="mh-btn mh-btn-go">
            🗺 กลับแผนที่
          </Link>
          {result.passed && n === 2 && (
            <button
              type="button"
              className="mh-btn mh-btn-gold"
              data-testid="mh-stage-next"
              onClick={() => {
                playSound('click')
                navigate(`/level/${levelId}/stage/3`)
              }}
            >
              🔥 ไปด่านท้าทาย
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="mh-step-wrap">
      <h2 className="mh-step-title mh-step-title-out">
        {def.icon} ด่านย่อย {levelId}-{n} · {def.name}
        {stageRecord(player, levelId, n).stars > 0 && <span className="mh-soft"> (ดาวที่ดีที่สุด {stageRecord(player, levelId, n).stars})</span>}
      </h2>
      {def.scene === 'balloons' ? (
        <PracticeRange total={questions.length} balloons={balloons} nudge={nudge} coach={coach} avatar={player.avatar} wear={player.wear} />
      ) : (
        <BossArena boss={boss} hp={bossHp(questions.length, BOSS_PASS)} hits={hits} event={bossEvent} avatar={player.avatar} wear={player.wear} />
      )}
      <StepRunner
        key={round}
        questions={questions}
        levelId={levelId}
        mode={n === 3 ? 'boss' : 'practice'}
        learn={level.learn}
        earnLabel={`ตอบถูก ด่าน ${levelId}-${n}`}
        onAnswer={(_q, _r, correct, info) => {
          if (def.scene === 'balloons') {
            setBalloons((list) => advanceBalloons(list, correct, info.attempt, info.retry))
            setNudge((k) => (!correct && info.attempt === 1 && !info.retry ? k + 1 : 0))
            return
          }
          if (correct && !info.retry) {
            setHits((h) => h + 1)
            setBossEvent((e) => ({ kind: 'hit', key: (e?.key ?? 0) + 1, text: boss.ouch[Math.floor(Math.random() * boss.ouch.length)] }))
          } else if (!correct) {
            setBossEvent((e) => ({ kind: 'miss', key: (e?.key ?? 0) + 1, text: boss.taunts[Math.floor(Math.random() * boss.taunts.length)] }))
          }
        }}
        onFinish={(s) => {
          const r = stageResult(s)
          const firstClear = stageRecord(player, levelId, n).stars === 0
          playSound(r.passed ? 'complete' : 'wrong')
          updatePlayer((p) => recordStage(p, levelId, n, r))
          setResult({ ...r, firstClear })
        }}
      />
    </div>
  )
}
