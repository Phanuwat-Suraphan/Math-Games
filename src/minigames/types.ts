/**
 * โมเดลของมินิเกมที่ไม่ใช่การเลือกตอบ
 *
 * ทำไมต้องมี: ถ้าทั้งเกมมีแต่ปุ่มสี่ตัวเลือก เด็กจะเดาได้ 25% ทุกข้อ
 * และที่สำคัญกว่านั้นคือมันน่าเบื่อ เพราะร่างกายทำท่าเดิมตลอดคือแตะปุ่ม
 * การจับคู่ โยงเส้น ลากวาง และรับของที่ตกลงมา
 * บังคับให้เด็กใช้มือกับสายตาต่างกันไป จึงรู้สึกเป็นคนละเกม
 *
 * ทุกอย่างในไฟล์นี้เป็นข้อมูลล้วน ไม่มีการอ้างถึง React หรือ DOM
 * ตรรกะจึงทดสอบได้โดยไม่ต้องเปิดเบราว์เซอร์
 */

import type { Grade } from '../questionEngine/types'
import type { SkillId } from '../types/stats'

export type MinigameKind =
  | 'matching'
  | 'connect'
  | 'dragdrop'
  | 'catch'
  | 'path'

/** ข้อมูลที่ทุกมินิเกมมีเหมือนกัน */
export interface MinigameBase {
  id: string
  kind: MinigameKind
  grade: Grade
  skill: SkillId
  /** ชื่อที่เด็กเห็น */
  title: string
  /** คำสั่งว่าต้องทำอะไร เขียนเป็นภาษาที่เด็ก ป.4 อ่านเข้าใจ */
  instruction: string
  /** เรื่องราวสั้น ๆ ที่ทำให้การเล่นมีเหตุผล ไม่ใช่แค่แบบฝึกหัด */
  story: string
  successText: string
}

/** ไพ่หนึ่งใบในเกมจับคู่ */
export interface MatchCard {
  id: string
  /** ไพ่สองใบที่ pairId ตรงกันคือคู่กัน */
  pairId: string
  text: string
  /** ฝั่งซ้ายคือโจทย์ ฝั่งขวาคือคำตอบ ใช้กันไม่ให้จับคู่โจทย์กับโจทย์ */
  side: 'prompt' | 'answer'
}

export interface MatchingGame extends MinigameBase {
  kind: 'matching'
  cards: MatchCard[]
  pairCount: number
}

/** ปลายเส้นหนึ่งจุดในเกมโยงเส้น */
export interface ConnectNode {
  id: string
  text: string
}

export interface ConnectGame extends MinigameBase {
  kind: 'connect'
  left: ConnectNode[]
  right: ConnectNode[]
  /** id ฝั่งซ้าย → id ฝั่งขวาที่ถูกต้อง */
  solution: Record<string, string>
}

/** ช่องว่างที่ต้องลากตัวเลขมาวาง */
export interface DropSlot {
  id: string
  correctTileId: string
}

/** ตัวเลขที่ลากได้ */
export interface DragTile {
  id: string
  text: string
}

export interface DragDropGame extends MinigameBase {
  kind: 'dragdrop'
  /**
   * ข้อความสมการที่มีช่องว่าง
   * ใช้ {slotId} เป็นตำแหน่งช่อง เช่น "{a} + {b} = 12"
   */
  template: string
  slots: DropSlot[]
  tiles: DragTile[]
}

/**
 * ช่องหนึ่งช่องบนกระดานเส้นทางลับ
 *
 * ทำไมเก็บ row กับ col ไว้ในตัวช่องด้วย ทั้งที่เรียงเป็นตารางอยู่แล้ว
 *
 * เพราะกฎการเดินคือ "ลงแถวถัดไป และเลื่อนซ้ายขวาได้ไม่เกินหนึ่งช่อง"
 * ซึ่งเป็นกฎที่ตัวตัดสินถูกผิดต้องตรวจเอง ไม่ใช่หน้าจอตรวจ
 * ถ้าไม่เก็บไว้ ตัวตัดสินจะต้องคำนวณตำแหน่งจากลำดับในอาเรย์
 * ซึ่งจะพังทันทีที่วันหนึ่งมีคนเรียงอาเรย์ใหม่โดยไม่รู้ว่ามีคนพึ่งลำดับอยู่
 */
