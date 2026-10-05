import type { Question, Response } from '../engine/types'
import { CHARACTERS } from '../data/characters'
import { speak } from '../utils/speech'
import { CharacterArt } from './Art'
import { VisualView } from './Visual'
import { ChoiceInput } from './inputs/ChoiceInput'
import { AmountInput, NumberInput } from './inputs/AmountInput'
import { PayInput } from './inputs/PayInput'
import { MatchInput } from './inputs/MatchInput'
import { SortInput } from './inputs/SortInput'

/**
 * แสดงโจทย์หนึ่งข้อ: ตัวละครบอกคำสั่งสั้น ๆ + เรื่องราว + ภาพ + ช่องตอบแบบที่เหมาะกับโจทย์
 */

export function QuestionInput({
  q,
  disabled,
  wrongKeys,
  onSubmit,
}: {
  q: Question
  disabled: boolean
  wrongKeys?: string[]
  onSubmit: (r: Response) => void
}) {
  switch (q.kind) {
    case 'choice':
      return <ChoiceInput q={q} disabled={disabled} wrongKeys={wrongKeys} onSubmit={onSubmit} />
    case 'amount':
      return <AmountInput q={q} disabled={disabled} onSubmit={onSubmit} />
    case 'number':
      return <NumberInput q={q} disabled={disabled} onSubmit={onSubmit} />
    case 'pay':
      return <PayInput q={q} disabled={disabled} wrongKeys={wrongKeys} onSubmit={onSubmit} />
    case 'match':
      return <MatchInput q={q} disabled={disabled} wrongKeys={wrongKeys} onSubmit={onSubmit} />
    case 'sort':
      return <SortInput q={q} disabled={disabled} wrongKeys={wrongKeys} onSubmit={onSubmit} />
    default:
      return <p className="mh-help-line">🛠️ โจทย์แบบนี้จะเปิดในส่วนถัดไป</p>
  }
}

export function QuestionView({
  q,
  disabled,
  wrongKeys,
  inputKey,
  onSubmit,
}: {
  q: Question
  disabled: boolean
  wrongKeys?: string[]
  inputKey: number
  onSubmit: (r: Response) => void
}) {
  const npc = q.npc ?? 'rabbit'
  // ภาพประกอบของโจทย์จ่ายเงิน/จับคู่/เรียงลำดับ อยู่ในช่องตอบแล้ว ไม่ต้องแสดงซ้ำ
  const showVisual = q.visual && q.kind !== 'pay' && q.kind !== 'shop'

  return (
    <div className="mh-q" data-testid="mh-question" data-kind={q.kind} data-gen={q.gen}>
      <div className="mh-q-head">
        <CharacterArt id={npc} size={64} />
        <div className="mh-bubble mh-q-title">
          <span className="mh-q-npc">{CHARACTERS[npc].name}</span>
          <strong>{q.title}</strong>
          <button
            type="button"
            className="mh-speak"
            aria-label="ฟังโจทย์"
            onClick={() => speak(`${q.story ?? ''} ${q.title}`)}
          >
            🔈
          </button>
        </div>
      </div>
      {q.story && <div className="mh-q-story">{q.story}</div>}
      {showVisual && q.visual && (
        <div className="mh-q-visual">
          <VisualView visual={q.visual} />
        </div>
      )}
      <QuestionInput key={inputKey} q={q} disabled={disabled} wrongKeys={wrongKeys} onSubmit={onSubmit} />
    </div>
  )
}

export function HintPanel({ q, level }: { q: Question; level: number }) {
  if (level <= 0) return null
  return (
    <div className="mh-hint" data-testid="mh-hint" aria-live="polite">
      <div className="mh-hint-row">
        <span className="mh-hint-badge">💡 1</span>
        <span>{q.hint.text}</span>
      </div>
      {level >= 2 && (
        <div className="mh-hint-row mh-hint-visual">
          <span className="mh-hint-badge">💡 2</span>
          <div>
            <span>{q.hint.visualNote}</span>
            {q.hint.visual && <VisualView visual={q.hint.visual} />}
          </div>
        </div>
      )}
      {level >= 3 && (
        <div className="mh-hint-row">
          <span className="mh-hint-badge">💡 3</span>
          <ol className="mh-steps">
            {q.hint.partial.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
            <li className="mh-steps-more">… ลองคิดขั้นต่อไปเองนะ</li>
          </ol>
        </div>
      )}
    </div>
  )
}
