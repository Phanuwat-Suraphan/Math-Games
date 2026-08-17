import { PERKS } from './perks'
import { AVATARS } from './avatars'
import { STORY_BEATS } from './story'
import { WEAPONS } from '../survivor/weapons'
import { recordsOf } from '../services/recordService'
import { MAX_STARS } from '../services/upgradeService'
import type { Player } from '../types/player'
import { getTotalStars } from '../utils/stageSystem'
import { calculateAccuracy } from '../utils/statistics'

/**
 * หมวดของถ้วยรางวัล
 *
 * ทำไมต้องมีหมวด
 *
 * ตอนมีถ้วยสิบสองใบ รายการเดียวยาว ๆ อ่านได้สบาย
 * ตอนนี้เกมมีทั้งด่านเนื้อเรื่อง สนามรบ หอคอย ศึกผ่าสมการ ของสวมใส่ และตัวละคร
 * ถ้ายังเรียงรวมกันหมด เด็กที่เพิ่งเปิดสนามรบครั้งแรกจะเห็นถ้วยของโหมดที่ยังไม่รู้จัก
 * ปนกับถ้วยที่ตัวเองใกล้ได้แล้ว แล้วอ่านออกมาเป็น "ยังไม่ได้อีกเยอะเลย"
 * แทนที่จะอ่านออกมาเป็น "อีกนิดเดียวก็ได้แล้ว" ซึ่งกลับทิศกันคนละทาง
 */
export type AchievementCategory =
  | 'learning'
  | 'adventure'
  | 'arena'
  | 'trial'
  | 'collection'

export const CATEGORY_INFO: {
  id: AchievementCategory
  name: string
  emoji: string
}[] = [
  { id: 'learning', name: 'การเรียนรู้', emoji: '📖' },
  { id: 'adventure', name: 'การผจญภัย', emoji: '🗺️' },
  { id: 'arena', name: 'สนามรบ', emoji: '⚔️' },
  { id: 'trial', name: 'บททดสอบ', emoji: '🃏' },
  { id: 'collection', name: 'ของสะสม', emoji: '🎒' },
]

export interface Achievement {
  id: string
  name: string
  description: string
  emoji: string
  category: AchievementCategory
  /** เงื่อนไขคำนวณจากข้อมูลผู้เล่นจริง ไม่ได้ hard-code สถานะไว้ */
  isUnlocked: (player: Player) => boolean
  getProgressText: (player: Player) => string
}

/**
 * ตัวช่วยสร้างถ้วยแบบ "ทำให้ถึงจำนวนนี้"
 *
 * ถ้วยส่วนใหญ่ในเกมเป็นแบบเดียวกันหมด คือวัดค่าหนึ่งเทียบกับเป้าหมายหนึ่ง
 * เดิมเขียนซ้ำทุกใบ ทั้งการ clamp ไม่ให้เกินเป้า และการต่อสตริงหน่วย
 * ซึ่งเป็นที่มาของความไม่สม่ำเสมอ บางใบเขียน "5 / 5" บางใบเขียน "ครบแล้ว"
 * และมีใบหนึ่งที่ลืม clamp จนแสดง "320 / 300 เหรียญ"
 */
function countGoal(config: {
  id: string
  name: string
  description: string
  emoji: string
  category: AchievementCategory
  goal: number
  unit: string
  valueOf: (player: Player) => number
}): Achievement {
  const { goal, unit, valueOf } = config
  return {
    id: config.id,
    name: config.name,
    description: config.description,
    emoji: config.emoji,
    category: config.category,
    isUnlocked: (player) => valueOf(player) >= goal,
    getProgressText: (player) =>
      `${Math.min(valueOf(player), goal).toLocaleString('th-TH')} / ${goal.toLocaleString(
        'th-TH',
      )} ${unit}`,
  }
}

/** จำนวนด่านที่ผ่านแล้วในโลกหนึ่ง */
function clearedInWorld(player: Player, worldNumber: number): number {
  const prefix = `world-${worldNumber}-`
  return player.completedStages.filter((id) => id.startsWith(prefix)).length
}

