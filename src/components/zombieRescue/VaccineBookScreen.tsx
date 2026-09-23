import { useState } from 'react'
import type { CSSProperties } from 'react'
import { Button } from '../Button'
import { TABLES } from '../../zombieRescue/questions'
import { FACT_COUNT, STREAK_TO_CURE, allFacts, certificateUrl, curedCount, weakFacts } from '../../zombieRescue/vaccineBook'
import type { BookFact, VaccineBook } from '../../zombieRescue/vaccineBook'
import { thanksOf, villagerFor } from '../../zombieRescue/villagers'
import { Char, CuredHead, VillagerArt, ZHead } from './ZrParts'

/**
 * สมุดวัคซีน: ดูว่ารักษาซอมบี้สูตรคูณไปแล้วกี่ตัว และข้อไหนยังพลาด
 * ตรรกะอยู่ใน src/zombieRescue/vaccineBook.ts หน้านี้แค่วาด
 */

/** สีประจำแม่ ตรงกับสีเสื้อซอมบี้ในชุดพิมพ์ */
export const TABLE_COLOR: Record<number, string> = { 2: '#2E9E4F', 3: '#D9730D', 4: '#1E78D9', 5: '#8B4FC7', 10: '#E0453A' }

function Sticker({ fact, picked, onPick }: { fact: BookFact; picked: boolean; onPick: () => void }) {
  const { each, groups, entry, status } = fact
  const v = villagerFor(each, groups)
  const label =
    status === 'weak'
      ? 'ยังพลาด ลองฝึกอีกนิด'
      : entry.got
        ? 'ได้สติกเกอร์แล้ว'
        : status === 'trying'
          ? `ถูกติดกัน ${entry.s} จาก ${STREAK_TO_CURE} ครั้ง`
          : 'ยังไม่เคยเจอ'
  return (
    <li>
      <button
        type="button"
        onClick={onPick}
        aria-pressed={picked}
        aria-label={`${groups} × ${each} น้อง${v.name} ${label}`}
        className={`zr-sticker zr-sticker-${status} ${entry.got ? 'zr-sticker-got' : ''} ${picked ? 'zr-sticker-picked' : ''}`}
      >
        <VillagerArt v={v} cured={entry.got} className="w-10" />
        <span className="zr-sticker-fact">
          {groups}×{each}
        </span>
        {entry.got ? <span className="zr-sticker-name">{v.name}</span> : null}
        {status === 'weak' ? (
          <span className="zr-sticker-flag" aria-hidden="true">
            !
          </span>
        ) : null}
      </button>
    </li>
  )
}

/** การ์ดของชาวเมืองที่แตะเลือก: หายป่วยแล้วพูดขอบคุณ ยังไม่หายก็ขอให้ช่วย */
function VillagerCard({ fact, onClose }: { fact: BookFact; onClose: () => void }) {
  const { each, groups, entry, status } = fact
  const v = villagerFor(each, groups)
  const line = entry.got
    ? status === 'weak'
      ? `ข้อ ${groups} × ${each} ครั้งล่าสุดพลาดไปนิด มาฝึกกันอีกรอบนะ!`
      : `“${thanksOf(v)}”`
    : status === 'weak'
      ? `ช่วยน้อง${v.name}ด้วย! ข้อ ${groups} × ${each} ครั้งล่าสุดยังพลาดอยู่`
      : `ช่วยน้อง${v.name}ด้วย! ตอบ ${groups} × ${each} ให้ถูก ${STREAK_TO_CURE} ครั้งติดกัน`
  return (
    <div className="zr-villager-card" role="status">
      <VillagerArt v={v} cured={entry.got} className={`w-20 flex-none ${entry.got ? 'zr-bob' : 'zr-sway'}`} />
      <div className="min-w-0 flex-1">
        <p className="font-display text-lg">น้อง{v.name}</p>
        <p className="zr-bubble">{line}</p>
        <p className="mt-1 text-sm">
          {entry.got ? (
            <b>
              {groups} × {each} = {each * groups} 💉
            </b>
          ) : (
            <>
              ถูกติดกันแล้ว {entry.s} / {STREAK_TO_CURE} ครั้ง
            </>
          )}
        </p>
      </div>
      <button type="button" onClick={onClose} className="zr-card-x" aria-label="ปิด">
        ✕
      </button>
    </div>
  )
}

