import { buildStageMap, stagePin } from '../art/stageMap'
import { WorldSceneArt } from './art/GameArt'
import type { Player } from '../types/player'
import type { Stage } from '../types/stage'
import { getStageProgress, getStageStatus } from '../utils/stageSystem'

interface StagePathMapProps {
  player: Player
  worldId: string
  stages: Stage[]
  onSelect: (stage: Stage) => void
}

/**
 * แผนที่เส้นทางด่าน
 *
 * แทนการเรียงการ์ดเป็นตาราง เพื่อให้เด็กรู้สึกว่ากำลังเดินทางผ่านโลก
 * ไม่ใช่กำลังเปิดแบบฝึกหัดทีละหน้า
 *
 * เรื่องการเข้าถึง: หมุดแต่ละอันเป็นปุ่มจริงที่กด Tab ไปถึงได้
 * และมีคำอธิบายเสียงบอกทั้งชื่อด่านและสถานะ ไม่ได้บอกด้วยสีอย่างเดียว
 */
export function StagePathMap({
  player,
  worldId,
  stages,
  onSelect,
}: StagePathMapProps) {
  const layout = buildStageMap(stages)
  if (layout.nodes.length === 0) return null

  const STATUS_TEXT = {
    LOCKED: 'ยังไม่ปลดล็อก',
    AVAILABLE: 'เล่นได้แล้ว',
    IN_PROGRESS: 'กำลังเล่นอยู่',
    COMPLETED: 'ผ่านแล้ว',
    MASTERED: 'ผ่านแบบเก่งมาก',
  } as const

  return (
    <div className="relative overflow-hidden rounded-xl2 border border-white/10 bg-night-900">
      <WorldSceneArt
        worldId={worldId}
        className="absolute inset-0 h-full w-full opacity-30"
      />

      <div className="relative">
        <svg
          viewBox={`0 0 100 ${layout.height}`}
          className="block w-full"
          aria-hidden="true"
        >
          {/* เส้นทางเดิน วาดก่อนหมุดเพื่อให้อยู่ด้านหลัง */}
          <path
            d={layout.pathD}
            stroke="#fbbf24"
            strokeWidth={1.6}
            strokeDasharray="3 2.5"
            strokeLinecap="round"
            fill="none"
            opacity={0.75}
          />
          {layout.nodes.map((node) => {
            const stage = stages[node.index] as Stage
            return (
              <g
                key={node.stageId}
                transform={`translate(${node.x} ${node.y})`}
                dangerouslySetInnerHTML={{
                  __html: stagePin(
                    getStageStatus(player, stage),
                    String(node.index + 1),
                    node.isBoss,
                  ),
                }}
              />
            )
          })}
        </svg>

        {/*
          ปุ่มจริงวางทับหมุด SVG
          ใช้ปุ่มแยกแทนการทำให้ <g> คลิกได้ เพราะปุ่ม HTML รองรับคีย์บอร์ด
          และโปรแกรมอ่านหน้าจอได้ดีกว่าโดยไม่ต้องเขียนเพิ่มเอง
        */}
        {layout.nodes.map((node) => {
          const stage = stages[node.index] as Stage
          const status = getStageStatus(player, stage)
          const progress = getStageProgress(player, stage.id)
          const isLocked = status === 'LOCKED'

          return (
            <button
              key={`btn-${node.stageId}`}
              type="button"
              disabled={isLocked}
              onClick={() => onSelect(stage)}
              aria-label={
                `ด่านที่ ${node.index + 1} ${stage.name} — ${STATUS_TEXT[status]}` +
                (progress.stars > 0 ? ` ได้ ${progress.stars} ดาว` : '') +
                (node.isBoss ? ' เป็นด่านบอส' : '')
              }
              className={[
                'absolute -translate-x-1/2 -translate-y-1/2 rounded-full',
                'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2',
                'focus-visible:outline-gold-300',
                isLocked ? 'cursor-not-allowed' : 'cursor-pointer',
              ].join(' ')}
              style={{
                left: `${node.x}%`,
                top: `${(node.y / layout.height) * 100}%`,
                // ขนาดปุ่มอิงกับรัศมีหมุดในระบบพิกัด 100 หน่วย
                width: `${(node.isBoss ? 8.5 : 6.5) * 2}%`,
                aspectRatio: '1',
              }}
            />
          )
        })}
      </div>

      <p className="relative px-4 pb-3 text-center text-xs text-slate-400">
        แตะหมุดเพื่อเข้าด่าน · เส้นประคือเส้นทางการผจญภัย
      </p>
    </div>
  )
}
