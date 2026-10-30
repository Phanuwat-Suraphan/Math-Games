import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useGame } from '../hooks/useMoneyGame'
import { TEST_REWARD, type TestKind, type TestResult } from '../engine/progress'
import { fullScore, gradeAttempt, KIND_NAME, makePaper, type Given, type TestAttempt } from '../engine/testBank'
import { attemptResult, clearRun, loadRun, recordAttempt, saveRun, testState, type TestRun } from '../engine/exam'
import { passedResult, testPercent } from '../engine/report'
import { TopBar } from '../components/TopBar'
import { ExamRunner } from '../components/ExamRunner'
import { CharacterArt } from '../components/Art'
import { BeforeAfter, SkillBars, StatTile } from '../components/Charts'
import { Confetti } from '../components/Effects'
import { SKILLS } from '../data/characters'
import { playSound } from '../utils/sound'

/**
 * แบบทดสอบก่อนเรียนและหลังเรียน จากคลังข้อสอบที่ครูแก้ไขได้
 * เส้นทาง #/test/pre และ #/test/post
 *
 * ระหว่างทำไม่บอกถูกผิด จับเวลาตามที่ครูตั้ง ทำค้างไว้แล้วรีเฟรชกลับมาทำต่อได้
 * จบแล้วแสดงคะแนนรายจุดประสงค์ และกราฟก่อน → หลังเรียนเมื่อมีครบทั้งสองครั้ง
 */

