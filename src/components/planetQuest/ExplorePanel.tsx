import { useState } from 'react'
import type { ChangeEvent, ReactNode } from 'react'
import { Button } from '../Button'
import { playSfx } from '../../services/audioService'
import { buddyFor, buddyStatus, pokeLine, sleepyLine, wakeLine } from '../../planetQuest/buddies'
import type { BuddyStatus } from '../../planetQuest/buddies'
import type { CompanionId, JourneyStats } from '../../planetQuest/companions'
import type { ShipColorId } from '../../planetQuest/ship'
import { PLANETS, formatNumber, getPlanet } from '../../solar/planets'
import type { Planet, PlanetId } from '../../solar/planets'
import { Bubble, PlanetBuddy, PokeButton } from './Buddy'
import type { PokeState } from './Buddy'
import { EclipseSandbox } from './EclipseLab'
import { ShipWorkshop, SouvenirAlbum } from './ExploreToys'

/**
 * โหมดสำรวจ · บินเที่ยวรอบระบบสุริยะแบบไม่มีโจทย์
 *
 * ทุกอย่างในโหมดนี้คือของเล่น ไม่มีถูกผิด ไม่มีคะแนน
 * ของเล่นที่เลือกมาเป็นคำถามที่เด็กชอบถามเองอยู่แล้ว คือ
 * "ถ้าไปอยู่ดาวนั้นจะหนักเท่าไร" "จะอายุกี่ขวบ" และ "ร้อนแค่ไหน"
 * คำตอบทุกข้อคำนวณจากข้อมูลจริงชุดเดียวกับเกมยานสำรวจระบบสุริยะ
 */

/** ความร้อนหนาวที่เด็กนึกภาพออก เทียบกับของรอบตัว */
function temperatureFeel(planet: Planet): { icon: string; text: string } {
  const temp = planet.meanTempC
  if (temp > 400) return { icon: '🔥', text: 'ร้อนจนตะกั่วละลายได้' }
  if (temp > 100) return { icon: '♨️', text: 'ร้อนกว่าน้ำเดือด' }
  if (temp > 0) return { icon: '🌤️', text: 'กำลังสบาย' }
  if (temp > -100) return { icon: '🥶', text: 'หนาวพอ ๆ กับฤดูหนาวที่ขั้วโลกใต้' }
  return { icon: '❄️', text: 'หนาวกว่าช่องแช่แข็งในตู้เย็นมาก' }
}

function dayLength(planet: Planet): string {
  const hours = Math.abs(planet.spinHours)
  if (hours > 48) return `${formatNumber(Math.round(hours / 24))} วันของโลก`
  return `${formatNumber(Math.round(hours))} ชั่วโมง`
}

/**
 * น้ำหนักกับอายุเก็บไว้ที่แผงสำรวจ ไม่ได้เก็บในโปสการ์ด
 * เปลี่ยนดาวแล้วค่าเดิมยังอยู่ เด็กจึงกดสลับดาวไปมาเพื่อเทียบกันได้ทันที
 */