export function VaccineBookScreen({ book, playerName, onPractice }: { book: VaccineBook; playerName: string; onPractice: () => void }) {
  const facts = allFacts(book)
  const total = curedCount(book)
  const weak = weakFacts(book)
  const pct = Math.round((total / FACT_COUNT) * 100)
  const done = total === FACT_COUNT
  const [picked, setPicked] = useState<string | null>(null)

  return (
    <div className="panel panel-hero panel-corners p-5 sm:p-6">
      <div className="flex items-end justify-center gap-1" aria-hidden="true">
        <Char k="doctor" className="zr-bob w-14" />
        <Char k={done ? 'zombo' : 'zombie'} className="zr-bob w-16" />
      </div>
      <h2 className="title-gold mt-1 text-center text-2xl font-black">📒 สมุดวัคซีน</h2>
      <p className="mt-1 text-center text-sm leading-relaxed text-slate-300">
        ชาวเมือง {FACT_COUNT} คนติดไวรัสซอมบี้ หนึ่งคนต่อหนึ่งข้อสูตรคูณ
        <br />
        ตอบข้อไหนถูก {STREAK_TO_CURE} ครั้งติดกัน คนในช่องนั้นหายป่วย · แตะช่องเพื่อทักทาย
      </p>

      <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-3">
        <div className="flex items-baseline justify-between gap-2">
          <span className="font-bold text-white">รักษาแล้ว</span>
          <span className="font-display text-xl text-gold-200">
            {total} / {FACT_COUNT}
          </span>
        </div>
        <div
          className="mt-2 h-3 overflow-hidden rounded-full bg-white/10"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={FACT_COUNT}
          aria-valuenow={total}
          aria-label="สติกเกอร์ที่สะสมแล้ว"
        >
          <div className="h-full rounded-full bg-[#7ED957] transition-all" style={{ width: `${pct}%` }} />
        </div>
        {done ? (
          <>
            <p className="mt-2 text-center font-bold text-[#7ED957]">🎉 ครบทั้งสมุด! เป็นหมอสูตรคูณตัวจริงแล้ว</p>
            <a href={certificateUrl('all', playerName)} target="_blank" rel="noopener" className="zr-cert-link zr-cert-link-big mt-2">
              🩺 พิมพ์ใบประกาศหมอสูตรคูณตัวจริง
            </a>
          </>
        ) : null}
      </div>

      {weak.length ? (
        <div className="mt-4 rounded-2xl border border-ember-500/40 bg-ember-500/10 p-3">
          <p className="font-bold text-white">🔁 ข้อที่ยังพลาด ({weak.length} ข้อ)</p>
          <p className="mt-1 text-sm text-slate-200">
            {weak
              .slice(0, 8)
              .map((f) => `${f.groups} × ${f.each}`)
              .join(' · ')}
            {weak.length > 8 ? ' …' : ''}
          </p>
          <Button className="mt-3" fullWidth onClick={onPractice}>
            🎯 ฝึกข้อที่ยังพลาด
          </Button>
        </div>
      ) : total > 0 && !done ? (
        <Button className="mt-4" fullWidth onClick={onPractice}>
          🎯 ฝึกข้อที่ยังไม่ได้สติกเกอร์
        </Button>
      ) : null}

      <div className="mt-4 grid gap-3">
        {TABLES.map((table) => (
          <section
            key={table}
            className="zr-book-page"
            style={{ '--tc': TABLE_COLOR[table] } as CSSProperties}
            aria-label={`แม่ ${table}`}
          >
            <header className="flex items-center justify-between px-3 pt-2">
              <span className="font-display text-lg">แม่ {table}</span>
              <span className="text-sm font-bold">{curedCount(book, table) === 10 ? '🏅 ' : ''}{curedCount(book, table)} / 10</span>
            </header>
            {curedCount(book, table) === 10 ? (
              <a href={certificateUrl(table, playerName)} target="_blank" rel="noopener" className="zr-cert-link mx-2 mt-1">
                🏅 ครบแม่ {table} แล้ว! พิมพ์ใบประกาศ
              </a>
            ) : null}
            <ol className="grid grid-cols-5 gap-1.5 p-2">
              {facts
                .filter((f) => f.each === table)
                .map((f) => {
                  const key = `${f.each}x${f.groups}`
                  return <Sticker key={f.groups} fact={f} picked={picked === key} onPick={() => setPicked(picked === key ? null : key)} />
                })}
            </ol>
            {facts
              .filter((f) => f.each === table && picked === `${f.each}x${f.groups}`)
              .map((f) => (
                <VillagerCard key={picked} fact={f} onClose={() => setPicked(null)} />
              ))}
          </section>
        ))}
      </div>

      <ul className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-slate-300">
        <li>
          <CuredHead className="inline w-4 align-[-3px]" /> หายป่วยแล้ว
        </li>
        <li>
          <ZHead className="inline w-4 align-[-3px]" /> ยังเป็นซอมบี้
        </li>
        <li>
          <span className="font-bold text-ember-300">!</span> ตอบผิดครั้งล่าสุด
        </li>
      </ul>
    </div>
  )
}
