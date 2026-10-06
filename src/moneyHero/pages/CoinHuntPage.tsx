import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Camera, CameraOff } from 'lucide-react'
import type { DenomId } from '../engine/types'
import { useGame } from '../hooks/useMoneyGame'
import { HUNT_LEVELS, HUNT_REWARD, HUNT_ROUNDS, checkHunt, makeRound, type HuntCheck, type HuntRound } from '../engine/coinHunt'
import { formatBS } from '../utils/money'
import { denom } from '../data/denominations'
import { playSound } from '../utils/sound'
import { speak } from '../utils/speech'
import { AvatarArt, CharacterArt, MoneyPiece } from '../components/Art'
import { Confetti } from '../components/Effects'
import { Hills } from '../components/Sky'
import { Bunting } from '../components/Bunting'
import { Stars } from '../components/Stars'

/**
 * มินิเกม AR ล่าเหรียญ
 *
 * เปิดกล้องหลังของแท็บเล็ต/มือถือ เหรียญและธนบัตรจะลอยอยู่บนภาพจริงรอบตัว
 * ถ้าไม่มีกล้องหรือไม่อนุญาต ก็เล่นบนฉากการ์ดตลาดได้เหมือนกันทุกอย่าง
 * ภาพจากกล้องแสดงในเครื่องเท่านั้น ไม่บันทึก ไม่ส่งไปที่ไหน
 *
 * เส้นทาง #/ar
 */

declare global {
  interface Window {
    __MH_AR?: { round: number; target: number; solution: number[] }
  }
}

/** ตำแหน่งและจังหวะลอยของแต่ละชิ้น (สุ่มครั้งเดียวต่อรอบ) */
interface Floater {
  id: DenomId
  x: number
  y: number
  dur: number
  delay: number
}

function layout(spawns: DenomId[]): Floater[] {
  // วางเป็นตารางหลวม ๆ แล้วเขย่าเล็กน้อย ชิ้นจะได้ไม่ทับกันจนแตะไม่ได้
  const cols = spawns.length > 8 ? 4 : 3
  const rows = Math.ceil(spawns.length / cols)
  const slots = Array.from({ length: cols * rows }, (_, i) => i).sort(() => Math.random() - 0.5)
  return spawns.map((id, i) => {
    const slot = slots[i]
    const c = slot % cols
    const r = Math.floor(slot / cols)
    return {
      id,
      x: ((c + 0.5) / cols) * 100 + (Math.random() - 0.5) * (24 / cols),
      y: ((r + 0.5) / rows) * 100 + (Math.random() - 0.5) * (20 / rows),
      dur: 3.2 + Math.random() * 2.4,
      delay: -Math.random() * 3,
    }
  })
}

type CamState = 'off' | 'starting' | 'on' | 'denied'

