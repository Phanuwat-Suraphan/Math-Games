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
import {
  MAX_STARS,
  starsOf,
  statsWithStars,
  upgradeBlockedReason,
  upgradeCost,
  upgradeItem,
} from '../services/upgradeService'
import {
  buyAvatar,
  buyAvatarBlockedReason,
  ownsAvatar,
  selectAvatar,
} from '../services/avatarService'
import { AVATARS } from '../data/avatars'
import { ultimateFor } from '../survivor/ultimates'
import { HeroArt } from '../components/art/GameArt'
import type { Avatar } from '../types/player'
import type { EquipSlot, Item } from '../types/item'
import type { Player } from '../types/player'

type Tab = 'shop' | 'bag' | 'heroes'

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

  const handleUpgrade = useCallback(
    (item: Item) => {
      const next = upgradeItem(player, item.id)
      if (!next) {
        playSfx('wrong')
        say(upgradeBlockedReason(player, item.id) ?? 'ตีบวกไม่ได้')
        return
      }
      playSfx('levelUp')
      patchPlayer(next)
      say(`${item.name} เป็น ${starsOf(next, item.id)} ดาวแล้ว!`)
    },
    [patchPlayer, player, say],
  )

  const handleBuyAvatar = useCallback(
    (avatar: Avatar) => {
      const next = buyAvatar(player, avatar.id)
      if (!next) {
        playSfx('wrong')
        say(buyAvatarBlockedReason(player, avatar.id) ?? 'ซื้อไม่ได้')
        return
      }
      playSfx('coin')
      patchPlayer(next)
      say(`ได้ ${avatar.name} แล้ว! เปลี่ยนให้เรียบร้อย`)
    },
    [patchPlayer, player, say],
  )

  const handleSelectAvatar = useCallback(
    (avatar: Avatar) => {
      const next = selectAvatar(player, avatar.id)
      if (!next) return
      playSfx('correct')
      patchPlayer(next)
      say(`เปลี่ยนเป็น ${avatar.name} แล้ว`)
    },
    [patchPlayer, player, say],
  )

  /*
   * รายการในกระเป๋า รวมของที่สวมอยู่เข้ามาด้วย
   *
   * เพราะของที่เด็กอยากตีบวกมากที่สุดคือของที่กำลังใช้อยู่
   * ถ้าต้องถอดออกก่อนถึงจะเห็นปุ่มตีบวก เด็กส่วนใหญ่จะไม่เจอปุ่มนั้นเลย
   */
  const wornIds = EQUIP_SLOTS.map((slot) => player.equipped?.[slot]).filter(
    (id): id is string => Boolean(id),
  )

  const bagItems = [
    ...wornIds.map((itemId) => ({ item: getItem(itemId), count: 0, worn: true })),
    ...Object.entries(player.inventory ?? {}).map(([itemId, count]) => ({
      item: getItem(itemId),
      count,
      worn: false,
    })),
  ].filter((entry): entry is { item: Item; count: number; worn: boolean } => Boolean(entry.item))

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
                      <p className="text-[11px] text-gold-300">
                        <Stars count={starsOf(player, itemId ?? '')} />
                      </p>
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
            ของ ({bagItems.length})
          </TabButton>
          <TabButton active={tab === 'heroes'} onClick={() => setTab('heroes')}>
            ตัวละคร
          </TabButton>
        </div>

        {tab === 'heroes' ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {AVATARS.map((avatar) => (
              <HeroCard
                key={avatar.id}
                avatar={avatar}
                owned={ownsAvatar(player, avatar.id)}
                inUse={player.avatar === avatar.id}
                blocked={buyAvatarBlockedReason(player, avatar.id)}
                onBuy={() => handleBuyAvatar(avatar)}
                onSelect={() => handleSelectAvatar(avatar)}
              />
            ))}
          </div>
        ) : tab === 'shop' ? (
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
            {bagItems.map(({ item, count, worn }) => {
              const rarity = RARITY_STYLE[item.rarity]
              return (
                <div
                  key={`${item.id}-${worn ? 'worn' : 'bag'}`}
                  className={`flex gap-3 rounded-xl2 border bg-night-800/50 p-3 ${rarity.border}`}
                >
                  <ItemArt art={item.art} className="h-16 w-16 shrink-0" label={item.name} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <h3 className="truncate font-bold text-white">{item.name}</h3>
                      {worn ? (
                        <span className="shrink-0 rounded bg-sky-500/20 px-1.5 py-0.5 text-[11px] font-bold text-sky-200">
                          สวมอยู่
                        </span>
                      ) : (
                        count > 1 && (
                          <span className="shrink-0 text-xs font-bold text-slate-300">
                            ×{count}
                          </span>
                        )
                      )}
                    </div>

                    {item.kind !== 'consumable' && (
                      <p className="mt-0.5 text-sm text-gold-300">
                        <Stars count={starsOf(player, item.id)} />
                      </p>
                    )}

                    <StatLine item={item} stars={starsOf(player, item.id)} />

                    <div className="mt-2 flex flex-wrap justify-end gap-2">
                      {item.kind === 'consumable' ? (
                        <Button size="md" onClick={() => handleUse(item)}>
                          ใช้ (ฟื้น {item.healAmount})
                        </Button>
                      ) : (
                        <>
                          <UpgradeButton
                            player={player}
                            item={item}
                            onUpgrade={() => handleUpgrade(item)}
                          />
                          {!worn && (
                            <Button size="md" onClick={() => handleEquip(item)}>
                              สวมใส่
                            </Button>
                          )}
                        </>
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
/** ค่าของของชิ้นหนึ่ง นับดาวตีบวกที่มีอยู่แล้วด้วย */
function StatLine({ item, stars = 0 }: { item: Item; stars?: number }) {
  const stats = statsWithStars(item, stars)
  const parts: string[] = []
  if (stats.attack) parts.push(`โจมตี +${stats.attack}`)
  if (stats.defense) parts.push(`ป้องกัน +${stats.defense}`)
  if (stats.maxHp) parts.push(`พลังชีวิต +${stats.maxHp}`)
  if (stats.expBonusPercent) parts.push(`EXP +${stats.expBonusPercent}%`)
  if (stats.coinBonusPercent) parts.push(`เหรียญ +${stats.coinBonusPercent}%`)

  if (parts.length === 0) return null
  return <p className="mt-1 text-xs font-semibold text-emerald-300">{parts.join(' · ')}</p>
}

/** ดาวตีบวก แสดงทั้งที่ได้แล้วและที่ยังเหลือ ให้เห็นว่าไปได้อีกไกลแค่ไหน */
function Stars({ count }: { count: number }) {
  if (count <= 0) return <span className="text-xs text-slate-500">ยังไม่ได้ตีบวก</span>
  return (
    <span className="text-sm" aria-label={`ตีบวก ${count} ดาว`}>
      {'★'.repeat(count)}
      <span className="text-slate-600">{'☆'.repeat(MAX_STARS - count)}</span>
    </span>
  )
}

/**
 * ปุ่มตีบวก บอกราคาและผลที่จะได้ก่อนกดเสมอ
 *
 * แสดงค่าที่จะขึ้นจริง ไม่ใช่แค่ "แรงขึ้น"
 * เพราะการเทียบตัวเลขก่อนตัดสินใจใช้เหรียญคือคณิตศาสตร์ที่ใช้ได้จริง
 * และเป็นเหตุผลหลักที่ระบบนี้เหมาะกับเกมเรียนรู้มากกว่าระบบสุ่ม
 */
function UpgradeButton({
  player,
  item,
  onUpgrade,
}: {
  player: Player
  item: Item
  onUpgrade: () => void
}) {
  const stars = starsOf(player, item.id)
  const cost = upgradeCost(item.id, stars)
  const blocked = upgradeBlockedReason(player, item.id)

  if (cost === null) {
    return (
      <span className="self-center text-xs font-bold text-gold-300">ตีบวกสุดแล้ว</span>
    )
  }

  const now = statsWithStars(item, stars)
  const next = statsWithStars(item, stars + 1)
  const gain =
    (next.attack ?? 0) - (now.attack ?? 0) ||
    (next.defense ?? 0) - (now.defense ?? 0) ||
    (next.maxHp ?? 0) - (now.maxHp ?? 0)

  return (
    <Button size="md" variant={blocked ? 'ghost' : 'secondary'} onClick={onUpgrade}>
      {blocked && !blocked.startsWith('ยังขาด')
        ? blocked
        : `ตีบวก ${cost} เหรียญ${gain > 0 ? ` (+${gain})` : ''}`}
    </Button>
  )
}

/**
 * การ์ดตัวละครในร้าน
 *
 * สิ่งที่ต้องเด่นที่สุดคือ "สกิลวิเศษ" ไม่ใช่รูป
 * เพราะนั่นคือสิ่งที่เด็กจ่ายเหรียญไปเพื่อได้มา
 * ถ้าโชว์แต่รูปกับราคา เด็กจะไม่มีทางรู้ว่าซื้อไปแล้วเล่นต่างจากเดิมยังไง
 */
function HeroCard({
  avatar,
  owned,
  inUse,
  blocked,
  onBuy,
  onSelect,
}: {
  avatar: Avatar
  owned: boolean
  inUse: boolean
  blocked: string | null
  onBuy: () => void
  onSelect: () => void
}) {
  const ultimate = ultimateFor(avatar.id)

  return (
    <div
      className={`flex gap-3 rounded-xl2 border bg-night-800/50 p-3 ${
        inUse ? 'border-gold-400/70' : 'border-white/10'
      }`}
    >
      <HeroArt avatarId={avatar.id} className="h-20 w-20 shrink-0" label={avatar.name} />

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="truncate font-bold text-white">{avatar.name}</h3>
          {inUse && (
            <span className="shrink-0 rounded bg-gold-500/20 px-1.5 py-0.5 text-[11px] font-bold text-gold-200">
              ใช้อยู่
            </span>
          )}
        </div>
        <p className="mt-0.5 text-xs text-slate-400">{avatar.description}</p>

        <div
          className="mt-2 rounded-lg border p-2"
          style={{ borderColor: `${ultimate.color}44` }}
        >
          <p className="text-[11px] text-slate-400">สกิลวิเศษในสนามรบ</p>
          <p className="text-sm font-bold" style={{ color: ultimate.color }}>
            {ultimate.name}
          </p>
          <p className="text-xs text-slate-300">{ultimate.short}</p>
        </div>

        <div className="mt-2 flex items-center justify-between gap-2">
          {owned ? (
            <span className="text-xs font-bold text-emerald-300">เป็นเจ้าของแล้ว</span>
          ) : (
            <span className="flex items-center gap-1 text-sm font-bold text-gold-300">
              <GameIcon name="coin" className="h-4 w-4" />
              {avatar.price}
            </span>
          )}

          {owned ? (
            <Button size="md" variant={inUse ? 'ghost' : 'primary'} onClick={onSelect}>
              {inUse ? 'กำลังใช้' : 'เลือกใช้'}
            </Button>
          ) : (
            <Button size="md" variant={blocked ? 'ghost' : 'primary'} onClick={onBuy}>
              {blocked ?? 'ซื้อ'}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
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