function Postcard({
  planet,
  status,
  justWoke,
  poke,
  reduceMotion,
  weight,
  age,
  onWeight,
  onAge,
  onPoke,
}: {
  planet: Planet
  status: BuddyStatus
  justWoke: boolean
  poke: PokeState | null
  reduceMotion: boolean
  weight: number
  age: number
  onWeight: (value: number) => void
  onAge: (value: number) => void
  onPoke: () => void
}) {
  const weightHere = Math.round((weight * planet.gravityTenths) / 10)
  const ageHere = (age * 365.25) / planet.orbitDays
  const feel = temperatureFeel(planet)
  const buddy = buddyFor(planet.id)
  const poked = poke?.id === planet.id ? poke : null

  return (
    <div className="sol-panel p-4 sm:p-5">
      <div className="flex items-center gap-3">
        <PokeButton label={`จิ้ม${buddy.nickname}`} count={poked?.count ?? 0} reduceMotion={reduceMotion} onPoke={onPoke}>
          <PlanetBuddy
            planet={planet}
            size={72}
            mood={status === 'sleep' ? 'sleep' : poked ? 'love' : justWoke ? 'wow' : 'happy'}
            crown={status === 'star'}
            animate={!reduceMotion}
            className={reduceMotion ? '' : 'pq-bob'}
          />
        </PokeButton>
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-300">โปสการ์ดจากอวกาศ</p>
          <h3 className="text-2xl font-black text-white">{planet.name}</h3>
        </div>
      </div>
      <Bubble tail="top" className="mt-3">
        <span className="text-xs font-bold text-slate-500">{buddy.nickname}</span>
        <span className="block text-sm font-black">
          {poked
            ? pokeLine(planet.id, poked.count, status === 'sleep').text
            : status === 'sleep'
              ? sleepyLine(buddy)
              : justWoke
                ? wakeLine(buddy)
                : buddy.intro}
        </span>
      </Bubble>
      <p className="mt-3 text-base text-slate-100">✨ {planet.facts[0]}</p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="pq-toy">
          <span className="text-sm font-bold text-slate-300">🏋️ ถ้าบนโลกหนูหนัก {weight} กก.</span>
          <input
            type="range"
            min={15}
            max={80}
            value={weight}
            onChange={(event: ChangeEvent<HTMLInputElement>) => onWeight(Number(event.target.value))}
            className="pq-range"
            aria-label="น้ำหนักบนโลก กิโลกรัม"
          />
          <span className="text-lg font-black text-white">
            บน{planet.name}ตาชั่งอ่านได้ <span className="text-gold-300">{weightHere} กก.</span>
          </span>
        </label>

        <label className="pq-toy">
          <span className="text-sm font-bold text-slate-300">🎂 ถ้าหนูอายุ {age} ปีบนโลก</span>
          <input
            type="range"
            min={6}
            max={15}
            value={age}
            onChange={(event: ChangeEvent<HTMLInputElement>) => onAge(Number(event.target.value))}
            className="pq-range"
            aria-label="อายุบนโลก ปี"
          />
          <span className="text-lg font-black text-white">
            บน{planet.name}จะอายุ{' '}
            <span className="text-gold-300">{ageHere < 1 ? `ยังไม่ถึง 1 ขวบ (${ageHere.toFixed(2)} ปี)` : `${ageHere.toFixed(1)} ปี`}</span>
          </span>
        </label>

        <div className="pq-toy">
          <span className="text-sm font-bold text-slate-300">{feel.icon} อากาศเป็นอย่างไร</span>
          <span className="text-lg font-black text-white">
            เฉลี่ย {formatNumber(planet.meanTempC)} °C · {feel.text}
          </span>
        </div>

        <div className="pq-toy">
          <span className="text-sm font-bold text-slate-300">⏰ หนึ่งวันยาวแค่ไหน</span>
          <span className="text-lg font-black text-white">หมุนรอบตัวเองหนึ่งรอบใช้ {dayLength(planet)}</span>
        </div>
      </div>
    </div>
  )
}

/** กล่องของเล่นพิเศษหนึ่งกล่อง เปิดดูได้ทีละกล่องหรือพร้อมกันก็ได้ */
function ToyBox({
  title,
  note,
  open,
  openLabel,
  closeLabel,
  onToggle,
  children,
}: {
  title: string
  note: string
  open: boolean
  openLabel: string
  closeLabel: string
  onToggle: () => void
  children: ReactNode
}) {
  return (
    <div className="sol-comms p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-300">ของเล่นพิเศษ</p>
          <p className="text-lg font-black text-white">{title}</p>
        </div>
        <Button
          variant={open ? 'ghost' : 'secondary'}
          onClick={() => {
            playSfx('click')
            onToggle()
          }}
        >
          {open ? closeLabel : openLabel}
        </Button>
      </div>
      {open ? <div className="mt-3">{children}</div> : <p className="mt-1 text-sm text-slate-300">{note}</p>}
    </div>
  )
}

