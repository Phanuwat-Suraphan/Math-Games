import { useCallback, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Button } from '../components/Button'
import { GameIcon, ItemArt } from '../components/art/GameArt'
import { ScreenLayout } from '../components/ScreenLayout'
import { TopBar } from '../components/TopBar'
import { useGame } from '../context/useGame'
import { ITEMS, RARITY_STYLE, SLOT_LABEL, getItem } from '../data/items'
import {
  EQUIP_SLOTS,
  buyBlockedReason,
  buyItem,
  effectiveMaxHp,
  equipItem,
  totalStats,
  unequipSlot,
  useConsumable,
} from '../services/inventoryService'
import { playSfx } from '../services/audioService'
import type { EquipSlot, Item } from '../types/item'
import type { Player } from '../types/player'

type Tab = 'shop' | 'bag'

/**
 * หน้าร้านค้าและกระเป๋าของ
 *
 * รวมสองอย่างไว้หน้าเดียวโดยตั้งใจ
 * เพราะเด็กมักซื้อของแล้วอยากใส่ทันที ถ้าแยกหน้าจะต้องเดินไปมา
 * และเด็กบางคนจะไม่รู้ว่าซื้อแล้วต้องไปใส่เองที่อีกหน้า จนคิดว่าของไม่มีผล
 */
