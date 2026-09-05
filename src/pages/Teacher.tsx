import { useCallback, useMemo, useState } from 'react'
import { Button } from '../components/Button'
import { ScreenLayout } from '../components/ScreenLayout'
import { TopBar } from '../components/TopBar'
import { parseCodes } from '../teacher/code'
import { INDICATORS, findIndicator } from '../teacher/indicators'
import type { Indicator } from '../teacher/indicators'
import {
  MIN_ATTEMPTS_FOR_MASTERY,
  accuracy,
  masteryOf,
  needsReteaching,
  summarizeClass,
  totalsOf,
} from '../teacher/log'
import type { ClassRow, Mastery, StudentLog } from '../teacher/log'
import { toCsv } from '../teacher/report'
import { clearLogs, loadLogs, mergeIntoStorage } from '../teacher/storage'
import type { Player } from '../types/player'

/**
 * แผงคุณครู — ระยะ 5 ของเอกสารออกแบบ
 *
 * เอกสารเขียนระยะนี้ไว้ว่า "แผงสำหรับครู ตั้งตัวชี้วัดที่ต้องการ และสรุปผลรายคน"
 * ตอนสร้างสองระยะแรกเสร็จ ระยะนี้ถูกเลื่อนออกไปด้วยเหตุผลว่า
 * ยังไม่รู้ว่าครูอยากเห็นอะไรจริง ๆ ซึ่งเป็นเหตุผลที่ถูกในตอนนั้น
 *
 * สิ่งที่ทำในรอบนี้จึงตัดส่วน "ตั้งตัวชี้วัดที่ต้องการ" ออกไปก่อน
 * เพราะยังเป็นการเดาว่าครูอยากตั้งอะไร และการเดาผิดจะกลายเป็นหน้าจอที่ต้องรื้อ
 * เหลือแค่ส่วนที่รู้แน่ว่าต้องมี คือ "สรุปผลรายคน" ซึ่งตอบคำถามเดียว
 * ที่ครูถามทุกคาบอยู่แล้ว คือคาบหน้าต้องสอนซ้ำเรื่องไหน
 *
 * ข้อจำกัดที่ต้องยอมรับตรง ๆ
 *
 * เว็บนี้ไม่มีหลังบ้าน ผลของเด็กจึงอยู่บนเครื่องของเด็ก ไม่ได้ส่งมาหาครูเอง
 * หน้านี้ทำงานได้ก็ต่อเมื่อครูเก็บรหัสจากเด็กมาวางเท่านั้น
 * ซึ่งเป็นงานเพิ่มของครู และไม่มีทางเลี่ยงได้โดยไม่ต้องเก็บข้อมูลเด็กขึ้นเน็ต
 * จึงเขียนบอกไว้บนหน้าจอตรง ๆ แทนที่จะทำเหมือนว่ามันเป็นระบบอัตโนมัติ
 */
