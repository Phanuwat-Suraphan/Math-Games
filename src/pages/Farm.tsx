import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../components/Button'
import { ScreenLayout } from '../components/ScreenLayout'
import { TopBar } from '../components/TopBar'
import { useGame } from '../context/useGame'
import { useMusic } from '../hooks/useMusic'
import { playSfx } from '../services/audioService'
import {
  FOOD_PER_PRODUCE,
  acceptFamily,
  buyAnimal,
  buyBuilding,
  buyFeed,
  buyKitchen,
  cancelCraft,
  craftCapacity,
  craftableUnits,
  craftedToday,
  createFarm,
  dailyConsumption,
  dailyProduction,
  daysRemaining,
  depositFood,
  isReady,
  nextPlotCost,
  plantPlot,
  plotCells,
  plotFence,
  productKey,
  seedCostFor,
  sellStock,
  startCraft,
  unlockPlot,
  waterPlot,
} from '../farm/engine'
import { basePrice, marketPrice, priceChangePercent } from '../farm/market'
import { LEDGER_INDICATOR } from '../teacher/indicators'
import { useIndicatorLog } from '../hooks/useIndicatorLog'
import { ResultCodeCard } from '../components/ResultCodeCard'
import { buildLedger, builderAnswer, closeDay, eventForDay, planDay } from '../farm/ledger'
import { decodeFarm, encodeFarm } from '../farm/save'
import { clearFarm, loadFarm, saveFarm } from '../farm/storage'
import {
  FARM_STAGE_HEIGHT,
  FARM_STAGE_WIDTH,
  drawFarm,
  plotScreenPositions,
} from '../farm/render'
import {
  ANIMALS,
  BUILDINGS,
  CROPS,
  ENERGY_PER_DAY,
  KITCHEN_CAPACITY,
  KITCHEN_COST,
  MAX_PLOTS,
  RECIPES,
  RESOURCES,
  craftKey,
  findAnimal,
  findCrop,
  findRecipe,
  findResource,
} from '../farm/types'
import type { AnimalId, FarmState, Grade, ResourceId } from '../farm/types'
import type { BuilderSpec, DayPlan, LedgerRow } from '../farm/ledger'
import type { SkillId } from '../types/stats'
import type { Player } from '../types/player'

/**
 * โดมสีเขียว — ฟาร์มและการบริหารทรัพยากรในโดม
 *
 * ภาคต่อของ Safe Zone Guardians เด็กเข้าโดมได้แล้ว หน้าที่จึงเปลี่ยนจาก
 * การเอาตัวรอดเข้ามา เป็นการทำให้ที่นี่อยู่รอดและเปิดรับคนข้างนอกเพิ่มได้
 *
 * สิ่งที่ต่างจากโหมดอื่นของเกมมากที่สุดคือ "เวลา"
 * โหมดอื่นจบในรอบเดียว แต่ฟาร์มสะสมข้ามวันข้ามคาบเรียน
 * และวันจะผ่านไปก็ต่อเมื่อปิดสมุดบัญชีของวันนั้นได้ ไม่ใช่เมื่อนาฬิกาเดิน
 * เหตุผลทั้งหมดอยู่ในหัวไฟล์ farm/ledger.ts
 */

type Phase = 'intro' | 'day' | 'ledger'
type Panel = 'plots' | 'animals' | 'kitchen' | 'dome' | 'market'

/** ทักษะที่แถวสมุดบัญชีแต่ละชนิดบันทึกลงสถิติ */
const LEDGER_SKILL: Record<LedgerRow['kind'], SkillId> = {
  harvest: 'multiplication',
  feed: 'division',
  craft: 'multiplication',
  resource: 'wordProblems',
  forecast: 'division',
  percent: 'percentages',
  average: 'wordProblems',
  build: 'wordProblems',
}

function withCommas(value: number): string {
  return value.toLocaleString('en-US')
}

/** อ่านตัวเลขที่เด็กพิมพ์ คืน null เมื่อยังพิมพ์ไม่เสร็จ */
function readNumber(text: string): number | null {
  const digits = text.replace(/[^0-9]/g, '')
  if (digits.length === 0) return null
  return Number.parseInt(digits, 10)
}