/** ถ้วยประจำโลก สร้างจากข้อมูลโลกโดยตรง จะได้ไม่ลืมโลกไหน */
function worldClear(
  worldNumber: number,
  name: string,
  emoji: string,
): Achievement {
  return countGoal({
    id: `world-${worldNumber}-clear`,
    name,
    description: `ผ่านครบทั้ง 10 ด่านของโลกที่ ${worldNumber}`,
    emoji,
    category: 'adventure',
    goal: 10,
    unit: 'ด่าน',
    valueOf: (player) => clearedInWorld(player, worldNumber),
  })
}

export const ACHIEVEMENTS: Achievement[] = [
  // ── การเรียนรู้ ──────────────────────────────────────────────
  countGoal({
    id: 'level-3',
    name: 'นักเรียนขยัน',
    description: 'ไปถึงเลเวล 3',
    emoji: '📚',
    category: 'learning',
    goal: 3,
    unit: 'เลเวล',
    valueOf: (player) => player.level,
  }),
  countGoal({
    id: 'level-5',
    name: 'ผู้กล้าแห่งตัวเลข',
    description: 'ไปถึงเลเวล 5',
    emoji: '🗡️',
    category: 'learning',
    goal: 5,
    unit: 'เลเวล',
    valueOf: (player) => player.level,
  }),
  countGoal({
    id: 'level-10',
    name: 'จอมเวทคณิตศาสตร์',
    description: 'ไปถึงเลเวล 10',
    emoji: '🧙',
    category: 'learning',
    goal: 10,
    unit: 'เลเวล',
    valueOf: (player) => player.level,
  }),
  countGoal({
    id: 'streak-5',
    name: 'ไฟกำลังลุก',
    description: 'ตอบถูกติดต่อกัน 5 ข้อ',
    emoji: '🔥',
    category: 'learning',
    goal: 5,
    unit: 'ข้อ',
    valueOf: (player) => player.bestStreak,
  }),
  countGoal({
    id: 'streak-10',
    name: 'สายฟ้าคณิตศาสตร์',
    description: 'ตอบถูกติดต่อกัน 10 ข้อ',
    emoji: '⚡',
    category: 'learning',
    goal: 10,
    unit: 'ข้อ',
    valueOf: (player) => player.bestStreak,
  }),
  countGoal({
    id: 'streak-25',
    name: 'ไม่พลาดสักข้อ',
    description: 'ตอบถูกติดต่อกัน 25 ข้อ',
    emoji: '🌠',
    category: 'learning',
    goal: 25,
    unit: 'ข้อ',
    valueOf: (player) => player.bestStreak,
  }),
  countGoal({
    id: 'questions-50',
    name: 'นักฝึกฝนตัวยง',
    description: 'ทำโจทย์ครบ 50 ข้อ',
    emoji: '📝',
    category: 'learning',
    goal: 50,
    unit: 'ข้อ',
    valueOf: (player) => player.totalQuestions,
  }),
  countGoal({
    id: 'questions-500',
    name: 'พันข้อไม่ไกลเกินฝัน',
    description: 'ทำโจทย์ครบ 500 ข้อ',
    emoji: '📗',
    category: 'learning',
    goal: 500,
    unit: 'ข้อ',
    valueOf: (player) => player.totalQuestions,
  }),
  {
    id: 'sharp-shooter',
    name: 'แม่นยำเป็นเลิศ',
    description: 'ความแม่นยำ 80% ขึ้นไป หลังทำครบ 20 ข้อ',
    emoji: '🎯',
    category: 'learning',
    isUnlocked: (player) =>
      player.totalQuestions >= 20 &&
      calculateAccuracy(player.correctAnswers, player.totalQuestions) >= 80,
    getProgressText: (player) =>
      player.totalQuestions < 20
        ? `ทำโจทย์อีก ${20 - player.totalQuestions} ข้อ`
        : `ความแม่นยำตอนนี้ ${calculateAccuracy(
            player.correctAnswers,
            player.totalQuestions,
          )}%`,
  },
  {
    id: 'all-skills-tried',
    name: 'ครบทุกทักษะ',
    description: 'ลองทำโจทย์มาแล้วครบทั้ง 9 ทักษะ',
    emoji: '🧩',
    category: 'learning',
    isUnlocked: (player) =>
      Object.values(player.statistics).every((stat) => stat.attempts > 0),
    getProgressText: (player) => {
      const tried = Object.values(player.statistics).filter(
        (stat) => stat.attempts > 0,
      ).length
      return `${tried} / ${Object.keys(player.statistics).length} ทักษะ`
    },
  },

  // ── การผจญภัย ────────────────────────────────────────────────
  countGoal({
    id: 'first-step',
    name: 'ก้าวแรกของนักผจญภัย',
    description: 'ผ่านด่านแรกได้สำเร็จ',
    emoji: '👣',
    category: 'adventure',
    goal: 1,
    unit: 'ด่าน',
    valueOf: (player) => player.completedStages.length,
  }),
  worldClear(1, 'ผู้พิชิตป่าจำนวน', '🌳'),
  worldClear(2, 'ผู้พิชิตปราสาทเศษส่วน', '🏰'),
  worldClear(3, 'ผู้พิชิตทะเลทรายทศนิยม', '🐫'),
  worldClear(4, 'ผู้พิชิตเมืองร้อยละ', '🏪'),
  worldClear(5, 'ผู้พิชิตภูเขาเรขาคณิต', '⛰️'),
  worldClear(6, 'ผู้พิชิตถ้ำมังกร', '🐉'),
  countGoal({
    id: 'all-stages',
    name: 'ครบทั้งแผนที่',
    description: 'ผ่านครบทั้ง 60 ด่านของทั้งหกโลก',
    emoji: '🗺️',
    category: 'adventure',
    goal: 60,
    unit: 'ด่าน',
    valueOf: (player) => player.completedStages.length,
  }),
  {
    id: 'boss-slayer',
    name: 'นักล่ามินิบอส',
    description: 'เอาชนะผู้พิทักษ์จำนวนได้สำเร็จ',
    emoji: '👹',
    category: 'adventure',
    isUnlocked: (player) => player.completedStages.includes('world-1-stage-10'),
    getProgressText: (player) =>
      player.completedStages.includes('world-1-stage-10')
        ? 'ชนะแล้ว'
        : 'ยังไม่ได้เอาชนะ',
  },
  countGoal({
    id: 'star-collector',
    name: 'นักสะสมดาว',
    description: 'สะสมดาวจากด่านต่าง ๆ ให้ได้ 15 ดวง',
    emoji: '⭐',
    category: 'adventure',
    goal: 15,
    unit: 'ดาว',
    valueOf: (player) => getTotalStars(player),
  }),
  countGoal({
    id: 'star-hoard',
    name: 'ท้องฟ้าเต็มดวงดาว',
    description: 'สะสมดาวจากด่านต่าง ๆ ให้ได้ 100 ดวง',
    emoji: '✨',
    category: 'adventure',
    goal: 100,
    unit: 'ดาว',
    valueOf: (player) => getTotalStars(player),
  }),
  countGoal({
    id: 'mastered-10',
    name: 'สิบด่านไร้ที่ติ',
    description: 'ทำให้ได้ 3 ดาวครบ 10 ด่าน',
    emoji: '🏆',
    category: 'adventure',
    goal: 10,
    unit: 'ด่าน',
    valueOf: (player) =>
      Object.values(player.stageProgress).filter((progress) => progress.mastered)
        .length,
  }),
  countGoal({
    id: 'story-reader',
    name: 'ผู้อ่านตำนานจนจบ',
    description: 'อ่านเนื้อเรื่องครบทุกตอนที่มีธงบันทึกไว้',
    emoji: '📜',
    category: 'adventure',
    /*
     * นับเฉพาะตอนที่ให้ธง เพราะตอนที่ไม่ให้ธงไม่มีร่องรอยว่าอ่านแล้วหรือยัง
     * ถ้านับรวมไปด้วย ถ้วยนี้จะไม่มีวันได้ ไม่ว่าเด็กจะอ่านครบแค่ไหน
     */
    goal: STORY_BEATS.filter((beat) => beat.grantsFlag).length,
    unit: 'ตอน',
    valueOf: (player) =>
      STORY_BEATS.filter(
        (beat) => beat.grantsFlag && player.storyFlags.includes(beat.grantsFlag),
      ).length,
  }),

  // ── สนามรบ ───────────────────────────────────────────────────
  countGoal({
    id: 'arena-first-run',
    name: 'ลงสนามครั้งแรก',
    description: 'เล่นสนามรบจนจบหนึ่งรอบ',
    emoji: '🛡️',
    category: 'arena',
    goal: 1,
    unit: 'รอบ',
    valueOf: (player) => recordsOf(player).survivorRuns,
  }),
  countGoal({
    id: 'arena-3min',
    name: 'ยืนหยัดสามนาที',
    description: 'รอดในสนามรบให้ได้ 180 วินาทีในรอบเดียว',
    emoji: '⏱️',
    category: 'arena',
    goal: 180,
    unit: 'วินาที',
    valueOf: (player) => recordsOf(player).survivorBestSeconds,
  }),
  countGoal({
    id: 'arena-10min',
    name: 'ผู้ไม่มีวันล้ม',
    description: 'รอดในสนามรบให้ได้ 600 วินาทีในรอบเดียว',
    emoji: '👑',
    category: 'arena',
    goal: 600,
    unit: 'วินาที',
    valueOf: (player) => recordsOf(player).survivorBestSeconds,
  }),
  countGoal({
    id: 'arena-kills-1000',
    name: 'พันตัวไม่ใช่เรื่องเล่น',
    description: 'ล้มมอนสเตอร์ในสนามรบรวม 1,000 ตัว',
    emoji: '💀',
    category: 'arena',
    goal: 1000,
    unit: 'ตัว',
    valueOf: (player) => recordsOf(player).survivorKills,
  }),
  countGoal({
    id: 'arena-boss-10',
    name: 'นักล่าบอส',
    description: 'ล้มบอสในสนามรบรวม 10 ตัว',
    emoji: '🐲',
    category: 'arena',
    goal: 10,
    unit: 'ตัว',
    valueOf: (player) => recordsOf(player).survivorBossKills,
  }),
  countGoal({
    id: 'arena-ultimate-50',
    name: 'พลังวิเศษไม่มีหมด',
    description: 'ใช้สกิลวิเศษรวม 50 ครั้ง',
    emoji: '🌀',
    category: 'arena',
    goal: 50,
    unit: 'ครั้ง',
    valueOf: (player) => recordsOf(player).survivorUltimates,
  }),
  countGoal({
    id: 'first-evolution',
    name: 'ร่างสมบูรณ์ครั้งแรก',
    description: 'ปลุกอาวุธให้เป็นร่างสมบูรณ์ได้สำเร็จ',
    emoji: '🌟',
    category: 'arena',
    goal: 1,
    unit: 'แบบ',
    valueOf: (player) => recordsOf(player).survivorEvolutions.length,
  }),
  countGoal({
    id: 'all-evolutions',
    name: 'ครบทุกร่างสมบูรณ์',
    description: 'ปลุกร่างสมบูรณ์ให้ครบทั้งสี่อาวุธ',
    emoji: '🔮',
    category: 'arena',
    goal: WEAPONS.length,
    unit: 'แบบ',
    valueOf: (player) => {
      const known = new Set<string>(WEAPONS.map((weapon) => weapon.id))
      return recordsOf(player).survivorEvolutions.filter((id) => known.has(id))
        .length
    },
  }),

  // ── บททดสอบ ─────────────────────────────────────────────────
  countGoal({
    id: 'duel-first-win',
    name: 'ชัยชนะแรกในศึกผ่าสมการ',
    description: 'ชนะศึกผ่าสมการหนึ่งครั้ง',
    emoji: '🃏',
    category: 'trial',
    goal: 1,
    unit: 'ครั้ง',
    valueOf: (player) => recordsOf(player).duelWins,
  }),
  countGoal({
    id: 'duel-win-10',
    name: 'จอมยุทธ์แห่งสมการ',
    description: 'ชนะศึกผ่าสมการรวม 10 ครั้ง',
    emoji: '♠️',
    category: 'trial',
    goal: 10,
    unit: 'ครั้ง',
    valueOf: (player) => recordsOf(player).duelWins,
  }),
  countGoal({
    id: 'duel-play-25',
    name: 'ไม่ยอมแพ้ง่าย ๆ',
    description: 'ลงศึกผ่าสมการรวม 25 ตา ไม่ว่าจะแพ้หรือชนะ',
    emoji: '🎴',
    category: 'trial',
    goal: 25,
    unit: 'ตา',
    valueOf: (player) => recordsOf(player).duelPlays,
  }),
  countGoal({
    id: 'tower-floor-10',
    name: 'ผู้ปีนหอคอย',
    description: 'ขึ้นหอคอยไม่รู้จบให้ถึงชั้น 10',
    emoji: '🗼',
    category: 'trial',
    goal: 10,
    unit: 'ชั้น',
    valueOf: (player) => recordsOf(player).towerBestFloor,
  }),
  countGoal({
    id: 'tower-floor-25',
    name: 'ยอดหอคอยอยู่แค่เอื้อม',
    description: 'ขึ้นหอคอยไม่รู้จบให้ถึงชั้น 25',
    emoji: '🌌',
    category: 'trial',
    goal: 25,
    unit: 'ชั้น',
    valueOf: (player) => recordsOf(player).towerBestFloor,
  }),

  // ── ของสะสม ─────────────────────────────────────────────────
  countGoal({
    id: 'coin-300',
    name: 'นักสะสมเหรียญ',
    description: 'มีเหรียญสะสม 300 เหรียญ',
    emoji: '💰',
    category: 'collection',
    goal: 300,
    unit: 'เหรียญ',
    valueOf: (player) => player.coins,
  }),
  countGoal({
    id: 'coin-5000',
    name: 'เศรษฐีแห่งอาณาจักร',
    description: 'มีเหรียญสะสม 5,000 เหรียญในคราวเดียว',
    emoji: '👛',
    category: 'collection',
    goal: 5000,
    unit: 'เหรียญ',
    valueOf: (player) => player.coins,
  }),
  {
    id: 'first-max-star',
    name: 'ช่างตีเหล็กมือฉมัง',
    description: `ตีบวกของสวมใส่ชิ้นใดชิ้นหนึ่งจนครบ ${MAX_STARS} ดาว`,
    emoji: '🔨',
    category: 'collection',
    isUnlocked: (player) =>
      Object.values(player.upgrades ?? {}).some((stars) => stars >= MAX_STARS),
    getProgressText: (player) => {
      const best = Math.max(0, ...Object.values(player.upgrades ?? {}))
      return `ชิ้นที่ดีที่สุดตอนนี้ ${Math.min(best, MAX_STARS)} / ${MAX_STARS} ดาว`
    },
  },
  countGoal({
    id: 'avatar-collector',
    name: 'ทีมนักผจญภัย',
    description: 'ปลดล็อกตัวละครให้ได้ 3 ตัว',
    emoji: '🧑‍🤝‍🧑',
    category: 'collection',
    goal: 3,
    unit: 'ตัว',
    valueOf: (player) => (player.ownedAvatars ?? []).length,
  }),
  countGoal({
    id: 'avatar-all',
    name: 'ครบทุกตัวละคร',
    description: 'ปลดล็อกตัวละครครบทุกตัว',
    emoji: '🎭',
    category: 'collection',
    goal: AVATARS.length,
    unit: 'ตัว',
    valueOf: (player) => (player.ownedAvatars ?? []).length,
  }),
  countGoal({
    id: 'perk-10',
    name: 'พลังติดตัว',
    description: 'ซื้อพลังถาวรรวมกัน 10 ชั้น',
    emoji: '🧬',
    category: 'collection',
    goal: 10,
    unit: 'ชั้น',
    valueOf: (player) =>
      PERKS.reduce(
        (sum, perk) =>
          sum + Math.min(perk.maxLevel, Math.max(0, player.perks?.[perk.id] ?? 0)),
        0,
      ),
  }),
  {
    id: 'perk-phoenix',
    name: 'ขนนกฟีนิกซ์',
    description: 'ปลดล็อกพลังถาวรที่ให้ลุกขึ้นสู้ได้อีกครั้ง',
    emoji: '🪶',
    category: 'collection',
    isUnlocked: (player) => (player.perks?.phoenix ?? 0) >= 1,
    getProgressText: (player) =>
      (player.perks?.phoenix ?? 0) >= 1 ? 'ปลดล็อกแล้ว' : 'ยังไม่ได้ซื้อ',
  },
]