const INFO: Record<TestKind, { icon: string; intro: string }> = {
  pre: {
    icon: '🧭',
    intro: 'มาวัดพลังกันก่อนออกผจญภัย! ทำให้ดีที่สุด ไม่ต้องกังวลถ้ายังไม่รู้ เพราะเรากำลังจะทบทวนกัน',
  },
  post: {
    icon: '🎓',
    intro: 'ฮีโร่ตะลุยเมืองเงินมาแล้ว! มาดูกันว่าพลังเพิ่มขึ้นเท่าไร',
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
  const { player, save, updatePlayer } = useGame()
  const navigate = useNavigate()
  const bank = save.bank
  const [run, setRun] = useState<TestRun | null>(() => (player && kind ? loadRun(player.id, kind, bank) : null))
  const [done, setDone] = useState<TestAttempt | null>(null)

  // ทำค้างไว้: บันทึกคำตอบทุกครั้งที่เปลี่ยน
  useEffect(() => {
    if (run) saveRun(run)
  }, [run])

  if (!player || !kind) return <Navigate to="/map" replace />
  const form = bank[kind]
  const info = INFO[kind]
  const state = testState(player, form)
  const previous = kind === 'pre' ? player.preTest : player.postTest

  const start = () => {
    playSound('click')
    const r: TestRun = { player: player.id, kind, startedAt: Date.now(), bankAt: bank.updatedAt, paper: makePaper(form), answers: {} }
    setRun(r)
  }

  const submit = (answers: Record<string, Given>, timedOut: boolean) => {
    if (!run) return
    const attempt = gradeAttempt(form, answers, { startedAt: run.startedAt, at: Date.now(), bankAt: run.bankAt, timedOut })
    updatePlayer((p) => recordAttempt(p, attempt))
    clearRun()
    setRun(null)
    setDone(attempt)
    playSound('complete')
  }

  return (
    <div className="mh-level theme-library">
      <TopBar compact />
      <div className="mh-page mh-page-narrow">
        <div className="mh-page-head">
          {run && !done ? (
            <span className="mh-icon-btn mh-exam-lock" aria-hidden="true">
              📝
            </span>
          ) : (
            <Link to="/map" className="mh-icon-btn" aria-label="กลับแผนที่">
              <ArrowLeft size={24} />
            </Link>
          )}
          <h1 className="mh-title mh-level-title">
            {info.icon} {form.title || KIND_NAME[kind]}
          </h1>
        </div>

        {!run && !done && (
          <div className="mh-card mh-center mh-test-intro" data-testid="mh-test-intro">
            <CharacterArt id="owl" size={110} />
            {state === 'locked' || state === 'closed' ? (
              <>
                <p className="mh-test-lead" data-testid="mh-test-locked">
                  {state === 'locked' ? '🔒 แบบทดสอบหลังเรียนจะเปิดเมื่อคุณครูเปิดให้ทำ หรือเมื่อผ่านด่าน 12 ศึกสุดท้าย' : '🔒 คุณครูยังไม่เปิดแบบทดสอบนี้'}
                </p>
                <Link to="/map" className="mh-btn mh-btn-gold">
                  🗺 กลับไปผจญภัยต่อ
                </Link>
              </>
            ) : state === 'done' ? (
              <>
                <p className="mh-test-lead" data-testid="mh-test-done">
                  ✅ ทำแบบทดสอบนี้แล้ว{previous ? ` ได้ ${previous.score} / ${previous.total} คะแนน (${testPercent(previous)}%)` : ''}
                </p>
                <p className="mh-soft">ถ้าต้องทำใหม่ ให้บอกคุณครู</p>
                <Link to="/map" className="mh-btn mh-btn-gold">
                  🗺 ไปแผนที่
                </Link>
              </>
            ) : (
              <>
                <p className="mh-test-lead">{info.intro}</p>
                <ul className="mh-test-rules">
                  <li>
                    📝 มี {form.items.length} ข้อ คะแนนเต็ม {fullScore(form)} คะแนน
                  </li>
                  {form.minutes > 0 && <li>⏱ มีเวลา {form.minutes} นาที หมดเวลาระบบส่งคำตอบให้เอง</li>}
                  <li>🤫 ระหว่างทำจะยังไม่บอกถูกผิด และไม่มีตัวช่วย ข้ามไปทำข้ออื่นแล้วกลับมาแก้ได้</li>
                  <li>
                    🎁 ทำครั้งแรกได้ +{TEST_REWARD[kind].exp} EXP และ +{TEST_REWARD[kind].coins} 🪙
                  </li>
                  {form.oneAttempt && <li>☝️ ทำได้ครั้งเดียว ตั้งใจทำนะ</li>}
                </ul>
                <div className="mh-row-buttons">
                  <Link to="/map" className="mh-btn mh-btn-soft">
                    ไว้ทีหลัง
                  </Link>
                  <button type="button" className="mh-btn mh-btn-gold mh-btn-xl" data-testid="mh-test-start" onClick={start}>
                    ▶ เริ่มทำแบบทดสอบ
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {run && !done && <ExamRunner form={form} run={run} onChange={(answers) => setRun({ ...run, answers })} onSubmit={submit} />}

        {done && (
          <TestResultView
            kind={kind}
            attempt={done}
            pre={kind === 'post' ? player.preTest : undefined}
            passPercent={save.classroom.passPercent}
            canAgain={!form.oneAttempt}
            onAgain={() => setDone(null)}
            onMap={() => navigate('/map')}
          />
        )}
      </div>
    </div>
  )
}

function TestResultView({
  kind,
  attempt,
  pre,
  passPercent,
  canAgain,
  onAgain,
  onMap,
}: {
  kind: TestKind
  attempt: TestAttempt
  pre?: TestResult
  passPercent: number
  canAgain: boolean
  onAgain: () => void
  onMap: () => void
}) {
  const result = attemptResult(attempt)
  const pct = testPercent(result) ?? 0
  const values = {} as Record<(typeof SKILLS)[number], number | null>
  const counts = {} as Record<(typeof SKILLS)[number], number>
  for (const s of SKILLS) {
    const v = result.skills[s]
    values[s] = v.total > 0 ? Math.round((v.correct / v.total) * 100) : null
    counts[s] = v.total
  }
  const prePct = testPercent(pre)
  const passed = kind === 'post' && passedResult(result, passPercent)
  return (
    <div className="mh-card mh-test-result" data-testid="mh-test-result">
      {pct >= 50 && <Confetti />}
      <div className="mh-test-score">
        <CharacterArt id={pct >= 70 ? 'hero' : 'owl'} size={96} mood={pct >= 50 ? 'happy' : 'normal'} />
        <div>
          <div className="mh-test-score-num" data-testid="mh-test-score">
            {result.score} <small>/ {result.total} คะแนน</small>
          </div>
          <div className="mh-test-score-pct">{pct}%</div>
          {attempt.timedOut && <p className="mh-pin-error">⏱ หมดเวลา ระบบส่งคำตอบให้แล้ว</p>}
          <p className="mh-soft">
            {kind === 'pre'
              ? 'บันทึกพลังเริ่มต้นแล้ว! ออกผจญภัยแล้วกลับมาดูว่าเก่งขึ้นแค่ไหน'
              : passed
                ? `ผ่านเกณฑ์ร้อยละ ${passPercent} แล้ว ${prePct !== null && pct > prePct ? `เก่งขึ้นจากก่อนเรียน ${pct - prePct}%` : ''} สุดยอดไปเลย!`
                : 'ไม่เป็นไรนะ ลองทบทวนภารกิจที่ยังไม่มั่นใจ แล้วคุณครูจะช่วยฝึกเพิ่ม'}
          </p>
        </div>
      </div>
      <div className="mh-stat-tiles">
        <StatTile icon="✅" label="ตอบถูก" value={`${attempt.correct}/${attempt.count} ข้อ`} />
        <StatTile icon="⏱" label="เวลาที่ใช้" value={minutesText(result.timeMs)} />
        {prePct !== null && kind === 'post' && <StatTile icon="📈" label="พัฒนาการ" value={`${pct - prePct > 0 ? '+' : ''}${pct - prePct}%`} sub={`ก่อนเรียน ${prePct}%`} />}
      </div>
      {kind === 'post' && pre ? <BeforeAfter pre={pre} post={result} /> : <SkillBars values={values} counts={counts} caption="คะแนนแยกตามจุดประสงค์ (%)" />}
      <div className="mh-row-buttons">
        {canAgain && (
          <button type="button" className="mh-btn mh-btn-soft" onClick={onAgain}>
            🔄 ทำอีกครั้ง
          </button>
        )}
        <button type="button" className="mh-btn mh-btn-gold" onClick={onMap} data-testid="mh-test-to-map">
          🗺 ไปแผนที่
        </button>
      </div>
    </div>
  )
}
