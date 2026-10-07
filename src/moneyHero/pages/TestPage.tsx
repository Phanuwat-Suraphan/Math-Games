import { useMemo, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useGame } from '../hooks/useMoneyGame'
import { buildTest } from '../generators'
import { TEST_REWARD, canTakePostTest, recordTest, testResultFrom, type TestKind, type TestResult } from '../engine/progress'
import { testPercent } from '../engine/report'
import { TopBar } from '../components/TopBar'
import { StepRunner } from '../components/StepRunner'
import { CharacterArt } from '../components/Art'
import { BeforeAfter, SkillBars, StatTile } from '../components/Charts'
import { Confetti } from '../components/Effects'
import { SKILLS } from '../data/characters'
import { playSound } from '../utils/sound'

/**
 * แบบทดสอบก่อนเรียน (18 ข้อ) และหลังเรียน (20 ข้อ)
 * เส้นทาง #/test/pre และ #/test/post
 *
 * ระหว่างทำไม่บอกถูกผิด ไม่มีตัวช่วย (โหมด test ของ StepRunner)
 * จบแล้วแสดงคะแนนรายทักษะ และกราฟก่อน → หลังเรียนเมื่อมีครบทั้งสองครั้ง
 */

const INFO: Record<TestKind, { title: string; icon: string; intro: string }> = {
  pre: {
    title: 'แบบทดสอบก่อนเรียน',
    icon: '🧭',
    intro: 'มาวัดพลังกันก่อนออกผจญภัย! ทำให้ดีที่สุด ไม่ต้องกังวลถ้ายังไม่รู้ เพราะเรากำลังจะเรียนกัน',
  },
  post: {
    title: 'แบบทดสอบหลังเรียน',
    icon: '🎓',
    intro: 'ฮีโร่ผ่านเมืองเงินทองครบแล้ว! มาดูกันว่าพลังเพิ่มขึ้นเท่าไร',
  },
}

function minutesText(ms: number): string {
  const m = Math.floor(ms / 60000)
  const s = Math.round((ms % 60000) / 1000)
  return m > 0 ? `${m} นาที ${s} วินาที` : `${s} วินาที`
}

