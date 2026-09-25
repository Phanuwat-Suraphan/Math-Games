import { createContext, useContext } from 'react'
import type { ReactNode } from 'react'
import type { Stars } from '../../planetQuest/games'

/** สิ่งที่ทุกเกมบนดาวส่งกลับไปให้หน้าหลักตอนเล่นจบ */
export interface StageOutcome {
  stars: Stars
  /** สรุปสั้น ๆ ว่าทำได้แค่ไหน เช่น "ตอบถูก 7 จาก 8 ข้อ" */
  summary: string
}

export interface StageGameProps {
  seed: string
  reduceMotion: boolean
  onFinish: (outcome: StageOutcome) => void
}

/**
 * ช่องทางบอกเพื่อนดาวว่าเด็กเพิ่งตอบถูกหรือพลาด ดาวจะได้เชียร์หรือปลอบ
 *
 * ใช้ context แทน prop เพราะเกมส่วนใหญ่แจ้งผ่าน useCombo ที่ใช้ร่วมกันอยู่แล้ว
 * เกมที่ไม่ได้อยู่ใต้ผู้ให้ค่า เช่น ห้องทดลองอุปราคาในโหมดสำรวจ ได้ฟังก์ชันเปล่าที่ไม่ทำอะไร
 */
export type Reaction = 'good' | 'oops'
export type ReactionHandler = (reaction: Reaction, streak?: number) => void

export const ReactionContext = createContext<ReactionHandler>(() => undefined)

export function useReaction(): ReactionHandler {
  return useContext(ReactionContext)
}

/** แถบบอกว่าเล่นถึงข้อไหนแล้ว */
export function ProgressDots({ total, current }: { total: number; current: number }) {
  return (
    <div className="flex items-center gap-1.5" aria-label={`ข้อที่ ${Math.min(current + 1, total)} จาก ${total}`}>
      {Array.from({ length: total }, (_, index) => (
        <span
          key={index}
          aria-hidden="true"
          className={`h-2 flex-1 rounded-full ${
            index < current ? 'bg-leaf-400' : index === current ? 'bg-cyan-300' : 'bg-white/10'
          }`}
        />
      ))}
    </div>
  )
}

/**
 * รายการตัวเลือก
 *
 * ตัวเลือกที่ตอบผิดไปแล้วถูกปิดพร้อมขีดฆ่า ตัวที่ถูกขึ้นเครื่องหมายถูก
 * บอกผลด้วยสัญลักษณ์และข้อความ ไม่ใช่สีอย่างเดียว ตามแนวทางของทั้งเกม
 */
export function ChoiceList({
  options,
  answer,
  wrong,
  solved,
  onPick,
  columns = 2,
}: {
  options: readonly string[]
  answer: string
  wrong: readonly string[]
  solved: boolean
  onPick: (option: string) => void
  columns?: 1 | 2
}) {
  return (
    <div className={`grid gap-2 ${columns === 2 ? 'sm:grid-cols-2' : ''}`}>
      {options.map((option) => {
        const isWrong = wrong.includes(option)
        const isRight = solved && option === answer
        return (
          <button
            key={option}
            type="button"
            disabled={isWrong || solved}
            onClick={() => onPick(option)}
            className={`sol-opt text-base ${isWrong ? 'sol-opt-wrong' : ''} ${isRight ? 'sol-opt-right' : ''}`}
          >
            <span>{option}</span>
            {isWrong ? <span aria-label="ไม่ถูก">✗</span> : null}
            {isRight ? <span aria-label="ถูกต้อง">✓</span> : null}
          </button>
        )
      })}
    </div>
  )
}

/** กล่องคำอธิบายหลังตอบ สีเขียวเมื่อถูก สีทองเมื่อเป็นคำใบ้ */
export function Explain({ tone, title, children }: { tone: 'good' | 'hint' | 'bad'; title: string; children: ReactNode }) {
  const style =
    tone === 'good'
      ? 'border-leaf-400/40 bg-leaf-500/10 text-slate-100'
      : tone === 'bad'
        ? 'border-ember-400/40 bg-ember-500/10 text-slate-100'
        : 'border-gold-400/40 bg-gold-500/10 text-gold-100'
  return (
    <div role="status" className={`mt-3 rounded-xl border p-3 text-sm leading-relaxed ${style}`}>
      <p className="font-black">{title}</p>
      <div className="mt-1">{children}</div>
    </div>
  )
}

/**
 * แถบคะแนนกับคอมโบ พร้อมตัวเลขเด้งขึ้นทุกครั้งที่ได้คะแนน
 * ใส่ key ให้ตัวเลขที่เด้ง อนิเมชันจึงเล่นใหม่ทุกครั้ง แม้คะแนนที่ได้จะเท่าเดิม
 */
export function ScoreBar({
  score,
  streak,
  pop,
  children,
}: {
  score: number
  streak: number
  pop: { id: number; points: number; streak: number } | null
  children?: ReactNode
}) {
  return (
    <div className="relative flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-bold">
      <span className="text-gold-300">⭐ {score.toLocaleString('en-US')} คะแนน</span>
      {streak >= 2 ? <span className="pq-combo">🔥 คอมโบ x{streak}</span> : null}
      <span className="text-slate-300">{children}</span>
      {pop ? (
        <span key={pop.id} className="pq-pop" aria-hidden="true">
          +{pop.points}
        </span>
      ) : null}
    </div>
  )
}