export function Teacher({ player }: { player: Player }) {
  const [pasted, setPasted] = useState('')
  const [logs, setLogs] = useState<StudentLog[]>(() => loadLogs())
  const [notice, setNotice] = useState<string | null>(null)
  const [problems, setProblems] = useState<string[]>([])
  const [copied, setCopied] = useState(false)

  const rows = useMemo(() => summarizeClass(logs), [logs])
  const reteach = useMemo(() => needsReteaching(rows), [rows])

  const sorted = useMemo(
    () => [...logs].sort((a, b) => a.name.localeCompare(b.name, 'th')),
    [logs],
  )

  const addCodes = useCallback(() => {
    const parsed = parseCodes(pasted)
    if (parsed.length === 0) {
      setNotice('ยังไม่มีรหัสในช่อง ให้เด็กส่งรหัสมาแล้ววางบรรทัดละคน')
      setProblems([])
      return
    }

    const good = parsed
      .filter((entry) => entry.result.ok)
      .map((entry) => (entry.result.ok ? entry.result.log : null))
      .filter((log): log is StudentLog => log !== null)

    const bad = parsed
      .filter((entry) => !entry.result.ok)
      .map((entry) =>
        entry.result.ok ? '' : `บรรทัดที่ ${entry.line} · ${entry.result.reason}`,
      )

    setLogs(mergeIntoStorage(good))
    setProblems(bad)
    setNotice(
      good.length > 0
        ? `รับรหัสแล้ว ${good.length} คน${bad.length > 0 ? ` · อ่านไม่ได้ ${bad.length} บรรทัด` : ''}`
        : 'อ่านรหัสไม่ได้เลยสักบรรทัด',
    )
    if (good.length > 0) setPasted('')
  }, [pasted])

  const removeAll = useCallback(() => {
    clearLogs()
    setLogs([])
    setProblems([])
    setNotice('ล้างรายชื่อในเครื่องนี้แล้ว')
  }, [])

  const csv = useMemo(() => toCsv(sorted), [sorted])

  return (
    <>
      <TopBar player={player} title="แผงคุณครู" backTo="/menu" />
      <ScreenLayout width="wide">
        <div className="panel p-5 sm:p-6">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-gold-300">
            สำหรับคุณครู · ระยะ 5
          </p>
          <h2 className="mt-1 text-xl font-black text-white sm:text-2xl">
            ตัวชี้วัดที่เด็กทำได้แล้ว และที่ยังต้องสอนซ้ำ
          </h2>
          <p className="mt-2 text-sm text-slate-300">
            เกมนี้ไม่มีเซิร์ฟเวอร์ ผลของเด็กจึงอยู่ในเบราว์เซอร์ของเครื่องที่เด็กเล่น
            ไม่ได้ส่งมาที่นี่เอง ท้ายคาบให้เด็กกดปุ่ม{' '}
            <strong className="text-cyan-300">📮 รหัสผลการเรียน</strong>{' '}
            แล้วส่งรหัสมาให้คุณครู วางรวมกันในช่องข้างล่างบรรทัดละคน
          </p>
        </div>

        {/* ---- ช่องรับรหัส ---- */}
        <div className="panel mt-4 p-5 sm:p-6">
          <label
            htmlFor="teacher-codes"
            className="text-sm font-bold text-white"
          >
            วางรหัสผลการเรียนของเด็ก บรรทัดละคน
          </label>
          <textarea
            id="teacher-codes"
            value={pasted}
            onChange={(event) => setPasted(event.target.value)}
            rows={5}
            spellCheck={false}
            placeholder={'KRU1~เด็กหญิงมานี~20260901~2:2.2:1\nKRU1~เด็กชายมานะ~20260901~3:1.4:4'}
            className="mt-2 w-full rounded-xl border border-white/15 bg-night-900/80 p-3 font-mono text-xs text-slate-100 placeholder:text-slate-600"
          />
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <Button icon="➕" onClick={addCodes}>
              เพิ่มเข้าตาราง
            </Button>
            {logs.length > 0 ? (
              <Button variant="ghost" icon="🧹" onClick={removeAll}>
                ล้างรายชื่อทั้งหมด
              </Button>
            ) : null}
            {notice ? (
              <p role="status" className="text-sm font-bold text-leaf-300">
                {notice}
              </p>
            ) : null}
          </div>
          {problems.length > 0 ? (
            <ul className="mt-3 space-y-1 rounded-xl border border-ember-500/40 bg-ember-500/10 p-3 text-xs text-ember-200">
              {problems.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          ) : null}
        </div>

        {logs.length === 0 ? (
          <div className="panel mt-4 p-5 text-sm text-slate-400 sm:p-6">
            ยังไม่มีข้อมูลของเด็กในเครื่องนี้
            เมื่อวางรหัสแล้วตารางจะขึ้นตรงนี้ และจะถูกเก็บไว้ในเครื่องนี้จนกว่าจะกดล้าง
          </div>
        ) : (
          <>
            <ReteachPanel reteach={reteach} total={logs.length} />
            <ClassTable logs={sorted} />
            <IndicatorTable rows={rows} />

            <div className="panel mt-4 p-5 sm:p-6">
              <p className="text-sm font-bold text-white">
                คัดลอกไปกรอกในไฟล์คะแนนของโรงเรียน
              </p>
              <p className="mt-1 text-xs text-slate-400">
                เป็นข้อความแบบ CSV วางลงในโปรแกรมตารางคำนวณได้ตรง ๆ
                แต่ละตัวชี้วัดมีสองช่อง คือจำนวนข้อที่ทำ และจำนวนข้อที่ถูก
              </p>
              <textarea
                readOnly
                value={csv}
                rows={4}
                spellCheck={false}
                className="mt-2 w-full rounded-xl border border-white/15 bg-night-900/80 p-3 font-mono text-[11px] text-slate-300"
              />
              <button
                type="button"
                className="mt-2 text-xs text-slate-300 underline hover:text-white"
                onClick={() => {
                  navigator.clipboard
                    ?.writeText(csv)
                    .then(() => setCopied(true))
                    .catch(() => setCopied(false))
                }}
              >
                {copied ? '✅ คัดลอกแล้ว' : 'คัดลอกตาราง (หรือลากเลือกข้อความเอง)'}
              </button>
            </div>
          </>
        )}

        <IndicatorLegend />
      </ScreenLayout>
    </>
  )
}

/* ------------------------------------------------------------------ *
 * ส่วนประกอบย่อย
 * ------------------------------------------------------------------ */

const MASTERY_CLASS: Record<Mastery, string> = {
  none: 'bg-white/5 text-slate-500',
  weak: 'bg-ember-500/25 text-ember-200',
  fair: 'bg-gold-500/25 text-gold-200',
  good: 'bg-leaf-500/25 text-leaf-200',
}

function percentText(value: number | null): string {
  return value === null ? '—' : `${Math.round(value * 100)}%`
}

/**
 * คำตอบของคำถามที่ครูถามจริงตอนเดินออกจากห้อง
 *
 * วางไว้บนสุดของผล ก่อนตารางทั้งหมด เพราะครูที่มีเวลาสิบวินาที
 * ควรได้คำตอบโดยไม่ต้องอ่านตารางสามสิบแถวแล้วสรุปเอง
 */
function ReteachPanel({ reteach, total }: { reteach: ClassRow[]; total: number }) {
  if (reteach.length === 0) {
    return (
      <div className="panel mt-4 border-leaf-400/40 p-5 sm:p-6">
        <p className="text-sm font-black text-leaf-300">
          ยังไม่มีตัวชี้วัดที่ทั้งห้องติดขัด
        </p>
        <p className="mt-1 text-sm text-slate-300">
          จากข้อมูลของเด็ก {total} คนที่มีอยู่ตอนนี้ ตัวชี้วัดของชั้น ป.4
          ที่มีข้อมูลพอจะตัดสิน ผ่านเกณฑ์กันเกินร้อยละ 70 ทุกตัว
        </p>
      </div>
    )
  }

  return (
    <div className="panel mt-4 border-ember-400/40 p-5 sm:p-6">
      <p className="text-sm font-black text-ember-300">
        ตัวชี้วัดที่ควรสอนซ้ำ เรียงจากที่ควรสอนก่อน
      </p>
      <ul className="mt-3 space-y-2">
        {reteach.map((row) => {
          const meta = findIndicator(row.indicator)
          if (!meta) return null
          return (
            <li
              key={row.indicator}
              className="rounded-xl border border-white/10 bg-white/5 p-3"
            >
              <p className="text-sm font-bold text-white">
                {meta.code ? `${meta.code} · ` : ''}
                {meta.short}
              </p>
              <p className="mt-1 text-xs text-slate-300">{meta.full}</p>
              <p className="mt-1 text-xs text-ember-200">
                ผ่านเกณฑ์ {row.passed} คน จาก {row.assessed} คนที่มีข้อมูลพอ ·
                ทั้งห้องทำไป {row.tally.attempts} ข้อ ถูก {row.tally.correct} ข้อ
              </p>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

/** ตารางรายคน หนึ่งแถวต่อเด็กหนึ่งคน หนึ่งช่องต่อหนึ่งตัวชี้วัด */
function ClassTable({ logs }: { logs: readonly StudentLog[] }) {
  return (
    <div className="panel mt-4 p-5 sm:p-6">
      <p className="text-sm font-bold text-white">รายคน · {logs.length} คน</p>
      <p className="mt-1 text-xs text-slate-400">
        ตัวเลขในช่องคือ ข้อถูก / ข้อที่ทำ · ช่องสีเทาคือยังทำไม่ถึง{' '}
        {MIN_ATTEMPTS_FOR_MASTERY} ข้อ จึงยังตัดสินไม่ได้
      </p>
      {/* ตารางกว้างกว่าจอมือถือเสมอ จึงต้องเลื่อนในกล่องของตัวเอง ไม่ใช่ทั้งหน้า */}
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-xs">
          <thead>
            <tr className="text-left text-slate-400">
              <th className="sticky left-0 bg-night-800 p-2">ชื่อ</th>
              {INDICATORS.map((item) => (
                <th key={item.id} className="p-2 font-bold" title={item.full}>
                  {item.code || item.short}
                </th>
              ))}
              <th className="p-2">รวม</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => {
              const total = totalsOf(log)
              return (
                <tr key={log.name} className="border-t border-white/10">
                  <th
                    scope="row"
                    className="sticky left-0 bg-night-800 p-2 text-left font-bold text-white"
                  >
                    {log.name}
                  </th>
                  {INDICATORS.map((item) => {
                    const tally = log.counts[item.id] ?? { attempts: 0, correct: 0 }
                    return (
                      <td key={item.id} className="p-1">
                        <span
                          className={`block rounded-md px-2 py-1 text-center font-bold ${MASTERY_CLASS[masteryOf(tally)]}`}
                        >
                          {tally.attempts === 0
                            ? '—'
                            : `${tally.correct}/${tally.attempts}`}
                        </span>
                      </td>
                    )
                  })}
                  <td className="p-2 text-center font-bold text-slate-200">
                    {percentText(accuracy(total))}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/** สรุปรายตัวชี้วัดของทั้งห้อง */
function IndicatorTable({ rows }: { rows: readonly ClassRow[] }) {
  return (
    <div className="panel mt-4 p-5 sm:p-6">
      <p className="text-sm font-bold text-white">รายตัวชี้วัด · ทั้งห้อง</p>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[560px] border-collapse text-xs">
          <thead>
            <tr className="text-left text-slate-400">
              <th className="p-2">ตัวชี้วัด</th>
              <th className="p-2">ผ่านเกณฑ์</th>
              <th className="p-2">ตัดสินได้</th>
              <th className="p-2">ข้อที่ทำทั้งห้อง</th>
              <th className="p-2">ร้อยละข้อถูก</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const meta = findIndicator(row.indicator)
              if (!meta) return null
              return (
                <tr key={row.indicator} className="border-t border-white/10">
                  <th scope="row" className="p-2 text-left font-bold text-white">
                    <span className="block">{meta.code || meta.short}</span>
                    <span className="block font-normal text-slate-400">
                      {meta.code ? meta.short : ''}
                    </span>
                  </th>
                  <td className="p-2 text-slate-200">{row.passed}</td>
                  <td className="p-2 text-slate-200">{row.assessed}</td>
                  <td className="p-2 text-slate-200">{row.tally.attempts}</td>
                  <td className="p-2 text-slate-200">
                    {percentText(accuracy(row.tally))}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/**
 * คำอธิบายว่าแต่ละตัวชี้วัดมาจากโจทย์ไหน และตัวไหนที่ยังไม่ได้ทานกับหลักสูตร
 *
 * ส่วนที่บอกว่ายังไม่ได้ทาน สำคัญกว่าที่คิด
 * ถ้าไม่บอก ครูจะเอารหัสที่เกมเดาไว้ไปกรอกในเอกสารของโรงเรียนตรง ๆ
 * ซึ่งเป็นเอกสารที่ผิดไม่ได้ และเป็นความผิดที่เกมเป็นคนก่อ
 */
function IndicatorLegend() {
  const groups: [string, string, (item: Indicator) => boolean][] = [
    [
      'ตัวชี้วัดของชั้น ป.4 ที่เกมนี้วัด',
      'สี่ตัวแรกมาจากเอกสารออกแบบที่คุณครูเขียนเอง จึงตรงแน่นอน',
      (item) => item.level === 'core',
    ],
    [
      'ส่วนที่ไม่ใช่ตัวชี้วัดของชั้น ป.4 โดยตรง',
      'ทั้งการทบทวน การต่อยอด และเรื่องที่ยังไม่ระบุรหัส ไม่ควรเอาไปกรอกเป็นคะแนนตัวชี้วัดของชั้น ป.4',
      (item) => item.level !== 'core',
    ],
  ]

  return (
    <div className="panel mt-4 p-5 sm:p-6">
      <p className="text-sm font-bold text-white">ตัวชี้วัดแต่ละตัวมาจากโจทย์ไหน</p>
      {groups.map(([title, note, match]) => (
        <div key={title} className="mt-3">
          <p className="text-xs font-bold text-gold-300">{title}</p>
          <p className="text-xs text-slate-400">{note}</p>
          <ul className="mt-2 space-y-1">
            {INDICATORS.filter(match).map((item) => (
              <li key={item.id} className="text-xs text-slate-300">
                <span className="font-bold text-white">
                  {item.code ? `${item.code} · ` : ''}
                  {item.short}
                </span>
                {item.code && !item.verified ? (
                  <span className="ml-2 rounded bg-gold-500/20 px-1.5 py-0.5 text-[10px] font-bold text-gold-200">
                    รหัสนี้เกมโยงเอง ยังไม่ได้ทานกับหลักสูตรฉบับจริง
                  </span>
                ) : null}
                <span className="block text-slate-400">{item.full}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}