export function ExplorePanel({
  selected,
  shipAt,
  flying,
  visited,
  best,
  status,
  justWoke,
  poke,
  shipColor,
  companion,
  stats,
  reduceMotion,
  onSelect,
  onFly,
  onPoke,
  onShip,
}: {
  selected: PlanetId
  shipAt: PlanetId
  flying: boolean
  visited: readonly PlanetId[]
  /** เพื่อนดาวของดาวที่เลือกยังหลับ ตื่นแล้ว หรือได้สามดาวแล้ว */
  status: BuddyStatus
  /** ดาวที่ได้ในโหมดฝึกฝน ใช้วาดมงกุฎบนโปสการ์ดในสมุด */
  best: Partial<Record<PlanetId, number>>
  /** ดาวที่เลือกเพิ่งถูกปลุกจากการบินมาถึงครั้งนี้ */
  justWoke: boolean
  poke: PokeState | null
  shipColor: ShipColorId
  companion: CompanionId
  stats: JourneyStats
  reduceMotion: boolean
  onSelect: (id: PlanetId) => void
  onFly: (id: PlanetId) => void
  onPoke: (id: PlanetId) => void
  onShip: (change: { color?: ShipColorId; companion?: CompanionId }) => void
}) {
  const [sandbox, setSandbox] = useState(false)
  const [album, setAlbum] = useState(false)
  const [workshop, setWorkshop] = useState(false)
  const [weight, setWeight] = useState(35)
  const [age, setAge] = useState(11)
  const planet = getPlanet(selected)

  return (
    <section className="mt-4 space-y-3">
      <nav aria-label="เลือกดาว">
        <ul className="flex gap-2 overflow-x-auto pb-1">
          {PLANETS.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                aria-pressed={selected === item.id}
                onClick={() => onSelect(item.id)}
                className={`sol-chip ${selected === item.id ? 'sol-chip-on' : ''}`}
              >
                <PlanetBuddy
                  planet={item}
                  size={26}
                  mood={buddyStatus(item.id, undefined, visited) === 'sleep' ? 'sleep' : 'happy'}
                  animate={false}
                />
                <span>{item.name}</span>
                {visited.includes(item.id) ? <span aria-label="เคยไปเที่ยวแล้ว">📸</span> : null}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <div className="flex flex-wrap items-center gap-3">
        <Button
          size="lg"
          icon={selected === shipAt ? '📍' : '🚀'}
          disabled={flying || selected === shipAt}
          onClick={() => onFly(selected)}
          silent
        >
          {flying ? 'กำลังบิน…' : selected === shipAt ? `ยานจอดอยู่ที่${planet.name}` : `บินไปเที่ยว${planet.name}`}
        </Button>
        <span className="text-sm font-bold text-slate-300">
          📸 ของที่ระลึก {visited.length}/{PLANETS.length} ดาว
        </span>
      </div>

      <Postcard
        planet={planet}
        status={status}
        justWoke={justWoke}
        poke={poke}
        reduceMotion={reduceMotion}
        weight={weight}
        age={age}
        onWeight={setWeight}
        onAge={setAge}
        onPoke={() => onPoke(selected)}
      />

      <ToyBox
        title="📒 สมุดของที่ระลึก"
        note="โปสการ์ดของดาวทุกดวงที่ไปเยี่ยมแล้ว แตะพลิกดูความลับของแต่ละดาว"
        open={album}
        openLabel="เปิดสมุด"
        closeLabel="ปิดสมุด"
        onToggle={() => setAlbum((value) => !value)}
      >
        <SouvenirAlbum visited={visited} best={best} reduceMotion={reduceMotion} />
      </ToyBox>

      <ToyBox
        title="🛠️ อู่ต่อยาน"
        note="เลือกสียาน และชวนเพื่อนร่วมทางมอนสเตอร์อวกาศขึ้นยานไปด้วยกัน"
        open={workshop}
        openLabel="เข้าอู่ต่อยาน"
        closeLabel="ออกจากอู่"
        onToggle={() => setWorkshop((value) => !value)}
      >
        <ShipWorkshop color={shipColor} companion={companion} stats={stats} reduceMotion={reduceMotion} onChange={onShip} />
      </ToyBox>

      <ToyBox
        title="🌒 ห้องทดลองอุปราคา · เล่นอิสระ"
        note="หมุนดวงจันทร์ไปรอบโลก แล้วดูว่าเมื่อไรจะเกิดสุริยุปราคาและจันทรุปราคา"
        open={sandbox}
        openLabel="เปิดห้องทดลอง"
        closeLabel="ปิดห้องทดลอง"
        onToggle={() => setSandbox((value) => !value)}
      >
        <EclipseSandbox reduceMotion={reduceMotion} />
      </ToyBox>
    </section>
  )
}
