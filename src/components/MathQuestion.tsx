import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { Calculator } from './Calculator'
import { SolutionSteps } from './SolutionSteps'
import type { Question } from '../questionEngine/types'

export type AnswerState = 'idle' | 'correct' | 'wrong'

interface MathQuestionProps {
  question: Question
  questionNumber: number
  totalQuestions: number
  answerState: AnswerState
  /** ข้อความของตัวเลือกที่ตอบผิดไปแล้ว */
  wrongChoices: string[]
  /** เปิดคำใบ้อยู่หรือยัง คุมจากหน้าจอเพื่อบันทึกว่าเด็กใช้คำใบ้กี่ข้อ */
  hintShown: boolean
  onAnswer: (choiceText: string) => void
  onRequestHint: () => void
}

const CHOICE_LABELS = ['ก', 'ข', 'ค', 'ง']

/** อ่านตัวเลขให้เป็นธรรมชาติสำหรับโปรแกรมอ่านหน้าจอ เช่น 3/4 → "3 ส่วน 4" */
function toSpeech(text: string): string {
  return text.includes('/') ? text.replace('/', ' ส่วน ') : text
}

export function MathQuestion({
  question,
  questionNumber,
  totalQuestions,
  answerState,
  wrongChoices,
  hintShown,
  onAnswer,
  onRequestHint,
}: MathQuestionProps) {
  const isLocked = answerState === 'correct'

  /*
   * ตัวช่วยปิดอยู่เป็นค่าเริ่มต้นเสมอ และรีเซ็ตเมื่อเปลี่ยนข้อ
   * ถ้าเปิดค้างข้ามข้อ เด็กจะกดเครื่องคิดเลขทุกข้อโดยไม่ได้ตัดสินใจอีกเลย
   * ซึ่งเป็นคนละเรื่องกับการเลือกใช้ตัวช่วยเฉพาะข้อที่ติดจริง
   */
  const [showCalculator, setShowCalculator] = useState(false)
  const [showSteps, setShowSteps] = useState(false)

  useEffect(() => {
    setShowCalculator(false)
    setShowSteps(false)
  }, [question.id])

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
        <p className="break-words text-3xl font-bold leading-snug tracking-wide text-white sm:text-4xl">
          {question.prompt}
        </p>
      </motion.div>

      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {question.choices.map((choice, index) => {
          const isWrongChoice = wrongChoices.includes(choice.text)
          const isCorrectChoice =
            answerState === 'correct' && choice.text === question.correctAnswer

          return (
            <button
              key={choice.id}
              type="button"
              disabled={isLocked || isWrongChoice}
              onClick={() => onAnswer(choice.text)}
              aria-label={`ตัวเลือก ${CHOICE_LABELS[index] ?? index + 1}: ${toSpeech(choice.text)}${
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
              {/* ไม่ใช้สีอย่างเดียวบอกสถานะ มีสัญลักษณ์กำกับเสมอ */}
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
              <span>{choice.text}</span>
            </button>
          )
        })}
      </div>

      {/* คำใบ้ ไม่แสดงเองอัตโนมัติ เด็กต้องได้คิดก่อน */}
      {hintShown && question.hint ? (
        <p
          role="status"
          aria-live="polite"
          className="mt-4 rounded-2xl border border-sky-400/40 bg-sky-600/15 px-4 py-3 text-center text-sm font-semibold text-sky-300"
        >
          💡 {question.hint}
        </p>
      ) : null}

      {/*
        แถวปุ่มตัวช่วย
        วางสามปุ่มไว้ด้วยกันโดยตั้งใจ เพื่อให้เด็กเห็นว่ามีทางเลือกมากกว่าเดามั่ว
        เด็กที่ติดจริง ๆ จะได้เลือกเองว่าจะขอคำใบ้ ขอเครื่องคิดเลข หรือขอดูวิธีคิด
      */}
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        {!isLocked && question.hint && !hintShown ? (
          <button
            type="button"
            onClick={onRequestHint}
            className="rounded-2xl border border-sky-400/40 bg-sky-600/10 px-4 py-2.5 text-sm font-bold text-sky-300 transition hover:bg-sky-600/20"
          >
            💡 ขอคำใบ้
          </button>
        ) : null}

        <button
          type="button"
          onClick={() => setShowCalculator((value) => !value)}
          aria-pressed={showCalculator}
          className="rounded-2xl border border-arcane-400/40 bg-arcane-600/10 px-4 py-2.5 text-sm font-bold text-arcane-400 transition hover:bg-arcane-600/20"
        >
          🧮 {showCalculator ? 'ปิดเครื่องคิดเลข' : 'เครื่องคิดเลข'}
        </button>

        <button
          type="button"
          onClick={() => setShowSteps((value) => !value)}
          aria-pressed={showSteps}
          className="rounded-2xl border border-gold-400/40 bg-gold-500/10 px-4 py-2.5 text-sm font-bold text-gold-300 transition hover:bg-gold-500/20"
        >
          📖 {showSteps ? 'ปิดวิธีคิด' : 'ดูวิธีคิดทีละขั้น'}
        </button>
      </div>

      {showCalculator ? (
        <div className="mt-3">
          <Calculator onClose={() => setShowCalculator(false)} />
        </div>
      ) : null}

      {showSteps ? (
        <div className="mt-3">
          <SolutionSteps question={question} />
        </div>
      ) : null}

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
            <p className="mt-1 text-sm leading-relaxed text-slate-200">
              {question.explanation}
            </p>
            {/*
              ตอบถูกแล้วยังกดดูวิธีคิดเต็มได้
              เด็กที่เดาถูกกับเด็กที่คิดถูกได้คะแนนเท่ากัน แต่เข้าใจไม่เท่ากัน
              ปุ่มนี้เป็นทางเดียวที่เด็กกลุ่มแรกจะได้เห็นวิธีที่ถูกต้อง
            */}
            {!showSteps ? (
              <button
                type="button"
                onClick={() => setShowSteps(true)}
                className="mt-2 rounded-xl border border-white/20 bg-white/5 px-3 py-1.5 text-xs font-bold text-slate-200"
              >
                📖 ดูวิธีคิดทีละขั้น
              </button>
            ) : null}
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
            {/* ยังไม่เฉลยตรงนี้ เด็กยังมีตัวเลือกเหลือให้ลองคิดต่อ */}
            <p className="text-xl font-bold text-gold-300">
              ยังไม่ถูก ลองดูวิธีคิดอีกครั้งนะ 💪
            </p>
            <p className="mt-1 text-sm text-slate-200">
              {question.hint
                ? 'กดปุ่มขอคำใบ้ด้านบนได้เลย ไม่เสียคะแนนนะ'
                : 'ลองคิดใหม่อีกครั้ง หนูทำได้แน่นอน'}
            </p>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}