export function Farm({ player }: { player: Player }) {
  const navigate = useNavigate()
  const { settings, answerQuestion } = useGame()
  const { logIndicator, currentCode } = useIndicatorLog(player.name)
  useMusic('adventure')

  const [phase, setPhase] = useState<Phase>('intro')
  const [farm, setFarm] = useState<FarmState | null>(null)
  const [panel, setPanel] = useState<Panel>('plots')
  const [selectedPlot, setSelectedPlot] = useState<number | null>(0)
  const [notice, setNotice] = useState<string | null>(null)
  const [plan, setPlan] = useState<DayPlan | null>(null)
  const [rows, setRows] = useState<LedgerRow[]>([])

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const farmRef = useRef<FarmState | null>(null)
  farmRef.current = farm

  const saved = useMemo(() => loadFarm(), [])

  /*
   * บันทึกทุกครั้งที่ฟาร์มเปลี่ยน
   *
   * ไม่ได้รอให้ปิดวันแล้วค่อยบันทึก เพราะเด็กปิดแท็บกลางคันเป็นเรื่องปกติ
   * และของที่หายไปคือของที่เพิ่งซื้อไปเมื่อครู่ ซึ่งเจ็บกว่าการเสียทั้งวัน
   */
  useEffect(() => {
    if (!farm) return
    saveFarm(farm)
  }, [farm])

  /** แก้ค่าในฟาร์มแล้วบอก React ว่ามีการเปลี่ยนแปลง */
  const mutate = useCallback((change: (draft: FarmState) => void) => {
    setFarm((current) => {
      if (!current) return current
      const draft: FarmState = JSON.parse(JSON.stringify(current))
      change(draft)
      return draft
    })
  }, [])

  /**
   * สั่งงานหนึ่งครั้ง แล้วแสดงเหตุผลถ้าทำไม่ได้
   *
   * ตั้งใจไม่ทำงานทั้งหมดข้างในฟังก์ชันอัปเดตของ setState
   * เพราะที่นี่มีทั้งการเล่นเสียงและการตั้งข้อความเตือน ซึ่งเป็นผลข้างเคียง
   * และ React ใน StrictMode เรียกฟังก์ชันอัปเดตสองครั้งเพื่อจับกรณีแบบนี้พอดี
   * ผลคือได้ยินเสียงซ้อนกันสองรอบทุกครั้งที่กดปุ่ม
   */
  const act = useCallback(
    (change: (draft: FarmState) => { ok: boolean; reason?: string }) => {
      const current = farmRef.current
      if (!current) return

      const draft: FarmState = JSON.parse(JSON.stringify(current))
      const result = change(draft)
      if (!result.ok) {
        playSfx('wrong')
        setNotice(result.reason ?? 'ทำตอนนี้ไม่ได้')
        return
      }
      setNotice(null)
      playSfx('click')
      setFarm(draft)
    },
    [],
  )

  /* ---------------- วงวนการวาดฉาก ---------------- */

  useEffect(() => {
    if (phase !== 'day') return
    let frame = 0
    const loop = (now: number): void => {
      const current = farmRef.current
      if (current) {
        drawFarm(canvasRef.current, current, {
          time: now,
          reduceMotion: !settings.animationsEnabled,
          selectedPlot,
        })
      }
      frame = requestAnimationFrame(loop)
    }
    frame = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(frame)
  }, [phase, selectedPlot, settings.animationsEnabled])

  /* ---------------- การเริ่มและปิดวัน ---------------- */

  const startNewFarm = useCallback((grade: Grade) => {
    clearFarm()
    const created = createFarm(`${Date.now()}`, grade)
    setFarm(created)
    setSelectedPlot(0)
    setPhase('day')
    playSfx('levelUp')
  }, [])

  const continueFarm = useCallback(() => {
    if (!saved) return
    setFarm(saved)
    setSelectedPlot(0)
    setPhase('day')
  }, [saved])

  const beginLedger = useCallback(() => {
    if (!farm) return
    const nextPlan = planDay(farm)
    setPlan(nextPlan)
    setRows(buildLedger(farm, nextPlan))
    setPhase('ledger')
  }, [farm])

  const finishLedger = useCallback(
    (perfect: boolean) => {
      if (!plan) return
      mutate((draft) => closeDay(draft, plan, perfect))
      setPlan(null)
      setRows([])
      setPhase('day')
      playSfx(perfect ? 'levelUp' : 'coin')
    },
    [mutate, plan],
  )

  /** บันทึกผลการตอบหนึ่งช่องเข้าสถิติชุดเดียวกับโหมดอื่น */
  const record = useCallback(
    (row: LedgerRow, isCorrect: boolean) => {
      answerQuestion({
        questionId: `farm-${row.id}-${farm?.day ?? 0}`,
        stageId: 'green-dome',
        skill: LEDGER_SKILL[row.kind],
        isCorrect,
        timeMs: 0,
        isReplay: true,
      })
      // แถวที่ยังไม่ได้โยงกับตัวชี้วัด ไม่บันทึก ดีกว่าบันทึกผิดช่อง
      const indicator = LEDGER_INDICATOR[row.kind]
      if (indicator) logIndicator(indicator, isCorrect)
      mutate((draft) => {
        draft.ledgerAnswered += 1
        if (isCorrect) draft.ledgerCorrect += 1
      })
    },
    [answerQuestion, farm, logIndicator, mutate],
  )

  /* ---------------- หน้าเริ่มต้น ---------------- */

  if (phase === 'intro' || !farm) {
    return (
      <IntroScreen
        player={player}
        saved={saved}
        onStart={startNewFarm}
        onContinue={continueFarm}
        onRestore={(restored) => {
          setFarm(restored)
          setSelectedPlot(0)
          setPhase('day')
          playSfx('levelUp')
        }}
      />
    )
  }

  /* ---------------- หน้าสมุดบัญชี ---------------- */

  if (phase === 'ledger' && plan) {
    return (
      <>
        <TopBar player={player} title={`สมุดบัญชี วันที่ ${farm.day}`} />
        <ScreenLayout width="normal">
          <LedgerScreen
            farm={farm}
            plan={plan}
            rows={rows}
            resultCode={currentCode()}
            onRecord={record}
            onFinish={finishLedger}
          />
        </ScreenLayout>
      </>
    )
  }

  /* ---------------- หน้าเล่นหลัก ---------------- */

  const event = eventForDay(farm)
  const consumption = dailyConsumption(farm)
  const production = dailyProduction(farm)

  return (
    <>
      <TopBar player={player} title="โดมสีเขียว" backTo="/menu" />
      <ScreenLayout width="wide">
        <div className="farm-stage">
          <canvas
            ref={canvasRef}
            width={FARM_STAGE_WIDTH}
            height={FARM_STAGE_HEIGHT}
            className="block w-full"
            aria-label="ภาพฟาร์มในโดมมองจากมุมสูง"
          />

          {/* แถบสถานะมุมซ้ายบน อ่านได้โดยไม่ต้องเลื่อนหน้า */}
          <div className="pointer-events-none absolute left-3 top-3 flex flex-wrap gap-2">
            <span className="farm-chip">📅 วันที่ {farm.day}</span>
            <span className="farm-chip">
              ⚡ แรง {farm.energy}/{ENERGY_PER_DAY}
            </span>
            <span className="farm-chip">🪙 {withCommas(farm.coins)}</span>
            <span className="farm-chip">👨‍👩‍👧 {farm.families} ครอบครัว</span>
          </div>

          {/*
            ปุ่มโปร่งใสวางทับแปลงในภาพ
            เด็กชี้แปลงที่เห็นได้ตรง ๆ แทนการหาเลขแปลงในรายการด้านล่าง
            ตำแหน่งมาจากตัวฉายจุดชุดเดียวกับที่ใช้วาดฉาก จึงตรงกันเสมอ
          */}
          {plotScreenPositions(farm, {
            width: FARM_STAGE_WIDTH,
            height: FARM_STAGE_HEIGHT,
          }).map((spot) => (
            <button
              key={spot.index}
              type="button"
              onClick={() => {
                setSelectedPlot(spot.index)
                setPanel('plots')
                playSfx('click')
              }}
              aria-label={`เลือกแปลงที่ ${spot.index + 1}`}
              className="farm-hotspot"
              style={{
                left: `${(spot.x / FARM_STAGE_WIDTH) * 100}%`,
                top: `${(spot.y / FARM_STAGE_HEIGHT) * 100}%`,
              }}
            >
              {spot.index + 1}
            </button>
          ))}
        </div>

        {/* เหตุการณ์ประจำวัน */}
        <div className="panel mt-3 flex items-start gap-3 p-4">
          <span aria-hidden="true" className="text-2xl">
            {event.emoji}
          </span>
          <div className="min-w-0">
            <p className="text-sm font-black text-white">{event.title}</p>
            <p className="text-sm text-slate-300">{event.detail}</p>
          </div>
        </div>

        {notice ? (
          <p
            role="status"
            className="mt-3 rounded-xl border border-gold-400/40 bg-gold-500/10 p-3 text-center text-sm font-bold text-gold-300"
          >
            {notice}
          </p>
        ) : null}

        <nav aria-label="แผงควบคุมฟาร์ม" className="mt-4 grid grid-cols-5 gap-2">
          {(
            [
              ['plots', '🌱', 'แปลงปลูก'],
              ['animals', '🐔', 'สัตว์'],
              ['kitchen', '🥫', 'แปรรูป'],
              ['dome', '🏙️', 'โดม'],
              ['market', '🛒', 'ตลาด'],
            ] as const
          ).map(([id, emoji, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => {
                setPanel(id)
                playSfx('click')
              }}
              aria-pressed={panel === id}
              className={`farm-tab ${panel === id ? 'farm-tab-active' : ''}`}
            >
              <span aria-hidden="true" className="text-lg">
                {emoji}
              </span>
              <span className="text-xs font-bold sm:text-sm">{label}</span>
            </button>
          ))}
        </nav>

        <div className="panel mt-3 p-4 sm:p-5">
          {panel === 'plots' ? (
            <PlotPanel
              farm={farm}
              selected={selectedPlot}
              onSelect={setSelectedPlot}
              onAct={act}
            />
          ) : null}
          {panel === 'animals' ? <AnimalPanel farm={farm} onAct={act} /> : null}
          {panel === 'kitchen' ? <KitchenPanel farm={farm} onAct={act} /> : null}
          {panel === 'dome' ? (
            <DomePanel
              farm={farm}
              consumption={consumption}
              production={production}
              onAct={act}
            />
          ) : null}
          {panel === 'market' ? <MarketPanel farm={farm} onAct={act} /> : null}
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <FarmCodeBox farm={farm} />
          <Button size="lg" icon="🌙" onClick={beginLedger}>
            ปิดวัน แล้วสรุปบัญชี
          </Button>
        </div>

        <p className="mt-3 text-center text-xs text-slate-500">
          ฟาร์มถูกบันทึกอัตโนมัติทุกครั้งที่เปลี่ยนแปลง ·{' '}
          <button
            type="button"
            className="underline hover:text-slate-300"
            onClick={() => navigate('/menu')}
          >
            กลับเมนูหลัก
          </button>
        </p>
      </ScreenLayout>
    </>
  )
}