export function Shop({ player }: { player: Player }) {
  const { patchPlayer } = useGame()
  const [tab, setTab] = useState<Tab>('shop')
  const [notice, setNotice] = useState<string | null>(null)

  const stats = useMemo(() => totalStats(player), [player])
  const maxHp = effectiveMaxHp(player)

  const say = useCallback((message: string) => {
    setNotice(message)
    window.setTimeout(() => setNotice(null), 2200)
  }, [])

  /*
   * ทุกการกระทำส่งผลลัพธ์ทั้งก้อนเข้า patchPlayer
   *
   * ตัวบริการคืน Player ใหม่ที่คิดครบแล้วทั้งเหรียญ กระเป๋า และช่องสวม
   * ถ้าแยกส่งทีละสนาม จะมีจังหวะที่หักเหรียญไปแล้วแต่ของยังไม่เข้า
   * ซึ่งถ้าปิดแอปพอดีตอนนั้น เด็กจะเสียเหรียญฟรี
   */
  const handleBuy = useCallback(
    (item: Item) => {
      const next = buyItem(player, item.id)
      if (!next) {
        playSfx('wrong')
        say(buyBlockedReason(player, item.id) ?? 'ซื้อไม่ได้')
        return
      }
      patchPlayer(next)
      playSfx('levelUp')
      say(`ซื้อ ${item.name} แล้ว`)
    },
    [patchPlayer, player, say],
  )

  const handleEquip = useCallback(
    (item: Item) => {
      const next = equipItem(player, item.id)
      if (!next) return
      patchPlayer(next)
      playSfx('correct')
      say(`สวม ${item.name} แล้ว`)
    },
    [patchPlayer, player, say],
  )

  const handleUnequip = useCallback(
    (slot: EquipSlot) => {
      const next = unequipSlot(player, slot)
      if (!next) return
      patchPlayer(next)
      playSfx('correct')
      say(`ถอด${SLOT_LABEL[slot]}แล้ว`)
    },
    [patchPlayer, player, say],
  )

  const handleUse = useCallback(
    (item: Item) => {
      const next = useConsumable(player, item.id, maxHp)
      if (!next) {
        playSfx('wrong')
        say(player.hp >= maxHp ? 'พลังชีวิตเต็มอยู่แล้ว เก็บไว้ใช้ทีหลังนะ' : 'ใช้ไม่ได้')
        return
      }
      patchPlayer(next)
      playSfx('correct')
      say(`ใช้ ${item.name} แล้ว`)
    },
    [maxHp, patchPlayer, player, say],
  )

  const bagItems = Object.entries(player.inventory ?? {})
    .map(([itemId, count]) => ({ item: getItem(itemId), count }))
    .filter((entry): entry is { item: Item; count: number } => Boolean(entry.item))

  return (
    <>
      <TopBar player={player} title="ร้านค้าและกระเป๋า" backTo="/menu" backLabel="กลับเมนู" />

      <ScreenLayout width="normal">
        {/* สรุปค่าที่ได้จากของที่สวมอยู่ตอนนี้ */}
        <div className="rounded-xl2 border border-white/10 bg-night-800/60 p-4">
          <h2 className="text-sm font-bold text-slate-300">ค่าจากของที่สวมอยู่</h2>
          <div className="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-5">
            <StatChip label="พลังโจมตี" value={`+${stats.attack}`} />
            <StatChip label="พลังป้องกัน" value={`+${stats.defense}`} />
            <StatChip label="พลังชีวิต" value={`+${stats.maxHp}`} />
            <StatChip label="EXP" value={`+${stats.expBonusPercent}%`} />
            <StatChip label="เหรียญ" value={`+${stats.coinBonusPercent}%`} />
          </div>

          {/* ช่องสวมใส่ทั้งสี่ช่อง */}
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {EQUIP_SLOTS.map((slot) => {
              const itemId = player.equipped?.[slot]
              const item = itemId ? getItem(itemId) : undefined
              return (
                <button
                  key={slot}
                  type="button"
                  onClick={() => item && handleUnequip(slot)}
                  disabled={!item}
                  className={`rounded-xl border p-2 text-center ${
                    item
                      ? `${RARITY_STYLE[item.rarity].border} bg-white/5`
                      : 'border-dashed border-white/20'
                  }`}
                >
                  <p className="text-[11px] text-slate-400">{SLOT_LABEL[slot]}</p>
                  {item ? (
                    <>
                      <ItemArt art={item.art} className="mx-auto h-12 w-12" />
                      <p className="truncate text-xs font-bold text-white">{item.name}</p>
                      <p className="text-[11px] text-slate-400">แตะเพื่อถอด</p>
                    </>
                  ) : (
                    <p className="py-4 text-xs text-slate-500">ว่าง</p>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* สลับระหว่างร้านค้ากับกระเป๋า */}
        <div className="mt-5 flex gap-2">
          <TabButton active={tab === 'shop'} onClick={() => setTab('shop')}>
            ร้านค้า
          </TabButton>
          <TabButton active={tab === 'bag'} onClick={() => setTab('bag')}>
            กระเป๋า ({bagItems.reduce((sum, entry) => sum + entry.count, 0)})
          </TabButton>
        </div>

        {tab === 'shop' ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {ITEMS.map((item) => {
              const blocked = buyBlockedReason(player, item.id)
              const rarity = RARITY_STYLE[item.rarity]
              return (
                <div
                  key={item.id}
                  className={`flex gap-3 rounded-xl2 border bg-night-800/50 p-3 ${rarity.border}`}
                >
                  <ItemArt art={item.art} className="h-16 w-16 shrink-0" label={item.name} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <h3 className="truncate font-bold text-white">{item.name}</h3>
                      <span className={`shrink-0 text-[11px] font-bold ${rarity.text}`}>
                        {rarity.label}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs leading-relaxed text-slate-300">
                      {item.description}
                    </p>
                    <StatLine item={item} />
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1 text-sm font-bold text-gold-300">
                        <GameIcon name="coin" className="h-4 w-4" />
                        {item.price}
                      </span>
                      <Button
                        size="md"
                        variant={blocked ? 'ghost' : 'primary'}
                        onClick={() => handleBuy(item)}
                      >
                        {blocked ?? 'ซื้อ'}
                      </Button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {bagItems.length === 0 && (
              <p className="col-span-full rounded-xl2 border border-white/10 bg-night-800/50 p-6 text-center text-sm text-slate-400">
                กระเป๋ายังว่างอยู่ ไปเลือกซื้อของจากร้านค้าได้เลย
              </p>
            )}
            {bagItems.map(({ item, count }) => {
              const rarity = RARITY_STYLE[item.rarity]
              return (
                <div
                  key={item.id}
                  className={`flex gap-3 rounded-xl2 border bg-night-800/50 p-3 ${rarity.border}`}
                >
                  <ItemArt art={item.art} className="h-16 w-16 shrink-0" label={item.name} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <h3 className="truncate font-bold text-white">{item.name}</h3>
                      {count > 1 && (
                        <span className="shrink-0 text-xs font-bold text-slate-300">
                          ×{count}
                        </span>
                      )}
                    </div>
                    <StatLine item={item} />
                    <div className="mt-2 flex justify-end">
                      {item.kind === 'consumable' ? (
                        <Button size="md" onClick={() => handleUse(item)}>
                          ใช้ (ฟื้น {item.healAmount})
                        </Button>
                      ) : (
                        <Button size="md" onClick={() => handleEquip(item)}>
                          สวมใส่
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </ScreenLayout>

      {/* ข้อความแจ้งผล ลอยอยู่ล่างจอเพื่อไม่บังของที่กำลังดู */}
      <AnimatePresence>
        {notice && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center px-4"
          >
            <p className="rounded-full border border-gold-400/40 bg-night-900/95 px-5 py-2.5 text-sm font-bold text-gold-200 shadow-lg">
              {notice}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

function StatChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-center">
      <p className="text-[11px] text-slate-400">{label}</p>
      <p className="font-bold text-emerald-300">{value}</p>
    </div>
  )
}

/** บรรทัดสรุปค่าที่ของชิ้นนี้ให้ ถ้าไม่ให้อะไรเลยจะไม่แสดงบรรทัดนี้ */
function StatLine({ item }: { item: Item }) {
  const parts: string[] = []
  if (item.stats.attack) parts.push(`โจมตี +${item.stats.attack}`)
  if (item.stats.defense) parts.push(`ป้องกัน +${item.stats.defense}`)
  if (item.stats.maxHp) parts.push(`พลังชีวิต +${item.stats.maxHp}`)
  if (item.stats.expBonusPercent) parts.push(`EXP +${item.stats.expBonusPercent}%`)
  if (item.stats.coinBonusPercent) parts.push(`เหรียญ +${item.stats.coinBonusPercent}%`)

  if (parts.length === 0) return null
  return <p className="mt-1 text-xs font-semibold text-emerald-300">{parts.join(' · ')}</p>
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 rounded-xl border px-4 py-2.5 text-sm font-bold transition ${
        active
          ? 'border-gold-400 bg-gold-500/20 text-gold-100'
          : 'border-white/15 bg-white/5 text-slate-300'
      }`}
    >
      {children}
    </button>
  )
}
