/**
 * ตรรกะของเนื้อเรื่อง
 *
 * ฟังก์ชันบริสุทธิ์ทั้งหมด ไม่แตะหน้าจอและไม่แตะที่เก็บข้อมูลเอง
 *
 * หน้าที่หลักคือตอบสามคำถาม
 * 1. ตอนนี้ควรเล่าตอนไหน
 * 2. NPC คนนี้ควรพูดอะไรตามสิ่งที่เด็กทำมาแล้ว
 * 3. เด็กอ่านเรื่องไปถึงไหนแล้ว
 */

import { NPC_LINES, STORY_BEATS, STORY_CHAPTERS } from '../data/story'
import type { NpcLine, StoryBeat, StoryChapter, StoryMoment } from '../types/story'
import type { Player } from '../types/player'

/** ธงที่ผู้เล่นมีอยู่ อ่านแบบปลอดภัยเผื่อข้อมูลเก่ายังไม่มีสนามนี้ */
export function flagsOf(player: Player): string[] {
  return player.storyFlags ?? []
}

export function hasFlag(player: Player, flag: string): boolean {
  return flagsOf(player).includes(flag)
}

/**
 * เพิ่มธงเข้าไปโดยไม่ซ้ำ
 * ถ้ามีอยู่แล้วจะคืนผู้เล่นคนเดิม เพื่อไม่ให้ React เรนเดอร์ใหม่โดยไม่จำเป็น
 */
export function grantFlag(player: Player, flag: string): Player {
  if (!flag || hasFlag(player, flag)) return player
  return {
    ...player,
    storyFlags: [...flagsOf(player), flag],
    updatedAt: new Date().toISOString(),
  }
}

/** ตอนที่ผูกกับด่านหนึ่งในช่วงเวลาหนึ่ง */
export function beatFor(stageId: string, moment: StoryMoment): StoryBeat | undefined {
  return STORY_BEATS.find((beat) => beat.stageId === stageId && beat.moment === moment)
}

/**
 * ตอนที่ควรเล่าตอนนี้ คืน undefined ถ้าเคยอ่านแล้ว
 *
 * ใช้ธงเป็นตัวจำว่าอ่านแล้วหรือยัง ไม่ได้เก็บรายการตอนที่อ่านแยกต่างหาก
 * เพราะธงเป็นสิ่งที่ตอนนั้นให้อยู่แล้ว การเก็บสองที่จะทำให้ไม่ตรงกันได้
 *
 * ตอนที่ไม่ให้ธงจะถูกเล่าทุกครั้งที่ผ่านด่านนั้น ซึ่งตั้งใจให้เป็นแบบนั้น
 * เพราะมันเป็นตอนเสริมที่อ่านซ้ำได้ ไม่ใช่หมุดหมายของเรื่อง
 */
export function pendingBeat(
  player: Player,
  stageId: string,
  moment: StoryMoment,
): StoryBeat | undefined {
  const beat = beatFor(stageId, moment)
  if (!beat) return undefined
  if (beat.grantsFlag && hasFlag(player, beat.grantsFlag)) return undefined
  return beat
}

/**
 * ประโยคที่ NPC คนนี้ควรพูดตอนนี้
 *
 * ไล่ตามลำดับในข้อมูล ตัวแรกที่ผ่านเงื่อนไขคือคำตอบ
 * จึงต้องเรียงประโยคที่เงื่อนไขเยอะไว้ก่อนเสมอ
 * ไม่งั้นประโยคเริ่มต้นที่ไม่มีเงื่อนไขจะชนะทุกครั้ง
 */
export function lineFor(player: Player, npcId: string): string | undefined {
  const flags = flagsOf(player)

  const match = NPC_LINES.find((line: NpcLine) => {
    if (line.npcId !== npcId) return false
    if (line.requiresFlags?.some((flag) => !flags.includes(flag))) return false
    if (line.hiddenByFlags?.some((flag) => flags.includes(flag))) return false
    return true
  })

  return match?.text
}

/** ตอนที่เด็กอ่านไปแล้ว ใช้แสดงในสมุดบันทึก */
export function unlockedBeats(player: Player): StoryBeat[] {
  return STORY_BEATS.filter(
    (beat) => beat.grantsFlag && hasFlag(player, beat.grantsFlag),
  )
}

/** ความคืบหน้าของเรื่องเป็นร้อยละ นับเฉพาะตอนที่เป็นหมุดหมาย */
export function storyPercent(player: Player): number {
  const total = STORY_BEATS.filter((beat) => beat.grantsFlag).length
  if (total === 0) return 0
  return Math.round((unlockedBeats(player).length / total) * 100)
}

/** บทของการผจญภัยพร้อมสถานะว่าอ่านไปกี่ตอนแล้ว */
export interface ChapterProgress {
  chapter: StoryChapter
  beats: StoryBeat[]
  readCount: number
  totalCount: number
}

export function chapterProgress(player: Player): ChapterProgress[] {
  const read = new Set(unlockedBeats(player).map((beat) => beat.id))

  return STORY_CHAPTERS.map((chapter) => {
    const beats = chapter.beatIds
      .map((id) => STORY_BEATS.find((beat) => beat.id === id))
      .filter((beat): beat is StoryBeat => Boolean(beat))

    const milestones = beats.filter((beat) => beat.grantsFlag)

    return {
      chapter,
      beats,
      readCount: milestones.filter((beat) => read.has(beat.id)).length,
      totalCount: milestones.length,
    }
  })
}
