import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import type { Question } from '../engine/types'
import { useGame } from '../hooks/useMoneyGame'
import { markMistakeFixed, pendingMistakes } from '../engine/progress'
import { regenerate } from '../generators'
import { TopBar } from '../components/TopBar'
import { StepRunner, type RunSummary } from '../components/StepRunner'
import { CharacterArt } from '../components/Art'
import { Confetti } from '../components/Effects'
import { playSound } from '../utils/sound'

/**
 * ฝึกข้อที่เคยผิด: โจทย์แบบเดียวกับที่เคยพลาด แต่ตัวเลขใหม่
 * ตอบถูกแล้วโจทย์แบบนั้นถูกนับว่า "แก้ได้แล้ว" (ตรา "ไม่ยอมแพ้" นับจากตรงนี้)
 * เส้นทาง #/review
 */
export function ReviewPage() {
  const { player, updatePlayer } = useGame()
  const [done, setDone] = useState<RunSummary | null>(null)
  const [fixed, setFixed] = useState(0)

  // สร้างชุดโจทย์ครั้งเดียวตอนเปิดหน้า
  const questions = useMemo<Question[]>(() => {
    if (!player) return []
    const out: Question[] = []
    for (const m of pendingMistakes(player)) {
      try {
        out.push(regenerate(m.gen, m.difficulty))
      } catch {
        // แบบโจทย์นี้ถูกเลิกใช้แล้ว ข้ามไป
      }
    }
    return out
  }, [])

  if (!player) return null

  return (
    <div className="mh-level theme-puzzle">
      <TopBar compact />
      <div className="mh-page mh-page-narrow">
        <div className="mh-page-head">
          <Link to="/stats" className="mh-icon-btn" aria-label="กลับ">
            <ArrowLeft size={24} />
          </Link>
          <h1 className="mh-title mh-level-title">🔁 ฝึกข้อที่เคยผิด</h1>
        </div>

        {questions.length === 0 ? (
          <div className="mh-card mh-center">
            <CharacterArt id="fox" size={100} />
            <p>ยังไม่มีข้อที่ต้องฝึก เก่งมาก! 🎉</p>
            <Link to="/map" className="mh-btn mh-btn-gold">
              🗺 กลับแผนที่
            </Link>
          </div>
        ) : done ? (
          <div className="mh-card mh-center" data-testid="mh-review-done">
            <Confetti />
            <CharacterArt id="fox" size={100} />
            <h2 className="mh-step-title">ฝึกครบแล้ว! 💪</h2>
            <p>
              แก้โจทย์ที่เคยพลาดได้ {fixed} จาก {done.originals} แบบ · ได้ +{done.exp} EXP · +{done.coins} 🪙
            </p>
            <p className="mh-soft">ข้อที่ยังไม่ถูก จะรอให้ฝึกอีกครั้งในครั้งหน้านะ</p>
            <div className="mh-row-buttons">
              <Link to="/stats" className="mh-btn mh-btn-soft">
                📊 ดูสถิติ
              </Link>
              <Link to="/map" className="mh-btn mh-btn-gold">
                🗺 กลับแผนที่
              </Link>
            </div>
          </div>
        ) : (
          <StepRunner
            questions={questions}
            levelId={-1}
            mode="review"
            onAnswer={(q, _r, correct) => {
              if (!correct) return
              setFixed((n) => n + 1)
              updatePlayer((p) => markMistakeFixed(p, q.gen))
            }}
            onFinish={(s) => {
              playSound('complete')
              setDone(s)
            }}
          />
        )}
      </div>
    </div>
  )
}
