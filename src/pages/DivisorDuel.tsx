import { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from '../components/Button'
import { ScreenLayout } from '../components/ScreenLayout'
import { TopBar } from '../components/TopBar'
import { useGame } from '../context/useGame'
import { playSfx } from '../services/audioService'
import { applyBonusPercent, totalStats } from '../services/inventoryService'
import { recordDuel } from '../services/recordService'
import { HeroArt, ItemArt, MonsterArt } from '../components/art/GameArt'
import {
  duelHeroArt,
  duelMonsterArt,
  duelOperatorArt,
  numberCardLook,
} from '../components/art/duelArt'
import { HEROES } from '../divisorDuel/cards'
import { planTurn } from '../divisorDuel/engine/ai'
import { evaluate, toDisplayString, validate } from '../divisorDuel/engine/equation'
import {
  desperateStrikePower,
  getDeadHandInfo,
  rawMagicPower,
} from '../divisorDuel/engine/deadHand'
import {
  addBracket,
  attack,
  clearEquation,
  createGame,
  deadHandAttack,
  endTurn,
  getRedrawCost,
  getTargets,
  placeCard,
  redrawHand,
  tacticalReset,
  undoLastCard,
} from '../divisorDuel/engine/game'
import type { GameState, TargetOption } from '../divisorDuel/engine/game'
import type { AiLevel } from '../divisorDuel/engine/ai'
import type { Player } from '../types/player'

/**
 * เกมการ์ด Divisor Duel ในแอปหลัก
 *
 * เดิมเกมนี้เป็นไฟล์ HTML เดี่ยวที่แยกอยู่นอกแอป เปิดได้จากลิงก์ของตัวเอง
 * เด็กที่เล่น Math Adventure อยู่จึงไม่มีทางรู้เลยว่ามันมีอยู่
 * และครูต้องส่งสองลิงก์แทนที่จะส่งลิงก์เดียว
 *
 * หน้านี้ใช้เครื่องยนต์ตัวเดิมทั้งหมดโดยไม่แก้อะไรเลยสักบรรทัด
 * เครื่องยนต์นั้นเป็นฟังก์ชันบริสุทธิ์อยู่แล้วและมีชุดทดสอบของตัวเอง
 * งานของไฟล์นี้จึงมีแค่การวาดหน้าจอกับรับการกดเท่านั้น
 *
 * กติกาโดยย่อ: สร้างสมการจากการ์ดในมือให้ได้ผลลัพธ์ที่ "หารลงตัว"
 * ด้วยเกราะของเป้าหมาย ถ้าหารลงตัวจะเข้าเต็ม ถ้าเหลือเศษจะโดนหักแรง
 * เด็กจึงต้องคิดเรื่องตัวประกอบและการหารจริง ๆ เพื่อจะเล่นให้เก่ง
 */
export function DivisorDuel({ player }: { player: Player }) {
  const [state, setState] = useState<GameState | null>(null)
  const [heroId, setHeroId] = useState(HEROES[0].id)
  const [level, setLevel] = useState<AiLevel>('normal')
  const [target, setTarget] = useState<TargetOption | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  /** เหรียญที่ได้จากตาที่เพิ่งจบ เก็บไว้เพื่อบอกเด็กบนหน้าจอสรุป */
  const [reward, setReward] = useState(0)

  /*
   * ธงกันคอมพิวเตอร์เดินซ้อนกัน
   *
   * เก็บเป็น ref ไม่ใช่ state เพราะต้องอ่านค่าล่าสุดได้ทันทีใน setTimeout
   * ถ้าใช้ state ค่าที่อ่านได้จะเป็นค่าตอนที่ตั้งเวลาไว้ ไม่ใช่ค่าปัจจุบัน
   * แล้วคอมพิวเตอร์จะเดินสองครั้งซ้อนจนเลือดผู้เล่นหายรวดเดียวสองก้อน
   */
  const aiBusyRef = useRef(false)

  /*
   * ธงกันจ่ายรางวัลซ้ำ
   *
   * เหตุผลเดียวกับสนามรบและหอคอย: React เรียก effect ซ้ำได้
   * และการที่ผู้เล่นเปลี่ยนไปหลังจ่ายเหรียญก็ทำให้ effect ทำงานอีกรอบด้วย
   * ถ้าไม่กันไว้ ตาเดียวจะจ่ายเหรียญไม่รู้จบ
   */
  const paidRef = useRef(false)
  const { patchPlayer } = useGame()

  const say = useCallback((message: string) => {
    setNotice(message)
    window.setTimeout(() => setNotice(null), 2400)
  }, [])

  const start = useCallback(() => {
    aiBusyRef.current = false
    paidRef.current = false
    setReward(0)
    setTarget(null)
    setState(
      createGame({
        p1HeroId: heroId,
        p2HeroId: HEROES[(HEROES.findIndex((h) => h.id === heroId) + 1) % HEROES.length].id,
        p2Control: 'ai',
        p1Name: player.name,
        p2Name: 'คู่ต่อสู้',
      }),
    )
  }, [heroId, player.name])

  /*
   * จ่ายรางวัลและบันทึกสถิติเมื่อตาจบ
   *
   * แพ้ก็ยังได้เหรียญ แค่น้อยกว่าชนะมาก
   * เพราะเกมนี้ยากกว่าโหมดอื่นอย่างชัดเจน เด็กต้องคิดสมการให้หารลงตัว
   * ถ้าแพ้แล้วได้ศูนย์ เด็กที่ยังคิดไม่คล่องจะเลิกเล่นตั้งแต่ตาที่สอง
   * ทั้งที่เป็นกลุ่มที่ได้ประโยชน์จากเกมนี้มากที่สุด
   */
  useEffect(() => {
    if (!state?.winner || paidRef.current) return
    paidRef.current = true

    const won = state.winner === 'p1'
    const base = won ? 70 : 18
    const gained = applyBonusPercent(base, totalStats(player).coinBonusPercent)
    setReward(gained)
    patchPlayer({
      coins: player.coins + Math.max(0, gained),
      records: recordDuel(player, won),
    })
  }, [patchPlayer, player, state?.winner])

  /* ตาของคอมพิวเตอร์ เดินเองทั้งหมด */
  useEffect(() => {
    if (!state || state.winner || state.turn !== 'p2' || aiBusyRef.current) return

    aiBusyRef.current = true
    const think = window.setTimeout(() => {
      setState((current) => {
        if (!current) return current

        const plan = planTurn(current, level)
        const enemy = current.players[current.turn]
        let next = current

        if (plan.fallback === 'tacticalReset') {
          next = tacticalReset(current)
        } else if (plan.fallback !== 'none') {
          const numbers = enemy.hand.filter((card) => card.kind === 'number')
          const used = plan.rawMagicCards
            ? [...plan.rawMagicCards]
            : numbers[0]
              ? [numbers[0].uid]
              : []
          next = deadHandAttack(current, {
            target: plan.target,
            power: plan.power,
            usedCardIds: used,
          }).state
        } else {
          const withEquation: GameState = {
            ...current,
            equation: {
              slots: plan.slots,
              brackets: plan.bracket ? [plan.bracket] : [],
            },
          }
          next = attack(withEquation, {
            target: plan.target,
            overridePower: evaluate(withEquation.equation) ?? 0,
          }).state
        }
        return next
      })

      // หน่วงอีกครั้งให้เด็กได้เห็นผลก่อนเปลี่ยนตา
      window.setTimeout(() => {
        setState((current) => {
          aiBusyRef.current = false
          if (!current || current.winner) return current
          return endTurn(current)
        })
        setTarget(null)
      }, 1500)
    }, 800)

    return () => window.clearTimeout(think)
  }, [level, state])

  if (!state) {
    return (
      <>
        <TopBar player={player} title="ศึกผ่าสมการ" backTo="/menu" backLabel="กลับเมนู" />
        <ScreenLayout width="normal">
          <div className="panel panel-hero panel-corners p-6">
            <h2 className="title-gold text-2xl font-black">ศึกผ่าสมการ</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-200">
              เกมการ์ดที่ต้องสร้างสมการจากการ์ดในมือ ให้ผลลัพธ์
              <b> หารลงตัว </b>
              ด้วยเกราะของเป้าหมาย หารลงตัวคือเข้าเต็ม เหลือเศษคือโดนหักแรง
            </p>
            <ul className="mt-4 space-y-1.5 text-sm text-slate-300">
              <li>· ล้มองครักษ์ให้หมดก่อน ถึงจะตีฮีโร่ของอีกฝ่ายได้</li>
              <li>· ตีเข้าเต็มติดกันหลายครั้งจะได้โบนัสคอมโบ</li>
              <li>· ถ้าการ์ดในมือสร้างสมการไม่ได้เลย ยังมีท่าไม้ตายให้ใช้</li>
            </ul>

            <fieldset className="mt-5">
              <legend className="mb-2 text-sm font-bold text-white">เลือกฮีโร่</legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {HEROES.map((hero) => (
                  <button
                    key={hero.id}
                    type="button"
                    onClick={() => setHeroId(hero.id)}
                    aria-pressed={hero.id === heroId}
                    className={`rounded-xl border p-3 text-left transition ${
                      hero.id === heroId
                        ? 'border-gold-300 bg-gold-500/15'
                        : 'border-white/10 bg-white/5 hover:border-white/25'
                    }`}
                  >
                    <p className="font-bold text-white">{hero.name}</p>
                    <p className="text-xs text-gold-300">
                      {hero.ability.nameTh} · เกราะ {hero.divisor}
                    </p>
                    <p className="mt-0.5 text-xs leading-relaxed text-slate-300">
                      {hero.ability.description}
                    </p>
                  </button>
                ))}
              </div>
            </fieldset>

            <fieldset className="mt-4">
              <legend className="mb-2 text-sm font-bold text-white">ความเก่งของคู่ต่อสู้</legend>
              <div className="flex gap-2">
                {(['easy', 'normal', 'hard'] as AiLevel[]).map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setLevel(value)}
                    aria-pressed={value === level}
                    className={`flex-1 rounded-xl border px-3 py-2 text-sm font-bold transition ${
                      value === level
                        ? 'border-gold-300 bg-gold-500/15 text-gold-200'
                        : 'border-white/15 bg-white/5 text-slate-300'
                    }`}
                  >
                    {value === 'easy' ? 'ง่าย' : value === 'normal' ? 'ปกติ' : 'ยาก'}
                  </button>
                ))}
              </div>
            </fieldset>

            <Button size="lg" fullWidth className="mt-6" onClick={start}>
              เริ่มดวล
            </Button>
          </div>
        </ScreenLayout>
      </>
    )
  }

  const me = state.players.p1
  const foe = state.players.p2
  const myTurn = state.turn === 'p1' && !state.winner
  /*
   * รายการเป้าหมายที่แสดงบนแถบบน
   *
   * getTargets คืนเป้าหมายของ "ฝ่ายที่ถึงตา" ซึ่งตอนคอมพิวเตอร์เดินจะเป็นฝั่งเรา
   * ถ้าเอามาวาดตรง ๆ แถบบนจะกลายเป็นองครักษ์ของเราเองระหว่างตาคอมพิวเตอร์
   * แล้วเด็กจะเห็นเลือดตัวเองอยู่ในช่องของศัตรู ซึ่งสับสนมาก
   *
   * จึงวาดจากฝั่งตรงข้ามเสมอ แล้วใช้ getTargets เฉพาะตอนที่ถึงตาเราจริง ๆ
   * เพื่อรู้ว่าตอนนี้ตีอะไรได้บ้าง
   */
  const attackable = myTurn ? getTargets(state) : []

  const targets: TargetOption[] = [
    ...foe.guards.map((guard, index) => ({
      kind: 'guard' as const,
      index,
      name: guard.name,
      emoji: guard.emoji,
      hp: guard.hp,
      maxHp: guard.maxHp,
      divisor: guard.divisor,
      isAttackable: attackable.some(
        (option) => option.kind === 'guard' && option.index === index && option.isAttackable,
      ),
    })),
    {
      kind: 'hero' as const,
      index: -1,
      name: foe.heroName,
      emoji: '👑',
      hp: foe.heroHp,
      maxHp: foe.heroMaxHp,
      divisor: foe.heroDivisor,
      isAttackable: attackable.some(
        (option) => option.kind === 'hero' && option.isAttackable,
      ),
    },
  ]
  const power = evaluate(state.equation)
  const check = validate(state.equation)
  const deadHand = getDeadHandInfo(state.deadHand)

  const act = (next: GameState, message?: string) => {
    setState(next)
    if (message) say(message)
  }

  const doAttack = () => {
    if (!target) {
      say('เลือกเป้าหมายก่อนนะ')
      return
    }
    if (!check.isValid || power === null) {
      say(check.message || 'สมการยังไม่สมบูรณ์')
      return
    }

    const outcome = attack(state, { target: { kind: target.kind, index: target.index } })
    playSfx(outcome.result && outcome.result.remainder === 0 ? 'correct' : 'wrong')
    setState(outcome.state)
    setTarget(null)
    say(outcome.message)
  }

  return (
    <>
      <TopBar player={player} title="ศึกผ่าสมการ" backTo="/menu" backLabel="กลับเมนู" />

      <ScreenLayout width="wide">
        {/* ฝ่ายตรงข้าม แตะการ์ดเพื่อเลือกเป็นเป้าหมาย */}
        <div className="panel p-3">
          <div className="flex items-baseline justify-between">
            <p className="text-sm font-bold text-ember-300">{foe.heroName}</p>
            <p className="text-xs text-slate-400">คอมพิวเตอร์</p>
          </div>

          <div className="mt-2 grid grid-cols-3 gap-2">
            {targets.map((option) => {
              const selected =
                target?.kind === option.kind && target?.index === option.index
              const dead = option.hp <= 0

              return (
                <button
                  key={`${option.kind}-${option.index}`}
                  type="button"
                  disabled={!option.isAttackable || !myTurn}
                  onClick={() => setTarget(option)}
                  className={`duel-guard p-2 text-center ${
                    dead ? 'duel-guard-dead' : selected ? 'duel-guard-selected' : ''
                  } ${!option.isAttackable && !dead ? 'opacity-60' : ''}`}
                >
                  {/* ภาพจริงจากชุดเดียวกับทั้งเกม เด็กจึงจำมอนตัวนี้ได้จากโหมดอื่น */}
                  {option.kind === 'hero' ? (
                    <HeroArt
                      avatarId={duelHeroArt(foe.heroId)}
                      className="mx-auto h-14 w-14"
                      label={option.name}
                    />
                  ) : (
                    <MonsterArt
                      monsterId={duelMonsterArt(
                        foe.guards[option.index]?.monsterId ?? '',
                      )}
                      className="mx-auto h-14 w-14"
                      label={option.name}
                    />
                  )}
                  <p className="truncate text-xs font-bold text-white">{option.name}</p>
                  {/* เกราะคือเลขที่ผลลัพธ์ต้องหารลงตัว จึงต้องเด่นที่สุดบนป้าย */}
                  <p className="text-base font-black text-gold-300">÷ {option.divisor}</p>
                  <div className="bar-track mt-1 h-1.5">
                    <div
                      className="bar-fill bg-gradient-to-r from-ember-500 to-ember-400"
                      style={{ width: `${Math.max(0, (option.hp / option.maxHp) * 100)}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-slate-400">
                    {Math.max(0, option.hp)} / {option.maxHp}
                  </p>
                </button>
              )
            })}
          </div>
        </div>

        {/* สมการที่กำลังสร้าง */}
        <div className="panel panel-hero mt-3 p-3 text-center">
          <p className="text-xs text-slate-400">สมการของหนู</p>
          <p className="mt-1 min-h-[2.2rem] text-2xl font-black text-white">
            {toDisplayString(state.equation) || '— แตะการ์ดด้านล่างเพื่อวาง —'}
          </p>

          {power !== null && (
            <p className="text-sm font-bold text-gold-300">
              ได้ {power}
              {target
                ? power % target.divisor === 0
                  ? ` · หาร ${target.divisor} ลงตัว เข้าเต็ม!`
                  : ` · หาร ${target.divisor} เหลือเศษ ${power % target.divisor}`
                : ''}
            </p>
          )}
          {!check.isValid && check.message ? (
            <p className="text-xs text-slate-400">{check.message}</p>
          ) : null}

          <div className="mt-2 flex flex-wrap justify-center gap-2">
            <Button size="md" variant="ghost" onClick={() => act(undoLastCard(state))}>
              ถอยกลับ
            </Button>
            <Button size="md" variant="ghost" onClick={() => act(clearEquation(state))}>
              ล้าง
            </Button>
            <Button size="md" variant="success" onClick={doAttack}>
              โจมตี!
            </Button>
            <Button
              size="md"
              variant="secondary"
              onClick={() => {
                setTarget(null)
                act(endTurn(state), 'จบเทิร์นแล้ว')
              }}
            >
              จบเทิร์น
            </Button>
          </div>
        </div>

        {/* มือตาย ต้องมีทางไปต่อเสมอ ไม่ใช่ปล่อยให้ค้าง */}
        {myTurn && deadHand ? (
          <div className="panel mt-3 border-gold-400/40 p-3">
            <p className="text-sm font-bold text-gold-300">
              {deadHand.emoji} {deadHand.title}
            </p>
            <p className="text-xs leading-relaxed text-slate-300">{deadHand.condition}</p>
            <ol className="mt-1 space-y-0.5 text-xs text-slate-400">
              {deadHand.steps.map((step, index) => (
                <li key={step}>
                  {index + 1}. {step}
                </li>
              ))}
            </ol>
            <div className="mt-2 flex flex-wrap gap-2">
              {deadHand.canAttack ? (
                <Button
                  size="md"
                  onClick={() => {
                    if (!target) {
                      say('เลือกเป้าหมายก่อนนะ')
                      return
                    }
                    /*
                     * ใช้ flatMap แทน filter เพื่อให้ชนิดแคบลงเองโดยไม่ต้องเขียน type predicate
                     * predicate ที่อ้าง typeof ของพารามิเตอร์ตัวเองจะวนกลับมาหาตัวเอง
                     * ซึ่งคอมไพเลอร์ปฏิเสธ และเป็นข้อผิดพลาดที่เห็นเฉพาะตอน build เท่านั้น
                     */
                    const numbers = me.hand.flatMap((card) =>
                      card.kind === 'number' ? [card] : [],
                    )
                    /*
                     * พลังของท่าไม้ตายต่างกันตามชนิดของมือตาย
                     * Raw Magic ใช้ตัวเลขสองใบบวกกัน ส่วน Desperate Strike
                     * ใช้ใบเดียวหารครึ่ง จึงต้องแยกกันคิด ไม่ใช่สูตรเดียว
                     */
                    const isRaw = state.deadHand === 'rawMagicGathering'
                    const power = isRaw
                      ? rawMagicPower(numbers[0]?.value ?? 0, numbers[1]?.value ?? 0)
                      : desperateStrikePower(numbers[0]?.value ?? 0)

                    const outcome = deadHandAttack(state, {
                      target: { kind: target.kind, index: target.index },
                      power,
                      usedCardIds: numbers.slice(0, isRaw ? 2 : 1).map((card) => card.uid),
                    })
                    setState(outcome.state)
                    setTarget(null)
                    say(outcome.message)
                  }}
                >
                  ใช้ท่าไม้ตาย
                </Button>
              ) : null}
              <Button
                size="md"
                variant="ghost"
                onClick={() => act(tacticalReset(state), 'จั่วมือใหม่แล้ว')}
              >
                ทิ้งมือจั่วใหม่
              </Button>
            </div>
          </div>
        ) : null}

        {/* การ์ดในมือ */}
        <div className="panel mt-3 p-3">
          <div className="flex items-baseline justify-between">
            <p className="text-sm font-bold text-sky-300">
              {me.heroName} · เลือด {Math.max(0, me.heroHp)} / {me.heroMaxHp}
            </p>
            <p className="text-xs text-slate-400">
              คอมโบ {me.comboStreak} · กองจั่ว {me.drawPile.length}
            </p>
          </div>

          <div className="mt-2 flex flex-wrap gap-2">
            {me.hand.map((card) => {
              const look = card.kind === 'number' ? numberCardLook(card.value) : null

              return (
                <button
                  key={card.uid}
                  type="button"
                  disabled={!myTurn}
                  onClick={() => {
                    if (card.kind === 'bracket') {
                      // วงเล็บครอบสองพจน์แรกเสมอ ซึ่งเป็นรูปแบบที่เด็กใช้จริงเกือบทุกครั้ง
                      const outcome = addBracket(state, 0, 1)
                      setState(outcome.state)
                      if (!outcome.ok) say(outcome.message)
                      return
                    }
                    act(placeCard(state, card.uid))
                  }}
                  className={`duel-card ${look ? look.className : 'card-operator'} ${
                    myTurn ? '' : 'opacity-50'
                  }`}
                >
                  <span className="duel-card-corner">{card.label}</span>

                  {card.kind === 'number' ? (
                    <>
                      <span className="text-2xl font-black leading-none">{card.value}</span>
                      <span className="mt-1 text-[10px] opacity-80">{look?.label}</span>
                    </>
                  ) : card.kind === 'operator' ? (
                    <>
                      <ItemArt art={duelOperatorArt(card.symbol)} className="h-8 w-8" />
                      <span className="text-lg font-black leading-none">{card.label}</span>
                    </>
                  ) : (
                    <>
                      <ItemArt art="hourglass" className="h-8 w-8" />
                      <span className="text-sm font-black leading-none">( )</span>
                    </>
                  )}
                </button>
              )
            })}
          </div>

          <div className="mt-2 flex flex-wrap gap-2">
            <Button
              size="md"
              variant="ghost"
              onClick={() => {
                const outcome = redrawHand(state)
                setState(outcome.state)
                say(outcome.message)
              }}
            >
              จั่วใหม่ (เสีย {getRedrawCost()} เลือด)
            </Button>
          </div>
        </div>

        {/* บันทึกการต่อสู้ ช่วยให้เด็กย้อนดูว่าทำไมดาเมจถึงออกมาเท่านั้น */}
        <div className="panel mt-3 p-3">
          <p className="text-xs font-bold text-slate-400">บันทึกการต่อสู้</p>
          <ul className="mt-1 space-y-0.5 text-xs text-slate-300">
            {state.log.slice(-6).reverse().map((entry, index) => (
              <li key={`${entry.text}-${index}`}>· {entry.text}</li>
            ))}
          </ul>
        </div>

        {state.winner ? (
          <div className="panel panel-hero panel-corners mt-3 p-5 text-center">
            <h2 className="title-gold text-2xl font-black">
              {state.winner === 'p1' ? 'ชนะแล้ว!' : 'แพ้แล้ว ลองใหม่นะ'}
            </h2>
            <p className="mt-2 text-sm text-slate-300">
              ได้รับ{' '}
              <span className="font-black tabular-nums text-gold-300">{reward}</span>{' '}
              เหรียญ
            </p>
            <Button size="lg" fullWidth className="mt-4" onClick={start}>
              ดวลอีกรอบ
            </Button>
          </div>
        ) : null}

        {notice ? (
          <p className="mt-3 rounded-xl border border-gold-400/40 bg-gold-500/10 px-4 py-2 text-center text-sm font-bold text-gold-200">
            {notice}
          </p>
        ) : null}
      </ScreenLayout>
    </>
  )
}