/* ------------------------------------------------------------------ *
 * หน้าเริ่มต้น
 * ------------------------------------------------------------------ */

interface IntroProps {
  player: Player
  saved: FarmState | null
  onStart: (grade: Grade) => void
  onContinue: () => void
  onRestore: (farm: FarmState) => void
}

function IntroScreen({ player, saved, onStart, onContinue, onRestore }: IntroProps) {
  const [grade, setGrade] = useState<Grade>(4)
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)

  return (
    <>
      <TopBar player={player} title="โดมสีเขียว" backTo="/menu" />
      <ScreenLayout width="normal">
        <div className="farm-terminal p-6 sm:p-8">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-leaf-400">
            ภาคต่อของ Safe Zone Guardians
          </p>
          <h2 className="mt-2 text-2xl font-black text-white sm:text-3xl">
            ประตูโดมปิดลงข้างหลังหนูแล้ว
          </h2>
          <div className="mt-4 space-y-3 text-sm leading-relaxed text-slate-200 sm:text-base">
            <p>
              ข้างในมีต้นไม้ มีน้ำ และมีอากาศหายใจ แต่ไม่มีอะไรไหลเข้ามาจากข้างนอกได้อีกแล้ว
              ทุกอย่างที่คนในโดมใช้ ต้องผลิตกันเองทั้งหมด
            </p>
            <p>
              หน้าที่ของหนูเปลี่ยนไปแล้ว จากการเอาตัวรอดเข้ามา
              เป็น <strong className="text-leaf-400">การทำให้ที่นี่อยู่รอด</strong> และ
              เปิดประตูรับคนที่ยังรออยู่ข้างนอกให้ได้มากที่สุด
            </p>
            <p className="text-gold-300">
              วันในโดมจะผ่านไปเมื่อหนูปิดสมุดบัญชีของวันนั้นได้ ไม่ใช่เมื่อเวลาผ่านไป
            </p>
          </div>
        </div>

        {saved ? (
          <div className="panel mt-5 p-5">
            <p className="text-sm font-black text-white">มีฟาร์มที่ค้างไว้</p>
            <p className="mt-1 text-sm text-slate-300">
              วันที่ {saved.day} · {saved.plots.length} แปลง · {saved.families} ครอบครัว ·{' '}
              {withCommas(saved.coins)} เหรียญ
            </p>
            <Button className="mt-3" size="lg" icon="▶️" onClick={onContinue}>
              เล่นฟาร์มเดิมต่อ
            </Button>
          </div>
        ) : null}

        <div className="panel mt-5 p-5">
          <p className="text-sm font-black text-white">เริ่มฟาร์มใหม่</p>
          <p className="mt-1 text-sm text-slate-300">
            เลือกระดับชั้น เพื่อให้โจทย์ในสมุดบัญชีตรงกับที่เรียนอยู่
          </p>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {([4, 5, 6] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setGrade(option)}
                aria-pressed={grade === option}
                className={`btn-3d min-h-[52px] rounded-xl border-b-4 font-black ${
                  grade === option
                    ? 'border-leaf-600 bg-leaf-500 text-night-900'
                    : 'border-night-500 bg-night-700 text-white hover:bg-night-600'
                }`}
              >
                ป.{option}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-slate-400">
            {grade === 4
              ? 'การคูณ · การหารที่มีเศษ · โจทย์สองขั้นตอน · จำนวนหลักหมื่นขึ้นไป'
              : grade === 5
                ? 'ทุกอย่างของ ป.4 และเพิ่มค่าเฉลี่ยของผลผลิต'
                : 'ทุกอย่างของ ป.5 และเพิ่มร้อยละของถังทรัพยากร'}
          </p>
          <Button
            className="mt-4"
            size="lg"
            fullWidth
            icon="🌱"
            variant={saved ? 'secondary' : 'primary'}
            onClick={() => onStart(grade)}
          >
            {saved ? 'เริ่มใหม่ (ฟาร์มเดิมจะหายไป)' : 'เริ่มดูแลโดม'}
          </Button>
        </div>

        {/*
          ช่องวางรหัสฟาร์ม
          วางไว้ในหน้าแรกเพราะเป็นที่ที่เด็กมาถึงตอนเปลี่ยนเครื่อง
          ถ้าซ่อนไว้ในหน้าตั้งค่า เด็กที่เพิ่งเสียฟาร์มไปจะหาไม่เจอ
        */}
        <div className="panel mt-5 p-5">
          <p className="text-sm font-black text-white">ย้ายฟาร์มมาจากเครื่องอื่น</p>
          <p className="mt-1 text-sm text-slate-300">
            วางรหัสฟาร์มที่คัดลอกมา แล้วกดกู้คืน
          </p>
          <textarea
            value={code}
            onChange={(event) => {
              setCode(event.target.value)
              setError(null)
            }}
            rows={2}
            spellCheck={false}
            placeholder="DOME1~..."
            className="mt-3 w-full rounded-xl border border-leaf-400/40 bg-night-900/80 p-3 font-mono text-sm text-white placeholder:text-slate-600"
          />
          {error ? (
            <p role="alert" className="mt-2 text-sm font-bold text-ember-400">
              {error}
            </p>
          ) : null}
          <Button
            className="mt-3"
            variant="ghost"
            icon="📥"
            onClick={() => {
              const result = decodeFarm(code)
              if (!result.ok) {
                setError(result.reason)
                playSfx('wrong')
                return
              }
              onRestore(result.farm)
            }}
          >
            กู้คืนฟาร์มจากรหัส
          </Button>
        </div>
      </ScreenLayout>
    </>
  )
}

/* ------------------------------------------------------------------ *
 * แผงควบคุม
 * ------------------------------------------------------------------ */