export function TestPage() {
  const params = useParams<{ kind: string }>()
  const kind = params.kind === 'post' ? 'post' : params.kind === 'pre' ? 'pre' : null
  const { player, updatePlayer } = useGame()
  const navigate = useNavigate()
  const [phase, setPhase] = useState<'intro' | 'run' | 'done'>('intro')
  const [result, setResult] = useState<TestResult | null>(null)
  const [round, setRound] = useState(0)
  const questions = useMemo(() => (kind ? buildTest(kind) : []), [kind, round])

  if (!player || !kind) return <Navigate to="/map" replace />
  const info = INFO[kind]
  const locked = kind === 'post' && !canTakePostTest(player)
  const previous = kind === 'pre' ? player.preTest : player.postTest

  return (
    <div className="mh-level theme-library">
      <TopBar compact />
      <div className="mh-page mh-page-narrow">
        <div className="mh-page-head">
          <Link to="/map" className="mh-icon-btn" aria-label="กลับแผนที่">
            <ArrowLeft size={24} />
          </Link>
          <h1 className="mh-title mh-level-title">
            {info.icon} {info.title}
          </h1>
        </div>

        {phase === 'intro' && (
          <div className="mh-card mh-center mh-test-intro" data-testid="mh-test-intro">
            <CharacterArt id="owl" size={110} />
            {locked ? (
              <>
                <p className="mh-test-lead">🔒 แบบทดสอบหลังเรียนจะเปิดเมื่อผ่านด่าน 12 ศึกสุดท้าย</p>
                <Link to="/map" className="mh-btn mh-btn-gold">
                  🗺 กลับไปผจญภัยต่อ
                </Link>
              </>
            ) : (
              <>
                <p className="mh-test-lead">{info.intro}</p>
                <ul className="mh-test-rules">
                  <li>📝 มีทั้งหมด {questions.length} ข้อ ครอบคลุมทุกเรื่องของเงิน</li>
                  <li>🤫 ระหว่างทำจะยังไม่บอกถูกผิด และไม่มีตัวช่วย</li>
                  <li>🎁 ทำครั้งแรกได้ +{TEST_REWARD[kind].exp} EXP และ +{TEST_REWARD[kind].coins} 🪙</li>
                </ul>
                {previous && (
                  <p className="mh-soft">
                    เคยทำแล้ว ได้ {previous.score} / {previous.total} ข้อ ({testPercent(previous)}%) · ทำใหม่จะบันทึกผลล่าสุดแทน
                  </p>
                )}
                <div className="mh-row-buttons">
                  <Link to="/map" className="mh-btn mh-btn-soft">
                    ไว้ทีหลัง
                  </Link>
                  <button
                    type="button"
                    className="mh-btn mh-btn-gold mh-btn-xl"
                    data-testid="mh-test-start"
                    onClick={() => {
                      playSound('click')
                      setPhase('run')
                    }}
                  >
                    ▶ เริ่มทำแบบทดสอบ
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {phase === 'run' && (
          <StepRunner
            key={round}
            questions={questions}
            levelId={-1}
            mode="test"
            onFinish={(s) => {
              const r = testResultFrom(s)
              updatePlayer((p) => recordTest(p, kind, r))
              setResult(r)
              setPhase('done')
              playSound('complete')
            }}
          />
        )}

        {phase === 'done' && result && (
          <TestResultView
            kind={kind}
            result={result}
            pre={kind === 'post' ? player.preTest : undefined}
            onAgain={() => {
              setRound((n) => n + 1)
              setResult(null)
              setPhase('intro')
            }}
            onMap={() => navigate('/map')}
          />
        )}
      </div>
    </div>
  )
}

function TestResultView({
  kind,
  result,
  pre,
  onAgain,
  onMap,
}: {
  kind: TestKind
  result: TestResult
  pre?: TestResult
  onAgain: () => void
  onMap: () => void
}) {
  const pct = testPercent(result) ?? 0
  const values = {} as Record<(typeof SKILLS)[number], number | null>
  const counts = {} as Record<(typeof SKILLS)[number], number>
  for (const s of SKILLS) {
    const v = result.skills[s]
    values[s] = v.total > 0 ? Math.round((v.correct / v.total) * 100) : null
    counts[s] = v.total
  }
  const prePct = testPercent(pre)
  return (
    <div className="mh-card mh-test-result" data-testid="mh-test-result">
      {pct >= 50 && <Confetti />}
      <div className="mh-test-score">
        <CharacterArt id={pct >= 70 ? 'hero' : 'owl'} size={96} mood={pct >= 50 ? 'happy' : 'normal'} />
        <div>
          <div className="mh-test-score-num">
            {result.score} <small>/ {result.total}</small>
          </div>
          <div className="mh-test-score-pct">{pct}%</div>
          <p className="mh-soft">
            {kind === 'pre'
              ? 'บันทึกพลังเริ่มต้นแล้ว! ออกผจญภัยแล้วกลับมาดูว่าเก่งขึ้นแค่ไหน'
              : prePct !== null
                ? pct > prePct
                  ? `เก่งขึ้นจากก่อนเรียน ${pct - prePct}% สุดยอดไปเลย!`
                  : 'ไม่เป็นไรนะ ลองทบทวนด่านที่ยังไม่มั่นใจ แล้วมาทำใหม่ได้'
                : 'เยี่ยมมาก! ฮีโร่เรียนจบเมืองเงินทองแล้ว'}
          </p>
        </div>
      </div>
      <div className="mh-stat-tiles">
        <StatTile icon="✅" label="ตอบถูก" value={`${result.score} ข้อ`} />
        <StatTile icon="⏱" label="เวลาที่ใช้" value={minutesText(result.timeMs)} />
        {prePct !== null && <StatTile icon="📈" label="พัฒนาการ" value={`${pct - prePct > 0 ? '+' : ''}${pct - prePct}%`} sub={`ก่อนเรียน ${prePct}%`} />}
      </div>
      {kind === 'post' && pre ? <BeforeAfter pre={pre} post={result} /> : <SkillBars values={values} counts={counts} caption="คะแนนแยกตามทักษะ (%)" />}
      <div className="mh-row-buttons">
        <button type="button" className="mh-btn mh-btn-soft" onClick={onAgain}>
          🔄 ทำอีกครั้ง
        </button>
        <button type="button" className="mh-btn mh-btn-gold" onClick={onMap} data-testid="mh-test-to-map">
          🗺 ไปแผนที่
        </button>
      </div>
    </div>
  )
}
