import { ScreenLayout } from '../components/ScreenLayout'
import { TopBar } from '../components/TopBar'
import { NPCS } from '../data/npcs'
import { chapterProgress, lineFor, storyPercent } from '../services/storyService'
import type { Player } from '../types/player'

/**
 * สมุดบันทึกการผจญภัย
 *
 * ทำไมต้องมี: เรื่องที่เล่าผ่านไปแล้วจะหายไปเลยถ้าไม่มีที่เก็บ
 * เด็กที่กลับมาเล่นอีกวันจะจำไม่ได้ว่าค้างอยู่ตรงไหนของเรื่อง
 * สมุดบันทึกทำให้เรื่องกลายเป็นของสะสมอย่างหนึ่ง ไม่ใช่ข้อความที่ผ่านตาไปเฉย ๆ
 *
 * ตอนที่ยังไม่ได้อ่านจะแสดงเป็นช่องว่างพร้อมเส้นประ
 * เพื่อให้เห็นว่ายังมีเรื่องรออยู่อีกกี่ตอน ซึ่งเป็นแรงจูงใจให้เล่นต่อ
 */
export function Journal({ player }: { player: Player }) {
  const chapters = chapterProgress(player)
  const percent = storyPercent(player)

  return (
    <>
      <TopBar
        player={player}
        title="สมุดบันทึกการผจญภัย"
        backTo="/menu"
        backLabel="กลับเมนู"
      />

      <ScreenLayout width="normal">
        {/* ความคืบหน้ารวมของเรื่อง */}
        <div className="rounded-xl2 border border-white/10 bg-night-800/60 p-4">
          <div className="flex items-baseline justify-between">
            <h2 className="text-sm font-bold text-slate-300">เรื่องราวที่ค้นพบแล้ว</h2>
            <span className="text-lg font-black text-gold-300">{percent}%</span>
          </div>
          <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-night-900">
            <div
              className="h-full rounded-full bg-gradient-to-r from-gold-500 to-gold-300 transition-all"
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>

        {/* ตอนต่าง ๆ แยกตามบท */}
        {chapters.map(({ chapter, beats, readCount, totalCount }) => (
          <section key={chapter.id} className="mt-6">
            <div className="flex items-baseline justify-between gap-3">
              <h3 className="text-lg font-bold text-white">{chapter.title}</h3>
              <span className="shrink-0 text-sm text-slate-400">
                {readCount} / {totalCount}
              </span>
            </div>
            <p className="mt-1 text-sm text-slate-300">{chapter.summary}</p>

            <ol className="mt-3 space-y-2">
              {beats.map((beat) => {
                const read = beat.grantsFlag
                  ? player.storyFlags?.includes(beat.grantsFlag)
                  : false

                if (!read) {
                  return (
                    <li
                      key={beat.id}
                      className="rounded-xl border border-dashed border-white/15 px-4 py-3 text-sm text-slate-500"
                    >
                      ยังไม่ได้ค้นพบตอนนี้
                    </li>
                  )
                }

                return (
                  <li
                    key={beat.id}
                    className="rounded-xl border border-gold-400/25 bg-night-800/50 px-4 py-3"
                  >
                    <p className="font-bold text-gold-200">{beat.title}</p>
                    <div className="mt-1.5 space-y-1">
                      {beat.lines.map((line, index) => (
                        <p key={index} className="text-sm leading-relaxed text-slate-300">
                          {line}
                        </p>
                      ))}
                    </div>
                  </li>
                )
              })}
            </ol>
          </section>
        ))}

        {/* คนที่เคยเจอ พร้อมสิ่งที่เขาพูดตอนนี้ */}
        <section className="mt-8">
          <h3 className="text-lg font-bold text-white">คนที่เคยเจอ</h3>
          <p className="mt-1 text-sm text-slate-300">
            แต่ละคนพูดไม่เหมือนเดิม เมื่อหนูทำอะไรสำเร็จเพิ่มขึ้น
          </p>

          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {NPCS.map((npc) => {
              const line = lineFor(player, npc.id)
              if (!line) return null
              return (
                <div
                  key={npc.id}
                  className="flex gap-3 rounded-xl border border-white/10 bg-night-800/50 p-3"
                >
                  <span aria-hidden="true" className="text-3xl">
                    {npc.avatar}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-gold-300">{npc.name}</p>
                    <p className="text-xs text-slate-400">{npc.role}</p>
                    <p className="mt-1.5 text-sm leading-relaxed text-slate-200">
                      “{line}”
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      </ScreenLayout>
    </>
  )
}
