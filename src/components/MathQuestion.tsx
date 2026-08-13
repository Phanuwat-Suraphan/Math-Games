import { AnimatePresence, motion } from 'framer-motion'
import type { Question } from '../types/question'

export type AnswerState = 'idle' | 'correct' | 'wrong'

interface MathQuestionProps {
  question: Question
  questionNumber: number
  totalQuestions: number
  answerState: AnswerState
  wrongChoices: number[]
  onAnswer: (choice: number) => void
}

const CHOICE_LABELS = ['ก', 'ข', 'ค', 'ง']

export function MathQuestion({
  question,
  questionNumber,
  totalQuestions,
  answerState,
  wrongChoices,
  onAnswer,
}: MathQuestionProps) {
  const isLocked = answerState === 'correct'

  return (
    <div className="w-full">
      <div className="mb-3 flex items-center justify-between text-sm font-semibold text-slate-300">
        <span>
          ข้อที่ {questionNumber} จาก {totalQuestions}
        </span>
        <span className="rounded-full bg-night-700/70 px-3 py-1 text-slate-300">
          เลือกคำตอบที่ถูกต้อง
        </span>
      </div>

      <motion.div
        key={question.id}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="surface-card px-4 py-8 text-center sm:py-12"
      >
        <p className="break-words text-4xl font-bold tracking-wide text-white sm:text-5xl">
          {question.prompt}
        </p>
      </motion.div>

      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {question.choices.map((choice, index) => {
          const isWrongChoice = wrongChoices.includes(choice)
          const isCorrectChoice =
            answerState === 'correct' && choice === question.answer

          return (
            <button
              key={`${question.id}-${choice}`}
              type="button"
              disabled={isLocked || isWrongChoice}
              onClick={() => onAnswer(choice)}
              aria-label={`ตัวเลือก ${CHOICE_LABELS[index] ?? index + 1}: ${choice}${
                isWrongChoice ? ' (ตอบผิดแล้ว)' : ''
              }`}
              className={[
                'flex min-h-[68px] items-center gap-3 rounded-2xl border-b-4 px-5 py-4 text-left',
                'text-2xl font-bold tabular-nums transition-all duration-150',
                'active:translate-y-0.5 active:border-b-2 disabled:active:translate-y-0',
                isCorrectChoice
                  ? 'border-leaf-600 bg-leaf-500 text-night-900'
                  : isWrongChoice
                    ? 'border-ember-700 bg-ember-600/30 text-ember-400 line-through opacity-70'
                    : 'border-night-500 bg-night-700 text-white hover:bg-night-600',
                isLocked && !isCorrectChoice ? 'opacity-50' : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              <span
                aria-hidden="true"
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-base font-bold ${
                  isCorrectChoice
                    ? 'bg-night-900/20 text-night-900'
                    : 'bg-night-900/60 text-slate-300'
                }`}
              >
                {isCorrectChoice ? '✓' : isWrongChoice ? '✕' : CHOICE_LABELS[index]}
              </span>
              <span>{choice.toLocaleString('en-US')}</span>
            </button>
          )
        })}
      </div>

      <AnimatePresence mode="wait">
        {answerState === 'correct' ? (
          <motion.div
            key="feedback-correct"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            role="status"
            aria-live="polite"
            className="mt-5 rounded-2xl border border-leaf-500/40 bg-leaf-600/20 p-4 text-center"
          >
            <p className="text-2xl font-bold text-leaf-400">ถูกต้อง! 🎉</p>
            <p className="mt-1 text-sm text-slate-200">{question.explanation}</p>
          </motion.div>
        ) : null}

        {answerState === 'wrong' ? (
          <motion.div
            key="feedback-wrong"
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            role="status"
            aria-live="polite"
            className="mt-5 rounded-2xl border border-gold-400/40 bg-gold-500/15 p-4 text-center"
          >
            <p className="text-xl font-bold text-gold-300">
              ยังไม่ถูก ลองอีกครั้งนะ! 💪
            </p>
            <p className="mt-1 text-sm text-slate-200">
              ใบ้ให้นิดหนึ่ง: {question.explanation}
            </p>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}