type ActFn = (change: (draft: FarmState) => { ok: boolean; reason?: string }) => void

function PlotPanel({
  farm,
  selected,
  onSelect,
  onAct,
}: {
  farm: FarmState
  selected: number | null
  onSelect: (index: number) => void
  onAct: ActFn
}) {
  const index = selected ?? 0
  const plot = farm.plots[index]
  const unlockCost = nextPlotCost(farm)

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {farm.plots.map((entry, position) => (
          <button
            key={position}
            type="button"
            onClick={() => onSelect(position)}
            aria-pressed={position === index}
            className={`farm-pill ${position === index ? 'farm-pill-active' : ''}`}
          >
            แปลง {position + 1} · {entry.size.cols}×{entry.size.rows}
          </button>
        ))}
        {unlockCost !== null ? (
          <button
            type="button"
            onClick={() => onAct((draft) => unlockPlot(draft))}
            className="farm-pill border-dashed"
          >
            + เปิดแปลงใหม่ {withCommas(unlockCost)} 🪙
          </button>
        ) : (
          <span className="farm-pill opacity-60">เปิดครบ {MAX_PLOTS} แปลงแล้ว</span>
        )}
      </div>

      {plot ? (
        <div className="mt-4">
          <div className="flex flex-wrap gap-2 text-sm">
            <span className="stat-chip">
              พื้นที่ {plot.size.cols} × {plot.size.rows} = {plotCells(plot)} ช่อง
            </span>
            <span className="stat-chip">รั้วรอบแปลง {plotFence(plot)} เมตร</span>
          </div>

          {plot.planting ? (
            <div className="mt-3">
              <p className="text-sm text-slate-200">
                กำลังปลูก {findCrop(plot.planting.crop).emoji}{' '}
                {findCrop(plot.planting.crop).name} · รดน้ำแล้ว {plot.planting.watered} จาก{' '}
                {findCrop(plot.planting.crop).growDays} วัน
              </p>
              <div className="bar-track mt-2 h-3">
                <div
                  className="bar-fill farm-grow h-full"
                  style={{
                    width: `${Math.min(100, (plot.planting.watered / findCrop(plot.planting.crop).growDays) * 100)}%`,
                  }}
                />
              </div>
              {isReady(plot) ? (
                <p className="mt-2 text-sm font-bold text-leaf-400">
                  ✅ โตเต็มที่แล้ว จะเก็บเกี่ยวตอนปิดวัน
                </p>
              ) : (
                <Button
                  className="mt-3"
                  disabled={plot.planting.wateredToday}
                  icon="💧"
                  onClick={() => onAct((draft) => waterPlot(draft, index))}
                >
                  {plot.planting.wateredToday ? 'วันนี้รดน้ำแล้ว' : 'รดน้ำ (ใช้แรง 1)'}
                </Button>
              )}
            </div>
          ) : (
            <div className="mt-3">
              <p className="text-sm text-slate-300">
                แปลงนี้ว่างอยู่ เลือกพืชที่จะปลูกเต็มแปลง
              </p>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {CROPS.map((crop) => {
                  const cost = seedCostFor(plot, crop.id)
                  const income = plotCells(plot) * crop.sellPrice
                  return (
                    <button
                      key={crop.id}
                      type="button"
                      onClick={() => onAct((draft) => plantPlot(draft, index, crop.id))}
                      className="farm-option"
                    >
                      <span aria-hidden="true" className="text-2xl">
                        {crop.emoji}
                      </span>
                      <span className="min-w-0 flex-1 text-left">
                        <span className="block text-sm font-bold text-white">
                          {crop.name} · โต {crop.growDays} วัน
                        </span>
                        <span className="block text-xs text-slate-400">
                          เมล็ด {withCommas(cost)} 🪙 · ขายได้ {withCommas(income)} 🪙
                        </span>
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      ) : null}
    </div>
  )
}

function AnimalPanel({ farm, onAct }: { farm: FarmState; onAct: ActFn }) {
  const need = farm.herds.reduce(
    (total, herd) => total + herd.count * findAnimal(herd.animal).feedPerDay,
    0,
  )

  return (
    <div>
      <div className="flex flex-wrap gap-2 text-sm">
        <span className="stat-chip">🌾 อาหารสัตว์ {withCommas(farm.feed)} กก.</span>
        <span className="stat-chip">
          วันนี้ต้องใช้ {withCommas(need)} กก. {need > farm.feed ? '· ไม่พอ' : '· พอ'}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {[20, 50, 100].map((amount) => (
          <button
            key={amount}
            type="button"
            onClick={() => onAct((draft) => buyFeed(draft, amount))}
            className="farm-pill"
          >
            ซื้ออาหาร {amount} กก. · {withCommas(amount * 2)} 🪙
          </button>
        ))}
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        {ANIMALS.map((animal) => {
          const herd = farm.herds.find((entry) => entry.animal === animal.id)
          return (
            <div key={animal.id} className="rounded-xl border border-white/10 bg-white/5 p-3">
              <p className="text-sm font-bold text-white">
                <span aria-hidden="true">{animal.emoji}</span> {animal.name} ·{' '}
                {herd?.count ?? 0} ตัว
              </p>
              <p className="mt-1 text-xs text-slate-400">
                กินวันละตัวละ {animal.feedPerDay} กก. · ให้{animal.productName}วันละ{' '}
                {animal.yieldPerDay} ชิ้น
              </p>
              <Button
                className="mt-2"
                variant="ghost"
                onClick={() => onAct((draft) => buyAnimal(draft, animal.id as AnimalId, 1))}
              >
                ซื้อเพิ่ม 1 ตัว · {withCommas(animal.cost)} 🪙
              </Button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/**
 * แผงโรงแปรรูป
 *
 * แสดงส่วนต่างเป็นตัวเลขให้เห็นก่อนกด ไม่ใช่ให้กดแล้วค่อยรู้
 * เพราะสิ่งที่อยากให้เด็กได้จากระบบนี้คือการ "เปรียบเทียบก่อนตัดสินใจ"
 * ถ้าซ่อนตัวเลขไว้จนกดแล้ว มันจะกลายเป็นปุ่มที่กดไปเรื่อย ๆ แล้วได้เงินเพิ่ม
 * ซึ่งไม่ต่างอะไรกับปุ่มเก็บรางวัลในเกมทั่วไป และไม่ได้สอนอะไรเลย
 */
function KitchenPanel({ farm, onAct }: { farm: FarmState; onAct: ActFn }) {
  if (farm.kitchens === 0) {
    return (
      <div>
        <p className="text-sm text-slate-200">
          โรงแปรรูปเปลี่ยนผลผลิตสดให้เป็นของที่ขายได้แพงกว่า
          เช่นมะเขือเทศ {findRecipe('sauce').inputPerUnit} ผล ทำซอสได้ 1 ขวด
        </p>
        <p className="mt-2 text-sm text-gold-300">
          ราคาของแปรรูปไม่ขึ้นลงตามตลาดด้วย ต่างจากผลผลิตสด
        </p>
        <Button
          className="mt-3"
          size="lg"
          icon="🥫"
          onClick={() => onAct((draft) => buyKitchen(draft))}
        >
          สร้างโรงแปรรูป · {withCommas(KITCHEN_COST)} 🪙
        </Button>
      </div>
    )
  }

  const used = craftedToday(farm)
  const capacity = craftCapacity(farm)

  return (
    <div>
      <div className="flex flex-wrap gap-2 text-sm">
        <span className="stat-chip">🥫 โรงแปรรูป {farm.kitchens} หลัง</span>
        <span className="stat-chip">
          วันนี้ทำไปแล้ว {used} จาก {capacity} ชิ้น
        </span>
        <button
          type="button"
          className="farm-pill"
          onClick={() => onAct((draft) => buyKitchen(draft))}
        >
          สร้างเพิ่ม · {withCommas(KITCHEN_COST)} 🪙 (+{KITCHEN_CAPACITY} ชิ้น/วัน)
        </button>
      </div>

      {farm.crafting.length > 0 ? (
        <div className="mt-3 rounded-xl border border-leaf-400/40 bg-leaf-500/10 p-3">
          <p className="text-sm font-bold text-leaf-300">กำลังแปรรูป จะเสร็จตอนปิดวัน</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {farm.crafting.map((order) => {
              const recipe = findRecipe(order.recipe)
              return (
                <button
                  key={order.recipe}
                  type="button"
                  className="farm-pill"
                  onClick={() => onAct((draft) => cancelCraft(draft, order.recipe))}
                >
                  {recipe.emoji} {recipe.name} {order.units} ชิ้น · กดเพื่อยกเลิก
                </button>
              )
            })}
          </div>
        </div>
      ) : null}

      <div className="mt-3 space-y-2">
        {RECIPES.map((recipe) => {
          const crop = findCrop(recipe.input)
          const have = farm.stock[recipe.input] ?? 0
          const most = craftableUnits(farm, recipe.id)
          const cropPrice = marketPrice(farm, recipe.input)
          const rawValue = recipe.inputPerUnit * cropPrice
          const gain = recipe.price - rawValue

          return (
            <div
              key={recipe.id}
              className="flex flex-wrap items-center gap-2 rounded-xl border border-white/10 bg-white/5 p-3"
            >
              <span aria-hidden="true" className="text-2xl">
                {recipe.emoji}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold text-white">
                  {recipe.name} · ใช้{crop.name} {recipe.inputPerUnit} ผล ต่อ 1 ชิ้น
                </span>
                <span className="block text-xs text-slate-400">
                  ขาย{crop.name}สด {recipe.inputPerUnit} ผลได้ {withCommas(rawValue)} 🪙 ·
                  แปรรูปแล้วขายได้ {withCommas(recipe.price)} 🪙 ·{' '}
                  <strong className="text-leaf-400">ได้เพิ่ม {withCommas(gain)} 🪙</strong>
                </span>
                <span className="block text-xs text-slate-500">
                  มี{crop.name}ในคลัง {withCommas(have)} ผล · ทำได้ {most} ชิ้น
                </span>
              </span>
              <button
                type="button"
                disabled={most === 0}
                className="farm-pill disabled:opacity-40"
                onClick={() => onAct((draft) => startCraft(draft, recipe.id, 1))}
              >
                ทำ 1 ชิ้น
              </button>
              <button
                type="button"
                disabled={most === 0}
                className="farm-pill disabled:opacity-40"
                onClick={() => onAct((draft) => startCraft(draft, recipe.id, most))}
              >
                ทำเต็มที่ {most} ชิ้น
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function DomePanel({
  farm,
  consumption,
  production,
  onAct,
}: {
  farm: FarmState
  consumption: Record<ResourceId, number>
  production: Record<ResourceId, number>
  onAct: ActFn
}) {
  return (
    <div>
      <div className="grid gap-3 sm:grid-cols-2">
        {RESOURCES.map((spec) => {
          const value = farm.resources[spec.id]
          const days = daysRemaining(farm, spec.id)
          const percent = Math.round((value / spec.capacity) * 100)
          const critical = Number.isFinite(days) && days < 7
          return (
            <div key={spec.id} className="rounded-xl border border-white/10 bg-white/5 p-3">
              <div className="flex items-baseline justify-between text-sm">
                <span className="font-bold text-white">
                  <span aria-hidden="true">{spec.emoji}</span> {spec.name}
                </span>
                <span className="tabular-nums text-xs text-slate-400">
                  {withCommas(value)} / {withCommas(spec.capacity)} {spec.unit}
                </span>
              </div>
              <div className="bar-track mt-2 h-3">
                <div
                  className={`bar-fill h-full ${critical ? 'farm-alarm' : 'farm-grow'}`}
                  style={{ width: `${Math.max(2, percent)}%` }}
                />
              </div>
              <p className={`mt-1 text-xs ${critical ? 'font-bold text-ember-400' : 'text-slate-400'}`}>
                ผลิต {withCommas(production[spec.id])} · ใช้ {withCommas(consumption[spec.id])} ·{' '}
                {Number.isFinite(days) ? `อยู่ได้อีก ${days} วัน` : 'ผลิตได้มากกว่าที่ใช้'}
              </p>
            </div>
          )
        })}
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        {BUILDINGS.map((building) => (
          <div key={building.id} className="rounded-xl border border-white/10 bg-white/5 p-3">
            <p className="text-sm font-bold text-white">
              <span aria-hidden="true">{building.emoji}</span> {building.name} ·{' '}
              {farm.buildings[building.id] ?? 0} หลัง
            </p>
            <p className="mt-1 text-xs text-slate-400">
              ผลิต {withCommas(building.output)} {findResource(building.produces).unit}/วัน
              {building.powerDraw > 0
                ? ` · ใช้ไฟ ${withCommas(building.powerDraw)} หน่วย/วัน`
                : ' · ไม่ใช้ไฟ'}
            </p>
            <Button
              className="mt-2"
              variant="ghost"
              onClick={() => onAct((draft) => buyBuilding(draft, building.id))}
            >
              สร้างเพิ่ม · {withCommas(building.cost)} 🪙
            </Button>
          </div>
        ))}
      </div>

      {/*
        การรับคนเพิ่มคือเป้าหมายของเกม และเป็นสิ่งเดียวที่ทำให้เกมยากขึ้น
        จึงไม่ห้ามแม้ทรัพยากรจะตึง เพราะการห้ามเท่ากับเกมตัดสินใจแทนเด็ก
        สิ่งที่เกมทำได้คือวางตัวเลขให้ครบตรงหน้าก่อน แล้วให้เด็กเลือกเอง
      */}
      <div className="mt-4 rounded-xl border border-leaf-400/40 bg-leaf-500/10 p-4">
        <p className="text-sm font-black text-leaf-300">เปิดประตูรับคนเพิ่ม</p>
        <p className="mt-1 text-sm text-slate-300">
          ยังมีครอบครัวรออยู่ข้างนอก การรับเพิ่มหนึ่งครอบครัวทำให้โดมใช้ทรัพยากรมากขึ้นทุกวัน คือ{' '}
          {RESOURCES.map((spec) => `${spec.name} ${withCommas(spec.perFamily)} ${spec.unit}`).join(' · ')}
        </p>
        <Button
          className="mt-3"
          variant="success"
          icon="🚪"
          onClick={() => onAct((draft) => acceptFamily(draft))}
        >
          รับอีกหนึ่งครอบครัว
        </Button>
      </div>
    </div>
  )
}

function MarketPanel({ farm, onAct }: { farm: FarmState; onAct: ActFn }) {
  const entries = Object.entries(farm.stock).filter(([, amount]) => amount > 0)

  /*
   * กระดานราคาวันนี้ แสดงทุกพืชแม้ยังไม่มีของในคลัง
   *
   * เพราะการตัดสินใจว่า "วันนี้ควรขายอะไร" ต้องเห็นราคาก่อนถึงจะตัดสินใจได้
   * ถ้าโชว์เฉพาะของที่มี เด็กจะไม่มีทางรู้ว่าพืชที่กำลังปลูกอยู่ราคาขึ้นหรือลง
   */
  const board = (
    <div className="mb-4">
      <p className="text-xs font-bold uppercase tracking-widest text-leaf-400">
        ราคาตลาดวันนี้
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        {CROPS.map((crop) => {
          const price = marketPrice(farm, crop.id)
          const change = priceChangePercent(farm, crop.id)
          return (
            <span
              key={crop.id}
              className={`farm-pill ${change > 0 ? 'farm-pill-up' : change < 0 ? 'farm-pill-down' : ''}`}
              title={`ราคาปกติ ${basePrice(crop.id)} บาท`}
            >
              {crop.emoji} {price}
              {change !== 0 ? (change > 0 ? ` ▲${change}%` : ` ▼${Math.abs(change)}%`) : ' ปกติ'}
            </span>
          )
        })}
      </div>
    </div>
  )

  if (entries.length === 0) {
    return (
      <div>
        {board}
        <p className="text-sm text-slate-300">
          คลังยังว่างอยู่ ผลผลิตจะเข้าคลังตอนปิดวันที่แปลงโตเต็มที่
        </p>
      </div>
    )
  }

  return (
    <div>
      {board}
      <p className="text-sm text-slate-300">
        ผลผลิตหนึ่งชิ้นเลือกได้อย่างเดียว จะขายเป็นเงิน หรือเก็บเป็นอาหารให้คนในโดม
        (ชิ้นละ {FOOD_PER_PRODUCE} กิโลกรัม)
      </p>
      <div className="mt-3 space-y-2">
        {entries.map(([key, amount]) => {
          const crop = CROPS.find((entry) => entry.id === key)
          const animal = ANIMALS.find((entry) => productKey(entry.id) === key)
          const recipe = RECIPES.find((entry) => craftKey(entry.id) === key)
          const name = crop
            ? crop.name
            : animal
              ? animal.productName
              : recipe
                ? recipe.name
                : key
          const emoji = crop
            ? crop.emoji
            : animal
              ? animal.productEmoji
              : recipe
                ? recipe.emoji
                : '📦'
          const price = marketPrice(farm, key)
          return (
            <div
              key={key}
              className="flex flex-wrap items-center gap-2 rounded-xl border border-white/10 bg-white/5 p-3"
            >
              <span aria-hidden="true" className="text-2xl">
                {emoji}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold text-white">
                  {name} · {withCommas(amount)} ชิ้น
                </span>
                <span className="block text-xs text-slate-400">
                  ขายได้ชิ้นละ {price} 🪙 · ขายทั้งหมดได้ {withCommas(amount * price)} 🪙
                </span>
              </span>
              <button
                type="button"
                className="farm-pill"
                onClick={() => onAct((draft) => sellStock(draft, key, amount))}
              >
                ขายทั้งหมด
              </button>
              {crop ? (
                <button
                  type="button"
                  className="farm-pill"
                  onClick={() => onAct((draft) => depositFood(draft, key, amount))}
                >
                  เก็บเป็นอาหาร {withCommas(amount * FOOD_PER_PRODUCE)} กก.
                </button>
              ) : null}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/** กล่องรหัสฟาร์ม เปิดปิดได้ ไม่กินที่ตอนไม่ได้ใช้ */
function FarmCodeBox({ farm }: { farm: FarmState }) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const code = encodeFarm(farm)

  return (
    <div className="min-w-0 flex-1">
      <button
        type="button"
        className="text-sm text-slate-400 underline hover:text-slate-200"
        onClick={() => setOpen((current) => !current)}
      >
        {open ? 'ซ่อนรหัสฟาร์ม' : '🔑 รหัสฟาร์ม (สำหรับย้ายเครื่อง)'}
      </button>
      {open ? (
        <div className="mt-2">
          <code className="block break-all rounded-lg border border-white/10 bg-night-900/80 p-2 text-xs text-leaf-300">
            {code}
          </code>
          <button
            type="button"
            className="mt-2 text-xs text-slate-400 underline hover:text-slate-200"
            onClick={() => {
              /*
               * คัดลอกอาจถูกเบราว์เซอร์ปฏิเสธ เช่นหน้าไม่ได้เปิดผ่าน https
               * จึงต้องมีข้อความบอกให้เลือกเองด้วย ไม่ใช่กดแล้วเงียบไป
               */
              navigator.clipboard
                ?.writeText(code)
                .then(() => setCopied(true))
                .catch(() => setCopied(false))
            }}
          >
            {copied ? '✅ คัดลอกแล้ว' : 'คัดลอกรหัส (หรือลากเลือกข้อความเอง)'}
          </button>
        </div>
      ) : null}
    </div>
  )
}

/* ------------------------------------------------------------------ *
 * สมุดบัญชี
 * ------------------------------------------------------------------ */

function LedgerScreen({
  farm,
  plan,
  rows,
  resultCode,
  onRecord,
  onFinish,
}: {
  farm: FarmState
  plan: DayPlan
  rows: LedgerRow[]
  /** รหัสผลการเรียนที่รวมข้อของวันนี้แล้ว ใช้ให้เด็กส่งครูตอนหมดคาบ */
  resultCode: string
  onRecord: (row: LedgerRow, isCorrect: boolean) => void
  onFinish: (perfect: boolean) => void
}) {
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [solved, setSolved] = useState<Record<string, boolean>>({})
  const [missed, setMissed] = useState<Record<string, boolean>>({})
  const [picks, setPicks] = useState<Record<string, BuilderPick>>({})

  const allSolved = rows.every((row) => solved[row.id])
  const perfect = allSolved && rows.every((row) => !missed[row.id])

  const checkRow = useCallback(
    (row: LedgerRow) => {
      /*
       * แถวสร้างโจทย์เองไม่มีคำตอบตายตัวใน fields
       * เพราะคำตอบขึ้นกับโจทย์ที่เด็กประกอบขึ้นเอง จึงต้องคิดตอนนี้
       */
      const expected = builderExpected(row, picks[row.id])
      const correct =
        expected !== null
          ? readNumber(answers[`${row.id}:answer`] ?? '') === expected
          : row.fields.every(
              (field) => readNumber(answers[`${row.id}:${field.key}`] ?? '') === field.answer,
            )
      onRecord(row, correct && !missed[row.id])
      playSfx(correct ? 'correct' : 'wrong')
      if (correct) setSolved((current) => ({ ...current, [row.id]: true }))
      else setMissed((current) => ({ ...current, [row.id]: true }))
    },
    [answers, missed, onRecord, picks],
  )

  return (
    <>
      <div className="farm-terminal p-5 sm:p-6">
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-leaf-400">
          สรุปงานประจำวัน
        </p>
        <h2 className="mt-1 text-xl font-black text-white sm:text-2xl">
          สมุดบัญชีฟาร์ม วันที่ {farm.day}
        </h2>
        <p className="mt-2 text-sm text-slate-300">
          กรอกตัวเลขให้ครบ แล้ววันใหม่จะเริ่ม
          ตัวเลขเหล่านี้คือของจริงในฟาร์มของหนู ไม่ใช่โจทย์ที่ตั้งขึ้นมาลอย ๆ
        </p>
        {rows.length === 0 ? (
          <p className="mt-3 text-sm text-gold-300">
            วันนี้ไม่มีอะไรต้องสรุป ปิดวันได้เลย
          </p>
        ) : null}
      </div>

      <div className="mt-4 space-y-3">
        {rows.map((row, position) => (
          <LedgerRowCard
            key={row.id}
            row={row}
            index={position + 1}
            answers={answers}
            solved={solved[row.id] === true}
            missed={missed[row.id] === true}
            pick={picks[row.id]}
            onPick={(slot, key) =>
              setPicks((current) => ({
                ...current,
                [row.id]: { ...current[row.id], [slot]: key },
              }))
            }
            onChange={(key, value) =>
              setAnswers((current) => ({ ...current, [key]: value }))
            }
            onCheck={() => checkRow(row)}
          />
        ))}
      </div>

      {allSolved ? (
        <div className="panel mt-4 p-5">
          <p className="text-sm font-black text-white">
            {perfect ? '⭐ ปิดบัญชีถูกทุกช่องตั้งแต่ครั้งแรก' : 'ปิดบัญชีครบแล้ว'}
          </p>
          <p className="mt-1 text-sm text-slate-300">
            {perfect
              ? `พรุ่งนี้ได้แรงเพิ่มเป็นรางวัล เพราะวางแผนล่วงหน้าได้แม่นยำ`
              : 'ไม่เป็นไร ตัวเลขที่เกมใช้คือตัวเลขที่ถูกเสมอ ฟาร์มไม่เสียหายจากการคิดผิด'}
          </p>
          {plan.harvests.length > 0 ? (
            <p className="mt-2 text-sm text-leaf-300">
              วันนี้เก็บเกี่ยวได้{' '}
              {plan.cropYield
                .map((entry) => `${findCrop(entry.crop).name} ${withCommas(entry.count)} ต้น`)
                .join(' · ')}
            </p>
          ) : null}
          <Button className="mt-4" size="lg" fullWidth icon="🌅" onClick={() => onFinish(perfect)}>
            เริ่มวันที่ {farm.day + 1}
          </Button>
        </div>
      ) : null}

      {allSolved ? (
        <div className="mt-4">
          <ResultCodeCard
            code={resultCode}
            hint="ถ้าหมดคาบแล้ว ส่งรหัสบรรทัดนี้ให้คุณครู · คนละรหัสกับรหัสฟาร์ม รหัสนี้บอกคุณครูว่าหนูทำตัวชี้วัดไหนได้แล้ว ส่วนรหัสฟาร์มไว้ย้ายฟาร์มข้ามเครื่อง"
          />
        </div>
      ) : null}
    </>
  )
}

/** ตัวเลือกที่เด็กเลือกไว้ในแถวสร้างโจทย์เอง ยังไม่เลือกคือ undefined */
interface BuilderPick {
  sell?: string
  spend?: string
}

/** หาตัวเลือกที่เด็กเลือกไว้จริง คืน null เมื่อยังเลือกไม่ครบ */
function pickedOptions(
  builder: BuilderSpec,
  pick: BuilderPick | undefined,
): { sell: BuilderSpec['sell'][number]; spend: BuilderSpec['spend'][number] } | null {
  const sell = builder.sell.find((option) => option.key === pick?.sell)
  const spend = builder.spend.find((option) => option.key === pick?.spend)
  return sell && spend ? { sell, spend } : null
}

/**
 * คำตอบที่ถูกต้องของแถวสร้างโจทย์เอง
 *
 * คืน null เมื่อไม่ใช่แถวชนิดนี้ หรือเมื่อเด็กยังเลือกไม่ครบ
 * ผู้เรียกใช้ null เป็นสัญญาณว่าให้กลับไปตรวจแบบแถวธรรมดาแทน
 */
function builderExpected(row: LedgerRow, pick: BuilderPick | undefined): number | null {
  if (!row.builder) return null
  const chosen = pickedOptions(row.builder, pick)
  if (!chosen) return null
  return builderAnswer(row.builder, chosen.sell.value, chosen.spend.value)
}

function LedgerRowCard({
  row,
  index,
  answers,
  solved,
  missed,
  pick,
  onPick,
  onChange,
  onCheck,
}: {
  row: LedgerRow
  index: number
  answers: Record<string, string>
  solved: boolean
  missed: boolean
  pick: BuilderPick | undefined
  onPick: (slot: keyof BuilderPick, key: string) => void
  onChange: (key: string, value: string) => void
  onCheck: () => void
}) {
  const chosen = row.builder ? pickedOptions(row.builder, pick) : null
  const ready = row.builder
    ? chosen !== null && readNumber(answers[`${row.id}:answer`] ?? '') !== null
    : row.fields.every(
        (field) => readNumber(answers[`${row.id}:${field.key}`] ?? '') !== null,
      )

  return (
    <div className={`farm-ledger-row ${solved ? 'farm-ledger-done' : ''}`}>
      <div className="flex items-start gap-3">
        <span className="farm-ledger-num">{index}</span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold uppercase tracking-widest text-leaf-400">
            {row.skill}
          </p>
          <p className="mt-1 text-sm leading-relaxed text-white sm:text-base">{row.prompt}</p>
        </div>
      </div>

      {row.builder ? (
        <BuilderPanel
          builder={row.builder}
          pick={pick}
          disabled={solved}
          answer={answers[`${row.id}:answer`] ?? ''}
          onPick={onPick}
          onChange={(value) => onChange(`${row.id}:answer`, value)}
        />
      ) : null}

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {row.fields.map((field) => {
          const key = `${row.id}:${field.key}`
          return (
            <label key={key} className="block">
              <span className="text-xs font-bold text-slate-400">{field.label}</span>
              <span className="mt-1 flex items-center gap-2">
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  disabled={solved}
                  value={answers[key] ?? ''}
                  onChange={(event) =>
                    onChange(key, event.target.value.replace(/[^0-9]/g, ''))
                  }
                  placeholder="พิมพ์ตัวเลข"
                  className="min-w-0 flex-1 rounded-xl border border-leaf-400/40 bg-night-900/80 px-3 py-2.5 text-center text-xl font-black tabular-nums text-white placeholder:text-sm placeholder:font-normal placeholder:text-slate-600 disabled:opacity-70"
                />
                <span className="text-sm text-slate-400">{field.unit}</span>
              </span>
            </label>
          )
        })}
      </div>

      {solved ? (
        <p className="mt-3 text-sm font-bold text-leaf-400">✅ ถูกต้อง</p>
      ) : (
        <Button className="mt-3" disabled={!ready} onClick={onCheck}>
          ตรวจ
        </Button>
      )}

      {/*
        วิธีคิดโผล่หลังตอบผิดเท่านั้น ไม่ใช่โชว์ไว้ตั้งแต่ต้น
        และไม่หายไปหลังตอบถูก เพราะเด็กที่เพิ่งเข้าใจควรได้ทวนซ้ำอีกรอบ
      */}
      {missed ? (
        <div className="mt-3 space-y-1 rounded-xl border border-cyan-400/30 bg-cyan-500/10 p-3 text-sm text-slate-200">
          <p className="text-xs font-bold uppercase tracking-widest text-cyan-300">วิธีคิด</p>
          {/*
            แถวสร้างโจทย์เองต้องแสดงวิธีคิดด้วยตัวเลขที่เด็กเลือกเอง
            ไม่ใช่ข้อความกลาง ๆ ที่เขียนไว้ล่วงหน้า เพราะโจทย์ของเด็กแต่ละคนไม่เหมือนกัน
            และประโยชน์ทั้งหมดของการเฉลย อยู่ที่การได้เห็นตัวเลขของตัวเองเดินทีละขั้น
          */}
          {(row.builder && chosen
            ? [
                `ขั้นที่ 1 · ${withCommas(row.builder.coins)} + ${withCommas(chosen.sell.value)} = ${withCommas(row.builder.coins + chosen.sell.value)}`,
                `ขั้นที่ 2 · ${withCommas(row.builder.coins + chosen.sell.value)} − ${withCommas(chosen.spend.value)} = ${withCommas(builderAnswer(row.builder, chosen.sell.value, chosen.spend.value))}`,
              ]
            : row.working
          ).map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
      ) : null}
    </div>
  )
}

/**
 * แผงเลือกตัวเลือกสำหรับแถวสร้างโจทย์เอง ตามตัวชี้วัด ป.4/12
 *
 * ตัวเลือกแสดงเป็นเรื่องราวพร้อมตัวเลขกำกับ ไม่ใช่ตัวเลขเปล่า ๆ
 * เพราะตัวชี้วัดข้อนี้คือการสร้าง "โจทย์ปัญหา" ไม่ใช่การสร้างประโยคคำนวณ
 * เด็กที่เลือกว่าจะขายไข่แล้วเอาเงินไปเปิดแปลงใหม่ กำลังแต่งเรื่องของตัวเอง
 * ซึ่งเป็นสิ่งที่ตัวชี้วัดต้องการ ส่วนการบวกลบเป็นขั้นถัดไป
 *
 * เมื่อเลือกครบทั้งสองช่อง โจทย์ที่เด็กแต่งจะถูกเขียนกลับมาเป็นประโยคเต็ม
 * ให้เด็กได้อ่านโจทย์ของตัวเองก่อนตอบ ซึ่งเป็นครึ่งหนึ่งของตัวชี้วัดข้อนี้
 */
function BuilderPanel({
  builder,
  pick,
  disabled,
  answer,
  onPick,
  onChange,
}: {
  builder: BuilderSpec
  pick: BuilderPick | undefined
  disabled: boolean
  answer: string
  onPick: (slot: keyof BuilderPick, key: string) => void
  onChange: (value: string) => void
}) {
  const chosen = pickedOptions(builder, pick)

  const slots: { slot: keyof BuilderPick; title: string; options: BuilderSpec['sell'] }[] = [
    { slot: 'sell', title: 'ช่องที่ 1 · วันนี้จะขายอะไร', options: builder.sell },
    { slot: 'spend', title: 'ช่องที่ 2 · จะเอาเงินไปซื้ออะไร', options: builder.spend },
  ]

  return (
    <div className="mt-3 space-y-3">
      {slots.map((group) => (
        <div key={group.slot}>
          <p className="text-xs font-bold text-slate-400">{group.title}</p>
          <div className="mt-1.5 grid gap-2 sm:grid-cols-2">
            {group.options.map((option) => {
              const picked = pick?.[group.slot] === option.key
              return (
                <button
                  key={option.key}
                  type="button"
                  disabled={disabled}
                  aria-pressed={picked}
                  onClick={() => onPick(group.slot, option.key)}
                  className={`btn-3d rounded-xl border p-2.5 text-left text-sm font-semibold transition-colors disabled:opacity-70 ${
                    picked
                      ? 'border-leaf-400/70 bg-leaf-500/20 text-leaf-300'
                      : 'border-white/10 bg-white/5 text-slate-200 hover:bg-white/10'
                  }`}
                >
                  <span className="block">{option.label}</span>
                  <span className="block text-xs font-black tabular-nums text-gold-300">
                    {withCommas(option.value)} บาท
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      ))}

      {chosen ? (
        <div className="rounded-xl border border-cyan-400/30 bg-cyan-500/10 p-3">
          <p className="text-xs font-bold uppercase tracking-widest text-cyan-300">
            โจทย์ที่หนูสร้างเอง
          </p>
          <p className="mt-1 text-sm leading-relaxed text-white">
            โดมมีเงิน {withCommas(builder.coins)} บาท แล้ว{chosen.sell.label} ได้เงินเพิ่ม{' '}
            {withCommas(chosen.sell.value)} บาท จากนั้น{chosen.spend.label} ราคา{' '}
            {withCommas(chosen.spend.value)} บาท สุดท้ายจะเหลือเงินกี่บาท
          </p>
          <label className="mt-2 block">
            <span className="text-xs font-bold text-slate-400">คำตอบของโจทย์ที่หนูสร้าง</span>
            <span className="mt-1 flex items-center gap-2">
              <input
                type="text"
                inputMode="numeric"
                autoComplete="off"
                disabled={disabled}
                value={answer}
                onChange={(event) => onChange(event.target.value.replace(/[^0-9]/g, ''))}
                placeholder="พิมพ์ตัวเลข"
                className="min-w-0 flex-1 rounded-xl border border-leaf-400/40 bg-night-900/80 px-3 py-2.5 text-center text-xl font-black tabular-nums text-white placeholder:text-sm placeholder:font-normal placeholder:text-slate-600 disabled:opacity-70"
              />
              <span className="text-sm text-slate-400">บาท</span>
            </span>
          </label>
        </div>
      ) : (
        <p className="text-sm text-slate-400">
          เลือกให้ครบทั้งสองช่อง แล้วโจทย์ของหนูจะขึ้นมาให้อ่าน
        </p>
      )}
    </div>
  )
}