export function CoinHuntPage() {
  const { player, updatePlayer } = useGame()
  const [phase, setPhase] = useState<'intro' | 'play' | 'done'>('intro')
  const [roundNo, setRoundNo] = useState(0)
  const [round, setRound] = useState<HuntRound>(() => makeRound(0))
  const floaters = useMemo(() => layout(round.spawns), [round])
  const [picked, setPicked] = useState<number[]>([])
  const [result, setResult] = useState<HuntCheck | null>(null)
  const [cleared, setCleared] = useState(0)
  const [cam, setCam] = useState<CamState>('off')
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
  }, [])

  // ปิดกล้องเสมอเมื่อออกจากหน้านี้
  useEffect(() => stopCamera, [stopCamera])

  useEffect(() => {
    if (phase === 'play') window.__MH_AR = { round: roundNo, target: round.target, solution: round.solution }
    else window.__MH_AR = undefined
    return () => {
      window.__MH_AR = undefined
    }
  }, [phase, round, roundNo])

  const startCamera = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCam('denied')
      return
    }
    setCam('starting')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false })
      streamRef.current = stream
      setCam('on')
      setPhase('play')
    } catch {
      setCam('denied')
    }
  }

  // ต่อภาพกล้องเข้ากับ <video> เมื่อหน้าเล่นแสดงแล้ว
  useEffect(() => {
    if (cam === 'on' && phase === 'play' && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current
      videoRef.current.play().catch(() => undefined)
    }
  }, [cam, phase])

  const pickedIds = picked.map((i) => round.spawns[i])
  const sum = checkHunt(round.target, pickedIds).total

  const grab = (i: number) => {
    if (result?.ok || picked.includes(i)) return
    playSound('coin')
    setResult(null)
    setPicked((p) => [...p, i])
  }

  const giveBack = (i: number) => {
    if (result?.ok) return
    playSound('click')
    setResult(null)
    setPicked((p) => p.filter((x) => x !== i))
  }

  const check = () => {
    const r = checkHunt(round.target, pickedIds)
    setResult(r)
    if (r.ok) {
      playSound('correct')
      setCleared((n) => n + 1)
      updatePlayer((p) => ({ ...p, exp: p.exp + HUNT_REWARD.exp, coins: p.coins + HUNT_REWARD.coins }))
    } else {
      playSound('wrong')
    }
    speak(r.message)
  }

  const next = () => {
    playSound('click')
    if (roundNo + 1 >= HUNT_ROUNDS) {
      setPhase('done')
      stopCamera()
      playSound('complete')
      updatePlayer((p) => p, cleared >= HUNT_ROUNDS ? ['ar-hunter'] : [])
      return
    }
    const n = roundNo + 1
    setRoundNo(n)
    setRound(makeRound(n))
    setPicked([])
    setResult(null)
  }

  const restart = () => {
    setRoundNo(0)
    setRound(makeRound(0))
    setPicked([])
    setResult(null)
    setCleared(0)
    setPhase('intro')
  }

  if (!player) return null

  return (
    <div className={`mh-ar ${cam === 'on' && phase === 'play' ? 'is-camera' : ''}`} data-testid="mh-ar">
      {/* ฉากหลัง: ภาพจากกล้อง หรือฉากตลาดการ์ตูน */}
      {cam === 'on' && phase === 'play' ? (
        <video ref={videoRef} className="mh-ar-video" playsInline muted autoPlay aria-hidden="true" />
      ) : (
        <div className="mh-ar-scene" aria-hidden="true">
          <Bunting count={16} className="mh-ar-bunting" />
          <div className="mh-ar-hills">
            <Hills />
          </div>
        </div>
      )}

      <div className="mh-ar-top">
        <Link to="/map" className="mh-icon-btn" aria-label="กลับแผนที่" onClick={stopCamera}>
          <ArrowLeft size={24} />
        </Link>
        <div className="mh-ar-title">📷 ล่าเหรียญ AR</div>
        {phase === 'play' && (
          <span className="mh-ar-round" data-testid="mh-ar-round">
            รอบ {roundNo + 1}/{HUNT_ROUNDS} · {HUNT_LEVELS[roundNo].name}
          </span>
        )}
      </div>

      {phase === 'intro' && (
        <div className="mh-card mh-ar-intro mh-center" data-testid="mh-ar-intro">
          <CharacterArt id="rabbit" size={100} mood="happy" />
          <h1 className="mh-step-title">ล่าเหรียญรอบตัวเรา!</h1>
          <p>เหรียญและธนบัตรจะลอยอยู่รอบตัว แตะเก็บให้ได้จำนวนเงิน <b>พอดี</b> ตามโจทย์ มีทั้งหมด {HUNT_ROUNDS} รอบ</p>
          <p className="mh-soft">ภาพจากกล้องแสดงบนเครื่องนี้เท่านั้น ไม่มีการบันทึกหรือส่งไปที่ไหน</p>
          <div className="mh-row-buttons">
            <button type="button" className="mh-btn mh-btn-gold mh-btn-xl" onClick={startCamera} disabled={cam === 'starting'} data-testid="mh-ar-camera">
              <Camera size={26} /> {cam === 'starting' ? 'กำลังเปิดกล้อง…' : 'เปิดกล้องเล่น AR'}
            </button>
            <button
              type="button"
              className="mh-btn mh-btn-soft"
              onClick={() => {
                playSound('click')
                setPhase('play')
              }}
              data-testid="mh-ar-play"
            >
              <CameraOff size={22} /> เล่นแบบไม่ใช้กล้อง
            </button>
          </div>
          {cam === 'denied' && <p className="mh-ar-note">เปิดกล้องไม่ได้ ไม่เป็นไรนะ กด "เล่นแบบไม่ใช้กล้อง" ได้เลย</p>}
        </div>
      )}

      {phase === 'play' && (
        <>
          <div className="mh-ar-arena" aria-label="เงินที่ลอยอยู่">
            {floaters.map((f, i) =>
              picked.includes(i) ? null : (
                <button
                  key={`${round.round}-${i}`}
                  type="button"
                  className={`mh-ar-float is-${denom(f.id).kind}`}
                  style={{ left: `${f.x}%`, top: `${f.y}%`, '--dur': `${f.dur}s`, '--delay': `${f.delay}s` } as CSSProperties}
                  onClick={() => grab(i)}
                  data-testid={`mh-ar-coin-${i}`}
                >
                  <MoneyPiece id={f.id} base={56} />
                </button>
              ),
            )}
          </div>

          <div className="mh-card mh-ar-hud">
            <div className="mh-ar-goal">
              <span>🎯 เก็บให้ได้</span>
              <b data-testid="mh-ar-target">{formatBS(round.target)}</b>
              <span className="mh-ar-now">
                เก็บแล้ว <b>{formatBS(sum)}</b>
              </span>
            </div>
            <div className="mh-ar-wallet" aria-label="เงินที่เก็บแล้ว แตะเพื่อคืน">
              {picked.length === 0 && <span className="mh-soft">แตะเงินที่ลอยอยู่เพื่อเก็บ 👆</span>}
              {picked.map((i) => (
                <button key={i} type="button" className="mh-ar-chip" onClick={() => giveBack(i)} aria-label="คืนเงินชิ้นนี้">
                  <MoneyPiece id={round.spawns[i]} base={34} />
                </button>
              ))}
            </div>
            {result && (
              <div className={`mh-ar-result ${result.ok ? 'is-ok' : 'is-off'}`} data-testid={result.ok ? 'mh-ar-right' : 'mh-ar-wrong'} role="status">
                {result.ok ? <AvatarArt avatar={player.avatar} size={52} mood="happy" /> : <CharacterArt id="fox" size={48} mood="think" />}
                <span>
                  {result.message}
                  {result.ok && (
                    <b>
                      {' '}
                      +{HUNT_REWARD.exp} EXP · +{HUNT_REWARD.coins} 🪙
                    </b>
                  )}
                </span>
              </div>
            )}
            <div className="mh-row-buttons">
              {result?.ok ? (
                <button type="button" className="mh-btn mh-btn-gold" onClick={next} data-testid="mh-ar-next">
                  {roundNo + 1 >= HUNT_ROUNDS ? '🏁 ดูผล' : 'รอบต่อไป ▶'}
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    className="mh-btn mh-btn-soft"
                    onClick={() => {
                      setPicked([])
                      setResult(null)
                    }}
                  >
                    ↺ คืนทั้งหมด
                  </button>
                  <button type="button" className="mh-btn mh-btn-go" onClick={check} data-testid="mh-ar-check">
                    ✔ ตรวจ
                  </button>
                </>
              )}
            </div>
          </div>
        </>
      )}

      {phase === 'done' && (
        <div className="mh-card mh-ar-intro mh-center mh-result" data-testid="mh-ar-done">
          <Confetti />
          <div className="mh-result-banner">เก่งมาก!</div>
          <div className="mh-result-cast">
            <AvatarArt avatar={player.avatar} size={110} mood="happy" />
            <CharacterArt id="rabbit" size={88} mood="happy" />
          </div>
          <Stars n={cleared >= HUNT_ROUNDS ? 3 : cleared >= 3 ? 2 : 1} size={56} reveal />
          <p>
            เก็บเงินพอดีได้ {cleared} จาก {HUNT_ROUNDS} รอบ · ได้ +{cleared * HUNT_REWARD.exp} EXP · +{cleared * HUNT_REWARD.coins} 🪙
          </p>
          <div className="mh-row-buttons">
            <button type="button" className="mh-btn mh-btn-soft" onClick={restart}>
              🔄 เล่นอีกครั้ง
            </button>
            <Link to="/map" className="mh-btn mh-btn-gold" data-testid="mh-ar-to-map">
              🗺 กลับแผนที่
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