export interface PathCell {
  id: string
  value: number
  row: number
  col: number
}

/**
 * เส้นทางลับ — เดินจากบนลงล่างโดยที่ตัวเลขต้องเพิ่มขึ้นทีละเท่ากันเสมอ
 *
 * ทำไมถึงเพิ่มเกมแบบนี้เข้ามา
 *
 * มินิเกมสี่แบบเดิมคือ จับคู่ โยงเส้น ลากวาง และรับของ
 * ทั้งสี่แบบเป็นการ "ตัดสินใจทีละครั้งที่ไม่เกี่ยวกับครั้งก่อน"
 * ตอบผิดข้อหนึ่งไม่ได้ทำให้ข้อถัดไปยากขึ้น
 *
 * เกมนี้ต่างออกไป เพราะทุกก้าวขึ้นกับก้าวก่อนหน้า
 * เด็กต้องคิดล่วงหน้าว่าเดินทางนี้แล้วจะไปต่อได้ไหม
 * ซึ่งเป็นการนับเพิ่มทีละเท่ากัน (สูตรคูณและลำดับ) ที่ใช้จริงในหัว
 * ไม่ใช่การจำว่าเจ็ดคูณแปดเท่ากับเท่าไร
 */
export interface PathGame extends MinigameBase {
  kind: 'path'
  /** ก้าวต่อไปต้องมากกว่าช่องที่ยืนอยู่เท่าไร */
  step: number
  rows: number
  cols: number
  cells: PathCell[]
  /** ช่องเริ่มต้น บอกเด็กไว้เลย ไม่ให้ต้องเดาว่าเริ่มตรงไหน */
  startCellId: string
  /** ลำดับ id ของช่องบนเส้นทางที่ถูกต้อง เรียงจากแถวบนลงล่าง */
  solution: string[]
  /** เหยียบผิดได้กี่ครั้งก่อนแพ้ */
  allowedMistakes: number
}

/** ของหนึ่งชิ้นที่ตกลงมา */
export interface FallingItem {
  id: string
  text: string
  value: number
  correct: boolean
  /** ตำแหน่งแนวนอนตอนเริ่มตก 0 = ซ้ายสุด 1 = ขวาสุด */
  lane: number
  /** วินาทีนับจากเริ่มด่านที่ของชิ้นนี้เริ่มตก */
  dropAt: number
  /** วินาทีที่ใช้ตกจากบนถึงล่าง ยิ่งน้อยยิ่งเร็ว */
  fallSeconds: number
}

export interface CatchGame extends MinigameBase {
  kind: 'catch'
  /** กฎว่าอะไรคือของที่ต้องรับ เช่น "รับเฉพาะจำนวนที่หารด้วย 3 ลงตัว" */
  rule: string
  items: FallingItem[]
  /** ต้องรับของถูกกี่ชิ้นจึงผ่าน */
  targetCatches: number
  /** พลาดรับของผิดได้กี่ครั้ง */
  allowedMistakes: number
}

export type Minigame =
  | MatchingGame
  | ConnectGame
  | DragDropGame
  | CatchGame
  | PathGame

/** ผลของการเล่นหนึ่งรอบ ใช้ต่อเข้ากับระบบรางวัลเดิม */
export interface MinigameResult {
  kind: MinigameKind
  /** จำนวนครั้งที่ตอบถูก ใช้เป็นจำนวน "ข้อ" ที่ส่งเข้าสถิติทักษะ */
  correct: number
  /** จำนวนครั้งที่ตอบผิด */
  wrong: number
  cleared: boolean
  secondsUsed: number
}
